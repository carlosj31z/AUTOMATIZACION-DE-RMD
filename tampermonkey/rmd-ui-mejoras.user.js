// ==UserScript==
// @name         RMD · mejoras de interfaz (Configuración RMD)
// @namespace    medifarma.rmd
// @version      1.0.0
// @description  Enter = "Ir" en filtros, diálogos anchos, columnas ordenadas, cabecera fija y otros ajustes de lectura en Configuración RMD. Solo cambia la vista: no guarda ni modifica datos.
// @match        https://*.hana.ondemand.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  // Solo actúa dentro del iframe de la app UI5 (ui5appruntime.html); en el resto de la página no hace nada.
  if (!/ui5appruntime/.test(location.pathname)) return;
  if (window.__rmdUiMejoras) return;
  window.__rmdUiMejoras = true;

  const CLAVE = 'rmdUiMejoras';
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
  const guardar = (o) => { try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } };
  const opc = Object.assign({ activo: true, ancho: true, columnas: true, enter: true, zebra: true }, leer());

  // ---- 1. Enter en un filtro = pulsar "Ir" ------------------------------------------------------
  function botonIr(desde) {
    // Pantalla principal: barra de filtros con id terminado en -btnGo. Diálogos: botón de texto "Ir".
    const raiz = desde.closest('[role=dialog]') || document;
    return (
      raiz.querySelector('[id$=btnGo]') ||
      [...raiz.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === 'Ir')
    );
  }
  function pulsar(btn) {
    const id = btn.id.replace(/-inner$/, '');
    const ctl = window.sap && sap.ui && sap.ui.getCore && sap.ui.getCore().byId(id);
    if (ctl && ctl.firePress) ctl.firePress(); else btn.click();
  }
  document.addEventListener('keydown', (e) => {
    if (!opc.activo || !opc.enter || e.key !== 'Enter' || e.isComposing) return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.type === 'checkbox' || t.type === 'radio' || t.readOnly) return;
    if (t.getAttribute('aria-expanded') === 'true') return;       // lista desplegada: Enter elige la opción
    if (t.closest('table') && !t.closest('[role=search]') && !/(filter|search|bar)/i.test(t.id)) {
      // Entradas dentro de la tabla de pasos (Orden, Decimal…): Enter no debe disparar una búsqueda.
      if (!t.closest('.sapUiCompFilterBar, .sapUiCompSmartFilterBar')) return;
    }
    const btn = botonIr(t);
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    // Que UI5 registre el texto escrito antes de buscar.
    t.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => pulsar(btn), 60);
  }, true);

  // ---- 2. Estilos: diálogos anchos, cabecera fija, filas legibles ------------------------------
  const CSS = `
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog):not(.sapMPopover) {
    width: 98vw !important; max-width: 98vw !important;
    height: 94vh !important; max-height: 94vh !important;
    left: 1vw !important; top: 3vh !important;
  }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) .sapMDialogScroll { min-height: 0; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) table.sapMListTbl { table-layout: fixed; width: 100% !important; }
  /* cabecera de columnas visible al desplazar */
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) thead th { position: sticky; top: 0; z-index: 3; background: var(--rmd-th, #1f2229); }
  /* filas: más aire y separación */
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB > td { padding-top: 7px; padding-bottom: 7px; vertical-align: middle; }
  html.rmd-ui .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:hover > td { background: rgba(80,160,255,.12) !important; }
  html.rmd-ui.rmd-zebra .sapMDialog:not(.sapMMessageDialog) tbody tr.sapMLIB:nth-child(odd) > td { background: rgba(255,255,255,.035); }
  /* la descripción respira: texto legible y sin cortar */
  html.rmd-ui .sapMDialog td .sapMText, html.rmd-ui .sapMDialog td .sapMLabel { white-space: normal; line-height: 1.35; }
  /* campo enfocado bien visible */
  html.rmd-ui .sapMDialog input:focus { outline: 2px solid #3aa0ff !important; outline-offset: 0; }
  /* panel propio */
  #rmd-ui-panel { position: fixed; right: 10px; bottom: 10px; z-index: 99999; font: 12px system-ui, sans-serif;
    background: rgba(20,22,27,.92); color: #e8eaed; border: 1px solid #444; border-radius: 8px; padding: 4px 8px; }
  #rmd-ui-panel summary { cursor: pointer; list-style: none; }
  #rmd-ui-panel label { display: block; margin: 3px 0; cursor: pointer; }
  `;
  const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
  const html = document.documentElement;
  function aplicarClases() {
    html.classList.toggle('rmd-ui', !!(opc.activo && opc.ancho));
    html.classList.toggle('rmd-zebra', !!(opc.activo && opc.zebra));
  }

  // ---- 3. Anchos de columna por nombre de cabecera ---------------------------------------------
  // La descripción no tiene ancho fijo: se queda con lo que sobra. Las demás se compactan.
  const ANCHOS = {
    'ORDEN': 64, 'DEPENDE': 150, 'CÓDIGO': 84, 'CODIGO': 84, 'ITEMS': 64, 'REPITE': 72, 'NUM.': 64,
    'TIPO DATO': 160, 'CLAVE MODELO': 120, 'PUESTO TRABAJO': 130,
    'VAL. INICIAL': 96, 'VAL. FINAL': 96, 'MARGEN': 84, 'DECIMAL': 82,
    'ESTADO CC': 60, 'ESTADO MOV.': 64, 'PM OP': 56, 'GEN PP': 56, 'EDIT': 50, 'R. POR': 56, 'V.B.': 50,
    'IMAGEN': 64, 'FORMATO': 64, 'PROC. MEN.': 70, 'ESTADO': 74, 'ACC.': 200,
  };
  function ajustarTabla(tabla) {
    const ths = [...tabla.querySelectorAll('thead th')];
    if (ths.length < 6) return;
    let hayDescripcion = false;
    ths.forEach((th) => {
      const nombre = th.textContent.trim().replace(/\s+/g, ' ').toUpperCase();
      if (/^DESCRIPCI/.test(nombre)) { th.style.setProperty('width', 'auto', 'important'); th.style.setProperty('min-width', '380px', 'important'); hayDescripcion = true; return; }
      const w = ANCHOS[nombre];
      if (w) { th.style.setProperty('width', w + 'px', 'important'); th.style.setProperty('min-width', w + 'px', 'important'); }
    });
    tabla.dataset.rmdAjustada = hayDescripcion ? '1' : '0';
  }
  function ajustarTodo() {
    if (!(opc.activo && opc.columnas)) return;
    document.querySelectorAll('.sapMDialog table.sapMListTbl').forEach(ajustarTabla);
  }
  let pendiente = false;
  new MutationObserver(() => {
    if (pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; ajustarTodo(); });
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 4. Foco automático en el primer filtro de los selectores --------------------------------
  new MutationObserver((muts) => {
    if (!opc.activo) return;
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof HTMLElement)) continue;
      const d = n.matches && n.matches('.sapMDialog') ? n : n.querySelector && n.querySelector('.sapMDialog');
      if (!d || d.classList.contains('sapMMessageDialog')) continue;
      setTimeout(() => {
        if (!botonIr(d)) return;                       // solo los diálogos con filtro + "Ir"
        const i = [...d.querySelectorAll('input[type=text]')].find((x) => x.offsetParent && !x.readOnly);
        if (i) i.focus();
      }, 350);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ---- 5. Panel para activar/desactivar cada mejora --------------------------------------------
  function panel() {
    const p = document.createElement('details'); p.id = 'rmd-ui-panel';
    const items = [['activo', 'Mejoras activas'], ['enter', 'Enter = Ir'], ['ancho', 'Diálogos anchos'], ['columnas', 'Columnas ordenadas'], ['zebra', 'Filas alternas']];
    p.innerHTML = '<summary>UI+</summary>' + items.map(([k, t]) => `<label><input type="checkbox" data-k="${k}" ${opc[k] ? 'checked' : ''}> ${t}</label>`).join('');
    p.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return;
      opc[k] = e.target.checked; guardar(opc); aplicarClases();
      if (k === 'columnas' || k === 'activo') ajustarTodo();
    });
    document.body.appendChild(p);
  }
  aplicarClases(); panel(); ajustarTodo();
})();
