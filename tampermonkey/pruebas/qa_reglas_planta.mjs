// Pruebas de la v1.164.0: reglas de revisión separadas por planta (pedido de Carlos, 28/11), sacadas de 263 autorizados desde el 15/10.
// Núcleo de la Edición rápida / borrador (ppNucleo) y reglasDeFila del portal. Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_reglas_planta.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const a = fuente.indexOf('  function ppNucleo() {'), b = fuente.indexOf('  const PPN = ppNucleo();');
const PPN = new Function(fuente.slice(a, b) + '\nreturn ppNucleo();')();
let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

// ---- portal: reglasDeFila ----
const i = fuente.indexOf('  const CHK = ['), j = fuente.indexOf('  function reglasDeFila(f) {'), k = fuente.indexOf('\n  }\n', j) + 4;
const SA = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ctxPortal = new Function('norm', 'on', 'SIN_ACENTOS', 'PPN', fuente.slice(i, k) + '\nreturn { reglasDeFila, plantaDe, esNotaCierre, REGLAS_PLANTA };')((t) => (t || '').replace(/\s+/g, ' ').trim(), () => false, SA, PPN);
const { reglasDeFila, plantaDe, esNotaCierre, REGLAS_PLANTA } = ctxPortal;
ok('plantaDe: PLANTA ATE / PLANTA LIMA / P1 / vacío', plantaDe('PLANTA ATE') === 'ATE' && plantaDe('PLANTA LIMA') === 'LIMA' && plantaDe('P1') === 'ATE' && plantaDe('') === '');
const rend = (planta, edit) => reglasDeFila({ esPM: false, tipo: 'Fórmula', desc: 'CALCULO DE RENDIMIENTO (%):\n\n', chk: { 'EDIT': edit, 'R. POR': false, 'V.B.': false, 'ESTADO CC': false }, planta });
ok('ATE: rendimiento sin Edit = sin aviso', !rend('PLANTA ATE', false).some((x) => x.col === 'EDIT'), JSON.stringify(rend('PLANTA ATE', false)));
ok('ATE: rendimiento con Edit = desmarcar', rend('PLANTA ATE', true).some((x) => x.col === 'EDIT' && x.clase === 'rmd-desmarcar'));
ok('LIMA: rendimiento sin Edit = marcar', rend('PLANTA LIMA', false).some((x) => x.col === 'EDIT' && x.clase === 'rmd-marcar'));
ok('sin planta: como siempre (pide Edit)', rend('', false).some((x) => x.col === 'EDIT'));
const otraFx = reglasDeFila({ esPM: false, tipo: 'Fórmula', desc: 'RENDIMIENTO TEORICO (kg):', chk: { 'EDIT': false }, planta: 'PLANTA ATE' });
ok('ATE: otra fórmula sigue pidiendo Edit', otraFx.some((x) => x.col === 'EDIT'));
const contra = reglasDeFila({ esPM: true, tipo: 'Números', desc: 'CONTRAMUESTRA (kg):', chk: { 'EDIT': true }, planta: 'PLANTA LIMA' });
ok('CONTRAMUESTRA: debe decir CANTIDAD MUESTREADA', contra.some((x) => /CANTIDAD MUESTREADA/.test(x.msg) && /CONTRAMUESTRA/.test(x.msg)), JSON.stringify(contra));
const NOTA = 'NOTA: EL JEFE O SUPERVISOR DE LA SECCION DEBE VERIFICAR PRESENCIALMENTE LA ACTIVIDAD U OPERACION REALIZADA.';
const ESPEC = 'NOTA: EL JEFE O SUPERVISOR DE LA SECCION DEBE VERIFICAR EL RETIRO DE TODO EL MATERIAL DEL LOTE ANTERIOR.';
const clave = (t) => SA(t).replace(/[^A-Z0-9Ñ%°]+/g, ' ').trim();
ok('nota genérica cierra en las dos plantas', esNotaCierre(clave(NOTA), 'ATE') && esNotaCierre(clave(NOTA), 'LIMA') && esNotaCierre(clave(NOTA), ''));
ok('nota específica del jefe: cierra en ATE', esNotaCierre(clave(ESPEC), 'ATE'));
ok('nota específica del jefe: no cierra en LIMA', !esNotaCierre(clave(ESPEC), 'LIMA'));
ok('lista de reglas por planta para la ventana', REGLAS_PLANTA.ATE.length >= 4 && REGLAS_PLANTA.LIMA.length >= 4 && REGLAS_PLANTA.AMBAS.length >= 3);

