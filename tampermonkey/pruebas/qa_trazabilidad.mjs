// Pruebas de la Trazabilidad que «Enviar a Status RMD» manda para el Programa acumulado (bloque ==TRAZABILIDAD== del userscript):
// cambios de estado por RMD desde TRAZ_STATUS_DESDE con su estado al empezar, solicitudes con sus fechas del MD, filas inactivas o sin
// estado fuera. Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_trazabilidad.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const { traz, DESDE } = new Function(bloque('// ==TRAZABILIDAD-INICIO==', '// ==TRAZABILIDAD-FIN==') + '\nreturn { traz: trazabilidadParaStatusRmd, DESDE: TRAZ_STATUS_DESDE };')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

// MD como los lee leerMDPaginado (fechas como Date) y filas de MD_TRAZABILIDAD con estadoTrazab expandido
const md = (mdId, codigo, version, nivelTxt, estado, extra = {}) => ({ mdId, codigo, codigoSolicitud: '', version, nivelTxt, estadoIdRmd: { contenido: estado }, ...extra });
const fila = (id, mdId, fecha, estado, activo = true) => ({ idTrazabilidad: id, mdId_mdId: mdId, fechaRegistro: new Date(fecha), activo, estadoTrazab: estado == null ? null : { contenido: estado } });
const datos = [
  md(1, '2202609273', 6, 'Fabricación', 'Suspendido'),
  md(2, '2202505878', 4, 'Fabricación', 'Suspendido'),          // sin cambios desde «desde»
  md(3, '2202609309', 1, 'Envase', 'Cancelado'),
  md(4, '', 1, 'Fabricación', 'Solicitud Aprobada', { codigoSolicitud: '1202604991', fechaSolicitud: new Date('2026-10-20T14:00:00Z'), fechaActualiza: new Date('2026-10-29T21:50:00Z') }),
  md(5, '', 2, 'Envase', 'Solicitado', { codigoSolicitud: '1202500001', fechaSolicitud: new Date('2025-06-01T15:00:00Z') }),          // anterior a «desde»
  md(6, '', 1, 'Acondicionado', 'Solicitud Rechazada', { codigoSolicitud: '1202604998', fechaSolicitud: new Date('2026-09-10T15:00:00Z') }),   // sin fechaActualiza
  md(7, '2202609341', 1, 'Fabricación', 'Ingresado', { codigoSolicitud: '1202604991', fechaSolicitud: new Date('2026-10-20T14:00:00Z') }),   // nació de la solicitud 4
];
const filas = [
  fila(10, 1, '2025-12-20T15:00:00Z', 'Ingresado'),
  fila(11, 1, '2026-01-05T07:09:00Z', 'Autorizado'),
  fila(12, 1, '2026-01-05T07:12:00Z', 'Ingresado'),
  fila(13, 1, '2026-01-05T09:07:00Z', ' Autorizado '),
  fila(14, 1, '2026-01-22T19:51:00Z', 'Suspendido'),
  fila(15, 1, '2025-11-01T15:00:00Z', 'Ingresado'),             // anterior y fuera de orden: no es el último de antes
  fila(20, 2, '2025-07-30T15:00:00Z', 'Autorizado'),
  fila(21, 2, '2025-12-24T15:00:00Z', 'Suspendido'),
  fila(30, 3, '2026-10-23T21:50:00Z', 'Ingresado'),
  fila(31, 3, '2026-10-23T21:51:00Z', 'Suspendido', false),     // inactiva
  fila(32, 3, '2026-10-23T21:52:00Z', null),                    // sin estado
  fila(33, 3, '2026-10-23T21:52:30Z', 'Cancelado'),
  fila(70, 7, '2026-10-29T22:17:00Z', 'Ingresado'),
  fila(90, 99, '2026-03-01T15:00:00Z', 'Autorizado'),           // de un MD que no vino en el maestro
];
const t = traz(filas, datos);
const porCodigo = new Map(t.items.map((x) => [x[0] || x[1], x]));

ok('cabecera: v 1, desde = TRAZ_STATUS_DESDE (2026-01-01) y generado', t.v === 1 && t.desde === '2026-01-01' && DESDE === '2026-01-01' && !isNaN(Date.parse(t.generado)));
ok('un item por RMD con cambios desde «desde» (no el que no cambió, ni la solicitud antigua, ni un MD ajeno)',
  J([...porCodigo.keys()].sort()) === J(['1202604991', '1202604998', '2202609273', '2202609309', '2202609341']), J([...porCodigo.keys()]));
