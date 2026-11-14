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

## Empieza aquí (si llegas nuevo, sobre todo desde otra cuenta)

- **Trabajo en equipo de hoy: reducir los RMD pendientes.** Plan completo en
  `docs/plan_reduccion_pendientes.md` (glosario, criterio, cifras, qué es
  «actualizar», reparto, Chrome de pruebas, plantilla de reporte). Léelo entero
  antes de tocar un RMD.
- **Suspendidos → INACTIVO: todo en `docs/suspendidos_inactivo.md`.** Decisión
  final del equipo (2026-11-07, Excel «ANALISIS DE SUSPENDIDOS - decision del
  equipo 2026-11-07.xlsx», columna CONCLUSION, que manda): de **1 806**
  suspendidos (última versión de cada master), **1 328 pasan a INACTIVO** (ATE
  892, LIMA 436) y **478 siguen SUSPENDIDOS** (ATE 324, LIMA 154). INACTIVO es un
  status nuevo que hará TI; falta definir cómo se carga y aclarar dudas abiertas.
- Cifras viejas (no usar para decidir): la propuesta v2 del 2026-11-05 tenía base
  2 441, 1 349 a INACTIVO, 687 excluidos, 222 pendientes reales y 183 por
  revisar; el plan de pendientes y el piloto partieron de esas cifras.
- «Actualizar» = versión nueva Ingresada con la receta vigente, los CC
  pendientes y del listado aplicados, términos homologados en los pasos (sin
  tildes), 1.ª línea de Observaciones con la nomenclatura del usuario SAP que la
  hace y notas con los CC aplicados y lo que quede pendiente.
- Cada persona usa **su cuenta de Claude y su sesión de SAP**; la memoria de
  Claude no se comparte entre cuentas: lo compartido es este repo y la hoja de
  seguimiento (un reclamo por RMD, para no pisarse).
- **Homologación de pasos: `docs/homologacion_rmd.md`** (2026-11-09, de comparar 136 autorizados de fase 2 de ATE y
  LIMA con sus versiones anteriores y los 411 F2 de Envase y Acondicionado). La homologación se hace **cambiando el
  paso por el código vigente del maestro**, no editando el texto: tabla `src/rmd_automation/datos/homologacion_pasos.csv`
  y reglas de texto en `rmd_automation.homologacion` (`homologar`, `reemplazo_de_paso`). Ej.: 161493/1655 (PDSG-202) →
  182341 (PDOC-207); 31840 («hagan») → 62221 en ATE, 166452 en LIMA.
  **Regla permanente (CINTIA): todo ingreso automatizado, borrador o Edición rápida aplica estas reglas** (desde v1.132.0
  el userscript las avisa siempre). Al crear o editar un paso, primero el código vigente; nunca un paso viejo de la tabla.
- **Analizar e inferir con evidencia; lo que no quede claro se deja como
  CONSULTA** (columna Consultas de la hoja y sección del reporte) y se sigue con
  lo demás. Nunca se escribe en SAP un supuesto ni sin el OK escrito de la
  persona dueña de la sesión.

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
- **Insumos**: la cantidad de la **receta** (sección INSUMOS) **no se edita en el
  RMD** (se hace en la Lista de Materiales): la plantilla/borrador la permite con
  el aviso «se debe realizar en la Lista de Materiales» y no escribe en SAP.
  **Regla de Carlos (2026-11-11): la cantidad de un insumo dentro de un paso del
  PROCEDIMIENTO sí se cambia en el RMD** (`cantidadInsumo`), y los insumos
  agregados a un paso se graban como «Agregar Insumo» del portal (v1.136.0).
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

## Plantilla para Producción sin portal (2026-11-04)

