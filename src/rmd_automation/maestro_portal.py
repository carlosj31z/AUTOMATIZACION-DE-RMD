"""Lee el maestro de RMD (entidad MD) desde el portal ya abierto en Chromium, sin exportar a Excel.

Usa el modelo OData `mainModelv2` de la lista «Configuración Manufactura Digital» (el mismo que lee el
script de Tampermonkey para «Enviar a Status RMD»). Solo lectura.
"""
from __future__ import annotations

from typing import List

from playwright.sync_api import sync_playwright

from .contingencia import Rmd

_JS_MAESTRO = """
async () => {
  const visible = (e) => !!(e && e.offsetParent);
  const btn = [...document.querySelectorAll('button')].find((b) => visible(b) && b.title === 'Exportar');
  const ctl = btn && sap.ui.getCore().byId(btn.id);
  const reg = ctl && ctl.mEventRegistry && ctl.mEventRegistry.press && ctl.mEventRegistry.press[0];
  const vista = reg && reg.oListener && reg.oListener.getView && reg.oListener.getView();
  const modelo = vista && vista.getModel('mainModelv2');
  if (!modelo) throw new Error('abre la lista «Configuración Manufactura Digital» en el portal');
  const leer = (ruta, params) => new Promise((ok, mal) => modelo.read(ruta, { urlParameters: params, success: ok,
    error: (e) => mal(new Error(`el portal no respondió (${(e && e.statusCode) || 'sin código'})`)) }));
  const N = 1000, total = Number(await leer('/MD/$count', {})) || 0, filas = [], vistos = new Set();
  for (let i = 0; i * N < total + N; i++) {
    const p = (await leer('/MD', { $expand: 'estadoIdRmd,sucursalId', $orderby: 'mdId', $top: String(N), $skip: String(i * N),
      $select: 'mdId,codigo,version,nivelTxt,codAgrupadorReceta,codDefectoReceta,descripcion,fechaAutorizacion,areaRmdTxt,estadoIdRmd/contenido,sucursalId/contenido' })).results || [];
    p.forEach((md) => { if (!vistos.has(md.mdId)) { vistos.add(md.mdId); filas.push(md); } });
    if (p.length < N) break;
  }
  // Fecha local (Lima); si viene a medianoche UTC es una fecha sin hora y se toma tal cual.
  const dd = (n) => String(n).padStart(2, '0');
  const f = (x) => (!(x instanceof Date) || isNaN(x) ? '' : x.getUTCHours() + x.getUTCMinutes() + x.getUTCSeconds() === 0
    ? x.toISOString().slice(0, 10) : `${x.getFullYear()}-${dd(x.getMonth() + 1)}-${dd(x.getDate())}`);
  return filas.map((md) => ({ md_id: String(md.mdId), codigo: String(md.codigo || ''), version: md.version != null ? String(md.version) : '',
    estado: (md.estadoIdRmd && md.estadoIdRmd.contenido) || '', descripcion: md.descripcion || '', etapa: md.nivelTxt || '',
    planta: (md.sucursalId && md.sucursalId.contenido) || '', seccion: md.areaRmdTxt || '', agrupador: md.codAgrupadorReceta || '',
    material: md.codDefectoReceta || '', fecha_autorizacion: f(md.fechaAutorizacion) }));
}
"""


def leer_maestro_portal(cdp_url: str) -> List[Rmd]:
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(cdp_url)
        frame = next((f for p in browser.contexts[0].pages for f in p.frames if "ui5appruntime" in f.url), None)
        if frame is None:
            raise RuntimeError("Abre el portal RMD (Configuración RMD) en ese Chromium e inicia sesión.")
        filas = frame.evaluate(_JS_MAESTRO)
        # No se llama a browser.close(): cerraría el Chromium de la persona.
    return [Rmd(**f) for f in filas if f["codigo"].isdigit()]