ok('item: [código, solicitud, versión (texto), etapa, cambios]', J(porCodigo.get('2202609341').slice(0, 4)) === J(['2202609341', '1202604991', '1', 'Fabricación']));
ok('cambios en orden, desde el último de antes (estado al empezar), con el estado limpio', J(porCodigo.get('2202609273')[4]) === J([
  ['2025-12-20T15:00:00.000Z', 'Ingresado'], ['2026-01-05T07:09:00.000Z', 'Autorizado'], ['2026-01-05T07:12:00.000Z', 'Ingresado'],
  ['2026-01-05T09:07:00.000Z', 'Autorizado'], ['2026-01-22T19:51:00.000Z', 'Suspendido']]), J(porCodigo.get('2202609273')[4]));
ok('filas inactivas o sin estado no cuentan', J(porCodigo.get('2202609309')[4]) === J([['2026-10-23T21:50:00.000Z', 'Ingresado'], ['2026-10-23T21:52:30.000Z', 'Cancelado']]));
ok('solicitud aprobada: Fecha Solicitud y su última actualización', J(porCodigo.get('1202604991')) === J(['', '1202604991', '1', 'Fabricación',
  [['2026-10-20T14:00:00.000Z', 'Solicitado'], ['2026-10-29T21:50:00.000Z', 'Solicitud Aprobada']]]));
ok('solicitud rechazada sin fechaActualiza: las dos en su Fecha Solicitud, primero Solicitado', J(porCodigo.get('1202604998')[4]) === J([
  ['2026-09-10T15:00:00.000Z', 'Solicitado'], ['2026-09-10T15:00:00.000Z', 'Solicitud Rechazada']]));
ok('fechas como texto ISO (lo que llega del servicio sin convertir)', J(traz([{ mdId_mdId: 1, fechaRegistro: '2026-02-01T10:00:00Z', estadoTrazab: { contenido: 'Autorizado' } }], [datos[0]]).items)
  === J([['2202609273', '', '6', 'Fabricación', [['2026-02-01T10:00:00.000Z', 'Autorizado']]]]));
ok('sin filas ni maestro: sin items', J(traz([], []).items) === '[]' && J(traz(null, null).items) === '[]');
const desdeOtro = traz(filas, datos, '2026-10-01');
ok('otro «desde»: solo lo que cambió desde entonces', J(desdeOtro.items.map((x) => x[0] || x[1]).sort()) === J(['1202604991', '2202609309', '2202609341']) && desdeOtro.desde === '2026-10-01');
ok('el payload es JSON sin pérdidas (va por postMessage)', J(JSON.parse(J(t))) === J(t));

// ---- conexión con el resto del script ----
ok('«Enviar a Status RMD» lee la Trazabilidad y la manda en el mensaje (sin detener el envío si falla)',
  /trazabilidad = await leerTrazabilidadParaStatusRmd\(modelo, datos,/.test(fuente) && /usuarioSap, opSap, trazabilidad \};/.test(fuente) && /avisoTraz = ` No se pudo leer la Trazabilidad/.test(fuente));
ok('MD_TRAZABILIDAD con filtro por fecha y, si el servicio no lo acepta, sin filtro', /leerEntidadCompleta\(modelo, 'MD_TRAZABILIDAD', params, 'idTrazabilidad', avisar, \[new F\('fechaRegistro', 'GE'/.test(fuente)
  && /catch \(e\) \{ filas = await leerEntidadCompleta\(modelo, 'MD_TRAZABILIDAD', params, 'idTrazabilidad', avisar\); \}/.test(fuente));
ok('leerEntidadCompleta pasa los filtros al conteo y a cada página', /async function leerEntidadCompletaCon\(modelo, entidad, params, clave, avisar, filtros\)/.test(fuente) && /modelo\.read\(ruta, \{ filters: filtros, urlParameters: u,/.test(fuente));
ok('el maestro trae fechaActualiza (solicitudes aprobadas o rechazadas)', /'usuarioRegistro', 'fechaActualiza', 'fechaAutorizacion'/.test(fuente));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa.');
process.exit(fallas ? 1 : 0);
