"""Pruebas locales del userscript sobre una MAQUETA del DOM del portal: no necesitan sesión, ni el portal, ni escriben nada.

Lanzan su propio Chrome (headless, perfil temporal) y sirven la maqueta desde una ruta simulada `.../ui5appruntime.html`, que es la que el script exige.
Usan ratón y teclado reales (eventos de confianza), así que el aviso de cambios sin guardar se comprueba igual que en el portal.
La maqueta imita solo lo que el script lee: diálogo con cabecera, barra de la tabla, tabla de pasos con casillas, pie con Cancelar y mensajes del portal.
No sustituye a `qa_estricto.py` (portal real), pero sirve cuando no hay sesión y cubre la lógica: aviso propio, guardado sin falsos avisos y predecesores.

    python tampermonkey/pruebas/qa_local.py
"""
import json, os, re, sys, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from util import SCRIPT
from playwright.sync_api import sync_playwright

src = SCRIPT.read_text(encoding="utf-8")
URL = "https://maqueta.local/cp.portal/ui5appruntime.html"
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


MAQUETA = r"""<!doctype html><html class="sapUiTheme-sap_fiori_3_dark"><head><meta charset="utf-8"><title>maqueta</title>
<style>body{margin:0;background:#1d232a;color:#fafafa;font:14px Arial} .sapMDialog{position:absolute;left:40px;top:30px;width:1330px;background:#29313a;border:1px solid #3a4552} .sapMCb{display:inline-block;width:16px;height:16px;border:1px solid #9aa;box-sizing:border-box;vertical-align:middle} .sapMCb[aria-checked=true]{background:#1b8dec}
.sapMDialog header{padding:10px 16px;height:24px} .sapMDialogScrollCont{width:auto} table{border-collapse:collapse} td,th{padding:4px 6px;text-align:left} footer{padding:10px;text-align:right}
.sapMMessageDialog{left:500px;top:300px;width:360px;padding:12px} input{width:60px}</style></head><body class="sapUiBody"><div id="sap-ui-static"></div><div id="app"></div>
<script>
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const entrada = (v, dis) => `<td class="sapMListTblCell"><div class="sapMInputBase"><div class="sapMInputBaseContentWrapper"><input class="sapMInputBaseInner" value="${esc(v)}" ${dis ? 'disabled' : ''}></div></div></td>`;
const casilla = (on) => `<td class="sapMListTblCell"><div role="checkbox" class="sapMCb" tabindex="0" aria-checked="${!!on}"><div class="sapMCbBg"></div></div></td>`;
window.__maq = {
  ruido: { decimal: '0' },                                             // lo que el "portal" reescribe tras guardar
  mensaje(titulo, texto) {
    const m = document.createElement('div'); m.className = 'sapMDialog sapMMessageDialog'; m.setAttribute('role', 'alertdialog');
    m.innerHTML = `<header><h2 class="sapMTitle">${esc(titulo)}</h2></header><section>${esc(texto)}</section><footer><button>OK</button></footer>`;
    m.querySelector('button').addEventListener('click', () => m.remove()); document.body.appendChild(m);
  },
  dialogo(titulo, filas, opciones) {
    opciones = opciones || {};
    const d = document.createElement('div'); d.className = 'sapMDialog sapMDialogOpen'; d.setAttribute('role', 'dialog'); d.id = '__dialog' + (++window.__maq.n);
    const cuerpo = filas.map((f, k) => `<tr class="sapMLIB sapMListTblRow" id="__item${window.__maq.n}-${k}"><td class="sapMListTblHighlightCell"></td>
      <td class="sapMListTblSelCol"><div role="checkbox" class="sapMCb" tabindex="0" aria-checked="false"><div class="sapMCbBg"></div></div></td>
      ${entrada(f.orden != null ? f.orden : k + 1)}${entrada(f.dep || '')}<td class="sapMListTblCell">${esc(f.cod || 1000 + k)}</td><td class="sapMListTblCell"><span class="sapMText">${esc(f.desc)}</span></td>
      ${entrada(f.tipo, false)}${entrada(f.decimal || '')}${casilla(f.cc)}${casilla(f.edit)}${opciones.pmop ? casilla(f.pmop) : ''}</tr>`).join('');
    d.innerHTML = `<header><div class="sapMBar"><div class="sapMBarMiddle"><h2 class="sapMTitle">${esc(titulo)}</h2></div></div></header>
      <section class="sapMDialogSection"><div class="sapMDialogScrollCont">
        <div class="sapMListHdr sapMTB"><div class="sapMTitle"><span>Pasos (${filas.length})</span></div><div class="sapMTBSpacer"></div><div class="sapMTBSeparator"></div>
          <button title="Imprimir">P</button><button title="Adicionar Pasos RMD">+</button><button title="Guardar">G</button><button title="Eliminar">X</button></div>
        <table class="sapMListTbl sapMListUl sapMListModeMultiSelect" id="__tbl${window.__maq.n}-listUl"><thead><tr><th class="sapMListTblHighlightCol"></th><th class="sapMListTblSelCol"></th>
          <th>Orden</th><th>Depende</th><th>Código</th><th>Descripción</th><th>Tipo Dato</th><th>Decimal</th><th>Estado CC</th><th>Edit</th>${opciones.pmop ? '<th>PM OP</th>' : ''}</tr></thead><tbody>${cuerpo}</tbody></table>
      </div></section><footer><button id="cancelar${window.__maq.n}">Cancelar</button></footer>`;
    d.addEventListener('click', (e) => {                                  // comportamiento mínimo de UI5: casillas y botones (en fase de burbuja, como UI5)
      const c = e.target.closest('[role=checkbox]'); if (c) { c.setAttribute('aria-checked', c.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.textContent.trim() === 'Cancelar') d.remove();
      else if (b.title === 'Guardar') {                                   // el "portal" guarda: pasa un rato y reescribe valores (ruido) y responde
        opciones.guardados = (opciones.guardados || 0) + 1;
        setTimeout(() => {
          const t = d.querySelectorAll('tbody tr')[1]; if (t && opciones.ruido !== false) t.querySelectorAll('input')[3].value = window.__maq.ruido.decimal;
          if (opciones.respuesta !== 'ninguna') window.__maq.mensaje(opciones.respuesta === 'fallo' ? 'Advertencia' : 'Éxito', opciones.respuesta === 'fallo' ? 'Faltan campos obligatorios.' : 'Se guardaron correctamente los cambios.');
        }, opciones.retraso || 300);
      }
    });
    document.getElementById('app').appendChild(d); return d.id;
  },
  n: 0,
};
</script></body></html>"""

PRECAUCIONES = [
    {"desc": "EVITAR EL INGRESO AL AREA DE TRABAJO SI PRESENTA SINTOMAS DE ENFERMEDAD", "tipo": "Verificación Check"},
    {"desc": "USAR DURANTE EL PROCESO EL UNIFORME COMPLETO", "tipo": "Verificación Check", "dep": "1000 (1)"},
    {"desc": "EN DETERMINADOS PASOS USAR GUANTES DE CAÑA ALTA", "tipo": "Verificación Check", "dep": "1001 (2)"},
    {"desc": "CUIDAR SUS IMPLEMENTOS DE TRABAJO", "tipo": "Verificación Check", "dep": "1002 (3)"},
    {"desc": "CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO.", "tipo": "Verificación Check"},                # sin predecesor
]


def contexto(p):
    br = p.chromium.launch(channel="chrome", headless=True)
    pg = br.new_page(viewport={"width": 1415, "height": 886})
    errores = []; pg.on("pageerror", lambda e: errores.append(str(e)[:200]))
    pg.route("**/ui5appruntime.html", lambda r: r.fulfill(status=200, content_type="text/html; charset=utf-8", body=MAQUETA))
    pg.goto(URL); pg.evaluate(src); pg.wait_for_timeout(800)
    return br, pg, errores


def abrir(pg, filas, titulo="2202609081 - PRODUCTO DE PRUEBA", **opciones):
    """Crea el diálogo de pasos en la maqueta (pasando opciones al 'portal': respuesta='exito'|'fallo'|'ninguna', ruido=False)."""
    pg.evaluate("([t, f, o]) => { window.__opc = o; window.__maq.dialogo(t, f, window.__opc); }", [titulo, filas, opciones])
    pg.wait_for_timeout(1500)
    return pg.evaluate("[...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].pop().id")


def n_dialogos(pg): return pg.evaluate("document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)').length")
def cerrar_todo(pg):
    for _ in range(6):
        if pg.evaluate("!!document.querySelector('.rmd-modal-aviso')"): pg.locator(".rmd-modal-aviso button").first.click(); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelectorAll('.sapMMessageDialog').forEach(x=>x.remove())")
        if n_dialogos(pg) == 0: return
        pg.evaluate("document.querySelectorAll('.sapMDialog').forEach(x=>x.remove())")


def aviso(pg):
    return pg.evaluate("""() => { const m = document.querySelector('.rmd-modal-aviso'); if (!m) return null; const q = m.getBoundingClientRect(), f = m.closest('.rmd-modal-fondo').getBoundingClientRect();
      return { titulo: (m.querySelector('h3')||{}).textContent, botones: [...m.querySelectorAll('button')].map(b => b.textContent.trim()), cx: Math.round(q.left + q.width / 2), cy: Math.round(q.top + q.height / 2),
               vw: innerWidth, vh: innerHeight, fondo: [Math.round(f.width), Math.round(f.height)], foco: document.activeElement && document.activeElement.textContent.trim() }; }""")


def tocar_casilla(pg, k=1, columna="ESTADO CC"):
    pg.evaluate("""([k, c]) => { const d = [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].pop(); const ths = [...d.querySelectorAll('thead th')].map(x => x.textContent.trim().toUpperCase());
      const tr = d.querySelectorAll('tbody tr')[k]; window.__casilla = tr.children[ths.indexOf(c)].querySelector('[role=checkbox]'); window.__casilla.id = 'casilla-prueba'; }""", [k, columna])
    pg.locator("#casilla-prueba").click(); pg.evaluate("document.getElementById('casilla-prueba').removeAttribute('id')"); pg.wait_for_timeout(350)


def cancelar(pg):
    pg.locator(".sapMDialog:not(.sapMMessageDialog) footer button", has_text="Cancelar").last.click(); pg.wait_for_timeout(800)


def sucia(pg): return pg.evaluate("(window.__rmdStats.sucias().pop() || [null])[0]")
def guardar(pg): pg.locator(".sapMDialog:not(.sapMMessageDialog) button[title=Guardar]").last.click(); pg.wait_for_timeout(200)


def leer_alertas(pg):
    return pg.evaluate("""() => { const d = [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].pop(); const ths = [...d.querySelectorAll('thead th')].map(x => x.textContent.trim().toUpperCase());
      const iD = ths.indexOf('DEPENDE'), iDes = ths.indexOf('DESCRIPCIÓN'); return { lista: window.__rmdStats.listas().pop(), cuenta: (d.querySelector('#rmd-filtro-bar .rmd-alerta') || {}).textContent,
        filas: [...d.querySelectorAll('tbody tr')].map((tr, k) => ({ k, falta: tr.children[iD].classList.contains('rmd-falta'), aviso: tr.children[iD].title, faltaDes: tr.children[iDes].classList.contains('rmd-falta'), avisoDes: tr.children[iDes].title })) }; }""")


