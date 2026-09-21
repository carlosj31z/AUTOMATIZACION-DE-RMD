from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from playwright.sync_api import Page, sync_playwright

from .config import RMDConfig


@contextmanager
def rmd_session(config: RMDConfig) -> Iterator[Page]:
    """Abre un navegador, inicia sesión en el Fiori Launchpad de RMD y entrega la página autenticada."""
    if config.cdp_url:
        yield from _sesion_cdp(config)
        return
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=config.headless)
        context = browser.new_context()
        context.set_default_timeout(config.default_timeout_ms)
        page = context.new_page()
        try:
            if config.login_manual:
                _esperar_login_manual(page, config)
            else:
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


def _esperar_login_manual(page: Page, config: RMDConfig, espera_ms: int = 300_000) -> None:
    """Abre el portal y espera a que UNA PERSONA inicie sesión en la ventana.

    El programa no lee ni escribe credenciales: solo espera a que aparezca la app Configuración
    (el iframe de UI5) y a que la pantalla principal esté lista.
    """
    print("Inicia sesión en la ventana del navegador (tienes 5 minutos)…", flush=True)
    page.goto(config.launchpad_url)
    page.wait_for_selector("iframe[src*='ui5appruntime']", timeout=espera_ms)
    page.frame_locator("iframe[src*='ui5appruntime']").get_by_role("button", name="Ir", exact=True).first.wait_for(
        timeout=espera_ms
    )


def _sesion_cdp(config: RMDConfig) -> Iterator[Page]:
    """Se conecta a un Chromium ya abierto (--remote-debugging-port) donde la persona ya inició sesión.

    Sirve para varias corridas seguidas sin volver a iniciar sesión. No se cierra el navegador al terminar.
    """
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(config.cdp_url)
        context = browser.contexts[0]
        context.set_default_timeout(config.default_timeout_ms)
        page = next((p for p in context.pages if "ui5appruntime" in "".join(f.url for f in p.frames)), None)
        if page is None:
            page = context.pages[0] if context.pages else context.new_page()
            page.goto(config.launchpad_url)
        page.frame_locator("iframe[src*='ui5appruntime']").get_by_role("button", name="Ir", exact=True).first.wait_for(
            timeout=120_000
        )
        # No se llama a browser.close(): en una conexión CDP cerraría el Chromium de la persona.
        # Al salir del `with sync_playwright()` solo se corta la conexión.
        yield page
