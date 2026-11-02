# CLAUDE.md — Nota de traspaso del proyecto RMD

Contexto y reglas para quien continúe las mejoras (persona o Claude desde otra
cuenta). Escribir y responder siempre en **español**.

## Qué es esto

- Objetivo: automatizar el ingreso, la revisión y la autorización de **RMD**
  (Registros de Manufactura Digital) del portal SAP Fiori «Configuración RMD»
  de Medifarma. Ver `README.md` para la arquitectura (UI5 en BTP, OData, IAS).
- Dos piezas en este repo:
  - `src/rmd_automation/`: CLI en Python (Playwright) `rmd-automation`
    (ingreso por lotes, extracción, contingencia, publicación del userscript).
  - `tampermonkey/`: el **userscript de mejoras de interfaz**
    `rmd-ui-mejoras.user.js` (la mayor parte del trabajo actual) y su
    **cargador** `rmd-ui-mejoras-cargador.user.js`. El manual de cada mejora
    está en `tampermonkey/README.md`; las pruebas en `tampermonkey/pruebas/`.
- Rama por defecto: `claude/rmd-automation-ingreso-vh53j1`. Todo PR va contra ella.
- Página relacionada: `status-rmd.vercel.app` = repo
  `carlosj31z/REGISTRO-DE-MANUFACTURA-DIGITAL` (un solo `index.html`; Planta 1 =
  ATE, Planta 2 = LIMA). Acuerdos y otros datos compartidos viven ahí en una
  tabla clave-valor de Supabase.

## Versiones y publicación del userscript

- La versión va en `// @version` y en `const VERSION` (deben ser iguales),
  formato `x.y.z`.
- El cargador descarga el `.js` de **versión más alta** de la carpeta de
  SharePoint **MEJORAS DE INTERFAZ**. Subir un archivo ahí llega a **todos los
  usuarios**: es un paso que no se deshace con un clic.
- Al publicar: el archivo se llama `<versión>.js` (p. ej. `1.106.0.js`).
  **Nunca sobrescribir ni borrar** archivos existentes; siempre una versión nueva.
  `rmd-automation interfaz publicar` sin `--subir` solo simula; con `--subir` sube.
- Regla de Carlos: **al terminar una versión, SIEMPRE subir el último script a
  SharePoint**. (Igual hace falta su sesión iniciada en el Chrome de pruebas.)
- Cada versión nueva debe **incluir todo lo de las versiones menores
  pendientes**; si no, las tapa (el cargador solo toma la más alta).
- Con varios trabajos en paralelo, ponerse de acuerdo en cuál es la versión más
  alta en curso y construir encima de esa.
- El conector de Microsoft 365 no sirve para subir el script (límite 1 MB; el
  `.js` pesa ~1,8 MB). Se sube con la API de SharePoint desde el Chrome de
  pruebas con la sesión de Carlos.

## Reglas de interfaz (de Carlos)

- **No modificar las dimensiones de las ventanas** del portal. Única
  excepción: «Contingencia a SharePoint» puede ocupar toda la pantalla.
- **Nomenclatura / fase**: la fase de la versión nueva **no** se copia de la
  anterior; solo se muestra la fase anterior como referencia y el usuario
  elige. Excepción: «Cambio de material» sí copia la fase anterior.
- **«Vigente» = última versión Autorizada.**
- Estados de master: 465 Autorizado, 467 Ingresado, 468 Suspendido.
- **Observaciones (Asociar fórmulas)**:
  - Formato de CC aplicado: `26-379-CC/L.Fernandez/2026-10-22;Descripción;proceso;moderado`
    (a veces `//`, espacios o `proceso,moderado`).
  - Un CC cuenta como **aplicado** solo si la línea **empieza** con el CC. Si va
    «pendiente» antes, es pendiente. «No aplica» no cuenta como aplicado.
  - Pendientes reales: «PENDIENTE CC», «SE SUSPENDE POR <n>-CC», «CC LOTIZADO
    PEND». «SE SUSPENDE POR NUEVA VERSION / MIGRACION / AUDITORIA / NC» son
    motivos, no pendientes.
  - Los pendientes se heredan **solo de la versión inmediatamente anterior**.
  - «+ CC» ofrece elegir del listado de CC de la planta del RMD (Excel
    `1.-CC-NC-DES`, cargado en Reglas de revisión) o «Escribir otro».
  - El cuadro de Observaciones no debe pasar el alto de las otras columnas ni
    dejar espacios de sobra.
- **Insumos**: la cantidad de insumos **no se edita en el RMD** (se hace en la
  Lista de Materiales). La plantilla/borrador la permite con el aviso «se debe
  realizar en la Lista de Materiales» y no escribe en SAP.
- **Cambio de material**: Carlos no quiere versión nueva; el selector arranca
  en «Misma versión».
- **Contingencia** (SharePoint `.../04.-RMD/3.-CONTINGENCIA`): un PDF por RMD
  (master + receta si hay una fórmula; solo master si hay varias); al subir, el
  anterior pasa a la subcarpeta `OBSOLETO`. Separada por planta: Planta 1 = ATE
  («1.- PLANTA 1»), Planta 2 = LIMA («2.- PLANTA 2»).
- **Evidencias de CC**: solo subir a `.../04.-RMD/4.- EVIDENCIA CC Y NC MASIVOS/<CC>/Acción <n>/`
  con nombre `<RMD>-<etapa>-v<versión>-<archivo>`, sin sobrescribir.

## Cómo se prueba

