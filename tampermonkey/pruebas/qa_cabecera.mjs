// Cabeceras del script y del cargador: versiones y direcciones coherentes con el código.
import { readFileSync } from 'node:fs';
const leer = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const src = leer('rmd-ui-mejoras.user.js'), car = leer('rmd-ui-mejoras-cargador.user.js');
const cabDe = (t) => t.slice(0, t.indexOf('// ==/UserScript=='));
const meta = (t, k) => (cabDe(t).match(new RegExp('^// @' + k + '\\s+(.+)$', 'm')) || [])[1]?.trim();
const metas = (t, k) => [...cabDe(t).matchAll(new RegExp('^// @' + k + '\\s+(.+)$', 'gm'))].map((m) => m[1].trim());
const constante = (t, k) => (t.match(new RegExp(`const ${k} = '([^']*)';`)) || [])[1];
const fallos = [];
const ok = (cond, msg) => { console.log((cond ? 'PASA  ' : 'FALLA ') + msg); if (!cond) fallos.push(msg); };

// script principal
const version = meta(src, 'version');
ok(/^\d+\.\d+\.\d+$/.test(version || ''), `script: @version con formato n.n.n (${version})`);
ok(constante(src, 'VERSION') === version, 'script: VERSION del código igual a @version');
ok(meta(src, 'grant') === 'none', 'script: @grant none (usa los objetos de la página)');
ok(!meta(src, 'updateURL') && !meta(src, 'downloadURL'), 'script: sin @updateURL/@downloadURL (lo actualiza el cargador)');
ok(/\}\)\(\);?\s*$/.test(src), 'script: termina en el cierre de la función principal (el cargador lo comprueba)');

// cargador
const vc = meta(car, 'version'), dl = meta(car, 'downloadURL');
ok(/^\d+\.\d+\.\d+$/.test(vc || '') && constante(car, 'CARGADOR') === vc, `cargador: @version ${vc} igual a CARGADOR`);
ok(meta(car, 'updateURL') === dl, 'cargador: @updateURL y @downloadURL iguales');
ok(/^https:\/\/medifarmape\.sharepoint\.com\/.+\/rmd-ui-mejoras-cargador\.user\.js$/.test(dl || '') && !/\s/.test(dl || ''), 'cargador: @downloadURL a rmd-ui-mejoras-cargador.user.js en SharePoint, sin espacios');
ok(meta(car, 'run-at') === 'document-start', 'cargador: @run-at document-start (marca su presencia antes que la copia directa)');
const grants = metas(car, 'grant');
ok(['GM_xmlhttpRequest', 'GM_getValue', 'GM_setValue'].every((g) => grants.includes(g)) && grants.length === 3, `cargador: @grant ${grants.join(', ')}`);
ok(JSON.stringify(metas(car, 'connect')) === JSON.stringify(['medifarmape.sharepoint.com']), 'cargador: @connect solo medifarmape.sharepoint.com');
ok(JSON.stringify(metas(car, 'match')) === JSON.stringify(metas(src, 'match')), 'cargador: mismo @match que el script');
ok(!/cargador/i.test(meta(src, 'name')) && /cargador/i.test(meta(car, 'name')), 'nombres: el cargador se distingue y se excluye a sí mismo');

// misma carpeta en los dos
const carpeta = constante(car, 'CARPETA'), sitio = constante(car, 'SITIO');
ok(!!carpeta && constante(src, 'CARPETA_SP') === carpeta, 'CARPETA_SP del script igual a CARPETA del cargador');
ok(sitio && carpeta.startsWith(new URL(sitio).pathname + '/'), 'la carpeta está dentro del SITIO del cargador');
ok(dl === 'https://medifarmape.sharepoint.com' + encodeURI(carpeta) + '/rmd-ui-mejoras-cargador.user.js', '@downloadURL del cargador = carpeta + rmd-ui-mejoras-cargador.user.js');
ok(constante(src, 'URL_CARGADOR') === dl, 'URL_CARGADOR del script igual a @downloadURL del cargador');
console.log(fallos.length ? `\n${fallos.length} falla(s)` : '\nTodo pasa.');
process.exit(fallos.length ? 1 : 0);
