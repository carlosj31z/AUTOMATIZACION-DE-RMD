// Pruebas del ingreso del borrador con fórmulas (v1.137.0, pedido de Carlos: «no permitas que haya error en los pasos 4.5.1 en adelante»):
// los términos de MD_ES_FORMULA_PASO siguen al paso que cambia de código, un paso que usa una fórmula queda numérico (nunca Texto),
// la fórmula queda «Fórmula», no se quita un paso que usa una fórmula y los términos con código viejo se corrigen.
// Sin portal ni navegador: solo Node 18+ (SAP simulado).
//     node tampermonkey/pruebas/qa_formulas_ingreso.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const corte = (a, b) => { const i = fuente.indexOf(a), j = fuente.indexOf(b, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return fuente.slice(i, j); };
const PPN = new Function(corte('  function ppNucleo() {', '  const PPN = ppNucleo();') + '\nreturn ppNucleo();')();
const region = corte('  function ppItemDe(arbol, id) {', '  async function ppVerificarIngreso(');
const ejecutar = corte('  async function ppEjecutarIngreso(', '  // Deshacer: inversas');

// SAP simulado
const BD = { PASO: [], MD_ES_PASO: [], MD_ES_FORMULA_PASO: [], MD_ES_RE_INSUMO: [] };
const coincide = (r, f) => { if (!f) return true; if (f.filters) return f.and === false ? f.filters.some((y) => coincide(r, y)) : f.filters.every((y) => coincide(r, y)); return String(r[f.path]) === String(f.value); };
function Filter(a, op, v) { if (typeof a === 'object') { this.filters = a.filters; this.and = a.and; } else { this.path = a; this.op = op; this.value = v; } }
const escritas = [];
const modelo = { read: (ruta, o) => o.success({ results: (BD[ruta.slice(1)] || []).filter((r) => (o.filters || []).every((f) => coincide(r, f))) }), callFunction: (u, o) => o.success({ obtenerCodigoCorrelativo: '777001' }) };
const stubs = {
  PPN, on: () => false, sap: { ui: { require: () => Filter, model: { Filter, FilterOperator: {} } } },
  leerTodoDe: async (m, ent, filtros) => (BD[ent] || []).filter((r) => (filtros || []).every((f) => coincide(r, f))),
  leerPorIds: async (m, ent, campo, ids) => (BD[ent] || []).filter((r) => ids.includes(r[campo])),
  nombresEtiqueta: async () => new Map(), etiquetaChoca: () => false, usuarioVisible: (u) => u, norm: (t) => (t || '').replace(/\s+/g, ' ').trim(),
  document: { addEventListener() {}, querySelectorAll: () => [] }, ppLimpio: (t) => String(t == null ? '' : t).trim(), ppNulo: (v) => (v == null || v === '' ? null : v), window: { crypto: null, __rmdStats: {} },
  modeloEscribir: async (m, tipo, ruta, datos) => { escritas.push({ tipo, ruta, datos }); },
};
// lo que no está simulado (página, ventanas) es una función vacía; los globales de JavaScript se usan tal cual
const vacio = new Proxy(function () {}, { get: (f, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : vacio), apply: () => vacio, set: () => true });
const scope = new Proxy(stubs, { has: (o, k) => typeof k === 'string' && (k in o || !(k in globalThis)), get: (o, k) => (typeof k === 'symbol' ? undefined : k in o ? o[k] : vacio) });
const mod = new Function('scope', `with (scope) { ${region}\n${ejecutar}\n return { ppPlanEscritura, ppEjecutarIngreso }; }`)(scope);

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const dt = (tipo, dec = '3') => ({ tipo, dec, edit: true, cc: false, mov: false, genpp: false, color: null, clv: null, puesto: null, pmop: false, dep: '', depTxt: '' });

