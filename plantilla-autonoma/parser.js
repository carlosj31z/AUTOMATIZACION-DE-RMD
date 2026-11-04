/* Lector del PDF del master (impresión del portal RMD) y del Excel «Pasos» (exportado de SAP).
   Arma el paquete de datos de la Plantilla para Producción con el mismo formato que «Generar plantilla»
   del userscript (ppPaquete), para que el editor del borrador lo abra igual.
   Funciona en el navegador (generador) y en Node (pruebas). Sin dependencias. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.RMDLector = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- texto ----------
  const sinTildes = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const limpio = (t) => String(t == null ? '' : t).replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();   // = ppLimpio
  const claveExacta = (t) => limpio(t);
  const claveSuelta = (t) => sinTildes(t).toUpperCase().replace(/\s+/g, '');
  const claveNombre = (t) => sinTildes(t).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  let SEQ = 0;
  const nuevoId = () => {
    try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* abajo */ }
    SEQ += 1; return 'pdf-' + Date.now().toString(36) + '-' + SEQ.toString(36);
  };
  // equipos / utensilios del catálogo base: texto con una fila por línea (como en el paquete) o arreglo de filas
  const filasBase = (v) => (Array.isArray(v) ? v.map((x) => (Array.isArray(x) ? x : String(x).split('\t'))) : String(v || '').split('\n').filter(Boolean).map((l) => l.split('\t')));
  const CON_CAJA = new Set([433, 434, 435, 436, 437, 438, 443, 444, 445]);

  // ---------- catálogo de pasos (Excel «Pasos» de SAP) ----------
  // filas: arreglo de arreglos (primera fila con los títulos de columna, como sale de SheetJS con header:1)
  function leerCatalogo(filas, base) {
    const tit = (v) => claveNombre(v);
    let h = -1;
    for (let i = 0; i < Math.min(filas.length, 15); i++) {
      const r = (filas[i] || []).map(tit);
      if (r.includes('CODIGO') && r.includes('DESCRIPCION')) { h = i; break; }
    }
    if (h < 0) throw new Error('el Excel no tiene las columnas «Codigo» y «Descripción» (debe ser el exportado de Pasos de SAP)');
    const cab = filas[h].map(tit), col = (n) => cab.indexOf(n);
    const cC = col('CODIGO'), cD = col('DESCRIPCION'), cE = col('ESTRUCTURA'), cT = col('ETIQUETA'), cS = col('ESTADO'), cTi = col('TIPO DE DATO');
    if (cE < 0) throw new Error('el Excel no tiene la columna «Estructura»');
    const tipoPorNombre = new Map(Object.entries(base.tipos || {}).map(([id, n]) => [claveNombre(n), +id]));
    const out = [], porClave = new Map(), estructuras = new Map();
    let deBaja = 0;
    for (let i = h + 1; i < filas.length; i++) {
      const r = filas[i]; if (!r) continue;
      const codigo = r[cC] == null ? '' : String(r[cC]).trim(), texto = limpio(r[cD]);
      if (!codigo || !texto) continue;
      const estado = cS >= 0 ? claveNombre(r[cS]) : 'ACTIVO';
      if (estado && estado !== 'ACTIVO') { deBaja++; continue; }
      const estr = r[cE] == null ? '' : String(r[cE]), etq = cT >= 0 && r[cT] != null && String(r[cT]).trim() ? String(r[cT]) : '';
      const tipoN = cTi >= 0 ? claveNombre(r[cTi]) : '', tipo = tipoPorNombre.has(tipoN) ? tipoPorNombre.get(tipoN) : null;
      const f = { codigo, texto, estr, etq, tipo, kE: claveNombre(estr), kT: claveNombre(etq) };
      out.push(f);
      const k = claveSuelta(texto); if (!porClave.has(k)) porClave.set(k, []); porClave.get(k).push(f);
      estructuras.set(estr, (estructuras.get(estr) || 0) + 1);
    }
    if (!out.length) throw new Error('el Excel no trae pasos activos');
    return { filas: out, porClave, estructuras, deBaja };
  }

  // ---------- PDF ----------
  // Lee páginas con pdf.js: textos (x, y desde arriba, ancho, alto) y líneas verticales (para las casillas de dato)
  async function leerPdf(pdfjsLib, datos, avisar) {
    const doc = await pdfjsLib.getDocument({ data: datos, isEvalSupported: false }).promise, paginas = [];
    const O = pdfjsLib.OPS;
    for (let n = 1; n <= doc.numPages; n++) {
      if (avisar) avisar(`Leyendo el PDF… página ${n} de ${doc.numPages}`);
      const pg = await doc.getPage(n), alto = pg.view[3] - pg.view[1];
      const tc = await pg.getTextContent();
      const items = tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ x: it.transform[4], y: alto - it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height, s: it.str }));
      const ops = await pg.getOperatorList(), verticales = [];
      let ctm = [1, 0, 0, 1, 0, 0]; const pila = [];
      const mul = (m, k) => [m[0] * k[0] + m[1] * k[2], m[0] * k[1] + m[1] * k[3], m[2] * k[0] + m[3] * k[2], m[2] * k[1] + m[3] * k[3], m[4] * k[0] + m[5] * k[2] + k[4], m[4] * k[1] + m[5] * k[3] + k[5]];
      const pt = (x, y) => [x * ctm[0] + y * ctm[2] + ctm[4], alto - (x * ctm[1] + y * ctm[3] + ctm[5])];
      ops.fnArray.forEach((f, i) => {
        const a = ops.argsArray[i];
        if (f === O.save) pila.push(ctm);
        else if (f === O.restore) ctm = pila.pop() || [1, 0, 0, 1, 0, 0];
        else if (f === O.transform) ctm = mul(a, ctm);
        else if (f === O.constructPath) {
          const sub = a[0], args = a[1]; let k = 0, prev = null;
          sub.forEach((s) => {
            if (s === O.moveTo) { prev = pt(args[k], args[k + 1]); k += 2; }
            else if (s === O.lineTo) { const p = pt(args[k], args[k + 1]); k += 2; if (prev && Math.abs(p[0] - prev[0]) < 0.6 && Math.abs(p[1] - prev[1]) > 6) verticales.push({ x: p[0], y1: Math.min(p[1], prev[1]), y2: Math.max(p[1], prev[1]) }); prev = p; }
            else if (s === O.rectangle) { const [x, y, w, hh] = args.slice(k, k + 4); k += 4; const p1 = pt(x, y), p2 = pt(x + w, y + hh); if (Math.abs(p2[1] - p1[1]) > 6) { const y1 = Math.min(p1[1], p2[1]), y2 = Math.max(p1[1], p2[1]); verticales.push({ x: Math.min(p1[0], p2[0]), y1, y2 }, { x: Math.max(p1[0], p2[0]), y1, y2 }); } }
            else if (s === O.curveTo) k += 6; else if (s === O.curveTo2 || s === O.curveTo3) k += 4;
          });
        }
      });
      paginas.push({ n, items, verticales });
    }
    return paginas;
  }

  // ---------- armado de líneas ----------
  const unir = (its) => { let t = '', fin = null; its.forEach((i) => { if (fin != null) t += i.x - fin > 1.0 ? ' ' : ''; t += i.s; fin = i.x + i.w; }); return limpio(t); };
  const RX_NUM = /^\d+(\.\d+)+\.-$/;          // número de paso «4.4.1.-»: va en su propia línea
  function lineasDe(items, maxHueco = 30) {
    const ord = [...items].sort((a, b) => a.y - b.y || a.x - b.x), L = [];
    ord.forEach((i) => {
      let l = null;
      for (let j = L.length - 1; j >= 0 && j >= L.length - 6; j--) { const c = L[j]; if (Math.abs(c.y - i.y) < 2.5 && i.x >= c.x1 - 1 && i.x - c.x1 < maxHueco && Math.abs(c.h - i.h) < 0.6 && !(c.h < 9.6 && RX_NUM.test(c.its[c.its.length - 1].s.trim()))) { l = c; break; } }
      if (!l) { l = { y: i.y, x0: i.x, x1: i.x + i.w, h: i.h, its: [] }; L.push(l); }
      l.its.push(i); l.x1 = Math.max(l.x1, i.x + i.w);
    });
    L.forEach((l) => { l.its.sort((a, b) => a.x - b.x); l.t = unir(l.its); });
    return L.sort((a, b) => a.y - b.y || a.x0 - b.x0);
  }
  // casillas de dato: pares de líneas verticales con la misma altura (13–18 pt) y 40–130 pt de ancho
  function cajasDe(verticales) {
    const v = verticales.filter((s) => s.y2 - s.y1 >= 12 && s.y2 - s.y1 <= 19).sort((a, b) => a.y1 - b.y1 || a.x - b.x), out = [];
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length && v[j].y1 - v[i].y1 < 1; j++) {
      const d = v[j].x - v[i].x; if (d >= 40 && d <= 130 && Math.abs(v[j].y2 - v[i].y2) < 1) out.push({ x0: v[i].x, x1: v[j].x, y1: v[i].y1, y2: v[i].y2 });
    }
    return out;
  }

  // ---------- cabecera ----------
  function leerCabecera(pag) {
    const L = lineasDe(pag.items.filter((i) => i.y < 175), 14), r = { etapa: '', descripcion: '', material: '', verFab: '', edicion: '', estadoFechaPor: '', teorico: '' };
    const busca = (t) => L.find((l) => l.t.replace(/\s/g, '') === t.replace(/\s/g, ''));
    const lEt = busca('Etapa');
    if (lEt) { const v = L.find((l) => l.y > lEt.y + 5 && l.y < lEt.y + 30 && Math.abs((l.x0 + l.x1) / 2 - (lEt.x0 + lEt.x1) / 2) < 40); if (v) r.etapa = v.t; }
    const lCod = L.find((l) => /^C[oó]digo$/.test(l.t) && l.y > 100);
    const tit = L.filter((l) => l.h >= 10.5 && l.y < (lCod ? lCod.y : 130) - 10 && !/REGISTRO DE MANUFACTURA/i.test(l.t) && !/ de \d+$/.test(l.t) && l.x0 < 330);
    if (tit.length) r.descripcion = limpio(tit.map((l) => l.t).join(' '));
    if (lCod) {
      const vals = L.filter((l) => l.y > lCod.y + 8 && l.y < lCod.y + 40 && l.x1 < 432).sort((a, b) => a.x0 - b.x0);
      // 4 columnas: material, versión fab./alt., edición, estado / fecha / por (se reconocen por su forma)
      vals.forEach((v) => {
        const t = v.t;
        if (/\d{4}-\d\d-\d\d|\//.test(t) && !/^\d+\/\d+$/.test(t)) r.estadoFechaPor = limpio((r.estadoFechaPor ? r.estadoFechaPor + ' ' : '') + t);
        else if (/^\d+\s*\/\s*\d+$/.test(t)) r.verFab = t.replace(/\s+/g, '');
        else if (/^\d{6,}$/.test(t) && !r.material) r.material = t;
        else if (/^\d{1,4}$/.test(t) && !r.edicion) r.edicion = t;
      });
    }
    const lTe = L.find((l) => /^Te[oó]rico:?$/.test(l.t));
    if (lTe) { const v = L.find((l) => Math.abs(l.y - lTe.y) < 2 && l.x0 > lTe.x1 + 5); if (v) r.teorico = v.t; }
    const m = /^(.*?)\s*\/\s*(\S*)\s*\/\s*(.*)$/.exec(r.estadoFechaPor);
    r.estado = m ? m[1].trim() : r.estadoFechaPor; if (m) r.estadoFechaPor = `${m[1].trim()}/ ${m[2]} /${m[3].trim()}`;
    return r;
  }
  function finCabecera(pag) {
    const fin = pag.items.find((i) => /^Fin:?$/.test(i.s.trim()) && i.y < 260);
    return fin ? fin.y + 6 : 0;
  }

  // ---------- lector principal ----------
  function leerMaster(paginas, cat, base, op = {}) {
    if (!paginas.length) throw new Error('el PDF no tiene páginas');
    const cab = leerCabecera(paginas[0]);
    if (!cab.descripcion && !cab.etapa) throw new Error('el PDF no parece la impresión de un master del portal RMD (no tiene la cabecera «REGISTRO DE MANUFACTURA»)');
    // filas: todas las líneas de todas las páginas, sin la cabecera
    const filas = [];
    paginas.forEach((pg, ip) => {
      const y0 = finCabecera(pg), its = pg.items.filter((i) => i.y > y0);
      const vinetas = its.filter((i) => i.s.trim() === '-' && i.x < 40 && i.h >= 11);
      const resto = its.filter((i) => !vinetas.includes(i));
      lineasDe(resto).forEach((l) => filas.push({ ...l, pag: ip, cajas: null }));
      vinetas.forEach((v) => filas.push({ y: v.y - 2.8, x0: v.x, x1: v.x + v.w, h: 9, its: [v], t: '-', vineta: true, pag: ip }));
      pg._cajas = cajasDe(pg.verticales || []);
    });
    filas.sort((a, b) => a.pag - b.pag || a.y - b.y || a.x0 - b.x0);
    const cajaEn = (f, xMin, xMax) => (paginas[f.pag]._cajas || []).some((c) => c.y1 >= f.y - 11.5 && c.y1 <= f.y - 4 && c.x0 >= xMin && c.x0 <= xMax);

    // nombres de estructura y etiqueta → ids conocidos (catálogo base) o nuevos
    const estrBase = new Map(), etqBase = new Map();
    Object.entries(base.estrExcel || {}).forEach(([n, id]) => { const k = claveNombre(n); if (!estrBase.has(k) || (cat.estructuras.get(n) || 0) > (estrBase.get(k).n || 0)) estrBase.set(k, { id, n: cat.estructuras.get(n) || 0, nombre: n }); });
    (base.estr || []).forEach(([id, n]) => { const k = claveNombre(n); if (!estrBase.has(k)) estrBase.set(k, { id, n: 0, nombre: n }); });
    (base.etq || []).forEach(([id, n]) => { etqBase.set(claveNombre(n), id); });
    Object.entries(base.etqExcel || {}).forEach(([n, id]) => { const k = claveNombre(n); if (!etqBase.has(k)) etqBase.set(k, id); });
    const idEstr = (nombre) => { const k = claveNombre(nombre), b = estrBase.get(k); if (b) return b.id; const id = 'x-estr-' + k.replace(/ /g, '-').toLowerCase(); estrBase.set(k, { id, n: 0, nombre }); return id; };
    const idEtq = (nombre) => { const k = claveNombre(nombre); if (!k) return null; if (etqBase.has(k)) return etqBase.get(k); const id = 'x-etq-' + k.replace(/ /g, '-').toLowerCase(); etqBase.set(k, id); return id; };

    // búsqueda en el catálogo
    const stats = { pasos: 0, pm: 0, insumosEnPasos: 0, conCodigo: 0, sinCodigo: [], equiposSinId: [], cajas: 0 };
    function buscar(texto, ctx, pista) {
      const cands = cat.porClave.get(claveSuelta(texto)); if (!cands || !cands.length) return null;
      const ke = claveNombre(ctx.estr), kt = claveNombre(ctx.etq || ''), ex = claveExacta(texto);
      let mejor = null, pm = -1;
      cands.forEach((f) => {
        let p = 0;
        if (f.kE === ke) p += 8;
        if (kt && f.kT === kt) p += 4; else if (!kt && !f.kT) p += 2;
        if (claveExacta(f.texto) === ex) p += 2;
        if (pista && pista(f.tipo)) p += 1;
        if (p > pm || (p === pm && +f.codigo > +mejor.codigo)) { pm = p; mejor = f; }
      });
      return mejor;
    }
    const pistaPaso = (rpor, vb, caja) => (t) => (rpor && vb ? t === 441 : rpor ? t === 439 || t === 441 : vb ? t === 440 : caja ? CON_CAJA.has(t) || t === 447 : t === 446 || t === 432);
    const pistaPm = (caja) => (t) => (caja ? CON_CAJA.has(t) : !CON_CAJA.has(t));

    // estructura actual
    const estructuras = []; let E = null, T = null, P = null, numVisto = false, modo = '', rptaValidacion = '';
    const nuevaEstructura = (nombre, numerada) => {
      E = { id: nuevoId(), estructuraId: idEstr(nombre), nombre: limpio(nombre), tipo: 484, numeracion: numerada, verificadoPor: false, orden: estructuras.length + 1, etiquetas: [], pasos: [], equipos: [], utensilios: [], insumos: [], espec: [], _filasPaso: [] };
      estructuras.push(E); T = null; P = null; modo = '';
    };
    const cerrarPaso = () => { P = null; };
    const nuevoPaso = (f) => {
      P = { filas: [], rpor: false, vb: false, y: f.y, pag: f.pag };
      (T ? T._pasos : E._filasPaso).push(P);
    };
    let grupoEsp = '', filaEq = null, filaIns = null, filaEsp = null;

    for (let i = 0; i < filas.length; i++) {
      const f = filas[i], t = f.t;
      if (!t) continue;
      // validación del proceso
      const mv = /PROCESO VALIDADO REPORTE DE VALIDACI[OÓ]N N[°º]\s*(.*)$/i.exec(t); if (mv) { rptaValidacion = mv[1].trim(); continue; }
      // título de estructura: «1.-EQUIPOS …» (o sin número antes de la primera numerada: PRECAUCIONES, NOTAS …)
      const mt = /^(\d+)\.-\s*(.+)$/.exec(t);
      if (!f.vineta && f.h >= 9.7 && f.h < 10.6 && f.x0 < 34 && !/^VERIFICADO POR/i.test(t) && (mt || (!numVisto && /^[A-ZÁÉÍÓÚÑ0-9 /:.,()-]+$/.test(t) && t.length > 3))) {
        if (mt) numVisto = true;
        nuevaEstructura(mt ? mt[2] : t, !!mt); continue;
      }
      if (!E) continue;
      // título de etiqueta: «4.1.-DOCUMENTACION» (más grande, sin negrita)
      const mq = /^(\d+\.\d+)\.-\s*(.+)$/.exec(t);
      if (mq && f.h >= 10.6 && f.x0 < 40) {
        modo = 'proc'; E.tipo = 487;
        const conf = filas.some((g) => g.pag === f.pag && Math.abs(g.y - f.y) < 3 && /Colocar check en caso de conformidad/i.test(g.t));
        T = { id: nuevoId(), etiquetaId: idEtq(mq[2]), nombre: limpio(mq[2]), orden: E.etiquetas.length + 1, conforme: conf, procesoMenor: false, pasos: [], _pasos: [] };
        E.etiquetas.push(T); P = null; continue;
      }
      if (/^\(Colocar check/i.test(t)) { if (/seg[uú]n corresponda/i.test(t)) { modo = 'firmas'; E.tipo = 489; } continue; }
      if (/^VERIFICADO POR:?$/i.test(t) && (f.h >= 9.7 || f.x0 < 40)) { if (!T) E.verificadoPor = true; cerrarPaso(); filaEq = filaIns = filaEsp = null; continue; }
      if (/^FECHA:?$/i.test(t) && filas.some((g) => g.pag === f.pag && Math.abs(g.y - f.y) < 2 && /^VERIFICADO POR/i.test(g.t))) continue;
      // cabeceras de tabla (se repiten en cada página)
      if (f.h >= 9.7 && f.h < 10.6 && !f.vineta) {
        const misma = filas.filter((g) => g.pag === f.pag && Math.abs(g.y - f.y) < 2).map((g) => g.t).join(' | ');
        if (/^Descripci[oó]n$/.test(t) || /C[oó]digo de/.test(misma) || /Cant\. Recib/.test(misma)) {
          if (/Cant\. Recib|Cantidad/.test(misma)) { modo = 'ins'; E.tipo = 488; } else { modo = 'eq'; E.tipo = 485; }
          continue;
        }
        if (/^ENSAYO$/.test(t) || /^ESPECIFICACIONES$/.test(t) || /^RESULTADOS$/.test(t)) { modo = 'esp'; E.tipo = 486; continue; }
        if (/Nombre y Apellidos|^Firma$|^R$|^S$/.test(t)) { modo = 'firmas'; E.tipo = 489; continue; }
        if (/^(C[oó]digo|referencia|\(CP\)|UM|Bulto|Cantidad|Cant\. Recib\.)$/.test(t)) continue;
        if (modo === 'esp' && f.x0 < 40) { grupoEsp = t; filaEsp = null; continue; }
      }
      if (modo === 'firmas') continue;
      if (/^R: Realizado por/i.test(t)) continue;

      // tablas
      if (modo === 'eq') {
        const fila = filas.filter((g) => g.pag === f.pag && Math.abs(g.y - f.y) < 2);
        const its = fila.flatMap((g) => g.its); fila.forEach((g) => { g.t = ''; });
        const desc = unir(its.filter((x) => x.x < 335)), cod = unir(its.filter((x) => x.x >= 335 && x.x < 430)), ref = unir(its.filter((x) => x.x >= 430));
        if (cod) { filaEq = { desc, codigo: cod, ref, y: f.y, pag: f.pag }; (E._eq = E._eq || []).push(filaEq); }
        else if (filaEq && filaEq.pag === f.pag && f.y - filaEq.y < 13) { filaEq.desc = limpio(filaEq.desc + ' ' + desc); filaEq.y = f.y; }
        continue;
      }
      if (modo === 'ins') {
        const fila = filas.filter((g) => g.pag === f.pag && Math.abs(g.y - f.y) < 2);
        const its = fila.flatMap((g) => g.its); fila.forEach((g) => { g.t = ''; });
        const desc = unir(its.filter((x) => x.x < 215)), comp = unir(its.filter((x) => x.x >= 215 && x.x < 295)), cu = unir(its.filter((x) => x.x >= 295 && x.x < 400));
        if (comp) { const m = /^([\d.,]+)\s*(.*)$/.exec(cu); filaIns = { desc, comp, cant: m ? m[1] : cu, um: m ? m[2] : '', y: f.y, pag: f.pag }; (E._ins = E._ins || []).push(filaIns); }
        else if (filaIns && filaIns.pag === f.pag && f.y - filaIns.y < 13) { filaIns.desc = limpio(filaIns.desc + ' ' + desc); filaIns.y = f.y; }
        else if (desc) { filaIns = { desc, comp: '', cant: null, um: '', nota: true, y: f.y, pag: f.pag }; (E._ins = E._ins || []).push(filaIns); }
        continue;
      }
      if (modo === 'esp') {
        const fila = filas.filter((g) => g.pag === f.pag && Math.abs(g.y - f.y) < 2);
        const its = fila.flatMap((g) => g.its); fila.forEach((g) => { g.t = ''; });
        const ens = unir(its.filter((x) => x.x < 200)), esp = unir(its.filter((x) => x.x >= 200 && x.x < 435));
        if (ens && (!filaEsp || filaEsp.pag !== f.pag || f.y - filaEsp.y >= 13)) { filaEsp = { ensayo: ens, especificacion: esp, grupo: grupoEsp, y: f.y, pag: f.pag }; E.espec.push(filaEsp); }
        else if (filaEsp) { if (ens) filaEsp.ensayo = limpio(filaEsp.ensayo + ' ' + ens); if (esp) filaEsp.especificacion = limpio(filaEsp.especificacion + ' ' + esp); filaEsp.y = f.y; }
        continue;
      }

      // pasos numerados del procedimiento
      if (/^\d+(\.\d+)+\.-$/.test(t) && f.x0 < 60) { modo = 'proc'; if (E.tipo === 484) E.tipo = 487; nuevoPaso(f); continue; }
      // viñeta de un cuadro (Precauciones, Notas, Condiciones)
      if (f.vineta) { modo = 'cuadro'; nuevoPaso(f); continue; }
      // casillas «Realizado Por» / «VB»
      if (f.h < 8.6 && f.x0 > 420 && P) { if (/Realizado Por/i.test(t)) P.rpor = true; if (/(^|\s)VB$/.test(t)) P.vb = true; continue; }
      if (!P) continue;
      if (f.x0 < 40) continue;
      // texto del paso: agrupa por renglón (texto a la izquierda, cantidad del insumo a la derecha)
      const ult = P.filas[P.filas.length - 1];
      if (ult && ult.pag === f.pag && Math.abs(ult.y - f.y) < 2) { if (f.x0 >= 290 && f.x0 < 430 && !ult.der && /^[\d.,]+(\s+\S+)?$/.test(t)) ult.der = t; else ult.t = limpio(ult.t + ' ' + t); continue; }
      P.filas.push({ t, y: f.y, pag: f.pag, x0: f.x0, f });
    }

    // ---------- pasos: separar texto del paso, procesos menores e insumos con el catálogo ----------
    const RX_INS = /^(.+?)\s*\((\d{6,12})\)$/;
    function armarPasos(lista, e, t) {
      const ctx = { estr: e.nombre, etq: t ? t.nombre : '' }, out = [];
      lista.forEach((pp) => {
        const F = pp.filas; if (!F.length) return;
        F.forEach((r, k) => { r.corte = k === 0 || r.pag !== F[k - 1].pag || r.y - F[k - 1].y > 13; r.ins = RX_INS.exec(r.t) && r.der && /^[\d.,]+(\s+\S+)?$/.test(r.der) ? RX_INS.exec(r.t) : null; });
        const piezas = []; let i = 0;
        while (i < F.length) {
          if (F[i].ins) { piezas.push({ ins: F[i] }); i++; continue; }
          let j = i + 1; while (j < F.length && !F[j].corte && !F[j].ins) j++;          // bloque natural [i, j)
          const texto = (a, b) => F.slice(a, b).map((r) => r.t).join(' ');
          const prueba = (b) => buscar(texto(i, b), ctx);
          let fin = j, hallado = prueba(j);
          if (!hallado) { for (let b = j - 1; b > i; b--) { const h = prueba(b); if (h) { fin = b; hallado = h; break; } } }
          if (!hallado) { for (let b = j + 1; b <= Math.min(F.length, j + 8); b++) { if (F[b - 1].ins) break; const h = prueba(b); if (h) { fin = b; hallado = h; break; } } }
          piezas.push({ a: i, b: fin, texto: texto(i, fin), filas: F.slice(i, fin) });
          i = fin;
        }
        if (!piezas.length) return;
        // la primera pieza es el texto del paso
        let p0 = piezas[0];
        if (p0.ins) p0 = { texto: p0.ins.t, filas: [p0.ins] };
        const sinCabecera = !pp.rpor && !pp.vb;
        const caja0 = sinCabecera && p0.filas.some((r) => cajaEn(r.f || r, 300, 480));   // casilla de dato del paso (no las de «Realizado Por» / «VB»)
        const h0 = buscar(p0.texto, ctx, pistaPaso(pp.rpor, pp.vb, caja0));
        const paso = { id: nuevoId(), pasoId: null, codigo: h0 ? h0.codigo : null, texto: h0 ? h0.texto : limpio(p0.texto), orden: out.length + 1, tipo: h0 ? h0.tipo : (pp.rpor && pp.vb ? 441 : pp.rpor ? 439 : pp.vb ? 440 : 446),
          vi: null, vf: null, margen: null, depende: null, rpor: !!pp.rpor, vb: !!pp.vb, edit: !!caja0, formato: false, colorHex: null, etqCat: h0 && h0.etq ? idEtq(h0.etq) : null, pm: [] };
        if (caja0) stats.cajas++;
        stats.pasos++; if (h0) stats.conCodigo++; else stats.sinCodigo.push({ donde: `${e.nombre}${t ? ' › ' + t.nombre : ''}`, clase: 'paso', texto: paso.texto });
        piezas.slice(1).forEach((pz) => {
          if (pz.ins) {
            const m = pz.ins.ins, mc = /^([\d.,]+)\s*(.*)$/.exec(pz.ins.der || '');
            paso.pm.push({ id: nuevoId(), pasoId: null, codigo: null, texto: limpio(m[1]), orden: paso.pm.length + 1, tipo: 438, vi: null, vf: null, margen: null, insumo: true, comp: m[2], mat: limpio(m[1]), cant: mc ? mc[1] : null, um: mc ? mc[2] : null, insId: null, edit: false, tab: false, formato: false, colorHex: null, etqCat: null });
            stats.insumosEnPasos++; return;
          }
          const caja = pz.filas.some((r) => cajaEn(r.f || r, 300, 430));
          const h = buscar(pz.texto, ctx, pistaPm(caja));
          paso.pm.push({ id: nuevoId(), pasoId: null, codigo: h ? h.codigo : null, texto: h ? h.texto : limpio(pz.texto), orden: paso.pm.length + 1, tipo: h ? h.tipo : (caja ? 433 : 446), vi: null, vf: null, margen: null, insumo: false, comp: null, mat: '', cant: null, um: null, edit: caja, tab: false, formato: false, colorHex: null, etqCat: h && h.etq ? idEtq(h.etq) : null });
          if (caja) stats.cajas++;
          stats.pm++; if (h) stats.conCodigo++; else stats.sinCodigo.push({ donde: `${e.nombre}${t ? ' › ' + t.nombre : ''} › paso ${paso.orden}`, clase: 'proceso menor', texto: limpio(pz.texto) });
        });
        out.push(paso);
      });
      return out;
    }

    // ---------- equipos, utensilios, insumos y especificaciones ----------
    const eqPorCodigo = new Map(); filasBase(base.equipos).forEach((l) => { const k = claveSuelta(l[1]); if (!eqPorCodigo.has(k)) eqPorCodigo.set(k, []); eqPorCodigo.get(k).push(l); });
    const utPorCodigo = new Map(); filasBase(base.utensilios).forEach((l) => { const k = claveSuelta(l[1]); if (!utPorCodigo.has(k)) utPorCodigo.set(k, l); });
    const agPorNombre = new Map(); (base.agrupadores || []).forEach(([id, d]) => agPorNombre.set(claveSuelta(d), id));
    const material = cab.material, verid = (cab.verFab || '').split('/')[0].trim();

    estructuras.forEach((e) => {
      e.pasos = armarPasos(e._filasPaso, e, null);
      e.etiquetas.forEach((t) => { t.pasos = armarPasos(t._pasos, e, t); delete t._pasos; });
      if (e.tipo === 487 && !e.etiquetas.length && e.pasos.length) e.tipo = 484;
      (e._eq || []).forEach((r) => {
        const ref = r.ref === '-' ? '' : r.ref;
        if (/^AGRUPADOR$/i.test(r.codigo)) { const id = agPorNombre.get(claveSuelta(r.desc)) || null; if (!id) stats.equiposSinId.push(r.desc); e.utensilios.push({ id: nuevoId(), utensilioId: null, agrupadorId: id, codigo: '', desc: r.desc, orden: e.equipos.length + e.utensilios.length + 1 }); return; }
        const eqs = eqPorCodigo.get(claveSuelta(r.codigo)) || [];
        const eq = eqs.find((l) => claveSuelta(l[2]) === claveSuelta(ref) && claveSuelta(l[3]) === claveSuelta(r.desc)) || eqs.find((l) => claveSuelta(l[2]) === claveSuelta(ref)) || eqs[0];
        if (eq || /^\d+$/.test(r.codigo)) { if (!eq) stats.equiposSinId.push(r.codigo + ' ' + r.desc); e.equipos.push({ id: nuevoId(), equipoId: eq ? eq[0] : null, codigo: r.codigo, ref: ref || (eq ? eq[2] : ''), desc: r.desc, orden: e.equipos.length + e.utensilios.length + 1 }); return; }
        const ut = utPorCodigo.get(claveSuelta(r.codigo)); if (!ut) stats.equiposSinId.push(r.codigo + ' ' + r.desc);
        e.utensilios.push({ id: nuevoId(), utensilioId: ut ? ut[0] : null, agrupadorId: null, codigo: ut ? ut[1] : r.codigo, desc: r.desc, orden: e.equipos.length + e.utensilios.length + 1 });
      });
      (e._ins || []).forEach((r) => e.insumos.push({ id: nuevoId(), receta: material ? `${material} / ${verid}` : '', matnr: material, comp: r.comp, desc: r.desc, txtadic: '', aiPrio: '00', cant: r.cant, um: r.um }));
      e.espec = e.espec.map((s, k) => ({ id: nuevoId(), ensayo: s.ensayo, padre: '', grupoId: null, grupo: s.grupo, especificacion: s.especificacion, vi: null, vf: null, orden: k + 1 }));
      delete e._filasPaso; delete e._eq; delete e._ins;
    });

    const rmd = { mdId: null, codigo: String(op.codigo || '').trim(), version: /^\d+$/.test(cab.edicion) ? +cab.edicion : cab.edicion, descripcion: cab.descripcion, etapa: cab.etapa, area: '', planta: op.planta || '', estado: cab.estado,
      observacion: '', rptaValidacion, areas: base.areas || [], principal: String(op.codigo || '').trim(), estadoFechaPor: cab.estadoFechaPor, logo: base.logo || null,
      receta: { matnr: material, verid, nombre: cab.descripcion, hojaRuta: '', puesto: '' }, teorico: cab.teorico, origen: 'pdf' };
    return { rmd, arbol: { estructuras }, cabecera: cab, stats };
  }

  // ---------- paquete (mismo formato que ppPaquete del userscript) ----------
  function armarPaquete(r, cat, base, PPN, extra = {}) {
    const arbol = r.arbol, ids = new Map(arbol.estructuras.map((e) => [e.estructuraId, e.nombre]));
    const estr = [], iE = new Map(), etq = [], iT = new Map();
    const idxE = (id, n) => { if (!iE.has(id)) { iE.set(id, estr.length); estr.push([id, n || '']); } return iE.get(id); };
    const nomT = new Map((base.etq || []).map(([id, n]) => [id, n]));
    const idxT = (id, n) => { if (!id) return ''; if (!iT.has(id)) { iT.set(id, etq.length); etq.push([id, n || nomT.get(id) || '']); } return iT.get(id); };
    arbol.estructuras.forEach((e) => { idxE(e.estructuraId, e.nombre); e.etiquetas.forEach((t) => idxT(t.etiquetaId, t.nombre)); });
    (base.etq || []).forEach(([id, n]) => idxT(id, n));
    // estructura y etiqueta de cada fila del Excel → ids
    const kEstr = new Map(arbol.estructuras.map((e) => [claveNombre(e.nombre), e.estructuraId]));
    const etqId = new Map((base.etq || []).map(([id, n]) => [claveNombre(n), id])); Object.entries(base.etqExcel || {}).forEach(([n, id]) => { if (!etqId.has(claveNombre(n))) etqId.set(claveNombre(n), id); });
    const lineas = [];
    cat.filas.forEach((f) => {
      let id = (base.estrExcel || {})[f.estr]; if (!id || !ids.has(id)) id = kEstr.get(f.kE); if (!id || !ids.has(id)) return;
      let tId = ''; if (f.etq) { const k = f.kT; let x = etqId.get(k); if (!x) { x = 'x-etq-' + k.replace(/ /g, '-').toLowerCase(); etqId.set(k, x); } tId = idxT(x, limpio(f.etq)); }
      lineas.push([f.codigo, iE.get(id), tId, f.tipo == null ? '' : f.tipo, f.texto].join('\t'));
    });
    const lin = (l) => (typeof l === 'string' ? l : l.map((x) => (Array.isArray(x) ? x.join('\t') : x)).join('\n'));
    return { formato: 1, tipo: 'plantilla-rmd', generado: new Date().toISOString(), por: extra.por || '', script: extra.script || 'plantilla autonoma', rmd: r.rmd, tipos: base.tipos || {}, arbol, huella: PPN.huella(arbol),
      catalogo: { estr, etq, pasos: lineas.join('\n'), equipos: lin(base.equipos || []), utensilios: lin(base.utensilios || []), agrupadores: base.agrupadores || [] } };
  }

  return { leerCatalogo, leerPdf, leerMaster, armarPaquete, lineasDe, limpio, claveSuelta, claveNombre, sinTildes };
});
