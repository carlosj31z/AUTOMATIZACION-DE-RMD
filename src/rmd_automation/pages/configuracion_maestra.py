from __future__ import annotations

from playwright.sync_api import Page

from . import base


class ConfiguracionMaestraPage:
    """Diálogo 'Configuracion Maestra' (manual RMD, sección 4).

    Verificado en vivo: es un diálogo con 6 tabs (Estructura, Etiqueta, Paso,
    Motivo, Utensilios, Motivo de lapsos) que se abre con el botón "Configurar"
    de la pantalla principal. Cada tab tiene su barra de filtros + "Ir", una
    tabla y un botón "Nuevo ..." que abre un diálogo hijo con Agregar/Cancelar.

    Cada método sigue el patrón que describe el manual: primero busca si el
    elemento ya existe por su descripción y, solo si no existe, lo crea. Esto
    hace que las operaciones de "ingreso masivo" sean idempotentes.
    """

    def __init__(self, page: Page):
        self.page = page
        self.app = base.app_root(page)

    @property
    def _maestra(self):
        return base.dialogo_activo(self.app)

    def _existe(self, tab: str, descripcion: str) -> bool:
        base.tab(self._maestra, tab).click()
        base.fill_field(self._maestra, "Descripción", descripcion)
        base.click_ir(self._maestra)
        return base.row_by_text(self._maestra, descripcion).count() > 0

    def _agregar(self) -> None:
        base.click_button(base.dialogo_activo(self.app), "Agregar")

    def crear_estructura(
        self,
        descripcion: str,
        tipo_estructura: str,
        requiere_verificado_por: bool,
        numeracion: bool = False,
    ) -> None:
        if self._existe("Estructura", descripcion):
            return
        base.click_button(self._maestra, "Nueva Estructura")
        form = base.dialogo_activo(self.app)
        base.fill_field(form, "Descripción", descripcion)
        base.set_switch(form, "Numeración", numeracion)
        base.select_dropdown(form, "Tipo de estructura", tipo_estructura, root=self.app)
        base.set_switch(form, "Verificado Por", requiere_verificado_por)
        self._agregar()

    def crear_etiqueta(self, descripcion: str, estructura: str) -> None:
        if self._existe("Etiqueta", descripcion):
            return
        base.click_button(self._maestra, "Nueva Etiqueta")
        form = base.dialogo_activo(self.app)
        base.fill_field(form, "Descripción", descripcion)
        base.select_dropdown(form, "Estructura", estructura, root=self.app)
        self._agregar()

    def crear_paso(self, descripcion: str, estructura: str, etiqueta: str, tipo_dato: str) -> None:
        if self._existe("Paso", descripcion):
            return
        base.click_button(self._maestra, "Nuevo Paso")
        form = base.dialogo_activo(self.app)
        base.fill_field(form, "Descripción Paso", descripcion)
        base.select_dropdown(form, "Estructura", estructura, root=self.app)
        base.select_dropdown(form, "Etiqueta", etiqueta, root=self.app)
        base.select_dropdown(form, "Tipo de Dato (RMD en Linea)", tipo_dato, root=self.app)
        self._agregar()

    def rmd_asociadas_a_paso(self, descripcion_paso: str) -> None:
        base.tab(self._maestra, "Paso").click()
        base.fill_field(self._maestra, "Descripción", descripcion_paso)
        base.click_ir(self._maestra)
        base.click_button(self._maestra, "RMD Asociadas")

    def crear_motivo(self, abreviatura: str, descripcion: str) -> None:
        if self._existe("Motivo", descripcion):
            return
        base.click_button(self._maestra, "Nuevo Motivo")
        form = base.dialogo_activo(self.app)
        base.fill_field(form, "Abreviatura", abreviatura)
        base.fill_field(form, "Descripción", descripcion)
        self._agregar()

    def crear_utensilio(self, codigo: str, descripcion: str, tipo: str) -> None:
        if self._existe("Utensilios", descripcion):
            return
        base.click_button(self._maestra, "Nuevo Equipo/Utensilio")
        form = base.dialogo_activo(self.app)
        base.fill_field(form, "Código", codigo)
        base.fill_field(form, "Descripción", descripcion)
        base.select_dropdown(form, "Tipo", tipo, root=self.app)
        self._agregar()

    def crear_motivo_lapso(self, descripcion: str, tipo: str, es_indicador_notificacion: bool) -> None:
        if self._existe("Motivo de lapsos", descripcion):
            return
        base.click_button(self._maestra, "Nuevo Motivo Lapso")
        form = base.dialogo_activo(self.app)
        base.fill_field(form, "Descripción", descripcion)
        base.select_dropdown(form, "Tipo", tipo, root=self.app)
        base.set_switch(form, "Indicador", es_indicador_notificacion)
        self._agregar()
