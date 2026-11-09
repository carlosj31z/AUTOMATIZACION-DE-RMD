"""Que una versión del userscript no pise a otra.

El cargador solo usa el `.js` de versión más alta de SharePoint: si alguien publica una versión hecha sobre una base
vieja, tapa lo de las versiones que no trae (pasó con 1.131.2 y 1.132.0). Para evitarlo, cada script dice qué
versiones trae en una línea de comentario, justo debajo de `const VERSION`:

    // INCLUYE: 1.132.1 1.133.0

Reglas (sin git ni red; solo se lee el archivo):

* Una versión **cubre** a otra si es ella misma, si la nombra en INCLUYE, o si la otra es ≤ LEGADO y la lista tiene
  alguna versión ≤ LEGADO mayor o igual que ella. Hasta LEGADO (1.132.1) todo se juntó en la rama por defecto, así
  que un script sin INCLUYE con versión ≤ LEGADO cubre todas las menores (como antes).
* **Publicar**: el script debe ser mayor que la más alta de SharePoint *y cubrirla*. Como cada versión publicada
  cubre a la anterior, cubrir la más alta basta para traer todo.
* **PR** (chequeo de GitHub): si el script cambia, su versión debe subir y su INCLUYE debe traer todo lo que traía
  el de la rama base más la versión de la base. Si dos PR suben la versión a la vez, git marca conflicto en esas
  líneas; al resolverlo se junta INCLUYE (`interfaz nueva-version --juntar`).

Se corre también como módulo: `python -m rmd_automation.versiones revisar --base base.js --nuevo nuevo.js`.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterable, List, Optional, Set, Tuple

LEGADO = "1.132.1"
_RE_VER = re.compile(r"^\d+\.\d+\.\d+$")
_RE_HEADER = re.compile(r"^(// @version\s+)(\d+\.\d+\.\d+)(\s*)$", re.M)
_RE_CONST = re.compile(r"(const VERSION = ')(\d+\.\d+\.\d+)(';)")
_RE_INCLUYE = re.compile(r"^([ \t]*)// INCLUYE:[ \t]*([^\r\n]*?)[ \t]*(\r?)$", re.M)
COMENTARIO = "versiones que trae esta; ver src/rmd_automation/versiones.py"


def clave(v: str) -> Tuple[int, ...]:
    if not _RE_VER.match(v):
        raise ValueError(f"«{v}» no es una versión x.y.z.")
    return tuple(int(x) for x in v.split("."))


def ordenar(vs: Iterable[str]) -> List[str]:
    return sorted(set(vs), key=clave)


def version(texto: str) -> str:
    h, c = _RE_HEADER.search(texto), _RE_CONST.search(texto)
    if not h or not c:
        raise ValueError("No encuentro «// @version x.y.z» y «const VERSION = 'x.y.z';» en el script.")
    if h.group(2) != c.group(2):
        raise ValueError(f"@version ({h.group(2)}) y const VERSION ({c.group(2)}) no coinciden.")
    return h.group(2)


def incluye(texto: str) -> Optional[List[str]]:
    """Versiones de la línea INCLUYE, o None si el script no la tiene."""
    m = _RE_INCLUYE.search(texto)
    if not m:
        return None
    vs = [v for v in re.split(r"[\s,;]+", m.group(2).split("(")[0]) if v]
    for v in vs:
        clave(v)
    return ordenar(vs)


def conjunto(texto: str) -> List[str]:
    """La versión del script más todo lo que dice traer."""
    return ordenar([version(texto), *(incluye(texto) or [])])


def cubre(texto: str, otra: str) -> bool:
    propio = conjunto(texto)
    if otra in propio:
        return True
    if clave(otra) <= clave(LEGADO):
        if incluye(texto) is None and clave(version(texto)) > clave(LEGADO):
            return False
        return any(clave(otra) <= clave(x) <= clave(LEGADO) for x in propio)
    return False


def revisar_publicar(texto: str, mas_alta_sp: Optional[str]) -> List[str]:
    """Problemas para publicar `texto` sobre la carpeta cuya versión más alta es `mas_alta_sp` ([] = se puede)."""
    v = version(texto)
    errores = []
    if clave(v) > clave(LEGADO) and incluye(texto) is None:
        errores.append(f"{v} no tiene la línea «// INCLUYE:». Créala con `rmd-automation interfaz nueva-version`.")
    if mas_alta_sp:
        if clave(v) <= clave(mas_alta_sp):
            errores.append(f"{v} no es mayor que {mas_alta_sp} (la más alta de SharePoint): el cargador no la usaría.")
        elif not cubre(texto, mas_alta_sp):
            errores.append(
                f"{v} no incluye {mas_alta_sp}, que ya está en SharePoint: si la subes, tapas lo que trae {mas_alta_sp}. "
                f"Fusiona primero el PR de {mas_alta_sp} (o junta su script) y crea la versión con "
                f"`rmd-automation interfaz nueva-version --juntar <{mas_alta_sp}.js>`.")
    return errores


def revisar_pr(base: str, nuevo: str) -> List[str]:
    """Problemas del script `nuevo` frente al de la rama base ([] = bien)."""
    if base == nuevo:
        return []
    vb, vn = version(base), version(nuevo)
    errores = []
    if clave(vn) <= clave(vb):
        return [f"El script cambió pero su versión ({vn}) no es mayor que la de la rama base ({vb}). "
                f"Súbela con `rmd-automation interfaz nueva-version` (pon la versión más alta en curso + 1)."]
    if incluye(nuevo) is None:
        errores.append(f"{vn} no tiene la línea «// INCLUYE:». Créala con `rmd-automation interfaz nueva-version`.")
    else:
        faltan = [x for x in conjunto(base) if not cubre(nuevo, x)]
        if faltan:
            errores.append(
                f"{vn} no incluye {', '.join(faltan)}, que ya está en la rama base: actualiza tu rama con la base "
                f"(merge), deja la versión mayor que {vb} y junta INCLUYE con "
                f"`rmd-automation interfaz nueva-version --juntar <script de la base>`.")
    return errores


def nueva_version(texto: str, nueva: Optional[str] = None, juntar: Iterable[str] = ()) -> str:
    """Devuelve el script con la versión subida y INCLUYE = lo que traía + su versión + lo de `juntar`."""
    actual = version(texto)
    trae: Set[str] = set(conjunto(texto))
    for otro in juntar:
        trae.update(conjunto(otro))
    tope = max(trae, key=clave)
    if nueva is None:
        a, b, _ = clave(tope)
        nueva = f"{a}.{b + 1}.0"
    if clave(nueva) <= clave(tope):
        raise ValueError(f"La versión nueva ({nueva}) debe ser mayor que {tope}.")
    lista = " ".join(ordenar(trae))
    texto = _RE_HEADER.sub(lambda m: m.group(1) + nueva + m.group(3), texto, count=1)
    texto = _RE_CONST.sub(lambda m: m.group(1) + nueva + m.group(3), texto, count=1)
    linea = f"// INCLUYE: {lista} ({COMENTARIO})"
    if _RE_INCLUYE.search(texto):
        texto = _RE_INCLUYE.sub(lambda m: m.group(1) + linea + m.group(3), texto, count=1)
    else:  # debajo de const VERSION, con los mismos fines de línea del archivo
        m = re.search(r"^([ \t]*)const VERSION = '[^']*';[^\r\n]*(\r?\n)", texto, re.M)
        texto = texto[:m.end()] + m.group(1) + linea + m.group(2) + texto[m.end():]
    assert version(texto) == nueva and actual in (incluye(texto) or [])
    return texto


def _leer(ruta: str) -> str:
    return Path(ruta).read_bytes().decode("utf-8")


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="python -m rmd_automation.versiones", description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("revisar", help="Chequeo de PR: el script nuevo frente al de la rama base.")
    r.add_argument("--base", required=True)
    r.add_argument("--nuevo", required=True)
    a = p.parse_args(argv)
    base = _leer(a.base) if Path(a.base).exists() else ""
    nuevo = _leer(a.nuevo)
    errores = revisar_pr(base, nuevo) if base else []
    for e in errores:
        print(f"✗ {e}")
    if not errores:
        print(f"✓ {version(nuevo)} trae: {' '.join(conjunto(nuevo))}" if incluye(nuevo) else f"✓ {version(nuevo)}")
    return 1 if errores else 0


if __name__ == "__main__":
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8")
    sys.exit(main())
