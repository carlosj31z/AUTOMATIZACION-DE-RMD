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
@click.option("--matriz", type=click.Path(exists=True), default=None, help='Hoja "PLANTA 2 DOC TEC" exportada (.xlsx/.csv) para la sugerencia previa.')
@click.option("--producto", default="", help="Nombre del producto (para buscarlo en la matriz).")
@click.option("--etapa", default="", help="Etapa (Fabricación, Envase, Acondicionado…).")
@click.option("--referencia", default=None, help='"Codigo RMD" de un RMD de referencia (vacío = no hay). Si se omite, se pregunta.')
def cambios_aplicar(
    spec: str, confirmar: bool, auditoria: str, matriz: str | None, producto: str, etapa: str, referencia: str | None
) -> None:
    """Lee el RMD, muestra el plan y, con --confirmar y una confirmación humana, lo ejecuta y lo verifica."""
    from . import cambios as cb
    from .actions import RmdAutomation
    from .browser import rmd_session
    from .config import load_config
    from .extraer import extraer
    from .flujo import Flujo

    sp = cb.cargar_spec(spec)
    flujo = Flujo(sp.rmd)
    flujo.mostrar()

    # 1. Matriz de priorizados: solo se avisa si hay algo anormal.
    if matriz and producto:
        from . import matriz as mz

        flujo.empezar("matriz")
        aviso = mz.a_texto(mz.revisar(matriz, producto, etapa))
        if aviso:
            click.echo(click.style(aviso, fg="yellow"))
            flujo.hecho("matriz", "hay avisos (ver arriba)")
        else:
            flujo.hecho("matriz", "sin observaciones")
    else:
        flujo.omitir("matriz", "sin --matriz/--producto")

    # 2. RMD de referencia.
    flujo.empezar("referencia")
    if referencia is None and not sp.rmd_referencia:
        referencia = click.prompt(
            '¿Hay un RMD de referencia? Escribe su "Codigo RMD" (Enter si no hay)', default="", show_default=False
        )
    if referencia:
        sp.rmd_referencia = referencia.strip()

    with rmd_session(load_config()) as page:
        if sp.rmd_referencia:
            _mostrar_referencia(page, sp)
            flujo.hecho("referencia", f"referencia {sp.rmd_referencia}")
        else:
            flujo.omitir("referencia", "no hay RMD de referencia")

        # 3. Lectura.
        flujo.empezar("lectura")
        snap = extraer(page, sp.rmd, procesos_menores=False)
        if snap.get("estado") != "Ingresado":
            flujo.error("lectura", f"estado {snap.get('estado')!r}")
            raise click.ClickException(
                f"El RMD {sp.rmd} está en estado {snap.get('estado')!r}; solo se modifican versiones Ingresadas."
            )
        flujo.hecho("lectura", f"versión {snap.get('version', '?')}, estado {snap.get('estado')}")

        # 4. Plan.
        flujo.empezar("plan")
        plan = cb.planificar(sp, snap)
        click.echo(cb.plan_a_texto(sp, plan))
        pendientes = [a for a in plan if a.estado == cb.PENDIENTE]
        if any(a.estado == cb.ERROR for a in plan):
            flujo.error("plan", "hay acciones con error")
            raise click.ClickException("El plan tiene errores; corrige la especificación.")
        flujo.hecho("plan", f"{len(pendientes)} pendiente(s) de {len(plan)}")
        if not pendientes:
            for c in ("confirmacion", "aplicacion", "verificacion"):
                flujo.omitir(c, "nada que hacer")
            _preguntar_revisiones(sp, flujo)
            return
        if not confirmar:
            for c in ("confirmacion", "aplicacion", "verificacion", "revisiones"):
                flujo.omitir(c, "modo plan (sin --confirmar)")
            return

        # 5. Confirmación humana.
        flujo.empezar("confirmacion")
        if not click.confirm(f"¿Ejecutar {len(pendientes)} cambio(s) sobre el RMD {sp.rmd}?"):
            flujo.omitir("confirmacion", "cancelado por el usuario")
            cb.auditar(auditoria, sp, plan, "cancelado por el usuario")
            return
        flujo.hecho("confirmacion", "autorizado")

        # 6. Aplicación.
        flujo.empezar("aplicacion", f"{len(pendientes)} cambio(s) en el portal…")
        try:
            cb.ejecutar(sp, plan, RmdAutomation(page))
        except Exception as e:
            flujo.error("aplicacion", str(e)[:120])
            raise
        flujo.hecho("aplicacion", f"{len(pendientes)} cambio(s) aplicados")

        # 7. Verificación.
        flujo.empezar("verificacion")
        despues = cb.planificar(sp, extraer(page, sp.rmd, procesos_menores=False))
        ok = all(a.estado == cb.APLICADO for a in despues)
        cb.auditar(auditoria, sp, despues, "verificado" if ok else "verificación con diferencias")
        click.echo(cb.plan_a_texto(sp, despues))
        if not ok:
            flujo.error("verificacion", "hay diferencias")
            raise click.ClickException("La verificación posterior encontró diferencias; revisa el plan de arriba.")
        flujo.hecho("verificacion", "todos los cambios verificados")
        _preguntar_revisiones(sp, flujo)


