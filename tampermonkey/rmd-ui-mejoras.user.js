// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.27.0
// @description  Saludo al entrar con tus RMD en Ingresado y "Continuar con" el último, Ctrl+K = Ir a… (abrir un RMD o una herramienta), código del RMD en la pestaña, Enter = "Ir", diálogos a medida, columnas ordenadas, estado del RMD, alertas de casillas incoherentes y predecesor obligatorio, copiar/pegar un paso en uno o varios pasos, pasos en minúsculas desde uno en MAYÚSCULAS, procesos menores mal configurados marcados sin abrirlos, PM OP marcada a la vista, reordenar y editar Especificaciones, aviso de códigos y de nomenclatura en Asociar Fórmula, botón Nuevo Paso al adicionar pasos, Ver OP sin límite de 5 (carga rápida), filtrable y exportable a CSV, Documentos citados de todo el RMD (en segundos, Excel), menú Exportar (original con Producción Estado, Equipos por master e Indicadores del mes), Buscar RMD por equipo, Suspensión masiva, aviso de recetas con la lista de materiales cambiada en SAP (⚠ con el detalle junto al código, al día sin cerrar la ventana; hoja de ruta y puesto opcional), un mismo paso varias veces en la barra de seleccionados (en su orden), Editar Paso sin afectar otros RMD ni duplicar pasos, reordenar fórmulas, varias recetas a la vez y mismo puesto de trabajo, jefe de revisión en Producción Estatus, RMD en vivo que va a lo que cambió (opcional), aviso del orden de las estructuras según los últimos autorizados, envío directo del maestro de RMD con sus recetas a Status RMD, sesión prolongada automáticamente (sin el error del refresco al volver) y más.
// @match        https://*.hana.ondemand.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const VERSION = '1.27.0';                                                       // mantener igual a @version
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
    ['sesion', 'Prolongar la sesión (clic automático en "Continuar trabajando" y sin el error del refresco automático al volver)'],
    ['nuevopaso', 'Botón "Nuevo Paso" al adicionar pasos (abre Configuración Maestra)'],
    ['pasominusculas', 'Pasar a minúsculas: botón "En minúsculas" (crea el paso en minúsculas a partir de uno en MAYÚSCULAS, con "Nuevo Paso" ya lleno) y botón "Aa" en la Descripción de "Nuevo Paso" / "Editar Paso"'],
    ['verop', 'Ver OP: ver todas y exportar a CSV'],
    ['documentos', 'Documentos citados e incoherencias de todo el RMD (con procesos menores; Excel)'],
    ['statusrmd', 'Botón "Enviar a Status RMD" (maestro completo sin archivo)'],
    ['indicadores', '"Indicadores del mes" en el menú Exportar (Excel del mes con tablas dinámicas)'],
    ['exportar', 'Exportar: menú en el icono del portal (exportado original con "Producción Estado", Equipos por master e Indicadores)'],
    ['equipos', '"Equipos por master" en el menú Exportar (Excel de todos los master con sus equipos, instrumentos y materiales)'],
    ['buscarequipo', 'Botón "Buscar por equipo" (RMD que tienen un equipo, instrumento o material)'],
    ['suspension', 'Botón "Suspensión masiva" (varios RMD autorizados a la vez, con el Guardar de Asociar fórmulas)'],
    ['citastodos', '"Documentos citados en todos los master" en el menú Exportar'],
    ['recetas', 'Avisar si la lista de materiales de una receta asociada cambió en SAP (⚠ con el detalle junto al código y botón "Revisar recetas" en Asociar fórmulas)'],
    ['recetaruta', 'Recetas: avisar también si en SAP cambió su hoja de ruta o puesto de trabajo (lo más resaltante frente a la asociada y a la versión anterior)'],
    ['repetirpaso', 'Adicionar Pasos: repetir un paso en la barra de seleccionados (+) y ordenarlos arrastrando; Agregar los agrega en ese orden'],
    ['editarpaso', 'Editar Paso: si el paso está en otros RMD, elegir entre generar uno nuevo (sin duplicar) o sobrescribirlo, con confirmación de 5 s'],
    ['formulas', 'Fórmulas: subir / bajar los términos sin eliminarlos (Alt+↑ / Alt+↓)'],
    ['recetasvarias', 'Asociar fórmulas: marcar varias recetas y eliminarlas de una vez'],
    ['puestoreceta', 'Asociar fórmulas: no asociar recetas con un puesto de trabajo distinto al de las ya asociadas'],
    ['revisor', 'Producción Estatus: nombre del jefe (y gerente) a quien se envió a revisión'],
    ['vivo', 'RMD en vivo: el PDF del RMD a la derecha, actualizado tras cada cambio guardado (las ventanas pasan a la mitad izquierda)'],
    ['ordenest', 'Orden de las estructuras del RMD según los últimos autorizados de su sección y etapa'],
    ['saludo', 'Saludo al entrar ("Buenos días, …") con tus RMD en Ingresado y "Continuar con" el último RMD; se desvanece solo'],
    ['paleta', 'Ctrl+K = Ir a…: abrir un RMD (recientes, los tuyos o por código) o una herramienta sin buscarla'],
    ['titulo', 'La pestaña del navegador muestra el código del RMD abierto'],
  ];
  const opc = Object.assign(Object.fromEntries(OPC.map(([k]) => [k, true])), leer());
  const on = (k) => opc.activo && opc[k];
  // Apagadas por defecto: "RMD en vivo" cambia la disposición de las ventanas; solo se activa si la persona lo elige.
  ['vivo', 'recetaruta'].forEach((k) => { if (opc[k] === true && leer()[k] === undefined) opc[k] = false; });
  // Por defecto apagadas: pasar a minúsculas es una redacción automática y la ortografía usa un diccionario reducido; ambas piden revisar el resultado.

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
  td.rmd-orden-mal { outline: 2px solid #ff4d4d; outline-offset: -3px; }
  .rmd-exportar-menu { position: relative; } .rmd-exportar-menu::after { content: ''; position: absolute; right: 2px; bottom: 5px; border: 3px solid transparent; border-top-color: currentColor; pointer-events: none; }
  .rmd-menu { position: fixed; z-index: 100000; min-width: 290px; padding: 4px; border-radius: 8px; background: var(--rmd-superficie); border: 1px solid var(--rmd-borde); box-shadow: 0 10px 30px rgba(0,0,0,.35); font-family: var(--rmd-fuente); }
  .rmd-menu-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 8px 10px; border: 0; border-radius: 6px; background: none; color: var(--rmd-texto); text-align: left; cursor: pointer; font: inherit; }
  .rmd-menu-item b { font-size: 13.5px; font-weight: 600; } .rmd-menu-item span { font-size: 12px; color: var(--rmd-apagado); }
  .rmd-menu-item:hover, .rmd-menu-item:focus-visible { background: rgba(27,141,236,.14); outline: none; }
  .rmd-busca-eq { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; } .rmd-busca-eq input[type=search], .rmd-susp-motivo { flex: 1 1 420px; width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-barra); color: var(--rmd-texto); font: 13.5px var(--rmd-fuente); }
  .rmd-link { border: 0; background: none; padding: 0; color: var(--rmd-acento-texto); text-decoration: underline; cursor: pointer; font: inherit; }
  .rmd-orden-aviso { margin: 6px 16px 4px; padding: 7px 10px; border-left: 3px solid #ff4d4d; border-radius: 3px; background: rgba(255,77,77,.09); color: var(--rmd-texto); font: 13px/1.45 var(--rmd-fuente); }
  .rmd-orden-aviso b { color: var(--rmd-rojo); }
  .rmd-receta-aviso { margin: 6px 16px 4px; padding: 7px 10px; border-left: 3px solid var(--rmd-ambar); border-radius: 3px; background: rgba(240,180,90,.10); color: var(--rmd-texto); font: 13px/1.45 var(--rmd-fuente); }
  .rmd-receta-aviso b { color: var(--rmd-ambar); } .rmd-receta-aviso .rmd-link { font-weight: 600; }
  .rmd-rec-icono { display: inline-flex; align-items: center; gap: 2px; margin-left: 6px; padding: 0 6px; height: 18px; border: 1px solid var(--rmd-ambar); border-radius: 9px; background: rgba(240,180,90,.14); color: var(--rmd-ambar); font: 700 11px var(--rmd-fuente); cursor: pointer; vertical-align: middle; }
  .rmd-rec-icono:hover { background: var(--rmd-ambar); color: #1d232a; }
  .rmd-rec-detalle { position: fixed; z-index: 100002; max-height: min(70vh, 620px); overflow: auto; padding: 12px 14px 10px; border-radius: 8px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-top: 3px solid var(--rmd-ambar); box-shadow: 0 14px 40px rgba(0,0,0,.45); font: 12.5px/1.4 var(--rmd-fuente); }
  .rmd-rec-detalle.fijo { box-shadow: 0 14px 40px rgba(0,0,0,.55), 0 0 0 1px var(--rmd-ambar); }
  .rmd-rec-detalle hr { border: 0; border-top: 1px solid var(--rmd-borde); margin: 10px 0; }
  .rmd-rec-cab b { font-size: 14px; } .rmd-rec-cab span { color: var(--rmd-apagado); }
  .rmd-rec-sub { margin: 8px 0 4px; font-weight: 600; color: var(--rmd-ambar); }
  .rmd-rec-tabla { width: 100%; border-collapse: collapse; } .rmd-rec-tabla th { text-align: left; padding: 4px 6px; color: var(--rmd-apagado); font-weight: 600; border-bottom: 1px solid var(--rmd-borde); white-space: nowrap; }
  .rmd-rec-tabla td { padding: 4px 6px; border-bottom: 1px solid rgba(128,128,128,.18); vertical-align: top; } .rmd-rec-tabla td:nth-child(n+4) { white-space: nowrap; }
  .rmd-rec-marca { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-weight: 700; }
  tr.rmd-rec-reemplazo .rmd-rec-marca { background: rgba(27,141,236,.2); color: var(--rmd-acento-texto); } .rmd-rec-antes { color: var(--rmd-apagado); font-weight: 400; text-decoration: line-through; } tr.rmd-rec-reemplazo td:last-child { font-weight: 600; }
  tr.rmd-rec-nuevo .rmd-rec-marca { background: rgba(143,209,158,.2); color: var(--rmd-verde); } tr.rmd-rec-quitado .rmd-rec-marca { background: rgba(255,138,138,.18); color: var(--rmd-rojo); } tr.rmd-rec-cambia .rmd-rec-marca { background: rgba(240,180,90,.2); color: var(--rmd-ambar); }
  tr.rmd-rec-quitado td:nth-child(n+2) { color: var(--rmd-apagado); text-decoration: line-through; } tr.rmd-rec-cambia td:nth-child(n+3) { color: var(--rmd-texto); } tr.rmd-rec-cambia td:last-child, tr.rmd-rec-nuevo td:last-child { font-weight: 600; }
  .rmd-rec-delta { color: var(--rmd-ambar); font-weight: 600; } .rmd-rec-linea { margin: 6px 0 0; } .rmd-rec-rojo { color: var(--rmd-rojo); } .rmd-rec-nuevo { color: var(--rmd-verde); font-weight: 600; } span.rmd-rec-quitado { color: var(--rmd-rojo); font-weight: 600; }
  .rmd-rec-pie { margin-top: 10px; color: var(--rmd-apagado); font-size: 12px; }
  html.rmd-ui .sapMDialog.rmd-medio.rmd-selector-ancho { width: min(1480px, 96vw) !important; }
  .sapMToken.rmd-token-rep { display: inline-flex !important; align-items: center; }
  .rmd-token-mas { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 14px; height: 14px; margin: 0 2px 0 6px; border-radius: 3px; background: var(--rmd-acento); color: #fff; font: 700 12px/1 var(--rmd-fuente); cursor: pointer; }
  .rmd-token-mas:hover { filter: brightness(1.15); } .sapMToken[draggable] { cursor: grab; } .sapMToken.rmd-token-arrastre { opacity: .45; } .sapMToken.rmd-token-destino { box-shadow: -3px 0 0 var(--rmd-acento); }
  .rmd-btn.exito { background: #2e7d32; border-color: #2e7d32; color: #fff; } .rmd-btn.exito:hover { background: #276c2b; }
  .rmd-btn.ambar { background: #b26a00; border-color: #b26a00; color: #fff; } .rmd-btn.ambar:hover { background: #995b00; } .rmd-btn.ambar:disabled { opacity: .45; }
  .rmd-formula-orden { display: inline-flex; gap: 6px; margin: 0 10px; } .rmd-formula-orden .rmd-btn { height: 30px; padding: 0 10px; }
  .rmd-revisor { display: block; margin-top: 2px; font-size: 11.5px; line-height: 1.25; color: var(--rmd-apagado); white-space: normal; }
  .rmd-borrar-recetas { margin: 0 8px; height: 30px; }
  html.rmd-vivo .sapMDialog:not(.sapMMessageDialog) { position: fixed !important; left: 8px !important; top: 8px !important; transform: none !important; width: calc(50vw - 16px) !important; max-width: calc(50vw - 16px) !important; max-height: calc(100vh - 16px) !important; }
  html.rmd-vivo .sapMDialog.sapMMessageDialog { left: 25vw !important; }
  .rmd-vivo-panel { position: fixed; top: 0; right: 0; width: 50vw; height: 100vh; z-index: 5000; display: flex; flex-direction: column; background: var(--rmd-superficie); border-left: 1px solid var(--rmd-borde); box-shadow: -6px 0 18px rgba(0,0,0,.25); }
  .rmd-vivo-cab { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-bottom: 1px solid var(--rmd-borde); color: var(--rmd-texto); font: 13px var(--rmd-fuente); } .rmd-vivo-estado { flex: 1; color: var(--rmd-apagado); }
  .rmd-vivo-marco { position: relative; flex: 1; background: #525659; overflow: hidden; }
  .rmd-vivo-pdf { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #525659; opacity: 0; pointer-events: none; transition: opacity .5s ease; }
  .rmd-vivo-pdf.activo { opacity: 1; pointer-events: auto; }
  .rmd-vivo-barra { height: 2px; background: transparent; overflow: hidden; position: relative; }
  .rmd-vivo-panel.generando .rmd-vivo-barra::after { content: ''; position: absolute; top: 0; left: -40%; width: 40%; height: 100%; background: var(--rmd-acento); animation: rmd-vivo-carga 1.1s ease-in-out infinite; }
  @keyframes rmd-vivo-carga { from { left: -40%; } to { left: 100%; } }
  .rmd-saludo { position: fixed; left: 62px; bottom: 14px; z-index: 99998; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; max-width: min(460px, 70vw); padding: 9px 14px 10px; border-radius: 10px;
    background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); box-shadow: 0 8px 24px rgba(0,0,0,.28); font: 13px/1.35 var(--rmd-fuente);
    opacity: 0; transform: translateY(10px); transition: opacity .7s ease, transform .7s ease; pointer-events: none; }
  .rmd-saludo.visible { opacity: 1; transform: none; pointer-events: auto; }
  .rmd-saludo b { font-size: 14.5px; font-weight: 600; } .rmd-saludo-resumen:empty { display: none; } .rmd-saludo-resumen, .rmd-saludo-tip { color: var(--rmd-apagado); font-size: 12px; } .rmd-saludo-tip { opacity: .8; }
  .rmd-saludo-continuar { margin: 2px 0 1px; padding: 0; border: 0; background: none; color: var(--rmd-acento-texto); font: 600 12.5px var(--rmd-fuente); cursor: pointer; text-align: left; } .rmd-saludo-continuar:hover { text-decoration: underline; }
  .rmd-paleta-fondo { position: fixed; inset: 0; z-index: 100000; display: flex; justify-content: center; align-items: flex-start; padding-top: 11vh; background: rgba(0,0,0,.34); }
  .rmd-paleta { width: min(720px, 92vw); overflow: hidden; border-radius: 10px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); box-shadow: 0 18px 50px rgba(0,0,0,.45); font: 13px var(--rmd-fuente); animation: rmd-paleta-entra .14s ease-out; }
  @keyframes rmd-paleta-entra { from { opacity: 0; transform: translateY(-6px) scale(.985); } to { opacity: 1; transform: none; } }
  .rmd-paleta-q { display: block; width: 100%; box-sizing: border-box; padding: 14px 16px; border: 0; border-bottom: 1px solid var(--rmd-borde); outline: none; background: transparent; color: inherit; font: 15px var(--rmd-fuente); }
  .rmd-paleta-res { max-height: 56vh; overflow: auto; padding: 4px 0 6px; }
  .rmd-paleta-sec { padding: 9px 16px 4px; color: var(--rmd-apagado); font: 600 11px var(--rmd-fuente); letter-spacing: .6px; text-transform: uppercase; }
  .rmd-paleta-it { display: flex; align-items: center; gap: 10px; padding: 7px 16px; cursor: pointer; }
  .rmd-paleta-it.activo { background: rgba(27,141,236,.18); box-shadow: inset 3px 0 0 var(--rmd-acento); }
  .rmd-paleta-it .cod { min-width: 88px; font-weight: 600; } .rmd-paleta-it .ver { min-width: 26px; color: var(--rmd-apagado); font-size: 12px; }
  .rmd-paleta-it .desc { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .rmd-paleta-it .meta { color: var(--rmd-apagado); font-size: 12px; white-space: nowrap; }
  .rmd-paleta-acc { display: none; gap: 4px; } .rmd-paleta-it.activo .rmd-paleta-acc { display: inline-flex; }
  .rmd-paleta-acc button { padding: 2px 8px; border: 1px solid var(--rmd-borde); border-radius: 4px; background: transparent; color: var(--rmd-acento-texto); font: 12px var(--rmd-fuente); cursor: pointer; } .rmd-paleta-acc button:hover { background: var(--rmd-acento); color: #fff; }
  .rmd-paleta-vacio { padding: 16px; color: var(--rmd-apagado); }
  .rmd-paleta-pie { display: flex; justify-content: space-between; gap: 12px; padding: 7px 16px; border-top: 1px solid var(--rmd-borde); color: var(--rmd-apagado); font-size: 12px; }
  .rmd-vivo-estado { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } .rmd-vivo-ir[hidden] { display: none; }
  /* paso con procesos menores mal configurados (revisados sin abrir su ventana): la celda "Proc. Men." con un contador rojo */
  html.rmd-reglas td.rmd-pm-mal { position: relative; outline: 2px solid #ff4d4d; outline-offset: -3px; background: rgba(255,77,77,.14) !important; }
  html.rmd-reglas td.rmd-pm-mal::after { content: attr(data-rmd-pm); position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; padding: 0 4px; box-sizing: border-box; border-radius: 8px; background: #ff4d4d; color: #fff; font: 700 10.5px/16px var(--rmd-fuente); text-align: center; pointer-events: none; }

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
  .rmd-op-avance { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; background: rgba(0,0,0,.38); }
  .rmd-op-caja { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 300px; padding: 18px 22px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.4); font: 14px/1.4 var(--rmd-fuente); }
  .rmd-op-barra { width: 260px; height: 6px; border-radius: 3px; background: rgba(128,140,155,.25); overflow: hidden; } .rmd-op-barra > div { width: 0; height: 100%; background: var(--rmd-acento); transition: width .25s ease; }
  .rmd-op-txt { color: var(--rmd-apagado); font-size: 13px; }
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
  #rmd-filtro-bar .rmd-clip { flex: 1 1 200px; min-width: 0; margin-left: auto; display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 12px; }
  #rmd-filtro-bar .rmd-clip > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rmd-clip-x { flex: 0 0 auto; width: 18px; height: 18px; padding: 0; border: 1px solid var(--rmd-borde-campo); border-radius: 50%; background: transparent; color: var(--rmd-apagado); font: 13px/1 var(--rmd-fuente); cursor: pointer; }
  .rmd-clip-x:hover { color: var(--rmd-rojo); border-color: var(--rmd-rojo); }
  .rmd-min-texto { width: 100%; min-height: 64px; box-sizing: border-box; padding: 6px 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-barra); color: var(--rmd-texto); font: 13.5px/1.45 var(--rmd-fuente); resize: vertical; }

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
  .rmd-modal h4 { margin: 16px 0 4px; font-size: 14px; font-weight: 600; } .rmd-tabla td.rmd-nowrap { white-space: nowrap; }
  .rmd-progreso { min-height: 1.4em; margin: 0 0 8px; color: var(--rmd-acento-texto); font-size: 13px; } .rmd-progreso.error { color: var(--rmd-rojo); }
  .rmd-ind-form { display: flex; flex-wrap: wrap; gap: 12px 28px; margin: 6px 0 12px; }
  .rmd-ind-form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .rmd-ind-form select, .rmd-ind-form input[type=file] { min-height: 30px; padding: 3px 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-barra); color: var(--rmd-texto); font: 13px var(--rmd-fuente); }
  .rmd-resumen-ind { margin: 4px 0 0 18px; padding: 0; } .rmd-resumen-ind li { margin: 3px 0; }
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
  // Redacciones con "CONTROL DE CALIDAD" que son correctas y no se alertan (confirmadas por el usuario):
  // - "…APROBACION DE CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE" (nota del granel de Envase): nombra a Calidad en Operaciones;
  // - "FINALMENTE ENTREGAR EL FORMATO DE INSPECCION EN LINEAS DE PRODUCCION (FPRO-250 VIGENTE) A CONTROL DE CALIDAD PARA SU APROBACION EN EL
  //   SISTEMA, ASI COMO EL SOBRE TECNICO…" (cierre de Acondicionado). Se quita solo esa frase: otro "CONTROL DE CALIDAD" en el mismo paso sí se alerta.
  const ALTERNATIVA_CALIDAD = /CONTROL DE CALIDAD\s+O\s+CALIDAD EN OPERACIONES|CALIDAD EN OPERACIONES\s+O\s+CONTROL DE CALIDAD/g;
  const ENTREGA_FORMATO_INSPECCION = /FINALMENTE\s+ENTREGAR\s+EL\s+FORMATO\s+DE\s+INSPECCION\s+EN\s+LINEAS\s+DE\s+PRODUCCION\s*\(FPRO-\d+(?:\s+VIGENTE)?\)\s*A\s+CONTROL\s+DE\s+CALIDAD\s+PARA\s+SU\s+APROBACION\s+EN\s+EL\s+SISTEMA/g;
  const sinCalidadCorrecta = (d) => d.replace(ALTERNATIVA_CALIDAD, 'CALIDAD EN OPERACIONES').replace(ENTREGA_FORMATO_INSPECCION, 'FINALMENTE ENTREGAR EL FORMATO DE INSPECCION');
  // - Pasos mayores de BIOCARGA ("EL PERSONAL DE CONTROL DE CALIDAD MUESTREA (100 mL) PARA ANALISIS DE BIOCARGA, SEGUN LO INDICADO EN EL
  //   PROCEDIMIENTO PCMB-200 VIGENTE."): el análisis de biocarga es de Control de Calidad; ningún paso mayor que mencione biocarga se alerta.
  const BIOCARGA = /\bBIOCARGA\b/;
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
  // Reglas de UNA fila (paso mayor o proceso menor) sobre sus datos, sin tocar la pantalla. Las usa ajustarTabla para marcar la
  // tabla que se ve y también la revisión de procesos menores leídos del modelo (sin abrir su ventana): así ambas dicen lo mismo.
  // f = { esPM, tipo (texto del Tipo Dato), desc, chk: { 'EDIT': bool, … } solo con las casillas que tiene la tabla, cant, um, dec,
  //       vi, vf, clave, dep } (undefined = la tabla no tiene esa columna). Devuelve [{ col, clase, msg }]; el predecesor obligatorio
  //       (que depende de toda la lista) se revisa aparte, en ajustarTabla.
  function reglasDeFila(f) {
    const out = [], tipo = f.tipo || '', t = SIN_ACENTOS(tipo), desc = SIN_ACENTOS(f.desc || ''), chk = f.chk || {};
    const regla = reglaCasillas(tipo, f.esPM);
    // Procesos menores que son INSUMOS de la receta (llevan Cantidad Insumos / UM): nunca llevan Edit.
    if (f.esPM && regla && (norm(f.cant) || norm(f.um))) regla.EDIT = false;
    // Calidad en Operaciones: el paso mayor "PERSONAL DE CALIDAD EN OPERACIONES..." (Realizado por) y los procesos menores de
    // muestreo (cantidad / fecha-hora de muestreo, exactamente) llevan Estado CC; los de muestreo, además, Edit.
    // Excepciones vistas en RMD autorizados: CONDICIONES AMBIENTALES (Realizado por + V.B. cuando el proceso lleva luz inactínica),
    // CONTRAMUESTRA (MuestraCC solo con Edit) y la verificación del jefe/supervisor ("...VERIFICA EL PROCESO DE MUESTREO..."),
    // que solo menciona "muestreo" de paso pero no es a Control de Calidad a quien le toca verificarla.
    if (regla && t === 'REALIZADO POR' && /^CONDICIONES AMBIENTALES/.test(desc)) delete regla['V.B.'];
    if (regla && t === 'MUESTRACC' && /CONTRAMUESTRA/.test(desc)) delete regla['ESTADO CC'];
    if (regla && t === 'REALIZADO POR' && /^(EL )?PERSONAL DE CALIDAD|^CALIDAD EN OPERACIONES (REGISTRA|REALIZA|INGRESA)/.test(desc)) regla['ESTADO CC'] = true;
    if (f.esPM && regla && /^CANTIDAD MUESTREADA|^FECHA\s*\/?\s*HORA DE MUESTREO/.test(desc)) { regla.EDIT = true; regla['ESTADO CC'] = true; }
    if (regla) for (const [c, debe] of Object.entries(regla)) {
      if (!(c in chk) || chk[c] === debe) continue;
      out.push({ col: c, clase: debe ? 'rmd-marcar' : 'rmd-desmarcar', msg: `${debe ? 'MARCAR' : 'DESMARCAR'} ${NOMBRE_CASILLA[c]} (Tipo Dato: ${tipo})` +
        (t === 'REALIZADO POR' && c === 'V.B.' && !debe ? ' — o cambiar el tipo a "Realizado por y Visto bueno"' : '') });
    }
    // PM OP: ningún paso debe llevarla marcada (indicación del equipo, septiembre de 2026).
    if (chk['PM OP']) out.push({ col: 'PM OP', clase: 'rmd-desmarcar', msg: 'DESMARCAR PM OP: ningún paso debe llevarla marcada' });
    if (f.desc != null && (f.esPM || !BIOCARGA.test(desc))) {
      if (/MUESTRA PARA (EL )?CONTROL DE CALIDAD/.test(desc)) out.push({ col: 'DESCRIPCION', clase: 'rmd-falta', msg: 'En Rendimiento debe figurar "CANTIDAD MUESTREADA (kg):" en lugar de "MUESTRA PARA CONTROL DE CALIDAD"' });
      else if (/CONTROL DE CALIDAD|APROBACION DE .*CONTROL DE PROCESO/.test(sinCalidadCorrecta(desc))) out.push({ col: 'DESCRIPCION', clase: 'rmd-falta', msg: 'Reemplazar "CONTROL DE CALIDAD" por "CALIDAD EN OPERACIONES" (solo debe quedar Calidad en Operaciones)' });
    }
    const vacio = (v) => v !== undefined && !norm(v);
    if (NUMERICOS.has(t) && vacio(f.dec)) out.push({ col: 'DECIMAL', clase: 'rmd-falta', msg: `Falta Decimal (Tipo Dato: ${tipo}); el portal no deja guardar` });
    if (t === 'RANGO') {
      if (vacio(f.vi)) out.push({ col: 'VAL. INICIAL', clase: 'rmd-falta', msg: 'Rango: falta Val. Inicial' });
      if (vacio(f.vf)) out.push({ col: 'VAL. FINAL', clase: 'rmd-falta', msg: 'Rango: falta Val. Final' });
    }
    if (t === 'NOTIFICACION' && f.clave !== undefined && !CLAVES.includes(SIN_ACENTOS(f.clave || ''))) out.push({ col: 'CLAVE MODELO', clase: 'rmd-falta', msg: 'Notificación: falta Clave Modelo (Setup Pre Proceso, Proceso o Setup Post Proceso)' });
    if (t === 'SIN TIPO DE DATO' && f.dep !== undefined && norm(f.dep)) out.push({ col: 'DEPENDE', clase: 'rmd-falta', msg: 'Sin tipo de dato no lleva predecesor: vaciar Depende' });
    return out;
  }

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
    'PM OP': 'PM OP: paso opcional según la OP (no debe marcarse en ningún paso)', 'GEN PP': 'Gen PP: genera producto en proceso',
    'EDIT': 'Edit: el operario puede editar el valor', 'R. POR': 'R. Por: registra "Realizado por"',
    'V.B.': 'V.B.: requiere visto bueno del jefe o supervisor', 'DEPENDE': 'Depende: paso predecesor (código y orden)',
    'CLAVE MODELO': 'Clave Modelo: solo Setup Pre Proceso, Proceso y Setup Post Proceso',
    'PROC. MEN.': 'Procesos menores del paso', 'MARGEN': 'Margen de tolerancia', 'DECIMAL': 'Cantidad de decimales',
  };
  // ---- Pasar MAYÚSCULAS a minúsculas con redacción correcta ("En minúsculas" y "Aa"): heurísticas (mayúscula tras punto y un
  // diccionario reducido de acentos), no un corrector real. Nunca escriben solas: solo actúan cuando la persona pulsa el botón.
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
    // términos de proceso frecuentes en los pasos (para "En minúsculas", v1.21)
    'adición', 'adiciones', 'nitrogenación', 'recolección', 'esterilización', 'medición', 'mediciones', 'dosificación', 'recepción', 'liberación',
    'desinfección', 'rotulación', 'lubricación', 'homogenización', 'homogeneización', 'dilución', 'emulsión', 'purificación', 'clarificación',
    'vacío', 'térmico', 'térmica', 'hermético', 'hermética', 'estéril', 'estériles', 'depósito', 'depósitos', 'nitrógeno', 'oxígeno', 'ácido',
    'hidróxido', 'cápsula', 'cápsulas', 'fármaco', 'químicamente', 'ámbar', 'polietileno', 'última', 'sólido', 'sólidos', 'líquido', 'líquidos',
    'eléctrico', 'eléctrica', 'eléctricos', 'eléctricas', 'teórico', 'teórica', 'teóricos', 'teóricas', 'supervisión', 'cálculo', 'cálculos',
    'óptimo', 'óptima', 'plástico', 'plástica', 'plásticos', 'plásticas', 'metálico', 'metálica', 'metálicos', 'metálicas', 'magnético',
    'magnética', 'volumétrico', 'volumétrica', 'cámara', 'cámaras', 'lámpara', 'lámparas', 'balón', 'almacén', 'vía', 'vías', 'energía',
    'pérdida', 'pérdidas',
  ].map((p) => [SIN_ACENTOS(p), p]));
  delete DICCIONARIO_ACENTOS[SIN_ACENTOS('mas')];      // "mas" (cantidad, con tilde) es ambiguo con "mas" (pero, sin tilde): no se acentua solo
  // mismo patron que src/rmd_automation/referencias.py (Tipo I/P/F + Area + sufijo -NNN obligatorio)
  const PATRON_REFERENCIA_JS = /\b[IPF][A-Z0-9]{3}-[A-Z]?\d{3}\b/;
  // siglas que se conservan tal cual (no se protege ninguna otra secuencia en mayusculas: el texto de entrada ya viene
  // todo en mayusculas, asi que "proteger cualquier palabra en mayusculas" dejaria todo el texto sin tocar)
  const SIGLAS_CONOCIDAS = new Set(['RMD', 'CC', 'UM', 'OP', 'PM', 'SAP', 'GMP', 'ID', 'OK', 'CT', 'POE', 'EPP', 'HEPA', 'UV', 'CIP', 'SIP', 'BPM',
    'BPF', 'WFI', 'USP', 'LAL', 'IPC', 'PVC', 'AISI', 'FEFO', 'FIFO', 'QR']);
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
  function limpiarMarcas(td) { if (td.matches('.rmd-marcar,.rmd-desmarcar,.rmd-falta')) td.removeAttribute('title'); td.classList.remove('rmd-marcar', 'rmd-desmarcar', 'rmd-falta'); td.removeAttribute('data-rmd-aviso'); }

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
      if ((on('ocultar') && OCULTAS.includes(n) && !(n === 'PM OP' && tabla.dataset.rmdPmop === '1')) || (ocultarEstado && n === 'ESTADO')) return 0;
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
    // Ventana raíz del RMD ("Estructura de RMD"): se deja con el ancho y las filas del portal (90 % de la pantalla), que es como
    // la conocen los usuarios; solo se revisa el orden de sus estructuras.
    if (/^Estructura de RMD\b/i.test(norm((barraDeLista(tabla) || {}).textContent))) {
      d.classList.remove('rmd-g', 'rmd-pasos', 'rmd-medio', 'rmd-ancho', 'rmd-sticky'); revisarOrdenEstructuras(d, tabla); avisoRecetasRaiz(d, tabla); return;
    }
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
    // PM OP no debe marcarse nunca: si algún paso la tiene marcada, la columna deja de ocultarse para que se vea y se corrija
    const iPmop = nombres.indexOf('PM OP');
    if (iPmop >= 0 && filas.some((tr) => marcada(celda(tr, iPmop)))) tabla.dataset.rmdPmop = '1'; else delete tabla.dataset.rmdPmop;
    if (on('columnas')) ordenarColumnas(tabla, ths, nombres, filas, esPasos ? 'pasos' : esPM ? 'pm' : esEspec ? 'espec' : 'otro'); else { quitarAnchos(tabla, ths); delete tabla.dataset.rmdOcultaEstado; }
    // columnas ocultas
    ths.forEach((th, i) => {
      const oculta = (on('ocultar') && OCULTAS.includes(nombres[i]) && !(nombres[i] === 'PM OP' && tabla.dataset.rmdPmop === '1')) || (tabla.dataset.rmdOcultaEstado === '1' && nombres[i] === 'ESTADO');
      th.style.display = oculta ? 'none' : '';
      filas.forEach((tr) => { if (celda(tr, i)) celda(tr, i).style.display = oculta ? 'none' : ''; });
    });

    const iDep = nombres.indexOf('DEPENDE'), iTipo = nombres.indexOf('TIPO DATO'), iOrd = nombres.indexOf('ORDEN'), iDes = nombres.findIndex((n) => /^DESCRIPCI/.test(n));
    const iClave = nombres.indexOf('CLAVE MODELO'), iPuesto = nombres.indexOf('PUESTO TRABAJO'), iDec = Math.max(nombres.indexOf('DECIMAL'), nombres.indexOf('DECIM.'));
    const iVI = nombres.indexOf('VAL. INICIAL'), iVF = nombres.indexOf('VAL. FINAL');
    const iCant = nombres.indexOf('CANTIDAD INSUMOS'), iUM = nombres.indexOf('UM'), iProcMen = nombres.indexOf('PROC. MEN.');
    const iChk = Object.fromEntries(CHK.map((c) => [c, nombres.indexOf(c)]));
    const idxCol = { ...iChk, 'PM OP': iPmop, 'DESCRIPCION': iDes, 'DECIMAL': iDec, 'VAL. INICIAL': iVI, 'VAL. FINAL': iVF, 'CLAVE MODELO': iClave, 'DEPENDE': iDep };
    const valor = (tr, idx) => (idx >= 0 ? (inputDe(celda(tr, idx)) || {}).value || '' : undefined);   // undefined: la tabla no tiene esa columna
    // procesos menores de cada paso, revisados sin abrir su ventana (se leen del modelo en segundo plano: revisarPMsDeLista)
    if (esPasos && on('reglas')) revisarPMsDeLista(tabla, filas);
    const pmDe = esPasos && tabla.__rmdPM && tabla.__rmdPM.porPaso;
    tabla.querySelectorAll('td.rmd-pm-mal').forEach((td) => { td.classList.remove('rmd-pm-mal'); delete td.dataset.rmdPm; });
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
      const tdDes = iDes >= 0 ? celda(tr, iDes) : null, desc = SIN_ACENTOS(tdDes && tdDes.textContent);
      const chk = {}; Object.entries({ ...iChk, 'PM OP': iPmop }).forEach(([c, i]) => { if (i >= 0 && celda(tr, i)) chk[c] = marcada(celda(tr, i)); });
      const f = { esPM, tipo, desc: tdDes ? tdDes.textContent : null, chk, dec: valor(tr, iDec), vi: valor(tr, iVI), vf: valor(tr, iVF), clave: valor(tr, iClave), dep: valor(tr, iDep),
        cant: iCant >= 0 ? norm((inputDe(celda(tr, iCant)) || {}).value) : '', um: iUM >= 0 ? norm(celda(tr, iUM) && celda(tr, iUM).textContent) : '' };
      reglasDeFila(f).forEach(({ col, clase, msg }) => {
        const td = celda(tr, idxCol[col]); if (!td) return;
        td.classList.add(clase); td.title = msg; if (clase !== 'rmd-falta') td.dataset.rmdAviso = msg;
        avisos.push(msg);
      });
      const marcarFalta = (idx, msg) => { const td = celda(tr, idx); td.classList.add('rmd-falta'); td.title = msg; avisos.push(msg); };
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
      // procesos menores del paso con incoherencias (sin abrir su ventana): la celda "Proc. Men." se marca con cuántas son y el detalle
      // queda en su tooltip; cuentan en el aviso de incoherencias de la lista y "ir a la siguiente" también se detiene en este paso.
      const pmMal = pmDe ? pmDe.get((objetoDeFila(tr) || {}).mdEstructuraPasoId) || [] : [];
      const avisosPM = pmMal.flatMap((x) => x.avisos.map((a) => `Proceso menor ${x.orden} (${x.codigo} ${x.desc.slice(0, 40)}): ${a}`));
      const tdPM = iProcMen >= 0 ? celda(tr, iProcMen) : null;
      if (avisosPM.length && tdPM) { tdPM.classList.add('rmd-pm-mal'); tdPM.dataset.rmdPm = String(avisosPM.length); tdPM.title = 'Procesos menores con incoherencias (ábrelos para ver dónde):\n' + avisosPM.join('\n'); }
      else if (tdPM && tdPM.title && /^Procesos menores con incoherencias/.test(tdPM.title)) tdPM.removeAttribute('title');
      // todos: solo las del propio paso ("Documentos citados" revisa los procesos menores aparte); pm: las de sus procesos menores
      if (avisos.length || avisosPM.length) { alertas += avisos.length + avisosPM.length; primeras.push({ tr, texto: avisos[0] || avisosPM[0], todos: avisos.slice(), pm: avisosPM }); }
    });
    const previo = tabla.__rmdAlertas;
    tabla.__rmdAlertas = { n: alertas, filas: primeras, sig: previo ? previo.sig : 0 };

    if (esPasos && (on('filtro') || on('reglas'))) filtroLocal(tabla, true);
    else if (esPasos) { const bar = d.querySelector('#rmd-filtro-bar'); if (bar) bar.remove(); filas.forEach((tr) => tr.style.removeProperty('display')); }
    if (esPasos && on('copiar')) instalarBotonesCopia(d);
    else if (esPasos) d.querySelectorAll('.rmd-copia-grupo, .rmd-clip').forEach((e) => e.remove());
    if ((esPasos || esPM) && on('pasominusculas')) instalarBotonMinusculas(d, tabla);
    else if (esPasos || esPM) d.querySelectorAll('.rmd-minusculas').forEach((e) => e.remove());
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
  window.__rmdStats = { ajustes: 0, listas: () => dialogos().map((d) => d.__rmdListaEfectiva || ''), reglasDeFila };   // (diagnóstico y pruebas)
  // Al apagar "Mejoras activas" se retira todo lo que el script había añadido a las ventanas del portal
  function limpiezaTotal() {
    try { const c = ctlExportar(); if (c && c.__rmdMenu) { const m = c.__rmdMenu; c.detachPress(m.nuestro, m.ctrl); c.attachPress(m.fnOrig, m.ctrl); delete c.__rmdMenu; } } catch (e) { /* sin UI5 */ }
    document.querySelectorAll('.rmd-exportar-menu').forEach((b) => b.classList.remove('rmd-exportar-menu'));
    html.classList.remove('rmd-vivo'); document.querySelectorAll('.rmd-selector-ancho, .rmd-raiz').forEach((d) => d.classList.remove('rmd-selector-ancho', 'rmd-raiz'));
    document.querySelectorAll('.rmd-copia-grupo, .rmd-minusculas, .rmd-nuevo-paso-grupo, .rmd-exportar-op, .rmd-cuenta-verop, .rmd-documentos-citados, .rmd-status-rmd, .rmd-indicadores, .rmd-equipos-master, .rmd-buscar-equipo, .rmd-suspension, .rmd-menu, .rmd-orden-aviso, .rmd-receta-aviso, .rmd-revisar-recetas, .rmd-nota-repetir, .rmd-token-mas, .rmd-rec-icono, .rmd-rec-detalle, .rmd-saludo, .rmd-paleta-fondo, .rmd-vivo-panel, .rmd-formula-orden, .rmd-revisor, .rmd-borrar-recetas, .rmd-aa, #rmd-filtro-bar, .rmd-estado, #rmd-aviso-asociar, #rmd-aviso-nomenclatura').forEach((e) => e.remove());
    document.querySelectorAll('.rmd-th-filtro, .rmd-menu-filtro-col').forEach((e) => e.remove());
    document.querySelectorAll('[data-rmd-filtro-col]').forEach((e) => delete e.dataset.rmdFiltroCol);
    document.querySelectorAll('textarea.rmd-ortografia').forEach((e) => { e.classList.remove('rmd-ortografia'); e.removeAttribute('data-rmd-dudosas'); });
    document.querySelectorAll('.rmd-con-estado, .rmd-pm-titulo').forEach((e) => e.classList.remove('rmd-con-estado', 'rmd-pm-titulo'));
    document.querySelectorAll('.rmd-campo-aviso').forEach((e) => e.classList.remove('rmd-campo-aviso'));
    document.querySelectorAll('.sapMDialog').forEach((d) => quitarEdicionEspec(d));
    document.querySelectorAll('.sapMDialog th, .sapMDialog td').forEach((c) => {
      c.style.removeProperty('display'); if (c.tagName === 'TH') { c.style.removeProperty('width'); c.style.removeProperty('min-width'); }
      c.classList.remove('rmd-marcar', 'rmd-desmarcar', 'rmd-falta', 'rmd-td-sintipo', 'rmd-sin-puesto', 'rmd-pm-mal', 'rmd-orden-mal'); delete c.dataset.rmdPm;
    });
    document.querySelectorAll('.sapMDialog tbody tr').forEach((r) => r.style.removeProperty('display'));
    document.querySelectorAll('.sapMDialog table.sapMListTbl').forEach((t) => t.style.removeProperty('width'));
    document.querySelectorAll('.sapMDialog').forEach((d) => d.classList.remove('rmd-g', 'rmd-pasos', 'rmd-medio', 'rmd-ancho', 'rmd-sticky'));
  }
  // ---- El "latido" de la lista principal: prolongar la sesión sin el error al volver ----
  // Cada 30 s el propio portal vuelve a buscar la lista principal (intervalTriggerActualizar -> onSearch() sin evento, y luego
  // escribe "Actualizado!" en la consola). Si esa lectura falla porque la red o la sesión aún se están recuperando (al volver de
  // una ausencia o de suspender el equipo), el portal muestra un error que hay que cerrar, aunque la siguiente vuelta ya funcione.
  // Con "Prolongar la sesión" activo, SOLO el error de ese refresco automático se omite (queda en la consola y en
  // __rmdStats.latido) si la persona no hizo clic ni tecleó desde que empezó; los errores de lo que ella haga se ven igual.
  const latido = { enCurso: 0, inicio: 0, fin: 0, esLatido: false, interaccion: 0, omitidos: 0, ultimo: '' };
  window.__rmdStats.latido = latido;
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { latido.interaccion = Date.now(); }, true));
  (() => { const log0 = console.log; console.log = function (...a) { if (a[0] === 'Actualizado!' && Date.now() - latido.inicio < 1500) latido.esLatido = true; return log0.apply(this, a); }; })();
  function instalarFiltroLatido() {
    try {
      const btn = [...document.querySelectorAll('button')].find((b) => b.title === 'Exportar'), c = btn && ctlDe(btn);
      const reg = c && c.mEventRegistry && c.mEventRegistry.press && c.mEventRegistry.press[0], ctrl = reg && reg.oListener;
      [ctrl, ctrl && Object.getPrototypeOf(ctrl)].forEach((obj) => {
        if (!obj || !Object.prototype.hasOwnProperty.call(obj, 'onSearch') || typeof obj.onSearch !== 'function' || obj.onSearch.__rmd) return;
        const original = obj.onSearch;
        const envuelto = async function (ev) {
          if (ev) return original.apply(this, arguments);                         // búsqueda pedida por la persona ("Ir")
          latido.enCurso++; latido.inicio = Date.now(); latido.esLatido = false;
          try { return await original.apply(this, arguments); } finally { latido.enCurso = Math.max(0, latido.enCurso - 1); latido.fin = Date.now(); }
        };
        envuelto.__rmd = true; obj.onSearch = envuelto;
      });
      const MB = sap.ui.require && sap.ui.require('sap/m/MessageBox');
      if (MB && MB.error && !MB.error.__rmd) {
        const error0 = MB.error;
        const filtrado = function () {
          const ahora = Date.now(), delLatido = latido.esLatido && (latido.enCurso > 0 || ahora - latido.fin < 3000) && latido.interaccion < latido.inicio;
          if (on('sesion') && delLatido) {
            latido.omitidos++; latido.ultimo = String(arguments[0]).slice(0, 300);
            try { console.info('[RMD] Error del refresco automático de la lista omitido (la próxima vuelta, en 30 s, vuelve a intentarlo):', arguments[0]); } catch (e) { /* sin consola */ }
            return undefined;
          }
          return error0.apply(this, arguments);
        };
        filtrado.__rmd = true; MB.error = filtrado;
      }
    } catch (e) { /* el portal aún no está listo: se reintenta en el próximo ajuste */ }
  }

  let habiaVentanaPM = false;
  // cuánto tarda cada ajuste (diagnóstico de rendimiento: __rmdStats.ajusteMs / ajusteMax / ajusteTotalMs)
  function ajustarTodo() {
    const t0 = performance.now();
    try { ajustarTodoCuerpo(); } finally {
      const s = window.__rmdStats, ms = performance.now() - t0; s.ajusteMs = Math.round(ms * 10) / 10; s.ajusteMax = Math.max(s.ajusteMax || 0, s.ajusteMs); s.ajusteTotalMs = Math.round((s.ajusteTotalMs || 0) + ms);
    }
  }
  function ajustarTodoCuerpo() {
    if (!opc.activo) { limpiezaTotal(); return; }
    window.__rmdStats.ajustes++;
    // al cerrarse una ventana de procesos menores (pudo corregirse algo) se vuelven a revisar los de la lista de pasos
    const hayVentanaPM = dialogos().some(esDialogoPM); if (habiaVentanaPM && !hayVentanaPM) pmSucio = Date.now(); habiaVentanaPM = hayVentanaPM;
    if (on('sesion')) instalarFiltroLatido();
    document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) table.sapMListTbl').forEach(ajustarTabla);
    decorarCabeceras();
    gestionarVerOP();
    gestionarDocumentosCitados();
    gestionarBotonStatusRmd();
    gestionarMenuExportar();
    gestionarBotonesLista();
    gestionarRecetasAsociar();
    // (las de v1.24–v1.25 van aisladas: si una falla — p. ej. el portal aún sin UI5 — las demás siguen)
    [registrarExternosUI5, gestionarSelectorPasos, gestionarVivo, gestionarFormulas, gestionarRevisores, gestionarRecetasMultiples, gestionarPuestoRecetas, gestionarEdicionPasos, gestionarSaludo, gestionarRmdAbierto].forEach((f) => {
      try { f(); } catch (e) { window.__rmdStats.errores = (window.__rmdStats.errores || []).slice(-9).concat(f.name + ': ' + e.message); }
    });
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
  // botón "Procesos Menores" de la fila de un paso (resaltado, tipo Ghost, cuando el paso tiene procesos menores)
  const botonPM = (tr) => [...tr.querySelectorAll('button')].find((x) => x.title === 'Procesos Menores');
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

  // ---- Procesos menores leídos del modelo, sin abrir su ventana ----
  // El portal los carga con onGetMdPasoInsumoPaso: entidad MD_ES_PASO_INSUMO_PASO de su modelo mainModelv2, filtrada por RMD,
  // estructura y etiqueta (y por paso). Aquí se hace la misma lectura (mismo modelo, misma entidad y filtros; solo lectura) para
  // toda la lista de una vez: es exacta (cada fila trae su paso en pasoId_mdEstructuraPasoId) y tarda un segundo, mientras que
  // abrir la ventana de cada paso tarda varios y a veces muestra un instante los procesos de toda la etiqueta.
  const modeloDe = (tabla) => { const c = tabla && nucleo().byId(tabla.id.replace(/-listUl$/, '')); return (c && c.getModel && c.getModel('mainModelv2')) || modeloListaPrincipal(); };
  const TIPOS_POR_ID = new Map();                                     // iMaestraId del Tipo Dato -> su texto (de los combos del portal)
  function nombreTipo(id, tabla) {
    if (id == null || id === '') return '';
    if (!TIPOS_POR_ID.has(String(id)) && tabla) {
      const i = columnas(tabla).indexOf('TIPO DATO');
      for (const tr of filasPrincipales(tabla)) {
        const c = i >= 0 && ctlDe(inputDe(celda(tr, i))); if (!c || !c.getItems) continue;
        c.getItems().forEach((it) => TIPOS_POR_ID.set(String(it.getKey()), it.getText())); if (TIPOS_POR_ID.size) break;
      }
    }
    return TIPOS_POR_ID.get(String(id)) || TIPOS_FIJOS[id] || '';
  }
  // Tipos de dato del portal (iMaestraId -> texto de su combo). Solo se usan si los combos de la tabla aún no los cargaron: sin
  // el nombre del tipo, "Copiar" abría la ventana de procesos menores para leerlo (varios segundos por paso).
  const TIPOS_FIJOS = { 432: 'Verificación Check', 433: 'Texto', 434: 'Cantidad', 435: 'Fecha', 436: 'Fecha y Hora', 437: 'Hora', 438: 'Números', 439: 'Realizado por',
    440: 'Visto bueno', 441: 'Realizado por y Visto bueno', 442: 'Múltiple check', 443: 'Rango', 444: 'Lote', 445: 'Fórmula', 446: 'Sin tipo de dato', 447: 'Notificacion',
    448: 'MuestraCC', 449: 'Fecha Vencimiento', 450: 'Entrega' };
  async function leerPMsModelo(modelo, filtrosPor) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const filtros = Object.entries(filtrosPor).filter(([, v]) => v != null && v !== '').map(([k, v]) => new Filtro(k, 'EQ', v));
    const leer = (skip) => new Promise((ok, mal) => modelo.read('/MD_ES_PASO_INSUMO_PASO', {
      filters: filtros, urlParameters: { $expand: 'pasoHijoId,estructuraRecetaInsumoId', $top: '1000', $skip: String(skip) },
      success: (r) => ok((r && r.results) || []), error: (e) => mal(new Error(`el servidor no devolvió los procesos menores (${(e && e.statusCode) || 'sin código'})`)),
    }));
    const todos = []; for (let skip = 0; skip < 20000; skip += 1000) { const p = await leer(skip); todos.push(...p); if (p.length < 1000) break; }
    return todos;
  }
  // Un proceso menor del modelo con los mismos datos que muestra su fila (el portal arma código/descripción/UM igual: onObtenerProcMenores).
  function pmNormalizado(x, tabla) {
    const obj = (v) => (v && typeof v === 'object' && !v.__deferred ? v : null), hijo = obj(x.pasoHijoId), ins = obj(x.estructuraRecetaInsumoId);
    const s = (v) => (v == null ? '' : String(v));
    const codigo = hijo ? hijo.codigo : ins ? ins.Component : x.Component, desc = hijo ? hijo.descripcion : ins ? ins.Maktx : x.Maktx, um = hijo ? '' : ins ? ins.CompUnit : x.CompUnit;
    return { paso: x.pasoId_mdEstructuraPasoId, orden: s(x.orden), codigo: s(codigo), desc: norm(desc), tipo: nombreTipo(x.tipoDatoId_iMaestraId != null ? x.tipoDatoId_iMaestraId : (hijo || {}).tipoDatoId_iMaestraId, tabla), cant: s(x.cantidadInsumo), um: s(um), insumo: !hijo,
      vi: s(x.valorInicial), vf: s(x.valorFinal), mg: s(x.margen), dec: s(x.decimales), chk: { 'TAB': !!x.tab, 'EDIT': !!x.edit, 'GEN PP': !!x.genpp, 'ESTADO CC': !!x.estadoCC } };
  }
  // Las mismas reglas que se ven al abrir la ventana de procesos menores (su tabla tiene las casillas Edit y Estado CC).
  const avisosDePM = (q) => reglasDeFila({ esPM: true, tipo: q.tipo, desc: q.desc, chk: { 'EDIT': q.chk.EDIT, 'ESTADO CC': q.chk['ESTADO CC'] }, cant: q.cant, um: q.um, dec: q.dec, vi: q.vi, vf: q.vf }).map((x) => x.msg);
  // Todos los procesos menores de la lista que muestra `tabla` (por paso), leídos del modelo. null si no se pueden leer.
  async function pmsDeLista(tabla, filas) {
    const objs = filas.map(objetoDeFila).filter(Boolean), o = objs[0]; if (!o || !o.mdId_mdId) return null;
    const modelo = modeloDe(tabla); if (!modelo) return null;
    const todos = await leerPMsModelo(modelo, { mdId_mdId: o.mdId_mdId, mdEstructuraId_mdEstructuraId: o.mdEstructuraId_mdEstructuraId, mdEsEtiquetaId_mdEsEtiquetaId: o.mdEsEtiquetaId_mdEsEtiquetaId });
    const porPaso = new Map();
    todos.forEach((x) => { const q = pmNormalizado(x, tabla); if (!porPaso.has(q.paso)) porPaso.set(q.paso, []); porPaso.get(q.paso).push(q); });
    porPaso.forEach((l) => l.sort((a, b) => (+a.orden || 0) - (+b.orden || 0)));
    return porPaso;
  }
  // Revisión en segundo plano de los procesos menores de la lista abierta: se hace una vez por lista y se repite cuando se cierra
  // una ventana de procesos menores (pudo haberse corregido algo). Al terminar se vuelve a pintar la tabla con los avisos.
  let pmSucio = 0;
  function revisarPMsDeLista(tabla, filas) {
    const c = tabla.__rmdPM, o = objetoDeFila(filas[0]); if (!o) return;
    const clave = [o.mdId_mdId, o.mdEstructuraId_mdEstructuraId, o.mdEsEtiquetaId_mdEsEtiquetaId, filas.length].join('|');
    if (c && c.clave === clave && (c.cargando || c.t >= pmSucio)) return;
    const estado = { clave, cargando: true, t: Date.now(), porPaso: c && c.clave === clave ? c.porPaso : null };
    tabla.__rmdPM = estado;
    pmsDeLista(tabla, filas).then((porPaso) => {
      if (tabla.__rmdPM !== estado) return;
      const conAvisos = new Map();
      if (porPaso) porPaso.forEach((l, paso) => { const mal = l.map((q) => ({ ...q, avisos: avisosDePM(q) })).filter((q) => q.avisos.length); if (mal.length) conAvisos.set(paso, mal); });
      estado.porPaso = conAvisos; estado.cargando = false;
      if (tabla.isConnected) ajustarTabla(tabla);
    }).catch((e) => { estado.cargando = false; estado.error = e.message; try { console.info('[RMD] no se pudieron revisar los procesos menores de la lista:', e.message); } catch (e2) { /* sin consola */ } });
  }

  // Procesos menores de UN paso con los datos que usa Copiar/Pegar (los de leerPMfila). Primero del modelo (exacto y rápido); si no
  // se puede, abriendo su ventana y quedándose solo con las filas de ese paso.
  async function leerPMsDe(tabla, trId) {
    const tr = document.getElementById(trId), o = objetoDeFila(tr);
    if (o && o.mdEstructuraPasoId) {
      try {
        const modelo = modeloDe(tabla);
        if (modelo) {
          const lista = (await leerPMsModelo(modelo, { mdId_mdId: o.mdId_mdId, mdEstructuraId_mdEstructuraId: o.mdEstructuraId_mdEstructuraId, pasoId_mdEstructuraPasoId: o.mdEstructuraPasoId }))
            .map((x) => pmNormalizado(x, tabla)).filter((q) => q.paso === o.mdEstructuraPasoId).sort((a, b) => (+a.orden || 0) - (+b.orden || 0));
          if (lista.every((q) => q.tipo || q.insumo)) return lista;   // (sin el nombre del tipo no se podría pegar: se usa la ventana)
        }
      } catch (e) { /* se lee abriendo la ventana */ }
    }
    const d = await abrirPM(tabla, trId), t = tablaDe(d), idPaso = o && o.mdEstructuraPasoId;
    const delPaso = (x) => { const q = idPaso && objetoDeFila(x); return !q || !('pasoId_mdEstructuraPasoId' in q) || q.pasoId_mdEstructuraPasoId === idPaso; };
    await hasta(() => !ocupado() && filasPMde(d).every(delPaso), 4000);
    const fs = filasPMde(d).filter(delPaso).filter((x) => celda(x, columnas(t).indexOf('ORDEN')) && inputDe(celda(x, columnas(t).indexOf('ORDEN'))));
    const lista = fs.map((x) => leerPMfila(t, x));
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
      if (!portapapeles) { sp.innerHTML = ''; sp.title = ''; delete sp.dataset.texto; return; }
      const n = portapapeles.pms.filter((x) => !x.insumo).length, desc = portapapeles.paso.desc;
      const texto = `Copiado: #${portapapeles.paso.orden} ${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''} — ${n} proceso(s) menor(es)`;
      if (sp.dataset.texto !== texto) {
        sp.dataset.texto = texto; sp.innerHTML = '';
        const t = document.createElement('span'); t.textContent = texto;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'rmd-clip-x'; x.textContent = '×'; x.title = 'Vaciar el portapapeles';
        x.addEventListener('click', (e) => { e.stopPropagation(); limpiarPortapapeles(); });
        sp.append(t, x);
      }
      sp.title = `RMD ${portapapeles.rmd || ''}: ${desc}`;
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
      const pms = botonPM(sel[0]) ? await leerPMsDe(tabla, sel[0].id) : [];
      const rmd = (d.querySelector('h2') || {}).textContent || '';
      portapapeles = { paso, pms, rmd: norm(rmd).split(' - ')[0], dialogoId: d.id, trId: sel[0].id }; pintarEstadoPortapapeles();
      const ins = pms.filter((x) => x.insumo).length;
      toast(`Copiado el paso #${paso.orden} con ${pms.length - ins} proceso(s) menor(es)${ins ? ` (${ins} insumo(s) no se copian: se agregan con "Agregar Insumo")` : ''}. Ahora marca uno o varios pasos destino y pulsa "Pegar".`);
    } catch (e) { toast('No se pudo copiar: ' + e.message, true); } finally { ocupadoCopia = false; }
  }

  // Qué cambiaría en un proceso menor que ya existe en el destino (tipo, valores y casillas), en texto: "Edit: no → sí".
  const CAMPOS_PM = [['tipo', 'Tipo'], ['vi', 'Val. Inicial'], ['vf', 'Val. Final'], ['mg', 'Margen'], ['dec', 'Decimal']];
  function cambiosPM(o, a) {
    const c = CAMPOS_PM.filter(([k]) => norm(o[k]) !== norm(a[k])).map(([k, et]) => `${et}: ${norm(a[k]) || '—'} → ${norm(o[k]) || '—'}`);
    Object.keys(o.chk || {}).forEach((k) => { if (!!o.chk[k] !== !!(a.chk || {})[k]) c.push(`${NOMBRE_CASILLA[k] || k}: ${a.chk && a.chk[k] ? 'sí' : 'no'} → ${o.chk[k] ? 'sí' : 'no'}`); });
    return c;
  }
  const resumenValores = (vals) => { const m = new Map(); vals.forEach((x) => { const k = norm(x) || '—'; m.set(k, (m.get(k) || 0) + 1); }); return [...m].map(([k, n]) => (vals.length > 1 ? `${k} (${n})` : k)).join(' · '); };

  // La vista previa (uno o varios destinos) devuelve las opciones elegidas o null si se cancela. En los procesos menores que ya
  // existen en el destino muestra exactamente qué cambiaría; los que no cambiarían nada vienen desmarcados.
  function vistaPrevia(destinos) {
    return new Promise((resolver) => {
      const o = portapapeles.paso, varios = destinos.length > 1;
      const v = ventana(varios ? `Pegar en ${destinos.length} pasos` : 'Pegar configuración y procesos menores', { cancelar: () => { v.cerrar(); resolver(null); } });
      const campos = [['tipo', 'Tipo Dato'], ['clave', 'Clave Modelo'], ['puesto', 'Puesto Trabajo'], ['vi', 'Val. Inicial'], ['vf', 'Val. Final'], ['mg', 'Margen'], ['dec', 'Decimal']];
      const filasCfg = campos.map(([k, et]) => { const vals = destinos.map((x) => x.paso[k]), dif = vals.some((a) => String(a) !== String(o[k]));
        return `<tr><td><input type="checkbox" data-c="${k}" ${dif ? 'checked' : ''}></td><td>${et}</td><td>${esc(resumenValores(vals))}</td><td class="${dif ? 'rmd-dif' : ''}">${esc(o[k]) || '—'}</td></tr>`; }).join('');
      const filasChk = Object.keys(o.chk).map((k) => { const vals = destinos.map((x) => (x.paso.chk[k] ? 'marcada' : 'no')), dif = destinos.some((x) => x.paso.chk[k] !== o.chk[k]);
        return `<tr><td><input type="checkbox" data-x="${k}" ${dif ? 'checked' : ''}></td><td>Casilla ${NOMBRE_CASILLA[k]}</td><td>${esc(resumenValores(vals))}</td><td class="${dif ? 'rmd-dif' : ''}">${o.chk[k] ? 'marcada' : 'no'}</td></tr>`; }).join('');
      const filasPM = portapapeles.pms.map((x, i) => {
        if (x.insumo) return `<tr class="rmd-atenuada"><td></td><td>${esc(x.orden)}</td><td>${esc(x.codigo)} · ${esc(x.desc)}</td><td>insumo de la receta: no se copia (usa "Agregar Insumo")</td></tr>`;
        const efectos = destinos.map((dd) => { const ya = dd.pms.find((q) => q.codigo === x.codigo); if (!ya) return { tipo: 'agrega' }; const c = cambiosPM(x, ya); return c.length ? { tipo: 'cambia', c } : { tipo: 'igual' }; });
        const n = (t) => efectos.filter((e) => e.tipo === t).length, e0 = efectos[0];
        const que = !varios ? (e0.tipo === 'agrega' ? '<b>se agrega</b>' : e0.tipo === 'igual' ? 'ya existe, sin cambios' : `<b>ya existe: se actualiza</b> — ${esc(e0.c.join(' · '))}`)
          : [[n('agrega'), 'se agrega'], [n('cambia'), 'se actualiza'], [n('igual'), 'sin cambios']].filter(([k]) => k).map(([k, t]) => `${t} en ${k}`).join(' · ');
        return `<tr><td><input type="checkbox" data-p="${i}" ${efectos.some((e) => e.tipo !== 'igual') ? 'checked' : ''}></td><td>${esc(x.orden)}</td><td>${esc(x.codigo)} · ${esc(x.desc)}<br><span class="rmd-nota">${esc(x.tipo || '(sin tipo)')} · ${esc(resumenCasillas(x.chk))}${x.dec !== '' ? ' · dec ' + esc(x.dec) : ''}</span></td><td>${que}</td></tr>`;
      }).join('');
      const listaDest = destinos.map((dd) => `#${esc(dd.paso.orden)} · ${esc(dd.paso.codigo)} · ${esc(dd.paso.desc.slice(0, 80))}${dd.paso.desc.length > 80 ? '…' : ''}`).join('<br>');
      v.cuerpo.innerHTML = `
        <p><b>Origen</b> (RMD ${esc(portapapeles.rmd)}): #${esc(o.orden)} · ${esc(o.codigo)} · ${esc(o.desc)}<br><b>${varios ? `Destinos (${destinos.length})` : 'Destino'}</b>:<br>${listaDest}</p>
        <table class="rmd-tabla"><thead><tr><th></th><th>Configuración del paso</th><th>${varios ? 'Destinos ahora' : 'Destino ahora'}</th><th>Se copiará</th></tr></thead><tbody>${filasCfg}${filasChk}</tbody></table>
        <table class="rmd-tabla"><thead><tr><th><input type="checkbox" class="rmd-todos-pm" title="Marcar o desmarcar todos"></th><th>Orden</th><th>Procesos menores del origen</th><th>Qué pasará</th></tr></thead><tbody>${filasPM || '<tr><td colspan="4">El paso de origen no tiene procesos menores.</td></tr>'}</tbody></table>
        <p class="rmd-nota">No se copian Orden, Depende, Código ni Descripción. Solo se tocan los procesos menores marcados${varios ? '; la configuración se aplica a todos los destinos y se guarda una vez' : ''}.</p>
        <label><input type="checkbox" id="rmd-op-guardar" checked> Guardar al terminar de aplicar la configuración</label><br>
        <label><input type="checkbox" id="rmd-op-actualizar" checked> Actualizar la configuración de los procesos menores que ya existan en el destino</label>`;
      const todos = v.cuerpo.querySelector('.rmd-todos-pm'), cajas = () => [...v.cuerpo.querySelectorAll('input[data-p]')];
      if (todos) { todos.checked = cajas().length > 0 && cajas().every((i) => i.checked); todos.addEventListener('change', () => cajas().forEach((i) => { i.checked = todos.checked; })); }
      v.pie.append(botonModal('Cancelar', '', () => { v.cerrar(); resolver(null); }), botonModal(varios ? `Aplicar en ${destinos.length} pasos` : 'Aplicar', 'primario', () => {
        const q = (s) => [...v.cuerpo.querySelectorAll(s)];
        const opciones = {
          campos: q('input[data-c]:checked').map((i) => i.dataset.c), casillas: q('input[data-x]:checked').map((i) => i.dataset.x),
          pms: q('input[data-p]:checked').map((i) => +i.dataset.p), guardar: v.cuerpo.querySelector('#rmd-op-guardar').checked, actualizar: v.cuerpo.querySelector('#rmd-op-actualizar').checked,
        };
        v.cerrar(); resolver(opciones);
      }));
    });
  }

  async function guardarYConfirmar(dlg, log, que) {
    const g = botonPorTitulo(dlg, 'Guardar'); if (!g) throw new Error(`No encuentro el botón Guardar de ${que}`);
    log(`Guardando ${que}…`); pulsar(g); rebase(dlg);
    const r = await atenderMensajes(); if (r.problema) throw new Error('El portal respondió: ' + r.problema);
    if (r.vistos.some((x) => /^[ÉE]xito/i.test(x))) log(`✔ ${que[0].toUpperCase() + que.slice(1)} guardado(s)${r.vistos.length ? ` (${r.vistos.join(' | ')})` : ''}`);
    else log(`⚠ El portal no mostró el mensaje de éxito: verifica que ${que} se guardaron.`);
  }

  // Pega en UNO o VARIOS pasos marcados: la configuración se aplica a todos y se guarda una vez; los procesos menores, paso por paso.
  async function pegarPaso(d, tabla) {
    if (ocupadoCopia) return; ocupadoCopia = true;
    try {
      if (!portapapeles) { toast('Primero copia un paso de referencia.', true); return; }
      let sel = seleccionadas(tabla);
      if (!sel.length) { toast('Marca la casilla de uno o varios pasos destino y pulsa "Pegar".', true); return; }
      const rmdActual = norm((d.querySelector('h2') || {}).textContent).split(' - ')[0], estado = estadoDelRmd();
      if (portapapeles.rmd && rmdActual && portapapeles.rmd !== rmdActual) { toast(`El paso copiado es del RMD ${portapapeles.rmd}; este es el ${rmdActual}. Copia de nuevo en este RMD.`, true); limpiarPortapapeles(); return; }
      if (estado && !/ingres/i.test(estado)) { toast(`El RMD está ${estado}: solo se puede pegar en versiones Ingresadas.`, true); return; }
      if (d.id === portapapeles.dialogoId && sel.some((tr) => tr.id === portapapeles.trId)) {
        sel = sel.filter((tr) => tr.id !== portapapeles.trId);
        if (!sel.length) { toast('El paso marcado es el mismo que se copió: marca el paso destino.', true); return; }
      }
      toast(sel.length > 1 ? `Leyendo los ${sel.length} pasos destino…` : 'Leyendo el paso destino…');
      const destinos = [];
      for (const tr of sel) {
        const pms = botonPM(tr) && portapapeles.pms.length ? await leerPMsDe(tabla, tr.id) : [];
        destinos.push({ trId: tr.id, paso: leerPaso(tabla, tr), pms, id: (objetoDeFila(tr) || {}).mdEstructuraPasoId });
      }
      const op = await vistaPrevia(destinos);
      if (!op) return;

      const v = ventana('Aplicando…', { cancelar: () => { if (!listo.disabled) v.cerrar(); } }); const lineas = [];
      const log = (t) => { lineas.push(t); v.cuerpo.innerHTML = '<pre class="rmd-log">' + esc(lineas.join('\n')) + '</pre>'; v.cuerpo.scrollTop = v.cuerpo.scrollHeight; };
      const listo = botonModal('Cerrar', 'primario', () => v.cerrar()); listo.disabled = true; v.pie.append(listo);
      try {
        // 1) configuración de los pasos mayores (todos los destinos) y un solo Guardar
        const cfg = {}; for (const k of op.campos) cfg[k] = portapapeles.paso[k];
        cfg.chk = {}; for (const k of op.casillas) cfg.chk[k] = portapapeles.paso.chk[k];
        const hayCfg = op.campos.length || op.casillas.length;
        if (hayCfg) {
          for (const dd of destinos) { log(`Paso #${dd.paso.orden} · ${dd.paso.desc}`); await aplicarFila(tabla, dd.trId, cfg, columnas(tabla), log); }
          d.__rmdInter = true;   // lo aplicado por el script cuenta como cambio sin guardar hasta que se guarde
          if (op.guardar) { await guardarYConfirmar(d, log, destinos.length > 1 ? 'los pasos' : 'el paso'); await esperar(1200); }
          else log('ℹ Configuración aplicada sin guardar: revisa y pulsa Guardar.');
        }
        // 2) procesos menores, paso por paso (en su ventana solo se miran las filas de ESE paso: a veces el portal muestra toda la etiqueta)
        const elegidos = op.pms.map((i) => portapapeles.pms[i]).filter((x) => !x.insumo);
        if (elegidos.length) for (const dd of destinos) {
          log(`\nProcesos menores del paso #${dd.paso.orden} (${elegidos.length} por revisar)…`);
          if (!botonPM(document.getElementById(dd.trId) || document.createElement('tr'))) { log('⚠ Este paso no tiene el botón "Procesos Menores": se omite'); continue; }
          const dPM = await abrirPM(tabla, dd.trId), tPM = tablaDe(dPM);
          const delDestino = (x) => { const q = dd.id && objetoDeFila(x); return !q || !('pasoId_mdEstructuraPasoId' in q) || q.pasoId_mdEstructuraPasoId === dd.id; };
          await hasta(() => !ocupado() && filasPMde(dPM).every(delDestino), 4000);
          const propias = () => filasPMde(dPM).filter(delDestino);
          const codigos = () => new Set(propias().map((tr) => leerPMfila(tPM, tr).codigo));
          let cambios = 0;
          for (const x of elegidos) { if (!codigos().has(x.codigo)) { await agregarPM(dPM, x, log, delDestino); cambios++; } else log(`= ${x.codigo} ya estaba en el destino`); }
          const n = columnas(tPM);
          for (const x of elegidos) {
            const previo = dd.pms.find((q) => q.codigo === x.codigo);
            if (previo && !op.actualizar) continue;
            if (previo && !cambiosPM(x, previo).length) { log(`= ${x.codigo} sin cambios`); continue; }
            const fs = propias().filter((tr) => leerPMfila(tPM, tr).codigo === x.codigo); const tr = fs[fs.length - 1];
            if (!tr) { log(`⚠ No encuentro ${x.codigo} para configurarlo`); continue; }
            log(`Configurando ${x.codigo} · ${x.desc}`);
            await aplicarFila(tPM, tr.id, { tipo: x.tipo, vi: x.vi, vf: x.vf, mg: x.mg, dec: x.dec, chk: x.chk }, n, log); dPM.__rmdInter = true; cambios++;
          }
          if (cambios) { await guardarYConfirmar(dPM, log, 'los procesos menores'); await esperar(1000); }
          else log('ℹ Sin cambios en sus procesos menores.');
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

  // agrega un proceso menor (por código de paso) desde el selector "Adicionar Pasos RMD"; filtro: filas que son del paso abierto
  async function agregarPM(dPM, x, log, filtro = () => true) {
    const btn = botonPorTitulo(dPM, 'Adicionar Pasos RMD'); if (!btn) throw new Error('No encuentro el botón Adicionar Pasos RMD');
    const tPM = tablaDe(dPM), propias = () => filasPMde(dPM).filter(filtro), antes = propias().length, previos = new Set(dialogos());
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
    await hasta(() => propias().length > antes, 6000);
    if (propias().length <= antes) throw new Error(`No apareció ${x.codigo} en la lista de procesos menores`);
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
  const objetoDeFila = (tr) => { const it = tr && typeof sap !== 'undefined' && sap.ui && sap.ui.getCore().byId(tr.id); if (!it || !it.oBindingContexts) return null; const n = Object.keys(it.oBindingContexts); const c = n.length && it.getBindingContext(n[0] === 'undefined' ? undefined : n[0]); return c && c.getObject(); };
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
  // Carga rápida de TODAS las OP (v1.21): las mismas 10 lecturas que hace el portal por página (onGetRMDVerOP: la OP con su estado,
  // receta, estructura, equipos, pasos, procesos menores, utensilios, especificaciones, insumos y etiquetas; mismo modelo, entidad,
  // filtros, tamaño de página y orden) pero en paralelo y 3 páginas a la vez, sin el aviso "Cargando" de 8 s que el portal abre en
  // cada página; al final se unen igual que lo hace el portal, así los botones de cada fila (Ver datos OP, Ver Registros,
  // Desasociar) reciben lo mismo de siempre. Si algo falla, se usa la carga anterior (la flecha "▷" del portal, página por página).
  const EXPANDS_VER_OP = ['mdId/estadoIdRmd,estadoIdRmd', 'aReceta/recetaId', 'aEstructura/estructuraId', 'aEstructura/aEquipo/equipoId', 'aEstructura/aPaso/pasoId',
    'aEstructura/aPasoInsumoPaso/pasoHijoId,aEstructura/aPasoInsumoPaso/rmdEstructuraRecetaInsumoId', 'aEstructura/aUtensilio/utensilioId,aEstructura/aUtensilio/agrupadorId',
    'aEstructura/aEspecificacion', 'aEstructura/aInsumo', 'aEstructura/aEtiqueta/etiquetaId'];
  async function cargarTodasOPRapido(d, t, avisar, detenido) {
    const ctl = ctlDe(t); let c = ctl; while (c && !c.getController) c = c.getParent && c.getParent();
    const ctrl = c && c.getController(), vista = ctrl && ctrl.getView && ctrl.getView();
    const modelo = vista && vista.getModel('mainModelv2'), asociar = vista && vista.getModel('asociarDatos'), local = vista && vista.getModel('localModel');
    const mdId = asociar && asociar.getData() && asociar.getData().mdId;
    if (!modelo || !local || !mdId) throw new Error('No encuentro los datos de esta ventana');
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const filtros = [new Filtro('mdId_mdId', 'EQ', mdId), new Filtro('estadoIdRmd_iMaestraId', 'NE', null)];
    const fOP = local.getProperty('/filterOP'), fLote = local.getProperty('/filterLote');
    if (fOP) filtros.push(new Filtro('ordenSAP', 'EQ', fOP)); if (fLote) filtros.push(new Filtro('lote', 'EQ', fLote));
    const leer = (ruta, params) => new Promise((ok, mal) => modelo.read(ruta, { filters: filtros, urlParameters: params, success: ok, error: (e) => mal(new Error(`el servidor no respondió (${(e && e.statusCode) || 'sin código'})`)) }));
    const total = Number(await leer('/RMD/$count', {})) || 0, TAM = 5, paginas = Math.ceil(total / TAM), resultado = new Array(paginas);
    const pagina = async (k) => {
      const skip = k * TAM, [i, r, s, n, dd, l, cc, g, f, p] = await Promise.all(EXPANDS_VER_OP.map((x) => leer('/RMD', { $expand: x, $top: String(TAM), $skip: String(skip) })));
      s.results.forEach((e, j) => { e.aEstructura.results.forEach((e2, a) => { const de = (x) => x.results[j].aEstructura.results[a];
        e2.aEquipo = de(n).aEquipo; e2.aPaso = de(dd).aPaso; e2.aPasoInsumoPaso = de(l).aPasoInsumoPaso; e2.aUtensilio = de(cc).aUtensilio; e2.aEspecificacion = de(g).aEspecificacion; e2.aInsumo = de(f).aInsumo; e2.aEtiqueta = de(p).aEtiqueta; }); });
      i.results.forEach((e, j) => { if (e.estadoIdRmd_iMaestraId === 478) e.fechaCierre = e.fechaActualiza; e.aReceta = r.results[j].aReceta; e.aEstructura = s.results[j].aEstructura; e.item = skip + j + 1; });
      return i.results;
    };
    let siguiente = 0, cargadas = 0;
    const trabajador = async () => { while (siguiente < paginas && !(detenido && detenido())) { const k = siguiente++; resultado[k] = await pagina(k); cargadas += resultado[k].length; if (avisar) avisar(cargadas, total); } };
    await Promise.all(Array.from({ length: Math.min(3, paginas) }, trabajador));
    const filas = resultado.filter(Boolean).flat();
    return { ctrl, modelo: local, ruta: '/Estructura', filas, total };
  }
  // Aviso de avance encima de la tabla de "Ver OP" (barra, cuántas van y "Detener"): la tabla no parpadea página a página.
  function avanceVerOP(d, alDetener) {
    const cont = d.querySelector('.sapMDialogSection') || d, o = document.createElement('div'); o.className = 'rmd-op-avance';
    o.innerHTML = '<div class="rmd-op-caja"><b>Cargando todas las OP…</b><div class="rmd-op-barra"><div></div></div><span class="rmd-op-txt">Contando las OP…</span></div>';
    const b = botonModal('Detener', '', () => { b.disabled = true; setTxt(b, 'Deteniendo…'); alDetener(); }); o.querySelector('.rmd-op-caja').appendChild(b);
    if (getComputedStyle(cont).position === 'static') cont.style.position = 'relative';
    cont.appendChild(o);
    return {
      poner: (n, total) => { setTxt(o.querySelector('.rmd-op-txt'), total ? `${n} de ${total} OP` : `${n} OP`); o.querySelector('.rmd-op-barra > div').style.width = (total ? Math.min(100, Math.round(100 * n / total)) : 30) + '%'; },
      texto: (x) => setTxt(o.querySelector('.rmd-op-txt'), x), quitar: () => o.remove(),
    };
  }
  async function obtenerTodasOP(d, t) {
    let detenido = false; const av = avanceVerOP(d, () => { detenido = true; });
    try {
      try { return { ...(await cargarTodasOPRapido(d, t, (n, total) => av.poner(n, total), () => detenido)), detenido }; }
      catch (e) {
        try { console.info('[RMD] Ver todas: carga rápida no disponible (' + e.message + '); se usa la paginación del portal.'); } catch (e2) { /* sin consola */ }
        av.texto('Cargando página por página…');
        return { ...(await cargarTodasOP(d, t, (n) => av.poner(n, 0))), detenido };
      }
    } finally { av.quitar(); }
  }
  // tras mostrar todas, el rótulo de página del portal ("1 - 5") pasa a decir cuántas se ven
  const rotuloTodas = (r) => { try { const m = r.ctrl.getView().getModel('oModelTemp'); if (m) m.setProperty('/pageRange', `1 - ${r.filas.length}${r.detenido ? ' (detenido)' : ''}`); } catch (e) { /* sin rótulo */ } };
  async function verTodasOP(d, t, boton) {
    boton.disabled = true;
    try {
      const t0 = Date.now(), r = await obtenerTodasOP(d, t);
      await pintarTodasEnTabla(t, r.modelo, r.ruta, r.filas); rotuloTodas(r);
      toast(r.detenido ? `Detenido: se muestran ${r.filas.length} de ${r.total || '?'} OP.` : `Se muestran las ${r.filas.length} OP asociadas (${Math.max(1, Math.round((Date.now() - t0) / 1000))} s).`);
    } catch (e) { toast('No se pudieron cargar todas las OP: ' + e.message, true); }
    finally { boton.disabled = false; }
  }
  async function exportarVerOP(d, t, boton) {
    boton.disabled = true;
    try {
      const r = await obtenerTodasOP(d, t);
      await pintarTodasEnTabla(t, r.modelo, r.ruta, r.filas); rotuloTodas(r);   // así el CSV (que lee de la tabla ya pintada) las incluye todas
      const rmd = (/RMD:\s*(\d+)/.exec(cabecera(d)) || [])[1] || 'rmd';
      descargarTexto(`OP_asociadas_${rmd}.csv`, csvVerOP(t));
    } catch (e) { toast('No se pudo exportar: ' + e.message, true); }
    finally { boton.disabled = false; }
  }
  window.__rmdStats.cargarTodasOPRapido = (d, t) => cargarTodasOPRapido(d, t);   // (diagnóstico)
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

  // ==XLSX-INICIO== (no quitar esta marca ni la de cierre: las pruebas extraen este bloque para correrlo fuera del portal)
  // Libro .xlsx propio, sin librerías (el portal no trae ninguna que escriba tablas dinámicas): celdas con estilo, fórmulas con
  // su valor ya calculado, autofiltro, paneles fijos y TABLAS DINÁMICAS reales: su caché lleva los registros y la tabla va ya
  // pintada, así se ven y se pueden filtrar apenas se abre el archivo, en Excel de escritorio o en Excel para la web. También
  // lee .xlsx (para tomar las listas del mes anterior). Comprime con CompressionStream (deflate-raw), del propio navegador.
  const Xlsx = (() => {
    const utf8 = new TextEncoder(), deUtf8 = new TextDecoder();
    const TABLA_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = TABLA_CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const porTubo = async (u8, transformador) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(transformador)).arrayBuffer());
    const comprimir = (u8) => (typeof CompressionStream === 'undefined' ? null : porTubo(u8, new CompressionStream('deflate-raw')));
    const descomprimir = (u8) => porTubo(u8, new DecompressionStream('deflate-raw'));
    const unir = (partes) => { const n = partes.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n); let o = 0; partes.forEach((p) => { out.set(p, o); o += p.length; }); return out; };

    // ---- ZIP (el contenedor del .xlsx) ----
    async function zip(archivos) {
      const partes = [], central = []; let desplazamiento = 0;
      const d = new Date(), hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      for (const a of archivos) {
        const datos = typeof a.datos === 'string' ? utf8.encode(a.datos) : a.datos, nombre = utf8.encode(a.nombre), crc = crc32(datos);
        const comp = datos.length > 64 ? await comprimir(datos) : null, usa = !!comp && comp.length < datos.length, cuerpo = usa ? comp : datos;
        const lh = new DataView(new ArrayBuffer(30));
        [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, usa ? 8 : 0, 2], [10, hora, 2], [12, fecha, 2], [14, crc, 4], [18, cuerpo.length, 4], [22, datos.length, 4], [26, nombre.length, 2], [28, 0, 2]]
          .forEach(([o, v, t]) => (t === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true)));
        partes.push(new Uint8Array(lh.buffer), nombre, cuerpo);
        const ch = new DataView(new ArrayBuffer(46));
        [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, usa ? 8 : 0, 2], [12, hora, 2], [14, fecha, 2], [16, crc, 4], [20, cuerpo.length, 4], [24, datos.length, 4], [28, nombre.length, 2], [42, desplazamiento, 4]]
          .forEach(([o, v, t]) => (t === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true)));
        central.push(new Uint8Array(ch.buffer), nombre);
        desplazamiento += 30 + nombre.length + cuerpo.length;
      }
      const tamCentral = central.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
      fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamCentral, true); fin.setUint32(16, desplazamiento, true);
      return unir([...partes, ...central, new Uint8Array(fin.buffer)]);
    }
    async function leerZip(u8) {
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
      if (e < 0) throw new Error('el archivo no es un .xlsx');
      const n = dv.getUint16(e + 10, true), archivos = {}; let p = dv.getUint32(e + 16, true);
      for (let i = 0; i < n; i++) {
        const metodo = dv.getUint16(p + 10, true), tam = dv.getUint32(p + 20, true), ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
        const nombre = deUtf8.decode(u8.subarray(p + 46, p + 46 + ln)), ini = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
        archivos[nombre] = { metodo, datos: u8.subarray(ini, ini + tam) };
        p += 46 + ln + le + lc;
      }
      return { nombres: Object.keys(archivos), leer: async (nombre) => { const a = archivos[nombre]; if (!a) return null; return deUtf8.decode(a.metodo === 8 ? await descomprimir(a.datos) : a.datos); } };
    }

    // ---- XML ----
    const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // Caracteres que XML no admite (y, dentro de atributos, los saltos de línea) van como _xHHHH_, igual que los escribe Excel.
    const escX = (s, enAtributo) => escXml(String(s).replace(/_x([0-9A-Fa-f]{4})_/g, '_x005F_x$1_')
      .replace(enAtributo ? /[\u0000-\u001F\uFFFE\uFFFF]/g : /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, (c) => '_x' + c.charCodeAt(0).toString(16).padStart(4, '0') + '_'));
    const desX = (s) => String(s).replace(/&(lt|gt|quot|apos|amp|#(\d+)|#x([0-9a-f]+));/gi, (m, n, dec, hex) => (dec ? String.fromCodePoint(+dec) : hex ? String.fromCodePoint(parseInt(hex, 16)) : { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' }[n.toLowerCase()]))
      .replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
    const letra = (c) => { let s = ''; for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
    const ref = (c, r) => letra(c) + (r + 1);                                            // columna y fila desde 0
    const deRef = (x) => { const m = /^([A-Z]+)(\d+)$/.exec(x); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return { c: c - 1, r: +m[2] - 1 }; };
    const numXml = (n) => (Number.isInteger(n) ? String(n) : String(+n.toPrecision(15)));

    // ---- fechas de Excel (sistema 1900) ----
    // Una fecha se escribe con su hora UTC, igual que el "Exportar" nativo del portal (sap.ui.export escribe las fechas en UTC):
    // así el archivo muestra lo mismo que el exportado a mano, en cualquier zona horaria. Para un día sin hora: Date.UTC(a, m, d).
    const serialDeFecha = (d) => d.getTime() / 86400000 + 25569;
    const isoFecha = (d) => d.toISOString().slice(0, 19);
    const ERRORES = new Set(['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A']);
    const esError = (v) => !!v && typeof v === 'object' && !!v.error;
    const error = (codigo) => ({ error: codigo });

    // ---- estilos (índices fijos que usan las hojas) ----
    // [nombre, formato de número, fuente, relleno, borde, alineación]. Fuentes: 0 normal, 1 negrita, 2 título, 3 nota, 4 negrita
    // blanca, 5 negrita roja, 6 negrita 10. Rellenos: 2 gris claro, 3 verde, 4 ámbar, 5 gris, 6 celeste, 7 azul, 8 amarillo,
    // 9 amarillo claro. Formatos propios: 164 aaaa-mm-dd, 165 aaaa-mm-dd;@, 166 0.0, 167 dd/mm/aaaa, 168 0.0%; 17 = mmm-aa.
    const ESTILOS = [['normal', 0, 0, 0, 0], ['cabecera', 0, 1, 2, 0], ['cabeceraVerde', 0, 0, 3, 0, 'horizontal="center"'],
      ['cabeceraVerdeFecha', 165, 0, 3, 0, 'horizontal="center" wrapText="1"'], ['cabeceraAmbar', 0, 1, 4, 0, 'horizontal="center"'],
      ['cabeceraGris', 0, 1, 5, 0, 'horizontal="center"'], ['fecha', 164, 0, 0, 0], ['texto', 0, 0, 0, 0, 'horizontal="left"'],
      ['centrado', 0, 0, 0, 0, 'horizontal="center"'], ['titulo', 0, 2, 0, 0], ['nota', 0, 3, 0, 0], ['encabezado', 0, 1, 6, 1, 'vertical="center" wrapText="1"'],
      ['decimal', 166, 0, 0, 1], ['porcentaje', 168, 0, 0, 1], ['fechaDia', 167, 0, 0, 0], ['alerta', 0, 5, 0, 0], ['tituloAzul', 0, 1, 7, 0],
      ['negrita', 0, 1, 0, 0], ['mesAnio', 17, 1, 0, 0, 'horizontal="left"'], ['entrada', 0, 0, 8, 1], ['sugerido', 0, 0, 9, 0], ['nombre', 0, 6, 0, 0],
      ['decimal1', 166, 0, 0, 0], ['envuelto', 0, 0, 0, 1, 'vertical="top" wrapText="1"'], ['celda', 0, 0, 0, 1, 'vertical="top"'],
      ['notaAmarilla', 0, 1, 8, 0, 'horizontal="center"'], ['entero', 0, 0, 0, 1], ['fechaHora', 169, 0, 0, 0]];
    const S = Object.fromEntries(ESTILOS.map(([n], i) => [n, i]));
    const fuente = (b, i, sz, color) => `<font>${b ? '<b/>' : ''}${i ? '<i/>' : ''}<sz val="${sz}"/><color rgb="FF${color}"/><name val="Arial"/><family val="2"/></font>`;
    const relleno = (rgb) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
    const XML_ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="6"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="yyyy\\-mm\\-dd;@"/><numFmt numFmtId="166" formatCode="0.0"/><numFmt numFmtId="167" formatCode="dd/mm/yyyy"/><numFmt numFmtId="168" formatCode="0.0%"/><numFmt numFmtId="169" formatCode="dd/mm/yyyy hh:mm"/></numFmts>
<fonts count="7">${fuente(0, 0, 11, '000000')}${fuente(1, 0, 11, '000000')}${fuente(1, 0, 12, '1F3A5F')}${fuente(0, 1, 9, '595959')}${fuente(1, 0, 11, 'FFFFFF')}${fuente(1, 0, 11, 'C00000')}${fuente(1, 0, 10, '000000')}</fonts>
<fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${['F7F7F7', '00B050', 'FFC000', 'C9C9C9', 'DDEBF7', '00B0F0', 'FFFF00', 'FFF2CC'].map(relleno).join('')}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${ESTILOS.length}">${ESTILOS.map(([, nf, fo, fi, bo, al]) => `<xf numFmtId="${nf}" fontId="${fo}" fillId="${fi}" borderId="${bo}" xfId="0"${nf ? ' applyNumberFormat="1"' : ''}${fo ? ' applyFont="1"' : ''}${fi ? ' applyFill="1"' : ''}${bo ? ' applyBorder="1"' : ''}${al ? ` applyAlignment="1"><alignment ${al}/></xf>` : '/>'}`).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;

    // ---- libro ----
    // hoja.celdas: Map "fila,columna" -> { v, f, s }; v puede ser texto, número, Date, booleano, null o error('#VALUE!').
    function crearLibro() {
      const hojas = [], cachés = [], dinamicas = [];
      const hoja = (nombre, op = {}) => {
        // tabla: { nombre, ref } convierte ese rango (con su fila de encabezados) en una tabla de Excel, con su propio autofiltro;
        // con estilo (p. ej. 'TableStyleMedium2') lleva ese diseño de Excel con filas en franjas.
        const h = { nombre, filas: new Map(), cols: op.cols || [], congelar: op.congelar || null, filtro: op.tabla ? null : op.filtro || null, tabla: op.tabla || null, activa: !!op.activa, dinamicas: [], combinadas: [] };
        h.poner = (celda, v, s, f) => { const { c, r } = typeof celda === 'string' ? deRef(celda) : celda; let fila = h.filas.get(r); if (!fila) { fila = new Map(); h.filas.set(r, fila); } fila.set(c, { v, s: s == null ? undefined : (typeof s === 'string' ? S[s] : s), f }); };
        h.combinar = (rango) => { h.combinadas.push(rango); };
        hojas.push(h); return h;
      };
      // Caché de tabla dinámica: los datos de origen tal como los ve Excel (una fila por registro, un valor por campo). extras:
      // { campo: [valores] } que no están en los datos pero que los filtros deben conocer (Excel los guarda como elementos "sin
      // uso"): así, si alguien escribe luego ese valor en la hoja y actualiza, el filtro ya sabe si lo muestra o lo oculta.
      // op.tabla: nombre de la tabla de Excel de origen (así, al actualizar, la tabla dinámica toma también las filas agregadas).
      const cache = (hojaOrigen, campos, registros, rango, op = {}) => { const c = { id: cachés.length + 1, hoja: hojaOrigen, campos, registros, rango, tabla: op.tabla || null, usados: new Set(), extras: op.extras || {} }; cachés.push(c); return c; };
      // La tabla se calcula y se pinta en el momento (así quien la crea sabe cuánto ocupa y dónde poner lo siguiente).
      const dinamica = (hojaDestino, cacheDinamica, def) => {
        const d = { ...def, cache: cacheDinamica, hoja: hojaDestino }; [...def.filas, ...(def.columnas || []), ...(def.paginas || []).map((p) => p.campo)].forEach((n) => cacheDinamica.usados.add(n));
        d.pintada = pintarDinamica(d); hojaDestino.dinamicas.push(d); dinamicas.push(d); return d.pintada;
      };
      return { hoja, cache, dinamica, generar: () => generarLibro(hojas, cachés, dinamicas), hojas };
    }

    // Orden de Excel para los elementos de una tabla dinámica: números, textos (sin distinguir mayúsculas), lógicos, errores y
    // al final el vacío "(en blanco)".
    const claseOrden = (v) => (v == null || v === '' ? 4 : typeof v === 'number' ? 0 : v instanceof Date ? 0 : typeof v === 'boolean' ? 2 : esError(v) ? 3 : 1);
    const comparar = (a, b) => {
      const ca = claseOrden(a), cb = claseOrden(b); if (ca !== cb) return ca - cb;
      if (ca === 0) return (a instanceof Date ? a.getTime() : a) - (b instanceof Date ? b.getTime() : b);
      if (ca === 1) return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' }) || (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
      if (ca === 2) return (a ? 1 : 0) - (b ? 1 : 0);
      if (ca === 3) return a.error < b.error ? -1 : a.error > b.error ? 1 : 0;
      return 0;
    };
    const claveElemento = (v) => (v == null || v === '' ? (v === '' ? 's:' : 'm') : typeof v === 'number' ? 'n:' + v : v instanceof Date ? 'd:' + v.getTime() : typeof v === 'boolean' ? 'b:' + v : esError(v) ? 'e:' + v.error : 's:' + String(v).toLowerCase());
    // Celda vacía: "(en blanco)"; texto vacío (una fórmula que devuelve ""): elemento sin rótulo, como lo muestra Excel.
    const rotulo = (v) => (v == null ? '(en blanco)' : v === '' ? '' : v instanceof Date ? isoFecha(v).slice(0, 10) : esError(v) ? v.error : v);

    function xmlCelda(c, r, x) {
      const at = `r="${ref(c, r)}"${x.s != null ? ` s="${x.s}"` : ''}`;
      const v = x.v, f = x.f != null ? `<f>${escX(x.f)}</f>` : '';
      if (x.f != null) {
        if (esError(v)) return `<c ${at} t="e">${f}<v>${v.error}</v></c>`;
        if (typeof v === 'number') return `<c ${at}>${f}<v>${numXml(v)}</v></c>`;
        if (typeof v === 'boolean') return `<c ${at} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
        const t = v == null ? '' : String(v);
        return `<c ${at} t="str">${f}<v${/^\s|\s$|\n/.test(t) ? ' xml:space="preserve"' : ''}>${escX(t)}</v></c>`;
      }
      if (v == null || v === '') return x.s != null ? `<c ${at}/>` : '';
      if (typeof v === 'number') return `<c ${at}><v>${numXml(v)}</v></c>`;
      if (v instanceof Date) return `<c ${at}><v>${numXml(serialDeFecha(v))}</v></c>`;
      if (typeof v === 'boolean') return `<c ${at} t="b"><v>${v ? 1 : 0}</v></c>`;
      if (esError(v)) return `<c ${at} t="e"><v>${v.error}</v></c>`;
      return null;                                                                           // texto: va a las cadenas compartidas
    }

    async function generarLibro(hojas, cachés, dinamicas) {
      const compartidas = new Map(), lista = [];
      const idTexto = (t) => { let i = compartidas.get(t); if (i === undefined) { i = lista.length; compartidas.set(t, i); lista.push(t); } return i; };
      const archivos = [];
      const pintadas = dinamicas.map((d) => d.pintada), tablas = [];                         // (las dinámicas se pintaron al crearlas)
      hojas.forEach((h, ih) => {
        const filas = [...h.filas.keys()].sort((a, b) => a - b); let maxC = 0, maxR = 0;
        const cuerpo = filas.map((r) => {
          const fila = h.filas.get(r), cols = [...fila.keys()].sort((a, b) => a - b); maxR = Math.max(maxR, r); maxC = Math.max(maxC, cols[cols.length - 1] || 0);
          return `<row r="${r + 1}">` + cols.map((c) => { const x = fila.get(c), xml = xmlCelda(c, r, x); return xml !== null ? xml : `<c r="${ref(c, r)}"${x.s != null ? ` s="${x.s}"` : ''} t="s"><v>${idTexto(String(x.v))}</v></c>`; }).join('') + '</row>';
        }).join('');
        const cong = h.congelar ? (() => { const { c, r } = deRef(h.congelar); const zona = c && r ? 'bottomRight' : c ? 'topRight' : 'bottomLeft';
          return `<pane${c ? ` xSplit="${c}"` : ''}${r ? ` ySplit="${r}"` : ''} topLeftCell="${h.congelar}" activePane="${zona}" state="frozen"/><selection pane="${zona}" activeCell="${h.congelar}" sqref="${h.congelar}"/>`; })() : '';
        const cols = h.cols.length ? `<cols>${h.cols.map(([a, b, w]) => `<col min="${a}" max="${b}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
        const rels = h.dinamicas.map((d, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotTable" Target="../pivotTables/pivotTable${dinamicas.indexOf(d) + 1}.xml"/>`);
        let partesTabla = '';
        if (h.tabla) {
          const id = tablas.length + 1, rid = `rId${rels.length + 1}`, { c: c1 } = deRef(h.tabla.ref.split(':')[1]), { c: c0 } = deRef(h.tabla.ref.split(':')[0]), enc = h.filas.get(0) || new Map();
          const columnas = []; for (let c = c0; c <= c1; c++) columnas.push(`<tableColumn id="${c - c0 + 1}" name="${escXml(String((enc.get(c) || {}).v || 'Columna' + (c - c0 + 1)))}"/>`);
          tablas.push({ nombre: `xl/tables/table${id}.xml`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${escXml(h.tabla.nombre)}" displayName="${escXml(h.tabla.nombre)}" ref="${h.tabla.ref}" totalsRowShown="0"><autoFilter ref="${h.tabla.ref}"/><tableColumns count="${columnas.length}">${columnas.join('')}</tableColumns><tableStyleInfo${h.tabla.estilo ? ` name="${escXml(h.tabla.estilo)}"` : ''} showFirstColumn="0" showLastColumn="0" showRowStripes="${h.tabla.estilo ? 1 : 0}" showColumnStripes="0"/></table>` });
          rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${id}.xml"/>`);
          partesTabla = `<tableParts count="1"><tablePart r:id="${rid}"/></tableParts>`;
        }
        archivos.push({ nombre: `xl/worksheets/sheet${ih + 1}.xml`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${ref(maxC, maxR)}"/><sheetViews><sheetView${h.activa ? ' tabSelected="1"' : ''} workbookViewId="0">${cong}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.25"/>${cols}<sheetData>${cuerpo}</sheetData>${h.filtro ? `<autoFilter ref="${h.filtro}"/>` : ''}${h.combinadas.length ? `<mergeCells count="${h.combinadas.length}">${h.combinadas.map((x) => `<mergeCell ref="${x}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>${partesTabla}</worksheet>` });
        if (rels.length) archivos.push({ nombre: `xl/worksheets/_rels/sheet${ih + 1}.xml.rels`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>` });
      });
      archivos.push(...tablas);
      cachés.forEach((c) => archivos.push(...xmlCache(c)));
      pintadas.forEach((p, k) => {
        archivos.push({ nombre: `xl/pivotTables/pivotTable${k + 1}.xml`, datos: p.xml });
        archivos.push({ nombre: `xl/pivotTables/_rels/pivotTable${k + 1}.xml.rels`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="../pivotCache/pivotCacheDefinition${p.cache.id}.xml"/></Relationships>` });
      });
      archivos.push({ nombre: 'xl/sharedStrings.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${lista.length}" uniqueCount="${lista.length}">${lista.map((t) => `<si><t${/^\s|\s$|\n/.test(t) ? ' xml:space="preserve"' : ''}>${escX(t)}</t></si>`).join('')}</sst>` });
      archivos.push({ nombre: 'xl/styles.xml', datos: XML_ESTILOS });
      const nombresDef = hojas.map((h, i) => (h.filtro ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${h.nombre.replace(/'/g, "''")}'!$${h.filtro.replace(':', ':$').replace(/([A-Z]+)(\d+)/g, '$1$$$2')}</definedName>` : '')).join('');
      archivos.push({ nombre: 'xl/workbook.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="${Math.max(0, hojas.findIndex((h) => h.activa))}"/></bookViews><sheets>${hojas.map((h, i) => `<sheet name="${escXml(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${nombresDef ? `<definedNames>${nombresDef}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/>${cachés.length ? `<pivotCaches>${cachés.map((c) => `<pivotCache cacheId="${c.id}" r:id="rId${hojas.length + 2 + c.id}"/>`).join('')}</pivotCaches>` : ''}</workbook>` });
      archivos.push({ nombre: 'xl/_rels/workbook.xml.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((h, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${hojas.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>${cachés.map((c) => `<Relationship Id="rId${hojas.length + 2 + c.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition${c.id}.xml"/>`).join('')}</Relationships>` });
      archivos.push({ nombre: '[Content_Types].xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${hojas.map((h, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>${cachés.map((c) => `<Override PartName="/xl/pivotCache/pivotCacheDefinition${c.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml"/><Override PartName="/xl/pivotCache/pivotCacheRecords${c.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml"/>`).join('')}${pintadas.map((p, k) => `<Override PartName="/xl/pivotTables/pivotTable${k + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml"/>`).join('')}${tablas.map((t) => `<Override PartName="/${t.nombre}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` });
      archivos.push({ nombre: '_rels/.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` });
      const ahora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
      archivos.push({ nombre: 'docProps/core.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>RMD · mejoras de interfaz</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${ahora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${ahora}</dcterms:modified></cp:coreProperties>` });
      archivos.push({ nombre: 'docProps/app.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>` });
      return zip(archivos);
    }

    // ---- tablas dinámicas ----
    // Por cada campo usado en alguna tabla: sus elementos únicos (sin distinguir mayúsculas, como Excel), en el orden en que
    // aparecen; y el orden en que se muestran (ascendente).
    function elementosDe(c, nombre) {
      c.elementos = c.elementos || {};
      if (c.elementos[nombre]) return c.elementos[nombre];
      const i = c.campos.indexOf(nombre); if (i < 0) throw new Error('campo inexistente: ' + nombre);
      const valores = [], indice = new Map(), sinUso = new Set();
      c.registros.forEach((reg) => { const v = reg[i], k = claveElemento(v); if (!indice.has(k)) { indice.set(k, valores.length); valores.push(v == null ? null : v); } });
      (c.extras[nombre] || []).forEach((v) => { const k = claveElemento(v); if (!indice.has(k)) { indice.set(k, valores.length); sinUso.add(valores.length); valores.push(v); } });
      const orden = valores.map((_, k) => k).sort((a, b) => comparar(valores[a], valores[b]) || a - b);
      const posicion = new Map(orden.map((k, p) => [k, p]));
      return (c.elementos[nombre] = { i, valores, indice, orden, posicion, sinUso });
    }
    const tipoCampo = (valores) => {
      const t = { blanco: false, texto: false, numero: false, entero: true, fecha: false, error: false, logico: false, largo: false, min: Infinity, max: -Infinity, minF: null, maxF: null };
      valores.forEach((v) => {
        if (v == null || v === '') { if (v === '') t.texto = true; else t.blanco = true; return; }
        if (typeof v === 'number') { t.numero = true; if (!Number.isInteger(v)) t.entero = false; t.min = Math.min(t.min, v); t.max = Math.max(t.max, v); return; }
        if (v instanceof Date) { t.fecha = true; if (!t.minF || v < t.minF) t.minF = v; if (!t.maxF || v > t.maxF) t.maxF = v; return; }
        if (typeof v === 'boolean') { t.logico = true; return; }
        if (esError(v)) { t.error = true; return; }
        t.texto = true; if (String(v).length > 255) t.largo = true;
      });
      return t;
    };
    function atributosElementos(t, cuenta) {
      const a = [], tipos = [t.texto || t.error, t.numero, t.fecha, t.logico].filter(Boolean).length;
      if (!t.texto && !t.error && !t.logico && !t.blanco && (t.numero || t.fecha)) a.push('containsSemiMixedTypes="0"');
      if (!t.texto && !t.error && !t.logico && !t.numero) a.push('containsNonDate="0"');
      if (t.fecha) a.push('containsDate="1"');
      if (!t.texto && !t.error) a.push('containsString="0"');
      if (t.blanco) a.push('containsBlank="1"');
      if (tipos > 1) a.push('containsMixedTypes="1"');
      if (t.numero) { a.push('containsNumber="1"'); if (t.entero) a.push('containsInteger="1"'); a.push(`minValue="${numXml(t.min)}" maxValue="${numXml(t.max)}"`); }
      if (t.fecha) a.push(`minDate="${isoFecha(t.minF)}" maxDate="${isoFecha(t.maxF)}"`);
      if (t.largo) a.push('longText="1"');
      if (cuenta != null) a.push(`count="${cuenta}"`);
      return a.join(' ');
    }
    const xmlValorCache = (v, sinUso) => (v == null ? '<m/>' : typeof v === 'number' ? `<n v="${numXml(v)}"/>` : v instanceof Date ? `<d v="${isoFecha(v)}"/>`
      : typeof v === 'boolean' ? `<b v="${v ? 1 : 0}"/>` : esError(v) ? `<e v="${v.error}"/>` : `<s v="${escX(v, true)}"${sinUso ? ' u="1"' : ''}/>`);
    function xmlCache(c) {
      const conElementos = new Set(c.usados);
      const campos = c.campos.map((nombre, i) => {
        const valores = c.registros.map((r) => r[i]), t = tipoCampo(valores);
        if (!conElementos.has(nombre)) return `<cacheField name="${escXml(nombre)}" numFmtId="0"><sharedItems ${atributosElementos(t)}/></cacheField>`;
        const e = elementosDe(c, nombre), te = e.sinUso.size ? tipoCampo(e.valores) : t;         // los elementos sin uso también cuentan
        return `<cacheField name="${escXml(nombre)}" numFmtId="0"><sharedItems ${atributosElementos(te, e.valores.length)}>${e.valores.map((v, k) => xmlValorCache(v, e.sinUso.has(k))).join('')}</sharedItems></cacheField>`;
      });
      const idx = c.campos.map((n) => (conElementos.has(n) ? elementosDe(c, n) : null));
      const registros = c.registros.map((r) => '<r>' + r.map((v, i) => (idx[i] ? `<x v="${idx[i].indice.get(claveElemento(v))}"/>` : xmlValorCache(v === '' ? '' : v))).join('') + '</r>').join('');
      return [
        { nombre: `xl/pivotCache/pivotCacheDefinition${c.id}.xml`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1" refreshedBy="RMD · mejoras de interfaz" refreshedDate="${numXml(serialDeFecha(new Date()))}" createdVersion="8" refreshedVersion="8" minRefreshableVersion="3" recordCount="${c.registros.length}"><cacheSource type="worksheet">${c.tabla ? `<worksheetSource name="${escXml(c.tabla)}"/>` : `<worksheetSource ref="${c.rango}" sheet="${escXml(c.hoja.nombre)}"/>`}</cacheSource><cacheFields count="${c.campos.length}">${campos.join('')}</cacheFields></pivotCacheDefinition>` },
        { nombre: `xl/pivotCache/_rels/pivotCacheDefinition${c.id}.xml.rels`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheRecords" Target="pivotCacheRecords${c.id}.xml"/></Relationships>` },
        { nombre: `xl/pivotCache/pivotCacheRecords${c.id}.xml`, datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" count="${c.registros.length}">${registros}</pivotCacheRecords>` },
      ];
    }

    // Calcula y pinta una tabla dinámica en formato tabular (como las del archivo de indicadores): filtros de página arriba, una
    // fila de encabezados, las filas con sus subtotales ("Total …") y el "Total general". def: { nombre, celda, filas[], columnas[],
    // paginas[{ campo, visible(v) }], ocultar{ campo: fn(v) }, valor{ campo, funcion 'count'|'sum', nombre } }.
    function pintarDinamica(d) {
      const c = d.cache, h = d.hoja, cols = d.columnas || [], pags = d.paginas || [];
      const E = {}; [...d.filas, ...cols, ...pags.map((p) => p.campo)].forEach((n) => { E[n] = elementosDe(c, n); });
      const visibleEn = (n) => { const p = pags.find((x) => x.campo === n), o = d.ocultar && d.ocultar[n]; return (v) => (!p || p.visible(v)) && (!o || !o(v)); };
      const filtros = Object.keys(E).map((n) => ({ i: E[n].i, ok: visibleEn(n) }));
      const iValor = c.campos.indexOf(d.valor.campo);
      // registros que pasan todos los filtros
      const regs = c.registros.filter((r) => filtros.every((f) => f.ok(r[f.i])));
      const posDe = (n, v) => E[n].posicion.get(E[n].indice.get(claveElemento(v)));
      const acumular = (acc, v) => {
        if (d.valor.funcion === 'count') { if (v != null && v !== '') acc.n++; return; }
        if (esError(v)) acc.err = acc.err || v.error; else if (typeof v === 'number') { acc.s += v; acc.hay = true; }
        acc.n++;
      };
      const nuevo = () => ({ n: 0, s: 0, err: null, hay: false });
      const final = (acc) => (d.valor.funcion === 'count' ? (acc.n ? acc.n : null) : acc.err ? error(acc.err) : acc.n ? +acc.s.toPrecision(15) : null);
      // árbol de filas y columnas con los agregados
      const R = d.filas.length, iF = d.filas.map((n) => E[n].i), iC = cols.map((n) => E[n].i);
      const raiz = { hijos: new Map(), acc: nuevo(), porCol: new Map() }, totalCol = new Map(), colsVistas = new Set();
      regs.forEach((reg) => {
        const v = reg[iValor], kc = cols.length ? posDe(cols[0], reg[iC[0]]) : null;
        if (kc != null) colsVistas.add(kc);
        let nodo = raiz;
        const sumar = (x) => { acumular(x.acc, v); if (kc != null) { let a = x.porCol.get(kc); if (!a) { a = nuevo(); x.porCol.set(kc, a); } acumular(a, v); } };
        sumar(nodo);
        for (let k = 0; k < R; k++) {
          const p = posDe(d.filas[k], reg[iF[k]]); let hijo = nodo.hijos.get(p);
          if (!hijo) { hijo = { hijos: new Map(), acc: nuevo(), porCol: new Map() }; nodo.hijos.set(p, hijo); }
          nodo = hijo; sumar(nodo);
        }
      });
      const colsOrden = [...colsVistas].sort((a, b) => a - b);
      // geometría
      const { c: c0, r: r0 } = deRef(d.celda), encab = cols.length ? 2 : 1, ancho = R + (cols.length ? colsOrden.length + 1 : 1);
      const lineas = [];                                                                     // { tipo, nivel, ruta[], nodo, r }
      const recorrer = (nodo, nivel, ruta, rep) => {
        const hijos = [...nodo.hijos.keys()].sort((a, b) => a - b);
        hijos.forEach((p, j) => {
          const hijo = nodo.hijos.get(p), r = j === 0 ? rep : nivel;
          if (nivel < R - 1) { recorrer(hijo, nivel + 1, [...ruta, p], r); lineas.push({ tipo: 'sub', nivel, ruta: [...ruta, p], nodo: hijo }); }
          else lineas.push({ tipo: 'dato', nivel, ruta: [...ruta, p], nodo: hijo, r });
        });
      };
      recorrer(raiz, 0, [], 0);
      lineas.push({ tipo: 'total', nodo: raiz });
      const valorDe = (nodo, kc) => final(kc == null ? nodo.acc : nodo.porCol.get(kc) || nuevo());
      const poner = (cc, rr, v, s) => { if (v != null) h.poner({ c: cc, r: rr }, v, s); };
      const valorCampo = (n, p) => rotulo(E[n].valores[E[n].orden[p]]);
      // filtros de página: rótulo y lo que muestra ("(Todas)", "(Varios elementos)", el único elemento o "(en blanco)"); como en
      // Excel, solo cuentan los elementos que están en los datos (no los "sin uso").
      pags.forEach((p, k) => {
        const e = E[p.campo], usados = e.orden.filter((x) => !e.sinUso.has(x)), vis = usados.filter((x) => p.visible(e.valores[x]));
        const texto = vis.length === usados.length ? '(Todas)' : vis.length === 1 ? rotulo(e.valores[vis[0]]) : '(Varios elementos)';
        h.poner({ c: c0, r: r0 - 1 - pags.length + k }, p.campo); h.poner({ c: c0 + 1, r: r0 - 1 - pags.length + k }, texto);
      });
      if (cols.length) { h.poner({ c: c0, r: r0 }, d.valor.nombre); h.poner({ c: c0 + R, r: r0 }, cols[0]); }
      const rEnc = r0 + encab - 1;
      d.filas.forEach((n, k) => h.poner({ c: c0 + k, r: rEnc }, n));
      if (cols.length) { colsOrden.forEach((p, k) => h.poner({ c: c0 + R + k, r: rEnc }, valorCampo(cols[0], p))); h.poner({ c: c0 + R + colsOrden.length, r: rEnc }, 'Total general'); }
      else h.poner({ c: c0 + R, r: rEnc }, d.valor.nombre);
      lineas.forEach((L, j) => {
        const rr = rEnc + 1 + j;
        if (L.tipo === 'dato') for (let k = L.r; k < R; k++) h.poner({ c: c0 + k, r: rr }, valorCampo(d.filas[k], L.ruta[k]));
        else if (L.tipo === 'sub') h.poner({ c: c0 + L.nivel, r: rr }, 'Total ' + valorCampo(d.filas[L.nivel], L.ruta[L.nivel]));
        else h.poner({ c: c0, r: rr }, 'Total general');
        if (cols.length) { colsOrden.forEach((p, k) => poner(c0 + R + k, rr, valorDe(L.nodo, p))); poner(c0 + R + colsOrden.length, rr, valorDe(L.nodo, null)); }
        else poner(c0 + R, rr, valorDe(L.nodo, null));
      });
      const rFin = rEnc + lineas.length;
      // XML de la tabla
      const x = (p) => (p ? `<x v="${p}"/>` : '<x/>');
      const rowItems = lineas.map((L) => (L.tipo === 'dato' ? `<i${L.r ? ` r="${L.r}"` : ''}>${L.ruta.slice(L.r).map(x).join('')}</i>`
        : L.tipo === 'sub' ? `<i t="default"${L.nivel ? ` r="${L.nivel}"` : ''}>${x(L.ruta[L.nivel])}</i>` : '<i t="grand"><x/></i>')).join('');
      const colItems = cols.length ? colsOrden.map((p) => `<i>${x(p)}</i>`).join('') + '<i t="grand"><x/></i>' : '<i/>';
      const campos = c.campos.map((n, i) => {
        const e = E[n], esFila = d.filas.includes(n), esCol = cols.includes(n), pag = pags.find((p) => p.campo === n), esDato = i === iValor;
        const base = `compact="0" outline="0" showAll="0"${esDato ? ' dataField="1"' : ''}`;
        if (!e) return `<pivotField ${base}/>`;
        const vis = visibleEn(n);
        const items = e.orden.map((k) => `<item${vis(e.valores[k]) ? '' : ' h="1"'}${e.sinUso.has(k) ? ' m="1"' : ''} x="${k}"/>`).join('') + '<item t="default"/>';
        const eje = esFila ? 'axisRow' : esCol ? 'axisCol' : 'axisPage';
        return `<pivotField axis="${eje}" compact="0" outline="0"${pag ? ' multipleItemSelectionAllowed="1"' : ''} showAll="0"${esDato ? ' dataField="1"' : ''}><items count="${e.orden.length + 1}">${items}</items></pivotField>`;
      });
      const ubic = `<location ref="${ref(c0, r0)}:${ref(c0 + ancho - 1, rFin)}" firstHeaderRow="1" firstDataRow="${cols.length ? 2 : 1}" firstDataCol="${R}"${pags.length ? ` rowPageCount="${pags.length}" colPageCount="1"` : ''}/>`;
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" name="${escXml(d.nombre)}" cacheId="${c.id}" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataCaption="Valores" updatedVersion="8" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="8" indent="0" compact="0" compactData="0" multipleFieldFilters="0">${ubic}<pivotFields count="${campos.length}">${campos.join('')}</pivotFields><rowFields count="${R}">${d.filas.map((n) => `<field x="${E[n].i}"/>`).join('')}</rowFields><rowItems count="${lineas.length}">${rowItems}</rowItems>${cols.length ? `<colFields count="1"><field x="${E[cols[0]].i}"/></colFields>` : ''}<colItems count="${cols.length ? colsOrden.length + 1 : 1}">${colItems}</colItems>${pags.length ? `<pageFields count="${pags.length}">${pags.map((p) => `<pageField fld="${E[p.campo].i}" hier="-1"/>`).join('')}</pageFields>` : ''}<dataFields count="1"><dataField name="${escXml(d.valor.nombre)}" fld="${iValor}"${d.valor.funcion === 'count' ? ' subtotal="count"' : ''} baseField="0" baseItem="0"/></dataFields><pivotTableStyleInfo name="PivotStyleLight16" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/></pivotTableDefinition>`;
      // valorDe(['PLANTA ATE', 'NC']) -> el total de esa fila (o de ese subtotal) tal como queda en la tabla; null si no aparece.
      const valorDeFila = (etiquetas) => {
        let nodo = raiz;
        for (let k = 0; k < etiquetas.length; k++) {
          const p = [...nodo.hijos.keys()].find((q) => String(valorCampo(d.filas[k], q)).toUpperCase() === String(etiquetas[k]).toUpperCase());
          if (p == null) return null; nodo = nodo.hijos.get(p);
        }
        return final(nodo.acc);
      };
      return { xml, cache: c, celda: ref(c0, r0), rango: `${ref(c0, r0)}:${ref(c0 + ancho - 1, rFin)}`, filaIni: r0, filaFin: rFin, colIni: c0, colFin: c0 + ancho - 1, lineas: lineas.length, valorDe: valorDeFila };
    }

    // ---- lectura mínima de un .xlsx (valores de las hojas) ----
    async function leerLibro(u8) {
      const z = await leerZip(u8);
      const wb = await z.leer('xl/workbook.xml'), rels = await z.leer('xl/_rels/workbook.xml.rels');
      if (!wb || !rels) throw new Error('el archivo no es un libro de Excel');
      const destino = {}; for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) { const id = /\bId="([^"]+)"/.exec(m[0]), t = /\bTarget="([^"]+)"/.exec(m[0]); if (id && t) destino[id[1]] = t[1]; }
      const hojas = []; for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) { const nom = /\bname="([^"]*)"/.exec(m[0]), rid = /\br:id="([^"]+)"/.exec(m[0]); if (nom && rid) hojas.push({ nombre: desX(nom[1]), ruta: 'xl/' + destino[rid[1]].replace(/^\/?xl\//, '').replace(/^\//, '') }); }
      const ss = await z.leer('xl/sharedStrings.xml'), compartidas = [];
      if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) compartidas.push([...m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)].map((t) => desX(t[1] || '')).join(''));
      return {
        hojas: hojas.map((h) => h.nombre),
        async filas(nombre) {                                                                   // [[valor…]…], con los huecos en null
          const h = hojas.find((x) => x.nombre === nombre); if (!h) return null;
          const xml = await z.leer(h.ruta); if (!xml) return null;
          const filas = [];
          for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
            const at = m[1], cont = m[2] || '', r = /\br="([A-Z]+\d+)"/.exec(at); if (!r) continue;
            const { c, r: fila } = deRef(r[1]), t = (/\bt="([^"]+)"/.exec(at) || [])[1], v = /<v>([\s\S]*?)<\/v>/.exec(cont);
            let val = null;
            if (t === 's') val = v ? compartidas[+v[1]] : null;
            else if (t === 'inlineStr') val = [...cont.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)].map((x) => desX(x[1] || '')).join('');
            else if (t === 'str') val = v ? desX(v[1]) : '';
            else if (t === 'b') val = v ? v[1] === '1' : null;
            else if (t === 'e') val = v ? error(v[1]) : null;
            else if (v) val = +v[1];
            (filas[fila] || (filas[fila] = []))[c] = val;
          }
          return filas;
        },
      };
    }

    return { crearLibro, leerLibro, zip, leerZip, ref, deRef, letra, error, esError, ERRORES, serialDeFecha, isoFecha, S };
  })();
  // ==XLSX-FIN==

  // ==INDICADORES-INICIO== (no quitar esta marca ni la de cierre: las pruebas extraen este bloque para correrlo fuera del portal)
  // Indicadores del mes: arma "BD RMD <MES> <AÑO> - P1-P2.xlsx" igual al que el equipo prepara a mano cada mes a partir del
  // "Exportar" nativo: hoja "Exportación SAPUI5" (las 18 columnas del Exportar + las 12 calculadas, con las mismas fórmulas),
  // PEND PL1, PEND PL2, RESUMEN (las 7 tablas dinámicas en las mismas celdas y con los mismos filtros) y Hoja1 (productividad
  // por persona). Este bloque solo calcula: los RMD los lee de SAP quien lo llama (la misma lectura de "Enviar a Status RMD").
  const Indicadores = (() => {
    const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const HOJA_DATOS = 'Exportación SAPUI5', REF_DATOS = "'Exportación SAPUI5'", TABLA_DATOS = 'DatosRMD';
    const CAMPOS = ['Código', 'Código de Solicitud', 'Versión', 'Estado', 'Código por Defecto', 'Código Agrupador', 'Descripción', 'Etapa', 'Fecha Registro',
      'Usuario Registro', 'Fecha Autorización', 'Usuario Autorización', 'A/F', 'Fecha Solicitud', 'Planta', 'Sección', 'Motivo', 'Observación',
      'Fec Ingreso Real', 'F.I Real', 'Dias', 'Usuario', 'Prioridad', 'No contar', 'FC', 'FI', 'FA', 'Por revisar', 'RMD ING', 'RMD APR'];
    const C = Object.fromEntries(CAMPOS.map((n, i) => [n, i]));
    const L = Object.fromEntries(CAMPOS.map((n, i) => [n, Xlsx.letra(i)]));
    // Las columnas calculadas llevan las mismas fórmulas del archivo del equipo (n = fila de Excel); su valor se calcula aquí
    // con las mismas reglas de Excel, para que el archivo se vea completo aun sin recalcular y las tablas dinámicas coincidan.
    const FORMULAS = {
      'Fec Ingreso Real': (n) => `MID(R${n},1,8)`, 'F.I Real': (n) => `TEXT(S${n},"0000-00-00")`, Dias: (n) => `NETWORKDAYS(T${n},K${n})`,
      Usuario: (n) => `MID(R${n},9,2)`, Prioridad: (n) => `MID(R${n},12,1)`, FC: (n) => `MID(R${n},15,3)`, FI: (n) => `MID(R${n},21,3)`,
      FA: (n) => `MID(R${n},27,3)`, 'RMD ING': (n) => `Y${n}*Z${n}`, 'RMD APR': (n) => `Y${n}*AA${n}`,
    };
    const ESTILO_CAB = { 'Fec Ingreso Real': 'cabeceraVerdeFecha', 'F.I Real': 'cabeceraVerde', Dias: 'cabeceraVerde', Usuario: 'cabeceraVerde', Prioridad: 'cabeceraVerde',
      'No contar': 'cabeceraAmbar', FC: 'cabeceraGris', FI: 'cabeceraGris', FA: 'cabeceraGris' };
    const ANCHOS_DATOS = [[1, 1, 11.375], [2, 2, 15.375], [3, 3, 6.125], [4, 4, 10.75], [5, 5, 12.75], [6, 6, 10.875], [7, 7, 30.75], [8, 8, 17.375], [9, 9, 17.25],
      [10, 10, 19.25], [11, 11, 11.625], [12, 12, 10.125], [13, 13, 10.75], [14, 14, 18.25], [15, 15, 23.875], [16, 16, 10.75], [17, 17, 21], [18, 18, 97.25],
      [19, 19, 11.5], [20, 23, 9], [24, 24, 12.375], [25, 27, 7], [28, 28, 34], [29, 30, 10]];
    const ANCHOS_RESUMEN = [[1, 1, 18.75], [2, 2, 21.25], [3, 7, 7], [16, 16, 17.25], [17, 17, 22.75], [18, 18, 18.375], [30, 30, 15.375], [31, 31, 19.5],
      [32, 32, 17.75], [52, 52, 13.375], [53, 53, 19.5], [54, 54, 21.75], [67, 67, 26.375], [68, 68, 12]];
    // Personas de Hoja1 (las del archivo de agosto): planta, nombre, iniciales en la Observación y usuario de SAP que autoriza.
    const PERSONAS = [['PLANTA 1', 'CUELLAR LOYOLA NOELIA ROSA', 'NC', 'NCUELLARL'], ['PLANTA 1', 'QUISPE JIMENA', 'JQ', 'JQUISPEP'],
      ['PLANTA 2', 'MORENO KARLA VANESSA', 'VM', 'KMORENOM'], ['PLANTA 2', 'DINA  VALDERRAMA', 'DV', '']];
    // Plazos del "% dentro de plazo" (días hábiles de ingreso a autorización), los mismos con que se calculó "% PRIO" en julio.
    const PLAZOS = [['1', 5], ['2', 10], ['3', 30]];
    const PLANTAS = ['PLANTA ATE', 'PLANTA LIMA'];
    const NO_CONTAR_CONOCIDOS = ['PEND CC', 'PEND JEFE/GER', 'NO CONTAR', 'REVISAR', 'POR INGRESAR'];

    const limpio = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    const clave = (t) => limpio(t).toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
    const texto = (v) => (v == null ? '' : Xlsx.esError(v) ? v.error : limpio(v));
    const vacio = (v) => v == null || v === '';

    // ---- funciones de Excel que usan las columnas calculadas ----
    const VALOR = Xlsx.error('#VALUE!');
    const mid = (t, ini, n) => (t == null ? '' : String(t)).substr(ini - 1, n);                          // MID
    // Texto -> número como lo convierte Excel (en español) al operar: ignora solo espacios (un salto de línea da #VALUE!), signo
    // (también "- 2"), miles con coma, punto decimal, exponente y %; y también fechas y horas cortas: AAAA-MM-DD, d-m, d/m/aa
    // (día primero; sin año, el año en curso) y h:mm. Comprobado contra lo que calculó Excel en las 11 013 filas de agosto.
    const DIA_CERO = Date.UTC(1899, 11, 30), ANIO_ACTUAL = new Date().getFullYear();
    const serialDe = (a, me, d) => { if (a < 1900 || a > 9999 || me < 1 || me > 12 || d < 1) return null; const x = Date.UTC(a, me - 1, d); return new Date(x).getUTCDate() === d ? (x - DIA_CERO) / 86400000 : null; };
    function aNumero(v) {
      if (typeof v === 'number') return v;
      if (v == null) return null;
      const t = String(v).replace(/^ +| +$/g, '');
      let m = /^([+-]?) *(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?(%?)$/.exec(t);
      if (m && (m[2] || m[3])) {
        let n = Number((m[2] || '0').replace(/,/g, '') + '.' + (m[3] || '0') + (m[4] ? 'e' + m[4] : ''));
        if (m[1] === '-') n = -n; if (m[5]) n /= 100;
        return isFinite(n) ? n : null;
      }
      if ((m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(t))) return serialDe(+m[1], +m[2], +m[3]);
      if ((m = /^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{4}|\d{2}))?$/.exec(t))) { let a = m[3] == null ? ANIO_ACTUAL : +m[3]; if (m[3] && m[3].length === 2) a += a < 30 ? 2000 : 1900; return serialDe(a, +m[2], +m[1]); }
      if ((m = /^(\d{1,2}):(\d{0,2})(?::(\d{1,2}))?$/.exec(t)) && +m[1] < 24) return (+m[1] + (+m[2] || 0) / 60 + (+m[3] || 0) / 3600) / 24;
      return null;
    }
    // TEXT(v;"0000-00-00"): un texto que Excel lee como número (o fecha) se escribe con ese formato; otro texto queda igual.
    function texto0000(v) {
      if (v == null || v === '') return '';
      const n = aNumero(v);
      if (n == null) return String(v);
      const r = Math.round(Math.abs(n)), s = String(r).padStart(8, '0');
      return (n < 0 && r ? '-' : '') + s.slice(0, s.length - 4) + '-' + s.slice(-4, -2) + '-' + s.slice(-2);
    }
    // NETWORKDAYS: días de lunes a viernes entre dos fechas, ambas incluidas (negativo si la primera es posterior). Una celda
    // vacía vale 0 (el "sábado 00/01/1900" de Excel: por eso sin Fecha Autorización sale un número negativo muy grande).
    const aSerial = (v) => (v == null ? 0 : aNumero(v));
    const diaSemana = (s) => (((s - 1) % 7) + 7) % 7;                                                  // 0 = domingo (serie 1)
    function diasHabiles(a, b) {
      a = Math.floor(a); b = Math.floor(b);
      const x = Math.min(a, b), y = Math.max(a, b), semanas = Math.floor((y - x + 1) / 7); let n = semanas * 5;
      for (let s = x + semanas * 7; s <= y; s++) { const d = diaSemana(s); if (d !== 0 && d !== 6) n++; }
      return a <= b ? n : -n;
    }
    const networkdays = (ini, fin) => { const a = aSerial(ini), b = aSerial(fin); return a == null || b == null ? VALOR : a < 0 || b < 0 ? Xlsx.error('#NUM!') : diasHabiles(a, b); };
    const producto = (a, b) => { const x = aNumero(a), y = aNumero(b); return x == null || y == null ? VALOR : x * y; };
    // Las 10 columnas con fórmula de una fila (la Observación trae "AAAAMMDD" + iniciales + prioridad + FC/FI/FA en posiciones fijas).
    function calculadas(obs, fechaAut) {
      const S = mid(obs, 1, 8), T = texto0000(S), Y = mid(obs, 15, 3), Z = mid(obs, 21, 3), AA = mid(obs, 27, 3);
      return { S, T, U: networkdays(T, fechaAut || null), V: mid(obs, 9, 2), W: mid(obs, 12, 1), Y, Z, AA, AC: producto(Y, Z), AD: producto(Y, AA) };
    }

    // ---- A/F: el mes si el RMD se registró, se autorizó o ingresó (fecha al inicio de la Observación) en el mes, o si sin
    // registro se solicitó en el mes; "ANTIGUO" si sigue abierto (Ingresado, Solicitado o Solicitud Aprobada) y ya existía al
    // cierre del mes; si no, el valor de SAP. Es lo que el equipo marca a mano (coincide en 11 011 de 11 013 filas de agosto).
    const ABIERTOS = /^(Ingresado|Solicitado|Solicitud Aprobada)$/i;
    const fechaOk = (d) => (d instanceof Date && !isNaN(d) ? d : null);
    function afDelMes(f, mes, anio) {
      const pref = `${anio}-${String(mes).padStart(2, '0')}`, prefS = pref.replace('-', '');
      const reg = fechaOk(f.fechaRegistro), sol = fechaOk(f.fechaSolicitud), enMes = (d) => !!d && d.toISOString().slice(0, 7) === pref;
      if (enMes(reg) || String(f.fechaAut || '').slice(0, 7) === pref || mid(f.observacion, 1, 6) === prefS || (!reg && enMes(sol))) return MESES[mes - 1];
      const fin = Date.UTC(anio, mes, 1), existia = (!reg && !sol) || [reg, sol].some((d) => d && d.getTime() < fin);
      if (ABIERTOS.test(limpio(f.estado)) && existia) return 'ANTIGUO';
      return limpio(f.af);
    }

    // ---- "No contar": el equipo lo llena a mano. Se sugiere (marcado para revisar) solo en las filas que entran a los
    // indicadores (A/F del mes o ANTIGUO), con los mismos criterios que se ven en los archivos de julio y agosto: NO CONTAR si
    // su RMD ING/APR da #VALUE! (Observación sin el formato AAAAMMDD-II-P-C…-FI…-FA…) y entraría a una suma del mes (dejaría
    // el total en error); lo que ya estaba marcado el mes anterior; NO CONTAR / PEND JEFE/GER / PEND CC si la Observación lo
    // dice; y PEND CC si sigue abierto pese a tener fecha de autorización del mes. Nunca se sugiere un PEND en un RMD ya
    // Autorizado o Suspendido (lo sacaría de los autorizados del mes).
    const RX_NO_CONTAR = /\bNO\s+CONTAR(?![A-ZÁÉÍÓÚÑ])/i;
    const RX_PEND_JEFE = /\bPEND(?:IENTE|\.)?\s*(?:DE\s+)?(?:APROB(?:ACI[OÓ]N)?\s+(?:DEL?\s+)?)?(?:JEF|GER)/i;
    const RX_PEND_CC = /\bPEND(?:IENTE|\.)?\s*(?:DE\s+)?(?:APROB(?:ACI[OÓ]N)?\s+(?:DEL?\s+)?)?(?:CC\b|C\.C|CALIDAD)/i;
    function normalizarNoContar(v) {
      const t = limpio(v).toUpperCase(); if (!t) return '';
      if (/^PEND\.?\s*JEF/.test(t)) return 'PEND JEFE/GER';                                      // PEND JEF/GER, PEND JEFE/GEREN…
      if (/^PEND\.?\s*(CC|NC|C\.C\.?)$/.test(t)) return 'PEND CC';
      return t;
    }
    const claveFila = (codigo, solicitud, version) => (limpio(codigo) ? 'C:' + limpio(codigo) : 'S:' + limpio(solicitud) + '|' + limpio(version));
    // x: { errorEnSuma, autEnMes } (los calcula construir con el A/F y las columnas calculadas de la fila)
    function sugerirNoContar(f, anteriores, x = {}) {
      const abierto = ABIERTOS.test(limpio(f.estado)), obs = f.observacion || '';
      if (x.errorEnSuma) return { valor: 'NO CONTAR', origen: 'formato', nota: 'la Observación no tiene el formato AAAAMMDD-II-P-C…-FI…-FA… y su RMD ING/APR da #VALUE! (dejaría el total en error)' };
      const ant = anteriores ? normalizarNoContar(anteriores.get(claveFila(f.codigo, f.codigoSolicitud, f.version))) : '';
      if (ant && (abierto || ant === 'NO CONTAR' || ant === 'REVISAR')) return { valor: ant, origen: 'anterior', nota: 'copiado del mes anterior' };
      if (RX_NO_CONTAR.test(obs)) return { valor: 'NO CONTAR', origen: 'observacion', nota: 'la Observación dice "NO CONTAR"' };
      if (abierto && x.autEnMes) return { valor: 'PEND CC', origen: 'estado', nota: `sigue "${limpio(f.estado)}" aunque tiene fecha de autorización del mes` };
      if (abierto && RX_PEND_JEFE.test(obs)) return { valor: 'PEND JEFE/GER', origen: 'observacion', nota: 'la Observación indica pendiente de jefe o gerencia' };
      if (abierto && RX_PEND_CC.test(obs)) return { valor: 'PEND CC', origen: 'observacion', nota: 'la Observación indica pendiente de CC' };
      return null;
    }

    // ---- archivo del mes anterior (opcional): sus listas PEND PL1 / PEND PL2 y los "No contar" que el equipo ya marcó ----
    async function leerListaPend(libro, nombre) {
      const filas = await libro.filas(nombre); if (!filas) return [];
      const r = filas.findIndex((f) => f && f.some((x) => clave(x) === 'DESCRIPCION') && f.some((x) => clave(x) === 'ESTADO')); if (r < 0) return [];
      const cab = filas[r].map(clave), ix = (n) => cab.indexOf(n);
      const campos = { estado: ix('ESTADO'), descripcion: ix('DESCRIPCION'), presentacion: ix('PRESENTACION'), etapa: ix('ETAPA'), af: ix('A/F'),
        seccion: ix('SECCION'), observacion: ix('OBSERVACION'), noContar: ix('NO CONTAR') };
      return filas.slice(r + 1).filter((f) => f && texto(f[campos.descripcion]))
        .map((f) => Object.fromEntries(Object.entries(campos).map(([k, i]) => [k, i >= 0 ? texto(f[i]) : ''])));
    }
    async function leerPrevio(u8) {
      const libro = await Xlsx.leerLibro(u8), previo = { noContar: new Map(), pl1: [], pl2: [], hojas: libro.hojas };
      const datos = await libro.filas(HOJA_DATOS);
      if (datos && datos[0]) {
        const cab = datos[0].map(limpio), ix = (n) => cab.indexOf(n);
        const iCod = ix('Código'), iSol = ix('Código de Solicitud'), iVer = ix('Versión'), iNC = ix('No contar');
        if (iNC >= 0) datos.slice(1).forEach((fila) => {
          const v = fila && normalizarNoContar(texto(fila[iNC])); if (!v) return;
          const cod = texto(fila[iCod]), sol = texto(fila[iSol]); if (!cod && !sol) return;
          previo.noContar.set(claveFila(cod, sol, texto(fila[iVer])), v);
        });
      }
      previo.pl1 = await leerListaPend(libro, 'PEND PL1'); previo.pl2 = await leerListaPend(libro, 'PEND PL2');
      if (!datos && !previo.pl1.length && !previo.pl2.length) throw new Error(`no tiene la hoja "${HOJA_DATOS}" ni las listas PEND PL1 / PEND PL2`);
      return previo;
    }

    const nombreArchivo = (mes, anio) => `BD RMD ${MESES[mes - 1]} ${anio} - P1-P2.xlsx`;
    const dd = (n) => String(n).padStart(2, '0');
    const fechaHora = (d) => `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()} ${dd(d.getHours())}:${dd(d.getMinutes())}`;

    // op: { filas: [datosBaseDeMD…], mes: 1-12, anio, previo: leerPrevio() | null, sugerir: true, generado: Date,
    //       ajustar: (fila) => ({ af, noContar }) solo para pruebas (reproducir a mano un mes ya cerrado) }
    function construir(op) {
      const { mes, anio } = op, MES = MESES[mes - 1], pref = `${anio}-${dd(mes)}`, prefS = `${anio}${dd(mes)}`;
      const previo = op.previo || null, libro = Xlsx.crearLibro();
      // como el "Exportar" nativo (onExportXLS): sin filtro de estado, el portal deja fuera los RMD Cancelados
      op = { ...op, filas: op.filas.filter((f) => !/^CANCELAD/.test(clave(f.estado))) };
      const est = { sap: 0, mes: 0, antiguo: 0, sugeridos: { formato: 0, anterior: 0, observacion: 0, estado: 0 }, pl1: 0, pl2: 0, posibles: 0 };
      const nulo = (x) => (vacio(x) ? null : x);
      // 1) filas de SAP
      const registros = [];
      op.filas.forEach((f) => {
        let af = afDelMes(f, mes, anio), noContar = null, nota = null;
        const k = calculadas(f.observacion, f.fechaAut);
        if (af === MES || af === 'ANTIGUO') {
          const autEnMes = String(f.fechaAut || '').slice(0, 7) === pref;
          const errorEnSuma = af === MES && ((autEnMes && Xlsx.esError(k.AD)) || (k.S.slice(0, 6) === prefS && Xlsx.esError(k.AC)));
          const s = op.sugerir === false ? null : sugerirNoContar(f, previo && previo.noContar, { errorEnSuma, autEnMes });
          if (s) { noContar = s.valor; nota = `Revisar "No contar": ${s.nota}`; est.sugeridos[s.origen]++; }
        }
        if (op.ajustar) { const a = op.ajustar(f) || {}; if ('af' in a) af = a.af; if ('noContar' in a) { noContar = nulo(a.noContar); nota = null; } }
        if (af === MES) est.mes++; else if (af === 'ANTIGUO') est.antiguo++;
        const obs = f.observacion ? String(f.observacion).slice(0, 32767) : null;
        registros.push([nulo(f.codigo), nulo(f.codigoSolicitud), nulo(f.version), nulo(f.estado), nulo(f.codDefecto), nulo(f.codAgrupador), nulo(f.descripcion), nulo(f.etapa),
          fechaOk(f.fechaRegistro), nulo(f.usuarioRegistro), nulo(f.fechaAut), nulo(f.usuarioAutorizacion), nulo(af), fechaOk(f.fechaSolicitud), nulo(f.planta), nulo(f.seccion),
          nulo(f.motivo), obs, k.S, k.T, k.U, k.V, k.W, noContar, k.Y, k.Z, k.AA, nota, k.AC, k.AD]);
        est.sap++;
      });
      // 2) listas PEND del mes anterior, agregadas al final de los datos como hace el equipo (sin fórmulas; Fecha Solicitud =
      // día 30 del mes; A/F del mes si la lista lo dice, si no ANTIGUO). PL1 ("Por hacer solicitud") es de Planta Ate y PL2
      // ("solicitado", por ingresar) de Planta Lima. PL1 entra ahora a TOTAL DE RMD con su propio estado (en julio contaba
      // como "solicitado"; en agosto quedó fuera del rango de la tabla dinámica).
      const pl1 = previo ? previo.pl1 : [], pl2 = previo ? previo.pl2 : [];
      const fechaPend = new Date(Date.UTC(anio, mes - 1, Math.min(30, new Date(Date.UTC(anio, mes, 0)).getUTCDate())));
      const filaPend = (p, planta, estado) => {
        const r = new Array(CAMPOS.length).fill(null);
        r[C.Estado] = p.estado || estado; r[C['Descripción']] = p.descripcion || null; r[C.Etapa] = p.etapa || null;
        r[C['A/F']] = limpio(p.af).toUpperCase() === MES ? MES : 'ANTIGUO'; r[C['Fecha Solicitud']] = fechaPend; r[C.Planta] = planta;
        return r;
      };
      pl2.forEach((p) => registros.push(filaPend(p, 'PLANTA LIMA', 'solicitado')));
      pl1.forEach((p) => registros.push(filaPend(p, 'PLANTA ATE', 'Por hacer solicitud')));
      est.pl1 = pl1.length; est.pl2 = pl2.length;

      // 3) hoja de datos (una tabla de Excel: al agregar filas y "Actualizar todo", las tablas dinámicas las toman solas)
      const ultima = registros.length + 1, rango = `A1:AD${ultima}`;
      const hd = libro.hoja(HOJA_DATOS, { cols: ANCHOS_DATOS, congelar: 'H1', tabla: { nombre: TABLA_DATOS, ref: rango } });
      CAMPOS.forEach((n, c) => hd.poner({ c, r: 0 }, n, ESTILO_CAB[n] || 'cabecera'));
      registros.forEach((reg, i) => {
        const r = i + 1, n = r + 1, sap = i < est.sap;
        reg.forEach((v, c) => {
          const campo = CAMPOS[c];
          if (sap && FORMULAS[campo]) hd.poner({ c, r }, v, null, FORMULAS[campo](n));
          else if (v != null) hd.poner({ c, r }, v, v instanceof Date ? 'fecha' : campo === 'No contar' && reg[C['Por revisar']] ? 'sugerido' : null);
        });
      });
      const cache = libro.cache(hd, CAMPOS, registros, rango, { tabla: TABLA_DATOS, extras: { 'No contar': NO_CONTAR_CONOCIDOS } });

      // 4) RESUMEN: las 7 tablas dinámicas del archivo del equipo, en sus mismas celdas (las de abajo bajan si las de arriba crecen)
      const hr = libro.hoja('RESUMEN', { activa: true, cols: ANCHOS_RESUMEN });
      const nc = (v) => limpio(v).toUpperCase(), esMes = (v) => nc(v) === MES, esMesOAnt = (v) => esMes(v) || nc(v) === 'ANTIGUO';
      const autEnMes = (v) => typeof v === 'string' && v.slice(0, 7) === pref, ingEnMes = (v) => typeof v === 'string' && v.slice(0, 6) === prefS;
      const pendOVacio = (v) => vacio(v) || nc(v) === 'PEND CC' || nc(v) === 'PEND JEFE/GER';
      const cuenta = { campo: 'Descripción', funcion: 'count', nombre: 'Cuenta de Descripción' };
      const titulo = (celda, t, combinar) => { hr.poner(celda, t, 'tituloAzul'); if (combinar) hr.combinar(combinar); };
      titulo('A1', 'RMD AUTORIZADOS POR COMPLEJIDAD (SIN MULTIPLICAR)', 'A1:C1'); hr.poner('F1', 'INFORMATIVO', 'negrita'); hr.combinar('F1:H1');
      titulo('P1', 'RMD AUTORIZADOS TOTAL', 'P1:R1');
      titulo('AD1', 'RMD INGRESADOS POR COMPLEJIDAD (SIN MULTIPLICAR)', 'AD1:AH1'); hr.poner('AJ1', '(INFORMATIVO)', 'negrita');
      titulo('AZ1', ' TOTAL DE RMD ', 'AZ1:BB1');
      titulo('BO1', 'DÍAS HÁBILES DE INGRESO A AUTORIZACIÓN, POR PRIORIDAD', 'BO1:BT1');
      hr.poner('A2', `Generado desde SAP el ${fechaHora(op.generado || new Date())} (estados de ese momento) · Mes: ${MES} ${anio} · Si cambias "No contar" o "A/F" en la hoja de datos, pulsa Datos › Actualizar todo.`, 'nota');
      const t1 = libro.dinamica(hr, cache, { nombre: 'Tabla dinámica2', celda: 'A8', filas: ['Planta', 'Usuario Autorización'], columnas: ['FC'],
        paginas: [{ campo: 'A/F', visible: esMesOAnt }, { campo: 'No contar', visible: vacio }, { campo: 'Fecha Autorización', visible: autEnMes }], valor: cuenta });
      const t2 = libro.dinamica(hr, cache, { nombre: 'Tabla dinámica1', celda: 'P9', filas: ['Planta', 'Usuario Autorización'],
        paginas: [{ campo: 'Fecha Autorización', visible: autEnMes }, { campo: 'No contar', visible: (v) => vacio(v) || nc(v) === 'REVISAR' }, { campo: 'A/F', visible: esMes }],
        valor: { campo: 'RMD APR', funcion: 'sum', nombre: 'Suma de RMD APR' } });
      const t3 = libro.dinamica(hr, cache, { nombre: 'Tabla dinámica4', celda: 'AD10', filas: ['Planta', 'Usuario'], columnas: ['FC'],
        paginas: [{ campo: 'Fec Ingreso Real', visible: ingEnMes }, { campo: 'A/F', visible: esMes }, { campo: 'No contar', visible: pendOVacio }], valor: cuenta });
      const f4 = Math.max(36, t3.filaFin + 9);                                                    // (filas desde 0: AD37 en agosto)
      titulo(Xlsx.ref(29, f4 - 6), 'RMD INGRESADOS TOTAL', `AD${f4 - 5}:AF${f4 - 5}`);
      const t4 = libro.dinamica(hr, cache, { nombre: 'Tabla dinámica5', celda: Xlsx.ref(29, f4), filas: ['Planta', 'Usuario'],
        paginas: [{ campo: 'A/F', visible: esMes }, { campo: 'Fec Ingreso Real', visible: ingEnMes }, { campo: 'No contar', visible: pendOVacio }],
        valor: { campo: 'RMD ING', funcion: 'sum', nombre: 'Suma de RMD ING' } });
      const t5 = libro.dinamica(hr, cache, { nombre: 'Tabla dinámica6', celda: 'AZ8', filas: ['Planta', 'Estado'],
        paginas: [{ campo: 'A/F', visible: esMesOAnt }, { campo: 'No contar', visible: (v) => nc(v) !== 'NO CONTAR' && nc(v) !== 'POR INGRESAR' }],
        ocultar: { Estado: (v) => /^SOLICITUD (APROBADA|RECHAZADA)$/.test(nc(v)) }, valor: cuenta });
      const f6 = Math.max(28, t5.filaFin + 10);                                                   // título en AZ29 en agosto
      titulo(Xlsx.ref(51, f6), 'ESTATUS DE TOTAL DE RMD  POR MOTIVO(NO CONTAR)', `AZ${f6 + 1}:BB${f6 + 1}`); hr.poner(Xlsx.ref(54, f6), 'INFORMATIVO', 'negrita');
      libro.dinamica(hr, cache, { nombre: 'Tabla dinámica7', celda: Xlsx.ref(51, f6 + 6), filas: ['Planta', 'A/F', 'No contar'],
        ocultar: { 'A/F': (v) => vacio(v) || nc(v) === 'SI' }, valor: cuenta });
      const t7 = libro.dinamica(hr, cache, { nombre: 'Tabla dinámica8', celda: 'BO8', filas: ['Planta', 'Prioridad'], columnas: ['Dias'],
        paginas: [{ campo: 'A/F', visible: esMesOAnt }, { campo: 'No contar', visible: vacio }, { campo: 'Estado', visible: (v) => /^(AUTORIZADO|SUSPENDIDO)$/.test(nc(v)) }], valor: cuenta });
      // "% dentro de plazo" (el "% PRIO" del archivo de julio, que en agosto quedó con #REF!): con CONTAR.SI.CONJUNTO sobre la hoja
      // de datos, así no depende de en qué columna de la tabla dinámica cae cada número de días.
      const fP = t7.filaFin + 3, D = (campo) => `${REF_DATOS}!$${L[campo]}:$${L[campo]}`;
      titulo(Xlsx.ref(66, fP), '% DENTRO DE PLAZO (AUTORIZADOS Y SUSPENDIDOS DEL MES)', `BO${fP + 1}:BT${fP + 1}`);
      ['Planta', 'Prioridad', 'Plazo (días hábiles)', 'Dentro de plazo', 'Total', '%'].forEach((t, k) => hr.poner({ c: 66 + k, r: fP + 1 }, t, 'encabezado'));
      const enPlazo = registros.filter((r) => /^(AUTORIZADO|SUSPENDIDO)$/.test(nc(r[C.Estado])) && esMesOAnt(r[C['A/F']]) && vacio(r[C['No contar']]));
      let fila = fP + 2;
      PLANTAS.forEach((planta) => PLAZOS.forEach(([prio, dias]) => {
        const n = fila + 1, base = `${D('Planta')},"${planta}",${D('Prioridad')},"${prio}",${D('Estado')},{"Autorizado","Suspendido"},${D('A/F')},{"${MES}";"ANTIGUO"},${D('No contar')},""`;
        const grupo = enPlazo.filter((r) => nc(r[C.Planta]) === planta && String(r[C.Prioridad]) === prio);
        const dentro = grupo.filter((r) => typeof r[C.Dias] === 'number' && r[C.Dias] >= 0 && r[C.Dias] <= dias).length;
        hr.poner({ c: 66, r: fila }, planta, 'celda'); hr.poner({ c: 67, r: fila }, prio, 'celda'); hr.poner({ c: 68, r: fila }, dias, 'entrada');
        hr.poner({ c: 69, r: fila }, dentro, 'entero', `SUMPRODUCT(COUNTIFS(${base},${D('Dias')},">=0",${D('Dias')},"<="&BQ${n}))`);
        hr.poner({ c: 70, r: fila }, grupo.length, 'entero', `SUMPRODUCT(COUNTIFS(${base}))`);
        hr.poner({ c: 71, r: fila }, grupo.length ? dentro / grupo.length : '', 'porcentaje', `IF(BS${n}>0,BR${n}/BS${n},"")`);
        fila++;
      }));
      hr.poner({ c: 66, r: fila }, 'Plazo: días hábiles desde la fecha de ingreso (inicio de la Observación) hasta la autorización; puedes cambiarlo en la columna amarilla.', 'nota');

      // 5) Hoja1: productividad por persona, tomada de las tablas "TOTAL" (RMD ING por iniciales, RMD APR por usuario de SAP)
      const h1 = libro.hoja('Hoja1', { cols: [[2, 2, 11], [3, 3, 30], [4, 7, 12.5], [8, 8, 14]] });
      h1.poner('D3', `DLAB.: COMPLETAR LOS DÍAS LABORADOS EN ${MES}`, 'notaAmarilla'); h1.combinar('D3:H3');
      h1.poner('C5', new Date(Date.UTC(anio, mes - 1, 1)), 'mesAnio');
      ['PLANTA ', 'Nombre', 'Ingresados', 'Autorizados', 'Total', 'DLAB.', 'Promedio/Día'].forEach((t, k) => h1.poner({ c: 1 + k, r: 5 }, t, 'encabezado'));
      const celdaTabla = (t) => `RESUMEN!$${Xlsx.letra(t.colIni)}$${t.filaIni + 1}`;
      const dePersona = (t, dato, campo, usuario) => {
        if (!usuario) return { valor: 0, formula: null };
        const valor = PLANTAS.reduce((s, p) => { const v = t.valorDe([p, usuario]); return s + (typeof v === 'number' ? v : 0); }, 0);
        return { valor, formula: PLANTAS.map((p) => `IFERROR(GETPIVOTDATA("${dato}",${celdaTabla(t)},"Planta","${p}","${campo}","${usuario}"),0)`).join('+') };
      };
      const i0 = 7;
      PERSONAS.forEach(([planta, nombre, ini, usuarioSap], k) => {
        const r = 6 + k, n = r + 1, ing = dePersona(t4, 'Suma de RMD ING', 'Usuario', ini), aut = dePersona(t2, 'Suma de RMD APR', 'Usuario Autorización', usuarioSap);
        h1.poner({ c: 1, r }, planta, 'celda'); h1.poner({ c: 2, r }, nombre, 'nombre');
        h1.poner({ c: 3, r }, ing.valor, 'decimal', ing.formula); h1.poner({ c: 4, r }, aut.valor, 'decimal', aut.formula);
        h1.poner({ c: 5, r }, ing.valor + aut.valor, 'decimal', `SUM(D${n}:E${n})`); h1.poner({ c: 6, r }, null, 'entrada');
        h1.poner({ c: 7, r }, '', 'decimal', `IF(N(G${n})>0,F${n}/G${n},"")`);
      });
      const rT = 6 + PERSONAS.length, nT = rT + 1, i1 = rT;
      h1.poner({ c: 2, r: rT }, 'Total', 'encabezado');
      ['D', 'E', 'F', 'G'].forEach((col, k) => {
        const suma = k === 3 ? 0 : [...Array(PERSONAS.length).keys()].reduce((s, j) => { const x = h1.filas.get(6 + j).get(3 + k).v; return s + (typeof x === 'number' ? x : 0); }, 0);
        h1.poner({ c: 3 + k, r: rT }, suma, 'decimal', `SUM(${col}${i0}:${col}${i1})`);
      });
      h1.poner({ c: 7, r: rT }, '', 'decimal', `IF(N(G${nT})>0,F${nT}/G${nT},"")`);
      [`Ingresados = Suma de RMD ING (tabla "RMD INGRESADOS TOTAL" de RESUMEN) de sus iniciales en la Observación, en ambas plantas.`,
        'Autorizados = Suma de RMD APR (tabla "RMD AUTORIZADOS TOTAL") de su usuario de SAP.',
        'Promedio/Día = Total / DLAB. Meta: no menos de 3 RMD por día.'].forEach((t, k) => h1.poner({ c: 1, r: rT + 2 + k }, t, 'nota'));

      // 6) PEND PL1 / PEND PL2 (mismas columnas; se agrega "Posible registro en SAP" para limpiar la lista: un RMD con la misma
      // descripción y etapa que entró a SAP desde el mes anterior, que ya no debería seguir como pendiente)
      const desde = Date.UTC(anio, mes - 2, 1), porDescripcion = new Map();
      op.filas.forEach((f) => {
        const d = [fechaOk(f.fechaSolicitud), fechaOk(f.fechaRegistro)].filter(Boolean).map((x) => x.getTime()); if (!d.length || Math.max(...d) < desde) return;
        const k = clave(f.descripcion) + '|' + clave(f.etapa); if (!porDescripcion.has(k)) porDescripcion.set(k, f);
      });
      const posible = (p) => {
        const f = porDescripcion.get(clave(p.descripcion) + '|' + clave(p.etapa)); if (!f) return '';
        est.posibles++;
        const fecha = (fechaOk(f.fechaRegistro) || fechaOk(f.fechaSolicitud)).toISOString().slice(0, 10);
        return `${f.codigo ? 'RMD ' + f.codigo : 'Solicitud ' + f.codigoSolicitud} · ${f.estado} · ${fecha}`;
      };
      const listaPend = (nombre, filaCab, cols, lista, extra) => {
        const h = libro.hoja(nombre, { cols: extra.anchos });
        [...cols.map((x) => x[0]), 'Posible registro en SAP (revisar)'].forEach((t, k) => h.poner({ c: k, r: filaCab }, t, 'encabezado'));
        lista.forEach((p, i) => {
          const r = filaCab + 1 + i;
          cols.forEach(([, campo], k) => { const v = campo === 'n' ? i + 1 : p[campo]; if (!vacio(v)) h.poner({ c: k, r }, v, 'celda'); });
          const x = posible(p); if (x) h.poner({ c: cols.length, r }, x, 'sugerido');
        });
        if (!lista.length) h.poner({ c: 1, r: filaCab + 1 }, 'Sin lista: al generar los indicadores, elige el archivo del mes anterior para traerla (o complétala aquí y agrega las filas al final de la hoja de datos).', 'nota');
        return h;
      };
      const hp1 = listaPend('PEND PL1', 2, [['N', 'n'], ['Estado', 'estado'], ['Descripción', 'descripcion'], ['Presentación', 'presentacion'], ['Etapa', 'etapa'], ['A/F', 'af'], ['Sección', 'seccion'], ['No contar', 'noContar']], pl1,
        { anchos: [[1, 1, 5], [2, 2, 19], [3, 3, 50], [4, 4, 13], [5, 5, 17], [6, 6, 11], [7, 7, 12], [8, 8, 14], [9, 9, 44]] });
      hp1.poner('C1', 'Total', 'negrita'); hp1.poner('D1', pl1.length, 'negrita', `COUNTA(C4:C${pl1.length + 503})`);
      listaPend('PEND PL2', 1, [['N', 'n'], ['Estado', 'estado'], ['Descripción', 'descripcion'], ['Etapa', 'etapa'], ['A/F', 'af'], ['Sección', 'seccion'], ['Observación', 'observacion'], ['No contar', 'noContar']], pl2,
        { anchos: [[1, 1, 5], [2, 2, 13], [3, 3, 50], [4, 4, 17], [5, 5, 11], [6, 6, 10], [7, 7, 30], [8, 8, 15], [9, 9, 44]] });
      // mismo orden de hojas que el archivo del equipo
      const orden = [HOJA_DATOS, 'PEND PL1', 'PEND PL2', 'RESUMEN', 'Hoja1'];
      libro.hojas.sort((a, b) => orden.indexOf(a.nombre) - orden.indexOf(b.nombre));

      const total = (t) => { const v = t.valorDe([]); return typeof v === 'number' ? v : 0; };
      return { libro, nombre: nombreArchivo(mes, anio), resumen: { ...est, autorizados: total(t2), autorizadosCuenta: total(t1), ingresados: total(t4), ingresadosCuenta: total(t3), totalRmd: total(t5) } };
    }

    return { MESES, CAMPOS, nombreArchivo, construir, leerPrevio, afDelMes, calculadas, sugerirNoContar, normalizarNoContar, texto0000, networkdays, aNumero };
  })();
  // ==INDICADORES-FIN==

  // ---- "Documentos citados" del RMD (v1.23: solo los documentos, como se pensó al inicio, y en segundos) ----
  // Lee TODOS los pasos del RMD abierto (MD_ES_PASO, con su estructura), sus etiquetas (MD_ES_ETIQUETA) y todos sus procesos
  // menores (MD_ES_PASO_INSUMO_PASO) con el modelo del portal —las mismas entidades que el portal usa al abrir cada lista—, en
  // 3 lecturas y sin abrir ninguna ventana, y busca en las descripciones el patrón <Tipo I/P/F><Área>-<sufijo NNN> (mismo
  // criterio que src/rmd_automation/referencias.py). Antes abría cada lista y tardaba de 20 s a varios minutos.
  const ICONO_DOCUMENTOS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h6l2.5 2.5V14a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z"/><path d="M9.5 1.5V4h2.5M5.5 8h5M5.5 10.5h5"/></svg>';
  const TIPOS_DOC = { I: 'Instructivo', P: 'Procedimiento', F: 'Formato' };
  const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  function descargarArchivo(nombre, datos, tipo) {
    const blob = new Blob([datos], { type: tipo || 'application/octet-stream' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  // (diagnóstico) bytes de un .xlsx en base64, para que las pruebas lo revisen sin descargarlo en el navegador
  const aBase64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  // Todas las filas de una entidad con esos filtros (páginas de 1000, como el portal: el servicio no devuelve más por lectura)
  async function leerTodoDe(modelo, entidad, filtros, params) {
    const leer = (skip) => new Promise((ok, mal) => modelo.read('/' + entidad, { filters: filtros, urlParameters: { ...params, $top: '1000', $skip: String(skip) },
      success: (r) => ok((r && r.results) || []), error: (e) => mal(new Error(`el servidor no respondió al leer ${entidad} (${(e && e.statusCode) || 'sin código'})`)) }));
    const out = []; for (let skip = 0; skip < 50000; skip += 1000) { const p = await leer(skip); out.push(...p); if (p.length < 1000) break; }
    return out;
  }
  // Vista del portal (controlador de la lista principal) a la que pertenece una tabla: de ella salen el RMD abierto y el modelo
  function vistaDeTabla(t) { let c = t && sap.ui.getCore().byId(t.id.replace(/-listUl$/, '')); while (c && !c.getController) c = c.getParent && c.getParent(); return c || null; }
  async function citasDelRMD(dRaiz) {
    const vista = vistaDeTabla(tablaDe(dRaiz)), asoc = vista && vista.getModel('asociarDatos'), md = asoc && asoc.getData(), modelo = vista && vista.getModel('mainModelv2');
    if (!md || !md.mdId || !modelo) throw new Error('no se pudo identificar el RMD abierto');
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, porMd = [new Filtro('mdId_mdId', 'EQ', md.mdId)], t0 = Date.now();
    const activo = (x) => x && x.activo !== false;
    const [pasos, etiquetas, pms] = await Promise.all([
      leerTodoDe(modelo, 'MD_ES_PASO', porMd, { $expand: 'pasoId,mdEstructuraId,mdEstructuraId/estructuraId' }),
      leerTodoDe(modelo, 'MD_ES_ETIQUETA', porMd, { $expand: 'etiquetaId' }),
      leerTodoDe(modelo, 'MD_ES_PASO_INSUMO_PASO', porMd, { $expand: 'pasoHijoId' }),
    ]);
    const etq = new Map(etiquetas.filter(activo).map((e) => [e.mdEsEtiquetaId, e]));
    const pmsDe = new Map(); pms.filter(activo).filter((x) => x.pasoHijoId).forEach((x) => { const k = x.pasoId_mdEstructuraPasoId; if (!pmsDe.has(k)) pmsDe.set(k, []); pmsDe.get(k).push(x); });
    const obj = (v) => (v && typeof v === 'object' && !v.__deferred ? v : {});
    const listas = new Map();
    pasos.filter(activo).forEach((p) => {
      const est = obj(p.mdEstructuraId), e = etq.get(p.mdEsEtiquetaId_mdEsEtiquetaId);
      const clave = (p.mdEstructuraId_mdEstructuraId || '') + '|' + (p.mdEsEtiquetaId_mdEsEtiquetaId || '');
      if (!listas.has(clave)) listas.set(clave, { lista: norm(obj(est.estructuraId).descripcion || 'Estructura') + (e ? ' › ' + norm(obj(e.etiquetaId).descripcion || 'Etiqueta') : ''),
        o1: +est.orden || 0, o2: e ? +e.orden || 0 : 0, pasos: [] });
      listas.get(clave).pasos.push(p);
    });
    const r = { rmd: md.codigo, listas: [], citas: [], pasos: 0, pms: 0 };
    const citasDe = (lugar, desc) => { const rx = new RegExp(PATRON_REFERENCIA_JS.source, 'g'); let m; while ((m = rx.exec(desc || ''))) r.citas.push({ ...lugar, codigo: m[0] }); };
    [...listas.values()].sort((a, b) => a.o1 - b.o1 || a.o2 - b.o2 || a.lista.localeCompare(b.lista)).forEach((l) => {
      const info = { lista: l.lista, pasos: l.pasos.length, pms: 0, citas: 0 }, c0 = r.citas.length;
      l.pasos.sort((a, b) => (+a.orden || 0) - (+b.orden || 0)).forEach((p, k) => {
        const pp = obj(p.pasoId), lugar = { lista: l.lista, paso: String(p.orden != null ? p.orden : k + 1), codigoPaso: String(pp.codigo || ''), descPaso: norm(pp.descripcion), pm: '', codigoPM: '', descPM: '' };
        citasDe(lugar, lugar.descPaso);
        (pmsDe.get(p.mdEstructuraPasoId) || []).sort((a, b) => (+a.orden || 0) - (+b.orden || 0)).forEach((q) => {
          const h = obj(q.pasoHijoId); info.pms++; r.pms++;
          citasDe({ ...lugar, pm: String(q.orden != null ? q.orden : ''), codigoPM: String(h.codigo || ''), descPM: norm(h.descripcion) }, norm(h.descripcion));
        });
      });
      info.citas = r.citas.length - c0; r.pasos += info.pasos; r.listas.push(info);
    });
    r.segundos = Math.max(1, Math.round((Date.now() - t0) / 1000));
    return r;
  }
  function agruparCitas(citas) {
    const m = new Map();
    citas.forEach((c) => { let x = m.get(c.codigo); if (!x) { x = { codigo: c.codigo, tipo: c.codigo[0], citas: 0, lugares: [] }; m.set(c.codigo, x); } x.citas++; x.lugares.push(c); });
    return [...m.values()].sort((a, b) => (a.codigo < b.codigo ? -1 : 1));
  }
  const lugarTexto = (x) => `${x.lista} › paso ${x.paso}${x.pm ? ' › proceso menor ' + x.pm : ''}`;
  function pintarCitas(v, dRaiz, r) {
    const docs = agruparCitas(r.citas); window.__rmdStats.ultimasCitas = r;
    v.fondo.querySelector('h3').textContent = `Documentos citados — ${cabecera(dRaiz)}`;
    const filasDocs = docs.map((x) => `<tr><td class="rmd-nowrap">${esc(x.codigo)}</td><td>${esc(TIPOS_DOC[x.tipo] || x.tipo)}</td><td>${x.citas}</td><td class="rmd-nota">${esc(x.lugares.slice(0, 3).map(lugarTexto).join('; '))}${x.lugares.length > 3 ? '…' : ''}</td></tr>`).join('');
    v.cuerpo.innerHTML = `<p><b>${docs.length}</b> documentos citados (${r.citas.length} citas) en ${r.pasos} pasos y ${r.pms} procesos menores de ${r.listas.length} listas · ${r.segundos} s.</p>
      ${docs.length ? `<table class="rmd-tabla"><thead><tr><th>Código</th><th>Tipo</th><th>Citas</th><th>Dónde</th></tr></thead><tbody>${filasDocs}</tbody></table>`
        : '<p>No se encontró ningún código con el formato &lt;I/P/F&gt;Área-sufijo (ej. IPRO-P123) en las descripciones de los pasos ni de los procesos menores.</p>'}`;
    v.pie.innerHTML = '';
    const bX = botonModal('Descargar Excel', '', async () => {
      bX.disabled = true;
      try { const { libro, rmd } = armarCitasExcel(dRaiz, r); descargarArchivo(`Documentos_citados_${rmd}.xlsx`, await libro.generar(), TIPO_XLSX); }
      catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); } finally { bX.disabled = false; }
    });
    v.pie.append(bX, botonModal('Cerrar', 'primario', () => v.cerrar()));
  }
  function armarCitasExcel(dRaiz, r) {
    const rmd = r.rmd || (/\d{6,}/.exec(cabecera(dRaiz)) || ['rmd'])[0], hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), docs = agruparCitas(r.citas);
    const libro = Xlsx.crearLibro();
    const hR = libro.hoja('Resumen', { activa: true, cols: [[1, 1, 52], [2, 4, 16]] });
    hR.poner('A1', 'Documentos citados en el RMD', 'titulo');
    hR.poner('A2', cabecera(dRaiz), 'negrita');
    hR.poner('A3', `Generado el ${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())} · ${docs.length} documentos, ${r.citas.length} citas en ${r.pasos} pasos y ${r.pms} procesos menores`, 'nota');
    ['Lista', 'Pasos', 'Procesos menores', 'Citas de documentos'].forEach((t, c) => hR.poner({ c, r: 4 }, t, 'encabezado'));
    r.listas.forEach((l, i) => [l.lista, l.pasos, l.pms, l.citas].forEach((x, c) => hR.poner({ c, r: 5 + i }, x, c ? 'entero' : 'celda')));
    const fT = 5 + r.listas.length;
    hR.poner({ c: 0, r: fT }, 'Total', 'encabezado');
    [r.pasos, r.pms, r.citas.length].forEach((x, k) => hR.poner({ c: 1 + k, r: fT }, x, 'encabezado', r.listas.length ? `SUM(${Xlsx.letra(1 + k)}6:${Xlsx.letra(1 + k)}${fT})` : null));
    const tabla = (nombre, cab, anchos, filas, estilos) => {
      const h = libro.hoja(nombre, { congelar: 'A2', filtro: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, filas.length + 1)}`, cols: anchos.map((w, i) => [i + 1, i + 1, w]) });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'encabezado'));
      filas.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'celda'); }));
    };
    const num = (t) => (/^\d+$/.test(t || '') ? +t : t);
    tabla('Documentos citados', ['Código', 'Tipo', 'Citas', 'Dónde aparece'], [14, 15, 8, 110],
      docs.map((x) => [x.codigo, TIPOS_DOC[x.tipo] || x.tipo, x.citas, x.lugares.map(lugarTexto).join('\n').slice(0, 32000)]), { 3: 'envuelto' });
    tabla('Citas', ['Código', 'Tipo', 'Lista', 'Paso', 'Proceso menor', 'Descripción donde aparece'], [14, 15, 40, 7, 9, 90],
      r.citas.map((x) => [x.codigo, TIPOS_DOC[x.codigo[0]] || x.codigo[0], x.lista, num(x.paso), num(x.pm), x.pm ? x.descPM : x.descPaso]), { 5: 'envuelto' });
    return { libro, rmd };
  }
  async function mostrarDocumentosCitados(dRaiz, boton) {
    if (window.__rmdBuscandoDocs) return; window.__rmdBuscandoDocs = true; boton.disabled = true;
    const v = ventana('Documentos citados', {});
    v.cuerpo.innerHTML = '<p class="rmd-progreso">Leyendo los pasos y procesos menores de todo el RMD…</p>';
    try { pintarCitas(v, dRaiz, await citasDelRMD(dRaiz)); }
    catch (e) {
      v.cuerpo.innerHTML = `<p class="rmd-progreso error">No se pudieron leer los documentos citados: ${esc(e.message)}</p>`;
      v.pie.innerHTML = ''; v.pie.appendChild(botonModal('Cerrar', 'primario', () => v.cerrar()));
    } finally { boton.disabled = false; window.__rmdBuscandoDocs = false; }
  }
  function gestionarDocumentosCitados() {
    if (!on('documentos')) { document.querySelectorAll('.rmd-documentos-citados').forEach((e) => e.remove()); return; }
    const dRaiz = dialogos()[0]; if (!dRaiz || !/^\d{6,}\s*-/.test(cabecera(dRaiz))) return;
    const hdr = dRaiz.querySelector('.sapMListHdr'); if (!hdr || hdr.querySelector('.rmd-documentos-citados')) return;
    const b = botonIcono(ICONO_DOCUMENTOS, 'Documentos citados', 'rmd-documentos-citados', () => mostrarDocumentosCitados(dRaiz, b));
    b.title = 'Documentos (instructivos, procedimientos y formatos) citados en todos los pasos y procesos menores del RMD, con dónde aparece cada uno y descarga a Excel. Se lee en segundos.';
    const ref = hdr.querySelector('.sapMTBSpacer') || hdr.firstElementChild;
    if (ref) ref.insertAdjacentElement('afterend', b); else hdr.appendChild(b);
  }
  // diagnóstico: las citas del RMD abierto sin ventana, y su Excel en base64 (sin descargarlo)
  window.__rmdStats.citasRMD = () => citasDelRMD(dialogos()[0]);
  window.__rmdStats.excelCitas = async (r) => aBase64(await armarCitasExcel(dialogos()[0], r).libro.generar());

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
  // si se hubiera subido el Excel. v1.19: el envío lleva también el usuario con el que se inició sesión en el portal
  // (nombre y correo, del propio launchpad), y Status RMD registra la sincronización con él: un solo clic, sin DNI.
  const URL_STATUS_RMD = 'https://status-rmd.vercel.app/';
  const ORIGEN_STATUS_RMD = 'https://status-rmd.vercel.app';
  // Las dos últimas columnas (v1.18) traen Fecha Registro / Solicitud CON hora (ISO en UTC; Status RMD la pasa a hora
  // local): con solo el día, dos RMD registrados el mismo día no se podrían ordenar. Van aparte, al final, para que una
  // versión de Status RMD que aún no las conozca siga recibiendo las fechas de siempre (solo el día).
  const COLUMNAS_PUENTE = ['codigo', 'codigoSolicitud', 'version', 'estado', 'codDefecto', 'codAgrupador', 'descripcion', 'etapa', 'fechaRegistro',
    'usuarioRegistro', 'fechaAut', 'usuarioAutorizacion', 'af', 'fechaSolicitud', 'planta', 'seccion', 'motivo', 'observacion', 'linaje', 'recetas',
    'fechaRegistroHora', 'fechaSolicitudHora'];
  function filaPuente(md) {
    const f = datosBaseDeMD(md);
    const recetas = ((md.aReceta && md.aReceta.results) || []).map((r) => { const rc = r.recetaId || {}; return [rc.Matnr || '', rc.Verid || '', rc.Atwrt || '', (rc.Text1 || '').trim(), rc.Mdv01 || '', rc.Plnnr || '', rc.Alnal || '']; });
    const fechaHoraIso = (x) => (x instanceof Date && !isNaN(x) ? x.toISOString() : '');
    const v = { ...f, recetas, fechaRegistro: fechaIso(f.fechaRegistro), fechaSolicitud: fechaIso(f.fechaSolicitud),
      fechaRegistroHora: fechaHoraIso(f.fechaRegistro), fechaSolicitudHora: fechaHoraIso(f.fechaSolicitud) };
    return COLUMNAS_PUENTE.map((c) => v[c]);
  }
  // Usuario con el que se inició sesión en el portal: lo da el propio launchpad (sap.ushell.Container.getUser()), en este
  // frame o en el de arriba (mismo origen). Solo nombre, correo e identificador: nunca se lee ninguna contraseña.
  function usuarioSapActual() {
    for (const w of [window, window.parent, window.top]) {
      try {
        const C = w && w.sap && w.sap.ushell && w.sap.ushell.Container, u = C && C.getUser && C.getUser();
        if (!u) continue;
        const id = String((u.getId && u.getId()) || ''), nombre = String((u.getFullName && u.getFullName()) || ''), email = String((u.getEmail && u.getEmail()) || '');
        if (id || email) return { id, nombre, email };
      } catch (e) { /* frame de otro origen o launchpad aún cargando */ }
    }
    return null;
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
      const usuarioSap = usuarioSapActual();
      const payload = { type: 'RMD_SAP_MAESTRO', v: 1, generado: new Date().toISOString(), columnas: COLUMNAS_PUENTE, filas: datos.map(filaPuente), usuarioSap };
      setTxt(span, 'Esperando a Status RMD…');
      await hasta(() => listo || win.closed, 60000, 250);
      if (win.closed) throw new Error('se cerró la pestaña de Status RMD antes de enviarle los datos');
      if (!listo) throw new Error('Status RMD no respondió: ¿cargó la página y ya tiene la versión con enlace a SAP?');
      win.postMessage(payload, ORIGEN_STATUS_RMD);
      // Con el usuario de SAP no hay nada que confirmar allá; sin él (launchpad sin usuario), Status RMD pide el DNI.
      setTxt(span, usuarioSap ? 'Procesando en Status RMD…' : 'Confirma tu DNI en Status RMD…');
      await hasta(() => respuesta || win.closed, 300000, 300);
      if (!respuesta) throw new Error(usuarioSap ? 'no llegó la confirmación de Status RMD (¿se cerró la pestaña?)' : 'no llegó la confirmación de Status RMD (¿se canceló el DNI o se cerró la pestaña?)');
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
      s.title = 'Lee aquí el maestro completo de RMD con sus recetas y se lo pasa directo a Status RMD (status-rmd.vercel.app) en otra pestaña, sin descargar ni subir archivos. Allí queda registrado con tu usuario de SAP (sin DNI).';
      colocarEnBarra(barra, s);
    }
  }

  // ---- "Indicadores" (junto al icono nativo "Exportar"): lee aquí el maestro completo (la misma lectura de "Enviar a Status
  // RMD") y arma "BD RMD <MES> <AÑO> - P1-P2.xlsx" con el bloque INDICADORES de arriba: las mismas hojas y tablas dinámicas del
  // archivo que el equipo prepara a mano cada mes. Si se elige el archivo del mes anterior, trae sus listas PEND PL1 / PEND PL2
  // y los "No contar" ya marcados. No envía nada a ningún lado: el archivo se arma en el navegador y se descarga.
  const ICONO_INDICADORES = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 14.5h12"/><path d="M4 12V8.5M7 12V5M10 12V7M13 12V3"/></svg>';
  // Filas para el libro, iguales a las del "Exportar" nativo: su "Fecha Autorización" es el texto de la fecha LOCAL
  // (formatDateExcel del portal), mientras Fecha Registro y Fecha Solicitud van como fecha con hora UTC (sap.ui.export).
  // (Los Cancelados, que el Exportar tampoco trae, los quita el propio bloque INDICADORES.)
  const fechaLocalTexto = (f) => (f instanceof Date && !isNaN(f) ? `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}` : '');
  const filaIndicadores = (md) => ({ ...datosBaseDeMD(md), fechaAut: fechaLocalTexto(md.fechaAutorizacion) });
  // Mes por defecto: el anterior durante la primera quincena (se cierra el mes que acaba de terminar); si no, el actual.
  function mesPorDefecto(hoy = new Date()) { const d = new Date(hoy.getFullYear(), hoy.getMonth() - (hoy.getDate() <= 15 ? 1 : 0), 1); return { mes: d.getMonth() + 1, anio: d.getFullYear() }; }
  function abrirIndicadores() {
    if (window.__rmdIndicadores) return;
    let trabajando = false;
    const v = ventana('Indicadores del mes', { cancelar: () => { if (!trabajando) v.cerrar(); } });
    const def = mesPorDefecto(), hoy = new Date(), meses = [];
    for (let k = 0; k < 14; k++) { const d = new Date(hoy.getFullYear(), hoy.getMonth() - k, 1); meses.push({ mes: d.getMonth() + 1, anio: d.getFullYear() }); }
    v.cuerpo.innerHTML = `<p>Arma <b class="rmd-ind-nombre"></b> con las mismas hojas del archivo que el equipo prepara cada mes: la hoja de datos con sus columnas calculadas, PEND PL1, PEND PL2, RESUMEN con las 7 tablas dinámicas y Hoja1.</p>
      <div class="rmd-ind-form">
        <label>Mes<select class="rmd-ind-mes">${meses.map((m) => `<option value="${m.anio}-${m.mes}"${m.mes === def.mes && m.anio === def.anio ? ' selected' : ''}>${Indicadores.MESES[m.mes - 1]} ${m.anio}</option>`).join('')}</select></label>
        <label>Archivo del mes anterior (opcional)<input type="file" class="rmd-ind-previo" accept=".xlsx"></label>
      </div>
      <p class="rmd-nota">Del archivo anterior se traen las listas PEND PL1 / PEND PL2 y los "No contar" ya marcados. El A/F se asigna con la misma regla del equipo; los "No contar" sugeridos quedan en amarillo claro, con el motivo en "Por revisar". Genéralo al cierre del mes: los estados son los que tiene SAP en este momento.</p>
      <p class="rmd-progreso"></p><div class="rmd-ind-resultado"></div>`;
    const sel = v.cuerpo.querySelector('.rmd-ind-mes'), prog = v.cuerpo.querySelector('.rmd-progreso'), res = v.cuerpo.querySelector('.rmd-ind-resultado');
    const elegido = () => { const [anio, mes] = sel.value.split('-').map(Number); return { mes, anio }; };
    const pintarNombre = () => { const { mes, anio } = elegido(); setTxt(v.cuerpo.querySelector('.rmd-ind-nombre'), Indicadores.nombreArchivo(mes, anio)); };
    sel.addEventListener('change', pintarNombre); pintarNombre();
    const avance = (t, error) => { setTxt(prog, t); prog.classList.toggle('error', !!error); };
    const bGen = botonModal('Generar Excel', 'primario', async () => {
      if (window.__rmdIndicadores) return;
      window.__rmdIndicadores = true; trabajando = true; bGen.disabled = true; res.innerHTML = '';
      try {
        const { mes, anio } = elegido(), archivo = v.cuerpo.querySelector('.rmd-ind-previo').files[0];
        let previo = null;
        if (archivo) {
          avance(`Leyendo "${archivo.name}"…`);
          try { previo = await Indicadores.leerPrevio(new Uint8Array(await archivo.arrayBuffer())); } catch (e) { throw new Error(`no se pudo leer "${archivo.name}": ${e.message}`); }
        }
        const modelo = modeloListaPrincipal(); if (!modelo) throw new Error('abre la lista "Configuración Manufactura Digital" para poder leer el maestro');
        const datos = await leerMDPaginado(modelo, [], (h, t) => avance(`Leyendo SAP… página ${h} de ${t}`));
        avance(`Armando el libro con ${datos.length} RMD…`); await esperar(40);
        const { libro, nombre, resumen: x } = Indicadores.construir({ filas: datos.map(filaIndicadores), mes, anio, previo, generado: new Date() });
        const u8 = await libro.generar();
        descargarArchivo(nombre, u8, TIPO_XLSX);
        const s = x.sugeridos, nSug = s.anterior + s.observacion + s.formato + s.estado, fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
        avance(`✓ Descargado "${nombre}" (${(u8.length / 1048576).toFixed(1)} MB).`);
        res.innerHTML = `<ul class="rmd-resumen-ind">
          <li><b>${x.sap}</b> RMD leídos de SAP; A/F: <b>${x.mes}</b> del mes y <b>${x.antiguo}</b> ANTIGUO.</li>
          <li>Autorizados del mes: <b>${fmt(x.autorizados)}</b> (${x.autorizadosCuenta} RMD) · Ingresados: <b>${fmt(x.ingresados)}</b> (${x.ingresadosCuenta} RMD) · TOTAL DE RMD: <b>${x.totalRmd}</b>.</li>
          <li>"No contar" sugeridos para revisar: <b>${nSug}</b>${nSug ? ` (${[[s.anterior, 'del mes anterior'], [s.observacion, 'por la Observación'], [s.formato, 'por Observación sin formato'], [s.estado, 'abiertos con fecha de autorización']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(', ')})` : ''}.</li>
          <li>${previo ? `PEND PL1: <b>${x.pl1}</b> · PEND PL2: <b>${x.pl2}</b>${x.posibles ? ` · <b>${x.posibles}</b> quizá ya están en SAP (columna "Posible registro en SAP")` : ''}.` : 'Sin archivo del mes anterior: PEND PL1 y PEND PL2 quedan vacías.'}</li>
          <li>DLAB. (días laborados) se completa a mano en Hoja1; el promedio por día se calcula solo.</li></ul>`;
      } catch (e) { avance('No se pudo generar: ' + e.message, true); }
      finally { window.__rmdIndicadores = false; trabajando = false; bGen.disabled = false; }
    });
    v.pie.append(botonModal('Cerrar', '', () => { if (!trabajando) v.cerrar(); }), bGen);
  }
  // ---- Orden de las estructuras del RMD (ventana raíz "Estructura de RMD") ----
  // barra con el título de la lista ("Estructura de RMD (8)"): va dentro de la propia lista, no en la cabecera de la ventana
  const barraDeLista = (tabla) => { const l = tabla.closest('.sapMList'); return l && l.querySelector(':scope > .sapMTB, :scope > .sapMListHdr, .sapMListHdr'); };
  // Hubo RMD autorizados con INSUMOS al final por error. El orden habitual se toma de los últimos autorizados de la misma
  // planta, sección y etapa (si hay menos de 2, de la misma planta y etapa): la posición de cada estructura es la mediana de su
  // posición relativa en esas referencias, y las que rompen la secuencia más larga coherente con ese orden son las que están
  // fuera de lugar. Probado con todo el maestro (septiembre de 2026): ningún Ingresado sale marcado; con INSUMOS al final se
  // marca solo INSUMOS en 252 de 252 casos simulados; en el historial marca 7 autorizados (6 por INSUMOS).
  const N_REFS_ORDEN = 5, refsOrden = new Map();
  async function referenciasDeOrden(modelo, md) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const leer = (ruta, filtros, u) => new Promise((ok, mal) => modelo.read(ruta, { filters: filtros, urlParameters: u, success: ok, error: () => mal(new Error('sin respuesta')) }));
    const buscar = async (filtros) => ((await leer('/MD', [...filtros, new Filtro('fechaAutorizacion', 'NE', null)],
      { $expand: 'estadoIdRmd', $select: 'mdId,codigo,version,estadoIdRmd/contenido', $orderby: 'fechaAutorizacion desc', $top: '60' })).results || [])
      .filter((x) => x.mdId !== md.mdId && x.estadoIdRmd && x.estadoIdRmd.contenido === 'Autorizado').slice(0, N_REFS_ORDEN);
    const base = [new Filtro('sucursalId_iMaestraId', 'EQ', md.sucursalId_iMaestraId), new Filtro('nivelTxt', 'EQ', md.nivelTxt)];
    let refs = md.areaRmdTxt ? await buscar([...base, new Filtro('areaRmdTxt', 'EQ', md.areaRmdTxt)]) : [], alcance = `${md.areaRmdTxt} · ${md.nivelTxt}`;
    if (refs.length < 2) { refs = await buscar(base); alcance = `${md.nivelTxt} (toda la planta)`; }
    if (refs.length < 2) return null;
    const es = (await leer('/MD_ESTRUCTURA', [new Filtro({ filters: refs.map((r) => new Filtro('mdId_mdId', 'EQ', r.mdId)), and: false })],
      { $select: 'mdId_mdId,estructuraId_estructuraId,orden,activo', $top: '1000' })).results || [];
    const secuencias = refs.map((r) => es.filter((x) => x.mdId_mdId === r.mdId && x.activo !== false).sort((a, b) => a.orden - b.orden).map((x) => x.estructuraId_estructuraId)).filter((x) => x.length);
    return secuencias.length >= 2 ? { secuencias, alcance, codigos: refs.map((r) => `${r.codigo} v${r.version}`) } : null;
  }
  // ids: estructuras del RMD en su orden; devuelve las que están fuera de lugar y el orden esperado (de las que tienen referencia)
  function estructurasFueraDeOrden(ids, secuencias) {
    const mediana = (a) => { const x = [...a].sort((p, q) => p - q), m = x.length >> 1; return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2; };
    const pos = new Map();
    ids.forEach((id) => { const ps = secuencias.filter((q) => q.includes(id)).map((q) => q.indexOf(id) / Math.max(1, q.length - 1)); if (ps.length) pos.set(id, mediana(ps)); });
    const c = ids.filter((id) => pos.has(id)), n = c.length, largo = new Array(n).fill(1), previo = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (pos.get(c[j]) <= pos.get(c[i]) && largo[j] + 1 > largo[i]) { largo[i] = largo[j] + 1; previo[i] = j; }
    const quedan = new Set(); for (let i = n ? largo.indexOf(Math.max(...largo)) : -1; i >= 0; i = previo[i]) quedan.add(i);
    const esperado = c.map((id, i) => ({ id, p: pos.get(id), i })).sort((a, b) => a.p - b.p || a.i - b.i).map((x) => x.id);
    return { fuera: [...new Set(c.filter((_, i) => !quedan.has(i)))], esperado };
  }
  window.__rmdStats.estructurasFueraDeOrden = estructurasFueraDeOrden;   // (pruebas)
  async function revisarOrdenEstructuras(d, tabla) {
    const quitar = () => {
      tabla.querySelectorAll('td.rmd-orden-mal').forEach((td) => { td.classList.remove('rmd-orden-mal'); td.removeAttribute('title'); });
      d.querySelectorAll('.rmd-orden-aviso').forEach((x) => x.remove());
    };
    if (!on('ordenest') || typeof sap === 'undefined') { quitar(); return; }
    const lista = sap.ui.getCore().byId(tabla.id.replace(/-listUl$/, '')); let vista = lista;
    while (vista && !vista.getController) vista = vista.getParent && vista.getParent();
    const asoc = vista && vista.getModel('asociarDatos'), md = asoc && asoc.getData(), modelo = vista && vista.getModel('mainModelv2');
    const filas = filasPrincipales(tabla).map((tr) => ({ tr, o: objetoDeFila(tr) })).filter((x) => x.o && x.o.estructuraId_estructuraId).sort((a, b) => a.o.orden - b.o.orden);
    if (!md || !md.mdId || !modelo || filas.length < 3) { quitar(); return; }
    const clave = [md.sucursalId_iMaestraId, md.areaRmdTxt, md.nivelTxt].join('|'), guardada = refsOrden.get(clave);
    if (!guardada || Date.now() - guardada.t > 30 * 60000) refsOrden.set(clave, { t: Date.now(), p: referenciasDeOrden(modelo, md).catch(() => null) });
    const ref = await refsOrden.get(clave).p;
    if (!ref || !tabla.isConnected) { quitar(); return; }
    const ids = filas.map((x) => x.o.estructuraId_estructuraId), { fuera, esperado } = estructurasFueraDeOrden(ids, ref.secuencias);
    const nombre = (id) => norm((filas.find((x) => x.o.estructuraId_estructuraId === id) || { o: {} }).o.descripcion_est || '');
    const avisos = fuera.map((id) => {
      const k = esperado.indexOf(id), ant = esperado.slice(0, k).reverse().find((x) => !fuera.includes(x)), sig = esperado.slice(k + 1).find((x) => !fuera.includes(x));
      const donde = [ant && `después de ${nombre(ant)}`, sig && `antes de ${nombre(sig)}`].filter(Boolean).join(' y ');
      return { id, texto: `${nombre(id)} está en el lugar ${ids.indexOf(id) + 1}; en los últimos autorizados va ${donde || 'en otro lugar'} (lugar ${k + 1})` };
    });
    window.__rmdStats.ordenEstructuras = { rmd: md.codigo, alcance: ref.alcance, referencias: ref.codigos, fuera: avisos.map((a) => a.texto) };
    const iOrden = columnas(tabla).indexOf('ORDEN');
    filas.forEach(({ tr, o }) => {
      const td = celda(tr, Math.max(0, iOrden)), a = avisos.find((x) => x.id === o.estructuraId_estructuraId); if (!td) return;
      if (a) { td.classList.add('rmd-orden-mal'); const t = `Orden de estructuras: ${a.texto} (${ref.alcance}: ${ref.codigos.join(', ')}).`; if (td.title !== t) td.title = t; }
      else if (td.classList.contains('rmd-orden-mal')) { td.classList.remove('rmd-orden-mal'); td.removeAttribute('title'); }
    });
    let aviso = d.querySelector('.rmd-orden-aviso');
    if (!avisos.length) { if (aviso) aviso.remove(); return; }
    const html = `⚠ <b>Orden de las estructuras</b>: ${avisos.map((a) => esc(a.texto)).join('; ')}. Referencia: últimos autorizados de ${esc(ref.alcance)} (${esc(ref.codigos.join(', '))}).`;
    if (!aviso) {
      aviso = document.createElement('div'); aviso.className = 'rmd-orden-aviso';
      const barra = barraDeLista(tabla); if (barra) barra.insertAdjacentElement('afterend', aviso); else tabla.insertAdjacentElement('beforebegin', aviso);
    }
    if (aviso.dataset.html !== html) { aviso.dataset.html = html; aviso.innerHTML = html; }   // (reescribirlo sin cambios dispararía otro ajuste)
  }

  // ---- Equipos por master (v1.22): todos los master con sus EQUIPOS / INSTRUMENTOS / MATERIALES en un Excel ----
  // Se lee con el modelo del portal (las mismas entidades que usa al abrir esa estructura: MD_ES_EQUIPO y MD_ES_UTENSILIO) en
  // páginas de 1000, 6 a la vez. Una fila por master y equipo, con los datos del equipo a la izquierda para filtrar por él.
  const ICONO_EQUIPOS = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.2h12M6.5 6.2v7.3"/></svg>';
  async function leerEntidadCompleta(modelo, entidad, params, clave, avisar) {
    const leer = (ruta, u) => new Promise((ok, mal) => modelo.read(ruta, { urlParameters: u, success: ok, error: (e) => mal(new Error(`el servidor no respondió al leer ${entidad} (${(e && e.statusCode) || 'sin código'})`)) }));
    const POR = 1000, total = Number(await leer(`/${entidad}/$count`, {})) || 0, paginas = Math.max(1, Math.ceil(total / POR)), out = new Array(paginas);
    const pagina = async (i) => ((await leer(`/${entidad}`, { ...params, $orderby: clave, $top: String(POR), $skip: String(i * POR) })).results || []);
    let sig = 0, hechas = 0;
    const trabajador = async () => { while (sig < paginas) { const i = sig++; out[i] = await pagina(i); hechas++; if (avisar) avisar(hechas, paginas); } };
    await Promise.all(Array.from({ length: Math.min(6, paginas) }, trabajador));
    for (let i = paginas; out[i - 1] && out[i - 1].length === POR; i++) out.push(await pagina(i));
    const vistos = new Set(); return out.flat().filter((x) => x && !vistos.has(x[clave]) && vistos.add(x[clave]));
  }
  const diaLocal = (f) => (f instanceof Date && !isNaN(f) ? new Date(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate())) : null);
  function equiposDeFilas(eqs, uts) {
    const out = [];
    eqs.forEach((x) => { const e = x.equipoId || {}; out.push({ mdId: x.mdId_mdId, orden: x.orden, tipo: (e.tipoId && e.tipoId.contenido) || 'EQUIPO', codigo: norm(e.CodigoGaci || e.equnr || ''), desc: norm(e.denom || e.eqktx || ''), sap: norm(e.equnr || ''), ubic: norm(e.pltxt || '') }); });
    uts.forEach((x) => {
      const u = x.utensilioId, g = x.agrupadorId;
      if (u) out.push({ mdId: x.mdId_mdId, orden: x.orden, tipo: (u.tipoId && u.tipoId.contenido) || 'UTENSILIO', codigo: norm(u.codigo || x.utensilioId_utensilioId || ''), desc: norm(u.descripcion || ''), sap: '', ubic: '' });
      else if (g) { const desc = norm(g.descripcion || ''), m = /\s-\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\s*$/.exec(desc); out.push({ mdId: x.mdId_mdId, orden: x.orden, tipo: 'AGRUPADOR', codigo: m ? m[1] : '', desc, sap: '', ubic: '' }); }
    });
    return out;
  }
  function armarEquiposExcel(masters, items, estados) {
    const hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), libro = Xlsx.crearLibro();
    const porMd = new Map(masters.map((m) => [m.mdId, m])), filas = items.filter((x) => porMd.has(x.mdId)).map((x) => ({ ...x, md: porMd.get(x.mdId) }));
    const nat = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
    filas.sort((a, b) => nat(a.codigo || '~' + a.desc, b.codigo || '~' + b.desc) || nat(a.md.codigo, b.md.codigo) || (b.md.version || 0) - (a.md.version || 0) || (a.orden || 0) - (b.orden || 0));
    const tabla = (nombre, nombreTabla, cab, anchos, datos, estilos = {}, op = {}) => {
      const h = libro.hoja(nombre, { activa: !!op.activa, congelar: op.congelar || 'A2', cols: anchos.map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: nombreTabla, ref: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, datos.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      datos.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'normal'); }));
      return h;
    };
    const datosMd = (m) => [m.codigo, m.version, m.descripcion, m.codDefecto, m.estado, m.seccion, m.etapa, m.planta, m.fechaAut];
    tabla('Equipos por master', 'EquiposPorMaster',
      ['Código equipo', 'Equipo / instrumento / material', 'Tipo', 'N.º SAP', 'Ubicación técnica', 'Código RMD', 'Versión', 'Descripción del master', 'Código por defecto', 'Estado', 'Área (sección)', 'Etapa', 'Planta', 'Fecha autorización', 'Orden en el RMD'],
      [18, 52, 13, 12, 20, 13, 9, 46, 17, 13, 26, 16, 14, 16, 10], filas.map((x) => [x.codigo, x.desc, x.tipo, x.sap, x.ubic, ...datosMd(x.md), x.orden]), { 13: 'fechaDia' }, { activa: true, congelar: 'C2' });
    const resumen = new Map();
    filas.forEach((x) => {
      const k = (x.codigo || '') + '|' + x.desc + '|' + x.tipo; let r = resumen.get(k);
      if (!r) resumen.set(k, r = { codigo: x.codigo, desc: x.desc, tipo: x.tipo, masters: new Set(), aut: new Set(), ing: new Set(), etapas: new Set(), secciones: new Set() });
      r.masters.add(x.mdId); if (x.md.estado === 'Autorizado') r.aut.add(x.mdId); if (x.md.estado === 'Ingresado') r.ing.add(x.mdId);
      if (x.md.etapa) r.etapas.add(x.md.etapa); if (x.md.seccion) r.secciones.add(x.md.seccion);
    });
    const res = [...resumen.values()].sort((a, b) => b.masters.size - a.masters.size || nat(a.codigo, b.codigo));
    tabla('Resumen por equipo', 'ResumenPorEquipo', ['Código equipo', 'Equipo / instrumento / material', 'Tipo', 'Masters', 'Autorizados', 'Ingresados', 'Etapas', 'Áreas (secciones)'],
      [18, 52, 13, 10, 12, 11, 40, 60], res.map((r) => [r.codigo, r.desc, r.tipo, r.masters.size, r.aut.size, r.ing.size, [...r.etapas].sort().join(', '), [...r.secciones].sort().join(', ')]), { 6: 'envuelto', 7: 'envuelto' });
    const cuenta = new Map(); filas.forEach((x) => { const c = cuenta.get(x.mdId) || { eq: 0, ut: 0 }; if (x.tipo === 'EQUIPO') c.eq++; else c.ut++; cuenta.set(x.mdId, c); });
    const ms = [...masters].sort((a, b) => nat(a.codigo, b.codigo) || (b.version || 0) - (a.version || 0));
    tabla('Masters', 'Masters', ['Código RMD', 'Versión', 'Descripción del master', 'Código por defecto', 'Estado', 'Área (sección)', 'Etapa', 'Planta', 'Fecha autorización', 'Equipos', 'Utensilios y agrupadores', 'Total'],
      [13, 9, 46, 17, 13, 26, 16, 14, 16, 10, 14, 9], ms.map((m) => { const c = cuenta.get(m.mdId) || { eq: 0, ut: 0 }; return [...datosMd(m), c.eq, c.ut, c.eq + c.ut]; }), { 8: 'fechaDia' });
    const hI = libro.hoja('Información', { cols: [[1, 1, 30], [2, 2, 90]] });
    hI.poner('A1', 'Equipos, instrumentos y materiales por master', 'titulo');
    [['Generado', `${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())} (leído de SAP)`],
      ['Estados incluidos', estados.join(', ')], ['Masters', masters.length], ['Filas (master × equipo)', filas.length], ['Equipos distintos', res.length],
      ['Masters sin equipos', ms.filter((m) => !cuenta.has(m.mdId)).length],
      ['Cómo filtrar', 'Hoja "Equipos por master": filtra la columna "Código equipo" o "Equipo / instrumento / material" para ver en qué master está; "Resumen por equipo" cuenta los master de cada uno.'],
      ['Tipos', 'EQUIPO (código GACI y N.º SAP), UTENSILIO y AGRUPADOR (grupo de utensilios: el código sale del final de su descripción cuando lo trae).']]
      .forEach(([a, b], i) => { hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return { libro, nombre: `Equipos por master RMD ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.xlsx`, filas: filas.length, equipos: res.length };
  }
  const SELECT_MD_EQ = 'mdId,codigo,version,descripcion,codDefectoReceta,nivelTxt,areaRmdTxt,fechaAutorizacion,estadoIdRmd/contenido,sucursalId/contenido';
  const mdParaEquipos = (m) => ({ mdId: m.mdId, codigo: m.codigo || '', version: m.version, descripcion: m.descripcion || '', codDefecto: m.codDefectoReceta || '', estado: (m.estadoIdRmd && m.estadoIdRmd.contenido) || '',
    seccion: m.areaRmdTxt || '', etapa: m.nivelTxt || '', planta: (m.sucursalId && m.sucursalId.contenido) || '', fechaAut: diaLocal(m.fechaAutorizacion) });
  async function leerEquiposDeTodos(modelo, avisar) {
    const avance = { eq: [0, 1], ut: [0, 1] }, pintar = () => avisar && avisar(avance.eq[0] + avance.ut[0], avance.eq[1] + avance.ut[1]);
    const [eqs, uts] = await Promise.all([
      leerEntidadCompleta(modelo, 'MD_ES_EQUIPO', { $expand: 'equipoId,equipoId/tipoId', $select: 'mdEstructuraEquipoId,mdId_mdId,orden,equipoId/CodigoGaci,equipoId/eqktx,equipoId/denom,equipoId/equnr,equipoId/pltxt,equipoId/tipoId/contenido' }, 'mdEstructuraEquipoId', (h, t) => { avance.eq = [h, t]; pintar(); }),
      leerEntidadCompleta(modelo, 'MD_ES_UTENSILIO', { $expand: 'utensilioId,utensilioId/tipoId,agrupadorId', $select: 'mdEstructuraUtensilioId,mdId_mdId,orden,utensilioId_utensilioId,utensilioId/codigo,utensilioId/descripcion,utensilioId/tipoId/contenido,agrupadorId/descripcion' }, 'mdEstructuraUtensilioId', (h, t) => { avance.ut = [h, t]; pintar(); }),
    ]);
    return equiposDeFilas(eqs, uts);
  }
  const ESTADOS_SIN_MARCAR = ['Suspendido', 'Cancelado'];
  async function abrirEquiposPorMaster() {
    if (window.__rmdEquipos) return;
    const modelo = modeloListaPrincipal(); if (!modelo) { toast('Abre la lista "Configuración Manufactura Digital" para exportar.', true); return; }
    let trabajando = true; window.__rmdEquipos = true;
    const v = ventana('Equipos por master', { cancelar: () => { if (!trabajando) v.cerrar(); } });
    v.cuerpo.innerHTML = `<p>Exporta a Excel cada master con sus <b>EQUIPOS / INSTRUMENTOS / MATERIALES</b> (equipos, utensilios y agrupadores): una fila por master y equipo, con el equipo a la izquierda para filtrarlo, más un resumen por equipo. No cambia nada en SAP.</p>
      <div class="rmd-eq-estados"></div><p class="rmd-progreso">Leyendo los master de SAP…</p><div class="rmd-ind-resultado"></div>`;
    const prog = v.cuerpo.querySelector('.rmd-progreso'), caja = v.cuerpo.querySelector('.rmd-eq-estados'), res = v.cuerpo.querySelector('.rmd-ind-resultado');
    const avance = (t, error) => { setTxt(prog, t); prog.classList.toggle('error', !!error); };
    const bGen = botonModal('Exportar Excel', 'primario', () => {}); bGen.disabled = true;
    v.pie.append(botonModal('Cerrar', '', () => { if (!trabajando) v.cerrar(); }), bGen);
    let masters = [];
    try {
      masters = (await leerEntidadCompleta(modelo, 'MD', { $expand: 'estadoIdRmd,sucursalId', $select: SELECT_MD_EQ }, 'mdId', (h, t) => avance(`Leyendo los master de SAP… página ${h} de ${t}`))).map(mdParaEquipos);
      const n = new Map(); masters.forEach((m) => n.set(m.estado || '(sin estado)', (n.get(m.estado || '(sin estado)') || 0) + 1));
      caja.innerHTML = '<p><b>Estados a incluir</b> (los Suspendidos son versiones anteriores ya reemplazadas):</p>' + [...n.entries()].sort((a, b) => b[1] - a[1])
        .map(([e, k]) => `<label class="rmd-fila"><input type="checkbox" value="${esc(e)}" ${ESTADOS_SIN_MARCAR.includes(e) ? '' : 'checked'}> ${esc(e)} <span class="rmd-nota">(${k.toLocaleString('es-PE')})</span></label>`).join('');
      avance(`${masters.length.toLocaleString('es-PE')} master leídos. Elige los estados y pulsa "Exportar Excel".`); bGen.disabled = false;
    } catch (e) { avance('No se pudieron leer los master: ' + e.message, true); }
    finally { trabajando = false; window.__rmdEquipos = false; }
    bGen.addEventListener('click', async () => {
      if (window.__rmdEquipos) return;
      const estados = [...caja.querySelectorAll('input:checked')].map((x) => x.value); if (!estados.length) { avance('Marca al menos un estado.', true); return; }
      window.__rmdEquipos = true; trabajando = true; bGen.disabled = true; res.innerHTML = '';
      try {
        const t0 = Date.now(), items = await leerEquiposDeTodos(modelo, (h, t) => avance(`Leyendo equipos, instrumentos y materiales… página ${h} de ${t}`));
        const elegidos = masters.filter((m) => estados.includes(m.estado || '(sin estado)'));
        avance(`Armando el Excel con ${elegidos.length.toLocaleString('es-PE')} master…`); await esperar(40);
        const { libro, nombre, filas, equipos } = armarEquiposExcel(elegidos, items, estados), u8 = await libro.generar();
        descargarArchivo(nombre, u8, TIPO_XLSX);
        avance(`✓ Descargado "${nombre}" (${(u8.length / 1048576).toFixed(1)} MB, ${Math.round((Date.now() - t0) / 1000)} s): ${elegidos.length.toLocaleString('es-PE')} master, ${filas.toLocaleString('es-PE')} filas y ${equipos.toLocaleString('es-PE')} equipos distintos.`);
      } catch (e) { avance('No se pudo exportar: ' + e.message, true); }
      finally { window.__rmdEquipos = false; trabajando = false; bGen.disabled = false; }
    });
  }
  // ---- Menú de exportados en el icono nativo "Exportar" (v1.23) ----
  // El icono del portal ya no exporta directo: abre un menú con el exportado original (el mismo Excel del portal, con sus filtros,
  // y la columna "Producción Estado" al final para no mover las demás), Equipos por master e Indicadores del mes.
  const botonExportar = () => [...document.querySelectorAll('button')].find((b) => visible(b) && b.title === 'Exportar');
  const ctlExportar = () => { const b = botonExportar(); return b && sap.ui.getCore().byId(b.id.replace(/-inner$/, '')); };
  // Controlador de la lista principal (el mismo al que responde el botón Exportar)
  function controladorPrincipal() {
    const c = ctlExportar(), reg = c && ((c.mEventRegistry || {}).press || [])[0];
    return reg && reg.oListener && reg.oListener.getView ? reg.oListener : null;
  }
  function gestionarMenuExportar() {
    document.querySelectorAll('.rmd-indicadores, .rmd-equipos-master').forEach((e) => e.remove());   // (botones sueltos de v1.20-1.22)
    const c = ctlExportar(); if (!c) return;
    const b = botonExportar();
    if (!on('exportar')) {
      if (c.__rmdMenu) { const m = c.__rmdMenu; c.detachPress(m.nuestro, m.ctrl); c.attachPress(m.fnOrig, m.ctrl); delete c.__rmdMenu; }
      if (b) b.classList.remove('rmd-exportar-menu'); return;
    }
    if (b && !b.classList.contains('rmd-exportar-menu')) { b.classList.add('rmd-exportar-menu'); b.setAttribute('aria-haspopup', 'menu'); }
    if (c.__rmdMenu) return;
    const reg = ((c.mEventRegistry || {}).press || []).find((r) => !r.fFunction.__rmdMenu); if (!reg) return;
    const fnOrig = reg.fFunction, ctrl = reg.oListener;
    const nuestro = function () { abrirMenuExportar(ctrl, fnOrig); }; nuestro.__rmdMenu = true;
    c.detachPress(fnOrig, ctrl); c.attachPress(nuestro, ctrl); c.__rmdMenu = { fnOrig, ctrl, nuestro };
  }
  function cerrarMenuExportar() { document.querySelectorAll('.rmd-menu').forEach((m) => { if (m.__cerrar) m.__cerrar(); else m.remove(); }); }
  function abrirMenuExportar(ctrl, fnOrig) {
    if (document.querySelector('.rmd-menu')) { cerrarMenuExportar(); return; }
    const b = botonExportar(); if (!b) return;
    const opciones = [
      ['Exportado original', 'El Excel del portal con los filtros aplicados, más la columna "Producción Estado"', () => exportadoOriginal(ctrl, fnOrig)],
      on('equipos') && ['Equipos por master', 'Todos los master con sus equipos, instrumentos y materiales', () => abrirEquiposPorMaster()],
      on('indicadores') && ['Indicadores del mes', 'BD RMD del mes con sus tablas dinámicas', () => abrirIndicadores()],
      on('citastodos') && ['Documentos citados en todos los master', 'Qué master citan cada instructivo, procedimiento o formato (1-2 min)', () => abrirCitasDeTodos()],
    ].filter(Boolean);
    const m = document.createElement('div'); m.className = 'rmd-menu'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Exportar');
    opciones.forEach(([t, sub, fn]) => {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'rmd-menu-item'; x.setAttribute('role', 'menuitem');
      x.innerHTML = `<b>${esc(t)}</b><span>${esc(sub)}</span>`; x.addEventListener('click', () => { cerrarMenuExportar(); fn(); }); m.appendChild(x);
    });
    document.body.appendChild(m);
    const r = b.getBoundingClientRect(), w = m.offsetWidth;
    m.style.top = Math.round(r.bottom + 4) + 'px'; m.style.left = Math.round(Math.max(8, Math.min(r.right - w, innerWidth - w - 8))) + 'px';
    const fuera = (e) => { if (!m.contains(e.target) && !b.contains(e.target)) cerrar(); };
    const teclas = (e) => {
      const items = [...m.querySelectorAll('.rmd-menu-item')], i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); b.focus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); }
    };
    const cerrar = () => { document.removeEventListener('mousedown', fuera, true); document.removeEventListener('keydown', teclas, true); m.remove(); };
    m.__cerrar = cerrar;
    setTimeout(() => { document.addEventListener('mousedown', fuera, true); document.addEventListener('keydown', teclas, true); }, 0);
    const primero = m.querySelector('.rmd-menu-item'); if (primero) primero.focus();
  }
  // Texto de "Producción Estado" por id, como lo muestra la lista (su propio formateador) y, si se puede, de toda la maestra de
  // esos estados (así también salen los que no aparecen en la lista cargada).
  let mapaProduccion = null;
  async function mapaProduccionEstado(ctrl) {
    if (mapaProduccion) return mapaProduccion;
    const vista = ctrl.getView(), lista = vista.byId('idTblConfigurationRmd'), mapa = {}, tipos = new Set();
    const it = lista && lista.getItems()[0], os = it && it.getCells().find((x) => x.getMetadata().getName() === 'sap.m.ObjectStatus');
    const bi = os && os.getBindingInfo('text'), fmt = bi && bi.formatter;
    const texto = (id, contenido) => { try { const t = fmt ? fmt.call(os, id) : ''; if (t) return String(t); } catch (e) { /* sin formateador */ } return String(contenido || '').toUpperCase(); };
    const filas = [].concat((vista.getModel('listMD') && vista.getModel('listMD').getData()) || [], (ctrl.localModel && ctrl.localModel.getProperty('/listMDTemp')) || []);
    filas.forEach((md) => { const p = md && md.estadoIdProceso; if (p && p.iMaestraId != null) { mapa[p.iMaestraId] = texto(p.iMaestraId, p.contenido); if (p.oMaestraTipo_maestraTipoId != null) tipos.add(p.oMaestraTipo_maestraTipoId); } });
    try {
      const modelo = vista.getModel('mainModelv2'), meta = modelo.getServiceMetadata(); let tipoNom = null, conjunto = null;
      meta.dataServices.schema.forEach((s) => (s.entityType || []).forEach((et) => { const ps = (et.property || []).map((q) => q.name); if (ps.includes('iMaestraId') && ps.includes('oMaestraTipo_maestraTipoId')) tipoNom = s.namespace + '.' + et.name; }));
      meta.dataServices.schema.forEach((s) => (s.entityContainer || []).forEach((c) => (c.entitySet || []).forEach((es) => { if (es.entityType === tipoNom) conjunto = es.name; })));
      if (conjunto && tipos.size) {
        const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
        (await leerTodoDe(modelo, conjunto, [new Filtro({ filters: [...tipos].map((t) => new Filtro('oMaestraTipo_maestraTipoId', 'EQ', t)), and: false })], {}))
          .forEach((x) => { if (!(x.iMaestraId in mapa)) mapa[x.iMaestraId] = texto(x.iMaestraId, x.contenido); });
      }
    } catch (e) { /* basta con los de la lista */ }
    return (mapaProduccion = mapa);
  }
  async function exportadoOriginal(ctrl, fnOrig) {
    let mapa = {}; try { mapa = await mapaProduccionEstado(ctrl); } catch (e) { /* la columna sale con el código */ }
    const lib = sap.ui.require('sap/ui/export/library'), EdmType = (lib && lib.EdmType) || {};
    const col = { label: 'Producción Estado', property: 'estadoIdProceso_iMaestraId', type: EdmType.Enumeration || 'Enumeration', valueMap: mapa };
    const propia = Object.prototype.hasOwnProperty.call(ctrl, 'createColumnMDExport'), orig = ctrl.createColumnMDExport;
    ctrl.createColumnMDExport = function () { const c = orig.apply(this, arguments); if (Array.isArray(c)) c.push(col); return c; };
    try { fnOrig.call(ctrl); }   // onExportXLS pide las columnas al empezar (de forma síncrona): se restituye enseguida
    finally { if (propia) ctrl.createColumnMDExport = orig; else delete ctrl.createColumnMDExport; }
  }
  window.__rmdStats.columnasExportadoOriginal = async () => { const ctrl = controladorPrincipal(), mapa = await mapaProduccionEstado(ctrl); return { columnas: ctrl.createColumnMDExport().map((c) => c.label).concat('Producción Estado'), mapa }; };

  // ---- Buscar RMD por equipo (v1.23) ----
  // Busca en los catálogos del portal (EQUIPO, UTENSILIO y UTENSILIO_CLASIFICACION, leídos una vez por sesión) por código o
  // descripción, y trae los master que tienen esos equipos en su estructura EQUIPOS / INSTRUMENTOS / MATERIALES.
  const ICONO_BUSCAR_EQUIPO = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.3"/><path d="m10 10 4 4"/><path d="M5 6.8h3.6"/></svg>';
  let catalogoEquipos = null;
  function cargarCatalogoEquipos(modelo, avisar) {
    if (!catalogoEquipos) catalogoEquipos = Promise.all([
      leerEntidadCompleta(modelo, 'EQUIPO', { $select: 'equipoId,CodigoGaci,denom,eqktx,equnr,pltxt' }, 'equipoId', avisar),
      leerEntidadCompleta(modelo, 'UTENSILIO', { $select: 'utensilioId,codigo,descripcion' }, 'utensilioId'),
      leerEntidadCompleta(modelo, 'UTENSILIO_CLASIFICACION', { $select: 'clasificacionUtensilioId,descripcion' }, 'clasificacionUtensilioId'),
    ]).then(([eq, ut, ag]) => agruparCatalogo([
      ...eq.map((e) => ({ tipo: 'EQUIPO', id: e.equipoId, codigo: norm(e.CodigoGaci || e.equnr || ''), desc: norm(e.denom || e.eqktx || ''), extra: norm(e.equnr || '') + ' ' + norm(e.pltxt || '') })),
      ...ut.map((u) => ({ tipo: 'UTENSILIO', id: u.utensilioId, codigo: norm(u.codigo || u.utensilioId || ''), desc: norm(u.descripcion || ''), extra: '' })),
      ...ag.map((g) => { const desc = norm(g.descripcion || ''), m = /\s-\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\s*$/.exec(desc); return { tipo: 'AGRUPADOR', id: g.clasificacionUtensilioId, codigo: m ? m[1] : '', desc, extra: '' }; }),
    ])).catch((e) => { catalogoEquipos = null; throw e; });
    return catalogoEquipos;
  }
  // un equipo del catálogo = todos los registros con el mismo tipo, código y descripción (EQUIPO trae varios por código GACI)
  function agruparCatalogo(filas) {
    const m = new Map();
    filas.forEach((x) => { const k = x.tipo + '|' + x.codigo + '|' + x.desc; const g = m.get(k); if (g) { g.ids.push(x.id); if (!g.extra.includes(x.extra)) g.extra += ' ' + x.extra; } else m.set(k, { ...x, ids: [x.id] }); });
    return [...m.values()];
  }
  const MAX_EQUIPOS_BUSQUEDA = 60;
  async function mastersConEquipos(modelo, items) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, porId = new Map(), out = [];
    items.forEach((x) => x.ids.forEach((id) => porId.set(x.tipo + '|' + id, x)));
    const grupos = [['EQUIPO', 'MD_ES_EQUIPO', 'equipoId_equipoId'], ['UTENSILIO', 'MD_ES_UTENSILIO', 'utensilioId_utensilioId'], ['AGRUPADOR', 'MD_ES_UTENSILIO', 'agrupadorId_clasificacionUtensilioId']];
    const tareas = [];
    grupos.forEach(([tipo, ent, campo]) => {
      const ids = items.filter((x) => x.tipo === tipo).flatMap((x) => x.ids);
      for (let i = 0; i < ids.length; i += 20) {
        const parte = ids.slice(i, i + 20);
        tareas.push(leerTodoDe(modelo, ent, [new Filtro({ filters: parte.map((id) => new Filtro(campo, 'EQ', id)), and: false })], { $expand: 'mdId,mdId/estadoIdRmd,mdId/sucursalId' })
          .then((filas) => filas.forEach((x) => { const md = x.mdId; if (md && typeof md === 'object' && !md.__deferred) out.push({ equipo: porId.get(tipo + '|' + x[campo]), md: mdParaEquipos(md), orden: x.orden }); })));
      }
    });
    await Promise.all(tareas);
    const nat = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
    return out.filter((x) => x.equipo).sort((a, b) => nat(a.equipo.codigo || a.equipo.desc, b.equipo.codigo || b.equipo.desc) || nat(b.md.codigo, a.md.codigo));
  }
  function filtrarListaPrincipal(codigo) {
    const ctrl = controladorPrincipal(); if (!ctrl) return;
    ctrl.getView().getModel('oDataFilter').setProperty('/code', codigo); ctrl.onSearch();
  }
  function abrirBuscarPorEquipo() {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2');
    if (!modelo) { toast('Abre la lista "Configuración Manufactura Digital" para buscar.', true); return; }
    const v = ventana('Buscar RMD por equipo', { cancelar: () => v.cerrar() });
    v.cuerpo.innerHTML = `<div class="rmd-busca-eq"><input type="search" class="rmd-eq-texto" placeholder="Código o descripción del equipo, instrumento o material (ej. PL1-LIQ-E023, balanza, tamiz 20)" aria-label="Equipo a buscar">
      <label class="rmd-fila"><input type="checkbox" class="rmd-eq-todos"> Incluir Suspendidos y Cancelados</label></div>
      <p class="rmd-progreso"></p><div class="rmd-eq-res"></div>`;
    const inp = v.cuerpo.querySelector('.rmd-eq-texto'), todos = v.cuerpo.querySelector('.rmd-eq-todos'), prog = v.cuerpo.querySelector('.rmd-progreso'), res = v.cuerpo.querySelector('.rmd-eq-res');
    let ultimo = null;
    const pintar = () => {
      if (!ultimo) return;
      const filas = ultimo.filas.filter((x) => todos.checked || !['Suspendido', 'Cancelado'].includes(x.md.estado));
      const equipos = new Set(filas.map((x) => x.equipo)).size;
      setTxt(prog, `${filas.length} master con ${equipos} de los ${ultimo.items.length} equipos encontrados${ultimo.recortado ? ` (hay ${ultimo.total} coincidencias: se buscaron las primeras ${MAX_EQUIPOS_BUSQUEDA}; afina la búsqueda)` : ''}. Clic en un código para filtrarlo en la lista.`);
      res.innerHTML = filas.length ? `<table class="rmd-tabla"><thead><tr><th>Equipo</th><th>Código RMD</th><th>Versión</th><th>Descripción del master</th><th>Estado</th><th>Etapa</th><th>Área (sección)</th><th>Planta</th></tr></thead><tbody>${
        filas.slice(0, 500).map((x) => `<tr><td>${esc(x.equipo.codigo)}${x.equipo.codigo ? ' · ' : ''}${esc(x.equipo.desc)} <span class="rmd-nota">${esc(x.equipo.tipo.toLowerCase())}</span></td><td><button type="button" class="rmd-link" data-codigo="${esc(x.md.codigo)}">${esc(x.md.codigo)}</button></td><td>${esc(x.md.version)}</td><td>${esc(x.md.descripcion)}</td><td>${esc(x.md.estado)}</td><td>${esc(x.md.etapa)}</td><td>${esc(x.md.seccion)}</td><td>${esc(x.md.planta)}</td></tr>`).join('')}</tbody></table>${filas.length > 500 ? '<p class="rmd-nota">Se muestran 500; el Excel los trae todos.</p>' : ''}` : '';
      bX.disabled = !filas.length;
    };
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-codigo]'); if (!b) return; filtrarListaPrincipal(b.dataset.codigo); v.cerrar(); });
    todos.addEventListener('change', pintar);
    const buscar = async () => {
      const q = SIN_ACENTOS(inp.value).trim(); if (q.length < 2) { setTxt(prog, 'Escribe al menos 2 letras o números.'); return; }
      bB.disabled = true; res.innerHTML = '';
      try {
        setTxt(prog, 'Leyendo el catálogo de equipos del portal…');
        const cat = await cargarCatalogoEquipos(modelo, (h, t) => setTxt(prog, `Leyendo el catálogo de equipos del portal… ${h} de ${t}`));
        const palabras = q.split(/\s+/), coinciden = cat.filter((x) => { const t = SIN_ACENTOS(x.codigo + ' ' + x.desc + ' ' + x.extra); return palabras.every((w) => t.includes(w)); });
        if (!coinciden.length) { ultimo = null; setTxt(prog, 'Ningún equipo, instrumento o material coincide con esa búsqueda.'); bX.disabled = true; return; }
        const items = coinciden.slice(0, MAX_EQUIPOS_BUSQUEDA);
        setTxt(prog, `Buscando los master de ${items.length} equipo(s)…`);
        ultimo = { texto: inp.value.trim(), items, total: coinciden.length, recortado: coinciden.length > MAX_EQUIPOS_BUSQUEDA, filas: await mastersConEquipos(modelo, items) };
        pintar();
      } catch (e) { setTxt(prog, 'No se pudo buscar: ' + e.message); } finally { bB.disabled = false; }
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); buscar(); } });
    const bB = botonModal('Buscar', 'primario', buscar);
    const bX = botonModal('Exportar Excel', '', async () => {
      if (!ultimo) return;
      const filas = ultimo.filas.filter((x) => todos.checked || !['Suspendido', 'Cancelado'].includes(x.md.estado)), hoy = new Date(), dd = (n) => String(n).padStart(2, '0');
      const libro = Xlsx.crearLibro(), cab = ['Código equipo', 'Equipo / instrumento / material', 'Tipo', 'Código RMD', 'Versión', 'Descripción del master', 'Código por defecto', 'Estado', 'Área (sección)', 'Etapa', 'Planta', 'Fecha autorización'];
      const h = libro.hoja('RMD por equipo', { activa: true, congelar: 'A2', cols: [18, 50, 12, 13, 9, 46, 17, 13, 26, 16, 14, 16].map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: 'RMDPorEquipo', ref: `A1:L${Math.max(2, filas.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      filas.forEach((x, i) => [x.equipo.codigo, x.equipo.desc, x.equipo.tipo, x.md.codigo, x.md.version, x.md.descripcion, x.md.codDefecto, x.md.estado, x.md.seccion, x.md.etapa, x.md.planta, x.md.fechaAut]
        .forEach((val, c) => { if (val !== '' && val != null) h.poner({ c, r: i + 1 }, val, c === 11 ? 'fechaDia' : 'normal'); }));
      descargarArchivo(`RMD por equipo ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.xlsx`, await libro.generar(), TIPO_XLSX);
    });
    bX.disabled = true;
    v.pie.append(botonModal('Cerrar', '', () => v.cerrar()), bX, bB);
    setTimeout(() => inp.focus(), 40);
  }
  window.__rmdStats.buscarPorEquipo = async (texto) => {
    const modelo = controladorPrincipal().getView().getModel('mainModelv2'), cat = await cargarCatalogoEquipos(modelo), palabras = SIN_ACENTOS(texto).trim().split(/\s+/);
    const items = cat.filter((x) => { const t = SIN_ACENTOS(x.codigo + ' ' + x.desc + ' ' + x.extra); return palabras.every((w) => t.includes(w)); }).slice(0, MAX_EQUIPOS_BUSQUEDA);
    const filas = await mastersConEquipos(modelo, items);
    return { catalogo: cat.length, items: items.map((x) => x.tipo + ' ' + x.codigo + ' ' + x.desc), filas: filas.map((x) => [x.equipo.codigo, x.md.codigo, x.md.version, x.md.estado, x.md.etapa]) };
  };

  // ---- Suspensión masiva de RMD autorizados (v1.23) ----
  // La persona pega los códigos de los master y, si quiere, un motivo. Para CADA uno se hace exactamente lo que haría a mano: se
  // filtra la lista, se abre su "Asociar fórmulas", se elige Estado "Suspendido", el motivo va como una línea nueva al final de
  // Observaciones y se pulsa el Guardar del portal (con sus validaciones, la trazabilidad y la anulación del documento de cada
  // receta en el DMS). Solo sirve para usuarios con permiso para cambiar el Estado ahí (rol Jefe DT, igual que en el portal).
  const ICONO_SUSPENDER = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3"/><path d="M6.4 5.4v5.2M9.6 5.4v5.2"/></svg>';
  const SELECT_MD_SUSP = 'mdId,codigo,version,descripcion,nivelTxt,areaRmdTxt,observacion,fechaAutorizacion,codDefectoReceta,estadoIdRmd/contenido,sucursalId/contenido';
  async function leerMDPorCodigos(modelo, codigos) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, out = [];
    for (let i = 0; i < codigos.length; i += 25) {
      const parte = codigos.slice(i, i + 25);
      out.push(...await leerTodoDe(modelo, 'MD', [new Filtro({ filters: parte.map((c) => new Filtro('codigo', 'EQ', c)), and: false })], { $expand: 'estadoIdRmd,sucursalId', $select: SELECT_MD_SUSP }));
    }
    return out;
  }
  const ocupadoGlobal = () => ocupado() || [...document.querySelectorAll('#sapUiBusyIndicator, .sapUiBusyIndicator')].some(visible);
  const mensajesPortal = () => [...document.querySelectorAll('.sapMMessageDialog')].filter(visible);
  async function cerrarMensajesPortal() {
    const textos = [];
    for (const m of mensajesPortal()) {
      textos.push(norm(m.querySelector('.sapMDialogSection, section') ? m.querySelector('.sapMDialogSection, section').textContent : m.textContent));
      const b = [...m.querySelectorAll('footer button, .sapMDialogFooter button')].find(visible); if (b) pulsar(b);
      await esperar(300);
    }
    return textos;
  }
  const rutaDe = (c, prop) => { const bi = c.getBindingInfo && c.getBindingInfo(prop); return bi && bi.parts && bi.parts[0] ? bi.parts[0].path : ''; };
  const controlesDe = (d) => [...new Set([...d.querySelectorAll('[id]')].map((el) => sap.ui.getCore().byId(el.id)).filter(Boolean))];
  async function abrirAsociarFormulas(ctrl, codigo) {
    const vista = ctrl.getView(), lista = vista.byId('idTblConfigurationRmd');
    vista.getModel('oDataFilter').setProperty('/code', codigo); await ctrl.onSearch();
    const fila = await hasta(() => lista.getItems().find((it) => { const c = it.getBindingContext('listMD'); return c && c.getObject().codigo === codigo; }), 30000);
    if (!fila) throw new Error('no aparece en la lista del portal');
    const mb = fila.getCells().find((c) => c.getMetadata().getName() === 'sap.m.MenuButton'), menu = mb && mb.getMenu();
    const opcion = menu && menu.getItems().find((x) => x.getText() === 'Asociar fórmulas'); if (!opcion) throw new Error('la fila no tiene la acción "Asociar fórmulas"');
    const previos = new Set(dialogos());
    menu.fireItemSelected({ item: opcion });
    const d = await hasta(() => dialogos().find((x) => !previos.has(x) && /^Asociar F[oó]rmula/i.test(cabecera(x))), 40000);
    if (!d) throw new Error('no se abrió "Asociar fórmulas"');
    await esperar(600); await hasta(() => !ocupadoGlobal(), 40000);
    return d;
  }
  // Suspende UN RMD con el Guardar del portal. Devuelve la observación que quedó; lanza un error con el motivo si no se pudo.
  async function suspenderUno(ctrl, codigo, motivo) {
    const d = await abrirAsociarFormulas(ctrl, codigo), vista = ctrl.getView(), asoc = vista.getModel('asociarDatos');
    try {
      const a = asoc.getData(); if (a.codigo !== codigo) throw new Error(`se abrió otro RMD (${a.codigo})`);
      const ctls = controlesDe(d), combo = ctls.find((c) => rutaDe(c, 'selectedKey') === '/estadoIdRmd_iMaestraIdBK');
      if (!combo || !combo.getItems) throw new Error('no se encontró el campo Estado');
      if (combo.getEditable && !combo.getEditable()) throw Object.assign(new Error('tu usuario no puede cambiar el Estado en "Asociar fórmulas" (en el portal solo lo permite el rol Jefe DT)'), { sinPermiso: true });
      const item = (t) => combo.getItems().find((i) => SIN_ACENTOS(i.getText()) === t), sus = item('SUSPENDIDO'), aut = item('AUTORIZADO');
      if (!sus) throw new Error('el Estado no ofrece "Suspendido"');
      if (aut && String(a.estadoIdRmd_iMaestraId) !== String(aut.getKey())) throw new Error('no está Autorizado');
      const antes = String(a.observacionBK != null ? a.observacionBK : a.observacion || '').replace(/\s+$/, '');
      const obs = motivo ? (antes ? antes + '\n' : '') + motivo : antes;
      combo.setSelectedKey(sus.getKey()); combo.fireSelectionChange({ selectedItem: sus }); combo.fireChange({ value: sus.getText(), newValue: sus.getText(), itemPressed: true });
      asoc.setProperty('/estadoIdRmd_iMaestraIdBK', isNaN(+sus.getKey()) ? sus.getKey() : +sus.getKey());
      asoc.setProperty('/observacionBK', obs);
      if (ctrl.localModel) ctrl.localModel.setProperty('/flagEstadoFormula', true);
      // el mismo manejador que el botón Guardar de la ventana (se espera a que termine: guarda, trazabilidad y DMS)
      const bGuardar = ctls.find((c) => c.getMetadata().getName() === 'sap.m.Button' && c.getText && c.getText() === 'Guardar' && c.getDomRef() && visible(c.getDomRef()));
      const reg = bGuardar && ((bGuardar.mEventRegistry || {}).press || [])[0]; if (!reg) throw new Error('no se encontró el botón Guardar');
      await reg.fFunction.call(reg.oListener, { getSource: () => bGuardar, getParameter: () => undefined, getParameters: () => ({}) });
      await esperar(400); await hasta(() => !ocupadoGlobal(), 60000);
      const mensajes = (await cerrarMensajesPortal()).filter((t) => !/guardaron los cambios correctamente/i.test(t));
      return { obs, mensajes };
    } finally {
      await cerrarMensajesPortal();
      try { ctrl.onCancelAsociarArticulos(); } catch (e) { const b = [...d.querySelectorAll('button')].find((x) => visible(x) && /^Cancelar$/.test(x.textContent.trim())); if (b) pulsar(b); }
      await esperar(500);
    }
  }
  function abrirSuspensionMasiva() {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2');
    if (!modelo) { toast('Abre la lista "Configuración Manufactura Digital" para suspender.', true); return; }
    if (dialogos().length) { toast('Cierra las ventanas abiertas del portal antes de la suspensión masiva.', true); return; }
    let trabajando = false, detenido = false, plan = [], resultados = [];
    const v = ventana('Suspensión masiva de RMD', { cancelar: () => { if (!trabajando) v.cerrar(); } });
    v.cuerpo.innerHTML = `<p>Pega los códigos de los master <b>autorizados</b> que quieres suspender (uno por línea o separados por espacios o comas).</p>
      <textarea class="rmd-min-texto rmd-susp-codigos" placeholder="2202608939&#10;2202607784"></textarea>
      <p><b>Motivo de la suspensión</b> (opcional): se agrega como una línea nueva al final de las Observaciones de "Asociar fórmulas".</p>
      <input type="text" class="rmd-susp-motivo" maxlength="400" placeholder="Ej.: 20260924 Suspendido por actualización de fórmula (CC 26-300)">
      <p class="rmd-nota">Cada RMD se suspende igual que a mano: "Asociar fórmulas" → Estado "Suspendido" → Guardar del portal (con sus validaciones, la trazabilidad y la anulación del documento de cada receta en el DMS). Requiere el permiso para cambiar el Estado (rol Jefe DT).</p>
      <p class="rmd-progreso"></p><div class="rmd-susp-res"></div>`;
    const ta = v.cuerpo.querySelector('.rmd-susp-codigos'), mot = v.cuerpo.querySelector('.rmd-susp-motivo'), prog = v.cuerpo.querySelector('.rmd-progreso'), res = v.cuerpo.querySelector('.rmd-susp-res');
    const tablaPlan = () => {
      res.innerHTML = `<table class="rmd-tabla"><thead><tr><th>Código</th><th>Versión</th><th>Descripción</th><th>Etapa</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>${plan.map((x) => {
        const r = resultados.find((y) => y.codigo === x.codigo);
        return `<tr><td>${esc(x.codigo)}</td><td>${esc(x.md ? x.md.version : '')}</td><td>${esc(x.md ? x.md.descripcion : '')}</td><td>${esc(x.md ? x.md.nivelTxt : '')}</td><td>${esc(x.estadoTxt)}</td><td class="${r && !r.ok ? 'rmd-dif' : ''}">${esc(r ? r.resultado : x.suspender ? 'Se suspenderá' : x.motivoNo)}</td></tr>`; }).join('')}</tbody></table>`;
    };
    const bRev = botonModal('Revisar', 'primario', async () => {
      const codigos = [...new Set((ta.value.match(/\d{6,}/g) || []))];
      if (!codigos.length) { setTxt(prog, 'No se encontró ningún código (números de 6 o más cifras).'); return; }
      bRev.disabled = true; resultados = []; setTxt(prog, `Leyendo ${codigos.length} código(s) en SAP…`);
      try {
        const mds = await leerMDPorCodigos(modelo, codigos), porCod = new Map(mds.map((m) => [m.codigo, m]));
        plan = codigos.map((c) => { const md = porCod.get(c), est = md && md.estadoIdRmd ? md.estadoIdRmd.contenido : '';
          return { codigo: c, md, estadoTxt: md ? est : '—', suspender: !!md && est === 'Autorizado', motivoNo: !md ? 'No existe' : est === 'Autorizado' ? '' : `No se suspende: está ${est}` }; });
        const n = plan.filter((x) => x.suspender).length;
        setTxt(prog, `${n} de ${codigos.length} se pueden suspender (solo los Autorizados).`); tablaPlan();
        bSus.disabled = !n; setTxt(bSus, n ? `Suspender ${n} RMD` : 'Suspender');
      } catch (e) { setTxt(prog, 'No se pudieron leer los códigos: ' + e.message); } finally { bRev.disabled = false; }
    });
    const bSus = botonModal('Suspender', 'peligro', async () => {
      const lista = plan.filter((x) => x.suspender), motivo = norm(mot.value);
      if (!lista.length) return;
      const ok = await confirmar(`¿Suspender ${lista.length} RMD?`, `Se cambiará a "Suspendido" el Estado de ${lista.length} RMD autorizado(s) en SAP${motivo ? ` y se agregará a sus Observaciones la línea: "${motivo}"` : ''}.`,
        'El portal además anula en el DMS el documento de sus recetas, como al suspender a mano. No se puede deshacer desde aquí.', { si: `Suspender ${lista.length}`, no: 'Cancelar', peligro: true });
      if (!ok) return;
      trabajando = true; detenido = false; bSus.disabled = true; bRev.disabled = true; ta.readOnly = true; mot.readOnly = true;
      const bDet = botonModal('Detener', '', () => { detenido = true; bDet.disabled = true; setTxt(bDet, 'Se detiene tras el actual…'); }); v.pie.prepend(bDet);
      const filtroAntes = ctrl.getView().getModel('oDataFilter').getProperty('/code') || '', usuario = usuarioSapActual(), quien = usuario ? (usuario.nombre || usuario.id) : '';
      try {
        for (let i = 0; i < lista.length && !detenido; i++) {
          const x = lista[i]; setTxt(prog, `Suspendiendo ${i + 1} de ${lista.length}: ${x.codigo}…`);
          const r = { codigo: x.codigo, md: x.md, estadoAntes: x.estadoTxt, motivo, fecha: new Date(), usuario: quien, ok: false, obs: '', estadoDespues: '', resultado: '' };
          try {
            const s = await suspenderUno(ctrl, x.codigo, motivo);
            const md2 = (await leerMDPorCodigos(modelo, [x.codigo]))[0];
            r.estadoDespues = md2 && md2.estadoIdRmd ? md2.estadoIdRmd.contenido : ''; r.obs = md2 ? md2.observacion || '' : s.obs;
            r.ok = r.estadoDespues === 'Suspendido';
            r.resultado = r.ok ? 'Suspendido' : `No se suspendió${s.mensajes.length ? ': ' + s.mensajes.join(' · ') : ` (quedó ${r.estadoDespues || 'sin cambio'})`}`;
          } catch (e) {
            r.resultado = 'No se suspendió: ' + e.message; r.obs = x.md ? x.md.observacion || '' : '';
            if (e.sinPermiso) { resultados.push(r); tablaPlan(); detenido = true; break; }
          }
          resultados.push(r); tablaPlan();
        }
        plan.filter((x) => !x.suspender).forEach((x) => resultados.push({ codigo: x.codigo, md: x.md, estadoAntes: x.estadoTxt, estadoDespues: x.estadoTxt, motivo: '', fecha: new Date(), usuario: quien, ok: false, obs: x.md ? x.md.observacion || '' : '', resultado: x.motivoNo }));
        const hechos = resultados.filter((y) => y.ok).length;
        setTxt(prog, `${detenido ? 'Detenido. ' : ''}Suspendidos: ${hechos} de ${lista.length}. Descarga el detalle con "Exportar Excel".`);
      } finally {
        trabajando = false; bDet.remove(); bRev.disabled = false; ta.readOnly = false; mot.readOnly = false; bX.disabled = !resultados.length;
        try { ctrl.getView().getModel('oDataFilter').setProperty('/code', filtroAntes); await ctrl.onSearch(); } catch (e) { /* la lista se actualiza al próximo "Ir" */ }
      }
    });
    bSus.disabled = true;
    const bX = botonModal('Exportar Excel', '', async () => {
      const hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), libro = Xlsx.crearLibro();
      const cab = ['Código RMD', 'Versión', 'Descripción del master', 'Código por defecto', 'Etapa', 'Área (sección)', 'Planta', 'Estado anterior', 'Estado actual', 'Resultado', 'Motivo agregado', 'Observaciones', 'Fecha y hora', 'Usuario'];
      const h = libro.hoja('Suspensión masiva', { activa: true, congelar: 'B2', cols: [13, 9, 44, 17, 16, 24, 14, 14, 14, 40, 40, 70, 18, 28].map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: 'SuspensionMasiva', ref: `A1:N${Math.max(2, resultados.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      resultados.forEach((x, i) => { const m = x.md || {};
        [x.codigo, m.version, m.descripcion, m.codDefectoReceta, m.nivelTxt, m.areaRmdTxt, m.sucursalId && m.sucursalId.contenido, x.estadoAntes, x.estadoDespues, x.resultado, x.motivo, x.obs, x.fecha, x.usuario]
          .forEach((val, c) => { if (val !== '' && val != null) h.poner({ c, r: i + 1 }, c === 12 ? new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), val.getHours(), val.getMinutes())) : val, c === 11 ? 'envuelto' : c === 12 ? 'fechaHora' : 'normal'); }); });
      descargarArchivo(`Suspensión masiva RMD ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())} ${dd(hoy.getHours())}${dd(hoy.getMinutes())}.xlsx`, await libro.generar(), TIPO_XLSX);
    });
    bX.disabled = true;
    v.pie.append(botonModal('Cerrar', '', () => { if (!trabajando) v.cerrar(); }), bX, bRev, bSus);
    setTimeout(() => ta.focus(), 40);
  }
  // diagnóstico (pruebas con el guardado SIMULADO): suspende uno con el mismo flujo, sin ventana
  window.__rmdStats.suspenderUno = (codigo, motivo) => suspenderUno(controladorPrincipal(), codigo, motivo);
  window.__rmdStats.leerMDPorCodigos = (codigos) => leerMDPorCodigos(controladorPrincipal().getView().getModel('mainModelv2'), codigos);

  // Botones de la barra principal: "Buscar por equipo" y "Suspensión masiva" (junto a Exportar / Enviar a Status RMD)
  function gestionarBotonesLista() {
    const b = botonExportar(); if (!b) return;
    const barra = b.closest('.sapMBar, .sapMOTB, .sapMToolbar') || b.parentElement; if (!barra) return;
    const poner = (op, cls, icono, texto, titulo, fn) => {
      const ya = barra.querySelector('.' + cls);
      if (!on(op)) { if (ya) ya.remove(); return; }
      if (ya) return;
      const x = botonIcono(icono, texto, cls, fn); x.title = titulo;
      colocarEnBarra(barra, x);
    };
    poner('buscarequipo', 'rmd-buscar-equipo', ICONO_BUSCAR_EQUIPO, 'Buscar por equipo', 'Busca los RMD que tienen un equipo, instrumento o material (por código o descripción) y permite exportarlos o filtrarlos en la lista.', () => abrirBuscarPorEquipo());
    poner('suspension', 'rmd-suspension', ICONO_SUSPENDER, 'Suspensión masiva', 'Suspende varios RMD autorizados a la vez (pegando sus códigos) con el Guardar de "Asociar fórmulas", agrega el motivo a sus Observaciones y exporta el detalle.', () => abrirSuspensionMasiva());
  }
  // ---- Botones del script en la barra de la lista principal (v1.24): a la IZQUIERDA de la barra vertical que separa los iconos
  // del portal (Nuevo RMD, Configurar, Exportar), siempre en este orden.
  const ORDEN_BARRA = ['rmd-status-rmd', 'rmd-buscar-equipo', 'rmd-suspension'];
  function colocarEnBarra(barra, x) {
    const nativo = [...barra.querySelectorAll('button')].find((y) => visible(y) && /^Nuevo RMD$/i.test(y.title || '')) || botonExportar(); if (!nativo) return;
    const sep = [...barra.querySelectorAll('.sapMTBSeparator')].filter((s) => s.compareDocumentPosition(nativo) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
    let ancla = sep || nativo;
    while (ancla.parentElement && ancla.parentElement !== barra && !ancla.parentElement.contains(nativo.parentElement === ancla.parentElement ? nativo : ancla)) ancla = ancla.parentElement;
    const i = ORDEN_BARRA.findIndex((c) => x.classList.contains(c));
    const siguiente = ORDEN_BARRA.slice(i + 1).map((c) => barra.querySelector('.' + c)).find(Boolean);
    if (siguiente) siguiente.insertAdjacentElement('beforebegin', x); else ancla.insertAdjacentElement('beforebegin', x);
  }

  // ---- Documentos citados en TODOS los master (v1.24, en el menú Exportar) ----
  // Para no leer 1,1 millones de pasos: se lee el catálogo de pasos (PASO, ~91 mil) y se quedan los que citan un documento; luego se
  // piden solo sus apariciones en los master (MD_ES_PASO y, como proceso menor, MD_ES_PASO_INSUMO_PASO) en bloques de 40.
  const ESTADOS_SIN_MARCAR_DOCS = ['Suspendido', 'Cancelado'];
  async function leerPorIds(modelo, entidad, campo, ids, params, extra, avisar) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, out = [], bloques = [];
    for (let i = 0; i < ids.length; i += 40) bloques.push(ids.slice(i, i + 40));
    let sig = 0, hechos = 0;
    const trabajador = async () => {
      while (sig < bloques.length) {
        const parte = bloques[sig++], o = new Filtro({ filters: parte.map((id) => new Filtro(campo, 'EQ', id)), and: false });
        out.push(...await leerTodoDe(modelo, entidad, [extra ? new Filtro({ filters: [o, extra], and: true }) : o], params));
        hechos++; if (avisar) avisar(hechos, bloques.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, bloques.length) }, trabajador));
    return out;
  }
  async function citasDeTodos(modelo, estados, avisar) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, t0 = Date.now();
    avisar('Leyendo el catálogo de pasos…');
    const [pasos, masters, estructuras, etiquetas] = await Promise.all([
      leerEntidadCompleta(modelo, 'PASO', { $select: 'pasoId,codigo,descripcion' }, 'pasoId', (h, t) => avisar(`Leyendo el catálogo de pasos… ${h} de ${t}`)),
      leerEntidadCompleta(modelo, 'MD', { $expand: 'estadoIdRmd,sucursalId', $select: SELECT_MD_EQ + ',estadoIdRmd_iMaestraId' }, 'mdId'),
      leerTodoDe(modelo, 'ESTRUCTURA', [], { $select: 'estructuraId,descripcion' }),
      leerTodoDe(modelo, 'ETIQUETA', [], { $select: 'etiquetaId,descripcion' }),
    ]);
    const rx = new RegExp(PATRON_REFERENCIA_JS.source, 'g'), citados = new Map();
    pasos.forEach((p) => { const cod = [...new Set((String(p.descripcion || '').match(rx)) || [])]; if (cod.length) citados.set(p.pasoId, { codigo: p.codigo, desc: norm(p.descripcion), docs: cod }); });
    const md = new Map(masters.map((m) => [m.mdId, mdParaEquipos(m)])), est = new Map(estructuras.map((e) => [e.estructuraId, norm(e.descripcion)])), etq = new Map(etiquetas.map((e) => [e.etiquetaId, norm(e.descripcion)]));
    const ids = [...citados.keys()], vale = (m) => m && estados.includes(m.estado || '(sin estado)');
    const idsEstados = [...new Set(masters.filter((m) => vale(mdParaEquipos(m))).map((m) => m.estadoIdRmd_iMaestraId).filter((x) => x != null))];
    const deEstados = idsEstados.length ? new Filtro({ filters: idsEstados.map((k) => new Filtro('mdId/estadoIdRmd_iMaestraId', 'EQ', k)), and: false }) : null;
    const filasP = await leerPorIds(modelo, 'MD_ES_PASO', 'pasoId_pasoId', ids, { $expand: 'mdEsEtiquetaId', $select: 'mdId_mdId,pasoId_pasoId,orden,estructuraId_estructuraId,activo,mdEsEtiquetaId/etiquetaId_etiquetaId' }, deEstados,
      (h, t) => avisar(`Buscando los pasos que citan documentos en los master… ${h} de ${t}`));
    const filasPM = await leerPorIds(modelo, 'MD_ES_PASO_INSUMO_PASO', 'pasoHijoId_pasoId', ids, { $select: 'mdId_mdId,pasoHijoId_pasoId,orden,estructuraId_estructuraId,etiquetaId_etiquetaId,activo' }, null,
      (h, t) => avisar(`Buscando los procesos menores que citan documentos… ${h} de ${t}`));
    const citas = [];
    const agregar = (x, pasoId, esPM, etiquetaId) => {
      const m = md.get(x.mdId_mdId), c = citados.get(pasoId); if (!vale(m) || !c || x.activo === false) return;
      const lista = (est.get(x.estructuraId_estructuraId) || '') + (etiquetaId && etq.get(etiquetaId) ? ' › ' + etq.get(etiquetaId) : '');
      c.docs.forEach((doc) => citas.push({ doc, md: m, lista, esPM, orden: x.orden, codigoPaso: c.codigo, desc: c.desc }));
    };
    filasP.forEach((x) => agregar(x, x.pasoId_pasoId, false, x.mdEsEtiquetaId && x.mdEsEtiquetaId.etiquetaId_etiquetaId));
    filasPM.forEach((x) => agregar(x, x.pasoHijoId_pasoId, true, x.etiquetaId_etiquetaId));
    return { citas, pasosCitados: citados.size, catalogo: pasos.length, masters: new Set(citas.map((c) => c.md.mdId)).size, segundos: Math.round((Date.now() - t0) / 1000) };
  }
  function armarCitasTodosExcel(r, estados) {
    const hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), libro = Xlsx.crearLibro(), nat = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
    const cs = [...r.citas].sort((a, b) => nat(a.doc, b.doc) || nat(a.md.codigo, b.md.codigo) || (+a.orden || 0) - (+b.orden || 0));
    const porDoc = new Map(); cs.forEach((c) => { let x = porDoc.get(c.doc); if (!x) porDoc.set(c.doc, x = { masters: new Set(), aut: new Set(), citas: 0, etapas: new Set() }); x.masters.add(c.md.mdId); if (c.md.estado === 'Autorizado') x.aut.add(c.md.mdId); x.citas++; if (c.md.etapa) x.etapas.add(c.md.etapa); });
    const tabla = (nombre, nt, cab, anchos, datos, estilos = {}, op = {}) => {
      const h = libro.hoja(nombre, { activa: !!op.activa, congelar: op.congelar || 'A2', cols: anchos.map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: nt, ref: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, datos.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      datos.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'normal'); }));
    };
    tabla('Documentos', 'Documentos', ['Documento', 'Tipo', 'Masters', 'Autorizados', 'Citas', 'Etapas'], [16, 15, 10, 12, 9, 50],
      [...porDoc].map(([doc, x]) => [doc, TIPOS_DOC[doc[0]] || doc[0], x.masters.size, x.aut.size, x.citas, [...x.etapas].sort().join(', ')]), {}, { activa: true });
    tabla('Citas', 'CitasDocumentos', ['Documento', 'Tipo', 'Código RMD', 'Versión', 'Descripción del master', 'Estado', 'Etapa', 'Área (sección)', 'Planta', 'Lista', 'Paso / proceso menor', 'Orden', 'Código del paso', 'Descripción donde aparece'],
      [16, 15, 13, 9, 42, 12, 15, 24, 13, 36, 14, 8, 13, 90], cs.map((c) => [c.doc, TIPOS_DOC[c.doc[0]] || c.doc[0], c.md.codigo, c.md.version, c.md.descripcion, c.md.estado, c.md.etapa, c.md.seccion, c.md.planta, c.lista, c.esPM ? 'Proceso menor' : 'Paso', c.orden, c.codigoPaso, c.desc]), { 13: 'envuelto' }, { congelar: 'B2' });
    const hI = libro.hoja('Información', { cols: [[1, 1, 30], [2, 2, 90]] });
    hI.poner('A1', 'Documentos citados en todos los master', 'titulo');
    [['Generado', `${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())} (leído de SAP en ${r.segundos} s)`], ['Estados incluidos', estados.join(', ')],
      ['Documentos distintos', porDoc.size], ['Masters con citas', r.masters], ['Citas', cs.length], ['Pasos del catálogo que citan documentos', `${r.pasosCitados} de ${r.catalogo}`],
      ['Criterio', 'Código con el formato <I/P/F><Área>-<sufijo NNN> (ej. IPRO-P123, PCPR-202, FPRO-250) en la descripción de los pasos y procesos menores.']]
      .forEach(([a, b], i) => { hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return { libro, nombre: `Documentos citados en todos los master ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.xlsx`, documentos: porDoc.size };
  }
  async function abrirCitasDeTodos() {
    if (window.__rmdCitasTodos) return;
    const modelo = modeloListaPrincipal(); if (!modelo) { toast('Abre la lista "Configuración Manufactura Digital" para exportar.', true); return; }
    let trabajando = false;
    const v = ventana('Documentos citados en todos los master', { cancelar: () => { if (!trabajando) v.cerrar(); } });
    v.cuerpo.innerHTML = `<p>Excel con cada documento (instructivo, procedimiento o formato) citado en los pasos y procesos menores de los master: en cuáles aparece y dónde. Tarda alrededor de 1 a 2 minutos.</p>
      <div class="rmd-eq-estados"></div><p class="rmd-progreso"></p>`;
    const prog = v.cuerpo.querySelector('.rmd-progreso'), caja = v.cuerpo.querySelector('.rmd-eq-estados'), avance = (t, error) => { setTxt(prog, t); prog.classList.toggle('error', !!error); };
    const bGen = botonModal('Exportar Excel', 'primario', async () => {
      const estados = [...caja.querySelectorAll('input:checked')].map((x) => x.value); if (!estados.length) { avance('Marca al menos un estado.', true); return; }
      window.__rmdCitasTodos = true; trabajando = true; bGen.disabled = true;
      try {
        const r = await citasDeTodos(modelo, estados, avance);
        avance(`Armando el Excel con ${r.citas.length.toLocaleString('es-PE')} citas…`); await esperar(40);
        const { libro, nombre, documentos } = armarCitasTodosExcel(r, estados), u8 = await libro.generar();
        descargarArchivo(nombre, u8, TIPO_XLSX);
        avance(`✓ Descargado "${nombre}" (${(u8.length / 1048576).toFixed(1)} MB, ${r.segundos} s): ${documentos.toLocaleString('es-PE')} documentos en ${r.masters.toLocaleString('es-PE')} master (${r.citas.length.toLocaleString('es-PE')} citas).`);
      } catch (e) { avance('No se pudo exportar: ' + e.message, true); }
      finally { window.__rmdCitasTodos = false; trabajando = false; bGen.disabled = false; }
    });
    bGen.disabled = true;
    v.pie.append(botonModal('Cerrar', '', () => { if (!trabajando) v.cerrar(); }), bGen);
    const nombres = ['Autorizado', 'Ingresado', 'Solicitado', 'Solicitud Aprobada', 'Solicitud Rechazada', 'Suspendido', 'Cancelado'];
    caja.innerHTML = '<p><b>Estados a incluir</b> (los Suspendidos son versiones anteriores ya reemplazadas):</p>' + nombres.map((e) => `<label class="rmd-fila"><input type="checkbox" value="${esc(e)}" ${ESTADOS_SIN_MARCAR_DOCS.includes(e) ? '' : 'checked'}> ${esc(e)}</label>`).join('');
    avance('Elige los estados y pulsa "Exportar Excel".'); bGen.disabled = false;
  }
  window.__rmdStats.citasDeTodos = async (estados = ['Autorizado', 'Ingresado']) => {
    const r = await citasDeTodos(modeloListaPrincipal(), estados, () => {}), x = armarCitasTodosExcel(r, estados), u8 = await x.libro.generar();
    return { segundos: r.segundos, citas: r.citas.length, masters: r.masters, documentos: x.documentos, pasosCitados: r.pasosCitados, bytes: u8.length, nombre: x.nombre, muestra: r.citas.slice(0, 3).map((c) => [c.doc, c.md.codigo, c.lista, c.esPM, c.orden]) };
  };

  // ---- Recetas frente a SAP: lista de materiales (v1.24) y hoja de ruta (v1.27, opcional) ----
  // Al asociar una receta, el portal copia en el RMD su lista de materiales (MaterialSet del ERP: Matnr + Werks + Stlal → MD_ES_RE_INSUMO)
  // y los datos de su versión de fabricación (ProduccionVSet → RECETA: puesto principal Mdv01, hoja de ruta Plnnr, contador Alnal,
  // bloqueo Mksp, validez, lote). Esas copias ya no cambian: aquí se comparan con lo que devuelve hoy SAP (las mismas lecturas del
  // portal). Solo AVISA: no impide autorizar.
  // v1.27: la revisión va POR RECETA y sigue a la tabla de "Asociar fórmulas": al eliminar o agregar una receta el aviso se rehace
  // solo (antes se guardaba por RMD y seguía mostrando la receta eliminada hasta cerrar la ventana). El detalle ya no va en una línea:
  // un icono ⚠ junto al código abre una tabla (componente, descripción, en el RMD → en SAP hoy).
  const revisionesReceta = new Map();                                     // mdRecetaId -> { t, clave, p: Promise<resultado> }
  const contextosRmd = new Map();                                         // mdId -> { t, p: Promise<{ puestos, anterior }> }
  const cantidadNum = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
  const numTxt = (n) => (n == null ? '' : (Math.round(n * 1000) / 1000).toLocaleString('es-PE', { maximumFractionDigits: 3 }));
  function leerErp(erp, entidad, filtros) {
    return new Promise((ok, mal) => erp.read('/' + entidad, { filters: filtros, success: (r) => ok((r && r.results) || []), error: (e) => mal(new Error(`SAP no respondió (${entidad}, ${(e && e.statusCode) || 'sin código'})`)) }));
  }
  function diferenciasBom(sap, rmd) {
    const agrupar = (filas) => { const m = new Map(); filas.forEach((x) => { const k = norm(x.Component); if (!k) return; const g = m.get(k) || { comp: k, desc: norm(x.Maktx || x.ItemText1 || ''), q: 0, u: norm(x.CompUnit), n: 0 }; g.q += cantidadNum(x.CompQty) || 0; g.n++; if (!g.desc) g.desc = norm(x.Maktx || x.ItemText1 || ''); m.set(k, g); }); return m; };
    const a = agrupar(sap), b = agrupar(rmd), dif = [];
    a.forEach((x, k) => {
      const y = b.get(k);
      if (!y) dif.push({ tipo: 'nuevo', comp: k, desc: x.desc, ahora: { q: x.q, u: x.u }, texto: `+ ${k} ${numTxt(x.q)} ${x.u}`.trim() });
      else if (Math.abs(x.q - y.q) > 1e-6 || x.u.toUpperCase() !== y.u.toUpperCase()) dif.push({ tipo: 'cambia', comp: k, desc: x.desc || y.desc, antes: { q: y.q, u: y.u }, ahora: { q: x.q, u: x.u }, texto: `${k}: ${numTxt(y.q)} ${y.u} → ${numTxt(x.q)} ${x.u}` });
    });
    b.forEach((y, k) => { if (!a.has(k)) dif.push({ tipo: 'quitado', comp: k, desc: y.desc, antes: { q: y.q, u: y.u }, texto: `− ${k} (ya no está en la lista de SAP)` }); });
    // un quitado y un nuevo con la misma descripción salvo la versión del material ("… x25" → "… x25 H v.1") = reemplazo
    const base = (t) => norm(t).toUpperCase().replace(/[\s.,;-]*\b(H\s*)?V\.\s*\d+\s*$/, '').replace(/\s+/g, ' ').trim();
    const nuevos = dif.filter((d) => d.tipo === 'nuevo');
    dif.filter((d) => d.tipo === 'quitado').forEach((q) => {
      const bq = base(q.desc); if (bq.length < 6) return;
      const n = nuevos.find((x) => !x.__usado && base(x.desc) === bq); if (!n) return;
      n.__usado = true; q.__usado = true;
      dif.push({ tipo: 'reemplazo', comp: n.comp, compAntes: q.comp, desc: n.desc, descAntes: q.desc, antes: q.antes, ahora: n.ahora, texto: `${q.comp} → ${n.comp} (${n.desc})` });
    });
    const orden = { cambia: 0, reemplazo: 1, nuevo: 2, quitado: 3 };
    return dif.filter((d) => !d.__usado).sort((p, q) => orden[p.tipo] - orden[q.tipo] || p.comp.localeCompare(q.comp));
  }
  const TEXTO_MKSP = { '': 'No bloqueado', 1: 'Bloqueado para cada utilización', 2: 'Bloqueado para selección automática' };
  const fechaSap = (v) => { if (!v) return ''; const d = v instanceof Date ? v : new Date(v); if (isNaN(d)) return String(v); return d.getUTCFullYear() >= 9999 ? 'sin fin' : `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; };
  // Lo más resaltante de la versión de fabricación. Solo avisan los datos de la ruta (puesto, hoja de ruta, contador, alternativa):
  // el bloqueo (Mksp) cambia a menudo al usar la versión y el portal ya lo refresca con su botón; se muestra solo como información.
  const CAMPOS_RUTA = [
    ['Mdv01', 'Puesto de trabajo (línea)', (v) => norm(v), true], ['Plnnr', 'Hoja de ruta', (v) => norm(v), true], ['Alnal', 'Contador', (v) => String(parseInt(v, 10) || norm(v)), true],
    ['Stlal', 'Alternativa de la lista de materiales', (v) => String(parseInt(v, 10) || norm(v)), true],
    ['Mksp', 'Estado', (v) => TEXTO_MKSP[norm(v)] || norm(v), false], ['Bdatu', 'Válida hasta', fechaSap, false], ['Bstma', 'Tamaño de lote máximo', (v) => numTxt(cantidadNum(v)), false],
  ];
  // Datos del RMD que sirven a todas sus recetas: puestos de trabajo usados en sus pasos y la receta de la versión anterior
  function contextoRmd(ctrl, mdId) {
    const g = contextosRmd.get(mdId); if (g && Date.now() - g.t < 5 * 60000) return g.p;
    const modelo = ctrl.getView().getModel('mainModelv2'), F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const p = (async () => {
      const [pasos, md] = await Promise.all([
        leerTodoDe(modelo, 'MD_ES_PASO', [new F('mdId_mdId', 'EQ', mdId)], { $select: 'mdEstructuraPasoId,puestoTrabajo' }).catch(() => []),
        leerTodoDe(modelo, 'MD', [new F('mdId', 'EQ', mdId)], { $select: 'mdId,version,mdIdVersionAnt' }).catch(() => []),
      ]);
      const cuenta = new Map(); pasos.forEach((x) => { const k = norm(x.puestoTrabajo).toUpperCase(); if (k) cuenta.set(k, (cuenta.get(k) || 0) + 1); });
      let anterior = null; const ant = md[0] && md[0].mdIdVersionAnt;
      if (ant) { try { const [mr, ma] = await Promise.all([leerTodoDe(modelo, 'MD_RECETA', [new F('mdId_mdId', 'EQ', ant)], { $expand: 'recetaId' }), leerTodoDe(modelo, 'MD', [new F('mdId', 'EQ', ant)], { $select: 'mdId,version' })]);
        anterior = { version: ma[0] && ma[0].version, recetas: mr.filter((x) => x.recetaId && x.activo !== false).map((x) => x.recetaId) }; } catch (e) { /* sin versión anterior */ } }
      return { puestos: cuenta, anterior };
    })();
    p.catch(() => contextosRmd.delete(mdId)); contextosRmd.set(mdId, { t: Date.now(), p }); return p;
  }
  async function revisarRuta(ctrl, rc, werks, ctx) {
    const erp = ctrl.oModelErpNec, F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const versiones = await leerErp(erp, 'ProduccionVSet', [new F('Matnr', 'EQ', rc.Matnr), new F('Werks', 'EQ', werks)]);
    const hoy = versiones.find((v) => norm(v.Verid) === norm(rc.Verid));
    const ant = ctx.anterior && ctx.anterior.recetas.find((x) => norm(x.Matnr) === norm(rc.Matnr)) || null;
    const cambios = [];
    CAMPOS_RUTA.forEach(([k, nombre, f, avisa]) => {
      const a = f(rc[k]), s = hoy ? f(hoy[k]) : null, v = ant ? f(ant[k]) : null;
      if (hoy && a !== s) cambios.push({ campo: nombre, asociada: a, sap: s, anterior: v, clave: k, avisa });
      else if (!hoy || (ant && v !== a && avisa)) cambios.push({ campo: nombre, asociada: a, sap: s, anterior: v, clave: k, avisa: avisa && !hoy, soloAnterior: !!hoy });
    });
    // puestos de la hoja de ruta (la misma lectura del combo "Puesto Trabajo" del portal) frente a los que usan los pasos del RMD
    const puestosDe = async (plnnr, alnal) => [...new Set((await leerErp(erp, 'PuestoTrabSet', [new F('Plnnr', 'EQ', norm(plnnr)), new F('Umrez', 'EQ', norm(alnal))]).catch(() => [])).map((x) => norm(x.Arbpl).toUpperCase()).filter(Boolean))];
    const rutaHoy = hoy ? await puestosDe(hoy.Plnnr, hoy.Alnal) : [];
    const rutaAsoc = hoy && (norm(hoy.Plnnr) !== norm(rc.Plnnr) || norm(hoy.Alnal) !== norm(rc.Alnal)) ? await puestosDe(rc.Plnnr, rc.Alnal) : rutaHoy;
    const usados = [...ctx.puestos.keys()];
    return {
      existe: !!hoy, cambios, anteriorVersion: ctx.anterior && ctx.anterior.version,
      puestosRuta: rutaHoy, entran: rutaHoy.filter((x) => !rutaAsoc.includes(x)), salen: rutaAsoc.filter((x) => !rutaHoy.includes(x)),
      faltan: hoy ? usados.filter((x) => rutaHoy.length && !rutaHoy.includes(x)).map((x) => ({ puesto: x, pasos: ctx.puestos.get(x) })) : [],
    };
  }
  function revisarReceta(ctrl, r, werksRmd, mdId, forzar) {
    const conRuta = !!on('recetaruta'), clave = (conRuta ? 'r' : 'b') + (r.recetaId && r.recetaId.Verid), g = revisionesReceta.get(r.mdRecetaId);
    if (!forzar && g && g.clave === clave && Date.now() - g.t < 30 * 60000) return g.p;
    const p = (async () => {
      const erp = ctrl.oModelErpNec, modelo = ctrl.getView().getModel('mainModelv2'), F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
      if (!erp || !modelo) throw new Error('no se encontró la conexión a SAP del portal');
      const rc = r.recetaId, werks = norm(rc.Werks) || werksRmd, stlal = String(parseInt(rc.Stlal, 10));
      const [bom, copia, ruta] = await Promise.all([
        leerErp(erp, 'MaterialSet', [new F('Matnr', 'EQ', rc.Matnr), new F('Werks', 'EQ', werks), new F('Stlal', 'EQ', stlal)]),
        leerTodoDe(modelo, 'MD_ES_RE_INSUMO', [new F('mdRecetaId_mdRecetaId', 'EQ', r.mdRecetaId)], {}),
        conRuta ? contextoRmd(ctrl, mdId).then((ctx) => revisarRuta(ctrl, rc, werks, ctx)).catch((e) => ({ error: e.message })) : Promise.resolve(null),
      ]);
      const dif = diferenciasBom(bom, copia.filter((x) => x.activo !== false));
      const rutaAvisa = !!(ruta && !ruta.error && (!ruta.existe || ruta.cambios.some((c) => c.avisa && !c.soloAnterior) || ruta.faltan.length || ruta.entran.length || ruta.salen.length));
      return { receta: `${rc.Matnr} / ${rc.Verid}`, codigo: norm(rc.Matnr), verid: norm(rc.Verid), texto: norm(rc.Text1 || ''), mdRecetaId: r.mdRecetaId, sap: bom.length, rmd: copia.length, dif, ruta, rutaAvisa };
    })();
    p.catch(() => revisionesReceta.delete(r.mdRecetaId)); revisionesReceta.set(r.mdRecetaId, { t: Date.now(), clave, p }); return p;
  }
  async function revisarRecetasDe(ctrl, asoc, forzar, filas) {
    const recetas = (filas || (asoc.aReceta && asoc.aReceta.results) || []).filter((r) => r && r.recetaId && r.activo !== false && r.mdRecetaId);
    const werks = asoc.sucursalId && asoc.sucursalId.codigo; if (forzar) contextosRmd.delete(asoc.mdId);
    const out = await Promise.all(recetas.map((r) => revisarReceta(ctrl, r, werks, asoc.mdId, forzar)));
    return { codigo: asoc.codigo, recetas: out, desactualizadas: out.filter((x) => x.dif.length), conRuta: out.filter((x) => x.rutaAvisa) };
  }
  const recetasDelRmd = (ctrl, asoc, forzar, filas) => revisarRecetasDe(ctrl, asoc, forzar, filas);
  const resumenDif = (dif) => { const c = (t) => dif.filter((d) => d.tipo === t).length, n = c('nuevo'), m = c('cambia'), q = c('quitado'), r = c('reemplazo');
    return [m && `${m} con otra cantidad o unidad`, r && `${r} reemplazado${r > 1 ? 's' : ''} por otra versión del material`, n && `${n} nuevo${n > 1 ? 's' : ''}`, q && `${q} quitado${q > 1 ? 's' : ''}`].filter(Boolean).join(', '); };
  function pintarAvisoRecetas(contenedor, antesDe, r) {
    let a = contenedor.querySelector(':scope > .rmd-receta-aviso') || contenedor.querySelector('.rmd-receta-aviso');
    const hay = r && (r.desactualizadas.length || r.conRuta.length);
    if (!hay) { if (a) a.remove(); return; }
    const partes = [];
    if (r.desactualizadas.length) partes.push(`⚠ <b>Lista de materiales actualizada en SAP</b> en ${r.desactualizadas.length} receta(s): ${r.desactualizadas.map((x) => `<b>${esc(x.receta)}</b> (${esc(resumenDif(x.dif))})`).join(' · ')}. Para traer la nueva: <b>Eliminar Receta</b> → <b>Agregar Producto</b> → asociarla de nuevo.`);
    if (r.conRuta.length) partes.push(`⚠ <b>Hoja de ruta o puesto de trabajo distinto en SAP</b> en ${r.conRuta.length} receta(s): ${r.conRuta.map((x) => `<b>${esc(x.receta)}</b>`).join(' · ')}.`);
    const html = partes.join('<br>') + ` <button type="button" class="rmd-link rmd-receta-detalle">Ver el detalle</button> <span class="rmd-nota">(también con el ⚠ junto al código). Es solo un aviso: no impide autorizar.</span>`;
    if (!a) { a = document.createElement('div'); a.className = 'rmd-receta-aviso'; if (antesDe) antesDe.insertAdjacentElement('beforebegin', a); else contenedor.prepend(a); }
    if (a.dataset.html !== html) { a.dataset.html = html; a.innerHTML = html; }
    a.__rmdRes = r;
    const bd = a.querySelector('.rmd-receta-detalle'); if (bd && !bd.__rmd) { bd.__rmd = true; bd.addEventListener('click', (e) => { e.stopPropagation(); abrirDetalleRecetas(bd, a.__rmdRes.recetas.filter((x) => x.dif.length || x.rutaAvisa), true); }); }
  }
  // Detalle: tarjeta flotante junto al icono (o al botón del aviso), con una tabla por receta
  function detalleRecetaHtml(x) {
    let h = `<div class="rmd-rec-cab"><b>${esc(x.receta)}</b> <span>${esc(x.texto)}</span></div>`;
    if (x.dif.length) {
      h += `<div class="rmd-rec-sub">Lista de materiales · ${esc(resumenDif(x.dif))} <span class="rmd-nota">(${x.rmd} componentes en el RMD, ${x.sap} en SAP hoy)</span></div>
        <table class="rmd-rec-tabla"><thead><tr><th></th><th>Componente</th><th>Descripción</th><th>En el RMD</th><th>En SAP hoy</th></tr></thead><tbody>${x.dif.map((d) => {
          const q = (v) => (v ? `${numTxt(v.q)} ${esc(v.u)}` : '—'), delta = d.tipo === 'cambia' && d.antes.u.toUpperCase() === d.ahora.u.toUpperCase() ? d.ahora.q - d.antes.q : null;
          const comp = d.tipo === 'reemplazo' ? `<span class="rmd-rec-antes">${esc(d.compAntes)}</span> → ${esc(d.comp)}` : esc(d.comp);
          const desc = d.tipo === 'reemplazo' ? `${esc(d.desc)}<br><span class="rmd-rec-antes">antes: ${esc(d.descAntes)}</span>` : esc(d.desc);
          const qa = d.tipo === 'reemplazo' && d.antes && d.ahora && Math.abs(d.antes.q - d.ahora.q) < 1e-6 && d.antes.u === d.ahora.u ? `${q(d.ahora)} <span class="rmd-nota">(igual)</span>` : q(d.ahora);
          return `<tr class="rmd-rec-${d.tipo}"><td><span class="rmd-rec-marca" title="${{ nuevo: 'Nuevo en SAP', cambia: 'Otra cantidad o unidad', quitado: 'Ya no está en SAP', reemplazo: 'Reemplazado por otra versión del material' }[d.tipo]}">${{ nuevo: '+', cambia: '≠', quitado: '−', reemplazo: '⇄' }[d.tipo]}</span></td><td>${comp}</td><td>${desc}</td><td>${q(d.antes)}</td><td>${qa}${delta ? ` <span class="rmd-rec-delta">(${delta > 0 ? '+' : ''}${numTxt(delta)})</span>` : ''}</td></tr>`; }).join('')}</tbody></table>`;
    }
    const ru = x.ruta;
    if (ru && ru.error) h += `<div class="rmd-rec-sub">Hoja de ruta: no se pudo leer (${esc(ru.error)})</div>`;
    else if (ru && x.rutaAvisa) {
      const va = ru.anteriorVersion != null ? `RMD v${esc(ru.anteriorVersion)}` : null, cs = ru.cambios.filter((c) => !c.soloAnterior || va);
      h += `<div class="rmd-rec-sub">Versión de fabricación y hoja de ruta${ru.existe ? '' : ' · <b class="rmd-rec-rojo">la versión ya no existe en SAP</b>'}</div>`;
      if (cs.length) h += `<table class="rmd-rec-tabla"><thead><tr><th>Dato</th><th>Asociada al RMD</th><th>En SAP hoy</th>${va ? `<th>${va} (anterior)</th>` : ''}</tr></thead><tbody>${cs.map((c) =>
        `<tr${c.avisa && !c.soloAnterior ? ' class="rmd-rec-cambia"' : ''}><td>${esc(c.campo)}${c.avisa ? '' : ' <span class="rmd-nota">(informativo)</span>'}</td><td>${esc(c.asociada)}</td><td>${c.sap == null ? '—' : esc(c.sap)}</td>${va ? `<td>${c.anterior == null ? '—' : esc(c.anterior)}</td>` : ''}</tr>`).join('')}</tbody></table>`;
      if (ru.faltan.length) h += `<p class="rmd-rec-linea rmd-rec-rojo">⚠ Puestos usados en los pasos del RMD que ya no están en la hoja de ruta: ${ru.faltan.map((f) => `<b>${esc(f.puesto)}</b> (${f.pasos} paso${f.pasos > 1 ? 's' : ''})`).join(', ')}.</p>`;
      if (ru.entran.length || ru.salen.length) h += `<p class="rmd-rec-linea">Puestos de la hoja de ruta: ${ru.entran.map((p) => `<span class="rmd-rec-nuevo">+ ${esc(p)}</span>`).join(' ')} ${ru.salen.map((p) => `<span class="rmd-rec-quitado">− ${esc(p)}</span>`).join(' ')}</p>`;
      if (ru.puestosRuta.length) h += `<p class="rmd-rec-linea rmd-nota">Hoja de ruta en SAP hoy: ${ru.puestosRuta.map(esc).join(', ')}.</p>`;
    }
    return h;
  }
  let detalleAbierto = null;
  function cerrarDetalleRecetas() { if (detalleAbierto) { detalleAbierto.remove(); detalleAbierto = null; } }
  function abrirDetalleRecetas(ancla, recetas, fijo) {
    if (detalleAbierto && detalleAbierto.__ancla === ancla) { if (fijo) { detalleAbierto.classList.toggle('fijo'); if (!detalleAbierto.classList.contains('fijo')) cerrarDetalleRecetas(); } return; }
    cerrarDetalleRecetas(); if (!recetas.length) return;
    const t = document.createElement('div'); t.className = 'rmd-rec-detalle' + (fijo ? ' fijo' : ''); t.setAttribute('role', 'dialog'); t.__ancla = ancla;
    t.innerHTML = recetas.map(detalleRecetaHtml).join('<hr>') + '<div class="rmd-rec-pie">Para traer lo nuevo: <b>Eliminar Receta</b> → <b>Agregar Producto</b> → asociarla de nuevo. Es solo un aviso: no impide autorizar. · Clic en ⚠ lo deja abierto; Esc o clic fuera lo cierra.</div>';
    html.appendChild(t); detalleAbierto = t;
    const q = ancla.getBoundingClientRect(), w = Math.min(760, innerWidth - 24); t.style.width = w + 'px';
    const alto = t.offsetHeight, x = Math.max(12, Math.min(q.left, innerWidth - w - 12)), y = q.bottom + 6 + alto > innerHeight - 8 ? Math.max(8, q.top - alto - 6) : q.bottom + 6;
    t.style.left = x + 'px'; t.style.top = y + 'px';
    t.addEventListener('mouseenter', () => { t.__dentro = true; }); t.addEventListener('mouseleave', () => { t.__dentro = false; if (!t.classList.contains('fijo')) setTimeout(() => { if (detalleAbierto === t && !t.__dentro && !ancla.matches(':hover')) cerrarDetalleRecetas(); }, 250); });
  }
  document.addEventListener('mousedown', (e) => { if (detalleAbierto && detalleAbierto.classList.contains('fijo') && !detalleAbierto.contains(e.target) && !(detalleAbierto.__ancla && detalleAbierto.__ancla.contains(e.target))) cerrarDetalleRecetas(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && detalleAbierto) { e.stopPropagation(); e.preventDefault(); cerrarDetalleRecetas(); } }, true);
  // Icono junto al código de cada receta con algo distinto en SAP
  function pintarIconosRecetas(lista, r) {
    const porId = new Map((r ? r.recetas : []).filter((x) => x.dif.length || x.rutaAvisa).map((x) => [x.mdRecetaId, x]));
    lista.getItems().forEach((it) => {
      const c = it.getBindingContext('listMdReceta'), o = c && c.getObject(), x = o && porId.get(o.mdRecetaId);
      const celda = it.getCells()[0], dom = celda && celda.getDomRef(); if (!dom) return;
      let ic = dom.parentElement.querySelector('.rmd-rec-icono');
      if (!x) { if (ic) ic.remove(); return; }
      const n = x.dif.length + (x.rutaAvisa ? 1 : 0), tit = [x.dif.length && `Lista de materiales: ${resumenDif(x.dif)}`, x.rutaAvisa && 'Hoja de ruta / puesto de trabajo distinto en SAP'].filter(Boolean).join(' · ');
      if (!ic) {
        ic = document.createElement('button'); ic.type = 'button'; ic.className = 'rmd-rec-icono'; dom.insertAdjacentElement('afterend', ic);
        ['pointerdown', 'mousedown', 'touchstart'].forEach((ev) => ic.addEventListener(ev, (e) => e.stopPropagation()));
        ic.addEventListener('mouseenter', () => { if (!detalleAbierto || !detalleAbierto.classList.contains('fijo')) abrirDetalleRecetas(ic, [ic.__rmdRes], false); });
        ic.addEventListener('mouseleave', () => setTimeout(() => { if (detalleAbierto && detalleAbierto.__ancla === ic && !detalleAbierto.classList.contains('fijo') && !detalleAbierto.__dentro) cerrarDetalleRecetas(); }, 250));
        ic.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); if (detalleAbierto && detalleAbierto.__ancla === ic) { detalleAbierto.classList.add('fijo'); return; } abrirDetalleRecetas(ic, [ic.__rmdRes], true); });
      }
      ic.__rmdRes = x; const txt = `⚠ ${n}`; if (ic.textContent !== txt) ic.textContent = txt; ic.title = tit + '. Pasa el ratón para ver el detalle.';
    });
  }
  // Ventana "Asociar Fórmula": botón "Revisar recetas" y revisión automática; se rehace cuando cambia la tabla de recetas
  function gestionarRecetasAsociar() {
    if (!on('recetas')) { document.querySelectorAll('.rmd-revisar-recetas, .rmd-receta-aviso, .rmd-rec-icono').forEach((e) => e.remove()); cerrarDetalleRecetas(); return; }
    const d = typeof sap !== 'undefined' && dialogos().find((x) => /^Asociar F[oó]rmula/i.test(cabecera(x))); const ctrl = d && controladorPrincipal();
    if (!ctrl) { if (detalleAbierto && !detalleAbierto.__ancla.isConnected) cerrarDetalleRecetas(); return; }
    const asoc = ctrl.getView().getModel('asociarDatos').getData(); if (!asoc || !asoc.mdId) return;
    const tabla = [...d.querySelectorAll('table.sapMListTbl')].pop(), lista = tabla && sap.ui.getCore().byId(tabla.id.replace(/-listUl$/, '')), cont = tabla && tabla.closest('.sapMList'), barra = cont && cont.querySelector('.sapMTB, .sapMListHdr');
    if (!lista || !lista.getBindingInfo('items') || lista.getBindingInfo('items').model !== 'listMdReceta') return;
    const filas = (((ctrl.getView().getModel('listMdReceta') || { getData: () => [] }).getData()) || []).filter((x) => x && x.recetaId && x.activo !== false);
    const revisar = (forzar) => recetasDelRmd(ctrl, asoc, forzar, filas);
    if (barra && !barra.querySelector('.rmd-revisar-recetas')) {
      const b = botonIcono(ICONO_DOCUMENTOS, 'Revisar recetas', 'rmd-revisar-recetas', async () => {
        b.disabled = true; d.__rmdRecetasFirma = null;
        try {
          const actuales = (((ctrl.getView().getModel('listMdReceta') || { getData: () => [] }).getData()) || []).filter((x) => x && x.recetaId && x.activo !== false);
          const r = await recetasDelRmd(ctrl, asoc, true, actuales); d.__rmdRecetasRes = r; pintarAvisoRecetas(cont, tabla, r); pintarIconosRecetas(lista, r);
          const hay = r.desactualizadas.length || r.conRuta.length;
          toast(hay ? `${r.desactualizadas.length} receta(s) con la lista de materiales cambiada${on('recetaruta') ? ` y ${r.conRuta.length} con la hoja de ruta distinta` : ''} en SAP: mira el ⚠ junto al código.` : `✓ Las ${r.recetas.length} receta(s) asociadas coinciden con SAP${on('recetaruta') ? ' (lista de materiales y hoja de ruta)' : ''}.`, hay > 0);
        } catch (e) { toast('No se pudieron revisar las recetas: ' + e.message, true); } finally { b.disabled = false; }
      });
      b.title = 'Compara con SAP la lista de materiales copiada al asociar cada receta' + (on('recetaruta') ? ' y su hoja de ruta / puesto de trabajo' : '') + ' (solo avisa; no cambia nada ni impide autorizar).';
      const ref = barra.querySelector('.sapMTBSpacer'); if (ref) ref.insertAdjacentElement('afterend', b); else barra.appendChild(b);
    }
    const firma = asoc.mdId + '|' + (on('recetaruta') ? 'r' : 'b') + '|' + filas.map((x) => x.mdRecetaId).sort().join(',');
    if (d.__rmdRecetasFirma !== firma) {                                   // al abrir, o si se eliminó / agregó una receta
      d.__rmdRecetasFirma = firma;
      revisar(false).then((r) => { if (d.isConnected && d.__rmdRecetasFirma === firma) { d.__rmdRecetasRes = r; pintarAvisoRecetas(cont, tabla, r); pintarIconosRecetas(lista, r); } }, () => {});
    } else if (d.__rmdRecetasRes) { pintarAvisoRecetas(cont, tabla, d.__rmdRecetasRes); pintarIconosRecetas(lista, d.__rmdRecetasRes); }   // UI5 volvió a dibujar la tabla
  }
  // También en la ventana raíz del RMD (aviso junto al del orden de estructuras)
  function avisoRecetasRaiz(d, tabla) {
    if (!on('recetas') || typeof sap === 'undefined') return;
    const vista = vistaDeTabla(tabla), asoc = vista && vista.getModel('asociarDatos'), md = asoc && asoc.getData(), ctrl = controladorPrincipal();
    if (!md || !md.mdId || !ctrl || !md.aReceta) return;
    recetasDelRmd(ctrl, md).then((r) => { const barra = barraDeLista(tabla); if (d.isConnected && barra) pintarAvisoRecetas(barra.parentElement, tabla, r); }, () => {});
  }
  window.__rmdStats.revisarRecetas = async (codigo, conRuta) => {
    const ctrl = controladorPrincipal(), md = (await leerMDPorCodigos(ctrl.getView().getModel('mainModelv2'), [codigo]))[0]; if (!md) throw new Error('no existe ' + codigo);
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const recs = await leerTodoDe(ctrl.getView().getModel('mainModelv2'), 'MD_RECETA', [new Filtro('mdId_mdId', 'EQ', md.mdId)], { $expand: 'recetaId' });
    const suc = await leerTodoDe(ctrl.getView().getModel('mainModelv2'), 'MD', [new Filtro('mdId', 'EQ', md.mdId)], { $expand: 'sucursalId', $select: 'mdId,sucursalId/codigo' });
    const antes = opc.recetaruta; if (conRuta != null) opc.recetaruta = !!conRuta;
    try { return await revisarRecetasDe(ctrl, { mdId: md.mdId, codigo, aReceta: { results: recs }, sucursalId: suc[0] && suc[0].sucursalId }, true); } finally { opc.recetaruta = antes; }
  };
  window.__rmdStats.diferenciasBom = diferenciasBom; window.__rmdStats.detalleRecetaHtml = detalleRecetaHtml; window.__rmdStats.contextoRmd = (mdId) => contextoRmd(controladorPrincipal(), mdId).then((c) => ({ puestos: [...c.puestos.entries()], anterior: c.anterior }));   // (pruebas)

  // ---- "Adicionar Pasos": un mismo paso n veces en la barra de seleccionados (v1.25) ----
  // La barra de arriba de la tabla (tokens) es el modelo aSeleccionadoPaso y el Agregar del portal (onAsignPasoToEstructura) agrega
  // sus pasos EN ESE ORDEN, uno por elemento: basta con que el mismo paso pueda estar varias veces. Cada token lleva un "+" que pone
  // otra copia justo a su lado (3 | 2 | 2 | 2 | 2 | 204) y los tokens se pueden arrastrar para cambiar el orden. El portal quitaba
  // los repetidos al marcar otra fila y desmarcaba la fila al quitar una sola copia: se conservan las copias.
  // (v1.24 dejaba la ventana abierta tras Agregar y ponía una nota en el pie que empujaba los botones fuera de la pantalla: retirado)
  const RUTA_SEL = 'aSeleccionadoPaso';
  function modeloSel(c) { return c && c.getModel && c.getModel(RUTA_SEL); }
  function fijarSel(m, arr) { arr.forEach((x, i) => { x.pos = i + 1; }); m.setData(arr); m.refresh(true); }
  function parchearEvento(c, evento, hacer) {
    const reg = c && ((c.mEventRegistry || {})[evento] || [])[0]; if (!reg) return;
    if (!on('repetirpaso')) { if (reg.fFunction.__rmdOrig) reg.fFunction = reg.fFunction.__rmdOrig; return; }
    if (reg.fFunction.__rmdOrig) return;
    const orig = reg.fFunction, w = function () { return hacer.call(this, orig, arguments); }; w.__rmdOrig = orig; reg.fFunction = w;
  }
  function gestionarSelectorPasos() {
    const d = dialogos().find((x) => /^Adicionar Pasos/i.test(cabecera(x))); if (!d || typeof sap === 'undefined') return;
    d.classList.toggle('rmd-selector-ancho', on('ancho'));
    d.querySelectorAll('.rmd-nota-repetir').forEach((n) => n.remove());
    const core = sap.ui.getCore(), tabla = core.byId('frgAdicNewMdPasos--idTblPaso');
    const mi = [...d.querySelectorAll('.sapMMultiInput')].map((x) => core.byId(x.id)).find((c) => c && c.getBindingInfo && (c.getBindingInfo('tokens') || {}).model === RUTA_SEL);
    if (!tabla || !mi) return;
    // marcar / desmarcar filas: el portal deja un solo elemento por paso; aquí se conservan las copias y su orden
    parchearEvento(tabla, 'selectionChange', function (orig, args) {
      const m = modeloSel(tabla), antes = ((m && m.getData()) || []).slice(), e = args[0];
      const it = e && e.getParameter && e.getParameter('listItem'), sel = it && it.getSelected(), ctx = it && it.getBindingContext('aListPaso'), o = ctx && ctx.getObject();
      const r = orig.apply(this, args); if (!m) return r;
      const despues = m.getData() || [];
      let lista;
      if (o && !sel) lista = antes.filter((x) => x.codigo !== o.codigo);                       // desmarcar la fila quita todas sus copias
      else { const cods = new Set(despues.map((x) => x.codigo)), quedan = antes.filter((x) => cods.has(x.codigo)), ya = new Set(quedan.map((x) => x.codigo)); lista = quedan.concat(despues.filter((x) => !ya.has(x.codigo))); }
      if (lista.length !== despues.length || lista.some((x, i) => x !== despues[i])) fijarSel(m, lista);
      return r;
    });
    // quitar un token (×): se quita esa copia; la fila sigue marcada mientras quede otra copia del paso
    parchearEvento(mi, 'tokenUpdate', function (orig, args) {
      const e = args[0], quitados = ((e && e.getParameter && e.getParameter('removedTokens')) || []).map((t) => Number(t.getKey()));
      const r = orig.apply(this, args), m = modeloSel(mi); if (!m) return r;
      const arr = (m.getData() || []).slice(), quedan = new Set(arr.map((x) => x.codigo));
      tabla.getItems().forEach((it) => { const c = it.getBindingContext('aListPaso'), ob = c && c.getObject(); if (ob && quitados.includes(ob.codigo) && quedan.has(ob.codigo)) it.setSelected(true); });
      fijarSel(m, arr); return r;
    });
    if (!on('repetirpaso')) { d.querySelectorAll('.rmd-token-mas').forEach((b) => b.remove()); d.querySelectorAll('.sapMToken[draggable]').forEach((t) => { t.removeAttribute('draggable'); t.classList.remove('rmd-token-rep'); }); return; }
    const indice = (tokDom) => { const t = core.byId(tokDom.id), c = t && t.getBindingContext(RUTA_SEL); return c ? +String(c.getPath()).split('/').pop() : -1; };
    d.querySelectorAll('.sapMToken').forEach((tk) => {
      if (tk.querySelector('.rmd-token-mas')) return;
      const b = document.createElement('span'); b.className = 'rmd-token-mas'; b.textContent = '+'; b.title = 'Repetir este paso: agrega otra copia justo a su lado'; b.setAttribute('role', 'button');
      ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'dblclick'].forEach((ev) => b.addEventListener(ev, (x) => { x.stopPropagation(); x.preventDefault(); }));
      b.addEventListener('click', (x) => {
        x.stopPropagation(); x.preventDefault();
        const m = modeloSel(mi), i = indice(tk); if (!m || i < 0) return;
        const arr = (m.getData() || []).slice(); arr.splice(i + 1, 0, Object.assign({}, arr[i])); fijarSel(m, arr);
        const n = arr.filter((y) => y.codigo === arr[i].codigo).length; toast(`Paso ${arr[i].codigo}: ${n} veces en la lista. Agregar los agrega en el orden de la barra.`);
      });
      const txt = tk.querySelector('.sapMTokenText'); if (txt) txt.after(b); else tk.appendChild(b); tk.classList.add('rmd-token-rep');
      // arrastrar un token para cambiar el orden
      tk.setAttribute('draggable', 'true');
      tk.addEventListener('dragstart', (x) => { x.stopPropagation(); x.dataTransfer.effectAllowed = 'move'; x.dataTransfer.setData('text/plain', String(indice(tk))); tk.classList.add('rmd-token-arrastre'); });
      tk.addEventListener('dragend', () => tk.classList.remove('rmd-token-arrastre'));
      tk.addEventListener('dragover', (x) => { x.preventDefault(); x.dataTransfer.dropEffect = 'move'; tk.classList.add('rmd-token-destino'); });
      tk.addEventListener('dragleave', () => tk.classList.remove('rmd-token-destino'));
      tk.addEventListener('drop', (x) => {
        x.preventDefault(); x.stopPropagation(); tk.classList.remove('rmd-token-destino');
        const de = +x.dataTransfer.getData('text/plain'), a = indice(tk), m = modeloSel(mi); if (!m || de < 0 || a < 0 || de === a) return;
        const arr = (m.getData() || []).slice(), [el] = arr.splice(de, 1); arr.splice(a, 0, el); fijarSel(m, arr);
      });
    });
  }
  // ---- RMD en vivo (v1.24, opción apagada por defecto; v1.25: salta a lo que cambió, lo resalta un momento y recarga sin parpadeo) ----
  // Con la configuración de un RMD abierta, la mitad derecha de la pantalla muestra el PDF del RMD (el mismo que genera el portal
  // con "Imprimir" / "Ver master", con pdfMake) y se vuelve a generar solo después de cada cambio guardado. Las ventanas de
  // configuración pasan a la mitad izquierda.
  // Qué cambió: se guarda una copia del documento de pdfMake (antes de que pdfMake lo procese) y se compara con el anterior por
  // bloques de texto (celdas de tabla y textos, en orden): lo que difiere se pinta de amarillo en una segunda versión del PDF
  // (pdfMake tarda <1 s) y, tras maquetarla, pdfMake deja en cada bloque su página y altura → el visor abre ahí (#page=&view=FitH,y).
  // Unos segundos después se funde con la versión normal (el resaltado se desvanece). Cada versión nueva se carga detrás y aparece
  // con un fundido cuando el visor ya la tiene, sin pantalla en blanco. Si el documento no cambió, no se recarga.
  const vivo = { urls: [], panel: null, pendiente: null, generando: false, otraVez: false, mdId: null, t: 0, bloques: null, cab: '', cambio: null, fundido: null };
  const VIVO_COLOR = '#ffe066', VIVO_COLOR_BORRADO = '#ffb4a8', VIVO_RESALTE_MS = 2800;
  function clonarDoc(x) {
    if (Array.isArray(x)) return x.map(clonarDoc);
    if (x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype) { const o = {}; for (const k of Object.keys(x)) o[k] = clonarDoc(x[k]); return o; }
    return x;
  }
  function textoNodo(n) {
    if (n == null) return ''; if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(textoNodo).join(' ');
    if (typeof n !== 'object') return '';
    if (n.text !== undefined) return textoNodo(n.text);
    if (n.table) return (n.table.body || []).map((f) => (f || []).map(textoNodo).join(' ')).join(' ');
    return textoNodo(n.stack || n.columns || n.ul || n.ol || '');
  }
  const conTabla = (n) => !!n && typeof n === 'object' && (Array.isArray(n) ? n.some(conTabla) : !!(n.table || conTabla(n.stack) || conTabla(n.columns)));
  // bloques del documento en orden de lectura: { s: texto, holder, key, celda } (holder[key] es el nodo, para poder resaltarlo)
  function bloquesDoc(content) {
    const out = [];
    const add = (holder, key, celda) => { const s = norm(textoNodo(holder[key])); if (s) out.push({ s, holder, key, celda }); };
    const visitar = (holder, key) => {
      const n = holder[key]; if (n == null) return;
      if (Array.isArray(n)) { n.forEach((_, i) => visitar(n, i)); return; }
      if (typeof n !== 'object') { add(holder, key, false); return; }
      if (n.table) { (n.table.body || []).forEach((fila) => (fila || []).forEach((c, j) => { if (conTabla(c)) visitar(fila, j); else add(fila, j, true); })); return; }
      for (const k of ['stack', 'columns', 'ul', 'ol']) if (n[k]) { visitar(n, k); return; }
      if (n.text !== undefined) add(holder, key, false);
    };
    visitar({ c: content }, 'c');
    return out;
  }
  // tramo de bloques nuevos que difiere del documento anterior (los números se ignoran al buscar el tramo, porque insertar un paso
  // renumera todo lo que sigue; si solo cambiaron números, el primero que cambió — sin contar fechas y horas)
  function tramoCambiado(viejos, nuevos) {
    const a = viejos, b = nuevos, sn = (x) => x.replace(/\d+/g, '#');
    let p = 0; while (p < a.length && p < b.length && sn(a[p]) === sn(b[p])) p++;
    let s = 0; while (s < a.length - p && s < b.length - p && sn(a[a.length - 1 - s]) === sn(b[b.length - 1 - s])) s++;
    if (b.length - s > p) {
      if (a.length - s > p) return { desde: p, hasta: b.length - s, tipo: 'cambio' };
      let d = p, h = b.length - s; while (d > 0 && sn(b[d - 1]) === sn(b[h - 1])) { d--; h--; }   // inserción: lo más arriba posible (la fila entera, con su número)
      return { desde: d, hasta: h, tipo: 'nuevo' };
    }
    if (a.length - s > p) { const i = Math.max(0, Math.min(p, b.length - 1)); return b.length ? { desde: i, hasta: i + 1, tipo: 'borrado' } : null; }
    const fecha = /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}:\d{2}/;
    for (let i = 0; i < b.length; i++) if (a[i] !== b[i] && !(fecha.test(a[i]) && fecha.test(b[i]))) return { desde: i, hasta: i + 1, tipo: 'cambio' };
    return null;
  }
  function firmaCabecera(dd) { try { return typeof dd.header === 'function' ? norm(textoNodo(dd.header(1, 1, { width: 595.28, height: 841.89 }))) : norm(textoNodo(dd.header)); } catch (e) { return ''; } }
  function blobDe(pm, dd) {
    return new Promise((ok, mal) => {
      const t = setTimeout(() => mal(new Error('pdfMake no respondió')), 30000);
      try { const r = pm.createPdf(dd).getBlob((b) => { clearTimeout(t); ok(b); }); if (r && r.then) r.then((b) => { clearTimeout(t); ok(b); }, mal); } catch (e) { clearTimeout(t); mal(e); }
    });
  }
  function panelVivo() {
    if (vivo.panel && vivo.panel.isConnected) return vivo.panel;
    const p = document.createElement('div'); p.className = 'rmd-vivo-panel';
    p.innerHTML = '<div class="rmd-vivo-cab"><b>RMD en vivo</b><span class="rmd-vivo-estado"></span><button type="button" class="rmd-btn rmd-vivo-ir" hidden>Ir al cambio</button><button type="button" class="rmd-btn rmd-vivo-act">Actualizar</button></div><div class="rmd-vivo-barra"></div><div class="rmd-vivo-marco"></div>';
    p.querySelector('.rmd-vivo-act').addEventListener('click', () => generarVivo(true));
    p.querySelector('.rmd-vivo-ir').addEventListener('click', () => { if (vivo.cambio) mostrarCambio(vivo.cambio); });
    document.documentElement.appendChild(p); vivo.panel = p; return p;
  }
  // carga el PDF en un visor nuevo detrás del actual y lo funde encima cuando ya está cargado
  function cargarPdf(url, frag) {
    const p = panelVivo(), marco = p.querySelector('.rmd-vivo-marco');
    return new Promise((ok) => {
      const f = document.createElement('iframe'); f.className = 'rmd-vivo-pdf'; f.title = 'RMD en vivo';
      let hecho = false;
      const listo = () => {
        if (hecho) return; hecho = true;
        setTimeout(() => {
          const viejos = [...marco.querySelectorAll('iframe.rmd-vivo-pdf')].filter((x) => x !== f);
          f.classList.add('activo'); viejos.forEach((x) => { x.classList.remove('activo'); setTimeout(() => x.remove(), 600); });
          ok(f);
        }, 450);                                                                          // el visor pinta la página un instante después de "load"
      };
      f.addEventListener('load', listo); setTimeout(listo, 8000);
      f.src = url + frag; marco.appendChild(f);
    });
  }
  // "view=FitH,y": y en puntos desde el borde superior de la página; el visor deja ese punto a ~1/4 de su alto (con contexto encima)
  const fragmento = (c) => (c && c.pagina ? `#page=${c.pagina}&view=FitH,${Math.max(0, Math.round(c.y - 10))}&navpanes=0` : '#view=FitH&navpanes=0');
  async function mostrarCambio(c) {
    clearTimeout(vivo.fundido);
    await cargarPdf(c.urlResaltado || c.url, fragmento(c));
    if (!c.urlResaltado) return;
    vivo.fundido = setTimeout(() => {                                                // si la persona hizo clic en el PDF (pudo desplazarse), no se le mueve
      const f = vivo.panel && vivo.panel.querySelector('iframe.rmd-vivo-pdf.activo'); if (vivo.cambio === c && !(f && document.activeElement === f)) cargarPdf(c.url, fragmento(c));
    }, VIVO_RESALTE_MS);
  }
  function guardarUrl(u) { vivo.urls.push(u); while (vivo.urls.length > 4) { const v = vivo.urls.shift(); setTimeout(() => URL.revokeObjectURL(v), 8000); } }
  async function generarVivo(recargar) {
    const ctrl = controladorPrincipal(); if (!ctrl) return;
    if (vivo.generando) { vivo.otraVez = true; return; }
    const asoc = ctrl.getView().getModel('asociarDatos'), md = asoc && asoc.getData(); if (!md || !md.mdId || !md.aEstructura) return;
    vivo.generando = true; const p = panelVivo(), est = p.querySelector('.rmd-vivo-estado'); setTxt(est, 'Generando…'); p.classList.add('generando');
    const pm = window.pdfMake, cp0 = pm && pm.createPdf, open0 = window.open, cou0 = URL.createObjectURL; let blob = null, limpio = null;
    try {
      if (recargar) { try { await ctrl.onGetDataEstructuraMD(); } catch (e) { /* se genera con lo que hay */ } }
      window.open = () => ({ document: { write() {}, close() {}, open() {} }, focus() {}, close() {}, print() {}, location: {} });
      URL.createObjectURL = function (b) { if (b && b.type === 'application/pdf') blob = b; return cou0.apply(this, arguments); };
      if (cp0) pm.createPdf = function (dd) { if (!limpio) { try { limpio = clonarDoc(dd); } catch (e) { /* sin copia: sin resaltado */ } } return cp0.apply(this, arguments); };
      await ctrl.onCompletarAsociarDatos(); await ctrl.tratarInformacion(false, true);
      await hasta(() => blob, 20000, 150);
    } catch (e) { setTxt(est, 'No se pudo generar: ' + e.message); }
    finally {
      window.open = open0; URL.createObjectURL = cou0; if (cp0) pm.createPdf = cp0;
      try { sap.ui.core.BusyIndicator.hide(); } catch (e) { /* sin UI5 */ }
    }
    try {
      if (!blob) return;
      const nuevoRmd = vivo.mdId !== md.mdId, bloques = limpio ? bloquesDoc(limpio.content) : null, cab = limpio ? firmaCabecera(limpio) : '';
      const previos = nuevoRmd ? null : vivo.bloques, cabPrev = nuevoRmd ? null : vivo.cab;
      vivo.mdId = md.mdId; vivo.t = Date.now(); vivo.bloques = bloques && bloques.map((x) => x.s); vivo.cab = cab;
      const h = new Date(), hora = `${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}:${String(h.getSeconds()).padStart(2, '0')}`;
      const tramo = previos && bloques ? tramoCambiado(previos, vivo.bloques) : null;
      const primera = !p.querySelector('iframe.rmd-vivo-pdf');
      if (!primera && previos && bloques && !tramo && cab === cabPrev) { setTxt(est, `${md.codigo || ''} · sin cambios en el documento (${hora})`); return; }
      const url = cou0.call(URL, blob); guardarUrl(url);
      if (!tramo) { vivo.cambio = null; p.querySelector('.rmd-vivo-ir').hidden = true; await cargarPdf(url, fragmento(null)); setTxt(est, `${md.codigo || ''} · actualizado ${hora}`); return; }
      // versión resaltada: mismo documento con los bloques cambiados en amarillo (o rojizo donde se quitó algo)
      const dd2 = clonarDoc(limpio), marcados = bloquesDoc(dd2.content).slice(tramo.desde, Math.min(tramo.hasta, tramo.desde + 400)), color = tramo.tipo === 'borrado' ? VIVO_COLOR_BORRADO : VIVO_COLOR;
      const nodos = marcados.map((u) => { let n = u.holder[u.key]; if (!n || typeof n !== 'object') { n = { text: String(n) }; u.holder[u.key] = n; } if (u.celda) n.fillColor = color; else n.background = color; return n; });
      let urlResaltado = null;
      try { urlResaltado = cou0.call(URL, await blobDe(pm, dd2)); guardarUrl(urlResaltado); } catch (e) { /* sin resaltado: se muestra el normal en el sitio del cambio */ }
      const pos = nodos.map((n) => n.positions && n.positions[0]).find(Boolean);
      const cambio = { url, urlResaltado, pagina: pos && pos.pageNumber, y: pos ? pos.top : 0, tipo: tramo.tipo, texto: marcados[0] ? marcados[0].s : '' };
      vivo.cambio = cambio; p.querySelector('.rmd-vivo-ir').hidden = !pos;
      const que = { nuevo: 'Agregado', cambio: 'Modificado', borrado: 'Se quitó contenido junto a' }[tramo.tipo];
      setTxt(est, `${md.codigo || ''} · ${hora} · ${que}${pos ? ` (pág. ${pos.pageNumber})` : ''}: ${cambio.texto.slice(0, 70)}${cambio.texto.length > 70 ? '…' : ''}`); est.title = cambio.texto;
      await mostrarCambio(cambio);
    } finally {
      vivo.generando = false; p.classList.remove('generando');
      if (vivo.otraVez) { vivo.otraVez = false; programarVivo(); }
    }
  }
  window.__rmdStats.vivo = { bloquesDoc, tramoCambiado, cambio: () => vivo.cambio && Object.assign({}, vivo.cambio, { fragmento: fragmento(vivo.cambio) }) };   // (pruebas)
  function programarVivo() { clearTimeout(vivo.pendiente); vivo.pendiente = setTimeout(async () => { await hasta(() => !ocupadoGlobal(), 20000); generarVivo(false); }, 2500); }
  function gestionarVivo() {
    const raiz = dialogos().find((x) => /^\d{6,}\s*-/.test(cabecera(x)) && /^Estructura de RMD\b/i.test(norm((barraDeLista(tablaDe(x) || x) || {}).textContent)));
    const activo = on('vivo') && !!raiz;
    html.classList.toggle('rmd-vivo', activo);
    if (!activo) {
      if (vivo.panel) { vivo.panel.remove(); vivo.panel = null; }
      clearTimeout(vivo.fundido); vivo.urls.forEach((u) => URL.revokeObjectURL(u)); vivo.urls = []; vivo.mdId = null; vivo.bloques = null; vivo.cambio = null; return;
    }
    raiz.classList.add('rmd-raiz');
    const ctrl = controladorPrincipal(), m = ctrl && ctrl.getView().getModel('mainModelv2'), md = ctrl && ctrl.getView().getModel('asociarDatos').getData();
    if (m && !m.__rmdVivo) { m.__rmdVivo = true; m.attachRequestCompleted((e) => { const met = String((e.getParameter('method') || '')).toUpperCase(); if (on('vivo') && html.classList.contains('rmd-vivo') && met && met !== 'GET' && met !== 'HEAD') programarVivo(); }); }
    panelVivo();
    if (md && md.mdId && vivo.mdId !== md.mdId && !vivo.generando) generarVivo(false);
  }
  // ---- Fórmulas: reordenar los términos (v1.25) ----
  // La lista de abajo de "Fórmulas" es localModel>/aListFormulaPasoDisponibleSeleccionados y el Guardar del portal (onTxFormulaPaso)
  // graba el orden de cada término según su posición: basta con moverlos aquí (Subir / Bajar o Alt+↑ / Alt+↓) y pulsar Guardar.
  const RUTA_FORMULA = '/aListFormulaPasoDisponibleSeleccionados';
  function listaFormula(d) {
    return [...d.querySelectorAll('.sapMList')].map((x) => sap.ui.getCore().byId(x.id)).find((l) => { const bi = l && l.getBindingInfo && l.getBindingInfo('items'); return bi && bi.path === RUTA_FORMULA; });
  }
  function moverTermino(d, paso) {
    const lista = listaFormula(d); if (!lista) return;
    const bi = lista.getBindingInfo('items'), lm = lista.getModel(bi.model), arr = lm.getProperty(RUTA_FORMULA) || [];
    const sel = lista.getSelectedItem(); if (!sel) { toast('Marca el término de la fórmula que quieres mover.', true); return; }
    const i = +String(sel.getBindingContext(bi.model).getPath()).split('/').pop(), j = i + paso;
    if (isNaN(i) || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    lm.setProperty(RUTA_FORMULA, arr); lm.refresh(true);
    const it = lista.getItems()[j]; if (it) lista.setSelectedItem(it, true);
    const reg = [...d.querySelectorAll('button')].map((x) => sap.ui.getCore().byId(x.id.replace(/-inner$/, ''))).map((c) => c && ((c.mEventRegistry || {}).press || [])[0]).find((r) => r && r.oListener && r.oListener._mssgPrintFormula);
    if (reg) reg.oListener._mssgPrintFormula(arr);   // el mismo texto de la fórmula que arma el portal
  }
  function gestionarFormulas() {
    const d = typeof sap !== 'undefined' && dialogos().find((x) => /^F[oó]rmulas$/i.test(cabecera(x)));
    if (!d || !on('formulas')) { document.querySelectorAll('.rmd-formula-orden').forEach((e) => e.remove()); return; }
    const lista = listaFormula(d); if (!lista) return;
    const barra = lista.getDomRef() && lista.getDomRef().querySelector('.sapMTB, .sapMListHdr'); if (!barra || barra.querySelector('.rmd-formula-orden')) return;
    const g = document.createElement('span'); g.className = 'rmd-formula-orden';
    const sub = botonModal('▲ Subir', '', () => moverTermino(d, -1)), baj = botonModal('▼ Bajar', '', () => moverTermino(d, 1));
    sub.title = 'Sube el término marcado (Alt+↑). El nuevo orden se graba al pulsar Guardar.'; baj.title = 'Baja el término marcado (Alt+↓). El nuevo orden se graba al pulsar Guardar.';
    g.append(sub, baj);
    const ref = barra.querySelector('.sapMTBSeparator') || barra.querySelector('.sapMInputBase'); if (ref) ref.insertAdjacentElement('beforebegin', g); else barra.appendChild(g);
    if (!d.__rmdTeclasFormula) { d.__rmdTeclasFormula = true; d.addEventListener('keydown', (e) => { if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moverTermino(d, e.key === 'ArrowUp' ? -1 : 1); } }, true); }
  }

  // ---- Producción Estatus: a quién se envió a revisión (v1.25) ----
  // Cada RMD enviado trae sus destinatarios (destinatariosMD: DJEFPROD = jefe de producción, DGERPROD = gerente); el nombre sale de
  // USUARIO. Se muestra junto al icono de la columna "Producción Estatus".
  const nombresUsuario = new Map(); let pidiendoUsuarios = null;
  function nombreDe(u) { return norm([u.nombre, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ')) || norm(u.nombreMostrar || u.usuario || ''); }
  function pedirUsuarios(modelo, ids) {
    const faltan = ids.filter((id) => !nombresUsuario.has(id)); if (!faltan.length || pidiendoUsuarios) return;
    faltan.forEach((id) => nombresUsuario.set(id, null));
    pidiendoUsuarios = leerPorIds(modelo, 'USUARIO', 'usuarioId', faltan, { $select: 'usuarioId,usuario,nombre,apellidoPaterno,apellidoMaterno,nombreMostrar' })
      .then((us) => us.forEach((u) => nombresUsuario.set(u.usuarioId, nombreDe(u))), () => faltan.forEach((id) => nombresUsuario.delete(id)))
      .finally(() => { pidiendoUsuarios = null; setTimeout(gestionarRevisores, 0); });   // (los nombres llegan después de pintar la lista)
  }
  function gestionarRevisores() {
    const tabla = [...document.querySelectorAll('table.sapMListTbl')].find((t) => visible(t) && !t.closest('.sapMDialog'));
    if (!tabla || !on('revisor') || typeof sap === 'undefined') { document.querySelectorAll('.rmd-revisor').forEach((e) => e.remove()); return; }
    const i = columnas(tabla).indexOf('PRODUCCIÓN ESTATUS'); if (i < 0) return;
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'); if (!modelo) return;
    const filas = filasPrincipales(tabla).map((tr) => ({ tr, o: objetoDeFila(tr) })).filter((x) => x.o);
    const ids = [];
    filas.forEach(({ o }) => ((o.destinatariosMD && o.destinatariosMD.results) || []).forEach((x) => { if (/^DJEFPROD|^DGERPROD/.test(x.tipo || '') && x.activo !== false) ids.push(x.usuarioId_usuarioId); }));
    pedirUsuarios(modelo, [...new Set(ids)]);
    filas.forEach(({ tr, o }) => {
      const td = celda(tr, i); if (!td) return;
      const ds = ((o.destinatariosMD && o.destinatariosMD.results) || []).filter((x) => x.activo !== false);
      const de = (tipo) => [...new Set(ds.filter((x) => (x.tipo || '').startsWith(tipo)).map((x) => nombresUsuario.get(x.usuarioId_usuarioId)).filter(Boolean))];
      const jefe = de('DJEFPROD'), gerente = de('DGERPROD');
      const texto = [jefe.length && 'Jefe: ' + jefe.join(', '), gerente.length && 'Gerente: ' + gerente.join(', ')].filter(Boolean).join(' · ');
      let s = td.querySelector('.rmd-revisor');
      if (!texto) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('span'); s.className = 'rmd-revisor'; td.appendChild(s); }
      if (s.textContent !== texto) { s.textContent = texto; s.title = 'Enviado a revisión a: ' + texto; }
    });
  }

  // ---- Recetas asociadas: eliminar varias a la vez (v1.25) y no asociar recetas de otro puesto de trabajo ----
  function gestionarRecetasMultiples() {
    const d = typeof sap !== 'undefined' && dialogos().find((x) => /^Asociar F[oó]rmula/i.test(cabecera(x))); const ctrl = d && controladorPrincipal(); if (!ctrl) return;
    const t = [...d.querySelectorAll('table.sapMListTbl')].pop(), lista = t && sap.ui.getCore().byId(t.id.replace(/-listUl$/, '')); if (!lista) return;
    const bi = lista.getBindingInfo('items'); if (!bi || bi.model !== 'listMdReceta') return;
    const barra = lista.getDomRef() && lista.getDomRef().querySelector('.sapMTB, .sapMListHdr');
    if (!on('recetasvarias')) { if (lista.__rmdModo) { lista.setMode(lista.__rmdModo); delete lista.__rmdModo; } d.querySelectorAll('.rmd-borrar-recetas').forEach((e) => e.remove()); return; }
    if (!lista.__rmdModo) { lista.__rmdModo = lista.getMode(); if (lista.getMode() !== 'MultiSelect') lista.setMode('MultiSelect'); }
    if (barra && !barra.querySelector('.rmd-borrar-recetas')) {
      const b = botonModal('Eliminar seleccionadas', 'peligro', () => borrarRecetasSeleccionadas(ctrl, lista)); b.classList.add('rmd-borrar-recetas');
      b.title = 'Elimina de una vez las recetas marcadas (con el mismo proceso del botón Eliminar Receta de cada fila).';
      const ref = barra.querySelector('.sapMTBSpacer'); if (ref) ref.insertAdjacentElement('afterend', b); else barra.appendChild(b);
    }
    const n = lista.getSelectedItems().length, b = barra && barra.querySelector('.rmd-borrar-recetas');
    if (b) { b.disabled = !n; const tx = n ? `Eliminar seleccionadas (${n})` : 'Eliminar seleccionadas'; if (b.textContent !== tx) b.textContent = tx; }
  }
  async function borrarRecetasSeleccionadas(ctrl, lista) {
    const sel = lista.getSelectedItems().map((it) => it.getBindingContext('listMdReceta').getObject()); if (!sel.length) return;
    const ok = await confirmar(`¿Eliminar ${sel.length} receta(s)?`, sel.map((r) => `${r.recetaId.Matnr} / ${r.recetaId.Verid} ${norm(r.recetaId.Text1 || '')}`).join(' · '),
      'Se quitan del RMD igual que con "Eliminar Receta" en cada fila (si el RMD está autorizado, también se anula su documento en el DMS).', { si: `Eliminar ${sel.length}`, no: 'Cancelar', peligro: true });
    if (!ok) return;
    const asoc = ctrl.getView().getModel('asociarDatos'), autorizado = String(asoc.getData().estadoIdRmd_iMaestraId) === '465';
    try {
      for (const r of sel) {
        await ctrl.onBorrarRecetasAsignada(r);
        if (autorizado) { const nombre = await ctrl.generarNombre(r); await ctrl.sendDMS(nombre, '', 'ANULAR'); }
      }
      await ctrl._updateModelRest(); await ctrl.onGetMdRecetaGeneral(); await ctrl.onGetDataInitial();
      ctrl.getView().getModel('listMdReceta').refresh(true); await ctrl.actualizarCabeceraAsociarDatos();
      lista.removeSelections(true); toast(`Se eliminaron ${sel.length} receta(s).`);
    } catch (e) { toast('No se pudieron eliminar todas: ' + ((e && (e.message || e.responseText)) || e), true); }
    finally { try { sap.ui.core.BusyIndicator.hide(); } catch (e) { /* sin UI5 */ } }
  }
  // Al asociar recetas ("Agregar Producto"), todas deben tener el mismo puesto de trabajo (Mdv01) que las ya asociadas.
  function gestionarPuestoRecetas() {
    const t = typeof sap !== 'undefined' && sap.ui.getCore().byId('frgAsocRecetas--idTblRecetas'), dom = t && t.getDomRef(); if (!dom || !visible(dom)) return;
    const d = enDialogo(dom), ctrl = controladorPrincipal(); if (!d || !ctrl) return;
    const reg = [...d.querySelectorAll('button')].map((x) => sap.ui.getCore().byId(x.id.replace(/-inner$/, ''))).map((c) => c && ((c.mEventRegistry || {}).press || [])[0])
      .find((r) => r && (r.fFunction === ctrl.onConfirmAgregarRecetas || r.fFunction.__rmdPuesto)); if (!reg) return;
    if (!on('puestoreceta')) { if (reg.fFunction.__rmdPuesto) reg.fFunction = reg.fFunction.__rmdPuesto; return; }
    if (reg.fFunction.__rmdPuesto) return;
    const orig = reg.fFunction;
    const w = function () {
      try {
        const rutas = t._aSelectedPaths || [], datos = ctrl.getView().getModel('aListReceta').getData();
        const nuevas = rutas.map((q) => datos[+String(q).split('/')[1]]).filter(Boolean);
        const ya = (((ctrl.getView().getModel('listMdReceta') || { getData: () => [] }).getData()) || []).filter((r) => r.activo !== false && r.recetaId).map((r) => r.recetaId);
        const puesto = (x) => norm(x.Mdv01 || ''), base = [...new Set(ya.map(puesto).filter(Boolean))], todas = [...new Set(nuevas.map(puesto).filter(Boolean))];
        const esperado = base[0] || todas[0], distintas = nuevas.filter((x) => puesto(x) && puesto(x) !== esperado);
        if (esperado && (distintas.length || base.length > 1)) {
          sap.ui.require('sap/m/MessageBox').error(`No se puede asociar: todas las recetas del RMD deben tener el mismo puesto de trabajo (${esperado}${base.length ? ', el de las recetas ya asociadas' : ''}). ` +
            `Con otro puesto: ${distintas.map((x) => `${x.Matnr} / ${x.Verid} (${puesto(x)})`).join(', ')}.`, { title: 'Puesto de trabajo distinto' });
          return undefined;
        }
      } catch (e) { /* si no se puede comprobar, el portal sigue como siempre */ }
      return orig.apply(this, arguments);
    };
    w.__rmdPuesto = orig; reg.fFunction = w;
  }

  // ---- Editar un paso que también está en otros RMD (v1.25) ----
  // El "Grabar" de "Editar Paso" (onGrabarPasoPadre) sobrescribía en silencio el paso maestro cuando los otros RMD que lo usan están
  // INGRESADOS (cambiándolos a todos), y cuando lo usan RMD Autorizados/Suspendidos creaba un paso nuevo aunque ya existiera otro con
  // la misma descripción (pasos duplicados). Ahora, antes del Grabar del portal, se revisa dónde está el paso y, si aplica, se elige:
  // "Generar un nuevo paso" (verde; si ya existe uno con la misma descripción, se usa ese en vez de duplicarlo) o "Sobrescribir el paso"
  // (ámbar; el Grabar del portal de siempre). Luego una confirmación que se acepta sola a los 5 s si no se pulsa Cancelar u OK.
  const ESTADOS_BLOQUEAN = ['465', '468'], ESTADOS_CERRADOS = ['465', '468', '466', '478'];
  function confirmarConCuenta(titulo, mensaje, segundos = 5) {
    return new Promise((resolver) => {
      let n = segundos, hecho = false;
      const fin = (v) => { if (hecho) return; hecho = true; clearInterval(reloj); v0.cerrar(); resolver(v); };
      const v0 = ventana(titulo, { cancelar: () => fin(false) });
      v0.cuerpo.innerHTML = `<p>${esc(mensaje)}</p><p class="rmd-nota rmd-cuenta"></p>`;
      const cuenta = v0.cuerpo.querySelector('.rmd-cuenta'), pinta = () => setTxt(cuenta, `Se acepta automáticamente en ${n} s…`);
      const reloj = setInterval(() => { n--; if (n <= 0) fin(true); else pinta(); }, 1000); pinta();
      v0.pie.append(botonModal('Cancelar', '', () => fin(false)), botonModal('OK', 'primario', () => fin(true)));
    });
  }
  function elegirEdicionPaso(info) {
    return new Promise((resolver) => {
      const v0 = ventana('Este paso también está en otros RMD', { cancelar: () => { v0.cerrar(); resolver(null); } });
      const lista = (xs) => xs.slice(0, 12).map((x) => `${x.codigo} v${x.version} (${x.estado})`).join(', ') + (xs.length > 12 ? ` y ${xs.length - 12} más` : '');
      v0.cuerpo.innerHTML = `<p>El paso <b>${esc(info.codigo)}</b> — ${esc(info.descripcion)} —${info.enEste ? ' está en este RMD y' : ''} también está en:</p>
        ${info.abiertos.length ? `<p><b>${info.abiertos.length} RMD en proceso</b> (Ingresado u otro estado abierto): ${esc(lista(info.abiertos))}.</p>` : ''}
        ${info.bloquean.length ? `<p><b>${info.bloquean.length} RMD Autorizados o Suspendidos</b>: ${esc(lista(info.bloquean))}. Ahí no se puede sobrescribir.</p>` : ''}
        ${info.dup ? `<p class="rmd-nota">Ya existe otro paso con la misma descripción: <b>${esc(info.dup.codigo)}</b>. "Generar un nuevo paso" usará ese paso en vez de crear un duplicado.</p>` : ''}`;
      const verde = botonModal(info.dup ? `Usar el paso existente ${info.dup.codigo}` : 'Generar un nuevo paso', 'exito', () => { v0.cerrar(); resolver('nuevo'); });
      verde.title = 'Solo este RMD cambia: los demás RMD siguen con el paso de siempre.';
      const ambar = botonModal(`Sobrescribir el paso (afecta a ${info.abiertos.length} RMD)`, 'ambar', () => { v0.cerrar(); resolver('sobrescribir'); });
      ambar.title = 'Cambia el paso maestro: se ve el cambio en todos los RMD en proceso que lo usan.';
      if (info.bloquean.length) { ambar.disabled = true; ambar.title = 'El paso está en RMD Autorizados o Suspendidos: el portal no permite sobrescribirlo.'; }
      v0.pie.append(botonModal('Cancelar', '', () => { v0.cerrar(); resolver(null); }), ambar, verde);
    });
  }
  async function usoDelPaso(modelo, pasoId, mdIdActual) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const [p1, p2] = await Promise.all([
      leerTodoDe(modelo, 'MD_ES_PASO', [new Filtro('pasoId_pasoId', 'EQ', pasoId)], { $expand: 'mdId,mdId/estadoIdRmd', $select: 'mdId_mdId,activo,mdId/codigo,mdId/version,mdId/estadoIdRmd_iMaestraId,mdId/estadoIdRmd/contenido' }),
      leerTodoDe(modelo, 'MD_ES_PASO_INSUMO_PASO', [new Filtro('pasoHijoId_pasoId', 'EQ', pasoId)], { $expand: 'mdId,mdId/estadoIdRmd', $select: 'mdId_mdId,activo,mdId/codigo,mdId/version,mdId/estadoIdRmd_iMaestraId,mdId/estadoIdRmd/contenido' }),
    ]).catch(async () => [await leerTodoDe(modelo, 'MD_ES_PASO', [new Filtro('pasoId_pasoId', 'EQ', pasoId)], { $expand: 'mdId,mdId/estadoIdRmd' }), []]);
    const porMd = new Map();
    [...p1, ...p2].filter((x) => x.mdId && x.activo !== false).forEach((x) => { const m = x.mdId; porMd.set(x.mdId_mdId, { codigo: m.codigo, version: m.version, idEstado: String(m.estadoIdRmd_iMaestraId), estado: (m.estadoIdRmd && m.estadoIdRmd.contenido) || '' }); });
    const otros = [...porMd].filter(([id]) => id !== mdIdActual).map(([, v]) => v);
    return { enEste: porMd.has(mdIdActual), bloquean: otros.filter((x) => ESTADOS_BLOQUEAN.includes(x.idEstado)), abiertos: otros.filter((x) => !ESTADOS_CERRADOS.includes(x.idEstado)) };
  }
  async function pasoDuplicado(modelo, d) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, FO = sap.ui.require('sap/ui/model/FilterOperator') || sap.ui.model.FilterOperator;
    // el mismo filtro que usa el portal para avisar "El Paso ya se encuentra registrado…"
    const f = [new Filtro('tolower(descripcion)', FO.EQ, "'" + String(d.descripcion || '').toLowerCase().replace("'", "''") + "'"), new Filtro('estructuraId_estructuraId', FO.EQ, d.estructuraId_estructuraId),
      new Filtro('etiquetaId_etiquetaId', FO.EQ, d.etiquetaId_etiquetaId), new Filtro('pasoId', FO.NE, d.pasoId)];
    const r = await leerTodoDe(modelo, 'PASO', f, { $select: 'pasoId,codigo,descripcion,activo' });
    return r.filter((x) => x.activo !== false).sort((a, b) => (+a.codigo || 0) - (+b.codigo || 0))[0] || null;
  }
  const modeloEscribir = (modelo, metodo, ruta, datos) => new Promise((ok, mal) => {
    const cb = { success: (r) => ok(r), error: (e) => mal(new Error((e && (e.responseText || e.message)) || 'error del servidor')) };
    if (metodo === 'create') modelo.create(ruta, datos, cb); else modelo.update(ruta, datos, cb);
  });
  async function nuevoPasoSoloEste(M, b, comp, d, dup) {
    const lm = b.getView().getModel('localModel'), modelo = b.getView().getModel('mainModelv2'), usuario = ((lm.getProperty('/oInfoUsuario') || {}).data || {}).usuario;
    let pasoId = dup && dup.pasoId, codigo = dup && dup.codigo;
    if (!pasoId) {
      codigo = await M.getNextNumber('PASO_CODIGO');
      const nuevo = { usuarioRegistro: usuario, fechaRegistro: new Date(), activo: true, pasoId: crypto.randomUUID(), codigo, descripcion: d.descripcion, numeracion: d.numeracion, tipoDatoId_iMaestraId: d.tipoDatoId_iMaestraId,
        estadoId_iMaestraId: d.estadoId_iMaestraId, estructuraId_estructuraId: d.estructuraId_estructuraId, etiquetaId_etiquetaId: d.etiquetaId_etiquetaId, valorInicial: d.valorInicial, valorFinal: d.valorFinal, margen: d.margen,
        decimales: d.decimales, tipoLapsoId_motivoLapsoId: d.tipoLapsoId_motivoLapsoId, tipoCondicionId_iMaestraId: d.tipoCondicionId_iMaestraId };
      await modeloEscribir(modelo, 'create', '/PASO', nuevo); pasoId = nuevo.pasoId;
    }
    if (comp === 'pasoHijo') { const c = lm.getProperty('/listMdEsPasoInsumoPaso'); await modeloEscribir(modelo, 'update', `/MD_ES_PASO_INSUMO_PASO('${c.mdEstructuraPasoInsumoPasoId}')`, { pasoHijoId_pasoId: pasoId }); }
    else { const g = lm.getProperty('/listMdEsPasoPadre'); await modeloEscribir(modelo, 'update', `/MD_ES_PASO('${g.mdEstructuraPasoId}')`, { pasoId_pasoId: pasoId }); }
    // los mismos refrescos que hace el portal al terminar
    await b.onGetDataEstructuraMD(); await b.onCreateModelTree();
    const etq = b.getView().getModel('headerAddEtiqueta');
    if (etq && comp !== 'pasoHijo') { if (etq.getData().length === 0) await M.onGetPasosToAssign(); else await M.onGetPasosToAssignProcess(); }
    else if (comp === 'pasoHijo') { await M.onGetPasosToAssignProcess('proceso'); await M.onObtenerProcMenores(null); }
    else await M.onGetPasosToAssign();
    if (comp === 'pasoHijo') M.oEditPasoHijoRM.close(); else M.oEditPasoRM.close();
    return codigo;
  }
  function gestionarEdicionPasos() {
    const d = dialogos().find((x) => /^Editar Paso/i.test(cabecera(x))); if (!d || typeof sap === 'undefined') return;
    const bG = [...d.querySelectorAll('button')].map((x) => sap.ui.getCore().byId(x.id.replace(/-inner$/, ''))).find((x) => x && x.getText && x.getText() === 'Grabar');
    const reg = bG && ((bG.mEventRegistry || {}).press || [])[0], M = reg && reg.oListener;
    if (!M || typeof M.onGrabarPasoPadre !== 'function' || (reg.fFunction !== M.onGrabarPasoPadre && !reg.fFunction.__rmdGrabar)) return;   // solo el Grabar del editor del RMD
    if (!on('editarpaso')) { if (reg.fFunction.__rmdGrabar) reg.fFunction = reg.fFunction.__rmdGrabar; return; }
    if (reg.fFunction.__rmdGrabar) return;
    const orig = reg.fFunction;
    const w = async function (e) {
      // UI5 recicla el objeto del evento al terminar el manejador: se guarda el botón ahora y el Grabar del portal recibe un evento equivalente
      const yo = this, fuente = e && e.getSource && e.getSource(), evento = { getSource: () => fuente, getParameter: () => undefined, getParameters: () => ({}) };
      const portal = () => orig.call(yo, evento);
      try {
        const b = controladorPrincipal(); if (!b) return portal();
        const comp = fuente && fuente.data('component'), lm = b.getView().getModel('localModel');
        const dd = lm.getProperty(comp === 'pasoPadre' ? '/pasoPadreSeleccionado' : '/pasoHijoSeleccionado'), nn = lm.getProperty(comp === 'pasoPadre' ? '/pasoPadreSeleccionadoBackUp' : '/pasoHijoSeleccionadoBackUp');
        if (!dd || !dd.pasoId || JSON.stringify(dd) === JSON.stringify(nn)) return portal();
        const modelo = b.getView().getModel('mainModelv2'), md = b.getView().getModel('asociarDatos').getData();
        const [uso, dup] = await Promise.all([usoDelPaso(modelo, dd.pasoId, md.mdId), pasoDuplicado(modelo, dd)]);
        const hayDup = dup && String(dd.descripcion || '').toLowerCase() !== String((nn || {}).descripcion || '').toLowerCase() ? dup : (uso.bloquean.length ? dup : null);
        if (!uso.abiertos.length && !uso.bloquean.length && !hayDup) return portal();   // solo este RMD: el Grabar de siempre
        const eleccion = await elegirEdicionPaso({ codigo: (nn && nn.codigo) || dd.codigo, descripcion: norm(dd.descripcion), enEste: uso.enEste, abiertos: uso.abiertos, bloquean: uso.bloquean, dup: hayDup });
        if (!eleccion) return undefined;
        const texto = eleccion === 'sobrescribir'
          ? `Se sobrescribirá el paso ${(nn && nn.codigo) || ''}: el cambio se verá en este RMD y en ${uso.abiertos.length} RMD en proceso.`
          : hayDup ? `Este RMD pasará a usar el paso existente ${hayDup.codigo} (no se crea un duplicado). Los demás RMD no cambian.` : 'Se creará un paso nuevo solo para este RMD. Los demás RMD no cambian.';
        if (!(await confirmarConCuenta('Confirmar', texto))) return undefined;
        if (eleccion === 'sobrescribir') return portal();
        sap.ui.core.BusyIndicator.show(0);
        try { const cod = await nuevoPasoSoloEste(M, b, comp, dd, hayDup); toast(hayDup ? `Este RMD usa ahora el paso ${cod}.` : `Se creó el paso ${cod} solo para este RMD.`); }
        finally { sap.ui.core.BusyIndicator.hide(); }
        return undefined;
      } catch (err) { toast('No se pudo revisar dónde está el paso: ' + (err.message || err) + '. Se sigue con el Grabar del portal.', true); return portal(); }
    };
    w.__rmdGrabar = orig; reg.fFunction = w;
  }
  window.__rmdStats.usoDelPaso = (pasoId, mdId) => usoDelPaso(controladorPrincipal().getView().getModel('mainModelv2'), pasoId, mdId);
  // ---- Productividad (v1.26): saludo, "Ir a…" (Ctrl+K), RMD recientes y título de la pestaña ----
  // Saludo: al cargar la lista principal, abajo a la izquierda (junto al botón de mejoras), "Buenos días, Carlos" con un resumen de
  // los RMD de la persona en Ingresado y "Continuar con <el último RMD abierto>"; se desvanece solo (pasar el ratón lo detiene).
  // El nombre sale del launchpad (sap.ushell.Container.getUser) y el código de usuario (el de usuarioRegistro de MD) del modelo del
  // portal; del registro de usuario solo se lee ese campo. Recientes: los RMD abiertos en este navegador (localStorage, solo códigos).
  const CLAVE_RECIENTES = 'rmdUiRecientes', CLAVE_SALUDO = 'rmdUiSaludo';
  const leerRecientes = () => { try { const a = JSON.parse(localStorage.getItem(CLAVE_RECIENTES)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  function anotarReciente(md) {
    if (!md || !md.codigo) return;
    try {
      const a = leerRecientes().filter((x) => x.codigo !== md.codigo);
      a.unshift({ codigo: String(md.codigo), version: md.version, descripcion: String(md.descripcion || '').slice(0, 120), etapa: md.nivelTxt || '', t: Date.now() });
      localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(a.slice(0, 12)));
    } catch (e) { /* sin almacenamiento: sin recientes */ }
  }
  const capitalizar = (t) => String(t || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  function primerNombre() {
    for (const w of [window, window.parent, window.top]) {
      try { const u = w.sap && w.sap.ushell && w.sap.ushell.Container && w.sap.ushell.Container.getUser(); if (!u) continue;
        const n = (u.getFirstName && u.getFirstName()) || (u.getFullName && u.getFullName()) || ''; if (n) return capitalizar(n.trim().split(/\s+/)[0]); } catch (e) { /* otro origen */ }
    }
    return '';
  }
  function codigoUsuario(ctrl) {
    try { const c = ctrl && ctrl.localModel && ctrl.localModel.getProperty('/oInfoUsuario/data/usuario'); if (c) return String(c).toUpperCase(); } catch (e) { /* sin modelo */ }
    const u = usuarioSapActual(); return u && u.email ? u.email.split('@')[0].toUpperCase() : '';
  }
  const saludoDelMomento = (h = new Date().getHours()) => (h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches');
  // RMD en Ingresado registrados o actualizados por la persona (una lectura de MD, solo los campos necesarios)
  let misRmdCache = null;
  async function misRmd(ctrl) {
    if (misRmdCache && Date.now() - misRmdCache.t < 60000) return misRmdCache.lista;
    const m = ctrl && ctrl.getView().getModel('mainModelv2'), cod = codigoUsuario(ctrl); if (!m || !cod) return [];
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const filas = await leerTodoDe(m, 'MD', [new F({ filters: [new F('usuarioRegistro', 'EQ', cod), new F('usuarioActualiza', 'EQ', cod)], and: false }), new F('estadoIdRmd_iMaestraId', 'EQ', 467)],
      { $select: 'mdId,codigo,version,descripcion,nivelTxt,estadoIdProceso_iMaestraId,fechaActualiza,fechaRegistro' });
    const f = (x) => Math.max(+new Date(x.fechaActualiza || 0) || 0, +new Date(x.fechaRegistro || 0) || 0);
    const lista = filas.sort((a, b) => f(b) - f(a));
    misRmdCache = { t: Date.now(), lista }; return lista;
  }
  async function resumenPersonal(ctrl) {
    const lista = await misRmd(ctrl); if (!lista.length) return 'No tienes RMD en Ingresado.';
    let mapa = {}; try { mapa = await mapaProduccionEstado(ctrl); } catch (e) { /* sin textos del estado de producción */ }
    const cuenta = (re) => lista.filter((x) => re.test(String(mapa[x.estadoIdProceso_iMaestraId] || ''))).length;
    const rech = cuenta(/RECHAZ/i), env = cuenta(/ENVIADO/i);
    return `Tienes ${lista.length} RMD en Ingresado` + (env ? ` · ${env} en revisión` : '') + (rech ? ` · ${rech} con la revisión rechazada` : '') + '.';
  }
  let saludoHecho = false;
  function gestionarSaludo() {
    if (saludoHecho || !on('saludo')) return;
    const ctrl = controladorPrincipal(); if (!ctrl || !botonExportar()) return;           // cuando ya se ve la lista principal
    saludoHecho = true;
    try { const u = +localStorage.getItem(CLAVE_SALUDO) || 0; if (Date.now() - u < 10 * 60000) return; localStorage.setItem(CLAVE_SALUDO, String(Date.now())); } catch (e) { /* sin almacenamiento: se saluda */ }
    const nombre = primerNombre(), ult = leerRecientes()[0], reciente = ult && Date.now() - ult.t < 14 * 86400000 ? ult : null;
    const el = document.createElement('div'); el.className = 'rmd-saludo'; el.setAttribute('role', 'status');
    el.innerHTML = `<b>${esc(saludoDelMomento())}${nombre ? ', ' + esc(nombre) : ''}</b><span class="rmd-saludo-resumen"></span>` +
      (reciente ? `<button type="button" class="rmd-saludo-continuar" title="Abrir la configuración de este RMD">Continuar con ${esc(reciente.codigo)} · ${esc(reciente.descripcion.slice(0, 38))}</button>` : '') +
      `<span class="rmd-saludo-tip">Ctrl+K: ir a un RMD o a una herramienta</span>`;
    html.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
    let t = null;
    const ocultar = () => { el.classList.remove('visible'); setTimeout(() => el.remove(), 800); };
    const programar = (ms) => { clearTimeout(t); t = setTimeout(ocultar, ms); };
    programar(7000);
    el.addEventListener('mouseenter', () => clearTimeout(t)); el.addEventListener('mouseleave', () => programar(2500));
    const bc = el.querySelector('.rmd-saludo-continuar'); if (bc) bc.addEventListener('click', () => { ocultar(); abrirRmdPorCodigo(reciente.codigo, 'configurar', reciente.version); });
    resumenPersonal(ctrl).then((r) => { setTxt(el.querySelector('.rmd-saludo-resumen'), r); }, () => {});
  }
  // Abrir un RMD como a mano: filtra la lista principal por su código y elige la acción en el menú de su fila (el mismo manejador del portal)
  const ACCIONES_FILA = { configurar: 'Configurar el RMD', asociar: 'Asociar fórmulas', master: 'Ver master', op: 'Ver OP', trazabilidad: 'Trazabilidad RMD' };
  async function abrirRmdPorCodigo(codigo, accion = 'configurar', version) {
    const ctrl = controladorPrincipal(); if (!ctrl) { toast('Abre la lista "Configuración Manufactura Digital" para ir a un RMD.', true); return false; }
    if (dialogos().length && accion !== 'filtrar') { toast('Cierra primero las ventanas abiertas del portal para abrir otro RMD (el RMD quedó filtrado en la lista).', true); filtrarListaPrincipal(codigo); return false; }
    filtrarListaPrincipal(codigo);
    if (accion === 'filtrar') return true;
    const lista = ctrl.getView().byId('idTblConfigurationRmd'); if (!lista) return false;
    await esperar(350);
    const fila = await hasta(() => {
      if (ocupadoGlobal()) return null;
      const its = lista.getItems().map((i) => ({ i, o: i.getBindingContext('listMD') && i.getBindingContext('listMD').getObject() })).filter((x) => x.o && String(x.o.codigo) === String(codigo));
      if (!its.length) return null;
      const exacta = version != null && its.find((x) => +x.o.version === +version);
      return exacta || its.sort((a, b) => ((a.o.estadoIdRmd_iMaestraId === 466) - (b.o.estadoIdRmd_iMaestraId === 466)) || (b.o.version - a.o.version))[0];
    }, 20000, 200);
    if (!fila) { toast(`No se encontró el RMD ${codigo} en la lista (revisa los filtros de la lista).`, true); return false; }
    const mb = [...fila.i.getDomRef().querySelectorAll('[data-sap-ui]')].map((x) => sap.ui.getCore().byId(x.id)).find((c) => c && c.getMenu && c.getMenu());
    const menu = mb && mb.getMenu(), item = menu && menu.getItems().find((x) => x.getText() === ACCIONES_FILA[accion]);
    if (!item) { toast(`No se encontró "${ACCIONES_FILA[accion]}" en el menú del RMD ${codigo}.`, true); return false; }
    menu.fireItemSelected({ item });
    return true;
  }
  // ---- "Ir a…" (Ctrl+K) ----
  function herramientasPaleta() {
    const ctrl = controladorPrincipal(), lista = !!(ctrl && botonExportar());
    const clic = (sel) => () => { const b = document.querySelector(sel); if (b) b.click(); };
    return [
      lista && on('buscarequipo') && ['Buscar por equipo', 'RMD que tienen un equipo, instrumento o material', () => abrirBuscarPorEquipo()],
      lista && on('suspension') && ['Suspensión masiva', 'Suspender varios RMD autorizados a la vez', () => abrirSuspensionMasiva()],
      lista && on('exportar') && ['Exportar…', 'Exportado original, Equipos por master, Indicadores, Documentos citados', () => { const b = botonExportar(); const c = b && sap.ui.getCore().byId(b.id.replace(/-inner$/, '')); if (c) c.firePress(); }],
      lista && on('equipos') && ['Equipos por master', 'Excel de todos los master con sus equipos', () => abrirEquiposPorMaster()],
      lista && on('indicadores') && ['Indicadores del mes', 'BD RMD del mes con sus tablas dinámicas', () => abrirIndicadores()],
      lista && on('citastodos') && ['Documentos citados en todos los master', 'Qué master citan cada documento', () => abrirCitasDeTodos()],
      lista && on('statusrmd') && document.querySelector('.rmd-status-rmd') && ['Enviar a Status RMD', 'Maestro completo a Status RMD', clic('.rmd-status-rmd')],
      ['Mejoras de interfaz', 'Activar o desactivar funciones del script', () => { const p = document.getElementById('rmd-ui-panel'); if (p) p.open = true; }],
    ].filter(Boolean);
  }
  // Con una ventana de SAP abierta, UI5 (Popup modal) devuelve el foco a esa ventana si pasa a un elemento ajeno: la paleta, los
  // avisos propios, el panel y el menú Exportar se declaran "contenido externo" de sus popups para poder escribir y usar el teclado ahí.
  let externosUI5 = false;
  function registrarExternosUI5() {
    if (externosUI5 || typeof sap === 'undefined') return;
    try { const P = sap.ui.require('sap/ui/core/Popup'); if (P && P.addExternalContent) { P.addExternalContent(['.rmd-paleta-fondo', '.rmd-modal-fondo', '#rmd-ui-panel', '.rmd-menu', '.rmd-saludo', '.rmd-rec-detalle'], true); externosUI5 = true; } } catch (e) { /* versión de UI5 sin esta función */ }
  }
  function abrirPaleta() {
    if (document.querySelector('.rmd-paleta-fondo')) return;
    registrarExternosUI5();
    const ctrl = controladorPrincipal(), hayVentanas = dialogos().length > 0;
    const fondo = document.createElement('div'); fondo.className = 'rmd-paleta-fondo';
    fondo.innerHTML = `<div class="rmd-paleta" role="dialog" aria-label="Ir a"><input type="search" class="rmd-paleta-q" autocomplete="off" spellcheck="false" placeholder="Código o descripción de un RMD, o una herramienta" aria-label="Ir a un RMD o a una herramienta">
      <div class="rmd-paleta-res" role="listbox"></div><div class="rmd-paleta-pie"><span>↑↓ elegir · Enter configurar el RMD · Alt+Enter asociar fórmulas · Esc cerrar</span><span class="rmd-paleta-estado"></span></div></div>`;
    document.body.appendChild(fondo);
    const q = fondo.querySelector('.rmd-paleta-q'), res = fondo.querySelector('.rmd-paleta-res'), estado = fondo.querySelector('.rmd-paleta-estado');
    let mios = null, items = [], activo = 0;
    const cerrar = () => { document.removeEventListener('keydown', teclas, true); fondo.remove(); };
    const n = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const pintar = () => {
      const t = n(q.value.trim()), coincide = (x) => !t || n(x.codigo + ' ' + x.descripcion + ' ' + (x.etapa || x.nivelTxt || '')).includes(t);
      const recientes = leerRecientes().filter(coincide).slice(0, 6), vistos = new Set(recientes.map((x) => x.codigo));
      const propios = (mios || []).filter((x) => !vistos.has(String(x.codigo)) && coincide(x)).slice(0, 8);
      const tools = herramientasPaleta().filter(([tt, sub]) => !t || n(tt + ' ' + sub).includes(t));
      items = []; let h = '';
      const seccion = (titulo) => { h += `<div class="rmd-paleta-sec">${esc(titulo)}</div>`; };
      const rmd = (x, meta) => { items.push({ tipo: 'rmd', codigo: String(x.codigo), version: x.version }); const k = items.length - 1;
        h += `<div class="rmd-paleta-it" role="option" data-k="${k}"><span class="cod">${esc(x.codigo)}</span><span class="ver">${x.version ? 'v' + esc(x.version) : ''}</span><span class="desc">${esc(x.descripcion)}</span><span class="meta">${esc(meta)}</span>` +
          `<span class="rmd-paleta-acc"><button type="button" data-a="asociar" title="Asociar fórmulas (Alt+Enter)">Fórmulas</button><button type="button" data-a="master" title="Ver master (PDF)">Master</button><button type="button" data-a="filtrar" title="Solo filtrar la lista">Filtrar</button></span></div>`; };
      const cod = q.value.trim();
      if (/^\d{6,}$/.test(cod) && ![...recientes, ...propios].some((x) => String(x.codigo) === cod)) { seccion('Código'); rmd({ codigo: cod, version: '', descripcion: 'Abrir este RMD' }, ''); }
      if (recientes.length) { seccion('Recientes en este navegador'); recientes.forEach((x) => rmd(x, x.etapa + ' · ' + haceCuanto(x.t))); }
      if (propios.length) { seccion('Tus RMD en Ingresado'); propios.forEach((x) => rmd(x, x.nivelTxt || '')); }
      if (tools.length) { seccion('Herramientas'); tools.forEach(([tt, sub, fn]) => { items.push({ tipo: 'tool', fn }); h += `<div class="rmd-paleta-it" role="option" data-k="${items.length - 1}"><span class="desc"><b>${esc(tt)}</b> <span class="meta">${esc(sub)}</span></span></div>`; }); }
      if (!items.length) h = `<div class="rmd-paleta-vacio">Sin resultados${mios == null ? ' (cargando tus RMD…)' : ''}.</div>`;
      res.innerHTML = h; activo = Math.min(activo, Math.max(0, items.length - 1)); marcar();
    };
    const marcar = () => res.querySelectorAll('.rmd-paleta-it').forEach((e) => { const on_ = +e.dataset.k === activo; e.classList.toggle('activo', on_); if (on_) e.scrollIntoView({ block: 'nearest' }); });
    const ejecutar = (k, accion) => {
      const it = items[k]; if (!it) return; cerrar();
      if (it.tipo === 'tool') { it.fn(); return; }
      if (hayVentanas && accion !== 'filtrar') { toast('Cierra primero las ventanas abiertas del portal para abrir otro RMD.', true); return; }
      abrirRmdPorCodigo(it.codigo, accion || 'configurar', it.version || undefined);
    };
    const teclas = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); if (items.length) { activo = (activo + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; marcar(); } return; }
      if (e.key === 'Enter' && e.target === q) { e.preventDefault(); e.stopPropagation(); ejecutar(activo, e.altKey ? 'asociar' : 'configurar'); }
    };
    document.addEventListener('keydown', teclas, true);
    fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrar(); });
    res.addEventListener('mousemove', (e) => { const it = e.target.closest('.rmd-paleta-it'); if (it && +it.dataset.k !== activo) { activo = +it.dataset.k; marcar(); } });
    res.addEventListener('click', (e) => { const it = e.target.closest('.rmd-paleta-it'); if (!it) return; const b = e.target.closest('button[data-a]'); ejecutar(+it.dataset.k, b ? b.dataset.a : 'configurar'); });
    q.addEventListener('input', () => { activo = 0; pintar(); });
    if (hayVentanas) setTxt(estado, 'Con ventanas abiertas solo se puede filtrar la lista.');
    pintar(); q.focus();
    // UI5 devuelve el foco a su control un instante después (su gestor de foco): se recupera para que lo tecleado vaya a la paleta
    [0, 60, 200].forEach((ms) => setTimeout(() => { if (fondo.isConnected && document.activeElement !== q) q.focus(); }, ms));
    fondo.addEventListener('focusout', () => setTimeout(() => { if (fondo.isConnected && !fondo.contains(document.activeElement)) q.focus(); }, 0));
    if (ctrl) misRmd(ctrl).then((l) => { mios = l; if (fondo.isConnected) pintar(); }, () => { mios = []; if (fondo.isConnected) { setTxt(estado, 'No se pudieron leer tus RMD.'); pintar(); } });
    else mios = [];
  }
  function haceCuanto(t) {
    const m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
  }
  document.addEventListener('keydown', (e) => {
    if (!on('paleta') || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || String(e.key).toLowerCase() !== 'k') return;
    e.preventDefault(); e.stopPropagation(); abrirPaleta();
  }, true);
  // RMD abierto: se anota en recientes y la pestaña del navegador lleva su código (útil con varias pestañas del portal)
  let rmdAbiertoId = null, tituloOriginal = null, tituloPuesto = null;
  function gestionarRmdAbierto() {
    const raiz = dialogos().find((x) => /^\d{6,}\s*-/.test(cabecera(x)) || /^Asociar F[oó]rmula/i.test(cabecera(x)));
    const ctrl = raiz && controladorPrincipal(), md = ctrl && ctrl.getView().getModel('asociarDatos') && ctrl.getView().getModel('asociarDatos').getData();
    let doc = null; try { doc = window.top.document; } catch (e) { doc = document; }
    if (md && md.mdId && md.codigo) {
      if (rmdAbiertoId !== md.mdId) { rmdAbiertoId = md.mdId; if (on('paleta') || on('saludo')) anotarReciente(md); }
      if (on('titulo')) {
        if (norm(doc.title) !== tituloPuesto) tituloOriginal = doc.title;                 // el título del portal (o el que puso el launchpad después)
        const t = norm(`${md.codigo} · ${String(md.descripcion || '').slice(0, 40)} — ${tituloOriginal}`);   // (el navegador junta los espacios del título)
        if (norm(doc.title) !== t) doc.title = t;
        tituloPuesto = t; return;
      }
    } else rmdAbiertoId = null;
    if (tituloPuesto && norm(doc.title) === tituloPuesto && tituloOriginal != null) doc.title = tituloOriginal;   // RMD cerrado u opción apagada: título del portal
    tituloPuesto = null;
  }
  window.__rmdStats.productividad = { leerRecientes, primerNombre, codigoUsuario: () => codigoUsuario(controladorPrincipal()), misRmd: () => misRmd(controladorPrincipal()), resumen: () => resumenPersonal(controladorPrincipal()), abrirPaleta, abrirRmdPorCodigo, saludoDelMomento,
    saludar: () => { saludoHecho = false; try { localStorage.removeItem(CLAVE_SALUDO); } catch (e) { /* sin almacenamiento */ } document.querySelectorAll('.rmd-saludo').forEach((x) => x.remove()); gestionarSaludo(); } };   // (pruebas)
  // diagnóstico: el libro de equipos sin descargarlo (pruebas de solo lectura en el portal)
  window.__rmdStats.equiposSinDescargar = async (estados = ['Autorizado', 'Ingresado']) => {
    const modelo = modeloListaPrincipal(), t0 = Date.now();
    const masters = (await leerEntidadCompleta(modelo, 'MD', { $expand: 'estadoIdRmd,sucursalId', $select: SELECT_MD_EQ }, 'mdId')).map(mdParaEquipos);
    const items = await leerEquiposDeTodos(modelo), elegidos = masters.filter((m) => estados.includes(m.estado));
    const { libro, nombre, filas, equipos } = armarEquiposExcel(elegidos, items, estados), u8 = await libro.generar();
    return { nombre, masters: elegidos.length, items: items.length, filas, equipos, bytes: u8.length, segundos: Math.round((Date.now() - t0) / 1000), base64: aBase64(u8) };
  };
  // diagnóstico: el maestro tal como lo recibe el libro de indicadores (datosBaseDeMD), para compararlo con un exportado
  window.__rmdStats.maestro = async () => (await leerMDPaginado(modeloListaPrincipal(), [])).map((md) => { const f = datosBaseDeMD(md);
    return { ...f, fechaAutLocal: fechaLocalTexto(md.fechaAutorizacion), fechaAutorizacion: md.fechaAutorizacion && md.fechaAutorizacion.toISOString(), fechaRegistro: f.fechaRegistro && f.fechaRegistro.toISOString(), fechaSolicitud: f.fechaSolicitud && f.fechaSolicitud.toISOString() }; });
  // diagnóstico: arma el libro de un mes sin descargarlo (para las pruebas de solo lectura en el portal)
  window.__rmdStats.indicadoresSinDescargar = async (mes, anio, op = {}) => {
    const datos = await leerMDPaginado(modeloListaPrincipal(), []);
    const { libro, nombre, resumen } = Indicadores.construir({ filas: datos.map(filaIndicadores), mes, anio, previo: null, generado: new Date() });
    const u8 = await libro.generar();
    return { nombre, bytes: u8.length, resumen, base64: op.base64 ? aBase64(u8) : undefined,
      muestra: op.muestra ? datos.filter((md) => op.muestra.includes(md.codigo)).map((md) => ({ codigo: md.codigo, reg: md.fechaRegistro && md.fechaRegistro.toISOString(), sol: md.fechaSolicitud && md.fechaSolicitud.toISOString(), aut: md.fechaAutorizacion && md.fechaAutorizacion.toISOString() })) : undefined };
  };

  // ---- Experimental: aplicar "Aa" (minúsculas con redacción correcta) y el aviso de ortografía sobre los textarea editables
  // ya existentes (Descripción Paso de "Nuevo Paso", Descripción/Especificaciones de Especificaciones). Nunca escriben solas.
  const ICONO_AA = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 11 5 3l3 8M2.8 8.5h4.4"/><path d="M9.5 11c0-1.4 1.1-2.3 2.5-2.3s2.4.8 2.4 2c0 1-.7 1.3-1.8 1.6-1.2.3-2.7.6-2.7 2 0 .9.8 1.2 1.7 1.2 1.1 0 2-.5 2.4-1.3"/></svg>';
  // "Casi todo en MAYÚSCULAS": no cuentan los símbolos y unidades que se escriben con minúsculas dentro de un texto en mayúsculas
  // ("RESULTADO DE pH", "(100 mL)", "25 mg") y del resto se admite hasta un 10 % de minúsculas. Antes bastaba una sola minúscula
  // para no ofrecer "Aa", y los pasos con "pH" o "mL" se quedaban sin el botón.
  const MINUSCULAS_DE_UNIDAD = /(?<!\p{L})(?:\p{Ll}+\p{Lu}\p{L}*|mg|mcg|kg|g|ml|nm|mm|cm|rpm|min|seg|h|s|mbar|psi|bar)(?!\p{L})/gu;
  const casiTodoMayus = (t) => {
    const letras = (t || '').replace(MINUSCULAS_DE_UNIDAD, ' ').replace(/[^\p{L}]/gu, ''), minus = (letras.match(/\p{Ll}/gu) || []).length;
    return letras.length > 4 && minus <= letras.length * 0.1 && /\p{Lu}/u.test(letras);
  };
  window.__rmdStats.casiTodoMayus = casiTodoMayus;   // (diagnóstico y pruebas)
  function gestionarTextosMayusculas() {
    document.querySelectorAll('.sapMDialog:not(.sapMMessageDialog) textarea').forEach((ta) => {
      // "Nuevo Paso" y "Editar Paso" (Configuración Maestra) no siempre se llaman igual: se detectan por el campo "Descripción Paso"
      // en vez de por el título, para que también funcione si el portal lo abre con otro nombre.
      const d = enDialogo(ta); const aplica = d && (gestionada(d) || !!campoDe(d, 'Descripción Paso'));
      if (!aplica) { ta.classList.remove('rmd-ortografia'); const b = ta.parentElement && ta.parentElement.querySelector(':scope > .rmd-aa'); if (b) b.remove(); return; }
      if (ta.readOnly || ta.disabled) return;
      if (!on('pasominusculas')) { const b = ta.parentElement && ta.parentElement.querySelector(':scope > .rmd-aa'); if (b) b.remove(); }
      else if (casiTodoMayus(ta.value) && ta.parentElement && !ta.parentElement.querySelector(':scope > .rmd-aa')) {
        getComputedStyle(ta.parentElement).position === 'static' && (ta.parentElement.style.position = 'relative');
        const b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-aa'; b.innerHTML = ICONO_AA;
        b.title = 'Pasar a minúsculas con mayúscula al iniciar oración, tildes, unidades (pH, mL) y códigos tal cual (experimental: revisa el resultado antes de guardar).';
        b.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          // la Descripción de un paso se redacta como en "En minúsculas" (con punto final); los demás textos, sin tocar su puntuación
          ta.value = campoDe(d, 'Descripción Paso') ? pasoEnMinusculas(ta.value) : redactarEnMinusculas(ta.value);
          ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); ta.focus();
          if (/^Editar Paso/i.test(cabecera(d))) toast('Si este paso ya está en RMD autorizados, el portal no deja grabarlo ("El paso se encuentra en RMDs Autorizados no se puede actualizar."). ' +
            'En ese caso cierra esta ventana, marca el paso en la lista y usa "En minúsculas": crea un paso nuevo con todo copiado.');
        });
        ta.parentElement.appendChild(b);
      }
      ta.classList.remove('rmd-ortografia'); ta.removeAttribute('data-rmd-dudosas');   // (el aviso de ortografía, que era experimental, se retiró en v1.23)
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
  // Abre Configuración Maestra (con el botón "Configurar" de la lista principal), cambia a la pestaña "Paso" y pulsa "Nuevo Paso":
  // devuelve la ventana "Nuevo Paso", apilada encima de lo que esté abierto. No pulsa "Agregar".
  async function abrirVentanaNuevoPaso() {
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
    return dlg;
  }
  async function abrirNuevoPasoMaestro(d) {
    if (window.__rmdAbriendoNuevoPaso) return; window.__rmdAbriendoNuevoPaso = true;
    try {
      const estructura = valorDeCampo(d, 'Estructura'), etiqueta = valorDeCampo(d, 'Etiqueta');
      const dlg = await abrirVentanaNuevoPaso();
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

  // ---- "En minúsculas": a partir de un paso existente en MAYÚSCULAS abre "Nuevo Paso" de Configuración Maestra con todo lo del paso
  // copiado (estructura, etiqueta, numeración, tipo de dato, clave modelo, valores, decimales y lapso, del paso maestro que trae la
  // propia fila) y la descripción ya redactada en minúsculas. La persona revisa y pulsa "Agregar": el script no guarda nada.
  // Descripción en MAYÚSCULAS -> minúsculas con mayúscula al iniciar oración, tildes (diccionario), unidades (mL, mg, kg, g, L, °C,
  // pH, rpm…), códigos con números (PV1-PHM-09, FPRO-201) y siglas conocidas tal cual, y punto final salvo que ya termine en un
  // signo (":" en "FECHA / HORA INICIO:"). "ADICION DE CLOROCRESOL.-" -> "Adición de clorocresol."
  const UNIDADES_MIN = { ML: 'mL', MG: 'mg', MCG: 'mcg', KG: 'kg', G: 'g', L: 'L', RPM: 'rpm', MM: 'mm', CM: 'cm', NM: 'nm', MBAR: 'mbar', BAR: 'bar', PSI: 'psi', KPA: 'kPa', HPA: 'hPa', HRS: 'h', HR: 'h', H: 'h', MIN: 'min', SEG: 's', S: 's', UI: 'UI' };
  // Redacción en minúsculas de un texto en MAYÚSCULAS, sin tocar lo que debe quedar como está: símbolos que ya vienen con
  // minúsculas ("pH", "mL"), unidades tras un número ("100ML" -> "100 mL"), °C, códigos con letras y números completos
  // (PV1-PHM-09, IPRO-P202, PCMB-200), siglas conocidas (POE, RMD…) y las áreas de la empresa, que son nombres propios
  // ("Calidad en Operaciones", "Control de Calidad", "Aseguramiento de la Calidad").
  function redactarEnMinusculas(texto) {
    const guardados = [], ini = String.fromCharCode(3), fin = String.fromCharCode(4);
    const guardar = (m) => { guardados.push(m); return ini + (guardados.length - 1) + fin; };
    let t = norm(texto);
    t = t.replace(/\b[a-z]+[A-Z][A-Za-z]*\b/g, (m) => guardar(m));
    t = t.replace(/(\d)\s*(MCG|MBAR|KPA|HPA|RPM|ML|MG|KG|MM|CM|NM|PSI|BAR|HRS|HR|MIN|SEG|UI|G|L|H|S)\b/gi, (m, n, u) => n + ' ' + guardar(UNIDADES_MIN[u.toUpperCase()]));
    t = t.replace(/°\s*C\b/g, () => guardar('°C')).replace(/\bPH\b/gi, () => guardar('pH'));
    t = t.replace(/\bCALIDAD EN OPERACIONES\b/gi, () => guardar('Calidad en Operaciones')).replace(/\bCONTROL DE CALIDAD\b/gi, () => guardar('Control de Calidad'))
      .replace(/\bASEGURAMIENTO DE (LA )?CALIDAD\b/gi, (m, la) => guardar('Aseguramiento de ' + (la ? 'la ' : '') + 'Calidad'));
    // códigos: todo el código si en alguna parte lleva letras y números; los ordinales ("2DA", "1ER") van en minúsculas
    t = t.replace(/\b[A-Z0-9]+(?:[-/.][A-Z0-9]+)*\b/g, (m) => (!/\d/.test(m) || !/[A-Z]/.test(m) ? m
      : /^\d+(ER|RA|DA|DO|TO|TA|MO|MA|VO|VA|NO|NA)$/.test(m) ? m.toLowerCase() : guardar(m)));
    t = mejorarTexto(t);
    return t.replace(new RegExp(ini + '(\\d+)' + fin, 'g'), (_, i) => guardados[+i]);
  }
  // Descripción de un paso: además, punto final (salvo que ya termine en un signo: ":" en "FECHA / HORA INICIO:") y sin ".-".
  function pasoEnMinusculas(texto) {
    let t = redactarEnMinusculas(texto);
    t = t.replace(/\s*\.\s*-+\s*$/, '.').replace(/\s+-+\s*$/, '').trim();
    if (t && !/[.:;!?…]$/.test(t)) t += '.';
    return t;
  }
  window.__rmdStats.pasoEnMinusculas = pasoEnMinusculas;   // (diagnóstico y pruebas)
  const objetoCargado = (v) => (v && typeof v === 'object' && !v.__deferred ? v : null);
  // Datos del paso maestro de una fila (paso mayor: pasoId; proceso menor: pasoHijoId), con los nombres que muestran los combos.
  function pasoMaestroDeFila(tr, tabla) {
    const o = objetoDeFila(tr) || {}, m = objetoCargado(o.pasoId) || objetoCargado(o.pasoHijoId);
    if (!m || !m.descripcion) return { error: o.estructuraRecetaInsumoId || o.Maktx ? 'Esa fila es un insumo de la receta, no un paso.' : 'No encuentro los datos del paso maestro de esa fila.' };
    const est = objetoCargado(o.mdEstructuraId) && objetoCargado(o.mdEstructuraId.estructuraId);
    const nombres = {
      estructuraId_estructuraId: est && est.estructuraId === m.estructuraId_estructuraId ? est.descripcion : '',
      etiquetaId_etiquetaId: (objetoCargado(m.etiquetaId) || {}).descripcion || '',
      tipoDatoId_iMaestraId: (objetoCargado(m.tipoDatoId) || {}).contenido || nombreTipo(m.tipoDatoId_iMaestraId, tabla),
      tipoLapsoId_motivoLapsoId: (objetoCargado(m.tipoLapsoId) || {}).descripcion || '',
    };
    const datos = { estructuraId_estructuraId: m.estructuraId_estructuraId, etiquetaId_etiquetaId: m.etiquetaId_etiquetaId, numeracion: !!m.numeracion, tipoDatoId_iMaestraId: m.tipoDatoId_iMaestraId,
      clvModelo: m.clvModelo, valorInicial: m.valorInicial, valorFinal: m.valorFinal, margen: m.margen, decimales: m.decimales, tipoLapsoId_motivoLapsoId: m.tipoLapsoId_motivoLapsoId };
    // cómo está configurado en ESTE RMD (puede diferir del paso maestro: p. ej. maestro "Texto", aquí "Realizado por")
    const enRmd = o.pasoId ? { tipoDatoId_iMaestraId: o.tipoDatoId_iMaestraId, clvModelo: o.clvModelo, valorInicial: o.valorInicial, valorFinal: o.valorFinal, margen: o.margen, decimales: o.decimales }
      : { tipoDatoId_iMaestraId: o.tipoDatoId_iMaestraId, valorInicial: o.valorInicial, valorFinal: o.valorFinal, margen: o.margen, decimales: o.decimales };
    return { codigo: m.codigo, descripcion: m.descripcion, datos, nombres, enRmd };
  }
  const vacioM = (v) => v == null || v === '';
  function vistaMinusculas(p, tabla) {
    return new Promise((resolver) => {
      const v = ventana('Crear el paso en minúsculas', { cancelar: () => { v.cerrar(); resolver(null); } });
      const difiere = Object.keys(p.enRmd).filter((k) => String(vacioM(p.enRmd[k]) ? '' : p.enRmd[k]) !== String(vacioM(p.datos[k]) ? '' : p.datos[k]));
      const nom = (k, x) => (k === 'tipoDatoId_iMaestraId' ? nombreTipo(x, tabla) || x : x);
      const fila = (et, valor, k) => `<tr><td>${et}</td><td>${esc(vacioM(valor) ? '—' : valor)}</td><td class="rmd-nota">${k && difiere.includes(k) ? 'en este RMD: ' + esc(vacioM(p.enRmd[k]) ? '—' : nom(k, p.enRmd[k])) : ''}</td></tr>`;
      const d0 = p.datos, n0 = p.nombres;
      v.cuerpo.innerHTML = `<p><b>Paso de origen</b>: ${esc(p.codigo)} · ${esc(p.descripcion)}</p>
        <p><b>Descripción del paso nuevo</b> (puedes corregirla aquí o en "Nuevo Paso"):</p>
        <textarea class="rmd-min-texto" spellcheck="true"></textarea>
        <p class="rmd-nota rmd-min-igual" hidden>Solo cambian las mayúsculas: al pulsar Agregar el portal dirá "El Paso ya se encuentra registrado para esta
          Estructura y Etiqueta. ¿Desea crear o actualizar el Paso?". Responde <b>Sí</b>: crea el paso nuevo (el original no cambia).</p>
        <table class="rmd-tabla"><thead><tr><th>Se copia del paso maestro</th><th>Valor</th><th></th></tr></thead><tbody>
          ${fila('Estructura', n0.estructuraId_estructuraId || d0.estructuraId_estructuraId)}${fila('Etiqueta', n0.etiquetaId_etiquetaId || d0.etiquetaId_etiquetaId)}
          ${fila('Flag Numeración', d0.numeracion ? 'Sí' : 'No')}${fila('Tipo de Dato', n0.tipoDatoId_iMaestraId || d0.tipoDatoId_iMaestraId, 'tipoDatoId_iMaestraId')}
          ${fila('Clave Modelo', d0.clvModelo, 'clvModelo')}${fila('Valor inicial', d0.valorInicial, 'valorInicial')}${fila('Valor final', d0.valorFinal, 'valorFinal')}
          ${fila('Margen', d0.margen, 'margen')}${fila('Decimales', d0.decimales, 'decimales')}${fila('Lapso', n0.tipoLapsoId_motivoLapsoId || d0.tipoLapsoId_motivoLapsoId)}
        </tbody></table>
        ${difiere.length ? '<label><input type="checkbox" class="rmd-min-rmd"> Usar la configuración que tiene en este RMD (tipo de dato, clave, valores y decimales) en lugar de la del paso maestro</label>' : ''}
        <p class="rmd-nota">Se abrirá "Nuevo Paso" de Configuración Maestra con todo esto ya puesto: revísalo y pulsa <b>Agregar</b> (el script no guarda nada). Luego podrás añadir el paso nuevo al RMD.</p>`;
      const ta = v.cuerpo.querySelector('.rmd-min-texto'), igual = v.cuerpo.querySelector('.rmd-min-igual');
      // el portal busca un paso con la misma descripción en minúsculas (tolower) en la misma Estructura y Etiqueta antes de crearlo
      const revisarIgual = () => { igual.hidden = norm(ta.value).toLowerCase() !== String(p.descripcion || '').toLowerCase(); };
      ta.value = p.nueva; revisarIgual(); ta.addEventListener('input', revisarIgual);
      v.pie.append(botonModal('Cancelar', '', () => { v.cerrar(); resolver(null); }), botonModal('Abrir "Nuevo Paso"', 'primario', () => {
        const usarRmd = !!(v.cuerpo.querySelector('.rmd-min-rmd') || {}).checked;
        const datos = { ...p.datos, ...(usarRmd ? p.enRmd : {}), descripcion: norm(v.cuerpo.querySelector('.rmd-min-texto').value) };
        v.cerrar(); resolver({ datos });
      }));
    });
  }
  // Pone un valor en el control de "Nuevo Paso" ligado a /newPaso/<campo> (con los mismos eventos que al elegirlo a mano, para que
  // el portal habilite lo que depende de él: la Etiqueta según la Estructura, los valores según el Tipo de Dato).
  async function llenarNuevoPaso(dlg, datos) {
    const core = nucleo(), rutas = ['value', 'selectedKey', 'state', 'selected'];
    const controles = () => [...new Set([...dlg.querySelectorAll('[id]')].map((el) => core.byId(el.id)).filter((c) => c && c.getBinding))];
    const porCampo = (campo) => controles().find((c) => rutas.some((r) => { const b = c.getBinding(r); return b && b.getPath && b.getPath() === '/newPaso/' + campo; }));
    const fallidos = [];
    const poner = async (campo, valor, etiqueta) => {
      if (vacioM(valor) && valor !== false) return;
      const c = porCampo(campo); if (!c) { fallidos.push(etiqueta); return; }
      try {
        if (c.setSelectedKey && c.getItems) {
          const k = String(valor), ok = await hasta(() => c.getItems().some((it) => String(it.getKey()) === k), 6000, 200);
          if (!ok) { fallidos.push(etiqueta); return; }
          c.setSelectedKey(k); const it = c.getSelectedItem();
          if (c.fireSelectionChange) c.fireSelectionChange({ selectedItem: it }); if (c.fireChange) c.fireChange({ value: c.getValue(), newValue: c.getValue(), itemPressed: true });
        } else if (c.setState) { c.setState(!!valor); if (c.fireChange) c.fireChange({ state: !!valor }); }
        else if (c.setValue) { c.setValue(String(valor)); if (c.fireLiveChange) c.fireLiveChange({ value: String(valor), newValue: String(valor) }); if (c.fireChange) c.fireChange({ value: String(valor) }); }
        await esperar(250);
      } catch (e) { fallidos.push(etiqueta); }
    };
    await poner('estructuraId_estructuraId', datos.estructuraId_estructuraId, 'Estructura'); await esperar(500);
    await poner('etiquetaId_etiquetaId', datos.etiquetaId_etiquetaId, 'Etiqueta');
    await poner('numeracion', datos.numeracion, 'Flag Numeración');
    await poner('tipoDatoId_iMaestraId', datos.tipoDatoId_iMaestraId, 'Tipo de Dato'); await esperar(500);
    for (const [k, et] of [['clvModelo', 'Clave Modelo'], ['valorInicial', 'Valor inicial'], ['valorFinal', 'Valor final'], ['margen', 'Margen'], ['decimales', 'Decimales'], ['tipoLapsoId_motivoLapsoId', 'Lapso']]) await poner(k, datos[k], et);
    await poner('descripcion', datos.descripcion, 'Descripción Paso');
    return fallidos;
  }
  async function crearEnMinusculas(tabla) {
    if (window.__rmdMinusculas) return;
    const sel = seleccionadas(tabla);
    if (sel.length !== 1) { toast('Marca la casilla de UN solo paso (el que está en MAYÚSCULAS) y pulsa "En minúsculas".', true); return; }
    const p = pasoMaestroDeFila(sel[0], tabla);
    if (p.error) { toast(p.error, true); return; }
    p.nueva = pasoEnMinusculas(p.descripcion);
    const op = await vistaMinusculas(p, tabla); if (!op) return;
    window.__rmdMinusculas = true;
    try {
      toast('Abriendo "Nuevo Paso" de Configuración Maestra…');
      const dlg = await abrirVentanaNuevoPaso();
      const fallidos = await llenarNuevoPaso(dlg, op.datos), x = op.datos;
      // lo que el portal va a pedir al pulsar Agregar (validaciones de su propio botón)
      const rangoIncompleto = String(x.tipoDatoId_iMaestraId) === '443' && [x.valorInicial, x.valorFinal, x.margen].some(vacioM);
      const soloMayus = x.descripcion.toLowerCase() === String(p.descripcion || '').toLowerCase();
      toast(`Se abrió "Nuevo Paso" con el paso en minúsculas y su configuración copiada${fallidos.length ? ` (no se pudo poner: ${fallidos.join(', ')}; complétalo a mano)` : ''}.` +
        (rangoIncompleto ? ' Para Rango el portal exige Valor inicial, Valor final y Margen: complétalos.' : '') +
        (soloMayus ? ' Al pulsar Agregar el portal preguntará si desea crear el paso: responde Sí.' : '') + ' Revísalo y pulsa Agregar.', fallidos.length > 0 || rangoIncompleto);
    } catch (e) { toast('No se pudo preparar "Nuevo Paso": ' + e.message, true); }
    finally { window.__rmdMinusculas = false; }
  }
  // diagnóstico: el mismo flujo sin vista previa (para las pruebas de solo lectura: abre "Nuevo Paso" lleno, NO pulsa Agregar)
  window.__rmdStats.nuevoPasoEnMinusculas = async (tr, usarRmd) => {
    const tabla = tr.closest('table'), p = pasoMaestroDeFila(tr, tabla); if (p.error) throw new Error(p.error);
    const datos = { ...p.datos, ...(usarRmd ? p.enRmd : {}), descripcion: pasoEnMinusculas(p.descripcion) };
    const dlg = await abrirVentanaNuevoPaso(); const fallidos = await llenarNuevoPaso(dlg, datos);
    return { origen: p.descripcion, datos, fallidos, dialogo: dlg.id };
  };
  window.__rmdStats.abrirVentanaNuevoPaso = abrirVentanaNuevoPaso;   // (diagnóstico: abre "Nuevo Paso" vacío; no pulsa Agregar)

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
    bp.title = 'Marca la casilla de uno o varios pasos destino y pulsa aquí: muestra una vista previa (qué cambia en cada uno) y aplica la configuración y los procesos menores copiados.';
    grupo.append(bc, bp);
    const ref = hdr.querySelector('.sapMTBSeparator') || [...hdr.querySelectorAll('button')].find((b) => b.title === 'Imprimir');
    if (ref) hdr.insertBefore(grupo, ref); else hdr.appendChild(grupo);
    pintarEstadoPortapapeles();
  }
  // "En minúsculas" en la barra de la tabla de Pasos y de Procesos menores (a la izquierda del icono de impresora)
  function instalarBotonMinusculas(d, tabla) {
    const hdr = d.querySelector('.sapMListHdr'); if (!hdr || hdr.querySelector('.rmd-minusculas')) return;
    const b = botonIcono(ICONO_AA, 'En minúsculas', 'rmd-minusculas', () => crearEnMinusculas(tablaDe(d) || tabla));
    b.title = 'Marca la casilla de un paso en MAYÚSCULAS y pulsa aquí: abre "Nuevo Paso" con el mismo paso (estructura, etiqueta, tipo de dato, valores, decimales…) ya redactado en minúsculas, listo para pulsar Agregar.';
    const grupo = hdr.querySelector('.rmd-copia-grupo');
    if (grupo) grupo.appendChild(b);
    else { const ref = hdr.querySelector('.sapMTBSeparator') || [...hdr.querySelectorAll('button')].find((x) => x.title === 'Imprimir'); b.style.marginRight = '10px'; if (ref) hdr.insertBefore(b, ref); else hdr.appendChild(b); }
  }

  // ---- 10. Panel para activar/desactivar cada mejora -------------------------------------------
  // Grupos del panel (las claves son las de OPC)
  const GRUPOS_PANEL = [
    ['Productividad', ['saludo', 'paleta', 'titulo']],
    ['Ventanas y tablas', ['ancho', 'columnas', 'ocultar', 'estado', 'pmtitulo', 'grupos', 'depende']],
    ['Alertas', ['reglas', 'ordenest', 'recetas', 'recetaruta', 'sintipo', 'puesto']],
    ['Herramientas', ['filtro', 'copiar', 'pasominusculas', 'espec', 'nuevopaso', 'verop', 'documentos', 'exportar', 'statusrmd', 'indicadores', 'equipos', 'citastodos', 'buscarequipo', 'suspension', 'recetas', 'recetasvarias', 'puestoreceta', 'repetirpaso', 'editarpaso', 'formulas', 'revisor', 'vivo', 'asociar', 'singuardar', 'exito', 'sesion', 'enter']],
  ];
  function panel() {
    const etiqueta = Object.fromEntries(OPC);
    const fila = (k, cls) => `<label class="rmd-fila ${cls || ''}"><span>${etiqueta[k]}</span><input type="checkbox" data-k="${k}" ${opc[k] ? 'checked' : ''}></label>`;
    const p = document.createElement('details'); p.id = 'rmd-ui-panel';
    p.innerHTML = '<summary title="Mejoras de interfaz" aria-label="Mejoras de interfaz">' + ICONO_AJUSTES + '</summary><div class="rmd-panel-cuerpo">' +
      '<div class="rmd-panel-cab"><b>Mejoras de interfaz</b><span>v' + VERSION + '</span></div>' + fila('activo', 'maestro') +
      GRUPOS_PANEL.map(([t, ks]) => `<div class="rmd-grupo">${t}</div>` + ks.map((k) => fila(k)).join('')).join('') +
      '<div class="rmd-panel-pie"><span>Ctrl+K = Ir a… · Ctrl+S = Guardar</span><button type="button" class="rmd-btn rmd-restablecer">Restablecer</button></div></div>';
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
