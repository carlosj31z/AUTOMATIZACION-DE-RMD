// Pruebas del plan de «Contingencia a SharePoint» (bloque ==CONTINGENCIA== del userscript), sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_contingencia.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const C = new Function(bloque('// ==CONTINGENCIA-INICIO==', '// ==CONTINGENCIA-FIN==') + '\nreturn Contingencia;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

// ---- nombres de archivo de la carpeta ----
const n = (r) => { const p = C.interpretar(r); return p && [p.codigo, p.version, p.obsoleto, p.carpeta]; };
ok('código-ETAPA-versión', J(n('L/P/FABRICACION/2202403301-FAB-5-_GASEOVET 1000 L.pdf')) === J(['2202403301', '5', false, 'L/P/FABRICACION']));
ok('código-versión en OBSOLETO', J(n('L/P/ACO/OBSOLETO/2202607732-5-GASEOVET (2).pdf')) === J(['2202607732', '5', true, 'L/P/ACO']));
ok('código-ETAPAversión y «OSOLETO»', J(n('L/P/ENVASE/OSOLETO/2202506416-ENV3-ELECTROLIGHT.pdf')) === J(['2202506416', '3', true, 'L/P/ENVASE']));
ok('espacios junto a los guiones', J(n('X/2202607906- INS -1-IOPAMED.pdf')) === J(['2202607906', '1', false, 'X']));
ok('código antiguo «AACO1-2»', n('X/15443-AACO1-2-LINCOMICINA.pdf')[1] === '2');
ok('sin código o no PDF', C.interpretar('X/instructivo.pdf') === null && C.interpretar('X/2202607906-1-a.docx') === null);

// ---- plan ----
const rmd = (codigo, version, material, etapa, descripcion = 'GASEOVET 80mg/mL SUS 1000 L') => ({ codigo, version, material, etapa, descripcion, agrupador: 'A' });
const autorizados = [rmd('2202609999', '6', 'M1', 'FABRICACION'), rmd('2202600001', '1', 'M3', 'FABRICACION', 'NUEVO'), rmd('2202600005', '3', 'M5', 'ACONDICIONADO', 'YA')];
const previos = [rmd('2202403301', '5', 'M1', 'FABRICACION'), rmd('2202400001', '4', 'M1', 'FABRICACIÓN'), rmd('2202400002', '1', 'M1', 'ENVASE'), rmd('2202500005', '2', 'M5', 'ACONDICIONADO')];
const rutas = [
  '1.- PLANTA 1/LIQUIDOS/GASEOVET/FABRICACION/2202403301-FAB-5-_GASEOVET.pdf',
  '1.- PLANTA 1/LIQUIDOS/GASEOVET/FABRICACION/OBSOLETO/2202400001-4-GASEOVET.pdf',
  '1.- PLANTA 1/LIQUIDOS/GASEOVET/ENVASE/2202400002-1-GASEOVET.pdf',
  '2.- PLANTA 2/SOLIDOS/YA/ACONDICIONADO/2202600005-ACO-3-YA.pdf',
  '2.- PLANTA 2/SOLIDOS/YA/ACONDICIONADO/OBSOLETO/2202500005-2-YA.pdf',
];
const plan = Object.fromEntries(C.planificar(autorizados, previos, rutas).map((p) => [p.rmd.codigo, p]));
const v6 = plan['2202609999'];
ok('destino: la carpeta de la versión anterior (misma etapa, aunque lleve tilde)', J(v6.subir) === J(['1.- PLANTA 1/LIQUIDOS/GASEOVET/FABRICACION']), J(v6.subir));
ok('a OBSOLETO: solo la versión anterior que no está archivada', J(v6.aObsoleto) === J(['1.- PLANTA 1/LIQUIDOS/GASEOVET/FABRICACION/2202403301-FAB-5-_GASEOVET.pdf']), J(v6.aObsoleto));
ok('versión anterior: la más alta con PDF en la carpeta', v6.anterior && v6.anterior.codigo === '2202403301', J(v6.anterior));
ok('producto nuevo: sin versión anterior', plan['2202600001'].anterior === null);
ok('producto nuevo: sin carpeta y con nota', plan['2202600001'].carpetas.length === 0 && /a mano/.test(plan['2202600001'].nota));
ok('ya cargado: nada que hacer', plan['2202600005'].subir.length === 0 && plan['2202600005'].aObsoleto.length === 0 && /Ya está/.test(plan['2202600005'].nota));

// ---- por planta: solo sus RMD y solo sus carpetas ----
const P1 = C.PLANTAS[0], P2 = C.PLANTAS[1];
ok('carpeta de planta: «1.- PLANTA 1» y «2.- PLANTA 2»', C.plantaDeCarpeta('1.- PLANTA 1/X/a.pdf') === P1 && C.plantaDeCarpeta('2.- PLANTA 2/X') === P2 && C.plantaDeCarpeta('GASEOVET/a.pdf') === null);
const conPlanta = autorizados.map((r, i) => ({ ...r, planta: i === 2 ? 'PLANTA LIMA' : 'PLANTA ATE' }));
const plan1 = C.planificar(conPlanta, previos, rutas, P1), plan2 = C.planificar(conPlanta, previos, rutas, P2);
ok('Planta 1 (Ate): solo sus RMD', J(plan1.map((p) => p.rmd.codigo)) === J(['2202609999', '2202600001']), J(plan1.map((p) => p.rmd.codigo)));
ok('Planta 2 (Lima): no ve carpetas de Planta 1', plan2.length === 1 && plan2[0].carpetas.every((c) => c.startsWith('2.- PLANTA 2')));
const cruzado = C.planificar([{ ...autorizados[0], planta: 'PLANTA LIMA' }], previos, rutas, P2)[0];
ok('Planta 2 no sube ni archiva en carpetas de Planta 1', cruzado.subir.length === 0 && cruzado.aObsoleto.length === 0 && cruzado.carpetas.length === 0, J(cruzado));

// ---- nombre del PDF y fechas ----
ok('nombre con la descripción de la receta', C.nombreArchivo(rmd('2202609999', '6', 'M1', 'FABRICACION'), 'GASEOVET 80mg/mL SUS') === '2202609999-FAB-6-GASEOVET_80mg_mL_SUS.pdf');
ok('nombre con la del RMD si no hay receta; INSPECCIÓN → INS', C.nombreArchivo(rmd('1', '2', 'M', 'INSPECCIÓN', 'IOPAMED 300'), '') === '1-INS-2-IOPAMED_300.pdf');
ok('fecha sin hora (medianoche UTC) se toma tal cual', C.diaDe(new Date('2026-10-22T00:00:00Z')) === '2026-10-22');
ok('fecha con hora: el día local', C.diaDe(new Date(2026, 9, 22, 23, 30)) === '2026-10-22');

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa.');
process.exit(fallas ? 1 : 0);
