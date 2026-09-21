"""Revisión de reglas de configuración de un RMD (sobre un snapshot).

Las reglas salen de lo observado en 33 RMD autorizados de Planta Lima y de las
indicaciones de la operación (ver docs/como_se_configura_un_rmd.md). Niveles:
  ERROR  – el sistema no deja guardar o el RMD queda mal configurado seguro.
  AVISO  – se aparta de la práctica habitual; requiere criterio humano.
  INFO   – contexto útil (paralelos, estado esperado de una versión nueva).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from .snapshot import (
    Lista,
    codigo_de_dep,
    descripcion_pm,
    estructura,
    filas_pm,
    listas,
    normalizar,
    orden_de_dep,
)

CLAVES_MODELO = {"Setup Pre Proceso", "Proceso", "Setup Post Proceso"}
TIPOS_CON_EDIT = {
    "Notificacion", "Fecha y Hora", "Fecha", "Hora", "Números", "Rango", "Texto", "Lote",
    "Fecha Vencimiento", "Fórmula", "Entrega", "MuestraCC", "Cantidad",
}
TIPOS_NUMERICOS = {"Números", "Rango", "Fórmula", "Entrega", "MuestraCC"}
TIPOS_SIN_EDIT = {"Realizado por", "Realizado por y Visto bueno", "Múltiple check", "Sin tipo de dato", "Visto bueno"}

# Pasos que la operación decidió no incluir en ningún RMD nuevo.
PASOS_PROHIBIDOS = [
    ("SOLICITAR AL JEFE O SUPERVISOR DE TURNO, ASIGNE LOS NOMBRES", "paso retirado de Documentación"),
    ("CUANDO SE ELIGE LA OPCION \"NO APLICA\"", "nota retirada de Notas importantes"),
]

LISTAS_SIN_PREDECESORES = ("RENDIMIENTO", "CONDICIONES AMBIENTALES")
ETAPAS_PRINCIPALES = ("FABRICACION", "ENVASE", "ACONDICIONADO", "RECUBRIMIENTO")


@dataclass
class Hallazgo:
    nivel: str
    lista: str
    orden: str
    mensaje: str

    def __str__(self) -> str:  # pragma: no cover - formato de consola
        return f"[{self.nivel}] {self.lista} #{self.orden}: {self.mensaje}"


def _o(lst: Lista, i: int) -> str:
    return str(lst.pasos[i].get("o") or i + 1)


def _chk(p: dict) -> set:
    return {c.strip() for c in (p.get("chk") or "").split(",") if c.strip()}


def _es_principal(nombre: str) -> bool:
    return any(nombre.endswith(">" + e) for e in ETAPAS_PRINCIPALES)


def _lleva_predecesores(nombre: str) -> bool:
    if any(nombre.endswith(x) or nombre == x for x in LISTAS_SIN_PREDECESORES):
        return False
    return ">" in nombre or nombre.startswith(("PRECAUCIONES", "NOTAS"))


def _luz_inactinica(snap: dict) -> bool:
    for lst in listas(snap):
        for p in lst.pasos:
            if "LUZ INACTINICA" in normalizar(p.get("d")):
                return True
        for filas in lst.procesos_menores.values():
            if any("LUZ INACTINICA" in normalizar(descripcion_pm(f)) for f in filas):
                return True
    return False


def revisar(snap: dict) -> List[Hallazgo]:
    h: List[Hallazgo] = []
    todas = listas(snap)
    ins = estructura(snap, "INSUMOS")
    sin_receta = bool(ins) and str(ins.get("items", "")).strip() == "0"
    luz = _luz_inactinica(snap)

    # -- estructura del procedimiento ------------------------------------------------
    proc = [l for l in todas if l.es_etiqueta]
    nombres = [l.nombre.split(">")[1] for l in proc]
    for esperado in ("DOCUMENTACION", "RENDIMIENTO"):
        if proc and esperado not in nombres:
            h.append(Hallazgo("AVISO", "PROCEDIMIENTO", "-", f"falta la etiqueta {esperado}"))

    notificaciones: Dict[Tuple[str, str], int] = {}

    for lst in todas:
        pasos = lst.pasos
        por_orden = {str(p.get("o") or i + 1): (i, p) for i, p in enumerate(pasos)}
        nombre = lst.nombre

        # -- pasos prohibidos --------------------------------------------------------
        for i, p in enumerate(pasos):
            for marca, motivo in PASOS_PROHIBIDOS:
                if marca in normalizar(p.get("d")):
                    h.append(Hallazgo("ERROR", nombre, _o(lst, i), f"no debe existir en RMD nuevos ({motivo})"))

        # -- estructuras informativas -------------------------------------------------
        if nombre.startswith("CONDICIONES"):
            for i, p in enumerate(pasos):
                if p.get("td") != "Sin tipo de dato":
                    h.append(Hallazgo("AVISO", nombre, _o(lst, i), f"las condiciones ambientales van como Sin tipo de dato (es {p.get('td')})"))
        if nombre.startswith(("PRECAUCIONES", "NOTAS")):
            for i, p in enumerate(pasos):
                if p.get("td") != "Verificación Check":
                    h.append(Hallazgo("AVISO", nombre, _o(lst, i), f"se espera Verificación Check (es {p.get('td')})"))

        # -- reglas por paso ----------------------------------------------------------
        ultimo_con_tipo: Optional[int] = None
        paralelos: List[str] = []
        for i, p in enumerate(pasos):
            td = p.get("td", "")
            chk = _chk(p)
            o = _o(lst, i)

            if td in TIPOS_NUMERICOS and not str(p.get("dc", "")).strip():
                h.append(Hallazgo("ERROR", nombre, o, f"{td} sin Decimal (el portal no deja guardar)"))
            if td == "Rango" and not (str(p.get("vi", "")).strip() and str(p.get("vf", "")).strip()):
                h.append(Hallazgo("ERROR", nombre, o, "Rango sin Val. Inicial / Val. Final"))

            if td in TIPOS_CON_EDIT and "Edit" not in chk:
                h.append(Hallazgo("AVISO", nombre, o, f"{td} sin casilla Edit"))
            if td == "MuestraCC" and "Estado CC" not in chk:
                h.append(Hallazgo("AVISO", nombre, o, "MuestraCC sin Estado CC"))
            if td == "Realizado por" and "R. Por" not in chk:
                h.append(Hallazgo("AVISO", nombre, o, "Realizado por sin R. Por"))
            if td == "Realizado por y Visto bueno" and not {"R. Por", "V.B."} <= chk:
                h.append(Hallazgo("AVISO", nombre, o, "Realizado por y Visto bueno sin R. Por + V.B."))
            if td == "Visto bueno" and "V.B." not in chk:
                h.append(Hallazgo("AVISO", nombre, o, "Visto bueno sin V.B."))
            if td in TIPOS_SIN_EDIT and "Edit" in chk and nombre.startswith("PROCEDIMIENTO"):
                h.append(Hallazgo("AVISO", nombre, o, f"{td} con Edit marcado (no es habitual)"))

            if td == "Notificacion":
                if p.get("ck") not in CLAVES_MODELO:
                    h.append(Hallazgo("ERROR", nombre, o, f"Clave Modelo inválida o vacía ({p.get('ck')!r})"))
                if not (p.get("pt") or "").strip():
                    h.append(
                        Hallazgo(
                            "INFO" if sin_receta else "AVISO", nombre, o,
                            "Notificacion sin Puesto de Trabajo"
                            + (" (versión sin receta: se completa al autorizar)" if sin_receta else ""),
                        )
                    )
                notificaciones[(p.get("ck", ""), p.get("pt", ""))] = notificaciones.get((p.get("ck", ""), p.get("pt", "")), 0) + 1

            # -- predecesores ---------------------------------------------------------
            dep = (p.get("dep") or "").strip()
            if not _lleva_predecesores(nombre):
                if dep and nombre.split(">")[-1] in LISTAS_SIN_PREDECESORES:
                    h.append(Hallazgo("AVISO", nombre, o, "esta sección no suele llevar predecesores"))
                continue
            if td == "Sin tipo de dato":
                if dep:
                    h.append(Hallazgo("ERROR", nombre, o, "un Sin tipo de dato no lleva predecesor"))
                continue
            if not dep:
                if i > 0 and ultimo_con_tipo is not None:
                    h.append(Hallazgo("AVISO", nombre, o, "paso con tipo de dato sin predecesor (¿independiente o condicional?)"))
            else:
                ord_pred = orden_de_dep(dep)
                if ord_pred is None:
                    h.append(Hallazgo("AVISO", nombre, o, f"predecesor colgante ({dep}): el paso ya no existe en el RMD; regenerar"))
                else:
                    destino = por_orden.get(str(ord_pred))
                    if destino and codigo_de_dep(dep) == destino[1].get("cod"):
                        j, q = destino
                        if q.get("td") == "Sin tipo de dato":
                            h.append(Hallazgo("ERROR", nombre, o, f"depende del #{ord_pred}, que es un Sin tipo de dato"))
                        elif j >= i:
                            h.append(Hallazgo("AVISO", nombre, o, f"depende del #{ord_pred}, que no es anterior"))
                        elif ultimo_con_tipo is not None and j != ultimo_con_tipo:
                            paralelos.append(f"#{o}←#{ord_pred}")
            ultimo_con_tipo = i
            continue
        if paralelos:
            h.append(Hallazgo("INFO", nombre, "-", f"{len(paralelos)} paralelo(s): " + ", ".join(paralelos[:12]) + ("…" if len(paralelos) > 12 else "")))

        # -- V.B. en condiciones ambientales según luz inactínica ---------------------
        if _es_principal(nombre):
            for i, p in enumerate(pasos):
                if not normalizar(p.get("d")).startswith("CONDICIONES AMBIENTALES"):
                    continue
                orden = str(p.get("o") or i + 1)
                inicia = any(
                    orden_de_dep(q.get("dep", "")) == int(orden) and normalizar(q.get("d")).startswith("FECHA / HORA INICIO")
                    for q in pasos
                    if orden.isdigit()
                )
                if not inicia:
                    continue
                tiene_vb = p.get("td") == "Realizado por y Visto bueno"
                if luz and not tiene_vb:
                    h.append(Hallazgo("AVISO", nombre, orden, "inicio de proceso con luz inactínica: debe llevar V.B."))
                if not luz and tiene_vb:
                    h.append(Hallazgo("AVISO", nombre, orden, "V.B. en condiciones ambientales sin luz inactínica en el proceso"))

        # -- Rendimiento -------------------------------------------------------------
        if nombre.endswith(">RENDIMIENTO"):
            tipos = {p.get("td") for p in pasos}
            for req in ("MuestraCC", "Entrega", "Fórmula"):
                if req not in tipos:
                    h.append(Hallazgo("AVISO", nombre, "-", f"el Rendimiento habitual incluye un paso {req}"))

        # -- procesos menores ---------------------------------------------------------
        for orden_paso, filas in lst.procesos_menores.items():
            for fila in filas:
                o_pm, _, cantidad, tipo, vi, vf, _mg, dec, chk = filas_pm(fila)
                donde = f"{nombre} #{orden_paso} (menor {o_pm})"
                if tipo in TIPOS_NUMERICOS and not dec.strip():
                    h.append(Hallazgo("ERROR", donde, "-", f"{tipo} sin Decimal: {descripcion_pm(fila)[:50]}"))
                if tipo == "Rango" and not (vi.strip() and vf.strip()):
                    h.append(Hallazgo("ERROR", donde, "-", f"Rango sin valores: {descripcion_pm(fila)[:50]}"))
                capturas = {"Hora", "Fecha y Hora", "Texto", "Lote", "Rango", "Fecha Vencimiento"}
                if tipo in capturas and "Edit" not in chk:
                    h.append(Hallazgo("AVISO", donde, "-", f"{tipo} sin Edit: {descripcion_pm(fila)[:50]}"))
                if tipo == "Sin tipo de dato" and "Edit" in chk:
                    h.append(Hallazgo("AVISO", donde, "-", f"Sin tipo de dato con Edit: {descripcion_pm(fila)[:50]}"))

    for (ck, pt), n in notificaciones.items():
        if n % 2:
            h.append(Hallazgo("AVISO", "PROCEDIMIENTO", "-", f"notificaciones {ck}/{pt or 'sin puesto'}: cantidad impar ({n}); deben ir en pares inicio/fin"))
    return h


def a_markdown(hallazgos: List[Hallazgo], titulo: str = "") -> str:
    out = [f"# Revisión de reglas {titulo}".rstrip() + "\n"]
    if not hallazgos:
        out.append("Sin hallazgos.")
        return "\n".join(out)
    for nivel in ("ERROR", "AVISO", "INFO"):
        sel = [x for x in hallazgos if x.nivel == nivel]
        if sel:
            out.append(f"## {nivel} ({len(sel)})")
            out += [f"- **{x.lista}** #{x.orden}: {x.mensaje}" for x in sel]
            out.append("")
    return "\n".join(out)
