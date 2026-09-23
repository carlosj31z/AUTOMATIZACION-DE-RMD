// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.18.0
// @description  Enter = "Ir", diálogos a medida, columnas ordenadas, estado del RMD, alertas de casillas incoherentes y predecesor obligatorio, copiar/pegar un paso, reordenar y editar Especificaciones, aviso de códigos y de nomenclatura en Asociar Fórmula, botón Nuevo Paso al adicionar pasos, Ver OP sin límite de 5, filtrable y exportable a CSV, Documentos citados, envío directo del maestro de RMD con sus recetas a Status RMD, sesión prolongada automáticamente y más.
// @match        https://*.hana.ondemand.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const VERSION = '1.18.0';                                                       // mantener igual a @version
  const CLAVE = 'rmdUiMejoras';
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
  const guardar = (o) => { try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } };
  const OPC = [
    ['activo', 'Mejoras activas'], ['enter', 'Enter = Ir'], ['ancho', 'Diálogos a medida'], ['columnas', 'Columnas ordenadas'],
    ['ocultar', 'Ocultar Estado Mov., Imagen, Formato, PM OP, Gen PP'], ['grupos', 'Tooltips en las cabeceras'],
    ['depende', 'Depende: tooltip con el paso'], ['sintipo', '"Sin tipo de dato" en rojo y negrita'],
    ['puesto', 'Puesto de Trabajo faltante parpadea'], ['reglas', 'Alertas de casillas incoherentes'],
    ['estado', 'Estado del RMD en la cabecera'], ['pmtitulo', 'Título completo del paso menor'],
    ['filtro', 'Filtro local de pasos'], ['copiar', 'Botones Copiar / Pegar configuración'], ['asociar', 'Asociar fórmulas: avisar códigos distintos a la versión anterior y validar la 1ª línea de Observaciones'],
    ['singuardar', 'Avisar cambios sin guardar + Ctrl+S'], ['exito', 'Cerrar solos los mensajes de éxito'], ['espec', 'Especificaciones: reordenar filas y editar sus textos'],
    ['sesion', 'Prolongar la sesión (clic automático en "Continuar trabajando")'],
    ['nuevopaso', 'Botón "Nuevo Paso" al adicionar pasos (abre Configuración Maestra)'],
    ['verop', 'Ver OP: ver todas y exportar a CSV'],
    ['documentos', 'Documentos citados (Procedimientos/Formatos/Instructivos)'],
    ['statusrmd', 'Botón "Enviar a Status RMD" (maestro completo sin archivo)'],
    ['minusculas', 'Pasar MAYÚSCULAS a minúsculas con redacción correcta (experimental)'],
    ['ortografia', 'Avisar ortografía y concordancia en MAYÚSCULAS, tildes y puntuación en minúsculas (experimental)'],
  ];
  const opc = Object.assign(Object.fromEntries(OPC.map(([k]) => [k, true])), leer());
  const on = (k) => opc.activo && opc[k];
  // Por defecto apagadas: pasar a minúsculas es una redacción automática y la ortografía usa un diccionario reducido; ambas piden revisar el resultado.
  ['minusculas', 'ortografia'].forEach((k) => { if (opc[k] === true && leer()[k] === undefined) opc[k] = false; });

  // ---- 0. Shell de Fiori (fuera del iframe de la app): solo el aviso de sesión por inactividad -------------------------------
  // El aviso "Debido a la inactividad, se finalizará su sesión en N minutos." (Continuar trabajando / Salir) lo pinta el shell del
  // portal, no la app: esta ventana está fuera del iframe ui5appruntime.html, así que se vigila aquí, antes del resto del script.
  // No se puede alargar el tiempo (lo controla el servidor): en su lugar se pulsa "Continuar trabajando" en cuanto aparece.
  if (!/ui5appruntime/.test(location.pathname)) {
    if (window.__rmdSesionShell) return;
    window.__rmdSesionShell = true;
    const activaSesion = () => { const o = leer(); return o.activo !== false && o.sesion !== false; };   // se relee por si se cambia en el otro marco
    const vistos = new WeakSet();
    function prolongarSesion() {
      if (!activaSesion()) return;
      document.querySelectorAll('.sapMDialog, [role=alertdialog]').forEach((d) => {
        if (vistos.has(d) || !d.getClientRects().length || !/inactividad/i.test(d.textContent || '')) return;
        const btn = [...d.querySelectorAll('button')].find((b) => /Continuar trabajando/i.test(b.textContent || ''));
        if (!btn) return;
        vistos.add(d);
        const id = btn.id.replace(/-inner$/, ''), ctl = window.sap && sap.ui && sap.ui.getCore && sap.ui.getCore().byId(id);
        if (ctl && ctl.firePress) ctl.firePress(); else btn.click();
        try { console.info('[RMD] Sesión prolongada automáticamente (aviso de inactividad).'); } catch (e) { /* sin consola */ }
      });
    }
    new MutationObserver(prolongarSesion).observe(document.body, { childList: true, subtree: true });
    setInterval(prolongarSesion, 1000);
    prolongarSesion();
    return;
  }

  // A partir de aquí, solo dentro del iframe de la app UI5 (ui5appruntime.html). Solo cambia la vista; lo único que "pulsa" son
  // botones de búsqueda (Ir), el OK de mensajes de éxito, "Continuar trabajando" del aviso de sesión y, si el usuario lo pide
  // con Ctrl+S, el botón Guardar del diálogo abierto.
  if (window.__rmdUiMejoras) return;
  window.__rmdUiMejoras = true;

  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const NORM = (t) => norm(t).toUpperCase();
  const SIN_ACENTOS = (t) => NORM(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const setTxt = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const visible = (e) => !!e && e.getClientRects().length > 0;                   // (offsetParent es null en elementos con position:fixed)
  const enDialogo = (el) => el.closest && el.closest('.sapMDialog:not(.sapMMessageDialog)');
  // Ventanas que el script ajusta: las del RMD ("<código> - <descripción>"), procesos menores y selectores "Adicionar…".
  // Las demás (p. ej. "Asociar Fórmula") se dejan exactamente como las dibuja el portal.
  const GESTIONADAS = /^\d{6,}\s*-|^Procesos Menores para el Paso|^Adicionar /i;
  const cabecera = (d) => norm((d.querySelector('h2') || {}).textContent);
  const gestionada = (d) => GESTIONADAS.test(cabecera(d));
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
      [...raiz.querySelectorAll('button')].find((b) => visible(b) && norm(b.textContent) === 'Ir');
  }
  function botonPorTitulo(raiz, titulo) {
    return [...raiz.querySelectorAll('button')].find((b) => visible(b) && (b.title === titulo || norm(b.textContent) === titulo));
  }

  // ---- 1. Enter en un filtro = pulsar "Ir"; Ctrl+S = Guardar -----------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && on('singuardar')) {
      const d = dialogos().pop();
      const g = d && botonPorTitulo(d, 'Guardar');
      if (g) { e.preventDefault(); e.stopPropagation(); alGuardar(d); pulsar(g); }
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
  html.rmd-ui .sapMDialog.rmd-g { position: fixed !important; box-sizing: border-box !important; margin: 0 !important; display: flex !important; flex-direction: column !important;
    transition: width .14s ease, height .14s ease, left .14s ease, top .14s ease; }   /* suaviza el "salto" al volver de un diálogo hijo (p. ej. cerrar Procesos Menores) mientras se reaplican estas medidas */
  @media (prefers-reduced-motion: reduce) { html.rmd-ui .sapMDialog.rmd-g { transition: none; } }
  html.rmd-ui .sapMDialog.rmd-g > section { flex: 1 1 auto !important; min-height: 0 !important; overflow: auto !important; scrollbar-gutter: stable; }   /* el ancho útil no cambia al aparecer la barra vertical */
  html.rmd-ui .sapMDialog.rmd-g > footer, html.rmd-ui .sapMDialog.rmd-g > header { flex: 0 0 auto !important; }
  html.rmd-ui .sapMDialog.rmd-pasos {
    width: 98vw !important; max-width: 98vw !important; height: calc(100vh - 16px) !important; max-height: calc(100vh - 16px) !important;
    left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
  html.rmd-ui .sapMDialog.rmd-medio {
    width: min(1120px, 96vw) !important; max-width: 96vw !important; height: auto !important; max-height: calc(100vh - 24px) !important;
    left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
  html.rmd-ui .sapMDialog.rmd-medio.rmd-ancho { width: min(1560px, 97vw) !important; }
  html.rmd-ui .sapMDialog.sapMMessageDialog { position: fixed !important; margin: 0 !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; max-height: calc(100vh - 24px) !important; }

  /* ── Tablas: mismas filas del portal, un poco más de aire; cabecera fija ── */
  html.rmd-cols .sapMDialog.rmd-g table.sapMListTbl { table-layout: fixed; }
  html.rmd-ui .sapMDialog.rmd-g thead th { position: sticky; top: var(--rmd-top, 0px); z-index: 3; background: var(--rmd-cabecera); }
  html.rmd-ui .sapMDialog.rmd-sticky .sapMListHdr { position: sticky; top: var(--rmd-h1, 0px); z-index: 8; background: var(--rmd-barra); }
  html.rmd-cols .sapMDialog table.rmd-compacto thead th { font-size: 12.5px; }
  html.rmd-cols .sapMDialog table.rmd-compacto thead th .sapMColumnHeader { padding-left: 3px; padding-right: 3px; }
  html.rmd-cols .sapMDialog table.rmd-compacto tbody td { padding-left: 4px; padding-right: 4px; }
  html.rmd-cols .sapMDialog.rmd-g thead th, html.rmd-cols .sapMDialog.rmd-g thead th .sapMText { overflow-wrap: normal !important; word-break: keep-all !important; hyphens: none !important; }
  html.rmd-ui .sapMDialog.rmd-g tbody tr.sapMLIB > td { padding-top: 6px; padding-bottom: 6px; vertical-align: middle; }
  html.rmd-ui .sapMDialog.rmd-g tbody tr.sapMLIB:hover > td { background: rgba(27,141,236,.09) !important; }
  html.rmd-ui .sapMDialog.rmd-g td .sapMText, html.rmd-ui .sapMDialog.rmd-g td .sapMLabel { white-space: normal; line-height: 1.35; }
  html.rmd-ui .sapMDialog.rmd-g input:focus { outline: 1px solid var(--rmd-acento) !important; outline-offset: -1px; }

  /* ── Señales sobre la tabla (discretas: tinte suave + marca lateral, sin contornos) ── */
  html.rmd-sintipo td.rmd-td-sintipo input, html.rmd-sintipo td.rmd-td-sintipo .sapMSltLabel { color: var(--rmd-rojo) !important; -webkit-text-fill-color: var(--rmd-rojo) !important; font-weight: 700 !important; }
  @keyframes rmdPulso { 0%, 100% { box-shadow: 0 0 0 1px rgba(255,138,138,.95); background: rgba(255,138,138,.16); } 50% { box-shadow: 0 0 0 1px rgba(255,138,138,.25); background: transparent; } }
  html.rmd-puesto td.rmd-sin-puesto .sapMInputBase, html.rmd-puesto td.rmd-sin-puesto .sapMComboBoxBase { animation: rmdPulso 2.4s ease-in-out infinite; border-radius: 3px; }
  @media (prefers-reduced-motion: reduce) { html.rmd-puesto td.rmd-sin-puesto .sapMInputBase, html.rmd-puesto td.rmd-sin-puesto .sapMComboBoxBase { animation: none; box-shadow: 0 0 0 1px rgba(255,138,138,.9); } }
  html.rmd-reglas td.rmd-marcar    { outline: 2px dashed #ffb02e; outline-offset: -3px; background: rgba(255,176,46,.18) !important; }
  html.rmd-reglas td.rmd-desmarcar { outline: 2px solid #ff4d4d; outline-offset: -3px; background: rgba(255,77,77,.20) !important; }
  html.rmd-reglas td.rmd-falta     { outline: 2px solid #ff4d4d; outline-offset: -3px; }

  /* ── Estado del RMD: etiqueta con contorno, sin relleno ── */
  .rmd-estado { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 2; margin: 0; padding: 0 8px; border: 1px solid currentColor; border-radius: 10px; font: 600 11px/18px var(--rmd-fuente); letter-spacing: .4px; text-transform: uppercase; vertical-align: middle; background: transparent; }
  .rmd-estado.ingresado { color: var(--rmd-acento-texto); } .rmd-estado.autorizado { color: var(--rmd-verde); } .rmd-estado.suspendido { color: var(--rmd-ambar); } .rmd-estado.otro { color: var(--rmd-apagado); }

  /* ── Título del paso menor: hasta 2 líneas ── */
  .sapMDialog h2.rmd-pm-titulo { white-space: normal !important; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; max-width: 100%; }
  .sapMDialog .rmd-con-estado .sapMBarMiddle { box-sizing: border-box; padding-right: 128px; }
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
  /* ── Especificaciones: subir/bajar, asa para arrastrar y textos editables ── */
  .rmd-orden-grupo { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; margin-right: 10px; }
  .rmd-espec-nota { color: var(--rmd-ambar); font: 600 12px var(--rmd-fuente); white-space: nowrap; }
  td.rmd-ed .sapMObjectIdentifierText, td.rmd-ed > .sapMText { display: none !important; }
  td.rmd-ed-desc { position: relative; padding-left: 26px !important; }
  textarea.rmd-edit { display: block; width: 100%; box-sizing: border-box; min-height: 28px; margin: 3px 0 0; padding: 4px 8px; resize: none; overflow: hidden; background: var(--rmd-barra); color: var(--rmd-texto);
    border: 1px solid var(--rmd-borde-campo); border-radius: 3px; font: 14px/1.35 var(--rmd-fuente); }
  td.rmd-ed > textarea.rmd-edit:first-child { margin-top: 0; }
  textarea.rmd-edit:hover { border-color: var(--rmd-acento-texto); } textarea.rmd-edit:focus { outline: 2px solid var(--rmd-acento); outline-offset: -1px; border-color: var(--rmd-acento); }
  textarea.rmd-edit.rmd-vacio { border-color: var(--rmd-rojo); }
  .rmd-grip { position: absolute; left: 5px; top: 50%; width: 16px; height: 26px; margin-top: -13px; display: flex; align-items: center; justify-content: center; color: var(--rmd-apagado); cursor: grab; border-radius: 3px; }
  .rmd-grip:hover { color: var(--rmd-acento-texto); background: rgba(27,141,236,.14); } .rmd-grip:active { cursor: grabbing; }
  .rmd-grip svg { width: 10px; height: 16px; fill: currentColor; pointer-events: none; }
  tr.rmd-espec-mod > td.sapMListTblSelCol { box-shadow: inset 3px 0 0 var(--rmd-ambar); }
  tr.rmd-arrastrando { opacity: .4; } tr.rmd-drop-antes > td { box-shadow: inset 0 2px 0 var(--rmd-acento); } tr.rmd-drop-despues > td { box-shadow: inset 0 -2px 0 var(--rmd-acento); }
  .rmd-copia-grupo { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; margin-right: 10px; }
  .rmd-nuevo-paso-grupo { display: inline-flex; flex: 0 0 auto; align-items: center; margin-left: 10px; vertical-align: middle; }
  .rmd-nuevo-paso-grupo .rmd-btn { height: 32px; }
  .rmd-exportar-op, .rmd-documentos-citados { margin: 0 4px; height: 32px; }
  .rmd-cuenta-verop { align-self: center; margin: 0 4px; color: var(--rmd-apagado); font-size: 12.5px; white-space: nowrap; }
  /* ── Filtro por columna de Ver OP (estilo Autofiltro de Excel): icono junto al encabezado + desplegable de valores ── */
  .rmd-th-filtro { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-left: 4px; padding: 0; border: 0; background: transparent; color: var(--rmd-apagado); cursor: pointer; border-radius: 3px; vertical-align: middle; }
  .rmd-th-filtro:hover { background: rgba(27,141,236,.16); color: var(--rmd-acento-texto); }
  .rmd-th-filtro.activo { color: var(--rmd-acento-texto); }
  .rmd-th-filtro svg { width: 10px; height: 10px; fill: currentColor; }
  .rmd-menu-filtro-col { position: fixed; z-index: 100002; display: flex; flex-direction: column; width: 220px; max-height: 320px; padding: 6px; background: var(--rmd-superficie); border: 1px solid var(--rmd-borde); border-radius: 8px; box-shadow: 0 10px 28px rgba(0,0,0,.45); }
  .rmd-filtro-col-buscar { height: 26px; margin-bottom: 6px; padding: 0 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-barra); color: var(--rmd-texto); font: 12.5px var(--rmd-fuente); }
  .rmd-filtro-col-buscar::placeholder { color: var(--rmd-apagado); }
  .rmd-filtro-col-lista { flex: 1 1 auto; overflow: auto; max-height: 220px; display: flex; flex-direction: column; gap: 1px; }
  .rmd-filtro-col-item { display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-radius: 3px; font-size: 12.5px; color: var(--rmd-texto); cursor: pointer; }
  .rmd-filtro-col-item:hover { background: rgba(27,141,236,.10); }
  .rmd-filtro-col-item input { accent-color: var(--rmd-acento); flex: 0 0 auto; }
  .rmd-filtro-col-pie { display: flex; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--rmd-borde); }
  .rmd-filtro-col-pie .rmd-btn { flex: 1 1 auto; padding: 0 4px; height: 26px; font-size: 11.5px; justify-content: center; }
  .rmd-aa { position: absolute; right: 4px; bottom: 4px; z-index: 2; display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-superficie); color: var(--rmd-acento-texto); cursor: pointer; }
  .rmd-aa:hover { background: var(--rmd-acento); color: #fff; } .rmd-aa svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  textarea.rmd-ortografia { text-decoration: underline wavy var(--rmd-ambar) 1.5px; text-underline-offset: 3px; }
  #rmd-filtro-bar .rmd-clip:empty { display: none; }
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
  /* ── Aviso propio (centrado en la página) en lugar del cuadro del navegador ── */
  .rmd-modal.rmd-modal-aviso { width: min(460px, 92vw); padding: 24px 26px 18px; }
  .rmd-aviso-cab { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; } .rmd-aviso-cab h3 { margin: 0; font-size: 17px; }
  .rmd-aviso-ico { flex: 0 0 auto; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: rgba(240,180,90,.16); color: var(--rmd-ambar); }
  .rmd-aviso-ico svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .rmd-modal-aviso .rmd-modal-cuerpo p { margin: 0 0 8px; } .rmd-modal-aviso .rmd-aviso-ayuda { color: var(--rmd-apagado); font-size: 13px; }
  .rmd-btn.peligro { color: var(--rmd-rojo); border-color: var(--rmd-rojo); } .rmd-btn.peligro:hover:not(:disabled) { background: rgba(255,138,138,.12); border-color: var(--rmd-rojo); }
  .rmd-tabla { width: 100%; margin: 6px 0 14px; border-collapse: collapse; }
  .rmd-tabla th { padding: 6px 8px; border-bottom: 1px solid var(--rmd-borde); text-align: left; font: 600 11px var(--rmd-fuente); letter-spacing: .5px; text-transform: uppercase; color: var(--rmd-apagado); }
  .rmd-tabla td { padding: 6px 8px; border-bottom: 1px solid rgba(128,140,155,.16); text-align: left; vertical-align: top; }
  .rmd-dif { color: var(--rmd-acento-texto); font-weight: 600; } .rmd-atenuada { opacity: .5; } .rmd-nota { color: var(--rmd-apagado); font-size: 13px; }
  .rmd-log { margin: 0; white-space: pre-wrap; font: 12.5px/1.5 ui-monospace, Consolas, monospace; color: var(--rmd-texto); }
  .rmd-toast { position: fixed; left: 50%; bottom: 28px; z-index: 100001; max-width: min(640px, 86vw); transform: translateX(-50%); padding: 10px 16px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-left: 3px solid var(--rmd-verde); border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.35); font: 14px/1.4 var(--rmd-fuente); }
  .rmd-toast.error { border-left-color: var(--rmd-rojo); }

  #rmd-aviso-asociar, #rmd-aviso-nomenclatura { white-space: pre-line; margin: 6px 16px 0; padding: 5px 10px; border-left: 4px solid var(--rmd-ambar); border-radius: 4px; background: rgba(240,180,90,.16); color: var(--rmd-texto); font: 600 12.5px/1.4 var(--rmd-fuente); }
  #rmd-aviso-asociar.ok, #rmd-aviso-nomenclatura.ok { border-left-color: var(--rmd-verde); background: rgba(143,209,158,.08); color: var(--rmd-apagado); font-weight: 400; }
  .rmd-campo-aviso .sapMInputBaseContentWrapper, .rmd-campo-aviso .sapMInputBaseInner { box-shadow: 0 0 0 2px var(--rmd-ambar) !important; border-radius: 2px; }
  /* ── Botón de mejoras (esquina inferior izquierda) y su panel ── */
  #rmd-ui-panel { position: fixed; left: 14px; bottom: 14px; z-index: 99999; font: 13px var(--rmd-fuente); color: var(--rmd-texto); }
  #rmd-ui-panel summary { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; list-style: none; cursor: pointer; border-radius: 50%;
    background: var(--rmd-superficie); color: var(--rmd-acento-texto); border: 1px solid var(--rmd-acento); box-shadow: 0 2px 10px rgba(0,0,0,.4); transition: transform .12s, background .12s; }
  #rmd-ui-panel summary::-webkit-details-marker { display: none; }
  #rmd-ui-panel summary:hover { background: var(--rmd-acento); color: #fff; transform: scale(1.06); }
  #rmd-ui-panel[open] summary { background: var(--rmd-acento); color: #fff; }
  #rmd-ui-panel summary svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  #rmd-ui-panel .rmd-panel-cuerpo { position: absolute; left: 0; bottom: 48px; width: 330px; max-height: calc(100vh - 100px); overflow: auto; padding: 14px 16px 12px;
    background: var(--rmd-superficie); border: 1px solid var(--rmd-borde); border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,.5); }
  #rmd-ui-panel .rmd-panel-cab { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
  #rmd-ui-panel .rmd-panel-cab b { font-size: 15px; font-weight: 600; } #rmd-ui-panel .rmd-panel-cab span { color: var(--rmd-apagado); font-size: 12px; }
  #rmd-ui-panel .rmd-grupo { margin: 9px 0 2px; padding-top: 7px; border-top: 1px solid var(--rmd-borde); color: var(--rmd-apagado); font: 600 11px var(--rmd-fuente); letter-spacing: .6px; text-transform: uppercase; }
  #rmd-ui-panel .rmd-fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; padding: 4px 0; cursor: pointer; line-height: 1.25; }
  #rmd-ui-panel .rmd-fila.maestro { padding: 8px 10px; margin-bottom: 2px; border-radius: 8px; background: rgba(27,141,236,.10); font-weight: 600; }
  #rmd-ui-panel .rmd-fila span { flex: 1 1 auto; }
  #rmd-ui-panel input[type=checkbox] { flex: 0 0 auto; appearance: none; -webkit-appearance: none; position: relative; width: 34px; height: 19px; margin: 0; border-radius: 10px; background: var(--rmd-borde-campo); cursor: pointer; transition: background .15s; }
  #rmd-ui-panel input[type=checkbox]::after { content: ''; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #fff; transition: transform .15s; }
  #rmd-ui-panel input[type=checkbox]:checked { background: var(--rmd-acento); } #rmd-ui-panel input[type=checkbox]:checked::after { transform: translateX(15px); }
  #rmd-ui-panel input[type=checkbox]:focus-visible { outline: 2px solid var(--rmd-acento-texto); outline-offset: 2px; }
  #rmd-ui-panel .rmd-panel-pie { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--rmd-borde); color: var(--rmd-apagado); font-size: 12px; }
  `;
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
  const html = document.documentElement;
  function aplicarClases() {
    [['ancho', 'rmd-ui'], ['columnas', 'rmd-cols'], ['sintipo', 'rmd-sintipo'],
      ['puesto', 'rmd-puesto'], ['reglas', 'rmd-reglas']].forEach(([k, c]) => html.classList.toggle(c, !!on(k)));
  }

  // ---- 3. Reglas: tipo de dato -> casillas ------------------------------------------------------
  const CHK = ['EDIT', 'R. POR', 'V.B.', 'ESTADO CC'];
  const CON_EDIT = new Set(['FECHA Y HORA', 'FECHA', 'HORA', 'NUMEROS', 'RANGO', 'TEXTO', 'LOTE', 'FECHA VENCIMIENTO', 'FORMULA', 'ENTREGA', 'MUESTRACC', 'CANTIDAD', 'NOTIFICACION']);
  const NUMERICOS = new Set(['NUMEROS', 'RANGO', 'FORMULA', 'ENTREGA', 'MUESTRACC']);
  const CLAVES = ['SETUP PRE PROCESO', 'PROCESO', 'SETUP POST PROCESO'];
  // "…APROBACION DE CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE" (nota del granel de Envase) es la redacción vigente y correcta: nombra a Calidad en Operaciones
  const ALTERNATIVA_CALIDAD = /CONTROL DE CALIDAD\s+O\s+CALIDAD EN OPERACIONES|CALIDAD EN OPERACIONES\s+O\s+CONTROL DE CALIDAD/g;
  // Pasos que por su redacción pueden ir sin predecesor (condicionales, en paralelo o de cierre; ver docs/como_se_configura_un_rmd.md §5)
  const INDEPENDIENTES = /\bEN CASO (QUE|DE)\b|BAJO LA SUPERVISION|PARALELAMENTE|EN PARALELO|ENTREGAR LA DOCUMENTACION ORDENADA Y FIRMADA/;
  const LISTAS_SIN_PREDECESOR = /^(RENDIMIENTO|CONDICIONES AMBIENTALES)/;
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
  // versión compacta de los mismos anchos (ventanas de menos de ~1700 px de contenido)
  const ANCHOS_COMPACTOS = {
    'ORDEN': 50, 'CÓDIGO': 70, 'CODIGO': 70, 'TIPO DATO': 108, 'CLAVE MODELO': 80, 'PUESTO TRABAJO': 88, 'VAL. INICIAL': 56, 'VAL. FINAL': 56, 'MARGEN': 54, 'DECIMAL': 56, 'DECIM.': 56,
    'ESTADO CC': 52, 'PM OP': 40, 'GEN PP': 42, 'EDIT': 40, 'R. POR': 40, 'V.B.': 40, 'PROC. MEN.': 52, 'ESTADO': 58,
  };
  const OCULTAS = ['ESTADO MOV.', 'IMAGEN', 'FORMATO', 'PM OP', 'GEN PP'];
  const TIP = {
    'ESTADO CC': 'Estado CC: el paso queda sujeto al estado de Control de Calidad',
    'PM OP': 'PM OP: proceso menor opcional', 'GEN PP': 'Gen PP: genera producto en proceso',
    'EDIT': 'Edit: el operario puede editar el valor', 'R. POR': 'R. Por: registra "Realizado por"',
    'V.B.': 'V.B.: requiere visto bueno del jefe o supervisor', 'DEPENDE': 'Depende: paso predecesor (código y orden)',
    'CLAVE MODELO': 'Clave Modelo: solo Setup Pre Proceso, Proceso y Setup Post Proceso',
    'PROC. MEN.': 'Procesos menores del paso', 'MARGEN': 'Margen de tolerancia', 'DECIMAL': 'Cantidad de decimales',
  };
  // ---- Experimental (apagado por defecto): pasar MAYÚSCULAS a minúsculas con redacción correcta, y avisar de posibles
  // faltas de ortografía. No sustituye una revisión humana: son heurísticas (mayúscula tras punto, un diccionario reducido
  // de acentos y de palabras conocidas, y patrones de terminación habituales del español) y no un corrector real.
  // Nunca escriben solas: solo actúan cuando la persona pulsa el botón "Aa" o revisa el aviso.
  const DICCIONARIO_ACENTOS = Object.fromEntries([
    // palabras frecuentes en procedimientos: se guarda su forma acentuada; la clave (SIN_ACENTOS) es la que se busca
    'según', 'también', 'así', 'además', 'después', 'través', 'única', 'único', 'únicas', 'únicos', 'está', 'están', 'estará', 'estarán', 'será', 'serán', 'aún', 'ésta', 'éste', 'ésa', 'ése', 'cómo', 'cuándo', 'dónde', 'qué', 'quién', 'cuál', 'condición', 'condiciones', 'operación', 'operaciones', 'verificación', 'verificaciones', 'aprobación', 'aprobaciones', 'documentación', 'información', 'preparación', 'fabricación', 'inspección', 'inspecciones', 'sanitización', 'limpieza', 'identificación', 'especificación', 'especificaciones', 'notificación', 'notificaciones', 'formulación', 'presión', 'revisión', 'revisiones', 'decisión', 'versión', 'versiones', 'posición', 'posiciones', 'producción', 'función', 'estación', 'validación', 'calibración', 'evaluación', 'rotación', 'situación', 'acción', 'reacción', 'atención', 'sección', 'sesión', 'expresión', 'impresión', 'dimensión', 'extensión', 'conexión', 'transición', 'distribución', 'administración', 'configuración', 'autorización', 'organización', 'generación', 'agitación', 'filtración', 'destilación', 'granulación', 'compresión', 'dispersión', 'suspensión', 'solución', 'disolución', 'estabilización', 'despeje', 'técnico', 'técnica', 'técnicos', 'técnicas', 'básico', 'básica', 'básicos', 'básicas', 'práctico', 'práctica', 'químico', 'química', 'químicos', 'químicas', 'físico', 'física', 'físicos', 'físicas', 'automático', 'automática', 'automáticos', 'automáticas', 'electrónico', 'electrónica', 'público', 'pública', 'lógico', 'lógica', 'crítico', 'crítica', 'críticos', 'críticas', 'numérico', 'numérica', 'específico', 'específica', 'específicos', 'específicas', 'periódico', 'periódica', 'periódicamente', 'máximo', 'máxima', 'máximos', 'máximas', 'mínimo', 'mínima', 'mínimos', 'mínimas', 'rápido', 'rápida', 'rápidamente', 'código', 'códigos', 'número', 'números', 'área', 'áreas', 'línea', 'líneas', 'máquina', 'máquinas', 'título', 'período', 'régimen', 'límite', 'límites', 'análisis', 'fórmula', 'fórmulas', 'estándar', 'estándares', 'párrafo', 'ítem', 'ítems', 'módulo', 'módulos', 'símbolo', 'símbolos', 'válido', 'válida', 'válidos', 'válidas',
    // ampliación: verbos conjugados y términos frecuentes en instructivos de manufactura
    'verificará', 'verificarán', 'deberá', 'deberán', 'podrá', 'podrán', 'tendrá', 'tendrán', 'permitirá', 'permitirán',
    'requerirá', 'requerirán', 'garantizará', 'asegurará', 'confirmará', 'registrará', 'indicará', 'señalará', 'señal', 'señales',
    'válvula', 'válvulas', 'rótulo', 'rótulos', 'próximo', 'próxima', 'próximos', 'próximas', 'último', 'última', 'últimos', 'últimas',
    'ningún', 'algún', 'algúnos', 'día', 'días', 'ahí', 'allí', 'aquí', 'útil', 'útiles', 'fácil', 'fáciles', 'difícil', 'difíciles',
    'exposición', 'composición', 'disposición', 'descripción', 'inscripción', 'prescripción', 'excepción', 'concepción', 'percepción',
    'interrupción', 'producción', 'reproducción', 'introducción', 'conducción', 'deducción', 'reducción', 'construcción', 'destrucción',
    'instrucción', 'obstrucción', 'traducción', 'protección', 'inyección', 'proyección', 'reflexión', 'conexión', 'perfección',
    'confección', 'infección',
  ].map((p) => [SIN_ACENTOS(p), p]));
  delete DICCIONARIO_ACENTOS[SIN_ACENTOS('mas')];      // "mas" (cantidad, con tilde) es ambiguo con "mas" (pero, sin tilde): no se acentua solo
  // Palabras "conocidas" para el aviso de ortografia: nexos y palabras cortas muy frecuentes, mas los terminos propios
  // de este portal (recogidos de las propias reglas de este script) para no marcarlos como sospechosos.
  const PALABRAS_CORTAS = ('que de la el los las en con para por se su sus un una unos unas al del mas segun tambien asi cuando '
    + 'donde hasta entre sobre antes despues durante mientras cada todo toda todos todas otro otra otros otras este esta estos '
    + 'estas ese esa esos esas aquel aquella sin no si ya aun aunque pero porque como muy poco mucho menos tanto tal cual '
    + 'cuales quien quienes cuyo cuyos y o u e ni le les lo nos os nuestro nuestra vuestro vuestra mi tu su fue ser es son era '
    + 'eran sera seran esta estan estara estaran hay ha han habia debe deben debera deberan puede pueden podra podran').split(' ');
  const PALABRAS_TERMINO = Object.keys(NOMBRE_CASILLA).concat(Object.values(TIP).join(' ').split(/\W+/), OPC.map(([, t]) => t).join(' ').split(/\W+/));
  const PALABRAS_CONOCIDAS = new Set([...PALABRAS_CORTAS, ...Object.values(DICCIONARIO_ACENTOS)].map(SIN_ACENTOS)
    .concat(PALABRAS_TERMINO.map(SIN_ACENTOS)).filter(Boolean));
  // Terminaciones habituales del espanol (verbos conjugados, adverbios en -mente, sustantivos/adjetivos comunes):
  // si una palabra termina asi, se da por conocida aunque no este en la lista (evita avisos de sobra; el objetivo es
  // detectar solo palabras claramente raras, no hacer un corrector completo).
  const TERMINACIONES_CONOCIDAS = /(?:CION|CIONES|SION|SIONES|MENTE|ANDO|IENDO|ADO|ADA|ADOS|ADAS|IDO|IDA|IDOS|IDAS|AR|ER|IR|ARON|IERON|ABA|ABAN|IA|IAN|ARSE|ERSE|IRSE|OSO|OSA|OSOS|OSAS|IVO|IVA|IVOS|IVAS|BLE|BLES|DAD|DADES|EZ|EZA|MIENTO|MIENTOS|ANTE|ANTES|ENTE|ENTES|OS|AS|ES|ON|ONES|TOR|TORA|TORES|TORAS|DOR|DORA|DORES|DORAS|ERO|ERA|EROS|ERAS|ARIO|ARIA|ARIOS|ARIAS|ISTA|ISTAS|URA|URAS|ENCIA|ENCIAS|ANCIA|ANCIAS|ISMO|ISMOS|ALES)$/;
  // sustantivos singulares que ya terminan en "S" (no son plural): evita falsos avisos de concordancia artículo-sustantivo
  const INVARIABLES_EN_S = new Set(['ANALISIS', 'DOSIS', 'CRISIS', 'VIRUS', 'TORAX', 'OASIS', 'SINTESIS', 'TESIS', 'CARIES', 'LUNES',
    'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'ATLAS', 'PARENTESIS', 'ENFASIS', 'GAS', 'YES', 'PLUS', 'BUS', 'STATUS', 'CAMPUS']);
  // mismo patron que src/rmd_automation/referencias.py (Tipo I/P/F + Area + sufijo -NNN obligatorio)
  const PATRON_REFERENCIA_JS = /\b[IPF][A-Z0-9]{3}-[A-Z]?\d{3}\b/;
  // siglas que se conservan tal cual (no se protege ninguna otra secuencia en mayusculas: el texto de entrada ya viene
  // todo en mayusculas, asi que "proteger cualquier palabra en mayusculas" dejaria todo el texto sin tocar)
  const SIGLAS_CONOCIDAS = new Set(['RMD', 'CC', 'UM', 'OP', 'PM', 'SAP', 'GMP', 'ID', 'OK', 'CT']);
  const MARCA = (i) => String.fromCharCode(1) + i + String.fromCharCode(2);
  const RX_MARCA = new RegExp(String.fromCharCode(1) + '(\\d+)' + String.fromCharCode(2), 'g');
  function capitalizarOracion(texto) {
    const CONSERVAR = [];
    let t = String(texto || '');
    t = t.replace(new RegExp(PATRON_REFERENCIA_JS.source, 'g'), (m) => { CONSERVAR.push(m); return MARCA(CONSERVAR.length - 1); });
    t = t.replace(/\b[A-ZÑ]{2,}\b/g, (m) => { if (!SIGLAS_CONOCIDAS.has(m)) return m; CONSERVAR.push(m); return MARCA(CONSERVAR.length - 1); });
    t = t.toLowerCase();
    t = t.replace(/(^\s*|[.!?¡¿]\s+|\n\s*)([a-záéíóúñ])/g, (m, pre, letra) => pre + letra.toUpperCase());
    t = t.replace(RX_MARCA, (_, i) => CONSERVAR[+i]);
    return t;
  }
  function restaurarAcentos(texto) {
    return String(texto || '').replace(/\p{L}+/gu, (palabra) => {
      const clave = SIN_ACENTOS(palabra); const acentuada = DICCIONARIO_ACENTOS[clave]; if (!acentuada) return palabra;
      const conMayuscula = palabra[0] === palabra[0].toUpperCase() && palabra[0] !== palabra[0].toLowerCase();
      return conMayuscula ? acentuada[0].toUpperCase() + acentuada.slice(1) : acentuada;
    });
  }
  const mejorarTexto = (texto) => restaurarAcentos(capitalizarOracion(texto));
  function revisarOrtografia(texto) {
    const sinCodigos = String(texto || '').replace(new RegExp(PATRON_REFERENCIA_JS.source, 'g'), ' ');
    const vistas = new Set(); const dudosas = [];
    sinCodigos.replace(/[A-ZÁÉÍÓÚÑ]{3,}/g, (m) => {
      const clave = SIN_ACENTOS(m); if (PALABRAS_CONOCIDAS.has(clave) || TERMINACIONES_CONOCIDAS.test(clave) || vistas.has(clave)) return m;
      vistas.add(clave); dudosas.push(m); return m;
    });
    return dudosas;
  }
  // Concordancia de número entre artículo y el sustantivo que le sigue (EL/LA/UN/UNA = singular; LOS/LAS/UNOS/UNAS = plural).
  // Heurística deliberadamente conservadora (con excepciones de sustantivos invariables en "S"): puede haber falsos avisos
  // en casos raros del español, pero evita marcar de más. No revisa nada más de la oración (ni orden ni otras reglas).
  function revisarConcordancia(texto) {
    const sinCodigos = String(texto || '').replace(new RegExp(PATRON_REFERENCIA_JS.source, 'g'), ' ');
    const avisos = []; const vistos = new Set();
    sinCodigos.replace(/\b(EL|LA|LOS|LAS|UN|UNA|UNOS|UNAS)\s+([A-ZÁÉÍÓÚÑ]{3,})\b/g, (m, art, palabra) => {
      const clave = SIN_ACENTOS(palabra);
      if (PALABRAS_CORTAS.includes(clave.toLowerCase())) return m;   // nexo (que, cual…), no es sustantivo
      const singular = art === 'EL' || art === 'LA' || art === 'UN' || art === 'UNA';
      const terminaEnS = /S$/.test(palabra), clavePar = art + ' ' + palabra;
      if (vistos.has(clavePar)) return m;
      if (singular && terminaEnS && !INVARIABLES_EN_S.has(clave)) { vistos.add(clavePar); avisos.push(`"${art} ${palabra}" (artículo singular, palabra en plural)`); }
      else if (!singular && !terminaEnS && !INVARIABLES_EN_S.has(clave)) { vistos.add(clavePar); avisos.push(`"${art} ${palabra}" (artículo plural, palabra en singular)`); }
      return m;
    });
    return avisos;
  }
  // Para texto ya en minúsculas (tras "Aa"): tildes que faltan (según el mismo diccionario que restaurarAcentos) y falta de
  // puntuación final. No revisa ortografía por palabra aquí (en minúsculas casi todo son palabras válidas del diccionario).
  function revisarTildesYPuntuacion(texto) {
    const t = String(texto || ''); const avisos = []; const vistas = new Set();
    t.replace(new RegExp(PATRON_REFERENCIA_JS.source, 'g'), ' ').replace(/\p{L}+/gu, (palabra) => {
      const clave = SIN_ACENTOS(palabra), correcta = DICCIONARIO_ACENTOS[clave];
      if (correcta && palabra.toLowerCase() !== correcta.toLowerCase() && !vistas.has(clave)) { vistas.add(clave); avisos.push(`"${palabra}" podría llevar tilde: "${correcta}"`); }
      return palabra;
    });
    const limpio = norm(t);
    if (limpio && !/[.!?…]["'）\])]?$/.test(limpio)) avisos.push('Falta el signo de puntuación final (punto).');
    return avisos;
  }

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

  function quitarAnchos(tabla, ths) {
    ths.forEach((th) => { th.style.removeProperty('width'); th.style.removeProperty('min-width'); });
    tabla.style.removeProperty('width');
  }
  // Reparte el ancho: columnas con ancho fijo (escaladas hasta un 20 % si la ventana es estrecha) y la descripción con lo que sobra,
  // nunca menos de un mínimo; si no cabe, la tabla se ensancha y aparece desplazamiento horizontal (en vez de aplastar la descripción).
  // mínimos que mantienen legibles las cabeceras (una palabra nunca se parte) y los controles de cada columna
  const MIN_FIJOS = { 'ORDEN': 48, 'TIPO DATO': 104, 'CLAVE MODELO': 76, 'PUESTO TRABAJO': 84, 'VAL. INICIAL': 54, 'VAL. FINAL': 54, 'MARGEN': 52, 'DECIMAL': 54, 'DECIM.': 54 };
  function ordenarColumnas(tabla, ths, nombres, filas, tipoTabla) {
    const cont = tabla.closest('.sapMDialogScrollCont') || tabla.parentElement;
    const C = Math.floor(cont ? cont.clientWidth : 0); if (C < 300) return;               // aún sin medidas
    const compacto = C < 1700, iDep = nombres.indexOf('DEPENDE'), iCod = nombres.findIndex((n) => n === 'CÓDIGO' || n === 'CODIGO'), iTipo = nombres.indexOf('TIPO DATO');
    tabla.classList.toggle('rmd-compacto', compacto);                                       // cabeceras algo más pequeñas en ventanas estrechas
    const minDesc = tipoTabla === 'pasos' ? (C >= 1600 ? 340 : C >= 1500 ? 300 : C >= 1400 ? 250 : 225) : (tipoTabla === 'pm' ? 260 : tipoTabla === 'espec' ? 520 : 240);
    // en ventanas estrechas la columna "Estado" (siempre "Activo") se oculta para dar espacio a las casillas
    const iEst = nombres.indexOf('ESTADO');
    const ocultarEstado = tipoTabla === 'pasos' && compacto && C < 1500 && iEst >= 0 && filas.length > 0 && filas.every((tr) => celda(tr, iEst) && norm(celda(tr, iEst).textContent) === 'Activo');
    if (ocultarEstado) tabla.dataset.rmdOcultaEstado = '1'; else delete tabla.dataset.rmdOcultaEstado;
    let depW = null;
    if (iDep >= 0) {                                                                       // Depende: ancho para ver siempre el valor completo
      let max = anchoTexto(ths[iDep], 'Depende');
      filas.forEach((tr) => { const i = inputDe(celda(tr, iDep)); if (i && i.value) max = Math.max(max, anchoTexto(i, i.value)); });
      depW = Math.min(Math.max(max + 62, compacto ? 116 : 130), 300);
    }
    let tipoW = null;
    if (iTipo >= 0) {                                                                      // Tipo Dato: ancho para que "Verificación Check", "Realizado por"… no se corten
      let max = anchoTexto(ths[iTipo], 'Tipo Dato');
      filas.forEach((tr) => { const i = inputDe(celda(tr, iTipo)); if (i && i.value) max = Math.max(max, anchoTexto(i, i.value)); });
      // tope 180 (no 260): "Realizado por y Visto bueno" (el valor más largo real) aun así se trunca un poco, pero deja
      // sitio a la Descripción en tablas con muchas columnas (p. ej. Fabricación); los valores cortos habituales
      // ("Verificación Check", "Sin tipo de dato", "Notificación"…) caben completos de sobra con este tope.
      tipoW = Math.min(Math.max(max + 46, compacto ? 110 : 130), 180);
    }
    let codW = 0;                                                                          // Código: que un código de 6-10 dígitos no se parta
    if (iCod >= 0) filas.slice(0, 60).forEach((tr) => { const td = celda(tr, iCod); if (td) { const cs = getComputedStyle(td); codW = Math.max(codW, anchoTexto(td, norm(td.textContent)) + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + 6); } });
    const minimo = (th, i, n) => {
      const palabras = norm(th.textContent).split(' ').filter(Boolean);
      const ih = th.querySelector('.sapMColumnHeader') || th, cs = getComputedStyle(ih), cs0 = getComputedStyle(th);
      const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (ih === th ? 0 : (parseFloat(cs0.paddingLeft) || 0) + (parseFloat(cs0.paddingRight) || 0));
      const cab = palabras.length ? Math.max(...palabras.map((p) => anchoTexto(th, p))) + pad + 4 : 0;
      return Math.max(38, MIN_FIJOS[n] || 0, cab, i === iCod ? codW : 0);
    };
    const fijos = ths.map((th, i) => {
      const n = nombres[i];
      if ((on('ocultar') && OCULTAS.includes(n)) || (ocultarEstado && n === 'ESTADO')) return 0;
      if (/^DESCRIPCI/.test(n) || (tipoTabla === 'espec' && n === 'ESPECIFICACIONES')) return null;   // columnas flexibles (en Especificaciones: descripción y texto de la especificación)
      if (i === iDep) return depW;
      if (i === iTipo) return tipoW;
      const w = (compacto && ANCHOS_COMPACTOS[n]) || ANCHOS[n]; if (w) return w;
      if (n === '' && th.classList.contains('sapMListTblSelCol')) return compacto ? 34 : 36;
      if (n === '' && th.classList.contains('sapMListTblNavCol')) return compacto ? 28 : 40;
      if (n === '' && /sapMListTbl(Highlight|Navigated)Col/.test(th.className)) return 0;   // franjas de resaltado/navegación: sin ancho en el portal
      if (getComputedStyle(th).display === 'none') return 0;
      if (!th.dataset.rmdW0) th.dataset.rmdW0 = String(Math.max(40, Math.round(th.getBoundingClientRect().width)));   // sin regla propia: conserva su ancho
      return +th.dataset.rmdW0;
    });
    const suma = fijos.reduce((a, w) => a + (w || 0), 0);
    const controles = fijos.reduce((a, w, i) => a + (nombres[i] === '' ? (w || 0) : 0), 0);   // selección y navegación no se escalan
    const sumaEscalable = suma - (depW || 0) - (tipoW || 0) - controles;                     // Depende y Tipo Dato no se comprimen: deben verse completos
    const f = Math.max(0.8, Math.min(1, (C - minDesc - (depW || 0) - (tipoW || 0) - controles) / Math.max(sumaEscalable, 1)));
    const finales = fijos.map((w, i) => {
      if (w == null) return null; if (w === 0) return 0; if (i === iDep || i === iTipo) return w;
      const n = nombres[i], esControl = n === '' ;                                          // selección y navegación no se tocan
      return esControl ? w : Math.max(minimo(ths[i], i, n), Math.round(w * f));
    });
    const sumaF = finales.reduce((a, w) => a + (w || 0), 0), W = Math.max(tipoTabla === 'espec' ? 420 : Math.min(minDesc, 205), C - sumaF);   // la descripción cede hasta 205 px antes de que aparezca desplazamiento horizontal
    const wDes = tipoTabla === 'espec' ? Math.round(W * 0.4) : W, wEsp = W - wDes;
    ths.forEach((th, i) => {
      const w = finales[i] === null ? (tipoTabla === 'espec' && nombres[i] === 'ESPECIFICACIONES' ? wEsp : wDes) : finales[i]; if (!w) return;
      th.style.setProperty('width', w + 'px', 'important'); th.style.setProperty('min-width', w + 'px', 'important');
    });
    tabla.style.setProperty('width', (sumaF + W) + 'px', 'important');
  }

  // Nombre de la lista de pasos que muestra la ventana (PRECAUCIONES, NOTAS IMPORTANTES…, una etiqueta del PROCEDIMIENTO…). El portal no lo escribe en la ventana,
  // pero sí en su modelo: las filas de una etiqueta llevan mdEsEtiquetaId (y listMdEsEtiqueta trae su nombre); las de una estructura, el nombre está en
  // headerAddEstructura.descripcion_est. Si el modelo no está disponible se deduce del contenido (Rendimiento: MuestraCC/Entrega; Precauciones: su primer paso).
  function nombreDeLista(tabla, filas, iTipo, iDes) {
    try {
      const ctl = sap.ui.getCore().byId(tabla.id.replace(/-listUl$/, '')), it = ctl && ctl.getItems && ctl.getItems()[0], c = it && contextoDe(it), fila = c && c.getObject();
      let vista = ctl; while (vista && !vista.getController) vista = vista.getParent && vista.getParent();
      if (fila && vista) {
        const idEtq = fila.mdEsEtiquetaId_mdEsEtiquetaId;
        const nombre = idEtq
          ? ((vista.getModel('listMdEsEtiqueta').getData().find((e) => e.mdEsEtiquetaId === idEtq) || {}).etiquetaId || {}).descripcion
          : (vista.getModel('headerAddEstructura').getData() || {}).descripcion_est;
        if (nombre) return SIN_ACENTOS(nombre);
      }
    } catch (e) { /* sin modelo: se deduce del contenido */ }
    const tipos = filas.map((tr) => SIN_ACENTOS((inputDe(celda(tr, iTipo)) || {}).value || ''));
    if (tipos.some((x) => x === 'MUESTRACC' || x === 'ENTREGA')) return 'RENDIMIENTO';
    const d0 = filas[0] && iDes >= 0 ? SIN_ACENTOS(celda(filas[0], iDes) && celda(filas[0], iDes).textContent) : '';
    return /^EVITAR EL INGRESO AL AREA DE TRABAJO/.test(d0) ? 'PRECAUCIONES' : '';
  }
  function ajustarTabla(tabla) {
    const d = enDialogo(tabla); if (!d || !gestionada(d)) return;
    d.classList.add('rmd-g');
    const ths = [...tabla.querySelectorAll('thead th')];
    if (ths.length < 5) return;
    const nombres = ths.map((th) => NORM(th.textContent));
    const esPasos = nombres.includes('TIPO DATO') && nombres.includes('DEPENDE');   // Fabricación, Notas, Rendimiento…
    const esPM = nombres.includes('CANTIDAD INSUMOS');
    const esEspec = nombres.includes('ESPECIFICACIONES') && nombres.includes('TIPO DATO') && !nombres.includes('DEPENDE');
    const filas = filasPrincipales(tabla);

    // tamaño del diálogo
    const grande = esPasos && filas.length > 12;                      // muchas filas: casi pantalla completa; pocas: solo el alto que necesitan
    d.classList.toggle('rmd-pasos', grande);
    d.classList.toggle('rmd-medio', !grande);
    d.classList.toggle('rmd-ancho', !grande && (esPM || ths.length > 12));
    d.classList.toggle('rmd-sticky', esPasos || esPM);

    // tooltips de las cabeceras
    ths.forEach((th, i) => { if (on('grupos') && TIP[nombres[i]]) th.title = TIP[nombres[i]]; });
    if (on('columnas')) ordenarColumnas(tabla, ths, nombres, filas, esPasos ? 'pasos' : esPM ? 'pm' : esEspec ? 'espec' : 'otro'); else { quitarAnchos(tabla, ths); delete tabla.dataset.rmdOcultaEstado; }
    // columnas ocultas
    ths.forEach((th, i) => {
      const oculta = (on('ocultar') && OCULTAS.includes(nombres[i])) || (tabla.dataset.rmdOcultaEstado === '1' && nombres[i] === 'ESTADO');
      th.style.display = oculta ? 'none' : '';
      filas.forEach((tr) => { if (celda(tr, i)) celda(tr, i).style.display = oculta ? 'none' : ''; });
    });

    const iDep = nombres.indexOf('DEPENDE'), iTipo = nombres.indexOf('TIPO DATO'), iOrd = nombres.indexOf('ORDEN'), iDes = nombres.findIndex((n) => /^DESCRIPCI/.test(n));
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
    // Predecesores: todo paso con tipo de dato lleva predecesor (Depende), salvo el primero de PRECAUCIONES (cabeza de la cadena), los pasos
    // condicionales o en paralelo y las listas que no los usan (RENDIMIENTO, CONDICIONES AMBIENTALES).
    const lista = esPasos ? nombreDeLista(tabla, filas, iTipo, iDes) : ''; d.__rmdListaEfectiva = lista;
    const tipadoFila = (tr) => { const t = SIN_ACENTOS((inputDe(celda(tr, iTipo)) || {}).value || ''); return !!t && t !== 'SIN TIPO DE DATO'; };
    const aplicaPred = esPasos && iDep >= 0 && !LISTAS_SIN_PREDECESOR.test(lista);
    const kCabeza = aplicaPred && /^PRECAUCIONES/.test(lista) ? filas.findIndex(tipadoFila) : -1;
    filas.forEach((tr, k) => {
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
      // muestreo (cantidad / fecha-hora de muestreo, exactamente) llevan Estado CC; los de muestreo, además, Edit.
      // Excepciones vistas en RMD autorizados: CONDICIONES AMBIENTALES (Realizado por + V.B. cuando el proceso lleva luz inactínica),
      // CONTRAMUESTRA (MuestraCC solo con Edit) y la verificación del jefe/supervisor ("...VERIFICA EL PROCESO DE MUESTREO..."),
      // que solo menciona "muestreo" de paso pero no es a Control de Calidad a quien le toca verificarla.
      if (regla && t === 'REALIZADO POR' && /^CONDICIONES AMBIENTALES/.test(desc)) delete regla['V.B.'];
      if (regla && t === 'MUESTRACC' && /CONTRAMUESTRA/.test(desc)) delete regla['ESTADO CC'];
      if (regla && t === 'REALIZADO POR' && /^(EL )?PERSONAL DE CALIDAD|^CALIDAD EN OPERACIONES (REGISTRA|REALIZA|INGRESA)/.test(desc)) regla['ESTADO CC'] = true;
      if (esPM && regla && /^CANTIDAD MUESTREADA|^FECHA\s*\/?\s*HORA DE MUESTREO/.test(desc)) { regla.EDIT = true; regla['ESTADO CC'] = true; }
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
        else if (/CONTROL DE CALIDAD|APROBACION DE .*CONTROL DE PROCESO/.test(desc.replace(ALTERNATIVA_CALIDAD, 'CALIDAD EN OPERACIONES'))) marcarFalta(iDes, 'Reemplazar "CONTROL DE CALIDAD" por "CALIDAD EN OPERACIONES" (solo debe quedar Calidad en Operaciones)');
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
        else if (!v && t && aplicaPred && k !== kCabeza && !INDEPENDIENTES.test(desc)) {
          // (el portal vacía el predecesor de la fila en cuanto se marca la casilla Estado CC: se avisa para asignarlo después de marcarla)
          const cc = iChk['ESTADO CC'] >= 0 && celda(tr, iChk['ESTADO CC']) && marcada(celda(tr, iChk['ESTADO CC']));
          marcarFalta(iDep, 'Falta el predecesor (Depende): todo paso con tipo de dato debe depender de un paso anterior con tipo de dato; solo se omite en pasos condicionales o en paralelo.' +
            (cc ? ' Ojo: el portal vacía este campo al marcar Estado CC; asígnalo después de marcarla.' : ''));
        }
      }
      if (avisos.length) { alertas += avisos.length; primeras.push({ tr, texto: avisos[0] }); }
    });
    const previo = tabla.__rmdAlertas;
    tabla.__rmdAlertas = { n: alertas, filas: primeras, sig: previo ? previo.sig : 0 };

    if (esPasos && (on('filtro') || on('reglas'))) filtroLocal(tabla, true);
    else if (esPasos) { const bar = d.querySelector('#rmd-filtro-bar'); if (bar) bar.remove(); filas.forEach((tr) => tr.style.removeProperty('display')); }
    if (esPasos && on('copiar')) instalarBotonesCopia(d);
    else if (esPasos) d.querySelectorAll('.rmd-copia-grupo, .rmd-clip').forEach((e) => e.remove());
    else if (esPM && on('reglas')) filtroLocal(tabla, false);
    else if (esPM) { const bar = d.querySelector('#rmd-filtro-bar'); if (bar) bar.remove(); }
    actualizarBarra(d, tabla);
    if (esEspec) sincronizarEspec(d, tabla);
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
      if (conFiltro && on('copiar')) { const sp = document.createElement('span'); sp.className = 'rmd-clip'; barra.appendChild(sp); pintarEstadoPortapapeles(); }
      barra.querySelector('button').addEventListener('click', () => irAlSiguiente(d));
    }
    aplicarFiltro(d);
  }
  function aplicarFiltro(d) {
    const barra = d.querySelector('#rmd-filtro-bar'), tabla = d.querySelector('table.sapMListTbl'); if (!barra || !tabla) return;
    const inp = barra.querySelector('input');
    if (inp) { if (!on('filtro')) { inp.value = ''; inp.style.display = 'none'; } else inp.style.display = ''; }   // filtro apagado: solo alertas
    const q = NORM(inp ? inp.value : '');
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
      if (!gestionada(d)) return;
      const h2 = d.querySelector('header h2.sapMTitle, h2.sapMTitle'); if (!h2) return;
      const barra = h2.closest('.sapMBar') || h2.parentElement;
      let b = barra.querySelector('.rmd-estado');
      if (on('estado') && estado) {
        if (!b) { b = document.createElement('span'); b.className = 'rmd-estado'; barra.appendChild(b); }
        barra.classList.add('rmd-con-estado');
        const cls = /ingres/i.test(estado) ? 'ingresado' : /autoriz/i.test(estado) ? 'autorizado' : /suspend/i.test(estado) ? 'suspendido' : 'otro';
        b.className = 'rmd-estado ' + cls; setTxt(b, estado.toUpperCase());
        b.title = cls === 'ingresado' ? 'RMD en estado Ingresado: se puede modificar' : `RMD ${estado}: revisar antes de modificar`;
      } else if (b) { b.remove(); barra.classList.remove('rmd-con-estado'); }
      if (on('pmtitulo') && /^Procesos Menores para el Paso/i.test(norm(h2.textContent))) {
        tituloPMCompleto(h2);
        h2.classList.add('rmd-pm-titulo'); h2.title = norm(h2.textContent); barra.classList.add('rmd-pm-cab');
      }
      if (/^Adicionar Pasos/i.test(cabecera(d))) { if (on('nuevopaso')) instalarBotonNuevoPaso(d); else quitarBotonNuevoPaso(d); }
    });
  }

  // ---- 6b. Ventana "Asociar Fórmula": avisar si Código Agrupador / Código faltan o difieren de la versión anterior -----------
  // Los datos de todas las versiones están en el modelo de la tabla principal (codAgrupadorReceta = "Código Agrupador",
  // codDefectoReceta = "Código"; codigoversionprincipal une las versiones de un mismo RMD). Solo se lee: no se cambia nada.
  const CACHE_RMD = new Map();                                       // código -> datos de las filas que la tabla principal ha mostrado en esta sesión
  function tablaPrincipal() {
    if (!(window.sap && sap.ui && sap.ui.getCore)) return null;                                // UI5 aún cargando
    const t = [...document.querySelectorAll('table')].find((x) => x.id && /-listUl$/.test(x.id) && !x.closest('[role=dialog]'));
    const ctl = t && sap.ui.getCore().byId(t.id.replace(/-listUl$/, '')); return ctl && ctl.getItems ? ctl : null;
  }
  function filasDe(ctl) {
    const filas = [];
    ctl.getItems().forEach((it) => {
      const nombres = Object.keys(it.oBindingContexts || {}); const c = nombres.length && it.getBindingContext(nombres[0] === 'undefined' ? undefined : nombres[0]); const o = c && c.getObject();
      if (o && o.codigo != null) filas.push({ codigo: o.codigo, version: o.version, codigoversionprincipal: o.codigoversionprincipal, codAgrupadorReceta: o.codAgrupadorReceta, codDefectoReceta: o.codDefectoReceta });
    });
    return filas;
  }
  const cachearFilas = (ctl) => filasDe(ctl).forEach((o) => CACHE_RMD.set(String(o.codigo), o));
  // Se recuerdan las filas de cada búsqueda para poder comparar con la versión anterior aunque ahora la lista esté filtrada por un solo código
  function vigilarListaPrincipal() {
    const ctl = tablaPrincipal(); if (!ctl || ctl.__rmdVigila) return;
    ctl.__rmdVigila = true; ctl.attachUpdateFinished(() => cachearFilas(ctl)); cachearFilas(ctl);
  }
  function filaPrincipal(codigo) {
    const ctl = tablaPrincipal(); if (ctl) cachearFilas(ctl);
    const filas = [...CACHE_RMD.values()];
    const actual = CACHE_RMD.get(String(codigo)); if (!actual) return { filas, actual: null, anterior: null };
    const cadena = String(actual.codigoversionprincipal || actual.codigo);
    const previas = filas.filter((o) => (String(o.codigoversionprincipal || o.codigo) === cadena || String(o.codigo) === cadena) && Number(o.version) < Number(actual.version));
    previas.sort((a, b) => Number(b.version) - Number(a.version));
    return { filas, actual, anterior: previas[0] || null };
  }
  function campoDe(d, etiqueta) {
    const lab = [...d.querySelectorAll('label')].find((l) => norm(l.getAttribute('aria-label') || l.textContent).replace(/[:*]\s*$/, '') === etiqueta);
    return lab && lab.getAttribute('for') ? document.getElementById(lab.getAttribute('for')) : null;
  }
  function valorDeCampo(d, etiqueta) { const el = campoDe(d, etiqueta); return el ? norm(el.value) : null; }
  function marcarCampo(d, etiqueta, mal) {
    const el = campoDe(d, etiqueta), base = el && el.closest('.sapMInputBase'); if (base) base.classList.toggle('rmd-campo-aviso', !!mal);
  }
  // Nomenclatura de la 1ª línea de "Observaciones" en Asociar Fórmula: AAAAMMDD + 2 iniciales - prioridad - Ccomplejidad - FI1.0 - FA1.0 - Ffase
  // (ejemplo real visto: "20260918CJ-1-C2-FI1.0-FA1.0-F2"). FI y FA son literales fijos ("1.0"): si alguna vez varían, hay que revisar esta regla.
  function analizarNomenclatura(linea) {
    const bruta = (linea || '').trim();
    if (!bruta) return { ok: false, avisos: ['La primera línea de Observaciones está vacía: falta la nomenclatura (AAAAMMDD+iniciales-prioridad-Ccomplejidad-FI1.0-FA1.0-Ffase).'] };
    // Solo el primer "token" (hasta el primer espacio) es la nomenclatura: lo que venga después de un espacio es texto
    // aparte (p. ej. "PENDIENTE CC" u otra nota) y no se evalúa ni cuenta como "sobra".
    const l = bruta.split(/\s+/)[0];
    const avisos = [];
    const mFecha = /^(\d{4})(\d{2})(\d{2})/.exec(l);
    let resto = l, fechaTxt = '';
    if (!mFecha) { avisos.push('Debe empezar con la fecha en formato AAAAMMDD (8 dígitos).'); }
    else {
      const [bruto, a, m, dd] = mFecha, f = new Date(Number(a), Number(m) - 1, Number(dd));
      const ok = f.getFullYear() === Number(a) && f.getMonth() === Number(m) - 1 && f.getDate() === Number(dd) && Number(a) >= 2000 && Number(a) <= 2100;
      if (!ok) avisos.push(`La fecha "${bruto}" no es válida.`);
      fechaTxt = `${dd}/${m}/${a}`; resto = l.slice(8);
    }
    const mIni = /^([A-ZÑ]{2})/i.exec(resto); let iniciales = '';
    if (!mIni) avisos.push('Después de la fecha deben ir 2 letras con las iniciales de quien carga el registro (nombre + apellido).');
    else { iniciales = mIni[1].toUpperCase(); resto = resto.slice(2); }
    const partes = resto.split('-');                              // ['', prioridad, 'C…', 'FI…', 'FA…', 'F…']
    if (partes[0] !== '') avisos.push(`Falta el guion después de las iniciales${iniciales ? ` ("${iniciales}")` : ''}.`);
    const prioridad = partes[1] || '';
    if (!/^[123]$/.test(prioridad)) avisos.push(`La prioridad ("${prioridad}") debe ser 1, 2 o 3.`);
    // Complejidad: siempre con 1 decimal (C0.5, C1.0, C1.5, C2.0, C2.5, C3.0); "C1" o "C2" (sin el ".0") no es válido.
    const complejidad = partes[2] || '', mComp = /^C(0\.5|1\.0|1\.5|2\.0|2\.5|3\.0)$/.exec(complejidad);
    if (!mComp) avisos.push(`La complejidad ("${complejidad}") debe ser C0.5, C1.0, C1.5, C2.0, C2.5 o C3.0 (siempre con 1 decimal).`);
    const fi = partes[3] || '';
    if (fi !== 'FI1.0') avisos.push(`El campo fijo debe ser exactamente "FI1.0" (aparece "${fi}").`);
    const fa = partes[4] || '';
    if (fa !== 'FA1.0') avisos.push(`El campo fijo debe ser exactamente "FA1.0" (aparece "${fa}").`);
    // Fase: un dígito (0-9) y, si aplica, revisión "R" pegada o con guion (F2, F2R, F2-R…).
    const fase = partes.slice(5).join('-'), mFase = /^F(\d)(-?R)?$/.exec(fase);
    if (!mFase) avisos.push(`La fase ("${fase}") debe ser F seguido de un número y, si aplica, "R" (ej. F1, F1R, F2, F2-R).`);
    const ok = avisos.length === 0;
    return { ok, avisos, resumen: ok ? `fecha ${fechaTxt} · iniciales ${iniciales} · prioridad ${prioridad} · complejidad ${mComp[1]} · fase ${mFase[1]}${mFase[2] ? 'R' : ''}` : null };
  }

  function revisarAsociar() {
    const d = dialogos().find((x) => /^Asociar F[óo]rmula/i.test(cabecera(x)));
    if (!d) return;
    let av = d.querySelector('#rmd-aviso-asociar'), avN = d.querySelector('#rmd-aviso-nomenclatura');
    if (!on('asociar')) {
      if (av) av.remove(); if (avN) avN.remove();
      marcarCampo(d, 'Código Agrupador', false); marcarCampo(d, 'Código', false); marcarCampo(d, 'Observaciones', false);
      return;
    }
    const codigoRmd = (/^Asociar F[óo]rmula:\s*(\d+)/i.exec(cabecera(d)) || [])[1];
    const agr = valorDeCampo(d, 'Código Agrupador'), cod = valorDeCampo(d, 'Código');
    const elObs = campoDe(d, 'Observaciones'), obs = elObs ? elObs.value : null;   // sin normalizar: se necesitan los saltos de línea
    if (agr === null || cod === null) return;                                           // aún no está dibujada
    const avisos = []; let malAgr = false, malCod = false;
    if (!agr) { avisos.push('El Código Agrupador está vacío.'); malAgr = true; }
    if (!cod) { avisos.push('El Código está vacío.'); malCod = true; }
    const rel = filaPrincipal(codigoRmd); let nota = '';
    if (rel && rel.anterior) {
      const ant = rel.anterior, etq = `versión anterior v${ant.version} (RMD ${ant.codigo})`;
      if (agr && String(ant.codAgrupadorReceta || '') !== agr) { avisos.push(`El Código Agrupador (${agr}) no coincide con la ${etq}: ${ant.codAgrupadorReceta || 'vacío'}.`); malAgr = true; }
      if (cod && String(ant.codDefectoReceta || '') !== cod) { avisos.push(`El Código (${cod}) no coincide con la ${etq}: ${ant.codDefectoReceta || 'vacío'}.`); malCod = true; }
      if (!avisos.length) nota = `✓ Código Agrupador y Código coinciden con la ${etq}.`;
    } else if (rel.actual && Number(rel.actual.version) <= 1) nota = 'Es la primera versión: no hay versión anterior con la que comparar.';
    else nota = 'No se encontró la versión anterior entre los RMD consultados: busca el producto por descripción (sin filtrar por código) para poder compararla.';
    const texto = avisos.length ? avisos.map((a) => '⚠ ' + a).join('\n') : nota;
    if (!av) {
      av = document.createElement('div'); av.id = 'rmd-aviso-asociar';
      const cont = d.querySelector('.sapMDialogScrollCont') || d.querySelector('section'); if (!cont) return;
      cont.insertBefore(av, cont.firstChild);
    }
    av.className = avisos.length ? 'aviso' : 'ok'; if (av.textContent !== texto) av.textContent = texto;
    marcarCampo(d, 'Código Agrupador', malAgr); marcarCampo(d, 'Código', malCod);

    // Nomenclatura de la 1ª línea de Observaciones
    if (obs !== null) {
      const res = analizarNomenclatura((obs || '').split(/\r?\n/)[0]);
      const textoN = res.ok ? '✓ Nomenclatura de Observaciones correcta: ' + res.resumen + '.' : res.avisos.map((a) => '⚠ ' + a).join('\n');
      if (!avN) {
        avN = document.createElement('div'); avN.id = 'rmd-aviso-nomenclatura';
        av.insertAdjacentElement('afterend', avN);
      }
      avN.className = res.ok ? 'ok' : 'aviso'; if (avN.textContent !== textoN) avN.textContent = textoN;
      marcarCampo(d, 'Observaciones', !res.ok);
    } else if (avN) avN.remove();
  }

  // ---- 6c. Especificaciones: reordenar filas y editar Descripción / Especificaciones -------------------------------------
  // El Guardar del portal solo envía Tipo Dato y valores numéricos de cada especificación (MD_ES_ESPECIFICACION). Aquí las filas se
  // pueden mover (Subir / Bajar o arrastrando el asa) y sus textos se pueden editar; al pulsar ese mismo Guardar, los cambios viajan
  // en la actualización de cada fila (ensayoHijo, especificacion, orden) con la conexión del propio portal: no se abre otra vía.
  // Las especificaciones importadas de SAP ("Ensayos SAP") las ordena el portal por su número de característica (Merknr):
  // en ellas no se reordena. Si se cierra la ventana sin guardar, los cambios se descartan (el portal comparte los objetos en memoria).
  const BASE_ESPEC = new WeakMap();                                   // fila -> textos y orden tal como están guardados
  const CAMPOS_ESPEC = ['ensayoHijo', 'especificacion', 'orden'];
  const MSG_SAP = 'Estas especificaciones vienen de SAP y el portal las ordena por su número de característica: no se pueden reordenar.';
  let espAbierta = null, espSinVer = 0, espEnviando = 0;              // ventana de Especificaciones abierta: { d, datos }; guardados en curso
  const esTablaEspec = (t) => { const n = [...t.querySelectorAll('thead th')].map((th) => NORM(th.textContent)); return n.includes('ESPECIFICACIONES') && n.includes('TIPO DATO') && !n.includes('DEPENDE'); };
  function contextoDe(item) {
    const c = item.oBindingContexts || {}, k = 'aListEspecificacionAssignResponsive' in c ? 'aListEspecificacionAssignResponsive' : Object.keys(c)[0];
    return k === undefined ? null : item.getBindingContext(k === 'undefined' ? undefined : k);
  }
  function estadoEspec(d) {
    const t = [...d.querySelectorAll('table.sapMListTbl')].find(esTablaEspec); if (!t) return null;
    const ctl = sap.ui.getCore().byId(t.id.replace(/-listUl$/, '')); if (!ctl || !ctl.getItems) return null;
    const items = ctl.getItems(), c0 = items.length && contextoDe(items[0]), model = c0 && c0.getModel(), datos = model && model.getData();
    return Array.isArray(datos) ? { t, ctl, items, model, datos } : null;
  }
  const baseDe = (r) => { let b = BASE_ESPEC.get(r); if (!b) { b = {}; CAMPOS_ESPEC.forEach((k) => { b[k] = r[k]; }); BASE_ESPEC.set(r, b); } return b; };
  function pendientesEspec(datos) {
    const out = {};
    datos.forEach((r) => {
      const b = r.mdEstructuraEspecificacionId && BASE_ESPEC.get(r); if (!b) return;
      const c = {}; CAMPOS_ESPEC.forEach((k) => { if (r[k] !== b[k]) c[k] = r[k]; });
      if (Object.keys(c).length) out[r.mdEstructuraEspecificacionId] = c;
    });
    return out;
  }
  const reordenable = (datos) => datos.length > 1 && datos.every((r) => r.ensayoPadreSAP == null || r.ensayoPadreSAP === '');
  const firmaEspec = (d) => { const e = estadoEspec(d); return e ? '#' + e.datos.map((r) => [r.mdEstructuraEspecificacionId, r.ensayoHijo, r.especificacion].join('¦')).join('|') : ''; };
  const descartarEspec = (datos) => { (datos || []).forEach((r) => { const b = BASE_ESPEC.get(r); if (b) Object.assign(r, b); }); };
  const filaDeTr = (tr) => { const it = tr && sap.ui.getCore().byId(tr.id), c = it && contextoDe(it); return c && c.getObject(); };
  const autoAltura = (ta) => { if (!visible(ta)) return; ta.style.height = 'auto'; ta.style.height = Math.max(28, ta.scrollHeight + 2) + 'px'; };

  // La orden se reparte entre las filas conservando el conjunto de valores que ya tenían (así no chocan con otras estructuras del RMD)
  function aplicarOrden(e, arr, mover) {
    const previos = e.datos.map((r) => Number(r.orden)), validos = previos.every(Number.isFinite) && new Set(previos).size === previos.length;
    const valores = validos ? previos.slice().sort((a, b) => a - b) : arr.map((_, i) => i + 1);
    arr.forEach((r, i) => { r.orden = valores[i]; });
    e.model.setData(arr);
    e.ctl.removeSelections(true);
    e.ctl.getItems().forEach((it, i) => { if (mover.includes(arr[i])) it.setSelected(true); });
  }
  function moverFilas(d, sentido) {
    const e = estadoEspec(d); if (!e || !reordenable(e.datos)) return;
    const sel = new Set(e.ctl.getSelectedItems().map((it) => { const c = contextoDe(it); return c && c.getObject(); }).filter(Boolean));
    if (!sel.size) { toast('Marca la casilla de las filas que quieres mover.'); return; }
    const arr = e.datos.slice();
    if (sentido < 0) { for (let i = 1; i < arr.length; i++) if (sel.has(arr[i]) && !sel.has(arr[i - 1])) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
    else { for (let i = arr.length - 2; i >= 0; i--) if (sel.has(arr[i]) && !sel.has(arr[i + 1])) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
    if (arr.some((r, i) => r !== e.datos[i])) { aplicarOrden(e, arr, [...sel]); d.__rmdInter = true; setTimeout(ajustarTodo, 50); }
  }
  function moverA(d, fila, destino, antes) {
    const e = estadoEspec(d); if (!e || !reordenable(e.datos) || !fila || fila === destino) return;
    const arr = e.datos.filter((r) => r !== fila), i = arr.indexOf(destino); if (i < 0) return;
    arr.splice(antes ? i : i + 1, 0, fila);
    if (arr.some((r, k) => r !== e.datos[k])) { aplicarOrden(e, arr, [fila]); d.__rmdInter = true; setTimeout(ajustarTodo, 50); }
  }
  function instalarArrastre(d, t) {
    if (t.__rmdDnd) return; t.__rmdDnd = true;
    let origen = null;
    const limpiar = () => t.querySelectorAll('.rmd-arrastrando, .rmd-drop-antes, .rmd-drop-despues').forEach((x) => x.classList.remove('rmd-arrastrando', 'rmd-drop-antes', 'rmd-drop-despues'));
    const filaBajo = (e) => e.target.closest && e.target.closest('tr.sapMListTblRow');
    t.addEventListener('dragstart', (e) => {
      const g = e.target.closest && e.target.closest('.rmd-grip'), tr = g && g.closest('tr'); if (!tr) return;
      origen = filaDeTr(tr); if (!origen) { e.preventDefault(); return; }
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'rmd-espec');
      try { e.dataTransfer.setDragImage(tr, 24, 16); } catch (x) { /* sin imagen de arrastre */ }
      setTimeout(() => tr.classList.add('rmd-arrastrando'), 0);
    });
    t.addEventListener('dragover', (e) => {
      const tr = origen && filaBajo(e); if (!tr) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      const q = tr.getBoundingClientRect(), antes = e.clientY < q.top + q.height / 2;
      t.querySelectorAll('.rmd-drop-antes, .rmd-drop-despues').forEach((x) => x.classList.remove('rmd-drop-antes', 'rmd-drop-despues'));
      tr.classList.add(antes ? 'rmd-drop-antes' : 'rmd-drop-despues');
    });
    t.addEventListener('drop', (e) => {
      const tr = origen && filaBajo(e); if (!tr) return;
      e.preventDefault(); const q = tr.getBoundingClientRect();
      moverA(d, origen, filaDeTr(tr), e.clientY < q.top + q.height / 2); origen = null; limpiar();
    });
    t.addEventListener('dragend', () => { origen = null; limpiar(); });
  }

  // El Guardar del portal recorre todas las filas y actualiza cada una (model.update, de forma síncrona): mientras se ejecuta,
  // se añaden a esa misma petición los textos y la orden modificados. Si algo no encaja, la edición no se ofrece (nunca se pierde un cambio).
  // controlador de la vista que contiene un control UI5 (es el que el Guardar del portal usa como "b": b.mainModelv2 = modelo OData v2)
  function controladorDe(ctl) { let c = ctl; while (c && !c.getController) c = c.getParent && c.getParent(); return c && c.getController(); }
  function enganchar(d) {
    if (d.__rmdEng) return true;
    const e = estadoEspec(d), ctrl = e && controladorDe(e.ctl);
    const b = botonPorTitulo(d, 'Guardar'), ctl = b && sap.ui.getCore().byId(b.id.replace(/-inner$/, ''));
    const reg = ctl && ctl.mEventRegistry && ctl.mEventRegistry.press, l = reg && reg[0];
    if (!ctrl || !ctrl.mainModelv2 || typeof ctrl.mainModelv2.update !== 'function' || !l || typeof l.fFunction !== 'function' || !l.oListener || l.oListener.mainModelv2 !== ctrl.mainModelv2) return false;
    if (!l.rmdEnganchado) {
      const original = l.fFunction;
      l.fFunction = function () {
        const ee = espAbierta && estadoEspec(espAbierta.d), actual = ee ? { d: espAbierta.d, datos: ee.datos } : null, pend = on('espec') && actual ? pendientesEspec(actual.datos) : {};
        if (!Object.keys(pend).length) return original.apply(this, arguments);
        const vacias = actual.datos.filter((r) => pend[r.mdEstructuraEspecificacionId] && 'ensayoHijo' in pend[r.mdEstructuraEspecificacionId] && !norm(r.ensayoHijo));
        if (vacias.length) { toast('La Descripción no puede quedar vacía: escribe un texto o restaura el original antes de guardar.', true); return undefined; }
        const modelo = ctrl.mainModelv2, propio = Object.prototype.hasOwnProperty.call(modelo, 'update'), upd = modelo.update;
        modelo.update = function (ruta, datos, params) {
          const m = /MD_ES_ESPECIFICACION\('([^']+)'\)/.exec(String(ruta)), extra = m && pend[m[1]];
          if (!extra) return upd.apply(this, arguments);
          const p = Object.assign({}, params), ok = p.success, ko = p.error; espEnviando++;
          p.success = function () { espEnviando--; const fila = actual.datos.find((r) => r.mdEstructuraEspecificacionId === m[1]); if (fila) Object.assign(baseDe(fila), extra); return ok ? ok.apply(this, arguments) : undefined; };
          p.error = function () { espEnviando--; toast('No se pudo guardar el texto o la posición de una especificación. Revisa e inténtalo de nuevo.', true); return ko ? ko.apply(this, arguments) : undefined; };
          return upd.call(this, ruta, Object.assign({}, datos, extra), p);
        };
        try { return original.apply(this, arguments); }
        finally { if (propio) modelo.update = upd; else delete modelo.update; setTimeout(() => { espEnviando = 0; }, 60000); }   // válvula: si una respuesta no llega, no se retiene el descarte para siempre
      };
      l.rmdEnganchado = true;
    }
    d.__rmdEng = true; return true;
  }
  // longitudes máximas de la entidad (el servicio las declara en $metadata: 150 y 500); así el cuadro no deja escribir de más
  function limitesEspec(e) {
    if (e.t.__rmdLim) return e.t.__rmdLim;
    const lim = { ensayoHijo: 150, especificacion: 500 };
    try {
      const m = controladorDe(e.ctl).mainModelv2, sch = (m.getServiceMetadata().dataServices.schema || []).find((x) => (x.entityType || []).some((y) => y.name === 'MD_ES_ESPECIFICACION'));
      const tipo = sch.entityType.find((y) => y.name === 'MD_ES_ESPECIFICACION');
      Object.keys(lim).forEach((k) => { const p = tipo.property.find((y) => y.name === k), n = p && parseInt(p.maxLength, 10); if (n > 0) lim[k] = n; });
    } catch (x) { /* se mantienen los valores por defecto */ }
    return (e.t.__rmdLim = lim);
  }
  function escribirEspec(d, ta) {
    const tr = ta.closest('tr'), it = tr && sap.ui.getCore().byId(tr.id), c = it && contextoDe(it); if (!c) return;
    if (ta.dataset.campo === 'ensayoHijo' && /[\r\n]/.test(ta.value)) ta.value = ta.value.replace(/[\r\n]+/g, ' ');   // (también si se pega texto con saltos de línea)
    if (ta.maxLength > 0 && ta.value.length > ta.maxLength) ta.value = ta.value.slice(0, ta.maxLength);
    c.getModel().setProperty(c.getPath() + '/' + ta.dataset.campo, ta.value);
    autoAltura(ta); ta.classList.toggle('rmd-vacio', ta.dataset.campo === 'ensayoHijo' && !norm(ta.value));
    setTimeout(ajustarTodo, 80);
  }
  const ICONO_SUBIR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4"/></svg>';
  const ICONO_BAJAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>';
  const ICONO_ASA = '<svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/></svg>';
  function quitarEdicionEspec(d, t) {
    d.querySelectorAll('.rmd-orden-grupo').forEach((x) => x.remove());
    (t || d).querySelectorAll('textarea.rmd-edit, .rmd-grip').forEach((x) => x.remove());
    (t || d).querySelectorAll('.rmd-ed, .rmd-ed-desc, .rmd-espec-mod').forEach((x) => x.classList.remove('rmd-ed', 'rmd-ed-desc', 'rmd-espec-mod'));
  }
  function sincronizarEspec(d, t) {
    const e = estadoEspec(d); if (!e) return;
    e.datos.forEach((r) => baseDe(r));
    espAbierta = { d, datos: e.datos }; espSinVer = 0;
    const editable = on('espec') && /ingres/i.test(estadoDelRmd()) && enganchar(d);
    if (!editable) { quitarEdicionEspec(d, t); return; }
    const hdr = d.querySelector('.sapMListHdr'), puede = reordenable(e.datos), pend = pendientesEspec(e.datos), n = Object.keys(pend).length;
    let g = hdr && hdr.querySelector('.rmd-orden-grupo');
    if (hdr && !g) {
      g = document.createElement('span'); g.className = 'rmd-orden-grupo';
      const nota = document.createElement('span'); nota.className = 'rmd-espec-nota';
      g.append(botonIcono(ICONO_SUBIR, 'Subir', 'rmd-subir', () => moverFilas(d, -1)), botonIcono(ICONO_BAJAR, 'Bajar', 'rmd-bajar', () => moverFilas(d, 1)), nota);
      const ref = hdr.querySelector('.sapMTBSeparator') || hdr.querySelector('button'); if (ref) hdr.insertBefore(g, ref); else hdr.appendChild(g);
    }
    if (g) {
      const marcadas = e.ctl.getSelectedItems().length, [bs, bb] = g.querySelectorAll('button');
      bs.disabled = bb.disabled = !puede || !marcadas;
      bs.title = puede ? 'Sube una posición las filas marcadas (también puedes arrastrarlas desde el asa de la izquierda)' : MSG_SAP;
      bb.title = puede ? 'Baja una posición las filas marcadas (también puedes arrastrarlas desde el asa de la izquierda)' : MSG_SAP;
      setTxt(g.querySelector('.rmd-espec-nota'), n ? `● ${n} fila${n === 1 ? '' : 's'} con cambios sin guardar` : '');
    }
    const cols = [...t.querySelectorAll('thead th')].map((th) => NORM(th.textContent));
    const iDes = cols.findIndex((c) => /^DESCRIPCI/.test(c)), iEsp = cols.indexOf('ESPECIFICACIONES');
    instalarArrastre(d, t);
    const lim = limitesEspec(e);
    e.items.forEach((it) => {
      const tr = it.getDomRef(), c = contextoDe(it), fila = c && c.getObject(); if (!tr || !fila) return;
      tr.classList.toggle('rmd-espec-mod', !!pend[fila.mdEstructuraEspecificacionId]);
      [['ensayoHijo', iDes], ['especificacion', iEsp]].forEach(([campo, i]) => {
        const td = tr.children[i]; if (!td) return;
        td.classList.add('rmd-ed'); if (campo === 'ensayoHijo') td.classList.add('rmd-ed-desc');
        let ta = td.querySelector(':scope > textarea.rmd-edit');
        if (!ta) {
          ta = document.createElement('textarea'); ta.className = 'rmd-edit'; ta.rows = 1; ta.spellcheck = false; ta.dataset.campo = campo;
          ta.setAttribute('aria-label', campo === 'ensayoHijo' ? 'Descripción' : 'Especificaciones'); ta.maxLength = lim[campo];
          ta.addEventListener('input', () => escribirEspec(d, ta));
          // que la lista de UI5 no reaccione (marcar la fila, mover el foco con las flechas, Enter = abrir…) a lo que se hace dentro del texto
          ['click', 'dblclick', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'keyup', 'keypress'].forEach((ev) => ta.addEventListener(ev, (e) => e.stopPropagation()));
          ta.addEventListener('keydown', (e) => { if (campo === 'ensayoHijo' && e.key === 'Enter') e.preventDefault(); if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation(); });   // la Descripción es de una sola línea
          td.appendChild(ta);
        }
        const v = fila[campo] == null ? '' : String(fila[campo]);
        if (ta.value !== v && document.activeElement !== ta) ta.value = v;
        ta.classList.toggle('rmd-vacio', campo === 'ensayoHijo' && !norm(ta.value));
        autoAltura(ta);
      });
      const tdD = tr.children[iDes]; let asa = tdD && tdD.querySelector(':scope > .rmd-grip');
      if (tdD && puede && !asa) {
        asa = document.createElement('span'); asa.className = 'rmd-grip'; asa.draggable = true; asa.title = 'Arrastra para cambiar la posición'; asa.innerHTML = ICONO_ASA;
        ['click', 'dblclick', 'mouseup', 'touchend'].forEach((ev) => asa.addEventListener(ev, (e) => e.stopPropagation()));
        tdD.appendChild(asa);
      }
      else if (asa && !puede) asa.remove();
    });
  }

  let pendiente = false;
  window.__rmdStats = { ajustes: 0, listas: () => dialogos().map((d) => d.__rmdListaEfectiva || '') };   // (diagnóstico)
  // Al apagar "Mejoras activas" se retira todo lo que el script había añadido a las ventanas del portal
  function limpiezaTotal() {
    document.querySelectorAll('.rmd-copia-grupo, .rmd-nuevo-paso-grupo, .rmd-exportar-op, .rmd-cuenta-verop, .rmd-documentos-citados, .rmd-status-rmd, .rmd-aa, #rmd-filtro-bar, .rmd-estado, #rmd-aviso-asociar, #rmd-aviso-nomenclatura').forEach((e) => e.remove());
    document.querySelectorAll('.rmd-th-filtro, .rmd-menu-filtro-col').forEach((e) => e.remove());
    document.querySelectorAll('[data-rmd-filtro-col]').forEach((e) => delete e.dataset.rmdFiltroCol);
    document.querySelectorAll('textarea.rmd-ortografia').forEach((e) => { e.classList.remove('rmd-ortografia'); e.removeAttribute('data-rmd-dudosas'); });
    document.querySelectorAll('.rmd-con-estado, .rmd-pm-titulo').forEach((e) => e.classList.remove('rmd-con-estado', 'rmd-pm-titulo'));
    document.querySelectorAll('.rmd-campo-aviso').forEach((e) => e.classList.remove('rmd-campo-aviso'));
    document.querySelectorAll('.sapMDialog').forEach((d) => quitarEdicionEspec(d));
    document.querySelectorAll('.sapMDialog th, .sapMDialog td').forEach((c) => {
      c.style.removeProperty('display'); if (c.tagName === 'TH') { c.style.removeProperty('width'); c.style.removeProperty('min-width'); }
      c.classList.remove('rmd-marcar', 'rmd-desmarcar', 'rmd-falta', 'rmd-td-sintipo', 'rmd-sin-puesto');
    });
    document.querySelectorAll('.sapMDialog tbody tr').forEach((r) => r.style.removeProperty('display'));
    document.querySelectorAll('.sapMDialog table.sapMListTbl').forEach((t) => t.style.removeProperty('width'));
    document.querySelectorAll('.sapMDialog').forEach((d) => d.classList.remove('rmd-g', 'rmd-pasos', 'rmd-medio', 'rmd-ancho', 'rmd-sticky'));
  }
  function ajustarTodo() {
    if (!opc.activo) { limpiezaTotal(); return; }
    window.__rmdStats.ajustes++;
    document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) table.sapMListTbl').forEach(ajustarTabla);
    decorarCabeceras();
    gestionarVerOP();
    gestionarDocumentosCitados();
    gestionarBotonStatusRmd();
    gestionarTextosMayusculas();
  }
  new MutationObserver(() => {
    if (pendiente) return; pendiente = true;
    setTimeout(() => { pendiente = false; ajustarTodo(); }, 30);   // setTimeout (no rAF): también corre con la pestaña en segundo plano; más corto que antes (60ms) para que el tamaño del diálogo (rmd-pasos/rmd-medio) se reaplique más rápido al cerrar un diálogo hijo
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-checked', 'readonly', 'disabled', 'aria-readonly', 'aria-disabled'] });  // aria-checked: casillas que se pintan tarde; readonly/disabled: campos (p. ej. Descripción Paso) que el portal habilita un instante después de abrir el diálogo
  // UI5 rellena valores (Tipo Dato, casillas…) de forma tardía y sin cambiar el DOM: se vigila una "firma" de las tablas abiertas
  let firmaPrev = '';
  const firmaTablas = () => {
    let f = ''; const ts = document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) table.sapMListTbl');
    ts.forEach((t) => { f += ((t.closest('.sapMDialogScrollCont') || t.parentElement || {}).clientWidth || 0) + ';';   // el ancho útil cambia si aparece una barra de desplazamiento o se redimensiona
      t.querySelectorAll('tbody input').forEach((i) => { f += i.value + '|'; }); t.querySelectorAll('tbody [role=checkbox]').forEach((c) => { f += (c.getAttribute('aria-checked') || '')[0]; }); });
    return f + ts.length;
  };
  let sinVentanas = 0;
  function revisionPeriodica() {
    montarPanel();
    if (!dialogos().length) { if (++sinVentanas >= 3 && portapapeles && !ocupadoCopia) limpiarPortapapeles(); } else sinVentanas = 0;
    if (opc.activo && opc.singuardar) refrescarBases();
    if (opc.activo) { vigilarListaPrincipal(); revisarAsociar(); }
    if (espAbierta) {                                                    // ventana de Especificaciones cerrada sin guardar: se descartan sus cambios
      if (dialogos().includes(espAbierta.d)) espSinVer = 0;
      else if (++espSinVer >= 2 && !espEnviando) { descartarEspec(espAbierta.datos); espAbierta = null; espSinVer = 0; }   // (no mientras haya un guardado en curso)
    }
    if (!opc.activo || !document.querySelector('.sapMDialog')) { firmaPrev = ''; return; }
    const f = firmaTablas(); if (f !== firmaPrev) { firmaPrev = f; ajustarTodo(); }
  }
  setInterval(() => { const t0 = performance.now(); revisionPeriodica(); window.__rmdStats.pollMs = Math.round((performance.now() - t0) * 10) / 10; }, 700);
  window.addEventListener('resize', () => setTimeout(ajustarTodo, 150));
  document.addEventListener('change', () => setTimeout(ajustarTodo, 80), true);
  document.addEventListener('click', () => setTimeout(ajustarTodo, 120), true);

  // ---- 7. Avisar cambios sin guardar -----------------------------------------------------------
  // Una ventana está "sucia" cuando la persona TOCÓ algo (bandera __rmdInter) y la firma de la tabla (valores y casillas) difiere de la del
  // último momento limpio (carga o guardado). Lo que hace el propio portal —cargar, refrescar tras guardar, rellenar valores tardíos— no cuenta:
  // mientras la persona no haya tocado nada, la base se va actualizando sola. Así, tras guardar y cancelar no aparece un aviso falso.
  // (Las casillas de UI5 no lanzan el evento "change" del navegador, por eso se compara el estado y no se vigilan solo eventos.)
  function firmaDialogo(d) {
    let f = '';
    d.querySelectorAll('table tbody input, table tbody [role=checkbox]').forEach((x) => {
      if (x.closest('.sapMListTblSelCol')) return;                    // marcar filas para copiar/borrar no es un cambio de datos
      f += (x.tagName === 'INPUT' ? x.value : (x.getAttribute('aria-checked') || '')[0]) + '|';
    });
    return f + firmaEspec(d);                                          // Especificaciones: orden y textos (viven en el modelo)
  }
  const rebase = (d) => { if (d) { d.__rmdBase = firmaDialogo(d); d.__rmdN = d.querySelectorAll('table tbody tr').length; d.__rmdInter = false; } };
  function refrescarBases() {
    dialogos().forEach((d) => {
      if (!d.querySelector('table tbody')) return;
      const n = d.querySelectorAll('table tbody tr').length;
      if (d.__rmdBase === undefined || d.__rmdN !== n) { rebase(d); return; }          // filas nuevas o quitadas: la lista se volvió a cargar
      if (!d.__rmdInter) { const f = firmaDialogo(d); if (f !== d.__rmdBase) d.__rmdBase = f; }   // cambios del portal, no de la persona: se aceptan
    });
  }
  const sucia = (d) => d.__rmdBase !== undefined && !!d.__rmdInter && firmaDialogo(d) !== d.__rmdBase;
  window.__rmdStats.sucias = () => dialogos().map((d) => [d.__rmdBase === undefined ? null : sucia(d), d.__rmdN, !!d.__rmdInter]);   // diagnóstico

  // Qué toques cuentan como "editar": teclear, marcar casillas, elegir opciones de listas (incluido el selector de predecesores) o pegar/soltar.
  // No cuentan: el botón de mejoras, los avisos, el filtro local, marcar filas, la barra del título ni pulsar en las celdas de la tabla.
  const EXCLUIDOS_EDICION = '#rmd-ui-panel, .rmd-modal-fondo, .sapMMessageDialog, .rmd-filtro, .sapMListTblSelCol, .sapMListHdr';
  function marcarEdicion(e) {
    if (!e.isTrusted || !opc.activo) return;
    const t = e.target; if (!t || !t.closest || t.closest(EXCLUIDOS_EDICION)) return;
    let edita = false;
    if (e.type === 'input' || e.type === 'change' || e.type === 'paste' || e.type === 'cut') edita = !!t.closest('input, textarea, select');
    else if (e.type === 'drop') edita = true;
    else {                                                              // clic, o Espacio/Enter sobre el control
      const enTablaRmd = !!t.closest('.sapMDialog.rmd-g table');       // (elegir una fila del selector "Adicionar Pasos" no edita esta ventana)
      edita = !!t.closest('[role=checkbox], .sapMCb') || (!enTablaRmd && !!t.closest('[role=option], .sapMSelectList li, li.sapMLIB, .sapMSltItem'));
    }
    if (edita) dialogos().forEach((d) => { d.__rmdInter = true; });
  }
  ['input', 'change', 'paste', 'cut', 'click', 'drop'].forEach((ev) => document.addEventListener(ev, marcarEdicion, true));
  document.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') marcarEdicion(e); }, true);

  // Al pulsar Guardar (o Ctrl+S) lo que hay en pantalla pasa a ser la base; si el portal responde con una advertencia o un error,
  // no se guardó nada y la ventana vuelve a estar sin guardar (ver más abajo, en la lectura de mensajes).
  function alGuardar(d) { d.__rmdPrev = { base: d.__rmdBase, inter: !!d.__rmdInter }; d.__rmdGuardando = Date.now(); rebase(d); }
  function resultadoGuardado(exito) {
    dialogos().forEach((d) => {
      if (!d.__rmdGuardando || Date.now() - d.__rmdGuardando > 30000) return;
      if (exito) rebase(d); else if (d.__rmdPrev) { d.__rmdBase = d.__rmdPrev.base; d.__rmdInter = d.__rmdPrev.inter; }
      d.__rmdGuardando = 0; d.__rmdPrev = null;
    });
  }

  // Aviso propio, centrado en la página y con botones claros (sustituye al cuadro del navegador, que salía arriba y con texto seco).
  // Devuelve una promesa: true = confirma (botón "si"); false = "no", Escape o Enter (por defecto se conserva el trabajo).
  const ICONO_AVISO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6 2.9 19.4h18.2L12 3.6z"/><path d="M12 10v4.4"/><path d="M12 17.1v.1"/></svg>';
  function confirmar(titulo, mensaje, ayuda, { si = 'Aceptar', no = 'Cancelar', peligro = false } = {}) {
    return new Promise((resolve) => {
      let hecho = false;
      const fin = (v) => { if (hecho) return; hecho = true; document.removeEventListener('keydown', teclas, true); w.cerrar(); resolve(v); };
      const w = ventana(titulo, { cancelar: () => fin(false) });
      const tarjeta = w.fondo.querySelector('.rmd-modal'); tarjeta.classList.add('rmd-modal-aviso'); tarjeta.setAttribute('role', 'alertdialog'); tarjeta.setAttribute('aria-label', titulo);
      const h3 = tarjeta.querySelector('h3'), cab = document.createElement('div'); cab.className = 'rmd-aviso-cab';
      const ico = document.createElement('span'); ico.className = 'rmd-aviso-ico'; ico.innerHTML = ICONO_AVISO;
      h3.replaceWith(cab); cab.append(ico, h3);
      const p = document.createElement('p'); p.textContent = mensaje; w.cuerpo.append(p);
      if (ayuda) { const a = document.createElement('p'); a.className = 'rmd-aviso-ayuda'; a.textContent = ayuda; w.cuerpo.append(a); }
      const bSi = botonModal(si, peligro ? 'peligro' : '', () => fin(true)), bNo = botonModal(no, 'primario', () => fin(false));
      w.pie.append(bSi, bNo);
      const teclas = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); fin(false); }
        else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); (document.activeElement === bNo ? bSi : bNo).focus(); }
      };
      document.addEventListener('keydown', teclas, true);
      setTimeout(() => bNo.focus(), 40);
    });
  }
  document.addEventListener('click', (e) => {
    if (!on('singuardar')) return;
    const b = e.target.closest && e.target.closest('button'); const d = b && enDialogo(b); if (!d) return;
    if (b.title === 'Guardar') { alGuardar(d); return; }
    // Agregar / Eliminar / Ensayos SAP vuelven a leer las especificaciones del servidor: los textos u orden sin guardar se perderían
    if (['Agregar', 'Eliminar', 'Ensayos SAP'].includes(b.title) && espAbierta && espAbierta.d === d && Object.keys(pendientesEspec(espAbierta.datos)).length) {
      e.preventDefault(); e.stopPropagation();
      confirmar('Textos u orden sin guardar', 'Esta acción vuelve a cargar las especificaciones desde el servidor y perderías lo que editaste.',
        'Para conservarlo, vuelve y pulsa Guardar antes.', { si: 'Continuar sin guardar', no: 'Volver', peligro: true }).then((seguir) => { if (seguir) pulsar(b); });
      return;
    }
    const t = norm(b.textContent);
    if ((t === 'Cancelar' || t === 'Cerrar') && sucia(d)) {
      e.preventDefault(); e.stopPropagation();
      confirmar('Tienes cambios sin guardar', 'Si cierras esta ventana ahora, los cambios que hiciste en ella se perderán.',
        'Para conservarlos, vuelve y pulsa Guardar (o Ctrl+S).', { si: 'Descartar y cerrar', no: 'Seguir editando', peligro: true })
        .then((descartar) => { if (descartar) { rebase(d); pulsar(b); } });
    }
  }, true);

  // ---- 8. Mensajes del portal: resultado de un guardado y cierre automático de los de éxito -----------------
  const visto = new WeakSet();
  new MutationObserver(() => {
    if (!on('singuardar') && !on('exito')) return;
    document.querySelectorAll('.sapMMessageDialog').forEach((m) => {
      if (visto.has(m) || !visible(m)) return;
      const titulo = norm((m.querySelector('h1,h2,.sapMTitle,header') || {}).textContent);
      const botones = [...m.querySelectorAll('button')].filter((b) => visible(b) && norm(b.textContent));   // sin los botones de desbordamiento vacíos
      const exito = /^[ÉE]xito/i.test(titulo);
      if (on('singuardar') && (exito || /^(Advertencia|Error|Aviso|Atenci)/i.test(titulo))) { visto.add(m); resultadoGuardado(exito); }
      if (on('exito') && exito && botones.length === 1 && norm(botones[0].textContent) === 'OK') { visto.add(m); setTimeout(() => pulsar(botones[0]), 900); }
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
        const i = [...d.querySelectorAll('input[type=text]')].find((x) => visible(x) && !x.readOnly && !x.classList.contains('rmd-filtro'));
        if (i) i.focus();
      }, 350);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 9b. Copiar la configuración de un paso (y sus procesos menores) a otro paso -------------------------
  // Flujo: se marca la casilla del paso de referencia -> "Copiar configuración"; se marca la casilla del paso nuevo ->
  // "Pegar en el paso marcado". Muestra una vista previa y solo escribe al pulsar "Aplicar". Usa los propios controles de
  // SAP (Tipo Dato, casillas, selector "Adicionar Pasos RMD" de los procesos menores) y los botones Guardar del portal.
  // El portapapeles es temporal: dura mientras el RMD siga abierto.
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
        const botones = [...m.querySelectorAll('footer button')].filter((b) => visible(b) && norm(b.textContent));
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
  function ventana(titulo, opciones = {}) {
    const fondo = document.createElement('div'); fondo.className = 'rmd-modal-fondo';
    fondo.innerHTML = `<div class="rmd-modal"><h3></h3><div class="rmd-modal-cuerpo"></div><div class="rmd-modal-pie"></div></div>`;
    fondo.querySelector('h3').textContent = titulo; document.body.appendChild(fondo);
    // Escape solo actúa sobre esta ventana: no debe cerrar la ventana de SAP que está debajo
    const teclas = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (opciones.cancelar) opciones.cancelar(); } };
    document.addEventListener('keydown', teclas, true);
    return { fondo, cuerpo: fondo.querySelector('.rmd-modal-cuerpo'), pie: fondo.querySelector('.rmd-modal-pie'), cerrar: () => { document.removeEventListener('keydown', teclas, true); fondo.remove(); } };
  }
  const botonModal = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-btn ' + (cls || ''); b.textContent = txt; b.addEventListener('click', fn); return b; };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(txt, error) {
    document.querySelectorAll('.rmd-toast').forEach((x) => x.remove());
    const t = document.createElement('div'); t.className = 'rmd-toast' + (error ? ' error' : ''); t.textContent = txt; document.body.appendChild(t);
    setTimeout(() => t.remove(), error ? 9000 : 5500);
  }
  const resumenCasillas = (c) => Object.entries(c || {}).filter(([, v]) => v).map(([k]) => NOMBRE_CASILLA[k] || k).join(' + ') || 'sin casillas';
  const resumenPaso = (p) => `${p.tipo || '(sin tipo)'}${p.clave ? ' · ' + p.clave : ''}${p.puesto ? ' · ' + p.puesto : ''}${p.dec !== '' && p.dec != null ? ' · dec ' + p.dec : ''} · ${resumenCasillas(p.chk)}`;

  // El portapapeles vive solo en memoria y mientras el RMD siga abierto: al cerrar todas las ventanas (o abrir otro RMD) se descarta.
  let portapapeles = null;
  try { localStorage.removeItem('rmdUiPortapapeles'); } catch (e) { /* versiones anteriores lo guardaban en el navegador: se elimina */ }
  function limpiarPortapapeles() { portapapeles = null; pintarEstadoPortapapeles(); }
  function pintarEstadoPortapapeles() {
    document.querySelectorAll('.rmd-clip').forEach((sp) => {
      const t = portapapeles ? `Copiado: #${portapapeles.paso.orden} ${portapapeles.paso.desc.slice(0, 60)}${portapapeles.paso.desc.length > 60 ? '…' : ''} — ${portapapeles.pms.filter((x) => !x.insumo).length} proceso(s) menor(es)` : '';
      setTxt(sp, t); sp.title = portapapeles ? `RMD ${portapapeles.rmd || ''}: ${portapapeles.paso.desc}` : '';
    });
    document.querySelectorAll('.rmd-pegar').forEach((b) => { b.disabled = !portapapeles; });
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
      portapapeles = { paso, pms, rmd: norm(rmd).split(' - ')[0], dialogoId: d.id, trId: sel[0].id }; pintarEstadoPortapapeles();
      const ins = pms.filter((x) => x.insumo).length;
      toast(`Copiado el paso #${paso.orden} con ${pms.length - ins} proceso(s) menor(es)${ins ? ` (${ins} insumo(s) no se copian: se agregan con "Agregar Insumo")` : ''}. Ahora marca el paso nuevo y pulsa "Pegar".`);
    } catch (e) { toast('No se pudo copiar: ' + e.message, true); } finally { ocupadoCopia = false; }
  }

  // la vista previa devuelve las opciones elegidas o null si se cancela
  function vistaPrevia(destino, pmDestino) {
    return new Promise((resolver) => {
      const o = portapapeles.paso, v = ventana('Pegar configuración y procesos menores', { cancelar: () => { v.cerrar(); resolver(null); } });
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
      const rmdActual = norm((d.querySelector('h2') || {}).textContent).split(' - ')[0], estado = estadoDelRmd();
      if (portapapeles.rmd && rmdActual && portapapeles.rmd !== rmdActual) { toast(`El paso copiado es del RMD ${portapapeles.rmd}; este es el ${rmdActual}. Copia de nuevo en este RMD.`, true); limpiarPortapapeles(); return; }
      if (estado && !/ingres/i.test(estado)) { toast(`El RMD está ${estado}: solo se puede pegar en versiones Ingresadas.`, true); return; }
      if (sel[0].id === portapapeles.trId && d.id === portapapeles.dialogoId) { toast('El paso marcado es el mismo que se copió: marca el paso destino.', true); return; }
      const trId = sel[0].id, destino = leerPaso(tabla, sel[0]);
      toast('Leyendo el paso destino…');
      const btnPM = [...sel[0].querySelectorAll('button')].find((x) => x.title === 'Procesos Menores');
      const pmDestino = btnPM && portapapeles.pms.length ? await leerPMsDe(tabla, trId) : [];
      const op = await vistaPrevia(destino, pmDestino);
      if (!op) return;

      const v = ventana('Aplicando…', { cancelar: () => { if (!listo.disabled) v.cerrar(); } }); const lineas = [];
      const log = (t) => { lineas.push(t); v.cuerpo.innerHTML = '<pre class="rmd-log">' + esc(lineas.join('\n')) + '</pre>'; v.cuerpo.scrollTop = v.cuerpo.scrollHeight; };
      const listo = botonModal('Cerrar', 'primario', () => v.cerrar()); listo.disabled = true; v.pie.append(listo);
      try {
        // 1) configuración del paso mayor
        const cfg = {}; for (const k of op.campos) cfg[k] = portapapeles.paso[k];
        cfg.chk = {}; for (const k of op.casillas) cfg.chk[k] = portapapeles.paso.chk[k];
        log(`Paso #${destino.orden} · ${destino.desc}`);
        if (op.campos.length || op.casillas.length) { await aplicarFila(tabla, trId, cfg, columnas(tabla), log); d.__rmdInter = true; }   // lo aplicado por el script cuenta como cambio sin guardar hasta que se guarde
        if (op.guardar && (op.campos.length || op.casillas.length)) {
          const g = botonPorTitulo(d, 'Guardar'); if (!g) throw new Error('No encuentro el botón Guardar del paso');
          log('Guardando el paso…'); pulsar(g); rebase(d);
          const r = await atenderMensajes(); if (r.problema) throw new Error('El portal respondió: ' + r.problema);
          if (r.vistos.some((x) => /^[ÉE]xito/i.test(x))) log(`✔ Paso guardado (${r.vistos.join(' | ')})`);
          else log('⚠ El portal no mostró el mensaje de éxito: verifica que el paso se guardó.');
          await esperar(1200);
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
            await aplicarFila(tPM, tr.id, { tipo: x.tipo, vi: x.vi, vf: x.vf, mg: x.mg, dec: x.dec, chk: x.chk }, n, log); dPM.__rmdInter = true;
          }
          const g = botonPorTitulo(dPM, 'Guardar'); if (!g) throw new Error('No encuentro el botón Guardar de procesos menores');
          log('Guardando los procesos menores…'); pulsar(g); rebase(dPM);
          const r = await atenderMensajes(); if (r.problema) throw new Error('El portal respondió: ' + r.problema);
          if (r.vistos.some((x) => /^[ÉE]xito/i.test(x))) log('✔ Procesos menores guardados');
          else log('⚠ El portal no mostró el mensaje de éxito: verifica que los procesos menores se guardaron.');
          await esperar(1000);
          await cerrarDialogo(dPM);
        }
        const conAvisos = lineas.filter((l) => l.startsWith('⚠')).length;
        log(conAvisos ? `\nTerminado con ${conAvisos} aviso(s) (líneas con ⚠). Revisa el resultado en la tabla.` : '\nListo. Revisa el resultado en la tabla.');
        v.fondo.querySelector('h3').textContent = conAvisos ? 'Terminado con avisos' : 'Terminado';
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

  // ---- Ventana "Ver OP" (Ordenes de Produccion Asociadas): ver todas a la vez y exportar a CSV para filtrar/ordenar por fecha ----------
  // La tabla NO usa "growing" (no basta con requestNewPage / subir el growingThreshold, como se probó primero): cada página son 5 OP
  // que el propio controlador vuelve a pedir al servidor al pulsar la flecha "▷" (controller._currentSkip += controller._pageSize,
  // vuelve a leer y REEMPLAZA el array del modelo). Por eso, para verlas o exportarlas todas a la vez, se pulsa esa misma flecha
  // (con la API de UI5: no se inventa ninguna llamada propia) las veces que haga falta, se junta cada página y, al final, se
  // sustituye el array del modelo por la unión completa: la tabla las pinta todas juntas, sin seguir paginando.
  const RX_VER_OP = /^Visualizar las Ordenes de Producci[oó]n/i;
  const ICONO_EXPORTAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v8.2M4.8 6.9 8 10.1l3.2-3.2"/><path d="M2.5 11.5v1.8A1.2 1.2 0 0 0 3.7 14.5h8.6a1.2 1.2 0 0 0 1.2-1.2v-1.8"/></svg>';
  const ICONO_VER_TODAS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8Z"/><circle cx="8" cy="8" r="2"/></svg>';
  const csvCelda = (t) => '"' + String(t == null ? '' : t).replace(/"/g, '""').replace(/\s+/g, ' ').trim() + '"';
  function csvVerOP(t) {
    // las celdas de Item/Acciones son iconos sin texto: se usan solo las columnas con encabezado de texto
    const thsTodas = [...t.querySelectorAll('thead th')]; const idx = thsTodas.map((th, i) => [i, norm(th.textContent)]).filter(([, n]) => n);
    const filas = filasPrincipales(t);
    const lineas = [idx.map(([, n]) => csvCelda(n)).join(';')];
    filas.forEach((tr) => { lineas.push(idx.map(([i]) => csvCelda(celda(tr, i) && celda(tr, i).textContent)).join(';')); });
    return String.fromCharCode(0xfeff) + lineas.join(String.fromCharCode(13, 10));   // BOM: para que Excel abra los acentos bien
  }
  function descargarTexto(nombre, texto) {
    const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const objetoDeFila = (tr) => { const it = tr && sap.ui.getCore().byId(tr.id); if (!it || !it.oBindingContexts) return null; const n = Object.keys(it.oBindingContexts); const c = n.length && it.getBindingContext(n[0] === 'undefined' ? undefined : n[0]); return c && c.getObject(); };
  // Recorre TODAS las páginas de "Ver OP" con la flecha "▷" del propio portal y junta lo que va mostrando cada una.
  // Productos con mucho histórico (muchas campañas a lo largo de los años) pueden tener bastantes OP asociadas: se avisa el
  // avance (por si tarda) y, pasadas 40 páginas (200 OP), se pregunta si seguir en vez de quedarse cargando sin más.
  async function cargarTodasOP(d, t, avisar) {
    const ctl = ctlDe(t); let c = ctl; while (c && !c.getController) c = c.getParent && c.getParent();
    const ctrl = c && c.getController(); const bi = ctl && ctl.getBinding && ctl.getBinding('items');
    if (!ctrl || !bi || typeof ctrl._currentSkip !== 'number') throw new Error('No encuentro la paginación de esta ventana');
    const leerPagina = () => filasPrincipales(t).map(objetoDeFila).filter(Boolean);
    const vistos = new Set(), acumulado = [];
    const agregar = (pag) => pag.forEach((o) => { const clave = JSON.stringify(o.__metadata && o.__metadata.uri || [o.op, o.item, o.nroOP, o.lote]); if (!vistos.has(clave)) { vistos.add(clave); acumulado.push(o); } });
    agregar(leerPagina());
    const btnDer = [...d.querySelectorAll('button')].find((b) => b.title === 'navigation-right-arrow'), ctlDer = btnDer && ctlDe(btnDer);
    let vueltas = 0;
    while (ctlDer && ctlDer.getEnabled && ctlDer.getEnabled() && vueltas < 2000) {
      const antes = ctrl._currentSkip;
      pulsar(btnDer);
      if (!(await hasta(() => ctrl._currentSkip !== antes, 15000))) break;
      // El grueso del tiempo lo consume el propio portal (onGetRMDVerOP hace 10 llamadas OData anidadas por página: RMD, receta,
      // estructura, equipo, paso, insumo, utensilio, especificación y etiqueta); probado en vivo que subir el tamaño de página
      // NO ayuda (una página de 20 tardó más que 4 páginas de 5), así que no se toca `_pageSize`. Aquí solo se recorta la espera
      // propia tras el indicador de ocupado (antes 500ms) al mínimo para que el DOM termine de pintar la página.
      await hasta(() => !ocupado(), 15000); await esperar(150);
      const pag = leerPagina(); if (!pag.length) break;
      agregar(pag); vueltas++;
      if (avisar) avisar(acumulado.length);
      if (vueltas % 40 === 0 && !(await confirmar('Hay bastantes OP asociadas', `Van ${acumulado.length} cargadas y sigue habiendo más (este producto tiene mucho histórico).`,
          'Puedes seguir cargando todas, o quedarte con las que ya se juntaron.', { si: 'Seguir cargando', no: 'Quedarme con estas', peligro: false }))) break;
    }
    return { ctrl, modelo: bi.getModel(), ruta: bi.getPath(), filas: acumulado };
  }
  // Tras juntar todas las páginas, se pinta la tabla completa: apagar "growing" (no solo subir el umbral) es necesario porque
  // cambiar growingThreshold después de que la tabla ya está pintada no la vuelve a pintar sola con más filas; con growing
  // apagado, la tabla pinta TODO el arreglo del modelo sin ningún tope. Se espera a que el DOM realmente tenga esas filas
  // antes de seguir (el CSV se arma leyendo la tabla ya pintada, así que si esto no se espera, se exportarían de menos).
  async function pintarTodasEnTabla(t, modelo, ruta, filas) {
    const ctl = ctlDe(t); if (ctl && ctl.setGrowing) ctl.setGrowing(false);
    modelo.setProperty(ruta, filas);
    await hasta(() => filasPrincipales(t).length >= filas.length, 8000);
  }
  async function verTodasOP(d, t, boton) {
    boton.disabled = true; const texto0 = boton.querySelector('span').textContent;
    try {
      const { modelo, ruta, filas } = await cargarTodasOP(d, t, (n) => setTxt(boton.querySelector('span'), `Cargando… ${n}`));
      await pintarTodasEnTabla(t, modelo, ruta, filas);
      toast(`Se muestran las ${filas.length} OP asociadas.`);
    } catch (e) { toast('No se pudieron cargar todas las OP: ' + e.message, true); }
    finally { boton.disabled = false; setTxt(boton.querySelector('span'), texto0); }
  }
  async function exportarVerOP(d, t, boton) {
    boton.disabled = true; const texto0 = boton.querySelector('span').textContent;
    try {
      const { modelo, ruta, filas } = await cargarTodasOP(d, t, (n) => setTxt(boton.querySelector('span'), `Cargando… ${n}`));
      await pintarTodasEnTabla(t, modelo, ruta, filas);                   // así el CSV (que lee de la tabla ya pintada) las incluye todas
      const rmd = (/RMD:\s*(\d+)/.exec(cabecera(d)) || [])[1] || 'rmd';
      descargarTexto(`OP_asociadas_${rmd}.csv`, csvVerOP(t));
    } catch (e) { toast('No se pudo exportar: ' + e.message, true); }
    finally { boton.disabled = false; setTxt(boton.querySelector('span'), texto0); }
  }
  window.__rmdStats.csvVerOP = csvVerOP;   // diagnóstico: genera el CSV sin descargarlo
  // Filtro por columna al estilo Excel: un icono de embudo junto a cada encabezado abre un desplegable con los valores
  // únicos de esa columna (con buscador y casillas, como el AutoFiltro de Excel); desmarcar valores oculta esas filas.
  // El estado (qué valores quedan marcados por columna) vive en la propia tabla (t.__rmdFiltrosCol) y se reaplica cada vez
  // que se llama (idempotente): sigue filtrando tras "Ver todas" o la flecha "▷". Se combinan varias columnas con Y.
  const ICONO_FILTRO_COL = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1.5h10l-3.7 4.6V10l-2.6 1.3V6.1Z"/></svg>';
  function valoresColumnaVerOP(t, i) {
    const vistos = new Map();
    filasPrincipales(t).forEach((tr) => { const txt = norm(celda(tr, i) && celda(tr, i).textContent) || '(vacío)'; const clave = SIN_ACENTOS(txt); if (!vistos.has(clave)) vistos.set(clave, txt); });
    return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }
  function aplicarFiltrosColumnaVerOP(t) {
    const estado = t.__rmdFiltrosCol; const filas = filasPrincipales(t);
    let visibles = 0;
    filas.forEach((tr) => {
      let ok = true;
      if (estado) for (const [i, permitidos] of estado) {
        const clave = SIN_ACENTOS(norm(celda(tr, i) && celda(tr, i).textContent) || '(vacío)');
        if (!permitidos.has(clave)) { ok = false; break; }
      }
      tr.style.display = ok ? '' : 'none'; if (ok) visibles++;
    });
    const cuenta = t.closest('.sapMDialog').querySelector('.rmd-cuenta-verop');
    if (cuenta) cuenta.textContent = (estado && estado.size) ? `${visibles} de ${filas.length} filas` : '';
  }
  function actualizarIconosFiltroVerOP(t) {
    const estado = t.__rmdFiltrosCol;
    t.querySelectorAll('.rmd-th-filtro').forEach((btn) => btn.classList.toggle('activo', !!(estado && estado.has(+btn.dataset.col))));
  }
  function abrirMenuFiltroColumna(ev, t, i) {
    ev.stopPropagation();
    document.querySelectorAll('.rmd-menu-filtro-col').forEach((m) => m.remove());
    const btn = ev.currentTarget, r = btn.getBoundingClientRect();
    const valores = valoresColumnaVerOP(t, i);
    const estado = t.__rmdFiltrosCol || (t.__rmdFiltrosCol = new Map());
    const seleccionados = new Set(estado.has(i) ? estado.get(i) : valores.map(([clave]) => clave));
    const menu = document.createElement('div'); menu.className = 'rmd-menu-filtro-col';
    menu.style.left = Math.round(Math.min(r.left, window.innerWidth - 236)) + 'px'; menu.style.top = Math.round(r.bottom + 4) + 'px';
    const buscar = document.createElement('input'); buscar.type = 'text'; buscar.placeholder = 'Buscar…'; buscar.className = 'rmd-filtro-col-buscar';
    const lista = document.createElement('div'); lista.className = 'rmd-filtro-col-lista';
    const pintar = (texto) => {
      lista.innerHTML = '';
      valores.filter(([, txt]) => !texto || SIN_ACENTOS(txt).includes(SIN_ACENTOS(texto))).forEach(([clave, txt]) => {
        const lab = document.createElement('label'); lab.className = 'rmd-filtro-col-item';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = seleccionados.has(clave);
        chk.addEventListener('change', () => { if (chk.checked) seleccionados.add(clave); else seleccionados.delete(clave); });
        lab.append(chk, document.createTextNode(' ' + txt));
        lista.appendChild(lab);
      });
      if (!lista.children.length) { const p = document.createElement('p'); p.className = 'rmd-nota'; p.textContent = 'Sin coincidencias.'; lista.appendChild(p); }
    };
    pintar('');
    buscar.addEventListener('input', () => pintar(buscar.value));
    buscar.addEventListener('click', (e) => e.stopPropagation());
    const pie = document.createElement('div'); pie.className = 'rmd-filtro-col-pie';
    const bTodo = botonModal('Todo', '', () => { valores.forEach(([clave]) => seleccionados.add(clave)); pintar(buscar.value); });
    const bNinguno = botonModal('Ninguno', '', () => { seleccionados.clear(); pintar(buscar.value); });
    const bOk = botonModal('Aceptar', 'primario', () => {
      if (seleccionados.size >= valores.length) estado.delete(i); else estado.set(i, new Set(seleccionados));
      aplicarFiltrosColumnaVerOP(t); actualizarIconosFiltroVerOP(t); menu.remove(); document.removeEventListener('click', cerrar, true);
    });
    pie.append(bTodo, bNinguno, bOk);
    menu.append(buscar, lista, pie);
    document.body.appendChild(menu);
    const cerrar = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', cerrar, true); } };
    setTimeout(() => document.addEventListener('click', cerrar, true), 0);
  }
  function instalarFiltrosVerOP(d, t) {
    const thead = t.querySelector('thead'), filaEnc = thead && thead.querySelector('tr'); if (!filaEnc) return;
    if (!filaEnc.dataset.rmdFiltroCol) {
      filaEnc.dataset.rmdFiltroCol = '1';
      [...filaEnc.children].forEach((th, i) => {
        const texto = norm(th.textContent); if (!texto) return;
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rmd-th-filtro'; btn.dataset.col = String(i);
        btn.innerHTML = ICONO_FILTRO_COL; btn.title = `Filtrar por ${texto} (como el Autofiltro de Excel)`;
        btn.addEventListener('click', (ev) => abrirMenuFiltroColumna(ev, t, i));
        (th.querySelector('.sapMColumnHeader') || th).appendChild(btn);
      });
    }
    aplicarFiltrosColumnaVerOP(t); actualizarIconosFiltroVerOP(t);
  }
  function gestionarVerOP() {
    if (!on('verop')) { quitarBotonesVerOP(); return; }
    dialogos().forEach((d) => {
      if (!RX_VER_OP.test(cabecera(d))) return;
      const t = d.querySelector('table.sapMListTbl'); if (!t) return;
      instalarFiltrosVerOP(d, t);
      const hdr = d.querySelector('.sapMListHdr'); if (!hdr || hdr.querySelector('.rmd-exportar-op')) return;
      const bT = botonIcono(ICONO_VER_TODAS, 'Ver todas', 'rmd-exportar-op', () => verTodasOP(d, t, bT));
      bT.title = 'Recorre las páginas (5 en 5, con la misma flecha "▷" del portal) y las muestra todas juntas en esta tabla.';
      const bE = botonIcono(ICONO_EXPORTAR, 'Exportar a CSV', 'rmd-exportar-op', () => exportarVerOP(d, t, bE));
      bE.title = 'Exporta a CSV todas las OP asociadas (primero las carga todas, como "Ver todas").';
      const cuenta = document.createElement('span'); cuenta.className = 'rmd-cuenta-verop';
      const ref = hdr.querySelector('.sapMTBSpacer') || hdr.firstElementChild;
      if (ref) { ref.insertAdjacentElement('afterend', cuenta); ref.insertAdjacentElement('afterend', bE); ref.insertAdjacentElement('afterend', bT); } else { hdr.appendChild(bT); hdr.appendChild(bE); hdr.appendChild(cuenta); }
    });
  }
  function quitarBotonesVerOP() {
    document.querySelectorAll('.rmd-exportar-op, .rmd-cuenta-verop').forEach((e) => e.remove());
    document.querySelectorAll('.rmd-th-filtro, .rmd-menu-filtro-col').forEach((e) => e.remove());
    document.querySelectorAll('[data-rmd-filtro-col]').forEach((e) => delete e.dataset.rmdFiltroCol);
  }

  // ---- "Documentos citados" (Procedimientos, Formatos, Instructivos): recorre PRECAUCIONES, NOTAS IMPORTANTES DURANTE EL
  // PROCESO, CONDICIONES AMBIENTALES y las etiquetas de PROCEDIMIENTO abriendo cada lista de pasos con los mismos botones del
  // portal (nunca escribe nada), lee la columna Descripción y busca el patrón <Tipo I/P/F><Área>-<sufijo NNN obligatorio>
  // (mismo criterio que src/rmd_automation/referencias.py). Los procesos menores no se recorren (habría que abrir cada uno).
  const ICONO_DOCUMENTOS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h6l2.5 2.5V14a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z"/><path d="M9.5 1.5V4h2.5M5.5 8h5M5.5 10.5h5"/></svg>';
  const TIPOS_DOC = { I: 'Instructivo', P: 'Procedimiento', F: 'Formato' };
  const ETIQUETAS_PROCEDIMIENTO_CONOCIDAS = ['DOCUMENTACION', 'PREPARACION DE LAS MAQUINAS O EQUIPOS', 'PREPARACION DEL MATERIAL DE ENVASE', 'PREPARACION DEL MATERIAL', 'FABRICACION', 'ENVASE', 'ACONDICIONADO', 'RECUBRIMIENTO', 'RENDIMIENTO'];
  function leerDescripcionesTabla(t) {
    if (!t) return [];
    const ths = [...t.querySelectorAll('thead th')].map((th) => NORM(th.textContent));
    const iDes = ths.findIndex((n) => /^DESCRIPCI/.test(n)); if (iDes < 0) return [];
    return filasPrincipales(t).map((tr) => norm(celda(tr, iDes) && celda(tr, iDes).textContent)).filter(Boolean);
  }
  async function abrirAccionFila(dPadre, textoFila, tituloBoton) {
    const t = tablaDe(dPadre); if (!t) return null;
    const tr = filasPrincipales(t).find((f) => SIN_ACENTOS(f.textContent).includes(SIN_ACENTOS(textoFila))); if (!tr) return null;
    const btn = [...tr.querySelectorAll('button')].find((b) => visible(b) && b.title === tituloBoton); if (!btn) return null;
    const previos = new Set(dialogos());
    pulsar(btn);
    const d = await hasta(() => dialogos().find((x) => !previos.has(x)), 20000);
    if (d) { await hasta(() => !ocupado(), 20000); await esperar(600); }
    return d;
  }
  async function documentosCitadosRMD(dRaiz, avisar) {
    const textos = [];   // [ [origen, descripción], … ]
    for (const estructura of ['PRECAUCIONES', 'NOTAS IMPORTANTES DURANTE EL PROCESO', 'CONDICIONES AMBIENTALES']) {
      avisar && avisar(estructura);
      const d = await abrirAccionFila(dRaiz, estructura, 'Adicionar Pasos RMD');
      if (d) { leerDescripcionesTabla(tablaDe(d)).forEach((desc) => textos.push([estructura, desc])); await cerrarDialogo(d); }
    }
    avisar && avisar('PROCEDIMIENTO');
    const dEtq = await abrirAccionFila(dRaiz, 'PROCEDIMIENTO', 'Adicionar Etiqueta');
    if (dEtq) {
      const filasEtq = filasPrincipales(tablaDe(dEtq));
      const nombres = filasEtq.map((tr) => ETIQUETAS_PROCEDIMIENTO_CONOCIDAS.find((n) => SIN_ACENTOS(tr.textContent).includes(n))).filter(Boolean);
      for (const nombre of nombres) {
        avisar && avisar('PROCEDIMIENTO › ' + nombre);
        const d = await abrirAccionFila(dEtq, nombre, 'Adicionar Pasos RMD');
        if (d) { leerDescripcionesTabla(tablaDe(d)).forEach((desc) => textos.push(['PROCEDIMIENTO › ' + nombre, desc])); await cerrarDialogo(d); }
      }
      await cerrarDialogo(dEtq);
    }
    const hallados = new Map();
    textos.forEach(([origen, desc]) => {
      const rx = new RegExp(PATRON_REFERENCIA_JS.source, 'g'); let m;
      while ((m = rx.exec(desc))) {
        const cod = m[0]; let r = hallados.get(cod);
        if (!r) { r = { codigo: cod, tipo: cod[0], apariciones: 0, ejemplos: [] }; hallados.set(cod, r); }
        r.apariciones++; if (r.ejemplos.length < 2) r.ejemplos.push(`${origen}: ${desc.slice(0, 80)}`);
      }
    });
    return { lista: [...hallados.values()].sort((a, b) => a.codigo < b.codigo ? -1 : 1) };
  }
  // Si la búsqueda se detiene a mitad de camino, cierra las ventanas que ella misma abrió (nunca las que ya estaban).
  async function cerrarLoAbiertoDesde(previos) {
    for (let i = 0; i < 20; i++) {
      const extra = dialogos().filter((x) => !previos.has(x)); if (!extra.length) return;
      await cerrarDialogo(extra[extra.length - 1]);
    }
  }
  async function mostrarDocumentosCitados(dRaiz, boton) {
    if (window.__rmdBuscandoDocs) return; window.__rmdBuscandoDocs = true;
    boton.disabled = true; const texto0 = boton.querySelector('span').textContent;
    const previos = new Set(dialogos());
    const v = ventana('Buscando documentos citados…', { cancelar: () => v.cerrar() });
    v.cuerpo.innerHTML = '<p class="rmd-nota">Recorriendo Precauciones, Notas importantes, Condiciones ambientales y las etiquetas de Procedimiento (no se cambia nada)…</p>';
    try {
      const { lista } = await documentosCitadosRMD(dRaiz, (donde) => { setTxt(boton.querySelector('span'), 'Buscando…'); v.cuerpo.querySelector('p').textContent = 'Leyendo: ' + donde + '…'; });
      if (!lista.length) {
        v.fondo.querySelector('h3').textContent = 'Documentos citados';
        v.cuerpo.innerHTML = '<p>No se encontró ningún código con el formato &lt;I/P/F&gt;Área-sufijo (ej. IPRO-P123) en las descripciones de los pasos.</p><p class="rmd-nota">Los procesos menores no se recorrieron: habría que abrir cada uno.</p>';
        v.pie.innerHTML = ''; v.pie.appendChild(botonModal('Cerrar', 'primario', () => v.cerrar()));
        return;
      }
      v.fondo.querySelector('h3').textContent = `Documentos citados (${lista.length})`;
      const filas = lista.map((r) => `<tr><td>${esc(r.codigo)}</td><td>${esc(TIPOS_DOC[r.tipo] || r.tipo)}</td><td>${r.apariciones}</td><td class="rmd-nota">${esc(r.ejemplos[0] || '')}</td></tr>`).join('');
      v.cuerpo.innerHTML = `<p class="rmd-nota">Procedimientos, Formatos e Instructivos citados en las descripciones de los pasos (no incluye procesos menores).</p>
        <table class="rmd-tabla"><thead><tr><th>Código</th><th>Tipo</th><th>Citas</th><th>Ejemplo</th></tr></thead><tbody>${filas}</tbody></table>`;
      v.pie.innerHTML = '';
      const bDesc = botonModal('Descargar .txt', '', () => {
        const porTipo = { I: [], P: [], F: [] }; lista.forEach((r) => { (porTipo[r.tipo] || (porTipo[r.tipo] = [])).push(r); });
        const lineas = [`Documentos citados — ${cabecera(dRaiz)}`, ''];
        Object.keys(TIPOS_DOC).forEach((t) => { if (!porTipo[t] || !porTipo[t].length) return; lineas.push(`${TIPOS_DOC[t]} (${porTipo[t].length}):`); porTipo[t].forEach((r) => lineas.push(`  ${r.codigo} — ${r.apariciones} cita(s)`)); lineas.push(''); });
        descargarTexto(`documentos_citados_${(/\d{6,}/.exec(cabecera(dRaiz)) || ['rmd'])[0]}.txt`, lineas.join(String.fromCharCode(13, 10)));
      });
      v.pie.append(bDesc, botonModal('Cerrar', 'primario', () => v.cerrar()));
    } catch (e) {
      v.fondo.querySelector('h3').textContent = 'No se pudo completar la búsqueda';
      v.cuerpo.innerHTML = `<p>${esc(e.message)}</p><p class="rmd-nota">Cerrando las ventanas que se hayan quedado abiertas…</p>`;
      v.pie.innerHTML = ''; v.pie.appendChild(botonModal('Cerrar', 'primario', () => v.cerrar()));
      try { await cerrarLoAbiertoDesde(previos); } catch (e2) { /* se deja para que la persona las cierre a mano */ }
    } finally { boton.disabled = false; setTxt(boton.querySelector('span'), texto0); window.__rmdBuscandoDocs = false; }
  }
  function gestionarDocumentosCitados() {
    if (!on('documentos')) { document.querySelectorAll('.rmd-documentos-citados').forEach((e) => e.remove()); return; }
    const dRaiz = dialogos()[0]; if (!dRaiz || !/^\d{6,}\s*-/.test(cabecera(dRaiz))) return;
    const hdr = dRaiz.querySelector('.sapMListHdr'); if (!hdr || hdr.querySelector('.rmd-documentos-citados')) return;
    const b = botonIcono(ICONO_DOCUMENTOS, 'Documentos citados', 'rmd-documentos-citados', () => mostrarDocumentosCitados(dRaiz, b));
    b.title = 'Recorre Precauciones, Notas importantes, Condiciones ambientales y Procedimiento buscando Procedimientos, Formatos e Instructivos citados en las descripciones (no cambia nada; tarda varios segundos).';
    const ref = hdr.querySelector('.sapMTBSpacer') || hdr.firstElementChild;
    if (ref) ref.insertAdjacentElement('afterend', b); else hdr.appendChild(b);
  }

  // ---- Lectura del maestro de RMD con sus recetas, para "Enviar a Status RMD" (junto al icono nativo "Exportar"): ese
  // botón del portal solo trae "Código por Defecto" (codDefectoReceta), un único código, pero un RMD puede tener VARIAS
  // recetas asociadas (la tabla "Recetas Asociadas" de Asociar Fórmula). En vez de abrir esa ventana RMD por RMD, se usa
  // el mismo modelo OData que ya usa el propio botón "Exportar" (mainModelv2, entidad "MD") pidiendo además
  // "aReceta/recetaId" y "estadoIdRmd": la misma API que el portal ya usa para leer (no se inventa ninguna llamada).
  function modeloListaPrincipal() {
    const btnExportar = [...document.querySelectorAll('button')].find((b) => visible(b) && b.title === 'Exportar'); if (!btnExportar) return null;
    const ctl = ctlDe(btnExportar); const ctrl = ctl && ctl.mEventRegistry && ctl.mEventRegistry.press && ctl.mEventRegistry.press[0] && ctl.mEventRegistry.press[0].oListener;
    const vista = ctrl && ctrl.getView && ctrl.getView();
    return vista && vista.getModel('mainModelv2');
  }
  // El servicio devuelve como MÁXIMO 1000 filas por lectura (probado: sin $top corta en 1000 y ni siquiera avisa con
  // __next; con $top > 1000 también corta en 1000). Por eso se cuenta primero ($count, con el mismo filtro) y se piden
  // todas las páginas de 1000 ($skip, orden estable por la clave mdId), 4 a la vez. Si al terminar la última página vino
  // llena (entraron RMD nuevos mientras se leía), se sigue pidiendo hasta que llegue una incompleta.
  const EXPAND_MD = 'estadoIdRmd,sucursalId,motivoId,aReceta/recetaId';
  const SELECT_MD = ['mdId', 'codigo', 'codigoSolicitud', 'version', 'nivelTxt', 'codAgrupadorReceta', 'codDefectoReceta', 'codigoversionprincipal',
    'descripcion', 'observacion', 'fechaRegistro', 'usuarioRegistro', 'fechaAutorizacion', 'usuarioAutorizacion', 'af', 'fechaSolicitud', 'areaRmdTxt',
    'estadoIdRmd/contenido', 'sucursalId/contenido', 'motivoId/descripcion',
    'aReceta/recetaId/Matnr', 'aReceta/recetaId/Verid', 'aReceta/recetaId/Atwrt', 'aReceta/recetaId/Text1', 'aReceta/recetaId/Mdv01',
    'aReceta/recetaId/Plnnr', 'aReceta/recetaId/Alnal'].join(',');
  async function leerMDPaginado(modelo, filtros, avisar) {
    const leer = (ruta, params) => new Promise((resolve, reject) => modelo.read(ruta, {
      filters: filtros, urlParameters: params, success: (d) => resolve(d),
      error: (e) => reject(new Error(`el servidor no respondió la consulta (${(e && e.statusCode) || 'sin código'}); prueba filtrando más`)),
    }));
    const POR_PAGINA = 1000;
    const total = Number(await leer('/MD/$count', {})) || 0;
    const pagina = async (i) => ((await leer('/MD', { $expand: EXPAND_MD, $select: SELECT_MD, $orderby: 'mdId', $top: String(POR_PAGINA), $skip: String(i * POR_PAGINA) })).results || []);
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA)), resultado = new Array(paginas);
    let siguiente = 0, hechas = 0;
    const trabajador = async () => { while (siguiente < paginas) { const i = siguiente++; resultado[i] = await pagina(i); hechas++; if (avisar) avisar(hechas, paginas); } };
    await Promise.all(Array.from({ length: Math.min(4, paginas) }, trabajador));
    for (let i = paginas; resultado[i - 1] && resultado[i - 1].length === POR_PAGINA; i++) resultado.push(await pagina(i));
    const vistos = new Set(), filas = [];
    resultado.forEach((p) => (p || []).forEach((md) => { if (!vistos.has(md.mdId)) { vistos.add(md.mdId); filas.push(md); } }));
    return filas;
  }
  const fechaIso = (f) => (f instanceof Date && !isNaN(f) ? f.toISOString().slice(0, 10) : '');
  // Los 18 datos del "Exportar" nativo del portal (mismos nombres y orden) más el linaje de versiones de un RMD.
  function datosBaseDeMD(md) {
    return {
      codigo: md.codigo || '', codigoSolicitud: md.codigoSolicitud || '', version: md.version != null ? String(md.version) : '',
      estado: (md.estadoIdRmd && md.estadoIdRmd.contenido) || '', codDefecto: md.codDefectoReceta || '', codAgrupador: md.codAgrupadorReceta || '',
      descripcion: md.descripcion || '', etapa: md.nivelTxt || '', fechaRegistro: md.fechaRegistro || null, usuarioRegistro: md.usuarioRegistro || '',
      fechaAut: fechaIso(md.fechaAutorizacion), usuarioAutorizacion: md.usuarioAutorizacion || '', af: md.af || '', fechaSolicitud: md.fechaSolicitud || null,
      planta: (md.sucursalId && md.sucursalId.contenido) || '', seccion: md.areaRmdTxt || '', motivo: (md.motivoId && md.motivoId.descripcion) || '',
      observacion: md.observacion || '', linaje: md.codigoversionprincipal || md.codigo || '',
    };
  }

  // ---- Enviar a Status RMD (status-rmd.vercel.app) sin archivo: el script ya corre dentro de la sesión del portal, así
  // que lee aquí todo el maestro con sus recetas (lectura paginada de arriba, sin filtro) y se lo pasa a esa página abierta
  // en otra pestaña con postMessage, restringido a su origen exacto. No se envía nada a ningún servidor nuevo ni se toca
  // ninguna credencial: los datos van de una pestaña a otra dentro del mismo navegador, y Status RMD los procesa igual que
  // si se hubiera subido el Excel (pide DNI para la trazabilidad, como siempre).
  const URL_STATUS_RMD = 'https://status-rmd.vercel.app/';
  const ORIGEN_STATUS_RMD = 'https://status-rmd.vercel.app';
  const COLUMNAS_PUENTE = ['codigo', 'codigoSolicitud', 'version', 'estado', 'codDefecto', 'codAgrupador', 'descripcion', 'etapa', 'fechaRegistro',
    'usuarioRegistro', 'fechaAut', 'usuarioAutorizacion', 'af', 'fechaSolicitud', 'planta', 'seccion', 'motivo', 'observacion', 'linaje', 'recetas'];
  function filaPuente(md) {
    const f = datosBaseDeMD(md);
    const recetas = ((md.aReceta && md.aReceta.results) || []).map((r) => { const rc = r.recetaId || {}; return [rc.Matnr || '', rc.Verid || '', rc.Atwrt || '', (rc.Text1 || '').trim(), rc.Mdv01 || '', rc.Plnnr || '', rc.Alnal || '']; });
    // Fecha Registro / Solicitud con su hora (ISO en UTC; Status RMD la pasa a hora local): con solo el día, dos RMD
    // registrados el mismo día no se podrían ordenar, y el día en UTC se corría uno en los registros de la noche.
    const fechaHoraIso = (x) => (x instanceof Date && !isNaN(x) ? x.toISOString() : '');
    return COLUMNAS_PUENTE.map((c) => (c === 'recetas' ? recetas : (c === 'fechaRegistro' || c === 'fechaSolicitud') ? fechaHoraIso(f[c]) : f[c]));
  }
  const ICONO_ENVIAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h9.5M8.5 4.5 12 8l-3.5 3.5"/><path d="M14 2.5v11"/></svg>';
  async function enviarAStatusRmd(btn) {
    if (window.__rmdEnviandoStatus) return;
    // La ventana se abre YA, dentro del clic: si se abriera después de leer los datos (tras un await), el navegador la
    // bloquearía como ventana emergente. El parámetro único fuerza a recargarla si la pestaña ya estaba abierta.
    const win = window.open(`${URL_STATUS_RMD}?desde=sap&t=${Date.now()}`, 'status-rmd');
    if (!win) { toast('El navegador bloqueó la ventana de Status RMD: permite ventanas emergentes para este portal y vuelve a intentarlo.', true); return; }
    window.__rmdEnviandoStatus = true; btn.disabled = true;
    const span = btn.querySelector('span'), texto0 = span.textContent;
    let listo = false, respuesta = null;
    const alMensaje = (ev) => {
      if (ev.origin !== ORIGEN_STATUS_RMD || ev.source !== win) return;
      const d = ev.data || {};
      if (d.type === 'STATUS_RMD_LISTO') listo = true; else if (d.type === 'STATUS_RMD_RECIBIDO') respuesta = d;
    };
    window.addEventListener('message', alMensaje);
    const ping = setInterval(() => { try { if (!listo && !win.closed) win.postMessage({ type: 'STATUS_RMD_PING' }, ORIGEN_STATUS_RMD); } catch (e) { /* aún cargando */ } }, 800);
    try {
      const modelo = modeloListaPrincipal(); if (!modelo) throw new Error('abre la lista "Configuración Manufactura Digital" para poder leer el maestro');
      const datos = await leerMDPaginado(modelo, [], (h, t) => setTxt(span, `Leyendo SAP… ${h}/${t}`));
      const payload = { type: 'RMD_SAP_MAESTRO', v: 1, generado: new Date().toISOString(), columnas: COLUMNAS_PUENTE, filas: datos.map(filaPuente) };
      setTxt(span, 'Esperando a Status RMD…');
      await hasta(() => listo || win.closed, 60000, 250);
      if (win.closed) throw new Error('se cerró la pestaña de Status RMD antes de enviarle los datos');
      if (!listo) throw new Error('Status RMD no respondió: ¿cargó la página y ya tiene la versión con enlace a SAP?');
      win.postMessage(payload, ORIGEN_STATUS_RMD);
      setTxt(span, 'Confirma tu DNI en Status RMD…');
      await hasta(() => respuesta || win.closed, 300000, 300);
      if (!respuesta) throw new Error('no llegó la confirmación de Status RMD (¿se canceló el DNI o se cerró la pestaña?)');
      if (!respuesta.ok) throw new Error(respuesta.motivo || 'Status RMD no aceptó los datos');
      toast(`Enviado a Status RMD: ${datos.length} RMD leídos de SAP. ${respuesta.resumen || ''}`.trim());
    } catch (e) { toast('No se pudo enviar a Status RMD: ' + e.message, true); }
    finally { clearInterval(ping); window.removeEventListener('message', alMensaje); btn.disabled = false; setTxt(span, texto0); window.__rmdEnviandoStatus = false; }
  }
  function gestionarBotonStatusRmd() {
    if (!on('statusrmd')) { document.querySelectorAll('.rmd-status-rmd').forEach((e) => e.remove()); return; }
    const btnExportar = [...document.querySelectorAll('button')].find((b) => visible(b) && b.title === 'Exportar'); if (!btnExportar) return;
    const barra = btnExportar.closest('.sapMBar, .sapMOTB, .sapMToolbar') || btnExportar.parentElement; if (!barra) return;
    if (!barra.querySelector('.rmd-status-rmd')) {
      const s = botonIcono(ICONO_ENVIAR, 'Enviar a Status RMD', 'rmd-status-rmd', () => enviarAStatusRmd(s));
      s.title = 'Lee aquí el maestro completo de RMD con sus recetas y se lo pasa directo a Status RMD (status-rmd.vercel.app) en otra pestaña, sin descargar ni subir archivos. Allí se confirma con el DNI, como siempre.';
      btnExportar.insertAdjacentElement('afterend', s);
    }
  }

  // ---- Experimental: aplicar "Aa" (minúsculas con redacción correcta) y el aviso de ortografía sobre los textarea editables
  // ya existentes (Descripción Paso de "Nuevo Paso", Descripción/Especificaciones de Especificaciones). Nunca escriben solas.
  const ICONO_AA = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 11 5 3l3 8M2.8 8.5h4.4"/><path d="M9.5 11c0-1.4 1.1-2.3 2.5-2.3s2.4.8 2.4 2c0 1-.7 1.3-1.8 1.6-1.2.3-2.7.6-2.7 2 0 .9.8 1.2 1.7 1.2 1.1 0 2-.5 2.4-1.3"/></svg>';
  const casiTodoMayus = (t) => { const letras = (t || '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, ''); return letras.length > 4 && letras === letras.toUpperCase() && letras !== letras.toLowerCase(); };
  function gestionarTextosMayusculas() {
    document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) textarea').forEach((ta) => {
      // "Nuevo Paso" y "Editar Paso" (Configuración Maestra) no siempre se llaman igual: se detectan por el campo "Descripción Paso"
      // en vez de por el título, para que también funcione si el portal lo abre con otro nombre.
      const d = enDialogo(ta); const aplica = d && (gestionada(d) || !!campoDe(d, 'Descripción Paso'));
      if (!aplica) { ta.classList.remove('rmd-ortografia'); const b = ta.parentElement && ta.parentElement.querySelector(':scope > .rmd-aa'); if (b) b.remove(); return; }
      if (ta.readOnly || ta.disabled) return;
      if (!on('minusculas')) { const b = ta.parentElement && ta.parentElement.querySelector(':scope > .rmd-aa'); if (b) b.remove(); }
      else if (casiTodoMayus(ta.value) && ta.parentElement && !ta.parentElement.querySelector(':scope > .rmd-aa')) {
        getComputedStyle(ta.parentElement).position === 'static' && (ta.parentElement.style.position = 'relative');
        const b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-aa'; b.innerHTML = ICONO_AA;
        b.title = 'Pasar a minúsculas con mayúscula al iniciar oración (experimental: revisa el resultado antes de guardar).';
        b.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          ta.value = mejorarTexto(ta.value); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); ta.focus();
        });
        ta.parentElement.appendChild(b);
      }
      if (!on('ortografia')) { ta.classList.remove('rmd-ortografia'); ta.removeAttribute('data-rmd-dudosas'); return; }
      // En MAYÚSCULAS: ortografía por palabra + concordancia de artículo (singular/plural). En minúsculas (tras "Aa"): tildes
      // que faltan y puntuación final, no ortografía por palabra (ya casi todo son palabras válidas del diccionario).
      const enMayus = casiTodoMayus(ta.value);
      const avisos = enMayus
        ? [...revisarOrtografia(ta.value).map((p) => `"${p}" no reconocida`), ...revisarConcordancia(ta.value)]
        : revisarTildesYPuntuacion(ta.value);
      ta.classList.toggle('rmd-ortografia', avisos.length > 0);
      if (avisos.length) { const t = '(revisar; puede haber falsos avisos) ' + avisos.join(' · '); ta.title = t; ta.dataset.rmdDudosas = t; }
      else { ta.removeAttribute('title'); ta.removeAttribute('data-rmd-dudosas'); }
    });
  }

  // ---- Botón "Nuevo Paso" dentro del selector "Adicionar Pasos": abre el mismo "Nuevo Paso" de Configuración Maestra, apilado
  // encima (no navega fuera de la edición del RMD), y precarga Estructura/Etiqueta con el contexto de este selector si coinciden.
  // No pulsa "Agregar" por el usuario: solo abre la ventana para que la complete y guarde ella misma.
  const ICONO_NUEVO_PASO = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5h8M2 8h5M2 12.5h5"/><circle cx="12.5" cy="10.5" r="2.8"/><path d="M12.5 9v3M11 10.5h3"/></svg>';
  function instalarBotonNuevoPaso(d) {
    if (d.querySelector('.rmd-nuevo-paso-grupo')) return;
    const ir = botonIr(d); if (!ir) return;
    const grupo = document.createElement('span'); grupo.className = 'rmd-nuevo-paso-grupo';
    const b = botonIcono(ICONO_NUEVO_PASO, 'Nuevo Paso', 'rmd-nuevo-paso', () => abrirNuevoPasoMaestro(d));
    b.title = 'Abre "Nuevo Paso" de Configuración Maestra (para crear un paso que aún no existe) sin salir de este selector.';
    grupo.appendChild(b);
    ir.insertAdjacentElement('afterend', grupo);
  }
  function quitarBotonNuevoPaso(d) { d.querySelectorAll('.rmd-nuevo-paso-grupo').forEach((x) => x.remove()); }
  async function abrirNuevoPasoMaestro(d) {
    if (window.__rmdAbriendoNuevoPaso) return; window.__rmdAbriendoNuevoPaso = true;
    try {
      const estructura = valorDeCampo(d, 'Estructura'), etiqueta = valorDeCampo(d, 'Etiqueta');
      const previos = new Set(dialogos());
      const btnConfigurar = botonPorTitulo(document, 'Configurar'); if (!btnConfigurar) throw new Error('No encuentro el botón "Configurar" de la lista principal');
      pulsar(btnConfigurar);
      const maestra = await hasta(() => dialogos().find((x) => !previos.has(x) && /^Configuraci[oó]n Maestra/i.test(cabecera(x))), 15000);
      if (!maestra) throw new Error('No se abrió "Configuración Maestra"');
      await hasta(() => !ocupado(), 15000); await esperar(500);
      const tab = [...maestra.querySelectorAll('[role=tab]')].find((x) => /(^|\s)Paso(\s|$)/.test(norm(x.textContent)));
      if (!tab) throw new Error('No encuentro la pestaña "Paso" de Configuración Maestra');
      // Los filtros de esta barra (IconTabBar en modo filtro) no reaccionan a un .click() sintético: hace falta la secuencia real de eventos de puntero.
      const opts = { bubbles: true, cancelable: true, view: window };
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((tipo) => { const Ctor = tipo.startsWith('pointer') ? PointerEvent : MouseEvent; tab.dispatchEvent(new Ctor(tipo, opts)); });
      await esperar(1200); await hasta(() => !ocupado(), 15000);
      const btnNuevo = botonPorTitulo(maestra, 'Nuevo Paso') || [...maestra.querySelectorAll('button')].find((b) => visible(b) && /^Nuevo Paso/i.test(norm(b.textContent)));
      if (!btnNuevo) throw new Error('No encuentro el botón "Nuevo Paso"');
      const previos2 = new Set(dialogos());
      pulsar(btnNuevo);
      const dlg = await hasta(() => dialogos().find((x) => !previos2.has(x) && /^Nuevo Paso/i.test(cabecera(x))), 15000);
      if (!dlg) throw new Error('No se abrió la ventana "Nuevo Paso"');
      await esperar(500);
      const fijar = async (etiquetaCampo, texto) => {
        if (!texto) return false;
        const el = campoDe(dlg, etiquetaCampo), c = el && ctlDe(el); if (!c || !c.getItems) return false;
        const it = await hasta(() => c.getItems().find((x) => norm(x.getText ? x.getText() : '') === norm(texto)), 4000, 250);   // Etiqueta depende de la Estructura elegida: su lista tarda en llenarse
        if (!it) return false;
        c.setSelectedItem(it); if (c.setValue) c.setValue(it.getText());
        if (c.fireSelectionChange) c.fireSelectionChange({ selectedItem: it }); if (c.fireChange) c.fireChange({ value: it.getText() });
        return true;
      };
      if (await fijar('Estructura', estructura)) await fijar('Etiqueta', etiqueta);
      toast('Se abrió "Nuevo Paso" de Configuración Maestra. Complétalo y pulsa Agregar; luego cierra esta ventana y busca el nuevo código aquí para añadirlo al RMD.');
    } catch (e) {
      toast('No se pudo abrir "Nuevo Paso": ' + e.message, true);
    } finally { window.__rmdAbriendoNuevoPaso = false; }
  }

  const ICONO_COPIAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10H4"/></svg>';
  const ICONO_PEGAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1.5h4v2H6z"/><path d="M4 3h-.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 12.5 3H12"/></svg>';
  const ICONO_AJUSTES = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7"/><circle cx="10.5" cy="4.5" r="1.5"/><circle cx="5.5" cy="11.5" r="1.5"/></svg>';
  const botonIcono = (icono, txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-btn ' + (cls || ''); b.innerHTML = icono + '<span></span>'; b.querySelector('span').textContent = txt; b.addEventListener('click', fn); return b; };
  // Los botones van en la barra de herramientas de la tabla ("Pasos (n)"), justo a la izquierda del separador y del icono de impresora.
  function instalarBotonesCopia(d) {
    const hdr = d.querySelector('.sapMListHdr'); if (!hdr || hdr.querySelector('.rmd-copia-grupo')) return;
    const grupo = document.createElement('span'); grupo.className = 'rmd-copia-grupo';
    const bc = botonIcono(ICONO_COPIAR, 'Copiar configuración', 'rmd-copiar', () => copiarPaso(d, tablaDe(d)));
    bc.title = 'Marca la casilla del paso de referencia y pulsa aquí: copia su configuración y sus procesos menores.';
    const bp = botonIcono(ICONO_PEGAR, 'Pegar', 'rmd-pegar', () => pegarPaso(d, tablaDe(d)));
    bp.title = 'Marca la casilla del paso nuevo y pulsa aquí: muestra una vista previa y aplica la configuración y los procesos menores copiados.';
    grupo.append(bc, bp);
    const ref = hdr.querySelector('.sapMTBSeparator') || [...hdr.querySelectorAll('button')].find((b) => b.title === 'Imprimir');
    if (ref) hdr.insertBefore(grupo, ref); else hdr.appendChild(grupo);
    pintarEstadoPortapapeles();
  }

  // ---- 10. Panel para activar/desactivar cada mejora -------------------------------------------
  // Grupos del panel (las claves son las de OPC)
  const GRUPOS_PANEL = [
    ['Ventanas y tablas', ['ancho', 'columnas', 'ocultar', 'estado', 'pmtitulo', 'grupos', 'depende']],
    ['Alertas', ['reglas', 'sintipo', 'puesto']],
    ['Herramientas', ['filtro', 'copiar', 'espec', 'nuevopaso', 'verop', 'documentos', 'statusrmd', 'asociar', 'singuardar', 'exito', 'sesion', 'enter']],
    ['Experimental', ['minusculas', 'ortografia']],
  ];
  function panel() {
    const etiqueta = Object.fromEntries(OPC);
    const fila = (k, cls) => `<label class="rmd-fila ${cls || ''}"><span>${etiqueta[k]}</span><input type="checkbox" data-k="${k}" ${opc[k] ? 'checked' : ''}></label>`;
    const p = document.createElement('details'); p.id = 'rmd-ui-panel';
    p.innerHTML = '<summary title="Mejoras de interfaz" aria-label="Mejoras de interfaz">' + ICONO_AJUSTES + '</summary><div class="rmd-panel-cuerpo">' +
      '<div class="rmd-panel-cab"><b>Mejoras de interfaz</b><span>v' + VERSION + '</span></div>' + fila('activo', 'maestro') +
      GRUPOS_PANEL.map(([t, ks]) => `<div class="rmd-grupo">${t}</div>` + ks.map((k) => fila(k)).join('')).join('') +
      '<div class="rmd-panel-pie"><span>Ctrl+S = Guardar el diálogo abierto</span><button type="button" class="rmd-btn rmd-restablecer">Restablecer</button></div></div>';
    const refrescar = () => p.querySelectorAll('input[data-k]').forEach((i) => { i.checked = !!opc[i.dataset.k]; });
    p.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return;
      e.stopPropagation(); opc[k] = e.target.checked; guardar(opc); aplicarClases();
      document.querySelectorAll('.sapMDialog th, .sapMDialog td').forEach((c) => { if (c.style.display === 'none') c.style.display = ''; });
      ajustarTodo();
    });
    p.querySelector('.rmd-restablecer').addEventListener('click', () => { OPC.forEach(([k]) => { opc[k] = true; }); guardar(opc); refrescar(); aplicarClases(); ajustarTodo(); });
    panelEl = p; montarPanel();
  }
  // El botón cuelga de <html>, no de <body>: UI5 usa el <body> como zona de dibujo y, al montar la app (unos segundos después de cargar la página),
  // aparta a su zona oculta de "preservados" cualquier nodo con id que cuelgue del <body>, y el botón desaparecía. Fuera del <body> no lo toca.
  // Además se vigila (observador de <html> y revisión periódica) por si algo lo retira: se vuelve a colgar el mismo elemento, con su estado.
  let panelEl = null;
  function montarPanel() {
    if (panelEl && (panelEl.parentNode !== html || !panelEl.isConnected)) html.appendChild(panelEl);
    if (!estilo.isConnected) (document.head || html).appendChild(estilo);
    if (!!on('ancho') !== html.classList.contains('rmd-ui')) aplicarClases();                 // (si algo reescribiera las clases de <html>)
  }
  new MutationObserver(montarPanel).observe(html, { childList: true });
  aplicarClases(); panel(); ajustarTodo();
})();
