// Pruebas de la v1.146.0: repetidos como incoherencias y reglas de Carlos (nota del supervisor, Calidad en Operaciones, punto de muestreo).
// Núcleo del borrador / Edición rápida (ppNucleo) y la regla de palabras del portal. Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_repetidos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const a = fuente.indexOf('  function ppNucleo() {'), b = fuente.indexOf('  const PPN = ppNucleo();');
if (a < 0 || b < a) throw new Error('no encuentro ppNucleo');
const PPN = new Function(fuente.slice(a, b) + '\nreturn ppNucleo();')();
// palabrasRepetidas del portal (misma regla que el núcleo)
const lp = fuente.split('\n').find((l) => l.startsWith('  const palabrasRepetidas = '));
const palabrasPortal = new Function(lp.replace('const palabrasRepetidas = ', 'return ') )();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

for (const f of [PPN.palabrasRepetidas, palabrasPortal]) {
  ok('COINCIDAN COINCIDAN', f('...EN LA QUE FUE ESTERILIZADA COINCIDAN  COINCIDAN CON LA INFORMACION').join() === 'COINCIDAN');
  ok('sin repetidas', f('VERIFICAR QUE EL PRECORTE NO SUPERE LA LINEA DEL SEGUNDO SELLADO.').length === 0);
  ok('no confunde prefijos (LA LAS)', f('LA LAS BOLSAS').length === 0);
  ok('ignora números (03 03) y una letra (A A)', f('03 03 BOLSAS A A').length === 0);
  ok('sin importar tildes ni mayúsculas', f('Información informacion').join() === 'INFORMACION');
}

const NOTA = 'NOTA: EL JEFE O SUPERVISOR DE LA SECCION DEBE VERIFICAR PRESENCIALMENTE LA ACTIVIDAD U OPERACION REALIZADA.';
const PRE = '- VERIFICAR QUE EL PRECORTE NO SUPERE LA LINEA DEL SEGUNDO SELLADO.';
const trabajo = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [
  { id: 'p13', codigo: '100', texto: 'TRASLADAR EL PRODUCTO AUTOCLAVADO A LA LINEA DE TRABAJO.', tipo: 441, rpor: true, vb: true, pm: [{ id: 'm13', codigo: '9', texto: NOTA }] },
  { id: 'p14', codigo: '101', texto: 'DURANTE EL PROCESO DE DESCARGA DE BOLSAS, SE LLEVARA ACABO LAS SIGUIENTES ACTIVIDADES:', tipo: 441, rpor: true, vb: true, pm: [
    { id: 'm1', codigo: '1', texto: '- REALIZAR EL PRECORTE' }, { id: 'm2', codigo: '2', texto: PRE }, { id: 'm3', codigo: '2', texto: PRE }, { id: 'm4', codigo: '9', texto: NOTA }] },
  { id: 'p17', codigo: '102', texto: 'EMBOLSADO:', tipo: 446, pm: [{ id: 'm5', codigo: '5', texto: 'NOTA: VERIFICAR QUE EL NUMERO DE CARGA COINCIDAN COINCIDAN CON LA INFORMACION.' }] },
  { id: 'p32', codigo: '103', texto: 'REALIZAR EL DESPEJE DE LA SALA SEGUN IPRO-P212 VIGENTE.', tipo: 439, rpor: true, vb: false, pm: [{ id: 'm6', codigo: '9', texto: NOTA }] },
  { id: 'p33', codigo: '104', texto: 'SELLAR LAS CAJAS.', tipo: 439, rpor: true, vb: false, pm: [] },
  { id: 'p34', codigo: '105', texto: 'SELLAR LAS CAJAS', tipo: 439, rpor: true, vb: false, pm: [] },
  { id: 'p40', codigo: '182861', texto: 'EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA Y REALIZA EL MUESTREO.', tipo: 439, rpor: true, pm: [
    { id: 'm7', codigo: '186382', texto: 'TOMAR LA MUESTRA DESDE LA VALVULA DE DESCARGA.', dt: { tipo: 432, edit: true, cc: true } },
    { id: 'm11', codigo: '180904', texto: 'EL JEFE O SUPERVISOR DE LA SECCION VERIFICA EL PROCESO DE MUESTREO DE CALIDAD EN OPERACIONES.', dt: { tipo: 437, edit: true, cc: false } }] },
  { id: 'p41', codigo: '180901', texto: 'CALIDAD EN OPERACIONES REGISTRA LOS RESULTADOS:', tipo: 446, pm: [
    { id: 'm8', codigo: '186383', texto: 'DESCRIPCION (ASPECTO): MASA DE COLOR BLANCO.', dt: { tipo: 433, edit: true, cc: false } },
    { id: 'm9', codigo: '162821', texto: 'VERIFICADO POR:', dt: { tipo: 433, edit: false, cc: true } },
    { id: 'm10', codigo: '179616', texto: 'FECHA / HORA DE VERIFICACION:', dt: { tipo: 436, edit: true, cc: true } }] },
] }] };
const av = PPN.avisos(trabajo, { dt: true }), txt = (id) => (av.get(id) || []).map((x) => x.texto).join(' | ');
const tiene = (id, rx) => rx.test(txt(id));

