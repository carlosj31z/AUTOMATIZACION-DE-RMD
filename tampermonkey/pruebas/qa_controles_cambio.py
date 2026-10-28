"""Pruebas de la pestaña «Controles de Cambios» (v1.100) sobre una Configuración Maestra hecha con OpenUI5 real (sin portal ni sesión).

Preparación, una vez (OpenUI5 1.120 desde npm, con sap.f, y su tema sap_fiori_3 compilado con less-openui5). La maqueta imita el portal: IconTabBar en la
cabecera de un DynamicPage y las tablas de cada pestaña en su contenido:
    mkdir ui5 && cd ui5 && npm pack @openui5/sap.ui.core@1.120.0 @openui5/sap.m@1.120.0 @openui5/sap.ui.layout@1.120.0 @openui5/sap.ui.unified@1.120.0 @openui5/sap.f@1.120.0 @openui5/themelib_sap_fiori_3@1.120.0
    for f in *.tgz; do mkdir -p x && tar xzf $f -C x && cp -rn x/package/src/* res/ ; rm -rf x; done   (res/ = carpeta de recursos)
    npm i less-openui5@0.11  y compilar sap/ui/core, sap/m, sap/f, sap/ui/layout, sap/ui/unified (themes/sap_fiori_3/library.source.less -> library.css)
Luego:
    RMD_UI5_RES=/ruta/a/res python tampermonkey/pruebas/qa_controles_cambio.py [Excel del REGISTRO DE CONTROLES DE CAMBIO]
Sin Excel se arma uno de ejemplo con openpyxl. SharePoint se simula con el puente del cargador (postMessage): no escribe nada.
"""
import os, sys, pathlib, json, tempfile
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
]
res = []
def ok(n, c, d=''): res.append((n, bool(c))); print(('PASA  ' if c else 'FALLA ') + n + (' — ' + str(d) if d else ''), flush=True)
def ruta(route):
    u = route.request.url
    if '/resources/' in u:
        p = RES / u.split('/resources/', 1)[1].split('?')[0]
        return route.fulfill(path=str(p)) if p.exists() else route.fulfill(status=404, body='')
    return route.fulfill(body=PAGE, content_type='text/html')
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CHROME); pg = b.new_page(viewport={'width': 1400, 'height': 860})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', ruta); pg.goto('https://x.hana.ondemand.com/cp.portal/ui5appruntime.html')
    pg.wait_for_function('window.__listo', timeout=60000); pg.wait_for_timeout(800)
    pg.evaluate(SP); pg.add_script_tag(content=SCRIPT); pg.wait_for_timeout(1500)
    tabs = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    ok('pestaña agregada al final (antes de la de Acuerdos)', [t for t in tabs if not t.endswith('Acuerdos')][-1].endswith('Controles de Cambios'), tabs)
    dlg0 = pg.evaluate("(() => { const r = document.querySelector('.sapMDialog').getBoundingClientRect(); return [r.width, r.height]; })()")
    pg.locator('[role=tab]', has_text='Controles de Cambios').click(); pg.wait_for_timeout(800)
    ok('contenido visible', pg.locator('.rmd-cc-pestana').is_visible())
    ok('sin Excel', 'Sin Excel cargado' in pg.locator('.rmd-cc-pestana').inner_text())
    pg.screenshot(path=str(OUT / '1-vacia.png'))
    pg.set_input_files('.rmd-cc-archivo', XLSX); pg.wait_for_function("window.__rmdStats.controlesCambio.ACC.datos", timeout=60000); pg.wait_for_timeout(500)
    n = pg.evaluate("window.__rmdStats.controlesCambio.ACC.datos.acciones.length")
    ok('acciones leídas (DOC, abiertas, que tocan un RMD)', n > 150, n)
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
    # filtro código
    pg.locator('.rmd-cc-filtro input').first.fill('25-426'); pg.wait_for_timeout(600)
    filas = pg.evaluate("window.__rmdStats.controlesCambio.ACC.vista.modelo.getProperty('/filas')")
    ok('filtro por código', filas and all('25-426' in f['codigo'] for f in filas), len(filas))
    f0 = filas[0]; ok('RMD de Planta 1 (Lima excluido)', f0['rmdTxt'] == '1/2 aut.', f0['rmdTxt'])
    ok('fecha de ingreso (la más antigua)', f0['ingresoTxt'] == '10/09/2026', f0['ingresoTxt'])
    pg.screenshot(path=str(OUT / '3-filtro.png'))
    dlg1 = pg.evaluate("(() => { const r = document.querySelector('.sapMDialog').getBoundingClientRect(); return [r.width, r.height]; })()")
    ok('ventana sin cambio de tamaño', dlg0 == dlg1, (dlg0, dlg1))
    pg.locator('.rmd-cc-tabla tbody tr').first.locator('button').last.click(); pg.wait_for_timeout(1200)
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
    # apagar opción
    pg.evaluate("window.__rmdStats.panel.abrir(true)"); pg.wait_for_timeout(300)
    pg.locator("#rmd-ui-panel input[data-k=controlescambio]").click(force=True); pg.wait_for_timeout(900)
    tabs2 = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    ok('al apagar se quita la pestaña', not any('Controles de Cambios' in t for t in tabs2) and pg.locator('.rmd-cc-pestana').count() == 0, tabs2)
    pg.locator("#rmd-ui-panel input[data-k=controlescambio]").click(force=True); pg.wait_for_timeout(900)
    tabs3 = pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim())")
    ok('al encender vuelve en su lugar, con el Excel guardado', [t for t in tabs3 if not t.endswith('Acuerdos')][-1].endswith('Controles de Cambios') and (not tabs3[-1].endswith('Acuerdos') or tabs3[-2].endswith('Controles de Cambios')), tabs3)
    pg.screenshot(path=str(OUT / '6-reencendida.png'))
    ok('sin errores de página', not errs, errs[:3])
    b.close()
print('RESUMEN', sum(r[1] for r in res), '/', len(res))
