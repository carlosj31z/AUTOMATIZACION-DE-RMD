from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from playwright.sync_api import Page

from . import base


@dataclass
class SolicitudFiltro:
    estado_solicitud: Optional[str] = None
    codigo_solicitud: Optional[str] = None


class SolicitudPage:
    """Página 'Solicitud' (manual RMD, sección 2).

    SIN VERIFICAR en vivo: la validación se hizo sobre la app "Configuración",
    donde no apareció un selector de "Aplicación"/"Solicitud"; sí existe un
    botón "Nuevo RMD" en la barra de la tabla principal y un diálogo "Editar RM"
    (Código Web, Código de Solicitud, Descripción RMD, Etapa, Planta, Fecha de
    Solicitud, Motivo, Área Solicitante; Confirmar/Cancelar). Revisar este
    módulo contra la pantalla de Solicitud real antes de usarlo.
    """

    def __init__(self, page: Page):
        self.page = page
        self.app = base.app_root(page)

    def abrir(self) -> None:
        # Manual 2.1: en el desplegable de aplicación seleccionar "Solicitud" y presionar IR.
        base.select_dropdown(self.app, "Aplicación", "Solicitud")
        base.click_ir(self.app)

    def filtrar(self, filtro: SolicitudFiltro) -> None:
        if filtro.codigo_solicitud:
            base.fill_field(self.app, "Código de solicitud", filtro.codigo_solicitud)
        if filtro.estado_solicitud:
            base.select_dropdown(self.app, "Estado de Solicitud", filtro.estado_solicitud)
        base.click_ir(self.app)

    def generar_nuevo_rmd(
        self,
        descripcion: str,
        etapa: str,
        planta: str,
        motivo: str,
        area_solicitante: str,
        ruta_pdf_referencia: str,
    ) -> None:
        # Manual 2.4: Generar solicitud de nuevo Registro de Manufactura.
        base.click_button(self.app, "Nueva versión")
        self.app.get_by_role("menuitem", name="Nuevo RMD").click()
        base.fill_field(self.app, "Descripción RMD", descripcion)
        base.select_dropdown(self.app, "Etapa", etapa)
        base.select_dropdown(self.app, "Planta", planta)
        base.select_dropdown(self.app, "Motivo", motivo)
        base.select_dropdown(self.app, "Área Solicitante", area_solicitante)
        with self.page.expect_file_chooser() as fc_info:
            base.click_button(self.app, "Navegar")
        fc_info.value.set_files(ruta_pdf_referencia)
        base.click_button(self.app, "Confirmar")

    def generar_nueva_edicion(
        self,
        rmd_origen: str,
        etapa: str,
        planta: str,
        motivo: str,
        area_solicitante: str,
        ruta_pdf_referencia: str,
    ) -> None:
        # Manual 2.5: Generar solicitud de nueva edición de Registro de Manufactura.
        base.click_button(self.app, "Nueva versión")
        self.app.get_by_role("menuitem", name="Nueva versión", exact=True).click()
        base.select_dropdown(self.app, "Asociar Solicitud", rmd_origen)
        base.select_dropdown(self.app, "Etapa", etapa)
        base.select_dropdown(self.app, "Planta", planta)
        base.select_dropdown(self.app, "Motivo", motivo)
        base.select_dropdown(self.app, "Área Solicitante", area_solicitante)
        with self.page.expect_file_chooser() as fc_info:
            base.click_button(self.app, "Navegar")
        fc_info.value.set_files(ruta_pdf_referencia)
        base.click_button(self.app, "Confirmar")
        base.confirm_dialog(self.app, "SI")
        base.confirm_dialog(self.app, "OK")

    def aprobar(self, codigo_solicitud: str) -> None:
        # Manual 2.6: Aprobación de una solicitud.
        self.filtrar(SolicitudFiltro(codigo_solicitud=codigo_solicitud))
        self.app.get_by_role("row", name=codigo_solicitud).dblclick()
        base.click_button(self.app, "Aprobar")
        base.confirm_dialog(self.app, "SI")
        base.confirm_dialog(self.app, "OK")

    def rechazar(self, codigo_solicitud: str, motivo_rechazo: str) -> None:
        # Manual 2.7: Rechazo de una solicitud.
        self.filtrar(SolicitudFiltro(codigo_solicitud=codigo_solicitud))
        base.click_button(self.app, "Rechazar")
        base.fill_field(self.app, "Motivo de Rechazo", motivo_rechazo)
        base.click_button(self.app, "Rechazar")
        base.confirm_dialog(self.app, "OK")