ok('proceso menor repetido (2.º PRECORTE)', tiene('m3', /Proceso menor repetido/), txt('m3'));
ok('el primero no se marca', !tiene('m2', /repetido/), txt('m2'));
ok('palabra repetida en la nota del 4.4.17', tiene('m5', /Palabra repetida seguida \(COINCIDAN COINCIDAN\)/), txt('m5'));
ok('paso repetido seguido (sin importar el punto final)', tiene('p34', /Paso repetido/), txt('p34'));
ok('nota del supervisor con 441 y V.B.: sin aviso', !tiene('m13', /nota/i) && !tiene('m4', /nota «EL JEFE/), txt('m4'));
ok('nota del supervisor en paso sin V.B. (Realizado por): aviso', tiene('m6', /no lleva la nota «EL JEFE O SUPERVISOR/), txt('m6'));
ok('Calidad en Operaciones: DESCRIPCION sin Estado CC', tiene('m8', /marca «Estado CC»/), txt('m8'));
ok('Calidad en Operaciones: VERIFICADO POR sin Edit', tiene('m9', /marca «Edit»/), txt('m9'));
ok('Calidad en Operaciones completo: sin aviso', !tiene('m10', /Calidad en Operaciones/), txt('m10'));
ok('v1.147.1: verificacion del jefe o supervisor (Produccion) en paso de Calidad en Operaciones: sin Estado CC', !tiene('m11', /Estado CC/), txt('m11'));
// v1.147.1: lo mismo en la ventana de Procesos menores del portal (reglasDeFila)
{
  const i = fuente.indexOf('  const CHK = ['), j = fuente.indexOf('  function reglasDeFila(f) {');
  const k = fuente.indexOf('\n  }\n', j) + 4;
  ok('encuentro reglasDeFila del portal', i > 0 && j > i);
  if (i > 0 && j > i) {
    let reglas = null;
    try { reglas = new Function('norm', 'on', 'SIN_ACENTOS', fuente.slice(i, k) + '\nreturn reglasDeFila;')((t) => (t || '').replace(/\s+/g, ' ').trim(), () => false, (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')); } catch (e) { ok('cargar reglasDeFila del portal', false, e.message); }
    if (reglas) {
      const padre = 'EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA DE FABRICACION Y REALIZA EL MUESTREO PARA LOS ANALISIS CORRESPONDIENTES';
      const sup = reglas({ esPM: true, padre, tipo: 'Verificación Check', desc: 'EL JEFE O SUPERVISOR DE LA SECCION VERIFICA EL PROCESO DE MUESTREO DE CALIDAD EN OPERACIONES.', chk: { 'EDIT': true, 'ESTADO CC': false } });
      ok('portal: 180904 jefe o supervisor no pide Estado CC', !sup.some((x) => x.col === 'ESTADO CC'), JSON.stringify(sup));
      const cant = reglas({ esPM: true, padre, tipo: 'Números', desc: 'CANTIDAD MUESTREADA (kg):', chk: { 'EDIT': true, 'ESTADO CC': false } });
      ok('portal: CANTIDAD MUESTREADA sigue pidiendo Estado CC', cant.some((x) => x.col === 'ESTADO CC'), JSON.stringify(cant));
    }
  }
}
// v1.147.1 (regla de Carlos): «Realizado por y Visto bueno» con R. Por y V.B. lleva la nota del supervisor como ÚLTIMO proceso menor
{
  const NOTA_FIN = 'NOTA: EL JEFE O SUPERVISOR DE LA SECCION DEBE VERIFICAR PRESENCIALMENTE LA ACTIVIDAD U OPERACION REALIZADA.';
  const t2 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [
    { id: 'q1', codigo: '117343', texto: 'DESCARGAR EL PRODUCTO, FILTRANDO POR MALLA ORGANDI.', tipo: 441, rpor: true, vb: true, pm: [] },
    { id: 'q2', codigo: '200', texto: 'PESAR EL PRODUCTO.', tipo: 441, rpor: true, vb: true, pm: [{ id: 'n1', codigo: '9', texto: NOTA_FIN }, { id: 'n2', codigo: '10', texto: 'PESO (kg):' }] },
    { id: 'q3', codigo: '201', texto: 'TAMIZAR EL PRODUCTO.', tipo: 441, rpor: true, vb: true, pm: [{ id: 'n3', codigo: '10', texto: 'PESO (kg):' }, { id: 'n4', codigo: '9', texto: NOTA_FIN }] },
    { id: 'q4', codigo: '202', texto: 'LIMPIAR LA SALA.', tipo: 441, rpor: true, vb: false, pm: [] },
    { id: 'q5', codigo: '203', texto: 'MEZCLAR EL PRODUCTO.', tipo: 439, rpor: true, pm: [] },
  ] }] };
  const bus = PPN.crearBuscador([{ codigo: '9', texto: NOTA_FIN, estr: 'E', etq: null, tipo: 446 }, { codigo: '10', texto: 'PESO (kg):', estr: 'E', etq: null, tipo: 438 }]);
  const av2 = PPN.avisos(t2, { buscador: bus }), l2 = (id) => av2.get(id) || [], tx2 = (id) => l2(id).map((x) => x.texto).join(' | ');
  ok('nota obligatoria: falta en el paso 117343 (441 con R. Por y V.B.)', /falta la nota/.test(tx2('q1')), tx2('q1'));
  ok('nota obligatoria: ofrece agregar el proceso menor del catálogo', l2('q1').some((x) => x.agregar === '9'), JSON.stringify(l2('q1')));
  ok('nota obligatoria: no es la última -> moverla al final', /muévela al final/.test(tx2('n1')) && l2('n1').some((x) => x.alFinal), tx2('n1'));
  ok('nota obligatoria: al final, sin aviso', !/falta la nota|muévela/.test(tx2('q3') + tx2('n4')), tx2('q3') + tx2('n4'));
  ok('nota obligatoria: sin V.B. o con otro tipo no se pide', !/falta la nota/.test(tx2('q4') + tx2('q5')), tx2('q4') + tx2('q5'));
}
ok('TOMAR LA MUESTRA DESDE con tipo: Sin tipo de dato', tiene('m7', /Sin tipo de dato/), txt('m7'));
ok('los repetidos llegan a Producción (k dup)', (av.get('m3') || []).some((x) => x.k === 'dup'));

