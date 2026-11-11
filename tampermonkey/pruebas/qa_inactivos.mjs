// Pruebas de «INACTIVO solo a la vista» (bloque ==INACTIVOS== del userscript, v1.127.0): la lista embebida es la del repo
// (docs/rmd_a_inactivo_2026-11-11.csv: los 1 328 del análisis de suspendidos, v1.135.3) y solo se muestra INACTIVO si el RMD sigue Suspendido. Sin portal: solo Node 18+.
//     node tampermonkey/pruebas/qa_inactivos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const I = new Function(bloque('// ==INACTIVOS-INICIO==', '// ==INACTIVOS-FIN==')
  + '\nreturn { INACTIVO_IDS, INACTIVO_FECHA, ESTADO_INACTIVO, esInactivo, estadoConInactivo };')();
const { grupo } = new Function(bloque('// ==MISMOV-INICIO==', '// ==MISMOV-FIN==') + '\nreturn { grupo: misMovGrupo };')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

const leerCsv = (n) => fs.readFileSync(path.join(aqui, '..', '..', 'docs', n), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map((l) => l.split(';'));
const viejo = leerCsv('rmd_a_inactivo_2026-11-07.csv');
const csv = fs.readFileSync(path.join(aqui, '..', '..', 'docs', 'rmd_a_inactivo_2026-11-11.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map((l) => l.split(';'));
const cab = csv[0], iL = cab.indexOf('listo'), iId = cab.indexOf('md_id'), filas = csv.slice(1);
const si = filas.filter((c) => /^S[IÍ]$/.test(c[iL])), idsNuevos = new Set(si.map((c) => c[iId]));
// del CSV del 07/11, los listo = NO que la decisión final no pasa a INACTIVO (Cancelado, el MD Autorizado duplicado de MEJORAL MIGRAÑA)
const no = viejo.slice(1).filter((c) => !/^S[IÍ]$/.test(c[0]) && c[4] && !idsNuevos.has(c[4])).map((c) => { const r = []; r[iId] = c[4]; return r; });

ok('I1 La lista embebida tiene los 1 328 md_id del análisis (ATE 892, LIMA 436), con la fecha del listado', I.INACTIVO_IDS.size === si.length && si.length === 1328 && si.filter((c) => c[1] === 'ATE').length === 892 && I.INACTIVO_FECHA === '2026-11-11', `${I.INACTIVO_IDS.size} / ${si.length} ${I.INACTIVO_FECHA}`);
ok('I2 Cada md_id listo = SÍ se ve INACTIVO si sigue Suspendido (con o sin guiones, mayúsculas)', si.every((c) => I.esInactivo(c[iId], 'Suspendido') && I.esInactivo(c[iId].toUpperCase(), ' Suspendido ') && I.esInactivo(c[iId].replace(/-/g, ''), 'suspendido')));
ok('I3 Los 2 del CSV del 07/11 que no están en la decisión final (Cancelado y MD Autorizado duplicado) no se marcan', no.length === 2 && no.every((c) => !I.esInactivo(c[iId], 'Suspendido')), String(no.length));
const id = si[0][iId];
ok('I4 Solo si el estado de hoy es Suspendido: Autorizado, Ingresado, Cancelado o vacío se ven tal cual', ['Autorizado', 'Ingresado', 'Cancelado', 'Solicitado', '', null].every((e) => !I.esInactivo(id, e)) && I.estadoConInactivo(id, 'Autorizado') === 'Autorizado');
ok('I5 Un mdId que no está en la lista sigue Suspendido; sin mdId no se marca', I.estadoConInactivo('00000000-0000-0000-0000-000000000000', 'Suspendido') === 'Suspendido' && !I.esInactivo(null, 'Suspendido') && !I.esInactivo('', 'Suspendido'));
ok('I6 estadoConInactivo devuelve «INACTIVO»', I.estadoConInactivo(id, 'Suspendido') === 'INACTIVO' && I.ESTADO_INACTIVO === 'INACTIVO');
ok('I7 Mis movimientos: INACTIVO tiene su grupo «Inactivo» (Suspendido sigue en el suyo)', grupo('INACTIVO') === 'Inactivo' && grupo('Suspendido') === 'Suspendido' && grupo('Cancelado') === 'Otros');
ok('I8 La lista del userscript no trae nombres de producto (solo hexadecimal)', /const INACTIVO_IDS_HEX = '[0-9a-f]+';/.test(fuente));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa');
process.exit(fallas ? 1 : 0);
