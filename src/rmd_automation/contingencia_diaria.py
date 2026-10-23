"""Contingencia del día: master en PDF de los RMD autorizados en una fecha, guardado en su carpeta de SharePoint.

Por defecto se toma el día anterior (la contingencia se hace al día siguiente de la autorización).
Para cada RMD Autorizado en esa fecha:

1. Se busca en 3.-CONTINGENCIA el PDF de sus versiones anteriores (mismo agrupador/material y etapa): su
   carpeta de etapa es el destino, y esas versiones pasan a `OBSOLETO/`.
2. Se arma el PDF del master con el mismo código del portal que usa «Ver master» (sin abrir el RMD).
3. Se sube como `<código>-<ETAPA>-<versión>-<descripción>.pdf`.

Sin `aplicar` solo se arma el plan y se guardan los PDF en local. Un RMD sin versiones anteriores en la
carpeta (producto nuevo) no se sube: queda en el plan para ubicarlo a mano.
"""
from __future__ import annotations

import base64
import re
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path, PurePosixPath
from typing import Dict, Iterable, List, Optional

from playwright.sync_api import Frame, Page, sync_playwright

from .contingencia import Rmd, es_obsoleto, interpretar
from .snapshot import normalizar
from .sharepoint import partir_url

ABREVIATURA = {"FABRICACION": "FAB", "ENVASE": "ENV", "ACONDICIONADO": "ACO", "RECUBRIMIENTO": "REC",
               "INSPECCION": "INS", "INSPECCIÓN": "INS"}


def fecha_objetivo(hoy: Optional[date] = None, del_dia: bool = False) -> str:
    hoy = hoy or date.today()
    return (hoy if del_dia else hoy - timedelta(days=1)).isoformat()


def nombre_archivo(r: Rmd, descripcion: str = "") -> str:
    """`descripcion`: la de la fórmula (receta), como en el master descargado; si no, la del RMD."""
    etapa = ABREVIATURA.get(normalizar(r.etapa), normalizar(r.etapa)[:3])
    desc = re.sub(r"[\\/:*?\"<>|#%]+", "_", (descripcion or r.descripcion).strip())
    desc = re.sub(r"\s+", "_", desc)[:120]
    return f"{r.codigo}-{etapa}-{r.version}-{desc}.pdf"


def _familia(r: Rmd) -> tuple:
    # Mismo material (código por defecto) y etapa; el agrupador lo comparten productos distintos.
    return (r.material or r.agrupador, normalizar(r.etapa))


@dataclass
class Paso:
    rmd: Rmd
    archivo: str
    carpetas: List[str] = field(default_factory=list)  # carpetas de etapa (relativas a 3.-CONTINGENCIA)
    a_obsoleto: List[str] = field(default_factory=list)  # PDF de versiones anteriores fuera de OBSOLETO
    ya_esta: List[str] = field(default_factory=list)  # carpetas donde ya está el PDF de esta versión
    nota: str = ""


def autorizados_en(maestro: Iterable[Rmd], fecha: str) -> List[Rmd]:
    return [r for r in maestro if r.vigente and r.fecha_autorizacion == fecha]


def anteriores(maestro: Iterable[Rmd], r: Rmd) -> List[Rmd]:
    """Versiones no vigentes del mismo RMD (mismo material y etapa)."""
    if not (r.material or r.agrupador):
        return []
    return [o for o in maestro if o.codigo != r.codigo and not o.vigente and _familia(o) == _familia(r)]


