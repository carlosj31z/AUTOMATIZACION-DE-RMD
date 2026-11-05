"""Ventana «Mis movimientos» (v1.117.0) sobre una maqueta mínima con un modelo OData simulado: sin portal ni sesión, no escribe nada.

    python tampermonkey/pruebas/qa_mismov_ventana.py [captura.png]
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from util import SCRIPT
from playwright.sync_api import sync_playwright

URL = "https://maqueta.local/cp.portal/ui5appruntime.html"
PAGINA = """<!doctype html><html class="sapUiTheme-sap_fiori_3_dark"><head><meta charset="utf-8"></head><body class="sapUiBody" style="margin:0;background:#1d232a;color:#fafafa;font:14px Arial">
<div id="app"><button id="btnExp" title="Exportar">Exportar</button></div><script>
function F(a, b, c) { if (a && typeof a === 'object') { this.filters = a.filters; this.and = a.and; } else { this.path = a; this.op = b; this.value = c; } }
const hoy = new Date(), h = (hh, mm) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), hh, mm);
const MD = [
  { mdId: 1, codigo: '2202609013', version: 5, descripcion: 'PARACETAMOL 500 MG TABLETAS', nivelTxt: 'Fabricación', sucursalId: { contenido: 'PLANTA LIMA' }, estadoIdRmd: { contenido: 'Ingresado' }, usuarioRegistro: 'CJESUSZ', fechaRegistro: h(9, 5) },
  { mdId: 2, codigo: '2202609100', version: 3, descripcion: 'IBUPROFENO 400 MG', nivelTxt: 'Envase', sucursalId: { contenido: 'PLANTA ATE' }, estadoIdRmd: { contenido: 'Autorizado' }, usuarioAutorizacion: 'KMORENOM', fechaAutorizacion: h(11, 40), usuarioActualiza: 'CJESUSZ', fechaActualiza: h(11, 45) },
  { mdId: 3, codigo: '2202609200', version: 2, descripcion: 'JARABE PARA LA TOS', nivelTxt: 'Acondicionado', sucursalId: { contenido: 'PLANTA LIMA' }, estadoIdRmd: { contenido: 'Suspendido' } },
];
const TRAZ = [{ idTrazabilidad: 9, mdId_mdId: 3, usuarioRegistro: 'CJESUSZ', fechaRegistro: h(15, 2), activo: true, estadoTrazab: { contenido: 'Suspendido' } }];
const PASOS = [{ mdEstructuraPasoId: 'a', mdId_mdId: 1, activo: true, usuarioActualiza: 'CJESUSZ', fechaActualiza: h(10, 30) }, { mdEstructuraPasoId: 'b', mdId_mdId: 1, activo: true, usuarioActualiza: 'CJESUSZ', fechaActualiza: h(10, 31) }];
window.__lect = [];
const modelo = { read: (ruta, o) => {
  const ent = ruta.slice(1); window.__lect.push({ ent, f: JSON.stringify(o.filters) });
  const r = ent === 'USUARIO' ? [{ usuarioId: 1, usuario: 'CJESUSZ', correo: 'cjesusz@x.pe' }] : ent === 'MD' ? MD : ent === 'MD_TRAZABILIDAD' ? TRAZ : ent === 'MD_ES_PASO' ? PASOS : [];
  setTimeout(() => o.success({ results: r }), 20); } };
const vista = { getModel: (n) => (n === 'mainModelv2' ? modelo : null) };
const reg = { btnExp: { mEventRegistry: { press: [{ oListener: { getView: () => vista }, fFunction: () => {} }] } } };
window.sap = { ui: { getCore: () => ({ byId: (id) => reg[id] }), require: (n) => (n === 'sap/ui/model/Filter' ? F : null) },
  ushell: { Container: { getUser: () => ({ getId: () => 'x', getFullName: () => 'Carlos Jesús', getFirstName: () => 'Carlos', getEmail: () => 'cjesusz@x.pe' }) } } };
