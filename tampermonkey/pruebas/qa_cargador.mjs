// Cargador (rmd-ui-mejoras-cargador.user.js) con SharePoint y Tampermonkey simulados: elección de versión, caché, inyección y errores.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const CARGADOR = readFileSync(new URL('../rmd-ui-mejoras-cargador.user.js', import.meta.url), 'utf8');
const SCRIPT = readFileSync(new URL('../rmd-ui-mejoras.user.js', import.meta.url), 'utf8');
const V = (/^\/\/ @version\s+(\S+)/m.exec(SCRIPT) || [])[1];
const conVersion = (txt, v) => txt.replace(/^(\/\/ @version\s+)\S+/m, `$1${v}`).replace(/const VERSION = '[^']+';/, `const VERSION = '${v}';`);
const fallos = [];
const ok = (cond, msg) => { console.log((cond ? 'PASA  ' : 'FALLA ') + msg); if (!cond) fallos.push(msg); };

// carpeta simulada: nombre -> { texto, fecha }
const carpeta = new Map();
const subir = (nombre, texto, fecha = new Date().toISOString()) => carpeta.set(nombre, { texto, fecha });
let modo = 'ok', pedidos = [];
const almacen = new Map();
function cargar({ pathname = '/cp.portal/ui5appruntime.html', conBody = true } = {}) {
  const attrs = {}, oyentes = {}, inyectados = [];
  const raiz = { setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: (k) => (k in attrs ? attrs[k] : null), hasAttribute: (k) => k in attrs };
  const document = {
    documentElement: raiz, body: conBody ? {} : null, head: { appendChild: (s) => inyectados.push(s.textContent) },
    createElement: () => ({ textContent: '', remove() {} }),
    addEventListener: (t, f) => { (oyentes[t] = oyentes[t] || []).push(f); },
    dispatchEvent: (e) => { (oyentes[e.type] || []).slice().forEach((f) => f(e)); },
  };
  const GM_xmlhttpRequest = (o) => {
    pedidos.push(o.url);
    setTimeout(() => {
      if (modo === 'sin-sesion') return o.onload({ status: 403, responseText: '' });
      if (modo === 'login') return o.onload({ status: 200, responseText: '<html>Iniciar sesión</html>' });
      if (modo === 'red') return o.onerror({});
      if (o.method === 'POST' || /search\/query/.test(o.url)) return o.onload({ status: 200, responseText: JSON.stringify({ url: o.url, metodo: o.method, cab: o.headers, cuerpo: !!o.data }) });
      if (/\/Files\?/.test(o.url)) {
        if (!/GetFolderByServerRelativePath\(decodedurl='%2Fsites%2FDOCUMENTACIONMEDIFARMA%2FDocumentos%20compartidos%2F.*MEJORAS%20DE%20INTERFAZ'\)/.test(o.url)) return o.onload({ status: 404, responseText: '' });
        return o.onload({ status: 200, responseText: JSON.stringify({ value: [...carpeta].map(([n, f]) => ({ Name: n, ServerRelativeUrl: '/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/x/' + n, TimeLastModified: f.fecha, Length: String(f.texto.length) })) }) });
      }
      const m = /GetFileByServerRelativePath\(decodedurl='([^']+)'\)\/\$value$/.exec(o.url), n = m && decodeURIComponent(m[1]).split('/').pop(), f = n && carpeta.get(n);
      return f ? o.onload({ status: 200, responseText: f.texto }) : o.onload({ status: 404, responseText: '' });
    }, 1);
  };
  const mensajes = [], oyentesMsg = [];
  const window = { addEventListener: (t, f) => { if (t === 'message') oyentesMsg.push(f); }, postMessage: (data) => mensajes.push(data) };
  const enviar = (data) => oyentesMsg.forEach((f) => f({ data, origin: 'https://x.hana.ondemand.com', source: window }));
  const ctx = {
    window, Blob: class { constructor(p, o) { this.partes = p; this.type = o && o.type; } },
    document, location: { pathname, origin: 'https://x.hana.ondemand.com' }, Event: class { constructor(t) { this.type = t; } }, console, setTimeout, Promise, JSON, Date, Map, Set, Object, String, Error, encodeURIComponent, decodeURIComponent, parseInt,
    GM_xmlhttpRequest, GM_getValue: (k, d) => (almacen.has(k) ? JSON.parse(almacen.get(k)) : d), GM_setValue: (k, v) => { almacen.set(k, JSON.stringify(v)); },
  };
  vm.runInNewContext(CARGADOR, ctx);
  return { attrs, inyectados, document, mensajes, enviar, estado: () => JSON.parse(attrs['data-rmd-cargador-estado'] || 'null'), revisar: () => document.dispatchEvent(new ctx.Event('rmd-cargador-revisar')), listo: () => new Promise((r) => document.addEventListener('rmd-cargador-estado', r)) };
}
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const bajadas = () => pedidos.filter((u) => /\$value$/.test(u)).map((u) => decodeURIComponent(/decodedurl='([^']+)'/.exec(u)[1]).split('/').pop());
const listados = () => pedidos.filter((u) => /\/Files\?/.test(u)).length;