def planificar(maestro: List[Rmd], fecha: str, rutas: Iterable[str]) -> List[Paso]:
    """`rutas`: PDF de 3.-CONTINGENCIA (al menos los de las versiones anteriores de los RMD de la fecha)."""
    pdfs = [p for p in (interpretar(x) for x in rutas) if p]
    plan = []
    for r in autorizados_en(maestro, fecha):
        paso = Paso(rmd=r, archivo=nombre_archivo(r))
        previos = {o.codigo for o in anteriores(maestro, r)}
        propios = [p for p in pdfs if p.codigo == r.codigo]
        familia = [p for p in pdfs if p.codigo in previos]
        paso.ya_esta = sorted({p.carpeta for p in propios if not p.obsoleto})
        # Destino: donde están las versiones anteriores sin archivar; si todas están en OBSOLETO, su carpeta.
        activas = [p for p in familia if not p.obsoleto]
        paso.carpetas = sorted({p.carpeta for p in (activas or familia)} | set(paso.ya_esta))
        paso.a_obsoleto = sorted(p.ruta for p in activas)
        if not paso.carpetas:
            paso.nota = "Sin versiones anteriores en 3.-CONTINGENCIA: ubicar la carpeta a mano."
        elif set(paso.carpetas) <= set(paso.ya_esta) and not paso.a_obsoleto:
            paso.nota = "Ya está en la carpeta."
        plan.append(paso)
    return plan


def plan_a_texto(plan: List[Paso], fecha: str) -> str:
    if not plan:
        return f"No hay RMD autorizados el {fecha}."
    out = [f"RMD autorizados el {fecha}: {len(plan)}"]
    for p in plan:
        r = p.rmd
        out.append(f"\n{r.codigo} v{r.version} · {r.etapa} · {r.descripcion}")
        for c in p.carpetas:
            out.append(f"  {'= ya está en' if c in p.ya_esta else '+ subir a'} {c}/{p.archivo}")
        for x in p.a_obsoleto:
            out.append(f"  → OBSOLETO: {x}")
        if p.nota:
            out.append(f"  ! {p.nota}")
    return "\n".join(out)


# ---------------------------------------------------------------- portal: PDF del master

