"""Publica el userscript en la carpeta MEJORAS DE INTERFAZ de SharePoint, con la sesión del Chromium de la persona.

El cargador de Tampermonkey usa el `.js` de versión más alta de esa carpeta, así que subir `<versión>.js` lo
publica a todos. Solo agrega archivos: nunca sobrescribe ni borra los que ya están.
"""
from __future__ import annotations

import base64
import re
from pathlib import Path
from typing import List, Optional, Tuple

from playwright.sync_api import sync_playwright

from .sharepoint import partir_url

CARPETA_URL = (
    "https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/PLANTA LIMA/"
    "DIRECCION TECNICA/DOCUMENTACION TECNICA/10.-REPORTES 2024-2026/PROYECTOS/MEJORAS DE INTERFAZ"
)

_JS_SP = r"""
async ({ sitio, carpeta, op, nombre, b64 }) => {
  const q = (s) => encodeURIComponent(String(s).replace(/'/g, "''"));
  const pedir = async (url, opciones = {}) => {
    const r = await fetch(url, { credentials: 'include', ...opciones, headers: { Accept: 'application/json;odata=nometadata', ...(opciones.headers || {}) } });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
    return r.json();
  };
  const archivos = async () => (await pedir(`${sitio}/_api/web/GetFolderByServerRelativePath(DecodedUrl=@a)/Files?@a='${q(carpeta)}'&$select=Name,Length`)).value
    .map((f) => ({ nombre: f.Name, bytes: +f.Length }));
  if (op === 'listar') return archivos();
  const digest = (await pedir(`${sitio}/_api/contextinfo`, { method: 'POST' })).FormDigestValue;
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  // Overwrite=false: si el nombre ya existe, SharePoint responde error y no toca el archivo.
  await pedir(`${sitio}/_api/web/GetFolderByServerRelativePath(DecodedUrl=@a)/Files/AddUsingPath(DecodedUrl=@n,Overwrite=false)?@a='${q(carpeta)}'&@n='${q(nombre)}'`,
    { method: 'POST', headers: { 'X-RequestDigest': digest, 'Content-Type': 'application/javascript' }, body: bin });
  return archivos();
}
"""


def version_de(texto: str) -> str:
    """@version del script completo, con las mismas comprobaciones que `versionDeTexto` del cargador."""
    fin = texto.find("// ==/UserScript==")
    cab = texto[:fin] if fin > 0 else ""
    v = re.search(r"^// @version\s+(\d+\.\d+\.\d+)\s*$", cab, re.M)
    n = re.search(r"^// @name\s+(.+)$", cab, re.M)
    if not v:
        raise ValueError("El archivo no tiene en su cabecera una línea «// @version x.y.z».")
    if not n or not re.search("mejoras de interfaz", n.group(1), re.I) or re.search("cargador", n.group(1), re.I):
        raise ValueError("El archivo no es el script «mejoras de interfaz» (¿es el cargador?).")
    if f"const VERSION = '{v.group(1)}';" not in texto or not re.search(r"\}\)\(\);?\s*$", texto):
        raise ValueError("El archivo está incompleto o su VERSION no coincide con @version: el cargador lo ignoraría.")
    return v.group(1)


def _clave(nombre: str) -> Optional[Tuple[int, ...]]:
    m = re.fullmatch(r"(\d+\.\d+\.\d+)\.js", nombre)
    return tuple(int(x) for x in m.group(1).split(".")) if m else None


def mas_alta(nombres: List[str]) -> Optional[str]:
    """La versión más alta entre los `<versión>.js`, como la elige el cargador."""
    versiones = [n for n in nombres if _clave(n)]
    return max(versiones, key=_clave)[:-3] if versiones else None


def publicar(cdp_url: str, archivo: str, subir: bool, url_carpeta: str = CARPETA_URL, avisar=print) -> bool:
    """Sin `subir` solo dice qué haría. Devuelve True si el archivo quedó (o quedaría) publicado."""
    datos = Path(archivo).read_bytes()
    version = version_de(datos.decode("utf-8"))
    nombre = f"{version}.js"
    sitio, carpeta = partir_url(url_carpeta)
    host = sitio.split("/sites/")[0]
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(cdp_url)
        ctx = browser.contexts[0]
        page = next((p for p in ctx.pages if p.url.startswith(host) and "login" not in p.url), None)
        propia = page is None
        if propia:
            page = ctx.new_page()
            page.goto(sitio, wait_until="domcontentloaded")
        try:
            if not page.url.startswith(host) or "login" in page.url:
                raise RuntimeError("Inicia sesión en SharePoint en ese Chromium y vuelve a correr el comando.")
            args = {"sitio": sitio, "carpeta": carpeta, "nombre": nombre, "b64": ""}
            hay = page.evaluate(_JS_SP, {**args, "op": "listar"})
            actual = mas_alta([f["nombre"] for f in hay])
            avisar(f"En MEJORAS DE INTERFAZ la versión más alta es {actual or '(ninguna)'}; vas a publicar {version}.")
            if any(f["nombre"].lower() == nombre.lower() for f in hay):
                avisar(f"Ya existe {nombre}: no se sube (nunca se sobrescribe). Sube la versión del script.")
                return False
            if actual and _clave(nombre) <= _clave(actual + ".js"):
                avisar(f"{version} no es mayor que {actual}: el cargador no la usaría. No se sube.")
                return False
            if not subir:
                avisar(f"Subiría {nombre} ({len(datos):,} bytes). Repite con --subir para publicarlo a todos.")
                return True
            despues = page.evaluate(_JS_SP, {**args, "op": "subir", "b64": base64.b64encode(datos).decode()})
        finally:
            if propia:
                page.close()
        # No se llama a browser.close(): cerraría el Chromium de la persona.
    subido = next((f for f in despues if f["nombre"] == nombre), None)
    if not subido or subido["bytes"] != len(datos):
        raise RuntimeError(f"Se subió {nombre}, pero SharePoint no lo muestra con {len(datos)} bytes: revísalo en la carpeta.")
    avisar(f"✓ Publicado {nombre} ({len(datos):,} bytes). El cargador lo usará en la próxima revisión de cada navegador.")
    return True
