"""Sugerencia previa al ingreso: ¿el producto figura como pendiente en la matriz de RMD priorizados?

Hoja "PLANTA 2 DOC TEC" del libro "Matriz RMD priorizados v1 KZ 2026.xlsx" (exportada a .xlsx o .csv).
El analista anota ahí, antes del ingreso, los RMD pendientes: columna G = ingreso, K = autorización
(valor "PENDIENTE") y O = "observación adicional" (el motivo). No hay código de RMD: se busca por
nombre de producto y etapa. Es solo una sugerencia; nunca bloquea el ingreso.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import List

from .snapshot import normalizar

COL_INGRESO, COL_AUTORIZACION, COL_OBSERVACION = 6, 10, 14  # G, K, O (base 0)


@dataclass
class Pendiente:
    fila: int
    producto: str
    etapa: str
    ingreso: str
    autorizacion: str
    motivo: str


def _filas(ruta: Path, hoja: str) -> List[List[str]]:
    if ruta.suffix.lower() == ".csv":
        with open(ruta, encoding="utf-8-sig", newline="") as f:
            return [[c.strip() for c in r] for r in csv.reader(f)]
    try:
        from openpyxl import load_workbook
    except ImportError as e:  # pragma: no cover
        raise RuntimeError("Para leer .xlsx instala openpyxl (pip install openpyxl) o exporta la hoja a .csv.") from e
    wb = load_workbook(ruta, read_only=True, data_only=True)
    nombre = next((n for n in wb.sheetnames if normalizar(n) == normalizar(hoja)), None)
    if nombre is None:
        raise ValueError(f"El libro no tiene la hoja {hoja!r}. Hojas: {wb.sheetnames}")
    return [["" if c is None else str(c).strip() for c in r] for r in wb[nombre].iter_rows(values_only=True)]


def _columna(cabecera: List[str], *claves: str) -> int | None:
    for i, c in enumerate(cabecera):
        if any(k in normalizar(c) for k in claves):
            return i
    return None


def buscar_pendientes(ruta: str | Path, producto: str, etapa: str = "", hoja: str = "PLANTA 2 DOC TEC") -> List[Pendiente]:
    """Filas cuyo producto (y etapa, si se da) coinciden y cuyo ingreso o autorización dice PENDIENTE."""
    filas = _filas(Path(ruta), hoja)
    # La cabecera es la fila que tiene a la vez la columna del nombre y la de ETAPA (las filas 1-3 son leyendas).
    ini = next(
        (i for i, r in enumerate(filas) if _columna(r, "NOMBRE", "PRODUCTO") is not None and _columna(r, "ETAPA") is not None),
        0,
    )
    cab = filas[ini] if filas else []
    c_prod = _columna(cab, "NOMBRE", "PRODUCTO") or 0
    c_etapa = _columna(cab, "ETAPA")
    p, e = normalizar(producto), normalizar(etapa)
    out: List[Pendiente] = []
    for n, r in enumerate(filas[ini + 1:], ini + 2):
        r = r + [""] * (COL_OBSERVACION + 1 - len(r))
        if p not in normalizar(r[c_prod]):
            continue
        et = r[c_etapa] if c_etapa is not None and c_etapa < len(r) else ""
        if e and et and e not in normalizar(et) and normalizar(et) not in e:
            continue
        ing, aut = r[COL_INGRESO], r[COL_AUTORIZACION]
        if "PENDIENTE" in normalizar(ing) or "PENDIENTE" in normalizar(aut):
            out.append(Pendiente(n, r[c_prod], et, ing, aut, r[COL_OBSERVACION]))
    return out


def a_texto(pend: List[Pendiente]) -> str:
    if not pend:
        return "Matriz de priorizados: el producto no figura como pendiente."
    out = ["Matriz de priorizados (sugerencia, revisar antes del ingreso):"]
    for x in pend:
        out.append(
            f"  fila {x.fila}: {x.producto} [{x.etapa or 'sin etapa'}] ingreso={x.ingreso or '-'} "
            f"autorización={x.autorizacion or '-'} — motivo: {x.motivo or '(sin observación)'}"
        )
    return "\n".join(out)
