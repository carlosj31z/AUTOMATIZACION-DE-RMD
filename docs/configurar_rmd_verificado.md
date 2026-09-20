# "Configurar el RMD" — mapa verificado en el sistema real

Exploración hecha sobre un RMD de prueba (código 2202609089, "RMD PRUEBA") con la sesión
iniciada por el usuario. Todo está dentro del iframe `ui5appruntime.html`.

## Menú "Acción" de la fila (MenuButton dividido: "Abrir menú")

| Opción | Diálogo que abre |
|---|---|
| Ver master | PDF del máster (no abierto en detalle) |
| Descargar master | descarga del PDF (no ejecutado) |
| Agregar Documento | "Agregar Documentos al RMD: …": `<input type=file>` ("Examinar…"), Guardar / Cerrar |
| Ver OP | "Visualizar las Ordenes de Producción Asociadas al RMD": filtros OP y Lote, Search, tabla, Cerrar |
| Asociar fórmulas | "Asociar Fórmula: …" (Código Agrupador, Descripción, Código, Fecha Solicitud, Rpt. Validación, Etapa, Area, switch "(+) recetas", Planta, Estado, Motivo de Solicitud, RM Digital Paralelo, Observaciones; tabla "Recetas Asociadas (n)"; botones Actualizar, Agregar Producto, Guardar, Cancelar). "Agregar Producto" abre "Asociar Recetas al RM" (Código, Descripción, Variante + Ir, tabla, Agregar / Cancelar) |
| Configurar el RMD | Editor "<código> - <descripción>" (abajo) |
| Trazabilidad RMD | "Trazabilidad del RMD": Estado, Registrado, Usuario Registro, Cerrar |
| Notas Importantes | "Ver Notas Importantes RMD": tabla Nombre Creador/Descripción; "Agregar Nota Importante" -> "Ingresar Nota Importante" (textarea, Confirmar / Cancelar; se guarda sin confirmación) |

## Editor "Configurar el RMD"

Encabezado de solo lectura: Código Web, Descripción, Etapa, Planta, Estado del RMD.
Tabla "Estructura de RMD (n)": Orden, Descripción, Código, Items, Repite, Num., Acc.

Barra (tooltips): Comparar versiones, Nueva Versión, Copiar a RMD, Copiar de RMD, Imprimir,
Exportar Configuración, Generar Predecesores, Actualizar RMD en Línea, Configuración Inicial,
"+" (Agregar Estructura). No hay "Guardar" ni "Confirmar": el pie solo tiene "Cerrar".

| Botón | Comportamiento verificado |
|---|---|
| Comparar versiones | Selector (título engañoso "Adicionar Estructura al RMD"): Campo (combo), Buscar, Restablecer, Ir, tabla de RMD con "+" por fila; botones Comparar, Flujo de Aprobación, Cancelar |
| Nueva Versión | Advertencia "¿Desea generar una nueva versión?" [OK]/[Cancelar] |
| Copiar a RMD | "Copiar Información del RMD": Descripción RMD, Cod. defecto, Etapa y Estado (solo lectura), Planta, Motivo de Solicitud, Fecha Solicitud, Observacion; Confirmar / Cancelar |
| Copiar de RMD | "Copiar De: …": Código RMD, Descripción, Etapa (fija), Planta + Ir; tabla de ~3.000 RMD con casillas; Confirmar / Cancelar |
| Imprimir / Exportar Configuración | No producen diálogo visible (descarga / pestaña; no ejecutado) |
| Generar Predecesores | Advertencia "¿Desea generar Predecesores?" [OK]; éxito tardío "Se generaron los predecesores correctamente." [OK] |
| Actualizar RMD en Línea | Sin OP asociada: "No se puede actualizar en linea porque no hay una OP asociada." [OK] |
| Configuración Inicial | Advertencia "¿Desea realizar la configuracion inicial del RMD?" [OK]/[Cancelar] |
| "+" Agregar Estructura | Selector con Buscar/Ir y casillas; confirmación "¿Desea asignar las estructuras seleccionadas?" (manual) |

### Iconos por fila de estructura (según el tipo)

- **Adicionar Pasos RMD** (Precauciones, Notas importantes, Condiciones ambientales): abre "Pasos (n)".
- **Adicionar Etiqueta** (Procedimiento): abre "Etiqueta (n)".
- **Adicionar Equipo** (Equipos/Instrumentos/Materiales): abre "Equipos (n)".
- **Adicionar Especificaciones** (Especificaciones de producto en proceso): abre "Especificaciones (n)".
- **Eliminar Estructura**: siempre.

### Equipos (n)

