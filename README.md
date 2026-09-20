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

Confirmado navegando (sin credenciales) hasta la pantalla real de login: el
portal RMD (`.../site/portalprd#configuracion-display?...`, ver
`.env.example`) redirige a un Fiori Launchpad en
`*.cpp.cfapps.us10.hana.ondemand.com`, que a su vez redirige vía OAuth2/PKCE
a `https://<tenant>.accounts.ondemand.com/oauth2/authorize` — el login de IAS
("SAP BTP subaccount MediFarma-Portal-PRD: Sign In") con campos "Email or
User Name" y "Password" en una sola pantalla, sin dos pasos.

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

Cada operación mapea 1:1 a una acción del manual — correr `rmd-automation
acciones` para la lista completa (28 al momento de escribir esto): crear
solicitudes y aprobar/rechazarlas, estructuras/etiquetas/pasos/motivos/
utensilios/motivo-lapsos en Configuración Maestra, configuración de un RMD
—estructuras, etiquetas, fórmulas, equipos, pasos, pasos complejos
(número/rango/fórmula/notificación), predecesores—, exportar máster, agregar
documento/nota, envío a jefe, cambio de destinatario, autorización.

## Estructura del proyecto

```
src/rmd_automation/
  config.py              # variables de entorno (.env)
  browser.py             # login SAP IAS + sesión Playwright
  pages/                 # un módulo por pantalla del manual (Page Object Model)
    solicitud.py              # sección 2: crear/aprobar/rechazar solicitudes
    configuracion.py          # sección 3: filtros, exportar máster, ver OP, documentos, notas
    configuracion_maestra.py  # sección 4: estructuras, etiquetas, pasos, motivos, utensilios
    rmd_editor.py              # secciones 5-7: "Configurar el RMD", incl. pasos complejos (7.6)
    flujo_aprobacion.py        # sección 8: enviar a jefe, autorizar
  actions.py              # fachada de alto nivel (RmdAutomation)
  batch.py                # runner declarativo (YAML/JSON) + tabla de despacho (28 acciones)
  cli.py                  # comandos: batch / validar / acciones
examples/batch_ejemplo.yaml
tests/test_batch.py       # valida el parser de batch sin necesitar RMD real
```

## Limitaciones importantes (léelas antes de usar en producción)

- **Validación de selectores (hecha en vivo, solo lectura).** Con un humano
  autenticado en el navegador, se inspeccionó el DOM real de: pantalla principal
  (filtros, tabla, menú de Acción), Configuración Maestra (los 6 tabs y sus
  formularios "Nuevo ...", abiertos y cancelados sin guardar), "Configurar el
  RMD" (estructuras, selector de estructuras, diálogo "Pasos") y el estatus
  del Flujo de Aprobación. Hallazgos que cambiaron el código:
  - La app corre dentro de un **iframe** (`ui5appruntime.html`): todo locator
    cuelga de `base.app_root(page)` (FrameLocator), no de `page`.
  - Los **ComboBox se abren con su flecha**, no con clic en el input.
  - "Ir" (no "IR"); labels reales: "Codigo RMD", "Area", "Estado del RMD".
  - "Acción" por fila es un **MenuButton** (`Abrir menú` -> `menuitem`): Ver
    master, Descargar master, Agregar Documento, Ver OP, Asociar fórmulas,
    Configurar el RMD, Trazabilidad RMD, Notas Importantes.
  - Configuración Maestra es un diálogo; tabs con prefijo de ícono en el nombre
    accesible; los SI/NO son `role="switch"`; botones "Nuevo Equipo/Utensilio",
    "Nuevo Motivo Lapso", etc.; Paso usa "Descripción Paso".
  - "Enviar" abre "Solicitar Revisión de Registro de Manufactura" (Destinatarios,
    Destinatarios adicionales, Mensaje Documentación Técnica, adjunto con
    `<input type=file>`); clic en el cuerpo de una fila abre "Editar RM".
  - Ingreso de un RMD (manual 5) contrastado con el sistema: "Nuevo RMD" ->
    "Generar nuevo RMD" (Asociar Solicitud, Descripción RMD, Etapa, Planta,
    Motivo, Área Solicitante; sin adjunto). "Configurar el RMD" -> estructura ->
    "Adicionar Etiqueta" -> "Etiqueta (n)" -> "+" -> selector de etiquetas; en la
    etiqueta "Adicionar Pasos RMD" -> "Pasos (n)" -> "+" -> selector "Adicionar
    Pasos". El editor principal no tiene "Guardar"; las columnas de pasos son
    "PM OP", "Clave Modelo", "Puesto Trabajo", "Decimal", "Estado CC", etc.
  - Acción batch nueva `crear_rmd`; `configurar_rmd_pasos` recibe `estructura`
    (+ `etiqueta` opcional) y `configurar_rmd_notificacion` recibe `paso`.
  **Aún sin verificar** (son escrituras; no se ejecutaron): confirmaciones
  "OK/SI" tras Agregar/Guardar, diálogos de envío a jefe (destinatarios,
  mensaje, PDF), autorización, pasos menores/insumos, selectores de
  etiquetas/equipos/fórmulas y todo el módulo `solicitud.py`. Los helpers nuevos
  requieren `playwright>=1.51` (`filter(visible=True)`); los flujos no se
  ejecutaron end-to-end (solo se comprobó que el paquete importa y `pytest` pasa).
- **Login/SSO:** `browser.py` asume el formulario de un solo paso de IAS
  confirmado en vivo. No maneja un eventual paso de MFA tras enviar la
  contraseña. Si el tenant lo exige, la automatización debe correr con un
  **usuario técnico/de servicio** exento de MFA — no con una cuenta personal.
  Solicítalo al equipo de BTP/IT junto con el acceso al ambiente (DEV/QAS
  primero, nunca probar directo en PRD).
- **Por qué la automatización no inicia sesión con credenciales personales:** se intentó loguear
  con la cuenta personal del usuario para verificar los selectores, pero el
  clasificador de modo automático de Claude Code bloqueó tanto el intento de
  login (manejo de credenciales reales de un sistema de producción GMP) como
  el intento de auto-otorgarse permiso vía `settings.local.json`
  (`[Auto-Mode Bypass]`). Es una salvaguarda intencional, no un bug: evita que
  un agente de IA se autorice a sí mismo a operar con la identidad de una
  persona en un sistema regulado. La vía correcta es un usuario técnico
  dedicado (ver "Próximos pasos").
- **Alcance actual:** cubre Solicitud, Configuración, Configuración Maestra,
  Configurar el RMD (estructuras/etiquetas/fórmulas/equipos/pasos/pasos
  complejos: número, rango, fórmula, notificación, predecesores) y el Flujo
  de Aprobación — las 13 secciones numeradas del manual (2-8) con acciones
  de escritura. Quedan fuera del alcance: apartados puramente informativos
  (PDF/Ver Master, Ver OP, Trazabilidad) más allá de lo ya cubierto, y
  cualquier flujo de la app "Registro" (piso de planta), que es una app SAP
  distinta a "Configuración".

## Próximos pasos sugeridos

1. Con un usuario técnico de servicio (o un humano al mando del navegador),
   correr `playwright codegen <RMD_LAUNCHPAD_URL>` contra el ambiente **DEV**
   y ajustar los selectores de `pages/*.py` con los nombres/roles reales.
2. Solicitar al equipo BTP el `$metadata` OData de la app **Configuración**
   (no solo "Registro") para evaluar migrar a la opción A.
3. Definir el usuario técnico de servicio (rol mínimo necesario, sin MFA) —
   requisito tanto para validar selectores como para correr esto en CI/CD.
