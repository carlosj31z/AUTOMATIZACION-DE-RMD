// Pruebas de v1.142.0 (pedidos de Carlos, 2026-11-15) al importar un borrador de Producción:
//  - un paso no lleva saltos de línea (se cambian por espacios) y «HAGAN» -> «REALICEN» se corrige por defecto;
//  - el borrador manda (PPN.imponer): el RMD de destino queda igual al borrador aunque haya cambiado en SAP o sea otro producto de la misma etapa;
//  - las fórmulas se acomodan: un paso de fórmula reemplazado en el mismo lugar no se quita (se cambia la fila), las citas «(4.5.2 + 4.5.3)» se
//    renumeran si los pasos se mueven y, si Producción cambia la cita, los términos pasan a los pasos citados.
// Sin portal ni navegador: solo Node 18+ (SAP simulado).
//     node tampermonkey/pruebas/qa_importar_manda.mjs
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


const conNum = (a) => { a.estructuras[0].numeracion = true; const r = a.estructuras[0].etiquetas[1].pasos; r[3].texto = 'CANTIDAD OBTENIDA (kg) (1.2.2 + 1.2.3):'; r[4].texto = 'MERMA DE FABRICACION (kg) (1.2.1 - 1.2.4):'; return a; };
const arbolN = () => conNum(arbol());
const datos = { rmd: { mdId: 'MD1', codigo: '2202609431', version: 6, planta: 'PLANTA ATE', etapa: 'FABRICACION' }, tipos: { 433: 'Texto', 438: 'Números', 445: 'Fórmula', 446: 'Sin tipo de dato', 448: 'MuestraCC', 450: 'Entrega' }, arbol: arbolN(), catalogo: { estr: [['EP', 'PROCEDIMIENTO']], etq: [['ET4', 'FABRICACION'], ['ET5', 'RENDIMIENTO']], pasos: '300\t0\t0\t433\tPESO NETO DEL GRANEL (kg):\n' } };
const an = () => ({ destino: { mdId: 'MD1', codigo: '2202609431', version: 6, estadoIdRmd_iMaestraId: 467 }, enSap: [], avisos: new Map(), cambios: [{ accion: 'cambiar' }], actual: arbolN(), mapa: null });
const lista = (tr, n) => tr.estructuras[0].etiquetas[n].pasos;
const textos = (l) => l.filter((x) => !x.quitado).map((x) => x.texto);

