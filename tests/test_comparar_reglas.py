from __future__ import annotations

import copy

from rmd_automation import comparar, reglas


def paso(o, d, td="Múltiple check", dep="", chk="", cod=None, **kw):
    return {"o": str(o), "dep": dep, "cod": cod or str(1000 + o), "d": d, "td": td, "ck": kw.get("ck", ""),
            "pt": kw.get("pt", ""), "vi": kw.get("vi", ""), "vf": kw.get("vf", ""), "mg": "", "dc": kw.get("dc", ""),
            "chk": chk, "pm": kw.get("pm", False)}


def snap_base():
    doc = [
        paso(1, "FECHA / HORA INICIO :", "Notificacion", chk="Edit", ck="Setup Pre Proceso", pt="FSOLME02", dep="99 (5)"),
        paso(2, "VERIFICAR DESPEJE", dep="1001 (1)"),
        paso(3, "FECHA / HORA FINAL:", "Fecha y Hora", chk="Edit", dep="1002 (2)"),
    ]
    fab = [
        paso(1, "CONDICIONES AMBIENTALES:", "Realizado por", chk="R. Por"),
        paso(2, "FECHA / HORA INICIO DE LA FABRICACION:", "Notificacion", chk="Edit", ck="Proceso", pt="FSOLME02", dep="1001 (1)"),
        paso(3, "MOLIENDA:", "Sin tipo de dato"),
        paso(4, "MOLER LA MEZCLA", "Realizado por", chk="R. Por", dep="1002 (2)"),
        paso(5, "FECHA / HORA FINAL DE LA FABRICACION:", "Notificacion", chk="Edit", ck="Proceso", pt="FSOLME02", dep="1004 (4)"),
    ]
    rend = [paso(1, "CANTIDAD TEORICA", "Fórmula", chk="Edit", dc="3"),
            paso(2, "MUESTRA", "MuestraCC", chk="Estado CC,Edit", dc="3"),
            paso(3, "ENTREGADA", "Entrega", chk="Edit", dc="3")]
    return {
        "code": "1", "head": "1 - PRODUCTO",
        "structs": [
            {"o": "1", "n": "PRECAUCIONES", "items": "1", "p": [paso(1, "CUIDAR", "Verificación Check")]},
            {"o": "3", "n": "EQUIPOS / INSTRUMENTOS / MATERIALES", "items": "2",
             "eq": ["1|10|BALANZA|x|y|EQUIPO|SOL-BAL-18", "2|11|DESEMPOLVADOR|x|y|EQUIPO|SOL-E172"]},
            {"o": "4", "n": "INSUMOS", "items": "1", "ins": ["1|A"]},
            {"o": "6", "n": "PROCEDIMIENTO", "items": "3", "etq": [
                {"o": "1", "n": "DOCUMENTACION", "p": doc, "pm": {}},
                {"o": "2", "n": "FABRICACION", "p": fab, "pm": {}},
                {"o": "3", "n": "RENDIMIENTO", "p": rend, "pm": {}},
            ]},
        ],
    }


def test_comparar_detecta_cambios():
    a, b = snap_base(), snap_base()
    b["structs"][1]["eq"].pop()  # se quita el desempolvador
    b["structs"][3]["etq"][0]["p"].pop(1)  # se quita un paso de Documentación
    b["structs"][3]["etq"][1]["p"][3]["chk"] = "R. Por,V.B."
    d = comparar.comparar(a, b)
    assert any("SOL-E172" in x or "DESEMPOLVADOR" in x for x in d.equipos_quitados)
    doc = next(x for x in d.listas if x.nombre.endswith("DOCUMENTACION"))
    assert any("VERIFICAR DESPEJE" in x for x in doc.quitados)
    fab = next(x for x in d.listas if x.nombre.endswith("FABRICACION"))
    assert any("casillas" in x for x in fab.cambiados)
    assert "Comparación de versiones" in comparar.a_markdown(d)


def test_comparar_identicos_sin_diferencias():
    assert "Sin diferencias" in comparar.a_markdown(comparar.comparar(snap_base(), snap_base()))


def mensajes(snap, nivel=None):
    return [h.mensaje for h in reglas.revisar(snap) if nivel is None or h.nivel == nivel]


def test_snapshot_correcto_sin_errores():
    assert mensajes(snap_base(), "ERROR") == []


