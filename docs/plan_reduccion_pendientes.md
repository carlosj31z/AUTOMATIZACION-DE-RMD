# Plan para reducir los RMD pendientes en equipo

Plan de trabajo conjunto (Carlos y compañeros, cada uno con **su propia cuenta de
Claude y su propia sesión de SAP**) para bajar los RMD suspendidos pendientes.
Escrito el 2026-11-06. Si eres un Claude que acaba de llegar: lee primero
`CLAUDE.md` (reglas permanentes) y luego este archivo de corrido; con eso basta
para empezar.

## 1. En 30 segundos

- **Qué hay**: 2 441 masters cuya última versión está **Suspendida** (ATE 1 684,
  LIMA 757). La mayoría no se fabrica.
- **Qué se propuso (2026-11-05)**: pasar 1 349 a un status nuevo **INACTIVO**
  (lo implementa TI), excluir 687 porque su receta ya está en otro RMD
  Autorizado vigente, y **actualizar los 222 pendientes reales**. Quedan 183
  por revisar caso por caso.
- **Qué hace el equipo**: cada persona reclama RMD en la hoja de seguimiento,
  crea la **versión nueva** con la receta actualizada y los controles de
  cambios aplicados, la deja **Ingresada** con su nomenclatura y avisa. Nadie
  toca un RMD que otro ya reclamó.

## 2. Glosario corto

| Término | Significado |
|---|---|
| RMD / master | Registro de Manufactura Digital en el portal SAP Fiori «Configuración RMD». Cada master tiene versiones (cada una con código propio). |
| Planta 1 / P1 | **ATE** (centro 1020). |
| Planta 2 / P2 | **LIMA** (centro 1021). |
| Estados de master | 465 Autorizado, 467 Ingresado, 468 Suspendido (también Solicitado, Cancelado, Rechazado). |
| Vigente | La **última versión Autorizada**. |
| Última versión | La de mayor versión **entre Autorizado, Ingresado y Suspendido** (Cancelado/Rechazado no cuentan). Misma regla del portal. |
| CC / NC / DES | Control de cambio / no conformidad / desviación. Listado oficial: Excel `1.-CC-NC-DES` (hojas PLANTA 1 y PLANTA 2). |
| ASC | Aseguramiento de la Calidad (no Asuntos regulatorios). |
| Masivo | Suspendido con «masivo» en Observaciones; solo esos cuentan en el backlog oficial de INDICADORES (hoy 26). |
| Portal / userscript | Las mejoras de interfaz (`tampermonkey/rmd-ui-mejoras.user.js`) que se cargan sobre el portal SAP. |
| status-rmd | `status-rmd.vercel.app` (repo `carlosj31z/REGISTRO-DE-MANUFACTURA-DIGITAL`): seguimiento, Producción, INDICADORES. |

## 3. Criterio de la propuesta INACTIVO (v2, 2026-11-05)

Fuentes: portal leído el 05/11/2026 (13 035 RMD, 22 627 recetas, solo
lectura), COOISPI del 05/11/2026 (órdenes desde feb-2023) y Forecast
consolidado MIF 202610 (nov-2026 a oct-2027). La **primera** regla que se
cumple decide:

| Orden | Clasificación | Regla |
|---|---|---|
| 0 | **EXCLUIDO** | Algún material del suspendido (receta de la última versión, material por defecto, recetas de versiones anteriores o, si no tiene, el cód. agrupador de la misma etapa) está en la receta de un RMD **Autorizado vigente de otro master**. No es inactivo ni pendiente (regla de Carlos; ejemplo: 12914 IBUPROFENO). |
| A | MANTENER – ya solicitada | El master ya tiene una versión nueva Solicitada o con Solicitud Aprobada. |
| 1 | **Prioridad alta** | Lotes en los últimos 12 meses **y** forecast > 0. |
| 2 | **Prioridad media** | Forecast > 0 sin lotes en 12 meses. |
| 3 | REVISAR | Se fabrica sin forecast; o posible duplicado por descripción (≥ 85 % parecido a un autorizado de la misma etapa); o legado sin receta parecido a un producto activo. |
| 4 | INACTIVO sugerido | Sin forecast; último lote hace 12–24 meses. |
| 5 | INACTIVO recomendado | Sin forecast y sin lotes en 24 meses, nunca fabricado, o legado sin receta ni material. |

