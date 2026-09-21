// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.6.0
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
    ['filtro', 'Filtro local de pasos'], ['copiar', 'Botones Copiar / Pegar configuración'], ['singuardar', 'Avisar cambios sin guardar + Ctrl+S'],
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
  /* ── Paleta: se apoya en los colores del propio tema Fiori (oscuro por defecto; claro si el portal cambia de tema) ── */
  html { --rmd-texto: #fafafa; --rmd-apagado: #b8bec1; --rmd-superficie: #29313a; --rmd-barra: #1e242b; --rmd-cabecera: #232931; --rmd-borde: #3a4552; --rmd-borde-campo: #4a5666;
    --rmd-acento: #1b8dec; --rmd-acento-texto: #6bb6f5; --rmd-rojo: #ff8a8a; --rmd-ambar: #f0b45a; --rmd-verde: #8fd19e; --rmd-fuente: "72", "72full", Arial, Helvetica, sans-serif; }
  html:not(.sapUiTheme-sap_fiori_3_dark) { --rmd-texto: #32363a; --rmd-apagado: #6a6d70; --rmd-superficie: #ffffff; --rmd-barra: #f7f7f7; --rmd-cabecera: #f2f2f2; --rmd-borde: #d9d9d9;
    --rmd-borde-campo: #89919a; --rmd-acento: #0a6ed1; --rmd-acento-texto: #0a6ed1; --rmd-rojo: #bb0000; --rmd-ambar: #b45f06; --rmd-verde: #107e3e; }

  /* ── Ventanas emergentes: centradas y con el pie (Cancelar/Cerrar) siempre visible ── */
  html.rmd-ui .sapMDialog:not(.sapMPopover) { position: fixed !important; box-sizing: border-box !important; margin: 0 !important; display: flex !important; flex-direction: column !important; }
  html.rmd-ui .sapMDialog:not(.sapMPopover) > section { flex: 1 1 auto !important; min-height: 0 !important; overflow: auto !important; }
  html.rmd-ui .sapMDialog:not(.sapMPopover) > footer, html.rmd-ui .sapMDialog:not(.sapMPopover) > header { flex: 0 0 auto !important; }
  html.rmd-ui .sapMDialog.rmd-pasos {
    width: 98vw !important; max-width: 98vw !important; height: calc(100vh - 16px) !important; max-height: calc(100vh - 16px) !important;
    left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
  html.rmd-ui .sapMDialog.rmd-medio {
    width: min(1120px, 96vw) !important; max-width: 96vw !important; height: auto !important; max-height: calc(100vh - 24px) !important;
    left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
  html.rmd-ui .sapMDialog.rmd-medio.rmd-ancho { width: min(1560px, 97vw) !important; }
  html.rmd-ui .sapMDialog.sapMMessageDialog { left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; max-height: calc(100vh - 24px) !important; }

  /* ── Tablas: mismas filas del portal, un poco más de aire; cabecera fija ── */
  html.rmd-cols .sapMDialog:not(.sapMMessageDialog) table.sapMListTbl { table-layout: fixed; width: 100% !important; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) thead th { position: sticky; top: var(--rmd-top, 0px); z-index: 3; background: var(--rmd-cabecera); }
  html.rmd-ui .sapMDialog.rmd-sticky .sapMListHdr { position: sticky; top: var(--rmd-h1, 0px); z-index: 8; background: var(--rmd-barra); }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB > td { padding-top: 6px; padding-bottom: 6px; vertical-align: middle; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:hover > td { background: rgba(27,141,236,.09) !important; }
  html.rmd-zebra .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:nth-child(odd) > td { background: rgba(255,255,255,.02); }
  html.rmd-ui .sapMDialog td .sapMText, html.rmd-ui .sapMDialog td .sapMLabel { white-space: normal; line-height: 1.35; }
  html.rmd-ui .sapMDialog input:focus { outline: 1px solid var(--rmd-acento) !important; outline-offset: -1px; }

  /* ── Señales sobre la tabla (discretas: tinte suave + marca lateral, sin contornos) ── */
  html.rmd-sintipo td.rmd-td-sintipo input, html.rmd-sintipo td.rmd-td-sintipo .sapMSltLabel { color: var(--rmd-rojo) !important; -webkit-text-fill-color: var(--rmd-rojo) !important; font-weight: 700 !important; }
  html.rmd-contraste .sapMDialog .sapMInputBaseDisabled .sapMInputBaseInner, html.rmd-contraste .sapMDialog .sapMInputBaseDisabled { opacity: .8 !important; }
  html.rmd-contraste .sapMDialog .sapMInputBaseInner::placeholder { color: var(--rmd-apagado) !important; opacity: 1; }
  html.rmd-contraste .sapMDialog .sapMInputBase:not(.sapMInputBaseDisabled):not(.sapMInputBaseReadonly) .sapMInputBaseInner { background: rgba(255,255,255,.04) !important; }
  @keyframes rmdPulso { 0%, 100% { box-shadow: 0 0 0 1px rgba(255,138,138,.95); background: rgba(255,138,138,.16); } 50% { box-shadow: 0 0 0 1px rgba(255,138,138,.25); background: transparent; } }
  html.rmd-puesto td.rmd-sin-puesto .sapMInputBase, html.rmd-puesto td.rmd-sin-puesto .sapMComboBoxBase { animation: rmdPulso 2.4s ease-in-out infinite; border-radius: 3px; }
  @media (prefers-reduced-motion: reduce) { html.rmd-puesto td.rmd-sin-puesto .sapMInputBase, html.rmd-puesto td.rmd-sin-puesto .sapMComboBoxBase { animation: none; box-shadow: 0 0 0 1px rgba(255,138,138,.9); } }
  html.rmd-reglas td.rmd-marcar    { background: rgba(240,180,90,.13) !important; box-shadow: inset 3px 0 0 var(--rmd-ambar); }
  html.rmd-reglas td.rmd-desmarcar { background: rgba(255,138,138,.13) !important; box-shadow: inset 3px 0 0 var(--rmd-rojo); }
  html.rmd-reglas td.rmd-falta     { background: rgba(255,138,138,.10) !important; box-shadow: inset 0 -2px 0 var(--rmd-rojo); }

  /* ── Estado del RMD: etiqueta con contorno, sin relleno ── */
  .rmd-estado { display: inline-block; margin-left: 10px; padding: 0 8px; border: 1px solid currentColor; border-radius: 10px; font: 600 11px/18px var(--rmd-fuente); letter-spacing: .4px; text-transform: uppercase; vertical-align: middle; background: transparent; }
  .rmd-estado.ingresado { color: var(--rmd-acento-texto); } .rmd-estado.autorizado { color: var(--rmd-verde); } .rmd-estado.suspendido { color: var(--rmd-ambar); } .rmd-estado.otro { color: var(--rmd-apagado); }

  /* ── Título del paso menor: hasta 2 líneas ── */
  .sapMDialog h2.rmd-pm-titulo { white-space: normal !important; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; max-width: 100%; }
  .sapMDialog .rmd-pm-cab { height: auto !important; min-height: 44px; padding-top: 4px; padding-bottom: 4px; }

  /* ── Barra fija: filtro, incoherencias y copiar/pegar ── */
  #rmd-filtro-bar { position: sticky; top: 0; z-index: 9; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 7px 16px; background: var(--rmd-barra); border-bottom: 1px solid var(--rmd-borde); font: 14px var(--rmd-fuente); color: var(--rmd-apagado); }
  #rmd-filtro-bar input.rmd-filtro { flex: 0 1 260px; height: 30px; padding: 0 10px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-cabecera); color: var(--rmd-texto); font: inherit; }
  #rmd-filtro-bar input.rmd-filtro:focus { outline: none; border-color: var(--rmd-acento); }
  #rmd-filtro-bar input.rmd-filtro::placeholder { color: var(--rmd-apagado); }
  #rmd-filtro-bar .rmd-cuenta { font-size: 13px; }
  #rmd-filtro-bar button.rmd-alerta { border: 0; background: transparent; color: var(--rmd-ambar); font: inherit; font-size: 13px; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
  #rmd-filtro-bar button.rmd-alerta:hover { background: rgba(240,180,90,.12); }
  #rmd-filtro-bar button.rmd-alerta.ok { color: var(--rmd-verde); cursor: default; } #rmd-filtro-bar button.rmd-alerta.ok:hover { background: transparent; }
  #rmd-filtro-bar .rmd-clip { flex: 1 1 200px; min-width: 0; margin-left: auto; text-align: right; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── Botones (discretos: contorno fino y texto de acento; el relleno solo en la acción principal) ── */
  .rmd-btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: transparent; color: var(--rmd-acento-texto); font: 14px var(--rmd-fuente); cursor: pointer; }
  .rmd-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .rmd-btn:hover:not(:disabled) { background: rgba(27,141,236,.12); border-color: var(--rmd-acento); } .rmd-btn:disabled { opacity: .4; cursor: default; }
  .rmd-btn.primario { background: var(--rmd-acento); border-color: var(--rmd-acento); color: #fff; } .rmd-btn.primario:hover:not(:disabled) { filter: brightness(1.1); }

  /* ── Ventana de vista previa / registro ── */
  .rmd-modal-fondo { position: fixed; inset: 0; z-index: 100000; display: grid; place-items: center; background: rgba(0,0,0,.5); }
  .rmd-modal { display: flex; flex-direction: column; width: min(920px, 94vw); max-height: 88vh; padding: 20px 24px 16px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,.45); font: 14px/1.45 var(--rmd-fuente); }
  .rmd-modal h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
  .rmd-modal-cuerpo { flex: 1 1 auto; min-height: 0; overflow: auto; } .rmd-modal-pie { display: flex; justify-content: flex-end; gap: 8px; padding-top: 14px; }
  .rmd-modal p { margin: 0 0 10px; } .rmd-modal label { color: var(--rmd-texto); } .rmd-modal input[type=checkbox] { accent-color: var(--rmd-acento); }
  .rmd-tabla { width: 100%; margin: 6px 0 14px; border-collapse: collapse; }
  .rmd-tabla th { padding: 6px 8px; border-bottom: 1px solid var(--rmd-borde); text-align: left; font: 600 11px var(--rmd-fuente); letter-spacing: .5px; text-transform: uppercase; color: var(--rmd-apagado); }
  .rmd-tabla td { padding: 6px 8px; border-bottom: 1px solid rgba(128,140,155,.16); text-align: left; vertical-align: top; }
  .rmd-dif { color: var(--rmd-acento-texto); font-weight: 600; } .rmd-atenuada { opacity: .5; } .rmd-nota { color: var(--rmd-apagado); font-size: 13px; }
  .rmd-log { margin: 0; white-space: pre-wrap; font: 12.5px/1.5 ui-monospace, Consolas, monospace; color: var(--rmd-texto); }
  .rmd-toast { position: fixed; left: 50%; bottom: 28px; z-index: 100001; max-width: min(640px, 86vw); transform: translateX(-50%); padding: 10px 16px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-left: 3px solid var(--rmd-verde); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.35); font: 14px/1.4 var(--rmd-fuente); }
  .rmd-toast.error { border-left-color: var(--rmd-rojo); }

  /* ── Panel de opciones: un botón redondo discreto ── */
  #rmd-ui-panel { position: fixed; left: 12px; bottom: 12px; z-index: 99999; font: 13px var(--rmd-fuente); color: var(--rmd-texto); }
  #rmd-ui-panel summary { display: grid; place-items: center; width: 28px; height: 28px; list-style: none; border: 1px solid var(--rmd-borde); border-radius: 50%; background: var(--rmd-cabecera); color: var(--rmd-apagado); cursor: pointer; opacity: .55; transition: opacity .15s; }
  #rmd-ui-panel summary::-webkit-details-marker { display: none; } #rmd-ui-panel summary:hover, #rmd-ui-panel[open] summary { opacity: 1; }
  #rmd-ui-panel summary svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  #rmd-ui-panel .rmd-panel-cuerpo { position: absolute; left: 0; bottom: 36px; min-width: 270px; max-height: 70vh; overflow: auto; padding: 10px 14px; background: var(--rmd-superficie); border: 1px solid var(--rmd-borde); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.4); }
  #rmd-ui-panel label { display: flex; align-items: center; gap: 8px; margin: 5px 0; cursor: pointer; white-space: nowrap; } #rmd-ui-panel input[type=checkbox] { accent-color: var(--rmd-acento); }
  #rmd-ui-panel .rmd-panel-nota { margin-top: 6px; color: var(--rmd-apagado); font-size: 12px; }
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
  const NOMBRE_CASILLA = { 'EDIT': 'Edit', 'R. POR': 'R. Por', 'V.B.': 'V.B.', 'ESTADO CC': 'Estado CC', 'PM OP': 'PM OP', 'GEN PP': 'Gen PP', 'TAB': 'Tab' };

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
        if (/MUESTRA PARA (EL )?CONTROL DE CALIDAD/.test(desc)) marcarFalta(iDes, 'En Rendimiento debe figurar "CANTIDAD MUESTREADA (kg):" en lugar de "MUESTRA PARA CONTROL DE CALIDAD"');
        else if (/CONTROL DE CALIDAD|APROBACION DE .*CONTROL DE PROCESO/.test(desc)) marcarFalta(iDes, 'Reemplazar "CONTROL DE CALIDAD" por "CALIDAD EN OPERACIONES" (solo debe quedar Calidad en Operaciones)');
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
      if (conFiltro && on('copiar')) instalarBotonesCopia(barra, d, tabla);
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
    setTxt(b, n === 0 ? '✓ Sin incoherencias' : `⚠ ${n} incoherencia${n === 1 ? '' : 's'} · ir a la siguiente ›`);
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

  // ---- 9b. Copiar la configuración de un paso (y sus procesos menores) a otro paso -------------------------
  // Flujo: se marca la casilla del paso de referencia -> "Copiar configuración"; se marca la casilla del paso nuevo ->
  // "Pegar en el paso marcado". Muestra una vista previa y solo escribe al pulsar "Aplicar". Usa los propios controles de
  // SAP (Tipo Dato, casillas, selector "Adicionar Pasos RMD" de los procesos menores) y los botones Guardar del portal.
  // El portapapeles se guarda en el navegador: se puede copiar en un RMD de referencia y pegar en otro RMD.
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  async function hasta(pred, ms = 15000, paso = 200) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { const v = pred(); if (v) return v; } catch (e) { /* sigue esperando */ } await esperar(paso); }
    return null;
  }
  const ocupado = () => [...document.querySelectorAll('.sapUiLocalBusyIndicator')].some((e) => e.getClientRects().length);
  const nucleo = () => sap.ui.getCore();
  function ctlDe(el) {
    if (!el) return null;
    const c = nucleo();
    const cont = el.closest && el.closest('[data-sap-ui]');
    return c.byId(el.id) || c.byId((el.id || '').replace(/-(inner|CB)$/, '')) || (cont && c.byId(cont.id)) || null;
  }
  const columnas = (tabla) => [...tabla.querySelectorAll('thead th')].map((th) => NORM(th.textContent));
  function leerCelda(tr, i) {
    const td = celda(tr, i); if (!td) return '';
    const cb = td.querySelector('[role=checkbox]'); if (cb) return cb.getAttribute('aria-checked') === 'true';
    const inp = inputDe(td); return inp ? inp.value : norm(td.textContent);
  }
  const lector = (tabla, tr) => { const n = columnas(tabla); return (...nombres) => { for (const nom of nombres) { const i = n.indexOf(nom); if (i >= 0) return leerCelda(tr, i); } return ''; }; };
  function leerPaso(tabla, tr) {
    const g = lector(tabla, tr);
    return {
      orden: g('ORDEN'), codigo: g('CÓDIGO', 'CODIGO'), desc: g('DESCRIPCIÓN', 'DESCRIPCION'),
      tipo: g('TIPO DATO'), clave: g('CLAVE MODELO'), puesto: g('PUESTO TRABAJO'), vi: g('VAL. INICIAL'), vf: g('VAL. FINAL'), mg: g('MARGEN'), dec: g('DECIMAL'),
      chk: { 'ESTADO CC': !!g('ESTADO CC'), 'PM OP': !!g('PM OP'), 'GEN PP': !!g('GEN PP'), 'EDIT': !!g('EDIT'), 'R. POR': !!g('R. POR'), 'V.B.': !!g('V.B.') },
    };
  }
  function leerPMfila(tabla, tr) {
    const g = lector(tabla, tr);
    const cant = norm(g('CANTIDAD INSUMOS')), um = norm(g('UM'));
    return {
      orden: g('ORDEN'), codigo: g('CÓDIGO', 'CODIGO'), desc: g('DESCRIPCIÓN', 'DESCRIPCION'), cant, um, insumo: !!(cant || um),
      tipo: g('TIPO DATO'), vi: g('VAL. INICIAL'), vf: g('VAL. FINAL'), mg: g('MARGEN'), dec: g('DECIM.', 'DECIMAL'),
      chk: { 'TAB': !!g('TAB'), 'EDIT': !!g('EDIT'), 'GEN PP': !!g('GEN PP'), 'ESTADO CC': !!g('ESTADO CC') },
    };
  }
  const seleccionadas = (tabla) => filasPrincipales(tabla).filter((tr) => tr.getAttribute('aria-selected') === 'true');
  const cabeceraDe = (d) => norm((d.querySelector('h2') || {}).textContent);
  const esDialogoPM = (d) => /^Procesos Menores para el Paso/i.test(cabeceraDe(d));

  // escribe un valor en una celda usando el control de SAP (ComboBox, Input o CheckBox); devuelve true si lo aplicó
  function fijarCelda(tr, i, valor) {
    const td = celda(tr, i); if (!td) return false;
    const cb = td.querySelector('[role=checkbox]');
    if (cb) { const c = ctlDe(cb); if (!c || !c.setSelected) return false; if (c.getSelected() !== !!valor) { c.setSelected(!!valor); c.fireSelect({ selected: !!valor }); } return true; }
    const inp = inputDe(td), c = ctlDe(inp); if (!c) return false;
    if (c.getEnabled && !c.getEnabled()) return null;                      // campo bloqueado por el tipo de dato: se omite
    if (c.getItems) {                                                        // ComboBox
      const it = valor ? c.getItems().find((x) => x.getText() === valor) : null;
      if (valor && !it) return false;
      c.setSelectedItem(it); if (!valor) c.setValue('');
      c.fireSelectionChange({ selectedItem: it }); c.fireChange({ value: valor || '' }); return true;
    }
    c.setValue(valor == null ? '' : String(valor)); c.fireChange({ value: c.getValue() }); return true;
  }
  // aplica una configuración a una fila (por id, porque UI5 vuelve a dibujar la fila al cambiar el tipo de dato)
  async function aplicarFila(tabla, trId, cfg, nombres, log) {
    const n = columnas(tabla), fila = () => document.getElementById(trId);
    const poner = async (nom, valor, etiqueta, espera = 250) => {
      const i = n.indexOf(nom); if (i < 0 || !fila()) return;
      const ok = fijarCelda(fila(), i, valor);
      const txt = typeof valor === 'boolean' ? (valor ? 'marcada' : 'desmarcada') : (valor === '' ? '(vacío)' : valor);
      log(ok === null ? `ℹ ${etiqueta}: bloqueado por el tipo de dato (se omite)` : `${ok ? '✔' : '⚠'} ${etiqueta}: ${txt}${ok ? '' : ' — no se pudo aplicar (¿valor inexistente en la lista?)'}`);
      await esperar(espera);
    };
    if (cfg.tipo != null) await poner('TIPO DATO', cfg.tipo, 'Tipo Dato', 900);   // el tipo habilita/bloquea otros campos
    for (const [nom, k, et] of [['CLAVE MODELO', 'clave', 'Clave Modelo'], ['PUESTO TRABAJO', 'puesto', 'Puesto Trabajo']]) if (cfg[k] != null) await poner(nom, cfg[k], et, 500);
    for (const [nom, k, et] of [['VAL. INICIAL', 'vi', 'Val. Inicial'], ['VAL. FINAL', 'vf', 'Val. Final'], ['MARGEN', 'mg', 'Margen'], ['DECIMAL', 'dec', 'Decimal'], ['DECIM.', 'dec', 'Decimal']])
      if (cfg[k] != null && n.indexOf(nom) >= 0) await poner(nom, cfg[k], et);
    for (const [k, v] of Object.entries(cfg.chk || {})) await poner(k, v, `Casilla ${NOMBRE_CASILLA[k] || k}`, 120);
  }

  // mensajes del portal (Confirmación / Éxito): acepta los de guardado; si aparece una advertencia o un error, se detiene
  async function atenderMensajes(ms = 20000, quietoMs = 1800) {
    const t0 = Date.now(); let ultimo = Date.now(); const vistos = [];
    while (Date.now() - t0 < ms) {
      const m = [...document.querySelectorAll('.sapMMessageDialog')].filter((x) => x.getClientRects().length).pop();
      if (m) {
        const titulo = norm((m.querySelector('h1,h2,.sapMTitle,header') || {}).textContent), texto = norm((m.querySelector('section') || {}).textContent);
        const botones = [...m.querySelectorAll('footer button')].filter((b) => b.getClientRects().length);
        const ok = botones.find((b) => /^(OK|Aceptar|Sí|Si)$/i.test(norm(b.textContent)));
        if (/[ÉE]xito|Confirmaci/i.test(titulo) && ok && !/elimin|borrar/i.test(texto)) { vistos.push(`${titulo}: ${texto}`); pulsar(ok); ultimo = Date.now(); await esperar(700); continue; }
        return { problema: `${titulo}: ${texto}`, vistos };
      }
      if (vistos.length && Date.now() - ultimo > quietoMs) break;
      if (!vistos.length && Date.now() - t0 > 6000) break;                    // no hubo mensajes
      await esperar(250);
    }
    return { vistos };
  }
  async function cargarTodo(tabla) {
    const ctl = ctlDe(tabla.closest('table'));
    const t = tabla.closest('table'), c = t && nucleo().byId(t.id.replace(/-listUl$/, ''));
    const g = c && c._oGrowingDelegate;
    for (let i = 0; i < 200 && g && g.requestNewPage; i++) {
      const antes = filasPrincipales(t).length; g.requestNewPage();
      if (!(await hasta(() => filasPrincipales(t).length > antes, 2500))) break;
    }
    return ctl;
  }
  const tablaDe = (d) => d.querySelector('table.sapMListTbl');
  async function abrirPM(tabla, trId) {
    const tr = document.getElementById(trId); const b = tr && [...tr.querySelectorAll('button')].find((x) => x.title === 'Procesos Menores');
    if (!b) throw new Error('El paso no tiene el botón "Procesos Menores"');
    const previos = new Set(dialogos());
    pulsar(b);
    const d = await hasta(() => { const x = dialogos().find((y) => !previos.has(y) && esDialogoPM(y)); return x && !ocupado() ? x : null; }, 25000);
    if (!d) throw new Error('No se abrió la ventana de procesos menores');
    await esperar(900);
    await cargarTodo(tablaDe(d));
    return d;
  }
  async function cerrarDialogo(d) {
    const b = botonPorTitulo(d, 'Cerrar') || botonPorTitulo(d, 'Cancelar'); if (b) pulsar(b);
    await hasta(() => !dialogos().includes(d), 8000); await esperar(400);
  }
  const filasPMde = (d) => { const t = tablaDe(d); return t ? filasPrincipales(t).filter((tr) => tr.querySelector('input,[role=checkbox]')).slice(0) : []; };
  async function leerPMsDe(tabla, trId) {
    const d = await abrirPM(tabla, trId), t = tablaDe(d);
    const fs = filasPMde(d).filter((tr) => celda(tr, columnas(t).indexOf('ORDEN')) && inputDe(celda(tr, columnas(t).indexOf('ORDEN'))));
    const lista = fs.map((tr) => leerPMfila(t, tr));
    await cerrarDialogo(d);
    return lista;
  }

  // ---- ventana propia: vista previa y registro del avance ----
  function ventana(titulo) {
    const fondo = document.createElement('div'); fondo.className = 'rmd-modal-fondo';
    fondo.innerHTML = `<div class="rmd-modal"><h3></h3><div class="rmd-modal-cuerpo"></div><div class="rmd-modal-pie"></div></div>`;
    fondo.querySelector('h3').textContent = titulo; document.body.appendChild(fondo);
    return { fondo, cuerpo: fondo.querySelector('.rmd-modal-cuerpo'), pie: fondo.querySelector('.rmd-modal-pie'), cerrar: () => fondo.remove() };
  }
  const botonModal = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-btn ' + (cls || ''); b.textContent = txt; b.addEventListener('click', fn); return b; };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(txt, error) {
    const t = document.createElement('div'); t.className = 'rmd-toast' + (error ? ' error' : ''); t.textContent = txt; document.body.appendChild(t);
    setTimeout(() => t.remove(), error ? 9000 : 5500);
  }
  const resumenCasillas = (c) => Object.entries(c || {}).filter(([, v]) => v).map(([k]) => NOMBRE_CASILLA[k] || k).join(' + ') || 'sin casillas';
  const resumenPaso = (p) => `${p.tipo || '(sin tipo)'}${p.clave ? ' · ' + p.clave : ''}${p.puesto ? ' · ' + p.puesto : ''}${p.dec !== '' && p.dec != null ? ' · dec ' + p.dec : ''} · ${resumenCasillas(p.chk)}`;

  let portapapeles = null;
  try { portapapeles = JSON.parse(localStorage.getItem('rmdUiPortapapeles')); } catch (e) { portapapeles = null; }
  const guardarPortapapeles = () => { try { localStorage.setItem('rmdUiPortapapeles', JSON.stringify(portapapeles)); } catch (e) { /* sin almacenamiento */ } };
  function pintarEstadoPortapapeles() {
    document.querySelectorAll('#rmd-filtro-bar .rmd-clip').forEach((sp) => {
      const t = portapapeles ? `Copiado: #${portapapeles.paso.orden} ${portapapeles.paso.desc.slice(0, 60)}${portapapeles.paso.desc.length > 60 ? '…' : ''} — ${portapapeles.pms.filter((x) => !x.insumo).length} proceso(s) menor(es)` : 'Nada copiado todavía';
      setTxt(sp, t); sp.title = portapapeles ? `Origen RMD ${portapapeles.rmd || ''}: ${portapapeles.paso.desc}` : '';
    });
    document.querySelectorAll('#rmd-filtro-bar .rmd-pegar').forEach((b) => { b.disabled = !portapapeles; });
  }

  let ocupadoCopia = false;
  async function copiarPaso(d, tabla) {
    if (ocupadoCopia) return; ocupadoCopia = true;
    try {
      const sel = seleccionadas(tabla);
      if (sel.length !== 1) { toast('Marca la casilla de UN solo paso (el de referencia) y pulsa "Copiar configuración".', true); return; }
      const paso = leerPaso(tabla, sel[0]);
      toast('Leyendo la configuración y los procesos menores del paso…');
      let pms = [];
      const b = [...sel[0].querySelectorAll('button')].find((x) => x.title === 'Procesos Menores');
      if (b) pms = await leerPMsDe(tabla, sel[0].id);
      const rmd = (d.querySelector('h2') || {}).textContent || '';
      portapapeles = { paso, pms, rmd: norm(rmd).split(' - ')[0], cuando: new Date().toISOString() }; guardarPortapapeles(); pintarEstadoPortapapeles();
      const ins = pms.filter((x) => x.insumo).length;
      toast(`Copiado el paso #${paso.orden} con ${pms.length - ins} proceso(s) menor(es)${ins ? ` (${ins} insumo(s) no se copian: se agregan con "Agregar Insumo")` : ''}. Ahora marca el paso nuevo y pulsa "Pegar".`);
    } catch (e) { toast('No se pudo copiar: ' + e.message, true); } finally { ocupadoCopia = false; }
  }

  // la vista previa devuelve las opciones elegidas o null si se cancela
  function vistaPrevia(destino, pmDestino) {
    return new Promise((resolver) => {
      const o = portapapeles.paso, v = ventana('Pegar configuración y procesos menores');
      const campos = [['tipo', 'Tipo Dato'], ['clave', 'Clave Modelo'], ['puesto', 'Puesto Trabajo'], ['vi', 'Val. Inicial'], ['vf', 'Val. Final'], ['mg', 'Margen'], ['dec', 'Decimal']];
      const filasCfg = campos.map(([k, et]) => { const a = destino[k], n = o[k], dif = String(a) !== String(n); return `<tr><td><input type="checkbox" data-c="${k}" ${dif ? 'checked' : ''}></td><td>${et}</td><td>${esc(a) || '—'}</td><td class="${dif ? 'rmd-dif' : ''}">${esc(n) || '—'}</td></tr>`; }).join('');
      const filasChk = Object.keys(o.chk).map((k) => { const a = destino.chk[k], n = o.chk[k], dif = a !== n; return `<tr><td><input type="checkbox" data-x="${k}" ${dif ? 'checked' : ''}></td><td>Casilla ${NOMBRE_CASILLA[k]}</td><td>${a ? 'marcada' : 'no'}</td><td class="${dif ? 'rmd-dif' : ''}">${n ? 'marcada' : 'no'}</td></tr>`; }).join('');
      const existentes = new Map(pmDestino.map((x) => [x.codigo, x]));
      const filasPM = portapapeles.pms.map((x, i) => {
        if (x.insumo) return `<tr class="rmd-atenuada"><td></td><td>${esc(x.orden)}</td><td>${esc(x.codigo)} · ${esc(x.desc)}</td><td>insumo de la receta: no se copia (usa "Agregar Insumo")</td></tr>`;
        const ya = existentes.has(x.codigo);
        return `<tr><td><input type="checkbox" data-p="${i}" checked></td><td>${esc(x.orden)}</td><td>${esc(x.codigo)} · ${esc(x.desc)}</td><td>${esc(x.tipo || '(sin tipo)')} · ${esc(resumenCasillas(x.chk))}${x.dec !== '' ? ' · dec ' + esc(x.dec) : ''} — <b>${ya ? 'ya existe: se actualiza su configuración' : 'se agrega'}</b></td></tr>`;
      }).join('');
      v.cuerpo.innerHTML = `
        <p><b>Origen</b> (RMD ${esc(portapapeles.rmd)}): #${esc(o.orden)} · ${esc(o.codigo)} · ${esc(o.desc)}<br><b>Destino</b>: #${esc(destino.orden)} · ${esc(destino.codigo)} · ${esc(destino.desc)}</p>
        <table class="rmd-tabla"><thead><tr><th></th><th>Configuración del paso</th><th>Destino ahora</th><th>Se copiará</th></tr></thead><tbody>${filasCfg}${filasChk}</tbody></table>
        <table class="rmd-tabla"><thead><tr><th></th><th>Orden</th><th>Procesos menores del origen</th><th>Qué pasará</th></tr></thead><tbody>${filasPM || '<tr><td colspan="4">El paso de origen no tiene procesos menores.</td></tr>'}</tbody></table>
        <p class="rmd-nota">No se copian Orden, Depende, Código ni Descripción.${portapapeles.pms.length ? ` El destino tiene ${pmDestino.length} proceso(s) menor(es).` : ''}</p>
        <label><input type="checkbox" id="rmd-op-guardar" checked> Guardar el paso al terminar de aplicar la configuración</label><br>
        <label><input type="checkbox" id="rmd-op-actualizar" checked> Actualizar la configuración de los procesos menores que ya existan en el destino</label>`;
      v.pie.append(botonModal('Cancelar', '', () => { v.cerrar(); resolver(null); }), botonModal('Aplicar', 'primario', () => {
        const q = (s) => [...v.cuerpo.querySelectorAll(s)];
        const opciones = {
          campos: q('input[data-c]:checked').map((i) => i.dataset.c), casillas: q('input[data-x]:checked').map((i) => i.dataset.x),
          pms: q('input[data-p]:checked').map((i) => +i.dataset.p), guardar: v.cuerpo.querySelector('#rmd-op-guardar').checked, actualizar: v.cuerpo.querySelector('#rmd-op-actualizar').checked,
        };
        v.cerrar(); resolver(opciones);
      }));
    });
  }

  async function pegarPaso(d, tabla) {
    if (ocupadoCopia) return; ocupadoCopia = true;
    try {
      if (!portapapeles) { toast('Primero copia un paso de referencia.', true); return; }
      const sel = seleccionadas(tabla);
      if (sel.length !== 1) { toast('Marca la casilla de UN solo paso (el destino) y pulsa "Pegar".', true); return; }
      const trId = sel[0].id, destino = leerPaso(tabla, sel[0]);
      toast('Leyendo el paso destino…');
      const btnPM = [...sel[0].querySelectorAll('button')].find((x) => x.title === 'Procesos Menores');
      const pmDestino = btnPM && portapapeles.pms.length ? await leerPMsDe(tabla, trId) : [];
      const op = await vistaPrevia(destino, pmDestino);
      if (!op) return;

      const v = ventana('Aplicando…'); const lineas = [];
      const log = (t) => { lineas.push(t); v.cuerpo.innerHTML = '<pre class="rmd-log">' + esc(lineas.join('\n')) + '</pre>'; v.cuerpo.scrollTop = v.cuerpo.scrollHeight; };
      const listo = botonModal('Cerrar', 'primario', () => v.cerrar()); listo.disabled = true; v.pie.append(listo);
      try {
        // 1) configuración del paso mayor
        const cfg = {}; for (const k of op.campos) cfg[k] = portapapeles.paso[k];
        cfg.chk = {}; for (const k of op.casillas) cfg.chk[k] = portapapeles.paso.chk[k];
        log(`Paso #${destino.orden} · ${destino.desc}`);
        if (op.campos.length || op.casillas.length) await aplicarFila(tabla, trId, cfg, columnas(tabla), log);
        if (op.guardar && (op.campos.length || op.casillas.length)) {
          const g = botonPorTitulo(d, 'Guardar'); if (!g) throw new Error('No encuentro el botón Guardar del paso');
          log('Guardando el paso…'); pulsar(g);
          const r = await atenderMensajes(); if (r.problema) throw new Error('El portal respondió: ' + r.problema);
          log('✔ Paso guardado' + (r.vistos.length ? ` (${r.vistos.join(' | ')})` : '')); await esperar(1200);
        } else if (op.campos.length || op.casillas.length) log('ℹ Configuración aplicada sin guardar: revisa y pulsa Guardar.');

        // 2) procesos menores
        const elegidos = op.pms.map((i) => portapapeles.pms[i]).filter((x) => !x.insumo);
        if (elegidos.length) {
          log(`Abriendo los procesos menores del destino (${elegidos.length} por aplicar)…`);
          const dPM = await abrirPM(tabla, trId), tPM = tablaDe(dPM);
          const codigos = () => new Set(filasPMde(dPM).map((tr) => leerPMfila(tPM, tr).codigo));
          for (const x of elegidos) {
            if (!codigos().has(x.codigo)) { await agregarPM(dPM, x, log); }
            else log(`= ${x.codigo} ya estaba en el destino`);
          }
          const n = columnas(tPM);
          for (const x of elegidos) {
            if (!op.actualizar && codigosPrevios(pmDestino).has(x.codigo)) continue;
            const fs = filasPMde(dPM).filter((tr) => leerPMfila(tPM, tr).codigo === x.codigo); const tr = fs[fs.length - 1];
            if (!tr) { log(`⚠ No encuentro ${x.codigo} para configurarlo`); continue; }
            log(`Configurando ${x.codigo} · ${x.desc}`);
            await aplicarFila(tPM, tr.id, { tipo: x.tipo, vi: x.vi, vf: x.vf, mg: x.mg, dec: x.dec, chk: x.chk }, n, log);
          }
          const g = botonPorTitulo(dPM, 'Guardar'); if (!g) throw new Error('No encuentro el botón Guardar de procesos menores');
          log('Guardando los procesos menores…'); pulsar(g);
          const r = await atenderMensajes(); if (r.problema) throw new Error('El portal respondió: ' + r.problema);
          log('✔ Procesos menores guardados'); await esperar(1000);
          await cerrarDialogo(dPM);
        }
        log('\nListo. Revisa el resultado en la tabla.');
        v.fondo.querySelector('h3').textContent = 'Terminado';
      } catch (e) {
        log('\n✖ Se detuvo: ' + e.message + '\nRevisa el estado del paso antes de reintentar (lo ya aplicado no se deshace solo).');
        v.fondo.querySelector('h3').textContent = 'Se detuvo por un error';
      } finally { listo.disabled = false; }
    } catch (e) { toast('No se pudo pegar: ' + e.message, true); } finally { ocupadoCopia = false; ajustarTodo(); }
  }
  const codigosPrevios = (lista) => new Set(lista.map((x) => x.codigo));

  // agrega un proceso menor (por código de paso) desde el selector "Adicionar Pasos RMD"
  async function agregarPM(dPM, x, log) {
    const btn = botonPorTitulo(dPM, 'Adicionar Pasos RMD'); if (!btn) throw new Error('No encuentro el botón Adicionar Pasos RMD');
    const tPM = tablaDe(dPM), antes = filasPMde(dPM).length, previos = new Set(dialogos());
    log(`+ Agregando ${x.codigo} · ${x.desc}`); pulsar(btn);
    const picker = await hasta(() => dialogos().find((y) => !previos.has(y) && /^Adicionar Pasos/i.test(cabeceraDe(y))), 25000);
    if (!picker) throw new Error('No se abrió el selector de pasos');
    await hasta(() => !ocupado(), 25000); await esperar(600);
    const ctlFiltro = (lab) => { const l = [...picker.querySelectorAll('label')].find((y) => norm(y.textContent).replace(/[*:]$/, '') === lab); const el = l && document.getElementById(l.getAttribute('for')); return el && ctlDe(el); };
    const buscar = async () => {
      const k = ctlFiltro('Código Paso'); if (!k) throw new Error('No encuentro el filtro Código Paso');
      k.setValue(String(x.codigo)); k.fireChange({ value: String(x.codigo) });
      const ir = [...picker.querySelectorAll('button')].find((b) => norm(b.textContent) === 'Ir'); pulsar(ir);
      await esperar(1200); await hasta(() => !ocupado(), 25000); await esperar(500);
      const t = tablaDe(picker), n = columnas(t), iC = n.indexOf('CÓDIGO') >= 0 ? n.indexOf('CÓDIGO') : n.indexOf('CODIGO');
      return filasPrincipales(t).find((tr) => celda(tr, iC) && norm(celda(tr, iC).textContent) === String(x.codigo));
    };
    let fila = await buscar();
    if (!fila) {                                       // el selector viene filtrado por la estructura/etiqueta del paso: se quitan
      for (const lab of ['Estructura', 'Etiqueta']) { const c = ctlFiltro(lab); if (c && c.setSelectedItem) { c.setSelectedItem(null); c.setValue(''); c.fireSelectionChange({ selectedItem: null }); c.fireChange({ value: '' }); } }
      await esperar(400); fila = await buscar();
    }
    if (!fila) { const c = botonPorTitulo(picker, 'Cancelar'); if (c) pulsar(c); await hasta(() => !dialogos().includes(picker), 6000); throw new Error(`El código ${x.codigo} no aparece en el catálogo de pasos`); }
    const t = tablaDe(picker), lista = nucleo().byId(t.id.replace(/-listUl$/, '')), item = nucleo().byId(fila.id);
    lista.setSelectedItem(item, true, true);
    await esperar(400);
    const ag = [...picker.querySelectorAll('footer button')].find((b) => norm(b.textContent) === 'Agregar'); if (!ag) throw new Error('No encuentro el botón Agregar');
    pulsar(ag);
    const r = await atenderMensajes(); if (r.problema) throw new Error('El portal respondió: ' + r.problema);
    await hasta(() => !dialogos().includes(picker), 15000); await hasta(() => !ocupado(), 15000); await esperar(800);
    await cargarTodo(tPM);
    if (filasPMde(dPM).length <= antes) throw new Error(`No apareció ${x.codigo} en la lista de procesos menores`);
    log(`✔ ${x.codigo} agregado`);
  }

  const ICONO_COPIAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10H4"/></svg>';
  const ICONO_PEGAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1.5h4v2H6z"/><path d="M4 3h-.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 12.5 3H12"/></svg>';
  const ICONO_AJUSTES = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7"/><circle cx="10.5" cy="4.5" r="1.5"/><circle cx="5.5" cy="11.5" r="1.5"/></svg>';
  const botonIcono = (icono, txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-btn ' + (cls || ''); b.innerHTML = icono + '<span></span>'; b.querySelector('span').textContent = txt; b.addEventListener('click', fn); return b; };
  function instalarBotonesCopia(barra, d, tabla) {
    if (barra.querySelector('.rmd-copiar')) return;
    const bc = botonIcono(ICONO_COPIAR, 'Copiar configuración', 'rmd-copiar', () => copiarPaso(d, tablaDe(d)));
    bc.title = 'Marca la casilla del paso de referencia y pulsa aquí: copia su configuración y sus procesos menores.';
    const bp = botonIcono(ICONO_PEGAR, 'Pegar', 'rmd-pegar', () => pegarPaso(d, tablaDe(d)));
    bp.title = 'Marca la casilla del paso nuevo y pulsa aquí: muestra una vista previa y aplica la configuración y los procesos menores copiados.';
    const sp = document.createElement('span'); sp.className = 'rmd-clip';
    barra.append(bc, bp, sp); pintarEstadoPortapapeles();
  }

  // ---- 10. Panel para activar/desactivar cada mejora -------------------------------------------
  function panel() {
    const p = document.createElement('details'); p.id = 'rmd-ui-panel';
    p.innerHTML = '<summary title="Mejoras de interfaz">' + ICONO_AJUSTES + '</summary><div class="rmd-panel-cuerpo">' +
      OPC.map(([k, t]) => `<label><input type="checkbox" data-k="${k}" ${opc[k] ? 'checked' : ''}> ${t}</label>`).join('') +
      '<div class="rmd-panel-nota">Ctrl+S = Guardar el diálogo abierto</div></div>';
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
