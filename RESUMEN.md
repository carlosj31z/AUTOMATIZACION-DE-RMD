# Investigación app «Solicitud» del portal RMD (solo lectura)

Fecha: 2026-11-13. Capturado desde el Chrome de pruebas (CDP 9222) con un cortafuegos `page.route`
que aborta todo POST/PUT/PATCH/MERGE/DELETE y todo `$batch` con escrituras. Peticiones bloqueadas: 0
(la app no intentó escribir nada). Registro completo: `red/peticiones.jsonl`.

## Dónde vive

- App UI5 `mif.rmd.solicitud` (UI5 1.84), servida en
  `/mif-apps-rmd-bs.mifrmdsolicitud/~<hash>~/` dentro del iframe `cp.portal/ui5appruntime.html`.
- Base para las llamadas: `https://medifarma-portal-prd-twuxor0u.cpp.cfapps.us10.hana.ondemand.com/mif-apps-rmd-bs.mifrmdsolicitud-1.0.0`
  - `/dest-apigateway/api/base/rmd/v2/browse/` → **OData v2 CAP (CatalogService)**, el de la lista. `$metadata`: `metadata/rmd_v2_browse_metadata.xml` (83 entity sets, function imports sharepoint*).
  - `/dest-apigateway/api/integracion/saperp/rmd/sap/opu/odata/sap/Z_PP_PRODUCCION_SRV/` (ProduccionSet) y `.../Z_PP_NECESIDADESRMD_SRV/` (SAP ERP). `$metadata` en `metadata/`.
  - `/dest-apigateway/api/compuesto/rmd/solicitud/maestro` → REST (GET) con catálogos y constantes (estados, roles, aplicaciones, motivos, secciones). Muestra: `muestras/maestro.json`.
  - `/dest-apiseguridad/useridp` → usuario logueado.
  - `/bpmworkflowruntime/v1/...` → SAP Workflow (solo se usa al aprobar/rechazar).
- Código fuente desempaquetado: `codigo/solicitud_fuente/mif/rmd/solicitud/` (controller/MainView.controller.js es el importante; vistas en view/). Bundle original: `codigo/Component-preload.js`.

## Lista («Lista Manufactura Digital»)

Arranca vacía: hay que elegir **Aplicación** (obligatorio) y pulsar **Ir** (FilterBar `search` → `onSearch`).
Aplicaciones: `SOLICITUD` = `3b5fc15f-3dcb-4c0f-8927-8ba26964da38`, `FLUJO DE REVISIÓN` (CONFIG) = `295fd633-d654-49b6-86a0-674611a3b783`.

Al elegir Aplicación (`onInitApp`) lee, por este orden: `USUARIO?$filter=correo eq '<mail>'`,
`USUARIO_SISTEMA?$filter=oSistema_sistemaId eq ...` (pagina de 1000 en 1000 con `$skiptoken`, varias páginas),
`UsuarioRol?$expand=oRol`, `RolAppAcciones?$expand=oMaestraAccion` → decide si el usuario es registrador /
aprobador / aprobador nivel 1-2-3.

Al pulsar Ir (`onRefreshSolicitud`):

```
GET .../v2/browse/MD
  ?$expand=estadoIdRmd,estadoIdProceso,sucursalId,motivoId,aStatusProceso,nivelId,destinatariosMD,destinatariosMD/usuarioId,aReceta,aReceta/recetaId
  &$select=terminal,fechaRegistro,...,mdId,codigo,codigoSolicitud,version,estadoIdRmd_iMaestraId,descripcion,sucursalId_iMaestraId,
           fechaSolicitud,motivoId_motivoId,observacion,estadoIdProceso_iMaestraId,motivoRechazo,wfInstanceId,areaRmdTxt,... (+ navegaciones)
  &$filter=codigoSolicitud ne null            ← app SOLICITUD
          (FLUJO DE REVISIÓN: estadoIdProceso_iMaestraId ne 456 and estadoIdRmd_iMaestraId eq 467)
          + filtros opcionales: substringof/contains codigoSolicitud, codigo, tolower(descripcion),
            sucursalId_iMaestraId eq, estadoIdRmd_iMaestraId eq, estadoIdProceso_iMaestraId eq, areaRmdTxt eq,
            fechaRegistro between
  (sin $top: si vienen 1000 filas sigue con $skiptoken=1000, 2000, ...)
```

Luego, en el navegador (no en el servidor): filtra por destinatario (`destinatariosMD/usuarioId/usuario`) y receta;
si el usuario es aprobador de nivel lee `MD_DESTINATARIOS?$filter=usuarioId_usuarioId eq <su id>` y sólo deja sus MD;
si es «APROBAR» ve todo; si es registrador ve los suyos. Calcula `tipoMD` (version 1 = «Nuevo RMD», si no «Nueva Versión»),
`concatDestinatarios`, fecha/usuario de aprobación (del `aStatusProceso` tipo SOLICITUD más antiguo).

