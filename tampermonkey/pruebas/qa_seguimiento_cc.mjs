// Pruebas del «Seguimiento de CC» (bloque ==SEGCC== del userscript, v1.122.0): CC con bandera, sus RMD asociados a mano y si ya ejecutaron el CC.
// Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_seguimiento_cc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const S = new Function(bloque('// ==SEGCC-INICIO==', '// ==SEGCC-FIN==') + '\nreturn SeguimientoCC;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

const ahora = '2026-11-05T15:00:00.000Z';
const cc = { carpeta: '26-379-CC ADENDA I', codigo: '26-379-CC', adenda: 'ADENDA I', planta: 'P2' };
const acciones = [{ accion: '2', descripcion: 'Actualizar los RMD de envase', plazo: '2026-12-15', analista: 'S. CHULLO', estado: 'En plazo' },
  { accion: '1', descripcion: 'Actualizar el RMD de fabricación', plazo: '2026-11-30', analista: 'V. REYES', estado: 'Vencido' }];
const rec = S.nuevo(cc, acciones, 'CINTIA', ahora);
ok('nuevo: id = carpeta del CC y sus acciones', rec.id === '26-379-CC ADENDA I' && rec.acciones.length === 2 && rec.marcadoPor === 'CINTIA' && rec.rmd.length === 0 && rec.historial.length === 1, J(rec));

// RMD: un linaje con v1 Autorizada (vieja) y v2 Ingresada; otro Autorizado; uno cancelado en su versión más alta
const mds = [
  { mdId: 10, codigo: '2202609013', linaje: '', version: '1', estado: 'Autorizado', descripcion: 'AMOXICILINA', etapa: 'Fabricación', planta: 'PLANTA LIMA', fechaAut: '2026-03-01' },
  { mdId: 11, codigo: '2202609013', linaje: '2202609013', version: '2', estado: 'Ingresado', descripcion: 'AMOXICILINA', etapa: 'Fabricación', planta: 'PLANTA LIMA', fechaAut: '' },
  { mdId: 20, codigo: '2202609209', linaje: '', version: '4', estado: 'Autorizado', descripcion: 'PARACETAMOL', etapa: 'Envase', planta: 'PLANTA LIMA', fechaAut: '2026-11-04' },
  { mdId: 30, codigo: '2202609224', linaje: '', version: '1', estado: 'Autorizado', descripcion: 'IBUPROFENO', etapa: 'Envase', planta: 'PLANTA LIMA', fechaAut: '2026-10-01' },
  { mdId: 31, codigo: '2202609224', linaje: '2202609224', version: '2', estado: 'Cancelado', descripcion: 'IBUPROFENO', etapa: 'Envase', planta: 'PLANTA LIMA', fechaAut: '' },
];
// índice CC -> mdId -> tipo, como AccionesCC.indiceRmd
const ind = new Map([['26-379-CC', new Map([[11, { tipo: 'aplicado' }], [20, { tipo: 'aplicado' }], [10, { tipo: 'pendiente' }]])]]);

const n1 = S.agregar(rec, [mds[1], mds[2]], 'CINTIA', ahora, 'Observaciones');
const n2 = S.agregar(rec, [mds[0], mds[3]], 'Vanessa', ahora, 'Mis movimientos');
ok('agregar no repite el linaje (v1 y v2 son el mismo RMD)', n1 === 2 && n2 === 1 && rec.rmd.length === 3 && rec.rmd[2].origen === 'Mis movimientos', `${n1} ${n2} ${J(rec.rmd.map((r) => r.fam))}`);

