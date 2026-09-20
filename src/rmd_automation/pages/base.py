from __future__ import annotations

import re
from typing import Optional, Union

from playwright.sync_api import FrameLocator, Locator, Page
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

Scope = Union[FrameLocator, Locator]

# Helpers genéricos para los controles SAPUI5 (Fiori) de RMD.
#
# Verificado en vivo contra el portal real (ver README, "Validación de
# selectores"):
#  - La app "Configuración" corre dentro de un <iframe> (ui5appruntime.html)
#    del Fiori Launchpad, así que todo locator debe colgar de `app_root(page)`
#    (un FrameLocator), no de `page`. Los diálogos/menús/popovers de UI5 se
#    montan dentro de ese mismo iframe.
#  - Los ComboBox de UI5 NO se abren al hacer clic en el input: hay que pulsar
#    su flecha ("Opciones de selección").
#  - Los botones "Ir" se llaman "Ir" (no "IR"), y los SI/NO son role="switch".
#  - Un diálogo abierto sobre la pantalla principal deja la pantalla en el DOM,
#    con labels repetidos ("Descripción"), así que dentro de un diálogo siempre
#    hay que acotar con `dialogo_activo(...)`.

APP_IFRAME = "iframe[src*='ui5appruntime']"


def app_root(page: Page) -> FrameLocator:
    return page.frame_locator(APP_IFRAME)


def esperar_app(page: Page) -> None:
    """Espera a que la app Configuración termine de cargar dentro del iframe."""
    app_root(page).get_by_role("button", name="Ir", exact=True).first.wait_for()


def dialogo_activo(root: Scope) -> Locator:
    """Último diálogo abierto (el que está encima)."""
    return root.get_by_role("dialog").last


def click_ir(scope: Scope) -> None:
    scope.get_by_role("button", name="Ir", exact=True).filter(visible=True).first.click()


def confirm_dialog(scope: Scope, boton: str = "OK") -> None:
    scope.get_by_role("button", name=boton, exact=True).last.click()


def confirmar_si_aparece(scope: Scope, boton: str = "OK", timeout_ms: int = 3000) -> None:
    """Pulsa el botón de un diálogo de confirmación que no siempre se muestra."""
    try:
        scope.get_by_role("button", name=boton, exact=True).last.click(timeout=timeout_ms)
    except PlaywrightTimeoutError:
        pass


def click_button(scope: Scope, name: str, exact: bool = True) -> None:
    scope.get_by_role("button", name=name, exact=exact).filter(visible=True).first.click()


def fill_field(scope: Scope, label: str, value: str) -> None:
    scope.get_by_label(label, exact=True).filter(visible=True).first.fill(value)


def select_dropdown(scope: Scope, label: str, option: str, root: Optional[Scope] = None) -> None:
    """Elige `option` en el ComboBox `label` (abre con la flecha, no con el input).

    `scope` acota dónde buscar el campo (diálogo, fila); `root` es donde vive el
    popover de opciones (el iframe completo). Si no se pasa, se usa `scope`.
    """
    combo = scope.get_by_label(label, exact=True).filter(visible=True).first
    combo.locator("xpath=ancestor::div[contains(@class,'sapMComboBox')][1]").get_by_role(
        "button", name="Opciones de selección"
    ).click()
    (root or scope).get_by_role("option", name=option).filter(visible=True).first.click()


def set_switch(scope: Scope, label: str, activo: bool) -> None:
    """Deja un sap.m.Switch (SI/NO) en el estado pedido."""
    sw = scope.get_by_role("switch", name=label).filter(visible=True).first
    if (sw.get_attribute("aria-checked") == "true") != activo:
        sw.click()


def row_by_text(scope: Scope, text: str) -> Locator:
    return scope.get_by_role("row", name=text).filter(visible=True)


def tab(scope: Scope, nombre: str) -> Locator:
    # El nombre accesible de cada tab lleva un prefijo del ícono/estado
    # ("Positivo Estructura", "Neutro Etiqueta", ...): se acota por sufijo.
    return scope.get_by_role("tab", name=re.compile(rf"(^|\s){re.escape(nombre)}$"))
