"""Indicador de progreso del flujo de cambios: en consola y en una página que se refresca sola.

Cada corrida de `cambios aplicar` recorre las mismas etapas. El estado se imprime como lista con la etapa
actual resaltada y se escribe además en `data/estado_flujo.json` y `data/estado_flujo.html`
(la página se recarga cada 3 s: se puede abrir en cualquier navegador para seguir la corrida).
"""
from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import click

ETAPAS = [
    ("matriz", "Matriz de priorizados", "¿Figura como pendiente o falta en la matriz?"),
    ("referencia", "RMD de referencia", "¿Hay un RMD de referencia? (Codigo RMD)"),
    ("lectura", "Lectura del RMD", "Lee el RMD en el portal (solo lectura)"),
    ("plan", "Plan de cambios", "Qué falta y qué ya está aplicado"),
    ("confirmacion", "Confirmación", "El usuario autoriza la escritura"),
    ("aplicacion", "Aplicación en el portal", "Ejecuta los cambios pendientes"),
    ("verificacion", "Verificación", "Relee el RMD y comprueba cada cambio"),
    ("revisiones", "Revisiones posteriores", "Tren de equipos, controles de cambio, utensilios"),
]
SIMBOLO = {"pendiente": "○", "en curso": "▶", "hecho": "✔", "omitido": "–", "error": "✖"}
COLOR = {"pendiente": "bright_black", "en curso": "cyan", "hecho": "green", "omitido": "yellow", "error": "red"}


class Flujo:
    def __init__(self, rmd: str, carpeta: str | Path = "data") -> None:
        self.rmd = rmd
        self.carpeta = Path(carpeta)
        self.estado = {clave: "pendiente" for clave, _, _ in ETAPAS}
        self.notas: dict[str, str] = {}
        self.inicio = datetime.now()

    # -- transiciones ------------------------------------------------------------------------
    def empezar(self, clave: str, nota: str = "") -> None:
        self._poner(clave, "en curso", nota)

    def hecho(self, clave: str, nota: str = "") -> None:
        self._poner(clave, "hecho", nota)

    def omitir(self, clave: str, nota: str = "") -> None:
        self._poner(clave, "omitido", nota)

    def error(self, clave: str, nota: str = "") -> None:
        self._poner(clave, "error", nota)

    def _poner(self, clave: str, estado: str, nota: str) -> None:
        self.estado[clave] = estado
        if nota:
            self.notas[clave] = nota
        self.mostrar()
        self._escribir()

    # -- presentación -------------------------------------------------------------------------
    def mostrar(self) -> None:
        total = len(ETAPAS)
        hechas = sum(1 for e in self.estado.values() if e in ("hecho", "omitido"))
        click.echo("")
        click.echo(click.style(f"━━ Flujo RMD {self.rmd} · {hechas}/{total} etapas ━━", bold=True))
        for n, (clave, titulo, ayuda) in enumerate(ETAPAS, 1):
            est = self.estado[clave]
            linea = f" {SIMBOLO[est]} {n}. {titulo}"
            detalle = self.notas.get(clave) or (ayuda if est == "en curso" else "")
            if detalle:
                linea += f"  — {detalle}"
            click.echo(click.style(linea, fg=COLOR[est], bold=(est == "en curso")))
        click.echo("")

    def _escribir(self) -> None:
        self.carpeta.mkdir(parents=True, exist_ok=True)
        datos = {
            "rmd": self.rmd,
            "actualizado": datetime.now().isoformat(timespec="seconds"),
            "etapas": [
                {"clave": c, "titulo": t, "estado": self.estado[c], "nota": self.notas.get(c, "")}
                for c, t, _ in ETAPAS
            ],
        }
        (self.carpeta / "estado_flujo.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
        (self.carpeta / "estado_flujo.html").write_text(_pagina(datos), encoding="utf-8")


def _pagina(d: dict) -> str:
    color = {"pendiente": "#8a8f98", "en curso": "#0a84c6", "hecho": "#1a9c55", "omitido": "#c48a00", "error": "#d1332e"}
    filas: List[str] = []
    for n, e in enumerate(d["etapas"], 1):
        c = color[e["estado"]]
        nota = f'<div class="n">{html.escape(e["nota"])}</div>' if e["nota"] else ""
        filas.append(
            f'<li class="{e["estado"].replace(" ", "-")}"><span class="b" style="background:{c}">{SIMBOLO[e["estado"]]}</span>'
            f'<div><b>{n}. {html.escape(e["titulo"])}</b> <small>{e["estado"]}</small>{nota}</div></li>'
        )
    return (
        '<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="3">'
        f"<title>Flujo RMD {html.escape(d['rmd'])}</title>"
        "<style>body{font:16px system-ui;max-width:640px;margin:32px auto;padding:0 16px;background:#fafafa;color:#1c1e21}"
        "h1{font-size:20px}ul{list-style:none;padding:0}li{display:flex;gap:12px;align-items:center;padding:10px 12px;"
        "margin:6px 0;background:#fff;border-radius:10px;box-shadow:0 1px 2px #0001}"
        "li.en-curso{outline:2px solid #0a84c6}.b{width:28px;height:28px;border-radius:50%;color:#fff;display:grid;"
        "place-items:center;flex:none}small{color:#666;margin-left:6px}.n{color:#555;font-size:14px}"
        "@media(prefers-color-scheme:dark){body{background:#16181c;color:#eee}li{background:#22252b}small,.n{color:#aaa}}</style>"
        f"<h1>Flujo del RMD {html.escape(d['rmd'])}</h1><ul>{''.join(filas)}</ul>"
        f"<p><small>Actualizado {html.escape(d['actualizado'])} · se recarga sola</small></p></html>"
    )
