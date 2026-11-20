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
  ok('parecidos con otro texto: no se ofrecen (solo exactamente iguales)', t2 && !t2.usar && !t2.opciones && /no hay un paso con ese texto exacto/.test(t2.texto), JSON.stringify(t2));
  // v1.148.2 (pedido de Carlos, caso 4.4.16 de ENVASE): con pasos de texto idéntico solo se ofrecen esos; la otra sala no
  const SUG = 'EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA DE ENVASE Y REALIZA EL MUESTREO PARA LOS ANALISIS CORRESPONDIENTES SEGUN PROCEDIMIENTO PCPR-202 VIGENTE.';
  const bus3 = PPN.crearBuscador([
    { codigo: '182861', texto: SUG.replace('ENVASE', 'FABRICACION').replace('SEGUN PROC', 'SEGUN EL PROC'), estr: 'E', etq: null, tipo: 446 },
    { codigo: '186339', texto: SUG, estr: 'E', etq: null, tipo: 446 },
    { codigo: '186440', texto: SUG, estr: 'E', etq: null, tipo: 446 }]);
  const tr3 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [{ id: 'c1', codigo: null, nuevo: true, texto: SUG.replace('SEGUN PROCEDIMIENTO', 'SEGUN POE'), tipo: 446, pm: [] }] }] };
  const t3 = (PPN.avisos(tr3, { buscador: bus3 }).get('c1') || []).find((x) => x.k === 'terminos');
  const bus4 = PPN.crearBuscador([{ codigo: '186339', texto: SUG, estr: 'E', etq: 'ENV', tipo: 446 }, { codigo: '186440', texto: SUG, estr: 'E', etq: 'FAB', tipo: 446 }]);
  const tr4 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [], etiquetas: [{ etiquetaId: 'ENV', pasos: [{ id: 'c2', codigo: null, nuevo: true, texto: tr3.estructuras[0].pasos[0].texto, tipo: 446, pm: [] }] }] }] };
  const t4 = (PPN.avisos(tr4, { buscador: bus4 }).get('c2') || []).find((x) => x.k === 'terminos');
  ok('misma etapa: solo el paso de ENVASE para un paso de ENVASE', t4 && t4.usar === '186339' && !t4.opciones, JSON.stringify(t4));
  const bus5 = PPN.crearBuscador([{ codigo: '161237', texto: 'Verificar los registros de control de balanza segun instructivos IPRO-I202 e IPRO-I200 vigentes.', estr: 'E', etq: null, tipo: 446 }]);
  const tr5 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [{ id: 'c5', codigo: null, nuevo: true, texto: 'VERIFICAR LOS REGISTROS DE CONTROL DE BALANZA SEGUN INSTRUCTIVOS IPRO-I202 E IPRO-I200, VIGENTES.', tipo: 446, pm: [] }] }] };
  const t5 = (PPN.avisos(tr5, { buscador: bus5 }).get('c5') || []).find((x) => x.k === 'terminos');
  ok('mayúsculas: no sugiere el paso en minúsculas', t5 && !t5.usar && !t5.opciones, JSON.stringify(t5));
  ok('buscar con caja: sin el paso en minúsculas', bus5.buscar('VERIFICAR LOS REGISTROS', { caja: true }).length === 0 && bus5.buscar('VERIFICAR LOS REGISTROS', {}).length === 1);
  // tabla de homologación: el vigente de otra etapa se cambia por el del mismo texto de esta etapa (109294 -> 184004 FAB / 184008 ENV)
  const DESP = 'REALIZAR EL DESPEJE DE LA SALA SEGUN INSTRUCTIVO IPRO-P212 VIGENTE.';
  const bus6 = PPN.crearBuscador([{ codigo: '184004', texto: DESP, estr: 'E', etq: 'FAB', tipo: 439 }, { codigo: '184008', texto: DESP, estr: 'E', etq: 'ENV', tipo: 439 }, { codigo: '109294', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN IPRO-P212', estr: 'E', etq: 'ENV', tipo: 439 }]);
  const tr6 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [], etiquetas: [{ etiquetaId: 'ENV', pasos: [{ id: 'c6', codigo: '109294', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN IPRO-P212', tipo: 439, pm: [] }] }] }] };
  const l6 = PPN.avisos(tr6, { buscador: bus6, planta: 'Planta 2' }).get('c6') || [], h6 = l6.find((x) => x.k === 'homolog');
  ok('tabla de homologación: ofrece el paso de la misma etapa (184008), no el de FABRICACION', h6 && h6.usar === '184008' && /184008/.test(h6.texto), JSON.stringify(l6));
  ok('texto idéntico: solo los idénticos, marcados como exactos', t3 && t3.exactos === true && t3.opciones.join() === '186339,186440' && /ya existen 2 pasos/.test(t3.texto), JSON.stringify(t3));
}

// v1.149.0 (CC «MODIFICACION RMD ACO PLANTA 2 - RETIRO DEL PASO: REGISTRAR EN LA SOLAPA CORRESPONDIENTE», pedido de Carlos)
{
  const T = 'CONTAR LAS CAJAS DE LOS CUATRO LADOS POR CADA PISO Y REGISTRAR EN LA SOLAPA CORRESPONDIENTE.', LIMPIO = 'CONTAR LAS CAJAS DE LOS CUATRO LADOS POR CADA PISO.';
  const ACO = { etapa: 'ACONDICIONADO', planta: 'PLANTA LIMA' };
  ok('solapa: ACO LIMA retira la frase', PPN.homologarTexto(T, ACO).texto === LIMPIO, PPN.homologarTexto(T, ACO).texto);
  ok('solapa: sin etapa/planta no se aplica', PPN.homologarTexto(T).reglas.length === 0);
  ok('solapa: ENVASE LIMA no se aplica', PPN.homologarTexto(T, { etapa: 'ENVASE', planta: 'PLANTA LIMA' }).reglas.length === 0);
  ok('solapa: ACO ATE no se aplica', PPN.homologarTexto(T, { etapa: 'ACONDICIONADO', planta: 'PLANTA ATE' }).reglas.length === 0);
  ok('solapa: proceso menor solo queda vacío', PPN.homologarTexto('REGISTRAR EN LA SOLAPA CORRESPONDIENTE', ACO).texto === '');
  ok('solapa: «solo» filtra reglas (VIGENTE no entra)', PPN.homologarTexto('SEGUN PPRO-200 Y REGISTRAR EN LA SOLAPA CORRESPONDIENTE.', { ...ACO, solo: /^solapa/ }).texto === 'SEGUN PPRO-200.');
  const bus = PPN.crearBuscador([{ codigo: '190001', texto: LIMPIO, estr: 'E', etq: 'ACO', tipo: 446 }]);
  const tr = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [], etiquetas: [{ etiquetaId: 'ACO', pasos: [{ id: 'p', codigo: '180000', texto: 'LOS POTES ETIQUETADOS SON RECEPCIONADOS Y ENCAJADOS.', tipo: 439, pm: [
    { id: 'm1', codigo: '180001', texto: T, tipo: 446 }, { id: 'm2', codigo: '180002', texto: 'REGISTRAR EN LA SOLAPA CORRESPONDIENTE.', tipo: 446 }] }] }] }] };
  const av = PPN.avisos(tr, { buscador: bus, ...ACO });
  const m1 = (av.get('m1') || []).find((x) => x.k === 'terminos'), m2 = (av.get('m2') || []).find((x) => x.k === 'retirar');
  ok('solapa: aviso con el paso idéntico 190001', m1 && m1.usar === '190001' && /SOLAPA/.test(m1.texto), JSON.stringify(av.get('m1')));
  ok('solapa: proceso menor solo -> «Por retirar»', m2 && /Por retirar/.test(m2.texto), JSON.stringify(av.get('m2')));
  const av2 = PPN.avisos(tr, { buscador: PPN.crearBuscador([]), ...ACO }), m1b = (av2.get('m1') || []).find((x) => x.k === 'terminos');
  ok('solapa: sin paso idéntico, texto sugerido para el botón', m1b && m1b.sugerido === LIMPIO && !m1b.usar, JSON.stringify(m1b));
  ok('solapa: en Envase no avisa', !(PPN.avisos(tr, { buscador: bus, etapa: 'ENVASE', planta: 'PLANTA LIMA' }).get('m1') || []).some((x) => /SOLAPA/.test(x.texto)));
}
console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
