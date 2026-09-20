from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from playwright.sync_api import Page

from . import base


@dataclass
class ConfiguracionFiltro:
    descripcion: Optional[str] = None
    estado_proceso: Optional[str] = None
    planta: Optional[str] = None
    area: Optional[str] = None
    etapa: Optional[str] = None
    estado_rmd: Optional[str] = None


class ConfiguracionPage:
    """Página 'Configuración RMD' (manual RMD, sección 3)."""

    def __init__(self, page: Page):
        self.page = page

    def abrir(self) -> None:
        self.page.get_by_role("link", name="Configuración", exact=True).click()

    def filtrar(self, filtro: ConfiguracionFiltro) -> None:
        if filtro.descripcion:
            base.fill_field(self.page, "Descripción", filtro.descripcion)
        if filtro.estado_proceso:
            base.select_dropdown(self.page, "Estado Proceso", filtro.estado_proceso)
        if filtro.planta:
            base.select_dropdown(self.page, "Planta", filtro.planta)
        if filtro.area:
            base.select_dropdown(self.page, "Área", filtro.area)
        if filtro.etapa:
            base.select_dropdown(self.page, "Etapa", filtro.etapa)
        if filtro.estado_rmd:
            base.select_dropdown(self.page, "Estado RMD", filtro.estado_rmd)
        base.click_ir(self.page)

    def exportar_master(self, descripcion_producto: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_producto))
        self.elegir_accion("Descargar máster")

    def ver_op(self, descripcion_rmd: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_rmd))
        self.elegir_accion("Ver OP")

    def desasociar_op(self, descripcion_rmd: str) -> None:
        self.ver_op(descripcion_rmd)
        base.click_button(self.page, "Desasociar OP")
        base.confirm_dialog(self.page, "OK")

    def agregar_documento(self, descripcion_producto: str, ruta_archivo: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_producto))
        base.click_button(self.page, "Agregar Documento")
        with self.page.expect_file_chooser() as fc_info:
            self.page.get_by_role("button", name="Navegar").click()
        fc_info.value.set_files(ruta_archivo)
        base.click_button(self.page, "Guardar")
        base.confirm_dialog(self.page, "OK")

    def agregar_nota_importante(self, descripcion_producto: str, nota: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_producto))
        self.elegir_accion("Notas importantes")
        self.page.get_by_role("button", name="+").click()
        base.fill_field(self.page, "Nota", nota)
        base.click_button(self.page, "Confirmar")

    def ver_trazabilidad(self, descripcion_master: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_master))
        self.elegir_accion("Trazabilidad de RMD")

    def abrir_configuracion_maestra(self) -> None:
        # Manual 4.1.1: click en la llave "configurar" de la pantalla principal.
        self.page.get_by_role("button", name="Configurar").click()

    def configurar_rmd(self, codigo_rmd: str) -> None:
        # Manual 5.2.1: columna Acción -> Seleccionar -> Configurar el RMD.
        self.filtrar(ConfiguracionFiltro(descripcion=codigo_rmd))
        self.elegir_accion("Configurar el RMD")

    def elegir_accion(self, accion: str) -> None:
        base.select_dropdown(self.page, "Acción", accion)
