"""Reglas de homologación de textos de pasos de RMD.

Salen de comparar los RMD Autorizados de fase 2 (ATE y LIMA, 2026-11-09) con su penúltima y
antepenúltima versión. Ver `docs/homologacion_rmd.md`.

Dos usos:
- `homologar(texto)`: devuelve el texto con los términos vigentes y la lista de reglas aplicadas.
- `reemplazo_de_paso(codigo, planta)`: si el código de paso del maestro es uno que el equipo ya
  reemplazó por otro, devuelve el código vigente (tabla `datos/homologacion_pasos.csv`).

En el portal la homologación casi siempre se hace cambiando el paso por otro código del maestro de
pasos que ya tiene el texto correcto, no editando el texto. Por eso, antes de crear un paso nuevo,
se busca primero el código vigente.
"""
from __future__ import annotations

import csv
import re
import unicodedata
from dataclasses import dataclass
from importlib import resources
from typing import Dict, List, Optional, Tuple


def normalizar(texto: str) -> str:
    """Mayúsculas, sin tildes (la Ñ se conserva) y con espacios simples."""
    t = (texto or "").replace("ñ", "\0").replace("Ñ", "\0")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    t = t.replace("\0", "Ñ").upper()
    t = t.replace("V°B°", "VB").replace("VºBº", "VB")
    return re.sub(r"\s+", " ", t).strip()


@dataclass(frozen=True)
class Regla:
    clave: str
    patron: str
    reemplazo: str
    descripcion: str

    def aplicar(self, texto: str) -> str:
        return re.sub(self.patron, self.reemplazo, texto)


# El orden importa: primero las frases largas y después las cortas.
REGLAS: List[Regla] = [
    Regla("pdoc-207", r"\bPDSG-202\b", "PDOC-207",
          "POE de buenas prácticas de documentación: PDSG-202 pasó a PDOC-207 (nota de los vistos buenos)."),
    Regla("vb", r"\(V\.? ?B\.?\)|\(V\s?°\s?B\s?°\)", "(VB)", "Vistos buenos se escriben (VB)."),
    Regla("realicen", r"\bHAGAN\b", "REALICEN", "«Hagan» se reemplaza por «realicen» (CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO)."),
    Regla("muestra-cc", r"\bMUESTRAS? PARA CONTROL DE CALIDAD\b", "CANTIDAD MUESTREADA",
          "«Muestra(s) para control de calidad (unidad):» pasa a «CANTIDAD MUESTREADA (unidad):»."),
    Regla("contramuestra", r"\bCONTRAMUESTRA\b", "CANTIDAD MUESTREADA", "«Contramuestra (unidad):» pasa a «CANTIDAD MUESTREADA (unidad):»."),
    Regla("tabla-muestreo", r"\bSEGUN (?:LA )?TABLA DE MUESTREO DEL (POE|INSTRUCTIVO)\b", r"SEGUN EL \1",
          "Se quita «la tabla de muestreo del»: «SEGUN EL POE PCPR-202 VIGENTE»."),
    Regla("co-control-proceso", r"\bCONTROL DE CALIDAD O CONTROL DE PROCESO\b", "CONTROL DE CALIDAD O CALIDAD EN OPERACIONES",
          "«Control de proceso» pasa a «calidad en operaciones»; «control de calidad» se mantiene cuando es la aprobación del granel."),
    Regla("co-personal", r"\bEL PERSONAL DE CONTROL DE CALIDAD\b", "EL PERSONAL DE CALIDAD EN OPERACIONES",
          "Quien muestrea o inspecciona en planta es «el personal de calidad en operaciones»."),
    Regla("co-inspector", r"\b(?:AL|EL) INSPECTOR(?: DE CONTROL DE CALIDAD| DE CONTROL)?\b", "EL PERSONAL DE CALIDAD EN OPERACIONES",
          "«Inspector de control de calidad» pasa a «personal de calidad en operaciones»."),
    Regla("co-registra", r"^CONTROL DE CALIDAD REGISTRA LOS RESULTADOS ?:", "CALIDAD EN OPERACIONES REGISTRA LOS RESULTADOS:",
          "Título de resultados: «CALIDAD EN OPERACIONES REGISTRA LOS RESULTADOS:»."),
    Regla("co-emitidos", r"\bEMITIDOS POR CONTROL DE CALIDAD\b", "EMITIDOS POR CALIDAD EN OPERACIONES",
          "Resultados emitidos por calidad en operaciones."),
    Regla("co-comunicar", r"\bCOMUNICAR A CONTROL DE CALIDAD\b", "COMUNICAR A CALIDAD EN OPERACIONES",
          "Se comunica a calidad en operaciones."),
    Regla("co-control-proceso-solo", r"\bCONTROL DE PROCESO\b", "CALIDAD EN OPERACIONES", "«Control de proceso» pasa a «calidad en operaciones»."),
    Regla("plataforma", r"\bPARIHUELA(S?)\b", r"PLATAFORMA\1", "«Parihuela» pasa a «plataforma»."),
    Regla("hoja-inspeccion", r"\bLA HOJA DE INSPECCION(?: EN LINEAS DE PRODUCCION)?\b", "EL FORMATO DE INSPECCION EN LINEAS DE PRODUCCION (FPRO-250 VIGENTE)",
          "«Hoja de inspección» pasa a «formato de inspección en líneas de producción (FPRO-250 vigente)»."),
    Regla("maquinas-equipos", r"\bPREPARACION DE MAQUINAS\.", "PREPARACION DE MAQUINAS O EQUIPOS.",
          "«…indicados en la preparación de máquinas o equipos.»"),
    Regla("salas", r"IDENTIFICACION DE AREAS", "IDENTIFICACION DE SALAS", "Rótulos de identificación de «salas» (no «áreas»)."),
    Regla("esterilizado", r"AUTOCLAVADO", "ESTERILIZADO", "Producto «esterilizado» (no «autoclavado»)."),
    Regla("producto-terminado", r"ALMACEN DE PRODUCTOS TERMINADOS", "ALMACEN DE PRODUCTO TERMINADO", "«Almacén de producto terminado», en singular."),
    Regla("envasado", r"MERMA DE ENVASE", "MERMA DE ENVASADO", "«Merma de envasado»."),
    Regla("hay-cambio", r"Y/O CAMBIO DE TURNO", "Y/O HAY CAMBIO DE TURNO", "«…de la línea y/o hay cambio de turno»."),
    Regla("ppro-243", r"\bPBEB-200\b", "PPRO-243", "Uniforme de ingreso a planta: PBEB-200 pasó a PPRO-243 (ATE)."),
    Regla("instructivo", r"\bSEGUN (I[A-Z]{3}-[A-Z]\d{3})\b", r"SEGUN INSTRUCTIVO \1",
          "Un código que empieza con I (IPRO-P212, IACO-P202…) va precedido de «INSTRUCTIVO»."),
    Regla("procedimiento", r"\bSEGUN (P[A-Z]{3}-\d{3})\b", r"SEGUN POE \1",
          "Un código que empieza con P (PPRO-200, PACO-214…) va precedido de «POE» (o «PROCEDIMIENTO» en LIMA)."),
    Regla("vigente", r"\b([A-Z]{4}-[A-Z]?\d{3})\.(?=\s|$)", r"\1 VIGENTE.", "Todo código de documento termina en «VIGENTE»."),
    Regla("fecha-hora", r"\bFECHA / HORA (INICIO|FINAL) :", r"FECHA / HORA \1:", "Sin espacio antes de los dos puntos."),
]


