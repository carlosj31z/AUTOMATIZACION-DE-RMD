from rmd_automation.homologacion import cargar_reemplazos, homologar, normalizar, reemplazo_de_paso


def test_normalizar_quita_tildes_y_conserva_enie():
    assert normalizar("Controlar que sus compañeros  realicén") == "CONTROLAR QUE SUS COMPAÑEROS REALICEN"


def test_pdsg_a_pdoc():
    t, r = homologar("LOS VISTOS BUENOS (V°B°) ... SEGUN EL POE PDSG-202 VIGENTE.")
    assert "SEGUN EL PROCEDIMIENTO PDOC-207" in t and "(V°B°)" in t and "pdoc-207" in r and "procedimiento-pdoc" in r


def test_nota_vb_vigente_186337_sin_reglas():
    t = ("LOS VISTOS BUENOS (V°B°) SERAN REALIZADOS Y REGISTRADOS EXCLUSIVAMENTE POR EL JEFE O SUPERVISOR DE SECCION, QUIEN DEBERA "
         "REVISAR QUE LA DATA REGISTRADA SEA CONTEMPORANEA SEGUN EL PROCEDIMIENTO PDOC-207 VIGENTE.")
    assert homologar(t) == (t, [])
    assert reemplazo_de_paso(182341, "Planta 2").codigo_vigente == 186337


def test_hagan_realicen():
    assert homologar("Controlar que sus compañeros hagan lo mismo.")[0] == "CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO."


def test_calidad_en_operaciones_y_tabla_de_muestreo():
    t, _ = homologar("EL PERSONAL DE CONTROL DE CALIDAD INGRESA A LA SALA DE ENVASE Y REALIZA EL MUESTREO PARA LOS "
                     "ANALISIS CORRESPONDIENTES SEGUN LA TABLA DE MUESTREO DEL POE PCPR-202 VIGENTE.")
    assert t == ("EL PERSONAL DE CALIDAD EN OPERACIONES INGRESA A LA SALA DE ENVASE Y REALIZA EL MUESTREO PARA LOS "
                 "ANALISIS CORRESPONDIENTES SEGUN EL POE PCPR-202 VIGENTE.")


def test_cantidad_muestreada():
    assert homologar("MUESTRA PARA CONTROL DE CALIDAD (KG):")[0] == "CANTIDAD MUESTREADA (KG):"
    assert homologar("CONTRAMUESTRA (CJA):")[0] == "CANTIDAD MUESTREADA (CJA):"


def test_instructivo_y_vigente():
    assert homologar("REALIZAR EL DESPEJE DE LA SALA SEGUN IPRO-P212 VIGENTE.")[0] == \
        "REALIZAR EL DESPEJE DE LA SALA SEGUN INSTRUCTIVO IPRO-P212 VIGENTE."
    assert homologar("SEGUN IACO-P202.")[0] == "SEGUN INSTRUCTIVO IACO-P202 VIGENTE."


def test_texto_ya_homologado_no_cambia():
    t = "CONTROLAR QUE SUS COMPAÑEROS REALICEN LO MISMO."
    assert homologar(t) == (t, [])


def test_tabla_de_reemplazos():
    filas = cargar_reemplazos()
    assert len(filas) > 100
    r = reemplazo_de_paso(161493, "PLANTA LIMA")
    assert r and r.codigo_vigente == 186337
    assert reemplazo_de_paso(1655, "Planta 1").codigo_vigente == 186337
    assert reemplazo_de_paso(31840, "ATE").codigo_vigente == 62221
    assert reemplazo_de_paso(999999999, "ATE") is None


def test_bloque_del_userscript_al_dia():
    """El bloque ==HOMOLOG== del userscript debe salir igual de la tabla y las reglas (si falla: correr el generador)."""
    import importlib.util
    from pathlib import Path
    raiz = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("gen", raiz / "analisis" / "homologacion" / "generar_homologacion_js.py")
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)
    fin = lambda t: t.replace("\r\n", "\n")   # el repo guarda el script con LF y el generador arma el bloque con CRLF
    assert fin(gen.bloque()) in fin((raiz / "tampermonkey" / "rmd-ui-mejoras.user.js").read_bytes().decode("utf-8"))


def test_fecha_hora_no_se_homologa():
    """2026-11-15, pedido de Carlos: ni la regla «fecha-hora» ni los pasos FECHA / HORA de la tabla."""
    from rmd_automation.homologacion import REGLAS, homologar
    assert not any(r.clave == "fecha-hora" for r in REGLAS)
    assert homologar("FECHA / HORA INICIO :")[1] == []
    assert reemplazo_de_paso(35476, "ATE") is None and reemplazo_de_paso(13680, "LIMA") is None
    assert reemplazo_de_paso(31840, "LIMA").codigo_vigente == 166452
