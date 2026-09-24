# Pruebas del userscript (contra el portal real)

`qa_estricto.py` abre una pestaña propia en el Chrome ya autenticado (puerto 9222) y comprueba, con medidas de pantalla y del DOM, que:

| Bloque | Qué verifica |
|---|---|
| A | Etiqueta de estado a la derecha; botones Copiar/Pegar en la barra de "Pasos (n)" a la izquierda del icono de impresora y a su misma altura; barra, título y cabecera siempre visibles; la cabecera fija nunca tapa la primera fila; columnas ocultas; tooltips; "Sin tipo de dato" en rojo; casillas encerradas; sin filas alternas ni contraste; filtro; Enter; reposo sin trabajo continuo y rendimiento; ventanas centradas con pie visible. |
| B | Portapapeles temporal: avisos de selección, Pegar deshabilitado, aviso del paso copiado, bloqueo sobre el mismo paso, y **desaparición al cerrar el RMD**. |
| C | Otro RMD no muestra el aviso; en un RMD Autorizado Pegar se bloquea. |
| E | Cada interruptor del panel retira lo que añadió; "Mejoras activas" apagado deja la ventana como la del portal. |
| F | Lista corta (Rendimiento) compacta; Escape cierra solo la vista previa; un único aviso; procesos menores sin botones de copiar. |
| G | Lo mismo a 1366×650. |
| H | Ventana **Asociar Fórmula**: sin clases del script y con el mismo tamaño que con las mejoras apagadas; aviso de códigos (✓ coinciden / ⚠ distinto / ⚠ vacío) y campo resaltado. |
| I | Listas de Pasos (Documentación, Preparación de máquinas, Preparación del material, Fabricación, Rendimiento) en 1415×886, 1920×945, 1600×900 y 1366×650 (Descripción no aplastada, cabecera de ≤ 2 líneas, sin palabras partidas ni desplazamiento horizontal) y en 1280×720 (Descripción ≥ 205 px). |
| J | **Especificaciones**: cuadros de texto y asas, edición, Subir/Bajar, arrastrar, **guardado** (la petición `model.update` se **simula** y un cortafuegos del navegador aborta cualquier escritura: no se escribe nada), descarte al cerrar, Descripción vacía, filas de SAP, apagar la mejora, aviso antes de Agregar/Eliminar y RMD Autorizado sin edición. |
| K | Botón de mejoras en la esquina inferior izquierda, tarjeta agrupada que cabe en 1415×886 y 1366×650, interruptores y "Restablecer". |
| L | **El botón de mejoras no desaparece al cargar la página**: el script se inyecta *antes* de que la app se monte (como Tampermonkey con `document-idle`), se simula el apartado de nodos del `<body>` que hace UI5 y se comprueba que el botón sigue encima de todo, que se vuelve a colgar si algo lo retira y que recupera su hoja de estilos. |
| M | **Aviso de cambios sin guardar**: el aviso propio sale centrado y con botones claros (no el cuadro del navegador); *Seguir editando*, Escape y Enter conservan el trabajo; **tras Guardar / Ctrl+S no avisa aunque el portal cambie valores**; una Advertencia del portal deja la ventana sin guardar; el Éxito la limpia; marcar filas, el filtro local y los cambios del portal sin tocar nada no cuentan; con la opción apagada no avisa. El Guardar del portal se sustituye por una acción vacía (no se escribe). |
| N | **Predecesor obligatorio** en pasos con tipo de dato (Precauciones, Fabricación…; excepciones: cabeza de Precauciones, Rendimiento, pasos condicionales/en paralelo, Sin tipo de dato) y textos correctos con "CONTROL DE CALIDAD" ("…CONTROL DE CALIDAD O CALIDAD EN OPERACIONES…" y "FINALMENTE ENTREGAR EL FORMATO DE INSPECCION… (FPRO-250 VIGENTE) A CONTROL DE CALIDAD PARA SU APROBACION EN EL SISTEMA…"; los demás "CONTROL DE CALIDAD" siguen alertando). Los casos se crean en memoria. |
| O | **Indicadores del mes** (botón junto a "Exportar", ventana con el mes y el archivo opcional; el libro del mes anterior se arma con los datos de SAP *sin descargarlo*: 5 hojas, 7 tablas dinámicas sobre la tabla `DatosRMD`, sin RMD Cancelados) y **Documentos citados** con procesos menores e incoherencias (recorre todo `RMD_PRUEBA`, lee todas las filas que dice cada encabezado o solo las del paso cuando la ventana muestra toda la etiqueta, arma el Excel de 4 hojas y cierra lo que abrió). Solo abre y cierra ventanas. |
| Q | **v1.21** (en `RMD_REVISION`, por defecto 2202506829, Procedimiento › Fabricación): la celda *Proc. Men.* se marca con el número de procesos menores mal configurados **sin abrirlos**; **PM OP** marcada (en memoria) hace visible la columna y pide desmarcarla, y al desmarcarla vuelve a ocultarse; **Copiar** lee los procesos menores del modelo y **Pegar en 2 pasos** (`FILA_ORIGEN`, `DESTINOS`) muestra qué pasará en cada uno (se cancela); **En minúsculas** abre *Nuevo Paso* con la descripción redactada y la configuración del paso (Estructura, Etiqueta, Tipo de dato…) y se cancela **sin pulsar nunca Agregar**; **Documentos citados** lee los procesos menores del modelo en menos de 90 s; el **latido** omite solo el error del refresco automático; **Ver todas las OP** (`RMD_OP`) carga en paralelo con la misma primera página del portal. Solo abre y cierra ventanas. |
| D | **Escribe** en el RMD de prueba y lo restaura: Enter = Ir en el selector, Ctrl+S y cierre solo del mensaje de éxito, aviso de cambios sin guardar, pegar (paso 9 → 19) con procesos menores, segundo pegado sin duplicar, vista previa sin nada marcado, y restauración. |