ok(!!V, `versión del script: ${V}`);
subir('1.39.1.js', conVersion(SCRIPT, '1.39.1'), '2026-10-02T18:31:50Z');
subir('1.51.0.js', conVersion(SCRIPT, '1.51.0'), '2026-10-05T02:31:37Z');
subir('Guia de mejoras.docx', 'docx', '2026-10-06T15:19:38Z');
subir('1.55.0.js', conVersion(SCRIPT, '1.55.0'), '2026-10-09T04:25:40Z');
subir(`${V}.js`, SCRIPT, '2026-10-10T10:00:00Z');
subir('rmd-ui-mejoras-cargador.user.js', CARGADOR, '2026-10-10T10:00:00Z');

// 1. primera vez: sin caché, baja solo la de número más alto y la inyecta
let c = cargar(); await c.listo(); await pausa(20);
ok(listados() === 1 && JSON.stringify(bajadas()) === JSON.stringify([`${V}.js`]), `1. primera carga: 1 listado y solo baja ${V}.js (${bajadas()})`);
ok(c.inyectados.length === 1 && c.inyectados[0].startsWith(`window.__rmdDesdeCargador = "${V}";`) && c.inyectados[0].includes(`const VERSION = '${V}';`), '1. inyecta el script con la marca __rmdDesdeCargador');
ok(c.attrs['data-rmd-cargador'] === '1.1.0' && c.estado().actual === V && c.estado().ultima === V && !c.estado().error, `1. estado publicado ${JSON.stringify(c.estado())}`);

// 2. otra página antes de 10 min: inyecta de la caché sin pedir nada
pedidos = []; c = cargar(); await pausa(20);
ok(pedidos.length === 0 && c.inyectados.length === 1 && c.estado().actual === V, '2. recarga antes de 10 min: inyecta la caché sin ir a SharePoint');

// 3. revisión manual sin cambios: lista, no baja
c.revisar(); await c.listo(); await pausa(5);
ok(listados() === 1 && bajadas().length === 0, '3. revisión manual sin cambios: 1 listado, 0 descargas');

// 4. archivo sin versión en el nombre con una versión mayor: se lee una vez y queda lista para la próxima carga
subir('mejoras nuevo.js', conVersion(SCRIPT, '9.0.0'), '2026-10-11T08:00:00Z');
pedidos = []; c.revisar(); await c.listo(); await pausa(5);
ok(JSON.stringify(bajadas()) === JSON.stringify(['mejoras nuevo.js']) && c.estado().ultima === '9.0.0' && c.estado().actual === V, `4. nombre sin versión: baja una vez y deja 9.0.0 lista (actual ${c.estado().actual})`);
pedidos = []; c.revisar(); await c.listo(); await pausa(5);
ok(bajadas().length === 0, '4. siguiente revisión: no la vuelve a bajar');
pedidos = []; c = cargar(); await pausa(20);
ok(c.inyectados.length === 1 && c.inyectados[0].includes("const VERSION = '9.0.0';") && c.estado().actual === '9.0.0', '4. al recargar se usa la 9.0.0');

// 5. se borra la más nueva: vuelve a la de número más alto que quede
carpeta.delete('mejoras nuevo.js');
pedidos = []; c.revisar(); await c.listo(); await pausa(5);
ok(JSON.stringify(bajadas()) === JSON.stringify([`${V}.js`]) && c.estado().ultima === V, `5. borrada la 9.0.0: vuelve a ${V}`);

// 6. nombre con versión pero contenido que no es el script: se descarta y se recuerda
subir('20.0.0.js', 'console.log("otra cosa");', '2026-10-12T08:00:00Z');
pedidos = []; c.revisar(); await c.listo(); await pausa(5);
ok(JSON.stringify(bajadas()) === JSON.stringify(['20.0.0.js']) && c.estado().ultima === V, '6. 20.0.0.js no es el script: se ignora y sigue la vigente');
pedidos = []; c.revisar(); await c.listo(); await pausa(5);
ok(bajadas().length === 0, '6. no lo vuelve a bajar');
carpeta.delete('20.0.0.js');