- Pedido de Carlos para sustentar las plantillas a gerencia **sin mostrar las mejoras de interfaz**: página única
  `plantilla-autonoma/Generador de plantillas RMD.html` (PDF del master + Excel de Pasos de SAP → plantilla .html con el
  mismo editor). Se construye con `node construir.mjs` (copia `ppEditorApp`/`ppNucleo`/`PP_EDITOR_CSS` del userscript);
  al cambiar el editor del userscript hay que reconstruirla. No toca el userscript ni se sube a SharePoint.

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
  rama por defecto: 1.117.0. **La siguiente versión debe ser > 1.117.0**
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
- 2026-11-03, v1.115.0: **regla de Carlos: en un RMD Autorizado no se edita ninguna
  palabra de sus pasos ni de sus procesos menores.** «Editar Paso» (también desde
  «Procesos Menores para el Paso…») deja la Descripción de solo lectura con aviso
  (`bloquearTextoPasoAutorizado`), el Grabar envuelto no graba un texto cambiado
  (aunque «Editar paso con aviso» esté apagado) y «En minúsculas» se bloquea.
- 2026-11-04, v1.116.0: **regla de CINTIA: Karla Vanessa Moreno se muestra como Vanessa (VM), nunca Karla**
  (`usuarioVisible`, solo al mostrar; en SAP sigue KMORENOM). Igual en status-rmd (`AUTORIZADORES_SAP`).
- 2026-11-04, v1.117.0: **«Mis movimientos»** (Exportar y Ctrl+K, opción `mismov`): pedido de Carlos, los RMD en los que el usuario
  del portal hizo algo entre dos fechas (hoy por defecto) con su status de hoy y Excel. Lee MD (registro/actualización/autorización),
  MD_TRAZABILIDAD (usuarioRegistro + estado) y las filas de la estructura (`MISMOV_TABLAS`) filtradas por usuario y fecha en el servidor.
  Lógica en el bloque `==MISMOV==` (`pruebas/qa_mismov.mjs`); ventana en `pruebas/qa_mismov_ventana.py`.