```bash
export RMD_PRUEBA=<RMD de PRUEBA Ingresado>   # solo el bloque D lo modifica (y lo restaura)
python tampermonkey/pruebas/qa_estricto.py                # todos los bloques (incluido D, que escribe: exige RMD_PRUEBA)
python tampermonkey/pruebas/qa_estricto.py ABCEFGHIJKLMNOQ # sin escribir (sin RMD_PRUEBA usa el RMD Ingresado 2202609081)
```
**Sin sesión del portal**, ambos lanzan su propio Chrome (headless) sobre una *maqueta* del DOM del portal; no escriben nada y no necesitan el Chrome del puerto 9222:
```bash
python tampermonkey/pruebas/qa_local.py           # aviso sin guardar, predecesor obligatorio, texto "CONTROL DE CALIDAD...", PM OP (LN6) y redacción "En minúsculas" (LN7)
python tampermonkey/pruebas/qa_local_sesion.py    # aviso de sesión por inactividad ("Continuar trabajando")
node tampermonkey/pruebas/qa_indicadores.mjs      # libro de indicadores y Excel propio (fórmulas con la semántica de Excel, A/F, "No contar", 7 tablas dinámicas, lectura de vuelta)
```
Complementan a `qa_estricto.py`, que sigue siendo la referencia contra el portal real.

Los bloques **sin D no escriben**: solo cambian datos *en memoria* de la pestaña de prueba (que se cierra al terminar) y todo guardado se simula. Por eso pueden
ejecutarse sobre un RMD real Ingresado (`RMD_PRUEBA`, `RMD_LAYOUT`, `RMD_ASOCIAR` + `ASOCIAR_DESC`, `ETQS_LISTAS`). **Nunca apuntes `RMD_PRUEBA` a un RMD real si vas a ejecutar el bloque D.**
Los casos que un RMD no trae (Puesto faltante, casillas incoherentes) se provocan en memoria.

Las mejoras añadidas en v1.11-1.14 (botón "Nuevo Paso", "Ver OP" con paginación real, filtro por columna estilo Excel en Ver OP, exportar OP y recetas asociadas por separado, "Documentos citados", nomenclatura de Observaciones, ortografía/concordancia en mayúsculas y tildes/puntuación en minúsculas) se comprobaron a mano contra el portal real (capturas, lectura del DOM y descargas reales), sin escribir nada, pero **no tienen todavía un bloque propio** en `qa_estricto.py` como H/I/J/K/L/M/N. El bloque **I** (layout de listas a varios tamaños) sí cubre indirectamente el ancho de la columna Tipo Dato, ya usado por todas las listas de pasos.
