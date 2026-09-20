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


if __name__ == "__main__":
    cli()