Tabla Orden, Código, Descripción, Estado, Área, Tipo (EQUIPO / ACCESORIO / AGRUPADOR), Código
de referencia; botones Imprimir, "+" (Adicionar Equipo), Eliminar (casillas), Cancelar.
Selector "Adicionar Equipos: EQUIPOS": filtros Cod. Equipo, Descripción, Cod. GACI, Estado, Área
+ Ir; "+" = Agregar Agrupador; Actualizar; casillas; Agregar / Cancelar.
Flujo real probado: casilla -> Agregar -> **"Confirmación: ¿Desea asignar los equipos o
utensilios seleccionadas?" [OK]** -> **"Éxito: Se asignó exitosamente los equipos o utensilios a
la estructura." [OK]** (se cierra el selector y el contador sube). Eliminar -> casilla ->
"Eliminar" -> **"¿Desea proceder con la eliminación del registro seleccionado?" [Borrar]** ->
**"Éxito: Se eliminaron los registros correctamente" [OK]** (aparece unos segundos después).

### Especificaciones (n)

Tabla Descripción, Especificaciones, Tipo Dato (combo), Valor Inicial/Final, Margen, Decimal;
botones "Ensayos SAP" (actualizar), Imprimir, "+" Agregar, Guardar, Eliminar, Cancelar. "+" abre
"Adicionar Especificaciones": Ensayo Padre (combo), Ensayo Hijo, Especificaciones, Tipo Dato
(combo), Valores (Mínimo, Máximo, Margen), Decimales; Agregar / Cancelar.

### Etiqueta (n)

Tabla Orden, Código, Descripción, Items, Conforme (checkbox), Proceso Menor (checkbox), Acciones
(lápiz = Adicionar Pasos RMD). Botones Imprimir, "+" (tooltip "Etiqueta"), Guardar, Eliminar,
Cancelar. "+" abre "Adicionar Etiquetas: <ESTRUCTURA>" (Buscar + Ir, casillas, Agregar/Cancelar).

### Pasos (n)

Columnas: Orden, Depende (con ayuda de entradas), Código, Descripción, Tipo Dato, Clave Modelo,
Puesto Trabajo, Val. Inicial, Val. Final, Margen, Decimal, Estado CC, Estado Mov., PM OP, Gen PP,
Edit, R. Por, V.B., Imagen, Formato, Proc. Men., Estado. Botones de fila: **Imagen**, **Formato**,
**Procesos Menores**. Barra: Imprimir, "+" (tooltip "Agregar" o "Agregar Estructura"), Guardar,
Eliminar, Cancelar.

- "+" abre "Adicionar Pasos": Código Paso, Descripción, Estructura, Etiqueta, Flag Numeración + Ir;
  tabla (Código, Descripción, Estado, Num., Estructura, Etiqueta) con casillas; Agregar / Cancelar.
- **Guardar** -> "Éxito: Se guardaron correctamente los cambios." [OK] (sin confirmación previa).
- Clic en el **código del paso** abre "Editar Paso" (edita el paso **maestro**, no solo este RMD):
  Código Paso, Estructura, Etiqueta, Descripción Paso, Flag Numeración, Tipo de Dato (RMD en
  Linea), Clave Modelo, automatico, Valores (Mín/Máx/Margen), Decimales, Lapso; Grabar / Cancelar.
  ¡Cuidado al automatizar clics sobre esa columna!
- **Formato**: selector de color (Hex, R, G, B, A; Confirmar / Cancelar).
- **Imagen**: "Seleccione una imagen" (archivo, Posición Arriba/Derecha/Abajo, Tamaño 10–130).

### Procesos Menores

"Procesos Menores para el Paso: <cod> (<desc>)", tabla "Procesos (n)": Orden, Código,
Descripción, Cantidad Insumos, UM, Tab, Edit, Tipo Dato, Val. Inicial/Final, Margen, Decim.,
Gen PP, Estado CC, Estado Mov., Formato, Estado. Barra: Imprimir, "+" (tooltip "Adicionar Pasos
RMD" -> selector "Adicionar Pasos"), "Agregar Insumo" (abre "Adicionar Pasos": Código,
Descripción, UM, Cantidad; vacío si no hay insumos), Guardar, Eliminar, Cerrar.

## Notas de automatización

- Los clics por coordenadas del navegador integrado son poco fiables (el tamaño de la vista
  cambia); para exploración se usó `sap.ui.getCore().byId(...).firePress()` dentro del iframe.
  En Playwright los clics por rol/nombre no tienen ese problema.
- Los avisos de éxito pueden tardar (Generar Predecesores, Eliminar): esperar hasta ~15 s.
- Un clic en el cuerpo de una fila de la tabla principal abre "Editar RM" (no el envío).
