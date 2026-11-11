# Suspendidos que pasan a INACTIVO

Todo lo trabajado entre el 2026-11-05 y el 2026-11-07 para decidir qué RMD
suspendidos pasan al status nuevo **INACTIVO**. Léelo entero antes de seguir con
este tema desde otra sesión o cuenta. Estado al **2026-11-07**.

> **Lo que manda es la decisión del equipo** (columna `CONCLUSION DEL EQUIPO`
> del Excel del 07/11). Las sugerencias del cuadro (v1–v4) son historia: sirven
> para entender de dónde salió cada caso, no para decidir.

## 1. Objetivo

- Carlos quiere **bajar los suspendidos pendientes** y priorizar lo que se
  fabrica. Los RMD suspendidos que ya no ameritan una versión nueva pasan a un
  status nuevo que **TI va a implementar en el portal: INACTIVO**.
- Solo cuenta la **última versión de cada master** (la de mayor versión entre
  Autorizado, Ingresado y Suspendido). Si esa última está Suspendida, el master
  entra a la lista. **La última versión es la que pasa a INACTIVO; las versiones
  anteriores no se cuentan ni se listan** (Carlos lo exigió dos veces).
- Nombre recomendado y aceptado por ahora: **INACTIVO**, con **motivo
  obligatorio** (Sin demanda / RMD antiguo sin receta SAP / Duplicado: receta en
  otro RMD autorizado) y **reversible**: si un INACTIVO vuelve a tener forecast u
  orden de producción, regresa a Suspendido (revisión mensual). Se evitó
  «Obsoleto» o «Descontinuado» porque suenan definitivos.

## 2. Resultado final: decisión del equipo (2026-11-07)

Archivo: `/mnt/project-files/suspendidos-inactivo/ANALISIS DE SUSPENDIDOS - decision del equipo 2026-11-07.xlsx`

| Conclusión del equipo | Total | ATE (Planta 1) | LIMA (Planta 2) |
|---|---|---|---|
| **Pasa a INACTIVO** | **1 328** (74 %) | 892 (73 %) | 436 (74 %) |
| **Sigue SUSPENDIDO** | **478** (26 %) | 324 | 154 |
| Total revisado | 1 806 | 1 216 | 590 |

- 1 806 = las 1 804 filas del cuadro v4 + **2 filas de GRAVOL AP (LIMA)** que el
  equipo agregó a mano (`6000001752` GRAVOL AP CAP F4 CJA x 84 y `2202403353`
  GRAVOL AP CAP F4 CJA x 12; sin fechas, lotes ni forecast). Ambas a INACTIVO.
- Hoja **Lista** (1 806 filas): `CONCLUSION DEL EQUIPO` (INACTIVO / SUSPENDIDO)
  como primera columna, Planta, Área, Etapa, Código RMD, Versión, Descripción,
  Suspendido desde (última fecha, trazabilidad), Fecha del último lote, Lotes en
  12 meses, Forecast nov26-oct27 (unid), Dice «masivo», Observación del RMD.
- Hoja **Resumen**: fórmulas sobre la Lista (si cambian una conclusión, se
  recalcula): totales por planta, por etapa, prioridad y demanda de los que
  siguen suspendidos.
- Ese archivo es la versión limpia que se hizo a pedido de Carlos: se quitaron
  las columnas «Decisión sugerida» y «Por qué» y las hojas CONSO, Detalle1,
  Detalle2 y PRIORIDAD (tablas dinámicas sobre la sugerencia). **El original del
  equipo** (con esas hojas) es el que Carlos subió al hilo «Crear PPT de
  suspendidos a inactivo» (queda en `/mnt/project-files/uploads/hearth/`).

### Sugerencia del cuadro frente a la decisión del equipo

| Sugerencia del cuadro (v4) | A INACTIVO | Sigue SUSPENDIDO | Total |
|---|---|---|---|
| ACTUALIZAR | 8 (ATE 1, LIMA 7) | 175 (ATE 95, LIMA 80) | 183 |
| REVISAR | 182 (ATE 132, LIMA 50) | 34 (ATE 9, LIMA 25) | 216 |
| PASAR A INACTIVO (+2 GRAVOL) | 918 (ATE 592, LIMA 326) | 257 (ATE 220, LIMA 37) | 1 175 |
| NO CONSIDERAR | 220 (ATE 167, LIMA 53) | 12 (LIMA) | 232 |
| **Total** | **1 328** | **478** | **1 806** |

