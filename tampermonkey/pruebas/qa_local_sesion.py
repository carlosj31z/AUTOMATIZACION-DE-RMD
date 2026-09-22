"""Prueba local (maqueta, sin portal ni sesión) del aviso de sesión por inactividad: el script debe pulsar
"Continuar trabajando" solo. Se sirve una página cuya URL NO contiene 'ui5appruntime' (así el script entra
por la rama del "shell" en vez de la de la app) y se crea el aviso tal como lo describió el usuario:
título "Atención", texto "Debido a la inactividad, se finalizará su sesión en N Minutos.",
botones "Continuar trabajando" / "Salir".

    python tampermonkey/pruebas/qa_local_sesion.py
"""
import os, sys, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from util import SCRIPT
from playwright.sync_api import sync_playwright

src = SCRIPT.read_text(encoding="utf-8")
URL = "https://maqueta.local/site/portalprd"          # sin 'ui5appruntime': rama del shell
RES = []


def registrar(nombre, ok, detalle=""):
    RES.append((nombre, bool(ok), detalle)); print(("PASA  " if ok else "FALLA ") + nombre + (f" — {detalle}" if detalle else ""), flush=True)


def prueba(nombre):
    def deco(fn):
        try:
            r = fn()
            if r is None or r is True: registrar(nombre, True)
            elif r is False: registrar(nombre, False)
            else: registrar(nombre, r[0], r[1])
        except Exception as e:
            registrar(nombre, False, "EXCEPCIÓN " + str(e)[:220]); traceback.print_exc(limit=2)
        return fn
    return deco


MAQUETA = """<!doctype html><html><head><meta charset="utf-8"><title>maqueta del shell</title></head><body>
<script>
window.__crearAviso = function (minutos) {
  const d = document.createElement('div'); d.className = 'sapMDialog sapMMessageDialog'; d.setAttribute('role', 'alertdialog');
  d.innerHTML = `<header><h2 class="sapMTitle">Atención</h2></header><section>Debido a la inactividad, se finalizará su sesión en ${minutos} Minutos.</section>
    <footer><button id="btnSalir">Salir</button><button id="btnSeguir">Continuar trabajando</button></footer>`;
  d.querySelector('#btnSeguir').addEventListener('click', () => { window.__pulsado = 'seguir'; d.remove(); });
  d.querySelector('#btnSalir').addEventListener('click', () => { window.__pulsado = 'salir'; d.remove(); });
  document.body.appendChild(d); return d;
};
</script></body></html>"""


def contexto(p, headless=True):
    br = p.chromium.launch(channel="chrome", headless=headless)
    pg = br.new_page(viewport={"width": 1000, "height": 700})
    errores = []; pg.on("pageerror", lambda e: errores.append(str(e)[:200]))
    pg.route("**/*", lambda r: r.fulfill(status=200, content_type="text/html; charset=utf-8", body=MAQUETA) if r.request.url.startswith(URL) and "?" not in r.request.url.split(URL)[-1][:1] else r.continue_())
    pg.goto(URL); pg.evaluate(src); pg.wait_for_timeout(500)
    return br, pg, errores


with sync_playwright() as p:
    br, pg, errores = contexto(p)

    @prueba("S1 El aviso de inactividad se pulsa solo ('Continuar trabajando'), sin tocar nada")
    def _():
        pg.evaluate("() => window.__crearAviso(3)"); pg.wait_for_timeout(1500)
        return (pg.evaluate("window.__pulsado") == "seguir" and pg.evaluate("!document.querySelector('.sapMDialog')")), str(pg.evaluate("window.__pulsado"))

    @prueba("S2 Si aparece varias veces (avisos sucesivos) cada uno se pulsa por su cuenta")
    def _():
        pg.evaluate("() => { window.__pulsado = null; window.__crearAviso(2); }"); pg.wait_for_timeout(1500)
        a = pg.evaluate("window.__pulsado")
        pg.evaluate("() => { window.__pulsado = null; window.__crearAviso(1); }"); pg.wait_for_timeout(1500)
        b_ = pg.evaluate("window.__pulsado")
        return (a == "seguir" and b_ == "seguir"), f"{a} {b_}"

    @prueba("S3 Un diálogo sin relación con la sesión no se toca (no se busca 'Continuar trabajando' a ciegas)")
    def _():
        pg.evaluate("""() => { const d = document.createElement('div'); d.className = 'sapMDialog sapMMessageDialog'; d.id='ajeno';
          d.innerHTML = '<header><h2 class="sapMTitle">Éxito</h2></header><section>Se guardaron correctamente los cambios.</section><footer><button>OK</button></footer>'; document.body.appendChild(d); }""")
        pg.wait_for_timeout(1500)
        ok = pg.evaluate("!!document.getElementById('ajeno')")
        pg.evaluate("() => { const a = document.getElementById('ajeno'); if (a) a.remove(); }")   # limpia para no interferir con las pruebas siguientes
        return ok

    @prueba("S4 Con 'Prolongar la sesión' apagado (localStorage), el aviso NO se pulsa solo")
    def _():
        pg.evaluate("() => { localStorage.setItem('rmdUiMejoras', JSON.stringify({activo: true, sesion: false})); window.__pulsado = null; window.__crearAviso(3); }")
        pg.wait_for_timeout(1500)
        ok = pg.evaluate("window.__pulsado") is None and pg.evaluate("!!document.querySelector('.sapMDialog')")
        pg.evaluate("() => { document.querySelector('.sapMDialog').remove(); localStorage.removeItem('rmdUiMejoras'); }")
        return ok, str(pg.evaluate("window.__pulsado"))

    print("\n══ RESUMEN ══")
    fallas = [r for r in RES if not r[1]]
    print(f"{len(RES) - len(fallas)}/{len(RES)} pruebas pasan")
    for n, ok, d in fallas: print("  FALLA:", n, "—", d)
    print("errores de script:", errores[:5])
    br.close()
    sys.exit(1 if fallas or errores else 0)
