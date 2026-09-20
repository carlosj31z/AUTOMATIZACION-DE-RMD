# Automatización RMD (Registro de Manufactura Digital) — Medifarma

Automatiza el ingreso y la configuración de Registros de Manufactura Digital
(RMD) sobre la app **Configuración RMD**, construida a partir del manual
funcional (`MANUAL ELABORACION DE RMD.docx`, sitio SharePoint `RMD`) y del BPD
`Conf_RMD`.

## Qué es RMD, técnicamente

Según la documentación técnica (`DT-Documentación_Tecnica- RMD...(SAP).docx`,
sitio `desarrollosapcp`):

- Frontend: app **SAP UI5** dentro de un **Fiori Launchpad**, desplegada en
  **SAP BTP Cloud Foundry**.
- Backend: **ABAP** con servicios **OData** (Gateway) que exponen EntitySets
  como `ProductoSet`, `RecetaSet`, `EquipoSet`, `MaterialSet`, `OrdenSet`,
  `NotificacionSet`, entidades de documentos DMS, etc. (documentados para la
  app "Registro"; la app "Configuración" usa su propio servicio, cuyas URLs
  no estaban completadas en la documentación disponible).
- Autenticación: **SAP Identity Authentication Service (IAS)** con Role
  Collections (`RMD_JEFE_DE_PRODUCCION`, `RMD_GERENTE_DE_PRODUCCION`,
  `RMD_JEFATURA_DOCUMENTACION`, `RMD_IDE`, etc.).

## Qué opción es más eficiente

Hay dos formas de automatizar esto, y no son excluyentes:

| | **A. Vía API/OData (backend)** | **B. Vía interfaz (RPA con Playwright)** |
|---|---|---|
| Velocidad y estabilidad | Alta: llamadas HTTP directas, sin esperar renderizado de UI5 | Media: depende del DOM, hay que esperar popups/animaciones |
| Resistencia a cambios de UI | Total (no toca la UI) | Baja/media: un cambio de layout puede romper selectores |
| Requiere para empezar | Usuario técnico/OAuth2 con acceso al servicio Gateway + metadata (`$metadata`) del servicio de **Configuración** (no documentado aún) | Usuario de servicio con login a IAS (sin MFA interactivo) — nada más |
| Puede construirse hoy, sin depender de IT/BTP | No | Sí |
| Volumen alto de operaciones | Ideal | Limitado (cada acción abre/cierra diálogos reales) |

**Recomendación: opción A (API/OData) es la más eficiente a mediano plazo**,
pero requiere que el equipo de BTP (Seidor/NTT Data o el equipo interno)
entregue el `$metadata` y credenciales de un usuario técnico para el servicio
OData específico de **Configuración RMD** (distinto del servicio ya
documentado para "Registro"). Mientras se gestiona ese acceso, este
repositorio implementa la **opción B (RPA con Playwright)** porque:

1. Reproduce exactamente los pasos que ya están validados en el manual
   funcional (filtros, Configuración Maestra, Configurar el RMD, Flujo de
   Aprobación).
2. No depende de que IT exponga documentación adicional para arrancar.
3. Queda aislada detrás de una capa (`RmdAutomation`, `pages/*.py`) que se
   puede reemplazar por un cliente OData el día que exista acceso a la API,
   sin cambiar el formato de los archivos de "batch" ni el CLI.

## Instalación

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium
cp .env.example .env   # completar RMD_LAUNCHPAD_URL / RMD_USERNAME / RMD_PASSWORD
```

## Uso

```bash
rmd-automation acciones                       # lista las operaciones soportadas
rmd-automation validar examples/batch_ejemplo.yaml   # valida el archivo sin abrir navegador
rmd-automation batch examples/batch_ejemplo.yaml     # ejecuta las operaciones contra RMD
```

Un archivo de "ingreso" (batch) es una lista de operaciones declarativas:

```yaml
operaciones:
  - accion: crear_estructura
    params:
      descripcion: "Preparación de materiales"
      tipo_estructura: "Procesos"
      requiere_verificado_por: true
  - accion: configurar_rmd_estructuras
    params:
      codigo_rmd: "RMD-000123"
      estructuras: ["Preparación de materiales", "Envase"]
```

Cada operación mapea 1:1 a una acción del manual (ver `src/rmd_automation/batch.py`
para la lista completa: creación de estructuras/etiquetas/pasos/motivos/
utensilios/motivo-lapsos en Configuración Maestra, configuración de un RMD
—estructuras, etiquetas, fórmulas, equipos, pasos—, exportar máster, agregar
documento/nota, envío a jefe, cambio de destinatario, autorización).

## Estructura del proyecto

```
src/rmd_automation/
  config.py              # variables de entorno (.env)
  browser.py             # login SAP IAS + sesión Playwright
  pages/                 # un módulo por pantalla del manual (Page Object Model)
    configuracion.py         # sección 3: filtros, exportar máster, ver OP, documentos, notas
    configuracion_maestra.py # sección 4: estructuras, etiquetas, pasos, motivos, utensilios
    rmd_editor.py             # secciones 5-7: "Configurar el RMD"
    flujo_aprobacion.py       # sección 8: enviar a jefe, autorizar
  actions.py              # fachada de alto nivel (RmdAutomation)
  batch.py                # runner declarativo (YAML/JSON) + tabla de despacho
  cli.py                  # comandos: batch / validar / acciones
examples/batch_ejemplo.yaml
tests/test_batch.py       # valida el parser de batch sin necesitar RMD real
```

## Limitaciones importantes (léelas antes de usar en producción)

- **Los selectores de Playwright no están validados contra el RMD real.**
  Se construyeron con roles ARIA estándar de SAPUI5 (`button`, `option`,
  `row`, `checkbox`) siguiendo la secuencia exacta del manual, pero SAP UI5
  puede renderizar labels/roles distintos según versión y personalización.
  Antes de usar en QAS/PRD, correr `playwright codegen <RMD_LAUNCHPAD_URL>`
  contra el ambiente real y ajustar `pages/*.py` con los selectores exactos.
- **Login/SSO:** `browser.py` asume un formulario usuario/contraseña de IAS.
  Si el tenant exige MFA interactivo, la automatización debe correr con un
  **usuario técnico/de servicio** exento de MFA — no con una cuenta personal.
  Solicítalo al equipo de BTP/IT junto con el acceso al ambiente (DEV/QAS
  primero, nunca probar directo en PRD).
- **Alcance actual:** cubre Configuración, Configuración Maestra, Configurar
  el RMD (estructuras/etiquetas/fórmulas/equipos/pasos) y el Flujo de
  Aprobación. Los pasos complejos (número/rango/fórmula/notificación,
  sección 7.6) y Solicitud (sección 2) no están implementados todavía —
  agregar métodos siguiendo el mismo patrón en `pages/`.

## Próximos pasos sugeridos

1. Validar selectores contra el ambiente **DEV** con `playwright codegen`.
2. Solicitar al equipo BTP el `$metadata` OData de la app **Configuración**
   (no solo "Registro") para evaluar migrar a la opción A.
3. Definir el usuario técnico de servicio (rol mínimo necesario, sin MFA).
4. Ampliar `pages/rmd_editor.py` con pasos complejos y `pages/solicitud.py`
   para el flujo de Solicitud (sección 2 del manual).
