// Pruebas de «Mis movimientos» (bloque ==MISMOV== del userscript): RMD en los que el usuario hizo algo entre dos fechas, con su status de hoy.
// Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_mismov.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const { armar, grupo } = new Function(bloque('// ==MISMOV-INICIO==', '// ==MISMOV-FIN==') + '\nreturn { armar: misMovArmar, grupo: misMovGrupo };')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

const D = (t) => new Date(t);
const desde = +D('2026-11-04T05:00:00Z'), hasta = +D('2026-11-05T05:00:00Z');   // 04/11 en Lima
const md = (mdId, codigo, version, estado, extra = {}) => ({ mdId, codigo, version, descripcion: 'PRODUCTO ' + mdId, nivelTxt: 'Fabricación', sucursalId: { contenido: 'PLANTA LIMA' }, estadoIdRmd: { contenido: estado }, ...extra });
const mds = [
  md(1, '2202609013', 5, 'Ingresado', { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T14:00:00Z'), usuarioActualiza: 'cjesusz', fechaActualiza: D('2026-11-04T16:00:00Z') }),   // creó la versión hoy
  md(2, '2202609100', 3, 'Autorizado', { usuarioAutorizacion: 'CJESUSZ', fechaAutorizacion: D('2026-11-04T18:00:00Z') }),                       // autorizó hoy (sin trazabilidad)
  md(3, '2202609200', 2, 'Suspendido', { usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-04T19:00:00Z') }),                              // suspendió hoy (trazabilidad)
  md(4, '2202609300', 1, 'Ingresado', { usuarioActualiza: 'OTRO', fechaActualiza: D('2026-11-04T19:00:00Z') }),                                  // pasos editados por mí, MD por otro
  md(5, '2202609400', 7, 'Autorizado', { usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-03T19:00:00Z') }),                              // ayer: fuera
  md(6, '', 1, 'Solicitado', { codigoSolicitud: '1202605000', usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T20:00:00Z') }),           // solicitud
  md(7, '2202609500', 2, 'Cancelado', { usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-04T21:00:00Z') }),
];
const traz = [
  { mdId_mdId: 3, usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T19:00:00Z'), activo: true, estadoTrazab: { contenido: 'Suspendido' } },
  { mdId_mdId: 3, usuarioRegistro: 'OTRO', fechaRegistro: D('2026-11-04T19:30:00Z'), activo: true, estadoTrazab: { contenido: 'Autorizado' } },     // de otro
  { mdId_mdId: 5, usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-03T19:00:00Z'), activo: true, estadoTrazab: { contenido: 'Autorizado' } }, // ayer
];
const fila = (mdId, extra) => ({ mdId_mdId: mdId, activo: true, ...extra });
const filas = {
  MD_ES_PASO: [
    // copias de «Nueva Versión» (registradas junto con el MD): no cuentan
    ...Array.from({ length: 40 }, () => fila(1, { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T14:01:00Z') })),
    fila(1, { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T15:00:00Z') }),                                   // paso agregado después
    fila(1, { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T14:01:00Z'), usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-04T15:30:00Z') }),   // copia luego modificada
    fila(4, { usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-04T17:00:00Z') }), fila(4, { usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-04T17:05:00Z') }),
    fila(4, { activo: false, usuarioActualiza: 'CJESUSZ', fechaActualiza: D('2026-11-04T17:10:00Z') }),
    fila(4, { usuarioActualiza: 'OTRO', fechaActualiza: D('2026-11-04T17:10:00Z') }),
  ],
  MD_ES_PASO_INSUMO_PASO: [fila(4, { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T17:20:00Z') })],
  MD_ES_ETIQUETA: [fila(4, { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T17:20:00Z') }), fila(4, { usuarioRegistro: 'CJESUSZ', fechaRegistro: D('2026-11-04T17:21:00Z') })],
};
const r = armar({ usuario: 'cjesusz', desde, hasta, mds, traz, filas });
const por = Object.fromEntries(r.map((x) => [x.mdId, x]));

ok('solo los RMD con movimientos míos en el rango', J(r.map((x) => x.mdId).sort()) === J([1, 2, 3, 4, 6, 7]), J(r.map((x) => x.mdId)));
ok('orden: del más reciente al más antiguo', r[0].mdId === 7 && r[r.length - 1].mdId === 1, J(r.map((x) => x.mdId)));
ok('versión creada: «Creó la versión 5», sin contar las copias', J(por[1].acciones) === J(['Creó la versión 5', '1 paso agregado', '1 paso modificado']), J(por[1].acciones));
ok('autorizó sin trazabilidad → «Autorizó»', J(por[2].acciones) === J(['Autorizó']) && por[2].grupo === 'Autorizado', J(por[2]));
ok('suspensión por trazabilidad; la de otro no cuenta', J(por[3].acciones) === J(['Pasó a Suspendido']) && por[3].grupo === 'Suspendido', J(por[3].acciones));
ok('conteos por tabla con género y plural', J(por[4].acciones) === J(['2 etiquetas agregadas', '1 proceso menor agregado', '2 pasos modificados', '1 paso quitado']), J(por[4].acciones));
ok('status de hoy y datos del RMD', por[4].estado === 'Ingresado' && por[4].codigo === '2202609300' && por[4].planta === 'PLANTA LIMA' && por[4].etapa === 'Fabricación');
ok('solicitud sin código', J(por[6].acciones) === J(['Registró la solicitud']) && por[6].solicitud === '1202605000' && por[6].grupo === 'Otros', J(por[6]));
ok('solo actualización del MD', J(por[7].acciones) === J(['Actualizó los datos del RMD']) && por[7].grupo === 'Otros');
ok('primero y último', por[4].primero === +D('2026-11-04T17:00:00Z') && por[4].ultimo === +D('2026-11-04T17:21:00Z'));
ok('grupos', grupo('Ingresado') === 'Ingresado' && grupo('AUTORIZADO') === 'Autorizado' && grupo('Suspendido') === 'Suspendido' && grupo('Cancelado') === 'Otros' && grupo('') === 'Otros');
ok('sin datos: lista vacía', J(armar({ usuario: 'X', desde, hasta, mds: [], traz: [], filas: {} })) === '[]');

console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo pasa.');
process.exit(fallas ? 1 : 0);
