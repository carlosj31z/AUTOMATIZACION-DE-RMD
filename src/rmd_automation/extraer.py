"""Lectura (solo lectura) de un RMD del portal mediante el script js/extraer.js."""
from __future__ import annotations

import json
from importlib import resources
from pathlib import Path

from .browser import rmd_session
from .config import load_config
from .pages import base


def extraer(page, codigo: str, procesos_menores: bool = True) -> dict:
    """Lee el RMD. `procesos_menores=False` omite el detalle de procesos menores (mucho más rápido:
    un solo paso puede tener más de 500 líneas); alcanza para planificar cambios de equipos y pasos."""
    script = resources.files("rmd_automation").joinpath("js/extraer.js").read_text(encoding="utf-8")
    base.esperar_app(page)
    page.evaluate(script)
    return page.evaluate(
        "([code, pm]) => window.__extraerRmd(code, { procesosMenores: pm })", [codigo, procesos_menores]
    )


def extraer_a_archivo(codigo: str, salida: str) -> None:
    with rmd_session(load_config()) as page:
        snap = extraer(page, codigo)
    Path(salida).parent.mkdir(parents=True, exist_ok=True)
    Path(salida).write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