Semielaborados 50xx se vinculan al producto terminado por el lote compartido en
COOISPI para buscar su forecast. INACTIVO lleva motivo obligatorio (Sin demanda
/ Legado sin receta SAP / Duplicado) y es reversible: cada mes, si aparece
forecast u orden, vuelve a Suspendido.

### Cifras

| Clasificación | Total | ATE | LIMA |
|---|---:|---:|---:|
| 0 Excluido (receta en RMD autorizado) | 687 | 477 | 210 |
| 1 Prioridad alta | **151** | 72 | 79 |
| A Ya tiene versión nueva solicitada | 1 | 0 | 1 |
| 2 Prioridad media | **70** | 51 | 19 |
| 3 Revisar | 183 | 155 | 28 |
| 4 + 5 INACTIVO | 1 349 | 929 | 420 |
| **Total suspendidos** | **2 441** | 1 684 | 757 |

**Pendientes reales a actualizar = 222** (151 alta + 70 media + 1 ya
solicitada): ATE 123, LIMA 99.

Archivos (carpeta compartida del proyecto, `/mnt/project-files/`):
`suspendidos-inactivo/RMD_suspendidos_propuesta_INACTIVO_2026-11-05_v2.xlsx`
(hojas Resumen y Detalle, una fila por master) y los scripts `a2.py`, `a3.py`,
`xl.py`. La lectura cruda del portal (`md_lectura.json`) está en la PC de
Carlos.

## 4. Qué significa «actualizar» un RMD pendiente

Un pendiente queda resuelto cuando su master tiene una **versión nueva** que:

1. **Receta actualizada**: se asocia la receta (lista de materiales) vigente de
   SAP con «Asociar fórmulas» / «Agregar Producto» del portal. La cantidad de
   insumos **no se edita en el RMD** (se corrige en la Lista de Materiales).
2. **Controles de cambios aplicados**: todo CC/NC/DES pendiente de la versión
   **inmediatamente anterior** («PENDIENTE CC», «SE SUSPENDE POR <n>-CC», «CC
   LOTIZADO PEND») y los del listado `1.-CC-NC-DES` que apliquen a esa planta y
   etapa. «SE SUSPENDE POR NUEVA VERSION / MIGRACION / AUDITORIA / NC» son
   motivos, no pendientes.
3. **Términos homologados**: los textos de los pasos usan los términos
   acordados, por ejemplo «control de calidad» → **«calidad en operaciones»**
   y «muestra para control de calidad» → **«cantidad muestreada»** (lista a
   completar con Carlos; ver el piloto). Todo en MAYÚSCULAS y **sin tildes**
   (la Ñ sí).
4. **Observaciones** (en este orden):
   - **1.ª línea = nomenclatura** del usuario SAP que hace la versión:
     `AAAAMMDD` + 2 iniciales `-prioridad(1-3)` `-C`complejidad (1 decimal)
     `-FI1.0-FA1.0-F`fase, p. ej. `20261106CJ-1-C2.0-FI1.0-FA1.0-F2`. El portal
     la sugiere; **la fase no se copia** de la versión anterior: se elige.
   - Una línea por **CC aplicado**, que **empiece** con el código:
     `26-379-CC/L.Fernandez/2026-10-22;Descripción;proceso;moderado` (usar
     «+ CC» del portal, que la arma desde el listado).
   - Notas necesarias: qué se actualizó de la receta, términos homologados
     cambiados, y lo que quede pendiente escrito como «PENDIENTE …» (así la
     siguiente versión lo hereda y el portal lo avisa).
5. Queda en estado **Ingresado** para su revisión y autorización por quien
   corresponda. Nadie autoriza su propio trabajo sin el flujo normal.