// 1) sin saltos de línea y HAGAN -> REALICEN
ok('sinSaltos: Enter, tabulación y espacios repetidos quedan en un espacio', PPN.sinSaltos('VERIFICAR\r\n  LA  SALA\tLIMPIA ') === 'VERIFICAR LA SALA LIMPIA');
{ const tr = { estructuras: [{ id: 'P', pasos: [
    { id: 'n:1', nuevo: true, texto: 'COLOCARSE EL UNIFORME\nCOMPLETO.' },
    { id: 'p2', codigo: '31840', texto: 'CONTROLAR QUE SUS COMPAÑEROS HAGAN LO MISMO.' },
    { id: 'n:3', nuevo: true, texto: 'VERIFICAR QUE TODOS HAGAN EL LAVADO DE MANOS.' },
    { id: 'p4', codigo: '9', texto: 'SIN CAMBIOS.' }], etiquetas: [] }] };
  const n = PPN.corregirTrabajo(tr, 'PLANTA ATE'), p = tr.estructuras[0].pasos;
  ok('el paso con salto de línea queda con un espacio', p[0].texto === 'COLOCARSE EL UNIFORME COMPLETO.' && n.some((x) => x.tipo === 'saltos' && x.id === 'n:1'));
  ok('31840 «HAGAN» pasa al paso vigente de ATE 62221', p[1].codigo === '62221' && /REALICEN/.test(p[1].texto) && !p[1].nuevo, JSON.stringify(p[1]));
  ok('otro texto con HAGAN: REALICEN y se busca o crea en SAP', p[2].texto === 'VERIFICAR QUE TODOS REALICEN EL LAVADO DE MANOS.' && p[2].nuevo && p[2].codigo == null);
  ok('lo demás no se toca', p[3].codigo === '9' && n.length === 3, JSON.stringify(n));
  const tl = { estructuras: [{ id: 'P', pasos: [{ id: 'p2', codigo: '31840', texto: 'CONTROLAR QUE SUS COMPAÑEROS HAGAN LO MISMO.' }], etiquetas: [] }] }; PPN.corregirTrabajo(tl, 'PLANTA LIMA');
  ok('en LIMA pasa al 166452', tl.estructuras[0].pasos[0].codigo === '166452');
  ok('corregir dos veces no cambia nada más', PPN.corregirTrabajo(tr, 'PLANTA ATE').length === 0);
}
// 2) el borrador manda sobre el mismo RMD que cambió en SAP
{ const base = arbolN(), actual = arbolN(), tr = arbolN();
  lista(actual, 1)[2].codigo = '7777'; lista(actual, 1)[2].texto = 'CANTIDAD ENTREGADA A ALMACEN (kg):';        // SAP cambió 4.5.3
  lista(actual, 0).push({ id: 'sx', pasoId: 'P9', codigo: '9', texto: 'PASO AGREGADO EN SAP', orden: 3, tipo: 446, pm: [] });   // SAP agregó un paso
  lista(actual, 0)[1].vi = '5'; lista(tr, 0)[1].vi = null; lista(base, 0)[1].vi = null;                     // SAP cambió un rango (las filas leídas de SAP traen vi: null)
  lista(tr, 0)[0].texto = 'PESAR EL GRANEL EN LA BALANZA:'; lista(tr, 0)[0].codigo = null; lista(tr, 0)[0].nuevo = true;   // Producción cambia un texto
  lista(tr, 0).splice(1, 0, { id: 'n:7', nuevo: true, texto: 'LIMPIAR LA BALANZA.', pm: [] });                             // y agrega un paso
  const r = PPN.imponer(base, tr, actual, null), R4 = lista(r.trabajo, 0), R5 = lista(r.trabajo, 1);
  ok('el paso cambiado en SAP vuelve a lo del borrador', R5[2].codigo === '5218' && R5[2].id === 'r3', JSON.stringify(R5[2]));
  ok('lo agregado en SAP que no está en el borrador se quita', R4.find((x) => x.id === 'sx').quitado === true);
  ok('el rango vuelve a lo del borrador', R4.find((x) => x.id === 'f2').vi == null);
  ok('el cambio y el paso nuevo de Producción quedan, en su orden', JSON.stringify(textos(R4)) === JSON.stringify(['PESAR EL GRANEL EN LA BALANZA:', 'LIMPIAR LA BALANZA.', 'TARA DEL ENVASE (kg):']), JSON.stringify(textos(R4)));
  ok('avisa lo que se sobrescribe', r.notas.some((t) => /PASO AGREGADO EN SAP/.test(t)), r.notas.join(' | '));
  const c = PPN.cambios(actual, r.trabajo);
  ok('cambios sobre el destino: quitar, agregar y cambiar', ['quitar', 'agregar', 'cambiar'].every((a) => c.some((x) => x.accion === a)), JSON.stringify(c.map((x) => x.accion)));
  const igual = PPN.imponer(base, base, base, null);
  ok('borrador igual al destino: sin cambios', PPN.cambios(base, igual.trabajo).length === 0, JSON.stringify(PPN.cambios(base, igual.trabajo)));
}
// 3) otro producto de la misma etapa (otros ids; se empareja por estructura, etiqueta y código)
{ const base = arbolN(), tr = arbolN(), otro = arbolN(), ren = (a, p) => { a.estructuras.forEach((e) => { e.id = p + e.id; e.etiquetas.forEach((t) => { t.id = p + t.id; t.pasos.forEach((x) => { x.id = p + x.id; (x.pm || []).forEach((m) => { m.id = p + m.id; }); }); }); }); return a; };
  ren(otro, 'B'); lista(otro, 0)[1] = { id: 'Bq', pasoId: 'P55', codigo: '55', texto: 'PASO DEL OTRO PRODUCTO', orden: 2, tipo: 446, pm: [] };
  const mapa = new Map([['E', 'BE'], ['T4', 'BT4'], ['T5', 'BT5']]);
  const r = PPN.imponer(base, tr, otro, mapa), R4 = lista(r.trabajo, 0);
  ok('otro producto: los pasos con el mismo código se reusan (ids del destino)', R4[0].id === 'Bf1' && lista(r.trabajo, 1)[0].id === 'Br1');
  ok('otro producto: lo que no tiene el borrador se quita', R4.find((x) => x.id === 'Bq').quitado === true);
  const nuevo = R4.find((x) => x.codigo === '101' && !x.quitado);
  ok('otro producto: lo que falta se agrega con id nuevo', nuevo && String(nuevo.id).startsWith('n:'), JSON.stringify(nuevo));
  ok('otro producto: sin ids de la plantilla en el resultado', !JSON.stringify(r.trabajo).match(/"id":"(f|r|m)\d"/));
}
// 4) fórmula: el paso 4.5.2 (término de 4.5.4) se reemplaza por otro en el mismo lugar -> se cambia la fila, no se quita
{ const tr = arbolN(), r = lista(tr, 1); r[1].quitado = true; r.splice(2, 0, { id: 'n:9', nuevo: true, texto: 'CANTIDAD MUESTREADA PARA ANALISIS (kg):', pm: [] });
  const plan = await mod.ppPlanEscritura(datos, { trabajo: tr }, an(), modelo, 'PRUEBA');
  ok('sin bloqueo por quitar un término', !plan.bloqueos.length, plan.bloqueos.join(' | '));
  ok('la fila de 4.5.2 se cambia (no se quita)', plan.ops.some((o) => o.accion === 'Cambiar' && o.ruta === "/MD_ES_PASO('r2')") && !plan.ops.some((o) => o.accion === 'Quitar' && o.ruta === "/MD_ES_PASO('r2')"), JSON.stringify(plan.ops.map((o) => [o.accion, o.ruta])));
  ok('el término sigue al paso nuevo', plan.ops.some((o) => o.accion === 'Fórmula' && o.ruta === "/MD_ES_FORMULA_PASO('FX6')" && o.valorItem), JSON.stringify(plan.ops.filter((o) => o.accion === 'Fórmula').map((o) => [o.ruta, o.datos])));
  ok('lo avisa', plan.avisos.some((a) => /reemplaza en el mismo lugar/.test(a)));
}
// 5) fórmula: un paso nuevo al inicio de RENDIMIENTO corre la numeración -> las citas se renumeran
{ const tr = arbolN(); lista(tr, 1).unshift({ id: 'n:5', nuevo: true, texto: 'PESO DE LA MUESTRA DE RETENCION (kg):', pm: [] });
  const plan = await mod.ppPlanEscritura(datos, { trabajo: tr }, an(), modelo, 'PRUEBA');
  const crea = plan.ops.filter((o) => o.accion === 'Crear').map((o) => o.datos.descripcion);
  ok('4.5.4 cita los pasos con su número nuevo', crea.includes('CANTIDAD OBTENIDA (kg) (1.2.3 + 1.2.4):'), JSON.stringify(crea) + ' ' + plan.bloqueos.join(' | '));
  ok('4.5.5 también', crea.includes('MERMA DE FABRICACION (kg) (1.2.2 - 1.2.5):'), JSON.stringify(crea));
  ok('sin tareas a mano por las fórmulas', !plan.manual.some((m) => /Fórmulas/.test(m)), plan.manual.join(' | '));
}
// 6) fórmula: Producción cambia la cita de 4.5.4 -> los términos pasan a los pasos citados
{ const tr = arbolN(); const r4 = lista(tr, 1)[3]; r4.texto = 'CANTIDAD OBTENIDA (kg) (1.2.1 + 1.2.3):'; r4.codigo = null; r4.nuevo = true;
  const plan = await mod.ppPlanEscritura(datos, { trabajo: tr }, an(), modelo, 'PRUEBA');
  const rp = plan.ops.find((o) => o.accion === 'Fórmula' && o.ruta === "/MD_ES_FORMULA_PASO('FX6')");
  ok('el término 4.5.2 pasa a 4.5.1', rp && rp.datos.pasoFormulaId_mdEstructuraPasoId === 'r1' && rp.datos.valor === '5533' && rp.fase === 4, JSON.stringify(rp) + ' ' + plan.bloqueos.join(' | '));
  ok('el que ya era 4.5.3 no se toca', !plan.ops.some((o) => o.ruta === "/MD_ES_FORMULA_PASO('FX8')" && o.datos.pasoFormulaId_mdEstructuraPasoId));
  // cita imposible (3 pasos para 2 términos) -> tarea a mano
  const tr2 = arbolN(); const s4 = lista(tr2, 1)[3]; s4.texto = 'CANTIDAD OBTENIDA (kg) (1.2.1 + 1.2.2 + 1.2.3):'; s4.codigo = null; s4.nuevo = true;
  const plan2 = await mod.ppPlanEscritura(datos, { trabajo: tr2 }, an(), modelo, 'PRUEBA');
  ok('si no cuadra, queda como tarea a mano', plan2.manual.some((m) => /Fórmulas/.test(m) && /1\.2\.1, 1\.2\.2, 1\.2\.3/.test(m)), plan2.manual.join(' | '));
}
console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallas ? 1 : 0);