Lectura: el equipo **sí inactiva los cubiertos por otro RMD autorizado** (220 de
NO CONSIDERAR, como duplicados) y **deja suspendidos 257** que el cuadro proponía
inactivar.

### Detalle útil (de la PPT)

- De los 1 328 a INACTIVO: **729 nunca se fabricaron** desde feb-2023 (ATE 529,
  LIMA 200); **1 193 sin forecast**; los 135 con forecast están cubiertos por
  otro RMD (127) o los decidió el equipo (8).
- De los 478 que siguen suspendidos: **187 tienen forecast** (backlog real a
  actualizar), **153 tuvieron lotes en 12 meses**, **277 no tienen ni forecast
  ni lotes** (224 de ATE).
- Prioridad de los 478 = **año del último lote** (1 = 2026 o sin lotes, 2 = 2025,
  3 = 2023-2024). Prioridad 1: ATE 62 de 324 (19 %), LIMA 81 de 154 (53 %, incluye
  2 BETAVER sin lotes pero con forecast). El 62 % de ATE no fabrica desde
  2023-2024.

## 3. Cómo se armó el cuadro (criterios)

Fuentes (todo en solo lectura; nada se cambió en SAP ni en el portal):

- **Portal RMD** leído el 2026-11-05: 13 035 MD y 22 627 recetas
  (`/MD` y `/MD_RECETA` del modelo `mainModelv2`), con
  `analisis/suspendidos_inactivo/leer_md_suspendidos.js` + `correr.py` →
  `md_lectura.json`.
- **MD_TRAZABILIDAD** leída el 2026-11-06: 44 037 cambios de estado de 12 268 RMD
  (9 114 con al menos una suspensión), con `leer_traz.js` → `md_traz.json`.
- **COOISPI** del 2026-11-05: 120 691 órdenes desde feb-2023 (centro 1020 = ATE,
  1021 = LIMA). Cuentan órdenes con cantidad entregada o en LIB/ABIE. Los
  semielaborados (50xx) se vinculan al PT (60/62/63xx) por **lote compartido**.
- **Forecast Consolidado MIF 202610**: demanda consensuada; se suma
  **nov-2026 a oct-2027** por PT. PLM Status Z1/Z2 sin definir (Z2 parece
  descontinuado; confirmar con Planeamiento).

Pasos:

1. **Familia del master**: el campo `codigoversionprincipal` a veces apunta a la
   versión anterior (no a la raíz) y hay cadenas cortadas. Se unen por
   componentes conectados (código ↔ código principal) y además por **mismo
   nombre exacto + etapa + planta** (4 997 → 4 624 familias). Ejemplos que
   salían duplicados: TRAMEDIF 50mg (2202401933 v3 y 2202505836 v4), AGUA
   ESTÉRIL P/INYECCIÓN PEBD 1000mL (4 códigos), PROMESTINE 1% CRM (última
   2202507515 v4 Autorizada, así que no es suspendido).
2. **Última versión** = mayor versión entre Autorizado, Ingresado y Suspendido.
   Cancelado, Solicitud Rechazada y solicitudes sin aprobar no cuentan como
   última. Resultado: **1 804 masters con última versión Suspendida**.
3. **Receta/material del suspendido**: receta de la última versión → material
   por defecto → recetas de versiones anteriores → (RMD antiguos sin receta)
   código agrupador de la misma etapa (si da ≤ 15 materiales).
4. **Regla de Carlos («receta en RMD autorizado = cubierto»)**: si esa
   receta/material está en un RMD **Autorizado vigente de otro master**, el
   suspendido queda cubierto (caso ejemplo: **12914 IBUPROFENO**, cubierto por
   2202609394 v4 y otros dos). En el cuadro eso era «NO CONSIDERAR»; el equipo
   decidió inactivarlos como duplicados.
