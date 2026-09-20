# Cómo se configura un RMD (aprendido de RMD reales autorizados, Planta Lima)

Fuente: lectura de solo lectura de **33 RMD autorizados** de Planta Lima (los más recientes por
etapa y área): 12 de **Fabricación**, 10 de **Envase**, 11 de **Acondicionado** — 2.460 pasos en
total. Áreas cubiertas: Cápsulas blandas, Cosméticos, Iny. hormonales, Iny. biológicos,
Mentholatum, Polvos efervescentes, Semisólidos, Semisólidos horm., Sólidos, Sólidos hormonales,
Sólidos 4 CO, Planta plásticos 2, Acondicionado y Reacondicionado. (Las áreas sin RMD
autorizado en Lima para esa etapa salieron vacías.) Los datos brutos no se versionan; aquí van las
reglas.

## 1. Esqueleto de estructuras

Orden fijo en casi todos: PRECAUCIONES · NOTAS IMPORTANTES DURANTE EL PROCESO · EQUIPOS /
INSTRUMENTOS / MATERIALES · INSUMOS · CONDICIONES AMBIENTALES · PROCEDIMIENTO · (ESPECIFICACIONES
DE PRODUCTO EN PROCESO: **GRANEL** en Fabricación / **ENVASE** en Envase / ninguna en
Acondicionado) · VERIFICACION DE FIRMAS. INSUMOS es de solo lectura ("Ver Insumos": Cód. Insumo,
Descripción, Cant. Receta, Cant. en RMD, UM) porque sale de la receta asociada.

## 2. Etiquetas dentro de PROCEDIMIENTO (siempre 5)

| Etapa | Etiquetas |
|---|---|
| Fabricación | DOCUMENTACION · PREPARACION DE LAS MAQUINAS O EQUIPOS · PREPARACION DEL MATERIAL · **FABRICACION** · RENDIMIENTO |
| Envase | DOCUMENTACION · PREPARACION DEL MATERIAL DE ENVASE · PREPARACION DE LAS MAQUINAS O EQUIPOS · **ENVASE** · RENDIMIENTO |
| Acondicionado | DOCUMENTACION · PREPARACION DEL MATERIAL · PREPARACION DE LAS MAQUINAS O EQUIPOS · **ACONDICIONADO** · RENDIMIENTO |

- El orden de las dos preparaciones varía entre RMD; las demás son fijas.
- Tamaño típico: Documentación 9–13 pasos, Preparación de máquinas 4–17, Preparación de material
  4–10, etapa principal 20–112 (Fabricación) / 7–10 (Envase) / 39–75 (Acondicionado), Rendimiento 7–13.
- Excepción: inyectables biológicos estériles (p. ej. "LINEA ROTA - VIALES") usan etiquetas propias
  (Preparación de materiales, equipos y accesorios · Preparación de la solución del medio de
  cultivo · Filtración) y **sin** Rendimiento.

## 3. Tipo de dato por estructura/etiqueta (frecuencia real)

| Dónde | Tipo de dato dominante |
|---|---|
| Precauciones, Notas importantes | Verificación Check |
| Condiciones ambientales | **Sin tipo de dato** (112 de 113; temperatura/humedad van en la descripción, no como Rango) |
| Documentación | Múltiple check (280) + Fecha y Hora (34) + Notificacion (32) |
| Preparación de máquinas / material (y de envase) | Múltiple check + Fecha y Hora + alguna Notificacion |
| FABRICACION | Realizado por (216) · Realizado por y Visto bueno (139) · Notificacion (80) · Sin tipo de dato (102) · Visto bueno (8) · Fecha y Hora (8) |
| ACONDICIONADO | Realizado por (307) · Realizado por y Visto bueno (109) · Notificacion (50) · Sin tipo de dato (74) · Fecha y Hora (16) |
| ENVASE | Múltiple check (72) + Fecha y Hora (15) + Notificacion (5) |
| RENDIMIENTO | Fórmula (129) · Números (35) · MuestraCC (32) · Entrega (32) · Sin tipo de dato (32) |

