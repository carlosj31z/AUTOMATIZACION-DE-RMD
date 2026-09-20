from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, List

import yaml

from .actions import RmdAutomation, run

Operacion = Dict[str, Any]


def _configurar_rmd_estructuras(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.agregar_estructuras(p["estructuras"])
    editor.guardar()


def _configurar_rmd_etiquetas(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.agregar_etiquetas(p["estructura"], p["etiquetas"])
    editor.guardar()


def _configurar_rmd_formulas(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.asociar_formulas(p["codigo_o_descripcion"], p["recetas"])


def _configurar_rmd_equipos(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.agregar_equipos(p["estructura"], p["equipos"])
    editor.guardar()


def _configurar_rmd_pasos(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.agregar_pasos(p["etiqueta"], p["pasos"])
    editor.guardar()


def _configurar_rmd_inicial(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.configuracion_inicial()
    editor.generar_predecesores()


def _configurar_rmd_paso_numero(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.establecer_paso_numero(p["paso"], p["decimales"])


def _configurar_rmd_paso_rango(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.establecer_paso_rango(p["paso"], p["valor_inicial"], p["valor_final"], p["margen"], p["decimales"])


def _configurar_rmd_paso_formula(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.establecer_paso_formula(p["paso"], p["decimales"], p["pasos_formula"])


def _configurar_rmd_notificacion(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.configurar_notificacion(p["etiqueta"], p["clave_modelo"], p["puesto_trabajo"])


def _configurar_rmd_predecesor(a: RmdAutomation, p: Dict[str, Any]) -> None:
    editor = a.editor_de_rmd(p["codigo_rmd"])
    editor.establecer_predecesor(p["paso"], p["codigo_paso_predecesor"])


# Nombre de la operación (tal como aparece en el archivo de batch) -> handler.
# Para agregar una operación nueva: crear el método en la página correspondiente
# (pages/*.py) y registrar aquí una entrada con sus argumentos por **params.
_DISPATCH: Dict[str, Callable[[RmdAutomation, Dict[str, Any]], None]] = {
    "crear_estructura": lambda a, p: a.configuracion_maestra.crear_estructura(**p),
    "crear_etiqueta": lambda a, p: a.configuracion_maestra.crear_etiqueta(**p),
    "crear_paso": lambda a, p: a.configuracion_maestra.crear_paso(**p),
    "crear_motivo": lambda a, p: a.configuracion_maestra.crear_motivo(**p),
    "crear_utensilio": lambda a, p: a.configuracion_maestra.crear_utensilio(**p),
    "crear_motivo_lapso": lambda a, p: a.configuracion_maestra.crear_motivo_lapso(**p),
    "exportar_master": lambda a, p: a.configuracion.exportar_master(**p),
    "agregar_documento": lambda a, p: a.configuracion.agregar_documento(**p),
    "agregar_nota_importante": lambda a, p: a.configuracion.agregar_nota_importante(**p),
    "configurar_rmd_estructuras": _configurar_rmd_estructuras,
    "configurar_rmd_etiquetas": _configurar_rmd_etiquetas,
    "configurar_rmd_formulas": _configurar_rmd_formulas,
    "configurar_rmd_equipos": _configurar_rmd_equipos,
    "configurar_rmd_pasos": _configurar_rmd_pasos,
    "configurar_rmd_inicial": _configurar_rmd_inicial,
    "configurar_rmd_paso_numero": _configurar_rmd_paso_numero,
    "configurar_rmd_paso_rango": _configurar_rmd_paso_rango,
    "configurar_rmd_paso_formula": _configurar_rmd_paso_formula,
    "configurar_rmd_notificacion": _configurar_rmd_notificacion,
    "configurar_rmd_predecesor": _configurar_rmd_predecesor,
    "generar_solicitud_nuevo_rmd": lambda a, p: a.solicitud.generar_nuevo_rmd(**p),
    "generar_solicitud_nueva_edicion": lambda a, p: a.solicitud.generar_nueva_edicion(**p),
    "aprobar_solicitud": lambda a, p: a.solicitud.aprobar(**p),
    "rechazar_solicitud": lambda a, p: a.solicitud.rechazar(**p),
    "enviar_a_jefe": lambda a, p: a.flujo_aprobacion.enviar_a_jefe(**p),
    "cambiar_destinatario": lambda a, p: a.flujo_aprobacion.cambiar_destinatario(**p),
    "autorizar_rmd": lambda a, p: a.flujo_aprobacion.autorizar(**p),
}


def acciones_disponibles() -> List[str]:
    return sorted(_DISPATCH)


def cargar_operaciones(ruta: str) -> List[Operacion]:
    contenido = Path(ruta).read_text(encoding="utf-8")
    datos = yaml.safe_load(contenido) if ruta.endswith((".yaml", ".yml")) else json.loads(contenido)
    operaciones = datos.get("operaciones") if isinstance(datos, dict) else None
    if not isinstance(operaciones, list):
        raise ValueError(f"'{ruta}' debe contener una clave 'operaciones' con una lista.")
    for i, operacion in enumerate(operaciones, start=1):
        accion = operacion.get("accion")
        if accion not in _DISPATCH:
            raise ValueError(
                f"Operación #{i} usa una acción desconocida: '{accion}'. "
                f"Acciones disponibles: {', '.join(acciones_disponibles())}"
            )
    return operaciones


def ejecutar_batch(ruta: str) -> None:
    operaciones = cargar_operaciones(ruta)

    def _callback(automation: RmdAutomation) -> None:
        total = len(operaciones)
        for i, operacion in enumerate(operaciones, start=1):
            accion = operacion["accion"]
            params = operacion.get("params", {})
            print(f"[{i}/{total}] Ejecutando '{accion}'...")
            _DISPATCH[accion](automation, params)
            print(f"[{i}/{total}] OK")

    run(_callback)
