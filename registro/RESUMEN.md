# App «Registro» (mif.rmd.registro): investigación del código, solo lectura

**No se pudo abrir la app en vivo.** Al abrir pestañas nuevas, el portal se quedó colgado: `cp.portal/portal/rest/v1/site` tardó 150 s
y la app no llegó a arrancar en dos intentos de 5 min (ver `captura_registro_inicial.png` y `red/peticiones.jsonl`).
No hay muestra JSON ni captura de la lista.
El código (manifest.json, xs-app.json y Component-preload.js completo) lo bajé con GET estáticos desde el iframe ya abierto de
Configuración. Está en `codigo/`, y el fuente desempaquetado en `codigo/fuente/mif/rmd/registro/`.

## Servicios (manifest)
- `mainModelv2` `/api/base/rmd/v2/browse/` (el mismo CAP que Solicitud y Configuración)
- `mainModelv2cp` `/api/base/cp/v2/browse/` (central de pesadas)
- `NECESIDADESRMD_SRV` `/api/integracion/saperp/rmd/sap/opu/odata/sap/Z_PP_NECESIDADESRMD_SRV/`
- `CENTRALPESADAS_SRV` `.../Z_PP_CENTRALPESADAS_SRV/`, `IMPRESIONORD_SRV` `.../Z_PP_IMPRESIONORD_SRV/`
- Todo pasa por `/mif-apps-rmd-bs.mifrmdregistro-1.0.0/dest-apigateway/...`.

## Búsqueda por lote (FilterBar: campo «Lote» obligatorio, botón Ir → `onSearchLote` → `onOrdenesABAP`)
```
GET .../Z_PP_NECESIDADESRMD_SRV/OrdenSet?$filter=Charg eq '<LOTE EN MAYÚSCULAS>' and Aufnr eq ''
```
Sin `$expand` ni `$select`; si llegan 1000 filas, pagina con `$skiptoken`. Copia `Vfdat` en `VfdatBTP`.
Tabla «Registros de Manufactura Digital (n)», con las columnas:
Centro (`Pwerk`), Orden (`Aufnr`), Etapa (`Dauat`), Código (`Matnr`), Versión (`Verid`), Artículo (`Text1`), Lote (`Charg`),
Expira (`VfdatBTP`), Status (`Stats`). Las propiedades de OrdenSet están en `../metadata/Z_PP_NECESIDADESRMD_SRV_metadata.xml`.

## Al pulsar una orden (`onDetailRmd` → `onMdList`, diálogo «Manufactura Digital»)
1. `GET RMD?$filter=productoId eq '<Matnr>' and ordenSAP eq '<Aufnr>'&$expand=estadoIdRmd,mdId/estadoIdRmd,aEstructura`
2. `GET MD?$filter=mdId eq <mdId del RMD>&$expand=estadoIdRmd,nivelId,sucursalId,aReceta/recetaId,aEstructura`
3. **¡Ojo, escribe!** Por cada RMD con estado cuyo `aEstructura.length / fraccion` no cuadre con las estructuras del MD, hace
   `MERGE RMD('<rmdId>') {activo:false}`. Basta con abrir la fila para que la app pueda desactivar registros RMD.
   Por eso no la abrí, y el userscript no debe copiar ese efecto.
4. Si no hay RMD: `RECETA?$filter=activo eq true and Matnr eq .. and Verid eq ..` → `MD_RECETA?$expand=mdId&$filter=activo eq true and (recetaId_recetaId eq ..)`
   → busca el MD autorizado por `codAgrupadorReceta`/`codDefectoReceta`.
5. `GET .../Z_PP_IMPRESIONORD_SRV/OrdenSet?$filter=Aufnr eq '<Aufnr>'` → `Pdf64` (PDF de la OP).
Columnas del diálogo: Código RM, versión, Estado RMD (`stateRMD` = `RMD.estadoIdRmd.contenido`), RM, OPP/RMO (PDF), Asignar.
Al entrar a un RMD (`onDetailRmdGo`) exige RM «A»/«SS», lee `RMD_USUARIO?$filter=rmdId_rmdId eq .. and rol eq 'AUXILIAR'`
y luego `RMD?$filter=rmdId eq ..&$expand=mdId/estadoIdRmd,estadoIdRmd,aReceta/recetaId,aEstructura`. «Habilitar» crea el RMD (escritura).

## Cabeceras
Las llamadas a `dest-apigateway` necesitan las cabeceras de auditoría `token` (JWT de la sesión de la app), `idtransaccion`, `aplicacion`,
`usuario` y `fechatransaccion`. Sin ellas responde `401 {"iCode":4,"sMessage":"Falta parametros de Auditoria : token"}` (probado).
