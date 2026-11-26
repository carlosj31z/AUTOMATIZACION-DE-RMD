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
const av1 = l(t('p2'), 'p3').find((x) => x.k === 'ceoca');
ok('Depende del paso anterior: aviso con el paso de CONDICIONES AMBIENTALES', av1 && av1.ca === 'ca1' && /CONDICIONES AMBIENTALES/.test(av1.texto), JSON.stringify(l(t('p2'), 'p3')));
ok('Depende de CONDICIONES AMBIENTALES: sin aviso de predecesor', !l(t('ca1', true), 'p3').some((x) => x.k === 'ceoca' || /predecesor|Depende/.test(x.texto)), JSON.stringify(l(t('ca1', true), 'p3')));
ok('Paso nuevo sin «Depende» elegido: sin aviso (el ingreso lo pone solo)', !l(t('', false, 'n:1'), 'n:1').some((x) => x.k === 'ceoca'));
ok('Sin paso de CONDICIONES AMBIENTALES: no avisa', (() => { const tr = t('p2'); tr.estructuras[0].etiquetas.forEach((t) => { t.pasos = t.pasos.filter((x) => !/^CONDICIONES/.test(x.texto)); }); return !l(tr, 'p3').some((x) => x.k === 'ceoca'); })());
ok('El ingreso pone el predecesor a los pasos nuevos de Calidad en Operaciones', /PPN\.pasoCondicionesDe\(s\.L\.e\), caD = /.test(fuente));
ok('El editor sugiere CONDICIONES AMBIENTALES como «Depende»', /PPN\.esPasoCeo\(r\.p\)\) \{ const ca = PPN\.pasoCondicionesDe\(r\.e\)/.test(fuente));
console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa'); process.exit(fallas ? 1 : 0);