- **Local (sin portal)**: `tampermonkey/pruebas/qa_local.py` y las pruebas
  `qa_*.mjs` / `qa_*.py`. En una sandbox: `pip install playwright` y usar el
  Chromium ya instalado (`executable_path`). Algunas pruebas usan OpenUI5 1.120
  de npm (en 1.120 el título del Dialog es `h1`; el portal usa `h2`).
- **Portal real**: un Chrome de pruebas con depuración remota en el puerto
  **9222** y perfil propio:
  `chrome.exe --remote-debugging-port=9222 --user-data-dir=data/perfil_chromium`
  (desde la carpeta del repo). **Carlos inicia sesión él mismo**; nunca pedir ni
  guardar contraseñas. Si abre el portal en su Chrome normal, pedirle que use la
  ventana de pruebas.
- El Chrome de pruebas **no tiene Tampermonkey**: el `.js` se inyecta a mano.
- `qa_estricto.py` trabaja contra el portal real; casi todos los bloques son de
  solo lectura con un cortafuegos que aborta escrituras. Ver
  `tampermonkey/pruebas/README.md`.
- El portal cierra la sesión a los ~35–40 min aunque haya actividad: las
  lecturas largas deben poder retomarse. La sesión de SharePoint también vence.
- RMD de pruebas indicado por Carlos: **2202609013** (Fabricación). Otros usados:
  2202609209 / 2202609224 (escenarios de ingreso), 2202608733 (borrador v6).
- **Escribir en el portal o en SharePoint** solo con autorización escrita de
  Carlos.

## PCs de Carlos

- `MIFPCWLIMAGG20` (trabajo): carpeta `Downloads\AUTOMATIZACION-DE-RMD-claude-rmd-automation-ingreso-vh53j1`.
  **No tiene Python, Node ni el CLI** `rmd-automation`: usar PowerShell y el
  Chrome de pruebas.
- `DESKTOP-KJ339H3`: carpeta `C:\Users\CARLOS\Downloads\AUTOMATIZACION RMD`.
- Quiere poder alternar entre las dos. Varios trabajos comparten la carpeta
  local: usar **worktrees** aparte por rama.

## PRs

- Carlos prefiere **un PR general** que junte varias mejoras cuando hay varios
  trabajos en paralelo.
- Cada PR describe la versión del script que trae y qué incluye de versiones
  anteriores.

## Borradores de Producción (.html)

- Un borrador `.html` = `<script id="rmd-datos">` (paquete gzip+base64 del RMD)
  + `<script id="rmd-borrador">` (JSON de cambios) + el editor. El editor viaja
  dentro del archivo: solo las plantillas nuevas traen las mejoras nuevas.
- Para pasar un borrador viejo a la versión actual se copian los dos primeros
  bloques y se reinyecta el editor y su CSS de la versión nueva (como hace
  `ppHtml` en el userscript).

## Estado al 2026-10-31

- Publicada en SharePoint: **1.108.0** (confirmado por Carlos). En la rama por
  defecto: 1.108.0. **La siguiente versión debe ser > 1.108.0** y construirse
  encima de la rama por defecto.
- Fusionados hace poco:
  - PR #54 – v1.106.0: pasos nuevos idénticos (misma sección + etiqueta + texto
    sin mayúsculas/espacios) se crean una sola vez en SAP.
  - PR #57 – v1.107.0 + v1.108.0 (incluye 1.106.0): aviso de Motivo
    CARACTERIZACION al crear una versión nueva, y «Enviar a Status RMD» manda la
    Trazabilidad de SAP (`MD_TRAZABILIDAD`, desde 01/01/2026).
- Abiertos en este repo:
  - PR #55: comando `vb-mes` (reporte mensual de V°B°).
  - PR #22 (v1.83.1, CC y NC de P1/P2): antiguo; revisar si sigue vigente.
- status-rmd (`carlosj31z/REGISTRO-DE-MANUFACTURA-DIGITAL`):
  - PR #20 y #21 fusionados: la pestaña Seguimiento RMD pasó a **INDICADORES**
    (formato PPTX de ATE, autorizados del mes vs backlog, cuadro del mes del área
    RMD con meta 80 %, detalle con Excel y PowerPoint, Ruta 2 = Motivo
    CARACTERIZACION de SAP); Producción/Forecast con una fila por etapa;
    estatus BORRADOR / INGRESAR / FLUJO SAP / CONTROL DE CAMBIO / POR REVISIÓN.
  - PR #14 («Por autorizar»): **en pausa**, falta el OK de la jefa de Carlos;
    no fusionar ni avanzar.
  - PR #19 (fases de Acuerdos): abierto.
- Pendientes conocidos:
  - **Insumo NUEVO en SAP**: en el Borrador de Producción el insumo nuevo
    queda «a mano» hasta capturar qué guarda «Agregar Insumo» del portal (probar
    en 2202609013). En SAP un insumo de paso es `MD_ES_PASO_INSUMO_PASO` con
    `estructuraRecetaInsumoId` + `Component/Maktx/CompUnit/cantidadInsumo`.
  - Probar la tabla INSUMOS con un RMD de Fabricación.
  - Probar «Actualizar» real de Cambio de material en un Autorizado (DMS).
  - Contingencia «Por código» sin prueba real.
- Mantener esta sección al día al publicar una versión o fusionar un PR.

## Datos que no van en el repo

- Nada de contraseñas, tokens, cookies ni sesiones. Las credenciales del CLI
  van en un `.env` local (ver `.env.example`), nunca en git.
- Los Excel de trabajo (listados de CC, vigentes, reportes) se cargan a mano
  en la interfaz y quedan en IndexedDB del navegador; no se suben al repo.
