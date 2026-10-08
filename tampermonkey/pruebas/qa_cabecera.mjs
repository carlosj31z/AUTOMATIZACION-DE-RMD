// Cabecera del script: versión y direcciones de actualización coherentes con el código.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../rmd-ui-mejoras.user.js', import.meta.url), 'utf8');
const cab = src.slice(0, src.indexOf('// ==/UserScript=='));
const meta = (k) => (cab.match(new RegExp('^// @' + k + '\\s+(.+)$', 'm')) || [])[1]?.trim();
const fallos = [];
const ok = (cond, msg) => { console.log((cond ? 'PASA  ' : 'FALLA ') + msg); if (!cond) fallos.push(msg); };
const version = meta('version'), update = meta('updateURL'), download = meta('downloadURL');
ok(/^\d+\.\d+\.\d+$/.test(version || ''), `@version con formato n.n.n (${version})`);
ok(src.includes(`const VERSION = '${version}';`), 'VERSION del código igual a @version');
ok(!!update && update === download, '@updateURL y @downloadURL iguales');
ok(/^https:\/\/medifarmape\.sharepoint\.com\/.+\/rmd-ui-mejoras\.user\.js$/.test(download || ''), '@downloadURL apunta a rmd-ui-mejoras.user.js en SharePoint');
ok(!/\s/.test(download || ''), '@downloadURL sin espacios (codificados como %20)');
ok(src.includes(`const URL_ACTUALIZACION = '${download}';`), 'URL_ACTUALIZACION del código igual a @downloadURL');
ok(meta('grant') === 'none', '@grant none (el script usa los objetos de la página)');
console.log(fallos.length ? `\n${fallos.length} falla(s)` : '\nTodo pasa.');
process.exit(fallos.length ? 1 : 0);
