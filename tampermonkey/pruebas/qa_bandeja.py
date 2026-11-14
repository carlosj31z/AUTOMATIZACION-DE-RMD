"""Pruebas de la bandeja de solicitudes (campanita) y de «Buscar por lote» (v1.138.0) sin portal: SAP y SAP Workflow simulados en memoria.

Comprueban que la lista se pide por partes, que «Por atender» deja solo lo que la persona puede aprobar, que Aprobar / Rechazar hacen las
mismas escrituras que la app «Solicitud» (y nada si la tarea ya no está READY), que una versión nueva aprobada se copia con los ids nuevos
enlazados, y que buscar por lote solo lee. Guarda capturas en /tmp para revisar el aspecto.

    python tampermonkey/pruebas/qa_bandeja.py
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from util import SCRIPT
from playwright.sync_api import sync_playwright

src = SCRIPT.read_text(encoding="utf-8")
ini, fin = src.index("  // ==BANDEJA-INICIO=="), src.index("  // ==BANDEJA-FIN==")
MODULO = src[ini:fin]
c0 = src.index("const CSS = `") + len("const CSS = `"); c1 = src.index("\n  `;", c0)
CSS = src[c0:c1]
CAPTURAS = os.environ.get("QA_CAPTURAS", "/tmp")

SIMULADO = r"""
window.Filter = function (a, op, v) { if (a && typeof a === 'object') { if (a.filters) { this.filters = a.filters; this.and = a.and; } else { this.path = a.path; this.op = a.operator; this.value = a.value1; this.ci = a.caseSensitive === false; } } else { this.path = a; this.op = op; this.value = v; } };
const coincide = (r, f) => {
  if (f.filters) return f.and ? f.filters.every((y) => coincide(r, y)) : f.filters.some((y) => coincide(r, y));
  const v = r[f.path];
  if (f.op === 'EQ') return String(v) === String(f.value) || (v == null && f.value == null);
  if (f.op === 'NE') return f.value === null ? v != null : String(v) !== String(f.value);
  if (f.op === 'Contains') return String(v || '').toUpperCase().includes(String(f.value).toUpperCase());
  throw new Error('operador ' + f.op);
};
// arma las filas (con sus navegaciones) a partir de la BD
const BD = window.BD = {};
const escrituras = window.escrituras = [];
const lecturas = window.lecturas = [];
const nav = (md) => Object.assign({}, md, {
  estadoIdRmd: { contenido: { 464: 'Solicitado', 465: 'Autorizado', 467: 'Ingresado', 469: 'Solicitud Aprobada', 470: 'Solicitud Rechazada' }[md.estadoIdRmd_iMaestraId] },
  estadoIdProceso: { contenido: { 456: 'Pendiente', 457: 'En Producción (Jefe)', 461: 'Aprobado (Gerente)' }[md.estadoIdProceso_iMaestraId] || '' },
  sucursalId: { contenido: md.sucursalId_iMaestraId === 1 ? 'PLANTA ATE' : 'PLANTA LIMA' }, motivoId: { descripcion: 'CONTROL DE CAMBIO' },
  destinatariosMD: { results: (BD.MD_DESTINATARIOS || []).filter((d) => d.mdId_mdId === md.mdId).map((d) => Object.assign({}, d, { usuarioId: (BD.USUARIO || []).find((u) => u.usuarioId === d.usuarioId_usuarioId) })) },
  aStatusProceso: { results: [] }, aReceta: { results: [] }, nivelId: { contenido: md.nivelTxt },
});
window.modelo = {
  sServiceUrl: '/mif-apps-rmd-bs.mifrmdconfiguracion-1.0.0/dest-apigateway/api/base/rmd/v2/browse/',
  read(ruta, op) {
    const ent = ruta.slice(1), p = op.urlParameters || {}; lecturas.push({ ent, p });
    let l = (BD[ent] || []).filter((r) => (op.filters || []).every((f) => coincide(r, f)));
    if (ent === 'MD') l = l.map(nav);
    if (ent === 'MD_ESTRUCTURA') l = l.map((e) => JSON.parse(JSON.stringify(e)));
    if (p.$orderby === 'fechaRegistro desc') l.sort((a, b) => b.fechaRegistro - a.fechaRegistro);
    const skip = +(p.$skip || 0), top = p.$top ? +p.$top : 1000; l = l.slice(skip, skip + top);
    setTimeout(() => op.success({ results: l }), 5);
  },
  create(ruta, datos, cb) { escrituras.push({ tipo: 'create', ruta, datos: JSON.parse(JSON.stringify(datos)) }); setTimeout(() => cb.success({}), 2); },
  update(ruta, datos, cb) { escrituras.push({ tipo: 'update', ruta, datos: JSON.parse(JSON.stringify(datos)) }); setTimeout(() => cb.success({}), 2); },
  callFunction(nombre, op) {
    if (nombre === '/sharepointGet') { const q = JSON.parse(op.urlParameters.idMd); return op.success({ sharepointGet: JSON.stringify({ d: { results: q.idMd === 'M1' ? [{ Name: 'sustento.pdf' }, { Name: 'cc.xlsx' }] : [] } }) }); }
    if (nombre === '/sharepointDownload') return op.success({ sharepointDownload: '%PDF-1.4' });
    op.error({ statusCode: 404 });
  },
};
window.erp = { sServiceUrl: '/x/dest-apigateway/api/integracion/saperp/rmd/sap/opu/odata/sap/Z_PP_NECESIDADESRMD_SRV', getHeaders: () => ({ token: 'jwt-de-prueba' }), read(ruta, op) { lecturas.push({ ent: 'ERP' + ruta, f: op.filters }); const l = (BD.OrdenSet || []).filter((r) => op.filters.every((f) => coincide(r, f))); setTimeout(() => op.success({ results: l }), 5); } };
// SAP Workflow
window.TAREAS = {};
window.wfLlamadas = [];
window.fakeFetch = async (url, op) => {
  op = op || {}; wfLlamadas.push({ url, metodo: op.method || 'GET', cuerpo: op.body ? JSON.parse(op.body) : null, cab: op.headers || {} });
  const r = (cuerpo, h) => ({ ok: true, status: 200, json: async () => cuerpo, headers: { get: (k) => (h || {})[k] || null } });
  if (/xsrf-token$/.test(url)) return r({}, { 'X-CSRF-Token': 'tok123' });
  if (/Z_PP_IMPRESIONORD_SRV\/OrdenSet/.test(url)) return r({ d: { results: [{ Aufnr: '2100033070', Pdf64: btoa('%PDF-1.4 orden') }] } });
  let m = /task-instances\?workflowInstanceId=(.+)$/.exec(url); if (m) return r(TAREAS[decodeURIComponent(m[1])] || []);
  m = /task-instances\/([^/]+)\/context$/.exec(url); if (m) return r({ requestUserData: { a: 1 }, bpRequestData: { motivoId_motivoId: null } });
  m = /task-instances\/([^/?]+)$/.exec(url); if (m && op.method === 'PATCH') return r({});
  return { ok: false, status: 404, json: async () => ({}), headers: { get: () => null } };
};
window.toasts = [];
"""

DATOS = r"""
const yo = { usuarioId: 'U1', usuario: 'CJESUSZ', correo: 'carlos@empresa.pe', nombre: 'Carlos', apellidoPaterno: 'Jesus' };
const otro = { usuarioId: 'U2', usuario: 'KMORENOM', correo: 'k@empresa.pe', nombre: 'Karla Vanessa', apellidoPaterno: 'Moreno' };
Object.assign(BD, {
  CONSTANTES: [{ codigoSap: 'IDESTRMDSOLICITADO', contenido: '464' }],
  USUARIO: [yo, otro], SISTEMA: [{ sistemaId: 'SIS', codigo: 'RMD' }], USUARIO_SISTEMA: [{ oUsuario_usuarioId: 'U1', oSistema_sistemaId: 'SIS' }, { oUsuario_usuarioId: 'U2', oSistema_sistemaId: 'SIS' }],
  UsuarioRol: [{ oUsuario_usuarioId: 'U1', oRol: { rolId: 'RJDT', oSistema_sistemaId: 'SIS', codigo: 'RMD_JEFATURA_DOCUMENTACION' } }],
  ROL: [{ rolId: 'RJP', codigo: 'RMD_JEFE_DE_PRODUCCION' }, { rolId: 'RGP', codigo: 'RMD_GERENTE_DE_PRODUCCION' }, { rolId: 'RJDT', codigo: 'RMD_JEFATURA_DOCUMENTACION' }],
  RolAppAcciones: [{ oRol_rolId: 'RJDT', oAplicacion_aplicacionId: '3b5fc15f-3dcb-4c0f-8927-8ba26964da38', oMaestraAccion: { contenido: 'APROBAR' } }],
  ROLAPPWF: [{ oAplicacion_aplicacionId: '3b5fc15f-3dcb-4c0f-8927-8ba26964da38', oRol_rolId: 'RJDT', oRolWorkflow: { aRolUsuarios: { results: [{ oUsuario: Object.assign({ activo: true }, yo) }] } } }],
  MOTIVO: [{ motivoId: 'MOT1', descripcion: 'CONTROL DE CAMBIO' }],
  MD_DESTINATARIOS: [], MD: [],
});
const base = Date.UTC(2026, 10, 13, 15);
// 120 solicitudes: M1 (v1) y M2 (v2) son Solicitado con Carlos de destinatario; M3 Solicitado sin él; el resto aprobadas/rechazadas
for (let i = 0; i < 120; i++) {
  const id = 'M' + (i + 1), est = i < 3 ? 464 : i % 3 ? 469 : 470;
  BD.MD.push({ mdId: id, codigo: i === 1 ? null : null, codigoSolicitud: String(1202605100 - i), version: i === 1 ? 2 : 1, descripcion: i === 0 ? 'AGUA ESTERIL P/INYECCION PEBD 1000mL' : 'PRODUCTO ' + i, nivelTxt: 'FABRICACION',
    areaRmdTxt: i % 2 ? 'LIQUIDOS' : 'SOLIDOS', sucursalId_iMaestraId: i % 2 ? 1 : 2, estadoIdRmd_iMaestraId: est, estadoIdProceso_iMaestraId: 456, motivoId_motivoId: 'MOT1',
    fechaRegistro: new Date(base - i * 3600000), usuarioRegistro: 'NCUELLARL', observacion: 'linea 1\nlinea 2', wfInstanceId: 'WF' + (i + 1), mdIdVersionAnt: i === 1 ? 'MANT' : null });
  if (i < 2) BD.MD_DESTINATARIOS.push({ mdId_mdId: id, usuarioId_usuarioId: 'U1', tipo: null });
  if (i === 2) BD.MD_DESTINATARIOS.push({ mdId_mdId: id, usuarioId_usuarioId: 'U2', tipo: null });
}
TAREAS.WF1 = [{ id: 'T1', activityId: 'usertask2', status: 'READY' }];
TAREAS.WF2 = [{ id: 'T2', activityId: 'usertask2', status: 'READY' }];
// versión anterior de M2: una receta, una estructura de insumos, una de pasos con etiqueta, 2 pasos (el 2.º depende del 1.º), un PM y una fórmula
BD.VIEW_MD_ORDERED_BY_CODIGO_DESC = [{ codigo: '2202609449' }];
BD.MD_RECETA = [{ mdRecetaId: 'R-ANT', mdId_mdId: 'MANT', recetaId_recetaId: 'REC1', orden: 1 }];
BD.MD_ESTRUCTURA = [
  { mdEstructuraId: 'E-INS', mdId_mdId: 'MANT', orden: 1, estructuraId_estructuraId: 'INSUMOS', aInsumo: { results: [{ estructuraRecetaInsumoId: 'I-ANT', mdRecetaId_mdRecetaId: 'R-ANT', estructuraId_estructuraId: 'INSUMOS', Component: '1000', CompQty: '2', CompUnit: 'KG' }] }, aPaso: { results: [] }, aEquipo: { results: [] }, aUtensilio: { results: [] }, aEtiqueta: { results: [] }, aPasoInsumoPaso: { results: [] }, aEspecificacion: { results: [] } },
  { mdEstructuraId: 'E-PRO', mdId_mdId: 'MANT', orden: 2, estructuraId_estructuraId: 'PROC', aInsumo: { results: [] },
    aEtiqueta: { results: [{ mdEsEtiquetaId: 'ET-ANT', etiquetaId_etiquetaId: 'ETQ', orden: 1 }] },
    aPaso: { results: [
      { mdEstructuraPasoId: 'P1-ANT', mdEsEtiquetaId_mdEsEtiquetaId: 'ET-ANT', pasoId_pasoId: 'PASO1', orden: 1, tipoDatoId_iMaestraId: 438, aFormula: { results: [] } },
      { mdEstructuraPasoId: 'P2-ANT', mdEsEtiquetaId_mdEsEtiquetaId: 'ET-ANT', pasoId_pasoId: 'PASO2', orden: 2, dependeMdEstructuraPasoId: 'P1-ANT', tipoDatoId_iMaestraId: 445,
        aFormula: { results: [{ mdFormulaPaso: 'FO-ANT', pasoPadreId_mdEstructuraPasoId: 'P2-ANT', pasoFormulaId_mdEstructuraPasoId: 'P1-ANT', esPaso: true, valor: 'PASO1', mdId_mdId: 'MANT' }] } }] },
    aPasoInsumoPaso: { results: [{ mdEstructuraPasoInsumoPasoId: 'PM-ANT', pasoId_mdEstructuraPasoId: 'P1-ANT', estructuraRecetaInsumoId_estructuraRecetaInsumoId: 'I-ANT', pasoHijoId_pasoId: null, mdEsEtiquetaId_mdEsEtiquetaId: 'ET-ANT', aFormula: { results: [] } }] },
    aEquipo: { results: [{ equipoId_equipoId: 'EQ1', orden: 1 }] }, aUtensilio: { results: [] }, aEspecificacion: { results: [] } },
];
BD.OrdenSet = [{ Charg: 'L2601', Aufnr: '', Pwerk: '1020', Dauat: 'FAB', Matnr: '000000006000003412', Verid: '0001', Text1: 'NITROFURANTOINA 100MG', Vfdat: new Date(Date.UTC(2028, 0, 31)), Stats: 'LIB' }];
BD.RMD = [{ rmdId: 'X1', productoId: '000000006000003412', verid: '0001', ordenSAP: '', aReceta: { results: [{ rmdRecetaId: 'RR1', fraccion: 1, recetaId: { Matnr: '000000006000003412', Verid: '0001' } }] },
  aEstructura: { results: [{ orden: 2, fraccion: 1, estructuraId: { tipoEstructuraId_iMaestraId: 1 }, aEtiqueta: { results: [] }, aPaso: { results: [{ orden: 2 }, { orden: 1 }] }, aPasoInsumoPaso: { results: [] }, aEquipo: { results: [] }, aUtensilio: { results: [] }, aEspecificacion: { results: [] },
    aInsumo: { results: [{ fraccion: 1, rmdRecetaId_rmdRecetaId: 'RR1', visibleInsumo: true, ItemNo: 20 }, { fraccion: 1, rmdRecetaId_rmdRecetaId: 'RR1', visibleInsumo: false, ItemNo: 10 }, { fraccion: 1, rmdRecetaId_rmdRecetaId: 'RR1', visibleInsumo: true, ItemNo: 5 }] } },
    { orden: 1, fraccion: 1, estructuraId: { tipoEstructuraId_iMaestraId: 2 }, aEtiqueta: { results: [] }, aPaso: { results: [] }, aPasoInsumoPaso: { results: [] }, aEquipo: { results: [] }, aUtensilio: { results: [] }, aEspecificacion: { results: [] }, aInsumo: { results: [] } }] }, estadoIdRmd: { contenido: 'En proceso' }, mdId: { mdId: 'M9', codigo: '2202609142', version: 3, descripcion: 'NITROFURANTOINA', estadoIdRmd: { contenido: 'Autorizado' }, estadoIdRmd_iMaestraId: 465 } }];