// 7. script incompleto (subida cortada)
subir('30.0.0.js', conVersion(SCRIPT, '30.0.0').slice(0, 400000), '2026-10-12T09:00:00Z');
pedidos = []; c.revisar(); await c.listo(); await pausa(5);
ok(c.estado().ultima === V, '7. archivo cortado: no se usa');
carpeta.delete('30.0.0.js');

// 8. sin sesión de SharePoint / página de inicio de sesión / sin red: error visible y la caché sigue
for (const [m, rx] of [['sin-sesion', /sin sesión/], ['login', /lista de archivos/], ['red', /sin conexión/]]) {
  modo = m; c.revisar(); await c.listo(); await pausa(5);
  ok(rx.test(c.estado().error) && c.estado().ultima === V, `8. ${m}: error «${c.estado().error}», se mantiene ${c.estado().ultima}`);
}
modo = 'ok'; c.revisar(); await c.listo(); await pausa(5);
ok(!c.estado().error, '8. al volver la sesión el error desaparece');

// 9. marco del portal (fuera de la app): inyecta la caché pero no revisa la carpeta
pedidos = []; c = cargar({ pathname: '/site/portalprd' }); c.revisar(); await pausa(20);
ok(pedidos.length === 0 && c.inyectados.length === 1, '9. marco del portal: inyecta y no consulta SharePoint');

// 10. document-start sin <body>: espera a DOMContentLoaded
c = cargar({ conBody: false }); await pausa(5);
const antes = c.inyectados.length; c.document.body = {}; c.document.dispatchEvent({ type: 'DOMContentLoaded' });
ok(antes === 0 && c.inyectados.length === 1, '10. sin <body> todavía: inyecta en DOMContentLoaded');

// 11. puente de la contingencia: solo la API del sitio y solo escrituras dentro de 3.-CONTINGENCIA
{
  const API = 'https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA/_api/';
  const CONT = encodeURIComponent('/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/PLANTA LIMA/DIRECCION TECNICA/DOCUMENTACION TECNICA/04.-RMD/3.-CONTINGENCIA/1.- PLANTA 1/X/ACONDICIONADO');
  const OTRA = encodeURIComponent('/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/PLANTA LIMA/OTRA');
  const casos = [
    ['búsqueda', 'GET', API + "search/query?querytext='x'", 200],
    ['contextinfo', 'POST', API + 'contextinfo', 200],
    ['subir en contingencia', 'POST', API + `web/GetFolderByServerRelativePath(DecodedUrl=@a)/Files/AddUsingPath(DecodedUrl=@n,Overwrite=false)?@a='${CONT}'&@n='a.pdf'`, 200],
    ['mover dentro de contingencia', 'POST', API + `web/GetFileByServerRelativePath(DecodedUrl=@a)/MoveToUsingPath(DecodedUrl=@b,moveOperations=1)?@a='${CONT}%2Fa.pdf'&@b='${CONT}%2FOBSOLETO%2Fa.pdf'`, 200],
    ['subir fuera de contingencia', 'POST', API + `web/GetFolderByServerRelativePath(DecodedUrl=@a)/Files/AddUsingPath(DecodedUrl=@n,Overwrite=false)?@a='${OTRA}'&@n='a.pdf'`, 400],
    ['mover fuera de contingencia', 'POST', API + `web/GetFileByServerRelativePath(DecodedUrl=@a)/MoveToUsingPath(DecodedUrl=@b,moveOperations=1)?@a='${CONT}%2Fa.pdf'&@b='${OTRA}%2Fa.pdf'`, 400],
    ['borrar', 'POST', API + `web/GetFileByServerRelativePath(DecodedUrl=@a)/recycle()?@a='${CONT}%2Fa.pdf'`, 400],
    ['otro sitio', 'GET', "https://otro.sharepoint.com/_api/search/query?querytext='x'", 400],
    ['GET de archivos', 'GET', API + "web/GetFileByServerRelativePath(DecodedUrl=@a)/$value?@a='x'", 400],
  ];
  c = cargar();
  for (const [n, metodo, url, esperado] of casos) {
    const id = 'p' + n; c.enviar({ tipo: 'rmd-sp-pedido', id, metodo, url, cabeceras: { Accept: 'application/json', Cookie: 'x' }, cuerpo: metodo === 'POST' ? new Uint8Array([1, 2]) : null });
    await pausa(5);
    const r = c.mensajes.find((m) => m.id === id);
    ok(r && r.estado === esperado, `11. puente, ${n}: ${r ? r.estado : 'sin respuesta'}`);
    if (r && r.estado === 200 && n === 'contextinfo') ok(!('Cookie' in JSON.parse(r.texto).cab), '11. puente: solo pasa las cabeceras permitidas');
  }
}

console.log(fallos.length ? `\n${fallos.length} falla(s)` : '\nTodo pasa.');
process.exit(fallos.length ? 1 : 0);
