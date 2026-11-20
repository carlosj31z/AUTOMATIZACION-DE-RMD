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
ok('PDSG-202 (161493) en LIMA -> 186337', (PPN.homologacionPaso(161493, 'PLANTA LIMA') || {}).codigo === 186337);
ok('PDSG-202 (1655) en ATE -> 186337', (PPN.homologacionPaso('1655', 'PLANTA ATE') || {}).codigo === 186337);
ok('POE PDOC-207 (182341) en LIMA -> 186337 (v1.146.0)', (PPN.homologacionPaso(182341, 'PLANTA LIMA') || {}).codigo === 186337);
ok('«hagan» (31840) en ATE -> 62221', (PPN.homologacionPaso(31840, 'PLANTA ATE') || {}).codigo === 62221);
ok('«hagan» (31840) en LIMA -> 166452', (PPN.homologacionPaso(31840, 'PLANTA LIMA') || {}).codigo === 166452);
ok('sin planta y plantas distintas: no adivina', PPN.homologacionPaso(31840, '') === null);
ok('FECHA DE ELABORACION (35156) no se homologa: CC puntual de Ecuador (v1.146.2)', PPN.homologacionPaso(35156, 'PLANTA LIMA') === null);
ok('paso vigente no se marca', PPN.homologacionPaso(186337, 'PLANTA LIMA') === null);

// términos
const h1 = PPN.homologarTexto('Los vistos buenos (V°B°) serán realizados ... según el POE PDSG-202 vigente.');
ok('PDSG-202 -> PROCEDIMIENTO PDOC-207 y (V°B°)', /SEGUN EL PROCEDIMIENTO PDOC-207/.test(h1.texto) && /\(V°B°\)/.test(h1.texto) && !/[ÁÉÍÓÚ]/.test(h1.texto), h1.texto);
const h1b = PPN.homologarTexto('LOS VISTOS BUENOS (V°B°) SERAN REALIZADOS Y REGISTRADOS EXCLUSIVAMENTE POR EL JEFE O SUPERVISOR DE SECCION, QUIEN DEBERA REVISAR QUE LA DATA REGISTRADA SEA CONTEMPORANEA SEGUN EL PROCEDIMIENTO PDOC-207 VIGENTE.');
ok('nota V°B° vigente (186337) sin términos por homologar', h1b.reglas.length === 0, h1b.reglas.join(' | '));
ok('POE PDOC-207 y (VB) -> PROCEDIMIENTO y (V°B°)', /\(V°B°\).*PROCEDIMIENTO PDOC-207/.test(PPN.homologarTexto('LOS VISTOS BUENOS (VB) ... SEGUN EL POE PDOC-207 VIGENTE.').texto));
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

