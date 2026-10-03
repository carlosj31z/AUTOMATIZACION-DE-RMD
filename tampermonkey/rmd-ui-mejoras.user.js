// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.42.0
// @description  Reglas de revisión propias (palabras, documentos, equipos; resaltado y avisos), documentos no vigentes según tu lista del DMS y equipos sin calificación según el registro OQ / PQ, columna Fase en la lista principal, Saludo al entrar con tus RMD en Ingresado y "Continuar con" el último, Ctrl+K = Ir a… (abrir un RMD o una herramienta), etapa y descripción del RMD en la pestaña, filtro "Equipo" en la barra de filtros (compacta, en una fila), Modificaciones masivas (suspender y observaciones), Enter = "Ir", diálogos a medida, columnas ordenadas, estado del RMD, alertas de casillas incoherentes y predecesor obligatorio, copiar/pegar un paso en uno o varios pasos, pasos en minúsculas desde uno en MAYÚSCULAS, procesos menores mal configurados marcados sin abrirlos, PM OP marcada a la vista, reordenar y editar Especificaciones, aviso de códigos y de nomenclatura en Asociar Fórmula, botón Nuevo Paso al adicionar pasos, Ver OP sin límite de 5 (carga rápida), filtrable y exportable a CSV, Documentos citados de todo el RMD (en segundos, Excel), menú Exportar (original con Producción Estado, Equipos por master e Indicadores del mes), Buscar RMD por equipo, Suspensión masiva, plantilla para Producción (borrador de cambios a un RMD sin SAP en un archivo .html con la hoja del PDF y búsqueda de pasos existentes, importado como plan de ingreso solo en RMD Ingresados), historial de cambios en Trazabilidad RMD (qué cambió entre versiones y cada guardado con su usuario, con Excel), aviso de recetas con la lista de materiales cambiada en SAP (⚠ con el detalle junto al código, al día sin cerrar la ventana; hoja de ruta y puesto opcional), panel "Pasos a agregar" (cantidad y orden de cada paso, también en procesos menores), Cambiar un paso o proceso menor por otro código conservando su configuración (y los procesos menores del paso), Editar Paso que avisa si el paso lo usan otros RMD y deja elegir dónde aplicar el cambio (sin duplicar pasos), reordenar fórmulas, varias recetas a la vez y mismo puesto de trabajo, jefe de revisión en Producción Estatus, RMD en vivo que va a lo que cambió (opcional), aviso del orden de las estructuras según los últimos autorizados, envío directo del maestro de RMD con sus recetas a Status RMD, sesión prolongada automáticamente (sin el error del refresco al volver) y más.
// @match        https://*.hana.ondemand.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const VERSION = '1.42.0';                                                       // mantener igual a @version
  const CLAVE = 'rmdUiMejoras';
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
  const guardar = (o) => { try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } };
  const OPC = [
    ['activo', 'Mejoras activas'], ['enter', 'Enter en un filtro = pulsar "Ir"'], ['ancho', 'Diálogos a medida'], ['columnas', 'Columnas ordenadas: anchos a medida en las ventanas del RMD y, en la lista principal, un orden más claro (Código, Versión, Descripción, Etapa, Estado, Fase…) con anchos según la pantalla'],
    ['ocultar', 'Ocultar Estado Mov., Imagen, Formato (menos en Procesos Menores, donde trae el matraz de «Fórmula»), PM OP, Gen PP'], ['grupos', 'Tooltips en las cabeceras'],
    ['depende', 'Depende: tooltip con el paso'], ['sintipo', '"Sin tipo de dato" en rojo y negrita'],
    ['puesto', 'Puesto de Trabajo faltante parpadea'], ['reglas', 'Alertas de casillas incoherentes'],
    ['estado', 'Estado del RMD en la cabecera'], ['pmtitulo', 'Título completo del paso menor'],
    ['filtro', 'Filtro local en las listas de pasos (por texto, código u orden)'], ['copiar', 'Copiar / Pegar la configuración de un paso en uno o varios pasos'], ['asociar', 'Asociar fórmulas: avisar códigos distintos a la versión anterior y validar la 1ª línea de Observaciones'],
    ['singuardar', 'Avisar cambios sin guardar + Ctrl+S'], ['exito', 'Cerrar solos los mensajes de éxito'], ['espec', 'Especificaciones: reordenar filas y editar sus textos'],
    ['sesion', 'Prolongar la sesión (clic automático en "Continuar trabajando" y sin el error del refresco automático al volver)'],
    ['nuevopaso', 'Botón "Nuevo Paso" al adicionar pasos (abre Configuración Maestra)'],
    ['pasominusculas', 'Pasar a minúsculas: botón "En minúsculas" en pasos y procesos menores (crea el paso en minúsculas con "Nuevo Paso" ya lleno; al crearlo, código copiado y opción de reemplazarlo en la fila) y botón "Aa" en la Descripción de "Nuevo Paso" / "Editar Paso"'],
    ['verop', 'Ver OP: ver todas (rápido), filtrar por columna y exportar a CSV'],
    ['documentos', 'Botón "Documentos citados" en el RMD: instructivos, procedimientos y formatos citados en sus pasos y procesos menores (Excel)'],
    ['statusrmd', 'Botón "Enviar a Status RMD" (maestro completo, sin archivo)'],
    ['indicadores', '"Indicadores del mes" en el menú Exportar (Excel del mes con tablas dinámicas)'],
    ['exportar', 'Menú en el icono "Exportar": exportado original con "Producción Estado", Equipos por master, Indicadores y Documentos citados en todos los master'],
    ['equipos', '"Equipos por master" en el menú Exportar (Excel de todos los master con sus equipos, instrumentos y materiales)'],
    ['buscarequipo', 'Filtro "Equipo" en la barra de filtros de la lista (master con un equipo, instrumento, utensilio o agrupador)'],
    ['barrafiltros', 'Barra de filtros compacta: "Agrupador", ⟳ rojo en lugar de "Restablecer" y todas las tarjetas en una fila'],
    ['suspension', 'Modificaciones masivas: suspender Autorizados o Ingresados y agregar una observación a varios master (desde este panel o Ctrl+K)'],
    ['citastodos', '"Documentos citados en todos los master" en el menú Exportar'],
    ['recetas', 'Avisar si la lista de materiales de una receta asociada cambió en SAP (⚠ con el detalle junto al código y botón "Revisar recetas" en Asociar fórmulas)'],
    ['repetirpaso', 'Adicionar Pasos (también en procesos menores): panel "Pasos a agregar" con la cantidad de cada paso (− n +) y su orden (↑ ↓); Agregar los agrega así'],
    ['cambiarpaso', 'Botón "Cambiar paso" (pasos y procesos menores): cambia un paso por otro código de paso ya creado, sin tocar su configuración ni, en un paso mayor, sus procesos menores'],
    ['editarpaso', 'Editar Paso: avisa si el paso lo usan otros RMD y, al Grabar, deja elegir "Solo en este RMD" (paso nuevo o el ya existente, sin duplicar) o "En todos"'],
    ['formulas', 'Fórmulas: subir / bajar los términos sin eliminarlos (Alt+↑ / Alt+↓)'],
    ['recetasvarias', 'Asociar fórmulas: marcar varias recetas y eliminarlas de una vez'],
    ['puestoreceta', 'Asociar fórmulas: no asociar recetas con un puesto de trabajo distinto al de las ya asociadas'],
    ['revisor', 'Producción Estatus: nombre del jefe (y gerente) a quien se envió a revisión'],
    ['vivo', 'RMD en vivo: el PDF del RMD a la derecha, actualizado tras cada cambio guardado (las ventanas pasan a la mitad izquierda)'],
    ['ordenest', 'Orden de las estructuras del RMD según los últimos autorizados de su sección y etapa'],
    ['saludo', 'Saludo al entrar ("Buenos días, …") con tus RMD en Ingresado y "Continuar con" el último RMD; se desvanece solo'],
    ['paleta', 'Ctrl+K = Ir a…: abrir un RMD (recientes, los tuyos o por código) o una herramienta sin buscarla'],
    ['titulo', 'La pestaña del navegador muestra la etapa y la descripción del RMD abierto ("FAB - …")'],
    ['fase', 'Columna "Fase" en la lista principal (de la 1ª línea de Observaciones: F1 = Fase 1, F1R = Fase 1 R, F2 = Fase 2…)'],
    ['cambiosrecetas', 'Cambios de recetas en SAP: icono tenue junto a «Manufactura Digital» con los RMD Ingresados y Autorizados cuya receta cambió en SAP (con fecha, observación y Excel en el menú Exportar)'],
    ['plantillaprod', 'Plantilla para Producción: archivo .html con la hoja del PDF para que Producción deje su borrador de cambios sin SAP (con búsqueda de pasos existentes) e importarlo como plan de ingreso en un RMD Ingresado'],
    ['historialcambios', 'Historial de cambios en «Trazabilidad RMD»: qué cambió entre versiones y, por paso, cada guardado con su usuario (desde la auditoría del servicio), con Excel'],
    ['recetasauto', 'Cambios de recetas: revisarlos solos en segundo plano (las listas de los Ingresados cada 3 h y las de los Autorizados cada 24 h, poco a poco; apagado, solo con «Revisar»)'],
    ['reglasrev', 'Reglas de revisión: resaltar y avisar lo que definas (palabras, códigos de documento o de equipo) y los documentos citados que no están en tu lista de vigentes (botón «Reglas de revisión…»)'],
  ];
  const opc = Object.assign(Object.fromEntries(OPC.map(([k]) => [k, true])), leer());
  opc.recetaruta = true;                                                  // (siempre activo: el aviso de recetas incluye la hoja de ruta y el puesto de trabajo)
  const on = (k) => opc.activo && opc[k];
  // Apagadas por defecto: "RMD en vivo" cambia la disposición de las ventanas; solo se activa si la persona lo elige.
  const APAGADAS_POR_DEFECTO = ['vivo'];
  APAGADAS_POR_DEFECTO.forEach((k) => { if (opc[k] === true && leer()[k] === undefined) opc[k] = false; });
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
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && opc.activo && document.querySelector('.rmd-modal-fondo')) {   // Ctrl+S es de la ventana del script (no guarda la de SAP de debajo)
      const propia = [...document.querySelectorAll('.rmd-modal-fondo')].pop(); e.preventDefault(); e.stopPropagation(); if (propia.__ctrlS) propia.__ctrlS(); return;
    }
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
    if (t.closest('.rmd-sel-panel, .rmd-modal, .rmd-paleta, .rmd-vivo-panel, #rmd-ui-panel')) return;   // campos del propio script (p. ej. la cantidad de "Pasos a agregar")
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
  .rmd-receta-aviso b { color: var(--rmd-ambar); } .rmd-receta-aviso .rmd-receta-cod { cursor: pointer; } .rmd-receta-aviso .rmd-receta-cod:hover { text-decoration: underline; }
  .rmd-rec-icono { display: inline-flex; align-items: center; gap: 2px; margin-left: 6px; padding: 0 6px; height: 18px; border: 1px solid var(--rmd-ambar); border-radius: 9px; background: rgba(240,180,90,.14); color: var(--rmd-ambar); font: 700 11px var(--rmd-fuente); cursor: pointer; vertical-align: middle; }
  .rmd-rec-icono:hover { background: var(--rmd-ambar); color: #1d232a; }
  .rmd-rec-detalle { position: fixed; z-index: 100002; max-height: min(70vh, 620px); overflow: auto; padding: 12px 14px 10px; border-radius: 8px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-top: 3px solid var(--rmd-ambar); box-shadow: 0 14px 40px rgba(0,0,0,.45); font: 12.5px/1.4 var(--rmd-fuente); }
  .rmd-rec-detalle.fijo { box-shadow: 0 14px 40px rgba(0,0,0,.55), 0 0 0 1px var(--rmd-ambar); }
  .rmd-rec-detalle hr { border: 0; border-top: 1px solid var(--rmd-borde); margin: 10px 0; }
  .rmd-rec-cab b { font-size: 14px; } .rmd-rec-cab span { color: var(--rmd-apagado); }
  .rmd-rec-sub { margin: 8px 0 4px; font-weight: 600; color: var(--rmd-ambar); }
  /* v1.37: icono tenue junto al título de la lista y ventana «Cambios de recetas en SAP» */
  .rmd-alerta-rec { display: inline-flex; align-items: center; gap: 3px; margin: 0 0 0 6px; padding: 2px 6px; border: 0; border-radius: 10px; background: transparent; color: var(--rmd-ambar); font: 600 11px var(--rmd-fuente); cursor: pointer; opacity: .5; vertical-align: middle; }
  .rmd-alerta-rec svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  .rmd-alerta-rec:hover, .rmd-alerta-rec:focus-visible { opacity: 1; background: rgba(240,180,90,.14); outline: none; }
  .rmd-alerta-rec.vacio { color: var(--rmd-apagado); opacity: .28; } .rmd-alerta-rec.vacio:hover { opacity: .8; }
  .rmd-alerta-rec.leyendo svg { animation: rmd-alerta-suave 2.6s ease-in-out infinite; } @keyframes rmd-alerta-suave { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
  .rmd-modal.rmd-cr { width: min(1240px, 96vw); height: min(820px, 92vh); }
  .rmd-cr-intro { margin: 0 0 8px; color: var(--rmd-apagado); font-size: 13px; line-height: 1.45; }
  .rmd-cr-barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 4px 0 6px; }
  .rmd-cr-chips { display: flex; gap: 4px; flex-wrap: wrap; } .rmd-cr-chips button { padding: 5px 11px; border: 1px solid var(--rmd-borde); border-radius: 14px; background: transparent; color: var(--rmd-texto); font: 600 12px var(--rmd-fuente); cursor: pointer; }
  .rmd-cr-chips button span { margin-left: 3px; color: var(--rmd-apagado); font-weight: 400; } .rmd-cr-chips button.activo { background: var(--rmd-acento); border-color: var(--rmd-acento); color: #fff; } .rmd-cr-chips button.activo span { color: #fff; }
  .rmd-cr-buscar { width: min(360px, 100%); height: 30px; padding: 0 10px; border: 1px solid var(--rmd-borde-campo); border-radius: 6px; background: transparent; color: var(--rmd-texto); font: 13px var(--rmd-fuente); }
  .rmd-cr-estado.error { color: var(--rmd-rojo); } .rmd-cr-t { font-size: 12.5px; } .rmd-cr-t td.rmd-cr-sel, .rmd-cr-t th.rmd-cr-sel { width: 26px; padding-right: 0; }
  .rmd-cr-fila.abierta td { border-bottom-color: transparent; } .rmd-cr-detalle > td { padding: 4px 12px 14px 34px; background: rgba(128,140,155,.08); font-size: 12.5px; } .rmd-cr-detalle hr { border: 0; border-top: 1px solid var(--rmd-borde); margin: 10px 0; }
  .rmd-cr-tag { display: inline-block; margin: 0 4px 2px 0; padding: 0 7px; border-radius: 9px; font: 700 10.5px/17px var(--rmd-fuente); white-space: nowrap; background: rgba(240,180,90,.18); color: var(--rmd-ambar); } .rmd-cr-tag.ruta { background: rgba(27,141,236,.18); color: var(--rmd-acento-texto); } .rmd-cr-tag.dos { background: rgba(160,120,240,.2); color: #b79cf2; }
  .rmd-cr-obs { min-width: 300px; font-size: 12px; } .rmd-cr-obs-in { box-sizing: border-box; width: 100%; height: 28px; padding: 0 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 6px; background: transparent; color: var(--rmd-texto); font: 12px var(--rmd-fuente); } .rmd-cr-obs .rmd-nota { font-size: 11px; opacity: .8; }
  .rmd-rec-fechas { margin: 2px 0 6px; font-size: 12px; color: var(--rmd-texto); } .rmd-rec-cuando { white-space: nowrap; font-size: 12px; }
  .rmd-rec-tabla { width: 100%; border-collapse: collapse; } .rmd-rec-tabla th { text-align: left; padding: 4px 6px; color: var(--rmd-apagado); font-weight: 600; border-bottom: 1px solid var(--rmd-borde); white-space: nowrap; }
  .rmd-rec-tabla td { padding: 4px 6px; border-bottom: 1px solid rgba(128,128,128,.18); vertical-align: top; } .rmd-rec-tabla td:nth-child(n+4) { white-space: nowrap; }
  .rmd-rec-marca { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-weight: 700; }
  tr.rmd-rec-reemplazo .rmd-rec-marca { background: rgba(27,141,236,.2); color: var(--rmd-acento-texto); } .rmd-rec-antes { color: var(--rmd-apagado); font-weight: 400; text-decoration: line-through; } tr.rmd-rec-reemplazo td:nth-child(5) { font-weight: 600; }
  tr.rmd-rec-nuevo .rmd-rec-marca { background: rgba(143,209,158,.2); color: var(--rmd-verde); } tr.rmd-rec-quitado .rmd-rec-marca { background: rgba(255,138,138,.18); color: var(--rmd-rojo); } tr.rmd-rec-cambia .rmd-rec-marca { background: rgba(240,180,90,.2); color: var(--rmd-ambar); }
  tr.rmd-rec-quitado td:nth-child(n+2) { color: var(--rmd-apagado); text-decoration: line-through; } tr.rmd-rec-cambia td:nth-child(n+3) { color: var(--rmd-texto); } tr.rmd-rec-cambia td:last-child, tr.rmd-rec-nuevo td:last-child { font-weight: 600; }
  .rmd-rec-delta { color: var(--rmd-ambar); font-weight: 600; } .rmd-rec-linea { margin: 6px 0 0; } .rmd-rec-rojo { color: var(--rmd-rojo); } .rmd-rec-nuevo { color: var(--rmd-verde); font-weight: 600; } span.rmd-rec-quitado { color: var(--rmd-rojo); font-weight: 600; }
  .rmd-rec-pie { margin-top: 10px; color: var(--rmd-apagado); font-size: 12px; }
  /* v1.40–v1.41: Plantilla para Producción e importación del borrador */
  .rmd-modal.rmd-pp { width: min(760px, 96vw); } .rmd-modal.rmd-pp-imp { width: min(1280px, 97vw); height: min(860px, 94vh); }
  .rmd-pp-campo { display: block; margin: 12px 0 8px; font-weight: 600; } .rmd-pp-campo input { display: block; width: 260px; height: 32px; margin-top: 4px; padding: 0 10px; border: 1px solid var(--rmd-borde-campo); border-radius: 6px; background: transparent; color: var(--rmd-texto); font: 14px var(--rmd-fuente); }
  .rmd-pp-cab { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; } .rmd-pp-checks { margin: 6px 0 10px; padding-left: 4px; list-style: none; } .rmd-pp-checks li { margin: 3px 0; }
  .rmd-pp-t { font-size: 12.5px; } .rmd-pp-t td { vertical-align: top; } .rmd-pp-agregar td:first-child { box-shadow: inset 3px 0 0 var(--rmd-verde); } .rmd-pp-quitar td:first-child { box-shadow: inset 3px 0 0 var(--rmd-rojo); }
  .rmd-pp-cambiar td:first-child, .rmd-pp-valores td:first-child { box-shadow: inset 3px 0 0 var(--rmd-ambar); } .rmd-pp-mover td:first-child { box-shadow: inset 3px 0 0 var(--rmd-acento); }
  .rmd-pp-crea { display: inline-block; margin-left: 4px; padding: 0 7px; border-radius: 9px; background: rgba(122,63,191,.16); color: #b48cf0; font: 700 11px/18px var(--rmd-fuente); }
  html:not(.sapUiTheme-sap_fiori_3_dark) .rmd-pp-crea { color: #7a3fbf; } .rmd-pp-av { margin-top: 3px; font-size: 12px; } .rmd-pp-av.error { color: var(--rmd-rojo); } .rmd-pp-av.aviso { color: var(--rmd-ambar); }
  .rmd-modal.rmd-pp-ing { width: min(1100px, 96vw); height: min(820px, 92vh); } .rmd-pp-tabla { max-height: 46vh; overflow: auto; margin: 8px 0; border: 1px solid var(--rmd-borde-campo); border-radius: 6px; } .rmd-pp-conf { display: block; margin: 10px 0 4px; }
  .rmd-pp-e-hecho td:last-child { color: var(--rmd-verde); } .rmd-pp-e-simulado td:last-child { color: var(--rmd-acento-texto); } .rmd-pp-e-error td { background: rgba(220,53,69,.12); } .rmd-pp-e-error td:last-child { color: var(--rmd-rojo); }
  .rmd-pp-rojo { color: var(--rmd-rojo); } .rmd-pp-sap { margin: 10px 0; } .rmd-pp-sap summary { cursor: pointer; color: var(--rmd-acento-texto); }
  /* v1.38: historial de cambios dentro de «Trazabilidad del RMD» (pestañas; la original no se toca) */
  html.rmd-ui .sapMDialog.rmd-tz-on, html.rmd-ui .sapMDialog.rmd-medio.rmd-tz-on { position: fixed !important; width: min(1500px, 97vw) !important; max-width: 97vw !important; height: auto !important; max-height: none !important;
    top: 12px !important; bottom: 12px !important; left: 50% !important; transform: translateX(-50%) !important; display: flex !important; flex-direction: column !important; }
  html.rmd-ui .sapMDialog.rmd-tz-on > section { flex: 1 1 auto !important; min-height: 0 !important; height: auto !important; overflow: auto !important; } html.rmd-ui .sapMDialog.rmd-tz-on > header, html.rmd-ui .sapMDialog.rmd-tz-on > footer { flex: 0 0 auto !important; }
  .sapMDialog.rmd-tz-on .sapMDialogScroll, .sapMDialog.rmd-tz-on .sapMDialogScrollCont { height: auto !important; }
  .rmd-tz-on .sapMDialogScrollCont > :not(.rmd-tz) { display: none !important; }
  .rmd-tz { margin: 8px 12px; color: var(--rmd-texto); font: 13px var(--rmd-fuente); text-align: left; } .rmd-tz.est .rmd-tz-cuerpo, .rmd-tz.est .rmd-tz-excel { display: none; }
  .rmd-tz-barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; } .rmd-tz-resumen { margin: 2px 0 8px; color: var(--rmd-apagado); }
  .rmd-tz-sel { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 4px 0 8px; } .rmd-tz-sel label { display: inline-flex; align-items: center; gap: 6px; }
  .rmd-tz-sel select { height: 30px; max-width: 380px; padding: 0 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 6px; background: var(--rmd-superficie); color: var(--rmd-texto); font: 13px var(--rmd-fuente); }
  .rmd-tz-acc { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; } .rmd-tz-t { font-size: 12.5px; } .rmd-tz-antes { color: var(--rmd-apagado); } .rmd-tz-desp { font-weight: 600; }
  tr.rmd-tz-quitado .rmd-tz-antes { text-decoration: line-through; } .rmd-tz-lista { margin-top: 4px; }
  .rmd-tz-fila { border-bottom: 1px solid rgba(128,140,155,.16); } .rmd-tz-fila-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 4px; } .rmd-tz-rotulo { min-width: 0; overflow-wrap: anywhere; }
  .rmd-tz-detalle { padding: 2px 8px 12px 20px; background: rgba(128,140,155,.07); } .rmd-tz [hidden] { display: none !important; } .rmd-tz-aut { margin-left: 4px; font-size: 11px; color: var(--rmd-apagado); cursor: help; }
  html.rmd-ui .sapMDialog.rmd-medio.rmd-selector-ancho { width: min(1480px, 96vw) !important; }
  .sapMToken.rmd-token-rep { display: inline-flex !important; align-items: center; }
  .rmd-restablecer-ui5 .sapMBtnIcon, .rmd-restablecer-ui5 .sapUiIcon { color: var(--rmd-rojo) !important; } .rmd-restablecer-ui5 .sapMBtnInner { border-color: transparent !important; background: transparent !important; }
  #rmd-ui-panel .rmd-panel-acciones { margin: 8px 0 2px; } #rmd-ui-panel .rmd-mod-masivas { width: 100%; border-color: var(--rmd-rojo); color: var(--rmd-rojo); } #rmd-ui-panel .rmd-mod-masivas:hover { background: var(--rmd-rojo); color: #fff; }
  .rmd-mm-modos { display: flex; gap: 0; margin: 0 0 10px; border-bottom: 1px solid var(--rmd-borde); }
  .rmd-mm-modo { padding: 7px 14px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--rmd-apagado); font: 600 13px var(--rmd-fuente); cursor: pointer; } .rmd-mm-modo.activo { color: var(--rmd-texto); border-bottom-color: var(--rmd-acento); }
  .rmd-sel-panel { margin: 6px 16px 8px; padding: 8px 10px; border: 1px solid var(--rmd-acento); border-radius: 6px; background: rgba(27,141,236,.07); color: var(--rmd-texto); font: 13px var(--rmd-fuente); }
  .rmd-sel-cab { display: flex; gap: 12px; align-items: baseline; margin-bottom: 6px; } .rmd-sel-cab span { color: var(--rmd-apagado); font-size: 12px; }
  .rmd-sel-lista { margin: 0; padding: 0; list-style: none; max-height: 190px; overflow: auto; }
  .rmd-sel-lista li { display: flex; align-items: center; gap: 10px; padding: 3px 4px; border-bottom: 1px solid rgba(128,128,128,.18); }
  .rmd-sel-pos { min-width: 44px; color: var(--rmd-apagado); font-size: 12px; } .rmd-sel-cod { min-width: 70px; font-weight: 600; } .rmd-sel-desc { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .rmd-sel-cant, .rmd-sel-mov { display: inline-flex; align-items: center; gap: 3px; }
  .rmd-sel-panel button { min-width: 26px; height: 24px; padding: 0 6px; border: 1px solid var(--rmd-borde); border-radius: 4px; background: var(--rmd-superficie); color: var(--rmd-acento-texto); font: 700 14px var(--rmd-fuente); cursor: pointer; }
  .rmd-sel-panel button:hover:not(:disabled) { background: var(--rmd-acento); color: #fff; } .rmd-sel-panel button:disabled { opacity: .35; cursor: default; } .rmd-sel-panel .rmd-sel-quitar { color: var(--rmd-rojo); }
  .rmd-sel-cant input { width: 44px; height: 22px; text-align: center; border: 1px solid var(--rmd-borde); border-radius: 4px; background: transparent; color: inherit; font: 600 13px var(--rmd-fuente); }
  .rmd-ep-aviso { margin: 8px 16px 0; padding: 7px 10px; border-left: 3px solid var(--rmd-acento); border-radius: 3px; background: rgba(27,141,236,.10); color: var(--rmd-texto); font: 13px/1.45 var(--rmd-fuente); }
  .rmd-ep-cambio { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; } .rmd-ep-cambio div { padding: 8px 10px; border: 1px solid var(--rmd-borde); border-radius: 6px; }
  .rmd-ep-cambio span { color: var(--rmd-apagado); font-size: 12px; } .rmd-ep-cambio p { margin: 4px 0 0; } .rmd-ep-cambio div:first-child p { color: var(--rmd-apagado); }
  .rmd-ep-opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
  .rmd-ep-op { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 2px solid var(--rmd-borde); border-radius: 8px; background: var(--rmd-superficie); color: var(--rmd-texto); text-align: left; font: 13px/1.4 var(--rmd-fuente); cursor: pointer; }
  .rmd-ep-op b { font-size: 14.5px; } .rmd-ep-op em { font-style: normal; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #2e7d32; } .rmd-ep-op span { color: var(--rmd-apagado); }
  .rmd-ep-op.verde { border-color: #2e7d32; } .rmd-ep-op.verde:hover { background: rgba(46,125,50,.14); } .rmd-ep-op.ambar { border-color: #b26a00; } .rmd-ep-op.ambar:hover:not(:disabled) { background: rgba(178,106,0,.14); }
  .rmd-ep-op:disabled { opacity: .5; cursor: not-allowed; }
  .rmd-ep-barra { height: 6px; border-radius: 3px; background: rgba(128,128,128,.25); overflow: hidden; } .rmd-ep-barra i { display: block; height: 100%; width: 0; background: var(--rmd-acento); transition: width 1s linear; }
  .rmd-cp-actual { padding: 8px 10px; border: 1px solid var(--rmd-borde); border-radius: 6px; margin-bottom: 8px; } .rmd-cp-actual span { color: var(--rmd-apagado); font-size: 12px; } .rmd-cp-actual p { margin: 4px 0 0; }
  .rmd-cp-busca { display: flex; gap: 8px; margin: 8px 0; } .rmd-cp-busca input { flex: 1; }
  .rmd-cp-res tr[data-i] { cursor: pointer; } .rmd-cp-res tr.rmd-cp-sel td { background: rgba(27,141,236,.16); }
  .rmd-creado { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 100001; display: flex; flex-direction: column; gap: 4px; min-width: 380px; max-width: min(640px, 90vw); padding: 12px 16px; border-radius: 8px; background: var(--rmd-superficie); color: var(--rmd-texto); border: 1px solid var(--rmd-borde); border-left: 4px solid var(--rmd-verde); box-shadow: 0 10px 30px rgba(0,0,0,.4); font: 13px/1.4 var(--rmd-fuente); }
  .rmd-creado b { font-size: 14.5px; } .rmd-creado-pie { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
  .rmd-token-mas { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 14px; height: 14px; margin: 0 2px 0 6px; border-radius: 3px; background: var(--rmd-acento); color: #fff; font: 700 12px/1 var(--rmd-fuente); cursor: pointer; }
  .rmd-token-mas:hover { filter: brightness(1.15); } .sapMToken[draggable] { cursor: grab; } .sapMToken.rmd-token-arrastre { opacity: .45; } .sapMToken.rmd-token-destino { box-shadow: -3px 0 0 var(--rmd-acento); }
  .rmd-btn.exito { background: #2e7d32; border-color: #2e7d32; color: #fff; } .rmd-btn.exito:hover { background: #276c2b; }
  .rmd-btn.ambar { background: #b26a00; border-color: #b26a00; color: #fff; } .rmd-btn.ambar:hover { background: #995b00; } .rmd-btn.ambar:disabled { opacity: .45; }
  .rmd-formula-orden { display: inline-flex; gap: 6px; margin: 0 10px; } .rmd-formula-orden .rmd-btn { height: 30px; padding: 0 10px; }
  .rmd-revisor { display: inline-block; vertical-align: middle; margin: 2px 0 2px 6px; text-align: left; font-size: 11.5px; line-height: 1.25; color: var(--rmd-apagado); white-space: pre-line; }   /* junto al icono si cabe; si no, debajo */
  .sapMListTbl td:has(> .rmd-revisor) > .sapMBtn { vertical-align: middle; }
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
  /* ── Reglas de revisión (v1.34): resaltado, aviso en la ventana del RMD y su ventana ── */
  .rmd-c-amarillo { --rmd-c: #e0a100; --rmd-cf: rgba(242,176,30,.36); } .rmd-c-rojo { --rmd-c: #e53935; --rmd-cf: rgba(229,57,53,.24); } .rmd-c-azul { --rmd-c: #1e88e5; --rmd-cf: rgba(30,136,229,.24); }
  .rmd-c-verde { --rmd-c: #2e9d4a; --rmd-cf: rgba(67,160,71,.26); } .rmd-c-morado { --rmd-c: #8e24aa; --rmd-cf: rgba(142,36,170,.24); }
  mark.rmd-regla { padding: 0 1px; border-radius: 2px; background: var(--rmd-cf); color: inherit; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  mark.rmd-regla.aviso { box-shadow: inset 0 -2px 0 var(--rmd-c); }
  mark.rmd-regla[data-etq]::after { content: attr(data-etq); display: inline-block; margin-left: 4px; padding: 0 5px; border-radius: 8px; background: var(--rmd-c); color: #fff; font: 700 9.5px/15px var(--rmd-fuente); letter-spacing: .3px; text-transform: uppercase; vertical-align: 1px; white-space: nowrap; }
  .rmd-reglas-aviso { margin: 6px 16px 4px; padding: 7px 10px; border-left: 3px solid #e53935; border-radius: 3px; background: rgba(229,57,53,.08); color: var(--rmd-texto); font: 13px/1.45 var(--rmd-fuente); }
  .rmd-reglas-aviso b { color: var(--rmd-rojo); } .rmd-reglas-aviso.ok { padding: 3px 10px; border-left-color: var(--rmd-verde); background: transparent; color: var(--rmd-apagado); }
  .rmd-reglas-aviso button { margin-left: 8px; padding: 0 2px; border: 0; background: none; color: var(--rmd-acento-texto); font: 600 13px var(--rmd-fuente); text-decoration: underline; cursor: pointer; }
  .rmd-modal.rmd-reglas { width: min(1000px, 96vw); height: min(800px, 90vh); } .rmd-modal.rmd-reglas-detalle { width: min(1100px, 96vw); }
  .rmd-rg-tabs { display: flex; gap: 4px; margin: -4px 0 12px; border-bottom: 1px solid var(--rmd-borde); }
  .rmd-rg-tabs button { padding: 7px 14px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--rmd-apagado); font: 600 13.5px var(--rmd-fuente); cursor: pointer; }
  .rmd-rg-tabs button.activa { color: var(--rmd-acento-texto); border-bottom-color: var(--rmd-acento); } .rmd-rg-tabs button span { font-weight: 400; }
  .rmd-rg-barra { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0 12px; } .rmd-rg-esp { flex: 1 1 auto; }
  .rmd-rg-fila { display: flex; align-items: flex-start; gap: 10px; padding: 9px 8px; border-bottom: 1px solid rgba(128,140,155,.2); } .rmd-rg-fila:hover { background: rgba(27,141,236,.06); }
  .rmd-rg-fila.inactiva .rmd-rg-info > div:first-child, .rmd-rg-fila.inactiva .rmd-rg-color { opacity: .5; }
  .rmd-rg-info { flex: 1 1 auto; min-width: 0; cursor: pointer; } .rmd-rg-info b { font-weight: 600; }
  .rmd-rg-color { flex: none; display: inline-block; width: 14px; height: 14px; margin-top: 3px; border-radius: 3px; background: var(--rmd-c); vertical-align: -2px; }
  .rmd-rg-etq { display: inline-block; margin-left: 8px; padding: 0 6px; border-radius: 8px; background: var(--rmd-c); color: #fff; font: 700 10px/16px var(--rmd-fuente); text-transform: uppercase; vertical-align: 1px; }
  .rmd-rg-pred { margin-left: 8px; color: var(--rmd-apagado); font-size: 11.5px; }
  .rmd-rg-acc { display: flex; flex: none; gap: 4px; } .rmd-rg-acc button { width: 28px; height: 26px; border: 1px solid var(--rmd-borde); border-radius: 4px; background: transparent; color: var(--rmd-acento-texto); font: 14px var(--rmd-fuente); cursor: pointer; }
  .rmd-rg-acc button:hover:not(:disabled) { background: var(--rmd-acento); border-color: var(--rmd-acento); color: #fff; } .rmd-rg-acc button:disabled { opacity: .3; cursor: default; }
  .rmd-rg-acc button.peligro { color: var(--rmd-rojo); } .rmd-rg-acc button.peligro:hover { background: var(--rmd-rojo); border-color: var(--rmd-rojo); color: #fff; }
  .rmd-rg-error, .rmd-rg-err { margin: 2px 0 0; color: var(--rmd-rojo); font-size: 12.5px; } .rmd-rg-err.aviso { color: var(--rmd-ambar); } .rmd-rg-falta { margin: 2px 0 0; color: var(--rmd-ambar); font-size: 12.5px; }
  .rmd-rg-link { padding: 0; border: 0; background: none; color: var(--rmd-acento-texto); font: inherit; text-decoration: underline; cursor: pointer; }
  .rmd-switch { position: relative; flex: none; display: inline-block; width: 34px; height: 19px; margin-top: 1px; cursor: pointer; }
  .rmd-switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .rmd-switch span { position: absolute; inset: 0; border-radius: 10px; background: var(--rmd-borde-campo); transition: background .15s; pointer-events: none; }
  .rmd-switch span::after { content: ''; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #fff; transition: transform .15s; }
  .rmd-switch input:checked + span { background: var(--rmd-acento); } .rmd-switch input:checked + span::after { transform: translateX(15px); } .rmd-switch input:focus-visible + span { outline: 2px solid var(--rmd-acento-texto); outline-offset: 2px; }
  .rmd-modal-pie .rmd-rg-estado { margin-right: auto; align-self: center; color: var(--rmd-apagado); font-size: 12.5px; }
  .rmd-rg-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 22px; align-items: start; }
  .rmd-rg-form h4 { grid-column: 1 / -1; margin: 10px 0 0; padding-top: 10px; border-top: 1px solid var(--rmd-borde); color: var(--rmd-apagado); font: 600 11px var(--rmd-fuente); letter-spacing: .6px; text-transform: uppercase; }
  .rmd-rg-form h4:first-child { margin-top: 0; padding-top: 0; border-top: 0; } .rmd-rg-form .ancho { grid-column: 1 / -1; }
  .rmd-rg-campo { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
  .rmd-rg-form input[type=text], .rmd-rg-form select, .rmd-rg-form textarea, .rmd-rg-q { box-sizing: border-box; min-height: 30px; padding: 4px 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-barra); color: var(--rmd-texto); font: 13px var(--rmd-fuente); }
  .rmd-rg-form input[type=text], .rmd-rg-form select, .rmd-rg-form textarea { width: 100%; } .rmd-rg-check input, .rmd-rg-imp input, .rmd-rd-todos { width: auto; flex: none; margin: 0; }
  .rmd-rg-form textarea { resize: vertical; line-height: 1.4; } .rmd-rg-form input:focus, .rmd-rg-form select:focus, .rmd-rg-form textarea:focus, .rmd-rg-q:focus { outline: none; border-color: var(--rmd-acento); }
  .rmd-rg-check { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; } .rmd-rg-abajo { align-self: end; min-height: 30px; }
  .rmd-rg-colores { display: flex; gap: 10px; padding: 3px 0; } .rmd-rg-sw { position: relative; width: 22px; height: 22px; cursor: pointer; } .rmd-rg-sw input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
  .rmd-rg-sw span { display: block; width: 100%; height: 100%; border-radius: 50%; background: var(--rmd-c); pointer-events: none; }
  .rmd-rg-sw input:checked + span { box-shadow: 0 0 0 2px var(--rmd-superficie), 0 0 0 4px var(--rmd-c); } .rmd-rg-sw input:focus-visible + span { outline: 2px solid var(--rmd-acento-texto); outline-offset: 4px; }
  .rmd-rg-ayuda { margin: 0; color: var(--rmd-apagado); font-size: 12px; } .rmd-rg-res { min-height: 24px; }
  .rmd-rg-texto { padding: 7px 10px; border: 1px dashed var(--rmd-borde); border-radius: 4px; white-space: pre-wrap; line-height: 1.65; }
  .rmd-rg-vig-ok b { color: var(--rmd-verde); } .rmd-rg-buscar { margin: 10px 0 4px; } .rmd-rg-q { width: min(460px, 100%); }
  .rmd-modal.rmd-rg-soltar { outline: 3px dashed var(--rmd-acento); outline-offset: -8px; }
  .rmd-vig-si { color: var(--rmd-verde); font-weight: 600; white-space: nowrap; } .rmd-vig-no { color: var(--rmd-rojo); font-weight: 700; }
  td.rmd-vig-no { white-space: nowrap; }
  .rmd-rg-imp > label { display: flex; align-items: flex-start; gap: 8px; margin: 8px 0; cursor: pointer; } .rmd-rg-imp > label input { margin-top: 3px; }
  .rmd-rg-imp-lista { margin: 6px 0 12px 26px; padding: 6px 10px; border-left: 2px solid var(--rmd-borde); } .rmd-rg-imp-lista > div { margin: 4px 0; }
  #rmd-ui-panel .rmd-panel-acciones { display: flex; flex-direction: column; gap: 6px; } #rmd-ui-panel .rmd-abrir-reglas { width: 100%; justify-content: center; }
  #rmd-ui-panel .rmd-mod-masivas { justify-content: center; }
  .rmd-lista-compacta .sapMListTbl th, .rmd-lista-compacta .sapMListTbl td.sapMListTblCell { padding-left: 4px !important; padding-right: 4px !important; } .rmd-lista-compacta .sapMListTbl .sapMColumnHeader { padding-left: 2px !important; padding-right: 2px !important; }
  .rmd-lista-compacta .sapMListTbl th, .rmd-lista-compacta .sapMListTbl th .sapMText, .rmd-lista-compacta .sapMListTbl th .sapMLabel { font-size: 12px !important; }
  .rmd-rg-okcal { display: flex; align-items: flex-end; gap: 8px; margin: 4px 0 8px; } .rmd-rg-okcal .rmd-rg-campo { flex: 0 1 460px; }
  .rmd-rg-okcal input { box-sizing: border-box; width: 100%; min-height: 30px; padding: 4px 8px; border: 1px solid var(--rmd-borde-campo); border-radius: 4px; background: var(--rmd-barra); color: var(--rmd-texto); font: 13px var(--rmd-fuente); }
  .rmd-rg-okcal input:disabled, .rmd-rg-barra .rmd-btn:disabled, .rmd-rg-okcal .rmd-btn:disabled { opacity: .45; cursor: default; }
  .rmd-modal-pie .rmd-rg-izq { margin-right: auto; } .rmd-modal-pie .rmd-rg-estado + .rmd-btn.peligro { margin-left: auto; }
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
    'CONFORME': 110, 'PROCESO MENOR': 130, 'ACCIONES': 110, 'CANTIDAD INSUMOS': 150, 'UM': 64, 'TAB': 56, 'FORMATO': 66,
  };
  // versión compacta de los mismos anchos (ventanas de menos de ~1700 px de contenido)
  const ANCHOS_COMPACTOS = {
    'ORDEN': 50, 'CÓDIGO': 70, 'CODIGO': 70, 'TIPO DATO': 108, 'CLAVE MODELO': 80, 'PUESTO TRABAJO': 88, 'VAL. INICIAL': 56, 'VAL. FINAL': 56, 'MARGEN': 54, 'DECIMAL': 56, 'DECIM.': 56,
    'ESTADO CC': 52, 'PM OP': 40, 'GEN PP': 42, 'EDIT': 40, 'R. POR': 40, 'V.B.': 40, 'PROC. MEN.': 52, 'ESTADO': 58, 'FORMATO': 58,
  };
  const OCULTAS = ['ESTADO MOV.', 'IMAGEN', 'FORMATO', 'PM OP', 'GEN PP'];
  // «Formato» trae el matraz del tipo de dato «Fórmula» (abre la ventana de fórmulas): en los procesos menores se muestra (v1.37); en las demás tablas sigue oculta.
  const columnaOculta = (n, tabla, esPM) => on('ocultar') && OCULTAS.includes(n) && !(n === 'PM OP' && tabla.dataset.rmdPmop === '1') && !(n === 'FORMATO' && esPM);
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
  // siglas que se conservan tal cual (no se protege ninguna otra secuencia en mayusculas: el texto de entrada ya viene
  // todo en mayusculas, asi que "proteger cualquier palabra en mayusculas" dejaria todo el texto sin tocar)
  const SIGLAS_CONOCIDAS = new Set(['RMD', 'CC', 'UM', 'OP', 'PM', 'SAP', 'GMP', 'ID', 'OK', 'CT', 'POE', 'EPP', 'HEPA', 'UV', 'CIP', 'SIP', 'BPM',
    'BPF', 'WFI', 'USP', 'LAL', 'IPC', 'PVC', 'AISI', 'FEFO', 'FIFO', 'QR']);
  const MARCA = (i) => String.fromCharCode(1) + i + String.fromCharCode(2);
  const RX_MARCA = new RegExp(String.fromCharCode(1) + '(\\d+)' + String.fromCharCode(2), 'g');
  function capitalizarOracion(texto) {
    const CONSERVAR = [];
    let t = String(texto || '');
    t = t.replace(new RegExp(Reglas.FUENTE_DOC, 'g'), (m) => { CONSERVAR.push(m); return MARCA(CONSERVAR.length - 1); });
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
      if (columnaOculta(n, tabla, tipoTabla === 'pm') || (ocultarEstado && n === 'ESTADO')) return 0;
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
      d.classList.remove('rmd-g', 'rmd-pasos', 'rmd-medio', 'rmd-ancho', 'rmd-sticky'); revisarOrdenEstructuras(d, tabla); avisoRecetasRaiz(d, tabla);
      try { avisoReglasRaiz(d, tabla); } catch (e) { window.__rmdStats.errores = (window.__rmdStats.errores || []).slice(-9).concat('avisoReglasRaiz: ' + e.message); }
      return;
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
      const oculta = columnaOculta(nombres[i], tabla, esPM) || (tabla.dataset.rmdOcultaEstado === '1' && nombres[i] === 'ESTADO');
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
    // Reglas de revisión (v1.34): se resalta lo que encuentran en la descripción y sus advertencias se suman a las de la lista
    // v1.35: en la ventana de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES, los equipos que avisan las reglas de equipo
    const esEquipos = /idTblEquipmentEstructure/.test(tabla.id) || nombres.includes('CÓDIGO DE REFERENCIA');
    let nReglas = 0;
    if (esEquipos) {
      let rr = null;
      try { rr = aplicarReglasEquiposVentana(tabla, filas, nombres); } catch (e) { window.__rmdStats.errores = (window.__rmdStats.errores || []).slice(-9).concat('reglas equipos: ' + e.message); }
      if (rr && rr.n) { nReglas = rr.n; alertas += rr.n; rr.filas.forEach((x) => primeras.push({ tr: x.tr, texto: x.avisos[0], todos: x.avisos.slice(), pm: [] })); }
    } else if ((esPasos || esPM) && iDes >= 0) {
      let rr = null;
      try { rr = aplicarReglasLista(tabla, filas, iDes, { esPM, lista: esPasos ? lista : listaPadre(d) }); } catch (e) { window.__rmdStats.errores = (window.__rmdStats.errores || []).slice(-9).concat('reglas: ' + e.message); }
      if (rr && rr.n) {
        nReglas = rr.n; alertas += rr.n;
        rr.filas.forEach((x) => { const pr = primeras.find((y) => y.tr === x.tr); if (pr) pr.todos.push(...x.avisos); else primeras.push({ tr: x.tr, texto: x.avisos[0], todos: x.avisos.slice(), pm: [] }); });
        primeras.sort((a, b) => filas.indexOf(a.tr) - filas.indexOf(b.tr));
      }
    }
    const previo = tabla.__rmdAlertas;
    tabla.__rmdAlertas = { n: alertas, reglas: nReglas, filas: primeras, sig: previo ? previo.sig : 0, tipo: esEquipos ? 'equipos' : '' };

    if (esPasos && (on('filtro') || on('reglas') || reglasVivas())) filtroLocal(tabla, true);
    else if (esPasos) { const bar = d.querySelector('#rmd-filtro-bar'); if (bar) bar.remove(); filas.forEach((tr) => tr.style.removeProperty('display')); }
    if (esPasos && on('copiar')) instalarBotonesCopia(d);
    else if (esPasos) d.querySelectorAll('.rmd-copia-grupo, .rmd-clip').forEach((e) => e.remove());
    if ((esPasos || esPM) && on('cambiarpaso')) instalarBotonCambiarPaso(d, tabla);
    else if (esPasos || esPM) d.querySelectorAll('.rmd-cambiar-paso').forEach((e) => e.remove());
    if ((esPasos || esPM) && on('pasominusculas')) instalarBotonMinusculas(d, tabla);
    else if (esPasos || esPM) d.querySelectorAll('.rmd-minusculas').forEach((e) => e.remove());
    if (esPM && (on('reglas') || reglasVivas())) filtroLocal(tabla, false);
    else if (esPM) { const bar = d.querySelector('#rmd-filtro-bar'); if (bar) bar.remove(); }
    if (esEquipos && reglasDeEstructura()) filtroLocal(tabla, false, 'equipos');
    else if (esEquipos) { const bar = d.querySelector('#rmd-filtro-bar'); if (bar) bar.remove(); }
    actualizarBarra(d, tabla);
    if (esEspec) sincronizarEspec(d, tabla);
    // alturas para que barra de filtro, título de la tabla (con Guardar) y cabecera de columnas queden siempre visibles
    const bar = d.querySelector('#rmd-filtro-bar'), hdr = d.querySelector('.sapMListHdr');
    const h1 = (esPasos || esPM) && bar ? bar.offsetHeight : 0, h2 = (esPasos || esPM) && hdr ? hdr.offsetHeight : 0;
    d.style.setProperty('--rmd-h1', h1 + 'px'); d.style.setProperty('--rmd-top', (h1 + h2) + 'px');
  }

  // ---- 5. Filtro local + contador + alertas -----------------------------------------------------
  function filtroLocal(tabla, conFiltro, nombre) {
    const d = enDialogo(tabla); if (!d) return;
    let barra = d.querySelector('#rmd-filtro-bar');
    if (barra && (barra.dataset.nombre || '') !== (nombre || '')) { barra.remove(); barra = null; }   // (otra clase de lista en la misma ventana)
    if (!barra) {
      barra = document.createElement('div'); barra.id = 'rmd-filtro-bar'; if (nombre) barra.dataset.nombre = nombre;
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
    setTxt(barra.querySelector('.rmd-cuenta'), q ? `${visibles} de ${total} pasos` : `${total} ${barra.dataset.nombre || (inp ? 'pasos' : 'procesos menores')}`);
  }
  function actualizarBarra(d, tabla) {
    const barra = d.querySelector('#rmd-filtro-bar'); if (!barra || !tabla.__rmdAlertas) return;
    const b = barra.querySelector('button.rmd-alerta'), a = tabla.__rmdAlertas, n = a.n, nR = a.reglas || 0, nI = n - nR;
    if (!on('reglas') && !reglasVivas()) { b.style.display = 'none'; return; }
    b.style.display = '';
    b.classList.toggle('ok', n === 0);
    const inc = `${nI} incoherencia${nI === 1 ? '' : 's'}`, av = `${nR} aviso${nR === 1 ? '' : 's'} de reglas`;   // (avisos de las reglas de revisión)
    setTxt(b, n === 0 ? (on('reglas') && a.tipo !== 'equipos' ? '✓ Sin incoherencias' : '✓ Sin avisos de reglas') : `⚠ ${nI && nR ? `${inc} + ${av}` : nI ? inc : av} · ir a la siguiente ›`);
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
    document.querySelectorAll('.rmd-copia-grupo, .rmd-minusculas, .rmd-nuevo-paso-grupo, .rmd-exportar-op, .rmd-cuenta-verop, .rmd-documentos-citados, .rmd-status-rmd, .rmd-indicadores, .rmd-equipos-master, .rmd-buscar-equipo, .rmd-suspension, .rmd-menu, .rmd-orden-aviso, .rmd-receta-aviso, .rmd-reglas-aviso, .rmd-revisar-recetas, .rmd-nota-repetir, .rmd-token-mas, .rmd-cambiar-paso, .rmd-sel-panel, .rmd-ep-aviso, .rmd-rec-icono, .rmd-rec-detalle, .rmd-saludo, .rmd-paleta-fondo, .rmd-vivo-panel, .rmd-formula-orden, .rmd-revisor, .rmd-alerta-rec, .rmd-tz, .rmd-borrar-recetas, .rmd-aa, #rmd-filtro-bar, .rmd-estado, #rmd-aviso-asociar, #rmd-aviso-nomenclatura').forEach((e) => e.remove());
    document.querySelectorAll('.rmd-th-filtro, .rmd-menu-filtro-col').forEach((e) => e.remove());
    document.querySelectorAll('[data-rmd-reglas]').forEach((el) => { quitarMarcasReglas(el); delete el.dataset.rmdReglas; el.__rmdReglasRes = null; });
    document.querySelectorAll('.sapMDialog').forEach((d) => { d.__rmdReglasFirma = ''; d.__rmdReglasRes = null; });
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
    document.querySelectorAll('.sapMDialog').forEach((d) => d.classList.remove('rmd-g', 'rmd-pasos', 'rmd-medio', 'rmd-ancho', 'rmd-sticky', 'rmd-tz-dlg'));
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
    const nDlg = dialogos().length; if (nDlg < dialogosAntes) generacionRmd++; dialogosAntes = nDlg;   // (se cerró una ventana: el aviso de reglas del RMD se vuelve a leer)
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
    [registrarExternosUI5, gestionarFiltroEquipo, gestionarColumnasLista, gestionarSelectorPasos, gestionarVivo, gestionarFormulas, gestionarRevisores, gestionarAlertaRecetas, gestionarTrazabilidad, gestionarRecetasMultiples, gestionarPuestoRecetas, gestionarEdicionPasos, gestionarSaludo, gestionarRmdAbierto, gestionarReglasSelector].forEach((f) => {
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

    // ---- .xls de Excel 97-2003 (v1.34, para la lista de documentos vigentes que exporta el DMS): archivo compuesto (CFB) con el
    // libro BIFF8 dentro. Solo lee valores: texto (tabla de cadenas compartidas SST y LABEL), números (NUMBER, RK, MULRK), lógicos y
    // el valor ya calculado de las fórmulas. Misma forma que leerLibro: { hojas, filas(nombre) } con las filas en [[valor…]…].
    function leerXls(u8) {
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), u16 = (o) => dv.getUint16(o, true), u32 = (o) => dv.getUint32(o, true);
      if (![0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1].every((b, i) => u8[i] === b)) throw new Error('no es un archivo .xls de Excel 97-2003');
      const tamSector = 1 << u16(30), tamMini = 1 << u16(32), nFat = u32(44), dirIni = u32(48), corteMini = u32(56), miniFatIni = u32(60), nMiniFat = u32(64), difatIni = u32(68), nDifat = u32(72);
      const off = (s) => (s + 1) * tamSector, FIN = 0xFFFFFFFA;
      const secFat = []; for (let i = 0; i < 109 && secFat.length < nFat; i++) { const s = u32(76 + i * 4); if (s < FIN) secFat.push(s); }
      for (let d = difatIni, k = 0; k < nDifat && d < FIN; k++) { const por = tamSector / 4 - 1; for (let i = 0; i < por && secFat.length < nFat; i++) { const s = u32(off(d) + i * 4); if (s < FIN) secFat.push(s); } d = u32(off(d) + por * 4); }
      const fat = []; secFat.forEach((s) => { for (let i = 0; i < tamSector / 4; i++) fat.push(u32(off(s) + i * 4)); });
      const cadena = (ini, tabla) => { const out = []; for (let s = ini, g = 0; s < FIN && g < 1e6; g++) { out.push(s); s = tabla[s]; } return out; };
      const leerCadena = (ini, tam) => { const sec = cadena(ini, fat), buf = new Uint8Array(sec.length * tamSector); sec.forEach((s, i) => buf.set(u8.subarray(off(s), off(s) + tamSector), i * tamSector)); return tam != null ? buf.subarray(0, tam) : buf; };
      const dir = leerCadena(dirIni), dirV = new DataView(dir.buffer, dir.byteOffset, dir.byteLength), entradas = [];
      for (let o = 0; o + 128 <= dir.length; o += 128) {
        const lon = dirV.getUint16(o + 64, true); if (!lon) continue;
        let nombre = ''; for (let i = 0; i < lon / 2 - 1; i++) nombre += String.fromCharCode(dirV.getUint16(o + i * 2, true));
        entradas.push({ nombre, tipo: dir[o + 66], ini: dirV.getUint32(o + 116, true), tam: dirV.getUint32(o + 120, true) });
      }
      const raiz = entradas.find((e) => e.tipo === 5); let mini = null, miniFat = null;
      const flujo = (e) => {
        if (e.tam >= corteMini) return leerCadena(e.ini, e.tam);
        if (!mini) { mini = leerCadena(raiz.ini, raiz.tam); const mf = nMiniFat ? leerCadena(miniFatIni) : new Uint8Array(0), mv = new DataView(mf.buffer, mf.byteOffset, mf.byteLength); miniFat = []; for (let i = 0; i + 4 <= mf.length; i += 4) miniFat.push(mv.getUint32(i, true)); }
        const sec = cadena(e.ini, miniFat), buf = new Uint8Array(sec.length * tamMini); sec.forEach((s, i) => buf.set(mini.subarray(s * tamMini, s * tamMini + tamMini), i * tamMini)); return buf.subarray(0, e.tam);
      };
      const wbE = entradas.find((e) => /^(Workbook|Book)$/i.test(e.nombre)); if (!wbE) throw new Error('el .xls no trae un libro de Excel');
      const wb = flujo(wbE), v = new DataView(wb.buffer, wb.byteOffset, wb.byteLength);
      const regs = []; for (let o = 0; o + 4 <= wb.length;) { const tipo = v.getUint16(o, true), lon = v.getUint16(o + 2, true); regs.push({ tipo, o: o + 4, lon }); o += 4 + lon; }
      if (!regs.length || regs[0].tipo !== 0x0809 || v.getUint16(regs[0].o, true) !== 0x0600) throw new Error('es un .xls de una versión antigua de Excel (anterior a 97): ábrelo y guárdalo como .xlsx');
      const cp1252 = new TextDecoder('windows-1252'), utf16 = new TextDecoder('utf-16le');
      // cadena Unicode de BIFF8, que puede seguir en registros CONTINUE (cada tramo trae su propio byte de opciones)
      function lectorCadenas(partes) {
        let p = 0, o = 0;
        const byte = () => { if (o >= partes[p].lon) { p++; o = 0; } return wb[partes[p].o + o++]; };
        const salto = (n) => { while (n > 0 && p < partes.length) { const q = Math.min(n, partes[p].lon - o); o += q; n -= q; if (n > 0) { p++; o = 0; } } };
        const u16l = () => byte() | (byte() << 8), u32l = () => (u16l() | (u16l() << 16)) >>> 0;
        return {
          fin: () => p >= partes.length || (p === partes.length - 1 && o >= partes[p].lon),
          cadena() {
            const n = u16l(); let op = byte(); const rich = op & 8 ? u16l() : 0, ext = op & 4 ? u32l() : 0; let s = '', quedan = n;
            while (quedan > 0) {
              if (o >= partes[p].lon) { p++; o = 0; op = byte(); }
              const ancho = op & 1 ? 2 : 1, cab = Math.min(quedan, Math.floor((partes[p].lon - o) / ancho)), trozo = wb.subarray(partes[p].o + o, partes[p].o + o + cab * ancho);
              s += ancho === 2 ? utf16.decode(trozo) : cp1252.decode(trozo); o += cab * ancho; quedan -= cab;
            }
            salto(rich * 4 + ext); return s;
          },
        };
      }
      let sst = []; const hojas = [];
      for (let i = 0; i < regs.length; i++) {
        const r = regs[i];
        if (r.tipo === 0x0085) {                                                           // BOUNDSHEET
          const lon = wb[r.o + 6], op = wb[r.o + 7];
          hojas.push({ nombre: op & 1 ? utf16.decode(wb.subarray(r.o + 8, r.o + 8 + lon * 2)) : cp1252.decode(wb.subarray(r.o + 8, r.o + 8 + lon)), pos: v.getUint32(r.o, true), tipo: wb[r.o + 5] });
        } else if (r.tipo === 0x00FC) {                                                    // SST (+ CONTINUE)
          const partes = [{ o: r.o + 8, lon: r.lon - 8 }]; for (let j = i + 1; j < regs.length && regs[j].tipo === 0x003C; j++) partes.push({ o: regs[j].o, lon: regs[j].lon });
          const total = v.getUint32(r.o + 4, true), lc = lectorCadenas(partes); sst = [];
          for (let k = 0; k < total && !lc.fin(); k++) sst.push(lc.cadena());
        }
      }
      const rk = (x) => { let n; if (x & 2) n = x >> 2; else { const b = new DataView(new ArrayBuffer(8)); b.setUint32(4, x & 0xFFFFFFFC, true); n = b.getFloat64(0, true); } return x & 1 ? n / 100 : n; };
      const porHoja = {};
      hojas.filter((h) => h.tipo === 0).forEach((h) => {
        const filas = [], pon = (f, c, val) => { (filas[f] || (filas[f] = []))[c] = val; };
        let i = regs.findIndex((r) => r.o - 4 === h.pos), formula = null; if (i < 0) return;
        for (i++; i < regs.length; i++) {
          const r = regs[i], o = r.o;
          if (r.tipo === 0x000A) break;                                                     // EOF de la hoja
          if (r.tipo === 0x00FD) pon(u16o(o), u16o(o + 2), sst[v.getUint32(o + 6, true)]);   // LABELSST
          else if (r.tipo === 0x0203) pon(u16o(o), u16o(o + 2), v.getFloat64(o + 6, true));   // NUMBER
          else if (r.tipo === 0x027E) pon(u16o(o), u16o(o + 2), rk(v.getUint32(o + 6, true)));   // RK
          else if (r.tipo === 0x00BD) { const n = (r.lon - 6) / 6; for (let k = 0; k < n; k++) pon(u16o(o), u16o(o + 2) + k, rk(v.getUint32(o + 4 + k * 6 + 2, true))); }   // MULRK
          else if (r.tipo === 0x0204 || r.tipo === 0x00D6) pon(u16o(o), u16o(o + 2), lectorCadenas([{ o: o + 6, lon: r.lon - 6 }]).cadena());   // LABEL / RSTRING
          else if (r.tipo === 0x0205) pon(u16o(o), u16o(o + 2), wb[o + 7] ? null : !!wb[o + 6]);   // BOOLERR
          else if (r.tipo === 0x0006) {                                                     // FORMULA: su valor en caché
            if (v.getUint16(o + 12, true) === 0xFFFF) { const t = wb[o + 6]; if (t === 0) formula = [u16o(o), u16o(o + 2)]; else if (t === 1) pon(u16o(o), u16o(o + 2), !!wb[o + 8]); }
            else pon(u16o(o), u16o(o + 2), v.getFloat64(o + 6, true));
          } else if (r.tipo === 0x0207 && formula) { pon(formula[0], formula[1], lectorCadenas([{ o, lon: r.lon }]).cadena()); formula = null; }   // STRING de la fórmula
        }
        porHoja[h.nombre] = filas;
      });
      function u16o(o) { return v.getUint16(o, true); }
      return { hojas: Object.keys(porHoja), filas: (nombre) => porHoja[nombre] || null };
    }

    return { crearLibro, leerLibro, leerXls, zip, leerZip, ref, deRef, letra, error, esError, ERRORES, serialDeFecha, isoFecha, S };
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

  // ==REGLAS-INICIO== (no quitar esta marca ni la de cierre: las pruebas extraen este bloque para correrlo fuera del portal)
  // Reglas de revisión (v1.34): el motor, sin DOM ni SAP. Una regla busca en un texto (la descripción de un paso o de un proceso
  // menor) palabras o frases, códigos de documento, códigos de equipo o un patrón, y dice qué hacer con lo que encuentra: marcarlo,
  // avisar que no debe aparecer o avisar si falta en el RMD. La lista de documentos vigentes (la carga la persona) decide qué
  // códigos citados están vigentes: los que están en la lista lo están; los que no están, no (SAP no lo compara por sí solo).
  // v1.35: la lista de equipos calificados (hoja "Cronograma", columna "ESTADO GENERAL") decide qué equipos están calificados: las
  // reglas de equipo pueden avisar los que no lo están, en los textos y en la estructura EQUIPOS / INSTRUMENTOS / MATERIALES del RMD.
  const Reglas = (() => {
    const TIPOS = { frase: 'Palabra o frase', documento: 'Código de documento', equipo: 'Código de equipo o utensilio', patron: 'Patrón avanzado (expresión regular)' };
    const VIGENCIAS = { todos: 'Cualquier documento', noVigentes: 'Solo los que NO están en la lista de vigentes', vigentes: 'Solo los que están en la lista de vigentes' };
    const CONDICIONES = { marcar: 'Marcar donde aparezca', noDebe: 'No debe aparecer', debe: 'Debe estar presente en el RMD' };
    const ACCIONES = { resaltar: 'Resaltar', advertencia: 'Mostrar advertencia' };
    const COLORES = { amarillo: 'Amarillo', rojo: 'Rojo', azul: 'Azul', verde: 'Verde', morado: 'Morado' };
    const DONDE = { todo: 'Pasos y procesos menores', pasos: 'Solo pasos', menores: 'Solo procesos menores' };
    const CALIFICACIONES = { todos: 'Cualquier equipo', sinCalificar: 'Solo los que NO están calificados (lista de equipos calificados)', calificados: 'Solo los calificados' };
    const ESTADOS_OK = ['CALIFICADO', 'NO REQUIERE'];                  // "ESTADO GENERAL" que cuentan como calificado (se puede cambiar)
    const BASE = { nombre: '', activa: true, tipo: 'frase', buscar: '', palabraCompleta: true, mayusculas: false, vigencia: 'todos', calificacion: 'todos', estructura: false,
      noFigura: false, excepto: '', condicion: 'marcar', accion: 'resaltar', basta: false, color: 'amarillo', etiqueta: '', donde: 'todo', lista: '', mensaje: '' };
    const PREDETERMINADAS = [
      { id: 'pred-novigente', predeterminada: 'novigente', nombre: 'Documento no vigente', tipo: 'documento', vigencia: 'noVigentes', condicion: 'noDebe', accion: 'advertencia', color: 'rojo', etiqueta: 'no vigente' },
      { id: 'pred-sincalificar', predeterminada: 'sincalificar', nombre: 'Equipo sin calificación', tipo: 'equipo', calificacion: 'sinCalificar', estructura: true, condicion: 'noDebe', accion: 'advertencia', color: 'rojo', etiqueta: '{estado}' },
      { id: 'pred-documentos', predeterminada: 'documentos', nombre: 'Documentos citados', activa: false, tipo: 'documento', condicion: 'marcar', accion: 'resaltar', color: 'azul' },
      { id: 'pred-equipos', predeterminada: 'equipos', nombre: 'Códigos de equipo en el texto', activa: false, tipo: 'equipo', condicion: 'marcar', accion: 'resaltar', color: 'verde' },
      { id: 'pred-provisional', predeterminada: 'provisional', nombre: 'Textos provisionales (ejemplo)', activa: false, tipo: 'frase', buscar: 'XXX; POR DEFINIR; BORRADOR', condicion: 'noDebe', accion: 'advertencia', color: 'amarillo' },
    ];
    // Códigos de documento: los de siempre (<I/P/F><Área>-<sufijo NNN>, como src/rmd_automation/referencias.py) y, como en la lista
    // de vigentes, los manuales (MCAL-200) y las políticas (POL-CAL-001).
    const FUENTE_DOC = '\\b(?:POL-[A-Z]{3}-\\d{3}|M[A-Z]{3}-\\d{3}|[IPF][A-Z0-9]{3}-[A-Z]?\\d{3})\\b';
    // Posibles códigos de equipo (PL1-GV1-E058, LIQ-E023, TAN-AAA-01…): se confirman contra el catálogo de equipos del portal.
    const FUENTE_CANDIDATO = '(?<![A-Z0-9-])[A-Z0-9]{2,6}(?:-[A-Z0-9]{1,8}){1,3}(?![A-Z0-9])';
    const TIPO_DOC = { I: 'Instructivo', P: 'Procedimiento', F: 'Formato', M: 'Manual' };
    const GUIONES = /[‐-―−]/g;
    const normalizarCodigo = (c) => String(c == null ? '' : c).normalize('NFKC').toUpperCase().replace(GUIONES, '-').replace(/\s+/g, '');
    const tipoDocumento = (c) => { const x = normalizarCodigo(c); return /^POL-/.test(x) ? 'Política' : TIPO_DOC[x[0]] || 'Documento'; };
    const codigosDocumento = (texto) => String(texto || '').match(new RegExp(FUENTE_DOC, 'g')) || [];
    const partir = (s) => String(s == null ? '' : s).split(/[;\r\n]+/).map((x) => x.trim()).filter(Boolean);
    const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nuevoId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    // Texto sin tildes (y en mayúsculas, salvo que se distingan) y, por cada carácter del resultado, su posición en el original:
    // así se busca sin importar tildes ni mayúsculas y se resalta exactamente lo que se ve.
    const COMBINANTES = /[̀-ͯ]/g;
    function plegar(texto, distinguir) {
      const t = String(texto == null ? '' : texto), pos = []; let p = '';
      for (let i = 0; i < t.length; i++) {
        const c = t.charCodeAt(i);
        if (c < 128) { p += distinguir ? t[i] : t[i].toUpperCase(); pos.push(i); continue; }
        let f = t[i].normalize('NFD').replace(COMBINANTES, '').replace(GUIONES, '-'); if (!distinguir) f = f.toUpperCase();
        for (let k = 0; k < f.length; k++) { p += f[k]; pos.push(i); }
      }
      pos.push(t.length);
      return { p, pos };
    }
    function fuenteFrase(valor, completa, distinguir) {
      const v = plegar(String(valor).trim(), distinguir).p; if (!v.replace(/\*/g, '').trim()) return '';
      const cuerpo = v.split('*').map((x) => escapar(x).replace(/\s+/g, '\\s+')).join('[\\p{L}\\p{N}]*');
      return completa ? '(?<![\\p{L}\\p{N}])' + cuerpo + '(?![\\p{L}\\p{N}])' : cuerpo;
    }
    function fuenteCodigo(valor) {
      const v = normalizarCodigo(valor); if (!v.replace(/\*/g, '')) return '';
      return '(?<![A-Z0-9])' + v.split('*').map(escapar).join('[A-Z0-9-]*') + '(?![A-Z0-9])';
    }

    function normalizar(x) {
      const o = { ...BASE, ...(x && typeof x === 'object' ? x : {}) }, s = (v) => String(v == null ? '' : v);
      const r = {
        id: s(o.id).trim().slice(0, 60) || nuevoId(), nombre: s(o.nombre).replace(/\s+/g, ' ').trim().slice(0, 80), activa: o.activa !== false,
        tipo: TIPOS[o.tipo] ? o.tipo : 'frase', buscar: s(o.buscar).slice(0, 4000), palabraCompleta: o.palabraCompleta !== false, mayusculas: o.mayusculas === true,
        vigencia: VIGENCIAS[o.vigencia] ? o.vigencia : 'todos', calificacion: CALIFICACIONES[o.calificacion] ? o.calificacion : 'todos', estructura: o.estructura === true,
        noFigura: o.noFigura === true, excepto: s(o.excepto).slice(0, 1000),
        condicion: CONDICIONES[o.condicion] ? o.condicion : 'marcar', accion: ACCIONES[o.accion] ? o.accion : 'resaltar', basta: o.basta === true,
        color: COLORES[o.color] ? o.color : 'amarillo', etiqueta: s(o.etiqueta).replace(/\s+/g, ' ').trim().slice(0, 18), donde: DONDE[o.donde] ? o.donde : 'todo',
        lista: s(o.lista).replace(/\s+/g, ' ').trim().slice(0, 80), mensaje: s(o.mensaje).replace(/\s+/g, ' ').trim().slice(0, 200),
      };
      if (PREDETERMINADAS.some((p) => p.predeterminada === o.predeterminada)) r.predeterminada = o.predeterminada;
      if (!r.nombre) r.nombre = partir(r.buscar)[0] ? `${TIPOS[r.tipo]}: ${partir(r.buscar)[0].slice(0, 40)}` : TIPOS[r.tipo];
      return r;
    }
    const predeterminadas = () => PREDETERMINADAS.map(normalizar);
    const CLAVES_PREDETERMINADAS = PREDETERMINADAS.map((x) => x.predeterminada);
    // Predeterminadas que salieron en una versión nueva (la persona no las conocía): se agregan en su lugar. Las que borró no vuelven.
    function completarPredeterminadas(reglas, conocidas) {
      const out = (reglas || []).slice(), ya = new Set(out.map((r) => r.predeterminada).filter(Boolean)), sabidas = new Set(conocidas || []);
      let nuevas = 0;
      PREDETERMINADAS.forEach((p, i) => { if (sabidas.has(p.predeterminada) || ya.has(p.predeterminada)) return; out.splice(Math.min(i, out.length), 0, normalizar(p)); nuevas++; });
      return { reglas: out, nuevas };
    }
    // ids únicos (al importar o duplicar podrían repetirse)
    function sinIdsRepetidos(lista) { const vistos = new Set(); return lista.map((r) => { if (!vistos.has(r.id)) { vistos.add(r.id); return r; } const n = { ...r, id: nuevoId() }; vistos.add(n.id); return n; }); }

    // ctx: { vigentes: Map(código -> info) | null, catalogo: Map(código -> descripción) | null }
    function compilar(reglas, ctx = {}) {
      return (reglas || []).map((x, prioridad) => {
        const r = normalizar(x), c = { regla: r, prioridad, ok: false, error: '', necesita: '', valores: [], excepto: null };
        try {
          const vals = partir(r.buscar);
          if (r.tipo === 'frase') {
            c.valores = vals.map((v) => [v, fuenteFrase(v, r.palabraCompleta, r.mayusculas)]).filter((y) => y[1]).map(([v, f]) => ({ etiqueta: v, rx: new RegExp(f, 'gu'), plegado: true, distinguir: r.mayusculas }));
            if (!c.valores.length) throw new Error('escribe al menos una palabra o frase');
          } else if (r.tipo === 'documento' || r.tipo === 'equipo') {
            c.valores = vals.map((v) => [normalizarCodigo(v), fuenteCodigo(v)]).filter((y) => y[1]).map(([v, f]) => ({ etiqueta: v, rx: new RegExp(f, 'g'), plegado: true }));
            if (vals.length && !c.valores.length) throw new Error('los códigos escritos no son válidos');
            if (!vals.length && r.tipo === 'documento') c.valores = [{ etiqueta: 'un código de documento', rx: new RegExp(FUENTE_DOC, 'g'), plegado: false }];
            if (!vals.length && r.tipo === 'equipo') {
              const porLista = r.calificacion !== 'todos';                 // (con filtro de calificación, los equipos salen de la lista cargada)
              c.valores = [{ etiqueta: 'un código de equipo', rx: new RegExp(FUENTE_CANDIDATO, 'g'), plegado: true, catalogo: !porLista, enLista: porLista }];
              if (!porLista && !ctx.catalogo) c.necesita = 'catalogo';
            }
            if (r.tipo === 'documento' && r.vigencia !== 'todos' && !ctx.vigentes) c.necesita = 'vigentes';
            if (r.tipo === 'equipo' && r.calificacion !== 'todos' && !ctx.calificados) c.necesita = 'calificados';
          } else {
            const f = r.buscar.trim(); if (!f) throw new Error('escribe el patrón');
            let rx; try { rx = new RegExp(f, r.mayusculas ? 'gu' : 'giu'); } catch (e) { rx = new RegExp(f, r.mayusculas ? 'g' : 'gi'); }
            c.valores = [{ etiqueta: f, rx, plegado: false }];
          }
          const ex = partir(r.excepto).map((v) => fuenteFrase(v, false, false)).filter(Boolean);
          if (ex.length) c.excepto = new RegExp(ex.join('|'), 'u');
          c.ok = r.activa && !c.necesita;
        } catch (e) { c.error = String((e && e.message) || e).replace(/^Invalid regular expression: /, 'patrón no válido: '); }
        return c;
      });
    }
    function aplica(r, ctx) {
      if (ctx.probar) return true;
      if ((r.donde === 'pasos' && ctx.esPM) || (r.donde === 'menores' && !ctx.esPM)) return false;
      if (r.lista) { if (ctx.lista == null) return true; if (!plegar(ctx.lista).p.includes(plegar(r.lista).p)) return false; }
      return true;
    }
    // el catálogo (o la lista) puede tener el código sin el último tramo (texto "PL1-LIQ-E023-A", catálogo "PL1-LIQ-E023")
    function enMapa(cand, mapa) {
      if (!mapa) return null;
      const tramos = cand.split('-');
      for (let k = tramos.length; k >= 2; k--) { const c = tramos.slice(0, k).join('-'); if (mapa.has(c)) return { codigo: c, valor: mapa.get(c), largo: c.length }; }
      return null;
    }
    // Lista de equipos calificados -> { porCodigo, porSap }: por código (MIF / "Código de referencia") y por código SAP. Un código puede
    // tener varias filas (una sala y su HVAC, un almacén por temporada): está calificado solo si lo están todas; si no, manda la que no.
    function mapaCalificados(cal, estadosOk) {
      const ok = new Set((estadosOk && estadosOk.length ? estadosOk : ESTADOS_OK).map((e) => plegar(e).p.replace(/\s+/g, ' ').trim()));
      const porCodigo = new Map(), porSap = new Map();
      ((cal && cal.equipos) || []).forEach((e) => {
        const f = { codigo: e[0] || '', sap: e[1] || '', desc: e[2] || '', general: e[3] || '', oq: e[4] || '', pq: e[5] || '', oqProx: e[6] || '', pqProx: e[7] || '', tipo: e[8] || '' };
        f.ok = ok.has(plegar(f.general).p.replace(/\s+/g, ' ').trim());
        [[porCodigo, f.codigo], [porSap, f.sap]].forEach(([m, k]) => { if (!k) return; const x = m.get(k); if (x) x.filas.push(f); else m.set(k, { filas: [f] }); });
      });
      const cerrar = (x) => {
        const malas = x.filas.filter((f) => !f.ok), f = malas[0] || x.filas[0];
        Object.assign(x, { ok: !malas.length, estado: f.general || '(sin estado)', codigo: f.codigo, sap: f.sap, desc: f.desc,
          detalle: x.filas.map((y) => `${x.filas.length > 1 && y.tipo ? y.tipo + ': ' : ''}${y.general || '(sin estado)'}${y.oq || y.pq ? ` (OQ: ${y.oq || '—'} · PQ: ${y.pq || '—'})` : ''}`).join(' · ') });
      };
      porCodigo.forEach(cerrar); porSap.forEach(cerrar);
      return { porCodigo, porSap };
    }
    const textoCalif = (cod, info) => `${cod}${info.desc ? ` (${info.desc})` : ''}: ${info.ok ? 'calificado' : 'sin calificación'} — ${info.detalle || info.estado}`;
    const etiquetaDe = (r, info) => (info ? String(r.etiqueta || '').replace(/\{estado\}/gi, info.estado).slice(0, 24) : String(r.etiqueta || '').replace(/\{estado\}/gi, '').trim());
    const textoAviso = (r, valor, motivo) => (r.mensaje ? `${r.mensaje} («${valor}»)` : motivo ? `${r.nombre}: ${motivo}` : r.condicion === 'noDebe' ? `${r.nombre}: «${valor}» no debe aparecer` : `${r.nombre}: «${valor}»`);
    const textoFalta = (r, vals) => r.mensaje || `${r.nombre}: no aparece ${vals.map((v) => `«${v}»`).join(r.basta ? ' ni ' : ', ')}${r.lista ? ` en ${r.lista}` : ''}${r.donde === 'pasos' ? ' (pasos)' : r.donde === 'menores' ? ' (procesos menores)' : ''}`;
    // Marcas que se pisan: gana la regla de más prioridad (la de más arriba en la lista) y su título suma los motivos de las demás
    function resolverSolapes(marcas) {
      const tomadas = [];
      marcas.slice().sort((a, b) => a.prioridad - b.prioridad || a.ini - b.ini || (b.fin - b.ini) - (a.fin - a.ini)).forEach((m) => {
        const choca = tomadas.find((x) => m.ini < x.fin && x.ini < m.fin);
        if (!choca) { tomadas.push({ ...m, titulos: [m.titulo] }); return; }
        if (!choca.titulos.includes(m.titulo)) choca.titulos.push(m.titulo);
        if (m.aviso) choca.aviso = true;
        if (!choca.etiqueta && m.etiqueta) choca.etiqueta = m.etiqueta;
      });
      return tomadas.sort((a, b) => a.ini - b.ini).map(({ titulos, ...m }) => ({ ...m, titulo: titulos.join('\n') }));
    }
    // Aplica las reglas a un texto. ctx: { vigentes, catalogo, esPM, lista, probar }. Devuelve las marcas (sin solaparse, en orden),
    // las advertencias y cuántas veces apareció cada valor de cada regla (hallados: "<id>#<n>" -> veces; para "Debe estar presente").
    function buscar(texto, compiladas, ctx = {}) {
      const t = String(texto == null ? '' : texto), res = { marcas: [], avisos: [], hallados: {} };
      if (!t.trim()) return res;
      const cache = {}, plegado = (d) => cache[d ? 1 : 0] || (cache[d ? 1 : 0] = plegar(t, d));
      (compiladas || []).forEach((c) => {
        if (!c.ok || !aplica(c.regla, ctx)) return;
        const r = c.regla;
        if (c.excepto && c.excepto.test(plegado(false).p)) return;
        c.valores.forEach((v, vi) => {
          const base = v.plegado ? plegado(v.distinguir) : null, s = base ? base.p : t;
          v.rx.lastIndex = 0; let m, vueltas = 0;
          while ((m = v.rx.exec(s)) && vueltas++ < 2000) {
            if (!m[0]) { v.rx.lastIndex++; continue; }
            let largo = m[0].length, motivo = '', info = null;
            if (v.catalogo) {
              const hit = enMapa(m[0], ctx.catalogo); if (!hit) continue;
              if (hit.largo < largo) { largo = hit.largo; v.rx.lastIndex = m.index + largo; }
              motivo = `equipo ${hit.codigo}${hit.valor ? ' — ' + hit.valor : ''}`;
            }
            if (v.enLista) {                                                  // (el código tiene que estar en la lista de calificados)
              const hit = enMapa(m[0], ctx.calificados); if (!hit) continue;
              if (hit.largo < largo) { largo = hit.largo; v.rx.lastIndex = m.index + largo; }
              info = hit.valor;
            }
            const ini = base ? base.pos[m.index] : m.index, fin = base ? base.pos[m.index + largo - 1] + 1 : m.index + largo, valor = t.slice(ini, fin);
            if (r.tipo === 'documento') {
              const cod = normalizarCodigo(valor), iv = ctx.vigentes ? ctx.vigentes.get(cod) : undefined;
              if ((r.vigencia === 'noVigentes' && iv) || (r.vigencia === 'vigentes' && !iv)) continue;
              motivo = iv ? `${cod} está en la lista de vigentes${iv.titulo ? ': ' + iv.titulo : ''}${iv.revision ? ' (rev. ' + iv.revision + ')' : ''}`
                : ctx.vigentes ? `${cod} no está en la lista de documentos vigentes` : `${tipoDocumento(cod).toLowerCase()} ${cod}`;
            }
            if (r.tipo === 'equipo' && r.calificacion !== 'todos') {
              const cod = normalizarCodigo(valor);
              if (!info) info = ctx.calificados ? ctx.calificados.get(cod) : null;   // (códigos escritos en la regla: se busca el código tal cual)
              if (!info || (r.calificacion === 'sinCalificar' && info.ok) || (r.calificacion === 'calificados' && !info.ok)) continue;
              motivo = textoCalif(cod, info);
            }
            const k = r.id + '#' + vi; res.hallados[k] = (res.hallados[k] || 0) + 1;
            const aviso = r.condicion !== 'debe' && r.accion === 'advertencia';
            const que = motivo || (r.condicion === 'noDebe' ? `«${valor}» no debe aparecer` : r.condicion === 'debe' ? `«${valor}» (debe estar presente)` : `«${valor}»`);
            res.marcas.push({ ini, fin, valor, regla: r.id, prioridad: c.prioridad, color: r.color, etiqueta: etiquetaDe(r, info), aviso, titulo: `Regla «${r.nombre}»: ${que}${r.mensaje ? ' — ' + r.mensaje : ''}` });
            if (aviso) res.avisos.push({ regla: r.id, nombre: r.nombre, valor, texto: textoAviso(r, valor, motivo) });
          }
        });
      });
      res.marcas = resolverSolapes(res.marcas);
      return res;
    }
    // Todo un RMD (o una lista): textos = [{ texto, esPM, lista }]. Además de lo de cada texto, las reglas "Debe estar presente"
    // que no aparecieron en ninguna parte (según su alcance: pasos / procesos menores / lista).
    function evaluarConjunto(textos, compiladas, ctx = {}) {
      const out = { items: [], faltan: [], avisos: 0, marcas: 0, hallados: {}, porRegla: {} };
      (textos || []).forEach((x, i) => {
        const r = buscar(x.texto, compiladas, { ...ctx, esPM: !!x.esPM, lista: x.lista || '' });
        Object.entries(r.hallados).forEach(([k, n]) => { out.hallados[k] = (out.hallados[k] || 0) + n; const id = k.slice(0, k.lastIndexOf('#')); const p = out.porRegla[id] || (out.porRegla[id] = { veces: 0, avisos: 0 }); p.veces += n; });
        r.avisos.forEach((a) => { out.porRegla[a.regla].avisos++; });
        if (r.marcas.length || r.avisos.length) { out.items.push({ i, marcas: r.marcas, avisos: r.avisos }); out.avisos += r.avisos.length; out.marcas += r.marcas.length; }
      });
      (compiladas || []).forEach((c) => {
        if (!c.ok || c.regla.condicion !== 'debe') return;
        const faltan = c.valores.map((v, vi) => (out.hallados[c.regla.id + '#' + vi] ? null : v.etiqueta)).filter((v) => v !== null);
        if (c.regla.basta ? faltan.length === c.valores.length : faltan.length) out.faltan.push({ regla: c.regla.id, nombre: c.regla.nombre, valores: faltan, texto: textoFalta(c.regla, faltan) });
      });
      return out;
    }
    // Equipos de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES: equipos = [{ codigo (Código de referencia / CodigoGaci), sap (equnr), desc,
    // orden }]. Solo las reglas de equipo con "revisar también la estructura de equipos". ctx: { calificados, calificadosSap }.
    function evaluarEquipos(equipos, compiladas, ctx = {}) {
      const out = { items: [], avisos: 0 };
      (equipos || []).forEach((eq, i) => {
        const avisos = [], marcas = [], cod = normalizarCodigo(eq.codigo), sap = normalizarCodigo(eq.sap).replace(/^0+(?=\d)/, '');
        (compiladas || []).forEach((c) => {
          const r = c.regla; if (!c.ok || r.tipo !== 'equipo' || !r.estructura) return;
          const escritos = c.valores.filter((v) => !v.catalogo && !v.enLista);
          if (escritos.length && !escritos.some((v) => [cod, sap].some((x) => { v.rx.lastIndex = 0; return !!x && v.rx.test(x); }))) return;
          let info = null;
          if (r.calificacion !== 'todos') {
            info = (cod && ctx.calificados && ctx.calificados.get(cod)) || (sap && ctx.calificadosSap && ctx.calificadosSap.get(sap)) || null;
            if (!info) { if (!r.noFigura || r.calificacion !== 'sinCalificar') return; info = { ok: false, estado: 'NO FIGURA', detalle: 'no figura en la lista de equipos calificados', desc: '' }; }
            if ((r.calificacion === 'sinCalificar' && info.ok) || (r.calificacion === 'calificados' && !info.ok)) return;
          } else if (!escritos.length) return;                                // (sin filtro ni códigos, la estructura no se revisa)
          const valor = eq.codigo || eq.sap, motivo = info ? textoCalif(valor, { ...info, desc: info.desc || eq.desc }) : `equipo ${valor}${eq.desc ? ' — ' + eq.desc : ''}`;
          const aviso = r.condicion !== 'debe' && r.accion === 'advertencia';
          marcas.push({ regla: r.id, valor, prioridad: c.prioridad, color: r.color, etiqueta: etiquetaDe(r, info), aviso, titulo: `Regla «${r.nombre}»: ${motivo}${r.mensaje ? ' — ' + r.mensaje : ''}` });
          if (aviso) avisos.push({ regla: r.id, nombre: r.nombre, valor, texto: textoAviso(r, valor, motivo) });
        });
        if (marcas.length) { marcas.sort((a, b) => a.prioridad - b.prioridad); out.items.push({ i, marcas, avisos }); out.avisos += avisos.length; }
      });
      return out;
    }
    // Fase de la nomenclatura de la 1ª línea de Observaciones ("…-FA1.0-F1", "-F1R", "-F2-R"): { corto: 'F2R', texto: 'Fase 2 R', linea }
    function faseDeObservacion(obs) {
      const linea = String(obs == null ? '' : obs).split(/\r?\n/)[0].trim(), tok = linea.split(/\s+/)[0] || '';
      const m = /(?:^|-)F(\d{1,2})(?:-?(R))?$/i.exec(tok);
      return m ? { corto: `F${m[1]}${m[2] ? 'R' : ''}`, texto: `Fase ${m[1]}${m[2] ? ' R' : ''}`, linea } : { corto: '', texto: '', linea };
    }
    function resumen(r) {
      const p = [TIPOS[r.tipo]], vals = partir(r.buscar);
      if (r.tipo === 'equipo' && r.calificacion !== 'todos') p.push(r.calificacion === 'sinCalificar' ? 'los que no están calificados' : 'los calificados');
      if (r.tipo === 'documento' && r.vigencia !== 'todos') p.push(r.vigencia === 'noVigentes' ? 'los que no están en la lista de vigentes' : 'los vigentes');
      if (r.tipo === 'patron') { if (r.buscar.trim()) p.push(`/${r.buscar.trim().slice(0, 40)}/`); }
      else if (vals.length) p.push(vals.slice(0, 3).map((v) => `«${v.slice(0, 30)}»`).join(', ') + (vals.length > 3 ? ` y ${vals.length - 3} más` : ''));
      else if (r.tipo === 'equipo' && r.calificacion === 'todos') p.push('cualquiera del catálogo');
      else if (r.tipo === 'documento' && r.vigencia === 'todos') p.push('cualquiera');
      const ex = partir(r.excepto); if (ex.length) p.push(`salvo si dice ${ex.slice(0, 2).map((v) => `«${v.slice(0, 20)}»`).join(' o ')}${ex.length > 2 ? '…' : ''}`);
      p.push(r.condicion === 'debe' ? CONDICIONES.debe + (r.basta ? ' (al menos uno)' : '') : `${CONDICIONES[r.condicion]} → ${ACCIONES[r.accion].toLowerCase()}`);
      if (r.donde !== 'todo') p.push(DONDE[r.donde].toLowerCase());
      if (r.lista) p.push(`solo en ${r.lista}`);
      if (r.tipo === 'equipo' && r.estructura) p.push('y en la estructura de equipos del RMD' + (r.noFigura ? ' (también los que no figuran en la lista)' : ''));
      return p.join(' · ');
    }

    // ---- lista de documentos vigentes: de las filas de una hoja (xls, xlsx o csv) ----
    const ENC = {
      codigo: [/^(identificador|c[oó]digo|c[oó]digo del documento|cod\.?|codigo documento)$/i, /^(documento|id|n[uú]mero|nro\.?)$/i],
      titulo: [/^(t[ií]tulo|nombre|nombre del documento|descripci[oó]n)$/i], revision: [/^(revisi[oó]n|rev\.?|versi[oó]n|ver\.?)$/i],
      estado: [/^(s|estado|situaci[oó]n|status)$/i], categoria: [/^(categor[ií]a|tipo|clase)$/i], fecha: [/^(fecha|fecha de aprobaci[oó]n|aprobado|aprobaci[oó]n)$/i],
      validez: [/^(validez|vigencia|vence|vencimiento|v[aá]lido hasta|pr[oó]xima revisi[oó]n)$/i],
    };
    const PARECE_CODIGO = /^[A-Z0-9]{2,6}(?:-[A-Z0-9]{1,8}){1,3}$/;
    const celdaTxt = (v) => (v == null ? '' : typeof v === 'object' && v.error ? '' : String(v).replace(/\s+/g, ' ').trim());
    const fechaIso = (v) => {
      if (typeof v === 'number' && v > 1000 && v < 2958466) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000)); return d.toISOString().slice(0, 10); }
      const s = celdaTxt(v), m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s;
    };
    function listaVigentesDeFilas(filas) {
      filas = Array.from(filas || [], (f) => (Array.isArray(f) ? f : []));   // (las filas vacías llegan como huecos del arreglo)
      const parecidos = (col, desde) => { let n = 0; for (let i = desde; i < Math.min(filas.length, desde + 300); i++) if (PARECE_CODIGO.test(normalizarCodigo(celdaTxt(filas[i][col])))) n++; return n; };
      let mejor = null;
      for (let i = 0; i < Math.min(filas.length, 30); i++) {
        filas[i].forEach((v, j) => {
          const t = celdaTxt(v); if (!t) return;
          ENC.codigo.forEach((rx, fuerza) => { if (!rx.test(t)) return; const n = parecidos(j, i + 1), p = n * 10 - fuerza; if (n && (!mejor || p > mejor.p)) mejor = { fila: i, col: j, p, titulo: t }; });
        });
      }
      if (!mejor) {                                                     // sin encabezado reconocible: la columna con más códigos
        const anchos = Math.max(0, ...filas.slice(0, 300).map((f) => f.length));
        for (let j = 0; j < anchos; j++) { const n = parecidos(j, 0); if (n >= 3 && (!mejor || n > mejor.p)) mejor = { fila: -1, col: j, p: n, titulo: `columna ${j + 1}` }; }
        if (mejor) { const k = filas.findIndex((f) => PARECE_CODIGO.test(normalizarCodigo(celdaTxt(f[mejor.col])))); mejor.fila = k - 1; }
      }
      const out = { docs: [], columnas: {}, fila: mejor ? mejor.fila : -1, duplicados: 0, estados: {} };
      if (!mejor) return out;
      const col = { codigo: mejor.col }; out.columnas.codigo = mejor.titulo;
      const cab = filas[mejor.fila] || [], sobre = filas[mejor.fila - 1] || [];
      Object.keys(ENC).forEach((k) => {
        if (k === 'codigo') return;
        const buscarEn = (fila, soloVacias) => fila.findIndex((v, j) => j !== mejor.col && (!soloVacias || !celdaTxt(cab[j])) && ENC[k].some((rx) => rx.test(celdaTxt(v))));
        let j = buscarEn(cab, false); if (j < 0) j = buscarEn(sobre, true);   // (el encabezado "S" del estado está una fila más arriba en la lista del DMS)
        if (j >= 0) { col[k] = j; out.columnas[k] = celdaTxt(cab[j]) || celdaTxt(sobre[j]); }
      });
      const vistos = new Set();
      for (let i = mejor.fila + 1; i < filas.length; i++) {
        const f = filas[i], cod = normalizarCodigo(celdaTxt(f[col.codigo])); if (!cod || !/[A-Z]/.test(cod) || !/\d/.test(cod) || cod.length > 40) continue;
        if (vistos.has(cod)) { out.duplicados++; continue; } vistos.add(cod);
        const val = (k) => (col[k] == null ? '' : k === 'fecha' || k === 'validez' ? fechaIso(f[col[k]]) : celdaTxt(f[col[k]]));
        const d = [cod, val('titulo'), val('revision'), val('estado'), val('categoria'), val('fecha'), val('validez')];
        out.docs.push(d); if (d[3]) out.estados[d[3]] = (out.estados[d[3]] || 0) + 1;
      }
      return out;
    }
    // ---- lista de equipos calificados: la hoja "Cronograma" (encabezados en la fila de "ESTADO GENERAL") ----
    const ENC_CAL = {
      codigo: /^c[oó]digo(\s*(mif|gaci|de\s*referencia))?$/i, sap: /^c[oó]digo\s*sap$/i, desc: /^descripci[oó]n$/i, general: /^estado\s*general$/i,
      oq: /\(\s*oq\s*\).*estado\s*de\s*calificaci[oó]n/i, pq: /\(\s*pq\s*\).*estado\s*de\s*calificaci[oó]n/i, oqProx: /\(\s*oq\s*\).*pr[oó]xima/i, pqProx: /\(\s*pq\s*\).*pr[oó]xima/i,
      tipo: /^tipo\s*(de\s*)?equipo$/i, sucursal: /^(sucursal|planta)$/i, seccion: /^secci[oó]n$/i, estadoEquipo: /^estado$/i, obs: /^observaciones?$/i,
    };
    const COL_AU = 46;                                                    // (si el encabezado "ESTADO GENERAL" no aparece: la columna AU)
    function listaCalificadosDeFilas(filas) {
      filas = Array.from(filas || [], (f) => (Array.isArray(f) ? f : []));   // (las filas vacías llegan como huecos del arreglo)
      const limpio = (v) => celdaTxt(v).replace(/[:*]+$/, '').trim();
      let fila = -1;
      for (let i = 0; i < Math.min(filas.length, 40) && fila < 0; i++) if (filas[i].some((v) => ENC_CAL.general.test(limpio(v)))) fila = i;
      for (let i = 0; i < Math.min(filas.length, 40) && fila < 0; i++) if (filas[i].some((v) => /^c[oó]digo\s*(mif|gaci|de\s*referencia)$/i.test(limpio(v)))) fila = i;
      const out = { equipos: [], columnas: {}, fila, estados: {}, sinCodigo: 0 };
      if (fila < 0) return out;
      const cab = filas[fila], col = {};
      Object.entries(ENC_CAL).forEach(([k, rx]) => { const j = cab.findIndex((v) => rx.test(limpio(v))); if (j >= 0) { col[k] = j; out.columnas[k] = limpio(cab[j]); } });
      if (col.general == null && filas.slice(fila + 1, fila + 200).some((f) => /CALIFICADO|PENDIENTE|EN PROCESO/i.test(celdaTxt(f[COL_AU])))) { col.general = COL_AU; out.columnas.general = 'columna AU'; }
      if ((col.codigo == null && col.sap == null) || col.general == null) return out;
      for (let i = fila + 1; i < filas.length; i++) {
        const f = filas[i], v = (k) => (col[k] == null ? '' : /Prox$/.test(k) ? fechaIso(f[col[k]]) : celdaTxt(f[col[k]]));
        const cod = normalizarCodigo(v('codigo')), sap0 = normalizarCodigo(v('sap')), sap = /^\d+$/.test(sap0) ? sap0.replace(/^0+(?=\d)/, '') : '';
        if (!cod && !sap) { if (v('desc')) out.sinCodigo++; continue; }
        const e = [cod, sap, v('desc'), v('general').toUpperCase(), v('oq').toUpperCase(), v('pq').toUpperCase(), v('oqProx'), v('pqProx'), v('tipo'), v('sucursal'), v('seccion'), v('estadoEquipo'), v('obs')];
        out.equipos.push(e); const g = e[3] || '(sin estado)'; out.estados[g] = (out.estados[g] || 0) + 1;
      }
      return out;
    }
    function csvAFilas(texto) {
      const t = String(texto || '').replace(/^﻿/, ''), primera = t.split(/\r?\n/, 1)[0] || '';
      const sep = [';', '\t', ','].map((s) => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
      const filas = []; let fila = [], campo = '', q = false;
      for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (q) { if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += c; }
        else if (c === '"' && !campo) q = true;
        else if (c === sep) { fila.push(campo); campo = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
        else campo += c;
      }
      if (campo || fila.length) { fila.push(campo); filas.push(fila); }
      return filas;
    }

    // ---- exportar / importar ----
    const paraExportar = (reglas, vigentes, extra) => ({ app: 'rmd-ui-mejoras', tipo: 'reglas-revision', version: 1, ...(extra || {}), reglas: (reglas || []).map(normalizar), ...(vigentes ? { vigentes } : {}) });
    function leerExportado(obj) {
      const o = Array.isArray(obj) ? { reglas: obj } : obj;
      if (!o || typeof o !== 'object') throw new Error('el archivo no tiene una configuración de reglas');
      if (o.app && o.app !== 'rmd-ui-mejoras') throw new Error('el archivo es de otra aplicación');
      const reglas = Array.isArray(o.reglas) ? sinIdsRepetidos(o.reglas.filter((r) => r && typeof r === 'object').map(normalizar)) : null;
      let vigentes = null;
      if (o.vigentes && Array.isArray(o.vigentes.docs)) {
        const vistos = new Set(), docs = [];
        o.vigentes.docs.forEach((d) => { const f = Array.isArray(d) ? d : [d], cod = normalizarCodigo(f[0]); if (!cod || vistos.has(cod)) return; vistos.add(cod); docs.push([cod, ...f.slice(1, 7).map((x) => (x == null ? '' : String(x)))]); });
        const estados = {}; docs.forEach((d) => { if (d[3]) estados[d[3]] = (estados[d[3]] || 0) + 1; });
        vigentes = { archivo: String(o.vigentes.archivo || 'lista importada'), cargado: String(o.vigentes.cargado || ''), hoja: String(o.vigentes.hoja || ''), columna: String(o.vigentes.columna || ''), n: docs.length, estados, docs };
      }
      let calificados = null;
      if (o.calificados && Array.isArray(o.calificados.equipos)) {
        const equipos = o.calificados.equipos.filter(Array.isArray).map((e) => [normalizarCodigo(e[0]), normalizarCodigo(e[1]), ...e.slice(2, 13).map((x) => (x == null ? '' : String(x)))]).filter((e) => e[0] || e[1]);
        const estados = {}; equipos.forEach((e) => { const g = e[3] || '(sin estado)'; estados[g] = (estados[g] || 0) + 1; });
        const ok = Array.isArray(o.calificados.estadosOk) ? o.calificados.estadosOk.map((x) => String(x).trim()).filter(Boolean) : ESTADOS_OK.slice();
        calificados = { archivo: String(o.calificados.archivo || 'lista importada'), cargado: String(o.calificados.cargado || ''), hoja: String(o.calificados.hoja || ''), n: equipos.length, estados, estadosOk: ok.length ? ok : ESTADOS_OK.slice(), equipos };
      }
      if (!reglas && !vigentes && !calificados) throw new Error('el archivo no trae reglas ni listas');
      return { reglas, vigentes, calificados, exportado: String(o.exportado || ''), script: String(o.script || '') };
    }
    // Agregar: las de mismo id o mismo nombre se reemplazan (en su lugar); las demás se agregan al final. Reemplazar: solo las nuevas.
    function fusionar(actuales, nuevas, reemplazar) {
      if (reemplazar) return { reglas: sinIdsRepetidos(nuevas.map(normalizar)), agregadas: nuevas.length, reemplazadas: 0 };
      const out = (actuales || []).map(normalizar), clave = (r) => plegar(r.nombre).p;
      let agregadas = 0, reemplazadas = 0;
      (nuevas || []).map(normalizar).forEach((n) => {
        const i = out.findIndex((r) => r.id === n.id || clave(r) === clave(n));
        if (i >= 0) { out[i] = { ...n, id: out[i].id }; reemplazadas++; } else { out.push(n); agregadas++; }
      });
      return { reglas: sinIdsRepetidos(out), agregadas, reemplazadas };
    }

    // v1.37: línea de observación por un cambio de receta en SAP: «20260929CJ Actualización de Lista de Materiales» = AAAAMMDD + iniciales de la
    // persona en SAP (1.ª letra de su primer nombre y de su primer apellido) + el mensaje.
    const primeraLetra = (t) => { const m = /\p{L}/u.exec(String(t == null ? '' : t).trim().split(/\s+/)[0] || ''); return m ? m[0].normalize('NFD')[0].toUpperCase() : ''; };   // (sin tilde: «Ángela» → A, «Ñuñez» → N)
    const inicialesDe = (nombre, apellido) => primeraLetra(nombre) + primeraLetra(apellido);
    function lineaActualizacion(fecha, iniciales, { lista, ruta } = {}) {
      const d = fecha instanceof Date ? fecha : new Date(fecha), p2 = (n) => String(n).padStart(2, '0');
      const mensaje = lista && ruta ? 'Actualización de Lista de Materiales y Hoja de Ruta' : ruta ? 'Actualización de Hoja de Ruta' : 'Actualización de Lista de Materiales';
      return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${iniciales || ''} ${mensaje}`;
    }

    return { TIPOS, VIGENCIAS, CONDICIONES, ACCIONES, COLORES, DONDE, CALIFICACIONES, ESTADOS_OK, FUENTE_DOC, CLAVES_PREDETERMINADAS, inicialesDe, lineaActualizacion, normalizar, predeterminadas,
      completarPredeterminadas, sinIdsRepetidos, compilar, buscar, evaluarConjunto, evaluarEquipos, resumen, plegar, partir, normalizarCodigo, tipoDocumento, codigosDocumento,
      listaVigentesDeFilas, listaCalificadosDeFilas, mapaCalificados, faseDeObservacion, csvAFilas, paraExportar, leerExportado, fusionar, nuevoId };
  })();
  // ==REGLAS-FIN==

  // ---- "Documentos citados" del RMD (v1.23: solo los documentos, como se pensó al inicio, y en segundos) ----
  // Lee TODOS los pasos del RMD abierto (MD_ES_PASO, con su estructura), sus etiquetas (MD_ES_ETIQUETA) y todos sus procesos
  // menores (MD_ES_PASO_INSUMO_PASO) con el modelo del portal —las mismas entidades que el portal usa al abrir cada lista—, en
  // 3 lecturas y sin abrir ninguna ventana, y busca en las descripciones el patrón <Tipo I/P/F><Área>-<sufijo NNN> (mismo
  // criterio que src/rmd_automation/referencias.py) y, desde la v1.34, también manuales (MCAL-200) y políticas (POL-CAL-001),
  // como en la lista de vigentes del DMS (Reglas.FUENTE_DOC). Antes abría cada lista y tardaba de 20 s a varios minutos.
  // v1.34: la lectura (leerTextosRmd) es la misma del aviso de reglas del RMD; con la lista de vigentes cargada sale "Vigente".
  const ICONO_DOCUMENTOS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h6l2.5 2.5V14a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z"/><path d="M9.5 1.5V4h2.5M5.5 8h5M5.5 10.5h5"/></svg>';
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
    const base = await textosDelRmd(modelo, md, 0);                         // (lectura nueva: también la usa el aviso de reglas del RMD)
    const r = { rmd: base.rmd, listas: base.listas.map((l) => ({ ...l, citas: 0 })), citas: [], pasos: base.pasos, pms: base.pms, segundos: base.segundos };
    base.textos.forEach((x) => Reglas.codigosDocumento(x.texto).forEach((codigo) => { r.citas.push({ ...x.lugar, codigo }); r.listas[x.il].citas++; }));
    return r;
  }
  function agruparCitas(citas) {
    const m = new Map();
    citas.forEach((c) => { let x = m.get(c.codigo); if (!x) { x = { codigo: c.codigo, tipo: c.codigo[0], citas: 0, lugares: [] }; m.set(c.codigo, x); } x.citas++; x.lugares.push(c); });
    return [...m.values()].sort((a, b) => (a.codigo < b.codigo ? -1 : 1));
  }
  const lugarTexto = (x) => `${x.lista} › paso ${x.paso}${x.pm ? ' › proceso menor ' + x.pm : ''}`;
  function pintarCitas(v, dRaiz, r) {
    const docs = agruparCitas(r.citas), vig = on('reglasrev') && RR.mapa; window.__rmdStats.ultimasCitas = r;
    v.fondo.querySelector('h3').textContent = `Documentos citados — ${cabecera(dRaiz)}`;
    const nNo = vig ? docs.filter((x) => !RR.mapa.has(x.codigo)).length : 0;
    const celdaVig = (x) => { const i = RR.mapa.get(x.codigo); return i ? `<td class="rmd-vig-si" title="${esc([i.titulo, i.revision && 'Rev. ' + i.revision, i.estado, i.validez && 'Validez ' + i.validez].filter(Boolean).join(' · '))}">✓ Sí</td>` : '<td class="rmd-vig-no" title="No está en la lista de documentos vigentes">✗ No</td>'; };
    const filasDocs = docs.map((x) => `<tr><td class="rmd-nowrap">${esc(x.codigo)}</td><td>${esc(Reglas.tipoDocumento(x.codigo))}</td>${vig ? celdaVig(x) : ''}<td>${x.citas}</td><td class="rmd-nota">${esc(x.lugares.slice(0, 3).map(lugarTexto).join('; '))}${x.lugares.length > 3 ? '…' : ''}</td></tr>`).join('');
    const lineaVig = vig ? `${nNo ? ` · <b class="rmd-vig-no">${nNo} no vigente(s)</b>` : docs.length ? ' · <span class="rmd-vig-si">todos vigentes</span>' : ''} según la lista «${esc(RR.vigentes.archivo)}» (cargada el ${esc(fechaHoraCorta(RR.vigentes.cargado))})`
      : on('reglasrev') ? ' · <button type="button" class="rmd-rg-link" data-a="vigentes">Carga la lista de documentos vigentes</button> para saber cuáles están vigentes' : '';
    v.cuerpo.innerHTML = `<p><b>${docs.length}</b> documentos citados (${r.citas.length} citas) en ${r.pasos} pasos y ${r.pms} procesos menores de ${r.listas.length} listas · ${r.segundos} s${lineaVig}.</p>
      ${docs.length ? `<table class="rmd-tabla"><thead><tr><th>Código</th><th>Tipo</th>${vig ? '<th>Vigente</th>' : ''}<th>Citas</th><th>Dónde</th></tr></thead><tbody>${filasDocs}</tbody></table>`
        : '<p>No se encontró ningún código de documento (ej. IPRO-P123, FPRO-250, POL-CAL-001, MCAL-200) en las descripciones de los pasos ni de los procesos menores.</p>'}`;
    const bL = v.cuerpo.querySelector('[data-a=vigentes]'); if (bL) bL.addEventListener('click', () => { v.cerrar(); abrirReglas('vigentes'); });
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
    const vig = on('reglasrev') && RR.mapa, info = (c) => (vig ? RR.mapa.get(c) : null);   // con la lista de vigentes cargada: columna "Vigente"
    const libro = Xlsx.crearLibro();
    const hR = libro.hoja('Resumen', { activa: true, cols: [[1, 1, 52], [2, 4, 16]] });
    hR.poner('A1', 'Documentos citados en el RMD', 'titulo');
    hR.poner('A2', cabecera(dRaiz), 'negrita');
    hR.poner('A3', `Generado el ${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())} · ${docs.length} documentos, ${r.citas.length} citas en ${r.pasos} pasos y ${r.pms} procesos menores`
      + (vig ? ` · ${docs.filter((x) => !info(x.codigo)).length} no vigentes según la lista «${RR.vigentes.archivo}» (cargada el ${fechaHoraCorta(RR.vigentes.cargado)})` : ''), 'nota');
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
    const num = (t) => (/^\d+$/.test(t || '') ? +t : t), dondeTxt = (x) => x.lugares.map(lugarTexto).join('\n').slice(0, 32000);
    if (vig) tabla('Documentos citados', ['Código', 'Tipo', 'Vigente', 'Título en la lista de vigentes', 'Revisión', 'Citas', 'Dónde aparece'], [14, 15, 9, 50, 9, 8, 100],
      docs.map((x) => { const i = info(x.codigo); return [x.codigo, Reglas.tipoDocumento(x.codigo), i ? 'Sí' : 'No', i ? i.titulo : '', i ? i.revision : '', x.citas, dondeTxt(x)]; }), { 3: 'envuelto', 6: 'envuelto' });
    else tabla('Documentos citados', ['Código', 'Tipo', 'Citas', 'Dónde aparece'], [14, 15, 8, 110], docs.map((x) => [x.codigo, Reglas.tipoDocumento(x.codigo), x.citas, dondeTxt(x)]), { 3: 'envuelto' });
    tabla('Citas', ['Código', 'Tipo', ...(vig ? ['Vigente'] : []), 'Lista', 'Paso', 'Proceso menor', 'Descripción donde aparece'], vig ? [14, 15, 9, 40, 7, 9, 90] : [14, 15, 40, 7, 9, 90],
      r.citas.map((x) => [x.codigo, Reglas.tipoDocumento(x.codigo), ...(vig ? [info(x.codigo) ? 'Sí' : 'No'] : []), x.lista, num(x.paso), num(x.pm), x.pm ? x.descPM : x.descPaso]), { [vig ? 6 : 5]: 'envuelto' });
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
    document.querySelectorAll('.sapMDialog .rmd-status-rmd, .sapMDialog .rmd-suspension, .sapMDialog .rmd-buscar-equipo').forEach((e) => e.remove());   // nunca en ventanas (Configuración Maestra)
    const btnExportar = botonExportar(); if (!btnExportar) return;
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
  // (el de la lista principal: Configuración Maestra y otras ventanas del portal también tienen un "Exportar" y ahí no va nada del script)
  const botonExportar = () => [...document.querySelectorAll('button')].find((b) => visible(b) && b.title === 'Exportar' && !b.closest('.sapMDialog'));
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
      on('plantillaprod') && ['Plantilla para Producción', 'Archivo .html para que Producción deje su borrador de cambios a un RMD sin entrar a SAP (y luego importarlo en un RMD Ingresado)', () => abrirPlantillaProduccion()],
      on('cambiosrecetas') && ['Recetas con cambios en SAP', 'RMD Ingresados y Autorizados con la lista de materiales u hoja de ruta distinta en SAP, y cuáles son las diferencias', () => exportarCambiosRecetas()],
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
    if (catalogoEquipos && catalogoEquipos.__modelo !== modelo) catalogoEquipos = null;   // (otro modelo: el del arranque ya no responde)
    if (!catalogoEquipos) catalogoEquipos = Promise.all([
      leerEntidadCompleta(modelo, 'EQUIPO', { $select: 'equipoId,CodigoGaci,denom,eqktx,equnr,pltxt' }, 'equipoId', avisar),
      leerEntidadCompleta(modelo, 'UTENSILIO', { $select: 'utensilioId,codigo,descripcion' }, 'utensilioId'),
      leerEntidadCompleta(modelo, 'UTENSILIO_CLASIFICACION', { $select: 'clasificacionUtensilioId,descripcion' }, 'clasificacionUtensilioId'),
    ]).then(([eq, ut, ag]) => agruparCatalogo([
      ...eq.map((e) => ({ tipo: 'EQUIPO', id: e.equipoId, codigo: norm(e.CodigoGaci || e.equnr || ''), desc: norm(e.denom || e.eqktx || ''), extra: norm(e.equnr || '') + ' ' + norm(e.pltxt || '') })),
      ...ut.map((u) => ({ tipo: 'UTENSILIO', id: u.utensilioId, codigo: norm(u.codigo || u.utensilioId || ''), desc: norm(u.descripcion || ''), extra: '' })),
      ...ag.map((g) => { const desc = norm(g.descripcion || ''), m = /\s-\s*([A-Z0-9]+(?:-[A-Z0-9]+)+)\s*$/.exec(desc); return { tipo: 'AGRUPADOR', id: g.clasificacionUtensilioId, codigo: m ? m[1] : '', desc, extra: '' }; }),
    ])).catch((e) => { catalogoEquipos = null; throw e; });
    if (catalogoEquipos) catalogoEquipos.__modelo = modelo;
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
    if (filtroEquipo.input) filtroEquipo.input.setValue(''); filtroEquipo.ids = null; filtroEquipo.texto = '';   // se busca ese código, sin el filtro de equipo
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

  // ---- Modificaciones masivas de RMD (v1.23 "Suspensión masiva"; ver más abajo) ----
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
  // ---- Modificaciones masivas (v1.23 "Suspensión masiva"; v1.28: también Ingresados y observaciones en cualquier master) ----
  // Cada master se modifica igual que a mano, con la ventana "Asociar fórmulas" del portal y su botón Guardar (sus validaciones,
  // la trazabilidad y, al suspender, la anulación del documento de cada receta en el DMS):
  //  · Suspender: Estado "Suspendido" (el combo del portal lo ofrece a Autorizados e Ingresados) + el motivo, opcional, como una
  //    línea nueva al final de Observaciones.
  //  · Agregar observación: solo la línea nueva en Observaciones, sin cambiar el Estado. Sirve para cualquier estado salvo
  //    Cancelado (el Guardar del portal no graba nada en un master cancelado). En un Autorizado de Fabricación / Envase el portal
  //    compara antes las cantidades de insumos y, si difieren, abre el "Comparador de fórmula" en vez de guardar: se informa.
  // Se abre desde el panel de mejoras o con Ctrl+K (no está en la barra de la lista: se usa poco y cambia muchos RMD a la vez).
  const MODOS_MASIVOS = {
    suspender: { titulo: 'Suspender', estados: ['Autorizado', 'Ingresado'], verbo: 'Suspender', hecho: 'Suspendido' },
    observacion: { titulo: 'Agregar observación', estados: ['Autorizado', 'Ingresado', 'Suspendido', 'Solicitado', 'Solicitud Aprobada', 'Solicitud Rechazada'], verbo: 'Agregar la observación a', hecho: 'Observación agregada' },
  };
  // Modifica UN master con el Guardar del portal. Devuelve { obs, mensajes }; lanza un error con el motivo si no se pudo.
  async function modificarUno(ctrl, codigo, { suspender, linea }) {
    const d = await abrirAsociarFormulas(ctrl, codigo), vista = ctrl.getView(), asoc = vista.getModel('asociarDatos');
    const previos = new Set(dialogos());
    try {
      const a = asoc.getData(); if (a.codigo !== codigo) throw new Error(`se abrió otro RMD (${a.codigo})`);
      const ctls = controlesDe(d), combo = ctls.find((c) => rutaDe(c, 'selectedKey') === '/estadoIdRmd_iMaestraIdBK');
      if (suspender) {
        if (!combo || !combo.getItems) throw new Error('no se encontró el campo Estado');
        if (combo.getEditable && !combo.getEditable()) throw Object.assign(new Error('tu usuario no puede cambiar el Estado en "Asociar fórmulas" (en el portal solo lo permite el rol Jefe DT)'), { sinPermiso: true });
        const item = (t) => combo.getItems().find((i) => SIN_ACENTOS(i.getText()) === t), sus = item('SUSPENDIDO');
        if (!sus) throw new Error('el Estado no ofrece "Suspendido"');
        const actual = combo.getItems().find((i) => String(i.getKey()) === String(a.estadoIdRmd_iMaestraId));
        if (!actual || !['AUTORIZADO', 'INGRESADO'].includes(SIN_ACENTOS(actual.getText()))) throw new Error(`no está Autorizado ni Ingresado (${actual ? actual.getText() : 'estado desconocido'})`);
        combo.setSelectedKey(sus.getKey()); combo.fireSelectionChange({ selectedItem: sus }); combo.fireChange({ value: sus.getText(), newValue: sus.getText(), itemPressed: true });
        asoc.setProperty('/estadoIdRmd_iMaestraIdBK', isNaN(+sus.getKey()) ? sus.getKey() : +sus.getKey());
        if (ctrl.localModel) ctrl.localModel.setProperty('/flagEstadoFormula', true);
      } else if (!linea) throw new Error('falta el texto de la observación');
      const antes = String(a.observacionBK != null ? a.observacionBK : a.observacion || '').replace(/\s+$/, '');
      const obs = linea ? (antes ? antes + '\n' : '') + linea : antes;
      asoc.setProperty('/observacionBK', obs);
      // el mismo manejador que el botón Guardar de la ventana (se espera a que termine: guarda, trazabilidad y DMS)
      const bGuardar = ctls.find((c) => c.getMetadata().getName() === 'sap.m.Button' && c.getText && c.getText() === 'Guardar' && c.getDomRef() && visible(c.getDomRef()));
      const reg = bGuardar && ((bGuardar.mEventRegistry || {}).press || [])[0]; if (!reg) throw new Error('no se encontró el botón Guardar');
      await reg.fFunction.call(reg.oListener, { getSource: () => bGuardar, getParameter: () => undefined, getParameters: () => ({}) });
      await esperar(400); await hasta(() => !ocupadoGlobal(), 60000);
      const comparador = dialogos().find((x) => !previos.has(x) && x !== d && /compar/i.test(cabecera(x)));
      if (comparador) {
        const c = [...comparador.querySelectorAll('button')].find((x) => visible(x) && /^(Cancelar|Cerrar)$/.test(x.textContent.trim())); if (c) pulsar(c); await esperar(500);
        throw new Error('el portal pidió revisar las cantidades de insumos (Comparador de fórmula) y no guardó: hazlo a mano en este master');
      }
      const mensajes = (await cerrarMensajesPortal()).filter((t) => !/guardaron los cambios correctamente/i.test(t));
      return { obs, mensajes };
    } finally {
      await cerrarMensajesPortal();
      try { ctrl.onCancelAsociarArticulos(); } catch (e) { const b = [...d.querySelectorAll('button')].find((x) => visible(x) && /^Cancelar$/.test(x.textContent.trim())); if (b) pulsar(b); }
      await esperar(500);
    }
  }
  const suspenderUno = (ctrl, codigo, motivo) => modificarUno(ctrl, codigo, { suspender: true, linea: motivo });
  function abrirModificacionesMasivas(modoInicial = 'suspender') {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2');
    if (!modelo) { toast('Abre la lista "Configuración Manufactura Digital" para las modificaciones masivas.', true); return; }
    if (dialogos().length) { toast('Cierra las ventanas abiertas del portal antes de las modificaciones masivas.', true); return; }
    let trabajando = false, detenido = false, plan = [], resultados = [], modo = MODOS_MASIVOS[modoInicial] ? modoInicial : 'suspender';
    const v = ventana('Modificaciones masivas de RMD', { cancelar: () => { if (!trabajando) v.cerrar(); } });
    v.cuerpo.innerHTML = `<div class="rmd-mm-modos" role="tablist">${Object.entries(MODOS_MASIVOS).map(([k, m]) => `<button type="button" role="tab" class="rmd-mm-modo" data-modo="${k}">${esc(m.titulo)}</button>`).join('')}</div>
      <p class="rmd-mm-ayuda"></p>
      <textarea class="rmd-min-texto rmd-susp-codigos" placeholder="2202608939&#10;2202607784"></textarea>
      <p class="rmd-mm-rotulo"></p>
      <input type="text" class="rmd-susp-motivo" maxlength="400">
      <p class="rmd-nota rmd-mm-nota"></p>
      <p class="rmd-progreso"></p><div class="rmd-susp-res"></div>`;
    const ta = v.cuerpo.querySelector('.rmd-susp-codigos'), mot = v.cuerpo.querySelector('.rmd-susp-motivo'), prog = v.cuerpo.querySelector('.rmd-progreso'), res = v.cuerpo.querySelector('.rmd-susp-res');
    const puede = (est) => MODOS_MASIVOS[modo].estados.includes(est);
    const pintarModo = () => {
      v.cuerpo.querySelectorAll('.rmd-mm-modo').forEach((b) => { const s = b.dataset.modo === modo; b.classList.toggle('activo', s); b.setAttribute('aria-selected', String(s)); });
      const sus = modo === 'suspender';
      v.cuerpo.querySelector('.rmd-mm-ayuda').innerHTML = sus ? 'Pega los códigos de los master <b>Autorizados o Ingresados</b> que quieres suspender (uno por línea o separados por espacios o comas).'
        : 'Pega los códigos de los master (en <b>cualquier estado</b> salvo Cancelado) a los que quieres agregar una observación.';
      v.cuerpo.querySelector('.rmd-mm-rotulo').innerHTML = sus ? '<b>Motivo de la suspensión</b> (opcional): se agrega como una línea nueva al final de las Observaciones de "Asociar fórmulas".'
        : '<b>Observación</b> (obligatoria): se agrega como una línea nueva al final de las Observaciones de "Asociar fórmulas".';
      mot.placeholder = sus ? 'Ej.: 20260924 Suspendido por actualización de fórmula (CC 26-300)' : 'Ej.: 20260925CJ Revisado en auditoría interna (sin cambios)';
      v.cuerpo.querySelector('.rmd-mm-nota').textContent = sus ? 'Cada RMD se suspende igual que a mano: "Asociar fórmulas" → Estado "Suspendido" → Guardar del portal (con sus validaciones, la trazabilidad y la anulación del documento de cada receta en el DMS). Requiere el permiso para cambiar el Estado (rol Jefe DT).'
        : 'Cada RMD se modifica igual que a mano: "Asociar fórmulas" → Observaciones → Guardar del portal. El Estado no cambia. Los Cancelados no se pueden modificar (el portal no guarda nada en un master cancelado).';
      plan = []; resultados = []; res.innerHTML = ''; setTxt(prog, ''); bEje.disabled = true; setTxt(bEje, MODOS_MASIVOS[modo].verbo);
    };
    v.cuerpo.querySelector('.rmd-mm-modos').addEventListener('click', (e) => { const b = e.target.closest('.rmd-mm-modo'); if (!b || trabajando) return; modo = b.dataset.modo; pintarModo(); });
    const tablaPlan = () => {
      res.innerHTML = `<table class="rmd-tabla"><thead><tr><th>Código</th><th>Versión</th><th>Descripción</th><th>Etapa</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>${plan.map((x) => {
        const r = resultados.find((y) => y.codigo === x.codigo);
        return `<tr><td>${esc(x.codigo)}</td><td>${esc(x.md ? x.md.version : '')}</td><td>${esc(x.md ? x.md.descripcion : '')}</td><td>${esc(x.md ? x.md.nivelTxt : '')}</td><td>${esc(x.estadoTxt)}</td><td class="${r && !r.ok ? 'rmd-dif' : ''}">${esc(r ? r.resultado : x.aplica ? (modo === 'suspender' ? 'Se suspenderá' : 'Se agregará la observación') : x.motivoNo)}</td></tr>`; }).join('')}</tbody></table>`;
    };
    const bRev = botonModal('Revisar', 'primario', async () => {
      const codigos = [...new Set((ta.value.match(/\d{6,}/g) || []))];
      if (!codigos.length) { setTxt(prog, 'No se encontró ningún código (números de 6 o más cifras).'); return; }
      bRev.disabled = true; resultados = []; setTxt(prog, `Leyendo ${codigos.length} código(s) en SAP…`);
      try {
        const mds = await leerMDPorCodigos(modelo, codigos), porCod = new Map();
        mds.forEach((m) => { const y = porCod.get(m.codigo); if (!y || m.version > y.version) porCod.set(m.codigo, m); });   // la versión más reciente
        plan = codigos.map((c) => { const md = porCod.get(c), est = md && md.estadoIdRmd ? md.estadoIdRmd.contenido : '';
          return { codigo: c, md, estadoTxt: md ? est : '—', aplica: !!md && puede(est), motivoNo: !md ? 'No existe' : puede(est) ? '' : `No se modifica: está ${est}` }; });
        const n = plan.filter((x) => x.aplica).length;
        setTxt(prog, `${n} de ${codigos.length} se pueden ${modo === 'suspender' ? 'suspender (Autorizados o Ingresados)' : 'modificar (todos menos Cancelados)'}.`); tablaPlan();
        bEje.disabled = !n; setTxt(bEje, n ? `${MODOS_MASIVOS[modo].verbo} ${n} RMD` : MODOS_MASIVOS[modo].verbo);
      } catch (e) { setTxt(prog, 'No se pudieron leer los códigos: ' + e.message); } finally { bRev.disabled = false; }
    });
    const bEje = botonModal('Suspender', 'peligro', async () => {
      const lista = plan.filter((x) => x.aplica), linea = norm(mot.value), sus = modo === 'suspender';
      if (!lista.length) return;
      if (!sus && !linea) { setTxt(prog, 'Escribe la observación que se agregará.'); mot.focus(); return; }
      const ok = await confirmar(sus ? `¿Suspender ${lista.length} RMD?` : `¿Agregar la observación a ${lista.length} RMD?`,
        sus ? `Se cambiará a "Suspendido" el Estado de ${lista.length} RMD en SAP${linea ? ` y se agregará a sus Observaciones la línea: "${linea}"` : ''}.` : `Se agregará al final de las Observaciones de ${lista.length} RMD la línea: "${linea}". El Estado no cambia.`,
        sus ? 'El portal además anula en el DMS el documento de sus recetas, como al suspender a mano. No se puede deshacer desde aquí.' : 'Se guarda con el Guardar de "Asociar fórmulas" de cada master. Para quitarla habría que editarla a mano.',
        { si: sus ? `Suspender ${lista.length}` : `Agregar a ${lista.length}`, no: 'Cancelar', peligro: sus });
      if (!ok) return;
      trabajando = true; detenido = false; bEje.disabled = true; bRev.disabled = true; ta.readOnly = true; mot.readOnly = true;
      const bDet = botonModal('Detener', '', () => { detenido = true; bDet.disabled = true; setTxt(bDet, 'Se detiene tras el actual…'); }); v.pie.prepend(bDet);
      const filtroAntes = ctrl.getView().getModel('oDataFilter').getProperty('/code') || '', usuario = usuarioSapActual(), quien = usuario ? (usuario.nombre || usuario.id) : '';
      try {
        for (let i = 0; i < lista.length && !detenido; i++) {
          const x = lista[i]; setTxt(prog, `${sus ? 'Suspendiendo' : 'Agregando la observación'} ${i + 1} de ${lista.length}: ${x.codigo}…`);
          const r = { codigo: x.codigo, md: x.md, modo: MODOS_MASIVOS[modo].titulo, estadoAntes: x.estadoTxt, motivo: linea, fecha: new Date(), usuario: quien, ok: false, obs: '', estadoDespues: '', resultado: '' };
          try {
            const s = await modificarUno(ctrl, x.codigo, { suspender: sus, linea });
            const md2 = (await leerMDPorCodigos(modelo, [x.codigo])).sort((p, q) => q.version - p.version)[0];
            r.estadoDespues = md2 && md2.estadoIdRmd ? md2.estadoIdRmd.contenido : ''; r.obs = md2 ? md2.observacion || '' : s.obs;
            r.ok = sus ? r.estadoDespues === 'Suspendido' : String(r.obs).replace(/\s+$/, '').endsWith(linea);
            r.resultado = r.ok ? MODOS_MASIVOS[modo].hecho : `No se guardó${s.mensajes.length ? ': ' + s.mensajes.join(' · ') : sus ? ` (quedó ${r.estadoDespues || 'sin cambio'})` : ' (la observación no quedó en SAP)'}`;
          } catch (e) {
            r.resultado = 'No se guardó: ' + e.message; r.obs = x.md ? x.md.observacion || '' : '';
            if (e.sinPermiso) { resultados.push(r); tablaPlan(); detenido = true; break; }
          }
          resultados.push(r); tablaPlan();
        }
        plan.filter((x) => !x.aplica).forEach((x) => resultados.push({ codigo: x.codigo, md: x.md, modo: MODOS_MASIVOS[modo].titulo, estadoAntes: x.estadoTxt, estadoDespues: x.estadoTxt, motivo: '', fecha: new Date(), usuario: quien, ok: false, obs: x.md ? x.md.observacion || '' : '', resultado: x.motivoNo }));
        const hechos = resultados.filter((y) => y.ok).length;
        setTxt(prog, `${detenido ? 'Detenido. ' : ''}${sus ? 'Suspendidos' : 'Con la observación agregada'}: ${hechos} de ${lista.length}. Descarga el detalle con "Exportar Excel".`);
      } finally {
        trabajando = false; bDet.remove(); bRev.disabled = false; ta.readOnly = false; mot.readOnly = false; bX.disabled = !resultados.length;
        try { ctrl.getView().getModel('oDataFilter').setProperty('/code', filtroAntes); await ctrl.onSearch(); } catch (e) { /* la lista se actualiza al próximo "Ir" */ }
      }
    });
    const bX = botonModal('Exportar Excel', '', async () => {
      const hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), libro = Xlsx.crearLibro();
      const cab = ['Código RMD', 'Versión', 'Descripción del master', 'Código por defecto', 'Etapa', 'Área (sección)', 'Planta', 'Modificación', 'Estado anterior', 'Estado actual', 'Resultado', 'Línea agregada', 'Observaciones', 'Fecha y hora', 'Usuario'];
      const h = libro.hoja('Modificaciones masivas', { activa: true, congelar: 'B2', cols: [13, 9, 44, 17, 16, 24, 14, 20, 14, 14, 40, 40, 70, 18, 28].map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: 'ModificacionesMasivas', ref: `A1:O${Math.max(2, resultados.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      resultados.forEach((x, i) => { const m = x.md || {};
        [x.codigo, m.version, m.descripcion, m.codDefectoReceta, m.nivelTxt, m.areaRmdTxt, m.sucursalId && m.sucursalId.contenido, x.modo, x.estadoAntes, x.estadoDespues, x.resultado, x.motivo, x.obs, x.fecha, x.usuario]
          .forEach((val, c) => { if (val !== '' && val != null) h.poner({ c, r: i + 1 }, c === 13 ? new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate(), val.getHours(), val.getMinutes())) : val, c === 12 ? 'envuelto' : c === 13 ? 'fechaHora' : 'normal'); }); });
      descargarArchivo(`Modificaciones masivas RMD ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())} ${dd(hoy.getHours())}${dd(hoy.getMinutes())}.xlsx`, await libro.generar(), TIPO_XLSX);
    });
    bX.disabled = true;
    v.pie.append(botonModal('Cerrar', '', () => { if (!trabajando) v.cerrar(); }), bX, bRev, bEje);
    pintarModo(); setTimeout(() => ta.focus(), 40);
  }
  const abrirSuspensionMasiva = () => abrirModificacionesMasivas('suspender');
  // diagnóstico (pruebas con el guardado SIMULADO): suspende uno con el mismo flujo, sin ventana
  window.__rmdStats.suspenderUno = (codigo, motivo) => suspenderUno(controladorPrincipal(), codigo, motivo);
  window.__rmdStats.observacionUno = (codigo, linea) => modificarUno(controladorPrincipal(), codigo, { suspender: false, linea });
  window.__rmdStats.leerMDPorCodigos = (codigos) => leerMDPorCodigos(controladorPrincipal().getView().getModel('mainModelv2'), codigos);

  // Botones de la barra principal (v1.28: ya ninguno propio aquí; "Buscar por equipo" es un filtro y "Modificaciones masivas" está en el panel)
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
    const viejoEq = barra.querySelector('.rmd-buscar-equipo'); if (viejoEq) viejoEq.remove();   // (v1.23-1.27: botón; ahora es el filtro "Equipo" de la barra de filtros)
    const viejoSus = barra.querySelector('.rmd-suspension'); if (viejoSus) viejoSus.remove();   // (v1.23-1.27: botón; ahora "Modificaciones masivas" en el panel de mejoras y Ctrl+K)
    void poner;
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
    const rx = new RegExp(Reglas.FUENTE_DOC, 'g'), citados = new Map();
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
    const vig = on('reglasrev') && RR.mapa, info = (c) => (vig ? RR.mapa.get(c) : null);   // con la lista de vigentes cargada: columna "Vigente"
    const cs = [...r.citas].sort((a, b) => nat(a.doc, b.doc) || nat(a.md.codigo, b.md.codigo) || (+a.orden || 0) - (+b.orden || 0));
    const porDoc = new Map(); cs.forEach((c) => { let x = porDoc.get(c.doc); if (!x) porDoc.set(c.doc, x = { masters: new Set(), aut: new Set(), citas: 0, etapas: new Set() }); x.masters.add(c.md.mdId); if (c.md.estado === 'Autorizado') x.aut.add(c.md.mdId); x.citas++; if (c.md.etapa) x.etapas.add(c.md.etapa); });
    const tabla = (nombre, nt, cab, anchos, datos, estilos = {}, op = {}) => {
      const h = libro.hoja(nombre, { activa: !!op.activa, congelar: op.congelar || 'A2', cols: anchos.map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: nt, ref: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, datos.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      datos.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'normal'); }));
    };
    const vg = (doc) => (vig ? [info(doc) ? 'Sí' : 'No'] : []);
    tabla('Documentos', 'Documentos', ['Documento', 'Tipo', ...(vig ? ['Vigente', 'Título en la lista de vigentes'] : []), 'Masters', 'Autorizados', 'Citas', 'Etapas'], vig ? [16, 15, 9, 50, 10, 12, 9, 50] : [16, 15, 10, 12, 9, 50],
      [...porDoc].map(([doc, x]) => [doc, Reglas.tipoDocumento(doc), ...vg(doc), ...(vig ? [(info(doc) || {}).titulo || ''] : []), x.masters.size, x.aut.size, x.citas, [...x.etapas].sort().join(', ')]), {}, { activa: true });
    tabla('Citas', 'CitasDocumentos', ['Documento', 'Tipo', ...(vig ? ['Vigente'] : []), 'Código RMD', 'Versión', 'Descripción del master', 'Estado', 'Etapa', 'Área (sección)', 'Planta', 'Lista', 'Paso / proceso menor', 'Orden', 'Código del paso', 'Descripción donde aparece'],
      vig ? [16, 15, 9, 13, 9, 42, 12, 15, 24, 13, 36, 14, 8, 13, 90] : [16, 15, 13, 9, 42, 12, 15, 24, 13, 36, 14, 8, 13, 90],
      cs.map((c) => [c.doc, Reglas.tipoDocumento(c.doc), ...vg(c.doc), c.md.codigo, c.md.version, c.md.descripcion, c.md.estado, c.md.etapa, c.md.seccion, c.md.planta, c.lista, c.esPM ? 'Proceso menor' : 'Paso', c.orden, c.codigoPaso, c.desc]), { [vig ? 14 : 13]: 'envuelto' }, { congelar: 'B2' });
    const hI = libro.hoja('Información', { cols: [[1, 1, 30], [2, 2, 90]] });
    hI.poner('A1', 'Documentos citados en todos los master', 'titulo');
    [['Generado', `${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())} (leído de SAP en ${r.segundos} s)`], ['Estados incluidos', estados.join(', ')],
      ['Documentos distintos', porDoc.size], ['Masters con citas', r.masters], ['Citas', cs.length], ['Pasos del catálogo que citan documentos', `${r.pasosCitados} de ${r.catalogo}`],
      ['Lista de documentos vigentes', vig ? `«${RR.vigentes.archivo}» (${RR.vigentes.docs.length} documentos, cargada el ${fechaHoraCorta(RR.vigentes.cargado)}): ${[...porDoc.keys()].filter((doc) => !info(doc)).length} de los documentos citados no están en ella` : 'sin cargar (botón de mejoras › Reglas de revisión › Documentos vigentes)'],
      ['Criterio', 'Código de documento en la descripción de los pasos y procesos menores: <I/P/F><Área>-<sufijo NNN> (ej. IPRO-P123, PCPR-202, FPRO-250), manuales M<Área>-NNN (MCAL-200) y políticas POL-<Área>-NNN (POL-CAL-001).']]
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
  // Fechas de SAP (v1.36): cada componente de la lista trae "válido desde" (ValidFrom, "dd.mm.aaaa") y su número de cambio (ChangeNo):
  // es la fecha en que se hizo ese cambio de la lista. La versión de fabricación trae "válida desde" (Adatu).
  const fechaBom = (v) => { const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(norm(v)); if (!m) return null; const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])); return isNaN(d) ? null : d; };
  const fechaCorta = (d) => (d ? `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}` : '');
  // Al copiar la lista al asociar la receta, el portal a veces lee el separador de miles como decimal: 42094 queda como «42.094000» (1000 veces
  // menos; 1 234 567 queda «1.234567»). No es un cambio en SAP: si la copia es la cantidad de SAP dividida entre 1000 o entre 1 000 000, es la misma.
  const cantidadIgual = (qSap, qRmd) => Math.abs(qSap - qRmd) <= 1e-6 || (qSap >= 1000 && [1e3, 1e6].some((f) => Math.abs(qSap - qRmd * f) <= 1e-6 * Math.max(1, qSap)));
  function diferenciasBom(sap, rmd) {
    const agrupar = (filas) => { const m = new Map(); filas.forEach((x) => { const k = norm(x.Component); if (!k) return; const g = m.get(k) || { comp: k, desc: norm(x.Maktx || x.ItemText1 || ''), q: 0, u: norm(x.CompUnit), n: 0, fecha: null, cambio: '' }; g.q += cantidadNum(x.CompQty) || 0; g.n++; if (!g.desc) g.desc = norm(x.Maktx || x.ItemText1 || '');
      const f = fechaBom(x.ValidFrom); if (f && (!g.fecha || f > g.fecha)) { g.fecha = f; g.cambio = norm(x.ChangeNo); } m.set(k, g); }); return m; };
    const a = agrupar(sap), b = agrupar(rmd), dif = [];
    a.forEach((x, k) => {
      const y = b.get(k);
      if (!y) dif.push({ tipo: 'nuevo', comp: k, desc: x.desc, ahora: { q: x.q, u: x.u }, fecha: x.fecha, cambio: x.cambio, texto: `+ ${k} ${numTxt(x.q)} ${x.u}`.trim() });
      else if (!cantidadIgual(x.q, y.q) || x.u.toUpperCase() !== y.u.toUpperCase()) dif.push({ tipo: 'cambia', comp: k, desc: x.desc || y.desc, antes: { q: y.q, u: y.u }, ahora: { q: x.q, u: x.u }, fecha: x.fecha, cambio: x.cambio, texto: `${k}: ${numTxt(y.q)} ${y.u} → ${numTxt(x.q)} ${x.u}` });
    });
    b.forEach((y, k) => { if (!a.has(k)) dif.push({ tipo: 'quitado', comp: k, desc: y.desc, antes: { q: y.q, u: y.u }, texto: `− ${k} (ya no está en la lista de SAP)` }); });
    // un quitado y un nuevo con la misma descripción salvo la versión del material ("… x25" → "… x25 H v.1") = reemplazo
    const base = (t) => norm(t).toUpperCase().replace(/[\s.,;-]*\b(H\s*)?V\.\s*\d+\s*$/, '').replace(/\s+/g, ' ').trim();
    const nuevos = dif.filter((d) => d.tipo === 'nuevo');
    dif.filter((d) => d.tipo === 'quitado').forEach((q) => {
      const bq = base(q.desc); if (bq.length < 6) return;
      const n = nuevos.find((x) => !x.__usado && base(x.desc) === bq); if (!n) return;
      n.__usado = true; q.__usado = true;
      dif.push({ tipo: 'reemplazo', comp: n.comp, compAntes: q.comp, desc: n.desc, descAntes: q.desc, antes: q.antes, ahora: n.ahora, fecha: n.fecha, cambio: n.cambio, texto: `${q.comp} → ${n.comp} (${n.desc})` });
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
    ['Mksp', 'Estado', (v) => TEXTO_MKSP[norm(v)] || norm(v), false], ['Adatu', 'Válida desde', fechaSap, false], ['Bdatu', 'Válida hasta', fechaSap, false], ['Bstma', 'Tamaño de lote máximo', (v) => numTxt(cantidadNum(v)), false],
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
      let ultima = null; bom.forEach((x) => { const f = fechaBom(x.ValidFrom); if (f && norm(x.ChangeNo) && (!ultima || f > ultima.fecha)) ultima = { fecha: f, cambio: norm(x.ChangeNo) }; });
      return { receta: `${rc.Matnr} / ${rc.Verid}`, codigo: norm(rc.Matnr), verid: norm(rc.Verid), texto: norm(rc.Text1 || ''), mdRecetaId: r.mdRecetaId, sap: bom.length, rmd: copia.length, dif, ruta, rutaAvisa, ultima };
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
    // solo el resumen: el detalle está en el ⚠ junto al código (y con clic en el código de la receta del aviso)
    const cod = (x) => `<b class="rmd-receta-cod" data-id="${esc(x.mdRecetaId)}">${esc(x.receta)}</b>`, partes = [];
    if (r.desactualizadas.length) partes.push(`⚠ <b>Lista de materiales actualizada en SAP</b> en ${r.desactualizadas.length} receta(s): ${r.desactualizadas.map(cod).join(', ')}`);
    if (r.conRuta.length) partes.push(`⚠ <b>Hoja de ruta o puesto de trabajo distinto en SAP</b> en ${r.conRuta.length} receta(s): ${r.conRuta.map(cod).join(', ')}`);
    const html = partes.join('<br>');
    if (!a) { a = document.createElement('div'); a.className = 'rmd-receta-aviso'; if (antesDe) antesDe.insertAdjacentElement('beforebegin', a); else contenedor.prepend(a); }
    if (a.dataset.html !== html) { a.dataset.html = html; a.innerHTML = html; }
    a.title = 'Es solo un aviso: no impide autorizar. El detalle está en el ⚠ junto al código de la receta (o haz clic en el código aquí).';
    a.__rmdRes = r;
    if (!a.__rmdClic) { a.__rmdClic = true; a.addEventListener('click', (e) => { const b = e.target.closest('.rmd-receta-cod'); if (!b) return; e.stopPropagation(); const x = a.__rmdRes.recetas.find((y) => y.mdRecetaId === b.dataset.id); if (x) abrirDetalleRecetas(b, [x], true); }); }
  }
  // Detalle: tarjeta flotante junto al icono (o al botón del aviso), con una tabla por receta
  function detalleRecetaHtml(x) {
    let h = `<div class="rmd-rec-cab"><b>${esc(x.receta)}</b> <span>${esc(x.texto)}</span></div>`;
    if (x.dif.length) {
      const ult = x.ultima ? `<div class="rmd-rec-fechas">Último cambio de la lista en SAP: <b>${esc(fechaCorta(x.ultima.fecha))}</b> (n.º de cambio ${esc(x.ultima.cambio)})</div>` : '';
      h += `<div class="rmd-rec-sub">Lista de materiales · ${esc(resumenDif(x.dif))} <span class="rmd-nota">(${x.rmd} componentes en el RMD, ${x.sap} en SAP hoy)</span></div>${ult}
        <table class="rmd-rec-tabla"><thead><tr><th></th><th>Componente</th><th>Descripción</th><th>En el RMD</th><th>En SAP hoy</th><th title="Fecha «válido desde» del componente en SAP y su número de cambio">Cambio en SAP</th></tr></thead><tbody>${x.dif.map((d) => {
          const q = (v) => (v ? `${numTxt(v.q)} ${esc(v.u)}` : '—'), delta = d.tipo === 'cambia' && d.antes.u.toUpperCase() === d.ahora.u.toUpperCase() ? d.ahora.q - d.antes.q : null;
          const comp = d.tipo === 'reemplazo' ? `<span class="rmd-rec-antes">${esc(d.compAntes)}</span> → ${esc(d.comp)}` : esc(d.comp);
          const desc = d.tipo === 'reemplazo' ? `${esc(d.desc)}<br><span class="rmd-rec-antes">antes: ${esc(d.descAntes)}</span>` : esc(d.desc);
          const qa = d.tipo === 'reemplazo' && d.antes && d.ahora && Math.abs(d.antes.q - d.ahora.q) < 1e-6 && d.antes.u === d.ahora.u ? `${q(d.ahora)} <span class="rmd-nota">(igual)</span>` : q(d.ahora);
          return `<tr class="rmd-rec-${d.tipo}"><td><span class="rmd-rec-marca" title="${{ nuevo: 'Nuevo en SAP', cambia: 'Otra cantidad o unidad', quitado: 'Ya no está en SAP', reemplazo: 'Reemplazado por otra versión del material' }[d.tipo]}">${{ nuevo: '+', cambia: '≠', quitado: '−', reemplazo: '⇄' }[d.tipo]}</span></td><td>${comp}</td><td>${desc}</td><td>${q(d.antes)}</td><td>${qa}${delta ? ` <span class="rmd-rec-delta">(${delta > 0 ? '+' : ''}${numTxt(delta)})</span>` : ''}</td><td class="rmd-rec-cuando">${d.fecha ? `${esc(fechaCorta(d.fecha))}${d.cambio ? `<br><span class="rmd-nota">n.º ${esc(d.cambio)}</span>` : ''}` : `<span class="rmd-nota" title="${d.tipo === 'quitado' ? 'Ya no está en la lista de SAP: SAP no devuelve la fecha en que se quitó (mira el último cambio de la lista, arriba)' : 'Sin fecha en SAP'}">—</span>`}</td></tr>`; }).join('')}</tbody></table>`;
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

  // ---- "Adicionar Pasos": el mismo paso varias veces y en el orden que se quiera (v1.25; v1.29: panel "Pasos a agregar") ----
  // El Agregar del portal agrega, EN ORDEN, un paso por cada elemento del modelo aSeleccionadoPaso (la barra de etiquetas de arriba
  // de la tabla): basta con que un paso pueda estar varias veces. Tanto en el selector de pasos (frgAdicNewMdPasos) como en el de
  // procesos menores (frgAddPasoPM). v1.29: en lugar del "+" dentro de cada etiqueta y de arrastrarlas (poco visibles y frágiles),
  // un panel "Pasos a agregar" encima de la tabla, dibujado siempre desde ese modelo: una fila por paso con su cantidad (− n +),
  // subir / bajar y quitar; lo que se ve ahí es exactamente lo que se agrega y en ese orden. Marcar una fila de la tabla lo agrega
  // (cantidad 1); desmarcarla lo quita. El portal quitaba los repetidos al marcar otra fila: se conservan.
  const RUTA_SEL = 'aSeleccionadoPaso', TABLAS_SELECTOR = ['frgAdicNewMdPasos--idTblPaso', 'frgAddPasoPM--idTblPaso'];
  function modeloSel(c) { return c && c.getModel && c.getModel(RUTA_SEL); }
  function fijarSel(m, arr) { arr.forEach((x, i) => { x.pos = i + 1; }); m.setData(arr); m.refresh(true); }
  function parchearEvento(c, evento, hacer) {
    const reg = c && ((c.mEventRegistry || {})[evento] || [])[0]; if (!reg) return;
    if (!on('repetirpaso')) { if (reg.fFunction.__rmdOrig) reg.fFunction = reg.fFunction.__rmdOrig; return; }
    if (reg.fFunction.__rmdOrig) return;
    const orig = reg.fFunction, w = function () { return hacer.call(this, orig, arguments); }; w.__rmdOrig = orig; reg.fFunction = w;
  }
  // grupos consecutivos del mismo paso: [{ codigo, desc, n, items }]
  function gruposSel(arr) {
    const g = []; arr.forEach((x) => { const u = g[g.length - 1]; if (u && u.codigo === x.codigo) { u.n++; u.items.push(x); } else g.push({ codigo: x.codigo, desc: x.descripcion || '', n: 1, items: [x] }); });
    return g;
  }
  function pintarPanelPasos(d, tabla, m) {
    const arr = (m.getData() || []), grupos = gruposSel(arr);
    let p = d.querySelector('.rmd-sel-panel');
    const lista = tabla.getDomRef(); if (!lista) return;
    if (!p) {
      p = document.createElement('div'); p.className = 'rmd-sel-panel'; lista.insertAdjacentElement('beforebegin', p);
      ['pointerdown', 'mousedown', 'click', 'keydown'].forEach((ev) => p.addEventListener(ev, (e) => e.stopPropagation()));
      p.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-a]'); if (!b) return; e.preventDefault();
        const mm = p.__modelo, gs = gruposSel(mm.getData() || []), gi = +b.dataset.g, g = gs[gi]; if (!g) return;
        const a = b.dataset.a;
        if (a === 'mas') g.items.push(Object.assign({}, g.items[0]));
        else if (a === 'menos') { if (g.items.length > 1) g.items.pop(); else return; }
        else if (a === 'quitar') { gs.splice(gi, 1); desmarcarFila(p.__tabla, g.codigo, gs); }
        else if (a === 'subir' && gi > 0) gs.splice(gi - 1, 2, gs[gi], gs[gi - 1]);
        else if (a === 'bajar' && gi < gs.length - 1) gs.splice(gi, 2, gs[gi + 1], gs[gi]);
        if (a !== 'quitar' && !['mas', 'menos', 'subir', 'bajar'].includes(a)) return;
        fijarSel(mm, gs.flatMap((x) => x.items)); pintarPanelPasos(p.__d, p.__tabla, mm);
      });
      p.addEventListener('change', (e) => {
        const inp = e.target.closest('input[data-g]'); if (!inp) return;
        const mm = p.__modelo, gs = gruposSel(mm.getData() || []), g = gs[+inp.dataset.g]; if (!g) return;
        const n = Math.max(1, Math.min(50, parseInt(inp.value, 10) || 1));
        while (g.items.length < n) g.items.push(Object.assign({}, g.items[0])); g.items.length = n;
        fijarSel(mm, gs.flatMap((x) => x.items)); pintarPanelPasos(p.__d, p.__tabla, mm);
      });
    } else if (p.nextElementSibling !== lista) lista.insertAdjacentElement('beforebegin', p);
    p.__modelo = m; p.__tabla = tabla; p.__d = d;
    const firma = JSON.stringify(grupos.map((g) => [g.codigo, g.n]));
    if (p.dataset.firma === firma) return; p.dataset.firma = firma;
    p.hidden = !grupos.length;
    const total = arr.length;
    p.innerHTML = `<div class="rmd-sel-cab"><b>Pasos a agregar (${total})</b><span>Se agregan en este orden. Cambia la cantidad para repetir un paso; marca más filas en la tabla para sumar otros.</span></div>` +
      `<ol class="rmd-sel-lista">${grupos.map((g, gi) => `<li><span class="rmd-sel-pos">${grupos.slice(0, gi).reduce((a, x) => a + x.n, 0) + 1}${g.n > 1 ? '–' + (grupos.slice(0, gi).reduce((a, x) => a + x.n, 0) + g.n) : ''}</span>` +
        `<span class="rmd-sel-cod">${esc(g.codigo)}</span><span class="rmd-sel-desc" title="${esc(g.desc)}">${esc(g.desc)}</span>` +
        `<span class="rmd-sel-cant"><button type="button" data-a="menos" data-g="${gi}" title="Una vez menos" ${g.n <= 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="50" value="${g.n}" data-g="${gi}" aria-label="Veces que se agrega"><button type="button" data-a="mas" data-g="${gi}" title="Una vez más">+</button></span>` +
        `<span class="rmd-sel-mov"><button type="button" data-a="subir" data-g="${gi}" title="Subir" ${gi === 0 ? 'disabled' : ''}>↑</button><button type="button" data-a="bajar" data-g="${gi}" title="Bajar" ${gi === grupos.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-a="quitar" data-g="${gi}" title="Quitar de la lista" class="rmd-sel-quitar">×</button></span></li>`).join('')}</ol>`;
  }
  function desmarcarFila(tabla, codigo, quedan) {
    if (!tabla || quedan.some((g) => g.codigo === codigo)) return;
    const bi = tabla.getBindingInfo('items'), mod = bi && bi.model;
    tabla.getItems().forEach((it) => { const c = it.getBindingContext(mod), o = c && c.getObject(); if (o && o.codigo === codigo) it.setSelected(false); });
  }
  function gestionarSelectorPasos() {
    if (typeof sap === 'undefined') return;
    const core = sap.ui.getCore();
    const tabla = TABLAS_SELECTOR.map((id) => core.byId(id)).find((t) => t && t.getDomRef() && visible(t.getDomRef())); if (!tabla) return;
    const d = tabla.getDomRef().closest('.sapMDialog'); if (!d) return;
    if (tabla.getId() === TABLAS_SELECTOR[0]) d.classList.toggle('rmd-selector-ancho', on('ancho'));
    d.querySelectorAll('.rmd-nota-repetir, .rmd-token-mas').forEach((n) => n.remove());
    d.querySelectorAll('.sapMToken[draggable]').forEach((t) => { t.removeAttribute('draggable'); t.classList.remove('rmd-token-rep'); });
    const m = modeloSel(tabla); if (!m) return;
    const modTabla = (tabla.getBindingInfo('items') || {}).model;
    const mi = [...d.querySelectorAll('.sapMMultiInput')].map((x) => core.byId(x.id)).find((c) => c && c.getBindingInfo && (c.getBindingInfo('tokens') || {}).model === RUTA_SEL);
    // marcar / desmarcar filas: el portal deja un solo elemento por paso; aquí se conservan las copias y su orden
    parchearEvento(tabla, 'selectionChange', function (orig, args) {
      const mm = modeloSel(tabla), antes = ((mm && mm.getData()) || []).slice(), e = args[0];
      const it = e && e.getParameter && e.getParameter('listItem'), sel = it && it.getSelected(), ctx = it && it.getBindingContext(modTabla), o = ctx && ctx.getObject();
      const r = orig.apply(this, args); if (!mm) return r;
      const despues = mm.getData() || [];
      let lista;
      if (o && !sel) lista = antes.filter((x) => x.codigo !== o.codigo);
      else { const cods = new Set(despues.map((x) => x.codigo)), quedan = antes.filter((x) => cods.has(x.codigo)), ya = new Set(quedan.map((x) => x.codigo)); lista = quedan.concat(despues.filter((x) => !ya.has(x.codigo))); }
      if (lista.length !== despues.length || lista.some((x, i) => x !== despues[i])) fijarSel(mm, lista);
      return r;
    });
    // quitar una etiqueta (×) de la barra: se quita esa copia; la fila sigue marcada mientras quede otra
    if (mi) parchearEvento(mi, 'tokenUpdate', function (orig, args) {
      const e = args[0], quitados = ((e && e.getParameter && e.getParameter('removedTokens')) || []).map((t) => Number(t.getKey()));
      const r = orig.apply(this, args), mm = modeloSel(mi); if (!mm) return r;
      const arr = (mm.getData() || []).slice(), quedan = new Set(arr.map((x) => x.codigo));
      tabla.getItems().forEach((it) => { const c = it.getBindingContext(modTabla), ob = c && c.getObject(); if (ob && quitados.includes(ob.codigo) && quedan.has(ob.codigo)) it.setSelected(true); });
      fijarSel(mm, arr); return r;
    });
    if (!on('repetirpaso')) { d.querySelectorAll('.rmd-sel-panel').forEach((x) => x.remove()); return; }
    pintarPanelPasos(d, tabla, m);
  }
  window.__rmdStats.panelPasos = () => { const p = document.querySelector('.rmd-sel-panel'); return p && !p.hidden ? [...p.querySelectorAll('li')].map((li) => li.querySelector('.rmd-sel-cod').textContent + 'x' + li.querySelector('input').value) : []; };   // (pruebas)

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
  function nombreDe(u) {                                                 // { completo, corto: primer nombre + apellido paterno }
    const completo = norm([u.nombre, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ')) || norm(u.nombreMostrar || u.usuario || '');
    return { completo, corto: norm([String(u.nombre || '').trim().split(/\s+/)[0], u.apellidoPaterno].filter(Boolean).join(' ')) || completo };
  }
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
      const de = (tipo) => { const m = new Map(); ds.filter((x) => (x.tipo || '').startsWith(tipo)).forEach((x) => { const n = nombresUsuario.get(x.usuarioId_usuarioId); if (n && !m.has(n.completo)) m.set(n.completo, n); }); return [...m.values()]; };
      const jefe = de('DJEFPROD'), gerente = de('DGERPROD'), corto = on('columnas');   // (con "Columnas ordenadas": compacto, uno por línea)
      const linea = (et, ns, k) => (ns.length ? `${et}: ${ns.map((n) => n[k]).join(', ')}` : '');
      const texto = [linea('Jefe', jefe, corto ? 'corto' : 'completo'), linea('Gerente', gerente, corto ? 'corto' : 'completo')].filter(Boolean).join(corto ? '\n' : ' · ');
      const titulo = 'Enviado a revisión a: ' + [linea('Jefe', jefe, 'completo'), linea('Gerente', gerente, 'completo')].filter(Boolean).join(' · ');
      let s = td.querySelector('.rmd-revisor');
      if (!texto) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('span'); s.className = 'rmd-revisor'; td.appendChild(s); }
      if (s.textContent !== texto) s.textContent = texto;
      if (s.title !== titulo) s.title = titulo;
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
  // v1.30: una sola ventana que explica qué cambió y qué pasa con cada opción; la cuenta de 5 s va dentro (sin otra ventana)
  const CAMPOS_PASO = [['descripcion', 'Descripción'], ['tipoDatoId_iMaestraId', 'Tipo de dato'], ['valorInicial', 'Valor inicial'], ['valorFinal', 'Valor final'], ['margen', 'Margen'],
    ['decimales', 'Decimales'], ['numeracion', 'Numeración'], ['tipoLapsoId_motivoLapsoId', 'Lapso'], ['tipoCondicionId_iMaestraId', 'Condición']];
  function elegirEdicionPaso(info) {
    return new Promise((resolver) => {
      let reloj = null, hecho = false;
      const fin = (v) => { if (hecho) return; hecho = true; clearInterval(reloj); v0.cerrar(); resolver(v); };
      const v0 = ventana('¿Dónde aplicar este cambio?', { cancelar: () => fin(null) });
      const lista = (xs) => xs.slice(0, 15).map((x) => `${x.codigo} v${x.version} (${x.estado})`).join(', ') + (xs.length > 15 ? ` y ${xs.length - 15} más` : '');
      const otros = info.abiertos.length, bloq = info.bloquean.length;
      const cambios = info.cambios.filter((c) => c.clave !== 'descripcion').map((c) => c.nombre);
      const sobrescribible = !bloq && otros > 0;
      v0.cuerpo.innerHTML = `<div class="rmd-ep-cambio"><div><span>Paso ${esc(info.codigo)} antes</span><p>${esc(info.antes)}</p></div><div><span>Después</span><p>${esc(info.descripcion)}</p></div></div>
        ${cambios.length ? `<p class="rmd-nota">También cambia: ${esc(cambios.join(', '))}.</p>` : ''}
        <p>Este paso no es solo de este RMD: ${otros ? `también lo usan <b>${otros} RMD en proceso</b>` : ''}${otros && bloq ? ' y ' : ''}${bloq ? `<b>${bloq} RMD autorizados o suspendidos</b>` : ''}${!otros && !bloq ? 'ya existe otro paso con esta misma descripción' : ''}. Elige dónde aplicar el cambio:</p>
        <div class="rmd-ep-opciones">
          <button type="button" class="rmd-ep-op verde" data-v="nuevo"><b>Solo en este RMD</b> <em>recomendado</em>
            <span>${info.dup ? `Este RMD pasa a usar el paso que ya existe con esa descripción (<b>${esc(info.dup.codigo)}</b>): no se crea un duplicado.` : 'Se crea un paso nuevo (con otro código) solo para este RMD.'} Los demás RMD no cambian.</span></button>
          <button type="button" class="rmd-ep-op ambar" data-v="sobrescribir" ${sobrescribible ? '' : 'disabled'}><b>En este RMD y en ${otros} RMD más</b>
            <span>${bloq ? 'No disponible: el paso está en RMD autorizados o suspendidos y el portal no deja cambiarlo ahí.' : !otros ? 'No aplica: ningún otro RMD en proceso usa este paso.' : `Se cambia el paso ${esc(info.codigo)} para todos. El cambio se verá también en: ${esc(lista(info.abiertos))}. Después el portal pedirá su propia confirmación.`}</span></button>
        </div>
        ${bloq ? `<p class="rmd-nota">RMD autorizados o suspendidos que usan el paso: ${esc(lista(info.bloquean))}.</p>` : ''}
        <div class="rmd-ep-cuenta"><p></p><div class="rmd-ep-barra"><i></i></div></div>`;
      const opciones = v0.cuerpo.querySelector('.rmd-ep-opciones'), caja = v0.cuerpo.querySelector('.rmd-ep-cuenta'), txt = caja.querySelector('p'), barra = caja.querySelector('i');
      const ver = (el, v) => { el.style.display = v ? '' : 'none'; };
      const bCancelar = botonModal('Cancelar', '', () => fin(null)), bVolver = botonModal('Volver', '', () => { clearInterval(reloj); ver(caja, false); ver(opciones, true); ver(bVolver, false); ver(bAhora, false); ver(bCancelar, true); });
      let elegida = null; const bAhora = botonModal('Guardar ahora', 'primario', () => fin(elegida));
      ver(bVolver, false); ver(bAhora, false); ver(caja, false);
      opciones.addEventListener('click', (e) => {
        const b = e.target.closest('.rmd-ep-op'); if (!b || b.disabled) return;
        elegida = b.dataset.v; ver(opciones, false); ver(caja, true); ver(bCancelar, false); ver(bVolver, true); ver(bAhora, true);
        const que = elegida === 'nuevo' ? (info.dup ? `Este RMD usará el paso ${info.dup.codigo}; los demás no cambian.` : 'Se creará un paso nuevo solo para este RMD; los demás no cambian.') : `Se cambiará el paso ${info.codigo} en este RMD y en ${otros} RMD más.`;
        let n = 5; const pinta = () => { setTxt(txt, `${que} Se guarda en ${n} s… (pulsa "Volver" para elegir otra opción)`); barra.style.width = `${(5 - n) * 20}%`; };
        pinta(); clearInterval(reloj); reloj = setInterval(() => { n--; if (n <= 0) { barra.style.width = '100%'; fin(elegida); } else pinta(); }, 1000);
      });
      v0.pie.append(bCancelar, bVolver, bAhora);
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
  // al abrir "Editar Paso": aviso arriba si el paso también está en otros RMD (así la pregunta al Grabar no sorprende)
  function avisoUsoAlAbrir(d, bG) {
    const b = controladorPrincipal(); if (!b) return;
    const comp = bG.data && bG.data('component'), lm = b.getView().getModel('localModel');
    const dd = lm.getProperty(comp === 'pasoPadre' ? '/pasoPadreSeleccionado' : '/pasoHijoSeleccionado'); if (!dd || !dd.pasoId) return;
    if (d.__rmdUsoPaso === dd.pasoId) return; d.__rmdUsoPaso = dd.pasoId;
    const md = b.getView().getModel('asociarDatos').getData();
    usoDelPaso(b.getView().getModel('mainModelv2'), dd.pasoId, md.mdId).then((u) => {
      if (!d.isConnected || d.__rmdUsoPaso !== dd.pasoId) return;
      d.querySelectorAll('.rmd-ep-aviso').forEach((x) => x.remove());
      const otros = u.abiertos.length, bloq = u.bloquean.length; if (!otros && !bloq) return;
      const a = document.createElement('div'); a.className = 'rmd-ep-aviso';
      a.innerHTML = `ℹ Este paso también lo usan ${otros ? `<b>${otros} RMD en proceso</b>` : ''}${otros && bloq ? ' y ' : ''}${bloq ? `<b>${bloq} RMD autorizados o suspendidos</b>` : ''}. Al pulsar <b>Grabar</b> podrás elegir si el cambio es <b>solo para este RMD</b> o para todos.`;
      a.title = [...u.abiertos, ...u.bloquean].slice(0, 30).map((x) => `${x.codigo} v${x.version} (${x.estado})`).join('\n');
      const sec = d.querySelector('.sapMDialogSection'); if (sec) sec.prepend(a);
    }, () => {});
  }
  function gestionarEdicionPasos() {
    const d = dialogos().find((x) => /^Editar Paso/i.test(cabecera(x))); if (!d || typeof sap === 'undefined') return;
    const bG = [...d.querySelectorAll('button')].map((x) => sap.ui.getCore().byId(x.id.replace(/-inner$/, ''))).find((x) => x && x.getText && x.getText() === 'Grabar');
    const reg = bG && ((bG.mEventRegistry || {}).press || [])[0], M = reg && reg.oListener;
    if (!M || typeof M.onGrabarPasoPadre !== 'function' || (reg.fFunction !== M.onGrabarPasoPadre && !reg.fFunction.__rmdGrabar)) return;   // solo el Grabar del editor del RMD
    if (!on('editarpaso')) { if (reg.fFunction.__rmdGrabar) reg.fFunction = reg.fFunction.__rmdGrabar; return; }
    avisoUsoAlAbrir(d, bG);
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
        const cambios = CAMPOS_PASO.filter(([k]) => String((nn || {})[k] == null ? '' : nn[k]) !== String(dd[k] == null ? '' : dd[k])).map(([clave, nombre]) => ({ clave, nombre }));
        const eleccion = await elegirEdicionPaso({ codigo: (nn && nn.codigo) || dd.codigo, antes: norm((nn || {}).descripcion), descripcion: norm(dd.descripcion), cambios, enEste: uso.enEste, abiertos: uso.abiertos, bloquean: uso.bloquean, dup: hayDup });
        if (!eleccion) return undefined;
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
      lista && on('buscarequipo') && ['Filtrar por equipo', 'Ir a la tarjeta "Equipo" de la barra de filtros', () => enfocarFiltroEquipo()],
      lista && on('buscarequipo') && ['Buscar por equipo (detalle y Excel)', 'Qué master tienen un equipo, con su etapa, área y planta', () => abrirBuscarPorEquipo()],
      lista && on('suspension') && ['Modificaciones masivas', 'Suspender varios master o agregarles una observación', () => abrirModificacionesMasivas('suspender')],
      lista && on('suspension') && ['Observación masiva', 'Agregar una línea a las Observaciones de varios master', () => abrirModificacionesMasivas('observacion')],
      lista && on('exportar') && ['Exportar…', 'Exportado original, Equipos por master, Indicadores, Documentos citados', () => { const b = botonExportar(); const c = b && sap.ui.getCore().byId(b.id.replace(/-inner$/, '')); if (c) c.firePress(); }],
      lista && on('equipos') && ['Equipos por master', 'Excel de todos los master con sus equipos', () => abrirEquiposPorMaster()],
      lista && on('indicadores') && ['Indicadores del mes', 'BD RMD del mes con sus tablas dinámicas', () => abrirIndicadores()],
      lista && on('citastodos') && ['Documentos citados en todos los master', 'Qué master citan cada documento', () => abrirCitasDeTodos()],
      lista && on('plantillaprod') && ['Plantilla para Producción', 'Generar el archivo para que Producción deje su borrador de cambios a un RMD', () => abrirPlantillaProduccion()],
      lista && on('plantillaprod') && ['Importar borrador de Producción', 'Abrir el borrador que devolvió Producción y ver su plan de ingreso (solo en un RMD Ingresado)', () => elegirBorrador()],
      lista && on('cambiosrecetas') && ['Cambios de recetas en SAP', 'RMD Ingresados y Autorizados cuya receta cambió en SAP', () => abrirCambiosRecetas()],
      lista && on('statusrmd') && document.querySelector('.rmd-status-rmd') && ['Enviar a Status RMD', 'Maestro completo a Status RMD', clic('.rmd-status-rmd')],
      on('reglasrev') && ['Reglas de revisión', 'Crear o activar reglas, exportarlas / importarlas y cargar las listas', () => abrirReglas()],
      on('reglasrev') && ['Equipos calificados', 'Cargar o consultar la lista de equipos calificados (registro OQ / PQ)', () => abrirReglas('calificados')],
      ['Mejoras de interfaz', 'Activar o desactivar funciones del script', () => { const p = document.getElementById('rmd-ui-panel'); if (p) p.open = true; }],
    ].filter(Boolean);
  }
  // Con una ventana de SAP abierta, UI5 (Popup modal) devuelve el foco a esa ventana si pasa a un elemento ajeno: la paleta, los
  // avisos propios, el panel y el menú Exportar se declaran "contenido externo" de sus popups para poder escribir y usar el teclado ahí.
  let externosUI5 = false;
  function registrarExternosUI5() {
    if (externosUI5 || typeof sap === 'undefined') return;
    try { const P = sap.ui.require('sap/ui/core/Popup'); if (P && P.addExternalContent) { P.addExternalContent(['.rmd-paleta-fondo', '.rmd-modal-fondo', '#rmd-ui-panel', '.rmd-menu', '.rmd-saludo', '.rmd-rec-detalle', '.rmd-creado'], true); externosUI5 = true; } } catch (e) { /* versión de UI5 sin esta función */ }
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
  const abrevEtapa = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);   // FABRICACION → FAB
  let rmdAbiertoId = null, tituloOriginal = null, tituloPuesto = null;
  function gestionarRmdAbierto() {
    const raiz = dialogos().find((x) => /^\d{6,}\s*-/.test(cabecera(x)) || /^Asociar F[oó]rmula/i.test(cabecera(x)));
    const ctrl = raiz && controladorPrincipal(), md = ctrl && ctrl.getView().getModel('asociarDatos') && ctrl.getView().getModel('asociarDatos').getData();
    let doc = null; try { doc = window.top.document; } catch (e) { doc = document; }
    if (md && md.mdId && md.codigo) {
      if (rmdAbiertoId !== md.mdId) { rmdAbiertoId = md.mdId; if (on('paleta') || on('saludo')) anotarReciente(md); }
      if (on('titulo')) {
        if (norm(doc.title) !== tituloPuesto) tituloOriginal = doc.title;                 // el título del portal (o el que puso el launchpad después)
        const t = norm(`${abrevEtapa(md.nivelTxt) || md.codigo} - ${String(md.descripcion || '').slice(0, 45)} — ${tituloOriginal}`);   // FAB / ENV / ACO / INS / REC - descripción (el navegador junta los espacios)
        if (norm(doc.title) !== t) doc.title = t;
        tituloPuesto = t; return;
      }
    } else rmdAbiertoId = null;
    if (tituloPuesto && norm(doc.title) === tituloPuesto && tituloOriginal != null) doc.title = tituloOriginal;   // RMD cerrado u opción apagada: título del portal
    tituloPuesto = null;
  }
  window.__rmdStats.productividad = { leerRecientes, primerNombre, codigoUsuario: () => codigoUsuario(controladorPrincipal()), misRmd: () => misRmd(controladorPrincipal()), resumen: () => resumenPersonal(controladorPrincipal()), abrirPaleta, abrirRmdPorCodigo, saludoDelMomento,
    saludar: () => { saludoHecho = false; try { localStorage.removeItem(CLAVE_SALUDO); } catch (e) { /* sin almacenamiento */ } document.querySelectorAll('.rmd-saludo').forEach((x) => x.remove()); gestionarSaludo(); } };   // (pruebas)
  // ---- Filtro "Equipo" en la barra de filtros de la lista principal (v1.28; reemplaza al botón "Buscar por equipo") ----
  // Es una tarjeta más del FilterBar del portal (FilterGroupItem, como Código RMD o Planta): se escribe el código o el nombre de un
  // equipo, instrumento, utensilio o agrupador (con sugerencias del catálogo) y "Ir" muestra solo los master que lo tienen, junto con
  // los demás filtros. Cómo: la lista la lee el portal con onGetMd(filtros) de 100 en 100; con el filtro activo se hace la MISMA lectura
  // (mismos filtros, mismo $expand y orden) añadiendo los mdId de los master con ese equipo, en bloques de 30 (la URL no debe crecer),
  // y se devuelve todo de una vez. "Restablecer" lo vacía. También: "Código Agrupador" pasa a "Agrupador" y las tarjetas se estrechan
  // para que entren todas en una fila.
  const EXPAND_LISTA_MD = 'estadoIdRmd,estadoIdProceso,sucursalId,motivoId,destinatariosMD/usuarioId,aStatusProceso/estadoIdProceso,aStatusProceso/mdId,aReceta/recetaId,aTrazabilidad/estadoTrazab';
  const filtroEquipo = { item: null, input: null, ids: null, texto: '', resumen: '' };
  function barraFiltrosPrincipal() {
    const lab = [...document.querySelectorAll('.sapUiCompFilterBar label, .sapUiCompFilterBar .sapMLabel')].find((l) => !l.closest('.sapMDialog') && /^Codigo RMD/i.test(norm(l.textContent)));
    const fbDom = lab && lab.closest('.sapUiCompFilterBar'); return fbDom ? sap.ui.getCore().byId(fbDom.id) : null;
  }
  // lo escrito en la tarjeta (el valor del control de UI5 solo se actualiza al salir del campo o con Enter)
  const valorEquipo = () => { const i = filtroEquipo.input; if (!i) return ''; const d = i.getDomRef('inner'), v = norm(d ? d.value : i.getValue()); if (v !== i.getValue()) i.setValue(v); return v; };
  async function prepararFiltroEquipo(modelo) {
    const texto = valorEquipo();
    if (!texto) { filtroEquipo.ids = null; filtroEquipo.texto = ''; filtroEquipo.resumen = ''; return; }
    if (texto === filtroEquipo.texto && filtroEquipo.ids) return;       // misma búsqueda: se reutiliza
    const pasos = window.__rmdStats.filtroEquipoPasos = ['catálogo ' + Date.now()];
    const cat = await cargarCatalogoEquipos(modelo), q = SIN_ACENTOS(texto.replace(/\s+·\s+.*$/, '')).trim(), palabras = q.split(/\s+/);
    pasos.push('catálogo listo ' + cat.length);
    const exacto = cat.filter((x) => SIN_ACENTOS(x.codigo) === q);
    const coinciden = exacto.length ? exacto : cat.filter((x) => { const t = SIN_ACENTOS(x.codigo + ' ' + x.desc + ' ' + x.extra); return palabras.every((w) => t.includes(w)); });
    const items = coinciden.slice(0, MAX_EQUIPOS_BUSQUEDA), filas = items.length ? await mastersConEquipos(modelo, items) : [];
    filtroEquipo.ids = [...new Set(filas.map((x) => x.md.mdId).filter(Boolean))]; filtroEquipo.texto = texto; pasos.push('master ' + filtroEquipo.ids.length);
    filtroEquipo.resumen = !coinciden.length ? `Ningún equipo, utensilio o agrupador coincide con "${texto}".`
      : `Equipo "${texto}": ${items.length} coincidencia(s)${coinciden.length > items.length ? ` (de ${coinciden.length}; afina la búsqueda)` : ''} en ${filtroEquipo.ids.length} master.`;
  }
  async function leerListaConEquipo(ctrl, filtros, ocupado_) {
    const modelo = ctrl.getView().getModel('mainModelv2'), F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, ids = filtroEquipo.ids || [];
    if (!filtros || !filtros.length) return { results: [] };            // "Growing" (más filas): ya se trajo todo de una vez
    if (ocupado_) sap.ui.core.BusyIndicator.show(0);
    try {
      const partes = []; for (let i = 0; i < ids.length; i += 30) partes.push(ids.slice(i, i + 30));
      const res = (await Promise.all(partes.map((p) => new Promise((ok, mal) => modelo.read('/MD', {
        filters: filtros.concat([new F({ filters: p.map((id) => new F('mdId', 'EQ', id)), and: false })]),
        urlParameters: { $expand: EXPAND_LISTA_MD, $top: '1000', $orderby: 'fechaRegistro desc' }, success: (d) => ok((d && d.results) || []), error: mal,
      }))))).flat();
      res.sort((a, b) => b.codigo - a.codigo || b.version - a.version);
      (window.__rmdStats.filtroEquipoPasos || []).push('lista ' + res.length);
      return { results: res };
    } finally { if (ocupado_) sap.ui.core.BusyIndicator.hide(); }
  }
  function gestionarFiltroEquipo() {
    if (typeof sap === 'undefined') return;
    const ctrl = controladorPrincipal(), fb = ctrl && barraFiltrosPrincipal(); if (!fb || !fb.getFilterGroupItems) return;
    const items = fb.getFilterGroupItems();
    compactarBarraFiltros(fb, items);
    if (!on('buscarequipo')) {
      if (filtroEquipo.item) { fb.removeFilterGroupItem(filtroEquipo.item); filtroEquipo.item.destroy(); filtroEquipo.item = filtroEquipo.input = null; filtroEquipo.ids = null; }
      return;
    }
    if (!filtroEquipo.item || filtroEquipo.item.bIsDestroyed || !items.includes(filtroEquipo.item)) {
      const FGI = sap.ui.require('sap/ui/comp/filterbar/FilterGroupItem'), Input = sap.ui.require('sap/m/Input'), ListItem = sap.ui.require('sap/ui/core/ListItem');
      if (!FGI || !Input || !ListItem) return;
      const inp = new Input({ placeholder: 'Código o nombre', showSuggestion: true, filterSuggests: false, width: '100%', tooltip: 'Equipo, instrumento, material, utensilio o agrupador: código o parte del nombre. "Ir" muestra solo los master que lo tienen (con los demás filtros).' });
      let pedido = 0;
      inp.attachSuggest((e) => {
        const q = SIN_ACENTOS(e.getParameter('suggestValue') || '').trim(), n = ++pedido; if (q.length < 2) return;
        cargarCatalogoEquipos((controladorPrincipal() || ctrl).getView().getModel('mainModelv2')).then((cat) => {
          if (n !== pedido) return; const palabras = q.split(/\s+/);
          const c = cat.filter((x) => { const t = SIN_ACENTOS(x.codigo + ' ' + x.desc + ' ' + x.extra); return palabras.every((w) => t.includes(w)); }).slice(0, 15);
          inp.destroySuggestionItems(); c.forEach((x) => inp.addSuggestionItem(new ListItem({ key: x.codigo || x.desc, text: x.codigo ? `${x.codigo} · ${x.desc}` : x.desc, additionalText: x.tipo.toLowerCase() })));
        }, () => {});
      });
      inp.attachSuggestionItemSelected((e) => { const it = e.getParameter('selectedItem'); if (it) inp.setValue(it.getKey()); });
      const it = new FGI({ groupName: 'MANGROUP', name: 'RMDEQUIPO', label: 'Equipo', labelTooltip: 'Master que tienen este equipo, instrumento, material, utensilio o agrupador', visibleInFilterBar: true, control: inp });
      fb.addFilterGroupItem(it);                                          // (insertFilterGroupItem no la dibuja: el FilterBar solo actualiza su barra con add)
      filtroEquipo.item = it; filtroEquipo.input = inp;
    }
    // "Ir": antes de la búsqueda del portal se calculan los master con el equipo; la lectura de la lista los incluye (onGetMd)
    const regS = ((fb.mEventRegistry || {}).search || [])[0];
    if (regS && !regS.fFunction.__rmdEquipo) {
      const orig = regS.fFunction;
      const w = async function (e) {
        const modelo = (controladorPrincipal() || ctrl).getView().getModel('mainModelv2');   // el modelo vigente (el portal lo reemplaza al arrancar)
        const yo = this, fuente = e && e.getSource && e.getSource(), ev = { sId: 'search', getSource: () => fuente, getParameter: () => undefined, getParameters: () => ({}) };
        window.__rmdStats.filtroEquipoInicio = Date.now();   // (pruebas)
        if (valorEquipo()) {
          sap.ui.core.BusyIndicator.show(0);
          try { await prepararFiltroEquipo(modelo); } catch (err) { filtroEquipo.ids = null; toast('No se pudo filtrar por equipo: ' + err.message, true); } finally { sap.ui.core.BusyIndicator.hide(); }
        } else await prepararFiltroEquipo(modelo);
        const r = await orig.call(yo, ev);
        window.__rmdStats.filtroEquipo = { texto: filtroEquipo.texto, masters: filtroEquipo.ids ? filtroEquipo.ids.length : null, t: Date.now() };   // (pruebas)
        if (filtroEquipo.ids) toast(filtroEquipo.resumen + ' La lista muestra los que cumplen también los demás filtros.', !filtroEquipo.ids.length);
        return r;
      };
      w.__rmdEquipo = orig; regS.fFunction = w;
    }
    const regR = ((fb.mEventRegistry || {}).reset || [])[0];
    if (regR && !regR.fFunction.__rmdEquipo) {
      const orig = regR.fFunction; const w = function () { if (filtroEquipo.input) filtroEquipo.input.setValue(''); filtroEquipo.ids = null; filtroEquipo.texto = ''; return orig.apply(this, arguments); };
      w.__rmdEquipo = orig; regR.fFunction = w;
    }
    if (!ctrl.__rmdOnGetMd && typeof ctrl.onGetMd === 'function') {
      const orig = ctrl.onGetMd; ctrl.__rmdOnGetMd = orig;
      ctrl.onGetMd = function (filtros, formula, valor, ocupado_) { return filtroEquipo.ids ? leerListaConEquipo(ctrl, filtros, ocupado_) : orig.apply(this, arguments); };
    }
  }
  // "Código Agrupador" → "Agrupador", "Restablecer" → ⟳ rojo (se usa poco) y tarjetas más estrechas para que entren todas en una fila
  function compactarBarraFiltros(fb, items) {
    const agr = items.find((x) => x.getName() === 'D'), dom = fb.getDomRef(), layout = dom && sap.ui.getCore().byId((dom.querySelector('.sapUiAFLayout') || {}).id);
    const rest = dom && [...dom.querySelectorAll('button')].map((b) => sap.ui.getCore().byId(b.id.replace(/-(inner|img)$/, ''))).find((c) => c && c.getText && (c.getText() === 'Restablecer' || c.__rmdRestablecer));
    if (!on('barrafiltros')) {
      if (agr && agr.getLabel() === 'Agrupador') agr.setLabel('Código Agrupador');
      if (layout && layout.__rmdAncho) { layout.setMinItemWidth(layout.__rmdAncho); delete layout.__rmdAncho; }
      if (rest && rest.__rmdRestablecer) { rest.setText('Restablecer'); rest.setIcon(''); rest.setTooltip(''); rest.removeStyleClass('rmd-restablecer-ui5'); delete rest.__rmdRestablecer; }
      return;
    }
    if (agr && agr.getLabel() === 'Código Agrupador') { agr.setLabel('Agrupador'); if (agr.getControl().setPlaceholder) agr.getControl().setPlaceholder('Agrupador'); }
    if (layout && layout.setMinItemWidth && !layout.__rmdAncho) { layout.__rmdAncho = layout.getMinItemWidth(); layout.setMinItemWidth('9rem'); }
    if (rest && !rest.__rmdRestablecer) { rest.__rmdRestablecer = true; rest.setText(''); rest.setIcon('sap-icon://refresh'); rest.setTooltip('Restablecer los filtros'); rest.addStyleClass('rmd-restablecer-ui5'); }
  }
  function enfocarFiltroEquipo() {
    if (!filtroEquipo.input || !filtroEquipo.input.getDomRef()) { toast('Activa "Filtro Equipo" en el panel de mejoras y abre la lista principal.', true); return; }
    filtroEquipo.input.focus();
  }
  // ---- Lista principal: columna "Fase" y columnas a medida (v1.35) ----
  // "Fase" sale de la nomenclatura de la 1ª línea de Observaciones (…-F1, -F1R, -F2-R: Fase 1, Fase 1 R, Fase 2 R). Se agrega como última
  // columna (y su celda como última celda de cada fila y de la plantilla), así las celdas del portal no cambian de posición, y se dibuja en
  // su lugar con el orden de dibujo de UI5 (Column.setOrder). Con "Columnas ordenadas": un orden más claro (lo que es el RMD, su estado y
  // fase, la producción, la autorización) y anchos según el ancho de la pantalla; la Descripción toma lo que sobra. Antes todas las
  // columnas medían lo mismo (~150 px) y la Descripción, estrecha, ocupaba 3 líneas. "Etapa" sigue en una línea ("ACONDICIONADO" completo).
  const ORDEN_LISTA = ['Código', 'Versión', 'Descripción', 'Producción Estado', 'Producción Enviar', 'Producción Estatus', 'Etapa', 'Estado', 'Fase', 'Fecha Autorización', 'Usuario Autorización', 'A/F', 'Planta', 'Accion'];
  // ancho preferido en px; el mínimo se mide (la palabra más larga del encabezado y de las celdas visibles, sin partirla, + el relleno)
  const ANCHOS_LISTA = { 'Código': 110, 'Versión': 70, 'Etapa': 130, 'Estado': 100, 'Fase': 80, 'Producción Estado': 120, 'Producción Enviar': 96,
    'Producción Estatus': 200, 'Fecha Autorización': 150, 'Usuario Autorización': 124, 'A/F': 50, 'Planta': 110 };
  const CENTRADAS_LISTA = ['Versión', 'Fase', 'Producción Enviar', 'A/F'], MIN_DESCRIPCION = 240, ANCHO_COMPACTO = 1750;
  const esCeldaFase = (c) => !!(c && c.data && c.data('rmdFase'));
  function celdaFase() {
    const T = sap.ui.require('sap/m/Text') || sap.m.Text;
    const t = new T({ wrapping: false, text: { path: 'listMD>observacion', formatter: (o) => Reglas.faseDeObservacion(o).texto },
      tooltip: { path: 'listMD>observacion', formatter: (o) => { const f = Reglas.faseDeObservacion(o); return f.texto ? `${f.texto} · 1ª línea de Observaciones: ${f.linea}` : 'Sin fase en la 1ª línea de Observaciones'; } } });
    t.data('rmdFase', '1'); return t;
  }
  function gestionarColumnasLista() {
    const ctrl = controladorPrincipal(), t = ctrl && ctrl.getView().byId('idTblConfigurationRmd'); if (!t || !t.getColumns || !t.getDomRef()) return;
    const texto = (c) => { const h = c.getHeader && c.getHeader(); return h && h.getText ? h.getText() : ''; };
    let reordenar = false;
    // 1. columna Fase (al final de las columnas y de las celdas)
    let colFase = t.getColumns().find((c) => c.data && c.data('rmdFase'));
    if (on('fase')) {
      if (!colFase) {
        const Col = sap.ui.require('sap/m/Column') || sap.m.Column, T = sap.ui.require('sap/m/Text') || sap.m.Text;
        colFase = new Col({ header: new T({ text: 'Fase', wrapping: false, tooltip: 'Fase de la nomenclatura de la 1ª línea de Observaciones (F1 = Fase 1, F1R = Fase 1 R…)' }), width: '76px', hAlign: 'Center', minScreenWidth: 'Tablet', demandPopin: true });
        colFase.data('rmdFase', '1'); t.addColumn(colFase); reordenar = true;
      }
      const tpl = (t.getBindingInfo('items') || {}).template;
      if (tpl && tpl.getCells && !tpl.getCells().some(esCeldaFase)) tpl.addCell(celdaFase());
      t.getItems().forEach((it) => { if (it.getCells && !it.getCells().some(esCeldaFase)) it.addCell(celdaFase()); });
    } else if (colFase) {
      const quitar = (x) => { if (x && x.getCells) x.getCells().filter(esCeldaFase).forEach((c) => { x.removeCell(c); c.destroy(); }); };
      t.removeColumn(colFase); colFase.destroy(); colFase = null; reordenar = true;
      quitar((t.getBindingInfo('items') || {}).template); t.getItems().forEach(quitar);
    }
    const cols = t.getColumns(), iEstado = cols.findIndex((c) => texto(c) === 'Estado');
    // 2. orden de dibujo (sin "Columnas ordenadas": el del portal, con Fase tras Estado)
    cols.forEach((c, i) => {
      const k = ORDEN_LISTA.indexOf(texto(c));
      const o = on('columnas') ? (k >= 0 ? k : 100 + i) : c === colFase ? iEstado + 0.5 : i;
      if (c.getOrder() !== o) { c.setOrder(o); reordenar = true; }
    });
    // 3. anchos y alineación
    const porNombre = new Map(cols.map((c) => [texto(c), c])), dom = t.getDomRef();
    if (!on('columnas')) {
      cols.forEach((c) => { if (c.__rmdOrig) { if (c.getWidth() !== c.__rmdOrig.width) c.setWidth(c.__rmdOrig.width); if (c.getHAlign() !== c.__rmdOrig.hAlign) c.setHAlign(c.__rmdOrig.hAlign); delete c.__rmdOrig; } });
      if (t.hasStyleClass('rmd-lista-compacta')) t.removeStyleClass('rmd-lista-compacta');
      delete t.__rmdAnchosFirma;
    } else {
      const W = (dom.clientWidth || 0) - 50;                                  // (menos la selección y la flecha de cada fila)
      if (W >= 600) {
        const compacta = W < ANCHO_COMPACTO;                                  // pantallas estrechas: menos relleno y encabezados más pequeños
        if (t.hasStyleClass('rmd-lista-compacta') !== compacta) t.toggleStyleClass('rmd-lista-compacta', compacta);
        const its = t.getItems(), o0 = its[0] && its[0].getBindingContext('listMD'), o1 = its.length && its[its.length - 1].getBindingContext('listMD');
        const firma = [W, compacta, its.length, o0 && o0.getObject().codigo, o1 && o1.getObject().codigo, dom.querySelectorAll('.rmd-revisor').length, on('fase')].join('|');
        if (t.__rmdAnchosFirma !== firma) {
          t.__rmdAnchosFirma = firma;
          const tabla = dom.querySelector('table'), ths = tabla ? [...tabla.querySelectorAll('thead th')] : [], filas = tabla ? [...tabla.querySelectorAll('tbody tr')].filter((tr) => !/SubRow|NoData/.test(tr.className)).slice(0, 60) : [];
          const caja = (el) => { if (!el) return { pad: 0, bb: false }; const cs = getComputedStyle(el), px = (v) => parseFloat(v) || 0;
            return { pad: px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth), bb: cs.boxSizing === 'border-box' }; };
          // El ancho de la columna se pone en su encabezado (th). Con content-box, el relleno del th va aparte; la celda (td) tiene su propio
          // relleno, que no es el del th: sin modo compacto el th no tiene relleno y la celda 8 + 8 px (16 + 8 la primera columna), así que el
          // texto de la celda tiene 16 px menos que el encabezado ("ACONDICIONADO" se partía a 1728 px). El texto del encabezado va además
          // dentro de un contenedor (.sapMColumnHeader) con su propio relleno.
          // Por columna: el mínimo (ninguna palabra partida), el de "una línea" (cada celda en una sola línea; el encabezado sí puede ocupar
          // dos) y el preferido (ANCHOS_LISTA). Los botones de la celda (iconos) también cuentan.
          const minimos = {}, unaLinea = {}, rellenos = {}; let descMaxLinea = 0;
          ths.forEach((th, i) => {
            const n = norm(th.textContent); if (!ANCHOS_LISTA[n] && n !== 'Descripción') return;
            const hdr = th.querySelector('.sapMColumnHeader'), cab = th.querySelector('.sapMColumnHeader .sapMText, .sapMText, .sapMLabel') || th;
            const cTh = caja(th), fuera = cTh.bb ? 0 : cTh.pad, dentro = cTh.bb ? cTh.pad : 0, tdPad = caja(filas[0] && filas[0].children[i]).pad;
            const mH = Math.max(...n.split(' ').map((w) => anchoTexto(cab, w))) + (hdr ? caja(hdr).pad : 0) + dentro;
            let mC = 0, lC = 0; const lineas = [];
            filas.forEach((tr) => {
              const td = tr.children[i]; if (!td) return;
              td.querySelectorAll('.sapMText, .sapMObjStatusText, .sapMLabel, .rmd-revisor').forEach((el) => {
                const txt = norm(el.textContent); if (!txt) return;
                const palabras = n === 'Fase' ? [txt] : txt.split(' ');           // (Fase no se parte: "Fase 2 R" en una línea)
                palabras.forEach((w) => { mC = Math.max(mC, anchoTexto(el, w)); });
                if (!el.classList.contains('rmd-revisor')) { const w = anchoTexto(el, txt); lineas.push(w); lC = Math.max(lC, w); return; }
                const bt = td.querySelector('.sapMBtn'), antes = bt ? bt.getBoundingClientRect().width + 6 : 0;   // (revisores: uno por línea, junto al icono)
                el.textContent.split('\n').forEach((l) => { lC = Math.max(lC, antes + anchoTexto(el, norm(l))); });
              });
              td.querySelectorAll('.sapMBtn').forEach((b) => { const w = b.getBoundingClientRect().width; mC = Math.max(mC, w); lC = Math.max(lC, w); });
              td.querySelectorAll('.sapMHBox').forEach((hb) => { const w = [...hb.children].reduce((s, x) => s + x.getBoundingClientRect().width, 0); mC = Math.max(mC, w); lC = Math.max(lC, w); });
            });
            if (n === 'Descripción' && lineas.length) descMaxLinea = Math.max(...lineas);
            if (n === 'Descripción' && lineas.length) lC = lineas.sort((a, b) => a - b)[Math.floor((lineas.length - 1) * 0.9)];   // (9 de cada 10 en una línea: las más largas pueden ocupar dos)
            minimos[n] = Math.ceil(Math.max(mH, mC ? mC + tdPad - fuera : 0) + 6);
            unaLinea[n] = Math.max(minimos[n], Math.ceil((lC ? lC + tdPad - fuera : 0) + 6)); rellenos[n] = Math.ceil(fuera);
          });
          const presentes = Object.keys(ANCHOS_LISTA).filter((k) => porNombre.has(k) && porNombre.get(k).getVisible() && minimos[k]);
          const thAccion = ths.find((th) => norm(th.textContent) === 'Accion'), aW = thAccion ? Math.ceil(thAccion.getBoundingClientRect().width) : 0;
          const mn = (k) => minimos[k], ul = (k) => unaLinea[k], id = (k) => Math.max(ANCHOS_LISTA[k] - rellenos[k], ul(k));
          // la Descripción se guarda lo que ocupan en una línea 9 de cada 10 de sus textos, hasta la cuarta parte (y nunca menos de 240 px)
          const reservaDesc = Math.max(MIN_DESCRIPCION, Math.min(Math.round(W * 0.25), (unaLinea['Descripción'] || Infinity) + (rellenos['Descripción'] || 0)));
          const libre = W - reservaDesc;
          // Reparto: todas al mínimo; con lo que sobra, primero las celdas en una línea, porque una celda en varias líneas hace más alta toda
          // la fila: antes Producción Estatus (el icono y los revisores, la celda más alta), luego las más baratas ("PLANTA ATE", la fecha
          // con su hora…); después, hacia los anchos preferidos. La Descripción se queda con el resto.
          const ancho = Object.fromEntries(presentes.map((k) => [k, mn(k)])), primero = (k) => (k === 'Producción Estatus' ? 0 : 1);
          let sobra = libre - aW - presentes.reduce((x, k) => x + mn(k) + rellenos[k], 0), f = 0;
          if (sobra > 0) {
            presentes.filter((k) => ul(k) > mn(k)).sort((a, b) => primero(a) - primero(b) || (ul(a) - mn(a)) - (ul(b) - mn(b))).forEach((k) => { if (ul(k) - mn(k) <= sobra) { sobra -= ul(k) - mn(k); ancho[k] = ul(k); } });
            const falta = presentes.reduce((x, k) => x + id(k) - ancho[k], 0);
            f = falta > 0 ? Math.min(1, sobra / falta) : 1;
            presentes.forEach((k) => { ancho[k] = Math.round(ancho[k] + (id(k) - ancho[k]) * f); });
          }
          // Pantallas anchas (zoom del navegador al 70–90 %): la Descripción se queda con lo que ocupan sus textos (+15 %) y el resto del espacio
          // se reparte entre las demás columnas, hasta 1,8 veces su ancho preferido, para que la tabla no se vea vacía.
          const descIdeal = Math.min(Math.round(W * 0.45), Math.max(MIN_DESCRIPCION, Math.ceil((Math.max(descMaxLinea, unaLinea['Descripción'] || 0) + (rellenos['Descripción'] || 0) + 16) * 1.05)));   // (el texto más largo en una línea)
          let extra = W - aW - presentes.reduce((x, k) => x + ancho[k] + rellenos[k], 0) - descIdeal;
          for (let vuelta = 0; vuelta < 4 && extra > 8; vuelta++) {
            const crecen = presentes.filter((k) => ancho[k] < Math.round(id(k) * 1.8)), peso = crecen.reduce((x, k) => x + ancho[k], 0); if (!peso) break;
            let usado = 0; crecen.forEach((k) => { const add = Math.min(Math.round(id(k) * 1.8) - ancho[k], Math.floor(extra * ancho[k] / peso)); ancho[k] += add; usado += add; });
            extra -= usado; if (!usado) break;
          }
          // El ancho se cambia sin redibujar la tabla (propiedad sin invalidar + estilo del encabezado): redibujarla quitaba los revisores
          // de Producción Estatus, se volvía a medir sin ellos y el ancho oscilaba sin parar (se redibujaba ~12 veces por segundo a 1366 px).
          const poner = (c, w, al) => {
            if (!c.__rmdOrig) c.__rmdOrig = { width: c.getWidth(), hAlign: c.getHAlign() };
            if (w && c.getWidth() !== w) { c.setProperty('width', w, true); const th = c.getDomRef(); if (th) th.style.width = w; }
            if (al && c.getHAlign() !== al) c.setHAlign(al);
          };
          presentes.forEach((k) => poner(porNombre.get(k), ancho[k] + 'px', CENTRADAS_LISTA.includes(k) ? 'Center' : null));
          window.__rmdStats.columnasLista = { W, compacta, f: Math.round(f * 100) / 100, minimos, unaLinea, anchos: Object.fromEntries(presentes.map((k) => [k, porNombre.get(k).getWidth()])) };
        }
      }
    }
    if (reordenar) t.invalidate();
  }
  let esperaAncho = 0;
  window.addEventListener('resize', () => { clearTimeout(esperaAncho); esperaAncho = setTimeout(() => { try { if (opc.activo) gestionarColumnasLista(); } catch (e) { /* sin la lista */ } }, 250); });
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
    const o = objetoDeFila(tr) || {}, esMenor = !!o.pasoHijoId_pasoId, m = esMenor ? objetoCargado(o.pasoHijoId) : objetoCargado(o.pasoId);   // (en un proceso menor, pasoId es la fila del paso mayor)
    if (!m || !m.descripcion) return { error: o.estructuraRecetaInsumoId || o.Maktx ? 'Esa fila es un insumo de la receta, no un paso.' : 'No encuentro los datos del paso maestro de esa fila.' };
    const est = objetoCargado(o.mdEstructuraId) && objetoCargado(o.mdEstructuraId.estructuraId);
    const nombres = {
      estructuraId_estructuraId: (est && est.estructuraId === m.estructuraId_estructuraId ? est.descripcion : '') || nombreEstructura(m.estructuraId_estructuraId),
      etiquetaId_etiquetaId: (objetoCargado(m.etiquetaId) || {}).descripcion || (() => { const e = objetoCargado(o.mdEsEtiquetaId); return (e && ((objetoCargado(e.etiquetaId) || {}).descripcion || e.descripcion)) || ''; })() || nombreEtiqueta(m.etiquetaId_etiquetaId),
      tipoDatoId_iMaestraId: (objetoCargado(m.tipoDatoId) || {}).contenido || nombreTipo(m.tipoDatoId_iMaestraId, tabla),
      tipoLapsoId_motivoLapsoId: (objetoCargado(m.tipoLapsoId) || {}).descripcion || '',
    };
    const datos = { estructuraId_estructuraId: m.estructuraId_estructuraId, etiquetaId_etiquetaId: m.etiquetaId_etiquetaId, numeracion: !!m.numeracion, tipoDatoId_iMaestraId: m.tipoDatoId_iMaestraId,
      clvModelo: m.clvModelo, valorInicial: m.valorInicial, valorFinal: m.valorFinal, margen: m.margen, decimales: m.decimales, tipoLapsoId_motivoLapsoId: m.tipoLapsoId_motivoLapsoId };
    // cómo está configurado en ESTE RMD (puede diferir del paso maestro: p. ej. maestro "Texto", aquí "Realizado por")
    const enRmd = !esMenor ? { tipoDatoId_iMaestraId: o.tipoDatoId_iMaestraId, clvModelo: o.clvModelo, valorInicial: o.valorInicial, valorFinal: o.valorFinal, margen: o.margen, decimales: o.decimales }
      : { tipoDatoId_iMaestraId: o.tipoDatoId_iMaestraId, valorInicial: o.valorInicial, valorFinal: o.valorFinal, margen: o.margen, decimales: o.decimales };
    const origen = esMenor ? { tipo: 'menor', id: o.mdEstructuraPasoInsumoPasoId, orden: o.orden } : { tipo: 'mayor', id: o.mdEstructuraPasoId, orden: o.orden };
    return { codigo: m.codigo, descripcion: m.descripcion, datos, nombres, enRmd, origen };
  }
  // nombre de una etiqueta por su id, de lo que el portal ya tiene cargado (árbol de estructuras del RMD)
  function nombreEstructura(id) {
    try { const md = controladorPrincipal().getView().getModel('asociarDatos').getData(); const e = ((md.aEstructura && md.aEstructura.results) || []).map((x) => objetoCargado(x.estructuraId)).find((x) => x && x.estructuraId === id); return e ? e.descripcion : ''; } catch (e) { return ''; }
  }
  function nombreEtiqueta(id) {
    try { const md = controladorPrincipal().getView().getModel('asociarDatos').getData(); for (const e of (md.aEstructura && md.aEstructura.results) || []) for (const t of (e.aEtiqueta && e.aEtiqueta.results) || []) { const et = objetoCargado(t.etiquetaId); if (t.etiquetaId_etiquetaId === id && et) return et.descripcion; } } catch (e) { /* sin datos */ }
    return '';
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
      vigilarPasoCreado(dlg, x, p.origen, p.codigo);
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

  const ICONO_CAMBIAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 5h10M10 2.5 12.5 5 10 7.5"/><path d="M13.5 11h-10M6 8.5 3.5 11 6 13.5"/></svg>';
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

  // ---- "Cambiar paso" (v1.31): cambiar el paso maestro de un paso mayor por otro código, sin tocar su configuración ----
  // En el RMD, cada paso es una fila de MD_ES_PASO con SU configuración (tipo de dato, decimales, puesto, clave, casillas, depende,
  // orden…) que apunta al paso maestro (pasoId_pasoId); sus procesos menores cuelgan de esa fila (pasoId_mdEstructuraPasoId), no del
  // paso maestro. Cambiar el paso = actualizar solo pasoId_pasoId de esa fila: todo lo demás queda igual. Solo en RMD que no estén
  // autorizados ni suspendidos (el portal tampoco deja cambiarlos). Luego se refresca la lista como hace el portal.
  function controladorPasos(d) {
    const b = [...d.querySelectorAll('button')].map((x) => sap.ui.getCore().byId(x.id.replace(/-inner$/, ''))).find((c) => c && c.mEventRegistry && c.mEventRegistry.press && c.mEventRegistry.press[0].oListener && typeof c.mEventRegistry.press[0].oListener.onGetPasosToAssign === 'function');
    return b && b.mEventRegistry.press[0].oListener;
  }
  async function cambiarPasoMayor(d, tabla) {
    if (window.__rmdCambiando) return;
    const sel = seleccionadas(tabla);
    if (sel.length !== 1) { toast('Marca la casilla de UN solo paso y pulsa "Cambiar paso".', true); return; }
    const o = objetoDeFila(sel[0]) || {}, esMenor = !!o.pasoHijoId_pasoId, m = esMenor ? objetoCargado(o.pasoHijoId) : objetoCargado(o.pasoId);   // (en un proceso menor, pasoId es la fila del paso mayor)
    if ((esMenor ? !o.mdEstructuraPasoInsumoPasoId : !o.mdEstructuraPasoId) || !m || !m.codigo) { toast('Esa fila no es un paso del RMD (¿un insumo de la receta?).', true); return; }
    const origen = esMenor ? { tipo: 'menor', id: o.mdEstructuraPasoInsumoPasoId, orden: o.orden } : { tipo: 'mayor', id: o.mdEstructuraPasoId, orden: o.orden };
    const b = controladorPrincipal(), md = b && b.getView().getModel('asociarDatos').getData();
    if (!b) { toast('No se encontró el controlador del portal para esta lista.', true); return; }
    if (['465', '468'].includes(String(md.estadoIdRmd_iMaestraId))) { toast('Este RMD está autorizado o suspendido: sus pasos no se pueden cambiar.', true); return; }
    const modelo = b.getView().getModel('mainModelv2'), F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, FO = sap.ui.require('sap/ui/model/FilterOperator') || sap.ui.model.FilterOperator;
    const pms = esMenor ? [] : await leerTodoDe(modelo, 'MD_ES_PASO_INSUMO_PASO', [new F('pasoId_mdEstructuraPasoId', 'EQ', o.mdEstructuraPasoId)], { $select: 'mdEstructuraPasoInsumoPasoId,activo' }).catch(() => []);
    const nPM = pms.filter((x) => x.activo !== false).length;
    const v = ventana('Cambiar el paso por otro código', { cancelar: () => v.cerrar() });
    const tipo = nombreTipo(o.tipoDatoId_iMaestraId, tabla) || '';
    v.cuerpo.innerHTML = `<div class="rmd-cp-actual"><span>${esMenor ? 'Proceso menor' : 'Paso'} actual (orden ${esc(o.orden)})</span><p><b>${esc(m.codigo)}</b> — ${esc(m.descripcion)}</p></div>
      <p class="rmd-nota">Solo cambia el paso maestro al que apunta esta fila. <b>Se conserva</b> toda su configuración en este RMD${tipo ? ` (tipo de dato ${esc(tipo)}` : ' ('}, decimales, valores, ${esMenor ? 'casillas y orden)' : `puesto de trabajo, clave modelo, casillas, depende y orden) y sus <b>${nPM} proceso(s) menor(es)</b>`}.</p>
      <div class="rmd-cp-busca"><input type="search" class="rmd-cp-q" placeholder="Código o palabras de la descripción del paso nuevo" aria-label="Paso nuevo"><button type="button" class="rmd-btn rmd-cp-buscar">Buscar</button></div>
      <p class="rmd-progreso"></p><div class="rmd-cp-res"></div>`;
    const q = v.cuerpo.querySelector('.rmd-cp-q'), prog = v.cuerpo.querySelector('.rmd-progreso'), res = v.cuerpo.querySelector('.rmd-cp-res');
    let elegido = null, hallados = [];
    const bCambiar = botonModal('Cambiar paso', 'primario', async () => {
      if (!elegido) return;
      const ok = await confirmar('¿Cambiar el paso?', `Orden ${o.orden}: el ${esMenor ? 'proceso menor' : 'paso'} ${m.codigo} pasa a ser el ${elegido.codigo} — ${elegido.descripcion}.`, `Se conserva la configuración de esta fila${esMenor ? '' : ` y sus ${nPM} proceso(s) menor(es)`}. Los demás RMD no cambian.`, { si: 'Cambiar', no: 'Cancelar' });
      if (!ok) return;
      window.__rmdCambiando = true; bCambiar.disabled = true; sap.ui.core.BusyIndicator.show(0);
      try {
        await reemplazarPasoDeFila(origen, elegido);
        v.cerrar(); toast(`Orden ${o.orden}: ahora usa el paso ${elegido.codigo}. ${esMenor ? 'Configuración sin cambios.' : 'Configuración y procesos menores sin cambios.'}`);
      } catch (e) { setTxt(prog, 'No se pudo cambiar: ' + e.message); bCambiar.disabled = false; }
      finally { window.__rmdCambiando = false; sap.ui.core.BusyIndicator.hide(); }
    });
    bCambiar.disabled = true;
    const pintar = () => {
      res.innerHTML = hallados.length ? `<table class="rmd-tabla"><thead><tr><th></th><th>Código</th><th>Descripción</th><th>Etiqueta</th><th>Tipo de dato (maestro)</th></tr></thead><tbody>${hallados.map((x, i) =>
        `<tr class="${elegido === x ? 'rmd-cp-sel' : ''}" data-i="${i}"><td><input type="radio" name="rmd-cp" ${elegido === x ? 'checked' : ''}></td><td>${esc(x.codigo)}</td><td>${esc(x.descripcion)}</td><td>${esc((x.etiquetaId && x.etiquetaId.descripcion) || '')}${x.etiquetaId_etiquetaId !== m.etiquetaId_etiquetaId ? ' <span class="rmd-dif">(otra etiqueta)</span>' : ''}</td><td>${esc((x.tipoDatoId && x.tipoDatoId.contenido) || '')}</td></tr>`).join('')}</tbody></table>` : '';
      bCambiar.disabled = !elegido;
    };
    res.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; elegido = hallados[+tr.dataset.i]; pintar(); });
    const buscar = async () => {
      const t = norm(q.value); if (t.length < 1) { setTxt(prog, 'Escribe un código o palabras de la descripción.'); return; }
      setTxt(prog, 'Buscando…'); elegido = null;
      const f = [new F('estructuraId_estructuraId', 'EQ', m.estructuraId_estructuraId), new F('activo', 'EQ', true), new F('pasoId', 'NE', m.pasoId)];
      if (/^\d+$/.test(t)) f.push(new F('codigo', 'EQ', t)); else t.split(/\s+/).forEach((w) => f.push(new F({ path: 'descripcion', operator: FO.Contains, value1: w, caseSensitive: false })));
      try {
        hallados = (await new Promise((ok, mal) => modelo.read('/PASO', { filters: [new F({ filters: f, and: true })], urlParameters: { $expand: 'etiquetaId,tipoDatoId', $top: '60', $orderby: 'codigo' }, success: (r) => ok(r.results || []), error: mal })));
        hallados.sort((a, c) => (a.etiquetaId_etiquetaId === m.etiquetaId_etiquetaId ? 0 : 1) - (c.etiquetaId_etiquetaId === m.etiquetaId_etiquetaId ? 0 : 1) || (+a.codigo || 0) - (+c.codigo || 0));
        setTxt(prog, hallados.length ? `${hallados.length} paso(s) de la misma estructura${hallados.length === 60 ? ' (primeros 60: afina la búsqueda)' : ''}. Elige uno y pulsa "Cambiar paso".` : 'Ningún paso de la misma estructura coincide.');
      } catch (e) { hallados = []; setTxt(prog, 'No se pudo buscar: ' + ((e && e.message) || e)); }
      pintar();
    };
    v.cuerpo.querySelector('.rmd-cp-buscar').addEventListener('click', buscar);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); buscar(); } });
    v.pie.append(botonModal('Cancelar', '', () => v.cerrar()), bCambiar);
    setTimeout(() => q.focus(), 40);
  }
  function instalarBotonCambiarPaso(d, tabla) {
    const hdr = d.querySelector('.sapMListHdr'); if (!hdr || hdr.querySelector('.rmd-cambiar-paso')) return;
    const b = botonIcono(ICONO_CAMBIAR, 'Cambiar paso', 'rmd-cambiar-paso', () => cambiarPasoMayor(d, tablaDe(d) || tabla));
    b.title = 'Marca la casilla de un paso y pulsa aquí: lo cambia por otro código de paso (ya creado) conservando su configuración en este RMD y sus procesos menores.';
    const grupo = hdr.querySelector('.rmd-copia-grupo');
    if (grupo) grupo.appendChild(b); else { const ref = hdr.querySelector('.sapMTBSeparator') || [...hdr.querySelectorAll('button')].find((x) => x.title === 'Imprimir'); b.style.marginRight = '10px'; if (ref) hdr.insertBefore(b, ref); else hdr.appendChild(b); }
  }
  window.__rmdStats.cambiarPasoMayor = (d, t) => cambiarPasoMayor(d, t);

  // ---- Tras crear el paso en minúsculas (v1.32): código copiado al portapapeles y "Reemplazar en la fila" ----
  // Mientras está abierta la ventana "Nuevo Paso" que llenó "En minúsculas" se guarda la descripción que tiene; al cerrarse, se busca
  // en PASO el paso recién creado (misma descripción, estructura y etiqueta, registrado después de abrirla). Si existe: su código se
  // copia al portapapeles y una tarjeta ofrece reemplazar el paso de la fila de origen (paso mayor o proceso menor) por el nuevo,
  // cambiando solo el paso maestro al que apunta (se conserva su configuración y, en un paso mayor, sus procesos menores).
  async function copiarAlPortapapeles(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* sin permiso: se intenta a la antigua */ }
    try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; html.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function vigilarPasoCreado(dlg, datos, origen, codigoAntes) {
    const t0 = Date.now(); let desc = datos.descripcion || '';
    const campo = () => [...dlg.querySelectorAll('textarea, input')].map((el) => { const c = ctlDe(el); return c && rutaDe(c, 'value') && /descripcion/i.test(rutaDe(c, 'value')) ? el : null; }).find(Boolean);
    const reloj = setInterval(async () => {
      const f = dlg.isConnected && visible(dlg) ? campo() : null;
      if (f && norm(f.value)) { desc = norm(f.value); return; }
      if (dlg.isConnected && visible(dlg) && Date.now() - t0 < 30 * 60000) return;
      clearInterval(reloj);
      try {
        const b = controladorPrincipal(), modelo = b.getView().getModel('mainModelv2'), F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, FO = sap.ui.require('sap/ui/model/FilterOperator') || sap.ui.model.FilterOperator;
        const r = await leerTodoDe(modelo, 'PASO', [new F('tolower(descripcion)', FO.EQ, "'" + desc.toLowerCase().replace(/'/g, "''") + "'"), new F('estructuraId_estructuraId', 'EQ', datos.estructuraId_estructuraId)], { $select: 'pasoId,codigo,descripcion,fechaRegistro,etiquetaId_etiquetaId' });
        const nuevo = r.filter((x) => +new Date(x.fechaRegistro) >= t0 - 60000).sort((a, c) => +new Date(c.fechaRegistro) - +new Date(a.fechaRegistro))[0];
        if (nuevo) await ofrecerPasoCreado(nuevo, origen, codigoAntes);
      } catch (e) { /* no se pudo comprobar: sin tarjeta */ }
    }, 700);
  }
  async function ofrecerPasoCreado(nuevo, origen, codigoAntes) {
    const copiado = await copiarAlPortapapeles(String(nuevo.codigo));
    document.querySelectorAll('.rmd-creado').forEach((x) => x.remove());
    const c = document.createElement('div'); c.className = 'rmd-creado'; c.setAttribute('role', 'status');
    const donde = origen ? `el ${origen.tipo === 'menor' ? 'proceso menor' : 'paso'} de orden ${origen.orden} (${codigoAntes})` : '';
    c.innerHTML = `<b>✓ Paso ${esc(nuevo.codigo)} creado</b><span>${esc(nuevo.descripcion)}</span><span class="rmd-nota rmd-creado-copia">${copiado ? '✓ Código copiado al portapapeles: pégalo en "Código Paso" de Adicionar Pasos.' : `Código: ${esc(nuevo.codigo)} (no se pudo copiar solo: pulsa «Copiar código»).`}</span>
      <div class="rmd-creado-pie">${origen ? `<button type="button" class="rmd-btn primario rmd-creado-reemplazar" title="Cambia solo el paso maestro de esa fila: conserva su configuración${origen.tipo === 'mayor' ? ' y sus procesos menores' : ''}.">Reemplazar ${esc(donde)}</button>` : ''}<button type="button" class="rmd-btn rmd-creado-copiar">Copiar código</button><button type="button" class="rmd-btn rmd-creado-cerrar">Cerrar</button></div>`;
    html.appendChild(c);                                                               // (se queda hasta que la persona la cierre; no tiene temporizador)
    c.querySelector('.rmd-creado-copiar').addEventListener('click', async (e) => { const ok = await copiarAlPortapapeles(String(nuevo.codigo)); const n = c.querySelector('.rmd-creado-copia'); setTxt(n, ok ? `✓ Código ${nuevo.codigo} copiado al portapapeles.` : 'No se pudo copiar: selecciona el código a mano.'); e.currentTarget.blur(); });
    c.querySelector('.rmd-creado-cerrar').addEventListener('click', () => c.remove());
    const br = c.querySelector('.rmd-creado-reemplazar');
    if (br) br.addEventListener('click', async () => {
      br.disabled = true;
      try { await reemplazarPasoDeFila(origen, nuevo); c.remove(); toast(`Listo: ${donde} ahora usa el paso ${nuevo.codigo}, con su misma configuración.`); }
      catch (e) { br.disabled = false; toast('No se pudo reemplazar: ' + e.message, true); }
    });
  }
  async function reemplazarPasoDeFila(origen, nuevo) {
    const b = controladorPrincipal(), md = b.getView().getModel('asociarDatos').getData(), modelo = b.getView().getModel('mainModelv2');
    if (['465', '468'].includes(String(md.estadoIdRmd_iMaestraId))) throw new Error('el RMD está autorizado o suspendido');
    sap.ui.core.BusyIndicator.show(0);
    try {
      if (origen.tipo === 'menor') await modeloEscribir(modelo, 'update', `/MD_ES_PASO_INSUMO_PASO('${origen.id}')`, { pasoHijoId_pasoId: nuevo.pasoId });
      else await modeloEscribir(modelo, 'update', `/MD_ES_PASO('${origen.id}')`, { pasoId_pasoId: nuevo.pasoId });
      await b.onGetDataEstructuraMD(); await b.onCreateModelTree();
      const d = dialogos().filter((x) => controladorPasos(x)).pop(), M = d && controladorPasos(d);
      if (M) {
        if (origen.tipo === 'menor') { await M.onGetPasosToAssignProcess('proceso'); if (M.onObtenerProcMenores) await M.onObtenerProcMenores(null); }
        else { const etq = b.getView().getModel('headerAddEtiqueta'); if (etq && etq.getData().length !== 0) await M.onGetPasosToAssignProcess(); else await M.onGetPasosToAssign(); }
      }
    } finally { sap.ui.core.BusyIndicator.hide(); }
  }
  window.__rmdStats.ofrecerPasoCreado = (nuevo, origen, codigoAntes) => ofrecerPasoCreado(nuevo, origen, codigoAntes);   // (pruebas)

  // ---- 9 ter. Reglas de revisión y documentos vigentes (v1.34) ----------------------------------------------------------
  // Reglas que define la persona para revisar los textos de los pasos y procesos menores (palabras o frases, códigos de
  // documento o de equipo, patrones) y la lista de documentos vigentes que carga (la del DMS: los que están en la lista están
  // vigentes; los que no, no). Se aplican solas: se resalta lo encontrado en la descripción de cada fila (al pasar el ratón se
  // ve el motivo), sus advertencias se suman al aviso de la barra de la lista ("ir a la siguiente") y la ventana del RMD muestra
  // un resumen de todo el RMD. Se guarda SOLO en este navegador: las reglas en localStorage (con copia en IndexedDB) y la lista
  // en IndexedDB; nada sale a ningún servidor. "Exportar / Importar configuración" las llevan a otra PC en un archivo .json.
  // v1.35: también la lista de equipos calificados (hoja "Cronograma" del registro OQ / PQ): la regla "Equipo sin calificación" avisa
  // los equipos de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES del RMD (y los citados en los pasos) cuyo ESTADO GENERAL no es
  // de calificado. Cada apartado tiene su "Restablecer".
  const CLAVE_REGLAS = 'rmdUiReglas', CLAVE_VIGENTES_LS = 'rmdUiVigentes', SELLO_VIGENTES = 'rmdUiVigentesSello', CLAVE_CALIF_LS = 'rmdUiCalificados', SELLO_CALIF = 'rmdUiCalificadosSello';
  const CONOCIDAS_V134 = ['novigente', 'documentos', 'equipos', 'provisional'];   // predeterminadas que ya traía la v1.34
  const Almacen = (() => {
    let base = null;
    const abrir = () => base || (base = new Promise((ok, mal) => {
      try {
        const r = indexedDB.open('rmdUiMejoras', 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('datos')) r.result.createObjectStore('datos'); };
        r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error || new Error('IndexedDB no disponible')); r.onblocked = () => mal(new Error('IndexedDB bloqueada'));
      } catch (e) { mal(e); }
    }).catch((e) => { base = null; throw e; }));
    const tx = (modo, fn) => abrir().then((db) => new Promise((ok, mal) => {
      const t = db.transaction('datos', modo), pedido = fn(t.objectStore('datos'));
      t.oncomplete = () => ok(pedido && pedido.result); t.onerror = () => mal(t.error || new Error('no se pudo guardar')); t.onabort = () => mal(t.error || new Error('no se pudo guardar'));
    }));
    return { leer: (k) => tx('readonly', (s) => s.get(k)), guardar: (k, v) => tx('readwrite', (s) => s.put(v, k)), borrar: (k) => tx('readwrite', (s) => s.delete(k)) };
  })();
  const RR = { reglas: null, ver: 1, vigentes: null, mapa: null, calif: null, mapaCalif: null, catalogo: null, pidiendoCat: false, comp: null, compClave: '', errorGuardar: '', listo: null };
  function leerDatoReglasLS() { try { const o = JSON.parse(localStorage.getItem(CLAVE_REGLAS) || 'null'); return o && Array.isArray(o.reglas) ? o : null; } catch (e) { return null; } }   // (dañado: se recupera de IndexedDB)
  function leerReglasLS() { const o = leerDatoReglasLS(); return o ? o.reglas.map(Reglas.normalizar) : null; }
  // las reglas guardadas + las predeterminadas que salieron después (las que la persona borró no vuelven)
  const conPredeterminadasNuevas = (dato) => Reglas.completarPredeterminadas(dato.reglas.map(Reglas.normalizar), Array.isArray(dato.conocidas) ? dato.conocidas : CONOCIDAS_V134);
  function reglasActuales() {
    if (!RR.reglas) { const d = leerDatoReglasLS(); RR.reglas = Reglas.sinIdsRepetidos(d ? conPredeterminadasNuevas(d).reglas : Reglas.predeterminadas()); }
    return RR.reglas;
  }
  async function guardarReglas(lista) {
    const reglas = Reglas.sinIdsRepetidos((lista || []).map(Reglas.normalizar)), dato = { version: 1, guardado: new Date().toISOString(), conocidas: Reglas.CLAVES_PREDETERMINADAS, reglas };
    RR.reglas = reglas; RR.ver++;
    let enLS = true, enDB = true;
    try { localStorage.setItem(CLAVE_REGLAS, JSON.stringify(dato)); } catch (e) { enLS = false; }
    try { await Almacen.guardar('reglas', dato); } catch (e) { enDB = false; }
    RR.errorGuardar = enLS || enDB ? '' : 'No se pudieron guardar las reglas en este navegador: se perderán al cerrar la página.';
    if (RR.errorGuardar) toast(RR.errorGuardar, true);
    ajustarTodo(); refrescarVentanaReglas();
    return enLS || enDB;
  }
  function ponerVigentes(v) {
    RR.vigentes = v && Array.isArray(v.docs) && v.docs.length ? v : null;
    RR.mapa = RR.vigentes ? new Map(RR.vigentes.docs.map((d) => [d[0], { titulo: d[1] || '', revision: d[2] || '', estado: d[3] || '', categoria: d[4] || '', fecha: d[5] || '', validez: d[6] || '' }])) : null;
    RR.ver++;
  }
  async function leerVigentesGuardados() {
    let v = null;
    try { v = await Almacen.leer('vigentes'); } catch (e) { v = null; }
    if (!v) { try { v = JSON.parse(localStorage.getItem(CLAVE_VIGENTES_LS) || 'null'); } catch (e) { v = null; } }
    ponerVigentes(v); if (opc.activo) ajustarTodo(); refrescarVentanaReglas();
  }
  // v = null quita la lista. Si IndexedDB no está disponible se intenta en localStorage; si tampoco, queda solo mientras la página siga abierta.
  async function guardarVigentes(v) {
    let ok = false, error = '';
    if (v) {
      try { await Almacen.guardar('vigentes', v); ok = true; try { localStorage.removeItem(CLAVE_VIGENTES_LS); } catch (e) { /* nada */ } }
      catch (e) { error = e.message; try { localStorage.setItem(CLAVE_VIGENTES_LS, JSON.stringify(v)); ok = true; } catch (e2) { error = e2.message; } }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* sin esa API */ }
    } else {
      try { await Almacen.borrar('vigentes'); } catch (e) { /* no había */ }
      try { localStorage.removeItem(CLAVE_VIGENTES_LS); } catch (e) { /* nada */ }
      ok = true;
    }
    try { localStorage.setItem(SELLO_VIGENTES, String(Date.now())); } catch (e) { /* otra pestaña no se enterará */ }
    ponerVigentes(v); ajustarTodo(); refrescarVentanaReglas();
    return { ok, error };
  }
  // ---- lista de equipos calificados: { archivo, cargado, hoja, n, estados, estadosOk, equipos: [[código, SAP, descripción, ESTADO GENERAL, OQ, PQ…]] } ----
  function ponerCalificados(v) {
    RR.calif = v && Array.isArray(v.equipos) && v.equipos.length ? v : null;
    RR.mapaCalif = RR.calif ? Reglas.mapaCalificados(RR.calif, RR.calif.estadosOk) : null;
    RR.ver++;
  }
  async function leerCalificadosGuardados() {
    let v = null;
    try { v = await Almacen.leer('calificados'); } catch (e) { v = null; }
    if (!v) { try { v = JSON.parse(localStorage.getItem(CLAVE_CALIF_LS) || 'null'); } catch (e) { v = null; } }
    ponerCalificados(v); if (opc.activo) ajustarTodo(); refrescarVentanaReglas();
  }
  async function guardarCalificados(v) {
    let ok = false, error = '';
    if (v) {
      try { await Almacen.guardar('calificados', v); ok = true; try { localStorage.removeItem(CLAVE_CALIF_LS); } catch (e) { /* nada */ } }
      catch (e) { error = e.message; try { localStorage.setItem(CLAVE_CALIF_LS, JSON.stringify(v)); ok = true; } catch (e2) { error = e2.message; } }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* sin esa API */ }
    } else {
      try { await Almacen.borrar('calificados'); } catch (e) { /* no había */ }
      try { localStorage.removeItem(CLAVE_CALIF_LS); } catch (e) { /* nada */ }
      ok = true;
    }
    try { localStorage.setItem(SELLO_CALIF, String(Date.now())); } catch (e) { /* otra pestaña no se enterará */ }
    ponerCalificados(v); ajustarTodo(); refrescarVentanaReglas();
    return { ok, error };
  }
  // Al arrancar: si el localStorage se perdió, las reglas se recuperan de IndexedDB (y si no, se copian a IndexedDB); luego las listas.
  // Si salió una predeterminada nueva que la persona no conocía (p. ej. "Equipo sin calificación" en la v1.35), se agrega y se guarda.
  RR.listo = (async () => {
    try {
      const enLS = leerDatoReglasLS(), enDB = await Almacen.leer('reglas').catch(() => null);
      if (!enLS && enDB && Array.isArray(enDB.reglas)) {
        RR.reglas = Reglas.sinIdsRepetidos(conPredeterminadasNuevas(enDB).reglas); RR.ver++;
        try { localStorage.setItem(CLAVE_REGLAS, JSON.stringify(enDB)); } catch (e) { /* solo en IndexedDB */ }
      } else if (enLS && (!enDB || enDB.guardado !== enLS.guardado)) Almacen.guardar('reglas', enLS).catch(() => {});
      const dato = leerDatoReglasLS() || enDB;
      if (dato && conPredeterminadasNuevas(dato).nuevas) await guardarReglas(reglasActuales());
    } catch (e) { /* sin IndexedDB: basta el localStorage */ }
    await leerVigentesGuardados();
    await leerCalificadosGuardados();
  })();
  // otra pestaña del portal cambió las reglas o una lista
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVE_REGLAS) { RR.reglas = null; RR.ver++; ajustarTodo(); refrescarVentanaReglas(); }
    else if (e.key === SELLO_VIGENTES) leerVigentesGuardados();
    else if (e.key === SELLO_CALIF) leerCalificadosGuardados();
  });
  const firmaReglas = () => `${RR.ver}|${RR.mapa ? 1 : 0}|${RR.catalogo ? 1 : 0}|${RR.mapaCalif ? 1 : 0}`;
  const ctxReglas = (x) => ({ vigentes: RR.mapa, catalogo: RR.catalogo, calificados: RR.mapaCalif && RR.mapaCalif.porCodigo, calificadosSap: RR.mapaCalif && RR.mapaCalif.porSap, ...(x || {}) });
  function reglasCompiladas() {
    if (RR.compClave !== firmaReglas()) { RR.comp = Reglas.compilar(reglasActuales(), ctxReglas()); RR.compClave = firmaReglas(); }
    if (!RR.catalogo && on('reglasrev') && RR.comp.some((c) => c.necesita === 'catalogo' && c.regla.activa)) pedirCatalogo();
    return RR.comp;
  }
  const reglasVivas = () => on('reglasrev') && reglasCompiladas().some((c) => c.ok);
  // Códigos de equipo, utensilio y agrupador del catálogo del portal (el mismo de "Buscar por equipo"): solo si una regla activa lo usa
  function pedirCatalogo() {
    if (RR.pidiendoCat || typeof sap === 'undefined') return;
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'); if (!modelo) return;
    RR.pidiendoCat = true;
    cargarCatalogoEquipos(modelo).then((items) => {
      const m = new Map(); items.forEach((x) => { const c = Reglas.normalizarCodigo(x.codigo); if (c.length >= 5 && c.includes('-') && !m.has(c)) m.set(c, x.desc || ''); });
      RR.catalogo = m; RR.ver++; ajustarTodo(); refrescarVentanaReglas();
    }, () => { setTimeout(() => { RR.pidiendoCat = false; }, 60000); });   // (se reintenta en un minuto)
  }

  // ---- resaltado dentro del texto de una celda (sin cambiar su texto: el filtro, copiar y demás siguen leyendo lo mismo) ----
  const textoDeCelda = (td) => td && (td.querySelector('.sapMText') || td.querySelector('.sapMLnk') || td.querySelector('.sapMObjectIdentifierTitle') || td.querySelector('.sapMLabel'));
  function quitarMarcasReglas(el) {
    el.querySelectorAll('mark.rmd-regla').forEach((m) => { const p = m.parentNode; if (!p) return; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); });
  }
  function pintarMarcas(el, marcas) {
    quitarMarcasReglas(el); if (!marcas.length) return;
    const nodos = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, off = 0;
    while ((n = w.nextNode())) { nodos.push({ n, ini: off, fin: off + n.data.length }); off += n.data.length; }
    for (let k = marcas.length - 1; k >= 0; k--) {                       // de atrás hacia adelante: las posiciones pendientes no se mueven
      const m = marcas[k]; let ultimo = true;
      for (let j = nodos.length - 1; j >= 0; j--) {
        const x = nodos[j], a = Math.max(m.ini, x.ini), b = Math.min(m.fin, x.fin); if (a >= b) continue;
        const r = document.createRange(); r.setStart(x.n, a - x.ini); r.setEnd(x.n, b - x.ini);
        const mk = document.createElement('mark'); mk.className = `rmd-regla rmd-c-${m.color}${m.aviso ? ' aviso' : ''}`; mk.title = m.titulo;
        if (ultimo && m.etiqueta) mk.dataset.etq = m.etiqueta; ultimo = false;
        try { r.surroundContents(mk); } catch (e) { /* (rango cortado por otro elemento: se deja sin marcar) */ }
      }
    }
  }
  // Una lista (pasos, procesos menores o el selector "Adicionar Pasos"): marca cada descripción y devuelve sus advertencias.
  // Cada celda guarda la "firma" de lo que pintó (reglas + texto): si nada cambió no se vuelve a tocar el DOM.
  function aplicarReglasLista(tabla, filas, iDes, ctx) {
    const out = { n: 0, filas: [] };
    if (!reglasVivas()) {
      if (tabla.__rmdReglas) { tabla.querySelectorAll('[data-rmd-reglas]').forEach((el) => { quitarMarcasReglas(el); delete el.dataset.rmdReglas; el.__rmdReglasRes = null; }); tabla.__rmdReglas = false; }
      return out;
    }
    tabla.__rmdReglas = true;
    const comp = reglasCompiladas(), c = ctxReglas(ctx), clave = `${firmaReglas()}|${ctx.esPM ? 1 : 0}|${ctx.lista || ''}|`;
    filas.forEach((tr) => {
      const el = iDes >= 0 ? textoDeCelda(celda(tr, iDes)) : null; if (!el) return;
      const texto = el.textContent || '', firma = clave + texto;
      let res = el.__rmdReglasRes;
      if (!res || el.dataset.rmdReglas !== firma || (res.marcas.length && !el.querySelector('mark.rmd-regla'))) {
        res = Reglas.buscar(texto, comp, c); el.__rmdReglasRes = res; el.dataset.rmdReglas = firma; pintarMarcas(el, res.marcas);
      }
      if (res.avisos.length) { out.n += res.avisos.length; out.filas.push({ tr, avisos: res.avisos.map((a) => a.texto) }); }
    });
    return out;
  }
  // Ventana de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES (v1.35): cada equipo se revisa con las reglas de equipo que revisan
  // también la estructura (p. ej. "Equipo sin calificación") y se marca su "Código de referencia" (o su código SAP) con el estado.
  const reglasDeEstructura = () => reglasVivas() && reglasCompiladas().some((c) => c.ok && c.regla.tipo === 'equipo' && c.regla.estructura);
  function aplicarReglasEquiposVentana(tabla, filas, nombres) {
    const out = { n: 0, filas: [] };
    if (!reglasDeEstructura()) {
      if (tabla.__rmdReglas) { tabla.querySelectorAll('[data-rmd-reglas]').forEach((el) => { quitarMarcasReglas(el); delete el.dataset.rmdReglas; el.__rmdReglasRes = null; }); tabla.__rmdReglas = false; }
      return out;
    }
    tabla.__rmdReglas = true;
    const iRef = nombres.indexOf('CÓDIGO DE REFERENCIA'), iCod = nombres.findIndex((n) => n === 'CÓDIGO' || n === 'CODIGO'), comp = reglasCompiladas(), ctx = ctxReglas(), clave = `${firmaReglas()}|eq|`;
    filas.forEach((tr) => {
      const o = objetoDeFila(tr) || {}, eq = (o.equipoId && typeof o.equipoId === 'object') ? o.equipoId : {};
      const cod0 = String(o.codigo || eq.equnr || '').trim(), numerico = /^\d+$/.test(cod0);   // ("Código" es el SAP del equipo; en utensilios, su propio código)
      const e = { codigo: norm(o.CodigoGaci || eq.CodigoGaci || (numerico ? '' : cod0)), sap: numerico ? sinCeros(cod0) : '', desc: norm(o.descripcion || eq.denom || ''), orden: o.orden };
      const el = textoDeCelda(celda(tr, e.codigo && iRef >= 0 ? iRef : iCod)); if (!el) return;
      const texto = el.textContent || '', firma = `${clave}${e.codigo}|${e.sap}|${texto}`;
      let res = el.__rmdReglasRes;
      if (!res || el.dataset.rmdReglas !== firma || (res.marcas.length && !el.querySelector('mark.rmd-regla'))) {
        const it = Reglas.evaluarEquipos([e], comp, ctx).items[0];
        res = { marcas: it && texto.trim() ? [{ ...it.marcas[0], ini: 0, fin: texto.length, aviso: it.marcas.some((m) => m.aviso), titulo: it.marcas.map((m) => m.titulo).join('\n') }] : [], avisos: it ? it.avisos : [] };
        el.__rmdReglasRes = res; el.dataset.rmdReglas = firma; pintarMarcas(el, res.marcas);
      }
      if (res.avisos.length) { out.n += res.avisos.length; out.filas.push({ tr, avisos: res.avisos.map((a) => a.texto) }); }
    });
    return out;
  }
  // nombre de la lista de pasos que está debajo (para los procesos menores y los selectores)
  function listaPadre(d) { const ds = dialogos(); for (let i = ds.indexOf(d) - 1; i >= 0; i--) if (ds[i].__rmdListaEfectiva) return ds[i].__rmdListaEfectiva; return ''; }
  function gestionarReglasSelector() {
    if (typeof sap === 'undefined') return;
    TABLAS_SELECTOR.forEach((id, i) => {
      const t = sap.ui.getCore().byId(id), dom = t && t.getDomRef(); if (!dom || !visible(dom)) return;
      const tabla = dom.querySelector('table'); if (!tabla) return;
      const iDes = [...tabla.querySelectorAll('thead th')].findIndex((th) => /^DESCRIPCI/.test(NORM(th.textContent)));
      if (iDes >= 0) aplicarReglasLista(tabla, filasPrincipales(tabla), iDes, { esPM: i === 1, lista: listaPadre(dom.closest('.sapMDialog')) });
    });
  }

  // ---- todo el RMD: textos de sus pasos y procesos menores (lo usan el aviso de la ventana del RMD y "Documentos citados") ----
  // Lee TODOS los pasos del RMD (MD_ES_PASO, con su estructura), sus etiquetas (MD_ES_ETIQUETA) y todos sus procesos menores
  // (MD_ES_PASO_INSUMO_PASO) con el modelo del portal —las mismas entidades que el portal usa al abrir cada lista—, en 3 lecturas.
  // v1.35: y sus equipos (MD_ES_EQUIPO con su EQUIPO: "Código de referencia" = CodigoGaci y código SAP = equnr), para la calificación.
  const textosRmd = new Map();                                            // mdId -> { t, modelo, p }
  let generacionRmd = 0, dialogosAntes = 0;                               // (sube cada vez que se cierra una ventana: pudo cambiar algo)
  const sinCeros = (s) => String(s == null ? '' : s).trim().replace(/^0+(?=\d)/, '');
  async function leerTextosRmd(modelo, md) {
    const Filtro = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, porMd = [new Filtro('mdId_mdId', 'EQ', md.mdId)], t0 = Date.now();
    const activo = (x) => x && x.activo !== false;
    const [pasos, etiquetas, pms, equipos] = await Promise.all([
      leerTodoDe(modelo, 'MD_ES_PASO', porMd, { $expand: 'pasoId,mdEstructuraId,mdEstructuraId/estructuraId' }),
      leerTodoDe(modelo, 'MD_ES_ETIQUETA', porMd, { $expand: 'etiquetaId' }),
      leerTodoDe(modelo, 'MD_ES_PASO_INSUMO_PASO', porMd, { $expand: 'pasoHijoId' }),
      leerTodoDe(modelo, 'MD_ES_EQUIPO', porMd, { $expand: 'equipoId' }).catch(() => []),
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
    const r = { rmd: md.codigo, mdId: md.mdId, listas: [], textos: [], pasos: 0, pms: 0 };
    [...listas.values()].sort((a, b) => a.o1 - b.o1 || a.o2 - b.o2 || a.lista.localeCompare(b.lista)).forEach((l, il) => {
      const info = { lista: l.lista, pasos: l.pasos.length, pms: 0 };
      l.pasos.sort((a, b) => (+a.orden || 0) - (+b.orden || 0)).forEach((p, k) => {
        const pp = obj(p.pasoId), lugar = { lista: l.lista, paso: String(p.orden != null ? p.orden : k + 1), codigoPaso: String(pp.codigo || ''), descPaso: norm(pp.descripcion), pm: '', codigoPM: '', descPM: '' };
        r.textos.push({ texto: lugar.descPaso, esPM: false, lista: l.lista, lugar, il });
        (pmsDe.get(p.mdEstructuraPasoId) || []).sort((a, b) => (+a.orden || 0) - (+b.orden || 0)).forEach((q) => {
          const h = obj(q.pasoHijoId), lq = { ...lugar, pm: String(q.orden != null ? q.orden : ''), codigoPM: String(h.codigo || ''), descPM: norm(h.descripcion) };
          info.pms++; r.pms++; r.textos.push({ texto: lq.descPM, esPM: true, lista: l.lista, lugar: lq, il });
        });
      });
      r.pasos += info.pasos; r.listas.push(info);
    });
    r.equipos = equipos.filter(activo).sort((a, b) => (+a.orden || 0) - (+b.orden || 0))
      .map((x) => { const e = obj(x.equipoId); return { orden: x.orden, codigo: norm(e.CodigoGaci || ''), sap: sinCeros(e.equnr), desc: norm(e.denom || e.eqktx || '') }; });
    r.segundos = Math.max(1, Math.round((Date.now() - t0) / 1000));
    return r;
  }
  // maxEdad: se reutiliza una lectura de hace menos de ese tiempo (ms); 0 = leer de nuevo
  function textosDelRmd(modelo, md, maxEdad) {
    const g = textosRmd.get(md.mdId);
    if (g && g.modelo === modelo && Date.now() - g.t < (maxEdad == null ? 60000 : maxEdad)) return g.p;
    const p = leerTextosRmd(modelo, md); textosRmd.set(md.mdId, { t: Date.now(), modelo, p });
    p.catch(() => { const x = textosRmd.get(md.mdId); if (x && x.p === p) textosRmd.delete(md.mdId); });
    return p;
  }
  // Aviso en la ventana del RMD: advertencias de las reglas en todo el RMD (pasos y procesos menores de todas las listas) y las
  // reglas "Debe estar presente" que no se cumplen. Se revisa al abrir el RMD, al volver a él (cerrada una lista: pudo cambiar
  // algo) y al cambiar las reglas o la lista de vigentes.
  function avisoReglasRaiz(d, tabla) {
    const quitar = () => { d.querySelectorAll('.rmd-reglas-aviso').forEach((x) => x.remove()); d.__rmdReglasFirma = ''; d.__rmdReglasRes = null; };
    if (typeof sap === 'undefined' || !reglasVivas()) { if (d.__rmdReglasFirma || d.querySelector('.rmd-reglas-aviso')) quitar(); return; }
    const vista = vistaDeTabla(tabla), asoc = vista && vista.getModel('asociarDatos'), md = asoc && asoc.getData(), modelo = vista && vista.getModel('mainModelv2');
    if (!md || !md.mdId || !modelo) return;
    const firma = `${md.mdId}|${firmaReglas()}|${generacionRmd}`, prev = d.__rmdReglasFirma || '';
    if (prev !== firma && dialogos().pop() === d) {                      // (con otra ventana encima se espera a volver al RMD)
      const soloReglas = prev.startsWith(md.mdId + '|') && prev.endsWith('|' + generacionRmd);   // cambiaron las reglas: basta con reevaluar
      d.__rmdReglasFirma = firma;
      textosDelRmd(modelo, md, !prev.startsWith(md.mdId + '|') ? 60000 : soloReglas ? 3600000 : 0).then((base) => {
        if (!d.isConnected || d.__rmdReglasFirma !== firma) return;
        const comp = reglasCompiladas(), ctx = ctxReglas();
        const res = Reglas.evaluarConjunto(base.textos, comp, ctx), resEq = Reglas.evaluarEquipos(base.equipos || [], comp, ctx);
        const docs = [...new Set(base.textos.flatMap((x) => Reglas.codigosDocumento(x.texto)))];
        d.__rmdReglasRes = { res, resEq, base, docs };
        window.__rmdStats.reglasRaiz = { rmd: base.rmd, avisos: res.avisos, faltan: res.faltan.map((f) => f.texto), marcas: res.marcas, documentos: docs.length, noVigentes: RR.mapa ? docs.filter((c) => !RR.mapa.has(c)) : null,
          equipos: (base.equipos || []).length, equiposConAviso: resEq.items.filter((it) => it.avisos.length).map((it) => [base.equipos[it.i].codigo || base.equipos[it.i].sap, it.marcas[0].etiqueta]) };
        pintarAvisoReglas(d, tabla);
      }, () => { /* sin conexión: queda sin aviso hasta el próximo cambio */ });
    } else if (d.__rmdReglasRes && !d.querySelector('.rmd-reglas-aviso')) pintarAvisoReglas(d, tabla);   // UI5 volvió a dibujar la tabla
  }
  function pintarAvisoReglas(d, tabla) {
    const x = d.__rmdReglasRes; if (!x) return;
    const { res, docs } = x, resEq = x.resEq || { items: [], avisos: 0 }, nAv = res.avisos + res.faltan.length + resEq.avisos;
    let a = d.querySelector('.rmd-reglas-aviso');
    if (!a) {
      a = document.createElement('div'); a.className = 'rmd-reglas-aviso'; tabla.insertAdjacentElement('beforebegin', a);
      a.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-a]'); if (!b) return; e.stopPropagation();
        if (b.dataset.a === 'ver') abrirDetalleReglas(d); else abrirReglas();
      });
    }
    let h;
    if (nAv) {
      const grupos = new Map();
      res.items.concat(resEq.items).forEach((it) => it.avisos.forEach((av) => { let g = grupos.get(av.regla); if (!g) grupos.set(av.regla, g = { nombre: av.nombre, n: 0, valores: new Set() }); g.n++; g.valores.add(av.valor); }));
      const partes = [...grupos.values()].map((g) => `<b>${esc(g.nombre)}</b>: ${g.n}${g.valores.size ? ` (${[...g.valores].slice(0, 4).map(esc).join(', ')}${g.valores.size > 4 ? '…' : ''})` : ''}`)
        .concat(res.faltan.map((f) => `<b>Falta</b> — ${esc(f.texto)}`));
      h = `⚠ Reglas de revisión · ${partes.join(' · ')}<button type="button" data-a="ver">Ver detalle</button>`;
    } else {
      const noVig = RR.mapa ? docs.filter((c) => !RR.mapa.has(c)).length : 0, eqs = x.base.equipos || [];
      const eqCal = RR.mapaCalif ? eqs.filter((e) => (infoCalif(e) || {}).ok).length : 0, eqNo = RR.mapaCalif ? eqs.filter((e) => !infoCalif(e)).length : 0;
      h = `✓ Reglas de revisión: sin advertencias${RR.mapa && docs.length ? ` · ${docs.length} documento(s) citado(s)${noVig ? `, ${noVig} fuera de la lista de vigentes` : ', todos en la lista de vigentes'}` : ''}`
        + `${RR.mapaCalif && eqs.length ? ` · ${eqs.length} equipo(s): ${eqCal} calificado(s)${eqNo ? `, ${eqNo} no figura(n) en la lista de calificación` : ''}` : ''}<button type="button" data-a="ver">Ver detalle</button>`;
    }
    a.classList.toggle('ok', !nAv);
    if (a.dataset.html !== h) { a.dataset.html = h; a.innerHTML = h; }
    a.title = 'Según tus reglas de revisión (botón de mejoras › Reglas de revisión). Es solo un aviso: no cambia nada ni impide autorizar.';
  }
  // Detalle: cada texto con advertencias (resaltado), dónde está y, abajo, lo que solo se resalta
  function abrirDetalleReglas(d) {
    const x = d.__rmdReglasRes; if (!x) return;
    const { res, base } = x, resEq = x.resEq || { items: [], avisos: 0 }, v = ventana(`Reglas de revisión — ${cabecera(d)}`, { cancelar: () => v.cerrar() });
    v.fondo.querySelector('.rmd-modal').classList.add('rmd-reglas-detalle');
    const nombreRegla = new Map(reglasActuales().map((r) => [r.id, r.nombre]));
    const donde = (l) => `${l.lista} › paso ${l.paso}${l.pm ? ' › proceso menor ' + l.pm : ''}`;
    const pintarTabla = (conResaltados) => {
      const items = res.items.filter((it) => conResaltados || it.avisos.length), itemsEq = resEq.items.filter((it) => conResaltados || it.avisos.length);
      const cont = v.cuerpo.querySelector('.rmd-rd-tabla'); cont.innerHTML = '';
      if (!items.length && !itemsEq.length && !res.faltan.length) { cont.innerHTML = `<p class="rmd-nota">${conResaltados ? 'Ninguna regla encontró nada en este RMD.' : 'Sin advertencias. Marca «Ver también lo que solo se resalta» para ver el resto.'}</p>`; return; }
      const t = document.createElement('table'); t.className = 'rmd-tabla'; t.innerHTML = '<thead><tr><th>Regla</th><th>Dónde</th><th>Texto</th></tr></thead><tbody></tbody>';
      const tb = t.querySelector('tbody');
      res.faltan.forEach((f) => { const tr = document.createElement('tr'); tr.innerHTML = `<td><b>${esc(f.nombre)}</b></td><td class="rmd-nota">Todo el RMD</td><td class="rmd-vig-no">${esc(f.texto)}</td>`; tb.appendChild(tr); });
      itemsEq.forEach((it) => {                                            // equipos de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES
        const e = base.equipos[it.i], tr = document.createElement('tr'), texto = `${e.codigo || e.sap} — ${e.desc}`;
        tr.innerHTML = `<td>${[...new Set(it.marcas.map((m) => nombreRegla.get(m.regla) || m.regla))].map((n) => `<div>${it.avisos.some((a) => a.nombre === n) ? '⚠ ' : ''}${esc(n)}</div>`).join('')}</td>
          <td class="rmd-nota">EQUIPOS / INSTRUMENTOS / MATERIALES › orden ${esc(e.orden)}<div>SAP ${esc(e.sap || '—')}</div></td><td></td>`;
        const span = document.createElement('div'); span.className = 'rmd-rg-texto'; span.textContent = texto; pintarMarcas(span, [{ ...it.marcas[0], ini: 0, fin: (e.codigo || e.sap).length, titulo: it.marcas.map((m) => m.titulo).join('\n') }]); tr.lastElementChild.appendChild(span);
        if (it.avisos.length) { const p = document.createElement('div'); p.className = 'rmd-nota'; p.textContent = it.avisos.map((a) => a.texto).join(' · '); tr.lastElementChild.appendChild(p); }
        tb.appendChild(tr);
      });
      items.slice(0, 400).forEach((it) => {
        const tx = base.textos[it.i], tr = document.createElement('tr');
        const reglas = [...new Set(it.marcas.map((m) => nombreRegla.get(m.regla) || m.regla))];
        tr.innerHTML = `<td>${reglas.map((n) => `<div>${it.avisos.some((a) => a.nombre === n) ? '⚠ ' : ''}${esc(n)}</div>`).join('')}</td><td class="rmd-nota">${esc(donde(tx.lugar))}${tx.esPM ? `<div>${esc(tx.lugar.codigoPM)}</div>` : `<div>${esc(tx.lugar.codigoPaso)}</div>`}</td><td></td>`;
        const span = document.createElement('div'); span.className = 'rmd-rg-texto'; span.textContent = tx.texto; pintarMarcas(span, it.marcas); tr.lastElementChild.appendChild(span);
        if (it.avisos.length) { const p = document.createElement('div'); p.className = 'rmd-nota'; p.textContent = it.avisos.map((a) => a.texto).join(' · '); tr.lastElementChild.appendChild(p); }
        tb.appendChild(tr);
      });
      cont.appendChild(t);
      if (items.length > 400) cont.insertAdjacentHTML('beforeend', `<p class="rmd-nota">…y ${items.length - 400} textos más (están todos en el Excel).</p>`);
    };
    const nAv = res.avisos + res.faltan.length + resEq.avisos, soloMarca = res.items.filter((it) => !it.avisos.length).length + resEq.items.filter((it) => !it.avisos.length).length;
    v.cuerpo.innerHTML = `<p><b>${nAv}</b> advertencia(s) en ${base.pasos} pasos, ${base.pms} procesos menores de ${base.listas.length} listas y ${(base.equipos || []).length} equipo(s) de la estructura${res.faltan.length ? ` (${res.faltan.length} por algo que falta)` : ''}.${RR.vigentes ? ` Lista de vigentes: «${esc(RR.vigentes.archivo)}», cargada el ${esc(fechaHoraCorta(RR.vigentes.cargado))}.` : ''}${RR.calif ? ` Lista de equipos calificados: «${esc(RR.calif.archivo)}», cargada el ${esc(fechaHoraCorta(RR.calif.cargado))}.` : ''}</p>
      <label class="rmd-rg-check"><input type="checkbox" class="rmd-rd-todos" ${nAv ? '' : 'checked'}> Ver también lo que solo se resalta (${soloMarca})</label><div class="rmd-rd-tabla"></div>`;
    const chk = v.cuerpo.querySelector('.rmd-rd-todos'); chk.addEventListener('change', () => pintarTabla(chk.checked)); pintarTabla(chk.checked);
    const bX = botonModal('Descargar Excel', '', async () => {
      bX.disabled = true;
      try { descargarArchivo(`Reglas de revisión ${base.rmd}.xlsx`, await armarReglasExcel(d, x).generar(), TIPO_XLSX); }
      catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); } finally { bX.disabled = false; }
    });
    v.pie.append(botonModal('Configurar reglas…', '', () => { v.cerrar(); abrirReglas(); }), bX, botonModal('Cerrar', 'primario', () => v.cerrar()));
  }
  function armarReglasExcel(d, x) {
    const { res, base } = x, resEq = x.resEq || { items: [] }, libro = Xlsx.crearLibro(), nombreRegla = new Map(reglasActuales().map((r) => [r.id, r.nombre])), num = (t) => (/^\d+$/.test(t || '') ? +t : t);
    const cab = ['Regla', 'Encontrado', 'Advertencia', 'Lista', 'Paso', 'Proceso menor', 'Código del paso', 'Texto'], filas = [];
    res.faltan.forEach((f) => filas.push([f.nombre, '', f.texto, 'Todo el RMD', '', '', '', '']));
    resEq.items.forEach((it) => { const e = base.equipos[it.i]; it.marcas.forEach((m) => { const av = it.avisos.find((a) => a.regla === m.regla); filas.push([nombreRegla.get(m.regla) || m.regla, m.valor, av ? av.texto : m.titulo, 'EQUIPOS / INSTRUMENTOS / MATERIALES', num(String(e.orden)), '', e.sap, e.desc]); }); });
    res.items.forEach((it) => {
      const tx = base.textos[it.i], l = tx.lugar;
      it.marcas.forEach((m) => { const av = it.avisos.find((a) => a.regla === m.regla && a.valor === m.valor); filas.push([nombreRegla.get(m.regla) || m.regla, m.valor, av ? av.texto : '', l.lista, num(l.paso), num(l.pm), tx.esPM ? l.codigoPM : l.codigoPaso, tx.texto]); });
    });
    const h = libro.hoja('Reglas de revisión', { activa: true, congelar: 'A2', filtro: `A1:H${Math.max(2, filas.length + 1)}`, cols: [[1, 1, 28], [2, 2, 16], [3, 3, 50], [4, 4, 36], [5, 6, 9], [7, 7, 13], [8, 8, 90]] });
    cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'encabezado'));
    filas.forEach((f, i) => f.forEach((v, c) => { if (v !== '' && v != null) h.poner({ c, r: i + 1 }, v, c === 7 || c === 2 ? 'envuelto' : 'celda'); }));
    const hI = libro.hoja('Información', { cols: [[1, 1, 30], [2, 2, 90]] });
    hI.poner('A1', `Reglas de revisión — ${cabecera(d)}`, 'titulo');
    [['Generado', fechaHoraCorta(new Date().toISOString())], ['Advertencias', res.avisos + res.faltan.length + (x.resEq ? x.resEq.avisos : 0)], ['Pasos / procesos menores / equipos revisados', `${base.pasos} / ${base.pms} / ${(base.equipos || []).length}`],
      ['Lista de documentos vigentes', RR.vigentes ? `${RR.vigentes.archivo} (${RR.vigentes.docs.length} documentos, cargada el ${fechaHoraCorta(RR.vigentes.cargado)})` : 'sin cargar'],
      ['Lista de equipos calificados', RR.calif ? `${RR.calif.archivo} (${RR.calif.equipos.length} filas, cargada el ${fechaHoraCorta(RR.calif.cargado)}; cuentan como calificados: ${(RR.calif.estadosOk || Reglas.ESTADOS_OK).join(', ')})` : 'sin cargar'],
      ...reglasActuales().filter((r) => r.activa).map((r, i) => [i ? '' : 'Reglas activas', `${r.nombre}: ${Reglas.resumen(r)}`])]
      .forEach(([a, b], i) => { if (a) hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return libro;
  }
  const fechaHoraCorta = (iso) => { const t = new Date(iso); if (isNaN(t)) return String(iso || ''); const dd = (n) => String(n).padStart(2, '0'); return `${dd(t.getDate())}/${dd(t.getMonth() + 1)}/${t.getFullYear()} ${dd(t.getHours())}:${dd(t.getMinutes())}`; };
  const diasDesde = (iso) => { const t = Date.parse(iso); return isNaN(t) ? 0 : Math.floor((Date.now() - t) / 86400000); };
  const infoVigente = (codigo) => (RR.mapa ? RR.mapa.get(Reglas.normalizarCodigo(codigo)) || null : null);
  // un equipo del RMD en la lista de calificados: por su "Código de referencia" (CodigoGaci) o, si no, por su código SAP
  const infoCalif = (e) => (RR.mapaCalif ? (e.codigo && RR.mapaCalif.porCodigo.get(Reglas.normalizarCodigo(e.codigo))) || (e.sap && RR.mapaCalif.porSap.get(sinCeros(e.sap))) || null : null);

  // ---- lista de documentos vigentes: leer el archivo (.xls del DMS, .xlsx, .csv o una tabla HTML/XML guardada como .xls) ----
  const textoDeBytes = (u8) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { return new TextDecoder('windows-1252').decode(u8); } };
  function filasDeMarcado(texto) {
    const xml = /<Workbook\b/i.test(texto) && /urn:schemas-microsoft-com:office:spreadsheet/i.test(texto), doc = new DOMParser().parseFromString(texto, xml ? 'text/xml' : 'text/html');
    const hojas = [...doc.getElementsByTagName('Worksheet')];
    if (hojas.length) return hojas.map((w) => ({ hoja: w.getAttribute('ss:Name') || 'Hoja', filas: [...w.getElementsByTagName('Row')].map((row) => {
      const f = []; let c = 0; [...row.getElementsByTagName('Cell')].forEach((cell) => { const i = +(cell.getAttribute('ss:Index') || 0); if (i) c = i - 1; const dt = cell.getElementsByTagName('Data')[0]; f[c] = dt ? dt.textContent : ''; c++; });
      return f; }) }));
    return [...doc.querySelectorAll('table')].map((t, i) => ({ hoja: `Tabla ${i + 1}`, filas: [...t.rows].map((r) => [...r.cells].map((c) => c.textContent)) }));
  }
  async function filasDeArchivo(u8, archivo) {
    if (u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0) { const l = Xlsx.leerXls(u8); return l.hojas.map((h) => ({ hoja: h, filas: l.filas(h) || [] })); }
    if (u8[0] === 0x50 && u8[1] === 0x4B) { const l = await Xlsx.leerLibro(u8), out = []; for (const h of l.hojas) out.push({ hoja: h, filas: (await l.filas(h)) || [] }); return out; }
    const texto = textoDeBytes(u8);
    if (/^\s*</.test(texto)) return filasDeMarcado(texto);
    return [{ hoja: archivo, filas: Reglas.csvAFilas(texto) }];
  }
  async function leerListaVigentes(u8, archivo) {
    let mejor = null;
    (await filasDeArchivo(u8, archivo)).forEach((h) => { const l = Reglas.listaVigentesDeFilas(h.filas); if (l.docs.length && (!mejor || l.docs.length > mejor.docs.length)) mejor = { ...l, hoja: h.hoja }; });
    if (!mejor) throw new Error('no se encontró una columna con códigos de documento (por ejemplo «Identificador» o «Código»)');
    return { archivo, hoja: mejor.hoja, columna: mejor.columnas.codigo || '', n: mejor.docs.length, estados: mejor.estados, duplicados: mejor.duplicados, docs: mejor.docs };
  }
  // Lista de equipos calificados: la hoja "Cronograma" (o, si no está, la que tenga la columna "ESTADO GENERAL" y los códigos)
  async function leerListaCalificados(u8, archivo) {
    const hojas = (await filasDeArchivo(u8, archivo)).sort((a, b) => (/cronograma/i.test(b.hoja) ? 1 : 0) - (/cronograma/i.test(a.hoja) ? 1 : 0));
    for (const h of hojas) {
      const l = Reglas.listaCalificadosDeFilas(h.filas);
      if (l.equipos.length) return { archivo, hoja: h.hoja, columna: l.columnas.general || '', columnas: l.columnas, n: l.equipos.length, estados: l.estados, estadosOk: ((RR.calif && RR.calif.estadosOk) || Reglas.ESTADOS_OK).slice(), equipos: l.equipos };
    }
    throw new Error('no se encontró una hoja con la columna «ESTADO GENERAL» y los códigos de equipo («CODIGO MIF» o «CÓDIGO SAP»)');
  }
  function exportarConfiguracion() {
    const hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), nombre = `Reglas de revisión RMD ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.json`;
    const obj = Reglas.paraExportar(reglasActuales(), RR.vigentes, { exportado: hoy.toISOString(), script: VERSION, ...(RR.calif ? { calificados: RR.calif } : {}) });
    // legible en un editor de texto: las reglas con sangría y cada documento o equipo de las listas en su propia línea
    const marca = '@@' + Math.random().toString(36).slice(2) + '_', filasDe = { docs: obj.vigentes && obj.vigentes.docs, equipos: obj.calificados && obj.calificados.equipos };
    const txt = JSON.stringify(obj, (k, v) => ((k === 'docs' || k === 'equipos') && Array.isArray(v) ? v.map((x, i) => `${marca}${k}_${i}`) : v), 2)
      .replace(new RegExp(`"${marca}(docs|equipos)_(\\d+)"`, 'g'), (_, k, i) => JSON.stringify(filasDe[k][+i]));
    descargarArchivo(nombre, txt, 'application/json');
    const listas = [obj.vigentes && `la lista de ${obj.vigentes.docs.length.toLocaleString('es-PE')} documentos vigentes`, obj.calificados && `la de ${obj.calificados.equipos.length.toLocaleString('es-PE')} equipos calificados`].filter(Boolean);
    toast(`Descargado «${nombre}»: ${obj.reglas.length} regla(s)${listas.length ? ' y ' + listas.join(' y ') : ''}. En otra PC: «Importar configuración».`);
    return { nombre, texto: txt };
  }

  // ---- ventana "Reglas de revisión" ----
  let ventanaReglas = null;
  function refrescarVentanaReglas() { if (ventanaReglas && ventanaReglas.fondo.isConnected) ventanaReglas.refrescar(); }
  const AYUDA_BUSCAR = {
    frase: 'Una o varias palabras o frases, separadas por «;» o en líneas distintas. Sin importar tildes ni mayúsculas. * = cualquier terminación (limpi* → limpiar, limpieza).',
    documento: 'Vacío = cualquier código de documento (IPRO-P123, FPRO-250, POL-CAL-001, MCAL-200…). O escribe códigos separados por «;»; * = cualquier continuación (IPRO-*).',
    equipo: 'Vacío = cualquier código de equipo: con Calificación «Cualquier equipo», los del catálogo del portal; con los otros filtros, los de la lista de equipos calificados. O escribe códigos separados por «;» (PL1-LIQ-E023; PL1-GV1-*). Etiqueta {estado} = su estado en la lista.',
    patron: 'Expresión regular de JavaScript (para usuarios avanzados). Ej.: \\d+\\s?°C marca temperaturas como «25 °C».',
  };
  function abrirReglas(pestana) {
    if (ventanaReglas && ventanaReglas.fondo.isConnected) { ventanaReglas.irA(pestana || 'reglas'); return; }
    registrarExternosUI5();
    let vista = ['vigentes', 'calificados'].includes(pestana) ? pestana : 'reglas', editando = null, sucio = false, importando = null, cargandoVig = null, cargandoCal = null, consulta = '', consultaCal = '';
    const esArriba = () => [...document.querySelectorAll('.rmd-modal-fondo')].pop() === v.fondo;
    const v = ventana('Reglas de revisión', { cancelar: () => { if (esArriba()) salir(); } });
    const tarjeta = v.fondo.querySelector('.rmd-modal'), h3 = tarjeta.querySelector('h3');
    tarjeta.classList.add('rmd-reglas'); v.fondo.classList.add('rmd-reglas-fondo');
    const tabs = document.createElement('div'); tabs.className = 'rmd-rg-tabs'; tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = '<button type="button" role="tab" data-p="reglas">Reglas <span></span></button><button type="button" role="tab" data-p="vigentes">Documentos vigentes <span></span></button><button type="button" role="tab" data-p="calificados">Equipos calificados <span></span></button>';
    h3.insertAdjacentElement('afterend', tabs);
    const archivo = document.createElement('input'); archivo.type = 'file'; archivo.hidden = true; archivo.className = 'rmd-rg-archivo'; tarjeta.appendChild(archivo);
    let alElegir = null;
    const elegirArchivo = (acepta, fn) => { archivo.value = ''; archivo.accept = acepta; alElegir = fn; archivo.click(); };
    archivo.addEventListener('change', () => { const f = archivo.files && archivo.files[0]; if (f && alElegir) alElegir(f); });
    const q = (sel) => v.cuerpo.querySelector(sel);
    function salir() {
      if (vista === 'editor' && sucio) {
        confirmar('¿Descartar los cambios?', 'La regla que estás editando tiene cambios sin guardar.', '', { si: 'Descartar', no: 'Seguir editando', peligro: true }).then((s) => { if (s) { sucio = false; v.cerrar(); ventanaReglas = null; } });
        return;
      }
      v.cerrar(); ventanaReglas = null;
    }
    const ir = (p) => { if (vista === 'editor' && sucio) { confirmar('¿Descartar los cambios?', 'La regla que estás editando tiene cambios sin guardar.', '', { si: 'Descartar', no: 'Seguir editando', peligro: true }).then((s) => { if (s) { sucio = false; vista = p; pintar(); } }); return; } vista = p; pintar(); };
    tabs.addEventListener('click', (e) => { const b = e.target.closest('button[data-p]'); if (b) ir(b.dataset.p); });
    // soltar un archivo en la ventana: .json = importar configuración; .xls / .xlsx / .csv = lista de vigentes
    ['dragenter', 'dragover'].forEach((ev) => v.fondo.addEventListener(ev, (e) => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); tarjeta.classList.add('rmd-rg-soltar'); }));
    v.fondo.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !v.fondo.contains(e.relatedTarget)) tarjeta.classList.remove('rmd-rg-soltar'); });
    v.fondo.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; tarjeta.classList.remove('rmd-rg-soltar'); if (!f) return; e.preventDefault(); if (vista !== 'editor') abrirArchivo(f); });

    // .json = configuración exportada; una hoja con "ESTADO GENERAL" = lista de equipos calificados; si no, lista de documentos vigentes
    async function abrirArchivo(f) {
      try {
        const u8 = new Uint8Array(await f.arrayBuffer()), ini = textoDeBytes(u8.subarray(0, 200)).replace(/^﻿/, '').trimStart();
        if (/\.json$/i.test(f.name) || ini.startsWith('{') || ini.startsWith('[')) { importando = { archivo: f.name, ...Reglas.leerExportado(JSON.parse(textoDeBytes(u8).replace(/^﻿/, ''))) }; vista = 'importar'; pintar(); return; }
        let lc = null; try { lc = await leerListaCalificados(u8, f.name); } catch (e) { lc = null; }
        if (lc) {
          const antes = RR.mapaCalif ? RR.mapaCalif.porCodigo : null, ahora = Reglas.mapaCalificados(lc, lc.estadosOk).porCodigo;
          cargandoCal = { ...lc, nuevos: antes ? [...ahora.keys()].filter((c) => !antes.has(c)).length : ahora.size, salen: antes ? [...antes.keys()].filter((c) => !ahora.has(c)).length : 0,
            cambian: antes ? [...ahora.entries()].filter(([c, x]) => antes.has(c) && antes.get(c).ok !== x.ok).length : 0, sinCalificar: [...ahora.values()].filter((x) => !x.ok).length, codigos: ahora.size };
          vista = 'cargarCalif'; pintar(); return;
        }
        const lv = await leerListaVigentes(u8, f.name), antes = RR.vigentes ? new Set(RR.vigentes.docs.map((d) => d[0])) : null, ahora = new Set(lv.docs.map((d) => d[0]));
        cargandoVig = { ...lv, nuevos: antes ? lv.docs.filter((d) => !antes.has(d[0])).length : lv.n, salen: antes ? [...antes].filter((c) => !ahora.has(c)).length : 0 }; vista = 'cargarVig'; pintar();
      } catch (e) { toast(`No se pudo leer «${f.name}»: ${e.message}`, true); }
    }
    function pintar() {
      const pest = vista === 'vigentes' || vista === 'cargarVig' ? 'vigentes' : vista === 'calificados' || vista === 'cargarCalif' ? 'calificados' : 'reglas';
      tabs.querySelectorAll('button').forEach((b) => { const act = b.dataset.p === pest; b.classList.toggle('activa', act); b.setAttribute('aria-selected', String(act)); });
      tabs.querySelector('[data-p=reglas] span').textContent = `(${reglasActuales().length})`;
      tabs.querySelector('[data-p=vigentes] span').textContent = RR.vigentes ? `(${RR.vigentes.docs.length.toLocaleString('es-PE')})` : '';
      tabs.querySelector('[data-p=calificados] span').textContent = RR.calif ? `(${RR.calif.equipos.length.toLocaleString('es-PE')})` : '';
      tabs.style.display = vista === 'editor' || vista === 'importar' ? 'none' : '';
      h3.textContent = vista === 'editor' ? (editando.nueva ? 'Nueva regla de revisión' : `Editar regla — ${editando.regla.nombre || ''}`) : vista === 'importar' ? 'Importar configuración'
        : vista === 'cargarVig' ? 'Cargar la lista de documentos vigentes' : vista === 'cargarCalif' ? 'Cargar la lista de equipos calificados' : 'Reglas de revisión';
      v.pie.innerHTML = ''; v.fondo.__ctrlS = null; v.cuerpo.oninput = null; v.cuerpo.onchange = null;
      ({ reglas: pintarLista, editor: pintarEditor, vigentes: pintarVigentes, calificados: pintarCalificados, importar: pintarImportar, cargarVig: pintarCargaVig, cargarCalif: pintarCargaCalif })[vista]();
      if (['reglas', 'vigentes', 'calificados'].includes(vista)) {             // "Restablecer todo" en el pie de las tres pestañas
        const bT = botonModal('Restablecer todo…', 'peligro', () => restablecerTodo()); bT.title = 'Vuelve todo a como venía: reglas predeterminadas y sin listas cargadas';
        v.pie.insertBefore(bT, v.pie.lastElementChild);
      }
    }
    // -- lista de reglas --
    function pintarLista() {
      const comp = reglasCompiladas(), reglas = reglasActuales(), activas = reglas.filter((r) => r.activa).length;
      v.cuerpo.innerHTML = `<p class="rmd-nota">Se aplican solas al revisar el RMD: resaltan en la descripción de los pasos y procesos menores (al pasar el ratón se ve el motivo), sus advertencias se suman al aviso de la barra de cada lista («ir a la siguiente») y la ventana del RMD muestra un resumen de todo el RMD. La de más arriba tiene prioridad si dos marcan lo mismo.</p>
        <div class="rmd-rg-barra"><button type="button" class="rmd-btn primario" data-a="nueva">+ Nueva regla</button><span class="rmd-rg-esp"></span>
          <button type="button" class="rmd-btn" data-a="exportar" title="Descarga un archivo .json con tus reglas${RR.vigentes || RR.calif ? ' y las listas cargadas' : ''}: para guardarlo o usarlo en otra PC">Exportar configuración</button>
          <button type="button" class="rmd-btn" data-a="importar" title="Carga un archivo .json exportado antes (también puedes soltarlo en esta ventana)">Importar configuración</button>
          <button type="button" class="rmd-btn" data-a="restablecer" title="Vuelve a poner las reglas predeterminadas">Restablecer predeterminadas</button></div>
        <div class="rmd-rg-lista" role="list"></div>`;
      const lista = q('.rmd-rg-lista');
      if (!reglas.length) lista.innerHTML = '<p class="rmd-rg-vacio rmd-nota">No tienes reglas. Crea una con «+ Nueva regla» o pulsa «Restablecer predeterminadas».</p>';
      reglas.forEach((r, i) => {
        const c = comp[i] || {}, f = document.createElement('div'); f.className = 'rmd-rg-fila' + (r.activa ? '' : ' inactiva'); f.dataset.id = r.id; f.setAttribute('role', 'listitem');
        const nota = c.error ? `<div class="rmd-rg-error">⚠ ${esc(c.error)}</div>`
          : r.activa && c.necesita === 'vigentes' ? '<div class="rmd-rg-falta">Necesita la lista de documentos vigentes: <button type="button" class="rmd-rg-link" data-a="ir-vigentes">cárgala aquí</button>.</div>'
          : r.activa && c.necesita === 'calificados' ? '<div class="rmd-rg-falta">Necesita la lista de equipos calificados: <button type="button" class="rmd-rg-link" data-a="ir-calificados">cárgala aquí</button>.</div>'
          : r.activa && c.necesita === 'catalogo' ? '<div class="rmd-rg-falta">Leyendo el catálogo de equipos del portal… (hace falta tener abierta la lista principal)</div>' : '';
        f.innerHTML = `<label class="rmd-switch" title="${r.activa ? 'Activa: pulsa para desactivarla' : 'Inactiva: pulsa para activarla'}"><input type="checkbox" data-a="activa" ${r.activa ? 'checked' : ''} aria-label="Regla activa"><span></span></label>
          <span class="rmd-rg-color rmd-c-${r.color}" title="Color: ${Reglas.COLORES[r.color]}"></span>
          <div class="rmd-rg-info" data-a="editar" title="Editar la regla"><div><b>${esc(r.nombre)}</b>${r.etiqueta ? `<span class="rmd-rg-etq rmd-c-${r.color}">${esc(r.etiqueta)}</span>` : ''}${r.predeterminada ? '<span class="rmd-rg-pred">predeterminada</span>' : ''}</div><div class="rmd-nota">${esc(Reglas.resumen(r))}</div>${nota}</div>
          <div class="rmd-rg-acc"><button type="button" data-a="subir" title="Subir (más prioridad)" ${i ? '' : 'disabled'}>↑</button><button type="button" data-a="bajar" title="Bajar (menos prioridad)" ${i < reglas.length - 1 ? '' : 'disabled'}>↓</button><button type="button" data-a="editar" title="Editar">✎</button><button type="button" data-a="duplicar" title="Duplicar">⧉</button><button type="button" data-a="eliminar" class="peligro" title="Eliminar">✕</button></div>`;
        lista.appendChild(f);
      });
      const est = document.createElement('span'); est.className = 'rmd-rg-estado';
      est.textContent = RR.errorGuardar || `${reglas.length} regla(s), ${activas} activa(s)${on('reglasrev') ? '' : ' — «Reglas de revisión» está apagado en el panel de mejoras'} · se guardan solo en este navegador`;
      v.pie.append(est, botonModal('Cerrar', 'primario', () => salir()));
    }
    v.cuerpo.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT' || !v.cuerpo.contains(b)) return;
      const a = b.dataset.a, fila = b.closest('.rmd-rg-fila'), reglas = reglasActuales().slice(), i = fila ? reglas.findIndex((r) => r.id === fila.dataset.id) : -1;
      if (a === 'nueva') { editando = { nueva: true, regla: { id: Reglas.nuevoId(), nombre: '', activa: true, tipo: 'frase', buscar: '', palabraCompleta: true, condicion: 'marcar', accion: 'resaltar', color: 'amarillo', donde: 'todo', vigencia: 'todos' }, accionTocada: false }; sucio = false; vista = 'editor'; pintar(); setTimeout(() => { const n = q('[data-k=nombre]'); if (n) n.focus(); }, 30); }
      else if (a === 'exportar') exportarConfiguracion();
      else if (a === 'importar') elegirArchivo('.json,application/json', abrirArchivo);
      else if (a === 'restablecer') restablecer();
      else if (a === 'ir-vigentes') ir('vigentes');
      else if (a === 'ir-calificados') ir('calificados');
      else if (a === 'cargar' || a === 'cargar-calif') elegirArchivo('.xls,.xlsx,.csv,.txt', abrirArchivo);
      else if (a === 'restablecer-vig') {
        if (!RR.vigentes) return;
        if (await confirmar('¿Restablecer los documentos vigentes?', `Se quita de este navegador la lista «${RR.vigentes.archivo}» (${RR.vigentes.docs.length} documentos) y queda como al principio, sin lista.`, 'Sin lista no se puede saber qué documentos citados están vigentes. Puedes volver a cargarla cuando quieras.', { si: 'Restablecer', no: 'Cancelar', peligro: true })) { await guardarVigentes(null); toast('Documentos vigentes restablecidos: sin lista cargada.'); }
      } else if (a === 'restablecer-calif') {
        if (!RR.calif) return;
        if (await confirmar('¿Restablecer los equipos calificados?', `Se quita de este navegador la lista «${RR.calif.archivo}» (${RR.calif.equipos.length} filas) y los estados que cuentan como calificados vuelven a ${Reglas.ESTADOS_OK.join(' y ')}.`, 'Sin lista no se puede avisar de los equipos sin calificación. Puedes volver a cargarla cuando quieras.', { si: 'Restablecer', no: 'Cancelar', peligro: true })) { await guardarCalificados(null); toast('Equipos calificados restablecidos: sin lista cargada.'); }
      } else if (a === 'estados-ok') {
        const inp = q('.rmd-rg-estados-ok'), lista = Reglas.partir(inp.value.replace(/,/g, ';')).map((x) => x.toUpperCase());
        if (!lista.length) { toast('Escribe al menos un estado (por ejemplo CALIFICADO).', true); return; }
        await guardarCalificados({ ...RR.calif, estadosOk: lista }); toast(`Cuentan como calificados: ${lista.join(', ')}.`);
      } else if (i >= 0) {
        if (a === 'editar') { editando = { nueva: false, regla: { ...reglas[i] }, accionTocada: true }; sucio = false; vista = 'editor'; pintar(); }
        else if (a === 'subir' && i > 0) { [reglas[i - 1], reglas[i]] = [reglas[i], reglas[i - 1]]; await guardarReglas(reglas); }
        else if (a === 'bajar' && i < reglas.length - 1) { [reglas[i + 1], reglas[i]] = [reglas[i], reglas[i + 1]]; await guardarReglas(reglas); }
        else if (a === 'duplicar') { const c = { ...reglas[i], id: Reglas.nuevoId(), nombre: nombreLibre(`${reglas[i].nombre} (copia)`, reglas) }; delete c.predeterminada; reglas.splice(i + 1, 0, c); await guardarReglas(reglas); toast(`Regla duplicada: «${c.nombre}».`); }
        else if (a === 'eliminar') {
          if (await confirmar('¿Eliminar la regla?', `«${reglas[i].nombre}» se borra de este navegador.`, reglas[i].predeterminada ? 'Es predeterminada: «Restablecer predeterminadas» la vuelve a poner.' : 'Si la exportaste antes, puedes volver a importarla.', { si: 'Eliminar', no: 'Cancelar', peligro: true })) {
            const nombre = reglas[i].nombre; reglas.splice(i, 1); await guardarReglas(reglas); toast(`Regla «${nombre}» eliminada.`);
          }
        }
      }
    });
    v.cuerpo.addEventListener('change', async (e) => {
      const t = e.target; if (vista !== 'reglas' || t.dataset.a !== 'activa') return;
      const fila = t.closest('.rmd-rg-fila'), reglas = reglasActuales().slice(), i = reglas.findIndex((r) => r.id === fila.dataset.id); if (i < 0) return;
      reglas[i] = { ...reglas[i], activa: t.checked }; await guardarReglas(reglas);
    });
    const mismoNombre = (a, b) => Reglas.plegar(a).p === Reglas.plegar(b).p;
    function nombreLibre(nombre, reglas, id) { let n = nombre, k = 2; while (reglas.some((r) => r.id !== id && mismoNombre(r.nombre, n))) n = `${nombre} (${k++})`; return n; }
    // Restablecer todo: reglas predeterminadas (sin las propias) y sin listas cargadas
    function restablecerTodo() {
      const w = ventana('Restablecer todo', { cancelar: () => w.cerrar() });
      w.fondo.querySelector('.rmd-modal').classList.add('rmd-modal-aviso');
      w.cuerpo.innerHTML = `<p>Todo lo configurado en «Reglas de revisión» vuelve a como venía: solo las reglas predeterminadas, sin la lista de documentos vigentes${RR.vigentes ? ` («${esc(RR.vigentes.archivo)}»)` : ''} y sin la de equipos calificados${RR.calif ? ` («${esc(RR.calif.archivo)}»)` : ''}.</p><p class="rmd-aviso-ayuda">Se borra de este navegador. Si quieres conservarlo, antes usa «Exportar configuración».</p>`;
      const bSi = botonModal('Restablecer todo', 'peligro', async () => { w.cerrar(); await guardarReglas(Reglas.predeterminadas()); await guardarVigentes(null); await guardarCalificados(null); vista = 'reglas'; pintar(); toast('Reglas de revisión restablecidas: predeterminadas y sin listas.'); });
      w.pie.append(bSi, botonModal('Cancelar', 'primario', () => w.cerrar()));
    }
    function restablecer() {
      const w = ventana('Restablecer las reglas predeterminadas', { cancelar: () => w.cerrar() });
      w.fondo.querySelector('.rmd-modal').classList.add('rmd-modal-aviso');
      w.cuerpo.innerHTML = '<p>Las reglas predeterminadas vuelven a su configuración original (y se agregan arriba si las eliminaste).</p><p class="rmd-aviso-ayuda">Tus reglas propias se conservan, salvo que elijas borrarlas también. Las listas cargadas (documentos vigentes y equipos calificados) no cambian.</p>';
      w.pie.append(botonModal('Borrar también las mías', 'peligro', async () => { w.cerrar(); await guardarReglas(Reglas.predeterminadas()); toast('Quedaron solo las reglas predeterminadas.'); }),
        botonModal('Cancelar', '', () => w.cerrar()),
        botonModal('Restablecer', 'primario', async () => {
          w.cerrar();
          const pred = Reglas.predeterminadas(), actuales = reglasActuales(), faltan = pred.filter((p) => !actuales.some((r) => r.predeterminada === p.predeterminada));
          await guardarReglas(faltan.concat(actuales.map((r) => (r.predeterminada ? pred.find((p) => p.predeterminada === r.predeterminada) : r))));
          toast('Reglas predeterminadas restablecidas.');
        }));
    }
    // -- editor de una regla --
    function pintarEditor() {
      const r = editando.regla, op = (obj, sel) => Object.entries(obj).map(([k, t]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(t)}</option>`).join('');
      v.cuerpo.innerHTML = `<div class="rmd-rg-form">
        <h4>Regla</h4>
        <label class="rmd-rg-campo">Nombre <input type="text" data-k="nombre" maxlength="80" placeholder="Ej.: Documento no vigente" value="${esc(r.nombre || '')}"></label>
        <label class="rmd-rg-check rmd-rg-abajo"><input type="checkbox" data-k="activa" ${r.activa !== false ? 'checked' : ''}> Activa</label>
        <h4>Qué buscar</h4>
        <label class="rmd-rg-campo">Tipo <select data-k="tipo">${op(Reglas.TIPOS, r.tipo)}</select></label>
        <label class="rmd-rg-campo" data-si="documento">Vigencia <select data-k="vigencia">${op(Reglas.VIGENCIAS, r.vigencia || 'todos')}</select></label>
        <label class="rmd-rg-campo" data-si="equipo">Calificación <select data-k="calificacion">${op(Reglas.CALIFICACIONES, r.calificacion || 'todos')}</select></label>
        <label class="rmd-rg-campo ancho"><span data-titulo="buscar">Valores</span><textarea data-k="buscar" rows="2" spellcheck="false">${esc(r.buscar || '')}</textarea><small class="rmd-rg-ayuda" data-ayuda="buscar"></small></label>
        <label class="rmd-rg-check" data-si="frase"><input type="checkbox" data-k="palabraCompleta" ${r.palabraCompleta !== false ? 'checked' : ''}> Solo palabras completas</label>
        <label class="rmd-rg-check" data-si="frase patron"><input type="checkbox" data-k="mayusculas" ${r.mayusculas ? 'checked' : ''}> Distinguir mayúsculas y minúsculas</label>
        <label class="rmd-rg-check ancho" data-si="equipo"><input type="checkbox" data-k="estructura" ${r.estructura ? 'checked' : ''}> Revisar también los equipos de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES del RMD</label>
        <label class="rmd-rg-check ancho" data-si="equipo"><input type="checkbox" data-k="noFigura" ${r.noFigura ? 'checked' : ''}> En la estructura, avisar también los equipos que no figuran en la lista de calificación</label>
        <label class="rmd-rg-campo ancho">Excepto si el texto contiene <input type="text" data-k="excepto" placeholder="Opcional. Ej.: GRANEL; BIOCARGA" value="${esc(r.excepto || '')}"></label>
        <h4>Qué hacer</h4>
        <label class="rmd-rg-campo">Condición <select data-k="condicion">${op(Reglas.CONDICIONES, r.condicion)}</select></label>
        <label class="rmd-rg-campo" data-cond-no="debe">Acción <select data-k="accion">${op(Reglas.ACCIONES, r.accion)}</select></label>
        <label class="rmd-rg-check" data-cond-si="debe"><input type="checkbox" data-k="basta" ${r.basta ? 'checked' : ''}> Basta con que aparezca uno de los valores</label>
        <div class="rmd-rg-campo">Color <div class="rmd-rg-colores">${Object.entries(Reglas.COLORES).map(([k, t]) => `<label class="rmd-rg-sw rmd-c-${k}" title="${t}"><input type="radio" name="rmd-rg-color" value="${k}" ${k === (r.color || 'amarillo') ? 'checked' : ''} aria-label="${t}"><span></span></label>`).join('')}</div></div>
        <label class="rmd-rg-campo">Etiqueta visible junto a lo resaltado <input type="text" data-k="etiqueta" maxlength="18" placeholder="Opcional. Ej.: NO VIGENTE o {estado}" value="${esc(r.etiqueta || '')}" title="{estado} = el estado del equipo en la lista de calificación (EN PROCESO, PENDIENTE…)"></label>
        <label class="rmd-rg-campo ancho">Mensaje del aviso <input type="text" data-k="mensaje" maxlength="200" placeholder="Opcional: si lo dejas vacío se arma solo con el nombre de la regla" value="${esc(r.mensaje || '')}"></label>
        <p class="rmd-rg-ayuda ancho" data-cond-si="debe">Se revisa en todo el RMD: si no aparece, la ventana del RMD lo avisa como «Falta». Donde aparece, se resalta.</p>
        <h4>Dónde</h4>
        <label class="rmd-rg-campo">Revisar en <select data-k="donde">${op(Reglas.DONDE, r.donde)}</select></label>
        <label class="rmd-rg-campo">Solo en la lista <input type="text" data-k="lista" placeholder="Opcional. Ej.: PRECAUCIONES (vacío = todas)" value="${esc(r.lista || '')}"></label>
        <h4>Probar</h4>
        <label class="rmd-rg-campo ancho">Texto de prueba <textarea class="rmd-rg-prueba" rows="2" placeholder="Pega el texto de un paso para ver qué marcaría esta regla">${esc(editando.prueba || '')}</textarea></label>
        <div class="rmd-rg-res ancho"></div>
        <p class="rmd-rg-err ancho" role="alert"></p>
      </div>`;
      const leer = () => ({ ...editando.regla, nombre: q('[data-k=nombre]').value, activa: q('[data-k=activa]').checked, tipo: q('[data-k=tipo]').value, vigencia: q('[data-k=vigencia]').value,
        calificacion: q('[data-k=calificacion]').value, estructura: q('[data-k=estructura]').checked, noFigura: q('[data-k=noFigura]').checked,
        buscar: q('[data-k=buscar]').value, palabraCompleta: q('[data-k=palabraCompleta]').checked, mayusculas: q('[data-k=mayusculas]').checked, excepto: q('[data-k=excepto]').value,
        condicion: q('[data-k=condicion]').value, accion: q('[data-k=accion]').value, basta: q('[data-k=basta]').checked, color: (q('input[name=rmd-rg-color]:checked') || {}).value || 'amarillo',
        etiqueta: q('[data-k=etiqueta]').value, mensaje: q('[data-k=mensaje]').value, donde: q('[data-k=donde]').value, lista: q('[data-k=lista]').value });
      const mostrar = (x) => {
        v.cuerpo.querySelectorAll('[data-si]').forEach((el) => { el.style.display = el.dataset.si.split(' ').includes(x.tipo) ? '' : 'none'; });
        v.cuerpo.querySelectorAll('[data-cond-si]').forEach((el) => { el.style.display = x.condicion === el.dataset.condSi ? '' : 'none'; });
        v.cuerpo.querySelectorAll('[data-cond-no]').forEach((el) => { el.style.display = x.condicion === el.dataset.condNo ? 'none' : ''; });
        setTxt(q('[data-ayuda=buscar]'), AYUDA_BUSCAR[x.tipo]); setTxt(q('[data-titulo=buscar]'), x.tipo === 'patron' ? 'Patrón' : x.tipo === 'frase' ? 'Palabras o frases' : 'Códigos (opcional)');
        const ta = q('[data-k=buscar]'); ta.placeholder = x.tipo === 'frase' ? 'Ej.: control de calidad; borrador' : x.tipo === 'patron' ? 'Ej.: \\d+\\s?°C' : 'Vacío = cualquiera';
      };
      const probar = (x) => {
        const c = Reglas.compilar([x], ctxReglas())[0], err = q('.rmd-rg-err');
        err.textContent = c.error ? '⚠ ' + c.error : c.necesita === 'vigentes' ? 'Esta regla necesita la lista de documentos vigentes (pestaña «Documentos vigentes»).'
          : c.necesita === 'calificados' ? 'Esta regla necesita la lista de equipos calificados (pestaña «Equipos calificados»).'
          : c.necesita === 'catalogo' ? 'Esta regla usa el catálogo de equipos del portal; se lee una vez por sesión (con la lista principal abierta).' : '';
        err.classList.toggle('aviso', !c.error);
        const t = q('.rmd-rg-prueba').value, out = q('.rmd-rg-res'); editando.prueba = t;
        if (!t.trim()) { out.innerHTML = '<span class="rmd-rg-ayuda">Escribe o pega un texto arriba para ver qué marcaría.</span>'; return; }
        const res = Reglas.buscar(t, [{ ...c, ok: !c.error && !c.necesita }], ctxReglas({ probar: true })), caja = document.createElement('div'); caja.className = 'rmd-rg-texto'; caja.textContent = t; pintarMarcas(caja, res.marcas);
        const p = document.createElement('p'); p.className = 'rmd-rg-ayuda';
        p.textContent = x.condicion === 'debe' ? (res.marcas.length ? `✓ Aparece (${res.marcas.length} vez/veces).` : '✗ No aparece: en el RMD saldría el aviso «Falta».')
          : res.marcas.length ? `${res.marcas.length} coincidencia(s)${res.avisos.length ? ` · aviso: ${res.avisos[0].texto}` : ' · solo se resalta'}` : 'Sin coincidencias.';
        out.innerHTML = ''; out.append(caja, p);
      };
      const cambio = (e) => {
        if (e && e.target && e.target.dataset.k === 'accion') editando.accionTocada = true;
        if (e && e.target && e.target.dataset.k === 'condicion' && !editando.accionTocada) q('[data-k=accion]').value = e.target.value === 'noDebe' ? 'advertencia' : 'resaltar';
        if (e && e.target && !e.target.classList.contains('rmd-rg-prueba')) sucio = true;
        const x = leer(); mostrar(x); probar(x);
      };
      v.cuerpo.oninput = cambio; v.cuerpo.onchange = cambio; cambio(null);
      const guardarEditor = async () => {
        const x = Reglas.normalizar(leer()), c = Reglas.compilar([x], {})[0];
        if (c.error) { q('.rmd-rg-err').textContent = '⚠ ' + c.error; q('[data-k=buscar]').focus(); return; }
        const reglas = reglasActuales().slice(); x.nombre = nombreLibre(x.nombre, reglas, x.id);
        const i = reglas.findIndex((r) => r.id === x.id); if (i >= 0) reglas[i] = x; else reglas.push(x);
        sucio = false; await guardarReglas(reglas); v.cuerpo.oninput = null; v.cuerpo.onchange = null; vista = 'reglas'; pintar();
        toast(`Regla «${x.nombre}» guardada${x.activa ? '' : ' (inactiva)'}.`);
      };
      // (predeterminada: vuelve a su configuración de fábrica en el formulario; se guarda con "Guardar regla")
      const pred = editando.regla.predeterminada && Reglas.predeterminadas().find((p) => p.predeterminada === editando.regla.predeterminada);
      if (pred) {
        const bR = botonModal('Restablecer esta regla', '', () => { editando.regla = { ...pred, id: editando.regla.id }; editando.accionTocada = true; pintar(); sucio = true; toast('Restablecida en el formulario: pulsa «Guardar regla» para aplicarla.'); });
        bR.title = 'Vuelve a la configuración con la que viene esta regla predeterminada'; bR.classList.add('rmd-rg-izq'); v.pie.append(bR);
      }
      v.pie.append(botonModal('Cancelar', '', () => ir('reglas')), botonModal('Guardar regla', 'primario', guardarEditor));
      v.fondo.__ctrlS = guardarEditor;
    }
    // -- documentos vigentes --
    function pintarVigentes() {
      const V = RR.vigentes, dias = V ? diasDesde(V.cargado) : 0;
      const estados = V && V.estados ? Object.entries(V.estados).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(k)} ${n.toLocaleString('es-PE')}`).join(' · ') : '';
      v.cuerpo.innerHTML = `${V ? `<p class="rmd-rg-vig-ok">✓ <b>${V.docs.length.toLocaleString('es-PE')} documentos vigentes</b> · «${esc(V.archivo)}» · cargada el ${esc(fechaHoraCorta(V.cargado))}</p>
          <p class="rmd-nota">${estados}${V.hoja ? ` · hoja «${esc(V.hoja)}», columna «${esc(V.columna)}»` : ''}</p>${dias > 30 ? `<p class="rmd-rg-falta">La lista tiene ${dias} días: conviene volver a cargarla del DMS para que esté al día.</p>` : ''}`
        : '<p class="rmd-rg-falta">Aún no hay una lista cargada: sin ella no se puede saber qué documentos citados están vigentes.</p>'}
        <p class="rmd-nota"><b>Criterio:</b> los documentos que están en esta lista están vigentes; los que no están, no (SAP no lo compara por sí solo). La regla «Documento no vigente» resalta en rojo los códigos citados que no están en la lista y lo avisa; «Documentos citados» muestra la columna «Vigente». La lista se guarda solo en este navegador.</p>
        <div class="rmd-rg-barra"><button type="button" class="rmd-btn primario" data-a="cargar">${V ? 'Cargar otra lista' : 'Cargar la lista'} (.xls, .xlsx o .csv)</button><span class="rmd-nota">o suelta el archivo en esta ventana</span><span class="rmd-rg-esp"></span>
          <button type="button" class="rmd-btn peligro" data-a="restablecer-vig" ${V ? '' : 'disabled'} title="Quita la lista cargada: queda como al principio">Restablecer</button></div>
        ${V ? '<div class="rmd-rg-buscar"><input type="search" class="rmd-rg-q" placeholder="Buscar un código o un título en la lista" aria-label="Buscar en la lista de documentos vigentes"></div><div class="rmd-rg-vig-res"></div>' : ''}`;
      const inp = q('.rmd-rg-q');
      if (inp) { inp.value = consulta; inp.addEventListener('input', () => { consulta = inp.value; buscarVig(); }); buscarVig(); }
      v.pie.append(Object.assign(document.createElement('span'), { className: 'rmd-rg-estado', textContent: 'Lista guardada solo en este navegador' }), botonModal('Cerrar', 'primario', () => salir()));
    }
    function buscarVig() {
      const out = q('.rmd-rg-vig-res'); if (!out || !RR.vigentes) return;
      const t = Reglas.plegar(consulta.trim()).p; if (!t) { out.innerHTML = ''; return; }
      const cod = Reglas.normalizarCodigo(consulta), hall = RR.vigentes.docs.filter((d) => d[0].includes(cod) || Reglas.plegar(d[1]).p.includes(t)).slice(0, 30);
      const exacto = RR.mapa.has(cod), pareceCodigo = /^[A-Z0-9]{2,6}(-[A-Z0-9]{1,8}){1,3}$/.test(cod);
      out.innerHTML = (pareceCodigo ? (exacto ? `<p class="rmd-vig-si">✓ ${esc(cod)} está en la lista: vigente.</p>` : `<p class="rmd-vig-no">✗ ${esc(cod)} no está en la lista: se considera NO vigente.</p>`) : '')
        + (hall.length ? `<table class="rmd-tabla"><thead><tr><th>Código</th><th>Título</th><th>Rev.</th><th>Estado</th><th>Validez</th></tr></thead><tbody>${hall.map((d) => `<tr><td class="rmd-nowrap">${esc(d[0])}</td><td>${esc(d[1])}</td><td>${esc(d[2])}</td><td>${esc(d[3])}</td><td class="rmd-nowrap">${esc(d[6])}</td></tr>`).join('')}</tbody></table>` : (pareceCodigo ? '' : '<p class="rmd-nota">Nada coincide.</p>'));
    }
    function pintarCargaVig() {
      const c = cargandoVig, estados = Object.entries(c.estados || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(k)} ${n.toLocaleString('es-PE')}`).join(' · ');
      v.cuerpo.innerHTML = `<p>Se leyeron <b>${c.n.toLocaleString('es-PE')} documentos</b> de «${esc(c.archivo)}» (hoja «${esc(c.hoja)}», columna «${esc(c.columna)}»).</p>
        <p class="rmd-nota">${estados}${c.duplicados ? ` · ${c.duplicados} código(s) repetido(s) se contaron una vez` : ''}</p>
        ${RR.vigentes ? `<p>Reemplaza la lista actual (${RR.vigentes.docs.length.toLocaleString('es-PE')} documentos, cargada el ${esc(fechaHoraCorta(RR.vigentes.cargado))}): <b>${c.nuevos}</b> documento(s) nuevo(s) y <b>${c.salen}</b> que ya no están (pasan a «no vigente»).</p>` : '<p>Con esta lista, los documentos citados que no estén en ella se marcarán como no vigentes.</p>'}
        <table class="rmd-tabla"><thead><tr><th>Código</th><th>Título</th><th>Rev.</th><th>Estado</th><th>Validez</th></tr></thead><tbody>${c.docs.slice(0, 5).map((d) => `<tr><td class="rmd-nowrap">${esc(d[0])}</td><td>${esc(d[1])}</td><td>${esc(d[2])}</td><td>${esc(d[3])}</td><td class="rmd-nowrap">${esc(d[6])}</td></tr>`).join('')}</tbody></table>
        ${c.n > 5 ? `<p class="rmd-nota">…y ${(c.n - 5).toLocaleString('es-PE')} más.</p>` : ''}`;
      const usar = async () => {
        const r = await guardarVigentes({ archivo: c.archivo, cargado: new Date().toISOString(), hoja: c.hoja, columna: c.columna, n: c.n, estados: c.estados, docs: c.docs });
        cargandoVig = null; vista = 'vigentes'; pintar();
        toast(r.ok ? `Lista cargada: ${c.n.toLocaleString('es-PE')} documentos vigentes. Queda guardada en este navegador.` : `Lista cargada solo mientras la página siga abierta: no se pudo guardar en el navegador (${r.error}).`, !r.ok);
      };
      v.pie.append(botonModal('Cancelar', '', () => { cargandoVig = null; vista = 'vigentes'; pintar(); }), botonModal('Usar esta lista', 'primario', usar));
      v.fondo.__ctrlS = usar;
    }
    // -- equipos calificados (v1.35) --
    const estadosTxt = (est) => Object.entries(est || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${esc(k)} ${n.toLocaleString('es-PE')}`).join(' · ');
    const califOk = (g) => ((RR.calif && RR.calif.estadosOk) || Reglas.ESTADOS_OK).some((x) => Reglas.plegar(x).p.trim() === Reglas.plegar(g || '').p.trim());
    const filaCal = (e) => `<tr><td class="rmd-nowrap">${esc(e[0] || '—')}</td><td class="rmd-nowrap">${esc(e[1] || '—')}</td><td>${esc(e[2])}</td><td class="rmd-nowrap"><b class="${califOk(e[3]) ? 'rmd-vig-si' : 'rmd-vig-no'}">${esc(e[3] || '(sin estado)')}</b></td><td>${esc(e[4])}</td><td>${esc(e[5])}</td><td class="rmd-nowrap">${esc(e[6] || '')}${e[7] ? ' / ' + esc(e[7]) : ''}</td></tr>`;
    const CAB_CAL = '<thead><tr><th>Código</th><th>SAP</th><th>Descripción</th><th>Estado general</th><th>OQ</th><th>PQ</th><th>Próxima OQ / PQ</th></tr></thead>';
    function pintarCalificados() {
      const C = RR.calif, dias = C ? diasDesde(C.cargado) : 0, ok = (C && C.estadosOk) || Reglas.ESTADOS_OK;
      const sin = RR.mapaCalif ? [...RR.mapaCalif.porCodigo.values()].filter((x) => !x.ok).length : 0, codigos = RR.mapaCalif ? RR.mapaCalif.porCodigo.size : 0;
      v.cuerpo.innerHTML = `${C ? `<p class="rmd-rg-vig-ok">✓ <b>${C.equipos.length.toLocaleString('es-PE')} filas de equipos</b> (${codigos.toLocaleString('es-PE')} códigos, ${sin.toLocaleString('es-PE')} sin calificación) · «${esc(C.archivo)}» · cargada el ${esc(fechaHoraCorta(C.cargado))}</p>
          <p class="rmd-nota">${estadosTxt(C.estados)}${C.hoja ? ` · hoja «${esc(C.hoja)}», columna «${esc(C.columna || 'ESTADO GENERAL')}»` : ''}</p>${dias > 30 ? `<p class="rmd-rg-falta">La lista tiene ${dias} días: conviene volver a cargar el registro actualizado.</p>` : ''}`
        : '<p class="rmd-rg-falta">Aún no hay una lista cargada: sin ella no se puede avisar de los equipos sin calificación.</p>'}
        <p class="rmd-nota"><b>Criterio:</b> se guía por la columna «ESTADO GENERAL» (AU) de la hoja «Cronograma» del registro de áreas / sistemas / equipos a calificar (OQ y PQ). Cuentan como calificados los estados de abajo; el resto (EN PROCESO, PENDIENTE, NO CUMPLE, INOPERATIVO…) es «sin calificación». Cada equipo se busca por su código («CODIGO MIF» = «Código de referencia» del portal) o por su código SAP. Un código con varias filas (una sala y su HVAC) está calificado solo si lo están todas.</p>
        <p class="rmd-nota"><b>Dónde avisa:</b> la regla «Equipo sin calificación» (pestaña Reglas) marca los equipos de la estructura EQUIPOS / INSTRUMENTOS / MATERIALES de cada RMD (en su ventana y en el aviso de la ventana del RMD) y los códigos de equipo citados en los pasos.</p>
        <div class="rmd-rg-barra"><button type="button" class="rmd-btn primario" data-a="cargar-calif">${C ? 'Cargar otra lista' : 'Cargar la lista'} (.xlsx, .xls o .csv)</button><span class="rmd-nota">o suelta el archivo en esta ventana</span><span class="rmd-rg-esp"></span>
          <button type="button" class="rmd-btn peligro" data-a="restablecer-calif" ${C ? '' : 'disabled'} title="Quita la lista cargada y los estados vuelven a los de por defecto">Restablecer</button></div>
        <div class="rmd-rg-okcal"><label class="rmd-rg-campo">Estados que cuentan como calificados <input type="text" class="rmd-rg-estados-ok" value="${esc(ok.join('; '))}" ${C ? '' : 'disabled'}></label><button type="button" class="rmd-btn" data-a="estados-ok" ${C ? '' : 'disabled'}>Aplicar</button></div>
        ${C ? '<div class="rmd-rg-buscar"><input type="search" class="rmd-rg-q rmd-rg-qcal" placeholder="Buscar un equipo por código, código SAP o descripción" aria-label="Buscar en la lista de equipos calificados"></div><div class="rmd-rg-cal-res"></div>' : ''}`;
      const inp = q('.rmd-rg-qcal');
      if (inp) { inp.value = consultaCal; inp.addEventListener('input', () => { consultaCal = inp.value; buscarCal(); }); buscarCal(); }
      v.pie.append(Object.assign(document.createElement('span'), { className: 'rmd-rg-estado', textContent: 'Lista guardada solo en este navegador' }), botonModal('Cerrar', 'primario', () => salir()));
    }
    function buscarCal() {
      const out = q('.rmd-rg-cal-res'); if (!out || !RR.calif) return;
      const t = Reglas.plegar(consultaCal.trim()).p; if (!t) { out.innerHTML = ''; return; }
      const cod = Reglas.normalizarCodigo(consultaCal), hall = RR.calif.equipos.filter((e) => (e[0] && e[0].includes(cod)) || (e[1] && e[1].includes(cod)) || Reglas.plegar(e[2]).p.includes(t)).slice(0, 30);
      const info = RR.mapaCalif.porCodigo.get(cod) || RR.mapaCalif.porSap.get(sinCeros(cod)), pareceCodigo = /^[A-Z0-9]{2,6}(-[A-Z0-9]{1,8}){1,3}$|^\d{6,}$/.test(cod);
      out.innerHTML = (pareceCodigo ? (info ? `<p class="${info.ok ? 'rmd-vig-si' : 'rmd-vig-no'}">${info.ok ? '✓' : '✗'} ${esc(cod)}: ${info.ok ? 'calificado' : 'sin calificación'} — ${esc(info.detalle)}</p>` : `<p class="rmd-rg-falta">${esc(cod)} no figura en la lista.</p>`) : '')
        + (hall.length ? `<table class="rmd-tabla">${CAB_CAL}<tbody>${hall.map(filaCal).join('')}</tbody></table>` : (pareceCodigo ? '' : '<p class="rmd-nota">Nada coincide.</p>'));
    }
    function pintarCargaCalif() {
      const c = cargandoCal;
      v.cuerpo.innerHTML = `<p>Se leyeron <b>${c.n.toLocaleString('es-PE')} filas de equipos</b> (${c.codigos.toLocaleString('es-PE')} códigos) de «${esc(c.archivo)}» (hoja «${esc(c.hoja)}», columna «${esc(c.columna)}»).</p>
        <p class="rmd-nota">${estadosTxt(c.estados)}</p>
        <p>Con los estados que cuentan como calificados (${esc(c.estadosOk.join(', '))}): <b>${c.sinCalificar.toLocaleString('es-PE')}</b> código(s) sin calificación.</p>
        ${RR.calif ? `<p>Reemplaza la lista actual (${RR.calif.equipos.length.toLocaleString('es-PE')} filas, cargada el ${esc(fechaHoraCorta(RR.calif.cargado))}): <b>${c.nuevos}</b> código(s) nuevo(s), <b>${c.salen}</b> que ya no están y <b>${c.cambian}</b> que cambian de calificado a no calificado o al revés.</p>` : ''}
        <table class="rmd-tabla">${CAB_CAL}<tbody>${c.equipos.slice(0, 5).map(filaCal).join('')}</tbody></table>
        ${c.n > 5 ? `<p class="rmd-nota">…y ${(c.n - 5).toLocaleString('es-PE')} más.</p>` : ''}`;
      const usar = async () => {
        const r = await guardarCalificados({ archivo: c.archivo, cargado: new Date().toISOString(), hoja: c.hoja, columna: c.columna, n: c.n, estados: c.estados, estadosOk: c.estadosOk, equipos: c.equipos });
        cargandoCal = null; vista = 'calificados'; pintar();
        toast(r.ok ? `Lista cargada: ${c.n.toLocaleString('es-PE')} filas de equipos. Queda guardada en este navegador.` : `Lista cargada solo mientras la página siga abierta: no se pudo guardar en el navegador (${r.error}).`, !r.ok);
      };
      v.pie.append(botonModal('Cancelar', '', () => { cargandoCal = null; vista = 'calificados'; pintar(); }), botonModal('Usar esta lista', 'primario', usar));
      v.fondo.__ctrlS = usar;
    }
    // -- importar configuración --
    function pintarImportar() {
      const im = importando, actuales = reglasActuales(), mismo = (r) => actuales.some((a) => a.id === r.id || mismoNombre(a.nombre, r.nombre));
      const nMismo = im.reglas ? im.reglas.filter(mismo).length : 0;
      v.cuerpo.innerHTML = `<p>Archivo <b>«${esc(im.archivo)}»</b>${im.exportado ? `, exportado el ${esc(fechaHoraCorta(im.exportado))}` : ''}${im.script ? ` (versión ${esc(im.script)})` : ''}.</p>
        <div class="rmd-rg-imp">
        ${im.reglas ? `<p><b>${im.reglas.length} regla(s)</b>: ${im.reglas.length - nMismo} nueva(s) y ${nMismo} con el mismo nombre que una tuya.</p>
          <label><input type="radio" name="rmd-rg-modo" value="agregar" checked><span><b>Agregar a mis reglas</b><br><span class="rmd-nota">Las del mismo nombre se actualizan con las del archivo; las demás tuyas no cambian.</span></span></label>
          <label><input type="radio" name="rmd-rg-modo" value="reemplazar"><span><b>Reemplazar todas mis reglas</b><br><span class="rmd-nota">Quedan solo las ${im.reglas.length} del archivo.</span></span></label>
          <div class="rmd-rg-imp-lista">${im.reglas.slice(0, 12).map((r) => `<div><span class="rmd-rg-color rmd-c-${r.color}"></span> <b>${esc(r.nombre)}</b>${mismo(r) ? ' <span class="rmd-rg-pred">(reemplaza a la tuya)</span>' : ''}${r.activa ? '' : ' <span class="rmd-rg-pred">inactiva</span>'}<div class="rmd-nota">${esc(Reglas.resumen(r))}</div></div>`).join('')}${im.reglas.length > 12 ? `<p class="rmd-nota">…y ${im.reglas.length - 12} más.</p>` : ''}</div>` : '<p class="rmd-nota">El archivo no trae reglas.</p>'}
        ${im.vigentes ? `<label><input type="checkbox" name="rmd-rg-vig" checked><span><b>Usar también su lista de documentos vigentes</b><br><span class="rmd-nota">${im.vigentes.n.toLocaleString('es-PE')} documentos · «${esc(im.vigentes.archivo)}»${im.vigentes.cargado ? `, cargada el ${esc(fechaHoraCorta(im.vigentes.cargado))}` : ''}${RR.vigentes ? ` · reemplaza la tuya (${RR.vigentes.docs.length.toLocaleString('es-PE')} documentos, cargada el ${esc(fechaHoraCorta(RR.vigentes.cargado))})` : ''}</span></span></label>` : ''}
        ${im.calificados ? `<label><input type="checkbox" name="rmd-rg-cal" checked><span><b>Usar también su lista de equipos calificados</b><br><span class="rmd-nota">${im.calificados.n.toLocaleString('es-PE')} filas · «${esc(im.calificados.archivo)}»${im.calificados.cargado ? `, cargada el ${esc(fechaHoraCorta(im.calificados.cargado))}` : ''} · calificados: ${esc(im.calificados.estadosOk.join(', '))}${RR.calif ? ` · reemplaza la tuya (${RR.calif.equipos.length.toLocaleString('es-PE')} filas)` : ''}</span></span></label>` : ''}
        </div>`;
      const importar = async () => {
        const modo = (q('input[name=rmd-rg-modo]:checked') || {}).value, conVig = !!(q('input[name=rmd-rg-vig]') || {}).checked, conCal = !!(q('input[name=rmd-rg-cal]') || {}).checked, partes = [];
        if (im.reglas) { const f = Reglas.fusionar(reglasActuales(), im.reglas, modo === 'reemplazar'); await guardarReglas(f.reglas); partes.push(modo === 'reemplazar' ? `${f.reglas.length} regla(s)` : `${f.agregadas} regla(s) nueva(s) y ${f.reemplazadas} actualizada(s)`); }
        if (im.vigentes && conVig) { const r = await guardarVigentes({ ...im.vigentes, cargado: im.vigentes.cargado || new Date().toISOString() }); partes.push(`la lista de ${im.vigentes.n.toLocaleString('es-PE')} documentos vigentes${r.ok ? '' : ' (solo mientras la página siga abierta)'}`); }
        if (im.calificados && conCal) { const r = await guardarCalificados({ ...im.calificados, cargado: im.calificados.cargado || new Date().toISOString() }); partes.push(`la de ${im.calificados.n.toLocaleString('es-PE')} equipos calificados${r.ok ? '' : ' (solo mientras la página siga abierta)'}`); }
        importando = null; vista = 'reglas'; pintar();
        toast(partes.length ? `Importado: ${partes.join(' y ')}.` : 'No se importó nada.');
      };
      v.pie.append(botonModal('Cancelar', '', () => { importando = null; vista = 'reglas'; pintar(); }), botonModal('Importar', 'primario', importar));
      v.fondo.__ctrlS = importar;
    }
    ventanaReglas = { fondo: v.fondo, irA: (p) => ir(p), refrescar: () => { if (['reglas', 'vigentes', 'calificados'].includes(vista)) { const foco = document.activeElement && document.activeElement.classList.contains('rmd-rg-q'); pintar(); if (foco) { const i = q('.rmd-rg-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } } }, elegir: abrirArchivo };
    pintar();
  }
  window.__rmdStats.reglas = {
    lista: () => JSON.parse(JSON.stringify(reglasActuales())), fijar: (lista) => guardarReglas(lista), listo: () => RR.listo,
    vigentes: () => (RR.vigentes ? { archivo: RR.vigentes.archivo, cargado: RR.vigentes.cargado, n: RR.vigentes.docs.length, hoja: RR.vigentes.hoja, columna: RR.vigentes.columna } : null),
    // (pruebas) lista de vigentes desde los bytes de un archivo en base64, o desde una lista de códigos; null la quita
    cargarVigentes: async (b64, nombre) => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const lv = await leerListaVigentes(u8, nombre); const r = await guardarVigentes({ ...lv, cargado: new Date().toISOString() }); return { ...r, n: lv.n, hoja: lv.hoja, columna: lv.columna }; },
    ponerVigentes: (docs, archivo = 'prueba') => guardarVigentes(docs ? { archivo, cargado: new Date().toISOString(), n: docs.length, estados: {}, docs: docs.map((d) => (Array.isArray(d) ? d : [Reglas.normalizarCodigo(d)])) } : null),
    guardados: async () => ({ ls: localStorage.getItem(CLAVE_REGLAS), db: await Almacen.leer('reglas').catch((e) => 'error: ' + e.message), vigentesDB: await Almacen.leer('vigentes').then((x) => (x ? x.docs.length : null), (e) => 'error: ' + e.message) }),
    evaluar: (texto, ctx) => Reglas.buscar(texto, reglasCompiladas(), ctxReglas({ probar: true, ...(ctx || {}) })),
    exportar: () => exportarConfiguracion(), abrir: (p) => abrirReglas(p), compiladas: () => reglasCompiladas().map((c) => ({ id: c.regla.id, ok: c.ok, error: c.error, necesita: c.necesita })),
    motor: Reglas,
    // (pruebas) respaldo completo de lo guardado y su restauración: las pruebas dejan el navegador como estaba
    respaldo: async () => ({ ls: localStorage.getItem(CLAVE_REGLAS), db: await Almacen.leer('reglas').catch(() => null), vig: RR.vigentes, cal: RR.calif }),
    restaurar: async (r) => {
      try { if (r.ls) localStorage.setItem(CLAVE_REGLAS, r.ls); else localStorage.removeItem(CLAVE_REGLAS); } catch (e) { /* nada */ }
      try { if (r.db) await Almacen.guardar('reglas', r.db); else await Almacen.borrar('reglas'); } catch (e) { /* nada */ }
      RR.reglas = null; RR.ver++; await guardarVigentes(r.vig || null); await guardarCalificados(r.cal || null);
    },
    // (pruebas) lista de equipos calificados: desde los bytes de un archivo en base64, o desde filas [código, SAP, descripción, estado general, OQ, PQ]
    calificados: () => (RR.calif ? { archivo: RR.calif.archivo, cargado: RR.calif.cargado, n: RR.calif.equipos.length, hoja: RR.calif.hoja, columna: RR.calif.columna, estadosOk: RR.calif.estadosOk, codigos: RR.mapaCalif.porCodigo.size } : null),
    cargarCalificados: async (b64, nombre) => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const lc = await leerListaCalificados(u8, nombre); const r = await guardarCalificados({ ...lc, cargado: new Date().toISOString() }); return { ...r, n: lc.n, hoja: lc.hoja, columna: lc.columna, estados: lc.estados }; },
    ponerCalificados: (equipos, archivo = 'prueba') => guardarCalificados(equipos ? { archivo, cargado: new Date().toISOString(), n: equipos.length, estados: {}, estadosOk: Reglas.ESTADOS_OK.slice(), equipos: equipos.map((e) => [Reglas.normalizarCodigo(e[0]), sinCeros(e[1]), ...e.slice(2)]) } : null),
    infoEquipo: (codigo, sap) => { const i = infoCalif({ codigo, sap }); return i && { ok: i.ok, estado: i.estado, detalle: i.detalle }; },
  };

  // ---- 9 quater. Cambios de recetas en SAP (v1.37) ----------------------------------------------------------------------
  // Al asociar una receta, el portal copia en el RMD su lista de materiales y los datos de su versión de fabricación; esa copia ya no se
  // actualiza sola. Aquí se revisan, en segundo plano, los RMD Ingresados y Autorizados (la última versión de cada uno) frente a lo que
  // devuelve hoy SAP (las mismas lecturas que ya hace «Revisar recetas»). Los que tienen diferencias se avisan con un icono tenue junto a
  // «Manufactura Digital»; al abrirlo se ve, por RMD, la receta, qué cambió y cuándo. SAP da la fecha «válido desde» de cada componente
  // (no la hora): la hora que se muestra es la de la revisión que lo detectó. Desde ahí se puede agregar a las Observaciones del RMD una
  // línea «AAAAMMDD<iniciales> Actualización de Lista de Materiales» (o «… de Hoja de Ruta»), con el mismo Guardar de «Asociar fórmulas»
  // que usan las modificaciones masivas, y el detalle se exporta a Excel desde el menú Exportar. Lo leído se guarda solo en este navegador.
  // Lo que se lee (todo con las lecturas del propio portal): MD (estados Autorizado / Ingresado), MD_RECETA, MD_ES_RE_INSUMO (la copia; una
  // sola vez por receta asociada, queda guardada), MaterialSet (una lectura por receta: SAP no admite varias) y ProduccionVSet (por bloques).
  const RS = { datos: null, copias: null, leyendo: false, cancelar: false, progreso: '', error: '', ver: 1, arrancado: false, ventana: null, resultados: new Map() };
  const RS_ESPERA = 45000, RS_PARALELO = 6, RS_BLOQUEO = 'rmdUiRecetasBloqueo', RS_ID = Math.random().toString(36).slice(2);
  const RS_VACIO = () => ({ v: 1, ultima: { ing: 0, aut: 0 }, hallazgos: [], detectado: {}, obs: {} });
  const rsHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  async function rsDatos() {
    if (!RS.datos) {
      let d = null; try { d = await Almacen.leer('recetasSap'); } catch (e) { d = null; }
      RS.datos = d && d.v === 1 && Array.isArray(d.hallazgos) ? d : RS_VACIO(); RS.ver++;
    }
    return RS.datos;
  }
  const rsGuardar = () => Almacen.guardar('recetasSap', RS.datos).catch(() => {});
  async function rsCopias() {
    if (!RS.copias) { let c = null; try { c = await Almacen.leer('recetasSapCopias'); } catch (e) { c = null; } RS.copias = c && typeof c === 'object' ? c : {}; }
    return RS.copias;
  }
  const rsGuardarCopias = () => Almacen.guardar('recetasSapCopias', RS.copias).catch(() => {});
  // Solo una pestaña revisa sola a la vez (la revisión manual no espera)
  const rsBloqueado = () => { try { return Date.now() - (+localStorage.getItem(RS_BLOQUEO) || 0) < 5 * 60000 && localStorage.getItem(RS_BLOQUEO + 'Id') !== RS_ID; } catch (e) { return false; } };
  const rsTomarBloqueo = () => { try { localStorage.setItem(RS_BLOQUEO, String(Date.now())); localStorage.setItem(RS_BLOQUEO + 'Id', RS_ID); } catch (e) { /* sin almacenamiento */ } };
  const rsSoltarBloqueo = () => { try { if (localStorage.getItem(RS_BLOQUEO + 'Id') === RS_ID) { localStorage.removeItem(RS_BLOQUEO); localStorage.removeItem(RS_BLOQUEO + 'Id'); } } catch (e) { /* nada */ } };
  async function rsPool(items, n, fn) {
    let i = 0;
    const trabajador = async () => { while (i < items.length && !RS.cancelar) { const k = i++; await fn(items[k], k); } };
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, trabajador));
  }
  const rsDeCompacta = (c) => c.map(([Component, CompQty, CompUnit, Maktx]) => ({ Component, CompQty, CompUnit, Maktx }));
  const rsClave3 = (rc) => [norm(rc.Matnr), norm(rc.Werks), String(parseInt(rc.Stlal, 10))].join('|');
  // los RMD Ingresados y Autorizados, solo la última versión de cada uno (versiones = mismo «código de versión principal»)
  async function rsCandidatos(modelo) {
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const mds = await leerTodoDe(modelo, 'MD', [new F({ filters: [new F('estadoIdRmd_iMaestraId', 'EQ', 465), new F('estadoIdRmd_iMaestraId', 'EQ', 467)], and: false })],
      { $expand: 'estadoIdRmd,sucursalId', $select: 'mdId,codigo,version,codigoversionprincipal,descripcion,nivelTxt,areaRmdTxt,estadoIdRmd/contenido,sucursalId/contenido', $orderby: 'mdId' });
    const ult = new Map();
    mds.forEach((m) => { const k = m.codigoversionprincipal || m.codigo, y = ult.get(k); if (!y || +m.version > +y.version) ult.set(k, m); });
    return [...ult.values()].map((m) => ({ mdId: m.mdId, codigo: m.codigo, version: m.version, linaje: m.codigoversionprincipal || m.codigo, descripcion: norm(m.descripcion), etapa: m.nivelTxt || '', area: m.areaRmdTxt || '',
      planta: (m.sucursalId && m.sucursalId.contenido) || '', estado: (m.estadoIdRmd && m.estadoIdRmd.contenido) || '' }));
  }
  // hoja de ruta y puesto: solo lo que se puede comparar con lo copiado al asociar (puesto principal, hoja de ruta, contador y alternativa)
  function rsRuta(rc, hoy) {
    const cambios = [];
    if (hoy) CAMPOS_RUTA.forEach(([k, nombre, f, avisa]) => { if (!avisa) return; const a = f(rc[k]), s = f(hoy[k]); if (a !== s) cambios.push({ campo: nombre, asociada: a, sap: s, anterior: null, clave: k, avisa: true }); });
    return { existe: !!hoy, cambios, anteriorVersion: null, puestosRuta: [], entran: [], salen: [], faltan: [] };
  }
  const rsResumenRuta = (ru) => (!ru ? '' : !ru.existe ? 'la versión de fabricación ya no existe en SAP' : ru.cambios.map((c) => `${c.campo}: ${c.asociada || '—'} → ${c.sap || '—'}`).join('; '));
  // Revisa un conjunto de RMD ya leídos. Recibe las lecturas (para poder probarla con datos de mentira) y devuelve los hallazgos.
  function rsCompararRecetas(recs, porMd, copias, bom, versiones, verOk) {
    const out = [];
    recs.forEach((r) => {
      const md = porMd.get(r.mdId_mdId), rc = r.recetaId; if (!md || !rc) return;
      const sap = bom.get(rsClave3(rc)), copia = copias[r.mdRecetaId];
      let dif = [], ultima = null, nSap = 0;
      if (sap && copia && copia.length) {                                    // (sin copia guardada o sin lectura de SAP: no se puede comparar → no se avisa)
        dif = diferenciasBom(sap, rsDeCompacta(copia)); nSap = sap.length;
        sap.forEach((x) => { const f = fechaBom(x.ValidFrom); if (f && norm(x.ChangeNo) && (!ultima || f > ultima.fecha)) ultima = { fecha: f, cambio: norm(x.ChangeNo) }; });
      }
      let ruta = null, rutaAvisa = false;
      if (verOk.has(norm(rc.Matnr) + '|' + norm(rc.Werks))) { ruta = rsRuta(rc, versiones.get([norm(rc.Matnr), norm(rc.Werks), norm(rc.Verid)].join('|')) || null); rutaAvisa = !ruta.existe || ruta.cambios.length > 0; }
      if (!dif.length && !rutaAvisa) return;
      const fechas = dif.map((d) => d.fecha).filter(Boolean), fechaSap = fechas.length ? new Date(Math.max(...fechas.map((f) => +f))) : dif.length && ultima ? ultima.fecha : null;
      const huella = rsHash(dif.map((d) => [d.tipo, d.comp, d.compAntes || '', d.antes ? d.antes.q + d.antes.u : '', d.ahora ? d.ahora.q + d.ahora.u : ''].join(':')).join(';') + '#' + (ruta ? (ruta.existe ? '' : 'X') + ruta.cambios.map((c) => c.clave + c.sap).join(',') : ''));
      out.push({ mdRecetaId: r.mdRecetaId, mdId: md.mdId, codigo: md.codigo, version: md.version, estado: md.estado, linaje: md.linaje, descripcion: md.descripcion, etapa: md.etapa, area: md.area, planta: md.planta,
        receta: `${norm(rc.Matnr)} / ${norm(rc.Verid)}`, matnr: norm(rc.Matnr), verid: norm(rc.Verid), texto: norm(rc.Text1 || ''), sap: nSap, rmd: copia ? copia.length : 0, dif, ruta, rutaAvisa, ultima,
        tipos: [dif.length && 'lista', rutaAvisa && 'ruta'].filter(Boolean), fechaSap, huella });
    });
    return out;
  }
  // La revisión, por tandas. Cada lista de materiales de SAP (una por receta distinta) se vuelve a leer solo cuando le toca: las de los RMD
  // Ingresados cada 3 h y las de los Autorizados cada 24 h. Lo automático lee como máximo unos 100 s por tanda y sigue en la siguiente
  // (SAP tarda distinto según la hora), así el primer barrido se completa poco a poco sin cargar el portal. alcance: 'auto' (solo lo que toca,
  // con tope de tiempo), 'ingresados' o 'todos' (los botones: leen todo lo de ese alcance ahora).
  const RS_TTL_ING = 3 * 3600000, RS_TTL_AUT = 24 * 3600000, RS_TOPE_AUTO_MS = 100000, RS_MAX_AUTO = 500;
  async function rsRevisar(alcance, auto, opciones = {}) {   // opciones.codigos: solo esos RMD (pruebas)
    if (RS.leyendo) return;
    const ctrl = typeof sap !== 'undefined' && controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'), erp = ctrl && ctrl.oModelErpNec;
    if (!modelo || !erp) { RS.error = 'Abre la lista «Configuración Manufactura Digital» para revisar las recetas.'; rsPintar(); return; }
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, t0 = Date.now(), forzar = alcance !== 'auto';
    RS.leyendo = true; RS.cancelar = false; RS.error = ''; RS.progreso = 'Leyendo los RMD Ingresados y Autorizados…'; rsPintar(); if (auto) rsTomarBloqueo();
    const avanza = (t) => { RS.progreso = t; rsPintar(true); if (auto) rsTomarBloqueo(); };
    try {
      const datos = await rsDatos(), copias = await rsCopias(); datos.leidas = datos.leidas || {};
      const todos = await rsCandidatos(modelo), universo = new Set(todos.map((m) => m.mdId));
      const objetivo = todos.filter((m) => (opciones.codigos ? opciones.codigos.includes(m.codigo) : alcance !== 'ingresados' || m.estado === 'Ingresado')), porMd = new Map(objetivo.map((m) => [m.mdId, m]));
      avanza(`Leyendo las recetas de ${objetivo.length} RMD…`);
      const recs = (await leerPorIds(modelo, 'MD_RECETA', 'mdId_mdId', objetivo.map((m) => m.mdId), { $expand: 'recetaId',
        $select: 'mdRecetaId,mdId_mdId,activo,recetaId/Matnr,recetaId/Werks,recetaId/Verid,recetaId/Stlal,recetaId/Mdv01,recetaId/Plnnr,recetaId/Alnal,recetaId/Text1' }, null,
        (h, n) => avanza(`Leyendo las recetas de los RMD (${h} de ${n})…`))).filter((r) => r.activo !== false && r.recetaId && r.recetaId.Matnr && !isNaN(parseInt(r.recetaId.Stlal, 10)));
      // qué listas de materiales toca leer: las que nunca se leyeron o ya pasó su plazo, las más atrasadas primero (y los Ingresados antes)
      const info = new Map();                                                 // triple -> { edad, ttl, ing }
      recs.forEach((r) => { const t = rsClave3(r.recetaId), ing = porMd.get(r.mdId_mdId).estado === 'Ingresado', x = info.get(t) || { t, ing: false, ttl: RS_TTL_AUT }; x.ing = x.ing || ing; x.ttl = x.ing ? RS_TTL_ING : RS_TTL_AUT; info.set(t, x); });
      const ahora0 = Date.now(); info.forEach((x) => { x.edad = ahora0 - (datos.leidas[x.t] || 0); });
      let debidas = [...info.values()].filter((x) => forzar || x.edad >= x.ttl).sort((a, b) => (b.edad - a.edad) || (+b.ing - +a.ing));
      if (!forzar) debidas = debidas.slice(0, opciones.max || RS_MAX_AUTO);
      datos.universo = { rmd: todos.length, recetas: recs.length, listas: info.size, ing: todos.filter((m) => m.estado === 'Ingresado').length };
      const idsLeer = new Set(debidas.map((x) => x.t)), recsLeer = recs.filter((r) => idsLeer.has(rsClave3(r.recetaId)));
      // la copia de cada receta asociada (una vez; queda guardada)
      const faltan = [...new Set(recsLeer.map((r) => r.mdRecetaId))].filter((id) => !copias[id]);
      if (faltan.length) {
        const filas = await leerPorIds(modelo, 'MD_ES_RE_INSUMO', 'mdRecetaId_mdRecetaId', faltan, { $select: 'estructuraRecetaInsumoId,mdRecetaId_mdRecetaId,Component,CompQty,CompUnit,Maktx,activo', $orderby: 'estructuraRecetaInsumoId' }, null,
          (h, n) => avanza(`Leyendo lo copiado en los RMD (${h} de ${n})…`));
        const por = new Map(); filas.forEach((x) => { if (x.activo === false) return; const id = x.mdRecetaId_mdRecetaId; if (!por.has(id)) por.set(id, []); por.get(id).push([norm(x.Component), norm(x.CompQty), norm(x.CompUnit), norm(x.Maktx)]); });
        por.forEach((a, id) => { copias[id] = a; });                          // (una receta sin ninguna fila copiada no se guarda: no se puede comparar)
        await rsGuardarCopias();
      }
      if (RS.cancelar) throw new Error('Revisión detenida.');
      // lo que hoy dice SAP: la lista de materiales de cada receta (una lectura por receta) y sus versiones de fabricación (por bloques)
      const bom = new Map(), triples = debidas.map((x) => x.t), limite = forzar ? Infinity : t0 + (opciones.topeMs != null ? opciones.topeMs : RS_TOPE_AUTO_MS);
      let hechas = 0, fallos = 0, salteadas = 0;
      await rsPool(triples, RS_PARALELO, async (t) => {
        if (Date.now() > limite) { salteadas++; return; }                     // (tope de tiempo de la tanda automática: el resto queda para la siguiente)
        const [matnr, werks, stlal] = t.split('|');
        try { bom.set(t, (await leerErp(erp, 'MaterialSet', [new F('Matnr', 'EQ', matnr), new F('Werks', 'EQ', werks), new F('Stlal', 'EQ', stlal)])).map((x) => ({ Component: x.Component, CompQty: x.CompQty, CompUnit: x.CompUnit, Maktx: x.Maktx, ItemText1: x.ItemText1, ValidFrom: x.ValidFrom, ChangeNo: x.ChangeNo }))); }
        catch (e) { fallos++; if (fallos > 30 && fallos > hechas / 4) throw new Error('SAP no está respondiendo las lecturas de las listas de materiales.'); }
        hechas++; if (hechas % 8 === 0 || hechas === triples.length) avanza(`Comparando con SAP… ${hechas} de ${triples.length} listas de materiales`);
      });
      if (RS.cancelar) throw new Error('Revisión detenida.');
      const leidasAhora = recsLeer.filter((r) => bom.has(rsClave3(r.recetaId)));
      const versiones = new Map(), verOk = new Set(), porWerks = new Map(), bloques = [];
      leidasAhora.forEach((r) => { const w = norm(r.recetaId.Werks); if (!porWerks.has(w)) porWerks.set(w, new Set()); porWerks.get(w).add(norm(r.recetaId.Matnr)); });
      porWerks.forEach((set, w) => { const m = [...set]; for (let i = 0; i < m.length; i += 40) bloques.push([w, m.slice(i, i + 40)]); });
      await rsPool(bloques, RS_PARALELO, async ([w, mats]) => {
        try { (await leerErp(erp, 'ProduccionVSet', [...mats.map((m) => new F('Matnr', 'EQ', m)), new F('Werks', 'EQ', w)])).forEach((x) => versiones.set([norm(x.Matnr), norm(x.Werks), norm(x.Verid)].join('|'), x)); mats.forEach((m) => verOk.add(m + '|' + w)); }
        catch (e) { /* sin lectura: no se avisa la hoja de ruta de estos materiales */ }
      });
      if (RS.cancelar) throw new Error('Revisión detenida.');
      const nuevos = rsCompararRecetas(leidasAhora, porMd, copias, bom, versiones, verOk), idsRec = new Set(leidasAhora.map((r) => r.mdRecetaId)), idsVivos = new Set(recs.map((r) => r.mdRecetaId)), idsObjetivo = new Set(objetivo.map((m) => m.mdId));
      // se conserva lo anterior de lo que no se leyó ahora; se descartan los RMD que ya no son Ingresados / Autorizados y las recetas ya no asociadas
      datos.hallazgos = [...datos.hallazgos.filter((h) => universo.has(h.mdId) && !idsRec.has(h.mdRecetaId) && (!idsObjetivo.has(h.mdId) || idsVivos.has(h.mdRecetaId))), ...nuevos];
      bom.forEach((_, t) => { datos.leidas[t] = Date.now(); });
      const vivos = new Set(), ahora = Date.now();
      datos.hallazgos.forEach((h) => { const k = h.mdRecetaId + '|' + h.huella; vivos.add(k); if (!datos.detectado[k]) datos.detectado[k] = ahora; h.detectado = datos.detectado[k]; });
      Object.keys(datos.detectado).forEach((k) => { if (!vivos.has(k)) delete datos.detectado[k]; });
      Object.keys(datos.obs).forEach((k) => { if (!universo.has(k.split('|')[0])) delete datos.obs[k]; });
      const aldia = (ing) => [...info.values()].filter((x) => x.ing === ing).every((x) => datos.leidas[x.t] && ahora - datos.leidas[x.t] < x.ttl);
      if (aldia(true)) datos.ultima.ing = ahora; if (alcance !== 'ingresados' && !opciones.codigos && aldia(false)) datos.ultima.aut = ahora;
      datos.proximo = alcance === 'ingresados' || opciones.codigos ? 0 : Math.min(...[...info.values()].map((x) => (datos.leidas[x.t] || 0) + x.ttl), Infinity);   // (revisión parcial: la próxima tanda automática lo vuelve a evaluar)
      datos.cobertura = { listas: info.size, alDia: [...info.values()].filter((x) => datos.leidas[x.t] && ahora - datos.leidas[x.t] < x.ttl).length };
      datos.segundos = Math.round((ahora - t0) / 1000); datos.lecturas = { rmd: objetivo.length, recetas: recs.length, listas: triples.length - salteadas, sinLectura: fallos, pendientes: salteadas };
      await rsGuardar();
    } catch (e) { RS.error = e.message; }
    finally { RS.leyendo = false; RS.progreso = ''; if (auto) rsSoltarBloqueo(); rsPintar(); }
  }
  async function rsAuto() {
    if (!on('cambiosrecetas') || !on('recetasauto') || RS.leyendo || rsBloqueado() || !controladorPrincipal()) return;
    const d = await rsDatos(), ahora = Date.now();
    if (d.proximo && ahora < d.proximo && ahora - (d.ultimaLista || 0) < 3600000) return;   // todo al día hasta el próximo vencimiento y el universo se leyó hace poco: nada que hacer
    d.ultimaLista = ahora; await rsRevisar('auto', true);
  }
  async function rsArrancar() {
    await rsDatos(); rsPintar();
    setTimeout(rsAuto, RS_ESPERA); setInterval(rsAuto, 10 * 60000);
  }
  // «Borrar lo guardado»: quita los resultados y las copias leídas (la próxima revisión lee todo de nuevo)
  async function rsBorrarTodo() {
    RS.datos = null; RS.copias = null; RS.error = '';
    try { await Almacen.borrar('recetasSap'); } catch (e) { /* no había */ }
    try { await Almacen.borrar('recetasSapCopias'); } catch (e) { /* no había */ }
    await rsDatos(); rsPintar();
  }
  // ---- los RMD con cambios, agrupados (un RMD puede tener varias recetas) ----
  function rsGrupos() {
    const d = RS.datos; if (!d) return [];
    const por = new Map();
    d.hallazgos.forEach((h) => {
      let g = por.get(h.mdId); if (!g) { g = { mdId: h.mdId, codigo: h.codigo, version: h.version, estado: h.estado, descripcion: h.descripcion, etapa: h.etapa, planta: h.planta, area: h.area, recetas: [], tipos: new Set(), fechaSap: null, detectado: 0 }; por.set(h.mdId, g); }
      g.recetas.push(h); h.tipos.forEach((t) => g.tipos.add(t)); if (h.fechaSap && (!g.fechaSap || h.fechaSap > g.fechaSap)) g.fechaSap = h.fechaSap; g.detectado = Math.max(g.detectado, h.detectado || 0);
    });
    return [...por.values()].map((g) => { g.huella = rsHash(g.recetas.map((h) => h.mdRecetaId + h.huella).sort().join('|')); g.obs = d.obs[g.mdId + '|' + g.huella] || null; return g; })
      .sort((a, b) => (+(b.fechaSap || 0) - +(a.fechaSap || 0)) || b.detectado - a.detectado || String(b.codigo).localeCompare(String(a.codigo)));
  }
  const rsTipoTxt = (tipos) => [...tipos].map((t) => (t === 'lista' ? 'Lista de materiales' : 'Hoja de ruta')).join(' + ');
  const rsResumenReceta = (h) => [h.dif.length && `Lista de materiales: ${resumenDif(h.dif)}`, h.rutaAvisa && `Hoja de ruta: ${rsResumenRuta(h.ruta)}`].filter(Boolean).join(' · ');
  const rsFechaSap = (d) => (d instanceof Date && !isNaN(d) ? fechaCorta(d) : '');
  const rsCuando = (ms) => (ms ? fechaHoraCorta(ms) : '');
  const rsMarca = { nuevo: 'Nuevo en SAP', cambia: 'Otra cantidad o unidad', quitado: 'Quitado en SAP', reemplazo: 'Reemplazado por otra versión del material' };
  function rsUsuarioIniciales() {
    for (const w of [window, window.parent, window.top]) {
      try {
        const u = w.sap && w.sap.ushell && w.sap.ushell.Container && w.sap.ushell.Container.getUser(); if (!u) continue;
        let i = Reglas.inicialesDe((u.getFirstName && u.getFirstName()) || '', (u.getLastName && u.getLastName()) || '');
        if (i.length < 2) { const n = String((u.getFullName && u.getFullName()) || '').trim().split(/\s+/); i = Reglas.inicialesDe(n[0], n[1]); }
        if (i) return i;
      } catch (e) { /* otro origen */ }
    }
    return '';
  }
  // ---- el icono tenue junto a «Manufactura Digital» ----
  function rsEstadoBoton(b) {
    const d = RS.datos, mds = d ? new Set(d.hallazgos.map((h) => h.mdId)) : new Set(), n = mds.size, ing = d ? new Set(d.hallazgos.filter((h) => h.estado === 'Ingresado').map((h) => h.mdId)).size : 0;
    b.classList.toggle('vacio', !n); b.classList.toggle('leyendo', RS.leyendo); setTxt(b.querySelector('.n'), n ? String(n) : '');
    const ult = d && (d.ultima.ing || d.ultima.aut) ? ` Última revisión: ${fechaHoraCorta(Math.max(d.ultima.ing, d.ultima.aut))}.` : '';
    const t = RS.leyendo ? `Revisando las recetas de los RMD frente a SAP… ${RS.progreso}` : n ? `${n} RMD con cambios en su receta en SAP pendientes de volver a asociar (${ing} Ingresados, ${n - ing} Autorizados).${ult} Clic para ver el detalle.`
      : ult ? `Sin cambios de receta pendientes en SAP.${ult} Clic para abrir.` : 'Cambios de recetas en SAP: aún sin revisar. Clic para abrir.';
    if (b.title !== t) b.title = t;
  }
  function gestionarAlertaRecetas() {
    const viejo = document.querySelector('.rmd-alerta-rec'), ctrl = typeof sap !== 'undefined' && controladorPrincipal();
    if (!ctrl || !on('cambiosrecetas')) { if (viejo) viejo.remove(); return; }
    const tit = ctrl.getView().byId('titHeader'), dom = tit && tit.getDomRef(); if (!dom || !visible(dom)) return;
    let b = dom.parentElement && dom.parentElement.querySelector(':scope > .rmd-alerta-rec');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'rmd-alerta-rec'; b.innerHTML = ICONO_AVISO + '<span class="n"></span>';
      ['pointerdown', 'mousedown', 'touchstart'].forEach((ev) => b.addEventListener(ev, (e) => e.stopPropagation()));
      b.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); abrirCambiosRecetas(); });
      dom.insertAdjacentElement('afterend', b);
    }
    rsEstadoBoton(b);
    if (!RS.arrancado) { RS.arrancado = true; rsArrancar(); }
  }
  function rsPintar(soloEstado) { RS.ver++; const b = document.querySelector('.rmd-alerta-rec'); if (b) rsEstadoBoton(b); if (RS.ventana && RS.ventana.fondo.isConnected) (soloEstado ? RS.ventana.pintarEstado : RS.ventana.pintar)(); }
  // ---- la ventana ----
  async function abrirCambiosRecetas() {
    if (RS.ventana && RS.ventana.fondo.isConnected) return;
    registrarExternosUI5(); await rsDatos();
    if (RS.ventana && RS.ventana.fondo.isConnected) return;
    let filtro = 'todos', consulta = '', trabajando = false;
    const sel = new Set(), abiertos = new Set(), editadas = new Map();
    const v = ventana('Cambios de recetas en SAP', { cancelar: () => { if (!trabajando) v.cerrar(); } }), tarjeta = v.fondo.querySelector('.rmd-modal');
    tarjeta.classList.add('rmd-cr'); RS.ventana = v;
    const cerrarOrig = v.cerrar; v.cerrar = () => { RS.ventana = null; cerrarOrig(); };
    v.cuerpo.innerHTML = `<p class="rmd-cr-intro">RMD <b>Ingresados y Autorizados</b> cuya receta cambió en SAP después de asociarla: hay que retirarla y volver a asociarla para traer lo nuevo. Es solo un aviso: no impide autorizar.
      SAP informa la <b>fecha</b> de cada cambio de la lista de materiales; la <b>hora</b> es la de la revisión que lo detectó.</p>
      <div class="rmd-cr-barra"><div class="rmd-cr-chips" role="tablist"></div><input type="search" class="rmd-cr-buscar" placeholder="Buscar por código, descripción, receta o componente"></div>
      <p class="rmd-progreso rmd-cr-estado"></p><div class="rmd-cr-tabla"></div>`;
    const q = (s) => v.cuerpo.querySelector(s), chips = q('.rmd-cr-chips'), buscar = q('.rmd-cr-buscar'), estado = q('.rmd-cr-estado'), tabla = q('.rmd-cr-tabla');
    const norma = (t) => SIN_ACENTOS(t);
    const filtrados = () => rsGrupos().filter((g) => {
      if (filtro === 'Ingresado' || filtro === 'Autorizado') { if (g.estado !== filtro) return false; } else if (filtro === 'lista' || filtro === 'ruta') { if (!g.tipos.has(filtro)) return false; }
      if (!consulta) return true;
      const t = norma([g.codigo, g.descripcion, g.etapa, g.planta, ...g.recetas.flatMap((h) => [h.receta, h.texto, ...h.dif.flatMap((d) => [d.comp, d.desc, d.compAntes, d.descAntes])])].join(' '));
      return consulta.split(/\s+/).every((p) => t.includes(p));
    });
    const bObs = botonModal('Agregar observación', 'peligro', () => agregarObservacion()), bX = botonModal('Exportar Excel', '', () => exportarCambiosRecetas()),
      bIng = botonModal('Revisar Ingresados', '', () => rsRevisar('ingresados')), bTodos = botonModal('Revisar todos', '', async () => { if (await confirmar('¿Revisar todos los RMD?', 'Se vuelven a leer en SAP las listas de materiales de todos los RMD Ingresados y Autorizados (unas 4 000 lecturas).', 'Puede tardar entre 10 y 40 minutos según SAP; puedes seguir trabajando y detenerlo con «Detener». Sin esto, el script las revisa solo, poco a poco.', { si: 'Revisar todos', no: 'Cancelar' })) rsRevisar('todos'); }),
      bStop = botonModal('Detener', '', () => { RS.cancelar = true; setTxt(bStop, 'Deteniendo…'); }),
      bBorrar = botonModal('Borrar lo guardado', '', async () => { if (await confirmar('¿Borrar lo guardado?', 'Se borran los resultados de la última revisión y lo leído de cada RMD en este navegador. La próxima revisión lee todo de nuevo (los Autorizados tardan varios minutos).', 'No cambia nada en SAP ni en los RMD.', { si: 'Borrar', no: 'Cancelar', peligro: true })) { sel.clear(); abiertos.clear(); await rsBorrarTodo(); } }), bCerrar = botonModal('Cerrar', 'primario', () => { if (!trabajando) v.cerrar(); });
    bIng.title = 'Vuelve a leer SAP para los RMD Ingresados ahora (de 1 a 6 minutos).'; bTodos.title = 'Vuelve a leer SAP para todos, también los Autorizados (de 10 a 40 minutos).';
    v.pie.append(bBorrar, bCerrar, bX, bIng, bTodos, bStop, bObs);
    const lineaDe = (g, hoy) => Reglas.lineaActualizacion(hoy, rsUsuarioIniciales(), { lista: g.tipos.has('lista'), ruta: g.tipos.has('ruta') });
    const lineaPlan = (g, hoy) => (editadas.has(g.mdId) ? editadas.get(g.mdId) : lineaDe(g, hoy)).replace(/\s*[\r\n]+\s*/g, ' ').trim();
    v.pintarEstado = () => {
      const d = RS.datos, ult = d && (d.ultima.ing || d.ultima.aut) ? `Última revisión: Ingresados ${d.ultima.ing ? fechaHoraCorta(d.ultima.ing) : '—'} · Autorizados ${d.ultima.aut ? fechaHoraCorta(d.ultima.aut) : '—'}${d.cobertura ? ` · ${d.cobertura.alDia} de ${d.cobertura.listas} listas de materiales al día${d.cobertura.alDia < d.cobertura.listas ? ' (el resto se revisa solo en segundo plano)' : ''}` : ''}${d.lecturas && d.lecturas.sinLectura ? ` · ${d.lecturas.sinLectura} sin lectura en SAP` : ''}` : 'Aún no se revisó.';
      setTxt(estado, RS.leyendo ? `${RS.progreso}` : RS.error ? RS.error : ult); estado.classList.toggle('error', !!RS.error && !RS.leyendo);
    };
    v.pintar = () => {
      const grupos = rsGrupos(), d = RS.datos, cuenta = (f) => grupos.filter(f).length;
      const defs = [['todos', 'Todos', grupos.length], ['Ingresado', 'Ingresados', cuenta((g) => g.estado === 'Ingresado')], ['Autorizado', 'Autorizados', cuenta((g) => g.estado === 'Autorizado')],
        ['lista', 'Lista de materiales', cuenta((g) => g.tipos.has('lista'))], ['ruta', 'Hoja de ruta', cuenta((g) => g.tipos.has('ruta'))]];
      chips.innerHTML = defs.map(([k, t, n]) => `<button type="button" role="tab" data-f="${k}" class="${filtro === k ? 'activo' : ''}" aria-selected="${filtro === k}">${esc(t)} <span>${n}</span></button>`).join('');
      v.pintarEstado();
      const filas = filtrados(), hoyDia = new Date(), ini = rsUsuarioIniciales();
      const hayTrabajo = RS.leyendo || trabajando;
      bIng.disabled = bTodos.disabled = bX.disabled = bBorrar.disabled = hayTrabajo; bStop.hidden = !hayTrabajo; bObs.hidden = !grupos.length;
      const pendientes = [...sel].filter((id) => { const g = grupos.find((x) => x.mdId === id); return g && !g.obs; });
      bObs.disabled = hayTrabajo || !pendientes.length; setTxt(bObs, pendientes.length ? `Agregar observación a ${pendientes.length}` : 'Agregar observación');
      if (!filas.length) { tabla.innerHTML = `<p class="rmd-nota">${grupos.length ? 'Ningún RMD coincide con el filtro.' : d && (d.ultima.ing || d.ultima.aut) ? '✓ Ningún RMD tiene cambios de receta pendientes.' : 'Pulsa «Revisar Ingresados» (rápido) o «Revisar todos» para empezar.'}</p>`; return; }
      const sinObs = filas.filter((g) => !g.obs);
      tabla.innerHTML = `<table class="rmd-tabla rmd-cr-t"><thead><tr><th class="rmd-cr-sel"><input type="checkbox" data-a="todas" ${sinObs.length && sinObs.every((g) => sel.has(g.mdId)) ? 'checked' : ''} aria-label="Seleccionar todos"></th><th>RMD</th><th>Estado</th><th>Recetas</th><th>Qué cambió</th><th>Fecha en SAP</th><th>Detectado</th><th>Observación a agregar</th><th></th></tr></thead><tbody>${filas.map((g) => {
        const r = RS.resultados.get(g.mdId), abierto = abiertos.has(g.mdId), linea = g.obs ? g.obs.linea : lineaDe(g, hoyDia);
        return `<tr class="rmd-cr-fila${abierto ? ' abierta' : ''}" data-md="${esc(g.mdId)}"><td class="rmd-cr-sel"><input type="checkbox" data-a="sel" ${sel.has(g.mdId) ? 'checked' : ''} ${g.obs || hayTrabajo ? 'disabled' : ''} aria-label="Seleccionar ${esc(g.codigo)}"></td>
          <td><b>${esc(g.codigo)}</b> <span class="rmd-nota">v${esc(g.version)}</span><br><span class="rmd-nota">${esc(g.descripcion)}</span></td>
          <td class="rmd-nowrap">${esc(g.estado)}</td>
          <td>${g.recetas.map((h) => `<span class="rmd-nowrap">${esc(h.receta)}</span>`).join('<br>')}</td>
          <td>${g.recetas.map((h) => `<span class="rmd-cr-tag ${h.tipos.length > 1 ? 'dos' : h.tipos[0]}">${esc(rsTipoTxt(h.tipos))}</span> ${esc(rsResumenReceta(h))}`).join('<br>')}</td>
          <td class="rmd-nowrap">${esc(rsFechaSap(g.fechaSap)) || '<span class="rmd-nota" title="SAP no informa la fecha del cambio de la hoja de ruta">—</span>'}</td>
          <td class="rmd-nowrap">${esc(rsCuando(g.detectado))}</td>
          <td class="rmd-cr-obs">${r ? esc(r) : g.obs ? `<span title="${esc(g.obs.linea)}">✓ ${esc(fechaHoraCorta(g.obs.t).slice(0, 10))}</span>` : ini ? `<input type="text" class="rmd-cr-obs-in" data-a="obs" value="${esc(editadas.has(g.mdId) ? editadas.get(g.mdId) : linea)}" title="Puedes editar el texto antes de agregarlo" aria-label="Observación de ${esc(g.codigo)}">` : ''}</td>
          <td class="rmd-nowrap"><button type="button" class="rmd-link" data-a="ver">${abierto ? 'Ocultar' : 'Ver detalle'}</button> · <button type="button" class="rmd-link" data-a="abrir" title="Abrir «Asociar fórmulas» de este RMD">Abrir</button></td></tr>
          ${abierto ? `<tr class="rmd-cr-detalle"><td colspan="9">${g.recetas.map(detalleRecetaHtml).join('<hr>')}<p class="rmd-nota">Para traer lo nuevo: en «Asociar fórmulas», <b>Eliminar Receta</b> → <b>Agregar Producto</b> → asociarla de nuevo.</p></td></tr>` : ''}`;
      }).join('')}</tbody></table>`;
    };
    chips.addEventListener('click', (e) => { const b = e.target.closest('button[data-f]'); if (b) { filtro = b.dataset.f; v.pintar(); } });
    buscar.addEventListener('input', () => { consulta = norma(buscar.value).trim(); v.pintar(); });
    tabla.addEventListener('input', (e) => { if (e.target.dataset.a !== 'obs') return; const f = e.target.closest('tr[data-md]'); if (f) editadas.set(f.dataset.md, e.target.value); });
    tabla.addEventListener('change', (e) => {
      const a = e.target.dataset.a, fila = e.target.closest('tr[data-md]');
      if (a === 'sel' && fila) { e.target.checked ? sel.add(fila.dataset.md) : sel.delete(fila.dataset.md); v.pintar(); }
      else if (a === 'todas') { filtrados().filter((g) => !g.obs).forEach((g) => (e.target.checked ? sel.add(g.mdId) : sel.delete(g.mdId))); v.pintar(); }
    });
    tabla.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]'), fila = e.target.closest('tr[data-md]'); if (!b || !fila) return;
      const id = fila.dataset.md, g = rsGrupos().find((x) => x.mdId === id);
      if (b.dataset.a === 'ver') { abiertos.has(id) ? abiertos.delete(id) : abiertos.add(id); v.pintar(); }
      else if (b.dataset.a === 'abrir' && g) { if (trabajando || RS.leyendo) return; v.cerrar(); abrirRmdPorCodigo(g.codigo, 'asociar', g.version); }
    });
    const verificarObs = async (modelo, codigo, linea) => { const md2 = (await leerMDPorCodigos(modelo, [codigo])).sort((a, b) => b.version - a.version)[0]; return !!md2 && String(md2.observacion || '').replace(/\s+$/, '').endsWith(linea); };
    async function agregarObservacion() {
      const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'), grupos = rsGrupos().filter((g) => sel.has(g.mdId) && !g.obs);
      if (!ctrl || !modelo) { toast('Abre la lista «Configuración Manufactura Digital».', true); return; }
      if (dialogos().length) { toast('Cierra las ventanas abiertas del portal antes de agregar observaciones.', true); return; }
      const ini = rsUsuarioIniciales(); if (!ini) { toast('No se pudieron leer tus iniciales en SAP (nombre y apellido del launchpad).', true); return; }
      if (!grupos.length) return;
      if (grupos.some((g) => !lineaPlan(g, new Date()))) { toast('Hay una observación vacía: escríbela o quita la selección de ese RMD.', true); return; }
      const hoy = new Date(), plan = grupos.map((g) => ({ g, linea: lineaPlan(g, hoy) })), distintas = [...new Set(plan.map((x) => x.linea.replace(/^\d{8}[^ ]* /, '')))];
      const ok = await confirmar(`¿Agregar la observación a ${plan.length} RMD?`,
        `Se agregará al final de las Observaciones de ${plan.length} RMD (${plan.filter((x) => x.g.estado === 'Ingresado').length} Ingresados, ${plan.filter((x) => x.g.estado === 'Autorizado').length} Autorizados) el texto de su fila (por ejemplo «${plan[0].linea}»).`,
        'Se guarda con el Guardar de «Asociar fórmulas» de cada RMD, igual que en las modificaciones masivas: el Estado no cambia. En un Autorizado de Fabricación o Envase el portal puede pedir revisar el comparador de fórmula y no guardar: se te avisa. Para quitar la línea habría que editarla a mano.',
        { si: `Agregar a ${plan.length}`, no: 'Cancelar' });
      if (!ok) return;
      trabajando = true; RS.cancelar = false; RS.resultados.clear(); v.pintar();
      const filtroAntes = ctrl.getView().getModel('oDataFilter').getProperty('/code') || '';
      let hechos = 0;
      try {
        for (let i = 0; i < plan.length && !RS.cancelar; i++) {
          const { g, linea } = plan[i]; RS.resultados.set(g.mdId, `Agregando… (${i + 1} de ${plan.length})`); v.pintar();
          try {
            await modificarUno(ctrl, g.codigo, { suspender: false, linea });
            if (await (RS.verificar || verificarObs)(modelo, g.codigo, linea)) { RS.datos.obs[g.mdId + '|' + g.huella] = { t: Date.now(), linea }; RS.resultados.delete(g.mdId); sel.delete(g.mdId); hechos++; await rsGuardar(); }
            else RS.resultados.set(g.mdId, 'No se guardó (la línea no quedó en SAP)');
          } catch (e) { RS.resultados.set(g.mdId, 'No se guardó: ' + e.message); }
          v.pintar();
        }
        toast(`Observación agregada a ${hechos} de ${plan.length} RMD.${hechos < plan.length ? ' Los demás quedan marcados con el motivo.' : ''}`, hechos < plan.length);
      } finally {
        trabajando = false; RS.cancelar = false;
        try { ctrl.getView().getModel('oDataFilter').setProperty('/code', filtroAntes); await ctrl.onSearch(); } catch (e) { /* la lista se actualiza al próximo «Ir» */ }
        v.pintar();
      }
    }
    v.pintar(); setTimeout(() => buscar.focus(), 40);
  }
  // ---- Excel: Resumen (una fila por RMD y receta) y Diferencias (una fila por componente o dato de la hoja de ruta) ----
  function rsArmarExcel() {
    const d = RS.datos || RS_VACIO(), hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), libro = Xlsx.crearLibro();
    const utc = (x) => (x instanceof Date && !isNaN(x) ? new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate(), x.getHours(), x.getMinutes())) : '');
    const hs = [...d.hallazgos].sort((a, b) => (+(b.fechaSap || 0) - +(a.fechaSap || 0)) || String(b.codigo).localeCompare(String(a.codigo))), grupos = new Map(rsGrupos().map((g) => [g.mdId, g])), ini = rsUsuarioIniciales();
    const tabla = (nombre, nt, cab, anchos, datos, estilos = {}, op = {}) => {
      const h = libro.hoja(nombre, { activa: !!op.activa, congelar: op.congelar || 'A2', cols: anchos.map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: nt, ref: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, datos.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      datos.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'normal'); }));
    };
    tabla('Resumen', 'RecetasConCambios', ['Código RMD', 'Versión', 'Descripción del master', 'Estado', 'Etapa', 'Área (sección)', 'Planta', 'Receta', 'Descripción de la receta', 'Qué cambió', 'Resumen', 'Fecha del cambio en SAP', 'Detectado el', 'Observación sugerida', 'Observación agregada el'],
      [13, 9, 44, 12, 15, 24, 14, 18, 40, 20, 70, 14, 18, 52, 18],
      hs.map((h) => { const g = grupos.get(h.mdId); return [h.codigo, h.version, h.descripcion, h.estado, h.etapa, h.area, h.planta, h.receta, h.texto, rsTipoTxt(h.tipos), rsResumenReceta(h), h.fechaSap instanceof Date ? new Date(Date.UTC(h.fechaSap.getUTCFullYear(), h.fechaSap.getUTCMonth(), h.fechaSap.getUTCDate())) : '', utc(new Date(h.detectado || 0)),
        Reglas.lineaActualizacion(hoy, ini, { lista: h.tipos.includes('lista'), ruta: h.tipos.includes('ruta') }), g && g.obs ? utc(new Date(g.obs.t)) : '']; }),
      { 3: 'normal', 10: 'envuelto', 11: 'fecha', 12: 'fechaHora', 14: 'fechaHora' }, { activa: true, congelar: 'B2' });
    const dif = [];
    hs.forEach((h) => {
      h.dif.forEach((x) => dif.push([h.codigo, h.version, h.estado, h.receta, 'Lista de materiales', rsMarca[x.tipo], x.tipo === 'reemplazo' ? `${x.compAntes} → ${x.comp}` : x.comp, x.desc + (x.tipo === 'reemplazo' && x.descAntes ? ` (antes: ${x.descAntes})` : ''),
        x.antes ? `${numTxt(x.antes.q)} ${x.antes.u}`.trim() : '', x.ahora ? `${numTxt(x.ahora.q)} ${x.ahora.u}`.trim() : '', x.fecha instanceof Date ? new Date(Date.UTC(x.fecha.getUTCFullYear(), x.fecha.getUTCMonth(), x.fecha.getUTCDate())) : '', x.cambio || '']));
      if (h.rutaAvisa) {
        if (!h.ruta.existe) dif.push([h.codigo, h.version, h.estado, h.receta, 'Hoja de ruta', 'La versión de fabricación ya no existe en SAP', '', '', '', '', '', '']);
        h.ruta.cambios.forEach((c) => dif.push([h.codigo, h.version, h.estado, h.receta, 'Hoja de ruta', c.campo, '', '', c.asociada || '', c.sap || '', '', '']));
      }
    });
    tabla('Diferencias', 'DiferenciasRecetas', ['Código RMD', 'Versión', 'Estado', 'Receta', 'Tipo', 'Diferencia', 'Componente / dato', 'Descripción', 'En el RMD', 'En SAP hoy', 'Fecha en SAP', 'N.º de cambio'],
      [13, 9, 12, 18, 18, 34, 24, 52, 16, 16, 13, 16], dif, { 10: 'fecha', 7: 'envuelto' });
    const hI = libro.hoja('Información', { cols: [[1, 1, 34], [2, 2, 100]]});
    hI.poner('A1', 'Recetas con cambios en SAP (RMD Ingresados y Autorizados)', 'titulo');
    [['Generado', `${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())}`],
      ['Última revisión de SAP', `Ingresados ${d.ultima.ing ? fechaHoraCorta(d.ultima.ing) : 'sin revisar'} · Autorizados ${d.ultima.aut ? fechaHoraCorta(d.ultima.aut) : 'sin revisar'}`],
      ['Listas de materiales revisadas', d.cobertura ? `${d.cobertura.alDia} de ${d.cobertura.listas} al día${d.cobertura.alDia < d.cobertura.listas ? ' (el resto se revisa solo, en segundo plano: este Excel puede estar incompleto)' : ''}` : 'sin revisar'],
      ['RMD con cambios', new Set(hs.map((h) => h.mdId)).size], ['Recetas con cambios', hs.length],
      ['Qué compara', 'La lista de materiales y los datos de la versión de fabricación (puesto de trabajo, hoja de ruta, contador y alternativa) copiados en el RMD al asociar la receta, frente a lo que devuelve hoy SAP. Solo se revisa la última versión de cada RMD Ingresado o Autorizado.'],
      ['Fecha y hora', 'SAP informa la fecha «válido desde» de cada componente, no la hora ni la fecha de la hoja de ruta. «Detectado el» es la fecha y hora de la revisión que vio la diferencia por primera vez.'],
      ['Cómo se corrige', 'En «Asociar fórmulas» del RMD: Eliminar Receta → Agregar Producto → asociarla de nuevo.']]
      .forEach(([a, b], i) => { hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return { libro, nombre: `Recetas con cambios en SAP ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.xlsx`, rmd: new Set(hs.map((h) => h.mdId)).size, recetas: hs.length, diferencias: dif.length };
  }
  async function exportarCambiosRecetas() {
    await rsDatos();
    if (!RS.datos || !(RS.datos.ultima.ing || RS.datos.ultima.aut)) { toast('Aún no se revisaron las recetas: se abre la ventana para empezar.', true); abrirCambiosRecetas(); return; }
    try { const { libro, nombre, rmd } = rsArmarExcel(); descargarArchivo(nombre, await libro.generar(), TIPO_XLSX); toast(`Excel de ${rmd} RMD con cambios de receta en SAP (revisión del ${fechaHoraCorta(Math.max(RS.datos.ultima.ing, RS.datos.ultima.aut))}).`); }
    catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); }
  }
  // diagnóstico y pruebas
  window.__rmdStats.recetasSap = {
    estado: RS, datos: rsDatos, revisar: rsRevisar, borrar: rsBorrarTodo, copias: rsCopias, grupos: rsGrupos, abrir: abrirCambiosRecetas, comparar: rsCompararRecetas, hash: rsHash, iniciales: rsUsuarioIniciales,
    poner: async (hallazgos, ultima) => { const d = await rsDatos(); d.hallazgos = hallazgos; d.detectado = {}; hallazgos.forEach((h) => { d.detectado[h.mdRecetaId + '|' + h.huella] = h.detectado || Date.now(); }); d.ultima = ultima || { ing: Date.now(), aut: Date.now() }; RS.ver++; rsPintar(); },
    respaldo: async () => structuredClone(await rsDatos()), restaurar: async (d) => { RS.datos = d ? structuredClone(d) : RS_VACIO(); await rsGuardar(); rsPintar(); },
    excel: async () => { const x = rsArmarExcel(); return { ...x, base64: aBase64(await x.libro.generar()) }; },
  };

  // ---- 9 quinquies. Historial de cambios en «Trazabilidad RMD» (v1.38) ----
  // Dos fuentes, ninguna con fotos propias del script:
  //  · Entre versiones: cada versión de un RMD es un registro aparte (mismo «código de versión principal»); sus estructuras, etiquetas, pasos,
  //    procesos menores, insumos, recetas y especificaciones se emparejan por su código de estructura, etiqueta y paso (los mismos en todas las
  //    versiones) y se comparan.
  //  · Por guardado: la tabla AUDITORIA del servicio guarda el contenido de cada guardado con el usuario (dentro del valor: usuarioActualiza),
  //    desde enero de 2024. Solo se consulta por fila (≈ 1 s cada una: el servidor no filtra rápido por otra cosa). Como el portal reenvía la fila
  //    (a veces solo algunos campos), el «antes» sale de acumular los guardados anteriores de esa misma fila.
  const TZ_ESTR_ORDEN = ['Cabecera', 'Etiquetas', 'Pasos', 'Procesos menores', 'Insumos', 'Recetas', 'Especificaciones'];
  const TZ_CAMPOS_PASO = [['orden', 'Orden', 'n'], ['valorInicial', 'Val. Inicial', 'n'], ['valorFinal', 'Val. Final', 'n'], ['margen', 'Margen', 'n'], ['decimales', 'Decimales', 'n'], ['tipoDato', 'Tipo Dato', 't'],
    ['depende', 'Depende del paso', 't'], ['estadoCC', 'Estado CC', 'b'], ['estadoMov', 'Estado Mov.', 'b'], ['pmop', 'PM OP', 'b'], ['genpp', 'Gen PP', 'b'], ['tab', 'Tab', 'b'], ['edit', 'Edit', 'b'], ['rpor', 'R. Por', 'b'],
    ['vb', 'V.B.', 'b'], ['formato', 'Formato', 'b'], ['puestoTrabajo', 'Puesto de trabajo', 't'], ['clvModelo', 'Clave modelo', 't'], ['automatico', 'Automático', 'b']];
  const TZ_CAMPOS_PM = [['orden', 'Orden', 'n'], ['cantidadInsumo', 'Cantidad insumos', 'n'], ['tipoDato', 'Tipo Dato', 't'], ['valorInicial', 'Val. Inicial', 'n'], ['valorFinal', 'Val. Final', 'n'], ['margen', 'Margen', 'n'],
    ['decimales', 'Decimales', 'n'], ['estadoCC', 'Estado CC', 'b'], ['estadoMov', 'Estado Mov.', 'b'], ['genpp', 'Gen PP', 'b'], ['edit', 'Edit', 'b'], ['tab', 'Tab', 'b'], ['formato', 'Formato', 'b'], ['Component', 'Componente', 't'], ['CompUnit', 'UM', 't']];
  const TZ_CAMPOS_ETQ = [['orden', 'Orden', 'n'], ['conforme', 'Conforme', 'b'], ['procesoMenor', 'Proceso menor', 'b']];
  const TZ_CAMPOS_INS = [['CompQty', 'Cantidad', 'n'], ['CompUnit', 'UM', 't'], ['Maktx', 'Descripción', 't'], ['cantidadRm', 'Cantidad RM', 'n']];
  const TZ_CAMPOS_ESP = [['especificacion', 'Especificación', 't'], ['tipoDato', 'Tipo Dato', 't'], ['valorInicial', 'Val. Inicial', 'n'], ['valorFinal', 'Val. Final', 'n'], ['margen', 'Margen', 'n'], ['decimales', 'Decimales', 'n'], ['orden', 'Orden', 'n']];
  const TZ_CAMPOS_MD = [['descripcion', 'Descripción', 't'], ['nivelTxt', 'Etapa', 't'], ['areaRmdTxt', 'Área', 't'], ['sucursal', 'Planta', 't'], ['codAgrupadorReceta', 'Cód. agrupador de receta', 't'], ['codDefectoReceta', 'Cód. de receta por defecto', 't'], ['rptaValidacion', 'Validación', 't']];
  // nombres de los campos tal como llegan en el guardado (AUDITORIA); los no listados salen con su nombre técnico
  const TZ_ETIQUETA_CAMPO = { orden: 'Orden', valorInicial: 'Val. Inicial', valorFinal: 'Val. Final', margen: 'Margen', decimales: 'Decimales', tipoDatoId_iMaestraId: 'Tipo Dato', depende: 'Depende del paso', estadoCC: 'Estado CC', estadoMov: 'Estado Mov.',
    pmop: 'PM OP', genpp: 'Gen PP', tab: 'Tab', edit: 'Edit', rpor: 'R. Por', vb: 'V.B.', formato: 'Formato', imagen: 'Imagen', colorHex: 'Color', colorRgb: 'Color', puestoTrabajo: 'Puesto de trabajo', clvModelo: 'Clave modelo', automatico: 'Automático',
    cantidadInsumo: 'Cantidad insumos', Component: 'Componente', CompUnit: 'UM', CompQty: 'Cantidad', Maktx: 'Descripción', activo: 'Activo', conforme: 'Conforme', procesoMenor: 'Proceso menor', observacion: 'Observaciones',
    estadoIdRmd_iMaestraId: 'Estado', estadoIdProceso_iMaestraId: 'Estado del proceso', masRecetas: 'Más de una receta', rptaValidacion: 'Validación', descripcion: 'Descripción', nivelTxt: 'Etapa', areaRmdTxt: 'Área', codigo: 'Código',
    codAgrupadorReceta: 'Cód. agrupador de receta', codDefectoReceta: 'Cód. de receta por defecto', especificacion: 'Especificación', ensayoHijo: 'Ensayo', cantidadRm: 'Cantidad RM', cantidadBarCode: 'Cantidad código de barras' };
  const TZ_IGNORAR = /^(fechaActualiza|usuarioActualiza|fechaRegistro|usuarioRegistro|terminal|mdEstructuraPasoId|mdEstructuraPasoIdDepende|dependeMdEstructuraPasoId|tipoDatoIdAnterior_iMaestraId|mdId|archivoMD|af|wfInstanceId|mdEstructuraPasoInsumoPasoId|mdEsEtiquetaId|mdEstructuraEspecificacionId|estructuraRecetaInsumoId|mdRecetaId|flagModif|rptaValidacionDate|firstFechaActualiza|styleUser|enabledCheck|verifCheck|usuarioVerificador)$/;
  const tzNum = (v) => { if (v == null || v === '') return ''; const n = Number(v); return isNaN(n) ? String(v).trim() : String(n); };
  const tzNorm = (v, t) => (t === 'b' ? (v ? 'Sí' : 'No') : t === 'n' ? tzNum(v) : v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const tzActivo = (x) => x && x.activo !== false;
  const tzFilaAud = (r, md) => { const cuando = r.fechaActualiza || r.fechaRegistro || null, aut = md && md.fechaAutorizacion ? +new Date(md.fechaAutorizacion) : 0, t = cuando ? +new Date(cuando) : 0;
    return { quien: r.usuarioActualiza || r.usuarioRegistro || '', cuando, modificado: !!r.usuarioActualiza, alAutorizar: !!(aut && t && !r.usuarioActualiza && aut - t < 600000 && aut - t > -600000) }; };
  const tzTipo = (o, cat) => (o && (o.contenido || o.descripcion)) || '';
  // Lo leído de UNA versión del RMD, ya con las claves de emparejamiento (estructura | etiqueta | paso # ocurrencia)
  function tzNormalizar(md, d, cat) {
    const lugar = (estr, etq) => `${cat.estructura.get(estr) || 'Estructura'} › ${cat.etiqueta.get(etq) || 'Etiqueta'}`;
    const ocurr = new Map(), sig = (k) => { const n = (ocurr.get(k) || 0) + 1; ocurr.set(k, n); return n; }, porOrden = (a, b) => (+a.orden || 0) - (+b.orden || 0);
    const etqPorId = new Map(d.etiquetas.filter(tzActivo).map((e) => [e.mdEsEtiquetaId, e]));
    const etiquetas = [...etqPorId.values()].sort(porOrden).map((e) => { const base = `${e.estructuraId_estructuraId}|${e.etiquetaId_etiquetaId}`;
      return { id: e.mdEsEtiquetaId, key: `${base}#${sig('e' + base)}`, lugar: lugar(e.estructuraId_estructuraId, e.etiquetaId_etiquetaId), orden: e.orden, conforme: e.conforme, procesoMenor: e.procesoMenor, ...tzFilaAud(e, md) }; });
    const pasosPorId = new Map();
    const pasos = d.pasos.filter(tzActivo).sort(porOrden).map((p) => {
      const e = etqPorId.get(p.mdEsEtiquetaId_mdEsEtiquetaId), etqId = e ? e.etiquetaId_etiquetaId : '', cod = p.pasoId ? p.pasoId.codigo : '', base = `${p.estructuraId_estructuraId}|${etqId}|${cod}`;
      const r = { id: p.mdEstructuraPasoId, key: `${base}#${sig('p' + base)}`, grupo: `${p.estructuraId_estructuraId}|${etqId}`, lugar: lugar(p.estructuraId_estructuraId, etqId), paso: cod, desc: norm(p.pasoId ? p.pasoId.descripcion : ''), orden: p.orden,
        valorInicial: p.valorInicial, valorFinal: p.valorFinal, margen: p.margen, decimales: p.decimales, tipoDato: tzTipo(p.tipoDatoId), depende: p.depende, estadoCC: p.estadoCC, estadoMov: p.estadoMov, pmop: p.pmop, genpp: p.genpp, tab: p.tab, edit: p.edit,
        rpor: p.rpor, vb: p.vb, formato: p.formato, puestoTrabajo: p.puestoTrabajo, clvModelo: p.clvModelo, automatico: p.automatico, ...tzFilaAud(p, md) };
      if (p.tipoDatoId_iMaestraId != null && r.tipoDato) cat.tipos.set(p.tipoDatoId_iMaestraId, r.tipoDato);
      pasosPorId.set(r.id, r); return r; });
    const pm = d.pm.filter(tzActivo).sort(porOrden).map((p) => {
      const padre = pasosPorId.get(p.pasoId_mdEstructuraPasoId); if (!padre) return null;
      const cod = p.pasoHijoId ? p.pasoHijoId.codigo : '', base = `${padre.key}|${cod}`;
      if (p.tipoDatoId_iMaestraId != null && p.tipoDatoId) cat.tipos.set(p.tipoDatoId_iMaestraId, tzTipo(p.tipoDatoId));
      return { id: p.mdEstructuraPasoInsumoPasoId, key: `${base}#${sig('m' + base)}`, padreKey: padre.key, lugar: padre.lugar, paso: padre.paso, desc: padre.desc, hijo: cod, hijoDesc: norm(p.pasoHijoId ? p.pasoHijoId.descripcion : ''), orden: p.orden,
        cantidadInsumo: p.cantidadInsumo, tipoDato: tzTipo(p.tipoDatoId), valorInicial: p.valorInicial, valorFinal: p.valorFinal, margen: p.margen, decimales: p.decimales, estadoCC: p.estadoCC, estadoMov: p.estadoMov, genpp: p.genpp, edit: p.edit,
        tab: p.tab, formato: p.formato, Component: p.Component, CompUnit: p.CompUnit, ...tzFilaAud(p, md) }; }).filter(Boolean);
    const recPorId = new Map(d.recetas.filter(tzActivo).map((r) => [r.mdRecetaId, r]));
    const recNombre = (r) => (r && r.recetaId ? `${norm(r.recetaId.Matnr)} / ${norm(r.recetaId.Verid)}` : '');
    const recetas = [...recPorId.values()].map((r) => ({ id: r.mdRecetaId, key: `${recNombre(r)}|${norm(r.recetaId && r.recetaId.Werks)}#${sig('r' + recNombre(r))}`, receta: recNombre(r), texto: norm(r.recetaId && r.recetaId.Text1), ...tzFilaAud(r, md) }));
    const insumos = d.insumos.filter(tzActivo).map((x) => { const rn = recNombre(recPorId.get(x.mdRecetaId_mdRecetaId)), base = `${rn}|${norm(x.Component)}|${norm(x.ItemNo)}`;
      return { id: x.estructuraRecetaInsumoId, key: `${base}#${sig('i' + base)}`, receta: rn, componente: norm(x.Component), desc: norm(x.Maktx), CompQty: x.CompQty, CompUnit: x.CompUnit, Maktx: x.Maktx, cantidadRm: x.cantidadRm, ...tzFilaAud(x, md) }; });
    const espec = d.espec.filter(tzActivo).sort(porOrden).map((x) => { const base = `${x.estructuraId_estructuraId}|${norm(x.ensayoPadreSAP)}|${norm(x.ensayoHijo)}|${norm(x.Merknr)}`;
      return { id: x.mdEstructuraEspecificacionId, key: `${base}#${sig('s' + base)}`, lugar: cat.estructura.get(x.estructuraId_estructuraId) || 'Estructura', nombre: norm(x.ensayoHijo) || norm(x.ensayoPadreSAP), especificacion: x.especificacion,
        tipoDato: cat.tipos.get(x.tipoDatoId_iMaestraId) || (x.tipoDatoId_iMaestraId == null ? '' : String(x.tipoDatoId_iMaestraId)), valorInicial: x.valorInicial, valorFinal: x.valorFinal, margen: x.margen, decimales: x.decimales, orden: x.orden, ...tzFilaAud(x, md) }; });
    const mdr = { ...md, sucursal: (md.sucursalId && md.sucursalId.contenido) || '' };
    return { md: mdr, etiquetas, pasos, pm, recetas, insumos, espec };
  }
  // Diferencias entre dos versiones ya normalizadas. Cada cambio: sección, elemento, campo, antes, después, tipo (Agregado / Quitado / Modificado /
  // Reemplazado) y el último usuario y fecha de la fila (los que el portal guarda en ella). soloOrden: el único campo que cambió es el orden.
  function tzCompararVersiones(A, B) {
    const out = [];
    const anota = (sec, elem, campo, antes, despues, tipo, fila, extra) => out.push({ seccion: sec, elemento: elem, campo, antes, despues, tipo, quien: fila ? fila.quien : '', cuando: fila ? fila.cuando : null, modificado: !!(fila && fila.modificado), alAutorizar: !!(fila && fila.alAutorizar), soloOrden: false, ...extra });
    const cruzar = (sec, la, lb, campos, elem, ext) => {
      const ma = new Map(la.map((x) => [x.key, x])), mb = new Map(lb.map((x) => [x.key, x])), agregados = lb.filter((y) => !ma.has(y.key)), quitados = la.filter((x) => !mb.has(x.key));
      lb.forEach((y) => { const x = ma.get(y.key); if (!x) return;
        const dif = campos.filter(([k, , t]) => tzNorm(x[k], t) !== tzNorm(y[k], t));
        dif.forEach(([k, n, t]) => anota(sec, elem(y), n, tzNorm(x[k], t), tzNorm(y[k], t), 'Modificado', y, { soloOrden: dif.length === 1 && k === 'orden', idFila: y.id, ...(ext || {}) })); });
      return { agregados, quitados };
    };
    // cabecera
    TZ_CAMPOS_MD.forEach(([k, n, t]) => { const a = tzNorm(A.md[k], t), b = tzNorm(B.md[k], t); if (a !== b) anota('Cabecera', 'RMD', n, a, b, 'Modificado', { quien: B.md.usuarioActualiza || '', cuando: B.md.fechaActualiza || null, modificado: true }); });
    const lineas = (t) => String(t || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean), la = lineas(A.md.observacion), lb = lineas(B.md.observacion);
    lb.filter((x) => !la.includes(x)).forEach((x) => anota('Cabecera', 'Observaciones', 'Línea agregada', '', x, 'Agregado', null));
    la.filter((x) => !lb.includes(x)).forEach((x) => anota('Cabecera', 'Observaciones', 'Línea quitada', x, '', 'Quitado', null));
    // etiquetas
    const e = cruzar('Etiquetas', A.etiquetas, B.etiquetas, TZ_CAMPOS_ETQ, (y) => y.lugar);
    e.agregados.forEach((y) => anota('Etiquetas', y.lugar, 'Etiqueta', '', `Orden ${tzNum(y.orden)}`, 'Agregado', y, { idFila: y.id }));
    e.quitados.forEach((x) => anota('Etiquetas', x.lugar, 'Etiqueta', `Orden ${tzNum(x.orden)}`, '', 'Quitado', null));
    // pasos (un paso quitado y otro agregado en el mismo lugar y orden = «Cambiar paso» → Reemplazado)
    const nombrePaso = (y) => `${y.lugar} › Paso ${y.paso}${y.desc ? ' — ' + (y.desc.length > 70 ? y.desc.slice(0, 70) + '…' : y.desc) : ''}`;
    const p = cruzar('Pasos', A.pasos, B.pasos, TZ_CAMPOS_PASO, nombrePaso), cambiados = new Set([...p.agregados, ...p.quitados].map((x) => x.key)), hijos = (arr, k) => arr.filter((z) => z.padreKey === k).length;
    const libres = [...p.quitados];
    p.agregados.forEach((y) => {
      const i = libres.findIndex((x) => x.grupo === y.grupo && tzNum(x.orden) === tzNum(y.orden));
      if (i >= 0) { const x = libres.splice(i, 1)[0]; anota('Pasos', `${y.lugar} › Orden ${tzNum(y.orden)}`, 'Paso', `${x.paso}${x.desc ? ' — ' + x.desc.slice(0, 70) : ''}`, `${y.paso}${y.desc ? ' — ' + y.desc.slice(0, 70) : ''}`, 'Reemplazado', y, { idFila: y.id }); }
      else anota('Pasos', nombrePaso(y), 'Paso', '', `Orden ${tzNum(y.orden)}${hijos(B.pm, y.key) ? ` (con ${hijos(B.pm, y.key)} procesos menores)` : ''}`, 'Agregado', y, { idFila: y.id });
    });
    libres.forEach((x) => anota('Pasos', nombrePaso(x), 'Paso', `Orden ${tzNum(x.orden)}${hijos(A.pm, x.key) ? ` (con ${hijos(A.pm, x.key)} procesos menores)` : ''}`, '', 'Quitado', null));
    // procesos menores (los de un paso agregado, quitado o reemplazado ya van dentro de ese paso)
    const nombrePm = (y) => `${y.lugar} › Paso ${y.paso} › Proceso menor ${y.hijo}${y.hijoDesc ? ' — ' + (y.hijoDesc.length > 60 ? y.hijoDesc.slice(0, 60) + '…' : y.hijoDesc) : ''}`;
    const m = cruzar('Procesos menores', A.pm.filter((z) => !cambiados.has(z.padreKey)), B.pm.filter((z) => !cambiados.has(z.padreKey)), TZ_CAMPOS_PM, nombrePm);
    m.agregados.forEach((y) => anota('Procesos menores', nombrePm(y), 'Proceso menor', '', `Orden ${tzNum(y.orden)}`, 'Agregado', y, { idFila: y.id }));
    m.quitados.forEach((x) => anota('Procesos menores', nombrePm(x), 'Proceso menor', `Orden ${tzNum(x.orden)}`, '', 'Quitado', null));
    // recetas e insumos
    const r = cruzar('Recetas', A.recetas, B.recetas, [], (y) => `Receta ${y.receta}`);
    r.agregados.forEach((y) => anota('Recetas', `Receta ${y.receta}`, 'Receta', '', y.texto || 'asociada', 'Agregado', y, { idFila: y.id }));
    r.quitados.forEach((x) => anota('Recetas', `Receta ${x.receta}`, 'Receta', x.texto || 'asociada', '', 'Quitado', null));
    const nombreIns = (y) => `Receta ${y.receta} › ${y.componente}${y.desc ? ' — ' + y.desc : ''}`;
    const i = cruzar('Insumos', A.insumos, B.insumos, TZ_CAMPOS_INS, nombreIns);
    i.agregados.forEach((y) => anota('Insumos', nombreIns(y), 'Insumo', '', `${tzNum(y.CompQty)} ${y.CompUnit || ''}`.trim(), 'Agregado', y, { idFila: y.id }));
    i.quitados.forEach((x) => anota('Insumos', nombreIns(x), 'Insumo', `${tzNum(x.CompQty)} ${x.CompUnit || ''}`.trim(), '', 'Quitado', null));
    // especificaciones
    const nombreEsp = (y) => `${y.lugar} › Especificación ${y.nombre}`;
    const s = cruzar('Especificaciones', A.espec, B.espec, TZ_CAMPOS_ESP, nombreEsp);
    s.agregados.forEach((y) => anota('Especificaciones', nombreEsp(y), 'Especificación', '', tzNorm(y.especificacion, 't'), 'Agregado', y, { idFila: y.id }));
    s.quitados.forEach((x) => anota('Especificaciones', nombreEsp(x), 'Especificación', tzNorm(x.especificacion, 't'), '', 'Quitado', null));
    const oS = (c) => TZ_ESTR_ORDEN.indexOf(c.seccion);
    return out.map((c, n) => ({ ...c, n })).sort((a, b) => (oS(a) - oS(b)) || (a.n - b.n));
  }
  // ---- por guardado (AUDITORIA) ----
  // eventos: [{ ts: Date, accion, p: contenido del guardado }] ya ordenados por fecha. Devuelve una entrada por guardado: el usuario y, campo por
  // campo, lo que cambió respecto a lo acumulado de los guardados anteriores de la misma fila (sin «antes» registrado si es el primero que se ve).
  function tzDifEventos(eventos, fmt = (k, v) => (v == null ? '' : String(v))) {
    let estado = null; const out = [];
    eventos.forEach((e) => {
      const p = e.p || {}, cambios = [], nuevo = estado ? { ...estado } : {}, primero = !estado;
      Object.entries(p).forEach(([k, v]) => {
        if (TZ_IGNORAR.test(k)) return;
        const tiene = !primero && Object.prototype.hasOwnProperty.call(estado, k), antes = tiene ? estado[k] : undefined;
        if (k === 'observacion') {
          const nl = (t) => String(t || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean), a = nl(antes), b = nl(v);
          if (primero) return; b.filter((x) => !a.includes(x)).forEach((x) => cambios.push({ campo: 'Observaciones (línea agregada)', antes: '', despues: x }));
          a.filter((x) => !b.includes(x)).forEach((x) => cambios.push({ campo: 'Observaciones (línea quitada)', antes: x, despues: '' })); return;
        }
        if (primero) return;
        if (tiene) { if (fmt(k, antes) === fmt(k, v)) return; cambios.push({ campo: TZ_ETIQUETA_CAMPO[k] || k, antes: fmt(k, antes) || '(vacío)', despues: fmt(k, v) || '(vacío)' }); }
        else if (!(v == null || v === false || v === '')) cambios.push({ campo: TZ_ETIQUETA_CAMPO[k] || k, antes: '(no registrado)', despues: fmt(k, v) || '(vacío)' });
      });
      Object.assign(nuevo, p); estado = nuevo;
      out.push({ ts: e.ts, accion: e.accion, usuario: p.usuarioActualiza || '', primero, cambios });
    });
    return out;
  }
  const tzParsear = (filas, campoId, id) => filas.map((f) => { try { return { ts: new Date(f.timestamp), accion: f.eventAction, p: JSON.parse(f.value), crudo: f.value }; } catch (e) { return null; } })
    .filter((x) => x && x.p && x.p[campoId] === id).sort((a, b) => a.ts - b.ts)
    .filter((x, i, a) => !i || x.crudo !== a[i - 1].crudo || +x.ts !== +a[i - 1].ts);
  async function tzLeerAuditoria(modelo, servicio, campoId, id) {
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter;
    const filas = await leerTodoDe(modelo, 'AUDITORIA', [new F('serviceName', 'EQ', 'CatalogService.' + servicio), new F('eventStatus', 'EQ', 'Success'), new F('value', 'Contains', id)], { $select: 'timestamp,eventAction,value' });
    return tzParsear(filas, campoId, id);
  }
  // ---- lectura de versiones ----
  async function tzCatalogos(modelo) {
    const [es, et] = await Promise.all([leerTodoDe(modelo, 'ESTRUCTURA', [], { $select: 'estructuraId,descripcion', $orderby: 'estructuraId' }), leerTodoDe(modelo, 'ETIQUETA', [], { $select: 'etiquetaId,descripcion', $orderby: 'etiquetaId' })]);
    return { estructura: new Map(es.map((x) => [x.estructuraId, norm(x.descripcion)])), etiqueta: new Map(et.map((x) => [x.etiquetaId, norm(x.descripcion)])), tipos: new Map(), estados: new Map() };
  }
  async function tzLinaje(modelo, codigo, cat) {
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, uno = (await leerTodoDe(modelo, 'MD', [new F('codigo', 'EQ', isNaN(+codigo) ? codigo : +codigo)], { $orderby: 'mdId' }))[0];
    if (!uno) throw new Error(`no se encontró el RMD ${codigo}`);
    const P = uno.codigoversionprincipal || uno.codigo;
    const todos = await leerTodoDe(modelo, 'MD', [new F({ filters: [new F('codigoversionprincipal', 'EQ', P), new F('codigo', 'EQ', P)], and: false })], { $expand: 'estadoIdRmd,estadoIdProceso,sucursalId', $orderby: 'mdId' });
    todos.forEach((m) => { if (m.estadoIdRmd_iMaestraId != null && m.estadoIdRmd) cat.estados.set(m.estadoIdRmd_iMaestraId, m.estadoIdRmd.contenido); if (m.estadoIdProceso_iMaestraId != null && m.estadoIdProceso) cat.estados.set(m.estadoIdProceso_iMaestraId, m.estadoIdProceso.contenido); });
    const lista = todos.map((m) => ({ ...m, estado: (m.estadoIdRmd && m.estadoIdRmd.contenido) || '' })).sort((a, b) => (+a.version - +b.version) || (new Date(a.fechaRegistro) - new Date(b.fechaRegistro)));
    return { principal: P, versiones: lista, actual: lista.find((m) => String(m.codigo) === String(codigo)) || lista[lista.length - 1] };
  }
  async function tzLeerVersion(modelo, md, cat) {
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, f = [new F('mdId_mdId', 'EQ', md.mdId)], L = (ent, exp, ord) => leerTodoDe(modelo, ent, f, { ...(exp ? { $expand: exp } : {}), $orderby: ord });
    const [etiquetas, pasos, pm, insumos, recetas, espec] = await Promise.all([L('MD_ES_ETIQUETA', '', 'mdEsEtiquetaId'), L('MD_ES_PASO', 'pasoId,tipoDatoId', 'mdEstructuraPasoId'), L('MD_ES_PASO_INSUMO_PASO', 'pasoHijoId,tipoDatoId', 'mdEstructuraPasoInsumoPasoId'),
      L('MD_ES_RE_INSUMO', '', 'estructuraRecetaInsumoId'), L('MD_RECETA', 'recetaId', 'mdRecetaId'), L('MD_ES_ESPECIFICACION', '', 'mdEstructuraEspecificacionId')]);
    return tzNormalizar(md, { etiquetas, pasos, pm, insumos, recetas, espec }, cat);
  }
  // valores de un guardado, legibles (tipo de dato y estado por su nombre, sí/no, vacíos)
  const tzFormato = (cat) => (k, v) => {
    if (v == null || v === '') return '';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (k === 'tipoDatoId_iMaestraId') return cat.tipos.get(v) || String(v);
    if (/^estadoId(Rmd|Proceso)_iMaestraId$/.test(k)) return cat.estados.get(v) || String(v);
    return typeof v === 'number' ? String(v) : String(v).replace(/\s+/g, ' ').trim();
  };
  const tzCuando = (t) => (t ? fechaHoraCorta(t) : '');
  const tzTituloDe = (d) => { const c = d && d.id && sap.ui.getCore().byId(d.id); return (c && c.getTitle && c.getTitle()) || ''; };
  // ---- Excel ----
  function tzArmarExcel(e) {
    const hoy = new Date(), dd = (n) => String(n).padStart(2, '0'), libro = Xlsx.crearLibro();
    const utc = (x) => { const t = x ? new Date(x) : null; return t && !isNaN(t) ? new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes())) : ''; };
    const tabla = (nombre, nt, cab, anchos, datos, estilos = {}, op = {}) => {
      const h = libro.hoja(nombre, { activa: !!op.activa, congelar: 'A2', cols: anchos.map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: nt, ref: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, datos.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
      datos.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'normal'); }));
    };
    const cambios = e.cambios || [], hist = [];
    (e.historial || []).forEach((h) => h.entradas.forEach((x) => {
      if (x.cambios.length) x.cambios.forEach((c) => hist.push([h.rotulo, x.accion === 'CREATE' ? 'Alta' : 'Guardado', utc(x.ts), x.usuario, c.campo, c.antes, c.despues]));
      else hist.push([h.rotulo, x.accion === 'CREATE' ? 'Alta' : x.primero ? 'Primer guardado registrado' : 'Guardado sin cambios', utc(x.ts), x.usuario, '', '', '']);
    }));
    tabla('Cambios entre versiones', 'CambiosEntreVersiones', ['Sección', 'Elemento', 'Cambio', 'Campo', 'Antes', 'Después', 'Solo cambia el orden', 'Usuario de la fila', 'Fecha de la fila', 'Usuario de la fila es de'],
      [16, 70, 13, 22, 34, 34, 12, 16, 17, 22], cambios.map((c) => [c.seccion, c.elemento, c.tipo, c.campo, c.antes, c.despues, c.soloOrden ? 'Sí' : '', c.quien, utc(c.cuando), c.tipo === 'Quitado' ? '' : c.alAutorizar ? 'el registro al autorizar (no necesariamente quien editó)' : c.modificado ? 'la última modificación' : 'el registro']), { 1: 'envuelto', 4: 'envuelto', 5: 'envuelto', 8: 'fechaHora' }, { activa: true });
    tabla('Historial de guardados', 'HistorialGuardados', ['Fila', 'Evento', 'Fecha y hora', 'Usuario', 'Campo', 'Antes', 'Después'], [70, 24, 17, 16, 30, 40, 40], hist, { 0: 'envuelto', 2: 'fechaHora', 5: 'envuelto', 6: 'envuelto' });
    tabla('Estados', 'EstadosRmd', ['Estado', 'Registrado', 'Usuario'], [30, 20, 18], (e.estados || []).map((x) => [x[0], x[1], x[2]]));
    const hI = libro.hoja('Información', { cols: [[1, 1, 34], [2, 2, 110]] });
    hI.poner('A1', `Trazabilidad del RMD ${e.codigo} — ${e.descripcion || ''}`, 'titulo');
    [['Generado', `${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())}`],
      ['Versiones comparadas', e.comparacion || 'no se comparó ninguna'], ['Cambios entre versiones', `${cambios.length}${cambios.some((c) => c.soloOrden) ? ` (${cambios.filter((c) => c.soloOrden).length} solo cambian el orden, por ejemplo por un paso agregado antes)` : ''}`],
      ['Filas con historial de guardados', (e.historial || []).length ? `${e.historial.length} (solo las que se cargaron en la ventana; el historial completo lleva ≈ 1 s por fila)` : 'ninguna cargada'],
      ['Entre versiones', 'Las versiones de un RMD son registros aparte. Se emparejan por estructura, etiqueta y código de paso (y por componente en insumos) y se comparan campo por campo. Un paso quitado y otro agregado en el mismo lugar y orden se muestra como «Reemplazado». Los procesos menores de un paso agregado, quitado o reemplazado van dentro de ese paso.'],
      ['Usuario y fecha de la fila', 'Son los que el portal guarda en cada fila de la versión nueva (última modificación; si nunca se modificó, su registro). Al autorizar, el portal puede volver a crear las filas: entonces figura quien autorizó y no quien editó. Para saber quién cambió cada dato dentro de una versión usa el historial de guardados.'],
      ['Historial de guardados', 'Sale de la auditoría del servicio (desde enero de 2024): cada guardado con su usuario. El «antes» se calcula con los guardados anteriores de la misma fila; el primero que se ve no tiene «antes». Las filas eliminadas no se pueden buscar (ya no tienen identificador vivo); su baja se ve como Activo Sí → No cuando el portal las desactiva.']]
      .forEach(([a, b], i) => { hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return { libro, nombre: `Trazabilidad RMD ${e.codigo} ${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.xlsx`, cambios: cambios.length, filas: hist.length };
  }
  // ---- el panel dentro de la ventana «Trazabilidad del RMD» del portal ----
  function montarHistorial(d, codigo) {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'); if (!modelo) return;
    const cont = d.querySelector('.sapMDialogScrollCont') || d.querySelector('section') || d;
    const raiz = document.createElement('div'); raiz.className = 'rmd-tz est'; raiz.dataset.codigo = codigo; cont.insertBefore(raiz, cont.firstChild);
    d.classList.add('rmd-tz-dlg');
    raiz.innerHTML = `<div class="rmd-tz-barra"><div class="rmd-cr-chips" role="tablist"><button type="button" role="tab" data-t="est" class="activo" aria-selected="true">Trazabilidad</button><button type="button" role="tab" data-t="ver" aria-selected="false">Cambios entre versiones</button><button type="button" role="tab" data-t="his" aria-selected="false">Historial de guardados</button></div>
      <button type="button" class="rmd-btn rmd-tz-excel" title="Excel con la comparación y el historial cargado">Exportar Excel</button></div><div class="rmd-tz-cuerpo"></div>`;
    ['pointerdown', 'mousedown', 'touchstart'].forEach((ev) => raiz.addEventListener(ev, (x) => x.stopPropagation()));
    const cuerpo = raiz.querySelector('.rmd-tz-cuerpo'), tabs = raiz.querySelector('.rmd-cr-chips');
    const E = { tab: 'est', iniciado: false, cat: null, linaje: null, desde: '', hasta: '', cambios: null, comparacion: '', cargando: '', error: '', seccion: 'Todas', tipo: 'Todos', soloOrden: false, consulta: '',
      pasosMd: null, pasoConsulta: '', incluirPm: false, hist: new Map(), abiertos: new Set(), lote: false, cancelar: false, versionCache: new Map() };
    // los estados de la tabla nativa de la ventana (Estado · Registrado · Usuario Registro)
    const estadosNativos = () => [...d.querySelectorAll('table tbody tr')].filter((tr) => !raiz.contains(tr) && !/SubRow/.test(tr.className))
      .map((tr) => [...tr.children].map((td) => norm(td.textContent)).filter(Boolean)).filter((c) => c.length >= 3).map((c) => [c[0], c[1], c[2]]);
    const nomVersion = (m) => `v${m.version} · ${m.codigo} · ${m.estado}`;
    const asegurar = async () => { if (!E.cat) E.cat = await tzCatalogos(modelo); if (!E.linaje) E.linaje = await tzLinaje(modelo, codigo, E.cat); return E; };
    const leerV = async (m) => { if (!E.versionCache.has(m.mdId)) E.versionCache.set(m.mdId, await tzLeerVersion(modelo, m, E.cat)); return E.versionCache.get(m.mdId); };
    async function comparar() {
      E.cargando = 'Leyendo las versiones…'; E.error = ''; pintar();
      try {
        await asegurar(); const vs = E.linaje.versiones, a = vs.find((m) => m.mdId === E.desde), b = vs.find((m) => m.mdId === E.hasta);
        if (!a || !b) { E.cambios = []; E.comparacion = ''; return; }
        const [A, B] = await Promise.all([leerV(a), leerV(b)]);
        E.cambios = tzCompararVersiones(A, B); E.comparacion = `${nomVersion(a)} → ${nomVersion(b)}`;
      } catch (e) { E.error = 'No se pudo comparar: ' + e.message; E.cambios = null; } finally { E.cargando = ''; pintar(); }
    }
    async function iniciar() {
      E.cargando = 'Leyendo las versiones del RMD…'; pintar();
      try {
        await asegurar(); const vs = E.linaje.versiones, act = E.linaje.actual, i = vs.indexOf(act), previas = vs.slice(0, i).filter((m) => !/cancel/i.test(m.estado));
        E.hasta = act.mdId; E.desde = previas.length ? previas[previas.length - 1].mdId : '';
        if (E.desde) await comparar(); else { E.cambios = []; E.comparacion = ''; E.cargando = ''; pintar(); }
      } catch (e) { E.error = 'No se pudo leer: ' + e.message; E.cargando = ''; pintar(); }
    }
    // ---- historial por guardado ----
    async function pasosDeLaVersion() {
      if (E.pasosMd) return E.pasosMd;
      await asegurar(); const v = await leerV(E.linaje.actual); E.pasosMd = v; return v;
    }
    async function cargarFila(fila) {
      if (E.hist.has(fila.id) && !E.hist.get(fila.id).error) return;
      E.hist.set(fila.id, { cargando: true, rotulo: fila.rotulo, entradas: [] }); pintar();
      try {
        let ev = await tzLeerAuditoria(modelo, fila.servicio, fila.campoId, fila.id);
        if (fila.servicio === 'MD_ES_PASO' && E.incluirPm) for (const pm of fila.hijos || []) { if (E.cancelar) break; ev = ev.concat((await tzLeerAuditoria(modelo, 'MD_ES_PASO_INSUMO_PASO', 'mdEstructuraPasoInsumoPasoId', pm.id)).map((x) => ({ ...x, _pm: pm }))); }
        const fmt = tzFormato(E.cat), grupos = new Map(); ev.forEach((x) => { const k = x._pm ? x._pm.id : fila.id; (grupos.get(k) || grupos.set(k, []).get(k)).push(x); });
        const entradas = [];
        grupos.forEach((lista, k) => { lista.sort((a, b) => a.ts - b.ts); const pm = lista[0]._pm; tzDifEventos(lista, fmt).forEach((x) => entradas.push({ ...x, de: pm ? `Proceso menor ${pm.hijo}` : '' })); });
        entradas.sort((a, b) => a.ts - b.ts); E.hist.set(fila.id, { rotulo: fila.rotulo, entradas, eventos: ev.length });
      } catch (e) { E.hist.set(fila.id, { rotulo: fila.rotulo, entradas: [], error: e.message }); }
      pintar();
    }
    const filasHistorial = (v) => {
      const md = E.linaje.actual, hijos = new Map(); v.pm.forEach((x) => (hijos.get(x.padreKey) || hijos.set(x.padreKey, []).get(x.padreKey)).push(x));
      const cab = { id: md.mdId, servicio: 'MD', campoId: 'mdId', rotulo: 'Cabecera del RMD (estado y observaciones)', sub: 'guardados y observaciones (≈ 25 s)' };
      return [cab, ...v.pasos.map((p) => ({ id: p.id, servicio: 'MD_ES_PASO', campoId: 'mdEstructuraPasoId', rotulo: `${p.lugar} › Paso ${p.paso}${p.desc ? ' — ' + (p.desc.length > 70 ? p.desc.slice(0, 70) + '…' : p.desc) : ''}`, sub: `Orden ${tzNum(p.orden)}`, hijos: hijos.get(p.key) || [] }))];
    };
    async function cargarTodos(filas) {
      if (E.lote) return; E.lote = true; E.cancelar = false; pintar();
      try { for (const f of filas) { if (E.cancelar) break; if (E.hist.has(f.id) && !E.hist.get(f.id).error) continue; E.progreso = `Cargando el historial… ${[...E.hist.values()].filter((x) => !x.cargando).length} de ${filas.length}`; await cargarFila(f); } }
      finally { E.lote = false; E.cancelar = false; E.progreso = ''; pintar(); }
    }
    const htmlEntradas = (h) => {
      if (h.cargando) return '<p class="rmd-nota">Consultando la auditoría…</p>';
      if (h.error) return `<p class="rmd-progreso error">${esc(h.error)}</p>`;
      const vis = h.entradas.filter((x) => x.cambios.length || x.accion === 'CREATE' || x.primero), sin = h.entradas.length - vis.length;
      if (!vis.length) return `<p class="rmd-nota">Sin cambios registrados${sin ? ` (${sin} guardado${sin > 1 ? 's' : ''} sin cambios)` : ''}.</p>`;
      return `<table class="rmd-tabla rmd-tz-t"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Qué</th><th>Antes</th><th>Después</th></tr></thead><tbody>${vis.map((x) => x.cambios.length
        ? x.cambios.map((c, i) => `<tr>${i ? '<td></td><td></td>' : `<td class="rmd-nowrap">${esc(tzCuando(x.ts))}</td><td class="rmd-nowrap">${esc(x.usuario || '—')}</td>`}<td>${esc(x.de ? x.de + ' · ' : '')}${esc(c.campo)}</td><td class="rmd-tz-antes">${esc(c.antes)}</td><td class="rmd-tz-desp">${esc(c.despues)}</td></tr>`).join('')
        : `<tr><td class="rmd-nowrap">${esc(tzCuando(x.ts))}</td><td class="rmd-nowrap">${esc(x.usuario || '—')}</td><td colspan="3" class="rmd-nota">${x.accion === 'CREATE' ? 'Alta de la fila' : 'Primer guardado registrado (sin guardados anteriores para comparar)'}</td></tr>`).join('')}</tbody></table>${sin ? `<p class="rmd-nota">${sin} guardado${sin > 1 ? 's' : ''} más sin cambios en esta fila.</p>` : ''}`;
    };
    // ---- pintar ----
    function pintar() {
      tabs.querySelectorAll('button').forEach((b) => { const a = b.dataset.t === E.tab; b.classList.toggle('activo', a); b.setAttribute('aria-selected', String(a)); });
      raiz.classList.toggle('est', E.tab === 'est'); d.classList.toggle('rmd-tz-on', E.tab !== 'est'); if (E.tab === 'est') return;
      const foco = document.activeElement && cuerpo.contains(document.activeElement) ? { n: document.activeElement.dataset.f || document.activeElement.className, pos: document.activeElement.selectionStart } : null;
      cuerpo.innerHTML = E.tab === 'ver' ? htmlVersiones() : htmlHistorial();
      if (foco) { const el = [...cuerpo.querySelectorAll('input[type=search]')].find((x) => (x.dataset.f || x.className) === foco.n); if (el) { el.focus(); try { el.setSelectionRange(foco.pos, foco.pos); } catch (e) { /* sin selección */ } } }
    }
    const opcionesVersion = (sel) => E.linaje.versiones.map((m) => `<option value="${esc(m.mdId)}" ${m.mdId === sel ? 'selected' : ''}>${esc(nomVersion(m))}</option>`).join('');
    function htmlVersiones() {
      if (E.error) return `<p class="rmd-progreso error">${esc(E.error)}</p>`;
      if (!E.linaje) return `<p class="rmd-progreso">${esc(E.cargando || 'Leyendo las versiones del RMD…')}</p>`;
      const sel = `<div class="rmd-tz-sel"><label>Desde <select data-f="desde"><option value="">—</option>${opcionesVersion(E.desde)}</select></label><label>hasta <select data-f="hasta">${opcionesVersion(E.hasta)}</select></label><button type="button" class="rmd-btn" data-a="comparar" ${E.cargando ? 'disabled' : ''}>Comparar</button></div>`;
      if (E.cargando) return `${sel}<p class="rmd-progreso">${esc(E.cargando)}</p>`;
      if (!E.cambios) return sel;
      if (!E.desde) return `${sel}<p class="rmd-nota">Es la primera versión: no hay otra con la que compararla.</p>`;
      const todos = E.cambios, visibles = todos.filter((c) => (E.soloOrden || !c.soloOrden) && (E.seccion === 'Todas' || c.seccion === E.seccion) && (E.tipo === 'Todos' || c.tipo === E.tipo)
        && (!E.consulta || SIN_ACENTOS([c.elemento, c.campo, c.antes, c.despues, c.quien].join(' ')).includes(E.consulta))), nOrden = todos.filter((c) => c.soloOrden).length;
      const cuenta = (f) => todos.filter((c) => (E.soloOrden || !c.soloOrden) && f(c)).length, secs = TZ_ESTR_ORDEN.filter((s) => todos.some((c) => c.seccion === s)), tipos = ['Agregado', 'Quitado', 'Modificado', 'Reemplazado'].filter((t) => todos.some((c) => c.tipo === t));
      const chips = (k, lista, actual, total) => `<div class="rmd-cr-chips">${[[k === 'seccion' ? 'Todas' : 'Todos', total], ...lista.map((x) => [x, cuenta((c) => c[k] === x)])].map(([x, n]) => `<button type="button" data-a="${k}" data-v="${esc(x)}" class="${actual === x ? 'activo' : ''}">${esc(x)} <span>${n}</span></button>`).join('')}</div>`;
      return `${sel}<p class="rmd-tz-resumen" title="Usuario y fecha son los de la fila en la versión nueva. Al autorizar, el portal vuelve a crear las filas a nombre de quien autoriza.">${esc(E.comparacion)} · <b>${cuenta(() => true)}</b> cambio${cuenta(() => true) === 1 ? '' : 's'}${nOrden && !E.soloOrden ? ` (+${nOrden} solo de orden, ocultos)` : ''}</p>
        <div class="rmd-cr-barra">${chips('seccion', secs, E.seccion, cuenta(() => true))}<input type="search" class="rmd-cr-buscar" data-f="consulta" placeholder="Buscar" value="${esc(E.consulta)}"></div>
        <div class="rmd-cr-barra">${chips('tipo', tipos, E.tipo, cuenta(() => true))}${nOrden ? `<label class="rmd-nota"><input type="checkbox" data-f="soloOrden" ${E.soloOrden ? 'checked' : ''}> Mostrar los que solo cambian el orden</label>` : ''}</div>
        ${visibles.length ? `<table class="rmd-tabla rmd-tz-t"><thead><tr><th>Sección</th><th>Elemento</th><th>Cambio</th><th>Campo</th><th>Antes</th><th>Después</th><th>Usuario · fecha de la fila</th></tr></thead><tbody>${visibles.slice(0, 1500).map((c) => `<tr class="rmd-tz-${c.tipo.toLowerCase()}"><td class="rmd-nowrap">${esc(c.seccion)}</td><td>${esc(c.elemento)}</td><td class="rmd-nowrap"><span class="rmd-cr-tag ${c.tipo === 'Quitado' ? 'ruta' : c.tipo === 'Agregado' ? 'dos' : ''}">${esc(c.tipo)}</span></td><td>${esc(c.campo)}</td><td class="rmd-tz-antes">${esc(c.antes)}</td><td class="rmd-tz-desp">${esc(c.despues)}</td><td class="rmd-nowrap">${c.tipo === 'Quitado' ? '<span class="rmd-nota">—</span>' : `${esc(c.quien || '—')}${c.cuando ? ' · ' + esc(tzCuando(c.cuando)) : ''}${c.alAutorizar ? '<span class="rmd-tz-aut" title="Fila registrada al autorizar: el portal la vuelve a crear a nombre de quien autoriza. Quién la editó antes se ve en el historial de guardados.">(al autorizar)</span>' : ''}`}</td></tr>`).join('')}</tbody></table>${visibles.length > 1500 ? `<p class="rmd-nota">Se muestran 1 500 de ${visibles.length}: el Excel trae todos.</p>` : ''}` : `<p class="rmd-nota">${todos.length ? 'Ningún cambio coincide con el filtro.' : '✓ Sin diferencias entre las dos versiones.'}</p>`}`;
    }
    function htmlHistorial() {
      if (E.error) return `<p class="rmd-progreso error">${esc(E.error)}</p>`;
      if (!E.pasosMd) return `<p class="rmd-progreso">${esc(E.cargando || 'Leyendo los pasos del RMD…')}</p>`;
      const filas = filasHistorial(E.pasosMd), q = E.pasoConsulta, vis = filas.filter((f) => !q || SIN_ACENTOS(f.rotulo).includes(q)), cargadas = filas.filter((f) => E.hist.has(f.id) && !E.hist.get(f.id).cargando).length;
      const pms = filas.reduce((n, f) => n + (f.hijos ? f.hijos.length : 0), 0);
      return `<p class="rmd-tz-resumen" title="Sale de la auditoría del servicio (desde enero de 2024). El «antes» se calcula con los guardados anteriores de la misma fila; el primero que se ve no lo tiene. Las versiones autorizadas suelen no tener historial por fila: sus filas se crean al autorizar.">${esc(nomVersion(E.linaje.actual))} · cada fila tarda 2–3 s en cargar</p>
        <div class="rmd-cr-barra"><input type="search" class="rmd-cr-buscar" data-f="pasoConsulta" placeholder="Buscar paso o etiqueta" value="${esc(E.pasoConsulta)}">
          <div class="rmd-tz-acc"><label class="rmd-nota"><input type="checkbox" data-f="incluirPm" ${E.incluirPm ? 'checked' : ''}> Incluir procesos menores (${pms}: ≈ 1 s cada uno)</label>
          <button type="button" class="rmd-btn" data-a="todos" ${E.lote ? 'disabled' : ''} title="Unos 2 min para 75 filas; se puede detener">Cargar todas (${filas.length})</button><button type="button" class="rmd-btn" data-a="detener" ${E.lote ? '' : 'hidden'}>Detener</button></div></div>
        <p class="rmd-progreso">${esc(E.lote ? E.progreso : cargadas ? `${cargadas} de ${filas.length} cargadas` : '')}</p>
        <div class="rmd-tz-lista">${vis.map((f) => { const h = E.hist.get(f.id), ab = E.abiertos.has(f.id), n = h && !h.cargando && !h.error ? h.entradas.filter((x) => x.cambios.length).length : null;
          return `<div class="rmd-tz-fila ${ab ? 'abierta' : ''}" data-id="${esc(f.id)}"><div class="rmd-tz-fila-cab"><span class="rmd-tz-rotulo">${esc(f.rotulo)}<span class="rmd-nota"> · ${esc(f.sub)}</span></span>
            <span class="rmd-nowrap">${h && h.cargando ? '<span class="rmd-nota">consultando…</span>' : n != null ? `<span class="rmd-cr-tag ${n ? '' : 'dos'}">${n} cambio${n === 1 ? '' : 's'}</span> ` : ''}<button type="button" class="rmd-link" data-a="${h && !h.cargando && !h.error ? 'ver' : 'cargar'}">${h && !h.cargando && !h.error ? (ab ? 'Ocultar' : 'Ver historial') : 'Cargar historial'}</button></span></div>${ab && h ? `<div class="rmd-tz-detalle">${htmlEntradas(h)}</div>` : ''}</div>`; }).join('')}</div>`;
    }
    // ---- eventos ----
    tabs.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-t]'); if (!b) return; E.tab = b.dataset.t; pintar();
      if (E.tab === 'ver' && !E.iniciado) { E.iniciado = true; iniciar(); }
      if (E.tab === 'his' && !E.pasosMd) { E.cargando = 'Leyendo los pasos del RMD…'; pintar(); try { await pasosDeLaVersion(); } catch (x) { E.error = 'No se pudo leer: ' + x.message; } E.cargando = ''; pintar(); }
    });
    cuerpo.addEventListener('change', (e) => { const f = e.target.dataset.f;
      if (f === 'desde' || f === 'hasta') { E[f] = e.target.value; }
      else if (f === 'soloOrden') { E.soloOrden = e.target.checked; pintar(); } else if (f === 'incluirPm') { E.incluirPm = e.target.checked; E.hist = new Map([...E.hist].filter(([, h]) => h.rotulo && /^Cabecera/.test(h.rotulo))); pintar(); } });
    cuerpo.addEventListener('input', (e) => { const f = e.target.dataset.f; if (f === 'consulta') { E.consulta = SIN_ACENTOS(e.target.value).trim(); pintar(); } else if (f === 'pasoConsulta') { E.pasoConsulta = SIN_ACENTOS(e.target.value).trim(); pintar(); } });
    cuerpo.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'comparar') comparar(); else if (a === 'seccion' || a === 'tipo') { E[a] = b.dataset.v; pintar(); }
      else if (a === 'detener') { E.cancelar = true; }
      else if (a === 'todos') { if (E.pasosMd) cargarTodos(filasHistorial(E.pasosMd)); }
      else if (a === 'cargar' || a === 'ver') { const id = b.closest('.rmd-tz-fila').dataset.id, f = filasHistorial(E.pasosMd).find((x) => x.id === id); if (!f) return;
        if (a === 'ver') { E.abiertos.has(id) ? E.abiertos.delete(id) : E.abiertos.add(id); pintar(); } else { E.abiertos.add(id); cargarFila(f); } }
    });
    raiz.querySelector('.rmd-tz-excel').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const est = estadosNativos();
        const historial = [...E.hist.values()].filter((h) => !h.cargando && !h.error && h.entradas.length);
        const x = tzArmarExcel({ codigo, descripcion: E.linaje ? E.linaje.actual.descripcion : '', cambios: E.cambios || [], comparacion: E.comparacion, historial, estados: est });
        descargarArchivo(x.nombre, await x.libro.generar(), TIPO_XLSX); toast(`Excel de la trazabilidad del RMD ${codigo}: ${x.cambios} cambios entre versiones y ${x.filas} líneas de historial.`);
      } catch (err) { toast('No se pudo armar el Excel: ' + err.message, true); } finally { btn.disabled = false; }
    });
    cuerpo.addEventListener('change', (e) => { if (e.target.dataset.f === 'desde' || e.target.dataset.f === 'hasta') comparar(); });
    raiz.__tz = { E, comparar, cargarFila, pintar, iniciar, filas: () => (E.pasosMd ? filasHistorial(E.pasosMd) : []), excel: () => { const historial = [...E.hist.values()].filter((h) => !h.cargando && !h.error && h.entradas.length); return tzArmarExcel({ codigo, descripcion: E.linaje ? E.linaje.actual.descripcion : '', cambios: E.cambios || [], comparacion: E.comparacion, historial, estados: estadosNativos() }); } };
  }
  const TZ_ESC = { puesto: false };
  function gestionarTrazabilidad() {
    const ctrl = typeof sap !== 'undefined' && controladorPrincipal();
    const d = ctrl && on('historialcambios') && dialogos().find((x) => /^Trazabilidad del RMD:/i.test(tzTituloDe(x)));
    if (!TZ_ESC.puesto) { TZ_ESC.puesto = true; document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || document.querySelector('.rmd-modal-fondo')) return;
      const top = dialogos().pop(), b = top && top.querySelector('.rmd-tz') && [...top.querySelectorAll('footer button')].find((x) => /^Cerrar$/.test(x.textContent.trim())); if (!b) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); sap.ui.getCore().byId(b.id.replace(/-inner$/, '')).firePress(); }, true); }
    if (!d) { document.querySelectorAll('.rmd-tz').forEach((x) => { if (x.__tz) x.__tz.E.cancelar = true; x.remove(); }); document.querySelectorAll('.rmd-tz-dlg').forEach((x) => x.classList.remove('rmd-tz-dlg')); return; }
    const m = /^Trazabilidad del RMD:\s*(\S+)/i.exec(tzTituloDe(d)), codigo = m && m[1], viejo = d.querySelector('.rmd-tz');
    if (viejo && viejo.dataset.codigo === codigo) return;
    if (viejo) viejo.remove();
    if (codigo) montarHistorial(d, codigo);
  }
  window.__rmdStats.trazabilidad = { comparar: tzCompararVersiones, normalizar: tzNormalizar, difEventos: tzDifEventos, parsear: tzParsear, excel: tzArmarExcel, formato: tzFormato, leerAuditoria: tzLeerAuditoria, leerVersion: tzLeerVersion, linaje: tzLinaje, catalogos: tzCatalogos,
    panel: () => { const r = document.querySelector('.rmd-tz'); return r && r.__tz; } };

  // ==== PLANTILLA-PRODUCCION:INICIO ====
  // ---- 9 sexies. Plantilla para Producción (v1.40) ----
  // Núcleo de la plantilla para Producción: funciones puras que usan igual el editor (archivo .html, sin SAP) y el portal (al importar).
  // Se serializa con toString() dentro del archivo: no debe usar nada de fuera de esta función.
  function ppNucleo() {
    const TIPO = { COND: 483, CUADRO: 484, EQUIPOS: 485, ESPEC: 486, PROCESOS: 487, FORMULA: 488, FIRMAS: 489 };
    const RANGO = 443;                                                        // tipo de dato «Rango»: lleva valor inicial, final y margen
    const VACIAS = new Set('DE LA EL Y EN LOS LAS DEL A AL CON POR PARA SEGUN LO O U SE QUE SU SUS UN UNA E N NO'.split(' '));
    const normalizar = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9%°]+/g, ' ').replace(/\s+/g, ' ').trim();
    const fichas = (n) => n.split(' ').filter((w) => w && !VACIAS.has(w));
    const contar = (arr) => { const m = new Map(); arr.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return m; };
    const bigramas = (n) => { const s = ' ' + n + ' ', a = []; for (let i = 0; i < s.length - 1; i++) a.push(s.slice(i, i + 2)); return contar(a); };
    function dice(a, b) {
      let inter = 0, na = 0, nb = 0;
      a.forEach((v) => { na += v; }); b.forEach((v) => { nb += v; }); a.forEach((v, k) => { const w = b.get(k); if (w) inter += Math.min(v, w); });
      return na + nb ? (2 * inter) / (na + nb) : 0;
    }
    function similitud(na, nb) { if (na === nb) return 1; return 0.55 * dice(contar(fichas(na)), contar(fichas(nb))) + 0.45 * dice(bigramas(na), bigramas(nb)); }
    const porOrden = (a, b) => (+a.orden || 0) - (+b.orden || 0);
    // Buscador del catálogo de pasos: exacto (texto normalizado: sin tildes, mayúsculas, sin signos) y parecidos (palabras + pares de letras)
    function crearBuscador(filas) {
      const exacto = new Map(), indice = new Map();
      filas.forEach((f, i) => {
        f.i = i; f.n = normalizar(f.texto); let l = exacto.get(f.n); if (!l) exacto.set(f.n, (l = [])); l.push(f);
        new Set(fichas(f.n)).forEach((w) => { let p = indice.get(w); if (!p) indice.set(w, (p = [])); p.push(i); });
      });
      return {
        total: filas.length,
        exactos: (texto) => exacto.get(normalizar(texto)) || [],
        porCodigo: (() => { const m = new Map(filas.map((f) => [String(f.codigo), f])); return (c) => m.get(String(c)); })(),
        buscar(texto, op = {}) {
          const { estr = null, etq = null, max = 8, minimo = 0.5 } = op, n = normalizar(texto); if (n.length < 3) return [];
          const ts = [...new Set(fichas(n))].map((w) => indice.get(w) || []).filter((l) => l.length).sort((a, b) => a.length - b.length);
          const cand = new Set(); for (const l of ts.slice(0, 4)) { for (const i of l) cand.add(i); if (cand.size > 8000) break; }
          (exacto.get(n) || []).forEach((f) => cand.add(f.i));
          const res = [];
          cand.forEach((i) => { const f = filas[i]; if (!f) return; let s = f.n === n ? 1 : similitud(n, f.n); const extra = (estr && f.estr === estr ? 0.02 : 0) + (etq && f.etq === etq ? 0.03 : 0);
            if (s >= minimo) res.push({ f, s, orden: s + extra, igual: f.n === n }); });
          return res.sort((a, b) => (b.igual - a.igual) || ((b.igual && a.igual) ? ((b.f.etq === etq) - (a.f.etq === etq)) : 0) || (b.orden - a.orden)).slice(0, max);
        },
      };
    }
    // Numeración como el PDF del RMD (generador del portal, controller/table.js): solo las estructuras con «numeración» llevan número
    // (1, 2, 3…); en las de «Procesos», cada etiqueta n.m (m = su posición) y cada paso n.(orden de la etiqueta).(orden del paso).
    // Con «base», las listas que se editaron (pasos agregados, quitados o movidos) se numeran de nuevo, correlativas.
    function numerar(estructuras, base) {
      const out = new Map(), listaBase = new Map(); let n = 0;
      if (base) base.forEach((e) => (e.etiquetas || []).forEach((t) => listaBase.set(t.id, (t.pasos || []).map((p) => p.id).join('|'))));
      [...estructuras].sort(porOrden).forEach((e) => {
        const num = e.numeracion ? String(++n) : ''; out.set(e.id, num);
        if (!num || e.tipo !== TIPO.PROCESOS) return;
        [...(e.etiquetas || [])].sort(porOrden).forEach((t, j) => {
          out.set(t.id, `${num}.${j + 1}`);
          const ps = t.pasos || [], igual = !base || (listaBase.get(t.id) === ps.map((p) => p.id).join('|') && !ps.some((p) => p.quitado));
          let k = 0; ps.forEach((p) => { if (p.quitado) return; k++; out.set(p.id, igual && p.orden != null ? `${num}.${t.orden != null ? t.orden : j + 1}.${p.orden}` : `${num}.${j + 1}.${k}`); });
        });
      });
      return out;
    }
    // subsecuencia creciente más larga (para saber qué filas se movieron: las que no están en ella)
    function enOrden(seq) {
      const n = seq.length, prev = new Array(n).fill(-1), fin = []; let largo = 0;
      for (let i = 0; i < n; i++) {
        let lo = 0, hi = largo; while (lo < hi) { const m = (lo + hi) >> 1; if (seq[fin[m]] < seq[i]) lo = m + 1; else hi = m; }
        if (lo > 0) prev[i] = fin[lo - 1]; fin[lo] = i; if (lo === largo) largo++;
      }
      const ok = new Set(); let k = largo ? fin[largo - 1] : -1; while (k >= 0) { ok.add(k); k = prev[k]; } return ok;
    }
    const num = (v) => { if (v == null || v === '') return null; const x = Number(String(v).replace(',', '.')); return isNaN(x) ? NaN : x; };
    const txtValor = (v) => (v == null || v === '' ? '' : String(v));
    const CAMPOS_RANGO = [['vi', 'Valor inicial'], ['vf', 'Valor final'], ['margen', 'Margen']];
    // Lista de cambios entre el RMD de la plantilla (base) y lo editado (trabajo). Cada cambio: clase (paso, pm, equipo, utensilio,
    // etiqueta, estructura, especificacion), accion (agregar, quitar, cambiar, valores, mover, comentario), lugar, numero, antes,
    // despues, codigos, nuevo (pide crear un paso en SAP) e ids para ubicarlo.
    function cambios(base, trabajo) {
      const out = [], nW = numerar(trabajo.estructuras, base.estructuras), nB = numerar(base.estructuras), bEst = new Map(base.estructuras.map((e) => [e.id, e]));
      const lista = (ctx, w, b, clase, padre) => {
        const bId = new Map(b.map((x) => [x.id, x])), posB = new Map(b.map((x, i) => [x.id, i]));
        const vivos = w.filter((x) => !x.quitado && bId.has(x.id)), ok = enOrden(vivos.map((x) => posB.get(x.id)));
        const rotulo = (x, i) => (clase === 'pm' ? `${padre.numero ? padre.numero + ' › ' : ''}proceso menor ${i + 1}` : (nW.get(x.id) || nB.get(x.id) || ''));
        const anterior = (i) => { for (let j = i - 1; j >= 0; j--) if (!w[j].quitado) return w[j]; return null; };
        let iv = 0;
        w.forEach((x, i) => {
          const b0 = bId.get(x.id), numero = rotulo(x, x.quitado ? (b0 ? b.indexOf(b0) : i) : iv);
          const base0 = { clase, lugar: ctx.lugar, numero, id: x.id, estructura: ctx.estructura, etiqueta: ctx.etiqueta || null, padre: padre ? padre.id : null, comentario: x.comentario || '' };
          if (!x.quitado) iv++;
          if (!b0) {
            const prev = anterior(i);
            out.push({ ...base0, accion: 'agregar', despues: x.texto, codigo: x.codigo || null, pasoId: x.pasoId || null, nuevo: !!x.nuevo, tipo: x.tipo || null, valores: CAMPOS_RANGO.filter(([k]) => txtValor(x[k])).map(([k, n]) => ({ campo: n, despues: txtValor(x[k]) })),
              trasDe: prev ? { id: prev.id, texto: prev.texto, codigo: prev.codigo || null } : null, pm: clase === 'paso' ? (x.pm || []).filter((m) => !m.quitado).map((m) => ({ texto: m.texto, codigo: m.codigo || null, nuevo: !!m.nuevo })) : undefined });
            return;
          }
          if (x.quitado) { out.push({ ...base0, accion: 'quitar', antes: b0.texto, codigoAntes: b0.codigo || null }); return; }
          if (String(x.codigo || '') !== String(b0.codigo || '') || normalizar(x.texto) !== normalizar(b0.texto)) out.push({ ...base0, comentario: '', accion: 'cambiar', antes: b0.texto, despues: x.texto, codigoAntes: b0.codigo || null, codigo: x.codigo || null, pasoId: x.pasoId || null, nuevo: !!x.nuevo });
          const vals = CAMPOS_RANGO.filter(([k]) => txtValor(x[k]) !== txtValor(b0[k])).map(([k, n]) => ({ campo: n, antes: txtValor(b0[k]), despues: txtValor(x[k]) }));
          if (vals.length) out.push({ ...base0, comentario: '', accion: 'valores', texto: x.texto, campos: vals });
          if (!ok.has(vivos.indexOf(x)) && vivos.includes(x)) { const prev = anterior(i); out.push({ ...base0, comentario: '', accion: 'mover', texto: x.texto, numeroAntes: clase === 'pm' ? `proceso menor ${posB.get(x.id) + 1}` : (nB.get(x.id) || ''), trasDe: prev ? { id: prev.id, texto: prev.texto } : null }); }
          if (x.comentario) out.push({ ...base0, accion: 'comentario', texto: x.texto });
          if (clase === 'paso') lista(ctx, x.pm || [], b0.pm || [], 'pm', { id: x.id, numero });
        });
      };
      [...trabajo.estructuras].sort(porOrden).forEach((e) => {
        const be = bEst.get(e.id) || { etiquetas: [], pasos: [], equipos: [], utensilios: [], espec: [] }, ctxE = { lugar: e.nombre, estructura: e.id };
        if (e.comentario) out.push({ clase: 'estructura', accion: 'comentario', lugar: e.nombre, numero: nW.get(e.id) || '', id: e.id, estructura: e.id, comentario: e.comentario, texto: e.nombre });
        lista(ctxE, e.pasos || [], be.pasos || [], 'paso', null);
        [...(e.etiquetas || [])].sort(porOrden).forEach((t) => {
          const bt = (be.etiquetas || []).find((x) => x.id === t.id) || { pasos: [] }, ctxT = { lugar: `${e.nombre} › ${t.nombre}`, estructura: e.id, etiqueta: t.id };
          if (t.comentario) out.push({ clase: 'etiqueta', accion: 'comentario', lugar: ctxT.lugar, numero: nW.get(t.id) || '', id: t.id, estructura: e.id, etiqueta: t.id, comentario: t.comentario, texto: t.nombre });
          lista(ctxT, t.pasos || [], bt.pasos || [], 'paso', null);
        });
        ['equipos', 'utensilios'].forEach((k) => {
          const bIds = new Set((be[k] || []).map((x) => x.id)), clase = k === 'equipos' ? 'equipo' : 'utensilio';
          (e[k] || []).forEach((x) => {
            const nombre = [x.desc, x.codigo, x.ref].filter(Boolean).join(' · ');
            if (!bIds.has(x.id)) out.push({ clase, accion: 'agregar', lugar: e.nombre, numero: nW.get(e.id) || '', id: x.id, estructura: e.id, despues: nombre, item: { equipoId: x.equipoId || null, utensilioId: x.utensilioId || null, agrupadorId: x.agrupadorId || null, codigo: x.codigo || '', desc: x.desc || '' }, comentario: x.comentario || '' });
            else if (x.quitado) out.push({ clase, accion: 'quitar', lugar: e.nombre, numero: nW.get(e.id) || '', id: x.id, estructura: e.id, antes: nombre, comentario: x.comentario || '' });
            else if (x.comentario) out.push({ clase, accion: 'comentario', lugar: e.nombre, numero: nW.get(e.id) || '', id: x.id, estructura: e.id, texto: nombre, comentario: x.comentario });
          });
        });
        (e.espec || []).forEach((x) => { if (x.comentario) out.push({ clase: 'especificacion', accion: 'comentario', lugar: e.nombre, numero: nW.get(e.id) || '', id: x.id, estructura: e.id, texto: [x.ensayo, x.especificacion].filter(Boolean).join(': '), comentario: x.comentario }); });
      });
      return out;
    }
    // Avisos de lo editado: id → [{ nivel: 'error' | 'aviso' | 'info', texto }]. ctx.buscador (opcional) y ctx.etiquetas (id → nombre).
    function avisos(trabajo, ctx = {}) {
      const out = new Map(), add = (id, nivel, texto) => { let l = out.get(id); if (!l) out.set(id, (l = [])); l.push({ nivel, texto }); };
      const bus = ctx.buscador, nomEtq = (id) => (ctx.etiquetas && ctx.etiquetas.get(id)) || 'otra etiqueta', numeros = numerar(trabajo.estructuras, ctx.base);
      const enBase = new Map();                                                // id → código en el RMD de la plantilla (lo que ya estaba así en SAP)
      (ctx.base || []).forEach((e) => [e.pasos || [], ...(e.etiquetas || []).map((t) => t.pasos || [])].forEach((l) => l.forEach((p) => { enBase.set(p.id, String(p.codigo || '')); (p.pm || []).forEach((m) => enBase.set(m.id, String(m.codigo || ''))); })));
      const igualQueSap = (x) => enBase.has(x.id) && enBase.get(x.id) === String(x.codigo || '');
      const revisar = (x, estr, etq, esPm) => {
        const t = String(x.texto || '').trim();
        if (!t) { add(x.id, 'error', 'Falta el texto.'); return; }
        // mismas excepciones que el script en el portal: «… O CALIDAD EN OPERACIONES», la entrega del FPRO-250 y los pasos mayores de biocarga
        const n = normalizar(t), cc = esPm || !/\bBIOCARGA\b/.test(n) ? n.replace(/CONTROL DE CALIDAD O CALIDAD EN OPERACIONES|CALIDAD EN OPERACIONES O CONTROL DE CALIDAD/g, 'CALIDAD EN OPERACIONES')
          .replace(/FINALMENTE ENTREGAR EL FORMATO DE INSPECCION EN LINEAS DE PRODUCCION FPRO \d+(?: VIGENTE)? A CONTROL DE CALIDAD PARA SU APROBACION EN EL SISTEMA/g, 'FINALMENTE ENTREGAR EL FORMATO DE INSPECCION') : '';
        if (/CONTROL DE CALIDAD|APROBACION DE .*CONTROL DE PROCESO/.test(cc)) {
          const ya = igualQueSap(x), muestra = /MUESTRA PARA (EL )?CONTROL DE CALIDAD/.test(cc);
          add(x.id, ya ? 'info' : 'aviso', `${ya ? 'Ya está así en SAP: d' : 'D'}ebe decir «${muestra ? 'CANTIDAD MUESTREADA (kg):' : 'CALIDAD EN OPERACIONES'}» en lugar de «${muestra ? 'MUESTRA PARA CONTROL DE CALIDAD' : 'CONTROL DE CALIDAD'}».`);
        }
        if (x.nuevo && bus) {
          const ex = bus.exactos(t).filter((f) => f.estr === estr), aqui = ex.filter((f) => !etq || f.etq === etq);
          if (aqui.length) add(x.id, 'aviso', `Ya existe el paso ${aqui[0].codigo} con el mismo texto${etq ? ' en esta etiqueta' : ''}: conviene usarlo en vez de crear otro.`);
          else if (ex.length) add(x.id, 'info', `Existe con el mismo texto en ${nomEtq(ex[0].etq)} (paso ${ex[0].codigo}). Usarlo en otra etiqueta puede hacer que no aparezca en su lugar en producción.`);
          else add(x.id, 'info', 'Paso nuevo: el equipo RMD lo creará en SAP.');
        }
        if (!x.nuevo && x.etqCat && etq && x.etqCat !== etq && !esPm) add(x.id, igualQueSap(x) ? 'info' : 'aviso', `${igualQueSap(x) ? 'Ya está así en SAP: e' : 'E'}n el catálogo este paso es de ${nomEtq(x.etqCat)}, no de esta etiqueta; en producción podría no aparecer en su lugar.`);
        if (x.tipo === RANGO || x.vi != null || x.vf != null) {
          const a = num(x.vi), b = num(x.vf), m = num(x.margen);
          if ([a, b, m].some((v) => Number.isNaN(v))) add(x.id, 'error', 'El rango debe tener números (usa punto o coma para los decimales).');
          else if (a != null && b != null && a > b) add(x.id, 'error', 'El valor inicial es mayor que el final.');
        }
      };
      const vivos = (l) => (l || []).filter((x) => !x.quitado);
      const revisarLista = (l, estr, etq) => {
        const vistos = new Map();
        vivos(l).forEach((x) => { revisar(x, estr, etq, false); if (x.codigo) { const otro = vistos.get(String(x.codigo)); if (otro && !(igualQueSap(x) && enBase.get(otro) === String(x.codigo))) add(x.id, 'aviso', `El paso ${x.codigo} ya está en esta lista (${numeros.get(otro) || 'más arriba'}).`); else if (!otro) vistos.set(String(x.codigo), x.id); }
          vivos(x.pm).forEach((m) => revisar(m, estr, etq, true)); });
        // quitar un paso del que depende otro
        (l || []).filter((x) => x.quitado && x.codigo).forEach((x) => { const dep = vivos(l).filter((y) => String(y.depende || '') === String(x.codigo)); if (dep.length) add(x.id, 'aviso', `${dep.map((y) => numeros.get(y.id) || y.texto.slice(0, 30)).join(', ')} depende${dep.length > 1 ? 'n' : ''} de este paso: el equipo RMD revisará los predecesores.`); });
      };
      trabajo.estructuras.forEach((e) => {
        revisarLista(e.pasos, e.estructuraId, null);
        (e.etiquetas || []).forEach((t) => revisarLista(t.pasos, e.estructuraId, t.etiquetaId));
        ['equipos', 'utensilios'].forEach((k) => { const vistos = new Set(); vivos(e[k]).forEach((x) => { const c = x.equipoId || x.utensilioId || x.agrupadorId; if (c && vistos.has(c)) add(x.id, 'aviso', 'Está repetido en esta lista.'); vistos.add(c); }); });
      });
      return out;
    }
    // Huella del RMD (lo que importa para saber si cambió desde que se generó la plantilla)
    function huella(arbol) {
      const p = (x) => [x.id, x.pasoId || '', x.orden, x.vi == null ? '' : x.vi, x.vf == null ? '' : x.vf, x.margen == null ? '' : x.margen, (x.pm || []).map((m) => [m.id, m.pasoId || '', m.orden, m.vi == null ? '' : m.vi, m.vf == null ? '' : m.vf].join(',')).join(';')].join('|');
      const s = arbol.estructuras.map((e) => [e.id, e.orden, (e.pasos || []).map(p).join('/'), (e.etiquetas || []).map((t) => t.id + ':' + t.orden + ':' + (t.pasos || []).map(p).join('/')).join('#'), (e.equipos || []).map((x) => x.id).join(','), (e.utensilios || []).map((x) => x.id).join(',')].join('§')).join('¶');
      let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + '-' + s.length.toString(36);
    }
    // Catálogo empacado (una línea por paso: código, estructura, etiqueta, tipo, texto) ↔ filas
    function desempacarPasos(cat) {
      const E = cat.estr.map((x) => x[0]), T = cat.etq.map((x) => x[0]);
      return cat.pasos.split('\n').filter(Boolean).map((l) => { const [c, e, t, ti, ...tx] = l.split('\t'); return { codigo: c, estr: E[+e] || null, etq: t === '' ? null : (T[+t] || null), tipo: ti === '' ? null : +ti, texto: tx.join('\t') }; });
    }
    return { TIPO, RANGO, normalizar, similitud, crearBuscador, numerar, cambios, avisos, huella, desempacarPasos, porOrden, num };
  }
  // Editor del borrador (corre en el archivo .html que abre Producción, sin SAP ni internet). Se serializa con toString():
  // no debe usar nada de fuera de esta función (recibe el núcleo ya creado). La hoja copia el PDF del RMD que genera el portal
  // (controller/table.js: encabezado de 8 columnas, cuadros, equipos, insumos, procedimiento con sus casillas, especificaciones, firmas).
  function ppEditorApp(PPN) {
    'use strict';
    const ORIGINAL = '<!doctype html>\n' + document.documentElement.outerHTML;
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clon = (x) => JSON.parse(JSON.stringify(x));
    const dd = (n) => String(n).padStart(2, '0');
    const fechaHora = (t) => { const d = new Date(t); return isNaN(d) ? '' : `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()} ${dd(d.getHours())}:${dd(d.getMinutes())}`; };
    const fmtDec = (v) => { if (v == null || v === '') return ''; const n = parseFloat(String(v).replace(',', '.')); if (isNaN(n)) return String(v); const [e, d] = n.toFixed(3).split('.'); return e.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + d; };
    const cols = (ws) => { const t = ws.reduce((a, b) => a + b, 0); return `<colgroup>${ws.map((w) => `<col style="width:${(w / t * 100).toFixed(2)}%">`).join('')}</colgroup>`; };
    const { TIPO, RANGO } = PPN;
    const CON_CAJA = new Set([433, 434, 435, 436, 437, 438, 443, 444, 445]), CON_CHECK = new Set([432, 442]);   // tipos de dato con casilla de dato / de check (como el PDF)
    const CAJA = '<span class="pp-caja"></span>', CHECK = '<span class="pp-check"></span>';
    const ICO_CHECK = '<svg class="pp-ico-check" viewBox="0 0 16 16" aria-label="check"><rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.2 8.3l2.6 2.6 5-5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const app = $('#app');
    let PQ, BASE, W, SOL, BUS, EQ = [], ETQ = new Map(), BI = new Map(), CMB = [], AV = new Map(), MOV = new Set(), NUM_BASE = new Map(), sucio = false, seq = 1, filtro = 'todos';
    const deshacer = [];
    const CLAVE = () => `rmdPlantilla:${PQ.rmd.codigo}:${PQ.huella}`;
    const scriptBorrador = () => $('#rmd-borrador') || $('#rmd-propuesta');

    // ---------- carga ----------
    async function desempacar(b64) {
      const bin = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
      return JSON.parse(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    }
    async function iniciar() {
      app.innerHTML = '<div class="pp-cargando">Abriendo la plantilla…</div>';
      try {
        PQ = await desempacar($('#rmd-datos').textContent);
        BASE = PQ.arbol; NUM_BASE = PPN.numerar(BASE.estructuras);
        const filas = PPN.desempacarPasos(PQ.catalogo); BUS = PPN.crearBuscador(filas);
        ETQ = new Map(PQ.catalogo.etq.map(([id, n]) => [id, n]));
        EQ = [].concat(
          (PQ.catalogo.equipos || '').split('\n').filter(Boolean).map((l) => { const [id, codigo, ref, desc] = l.split('\t'); return { clase: 'equipos', equipoId: id, codigo, ref, desc }; }),
          (PQ.catalogo.utensilios || '').split('\n').filter(Boolean).map((l) => { const [id, codigo, desc] = l.split('\t'); return { clase: 'utensilios', utensilioId: id, codigo, desc }; }),
          (PQ.catalogo.agrupadores || []).map(([id, desc]) => ({ clase: 'utensilios', agrupadorId: id, codigo: '', desc, agrupador: true })));
        EQ.forEach((x) => { x.n = PPN.normalizar([x.codigo, x.ref, x.desc].join(' ')); });
        const indexar = (arbol, m) => arbol.estructuras.forEach((e) => { m.set(e.id, e); [e.pasos || [], ...(e.etiquetas || []).map((t) => (m.set(t.id, t), t.pasos || []))].forEach((l) => l.forEach((p) => { m.set(p.id, p); (p.pm || []).forEach((x) => m.set(x.id, x)); }));
          ['equipos', 'utensilios', 'espec'].forEach((k) => (e[k] || []).forEach((x) => m.set(x.id, x))); });
        indexar(BASE, BI);
        let prop = null; try { const sc = scriptBorrador(); prop = JSON.parse((sc && sc.textContent) || 'null'); } catch (e) { prop = null; }
        if (prop && prop.trabajo && prop.base && prop.base.huella === PQ.huella) { W = prop.trabajo; SOL = prop.solicitud || {}; }
        else { W = clon(BASE); SOL = {}; }
        W.estructuras.forEach((e) => [e.pasos || [], ...(e.etiquetas || []).map((t) => t.pasos || [])].forEach((l) => l.forEach((p) => { [p, ...(p.pm || [])].forEach((x) => { const s = /^n:(\d+)/.exec(x.id); if (s) seq = Math.max(seq, +s[1] + 1); }); })));
        ['equipos', 'utensilios'].forEach((k) => W.estructuras.forEach((e) => (e[k] || []).forEach((x) => { const s = /^n:(\d+)/.exec(x.id); if (s) seq = Math.max(seq, +s[1] + 1); })));
        pintarTodo();
        let auto = null; try { auto = JSON.parse(localStorage.getItem(CLAVE()) || 'null'); } catch (e) { auto = null; }
        if (auto && auto.W && (!prop || (auto.t > Date.parse(prop.guardado || 0)))) ofrecerRecuperar(auto);
      } catch (e) {
        app.innerHTML = `<div class="pp-cargando error">No se pudo abrir la plantilla: ${esc(e.message)}.<br>Ábrela con Google Chrome o Microsoft Edge actualizados.</div>`;
      }
    }

    // ---------- estado ----------
    function cambio(fn) { const rb = document.querySelector('.pp-recuperar'); if (rb && !cambio.recuperando) rb.remove(); deshacer.push(clon({ W, SOL })); if (deshacer.length > 60) deshacer.shift(); fn(); sucio = true; guardarLocal(); pintarTodo(); }
    function guardarLocal() { clearTimeout(guardarLocal.t); guardarLocal.t = setTimeout(() => { try { localStorage.setItem(CLAVE(), JSON.stringify({ t: Date.now(), W, SOL })); } catch (e) { /* sin almacenamiento: solo se pierde la copia automática */ } }, 400); }
    function ofrecerRecuperar(auto) {
      const b = document.createElement('div'); b.className = 'pp-recuperar';
      b.innerHTML = `Hay cambios de esta plantilla que no se guardaron en un archivo (${esc(fechaHora(auto.t))}). <button type="button" data-a="si">Recuperarlos</button> <button type="button" data-a="no">Descartar</button>`;
      document.body.appendChild(b);
      b.addEventListener('click', (e) => { const a = e.target.dataset.a; if (!a) return; if (a === 'si') { cambio.recuperando = true; cambio(() => { W = auto.W; SOL = auto.SOL || {}; }); cambio.recuperando = false; } else { try { localStorage.removeItem(CLAVE()); } catch (x) { /* nada */ } } b.remove(); });
    }
    function encontrar(id) {
      for (const e of W.estructuras) {
        if (e.id === id) return { item: e, e, clase: 'estructura' };
        const listas = [[e.pasos || (e.pasos = []), null], ...(e.etiquetas || []).map((t) => [t.pasos || (t.pasos = []), t])];
        for (const [lista, t] of listas) {
          if (t && t.id === id) return { item: t, e, t, clase: 'etiqueta' };
          for (const p of lista) { if (p.id === id) return { item: p, lista, e, t, clase: 'paso' }; for (const m of p.pm || []) if (m.id === id) return { item: m, lista: p.pm, e, t, padre: p, clase: 'pm' }; }
        }
        for (const k of ['equipos', 'utensilios']) for (const x of e[k] || []) if (x.id === id) return { item: x, lista: e[k], e, clase: k === 'equipos' ? 'equipo' : 'utensilio' };
        for (const x of e.espec || []) if (x.id === id) return { item: x, lista: e.espec, e, clase: 'especificacion' };
      }
      return null;
    }
    const cambiado = (x, b) => b && (String(x.codigo || '') !== String(b.codigo || '') || PPN.normalizar(x.texto) !== PPN.normalizar(b.texto));
    const valoresCambiados = (x, b) => b && ['vi', 'vf', 'margen'].some((k) => String(x[k] == null ? '' : x[k]) !== String(b[k] == null ? '' : b[k]));

    // ---------- dibujo ----------
    function pintarTodo() {
      CMB = PPN.cambios(BASE, W); AV = PPN.avisos(W, { buscador: BUS, etiquetas: ETQ, base: BASE.estructuras }); MOV = new Set(CMB.filter((c) => c.accion === 'mover').map((c) => c.id));
      const y = window.scrollY;
      app.innerHTML = `${htmlBarra()}<div class="pp-cuerpo"><main class="pp-doc" id="pp-doc">${htmlDoc()}</main><aside class="pp-panel" id="pp-panel">${htmlPanel()}</aside></div><section class="pp-solo-impresion">${htmlImpresion()}</section>`;
      window.scrollTo(0, y);
      document.title = `${sucio ? '● ' : ''}Borrador RMD ${PQ.rmd.codigo} v${PQ.rmd.version}`;
    }
    function contar() {
      const errores = [...AV.values()].flat().filter((a) => a.nivel === 'error').length, avisosN = [...AV.values()].flat().filter((a) => a.nivel === 'aviso').length;
      const nuevos = CMB.filter((c) => (c.accion === 'agregar' || c.accion === 'cambiar') && c.nuevo).length + CMB.filter((c) => c.accion === 'agregar' && c.pm).reduce((s, c) => s + c.pm.filter((m) => m.nuevo).length, 0);
      return { errores, avisos: avisosN, nuevos, total: CMB.length };
    }
    function htmlBarra() {
      const r = PQ.rmd, n = contar(), falta = !solicitudCompleta();
      return `<header class="pp-barra"><div class="pp-titulo"><b>Borrador de Producción · RMD ${esc(r.codigo)} v${esc(r.version)}</b><span>${esc(r.descripcion)} · ${esc(r.etapa)} · ${esc(r.planta)}</span></div>
        <div class="pp-botones"><span class="pp-sucio" title="Hay cambios que aún no se guardaron en un archivo">${sucio ? '● Sin guardar' : ''}</span>
        <button type="button" data-a="deshacer" ${deshacer.length ? '' : 'disabled'} title="Deshacer el último cambio (Ctrl+Z)">Deshacer</button>
        <button type="button" data-a="solicitud" class="${falta ? 'falta' : ''}" title="Quién pide el cambio y por qué">Solicitud${falta ? ' ⚠' : ' ✓'}</button>
        <button type="button" data-a="imprimir" title="Imprimir o guardar en PDF el borrador con los cambios marcados">Imprimir</button>
        <button type="button" data-a="guardar" class="primario" title="Descarga el archivo con el borrador para enviarlo al equipo RMD">Guardar borrador</button></div>
        <div class="pp-resumen">${n.total ? `${n.total} cambio${n.total === 1 ? '' : 's'}` : 'Sin cambios todavía'}${n.nuevos ? ` · <b class="crea">${n.nuevos} paso${n.nuevos === 1 ? '' : 's'} nuevo${n.nuevos === 1 ? '' : 's'} a crear</b>` : ''}${n.errores ? ` · <b class="err">${n.errores} por corregir</b>` : ''}${n.avisos ? ` · <b class="avi">${n.avisos} aviso${n.avisos === 1 ? '' : 's'}</b>` : ''} · <span class="pp-ayuda-corta">Pasa el ratón por una fila: ✎ cambiar · + agregar · ↑ ↓ mover · ✕ quitar · 💬 comentar</span></div></header>`;
    }
    // Encabezado de página del PDF (8 columnas: 60, 80, 68, 28, 45, 75, 53, 60)
    function htmlEncabezadoPdf() {
      const r = PQ.rmd, logo = r.logo ? `<img src="${r.logo}" alt="Medifarma">` : '<b class="pp-logo-tx">● Medifarma</b>';
      return `<table class="pp-enc">${cols([60, 80, 68, 28, 45, 75, 53, 60])}
        <tr><td colspan="4" class="logo">${logo}</td><td colspan="2" class="c">Etapa</td><td class="et a">Emitido:</td><td class="va a"></td></tr>
        <tr><td colspan="4" class="c g rm">REGISTRO DE MANUFACTURA</td><td colspan="2" class="c">${esc(r.etapa)}</td><td class="et z">Página:</td><td class="va z g"></td></tr>
        <tr><td colspan="6" rowspan="4" class="c g desc">${esc(r.descripcion)}</td><td class="et a">Orden N°:</td><td class="va a"></td></tr>
        <tr><td class="et m">Lote:</td><td class="va m"></td></tr><tr><td class="et m">Expira:</td><td class="va m"></td></tr><tr><td class="et z">Teórico:</td><td class="va z"></td></tr>
        <tr><td class="c">Código</td><td class="c">Version Fab./Alt.</td><td class="c">Edi. Reg. Manuf.</td><td colspan="3" class="c">Estado / Fecha / Por</td><td colspan="2" class="c">Fecha de ${esc(r.etapa)}</td></tr>
        <tr><td rowspan="2" class="c dato"></td><td rowspan="2" class="c dato"></td><td rowspan="2" class="c dato">${esc(r.version)}</td><td colspan="3" rowspan="2" class="c dato">${esc(r.estadoFechaPor || r.estado)}</td><td class="et a">Inicio:</td><td class="va a"></td></tr>
        <tr><td class="et z">Fin:</td><td class="va z"></td></tr></table>`;
    }
    function htmlDoc() {
      const num = PPN.numerar(W.estructuras, BASE.estructuras), r = PQ.rmd;
      const validacion = r.rptaValidacion ? `<table class="pp-t pp-val"><tr><td>- PROCESO VALIDADO REPORTE DE VALIDACIÓN N° ${esc(r.rptaValidacion)}</td></tr></table>` : '';
      const cuerpo = validacion + [...W.estructuras].sort(PPN.porOrden).map((e) => htmlEstructura(e, num)).join('');
      return `<table class="pp-pagina"><thead><tr><td>${htmlEncabezadoPdf()}</td></tr></thead><tbody><tr><td class="pp-hoja">${cuerpo}</td></tr></tbody></table>`;
    }
    const acciones = (clase, quitado, soloComentario, conPm) => `<span class="pp-acc">${quitado ? `<button type="button" data-a="restaurar" title="Volver a poner">↺</button>` : soloComentario ? `<button type="button" data-a="comentar" title="Comentario">💬</button>` :
      `<button type="button" data-a="editar" title="Cambiar el texto">✎</button>${clase === 'paso' || clase === 'pm' ? `<button type="button" data-a="agregar" title="Agregar ${clase === 'pm' ? 'un proceso menor' : 'un paso'} debajo">+</button>${conPm ? '<button type="button" data-a="agregar-pm" class="ancho" title="Agregar un proceso menor a este paso">+PM</button>' : ''}<button type="button" data-a="subir" title="Subir">↑</button><button type="button" data-a="bajar" title="Bajar">↓</button>` : ''}<button type="button" data-a="quitar" title="Quitar">✕</button><button type="button" data-a="comentar" title="Comentario">💬</button>`}</span>`;
    function marcasDe(x, b) {
      const out = [];
      if (!b) out.push('<span class="pp-tag agr">Nuevo</span>'); else if (x.quitado) out.push('<span class="pp-tag qui">Quitado</span>');
      else { if (cambiado(x, b)) out.push('<span class="pp-tag cam">Cambiado</span>'); if (valoresCambiados(x, b)) out.push('<span class="pp-tag cam">Rango</span>'); if (MOV.has(x.id)) out.push('<span class="pp-tag mov">Movido</span>'); }
      if (!x.quitado && x.nuevo) out.push('<span class="pp-tag crea" title="No existe en el catálogo de SAP con este texto: el equipo RMD lo creará">★ Se creará</span>');
      else if (!x.quitado && x.codigo && (!b || cambiado(x, b))) out.push(`<span class="pp-tag ok" title="Paso que ya existe en SAP">Paso ${esc(x.codigo)}</span>`);
      return out.length ? `<span class="pp-tags">${out.join('')}</span>` : '';
    }
    const estadoCl = (x, b) => [!b ? 'agr' : '', x.quitado ? 'qui' : '', b && !x.quitado && (cambiado(x, b) || valoresCambiados(x, b)) ? 'cam' : '', MOV.has(x.id) ? 'mov' : ''].filter(Boolean).join(' ');
    const htmlAvisos = (id) => (AV.get(id) || []).map((a) => `<div class="pp-aviso ${a.nivel}">${a.nivel === 'error' ? '✕' : a.nivel === 'aviso' ? '⚠' : 'ℹ'} ${esc(a.texto)}</div>`).join('');
    const htmlComentario = (x) => (x.comentario ? `<div class="pp-coment">💬 ${esc(x.comentario)}</div>` : '');
    const htmlAntes = (x, b) => (b && !x.quitado && cambiado(x, b) ? `<div class="pp-antes">Antes: ${esc(b.texto)}${b.codigo ? ` (paso ${esc(b.codigo)})` : ''}</div>` : '');
    function htmlRango(x) {
      if (x.vi == null && x.vf == null && x.margen == null) return '';
      return ` <span class="pp-rango" title="Rango del tipo de dato «Rango»">[${esc(x.vi == null ? '—' : x.vi)} – ${esc(x.vf == null ? '—' : x.vf)}${x.margen != null && x.margen !== '' ? ` ± ${esc(x.margen)}` : ''}]</span>`;
    }
    const colorDe = (x) => (x.formato && x.colorHex && /^#?[0-9a-f]{3,8}$/i.test(String(x.colorHex).trim()) ? ` style="color:${String(x.colorHex).trim().replace(/^(?!#)/, '#')}"` : '');
    // contenido de la celda de texto (texto como el PDF + marcas del borrador)
    const celdaTexto = (x, b, texto) => `<span class="pp-tx"${colorDe(x)}>${texto}</span>${htmlRango(x)}${marcasDe(x, b)}${htmlAntes(x, b)}${htmlAvisos(x.id)}${htmlComentario(x)}`;
    function tipoFila(x, esPm, conforme) {
      let r;
      if (x.edit) r = 'I';
      else if (!esPm && x.rpor && !x.vb) r = 'R';
      else if (!esPm && !x.rpor && x.vb) r = 'V';
      else if (!esPm && x.rpor && x.vb) r = 'RV';
      else if (CON_CAJA.has(+x.tipo)) r = 'I';
      else if (CON_CHECK.has(+x.tipo)) r = 'C';
      else r = 'T';
      if (!esPm && conforme && !x.edit) r = 'T';
      return r;
    }
    const mini = (cabs, filas) => `<table class="pp-mini"><tr>${cabs.map((c) => `<th>${c}</th>`).join('')}</tr>${Array.from({ length: filas }, () => `<tr>${cabs.map(() => '<td></td>').join('')}</tr>`).join('')}</table>`;
    // ---- procedimiento: una etiqueta como en el PDF ----
    function filaPaso(p, numero, conforme, conPm) {
      const b = BI.get(p.id), r = tipoFila(p, false, conforme), num = p.quitado ? `<s>${esc(NUM_BASE.get(p.id) || '')}${NUM_BASE.get(p.id) ? '.-' : ''}</s>` : `${esc(numero || '')}${numero ? '.-' : ''}`;
      const tx = celdaTexto(p, b, esc(p.texto)), acc = acciones('paso', p.quitado, false, conPm);
      let celdas;
      if (r === 'T') celdas = [`<td colspan="5" class="pp-c-tx">${tx}</td>`];
      else if (r === 'I') celdas = [`<td colspan="3" class="pp-c-tx">${tx}</td>`, `<td colspan="2" class="pp-c-caja">${CAJA}</td>`];
      else if (r === 'C') celdas = [`<td colspan="3" class="pp-c-tx">${tx}</td>`, '<td></td>', `<td class="pp-c-chk">${CHECK}</td>`];
      else if (r === 'R') celdas = [`<td colspan="3" class="pp-c-tx">${tx}</td>`, '<td></td>', `<td class="pp-c-mini">${mini(['Realizado Por'], 2)}</td>`];
      else if (r === 'V') celdas = [`<td colspan="3" class="pp-c-tx">${tx}</td>`, '<td></td>', `<td class="pp-c-mini">${mini(['VB'], 1)}</td>`];
      else celdas = [`<td colspan="3" class="pp-c-tx">${tx}</td>`, `<td colspan="2" class="pp-c-mini">${mini(['Realizado Por', 'VB'], 2)}</td>`];
      if (conforme) celdas.push(`<td class="pp-c-chk">${CHECK}</td>`);
      celdas[celdas.length - 1] = celdas[celdas.length - 1].replace(/^<td([^>]*)>/, (m0, a) => `<td${a.includes('class="') ? a.replace('class="', 'class="ult ') : a + ' class="ult"'}>`).replace(/<\/td>$/, `${acc}</td>`);
      return `<tr class="pp-paso ${estadoCl(p, b)}" data-id="${esc(p.id)}"><td class="pp-c-num">${num}</td>${celdas.join('')}</tr>`;
    }
    function filaPm(m, conforme) {
      const b = BI.get(m.id), r = tipoFila(m, true, conforme), acc = acciones('pm', m.quitado, m.insumo);
      const texto = m.insumo ? celdaTexto(m, b, `${esc(m.mat || m.texto)} (${esc(m.comp)})`) : celdaTexto(m, b, esc(m.texto));
      const celdas = ['<td></td>'];
      if (m.insumo) celdas.push(`<td class="pp-c-pm${m.tab ? ' tab' : ''}">${texto}</td>`, `<td class="pp-c-cant">${esc(fmtDec(m.cant))} ${esc(m.um || '')}</td>`);
      else celdas.push(`<td colspan="2" class="pp-c-pm${m.tab ? ' tab' : ''}">${texto}</td>`);
      celdas.push(r === 'I' ? `<td class="pp-c-caja">${CAJA}</td>` : r === 'C' ? `<td class="pp-c-chk">${CHECK}</td>` : '<td></td>', '<td></td>', '<td></td>');
      if (conforme) celdas.push('<td></td>');
      celdas[celdas.length - 1] = celdas[celdas.length - 1].replace(/^<td([^>]*)>/, (m0, a) => `<td${a.includes('class="') ? a.replace('class="', 'class="ult ') : a + ' class="ult"'}>`).replace(/<\/td>$/, `${acc}</td>`);
      return `<tr class="pp-pm ${estadoCl(m, b)}" data-id="${esc(m.id)}">${celdas.join('')}</tr>`;
    }
    function htmlEtiqueta(e, t, num) {
      const conf = !!t.conforme, nt = num.get(t.id), pasos = t.pasos || [];
      const filas = pasos.map((p) => filaPaso(p, num.get(p.id), conf, true) + (p.quitado ? '' : (p.pm || []).map((m) => filaPm(m, conf)).join(''))).join('');
      const ver = conf && pasos.length ? '<tr class="pp-ver"><td colspan="3">VERIFICADO POR:</td><td colspan="4">FECHA:</td></tr>' : '';
      return `<div class="pp-etq" data-id="${esc(t.id)}"><table class="pp-etq-cab"><tr><td class="pp-etq-tit">${nt ? esc(nt) + '.-' : ''}${esc(t.nombre)} <button type="button" class="pp-com-tit" data-a="comentar" data-id="${esc(t.id)}" title="Comentario sobre esta etiqueta">💬</button></td>${conf ? '<td class="pp-nota-der">(Colocar check en caso de conformidad)</td>' : ''}</tr></table>
        ${htmlAvisos(t.id)}${htmlComentario(t)}<table class="pp-t pp-proc${conf ? ' conf' : ''}">${cols(conf ? [40, 243, 35, 50, 35, 50, 25] : [40, 233, 55, 50, 50, 60])}${filas}${ver}</table>
        <button type="button" class="pp-mas" data-a="agregar-final" data-lista="etq:${esc(t.id)}">+ Agregar paso</button></div>`;
    }
    // ---- cuadros (Precauciones, Notas, Condiciones): filas con guion ----
    function htmlCuadro(e, lista) {
      const filas = lista.map((p) => { const b = BI.get(p.id), acc = acciones('paso', p.quitado, false, false);
        return `<tr class="pp-paso ${estadoCl(p, b)}" data-id="${esc(p.id)}"><td class="pp-c-guion">-</td><td colspan="3" class="pp-c-tx ult">${celdaTexto(p, b, esc(p.texto))}${acc}</td></tr>`
          + (p.quitado ? '' : (p.pm || []).map((m) => { const bm = BI.get(m.id); return `<tr class="pp-pm ${estadoCl(m, bm)}" data-id="${esc(m.id)}"><td></td><td colspan="3" class="pp-c-pm ult">${celdaTexto(m, bm, esc(m.insumo ? `${m.mat || m.texto} (${m.comp}) ${fmtDec(m.cant)} ${m.um || ''}` : m.texto))}${acciones('pm', m.quitado, m.insumo)}</td></tr>`; }).join('')); }).join('');
      const ver = e.verificadoPor ? '<tr class="pp-ver"><td colspan="2">VERIFICADO POR:</td><td colspan="2">FECHA:</td></tr>' : '';
      return `<table class="pp-t pp-cuadro">${cols([8, 365, 110, 25])}${filas || '<tr><td></td><td colspan="3" class="pp-vacio">(sin pasos)</td></tr>'}${ver}</table><button type="button" class="pp-mas" data-a="agregar-final" data-lista="est:${esc(e.id)}">+ Agregar paso</button>`;
    }
    function htmlEquipos(e) {
      const fila = (k, x) => { const b = BI.get(x.id), acc = x.quitado ? '<span class="pp-acc"><button type="button" data-a="restaurar" title="Volver a poner">↺</button></span>' : '<span class="pp-acc"><button type="button" data-a="quitar" title="Quitar">✕</button><button type="button" data-a="comentar" title="Comentario">💬</button></span>';
        const codigo = k === 'utensilios' && !x.utensilioId ? 'AGRUPADOR' : x.codigo;
        return `<tr class="${estadoCl(x, b)}" data-id="${esc(x.id)}"><td class="pp-c-tx"><span class="pp-tx">${esc(x.desc)}</span>${marcasDe(x, b)}${htmlAvisos(x.id)}${htmlComentario(x)}</td><td class="c">${esc(codigo)}</td><td class="c">${esc(k === 'equipos' ? (x.ref || '-') : '-')}</td><td class="ult">${acc}</td></tr>`; };
      const filas = [...(e.equipos || []).map((x) => fila('equipos', x)), ...(e.utensilios || []).map((x) => fila('utensilios', x))].join('');
      const ver = e.verificadoPor ? '<tr class="pp-ver"><td>VERIFICADO POR:</td><td colspan="3">FECHA:</td></tr>' : '';
      return `<div class="pp-nota-der fila">(Colocar check en caso de conformidad)</div><table class="pp-t pp-grid">${cols([300, 80, 105, 25])}<tr class="pp-th"><th>Descripción</th><th>Código</th><th>Código de referencia</th><th>${ICO_CHECK}</th></tr>${filas}${ver}</table>
        <button type="button" class="pp-mas" data-a="agregar-equipo" data-est="${esc(e.id)}">+ Agregar equipo o utensilio</button>`;
    }
    function htmlInsumos(e) {
      const lista = (e.insumos || []).filter((x) => x.aiPrio === '00' || x.aiPrio === '01');          // como el PDF: solo prioridad 00 y 01
      const filas = lista.map((x) => `<tr><td>${esc(x.desc)}${x.txtadic ? ' ' + esc(x.txtadic) : ''}</td><td class="c">${esc(x.comp)}</td><td class="d">${esc(fmtDec(x.cant))}</td><td class="c">${esc(x.um)}</td><td></td><td></td><td></td><td></td></tr>`).join('');
      const ver = e.verificadoPor ? '<tr class="pp-ver"><td colspan="4">VERIFICADO POR:</td><td colspan="4">FECHA:</td></tr>' : '';
      return `<div class="pp-nota-der fila">(Colocar check en caso de conformidad)</div><table class="pp-t pp-grid pp-ins">${cols([172, 55, 68, 28, 68, 34, 30, 22])}<tr class="pp-th"><th>Descripción</th><th>Código</th><th>Cantidad</th><th>UM</th><th>Cant. Recib.</th><th>UM (CP)</th><th>Bulto</th><th>${ICO_CHECK}</th></tr>${filas}${ver}</table>
        <p class="pp-nota pp-pantalla">Los insumos vienen de la receta en SAP: para cambiarlos se actualiza la receta. Puedes dejar un comentario en la sección (💬 junto al título).</p>`;
    }
    function htmlEspec(e) {
      const grupos = []; (e.espec || []).forEach((x) => { const k = x.grupoId == null ? x.grupo || '' : x.grupoId; let g = grupos.find((y) => y.k === k); if (!g) grupos.push((g = { k, nombre: x.grupo || '', filas: [] })); g.filas.push(x); });
      const filas = grupos.map((g) => `<tr class="pp-grupo"><td>${esc(g.nombre)}</td><td></td><td></td></tr>` + g.filas.map((x) => `<tr data-id="${esc(x.id)}"><td class="pp-c-tx"><span class="pp-tx">${esc(x.ensayo)}</span>${htmlComentario(x)}</td><td>${esc(x.especificacion || [x.vi, x.vf].filter((v) => v != null && v !== '').join(' - '))}</td><td class="ult"><span class="pp-acc"><button type="button" data-a="comentar" title="Comentario">💬</button></span></td></tr>`).join('')).join('');
      return `<table class="pp-t pp-grid pp-esp">${cols([170, 170, 170])}<tr class="pp-th"><th>ENSAYO</th><th>ESPECIFICACIONES</th><th>RESULTADOS</th></tr>${filas}<tr class="pp-ver"><td colspan="2">VERIFICADO POR:</td><td>FECHA:</td></tr></table>`;
    }
    function htmlFirmas() {
      const t = `<table class="pp-t pp-grid pp-firma">${cols([25, 25, 130, 50])}<tr class="pp-th"><th>R</th><th>S</th><th>Nombre y Apellidos</th><th>Firma</th></tr>${'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(5)}</table>`;
      return `<div class="pp-nota-der fila">(Colocar check, según corresponda)</div><div class="pp-firmas2">${t}${t}</div><table class="pp-t pp-val"><tr><td>R: Realizado por, S: Supervisado por</td></tr></table>`;
    }
    function htmlEstructura(e, num) {
      const n = num.get(e.id), com = `<button type="button" class="pp-com-tit" data-a="comentar" data-id="${esc(e.id)}" title="Comentario sobre esta sección">💬</button>`;
      let cuerpo = '';
      if (e.tipo === TIPO.EQUIPOS) cuerpo = htmlEquipos(e);
      else if (e.tipo === TIPO.FORMULA) cuerpo = htmlInsumos(e);
      else if (e.tipo === TIPO.ESPEC) cuerpo = htmlEspec(e);
      else if (e.tipo === TIPO.FIRMAS) cuerpo = htmlFirmas();
      else if (e.tipo === TIPO.PROCESOS && (e.etiquetas || []).length) cuerpo = ((e.pasos || []).length ? htmlCuadro(e, e.pasos) : '') + [...e.etiquetas].sort(PPN.porOrden).map((t) => htmlEtiqueta(e, t, num)).join('');
      else cuerpo = htmlCuadro(e, e.pasos || []);
      return `<section class="pp-est" data-id="${esc(e.id)}"><div class="pp-sub">${n ? esc(n) + '.-' : ''}${esc(e.nombre)} ${com}</div>${htmlAvisos(e.id)}${htmlComentario(e)}${cuerpo}</section>`;
    }
    const ETQ_ACCION = { agregar: 'Agregar', quitar: 'Quitar', cambiar: 'Cambiar texto', valores: 'Rango', mover: 'Mover', comentario: 'Comentario' };
    function htmlPanel() {
      const n = contar(), conAviso = [...AV.entries()].filter(([, l]) => l.some((a) => a.nivel !== 'info'));
      const lista = filtro === 'nuevos' ? CMB.filter((c) => c.nuevo || (c.pm && c.pm.some((m) => m.nuevo))) : filtro === 'avisos' ? [] : CMB;
      const chips = [['todos', `Cambios ${n.total}`], ['nuevos', `A crear ${n.nuevos}`], ['avisos', `Avisos ${conAviso.length}`]].map(([k, t]) => `<button type="button" data-filtro="${k}" class="${filtro === k ? 'activo' : ''}">${t}</button>`).join('');
      const corto = (t) => { t = String(t || ''); return t.length > 90 ? t.slice(0, 90) + '…' : t; };
      let cuerpo;
      if (filtro === 'avisos') cuerpo = conAviso.length ? conAviso.map(([id, l]) => { const f = encontrar(id); return `<button type="button" class="pp-cmb" data-ir="${esc(id)}"><b>${esc(f ? (f.item.texto || f.item.nombre || f.item.desc || '') : '').slice(0, 70)}</b>${l.filter((a) => a.nivel !== 'info').map((a) => `<span class="pp-cmb-av ${a.nivel}">${esc(a.texto)}</span>`).join('')}</button>`; }).join('') : '<p class="pp-nota">Sin avisos.</p>';
      else cuerpo = lista.length ? lista.map((c) => `<button type="button" class="pp-cmb ${c.accion}" data-ir="${esc(c.id)}"><span class="pp-cmb-n">${esc(c.numero || '')}</span> <b>${ETQ_ACCION[c.accion]}${c.clase === 'pm' ? ' (proceso menor)' : c.clase === 'equipo' || c.clase === 'utensilio' ? ' (' + c.clase + ')' : c.clase === 'etiqueta' || c.clase === 'estructura' ? ' (sección)' : ''}</b>${c.nuevo ? ' <span class="pp-tag crea">★ se creará</span>' : ''}<br><span>${esc(corto(c.accion === 'quitar' ? c.antes : c.accion === 'comentario' ? c.comentario : c.despues || c.texto))}</span></button>`).join('') : `<p class="pp-nota">${filtro === 'nuevos' ? 'No hay pasos nuevos a crear.' : 'Todavía no hay cambios.'}</p>`;
      return `<div class="pp-panel-cab"><b>Cambios del borrador</b><div class="pp-chips">${chips}</div></div><div class="pp-panel-lista">${cuerpo}</div>`;
    }
    function htmlImpresion() {
      const r = PQ.rmd, s = SOL || {};
      return `<h2>Resumen del borrador · RMD ${esc(r.codigo)} v${esc(r.version)}</h2><table class="pp-tabla"><tbody><tr><td>Solicitado por</td><td>${esc(s.nombre || '')}</td><td>Área</td><td>${esc(s.area || '')}</td></tr><tr><td>Motivo</td><td colspan="3">${esc(s.motivo || '')}</td></tr><tr><td>Control de cambio</td><td>${esc(s.cc || '')}</td><td>Fecha</td><td>${esc(fechaHora(Date.now()))}</td></tr>${s.observacion ? `<tr><td>Observación</td><td colspan="3">${esc(s.observacion)}</td></tr>` : ''}</tbody></table>
        <table class="pp-tabla"><thead><tr><th>N.°</th><th>Cambio</th><th>Antes</th><th>Después</th><th>Comentario</th></tr></thead><tbody>${CMB.map((c) => `<tr><td>${esc(c.numero || '')}</td><td>${ETQ_ACCION[c.accion]}${c.nuevo ? ' ★' : ''}<br><span class="pp-nota">${esc(c.lugar)}</span></td><td>${esc(c.antes || '')}</td><td>${esc(c.accion === 'comentario' ? '' : c.despues || (c.campos ? c.campos.map((x) => `${x.campo}: ${x.antes || '—'} → ${x.despues || '—'}`).join('; ') : c.accion === 'mover' ? 'después de: ' + ((c.trasDe && c.trasDe.texto) || 'al inicio') : c.texto || ''))}</td><td>${esc(c.comentario || '')}</td></tr>`).join('')}</tbody></table>
        <p class="pp-nota">★ = paso que no existe en el catálogo de SAP con ese texto: el equipo RMD lo creará.</p><table class="pp-firmas"><tr><td>Solicitado por (firma)</td><td>Revisado por (firma)</td><td>Ingresado en SAP RMD por</td></tr></table>`;
    }

    // ---------- modales ----------
    function modal(html, alMontar) {
      const f = document.createElement('div'); f.className = 'pp-modal-fondo'; f.innerHTML = `<div class="pp-modal" role="dialog" aria-modal="true">${html}</div>`;
      document.body.appendChild(f); const cerrar = () => { f.remove(); document.removeEventListener('keydown', tecla, true); };
      const tecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); cerrar(); } };
      document.addEventListener('keydown', tecla, true); f.addEventListener('mousedown', (e) => { if (e.target === f) cerrar(); });
      if (alMontar) alMontar(f.firstElementChild, cerrar); return cerrar;
    }
    function editar(ref) {
      // ref: { id } (editar) o { nuevo: true, lista, despuesDe, clase, e, t, padre }
      const f = ref.id ? encontrar(ref.id) : ref, x = ref.id ? f.item : { texto: '' }, b = ref.id ? BI.get(ref.id) : null, clase = ref.id ? f.clase : ref.clase;
      const estr = f.e.estructuraId, etq = f.t ? f.t.etiquetaId : null, num = PPN.numerar(W.estructuras, BASE.estructuras);
      const donde = `${f.e.nombre}${f.t ? ' › ' + f.t.nombre : ''}`;
      const titulo = ref.id ? `${clase === 'pm' ? 'Proceso menor' : 'Paso'} ${clase === 'pm' ? '' : esc(num.get(x.id) || '')}` : `Nuevo ${clase === 'pm' ? 'proceso menor' : 'paso'}`;
      let elegido = x.codigo && !x.nuevo ? BUS.porCodigo(x.codigo) || { codigo: x.codigo, texto: x.texto, etq: x.etqCat || etq, estr, tipo: x.tipo } : null;
      const conRango = () => (elegido ? elegido.tipo === RANGO : x.tipo === RANGO) || x.vi != null || x.vf != null;
      modal(`<h3>${titulo}<span>${esc(donde)}${ref.padre ? ' › ' + esc(ref.padre.texto).slice(0, 60) : ''}</span></h3>
        <label class="pp-campo">Texto<textarea id="m-texto" rows="3" spellcheck="true">${esc(x.texto)}</textarea></label>
        <div id="m-estado" class="pp-estado"></div><div id="m-sug" class="pp-sug"></div>
        <div id="m-rango" class="pp-rango-ed" hidden><label>Valor inicial <input id="m-vi" value="${esc(x.vi == null ? '' : x.vi)}"></label><label>Valor final <input id="m-vf" value="${esc(x.vf == null ? '' : x.vf)}"></label><label>Margen <input id="m-mg" value="${esc(x.margen == null ? '' : x.margen)}"></label></div>
        <label class="pp-campo">Comentario para el equipo RMD (opcional)<textarea id="m-com" rows="2">${esc(x.comentario || '')}</textarea></label>
        <div class="pp-pie"><button type="button" data-a="cancelar">Cancelar</button><button type="button" class="primario" data-a="aceptar">Aceptar</button></div>`, (m, cerrar) => {
        const ta = $('#m-texto', m), est = $('#m-estado', m), sug = $('#m-sug', m), rango = $('#m-rango', m);
        const pintarEstado = () => {
          const t = ta.value.trim(), igualBase = b && PPN.normalizar(t) === PPN.normalizar(b.texto);
          if (elegido && PPN.normalizar(t) !== PPN.normalizar(elegido.texto)) elegido = null;
          if (!elegido && t) { const ex = BUS.exactos(t).filter((c) => c.estr === estr && (clase === 'pm' || !etq || c.etq === etq)); if (ex.length) elegido = ex[0]; }
          if (!t) est.innerHTML = '<span class="err">Escribe el texto del paso o elige uno de la lista.</span>';
          else if (igualBase && (!elegido || String(elegido.codigo) === String(b.codigo))) est.innerHTML = '<span class="ok">Sin cambios en el texto.</span>';
          else if (elegido) est.innerHTML = `<span class="ok">✓ Se usará el paso ${esc(elegido.codigo)}, que ya existe en SAP.</span>${etq && elegido.etq && elegido.etq !== etq && clase !== 'pm' ? `<br><span class="avi">⚠ En el catálogo es de ${esc(ETQ.get(elegido.etq) || 'otra etiqueta')}: en producción podría no aparecer en su lugar.</span>` : ''}`;
          else est.innerHTML = '<span class="crea">★ Paso nuevo: no existe en SAP con este texto. El equipo RMD lo creará.</span>';
          rango.hidden = !conRango();
        };
        const pintarSug = () => {
          const t = ta.value.trim(); if (t.length < 4) { sug.innerHTML = ''; return; }
          const r = BUS.buscar(t, { estr, etq, max: 7 }).filter((y) => y.f.estr === estr);
          sug.innerHTML = r.length ? `<div class="pp-sug-tit">Pasos que ya existen en SAP (${BUS.total.toLocaleString('es-PE')} en el catálogo)</div>${r.map((y) => `<button type="button" class="pp-sug-it${y.igual ? ' igual' : ''}${elegido && String(elegido.codigo) === String(y.f.codigo) ? ' elegido' : ''}" data-codigo="${esc(y.f.codigo)}"><span class="pct">${y.igual ? 'Igual' : Math.round(y.s * 100) + ' %'}</span><span class="cod">${esc(y.f.codigo)}</span><span class="tx">${esc(y.f.texto)}</span>${etq && y.f.etq && y.f.etq !== etq && clase !== 'pm' ? `<span class="otra">${esc(ETQ.get(y.f.etq) || 'otra etiqueta')}</span>` : ''}</button>`).join('')}` : '<div class="pp-sug-tit">No hay pasos parecidos en el catálogo.</div>';
        };
        let tm = 0; ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { pintarEstado(); pintarSug(); }, 140); });
        sug.addEventListener('click', (e) => { const s = e.target.closest('[data-codigo]'); if (!s) return; elegido = BUS.porCodigo(s.dataset.codigo); ta.value = elegido.texto; pintarEstado(); pintarSug(); ta.focus(); });
        const aceptar = () => {
          const t = ta.value.trim(); if (!t) { ta.focus(); return; }
          const vi = $('#m-vi', m).value.trim(), vf = $('#m-vf', m).value.trim(), mg = $('#m-mg', m).value.trim(), com = $('#m-com', m).value.trim();
          cambio(() => {
            let it = x;
            if (!ref.id) { it = { id: `n:${seq++}`, texto: '', pm: clase === 'paso' ? [] : undefined }; const lista = ref.lista, i = ref.despuesDe ? lista.findIndex((y) => y.id === ref.despuesDe) + 1 : lista.length; lista.splice(i, 0, it); }
            const viva = ref.id ? encontrar(ref.id).item : it;
            viva.texto = t; viva.comentario = com;
            const igualBase = b && PPN.normalizar(t) === PPN.normalizar(b.texto) && (!elegido || String(elegido.codigo) === String(b.codigo));
            if (igualBase) { viva.codigo = b.codigo; viva.pasoId = b.pasoId; viva.nuevo = false; viva.etqCat = b.etqCat; viva.tipo = b.tipo; }
            else if (elegido) { viva.codigo = String(elegido.codigo); viva.pasoId = null; viva.nuevo = false; viva.etqCat = elegido.etq; viva.tipo = elegido.tipo; }
            else { viva.codigo = null; viva.pasoId = null; viva.nuevo = true; viva.etqCat = null; viva.tipo = b ? b.tipo : (viva.tipo || null); }
            if (!rango.hidden) { viva.vi = vi === '' ? null : vi; viva.vf = vf === '' ? null : vf; viva.margen = mg === '' ? null : mg; }
          });
          cerrar(); setTimeout(() => irA(ref.id || `n:${seq - 1}`), 30);
        };
        m.addEventListener('click', (e) => { const a = e.target.dataset.a; if (a === 'cancelar') cerrar(); else if (a === 'aceptar') aceptar(); });
        ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); aceptar(); } });
        pintarEstado(); pintarSug(); setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 20);
      });
    }
    function comentar(id) {
      const f = encontrar(id); if (!f) return; const x = f.item;
      modal(`<h3>Comentario<span>${esc(x.texto || x.nombre || x.desc || x.ensayo || '')}</span></h3><label class="pp-campo">Comentario para el equipo RMD<textarea id="m-com" rows="4">${esc(x.comentario || '')}</textarea></label><div class="pp-pie"><button type="button" data-a="cancelar">Cancelar</button><button type="button" class="primario" data-a="aceptar">Aceptar</button></div>`, (m, cerrar) => {
        const ta = $('#m-com', m); setTimeout(() => ta.focus(), 20);
        m.addEventListener('click', (e) => { const a = e.target.dataset.a; if (a === 'cancelar') cerrar(); else if (a === 'aceptar') { const v = ta.value.trim(); cambio(() => { encontrar(id).item.comentario = v; }); cerrar(); } });
      });
    }
    function solicitudCompleta() { const s = SOL || {}; return !!(String(s.nombre || '').trim() && String(s.area || '').trim() && String(s.motivo || '').trim()); }
    function abrirSolicitud(paraGuardar) {
      const s = SOL || {}, campo = (k, t, req, filas) => `<label class="pp-campo">${t}${req ? ' *' : ''}${filas ? `<textarea data-k="${k}" rows="${filas}">${esc(s[k] || '')}</textarea>` : `<input data-k="${k}" value="${esc(s[k] || '')}">`}</label>`;
      modal(`<h3>Solicitud de cambio<span>${paraGuardar ? 'Completa estos datos para guardar el borrador' : 'Quién pide el cambio y por qué'}</span></h3>${campo('nombre', 'Nombre y apellido', true)}${campo('area', 'Área o sección', true)}${campo('motivo', 'Motivo del cambio', true, 2)}${campo('cc', 'Control de cambio (si lo hay)', false)}${campo('observacion', 'Observación', false, 2)}
        <div class="pp-pie"><button type="button" data-a="cancelar">Cancelar</button><button type="button" class="primario" data-a="aceptar">${paraGuardar ? 'Guardar borrador' : 'Aceptar'}</button></div>`, (m, cerrar) => {
        setTimeout(() => { const i = $$('[data-k]', m).find((x) => !x.value.trim()) || $('[data-k]', m); i.focus(); }, 20);
        m.addEventListener('click', (e) => { const a = e.target.dataset.a; if (a === 'cancelar') cerrar(); else if (a === 'aceptar') {
          const nuevo = {}; $$('[data-k]', m).forEach((i) => { nuevo[i.dataset.k] = i.value.trim(); });
          const faltan = ['nombre', 'area', 'motivo'].filter((k) => !nuevo[k]); $$('[data-k]', m).forEach((i) => i.classList.toggle('falta', faltan.includes(i.dataset.k)));
          if (faltan.length && paraGuardar) return;
          cambio(() => { SOL = nuevo; }); cerrar(); if (paraGuardar) guardar(); } });
      });
    }
    function agregarEquipo(estId) {
      const e = encontrar(estId).item;
      modal(`<h3>Agregar equipo o utensilio<span>${esc(e.nombre)}</span></h3><label class="pp-campo">Buscar por código o descripción<input id="m-q" placeholder="p. ej. BALANZA, PL1-SEL-E013, SEL-U005"></label><div id="m-res" class="pp-sug"></div><div class="pp-pie"><button type="button" data-a="cancelar">Cerrar</button></div>`, (m, cerrar) => {
        const q = $('#m-q', m), res = $('#m-res', m);
        const pintar = () => { const t = PPN.normalizar(q.value), ps = t.split(' ').filter(Boolean); if (!ps.length) { res.innerHTML = ''; return; }
          const r = EQ.filter((x) => ps.every((p) => x.n.includes(p))).slice(0, 40);
          res.innerHTML = r.length ? r.map((x) => `<button type="button" class="pp-sug-it" data-i="${EQ.indexOf(x)}"><span class="cod">${esc(x.codigo || (x.agrupador ? 'Agrupador' : ''))}</span><span class="tx">${esc(x.desc)}${x.ref ? ` · ${esc(x.ref)}` : ''}</span><span class="otra">${x.clase === 'equipos' ? 'Equipo' : x.agrupador ? 'Agrupador' : 'Utensilio'}</span></button>`).join('') : '<div class="pp-sug-tit">Sin resultados.</div>'; };
        q.addEventListener('input', pintar); setTimeout(() => q.focus(), 20);
        m.addEventListener('click', (ev) => { if (ev.target.dataset.a === 'cancelar') { cerrar(); return; } const s = ev.target.closest('[data-i]'); if (!s) return; const x = EQ[+s.dataset.i];
          cambio(() => { const est = encontrar(estId).item, k = x.clase; if (!est[k]) est[k] = []; est[k].push({ id: `n:${seq++}`, equipoId: x.equipoId || null, utensilioId: x.utensilioId || null, agrupadorId: x.agrupadorId || null, codigo: x.codigo || '', ref: x.ref || '', desc: x.desc }); });
          cerrar(); });
      });
    }

    // ---------- acciones ----------
    function irA(id) {
      const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`); if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('pp-destello'); void el.offsetWidth; el.classList.add('pp-destello');
    }
    function mover(id, dir) {
      cambio(() => { const f = encontrar(id), l = f.lista, i = l.findIndex((y) => y.id === id); let j = i + dir; while (j >= 0 && j < l.length && l[j].quitado) j += dir; if (j < 0 || j >= l.length) return; const [x] = l.splice(i, 1); l.splice(j, 0, x); });
      setTimeout(() => irA(id), 30);
    }
    function quitar(id) {
      cambio(() => { const f = encontrar(id); if (!BI.has(id)) { f.lista.splice(f.lista.findIndex((y) => y.id === id), 1); return; } f.item.quitado = true; });
    }
    function listaDe(ref) {
      const [tipo, id] = ref.split(/:(.+)/); const f = encontrar(id);
      return tipo === 'est' ? { lista: f.item.pasos || (f.item.pasos = []), e: f.item, t: null } : { lista: f.item.pasos || (f.item.pasos = []), e: f.e, t: f.item };
    }
    app.addEventListener('click', (ev) => {
      const fb = ev.target.closest('[data-filtro]'); if (fb) { filtro = fb.dataset.filtro; $('#pp-panel').innerHTML = htmlPanel(); return; }
      const ir = ev.target.closest('[data-ir]'); if (ir) { irA(ir.dataset.ir); return; }
      const b = ev.target.closest('button[data-a]'); if (!b) return;
      const a = b.dataset.a, fila = b.closest('[data-id]'), id = b.dataset.id || (fila && fila.dataset.id);
      if (a === 'guardar') guardar(); else if (a === 'imprimir') { pintarTodo(); window.print(); }
      else if (a === 'solicitud') abrirSolicitud(false);
      else if (a === 'deshacer') deshacerUno();
      else if (a === 'editar') editar({ id });
      else if (a === 'comentar') comentar(id);
      else if (a === 'quitar') quitar(id);
      else if (a === 'restaurar') cambio(() => { delete encontrar(id).item.quitado; });
      else if (a === 'subir' || a === 'bajar') mover(id, a === 'subir' ? -1 : 1);
      else if (a === 'agregar') { const f = encontrar(id); editar({ nuevo: true, lista: f.lista, despuesDe: id, clase: f.clase, e: f.e, t: f.t, padre: f.padre }); }
      else if (a === 'agregar-final') { const l = listaDe(b.dataset.lista); editar({ nuevo: true, lista: l.lista, despuesDe: null, clase: 'paso', e: l.e, t: l.t }); }
      else if (a === 'agregar-pm') { const f = encontrar(b.dataset.padre || id); if (!f.item.pm) f.item.pm = []; editar({ nuevo: true, lista: f.item.pm, despuesDe: null, clase: 'pm', e: f.e, t: f.t, padre: f.item }); }
      else if (a === 'agregar-equipo') agregarEquipo(b.dataset.est);
    });
    function deshacerUno() { const s = deshacer.pop(); if (!s) return; W = s.W; SOL = s.SOL; sucio = true; guardarLocal(); pintarTodo(); }
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !document.querySelector('.pp-modal-fondo') && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); deshacerUno(); } });
    window.addEventListener('beforeunload', (e) => { if (sucio) { e.preventDefault(); e.returnValue = ''; } });
    function descargar(texto, nombre) {
      const u = URL.createObjectURL(new Blob([texto], { type: 'text/html;charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 15000);
    }
    function guardar() {
      if (!solicitudCompleta()) { abrirSolicitud(true); return; }
      const n = contar();
      if (n.errores && !confirm(`Hay ${n.errores} cosa(s) por corregir (marcadas con ✕). ¿Guardar el borrador igual?`)) return;
      const d = new Date(), r = PQ.rmd, prop = { formato: 1, tipo: 'borrador-rmd', base: { mdId: r.mdId, codigo: r.codigo, version: r.version, huella: PQ.huella }, guardado: d.toISOString(), solicitud: SOL, trabajo: W,
        resumen: { cambios: n.total, nuevos: n.nuevos, errores: n.errores, avisos: n.avisos } };
      const json = JSON.stringify(prop).replace(/</g, '\\u003c');
      const html = ORIGINAL.replace(/(<script id="rmd-(?:borrador|propuesta)" type="application\/json">)[\s\S]*?(<\/script>)/, (m0, a, b) => a + json + b);
      descargar(html, `Borrador RMD ${r.codigo} v${r.version} ${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}.html`);
      sucio = false; try { localStorage.removeItem(CLAVE()); } catch (e) { /* nada */ } pintarTodo(); aviso('Se descargó el borrador. Envía ese archivo al equipo RMD (también puedes volver a abrirlo para seguir editando).');
      window.__ppUltimo = { prop, html };                                                // (pruebas)
    }
    function aviso(t) { const x = document.createElement('div'); x.className = 'pp-toast'; x.textContent = t; document.body.appendChild(x); setTimeout(() => x.remove(), 6000); }
    window.addEventListener('beforeprint', () => { const s = $('.pp-solo-impresion'); if (s) s.innerHTML = htmlImpresion(); });
    window.__pp = { estado: () => ({ W, SOL, CMB, AV: [...AV.entries()], contar: contar() }), editar, quitar, mover, comentar, guardar, encontrar, buscador: () => BUS, irA };   // (pruebas)
    iniciar();
  }
  // Estilos del archivo de la plantilla. La hoja copia el PDF del RMD (pdfMake, Roboto 9 pt, bordes finos, encabezado de 8 columnas);
  // en pantalla se agranda (1 pt ≈ 1,4 px) y los botones de edición quedan en el margen derecho, fuera de la hoja.
  const PP_EDITOR_CSS = `
:root { --tx: #1f2328; --ap: #59636e; --bd: #c9ced4; --bd2: #e3e6ea; --fondo: #e9ebee; --hoja: #fff; --linea: #444; --acento: #0a66c2; --agr: #1a7f37; --agr-f: #e6f4ea; --qui: #b42318; --qui-f: #fdecea;
  --cam: #9a6700; --cam-f: #fff4d6; --mov: #2f5fb3; --mov-f: #e8effb; --crea: #7a3fbf; --crea-f: #f3ebfc; color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--fondo); color: var(--tx); font: 13px/1.45 "Segoe UI", Roboto, Arial, sans-serif; }
button { font: inherit; cursor: pointer; } button:disabled { cursor: default; opacity: .45; }
.pp-cargando { margin: 80px auto; max-width: 520px; padding: 24px; background: var(--hoja); border: 1px solid var(--bd); border-radius: 8px; text-align: center; font-size: 15px; } .pp-cargando.error { color: var(--qui); }
/* barra y panel */
.pp-barra { position: sticky; top: 0; z-index: 20; display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 10px 18px; background: #fff; border-bottom: 1px solid var(--bd); box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.pp-titulo b { display: block; font-size: 15px; } .pp-titulo span { color: var(--ap); }
.pp-botones { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.pp-botones button { height: 32px; padding: 0 14px; border: 1px solid var(--bd); border-radius: 6px; background: #fff; color: var(--tx); }
.pp-botones button:hover:not(:disabled) { border-color: var(--acento); color: var(--acento); }
.pp-botones button.primario { background: var(--acento); border-color: var(--acento); color: #fff; font-weight: 600; } .pp-botones button.primario:hover { filter: brightness(1.08); color: #fff; }
.pp-botones button.falta { border-color: var(--cam); color: var(--cam); } .pp-sucio { color: var(--cam); font-weight: 600; font-size: 12px; }
.pp-resumen { grid-column: 1 / -1; color: var(--ap); font-size: 12.5px; } .pp-resumen .crea { color: var(--crea); } .pp-resumen .err { color: var(--qui); } .pp-resumen .avi { color: var(--cam); } .pp-ayuda-corta { color: #8a929b; }
.pp-cuerpo { display: grid; grid-template-columns: auto 320px; gap: 16px; justify-content: center; margin: 16px auto; padding: 0 16px; align-items: start; }
.pp-panel { position: sticky; top: 92px; max-height: calc(100vh - 110px); display: flex; flex-direction: column; background: #fff; border: 1px solid var(--bd); border-radius: 8px; overflow: hidden; }
.pp-panel-cab { padding: 12px 14px 8px; border-bottom: 1px solid var(--bd2); } .pp-chips { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.pp-chips button { padding: 3px 10px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; font-size: 12px; } .pp-chips button.activo { background: var(--acento); border-color: var(--acento); color: #fff; }
.pp-panel-lista { overflow: auto; padding: 6px 8px 12px; }
.pp-cmb { display: block; width: 100%; margin: 3px 0; padding: 7px 9px; border: 1px solid transparent; border-left: 3px solid var(--bd); border-radius: 4px; background: #fafbfc; text-align: left; color: var(--tx); font-size: 12.5px; }
.pp-cmb:hover { border-color: var(--bd); } .pp-cmb span { color: var(--ap); } .pp-cmb-n { font-weight: 600; color: var(--tx) !important; }
.pp-cmb.agregar { border-left-color: var(--agr); } .pp-cmb.quitar { border-left-color: var(--qui); } .pp-cmb.cambiar, .pp-cmb.valores { border-left-color: var(--cam); } .pp-cmb.mover { border-left-color: var(--mov); } .pp-cmb.comentario { border-left-color: var(--ap); }
.pp-cmb-av { display: block; margin-top: 3px; } .pp-cmb-av.error { color: var(--qui) !important; } .pp-cmb-av.aviso { color: var(--cam) !important; }
/* la hoja (como el PDF) */
.pp-doc { background: var(--hoja); border: 1px solid var(--bd); box-shadow: 0 1px 6px rgba(0,0,0,.08); padding: 26px 160px 40px 30px; }
.pp-pagina { width: 760px; border-collapse: collapse; } .pp-pagina > thead > tr > td, .pp-pagina > tbody > tr > td { padding: 0; vertical-align: top; }
.pp-pagina, .pp-pagina table { font-family: Roboto, "Segoe UI", Arial, sans-serif; color: #000; }
.pp-enc { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 14px; font-size: 12.5px; font-weight: 700; color: #000; }
.pp-enc td { border: 1px solid var(--linea); padding: 3px 6px; vertical-align: middle; overflow-wrap: anywhere; }
.pp-enc .logo { border-bottom: 0; height: 40px; padding: 4px 8px 0; } .pp-enc .logo img { height: 32px; display: block; } .pp-logo-tx { color: #c8102e; font-style: italic; font-size: 17px; }
.pp-enc .rm { border-top: 0; } .pp-enc .g { font-size: 14px; } .pp-enc .c { text-align: center; } .pp-enc .desc { padding: 18px 8px; }
.pp-enc .et { border-right: 0; text-align: left; } .pp-enc .va { border-left: 0; text-align: center; } .pp-enc .a { border-bottom: 0; } .pp-enc .m { border-top: 0; border-bottom: 0; } .pp-enc .z { border-top: 0; }
.pp-enc .dato { padding: 10px 6px; }
.pp-hoja { font-size: 12px; }
.pp-t { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4px 0 12px; font-size: 12px; color: #000; }
.pp-t td, .pp-t th { padding: 3px 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
.pp-val td { border: 1px solid var(--linea); padding: 4px 6px; }
.pp-sub { margin: 16px 0 6px; font-size: 13.5px; font-weight: 700; }
.pp-nota-der { text-align: right; font-size: 12px; margin: 2px 0; } .pp-nota-der.fila { margin-top: -2px; }
.pp-grid td, .pp-grid th { border: 1px solid var(--linea); } .pp-th th { font-weight: 700; text-align: center; font-size: 13px; } .pp-grid td.c { text-align: center; } .pp-grid td.d { text-align: right; }
.pp-ico-check { width: 17px; height: 17px; vertical-align: middle; }
.pp-ins th, .pp-ins td { padding: 3px 3px; } .pp-ins .pp-th th { font-size: 11.5px; }
.pp-cuadro { border: 1px solid var(--linea); } .pp-cuadro td { border: 0; } .pp-c-guion { text-align: center; }
.pp-ver td { border: 1px solid var(--linea) !important; font-weight: 700; font-size: 13px; padding: 10px 6px 6px !important; }
.pp-etq-cab { width: 100%; border-collapse: collapse; margin: 12px 0 2px; } .pp-etq-tit { font-size: 15px; font-weight: 400; padding: 6px 0; } .pp-etq-cab .pp-nota-der { vertical-align: middle; }
.pp-proc { border: 0; border-right: 1px solid var(--linea); border-bottom: 1px solid var(--linea); } .pp-proc tr.pp-paso > td { border-top: 1px solid var(--linea); } .pp-proc tr.pp-paso:first-child > td { border-top: 0; }
.pp-c-num { white-space: nowrap; } .pp-c-pm { padding-left: 2px !important; color: #222; } .pp-c-pm.tab { padding-left: 22px !important; } .pp-c-cant { white-space: nowrap; }
.pp-caja { display: block; height: 20px; border: 1px solid var(--linea); margin: 2px 0; } .pp-c-chk { text-align: right; } .pp-check { display: inline-block; width: 18px; height: 18px; border: 1px solid var(--linea); margin: 2px 0; vertical-align: top; }
.pp-mini { border-collapse: collapse; width: 100%; font-size: 10.5px; } .pp-mini th, .pp-mini td { border: 1px solid var(--linea); text-align: center; padding: 1px 2px; height: 15px; font-weight: 700; }
.pp-esp .pp-grupo td { font-weight: 700; border-bottom: 0; } .pp-esp tr:not(.pp-grupo):not(.pp-th):not(.pp-ver) td { border-top: 0; border-bottom: 0; }
.pp-firmas2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .pp-firma td { height: 22px; } .pp-vacio { color: var(--ap); font-style: italic; }
.pp-com-tit { border: 0; background: none; opacity: .2; padding: 0 4px; font-size: 12px; } .pp-sub:hover .pp-com-tit, .pp-etq-tit:hover .pp-com-tit, .pp-com-tit:focus-visible { opacity: 1; }
/* marcas del borrador */
.pp-tx { white-space: pre-wrap; } .pp-rango { color: var(--ap); font-size: 11px; white-space: nowrap; }
.pp-tags { display: inline-flex; flex-wrap: wrap; gap: 3px; margin-left: 6px; vertical-align: 1px; }
.pp-tag { padding: 0 6px; border-radius: 8px; font: 600 10.5px/16px "Segoe UI", Arial, sans-serif; white-space: nowrap; }
.pp-tag.agr { background: var(--agr-f); color: var(--agr); } .pp-tag.qui { background: var(--qui-f); color: var(--qui); } .pp-tag.cam { background: var(--cam-f); color: var(--cam); } .pp-tag.mov { background: var(--mov-f); color: var(--mov); }
.pp-tag.crea { background: var(--crea-f); color: var(--crea); } .pp-tag.ok { background: #eef1f4; color: var(--ap); font-weight: 500; }
tr.agr > td { background: var(--agr-f); } tr.cam > td { background: var(--cam-f); } tr.qui > td { background: var(--qui-f); } tr.qui .pp-tx, tr.qui td.c { text-decoration: line-through; color: var(--qui); }
tr.mov > td:first-child { box-shadow: inset 3px 0 0 var(--mov); }
.pp-antes { font-size: 11px; color: var(--ap); text-decoration: line-through; margin-top: 1px; }
.pp-aviso { font: 11.5px/1.35 "Segoe UI", Arial, sans-serif; margin-top: 2px; } .pp-aviso.error { color: var(--qui); } .pp-aviso.aviso { color: var(--cam); } .pp-aviso.info { color: var(--crea); }
.pp-coment { margin-top: 3px; padding: 2px 7px; background: #f3f5f7; border-radius: 4px; font: 11.5px/1.4 "Segoe UI", Arial, sans-serif; color: #3a4048; }
.pp-sub > .pp-coment, .pp-est > .pp-coment, .pp-etq > .pp-coment { margin: 0 0 6px; }
/* botones de edición: en el margen, a la derecha de la hoja */
td.ult { position: relative; }
.pp-acc { position: absolute; left: calc(100% + 10px); top: 1px; display: inline-flex; gap: 2px; opacity: 0; transition: opacity .12s; white-space: nowrap; }
.pp-t tr:hover > td > .pp-acc, .pp-acc:focus-within, .pp-t tr.qui > td > .pp-acc { opacity: 1; }
.pp-acc button { min-width: 24px; height: 23px; padding: 0 4px; border: 1px solid var(--bd); border-radius: 4px; background: #fff; color: var(--tx); font: 12px/1 "Segoe UI", Arial, sans-serif; }
.pp-acc button:hover { border-color: var(--acento); color: var(--acento); } .pp-acc button.ancho { font-size: 10.5px; font-weight: 600; }
.pp-mas { margin: -6px 0 10px; padding: 2px 9px; border: 1px dashed var(--bd); border-radius: 4px; background: none; color: var(--acento); font: 12px "Segoe UI", Arial, sans-serif; }
.pp-nota { color: var(--ap); font: 12px "Segoe UI", Arial, sans-serif; margin: 4px 0; }
.pp-destello { animation: pp-destello 1.6s ease-out; } @keyframes pp-destello { 0% { outline: 3px solid var(--acento); outline-offset: 1px; } 100% { outline: 3px solid transparent; outline-offset: 1px; } }
/* modales */
.pp-modal-fondo { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center; padding: 6vh 16px; background: rgba(20, 24, 28, .38); }
.pp-modal { width: min(760px, 100%); max-height: 88vh; overflow: auto; padding: 18px 20px 14px; background: #fff; border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.25); }
.pp-modal h3 { margin: 0 0 12px; font-size: 16px; } .pp-modal h3 span { display: block; margin-top: 2px; font-size: 12.5px; font-weight: 400; color: var(--ap); }
.pp-campo { display: block; margin: 10px 0; font-weight: 600; font-size: 12.5px; } .pp-campo textarea, .pp-campo input { display: block; width: 100%; margin-top: 4px; padding: 7px 9px; border: 1px solid var(--bd); border-radius: 6px; font: 13px/1.45 "Segoe UI", Roboto, Arial, sans-serif; font-weight: 400; }
.pp-campo textarea:focus, .pp-campo input:focus, .pp-rango-ed input:focus { outline: 2px solid var(--acento); outline-offset: -1px; border-color: var(--acento); } .pp-campo .falta { border-color: var(--qui); }
.pp-estado { min-height: 20px; font-size: 12.5px; } .pp-estado .ok { color: var(--agr); } .pp-estado .crea { color: var(--crea); font-weight: 600; } .pp-estado .err { color: var(--qui); } .pp-estado .avi { color: var(--cam); }
.pp-sug { margin: 8px 0; } .pp-sug-tit { font-size: 12px; color: var(--ap); margin: 6px 0 4px; }
.pp-sug-it { display: flex; gap: 8px; align-items: baseline; width: 100%; margin: 2px 0; padding: 6px 8px; border: 1px solid var(--bd2); border-radius: 6px; background: #fff; text-align: left; color: var(--tx); font-size: 12.5px; }
.pp-sug-it:hover { border-color: var(--acento); } .pp-sug-it.igual { border-color: var(--agr); background: var(--agr-f); } .pp-sug-it.elegido { outline: 2px solid var(--agr); }
.pp-sug-it .pct { flex: 0 0 46px; color: var(--ap); font-size: 11.5px; } .pp-sug-it .cod { flex: 0 0 64px; font-weight: 600; } .pp-sug-it .tx { flex: 1 1 auto; } .pp-sug-it .otra { flex: 0 0 auto; color: var(--cam); font-size: 11px; }
.pp-rango-ed { display: flex; gap: 10px; flex-wrap: wrap; margin: 6px 0; font-size: 12.5px; font-weight: 600; } .pp-rango-ed input { display: block; width: 120px; margin-top: 3px; padding: 5px 8px; border: 1px solid var(--bd); border-radius: 6px; font: inherit; font-weight: 400; }
.pp-pie { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--bd2); }
.pp-pie button { height: 32px; padding: 0 16px; border: 1px solid var(--bd); border-radius: 6px; background: #fff; } .pp-pie button.primario { background: var(--acento); border-color: var(--acento); color: #fff; font-weight: 600; }
.pp-toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 60; max-width: min(640px, 92vw); padding: 10px 16px; background: #1f2328; color: #fff; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
.pp-recuperar { position: fixed; left: 50%; top: 96px; transform: translateX(-50%); z-index: 40; padding: 10px 14px; background: var(--cam-f); border: 1px solid var(--cam); border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,.12); }
.pp-recuperar button { margin-left: 8px; padding: 3px 10px; border: 1px solid var(--cam); border-radius: 5px; background: #fff; }
.pp-tabla { width: 100%; border-collapse: collapse; margin: 6px 0; } .pp-tabla th, .pp-tabla td { border: 1px solid var(--bd); padding: 4px 8px; text-align: left; vertical-align: top; } .pp-tabla th { background: #f6f8fa; }
.pp-solo-impresion { display: none; } .pp-firmas { width: 100%; margin-top: 28px; border-collapse: collapse; } .pp-firmas td { width: 33%; height: 70px; border: 1px solid #000; vertical-align: bottom; padding: 6px; font-size: 12px; }
@media (max-width: 1340px) { .pp-cuerpo { grid-template-columns: 1fr; } .pp-panel { position: static; max-height: none; } .pp-doc { justify-self: center; } }
@media print {
  @page { size: A4; margin: 10mm 9mm 12mm; }
  html, body { background: #fff; } .pp-barra, .pp-panel, .pp-acc, .pp-mas, .pp-com-tit, .pp-recuperar, .pp-toast, .pp-pantalla { display: none !important; }
  .pp-cuerpo { display: block; margin: 0; padding: 0; } .pp-doc { border: 0; box-shadow: none; padding: 0; } .pp-pagina { width: 100%; }
  .pp-enc { font-size: 9pt; } .pp-enc .g { font-size: 11pt; } .pp-hoja, .pp-t { font-size: 9pt; } .pp-sub { font-size: 10pt; } .pp-etq-tit { font-size: 11pt; } .pp-th th, .pp-ver td { font-size: 10pt; }
  .pp-solo-impresion { display: block; break-before: page; } tr { break-inside: avoid; }
  tr.agr > td, tr.cam > td, tr.qui > td, .pp-tag { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
  // ---- Plantilla para Producción: del portal al archivo y de vuelta (v1.40; v1.41: «Borrador de Producción») ----
  // 1) «Plantilla para Producción»: lee el RMD (las mismas 8 listas que usa el portal para su PDF, más la trazabilidad y el logo del
  //    encabezado) y el catálogo de pasos, equipos y utensilios de SAP, y descarga un .html que se abre en cualquier Chrome / Edge, sin
  //    SAP ni internet. Producción deja ahí su borrador de cambios (sobre una hoja igual al PDF) y devuelve el archivo.
  // 2) «Importar borrador de Producción»: solo se importa en un RMD **Ingresado** (el mismo de la plantilla si sigue Ingresado, o la
  //    versión Ingresada más nueva del mismo master; si no hay ninguna, no se importa). Revisa si el RMD cambió desde la plantilla,
  //    vuelve a buscar en SAP los pasos nuevos (por si ya se crearon) y muestra el plan de cambios con sus avisos y su Excel. No escribe.
  const PPN = ppNucleo();
  const PP = { cat: null, catT: 0 };
  const PP_TTL_CATALOGO = 12 * 3600000;
  const ppLimpio = (t) => String(t == null ? '' : t).replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const ppNulo = (v) => (v == null || v === '' ? null : v);
  // Recién cargada la página, durante unos segundos el portal no responde las lecturas (se pierden sin respuesta). Antes de empezar se
  // prueba una lectura corta (hasta 4 intentos de 8 s); si el portal sigue sin responder, se avisa en vez de quedarse esperando.
  async function ppModeloListo(modelo) {
    for (let i = 0; i < 4; i++) {
      const ok = await Promise.race([new Promise((r) => modelo.read('/ESTRUCTURA', { urlParameters: { $top: '1', $select: 'estructuraId' }, success: () => r(true), error: () => r(true) })), new Promise((r) => setTimeout(() => r(false), 8000))]);
      if (ok) return;
    }
    throw new Error('el portal no está respondiendo las lecturas; recarga la página (F5) y vuelve a intentarlo');
  }
  async function ppLeerArbol(modelo, md) {
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, f = [new F('mdId_mdId', 'EQ', md.mdId)];
    const L = (ent, exp, ord) => leerTodoDe(modelo, ent, f, { ...(exp ? { $expand: exp } : {}), $orderby: ord });
    const [estr, etqs, pasos, pms, equipos, utens, insumos, espec, recetas] = await Promise.all([
      L('MD_ESTRUCTURA', 'estructuraId', 'mdEstructuraId'), L('MD_ES_ETIQUETA', 'etiquetaId', 'mdEsEtiquetaId'), L('MD_ES_PASO', 'pasoId', 'mdEstructuraPasoId'),
      L('MD_ES_PASO_INSUMO_PASO', 'pasoHijoId', 'mdEstructuraPasoInsumoPasoId'), L('MD_ES_EQUIPO', 'equipoId', 'mdEstructuraEquipoId'), L('MD_ES_UTENSILIO', 'utensilioId,agrupadorId', 'mdEstructuraUtensilioId'),
      L('MD_ES_RE_INSUMO', '', 'estructuraRecetaInsumoId'), L('MD_ES_ESPECIFICACION', 'ensayoPadreId', 'mdEstructuraEspecificacionId'), L('MD_RECETA', 'recetaId', 'mdRecetaId')]);
    const act = (x) => x && x.activo !== false, orden = (a, b) => (+a.orden || 0) - (+b.orden || 0);
    const E = new Map(estr.filter(act).map((e) => [e.mdEstructuraId, { id: e.mdEstructuraId, estructuraId: e.estructuraId_estructuraId, nombre: ppLimpio(e.estructuraId && e.estructuraId.descripcion), tipo: e.estructuraId ? e.estructuraId.tipoEstructuraId_iMaestraId : null, numeracion: !!(e.estructuraId && e.estructuraId.numeracion), verificadoPor: !!(e.estructuraId && e.estructuraId.verificadoPor), orden: e.orden, etiquetas: [], pasos: [], equipos: [], utensilios: [], insumos: [], espec: [] }]));
    const T = new Map();
    etqs.filter(act).forEach((t) => { const e = E.get(t.mdEstructuraId_mdEstructuraId); if (!e) return; const x = { id: t.mdEsEtiquetaId, etiquetaId: t.etiquetaId_etiquetaId, nombre: ppLimpio(t.etiquetaId && t.etiquetaId.descripcion), orden: t.orden, conforme: !!t.conforme, procesoMenor: !!t.procesoMenor, pasos: [] }; T.set(x.id, x); e.etiquetas.push(x); });
    const P = new Map();
    pasos.filter(act).sort(orden).forEach((p) => {
      const c = p.pasoId || {}, x = { id: p.mdEstructuraPasoId, pasoId: p.pasoId_pasoId, codigo: c.codigo != null ? String(c.codigo) : null, texto: ppLimpio(c.descripcion), orden: p.orden, tipo: p.tipoDatoId_iMaestraId,
        vi: ppNulo(p.valorInicial), vf: ppNulo(p.valorFinal), margen: ppNulo(p.margen), depende: ppNulo(p.depende), rpor: !!p.rpor, vb: !!p.vb, edit: !!p.edit, formato: !!p.formato, colorHex: ppNulo(p.colorHex), etqCat: c.etiquetaId_etiquetaId || null, pm: [] };
      P.set(x.id, x); const t = p.mdEsEtiquetaId_mdEsEtiquetaId && T.get(p.mdEsEtiquetaId_mdEsEtiquetaId), e = E.get(p.mdEstructuraId_mdEstructuraId);
      if (t) t.pasos.push(x); else if (e) e.pasos.push(x);
    });
    pms.filter(act).sort(orden).forEach((m) => {
      const padre = P.get(m.pasoId_mdEstructuraPasoId); if (!padre) return; const c = m.pasoHijoId || {}, insumo = !!(m.estructuraRecetaInsumoId_estructuraRecetaInsumoId || m.Component);
      padre.pm.push({ id: m.mdEstructuraPasoInsumoPasoId, pasoId: m.pasoHijoId_pasoId, codigo: c.codigo != null ? String(c.codigo) : null, texto: ppLimpio(c.descripcion || m.Maktx), orden: m.orden, tipo: m.tipoDatoId_iMaestraId,
        vi: ppNulo(m.valorInicial), vf: ppNulo(m.valorFinal), margen: ppNulo(m.margen), insumo, comp: ppNulo(m.Component), mat: ppLimpio(m.Maktx), cant: ppNulo(m.cantidadInsumo), um: ppNulo(m.CompUnit), edit: !!m.edit, tab: !!m.tab, formato: !!m.formato, colorHex: ppNulo(m.colorHex), etqCat: c.etiquetaId_etiquetaId || null });
    });
    equipos.filter(act).sort(orden).forEach((q) => { const e = E.get(q.mdEstructuraId_mdEstructuraId), c = q.equipoId || {}; if (e) e.equipos.push({ id: q.mdEstructuraEquipoId, equipoId: q.equipoId_equipoId, codigo: ppLimpio(c.equnr), ref: ppLimpio(c.CodigoGaci), desc: ppLimpio(c.eqktx), orden: q.orden }); });
    utens.filter(act).sort(orden).forEach((u) => { const e = E.get(u.mdEstructuraId_mdEstructuraId), c = u.utensilioId || {}, g = u.agrupadorId || {}; if (e) e.utensilios.push({ id: u.mdEstructuraUtensilioId, utensilioId: u.utensilioId_utensilioId || null, agrupadorId: u.agrupadorId_clasificacionUtensilioId || null, codigo: ppLimpio(c.codigo), desc: ppLimpio(c.descripcion || g.descripcion), orden: u.orden }); });
    const recPorId = new Map(recetas.filter(act).map((r) => [r.mdRecetaId, r.recetaId ? `${norm(r.recetaId.Matnr)} / ${norm(r.recetaId.Verid)}` : ''])), recMat = new Map(recetas.filter(act).map((r) => [r.mdRecetaId, r.recetaId ? norm(r.recetaId.Matnr) : '']));
    insumos.filter(act).sort((a, b) => (+a.ItemNo || 0) - (+b.ItemNo || 0)).forEach((i) => { const e = E.get(i.mdEstructuraId_mdEstructuraId); if (e) e.insumos.push({ receta: recPorId.get(i.mdRecetaId_mdRecetaId) || '', matnr: recMat.get(i.mdRecetaId_mdRecetaId) || '', comp: ppLimpio(i.Component), desc: ppLimpio(i.Maktx), txtadic: ppLimpio(i.Txtadic), aiPrio: ppNulo(i.AiPrio), cant: ppNulo(i.CompQty), um: ppNulo(i.CompUnit) }); });
    espec.filter(act).sort((a, b) => (+a.Merknr || +a.orden || 0) - (+b.Merknr || +b.orden || 0)).forEach((s) => { const e = E.get(s.mdEstructuraId_mdEstructuraId); if (e) e.espec.push({ id: s.mdEstructuraEspecificacionId, ensayo: ppLimpio(s.ensayoHijo), padre: ppLimpio(s.ensayoPadreSAP), grupoId: s.ensayoPadreId_iMaestraId == null ? null : s.ensayoPadreId_iMaestraId, grupo: ppLimpio(s.ensayoPadreId && s.ensayoPadreId.contenido) || ppLimpio(s.ensayoPadreSAP), especificacion: ppLimpio(s.especificacion), vi: ppNulo(s.valorInicial), vf: ppNulo(s.valorFinal), orden: s.orden }); });
    const out = { estructuras: [...E.values()].sort(orden) };
    out.estructuras.forEach((e) => e.etiquetas.sort(orden));
    return out;
  }
  // Catálogo de SAP para buscar duplicados y agregar equipos (se guarda en este navegador 12 h; ~16 s leerlo)
  async function ppCatalogo(modelo, forzar, avisar) {
    if (!forzar && PP.cat && Date.now() - PP.catT < PP_TTL_CATALOGO) return PP.cat;
    if (!forzar) { try { const c = await Almacen.leer('ppCatalogo'); if (c && c.t && Date.now() - c.t < PP_TTL_CATALOGO && c.v === 1) { PP.cat = c; PP.catT = c.t; return c; } } catch (e) { /* se lee de SAP */ } }
    avisar('Leyendo el catálogo de pasos de SAP…');
    const [pasos, estructuras, etiquetas, equipos, utensilios, agrupadores, maestra] = await Promise.all([
      leerEntidadCompleta(modelo, 'PASO', { $select: 'pasoId,codigo,descripcion,estructuraId_estructuraId,etiquetaId_etiquetaId,estadoId_iMaestraId,tipoDatoId_iMaestraId,activo' }, 'pasoId', (h, n) => avisar(`Leyendo el catálogo de pasos de SAP… ${h} de ${n}`)),
      leerTodoDe(modelo, 'ESTRUCTURA', [], { $select: 'estructuraId,descripcion', $orderby: 'estructuraId' }), leerTodoDe(modelo, 'ETIQUETA', [], { $select: 'etiquetaId,descripcion', $orderby: 'etiquetaId' }),
      leerEntidadCompleta(modelo, 'EQUIPO', { $select: 'equipoId,equnr,eqktx,CodigoGaci,activo' }, 'equipoId'),
      leerTodoDe(modelo, 'UTENSILIO', [], { $select: 'utensilioId,codigo,descripcion,estadoId_iMaestraId,activo', $orderby: 'utensilioId' }),
      leerTodoDe(modelo, 'UTENSILIO_CLASIFICACION', [], { $select: 'clasificacionUtensilioId,descripcion,activo', $orderby: 'clasificacionUtensilioId' }),
      leerTodoDe(modelo, 'MAESTRA', [], { $select: 'iMaestraId,contenido', $orderby: 'iMaestraId' }).catch(() => [])]);
    const c = { v: 1, t: Date.now(),
      pasos: pasos.filter((p) => p.activo !== false && +p.estadoId_iMaestraId !== 1 && norm(p.descripcion)).map((p) => [String(p.codigo), p.estructuraId_estructuraId || '', p.etiquetaId_etiquetaId || '', p.tipoDatoId_iMaestraId == null ? '' : p.tipoDatoId_iMaestraId, ppLimpio(p.descripcion)]),
      estructuras: estructuras.map((x) => [x.estructuraId, ppLimpio(x.descripcion)]), etiquetas: etiquetas.map((x) => [x.etiquetaId, ppLimpio(x.descripcion)]),
      equipos: equipos.filter((x) => x.activo !== false && (x.equnr || x.eqktx)).map((x) => [x.equipoId, ppLimpio(x.equnr), ppLimpio(x.CodigoGaci), ppLimpio(x.eqktx)]),
      utensilios: utensilios.filter((x) => x.activo !== false && +x.estadoId_iMaestraId !== 1).map((x) => [x.utensilioId, ppLimpio(x.codigo), ppLimpio(x.descripcion)]),
      agrupadores: agrupadores.filter((x) => x.activo !== false).map((x) => [x.clasificacionUtensilioId, ppLimpio(x.descripcion)]),
      tipos: Object.fromEntries(maestra.filter((x) => x.iMaestraId >= 430 && x.iMaestraId <= 460).map((x) => [x.iMaestraId, ppLimpio(x.contenido)])) };
    PP.cat = c; PP.catT = c.t; try { await Almacen.guardar('ppCatalogo', c); } catch (e) { /* sin almacenamiento: se vuelve a leer la próxima vez */ }
    return c;
  }
  // El paquete que viaja en el archivo: el RMD, los nombres y el catálogo empacado (solo los pasos de las estructuras del RMD)
  function ppPaquete(md, arbol, cat, usuario, extra = {}) {
    const estrRmd = new Set(arbol.estructuras.map((e) => e.estructuraId)), pasos = cat.pasos.filter((p) => estrRmd.has(p[1]));
    const iE = new Map(), iT = new Map(), estr = [], etq = [];
    const idxE = (id) => { if (!iE.has(id)) { iE.set(id, estr.length); estr.push([id, (cat.estructuras.find((x) => x[0] === id) || [])[1] || '']); } return iE.get(id); };
    const nomT = new Map(cat.etiquetas);
    const idxT = (id) => { if (!id) return ''; if (!iT.has(id)) { iT.set(id, etq.length); etq.push([id, nomT.get(id) || '']); } return iT.get(id); };
    arbol.estructuras.forEach((e) => { idxE(e.estructuraId); e.etiquetas.forEach((t) => idxT(t.etiquetaId)); [e.pasos, ...e.etiquetas.map((t) => t.pasos)].forEach((l) => l.forEach((p) => { if (p.etqCat) idxT(p.etqCat); })); });
    const lineas = pasos.map((p) => [p[0], idxE(p[1]), idxT(p[2]), p[3], p[4]].join('\t')).join('\n');
    return { formato: 1, tipo: 'plantilla-rmd', generado: new Date().toISOString(), por: usuario || '', script: VERSION,
      rmd: { mdId: md.mdId, codigo: String(md.codigo), version: md.version, descripcion: norm(md.descripcion), etapa: norm(md.nivelTxt), area: norm(md.areaRmdTxt), planta: norm(md.sucursalId && md.sucursalId.contenido), estado: md.estado || norm(md.estadoIdRmd && md.estadoIdRmd.contenido), observacion: md.observacion || '', rptaValidacion: norm(md.rptaValidacion), principal: md.codigoversionprincipal || String(md.codigo), estadoFechaPor: extra.estadoFechaPor || '', logo: extra.logo || null },
      tipos: cat.tipos || {}, arbol, huella: PPN.huella(arbol),
      catalogo: { estr, etq, pasos: lineas, equipos: cat.equipos.map((x) => x.join('\t')).join('\n'), utensilios: cat.utensilios.map((x) => x.join('\t')).join('\n'), agrupadores: cat.agrupadores } };
  }
  // «Estado / Fecha / Por» como el PDF: Autorizado → fecha y usuario de la autorización; los demás → la última trazabilidad
  async function ppEstadoFechaPor(modelo, md) {
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, f = (t) => { const d = t ? new Date(t) : null; return d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''; };
    let fecha = '', por = '';
    if (+md.estadoIdRmd_iMaestraId === 465) { fecha = f(md.fechaAutorizacion); por = norm(md.usuarioAutorizacion); }
    else { const tr = (await leerTodoDe(modelo, 'MD_TRAZABILIDAD', [new F('mdId_mdId', 'EQ', md.mdId)], { $orderby: 'idTrazabilidad' }).catch(() => [])).filter((x) => x.activo !== false).sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
      if (tr[0]) { fecha = f(tr[0].fechaRegistro); por = norm(tr[0].usuarioRegistro); } }
    return `${md.estado || ''}/ ${fecha} /${por}`;
  }
  // el logo del encabezado del PDF: está en el código del generador del portal (controller/table.js, «var E»)
  async function ppLogo() {
    if (PP.logo !== undefined) return PP.logo;
    try {
      const t = await (await fetch(sap.ui.require.toUrl('mif/rmd/configuracion/controller/table') + '.js')).text();
      const i0 = t.indexOf('var E="data:image'), i1 = i0 >= 0 ? t.indexOf('"', i0 + 7) : -1;
      PP.logo = i0 >= 0 && i1 > i0 ? t.slice(i0 + 7, i1).replace(/\\\//g, '/') : null;
    } catch (e) { PP.logo = null; }
    return PP.logo;
  }
  async function ppEmpacar(obj) {
    const gz = await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    return aBase64(new Uint8Array(gz));
  }
  async function ppDesempacar(b64) {
    const bin = Uint8Array.from(atob(String(b64).trim()), (c) => c.charCodeAt(0));
    return JSON.parse(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  function ppHtml(b64, borrador, titulo) {
    const prop = borrador ? JSON.stringify(borrador).replace(/</g, '\\u003c') : 'null';
    return `<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="RMD mejoras ${VERSION}"><title>${esc(titulo)}</title><style>${PP_EDITOR_CSS}</style></head>\n<body><div id="app"></div>\n<script id="rmd-datos" type="application/octet-stream">${b64}</script>\n<script id="rmd-borrador" type="application/json">${prop}</script>\n<script>(${ppEditorApp.toString()})((${ppNucleo.toString()})());</script>\n</body></html>`;
  }
  async function ppGenerar(codigo, op = {}) {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'), avisar = op.avisar || (() => {});
    if (!modelo) throw new Error('abre la lista «Configuración Manufactura Digital»');
    avisar('Leyendo el RMD…'); await ppModeloListo(modelo);
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, c0 = String(codigo).trim();
    const md = (await leerTodoDe(modelo, 'MD', [new F('codigo', 'EQ', isNaN(+c0) ? c0 : +c0)], { $expand: 'estadoIdRmd,sucursalId', $orderby: 'mdId' })).sort((a, b) => b.version - a.version)[0];
    if (!md) throw new Error(`no se encontró el RMD ${codigo}`);
    md.estado = norm(md.estadoIdRmd && md.estadoIdRmd.contenido);
    const [arbol, cat, estadoFechaPor, logo] = await Promise.all([ppLeerArbol(modelo, md), ppCatalogo(modelo, !!op.forzar, avisar), ppEstadoFechaPor(modelo, md), ppLogo()]);
    // insumos: como el PDF, los de la receta por defecto del RMD (si la tiene)
    const def = norm(md.codDefectoReceta); if (def) arbol.estructuras.forEach((e) => { if (e.insumos.some((i) => i.matnr === def)) e.insumos = e.insumos.filter((i) => i.matnr === def); });
    avisar('Armando el archivo…');
    const paq = ppPaquete(md, arbol, cat, codigoUsuario(ctrl), { estadoFechaPor, logo }), b64 = await ppEmpacar(paq), d = new Date(), dd2 = (n) => String(n).padStart(2, '0');
    const nombre = `Plantilla RMD ${paq.rmd.codigo} v${paq.rmd.version} ${d.getFullYear()}-${dd2(d.getMonth() + 1)}-${dd2(d.getDate())}.html`;
    const html = ppHtml(b64, null, `Borrador RMD ${paq.rmd.codigo} v${paq.rmd.version} · ${paq.rmd.descripcion}`);
    const cuenta = (f) => arbol.estructuras.reduce((s, e) => s + f(e), 0);
    return { nombre, html, paquete: paq, resumen: { pasos: cuenta((e) => e.pasos.length + e.etiquetas.reduce((s, t) => s + t.pasos.length, 0)), pm: cuenta((e) => [e.pasos, ...e.etiquetas.map((t) => t.pasos)].reduce((s, l) => s + l.reduce((s2, p) => s2 + p.pm.length, 0), 0)), catalogo: paq.catalogo.pasos.split('\n').length, bytes: html.length } };
  }
  // ---- leer el archivo del borrador (el .html que devuelve Producción; también los de la v1.40, «propuesta») ----
  async function ppLeerBorrador(texto) {
    const m1 = /<script id="rmd-datos" type="application\/octet-stream">([\s\S]*?)<\/script>/.exec(texto), m2 = /<script id="rmd-(?:borrador|propuesta)" type="application\/json">([\s\S]*?)<\/script>/.exec(texto);
    if (!m1 || !m2) throw new Error('el archivo no es una plantilla de RMD (¿es el .html que generó «Plantilla para Producción»?)');
    const datos = await ppDesempacar(m1[1]); let prop = null; try { prop = JSON.parse(m2[1]); } catch (e) { prop = null; }
    if (!datos || datos.tipo !== 'plantilla-rmd') throw new Error('el archivo no trae una plantilla de RMD válida');
    if (!prop || !['borrador-rmd', 'propuesta-rmd'].includes(prop.tipo) || !prop.trabajo) throw new Error('la plantilla todavía no tiene un borrador guardado (Producción debe usar «Guardar borrador»)');
    if (!prop.base || prop.base.huella !== datos.huella) throw new Error('el borrador no corresponde a esta plantilla');
    return { datos, prop };
  }
  // Une filas de dos versiones del mismo master por estructura, etiqueta y código de paso (las versiones tienen filas nuevas)
  function ppMapear(base, otro) {
    const claves = (arbol) => {
      const m = new Map(), oc = new Map(), sig = (k) => { const n = (oc.get(k) || 0) + 1; oc.set(k, n); return `${k}#${n}`; };
      arbol.estructuras.forEach((e) => {
        const ke = sig('E' + e.estructuraId); m.set(ke, e.id);
        const lista = (l, pref) => l.forEach((p) => { const kp = sig(`${pref}|${p.codigo}`); m.set(kp, p.id); (p.pm || []).forEach((x) => m.set(sig(`${kp}|${x.codigo || x.comp}`), x.id)); });
        lista(e.pasos || [], ke); (e.etiquetas || []).forEach((t) => { const kt = sig(`${ke}|T${t.etiquetaId}`); m.set(kt, t.id); lista(t.pasos || [], kt); });
        (e.equipos || []).forEach((q) => m.set(sig(`${ke}|Q${q.equipoId}`), q.id)); (e.utensilios || []).forEach((u) => m.set(sig(`${ke}|U${u.utensilioId || u.agrupadorId}`), u.id));
      });
      return m;
    };
    const a = claves(base), b = claves(otro), out = new Map();
    a.forEach((id, k) => { if (b.has(k)) out.set(id, b.get(k)); });
    return out;
  }
  // Dónde se importa: solo en un RMD Ingresado (467): el de la plantilla si sigue Ingresado, o la versión Ingresada más nueva del mismo
  // master posterior a la de la plantilla; si no hay ninguna, no se importa.
  function ppDestino(versiones, base) {
    const ing = (m) => m && +m.estadoIdRmd_iMaestraId === 467;
    if (ing(base)) return base;
    return versiones.filter((m) => ing(m) && (+m.version > +base.version || (+m.version === +base.version && new Date(m.fechaRegistro) > new Date(base.fechaRegistro)))).sort((x, y) => (+y.version - +x.version) || (new Date(y.fechaRegistro) - new Date(x.fechaRegistro)))[0] || null;
  }
  async function ppAnalizar(datos, prop) {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2');
    if (!modelo) throw new Error('abre la lista «Configuración Manufactura Digital»');
    await ppModeloListo(modelo);
    const cat = { estructura: new Map(), etiqueta: new Map(datos.catalogo.etq), tipos: new Map(), estados: new Map() };
    const lin = await tzLinaje(modelo, datos.rmd.codigo, cat), base = lin.versiones.find((m) => m.mdId === datos.rmd.mdId) || lin.actual;
    const destino = ppDestino(lin.versiones, base);
    const filas = PPN.desempacarPasos(datos.catalogo), bus = PPN.crearBuscador(filas), etqNom = new Map(datos.catalogo.etq);
    const cambiosP = PPN.cambios(datos.arbol, prop.trabajo), avisosP = PPN.avisos(prop.trabajo, { buscador: bus, etiquetas: etqNom, base: datos.arbol.estructuras });
    let actual = null, enSap = [], mapa = null;
    if (destino) {
      actual = await ppLeerArbol(modelo, destino);
      if (destino.mdId === datos.rmd.mdId) { if (PPN.huella(actual) !== datos.huella) enSap = PPN.cambios(datos.arbol, actual); }
      else { mapa = ppMapear(datos.arbol, actual); enSap = PPN.cambios(datos.arbol, ppTraducir(actual, mapa)); }
    }
    // los pasos nuevos se vuelven a buscar en SAP como lo hace el portal (mismo texto, estructura y etiqueta), por si ya se crearon
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, FO = sap.ui.require('sap/ui/model/FilterOperator') || sap.ui.model.FilterOperator;
    const estrDe = new Map(), etqDe = new Map(); prop.trabajo.estructuras.forEach((e) => { estrDe.set(e.id, e.estructuraId); (e.etiquetas || []).forEach((t) => etqDe.set(t.id, t.etiquetaId)); });
    const nuevos = [];
    cambiosP.forEach((c) => { if ((c.accion === 'agregar' || c.accion === 'cambiar') && c.nuevo) nuevos.push({ c, texto: c.despues, estr: estrDe.get(c.estructura), etq: c.etiqueta ? etqDe.get(c.etiqueta) : null }); if (c.accion === 'agregar' && c.pm) c.pm.filter((m) => m.nuevo).forEach((m) => nuevos.push({ c, texto: m.texto, estr: estrDe.get(c.estructura), etq: null, pm: true })); });
    await Promise.all(nuevos.map(async (n) => {
      try {
        const fs = [new F('tolower(descripcion)', FO.EQ, "'" + n.texto.toLowerCase().replace(/'/g, "''") + "'"), new F('estructuraId_estructuraId', 'EQ', n.estr)]; if (n.etq) fs.push(new F('etiquetaId_etiquetaId', 'EQ', n.etq));
        const r = await leerTodoDe(modelo, 'PASO', fs, { $select: 'pasoId,codigo,descripcion,etiquetaId_etiquetaId,fechaRegistro' });
        n.existe = r.filter((x) => x.activo !== false).map((x) => String(x.codigo));
      } catch (e) { n.error = e.message; }
    }));
    const tocados = new Set(cambiosP.map((c) => c.id)), conflictos = enSap.filter((c) => tocados.has(c.id) || (c.padre && tocados.has(c.padre)));
    return { base, destino, actual, lin, cambios: cambiosP, avisos: avisosP, enSap, conflictos, nuevos, mapa, etqNom };
  }
  // reemplaza los ids de la otra versión por los de la base (para comparar)
  function ppTraducir(arbol, mapa) {
    const inv = new Map([...mapa.entries()].map(([a, b]) => [b, a])), t = (x) => ({ ...x, id: inv.get(x.id) || ('otra:' + x.id) });
    return { estructuras: arbol.estructuras.map((e) => ({ ...t(e), pasos: (e.pasos || []).map((p) => ({ ...t(p), pm: (p.pm || []).map(t) })), etiquetas: (e.etiquetas || []).map((x) => ({ ...t(x), pasos: (x.pasos || []).map((p) => ({ ...t(p), pm: (p.pm || []).map(t) })) })), equipos: (e.equipos || []).map(t), utensilios: (e.utensilios || []).map(t), espec: (e.espec || []).map(t) })) };
  }
  const PP_ACCION = { agregar: 'Agregar', quitar: 'Quitar', cambiar: 'Cambiar texto', valores: 'Rango', mover: 'Mover', comentario: 'Comentario' };
  const ppQue = (c) => `${PP_ACCION[c.accion]}${c.clase === 'pm' ? ' (proceso menor)' : c.clase === 'equipo' || c.clase === 'utensilio' ? ` (${c.clase})` : c.clase === 'etiqueta' || c.clase === 'estructura' ? ' (sección)' : c.clase === 'especificacion' ? ' (especificación)' : ''}`;
  const ppDespues = (c) => c.accion === 'comentario' ? '' : c.despues || (c.campos ? c.campos.map((x) => `${x.campo}: ${x.antes || '—'} → ${x.despues || '—'}`).join('; ') : c.accion === 'mover' ? `después de: ${(c.trasDe && c.trasDe.texto) || '(al inicio)'}` : c.texto || '');
  function ppExcel(datos, prop, an) {
    const libro = Xlsx.crearLibro(), hoy = new Date(), dd2 = (n) => String(n).padStart(2, '0'), s = prop.solicitud || {};
    const tabla = (nombre, nt, cab, anchos, filas, estilos = {}, activa) => {
      const h = libro.hoja(nombre, { activa: !!activa, congelar: 'A2', cols: anchos.map((w, i) => [i + 1, i + 1, w]), tabla: { nombre: nt, ref: `A1:${Xlsx.letra(cab.length - 1)}${Math.max(2, filas.length + 1)}`, estilo: 'TableStyleMedium2' } });
      cab.forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal')); filas.forEach((f, i) => f.forEach((x, c) => { if (x !== '' && x != null) h.poner({ c, r: i + 1 }, x, estilos[c] || 'normal'); }));
    };
    const avisoDe = (id) => (an.avisos.get(id) || []).filter((a) => a.nivel !== 'info').map((a) => a.texto).join(' · ');
    tabla('Cambios', 'CambiosBorrador', ['N.°', 'Lugar', 'Cambio', 'Antes', 'Después', 'Código antes', 'Código después', 'Paso nuevo a crear', 'Avisos', 'Comentario de Producción'], [10, 36, 22, 50, 50, 12, 12, 10, 40, 40],
      an.cambios.map((c) => [c.numero || '', c.lugar || '', ppQue(c), c.antes || '', ppDespues(c), c.codigoAntes || '', c.codigo || '', c.nuevo ? 'Sí' : '', avisoDe(c.id), c.comentario || '']), { 1: 'envuelto', 3: 'envuelto', 4: 'envuelto', 8: 'envuelto', 9: 'envuelto' }, true);
    tabla('Pasos nuevos', 'PasosNuevos', ['N.°', 'Lugar', 'Texto del paso nuevo', 'Ya existe en SAP (mismo texto, estructura y etiqueta)'], [10, 36, 70, 30],
      an.nuevos.map((n) => [n.c.numero || '', n.c.lugar || '', n.texto, n.error ? 'no se pudo comprobar' : (n.existe || []).join(', ')]), { 1: 'envuelto', 2: 'envuelto' });
    tabla('Cambiado en SAP', 'CambiadoEnSap', ['N.°', 'Lugar', 'Cambio en SAP desde la plantilla', 'Antes', 'Después', 'Toca un cambio del borrador'], [10, 36, 26, 50, 50, 12],
      an.enSap.map((c) => [c.numero || '', c.lugar || '', ppQue(c), c.antes || '', ppDespues(c), an.conflictos.includes(c) ? 'Sí' : '']), { 1: 'envuelto', 3: 'envuelto', 4: 'envuelto' });
    const hI = libro.hoja('Solicitud', { cols: [[1, 1, 30], [2, 2, 90]] });
    hI.poner('A1', `Borrador de Producción · RMD ${datos.rmd.codigo} v${datos.rmd.version}`, 'titulo');
    [['Descripción', datos.rmd.descripcion], ['Solicitado por', s.nombre || ''], ['Área', s.area || ''], ['Motivo', s.motivo || ''], ['Control de cambio', s.cc || ''], ['Observación', s.observacion || ''],
      ['Borrador guardado el', fechaHoraCorta(prop.guardado)], ['Plantilla generada', `${fechaHoraCorta(datos.generado)} por ${datos.por || '—'}`], ['Se ingresa en', an.destino ? `v${an.destino.version} · ${an.destino.codigo} (${an.destino.estado})` : 'falta crear una versión Ingresada del RMD'],
      ['Generado', `${dd2(hoy.getDate())}/${dd2(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd2(hoy.getHours())}:${dd2(hoy.getMinutes())}`]].forEach(([a, b], i) => { hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return { libro, nombre: `Borrador RMD ${datos.rmd.codigo} - plan de ingreso ${hoy.getFullYear()}-${dd2(hoy.getMonth() + 1)}-${dd2(hoy.getDate())}.xlsx` };
  }
  // ---- ventanas ----
  function abrirPlantillaProduccion(codigo) {
    const ctrl = controladorPrincipal(); if (!ctrl) { toast('Abre la lista «Configuración Manufactura Digital».', true); return; }
    const asoc = ctrl.getView().getModel('asociarDatos'), abierto = asoc && asoc.getData() && asoc.getData().codigo;
    const filtro = (ctrl.getView().getModel('oDataFilter') || { getProperty: () => '' }).getProperty('/code');
    const v = ventana('Plantilla para Producción', { cancelar: () => { if (!ocupado) v.cerrar(); } }); let ocupado = false;
    v.fondo.querySelector('.rmd-modal').classList.add('rmd-pp');
    v.cuerpo.innerHTML = `<p class="rmd-nota">Un archivo .html que Producción abre en Chrome o Edge, sin SAP: ve el RMD como en el PDF, deja su borrador de cambios (buscando los pasos que ya existen) y devuelve el archivo para importarlo aquí, en un RMD Ingresado.</p>
      <label class="rmd-pp-campo">Código del RMD <input class="rmd-pp-cod" value="${esc(codigo || abierto || filtro || '')}" placeholder="p. ej. 2202609157" inputmode="numeric"></label>
      <label class="rmd-nota"><input type="checkbox" class="rmd-pp-forzar"> Volver a leer el catálogo de SAP (si se crearon pasos hoy)</label>
      <p class="rmd-progreso rmd-pp-estado"></p>`;
    const cod = v.cuerpo.querySelector('.rmd-pp-cod'), est = v.cuerpo.querySelector('.rmd-pp-estado');
    const bGen = botonModal('Generar plantilla', 'primario', async () => {
      if (ocupado) return; const c = cod.value.trim(); if (!/^\d{5,}$/.test(c)) { setTxt(est, 'Escribe el código del RMD.'); est.classList.add('error'); return; }
      ocupado = true; bGen.disabled = bImp.disabled = true; est.classList.remove('error');
      try {
        const r = await ppGenerar(c, { forzar: v.cuerpo.querySelector('.rmd-pp-forzar').checked, avisar: (t) => setTxt(est, t) });
        descargarArchivo(r.nombre, r.html, 'text/html;charset=utf-8');
        setTxt(est, `Listo: «${r.nombre}» (${(r.resumen.bytes / 1048576).toFixed(1)} MB) · ${r.resumen.pasos} pasos y ${r.resumen.pm} procesos menores · catálogo de ${r.resumen.catalogo.toLocaleString('es-PE')} pasos. Envíalo a Producción.`);
        if (r.paquete.rmd.estado !== 'Ingresado') est.textContent += ` El RMD está ${r.paquete.rmd.estado}: el borrador solo se podrá importar en una versión Ingresada (créala en el portal antes de importar).`;
      } catch (e) { setTxt(est, 'No se pudo generar: ' + e.message); est.classList.add('error'); }
      finally { ocupado = false; bGen.disabled = bImp.disabled = false; }
    });
    const bImp = botonModal('Importar un borrador…', '', () => { if (!ocupado) { v.cerrar(); elegirBorrador(); } });
    v.pie.append(botonModal('Cerrar', '', () => { if (!ocupado) v.cerrar(); }), bImp, bGen);
    cod.addEventListener('keydown', (e) => { if (e.key === 'Enter') bGen.click(); }); setTimeout(() => cod.focus(), 30);
  }
  function elegirBorrador() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.html,.htm,text/html';
    i.addEventListener('change', async () => { const f = i.files && i.files[0]; if (f) abrirImportarBorrador(await f.text(), f.name); });
    i.click();
  }
  async function abrirImportarBorrador(texto, nombreArchivo) {
    const v = ventana('Borrador de Producción', { cancelar: () => v.cerrar() });
    v.fondo.querySelector('.rmd-modal').classList.add('rmd-pp', 'rmd-pp-imp');
    v.cuerpo.innerHTML = '<p class="rmd-progreso">Leyendo el borrador…</p>';
    let datos, prop, an;
    try {
      ({ datos, prop } = await ppLeerBorrador(texto));
      v.cuerpo.innerHTML = '<p class="rmd-progreso">Revisando el RMD en SAP…</p>';
      an = await ppAnalizar(datos, prop);
    } catch (e) { v.cuerpo.innerHTML = `<p class="rmd-progreso error">No se pudo abrir «${esc(nombreArchivo || 'el archivo')}»: ${esc(e.message)}</p>`; v.pie.append(botonModal('Cerrar', '', () => v.cerrar())); return; }
    const s = prop.solicitud || {}, r = datos.rmd;
    const cab = `<div class="rmd-pp-cab"><div><b>RMD ${esc(r.codigo)} v${esc(r.version)}</b> · ${esc(r.descripcion)}<br><span class="rmd-nota">Plantilla del ${esc(fechaHoraCorta(datos.generado))} · borrador guardado el ${esc(fechaHoraCorta(prop.guardado))}</span></div>
        <div><b>${esc(s.nombre || '—')}</b> · ${esc(s.area || '')}<br><span class="rmd-nota">${esc(s.motivo || '')}${s.cc ? ' · ' + esc(s.cc) : ''}</span></div></div>`;
    if (!an.destino) {                                                          // solo se importa en un RMD Ingresado
      v.cuerpo.innerHTML = `${cab}<p class="rmd-progreso error">Solo se puede importar en un RMD <b>Ingresado</b>. El RMD ${esc(r.codigo)} (v${esc(r.version)}) está ${esc(an.base.estado || r.estado)} y su master no tiene una versión Ingresada posterior.</p>
        <p class="rmd-nota">Crea en el portal la nueva versión del RMD (quedará Ingresada) y vuelve a importar este borrador: se aplicará sobre esa versión.</p>`;
      v.pie.append(botonModal('Cerrar', '', () => v.cerrar())); v.__pp = { datos, prop, an, bloqueado: true }; window.__rmdStats.plantilla.ultimo = { datos, prop, an, bloqueado: true }; return;
    }
    const nNuevos = an.nuevos.length, yaExisten = an.nuevos.filter((n) => n.existe && n.existe.length).length;
    const errores = [...an.avisos.values()].flat().filter((a) => a.nivel === 'error').length;
    const estadoDestino = an.destino.mdId === r.mdId ? `Se ingresa en este mismo RMD: <b>${esc(r.codigo)} v${esc(r.version)} (Ingresado)</b>` : `Se ingresa en la versión Ingresada <b>${esc(an.destino.codigo)} v${esc(an.destino.version)}</b> (la plantilla era de la v${esc(r.version)}, ${esc(an.base.estado || r.estado)})`;
    const lineas = [
      `<li>✓ ${estadoDestino}</li>`,
      `<li>${an.enSap.length ? (an.conflictos.length ? '⚠' : 'ℹ') : '✓'} ${an.enSap.length ? `En SAP hubo ${an.enSap.length} cambio(s) desde que se generó la plantilla${an.conflictos.length ? `, <b>${an.conflictos.length} en lo mismo que toca el borrador</b>` : ' (ninguno en lo que toca el borrador)'}` : 'El RMD no cambió en SAP desde que se generó la plantilla'}</li>`,
      `<li>${nNuevos ? '★' : '✓'} ${nNuevos ? `${nNuevos} paso(s) nuevo(s) a crear${yaExisten ? `; <b>${yaExisten} ya existe(n) ahora en SAP</b>` : ''}` : 'Todos los pasos ya existen en SAP'}</li>`,
      errores ? `<li>✕ ${errores} dato(s) por corregir que Producción dejó marcados</li>` : ''];
    const avisoDe = (id) => (an.avisos.get(id) || []).filter((a) => a.nivel !== 'info').map((a) => `<div class="rmd-pp-av ${a.nivel}">${a.nivel === 'error' ? '✕' : '⚠'} ${esc(a.texto)}</div>`).join('');
    const nuevoDe = new Map(an.nuevos.filter((n) => !n.pm).map((n) => [n.c, n]));
    const filas = an.cambios.map((c) => { const n = nuevoDe.get(c), conf = an.enSap.some((x) => x.id === c.id && an.conflictos.includes(x));
      return `<tr class="rmd-pp-${c.accion}"><td class="rmd-nowrap">${esc(c.numero || '')}</td><td>${esc(ppQue(c))}<br><span class="rmd-nota">${esc(c.lugar || '')}</span></td><td>${esc(c.antes || '')}${c.codigoAntes ? ` <span class="rmd-nota">(${esc(c.codigoAntes)})</span>` : ''}</td>
        <td>${esc(ppDespues(c))}${c.codigo && c.accion !== 'mover' ? ` <span class="rmd-nota">(${esc(c.codigo)})</span>` : ''}${c.nuevo ? ` <span class="rmd-pp-crea">★ crear${n && n.existe && n.existe.length ? ` · ya existe: ${esc(n.existe.join(', '))}` : ''}</span>` : ''}${c.pm && c.pm.length ? `<div class="rmd-nota">Procesos menores: ${c.pm.map((m) => esc(m.texto) + (m.nuevo ? ' ★' : '')).join(' · ')}</div>` : ''}${avisoDe(c.id)}${conf ? '<div class="rmd-pp-av aviso">⚠ Cambió en SAP desde la plantilla</div>' : ''}</td>
        <td>${esc(c.comentario || '')}</td></tr>`; }).join('');
    v.cuerpo.innerHTML = `${cab}
      ${s.observacion ? `<p class="rmd-nota">Observación: ${esc(s.observacion)}</p>` : ''}<ul class="rmd-pp-checks">${lineas.join('')}</ul>
      ${an.cambios.length ? `<table class="rmd-tabla rmd-pp-t"><thead><tr><th>N.°</th><th>Cambio</th><th>Antes</th><th>Después</th><th>Comentario</th></tr></thead><tbody>${filas}</tbody></table>` : '<p class="rmd-nota">El borrador no trae cambios.</p>'}
      ${an.enSap.length ? `<details class="rmd-pp-sap"><summary>Cambios hechos en SAP desde la plantilla (${an.enSap.length})</summary><table class="rmd-tabla rmd-pp-t"><tbody>${an.enSap.map((c) => `<tr><td class="rmd-nowrap">${esc(c.numero || '')}</td><td>${esc(ppQue(c))}<br><span class="rmd-nota">${esc(c.lugar || '')}</span></td><td>${esc(c.antes || '')}</td><td>${esc(ppDespues(c))}</td></tr>`).join('')}</tbody></table></details>` : ''}
      <p class="rmd-nota">«Ingresar en SAP…» escribe estos cambios en el RMD con las mismas escrituras del portal; antes muestra cada operación y pide confirmación.</p>`;
    const sinIngreso = errores ? `Hay ${errores} dato(s) por corregir en el borrador.` : an.enSap.length ? 'El RMD cambió en SAP desde la plantilla.' : !an.cambios.length ? 'El borrador no trae cambios.' : '';
    const bIngresar = botonModal('Ingresar en SAP…', 'primario', () => abrirIngreso(datos, prop, an)); if (sinIngreso) { bIngresar.disabled = true; bIngresar.title = sinIngreso; }
    v.pie.append(botonModal('Cerrar', '', () => v.cerrar()), botonModal('Exportar Excel', '', async () => { try { const x = ppExcel(datos, prop, an); descargarArchivo(x.nombre, await x.libro.generar(), TIPO_XLSX); } catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); } }), bIngresar);
    v.__pp = { datos, prop, an };
    window.__rmdStats.plantilla.ultimo = { datos, prop, an };
  }
  // soltar el archivo del borrador sobre la lista principal lo abre
  document.addEventListener('dragover', (e) => { if (on('plantillaprod') && e.dataTransfer && [...(e.dataTransfer.items || [])].some((i) => i.kind === 'file') && controladorPrincipal() && !dialogos().length) e.preventDefault(); });
  document.addEventListener('drop', async (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!on('plantillaprod') || !f || !/\.html?$/i.test(f.name) || !/borrador|propuesta|plantilla/i.test(f.name) || dialogos().length || !controladorPrincipal()) return;
    e.preventDefault(); abrirImportarBorrador(await f.text(), f.name);
  });
  window.__rmdStats.plantilla = { ingreso: null, plan: ppPlanEscritura, ingresar: abrirIngreso, verificar: ppVerificarIngreso, generar: ppGenerar, leerArbol: ppLeerArbol, catalogo: ppCatalogo, paquete: ppPaquete, html: ppHtml, empacar: ppEmpacar, desempacar: ppDesempacar, leer: ppLeerBorrador, analizar: ppAnalizar, destino: ppDestino, mapear: ppMapear, excel: ppExcel, abrir: abrirPlantillaProduccion, importar: abrirImportarBorrador, nucleo: PPN };
  // ---- Ingreso asistido del borrador (v1.42) ----
  // Desde la ventana del borrador importado, «Ingresar en SAP…» escribe en el RMD Ingresado lo mismo que haría una persona con las
  // ventanas del portal, con las mismas escrituras que el propio portal (leídas de su código y comprobadas simulando): agregar pasos y
  // procesos menores = actualización profunda de MD_ESTRUCTURA (aPaso / aPasoInsumoPaso, con los mismos campos que «Adicionar Pasos»),
  // quitar = activo:false como el botón Eliminar (más sus procesos menores), cambiar el paso de una fila = pasoId_pasoId (como
  // «Cambiar paso»), rangos = valorInicial / valorFinal / margen y el orden = `orden` de cada fila (como updateOrder del portal).
  // Sin cambios pendientes en SAP desde la plantilla, sin errores del borrador y sin pasos nuevos por crear. Equipos y utensilios: se quitan
  // aquí; agregarlos se hace a mano en el portal (el portal copia el equipo de SAP a su catálogo al asignarlo).
  const PP_PASO_SEL = 'pasoId,codigo,descripcion,estructuraId_estructuraId,etiquetaId_etiquetaId,tipoDatoId_iMaestraId,decimales,margen,valorInicial,valorFinal,clvModelo,automatico,activo,estadoId_iMaestraId';
  const ppUuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
  const ppNum = (v) => { if (v == null || v === '') return null; const x = Number(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
  // Arma las escrituras del ingreso (sin escribir nada): { ops, bloqueos, manual, finales } o bloqueos si algo impide ingresar.
  async function ppPlanEscritura(datos, prop, an, modelo, usuario) {
    const bloqueos = [], manual = [], ops = [], finales = new Map(), dest = an.destino, mismo = dest.mdId === datos.rmd.mdId, ahora = new Date();
    const F = sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter, FO = sap.ui.require('sap/ui/model/FilterOperator') || sap.ui.model.FilterOperator;
    if (+dest.estadoIdRmd_iMaestraId !== 467) bloqueos.push(`El RMD de destino (${dest.codigo} v${dest.version}) no está Ingresado.`);
    if (an.enSap.length) bloqueos.push(`El RMD cambió en SAP desde que se generó la plantilla (${an.enSap.length} cambio${an.enSap.length > 1 ? 's' : ''}). Genera la plantilla otra vez y que Producción repita el borrador sobre ella.`);
    const errores = [...an.avisos.values()].flat().filter((a) => a.nivel === 'error').length; if (errores) bloqueos.push(`El borrador tiene ${errores} dato(s) por corregir marcados con ✕.`);
    if (!an.cambios.length) bloqueos.push('El borrador no trae cambios.');
    if (bloqueos.length) return { ops, bloqueos, manual, finales };
    // índice de lo que hay hoy en el destino y mapa de ids (base → destino)
    const idx = new Map();
    an.actual.estructuras.forEach((e) => { const rec = (l) => (l || []).forEach((p) => { idx.set(p.id, p); (p.pm || []).forEach((m) => idx.set(m.id, m)); }); rec(e.pasos); (e.etiquetas || []).forEach((t) => rec(t.pasos)); (e.equipos || []).forEach((q) => idx.set(q.id, q)); (e.utensilios || []).forEach((q) => idx.set(q.id, q)); });
    const nuevosIds = new Map(), D = (id) => (String(id).startsWith('n:') ? (nuevosIds.get(id) || (nuevosIds.set(id, ppUuid()), nuevosIds.get(id))) : mismo ? id : (an.mapa && an.mapa.get(id)) || null);
    const bEst = new Map(datos.arbol.estructuras.map((e) => [e.id, e]));
    // listas a procesar (pasos de cada estructura y etiqueta; procesos menores de cada paso que ya existía)
    const listas = [];
    prop.trabajo.estructuras.forEach((e) => {
      const be = bEst.get(e.id) || { pasos: [], etiquetas: [] };
      if ((e.pasos || []).length || (be.pasos || []).length) listas.push({ kind: 'paso', w: e.pasos || [], b: be.pasos || [], e, t: null });
      (e.etiquetas || []).forEach((t) => { const bt = (be.etiquetas || []).find((x) => x.id === t.id) || { pasos: [] }; listas.push({ kind: 'paso', w: t.pasos || [], b: bt.pasos || [], e, t }); });
    });
    const conPm = [];
    listas.forEach((L) => L.w.forEach((x) => { const b0 = L.b.find((y) => y.id === x.id); if (b0 && !x.quitado && ((x.pm || []).length || (b0.pm || []).length)) conPm.push({ kind: 'pm', w: x.pm || [], b: b0.pm || [], e: L.e, t: L.t, padre: x }); }));
    listas.push(...conPm);
    // pasos del catálogo que hacen falta: por código; los «nuevos» se buscan otra vez por su texto (por si ya se crearon)
    const pide = (x, b0) => !b0 || String(x.codigo || '') !== String(b0.codigo || '') || x.nuevo;
    const codigos = new Set(), buscarTexto = [];
    listas.forEach((L) => { const bId = new Map(L.b.map((y) => [y.id, y])); L.w.filter((x) => !x.quitado).forEach((x) => { if (!pide(x, bId.get(x.id))) return; if (x.codigo && !x.nuevo) codigos.add(String(x.codigo)); else buscarTexto.push({ x, L }); }); });
    listas.forEach((L) => { if (L.kind !== 'paso') return; const bId = new Set(L.b.map((y) => y.id)); L.w.filter((x) => !x.quitado && !bId.has(x.id)).forEach((x) => (x.pm || []).filter((m) => !m.quitado).forEach((m) => { if (m.codigo && !m.nuevo) codigos.add(String(m.codigo)); else buscarTexto.push({ x: m, L: { e: L.e, t: null } }); })); });
    const porCodigo = new Map(), lee = async (filtros) => leerTodoDe(modelo, 'PASO', filtros, { $select: PP_PASO_SEL });
    const lista = [...codigos]; for (let i = 0; i < lista.length; i += 40) (await lee([new F({ filters: lista.slice(i, i + 40).map((c) => new F('codigo', 'EQ', c)), and: false })])).forEach((p) => { if (p.activo !== false) porCodigo.set(String(p.codigo), p); });
    for (const { x, L } of buscarTexto) {
      const f = [new F('tolower(descripcion)', FO.EQ, "'" + String(x.texto || '').toLowerCase().replace(/'/g, "''") + "'"), new F('estructuraId_estructuraId', 'EQ', L.e.estructuraId)]; if (L.t) f.push(new F('etiquetaId_etiquetaId', 'EQ', L.t.etiquetaId));
      const r = (await lee(f)).filter((p) => p.activo !== false && +p.estadoId_iMaestraId !== 1).sort((a, b) => (+a.codigo || 0) - (+b.codigo || 0));
      if (r[0]) { porCodigo.set(String(r[0].codigo), r[0]); x.__codigo = String(r[0].codigo); } else bloqueos.push(`El paso nuevo «${String(x.texto).slice(0, 70)}» (${L.e.nombre}${L.t ? ' › ' + L.t.nombre : ''}) todavía no existe en SAP: créalo con «Nuevo Paso» y vuelve a importar.`);
    }
    const cod = (x) => String(x.__codigo || x.codigo || '');
    const faltan = [...new Set(listas.flatMap((L) => L.w.filter((x) => !x.quitado && pide(x, L.b.find((y) => y.id === x.id)) && cod(x) && !porCodigo.has(cod(x))).map((x) => cod(x))))];
    faltan.forEach((c) => bloqueos.push(`El paso ${c} no se encontró (¿está de baja?) en el catálogo de SAP.`));
    if (bloqueos.length) return { ops, bloqueos, manual, finales };
    const lugar = (L) => `${L.e.nombre}${L.t ? ' › ' + L.t.nombre : ''}${L.padre ? ' › paso ' + (L.padre.codigo || '') : ''}`;
    const fechaUsuario = { usuarioActualiza: usuario, fechaActualiza: ahora }, baja = { usuarioActualiza: usuario, fechaActualiza: ahora, activo: false };
    const dE = (L) => D(L.e.id), dT = (L) => (L.t ? D(L.t.id) : null);
    let n = 0; const op = (o) => ops.push({ n: ++n, ...o });
    listas.forEach((L) => {
      const esPm = L.kind === 'pm', tabla = esPm ? 'MD_ES_PASO_INSUMO_PASO' : 'MD_ES_PASO', campo = esPm ? 'pasoHijoId_pasoId' : 'pasoId_pasoId', bId = new Map(L.b.map((y) => [y.id, y]));
      const quien = (x, b0) => `${esPm ? 'proceso menor' : 'paso'} ${cod(x) || (b0 && b0.codigo) || ''} — ${String(x.texto || (b0 && b0.texto) || '').slice(0, 60)}`;
      let estructural = false;
      L.w.filter((x) => x.quitado && bId.has(x.id)).forEach((x) => {
        estructural = true; const b0 = bId.get(x.id), fila = idx.get(D(x.id)); if (!fila) { bloqueos.push(`No se encontró en SAP ${quien(x, b0)} (${lugar(L)}).`); return; }
        if (!esPm) (fila.pm || []).forEach((m) => op({ lugar: lugar(L), accion: 'Quitar', clase: 'pm', desc: `quitar proceso menor ${m.codigo || ''} — ${String(m.texto || '').slice(0, 50)} (del paso que se quita)`, ruta: `/MD_ES_PASO_INSUMO_PASO('${m.id}')`, datos: { ...baja } }));
        op({ lugar: lugar(L), accion: 'Quitar', clase: esPm ? 'pm' : 'paso', desc: `quitar ${quien(x, b0)}`, ruta: `/${tabla}('${fila.id}')`, datos: { ...baja } });
      });
      const vivos = L.w.filter((x) => !x.quitado);
      vivos.filter((x) => bId.has(x.id)).forEach((x) => {
        const b0 = bId.get(x.id), fila = idx.get(D(x.id)); if (!fila) { bloqueos.push(`No se encontró en SAP ${quien(x, b0)} (${lugar(L)}).`); return; }
        if (pide(x, b0) && cod(x) && cod(x) !== String(b0.codigo || '')) {
          if (esPm && b0.insumo) { bloqueos.push(`${quien(b0, b0)} es un insumo de la receta: no se cambia desde el borrador.`); return; }
          op({ lugar: lugar(L), accion: 'Cambiar', clase: esPm ? 'pm' : 'paso', desc: `cambiar ${esPm ? 'el proceso menor' : 'el paso'} ${b0.codigo || ''} por el ${cod(x)} — ${String(x.texto || '').slice(0, 60)}`, ruta: `/${tabla}('${fila.id}')`, datos: { [campo]: porCodigo.get(cod(x)).pasoId, ...fechaUsuario } });
        }
        const dv = {}; [['vi', 'valorInicial'], ['vf', 'valorFinal'], ['margen', 'margen']].forEach(([k, c]) => { if (String(x[k] == null ? '' : x[k]) !== String(b0[k] == null ? '' : b0[k])) dv[c] = ppNum(x[k]); });
        if (Object.keys(dv).length) op({ lugar: lugar(L), accion: 'Rango', clase: esPm ? 'pm' : 'paso', desc: `rango de ${quien(x, b0)}: ${Object.entries(dv).map(([c, v]) => `${c === 'valorInicial' ? 'inicial' : c === 'valorFinal' ? 'final' : 'margen'} ${v == null ? '(vacío)' : v}`).join(', ')}`, ruta: `/${tabla}('${fila.id}')`, datos: { ...dv, ...fechaUsuario } });
      });
      const nuevos = vivos.filter((x) => !bId.has(x.id));
      if (nuevos.length) estructural = true;
      // el orden: lo que ya existía conserva su orden relativo salvo que se haya movido; cualquier cambio de la lista renumera 1..n como el portal
      const existentes = vivos.filter((x) => bId.has(x.id)), baseVivos = L.b.filter((y) => !L.w.some((x) => x.id === y.id && x.quitado));
      if (existentes.map((x) => x.id).join('|') !== baseVivos.map((y) => y.id).join('|')) estructural = true;
      if (estructural) vivos.forEach((x, i) => { if (!bId.has(x.id)) return; const fila = idx.get(D(x.id)); if (fila && +fila.orden !== i + 1) op({ lugar: lugar(L), accion: 'Orden', clase: esPm ? 'pm' : 'paso', desc: `${quien(x, bId.get(x.id))}: orden ${fila.orden} → ${i + 1}`, ruta: `/${tabla}('${fila.id}')`, datos: { orden: i + 1 } }); });
      vivos.forEach((x, i) => {
        if (bId.has(x.id)) return;
        const p = porCodigo.get(cod(x)), id = D(x.id), mdE = dE(L), mdT = dT(L), padreId = esPm ? D(L.padre.id) : null; finales.set(x.id, cod(x));
        if (!esPm) {
          const ini = x.vi != null && x.vi !== '' ? ppNum(x.vi) : p.valorInicial, fin = x.vf != null && x.vf !== '' ? ppNum(x.vf) : p.valorFinal, mar = x.margen != null && x.margen !== '' ? ppNum(x.margen) : p.margen;
          op({ lugar: lugar(L), accion: 'Agregar', clase: 'paso', desc: `agregar paso ${cod(x)} — ${String(x.texto || '').slice(0, 60)} (posición ${i + 1})`, ruta: `/MD_ESTRUCTURA('${mdE}')`,
            datos: { mdEstructuraId: mdE, aPaso: [{ terminal: null, fechaRegistro: ahora, usuarioRegistro: usuario, fechaActualiza: ahora, usuarioActualiza: null, activo: true, mdEstructuraPasoId: id, estructuraId_estructuraId: L.e.estructuraId, mdEstructuraId_mdEstructuraId: mdE, mdEsEtiquetaId_mdEsEtiquetaId: mdT,
              mdId_mdId: dest.mdId, pasoId_pasoId: p.pasoId, orden: i + 1, tipoDatoId_iMaestraId: p.tipoDatoId_iMaestraId, decimales: p.decimales, margen: mar, valorInicial: ini, valorFinal: fin, clvModelo: p.clvModelo, automatico: p.automatico, mdEstructuraPasoIdDepende: id, tipoDatoIdAnterior_iMaestraId: p.tipoDatoId_iMaestraId }] } });
          // sus procesos menores (los que Producción dejó en el paso nuevo)
          (x.pm || []).filter((m) => !m.quitado).forEach((m, j) => {
            const pm = porCodigo.get(cod(m)); if (!pm) { bloqueos.push(`El proceso menor «${String(m.texto).slice(0, 60)}» del paso nuevo no está en el catálogo de SAP.`); return; }
            finales.set(m.id, cod(m));
            op({ lugar: lugar(L), accion: 'Agregar', clase: 'pm', desc: `agregar proceso menor ${cod(m)} — ${String(m.texto || '').slice(0, 50)} al paso nuevo`, ruta: `/MD_ESTRUCTURA('${mdE}')`,
              datos: { mdEstructuraId: mdE, aPasoInsumoPaso: [{ terminal: null, fechaRegistro: ahora, usuarioRegistro: usuario, activo: true, mdEstructuraPasoInsumoPasoId: D(m.id), mdEstructuraPasoInsumoPasoIdAct: D(m.id), estructuraId_estructuraId: L.e.estructuraId, mdEstructuraId_mdEstructuraId: mdE, mdId_mdId: dest.mdId, tipoDatoId_iMaestraId: pm.tipoDatoId_iMaestraId,
                pasoId_mdEstructuraPasoId: id, pasoHijoId_pasoId: pm.pasoId, etiquetaId_etiquetaId: L.t ? L.t.etiquetaId : null, mdEsEtiquetaId_mdEsEtiquetaId: mdT, orden: j + 1, decimales: pm.decimales, margen: pm.margen, valorInicial: pm.valorInicial, valorFinal: pm.valorFinal, tipoDatoIdAnterior_iMaestraId: pm.tipoDatoId_iMaestraId }] } });
          });
        } else {
          op({ lugar: lugar(L), accion: 'Agregar', clase: 'pm', desc: `agregar proceso menor ${cod(x)} — ${String(x.texto || '').slice(0, 50)} (posición ${i + 1})`, ruta: `/MD_ESTRUCTURA('${mdE}')`,
            datos: { mdEstructuraId: mdE, aPasoInsumoPaso: [{ terminal: null, fechaRegistro: ahora, usuarioRegistro: usuario, activo: true, mdEstructuraPasoInsumoPasoId: id, mdEstructuraPasoInsumoPasoIdAct: id, estructuraId_estructuraId: L.e.estructuraId, mdEstructuraId_mdEstructuraId: mdE, mdId_mdId: dest.mdId, tipoDatoId_iMaestraId: p.tipoDatoId_iMaestraId,
              pasoId_mdEstructuraPasoId: padreId, pasoHijoId_pasoId: p.pasoId, etiquetaId_etiquetaId: L.t ? L.t.etiquetaId : null, mdEsEtiquetaId_mdEsEtiquetaId: mdT, orden: i + 1, decimales: p.decimales, margen: p.margen, valorInicial: p.valorInicial, valorFinal: p.valorFinal, tipoDatoIdAnterior_iMaestraId: p.tipoDatoId_iMaestraId }] } });
        }
      });
    });
    // equipos y utensilios: se quitan aquí; agregarlos se hace a mano (el portal copia el equipo de SAP a su catálogo al asignarlo)
    prop.trabajo.estructuras.forEach((e) => ['equipos', 'utensilios'].forEach((k) => {
      const be = bEst.get(e.id) || {}, bIds = new Set((be[k] || []).map((x) => x.id)), tabla = k === 'equipos' ? 'MD_ES_EQUIPO' : 'MD_ES_UTENSILIO';
      (e[k] || []).forEach((x) => {
        const nombre = [x.desc, x.codigo, x.ref].filter(Boolean).join(' · ');
        if (!bIds.has(x.id)) { if (!x.quitado) manual.push(`Agregar ${k === 'equipos' ? 'el equipo' : 'el utensilio'} ${nombre} en «${e.nombre}» (Adicionar Equipo del portal).`); return; }
        if (x.quitado) { const fila = idx.get(D(x.id)); if (!fila) { bloqueos.push(`No se encontró en SAP ${nombre} (${e.nombre}).`); return; } op({ lugar: e.nombre, accion: 'Quitar', clase: k === 'equipos' ? 'equipo' : 'utensilio', desc: `quitar ${k === 'equipos' ? 'el equipo' : 'el utensilio'} ${nombre}`, ruta: `/${tabla}('${fila.id}')`, datos: { ...baja } }); }
      });
    }));
    return { ops, bloqueos, manual, finales, D, nuevosIds, porCodigo };
  }
  // Comprueba, releyendo el RMD, que cada lista quedó con los pasos (y procesos menores) del borrador y en su orden.
  async function ppVerificarIngreso(modelo, dest, prop, plan) {
    const nuevo = await ppLeerArbol(modelo, dest), dif = [], est = new Map(nuevo.estructuras.map((e) => [e.id, e])), D = plan.D, cod = (x) => String(plan.finales.get(x.id) || x.__codigo || x.codigo || x.comp || '');
    prop.trabajo.estructuras.forEach((e) => {
      const ne = est.get(D(e.id)); if (!ne) { dif.push(`Falta la estructura ${e.nombre}.`); return; }
      const cmp = (w, nl, etiqueta) => {
        const quiere = w.filter((x) => !x.quitado), tiene = nl || [];
        if (quiere.map(cod).join('|') !== tiene.map((p) => String(p.codigo || '')).join('|')) dif.push(`${etiqueta}: esperaba ${quiere.length} pasos [${quiere.map(cod).slice(0, 8).join(', ')}…] y hay ${tiene.length} [${tiene.map((p) => p.codigo).slice(0, 8).join(', ')}…].`);
        quiere.forEach((x) => { const p = tiene.find((y) => y.id === D(x.id)); if (!p) return; const q = x.pm || []; if (!q.length && !(p.pm || []).length) return;
          const a = q.filter((m) => !m.quitado).map(cod).join('|'), b = (p.pm || []).map((m) => String(m.codigo || m.comp || '')).join('|'); if (a !== b) dif.push(`${etiqueta} › paso ${cod(x)}: procesos menores distintos (esperaba ${q.filter((m) => !m.quitado).length}, hay ${(p.pm || []).length}).`); });
      };
      cmp(e.pasos || [], ne.pasos, e.nombre);
      (e.etiquetas || []).forEach((t) => { const nt = (ne.etiquetas || []).find((x) => x.id === D(t.id)); if (!nt) { dif.push(`Falta la etiqueta ${t.nombre}.`); return; } cmp(t.pasos || [], nt.pasos, `${e.nombre} › ${t.nombre}`); });
      ['equipos', 'utensilios'].forEach((k) => { const quiere = (e[k] || []).filter((x) => !x.quitado && !String(x.id).startsWith('n:')).length; const hay = (ne[k] || []).length; if (!(e[k] || []).some((x) => String(x.id).startsWith('n:')) && quiere !== hay) dif.push(`${e.nombre}: ${k} esperados ${quiere}, hay ${hay}.`); });
    });
    return dif;
  }
  // Ejecuta las operaciones una por una (para al primer error). simular = no envía nada (para probar).
  async function ppEjecutarIngreso(modelo, ops, o = {}) {
    const diario = []; let hechas = 0;
    for (const x of ops) {
      if (o.detener && o.detener()) { diario.push({ ...x, estado: 'detenido' }); break; }
      try { if (!o.simular) await modeloEscribir(modelo, 'update', x.ruta, x.datos); diario.push({ ...x, estado: o.simular ? 'simulado' : 'hecho' }); hechas++; }
      catch (e) { diario.push({ ...x, estado: 'error', error: (e && e.message) || String(e) }); break; }
      if (o.avance) o.avance(hechas, ops.length, x);
    }
    return diario;
  }
  function ppExcelIngreso(datos, dest, diario, dif, manual) {
    const libro = Xlsx.crearLibro(), hoy = new Date(), dd2 = (n) => String(n).padStart(2, '0');
    const h = libro.hoja('Ingreso', { activa: true, congelar: 'A2', cols: [[1, 1, 8], [2, 2, 44], [3, 3, 12], [4, 4, 90], [5, 5, 12], [6, 6, 40]], tabla: { nombre: 'IngresoBorrador', ref: `A1:F${Math.max(2, diario.length + 1)}`, estilo: 'TableStyleMedium2' } });
    ['N.°', 'Lugar', 'Acción', 'Operación', 'Estado', 'Error'].forEach((t, c) => h.poner({ c, r: 0 }, t, 'normal'));
    diario.forEach((x, i) => [x.n, x.lugar, x.accion, x.desc, x.estado, x.error || ''].forEach((v, c) => { if (v !== '' && v != null) h.poner({ c, r: i + 1 }, v, c === 1 || c === 3 || c === 5 ? 'envuelto' : 'normal'); }));
    const hI = libro.hoja('Resumen', { cols: [[1, 1, 30], [2, 2, 100]] });
    hI.poner('A1', `Ingreso del borrador · RMD ${dest.codigo} v${dest.version}`, 'titulo');
    [['Operaciones', String(diario.length)], ['Hechas', String(diario.filter((x) => x.estado === 'hecho').length)], ['Simuladas', String(diario.filter((x) => x.estado === 'simulado').length)], ['Con error', String(diario.filter((x) => x.estado === 'error').length)],
      ['Comprobación', dif.length ? dif.join(' | ') : 'El RMD quedó como el borrador'], ['Pendiente a mano', manual.join(' | ') || '—'], ['Generado', `${dd2(hoy.getDate())}/${dd2(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd2(hoy.getHours())}:${dd2(hoy.getMinutes())}`]]
      .forEach(([a, b], i) => { hI.poner({ c: 0, r: 2 + i }, a, 'negrita'); hI.poner({ c: 1, r: 2 + i }, b, 'texto'); });
    return { libro, nombre: `Ingreso RMD ${dest.codigo} v${dest.version} ${hoy.getFullYear()}-${dd2(hoy.getMonth() + 1)}-${dd2(hoy.getDate())}.xlsx` };
  }
  async function abrirIngreso(datos, prop, an, opc = {}) {
    const ctrl = controladorPrincipal(), modelo = ctrl && ctrl.getView().getModel('mainModelv2'), usuario = codigoUsuario(ctrl);
    if (!modelo) { toast('Abre la lista «Configuración Manufactura Digital».', true); return null; }
    const v = ventana(`Ingresar en SAP · RMD ${an.destino.codigo} v${an.destino.version}`, { cancelar: () => { if (!ocupado) v.cerrar(); } }); let ocupado = false, detener = false;
    v.fondo.querySelector('.rmd-modal').classList.add('rmd-pp', 'rmd-pp-ing');
    v.cuerpo.innerHTML = '<p class="rmd-progreso">Preparando las escrituras…</p>';
    const cerrar = botonModal('Cerrar', '', () => { if (!ocupado) v.cerrar(); }); v.pie.append(cerrar);
    let plan;
    try { plan = await ppPlanEscritura(datos, prop, an, modelo, usuario); } catch (e) { v.cuerpo.innerHTML = `<p class="rmd-progreso error">No se pudo preparar: ${esc(e.message)}</p>`; return null; }
    const est = { plan, diario: [], dif: null };
    window.__rmdStats.plantilla.ingreso = est;
    if (plan.bloqueos.length) { v.cuerpo.innerHTML = `<p class="rmd-progreso error">No se puede ingresar todavía:</p><ul class="rmd-pp-checks">${plan.bloqueos.map((b) => `<li>✕ ${esc(b)}</li>`).join('')}</ul>`; return est; }
    const cuenta = {}; plan.ops.forEach((o) => { const k = `${o.accion} ${o.clase === 'pm' ? 'procesos menores' : o.clase === 'paso' ? 'pasos' : o.clase === 'equipo' ? 'equipos' : 'utensilios'}`; cuenta[k] = (cuenta[k] || 0) + 1; });
    const filas = () => plan.ops.map((o) => { const d = est.diario.find((x) => x.n === o.n); return `<tr class="${d ? 'rmd-pp-e-' + d.estado : ''}"><td class="rmd-nowrap">${o.n}</td><td>${esc(o.lugar)}</td><td>${esc(o.desc)}${d && d.error ? `<div class="rmd-pp-av error">✕ ${esc(d.error)}</div>` : ''}</td><td class="rmd-nowrap">${d ? esc(d.estado) : ''}</td></tr>`; }).join('');
    v.cuerpo.innerHTML = `<p><b>${plan.ops.length} escrituras</b> en el RMD <b>${esc(an.destino.codigo)} v${esc(an.destino.version)}</b> (${esc(an.destino.estado)}): ${Object.entries(cuenta).map(([k, n]) => `${n} ${esc(k.toLowerCase())}`).join(' · ')}.</p>
      ${plan.manual.length ? `<div class="rmd-pp-av aviso">Queda a mano (no se hace desde aquí):<ul>${plan.manual.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <div class="rmd-pp-tabla"><table class="rmd-tabla rmd-pp-t"><thead><tr><th>N.°</th><th>Dónde</th><th>Operación</th><th>Estado</th></tr></thead><tbody>${filas()}</tbody></table></div>
      <label class="rmd-nota rmd-pp-conf"><input type="checkbox" class="rmd-pp-ok"> Confirmo que quiero escribir estos cambios en el RMD ${esc(an.destino.codigo)} v${esc(an.destino.version)} de SAP.</label>
      <div class="rmd-progreso rmd-pp-prog"></div>`;
    const prog = v.cuerpo.querySelector('.rmd-pp-prog'), ok = v.cuerpo.querySelector('.rmd-pp-ok'), tabla = v.cuerpo.querySelector('tbody');
    const pintar = () => { tabla.innerHTML = filas(); };
    const correr = async (simular) => {
      if (ocupado) return; ocupado = true; detener = false; bIng.disabled = bSim.disabled = true; bDet.style.display = ''; prog.classList.remove('error');
      try {
        if (!simular) {
          if (dialogos().length > 1) throw new Error('cierra las ventanas del portal que estén abiertas (solo debe quedar esta).');
          setTxt(prog, 'Comprobando que el RMD sigue igual…');
          const md = (await leerTodoDe(modelo, 'MD', [new (sap.ui.require('sap/ui/model/Filter') || sap.ui.model.Filter)('mdId', 'EQ', an.destino.mdId)], { $select: 'mdId,estadoIdRmd_iMaestraId' }))[0];
          if (!md || +md.estadoIdRmd_iMaestraId !== 467) throw new Error('el RMD ya no está Ingresado.');
          if (PPN.huella(await ppLeerArbol(modelo, an.destino)) !== PPN.huella(an.actual)) throw new Error('el RMD cambió en SAP mientras revisabas. Cierra esta ventana e importa el borrador otra vez.');
        }
        est.diario = await ppEjecutarIngreso(modelo, plan.ops, { simular: !!simular || !!opc.simular, detener: () => detener, avance: (h, t, x) => { setTxt(prog, `${simular ? 'Simulando' : 'Escribiendo'} ${h} de ${t}…`); pintar(); } });
        pintar(); const mal = est.diario.find((x) => x.estado === 'error'), hechas = est.diario.filter((x) => x.estado === 'hecho').length;
        if (mal) { setTxt(prog, `Se detuvo en la operación ${mal.n}: ${mal.error}. Hechas antes: ${hechas}. Revisa el RMD en el portal antes de reintentar (no se repite lo ya hecho si importas otra vez: el borrador se vuelve a comparar).`); prog.classList.add('error'); }
        else if (est.diario.length < plan.ops.length) setTxt(prog, `Detenido tras ${hechas} operaciones.`);
        else if (simular || opc.simular) setTxt(prog, `Simulación lista: ${est.diario.length} escrituras que se harían (no se envió nada).`);
        else { setTxt(prog, 'Comprobando el resultado…'); est.dif = await ppVerificarIngreso(modelo, an.destino, prop, plan); setTxt(prog, est.dif.length ? `Se escribió todo, pero la comprobación encontró diferencias: ${est.dif.join(' ')}` : `Listo: ${hechas} escrituras. El RMD quedó como el borrador.`); if (est.dif.length) prog.classList.add('error'); }
        bX.disabled = false;
      } catch (e) { setTxt(prog, 'No se escribió nada: ' + e.message); prog.classList.add('error'); }
      finally { ocupado = false; bSim.disabled = false; bIng.disabled = !ok.checked || est.diario.some((x) => x.estado === 'hecho'); bDet.style.display = 'none'; }
    };
    const bIng = botonModal('Ingresar en SAP', 'primario', () => correr(false)), bSim = botonModal('Probar sin escribir', '', () => correr(true)), bDet = botonModal('Detener', '', () => { detener = true; }), bX = botonModal('Exportar registro', '', async () => { try { const x = ppExcelIngreso(datos, an.destino, est.diario, est.dif || [], plan.manual); descargarArchivo(x.nombre, await x.libro.generar(), TIPO_XLSX); } catch (e) { toast('No se pudo armar el Excel: ' + e.message, true); } });
    bIng.disabled = true; bDet.style.display = 'none'; bX.disabled = true; ok.addEventListener('change', () => { bIng.disabled = !ok.checked || ocupado; });
    v.pie.prepend(bX); v.pie.append(bDet, bSim, bIng);
    est.ejecutar = correr; est.ventana = v;
    return est;
  }
  // ==== PLANTILLA-PRODUCCION:FIN ====

  // ---- 10. Panel para activar/desactivar cada mejora -------------------------------------------
  // Grupos del panel (las claves son las de OPC)
  const GRUPOS_PANEL = [
    ['Productividad', ['saludo', 'paleta', 'titulo', 'enter', 'singuardar', 'exito', 'sesion']],
    ['Lista principal', ['barrafiltros', 'fase', 'buscarequipo', 'revisor', 'cambiosrecetas', 'recetasauto', 'historialcambios', 'plantillaprod', 'exportar', 'equipos', 'indicadores', 'citastodos', 'statusrmd', 'suspension']],
    ['Configurar el RMD', ['ancho', 'columnas', 'ocultar', 'estado', 'pmtitulo', 'grupos', 'depende', 'filtro', 'copiar', 'repetirpaso', 'nuevopaso', 'editarpaso', 'cambiarpaso', 'pasominusculas', 'formulas', 'espec', 'verop', 'documentos', 'vivo']],
    ['Asociar fórmulas', ['asociar', 'recetas', 'recetasvarias', 'puestoreceta']],
    ['Alertas', ['reglasrev', 'reglas', 'ordenest', 'sintipo', 'puesto']],
  ];
  function panel() {
    const etiqueta = Object.fromEntries(OPC);
    const fila = (k, cls) => `<label class="rmd-fila ${cls || ''}"><span>${etiqueta[k]}</span><input type="checkbox" data-k="${k}" ${opc[k] ? 'checked' : ''}></label>`;
    const p = document.createElement('details'); p.id = 'rmd-ui-panel';
    p.innerHTML = '<summary title="Mejoras de interfaz" aria-label="Mejoras de interfaz">' + ICONO_AJUSTES + '</summary><div class="rmd-panel-cuerpo">' +
      '<div class="rmd-panel-cab"><b>Mejoras de interfaz</b><span>v' + VERSION + '</span></div>' + fila('activo', 'maestro') +
      '<div class="rmd-panel-acciones"><button type="button" class="rmd-btn rmd-abrir-reglas" title="Crear, activar o editar tus reglas de revisión, exportarlas / importarlas y cargar la lista de documentos vigentes (se guardan solo en este navegador)">Reglas de revisión…</button><button type="button" class="rmd-btn rmd-mod-masivas" title="Suspender varios master o agregarles una observación (con el Guardar de Asociar fórmulas de cada uno)">Modificaciones masivas…</button></div>' +
      GRUPOS_PANEL.map(([t, ks]) => `<div class="rmd-grupo">${t}</div>` + ks.map((k) => fila(k)).join('')).join('') +
      '<div class="rmd-panel-pie"><span>Ctrl+K = Ir a… · Ctrl+S = Guardar</span><button type="button" class="rmd-btn rmd-restablecer">Restablecer</button></div></div>';
    const refrescar = () => p.querySelectorAll('input[data-k]').forEach((i) => { i.checked = !!opc[i.dataset.k]; });
    p.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return;
      e.stopPropagation(); opc[k] = e.target.checked; guardar(opc); aplicarClases();
      document.querySelectorAll('.sapMDialog th, .sapMDialog td').forEach((c) => { if (c.style.display === 'none') c.style.display = ''; });
      ajustarTodo();
    });
    p.querySelector('.rmd-mod-masivas').addEventListener('click', () => { p.open = false; abrirModificacionesMasivas('suspender'); });
    p.querySelector('.rmd-abrir-reglas').addEventListener('click', () => { p.open = false; abrirReglas(); });
    p.querySelector('.rmd-restablecer').addEventListener('click', () => { OPC.forEach(([k]) => { opc[k] = !APAGADAS_POR_DEFECTO.includes(k); }); guardar(opc); refrescar(); aplicarClases(); ajustarTodo(); });
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
