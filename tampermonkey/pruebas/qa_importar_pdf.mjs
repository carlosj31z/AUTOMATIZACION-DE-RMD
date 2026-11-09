// Importar el PDF del borrador de Producción (v1.131.2): los datos van en enlaces «…#RMDPDF1.i.n.<base64url>».
// Un PDF vuelto a guardar los deja en flujos comprimidos, con un salto de línea antes de «endstream» y con
// las direcciones largas partidas por «\» + salto de línea (continuación de cadena en PDF). Antes no se leían.
import { readFileSync } from 'node:fs';
import { deflateSync, gzipSync } from 'node:zlib';
const src = readFileSync(new URL('../rmd-ui-mejoras.user.js', import.meta.url), 'utf8');
const ppTrozosPdf = new Function(src.slice(src.indexOf('  const PP_MARCA_PDF'), src.indexOf('  async function ppLeerPdf')) + '\nreturn ppTrozosPdf;')();
const fallos = [];
const ok = (cond, msg) => { console.log((cond ? 'PASA  ' : 'FALLA ') + msg); if (!cond) fallos.push(msg); };

const carga = { v: 1, datos: { tipo: 'plantilla-rmd', relleno: 'X'.repeat(5000) + Math.random() }, prop: { tipo: 'borrador-rmd' } };
const b64 = gzipSync(Buffer.from(JSON.stringify(carga))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const T = Math.ceil(b64.length / 3), trozos = [0, 1, 2].map((i) => b64.slice(i * T, (i + 1) * T));
const enlaces = (partir) => trozos.map((t, i) => {
  let d = `https://borrador-rmd.invalid/#RMDPDF1.${i}.3.${t}`;
  if (partir) d = d.match(/.{1,200}/g).join('\\\r');                      // como lo guarda Chrome/Edge al volver a guardar
  return `<</A<</S/URI/Type/Action/URI(${d})>>/Subtype/Link/Type/Annot>>`;
}).join('');
const pdf = (cuerpo, comprimir) => {
  const flujo = comprimir ? deflateSync(Buffer.from(cuerpo, 'latin1')) : Buffer.from(cuerpo, 'latin1');
  return new Uint8Array(Buffer.concat([Buffer.from(`%PDF-1.6\n1 0 obj\n<</Length ${flujo.length}${comprimir ? '/Filter/FlateDecode' : ''}>>stream\r\n`), flujo, Buffer.from('\r\nendstream\nendobj\n%%EOF\n')]));
};
const leer = async (u8) => { const m = await ppTrozosPdf(u8); return m.n === 3 && m.t.join('') === b64; };

ok(await leer(pdf(enlaces(false), false)), 'PDF de «Generar PDF» sin comprimir: lee las 3 partes');
ok(await leer(pdf(enlaces(true), false)), 'direcciones partidas con «\\» + salto de línea, sin comprimir: las une');
ok(await leer(pdf(enlaces(false), true)), 'en un flujo comprimido con salto de línea antes de «endstream»: lo lee');
ok(await leer(pdf(enlaces(true), true)), 'comprimido y partido (caso SINCOL NF 2202505045 v5): lo lee');
ok((await ppTrozosPdf(pdf('nada', true))).n === 0, 'PDF sin datos: n = 0 (el portal avisa que no trae el borrador)');

if (fallos.length) { console.log(`\n${fallos.length} prueba(s) fallaron`); process.exit(1); }
console.log('\nTodas pasan');
