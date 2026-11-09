# Plantilla RMD nativa en BTP: qué necesita TI

Guía para construir en el portal RMD (BTP) la plantilla de Producción: generarla, que Producción proponga sus cambios en pantalla y que el equipo RMD los importe al RMD Ingresado, cumpliendo las reglas del sistema validado. El código de partida está en esta misma carpeta (ver `LEEME.md`).

## Resumen

- **Qué se construye:** una función nueva del portal para **generar la plantilla de un RMD**, que **Producción proponga sus cambios** sin poder modificar el RMD, y que **el equipo RMD importe esos cambios** al RMD Ingresado con revisión, reglas y registro completo.
- **Dónde:** en la app de Configuración RMD del portal (Cloud Foundry, región us10, sitio portalprd) y en su servicio OData, más una app nueva para Producción en el mismo sitio.
- **Qué se reutiliza:** las tablas del RMD (estructuras, etiquetas, pasos, procesos menores, equipos, utensilios, insumos) y el PDF del master que la app ya genera.
- **Qué es nuevo:** tres tablas para el borrador, las acciones del servicio (generar, revisar, ingresar, revertir), un rol para Producción, el audit trail y la firma electrónica del ingreso.
- **Clasificación GxP:** desarrollo a medida (GAMP 5, categoría 5) sobre un sistema validado. Entra por control de cambios y necesita URS, análisis de riesgo e IQ/OQ/PQ.
- **Orden recomendado:** fase 1, generar y revisar (sin escribir en el RMD); fase 2, ingresar.

## Dónde se hace cada cosa en el BTP

| Pieza | Qué se hace | Dónde |
| --- | --- | --- |
| Botón «Plantilla para Producción» | Opción nueva en el menú **Exportar** de la lista principal | App UI5 de Configuración RMD (repositorio de apps HTML5) |
| Botón «Revisar borradores de Producción» | En la ventana de un RMD Ingresado, junto a «Nueva Versión» | Misma app UI5 |
| App de Producción | Pantalla donde Producción abre el borrador, lo edita y lo envía | App UI5 nueva publicada como tile en el sitio portalprd de SAP Build Work Zone |
| Tablas del borrador | `MD_BORRADOR`, `MD_BORRADOR_CAMBIO`, `MD_BORRADOR_ESCRITURA` | Modelo de datos del servicio (`db/` en CAP) sobre la base HANA del portal |
| Acciones del servicio | `generarPlantilla`, `buscarPasos`, `enviar`, `revisar`, `ingresar`, `rechazar`, `revertir` | Lógica del servicio OData (`srv/` en CAP), en el servidor, nunca en el navegador |
| Reglas de negocio | Validaciones de la sección «Importar e ingresar» | `srv/lib/reglas.js`, llamadas desde `revisar` e `ingresar` |
| Escritura atómica | Todos los cambios de un ingreso en una transacción; si falla uno, no se graba nada | Transacción única de la acción `ingresar` |
| Roles | Producción, equipo RMD, Calidad (lectura) | `xs-security.json` y colecciones de roles en el BTP Cockpit, asignadas por grupos del proveedor de identidad |
| Audit trail | Valor anterior y nuevo, usuario, fecha, motivo y número de borrador | `@changelog` (plugin `@cap-js/change-tracking`) + SAP Audit Log Service |
| Firma electrónica | Contraseña otra vez al ingresar y al revertir, con significado de la firma | Reautenticación con SAP Cloud Identity Services (IAS) desde `ingresar` |
| PDF de la plantilla | Mismo formato que el PDF del master | Reutilizar el generador de PDF del master que ya tiene la app |
| Descarga del plan | Plan de ingreso para el equipo RMD (opcional) | Exportación de tabla de UI5 (`sap.ui.export.Spreadsheet`) |
| Ambientes | Desarrollo, calidad (OQ/PQ) y producción | Subcuentas del BTP; transporte con Cloud Transport Management |

**CAP** (SAP Cloud Application Programming Model) es el estándar de SAP para apps en el BTP: CDS para tablas y servicios, Node.js para la lógica. Los nombres de columna del portal (`estadoIdRmd_iMaestraId`, `pasoId_pasoId`) tienen el formato que genera CAP, así que el código de referencia encaja en ese proyecto. TI debe confirmarlo, junto con la subcuenta de calidad y el proveedor de identidad.