# Igual que «Descargar master» del portal (onGetMd… + onCompletarAsociarDatos + tratarInformacion) sobre una vista
# aparte, para no tocar la lista ni grabar nada; se captura la definición de pdfMake y se genera el PDF.
_JS_PDF_MASTER = r"""
async (mdId) => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.title === 'Exportar');
  const ctl = btn && sap.ui.getCore().byId(btn.id), reg = ctl && ((ctl.mEventRegistry || {}).press || [])[0];
  const ctrl = reg && reg.oListener; if (!ctrl || !ctrl.getView) throw new Error('abre la lista «Configuración Manufactura Digital» en el portal');
  const LECT = ['onGetMdEstructura', 'onGetMdEsPaso', 'onGetMdEsEquipo', 'onGetMdEsUtensilio', 'onGetMdEsEtiqueta', 'onGetMdEsReInsumo', 'onGetMdEsEspecificacion', 'onGetMdEsPasoInsumoPaso'];
  const MODS = ['listMdEstructura', 'listMdEsPaso', 'listMdEsEquipo', 'listMdEsUtensilio', 'listMdEsEtiqueta', 'listMdEsReInsumo', 'listMdEsEspecificacion', 'listEsPasoInsumoPasoGeneral'];
  if ([...LECT, 'onCompletarAsociarDatos', 'tratarInformacion'].some((n) => typeof ctrl[n] !== 'function')) throw new Error('no se encontró «Descargar master» en el portal');
  const V = ctrl.getView(), modelo = V.getModel('mainModelv2'), F = sap.ui.require('sap/ui/model/Filter'), JM = sap.ui.require('sap/ui/model/json/JSONModel');
  const EXPAND = 'estadoIdRmd,estadoIdProceso,sucursalId,motivoId,destinatariosMD/usuarioId,aStatusProceso/estadoIdProceso,aStatusProceso/mdId,aReceta/recetaId,aTrazabilidad/estadoTrazab';
  const md = await new Promise((ok, mal) => modelo.read('/MD', { filters: [new F('mdId', 'EQ', mdId)], urlParameters: { $expand: EXPAND },
    success: (r) => ok((r.results || [])[0]), error: () => mal(new Error('el portal no respondió al leer el RMD')) }));
  if (!md) throw new Error('no se encontró el RMD ' + mdId);
  const clonar = (x) => Array.isArray(x) ? x.map(clonar) : x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, clonar(v)])) : x;
  const locales = new Map([['asociarDatos', new JM(md)]]);
  const vista = new Proxy(V, { get(t, k) {
    if (k === 'getModel') return (n) => (locales.has(n) ? locales.get(n) : t.getModel(n));
    if (k === 'setModel') return (m, n) => { locales.set(n, m); return vista; };
    const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
  const BI = sap.ui.core.BusyIndicator, bi0 = [BI.show, BI.hide], propio = Object.prototype.hasOwnProperty.call(ctrl, 'getView'), gv0 = ctrl.getView;
  const pm = window.pdfMake, cp0 = pm.createPdf, open0 = window.open, docs = [];
  // Una descarga por fórmula, como el botón «Descargar» de cada receta en «Asociar fórmulas»: la cabecera
  // lleva la descripción, el código, la versión de fabricación y el teórico de la receta.
  const recetas = ((md.aReceta && md.aReceta.results) || []).filter((r) => r.recetaId);
  const evento = (rc) => { const obj = { mdRecetaId: rc.mdRecetaId, recetaId: rc.recetaId };
    const fila = { getBindingContext: () => ({ getObject: () => obj }) };
    const fuente = { getProperty: (p) => (p === 'text' ? 'Descargar' : undefined), getParent: () => ({ getParent: () => fila }) };
    return { getSource: () => fuente }; };
  try {
    ctrl.getView = () => vista; BI.show = () => {}; BI.hide = () => {};
    const res = await Promise.all(LECT.map((n) => ctrl[n]()));
    const esFormula = (e) => !!(e.estructuraId && +e.estructuraId.tipoEstructuraId_iMaestraId === 488);
    const estr = (res[0].results || []).slice().sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : esFormula(a) ? -1 : esFormula(b) ? 1 : 0));
    estr.forEach((e, i) => { e.orden = i + 1; });
    [estr, ...res.slice(1).map((r) => r.results || [])].forEach((d, i) => { const m = new JM(d); m.setSizeLimit(999999999); locales.set(MODS[i], m); });
    window.open = () => ({ document: { write() {}, close() {}, open() {} }, focus() {}, close() {}, print() {}, location: {} });
    const nada = () => {};
    for (const rc of (recetas.length ? recetas : [null])) {
      let dd = null;
      pm.createPdf = function (d) { if (!dd) dd = clonar(d); return { open: nada, print: nada, download: nada, getBlob(cb) { if (cb) cb(new Blob()); return Promise.resolve(new Blob()); }, getDataUrl(cb) { if (cb) cb(''); }, getBase64(cb) { if (cb) cb(''); }, getBuffer(cb) { if (cb) cb(new Uint8Array()); } }; };
      await ctrl.onCompletarAsociarDatos();
      await (rc ? ctrl.tratarInformacion(evento(rc), false) : ctrl.tratarInformacion(false, false));
      for (let t = 0; !dd && t < 130; t++) await new Promise((r) => setTimeout(r, 150));
      if (!dd) throw new Error('el portal no armó el documento del master');
      docs.push({ receta: rc ? (rc.recetaId.Text1 || '').trim() : '', verid: rc ? rc.recetaId.Verid || '' : '', dd });
    }
  } finally {
    if (propio) ctrl.getView = gv0; else delete ctrl.getView;
    [BI.show, BI.hide] = bi0; pm.createPdf = cp0; window.open = open0;
  }
  // pdfmake 0.3 devuelve una promesa; las versiones anteriores llaman al callback.
  const b64 = (dd) => new Promise((ok, mal) => { const v = cp0.call(pm, dd).getBase64(ok); if (v && v.then) v.then(ok, mal); });
  const out = [];
  for (const d of docs) out.push({ receta: d.receta, verid: d.verid, b64: await b64(d.dd) });
  return out;
}
"""


