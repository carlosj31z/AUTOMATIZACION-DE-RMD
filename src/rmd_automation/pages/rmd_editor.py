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

    def marcar_paso_op_opcional(self, paso: str) -> None:
        # Manual 7.3: columna PM/OP en documentación/preparación de máquinas/material/fabricación.
        self._fila(paso).get_by_role("checkbox", name="PM/OP").check()

    def marcar_control_calidad(self, paso: str) -> None:
        # Manual 7.4: columna "Estado CC", aplica también a pasos menores.
        self._fila(paso).get_by_role("checkbox", name="Estado CC").check()

    def establecer_paso_numero(self, paso: str, decimales: int) -> None:
        # Manual 7.6.1: paso complejo tipo Número.
        self.establecer_tipo_dato(paso, "Número")
        base.fill_field(self._fila(paso), "Decimales", str(decimales))
        self.guardar()

    def establecer_paso_rango(
        self, paso: str, valor_inicial: float, valor_final: float, margen: float, decimales: int
    ) -> None:
        # Manual 7.6.2: paso complejo tipo Rango.
        self.establecer_tipo_dato(paso, "Rango")
        fila = self._fila(paso)
        base.fill_field(fila, "Valor Inicial", str(valor_inicial))
        base.fill_field(fila, "Valor Final", str(valor_final))
        base.fill_field(fila, "Margen", str(margen))
        base.fill_field(fila, "Decimales", str(decimales))
        self.guardar()

    def establecer_paso_formula(self, paso: str, decimales: int, pasos_formula: Iterable[str]) -> None:
        # Manual 7.6.3: paso complejo tipo Fórmula (icono de matraz para elegir los pasos que la componen).
        self.establecer_tipo_dato(paso, "Fórmula")
        fila = self._fila(paso)
        base.fill_field(fila, "Decimales", str(decimales))
        fila.get_by_role("button", name="Fórmula").click()
        for paso_formula in pasos_formula:
            self.page.get_by_role("checkbox", name=paso_formula).check()
        self.guardar()

    def configurar_notificacion(self, etiqueta: str, clave_modelo: str, puesto_trabajo: str) -> None:
        # Manual 7.6.4: notificación (Setup Pre Proceso / Proceso / Setup Post Proceso) por etiqueta.
        self._fila(etiqueta).get_by_role("button", name="Editar").click()
        self.establecer_tipo_dato(etiqueta, "Notificación")
        base.select_dropdown(self.page, "Clave Modelo", clave_modelo)
        base.select_dropdown(self.page, "Puesto de Trabajo", puesto_trabajo)
        self.guardar()

    def guardar(self) -> None:
        base.click_button(self.page, "Guardar")

    def _marcar_y_agregar(self, items: Iterable[str]) -> None:
        for item in items:
            self.page.get_by_role("checkbox", name=item).check()
        base.click_button(self.page, "Agregar")
        base.confirm_dialog(self.page, "OK")

    def _fila(self, texto: str) -> Locator:
        return base.row_by_text(self.page, texto)