5. **Lotes y forecast** por material/PT y **última fecha de suspensión** (la
   última fila «Suspendido» de MD_TRAZABILIDAD).

Las 4 sugerencias del cuadro (v4, `Suspendidos_decision_simple_2026-11-06.xlsx`):

| Sugerencia | Total | ATE | LIMA | Criterio |
|---|---|---|---|---|
| ACTUALIZAR | 183 | 96 | 87 | Tiene forecast (con o sin lotes en 12 m) o ya tiene versión nueva solicitada. «Urgente» si lleva > 2 años suspendido. |
| REVISAR | 216 | 141 | 75 | Se fabrica sin forecast; RMD antiguo sin receta con nombre ≥ 85 % igual a un autorizado de la misma etapa; o RMD antiguo con producto parecido activo; o **sin forecast ni lotes pero suspendido hace < 6 meses**. |
| PASAR A INACTIVO | 1 173 | 812 | 361 | Sin forecast y: último lote hace 12-24 meses, sin lotes en 24 meses, nunca fabricado en SAP, o RMD antiguo sin receta SAP. |
| NO CONSIDERAR | 232 | 167 | 65 | Su receta ya está en otro RMD autorizado. |

Glosario: **RMD antiguo sin receta SAP** (antes «legado») = código de 5 dígitos,
anterior a SAP, que nunca se asoció a una receta; sin receta no hay lotes ni
forecast y se compara por nombre. **Masivo** = la Observación dice «masivo»; es
lo único que hoy cuenta en el backlog oficial de Indicadores (solo 26 suspendidos
lo tienen; muy pocos pasan a INACTIVO, así que la baja se ve en la lista de
suspendidos, no en la cifra de backlog). Ojo: **~730 suspensiones son de
jul-ago 2025 (migración a SAP)**; esa fecha dice poco y pesan más forecast y
lotes.

## 4. Historia de cifras (para no confundirse)

| Versión | Fecha | Base | A INACTIVO | Nota |
|---|---|---|---|---|
| v1 | 05/11 | 2 076 | 1 269 (698 recomendado, 256 sugerido, 315 sin receta SAP) | Tomaba Cancelado/Rechazado como última versión. |
| v2 | 05/11 | 2 441 | **1 349** (ATE 929, LIMA 420) | Regla «receta en RMD autorizado = excluido»: 687 excluidos, 222 pendientes, 183 revisar. |
| v3 | 06/11 | 2 441 | 1 272 | + última suspensión de trazabilidad (< 6 meses → revisar). |
| v4 simple | 06/11 | **1 804** | 1 173 | Solo la última versión por master (cadenas unidas). Base del equipo. |
| **Equipo** | **07/11** | **1 806** | **1 328** | **Decisión final.** |

El plan de pendientes (`docs/plan_reduccion_pendientes.md`) y el piloto usan las
cifras v2 (222 pendientes reales). Con la decisión del equipo, el backlog de
suspendidos a actualizar son los **478 que siguen SUSPENDIDOS** (187 con
forecast).

## 5. Dudas abiertas (confirmar con el equipo)

1. **8 de ACTUALIZAR pasan a INACTIVO aunque tienen forecast**: AMOXIDIN CL 250,
   GENTS PRESER, 2 ACNOMEL Opción B, REAC PRESERVATIVOS, ENCIGELMED, 2 MEDIVEL
   OVU (1 ATE, 7 LIMA). Confirmar que no se fabricarán.
2. **257 de PASAR A INACTIVO siguen SUSPENDIDOS** sin forecast ni lotes en 12
   meses (ATE 220, LIMA 37); **196 son RMD antiguos sin receta SAP**. Falta el
   motivo para mantenerlos; sugerencia: anotarlo en Observaciones.
3. **2 filas de GRAVOL AP** agregadas a mano (por eso 1 806 y no 1 804).
4. La hoja **PRIORIDAD** del original dice «fecha de suspensión» pero usa el
   **año del último lote**. En LIMA da 81/35/38 en la Lista y 80/35/39 en la
   tabla dinámica.
5. 12 de NO CONSIDERAR siguen suspendidos, todos de LIMA (CLORFENAMINA,
   IBUPROFENO, EVACLEAN y otros).