// ---- núcleo: Edición rápida / borrador ----
const e = (pasos) => ({ estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos }] });
const tx = (av, id) => (av.get(id) || []).map((x) => `[${x.nivel}] ${x.texto}`).join(' | ');
// nota de cierre
const t1 = e([{ id: 'p1', codigo: '1', texto: 'RETIRAR EL MATERIAL.', tipo: 441, rpor: true, vb: true, pm: [{ id: 'm1', codigo: '2', texto: 'PESO (kg):' }, { id: 'm2', codigo: '3', texto: ESPEC }] }]);
ok('núcleo ATE: nota específica al final = sin aviso', !/falta la nota|muévela/.test(tx(PPN.avisos(t1, { planta: 'PLANTA ATE' }), 'p1')), tx(PPN.avisos(t1, { planta: 'PLANTA ATE' }), 'p1'));
ok('núcleo LIMA: nota específica no basta = falta la genérica', /falta la nota/.test(tx(PPN.avisos(t1, { planta: 'PLANTA LIMA' }), 'p1')));
const t1b = e([{ id: 'p1', codigo: '1', texto: 'RETIRAR EL MATERIAL.', tipo: 441, rpor: true, vb: true, pm: [{ id: 'm2', codigo: '3', texto: ESPEC }, { id: 'm1', codigo: '2', texto: 'PESO (kg):' }] }]);
const a1b = PPN.avisos(t1b, { planta: 'PLANTA ATE' });
ok('núcleo ATE: nota específica que no es la última = moverla', /muévela al final/.test(tx(a1b, 'm2')) && (a1b.get('m2') || []).some((x) => x.alFinal), tx(a1b, 'm2'));
// rendimiento (vista completa)
const t2 = { estructuras: [{ estructuraId: 'R', nombre: '4.5.- RENDIMIENTO', pasos: [{ id: 'r1', codigo: '9', texto: 'CALCULO DE RENDIMIENTO (%):', tipo: 445, dt: { tipo: 445, dec: 3, edit: false }, pm: [] }, { id: 'r2', codigo: '10', texto: 'CALCULO DE RENDIMIENTO (%):', tipo: 445, dt: { tipo: 445, dec: 3, edit: true }, pm: [] }] }] };
const a2a = PPN.avisos(t2, { dt: true, planta: 'PLANTA ATE' }), a2l = PPN.avisos(t2, { dt: true, planta: 'PLANTA LIMA' });
ok('núcleo ATE: rendimiento sin Edit = sin aviso de Edit', !/Edit/.test(tx(a2a, 'r1')), tx(a2a, 'r1'));
ok('núcleo ATE: rendimiento con Edit = aviso', /va sin «Edit»/.test(tx(a2a, 'r2')), tx(a2a, 'r2'));
ok('núcleo LIMA: rendimiento sin Edit = suele llevar Edit', /suele llevar «Edit»/.test(tx(a2l, 'r1')), tx(a2l, 'r1'));
// predecesor del primero de la lista
const t3 = { estructuras: [{ estructuraId: 'E', nombre: '4.4.- PROCEDIMIENTO', pasos: [], etiquetas: [
  { etiquetaId: 'T1', nombre: 'DOCUMENTACION', orden: 1, pasos: [{ id: 'a1', codigo: '1', texto: 'VERIFICAR LA ORDEN.', tipo: 439, dt: { tipo: 439 }, rpor: true, pm: [] }] },
  { etiquetaId: 'T2', nombre: 'ACONDICIONADO', orden: 2, pasos: [{ id: 'b1', codigo: '2', texto: 'FECHA / HORA INICIO:', tipo: 432, dt: { tipo: 432, edit: true }, pm: [] }] }] }] };
const a3a = PPN.avisos(t3, { dt: true, planta: 'PLANTA ATE' }), a3l = PPN.avisos(t3, { dt: true, planta: 'PLANTA LIMA' });
ok('núcleo ATE: FECHA / HORA INICIO primero de la lista sin predecesor = sin aviso', !/predecesor/.test(tx(a3a, 'b1')), tx(a3a, 'b1'));
ok('núcleo LIMA: el primero de la lista sin predecesor = aviso', /En LIMA todo paso con tipo de dato lleva predecesor/.test(tx(a3l, 'b1')), tx(a3l, 'b1'));
ok('núcleo LIMA: el primer paso de toda la estructura no se pide', !/predecesor/.test(tx(a3l, 'a1')), tx(a3l, 'a1'));
// homologación de términos: ATE informativa, LIMA aviso
const t4 = e([{ id: 'h1', codigo: '50', texto: 'REALIZAR EL DESPEJE DE LINEA SEGUN POE PPRO-219 VIGENTE.', tipo: 439, rpor: true, pm: [] },
  { id: 'h2', codigo: '51', texto: 'REGISTRAR LA CONTRAMUESTRA (kg):', tipo: 438, pm: [] }]);
const a4a = PPN.avisos(t4, { planta: 'PLANTA ATE', etapa: 'ACONDICIONADO' }), a4l = PPN.avisos(t4, { planta: 'PLANTA LIMA', etapa: 'ACONDICIONADO' });
const nivel = (av, id, rx) => ((av.get(id) || []).find((x) => rx.test(x.texto)) || {}).nivel;
ok('ATE: POE -> PROCEDIMIENTO solo informativo', nivel(a4a, 'h1', /Términos por homologar/) === 'info', tx(a4a, 'h1'));
ok('LIMA: POE -> PROCEDIMIENTO es aviso', nivel(a4l, 'h1', /Términos por homologar/) === 'aviso', tx(a4l, 'h1'));
ok('ATE: CONTRAMUESTRA sigue como aviso', nivel(a4a, 'h2', /Términos por homologar/) === 'aviso', tx(a4a, 'h2'));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
