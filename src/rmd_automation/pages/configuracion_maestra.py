from __future__ import annotations

from playwright.sync_api import Page

from . import base


class ConfiguracionMaestraPage:
    """Diálogo 'Configuración Maestra' (manual RMD, sección 4).

    Cada método sigue el patrón que describe el manual: primero busca si el
    elemento ya existe por su descripción y, solo si no existe, lo crea. Esto
    hace que las operaciones de "ingreso masivo" sean idempotentes: correr el
    mismo batch dos veces no duplica estructuras, etiquetas, pasos, etc.
    """

    def __init__(self, page: Page):
        self.page = page

    def _existe(self, tab: str, descripcion: str) -> bool:
        self.page.get_by_role("tab", name=tab, exact=True).click()
        base.fill_field(self.page, "Descripción", descripcion)
        base.click_ir(self.page)
        return self.page.get_by_role("row", name=descripcion).count() > 0

    def crear_estructura(self, descripcion: str, tipo_estructura: str, requiere_verificado_por: bool) -> None:
        if self._existe("Estructura", descripcion):
            return
        base.click_button(self.page, "Nueva Estructura")
        base.fill_field(self.page, "Descripción", descripcion)
        base.select_dropdown(self.page, "Tipo de Estructura", tipo_estructura)
        checkbox = self.page.get_by_label("Requiere Verificado Por")
        checkbox.check() if requiere_verificado_por else checkbox.uncheck()
        base.click_button(self.page, "Agregar")

    def crear_etiqueta(self, descripcion: str, estructura: str) -> None:
        if self._existe("Etiqueta", descripcion):
            return
        base.click_button(self.page, "Nueva Etiqueta")
        base.fill_field(self.page, "Descripción", descripcion)
        base.select_dropdown(self.page, "Estructura", estructura)
        base.click_button(self.page, "Agregar")

    def crear_paso(self, descripcion: str, estructura: str, etiqueta: str, tipo_dato: str) -> None:
        if self._existe("Pasos", descripcion):
            return
        base.click_button(self.page, "Nuevo Paso")
        base.fill_field(self.page, "Descripción", descripcion)
        base.select_dropdown(self.page, "Estructura", estructura)
        base.select_dropdown(self.page, "Etiqueta", etiqueta)
        base.select_dropdown(self.page, "Tipo de Dato", tipo_dato)
        base.click_button(self.page, "Agregar")

    def rmd_asociadas_a_paso(self, descripcion_paso: str) -> None:
        self.page.get_by_role("tab", name="Pasos", exact=True).click()
        base.fill_field(self.page, "Descripción", descripcion_paso)
        base.click_ir(self.page)
        base.click_button(self.page, "RMD Asociadas")

    def crear_motivo(self, abreviatura: str, descripcion: str) -> None:
        if self._existe("Motivo", descripcion):
            return
        base.click_button(self.page, "Nuevo Motivo")
        base.fill_field(self.page, "Abreviatura", abreviatura)
        base.fill_field(self.page, "Descripción Completa", descripcion)
        base.click_button(self.page, "Agregar")

    def crear_utensilio(self, codigo: str, descripcion: str, tipo: str) -> None:
        if self._existe("Utensilios", descripcion):
            return
        base.click_button(self.page, "Nuevo")
        base.fill_field(self.page, "Código", codigo)
        base.fill_field(self.page, "Descripción", descripcion)
        base.select_dropdown(self.page, "Tipo", tipo)
        base.click_button(self.page, "Agregar")

    def crear_motivo_lapso(self, descripcion: str, tipo: str, es_indicador_notificacion: bool) -> None:
        if self._existe("Motivo de Lapsos", descripcion):
            return
        base.click_button(self.page, "Nuevo Motivo de lapso")
        base.fill_field(self.page, "Descripción", descripcion)
        base.select_dropdown(self.page, "Tipo", tipo)
        checkbox = self.page.get_by_label("Es indicador de notificación")
        checkbox.check() if es_indicador_notificacion else checkbox.uncheck()
        base.click_button(self.page, "Agregar")