## Generar la plantilla

El equipo RMD elige un RMD y pulsa **Exportar › Plantilla para Producción**. El sistema crea el **Borrador N° X** en el servidor y Producción lo ve en su app.

Qué muestra (igual que el PDF del master):

- Encabezado de 8 columnas con logo: Etapa, Emitido, Página, Orden N°, Lote, Expira, Teórico, Código, Versión Fab./Alt., Edición, Estado / Fecha / Por.
- Validación, Precauciones y Notas, Equipos (descripción, código, código de referencia) e Insumos (descripción, código, cantidad, UM).
- Procedimiento con la **misma numeración** del PDF (por ejemplo 4.4.24), procesos menores, casillas según el tipo de dato, especificaciones y verificación de firmas.

Reglas:

- Solo de un RMD **Ingresado o Autorizado**.
- Se guarda una **foto** del RMD (contenido y SHA-256) para saber después si cambió.
- El borrador queda ligado a la versión exacta (`mdId`, código y versión).

Código: acción `generarPlantilla` en `srv/borrador-service.js`; botón en `app/configuracion-rmd/BorradorBotones.fragment.xml`.

## Editar el borrador (Producción)

Producción edita **en pantalla**, en una app web del portal (no en Excel ni en archivos sueltos). Ve el RMD con la hoja del PDF, toca una fila y elige qué hacer. Cada cambio se guarda en el servidor y el RMD no se toca.

- Cambiar el texto de un paso o proceso menor, con un **buscador en vivo** de pasos parecidos (partes de palabra, sin tildes, por código), los de la misma etiqueta primero y su % de parecido.
- Agregar un paso debajo, un proceso menor o un insumo dentro de un paso; quitar, subir, bajar, mover, duplicar y copiar (también varias filas a la vez).
- Cambiar el rango (tipo Rango), las casillas «Realizado por» y «Visto bueno», y en un paso nuevo qué anota Producción.
- Quitar o agregar equipos y utensilios, y comentar cualquier fila o sección.
- Deshacer, ir a una sección y ver la vista PDF.
- Llenar la **Solicitud** (nombre, área, motivo, control de cambio) y **Enviar al equipo RMD**. Desde ahí ya no puede editar.

| Situación | Qué pasa |
| --- | --- |
| El texto ya existe en la misma estructura y etiqueta | Se usa ese paso, no se crea otro |
| No existe | Se muestran los parecidos; si no elige ninguno, queda «★ Se creará» |
| Elige un paso de **otra etiqueta** | Se bloquea: solo se reemplaza por pasos de la misma etiqueta (también en procesos menores) |
| Escribe «Control de Calidad» | Sugiere «Calidad en Operaciones» (salvo granel, FPRO-250 y biocarga) |
| Rango inicial mayor que el final, o no numérico | Aviso al momento |
| Quita un paso del que depende otro | Aviso: se reenlazará el predecesor |
| Cambia la cantidad de un insumo | Aviso: ese cambio va en la Lista de Materiales, no en el RMD |

Código: `app/borrador-produccion/Editor.view.xml` y `Editor.controller.js`; en el servidor, `buscarPasos`. El bloqueo de otra etiqueta se repite en el servidor al ingresar.

## Importar e ingresar en el RMD

El equipo RMD abre el RMD Ingresado y pulsa **Revisar borradores de Producción**. Todo se valida en el servidor y la escritura es una sola operación.

1. **Estado.** Solo sobre un RMD **Ingresado** (467). Si está Autorizado (465), se crea antes la versión nueva con «Nueva Versión».
2. **¿Cambió el RMD?** Se compara con la foto. Si cambió, no se ingresa: se vuelve a revisar sobre el RMD actual.
3. **Plan de ingreso.** Cada cambio con su resultado: OK, AVISO o BLOQUEO. El equipo RMD puede corregir una fila o cambiarla por un paso existente.
4. **Reglas** (tabla abajo). Con un BLOQUEO no se ingresa; los AVISOS se aceptan con una casilla.
5. **Firma electrónica.** Contraseña otra vez; se guarda quién, cuándo y el significado.
6. **Escritura.** Primero los pasos nuevos del catálogo (código correlativo del portal, `obtenerCodigoCorrelativo`, buscando antes si ya existen); después agregar, cambiar, quitar, rangos, casillas, orden, equipos y utensilios; al final los predecesores. Cada escritura guarda su valor anterior.
7. **Verificación.** Se relee el RMD y se compara con el plan. Si algo no coincide, se revierte todo.
8. **Después.** Las filas ingresadas quedan marcadas; lo que no se escribe en el RMD queda como tareas manuales. El RMD sigue Ingresado hasta que se autorice con el flujo normal. **Revertir**, con firma, mientras siga Ingresado.

