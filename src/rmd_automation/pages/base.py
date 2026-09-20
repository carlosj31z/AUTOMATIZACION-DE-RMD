from __future__ import annotations

from typing import Union

from playwright.sync_api import Locator, Page

Scope = Union[Page, Locator]

# Helpers genéricos para los controles SAPUI5 (Fiori) que se repiten en todo
# el manual de RMD: botón "IR" para filtrar, cuadros de diálogo de
# confirmación ("SI"/"OK"), campos de formulario y desplegables.
#
# Se basan en roles ARIA estándar de SAPUI5 (button, option, checkbox, row).
# SAPUI5 no siempre asigna IDs estables, así que estos selectores por
# rol/etiqueta son más robustos que IDs autogenerados, pero deben validarse
# contra el DOM real de RMD (por ejemplo con `playwright codegen`) antes de
# usarse en producción.


def click_ir(page: Page) -> None:
    page.get_by_role("button", name="IR", exact=True).click()


def confirm_dialog(page: Page, boton: str = "OK") -> None:
    page.get_by_role("button", name=boton, exact=True).click()


def click_button(page: Page, name: str) -> None:
    page.get_by_role("button", name=name).click()


def fill_field(scope: Scope, label: str, value: str) -> None:
    scope.get_by_label(label).fill(value)


def select_dropdown(scope: Scope, label: str, option: str) -> None:
    # El popover de opciones de un combobox SAPUI5 se renderiza fuera del
    # nodo del control (a nivel de documento), así que la búsqueda del
    # "option" siempre se hace a nivel de página, aunque `scope` sea un
    # Locator (p.ej. una fila de tabla) que acota solo el campo a abrir.
    scope.get_by_label(label).click()
    owner_page = scope if isinstance(scope, Page) else scope.page
    owner_page.get_by_role("option", name=option, exact=True).click()


def row_by_text(page: Page, text: str) -> Locator:
    return page.get_by_role("row", name=text)