with sync_playwright() as p:
    br, pg, errores = contexto(p)

    # ───────── M. Aviso de cambios sin guardar ─────────
    abrir(pg, PRECAUCIONES)
    @prueba("LM1 Tocar una casilla y pulsar Cancelar muestra el aviso propio, centrado en la página, con botones claros (no el cuadro del navegador)")
    def _():
        nativos = []; pg.on("dialog", lambda dlg: (nativos.append(dlg.message), dlg.dismiss()))
        tocar_casilla(pg, 1); cancelar(pg); av = aviso(pg)
        centrado = bool(av) and abs(av["cx"] - av["vw"] / 2) <= 2 and abs(av["cy"] - av["vh"] / 2) <= 2 and av["fondo"] == [av["vw"], av["vh"]]
        return (bool(av) and av["titulo"] == "Tienes cambios sin guardar" and av["botones"] == ["Descartar y cerrar", "Seguir editando"] and centrado and not nativos and n_dialogos(pg) == 1 and av["foco"] == "Seguir editando"), str(av) + f" nativos={nativos}"
    @prueba("LM2 'Seguir editando', Escape y Enter conservan el trabajo; 'Descartar y cerrar' cierra")
    def _():
        pg.locator(".rmd-modal-aviso button", has_text="Seguir editando").click(); pg.wait_for_timeout(500)
        a = (aviso(pg) is None, n_dialogos(pg) == 1, sucia(pg))
        cancelar(pg); e1 = aviso(pg) is not None; pg.keyboard.press("Escape"); pg.wait_for_timeout(500); b_ = (aviso(pg) is None, n_dialogos(pg) == 1)
        cancelar(pg); e2 = aviso(pg) is not None; pg.keyboard.press("Enter"); pg.wait_for_timeout(500); c = (aviso(pg) is None, n_dialogos(pg) == 1)
        cancelar(pg); pg.locator(".rmd-modal-aviso button", has_text="Descartar y cerrar").click(); pg.wait_for_timeout(800); d_ = (aviso(pg) is None, n_dialogos(pg) == 0)
        return (a == (True, True, True) and e1 and b_ == (True, True) and e2 and c == (True, True) and d_ == (True, True)), f"{a} {e1} {b_} {e2} {c} {d_}"
    @prueba("LM3 Tab entre los dos botones del aviso y Enter sobre el botón enfocado no descartan por error")
    def _():
        abrir(pg, PRECAUCIONES); tocar_casilla(pg, 1); cancelar(pg); f0 = aviso(pg)["foco"]; pg.keyboard.press("Tab"); pg.wait_for_timeout(200); f1 = aviso(pg)["foco"]
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400); ok = aviso(pg) is None and n_dialogos(pg) == 1
        cerrar_todo(pg); return (f0 == "Seguir editando" and f1 == "Descartar y cerrar" and ok), f"{f0} -> {f1}"
    @prueba("LM4 Guardar y luego Cancelar NO avisa aunque el portal cambie valores tras guardar: ni con Cancelar inmediato ni pasado un rato (aviso falso corregido)")
    def _():
        res = []
        for espera in (0, 1800):
            abrir(pg, PRECAUCIONES, respuesta="exito"); tocar_casilla(pg, 1); guardar(pg)
            if espera: pg.wait_for_timeout(espera)
            antes = sucia(pg); cancelar(pg); av = aviso(pg); res.append((antes, av is None, n_dialogos(pg) == 0)); cerrar_todo(pg)
        return all(x == (False, True, True) for x in res), str(res)
    @prueba("LM5 Lo mismo con Ctrl+S")
    def _():
        abrir(pg, PRECAUCIONES, respuesta="exito"); tocar_casilla(pg, 1); pg.keyboard.press("Control+s"); pg.wait_for_timeout(1500); cancelar(pg)
        ok = aviso(pg) is None and n_dialogos(pg) == 0; cerrar_todo(pg); return ok, ""
    @prueba("LM6 Si el portal responde con una Advertencia al guardar (no se guardó), la ventana vuelve a contar como sin guardar")
    def _():
        abrir(pg, PRECAUCIONES, respuesta="fallo"); tocar_casilla(pg, 1); guardar(pg); pg.wait_for_timeout(1200)
        pg.locator(".sapMMessageDialog button").click(); pg.wait_for_timeout(400)
        s_ = sucia(pg); cancelar(pg); av = aviso(pg); cerrar_todo(pg)
        return (s_ is True and av is not None), f"sucia={s_} aviso={av and av['titulo']}"
    @prueba("LM7 Éxito al guardar: el mensaje se cierra solo y la ventana queda limpia")
    def _():
        abrir(pg, PRECAUCIONES, respuesta="exito"); tocar_casilla(pg, 1); guardar(pg); pg.wait_for_timeout(2600)
        cerrado_solo = pg.evaluate("!document.querySelector('.sapMMessageDialog')"); cancelar(pg); ok = aviso(pg) is None and n_dialogos(pg) == 0; cerrar_todo(pg)
        return (cerrado_solo and ok), f"mensaje cerrado solo={cerrado_solo}"
    @prueba("LM8 Cambios del portal sin que la persona toque nada (cargar, refrescar) no cuentan; marcar filas y escribir en el filtro local tampoco")
    def _():
        abrir(pg, PRECAUCIONES)
        pg.evaluate("() => { const d = [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].pop(); d.querySelectorAll('tbody tr')[2].querySelectorAll('input')[3].value = '9'; }"); pg.wait_for_timeout(1600)
        pg.locator(".sapMDialog:not(.sapMMessageDialog) tbody tr").nth(3).locator("td.sapMListTblSelCol").click(); pg.wait_for_timeout(300)
        pg.locator("#rmd-filtro-bar input.rmd-filtro").last.fill("USAR"); pg.wait_for_timeout(500)
        cancelar(pg); ok = aviso(pg) is None and n_dialogos(pg) == 0; cerrar_todo(pg); return ok, ""
    @prueba("LM9 Teclear en una celda cuenta como editar; volver a dejar el valor original no avisa")
    def _():
        abrir(pg, PRECAUCIONES)
        celda = pg.locator(".sapMDialog:not(.sapMMessageDialog) tbody tr").nth(2).locator("input").nth(3); celda.click(); celda.type("3"); pg.wait_for_timeout(300)
        cancelar(pg); con = aviso(pg) is not None
        if con: pg.locator(".rmd-modal-aviso button", has_text="Seguir editando").click(); pg.wait_for_timeout(400)
        celda.press("End"); celda.press("Backspace"); pg.wait_for_timeout(300); cancelar(pg); sin = aviso(pg) is None and n_dialogos(pg) == 0; cerrar_todo(pg)
        return (con and sin), f"con cambios={con} revertido sin aviso={sin}"
    @prueba("LM10 Con 'Avisar cambios sin guardar' apagado, Cancelar cierra sin avisar")
    def _():
        abrir(pg, PRECAUCIONES); tocar_casilla(pg, 1)
        pg.evaluate("document.querySelector('#rmd-ui-panel').open = true"); pg.locator("#rmd-ui-panel label:has-text('Avisar cambios sin guardar') input").click(); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelector('#rmd-ui-panel').open = false"); cancelar(pg); ok = aviso(pg) is None and n_dialogos(pg) == 0; cerrar_todo(pg)
        pg.evaluate("document.querySelector('#rmd-ui-panel').open = true"); pg.locator("#rmd-ui-panel label:has-text('Avisar cambios sin guardar') input").click(); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelector('#rmd-ui-panel').open = false"); return ok, ""

    # ───────── N. Predecesor obligatorio y textos ─────────
    @prueba("LN1 Precauciones: el primer paso (cabeza de la cadena) no necesita predecesor; los demás con tipo de dato sí (se marca la celda Depende y cuenta en el aviso)")
    def _():
        abrir(pg, PRECAUCIONES); a = leer_alertas(pg)
        ok = a["lista"] == "PRECAUCIONES" and not a["filas"][0]["falta"] and not any(f["falta"] for f in a["filas"][1:4]) and a["filas"][4]["falta"] and "Falta el predecesor" in a["filas"][4]["aviso"]
        cerrar_todo(pg); return ok, f"{a['cuenta']!r} " + str([f["falta"] for f in a["filas"]])
    @prueba("LN2 Un 'Sin tipo de dato' sin predecesor no se marca; uno con tipo sí; Rendimiento (MuestraCC/Entrega) no lleva predecesores")
    def _():
        filas = [{"desc": "FECHA / HORA INICIO :", "tipo": "Notificacion", "dep": "99 (5)"}, {"desc": "MOLIENDA:", "tipo": "Sin tipo de dato"}, {"desc": "MOLER LA MEZCLA", "tipo": "Realizado por"}]
        abrir(pg, filas); a = leer_alertas(pg); cerrar_todo(pg)
        rend = [{"desc": "CANTIDAD TEORICA", "tipo": "Fórmula"}, {"desc": "CANTIDAD MUESTREADA (kg):", "tipo": "MuestraCC"}, {"desc": "CANTIDAD ENTREGADA", "tipo": "Entrega"}]
        abrir(pg, rend); b_ = leer_alertas(pg); cerrar_todo(pg)
        return ([f["falta"] for f in a["filas"]] == [False, False, True] and not any(f["falta"] for f in b_["filas"]) and b_["lista"] == "RENDIMIENTO"), f"{[f['falta'] for f in a['filas']]} rendimiento={[f['falta'] for f in b_['filas']]}"
    @prueba("LN3 Pasos condicionales o en paralelo (EN CASO QUE, PARALELAMENTE, EN PARALELO, BAJO LA SUPERVISION, ENTREGAR LA DOCUMENTACION ORDENADA Y FIRMADA) pueden ir sin predecesor; otros no")
    def _():
        textos = ["EN CASO QUE SE DETECTE UN DESVIO, AVISAR", "PARALELAMENTE TRITURAR EL EXCIPIENTE", "EN PARALELO PESAR LA MATERIA PRIMA", "BAJO LA SUPERVISION DEL JEFE, MUESTREAR",
                  "ENTREGAR LA DOCUMENTACION ORDENADA Y FIRMADA AL JEFE O SUPERVISOR.", "MEDIR EL PESO DEL GRANEL."]
        filas = [{"desc": "FECHA / HORA INICIO :", "tipo": "Notificacion", "dep": "99 (5)"}] + [{"desc": t, "tipo": "Realizado por"} for t in textos]
        abrir(pg, filas); a = leer_alertas(pg); cerrar_todo(pg)
        return [f["falta"] for f in a["filas"]] == [False, False, False, False, False, False, True], str([f["falta"] for f in a["filas"]])
    @prueba("LN4 'VERIFICAR QUE EL GRANEL TENGA LA APROBACION DE CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE.' y 'FINALMENTE ENTREGAR EL FORMATO DE INSPECCION… A CONTROL DE CALIDAD PARA SU APROBACION EN EL SISTEMA…' son correctos; los demás 'CONTROL DE CALIDAD' se alertan")
    def _():
        textos = [("VERIFICAR QUE EL GRANEL TENGA LA APROBACION DE CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE.", False),
                  ("VERIFICAR QUE EL GRANEL TENGA LA APROBACION DE CALIDAD EN OPERACIONES O CONTROL DE CALIDAD, SEGUN APLIQUE.", False),
                  ("VERIFICAR QUE EL GRANEL TENGA LA APROBACION DE CONTROL DE CALIDAD O CONTROL DE PROCESO, SEGUN APLIQUE.", True),
                  ("AVISAR AL CONTROL DE CALIDAD", True), ("AVISAR A CALIDAD EN OPERACIONES", False), ("MUESTRA PARA CONTROL DE CALIDAD (kg):", True),
                  ("FINALMENTE ENTREGAR EL FORMATO DE INSPECCION EN LINEAS DE PRODUCCION (FPRO-250 VIGENTE) A CONTROL DE CALIDAD PARA SU APROBACION EN EL SISTEMA, ASI COMO EL SOBRE TECNICO CON LA DOCUMENTACION AL AREA DE ASEGURAMIENTO DE LA CALIDAD.", False),
                  ("FINALMENTE ENTREGAR EL FORMATO DE INSPECCION EN LINEAS DE PRODUCCION (FPRO-250 VIGENTE) A CONTROL DE CALIDAD PARA SU APROBACION EN EL SISTEMA, ASI COMO EL SOBRE TECNICO CON LA DOCUMENTACION AL AREA DE ASEGURAMIENTO DE LA CALIDAD. AVISAR AL CONTROL DE CALIDAD.", True),
                  ("ESPERAR RESULTADOS DE CONTROL DE CALIDAD PARA CONTINUAR.", True)]
        filas = [{"desc": t, "tipo": "Verificación Check", "dep": f"{1000 + k} ({k + 1})"} for k, (t, _) in enumerate(textos)]
        filas[0]["dep"] = "999 (1)"
        abrir(pg, filas); a = leer_alertas(pg); cerrar_todo(pg)
        obtenido = [f["faltaDes"] for f in a["filas"]]; return obtenido == [x for _, x in textos], str(obtenido)

    @prueba("LN5 Si al paso sin predecesor se le marcó Estado CC, el aviso recuerda que el portal vacía el predecesor al marcar esa casilla")
    def _():
        filas = [{"desc": "FECHA / HORA INICIO :", "tipo": "Notificacion", "dep": "99 (5)"}, {"desc": "EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA", "tipo": "Realizado por", "cc": True},
                 {"desc": "MOLER LA MEZCLA", "tipo": "Realizado por"}]
        abrir(pg, filas); a = leer_alertas(pg); cerrar_todo(pg)
        return (a["filas"][1]["falta"] and "al marcar Estado CC" in a["filas"][1]["aviso"] and a["filas"][2]["falta"] and "Estado CC" not in a["filas"][2]["aviso"]), f"{a['filas'][1]['aviso'][-70:]!r} | {a['filas'][2]['aviso'][-40:]!r}"

    @prueba("LN6 PM OP: si algún paso la tiene marcada, la columna deja de ocultarse y la celda pide DESMARCAR (cuenta en el aviso); sin ninguna marcada sigue oculta")
    def _():
        filas = [{"desc": "FECHA / HORA INICIO :", "tipo": "Notificacion", "dep": "99 (5)"}, {"desc": "MOLER LA MEZCLA", "tipo": "Verificación Check", "dep": "1000 (1)", "pmop": True},
                 {"desc": "TAMIZAR LA MEZCLA", "tipo": "Verificación Check", "dep": "1001 (2)"}]
        LEER = """() => { const d = [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].pop(); const ths = [...d.querySelectorAll('thead th')]; const i = ths.findIndex(x => x.textContent.trim().toUpperCase() === 'PM OP');
          const trs = [...d.querySelectorAll('tbody tr')]; return { visible: i >= 0 && getComputedStyle(ths[i]).display !== 'none', marcadas: trs.map(tr => tr.children[i].classList.contains('rmd-desmarcar')), aviso: (trs[1].children[i].title || ''), cuenta: (d.querySelector('#rmd-filtro-bar .rmd-alerta') || {}).textContent }; }"""
        abrir(pg, filas, pmop=True); a = pg.evaluate(LEER); cerrar_todo(pg)
        filas[1]["pmop"] = False
        abrir(pg, filas, pmop=True); b_ = pg.evaluate(LEER); cerrar_todo(pg)
        ok = a["visible"] and a["marcadas"] == [False, True, False] and "DESMARCAR PM OP" in a["aviso"] and "incoherencia" in (a["cuenta"] or "") and not b_["visible"] and not any(b_["marcadas"])
        return ok, f"marcada={a} | sin marcar={b_}"
    @prueba("LN7 'En minúsculas': la descripción se redacta con mayúscula inicial, tildes, unidades (también 'pH'/'mL' ya escritos así), códigos completos, siglas, áreas con mayúscula y punto final")
    def _():
        casos = [("ADICION DE CLOROCRESOL.-", "Adición de clorocresol."), ("FECHA / HORA INICIO:", "Fecha / hora inicio:"),
                 ("VERIFICAR EN LA ETIQUETA DE LIMPIO (FPRO-201 VIGENTE) LA FECHA DE LIMPIEZA", "Verificar en la etiqueta de limpio (FPRO-201 vigente) la fecha de limpieza."),
                 ("MEDIR 1000ML DE AGUA A 25 °C CON PH 7 EN EL EQUIPO PV1-PHM-09", "Medir 1000 mL de agua a 25 °C con pH 7 en el equipo PV1-PHM-09."),
                 ("NITROGENACION DE LA SOLUCION EN LA 2DA ETAPA. VERIFICAR LA PRESION", "Nitrogenación de la solución en la 2da etapa. Verificar la presión."),
                 ("ESPERAR LA CONFORMIDAD DEL RESULTADO DE pH PARA PROCEDER CON LA FILTRACION DEL PRODUCTO.", "Esperar la conformidad del resultado de pH para proceder con la filtración del producto."),
                 ("EL PERSONAL DE CONTROL DE CALIDAD MUESTREA (100 mL) PARA ANALISIS DE BIOCARGA, SEGUN LO INDICADO EN EL PROCEDIMIENTO PCMB-200 VIGENTE.",
                  "El personal de Control de Calidad muestrea (100 mL) para análisis de biocarga, según lo indicado en el procedimiento PCMB-200 vigente."),
                 ("ELIMINAR LOS PRIMEROS 200 mL DEL FILTRADO SEGUN EL INSTRUCTIVO IPRO-P202 VIGENTE", "Eliminar los primeros 200 mL del filtrado según el instructivo IPRO-P202 vigente."),
                 ("EL PERSONAL DE CALIDAD EN OPERACIONES REALIZA EL MUESTREO SEGUN POE PCPR-202 VIGENTE.", "El personal de Calidad en Operaciones realiza el muestreo según POE PCPR-202 vigente."),
                 ("PROVISTO DE UN AGITADOR ELECTRICO, AGREGAR:", "Provisto de un agitador eléctrico, agregar:")]
        obtenido = [pg.evaluate("(t) => window.__rmdStats.pasoEnMinusculas(t)", t) for t, _ in casos]
        return obtenido == [e for _, e in casos], str([o for o, (_, e) in zip(obtenido, casos) if o != e] or obtenido[-5:])
    @prueba("LN8 Botón 'Aa' en 'Editar Paso' (va con 'Pasar a minúsculas', activa por defecto; ya no es experimental): aparece aunque el texto en MAYÚSCULAS lleve 'pH' o 'mL' (antes no salía), redacta como 'En minúsculas' y recuerda que el portal no deja grabar pasos de RMD autorizados")
    def _():
        texto = "ESPERAR LA CONFORMIDAD DEL RESULTADO DE pH PARA PROCEDER CON LA FILTRACION DEL PRODUCTO."
        detector = pg.evaluate("(ts) => ts.map(t => window.__rmdStats.casiTodoMayus(t))", [texto, "EL PERSONAL DE CONTROL DE CALIDAD MUESTREA (100 mL) PARA ANALISIS", "FECHA / HORA INICIO:", "Esperar la conformidad del resultado de pH.", "Adición de clorocresol."])
        pg.evaluate("""(t) => { const d = document.createElement('div'); d.className = 'sapMDialog sapMDialogOpen'; d.setAttribute('role', 'dialog'); d.id = '__dialogEditar';
          d.innerHTML = `<header><div class="sapMBar"><div class="sapMBarMiddle"><h2 class="sapMTitle">Editar Paso</h2></div></div></header><section class="sapMDialogSection"><div class="sapMDialogScrollCont">
            <label for="taDescPaso">Descripción Paso:</label><div class="sapMInputBase"><textarea id="taDescPaso" rows="3" style="width:600px"></textarea></div></div></section><footer><button>Cancelar</button></footer>`;
          d.querySelector('textarea').value = t; document.getElementById('app').appendChild(d); }""", texto)
        pg.wait_for_timeout(1500)
        hay = pg.evaluate("!!document.querySelector('#__dialogEditar .rmd-aa')")
        if hay: pg.locator("#__dialogEditar .rmd-aa").click(); pg.wait_for_timeout(400)
        valor = pg.evaluate("document.getElementById('taDescPaso').value"); aviso_ = pg.evaluate("[...document.querySelectorAll('.rmd-toast')].map(t => t.textContent).join(' ')")
        pg.evaluate("document.getElementById('__dialogEditar').remove()")
        ok = detector == [True, True, True, False, False] and hay and valor == "Esperar la conformidad del resultado de pH para proceder con la filtración del producto." and "RMDs Autorizados" in aviso_
        return ok, f"detector={detector} botón={hay} {valor!r} aviso={'RMDs Autorizados' in aviso_}"
    @prueba("LN9 Biocarga: un paso mayor que la menciona no alerta 'CONTROL DE CALIDAD' (lo hace Control de Calidad); otro paso sí, y un proceso menor también")
    def _():
        filas = [{"desc": "FECHA / HORA INICIO :", "tipo": "Notificacion", "dep": "99 (5)"},
                 {"desc": "EL PERSONAL DE CONTROL DE CALIDAD MUESTREA (100 mL) PARA ANALISIS DE BIOCARGA, SEGUN LO INDICADO EN EL PROCEDIMIENTO PCMB-200 VIGENTE.", "tipo": "Realizado por", "dep": "1000 (1)"},
                 {"desc": "ESPERAR RESULTADOS DE CONTROL DE CALIDAD PARA CONTINUAR.", "tipo": "Realizado por", "dep": "1001 (2)"}]
        abrir(pg, filas); a = leer_alertas(pg); cerrar_todo(pg)
        pm = pg.evaluate("""() => { const r = (esPM) => window.__rmdStats.reglasDeFila({ esPM, tipo: 'Números', desc: 'MUESTRA DE BIOCARGA PARA CONTROL DE CALIDAD (mL):', chk: {}, dec: '2' }).filter(x => x.col === 'DESCRIPCION').length;
          return [r(true), r(false)]; }""")
        obtenido = [f["faltaDes"] for f in a["filas"]]
        return (obtenido == [False, False, True] and pm == [1, 0]), f"lista={obtenido} proceso menor/paso mayor={pm}"

    @prueba("LN10 Orden de estructuras: con INSUMOS al final se marca solo INSUMOS (y se dice dónde va); un orden igual al de los autorizados no marca nada")
    def _():
        refs = [["PRE", "NOTAS", "EQUIPOS", "INSUMOS", "COND", "PROC", "ESPEC", "FIRMAS"]] * 3 + [["PRE", "NOTAS", "EQUIPOS", "INSUMOS", "PROC", "COND", "FIRMAS"], ["PRE", "EQUIPOS", "INSUMOS", "PROC", "ESPEC", "FIRMAS"]]
        mal = pg.evaluate("([r]) => window.__rmdStats.estructurasFueraDeOrden(['PRE', 'NOTAS', 'EQUIPOS', 'COND', 'PROC', 'ESPEC', 'FIRMAS', 'INSUMOS'], r)", [refs])
        bien = pg.evaluate("([r]) => window.__rmdStats.estructurasFueraDeOrden(['PRE', 'NOTAS', 'EQUIPOS', 'INSUMOS', 'COND', 'PROC', 'ESPEC', 'FIRMAS'], r).fuera", [refs])
        nueva = pg.evaluate("([r]) => window.__rmdStats.estructurasFueraDeOrden(['PRE', 'EQUIPOS', 'INSUMOS', 'OTRA', 'PROC'], r).fuera", [refs])   # una estructura sin referencia no cuenta
        e = mal["esperado"]; i = e.index("INSUMOS")
        return (mal["fuera"] == ["INSUMOS"] and e[i - 1] == "EQUIPOS" and e[i + 1] == "COND" and bien == [] and nueva == []), f"fuera={mal['fuera']} esperado={e} bien={bien} nueva={nueva}"
    @prueba("LN11 La ventana raíz del RMD ('Estructura de RMD') conserva el tamaño del portal: sin las clases de tamaño del script")
    def _():
        pg.evaluate("""() => { const d = document.createElement('div'); d.className = 'sapMDialog sapMDialogOpen'; d.setAttribute('role', 'dialog'); d.id = '__dialogRaiz';
          d.innerHTML = `<header><div class="sapMBar"><div class="sapMBarMiddle"><h2 class="sapMTitle">2202609081 - PRODUCTO DE PRUEBA</h2></div></div></header><section class="sapMDialogSection"><div class="sapMDialogScrollCont">
            <div class="sapMList"><div class="sapMTB"><h2 class="sapMTitle"><span>Estructura de RMD (3)</span></h2></div><table class="sapMListTbl" id="__raiz-listUl"><thead><tr><th>Orden</th><th>Descripción</th><th>Código</th><th>Items</th><th>Repite</th><th>Num.</th><th>Acc.</th></tr></thead>
            <tbody>${['PRECAUCIONES', 'INSUMOS', 'PROCEDIMIENTO'].map((t, k) => `<tr class="sapMLIB sapMListTblRow"><td>${k + 1}</td><td>${t}</td><td>${k + 1}</td><td>3</td><td>Ingresado</td><td>SI</td><td></td></tr>`).join('')}</tbody></table></div></div></section><footer><button>Cerrar</button></footer>`;
          document.getElementById('app').appendChild(d); }""")
        pg.wait_for_timeout(1200)
        clases = pg.evaluate("[...document.getElementById('__dialogRaiz').classList].filter(c => c.startsWith('rmd-'))")
        pasos = abrir(pg, PRECAUCIONES); clasesPasos = pg.evaluate("(id) => [...document.getElementById(id).classList].filter(c => c.startsWith('rmd-'))", pasos)
        pg.evaluate("document.getElementById('__dialogRaiz').remove()"); cerrar_todo(pg)
        return (clases == [] and "rmd-g" in clasesPasos), f"raíz={clases} pasos={clasesPasos}"
    @prueba("LN12 RMD en vivo: se detecta el tramo cambiado (paso agregado con renumeración = su fila entera, número cambiado, minúsculas, contenido quitado) y no una fecha")
    def _():
        r = pg.evaluate("""() => { const V = window.__rmdStats.vivo;
          const doc = (pasos, fecha) => ({ content: [{ text: 'PROCEDIMIENTO' }, { text: 'Impreso ' + (fecha || '01/09/2026 10:00') }, { table: { body: pasos.map((p, i) => ['4.' + (i + 1), p, { text: '' }]) } }, 'FIN'] });
          const base = ['PESAR 10 kg', 'MEZCLAR', 'TAMIZAR', 'ENVASAR'], s = (d) => V.bloquesDoc(d.content).map(b => b.s);
          const t = (a, b) => V.tramoCambiado(s(a), s(b));
          const agregado = t(doc(base), doc(['PESAR 10 kg', 'MEZCLAR', 'PASO NUEVO', 'TAMIZAR', 'ENVASAR']));
          const bl = s(doc(['PESAR 10 kg', 'MEZCLAR', 'PASO NUEVO', 'TAMIZAR', 'ENVASAR']));
          return { agregado, textoAgregado: bl.slice(agregado.desde, agregado.hasta), numero: t(doc(base), doc(['PESAR 12 kg', 'MEZCLAR', 'TAMIZAR', 'ENVASAR'])),
            quitado: t(doc(base), doc(['PESAR 10 kg', 'TAMIZAR', 'ENVASAR'])), soloFecha: t(doc(base), doc(base, '02/09/2026 11:30')), igual: t(doc(base), doc(base)),
            minusculas: t(doc(base), doc(['PESAR 10 kg', 'Mezclar', 'TAMIZAR', 'ENVASAR'])) }; }""")
        ok = (r["agregado"]["tipo"] == "nuevo" and r["textoAgregado"] == ["4.3", "PASO NUEVO"]
              and r["numero"] and r["numero"]["tipo"] == "cambio" and r["quitado"] and r["quitado"]["tipo"] == "borrado"
              and r["soloFecha"] is None and r["igual"] is None and r["minusculas"] and r["minusculas"]["tipo"] == "cambio")
        return ok, json.dumps(r, ensure_ascii=False)[:600]
    @prueba("LN13 Ctrl+K abre 'Ir a…' con el foco en su buscador (también sobre una ventana abierta), escribir filtra, Esc cierra solo la paleta; saludo según la hora")
    def _():
        abrir(pg, PRECAUCIONES)
        pg.keyboard.press("Control+k"); pg.wait_for_timeout(500)
        a = pg.evaluate("() => ({ abierta: !!document.querySelector('.rmd-paleta-fondo'), foco: document.activeElement.className, items: [...document.querySelectorAll('.rmd-paleta-it')].map(x => x.innerText.split('\\n')[0]) })")
        pg.keyboard.type("mejoras"); pg.wait_for_timeout(300)
        b_ = pg.evaluate("[...document.querySelectorAll('.rmd-paleta-it')].map(x => x.innerText.split('\\n')[0].trim())")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
        c = pg.evaluate("({ paleta: !!document.querySelector('.rmd-paleta-fondo'), dialogos: [...document.querySelectorAll('.sapMDialog')].filter(d => d.getClientRects().length).length })")
        h = pg.evaluate("[5, 11, 12, 18, 19, 23, 2].map(x => window.__rmdStats.productividad.saludoDelMomento(x))")
        cerrar_todo(pg)
        ok = (a["abierta"] and a["foco"] == "rmd-paleta-q" and any("Mejoras de interfaz" in x for x in a["items"]) and b_ and all("Mejoras" in x for x in b_)
              and not c["paleta"] and c["dialogos"] == 1 and h == ["Buenos días", "Buenos días", "Buenas tardes", "Buenas tardes", "Buenas noches", "Buenas noches", "Buenas noches"])
        return ok, f"{a} filtrado={b_} tras Esc={c} saludos={h}"
    @prueba("LN14 Recetas: la comparación con SAP separa cantidad cambiada, material reemplazado por otra versión ('… x25' → '… x25 H v.1'), nuevo y quitado, y el detalle lo muestra en tabla")
    def _():
        r = pg.evaluate("""() => { const S = window.__rmdStats;
          const rmd = [{ Component: '100', Maktx: 'CJA PRODUCTO x25', CompQty: '0.34', CompUnit: 'MLL' }, { Component: '200', Maktx: 'FOLLETO PRODUCTO', CompQty: '0.34', CompUnit: 'MLL' },
                       { Component: '300', Maktx: 'GRANEL', CompQty: '500', CompUnit: 'kg' }, { Component: '400', Maktx: 'TAPA VIEJA', CompQty: '1', CompUnit: 'UN' }];
          const sap = [{ Component: '110', Maktx: 'CJA PRODUCTO x25 H v.1', CompQty: '0.34', CompUnit: 'MLL' }, { Component: '200', Maktx: 'FOLLETO PRODUCTO', CompQty: '0.34', CompUnit: 'MLL' },
                       { Component: '300', Maktx: 'GRANEL', CompQty: '520', CompUnit: 'kg' }, { Component: '500', Maktx: 'CINTA EMBALAJE', CompQty: '0.5', CompUnit: 'ROL' }];
          const d = S.diferenciasBom(sap, rmd);
          const html = S.detalleRecetaHtml({ receta: 'X / 1', texto: 'PRUEBA', dif: d, sap: 4, rmd: 4, ruta: null, rutaAvisa: false });
          const div = document.createElement('div'); div.innerHTML = html;
          return { tipos: d.map(x => x.tipo + ':' + x.comp + (x.compAntes ? '<' + x.compAntes : '')), filas: div.querySelectorAll('tbody tr').length, delta: (div.querySelector('.rmd-rec-delta') || {}).textContent, reemplazo: (div.querySelector('tr.rmd-rec-reemplazo') || {}).innerText }; }""")
        ok = (r["tipos"] == ["cambia:300", "reemplazo:110<100", "nuevo:500", "quitado:400"] and r["filas"] == 4 and r["delta"] == "(+20)" and "100" in (r["reemplazo"] or "") and "110" in (r["reemplazo"] or ""))
        return ok, json.dumps(r, ensure_ascii=False)

    # ───────── R. Reglas de revisión (v1.34) ─────────
    FILAS_REGLAS = [
        {"desc": "SEGÚN IPRO-P123 Y FPRO-250 VIGENTES", "tipo": "Verificación Check"},
        {"desc": "USAR GUANTES DE CAÑA ALTA", "tipo": "Verificación Check", "dep": "1000 (1)"},
        {"desc": "PESAR LOS INSUMOS", "tipo": "Verificación Check", "dep": "1001 (2)"},
    ]
    MARCAS_JS = """() => { const d = [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].pop(); const ths = [...d.querySelectorAll('thead th')].map(x => x.textContent.trim().toUpperCase()), iDes = ths.indexOf('DESCRIPCIÓN');
      return { filas: [...d.querySelectorAll('tbody tr')].map(tr => ({ texto: tr.children[iDes].textContent, marcas: [...tr.children[iDes].querySelectorAll('mark.rmd-regla')].map(m => ({ t: m.textContent, c: m.className, etq: m.dataset.etq || '', title: m.title })) })),
        barra: (d.querySelector('#rmd-filtro-bar .rmd-alerta') || {}).textContent || '' }; }"""
    @prueba("LN15 Reglas de revisión en una lista: el documento que no está en la lista de vigentes se resalta en rojo con etiqueta y motivo, su advertencia suma en la barra, una regla 'Resaltar' marca sin avisar y el texto de la fila no cambia")
    def _():
        pg.evaluate("""async () => { const R = window.__rmdStats.reglas; await R.listo();
          await R.fijar(R.motor.predeterminadas().concat([{ nombre: 'Guantes', tipo: 'frase', buscar: 'guantes', condicion: 'marcar', accion: 'resaltar', color: 'verde' }]));
          await R.ponerVigentes(['FPRO-250', 'IPRO-P100'], 'lista de prueba.xls'); }""")
        abrir(pg, FILAS_REGLAS); pg.wait_for_timeout(600)
        r = pg.evaluate(MARCAS_JS)
        m0, m1 = r["filas"][0]["marcas"], r["filas"][1]["marcas"]
        ok = (len(m0) == 1 and m0[0]["t"] == "IPRO-P123" and "rmd-c-rojo" in m0[0]["c"] and "aviso" in m0[0]["c"] and m0[0]["etq"] == "no vigente"
              and "no está en la lista de documentos vigentes" in m0[0]["title"] and len(m1) == 1 and m1[0]["t"] == "GUANTES" and "rmd-c-verde" in m1[0]["c"] and "aviso" not in m1[0]["c"]
              and not r["filas"][2]["marcas"] and r["filas"][0]["texto"] == FILAS_REGLAS[0]["desc"] and "1 aviso de reglas" in r["barra"])
        return ok, json.dumps(r, ensure_ascii=False)[:900]
    @prueba("LN16 Reglas: al apagar 'Reglas de revisión' en el panel desaparecen los resaltados (y la advertencia de la barra); al encenderla vuelven")
    def _():
        pg.evaluate("document.getElementById('rmd-ui-panel').open = true"); pg.wait_for_timeout(200)
        pg.locator("#rmd-ui-panel input[data-k=reglasrev]").click(); pg.wait_for_timeout(700)
        apagada = pg.evaluate(MARCAS_JS)
        pg.locator("#rmd-ui-panel input[data-k=reglasrev]").click(); pg.wait_for_timeout(700)
        encendida = pg.evaluate(MARCAS_JS)
        pg.evaluate("document.getElementById('rmd-ui-panel').open = false")
        ok = (all(not f["marcas"] for f in apagada["filas"]) and "aviso de reglas" not in apagada["barra"] and apagada["filas"][0]["texto"] == FILAS_REGLAS[0]["desc"]
              and len(encendida["filas"][0]["marcas"]) == 1 and "1 aviso de reglas" in encendida["barra"])
        return ok, f"apagada={apagada['barra']!r} {[len(f['marcas']) for f in apagada['filas']]} encendida={encendida['barra']!r}"
    @prueba("LN17 Ventana 'Reglas de revisión' (botón del panel): crear una regla con prueba en vivo (la acción pasa sola a 'advertencia' con 'No debe aparecer'), desactivarla, duplicarla, subirla y eliminarla; Ctrl+S guarda la regla sin pulsar el Guardar de SAP")
    def _():
        pg.evaluate("document.getElementById('rmd-ui-panel').open = true"); pg.wait_for_timeout(200)
        pg.locator("#rmd-ui-panel .rmd-abrir-reglas").click(); pg.wait_for_timeout(500)
        panel_cerrado = pg.evaluate("!document.getElementById('rmd-ui-panel').open")
        pg.locator(".rmd-reglas .rmd-rg-barra button", has_text="Nueva regla").click(); pg.wait_for_timeout(300)
        pg.locator(".rmd-reglas [data-k=nombre]").fill("Prueba borrador")
        pg.locator(".rmd-reglas [data-k=buscar]").fill("borrador; xxx")
        pg.locator(".rmd-reglas [data-k=condicion]").select_option("noDebe"); pg.wait_for_timeout(150)
        accion = pg.locator(".rmd-reglas [data-k=accion]").input_value()
        pg.locator(".rmd-reglas .rmd-rg-prueba").fill("ESTE PASO ES UN BORRADOR (XXX)"); pg.wait_for_timeout(200)
        prueba_ = pg.evaluate("[...document.querySelectorAll('.rmd-reglas .rmd-rg-res mark')].map(m => m.textContent)")
        aviso_prueba = pg.evaluate("(document.querySelector('.rmd-reglas .rmd-rg-res .rmd-rg-ayuda') || {}).textContent")
        guardados_sap = pg.evaluate("window.__opc.guardados || 0")
        pg.keyboard.press("Control+s"); pg.wait_for_timeout(600)
        tras_ctrl_s = pg.evaluate("({ vista: document.querySelector('.rmd-reglas h3').textContent, sap: window.__opc.guardados || 0, nombres: window.__rmdStats.reglas.lista().map(r => r.nombre) })")
        fila = lambda nombre: pg.locator(".rmd-rg-fila").filter(has=pg.locator("b", has_text=re.compile("^" + re.escape(nombre) + "$")))
        fila("Prueba borrador").locator(".rmd-switch").click(); pg.wait_for_timeout(400)
        inactiva = pg.evaluate("window.__rmdStats.reglas.lista().find(r => r.nombre === 'Prueba borrador').activa === false")
        fila("Prueba borrador").locator("button[data-a=duplicar]").click(); pg.wait_for_timeout(400)
        fila("Prueba borrador (copia)").locator("button[data-a=subir]").click(); pg.wait_for_timeout(400)
        orden = pg.evaluate("window.__rmdStats.reglas.lista().map(r => r.nombre)")
        fila("Prueba borrador (copia)").locator("button[data-a=eliminar]").click(); pg.wait_for_timeout(300)
        pg.locator(".rmd-modal-aviso button", has_text="Eliminar").click(); pg.wait_for_timeout(400)
        final = pg.evaluate("window.__rmdStats.reglas.lista().map(r => r.nombre)")
        g = pg.evaluate("window.__rmdStats.reglas.guardados()")
        ok = (panel_cerrado and accion == "advertencia" and prueba_ == ["BORRADOR", "XXX"] and "aviso" in (aviso_prueba or "") and tras_ctrl_s["vista"] == "Reglas de revisión" and tras_ctrl_s["sap"] == guardados_sap
              and "Prueba borrador" in tras_ctrl_s["nombres"] and inactiva and orden.index("Prueba borrador (copia)") == orden.index("Prueba borrador") - 1
              and "Prueba borrador (copia)" not in final and "Prueba borrador" in final and "Prueba borrador" in (g["ls"] or "") and isinstance(g["db"], dict) and any(r["nombre"] == "Prueba borrador" for r in g["db"]["reglas"]))
        return ok, json.dumps({"accion": accion, "prueba": prueba_, "aviso": aviso_prueba, "ctrlS": tras_ctrl_s, "orden": orden, "final": final}, ensure_ascii=False)[:900]
    @prueba("LN18 Exportar configuración descarga un .json (reglas + lista); Importar (reemplazar) lo recupera; la lista de vigentes se carga desde un CSV con vista previa y se busca un código; todo sigue al recargar la página")
    def _():
        import tempfile
        tmp = tempfile.mkdtemp()
        with pg.expect_download() as dl:
            pg.locator(".rmd-reglas .rmd-rg-barra button", has_text="Exportar configuración").click()
        ruta_json = os.path.join(tmp, dl.value.suggested_filename); dl.value.save_as(ruta_json)
        exportado = json.load(open(ruta_json, encoding="utf-8"))
        antes = pg.evaluate("window.__rmdStats.reglas.lista().map(r => r.nombre)")
        pg.evaluate("window.__rmdStats.reglas.fijar([])"); pg.wait_for_timeout(300)
        with pg.expect_file_chooser() as fc:
            pg.locator(".rmd-reglas .rmd-rg-barra button", has_text="Importar configuración").click()
        fc.value.set_files(ruta_json); pg.wait_for_timeout(600)
        vista_imp = pg.evaluate("document.querySelector('.rmd-reglas .rmd-modal-cuerpo').innerText")
        pg.locator(".rmd-reglas input[name=rmd-rg-modo][value=reemplazar]").check()
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Importar").click(); pg.wait_for_timeout(600)
        despues = pg.evaluate("window.__rmdStats.reglas.lista().map(r => r.nombre)")
        csv = os.path.join(tmp, "vigentes prueba.csv")
        open(csv, "w", encoding="utf-8").write("Código;Título;Estado\nFPRO-250;INSPECCIÓN EN LÍNEAS;Aprobado\nIPRO-P123;LIMPIEZA DE SALAS;Revisión\nPOL-CAL-001;POLÍTICA;Aprobado\n")
        pg.locator(".rmd-reglas .rmd-rg-tabs button[data-p=vigentes]").click(); pg.wait_for_timeout(300)
        with pg.expect_file_chooser() as fc2:
            pg.locator(".rmd-reglas .rmd-rg-barra button[data-a=cargar]").click()
        fc2.value.set_files(csv); pg.wait_for_timeout(600)
        previa = pg.evaluate("document.querySelector('.rmd-reglas .rmd-modal-cuerpo').innerText")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Usar esta lista").click(); pg.wait_for_timeout(600)
        vig = pg.evaluate("window.__rmdStats.reglas.vigentes()")
        pg.locator(".rmd-reglas .rmd-rg-q").fill("IPRO-P999"); pg.wait_for_timeout(200)
        no_esta = pg.evaluate("(document.querySelector('.rmd-reglas .rmd-rg-vig-res') || {}).innerText || ''")
        pg.locator(".rmd-reglas .rmd-rg-q").fill("limpieza"); pg.wait_for_timeout(200)
        por_titulo = pg.evaluate("[...document.querySelectorAll('.rmd-reglas .rmd-rg-vig-res tbody tr')].map(t => t.children[0].textContent)")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Cerrar").click(); pg.wait_for_timeout(300)
        cerrar_todo(pg)
        # recargar la página: las reglas y la lista siguen (localStorage + IndexedDB)
        pg.reload(); pg.evaluate(src); pg.wait_for_timeout(1500)
        tras = pg.evaluate("async () => { const R = window.__rmdStats.reglas; await R.listo(); return { reglas: R.lista().map(r => r.nombre), vig: R.vigentes() }; }")
        ok = (exportado.get("app") == "rmd-ui-mejoras" and len(exportado["reglas"]) == len(antes) and exportado["vigentes"]["n"] == 2 and "regla(s)" in vista_imp
              and despues == antes and "3 documentos" in previa and vig and vig["n"] == 3 and vig["archivo"] == "vigentes prueba.csv"
              and "IPRO-P999 no está en la lista" in no_esta and por_titulo == ["IPRO-P123"] and tras["reglas"] == antes and tras["vig"] and tras["vig"]["n"] == 3)
        return ok, json.dumps({"exportado": [len(exportado["reglas"]), exportado.get("vigentes", {}).get("n")], "antes": antes, "despues": despues, "previa": previa[:160], "vig": vig, "noEsta": no_esta[:80], "porTitulo": por_titulo, "tras": tras}, ensure_ascii=False)[:1200]

    @prueba("LN19 Equipos calificados (v1.35): la pestaña carga la lista (vista previa con estados y cuántos sin calificación), aplica los estados que cuentan como calificados y 'Restablecer' la quita; al soltar un archivo se reconoce solo")
    def _():
        import tempfile
        tmp = tempfile.mkdtemp()
        csv = os.path.join(tmp, "calificados prueba.csv")
        open(csv, "w", encoding="utf-8").write("DEPARTAMENTO: GARANTÍA DE LA CALIDAD\n\nCODIGO MIF;CÓDIGO SAP;DESCRIPCIÓN;TIPO EQUIPO;(OQ) - ESTADO DE CALIFICACION:;(PQ) - ESTADO DE CALIFICACION:;ESTADO GENERAL\n"
                                                "PL1-PV1-E025;10000312;AUTOCLAVE HOGNER;EQU;CALIFICADO;PROGRAMAR PQ;EN PROCESO\nPL1-PV1-E030;10000234;TANQUE REACTOR;EQU;CALIFICADO;CALIFICADO;CALIFICADO\n"
                                                "PL1-CPE-SL01;;SALA DE PESADAS;SAL;CALIFICADO;CALIFICADO;CALIFICADO\nPL1-CPE-SL01;;SALA DE PESADAS;HVAC;PENDIENTE;PENDIENTE;PENDIENTE\n")
        pg.evaluate("window.__rmdStats.reglas.abrir('calificados')"); pg.wait_for_timeout(500)
        vacia = pg.evaluate("({ pestana: document.querySelector('.rmd-reglas .rmd-rg-tabs button.activa').dataset.p, restablecer: document.querySelector('.rmd-reglas [data-a=restablecer-calif]').disabled, todo: [...document.querySelectorAll('.rmd-reglas .rmd-modal-pie button')].map(b => b.textContent) })")
        with pg.expect_file_chooser() as fc:
            pg.locator(".rmd-reglas .rmd-rg-barra button[data-a=cargar-calif]").click()
        fc.value.set_files(csv); pg.wait_for_timeout(700)
        previa = pg.evaluate("document.querySelector('.rmd-reglas .rmd-modal-cuerpo').innerText")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Usar esta lista").click(); pg.wait_for_timeout(600)
        cal = pg.evaluate("window.__rmdStats.reglas.calificados()")
        info = pg.evaluate("[window.__rmdStats.reglas.infoEquipo('PL1-PV1-E025'), window.__rmdStats.reglas.infoEquipo('', '000010000234'), window.__rmdStats.reglas.infoEquipo('PL1-CPE-SL01')]")
        regla_ok = pg.evaluate("window.__rmdStats.reglas.compiladas().find(c => c.id === 'pred-sincalificar')")
        pg.locator(".rmd-reglas .rmd-rg-estados-ok").fill("CALIFICADO; NO REQUIERE; EN PROCESO"); pg.locator(".rmd-reglas button[data-a=estados-ok]").click(); pg.wait_for_timeout(500)
        tras_ok = pg.evaluate("[window.__rmdStats.reglas.calificados().estadosOk, window.__rmdStats.reglas.infoEquipo('PL1-PV1-E025').ok]")
        pg.locator(".rmd-reglas .rmd-rg-qcal").fill("PL1-CPE-SL01"); pg.wait_for_timeout(200)
        busca_ = pg.evaluate("(document.querySelector('.rmd-reglas .rmd-rg-cal-res') || {}).innerText || ''")
        pg.locator(".rmd-reglas [data-a=restablecer-calif]").click(); pg.wait_for_timeout(300)
        pg.locator(".rmd-modal-aviso button", has_text="Restablecer").click(); pg.wait_for_timeout(600)
        tras_rest = pg.evaluate("window.__rmdStats.reglas.calificados()")
        # soltar el archivo en la pestaña Reglas: se reconoce como lista de calificados por su columna ESTADO GENERAL
        pg.locator(".rmd-reglas .rmd-rg-tabs button[data-p=reglas]").click(); pg.wait_for_timeout(200)
        b64 = __import__("base64").b64encode(open(csv, "rb").read()).decode()
        pg.evaluate("""(b64) => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          const dt = new DataTransfer(); dt.items.add(new File([u8], 'soltado.csv', { type: 'text/csv' })); const fondo = document.querySelector('.rmd-reglas-fondo');
          fondo.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })); fondo.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }""", b64)
        pg.wait_for_timeout(800)
        soltado = pg.evaluate("document.querySelector('.rmd-reglas h3').textContent")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Cancelar").click(); pg.wait_for_timeout(300)
        ok = (vacia["pestana"] == "calificados" and vacia["restablecer"] and "Restablecer todo…" in vacia["todo"] and "4 filas de equipos" in previa and "EN PROCESO" in previa
              and cal and cal["n"] == 4 and cal["codigos"] == 3 and info[0]["ok"] is False and info[0]["estado"] == "EN PROCESO" and info[1]["ok"] is True and info[2]["ok"] is False and "HVAC: PENDIENTE" in info[2]["detalle"]
              and regla_ok["ok"] and tras_ok[1] is True and "sin calificación" in busca_ and tras_rest is None and soltado == "Cargar la lista de equipos calificados")
        return ok, json.dumps({"vacia": vacia, "previa": previa[:220], "cal": cal, "info": info, "regla": regla_ok, "trasOk": tras_ok, "busca": busca_[:120], "trasRest": tras_rest, "soltado": soltado}, ensure_ascii=False)[:1500]
    @prueba("LN20 'Restablecer esta regla' devuelve una predeterminada a su configuración (en el formulario, se guarda con Guardar) y 'Restablecer todo' deja solo las predeterminadas y sin listas")
    def _():
        pg.evaluate("""async () => { const R = window.__rmdStats.reglas; await R.fijar(R.motor.predeterminadas().map(r => r.predeterminada === 'novigente' ? { ...r, color: 'azul', etiqueta: 'OJO' } : r).concat([{ nombre: 'Mía', buscar: 'x' }]));
          await R.ponerVigentes(['FPRO-250']); await R.ponerCalificados([['PL1-PV1-E025', '10000312', 'AUTOCLAVE', 'EN PROCESO']]); }""")
        pg.locator(".rmd-reglas .rmd-rg-tabs button[data-p=reglas]").click(); pg.wait_for_timeout(300)
        fila = pg.locator(".rmd-rg-fila").filter(has=pg.locator("b", has_text=re.compile("^Documento no vigente$")))
        fila.locator(".rmd-rg-info").click(); pg.wait_for_timeout(300)
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Restablecer esta regla").click(); pg.wait_for_timeout(300)
        form = pg.evaluate("({ etq: document.querySelector('.rmd-reglas [data-k=etiqueta]').value, color: (document.querySelector('.rmd-reglas input[name=rmd-rg-color]:checked') || {}).value })")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Guardar regla").click(); pg.wait_for_timeout(500)
        nv = pg.evaluate("window.__rmdStats.reglas.lista().find(r => r.predeterminada === 'novigente')")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Restablecer todo").click(); pg.wait_for_timeout(300)
        pg.locator(".rmd-modal-aviso button", has_text="Restablecer todo").click(); pg.wait_for_timeout(700)
        fin = pg.evaluate("({ reglas: window.__rmdStats.reglas.lista().map(r => r.nombre), vig: window.__rmdStats.reglas.vigentes(), cal: window.__rmdStats.reglas.calificados() })")
        pg.locator(".rmd-reglas .rmd-modal-pie button", has_text="Cerrar").click(); pg.wait_for_timeout(300)
        ok = (form == {"etq": "no vigente", "color": "rojo"} and nv["color"] == "rojo" and nv["etiqueta"] == "no vigente" and "Mía" not in fin["reglas"] and len(fin["reglas"]) == 5 and fin["vig"] is None and fin["cal"] is None)
        return ok, json.dumps({"form": form, "nv": [nv["color"], nv["etiqueta"]], "fin": fin}, ensure_ascii=False)
    # ── v1.37: cambios de recetas en SAP ──
    HALLAZGOS_JS = """() => { const F = (y, m, d) => new Date(Date.UTC(y, m, d)), dif = (tipo, comp, desc, ahora, antes, fecha, cambio) => ({ tipo, comp, desc, ahora, antes, fecha, cambio, texto: tipo + comp });
      const h = (o) => ({ mdRecetaId: 'R' + o.cod + o.rec, mdId: 'M' + o.cod, codigo: o.cod, version: o.v, estado: o.estado, linaje: o.cod, descripcion: o.desc, etapa: 'ENVASE', area: 'SOL', planta: 'PLANTA ATE',
        receta: o.rec + ' / 1101', matnr: o.rec, verid: '1101', texto: 'RECETA ' + o.rec, sap: 9, rmd: 7, dif: o.dif || [], ruta: o.ruta || null, rutaAvisa: !!o.ruta, ultima: null, tipos: [(o.dif || []).length && 'lista', o.ruta && 'ruta'].filter(Boolean),
        fechaSap: o.fecha || null, huella: o.hu, detectado: o.det });
      return [
        h({ cod: '2202600001', v: 2, estado: 'Ingresado', desc: 'PRODUCTO UNO 500 mg TAB', rec: '6000000400', hu: 'a1', det: Date.UTC(2026, 8, 29, 15, 32), fecha: F(2026, 7, 17),
            dif: [dif('nuevo', '1100011265', 'CINTA EMB C/LOGO 48mm', { q: 0.5, u: 'ROL' }, null, F(2026, 7, 17), '500000002071'), dif('cambia', '1100002760', 'ETIQUETA ROL', { q: 2, u: 'ROL' }, { q: 1, u: 'ROL' }, F(2026, 7, 10), '500000002001')] }),
        h({ cod: '2202600002', v: 4, estado: 'Autorizado', desc: 'PRODUCTO DOS 10 mL INY', rec: '6000003774', hu: 'b1', det: Date.UTC(2026, 8, 29, 16, 5),
            ruta: { existe: true, cambios: [{ campo: 'Puesto de trabajo (línea)', asociada: 'AAPVAC01', sap: 'AAPVAC02', anterior: null, clave: 'Mdv01', avisa: true }], anteriorVersion: null, puestosRuta: [], entran: [], salen: [], faltan: [] } }),
        h({ cod: '2202600003', v: 1, estado: 'Ingresado', desc: 'PRODUCTO TRES SUS', rec: '6000005791', hu: 'c1', det: Date.UTC(2026, 8, 28, 20, 0), fecha: F(2026, 8, 14),
            dif: [dif('quitado', '1100009999', 'FRASCO 120 mL', null, { q: 1, u: 'UN' }, null, null)], ruta: { existe: false, cambios: [], anteriorVersion: null, puestosRuta: [], entran: [], salen: [], faltan: [] } }),
        h({ cod: '2202600003', v: 1, estado: 'Ingresado', desc: 'PRODUCTO TRES SUS', rec: '6000005835', hu: 'c2', det: Date.UTC(2026, 8, 28, 20, 0), fecha: F(2026, 8, 14),
            dif: [dif('reemplazo', '1100012482', 'FOLLETO H v.1', { q: 0.34, u: 'MLL' }, { q: 0.34, u: 'MLL' }, F(2026, 8, 14), '500000002100')] }),
      ]; }"""
    @prueba("LN21 Cambios de recetas en SAP (v1.37): la ventana agrupa por RMD (una fila por RMD aunque tenga varias recetas), cuenta por estado y por tipo, filtra, busca por componente, despliega el detalle con la fecha del cambio en SAP y marca lo ya observado")
    def _():
        res = {}
        pg.evaluate("async (js) => { const S = window.__rmdStats.recetasSap; window.__resp = await S.respaldo(); await S.poner(eval('(' + js + ')')(), { ing: Date.now(), aut: Date.now() }); }", HALLAZGOS_JS)
        res["grupos"] = pg.evaluate("window.__rmdStats.recetasSap.grupos().map(g => [g.codigo, g.estado, [...g.tipos].sort().join('+'), g.recetas.length])")
        pg.evaluate("window.__rmdStats.recetasSap.abrir()"); pg.wait_for_selector(".rmd-cr .rmd-cr-t tbody tr.rmd-cr-fila", timeout=5000); pg.wait_for_timeout(300)
        leer = lambda: pg.evaluate("({ filas: [...document.querySelectorAll('.rmd-cr .rmd-cr-fila')].map(r => r.dataset.md), chips: [...document.querySelectorAll('.rmd-cr-chips button')].map(b => b.textContent.replace(/\\s+/g, ' ').trim()) })")
        res["inicio"] = leer()
        pg.locator(".rmd-cr-chips button[data-f=Autorizado]").click(); pg.wait_for_timeout(200); res["autorizados"] = leer()["filas"]
        pg.locator(".rmd-cr-chips button[data-f=ruta]").click(); pg.wait_for_timeout(200); res["ruta"] = leer()["filas"]
        pg.locator(".rmd-cr-chips button[data-f=todos]").click(); pg.locator(".rmd-cr-buscar").fill("cinta"); pg.wait_for_timeout(250); res["buscar"] = leer()["filas"]
        pg.locator(".rmd-cr-buscar").fill(""); pg.wait_for_timeout(200)
        pg.locator(".rmd-cr-fila[data-md=M2202600001] button[data-a=ver]").click(); pg.wait_for_timeout(250)
        res["detalle"] = pg.evaluate("(() => { const d = document.querySelector('.rmd-cr-detalle'); return d && { cab: [...d.querySelectorAll('thead th')].map(x => x.textContent).slice(-1)[0], fechas: (d.innerText.match(/\\d{2}\\/\\d{2}\\/\\d{4}/g) || []).slice(0, 4), tieneAsociada: /Asociada a este RMD/.test(d.innerText) }; })()")
        # marcar uno como ya observado: aparece ✓, no se puede seleccionar y «seleccionar todos» no lo toma
        pg.evaluate("async () => { const S = window.__rmdStats.recetasSap, d = await S.datos(), g = S.grupos().find(x => x.codigo === '2202600001'); d.obs[g.mdId + '|' + g.huella] = { t: Date.now(), linea: '20260929CJ Actualización de Lista de Materiales' }; S.estado.ver++; }")
        pg.locator(".rmd-cr-chips button[data-f=Ingresado]").click(); pg.wait_for_timeout(250)
        res["observado"] = pg.evaluate("(() => { const f = document.querySelector('.rmd-cr-fila[data-md=M2202600001]'); return { texto: f.querySelector('.rmd-cr-obs').textContent.trim(), bloqueada: f.querySelector('input[data-a=sel]').disabled }; })()")
        pg.locator(".rmd-cr-t th input[data-a=todas]").check(); pg.wait_for_timeout(250)
        res["seleccion"] = pg.evaluate("({ marcadas: [...document.querySelectorAll('.rmd-cr-t td input[data-a=sel]:checked')].map(i => i.closest('tr').dataset.md) })")
        # borrar lo guardado (con confirmación)
        pg.locator(".rmd-cr .rmd-modal-pie button", has_text="Borrar lo guardado").click(); pg.wait_for_timeout(300)
        pg.locator(".rmd-modal-aviso button", has_text="Borrar").click(); pg.wait_for_timeout(700)
        res["tras_borrar"] = pg.evaluate("({ grupos: window.__rmdStats.recetasSap.grupos().length, texto: (document.querySelector('.rmd-cr-tabla') || {}).innerText })")
        pg.locator(".rmd-cr .rmd-modal-pie button", has_text="Cerrar").click(); pg.wait_for_timeout(300)
        pg.evaluate("async () => { await window.__rmdStats.recetasSap.restaurar(window.__resp); }")
        i = res["inicio"]
        ok = (res["grupos"] == [["2202600003", "Ingresado", "lista+ruta", 2], ["2202600001", "Ingresado", "lista", 1], ["2202600002", "Autorizado", "ruta", 1]]   # (por fecha en SAP: la más reciente primero, sin fecha al final)
              and i["chips"] == ["Todos 3", "Ingresados 2", "Autorizados 1", "Lista de materiales 2", "Hoja de ruta 2"] and len(i["filas"]) == 3
              and res["autorizados"] == ["M2202600002"] and set(res["ruta"]) == {"M2202600002", "M2202600003"} and res["buscar"] == ["M2202600001"]
              and res["detalle"] and res["detalle"]["cab"] == "Cambio en SAP" and "17/08/2026" in res["detalle"]["fechas"] and not res["detalle"]["tieneAsociada"]
              and res["observado"]["texto"].startswith("✓") and res["observado"]["bloqueada"] and res["seleccion"]["marcadas"] == ["M2202600003"]
              and res["tras_borrar"]["grupos"] == 0 and "Pulsa" in res["tras_borrar"]["texto"])
        return ok, json.dumps(res, ensure_ascii=False, default=str)[:1500]
    @prueba("LN22 Revisión de recetas frente a SAP (v1.37, con lecturas de mentira): detecta componentes nuevos, con otra cantidad, quitados y reemplazados con su fecha; puesto de trabajo y hoja de ruta; no avisa lo que coincide ni lo que no se pudo leer; la huella cambia con lo que cambia")
    def _():
        r = pg.evaluate("""() => { const S = window.__rmdStats.recetasSap;
          const md = (id, cod, est) => [id, { mdId: id, codigo: cod, version: 3, estado: est, linaje: cod, descripcion: 'PRODUCTO ' + cod, etapa: 'ENVASE', area: 'SOL', planta: 'PLANTA ATE' }];
          const porMd = new Map([md('m1', '2202600011', 'Ingresado'), md('m2', '2202600012', 'Autorizado'), md('m3', '2202600013', 'Ingresado'), md('m4', '2202600014', 'Ingresado'), md('m5', '2202600015', 'Ingresado')]);
          const rc = (matnr, o = {}) => ({ Matnr: matnr, Werks: '1020', Verid: '1101', Stlal: '01', Mdv01: 'AAPVAC01', Plnnr: '304', Alnal: '4', Text1: 'RECETA ' + matnr, ...o });
          const recs = [{ mdRecetaId: 'r1', mdId_mdId: 'm1', recetaId: rc('600001') }, { mdRecetaId: 'r2', mdId_mdId: 'm2', recetaId: rc('600002') }, { mdRecetaId: 'r3', mdId_mdId: 'm3', recetaId: rc('600003') },
            { mdRecetaId: 'r4', mdId_mdId: 'm4', recetaId: rc('600004') }, { mdRecetaId: 'r5', mdId_mdId: 'm5', recetaId: rc('600005') }];
          const copias = { r1: [['C1', '2', 'KG', 'UNO'], ['C2', '5', 'L', 'DOS'], ['C3', '1', 'UN', 'TRES ROL v.1']], r2: [['C1', '2', 'KG', 'UNO']], r3: [['C1', '2', 'KG', 'UNO']], r4: [], r5: [['C1', '2', 'KG', 'UNO']] };
          const sap = (c) => ({ Component: c[0], CompQty: c[1], CompUnit: c[2], Maktx: c[3], ValidFrom: c[4] || '28.12.2022', ChangeNo: c[5] || '' });
          const bom = new Map([['600001|1020|1', [sap(['C1', '3', 'KG', 'UNO', '17.08.2026', '500000002071']), sap(['C3', '1', 'UN', 'TRES ROL H v.1', '17.08.2026', '500000002071']), sap(['C9', '4', 'UN', 'NUEVO', '02.09.2026', '500000002150'])]],
            ['600002|1020|1', [sap(['C1', '2', 'KG', 'UNO'])]], ['600003|1020|1', [sap(['C1', '2', 'KG', 'UNO'])]], ['600004|1020|1', [sap(['C1', '2', 'KG', 'UNO'])]], ['600005|1020|1', null]]);
          const v = (matnr, o = {}) => [matnr + '|1020|1101', { Matnr: matnr, Werks: '1020', Verid: '1101', Mdv01: 'AAPVAC01', Plnnr: '304', Alnal: '4', Stlal: '1', ...o }];
          const versiones = new Map([v('600001'), v('600002', { Mdv01: 'AAPVAC09' }), v('600004'), v('600005')]);   // 600003: la versión ya no existe
          const verOk = new Set(['600001|1020', '600002|1020', '600003|1020', '600004|1020', '600005|1020']);
          const h = S.comparar(recs, porMd, copias, bom, versiones, verOk), por = Object.fromEntries(h.map(x => [x.mdRecetaId, x]));
          const h2 = S.comparar(recs, porMd, { ...copias, r1: [...copias.r1, ['C7', '1', 'UN', 'OTRO']] }, bom, versiones, verOk);
          return { cuantos: h.map(x => x.mdRecetaId), r1: por.r1.dif.map(d => d.tipo + ':' + d.comp).sort(), r1tipos: por.r1.tipos, r1fecha: por.r1.fechaSap.toISOString().slice(0, 10), r1cambio: por.r1.dif.map(d => d.cambio).filter(Boolean).sort(),
            r2: [por.r2.tipos, por.r2.ruta.cambios.map(c => c.campo + ' ' + c.asociada + '→' + c.sap)], r3: [por.r3.tipos, por.r3.ruta.existe], r4: !!por.r4, r5: !!por.r5,
            huellaIgual: S.comparar(recs, porMd, copias, bom, versiones, verOk).find(x => x.mdRecetaId === 'r1').huella === por.r1.huella, huellaDistinta: h2.find(x => x.mdRecetaId === 'r1').huella !== por.r1.huella }; }""")
        ok = (r["cuantos"] == ["r1", "r2", "r3"] and r["r1"] == ["cambia:C1", "nuevo:C9", "quitado:C2"] and r["r1tipos"] == ["lista"]   # (C3 solo cambió de descripción: no es una diferencia)
              and r["r1fecha"] == "2026-09-02" and r["r1cambio"] == ["500000002071", "500000002150"] and r["r2"] == [["ruta"], ["Puesto de trabajo (línea) AAPVAC01→AAPVAC09"]] and r["r3"] == [["ruta"], False]
              and not r["r4"] and not r["r5"] and r["huellaIgual"] and r["huellaDistinta"])
        return ok, json.dumps(r, ensure_ascii=False, default=str)
    # datos de mentira de dos versiones de un RMD (lo que devuelven las lecturas del servicio) — los usan LN23 y LN25
    TZ_DATOS_JS = """() => { const T = window.__rmdStats.trazabilidad;
      const cat = { estructura: new Map([['E1', 'PROCEDIMIENTO']]), etiqueta: new Map([['T1', 'FABRICACION']]), tipos: new Map(), estados: new Map() };
      const f = (o = {}) => ({ activo: true, fechaRegistro: new Date('2026-09-24T22:20:09Z'), usuarioRegistro: 'NCUELLARL', fechaActualiza: null, usuarioActualiza: null, ...o });
      const paso = (id, cod, orden, o = {}) => f({ mdEstructuraPasoId: id, mdEsEtiquetaId_mdEsEtiquetaId: 'et', estructuraId_estructuraId: 'E1', pasoId: { codigo: cod, descripcion: 'PASO ' + cod }, orden, valorInicial: null, tab: false, tipoDatoId: { contenido: 'Números' }, tipoDatoId_iMaestraId: 432, ...o });
      const dA = { etiquetas: [f({ mdEsEtiquetaId: 'et', estructuraId_estructuraId: 'E1', etiquetaId_etiquetaId: 'T1', orden: 1, conforme: true })],
        pasos: [paso('a1', 100, 1, { valorInicial: '1.0' }), paso('a2', 200, 2), paso('a3', 300, 3), paso('a5', 500, 5)],
        pm: [f({ mdEstructuraPasoInsumoPasoId: 'am1', pasoId_mdEstructuraPasoId: 'a1', pasoHijoId: { codigo: 900, descripcion: 'PM 900' }, orden: 1, cantidadInsumo: '5' }), f({ mdEstructuraPasoInsumoPasoId: 'am3', pasoId_mdEstructuraPasoId: 'a3', pasoHijoId: { codigo: 901, descripcion: 'PM 901' }, orden: 1 })],
        recetas: [f({ mdRecetaId: 'ra', recetaId: { Matnr: '600001', Verid: '1101', Werks: '1020', Text1: 'RECETA UNO' } })],
        insumos: [f({ estructuraRecetaInsumoId: 'ia1', mdRecetaId_mdRecetaId: 'ra', Component: 'C1', ItemNo: '0010', CompQty: '2', CompUnit: 'KG', Maktx: 'UNO' })], espec: [] };
      const dB = { etiquetas: dA.etiquetas,
        pasos: [paso('b1', 100, 1, { valorInicial: 2, tab: true }), paso('b3', 350, 3), paso('b4', 400, 4), paso('b5', 500, 6)],
        pm: [f({ mdEstructuraPasoInsumoPasoId: 'bm1', pasoId_mdEstructuraPasoId: 'b1', pasoHijoId: { codigo: 900, descripcion: 'PM 900' }, orden: 1, cantidadInsumo: '6' }), f({ mdEstructuraPasoInsumoPasoId: 'bm3', pasoId_mdEstructuraPasoId: 'b3', pasoHijoId: { codigo: 901, descripcion: 'PM 901' }, orden: 1 })],
        recetas: dA.recetas,
        insumos: [f({ estructuraRecetaInsumoId: 'ib1', mdRecetaId_mdRecetaId: 'ra', Component: 'C1', ItemNo: '0010', CompQty: '3', CompUnit: 'KG', Maktx: 'UNO' }), f({ estructuraRecetaInsumoId: 'ib2', mdRecetaId_mdRecetaId: 'ra', Component: 'C2', ItemNo: '0020', CompQty: '1', CompUnit: 'UN', Maktx: 'DOS' })], espec: [] };
      const mdA = { mdId: 'mA', codigo: '2202600001', version: 2, descripcion: 'PRODUCTO', observacion: 'linea uno\\nlinea dos', fechaAutorizacion: new Date('2026-09-24T22:20:50Z') };
      const mdB = { mdId: 'mB', codigo: '2202600002', version: 3, descripcion: 'PRODUCTO NUEVO', observacion: 'linea uno\\nlinea tres', fechaAutorizacion: new Date('2026-09-24T22:20:50Z') };
      const A = T.normalizar(mdA, dA, cat), B = T.normalizar(mdB, dB, cat);
      return { T, A, B, cat }; }"""
    @prueba("LN23 Historial de cambios entre versiones (v1.38, datos de mentira): agregados, quitados, modificados y reemplazados (Cambiar paso) por sección; el cambio solo de orden se marca; los procesos menores de un paso agregado o reemplazado no se repiten; observaciones por línea; usuario y fecha de cada fila y «al autorizar»")
    def _():
        r = pg.evaluate(TZ_DATOS_JS.replace("return { T, A, B, cat }; }", """const c = T.comparar(A, B); return { c: c.map(x => [x.seccion, x.tipo, x.campo, x.antes, x.despues, x.soloOrden, x.quien, x.alAutorizar, x.elemento]),
          igual: T.comparar(A, A).length, orden: A.pasos.map(p => p.key).slice(0, 2) }; }"""))
        c = {(x[0], x[1], x[2]): x for x in r["c"]}
        def hay(*k): return k in c
        ok = (hay("Cabecera", "Modificado", "Descripción") and c[("Cabecera", "Modificado", "Descripción")][3:5] == ["PRODUCTO", "PRODUCTO NUEVO"]
              and hay("Cabecera", "Agregado", "Línea agregada") and c[("Cabecera", "Agregado", "Línea agregada")][4] == "linea tres" and c[("Cabecera", "Quitado", "Línea quitada")][3] == "linea dos"
              and c[("Pasos", "Modificado", "Val. Inicial")][3:5] == ["1", "2"] and c[("Pasos", "Modificado", "Tab")][3:5] == ["No", "Sí"]
              and hay("Pasos", "Reemplazado", "Paso") and "300" in c[("Pasos", "Reemplazado", "Paso")][3] and "350" in c[("Pasos", "Reemplazado", "Paso")][4]
              and hay("Pasos", "Agregado", "Paso") and "Paso 400" in c[("Pasos", "Agregado", "Paso")][8])
        quitado = [x for x in r["c"] if x[0] == "Pasos" and x[1] == "Quitado"]
        orden = [x for x in r["c"] if x[0] == "Pasos" and x[2] == "Orden"]
        pms = [x for x in r["c"] if x[0] == "Procesos menores"]
        ins = [x for x in r["c"] if x[0] == "Insumos"]
        ok = ok and len(quitado) == 1 and "Paso 200" in quitado[0][8]          # el paso 200 desapareció (y no tiene reemplazo)
        ok = ok and len(orden) == 1 and orden[0][5] is True and orden[0][3:5] == ["5", "6"]     # el 500 solo cambió de orden
        ok = ok and [x[1:5] for x in pms] == [["Modificado", "Cantidad insumos", "5", "6"]]      # los PM de los pasos 300→350 (reemplazado) no se repiten
        ok = ok and sorted((x[1], x[2]) for x in ins) == [("Agregado", "Insumo"), ("Modificado", "Cantidad")]
        ok = ok and all(x[6] == "NCUELLARL" and x[7] is True for x in r["c"] if x[0] == "Pasos" and x[1] in ("Modificado", "Agregado", "Reemplazado")) and r["igual"] == 0
        return ok, json.dumps(r, ensure_ascii=False, default=str)[:1800]
    @prueba("LN24 Historial por guardado (v1.38, datos de mentira): el «antes» sale de los guardados anteriores de la misma fila, los guardados parciales se acumulan, los que no cambian nada se distinguen, las líneas de observación se listan, y solo cuentan los guardados de esa fila")
    def _():
        r = pg.evaluate("""() => { const T = window.__rmdStats.trazabilidad, cat = { tipos: new Map([[432, 'Números'], [433, 'Texto']]), estados: new Map([[456, 'Sin iniciar'], [457, 'En proceso']]) }, fmt = T.formato(cat);
          const ev = (min, p, acc = 'UPDATE') => ({ ts: new Date(Date.UTC(2026, 8, 29, 10, min)), accion: acc, p });
          const paso = T.difEventos([ev(0, { usuarioActualiza: 'AA', orden: 1, valorInicial: '1', tab: false, tipoDatoId_iMaestraId: 432, mdEstructuraPasoId: 'x' }), ev(5, { usuarioActualiza: 'BB', orden: 2, mdEstructuraPasoId: 'x' }),
            ev(10, { usuarioActualiza: 'BB', orden: 2, valorInicial: '1', tab: false, tipoDatoId_iMaestraId: 432, mdEstructuraPasoId: 'x' }), ev(15, { usuarioActualiza: 'CC', tab: true, depende: '123', tipoDatoId_iMaestraId: 433, valorInicial: null, mdEstructuraPasoId: 'x' })], fmt);
          const cab = T.difEventos([ev(0, { usuarioActualiza: 'AA', observacion: 'a\\nb', estadoIdProceso_iMaestraId: 456, mdId: 'm' }), ev(9, { usuarioActualiza: 'AA', observacion: 'a\\nb\\nc', estadoIdProceso_iMaestraId: 457, mdId: 'm' }), ev(20, { usuarioActualiza: 'DD', observacion: 'a\\nc', mdId: 'm' })], fmt);
          const filas = [{ timestamp: '2026-09-29T10:30:00Z', eventAction: 'UPDATE', value: JSON.stringify({ mdEstructuraPasoId: 'x', orden: 3 }) }, { timestamp: '2026-09-29T10:10:00Z', eventAction: 'UPDATE', value: JSON.stringify({ mdEstructuraPasoId: 'x', orden: 2 }) },
            { timestamp: '2026-09-29T10:20:00Z', eventAction: 'UPDATE', value: JSON.stringify({ mdEstructuraPasoId: 'otro', dependeMdEstructuraPasoId: 'x', orden: 9 }) }, { timestamp: '2026-09-29T10:10:00Z', eventAction: 'UPDATE', value: JSON.stringify({ mdEstructuraPasoId: 'x', orden: 2 }) }, { timestamp: '', eventAction: 'UPDATE', value: 'no es json' }];
          const parseados = T.parsear(filas, 'mdEstructuraPasoId', 'x');
          return { paso: paso.map(e => [e.usuario, e.primero, e.cambios.map(c => c.campo + ':' + c.antes + '>' + c.despues)]), cab: cab.map(e => [e.usuario, e.cambios.map(c => c.campo + ':' + c.antes + '>' + c.despues)]), parseados: parseados.map(e => e.p.orden) }; }""")
        ok = (r["paso"] == [["AA", True, []], ["BB", False, ["Orden:1>2"]], ["BB", False, []], ["CC", False, ["Tab:No>Sí", "Depende del paso:(no registrado)>123", "Tipo Dato:Números>Texto", "Val. Inicial:1>(vacío)"]]]
              and r["cab"] == [["AA", []], ["AA", ["Observaciones (línea agregada):>c", "Estado del proceso:Sin iniciar>En proceso"]], ["DD", ["Observaciones (línea quitada):b>"]]] and r["parseados"] == [2, 3])
        return ok, json.dumps(r, ensure_ascii=False)
    @prueba("LN25 Excel de la trazabilidad (v1.38, datos de mentira): hojas Cambios entre versiones, Historial de guardados, Estados e Información con las mismas cantidades que se ven; la fila «al autorizar» lo dice")
    def _():
        r = pg.evaluate(TZ_DATOS_JS.replace("return { T, A, B, cat }; }", """const c = T.comparar(A, B), h = [{ rotulo: 'PROCEDIMIENTO › FABRICACION › Paso 100', entradas: [{ ts: new Date(), accion: 'UPDATE', usuario: 'JQUISPEP', primero: false, cambios: [{ campo: 'Tab', antes: 'No', despues: 'Sí' }, { campo: 'Orden', antes: '1', despues: '2' }] }, { ts: new Date(), accion: 'UPDATE', usuario: 'JQUISPEP', primero: false, cambios: [] }] }];
          const x = T.excel({ codigo: '2202600002', descripcion: 'PRODUCTO NUEVO', cambios: c, comparacion: 'v2 → v3', historial: h, estados: [['Ingresado', '28/09/2026 03:26:22', 'JQUISPEP']] });
          return x.libro.generar().then(b => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { nombre: x.nombre, cambios: x.cambios, filas: x.filas, n: c.length, b64: btoa(s) }; }); }"""))
        import base64, io, zipfile
        z = zipfile.ZipFile(io.BytesIO(base64.b64decode(r.pop("b64"))))
        hojas = re.findall(r'<sheet name="([^"]+)"', z.read("xl/workbook.xml").decode("utf-8"))
        compartidas = "".join(z.read(n).decode("utf-8") for n in z.namelist() if n.endswith(".xml"))
        ok = (hojas == ["Cambios entre versiones", "Historial de guardados", "Estados", "Información"] and r["cambios"] == r["n"] and r["filas"] == 3 and r["nombre"].startswith("Trazabilidad RMD 2202600002 ")
              and "el registro al autorizar" in compartidas and "Guardado sin cambios" in compartidas and "JQUISPEP" in compartidas)
        return ok, f"{r}; hojas={hojas}"
    @prueba("LN26 Cantidades con el separador de miles mal leído al copiar la receta (v1.39): SAP 42094.000 y la copia «42.094000» (o 5000 → «5.000000») NO son un cambio; una cantidad realmente distinta, una unidad distinta o un valor menor de 1000 sí lo son")
    def _():
        r = pg.evaluate("""() => { const f = window.__rmdStats.diferenciasBom, c = (comp, q, u = 'AMP') => ({ Component: comp, CompQty: q, CompUnit: u, Maktx: 'M ' + comp });
          const sap = [c('C4', '42094.000'), c('C5', '2.000'), c('C6', '5000.000'), c('C7', '1500.000'), c('C8', '900.000'), c('C9', '3000.000', 'KG'), c('C10', '1234567.000')];
          const rmd = [c('C4', '42.094000'), c('C5', '2.000000'), c('C6', '5.000000'), c('C7', '1.000000'), c('C8', '0.900000'), c('C9', '3.000000', 'L'), c('C10', '1.234567')];
          return f(sap, rmd).map(d => d.tipo + ':' + d.comp).sort(); }""")
        return r == ["cambia:C7", "cambia:C8", "cambia:C9"], str(r)
    # (deja el navegador de la maqueta como estaba: reglas predeterminadas y sin listas)
    pg.evaluate("async () => { const R = window.__rmdStats.reglas; await R.fijar(R.motor.predeterminadas()); await R.ponerVigentes(null); await R.ponerCalificados(null); }")

    print("\n══ RESUMEN ══")
    fallas = [r for r in RES if not r[1]]
    print(f"{len(RES) - len(fallas)}/{len(RES)} pruebas pasan")
    for n, ok, d in fallas: print("  FALLA:", n, "—", d)
    print("errores de script:", errores[:5])
    br.close()
    sys.exit(1 if fallas or errores else 0)
