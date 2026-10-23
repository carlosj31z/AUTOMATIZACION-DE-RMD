"""Lista (solo lectura) una carpeta de SharePoint con la sesión que la persona ya tiene abierta en Chromium.

Se conecta por CDP (`RMD_CDP_URL`, el mismo Chromium del portal) y recorre la carpeta con la API REST de
SharePoint desde una pestaña del sitio, así que no hace falta registrar una app ni guardar credenciales.
"""
from __future__ import annotations

from typing import List
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

# Recorre la carpeta en anchura, con pocas peticiones a la vez para no saturar el sitio.
_JS_LISTAR = r"""
async ({ sitio, carpeta }) => {
  const api = (rel) => `${sitio}/_api/web/GetFolderByServerRelativePath(decodedurl=@a)?@a='${encodeURIComponent(rel.replace(/'/g, "''"))}'`
    + '&$expand=Folders,Files';
  const pdfs = [], fallos = [], cola = [carpeta]; let activos = 0;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const lista = (x) => (x && x.results) || x || [];
  // SharePoint limita las peticiones seguidas (406/429/503): se reintenta, y con odata=verbose si insiste.
  async function leer(rel) {
    for (let i = 0; i < 8; i++) {
      const r = await fetch(api(rel), { headers: { Accept: i < 2 ? 'application/json;odata=nometadata' : 'application/json;odata=verbose' }, credentials: 'include' });
      if (r.ok) { const d = await r.json(); return d.d || d; }
      if (![406, 429, 503].includes(r.status)) throw new Error(`${r.status}`);
      await espera(1000 * (+r.headers.get('Retry-After') || 2 ** i));
    }
    throw new Error('sin respuesta tras 8 intentos');
  }
  async function una(rel) {
    const d = await leer(rel);
    lista(d.Folders).forEach((f) => { if (f.Name !== 'Forms') cola.push(f.ServerRelativeUrl); });
    lista(d.Files).forEach((f) => { if (/\.pdf$/i.test(f.Name)) pdfs.push({ ruta: f.ServerRelativeUrl, modificado: f.TimeLastModified, bytes: +f.Length }); });
  }
  await new Promise((fin) => {
    const seguir = () => {
      if (!cola.length && !activos) return fin();
      while (cola.length && activos < 3) {
        const rel = cola.shift(); activos++;
        una(rel).catch((e) => { fallos.push(`${rel}: ${e.message}`); }).finally(() => { activos--; seguir(); });
      }
    };
    seguir();
  });
  return { pdfs, fallos };
}
"""


def partir_url(url: str) -> tuple[str, str]:
    """(URL del sitio, ruta relativa al servidor de la carpeta) desde la URL de la carpeta o de la vista AllItems."""
    u = urlparse(url)
    q = dict(p.split("=", 1) for p in u.query.split("&") if "=" in p)
    ruta = unquote(q["id"]) if "id" in q else unquote(u.path)
    partes = ruta.split("/")
    if len(partes) < 3 or partes[1] not in ("sites", "teams"):
        raise ValueError(f"No reconozco el sitio de SharePoint en {url!r}")
    sitio = f"{u.scheme}://{u.netloc}/{partes[1]}/{partes[2]}"
    return sitio, ruta.rstrip("/")


def listar_pdfs(cdp_url: str, url_carpeta: str) -> List[str]:
    """Rutas de los PDF bajo la carpeta, relativas a ella (con «/»)."""
    sitio, carpeta = partir_url(url_carpeta)
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0]
        page = next((p for p in context.pages if p.url.startswith(sitio.split("/sites/")[0])), None)
        propia = page is None
        if propia:
            page = context.new_page()
            page.goto(sitio, wait_until="domcontentloaded")
        try:
            if "login.microsoftonline" in page.url or not page.url.startswith(sitio.split("/sites/")[0]):
                raise RuntimeError("Inicia sesión en SharePoint en ese Chromium y vuelve a correr el comando.")
            res = page.evaluate(_JS_LISTAR, {"sitio": sitio, "carpeta": carpeta})
        finally:
            if propia:
                page.close()
        # No se llama a browser.close(): cerraría el Chromium de la persona.
    if res["fallos"]:
        raise RuntimeError(f"No se pudieron leer {len(res['fallos'])} carpeta(s); el listado quedaría incompleto:\n"
                           + "\n".join(res["fallos"][:20]))
    base = carpeta + "/"
    return sorted(f["ruta"][len(base):] if f["ruta"].startswith(base) else f["ruta"] for f in res["pdfs"])
