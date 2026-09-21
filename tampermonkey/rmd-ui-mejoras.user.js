// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.4.2
// @description  Enter = "Ir", diálogos a medida (Pasos a pantalla completa; Estructura/Etiquetas/Procesos menores al alto que necesitan), columnas ordenadas, estado del RMD en la cabecera, alertas de casillas incoherentes con el tipo de dato, Puesto de Trabajo faltante parpadeando y más.
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
    ['activo', 'Mejoras activas'], ['enter', 'Enter = Ir'], ['ancho', 'Diálogos a medida'], ['columnas', 'Columnas ordenadas'],
    ['ocultar', 'Ocultar Estado Mov., Imagen, Formato'], ['grupos', 'Tooltips en las cabeceras'],
    ['depende', 'Depende: tooltip con el paso'], ['sintipo', '"Sin tipo de dato" en rojo y negrita'],
    ['puesto', 'Puesto de Trabajo faltante parpadea'], ['reglas', 'Alertas de casillas incoherentes'],
    ['estado', 'Estado del RMD en la cabecera'], ['pmtitulo', 'Título completo del paso menor'],
    ['filtro', 'Filtro local de pasos'], ['singuardar', 'Avisar cambios sin guardar + Ctrl+S'],
    ['exito', 'Cerrar solos los mensajes de éxito'], ['contraste', 'Más contraste / campos editables'], ['zebra', 'Filas alternas'],
  ];
  const opc = Object.assign(Object.fromEntries(OPC.map(([k]) => [k, true])), leer());
  const on = (k) => opc.activo && opc[k];

  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const NORM = (t) => norm(t).toUpperCase();
  const SIN_ACENTOS = (t) => NORM(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const setTxt = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const enDialogo = (el) => el.closest && el.closest('.sapMDialog:not(.sapMMessageDialog)');
  const dialogos = () => [...document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog)')].filter((d) => d.getClientRects().length);

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

  // ---- 1. Enter en un filtro = pulsar "Ir"; Ctrl+S = Guardar -----------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && on('singuardar')) {
      const d = dialogos().pop();
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
    t.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => pulsar(btn), 60);
  }, true);

  // ---- 2. Estilos --------------------------------------------------------------------------------
  const CSS = `
  /* Todas las ventanas emergentes: centradas y con el pie (Cancelar/Cerrar) siempre visible */
  html.rmd-ui .sapMDialog:not(.sapMPopover) { position: fixed !important; box-sizing: border-box !important; margin: 0 !important; display: flex !important; flex-direction: column !important; }
  html.rmd-ui .sapMDialog:not(.sapMPopover) > section { flex: 1 1 auto !important; min-height: 0 !important; overflow: auto !important; }
  html.rmd-ui .sapMDialog:not(.sapMPopover) > footer, html.rmd-ui .sapMDialog:not(.sapMPopover) > header { flex: 0 0 auto !important; }
  /* Pasos: casi pantalla completa (muchas filas) */
  html.rmd-ui .sapMDialog.rmd-pasos {
    width: 98vw !important; max-width: 98vw !important; height: calc(100vh - 16px) !important; max-height: calc(100vh - 16px) !important;
    left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
  /* Estructura, Etiquetas, Procesos menores, selectores: solo el alto que necesitan, centrados */
  html.rmd-ui .sapMDialog.rmd-medio {
    width: min(1120px, 96vw) !important; max-width: 96vw !important; height: auto !important; max-height: calc(100vh - 24px) !important;
    left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
  html.rmd-ui .sapMDialog.rmd-medio.rmd-ancho { width: min(1560px, 97vw) !important; }
  /* Mensajes (confirmación, advertencia, éxito): también centrados */
  html.rmd-ui .sapMDialog.sapMMessageDialog { left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; max-height: calc(100vh - 24px) !important; }
  html.rmd-cols .sapMDialog:not(.sapMMessageDialog) table.sapMListTbl { table-layout: fixed; width: 100% !important; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) thead th { position: sticky; top: var(--rmd-top, 0px); z-index: 3; background: var(--rmd-th, #1f2229); }
  html.rmd-ui .sapMDialog.rmd-sticky .sapMListHdr { position: sticky; top: var(--rmd-h1, 0px); z-index: 8; background: var(--rmd-th, #1f2229); }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB > td { padding-top: 7px; padding-bottom: 7px; vertical-align: middle; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:hover > td { background: rgba(80,160,255,.13) !important; }
  html.rmd-zebra .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:nth-child(odd) > td { background: rgba(255,255,255,.035); }
  html.rmd-ui .sapMDialog td .sapMText, html.rmd-ui .sapMDialog td .sapMLabel { white-space: normal; line-height: 1.35; }
  html.rmd-ui .sapMDialog input:focus { outline: 2px solid #3aa0ff !important; outline-offset: 0; }
  /* "Sin tipo de dato": rojo y negrita */
  html.rmd-sintipo td.rmd-td-sintipo input, html.rmd-sintipo td.rmd-td-sintipo .sapMSltLabel { color: #ff5c5c !important; font-weight: 800 !important; -webkit-text-fill-color: #ff5c5c !important; }
  /* contraste y campos editables */
  html.rmd-contraste .sapMDialog .sapMInputBaseDisabled .sapMInputBaseInner, html.rmd-contraste .sapMDialog .sapMInputBaseDisabled { opacity: .78 !important; }
  html.rmd-contraste .sapMDialog .sapMInputBaseInner::placeholder { color: #9aa3b2 !important; opacity: 1; }
  html.rmd-contraste .sapMDialog .sapMInputBase:not(.sapMInputBaseDisabled):not(.sapMInputBaseReadonly) .sapMInputBaseInner {
    background: rgba(255,255,255,.07) !important; border-bottom: 1px solid #6c7a92 !important; }
  /* Puesto de Trabajo sin asignar: resalta y parpadea */
  @keyframes rmdParpadeo { 0%,100% { box-shadow: 0 0 0 2px #ff3b3b; background: rgba(255,59,59,.28); } 50% { box-shadow: 0 0 0 2px rgba(255,59,59,0); background: transparent; } }
  html.rmd-puesto td.rmd-sin-puesto .sapMInputBase, html.rmd-puesto td.rmd-sin-puesto .sapMComboBoxBase { animation: rmdParpadeo 1s ease-in-out infinite; border-radius: 4px; }
  /* casillas incoherentes con el tipo de dato */
  html.rmd-reglas td.rmd-marcar    { outline: 2px dashed #ffb02e; outline-offset: -3px; background: rgba(255,176,46,.18) !important; }
  html.rmd-reglas td.rmd-desmarcar { outline: 2px solid #ff4d4d; outline-offset: -3px; background: rgba(255,77,77,.20) !important; }
  html.rmd-reglas td.rmd-falta     { outline: 2px solid #ff4d4d; outline-offset: -3px; }
  /* estado del RMD en la cabecera de cada ventana */
  .rmd-estado { display: inline-block; margin-left: 12px; padding: 2px 10px; border-radius: 999px; font: 700 12px system-ui, sans-serif; color: #fff; vertical-align: middle; letter-spacing: .3px; }
  .rmd-estado.ingresado { background: #2b7fd9; } .rmd-estado.autorizado { background: #2fa35a; }
  .rmd-estado.suspendido { background: #d8912b; } .rmd-estado.otro { background: #6b7280; }
  /* título del paso menor: hasta 2 líneas */
  .sapMDialog h2.rmd-pm-titulo { white-space: normal !important; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; max-width: 100%; }
  .sapMDialog .rmd-pm-cab { height: auto !important; min-height: 44px; padding-top: 4px; padding-bottom: 4px; }
  /* barra del filtro local y de alertas */
  #rmd-filtro-bar { position: sticky; top: 0; z-index: 9; background: var(--rmd-th, #1f2229); border-bottom: 1px solid rgba(255,255,255,.12); display: flex; gap: 10px; align-items: center; padding: 6px 16px; font: 13px system-ui, sans-serif; color: #dfe3ea; flex-wrap: wrap; }
  #rmd-filtro-bar input { flex: 0 1 360px; padding: 5px 8px; border-radius: 6px; border: 1px solid #56617a; background: #12151a; color: #fff; }
  #rmd-filtro-bar span { opacity: .85; }
  #rmd-filtro-bar button.rmd-alerta { border: 1px solid #ff4d4d; background: #3a1616; color: #ffb3b3; border-radius: 6px; padding: 4px 10px; cursor: pointer; font: inherit; }
  #rmd-filtro-bar button.rmd-alerta.ok { border-color: #2fa35a; background: #12301f; color: #9ce3b8; cursor: default; }
  #rmd-ui-panel { position: fixed; left: 10px; bottom: 10px; z-index: 99999; font: 12px system-ui, sans-serif;
    background: rgba(20,22,27,.94); color: #e8eaed; border: 1px solid #444; border-radius: 8px; padding: 4px 8px; max-height: 70vh; overflow: auto; }
  #rmd-ui-panel summary { cursor: pointer; list-style: none; }
  #rmd-ui-panel label { display: block; margin: 3px 0; cursor: pointer; white-space: nowrap; }
  `;
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
  const html = document.documentElement;
  function aplicarClases() {
    [['ancho', 'rmd-ui'], ['columnas', 'rmd-cols'], ['zebra', 'rmd-zebra'], ['sintipo', 'rmd-sintipo'],
      ['contraste', 'rmd-contraste'], ['puesto', 'rmd-puesto'], ['reglas', 'rmd-reglas']].forEach(([k, c]) => html.classList.toggle(c, !!on(k)));
  }

  // ---- 3. Reglas: tipo de dato -> casillas ------------------------------------------------------
  const CHK = ['EDIT', 'R. POR', 'V.B.', 'ESTADO CC'];
  const CON_EDIT = new Set(['FECHA Y HORA', 'FECHA', 'HORA', 'NUMEROS', 'RANGO', 'TEXTO', 'LOTE', 'FECHA VENCIMIENTO', 'FORMULA', 'ENTREGA', 'MUESTRACC', 'CANTIDAD', 'NOTIFICACION']);
  const NUMERICOS = new Set(['NUMEROS', 'RANGO', 'FORMULA', 'ENTREGA', 'MUESTRACC']);
  const CLAVES = ['SETUP PRE PROCESO', 'PROCESO', 'SETUP POST PROCESO'];
  // devuelve { casilla: true|false } = estado que debe tener; solo las casillas que la regla fija
  function reglaCasillas(tipo, esPM) {
    const t = SIN_ACENTOS(tipo);
    if (!t) return null;
    // Verificación Check: en pasos mayores (precauciones/notas) sin casillas; en procesos menores lleva Edit
    if (t === 'VERIFICACION CHECK') return esPM ? { 'EDIT': true } : { 'EDIT': false, 'R. POR': false, 'V.B.': false };
    if (t === 'REALIZADO POR') return { 'R. POR': true, 'V.B.': false, 'EDIT': false };
    if (t === 'REALIZADO POR Y VISTO BUENO') return { 'R. POR': true, 'V.B.': true, 'EDIT': false };
    if (t === 'VISTO BUENO') return { 'V.B.': true, 'R. POR': false, 'EDIT': false };
    if (t === 'SIN TIPO DE DATO') return { 'EDIT': false, 'R. POR': false, 'V.B.': false, 'ESTADO CC': false };
    if (t === 'MULTIPLE CHECK') return { 'EDIT': false };
    if (t === 'MUESTRACC') return { 'EDIT': true, 'ESTADO CC': true };
    if (CON_EDIT.has(t)) return { 'EDIT': true };
    return null;
  }
  const NOMBRE_CASILLA = { 'EDIT': 'Edit', 'R. POR': 'R. Por', 'V.B.': 'V.B.', 'ESTADO CC': 'Estado CC' };

  // ---- 4. Tablas: columnas, ocultar, tooltips, predecesores, reglas ------------------------------
  const ANCHOS = {
    'ORDEN': 64, 'CÓDIGO': 84, 'CODIGO': 84, 'ITEMS': 70, 'REPITE': 120, 'NUM.': 80,
    'TIPO DATO': 160, 'CLAVE MODELO': 120, 'PUESTO TRABAJO': 130, 'VAL. INICIAL': 96, 'VAL. FINAL': 96, 'MARGEN': 84, 'DECIMAL': 82, 'DECIM.': 82,
    'ESTADO CC': 60, 'PM OP': 56, 'GEN PP': 56, 'EDIT': 50, 'R. POR': 56, 'V.B.': 50, 'PROC. MEN.': 70, 'ESTADO': 80, 'ACC.': 150,
    'CONFORME': 110, 'PROCESO MENOR': 130, 'ACCIONES': 110, 'CANTIDAD INSUMOS': 150, 'UM': 64, 'TAB': 56,
  };
  const OCULTAS = ['ESTADO MOV.', 'IMAGEN', 'FORMATO'];
  const TIP = {
    'ESTADO CC': 'Estado CC: el paso queda sujeto al estado de Control de Calidad',
    'PM OP': 'PM OP: proceso menor opcional', 'GEN PP': 'Gen PP: genera producto en proceso',
    'EDIT': 'Edit: el operario puede editar el valor', 'R. POR': 'R. Por: registra "Realizado por"',
    'V.B.': 'V.B.: requiere visto bueno del jefe o supervisor', 'DEPENDE': 'Depende: paso predecesor (código y orden)',
    'CLAVE MODELO': 'Clave Modelo: solo Setup Pre Proceso, Proceso y Setup Post Proceso',
    'PROC. MEN.': 'Procesos menores del paso', 'MARGEN': 'Margen de tolerancia', 'DECIMAL': 'Cantidad de decimales',
  };
  const lienzo = document.createElement('canvas').getContext('2d');
  const filasPrincipales = (t) => [...t.querySelectorAll('tbody tr')].filter((r) => !/SubRow/.test(r.className));
  const celda = (tr, i) => tr.children[i];
  const inputDe = (td) => td && td.querySelector('input:not([type=checkbox])');
  const marcada = (td) => { const c = td && td.querySelector('[role=checkbox]'); return !!c && c.getAttribute('aria-checked') === 'true'; };
  const deshabilitado = (i) => !i || i.disabled || i.readOnly || !!i.closest('.sapMInputBaseDisabled') || i.getAttribute('aria-disabled') === 'true';
  function anchoTexto(el, texto) {
    const cs = getComputedStyle(el);
    lienzo.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return Math.ceil(lienzo.measureText(texto).width);
  }
  function limpiarMarcas(td) { td.classList.remove('rmd-marcar', 'rmd-desmarcar', 'rmd-falta'); td.removeAttribute('data-rmd-aviso'); }

  function ajustarTabla(tabla) {
    const d = enDialogo(tabla); if (!d) return;
    const ths = [...tabla.querySelectorAll('thead th')];
    if (ths.length < 5) return;
    const nombres = ths.map((th) => NORM(th.textContent));
    const esPasos = nombres.includes('TIPO DATO') && nombres.includes('DEPENDE');   // Fabricación, Notas, Rendimiento…
    const esPM = nombres.includes('CANTIDAD INSUMOS');
    const filas = filasPrincipales(tabla);

    // tamaño del diálogo
    const grande = esPasos && filas.length > 12;                      // muchas filas: casi pantalla completa; pocas: solo el alto que necesitan
    d.classList.toggle('rmd-pasos', grande);
    d.classList.toggle('rmd-medio', !grande);
    d.classList.toggle('rmd-ancho', !grande && (esPM || ths.length > 12));
    d.classList.toggle('rmd-sticky', esPasos || esPM);

    // anchos, grupos y tooltips
    ths.forEach((th, i) => {
      const n = nombres[i];
      if (on('grupos') && TIP[n]) th.title = TIP[n];
      if (!on('columnas')) return;
      if (/^DESCRIPCI/.test(n)) { th.style.setProperty('width', 'auto', 'important'); th.style.setProperty('min-width', (grande && innerWidth >= 1600 ? 380 : 240) + 'px', 'important'); return; }
      const w = ANCHOS[n];
      if (w) { th.style.setProperty('width', w + 'px', 'important'); th.style.setProperty('min-width', w + 'px', 'important'); }
    });
    // Depende: ancho para ver siempre el valor completo
    const iDep = nombres.indexOf('DEPENDE');
    if (on('columnas') && iDep >= 0) {
      let max = anchoTexto(ths[iDep], 'Depende');
      filas.forEach((tr) => { const i = inputDe(celda(tr, iDep)); if (i && i.value) max = Math.max(max, anchoTexto(i, i.value)); });
      const w = Math.min(Math.max(max + 62, 130), 420);
      ths[iDep].style.setProperty('width', w + 'px', 'important'); ths[iDep].style.setProperty('min-width', w + 'px', 'important');
    }
    // columnas ocultas
    ths.forEach((th, i) => {
      const oculta = on('ocultar') && OCULTAS.includes(nombres[i]);
      th.style.display = oculta ? 'none' : '';
      filas.forEach((tr) => { if (celda(tr, i)) celda(tr, i).style.display = oculta ? 'none' : ''; });
    });

    const iTipo = nombres.indexOf('TIPO DATO'), iOrd = nombres.indexOf('ORDEN'), iDes = nombres.findIndex((n) => /^DESCRIPCI/.test(n));
    const iClave = nombres.indexOf('CLAVE MODELO'), iPuesto = nombres.indexOf('PUESTO TRABAJO'), iDec = Math.max(nombres.indexOf('DECIMAL'), nombres.indexOf('DECIM.'));
    const iVI = nombres.indexOf('VAL. INICIAL'), iVF = nombres.indexOf('VAL. FINAL');
    const iCant = nombres.indexOf('CANTIDAD INSUMOS'), iUM = nombres.indexOf('UM');
    const iChk = Object.fromEntries(CHK.map((c) => [c, nombres.indexOf(c)]));
    const porOrden = {}, infoOrden = {};
    const iCod = nombres.findIndex((n) => n === 'CÓDIGO' || n === 'CODIGO');
    filas.forEach((tr, k) => {
      const o = norm(iOrd >= 0 ? (inputDe(celda(tr, iOrd)) || {}).value : '') || String(k + 1);
      porOrden[o] = norm(celda(tr, iDes) && celda(tr, iDes).textContent);
      const tp = iTipo >= 0 ? SIN_ACENTOS((inputDe(celda(tr, iTipo)) || {}).value || '') : '';
      infoOrden[o] = { codigo: iCod >= 0 ? norm(celda(tr, iCod) && celda(tr, iCod).textContent) : '', sin: tp === 'SIN TIPO DE DATO' };
    });

    let alertas = 0; const primeras = [];
    filas.forEach((tr) => {
      const tdTipo = iTipo >= 0 ? celda(tr, iTipo) : null;
      const tipo = tdTipo ? (inputDe(tdTipo) || {}).value || '' : '';
      const t = SIN_ACENTOS(tipo);
      if (tdTipo) tdTipo.classList.toggle('rmd-td-sintipo', t === 'SIN TIPO DE DATO');

      // Depende: tooltip con el paso predecesor
      if (iDep >= 0 && on('depende')) {
        const i = inputDe(celda(tr, iDep));
        if (i) { const m = /\((\d+)\)/.exec(i.value || ''); i.title = m && porOrden[m[1]] ? `Depende del paso ${m[1]}: ${porOrden[m[1]]}` : (i.value ? 'Predecesor sin orden (colgante)' : 'Sin predecesor'); }
      }
      // Puesto de Trabajo sin asignar (solo si el combo está habilitado)
      if (iPuesto >= 0) {
        const tdP = celda(tr, iPuesto), ip = inputDe(tdP);
        const falta = on('puesto') && ip && !deshabilitado(ip) && !norm(ip.value);
        tdP.classList.toggle('rmd-sin-puesto', !!falta);
        if (falta) ip.title = 'Falta asignar el Puesto de Trabajo';
      }
      // Reglas de casillas
      [...tr.querySelectorAll('td.rmd-marcar,td.rmd-desmarcar,td.rmd-falta')].forEach(limpiarMarcas);
      if (!on('reglas') || !tdTipo) return;
      const avisos = [];
      const regla = reglaCasillas(tipo, esPM);
      // Procesos menores que son INSUMOS de la receta (llevan Cantidad Insumos / UM): nunca llevan Edit.
      if (esPM && regla) {
        const cant = iCant >= 0 ? norm((inputDe(celda(tr, iCant)) || {}).value) : '', um = iUM >= 0 ? norm(celda(tr, iUM) && celda(tr, iUM).textContent) : '';
        if (cant || um) regla.EDIT = false;
      }
      const tdDes = iDes >= 0 ? celda(tr, iDes) : null, desc = SIN_ACENTOS(tdDes && tdDes.textContent);
      // Calidad en Operaciones: el paso mayor "PERSONAL DE CALIDAD EN OPERACIONES..." (Realizado por) y los procesos menores de
      // muestreo (cantidad / fecha-hora de muestreo) llevan Estado CC; los de muestreo, además, Edit.
      // Excepciones vistas en RMD autorizados: CONDICIONES AMBIENTALES (Realizado por + V.B. cuando el proceso lleva luz inactínica)
      // y CONTRAMUESTRA (MuestraCC solo con Edit).
      if (regla && t === 'REALIZADO POR' && /^CONDICIONES AMBIENTALES/.test(desc)) delete regla['V.B.'];
      if (regla && t === 'MUESTRACC' && /CONTRAMUESTRA/.test(desc)) delete regla['ESTADO CC'];
      if (regla && t === 'REALIZADO POR' && /^(EL )?PERSONAL DE CALIDAD|^CALIDAD EN OPERACIONES (REGISTRA|REALIZA|INGRESA)/.test(desc)) regla['ESTADO CC'] = true;
      if (esPM && regla && /MUESTREAD|MUESTREO/.test(desc)) { regla.EDIT = true; regla['ESTADO CC'] = true; }
      if (regla) for (const [c, debe] of Object.entries(regla)) {
        const i = iChk[c]; if (i == null || i < 0 || !celda(tr, i)) continue;
        if (marcada(celda(tr, i)) !== debe) {
          const td = celda(tr, i);
          td.classList.add(debe ? 'rmd-marcar' : 'rmd-desmarcar');
          td.dataset.rmdAviso = `${debe ? 'MARCAR' : 'DESMARCAR'} ${NOMBRE_CASILLA[c]} (Tipo Dato: ${tipo})` +
            (t === 'REALIZADO POR' && c === 'V.B.' && !debe ? ' — o cambiar el tipo a "Realizado por y Visto bueno"' : '');
          td.title = td.dataset.rmdAviso;
          avisos.push(td.dataset.rmdAviso);
        }
      }
      // obligatorios por tipo
      const vacio = (idx) => idx >= 0 && !norm((inputDe(celda(tr, idx)) || {}).value);
      const marcarFalta = (idx, msg) => { const td = celda(tr, idx); td.classList.add('rmd-falta'); td.title = msg; avisos.push(msg); };
      if (tdDes) {
        if (/APROBACION DE CONTROL DE CALIDAD O CONTROL DE PROCESO/.test(desc)) marcarFalta(iDes, 'La nota del granel ahora dice "CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE"');
        else if (/MUESTRA PARA (EL )?CONTROL DE CALIDAD/.test(desc)) marcarFalta(iDes, 'En Rendimiento debe figurar "CANTIDAD MUESTREADA (kg):" en lugar de "MUESTRA PARA CONTROL DE CALIDAD"');
        else if (/CONTROL DE CALIDAD/.test(desc) && !/CONTROL DE CALIDAD O CALIDAD EN OPERACIONES/.test(desc)) marcarFalta(iDes, 'Reemplazar "CONTROL DE CALIDAD" por "CALIDAD EN OPERACIONES"');
      }
      if (NUMERICOS.has(t) && vacio(iDec)) marcarFalta(iDec, `Falta Decimal (Tipo Dato: ${tipo}); el portal no deja guardar`);
      if (t === 'RANGO') { if (vacio(iVI)) marcarFalta(iVI, 'Rango: falta Val. Inicial'); if (vacio(iVF)) marcarFalta(iVF, 'Rango: falta Val. Final'); }
      if (t === 'NOTIFICACION' && iClave >= 0) {
        const clave = SIN_ACENTOS((inputDe(celda(tr, iClave)) || {}).value || '');
        if (!CLAVES.includes(clave)) marcarFalta(iClave, 'Notificación: falta Clave Modelo (Setup Pre Proceso, Proceso o Setup Post Proceso)');
      }
      if (t === 'SIN TIPO DE DATO' && iDep >= 0 && norm((inputDe(celda(tr, iDep)) || {}).value)) marcarFalta(iDep, 'Sin tipo de dato no lleva predecesor: vaciar Depende');
      if (t !== 'SIN TIPO DE DATO' && iDep >= 0) {
        const v = norm((inputDe(celda(tr, iDep)) || {}).value), mm = /^(\S+)\s*\((\d+)\)/.exec(v);
        if (v && !mm) marcarFalta(iDep, 'Predecesor colgante (sin orden): reasignar Depende');
        else if (mm && infoOrden[mm[2]] && infoOrden[mm[2]].codigo === mm[1] && infoOrden[mm[2]].sin) marcarFalta(iDep, 'El predecesor es un "Sin tipo de dato": debe depender del paso anterior con tipo de dato');
      }
      if (avisos.length) { alertas += avisos.length; primeras.push({ tr, texto: avisos[0] }); }
    });
    const previo = tabla.__rmdAlertas;
    tabla.__rmdAlertas = { n: alertas, filas: primeras, sig: previo ? previo.sig : 0 };

    if (esPasos && (on('filtro') || on('reglas'))) filtroLocal(tabla, true);
    else if (esPM && on('reglas')) filtroLocal(tabla, false);
    actualizarBarra(d, tabla);
    // alturas para que barra de filtro, título de la tabla (con Guardar) y cabecera de columnas queden siempre visibles
    const bar = d.querySelector('#rmd-filtro-bar'), hdr = d.querySelector('.sapMListHdr');
    const h1 = (esPasos || esPM) && bar ? bar.offsetHeight : 0, h2 = (esPasos || esPM) && hdr ? hdr.offsetHeight : 0;
    d.style.setProperty('--rmd-h1', h1 + 'px'); d.style.setProperty('--rmd-top', (h1 + h2) + 'px');
  }

  // ---- 5. Filtro local + contador + alertas -----------------------------------------------------
  function filtroLocal(tabla, conFiltro) {
    const d = enDialogo(tabla); if (!d) return;
    let barra = d.querySelector('#rmd-filtro-bar');
    if (!barra) {
      barra = document.createElement('div'); barra.id = 'rmd-filtro-bar';
      barra.innerHTML = (conFiltro ? '<input class="rmd-filtro" type="text" placeholder="Filtrar pasos por texto, código u orden…">' : '') + '<span class="rmd-cuenta"></span><button type="button" class="rmd-alerta ok"></button>';
      const cont = tabla.closest('.sapMDialogScrollCont') || d;
      cont.parentNode.insertBefore(barra, cont);
      const inp = barra.querySelector('input'); if (inp) inp.addEventListener('input', () => aplicarFiltro(d));
      barra.querySelector('button').addEventListener('click', () => irAlSiguiente(d));
    }
    aplicarFiltro(d);
  }
  function aplicarFiltro(d) {
    const barra = d.querySelector('#rmd-filtro-bar'), tabla = d.querySelector('table.sapMListTbl'); if (!barra || !tabla) return;
    const inp = barra.querySelector('input'), q = NORM(inp ? inp.value : '');
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
    setTxt(barra.querySelector('.rmd-cuenta'), q ? `${visibles} de ${total} pasos` : `${total} ${inp ? 'pasos' : 'procesos menores'}`);
  }
  function actualizarBarra(d, tabla) {
    const barra = d.querySelector('#rmd-filtro-bar'); if (!barra || !tabla.__rmdAlertas) return;
    const b = barra.querySelector('button.rmd-alerta'), n = tabla.__rmdAlertas.n;
    if (!on('reglas')) { b.style.display = 'none'; return; }
    b.style.display = '';
    b.classList.toggle('ok', n === 0);
    setTxt(b, n === 0 ? '✔ Casillas coherentes con el tipo de dato' : `⚠ ${n} incoherencia(s) — clic para ir a la siguiente`);
  }
  function irAlSiguiente(d) {
    const tabla = d.querySelector('table.sapMListTbl'); const a = tabla && tabla.__rmdAlertas; if (!a || !a.filas.length) return;
    a.sig = (a.sig || 0) % a.filas.length; const { tr, texto } = a.filas[a.sig]; a.sig++;
    tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    tr.animate([{ outline: '3px solid #ff4d4d' }, { outline: '3px solid transparent' }], { duration: 1600 });
    setTxt(d.querySelector('#rmd-filtro-bar .rmd-cuenta'), texto);
  }

  // ---- 6. Estado del RMD en la cabecera de cada ventana + título completo del paso menor ------
  function estadoDelRmd() {
    for (const dlg of document.querySelectorAll('[role=dialog]')) {
      const lab = [...dlg.querySelectorAll('label')].find((l) => /^Estado del RMD/i.test(norm(l.getAttribute('aria-label') || l.textContent)));
      if (!lab) continue;
      const el = lab.getAttribute('for') && document.getElementById(lab.getAttribute('for'));   // el label apunta a su campo
      const v = norm(el && el.value);
      if (v) return v;
    }
    return '';
  }
  // El portal recorta la descripción del paso mayor en el título; se reconstruye con la descripción completa
  // de la fila del paso en la tabla de Pasos que quedó debajo (se muestran hasta 2 líneas).
  function tituloPMCompleto(h2) {
    const m = /^Procesos Menores para el Paso:\s*(\S+)/i.exec(norm(h2.textContent)); if (!m) return;
    const cod = m[1];
    for (const t of document.querySelectorAll('.sapMDialog table.sapMListTbl')) {
      const ths = [...t.querySelectorAll('thead th')].map((th) => NORM(th.textContent));
      if (!ths.includes('CLAVE MODELO')) continue;
      const iC = ths.findIndex((n) => n === 'CÓDIGO' || n === 'CODIGO'), iD = ths.findIndex((n) => /^DESCRIPCI/.test(n));
      const tr = filasPrincipales(t).find((r) => celda(r, iC) && norm(celda(r, iC).textContent) === cod);
      if (!tr) continue;
      const txt = `Procesos Menores para el Paso: ${cod} (${norm(celda(tr, iD).textContent)})`;
      if (norm(h2.textContent) !== txt) setTxt(h2, txt);
      return;
    }
  }
  function decorarCabeceras() {
    const estado = on('estado') ? estadoDelRmd() : '';
    dialogos().forEach((d) => {
      const h2 = d.querySelector('header h2.sapMTitle, h2.sapMTitle'); if (!h2) return;
      const barra = h2.closest('.sapMBar') || h2.parentElement;
      let b = barra.querySelector('.rmd-estado');
      if (on('estado') && estado) {
        if (!b) { b = document.createElement('span'); b.className = 'rmd-estado'; h2.after(b); }
        const cls = /ingres/i.test(estado) ? 'ingresado' : /autoriz/i.test(estado) ? 'autorizado' : /suspend/i.test(estado) ? 'suspendido' : 'otro';
        b.className = 'rmd-estado ' + cls; setTxt(b, estado.toUpperCase());
        b.title = cls === 'ingresado' ? 'RMD en estado Ingresado: se puede modificar' : `RMD ${estado}: revisar antes de modificar`;
      } else if (b) b.remove();
      if (on('pmtitulo') && /^Procesos Menores para el Paso/i.test(norm(h2.textContent))) {
        tituloPMCompleto(h2);
        h2.classList.add('rmd-pm-titulo'); h2.title = norm(h2.textContent); barra.classList.add('rmd-pm-cab');
      }
    });
  }

  let pendiente = false;
  window.__rmdStats = { ajustes: 0 };
  function ajustarTodo() {
    if (!opc.activo) return;
    window.__rmdStats.ajustes++;
    document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) table.sapMListTbl').forEach(ajustarTabla);
    decorarCabeceras();
  }
  new MutationObserver(() => {
    if (pendiente) return; pendiente = true;
    setTimeout(() => { pendiente = false; ajustarTodo(); }, 60);   // setTimeout (no rAF): también corre con la pestaña en segundo plano
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-checked'] });  // aria-checked: casillas que se pintan tarde
  document.addEventListener('change', () => setTimeout(ajustarTodo, 80), true);
  document.addEventListener('click', () => setTimeout(ajustarTodo, 120), true);

  // ---- 7. Avisar cambios sin guardar -----------------------------------------------------------
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

  // ---- 8. Cerrar solos los mensajes de éxito ---------------------------------------------------
  const visto = new WeakSet();
  new MutationObserver(() => {
    if (!on('exito')) return;
    document.querySelectorAll('.sapMMessageDialog').forEach((m) => {
      if (visto.has(m) || !m.offsetParent) return;
      const titulo = norm((m.querySelector('h1,h2,.sapMTitle,header') || {}).textContent);
      const botones = [...m.querySelectorAll('button')].filter((b) => b.offsetParent);
      if (/^[ÉE]xito/i.test(titulo) && botones.length === 1 && norm(botones[0].textContent) === 'OK') { visto.add(m); setTimeout(() => pulsar(botones[0]), 900); }
    });
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 9. Foco automático en el primer filtro de los selectores -------------------------------
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

  // ---- 10. Panel para activar/desactivar cada mejora -------------------------------------------
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
