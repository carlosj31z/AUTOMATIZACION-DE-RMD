// Solo lectura: ubica los masters (MD) de un material, o los del lote (Ver OP) si solo se da el lote.
// window.__ubicarRmd(material, lote) -> { masters: [...], ops: [...] }. Se ejecuta en el Launchpad (app en iframe).
(() => {
  window.__ubicarRmd = async (material, lote) => {
    const win = document.querySelector('iframe').contentWindow;
    const sap = win.sap;
    const Element = sap.ui.require('sap/ui/core/Element');
    const todos = Element && Element.registry ? Element.registry.all() : sap.ui.getCore().mElements || {};
    let modelo = null;
    for (const id in todos) {
      const e = todos[id];
      const m = e && e.getModel && e.getModel('mainModelv2');
      if (m) { modelo = m; break; }
    }
    if (!modelo) throw new Error('no encuentro el modelo de Configuración RMD');
    const Filter = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const leer = (ruta, filtros, params) => new Promise((ok, mal) => modelo.read(ruta, {
      filters: filtros, urlParameters: params, success: ok,
      error: (e) => mal(new Error(`el portal no respondió (${(e && e.statusCode) || 'sin código'})`)) }));
    let ops = [];
    if (lote) {
      const r = await leer('/RMD', [new Filter('lote', 'EQ', String(lote))], { $top: '50', $select: 'mdId_mdId,ordenSAP,lote' });
      ops = (r.results || []).map((x) => ({ md_id: String(x.mdId_mdId), orden: String(x.ordenSAP || ''), lote: String(x.lote || '') }));
    }
    // Con material: sus masters. Sin material (solo lote): los masters de las OP de ese lote.
    let filtroMd;
    if (material) filtroMd = [new Filter('codDefectoReceta', 'EQ', String(material))];
    else {
      const ids = [...new Set(ops.map((o) => o.md_id))];
      if (!ids.length) return { masters: [], ops };
      filtroMd = [new Filter({ filters: ids.map((id) => new Filter('mdId', 'EQ', id)), and: false })];
    }
    const md = await leer('/MD', filtroMd, {
      $expand: 'estadoIdRmd,sucursalId', $top: '200',
      $select: 'mdId,codigo,version,nivelTxt,codigoversionprincipal,codAgrupadorReceta,codDefectoReceta,descripcion,estadoIdRmd/contenido,sucursalId/contenido' });
    const masters = (md.results || []).map((x) => ({
      md_id: String(x.mdId), codigo: String(x.codigo || ''), version: Number(x.version) || 0, etapa: x.nivelTxt || '',
      principal: String(x.codigoversionprincipal || x.codigo || ''), estado: (x.estadoIdRmd && x.estadoIdRmd.contenido) || '',
      descripcion: x.descripcion || '', planta: (x.sucursalId && x.sucursalId.contenido) || '' }));
    return { masters, ops };
  };
})();
