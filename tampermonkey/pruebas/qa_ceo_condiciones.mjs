// Pruebas de la v1.158.0: los pasos de Calidad en Operaciones dependen del primer paso de CONDICIONES AMBIENTALES (pedido de Carlos).
//     node tampermonkey/pruebas/qa_ceo_condiciones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const a = fuente.indexOf('  function ppNucleo() {'), b = fuente.indexOf('  const PPN = ppNucleo();');
const PPN = new Function(fuente.slice(a, b) + '\nreturn ppNucleo();')();
let fallas = 0;
const ok = (n, c, d = '') => { console.log((c ? 'PASA  ' : 'FALLA ') + n + (c || !d ? '' : ' — ' + d)); if (!c) fallas++; };

const CEO = 'EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA Y REALIZA EL MUESTREO.';
const t = (depCeo, depFijo, idCeo = 'p3') => ({ estructuras: [{ id: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [], etiquetas: [
  { id: 'T1', orden: 1, nombre: 'FABRICACION', pasos: [
    { id: 'ca1', codigo: '51', texto: 'CONDICIONES AMBIENTALES:', tipo: 439, rpor: true, dt: { tipo: 439 } },
    { id: 'x1', codigo: '52', texto: 'VERIFICAR EL DESPEJE DE LINEA.', tipo: 439, rpor: true, dt: { tipo: 439, dep: 'ca1' } }] },
  { id: 'T2', orden: 2, nombre: 'ENVASADO', pasos: [
    { id: 'ca2', codigo: '51', texto: 'CONDICIONES AMBIENTALES:', tipo: 439, rpor: true, dt: { tipo: 439 } },
    { id: 'p1', codigo: '60', texto: 'MEZCLAR EL PRODUCTO.', tipo: 439, rpor: true, dt: { tipo: 439, dep: '' } },
    { id: 'p2', codigo: '61', texto: 'TAMIZAR EL PRODUCTO.', tipo: 439, rpor: true, dt: { tipo: 439, dep: 'p1' } },
    { id: idCeo, codigo: '182861', texto: CEO, tipo: 439, rpor: true, dt: { tipo: 439, dep: depCeo, depFijo } }] }] }] });

const ca = PPN.pasoCondicionesDe(t('p2').estructuras[0]);
ok('El primer paso «CONDICIONES AMBIENTALES» de la estructura (4.4.1)', ca && ca.id === 'ca1', ca && ca.id);
ok('Reconoce el paso de Calidad en Operaciones', PPN.esPasoCeo({ texto: CEO }) && !PPN.esPasoCeo({ texto: 'MEZCLAR EL PRODUCTO.' }));
const l = (tr, id) => PPN.avisos(tr, { dt: true }).get(id) || [];
ok('Sin aviso «debe depender» (Carlos: se pone solo con CJESUSZ)', !l(t('p2'), 'p3').some((x) => x.k === 'ceoca'), JSON.stringify(l(t('p2'), 'p3')));
ok('Depende de CONDICIONES AMBIENTALES: sin aviso de predecesor', !l(t('ca1', true), 'p3').some((x) => /predecesor|Depende/.test(x.texto)), JSON.stringify(l(t('ca1', true), 'p3')));
// lista de cambios que se aplican en SAP (Configurar el RMD / tras el ingreso, solo CJESUSZ)
const sap = (dep) => [{ nombre: 'PROCEDIMIENTO', pasos: [], etiquetas: [
  { nombre: 'FABRICACION', orden: 1, pasos: [{ id: 'ca1', codigo: '159785', texto: 'CONDICIONES AMBIENTALES:', tipo: 440 }, { id: 'x1', codigo: '52', texto: 'MEZCLAR.', tipo: 440, depId: 'ca1' },
    { id: 'c1', codigo: '182861', texto: CEO, tipo: 441, depId: dep }, { id: 'c2', codigo: '180901', texto: 'CALIDAD EN OPERACIONES REGISTRA LOS RESULTADOS.', tipo: 446, depId: '' }] },
  { nombre: 'RENDIMIENTO', orden: 2, pasos: [{ id: 'c3', codigo: '9', texto: CEO, tipo: 441, depId: '' }] }] },
  { nombre: 'PRECAUCIONES', pasos: [{ id: 'c4', codigo: '9', texto: CEO, tipo: 441, depId: '' }], etiquetas: [] }];
const cs = PPN.ceoSinCondiciones(sap('x1'));
ok('Cambia el paso CEO con tipo de dato que depende de otro', cs.length === 1 && cs[0].id === 'c1' && cs[0].ca === 'ca1' && cs[0].caCodigo === '159785', JSON.stringify(cs));
ok('No toca el que ya depende de CONDICIONES AMBIENTALES', PPN.ceoSinCondiciones(sap('ca1')).length === 0);
ok('Solo para CJESUSZ (portal y editor)', /const CEO_CA_USUARIOS = \['CJESUSZ'\]/.test(fuente) && /\['CJESUSZ'\]\.includes\(String\(EMB\.usuario/.test(fuente));
ok('Se aplica al abrir «Configurar el RMD» y tras el ingreso', /aislar\('menuConfigurarCeo'/.test(fuente) && /if \(ceoCaAplica\(\)\) \{ setTxt\(prog/.test(fuente));
console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa'); process.exit(fallas ? 1 : 0);