// RMD: FABRICACION (4.4.1 con un insumo y un proceso menor de peso), RENDIMIENTO 4.5.1 – 4.5.5
const fab = [
  { id: 'f1', pasoId: 'P100', codigo: '100', texto: 'PESAR EL GRANEL:', orden: 1, tipo: 446, dt: dt(446, '0'), pm: [
    { id: 'm1', pasoId: 'P200', codigo: '200', texto: 'PESO DEL GRANEL (kg):', orden: 1, tipo: 438, dt: dt(438) },
    { id: 'm2', codigo: null, texto: 'ALCOHOL ETILICO', insumo: true, comp: '1000000902', cant: '6.000', um: 'L', orden: 2, tipo: 438, insId: 'R1' }] },
  { id: 'f2', pasoId: 'P101', codigo: '101', texto: 'TARA DEL ENVASE (kg):', orden: 2, tipo: 433, dt: dt(433, '0'), pm: [] },
];
const ren = [
  { id: 'r1', pasoId: 'P5533', codigo: '5533', texto: 'CANTIDAD TEORICA (kg):', orden: 1, tipo: 445, dt: dt(445), pm: [] },
  { id: 'r2', pasoId: 'P181147', codigo: '181147', texto: 'CANTIDAD MUESTREADA (kg):', orden: 2, tipo: 448, dt: dt(448), pm: [] },
  { id: 'r3', pasoId: 'P5218', codigo: '5218', texto: 'CANTIDAD ENTREGADA (kg) :', orden: 3, tipo: 450, dt: dt(450), pm: [] },
  { id: 'r4', pasoId: 'P5275', codigo: '5275', texto: 'CANTIDAD OBTENIDA (kg) (4.5.2 + 4.5.3):', orden: 4, tipo: 445, dt: dt(445), pm: [] },
  { id: 'r5', pasoId: 'P17840', codigo: '17840', texto: 'MERMA DE FABRICACION (kg) (4.5.1 - 4.5.4):', orden: 5, tipo: 445, dt: dt(445), pm: [] },
];
const arbol = () => ({ estructuras: [{ id: 'E', estructuraId: 'EP', nombre: 'PROCEDIMIENTO', tipo: 487, pasos: [], equipos: [], utensilios: [], insumos: [], espec: [], etiquetas: [
  { id: 'T4', etiquetaId: 'ET4', nombre: 'FABRICACION', pasos: JSON.parse(JSON.stringify(fab)) }, { id: 'T5', etiquetaId: 'ET5', nombre: 'RENDIMIENTO', pasos: JSON.parse(JSON.stringify(ren)) }] }] });
let k = 0; const t = (padre, orden, valor, fila, pm) => ({ mdFormulaPaso: 'FX' + (++k), pasoPadreId_mdEstructuraPasoId: padre, orden, activo: true, esPaso: !!fila, bFlagPM: !!pm, valor, pasoFormulaId_mdEstructuraPasoId: pm ? null : fila || null, pasoFormulaIdPM_mdEstructuraPasoInsumoPasoId: pm ? fila : null });
BD.MD_ES_FORMULA_PASO = [
  t('r1', 1, '200', 'm1', true), t('r1', 2, '+'), t('r1', 3, '101', 'f2'), t('r1', 4, '+'), t('r1', 5, null, 'm2', true),   // 4.5.1 = peso + tara + insumo
  t('r4', 1, '181147', 'r2'), t('r4', 2, '+'), t('r4', 3, '9999', 'r3'),                                                    // 4.5.4 = 4.5.2 + 4.5.3 (código viejo en 4.5.3)
  t('r5', 1, '5533', 'r1'), t('r5', 2, '-'), t('r5', 3, '5275', 'r4')];
BD.PASO = [{ pasoId: 'P300', codigo: '300', descripcion: 'PESO NETO DEL GRANEL (kg):', tipoDatoId_iMaestraId: 433, activo: true, estructuraId_estructuraId: 'EP', etiquetaId_etiquetaId: 'ET4' }];
BD.MD_ES_RE_INSUMO = [{ estructuraRecetaInsumoId: 'R1', Component: '1000000902', Maktx: 'ALCOHOL ETILICO', CompUnit: 'L', cantidadRm: '6.000', mdRecetaId_mdRecetaId: 'RC', activo: true }];

const datos = { rmd: { mdId: 'MD1', codigo: '2202609431', version: 6 }, tipos: { 433: 'Texto', 438: 'Números', 445: 'Fórmula', 446: 'Sin tipo de dato', 448: 'MuestraCC', 450: 'Entrega' }, arbol: arbol(), catalogo: { estr: [['EP', 'PROCEDIMIENTO']], etq: [['ET4', 'FABRICACION'], ['ET5', 'RENDIMIENTO']], pasos: '300\t0\t0\t433\tPESO NETO DEL GRANEL (kg):\n' } };
const an = (trabajo) => ({ destino: { mdId: 'MD1', codigo: '2202609431', version: 6, estadoIdRmd_iMaestraId: 467 }, enSap: [], avisos: new Map(), cambios: [{ accion: 'cambiar' }], actual: arbol(), mapa: null });
const lista = (tr, n) => tr.estructuras[0].etiquetas[n].pasos;

