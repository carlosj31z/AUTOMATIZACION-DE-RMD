from __future__ import annotations

from typing import Iterable

from playwright.sync_api import Locator, Page

from . import base


class RmdEditor:
    """Acciones dentro del diálogo 'Configurar el RMD' (manual RMD, secciones 5 a 7).

    Verificado en vivo (solo lectura):
      - El diálogo se titula "<código> - <descripción>" y muestra "Estructura de
        RMD (n)": tabla Orden/Descripción/Código/Items/Repite/Num./Acc. Barra de
        botones con tooltip: Comparar versiones, Nueva Versión, Copiar a RMD,
        Copiar de RMD, Imprimir, Exportar Configuración, Generar Predecesores,
        Actualizar RMD en Línea, Configuración Inicial y "Agregar Estructura" (+).
      - Los botones por fila dependen del tipo de estructura: "Adicionar Pasos
        RMD", "Adicionar Etiqueta", "Adicionar Equipo", "Adicionar
        Especificaciones" y siempre "Eliminar Estructura".
      - "Agregar Estructura" abre un selector "Adicionar Estructura al RMD: ..."
        con campo "Buscar" + "Ir" y una tabla con casillas de selección; botones
        Agregar/Cancelar. Las casillas se llaman "Selección de elementos" (sin
        el texto de la fila), por eso se marcan filtrando la fila.
      - "Adicionar Pasos RMD" abre un diálogo "Pasos (n)" con tabla editable
        (Orden, Depende, Código, Descripción, Tipo Dato, Val. Inicial, Val.
        Final, Margen, Decimal, Estado CC, Estado Mov., Formato, Imagen, Estado)
        y botones Imprimir/Agregar/Guardar/Eliminar.
    Lo demás (pasos menores, insumos, confirmaciones tras Agregar, selectores
    de etiquetas/equipos/fórmulas) NO se abrió por ser flujos de escritura.
    """

    def __init__(self, page: Page):
        self.page = page
        self.app = base.app_root(page)

    @property
    def _dlg(self) -> Locator:
        return base.dialogo_activo(self.app)

    def agregar_estructuras(self, estructuras: Iterable[str]) -> None:
        base.click_button(self._dlg, "Agregar Estructura")
        self._marcar_y_agregar(estructuras)

    def agregar_etiquetas(self, estructura: str, etiquetas: Iterable[str]) -> None:
        self._fila(estructura).get_by_role("button", name="Adicionar Etiqueta").click()
        self._marcar_y_agregar(etiquetas)

    def asociar_formulas(self, codigo_o_descripcion: str, recetas: Iterable[str]) -> None:
        # Sin verificar: en la pantalla principal existe la acción de fila "Asociar fórmulas".
        base.click_button(self._dlg, "Agregar Producto")
        base.fill_field(self._dlg, "Código y/o Descripción y/o Variante", codigo_o_descripcion)
        base.click_ir(self._dlg)
        self._marcar_y_agregar(recetas)
        base.click_button(self._dlg, "Guardar")

    def agregar_equipos(self, estructura: str, equipos: Iterable[str]) -> None:
        self._fila(estructura).get_by_role("button", name="Adicionar Equipo").click()
        self._marcar_y_agregar(equipos)

    def agregar_pasos(self, estructura: str, pasos: Iterable[str]) -> None:
        # Fila de la estructura -> "Adicionar Pasos RMD" -> diálogo "Pasos (n)" -> "Agregar" -> selector.
        self._fila(estructura).get_by_role("button", name="Adicionar Pasos RMD").click()
        base.click_button(self._dlg, "Agregar")
        self._marcar_y_agregar(pasos)

    def agregar_procesos_menores(self, paso: str, procesos_menores: Iterable[str]) -> None:
        # Sin verificar (los pasos menores no se abrieron en la validación).
        self._fila(paso).get_by_role("button", name="Procesos Menores").click()
        base.click_button(self._dlg, "Agregar Pasos Menores")
        self._marcar_y_agregar(procesos_menores)

    def agregar_insumos(self, proceso_menor: str, insumos: Iterable[str]) -> None:
        # Sin verificar.
        self._fila(proceso_menor).get_by_role("button", name="Agregar Insumo").click()
        self._marcar_y_agregar(insumos)

    def configuracion_inicial(self) -> None:
        base.click_button(self._dlg, "Configuración Inicial")
        base.confirm_dialog(self.app, "OK")

    def generar_predecesores(self) -> None:
        base.click_button(self._dlg, "Generar Predecesores")
        base.confirm_dialog(self.app, "OK")

    def establecer_tipo_dato(self, paso: str, tipo_dato: str) -> None:
        # Columna "Tipo Dato" de la tabla del diálogo "Pasos (n)" (ComboBox).
        base.select_dropdown(self._fila(paso), "Tipo Dato", tipo_dato, root=self.app)

    def establecer_predecesor(self, paso: str, codigo_paso_predecesor: str) -> None:
        # Columna "Depende" de la tabla de pasos.
        base.fill_field(self._fila(paso), "Depende", codigo_paso_predecesor)
        self.guardar()

    def marcar_paso_op_opcional(self, paso: str) -> None:
        # Manual 7.3 (columna PM/OP). Sin verificar: no hay columna "PM/OP" en la tabla observada.
        self._fila(paso).get_by_role("checkbox", name="PM/OP").check()

    def marcar_control_calidad(self, paso: str) -> None:
        # Manual 7.4: columna "Estado CC" (verificada), aplica también a pasos menores.
        self._fila(paso).get_by_role("checkbox", name="Estado CC").check()

    def establecer_paso_numero(self, paso: str, decimales: int) -> None:
        # Manual 7.6.1: paso complejo tipo Número.
        self.establecer_tipo_dato(paso, "Número")
        base.fill_field(self._fila(paso), "Decimal", str(decimales))
        self.guardar()

    def establecer_paso_rango(
        self, paso: str, valor_inicial: float, valor_final: float, margen: float, decimales: int
    ) -> None:
        # Manual 7.6.2: paso complejo tipo Rango. Columnas reales: Val. Inicial, Val. Final, Margen, Decimal.
        self.establecer_tipo_dato(paso, "Rango")
        fila = self._fila(paso)
        base.fill_field(fila, "Val. Inicial", str(valor_inicial))
        base.fill_field(fila, "Val. Final", str(valor_final))
        base.fill_field(fila, "Margen", str(margen))
        base.fill_field(fila, "Decimal", str(decimales))
        self.guardar()

    def establecer_paso_formula(self, paso: str, decimales: int, pasos_formula: Iterable[str]) -> None:
        # Manual 7.6.3: paso complejo tipo Fórmula (icono de matraz para elegir los pasos que la componen).
        self.establecer_tipo_dato(paso, "Fórmula")
        fila = self._fila(paso)
        base.fill_field(fila, "Decimal", str(decimales))
        fila.get_by_role("button", name="Fórmula").click()
        for paso_formula in pasos_formula:
            self._casilla_de_fila(paso_formula).check()
        self.guardar()

    def configurar_notificacion(self, etiqueta: str, clave_modelo: str, puesto_trabajo: str) -> None:
        # Manual 7.6.4: notificación por etiqueta. En el alta de pasos existe el campo "Clave Modelo".
        self._fila(etiqueta).get_by_role("button", name="Editar").click()
        self.establecer_tipo_dato(etiqueta, "Notificación")
        base.select_dropdown(self._dlg, "Clave Modelo", clave_modelo, root=self.app)
        base.select_dropdown(self._dlg, "Puesto de Trabajo", puesto_trabajo, root=self.app)
        self.guardar()

    def guardar(self) -> None:
        base.click_button(self._dlg, "Guardar")

    def _marcar_y_agregar(self, items: Iterable[str]) -> None:
        picker = self._dlg
        buscar = picker.get_by_label("Buscar", exact=True)
        for item in items:
            if buscar.count():
                buscar.first.fill(item)
                base.click_ir(picker)
            self._casilla_de_fila(item, picker).check()
        base.click_button(picker, "Agregar")
        base.confirmar_si_aparece(self.app, "OK")

    def _casilla_de_fila(self, texto: str, scope: Locator | None = None) -> Locator:
        # Las casillas de selección de UI5 se llaman "Selección de elementos": se ubican por su fila.
        return base.row_by_text(scope or self._dlg, texto).first.get_by_role("checkbox").first

    def _fila(self, texto: str) -> Locator:
        return base.row_by_text(self._dlg, texto).first
