# Mejoras de interfaz para Configuración RMD (Tampermonkey) — v1.4.0

Instalación: en Tampermonkey → "Crear un script nuevo" → pega `rmd-ui-mejoras.user.js` → guarda → recarga el portal.
Solo actúa dentro del iframe de la app (`ui5appruntime.html`) y **solo cambia la vista**. Lo único que "pulsa" por ti:
"Ir" (Enter en un filtro), el OK de los mensajes de **Éxito** y, si tú lo pides con Ctrl+S, el botón Guardar del diálogo abierto.
Un panel "UI+" (abajo a la izquierda) activa o desactiva cada mejora.

| Mejora | Qué hace |
|---|---|
| Enter = Ir | En filtros y selectores "Adicionar…". No actúa con una lista desplegada ni dentro de la tabla de pasos. |
| Diálogos a medida | **Pasos**: casi pantalla completa. **Estructura, Etiquetas, Procesos menores, selectores**: centrados y solo con el alto que necesitan. |
| Columnas ordenadas | Anchos por nombre; la descripción toma el resto. **Depende** se mide con el texto más largo y siempre se ve completo. |
| Columnas ocultas | Estado Mov., Imagen y Formato. |
| Estado del RMD | Insignia de color (INGRESADO / AUTORIZADO / SUSPENDIDO) en la cabecera de cada ventana emergente. |
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
| Contraste / filas alternas / resalte / foco | Lectura más cómoda en tablas largas. |
| Calidad en Operaciones | El paso mayor "EL PERSONAL DE CALIDAD EN OPERACIONES…" / "CALIDAD EN OPERACIONES REGISTRA…" (Realizado por) debe llevar R. Por + **Estado CC**; los procesos menores de muestreo ("CANTIDAD MUESTREADA", "FECHA / HORA DE MUESTREO") llevan Edit + Estado CC. |
| Insumos | Procesos menores con Cantidad Insumos / UM: **sin Edit** (si lo tienen marcado se pide desmarcarlo). |
| Textos | Marca la descripción que dice "CONTROL DE CALIDAD" (→ "CALIDAD EN OPERACIONES"), "MUESTRA PARA CONTROL DE CALIDAD" (→ "CANTIDAD MUESTREADA (unidad):") o la nota antigua "…CONTROL DE CALIDAD O CONTROL DE PROCESO…". Se acepta la forma "…CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE". |