// v1.148.0 (pedido de Carlos): POE -> PROCEDIMIENTO, VIGENTE / VIGENTES, y seleccionar el paso ya creado con el texto sugerido
{
  const H = (t) => PPN.homologarTexto(t).texto;
  ok('POE -> PROCEDIMIENTO', H('REALIZAR EL DESPEJE DE LA SALA SEGUN POE PPRO-219 VIGENTE.') === 'REALIZAR EL DESPEJE DE LA SALA SEGUN PROCEDIMIENTO PPRO-219 VIGENTE.');
  ok('un documento: VIGENTE', H('SEGUN PPRO-200.') === 'SEGUN PROCEDIMIENTO PPRO-200 VIGENTE.', H('SEGUN PPRO-200.'));
  ok('dos documentos del mismo tipo: INSTRUCTIVOS', H('SELLADO SEGUN IPRO-I200 E IPRO-P213.') === 'SELLADO SEGUN INSTRUCTIVOS IPRO-I200 E IPRO-P213 VIGENTES.', H('SELLADO SEGUN IPRO-I200 E IPRO-P213.'));
  ok('varios documentos: VIGENTES al final', H('SEGUN POE PPRO-217 VIGENTE E INSTRUCTIVO IPRO-P256 VIGENTE.') === 'SEGUN PROCEDIMIENTO PPRO-217 E INSTRUCTIVO IPRO-P256 VIGENTES.', H('SEGUN POE PPRO-217 VIGENTE E INSTRUCTIVO IPRO-P256 VIGENTE.'));
  ok('un documento con VIGENTES -> VIGENTE', H('SEGUN LO INDICADO EN EL INSTRUCTIVO IPRO-P261 VIGENTES.') === 'SEGUN LO INDICADO EN EL INSTRUCTIVO IPRO-P261 VIGENTE.');
  const ya = 'PREPARAR EL SISTEMA DE FILTRACION, SEGUN INSTRUCTIVOS IPRO-P204, IPRO-E205 E IPRO-E206 VIGENTES.';
  ok('ya homologado: sin reglas', PPN.homologarTexto(ya).reglas.length === 0 && H(ya) === ya);
  const bus = PPN.crearBuscador([{ codigo: '125954', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN PROCEDIMIENTO PPRO-219 VIGENTE.', estr: 'E', etq: null, tipo: 439 }]);
  const tr = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [{ id: 'h1', codigo: null, nuevo: true, texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN POE PPRO-219 VIGENTE.', tipo: 439, pm: [] }] }] };
  const av = PPN.avisos(tr, { buscador: bus }).get('h1') || [], t = av.find((x) => x.k === 'terminos');
  ok('paso ya creado con el texto sugerido: ofrece seleccionarlo', t && t.usar === '125954' && /ya existe el paso 125954/.test(t.texto), JSON.stringify(av));
  const bus2 = PPN.crearBuscador([
    { codigo: '500', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN PROCEDIMIENTO PPRO-219 VIGENTE', estr: 'E', etq: null, tipo: 439 },
    { codigo: '501', texto: 'REALIZAR EL DESPEJE DE LA SALA, SEGUN PROCEDIMIENTO PPRO-219 VIGENTE.', estr: 'E', etq: null, tipo: 439 },
    { codigo: '502', texto: 'LIMPIAR LA BALANZA.', estr: 'E', etq: null, tipo: 439 },
    { codigo: '503', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN POE PPRO-219 VIGENTE.', estr: 'E', etq: null, tipo: 439 },
    { codigo: '504', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN PROCEDIMIENTO PPRO-218 VIGENTE.', estr: 'E', etq: null, tipo: 439 }]);
  const av2 = PPN.avisos(tr, { buscador: bus2 }).get('h1') || [], t2 = av2.find((x) => x.k === 'terminos');
  ok('varios parecidos: el aviso trae las opciones para ordenarlas por uso', t2 && Array.isArray(t2.opciones) && t2.opciones.includes('500') && t2.opciones.includes('501') && !t2.opciones.includes('502'), JSON.stringify(av2));
  ok('no ofrece pasos sin homologar (POE) ni que citan otro documento', t2 && !t2.opciones.includes('503') && !t2.opciones.includes('504'), JSON.stringify(t2));
  ok('«ya existe» solo con el texto exacto, puntuación incluida', t2 && t2.usar === undefined && /parecidos/.test(t2.texto), JSON.stringify(t2));
  // v1.148.2 (pedido de Carlos, caso 4.4.16 de ENVASE): con pasos de texto idéntico solo se ofrecen esos; la otra sala no
  const SUG = 'EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA DE ENVASE Y REALIZA EL MUESTREO PARA LOS ANALISIS CORRESPONDIENTES SEGUN PROCEDIMIENTO PCPR-202 VIGENTE.';
  const bus3 = PPN.crearBuscador([
    { codigo: '182861', texto: SUG.replace('ENVASE', 'FABRICACION').replace('SEGUN PROC', 'SEGUN EL PROC'), estr: 'E', etq: null, tipo: 446 },
    { codigo: '186339', texto: SUG, estr: 'E', etq: null, tipo: 446 },
    { codigo: '186440', texto: SUG, estr: 'E', etq: null, tipo: 446 }]);
  const tr3 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [{ id: 'c1', codigo: null, nuevo: true, texto: SUG.replace('SEGUN PROCEDIMIENTO', 'SEGUN POE'), tipo: 446, pm: [] }] }] };
  const t3 = (PPN.avisos(tr3, { buscador: bus3 }).get('c1') || []).find((x) => x.k === 'terminos');
  ok('texto idéntico: solo los idénticos, marcados como exactos', t3 && t3.exactos === true && t3.opciones.join() === '186339,186440' && /ya existen 2 pasos/.test(t3.texto), JSON.stringify(t3));
}
console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
