from __future__ import annotations

from typing import Iterable

from playwright.sync_api import Locator, Page

from . import base


class RmdEditor:
    """Acciones dentro del diálogo 'Configurar el RMD' (manual RMD, secciones 5 a 7)."""

    def __init__(self, page: Page):
        self.page = page

    def agregar_estructuras(self, estructuras: Iterable[str]) -> None:
        base.click_button(self.page, "+ Agregar Estructura")
        self._marcar_y_agregar(estructuras)

    def agregar_etiquetas(self, estructura: str, etiquetas: Iterable[str]) -> None:
        self._fila(estructura).get_by_role("button", name="Adicionar Etiqueta").click()
        self._marcar_y_agregar(etiquetas)

    def asociar_formulas(self, codigo_o_descripcion: str, recetas: Iterable[str]) -> None:
        base.click_button(self.page, "+ Agregar Producto")
        base.fill_field(self.page, "Código y/o Descripción y/o Variante", codigo_o_descripcion)
        base.click_ir(self.page)
        self._marcar_y_agregar(recetas)
        base.click_button(self.page, "Guardar")

    def agregar_equipos(self, estructura: str, equipos: Iterable[str]) -> None:
        self._fila(estructura).get_by_role("button", name="Adicionar Equipo").click()
        self._marcar_y_agregar(equipos)

    def agregar_pasos(self, etiqueta: str, pasos: Iterable[str]) -> None:
        self._fila(etiqueta).get_by_role("button", name="Adicionar Pasos RMD").click()
        self._marcar_y_agregar(pasos)

    def agregar_procesos_menores(self, paso: str, procesos_menores: Iterable[str]) -> None:
        self._fila(paso).get_by_role("button", name="Procesos Menores").click()
        base.click_button(self.page, "+ Agregar Pasos Menores")
        self._marcar_y_agregar(procesos_menores)

    def agregar_insumos(self, proceso_menor: str, insumos: Iterable[str]) -> None:
        self._fila(proceso_menor).get_by_role("button", name="Agregar Insumo").click()
        self._marcar_y_agregar(insumos)

    def configuracion_inicial(self) -> None:
        base.click_button(self.page, "Configuración Inicial")
        base.confirm_dialog(self.page, "OK")

    def generar_predecesores(self) -> None:
        base.click_button(self.page, "Generar Predecesores")
        base.confirm_dialog(self.page, "OK")

    def establecer_tipo_dato(self, paso: str, tipo_dato: str) -> None:
        fila = self._fila(paso)
        fila.get_by_role("combobox").click()
        self.page.get_by_role("option", name=tipo_dato, exact=True).click()

    def establecer_predecesor(self, paso: str, codigo_paso_predecesor: str) -> None:
        fila = self._fila(paso)
        fila.get_by_role("button", name="Predecesores").click()
        base.fill_field(self.page, "Predecesores", codigo_paso_predecesor)
        self.page.get_by_role("button", name="Guardar (disket)").or_(
            self.page.get_by_role("button", name="Guardar")
        ).click()

    def guardar(self) -> None:
        base.click_button(self.page, "Guardar")

    def _marcar_y_agregar(self, items: Iterable[str]) -> None:
        for item in items:
            self.page.get_by_role("checkbox", name=item).check()
        base.click_button(self.page, "Agregar")
        base.confirm_dialog(self.page, "OK")

    def _fila(self, texto: str) -> Locator:
        return base.row_by_text(self.page, texto)
