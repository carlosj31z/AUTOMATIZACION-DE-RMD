"""Pruebas locales (sin portal, no escriben nada) de la v1.128.0:

- «Cambiar paso»: parecido de textos, palabras clave, elección de los parecidos, puntaje («★ Recomendado») y órdenes.
- Encaje: todas las clases de ventana del script (.rmd-modal) y los menús/paneles flotantes quedan dentro de la pantalla
  en varios tamaños (escritorio, laptop, zoom y móvil), con el pie (botones) visible.

    python tampermonkey/pruebas/qa_pasos_similares.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from util import SCRIPT
from playwright.sync_api import sync_playwright

src = SCRIPT.read_text(encoding="utf-8")
URL = "https://maqueta.local/cp.portal/ui5appruntime.html"
MAQ = "<!doctype html><html class='sapUiTheme-sap_fiori_3_dark'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body class='sapUiBody'><div id='app'></div></body></html>"
RES = []


def registrar(nombre, ok, det=""):
    RES.append(ok); print(("PASA  " if ok else "FALLA ") + nombre + (f" — {det}" if det else ""), flush=True)


CLASES = ["", "rmd-adv", "rmd-cmp-ventana", "rmd-cont-ventana", "rmd-cp-ventana", "rmd-cr", "rmd-espec-form", "rmd-modal-aviso", "rmd-modal-confirma", "rmd-modal-exito",
          "rmd-pp", "rmd-pp-imp", "rmd-pp-ing", "rmd-reglas", "rmd-reglas-detalle", "rmd-v-reporte"]
TAMANOS = [(1920, 945), (1366, 768), (1280, 720), (1024, 640), (900, 560), (800, 600), (700, 500)]

ABRIR = """([cls, filas]) => { document.querySelectorAll('.rmd-modal-fondo').forEach((x) => x.remove());
  const f = document.createElement('div'); f.className = 'rmd-modal-fondo';
  f.innerHTML = `<div class="rmd-modal ${cls}"><h3>Ventana de prueba ${cls}</h3><div class="rmd-modal-cuerpo"><table class="rmd-tabla"><tbody>${Array.from({ length: filas }, (_, i) => `<tr><td>${i}</td><td>${'texto largo '.repeat(14)}</td><td>2202609013</td><td>Autorizado</td></tr>`).join('')}</tbody></table></div><div class="rmd-modal-pie"><button class="rmd-btn">Cancelar</button><button class="rmd-btn primario">Aceptar</button></div></div>`;
  document.body.appendChild(f); }"""
MEDIR = """() => { const m = document.querySelector('.rmd-modal-fondo > .rmd-modal'), r = m.getBoundingClientRect(), p = m.querySelector('.rmd-modal-pie').getBoundingClientRect(), W = document.documentElement.clientWidth, H = innerHeight;
  return { dentro: r.left >= 0 && r.top >= 0 && r.right <= W + 0.5 && r.bottom <= H + 0.5, pie: p.bottom <= H + 0.5 && p.top >= 0 && p.right <= W + 0.5, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], W, H, enc: m.classList.contains('rmd-encajada'), scroll: document.documentElement.scrollWidth > W }; }"""

with sync_playwright() as p:
    br = p.chromium.launch(headless=True, executable_path=os.environ.get("CHROME") or None)
    pg = br.new_page(viewport={"width": 1366, "height": 768})
    pg.route("**/ui5appruntime.html", lambda r: r.fulfill(status=200, content_type="text/html; charset=utf-8", body=MAQ))
    pg.add_init_script("window.__rmdSinInicio = true")
    pg.goto(URL); pg.evaluate(src); pg.wait_for_timeout(600)

    # ── PS1–PS4: lógica de sugerencias ──
    r = pg.evaluate("""() => { const S = window.__rmdStats.pasosSimilares;
      const base = 'Fecha y hora de inicio del mezclado';
      return { igual: S.similitud(base, 'FECHA Y HORA DE INICIO DEL MEZCLADO:'), cerca: S.similitud(base, 'Fecha y hora de inicio de mezcla'), lejos: S.similitud(base, 'Temperatura del area de trabajo'),
        claves: S.claves('Registrar la fecha y hora de inicio del mezclado'), vacio: S.claves('a de la') }; }""")
    registrar("PS1 Parecido de textos: mismo texto en MAYÚSCULAS ≈ 100 %, variante cercana alta, otro paso baja", r["igual"] > 0.95 and 0.5 < r["cerca"] < r["igual"] and r["lejos"] < 0.2, str(r))
    registrar("PS2 Palabras clave para buscar: las 3 más largas sin palabras vacías", r["claves"] == ["registrar", "mezclado", "inicio"] and r["vacio"] == [], str(r["claves"]))
    r = pg.evaluate("""() => { const S = window.__rmdStats.pasosSimilares, actual = { descripcion: 'Fecha y hora de inicio del mezclado', tipoDatoId: 441 };
      const c = [
        { pasoId: 'a', codigo: '100', descripcion: 'Fecha y hora de inicio del mezclado', tipoDatoId_iMaestraId: 441, uso: { aut: 2, ing: 0, total: 3 }, fechaRegistro: new Date('2024-01-02') },
        { pasoId: 'b', codigo: '200', descripcion: 'Fecha y hora de inicio de mezclado', tipoDatoId_iMaestraId: 441, uso: { aut: 140, ing: 12, total: 300 }, fechaRegistro: new Date('2023-05-02') },
        { pasoId: 'c', codigo: '300', descripcion: 'Fecha y hora de inicio del mezclado (válido)', tipoDatoId_iMaestraId: 441, uso: { aut: 150, ing: 20, total: 320 }, fechaRegistro: new Date('2025-05-02') },
        { pasoId: 'd', codigo: '400', descripcion: 'FECHA Y HORA DE INICIO DE MEZCLADO', tipoDatoId_iMaestraId: 443, uso: { aut: 145, ing: 15, total: 310 }, fechaRegistro: new Date('2026-05-02') },
        { pasoId: 'e', codigo: '500', descripcion: 'Temperatura del area', tipoDatoId_iMaestraId: 441, uso: { aut: 900, ing: 50, total: 990 }, fechaRegistro: new Date('2026-06-02') },
      ];
      const el = S.elegir(c, actual.descripcion, 25); S.puntuar(el, actual);
      const o = (k) => S.ordenar(el, k).map((x) => x.codigo);
      return { elegidos: el.map((x) => x.codigo), rec: el.filter((x) => x.recomendado).map((x) => x.codigo), sug: o('sugerido'), aut: o('aut'), ing: o('ing'), fecha: o('fecha'), sim: o('sim'),
        chipsC: S.chips(el.find((x) => x.codigo === '300')), chipsD: S.chips(el.find((x) => x.codigo === '400')), motivosB: el.find((x) => x.codigo === '200').motivos }; }""")
    registrar("PS3 Sugeridos: se descarta el paso poco parecido; ★ Recomendado = parecido + más usado en Autorizados/Ingresados + mismo tipo de dato + sin tilde",
              "500" not in r["elegidos"] and r["rec"] == ["200"] and r["sug"][0] == "200" and r["sug"].index("300") > 0 and r["sug"].index("400") > 0, str(r))
    registrar("PS4 Órdenes (Autorizados, Ingresados, más reciente, más parecido) y avisos (Con tilde, Otro tipo de dato, MAYÚSCULAS)",
              r["aut"][0] == "300" and r["ing"][0] == "300" and r["fecha"][0] == "400" and r["sim"][0] in ("100", "400") and "Con tilde" in r["chipsC"] and "Otro tipo de dato" in r["chipsD"] and "MAYÚSCULAS" in r["chipsD"] and any("Autorizado" in m for m in r["motivosB"]),
              f"aut={r['aut']} ing={r['ing']} fecha={r['fecha']} sim={r['sim']}")

    # ── PS5: todas las ventanas del script dentro de la pantalla ──
    malos = []
    for (w, h) in TAMANOS:
        pg.set_viewport_size({"width": w, "height": h}); pg.wait_for_timeout(80)
        for cls in CLASES:
            for filas in (2, 60):
                pg.evaluate(ABRIR, [cls, filas]); pg.wait_for_timeout(60)
                m = pg.evaluate(MEDIR)
                if not (m["dentro"] and m["pie"] and not m["scroll"]): malos.append((w, h, cls or "(normal)", filas, m))
    registrar(f"PS5 Ventanas del script ({len(CLASES)} tipos × {len(TAMANOS)} tamaños × contenido corto/largo) dentro de la pantalla y con sus botones visibles", not malos, str(malos[:6]))
    # al achicar la ventana con la ventana abierta (resize) se vuelve a encajar
    pg.set_viewport_size({"width": 1920, "height": 945}); pg.evaluate(ABRIR, ["rmd-cont-ventana", 60]); pg.wait_for_timeout(80)
    pg.set_viewport_size({"width": 760, "height": 480}); pg.wait_for_timeout(250); m = pg.evaluate(MEDIR)
    registrar("PS6 Al achicar el navegador con una ventana abierta, se reacomoda dentro de la pantalla", m["dentro"] and m["pie"], str(m))
    pg.evaluate("document.querySelectorAll('.rmd-modal-fondo').forEach((x) => x.remove())")

    # ── PS7: menús y paneles flotantes ──
    pg.set_viewport_size({"width": 1024, "height": 600})
    r = pg.evaluate("""async () => { const out = [];
      for (const [cls, x, y, filas] of [['rmd-menu', 900, 560, 30], ['rmd-menu-filtro-col', 990, 580, 12], ['rmd-cc-elegir', -40, 500, 20], ['rmd-rec-detalle', 600, 590, 40]]) {
        const m = document.createElement('div'); m.className = cls; m.style.position = 'fixed'; m.style.left = x + 'px'; m.style.top = y + 'px'; m.style.width = '300px';
        m.innerHTML = Array.from({ length: filas }, (_, i) => `<div style="padding:6px">opción ${i}</div>`).join(''); document.body.appendChild(m);
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        const r = m.getBoundingClientRect(); out.push([cls, r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]]); m.remove(); }
      const c = document.createElement('div'); c.className = 'rmd-creado'; c.textContent = 'Paso creado'; document.body.appendChild(c); return out; }""")
    pg.set_viewport_size({"width": 360, "height": 640}); pg.wait_for_timeout(100)
    cr = pg.evaluate("(() => { const r = document.querySelector('.rmd-creado').getBoundingClientRect(); return [r.left >= 0 && r.right <= innerWidth, Math.round(r.left), Math.round(r.right)]; })()")
    registrar("PS7 Menús y paneles flotantes (Exportar, filtro de columna, + CC, detalle) se corren dentro de la pantalla; el aviso «Paso creado» cabe en un celular", all(x[1] for x in r) and cr[0], f"{r} creado={cr}")
    br.close()

print(f"\n{sum(RES)} de {len(RES)} pruebas pasan")
sys.exit(0 if all(RES) else 1)
