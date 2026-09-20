from __future__ import annotations

import sys

import click

from .batch import acciones_disponibles, cargar_operaciones, ejecutar_batch


@click.group()
def cli() -> None:
    """Automatización de ingreso y configuración de Registros de Manufactura Digital (RMD)."""
    for flujo in (sys.stdout, sys.stderr):  # consolas de Windows (cp1252) no imprimen ✓ → …
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8")


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


@cli.group("cambios")
def cambios_group() -> None:
    """Aplica cambios decididos sobre un RMD Ingresado (nunca envía ni autoriza)."""


@cambios_group.command("plan")
@click.argument("spec", type=click.Path(exists=True))
@click.option("--snapshot", type=click.Path(exists=True), required=True, help="Snapshot actual del RMD (JSON).")
def cambios_plan(spec: str, snapshot: str) -> None:
    """Muestra qué falta y qué ya está aplicado, sin abrir el portal."""
    from . import cambios as cb
    from .snapshot import cargar

    sp = cb.cargar_spec(spec)
    click.echo(cb.plan_a_texto(sp, cb.planificar(sp, cargar(snapshot))))


@cambios_group.command("aplicar")
@click.argument("spec", type=click.Path(exists=True))
@click.option("--confirmar", is_flag=True, help="Sin este indicador solo se muestra el plan.")
@click.option("--auditoria", type=click.Path(), default="data/auditoria.jsonl", show_default=True)
def cambios_aplicar(spec: str, confirmar: bool, auditoria: str) -> None:
    """Lee el RMD, muestra el plan y, con --confirmar y una confirmación humana, lo ejecuta y lo verifica."""
    from . import cambios as cb
    from .actions import RmdAutomation
    from .browser import rmd_session
    from .config import load_config
    from .extraer import extraer

    sp = cb.cargar_spec(spec)
    with rmd_session(load_config()) as page:
        snap = extraer(page, sp.rmd)
        if snap.get("estado") != "Ingresado":
            raise click.ClickException(
                f"El RMD {sp.rmd} está en estado {snap.get('estado')!r}; solo se modifican versiones Ingresadas."
            )
        plan = cb.planificar(sp, snap)
        click.echo(cb.plan_a_texto(sp, plan))
        pendientes = [a for a in plan if a.estado == cb.PENDIENTE]
        if any(a.estado == cb.ERROR for a in plan):
            raise click.ClickException("El plan tiene errores; corrige la especificación.")
        if not pendientes:
            click.echo("Nada que hacer.")
            return
        if not confirmar:
            click.echo("Modo plan: agrega --confirmar para ejecutar.")
            return
        if not click.confirm(f"¿Ejecutar {len(pendientes)} cambio(s) sobre el RMD real {sp.rmd}?"):
            cb.auditar(auditoria, sp, plan, "cancelado por el usuario")
            return
        cb.ejecutar(sp, plan, RmdAutomation(page))
        despues = cb.planificar(sp, extraer(page, sp.rmd))
        ok = all(a.estado == cb.APLICADO for a in despues)
        cb.auditar(auditoria, sp, despues, "verificado" if ok else "verificación con diferencias")
        click.echo(cb.plan_a_texto(sp, despues))
        if not ok:
            raise click.ClickException("La verificación posterior encontró diferencias; revisa el plan de arriba.")


def _emitir(texto: str, salida: str | None) -> None:
    if salida:
        from pathlib import Path

        Path(salida).write_text(texto, encoding="utf-8")
        click.echo(f"Informe guardado en {salida}")
    else:
        click.echo(texto)


if __name__ == "__main__":
    cli()