def test_decimal_obligatorio_y_rango():
    s = snap_base()
    s["structs"][3]["etq"][2]["p"][0]["dc"] = ""
    assert any("sin Decimal" in m for m in mensajes(s, "ERROR"))


def test_sin_tipo_de_dato_no_lleva_predecesor_ni_es_predecesor():
    s = snap_base()
    fab = s["structs"][3]["etq"][1]["p"]
    fab[2]["dep"] = "1002 (2)"  # Sin tipo con predecesor
    assert any("Sin tipo de dato no lleva predecesor" in m for m in mensajes(s, "ERROR"))
    s = snap_base()
    s["structs"][3]["etq"][1]["p"][3]["dep"] = "1003 (3)"  # depende de un Sin tipo
    assert any("es un Sin tipo de dato" in m for m in mensajes(s, "ERROR"))


def test_notificacion_clave_puesto_y_pares():
    s = snap_base()
    fab = s["structs"][3]["etq"][1]["p"]
    fab[1]["ck"] = "Otra"
    assert any("Clave Modelo inválida" in m for m in mensajes(s, "ERROR"))
    s = snap_base()
    s["structs"][3]["etq"][1]["p"][4]["pt"] = ""
    msgs = mensajes(s)
    assert any("Puesto de Trabajo" in m for m in msgs)
    assert any("cantidad impar" in m for m in msgs)


def test_puesto_vacio_en_version_sin_receta_es_info():
    s = snap_base()
    s["structs"][2]["items"] = "0"
    for e in s["structs"][3]["etq"]:
        for p in e["p"]:
            if p["td"] == "Notificacion":
                p["pt"] = ""
    assert not [h for h in reglas.revisar(s) if "Puesto" in h.mensaje and h.nivel != "INFO"]


def test_pasos_prohibidos():
    s = snap_base()
    s["structs"][3]["etq"][0]["p"][1]["d"] = "SOLICITAR AL JEFE O SUPERVISOR DE TURNO, ASIGNE LOS NOMBRES DE LAS PERSONAS"
    assert any("no debe existir" in m for m in mensajes(s, "ERROR"))


def test_vb_condiciones_ambientales_segun_luz_inactinica():
    s = snap_base()
    s["structs"][3]["etq"][1]["p"].append(paso(6, "LUZ INACTINICA ENCENDIDA", "Verificación Check"))
    assert any("debe llevar V.B." in m for m in mensajes(s))
    s = snap_base()
    fab = s["structs"][3]["etq"][1]["p"]
    fab[0].update(td="Realizado por y Visto bueno", chk="R. Por,V.B.")
    assert any("sin luz inactínica" in m for m in mensajes(s))
    s = snap_base()
    s["structs"][3]["etq"][1]["p"].append(paso(6, "LUZ INACTINICA ENCENDIDA", "Verificación Check"))
    s["structs"][3]["etq"][1]["p"][0].update(td="Realizado por y Visto bueno", chk="R. Por,V.B.")
    assert not [m for m in mensajes(s) if "V.B." in m]


def test_procesos_menores():
    s = snap_base()
    s["structs"][3]["etq"][1]["pm"] = {"1": ["1|/1/TEMPERATURA||Rango|15|25|10||Edit", "2|/2/HORA||Hora||||||"]}
    msgs = mensajes(s)
    assert any("Rango sin Decimal" in m or "Sin Decimal" in m or "sin Decimal" in m for m in msgs)
    assert any("Hora sin Edit" in m for m in msgs)


def test_calidad_en_operaciones_insumos_y_textos():
    s = snap_base()
    fab = s["structs"][3]["etq"][1]
    fab["p"][3] = paso(4, "EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA", "Realizado por", chk="R. Por", dep="1002 (2)")
    fab["p"][2] = paso(3, "AVISAR AL CONTROL DE CALIDAD", "Sin tipo de dato")
    fab["pm"] = {"4": ["1|/83022/CANTIDAD MUESTREADA (kg):||Números|||||Edit",
                       "2|/10000003/SIMETICONA|6.511|Números|||||Edit"]}
    s["structs"][3]["etq"][2]["p"][1] = paso(2, "MUESTRA PARA CONTROL DE CALIDAD", "MuestraCC", chk="Estado CC,Edit", dc="3")
    msgs = " | ".join(str(x) for x in reglas.revisar(s))
    assert "Calidad en Operaciones (Realizado por) sin Estado CC" in msgs
    assert "muestreo de Calidad en Operaciones sin Edit + Estado CC" in msgs
    assert "los insumos no llevan Edit" in msgs
    assert "CANTIDAD MUESTREADA" in msgs and "CALIDAD EN OPERACIONES" in msgs


