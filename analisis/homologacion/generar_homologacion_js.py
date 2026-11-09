"""Regenera el bloque ==HOMOLOG== del userscript desde la tabla y las reglas de Python.

Uso (desde la raíz del repo):  PYTHONPATH=src python analisis/homologacion/generar_homologacion_js.py
Fuente única: src/rmd_automation/datos/homologacion_pasos.csv y rmd_automation.homologacion.REGLAS.
"""
import json
import re
from pathlib import Path

from rmd_automation.homologacion import REGLAS, cargar_reemplazos

RAIZ = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ / "tampermonkey" / "rmd-ui-mejoras.user.js"
INI, FIN = "// ==HOMOLOG==", "// ==/HOMOLOG=="
# Las reglas de «calidad en operaciones» y «cantidad muestreada» ya las avisa la revisión del borrador (control de calidad).
YA_AVISADAS = {"co-control-proceso", "co-personal", "co-inspector", "co-registra", "co-emitidos", "co-comunicar",
               "co-control-proceso-solo", "muestra-cc"}
GRUPO = re.compile(r"\\(\d)")


def regla_js(r):
    return [r.clave, r.patron, GRUPO.sub(lambda m: "$" + m.group(1), r.reemplazo), r.descripcion]


def bloque():
    pasos = {}
    for f in cargar_reemplazos():
        if f.clase == "especifico":
            continue
        p = "A" if f.planta == "ATE" else "L"
        d = pasos.setdefault(str(f.codigo_viejo), {})
        if p not in d:
            d[p] = [f.codigo_vigente, f.texto_vigente]
    reglas = [regla_js(r) for r in REGLAS if r.clave not in YA_AVISADAS]
    return "\r\n".join([
        INI,
        "    // Generado por analisis/homologacion/generar_homologacion_js.py: no editar a mano (ver docs/homologacion_rmd.md).",
        "    // Paso viejo -> { A (ATE) | L (LIMA): [código vigente, texto] }",
        "    const HOMOLOG_PASOS = " + json.dumps(pasos, ensure_ascii=False, separators=(",", ":")) + ";",
        "    // [clave, patrón, reemplazo, descripción]: términos que el equipo ya cambió en los autorizados de fase 2",
        "    const HOMOLOG_REGLAS = " + json.dumps(reglas, ensure_ascii=False) + ";",
        "    " + FIN,
    ])


def main():
    s = SCRIPT.read_bytes().decode("utf-8")          # el script usa CRLF: se lee y escribe en binario para no tocar el resto
    i, j = s.index(INI), s.index(FIN) + len(FIN)
    SCRIPT.write_bytes((s[:i] + bloque() + s[j:]).encode("utf-8"))
    print("bloque HOMOLOG actualizado")


if __name__ == "__main__":
    main()