</script></body></html>"""

with sync_playwright() as p:
    br = p.chromium.launch(headless=True, **({"executable_path": os.environ["RMD_CHROMIUM"]} if os.environ.get("RMD_CHROMIUM") else {}))
    pg = br.new_page(viewport={"width": 1415, "height": 886})
    errores = []; pg.on("pageerror", lambda e: errores.append(str(e)[:200]))
    pg.route("**/ui5appruntime.html", lambda r: r.fulfill(status=200, content_type="text/html; charset=utf-8", body=PAGINA))
    pg.add_init_script("window.__rmdSinInicio = true")
    pg.goto(URL); pg.evaluate(SCRIPT.read_text(encoding="utf-8")); pg.wait_for_timeout(800)
    pg.evaluate("() => window.__rmdStats.abrirMisMovimientos()")
    pg.wait_for_selector(".rmd-mismov-tabla", timeout=10000); pg.wait_for_timeout(300)
    r = pg.evaluate("""() => { const v = document.querySelector('.rmd-mismov');
      return { titulo: v.querySelector('h3').textContent, prog: v.querySelector('.rmd-progreso').textContent, chips: [...v.querySelectorAll('.rmd-mismov-chip')].map((b) => b.textContent.trim()),
        filas: [...v.querySelectorAll('.rmd-mismov-tabla tbody tr')].map((tr) => [...tr.cells].map((c) => c.innerText.replace(/\\s+/g, ' ').trim())),
        hoy: v.querySelector('.rmd-mm-desde').value === v.querySelector('.rmd-mm-hasta').value, usuarioEnFiltro: window.__lect.some((x) => x.ent === 'MD_ES_PASO' && x.f.includes('CJESUSZ')) }; }""")
    if len(sys.argv) > 1: pg.screenshot(path=sys.argv[1])
    pg.context.grant_permissions(["clipboard-read", "clipboard-write"])
    pg.locator(".rmd-mismov .rmd-btn", has_text="Copiar para el reporte").click(); pg.wait_for_timeout(300)
    r["copia"] = pg.evaluate("() => navigator.clipboard.readText()")
    r["prog_copia"] = pg.evaluate("() => document.querySelector('.rmd-mismov .rmd-progreso').textContent")
    pg.locator(".rmd-mismov-chip", has_text="Autorizado").click()
    r["filtrado"] = pg.evaluate("() => [...document.querySelectorAll('.rmd-mismov-tabla tbody tr')].length")
    with pg.expect_download() as d: pg.locator(".rmd-mismov .rmd-btn", has_text="Exportar Excel").click()
    r["excel"] = d.value.suggested_filename; import zipfile; z = zipfile.ZipFile(d.value.path()); xml = "".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xml")); r["excel_aut"] = "Autorizado en SAP" in xml and "VM" in xml; r["excel_ok"] = "IBUPROFENO" in "".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xml"))
    br.close()
print(json.dumps(r, ensure_ascii=False, indent=1)); print("errores:", errores)
ok = (r["titulo"] == "Mis movimientos en RMD" and r["chips"] == ["3 Todos", "1 Ingresado", "1 Autorizado", "1 Suspendido"] and len(r["filas"]) == 3 and r["filtrado"] == 1 and r["excel"].startswith("Mis movimientos RMD CJESUSZ") and r["excel_ok"] and r["hoy"]
      and r["usuarioEnFiltro"] and "3 RMD con movimientos de CJESUSZ" in r["prog"] and r["filas"][0][0].startswith("2202609200") and "Pasó a Suspendido" in r["filas"][0][3]
      and "2 pasos modificados" in r["filas"][2][3] and not errores
      and r["filas"][1][6].endswith("VM") and "11:40" in r["filas"][1][6] and r["filas"][2][6] == "Aún no" and r["excel_aut"]
      and len(r["copia"].split("\r\n")) == 3 and all(len(l.split("\t")) == 10 for l in r["copia"].split("\r\n")) and "\tVM" in r["copia"] and "copiadas" in r["prog_copia"])
print("PASA" if ok else "FALLA"); sys.exit(0 if ok else 1)