Columnas: Código Solicitud, Código RMD, Nombre RMD, Tipo, Sección, Estado (estadoIdRmd/contenido), Estado Proceso,
Fecha Aprob./Rech., Planta (sucursalId/contenido), Motivo, Observación, Destinatarios (botón), Documento Adjunto (botón),
Usuario/Fecha envío a producción, Usuario Creador, Fecha Creación.

**Por qué es lenta:** trae TODOS los MD con `codigoSolicitud ne null` (sin $top) y con 10 expansiones,
incluidos todos los destinatarios con su usuario y todas las recetas, y pagina de 1000 en 1000; además, antes,
pagina `USUARIO_SISTEMA` entero. El filtrado por usuario se hace después en el navegador.

Medido hoy (ver `muestras/solicitud_lista_urls.txt`): con Aplicación = SOLICITUD la app pidió **6 páginas de MD**
(sin skiptoken y con `$skiptoken`=1000…5000) → unas **5 100 filas**. La última página (98 filas) pesa **3,1 MB**
(≈32 KB por fila por las expansiones `aStatusProceso`, `destinatariosMD/usuarioId`, `aReceta/recetaId`), así que la lista completa
son del orden de **150 MB** de JSON. Cada página llegó en 3-4 s una vez empezada; la primera tardó mucho más
(el servicio `v2/browse` estuvo muy lento hoy: su `$metadata` tardó de 0,5 s a más de 5 min según el intento).
Arranque de la app hasta poder usarla: ~25 s (Component-preload 6 MB a los 13 s, `maestro` a los 25 s) en la primera prueba.
Lo que pesa: las páginas de `MD` con 10 expansiones y sin `$top`; además las 3 páginas de `USUARIO_SISTEMA`.
Para la bandeja del userscript basta con `MD?$filter=estadoIdRmd_iMaestraId eq 464` (o los estadoIdProceso pendientes)
con `$expand=destinatariosMD/usuarioId,sucursalId,motivoId` y `$select` corto, o partir de
`MD_DESTINATARIOS?$filter=usuarioId_usuarioId eq <mi id>`.

Distribución en la página de muestra (98 filas): Suspendido 62, Solicitud Rechazada 11, Autorizado 10, Cancelado 10,
Solicitud Aprobada 2, Ingresado 2, Solicitado 1. Muestra de fila Solicitado: `muestras/solicitud_filas_estado_Solicitado.json`.

Estados (de `maestro`):
- estadoIdRmd: 464 Solicitado, 465 Autorizado, 466 Cancelado, 467 Iniciado, 469 Solicitud aprobada, 470 (rechazada; la app la pone a fuego).
- estadoIdProceso: 456 Pendiente, 457 En Producción (Jefe), 458 En Producción (Gerente), 459 Devuelto (Jefe),
  460 Devuelto (Gerente), 461 Aprobado (Gerente), 462 Aprobado por Jefatura DT, 463 Rechazado por Jefatura DT.
- Roles: RMD_JEFE_DE_PRODUCCION, RMD_GERENTE_DE_PRODUCCION, RMD_JEFATURA_DOCUMENTACION.

## Detalle (clic en la fila → `onPressMD`, diálogo DetailRMD)

- Destinatarios posibles: `GET ROLAPPWF?$expand=oRolWorkflow/aRolUsuarios/oUsuario&$filter=oAplicacion_aplicacionId eq <app> and oRol_rolId eq <rol>`
  (usuarios activos del rol del siguiente paso).
- Destinatarios del MD: vienen en `destinatariosMD` de la lista; en el popover: `GET MD?$filter=mdId eq <id>&$expand=destinatariosMD/usuarioId`.
- Adjuntos: function import **GET** `sharepointGet?idMd='{"idMd":"<mdId>","origen":"Solicitud"}'` (y `"Configuracion"` en flujo de revisión);
  devuelve JSON en texto con `d.results` (Name, ...).
- Descargar adjunto: **GET** `sharepointDownload?data='{"codigoRM":"<mdId>","Name":"<archivo>","origen":"..."}'`
  → devuelve el binario como cadena; la app lo pasa a `Uint8Array` → Blob → descarga con el nombre.
- `debeAprobar` = el usuario está en `destinatariosMD` y: estadoIdRmd = 464 (Solicitado), o proceso 457 y rol Jefe, o 458 y rol Gerente, o 461 y rol Jefatura DT.

## Aprobar (`onAprobarSolicitud`) — NO ejecutado, sólo leído del código

Exige destinatarios seleccionados y confirmación. Según el estado:

1. **Solicitud (estadoIdRmd 464)**: valida en Workflow que la tarea `usertask2` siga READY
   (`GET bpmworkflowruntime/v1/task-instances?workflowInstanceId=<wfInstanceId>`); si ya la completó otro, avisa y no hace nada.
   - `POST MD_ESTATUSPROCESO` {fechaRegistro, usuarioRegistro, activo:true, idProceso:uuid, mdId_mdId, tipo:"SOLICITUD"}
   - `MERGE MD('<mdId>')` {usuarioActualiza, fechaActualiza, estadoIdRmd_iMaestraId:469, wfInstanceId:null, estadoIdProceso_iMaestraId:456, motivoId_motivoId}
   - lee la tarea y su contexto, añade motivo (`GET MOTIVO`), `action:"A"`, nombre del aprobador y
     `PATCH bpmworkflowruntime/v1/task-instances/<taskId>` {status:"COMPLETED", context} (con X-CSRF-Token de `/bpmworkflowruntime/v1/xsrf-token`).
   - si version ≠ 1 copia estructuras de la versión anterior (`onRegistrarEstructurasNuevaVersion`).