def _mostrar_referencia(page, sp) -> None:
    """Lee (solo lectura) el RMD de referencia y muestra en qué se diferencia del RMD a modificar."""
    import json
    from pathlib import Path

    from . import comparar as cmp
    from .extraer import extraer

    ref = extraer(page, sp.rmd_referencia, procesos_menores=False)
    Path("data/snapshots").mkdir(parents=True, exist_ok=True)
    Path(f"data/snapshots/ref_{sp.rmd_referencia}.json").write_text(json.dumps(ref, ensure_ascii=False), encoding="utf-8")
    actual = extraer(page, sp.rmd, procesos_menores=False)
    click.echo(f"\n--- RMD de referencia {sp.rmd_referencia} (estado {ref.get('estado')!r}) vs RMD {sp.rmd} ---")
    click.echo(cmp.a_markdown(cmp.comparar(ref, actual)))


def _preguntar_revisiones(sp, flujo) -> None:
    """Tras terminar el ingreso: ofrece las revisiones que se hacen fuera del portal (con el asistente)."""
    flujo.empezar("revisiones")
    click.echo("Ingreso terminado. Revisiones posteriores disponibles:")
    for i, r in enumerate(REVISIONES, 1):
        click.echo(f"  {i}. {r}")
    if click.confirm("¿Necesitas aplicar estas revisiones ahora?", default=False):
        click.echo(f"Pídele al asistente: 'revisar RMD {sp.rmd}: tren de equipos, controles de cambio y utensilios'.")
        flujo.hecho("revisiones", "solicitadas al asistente")
    else:
        flujo.omitir("revisiones", "el usuario no las necesita")


CONTINGENCIA_URL = (
    "https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/"
    "PLANTA LIMA/DIRECCION TECNICA/DOCUMENTACION TECNICA/04.-RMD/3.-CONTINGENCIA"
)


@cli.group("contingencia")
def contingencia_group() -> None:
    """RMD de contingencia (04.-RMD/3.-CONTINGENCIA): ¿cada RMD Autorizado tiene su PDF? Solo lee."""


@contingencia_group.command("revisar")
@click.option("--maestro", type=click.Path(exists=True), default=None,
              help="Exportación SAPUI5 del maestro (.xlsx/.csv). Sin él, se lee del portal abierto en el Chromium de RMD_CDP_URL.")
@click.option("--carpeta", type=click.Path(exists=True, file_okay=False), default=None,
              help="Copia local de 3.-CONTINGENCIA (sincronizada con OneDrive).")
@click.option("--listado", type=click.Path(exists=True, dir_okay=False), default=None,
              help="Texto con una ruta de PDF por línea, relativa a 3.-CONTINGENCIA.")
@click.option("--sharepoint", "url_sp", default=None, is_flag=False, flag_value=CONTINGENCIA_URL,
              help="Lee la carpeta en SharePoint con la sesión del Chromium de RMD_CDP_URL (sin valor: 3.-CONTINGENCIA).")
@click.option("--guardar-listado", type=click.Path(dir_okay=False), default=None,
              help="Guarda las rutas leídas para repetir la revisión sin volver a SharePoint.")