// Caso 1: el proceso menor 4.4.1 «PESO» cambia por otro del catálogo (Texto) y Producción pide Texto en 4.5.3; 4.4.2 (Texto en SAP) no se toca
{ const tr = arbol(); const m1 = lista(tr, 0)[0].pm[0]; m1.codigo = '300'; m1.texto = 'PESO NETO DEL GRANEL (kg):';
  lista(tr, 1)[2].dt = dt(433, '0'); lista(tr, 1)[4].dt = dt(438);   // 4.5.3 a Texto y la fórmula 4.5.5 a Números
  const plan = await mod.ppPlanEscritura(datos, { trabajo: tr }, an(tr), modelo, 'PRUEBA');
  const fx = plan.ops.filter((o) => o.accion === 'Fórmula'), cfg = plan.ops.filter((o) => o.accion === 'Configuración');
  ok('sin bloqueos', !plan.bloqueos.length, plan.bloqueos.join(' | '));
  ok('el término de 4.5.1 sigue al proceso menor que cambia (200 -> 300)', fx.some((o) => o.ruta === "/MD_ES_FORMULA_PASO('FX1')" && o.datos.valor === '300' && o.inv.datos.valor === '200'), JSON.stringify(fx.map((o) => [o.ruta, o.datos])));
  ok('el término con código viejo de 4.5.4 se corrige (9999 -> 5218)', fx.some((o) => o.ruta === "/MD_ES_FORMULA_PASO('FX8')" && o.datos.valor === '5218'));
  ok('el insumo (sin código) no genera término', !fx.some((o) => o.ruta === "/MD_ES_FORMULA_PASO('FX5')"));
  const c3 = cfg.find((o) => o.ruta === "/MD_ES_PASO('r3')");
  ok('4.5.3 no queda como Texto: sigue «Entrega»', c3 && c3.datos.tipoDatoId_iMaestraId == null, JSON.stringify(c3 && c3.datos));
  const c5 = cfg.find((o) => o.ruta === "/MD_ES_PASO('r5')");
  ok('la fórmula 4.5.5 sigue como «Fórmula»', !c5 || c5.datos.tipoDatoId_iMaestraId === 445, JSON.stringify(c5 && c5.datos));
  const c2 = cfg.find((o) => o.ruta === "/MD_ES_PASO('f2')");
  ok('4.4.2 (Texto en SAP, lo usa 4.5.1) pasa a «Números» con 3 decimales', c2 && c2.datos.tipoDatoId_iMaestraId === 438 && c2.datos.decimales === 3 && c2.inv.datos.tipoDatoId_iMaestraId === 433, JSON.stringify(c2 && c2.datos));
  ok('avisa lo que estandariza', plan.avisos.some((a) => /fórmula/.test(a) && /Números/.test(a)), plan.avisos.join(' | '));
  escritas.length = 0; const diario = await mod.ppEjecutarIngreso(modelo, plan, {});
  ok('el ingreso escribe los términos', diario.every((d) => d.estado === 'hecho') && escritas.some((w) => w.ruta === "/MD_ES_FORMULA_PASO('FX1')" && w.datos.valor === '300'), JSON.stringify(diario.filter((d) => d.estado !== 'hecho')));
}
// Caso 2: el paso 4.4.2 que usa 4.5.1 se quita -> bloqueo
{ const tr = arbol(); lista(tr, 0)[1].quitado = true;
  const plan = await mod.ppPlanEscritura(datos, { trabajo: tr }, an(tr), modelo, 'PRUEBA');
  ok('quitar un paso que usa una fórmula bloquea el ingreso', plan.bloqueos.some((b) => /fórmula/.test(b) && /101/.test(b)), plan.bloqueos.join(' | '));
}
// Caso 3: el proceso menor cambia a un paso NUEVO (se crea en SAP): el término toma el código que da SAP al crearlo
{ const tr = arbol(); const m1 = lista(tr, 0)[0].pm[0]; m1.codigo = null; m1.nuevo = true; m1.texto = 'PESO BRUTO DEL GRANEL (kg):';
  BD.PASO.push({ pasoId: 'PX', codigo: '400', descripcion: 'PESO DEL ENVASE:', tipoDatoId_iMaestraId: 433, activo: true, estructuraId_estructuraId: 'EP', etiquetaId_etiquetaId: 'ET4', estadoId_iMaestraId: 2, numeracion: true });
  const plan = await mod.ppPlanEscritura(datos, { trabajo: tr }, an(tr), modelo, 'PRUEBA');
  const crea = plan.ops.find((o) => o.accion === 'Crear'), fx = plan.ops.find((o) => o.ruta === "/MD_ES_FORMULA_PASO('FX1')");
  ok('se crea el paso nuevo como numérico', crea && [438, 434, 443, 448, 450].includes(+crea.datos.tipoDatoId_iMaestraId), JSON.stringify(crea && crea.datos.tipoDatoId_iMaestraId) + ' ' + plan.bloqueos.join(' | '));
  ok('el término espera el código del paso nuevo', fx && fx.valorItem, JSON.stringify(fx));
  if (crea && fx) { escritas.length = 0; await mod.ppEjecutarIngreso(modelo, plan, {});
    ok('al ingresar, el término queda con el código nuevo', escritas.some((w) => w.ruta === "/MD_ES_FORMULA_PASO('FX1')" && w.datos.valor === '777001'), JSON.stringify(escritas.filter((w) => /FORMULA/.test(w.ruta)))); }
}
console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallas ? 1 : 0);
