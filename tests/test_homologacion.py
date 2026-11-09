from rmd_automation.homologacion import cargar_reemplazos, homologar, normalizar, reemplazo_de_paso


def test_normalizar_quita_tildes_y_conserva_enie():
    assert normalizar("Controlar que sus compañeros  realicén") == "CONTROLAR QUE SUS COMPAÑEROS REALICEN"


def test_pdsg_a_pdoc():
    t, r = homologar("LOS VISTOS BUENOS (V°B°) ... SEGUN EL POE PDSG-202 VIGENTE.")
    assert "PDOC-207" in t and "(VB)" in t and "pdoc-207" in r


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
    assert r and r.codigo_vigente == 182341
    assert reemplazo_de_paso(1655, "Planta 1").codigo_vigente == 182341
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
    assert gen.bloque() in (raiz / "tampermonkey" / "rmd-ui-mejoras.user.js").read_bytes().decode("utf-8")
