# Ejecuta leer_md_suspendidos.js (SOLO LECTURA) en la pestaña del portal RMD del Chrome de pruebas (puerto 9222)
# y guarda md_lectura.json junto a este archivo.
import json, pathlib, sys
from playwright.sync_api import sync_playwright
aqui = pathlib.Path(__file__).parent
js = (aqui / 'leer_md_suspendidos.js').read_text(encoding='utf-8')
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp('http://localhost:9222')
    paginas = [pg for c in b.contexts for pg in c.pages]
    portal = None
    for pg in paginas:
        try:
            if pg.evaluate("!!document.querySelector('[id$=\"idTblConfigurationRmd\"]')"):
                portal = pg; break
        except Exception:
            pass
    if portal is None:
        print('No encontre la pestana del portal con la lista Configuracion Manufactura Digital. Pestanas:', [pg.url for pg in paginas]); sys.exit(1)
    portal.set_default_timeout(900000)
    res = portal.evaluate(js)
    (aqui / 'md_lectura.json').write_text(json.dumps(res, ensure_ascii=False), encoding='utf-8')
    print('ok', {k: (len(v) if isinstance(v, list) else v) for k, v in res.items()})
