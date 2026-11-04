// Arma «Generador de plantillas RMD.html»: un solo archivo, sin conexión, con pdf.js, SheetJS, el lector (parser.js),
// el catálogo base (equipos, utensilios, ids de estructuras y etiquetas) y el editor de la plantilla copiado del userscript.
//   cd plantilla-autonoma && npm install && node construir.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const AQUI = dirname(fileURLToPath(import.meta.url));
const VERSION_GEN = '1.0.0';
const US = readFileSync(join(AQUI, '..', 'tampermonkey', 'rmd-ui-mejoras.user.js'), 'utf8').split('\n');

// bloque del userscript desde la línea que empieza con «inicio» hasta la primera línea igual a «fin»
function bloque(inicio, fin) {
  const a = US.findIndex((l) => l.startsWith(inicio));
  if (a < 0) throw new Error('no se encontró ' + inicio);
  const b = US.findIndex((l, i) => i > a && l === fin);
  if (b < 0) throw new Error('no se encontró el fin de ' + inicio);
  return US.slice(a, b + 1).map((l) => l.replace(/^ {2}/, '')).join('\n');
}
const VERSION_EDITOR = /const VERSION = '([^']+)'/.exec(US.join('\n'))[1];
const NUCLEO = bloque('  function ppNucleo() {', '  }');
const EDITOR = bloque('  function ppEditorApp(PPN) {', '  }');
const cssCrudo = bloque('  const PP_EDITOR_CSS = `', '`;').replace(/^const PP_EDITOR_CSS = `/, '').replace(/`;$/, '');
const CSS = new Function('return `' + cssCrudo + '`')();

const sinCierre = (js) => js.replace(/<\/script/gi, '<\\/script');
const lib = (p) => sinCierre(readFileSync(join(AQUI, 'node_modules', p), 'utf8'));
const baseGz = readFileSync(join(AQUI, 'catalogo-base.json.gz'));
const fuenteBase = JSON.parse(gunzipSync(baseGz).toString('utf8')).fuente || '';

const partes = {
  '@@VERSION_GEN@@': VERSION_GEN,
  '@@VERSION_EDITOR@@': VERSION_EDITOR,
  '@@FUENTE_BASE@@': fuenteBase.replace(/[<>&]/g, ''),
  '@@BASE_GZ_B64@@': baseGz.toString('base64').replace(/(.{120})/g, '$1\n'),
  '@@PDFJS_WORKER@@': lib('pdfjs-dist/build/pdf.worker.min.js'),
  '@@PDFJS@@': lib('pdfjs-dist/build/pdf.min.js'),
  '@@SHEETJS@@': lib('xlsx/dist/xlsx.mini.min.js'),
  '@@LECTOR@@': sinCierre(readFileSync(join(AQUI, 'parser.js'), 'utf8')),
  '@@NUCLEO@@': sinCierre(NUCLEO),
  '@@EDITOR@@': sinCierre(EDITOR),
  '@@CSS@@': JSON.stringify(CSS).replace(/<\//g, '<\\/'),
};
let html = readFileSync(join(AQUI, 'generador.fuente.html'), 'utf8');
// reemplazo sin interpretar «$» (las librerías minificadas lo usan)
for (const [k, v] of Object.entries(partes)) html = html.split(k).join(v);
const salida = join(AQUI, 'Generador de plantillas RMD.html');
writeFileSync(salida, html);
console.log(`${salida}\n${(html.length / 1048576).toFixed(2)} MB · generador ${VERSION_GEN} · editor ${VERSION_EDITOR}`);
