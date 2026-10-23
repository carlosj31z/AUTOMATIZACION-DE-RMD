"""Lista (solo lectura) una carpeta de SharePoint con la sesión que la persona ya tiene abierta en Chromium.

Se conecta por CDP (`RMD_CDP_URL`, el mismo Chromium del portal) y recorre la carpeta con la API REST de
SharePoint desde una pestaña del sitio, así que no hace falta registrar una app ni guardar credenciales.
"""
from __future__ import annotations

from typing import List
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

# Recorre la carpeta en anchura, con pocas peticiones a la vez para no saturar el sitio.
_JS_LISTAR = """
async ({ sitio, carpeta }) => {
  const api = (rel) => `${sitio}/_api/web/GetFolderByServerRelativePath(decodedurl=@a)?@a='${encodeURIComponent(rel.replace(/'/g, "''"))}'`
    + '&$expand=Folders,Files';
  const pdfs = [], cola = [carpeta]; let activos = 0, error = null;
  async function una(rel) {
    const r = await fetch(api(rel), { headers: { Accept: 'application/json;odata=nometadata' }, credentials: 'include' });
    if (!r.ok) throw new Error(`${r.status} al leer ${rel}`);
    const d = await r.json();
    (d.Folders || []).forEach((f) => { if (f.Name !== 'Forms') cola.push(f.ServerRelativeUrl); });
    (d.Files || []).forEach((f) => { if (/\\.pdf$/i.test(f.Name)) pdfs.push({ ruta: f.ServerRelativeUrl, modificado: f.TimeLastModified, bytes: +f.Length }); });
  }
  await new Promise((fin) => {
    const seguir = () => {
      if (error || (!cola.length && !activos)) return fin();
      while (cola.length && activos < 6) {
        const rel = cola.shift(); activos++;
        una(rel).catch((e) => { error = e.message; }).finally(() => { activos--; seguir(); });
      }
    };
    seguir();
  });
  if (error) throw new Error(error);
  return pdfs;
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
        page = next((p for p in context.pages if p.url.startswith(sitio)), None)
        propia = page is None
        if propia:
            page = context.new_page()
            page.goto(sitio, wait_until="domcontentloaded")
        try:
            if "login.microsoftonline" in page.url or not page.url.startswith(sitio):
                raise RuntimeError("Inicia sesión en SharePoint en ese Chromium y vuelve a correr el comando.")
            filas = page.evaluate(_JS_LISTAR, {"sitio": sitio, "carpeta": carpeta})
        finally:
            if propia:
                page.close()
        # No se llama a browser.close(): cerraría el Chromium de la persona.
    base = carpeta + "/"
    return sorted(f["ruta"][len(base):] if f["ruta"].startswith(base) else f["ruta"] for f in filas)
