// Pruebas de la v1.163.0 (pedido de Carlos: abrir la Edición rápida y descargar la plantilla más rápido): el catálogo de pasos se actualiza
// solo con los pasos registrados o cambiados desde la última lectura (con margen), se comprueba el total con $count y, si no cuadra, se lee todo.
// Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_catalogo_incremental.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const a = fuente.indexOf('  const PP_SEL_PASO = '), b = fuente.indexOf('  const ppConPasos = ');
if (a < 0 || b < a) throw new Error('no encuentro el bloque del catálogo incremental');

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

// SAP simulado: PASO con fechas; lecturas registradas
function crear({ conFechas = true } = {}) {
  const T0 = Date.UTC(2026, 10, 28, 10, 0, 0);
  const db = new Map();
  for (let i = 1; i <= 50; i++) db.set('p' + i, { pasoId: 'p' + i, codigo: String(1000 + i), descripcion: 'PASO ' + i, estructuraId_estructuraId: 'E1', etiquetaId_etiquetaId: '', estadoId_iMaestraId: 2, tipoDatoId_iMaestraId: 438, activo: true, fechaRegistro: new Date(T0 - 86400000), fechaActualiza: null });
  const log = [];
  class Filter { constructor(p, op, v) { if (typeof p === 'object') Object.assign(this, p); else Object.assign(this, { path: p, operator: op, value1: v }); } }
  const cumple = (x, f) => { if (!f) return true; if (f.filters) return f.and ? f.filters.every((g) => cumple(x, g)) : f.filters.some((g) => cumple(x, g)); const v = x[f.path]; return f.operator === 'GE' ? !!v && v.getTime() >= f.value1.getTime() : true; };
  const modelo = { getServiceMetadata: () => ({ dataServices: { schema: [{ entityType: [{ name: 'PASO', property: [{ name: 'pasoId', type: 'Edm.String' }, ...(conFechas ? [{ name: 'fechaRegistro', type: 'Edm.DateTime' }, { name: 'fechaActualiza', type: 'Edm.DateTime' }] : [])] }] }] } }) };
  const filas = (filtros) => [...db.values()].filter((x) => (filtros || []).every((f) => cumple(x, f)));
  const leerEntidadCompleta = async (m, ent, params, clave, avisar, filtros) => { log.push({ tipo: filtros ? 'cambios' : 'todo', select: params.$select }); return filas(filtros).map((x) => ({ ...x })); };
  const conLectura = async (m, f) => f({ read: (ruta, o) => { log.push({ tipo: 'count' }); o.success(String(db.size)); } });
  const ctx = { sap: { ui: { require: () => Filter, model: { Filter } } }, leerEntidadCompleta, conLectura, window: { __rmdStats: {} },
    ppLimpio: (t) => String(t == null ? '' : t).trim(), norm: (t) => String(t == null ? '' : t).trim() };
  const api = new Function(...Object.keys(ctx), fuente.slice(a, b) + '\nreturn { ppPasosAlDia, ppPasoConFechas, ppPasosDeCrudos };')(...Object.values(ctx));
  return { api, db, log, modelo, T0, ctx };
}

{
  const S = crear(), avisar = () => {};
  const r1 = await S.api.ppPasosAlDia(S.modelo, null, avisar, false);
  ok('primera vez: lee todo el catálogo', S.log.length === 1 && S.log[0].tipo === 'todo' && /fechaActualiza/.test(S.log[0].select), JSON.stringify(S.log));
  ok('primera vez: 50 pasos y marca del servidor', r1.pasos.length === 50 && r1.crudos.length === 50 && r1.marca === S.T0 - 86400000, `${r1.pasos.length} ${r1.marca}`);
  // se corrige un paso en el maestro y se crea otro (fechas del servidor)
  S.db.get('p7').descripcion = 'PASO 7 CORREGIDO'; S.db.get('p7').fechaActualiza = new Date(S.T0);
  S.db.set('p51', { pasoId: 'p51', codigo: '1051', descripcion: 'PASO NUEVO', estructuraId_estructuraId: 'E1', etiquetaId_etiquetaId: '', estadoId_iMaestraId: 2, tipoDatoId_iMaestraId: 438, activo: true, fechaRegistro: new Date(S.T0 + 1000), fechaActualiza: null });
  S.log.length = 0;
  const r2 = await S.api.ppPasosAlDia(S.modelo, r1, avisar, false);
  ok('después: solo lee lo cambiado y cuenta', S.log.some((x) => x.tipo === 'cambios') && S.log.some((x) => x.tipo === 'count') && !S.log.some((x) => x.tipo === 'todo'), JSON.stringify(S.log));
  ok('después: trae el paso corregido y el nuevo', r2.pasos.length === 51 && r2.pasos.some((p) => p[4] === 'PASO 7 CORREGIDO') && r2.pasos.some((p) => p[0] === '1051'), JSON.stringify(r2.pasos.slice(-2)));
  ok('después: la marca avanza con el reloj del servidor', r2.marca === S.T0 + 1000 && r2.full === r1.full, `${r2.marca}`);
  // un paso inactivado deja de ofrecerse
  S.db.get('p3').activo = false; S.db.get('p3').fechaActualiza = new Date(S.T0 + 2000); S.log.length = 0;
  const r3 = await S.api.ppPasosAlDia(S.modelo, r2, avisar, false);
  ok('paso inactivado: sale del catálogo sin leer todo', r3.pasos.length === 50 && !r3.pasos.some((p) => p[0] === '1003') && !S.log.some((x) => x.tipo === 'todo'));
  // borrado en SAP (el total ya no cuadra): se lee todo
  S.db.delete('p9'); S.log.length = 0;
  const r4 = await S.api.ppPasosAlDia(S.modelo, r3, avisar, false);
  ok('si el total no cuadra: lee todo otra vez', S.log.some((x) => x.tipo === 'todo') && !r4.pasos.some((p) => p[0] === '1009'), JSON.stringify(S.log));
  // pasados 30 min de la lectura completa: todo
  S.log.length = 0;
  await S.api.ppPasosAlDia(S.modelo, { ...r4, full: Date.now() - 31 * 60000 }, avisar, false);
  ok('a los 30 min de la lectura completa: lee todo', S.log.some((x) => x.tipo === 'todo'));
  S.log.length = 0;
  await S.api.ppPasosAlDia(S.modelo, r4, avisar, true);
  ok('«Volver a leer» (forzar): lee todo', S.log.some((x) => x.tipo === 'todo') && !S.log.some((x) => x.tipo === 'cambios'));
  // catálogo guardado por una versión anterior (sin filas crudas): todo
  S.log.length = 0;
  await S.api.ppPasosAlDia(S.modelo, { pasos: r4.pasos }, avisar, false);
  ok('catálogo de una versión anterior: lee todo', S.log.length === 1 && S.log[0].tipo === 'todo');
  ok('orden por código', r4.pasos.every((p, i, l) => !i || +l[i - 1][0] <= +p[0]));
}
{
  const S = crear({ conFechas: false });
  ok('sin fechas en el metadato: no hay lectura parcial', S.api.ppPasoConFechas(S.modelo) === false);
  const r = await S.api.ppPasosAlDia(S.modelo, null, () => {}, false);
  ok('sin fechas: lee todo y no guarda filas crudas', S.log[0].tipo === 'todo' && !/fechaActualiza/.test(S.log[0].select) && r.crudos === null && r.pasos.length === 50);
  S.log.length = 0; await S.api.ppPasosAlDia(S.modelo, r, () => {}, false);
  ok('sin fechas: cada vez lee todo', S.log.length === 1 && S.log[0].tipo === 'todo');
}

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
