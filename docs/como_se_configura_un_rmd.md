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
