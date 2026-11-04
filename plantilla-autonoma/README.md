# Generador de plantillas para Producción (sin portal)

`Generador de plantillas RMD.html` es **una sola página** que funciona sin conexión en Chrome o Edge,
sin Tampermonkey ni el portal. Recibe:

1. el **PDF del master** (la impresión del RMD desde el portal, p. ej. `2202609381-FAB-6-_SULPIMED_200mg_TAB.pdf`), y
2. el **Excel de Pasos** exportado de SAP (columnas Codigo, Descripción, Estructura, Etiqueta, Estado, Tipo de dato),

y genera la **Plantilla para Producción** (.html) con el mismo editor y formato que «Generar plantilla» del
userscript (`ppEditorApp` / `ppNucleo` / `PP_EDITOR_CSS`, copiados tal cual al construir). Nada sale de la computadora.

## Cómo lee el PDF

- Cabecera: etapa, descripción, material, versión de fabricación, edición y «Estado / Fecha / Por».
- Secciones por su título (`1.-EQUIPOS …`; antes de la primera numerada: PRECAUCIONES, NOTAS …) y etiquetas (`4.4.-FABRICACION`,
  con «Colocar check en caso de conformidad» = etiqueta conforme).
- Pasos por su número (`4.4.5.-`) o viñeta (cuadros). Las casillas «Realizado Por» / «VB» dan rpor/vb; las cajas de dato
  dibujadas en el PDF dan `edit`.
- Texto del paso y procesos menores: se separan por el espacio entre renglones y se confirman con el Excel de Pasos
  (mismo texto sin importar espacios, mayúsculas ni tildes; prioridad a la misma estructura y etiqueta). De ahí salen el
  **código** y el **tipo de dato**. Los renglones «INSUMO (código) cantidad UM» son insumos dentro del paso.
- Tablas de equipos/utensilios (ids del catálogo base), insumos y especificaciones por columnas.

Límites: el PDF no trae los códigos de paso; si en SAP hay varios pasos con el mismo texto se elige uno (mismo
texto exacto, misma etiqueta, el más nuevo). Los colores de texto no se copian. La plantilla no trae el id interno del RMD
(`mdId`): sirve para que Producción proponga cambios; el ingreso en SAP sigue haciéndose desde el portal.

`catalogo-base.json.gz`: equipos, utensilios, agrupadores, ids de estructuras/etiquetas, tipos de dato y áreas, sacados de
una plantilla generada en el portal (RMD 2202608733 v6, 2026-10-29). Se renueva con una plantilla más reciente si hace falta.

## Construir y probar

```
cd plantilla-autonoma
npm install                 # pdfjs-dist 3.11.174 y xlsx 0.18.5 (se incrustan en la página)
node construir.mjs          # → «Generador de plantillas RMD.html» (toma el editor del userscript actual)
node prueba.mjs <master.pdf> <Pasos.xlsx> [codigo]
```

Prueba con SULPIMED 200mg TAB (2202609381 v6): 8 secciones, 106 pasos, 200 procesos menores, 13 insumos dentro de pasos,
23 equipos/utensilios; 306 de 306 textos con código de SAP. Al cambiar el editor del userscript, volver a construir.
