# Mejoras de interfaz para Configuración RMD (Tampermonkey) — v1.9.0

Instalación: en Tampermonkey → "Crear un script nuevo" → pega `rmd-ui-mejoras.user.js` → guarda → recarga el portal.
Solo actúa dentro del iframe de la app (`ui5appruntime.html`). Casi todo es vista; **solo escribe cuando tú lo pides**: "Aplicar" en la vista previa de Pegar y el
**Guardar del propio portal** (en Especificaciones, ese Guardar incluye además los textos y el orden que hayas editado). Lo único que "pulsa" por ti:
"Ir" (Enter en un filtro), el OK de los mensajes de **Éxito** y, si tú lo pides con Ctrl+S, el botón Guardar del diálogo abierto.
Un botón redondo de ajustes (abajo a la izquierda) abre una tarjeta con un interruptor por mejora (agrupadas en *Ventanas y tablas*, *Alertas* y *Herramientas*) y un interruptor general "Mejoras activas".
Desde la versión 1.9 el script **solo modifica las ventanas del RMD** ("<código> - <descripción>", "Procesos Menores para el Paso…" y los selectores "Adicionar…"); ventanas como **Asociar Fórmula** se dejan exactamente como las dibuja el portal (solo se les añade, si activas esa mejora, un aviso de códigos).

