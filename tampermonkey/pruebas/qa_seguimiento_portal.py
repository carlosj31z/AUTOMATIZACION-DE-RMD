"""Prueba en el PORTAL REAL de la bandera de «Controles de Cambios» y la pestaña «Seguimiento CC» (v1.122.0), en el Chrome de pruebas ya autenticado.

NO ESCRIBE NADA:
  - Cortafuegos en la pestaña de prueba: se aborta toda petición que no sea GET/HEAD/OPTIONS (SAP, SharePoint y cualquier otro sitio).
  - status-rmd (Supabase): las filas «ccseguimiento:» se simulan en memoria (lectura y escritura); las demás solo se pueden leer.
  - No se pulsa «Copiar» (portapapeles) ni se descarga el Excel: el libro se arma en memoria y se revisa su tamaño.
Lo único que cambia en el navegador: las opciones del script en ese perfil de pruebas (activa «Controles de Cambios», «Seguimiento de CC» y «Acuerdos").

Requisitos: Chrome de pruebas con --remote-debugging-port (9223 o 9222) y la sesión del portal iniciada por la persona; Python 3 con playwright
(pip install playwright; no hace falta descargar navegadores). Uso, desde esta carpeta:
    python qa_seguimiento_portal.py [--puerto 9223] [--script rmd-ui-mejoras.user.js] [--excel "REGISTRO DE CONTROLES DE CAMBIO.xlsx"] [--salida salida]
Sin --excel se arma en memoria una acción de prueba para un CC real que ya nombran varios RMD en Observaciones.
Al final escribe salida/resultado.json y capturas .png (con datos reales: no sacarlas de la PC sin revisarlas).
"""
import argparse, json, pathlib, sys, time, traceback
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--puerto', type=int, default=0)
ap.add_argument('--script', default=str(AQUI / 'rmd-ui-mejoras.user.js') if (AQUI / 'rmd-ui-mejoras.user.js').exists() else str(AQUI.parent / 'rmd-ui-mejoras.user.js'))
ap.add_argument('--excel', default='')
ap.add_argument('--salida', default=str(AQUI / 'salida'))
ap.add_argument('--url', default='https://medifarma-portal-prd-twuxor0u.cpp.cfapps.us10.hana.ondemand.com/site/portalprd#configuracion-display?sap-ui-app-id-hint=saas_approuter_mif.rmd.configuracion')
A = ap.parse_args()
SRC = pathlib.Path(A.script).read_text(encoding='utf-8')
OUT = pathlib.Path(A.salida); OUT.mkdir(parents=True, exist_ok=True)
VERSION = next((l.split()[-1] for l in SRC.splitlines()[:8] if '@version' in l), '?')

RES, KV, BLOQ, SUPA, ERRS = [], {}, [], [], []
def ok(nombre, cond, detalle=''):
    RES.append({'prueba': nombre, 'pasa': bool(cond), 'detalle': detalle if not cond else ''})
    print(('PASA  ' if cond else 'FALLA ') + nombre + (f' — {str(detalle)[:400]}' if detalle and not cond else ''), flush=True)

CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'}
def guardia(route):
    req = route.request; u = req.url; m = req.method
    try:
        if 'supabase.co/rest/v1/rmd_dashboard_kv' in u and 'ccseguimiento' in unquote(u) + (req.post_data or ''):
            SUPA.append(m + ' ' + unquote(u.split('?', 1)[-1])[:120])
            q = parse_qs(urlparse(u).query); key = (q.get('key') or [''])[0]
            if m == 'OPTIONS': return route.fulfill(status=204, body='', headers=CORS)
            if m == 'GET':
                if key.startswith('like.'): filas = [{'key': k, 'value': v} for k, v in KV.items() if k.startswith(key[5:].rstrip('*'))]
                else: filas = [{'key': key[3:], 'value': KV[key[3:]]}] if key[3:] in KV else []
                return route.fulfill(status=200, body=json.dumps(filas), content_type='application/json', headers=CORS)
            if m == 'POST':
                for f in json.loads(req.post_data or '[]'): KV[f['key']] = f['value']
                return route.fulfill(status=201, body='', headers=CORS)
            if m == 'DELETE': KV.pop(key[3:], None); return route.fulfill(status=204, body='', headers=CORS)
        if m not in ('GET', 'HEAD', 'OPTIONS'):
            BLOQ.append(m + ' ' + u[:140]); return route.abort()
        return route.continue_()
    except Exception as e:          # la pestaña se cerró a mitad de una petición
        ERRS.append('guardia: ' + str(e)[:200])

