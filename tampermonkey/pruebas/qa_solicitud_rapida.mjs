// v1.147.0: app «Solicitud de Manufactura Digital» más rápida (bloque ==SOLICITUD-RAPIDA== del userscript), con UI5 y OData simulados.
// node tampermonkey/pruebas/qa_solicitud_rapida.mjs
import { readFileSync } from 'node:fs';
const js = readFileSync(new URL('../rmd-ui-mejoras.user.js', import.meta.url), 'utf8');
const bloque = js.slice(js.indexOf('// ==SOLICITUD-RAPIDA=='), js.indexOf('// ==SOLICITUD-RAPIDA-FIN=='));
let fallas = 0; const ok = (n, c, d) => { console.log((c ? 'PASA  ' : 'FALLA ') + n + (c ? '' : ' — ' + JSON.stringify(d))); if (!c) fallas++; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function escenario({ yaElegida = false, opcion = true, totalMd = 5127 } = {}) {
  const lecturas = [], eventos = []; let tElegir = null; const t0 = Date.now();
  let maxParalelo = 0, enCurso = 0;
  const modelo = { read: (ruta, o) => { const skip = +(o.urlParameters.$skiptoken || 0); lecturas.push({ ruta, skip, exp: o.urlParameters.$expand }); enCurso++; maxParalelo = Math.max(maxParalelo, enCurso);
    setTimeout(() => { enCurso--; const n = Math.max(0, Math.min(1000, totalMd - skip)); o.success({ results: Array.from({ length: n }, (_, i) => ({ mdId: 'M' + (skip + i), destinatariosMD: { results: [] } })) }); }, 15); } };
  const datos = { '/aListaApps': [{ aplicacionId: '3b5fc15f-3dcb-4c0f-8927-8ba26964da38' }], '/aFilters': yaElegida ? { aplicacionId: 'X' } : {} };
  const mg = { getProperty: (k) => { if (k === '/aFilters/aplicacionId') return (datos['/aFilters'] || {}).aplicacionId; if (k.startsWith('/oInfoUsuario')) { const v = datos['/oInfoUsuario']; return k === '/oInfoUsuario' ? v : v && v.funcionUsuario; } return datos[k]; },
    setProperty: (k, v) => { if (k === '/aFilters/aplicacionId') datos['/aFilters'] = { ...(datos['/aFilters'] || {}), aplicacionId: v }; else datos[k] = v; } };
  const svc = {};
  svc.getDataWithSelect = async () => { throw new Error('original no debía usarse'); };
  const items = [{ getKey: () => '3b5fc15f-3dcb-4c0f-8927-8ba26964da38', getText: () => 'SOLICITUD' }, { getKey: () => '295fd633-d654-49b6-86a0-674611a3b783', getText: () => 'FLUJO DE REVISIÓN' }];
  let recetasListas = false;
  const ctrl = { modelGeneral: mg, mainModelv2: null, getMetadata: () => ({ getName: () => 'mif.rmd.solicitud.controller.MainView' }),
    onGetRecetas: async function () { await espera(400); recetasListas = true; mg.setProperty('/aListRecetas', [1, 2]); },
    async onInitApp() { const t = Date.now(); await ctrl.onGetRecetas(); eventos.push(['initApp', Date.now() - t]); await espera(30); mg.setProperty('/oInfoUsuario', { data: { usuario: 'CJESUSZ' }, funcionUsuario: { aprobadorSolicitud: true } }); } };
  const box = { sel: null, getItems: () => items, setSelectedKey: (k) => { box.sel = k; }, getSelectedKey: () => box.sel, fireChange: () => { tElegir = Date.now() - t0; eventos.push(['change', box.sel]); mg.setProperty('/aFilters/aplicacionId', box.sel); ctrl.onInitApp(); } };
  const fb = { isA: (t) => t === 'sap.ui.comp.filterbar.FilterBar', determineControlByName: (n) => (n === 'Z' ? box : null),
    fireSearch: async () => { eventos.push(['search', !!(datos['/oInfoUsuario'] || {}).funcionUsuario]); const r = await svc.getDataWithSelect(modelo, '/MD', 'estadoIdRmd,aReceta', [], 'mdId'); eventos.push(['lista', r.results.length]); } };
  const vista = { getController: () => ctrl, getModel: () => mg, findAggregatedObjects: (_, f) => [fb].filter(f) };
  const sap = { ui: { getCore: () => ({ byId: (id) => (id === 'application-solicitud-display-component---MainView' ? vista : null) }), require: (n) => (n === 'mif/rmd/solicitud/services/solicitud' ? svc : null) } };
  const window = { sap, top: { location: { hash: '#solicitud-display?sap-ui-app-id-hint=saas_approuter_mif.rmd.solicitud' } } };
  const location = { pathname: '/cp.portal/ui5appruntime.html', href: 'https://x.hana.ondemand.com/cp.portal/ui5appruntime.html' };
  setTimeout(() => { ctrl.mainModelv2 = modelo; }, 300);   // init() crea mainModelv2 después de loadMaestra
  setTimeout(() => { datos['/MAESTRA'] = [{ id: 1 }]; }, 600);   // onSetMaestra: señal de que el maestro terminó
  const errores = [];
  const f = new Function('window', 'sap', 'location', 'on', 'aislar', 'anotarError', 'NORM', bloque + '\nreturn { solLeerEnParalelo };');
  f(window, sap, location, (k) => (k === 'solicitudrapida' ? opcion : true), (n, g) => { try { return g(); } catch (e) { errores.push(n + ': ' + e.message); } }, (n, e) => errores.push(n + ': ' + e), (t) => String(t).trim().toUpperCase());
  await espera(2500);
  return { tElegir, lecturas, eventos, maxParalelo, errores, recetasListas, box, tiempoLista: Date.now() - t0 };
}

const a = await escenario();
const ev = Object.fromEntries(a.eventos.map((e) => [e[0], e[1]]));
ok('espera a que exista mainModelv2 (sin él onInitApp fallaba en el portal)', a.eventos.length && a.tElegir >= 300 + 800, a.tElegir);
ok('elige SOLICITUD en Aplicación con su change (onSelectAplicacion)', ev.change === '3b5fc15f-3dcb-4c0f-8927-8ba26964da38', a.eventos);
ok('onGetRecetas no hace esperar a onInitApp (sigue con USUARIO enseguida)', ev.initApp != null && ev.initApp < 100, a.eventos);
ok('los códigos de material igual se cargan (en segundo plano)', a.recetasListas);
ok('pulsa Ir solo cuando ya están los permisos del usuario', ev.search === true, a.eventos);
ok('la lista llega completa (5 127 solicitudes, como antes)', ev.lista === 5127, a.eventos);
ok('las páginas de 1000 se piden a la vez (no una tras otra)', a.maxParalelo >= 5, a.maxParalelo);
ok('mismas páginas por $skiptoken que la app original (0, 1000…5000) y sin repetir', JSON.stringify([...new Set(a.lecturas.map((x) => x.skip))].slice(0, 6)) === JSON.stringify([0, 1000, 2000, 3000, 4000, 5000]) && a.lecturas.length === new Set(a.lecturas.map((x) => x.skip)).size, a.lecturas.map((x) => x.skip));
ok('sin errores', !a.errores.length, a.errores);

const b = await escenario({ yaElegida: true });
ok('si la persona ya eligió una aplicación, no se toca ni se pulsa Ir', !b.eventos.length, b.eventos);
const c = await escenario({ opcion: false });
ok('con la opción apagada no hace nada', !c.eventos.length && !c.lecturas.length, c.eventos);
const d = await escenario({ totalMd: 1000 });
ok('exactamente 1000 solicitudes: pide una página más y termina', (Object.fromEntries(d.eventos.map((e) => [e[0], e[1]]))).lista === 1000, d.eventos);

console.log(fallas ? `${fallas} prueba(s) fallaron` : 'Todas las pruebas pasaron');
process.exit(fallas ? 1 : 0);