| Regla | Detalle | Función en `srv/lib/reglas.js` |
| --- | --- | --- |
| Misma etiqueta | Un paso solo se reemplaza por uno de la misma estructura y etiqueta; en un proceso menor, la de su paso. Pasos de baja, bloqueados | `validarReemplazo` |
| Sin duplicados | Texto igual (sin mayúsculas, tildes, espacios ni signos) a un paso existente usa ese paso | `resolverTexto` |
| Validaciones del Grabar | Rango y decimales obligatorios según el tipo de dato; Clave Modelo en Notificación; inicial ≤ final. Las mismas de `onGrabarPasoPadre` del portal | `validarComoGrabar` |
| Casillas | R. Por + V.B. → 441; solo R. Por → 439; solo V.B. → 440; sin firmas → 446 | `tipoPorCasillas` |
| Predecesores | Cada paso con tipo de dato depende del anterior con tipo, saltando los «Sin tipo de dato»; sin ciclos | `recalcularPredecesores`, `revisarPredecesores` |
| Textos | «Control de Calidad» → «Calidad en Operaciones», salvo granel, FPRO-250 y biocarga | `avisoCalidad` |
| Cambio en SAP | Foto distinta o `fechaActualiza` posterior → no se ingresa | `rmdCambio` |
| Tareas manuales | Cantidad de insumo → Lista de Materiales | `esTareaManual` |

## Datos

Tablas existentes que se leen o escriben:

| Tabla | Para qué | Lee / escribe |
| --- | --- | --- |
| `MD` | Cabecera y versión; estado en `estadoIdRmd_iMaestraId` (465 Autorizado, 467 Ingresado, 468 Suspendido) | Lee |
| `MD_ESTRUCTURA`, `MD_ES_ETIQUETA` | Estructuras y etiquetas | Lee |
| `MD_ES_PASO` | Pasos: `pasoId_pasoId`, `orden`, `tipoDatoId_iMaestraId`, `valorInicial`, `valorFinal`, `margen`, `decimales`, `rpor`, `vb`, `clvModelo`, `mdEstructuraPasoIdDepende`, `activo` | Lee y escribe |
| `MD_ES_PASO_INSUMO_PASO` | Procesos menores e insumos: `pasoId_mdEstructuraPasoId` (padre), `pasoHijoId_pasoId`, `orden` | Lee y escribe |
| `PASO` | Catálogo de pasos (unos 90 000) | Lee y crea |
| `MD_ES_EQUIPO`, `MD_ES_UTENSILIO`, `EQUIPO` | Equipos y utensilios | Lee y escribe |
| `MD_RECETA`, `MD_ES_RE_INSUMO` | Receta e insumos | Lee |
| `MD_ES_ESPECIFICACION` | Especificaciones | Lee |
| `MD_ES_FORMULA_PASO` | Términos de fórmula que apuntan a un paso: al cambiar el paso hay que actualizar su `valor` | Lee y escribe |

Cada escritura llena `usuarioRegistro` / `fechaRegistro` o `usuarioActualiza` / `fechaActualiza` con el usuario y la hora del servidor. Quitar es `activo = false`, nunca borrar. Tablas nuevas en `db/borrador.cds`.

## Sistema validado (GxP)

GAMP 5 categoría 5; aplican 21 CFR Part 11 y el Anexo 11 de EU GMP.

