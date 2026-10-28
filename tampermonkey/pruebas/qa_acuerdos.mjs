// Pruebas del motor de Acuerdos (bloque ==ACUERDOS== del userscript): qué acuerdos de status-rmd aplican a un RMD y si los cumple,
// y lectura del Excel de «Exportar» de la pestaña Acuerdos. Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_acuerdos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const { AcuerdosRmd: A } = new Function(bloque('// ==ACUERDOS-INICIO==', '// ==ACUERDOS-FIN==') + '\nreturn { AcuerdosRmd };')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

// ---- contexto del RMD ----
ok('fase: F2 → 2, F2R y F2-R → 2, sin nomenclatura → 0', A.faseDe('20260918CJ-1-C2-FI1.0-FA1.0-F2\nCC-123') === 2 && A.faseDe('x-F2R') === 2 && A.faseDe('x-F2-R') === 2 && A.faseDe('PENDIENTE CC') === 0);
ok('planta: «PLANTA ATE» → planta1, «PLANTA LIMA» → planta2', A.plantaDe('PLANTA ATE') === 'planta1' && A.plantaDe('Planta Lima') === 'planta2' && A.plantaDe('') === '');
ok('etapa: con tildes y minúsculas', A.etapaDe('Fabricación') === 'FABRICACION' && A.etapaDe('ACONDICIONADO') === 'ACONDICIONADO' && A.etapaDe('INSPECCION') === '');

// ---- acuerdos de ejemplo (los de los Word) ----
const acuerdos = [
  { id: 'prec', titulo: 'Precauciones', planta: 'ambas', etapas: [], seccion: 'PRECAUCIONES', tipo: 'agregar', pasos: [{ codigo: '180998', descripcion: 'CONTROLAR…' }] },
  { id: 'desp', titulo: 'Despejes sin V°B°', planta: 'ambas', etapas: [], seccion: 'PROCEDIMIENTO', tipo: 'reemplazar', faseDesde: 2,
    pasos: [{ codigo: '184004', etapa: 'FABRICACION' }, { codigo: '184008', etapa: 'ENVASE' }, { codigo: '184495', etapa: 'ACONDICIONADO' }, { codigo: '184497', etapa: 'ACONDICIONADO' }] },
  { id: 'co-acond', titulo: 'CO acondicionado', planta: 'ambas', etapas: ['ACONDICIONADO'], tipo: 'agregar', pasos: [{ codigo: '180934', rPor: true, estadoCC: true }] },
  { id: 'solo-lima', titulo: 'Solo LIMA', planta: 'planta2', etapas: [], tipo: 'agregar', pasos: [{ codigo: '999001' }] },
  { id: 'anulado', titulo: 'Anulado', estado: 'anulado', planta: 'ambas', tipo: 'agregar', pasos: [{ codigo: '999002' }] },
  { id: 'quitar', titulo: 'Quitar viejo', planta: 'ambas', tipo: 'quitar', pasos: [{ codigo: '170000' }] },
  { id: 'nota', titulo: 'Indicación', planta: 'ambas', tipo: 'nota', detalle: 'Revisar a ojo' },
].map(A.normalizar);

