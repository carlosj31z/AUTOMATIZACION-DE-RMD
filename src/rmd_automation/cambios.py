"""Ejecutor de cambios sobre un RMD *Ingresado*, a partir de una especificación YAML.

Flujo: especificación + snapshot actual -> plan (qué falta y qué ya está aplicado) -> confirmación
humana -> ejecución -> relectura y verificación. Sin `--confirmar` solo se muestra el plan.

Acciones soportadas (todas sobre una versión Ingresada; nunca se envía ni se autoriza):
  quitar_equipos / agregar_equipos      equipos: [código de referencia o de material]
  quitar_pasos / agregar_pasos          lista: "PROCEDIMIENTO>DOCUMENTACION", pasos: [texto o código]
  configurar_paso                       lista, paso (texto), tipo_dato, decimal, casillas
  predecesores_secuenciales             lista: regla "anterior, salvo Sin tipo de dato"
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from .snapshot import estructura, listas, normalizar, orden_de_dep

ACCIONES = {
    "quitar_equipos", "agregar_equipos", "quitar_pasos", "agregar_pasos",
    "configurar_paso", "predecesores_secuenciales",
}
PENDIENTE, APLICADO, ERROR = "pendiente", "ya aplicado", "error"


@dataclass
class Accion:
    indice: int
    tipo: str
    params: Dict[str, Any]
    estado: str = PENDIENTE
    detalle: str = ""
    mensajes: List[str] = field(default_factory=list)


@dataclass
class Spec:
    rmd: str
    descripcion: str
    cambios: List[Dict[str, Any]]
    rmd_referencia: str = ""  # "Codigo RMD" del RMD de referencia (opcional)


def cargar_spec(ruta: str | Path) -> Spec:
    datos = yaml.safe_load(Path(ruta).read_text(encoding="utf-8"))
    if not isinstance(datos, dict) or "rmd" not in datos or not isinstance(datos.get("cambios"), list):
        raise ValueError("La especificación debe tener 'rmd' y una lista 'cambios'.")
    for i, c in enumerate(datos["cambios"], 1):
        if c.get("accion") not in ACCIONES:
            raise ValueError(f"Cambio #{i}: acción desconocida {c.get('accion')!r}. Válidas: {sorted(ACCIONES)}")
    return Spec(
        str(datos["rmd"]), str(datos.get("descripcion", "")), datos["cambios"],
        str(datos.get("rmd_referencia") or "").strip(),
    )


def _lista(snap: dict, nombre: str):
    n = normalizar(nombre)
    for l in listas(snap):
        if l.nombre == n or l.nombre.endswith(n) or l.nombre.split(">")[-1] == n:
            return l
    return None


def _coincidencias(lista, texto: str) -> List[dict]:
    t = normalizar(texto)
    return [p for p in lista.pasos if t in normalizar(p["d"]) or t == str(p.get("cod"))]


def _plan_equipos(a: Accion, snap: dict, quitar: bool) -> None:
    est = estructura(snap, "EQUIPOS")
    filas = [normalizar(x) for x in (est or {}).get("eq", [])]
    faltan, presentes = [], []
    for e in a.params.get("equipos", []):
        hay = any(normalizar(str(e)) in f for f in filas)
        (presentes if hay else faltan).append(str(e))
    if quitar:
        a.estado = PENDIENTE if presentes else APLICADO
        a.detalle = ("quitar " + ", ".join(presentes)) if presentes else "ya no están en el RMD"
    else:
        a.estado = PENDIENTE if faltan else APLICADO
        a.detalle = ("agregar " + ", ".join(faltan)) if faltan else "ya están en el RMD"


def _plan_pasos(a: Accion, snap: dict, quitar: bool) -> None:
    lst = _lista(snap, a.params["lista"])
    if lst is None:
        a.estado, a.mensajes = ERROR, [f"no existe la lista {a.params['lista']!r}"]
        return
    hacer = []
    for t in a.params.get("pasos", []):
        m = _coincidencias(lst, str(t))
        if quitar:
            if len(m) > 1:
                a.mensajes.append(f"ambiguo ({len(m)} coincidencias): {t}")
            elif m:
                hacer.append(str(t))
        elif not m:
            hacer.append(str(t))
    if a.mensajes:
        a.estado = ERROR
    else:
        a.estado = PENDIENTE if hacer else APLICADO
        a.detalle = (("quitar " if quitar else "agregar ") + "; ".join(x[:60] for x in hacer)) if hacer else "sin cambios"


def _plan_configurar(a: Accion, snap: dict) -> None:
    lst = _lista(snap, a.params["lista"])
    if lst is None:
        a.estado, a.mensajes = ERROR, [f"no existe la lista {a.params['lista']!r}"]
        return
    m = _coincidencias(lst, str(a.params["paso"]))
    if len(m) != 1:
        a.estado, a.mensajes = ERROR, [f"el paso {a.params['paso']!r} coincide con {len(m)} pasos"]
        return
    p = m[0]
    difs = []
    if "tipo_dato" in a.params and p.get("td") != a.params["tipo_dato"]:
        difs.append(f"tipo {p.get('td')} → {a.params['tipo_dato']}")
    if "decimal" in a.params and str(p.get("dc", "")) != str(a.params["decimal"]):
        difs.append(f"decimal {p.get('dc', '')!r} → {a.params['decimal']}")
    if "casillas" in a.params:
        actual = {c.strip() for c in (p.get("chk") or "").split(",") if c.strip()}
        if actual != set(a.params["casillas"]):
            difs.append(f"casillas {sorted(actual)} → {sorted(a.params['casillas'])}")
    a.estado = PENDIENTE if difs else APLICADO
    a.detalle = f"#{p.get('o')}: " + ("; ".join(difs) if difs else "ya configurado")


def _plan_secuenciales(a: Accion, snap: dict) -> None:
    lst = _lista(snap, a.params["lista"])
    if lst is None:
        a.estado, a.mensajes = ERROR, [f"no existe la lista {a.params['lista']!r}"]
        return
    faltan = 0
    anterior: Optional[dict] = None
    pos_anterior = 0
    for i, p in enumerate(lst.pasos):
        if p.get("td") == "Sin tipo de dato":
            faltan += 1 if (p.get("dep") or "").strip() else 0
            continue
        if anterior is not None:
            # Si la vista angosta no expone el campo Orden, el orden es la posición en la lista.
            if orden_de_dep(p.get("dep", "")) != int(anterior.get("o") or pos_anterior):
                faltan += 1
        anterior, pos_anterior = p, i + 1
    a.estado = PENDIENTE if faltan else APLICADO
    a.detalle = f"{faltan} paso(s) con predecesor distinto de la regla" if faltan else "cadena ya conforme"


def planificar(spec: Spec, snap: dict) -> List[Accion]:
    plan: List[Accion] = []
    for i, c in enumerate(spec.cambios, 1):
        a = Accion(i, c["accion"], {k: v for k, v in c.items() if k != "accion"})
        try:
            if a.tipo == "quitar_equipos":
                _plan_equipos(a, snap, True)
            elif a.tipo == "agregar_equipos":
                _plan_equipos(a, snap, False)
            elif a.tipo == "quitar_pasos":
                _plan_pasos(a, snap, True)
            elif a.tipo == "agregar_pasos":
                _plan_pasos(a, snap, False)
            elif a.tipo == "configurar_paso":
                _plan_configurar(a, snap)
            elif a.tipo == "predecesores_secuenciales":
                _plan_secuenciales(a, snap)
        except KeyError as e:
            a.estado, a.mensajes = ERROR, [f"falta el parámetro {e}"]
        plan.append(a)
    return plan


def plan_a_texto(spec: Spec, plan: List[Accion]) -> str:
    out = [f"Plan para el RMD {spec.rmd}" + (f" — {spec.descripcion}" if spec.descripcion else "")]
    if spec.rmd_referencia:
        out.append(f"RMD de referencia: {spec.rmd_referencia}")
    for a in plan:
        marca = {PENDIENTE: "▶", APLICADO: "✓", ERROR: "✗"}[a.estado]
        out.append(f" {marca} {a.indice}. {a.tipo}: {a.detalle or ', '.join(a.mensajes)} [{a.estado}]")
        out += [f"      ! {m}" for m in a.mensajes if a.estado != ERROR]
    pend = sum(1 for a in plan if a.estado == PENDIENTE)
    err = sum(1 for a in plan if a.estado == ERROR)
    out.append(f"{pend} pendiente(s), {sum(1 for a in plan if a.estado == APLICADO)} ya aplicado(s), {err} con error.")
    return "\n".join(out)


def auditar(ruta: str | Path, spec: Spec, plan: List[Accion], resultado: str) -> None:
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    reg = {
        "cuando": datetime.now().isoformat(timespec="seconds"), "rmd": spec.rmd, "resultado": resultado,
        "acciones": [{"n": a.indice, "tipo": a.tipo, "estado": a.estado, "detalle": a.detalle} for a in plan],
    }
    with open(ruta, "a", encoding="utf-8") as f:
        f.write(json.dumps(reg, ensure_ascii=False) + "\n")


def ejecutar(spec: Spec, plan: List[Accion], automation) -> None:
    """Aplica las acciones pendientes con el editor del portal (requiere sesión iniciada)."""
    from .pages.rmd_editor import RmdEditor

    editor: RmdEditor = automation.editor_de_rmd(spec.rmd)
    try:
        for a in plan:
            if a.estado != PENDIENTE:
                continue
            p = a.params
            if a.tipo == "quitar_equipos":
                editor.eliminar_equipos(p.get("estructura", "EQUIPOS"), p["equipos"])
            elif a.tipo == "agregar_equipos":
                editor.agregar_equipos(p.get("estructura", "EQUIPOS"), p["equipos"])
            elif a.tipo == "quitar_pasos":
                est, _, etq = p["lista"].partition(">")
                editor.eliminar_pasos(est, p["pasos"], etq or None)
            elif a.tipo == "agregar_pasos":
                est, _, etq = p["lista"].partition(">")
                editor.agregar_pasos(est, p["pasos"], etq or None)
                editor.cerrar_dialogo()  # "Pasos (n)"
                if etq:
                    editor.cerrar_dialogo()  # "Etiqueta (n)"
            elif a.tipo == "configurar_paso":
                est, _, etq = p["lista"].partition(">")
                editor.configurar_paso(est, etq or None, p["paso"], p.get("tipo_dato"), p.get("decimal"), p.get("casillas"))
            elif a.tipo == "predecesores_secuenciales":
                est, _, etq = p["lista"].partition(">")
                editor.abrir_pasos(est, etq or None)
                editor.predecesores_secuenciales()
                editor.cerrar_dialogo()
    finally:
        editor.cerrar_editor()