Casillas asociadas al tipo (constantes en los 2.460 pasos): Realizado por → R. Por · Realizado por y
Visto bueno → R. Por + V.B. · Visto bueno → V.B. · Notificacion / Fecha y Hora / Fórmula / Números /
Entrega → Edit · MuestraCC → Estado CC + Edit · Múltiple check y Sin tipo de dato → ninguna. "PM OP"
y "Gen PP" aparecen en muy pocos pasos. Decimal: Fórmula/Entrega/MuestraCC/Números usan 3 (o 0
cuando la unidad es entera: cajas, folios); "Sin tipo de dato" usa 0. **Decimal es obligatorio para guardar.**

### Rendimiento (plantilla casi fija)

1. Cantidad teórica / recibida (Fórmula con "CT" = Cantidad Teórica, o Números en Envase/Acond.)
2. Cantidad muestreada → **MuestraCC** (Estado CC + Edit)
3. Cantidad entregada → **Entrega**
4. Cantidad obtenida → **Fórmula** = entregada + muestreada (p. ej. `5275 = paso2 + paso3`)
5. Merma → **Fórmula** = teórica − obtenida
6. Cálculo de rendimiento (%) → **Fórmula** = obtenida / teórica * 100
7. Rango de aceptación (p. ej. 90%–100%) → Sin tipo de dato

Diálogo "Fórmulas": lista de pasos disponibles y lista de la fórmula; el select "Seleccionar signo"
ofrece `( ) + - * /` y `CT`; hay un campo "Ingrese Cantidad" para constantes (`* 100`). La fórmula se
arma **por orden de inserción** (no se reordena) y una vista previa muestra p. ej.
`5275 / 5533 * 100`. Sin signos entre pasos la fórmula queda mal (`5224  181147`).

## 4. Notificaciones (Tipo Dato = Notificacion)

Tres claves de modelo: **Setup Pre Proceso**, **Proceso**, **Setup Post Proceso**, cada una con un
paso de inicio y otro de fin ("FECHA / HORA INICIAL/FINAL DEL SET UP", "INICIO/FINAL DE …") y el
**Puesto de Trabajo** del área (FMENFA01, FCBLFA01, FSOLFA02, AACOAC02, EACOEN04…).

- DOCUMENTACION, primer paso ("FECHA / HORA INICIO"): Setup Pre Proceso.
- Última preparación (paso final "FECHA / HORA FINAL"): Setup Pre Proceso.
- Etapa principal: por cada máquina/puesto se repite Setup Pre (ini/fin) → Proceso (ini/fin) → Setup
  Post (ini/fin). Un producto con varios puestos (encapsulado, secado, inspección) cambia el
  Puesto de Trabajo en cada tramo (Dolomax: FCBLFA01, FCBLEP01, FCBLSE01, FCBLIN01).
- Acondicionado: Proceso (ini/fin) + Setup Post (ini/fin) con su puesto. Envase casi no notifica
  dentro de la etapa principal.

## 5. Predecesores ("Depende")

Formato del campo: `código_del_predecesor (orden)`; solo admite **un** predecesor por paso. Si el
código no existe en el RMD se muestra sin `(orden)` (referencia colgante: 14 de 1.881 casos, un
riesgo de calidad tras cambiar pasos: regenerar).

Reglas observadas:

- **Cadena lineal**: cada paso depende del anterior de su etiqueta (≈ 78 %).
- **Los pasos "Sin tipo de dato" no tienen predecesor** (178 de los pasos sin predecesor) y el paso
  siguiente depende del que estaba **antes** del Sin tipo (se "salta" el encabezado) — coincide con el
  manual 7.7.
