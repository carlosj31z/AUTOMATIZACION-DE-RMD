// Regenera INACTIVO_IDS_HEX del userscript (bloque ==INACTIVOS==) desde el listado del repo docs/rmd_a_inactivo_2026-11-07.csv.
// Solo toma las filas «listo = SÍ» (última versión de su master y Suspendida al leer el portal) y solo su md_id (sin nombres de producto).
//     node analisis/suspendidos_inactivo/generar_inactivos_js.mjs [ruta.csv]
// Escribe en tampermonkey/rmd-ui-mejoras.user.js la línea `const INACTIVO_IDS_HEX = '…';` y la fecha del listado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const csv = process.argv[2] || path.join(raiz, 'docs', 'rmd_a_inactivo_2026-11-09.csv');
const js = path.join(raiz, 'tampermonkey', 'rmd-ui-mejoras.user.js');

const lineas = fs.readFileSync(csv, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const cab = lineas[0].split(';'), iListo = cab.indexOf('listo'), iId = cab.indexOf('md_id');
if (iListo < 0 || iId < 0) throw new Error('el CSV no tiene las columnas listo y md_id');
const ids = [...new Set(lineas.slice(1).map((l) => l.split(';')).filter((c) => /^S[IÍ]$/i.test(c[iListo].trim()))
  .map((c) => c[iId].trim().toLowerCase().replace(/-/g, '')))];
if (ids.some((x) => !/^[0-9a-f]{32}$/.test(x))) throw new Error('hay un md_id que no es un UUID');
ids.sort();
const fecha = (/(\d{4}-\d{2}-\d{2})/.exec(path.basename(csv)) || [])[1] || '';

let fuente = fs.readFileSync(js, 'utf8');
const re = /const INACTIVO_IDS_HEX = '[0-9a-f]*';/, reF = /const INACTIVO_FECHA = '[^']*';/;
if (!re.test(fuente) || !reF.test(fuente)) throw new Error('no encuentro INACTIVO_IDS_HEX / INACTIVO_FECHA en el userscript');
fuente = fuente.replace(re, `const INACTIVO_IDS_HEX = '${ids.join('')}';`);
if (fecha) fuente = fuente.replace(reF, `const INACTIVO_FECHA = '${fecha}';`);
fs.writeFileSync(js, fuente);
console.log(`${ids.length} md_id (listado ${fecha || 'sin fecha'}) escritos en ${path.relative(raiz, js)}`);
