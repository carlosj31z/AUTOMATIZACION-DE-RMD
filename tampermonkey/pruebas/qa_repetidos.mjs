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
    { id: 'm7', codigo: '186382', texto: 'TOMAR LA MUESTRA DESDE LA VALVULA DE DESCARGA.', dt: { tipo: 432, edit: true, cc: true } }] },
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
