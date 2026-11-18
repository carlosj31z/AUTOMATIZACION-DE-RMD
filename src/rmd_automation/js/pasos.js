// Pasos y procesos menores de UN master (por mdId) con la numeración que ve Producción en el registro («4.4.11»,
// «4.4.11.1»), como leerNumeracionFormulas del userscript: n.º de estructura numerada . orden de etiqueta . orden del paso
// [. orden del proceso menor]. Se ejecuta en el Launchpad (app en iframe).
//   window.__pasosRmd(mdId)                         -> [{ num, id, pm, tabla, codigo, descr, orden, tipo, cc, dec }]
//   window.__escribirPaso(tabla, id, datos)         -> MERGE de esa fila (estadoCC / decimales) con usuario y fecha
(() => {
  const app = () => {
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
    const leerTodo = async (ruta, filtros, params) => {
      const out = [];
      for (let skip = 0; skip < 20000; skip += 1000) {
        const r = await new Promise((ok, mal) => modelo.read(ruta, {
          filters: filtros, urlParameters: { ...params, $top: '1000', $skip: String(skip) }, success: ok,
          error: (e) => mal(new Error(`el portal no respondió (${(e && e.statusCode) || 'sin código'})`)) }));
        const filas = r.results || [];
        out.push(...filas);
        if (filas.length < 1000) break;
      }
      return out;
    };
    return { win, modelo, Filter, leerTodo };
  };

  window.__pasosRmd = async (mdId) => {
    const { Filter, leerTodo } = app();
    const porMd = [new Filter('mdId_mdId', 'EQ', mdId)];
    const act = (x) => x.activo !== false;
    const [estr, etqs, pasos, pms] = await Promise.all([
      leerTodo('/MD_ESTRUCTURA', porMd, { $expand: 'estructuraId', $select: 'mdEstructuraId,orden,activo,estructuraId/numeracion' }),
      leerTodo('/MD_ES_ETIQUETA', porMd, { $select: 'mdEsEtiquetaId,orden,activo' }),
      leerTodo('/MD_ES_PASO', porMd, { $expand: 'pasoId', $select: 'mdEstructuraPasoId,orden,activo,mdEstructuraId_mdEstructuraId,mdEsEtiquetaId_mdEsEtiquetaId,tipoDatoId_iMaestraId,estadoCC,decimales,pasoId/codigo,pasoId/descripcion' }),
      leerTodo('/MD_ES_PASO_INSUMO_PASO', porMd, { $expand: 'pasoHijoId', $select: 'mdEstructuraPasoInsumoPasoId,orden,activo,pasoId_mdEstructuraPasoId,tipoDatoId_iMaestraId,estadoCC,decimales,pasoHijoId/codigo,pasoHijoId/descripcion' }).catch(() => []),
    ]);
    const numE = new Map(); let n = 0;
    estr.filter(act).sort((a, b) => (+a.orden || 0) - (+b.orden || 0))
      .forEach((e) => { if (e.estructuraId && e.estructuraId.numeracion) numE.set(e.mdEstructuraId, String(++n)); });
    const ordT = new Map(etqs.filter(act).map((t) => [t.mdEsEtiquetaId, +t.orden || 0]));
    const out = [], numPaso = new Map();
    pasos.filter(act).forEach((p) => {
      const ne = numE.get(p.mdEstructuraId_mdEstructuraId), ot = ordT.get(p.mdEsEtiquetaId_mdEsEtiquetaId);
      const num = ne ? (ot != null ? `${ne}.${ot}.${p.orden}` : `${ne}.${p.orden}`) : '';
      numPaso.set(p.mdEstructuraPasoId, num);
      out.push({ num, id: p.mdEstructuraPasoId, pm: false, tabla: 'MD_ES_PASO', orden: +p.orden || 0,
        codigo: p.pasoId ? String(p.pasoId.codigo) : '', descr: (p.pasoId && p.pasoId.descripcion) || '',
        tipo: p.tipoDatoId_iMaestraId == null ? null : +p.tipoDatoId_iMaestraId, cc: !!p.estadoCC,
        dec: p.decimales == null ? null : +p.decimales });
    });
    pms.filter(act).forEach((m) => {
      const base = numPaso.get(m.pasoId_mdEstructuraPasoId);
      if (base === undefined) return;
      out.push({ num: base ? `${base}.${m.orden}` : '', id: m.mdEstructuraPasoInsumoPasoId, pm: true, tabla: 'MD_ES_PASO_INSUMO_PASO',
        orden: +m.orden || 0, codigo: m.pasoHijoId ? String(m.pasoHijoId.codigo) : '', descr: (m.pasoHijoId && m.pasoHijoId.descripcion) || '',
        tipo: m.tipoDatoId_iMaestraId == null ? null : +m.tipoDatoId_iMaestraId, cc: !!m.estadoCC,
        dec: m.decimales == null ? null : +m.decimales });
    });
    return out;
  };

  // Usuario del portal (USUARIO.usuario por el correo del Launchpad), como usuarioPortal del userscript.
  const usuarioPortal = async () => {
    const { win, Filter, leerTodo } = app();
    let correo = '';
    for (const w of [window, win]) {
      try { const u = w.sap && w.sap.ushell && w.sap.ushell.Container && w.sap.ushell.Container.getUser(); if (u) { correo = u.getEmail(); break; } } catch (e) { /* sigue */ }
    }
    if (!correo) return null;
    const [fila] = await leerTodo('/USUARIO', [new Filter('correo', 'EQ', correo)], { $select: 'usuario,correo' });
    return (fila && fila.usuario) || null;
  };

  const PERMITIDOS = { MD_ES_PASO: ['estadoCC', 'decimales'], MD_ES_PASO_INSUMO_PASO: ['estadoCC', 'decimales'] };
  window.__escribirPaso = async (tabla, id, datos) => {
    const campos = PERMITIDOS[tabla];
    if (!campos) throw new Error(`tabla no permitida: ${tabla}`);
    const extra = Object.keys(datos).filter((k) => !campos.includes(k));
    if (extra.length) throw new Error(`campos no permitidos: ${extra.join(', ')}`);
    const { modelo } = app();
    const usuario = await usuarioPortal();
    const cuerpo = { ...datos, fechaActualiza: new Date(), ...(usuario ? { usuarioActualiza: usuario } : {}) };
    await new Promise((ok, mal) => modelo.update(`/${tabla}('${id}')`, cuerpo, {
      success: ok, error: (e) => mal(new Error(`el portal no guardó (${(e && e.statusCode) || 'sin código'})`)) }));
    return { usuario };
  };
})();
