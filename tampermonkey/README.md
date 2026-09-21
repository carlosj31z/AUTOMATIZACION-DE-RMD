# Mejoras de interfaz para Configuración RMD (Tampermonkey) — v1.6.1

Instalación: en Tampermonkey → "Crear un script nuevo" → pega `rmd-ui-mejoras.user.js` → guarda → recarga el portal.
Solo actúa dentro del iframe de la app (`ui5appruntime.html`) y **solo cambia la vista**. Lo único que "pulsa" por ti:
"Ir" (Enter en un filtro), el OK de los mensajes de **Éxito** y, si tú lo pides con Ctrl+S, el botón Guardar del diálogo abierto.
Un botón discreto de ajustes (abajo a la izquierda) activa o desactiva cada mejora.

| Mejora | Qué hace |
|---|---|
| Enter = Ir | En filtros y selectores "Adicionar…". No actúa con una lista desplegada ni dentro de la tabla de pasos. |
| Diálogos a medida | **Pasos**: casi pantalla completa. **Estructura, Etiquetas, Procesos menores, selectores**: centrados y solo con el alto que necesitan. |
| Columnas ordenadas | Anchos por nombre; la descripción toma el resto. **Depende** se mide con el texto más largo y siempre se ve completo. |
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
| Cambios sin guardar | Avisa antes de Cancelar si editaste algo; **Ctrl+S** = Guardar. |
| Éxito automático | Cierra solo los mensajes de título "Éxito" con un único OK (900 ms). Confirmaciones y advertencias no se tocan. |
| Calidad en Operaciones | El paso mayor "EL PERSONAL DE CALIDAD EN OPERACIONES…" / "CALIDAD EN OPERACIONES REGISTRA…" (Realizado por) debe llevar R. Por + **Estado CC**; los procesos menores de muestreo ("CANTIDAD MUESTREADA", "FECHA / HORA DE MUESTREO") llevan Edit + Estado CC. |
| Insumos | Procesos menores con Cantidad Insumos / UM: **sin Edit** (si lo tienen marcado se pide desmarcarlo). |
| Textos | Marca la descripción que dice "CONTROL DE CALIDAD" (→ "CALIDAD EN OPERACIONES"), "MUESTRA PARA CONTROL DE CALIDAD" (→ "CANTIDAD MUESTREADA (unidad):") o la nota antigua "…CONTROL DE CALIDAD O CONTROL DE PROCESO…". Se acepta la forma "…CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE". |
| **Copiar / Pegar configuración** | En la ventana de Pasos, en la barra fija de arriba: **⧉ Copiar configuración** y **⎘ Pegar en el paso marcado**. 1) Marca la casilla del paso de referencia y pulsa Copiar (lee su configuración y sus procesos menores). 2) Marca la casilla del paso nuevo y pulsa Pegar: aparece una **vista previa** con lo que cambiará (puedes desmarcar campos y procesos menores) y solo escribe al pulsar **Aplicar**. Copia Tipo Dato, Clave Modelo, Puesto, Val. Inicial/Final, Margen, Decimal y casillas; no copia Orden, Depende, Código ni Descripción. Los procesos menores se agregan **por código** con el selector "Adicionar Pasos RMD", se configuran igual que el origen y se guardan. Los **insumos** no se copian (se agregan con "Agregar Insumo"). El portapapeles queda guardado en el navegador: se puede copiar en un RMD de referencia y pegar en otro RMD. |

## Estilo
Diseño minimalista para no romper la costumbre del usuario de la interfaz original: usa la tipografía y la paleta del propio tema Fiori
(oscuro por defecto; cambia a claro si el portal cambia de tema), botones con contorno fino y texto de acento (relleno solo en "Aplicar"),
casillas a marcar/desmarcar **encerradas** (recuadro discontinuo ámbar = marcar, sólido rojo = desmarcar), etiquetas de estado con contorno, un aviso de incoherencias en texto
discreto, animación lenta (2,4 s) en el Puesto de Trabajo faltante —se desactiva si el sistema pide reducir movimiento— y un botón de ajustes pequeño.
Las tablas siguen siendo las del portal.
