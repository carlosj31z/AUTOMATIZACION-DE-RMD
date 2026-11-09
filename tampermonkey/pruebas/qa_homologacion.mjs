// Pruebas de la homologación en el núcleo del borrador / Edición rápida (v1.132.0, bloque ==HOMOLOG== de ppNucleo).
// Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_homologacion.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const a = fuente.indexOf('  function ppNucleo() {'), b = fuente.indexOf('  const PPN = ppNucleo();');
if (a < 0 || b < a) throw new Error('no encuentro ppNucleo');
const PPN = new Function(fuente.slice(a, b) + '\nreturn ppNucleo();')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

// paso viejo -> vigente por planta
ok('PDSG-202 (161493) en LIMA -> 182341', (PPN.homologacionPaso(161493, 'PLANTA LIMA') || {}).codigo === 182341);
ok('PDSG-202 (1655) en ATE -> 182341', (PPN.homologacionPaso('1655', 'PLANTA ATE') || {}).codigo === 182341);
ok('«hagan» (31840) en ATE -> 62221', (PPN.homologacionPaso(31840, 'PLANTA ATE') || {}).codigo === 62221);
ok('«hagan» (31840) en LIMA -> 166452', (PPN.homologacionPaso(31840, 'PLANTA LIMA') || {}).codigo === 166452);
ok('sin planta y plantas distintas: no adivina', PPN.homologacionPaso(31840, '') === null);
ok('paso vigente no se marca', PPN.homologacionPaso(182341, 'PLANTA LIMA') === null);

// términos
const h1 = PPN.homologarTexto('Los vistos buenos (V°B°) serán realizados ... según el POE PDSG-202 vigente.');
ok('PDSG-202 -> PDOC-207 y (VB)', /PDOC-207/.test(h1.texto) && /\(VB\)/.test(h1.texto) && !/[ÁÉÍÓÚ]/.test(h1.texto), h1.texto);
const h2 = PPN.homologarTexto('Controlar que sus compañeros hagan lo mismo.');
ok('hagan -> realicen, conserva la Ñ', h2.texto === 'CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO.', h2.texto);
ok('instructivo y vigente', PPN.homologarTexto('REALIZAR EL DESPEJE DE LA SALA SEGUN IPRO-P212 VIGENTE.').texto === 'REALIZAR EL DESPEJE DE LA SALA SEGUN INSTRUCTIVO IPRO-P212 VIGENTE.');
ok('contramuestra', PPN.homologarTexto('CONTRAMUESTRA (CJA):').texto === 'CANTIDAD MUESTREADA (CJA):');
ok('parihuela', PPN.homologarTexto('COLOCAR EN LA PARIHUELA.').texto === 'COLOCAR EN LA PLATAFORMA.');
ok('texto ya homologado sin reglas', PPN.homologarTexto('CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO.').reglas.length === 0);

// avisos del borrador: paso viejo en SAP y texto nuevo con términos viejos
const trabajo = { estructuras: [{ id: 'e1', estructuraId: 'E1', nombre: 'PRECAUCIONES', pasos: [
  { id: 'p1', codigo: 31840, texto: 'CONTROLAR QUE SUS COMPAÑEROS HAGAN LO MISMO.' },
  { id: 'p2', nuevo: true, texto: 'VERIFICAR EL DESPEJE SEGUN IPRO-P212 VIGENTE.' },
  { id: 'p3', codigo: 62221, texto: 'CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO.' },
], etiquetas: [], equipos: [], utensilios: [], insumos: [] }] };
const av = PPN.avisos(trabajo, { planta: 'PLANTA ATE', base: [] });
const txt = (id) => (av.get(id) || []).map((x) => x.texto).join(' | ');
ok('aviso del paso viejo con el código vigente', /62221/.test(txt('p1')) && /Por homologar/.test(txt('p1')), txt('p1'));
ok('aviso de términos en paso nuevo', /Términos por homologar/.test(txt('p2')) && /INSTRUCTIVO IPRO-P212/.test(txt('p2')), txt('p2'));
ok('paso vigente sin aviso de homologación', !/homologar/i.test(txt('p3')), txt('p3'));

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