2. **Flujo de revisión** (estadoIdProceso 457 → 458 con usertask6; 458 → 461 con usertask7; 461 → 462 con usertask8):
   - `POST MD_ESTATUSPROCESO` tipo "CONFIGURACION" con el nuevo estado, mensajeDT, observación.
   - `MERGE MD` con el nuevo estadoIdProceso; en el último paso además estadoIdRmd 465 (Autorizado), fechaAutorizacion, usuarioAutorizacion,
     `POST MD_TRAZABILIDAD` y guarda el archivo MD autorizado en `MD.archivoMD`.
   - salvo en el último paso, `POST MD_DESTINATARIOS` por cada destinatario elegido (tipo DGERPROD / DJEFDOCT).
   - completa la tarea del Workflow con `approverUserData.EMAIL` = correos de los destinatarios, `action:"A"`.

## Rechazar (`onRejectDialog` → `onRechazarSolicitud`)

Pide «Motivo de Rechazo» (texto obligatorio, máx. 1000).
- Solicitud (464): `MERGE MD` {estadoIdRmd_iMaestraId:470, motivoRechazo:<texto>, ...}, `POST MD_ESTATUSPROCESO` tipo SOLICITUD,
  completa `usertask2` con `action:"R"`.
- Revisión: 457 → 459 (usertask6), 458 → 460 (usertask7), 461 → 463 (usertask8); `POST MD_ESTATUSPROCESO` tipo CONFIGURACION con observacion = motivo,
  `MERGE MD` estadoIdProceso, completa la tarea con `action:"R"`.

Otras acciones del controlador: Nueva solicitud (`POST MD`, `POST MD_DESTINATARIOS`, `MD_RECETA`, sube adjuntos con
`sharepointFunction`, arranca workflow `fcp_wf`), Guardar edición (`onGuardarSolicitud`), Comparar versiones,
Exportar a Excel, eliminar adjunto (`sharepointDelete`).

## Archivos

- `red/peticiones.jsonl` — todas las peticiones (método, URL, estado, cuerpo de POST/$batch si hubo).
- `metadata/*.xml` — $metadata de los 3 servicios OData.
- `codigo/` — Component-preload.js, manifest.json, y el fuente desempaquetado.
- `muestras/` — maestro.json, lista (20 filas), detalle, columnas.
- `captura_*.png` — capturas.
- `registro/` — misma investigación para la app Registro (ver `registro/RESUMEN.md`).

## Configuración RMD (la app del userscript): ¿llega a los mismos servicios? (carpeta `configuracion/`)

- Su base es `/mif-apps-rmd-bs.mifrmdconfiguracion-1.0.0` (sessionStorage `mif.rmd.configuracion_ContextPath`). Sus dataSources son
  los mismos de Solicitud: `/api/base/rmd/v2/browse/`, Z_PP_PRODUCCION_SRV y Z_PP_NECESIDADESRMD_SRV (`configuracion/manifest.json`).
- **xs-app.json de Solicitud y de Configuración: idénticos** (`codigo/xs-app_solicitud.json` = `configuracion/xs-app.json`), con las rutas
  `/dest-apigateway/*`, `/dest-apiseguridad/*`, `/bpmworkflowruntime/*` (servicio com.sap.bpm.workflow, xsuaa), `/srv_api`, `/saperp`, `/scimApi` y `/IAS_API`.
- GET de prueba desde el iframe de Configuración:
  - `.../mifrmdconfiguracion-1.0.0/bpmworkflowruntime/v1/task-instances?$top=1&status=READY` → **200** en 0,2-0,7 s
    (devuelve una tarea `usertask2` del workflow `mif.rmd.solicitudrmd`, «Aprobación DT»; ver `configuracion/bpm_task_instances_top1_READY.json`).
  - `.../dest-apigateway/api/base/rmd/v2/browse/MD?$top=1` y `.../dest-apigateway/api/compuesto/rmd/solicitud/maestro` →
    **401 «Falta parametros de Auditoria : token»** porque los mandé sin cabeceras. La ruta existe y llega al gateway; hay que añadir
    `token`, `idtransaccion`, `aplicacion`, `usuario` y `fechatransaccion` como hace `utilHttp.generarHeaders` (el token sale de `modelGeneral>/token`).
    No reintenté con el token de la sesión. Configuración ya usa ese mismo gateway (sus recursos muestran `.../v2/browse/MD`, `USUARIO`,
    `api/compuesto/rmd/configuracion/maestro`), así que desde su iframe se llega con las mismas cabeceras que ya envía la app.
