"""Pruebas estrictas del userscript rmd-ui-mejoras.user.js contra el portal real.

Uso:  python tampermonkey/pruebas/qa_estricto.py [bloques]      (bloques: A B C D E F G H I J K; por defecto todos)
  A diseño y estructura · B portapapeles · C otros RMD y estados · E interruptores del panel · F otras listas/Escape/avisos
  G pantalla pequeña · H ventana "Asociar Fórmula" y aviso de códigos · I diseño de las listas de Pasos en varios tamaños
  J Especificaciones (reordenar y editar textos; el guardado se comprueba con la petición SIMULADA y un cortafuegos: no escribe)
  K botón de mejoras y panel · D escritura controlada (¡ESCRIBE en el RMD de prueba y lo restaura!)

Requisitos: Chrome con --remote-debugging-port=9222 y sesión iniciada. Variables de entorno:
  RMD_PRUEBA (RMD de PRUEBA, versión Ingresada con al menos 21 pasos en Procedimiento>Fabricación; los pasos 9 y 19/21 se usan como
  origen/destino), RMD_AJENO (otro RMD Ingresado, solo lectura) y RMD_AUTORIZADO (un RMD Autorizado, solo lectura).
  Los bloques A-C, E-K NO escriben: pueden ejecutarse sobre un RMD real Ingresado (RMD_PRUEBA/RMD_LAYOUT/RMD_ASOCIAR) porque solo
  cambian datos EN MEMORIA de la pestaña de prueba (que se cierra al terminar) y las peticiones de guardado se simulan.
  Extra: RMD_ASOCIAR + ASOCIAR_DESC (RMD con versión anterior visible al buscar esa descripción), RMD_LAYOUT + ETQS_LISTAS (listas de Pasos).
NUNCA apuntes RMD_PRUEBA a un RMD real si vas a ejecutar el bloque D: cambia y borra procesos menores del paso 19.
"""
import json, os, sys, time, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from util import SCRIPT, abrir, abrir_dialogo, marcar_fila, cerrar_todo
from playwright.sync_api import sync_playwright
from rmd_automation.actions import RmdAutomation
from rmd_automation.pages.configuracion import ConfiguracionFiltro
src = SCRIPT.read_text(encoding="utf-8")
RMD_PRUEBA = os.environ.get("RMD_PRUEBA", "")
RMD_AJENO = os.environ.get("RMD_AJENO", "2202609067")
RMD_AUTORIZADO = os.environ.get("RMD_AUTORIZADO", "2202609061")
RMD_ASOCIAR = os.environ.get("RMD_ASOCIAR", "2202609081"); ASOCIAR_DESC = os.environ.get("ASOCIAR_DESC", "clorfenamina 4")
ETQS_LISTAS = os.environ.get("ETQS_LISTAS", "DOCUMENTACION|PREPARACION DE LAS MAQUINAS|PREPARACION DEL MATERIAL|FABRICACION|RENDIMIENTO").split("|")

SOLO = sys.argv[1] if len(sys.argv) > 1 else "ABCEFGHIJKD"
if "D" in SOLO and not RMD_PRUEBA:
    raise SystemExit("El bloque D ESCRIBE: define RMD_PRUEBA con el código de un RMD de PRUEBA (nunca uno real) o ejecuta solo los bloques sin escritura (ABCEFGHIJK).")
RMD_PRUEBA = RMD_PRUEBA or "2202609081"            # bloques sin escritura: por defecto un RMD Ingresado real (solo se cambian datos en memoria)
RMD_LAYOUT = os.environ.get("RMD_LAYOUT", RMD_PRUEBA)
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
            registrar(nombre, False, "EXCEPCIÓN " + str(e)[:200]); traceback.print_exc(limit=2)
        return fn
    return deco

JS_UTIL = """
window.__q = {
  d() { return [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].filter(x => x.getClientRects().length); },
  top() { const a = this.d(); return a[a.length - 1]; },
  r(el) { const q = el.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height) }; },
  toast() { return [...document.querySelectorAll('.rmd-toast')].map(t => t.textContent); },
};
"""