| Mejora | Qué hace |
|---|---|
| Enter = Ir | En filtros y selectores "Adicionar…". No actúa con una lista desplegada ni dentro de la tabla de pasos. |
| Diálogos a medida | **Pasos**: casi pantalla completa. **Estructura, Etiquetas, Procesos menores, Especificaciones, selectores**: centrados y solo con el alto que necesitan. |
| Columnas ordenadas | Anchos por nombre; la descripción toma el resto (nunca menos de 205 px: si no cabe, aparece desplazamiento horizontal en vez de aplastarla). **Depende** se mide con el texto más largo y siempre se ve completo. Las cabeceras no parten palabras y ocupan como máximo dos líneas; en ventanas estrechas (< 1500 px) la columna Estado se oculta si todo es "Activo". Sin desplazamiento horizontal desde 1366 px de ancho. |
| Columnas ocultas | Estado Mov., Imagen y Formato. |
| Estado del RMD | Etiqueta (INGRESADO / AUTORIZADO / SUSPENDIDO) **pegada a la derecha** de la cabecera de cada ventana emergente. |
| Título del paso menor | Muestra la descripción completa del paso mayor (hasta 2 líneas; tooltip con el texto entero). |
| "Sin tipo de dato" | Texto en **rojo y negrita** en Tipo Dato. |
| Puesto de Trabajo | Si el combo está habilitado y vacío, la casilla se resalta y **parpadea**. |
| Casillas vs tipo de dato | Marca en la celda qué **MARCAR** (naranja discontinuo) o **DESMARCAR** (rojo) según el tipo: Realizado por → R. Por; Realizado por y Visto bueno → R. Por + V.B.; Visto bueno → V.B.; Notificación y tipos con captura → Edit; Sin tipo de dato / Múltiple check → sin Edit (y sin R. Por, V.B., Estado CC); MuestraCC → Estado CC + Edit. Además: Decimal vacío en tipos numéricos, Rango sin límites, Notificación sin Clave Modelo, Sin tipo de dato con Depende, predecesor colgante o que apunta a un "Sin tipo de dato". Botón "⚠ n incoherencias" salta a la siguiente. |
| Depende con tooltip | "Depende del paso N: <descripción>" (o "colgante"/"sin predecesor"). |
| Tooltips | Significado de Edit, R. Por, V.B., Estado CC, PM OP, Gen PP… al pasar el cursor por la cabecera (sin barras de color). |
| Filtro local | "Filtrar pasos" con contador y botón de incoherencias **siempre visibles** (fijos arriba), igual que el título de la tabla con Guardar y la cabecera de columnas. |
| Ventanas | Todas (incluidos los mensajes) **centradas** y con el pie (Cancelar/Cerrar) siempre visible; no se desbordan de la pantalla. |
| Cambios sin guardar | Avisa antes de Cancelar/Cerrar si editaste valores o casillas (compara el estado actual con el del último guardado); marcar filas para copiar no cuenta como cambio. **Ctrl+S** = Guardar. |
| Éxito automático | Cierra solo los mensajes de título "Éxito" con un único OK (900 ms). Confirmaciones y advertencias no se tocan. |
| Calidad en Operaciones | El paso mayor "EL PERSONAL DE CALIDAD EN OPERACIONES…" / "CALIDAD EN OPERACIONES REGISTRA…" (Realizado por) debe llevar R. Por + **Estado CC**; los procesos menores de muestreo ("CANTIDAD MUESTREADA", "FECHA / HORA DE MUESTREO") llevan Edit + Estado CC. |
| Insumos | Procesos menores con Cantidad Insumos / UM: **sin Edit** (si lo tienen marcado se pide desmarcarlo). |
| Textos | Marca la descripción que dice "CONTROL DE CALIDAD" (→ "CALIDAD EN OPERACIONES"), "MUESTRA PARA CONTROL DE CALIDAD" (→ "CANTIDAD MUESTREADA (unidad):") o la nota antigua "…CONTROL DE CALIDAD O CONTROL DE PROCESO…". Se acepta la forma "…CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE". |
| **Asociar Fórmula: aviso de códigos** | Al abrir "Asociar Fórmula" compara el **Código Agrupador** y el **Código** con los de la **versión anterior** del mismo RMD (los datos salen de la tabla principal; solo lectura). Muestra una franja **✓ coinciden** o **⚠ no coincide / está vacío** (con el valor anterior) y resalta el campo en ámbar. Si la versión anterior no está en el listado (filtros), lo indica. La ventana conserva su tamaño y aspecto del portal. |
| **Especificaciones: reordenar y editar** | En la ventana de Especificaciones (solo RMD **Ingresados**): **Descripción** y **Especificaciones** pasan a ser cuadros de texto editables (con los máximos del servicio: 150 y 500 caracteres), cada fila tiene un **asa ⠿** para arrastrarla y hay botones **Subir / Bajar** (mueven las filas marcadas una posición). Las filas cambiadas se marcan con una barra ámbar y aparece "● n filas con cambios sin guardar". Se guarda con el **Guardar del propio portal**: sus textos y su orden viajan en la misma actualización de cada fila (entidad `MD_ES_ESPECIFICACION`: `ensayoHijo`, `especificacion`, `orden`), con la conexión del portal. Sin guardar: al cerrar se avisa y se descartan; **Agregar / Eliminar / Ensayos SAP** avisan antes porque releen del servidor. Una Descripción vacía no se guarda. Las especificaciones **importadas de SAP** (`ensayoPadreSAP`) las ordena el portal por su número de característica (`Merknr`), por eso ahí no se reordena (sí se pueden editar los textos). |
| **Copiar / Pegar configuración** | En la ventana de Pasos, en la barra del título de la tabla ("Pasos (n)"), **a la izquierda del icono de impresora**: **Copiar configuración** y **Pegar**. 1) Marca la casilla del paso de referencia y pulsa Copiar (lee su configuración y sus procesos menores). 2) Marca la casilla del paso nuevo y pulsa Pegar: aparece una **vista previa** con lo que cambiará (puedes desmarcar campos y procesos menores) y solo escribe al pulsar **Aplicar**; Escape cierra la vista previa. Copia Tipo Dato, Clave Modelo, Puesto, Val. Inicial/Final, Margen, Decimal y casillas; no copia Orden, Depende, Código ni Descripción. Los procesos menores se agregan **por código** con el selector "Adicionar Pasos RMD", se configuran igual que el origen y se guardan (si ya existen en el destino, no se duplican: se actualiza su configuración). Los **insumos** no se copian (se agregan con "Agregar Insumo"). **El paso copiado es temporal**: se descarta al cerrar el RMD, por eso al abrir otro RMD no queda ningún aviso. Protecciones: no pega en RMD que no estén **Ingresados**, ni sobre el mismo paso copiado, ni en un RMD distinto del copiado. |

## Estilo
Diseño minimalista para no romper la costumbre del usuario de la interfaz original: usa la tipografía y la paleta del propio tema Fiori
(oscuro por defecto; cambia a claro si el portal cambia de tema), botones con contorno fino y texto de acento (relleno solo en "Aplicar"),
casillas a marcar/desmarcar **encerradas** (recuadro discontinuo ámbar = marcar, sólido rojo = desmarcar), etiquetas de estado con contorno, un aviso de incoherencias en texto
discreto, animación lenta (2,4 s) en el Puesto de Trabajo faltante —se desactiva si el sistema pide reducir movimiento— y un botón de ajustes pequeño.
Las tablas siguen siendo las del portal.

## Apagar mejoras
Cada casilla del botón de ajustes retira lo que esa mejora añadió (botones, barra, etiqueta de estado, columnas ocultas, anchos); con "Mejoras activas" apagado
la ventana vuelve a verse exactamente como la del portal.
