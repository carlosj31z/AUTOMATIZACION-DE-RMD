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

// ---- por código: forzar la carga aunque ya esté la misma versión ----
const forz = Object.fromEntries(C.planificar(autorizados, previos, rutas, null, true).map((p) => [p.rmd.codigo, p]));
ok('forzar, ya cargado: se vuelve a subir a su carpeta', J(forz['2202600005'].subir) === J(['2.- PLANTA 2/SOLIDOS/YA/ACONDICIONADO']), J(forz['2202600005'].subir));
ok('forzar, ya cargado: el PDF que estaba pasa a OBSOLETO', J(forz['2202600005'].reemplazar) === J(['2.- PLANTA 2/SOLIDOS/YA/ACONDICIONADO/2202600005-ACO-3-YA.pdf']) && forz['2202600005'].nota === '', J(forz['2202600005']));
ok('forzar, no cargado: igual que siempre', J(forz['2202609999'].subir) === J(v6.subir) && J(forz['2202609999'].aObsoleto) === J(v6.aObsoleto) && forz['2202609999'].reemplazar.length === 0);
ok('forzar, producto nuevo: sigue para ubicar a mano', forz['2202600001'].carpetas.length === 0 && forz['2202600001'].subir.length === 0);
ok('sin forzar no reemplaza', plan['2202600005'].reemplazar.length === 0);
ok('códigos pegados de Excel, con comas y repetidos', J(C.codigosDe('2202609999\r\n2202600005, 2202609999;  x 12\t2202600001')) === J(['2202609999', '2202600005', '2202600001']));

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

