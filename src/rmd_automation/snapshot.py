"""Modelo de "foto" (snapshot) de un RMD leído del portal, y utilidades para recorrerla.

El formato lo produce `js/extraer.js` (o cualquier lector equivalente) y es JSON plano:

    {"code", "head", "structs": [{"o","n","items","btn",
        "p":  [paso...]                       # estructuras con pasos directos
        "etq":[{"o","n","p":[paso...], "pm":{orden_paso:[fila_proceso_menor...]}}],
        "eq": ["orden|código|descripción|..."], "ins": [...], "esp": [...]}]}

    paso = {"o","dep","cod","d","td","ck","pt","vi","vf","mg","dc","chk","pm"}
    fila_proceso_menor = "orden|/código/descripción|cantidad|tipo|vi|vf|margen|decimal|casillas"
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Tuple

ESTRUCTURAS_CON_ETIQUETAS = "PROCEDIMIENTO"


def normalizar(texto: str) -> str:
    return re.sub(r"\s+", " ", texto or "").strip().upper()


def cargar(ruta: str | Path) -> dict:
    return json.loads(Path(ruta).read_text(encoding="utf-8-sig"))


@dataclass
class Lista:
    """Una lista ordenada de pasos: una estructura sin etiquetas o una etiqueta del PROCEDIMIENTO."""

    nombre: str
    pasos: List[dict]
    procesos_menores: Dict[str, List[str]] = field(default_factory=dict)
    es_etiqueta: bool = False


def listas(snap: dict) -> List[Lista]:
    salida: List[Lista] = []
    for s in snap.get("structs", []):
        nombre = normalizar(s["n"])
        if s.get("p") is not None:
            salida.append(Lista(nombre, list(s["p"])))
        for e in s.get("etq", []) or []:
            salida.append(
                Lista(f"{nombre}>{normalizar(e['n'])}", list(e.get("p") or []), dict(e.get("pm") or {}), True)
            )
    return salida


def estructura(snap: dict, patron: str) -> Optional[dict]:
    rx = re.compile(patron, re.I)
    return next((s for s in snap.get("structs", []) if rx.search(s["n"])), None)


def orden_de_dep(dep: str) -> Optional[int]:
    """`código (orden)` -> orden del predecesor; None si está vacío o es una referencia colgante."""
    m = re.match(r"^\s*\d+\s*\((\d+)\)\s*$", dep or "")
    return int(m.group(1)) if m else None


def codigo_de_dep(dep: str) -> Optional[str]:
    m = re.match(r"^\s*(\d+)", dep or "")
    return m.group(1) if m else None


def filas_pm(fila: str) -> Tuple[str, str, str, str, str, str, str, str, str]:
    """Descompone una fila de proceso menor en (orden, descripción, cantidad, tipo, vi, vf, margen, decimal, casillas)."""
    partes = (fila.split("|") + [""] * 9)[:9]
    return tuple(partes)  # type: ignore[return-value]


def descripcion_pm(fila: str) -> str:
    return re.sub(r"^/?\d+/", "", filas_pm(fila)[1])


def recorrer_pasos(snap: dict) -> Iterator[Tuple[Lista, dict]]:
    for lst in listas(snap):
        for p in lst.pasos:
            yield lst, p
