// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.1.0
// @description  Enter = "Ir", diálogos anchos, columnas ordenadas (Depende siempre completo), columnas ocultas, filtro local de pasos, avisos de cambios sin guardar y otros ajustes de lectura en Configuración RMD.
// @match        https://*.hana.ondemand.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  // Solo actúa dentro del iframe de la app UI5 (ui5appruntime.html). Solo cambia la vista;
  // lo único que "pulsa" son botones de búsqueda (Ir), el OK de mensajes de éxito y, si el usuario
  // lo pide con Ctrl+S, el botón Guardar del diálogo abierto.
  if (!/ui5appruntime/.test(location.pathname)) return;
  if (window.__rmdUiMejoras) return;
  window.__rmdUiMejoras = true;

  const CLAVE = 'rmdUiMejoras';
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
  const guardar = (o) => { try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } };
  const OPC = [
    ['activo', 'Mejoras activas'], ['enter', 'Enter = Ir'], ['ancho', 'Diálogos anchos'], ['columnas', 'Columnas ordenadas'],
    ['ocultar', 'Ocultar Estado Mov., Imagen, Formato'], ['grupos', 'Colores por grupo + tooltips'],
    ['depende', 'Depende: tooltip con el paso'], ['sintipo', 'Atenuar "Sin tipo de dato"'], ['filtro', 'Filtro local de pasos'],
    ['singuardar', 'Avisar cambios sin guardar + Ctrl+S'], ['exito', 'Cerrar solos los mensajes de éxito'],
    ['contraste', 'Más contraste / campos editables'], ['zebra', 'Filas alternas'],
  ];
  const opc = Object.assign(Object.fromEntries(OPC.map(([k]) => [k, true])), leer());
  const on = (k) => opc.activo && opc[k];

  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const NORM = (t) => norm(t).toUpperCase();
  const enDialogo = (el) => el.closest && el.closest('.sapMDialog:not(.sapMMessageDialog)');

  // ---- utilidades UI5 ---------------------------------------------------------------------------
  function pulsar(btn) {
    const id = btn.id.replace(/-inner$/, '');
    const ctl = window.sap && sap.ui && sap.ui.getCore && sap.ui.getCore().byId(id);
    if (ctl && ctl.firePress) ctl.firePress(); else btn.click();
  }
  function botonIr(desde) {
    const raiz = desde.closest('[role=dialog]') || document;
    return raiz.querySelector('[id$=btnGo]') ||
      [...raiz.querySelectorAll('button')].find((b) => b.offsetParent && norm(b.textContent) === 'Ir');
  }
  function botonPorTitulo(raiz, titulo) {
    return [...raiz.querySelectorAll('button')].find((b) => b.offsetParent && (b.title === titulo || norm(b.textContent) === titulo));
  }

  // ---- 1. Enter en un filtro = pulsar "Ir" -----------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && on('singuardar')) {           // Ctrl+S = Guardar
      const d = [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].filter((x) => x.offsetParent).pop();
      const g = d && botonPorTitulo(d, 'Guardar');
      if (g) { e.preventDefault(); e.stopPropagation(); pulsar(g); }
      return;
    }
    if (!on('enter') || e.key !== 'Enter' || e.isComposing) return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type === 'checkbox' || t.type === 'radio' || t.readOnly) return;
    if (t.getAttribute('aria-expanded') === 'true') return;                        // lista desplegada: Enter elige la opción
    if (t.closest('table') || t.classList.contains('rmd-filtro')) return;         // dentro de la tabla de pasos: no buscar
    const btn = botonIr(t);
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    t.dispatchEvent(new Event('change', { bubbles: true }));                       // que UI5 registre el texto
    setTimeout(() => pulsar(btn), 60);
  }, true);

  // ---- 2. Estilos --------------------------------------------------------------------------------
  const CSS = `
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog):not(.sapMPopover) {
    width: 98vw !important; max-width: 98vw !important; height: calc(100vh - 16px) !important; max-height: calc(100vh - 16px) !important;
    left: 1vw !important; top: 8px !important; box-sizing: border-box !important; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) .sapMDialogScroll { min-height: 0; }
  html.rmd-cols .sapMDialog:not(.sapMMessageDialog) table.sapMListTbl { table-layout: fixed; width: 100% !important; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) thead th { position: sticky; top: 0; z-index: 3; background: var(--rmd-th, #1f2229); }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB > td { padding-top: 7px; padding-bottom: 7px; vertical-align: middle; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:hover > td { background: rgba(80,160,255,.13) !important; }
  html.rmd-zebra .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:nth-child(odd) > td { background: rgba(255,255,255,.035); }
  html.rmd-ui .sapMDialog td .sapMText, html.rmd-ui .sapMDialog td .sapMLabel { white-space: normal; line-height: 1.35; }
  html.rmd-ui .sapMDialog input:focus { outline: 2px solid #3aa0ff !important; outline-offset: 0; }
  /* grupos de columnas: banda de color en la cabecera */
  html.rmd-grupos th[data-rmd-g="id"]   { box-shadow: inset 0 3px 0 #5b9bd5; }
  html.rmd-grupos th[data-rmd-g="tipo"] { box-shadow: inset 0 3px 0 #e0a030; }
  html.rmd-grupos th[data-rmd-g="lim"]  { box-shadow: inset 0 3px 0 #b07cd8; }
  html.rmd-grupos th[data-rmd-g="chk"]  { box-shadow: inset 0 3px 0 #4cb782; }
  html.rmd-grupos th[data-rmd-g="acc"]  { box-shadow: inset 0 3px 0 #8a8f98; }
  /* pasos "Sin tipo de dato": atenuados (no llevan predecesor) */
  html.rmd-sintipo tr.rmd-sintipo > td { opacity: .62; background: rgba(140,140,160,.08) !important; }
  html.rmd-sintipo tr.rmd-sintipo > td:hover { opacity: 1; }
  /* contraste y campos editables */
  html.rmd-contraste .sapMDialog .sapMInputBaseDisabled .sapMInputBaseInner, html.rmd-contraste .sapMDialog .sapMInputBaseDisabled { opacity: .78 !important; }
  html.rmd-contraste .sapMDialog .sapMInputBaseInner::placeholder { color: #9aa3b2 !important; opacity: 1; }
  html.rmd-contraste .sapMDialog .sapMInputBase:not(.sapMInputBaseDisabled):not(.sapMInputBaseReadonly) .sapMInputBaseInner {
    background: rgba(255,255,255,.07) !important; border-bottom: 1px solid #6c7a92 !important; }
  /* filtro local */
  #rmd-filtro-bar { display: flex; gap: 10px; align-items: center; padding: 6px 16px; font: 13px system-ui, sans-serif; color: #dfe3ea; }
  #rmd-filtro-bar input { flex: 0 1 360px; padding: 5px 8px; border-radius: 6px; border: 1px solid #56617a; background: #12151a; color: #fff; }
  #rmd-filtro-bar span { opacity: .8; }
  /* panel propio */
  #rmd-ui-panel { position: fixed; right: 10px; bottom: 10px; z-index: 99999; font: 12px system-ui, sans-serif;
    background: rgba(20,22,27,.94); color: #e8eaed; border: 1px solid #444; border-radius: 8px; padding: 4px 8px; max-height: 70vh; overflow: auto; }
  #rmd-ui-panel summary { cursor: pointer; list-style: none; }
  #rmd-ui-panel label { display: block; margin: 3px 0; cursor: pointer; white-space: nowrap; }
  `;
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
  const html = document.documentElement;
  function aplicarClases() {
    html.classList.toggle('rmd-ui', !!on('ancho'));
    html.classList.toggle('rmd-cols', !!on('columnas'));
    html.classList.toggle('rmd-zebra', !!on('zebra'));
    html.classList.toggle('rmd-grupos', !!on('grupos'));
    html.classList.toggle('rmd-sintipo', !!on('sintipo'));
    html.classList.toggle('rmd-contraste', !!on('contraste'));
  }

  // ---- 3. Tablas de pasos: columnas, ocultar, tooltips, predecesores ---------------------------
  const ANCHOS = {
    'ORDEN': 64, 'CÓDIGO': 84, 'CODIGO': 84, 'ITEMS': 64, 'REPITE': 72, 'NUM.': 64,
    'TIPO DATO': 160, 'CLAVE MODELO': 120, 'PUESTO TRABAJO': 130, 'VAL. INICIAL': 96, 'VAL. FINAL': 96, 'MARGEN': 84, 'DECIMAL': 82,
    'ESTADO CC': 60, 'PM OP': 56, 'GEN PP': 56, 'EDIT': 50, 'R. POR': 56, 'V.B.': 50, 'PROC. MEN.': 70, 'ESTADO': 74, 'ACC.': 200,
  };
  const OCULTAS = ['ESTADO MOV.', 'IMAGEN', 'FORMATO'];
  const GRUPO = {
    'ORDEN': 'id', 'DEPENDE': 'id', 'CÓDIGO': 'id', 'CODIGO': 'id', 'DESCRIPCIÓN': 'id', 'DESCRIPCION': 'id',
    'TIPO DATO': 'tipo', 'CLAVE MODELO': 'tipo', 'PUESTO TRABAJO': 'tipo',
    'VAL. INICIAL': 'lim', 'VAL. FINAL': 'lim', 'MARGEN': 'lim', 'DECIMAL': 'lim',
    'ESTADO CC': 'chk', 'ESTADO MOV.': 'chk', 'PM OP': 'chk', 'GEN PP': 'chk', 'EDIT': 'chk', 'R. POR': 'chk', 'V.B.': 'chk',
    'PROC. MEN.': 'acc', 'ESTADO': 'acc',
  };
  const TIP = {
    'ESTADO CC': 'Estado CC: el paso queda sujeto al estado de Control de Calidad',
    'PM OP': 'PM OP: proceso menor opcional', 'GEN PP': 'Gen PP: genera producto en proceso',
    'EDIT': 'Edit: el operario puede editar el valor', 'R. POR': 'R. Por: registra "Realizado por"',
    'V.B.': 'V.B.: requiere visto bueno del jefe o supervisor', 'DEPENDE': 'Depende: paso predecesor (código y orden)',
    'CLAVE MODELO': 'Clave Modelo: solo Setup Pre Proceso, Proceso y Setup Post Proceso',
    'PROC. MEN.': 'Procesos menores del paso', 'MARGEN': 'Margen de tolerancia', 'DECIMAL': 'Cantidad de decimales',
  };
  const lienzo = document.createElement('canvas').getContext('2d');

  const indice = (ths, nombre) => ths.findIndex((th) => NORM(th.textContent) === nombre);
  const filasPrincipales = (t) => [...t.querySelectorAll('tbody tr')].filter((r) => !/SubRow/.test(r.className));
  const celda = (tr, i) => tr.children[i];
  const inputDe = (td) => td && td.querySelector('input:not([type=checkbox])');

  function anchoTexto(el, texto) {
    const cs = getComputedStyle(el);
    lienzo.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return Math.ceil(lienzo.measureText(texto).width);
  }

  function ajustarTabla(tabla) {
    const ths = [...tabla.querySelectorAll('thead th')];
    if (ths.length < 6) return;
    const filas = filasPrincipales(tabla);
    // anchos y grupos
    ths.forEach((th) => {
      const n = NORM(th.textContent);
      if (on('grupos')) { if (GRUPO[n]) th.dataset.rmdG = GRUPO[n]; if (TIP[n]) th.title = TIP[n]; }
      else { delete th.dataset.rmdG; }
      if (!on('columnas')) return;
      if (/^DESCRIPCI/.test(n)) { th.style.setProperty('width', 'auto', 'important'); th.style.setProperty('min-width', '380px', 'important'); return; }
      const w = ANCHOS[n];
      if (w) { th.style.setProperty('width', w + 'px', 'important'); th.style.setProperty('min-width', w + 'px', 'important'); }
    });
    // Depende: ancho para ver siempre el valor completo (texto más largo + icono de ayuda)
    const iDep = indice(ths, 'DEPENDE');
    if (on('columnas') && iDep >= 0) {
      let max = anchoTexto(ths[iDep], 'Depende');
      filas.forEach((tr) => { const i = inputDe(celda(tr, iDep)); if (i && i.value) max = Math.max(max, anchoTexto(i, i.value)); });
      const w = Math.min(Math.max(max + 62, 130), 420);
      ths[iDep].style.setProperty('width', w + 'px', 'important'); ths[iDep].style.setProperty('min-width', w + 'px', 'important');
    }
    // columnas ocultas
    ths.forEach((th, i) => {
      const oculta = on('ocultar') && OCULTAS.includes(NORM(th.textContent));
      th.style.display = oculta ? 'none' : '';
      filas.forEach((tr) => { if (celda(tr, i)) celda(tr, i).style.display = oculta ? 'none' : ''; });
    });
    // "Sin tipo de dato" y tooltip del predecesor
    const iTipo = indice(ths, 'TIPO DATO'), iOrd = indice(ths, 'ORDEN'), iDes = ths.findIndex((th) => /^DESCRIPCI/.test(NORM(th.textContent)));
    const porOrden = {};
    filas.forEach((tr, k) => {
      const o = iOrd >= 0 ? (inputDe(celda(tr, iOrd)) || {}).value : '';
      porOrden[norm(o) || String(k + 1)] = norm(celda(tr, iDes) && celda(tr, iDes).textContent);
    });
    filas.forEach((tr) => {
      if (iTipo >= 0) { const i = inputDe(celda(tr, iTipo)); tr.classList.toggle('rmd-sintipo', !!(i && /^SIN TIPO/i.test(i.value))); }
      if (iDep >= 0 && on('depende')) {
        const i = inputDe(celda(tr, iDep)); if (!i) return;
        const m = /\((\d+)\)/.exec(i.value || '');
        i.title = m && porOrden[m[1]] ? `Depende del paso ${m[1]}: ${porOrden[m[1]]}` : (i.value ? 'Predecesor sin orden (colgante)' : 'Sin predecesor');
      }
    });
    if (on('filtro')) filtroLocal(tabla, filas, iDes, iOrd);
  }

  // ---- 4. Filtro local + contador ---------------------------------------------------------------
  function filtroLocal(tabla, filas, iDes, iOrd) {
    const d = enDialogo(tabla); if (!d || iDes < 0 || filas.length < 8) return;
    let barra = d.querySelector('#rmd-filtro-bar');
    if (!barra) {
      barra = document.createElement('div'); barra.id = 'rmd-filtro-bar';
      barra.innerHTML = '<input class="rmd-filtro" type="text" placeholder="Filtrar pasos por texto, código u orden…"><span></span>';
      const cont = tabla.closest('.sapMDialogScrollCont') || d;
      cont.parentNode.insertBefore(barra, cont);
      barra.querySelector('input').addEventListener('input', () => aplicarFiltro(d));
    }
    aplicarFiltro(d);
  }
  function aplicarFiltro(d) {
    const barra = d.querySelector('#rmd-filtro-bar'), tabla = d.querySelector('table.sapMListTbl'); if (!barra || !tabla) return;
    const q = NORM(barra.querySelector('input').value);
    let visibles = 0, total = 0;
    const todas = [...tabla.querySelectorAll('tbody tr')];
    todas.forEach((tr, k) => {
      if (/SubRow/.test(tr.className)) return;
      total++;
      const sub = /SubRow/.test((todas[k + 1] || {}).className || '') ? todas[k + 1] : null;
      const ok = !q || NORM(tr.textContent + ' ' + [...tr.querySelectorAll('input')].map((i) => i.value).join(' ')).includes(q);
      tr.style.display = ok ? '' : 'none'; if (sub) sub.style.display = ok ? '' : 'none';
      if (ok) visibles++;
    });
    barra.querySelector('span').textContent = q ? `${visibles} de ${total} pasos` : `${total} pasos`;
  }

  let pendiente = false;
  function ajustarTodo() { if (!opc.activo) return; document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) table.sapMListTbl').forEach(ajustarTabla); }
  new MutationObserver(() => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; ajustarTodo(); });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('change', () => setTimeout(ajustarTodo, 80), true);

  // ---- 5. Avisar cambios sin guardar ------------------------------------------------------------
  const sucio = new WeakSet();
  document.addEventListener('change', (e) => { const d = enDialogo(e.target); if (d && e.target.closest('table') && on('singuardar')) sucio.add(d); }, true);
  document.addEventListener('click', (e) => {
    if (!on('singuardar')) return;
    const b = e.target.closest && e.target.closest('button'); const d = b && enDialogo(b); if (!d) return;
    if (b.title === 'Guardar') { sucio.delete(d); return; }
    if (norm(b.textContent) === 'Cancelar' && sucio.has(d)) {
      if (!confirm('Hay cambios sin guardar en esta ventana.\n¿Descartarlos y cerrar?')) { e.preventDefault(); e.stopPropagation(); } else sucio.delete(d);
    }
  }, true);

  // ---- 6. Cerrar solos los mensajes de éxito ---------------------------------------------------
  // Solo mensajes cuyo título es "Éxito" y que tienen un único botón OK. Confirmaciones y advertencias no se tocan.
  const visto = new WeakSet();
  new MutationObserver(() => {
    if (!on('exito')) return;
    document.querySelectorAll('.sapMMessageDialog').forEach((m) => {
      if (visto.has(m) || !m.offsetParent) return;
      const titulo = norm((m.querySelector('h1,h2,.sapMTitle,header') || {}).textContent);
      const botones = [...m.querySelectorAll('button')].filter((b) => b.offsetParent);
      if (/^[ÉE]xito/i.test(titulo) && botones.length === 1 && norm(botones[0].textContent) === 'OK') {
        visto.add(m); setTimeout(() => pulsar(botones[0]), 900);
      }
    });
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 7. Foco automático en el primer filtro de los selectores --------------------------------
  new MutationObserver((muts) => {
    if (!opc.activo) return;
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof HTMLElement)) continue;
      const d = n.matches && n.matches('.sapMDialog') ? n : n.querySelector && n.querySelector('.sapMDialog');
      if (!d || d.classList.contains('sapMMessageDialog')) continue;
      setTimeout(() => {
        if (!botonIr(d)) return;
        const i = [...d.querySelectorAll('input[type=text]')].find((x) => x.offsetParent && !x.readOnly && !x.classList.contains('rmd-filtro'));
        if (i) i.focus();
      }, 350);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 8. Panel para activar/desactivar cada mejora --------------------------------------------
  function panel() {
    const p = document.createElement('details'); p.id = 'rmd-ui-panel';
    p.innerHTML = '<summary>UI+</summary>' + OPC.map(([k, t]) => `<label><input type="checkbox" data-k="${k}" ${opc[k] ? 'checked' : ''}> ${t}</label>`).join('') +
      '<div style="opacity:.7;margin-top:4px">Ctrl+S = Guardar</div>';
    p.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return;
      e.stopPropagation(); opc[k] = e.target.checked; guardar(opc); aplicarClases();
      document.querySelectorAll('.sapMDialog th, .sapMDialog td').forEach((c) => { if (c.style.display === 'none') c.style.display = ''; });
      ajustarTodo();
    });
    document.body.appendChild(p);
  }
  aplicarClases(); panel(); ajustarTodo();
})();