@click.option("--salida", type=click.Path(dir_okay=False), default="brechas_contingencia.xlsx", show_default=True)
def contingencia_revisar(maestro: str | None, carpeta: str | None, listado: str | None, url_sp: str | None,
                         guardar_listado: str | None, salida: str) -> None:
    """Compara los RMD Autorizados del maestro con los PDF de la carpeta de contingencia y arma un Excel."""
    from . import contingencia as ct

    fuentes = [x for x in (carpeta, listado, url_sp) if x]
    if len(fuentes) != 1:
        raise click.UsageError("Indica una sola fuente de PDF: --carpeta, --listado o --sharepoint.")
    import os

    cdp = os.environ.get("RMD_CDP_URL", "http://127.0.0.1:9222")
    if carpeta:
        rutas = ct.listar_carpeta(carpeta)
    elif listado:
        rutas = ct.leer_listado(listado)
    else:
        from .sharepoint import listar_pdfs

        click.echo(f"Leyendo SharePoint con el Chromium de {cdp}…")
        rutas = listar_pdfs(cdp, url_sp)
    if guardar_listado:
        from pathlib import Path

        Path(guardar_listado).write_text("\n".join(rutas) + "\n", encoding="utf-8")
    if maestro:
        rmds = ct.leer_maestro(maestro)
    else:
        from .maestro_portal import leer_maestro_portal

        click.echo("Leyendo el maestro del portal…")
        rmds = leer_maestro_portal(cdp)
    brechas = ct.comparar(rmds, rutas)
    ct.escribir_excel(brechas, salida)
    click.echo(ct.resumen(brechas))
    click.echo(f"Detalle en {salida}")


@contingencia_group.command("diaria")
@click.option("--fecha", default=None, help="Fecha de autorización AAAA-MM-DD (por defecto, ayer).")
@click.option("--hoy", is_flag=True, help="Los autorizados hoy, en vez de ayer.")
@click.option("--aplicar", is_flag=True, help="Sube los PDF a SharePoint y pasa las versiones anteriores a OBSOLETO.")
@click.option("--local", "carpeta_local", default="data/contingencia", show_default=True,
              help="Dónde se guarda la copia local de los PDF (por fecha).")
def contingencia_diaria(fecha: str | None, hoy: bool, aplicar: bool, carpeta_local: str) -> None:
    """Master en PDF de los RMD autorizados ayer (u hoy) y su lugar en 3.-CONTINGENCIA.

    Sin --aplicar solo muestra el plan y guarda los PDF en local. Usa el Chromium de RMD_CDP_URL con
    sesión iniciada en el portal RMD (lista «Configuración Manufactura Digital») y en SharePoint.
    """
    import os

    from .contingencia_diaria import ejecutar, fecha_objetivo

    if fecha and hoy:
        raise click.UsageError("Usa --fecha o --hoy, no los dos.")
    fecha = fecha or fecha_objetivo(del_dia=hoy)
    cdp = os.environ.get("RMD_CDP_URL", "http://127.0.0.1:9222")
    click.echo(f"Contingencia de los RMD autorizados el {fecha}{'' if aplicar else ' (vista previa: no se sube nada)'}")
    ejecutar(cdp, CONTINGENCIA_URL, fecha, carpeta_local, aplicar, avisar=click.echo)


@cli.group("interfaz")
def interfaz_group() -> None:
    """Userscript «mejoras de interfaz» (Tampermonkey) en la carpeta MEJORAS DE INTERFAZ de SharePoint."""


@interfaz_group.command("publicar")
@click.option("--archivo", type=click.Path(exists=True, dir_okay=False), default="tampermonkey/rmd-ui-mejoras.user.js",
              show_default=True, help="Userscript a publicar; se sube como <@version>.js.")
@click.option("--subir", is_flag=True, help="Sube el archivo (sin esto solo muestra qué haría). Llega a todos los usuarios.")
def interfaz_publicar(archivo: str, subir: bool) -> None:
    """Sube el userscript como <versión>.js, si es mayor que la última de la carpeta. Nunca sobrescribe ni borra.

    Usa la sesión de SharePoint del Chromium de RMD_CDP_URL.
    """
    import os

    from .interfaz import publicar

    cdp = os.environ.get("RMD_CDP_URL", "http://127.0.0.1:9222")
    if not publicar(cdp, archivo, subir, avisar=click.echo):
        sys.exit(1)


REVISIONES = [
    "Tren de equipos (TREN DE EQUIPOS PL2.xlsx): los equipos del RMD deben coincidir con la línea/sala de la etapa.",
    'Controles de cambio pendientes (1.-CC-NC-DES Para actualizar RMD.xlsx, hoja "PLANTA 2"): ¿alguno aplica a este RMD?',
    "Listas de utensilios y accesorios por sección (04.-RMD/UTENSILIOS/PLANTA 2): utensilios que exige cada sección del RMD.",
]


def _emitir(texto: str, salida: str | None) -> None:
    if salida:
        from pathlib import Path

        Path(salida).write_text(texto, encoding="utf-8")
        click.echo(f"Informe guardado en {salida}")
    else:
        click.echo(texto)


if __name__ == "__main__":
    cli()