def test_control_de_calidad_o_calidad_en_operaciones_es_correcto():
    """La nota del granel de Envase ('…CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE') es la redacción vigente: no se alerta."""
    s = snap_base()
    fab = s["structs"][3]["etq"][1]["p"]
    fab.append(paso(6, "VERIFICAR QUE EL GRANEL TENGA LA APROBACION DE CONTROL DE CALIDAD O CALIDAD EN OPERACIONES, SEGUN APLIQUE.",
                    dep="1005 (5)"))
    assert not [m for m in mensajes(s) if "CONTROL DE CALIDAD" in m]
    # la redacción antigua y cualquier otro "Control de Calidad" siguen alertándose
    s = snap_base()
    s["structs"][3]["etq"][1]["p"].append(paso(6, "VERIFICAR QUE EL GRANEL TENGA LA APROBACION DE CONTROL DE CALIDAD O CONTROL DE PROCESO, SEGUN APLIQUE.", dep="1005 (5)"))
    s["structs"][3]["etq"][1]["p"].append(paso(7, "AVISAR AL CONTROL DE CALIDAD", dep="1006 (6)"))
    assert len([m for m in mensajes(s) if "reemplazar" in m and "CONTROL DE CALIDAD" in m]) == 2


def test_entrega_del_formato_de_inspeccion_a_control_de_calidad_no_se_alerta():
    """El cierre de Acondicionado que entrega el FPRO-250 a Control de Calidad para su aprobación es correcto (confirmado por el
    usuario): no se alerta, ni con tildes. Otro "CONTROL DE CALIDAD" en el mismo paso, o en otro paso, sí."""
    formato = "FINALMENTE ENTREGAR EL FORMATO DE INSPECCION EN LINEAS DE PRODUCCION (FPRO-250 VIGENTE) A CONTROL DE CALIDAD PARA SU APROBACION EN EL SISTEMA, ASI COMO EL SOBRE TECNICO CON LA DOCUMENTACION AL AREA DE ASEGURAMIENTO DE LA CALIDAD."
    for texto in (formato, "Finalmente entregar el formato de inspección en líneas de producción (FPRO-250 VIGENTE) a Control de Calidad "
                           "para su aprobación en el sistema, así como el sobre técnico con la documentación al área de Aseguramiento de la Calidad."):
        s = snap_base()
        s["structs"][3]["etq"][1]["p"].append(paso(6, texto, dep="1005 (5)"))
        assert not [m for m in mensajes(s) if "CONTROL DE CALIDAD" in m]
    s = snap_base()
    s["structs"][3]["etq"][1]["p"].append(paso(6, formato + " AVISAR AL CONTROL DE CALIDAD.", dep="1005 (5)"))
    s["structs"][3]["etq"][1]["p"].append(paso(7, "ESPERAR RESULTADOS DE CONTROL DE CALIDAD PARA CONTINUAR.", dep="1006 (6)"))
    assert len([m for m in mensajes(s) if "reemplazar" in m and "CONTROL DE CALIDAD" in m]) == 2


def test_pasos_mayores_de_biocarga_no_alertan_control_de_calidad():
    """El análisis de biocarga es de Control de Calidad (usuario, 2026-09-23): ningún paso mayor que mencione biocarga se alerta,
    en mayúsculas o en minúsculas. Otro paso con "CONTROL DE CALIDAD" y un proceso menor de biocarga siguen alertándose."""
    biocarga = "EL PERSONAL DE CONTROL DE CALIDAD MUESTREA (100 mL) PARA ANALISIS DE BIOCARGA, SEGUN LO INDICADO EN EL PROCEDIMIENTO PCMB-200 VIGENTE."
    for texto in (biocarga, "El personal de Control de Calidad muestrea (100 mL) para análisis de biocarga, según lo indicado en el procedimiento PCMB-200 vigente."):
        s = snap_base()
        s["structs"][3]["etq"][1]["p"].append(paso(6, texto, "Realizado por", chk="R. Por,Estado CC", dep="1005 (5)"))
        assert not [m for m in mensajes(s) if "CONTROL DE CALIDAD" in m]
    s = snap_base()
    s["structs"][3]["etq"][1]["p"].append(paso(6, biocarga, "Realizado por", chk="R. Por,Estado CC", dep="1005 (5)"))
    s["structs"][3]["etq"][1]["p"].append(paso(7, "ESPERAR RESULTADOS DE CONTROL DE CALIDAD PARA CONTINUAR.", dep="1006 (6)"))
    s["structs"][3]["etq"][1]["pm"] = {"6": ["1|/83022/MUESTRA DE BIOCARGA PARA CONTROL DE CALIDAD (mL):||Números|||||Edit,Estado CC"]}
    avisos = [(h.lista, h.orden) for h in reglas.revisar(s) if "reemplazar" in h.mensaje and "CONTROL DE CALIDAD" in h.mensaje]
    assert avisos == [("PROCEDIMIENTO>FABRICACION", "7"), ("PROCEDIMIENTO>FABRICACION #6 (menor 1)", "-")]


