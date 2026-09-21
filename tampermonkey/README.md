# Mejoras de interfaz para Configuración RMD (Tampermonkey) — v1.1.0

Instalación: en Tampermonkey → "Crear un script nuevo" → pega `rmd-ui-mejoras.user.js` → guarda → recarga el portal.
Solo actúa dentro del iframe de la app (`ui5appruntime.html`) y **solo cambia la vista**. Lo único que "pulsa" por ti:
"Ir" (Enter en un filtro), el OK de los mensajes de **Éxito** y, si tú lo pides con Ctrl+S, el botón Guardar del diálogo abierto.
Un panel "UI+" (abajo a la derecha) activa o desactiva cada mejora.

| Mejora | Qué hace |
|---|---|
| Enter = Ir | En filtros y selectores "Adicionar…". No actúa con una lista desplegada ni dentro de la tabla de pasos. |
| Diálogos anchos | 98 % del ancho y 94 % del alto. |
| Columnas ordenadas | Anchos por nombre; la descripción toma el resto (mín. 380 px). **Depende** se mide con el texto más largo y siempre se ve completo. |
| Columnas ocultas | Estado Mov., Imagen y Formato. |
| Grupos y tooltips | Banda de color por grupo (identificación, tipo, límites, casillas, acciones) y tooltip con el significado de Edit, R. Por, V.B., Estado CC, PM OP, Gen PP… |
| Depende con tooltip | Al pasar el cursor: "Depende del paso N: <descripción>" (o "colgante"/"sin predecesor"). |
| Sin tipo de dato | Filas atenuadas (no llevan predecesor). |
| Filtro local | Cuadro "Filtrar pasos" con contador "n de N pasos" en las tablas largas. |
| Cambios sin guardar | Avisa antes de Cancelar si editaste algo; **Ctrl+S** = Guardar. |
| Éxito automático | Cierra solo los mensajes de título "Éxito" con un único OK (900 ms). Confirmaciones y advertencias no se tocan. |
| Contraste | Campos deshabilitados más legibles y campos editables resaltados. |
