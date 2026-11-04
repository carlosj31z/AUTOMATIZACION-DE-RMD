// Prueba del lector sin navegador: node prueba.mjs <master.pdf> <Pasos.xlsx> [codigo]
// Imprime lo leído por sección y los textos que no se hallaron en el catálogo de Pasos.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const XLSX = require('xlsx');
const L = require('./parser.js');
const [pdf, xls, codigo] = process.argv.slice(2);
if (!pdf || !xls) { console.error('uso: node prueba.mjs <master.pdf> <Pasos.xlsx> [codigo]'); process.exit(1); }
const base = JSON.parse(gunzipSync(readFileSync(new URL('./catalogo-base.json.gz', import.meta.url))).toString('utf8'));
const wb = XLSX.read(readFileSync(xls), { type: 'buffer', dense: true });
const cat = L.leerCatalogo(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }), base);
const r = L.leerMaster(await L.leerPdf(pdfjs, new Uint8Array(readFileSync(pdf))), cat, base, { codigo: codigo || (/(\d{10})/.exec(pdf) || [])[1] });
console.log(`RMD ${r.rmd.codigo} v${r.rmd.version} · ${r.rmd.etapa} · ${r.rmd.descripcion} · ${r.rmd.estadoFechaPor}`);
r.arbol.estructuras.forEach((e) => console.log(`${e.orden}. ${e.nombre} (tipo ${e.tipo}) pasos ${e.pasos.length}${e.etiquetas.length ? ' · ' + e.etiquetas.map((t) => `${t.nombre}${t.conforme ? '*' : ''} ${t.pasos.length}`).join(', ') : ''} · equipos ${e.equipos.length + e.utensilios.length} · insumos ${e.insumos.length} · especificaciones ${e.espec.length}`));
const s = r.stats;
console.log(`pasos ${s.pasos} · procesos menores ${s.pm} · insumos en pasos ${s.insumosEnPasos} · con código ${s.conCodigo} de ${s.pasos + s.pm}`);
s.sinCodigo.forEach((x) => console.log(`  sin código: ${x.donde} (${x.clase}): ${x.texto}`));
s.equiposSinId.forEach((x) => console.log(`  equipo fuera del catálogo: ${x}`));
const paq = L.armarPaquete(r, cat, base, { huella: () => 'prueba' });
console.log(`catálogo en la plantilla: ${paq.catalogo.pasos.split('\n').length} pasos`);