const paso = (codigo, lista, o = {}) => ({ codigo, lista, rpor: false, vb: false, estadoCC: false, ...o });
const rmdAcond = [paso('180998', 'PRECAUCIONES'), paso('184495', 'PROCEDIMIENTO › ACONDICIONADO'), paso('184497', 'ENTREGA'), paso('180934', 'PROCEDIMIENTO › ACONDICIONADO', { rpor: true }), paso('170000', 'PROCEDIMIENTO')];
const r = A.evaluar(acuerdos, rmdAcond, { planta: 'planta1', etapa: 'ACONDICIONADO', fase: 2 });
const it = (id) => r.items.find((x) => x.acuerdo.id === id);
ok('aplican: sin el de LIMA (RMD de ATE) ni el anulado', J(r.items.map((x) => x.acuerdo.id).sort()) === J(['co-acond', 'desp', 'nota', 'prec', 'quitar']), J(r.items.map((x) => x.acuerdo.id)));
ok('precauciones: el paso está en su sección → se cumple', it('prec').estado === 'ok');
ok('despejes: solo se exigen los pasos de la etapa del RMD', J(it('desp').pasos.map((p) => p.codigo)) === J(['184495', '184497']));
ok('despejes: 184497 está en otra sección → no se cumple', it('desp').estado === 'falla' && it('desp').pasos[1].estado === 'falla' && /no en PROCEDIMIENTO/.test(it('desp').pasos[1].texto), it('desp').pasos[1].texto);
ok('casillas: 180934 sin Estado CC → no se cumple y lo dice', it('co-acond').estado === 'falla' && /Estado CC/.test(it('co-acond').pasos[0].texto) && !/R\. Por/.test(it('co-acond').pasos[0].texto), it('co-acond').pasos[0].texto);
ok('quitar: el paso sigue en el RMD → no se cumple', it('quitar').estado === 'falla');
ok('indicación: solo informa', it('nota').estado === 'info');
ok('totales', r.fallas === 3 && r.ok === 1 && r.info === 1, J([r.fallas, r.ok, r.info]));

const r1 = A.evaluar(acuerdos, rmdAcond, { planta: 'planta1', etapa: 'ACONDICIONADO', fase: 1 });
ok('fase 1: el acuerdo «desde fase 2» no aplica', !r1.items.some((x) => x.acuerdo.id === 'desp'));
const rs = A.evaluar(acuerdos, rmdAcond, { planta: '', etapa: '', fase: 0 });
ok('sin planta/etapa/fase: el acuerdo aplica y avisa qué no se pudo leer', J(rs.items.find((x) => x.acuerdo.id === 'desp').sinDato) === J(['fase']) && J(rs.items.find((x) => x.acuerdo.id === 'solo-lima').sinDato) === J(['planta']));
ok('sin etapa: se exigen los pasos de todas las etapas', rs.items.find((x) => x.acuerdo.id === 'desp').pasos.length === 4);
const rLima = A.evaluar(acuerdos, [paso('999001', 'PROCEDIMIENTO')], { planta: 'planta2', etapa: 'FABRICACION', fase: 3 });
ok('LIMA: aplica el suyo y se cumple; despejes exige 184004 (fabricación)', rLima.items.find((x) => x.acuerdo.id === 'solo-lima').estado === 'ok' && J(rLima.items.find((x) => x.acuerdo.id === 'desp').pasos.map((p) => p.codigo)) === J(['184004']));
const rRec = A.evaluar(acuerdos, rmdAcond, { planta: 'planta2', etapa: A.etapaRmd('RECUBRIMIENTO'), fase: 2 });
ok('RECUBRIMIENTO: no le aplica un acuerdo solo de acondicionado ni le exige pasos de despeje de otras etapas', A.etapaRmd('Recubrimiento') === 'RECUBRIMIENTO' && !rRec.items.some((x) => x.acuerdo.id === 'co-acond') && !rRec.items.some((x) => x.acuerdo.id === 'desp'), J(rRec.items.map((x) => [x.acuerdo.id, x.estado])));
ok('código con ceros a la izquierda en SAP', A.evaluar([acuerdos[0]], [paso('0180998', 'PRECAUCIONES')], {}).items[0].estado === 'ok');

