// SOLO LECTURA. Se ejecuta en la pestaña del portal RMD (lista «Configuración Manufactura Digital»).
// Lee todos los MD (todas las versiones) con estado, planta, fechas, observación y recetas asociadas activas.
(async () => {
  const core = sap.ui.getCore();
  const tablaEl = document.querySelector('[id$="idTblConfigurationRmd"]');
  if (!tablaEl) return { error: 'No está abierta la lista «Configuración Manufactura Digital»' };
  let c = core.byId(tablaEl.id.replace(/-listUl$/, '')); while (c && !c.getController) c = c.getParent && c.getParent();
  const modelo = c.getModel('mainModelv2');
  const leer = (ruta, params) => new Promise((ok, mal) => modelo.read(ruta, { urlParameters: params, success: ok, error: (e) => mal(new Error(ruta + ' ' + ((e && e.statusCode) || '') + ' ' + ((e && e.responseText) || '').slice(0, 300))) }));
  const f = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '');
  const out = { generado: new Date().toISOString() };
  const select = ['mdId', 'codigo', 'codigoSolicitud', 'codigoversionprincipal', 'version', 'nivelTxt', 'descripcion', 'codDefectoReceta', 'codAgrupadorReceta', 'areaRmdTxt',
    'fechaRegistro', 'usuarioRegistro', 'fechaActualiza', 'usuarioActualiza', 'fechaAutorizacion', 'usuarioAutorizacion', 'fechaSolicitud', 'observacion',
    'estadoIdRmd/contenido', 'sucursalId/contenido', 'motivoId/descripcion'].join(',');
  const todas = [];
  for (let skip = 0; skip < 100000; skip += 1000) {
    const p = await leer('/MD', { $select: select, $expand: 'estadoIdRmd,sucursalId,motivoId', $orderby: 'mdId', $top: '1000', $skip: String(skip) });
    todas.push(...(p.results || [])); if ((p.results || []).length < 1000) break;
  }
  out.columnasMd = ['mdId', 'codigo', 'codigoSolicitud', 'linaje', 'version', 'etapa', 'descripcion', 'codDefecto', 'codAgrupador', 'area', 'fechaRegistro', 'usuarioRegistro',
    'fechaActualiza', 'usuarioActualiza', 'fechaAutorizacion', 'usuarioAutorizacion', 'fechaSolicitud', 'observacion', 'estado', 'planta', 'motivo'];
  out.md = todas.map((m) => [m.mdId, m.codigo, m.codigoSolicitud || '', m.codigoversionprincipal || '', m.version, m.nivelTxt || '', m.descripcion || '', m.codDefectoReceta || '',
    m.codAgrupadorReceta || '', m.areaRmdTxt || '', f(m.fechaRegistro), m.usuarioRegistro || '', f(m.fechaActualiza), m.usuarioActualiza || '', f(m.fechaAutorizacion),
    m.usuarioAutorizacion || '', f(m.fechaSolicitud), m.observacion || '', (m.estadoIdRmd && m.estadoIdRmd.contenido) || '', (m.sucursalId && m.sucursalId.contenido) || '',
    (m.motivoId && m.motivoId.descripcion) || '']);
  const recs = [];
  try {
    for (let skip = 0; skip < 200000; skip += 1000) {
      const p = await leer('/MD_RECETA', { $expand: 'recetaId', $select: 'mdId_mdId,activo,recetaId/Matnr,recetaId/Werks,recetaId/Verid,recetaId/Text1', $top: '1000', $skip: String(skip) });
      recs.push(...(p.results || [])); if ((p.results || []).length < 1000) break;
    }
  } catch (e) { out.recetasError = String(e.message || e); }
  out.columnasRecetas = ['mdId', 'activo', 'material', 'centro', 'verid', 'texto'];
  out.recetas = recs.map((r) => [r.mdId_mdId, r.activo, (r.recetaId && r.recetaId.Matnr) || '', (r.recetaId && r.recetaId.Werks) || '', (r.recetaId && r.recetaId.Verid) || '', (r.recetaId && r.recetaId.Text1) || '']);
  return out;
})();
