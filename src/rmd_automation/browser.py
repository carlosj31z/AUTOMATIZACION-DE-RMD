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

    Confirmado navegando (sin credenciales) hasta la pantalla real de login de
    Medifarma: el portal RMD redirige a un Fiori Launchpad en
    `*.cpp.cfapps.us10.hana.ondemand.com`, que a su vez redirige (OAuth2/PKCE)
    a `https://<tenant>.accounts.ondemand.com/oauth2/authorize`, donde SAP IAS
    muestra un único formulario ("SAP BTP subaccount MediFarma-Portal-PRD:
    Sign In") con los campos "Email or User Name" y "Password" en la misma
    pantalla (no en dos pasos) y un botón "Continue". No se observó un paso de
    MFA en el formulario inicial; si el tenant lo exige tras enviar la
    contraseña, esta función no lo maneja — correr con un usuario técnico/de
    servicio exento de MFA, no con la cuenta personal de un usuario.
    """
    page.goto(config.launchpad_url)
    page.get_by_placeholder("Email or User Name").fill(config.username)
    page.get_by_placeholder("Password").fill(config.password)
    page.get_by_role("button", name="Continue").click()
    page.wait_for_load_state("networkidle")
