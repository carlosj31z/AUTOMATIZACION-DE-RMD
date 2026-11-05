"""Pruebas de la pestaña «Controles de Cambios» (v1.100) sobre una Configuración Maestra hecha con OpenUI5 real (sin portal ni sesión).

Preparación, una vez (OpenUI5 1.120 desde npm, con sap.f, y su tema sap_fiori_3 compilado con less-openui5). La maqueta imita el portal: IconTabBar en la
cabecera de un DynamicPage y las tablas de cada pestaña en su contenido:
    mkdir ui5 && cd ui5 && npm pack @openui5/sap.ui.core@1.120.0 @openui5/sap.m@1.120.0 @openui5/sap.ui.layout@1.120.0 @openui5/sap.ui.unified@1.120.0 @openui5/sap.f@1.120.0 @openui5/themelib_sap_fiori_3@1.120.0
    for f in *.tgz; do mkdir -p x && tar xzf $f -C x && cp -rn x/package/src/* res/ ; rm -rf x; done   (res/ = carpeta de recursos)
    npm i less-openui5@0.11  y compilar sap/ui/core, sap/m, sap/f, sap/ui/layout, sap/ui/unified (themes/sap_fiori_3/library.source.less -> library.css)
Luego:
    RMD_UI5_RES=/ruta/a/res python tampermonkey/pruebas/qa_controles_cambio.py [Excel del REGISTRO DE CONTROLES DE CAMBIO]
Sin Excel se arma uno de ejemplo con openpyxl. SharePoint se simula con el puente del cargador (postMessage) y status-rmd (Supabase) con un
almacén en memoria: no escribe nada fuera. También prueba la bandera y la pestaña «Seguimiento CC» (v1.122.0).
"""
import os, sys, pathlib, json, tempfile
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
RES = pathlib.Path(os.environ.get('RMD_UI5_RES', 'ui5/res'))
PAGE = r"""<!doctype html><html><head><meta charset="utf-8"><title>maestra</title>
<script id="sap-ui-bootstrap" src="/resources/sap-ui-core.js" data-sap-ui-theme="sap_fiori_3" data-sap-ui-libs="sap.m,sap.f" data-sap-ui-async="true" data-sap-ui-compatVersion="edge"></script>
<script>
sap.ui.getCore().attachInit(function () {
  sap.ui.require(['sap/m/Dialog','sap/m/IconTabBar','sap/m/IconTabFilter','sap/m/IconTabSeparator','sap/m/Table','sap/m/Column','sap/m/Text','sap/m/Button','sap/m/ColumnListItem','sap/m/Label','sap/m/Input','sap/m/VBox','sap/f/DynamicPage','sap/f/DynamicPageHeader'], function (Dialog, ITB, ITF, ITS, Table, Column, Text, Button, CLI, Label, Input, VBox, DP, DPH) {
    var tablas = {};
    var mk = function (k, t, ic) { var tb = new Table({ headerText: t, visible: k === '1', columns: [new Column({ header: new Text({ text: 'Código' }) }), new Column({ header: new Text({ text: 'Descripción' }) })] });
      for (var i = 1; i < 40; i++) tb.addItem(new CLI({ cells: [new Text({ text: String(i) }), new Text({ text: t + ' ' + i })] }));
      tablas[k] = tb; return new ITF({ key: k, text: t, icon: ic }); };
    var itb = new ITB('itbMaestra', { expandable: false, select: function (e) { var k = e.getParameter('key'); window.__sel = k; Object.keys(tablas).forEach(function (x) { tablas[x].setVisible(x === k); }); }, items: [mk('1', 'Estructura', 'sap-icon://building'), new ITS(), mk('2', 'Etiqueta', 'sap-icon://tag'), new ITS(), mk('3', 'Paso', 'sap-icon://process'), new ITS(), mk('4', 'Motivo', 'sap-icon://undo'), new ITS(), mk('5', 'Utensilios', 'sap-icon://laptop'), new ITS(), mk('6', 'Motivo de lapsos', 'sap-icon://journey-arrive')] });
    var cuerpo = new VBox({ items: Object.keys(tablas).map(function (k) { return tablas[k]; }) });
    var dp = new DP('frgConfiguration--dynamicPageId', { header: new DPH({ pinnable: false, content: [itb, new Label({ text: 'Descripción:' }), new Input({ placeholder: 'Ingrese Descripción' })] }), content: cuerpo });
    var d = new Dialog({ title: 'Configuracion Maestra', contentWidth: '95%', contentHeight: '90%', verticalScrolling: false, content: [dp], endButton: new Button({ text: 'Cerrar', press: function () { d.close(); } }) });
    window.__abrir = function () { d.open(); }; d.open(); window.__listo = true;
});
});
</script></head><body class="sapUiBody"></body></html>
"""
SCRIPT = (pathlib.Path(__file__).resolve().parents[1] / 'rmd-ui-mejoras.user.js').read_text(encoding='utf-8')
OUT = pathlib.Path(tempfile.gettempdir()) / 'qa_controles_cambio'; OUT.mkdir(exist_ok=True)
CHROME = os.environ.get('RMD_CHROME') or None