Qué **no** se hace: no se editan textos de un RMD Autorizado (regla de la
v1.115.0), no se cambia la cantidad de insumos, no se borra ni sobrescribe nada
en SharePoint, no se marca INACTIVO en SAP (eso lo hará TI cuando exista el
status).

## 5. Reglas permanentes (resumen; el detalle está en `CLAUDE.md`)

- Español siempre.
- **Pasos sin tildes**: ninguna palabra de los pasos lleva tilde. La detección
  automática de tildes del portal está apagada por defecto (v1.119.0); quien
  quiera ayuda la enciende en el panel.
- **Insumos**: la cantidad no se edita en el RMD.
- **Fases**: la fase de la versión nueva no se copia de la anterior (excepción:
  «Cambio de material»). En «Cambio de material» no se crea versión nueva.
- «Vigente» = última versión Autorizada.
- No cambiar las dimensiones de las ventanas del portal.
- **Escribir en SAP o SharePoint solo con el OK escrito de la persona dueña de
  la sesión**, en su propio hilo. Un Claude nunca usa la sesión SAP de otra
  persona ni guarda contraseñas.
- **PR**: cada Claude fusiona sus propios PR al terminar (regla de Carlos del
  2026-11-02), salvo borradores o PR descartados. Varias mejoras paralelas → un
  PR general.
- Userscript: versión nueva > la más alta en curso, incluye lo de versiones
  menores pendientes, y al terminar se sube a SharePoint (MEJORAS DE INTERFAZ)
  sin sobrescribir.

## 5 bis. Cómo debe razonar el Claude de cada persona

Pedido de Carlos (2026-11-06): **analizar e inferir, y si algo no quedó claro,
dejarlo como consulta**. En la práctica:

1. **Inferir con evidencia, no adivinar.** Antes de proponer cambios para un
   RMD, Claude lee (solo lectura) la versión suspendida y la anterior, sus
   Observaciones, la receta vigente en SAP, el listado `1.-CC-NC-DES` de su
   planta y, si existe, un RMD Autorizado parecido de la misma etapa. Con eso
   deduce qué CC faltan, qué términos hay que homologar y qué cambió en la
   receta.
2. **Decir de dónde sale cada conclusión** y con qué confianza:
   - *Seguro*: está escrito en SAP o en el listado (p. ej. «la v3 dice
     PENDIENTE 26-379-CC y el listado lo marca APLICA a esta etapa»).
   - *Inferido*: se deduce de datos parecidos (p. ej. «el RMD autorizado
     2202609191 de la misma etapa ya usa “calidad en operaciones”»). Se
     propone, pero la persona lo confirma antes de escribir en SAP.
   - *No claro*: datos contradictorios, faltantes o que dependen de una
     decisión de otra área → **CONSULTA**.
3. **Una consulta no frena el resto.** Se anota y se sigue con lo que sí está
   claro (o con el siguiente RMD). Nunca se rellena una duda con un supuesto
   en SAP.
4. **Dónde quedan las consultas**: en la hoja de seguimiento, columna
   **Consultas** (y ESTADO = `CONSULTA` si impide terminar), y en el reporte
   del RMD (sección «Consultas»). Formato: *pregunta concreta · a quién (Carlos,
   ASC, Planeamiento, Producción) · qué se hará según la respuesta*. Ejemplo:
   «¿El CC 26-412-CC aplica también a ACONDICIONADO? · ASC · si aplica, se
   agrega la línea y se ajustan los pasos 5.2 y 5.4».
5. **Patrones que se repiten** (la misma duda en varios RMD) se suben a la
   sección 10 de este documento para que la decida Carlos una sola vez, y la
   respuesta se escribe aquí como regla.
6. **Antes de escribir en SAP**, Claude muestra el resumen (receta, CC,
   términos, nomenclatura, notas) y espera el OK escrito de la persona.

## 6. Cómo se reparte el trabajo

### Cuentas y memoria

- Cada compañero usa **su propia cuenta de Claude** y **su propio usuario SAP**
  (así la nomenclatura y la trazabilidad quedan a su nombre).
