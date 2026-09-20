from __future__ import annotations

import click

from .batch import acciones_disponibles, cargar_operaciones, ejecutar_batch


@click.group()
def cli() -> None:
    """Automatización de ingreso y configuración de Registros de Manufactura Digital (RMD)."""


@cli.command("batch")
@click.argument("ruta_archivo", type=click.Path(exists=True))
def batch_command(ruta_archivo: str) -> None:
    """Ejecuta las operaciones de un archivo YAML/JSON sobre la página Configuración RMD.

    Ver examples/batch_ejemplo.yaml para el formato esperado.
    """
    ejecutar_batch(ruta_archivo)


@cli.command("validar")
@click.argument("ruta_archivo", type=click.Path(exists=True))
def validar_command(ruta_archivo: str) -> None:
    """Valida la estructura de un archivo de batch sin abrir el navegador."""
    operaciones = cargar_operaciones(ruta_archivo)
    click.echo(f"OK: {len(operaciones)} operación(es) válida(s) en '{ruta_archivo}'.")


@cli.command("acciones")
def acciones_command() -> None:
    """Lista las acciones disponibles para usar en un archivo de batch."""
    for accion in acciones_disponibles():
        click.echo(accion)


@cli.command("comparar")
@click.argument("version_a", type=click.Path(exists=True))
@click.argument("version_b", type=click.Path(exists=True))
@click.option("--salida", type=click.Path(), help="Archivo .md donde guardar el informe (por defecto se imprime).")
def comparar_command(version_a: str, version_b: str, salida: str | None) -> None:
    """Compara dos snapshots de un RMD (p. ej. versión autorizada vs ingresada)."""
    from . import comparar as cmp
    from .snapshot import cargar

    texto = cmp.a_markdown(cmp.comparar(cargar(version_a), cargar(version_b)))
    _emitir(texto, salida)


@cli.command("revisar")
@click.argument("snapshot", type=click.Path(exists=True))
@click.option("--salida", type=click.Path(), help="Archivo .md donde guardar el informe (por defecto se imprime).")
@click.option("--falla-si-error", is_flag=True, help="Sale con código 1 si hay hallazgos de nivel ERROR.")
def revisar_command(snapshot: str, salida: str | None, falla_si_error: bool) -> None:
    """Revisa las reglas de configuración de un snapshot de RMD."""
    from . import reglas
    from .snapshot import cargar

    snap = cargar(snapshot)
    hallazgos = reglas.revisar(snap)
    _emitir(reglas.a_markdown(hallazgos, snap.get("head", "")[:60]), salida)
    if falla_si_error and any(x.nivel == "ERROR" for x in hallazgos):
        raise SystemExit(1)


@cli.command("extraer")
@click.argument("codigo")
@click.option("--salida", type=click.Path(), required=True, help="Archivo .json del snapshot.")
def extraer_command(codigo: str, salida: str) -> None:
    """Lee (solo lectura) un RMD del portal y guarda su snapshot JSON."""
    from .extraer import extraer_a_archivo

    extraer_a_archivo(codigo, salida)
    click.echo(f"Snapshot de {codigo} guardado en {salida}")


def _emitir(texto: str, salida: str | None) -> None:
    if salida:
        from pathlib import Path

        Path(salida).write_text(texto, encoding="utf-8")
        click.echo(f"Informe guardado en {salida}")
    else:
        click.echo(texto)


if __name__ == "__main__":
    cli()