def excel_ejemplo():
    import openpyxl
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'ACCIONES CC'
    ws.append(['REGISTRO DE ACCIONES DE CONTROLES DE CAMBIO P1-P2']); ws.append([])
    ws.append(['N°', 'PLANTA', 'PLANTA EN GESTION', 'CÓDIGO CC', 'Nº DE ACCIÓN', 'DESCRIPCIÓN DE LA ACCIÓN', 'RESPONSABLE', 'ÁREAS INVOLUCRADAS', 'SIN ESPACIOS', 'FECHA', 'NUEVA FECHA', 'FECHA DE EJECUCIÓN', 'ESTADO VIGENCIA', 'STATUS DE ACCIONES', 'FECHA DE CIERRE DE ACCIÓN', 'ESTATUS', 'ANALISTA', 'OBSERVACIÓN'])
    import datetime as dt
    for k in range(4):
        ws.append([k + 1, 'P1', 'P1', '25-426-CC \nADENDA', 30 + k, f'Actualizar el registro de manufactura digital de la etapa de inspección del producto {k}', 'M. Ferreyra', 'DOC', 'DOC', dt.datetime(2026, 6, 19), '-', None, 'Conforme', 'ABIERTO VENCIDO', None, 'P', 'V. REYES', None])
    for k in range(160):
        ws.append([k + 5, 'P2', 'P2', f'26-{100 + k}-CC', 1, 'Actualizar la hoja de ruta y el puesto de trabajo de la etapa de envase', 'X', 'DOC', 'DOC', dt.datetime(2026, 12, 1), '-', None, '', 'ABIERTO EN PLAZO', None, 'A tiempo', 'S. CHULLO', None])
    ws.append([999, 'P1', 'P1', '26-900-CC', 1, 'Actualizar el registro de manufactura', 'X', 'DOC', 'DOC', dt.datetime(2026, 6, 1), '-', None, '', 'CERRADO EN PLAZO', None, 'C', 'S. CHULLO', None])
    ws.append([1000, 'P1', 'P1', '26-901-CC', 1, 'Actualizar planos', 'X', 'DOC', 'DOC', dt.datetime(2026, 6, 1), '-', None, '', 'ABIERTO EN PLAZO', None, 'C', 'S. CHULLO', None])
    p = OUT / 'acciones_ejemplo.xlsx'; wb.save(p); return str(p)


