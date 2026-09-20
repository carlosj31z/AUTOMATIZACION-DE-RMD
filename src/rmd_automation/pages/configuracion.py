from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from playwright.sync_api import Locator, Page

from . import base


@dataclass
class ConfiguracionFiltro:
    codigo_rmd: Optional[str] = None
    descripcion: Optional[str] = None
    estado_proceso: Optional[str] = None
    codigo_agrupador: Optional[str] = None
    codigo_material: Optional[str] = None
    planta: Optional[str] = None
    area: Optional[str] = None
    etapa: Optional[str] = None
    estado_rmd: Optional[str] = None


class ConfiguracionPage:
    """Página 'Configuración RMD' (manual RMD, sección 3).

    La app vive dentro de un iframe del Launchpad; `self.app` es su FrameLocator.
    Las acciones por fila (Ver master, Configurar el RMD, ...) están en un
    MenuButton dividido ("Seleccionar" + flecha "Abrir menú"), no en un combobox.
    """

    def __init__(self, page: Page):
        self.page = page
        self.app = base.app_root(page)

    def abrir(self) -> None:
        # La URL del Launchpad (#configuracion-display) ya abre la app; solo se espera al iframe.
        base.esperar_app(self.page)

    def filtrar(self, filtro: ConfiguracionFiltro) -> None:
        # Labels reales (sin tilde en "Codigo RMD" y "Area"; "Estado del RMD").
        if filtro.codigo_rmd:
            base.fill_field(self.app, "Codigo RMD", filtro.codigo_rmd)
        if filtro.descripcion:
            base.fill_field(self.app, "Descripción", filtro.descripcion)
        if filtro.codigo_agrupador:
            base.fill_field(self.app, "Código Agrupador", filtro.codigo_agrupador)
        if filtro.codigo_material:
            base.fill_field(self.app, "Código Material", filtro.codigo_material)
        if filtro.estado_proceso:
            base.select_dropdown(self.app, "Estado Proceso", filtro.estado_proceso)
        if filtro.planta:
            base.select_dropdown(self.app, "Planta", filtro.planta)
        if filtro.area:
            base.select_dropdown(self.app, "Area", filtro.area)
        if filtro.etapa:
            base.select_dropdown(self.app, "Etapa", filtro.etapa)
        if filtro.estado_rmd:
            base.select_dropdown(self.app, "Estado del RMD", filtro.estado_rmd)
        base.click_ir(self.app)

    def exportar_master(self, descripcion_producto: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_producto))
        self.elegir_accion("Descargar master")

    def ver_op(self, descripcion_rmd: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_rmd))
        self.elegir_accion("Ver OP")

    def desasociar_op(self, descripcion_rmd: str) -> None:
        # No verificado en vivo: el botón y la confirmación se tomaron del manual.
        self.ver_op(descripcion_rmd)
        base.click_button(base.dialogo_activo(self.app), "Desasociar OP")
        base.confirm_dialog(self.app, "OK")

    def agregar_documento(self, descripcion_producto: str, ruta_archivo: str) -> None:
        # "Agregar Documento" es una opción del menú de Acción de la fila (verificado).
        # El diálogo de carga en sí no se abrió durante la validación (es una escritura).
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_producto))
        self.elegir_accion("Agregar Documento")
        # Verificado: diálogo "Agregar Documentos al RMD: ..." con <input type=file> ("Examinar...")
        # y botones Guardar/Cerrar; el mensaje de éxito posterior no se capturó.
        dlg = base.dialogo_activo(self.app)
        dlg.locator("input[type=file]").set_input_files(ruta_archivo)
        base.click_button(dlg, "Guardar")
        base.confirmar_si_aparece(self.app, "OK")

    def agregar_nota_importante(self, descripcion_producto: str, nota: str) -> None:
        # Verificado: "Ver Notas Importantes RMD" -> "Agregar Nota Importante" -> "Ingresar Nota
        # Importante" (textarea con placeholder, sin label) -> Confirmar; se guarda sin confirmación.
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_producto))
        self.elegir_accion("Notas Importantes")
        base.click_button(base.dialogo_activo(self.app), "Agregar Nota Importante")
        dlg = base.dialogo_activo(self.app)
        dlg.get_by_placeholder("Ingrese una nota importante").fill(nota)
        base.click_button(dlg, "Confirmar")
        base.click_button(base.dialogo_activo(self.app), "Cerrar")

    def ver_trazabilidad(self, descripcion_master: str) -> None:
        self.filtrar(ConfiguracionFiltro(descripcion=descripcion_master))
        self.elegir_accion("Trazabilidad RMD")

    def crear_rmd(
        self,
        asociar_solicitud: str,
        descripcion: str,
        etapa: str,
        planta: str,
        motivo: str,
        area_solicitante: str,
    ) -> None:
        # Manual 5.1: botón "Nuevo RMD" de la barra de la tabla -> diálogo "Generar nuevo RMD"
        # (verificado: Asociar Solicitud, Descripción RMD, Etapa, Planta, Motivo, Área
        # Solicitante; Confirmar/Cancelar; sin adjunto). Tras Confirmar, el manual indica un
        # aviso "¿está seguro...?" (OK) y un mensaje "Se registró exitosamente la Manufactura
        # Digital" (OK): esos dos pasos no se ejecutaron en la validación.
        base.click_button(self.app, "Nuevo RMD")
        dlg = base.dialogo_activo(self.app)
        base.select_dropdown(dlg, "Asociar Solicitud", asociar_solicitud, root=self.app)
        base.fill_field(dlg, "Descripción RMD", descripcion)
        base.select_dropdown(dlg, "Etapa", etapa, root=self.app)
        base.select_dropdown(dlg, "Planta", planta, root=self.app)
        base.select_dropdown(dlg, "Motivo", motivo, root=self.app)
        base.select_dropdown(dlg, "Área Solicitante", area_solicitante, root=self.app)
        base.click_button(dlg, "Confirmar")
        base.confirm_dialog(self.app, "OK")  # advertencia de confirmación
        self.page.wait_for_timeout(500)
        base.confirmar_si_aparece(self.app, "OK")  # mensaje de éxito

    def asociar_formulas(
        self, codigo_rmd: str, recetas: "list[str]", codigo: str = "", descripcion: str = "", variante: str = ""
    ) -> None:
        # Manual 5.4 (verificado hasta el selector): acción de fila "Asociar fórmulas" -> "Asociar
        # Fórmula: <RMD>" (Recetas Asociadas (n), "Agregar Producto", Guardar/Cancelar) -> selector
        # "Asociar Recetas al RM" con filtros Código, Descripción, Variante + Ir y casillas ->
        # Agregar -> OK -> éxito -> Guardar en el formulario principal.
        self.filtrar(ConfiguracionFiltro(codigo_rmd=codigo_rmd))
        self.elegir_accion("Asociar fórmulas")
        base.click_button(base.dialogo_activo(self.app), "Agregar Producto")
        picker = base.dialogo_activo(self.app)
        if codigo:
            base.fill_field(picker, "Código", codigo)
        if descripcion:
            base.fill_field(picker, "Descripción", descripcion)
        if variante:
            base.fill_field(picker, "Variante", variante)
        base.click_ir(picker)
        for receta in recetas:
            base.row_by_text(picker, receta).first.get_by_role("checkbox").first.check()
        base.click_button(picker, "Agregar")
        base.confirmar_si_aparece(self.app, "OK")
        self.page.wait_for_timeout(500)
        base.confirmar_si_aparece(self.app, "OK", timeout_ms=10000)
        base.click_button(base.dialogo_activo(self.app), "Guardar")

    def abrir_configuracion_maestra(self) -> None:
        # Botón "Configurar" de la barra de la tabla principal -> diálogo "Configuracion Maestra".
        base.click_button(self.app, "Configurar")

    def configurar_rmd(self, codigo_rmd: str) -> None:
        # Menú de Acción de la fila -> "Configurar el RMD" -> diálogo "<código> - <descripción>".
        self.filtrar(ConfiguracionFiltro(codigo_rmd=codigo_rmd))
        self.elegir_accion("Configurar el RMD")

    def elegir_accion(self, accion: str, fila: Optional[Locator] = None) -> None:
        """Abre el menú de Acción de una fila (por defecto la primera) y elige `accion`.

        Opciones reales: Ver master, Descargar master, Agregar Documento, Ver OP,
        Asociar fórmulas, Configurar el RMD, Trazabilidad RMD, Notas Importantes.
        """
        fila = fila or self.app.locator("tbody tr").filter(visible=True).first
        fila.get_by_role("button", name="Abrir menú").click()
        self.app.get_by_role("menuitem", name=accion, exact=True).click()
