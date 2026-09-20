from __future__ import annotations

import re
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
      - Jerarquía real (coincide con el manual 5.2-5.6): estructura -> icono
        "Adicionar Etiqueta" abre el diálogo "Etiqueta (n)" (tabla Orden/Código/
        Descripción/Items/Conforme/Proceso Menor) cuyo botón "+" (tooltip
        "Etiqueta") abre el selector "Adicionar Etiquetas: <ESTRUCTURA>"; en cada
        etiqueta el icono "Adicionar Pasos RMD" abre "Pasos (n)", cuyo botón "+"
        (tooltip "Agregar" o "Agregar Estructura", según la versión) abre el
        selector "Adicionar Pasos" (Código Paso, Descripción, Estructura,
        Etiqueta, Flag Numérico + Ir; tabla de ~1600 pasos).
      - En "Pasos (n)" de una etiqueta las columnas son: Orden, Depende, Código,
        Descripción, Tipo Dato, Clave Modelo, Puesto Trabajo, Val. Inicial, Val.
        Final, Margen, Decimal, Estado CC, Estado Mov., PM OP, Gen PP, Edit,
        R. Por, V.B., Imagen, Formato, Proc. Men., Estado.
      - El editor principal NO tiene botón "Guardar": estructuras/etiquetas/
        equipos/pasos quedan asignados al confirmar con OK (manual: un OK de
        confirmación "¿Desea asignar ...?" y otro de éxito). "Guardar" solo
        existe dentro de los diálogos de pasos (ediciones inline).
    Lo demás (pasos menores, insumos, textos exactos de los OK de confirmación,
    selector de equipos/fórmulas) NO se abrió por ser flujos de escritura.
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
        # Manual 5.3: fila de la estructura -> "Adicionar Etiqueta" -> diálogo "Etiqueta (n)"
        # -> botón "+" (tooltip "Etiqueta") -> selector "Adicionar Etiquetas: <ESTRUCTURA>".
        self._fila(estructura).get_by_role("button", name="Adicionar Etiqueta").click()
        base.click_button(self._dlg, "Etiqueta")
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

    def agregar_pasos(self, estructura: str, pasos: Iterable[str], etiqueta: str | None = None) -> None:
        """Manual 5.6. Los pasos cuelgan de una etiqueta (p. ej. Procedimiento -> DOCUMENTACION)
        o directamente de la estructura (Precauciones, Notas importantes...): si se indica
        `etiqueta` se navega estructura -> "Etiqueta (n)" -> fila de la etiqueta."""
        fila = self._fila(estructura)
        if etiqueta:
            fila.get_by_role("button", name="Adicionar Etiqueta").click()
            self._fila(etiqueta).get_by_role("button", name="Adicionar Pasos RMD").click()
        else:
            fila.get_by_role("button", name="Adicionar Pasos RMD").click()
        # El "+" del diálogo "Pasos (n)" se llama "Agregar" o "Agregar Estructura" según la versión.
        self._dlg.get_by_role("button", name=re.compile(r"^Agregar( Estructura)?$")).filter(
            visible=True
        ).first.click()
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
        self._confirmar_y_cerrar_exito()

    def generar_predecesores(self) -> None:
        base.click_button(self._dlg, "Generar Predecesores")
        self._confirmar_y_cerrar_exito()

    def establecer_tipo_dato(self, paso: str, tipo_dato: str) -> None:
        # Columna "Tipo Dato" de la tabla del diálogo "Pasos (n)" (ComboBox).
        base.select_dropdown(self._fila(paso), "Tipo Dato", tipo_dato, root=self.app)

    def establecer_predecesor(self, paso: str, codigo_paso_predecesor: str) -> None:
        # Columna "Depende" de la tabla de pasos.
        base.fill_field(self._fila(paso), "Depende", codigo_paso_predecesor)
        self.guardar()

    def marcar_paso_op_opcional(self, paso: str) -> None:
        # Manual 7.3: columna "PM OP" (nombre real, sin barra) de la tabla de pasos.
        self._fila(paso).get_by_role("checkbox", name="PM OP").check()

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

    def configurar_notificacion(self, paso: str, clave_modelo: str, puesto_trabajo: str) -> None:
        # Manual 7.6.4: en la tabla de pasos de la etiqueta (p. ej. DOCUMENTACION) se elige
        # Tipo Dato = Notificación y luego Clave Modelo (Setup Pre Proceso / Proceso /
        # Setup Post Proceso) y Puesto Trabajo; se guarda con el disquete ("Guardar").
        self.establecer_tipo_dato(paso, "Notificación")
        fila = self._fila(paso)
        base.select_dropdown(fila, "Clave Modelo", clave_modelo, root=self.app)
        base.select_dropdown(fila, "Puesto Trabajo", puesto_trabajo, root=self.app)
        self.guardar()

    def guardar(self) -> None:
        base.click_button(self._dlg, "Guardar")

    def _marcar_y_agregar(self, items: Iterable[str]) -> None:
        # Selector de tabla con casillas: filtro "Buscar" (estructuras/etiquetas) o
        # "Descripción" (pasos) + "Ir"; luego Agregar -> OK de confirmación -> OK de éxito.
        picker = self._dlg
        for item in items:
            for etiqueta_filtro in ("Buscar", "Descripción"):
                filtro = picker.get_by_label(etiqueta_filtro, exact=True).filter(visible=True)
                if filtro.count():
                    filtro.first.fill(item)
                    base.click_ir(picker)
                    break
            self._casilla_de_fila(item, picker).check()
        base.click_button(picker, "Agregar")
        self._confirmar_y_cerrar_exito()

    def _confirmar_y_cerrar_exito(self) -> None:
        base.confirmar_si_aparece(self.app, "OK")  # "¿Desea ...?"
        self.page.wait_for_timeout(500)
        base.confirmar_si_aparece(self.app, "OK")  # mensaje de éxito

    def _casilla_de_fila(self, texto: str, scope: Locator | None = None) -> Locator:
        # Las casillas de selección de UI5 se llaman "Selección de elementos": se ubican por su fila.
        return base.row_by_text(scope or self._dlg, texto).first.get_by_role("checkbox").first

    def _fila(self, texto: str) -> Locator:
        return base.row_by_text(self._dlg, texto).first
