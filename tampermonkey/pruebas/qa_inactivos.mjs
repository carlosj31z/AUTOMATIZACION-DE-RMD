// Pruebas de «INACTIVO solo a la vista» (bloque ==INACTIVOS== del userscript, v1.127.0): la lista embebida es la del repo
// (docs/rmd_a_inactivo_2026-11-07.csv, filas listo = SÍ) y solo se muestra INACTIVO si el RMD sigue Suspendido. Sin portal: solo Node 18+.
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

const csv = fs.readFileSync(path.join(aqui, '..', '..', 'docs', 'rmd_a_inactivo_2026-11-07.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map((l) => l.split(';'));
const cab = csv[0], iL = cab.indexOf('listo'), iId = cab.indexOf('md_id'), filas = csv.slice(1);
const si = filas.filter((c) => /^S[IÍ]$/.test(c[iL])), no = filas.filter((c) => !/^S[IÍ]$/.test(c[iL]) && c[iId]);

ok('I1 La lista embebida tiene los 1 313 md_id del listado (listo = SÍ), con la fecha del listado', I.INACTIVO_IDS.size === si.length && si.length === 1313 && I.INACTIVO_FECHA === '2026-11-07', `${I.INACTIVO_IDS.size} / ${si.length} ${I.INACTIVO_FECHA}`);
ok('I2 Cada md_id listo = SÍ se ve INACTIVO si sigue Suspendido (con o sin guiones, mayúsculas)', si.every((c) => I.esInactivo(c[iId], 'Suspendido') && I.esInactivo(c[iId].toUpperCase(), ' Suspendido ') && I.esInactivo(c[iId].replace(/-/g, ''), 'suspendido')));
ok('I3 Los 14 con md_id marcados listo = NO (versión más nueva, Autorizado, Cancelado) no se marcan', no.length === 14 && no.every((c) => !I.esInactivo(c[iId], 'Suspendido')), String(no.length));
const id = si[0][iId];
ok('I4 Solo si el estado de hoy es Suspendido: Autorizado, Ingresado, Cancelado o vacío se ven tal cual', ['Autorizado', 'Ingresado', 'Cancelado', 'Solicitado', '', null].every((e) => !I.esInactivo(id, e)) && I.estadoConInactivo(id, 'Autorizado') === 'Autorizado');
ok('I5 Un mdId que no está en la lista sigue Suspendido; sin mdId no se marca', I.estadoConInactivo('00000000-0000-0000-0000-000000000000', 'Suspendido') === 'Suspendido' && !I.esInactivo(null, 'Suspendido') && !I.esInactivo('', 'Suspendido'));
ok('I6 estadoConInactivo devuelve «INACTIVO»', I.estadoConInactivo(id, 'Suspendido') === 'INACTIVO' && I.ESTADO_INACTIVO === 'INACTIVO');
ok('I7 Mis movimientos: INACTIVO tiene su grupo «Inactivo» (Suspendido sigue en el suyo)', grupo('INACTIVO') === 'Inactivo' && grupo('Suspendido') === 'Suspendido' && grupo('Cancelado') === 'Otros');
ok('I8 La lista del userscript no trae nombres de producto (solo hexadecimal)', /const INACTIVO_IDS_HEX = '[0-9a-f]+';/.test(fuente));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa');
process.exit(fallas ? 1 : 0);
