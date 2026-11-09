# Código de referencia: borrador de Producción para el portal RMD (BTP)

La guía para TI (qué construir, dónde y qué exige el sistema validado) está en `GUIA_TI.md`.

Código de partida para que TI construya la plantilla del RMD (generar, que Producción la edite en pantalla, revisar e ingresar).
Está escrito en **CAP** (SAP Cloud Application Programming Model: CDS + Node.js) y **SAPUI5**, el estándar de SAP en el BTP.
Los nombres de las tablas y columnas (`MD_ES_PASO`, `pasoId_pasoId`, `estadoIdRmd_iMaestraId`...) son los del portal.

**Es una referencia, no un paquete para desplegar tal cual.** TI debe ajustarlo al proyecto real, en especial las líneas marcadas `TODO TI`.

## Dónde va cada archivo

| Archivo | Dónde va en el proyecto del portal | Qué hace |
| --- | --- | --- |
| `db/borrador.cds` | `db/` (junto al `schema.cds` actual) | Tablas nuevas: borrador, cambios y escrituras |
| `srv/borrador-service.cds` | `srv/` | Servicio OData `/borrador`, sus acciones y quién puede usarlas |
| `srv/borrador-service.js` | `srv/` | Lógica: generar, buscar pasos, enviar, revisar, ingresar con firma, revertir |
| `srv/lib/reglas.js` | `srv/lib/` | Reglas de negocio (misma etiqueta, duplicados, rango, Clave Modelo, casillas, predecesores, textos) |
| `test/reglas.test.js` | `test/` | 10 pruebas de las reglas; base de la OQ. Se corren con `node --test test/reglas.test.js` |
| `xs-security.json` | Unir al `xs-security.json` actual | 3 roles: Producción, Equipo RMD, Calidad |
| `app/configuracion-rmd/BorradorBotones.fragment.xml` | App UI5 «Configuración RMD», vistas de la lista y de la ventana del RMD | Botón «Plantilla para Producción» en Exportar y «Revisar borradores» junto a «Nueva Versión» |
| `app/configuracion-rmd/BorradorBotones.controller-extension.js` | Misma app, como extensión del controlador | Generar, revisar e ingresar con firma electrónica |
| `app/borrador-produccion/Editor.view.xml` | App UI5 nueva `app/borrador-produccion/webapp/view/` | Pantalla de Producción: el RMD como en el PDF, con acciones por fila |
| `app/borrador-produccion/Editor.controller.js` | `app/borrador-produccion/webapp/controller/` | Editar paso con buscador en vivo (misma etiqueta), guardar cada cambio, deshacer, enviar |

## Pasos en el BTP Cockpit

1. **Roles:** Subcuenta › Security › Role Collections: crear «RMD Borrador - Producción», «RMD Borrador - Equipo RMD» y «RMD Borrador - Calidad (lectura)» y asignarlas por grupos del proveedor de identidad.
2. **Audit log:** Subcuenta › Service Marketplace › *Audit Log Service*: crear la instancia y enlazarla a la app (`@cap-js/audit-logging`).
3. **Tile para Producción:** SAP Build Work Zone › Site Manager › sitio *portalprd* › Content Manager: agregar la app «Borradores de RMD» y asignarla al rol de Producción.
4. **Transporte:** Cloud Transport Management: desarrollo → calidad (OQ/PQ) → producción.

## Paquetes que se agregan al `package.json`

```
npm add @cap-js/change-tracking @cap-js/audit-logging
```

## Probado

- `node --test test/reglas.test.js` → 10 de 10 pruebas de reglas pasan (Node 22).
- Sintaxis de los .js, XML y JSON revisada.
- No se probó contra el portal real: no tenemos el proyecto del backend.