def conectar(p):
    for puerto in ([A.puerto] if A.puerto else [9223, 9222]):
        try: return p.chromium.connect_over_cdp(f'http://127.0.0.1:{puerto}'), puerto
        except Exception: continue
    raise SystemExit('No encuentro el Chrome de pruebas (puertos 9223/9222). Ábrelo con --remote-debugging-port.')

with sync_playwright() as p:
    b, puerto = conectar(p)
    ctx = b.contexts[0]; pg = ctx.new_page(); pg.set_viewport_size({'width': 1500, 'height': 900})
    pg.on('pageerror', lambda e: ERRS.append('pageerror: ' + str(e)[:200]))
    pg.route('**/*', guardia)                                   # ANTES de navegar
    resumen = {'version': VERSION, 'puerto': puerto, 'inicio': time.strftime('%Y-%m-%d %H:%M:%S')}
    try:
        t0 = time.time(); pg.goto(A.url, wait_until='commit'); fr = None; inyectado = False
        while time.time() - t0 < 240:
            pg.wait_for_timeout(200)
            fr = next((f for f in pg.frames if 'ui5appruntime' in f.url), None)
            if not fr: continue
            try:
                if not inyectado:
                    e = fr.evaluate('({rs: document.readyState, body: !!document.body})')
                    if e['body'] and e['rs'] in ('interactive', 'complete'):
                        fr.evaluate("() => { const o = JSON.parse(localStorage.getItem('rmdUiMejoras') || '{}'); Object.assign(o, { activo: true, controlescambio: true, seguimientocc: true, acuerdos: true, recetasauto: false }); localStorage.setItem('rmdUiMejoras', JSON.stringify(o)); }")
                        fr.evaluate(SRC); inyectado = True
                    continue
                if fr.evaluate("!!document.querySelector('[id$=btnGo]')"): break
            except Exception: continue
        else:
            raise SystemExit('La app no cargó: ¿está iniciada la sesión del portal en el Chrome de pruebas?')
        pg.wait_for_timeout(2500)
        ok('script inyectado con su versión', fr.evaluate("!!window.__rmdStats && !!window.__rmdStats.seguimientoCC"), VERSION)
        # Configuración Maestra
        fr.get_by_role('button', name='Configurar', exact=True).first.click()
        fr.wait_for_function("[...document.querySelectorAll('[role=tab]')].some((t) => /Seguimiento CC/.test(t.textContent))", timeout=60000); pg.wait_for_timeout(1500)
        tabs = fr.evaluate("[...document.querySelectorAll('[role=tab]')].filter((t) => t.getClientRects().length).map((t) => t.textContent.trim())")
        iT = lambda t: next((i for i, x in enumerate(tabs) if t in x), -1)
        ok('pestañas: Controles de Cambios, Seguimiento CC y Acuerdos, en ese orden', 0 <= iT('Controles de Cambios') < iT('Seguimiento CC') < iT('Acuerdos'), tabs)
        dlg0 = fr.evaluate("(() => { const r = [...document.querySelectorAll('.sapMDialog')].filter((d) => d.getClientRects().length).pop().getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()")
        fr.locator('[role=tab]', has_text='Controles de Cambios').first.click(); pg.wait_for_timeout(1500)
        if A.excel:
            fr.set_input_files('.rmd-cc-archivo', A.excel)
            fr.wait_for_function("!!window.__rmdStats.controlesCambio.ACC.datos", timeout=120000)
        t1 = time.time()
        n = fr.evaluate("async () => { const ind = await window.__rmdStats.controlesCambio.leer(true); return window.__rmdStats.controlesCambio.ACC.mds.length; }")
        ok('RMD leídos del portal (solo lectura)', n > 1000, n); resumen['rmd_leidos'] = n; resumen['seg_lectura'] = round(time.time() - t1)
        # CC de la prueba: del Excel (si se cargó) o uno real con varios RMD que lo nombran (acción de prueba en memoria)
        cc = fr.evaluate("""(conExcel) => { const X = window.__rmdStats.controlesCambio, A = X.AccionesCC, ind = X.ACC.ind;
          const puntaje = (l) => (l.length >= 2 && l.length <= 8 ? 100 : 0) + (l.some((m) => /AUTORIZAD/i.test(m.estado)) ? 10 : 0) + (l.some((m) => /INGRESAD/i.test(m.estado)) ? 5 : 0) + Math.min(l.length, 8);
          if (conExcel && X.ACC.datos && X.ACC.datos.acciones.length) {
            const c = X.ACC.datos.acciones.map((a) => ({ a, l: A.asociados(ind, a, false) })).sort((x, y) => puntaje(y.l) - puntaje(x.l))[0];
            return { carpeta: c.a.carpeta, codigo: c.a.codigo, planta: c.a.planta, n: c.l.length, excel: true };
          }
          const cands = [];
          for (const [codigo, mapa] of ind) { if (!/^\\d{2}-\\d{2,4}-CC$/.test(codigo)) continue;
            for (const pl of ['P1', 'P2']) { const l = A.asociados(ind, { codigo, planta: pl }, false).filter((m) => A.plantaRmd(m.planta) === pl); if (l.length) cands.push({ codigo, planta: pl, l }); } }
          cands.sort((x, y) => puntaje(y.l) - puntaje(x.l)); const c = cands[0]; if (!c) return null;
          X.ACC.datos = { archivo: '(prueba en memoria)', cargado: new Date().toISOString(), acciones: [{ id: c.codigo + '|1|0', codigo: c.codigo, adenda: '', carpeta: c.codigo, accion: '1',
            descripcion: 'Actualizar los RMD (acción de prueba, solo en memoria)', etapas: [], area: 'DOC', planta: c.planta, responsable: '', plazo: '2026-12-31', estado: 'En plazo', analista: 'PRUEBA' }] };
          X.ponerMds(X.ACC.mds); return { carpeta: c.codigo, codigo: c.codigo, planta: c.planta, n: c.l.length, excel: false }; }""", bool(A.excel))
        if not cc: raise SystemExit('No hay ningún CC en las Observaciones de los RMD leídos.')
        resumen['cc'] = cc; print('CC de la prueba:', cc, flush=True)
        CLAVE = 'ccseguimiento:' + cc['carpeta']
        fr.locator('.rmd-cc-filtro input').first.fill(cc['codigo']); pg.wait_for_timeout(1200)
        fila = fr.locator('.rmd-cc-tabla tbody tr', has_text=cc['codigo']).first
        fila.locator('.rmd-cc-bandera').first.click(); pg.wait_for_timeout(2500)
        rec = KV.get(CLAVE) or {}
        sug = fr.evaluate("(c) => window.__rmdStats.controlesCambio.AccionesCC.asociados(window.__rmdStats.controlesCambio.ACC.ind, { codigo: c.codigo, planta: c.planta }, false).map((m) => m.linaje || m.codigo).sort()", cc)
        ok('bandera: el CC queda en status-rmd (simulado) con los RMD que ya lo nombran', rec.get('codigo') == cc['codigo'] and sorted(r['fam'] for r in rec.get('rmd', [])) == sug, (rec.get('codigo'), [r['fam'] for r in rec.get('rmd', [])], sug))
        ok('bandera resaltada en la fila', 'sapMBtnEmphasized' in (fila.locator('.rmd-cc-bandera .sapMBtnInner').first.get_attribute('class') or ''))
        pg.screenshot(path=str(OUT / '1-bandera.png'))
        # Seguimiento CC
        fr.locator('[role=tab]', has_text='Seguimiento CC').first.click(); pg.wait_for_timeout(2500)
        ok('pestaña Seguimiento CC visible con la sección del CC', fr.locator('.rmd-seg-tab').is_visible() and fr.locator('.rmd-seg-cc', has_text=cc['codigo']).count() == 1)
        # estado de cada RMD frente a SAP leído aparte (versión más alta no cancelada de su código)
        cruce = fr.evaluate("""async (cc) => { const S = window.__rmdStats.seguimientoCC, it = S.items(false).find((x) => x.rec.codigo === cc.codigo); if (!it) return null;
          let m = null; for (const el of document.querySelectorAll('[data-sap-ui]')) { const c = sap.ui.getCore().byId(el.id); if (c && c.getModel && c.getModel('mainModelv2')) { m = c.getModel('mainModelv2'); break; } }
          const F = sap.ui.require('sap/ui/model/Filter'), out = [];
          for (const { r, e } of it.filas) {
            const filas = m ? await new Promise((ok) => m.read('/MD', { filters: [new F('codigo', 'EQ', +e.codigo)], urlParameters: { $select: 'mdId,codigo,version,estadoIdRmd/contenido', $expand: 'estadoIdRmd' }, success: (d) => ok(d.results), error: () => ok(null) })) : null;
            const vivas = (filas || []).filter((x) => !/CANCELAD/i.test((x.estadoIdRmd && x.estadoIdRmd.contenido) || '')).sort((a, b) => b.version - a.version);
            out.push({ codigo: e.codigo, version: e.version, estado: e.estadoSap, tipo: e.tipo, ejecutado: e.ejecutado, estadoFila: e.estado,
              sap: vivas[0] ? { version: String(vivas[0].version), estado: vivas[0].estadoIdRmd.contenido } : null });
          }
          return { estadoCC: it.estado, ejecutados: it.ejecutados, filas: out }; }""", cc)
        resumen['cruce'] = cruce
        malas = [x for x in (cruce or {}).get('filas', []) if x['sap'] and (x['sap']['version'] != x['version'] or x['sap']['estado'] != x['estado'])]
        ok('versión de hoy y status iguales a SAP (lectura aparte)', cruce and cruce['filas'] and not malas and all(x['sap'] for x in cruce['filas']), malas or cruce)
        incoh = [x for x in (cruce or {}).get('filas', []) if x['ejecutado'] != (x['tipo'] == 'aplicado' and 'AUTORIZAD' in x['estado'].upper())]
        ok('Ejecutado = Autorizado con el CC aplicado en Observaciones', cruce and not incoh, incoh)
        pg.screenshot(path=str(OUT / '2-seguimiento.png'))
        # Asociar: «Mis movimientos» de los últimos 7 días (lectura real) y, si no hay, buscando
        sec = fr.locator('.rmd-seg-cc', has_text=cc['codigo']).first
        sec.locator('[data-acc=asociar]').click(); pg.wait_for_timeout(1000)
        va = fr.locator('.rmd-seg-asociar')
        ok('ventana Asociar con los sugeridos ya marcados', va.is_visible() and va.locator('tr.rmd-seg-ya').count() == len(sug), va.locator('tr.rmd-seg-ya').count())
        va.locator('.rmd-seg-fuentes button[data-f=movs]').click(); pg.wait_for_timeout(800)
        d0 = time.strftime('%Y-%m-%d', time.localtime(time.time() - 7 * 86400))
        va.locator('.rmd-seg-d0').fill(d0); va.locator('[data-a=movs]').click()
        try: fr.wait_for_function("() => /RMD con movimientos tuyos|No se pudieron|Revisa/.test((document.querySelector('.rmd-seg-asociar .rmd-progreso') || {}).textContent || '')", timeout=240000)
        except Exception: pass
        prog = va.locator('.rmd-progreso').inner_text(); resumen['mis_movimientos'] = prog
        ok('Mis movimientos (7 días) se leen del portal', 'RMD con movimientos tuyos' in prog, prog)
        libres = va.locator('.rmd-seg-cands tbody tr:not(.rmd-seg-ya) input[type=checkbox]')
        origen = 'Mis movimientos'
        if libres.count() == 0:
            origen = 'A mano'
            otro = fr.evaluate("(cc) => { const X = window.__rmdStats.controlesCambio, ya = new Set((window.__rmdStats.seguimientoCC.SEG.lista || []).flatMap((r) => r.rmd.map((x) => x.fam)));"
                               " const m = X.ACC.mds.find((m) => X.AccionesCC.plantaRmd(m.planta) === cc.planta && /AUTORIZAD/i.test(m.estado) && !ya.has(m.linaje || m.codigo)); return m && m.codigo; }", cc)
            va.locator('.rmd-seg-fuentes button[data-f=buscar]').click(); pg.wait_for_timeout(400)
            va.locator('.rmd-seg-q').fill(otro or ''); pg.wait_for_timeout(800)
            libres = va.locator('.rmd-seg-cands tbody tr:not(.rmd-seg-ya) input[type=checkbox]')
        pg.screenshot(path=str(OUT / '3-asociar.png'))
        antes = len((KV.get(CLAVE) or {}).get('rmd', []))
        if libres.count():
            libres.first.check(); pg.wait_for_timeout(400)
            fr.locator('.rmd-seg-asociar .rmd-modal-pie button', has_text='Asociar').click(); pg.wait_for_timeout(2500)
            rec = KV.get(CLAVE) or {}; nuevo = rec.get('rmd', [])[-1] if rec.get('rmd') else {}
            ok(f'asociar un RMD ({origen})', len(rec.get('rmd', [])) == antes + 1 and nuevo.get('origen') == origen, nuevo)
            # marcar ejecutado a mano y volver
            filaN = fr.locator(f'.rmd-seg-cc tr[data-fam="{nuevo.get("fam")}"]')
            cb = filaN.locator('input[data-acc=ejecutado]'); era = cb.is_checked()
            (cb.uncheck if era else cb.check)(); pg.wait_for_timeout(2500)
            r = next((x for x in (KV.get(CLAVE) or {}).get('rmd', []) if x['fam'] == nuevo.get('fam')), {})
            ok('marcar «¿Ejecutó el CC?» a mano guarda quién y cuándo', r.get('manual') is (not era) and r.get('manualPor'), r)
            cb = fr.locator(f'.rmd-seg-cc tr[data-fam="{nuevo.get("fam")}"] input[data-acc=ejecutado]')
            (cb.check if era else cb.uncheck)(); pg.wait_for_timeout(2500)
            r = next((x for x in (KV.get(CLAVE) or {}).get('rmd', []) if x['fam'] == nuevo.get('fam')), {})
            ok('volver a como estaba lo deja automático', 'manual' not in r, r)
        else:
            fr.locator('.rmd-seg-asociar .rmd-modal-pie button', has_text='Cancelar').click()
            ok('había un RMD para asociar', False, 'ni en Mis movimientos ni buscando')
        pg.screenshot(path=str(OUT / '4-asociado.png'))
        # cuadro y Excel (en memoria)
        nR = len((KV.get(CLAVE) or {}).get('rmd', []))
        cuadro = fr.evaluate("window.__rmdStats.seguimientoCC.cuadro().filas")
        ok('cuadro: una fila por RMD con 16 columnas', len(cuadro) == max(1, nR) and all(len(f) == 16 for f in cuadro), (len(cuadro), nR))
        resumen['cuadro'] = cuadro
        x = fr.evaluate("window.__rmdStats.seguimientoCC.excel()")
        ok('Excel del seguimiento (armado en memoria)', x['pk'] and x['bytes'] > 3000 and x['filas'] == len(cuadro), x)
        # quitar un RMD y la bandera (con confirmación)
        if nR:
            fr.locator('.rmd-seg-cc', has_text=cc['codigo']).locator('[data-acc=quitar]').last.click(); pg.wait_for_timeout(600)
            fr.locator('.rmd-modal-aviso button', has_text='Quitar').first.click(); pg.wait_for_timeout(2500)
            ok('quitar un RMD', len((KV.get(CLAVE) or {}).get('rmd', [])) == nR - 1)
        fr.locator('.rmd-seg-cc', has_text=cc['codigo']).locator('[data-acc=quitarcc]').click(); pg.wait_for_timeout(600)
        fr.locator('.rmd-modal-aviso button', has_text='Quitar bandera').click(); pg.wait_for_timeout(2500)
        ok('quitar la bandera borra el seguimiento', CLAVE not in KV and fr.locator('.rmd-seg-cc', has_text=cc['codigo']).count() == 0)
        fr.locator('[role=tab]', has_text='Controles de Cambios').first.click(); pg.wait_for_timeout(1500)
        ok('la fila del CC ya no tiene bandera', 'sapMBtnEmphasized' not in (fr.locator('.rmd-cc-tabla tbody tr', has_text=cc['codigo']).first.locator('.rmd-cc-bandera .sapMBtnInner').first.get_attribute('class') or ''))
        dlg1 = fr.evaluate("(() => { const r = [...document.querySelectorAll('.sapMDialog')].filter((d) => d.getClientRects().length).pop().getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()")
        ok('la ventana de Configuración Maestra no cambia de tamaño', dlg0 == dlg1, (dlg0, dlg1))
        err = fr.evaluate("window.__rmdStats.errores || []")
        ok('sin errores del script', not err and not [e for e in ERRS if e.startswith('pageerror')], err + ERRS)
    except SystemExit as e:
        ok('preparación', False, str(e))
    except Exception as e:
        ok('ejecución sin excepciones', False, traceback.format_exc()[-1500:])
    finally:
        ok('cortafuegos: ninguna escritura salió del navegador (SAP, SharePoint ni status-rmd)', not BLOQ, BLOQ[:10])
        resumen.update({'bloqueadas': BLOQ, 'statusrmd_simulado': SUPA[-40:], 'resultados': RES, 'pasan': sum(r['pasa'] for r in RES), 'total': len(RES)})
        (OUT / 'resultado.json').write_text(json.dumps(resumen, ensure_ascii=False, indent=1), encoding='utf-8')
        try: pg.close()
        except Exception: pass
        print(f"RESUMEN {resumen['pasan']} / {resumen['total']}  (detalle en {OUT / 'resultado.json'})")
