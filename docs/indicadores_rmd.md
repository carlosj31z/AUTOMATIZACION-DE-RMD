# Indicadores del mes (`BD RMD <MES> <AÑO> - P1-P2.xlsx`)

Botón **Indicadores** del userscript (v1.20), junto al icono nativo **Exportar** de *Configuración Manufactura Digital*.
Arma el mismo libro que el equipo preparaba a mano cada mes a partir del Exportar nativo, con las mismas hojas, fórmulas y
tablas dinámicas. Se construye en el navegador con los datos que el portal ya muestra: no se envía nada a ningún servidor y
no se cambia nada en SAP.

## Cómo se usa

1. Pulsa **Indicadores** y elige el mes. Por defecto sale el mes anterior durante la primera quincena y el mes en curso después.
2. Opcional: elige el **archivo del mes anterior**. De él se traen las listas PEND PL1 / PEND PL2 y los "No contar" ya marcados.
3. Pulsa **Generar Excel**. La lectura de SAP tarda unos segundos y el archivo se descarga.
4. Revisa las celdas en **amarillo claro** de "No contar" (el motivo está en "Por revisar"). Completa **DLAB.** en Hoja1.
5. Si cambias "No contar" o "A/F", pulsa **Datos › Actualizar todo** para recalcular las tablas dinámicas.

Conviene generarlo **al cierre del mes**, porque los estados son los que SAP tiene en ese momento. Por ejemplo, al suspender un
RMD, SAP reemplaza su fecha de autorización por la de la suspensión.

## Hojas

