from __future__ import annotations

import re
from typing import Iterable

from playwright.sync_api import Locator, Page

from . import base


# Signos del diálogo "Fórmulas" (lista "Seleccionar signo"); "CT" = Cantidad Teórica.
SIGNOS_FORMULA = ("(", ")", "+", "-", "*", "/", "CT")


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


    def agregar_equipos(self, estructura: str, equipos: Iterable[str]) -> None:
        # Verificado: icono "Adicionar Equipo" de la fila -> diálogo "Equipos (n)" -> "+"
        # (tooltip "Adicionar Equipo") -> selector "Adicionar Equipos: EQUIPOS" (filtros Cod.
        # Equipo, Descripción, Cod. GACI, Estado, Área + Ir; el "+" del selector es "Agregar
        # Agrupador"). Confirmación: "¿Desea asignar los equipos o utensilios seleccionadas?".
        self._fila(estructura).get_by_role("button", name="Adicionar Equipo").click()
        base.click_button(self._dlg, "Adicionar Equipo")
        self._marcar_y_agregar(equipos)

    def eliminar_equipos(self, estructura: str, equipos: Iterable[str]) -> None:
        # Verificado: casillas + "Eliminar" -> "¿Desea proceder con la eliminación del registro
        # seleccionado?" [Borrar] -> "Se eliminaron los registros correctamente" [OK].
        self._fila(estructura).get_by_role("button", name="Adicionar Equipo").click()
        dlg = self._dlg
        for equipo in equipos:
            self._casilla_de_fila(equipo, dlg).check()
        base.click_button(dlg, "Eliminar")
        base.confirm_dialog(self.app, "Borrar")
        self._confirmar_y_cerrar_exito()
        base.click_button(self._dlg, "Cancelar")

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
        # Verificado: fila del paso -> "Procesos Menores" -> diálogo "Procesos Menores para el
        # Paso: ..." -> "+" (tooltip "Adicionar Pasos RMD") -> selector "Adicionar Pasos".
        self._fila(paso).get_by_role("button", name="Procesos Menores").click()
        base.click_button(self._dlg, "Adicionar Pasos RMD")
        self._marcar_y_agregar(procesos_menores)

    def agregar_insumos(self, proceso_menor: str, insumos: Iterable[str]) -> None:
        # Verificado hasta el selector: en "Procesos Menores para el Paso" el botón "Agregar
        # Insumo" abre "Adicionar Pasos" (Código, Descripción, UM, Cantidad); con un proceso menor
        # sin insumos disponibles la tabla sale vacía.
        self._casilla_de_fila(proceso_menor).check()
        base.click_button(self._dlg, "Agregar Insumo")
        self._marcar_y_agregar(insumos)

    def nueva_version(self) -> None:
        # Verificado: "Advertencia: ¿Desea generar una nueva versión?" [OK]/[Cancelar]. Tras el OK
        # no hay aviso de éxito: el editor se cierra solo (~10 s) y aparece un RMD nuevo
        # (código siguiente, versión +1, estado Ingresado) con toda la configuración copiada.
        base.click_button(self._dlg, "Nueva Versión")
        base.confirm_dialog(self.app, "OK")
        self.app.get_by_role("dialog").filter(has_text="Estructura de RMD").wait_for(
            state="detached", timeout=60000
        )

    def copiar_de_rmd(self, codigo_rmd_origen: str) -> None:
        # Verificado: "Copiar De: <RMD>" con filtros Código RMD, Descripción, Etapa, Planta + Ir,
        # tabla con casillas y Confirmar/Cancelar.
        base.click_button(self._dlg, "Copiar de RMD")
        dlg = self._dlg
        base.fill_field(dlg, "Código RMD", codigo_rmd_origen)
        base.click_ir(dlg)
        self._casilla_de_fila(codigo_rmd_origen, dlg).check()
        base.click_button(dlg, "Confirmar")
        self._confirmar_y_cerrar_exito()

    def copiar_a_rmd(
        self,
        descripcion: str,
        codigo_defecto: str,
        planta: str,
        motivo_solicitud: str,
        fecha_solicitud: str,
        observacion: str = "",
    ) -> None:
        # Verificado: "Copiar Información del RMD: <RMD>" con Descripción RMD, Cod. defecto,
        # Etapa y Estado (solo lectura), Planta, Motivo de Solicitud, Fecha Solicitud y Observacion.
        base.click_button(self._dlg, "Copiar a RMD")
        dlg = self._dlg
        base.fill_field(dlg, "Descripción RMD", descripcion)
        base.fill_field(dlg, "Cod. defecto", codigo_defecto)
        base.select_dropdown(dlg, "Planta", planta, root=self.app)
        base.select_dropdown(dlg, "Motivo de Solicitud", motivo_solicitud, root=self.app)
        base.fill_field(dlg, "Fecha Solicitud", fecha_solicitud)
        if observacion:
            base.fill_field(dlg, "Observacion", observacion)
        base.click_button(dlg, "Confirmar")
        self._confirmar_y_cerrar_exito()

    def configuracion_inicial(self) -> None:
        # Verificado: "Advertencia: ¿Desea realizar la configuracion inicial del RMD?" [OK].
        base.click_button(self._dlg, "Configuración Inicial")
        self._confirmar_y_cerrar_exito()

    def generar_predecesores(self) -> None:
        # Verificado: "Advertencia: ¿Desea generar Predecesores?" [OK]; el aviso de éxito
        # ("Se generaron los predecesores correctamente.") tarda varios segundos.
        base.click_button(self._dlg, "Generar Predecesores")
        self._confirmar_y_cerrar_exito()

    def establecer_tipo_dato(self, paso: str, tipo_dato: str) -> None:
        # Columna "Tipo Dato" de la tabla del diálogo "Pasos (n)" (ComboBox).
        base.select_dropdown(self._fila(paso), "Tipo Dato", tipo_dato, root=self.app)

    def _fila_orden(self, orden: int) -> Locator:
        # Un mismo código de paso puede repetirse en la etiqueta (p. ej. "CONDICIONES AMBIENTALES:"),
        # así que las filas de "Pasos (n)" se ubican por posición (Orden = posición 1..n).
        return self._dlg.locator("tbody tr").nth(orden - 1)

    def establecer_predecesor(
        self,
        orden_paso: int,
        codigo_predecesor: str,
        orden_predecesor: int,
    ) -> None:
        """Asigna a mano la columna "Depende" del paso `orden_paso` (un solo predecesor por paso).

        Verificado: el ícono "Mostrar ayuda para entradas" de la celda abre "Lista de Predecesores"
        (lista de selección única con buscador; lista TODOS los pasos del RMD, cada uno como
        "<ESTRUCTURA> - Codigo: <código> <descripción> Orden: <n>"). Como un código puede aparecer
        varias veces, se elige la fila por código Y orden. Después hay que pulsar Guardar.
        """
        fila = self._fila_orden(orden_paso)
        fila.get_by_role("button", name="Mostrar ayuda para entradas").click()
        lista = self._dlg
        lista.get_by_placeholder("Buscar").fill(codigo_predecesor)
        lista.get_by_role("listitem").filter(
            has_text=re.compile(rf"Codigo: {re.escape(codigo_predecesor)}.*Orden: {orden_predecesor}$")
        ).first.click()

    def limpiar_predecesor(self, orden_paso: int) -> None:
        # Verificado: vaciar el campo y guardar deja el paso sin predecesor.
        fila = self._fila_orden(orden_paso)
        fila.get_by_label("Depende", exact=True).fill("")

    def predecesores_secuenciales(self) -> None:
        """Regla de la operación: el predecesor es el paso anterior, salvo los "Sin tipo de dato",
        que NO llevan predecesor ni son predecesor del siguiente (el siguiente depende del último
        paso con tipo de dato). El primer paso de la etiqueta conserva su predecesor (cruza a otra
        etiqueta: último de Notas importantes para las tres primeras etiquetas, último de la
        preparación anterior para la etapa principal). No genera ramas paralelas: esas se añaden
        aparte con `establecer_predecesor`. Aplica sobre el diálogo "Pasos (n)" ya abierto y guarda.
        """
        filas = self._dlg.locator("tbody tr")
        total = filas.count()
        anterior: tuple[str, int] | None = None
        for i in range(1, total + 1):
            fila = filas.nth(i - 1)
            tipo = fila.get_by_label("Tipo Dato", exact=True).input_value()
            codigo = fila.locator("td").nth(4).inner_text().strip()
            actual = fila.get_by_label("Depende", exact=True).input_value().strip()
            if tipo == "Sin tipo de dato":
                if actual:
                    self.limpiar_predecesor(i)
                continue
            if anterior is not None and not actual.startswith(f"{anterior[0]} ({anterior[1]})"):
                self.establecer_predecesor(i, anterior[0], anterior[1])
            anterior = (codigo, i)
        self.guardar()
        self._confirmar_y_cerrar_exito()

    def marcar_paso_op_opcional(self, paso: str) -> None:
        # Manual 7.3: columna "PM OP" (nombre real, sin barra) de la tabla de pasos.
        self._fila(paso).get_by_role("checkbox", name="PM OP").check()

    def marcar_control_calidad(self, paso: str) -> None:
        # Manual 7.4: columna "Estado CC" (verificada), aplica también a pasos menores.
        self._fila(paso).get_by_role("checkbox", name="Estado CC").check()

    def establecer_paso_numero(self, paso: str, decimales: int) -> None:
        # Manual 7.6.1: tipo "Números" (con s). "Decimal" es obligatorio: sin él Guardar responde
        # "Advertencia: Por favor complete los campos obligatorios". Se marca también "Edit".
        self.establecer_tipo_dato(paso, "Números")
        fila = self._fila(paso)
        base.fill_field(fila, "Decimal", str(decimales))
        fila.get_by_role("checkbox", name="Edit").check()
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
        fila.get_by_role("checkbox", name="Edit").check()
        self.guardar()

    def establecer_paso_formula(self, paso: str, decimales: int, pasos_formula: Iterable[str]) -> None:
        # Manual 7.6.3, verificado: 1) Tipo Dato = Fórmula + Decimal + Edit y Guardar (el botón
        # "Fórmula" de la fila solo aparece tras guardar; en los RMD reales: Cantidad obtenida =
        # entregada + muestreada, Merma = teórica - obtenida, Rendimiento = obtenida / teórica * 100); 2) "Fórmula" abre el diálogo "Fórmulas"
        # (Pasos Disponibles / seleccionados, con botones de radio, "Mover a seleccionados" y
        # "Mover a disponibles"); 3) Guardar -> "¿Desea guardar la fórmula generada?" [OK] ->
        # "Se grabó la fórmula exitosamente." [OK].
        self.establecer_tipo_dato(paso, "Fórmula")
        fila = self._fila(paso)
        base.fill_field(fila, "Decimal", str(decimales))
        fila.get_by_role("checkbox", name="Edit").check()
        self.guardar()
        self._confirmar_y_cerrar_exito()
        self._fila(paso).get_by_role("button", name="Fórmula").click()
        formulas = self._dlg
        # `pasos_formula` es la fórmula EN ORDEN: códigos/textos de paso y signos, p. ej.
        # ["5275", "/", "5533", "*", "100"] o ["5224", "+", "181147"]. La lista de seleccionados se
        # arma por inserción (no hay flechas para reordenar): sin signos entre pasos la fórmula
        # queda inválida ("5224  181147"). Las constantes numéricas usan el campo "Ingrese
        # Cantidad" (no probado).
        for token in pasos_formula:
            if token in SIGNOS_FORMULA:
                formulas.locator("[id$='--signos']").click()
                self.app.get_by_role("option", name=token, exact=True).click()
            else:
                formulas.get_by_role("row").filter(has_text=token).first.get_by_role("radio").check()
                base.click_button(formulas, "Mover a seleccionados")
        base.click_button(formulas, "Guardar")
        self._confirmar_y_cerrar_exito()

    def configurar_notificacion(self, paso: str, clave_modelo: str, puesto_trabajo: str) -> None:
        # Manual 7.6.4: en la tabla de pasos de la etiqueta (p. ej. DOCUMENTACION) se elige
        # Tipo Dato = Notificación y luego Clave Modelo (Setup Pre Proceso / Proceso /
        # Setup Post Proceso) y Puesto Trabajo; se guarda con el disquete ("Guardar").
        self.establecer_tipo_dato(paso, "Notificacion")  # sin tilde en la lista real
        fila = self._fila(paso)
        base.select_dropdown(fila, "Clave Modelo", clave_modelo, root=self.app)
        base.select_dropdown(fila, "Puesto Trabajo", puesto_trabajo, root=self.app)
        base.fill_field(fila, "Decimal", "0")  # obligatorio para poder guardar
        self.guardar()
        self._confirmar_y_cerrar_exito()

    def guardar(self) -> None:
        # Guardar en los diálogos de pasos responde "Se guardaron correctamente los cambios." [OK]
        # (sin confirmación previa; el aviso puede tardar). Con campos vacíos: "Por favor
        # complete los campos obligatorios" (p. ej. Decimal).
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
        base.confirmar_si_aparece(self.app, "OK", timeout_ms=15000)  # mensaje de éxito (puede tardar)

    def _casilla_de_fila(self, texto: str, scope: Locator | None = None) -> Locator:
        # Las casillas de selección de UI5 se llaman "Selección de elementos": se ubican por su fila.
        return base.row_by_text(scope or self._dlg, texto).first.get_by_role("checkbox").first

    def _fila(self, texto: str) -> Locator:
        return base.row_by_text(self._dlg, texto).first