// ---- Excel de «Exportar» de status-rmd (filas como las devuelve filasDeArchivo) ----
const hojas = [
  { hoja: 'Acuerdos', filas: [['ID', 'Título', 'Planta', 'Etapas', 'Sección', 'Qué se hace', 'Desde la fase', 'Condición', 'Explicación', 'Pedido por', 'Vigente desde', 'Estado', 'Creado por', 'Creado', 'Actualizado por', 'Actualizado'],
    ['a1', 'Despejes sin V°B°', 'ambas', '', 'PROCEDIMIENTO', 'reemplazar', '2', '', 'Desde la fase 2…', 'Documentación', '', 'vigente', 'X', '2026-10-28', 'X', '2026-10-28T18:00:00Z'],
    ['a2', 'CO envase', 'planta1', 'ENVASE', '', 'agregar', '', '', '', '', '', 'anulado', '', '', '', '']] },
  { hoja: 'Pasos', filas: [['ID acuerdo', 'Orden', 'Código', 'Descripción', 'Etapa', 'Tipo dato', 'R. Por', 'V°B°', 'Estado CC', 'Nota'],
    ['a1', '2', '184008', 'REALIZAR…', 'ENVASE', '', '', '', '', ''], ['a1', '1', '184004', 'REALIZAR…', 'FABRICACION', '', '', '', '', ''],
    ['a2', '1', '180942', 'EL PERSONAL…', '', 'Realizado por', 'SI', '', 'SI', '']] },
  { hoja: 'Historial', filas: [['ID acuerdo', 'Fecha', 'Quién', 'Qué']] },
];
const lx = A.deHojas(hojas);
ok('Excel: lee los 2 acuerdos', lx && lx.length === 2);
ok('Excel: fase, sección y pasos en orden', lx[0].faseDesde === 2 && lx[0].seccion === 'PROCEDIMIENTO' && J(lx[0].pasos.map((p) => p.codigo)) === J(['184004', '184008']) && lx[0].pasos[1].etapa === 'ENVASE');
ok('Excel: planta, etapas, estado y casillas', lx[1].planta === 'planta1' && J(lx[1].etapas) === J(['ENVASE']) && lx[1].estado === 'anulado' && lx[1].pasos[0].rPor && lx[1].pasos[0].estadoCC && !lx[1].pasos[0].vb);
// ---- Exportar de la pestaña del portal (con imágenes partidas en trozos) y volver a leerlo ----
const img = 'data:image/webp;base64,' + 'A'.repeat(65000);
const conImg = A.normalizar({ id: 'i1', titulo: 'Con imagen', tipo: 'nota', detalle: 'Línea 1\nLínea 2', imagenes: [{ id: 'x', nombre: 'Captura', src: img }, { id: 'y', src: 'javascript:alert(1)' }],
  historial: [{ fecha: '2026-10-28T19:00:00Z', por: 'Carlos', accion: 'Creado' }], creadoPor: 'Carlos', pasos: [{ codigo: '0184004', rPor: true }] });
ok('normalizar: solo imágenes data:image', conImg.imagenes.length === 1 && conImg.imagenes[0].nombre === 'Captura');
const hx = A.aHojas([conImg, lx[0]]);
ok('aHojas: 4 hojas; la imagen en 3 trozos de ≤ 30 000', J(Object.keys(hx)) === J(['Acuerdos', 'Pasos', 'Historial', 'Imagenes']) && hx.Imagenes.length === 4 && hx.Imagenes.slice(1).every((f) => f[4].length <= 30000));
const ida = A.deHojas(Object.entries(hx).map(([hoja, filas]) => ({ hoja, filas })));
ok('ida y vuelta: imagen, historial, creador, texto y casillas', ida[0].imagenes[0].src === img && ida[0].historial[0].por === 'Carlos' && ida[0].creadoPor === 'Carlos' && ida[0].detalle === 'Línea 1\nLínea 2' && ida[0].pasos[0].codigo === '184004' && ida[0].pasos[0].rPor);
ok('ida y vuelta: el acuerdo sin imágenes queda igual', J(ida[1]) === J(lx[0]), J(ida[1]));
ok('Excel sin hoja «Acuerdos» → null', A.deHojas([{ hoja: 'ACCIONES CC', filas: [['A']] }]) === null);

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallas ? 1 : 0);
