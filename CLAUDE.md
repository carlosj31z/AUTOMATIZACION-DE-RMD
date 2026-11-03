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

## Estado al 2026-11-03

- Publicada en SharePoint: **1.114.0** (2026-11-03, 1 899 828 bytes). En la
  rama por defecto: 1.114.0. **La siguiente versión debe ser > 1.114.0**
  y construirse encima de la rama por defecto.
- En `DESKTOP-KJ339H3` el CLI instalado no trae `interfaz`: se corre desde la
  carpeta con `$env:PYTHONPATH="src"; python -m rmd_automation.cli interfaz
  publicar --archivo <archivo> [--subir]`. El control de permisos de Claude Code
  de esa PC lo frena como «despliegue a producción» salvo que Carlos lo
  autorice en el hilo o agregue la regla de permitir.
- 2026-11-02, v1.110.0 (PR #61): listado
  de caracterización identificado en el portal embebido en el script
  (`CARACT_LISTADO`, una línea por fila; se regenera desde la identificación con
  `generar_listado_js.js` de `/mnt/project-files/caracterizacion/`). «Enviar a
  Status RMD» lo manda (`caracterizacion`) a la pestaña CARACTERIZACIÓN de
  status-rmd (sin Excel). «Nueva Versión» de un producto del listado sin versión
  caracterizada → Motivo CARACTERIZACION puesto como «Editar RM» → Confirmar
  (`MERGE /MD('<mdId>')` con usuarioActualiza = `USUARIO.usuario` por correo).
  **Solo Planta 2** (`CARACT_MOTIVO_PLANTAS = ['P2']`): Carlos dejó P1 pendiente
  (2026-11-02); en SAP se marcaron solo las 78 versiones de LIMA (Motivo anterior
  guardado en `caracterizacion\marcar_resultado_*_LIMA.xlsx` de DESKTOP-KJ339H3).
  El Motivo CARACTERIZACION del catálogo: código 24,
  `6c7e87b8-b17f-493e-969b-7e09b574abce`.
- 2026-11-02, v1.111.0: tip para usuarios (aviso del Motivo CARACTERIZACION y
  «Observación masiva»): en vez de una versión nueva, escribir en Observaciones de
  la vigente «PENDIENTE BORRADOR CARACTERIZACION» (status-rmd la cuenta como
  caracterización pendiente: pestaña CARACTERIZACIÓN y Ruta 2) o «PENDIENTE MASIVO»
  (cuenta en el Backlog de INDICADORES desde nov-2026 hasta que haya otra versión;
  status-rmd PR #36). Los usuarios lo escriben; el script no lo graba solo.
- 2026-11-03, v1.112.0: el ingreso del borrador de Producción bloqueaba pasos y
  procesos menores de otra etiqueta que su lista; el editor del borrador elegía los
  procesos menores por texto de cualquier etiqueta. Ahora el editor se queda en la
  etiqueta de la lista y el ingreso pasa los de otra etiqueta a un paso del mismo
  texto de la etiqueta de la lista (existente o nuevo), con aviso.
- 2026-11-03, v1.113.0: Exportar → «V°B° última vs. penúltima» (el `vb-mes` en el
  portal); casilla «Distinguir tildes» en el borrador (`trabajo.tildes`, núcleo
  `PPN.tildes/igualTexto`); cuadro «Etiqueta distinta a su lista» en Ingresar en SAP
  (`plan.otraEtiqueta`); «Abrir como HTML» en la revisión del borrador (PDF → .html).
- 2026-11-03, v1.114.0: **regla de Carlos: en los textos de los pasos ninguna palabra
  lleva tilde** (la Ñ sí). El borrador marca en rojo cada palabra con tilde, avisa por
  paso y trae «Quitar tildes» (en la ventana del paso y en la barra para todo el
  borrador; activa «Distinguir tildes» para que el cambio llegue a SAP). En el portal,
  `reglasDeFila` marca la Descripción con tilde (también sale en la revisión del ingreso).
- Fusionados hace poco:
  - PR #54 – v1.106.0: pasos nuevos idénticos (misma sección + etiqueta + texto
    sin mayúsculas/espacios) se crean una sola vez en SAP.
  - PR #57 – v1.107.0 + v1.108.0 (incluye 1.106.0): aviso de Motivo
    CARACTERIZACION al crear una versión nueva, y «Enviar a Status RMD» manda la
    Trazabilidad de SAP (`MD_TRAZABILIDAD`, desde 01/01/2026).
  - PR #59 – v1.109.0: «Enviar a Status RMD» manda también `produccionEstado`.
  - Comando `vb-mes` del CLI (Excel mensual de RMD trabajados con el V°B° de la
    última y penúltima versión; las versiones Canceladas no cuentan).
- Abiertos en este repo: PR #22 (v1.83.1, CC y NC de P1/P2): antiguo; revisar
  si sigue vigente antes de tocarlo.
- status-rmd (`carlosj31z/REGISTRO-DE-MANUFACTURA-DIGITAL`), pestaña
  **INDICADORES** (PR #20–#25 fusionados):
  - Cuadro del mes con detalle por clic, «± Otros», % total y % del área,
    Horas efectivas. RUTA 1: «Programa N» (naranja) y «Backlog <mes> N» (azul),
    % Programa del mes y % Backlog DOC (autorizados del backlog en el mes /
    backlog al cierre del mes anterior; arranca en 0 cada mes).
  - Rango del Programa PLA = lunes de la semana de carga del Programa de
    Producción + 13 días; cuenta solo la última carga.
  - **Backlog = solo RMD Ingresados** (sin suspendidos ni solicitudes
    abiertas) + «Masivos pendientes» escritos a mano por mes y planta
    (`ind_horas_efectivas[mes][pl].ma`); se suman al mostrar, también en meses
    congelados. Acordado con Noelia el 2026-11-01.
  - **Meses cerrados congelados** (`porMes[mes][pl].cong`) con el primer
    cálculo tras el cierre; los cambios posteriores van a «± Otros» del mes
    siguiente. Solo vale si `previo.reglas === REGLAS_CUADRO` (hoy 3): **al
    cambiar reglas, subir `REGLAS_CUADRO`**. Octubre recongelado con reglas 3:
    backlog P1 171, P2 100 (cuadra con Noelia).
  - PR #14 («Por autorizar»): **en pausa**, falta el OK de la jefa de Carlos;
    no fusionar ni avanzar.
  - PR #19 (fases de Acuerdos: Cualquier fase / Fase 1 / Fase 2 incluye 2R):
    abierto, sin conflictos; es el mismo criterio que el portal (v1.103.2+).
- Pendientes conocidos:
  - Usar «Enviar a Status RMD» con datos reales para validar los números (y el
    ~72 de LIMA).
  - Futuro: marcar los masivos en SAP (acuerdo con Vanesa y Ximena) y quitar la
    marca al autorizar.
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