def _frame_portal(browser) -> Frame:
    frame = next((f for p in browser.contexts[0].pages for f in p.frames if "ui5appruntime" in f.url), None)
    if frame is None:
        raise RuntimeError("Abre el portal RMD (Configuración RMD) en ese Chromium e inicia sesión.")
    return frame


# ---------------------------------------------------------------- SharePoint: buscar, subir, archivar

_JS_SP = r"""
async ({ sitio, op, args }) => {
  const q = (s) => encodeURIComponent(String(s).replace(/'/g, "''"));
  const pedir = async (url, opciones = {}) => {
    for (let i = 0; i < 6; i++) {
      const r = await fetch(url, { credentials: 'include', ...opciones, headers: { Accept: 'application/json;odata=nometadata', ...(opciones.headers || {}) } });
      if (r.ok) return r.status === 204 ? null : r.json().catch(() => null);
      if (![406, 429, 503].includes(r.status)) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
      await new Promise((ok) => setTimeout(ok, 1000 * (+r.headers.get('Retry-After') || 2 ** i)));
    }
    throw new Error('SharePoint no respondió');
  };
  const digest = async () => (await pedir(`${sitio}/_api/contextinfo`, { method: 'POST' })).FormDigestValue;
  if (op === 'buscar') {
    // Búsqueda por prefijo de nombre (código) dentro de la carpeta; el índice puede tardar en ver archivos muy nuevos.
    const filas = [];
    for (let i = 0; i < args.codigos.length; i += 20) {
      const kql = '(' + args.codigos.slice(i, i + 20).map((c) => `FileName:${c}*`).join(' OR ') + `) AND path:"${args.raiz}"`;
      const d = await pedir(`${sitio}/_api/search/query?querytext='${q(kql)}'&selectproperties='Path'&rowlimit=500&trimduplicates=false`);
      ((((d.PrimaryQueryResult || {}).RelevantResults || {}).Table || {}).Rows || []).forEach((r) => {
        const c = (r.Cells || []).find((x) => x.Key === 'Path'); if (c && /\.pdf$/i.test(c.Value)) { let v = c.Value; try { v = decodeURI(v); } catch (e) { /* ya viene decodificada */ } filas.push(v); }
      });
    }
    return filas;
  }
  const d = await digest(), h = { 'X-RequestDigest': d };
  if (op === 'carpeta') {
    await pedir(`${sitio}/_api/web/Folders/AddUsingPath(DecodedUrl=@a,Overwrite=false)?@a='${q(args.ruta)}'`, { method: 'POST', headers: h }).catch((e) => { if (!/^(409|400|500)/.test(e.message)) throw e; });
    return true;
  }
  if (op === 'subir') {
    const bin = Uint8Array.from(atob(args.b64), (c) => c.charCodeAt(0));
    await pedir(`${sitio}/_api/web/GetFolderByServerRelativePath(DecodedUrl=@a)/Files/AddUsingPath(DecodedUrl=@n,Overwrite=false)?@a='${q(args.carpeta)}'&@n='${q(args.nombre)}'`,
      { method: 'POST', headers: { ...h, 'Content-Type': 'application/pdf' }, body: bin });
    return true;
  }
  if (op === 'mover') {
    await pedir(`${sitio}/_api/web/GetFileByServerRelativePath(DecodedUrl=@a)/MoveToUsingPath(DecodedUrl=@b,moveOperations=1)?@a='${q(args.de)}'&@b='${q(args.a)}'`, { method: 'POST', headers: h });
    return true;
  }
  throw new Error('operación desconocida ' + op);
}
"""