- **Primeros pasos**: DOCUMENTACION y las dos preparaciones dependen del **último paso de NOTAS
  IMPORTANTES** (en paralelo); la etapa principal depende del **último paso de la preparación
  anterior** (p. ej. Preparación del material). Acondicionado a veces queda sin predecesor en el
  primero.
- **Ramas paralelas** (≈ 208 casos, en la etapa principal): operaciones simultáneas o
  notificaciones cuyo predecesor es un paso anterior no adyacente (p. ej. "inicio de preparación"
  depende de "condiciones ambientales", "inicio del encapsulado" depende del "final de
  preparación").
- **CONDICIONES AMBIENTALES y RENDIMIENTO no llevan predecesores.**
- El botón **Generar Predecesores** genera una cadena lineal completa en orden de estructuras (incluso
  encadenando Rendimiento con el último paso de Fabricación y a los Sin tipo de dato). Sirve de base:
  después hay que **quitar** los predecesores de Rendimiento/Condiciones, **saltar** los Sin tipo de
  dato y añadir las ramas paralelas. Regenerarlo tras añadir pasos los engancha a la cadena. El aviso
  de éxito ("Se generaron los predecesores correctamente.") tarda varios segundos.

## 5 ter. Asignar "Depende" a mano (verificado en RMD PRUEBA, Fabricación de 151 pasos)

Mecanismo: en "Pasos (n)", el ícono "Mostrar ayuda para entradas" de la celda Depende abre "Lista de
Predecesores": lista de selección única con buscador que muestra **todos** los pasos del RMD
("<ESTRUCTURA> - Codigo: X … Orden: N"). Como un código puede repetirse (p. ej. "CONDICIONES
AMBIENTALES:" aparece varias veces), hay que elegir por **código y orden**. Para quitar el predecesor
se vacía el campo. Luego Guardar ("Se guardaron correctamente los cambios."). Se aplicó la regla de la
operación (predecesor = paso anterior; los "Sin tipo de dato" ni llevan predecesor ni son predecesor
del siguiente): 105 pasos encadenados, 45 "Sin tipo de dato" sin predecesor, 0 discrepancias tras
guardar y reabrir. También se comprobó que se admiten **paralelos** (dos pasos con el mismo
predecesor) y se restauró la cadena. En pantalla, el `(n)` de "código (n)" es el orden del predecesor.

### Cómo aparecen los paralelos en los RMD reales (regla "predecesor = anterior no Sin tipo")

Cumplen la regla: Fabricación 84 % (377 de 451 pasos con tipo), Acondicionado 91 % (440/482), Envase
88 % (81/92). El resto son ramas paralelas (≈ 62 en Fabricación, 35 en Acondicionado, ~1 en Envase) y
unos pocos pasos sin predecesor (7 en Fabricación). Patrones:

1. **Tareas simultáneas tras el inicio**: varios pasos con el mismo predecesor, normalmente la
   notificación de inicio ("FECHA / HORA INICIO DE FABRICACION/ACONDICIONADO"): p. ej. Mentholatum #4 y
   #6 ← #2; Acondicionado Mentholatum #9, #11, #12 ← #6. Suelen ser pasos redactados "PARALELAMENTE…"
   o "EN PARALELO…".
2. **Bloque de Control de Calidad**: "EL PERSONAL DE CALIDAD INGRESA…" (Realizado por + Estado CC)
   depende del último paso operativo (no de la notificación final): corre en paralelo con el cierre;
   "TRASVASAR EL PRODUCTO APROBADO" depende del primer paso de CC y no del Visto bueno del jefe.
3. **Notificaciones encadenadas por puesto**: "Setup Pre" del siguiente puesto ← "Setup Post final" del
   anterior; "Inicio de proceso" ← "Fin de la preparación" (NOT→NOT: 10 casos); el Setup Post inicial
   depende de la notificación de **fin del proceso**, saltándose el bloque de CC.
4. **"CONDICIONES AMBIENTALES:" repetido dentro del procedimiento** depende de un paso anterior
   (medición en paralelo con la operación).
5. **Pasos condicionales o independientes sin predecesor** ("EN CASO QUE…", "BAJO LA SUPERVISION DEL
   JEFE…", "PARALELAMENTE TRITURAR…", "ENTREGAR LA DOCUMENTACION…": los no-Sin-tipo sin predecesor).
6. Un solo predecesor por paso: el "cierre" de una rama paralela (join) se resuelve haciendo que el
   paso siguiente dependa de la rama principal; la otra rama simplemente termina.

Los primeros pasos de cada etiqueta cruzan etiquetas (`código (orden en la otra etiqueta)`).

## 5 quater. Casillas (Edit, R. Por, V.B., Estado CC, PM OP, Gen PP)

Salen del **tipo de dato**, con estas excepciones observadas en los 2.460 pasos:

| Casilla | Cuándo se marca |
|---|---|
| **Edit** | El operario registra un valor en el RMD digital: Fecha y Hora, Fecha, Hora, Notificacion, Números, Rango, Texto, Lote, Fecha Vencimiento, Fórmula, Entrega, MuestraCC, Verificación Check en procesos menores de verificación. No se marca en Múltiple check, Realizado por, Visto bueno ni Sin tipo de dato. |
| **R. Por** | Tipo "Realizado por" y "Realizado por y Visto bueno" (firma de quien ejecuta). |
| **V.B.** | "Visto bueno" y "Realizado por y Visto bueno" (firma del jefe/supervisor: pasos críticos como despejes, adiciones de insumo, trasvases). Excepciones raras: "Realizado por" o "Múltiple check" con R. Por + V.B. cuando el paso exige visto bueno. |
| **Estado CC** | Pasos de **Control de Calidad**: "EL PERSONAL DE CALIDAD … INGRESA…" y "CALIDAD … REGISTRA LOS RESULTADOS" (Realizado por + Estado CC, 34 casos), MuestraCC (Estado CC + Edit) y, en procesos menores, "CANTIDAD MUESTREADA" y "FECHA / HORA DE MUESTREO" (Edit + Estado CC). |
| **PM OP** | Paso **opcional** según la OP ("ELIJA LA OPCION SEGUN CORRESPONDA", "REALIZAR LA PRUEBA DE INTEGRIDAD… SEGÚN CORRESPONDA", "COLOCAR LAS CHAQUETAS…", "REGISTRAR LA MATERIA PRIMA…"): 3–7 casos en 33 RMD. |
| **Gen PP** | Muy raro (1 caso: preparar la máquina codificadora); genera datos de producto en proceso. |
| **Estado Mov.** | No aparece marcada en ninguno de los RMD leídos. |

## 5 quinquies. Clave Modelo y Puesto de Trabajo (Notificacion + Edit)

- Tipo "Notificacion" siempre con **Edit** marcado (199 de 199).
- **Puesto Trabajo**: las opciones del combo son exactamente los puestos de la **hoja de ruta de la
  receta asociada**. Dolomax (receta 5000001459, P. Trabajo principal FCBLFA01) ofrece 4 puestos
  (FCBLFA01, FCBLEP01, FCBLSE01, FCBLIN01) y los usa en sus notificaciones. Sin receta asociada (RMD PRUEBA)
  el combo solo trae los puestos heredados. **Regla de negocio (confirmada por la operación):** a una
  versión nueva NO se le puede asociar la receta mientras la versión anterior esté autorizada y use esa
  misma receta; la asociación se hace al autorizar la nueva versión (la anterior deja de usarla). Por eso una
  versión Ingresada recién creada aparece con "Recetas Asociadas: Sin datos", INSUMOS en 0 y las
  notificaciones sin Puesto de Trabajo: es el estado esperado, no un pendiente. Para RMD nuevos sin
  versión previa que use la receta, sí se asocia antes (la tabla "Recetas Asociadas" muestra P. Trabajo,
  H. Ruta y Contador). Cómo se completan los puestos de una versión nueva antes de autorizar sigue por
  confirmar.
- **Clave Modelo**: la lista tiene 47 valores, pero solo tres se usan en notificaciones: **Setup Pre
  Proceso**, **Proceso** y **Setup Post Proceso** (el resto son nombres de personas/proveedores).
- Secuencia por puesto: 1.er puesto — Documentación "FECHA / HORA INICIO" = Setup Pre (inicio) y el
  "FECHA / HORA FINAL" de la última preparación = Setup Pre (fin); en la etapa principal: Proceso
  (inicio y fin de la preparación/fabricación) → Setup Post (inicial y final). Cada puesto siguiente:
  Setup Pre (ini/fin) → Proceso (ini/fin) → Setup Post (ini/fin).

## 5 sexies. Otros detalles de la configuración

- **Etiquetas ("Etiqueta (n)")**: "Conforme" ✓ en Documentación y en las dos preparaciones, ✗ en la
  etapa principal y Rendimiento. "Proceso Menor" ✓ siempre en la etapa principal y en la preparación que
  tiene procesos menores (Preparación del material o de máquinas según el producto); ✗ en Documentación
  y Rendimiento.
- **Procesos menores** (botón de fila azul = tiene; rojo = no tiene): son líneas de captura bajo un paso.
  Tipos reales: notas/instrucciones (Sin tipo de dato, decimal 0); **insumos** de la receta (Números,
  decimal 3, con "Cantidad Insumos", sin Edit); Hora inicio/final (Hora, Edit); velocidad/temperatura de
  proceso (Números decimal 1, Edit); presión (Texto, Edit); **temperatura y humedad ambiental
  (Rango 15–25 / 1–100, margen 10, decimal 1, Edit)** dentro del paso "CONDICIONES AMBIENTALES:";
  muestreo de CC (Números decimal 3 + Fecha y Hora, Edit + Estado CC); verificación del jefe
  (Verificación Check, Edit); en Acondicionado además Lote, Texto (fecha de elaboración/expira),
  Verificación Check por máquina y Rango de velocidad de faja. Los procesos menores no tienen "Depende".
  Envase (ejemplo 2202608966) no tenía procesos menores en la etiqueta ENVASE.
- La estructura **CONDICIONES AMBIENTALES** de un RMD son solo textos (Sin tipo de dato): los valores
  medibles se capturan en los procesos menores del paso "CONDICIONES AMBIENTALES:" del Procedimiento.
- **INSUMOS** (estructura 4) es solo lectura ("Ver Insumos"): viene de la receta asociada
  (Cód. Insumo, Descripción, Cant. Receta, Cant. en RMD, UM); sin receta no hay insumos que asignar a los
  procesos menores.

## 5 bis. Qué tener en cuenta al configurar

1. Añadir pasos del catálogo existente; no crear pasos maestros sin necesidad (afecta a todos los RMD).
2. Tipo de dato según la tabla del apartado 3 (no usar Rango/Números para condiciones ambientales).
3. Marcar las casillas que corresponden al tipo (R. Por, V.B., Edit, Estado CC).
4. Poner **Decimal** siempre; guardar; recién entonces aparece el botón "Fórmula".
5. Formulas con signos en orden; verificar la vista previa antes de guardar.
6. Notificaciones: Clave Modelo + Puesto de Trabajo del área, inicio y fin en pareja.
7. Predecesores: Generar Predecesores, luego refinar (Sin tipo de dato, Rendimiento, ramas).
8. Al terminar: Configuración Inicial (avisa con "¿Desea realizar la configuracion inicial?") y revisar.

## Correcciones a la prueba anterior (RMD PRUEBA)

- La fórmula de "Cantidad obtenida" se guardó primero sin signo; se rehízo como `5224 + 181147`.
- Temperatura/humedad de Condiciones ambientales se habían puesto como Rango; en la práctica real son
  "Sin tipo de dato" y se revirtieron.
