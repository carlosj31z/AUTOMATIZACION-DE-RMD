"""Utilidades de las pruebas del userscript: abren una pestaña propia en el Chrome ya autenticado (puerto de depuración 9222).

Requisitos: Chrome abierto con `--remote-debugging-port=9222` y la sesión del portal iniciada por una persona.
Variables opcionales: RMD_LAUNCHPAD_URL (por defecto la de .env.example), QA_W / QA_H (tamaño de la ventana).
"""
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ / "tampermonkey" / "rmd-ui-mejoras.user.js"


def url_portal() -> str:
    if os.environ.get("RMD_LAUNCHPAD_URL"):
        return os.environ["RMD_LAUNCHPAD_URL"]
    for linea in (RAIZ / ".env.example").read_text(encoding="utf-8").splitlines():
        if linea.startswith("RMD_LAUNCHPAD_URL="):
            return linea.split("=", 1)[1].strip()
    raise RuntimeError("Define RMD_LAUNCHPAD_URL")


def abrir(p):
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    pg = b.contexts[0].new_page()
    pg.set_viewport_size({"width": int(os.environ.get("QA_W", 1920)), "height": int(os.environ.get("QA_H", 945))})
    pg.goto(url_portal())
    pg.frame_locator("iframe[src*='ui5appruntime']").get_by_role("button", name="Ir", exact=True).first.wait_for(timeout=120000)
    return b, pg, next(f for f in pg.frames if "ui5appruntime" in f.url)


def abrir_dialogo(fr, pg, texto_fila, boton, n=None):
    """Pulsa (API de UI5) el botón `boton` de la fila que contiene `texto_fila` (o la fila n) del diálogo superior."""
    fr.evaluate("""([t, b, n]) => { const d=[...document.querySelectorAll('[role=dialog]')].filter(x=>x.getClientRects().length).pop();
      const filas=[...d.querySelectorAll('tbody tr')].filter(r=>r.getClientRects().length && !/SubRow/.test(r.className));
      const tr = n!=null ? filas[n] : filas.find(r=>r.textContent.includes(t)); const bt=[...tr.querySelectorAll('button')].find(x=>x.title===b);
      sap.ui.getCore().byId(bt.id.replace(/-inner$/,'')).firePress(); }""", [texto_fila, boton, n])
    pg.wait_for_timeout(5000)


def marcar_fila(fr, pg, orden):
    """Clic real en la casilla de selección de la fila con ese Orden (diálogo superior)."""
    tr_id = fr.evaluate("""(o) => { const d=[...document.querySelectorAll('.sapMDialog')].filter(x=>x.getClientRects().length).pop(); const t=d.querySelector('table');
      const ths=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim().toUpperCase()); const iO=ths.indexOf('ORDEN');
      const tr=[...t.querySelectorAll('tbody tr')].filter(r=>!/SubRow/.test(r.className)).find(r=>{const i=r.children[iO]&&r.children[iO].querySelector('input'); return i&&i.value===String(o)});
      if(!tr) return null; tr.scrollIntoView({block:'center'}); return tr.id; }""", orden)
    pg.wait_for_timeout(600)
    if not tr_id:
        raise SystemExit(f"no encuentro la fila {orden}")
    fr.locator(f"[id='{tr_id}'] td.sapMListTblSelCol").click()
    pg.wait_for_timeout(400)
    return tr_id


def cerrar_todo(fr, pg):
    """Cierra todas las ventanas de SAP abiertas (reintenta: tras cerrar una, la de debajo tarda un instante en estabilizarse)."""
    for _ in range(12):
        if not fr.evaluate("[...document.querySelectorAll('.sapMDialog')].some(d=>d.getClientRects().length)"):
            return
        for nombre in ("Cancelar", "Cerrar"):
            try:
                fr.get_by_role("dialog").last.get_by_role("button", name=nombre).click(timeout=4000)
                break
            except Exception:
                continue
        pg.wait_for_timeout(1000)


def abrir_con_inyeccion_temprana(b, src, ancho=1415, alto=886, espera=180):
    """Abre el portal en una pestaña nueva e inyecta el script en cuanto el iframe de la app tiene DOM, sin esperar a que la app esté montada
    (como hace Tampermonkey con document-idle). Devuelve (pagina, frame, segundos_hasta_inyectar) cuando aparece el botón "Ir" de la app."""
    import time
    pg = b.contexts[0].new_page()
    pg.set_viewport_size({"width": ancho, "height": alto})
    t0 = time.time()
    pg.goto(url_portal(), wait_until="commit")
    inyectado = None
    while time.time() - t0 < espera:
        pg.wait_for_timeout(150)
        fr = next((f for f in pg.frames if "ui5appruntime" in f.url), None)
        if fr is None:
            continue
        try:
            if inyectado is None:
                estado = fr.evaluate("({rs: document.readyState, body: !!document.body})")
                if estado["body"] and estado["rs"] in ("interactive", "complete"):
                    fr.evaluate(src); inyectado = round(time.time() - t0, 1)
                continue
            if fr.evaluate("!!document.querySelector('[id$=btnGo]')"):
                pg.wait_for_timeout(1500)
                return pg, fr, inyectado
        except Exception:
            continue
    raise RuntimeError("La app no llegó a mostrarse")