| Entregable | Qué cubre | Quién |
| --- | --- | --- |
| Control de cambios | Se abre antes de desarrollar; impacto en la validación vigente | Dueño del sistema + Calidad |
| URS | Las secciones Generar, Editar e Importar de esta guía | Equipo RMD + Calidad |
| Análisis de riesgo (FMEA) | Severidad, probabilidad y detectabilidad por requisito | TI + equipo RMD + Calidad |
| FS / DS | Tablas, servicio, roles y pantallas | TI |
| Revisión de código y pruebas unitarias | Las 10 pruebas de `test/reglas.test.js` como mínimo | TI |
| IQ | Despliegue en calidad y producción | TI |
| OQ | Cada requisito, incluidos casos negativos (otra etiqueta, RMD Autorizado, RMD cambiado, contraseña errónea) | TI + equipo RMD |
| PQ | Uso real con RMD de prueba y usuarios de Producción y del equipo RMD | Equipo RMD + Producción |
| Matriz de trazabilidad | URS → riesgo → FS/DS → prueba → resultado | TI + Calidad |
| Informe de validación | Desviaciones, cierre y liberación | Calidad |
| SOP y capacitación | Uso por rol | Equipo RMD + Calidad |

| Código | Requisito | Dónde se cumple |
| --- | --- | --- |
| GxP-01 | Audit trail generado por el sistema, no editable | `@changelog` en `db/borrador.cds`, tabla `MD_BORRADOR_ESCRITURA`, SAP Audit Log Service |
| GxP-02 | Firma electrónica al ingresar y al revertir | `firmaElectronica()` en `srv/borrador-service.js` (método a confirmar con Seguridad) |
| GxP-03 | Acceso por rol: Producción no escribe en el RMD | `@restrict` en `srv/borrador-service.cds` + `xs-security.json` |
| GxP-04 | Integridad (ALCOA+): borrador, cambios y escrituras guardados | Tablas nuevas |
| GxP-05 | Verificación después de escribir | `verificar()` |
| GxP-06 | Todo o nada | Transacción única de `ingresar` |
| GxP-07 | No cambia el flujo de autorización | Ninguna escritura toca `estadoIdRmd_iMaestraId` |
| GxP-08 | Fecha y hora del servidor (Lima) | `managed` de CAP |
| GxP-09 | Respaldo y retención | Política de respaldo de HANA Cloud |
| GxP-10 | Revisión periódica del audit trail y accesos | Rol de lectura de Calidad |

## Material que entrega el equipo RMD

| Material | Para qué le sirve a TI |
| --- | --- |
| Esta guía | Base de la URS y de la matriz |
| Código de referencia (esta carpeta) | Tablas, servicio, reglas, pantallas y roles para adaptar |
| `test/reglas.test.js` | Casos OQ-01 a OQ-10 escritos y pasando |
| `docs/como_se_configura_un_rmd.md` | Reglas de configuración: estructuras, etiquetas, tipos de dato, notificaciones, predecesores, casillas |
| `docs/configurar_rmd_verificado.md` | Pantallas y botones del editor del portal |
| Tabla de códigos | Estados (465, 467, 468) y tipos de dato (432 a 450) de MAESTRA |
| RMD de prueba | 2202609013, 2202609157, 2202609224, 2202609241 |
| Ejemplos reales | 3 a 5 casos de cambios pedidos por Producción como datos de PQ |
| Usuarios clave | Una persona de Producción y una del equipo RMD |

## Plan por fases y preguntas para TI

1. **Arranque:** control de cambios; URS y análisis de riesgo aprobados.
2. **Fase 1:** tablas nuevas, `generarPlantilla`, `buscarPasos`, `enviar`, `revisar`, la app de Producción y el botón en Exportar.
3. **Validación fase 1:** IQ, OQ y PQ.
4. **Fase 2:** `ingresar` y `revertir`, firma electrónica, audit trail, verificación.
5. **Validación fase 2 y salida en vivo:** IQ, OQ con casos negativos, PQ, SOP y capacitación.

Preguntas:

- ¿El backend del portal es CAP en Node.js? Si es Java, las reglas se pasan tal cual.
- ¿La app usa OData V2? Entonces el servicio nuevo se expone también por el adaptador V2.
- ¿El proveedor de identidad es IAS y qué método aprueba Seguridad para la firma electrónica?
- ¿Hay subcuenta de calidad con copia de RMD reales para OQ y PQ?
- ¿Quién crea los pasos nuevos en el catálogo: el ingreso o un rol aparte?
- ¿Se reutiliza el generador del PDF del master para la vista PDF?
