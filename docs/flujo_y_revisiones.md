# Flujo de trabajo y revisiones posteriores al ingreso

## Paso 0 — ¿Hay un RMD de referencia?
Antes de tocar nada se pregunta al usuario si existe un RMD de referencia y se le pide su **"Codigo RMD"**
(por ejemplo `2202608443`). Si lo hay, se lee en solo lectura, se guarda en `data/snapshots/ref_<codigo>.json`
y se compara contra el RMD a modificar. Se puede indicar con `--referencia <codigo>` o con `rmd_referencia:`
en la especificación YAML; si no se da, `cambios aplicar` lo pregunta.

## Después del ingreso — revisiones (se preguntan al usuario)
Al terminar (`verificado`), el programa pregunta si se quieren aplicar estas revisiones. Se hacen con el asistente,
leyendo SharePoint en solo lectura:

| Revisión | Fuente (SharePoint, `DOCUMENTACION TECNICA/04.-RMD/...`) | Qué se comprueba |
|---|---|---|
| Tren de equipos | `2.- LISTADOS AMBAS PLANTAS/LISTADOS PL2/TREN DE EQUIPOS PL2.xlsx` (hojas ACONDICIONADO, SOL, COSMETICOS, PEF) | Los equipos del RMD coinciden con la línea/sala y la balanza asociada de la etapa. |
| Controles de cambio pendientes | `2.- LISTADOS AMBAS PLANTAS/1.-CC-NC-DES Para actualizar RMD.xlsx`, hoja **PLANTA 2** | Filas con ESTATUS vacío/PEND/PENDIENTE/EN PROCESO cuya área y etapa aplican al RMD (o cuyo correo lo menciona). |
| Utensilios y accesorios | `UTENSILIOS/PLANTA 2/` (un Excel por área: SOL, ACO, CBL, COS, IHS, INH, MEN, PEF, SEH, SEM, SHO, P2 CBL…) | Los utensilios de cada sección del RMD coinciden con la lista vigente del área (la más reciente por versión/fecha). |

Nota: en la hoja PLANTA 2 la columna APLICA puede ser SI / NO / SI-BORRADOR; los ítems "Creación de receta" o
"producto nuevo" suelen ser NO para RMD existentes. Se revisa caso por caso; no se aplican cambios sin confirmar.