- 2026-11-04, v1.118.0 (PR #72): «Generar plantilla» con más de una receta asociada pregunta con cuál se emite.
- 2026-11-04, v1.119.0: **pedido de Carlos: la detección de tildes queda APAGADA por defecto** (se usa poco y daba
  avisos incoherentes). Opción `detectartildes` del panel («Detectar tildes en los pasos», en `APAGADAS_POR_DEFECTO`):
  apagada, el portal no marca la Descripción con tilde (`reglasDeFila`) ni la revisión del borrador avisa tildes, y la
  casilla «Distinguir tildes» se oculta (salvo que el borrador la traiga activada). Núcleo: `PPN.detectarTildes(v)`
  (falso por defecto: `palabrasConTilde`/`tildesEn` no marcan nada). En el editor del borrador hay una casilla
  «Detectar tildes» (apagada; se recuerda en el navegador con `rmdPlantillaDetectarTildes`). La regla de pasos sin
  tilde sigue: quien quiera la ayuda la enciende.
- 2026-11-05, v1.120.0: **pedido de CINTIA (reporte diario de actividades)**: «Mis movimientos» muestra **Autorizado en SAP**
  (MD.fechaAutorizacion + usuarioAutorizacion, `misMovAutSap`; fecha 00:00 UTC = solo el día) en la tabla y el Excel, y el botón
  **Copiar para el reporte** (filas TSV sin títulos, `misMovTextoReporte`).
- 2026-11-05, v1.121.0 (encima de la 1.120.0): **regla de CINTIA: KARLA VANESSA MORENO MORALES es «Vanessa», nunca Karla**, también en el
  saludo, las iniciales (VM) y «V.Moreno» de las líneas de CC (`personaPortal`, `esVanessa`, `sinKarla`). **Sin revisión de la hoja de ruta**
  (`REVISAR_HOJA_RUTA = false`; lo guardado con tipo `ruta` se ignora con `rsSinRuta`). Menú Exportar por secciones y «Mis movimientos»
  en el panel (Ctrl+K sigue retirado desde la v1.57).
- 2026-11-05, v1.122.0 (encima de la 1.121.0, mismo PR #76): **pedido de CINTIA: bandera ⚑ en cada CC de «Controles de Cambios»** y pestaña
  **«Seguimiento CC»** (entre CC y Acuerdos) para asociar a mano los RMD impactados y ver si ya ejecutaron el CC (automático = versión de hoy
  Autorizada con el CC aplicado en Observaciones; o a mano). Asociar desde Observaciones, «Mis movimientos» o buscando; «Copiar para el cuadro»
  y Excel (`SeguimientoCC.COLS`). Se guarda en Supabase de status-rmd, fila `ccseguimiento:<carpeta del CC>` (relee antes de guardar,
  `segCambiar`); no escribe en SAP. Opción `seguimientocc`. Lógica en el bloque `==SEGCC==` (`pruebas/qa_seguimiento_cc.mjs`); prueba en el
  portal real sin escrituras: `pruebas/qa_seguimiento_portal.py` (cortafuegos + status-rmd simulado).
- 2026-11-06, v1.123.0: **pedido de Carlos: «Vista simple de ingreso»** (opción `vistasimple`, Exportar → Herramientas): el editor del borrador
  dentro del portal (capa a pantalla completa con iframe `srcdoc`, `montarVista`/`window.__rmdVistaEmb`), leído de SAP, con **vista completa de DT**
  por defecto (campo `dt` por paso/proceso menor: tipo, decimales, Depende, Clave Modelo, Puesto, casillas, color; núcleo `DT_CAMPOS`/`avisosDt`,
  `accion:'config'`). «Guardar en SAP…» reusa revisión/ingreso del borrador; ops nuevas «Configuración» (`ppDtEscritura`, reglas del Grabar del portal:
  color `formato`+`colorHex` minúsculas+`colorRgb`; `clvModelo`/`puestoTrabajo`/`automatico` solo con tipo 447; `tipoDatoIdAnterior` = `tipoDatoId`) y
  «Predecesor» (fase 5). `PPN.huella` no incluye `dt` (las plantillas viejas siguen valiendo). Prueba `qa_local.py` LN57.
- 2026-11-06, v1.124.0: pedido de Carlos: la vista se llama **«Edición rápida»** y está en el **menú de cada fila, debajo de «Configurar el RMD»**
  (`menuVistaEnFilas`, `sap.m.MenuItem` con `__rmdVista`; ya no en Exportar). **Observaciones en la vista** en lugar de «Cómo se usa» (`ppObsEmb`
  en el portal: nomenclatura, listado de CC, pendientes heredados; `W.obs` en el editor); se guardan con `ppGuardarObs` = `modificarUno(..., { reemplazar })`
  (Guardar de «Asociar fórmulas») al final del ingreso. **Regla de Carlos: los pasos de RENDIMIENTO y CONDICIONES AMBIENTALES no llevan predecesor**
  (`PPN.listaSinPredecesor`: aviso, «Paso anterior» y cadena automática del plan). Prueba `qa_local.py` LN58.
- 2026-11-07, v1.125.0: pedido de Carlos: en **«Última versión de cada master»** la fecha de los Suspendidos sale de la **última
  «Suspendido» de `MD_TRAZABILIDAD`** (`ultimaSuspensionDeTraz`, `fechaSuspUV`; antes `fechaActualiza`), columna «Última suspensión
  (trazabilidad)», y hoja nueva **«Solicitados»** (Solicitado + Solicitud Aprobada, `ESTADOS_SOLIC_UV`, `ultimasVersiones(...).solicitados`)
  con la última versión de su master. Prueba `qa_local.py` LN25g.
- 2026-11-07, v1.126.0 (incluye la 1.125.0): pedido de Carlos (criterio del equipo): hoja **«Solicitados del mes»** en «Última versión de
  cada master» (`solicitadosDelMes(linajes, susp, anio, mes)`, `ultimasVersiones(...).linajes`): entra lo **registrado en el mes**
  (`fechaRegistro`, sin Cancelado ni Solicitud Rechazada), se **quita** si alguna versión del linaje se suspendió el **mes anterior**
  (trazabilidad) y se **suma** el master con última versión Suspendida en el mes aunque no tenga versión nueva (una vez por master).
  Columna «Solicitado de <mes>» en Pendientes y Solicitados. Prueba `qa_local.py` LN25h.
- 2026-11-07, v1.127.0 (incluye la 1.126.0): **pedido de CINTIA: INACTIVO solo a la vista.** Los 1 313 `md_id` «listo = SÍ» de
  `docs/rmd_a_inactivo_2026-11-07.csv` van embebidos (bloque `==INACTIVOS==`, `INACTIVO_IDS_HEX`, sin nombres; se regenera con
  `analisis/suspendidos_inactivo/generar_inactivos_js.mjs`). Si siguen Suspendidos se ven INACTIVO en la lista principal
  (`inactivoEnLista`, solo el texto del DOM) y la cabecera, y salen INACTIVO en Exportado original (copia de las filas en
  `Spreadsheet.build`), Última versión (`marcarInactivosUV`: solo la última versión; fuera de Pendientes) y Mis movimientos. Nada se
  escribe en SAP ni en el modelo; «Enviar a Status RMD» no cambia. Opción `inactivovista`. Pruebas `qa_inactivos.mjs` y `qa_local.py` LN25i.
  1.127.0 publicada en SharePoint el 2026-11-07 (2 122 247 bytes; la subió CINTIA).
- 2026-11-07, v1.127.1: **la etiqueta del Estado en la cabecera también en RMD con código corto** (1–5 dígitos, `CODIGO_CORTO`, solo en
  `decorarCabeceras`; los demás ajustes siguen en `GESTIONADAS`). Prueba `qa_local.py` LN25j.
- 2026-11-07, v1.128.0 (incluye la 1.127.1): **pedido de CINTIA: «Cambiar paso» sugiere pasos similares** (solo de la misma etiqueta,
  regla de CINTIA) con uso en masters Autorizados/Ingresados (`usoDePasos`), fecha y creador (`nombresCreadores`) y orden «Sugerido»
  (`puntuarSugerencias`: parecido 55 %, uso 30 %, mismo tipo de dato, sin tildes). Encaje de ventanas: `encajarEnPantalla` (clase
  `rmd-encajada` en `.rmd-modal` que no cabe; menús flotantes se corren). Prueba `pruebas/qa_pasos_similares.py`.
- 2026-11-09, v1.129.0 (incluye la 1.128.1): **pedido de CINTIA: Edición rápida más limpia**, probada en el portal (RMD 2202609013):
  «Guardar en SAP…» directo a «Ingresar en SAP» (`vistaGuardar`; revisión solo si hay algo que decidir), errores heredados de SAP no
  frenan (`erroresIniciales`/`erroresPropios` en el editor, `ppErroresDeCambios` en el portal), aviso de éxito del portal aceptado solo
  (`responderMensajesPortal`), Deshacer con Observaciones, vista releída al cerrar el ingreso, fuera «Guardar borrador»/«Comentar» y
  duplicados de ⚙ Configuración en la vista; `[hidden]` respetado en el CSS del editor.
  Uso de cada paso sugerido (Aut./Ing.) con `usoDePasosPorCodigo` (`emb.uso`); casilla «Vista completa (DOC)» (pedido de CINTIA).
  **Regla de CINTIA: «VM» solo en Observaciones; en la Edición rápida y las plantillas («Estado / Fecha / Por», `ppEstadoFechaPor`) va KMORENOM.**
  Configuración rápida del tipo de dato (clic en su etiqueta) y «Depende» visible a la izquierda con selector (pedidos de CINTIA).
  1.129.0 publicada en SharePoint el 2026-11-09 (2 192 463 bytes). PR #88 (también lleva 1.129.1 y 1.130.0).
- 2026-11-09, v1.129.1: configuración del paso seleccionado fija en el panel de la Edición rápida (`htmlSelCfg`/`cambioSel`), pedido de CINTIA.
- 2026-11-09, v1.130.0 (incluye 1.129.x): atajos de teclado en la Edición rápida, sin chip «Depende» repetido, caché de Claves Modelo y borrador importado abierto en la Edición rápida (sin «Abrir como HTML»), pedidos de CINTIA.
  1.130.0 publicada en SharePoint el 2026-11-09 (2 182 892 bytes).
- 2026-11-09, v1.131.0: flechas y resaltado de Depende en la Edición rápida (pedido de CINTIA).
  1.131.0 publicada en SharePoint el 2026-11-09. v1.131.1: sin flechas ni resaltado (CINTIA los vio innecesarios); queda la etiqueta «↳» con ✕/⚠ y título.
- 2026-11-09, v1.131.2: «Importar borrador» lee PDFs vueltos a guardar (flujo comprimido con salto de línea antes de `endstream` y
  direcciones `RMDPDF1` partidas con «\» + salto de línea). Caso: SINCOL NF 2202505045 v5. PR #91.
- 2026-11-09, v1.132.0 (incluye 1.131.1): **pedido de CINTIA: las reglas de homologación se tienen en cuenta siempre.** La revisión del
  borrador y de la Edición rápida (`PPN.avisos`, con `ctx.planta`) avisa «Por homologar» si el paso está en la tabla (`homologacionPaso`) y
  «Términos por homologar» si el texto trae términos viejos (`homologarTexto`). Bloque `==HOMOLOG==` de `ppNucleo`, generado con
  `analisis/homologacion/generar_homologacion_js.py`: **al cambiar la tabla o las reglas de Python, regenerarlo**. Prueba `qa_homologacion.mjs`.
  1.132.0 publicada en SharePoint el 2026-11-09 (2 230 682 bytes). PR #90.
- 2026-11-09, v1.132.1 (1.132.0 + 1.131.2): la 1.131.2 no se pudo publicar porque en SharePoint ya estaba la 1.132.0; esta las junta.
- 2026-11-10, v1.133.0 (PR #94): importar un borrador cuando SAP regeneró los ids del mismo RMD.
- 2026-11-11, v1.134.0 (incluye 1.133.0): **pedido de Carlos: plantilla para Producción más simple.** En la plantilla (`PROD = !EMB` en
  `ppEditorApp`) `PPN.avisos` va con `ctx.modo = 'produccion'`: solo errores y avisos de `AVISOS_PRODUCCION` (existe, dup, ceo, doc,
  registro, cant, rango); sin homologación salvo Calidad en Operaciones (`pasosCeo`, botón «Usar paso homologado»), sin info ni tildes.
  **Paso nuevo: Producción elige qué anota** (`REGISTROS`/`registroDe`/`registroDeTipo`; campo `registro` + `tipo`/`decN`/rango): obligatorio
  en la plantilla, el ingreso crea el paso con ese tipo. **Documentos vencidos** (`mapaDocs`/`docVencido`): la lista de Reglas de revisión
  viaja en el paquete (`paq.docs`). Importación: filtros por partes y «Producción anota». Prueba `qa_plantilla_produccion.mjs`.
  1.134.0 publicada en SharePoint el 2026-11-10 (2 238 783 bytes).
- 2026-11-11, v1.135.0 (encima de la 1.134.0): **pedidos de Carlos para la plantilla de Producción**: un paso que ya existe en SAP y se agrega al RMD
  también se configura («¿Qué anota?»; el ingreso escribe solo una operación «Configuración» de esa fila con `x.dt.solo`, ver `dtNuevo`);
  sin íconos en los botones de tipo de dato; la vista previa «Así se verá» usa los decimales elegidos (`previaRegistro(k, dec, vi, vf)`). Prueba `qa_local.py` LN60.
- 2026-11-11, v1.135.1 (probada en el portal en solo lectura con 2202609013): la importación también muestra «Producción anota» en el paso existente
  configurado; la operación «Configuración» de un paso agregado dice «agregado» y con `x.dt.solo` no toca Clave Modelo/Puesto/Automático salvo tipo 447.
- 2026-11-11, v1.135.2 (encima de la 1.135.1): **INACTIVO a la vista con los 1 336 de la decisión final** (ATE 900 / LIMA 436, hoja «3 Suspendidos vs
  INACTIVOS» del Excel de backlog de noviembre). Antes eran 1 313 (CSV del 07/11). Nuevo listado `docs/rmd_a_inactivo_2026-11-09.csv`; los 10 sin
  `md_id` salieron de la lectura del portal del 09/11 (`mes_de_pendientes_v2.csv`); MEJORAL MIGRAÑA 2202505691 v2 tiene dos MD en el portal: va el Suspendido.
- 2026-11-11, v1.135.3: **pedido de Carlos: INACTIVO = los 1 328 del análisis de suspendidos (ATE 892 / LIMA 436)**; del análisis solo valen los
  INACTIVO (los suspendidos son los de hoy en SAP). Se quitan de la 1.135.2 los 8 de ATE que REVISAR 8 había sumado (15013, 17154, 17196, 17470,
  18195, 18396, 19238, 19290). Listado `docs/rmd_a_inactivo_2026-11-11.csv`. status-rmd usa la misma lista (PR #61).
- 2026-11-11, v1.135.4: «Enviar a Status RMD» manda en la columna linaje el master como lo arma «Última versión de cada master»
  (`M:<código>`, `ultimasVersiones`; SELECT_MD con `mdIdVersionAnt` y `sucursalId_iMaestraId`), para que el Resumen del Excel de status-rmd
  cuadre exacto con ese exportado (status-rmd PR #63).
- 2026-11-11, v1.136.0 (encima de la 1.135.4): **pedido de Carlos (ACNOMEL CRM 2202609431): el ingreso del borrador graba los insumos de los pasos.**
  El cambio de cantidad de un insumo en un paso escribe `cantidadInsumo` de su fila (antes quedaba a mano con el aviso de Lista de Materiales);
  el insumo agregado (en un paso existente o nuevo) se graba como `onAsignInsumoToPaso` del portal: MERGE a `MD_ESTRUCTURA('<id>')` con
  `aPasoInsumoPaso` (insumo de la receta del RMD destino de `MD_ES_RE_INSUMO` por id o componente, `Component/Matnr/Maktx/CompUnit`, tipo de dato
  de los insumos del RMD o 438, 3 decimales) y luego, como `onSaveCantidadRm`, `MD_ES_RE_INSUMO.cantidadRm` = suma de lo usado en los pasos.
  Un insumo que no está en la receta bloquea. `ppSinInsumosNuevos` ya no se usa en el ingreso. Prueba `qa_local.py` LN61.
  **La siguiente versión debe ser > 1.136.0.**
- 2026-11-13, v1.137.0 (encima de la 1.136.0): **pedido de Carlos: no debe haber error en las fórmulas (RENDIMIENTO 4.5.1 en adelante) al importar
  un borrador.** `ppPlanEscritura` lee `MD_ES_FORMULA_PASO` de los pasos «Fórmula» (445) del destino: un «Cambiar» de una fila que es término agrega
  op «Fórmula» que actualiza `valor` al código nuevo (`valorItem` si el paso se crea en el mismo ingreso); términos con `valor` viejo se corrigen;
  filas término con tipo no numérico pasan a 438 (3 decimales) y la fórmula se queda en 445 (`fxTipo`); quitar un término bloquea; insumo agregado
  del mismo material que suma una fórmula va a tareas manuales.
  Prueba `tampermonkey/pruebas/qa_formulas_ingreso.mjs`. **La siguiente versión debe ser > 1.137.0.**
- 2026-11-14, v1.138.0 (encima de la 1.137.0): **pedido de Carlos: campanita con bandeja de solicitudes y un ícono aparte para buscar por lote.**
  Módulo `crearBandeja(D)` entre `// ==BANDEJA-INICIO==` y `// ==BANDEJA-FIN==`. Usa el modelo `mainModelv2` de Configuración (es el mismo backend que la app Solicitud).
  Lista paginada de 40 (`$orderby fechaRegistro desc`, búsqueda con Contains). «Por aprobar» filtra con `puedoAtender`: solo los Solicitado (464) donde eres destinatario y aprobador de RolAppAcciones. Carlos pidió que solo los Solicitado se aprueben o rechacen, sin «te toca», sin nada genérico y con los destinatarios resumidos.
  Aprobar y rechazar son un port de `onAprobarSolicitud`/`onRechazar`, incluido `registrarEstructurasNuevaVersion` cuando la versión es distinta de 1. La tarea del workflow se completa con `bpmworkflowruntime` del approuter.
  Buscar por lote: `NECESIDADESRMD_SRV/OrdenSet`, luego RMD por productoId + ordenSAP, solo lectura.
  Prueba `tampermonkey/pruebas/qa_bandeja.py` (SAP simulado, 37 pruebas). El hilo de especificaciones y equipos usa la 1.139.0. **La siguiente versión debe ser > 1.138.0** (o > 1.139.0 si ya se fusionó).
- 2026-11-14, v1.138.1 (encima de la 1.138.0): **pedidos de Carlos.** La bandeja es solo de solicitudes: sin flujo de revisión ni en la interfaz ni en el código. Quitar lo que parezca hecho con IA: estilo de lista Fiori, sin tarjetas, píldoras, animaciones ni barras de carga.
  Buscar por lote trae los documentos del reporte original: OPP (`pdfDeOrden`: IMPRESIONORD con `modeloErp.getHeaders()`), RMO y Descargar RMO (`generarRmo`: carga `table.onGeneratePdf` de Registro con `sap.ui.loader.config`; `datosRmo` es el port de `onGetPdfViewerRmo`; 'BASE64' para abrir en una pestaña).
  Mecanismos probados en el portal real en solo lectura (RMD 2202608488 v8, órdenes 2100033070 y 2100033188). **La siguiente versión debe ser > 1.138.1** (o > 1.139.x si ya se fusionó).
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
  - Insumo agregado desde el borrador (v1.136.0): falta la primera prueba real con
    escritura (ACNOMEL CRM 2202609431, alcohol en 4.4.23/24/31/32).
  - Probar la tabla INSUMOS con un RMD de Fabricación.
  - Probar «Actualizar» real de Cambio de material en un Autorizado (DMS).
  - Contingencia «Por código» sin prueba real.
- 2026-11-05/07: **suspendidos → INACTIVO**, decisión del equipo 1 328 a
  INACTIVO / 478 siguen suspendidos (ver `docs/suspendidos_inactivo.md`;
  archivos en la carpeta del proyecto `suspendidos-inactivo/`, scripts en
  `analisis/suspendidos_inactivo/`) y **plan de reducción de pendientes en equipo**
  (`docs/plan_reduccion_pendientes.md`, hoja inicial en `plan-pendientes/`).
  Piloto de 10 RMD de prioridad alta en curso con Carlos: lo que decida (sobre
  todo la lista de términos homologados) manda sobre el plan.
- Mantener esta sección al día al publicar una versión o fusionar un PR.

## Datos que no van en el repo

- Nada de contraseñas, tokens, cookies ni sesiones. Las credenciales del CLI
  van en un `.env` local (ver `.env.example`), nunca en git.
- Los Excel de trabajo (listados de CC, vigentes, reportes) se cargan a mano
  en la interfaz y quedan en IndexedDB del navegador; no se suben al repo.
