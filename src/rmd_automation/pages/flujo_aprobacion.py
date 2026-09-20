from __future__ import annotations

from typing import Iterable, Optional

from playwright.sync_api import Page

from . import base


class FlujoAprobacionPage:
    """Envío a jefe, cambio de destinatarios y autorización de RMD (manual RMD, sección 8)."""

    def __init__(self, page: Page):
        self.page = page

    def enviar_a_jefe(
        self,
        descripcion_rmd: str,
        destinatario_principal: str,
        mensaje: str,
        ruta_pdf: str,
        destinatarios_adicionales: Optional[Iterable[str]] = None,
    ) -> None:
        base.fill_field(self.page, "Descripción", descripcion_rmd)
        base.click_ir(self.page)
        base.click_button(self.page, "Enviar")
        base.select_dropdown(self.page, "Destinatarios", destinatario_principal)
        for adicional in destinatarios_adicionales or []:
            base.select_dropdown(self.page, "Destinatarios adicionales", adicional)
        base.fill_field(self.page, "Mensaje de Documentación Técnica", mensaje)
        with self.page.expect_file_chooser() as fc_info:
            self.page.get_by_role("button", name="Navegar").click()
        fc_info.value.set_files(ruta_pdf)
        base.click_button(self.page, "Enviar")
        base.confirm_dialog(self.page, "SI")
        base.confirm_dialog(self.page, "OK")

    def cambiar_destinatario(self, codigo_producto: str, nuevo_destinatario: str) -> None:
        base.fill_field(self.page, "Descripción", codigo_producto)
        base.click_ir(self.page)
        base.click_button(self.page, "Cambiar destinatario")
        base.select_dropdown(self.page, "Destinatario", nuevo_destinatario)
        base.click_button(self.page, "Guardar")
        base.confirm_dialog(self.page, "SI")

    def rechazar_solicitud(self, codigo_solicitud: str, motivo: str) -> None:
        base.fill_field(self.page, "Código de solicitud", codigo_solicitud)
        base.click_ir(self.page)
        base.click_button(self.page, "Rechazar")
        base.fill_field(self.page, "Motivo de Rechazo", motivo)
        base.click_button(self.page, "Rechazar")
        base.confirm_dialog(self.page, "OK")

    def autorizar(self, descripcion_rmd: str) -> None:
        base.fill_field(self.page, "Descripción", descripcion_rmd)
        base.click_ir(self.page)
        base.click_button(self.page, "Asociar Fórmulas")
        base.select_dropdown(self.page, "Estado", "Autorizado")
        base.click_button(self.page, "Guardar")
        base.click_button(self.page, "Confirmar")
        base.confirm_dialog(self.page, "OK")
