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
