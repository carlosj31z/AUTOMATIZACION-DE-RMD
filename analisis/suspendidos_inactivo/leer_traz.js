// SOLO LECTURA. Lee MD_TRAZABILIDAD completa (cambios de estado de cada RMD con fecha) desde la pestana
// del portal RMD (lista «Configuracion Manufactura Digital») en el Chrome de pruebas (puerto 9222).
// Se evalua igual que leer_md_suspendidos.js (ver correr.py) y se guarda como md_traz.json.
(async () => {
  const core = sap.ui.getCore();
  const tablaEl = document.querySelector('[id$="idTblConfigurationRmd"]');
  if (!tablaEl) return { error: 'No esta abierta la lista Configuracion Manufactura Digital' };
  let c = core.byId(tablaEl.id.replace(/-listUl$/, '')); while (c && !c.getController) c = c.getParent && c.getParent();
  const modelo = c.getModel('mainModelv2');
  const leer = (ruta, params) => new Promise((ok, mal) => modelo.read(ruta, { urlParameters: params, success: ok, error: (e) => mal(new Error(ruta + ' ' + ((e && e.statusCode) || '') + ' ' + ((e && e.responseText) || '').slice(0, 300))) }));
  const f = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString() : '');
  const filas = [];
  for (let skip = 0; skip < 400000; skip += 1000) {
    const p = await leer('/MD_TRAZABILIDAD', { $select: 'idTrazabilidad,mdId_mdId,fechaRegistro,usuarioRegistro,activo,estadoTrazab/contenido', $expand: 'estadoTrazab', $orderby: 'idTrazabilidad', $top: '1000', $skip: String(skip) });
    filas.push(...(p.results || [])); if ((p.results || []).length < 1000) break;
  }
  return { generado: new Date().toISOString(), columnas: ['id','mdId','fecha','usuario','activo','estado'], traz: filas.map((x) => [x.idTrazabilidad, x.mdId_mdId, f(x.fechaRegistro), x.usuarioRegistro || '', x.activo, (x.estadoTrazab && x.estadoTrazab.contenido) || '']) };
})();
