"""Comparador de versiones de un RMD (dos snapshots)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from .snapshot import descripcion_pm, filas_pm, listas, normalizar, estructura

ABREV = {
    "Realizado por": "RP",
    "Realizado por y Visto bueno": "RP+VB",
    "Sin tipo de dato": "SIN",
    "Notificacion": "NOT",
    "Fecha y Hora": "FH",
    "Múltiple check": "MC",
    "Visto bueno": "VB",
    "Verificación Check": "VC",
}


def _clave(p: dict) -> str:
    return f"{normalizar(p.get('d'))}#{p.get('cod', '')}"


def _resumen(p: dict) -> str:
    td = ABREV.get(p.get("td", ""), p.get("td", ""))
    extra = f" [{p['chk']}]" if p.get("chk") else ""
    return f"{p.get('o', '')} {td}{extra} {(p.get('d') or '')[:90]}"


@dataclass
class DiffLista:
    nombre: str
    n_a: int
    n_b: int
    agregados: List[str] = field(default_factory=list)
    quitados: List[str] = field(default_factory=list)
    cambiados: List[str] = field(default_factory=list)
    procesos_menores: List[str] = field(default_factory=list)

    def vacio(self) -> bool:
        return not (self.agregados or self.quitados or self.cambiados or self.procesos_menores)


@dataclass
class Diff:
    a: str
    b: str
    estructuras: List[str] = field(default_factory=list)
    equipos_quitados: List[str] = field(default_factory=list)
    equipos_agregados: List[str] = field(default_factory=list)
    especificaciones: List[str] = field(default_factory=list)
    listas: List[DiffLista] = field(default_factory=list)


def _equipo(fila: str) -> str:
    partes = fila.split("|")
    return "|".join(partes[1:3]) if len(partes) > 2 else fila


def _pm_por_paso(lst) -> Dict[str, List[str]]:
    return lst.procesos_menores


def comparar(a: dict, b: dict) -> Diff:
    diff = Diff(a=a.get("head", a.get("code", "A"))[:60], b=b.get("head", b.get("code", "B"))[:60])

    ea = {normalizar(s["n"]): s for s in a.get("structs", [])}
    eb = {normalizar(s["n"]): s for s in b.get("structs", [])}
    for n in ea.keys() - eb.keys():
        diff.estructuras.append(f"− estructura {n}")
    for n in eb.keys() - ea.keys():
        diff.estructuras.append(f"+ estructura {n}")
    for n in ea.keys() & eb.keys():
        if ea[n].get("items") != eb[n].get("items") and ea[n].get("items") is not None:
            diff.estructuras.append(f"~ {n}: items {ea[n].get('items')} → {eb[n].get('items')}")

    sa, sb = estructura(a, "EQUIPOS"), estructura(b, "EQUIPOS")
    if sa and sb:
        qa = [_equipo(x) for x in sa.get("eq", [])]
        qb = [_equipo(x) for x in sb.get("eq", [])]
        diff.equipos_quitados = [x for x in qa if x not in qb]
        diff.equipos_agregados = [x for x in qb if x not in qa]

    pa, pb = estructura(a, "ESPECIF"), estructura(b, "ESPECIF")
    if pa and pb:
        xa = [normalizar(x.split("::")[0]) for x in pa.get("esp", [])]
        xb = [normalizar(x.split("::")[0]) for x in pb.get("esp", [])]
        diff.especificaciones += [f"− {x[:120]}" for x in xa if x not in xb]
        diff.especificaciones += [f"+ {x[:120]}" for x in xb if x not in xa]

    la = {l.nombre: l for l in listas(a)}
    lb = {l.nombre: l for l in listas(b)}
    for nombre in list(la.keys()) + [n for n in lb.keys() if n not in la]:
        x, y = la.get(nombre), lb.get(nombre)
        d = DiffLista(nombre, len(x.pasos) if x else 0, len(y.pasos) if y else 0)
        ma = {_clave(p): p for p in (x.pasos if x else [])}
        mb = {_clave(p): p for p in (y.pasos if y else [])}
        d.quitados = [_resumen(p) for k, p in ma.items() if k not in mb]
        d.agregados = [_resumen(p) for k, p in mb.items() if k not in ma]
        for k, p in mb.items():
            q = ma.get(k)
            if not q:
                continue
            cambios = []
            if q.get("td") != p.get("td"):
                cambios.append(f"tipo {q.get('td')} → {p.get('td')}")
            if q.get("chk", "") != p.get("chk", ""):
                cambios.append(f"casillas [{q.get('chk', '')}] → [{p.get('chk', '')}]")
            if q.get("pm") != p.get("pm"):
                cambios.append("procesos menores " + ("agregados" if p.get("pm") else "quitados"))
            if q.get("ck", "") != p.get("ck", "") or q.get("pt", "") != p.get("pt", ""):
                cambios.append(f"clave/puesto {q.get('ck', '')}/{q.get('pt', '')} → {p.get('ck', '')}/{p.get('pt', '')}")
            if cambios:
                d.cambiados.append(f"{(p.get('d') or '')[:70]}: " + "; ".join(cambios))
        # procesos menores: se comparan por paso (descripción del paso) y por contenido
        if x and y:
            def pm_map(lst):
                m: Dict[str, List[str]] = {}
                por_orden = {p.get("o"): p for p in lst.pasos}
                for orden, filas in lst.procesos_menores.items():
                    paso = por_orden.get(orden)
                    if paso is not None:
                        m[_clave(paso)] = [f"{descripcion_pm(f)[:60]} ({filas_pm(f)[3]})" for f in filas]
                return m

            ma_pm, mb_pm = pm_map(x), pm_map(y)
            for k in mb_pm.keys() & ma_pm.keys():
                add = [f for f in mb_pm[k] if f not in ma_pm[k]]
                rem = [f for f in ma_pm[k] if f not in mb_pm[k]]
                if add or rem:
                    titulo = k.split("#")[0][:50]
                    d.procesos_menores.append(
                        f"{titulo}: " + "; ".join([f"+ {f}" for f in add] + [f"− {f}" for f in rem])
                    )
        if not d.vacio() or (x is None) != (y is None):
            diff.listas.append(d)
    return diff


def a_markdown(diff: Diff) -> str:
    out = [f"# Comparación de versiones\n\n- **A:** {diff.a}\n- **B:** {diff.b}\n"]
    if diff.estructuras:
        out.append("## Estructuras\n" + "\n".join(f"- {x}" for x in diff.estructuras) + "\n")
    if diff.equipos_quitados or diff.equipos_agregados:
        out.append("## Equipos\n")
        out += [f"- − {x}" for x in diff.equipos_quitados]
        out += [f"- + {x}" for x in diff.equipos_agregados]
        out.append("")
    if diff.especificaciones:
        out.append("## Especificaciones\n" + "\n".join(f"- {x}" for x in diff.especificaciones) + "\n")
    for d in diff.listas:
        out.append(f"## {d.nombre} ({d.n_a} → {d.n_b} pasos)")
        for titulo, items in (
            ("Quitados", d.quitados),
            ("Agregados", d.agregados),
            ("Cambiados", d.cambiados),
            ("Procesos menores", d.procesos_menores),
        ):
            if items:
                out.append(f"**{titulo}**")
                out += [f"- {x}" for x in items]
        out.append("")
    if len(out) == 1:
        out.append("Sin diferencias.")
    return "\n".join(out)