const e = (cod) => S.estadoRmd(rec.rmd.find((r) => r.codigo === cod), mds, ind, '26-379-CC');
const a = e('2202609013'), b = e('2202609209'), c = e('2202609224');
ok('versión de hoy: la más alta del linaje (v2 Ingresada)', a.version === '2' && a.estadoSap === 'Ingresado' && a.tipo === 'aplicado', J(a));
ok('aplicado pero sin autorizar: En proceso, no ejecutado', a.estado === 'En proceso' && !a.ejecutado && !a.auto, J(a));
ok('Autorizado con el CC aplicado: Ejecutado automático, con fecha', b.estado === 'Ejecutado' && b.ejecutado && b.auto && !b.manual && b.fechaAut === '2026-11-04', J(b));
ok('versión más alta Cancelada: se toma la anterior no cancelada', c.version === '1' && c.estadoSap === 'Autorizado' && c.tipo === '' && c.estado === 'Pendiente', J(c));
ok('estado del CC: En proceso', S.estadoCC([a, b, c]) === 'En proceso');

// marcar a mano
const rc = rec.rmd.find((r) => r.codigo === '2202609224');
S.marcar(rc, true, c.auto, 'CINTIA', ahora);
const c2 = e('2202609224');
ok('marcado a mano: Ejecutado (a mano)', c2.ejecutado && c2.manual && rc.manualPor === 'CINTIA', J(rc));
S.marcar(rc, false, c.auto, 'CINTIA', ahora);
ok('desmarcar lo que ya era automático vuelve a automático', !('manual' in rc) && !e('2202609224').ejecutado, J(rc));
const rb = rec.rmd.find((r) => r.codigo === '2202609209');
S.marcar(rb, false, b.auto, 'CINTIA', ahora);
ok('desmarcar un automático queda «No» a mano', rb.manual === false && !e('2202609209').ejecutado && e('2202609209').manual, J(rb));
S.marcar(rb, true, b.auto, 'CINTIA', ahora);
ok('y marcarlo otra vez lo deja automático', !('manual' in rb) && e('2202609209').ejecutado);

ok('estadoCC: sin RMD / todos ejecutados / ninguno', S.estadoCC([]) === 'Sin RMD' && S.estadoCC([b]) === 'Ejecutado' && S.estadoCC([c]) === 'Pendiente');
ok('no encontrado en los RMD leídos', S.estadoRmd({ fam: '999', codigo: '999' }, mds, ind, '26-379-CC').estadoSap === 'No encontrado');

// cuadro
ok('plazo = el más próximo; analistas sin repetir', S.plazoDe(rec) === '2026-11-30' && S.analistasDe(rec) === 'S. CHULLO, V. REYES', `${S.plazoDe(rec)} ${S.analistasDe(rec)}`);
const dia = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const filas = rec.rmd.map((r) => ({ r, e: S.estadoRmd(r, mds, ind, rec.codigo) }));
const sinRmd = { ...S.nuevo({ carpeta: '26-400-CC', codigo: '26-400-CC', planta: 'P1' }, [], 'KMORENOM', ahora) };
const cuadro = S.filasCuadro([{ rec, filas, estado: S.estadoCC(filas.map((x) => x.e)) }, { rec: sinRmd, filas: [], estado: 'Sin RMD' }], dia, (u) => (u === 'KMORENOM' ? 'Vanessa' : u));
ok('cuadro: una fila por RMD y una por CC sin RMD', cuadro.length === 4 && cuadro.every((f) => f.length === S.COLS.length), J(cuadro.map((f) => f.length)));
const f0 = cuadro[1];
ok('fila del cuadro con el orden de las columnas', f0[0] === '26-379-CC ADENDA I' && f0[1] === 'P2' && f0[3] === '30/11/2026' && f0[5] === 'En proceso' && f0[6] === '2202609209' && f0[7] === '4' && f0[12] === 'Sí' && f0[13] === '04/11/2026' && f0[15] === 'CINTIA 05/11/2026', J(f0));
ok('CC sin RMD: columnas del RMD vacías y marcado por (nombre visible)', cuadro[3][5] === 'Sin RMD' && cuadro[3][6] === '' && cuadro[3][15] === 'Vanessa 05/11/2026', J(cuadro[3]));
ok('acciones en una celda', /^Acción 2: .* \| Acción 1: /.test(cuadro[0][2]), cuadro[0][2]);

console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTODO PASA');
process.exit(fallas ? 1 : 0);