def test_pm_op_marcada_se_avisa():
    """PM OP no debe marcarse en ningún paso (indicación del equipo, septiembre de 2026)."""
    s = snap_base()
    assert not [m for m in mensajes(s) if "PM OP" in m]
    s["structs"][3]["etq"][1]["p"][3]["chk"] = "R. Por,PM OP"
    avisos = [h for h in reglas.revisar(s) if "PM OP" in h.mensaje]
    assert [(h.lista, h.orden) for h in avisos] == [("PROCEDIMIENTO>FABRICACION", "4")]


def sin_predecesor(snap):
    return [(h.lista, h.orden) for h in reglas.revisar(snap) if "sin predecesor" in h.mensaje and h.nivel == "AVISO"]


def test_paso_con_tipo_sin_predecesor_se_avisa_cuando_aplica():
    s = snap_base()
    # base: el primer paso de PRECAUCIONES es la cabeza de la cadena (no lleva predecesor); FABRICACION #1 (con tipo, sin dep) sí debe llevarlo
    assert ("PROCEDIMIENTO>FABRICACION", "1") in sin_predecesor(s)
    assert not [x for x in sin_predecesor(s) if x[0].startswith("PRECAUCIONES")]
    # un paso de Precauciones que no es el primero
    s["structs"][0]["p"].append(paso(2, "USAR GUANTES", "Verificación Check"))
    assert ("PRECAUCIONES", "2") in sin_predecesor(s)
    s["structs"][0]["p"][1]["dep"] = "1001 (1)"
    assert ("PRECAUCIONES", "2") not in sin_predecesor(s)
    # Notas importantes: su primer paso también depende del último de Precauciones
    s["structs"].insert(1, {"o": "2", "n": "NOTAS IMPORTANTES DURANTE EL PROCESO", "items": "1", "p": [paso(1, "NO USAR ESMALTE", "Verificación Check")]})
    assert ("NOTAS IMPORTANTES DURANTE EL PROCESO", "1") in sin_predecesor(s)
    s["structs"][1]["p"][0]["dep"] = "1002 (2)"
    assert ("NOTAS IMPORTANTES DURANTE EL PROCESO", "1") not in sin_predecesor(s)


def test_predecesor_no_aplica_en_sin_tipo_rendimiento_condiciones_ni_pasos_condicionales():
    s = snap_base()
    assert not [x for x in sin_predecesor(s) if x[0].endswith("RENDIMIENTO")]                   # Rendimiento no lleva predecesores
    assert ("PROCEDIMIENTO>FABRICACION", "3") not in sin_predecesor(s)                          # Sin tipo de dato
    s["structs"][3]["etq"][1]["p"].append(paso(6, "EN CASO QUE SE DETECTE DESVIO, AVISAR AL JEFE", "Realizado por", chk="R. Por"))
    s["structs"][3]["etq"][1]["p"].append(paso(7, "PARALELAMENTE TRITURAR EL EXCIPIENTE", "Realizado por", chk="R. Por"))
    s["structs"][3]["etq"][1]["p"].append(paso(8, "ENTREGAR LA DOCUMENTACION ORDENADA Y FIRMADA AL JEFE O SUPERVISOR.", "Realizado por", chk="R. Por"))
    s["structs"][3]["etq"][1]["p"].append(paso(9, "MEDIR EL PESO", "Realizado por", chk="R. Por"))
    lista = sin_predecesor(s)
    assert ("PROCEDIMIENTO>FABRICACION", "9") in lista
    assert not [x for x in lista if x[1] in ("6", "7", "8") and x[0].endswith("FABRICACION")]