- La memoria de un proyecto de Claude **no se comparte entre cuentas**. Lo
  compartido es **este repo** (`CLAUDE.md` + `docs/`) y la **hoja de
  seguimiento**. Para que el Claude de un compañero lea el repo, Carlos lo
  invita como colaborador en GitHub (`carlosj31z/AUTOMATIZACION-DE-RMD`).
- Primer mensaje sugerido para el Claude de un compañero: «Lee CLAUDE.md y
  docs/plan_reduccion_pendientes.md del repo AUTOMATIZACION-DE-RMD. Soy
  <nombre>, usuario SAP <usuario>, planta <ATE/LIMA>. Mis RMD reclamados son
  <códigos>.»

### Reparto

- **Por planta**: cada persona trabaja una planta (ATE o LIMA), la que conoce.
  ATE tiene 123 pendientes reales (72 alta), LIMA 99 (79 alta).
- **Por bloques**: dentro de la planta, se reclaman bloques de **5 a 10 RMD**
  consecutivos de la hoja (ya viene ordenada: prioridad alta → ya solicitada →
  media → revisar; dentro de cada una, más lotes en 12 meses primero). Nunca
  rangos enormes «por si acaso».
- **Un reclamo por RMD** en la hoja de seguimiento: antes de abrir el RMD en
  SAP, poner ESTADO = RECLAMADO, nombre, usuario SAP, cuenta/PC y fecha. Si la
  fila ya tiene nombre, no se toca. Un reclamo sin avance en **2 días hábiles**
  vuelve a LIBRE.
- Antes de crear la versión, **verificar en el portal** que la última versión
  sigue Suspendida y que nadie creó otra versión (si ya hay una Solicitada o
  Ingresada, marcar DESCARTADO o coordinar).
- Los «3 REVISAR» no se actualizan hasta que Carlos (con Planeamiento) decida
  si van a pendiente, INACTIVO o duplicado.

### Hoja de seguimiento

Archivo inicial: `/mnt/project-files/plan-pendientes/seguimiento_pendientes_2026-11-06.xlsx`
(405 filas: los 222 pendientes + 183 por revisar, con lotes, forecast y la
observación de SAP). Carlos la sube a una carpeta de SharePoint que todos
puedan editar a la vez (Excel en línea) y comparte el enlace; esa copia es la
única fuente de verdad. Columnas a llenar: ESTADO, Responsable, Usuario SAP,
Cuenta Claude / PC, Fecha reclamo, Código y versión nueva, CC aplicados,
Términos homologados aplicados, Consultas, Notas / bloqueo, Fecha ingresado, Fecha
autorizado.

Estados: `LIBRE → RECLAMADO → EN CURSO → INGRESADO → AUTORIZADO`, más
`CONSULTA` (hay una duda que impide terminar; va en la columna Consultas),
`BLOQUEADO` (falta algo externo; explicar en Notas) y `DESCARTADO` (ya no
aplica; explicar).

### Ritmo

- Piloto primero: Carlos hace 10 RMD de prioridad alta (hilo «Piloto: actualizar
  RMD pendientes reales») para fijar el procedimiento y la lista de términos
  homologados. Lo que el piloto decida **manda** sobre este documento: al
  cerrarlo, actualizar la sección 4.
- Luego, cada persona avanza su bloque; una revisión semanal corta con la hoja
  (cuántos ingresados, autorizados y bloqueados por planta).
- Para medir: «Enviar a Status RMD» desde el portal actualiza status-rmd; los
  RMD autorizados del mes salen en INDICADORES.

## 7. Cómo levantar el Chrome de pruebas (depuración 9222)

Para que Claude pueda **leer** el portal en tu PC con tu sesión (sin tocar tu
Chrome normal):

1. En Windows, cerrar otras ventanas abiertas con ese mismo perfil y ejecutar
   (PowerShell, desde la carpeta de trabajo, por ejemplo la del repo):

   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     --remote-debugging-port=9222 `
     --user-data-dir="$PWD\data\perfil_chromium"
   ```

   Usar la **ruta completa** del perfil si se corre desde otra carpeta.
2. En esa ventana, **tú** inicias sesión en el portal RMD (y en SharePoint si
   hace falta). Claude nunca pide ni guarda contraseñas.