def toast_texto(fr, pg, contiene, ms=20000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        ts = fr.evaluate("window.__q.toast()")
        for t in ts:
            if contiene in t: return t
        pg.wait_for_timeout(300)
    return None

def limpiar_seleccion(fr):
    fr.evaluate("""() => { const d=window.__q.top(); const t=d.querySelector('table'); sap.ui.getCore().byId(t.id.replace(/-listUl$/,'')).removeSelections(true); }""")

def abrir_pasos(pg, fr, codigo=None, etq="FABRICACION"):
    codigo = codigo or RMD_PRUEBA
    for intento in range(2):
        try:
            RmdAutomation(pg).editor_de_rmd(codigo); pg.wait_for_timeout(4000)
            abrir_dialogo(fr, pg, "PROCEDIMIENTO", "Adicionar Etiqueta")
            abrir_dialogo(fr, pg, etq, "Adicionar Pasos RMD"); pg.wait_for_timeout(3000)
            return
        except Exception:
            if intento: raise
            cerrar_seguro(); pg.wait_for_timeout(3500)

def provocar_incoherencias(fr, pg):
    """El RMD usado puede no tener 'Puesto faltante' ni casillas incoherentes: se crean EN MEMORIA (nada se guarda) para poder medir su estilo."""
    r = fr.evaluate("""() => { const d=window.__q.top(); const t=d.querySelector('table'); const core=sap.ui.getCore();
      const ths=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim().toUpperCase()); const iP=ths.indexOf('PUESTO TRABAJO'), iE=ths.indexOf('EDIT'), iT=ths.indexOf('TIPO DATO');
      const filas=[...t.querySelectorAll('tbody tr')].filter(r=>!/SubRow/.test(r.className)); const out={};
      const ctlDe=(el)=>{ const cont=el.closest('[data-sap-ui]'); return core.byId(el.id)||core.byId(el.id.replace(/-(inner|CB)$/,''))||(cont&&core.byId(cont.id)); };
      if(!t.querySelector('td.rmd-sin-puesto')){ for(const tr of filas){ const inp=tr.children[iP]&&tr.children[iP].querySelector('input'); if(inp && !inp.disabled && !inp.readOnly && inp.value){ const c=ctlDe(inp); if(c&&c.setSelectedItem){ c.setSelectedItem(null); c.setValue(''); c.fireSelectionChange({selectedItem:null}); c.fireChange({value:''}); out.puesto=true; break; } } } }
      if(!t.querySelector('td.rmd-marcar, td.rmd-desmarcar')){ for(const tr of filas){ const tipo=(tr.children[iT].querySelector('input')||{}).value||''; if(/m[uú]ltiple|sin tipo de dato/i.test(tipo)){ const cb=tr.children[iE].querySelector('[role=checkbox]'); const c=cb&&ctlDe(cb); if(c&&c.setSelected){ c.setSelected(true); c.fireSelect({selected:true}); out.marca=true; break; } } } }
      return out; }""")
    pg.wait_for_timeout(1800)
    return r


with sync_playwright() as p:
    b, pg, fr = abrir(p)
    errores = []; pg.on("pageerror", lambda e: errores.append(str(e)[:250]))
    pg.on("console", lambda m: errores.append("console:" + m.text[:200]) if m.type == "error" and "templateShareable" not in m.text and "404" not in m.text else None)
    dialogos_nativos = []
    ACEPTAR = [False]
    def on_dialog(dlg):
        dialogos_nativos.append(dlg.message)
        (dlg.accept() if ACEPTAR[0] else dlg.dismiss())
    def cerrar_seguro():
        ACEPTAR[0] = True
        try: cerrar_todo(fr, pg)
        finally: ACEPTAR[0] = False
    pg.on("dialog", on_dialog)
    fr.evaluate(src); fr.evaluate(JS_UTIL)

    # ───────────────────────── A. Diseño y estructura ─────────────────────────
    if "A" in SOLO:
        RmdAutomation(pg).editor_de_rmd(RMD_PRUEBA); pg.wait_for_timeout(4000)
        @prueba("A1 Estructura: chip de estado pegado a la derecha de la cabecera")
        def _():
            r = fr.evaluate("""() => { const d=window.__q.top(); const bar=d.querySelector('.sapMBar'); const c=d.querySelector('.rmd-estado'); if(!c) return null; return {chip:window.__q.r(c), bar:window.__q.r(bar), txt:c.textContent}; }""")
            return (r and abs(r["bar"]["r"] - r["chip"]["r"] - 16) <= 4 and r["txt"] == "INGRESADO", str(r))
        abrir_dialogo(fr, pg, "PROCEDIMIENTO", "Adicionar Etiqueta")
        abrir_dialogo(fr, pg, "FABRICACION", "Adicionar Pasos RMD"); pg.wait_for_timeout(3000)

        @prueba("A2 Pasos: botones Copiar/Pegar en la barra de 'Pasos (n)', a la izquierda del separador/impresora, misma altura que el título")
        def _():
            r = fr.evaluate("""() => { const d=window.__q.top(); const h=d.querySelector('.sapMListHdr'); const g=h.querySelector('.rmd-copia-grupo'); if(!g) return null;
              const tit=h.querySelector('.sapMTitle'), sep=h.querySelector('.sapMTBSeparator'), imp=[...h.querySelectorAll('button')].find(x=>x.title==='Imprimir'), bs=[...g.querySelectorAll('button')];
              const cy=(el)=>{const q=el.getBoundingClientRect(); return (q.top+q.bottom)/2;};
              return {orden:[...h.children].indexOf(g) < [...h.children].indexOf(sep), gr:window.__q.r(g), sep:window.__q.r(sep), imp:window.__q.r(imp), tit:window.__q.r(tit), dy:Math.abs(cy(bs[0])-cy(tit)), dyImp:Math.abs(cy(bs[0])-cy(imp)), n:bs.length, textos:bs.map(x=>x.textContent.trim())}; }""")
            ok = r and r["orden"] and r["gr"]["r"] <= r["sep"]["l"] and r["gr"]["l"] > r["tit"]["r"] and r["dy"] <= 8 and r["dyImp"] <= 8 and r["n"] == 2
            return ok, str(r)
        @prueba("A3 La barra fija ya no contiene los botones (solo filtro, contador, alertas y aviso)")
        def _():
            n = fr.evaluate("[...window.__q.top().querySelectorAll('#rmd-filtro-bar button')].map(b=>b.textContent.trim())")
            return (len(n) == 1 and 'incoherencia' in n[0] or 'Sin incoherencias' in n[0]), str(n)
        @prueba("A4 Si UI5 vuelve a dibujar la barra de herramientas, los botones reaparecen una sola vez")
        def _():
            fr.evaluate("""() => { const h=window.__q.top().querySelector('.sapMListHdr'); sap.ui.getCore().byId(h.id).invalidate(); }""")
            pg.wait_for_timeout(2500)
            n = fr.evaluate("window.__q.top().querySelectorAll('.rmd-copia-grupo').length")
            return n == 1, f"grupos={n}"
        @prueba("A5 Filtro y alertas siempre visibles al desplazar (barra, título con Guardar y cabecera de columnas)")
        def _():
            fr.evaluate("(()=>{const s=window.__q.top().querySelector('section'); s.scrollTop=2500;})()"); pg.wait_for_timeout(700)
            r = fr.evaluate("""() => { const d=window.__q.top(); const s=d.querySelector('section').getBoundingClientRect(); const q=(e)=>e.getBoundingClientRect(); const bar=q(d.querySelector('#rmd-filtro-bar')), hdr=q(d.querySelector('.sapMListHdr')), th=q(d.querySelector('thead th'));
              return {sTop:Math.round(s.top), bar:Math.round(bar.top), hdr:Math.round(hdr.top), th:Math.round(th.top), sc:d.querySelector('section').scrollTop}; }""")
            ok = r["sc"] > 500 and abs(r["bar"] - r["sTop"]) <= 3 and r["hdr"] >= r["bar"] and r["hdr"] < r["th"] and r["th"] < r["sTop"] + 140
            fr.evaluate("(()=>{const s=window.__q.top().querySelector('section'); s.scrollTop=0;})()")
            return ok, str(r)
        @prueba("A5b La cabecera fija nunca tapa la primera fila visible (reposo y tras desplazar)")
        def _():
            r = fr.evaluate("""() => { const d=window.__q.top(); const s=d.querySelector('section'); const out=[];
              for (const sc of [0, 30, 40, 120, 500]) { s.scrollTop = sc; const th=d.querySelector('thead th').getBoundingClientRect(); const hb=th.bottom;
                const rows=[...d.querySelectorAll('tbody tr')].filter(r=>!/SubRow/.test(r.className)&&r.getClientRects().length);
                const tr=rows.find(r=>r.getBoundingClientRect().bottom>hb+12); if(!tr){out.push([sc,'sin fila']);continue;}
                const q=tr.getBoundingClientRect(); const cell=tr.querySelector('td.sapMListTblSelCol')||tr.children[0]; const cq=cell.getBoundingClientRect();
                const el=document.elementFromPoint(cq.left+cq.width/2, Math.max(q.top,hb)+6); out.push([sc, !!(el&&tr.contains(el))]); }
              s.scrollTop=0; return out; }""")
            return all(x[1] is True for x in r), str(r)
        @prueba("A6 Columnas ocultas (Estado Mov., Imagen, Formato) y Depende sin recortar")
        def _():
            r = fr.evaluate("""() => { const t=window.__q.top().querySelector('table'); const ths=[...t.querySelectorAll('thead th')]; const ocultas=ths.filter(x=>['ESTADO MOV.','IMAGEN','FORMATO'].includes(x.textContent.trim().toUpperCase())).map(x=>getComputedStyle(x).display);
              const iDep=ths.findIndex(x=>x.textContent.trim().toUpperCase()==='DEPENDE'); const cortados=[...t.querySelectorAll('tbody tr')].filter(r=>!/SubRow/.test(r.className)).map(r=>r.children[iDep]&&r.children[iDep].querySelector('input')).filter(i=>i&&i.value&&i.scrollWidth>i.clientWidth+1).length;
              return {ocultas, cortados}; }""")
            return (all(x == "none" for x in r["ocultas"]) and len(r["ocultas"]) == 3 and r["cortados"] == 0), str(r)
        @prueba("A7 Tooltips: Depende indica el paso; cabeceras con significado")
        def _():
            r = fr.evaluate("""() => { const t=window.__q.top().querySelector('table'); const i=[...t.querySelectorAll('tbody input')].find(x=>/Depende del paso/.test(x.title)); const th=[...t.querySelectorAll('thead th')].find(x=>x.textContent.trim()==='V.B.'); return {dep:i&&i.title.slice(0,60), vb:th&&th.title}; }""")
            return bool(r["dep"] and r["vb"]), str(r)
        @prueba("A8 'Sin tipo de dato' en rojo y negrita; Puesto faltante con animación; casillas incoherentes encerradas")
        def _():
            provocar_incoherencias(fr, pg)
            r = fr.evaluate("""() => { const t=window.__q.top().querySelector('table'); const td=t.querySelector('td.rmd-td-sintipo input'); const cs=td&&getComputedStyle(td); const pu=t.querySelector('td.rmd-sin-puesto .sapMInputBase'); const m=t.querySelector('td.rmd-marcar,td.rmd-desmarcar');
              return {rojo:cs&&cs.color, peso:cs&&cs.fontWeight, anim:pu&&getComputedStyle(pu).animationName, outline:m&&getComputedStyle(m).outlineStyle+' '+getComputedStyle(m).outlineWidth}; }""")
            return (r["peso"] in ("700", "800", "bold") and r["rojo"] and r["anim"] == "rmdPulso" and r["outline"] and "none" not in (r["outline"] or "none")), str(r)
        @prueba("A9 Sin 'Filas alternas' ni 'Más contraste' (ni clases ni opciones)")
        def _():
            r = fr.evaluate("""() => ({clases:document.documentElement.className.match(/rmd-(zebra|contraste)/g), panel:[...document.querySelectorAll('#rmd-ui-panel label')].map(l=>l.textContent.trim()).filter(x=>/contraste|alternas/i.test(x))})""")
            return (not r["clases"] and not r["panel"]), str(r)
        @prueba("A10 Filtro local: filtra, cuenta y se puede limpiar; Enter en el filtro no lanza búsquedas")
        def _():
            inp = fr.locator("#rmd-filtro-bar input.rmd-filtro").last
            inp.fill("MEZCLA"); pg.wait_for_timeout(500)
            c1 = fr.evaluate("window.__q.top().querySelector('.rmd-cuenta').textContent"); inp.press("Enter"); pg.wait_for_timeout(500)
            dlg = fr.evaluate("window.__q.d().length")
            inp.fill(""); pg.wait_for_timeout(500)
            c2 = fr.evaluate("window.__q.top().querySelector('.rmd-cuenta').textContent")
            return ("de" in c1 and "pasos" in c2 and "de" not in c2 and dlg == 3), f"{c1} | {c2} | dialogos={dlg}"
        @prueba("A11 Enter dentro de una celda de la tabla no dispara ninguna búsqueda")
        def _():
            antes = fr.evaluate("window.__q.d().length")
            fr.locator("table tbody tr td input").nth(2).press("Enter"); pg.wait_for_timeout(1200)
            return fr.evaluate("window.__q.d().length") == antes and not fr.evaluate("[...document.querySelectorAll('.sapUiLocalBusyIndicator')].some(e=>e.getClientRects().length)")
        @prueba("A12 Reposo: sin trabajo continuo (0 ajustes en 3 s) y sin errores de script")
        def _():
            a0 = fr.evaluate("window.__rmdStats.ajustes"); pg.wait_for_timeout(3000)
            a1 = fr.evaluate("window.__rmdStats.ajustes")
            return (a1 - a0 == 0 and not errores), f"ajustes={a1-a0} errores={errores[:2]}"
        @prueba("A13 Rendimiento en reposo con 150 pasos abiertos: revisión periódica < 15 ms y retraso del hilo (mediana de 3 ventanas) < 120 ms")
        def _():
            ventana_lag = """() => new Promise(res => { let max=0, last=performance.now(); const id=setInterval(()=>{ const n=performance.now(); max=Math.max(max, n-last-50); last=n; }, 50); setTimeout(()=>{clearInterval(id); res(Math.round(max));}, 2500); })"""
            lags = sorted(fr.evaluate(ventana_lag) for _ in range(3)); poll = fr.evaluate("window.__rmdStats.pollMs")
            return (lags[1] < 120 and poll is not None and poll < 15), f"retrasos={lags} revisión={poll} ms"
        @prueba("A14 Todas las ventanas centradas, dentro de pantalla y con pie visible")
        def _():
            r = fr.evaluate("""() => { const vw=innerWidth, vh=innerHeight; return window.__q.d().map(d=>{ const q=window.__q.r(d); const f=d.querySelector('footer'); const fq=f&&window.__q.r(f); return {cx:Math.abs(q.l+q.w/2-vw/2), cy:Math.abs(q.t+q.h/2-vh/2), dentro:q.l>=0&&q.t>=0&&q.r<=vw&&q.b<=vh, pie:!!fq&&fq.b<=vh}; }); }""")
            return all(x["cx"] <= 2 and x["cy"] <= 2 and x["dentro"] and x["pie"] for x in r), str(r)
        cerrar_seguro()

    # ───────────────────────── B. Portapapeles y su ciclo de vida ─────────────────────────
    if "B" in SOLO:
        abrir_pasos(pg, fr)
        @prueba("B1 Copiar sin selección → aviso; con dos pasos marcados → aviso")
        def _():
            fr.get_by_role("button", name="Copiar configuración").click()
            t1 = toast_texto(fr, pg, "UN solo paso", 6000)
            marcar_fila(fr, pg, 3); marcar_fila(fr, pg, 4)
            fr.evaluate("document.querySelectorAll('.rmd-toast').forEach(t=>t.remove())")
            fr.get_by_role("button", name="Copiar configuración").click()
            t2 = toast_texto(fr, pg, "UN solo paso", 6000)
            limpiar_seleccion(fr)
            return bool(t1 and t2), f"{bool(t1)} {bool(t2)}"
        @prueba("B2 Pegar deshabilitado mientras no haya nada copiado")
        def _():
            return fr.evaluate("window.__q.top().querySelector('.rmd-pegar').disabled") is True
        @prueba("B3 Copiar un paso con procesos menores: aviso en la barra y Pegar habilitado; nada en localStorage")
        def _():
            marcar_fila(fr, pg, 9)
            fr.get_by_role("button", name="Copiar configuración").click()
            t = toast_texto(fr, pg, "Copiado el paso #9", 60000)
            r = fr.evaluate("""() => ({clip:window.__q.top().querySelector('.rmd-clip').textContent, pegar:!window.__q.top().querySelector('.rmd-pegar').disabled, ls:localStorage.getItem('rmdUiPortapapeles')})""")
            limpiar_seleccion(fr)
            return bool(t and r["clip"].startswith("Copiado: #9") and r["pegar"] and r["ls"] is None), str(r)
        @prueba("B4 Pegar sobre el mismo paso copiado → bloqueado")
        def _():
            marcar_fila(fr, pg, 9); fr.evaluate("document.querySelectorAll('.rmd-toast').forEach(t=>t.remove())")
            fr.get_by_role("button", name="Pegar").click()
            t = toast_texto(fr, pg, "mismo que se copió", 8000); limpiar_seleccion(fr)
            return bool(t), str(t)
        @prueba("B5 El aviso sigue al cambiar de lista de pasos dentro del mismo RMD")
        def _():
            cerrar = fr.evaluate("(()=>{ const d=window.__q.top(); const b=[...d.querySelectorAll('footer button')].find(x=>x.textContent.trim()==='Cancelar'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); return true; })()")
            pg.wait_for_timeout(1500)
            abrir_dialogo(fr, pg, "RENDIMIENTO", "Adicionar Pasos RMD"); pg.wait_for_timeout(2500)
            r = fr.evaluate("({clip:window.__q.top().querySelector('.rmd-clip').textContent, pegar:!window.__q.top().querySelector('.rmd-pegar').disabled})")
            return (r["clip"].startswith("Copiado: #9") and r["pegar"]), str(r)
        @prueba("B6 Al cerrar el RMD el aviso desaparece y, al abrir otro (o el mismo), no queda nada copiado")
        def _():
            cerrar_todo(fr, pg); pg.wait_for_timeout(3500)
            abrir_pasos(pg, fr)
            r = fr.evaluate("({clip:window.__q.top().querySelector('.rmd-clip').textContent, pegar:window.__q.top().querySelector('.rmd-pegar').disabled})")
            return (r["clip"] == "" and r["pegar"] is True), str(r)
        cerrar_seguro()

    # ───────────────────────── C. Otros RMD y estados ─────────────────────────
    if "C" in SOLO:
        abrir_pasos(pg, fr)
        marcar_fila(fr, pg, 9); fr.get_by_role("button", name="Copiar configuración").click(); toast_texto(fr, pg, "Copiado el paso #9", 60000); limpiar_seleccion(fr)
        cerrar_todo(fr, pg); pg.wait_for_timeout(3500)
        try:
            RmdAutomation(pg).editor_de_rmd(RMD_AJENO); pg.wait_for_timeout(4000)
            abrir_dialogo(fr, pg, "PROCEDIMIENTO", "Adicionar Etiqueta"); abrir_dialogo(fr, pg, "RENDIMIENTO", "Adicionar Pasos RMD"); pg.wait_for_timeout(2500)
            @prueba("C1 Al ir a otro RMD el aviso del paso copiado no aparece")
            def _():
                r = fr.evaluate("({clip:window.__q.top().querySelector('.rmd-clip').textContent, pegar:window.__q.top().querySelector('.rmd-pegar').disabled, estado:(document.querySelector('.rmd-estado')||{}).textContent})")
                return (r["clip"] == "" and r["pegar"] is True), str(r)
            @prueba("C2 En un RMD copiar y pegar en el mismo RMD funciona hasta la vista previa (sin escribir) y el chip muestra su estado")
            def _():
                marcar_fila(fr, pg, 1); fr.get_by_role("button", name="Copiar configuración").click(); t = toast_texto(fr, pg, "Copiado el paso #1", 60000); limpiar_seleccion(fr)
                marcar_fila(fr, pg, 2); fr.get_by_role("button", name="Pegar").click()
                fr.locator(".rmd-modal").wait_for(timeout=90000); pg.wait_for_timeout(600)
                txt = fr.evaluate("document.querySelector('.rmd-modal').innerText")[:200]
                fr.get_by_role("button", name="Cancelar").last.click(); pg.wait_for_timeout(500); limpiar_seleccion(fr)
                return bool(t and "Destino" in txt), txt.replace("\n", " ")
            cerrar_seguro()
        except Exception as e:
            registrar("C1/C2 RMD ajeno", False, "EXCEPCIÓN " + str(e)[:160]); cerrar_seguro()
        # RMD Autorizado: pegar debe bloquearse
        pg.wait_for_timeout(3500)
        try:
            RmdAutomation(pg).editor_de_rmd(RMD_AUTORIZADO); pg.wait_for_timeout(4000)
            estado = fr.evaluate("(document.querySelector('.rmd-estado')||{}).textContent")
            abrir_dialogo(fr, pg, "PROCEDIMIENTO", "Adicionar Etiqueta"); abrir_dialogo(fr, pg, "RENDIMIENTO", "Adicionar Pasos RMD"); pg.wait_for_timeout(2500)
            @prueba(f"C3 RMD no Ingresado ({estado}): Pegar se bloquea con aviso y no escribe")
            def _():
                marcar_fila(fr, pg, 1); fr.get_by_role("button", name="Copiar configuración").click(); toast_texto(fr, pg, "Copiado el paso #1", 60000); limpiar_seleccion(fr)
                marcar_fila(fr, pg, 2); fr.evaluate("document.querySelectorAll('.rmd-toast').forEach(t=>t.remove())"); fr.get_by_role("button", name="Pegar").click()
                t = toast_texto(fr, pg, "solo se puede pegar en versiones Ingresadas", 8000)
                modal = fr.evaluate("!!document.querySelector('.rmd-modal')"); limpiar_seleccion(fr)
                return (bool(t) and not modal) if estado and 'INGRESADO' not in estado else (True, f"el RMD está {estado}; no aplica")
            cerrar_seguro()
        except Exception as e:
            registrar("C3 RMD autorizado", False, "EXCEPCIÓN " + str(e)[:160]); cerrar_seguro()

    # ───────────────────────── E. Interruptores del panel (apagar deja el portal como estaba) ─────────────────────────
    if "E" in SOLO:
        pg.wait_for_timeout(3000); abrir_pasos(pg, fr); provocar_incoherencias(fr, pg)
        def conmutar(texto):
            fr.evaluate("document.querySelector('#rmd-ui-panel').open = true")
            fr.locator(f"#rmd-ui-panel label:has-text('{texto}') input").click(); pg.wait_for_timeout(900)
            fr.evaluate("document.querySelector('#rmd-ui-panel').open = false")
        cuenta = lambda sel: fr.evaluate(f"window.__q.top().querySelectorAll('{sel}').length")
        @prueba("E1 Copiar/Pegar: apagar retira los botones y el aviso; encender los devuelve")
        def _():
            a = cuenta('.rmd-copia-grupo'); conmutar('Botones Copiar'); b_ = cuenta('.rmd-copia-grupo'); conmutar('Botones Copiar'); c = cuenta('.rmd-copia-grupo')
            return (a == 1 and b_ == 0 and c == 1), f"{a}->{b_}->{c}"
        @prueba("E2 Filtro local apagado: desaparece el campo pero quedan las alertas; con filtro y alertas apagados desaparece la barra")
        def _():
            conmutar('Filtro local'); inp = fr.evaluate("getComputedStyle(window.__q.top().querySelector('#rmd-filtro-bar input')).display"); bar1 = cuenta('#rmd-filtro-bar')
            conmutar('Alertas de casillas'); bar2 = cuenta('#rmd-filtro-bar')
            conmutar('Alertas de casillas'); conmutar('Filtro local'); bar3 = cuenta('#rmd-filtro-bar'); inp3 = fr.evaluate("getComputedStyle(window.__q.top().querySelector('#rmd-filtro-bar input')).display")
            return (inp == "none" and bar1 == 1 and bar2 == 0 and bar3 == 1 and inp3 != "none"), f"{inp} {bar1} {bar2} {bar3} {inp3}"
        @prueba("E3 Columnas ocultas: apagar las muestra; encender las oculta")
        def _():
            f = "[...window.__q.top().querySelectorAll('thead th')].filter(x=>['ESTADO MOV.','IMAGEN','FORMATO'].includes(x.textContent.trim().toUpperCase())).map(x=>getComputedStyle(x).display)"
            a = fr.evaluate(f); conmutar('Ocultar Estado Mov'); b_ = fr.evaluate(f); conmutar('Ocultar Estado Mov'); c = fr.evaluate(f)
            return (all(x == "none" for x in a) and all(x != "none" for x in b_) and all(x == "none" for x in c)), f"{a} {b_} {c}"
        @prueba("E4 Columnas ordenadas: apagar devuelve los anchos del portal; encender los aplica")
        def _():
            f = "[...window.__q.top().querySelectorAll('thead th')].filter(x=>x.style.width).length"
            a = fr.evaluate(f); conmutar('Columnas ordenadas'); b_ = fr.evaluate(f); conmutar('Columnas ordenadas'); c = fr.evaluate(f)
            return (a > 5 and b_ == 0 and c > 5), f"{a} {b_} {c}"
        @prueba("E5 Estado del RMD: apagar retira la etiqueta; encender la devuelve a la derecha")
        def _():
            a = cuenta('.rmd-estado'); conmutar('Estado del RMD'); b_ = cuenta('.rmd-estado'); conmutar('Estado del RMD'); c = cuenta('.rmd-estado')
            return (a == 1 and b_ == 0 and c == 1), f"{a} {b_} {c}"
        @prueba("E6 'Sin tipo de dato' y 'Puesto parpadea': apagar los quita")
        def _():
            f = "(()=>{ const t=window.__q.top().querySelector('td.rmd-td-sintipo input'); const p=window.__q.top().querySelector('td.rmd-sin-puesto .sapMInputBase'); return [t&&getComputedStyle(t).fontWeight, p&&getComputedStyle(p).animationName]; })()"
            a = fr.evaluate(f); conmutar('en rojo y negrita'); conmutar('Puesto de Trabajo faltante'); b_ = fr.evaluate(f); conmutar('en rojo y negrita'); conmutar('Puesto de Trabajo faltante'); c = fr.evaluate(f)
            return (a[0] in ("700", "800") and a[1] == "rmdPulso" and b_[0] not in ("700", "800") and b_[1] in (None, "none") and c == a), f"{a} {b_} {c}"
        @prueba("E7 'Mejoras activas' apagado: la ventana de Pasos vuelve a su tamaño del portal y no queda nada añadido; encendido lo restaura")
        def _():
            f = "(()=>{ const d=window.__q.top(); return {extra:d.querySelectorAll('#rmd-filtro-bar,.rmd-copia-grupo,.rmd-estado,td.rmd-td-sintipo,td.rmd-marcar,td.rmd-desmarcar').length, ancho:Math.round(d.getBoundingClientRect().width), clases:[...d.classList].filter(c=>/^rmd-/.test(c)).join(' ')}; })()"
            a = fr.evaluate(f); conmutar('Mejoras activas'); b_ = fr.evaluate(f); conmutar('Mejoras activas'); pg.wait_for_timeout(1200); c = fr.evaluate(f)
            return (a["extra"] > 10 and b_["extra"] == 0 and b_["clases"] == "" and b_["ancho"] < a["ancho"] and c["extra"] > 10 and c["ancho"] == a["ancho"]), f"{a} | {b_} | {c}"
        cerrar_seguro()

    # ───────────────────────── F. Otras listas de pasos, Escape y avisos ─────────────────────────
    if "F" in SOLO:
        pg.wait_for_timeout(3000); abrir_pasos(pg, fr, etq="RENDIMIENTO")
        @prueba("F1 Lista corta (Rendimiento): ventana compacta y centrada, con barra de alertas, botones en su barra de herramientas")
        def _():
            r = fr.evaluate("""() => { const d=window.__q.top(); const q=window.__q.r(d); return {clases:[...d.classList].filter(c=>/^rmd-/.test(c)).join(' '), h:q.h, vh:innerHeight, grupo:d.querySelectorAll('.rmd-copia-grupo').length, bar:d.querySelectorAll('#rmd-filtro-bar').length}; }""")
            return (r["grupo"] == 1 and r["bar"] == 1 and r["h"] < r["vh"] - 100 and "rmd-medio" in r["clases"]), str(r)
        @prueba("F2 Escape en la vista previa cierra solo esa ventana; la de SAP sigue abierta")
        def _():
            limpiar_seleccion(fr); marcar_fila(fr, pg, 1); fr.get_by_role("button", name="Copiar configuración").click(); toast_texto(fr, pg, "Copiado el paso #1", 90000); limpiar_seleccion(fr)
            marcar_fila(fr, pg, 2); fr.get_by_role("button", name="Pegar").click(); fr.locator(".rmd-modal").wait_for(timeout=90000); pg.wait_for_timeout(500)
            n0 = fr.evaluate("window.__q.d().length"); pg.keyboard.press("Escape"); pg.wait_for_timeout(700)
            r = fr.evaluate("({modal:!!document.querySelector('.rmd-modal'), dlg:window.__q.d().length})")
            limpiar_seleccion(fr)
            return (not r["modal"] and r["dlg"] == n0), f"{n0} -> {r}"
        @prueba("F3 Un solo aviso a la vez (los nuevos reemplazan a los anteriores)")
        def _():
            fr.evaluate("document.querySelectorAll('.rmd-toast').forEach(t=>t.remove())")
            fr.get_by_role("button", name="Copiar configuración").click(); pg.wait_for_timeout(300)
            fr.get_by_role("button", name="Copiar configuración").click(); pg.wait_for_timeout(300)
            n = fr.evaluate("document.querySelectorAll('.rmd-toast').length")
            return n == 1, f"avisos={n}"
        cerrar_todo(fr, pg); pg.wait_for_timeout(2500)
        abrir_pasos(pg, fr, etq="FABRICACION")
        @prueba("F4 El diálogo de procesos menores y el de equipos no llevan botones de copiar")
        def _():
            abrir_dialogo(fr, pg, None, "Procesos Menores", 8); pg.wait_for_timeout(1500)
            a = fr.evaluate("window.__q.top().querySelectorAll('.rmd-copia-grupo').length")
            cerrar_dialogo_top = fr.evaluate("""() => { const d=window.__q.top(); const b=[...d.querySelectorAll('footer button')].find(x=>x.textContent.trim()==='Cerrar'||x.textContent.trim()==='Cancelar'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); }"""); pg.wait_for_timeout(1200)
            return a == 0, f"grupos en PM={a}"
        cerrar_seguro()

    # ───────────────────────── G. Pantalla pequeña (1366×650) ─────────────────────────
    if "G" in SOLO:
        pg.set_viewport_size({"width": 1366, "height": 650}); pg.wait_for_timeout(1500)
        abrir_pasos(pg, fr)
        @prueba("G1 1366×650: botones dentro de la barra de herramientas, visibles y a la izquierda del icono de impresora")
        def _():
            r = fr.evaluate("""() => { const d=window.__q.top(); const h=d.querySelector('.sapMListHdr'); const g=h.querySelector('.rmd-copia-grupo'); const imp=[...h.querySelectorAll('button')].find(x=>x.title==='Imprimir'); const tit=h.querySelector('.sapMTitle');
              return {g:window.__q.r(g), imp:window.__q.r(imp), h:window.__q.r(h), tit:window.__q.r(tit), vw:innerWidth}; }""")
            return (r["g"]["r"] < r["imp"]["l"] and r["g"]["l"] > r["tit"]["r"] and r["g"]["r"] <= r["vw"] and r["g"]["l"] >= 0 and abs((r["g"]["t"]+r["g"]["b"])/2-(r["tit"]["t"]+r["tit"]["b"])/2) <= 8), str(r)
        @prueba("G2 1366×650: ventanas centradas, dentro de pantalla y con pie visible")
        def _():
            r = fr.evaluate("""() => { const vw=innerWidth, vh=innerHeight; return window.__q.d().map(d=>{ const q=window.__q.r(d); const f=d.querySelector('footer'); const fq=f&&window.__q.r(f); return {cx:Math.abs(q.l+q.w/2-vw/2), cy:Math.abs(q.t+q.h/2-vh/2), dentro:q.l>=0&&q.t>=0&&q.r<=vw&&q.b<=vh, pie:!!fq&&fq.b<=vh}; }); }""")
            return all(x["cx"] <= 2 and x["cy"] <= 2 and x["dentro"] and x["pie"] for x in r), str(r)
        @prueba("G3 1366×650: chip de estado a la derecha y filtro/alertas siempre visibles al desplazar")
        def _():
            fr.evaluate("(()=>{const s=window.__q.top().querySelector('section'); s.scrollTop=1800;})()"); pg.wait_for_timeout(700)
            r = fr.evaluate("""() => { const d=window.__q.top(); const bar=d.querySelector('.sapMBar').getBoundingClientRect(), c=d.querySelector('.rmd-estado').getBoundingClientRect(); const s=d.querySelector('section').getBoundingClientRect(), f=d.querySelector('#rmd-filtro-bar').getBoundingClientRect();
              return {chipDer:Math.round(bar.right-c.right), sTop:Math.round(s.top), barTop:Math.round(f.top)}; }""")
            return (abs(r["chipDer"] - 16) <= 4 and abs(r["sTop"] - r["barTop"]) <= 3), str(r)
        cerrar_todo(fr, pg); pg.set_viewport_size({"width": 1920, "height": 945})

    # ───────────────────────── H. Ventana "Asociar Fórmula" (se deja como la dibuja el portal + aviso de códigos) ─────────────────────────
    if "H" in SOLO:
        cerrar_seguro(); pg.set_viewport_size({"width": 1920, "height": 945}); pg.wait_for_timeout(1500)
        def esperar_libre(max_s=90):
            for _ in range(max_s):
                if not fr.evaluate("!!document.querySelector('.sapUiBlyBusy')") and not fr.evaluate("[...document.querySelectorAll('.sapUiLocalBusyIndicator')].some(e=>e.getClientRects().length)"): return
                pg.wait_for_timeout(1000)
        def poner_filtro(etiqueta, valor):
            fr.evaluate("""([lab, v]) => { const doc=document; const el=[...doc.querySelectorAll('input')].find(i=>i.getClientRects().length && !i.closest('[role=dialog]') && (i.getAttribute('aria-labelledby')||'').split(' ').some(id=>{const e=doc.getElementById(id); return e && e.textContent.trim().replace(/[*:]$/,'')===lab;}));
              const c=sap.ui.getCore().byId(el.id.replace(/-inner$/,'')); c.setValue(v); c.fireChange({value:v}); }""", [etiqueta, valor])
        def abrir_asociar(por_codigo=False):
            poner_filtro("Codigo RMD", RMD_ASOCIAR if por_codigo else ""); poner_filtro("Descripción", "" if por_codigo else ASOCIAR_DESC)
            RmdAutomation(pg).configuracion.filtrar(ConfiguracionFiltro()); pg.wait_for_timeout(3000); esperar_libre(); pg.wait_for_timeout(1500)
            fila = fr.locator("tbody tr").filter(has_text=RMD_ASOCIAR).first
            RmdAutomation(pg).configuracion.elegir_accion("Asociar fórmulas", fila); pg.wait_for_timeout(5000)
        abrir_asociar()
        def conmutar_panel(texto):
            fr.evaluate("document.querySelector('#rmd-ui-panel').open = true")
            fr.locator(f"#rmd-ui-panel label:has-text('{texto}') input").click(); pg.wait_for_timeout(900)
            fr.evaluate("document.querySelector('#rmd-ui-panel').open = false")
        medir = """() => { const d=window.__q.top(); const q=window.__q.r(d); const av=d.querySelector('#rmd-aviso-asociar'); return {t:(d.querySelector('h2')||{}).textContent, w:q.w, h:q.h, clases:[...d.classList].filter(c=>/^rmd-/.test(c)).join(' '), aviso:av?av.textContent:null, avisoH:av?av.offsetHeight:0}; }"""
        @prueba("H1 'Asociar Fórmula' se deja como el portal la dibuja: sin clases del script y con el mismo ancho (y solo el alto del aviso de más) que con las mejoras apagadas")
        def _():
            a = fr.evaluate(medir); conmutar_panel('Mejoras activas'); pg.wait_for_timeout(1200); b_ = fr.evaluate(medir); conmutar_panel('Mejoras activas'); pg.wait_for_timeout(1800); c = fr.evaluate(medir)
            ok = a["clases"] == "" and a["w"] == b_["w"] == c["w"] and abs((a["h"] - b_["h"]) - (a["avisoH"] + 6)) <= 2 and b_["aviso"] is None and c["aviso"] is not None
            return ok, f"con={a} sin={b_} de nuevo={c}"
        @prueba("H2 Aviso de códigos: si Código Agrupador y Código coinciden con la versión anterior, lo indica (✓)")
        def _():
            a = fr.evaluate(medir)
            return (a["aviso"] is not None and "coinciden con la versión anterior" in a["aviso"] and a["aviso"].startswith("✓")), str(a["aviso"])
        def poner_agrupador(v):
            fr.evaluate("""(v) => { const d=window.__q.top(); const lab=[...d.querySelectorAll('label')].find(l=>/^Código Agrupador/.test(l.textContent.trim())); const el=document.getElementById(lab.getAttribute('for')); const c=sap.ui.getCore().byId(el.id.replace(/-inner$/,'')); c.setValue(v); c.fireChange({value:v}); }""", v)
            pg.wait_for_timeout(1600)
        @prueba("H3 Aviso de códigos: un Código Agrupador distinto al de la versión anterior se advierte y se resalta el campo")
        def _():
            orig = fr.evaluate("""() => { const d=window.__q.top(); const lab=[...d.querySelectorAll('label')].find(l=>/^Código Agrupador/.test(l.textContent.trim())); return document.getElementById(lab.getAttribute('for')).value; }""")
            poner_agrupador("999999")
            r = fr.evaluate("""() => { const d=window.__q.top(); const lab=[...d.querySelectorAll('label')].find(l=>/^Código Agrupador/.test(l.textContent.trim())); const base=document.getElementById(lab.getAttribute('for')).closest('.sapMInputBase'); const av=d.querySelector('#rmd-aviso-asociar'); return {aviso:av&&av.textContent, cls:av&&av.className, campo:base.classList.contains('rmd-campo-aviso'), sombra:getComputedStyle(base.querySelector('.sapMInputBaseContentWrapper')||base).boxShadow}; }""")
            poner_agrupador(orig)
            ok = r["aviso"] and r["aviso"].startswith("⚠") and "no coincide con la versión anterior" in r["aviso"] and r["campo"] and r["cls"] == "aviso" and r["sombra"] != "none"
            return ok, f"{r} (original {orig})"
        @prueba("H4 Aviso de códigos: un Código Agrupador vacío se advierte; al restaurarlo vuelve el ✓ y se quita el resalte")
        def _():
            orig = fr.evaluate("""() => { const d=window.__q.top(); const lab=[...d.querySelectorAll('label')].find(l=>/^Código Agrupador/.test(l.textContent.trim())); return document.getElementById(lab.getAttribute('for')).value; }""")
            poner_agrupador("")
            v = fr.evaluate("(document.querySelector('#rmd-aviso-asociar')||{}).textContent")
            poner_agrupador(orig)
            r = fr.evaluate("""() => { const d=window.__q.top(); const av=d.querySelector('#rmd-aviso-asociar'); return {aviso:av&&av.textContent, resaltados:d.querySelectorAll('.rmd-campo-aviso').length}; }""")
            return (v and "vacío" in v and v.startswith("⚠") and r["aviso"].startswith("✓") and r["resaltados"] == 0), f"{v} | {r}"
        cerrar_seguro()
        abrir_asociar(por_codigo=True)
        @prueba("H5 Con la lista filtrada por un solo código (la versión anterior ya no se ve) el aviso sigue comparando con la versión anterior recordada de la sesión")
        def _():
            a = fr.evaluate(medir)
            visibles = fr.evaluate(r"[...document.querySelectorAll('tbody tr')].filter(r=>!r.closest('[role=dialog]') && r.getClientRects().length && /^\s*\d{10}/.test(r.innerText)).length")
            return (a["aviso"] is not None and a["aviso"].startswith("✓") and "versión anterior v" in a["aviso"]), f"filas visibles en la lista={visibles} aviso={a['aviso']}"
        cerrar_seguro()

    # ───────────────────────── I. Diseño de las listas de Pasos en varios tamaños de ventana ─────────────────────────
    if "I" in SOLO:
        cerrar_seguro()
        MEDIR_LISTA = """() => { const d=window.__q.top(); const t=d.querySelector('table'); const ths=[...t.querySelectorAll('thead th')].filter(x=>x.getBoundingClientRect().width>0); const sec=d.querySelector('section'); const dr=d.getBoundingClientRect();
          const cab=ths.map(x=>{ const sp=x.querySelector('span.sapMText, span'); const r=x.getBoundingClientRect(); return {n:x.textContent.trim().slice(0,14), w:Math.round(r.width), h:Math.round(r.height), sobra: sp? sp.scrollWidth>sp.clientWidth+1 : false}; });
          const desc=cab.find(c=>/^DESCRIP/i.test(c.n)); const orden=cab.find(c=>/^ORDEN/i.test(c.n)); const codigo=cab.find(c=>/^C.DIGO/i.test(c.n)); const ultima=[...ths].pop();
          return {desc:desc&&desc.w, alto:Math.max(...cab.map(c=>c.h)), partidas:cab.filter(c=>c.sobra).map(c=>c.n), sec:[sec.clientWidth, sec.scrollWidth], orden:orden&&orden.w, codigo:codigo&&codigo.w, cols:cab.length}; }"""
        for k, etq in enumerate(ETQS_LISTAS):
            abrir_pasos(pg, fr, codigo=RMD_LAYOUT, etq=etq)
            @prueba(f"I{k+1} {etq}: cabecera de una o dos líneas, Descripción no aplastada y sin desplazamiento horizontal en 1415×886, 1920×945, 1600×900 y 1366×650")
            def _():
                fallos = []
                for (w, h, minimo) in [(1415, 886, 225), (1920, 945, 300), (1600, 900, 300), (1366, 650, 205)]:
                    pg.set_viewport_size({"width": w, "height": h}); pg.wait_for_timeout(1500)
                    m = fr.evaluate(MEDIR_LISTA)
                    if (m["desc"] or 0) < minimo or m["alto"] > 60 or m["partidas"] or m["sec"][1] > m["sec"][0] + 1:
                        fallos.append(f"{w}x{h}: {m}")
                pg.set_viewport_size({"width": 1920, "height": 945}); pg.wait_for_timeout(800)
                return (not fallos), " | ".join(fallos)[:600]
            @prueba(f"I{k+1}b {etq}: a 1280×720 la Descripción conserva al menos 205 px y la cabecera sigue legible (se permite desplazamiento horizontal)")
            def _():
                pg.set_viewport_size({"width": 1280, "height": 720}); pg.wait_for_timeout(1500)
                m = fr.evaluate(MEDIR_LISTA); pg.set_viewport_size({"width": 1920, "height": 945}); pg.wait_for_timeout(800)
                return ((m["desc"] or 0) >= 205 and m["alto"] <= 60 and not m["partidas"]), str(m)
            cerrar_seguro(); pg.wait_for_timeout(2000)

    # ───────────────────────── J. Especificaciones: reordenar y editar textos ─────────────────────────
    if "J" in SOLO:
        cerrar_seguro(); pg.set_viewport_size({"width": 1415, "height": 886}); pg.wait_for_timeout(1500)
        TOP = "[...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].filter(x=>x.getClientRects().length).pop()"
        ultimo_error = [""]
        def abrir_spec(codigo=None):
            codigo = codigo or RMD_PRUEBA
            for intento in range(3):
                try:
                    RmdAutomation(pg).editor_de_rmd(codigo); pg.wait_for_timeout(4000)
                    abrir_dialogo(fr, pg, "ESPECIFICACIONES", "Adicionar Especificaciones"); pg.wait_for_timeout(4500)
                    return True
                except Exception as ex:
                    try: est = fr.evaluate("({dlg:[...document.querySelectorAll('.sapMDialog')].filter(x=>x.getClientRects().length).map(d=>(d.querySelector('h2')||{}).textContent), bly:[...document.querySelectorAll('.sapUiBLy')].filter(x=>x.getClientRects().length).map(x=>x.className)})")
                    except Exception: est = "?"
                    ultimo_error[0] = (str(ex)[:120] + " | " + str(est))[:400]
                    if intento == 2: return False
                    cerrar_seguro(); pg.wait_for_timeout(5000 * (intento + 1))
        def reabrir_spec():
            abrir_dialogo(fr, pg, "ESPECIFICACIONES", "Adicionar Especificaciones"); pg.wait_for_timeout(4500)
        def cerrar_spec():
            i = fr.evaluate("() => " + TOP + ".id"); ACEPTAR[0] = True
            try: fr.locator(f"[id='{i}'] footer button", has_text="Cancelar").click(); pg.wait_for_timeout(2500)
            finally: ACEPTAR[0] = False
        ESTADO_ESPEC = "() => { const d=" + TOP + """; const t=d.querySelector('table'); const ctl=sap.ui.getCore().byId(t.id.replace(/-listUl$/,''));
          const items=ctl.getItems(); const filas=items.map(it=>{ const k=Object.keys(it.oBindingContexts)[0]; const o=it.getBindingContext(k).getObject(); return [o.ensayoHijo, (o.especificacion||'').slice(-14), o.orden, it.getSelected()?'x':'']; });
          const g=d.querySelector('.rmd-orden-grupo'); const trs=[...t.querySelectorAll('tbody tr.sapMListTblRow')];
          return {filas, n:trs.length, tas:t.querySelectorAll('textarea.rmd-edit').length, grips:t.querySelectorAll('.rmd-grip').length, grupo:!!g, botones:g?[...g.querySelectorAll('button')].map(b=>b.disabled):null, titulos:g?[...g.querySelectorAll('button')].map(b=>b.title):null,
            nota:g?g.querySelector('.rmd-espec-nota').textContent:null, dom:trs.map(r=>(r.querySelector('textarea[data-campo=ensayoHijo]')||{}).value), textos:trs.map(r=>(r.querySelector('textarea[data-campo=especificacion]')||{}).value),
            ocultos:trs.every(r=>[...r.querySelectorAll('.sapMObjectIdentifierText, td.rmd-ed > .sapMText')].every(x=>getComputedStyle(x).display==='none')), modificadas:trs.map(r=>r.classList.contains('rmd-espec-mod'))}; }"""
        def marcar_espec(n):
            rid = fr.evaluate("(n) => { const d=" + TOP + "; return [...d.querySelectorAll('tbody tr.sapMListTblRow')][n].id; }", n)
            fr.locator(f"[id='{rid}'] td.sapMListTblSelCol").click(); pg.wait_for_timeout(600)
        def desmarcar_todo():
            fr.evaluate("() => { const d=" + TOP + "; const t=d.querySelector('table'); sap.ui.getCore().byId(t.id.replace(/-listUl$/,'')).removeSelections(true); }"); pg.wait_for_timeout(500)
        def dlg_id(): return fr.evaluate("() => " + TOP + ".id")
        def orden_actual(): return [f[0] for f in fr.evaluate(ESTADO_ESPEC)["filas"]]
        def orden_num(): return [f[2] for f in fr.evaluate(ESTADO_ESPEC)["filas"]]
        hay = abrir_spec()
        if not hay:
            registrar("J0 Se pudo abrir Especificaciones del RMD de prueba", False, f"RMD {RMD_PRUEBA}")
        else:
            e0 = fr.evaluate(ESTADO_ESPEC); N = e0["n"]; ORIGINAL = list(e0["filas"])
            @prueba("J1 Especificaciones: cada fila tiene Descripción y Especificaciones editables (con el texto original), asa para arrastrar y Subir/Bajar deshabilitados sin filas marcadas")
            def _():
                ok = N >= 3 and e0["tas"] == 2 * N and e0["grips"] == N and e0["grupo"] and e0["botones"] == [True, True] and e0["ocultos"] and e0["dom"] == [f[0] for f in ORIGINAL]
                return ok, f"filas={N} textareas={e0['tas']} asas={e0['grips']} botones={e0['botones']} ocultos={e0['ocultos']}"
            @prueba("J2 Editar un texto actualiza el modelo del portal, marca la fila, avisa 'cambios sin guardar' y NO marca la fila (la lista de SAP no reacciona)")
            def _():
                ta = fr.locator(f"[id='{dlg_id()}'] textarea.rmd-edit[data-campo=especificacion]").nth(1); ta.click(); ta.press("End"); ta.type(" (EDITADO)"); pg.wait_for_timeout(900)
                e = fr.evaluate(ESTADO_ESPEC)
                ok = e["textos"][1].endswith("(EDITADO)") and e["nota"] == "● 1 fila con cambios sin guardar" and e["modificadas"][1] and all(f[3] == "" for f in e["filas"])
                return ok, f"{e['nota']} {e['modificadas']} {[f[3] for f in e['filas']]}"
            @prueba("J3 Subir/Bajar: mueven la fila marcada una posición, conservan su marca y reparten la orden con los mismos valores")
            def _():
                antes = orden_actual(); ords = orden_num(); marcar_espec(2)
                fr.locator(".rmd-orden-grupo button", has_text="Subir").click(); pg.wait_for_timeout(1200)
                e1 = fr.evaluate(ESTADO_ESPEC); tras = [f[0] for f in e1["filas"]]
                subio = tras[1] == antes[2] and tras[2] == antes[1] and e1["filas"][1][3] == "x" and sorted(f[2] for f in e1["filas"]) == sorted(ords) and [f[2] for f in e1["filas"]] == sorted(ords)
                fr.locator(".rmd-orden-grupo button", has_text="Bajar").click(); pg.wait_for_timeout(1200)
                e2 = fr.evaluate(ESTADO_ESPEC)
                bajo = [f[0] for f in e2["filas"]] == antes and e2["filas"][2][3] == "x"
                return (subio and bajo), f"antes={antes} tras subir={tras} tras bajar={[f[0] for f in e2['filas']]} ord={[f[2] for f in e1['filas']]}"
            @prueba("J4 Subir en la primera fila y Bajar en la última no cambian nada; varias filas marcadas se mueven juntas")
            def _():
                desmarcar_todo(); antes = orden_actual(); marcar_espec(0)
                fr.locator(".rmd-orden-grupo button", has_text="Subir").click(); pg.wait_for_timeout(900)
                a = orden_actual() == antes
                desmarcar_todo(); marcar_espec(N - 1); fr.locator(".rmd-orden-grupo button", has_text="Bajar").click(); pg.wait_for_timeout(900)
                b_ = orden_actual() == antes
                desmarcar_todo(); marcar_espec(1); marcar_espec(2); fr.locator(".rmd-orden-grupo button", has_text="Subir").click(); pg.wait_for_timeout(1200)
                t = orden_actual(); c = t[0] == antes[1] and t[1] == antes[2] and t[2] == antes[0]
                fr.locator(".rmd-orden-grupo button", has_text="Bajar").click(); pg.wait_for_timeout(1200)
                d_ = orden_actual() == antes
                return (a and b_ and c and d_), f"{a} {b_} {c} {d_} {t}"
            @prueba("J5 Arrastrar el asa de una fila a otra la reubica (antes/después según la mitad de la fila) y actualiza la orden")
            def _():
                desmarcar_todo(); antes = orden_actual(); did = dlg_id()
                dest = fr.locator(f"[id='{did}'] tbody tr.sapMListTblRow").nth(N - 2); box = dest.bounding_box()
                fr.locator(f"[id='{did}'] .rmd-grip").nth(0).drag_to(dest, target_position={"x": 200, "y": max(4, box["height"] - 6)}); pg.wait_for_timeout(1300)
                e = fr.evaluate(ESTADO_ESPEC); t = [f[0] for f in e["filas"]]
                esperado = antes[1:N - 1] + [antes[0]] + antes[N - 1:]
                arriba = fr.locator(f"[id='{did}'] .rmd-grip").nth(N - 1)   # ahora subir la última fila al principio (mitad superior de la primera)
                d0 = fr.locator(f"[id='{did}'] tbody tr.sapMListTblRow").nth(0)
                arriba.drag_to(d0, target_position={"x": 200, "y": 4}); pg.wait_for_timeout(1300)
                t2 = orden_actual()
                return (t == esperado and t2[0] == esperado[N - 1] and sorted(f[2] for f in e["filas"]) == [f[2] for f in e["filas"]]), f"antes={antes} tras={t} esperado={esperado} final={t2}"
            def cortafuegos_y_stub():
                """Sustituye model.update por un simulador y bloquea en el navegador cualquier escritura al backend (red de seguridad)."""
                ok = fr.evaluate("() => { const d=" + TOP + """; const core=sap.ui.getCore(); const tt=d.querySelector('table'); let c=core.byId(tt.id.replace(/-listUl$/,'')); while(c && !c.getController) c=c.getParent&&c.getParent(); const ctrl=c&&c.getController();
                  const b=[...d.querySelectorAll('button')].find(x=>x.title==='Guardar'); const l=core.byId(b.id.replace(/-inner$/,'')).mEventRegistry.press[0];
                  if(!(ctrl && ctrl.mainModelv2===l.oListener.mainModelv2 && typeof ctrl.mainModelv2.update==='function')) return false;
                  window.__capt=[]; ctrl.mainModelv2.update=function(ruta,datos,params){ window.__capt.push({ruta:String(ruta), datos:JSON.parse(JSON.stringify(datos))}); setTimeout(()=>{ params&&params.success&&params.success({}); },20); }; return true; }""")
                bloqueadas = []
                def guardia(route):
                    if route.request.method != "GET": bloqueadas.append(route.request.method); route.abort()
                    else: route.continue_()
                if ok: pg.route("**/dest-apigateway/**", guardia)
                return ok, bloqueadas, guardia
            def quitar_stub(guardia):
                fr.evaluate("() => { const d=" + TOP + "; const core=sap.ui.getCore(); const tt=d.querySelector('table'); let c=core.byId(tt.id.replace(/-listUl$/,'')); while(c && !c.getController) c=c.getParent&&c.getParent(); delete c.getController().mainModelv2.update; }")
                try: pg.unroute("**/dest-apigateway/**", guardia)
                except Exception: pass
            def pulsar_guardar():
                bid = fr.evaluate("() => [...(" + TOP + ").querySelectorAll('button')].find(x=>x.title==='Guardar').id")
                fr.locator(f"[id='{bid}']").click(); pg.wait_for_timeout(1800)
            @prueba("J6 Guardar (portal): cada fila se actualiza con SUS campos y, solo las modificadas, con ensayoHijo/especificacion/orden; después ya no hay cambios pendientes (petición simulada: nada se escribe)")
            def _():
                listo, bloqueadas, guardia = cortafuegos_y_stub()
                if not listo: return False, "no se pudo asegurar el simulador: no se pulsa Guardar"
                try:
                    antes = fr.evaluate(ESTADO_ESPEC)
                    pulsar_guardar()
                    capt = fr.evaluate("window.__capt"); despues = fr.evaluate(ESTADO_ESPEC)
                finally:
                    quitar_stub(guardia)
                nativos = {"decimales", "fechaActualiza", "margen", "tipoDatoId_iMaestraId", "usuarioActualiza", "valorFinal", "valorInicial"}
                todas = len(capt) == N and all(nativos <= set(c["datos"].keys()) for c in capt)
                con_texto = [c for c in capt if "especificacion" in c["datos"]]
                con_orden = [c for c in capt if "orden" in c["datos"]]
                pendientes_antes = sum(1 for m in antes["modificadas"] if m)
                ok = todas and len(con_texto) == 1 and con_texto[0]["datos"]["especificacion"].endswith("(EDITADO)") and len(con_orden) >= 1 and not bloqueadas and despues["nota"] == ""
                return ok, f"peticiones={len(capt)} con_texto={len(con_texto)} con_orden={len(con_orden)} bloqueadas={bloqueadas} pendientes_antes={pendientes_antes} nota_despues={despues['nota']!r}"
            @prueba("J7 Descartar: un cambio sin guardar se pierde al cerrar la ventana (con aviso previo) y al reabrir queda lo último guardado")
            def _():
                guardado = fr.evaluate(ESTADO_ESPEC)
                ta = fr.locator(f"[id='{dlg_id()}'] textarea.rmd-edit[data-campo=especificacion]").nth(0); ta.click(); ta.press("End"); ta.type(" SIN GUARDAR"); pg.wait_for_timeout(700)
                antes = len(dialogos_nativos); cerrar_spec()
                aviso = dialogos_nativos[antes:] if len(dialogos_nativos) > antes else []
                reabrir_spec(); e = fr.evaluate(ESTADO_ESPEC)
                ok = bool(aviso) and "sin guardar" in aviso[0].lower() and e["textos"] == guardado["textos"] and [f[0] for f in e["filas"]] == [f[0] for f in guardado["filas"]] and e["nota"] == ""
                return ok, f"aviso={aviso[:1]} textos_iguales={e['textos'] == guardado['textos']}"
            @prueba("J8 Una Descripción vacía no se guarda: se avisa y no se envía ninguna petición")
            def _():
                listo, bloqueadas, guardia = cortafuegos_y_stub()
                if not listo: return False, "no se pudo asegurar el simulador"
                try:
                    ta = fr.locator(f"[id='{dlg_id()}'] textarea.rmd-edit[data-campo=ensayoHijo]").nth(0); ta.click(); ta.press("Control+a"); ta.press("Delete"); pg.wait_for_timeout(600)
                    rojo = fr.evaluate("(" + TOP + ").querySelector('textarea.rmd-edit[data-campo=ensayoHijo]').classList.contains('rmd-vacio')")
                    pulsar_guardar()
                    capt = fr.evaluate("window.__capt"); toast_ = fr.evaluate("(document.querySelector('.rmd-toast')||{}).textContent")
                finally:
                    quitar_stub(guardia)
                res = (rojo and len(capt) == 0 and toast_ and "Descripción no puede quedar vacía" in toast_ and not bloqueadas), f"rojo={rojo} peticiones={len(capt)} aviso={toast_} bloqueadas={bloqueadas}"
                cerrar_spec(); reabrir_spec()                      # descarta lo pendiente (Descripción vacía) y deja la ventana limpia
                return res
            cerrar_spec_ok = None
            @prueba("J9 Especificaciones importadas de SAP (ensayoPadreSAP): no se reordenan (botones deshabilitados con explicación y sin asas) pero sus textos siguen editables")
            def _():
                reabrir_ok = True
                fr.evaluate("() => { const d=" + TOP + "; const t=d.querySelector('table'); const ctl=sap.ui.getCore().byId(t.id.replace(/-listUl$/,'')); const it=ctl.getItems()[0]; const k=Object.keys(it.oBindingContexts)[0]; const c=it.getBindingContext(k); c.getModel().setProperty(c.getPath()+'/ensayoPadreSAP','ZZ_PRUEBA'); }")
                marcar_espec(1); pg.wait_for_timeout(1200)
                e = fr.evaluate(ESTADO_ESPEC)
                fr.evaluate("() => { const d=" + TOP + "; const t=d.querySelector('table'); const ctl=sap.ui.getCore().byId(t.id.replace(/-listUl$/,'')); const it=ctl.getItems()[0]; const k=Object.keys(it.oBindingContexts)[0]; const c=it.getBindingContext(k); c.getModel().setProperty(c.getPath()+'/ensayoPadreSAP',null); }")
                pg.wait_for_timeout(1200); desmarcar_todo(); pg.wait_for_timeout(800)
                e2 = fr.evaluate(ESTADO_ESPEC)
                ok = e["botones"] == [True, True] and e["grips"] == 0 and "SAP" in (e["titulos"][0] or "") and e["tas"] == 2 * N and e2["grips"] == N
                return ok, f"botones={e['botones']} asas={e['grips']} titulo={e['titulos']} textareas={e['tas']} | restaurado asas={e2['grips']}"
            @prueba("J10 Apagar 'Especificaciones: reordenar filas y editar sus textos' retira botones, asas y cuadros de texto (vuelve el texto del portal); encenderlo los devuelve")
            def _():
                def conmutar(texto):
                    fr.evaluate("document.querySelector('#rmd-ui-panel').open = true")
                    fr.locator(f"#rmd-ui-panel label:has-text('{texto}') input").click(); pg.wait_for_timeout(1200)
                    fr.evaluate("document.querySelector('#rmd-ui-panel').open = false")
                a = fr.evaluate(ESTADO_ESPEC); conmutar('reordenar filas'); b_ = fr.evaluate(ESTADO_ESPEC)
                visibles = fr.evaluate("[...(" + TOP + ").querySelectorAll('td .sapMObjectIdentifierText, tbody td > span.sapMText')].filter(x=>getComputedStyle(x).display!=='none').length")
                conmutar('reordenar filas'); c = fr.evaluate(ESTADO_ESPEC)
                ok = a["tas"] == 2 * N and b_["tas"] == 0 and b_["grips"] == 0 and not b_["grupo"] and visibles >= N and c["tas"] == 2 * N and c["grips"] == N and c["grupo"]
                return ok, f"{a['tas']}/{a['grips']} -> {b_['tas']}/{b_['grips']} (textos del portal visibles={visibles}) -> {c['tas']}/{c['grips']}"
            @prueba("J13 Los cuadros respetan la longitud máxima del servicio (Descripción 150, Especificaciones 500); la Descripción es de una sola línea (Enter no añade saltos) y la Especificación admite saltos")
            def _():
                did = dlg_id(); lim = fr.evaluate("(" + TOP + ").querySelectorAll('textarea.rmd-edit')[0].maxLength + ',' + (" + TOP + ").querySelectorAll('textarea.rmd-edit')[1].maxLength")
                ta = fr.locator(f"[id='{did}'] textarea.rmd-edit[data-campo=ensayoHijo]").nth(1); ta.click(); ta.press("Control+a"); ta.press("Delete"); ta.type("x" * 170)
                largo = fr.evaluate("(" + TOP + ").querySelectorAll('textarea.rmd-edit[data-campo=ensayoHijo]')[1].value.length"); ta.press("Control+a"); ta.press("Delete"); ta.type("Fila 2"); ta.press("Enter"); ta.type("A")
                una_linea = fr.evaluate("(" + TOP + ").querySelectorAll('textarea.rmd-edit[data-campo=ensayoHijo]')[1].value")
                te = fr.locator(f"[id='{did}'] textarea.rmd-edit[data-campo=especificacion]").nth(1); te.click(); te.press("End"); te.press("Enter"); te.type("Y")
                multi = fr.evaluate("(" + TOP + ").querySelectorAll('textarea.rmd-edit[data-campo=especificacion]')[1].value.includes(String.fromCharCode(10))")
                return (lim == "150,500" and largo == 150 and una_linea == "Fila 2A" and multi), f"límites={lim} largo tras teclear 170={largo} descripción tras Enter={una_linea!r} especificación admite salto={multi}"
            @prueba("J12 Con textos u orden sin guardar, 'Agregar' (igual que Eliminar y Ensayos SAP, que vuelven a leer del servidor) pide confirmación antes de continuar")
            def _():
                ta = fr.locator(f"[id='{dlg_id()}'] textarea.rmd-edit[data-campo=especificacion]").nth(0); ta.click(); ta.press("End"); ta.type(" Z"); pg.wait_for_timeout(600)
                n0 = fr.evaluate("window.__q.d().length"); antes = len(dialogos_nativos)
                bid = fr.evaluate("() => [...(" + TOP + ").querySelectorAll('button')].find(x=>x.title==='Agregar').id")
                fr.locator(f"[id='{bid}']").click(); pg.wait_for_timeout(1800)      # (solo 'Agregar': abre un formulario; nunca se pulsa 'Ensayos SAP', que escribe)
                msg = dialogos_nativos[antes:]; n1 = fr.evaluate("window.__q.d().length")
                cerrar_spec()
                return (bool(msg) and "sin guardar" in msg[0] and n1 == n0), f"{msg[:1]} diálogos {n0}->{n1}"
            cerrar_seguro()
            # RMD que no está Ingresado: no se ofrece edición ni reorden (el portal tampoco deja modificarlo)
            ab = abrir_spec(RMD_AUTORIZADO)
            @prueba("J11 En un RMD no Ingresado (Autorizado) las especificaciones no se pueden editar ni reordenar (sin cuadros de texto, asas ni botones)")
            def _():
                if not ab: return False, f"no se pudo abrir Especificaciones de {RMD_AUTORIZADO}: {ultimo_error[0]}"
                e = fr.evaluate(ESTADO_ESPEC) if fr.evaluate("!!(" + TOP + ").querySelector('table')") else {"tas": 0, "grips": 0, "grupo": False}
                chip = fr.evaluate("((" + TOP + ").querySelector('.rmd-estado')||{}).textContent")
                return (chip == "AUTORIZADO" and e["tas"] == 0 and e["grips"] == 0 and not e["grupo"]), f"estado={chip} textareas={e.get('tas')} asas={e.get('grips')} botones={e.get('grupo')}"
            cerrar_seguro()

    # ───────────────────────── K. Botón de mejoras (esquina inferior izquierda) y su panel ─────────────────────────
    if "K" in SOLO:
        cerrar_seguro()
        for (w, h) in [(1415, 886), (1366, 650)]:
            pg.set_viewport_size({"width": w, "height": h}); pg.wait_for_timeout(1200)
            @prueba(f"K1 {w}×{h}: el icono está en la esquina inferior izquierda, es redondo y no tapa contenido importante")
            def _():
                r = fr.evaluate("""() => { const s=document.querySelector('#rmd-ui-panel summary'); const q=s.getBoundingClientRect(); const cs=getComputedStyle(s); return {l:Math.round(q.left), b:Math.round(innerHeight-q.bottom), w:Math.round(q.width), h:Math.round(q.height), radio:cs.borderRadius, svg:!!s.querySelector('svg'), fixed:getComputedStyle(document.querySelector('#rmd-ui-panel')).position}; }""")
                return (r["l"] <= 24 and r["b"] <= 24 and r["w"] == r["h"] and 32 <= r["w"] <= 44 and r["svg"] and r["fixed"] == "fixed" and "50%" in r["radio"]), str(r)
            @prueba(f"K2 {w}×{h}: al abrirlo, la tarjeta cabe en la pantalla, agrupa las opciones y se puede recorrer con desplazamiento")
            def _():
                fr.evaluate("document.querySelector('#rmd-ui-panel').open = true"); pg.wait_for_timeout(500)
                r = fr.evaluate("""() => { const c=document.querySelector('#rmd-ui-panel .rmd-panel-cuerpo'); const q=c.getBoundingClientRect(); return {l:Math.round(q.left), t:Math.round(q.top), r:Math.round(q.right), b:Math.round(q.bottom), vw:innerWidth, vh:innerHeight, grupos:[...c.querySelectorAll('.rmd-grupo')].map(x=>x.textContent.trim()), filas:c.querySelectorAll('label.rmd-fila').length, ver:c.querySelector('.rmd-panel-cab span').textContent, scroll:c.scrollHeight>c.clientHeight}; }""")
                pg.screenshot(path=f"data/panel_{w}x{h}.png"); fr.evaluate("document.querySelector('#rmd-ui-panel').open = false")
                return (r["l"] >= 0 and r["t"] >= 0 and r["r"] <= r["vw"] and r["b"] <= r["vh"] and len(r["grupos"]) == 3 and r["filas"] >= 18 and r["ver"].startswith("v")), str(r)
        pg.set_viewport_size({"width": 1920, "height": 945}); pg.wait_for_timeout(1000)
        @prueba("K3 Cada interruptor cambia su opción y persiste; 'Restablecer' vuelve a activar todas")
        def _():
            fr.evaluate("document.querySelector('#rmd-ui-panel').open = true")
            fr.locator("#rmd-ui-panel label:has-text('Enter = Ir') input").click(); pg.wait_for_timeout(500)
            a = fr.evaluate("JSON.parse(localStorage.getItem('rmdUiMejoras')||'{}').enter"); marca = fr.evaluate("document.querySelector('#rmd-ui-panel input[data-k=enter]').checked")
            fr.locator("#rmd-ui-panel .rmd-restablecer").click(); pg.wait_for_timeout(500)
            b_ = fr.evaluate("JSON.parse(localStorage.getItem('rmdUiMejoras')||'{}').enter"); marca2 = fr.evaluate("document.querySelector('#rmd-ui-panel input[data-k=enter]').checked")
            todas = fr.evaluate("[...document.querySelectorAll('#rmd-ui-panel input[data-k]')].every(i=>i.checked)")
            fr.evaluate("document.querySelector('#rmd-ui-panel').open = false")
            return (a is False and marca is False and b_ is True and marca2 is True and todas), f"{a} {marca} {b_} {marca2} {todas}"

    # ───────────────────────── D. Otras funciones y escritura controlada ─────────────────────────
    if "D" in SOLO:
        pg.wait_for_timeout(3500)
        abrir_pasos(pg, fr)
        @prueba("D1 Enter = Ir en el selector 'Adicionar Pasos' (filtrando por código)")
        def _():
            fr.evaluate("""() => { const d=window.__q.top(); const b=[...d.querySelectorAll('button')].find(x=>x.title==='Agregar Estructura'||x.title==='Agregar'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); }""")
            pg.wait_for_timeout(6000)
            for _ in range(40):
                if not fr.evaluate("[...document.querySelectorAll('.sapUiLocalBusyIndicator')].some(e=>e.getClientRects().length)"): break
                pg.wait_for_timeout(500)
            titulo = fr.evaluate("(window.__q.top().querySelector('h2')||{}).textContent")
            filas0 = fr.evaluate("window.__q.top().querySelectorAll('tbody tr').length")
            lab = fr.locator(".sapMDialog").last.get_by_label("Código Paso", exact=True).first
            lab.fill("83022"); lab.press("Enter"); pg.wait_for_timeout(2500)
            for _ in range(40):
                if not fr.evaluate("[...document.querySelectorAll('.sapUiLocalBusyIndicator')].some(e=>e.getClientRects().length)"): break
                pg.wait_for_timeout(500)
            filas1 = fr.evaluate("[...window.__q.top().querySelectorAll('tbody tr')].filter(r=>r.textContent.includes('83022')).length")
            total = fr.evaluate("window.__q.top().querySelectorAll('tbody tr').length")
            fr.evaluate("""() => { const d=window.__q.top(); const b=[...d.querySelectorAll('footer button')].find(x=>x.textContent.trim()==='Cancelar'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); }"""); pg.wait_for_timeout(1500)
            return (titulo.startswith("Adicionar Pasos") and filas1 >= 1 and total <= 5 < filas0 or (filas1 >= 1 and total <= 5)), f"{titulo} filas antes={filas0} después={total}"
        @prueba("D2 Ctrl+S guarda; el mensaje de éxito sale centrado y se cierra solo")
        def _():
            pg.keyboard.press("Control+s")
            info = None
            for _ in range(30):
                pg.wait_for_timeout(300)
                info = fr.evaluate("""() => { const m=[...document.querySelectorAll('.sapMMessageDialog')].filter(x=>x.getClientRects().length).pop(); if(!m) return null; const q=window.__q.r(m);
                  return {txt:m.innerText.split(String.fromCharCode(10)).join(' | ').slice(0,90), cx:Math.abs(q.l+q.w/2-innerWidth/2), cy:Math.abs(q.t+q.h/2-innerHeight/2)}; }""")
                if info: break
            if not info: return False, "no apareció mensaje"
            cerrado = False
            for _ in range(20):
                pg.wait_for_timeout(500)
                if not fr.evaluate("[...document.querySelectorAll('.sapMMessageDialog')].some(x=>x.getClientRects().length)"): cerrado = True; break
            return (info["txt"].startswith("Éxito") and info["cx"] <= 2 and info["cy"] <= 2 and cerrado), f"{info} cerrado_solo={cerrado}"
        @prueba("D3 Cambios sin guardar: avisa al Cancelar (se rechaza y la ventana sigue abierta); sin cambios no avisa")
        def _():
            marcar = fr.evaluate("""() => { const d=window.__q.top(); const t=d.querySelector('table'); const ths=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim().toUpperCase()); const iE=ths.indexOf('PM OP'); const iO=ths.indexOf('ORDEN');
              const tr=[...t.querySelectorAll('tbody tr')].filter(r=>!/SubRow/.test(r.className)).find(r=>r.children[iO].querySelector('input').value==='21'); tr.scrollIntoView({block:'center'}); return tr.id+'|'+iE; }""")
            trid, iE = marcar.split("|"); pg.wait_for_timeout(1500)
            caja = fr.locator(f"[id='{trid}'] td").nth(int(iE)).locator("[role=checkbox]")
            caja.click(); pg.wait_for_timeout(600)
            n0 = len(dialogos_nativos)
            fr.evaluate("""() => { const d=window.__q.top(); const b=[...d.querySelectorAll('footer button')].find(x=>x.textContent.trim()==='Cancelar'); b.click(); }"""); pg.wait_for_timeout(1000)
            abierto = fr.evaluate("window.__q.d().length") >= 3
            avisos = dialogos_nativos[n0:]
            caja.click(); pg.wait_for_timeout(600)          # se revierte el cambio: vuelve a estar limpio
            n1 = len(dialogos_nativos)
            fr.get_by_role("dialog").last.get_by_role("button", name="Cancelar").click(); pg.wait_for_timeout(1800)      # clic real: cierra si no hay cambios
            sin_aviso = len(dialogos_nativos) == n1 and fr.evaluate("window.__q.d().length") == 2
            return (bool(avisos) and "sin guardar" in avisos[0] and abierto and sin_aviso), f"avisos={avisos} abierto={abierto} sin_aviso_al_revertir={sin_aviso}"
        # se acepta el aviso al cerrar (descarta los cambios de prueba)
        pass
        cerrar_seguro()

        # --- escritura controlada: pegar dos veces (idempotencia) y restaurar ---
        pg.wait_for_timeout(3500); abrir_pasos(pg, fr)
        def pegar_y_esperar(origen, destino, ver_previa=None):
            limpiar_seleccion(fr); marcar_fila(fr, pg, origen)
            fr.get_by_role("button", name="Copiar configuración").click(); toast_texto(fr, pg, f"Copiado el paso #{origen}", 90000); limpiar_seleccion(fr)
            marcar_fila(fr, pg, destino); fr.get_by_role("button", name="Pegar").click()
            fr.locator(".rmd-modal").wait_for(timeout=90000); pg.wait_for_timeout(800)
            previa = fr.evaluate("document.querySelector('.rmd-modal').innerText")
            if ver_previa: ver_previa(previa)
            fr.get_by_role("button", name="Aplicar").click()
            for _ in range(300):
                pg.wait_for_timeout(1000)
                h = fr.evaluate("(document.querySelector('.rmd-modal h3')||{}).textContent")
                if h and h != "Aplicando…": break
            log = fr.evaluate("(document.querySelector('.rmd-log')||{}).textContent")
            fr.get_by_role("button", name="Cerrar").last.click(); pg.wait_for_timeout(1500); limpiar_seleccion(fr)
            return h, log, previa
        estado_paso = {}
        @prueba("D4 Pegar (paso 9 → 19): configuración + 3 procesos menores agregados y guardados")
        def _():
            h, log, previa = pegar_y_esperar(9, 19)
            estado_paso["log1"] = log
            return (h == "Terminado" and "Paso guardado" in log and "14821 agregado" in log and "161809 agregado" in log and "Procesos menores guardados" in log), (h + " | " + log[-160:].replace("\n", " "))
        @prueba("D5 Segundo pegado sobre el mismo destino: no duplica (los procesos menores 'ya existen')")
        def _():
            visto = {}
            h, log, previa = pegar_y_esperar(9, 19, lambda pv: visto.update(previa=pv))
            return (h == "Terminado" and "ya existe" in visto["previa"] and "se agrega" not in visto["previa"].split("Qué pasará")[-1] and log.count("agregado") == 0), (h + " | " + log.replace("\n", " ")[:220])
        @prueba("D6 Tras pegar dos veces el destino tiene exactamente 3 procesos menores")
        def _():
            marcar_fila(fr, pg, 19); fr.get_by_role("button", name="Copiar configuración").click(); toast_texto(fr, pg, "Copiado el paso #19", 90000); limpiar_seleccion(fr)
            fr.evaluate("document.querySelectorAll('.rmd-toast').forEach(t=>t.remove())")
            r = fr.evaluate("({clip:window.__q.top().querySelector('.rmd-clip').textContent})")
            return "3 proceso(s) menor(es)" in r["clip"], str(r)
        @prueba("D7 Vista previa con todo desmarcado + Aplicar: termina sin cambios")
        def _():
            limpiar_seleccion(fr); marcar_fila(fr, pg, 21); fr.get_by_role("button", name="Copiar configuración").click(); toast_texto(fr, pg, "Copiado el paso #21", 60000); limpiar_seleccion(fr)
            marcar_fila(fr, pg, 19); fr.get_by_role("button", name="Pegar").click(); fr.locator(".rmd-modal").wait_for(timeout=90000); pg.wait_for_timeout(600)
            fr.evaluate("document.querySelectorAll('.rmd-modal input[type=checkbox]').forEach(c=>{ if(c.checked) c.click(); })")
            fr.get_by_role("button", name="Aplicar").click()
            for _ in range(60):
                pg.wait_for_timeout(500)
                h = fr.evaluate("(document.querySelector('.rmd-modal h3')||{}).textContent")
                if h and h != "Aplicando…": break
            log = fr.evaluate("(document.querySelector('.rmd-log')||{}).textContent"); fr.get_by_role("button", name="Cerrar").last.click(); pg.wait_for_timeout(800); limpiar_seleccion(fr)
            return (h == "Terminado" and "Guardando" not in log), log.replace("\n", " ")[:160]
        # restauración: configuración de #19 = la de #21 (Sin tipo de dato) y quitar sus procesos menores
        @prueba("D8 Restaurar el paso 19 (config) pegando la configuración de un 'Sin tipo de dato'")
        def _():
            h, log, previa = pegar_y_esperar(21, 19)
            return h == "Terminado" and "Paso guardado" in log, h
        @prueba("D9 Restaurar el paso 19 (quitar los 3 procesos menores agregados)")
        def _():
            fr.evaluate("""() => { const d=window.__q.top(); const t=d.querySelector('table'); const ths=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim().toUpperCase()); const iO=ths.indexOf('ORDEN');
              const tr=[...t.querySelectorAll('tbody tr')].filter(r=>!/SubRow/.test(r.className)).find(r=>r.children[iO].querySelector('input').value==='19'); tr.scrollIntoView({block:'center'});
              const b=[...tr.querySelectorAll('button')].find(x=>x.title==='Procesos Menores'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); }"""); pg.wait_for_timeout(5500)
            n0 = fr.evaluate("[...window.__q.top().querySelectorAll('tbody tr')].filter(r=>r.querySelector('input')).length")
            fr.evaluate("""() => { const d=window.__q.top(); const t=d.querySelector('table'); sap.ui.getCore().byId(t.id.replace(/-listUl$/,'')).selectAll(true);
              const b=[...d.querySelectorAll('button')].find(x=>x.title==='Eliminar'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); }"""); pg.wait_for_timeout(2500)
            fr.get_by_role("alertdialog").last.get_by_role("button", name="Borrar").click(); pg.wait_for_timeout(4000)
            for _ in range(3):
                try: fr.get_by_role("alertdialog").last.get_by_role("button", name="OK").click(timeout=5000); pg.wait_for_timeout(1500)
                except Exception: break
            n1 = fr.evaluate("[...window.__q.top().querySelectorAll('tbody tr')].filter(r=>r.querySelector('input')).length")
            fr.evaluate("""() => { const d=window.__q.top(); const b=[...d.querySelectorAll('footer button')].find(x=>x.textContent.trim()==='Cerrar'||x.textContent.trim()==='Cancelar'); sap.ui.getCore().byId(b.id.replace(/-inner$/,'')).firePress(); }"""); pg.wait_for_timeout(1500)
            return (n0 == 3 and n1 == 0), f"antes={n0} después={n1}"
        cerrar_seguro()

    print("\n══ RESUMEN ══")
    fallas = [r for r in RES if not r[1]]
    print(f"{len(RES) - len(fallas)}/{len(RES)} pruebas pasan")
    for n, ok, d in fallas: print("  FALLA:", n, "—", d)
    print("errores de script:", errores[:5])
    pg.close()