class SharePoint:
    def __init__(self, page: Page, url_carpeta: str):
        self.page = page
        self.sitio, self.raiz = partir_url(url_carpeta)
        self.host = self.sitio.split("/sites/")[0]

    def _op(self, op: str, **args):
        return self.page.evaluate(_JS_SP, {"sitio": self.sitio, "op": op, "args": args})

    def _abs(self, rel: str) -> str:
        return f"{self.raiz}/{rel}"

    def buscar(self, codigos: List[str]) -> List[str]:
        if not codigos:
            return []
        rutas = self._op("buscar", codigos=sorted(set(codigos)), raiz=self.host + self.raiz)
        base = self.host + self.raiz + "/"
        return sorted({x[len(base):] for x in rutas if x.startswith(base)})

    def subir(self, carpeta: str, nombre: str, contenido: bytes) -> None:
        self._op("subir", carpeta=self._abs(carpeta), nombre=nombre, b64=base64.b64encode(contenido).decode())

    def archivar(self, ruta: str) -> str:
        p = PurePosixPath(ruta)
        destino = p.parent / "OBSOLETO"
        self._op("carpeta", ruta=self._abs(str(destino)))
        self._op("mover", de=self._abs(ruta), a=self._abs(str(destino / p.name)))
        return str(destino / p.name)


def _pagina_sharepoint(browser, host: str) -> Page:
    ctx = browser.contexts[0]
    page = next((p for p in ctx.pages if p.url.startswith(host) and "login" not in p.url), None)
    if page is None:
        raise RuntimeError("Abre SharePoint (sesión iniciada) en ese Chromium.")
    return page


def ejecutar(cdp_url: str, url_carpeta: str, fecha: str, carpeta_local: str, aplicar: bool,
             maestro: Optional[List[Rmd]] = None, avisar=print) -> List[Paso]:
    from .maestro_portal import leer_maestro_portal

    maestro = maestro if maestro is not None else leer_maestro_portal(cdp_url)
    objetivo = autorizados_en(maestro, fecha)
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(cdp_url)
        sp = SharePoint(_pagina_sharepoint(browser, partir_url(url_carpeta)[0].split("/sites/")[0]), url_carpeta)
        codigos = [r.codigo for r in objetivo] + [o.codigo for r in objetivo for o in anteriores(maestro, r)]
        rutas = sp.buscar(codigos)
        plan = planificar(maestro, fecha, rutas)
        avisar(plan_a_texto(plan, fecha))
        frame = _frame_portal(browser)
        salida = Path(carpeta_local) / fecha
        for paso in plan:
            r = paso.rmd
            pendientes = [c for c in paso.carpetas if c not in paso.ya_esta]
            if not r.md_id:
                paso.nota = "Sin id del portal: no se pudo generar el PDF."
                continue
            # Un PDF por fórmula (como «Descargar» de cada receta), con su descripción en el nombre.
            carpeta = pendientes[0] if pendientes else (paso.carpetas[0] if paso.carpetas else "_SIN_CARPETA")
            docs = frame.evaluate(_JS_PDF_MASTER, r.md_id)
            repetidas = {d["receta"] for d in docs if sum(x["receta"] == d["receta"] for x in docs) > 1}
            for doc in docs:
                pdf = base64.b64decode(doc["b64"])
                # Fórmulas con la misma descripción (otra versión de fabricación): se distinguen por la versión.
                desc = f"{doc['receta']} V{doc['verid']}" if doc["receta"] in repetidas else doc["receta"]
                nombre = nombre_archivo(r, desc)
                destino_local = salida / carpeta / nombre
                destino_local.parent.mkdir(parents=True, exist_ok=True)
                destino_local.write_bytes(pdf)
                avisar(f"PDF {r.codigo} {doc['receta']} ({len(pdf) // 1024} KB) → {destino_local}")
                if aplicar:
                    for c in pendientes:
                        sp.subir(c, nombre, pdf)
                        avisar(f"  subido a {c}/{nombre}")
            if aplicar:
                for x in paso.a_obsoleto:
                    avisar(f"  archivado {sp.archivar(x)}")
        # No se llama a browser.close(): cerraría el Chromium de la persona.
    return plan