3. Claude se conecta por CDP a `http://localhost:9222` (desde Python/Playwright
   con `connect_over_cdp`, o desde PowerShell con ClientWebSocket +
   `Runtime.evaluate` en PCs sin Python ni Node).
4. Este Chrome **no tiene Tampermonkey**: para usar las mejoras, Claude inyecta
   el `.js` del userscript a mano.
5. El portal cierra la sesión a los ~35–40 min aunque haya actividad: vuelve a
   iniciarla cuando Claude lo pida; las lecturas largas se guardan por partes.
6. Un solo Chrome con el puerto 9222 por PC. Si una PC necesita dos sesiones,
   usar otro puerto (9223) y otra carpeta de perfil.

Para trabajar desde Claude en tu PC hace falta que tu cuenta tenga la PC
conectada (carpeta aprobada o Remote Control). Si la PC no tiene el repo, basta
con la carpeta de trabajo y PowerShell.

## 8. Plantilla de reporte por RMD

Copiar al terminar cada RMD (en el hilo de Claude y resumido en la hoja):

```text
RMD: <código master> v<versión suspendida> -> nueva <código nuevo> v<versión nueva>
Planta / área / etapa: <ATE|LIMA> / <área> / <etapa>
Producto: <descripción>
Prioridad: <alta|media|ya solicitada>   Lotes 12m: <n>   Forecast: <unid>
Responsable: <nombre> (usuario SAP <usuario>)   Cuenta/PC: <cuenta> / <PC>
Estado final: <INGRESADO|CONSULTA|BLOQUEADO|DESCARTADO>   Fecha: <AAAA-MM-DD>

Nomenclatura (1.a linea): <AAAAMMDDXX-p-Cx.x-FI1.0-FA1.0-Fn>
Receta asociada: <receta / version de fabricacion> (antes: <receta anterior>)
CC aplicados:
- <26-379-CC/L.Fernandez/2026-10-22;Descripcion;proceso;moderado>
Pendientes heredados de la version anterior: <ninguno | lista> -> <resuelto | sigue PENDIENTE>
Terminos homologados cambiados: <"control de calidad" -> "calidad en operaciones" (pasos 4.1, 4.3) | ninguno>
Inferencias (confirmadas por el responsable): <conclusion · de donde sale>
Consultas: <pregunta concreta · a quien · que se hara segun la respuesta | ninguna>
Otras notas: <lo que el revisor debe saber>
Bloqueos: <ninguno | que falta y quien lo resuelve>
```

## 9. Archivos y lugares

| Qué | Dónde |
|---|---|
| Reglas permanentes y estado del proyecto | `CLAUDE.md` |
| Este plan | `docs/plan_reduccion_pendientes.md` |
| Cómo se configura un RMD en el portal | `docs/como_se_configura_un_rmd.md`, `docs/configurar_rmd_verificado.md` |
| Indicadores y backlog | `docs/indicadores_rmd.md` |
| Manual de cada mejora del portal | `tampermonkey/README.md` |
| Propuesta INACTIVO v2 (Excel y scripts) | `/mnt/project-files/suspendidos-inactivo/` (carpeta del proyecto de Carlos) |
| Hoja de seguimiento inicial | `/mnt/project-files/plan-pendientes/` → copia en SharePoint (enlace de Carlos) |
| Listado de CC/NC/DES | Excel `1.-CC-NC-DES` (se carga en *Reglas de revisión › Controles de cambio* del portal) |
| Evidencias de CC | SharePoint `.../04.-RMD/4.- EVIDENCIA CC Y NC MASIVOS/<CC>/Acción <n>/` (sin sobrescribir) |

## 10. Abierto (consultas para Carlos)

- Lista completa de **términos homologados** (sale del piloto).
- Decisión sobre los 183 «REVISAR» y confirmación con Planeamiento de qué es
  PLM Status Z2 (parece descontinuado).
- Fecha en que TI habilita el status INACTIVO.
- Enlace de SharePoint de la hoja de seguimiento y lista de compañeros con su
  planta.
