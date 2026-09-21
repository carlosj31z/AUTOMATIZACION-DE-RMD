from rmd_automation.matriz import buscar_pendientes

CSV = (
    "N°,SECCIÓN,NOMBRE DEL PRODUCTO,ETAPA,x,y,INGRESO,a,b,c,AUTORIZACION,d,e,f,OBSERVACION ADICIONAL\n"
    "1,SOL,CLORFENAMINA 4 mg TAB,FABRICACION,,,PENDIENTE,,,,PENDIENTE,,,,falta receta\n"
    "2,SOL,CLORFENAMINA 4 mg TAB,ENVASE,,,OK,,,,OK,,,,\n"
    "3,SOL,OTRO PRODUCTO,FABRICACION,,,PENDIENTE,,,,,,,,x\n"
)


def test_busca_por_producto_y_etapa(tmp_path):
    f = tmp_path / "m.csv"
    f.write_text(CSV, encoding="utf-8")
    r = buscar_pendientes(f, "clorfenamina 4 mg", "Fabricacion")
    assert len(r) == 1 and r[0].motivo == "falta receta"
    assert buscar_pendientes(f, "clorfenamina 4 mg", "Envase") == []


def test_avisos_solo_si_hay_algo_anormal(tmp_path):
    from rmd_automation.matriz import a_texto, revisar

    f = tmp_path / "m.csv"
    f.write_text(CSV + "4,SOL,PRODUCTO X,FABRICACION,,,,,,,,,,,\n5,SOL,PRODUCTO OK,FABRICACION,,,INGRESADO,,,,AUTORIZADO,,,,\n", encoding="utf-8")
    assert revisar(f, "producto ok", "Fabricacion") == []
    assert a_texto([]) == ""
    assert "debe completarse" in revisar(f, "producto x", "Fabricacion")[0]
    assert "NO figura" in revisar(f, "inexistente", "Fabricacion")[0]
    assert "falta receta" in revisar(f, "clorfenamina", "Fabricacion")[0]
