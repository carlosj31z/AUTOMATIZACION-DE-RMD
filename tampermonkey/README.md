# Mejoras de interfaz para Configuración RMD (Tampermonkey)

Instalación: en Tampermonkey → "Crear un script nuevo" → pega `rmd-ui-mejoras.user.js` → guarda. Recarga el portal.
El script solo actúa dentro del iframe de la app (`ui5appruntime.html`) y **solo cambia la vista**: no guarda ni escribe datos.
Un panel "UI+" (abajo a la derecha) activa o desactiva cada mejora.

| Mejora | Qué hace |
|---|---|
| Enter = Ir | En los filtros (pantalla principal y selectores "Adicionar…") Enter pulsa "Ir". No actúa si una lista está desplegada ni dentro de la tabla de pasos. |
| Diálogos anchos | Editor, Estructura, Etiqueta, Pasos y selectores al 98 % del ancho y 94 % del alto. |
| Columnas ordenadas | Anchos por nombre de columna; la descripción toma el espacio sobrante (mín. 380 px). |
| Cabecera fija, filas alternas, resalte al pasar el cursor, foco visible | Lectura más cómoda en tablas largas (p. ej. Pasos (149)). |
| Foco automático | Al abrir un selector con filtro, el cursor queda en el primer campo. |
