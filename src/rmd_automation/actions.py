from __future__ import annotations

from typing import Callable, TypeVar

from playwright.sync_api import Page

from .browser import rmd_session
from .config import load_config
from .pages.configuracion import ConfiguracionPage
from .pages.configuracion_maestra import ConfiguracionMaestraPage
from .pages.flujo_aprobacion import FlujoAprobacionPage
from .pages.rmd_editor import RmdEditor
from .pages.solicitud import SolicitudPage

T = TypeVar("T")


class RmdAutomation:
    """Fachada de alto nivel que agrupa las páginas de RMD para la CLI y batch.py."""

    def __init__(self, page: Page):
        self.page = page
        self.configuracion = ConfiguracionPage(page)
        self.configuracion_maestra = ConfiguracionMaestraPage(page)
        self.flujo_aprobacion = FlujoAprobacionPage(page)
        self.solicitud = SolicitudPage(page)

    def editor_de_rmd(self, codigo_rmd: str) -> RmdEditor:
        self.configuracion.configurar_rmd(codigo_rmd)
        return RmdEditor(self.page)


def run(callback: Callable[[RmdAutomation], T]) -> T:
    """Abre una sesión autenticada contra el Fiori Launchpad y ejecuta `callback`."""
    config = load_config()
    with rmd_session(config) as page:
        automation = RmdAutomation(page)
        return callback(automation)
