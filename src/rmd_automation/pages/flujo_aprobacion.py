from __future__ import annotations

from typing import Iterable, Optional

from playwright.sync_api import Page

from . import base
from .configuracion import ConfiguracionFiltro, ConfiguracionPage


class FlujoAprobacionPage:
    """Envío a jefe, cambio de destinatarios y autorización de RMD (manual RMD, sección 8).

    Verificado en vivo: cada fila de la pantalla principal expone botones de
    icono con tooltip — "Enviar" (RMD pendientes), "Cambiar destinatario" y
    "Flujo de Aprobación" (RMD ya enviados; este último solo muestra el diálogo
    de solo lectura "Estatus de producción"). "Enviar" abre primero un diálogo
    "Editar RM" (Código Web, Descripción RMD, Etapa, Planta, Fecha de Solicitud,
    Motivo, Área Solicitante) con Confirmar/Cancelar. Los pasos posteriores
    (destinatarios, mensaje, PDF, autorización) NO se pudieron verificar sin
    ejecutar una escritura real y siguen basados en el manual.
    """

    def __init__(self, page: Page):
        self.page = page
        self.app = base.app_root(page)
        self._configuracion = ConfiguracionPage(page)

    def _fila_filtrada(self, texto: str):
        self._configuracion.filtrar(ConfiguracionFiltro(descripcion=texto))
        return self.app.locator("tbody tr").filter(visible=True).first

    def enviar_a_jefe(
        self,
        descripcion_rmd: str,
        destinatario_principal: str,
        mensaje: str,
        ruta_pdf: str,
        destinatarios_adicionales: Optional[Iterable[str]] = None,
    ) -> None:
        fila = self._fila_filtrada(descripcion_rmd)
        base.click_button(fila, "Enviar")
        base.click_button(base.dialogo_activo(self.app), "Confirmar")  # diálogo "Editar RM"
        dlg = base.dialogo_activo(self.app)
        base.select_dropdown(dlg, "Destinatarios", destinatario_principal, root=self.app)
        for adicional in destinatarios_adicionales or []:
            base.select_dropdown(dlg, "Destinatarios adicionales", adicional, root=self.app)
        base.fill_field(dlg, "Mensaje de Documentación Técnica", mensaje)
        with self.page.expect_file_chooser() as fc_info:
            base.click_button(dlg, "Navegar")
        fc_info.value.set_files(ruta_pdf)
        base.click_button(dlg, "Enviar")
        base.confirm_dialog(self.app, "SI")
        base.confirm_dialog(self.app, "OK")

    def cambiar_destinatario(self, codigo_producto: str, nuevo_destinatario: str) -> None:
        fila = self._fila_filtrada(codigo_producto)
        base.click_button(fila, "Cambiar destinatario")
        dlg = base.dialogo_activo(self.app)
        base.select_dropdown(dlg, "Destinatario", nuevo_destinatario, root=self.app)
        base.click_button(dlg, "Guardar")
        base.confirm_dialog(self.app, "SI")

    def autorizar(self, descripcion_rmd: str) -> None:
        # "Asociar fórmulas" es una opción del menú de Acción de la fila (verificado);
        # el diálogo posterior (Estado -> Autorizado) no se abrió en la validación.
        self._fila_filtrada(descripcion_rmd)
        self._configuracion.elegir_accion("Asociar fórmulas")
        dlg = base.dialogo_activo(self.app)
        base.select_dropdown(dlg, "Estado", "Autorizado", root=self.app)
        base.click_button(dlg, "Guardar")
        base.click_button(self.app, "Confirmar")
        base.confirm_dialog(self.app, "OK")
