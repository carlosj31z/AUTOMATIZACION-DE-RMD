// ==UserScript==
// @name         RMD · mejoras de interfaz (cargador)
// @namespace    medifarma.rmd
// @version      1.1.0
// @description  Usa siempre la versión más reciente de «RMD · mejoras de interfaz» que haya en la carpeta MEJORAS DE INTERFAZ de SharePoint, con cualquier nombre de archivo (por ejemplo 1.56.0.js).
// @match        https://*.hana.ondemand.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      medifarmape.sharepoint.com
// @updateURL    https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA/Documentos%20compartidos/PLANTA%20LIMA/DIRECCION%20TECNICA/DOCUMENTACION%20TECNICA/10.-REPORTES%202024-2026/PROYECTOS/MEJORAS%20DE%20INTERFAZ/rmd-ui-mejoras-cargador.user.js
// @downloadURL  https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA/Documentos%20compartidos/PLANTA%20LIMA/DIRECCION%20TECNICA/DOCUMENTACION%20TECNICA/10.-REPORTES%202024-2026/PROYECTOS/MEJORAS%20DE%20INTERFAZ/rmd-ui-mejoras-cargador.user.js
// ==/UserScript==

// Lista la carpeta con la API REST de SharePoint (sesión del navegador), toma el .js de versión más alta (por el nombre; si el nombre no la trae, por su
// @version), lo guarda en el almacenamiento de Tampermonkey y lo inyecta en la página (mismo contexto que «@grant none»). La versión nueva se usa al recargar.
// Página -> cargador: evento «rmd-cargador-revisar» en document. Cargador -> página: atributo data-rmd-cargador-estado (JSON) y evento «rmd-cargador-estado».
// Puente de la contingencia (v1.1.0): la página pide con window.postMessage({ tipo: 'rmd-sp-pedido', id, metodo, url, cabeceras, cuerpo }) y recibe
// { tipo: 'rmd-sp-respuesta', id, estado, texto }. Solo se permiten la API REST del sitio DOCUMENTACIONMEDIFARMA (contexto, búsqueda,
// carpetas y archivos) y solo dentro de 04.-RMD/3.-CONTINGENCIA para escribir.
(function () {
  'use strict';
  const CARGADOR = '1.1.0';
  const SITIO = 'https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA';
  const CARPETA = '/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/PLANTA LIMA/DIRECCION TECNICA/DOCUMENTACION TECNICA/10.-REPORTES 2024-2026/PROYECTOS/MEJORAS DE INTERFAZ';
  const CADA = 10 * 60 * 1000;                                       // como máximo una revisión cada 10 min (valor compartido entre pestañas)
  const raiz = document.documentElement;
  const enApp = /ui5appruntime/.test(location.pathname);              // solo el marco de la app revisa la carpeta

  const partes = (v) => String(v || '').split('.').map((x) => parseInt(x, 10) || 0);
  const comparar = (a, b) => { const A = partes(a), B = partes(b); for (let i = 0; i < 3; i++) if ((A[i] || 0) !== (B[i] || 0)) return (A[i] || 0) - (B[i] || 0); return 0; };
  const versionDeNombre = (n) => { const m = /(\d+)\.(\d+)\.(\d+)/.exec(n); return m ? m.slice(1).join('.') : null; };
  // @version del archivo si es el script completo (cabecera, nombre, VERSION y cierre final); null si no
  function versionDeTexto(texto) {
    const fin = texto.indexOf('// ==/UserScript=='), cab = fin > 0 ? texto.slice(0, fin) : '';
    const v = (/^\/\/ @version\s+(\d+\.\d+\.\d+)\s*$/m.exec(cab) || [])[1], n = (/^\/\/ @name\s+(.+)$/m.exec(cab) || [])[1] || '';
    return v && /mejoras de interfaz/i.test(n) && !/cargador/i.test(n) && texto.includes(`const VERSION = '${v}';`) && /\}\)\(\);?\s*$/.test(texto) ? v : null;
  }
  const enc = (s) => encodeURIComponent(String(s).replace(/'/g, "''"));
  const pedir = (url, json) => new Promise((ok, mal) => GM_xmlhttpRequest({
    method: 'GET', url, timeout: 60000, headers: json ? { Accept: 'application/json;odata=nometadata' } : {}, overrideMimeType: 'text/plain; charset=utf-8',
    onload: (r) => (r.status >= 200 && r.status < 300 ? ok(r.responseText)
      : mal(new Error(r.status === 401 || r.status === 403 ? 'sin sesión de SharePoint en este navegador' : `SharePoint respondió ${r.status}`))),
    onerror: () => mal(new Error('sin conexión con SharePoint')), ontimeout: () => mal(new Error('SharePoint no respondió a tiempo')),
  }));
  async function listar() {
    const t = await pedir(`${SITIO}/_api/web/GetFolderByServerRelativePath(decodedurl='${enc(CARPETA)}')/Files?$select=Name,ServerRelativeUrl,TimeLastModified,Length`, true);
    let j; try { j = JSON.parse(t); } catch (e) { throw new Error('SharePoint no devolvió la lista de archivos (¿sesión iniciada en SharePoint?)'); }
    return (j.value || (j.d && j.d.results) || []).filter((f) => /\.js$/i.test(f.Name) && !/cargador/i.test(f.Name))
      .map((f) => ({ nombre: f.Name, ruta: f.ServerRelativeUrl, clave: [f.Name, f.TimeLastModified, f.Length].join('|'), fecha: Date.parse(f.TimeLastModified) || 0 }));
  }
  const bajar = (f) => pedir(`${SITIO}/_api/web/GetFileByServerRelativePath(decodedurl='${enc(f.ruta)}')/$value`, false);

  // paquete = { version, archivo, clave, guardado, codigo }; meta = lo mismo sin el código (lecturas baratas)
  let inyectada = null;
  function publicar() {
    const m = GM_getValue('meta', null);
    raiz.setAttribute('data-rmd-cargador-estado', JSON.stringify({ cargador: CARGADOR, actual: inyectada, ultima: m && m.version, archivo: m && m.archivo,
      revisado: GM_getValue('revisado', 0), error: GM_getValue('error', '') }));
    document.dispatchEvent(new Event('rmd-cargador-estado'));
  }
  function inyectar(p) {
    const ir = () => {
      if (inyectada) return; inyectada = p.version;
      const s = document.createElement('script');
      s.textContent = `window.__rmdDesdeCargador = ${JSON.stringify(p.version)};\n${p.codigo}\n//# sourceURL=rmd-ui-mejoras-${p.version}.js`;
      (document.head || raiz).appendChild(s); s.remove(); publicar();
    };
    if (document.body) ir(); else document.addEventListener('DOMContentLoaded', ir, { once: true });
  }

  let enCurso = null;
  function revisar(forzar) {
    if (enCurso) return enCurso;
    if (!forzar && Date.now() - GM_getValue('revisado', 0) < CADA) return Promise.resolve();
    GM_setValue('revisado', Date.now());
    enCurso = (async () => {
      try {
        const vistos = GM_getValue('vistos', {}), meta = GM_getValue('meta', null), textos = new Map();
        const archivos = await listar();
        for (const f of archivos) {                                    // sin versión en el nombre: se lee su @version una vez por archivo (nombre|fecha|tamaño)
          if (f.clave in vistos) f.version = vistos[f.clave];
          else if (!(f.version = versionDeNombre(f.nombre))) { const t = await bajar(f); f.version = vistos[f.clave] = versionDeTexto(t); if (f.version) textos.set(f.clave, t); }
        }
        // la carpeta manda: versión más alta (a igual versión, la más reciente); si se borra la última, se vuelve a la anterior
        const orden = archivos.filter((f) => f.version).sort((a, b) => comparar(b.version, a.version) || b.fecha - a.fecha);
        for (const f of orden) {
          if (meta && meta.clave === f.clave) break;
          const texto = textos.get(f.clave) || await bajar(f), v = versionDeTexto(texto);
          vistos[f.clave] = v;
          if (!v) continue;                                            // no es el script o llegó incompleto
          const m = { version: v, archivo: f.nombre, clave: f.clave, guardado: Date.now() };
          GM_setValue('paquete', Object.assign({ codigo: texto }, m)); GM_setValue('meta', m);
          break;
        }
        const vigentes = new Set(archivos.map((f) => f.clave));
        GM_setValue('vistos', Object.fromEntries(Object.entries(vistos).filter(([k]) => vigentes.has(k))));
        GM_setValue('error', '');
      } catch (e) { GM_setValue('error', (e && e.message) || String(e)); }
      finally { enCurso = null; publicar(); }
    })();
    return enCurso;
  }

  raiz.setAttribute('data-rmd-cargador', CARGADOR);                   // una copia instalada directamente cede el arranque a esta
  const p = GM_getValue('paquete', null);
  if (p && p.codigo) inyectar(p);
  publicar();
  if (!enApp) return;
  document.addEventListener('rmd-cargador-revisar', () => { revisar(true); });
  const API = SITIO + '/_api/';
  const CONTINGENCIA = '/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/PLANTA LIMA/DIRECCION TECNICA/DOCUMENTACION TECNICA/04.-RMD/3.-CONTINGENCIA/';
  function permitido(metodo, url) {
    if (typeof url !== 'string' || !url.startsWith(API)) return false;
    const resto = url.slice(API.length);
    if (metodo === 'GET') return /^search\/query\?/.test(resto);
    if (metodo !== 'POST') return false;
    if (resto === 'contextinfo') return true;
    // escrituras: todas las rutas citadas (@a, @b, @n con la carpeta) dentro de 3.-CONTINGENCIA
    if (!/^web\/(GetFolderByServerRelativePath\(DecodedUrl=@a\)\/Files\/AddUsingPath|Folders\/AddUsingPath|GetFileByServerRelativePath\(DecodedUrl=@a\)\/MoveToUsingPath)\(/.test(resto)) return false;
    const rutas = [...resto.matchAll(/@[ab]='([^']*)'/g)].map((m) => { try { return decodeURIComponent(m[1]).replace(/''/g, "'"); } catch (e) { return ''; } });
    return rutas.length > 0 && rutas.every((r) => r.startsWith(CONTINGENCIA) && !r.includes('/../'));
  }
  window.addEventListener('message', (e) => {
    const d = e.data; if (e.origin !== location.origin || !d || d.tipo !== 'rmd-sp-pedido') return;   // (en el sandbox de Tampermonkey, window no es e.source)
    const responder = (estado, texto) => window.postMessage({ tipo: 'rmd-sp-respuesta', id: d.id, estado, texto }, location.origin);
    if (!permitido(d.metodo, d.url)) { responder(400, 'pedido no permitido por el cargador'); return; }
    const cab = {}; Object.entries(d.cabeceras || {}).forEach(([k, v]) => { if (/^(Accept|Content-Type|X-RequestDigest)$/i.test(k)) cab[k] = String(v); });
    GM_xmlhttpRequest({
      method: d.metodo, url: d.url, headers: cab, timeout: 120000, data: d.cuerpo ? new Blob([d.cuerpo], { type: cab['Content-Type'] || 'application/octet-stream' }) : undefined,
      onload: (r) => responder(r.status, r.responseText), onerror: () => responder(0, 'sin conexión con SharePoint'), ontimeout: () => responder(0, 'SharePoint no respondió a tiempo'),
    });
  });
  revisar(false).then(() => { if (!inyectada) { const q = GM_getValue('paquete', null); if (q && q.codigo) inyectar(q); } });
})();