def homologar(texto: str) -> Tuple[str, List[str]]:
    """Devuelve (texto homologado, claves de las reglas aplicadas)."""
    t = normalizar(texto)
    aplicadas = []
    for r in REGLAS:
        nuevo = r.aplicar(t)
        if nuevo != t:
            aplicadas.append(r.clave)
            t = re.sub(r"\s+", " ", nuevo).strip()
    t = re.sub(r"\bVIGENTE VIGENTE\b", "VIGENTE", t)
    return t, aplicadas


@dataclass(frozen=True)
class Reemplazo:
    planta: str
    etapas: str
    codigo_viejo: int
    texto_viejo: str
    codigo_vigente: int
    texto_vigente: str
    tipo_dato: str
    rpor: str
    vb: str
    estado_cc: str
    veces: int
    clase: str


def cargar_reemplazos() -> List[Reemplazo]:
    texto = resources.files("rmd_automation").joinpath("datos/homologacion_pasos.csv").read_text(encoding="utf-8")
    filas = csv.DictReader(texto.splitlines())
    return [Reemplazo(f["planta"], f["etapas"], int(f["codigo_viejo"]), f["texto_viejo"], int(f["codigo_vigente"]),
                      f["texto_vigente"], f["tipo_dato"], f["rpor"], f["vb"], f["estado_cc"], int(f["veces"]), f["clase"])
            for f in filas]


_CACHE: Optional[Dict[Tuple[int, str], Reemplazo]] = None


def reemplazo_de_paso(codigo: int, planta: str, incluir_especificos: bool = False) -> Optional[Reemplazo]:
    """Código vigente para un paso viejo en la planta («ATE» o «LIMA»; acepta «PLANTA ATE», «Planta 1»…).

    Las filas de clase «especifico» (cambian cifras o el proceso de un producto) no se devuelven salvo
    que se pida: no son homologación, son cambios de ese producto."""
    global _CACHE
    if _CACHE is None:
        _CACHE = {(r.codigo_viejo, r.planta): r for r in cargar_reemplazos()}
    p = normalizar(planta)
    p = "ATE" if ("ATE" in p or p.endswith("1")) else "LIMA" if ("LIMA" in p or p.endswith("2")) else p
    r = _CACHE.get((int(codigo), p))
    if r and not incluir_especificos and r.clase == "especifico":
        return None
    return r
