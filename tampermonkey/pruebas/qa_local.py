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

    print("\n══ RESUMEN ══")
    fallas = [r for r in RES if not r[1]]
    print(f"{len(RES) - len(fallas)}/{len(RES)} pruebas pasan")
    for n, ok, d in fallas: print("  FALLA:", n, "—", d)
    print("errores de script:", errores[:5])
    br.close()
    sys.exit(1 if fallas or errores else 0)
