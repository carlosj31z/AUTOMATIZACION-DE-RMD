// Pruebas del lector de controles de cambio y pendientes de las Observaciones (bloque ==PENDIENTES== del userscript), sin portal ni
// navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_pendientes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const Pendientes = new Function(bloque('// ==PENDIENTES-INICIO==', '// ==PENDIENTES-FIN==') + '\nreturn Pendientes;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

// ---- códigos de CC ----
ok('CC: 26-379-CC, 26-379 CC y CC 26-379 dan el mismo código', J(Pendientes.ccsDe('26-379-CC; 26-380 CC; CC 26-381; CC N° 26-382')) === '["26-379-CC","26-380-CC","26-381-CC","26-382-CC"]', J(Pendientes.ccsDe('26-379-CC; 26-380 CC; CC 26-381; CC N° 26-382')));
ok('CC: no confunde una fecha ni un código de equipo', Pendientes.ccsDe('2026-10-13 MEN-E034 20261022CJ-1-C1.0').length === 0);

// ---- líneas de CC aplicados (los ejemplos reales) ----
const ejemplos = `20261013LF-1-C1.0-FI1.0-FA1.0-F1
26-360-CC/L.Fernandez/2026-10-13;Nuevo Fabricante para la MP Medroxiprogesterona;insumo;Moderado.
26-361-CC/S.Chullo//2026-10-13;RMD (Acondicionado)  CLARIMED MM-  ECUADOR;Proceso;moderado.

26-363-CC/L.Fernandez/2026-10-15; ACTUALIZACIÓN DE RMD LEVODANTINA 500 mg TAB REC CARACTERIZACION DE PROCESOS;proceso;moderado.
26-356-CC/G.Guevara/2026-10-15;MODIFICACIÓN RMD FAB/ENV/ACO Epiteliol NF 50 000 UI Tableta   Recubierta;proceso;moderado.
26-371-CC/L.Fernandez/2026-10-19;Reemplazar la Chaqueta de Calentamiento N.° 1 (MEN-E034), de fabricación del producto Mentholatum; proceso; moderado
26-379-CC/L.Fernandez/2026-10-22; ACTUALIZACION RMD ACO GASEOVET CB 500mg CAP BLANDA B5 CJA X 30;proceso,moderado.`;
const a = Pendientes.analizar(ejemplos);
ok('Ejemplos: los 6 CC salen como aplicados, en orden', J(a.aplicados.map((x) => x.codigo)) === '["26-360-CC","26-361-CC","26-363-CC","26-356-CC","26-371-CC","26-379-CC"]', J(a.aplicados.map((x) => x.codigo)));
ok('Ejemplos: ninguno es pendiente (la nomenclatura tampoco)', a.pendientes.length === 0 && a.hechos.length === 0);
const e361 = a.aplicados[1], e356 = a.aplicados[3], e371 = a.aplicados[4], e379 = a.aplicados[5];
ok('Partes: responsable y fecha aunque haya «//»', e361.responsable === 'S.Chullo' && e361.fecha === '2026-10-13', J(e361));
ok('Partes: la «/» dentro de la descripción no la corta', e356.descripcion.startsWith('MODIFICACIÓN RMD FAB/ENV/ACO') && e356.tipo === 'proceso' && e356.nivel === 'moderado', J(e356));
ok('Partes: tipo y nivel con espacios y sin punto final', e371.tipo === 'proceso' && e371.nivel === 'moderado' && /Mentholatum$/.test(e371.descripcion), J(e371));
ok('Partes: «proceso,moderado.» separa tipo y nivel', e379.tipo === 'proceso' && e379.nivel === 'moderado' && /CJA X 30$/.test(e379.descripcion), J(e379));
ok('Varias entradas de CC en la misma línea se separan', J(Pendientes.analizar('26-401-CC/A/2026-01-01;x;proceso;menor 26-402-CC/B/2026-01-02;y;insumo;mayor').aplicados.map((x) => x.codigo)) === '["26-401-CC","26-402-CC"]');

// ---- pendientes ----
const pend = (t) => Pendientes.analizar(t).pendientes.map((p) => p.linea);
ok('Pendiente: «Se suspende por 26-379-CC»', J(Pendientes.analizar('20261022CJ Se suspende por 26-379-CC').pendientes.map((p) => p.ccs)) === '[["26-379-CC"]]');
ok('Pendiente: «Suspendido por actualización de fórmula (CC 26-300)»', J(Pendientes.analizar('20260924 Suspendido por actualización de fórmula (CC 26-300)').pendientes[0].ccs) === '["26-300-CC"]');
ok('Pendiente: «Pendiente aplicar…», «Falta…», «… en la siguiente versión», «por actualizar»', pend('Pendiente aplicar cambio de lote\nFalta incluir la nota de seguridad\nSe corregirá en la próxima versión\nEspecificación por actualizar').length === 4);
ok('No es pendiente: «Se aplicó lo pendiente del 26-379-CC» (ya hecho)', pend('Se aplicó lo pendiente del 26-379-CC').length === 0 && Pendientes.analizar('Se aplicó lo pendiente del 26-379-CC').hechos.length === 1);
ok('No es pendiente: una observación normal', pend('20261001CJ Actualización de Lista de Materiales').length === 0);

// ---- pendientes heredados entre versiones ----
const v4 = { version: 4, codigo: '2202600004', estado: 'Suspendido', observacion: '26-300-CC/X/2026-01-01;algo;proceso;menor\n20261022CJ Se suspende por 26-379-CC\nPendiente: actualizar especificación de dureza' };
let h = Pendientes.heredados([v4], { version: 5, observacion: '20261023CJ-1-C1.0-FI1.0-FA1.0-F1' });
ok('Heredado: v5 sin el 26-379-CC avisa que falta aplicarlo (desde la v4)', J(h.ccs.map((x) => [x.cc, x.version])) === '[["26-379-CC",4]]', J(h.ccs));
ok('Heredado: el pendiente sin CC de la v4 se muestra para revisar', h.textos.length === 1 && /dureza/.test(h.textos[0].linea));
h = Pendientes.heredados([v4], { version: 5, observacion: '26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado' });
ok('Heredado: si la v5 registra el 26-379-CC ya no avisa', h.ccs.length === 0 && J(h.aplicados.map((x) => [x.codigo, x.heredado])) === '[["26-379-CC",false]]');
h = Pendientes.heredados([v4], { version: 5, observacion: v4.observacion });
ok('Heredado: con las Observaciones copiadas de la v4, el pendiente sigue y el CC de la v4 sale como anterior', h.ccs.length === 1 && h.propios.length === 0 && h.aplicados[0].heredado === true, J(h));
const v5 = { version: 5, codigo: '2202600005', estado: 'Autorizado', observacion: '26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado' };
h = Pendientes.heredados([v4, v5], { version: 6, observacion: '' });
ok('Heredado: resuelto en una versión intermedia (v5) no se avisa en la v6; el texto tampoco tras una autorizada', h.ccs.length === 0 && h.textos.length === 0, J(h));
h = Pendientes.heredados([{ ...v4, estado: 'Cancelado' }], { version: 5, observacion: '' });
ok('Heredado: no se leen las versiones Canceladas', h.ccs.length === 0 && h.textos.length === 0);
h = Pendientes.heredados([], { version: 1, observacion: 'Falta la firma de Calidad' });
ok('Propio: lo anotado como pendiente en la versión abierta se lista', h.propios.length === 1);

console.log(fallas ? `\n${fallas} prueba(s) fallaron.` : '\nTodas las pruebas pasaron.');
process.exit(fallas ? 1 : 0);
