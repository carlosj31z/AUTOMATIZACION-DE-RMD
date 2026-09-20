from __future__ import annotations

from playwright.sync_api import Locator, Page

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


def fill_field(page: Page, label: str, value: str) -> None:
    page.get_by_label(label).fill(value)


def select_dropdown(page: Page, label: str, option: str) -> None:
    page.get_by_label(label).click()
    page.get_by_role("option", name=option, exact=True).click()


def row_by_text(page: Page, text: str) -> Locator:
    return page.get_by_role("row", name=text)