6. Qué significa PLM Status **Z2** en el forecast (Planeamiento).

## 6. Fecha de última suspensión en el portal (v1.125.0 / v1.126.0)

- **v1.125.0** (PR #80): en Exportar → «Última versión de cada master», la fecha
  de los suspendidos sale de la **última «Suspendido» de `MD_TRAZABILIDAD`**
  (`ultimaSuspensionDeTraz`, `fechaSuspUV`; antes era `fechaActualiza`). Va en
  «Desde», «Días en el estado», el filtro «Solo los suspendidos desde» y la
  columna «Última suspensión (trazabilidad)». Agrega la hoja «Solicitados»
  (Solicitado + Solicitud Aprobada).
- **v1.126.0** (PR #81, incluye la 1.125.0): hoja «Solicitados del mes».
  **Publicada** en SharePoint el 2026-11-07 (2 070 880 bytes).
- Con ese exportado se puede rehacer la lista de suspendidos (última versión +
  fecha de suspensión) sin scripts.

## 7. Pasos siguientes

1. **TI habilita el status INACTIVO** en el portal (aún no existe; estados
   actuales del master: 465 Autorizado, 467 Ingresado, 468 Suspendido). Pedirles
   también el campo **motivo** (Sin demanda / RMD antiguo sin receta SAP /
   Duplicado) o usar el campo Observación.
2. **Cargar los 1 328** a INACTIVO cuando exista el status. Cómo se hará no está
   definido: TI por carga masiva con la lista (lo más simple: entregarles la hoja
   Lista filtrada por INACTIVO con Código RMD y versión) o desde el portal con una
   acción masiva. **No escribir nada en SAP sin el OK escrito de Carlos.** Antes
   de cargar, volver a verificar que cada código siga siendo la última versión y
   siga Suspendido (pudo cambiar desde el 07/11).
3. **Regla mensual de reactivación**: cruzar INACTIVOS con forecast y COOISPI;
   si aparece demanda u orden, vuelve a Suspendido.
4. **Atender los 478 que siguen SUSPENDIDOS** por prioridad: primero los 143 de
   prioridad 1 (ATE 62, LIMA 81) y los 187 con forecast (ver
   `docs/plan_reduccion_pendientes.md` para qué es «actualizar»).
5. Resolver las dudas de la sección 5, sobre todo el motivo de los 277 sin
   demanda que siguen suspendidos.
6. Ajustar Indicadores de status-rmd cuando exista INACTIVO (que no cuente como
   suspendido ni backlog) — por decidir con Noelia/Carlos.

## 8. Archivos

En la carpeta compartida del proyecto `/mnt/project-files/suspendidos-inactivo/`:

| Archivo | Qué es |
|---|---|
| `ANALISIS DE SUSPENDIDOS - decision del equipo 2026-11-07.xlsx` | **Decisión final** (Resumen + Lista con CONCLUSION). |
| `Suspendidos_a_INACTIVO_decision_equipo_2026-11-07.pptx` | PPT de 11 diapositivas con la decisión (generador `generar_ppt_decision.js`, pptxgenjs). Las diapositivas 3, 5 y 6 aún comparan con la sugerencia. |
| `Suspendidos_decision_simple_2026-11-06.xlsx` | Cuadro v4 que revisó el equipo (1 804 filas, decisión sugerida + «Tu decisión»). |
| `RMD_suspendidos_propuesta_INACTIVO_2026-11-05_v2/v3/v4.xlsx` | Propuestas anteriores (base 2 441), con Detalle completo (materiales, PT, RMD que cubre, etc.). |
| `a2.py` … `a5.py`, `xl.py`, `xl3.py` | Clasificación y armado de Excel (pandas/openpyxl). |
| `correr.py`, `leer_md_suspendidos.js` | Lectura del portal. |

Copia de los scripts en este repo: `analisis/suspendidos_inactivo/` (más
`leer_traz.js`). Trabajan sobre pickles (`md.pkl`, `rc.pkl`, `coois.pkl`,
`fc.pkl`, `traz.pkl`) que se armaron desde `md_lectura.json`, `md_traz.json`, la
COOISPI y el forecast; ese paso de carga no quedó guardado y **los datos no van
al repo**. Los JSON quedaron en las PC de Carlos
(`C:\Users\cjesusz\Downloads\RMD\suspendidos-inactivo\` en MIFPCWLIMAGG17 /
DESKTOP-PHBTU0L). Orden: `a2 → a3 → xl (v2)`, `a4 → xl3 (v4)`, `a5 (simple)`.
Para rehacer el análisis desde cero es más simple partir del exportado
«Última versión de cada master» del portal (v1.126.0) + COOISPI + forecast.

## 9. Cómo retomar desde otra sesión

1. Lee este archivo y `CLAUDE.md`.
2. Abre el Excel de la decisión del equipo; es la fuente de verdad. Si el equipo
   cambia una conclusión, se cambia en la hoja Lista (el Resumen se recalcula) y
   se actualizan las cifras de este documento y de la PPT.
3. Si la otra sesión no ve `/mnt/project-files/`, pide a Carlos que adjunte el
   Excel y la PPT.
4. Mantén las reglas: solo la última versión por master; analizar con evidencia
   y dejar como CONSULTA lo dudoso; nada en SAP sin OK escrito de Carlos;
   archivos simples y términos entendibles (sin jerga).

## 9. Listado para el cambio automático a INACTIVO (2026-11-07)

`docs/rmd_a_inactivo_2026-11-07.csv` (separado por `;`, UTF-8): los 1 328
INACTIVO de la decisión del equipo cruzados con el portal del 07/11/2026 03:59Z
(lectura de `/MD`, solo lectura), con el **ID interno (`md_id`)** que usaría
un cambio de status masivo.

- `listo = SÍ` (1 313: ATE 880, LIMA 433): es la última versión de su master y
  sigue Suspendido.
- `listo = NO` (15): 12 de ATE con una versión o solicitud más nueva; MEJORAL
  MIGRAÑA (2202505691) hoy Autorizado y TIFOBIOTIC 500 mg (2202506269) hoy
  Cancelado; GRAVOL AP `6000001752` no es un RMD (es material; el RMD sería
  2202403352). Los revisa el equipo.
- **Antes de cambiar**, volver a verificar cada fila el mismo día (el portal
  cambia) y tener el OK escrito de Carlos. Generador:
  `/mnt/project-files/backlog-inactivos/inactivos.py` (md del portal + Excel
  del equipo). La página status-rmd ya no cuenta estos códigos como suspendidos
  ni backlog (REGISTRO-DE-MANUFACTURA-DIGITAL PR #52).

### Listado vigente 2026-11-11 (userscript v1.135.3)

Pedido de Carlos (11/11/2026): del análisis solo valen los INACTIVO, que no cambian: **1 328 (ATE 892, LIMA 436)**,
`docs/rmd_a_inactivo_2026-11-11.csv`. Los suspendidos son los que hoy están Suspendidos en SAP. Los 8 de ATE que REVISAR 8
había sumado (lista de abajo, 1 336) ya no son INACTIVO.

### Listado final 2026-11-09 (userscript v1.135.2, reemplazado)

`docs/rmd_a_inactivo_2026-11-09.csv`: los **1 336** «Pasa a INACTIVO» de la decisión final (ATE 900, LIMA 436; hoja «3 Suspendidos vs
INACTIVOS» del Excel de backlog de noviembre), todos con `md_id`. Desde la v1.135.2 el userscript usa este listado (antes los 1 313 de abajo).

### INACTIVO a la vista en el portal (userscript v1.127.0)

Mientras TI no crea el status, el userscript muestra como **INACTIVO** (solo a la vista) los 1 313 `md_id` con
`listo = SÍ` de este listado, siempre que hoy sigan Suspendidos: columna Estado de la lista principal, cabecera del RMD y
los Excel del script (Exportado original, Última versión de cada master, Mis movimientos). No escribe nada en el portal ni
en SAP. Si el equipo cambia el listado, se regenera la lista del script con
`node analisis/suspendidos_inactivo/generar_inactivos_js.mjs <csv>`.