// ---- v1.154.0: buscador atrasado, carpeta leída en el momento ----
{
  const c15 = '2.- PLANTA 2/SEMISOLIDOS/NISTAZINC NF UNG/ENV/TUBO 15g';
  const r7 = { codigo: '2202608853', version: '7', material: '5000002669', etapa: 'ENVASE', descripcion: 'NISTAZINC NF UNG TUB 15g', agrupador: '013944', planta: 'PLANTA LIMA' };
  const prev = [{ ...r7, codigo: '2202607744', version: '6' }, { ...r7, codigo: '2202505263', version: '5' }];
  // así respondía el buscador a la hora de la captura: la v7 ya subida y la v6 todavía en su carpeta (el paso a OBSOLETO sin indexar)
  const atrasado = [`${c15}/2202608853-ENV-7-NISTAZINC_NF_UNG_TUB_15g.pdf`, `${c15}/2202607744-ENV-6-_NISTAZINC_NF_UNG_TUB_15g.pdf`, `${c15}/OBSOLETO/2202505263-ENV-5-_NISTAZINC_NF_UNG_TUB_15g.pdf`];
  const antes = C.planificar([r7], prev, atrasado, P2)[0];
  ok('buscador atrasado: sin leer la carpeta pedía pasar la v6 a OBSOLETO (el error de la captura)', antes.aObsoleto.length === 1, J(antes.aObsoleto));
  const hoy = { [c15]: [`${c15}/2202608853-ENV-7-NISTAZINC_NF_UNG_TUB_15g.pdf`, `${c15}/OBSOLETO/2202607744-ENV-6-_NISTAZINC_NF_UNG_TUB_15g.pdf`, `${c15}/OBSOLETO/2202505263-ENV-5-_NISTAZINC_NF_UNG_TUB_15g.pdf`] };
  const real = C.combinar(atrasado, hoy);
  const desp = C.planificar([r7], prev, real, P2)[0];
  ok('carpeta leída: ya cargado, nada que hacer', desp.subir.length === 0 && desp.aObsoleto.length === 0 && /Ya está/.test(desp.nota), J(desp));
  ok('combinar: las rutas de carpetas no leídas se quedan', C.combinar(['2.- PLANTA 2/X/1-FAB-1-a.pdf', ...atrasado], hoy).includes('2.- PLANTA 2/X/1-FAB-1-a.pdf'));
  ok('combinar: carpeta que ya no existe (null) descarta lo del buscador', C.combinar(atrasado, { [c15]: null }).length === 0);
  ok('carpetasDe: sin OBSOLETO y sin repetir', J(C.carpetasDe(atrasado)) === J([c15]));

  // SAP repite el código entre etapas: 2202401995 es Envase y Acondicionado de NISTAZINC NF UNG TUB 30g
  const e30 = '2.- PLANTA 2/SEMISOLIDOS/NISTAZINC NF UNG/ENV/TUBO 30g', a30 = '2.- PLANTA 2/SEMISOLIDOS/NISTAZINC NF UNG/ACO/TUBO 30g';
  const r8 = { codigo: '2202608854', version: '8', material: '5000002670', etapa: 'ENVASE', descripcion: 'NISTAZINC NF UNG TUB 30g', agrupador: '013944', planta: 'PLANTA LIMA' };
  const p8 = C.planificar([r8], [{ ...r8, codigo: '2202401995', version: '3' }, { ...r8, codigo: '2202607763', version: '7' }],
    [`${e30}/2202608854-ENV-8-NISTAZINC_NF_UNG_TUB_30g.pdf`, `${e30}/OBSOLETO/2202607763-ENV-7-_NISTAZINC_NF_UNG_TUB_30g.pdf`, `${a30}/OBSOLETO/2202401995-ACO-3-_NISTAZINC_NF_UNG_TUB_30g_CJA_x_1.pdf`], P2)[0];
  ok('código repetido entre etapas: el PDF «-ACO-» no lleva al Envase a la carpeta de Acondicionado', p8.subir.length === 0 && J(p8.carpetas) === J([e30]), J(p8.carpetas));

  // reacondicionado con el mismo material que el producto: no es la misma familia
  const lit = '2.- PLANTA 2/ACONDICIONADO/ACONDICIONADO/LITIASIN K 1080 mg TAB', reac = '2.- PLANTA 2/REACONDICIONADO/REACONDICIONADO GENERICO - FARMA AACO06 AACO04 ACO03';
  const rl = { codigo: '2202609446', version: '4', material: '6000001747', etapa: 'ACONDICIONADO', descripcion: 'LITIASIN K 1080 mg TAB B10 CJA x 20', agrupador: '014041', planta: 'PLANTA LIMA' };
  const pl = C.planificar([rl], [{ ...rl, codigo: '2202504444', version: '3' }, { ...rl, codigo: '2202505646', version: '1', descripcion: 'REACONDICIONADO GENERICO - FARMA AACO06 AACO04 ACO03', agrupador: '000000' }],
    [`${lit}/2202504444-ACO-3-_LITIASIN_K_1080_mg_TAB_B10_CJA_x_20.pdf`, `${reac}/2202505646-ACO-1-_LITIASIN_K_1080_mg_TAB_B10_CJA_x_20.pdf`], P2)[0];
  ok('reacondicionado del mismo material: no se sube ahí ni se archiva su PDF', J(pl.subir) === J([lit]) && pl.aObsoleto.length === 1 && pl.aObsoleto[0].startsWith(lit), J(pl));

  // producto nuevo: carpetas parecidas con la etapa del RMD
  const nuevo = { codigo: '2202609520', version: '1', etapa: 'ACONDICIONADO', descripcion: 'REACONDICIONADO SEM ARGENTAMICINA', recetas: ['ARGENTAMICINA CRM POT400g POT x1 SIE26ESS'] };
  ok('palabra clave: la primera que distingue al producto', C.palabraClave(nuevo.descripcion) === 'ARGENTAMICINA' && C.palabraClave('NISTAZINC NF UNG TUB 15g') === 'NISTAZINC');
  const sg = C.sugerirCarpetas(nuevo, ['2.- PLANTA 2/SEMISOLIDOS/ARGENTAMICINA CRM/ACO/2202506891-5-ARGENTAMICINA_CRM_POT400_g_x1.pdf', '2.- PLANTA 2/SEMISOLIDOS/ARGENTAMICINA CRM/ENV/POTx400g/2202506564-3-ARGENTAMICINA_CRM_POT400_g.pdf',
    '2.- PLANTA 2/ACONDICIONADO/ENVASADO/FUROXONA 100mg TAB/2202506015-ENV-2-_FUROXONA_100mg_TAB_B10 (Argentamicina).pdf', '1.- PLANTA 1/SEMISOLIDOS/ARGENTAMICINA CRM/ACO/1-ACO-1-x.pdf'], P2);
  ok('sugerencia: primero la carpeta de su etapa que ya existe', sg[0] && sg[0].carpeta === '2.- PLANTA 2/SEMISOLIDOS/ARGENTAMICINA CRM/ACO' && sg[0].existe, J(sg));
  ok('sugerencia: la de otra etapa cambia ENV por ACO; nunca de otra planta ni por un PDF suelto', sg.some((x) => x.carpeta === '2.- PLANTA 2/SEMISOLIDOS/ARGENTAMICINA CRM/ACO/POTx400g' && !x.existe)
    && !sg.some((x) => /FUROXONA|PLANTA 1/.test(x.carpeta)), J(sg));
  ok('sugerencia: reacondicionado ofrece también la carpeta REACONDICIONADO', sg.some((x) => x.carpeta === '2.- PLANTA 2/REACONDICIONADO'));
  const sl = C.sugerirCarpetas({ codigo: '1', etapa: 'ENVASE', descripcion: 'LITIASIN K 1080 mg TAB B5' }, [`${lit}/2202504444-ACO-3-_LITIASIN_K_1080_mg_TAB_B10_CJA_x_20.pdf`], P2);
  ok('sugerencia: carpeta «ACONDICIONADO/ACONDICIONADO» → «ACONDICIONADO/ENVASADO» para Envase', sl[0] && sl[0].carpeta === '2.- PLANTA 2/ACONDICIONADO/ENVASADO/LITIASIN K 1080 mg TAB', J(sl));
  ok('carpeta escrita a mano: dentro de la planta, sin «..»', C.carpetaValida(' 2.- PLANTA 2 / SEMISOLIDOS/X /ACO/', P2) === '2.- PLANTA 2/SEMISOLIDOS/X/ACO' && C.carpetaValida('2.- PLANTA 2/../x', P2) === null && C.carpetaValida('1.- PLANTA 1/x', P2) === null && C.carpetaValida('2.- PLANTA 2', P2) === null);
}

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa.');
process.exit(fallas ? 1 : 0);