// v1.146.1: un grupo que se repite por equipo (SELLADORA N° 5 / N° 06: VELOCIDAD, VACIO, SELLADO) no es repetido; solo el igual al inmediatamente anterior
const t3 = { estructuras: [{ estructuraId: 'E', pasos: [{ id: 's', codigo: '1', texto: 'SELLADO AL VACIO:', tipo: 446, pm: ['SELLADORA AL VACIO N° 5', 'VELOCIDAD:', 'VACIO:', 'SELLADO:', 'SELLADORA AL VACIO N°06', 'VELOCIDAD:', 'VACIO:', 'SELLADO:'].map((t, i) => ({ id: 'g' + i, codigo: String(100 + i), texto: t })) }] }] };
const av3 = PPN.avisos(t3, {});
ok('grupo repetido por equipo: sin «Proceso menor repetido»', ![...av3.values()].flat().some((x) => /Proceso menor repetido/.test(x.texto)), JSON.stringify([...av3]));

// copias de lote (duplicar un lote) no son repetidos
const t2 = { estructuras: [{ estructuraId: 'E', pasos: [{ id: 'a', codigo: '1', texto: 'PESAR', tipo: 438, pm: [] }, { id: 'b', codigo: '1', texto: 'PESAR', tipo: 438, copiaDe: 'a', pm: [] }] }] };
ok('copia de lote no se marca como repetido', !/Paso repetido/.test(((PPN.avisos(t2, {}).get('b')) || []).map((x) => x.texto).join()));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
