# Mejoras de interfaz para Configuración RMD (Tampermonkey) — v1.2.0

Instalación: en Tampermonkey → "Crear un script nuevo" → pega `rmd-ui-mejoras.user.js` → guarda → recarga el portal.
Solo actúa dentro del iframe de la app (`ui5appruntime.html`) y **solo cambia la vista**. Lo único que "pulsa" por ti:
"Ir" (Enter en un filtro), el OK de los mensajes de **Éxito** y, si tú lo pides con Ctrl+S, el botón Guardar del diálogo abierto.
Un panel "UI+" (abajo a la izquierda) activa o desactiva cada mejora.

| Mejora | Qué hace |
|---|---|
| Enter = Ir | En filtros y selectores "Adicionar…". No actúa con una lista desplegada ni dentro de la tabla de pasos. |
| Diálogos a medida | **Pasos**: pantalla completa. **Estructura, Etiquetas, Procesos menores, selectores**: centrados y solo con el alto que necesitan. |
| Columnas ordenadas | Anchos por nombre; la descripción toma el resto. **Depende** se mide con el texto más largo y siempre se ve completo. |
| Columnas ocultas | Estado Mov., Imagen y Formato. |
| Estado del RMD | Insignia de color (INGRESADO / AUTORIZADO / SUSPENDIDO) en la cabecera de cada ventana emergente. |
| Título del paso menor | Muestra la descripción completa del paso mayor (hasta 2 líneas; tooltip con el texto entero). |
| "Sin tipo de dato" | Texto en **rojo y negrita** en Tipo Dato. |
| Puesto de Trabajo | Si el combo está habilitado y vacío, la casilla se resalta y **parpadea**. |
| Casillas vs tipo de dato | Marca en la celda qué **MARCAR** (naranja discontinuo) o **DESMARCAR** (rojo) según el tipo: Realizado por → R. Por; Realizado por y Visto bueno → R. Por + V.B.; Visto bueno → V.B.; Notificación y tipos con captura → Edit; Sin tipo de dato / Múltiple check → sin Edit (y sin R. Por, V.B., Estado CC); MuestraCC → Estado CC + Edit. Además: Decimal vacío en tipos numéricos, Rango sin límites, Notificación sin Clave Modelo, Sin tipo de dato con Depende, predecesor colgante o que apunta a un "Sin tipo de dato". Botón "⚠ n incoherencias" salta a la siguiente. |
| Depende con tooltip | "Depende del paso N: <descripción>" (o "colgante"/"sin predecesor"). |
| Grupos y tooltips | Banda de color por grupo de columnas y tooltip con el significado de Edit, R. Por, V.B., Estado CC, PM OP, Gen PP… |
| Filtro local | "Filtrar pasos" con contador "n de N pasos". |
| Cambios sin guardar | Avisa antes de Cancelar si editaste algo; **Ctrl+S** = Guardar. |
| Éxito automático | Cierra solo los mensajes de título "Éxito" con un único OK (900 ms). Confirmaciones y advertencias no se tocan. |
| Contraste / filas alternas / resalte / foco | Lectura más cómoda en tablas largas. |