| Hoja | Contenido |
|---|---|
| Exportación SAPUI5 | Las 18 columnas del Exportar nativo, más las 12 del equipo: Fec Ingreso Real `=MID(R,1,8)`, F.I Real `=TEXT(S,"0000-00-00")`, Dias `=NETWORKDAYS(T,K)`, Usuario `=MID(R,9,2)`, Prioridad `=MID(R,12,1)`, No contar, FC `=MID(R,15,3)`, FI `=MID(R,21,3)`, FA `=MID(R,27,3)`, Por revisar, RMD ING `=Y*Z` y RMD APR `=Y*AA`. Las fórmulas traen su valor ya calculado con las mismas reglas de Excel. Se comprobaron las 11 013 filas de agosto de 2026 contra lo que calculó Excel, incluidos los casos raros ("2-2" como fecha, un salto de línea que da #VALUE!). Es una **tabla de Excel** (`DatosRMD`): si se agregan filas al final, las tablas dinámicas las toman al actualizar. |
| PEND PL1 | Pendientes de Planta Ate "Por hacer solicitud", copiados del archivo anterior. La columna nueva **Posible registro en SAP** avisa cuando un RMD con la misma descripción y etapa ya entró a SAP desde el mes anterior, porque ese pendiente ya no debería seguir en la lista. |
| PEND PL2 | Pendientes de Planta Lima ("solicitado", POR INGRESAR), con la misma columna de aviso. |
| RESUMEN | Las 7 tablas dinámicas del archivo del equipo, en sus mismas celdas y con sus mismos campos y filtros. Si una tabla crece, la de abajo baja para no pisarla. Se añaden un título para "RMD INGRESADOS TOTAL" y otro para la tabla de días por prioridad, una nota con la fecha de generación y la tabla **% dentro de plazo**. |
| Hoja1 | Productividad por persona. Ingresados = Suma de RMD ING de sus iniciales en ambas plantas. Autorizados = Suma de RMD APR de su usuario de SAP. Ambos se toman con `GETPIVOTDATA` de las tablas de RESUMEN. DLAB. se completa a mano. Promedio/Día = Total / DLAB. (sin #DIV/0!) y hay fila de totales. |

### Tablas dinámicas de RESUMEN

| Tabla | Celda | Filas × columnas | Valor | Filtros |
|---|---|---|---|---|
| Tabla dinámica2 (autorizados por complejidad, informativo) | A8 | Planta, Usuario Autorización × FC | Cuenta | A/F = mes o ANTIGUO; No contar vacío; Fecha Autorización del mes |
| Tabla dinámica1 (RMD AUTORIZADOS TOTAL) | P9 | Planta, Usuario Autorización | Suma de RMD APR | Fecha Autorización del mes; No contar vacío o REVISAR; A/F = mes |
| Tabla dinámica4 (ingresados por complejidad, informativo) | AD10 | Planta, Usuario × FC | Cuenta | Fec Ingreso Real del mes; A/F = mes; No contar vacío, PEND CC o PEND JEFE/GER |
| Tabla dinámica5 (RMD INGRESADOS TOTAL) | AD37 | Planta, Usuario | Suma de RMD ING | los mismos que la anterior |
| Tabla dinámica6 (TOTAL DE RMD) | AZ8 | Planta, Estado (sin Solicitud Aprobada/Rechazada) | Cuenta | A/F = mes o ANTIGUO; No contar distinto de NO CONTAR y POR INGRESAR |
| Tabla dinámica7 (estatus por motivo, informativo) | AZ35 | Planta, A/F (sin SI ni vacío), No contar | Cuenta | — |
| Tabla dinámica8 (días por prioridad) | BO8 | Planta, Prioridad × Dias | Cuenta | A/F = mes o ANTIGUO; No contar vacío; Estado Autorizado o Suspendido |

**% dentro de plazo** está debajo de la tabla de días. Es el "% PRIO" del archivo de julio, que en agosto quedó con #REF!. Cuenta,
por planta y prioridad, cuántos autorizados/suspendidos del mes se autorizaron dentro del plazo en días hábiles: P1 ≤ 5,
P2 ≤ 10 y P3 ≤ 30, los plazos con que se calculó julio. Los plazos se pueden cambiar en la columna amarilla. Usa
`CONTAR.SI.CONJUNTO` sobre la hoja de datos, así no depende de en qué columna de la tabla cae cada número de días.

## Reglas que antes se hacían a mano

- **Qué filas entran**: las mismas del Exportar nativo, es decir todos los RMD **menos los Cancelados**. Sin filtro de estado,
  el portal los excluye.
- **Fechas**: Fecha Registro y Fecha Solicitud van como fecha con hora en **UTC**, igual que el Exportar nativo. Fecha
  Autorización va como texto de la fecha **local**. Es la misma conversión del portal.
- **A/F** coincide en 11 011 de 11 013 filas de agosto. Las 2 restantes eran descuidos del archivo manual.
  - Es el **mes** si el RMD se registró, se autorizó o ingresó (fecha al inicio de la Observación) en el mes, o si, sin
    registro, se solicitó en el mes.
  - Es **ANTIGUO** si sigue abierto (Ingresado, Solicitado o Solicitud Aprobada) y ya existía al cierre del mes.
  - En los demás casos queda el valor de SAP.
- **No contar** se sugiere solo en filas del mes o ANTIGUO, y siempre queda marcado para revisar:
  - **NO CONTAR** si la Observación no tiene el formato `AAAAMMDD-II-P-C…-FI…-FA…` y su RMD ING/APR daría #VALUE! en una suma
    del mes. Así lo marcó el equipo en agosto, y evita que el total quede en error.
  - Lo que ya estaba marcado el mes anterior. Las variantes se normalizan: PEND JEF/GER y PEND JEFE/GEREN → PEND JEFE/GER.
  - NO CONTAR, PEND JEFE/GER o PEND CC si la Observación lo dice.
  - **PEND CC** si el RMD sigue abierto pese a tener fecha de autorización del mes.
  - Nunca se sugiere un PEND a un RMD ya Autorizado o Suspendido, porque lo sacaría de los autorizados del mes.
- **PEND PL1 / PL2** se agregan al final de los datos como hacía el equipo:
  - Van sin fórmulas, con Fecha Solicitud el día 30 del mes y A/F del mes si la lista lo dice (si no, ANTIGUO).
  - PL1 va a Planta Ate y PL2 a Planta Lima.
  - **PL1 entra con su estado "Por hacer solicitud"** y dentro del rango de las tablas. En agosto sus 63 filas habían quedado
    fuera del rango de la tabla dinámica; en julio sí contaban.

## Validación (septiembre de 2026)

- Con los datos del archivo de agosto, el libro generado da **los mismos números** que el del equipo en las 7 tablas. Por
  ejemplo, autorizados 152 (139 RMD) e ingresados 207,5 (178 RMD). La única diferencia buscada es TOTAL DE RMD, que suma los 63
  de PEND PL1.
- En modo automático (A/F y No contar calculados, con julio como mes anterior) salen los mismos autorizados y el mismo TOTAL
  DE RMD. Ingresados sale 211,5 por los 2 descuidos de A/F del archivo manual.
- Excel abre el archivo sin reparaciones. Al pulsar "Actualizar" en cada tabla dinámica, Excel obtiene exactamente lo mismo.
- En el portal, el libro se arma en unos 6 segundos. Prueba automática: bloque O de `tampermonkey/pruebas/qa_estricto.py` y
  `node tampermonkey/pruebas/qa_indicadores.mjs`.

## Hallazgos de la validación

- Tres pendientes de PEND PL1 (PACITRAN x50 y x5, MIDAZOLAM AL02) ya estaban en SAP desde el 08/07/2026: dos Ingresados y uno
  Autorizado. Por eso en julio y agosto se contaron dos veces. La columna "Posible registro en SAP" los marca.
- Personas de Hoja1: las del archivo de agosto (NC, JQ, VM y DV). Para cambiarlas, se edita la lista `PERSONAS` del bloque
  INDICADORES del userscript.
