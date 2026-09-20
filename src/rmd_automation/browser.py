from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from playwright.sync_api import Page, sync_playwright

from .config import RMDConfig


@contextmanager
def rmd_session(config: RMDConfig) -> Iterator[Page]:
    """Abre un navegador, inicia sesión en el Fiori Launchpad de RMD y entrega la página autenticada."""
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=config.headless)
        context = browser.new_context()
        context.set_default_timeout(config.default_timeout_ms)
        page = context.new_page()
        try:
            _login(page, config)
            yield page
        finally:
            browser.close()


def _login(page: Page, config: RMDConfig) -> None:
    """Inicia sesión vía SAP Identity Authentication Service (IAS).

    El manual RMD indica: "Ingresar al SAP S/4 HANA PRD, colocar usuario y
    contraseña y presionar Iniciar sesión". Los campos exactos del formulario
    de IAS (usuario/contraseña, SSO corporativo, MFA) dependen de cómo
    Medifarma lo tenga configurado y no pudieron confirmarse sin acceso al
    entorno real: valida y ajusta estos selectores con Playwright Inspector
    (`playwright codegen <RMD_LAUNCHPAD_URL>`) contra el ambiente DEV/QAS
    antes de usar esto en PRD. Si el tenant exige MFA interactivo, esta
    automatización debe correr con un usuario técnico/de servicio exento de
    MFA, no con la cuenta personal de un usuario.
    """
    page.goto(config.launchpad_url)
    page.get_by_label("Usuario").or_(page.get_by_label("E-mail o teléfono")).fill(config.username)
    page.get_by_role("button", name="Continuar").click()
    page.get_by_label("Contraseña").fill(config.password)
    page.get_by_role("button", name="Iniciar sesión").click()
    page.wait_for_load_state("networkidle")
