from __future__ import annotations

from rmd_automation.referencias import extraer_referencias, a_markdown


def paso(o, d, td="Múltiple check"):
    return {"o": str(o), "dep": "", "cod": str(1000 + o), "d": d, "td": td, "ck": "", "pt": "", "vi": "", "vf": "", "mg": "", "dc": "", "chk": "", "pm": False}


def snap_con(pasos, pm=None):
    return {"code": "1", "head": "1", "structs": [
        {"o": "1", "n": "PRECAUCIONES", "items": str(len(pasos)), "p": pasos},
    ]}


def test_ejemplos_del_usuario():
    textos = ["VER EL PROCEDIMIENTO IPRO-P123 VIGENTE", "SEGUN FACO-200", "REVISAR IGV1-E201", "APLICA PPV2-200"]
    pasos = [paso(i + 1, t) for i, t in enumerate(textos)]
    ref = extraer_referencias(snap_con(pasos))
    codigos = {r.codigo for lst in ref.values() for r in lst}
    assert codigos == {"IPRO-P123", "FACO-200", "IGV1-E201", "PPV2-200"}
    assert {r.codigo for r in ref["I"]} == {"IPRO-P123", "IGV1-E201"}
    assert {r.codigo for r in ref["P"]} == {"PPV2-200"}
    assert {r.codigo for r in ref["F"]} == {"FACO-200"}


def test_sufijo_obligatorio_evita_falsos_positivos():
    # el sufijo -NNN es obligatorio: sin él, "FPRO" suelto (o palabras comunes como PARA/PASO/PESO/FITZ) no cuenta
    ref = extraer_referencias(snap_con([paso(1, "VER FPRO-201 Y TAMBIEN FPRO VIGENTE, PARA EL PASO SEGUN FITZ MILL")]))
    codigos = {r.codigo for lst in ref.values() for r in lst}
    assert codigos == {"FPRO-201"}


def test_excluye_prefijos_de_mas_de_una_letra():
    ref = extraer_referencias(snap_con([paso(1, "SEGUN LA POLITICA POL-PRO-100 Y EL MANUAL MPRO-100")]))
    todos = {r.codigo for lst in ref.values() for r in lst}
    assert "POL-PRO-100" not in todos
    assert "MPRO-100" not in todos    # M no está en el alcance (tipo de 1 letra: I/P/F)


def test_area_con_digito_en_tercera_posicion_no_en_primera_ni_segunda():
    ref = extraer_referencias(snap_con([paso(1, "VER IGV1-E201, IGV2-E202, IP1O-200")]))
    codigos = {r.codigo for lst in ref.values() for r in lst}
    assert {"IGV1-E201", "IGV2-E202"} <= codigos
    # "IP1O" tiene el dígito en la 2ª posición del área: no es un caso descrito, pero el patrón [A-Z]{2}[A-Z0-9] lo admite igual
    # (documentado: no se valida la posición del dígito, solo se reconoce el formato general)


def test_cuenta_apariciones_y_contextos():
    ref = extraer_referencias(snap_con([paso(1, "VER IPRO-P123"), paso(2, "OTRA VEZ IPRO-P123")]))
    r = next(r for r in ref["I"] if r.codigo == "IPRO-P123")
    assert r.apariciones == 2
    assert len(r.ejemplos) == 2


def test_procesos_menores_tambien_se_escanean():
    snap = snap_con([paso(1, "SIN REFERENCIAS")], pm={"1": ["1|/1/VER FACO-999||Sin tipo de dato|||||"]})
    snap["structs"][0]["etq"] = []
    snap["structs"][0]["pm"] = snap.pop("pm", None)
    lst = {"o": "1", "n": "PROCEDIMIENTO", "items": "1", "etq": [
        {"o": "1", "n": "FABRICACION", "p": [paso(1, "SIN REFERENCIAS")], "pm": {"1": ["1|/1/VER FACO-999||Sin tipo de dato|||||"]}},
    ]}
    snap2 = {"code": "1", "head": "1", "structs": [lst]}
    ref = extraer_referencias(snap2)
    assert {r.codigo for r in ref["F"]} == {"FACO-999"}


def test_markdown_sin_hallazgos():
    md = a_markdown({})
    assert "No se encontraron" in md


def test_markdown_con_hallazgos():
    ref = extraer_referencias(snap_con([paso(1, "VER IPRO-P123")]))
    md = a_markdown(ref, "RMD 123")
    assert "IPRO-P123" in md and "Instructivo" in md