"""

ARRANQUE = r"""
window.B = crearBandeja({
  Filter: () => window.Filter, modelo: () => window.modelo, modeloErp: () => window.erp,
  conLectura: (m, f) => f(m),
  leerTodoDe: (m, ent, filtros, params) => new Promise((ok, mal) => { const out = []; const leer = (skip) => m.read('/' + ent, { filters: filtros, urlParameters: Object.assign({}, params, { $top: '1000', $skip: String(skip) }), success: (r) => { out.push(...r.results); if (r.results.length < 1000) ok(out); else leer(skip + 1000); }, error: mal }); leer(0); }),
  esc: (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  toast: (t, e) => toasts.push([t, !!e]), usuarioVisible: (u) => (u === 'KMORENOM' ? 'VM' : u), persona: () => ({ email: 'carlos@empresa.pe' }), fetch: fakeFetch,
  generarPdfRmd: async (A, C, h, y, k, p, E) => { window.gen = { cod: A.rmdId, desc: C, matnr: y.Matnr, p, ordenes: A.aEstructura.results.map((e) => e.orden), pasos: A.aEstructura.results[1].aPaso.results.map((x) => x.orden), ins: A.aEstructura.results[1].aInsumo.results.map((x) => x.ItemNo), lote: A.loteVistaRMD, hist: E && Array.isArray(E.results) }; return encodeURI(btoa('%PDF-1.4 rmd')); },
  externos: () => {}, abrirRmd: (c, v) => { window.abierto = [c, v]; }, abrirApp: (h) => { window.app = h; }, alCambiarPendientes: (n) => { window.pend = n; },
});
"""

RES = []
def ok(nombre, cond, detalle=""):
    RES.append(bool(cond)); print(("PASA  " if cond else "FALLA ") + nombre + ("" if cond or not detalle else " — " + str(detalle)[:300]), flush=True)


with sync_playwright() as p:
    ruta = os.environ.get("QA_CHROME") or next((x for x in ["/opt/pw-browsers/chromium"] if os.path.exists(x)), None)
    nav = p.chromium.launch(executable_path=ruta) if ruta and os.path.isfile(ruta) else p.chromium.launch()
    pg = nav.new_page(viewport={"width": 1500, "height": 900}, device_scale_factor=1)
    errores = []
    pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.set_content(f"""<!doctype html><html class="rmd-ui sapUiTheme-sap_fiori_3_dark"><head><meta charset="utf-8"><style>{CSS}</style>
      <style>body{{margin:0;background:#1d232a;color:#fafafa;font:14px Arial}}</style></head><body></body></html>""")
    pg.add_script_tag(content=SIMULADO + "\n(function(){\n" + MODULO + "\nwindow.crearBandeja = crearBandeja;\n})();\n" + DATOS + ARRANQUE)

    r = pg.evaluate("async () => { const y = await B.quienSoy(); const l = await B.cargarAtender(true); return { usuario: y.data.usuario, aprob: y.fs.aprobador, ids: l.map((x) => x.mdId), pend: window.pend }; }")
    ok("quién soy: usuario de RMD por su correo y aprobador de solicitudes", r["usuario"] == "CJESUSZ" and r["aprob"], r)
    ok("Por atender: solo los Solicitado donde soy destinatario (M1, M2; no M3)", r["ids"] == ["M1", "M2"], r)
    ok("la campanita recibe el número por atender", r["pend"] == 2, r)

    r = pg.evaluate("async () => { lecturas.length = 0; const a = await B.cargarPagina('todas'); const n1 = a.length; const p1 = lecturas.filter((x) => x.ent === 'MD').map((x) => x.p); await B.cargarPagina('todas'); return { n1, n2: B.S.todas.filas.length, p1, primero: a[0].mdId }; }")
    ok("Todas: se pide por partes de 40, la más nueva primero", r["p1"][0].get("$top") == "40" and r["p1"][0].get("$orderby") == "fechaRegistro desc" and r["primero"] == "M1", r["p1"][:1])
    ok("Todas: la segunda parte trae más filas sin repetir", r["n1"] == 40 and r["n2"] == 80, r)
    ok("la lista no pide expansiones pesadas (aStatusProceso, aReceta)", all("aStatusProceso" not in (x.get("$expand") or "") and "aReceta" not in (x.get("$expand") or "") for x in r["p1"]))

    r = pg.evaluate("async () => { B.S.buscar = 'agua'; const a = await B.cargarPagina('todas'); B.S.buscar = ''; return a.map((x) => x.mdId); }")
    ok("buscar por nombre filtra en el servidor (sin importar mayúsculas)", r == ["M1"], r)

    # --- Rechazar sin motivo / con tarea no READY ---
    r = pg.evaluate("async () => { escrituras.length = 0; try { await B.rechazar('M1', '  '); return 'sin error'; } catch (e) { return [e.message, escrituras.length]; } }")
    ok("Rechazar exige el motivo y no escribe nada sin él", r[1] == 0 and "motivo" in r[0], r)
    r = pg.evaluate("async () => { escrituras.length = 0; TAREAS.WF1 = [{ id: 'T1', activityId: 'usertask2', status: 'COMPLETED', processor: 'OTRO', createdBy: 'X', completedAt: '2026-11-13T10:00:00Z', createdAt: '2026-11-13T09:00:00Z' }]; try { await B.aprobar('M1', ['U1']); return 'sin error'; } catch (e) { TAREAS.WF1 = [{ id: 'T1', activityId: 'usertask2', status: 'READY' }]; return [e.message, escrituras.length, !!e.yaAtendida]; } }")
    ok("si la tarea ya no está READY no se escribe nada y se avisa quién la atendió", r != "sin error" and r[1] == 0 and r[2] and "OTRO" in r[0], r)

    # --- Aprobar solicitud de RMD nuevo (v1) ---
    r = pg.evaluate("async () => { escrituras.length = 0; wfLlamadas.length = 0; const pasos = []; await B.aprobar('M1', ['U1'], (p) => pasos.push(p)); return { esc: escrituras, wf: wfLlamadas.filter((x) => x.metodo === 'PATCH'), pasos }; }")
    e = r["esc"]
    ok("Aprobar v1: crea MD_ESTATUSPROCESO tipo SOLICITUD", e[0]["ruta"] == "/MD_ESTATUSPROCESO" and e[0]["datos"]["tipo"] == "SOLICITUD" and e[0]["datos"]["mdId_mdId"] == "M1", e[:1])
    md = next((x for x in e if x["ruta"] == "/MD('M1')"), None)
    ok("Aprobar v1: MD pasa a 469 Solicitud aprobada, proceso 456 y wfInstanceId null", md and md["datos"]["estadoIdRmd_iMaestraId"] == 469 and md["datos"]["estadoIdProceso_iMaestraId"] == 456 and md["datos"]["wfInstanceId"] is None and md["datos"]["usuarioActualiza"] == "CJESUSZ", md)
    ok("Aprobar v1: solo esas dos escrituras (no copia estructuras)", len(e) == 2, [x["ruta"] for x in e])
    w = r["wf"]
    ok("Aprobar v1: completa usertask2 con action A, motivo y nombre del aprobador (con token)", len(w) == 1 and w[0]["url"].endswith("/task-instances/T1") and w[0]["cuerpo"]["status"] == "COMPLETED"
       and w[0]["cuerpo"]["context"]["action"] == "A" and w[0]["cuerpo"]["context"]["bpRequestData"]["motivoMDWF"] == "CONTROL DE CAMBIO" and w[0]["cuerpo"]["context"]["NameUserAprob"] == "Carlos" and w[0]["cab"].get("X-CSRF-Token") == "tok123", w)
    ok("Workflow por la ruta de la app (…mifrmdconfiguracion-1.0.0/bpmworkflowruntime/v1)", w and w[0]["url"].startswith("/mif-apps-rmd-bs.mifrmdconfiguracion-1.0.0/bpmworkflowruntime/v1/"), w[:1])

    # --- Aprobar versión nueva (v2) → Ingresado con la estructura de la anterior ---
    r = pg.evaluate("async () => { escrituras.length = 0; wfLlamadas.length = 0; const res = await B.aprobar('M2', ['U1']); return { esc: escrituras, res }; }")
    e = r["esc"]; rutas = [x["ruta"] for x in e]
    ok("Aprobar v2: después de aprobar se asigna el código siguiente y estado 467 (Ingresado)", any(x["ruta"] == "/MD('M2')" and x["datos"].get("codigo") == "2" + "2026" + "09450" and x["datos"]["estadoIdRmd_iMaestraId"] == 467 for x in e), [x for x in e if x["ruta"] == "/MD('M2')"])
    ok("Aprobar v2: trazabilidad 467, receta, 2 estructuras y fórmulas", rutas.count("/MD_TRAZABILIDAD") == 1 and rutas.count("/MD_RECETA") == 1 and rutas.count("/MD_ESTRUCTURA") == 2 and rutas.count("/TABLAS_ARRAY_MD_SKIP") == 1, rutas)
    est = [x["datos"] for x in e if x["ruta"] == "/MD_ESTRUCTURA"]
    rec = next(x["datos"] for x in e if x["ruta"] == "/MD_RECETA")
    ins = est[0]["aInsumo"][0]; pro = est[1]
    p1, p2 = pro["aPaso"]; pm = pro["aPasoInsumoPaso"][0]; et = pro["aEtiqueta"][0]
    ok("ids nuevos: el insumo apunta a la receta nueva", ins["mdRecetaId_mdRecetaId"] == rec["mdRecetaId"] and rec["mdRecetaId"] != "R-ANT")
    ok("ids nuevos: el paso 2 depende del paso 1 nuevo y ambos usan la etiqueta nueva", p2["dependeMdEstructuraPasoId"] == p1["mdEstructuraPasoId"] and p1["mdEsEtiquetaId_mdEsEtiquetaId"] == et["mdEsEtiquetaId"] != "ET-ANT")
    ok("ids nuevos: el proceso menor cuelga del paso nuevo y del insumo nuevo", pm["pasoId_mdEstructuraPasoId"] == p1["mdEstructuraPasoId"] and pm["estructuraRecetaInsumoId_estructuraRecetaInsumoId"] == ins["estructuraRecetaInsumoId"])
    fo = next(x["datos"] for x in e if x["ruta"] == "/TABLAS_ARRAY_MD_SKIP")["aFormula"][0]
    ok("ids nuevos: la fórmula va del paso 2 nuevo al paso 1 nuevo (sin mdId, como la app)", fo["pasoPadreId_mdEstructuraPasoId"] == p2["mdEstructuraPasoId"] and fo["pasoFormulaId_mdEstructuraPasoId"] == p1["mdEstructuraPasoId"] and "mdId_mdId" not in fo and fo["mdFormulaPaso"] != "FO-ANT", fo)
    ok("todo lo copiado queda en el MD nuevo", all(x["mdId_mdId"] == "M2" for x in est) and p1["mdId_mdId"] == "M2" and pro["aEquipo"][0]["mdId_mdId"] == "M2")
    ok("los pasos no llevan las fórmulas dentro (van aparte)", p1["aFormula"] == [] and p2["aFormula"] == [])

    # --- Rechazar ---
    pg.evaluate("() => { BD.MD.find((m) => m.mdId === 'M1').estadoIdRmd_iMaestraId = 464; }")
    r = pg.evaluate("async () => { escrituras.length = 0; wfLlamadas.length = 0; await B.rechazar('M1', 'Falta el sustento del CC'); return { esc: escrituras, wf: wfLlamadas.filter((x) => x.metodo === 'PATCH') }; }")
    md = next((x for x in r["esc"] if x["ruta"] == "/MD('M1')"), None)
    ok("Rechazar: MD pasa a 470 con el motivo", md and md["datos"]["estadoIdRmd_iMaestraId"] == 470 and md["datos"]["motivoRechazo"] == "Falta el sustento del CC", md)
    ok("Rechazar: completa usertask2 con action R", r["wf"] and r["wf"][0]["cuerpo"]["context"]["action"] == "R", r["wf"])

    # --- No puede atender lo que no le toca ---
    r = pg.evaluate("async () => { escrituras.length = 0; try { await B.aprobar('M3', ['U1']); return 'sin error'; } catch (e) { return [e.message, escrituras.length]; } }")
    ok("no se aprueba una solicitud donde no eres destinatario", r != "sin error" and r[1] == 0, r)

    # --- Lote: solo lectura ---
    r = pg.evaluate("async () => { escrituras.length = 0; const o = await B.ordenesDeLote(' l2601 '); const d = await B.rmdDeOrden(o[0]); return { n: o.length, reg: d.registros.length, cod: d.registros[0].mdId.codigo, esc: escrituras.length }; }")
    ok("Buscar por lote: órdenes del lote (en mayúsculas) y RMD de la orden, sin escribir", r["n"] == 1 and r["reg"] == 1 and r["cod"] == "2202609142" and r["esc"] == 0, r)

    # --- Interfaz ---
    pg.evaluate("() => { BD.MD.find((m) => m.mdId === 'M1').estadoIdRmd_iMaestraId = 464; B.reiniciar(); B.S.todas.clave = '__'; }")
    pg.evaluate("() => B.abrir('atender')")
    pg.wait_for_selector(".rmd-bs-t", timeout=5000); pg.wait_for_timeout(400)
    n = pg.locator(".rmd-bs-t").count()
    ok("la bandeja abre en «Por atender» con sus tarjetas", n == 2, n)
    txt = pg.locator(".rmd-bs-t").first.inner_text()
    ok("la tarjeta muestra nombre, sección, planta, motivo, estado y adjuntos", all(x in txt for x in ["AGUA ESTERIL", "SOLIDOS", "LIMA", "CONTROL DE CAMBIO", "Solicitado"]), txt)
    pg.wait_for_timeout(300)
    ok("la tarjeta cuenta los adjuntos al verse", "2 adjuntos" in pg.locator(".rmd-bs-t").first.inner_text(), pg.locator(".rmd-bs-t").first.inner_text())
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-1-lista.png"))
    pg.locator(".rmd-bs-t").first.click(); pg.wait_for_selector(".rmd-bs-adjl", timeout=5000); pg.wait_for_timeout(200)
    ok("el detalle trae Aprobar y Rechazar (solo texto) y los adjuntos", pg.locator(".rmd-bs-btn.si").inner_text() == "Aprobar" and pg.locator(".rmd-bs-btn.no").inner_text() == "Rechazar" and pg.locator(".rmd-bs-adjl li").count() == 2)
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-2-detalle.png"))
    det = pg.locator(".rmd-bs-det").inner_text(); lista = pg.locator(".rmd-bs-lista").inner_text()
    ok("sin «te toca» ni pestaña de flujo de revisión", "te toca" not in lista and pg.locator(".rmd-bs-pestanas button").count() == 2, pg.locator(".rmd-bs-pestanas").inner_text())
    ok("los destinatarios van en una sola línea resumida", pg.locator(".rmd-bs-destr").count() == 1 and pg.locator(".rmd-bs-destr li").count() == 0, det)
    r = pg.evaluate("() => { const f = B.S.atender.filas[0]; return [B.puedoAtender({ ...f, estadoIdRmd_iMaestraId: 467, estadoIdProceso_iMaestraId: 457 }), B.puedoAtender(f)]; }")
    ok("solo un Solicitado se puede aprobar o rechazar (un Ingresado en revisión no)", r == [False, True], r)
    pg.locator(".rmd-bs-btn.no").click(); pg.wait_for_selector(".rmd-bs-motivo textarea")
    ok("Rechazar pide el motivo y el botón espera texto", pg.locator(".rmd-bs-confirma .rmd-bs-btn.no").is_disabled())
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-3-rechazar.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    pg.locator(".rmd-bs-pestanas button[data-v=todas]").click(); pg.wait_for_timeout(600)
    ok("Todas: carga la primera parte", pg.locator(".rmd-bs-t").count() >= 12, pg.locator(".rmd-bs-t").count())
    pg.locator(".rmd-bs-lista").evaluate("(el) => el.scrollTop = el.scrollHeight"); pg.wait_for_timeout(800)
    ok("al bajar se cargan más (por partes)", pg.locator(".rmd-bs-t").count() > 40, pg.locator(".rmd-bs-t").count())
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-4-todas.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    ok("Esc cierra la bandeja", pg.locator(".rmd-bs-fondo").count() == 0)
    pg.evaluate("() => B.abrirLote()"); pg.fill(".rmd-lt-form input", "l2601"); pg.keyboard.press("Enter")
    pg.wait_for_selector(".rmd-lt-rmd li", timeout=5000)
    ok("Buscar por lote: tabla de órdenes y, con una sola, sus RMD abiertos", "2202609142" in pg.locator(".rmd-lt-rmd").inner_text())
    txt = pg.locator(".rmd-lt-rmd").inner_text()
    ok("Buscar por lote: cada RMD trae OPP, RMO y Descargar RMO", all(x in txt for x in ["OPP", "RMO", "Descargar RMO"]), txt)
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-5-lote.png"))
    r = pg.evaluate("""async () => { wfLlamadas.length = 0; const b = await B.pdfDeOrden('2100033070'); const c = wfLlamadas.find((x) => /IMPRESIONORD/.test(x.url));
      return { tipo: b.type, txt: await b.text(), tok: c && c.cab.token, url: c && c.url }; }""")
    ok("OPP: PDF de la orden desde Z_PP_IMPRESIONORD_SRV con las cabeceras del modelo ERP", r["tipo"] == "application/pdf" and r["txt"] == "%PDF-1.4 orden" and r["tok"] == "jwt-de-prueba" and "Aufnr%20eq%20'2100033070'" in r["url"], r)
    r = pg.evaluate("""async () => { escrituras.length = 0; const b = await B.generarRmo('X1', { Matnr: '000000006000003412', Verid: '0001', Aufnr: '2100033070' }, false); return { g: window.gen, txt: await b.text(), esc: escrituras.length }; }""")
    g = r["g"] or {}
    ok("RMO: arma los datos como Registro (orden, insumos visibles por ItemNo) y genera el PDF sin escribir", g.get("desc") is False and g.get("p") == "BASE64" and g.get("ordenes") == [1, 2] and g.get("pasos") == [1, 2] and g.get("ins") == [5, 20] and g.get("lote") == " " and g.get("hist") and r["txt"] == "%PDF-1.4 rmd" and r["esc"] == 0, r)
    pg.evaluate("() => { window.abiertas = []; window.open = (u) => { const w = { closed: false, document: { body: { style: {} } }, location: {} }; window.abiertas.push(w); return w; }; }")
    pg.locator(".rmd-lt-docs button[data-doc=opp]").first.click(); pg.wait_for_timeout(300)
    r = pg.evaluate("() => window.abiertas.map((w) => String(w.location.href || ''))")
    ok("al pulsar OPP se abre el PDF en una pestaña", len(r) == 1 and r[0].startswith("blob:"), r)
    # tema claro y móvil
    pg.keyboard.press("Escape"); pg.evaluate("() => document.documentElement.classList.remove('sapUiTheme-sap_fiori_3_dark')")
    pg.evaluate("() => B.abrir('atender')"); pg.wait_for_selector(".rmd-bs-t"); pg.wait_for_timeout(300); pg.locator(".rmd-bs-t").first.click(); pg.wait_for_timeout(300)
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-6-claro.png"))
    pg.set_viewport_size({"width": 390, "height": 800}); pg.wait_for_timeout(200)
    ancho = pg.evaluate("() => document.querySelector('.rmd-bs').scrollWidth <= document.querySelector('.rmd-bs').clientWidth + 1")
    ok("en pantalla angosta no hay desborde horizontal", ancho)
    pg.screenshot(path=os.path.join(CAPTURAS, "bandeja-7-movil.png"))
    ok("sin errores de JavaScript en la página", not errores, errores)
    nav.close()

print(f"\n{sum(RES)} de {len(RES)} pruebas pasan")
sys.exit(0 if all(RES) else 1)
