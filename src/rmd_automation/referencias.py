"""Extrae de un RMD los códigos de Procedimientos, Formatos e Instructivos citados en el texto
(descripciones de pasos y de procesos menores).

Formato de estos códigos (confirmado por el usuario):
  <Tipo><Área>[-<letra><3 dígitos> | -<3 dígitos>]
  - Tipo: 1 letra — I=Instructivo, P=Procedimiento, F=Formato. (POL=Política y M=Manual existen pero llevan
    más de 1 letra de prefijo y quedan fuera de este alcance.)
  - Área: normalmente 3 letras (PRO, ACO, CBL…); algunas llevan un dígito en la 3ª posición (GV1/GV2, PV1/PV2).
    El dígito nunca va en la 1ª ni la 2ª posición.
  - Sufijo numérico (obligatorio, tal como se ve en la práctica): una letra opcional + 3 dígitos (-P123, -E200)
    o solo 3 dígitos (-200). Sin él, palabras comunes que empiezan con I/P/F (PARA, PASO, PESO, FITZ...) darían
    falsos positivos: se comprobó con texto real de un RMD.

Ejemplos reales: IPRO-P123, FACO-200, IGV1-E201, PPV2-200.
No hace ninguna petición a la red ni cambia nada: solo lee el snapshot que ya se extrajo del RMD.
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List

from .snapshot import descripcion_pm, filas_pm, listas, normalizar

TIPOS = {"I": "Instructivo", "P": "Procedimiento", "F": "Formato"}

# (?<![A-Za-z0-9]) / (?![A-Za-z0-9]) en vez de \b: \b no separa bien un dígito de una letra (ej. el "1" de "GV1" pegado a "-").
# El sufijo "-[letra]NNN" es obligatorio: sin él, cualquier palabra que empiece con I/P/F + 2 letras (PARA, PASO, PESO, POST,
# FITZ...) sería una falsa referencia (comprobado con texto real de pasos: sin exigirlo salían 5 falsos positivos así).
PATRON_REFERENCIA = re.compile(
    r"(?<![A-Za-z0-9])(?P<tipo>[IPF])(?P<area>[A-Z]{2}[A-Z0-9])-(?P<sufijo>[A-Z]?\d{3})(?![A-Za-z0-9])"
)


@dataclass
class Referencia:
    codigo: str          # tal como aparece: "IPRO-P123"
    tipo: str            # "I" | "P" | "F"
    area: str            # "PRO", "GV1"...
    sufijo: str = ""      # "P123", "200", "" si no tenía
    apariciones: int = 0
    ejemplos: List[str] = field(default_factory=list)   # hasta 3 fragmentos de texto donde aparece

    @property
    def tipo_nombre(self) -> str:
        return TIPOS.get(self.tipo, self.tipo)


def _registrar(hallazgos: Dict[str, Referencia], texto: str, contexto: str) -> None:
    for m in PATRON_REFERENCIA.finditer(texto):
        codigo = m.group(0)
        r = hallazgos.get(codigo)
        if r is None:
            r = Referencia(codigo=codigo, tipo=m.group("tipo"), area=m.group("area"), sufijo=m.group("sufijo") or "")
            hallazgos[codigo] = r
        r.apariciones += 1
        if len(r.ejemplos) < 3 and contexto not in r.ejemplos:
            r.ejemplos.append(contexto)


def extraer_referencias(snap: dict) -> Dict[str, List[Referencia]]:
    """Recorre todas las listas de pasos y procesos menores del snapshot; agrupa por tipo (Instructivo/Procedimiento/Formato)."""
    hallazgos: Dict[str, Referencia] = {}
    for lst in listas(snap):
        for p in lst.pasos:
            d = p.get("d") or ""
            _registrar(hallazgos, d, f"{lst.nombre} #{p.get('o')}: {normalizar(d)[:90]}")
        for orden_paso, filas in lst.procesos_menores.items():
            for fila in filas:
                d = descripcion_pm(fila)
                _registrar(hallazgos, d, f"{lst.nombre} #{orden_paso} (menor): {normalizar(d)[:90]}")
    por_tipo: Dict[str, List[Referencia]] = defaultdict(list)
    for r in hallazgos.values():
        por_tipo[r.tipo].append(r)
    for tipo in por_tipo:
        por_tipo[tipo].sort(key=lambda r: r.codigo)
    return dict(por_tipo)


def a_markdown(por_tipo: Dict[str, List[Referencia]], titulo: str = "") -> str:
    out = [f"# Procedimientos, Formatos e Instructivos citados {titulo}".rstrip() + "\n"]
    total = sum(len(v) for v in por_tipo.values())
    if not total:
        out.append("No se encontraron referencias con el formato <Tipo><Área>[-sufijo].")
        return "\n".join(out)
    for tipo in ("I", "P", "F"):
        refs = por_tipo.get(tipo, [])
        if not refs:
            continue
        out.append(f"## {TIPOS[tipo]} ({len(refs)})")
        for r in refs:
            out.append(f"- **{r.codigo}** — {r.apariciones} cita(s)")
            for ej in r.ejemplos:
                out.append(f"  - {ej}")
        out.append("")
    otros_tipos = sorted(set(por_tipo) - {"I", "P", "F"})
    for tipo in otros_tipos:  # por si el patrón se relaja en el futuro; hoy no debería darse
        refs = por_tipo[tipo]
        out.append(f"## {tipo} ({len(refs)})")
        for r in refs:
            out.append(f"- **{r.codigo}** — {r.apariciones} cita(s)")
    return "\n".join(out)