XLSX = sys.argv[1] if len(sys.argv) > 1 else excel_ejemplo()
SP = r"""
window.__sp = { pedidos: [], archivos: [] };
window.addEventListener('message', (e) => { const d = e.data || {}; if (d.tipo !== 'rmd-sp-pedido') return;
  window.__sp.pedidos.push({ metodo: d.metodo, url: decodeURIComponent(d.url) });
  let texto = '{}'; const u = decodeURIComponent(d.url);
  if (/contextinfo/.test(u)) texto = JSON.stringify({ FormDigestValue: 'x' });
  else if (d.metodo === 'GET' && /\/Files\?/.test(u)) texto = JSON.stringify({ value: window.__sp.archivos.map((n) => ({ Name: n, TimeLastModified: '2026-10-28T10:00:00Z' })) });
  else if (/Files\/AddUsingPath/.test(u)) { const m = /@n='([^']*)'/.exec(u); window.__sp.archivos.push(m[1]); }
  setTimeout(() => window.postMessage({ tipo: 'rmd-sp-respuesta', id: d.id, estado: 200, texto }, location.origin), 20);
});
"""
MDS = [
 dict(mdId=1, codigo='2202500001', version='3', etapa='INSPECCIÓN', descripcion='DEXTROSA 33.3% SOL INY', observacion='20261001CJ-1-C1.0-x\nPendiente 25-426-CC/M.Ferreyra/2026-06-19;actualizar inspección', estado='Ingresado', planta='PLANTA ATE', fechaRegistro='2026-09-10', fechaAut='', linaje='2202400001'),
 dict(mdId=2, codigo='2202400001', version='2', etapa='INSPECCIÓN', descripcion='DEXTROSA 33.3% SOL INY', observacion='Pendiente 25-426-CC', estado='Autorizado', planta='PLANTA ATE', fechaRegistro='2026-05-01', fechaAut='2026-05-20', linaje='2202400001'),
 dict(mdId=3, codigo='2202500002', version='5', etapa='INSPECCIÓN', descripcion='DICLOFENACO SOL INY', observacion='25-426-CC/M.Ferreyra/2026-10-20;Actualizar inspección;proceso;moderado', estado='Autorizado', planta='PLANTA ATE', fechaRegistro='2026-10-01', fechaAut='2026-10-21', linaje='2202500002'),
 dict(mdId=4, codigo='2202500003', version='1', etapa='INSPECCIÓN', descripcion='LIDOCAINA LIMA', observacion='25-426-CC/M.Ferreyra/2026-10-20;x;proceso;moderado', estado='Autorizado', planta='PLANTA LIMA', fechaRegistro='2026-10-01', fechaAut='2026-10-21', linaje='2202500003'),
 dict(mdId=5, codigo='2202500009', version='2', etapa='INSPECCIÓN', descripcion='METAMIZOL SOL INY', observacion='', estado='Autorizado', planta='PLANTA ATE', fechaRegistro='2026-08-01', fechaAut='2026-08-05', linaje='2202500009'),
]
KV = {}                                                    # status-rmd simulado (Supabase rmd_dashboard_kv)
CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'}
res = []
def ok(n, c, d=''): res.append((n, bool(c))); print(('PASA  ' if c else 'FALLA ') + n + (' — ' + str(d) if d else ''), flush=True)
def ruta(route):
    req = route.request; u = req.url
    if 'supabase.co/rest/v1/rmd_dashboard_kv' in u:
        q = parse_qs(urlparse(u).query); key = (q.get('key') or [''])[0]
        if req.method == 'GET':
            if key.startswith('like.'): filas = [{'key': k, 'value': v} for k, v in KV.items() if k.startswith(key[5:].rstrip('*'))]
            else: filas = [{'key': key[3:], 'value': KV[key[3:]]}] if key[3:] in KV else []
            return route.fulfill(body=json.dumps(filas), content_type='application/json', headers=CORS)
        if req.method == 'POST':
            for f in json.loads(req.post_data): KV[f['key']] = f['value']
            return route.fulfill(status=201, body='', headers=CORS)
        if req.method == 'DELETE': KV.pop(key[3:], None); return route.fulfill(status=204, body='', headers=CORS)
        return route.fulfill(status=200, body='', headers=CORS)
    if '/resources/' in u:
        p = RES / u.split('/resources/', 1)[1].split('?')[0]
        return route.fulfill(path=str(p)) if p.exists() else route.fulfill(status=404, body='')
    return route.fulfill(body=PAGE, content_type='text/html')
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CHROME); ctx = b.new_context(viewport={'width': 1400, 'height': 860}, accept_downloads=True); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', ruta); pg.goto('https://x.hana.ondemand.com/cp.portal/ui5appruntime.html')
    pg.wait_for_function('window.__listo', timeout=60000); pg.wait_for_timeout(800)
    pg.evaluate(SP); pg.add_script_tag(content=SCRIPT); pg.wait_for_timeout(1500)
    tabs = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    sinNuestras = [t for t in tabs if not t.endswith('Acuerdos') and 'Seguimiento CC' not in t]
    ok('pestaña agregada al final (antes de Seguimiento CC y Acuerdos)', sinNuestras[-1].endswith('Controles de Cambios'), tabs)
    iTab = lambda l, t: next((i for i, x in enumerate(l) if t in x), -1)
    ok('orden: Controles de Cambios, Seguimiento CC, Acuerdos', 0 <= iTab(tabs, 'Controles de Cambios') < iTab(tabs, 'Seguimiento CC') < iTab(tabs, 'Acuerdos'), tabs)
    dlg0 = pg.evaluate("(() => { const r = document.querySelector('.sapMDialog').getBoundingClientRect(); return [r.width, r.height]; })()")
    pg.locator('[role=tab]', has_text='Controles de Cambios').click(); pg.wait_for_timeout(800)
    ok('contenido visible', pg.locator('.rmd-cc-pestana').is_visible())
    ok('sin Excel', 'Sin Excel cargado' in pg.locator('.rmd-cc-pestana').inner_text())
    pg.screenshot(path=str(OUT / '1-vacia.png'))
    pg.set_input_files('.rmd-cc-archivo', XLSX); pg.wait_for_function("window.__rmdStats.controlesCambio.ACC.datos", timeout=60000); pg.wait_for_timeout(500)
    n = pg.evaluate("window.__rmdStats.controlesCambio.ACC.datos.acciones.length")
    ok('acciones leídas (DOC, abiertas, que tocan un RMD)', n > 150, n)
    # DOC compartida con otras áreas y acciones de RMD de otras áreas en un CC donde DOC participa
    sel = pg.evaluate("""(() => { const E = ['CÓDIGO CC', 'Nº DE ACCIÓN', 'DESCRIPCIÓN DE LA ACCIÓN', 'ÁREAS INVOLUCRADAS', 'STATUS DE ACCIONES'];
      const f = [E, ['26-280-CC', 1, 'Actualizar el procedimiento PCPR-202-09', 'DOC', 'CERRADO EN PLAZO'], ['26-280-CC', 3, 'Actualizar los RMDs de la etapa de Envase', 'GV2', 'ABIERTO VENCIDO'],
        ['26-280-CC ADENDA', 1, 'Actualizar el registro de manufactura digital (RMD) de envase', 'DOC', 'ABIERTO VENCIDO'], ['26-300-CC', 1, 'Actualizar el RMD de fabricación', 'DOC - CPR', 'ABIERTO EN PLAZO'],
        ['26-301-CC', 1, 'Actualizar los RMD de envase', 'PRO-DOC', 'ABIERTO EN PLAZO'], ['26-302-CC', 1, 'Actualizar el RMD de envase', 'GV2', 'ABIERTO EN PLAZO']];
      return window.__rmdStats.controlesCambio.AccionesCC.deHojas([{ hoja: 'ACCIONES CC', filas: f }], '2026-10-28').acciones.map((a) => a.carpeta + '#' + a.accion + '#' + a.area); })()""")
    ok('DOC compartida y RMD de otras áreas del mismo CC', sel == ['26-280-CC#3#GV2', '26-280-CC ADENDA#1#DOC', '26-300-CC#1#DOC - CPR', '26-301-CC#1#PRO-DOC'], sel)
    pg.evaluate("(m) => window.__rmdStats.controlesCambio.ponerMds(m)", MDS); pg.wait_for_timeout(800)
    titulo = pg.locator('.rmd-cc-tabla .sapMTitle').first.inner_text(); ok('título con total', str(n) in titulo, titulo)
    pg.screenshot(path=str(OUT / '2-lista.png'))
    if pg.evaluate("!!sap.ui.getCore().byId('frgConfiguration--dynamicPageId')"):
        VIS = "(t) => [...document.querySelectorAll('.sapMListTbl')].some((x) => x.getClientRects().length && x.closest('.sapMList,.sapMTable') && (x.closest('.sapMList').textContent || '').includes(t + ' 1'))"
        ok('DP: sin la tabla del portal debajo', not pg.evaluate("(" + VIS + ")('Estructura')"))
        ok('DP: sin los filtros del portal', not pg.evaluate("[...document.querySelectorAll('.sapFDynamicPageHeader input')].some((i) => !i.closest('.rmd-cc-pestana') && i.getClientRects().length)"))
        ok('DP: la cabecera no crece (CC va en el contenido)', pg.evaluate("!document.querySelector('.sapFDynamicPageHeader .rmd-cc-pestana')"))
        pg.locator('[role=tab]', has_text='Paso').click(); pg.wait_for_timeout(700)
        ok('DP: Paso se ve al volver', pg.evaluate("(" + VIS + ")('Paso')") and not pg.locator('.rmd-cc-pestana').is_visible())
        ok('DP: filtros del portal vuelven', pg.evaluate("[...document.querySelectorAll('.sapFDynamicPageHeader input')].some((i) => !i.closest('.rmd-cc-pestana') && i.getClientRects().length)"))
        pg.evaluate("document.getElementById('frgConfiguration--dynamicPageId-contentWrapper').scrollTop = 99999"); pg.wait_for_timeout(500)
        pg.evaluate("sap.ui.getCore().byId('frgConfiguration--dynamicPageId').setHeaderExpanded(false)"); pg.wait_for_timeout(300)
        pg.evaluate("sap.ui.getCore().byId('itbMaestra').setSelectedKey('rmdControlesCambio'); sap.ui.getCore().byId('itbMaestra').fireSelect({ key: 'rmdControlesCambio', selectedKey: 'rmdControlesCambio' })"); pg.wait_for_timeout(700)
        st = pg.evaluate("[document.getElementById('frgConfiguration--dynamicPageId-contentWrapper').scrollTop, sap.ui.getCore().byId('frgConfiguration--dynamicPageId').getHeaderExpanded()]")
        ok('DP: al entrar a CC arriba y con cabecera abierta', st[0] == 0 and st[1] is True, st)
        pg.screenshot(path=str(OUT / '2b-dp.png'))
        PAD = "(() => { const dp = sap.ui.getCore().byId('frgConfiguration--dynamicPageId'), w = dp.getDomRef('contentWrapper'), t = dp.getDomRef('header') && dp.$titleArea && dp.$titleArea.get(0); return [parseFloat(w.style.paddingTop) || 0, t ? Math.round(t.getBoundingClientRect().height) : -1]; })()"
        for k in ['Paso', 'rmdControlesCambio']:
            pg.evaluate("(k) => { const itb = sap.ui.getCore().byId('itbMaestra'), it = itb.getItems().find((x) => x.getKey && (x.getKey() === k || (x.getText && x.getText() === k))); itb.setSelectedKey(it.getKey()); itb.fireSelect({ key: it.getKey(), selectedKey: it.getKey(), item: it }); }", k); pg.wait_for_timeout(700)
        pad = pg.evaluate(PAD)
        ok('DP: sin franja vacía al volver de otra pestaña', abs(pad[0] - pad[1]) <= 1, pad)
    # filtros por columna (lista de valores con búsqueda, como en Excel)
    M = "window.__rmdStats.controlesCambio.ACC.vista.modelo"
    nbot = pg.locator('.rmd-cc-tabla .rmd-cc-colfiltro').count(); ok('filtro en cada columna con datos (y la de bandera)', nbot == 13, nbot)
    todas = pg.evaluate(M + ".getProperty('/filas').length")
    def colfiltro(i): pg.locator('.rmd-cc-tabla .rmd-cc-colfiltro').nth(i).click(); pg.wait_for_timeout(700); return pg.locator('.rmd-cc-colpop')
    pop = colfiltro(6); vals = pop.locator('.sapMLIB').all_inner_texts()
    ok('popover de Estado con sus valores', pop.is_visible() and any('Vencido' in v for v in vals) and any('En plazo' in v for v in vals), vals)
    pop.locator('.sapMLIB', has_text='Vencido').click(); pop.locator('button', has_text='Aceptar').click(); pg.wait_for_timeout(600)
    filas = pg.evaluate(M + ".getProperty('/filas')")
    ok('columna Estado = Vencido', filas and len(filas) < todas and all(f['estado'] == 'Vencido' for f in filas), (len(filas), todas))
    ok('botón del filtro activo resaltado', 'sapMBtnEmphasized' in (pg.locator('.rmd-cc-tabla .rmd-cc-colfiltro').nth(6).locator('.sapMBtnInner').get_attribute('class') or ''))
    an = sorted({f['analista'] or '(Vacías)' for f in filas})
    pop = colfiltro(10); vals = [v.split('\n')[0] for v in pop.locator('.sapMLIB').all_inner_texts()]
    ok('Analista solo ofrece valores de las filas filtradas', sorted(vals) == an, (vals, an))
    pop.locator('input[type=search]').fill(an[0][:4]); pg.wait_for_timeout(400)
    vis = pop.locator('.sapMLIB').count(); ok('búsqueda dentro del filtro', 0 < vis <= len(an), vis)
    pop.locator('.rmd-cc-coltodo').click(); pop.locator('button', has_text='Aceptar').click(); pg.wait_for_timeout(600)
    filas2 = pg.evaluate(M + ".getProperty('/filas')")
    ok('dos filtros de columna a la vez', filas2 and all(f['estado'] == 'Vencido' and (f['analista'] or '(Vacías)')[:4].lower() == an[0][:4].lower() for f in filas2), len(filas2))
    pg.screenshot(path=str(OUT / '2c-filtro-columna.png'))
    pop = colfiltro(6); pop.locator('button', has_text='Limpiar').click(); pg.wait_for_timeout(400)
    pg.locator('.rmd-cc-restablecer').click(); pg.wait_for_timeout(500)
    ok('Restablecer quita los filtros de columna', pg.evaluate(M + ".getProperty('/filas').length") == todas and pg.locator('.rmd-cc-tabla .rmd-cc-colfiltro.sapMBtnEmphasized, .rmd-cc-tabla .rmd-cc-colfiltro .sapMBtnEmphasized').count() == 0)
    # filtro código
    pg.locator('.rmd-cc-filtro input').first.fill('25-426'); pg.wait_for_timeout(600)
    filas = pg.evaluate("window.__rmdStats.controlesCambio.ACC.vista.modelo.getProperty('/filas')")
    ok('filtro por código', filas and all('25-426' in f['codigo'] for f in filas), len(filas))
    f0 = filas[0]; ok('RMD de Planta 1 (Lima excluido)', f0['rmdTxt'] == '1/2 aut.', f0['rmdTxt'])
    ok('fecha de ingreso (la más antigua)', f0['ingresoTxt'] == '10/09/2026', f0['ingresoTxt'])
    pg.screenshot(path=str(OUT / '3-filtro.png'))
    dlg1 = pg.evaluate("(() => { const r = document.querySelector('.sapMDialog').getBoundingClientRect(); return [r.width, r.height]; })()")
    ok('ventana sin cambio de tamaño', dlg0 == dlg1, (dlg0, dlg1))
    pg.locator('.rmd-cc-tabla tbody tr').first.locator('button[title="RMD asociados y envío de evidencia"]').click(); pg.wait_for_timeout(1200)
    d = pg.locator('.rmd-cc-dlg'); ok('diálogo RMD asociados', d.is_visible())
    txt = d.inner_text(); ok('2 RMD (última versión)', 'RMD Asociadas (2)' in txt, txt[:300])
    pg.screenshot(path=str(OUT / '4-asociados.png'))
    filasA = pg.evaluate("window.__rmdStats.controlesCambio.ACC.dlg.modelo.getProperty('/filas')")
    ok('ingresado deshabilitado', [x['autorizado'] for x in filasA] == [False, True] or [x['autorizado'] for x in filasA] == [True, False], [(x['codigo'], x['autorizado']) for x in filasA])
    # versiones anteriores
    d.locator('.sapMCb').first.click(); pg.wait_for_timeout(500)
    ok('versiones anteriores', 'RMD Asociadas (3)' in d.inner_text())
    d.locator('.sapMCb').first.click(); pg.wait_for_timeout(500)
    # adjuntar archivo al autorizado
    fila_aut = d.locator('tbody tr', has_text='2202500002')
    EV = str(OUT / 'ev.pdf'); pathlib.Path(EV).write_bytes(b'%PDF-1.4 prueba')
    with pg.expect_file_chooser() as fc:
        fila_aut.locator('button').nth(1).click()
    fc.value.set_files(EV); pg.wait_for_timeout(2500)
    sp = pg.evaluate("window.__sp")
    subidas = [p['url'] for p in sp['pedidos'] if 'Files/AddUsingPath' in p['url']]
    carpetas = [p['url'] for p in sp['pedidos'] if '/Folders/AddUsingPath' in p['url']]
    ok('carpeta CC/Acción creada', any("4.- EVIDENCIA CC Y NC MASIVOS/25-426-CC ADENDA/Acción 30'" in c for c in carpetas), carpetas[-2:])
    ok('archivo subido con código RMD', sp['archivos'] == ['2202500002-INS-v5-ev.pdf'], sp['archivos'])
    pg.wait_for_timeout(800)
    ok('marca de enviada', '1 enviada' in d.inner_text())
    pg.screenshot(path=str(OUT / '5-enviada.png'))
    # segunda vez: nombre libre
    with pg.expect_file_chooser() as fc:
        fila_aut.locator('button').nth(1).click()
    fc.value.set_files(EV); pg.wait_for_timeout(2500)
    ok('no sobrescribe', pg.evaluate("window.__sp.archivos")[-1] == '2202500002-INS-v5-ev (2).pdf', pg.evaluate("window.__sp.archivos"))
    d.locator('button', has_text='Cerrar').click(); pg.wait_for_timeout(600)
    # ---- Bandera y «Seguimiento CC» (v1.122.0): status-rmd simulado en KV ----
    S = "window.__rmdStats.seguimientoCC"
    CLAVE = 'ccseguimiento:25-426-CC ADENDA'
    fila0 = pg.locator('.rmd-cc-tabla tbody tr').first
    ok('bandera sin marcar', 'sapMBtnEmphasized' not in (fila0.locator('.rmd-cc-bandera .sapMBtnInner').get_attribute('class') or ''))
    fila0.locator('.rmd-cc-bandera').click(); pg.wait_for_timeout(1200)
    rec = KV.get(CLAVE) or {}
    ok('bandera: guarda el CC en status-rmd con sus acciones', rec.get('codigo') == '25-426-CC' and rec.get('adenda') == 'ADENDA' and len(rec.get('acciones', [])) == 4, {k: rec.get(k) for k in ('codigo', 'adenda')})
    ok('bandera: asocia los RMD que ya nombran el CC (P1, última versión)', sorted(r['fam'] for r in rec.get('rmd', [])) == ['2202400001', '2202500002'] and all(r['origen'] == 'Observaciones' for r in rec.get('rmd', [])), rec.get('rmd'))
    filasCC = pg.evaluate(M + ".getProperty('/filas')")
    ok('todas las acciones del CC muestran la bandera', all(f['bandera'] for f in filasCC if f['carpeta'] == '25-426-CC ADENDA') and 'sapMBtnEmphasized' in (fila0.locator('.rmd-cc-bandera .sapMBtnInner').get_attribute('class') or ''))
    pg.screenshot(path=str(OUT / '6a-bandera.png'))
    pg.locator('[role=tab]', has_text='Seguimiento CC').click(); pg.wait_for_timeout(1200)
    ok('pestaña Seguimiento CC visible (y CC oculta)', pg.locator('.rmd-seg-tab').is_visible() and not pg.locator('.rmd-cc-pestana').is_visible())
    sec = pg.locator('.rmd-seg-cc').first
    ok('una sección por CC con bandera', pg.locator('.rmd-seg-cc').count() == 1 and '25-426-CC ADENDA' in sec.inner_text(), pg.locator('.rmd-seg-cc').count())
    est = pg.evaluate(S + ".items(false).map((x) => [x.estado, x.filas.map(({ r, e }) => [r.fam, e.version, e.estadoSap, e.tipo, e.estado, e.ejecutado])])")
    ok('estado por RMD: Autorizado con el CC aplicado = Ejecutado; Ingresado con el CC pendiente = En proceso',
       est and est[0][0] == 'En proceso' and sorted(x[0] + ':' + x[4] for x in est[0][1]) == ['2202400001:En proceso', '2202500002:Ejecutado'], est)
    ok('versión de hoy del linaje (v3 Ingresada, no la v2)', any(x[0] == '2202400001' and x[1] == '3' and x[2] == 'Ingresado' for x in est[0][1]), est)
    ok('avance 1 de 2', '1 de 2' in sec.locator('.rmd-seg-avance').inner_text(), sec.locator('.rmd-seg-avance').inner_text())
    pg.screenshot(path=str(OUT / '7-seguimiento.png'))
    # asociar buscando
    sec.locator('[data-acc=asociar]').click(); pg.wait_for_timeout(600)
    va = pg.locator('.rmd-seg-asociar')
    ok('ventana Asociar con sugeridos (ya asociados marcados)', va.is_visible() and va.locator('tr.rmd-seg-ya').count() == 2, va.locator('tr.rmd-seg-ya').count())
    va.locator('.rmd-seg-fuentes button[data-f=movs]').click(); pg.wait_for_timeout(600)
    ok('Mis movimientos: fechas de hoy y aviso sin la lista principal', va.locator('.rmd-seg-d0').count() == 1 and 'lista principal' in va.locator('.rmd-progreso').inner_text(), va.locator('.rmd-progreso').inner_text())
    va.locator('.rmd-seg-fuentes button[data-f=buscar]').click(); pg.wait_for_timeout(300)
    va.locator('.rmd-seg-q').fill('metamizol'); pg.wait_for_timeout(400)
    ok('buscar por producto (solo la planta del CC)', va.locator('.rmd-seg-cands tbody tr').count() == 1 and '2202500009' in va.locator('.rmd-seg-cands').inner_text(), va.locator('.rmd-seg-cands').inner_text()[:200])
    va.locator('.rmd-seg-q').fill('lidocaina'); pg.wait_for_timeout(400)
    ok('otra planta no aparece', va.locator('.rmd-seg-cands tbody tr').count() == 0)
    va.locator('.rmd-seg-q').fill('2202500009'); pg.wait_for_timeout(400)
    va.locator('.rmd-seg-cands input[type=checkbox]').first.check(); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / '7b-asociar.png'))
    bA = pg.locator('.rmd-seg-asociar .rmd-modal-pie button', has_text='Asociar')
    ok('botón Asociar (1)', bA.inner_text().strip() == 'Asociar (1)', bA.inner_text())
    bA.click(); pg.wait_for_timeout(1200)
    rec = KV.get(CLAVE) or {}
    ok('asociado a mano y guardado', len(rec.get('rmd', [])) == 3 and any(r['fam'] == '2202500009' and r['origen'] == 'A mano' for r in rec['rmd']) and not pg.locator('.rmd-seg-asociar').count(), [r['fam'] for r in rec.get('rmd', [])])
    filaM = pg.locator('.rmd-seg-cc tr[data-fam="2202500009"]')
    ok('nuevo RMD Pendiente (sin el CC en Observaciones)', filaM.count() == 1 and not filaM.locator('input[data-acc=ejecutado]').is_checked())
    filaM.locator('input[data-acc=ejecutado]').check(); pg.wait_for_timeout(1200)
    r9 = next((r for r in (KV.get(CLAVE) or {}).get('rmd', []) if r['fam'] == '2202500009'), {})
    ok('marcar ejecutado a mano (con quién)', r9.get('manual') is True and r9.get('manualPor'), r9)
    ok('avance 2 de 3', '2 de 3' in pg.locator('.rmd-seg-cc .rmd-seg-avance').first.inner_text())
    filaA = pg.locator('.rmd-seg-cc tr[data-fam="2202500002"]')
    filaA.locator('input[data-acc=ejecutado]').uncheck(); pg.wait_for_timeout(1200)
    r2 = next((r for r in (KV.get(CLAVE) or {}).get('rmd', []) if r['fam'] == '2202500002'), {})
    ok('desmarcar uno automático queda a mano (No)', r2.get('manual') is False, r2)
    filaA = pg.locator('.rmd-seg-cc tr[data-fam="2202500002"]')
    filaA.locator('input[data-acc=ejecutado]').check(); pg.wait_for_timeout(1200)
    r2 = next((r for r in (KV.get(CLAVE) or {}).get('rmd', []) if r['fam'] == '2202500002'), {})
    ok('volver a marcarlo lo deja automático', 'manual' not in r2, r2)
    # cuadro: copiar y Excel
    cuadro = pg.evaluate(S + ".cuadro().filas")
    ok('cuadro: una fila por RMD con 16 columnas', len(cuadro) == 3 and all(len(f) == 16 for f in cuadro), [len(f) for f in cuadro])
    f9 = next((f for f in cuadro if f[6] == '2202500009'), None)
    ok('fila del cuadro: CC, planta, estado, RMD, ejecutado a mano', f9 and f9[0] == '25-426-CC ADENDA' and f9[1] == 'P1' and f9[5] == 'En proceso' and f9[12] == 'Sí (a mano)' and f9[8] == 'METAMIZOL SOL INY', f9)
    with pg.expect_download() as dl: pg.locator('.rmd-seg-barra-f [data-acc=excel]').click()
    xp = OUT / 'seguimiento.xlsx'; dl.value.save_as(str(xp))
    import openpyxl
    ws = openpyxl.load_workbook(xp).active
    ok('Excel: títulos y filas', ws.cell(1, 1).value == 'Código CC' and ws.cell(1, 13).value == 'Ejecutado' and ws.max_row == 4, (ws.cell(1, 1).value, ws.max_row))
    # otro usuario marca otro CC (lo trae «Actualizar»)
    KV['ccseguimiento:26-100-CC'] = {'id': '26-100-CC', 'codigo': '26-100-CC', 'adenda': '', 'planta': 'P2', 'acciones': [{'accion': '1', 'descripcion': 'Actualizar la hoja de ruta', 'plazo': '2026-12-01', 'analista': 'S. CHULLO', 'estado': 'En plazo'}],
                                      'marcadoPor': 'KARLA VANESSA MORENO MORALES', 'marcadoEn': '2026-11-05T10:00:00Z', 'rmd': [], 'historial': []}
    pg.locator('.rmd-seg-barra-f [data-acc=actualizar]').click(); pg.wait_for_timeout(1500)
    ok('lo que marca otro usuario aparece al actualizar', pg.locator('.rmd-seg-cc').count() == 2 and 'Sin RMD' in pg.locator('.rmd-seg-tab').inner_text())
    ok('Vanessa, nunca Karla', 'KARLA' not in pg.locator('.rmd-seg-tab').inner_text().upper(), pg.locator('.rmd-seg-cc').nth(1).inner_text()[:200] if pg.locator('.rmd-seg-cc').count() > 1 else '')
    pg.locator('.rmd-seg-barra-f select[data-f=planta]').select_option('P2'); pg.wait_for_timeout(400)
    ok('filtro por planta', pg.locator('.rmd-seg-cc').count() == 1 and '26-100-CC' in pg.locator('.rmd-seg-cc').first.inner_text())
    pg.locator('.rmd-seg-barra-f select[data-f=planta]').select_option(''); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / '8-seguimiento-dos.png'))
    # quitar un RMD y quitar la bandera (con confirmación)
    pg.locator('.rmd-seg-cc tr[data-fam="2202500009"] [data-acc=quitar]').click(); pg.wait_for_timeout(400)
    pg.locator('.rmd-modal-aviso button', has_text='Quitar').click(); pg.wait_for_timeout(1200)
    ok('quitar un RMD', len((KV.get(CLAVE) or {}).get('rmd', [])) == 2)
    pg.locator('.rmd-seg-cc', has_text='25-426-CC').locator('[data-acc=quitarcc]').click(); pg.wait_for_timeout(400)
    pg.locator('.rmd-modal-aviso button', has_text='Quitar bandera').click(); pg.wait_for_timeout(1200)
    ok('quitar bandera borra el seguimiento', CLAVE not in KV and pg.locator('.rmd-seg-cc').count() == 1)
    ok('historial guardado', isinstance(KV['ccseguimiento:26-100-CC'].get('historial'), list))
    pg.locator('[role=tab]', has_text='Controles de Cambios').click(); pg.wait_for_timeout(900)
    ok('la bandera se apaga en Controles de Cambios', not any(f['bandera'] for f in pg.evaluate(M + ".getProperty('/filas')") if f['carpeta'] == '25-426-CC ADENDA'))
    escrituras = [k for k in KV if not k.startswith('ccseguimiento:')]
    ok('solo escribe filas ccseguimiento: en status-rmd', not escrituras, escrituras)
    # apagar opción
    pg.evaluate("window.__rmdStats.panel.abrir(true)"); pg.wait_for_timeout(300)
    pg.locator("#rmd-ui-panel input[data-k=controlescambio]").click(force=True); pg.wait_for_timeout(900)
    tabs2 = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    ok('al apagar se quita la pestaña', not any('Controles de Cambios' in t for t in tabs2) and pg.locator('.rmd-cc-pestana').count() == 0, tabs2)
    pg.locator("#rmd-ui-panel input[data-k=controlescambio]").click(force=True); pg.wait_for_timeout(900)
    tabs3 = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    ok('al encender vuelve en su lugar, con el Excel guardado', [t for t in tabs3 if not t.endswith('Acuerdos') and 'Seguimiento CC' not in t][-1].endswith('Controles de Cambios') and 0 <= iTab(tabs3, 'Controles de Cambios') < iTab(tabs3, 'Seguimiento CC') < iTab(tabs3, 'Acuerdos'), tabs3)
    # apagar «Seguimiento de CC»: sin pestaña ni columna de bandera; al encender vuelve entre CC y Acuerdos
    pg.locator("#rmd-ui-panel input[data-k=seguimientocc]").click(force=True); pg.wait_for_timeout(900)
    tabs4 = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    pg.locator('[role=tab]', has_text='Controles de Cambios').click(); pg.wait_for_timeout(700)
    ok('al apagar Seguimiento de CC: sin pestaña ni bandera', not any('Seguimiento CC' in t for t in tabs4) and pg.locator('.rmd-cc-tabla .rmd-cc-bandera').count() == 0 and pg.locator('.rmd-cc-tabla .rmd-cc-colfiltro').count() == 12, tabs4)
    pg.evaluate("window.__rmdStats.panel.abrir(true)"); pg.wait_for_timeout(300)
    pg.locator("#rmd-ui-panel input[data-k=seguimientocc]").click(force=True); pg.wait_for_timeout(900)
    tabs5 = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    ok('al encender vuelve entre CC y Acuerdos', 0 <= iTab(tabs5, 'Controles de Cambios') < iTab(tabs5, 'Seguimiento CC') < iTab(tabs5, 'Acuerdos'), (tabs5, pg.evaluate("window.__rmdStats.errores")))
    pg.screenshot(path=str(OUT / '6-reencendida.png'))
    ok('sin errores de página', not errs, errs[:3])
    b.close()
print('RESUMEN', sum(r[1] for r in res), '/', len(res))
