from rmd_automation.contingencia import comparar, escribir_excel, interpretar, leer_maestro
from rmd_automation.sharepoint import partir_url

MAESTRO = (
    "Exportación SAPUI5\n"
    "Código,Código de Solicitud,Versión,Estado,Código por Defecto,Código Agrupador,Descripción,Etapa,Planta,Sección,Fecha Autorización\n"
    "2202403301,,5,Suspendido,5000001,A1,GASEOVET 80mg mL SUS 1000 L,FABRICACION,PLANTA ATE,LIQUIDOS,2024-05-01\n"
    "2202609999,,6,Autorizado,5000001,A1,GASEOVET 80mg mL SUS 1000 L,FABRICACION,PLANTA ATE,LIQUIDOS,2026-10-01\n"
    "2202607732,,5,Autorizado,5000002,A2,GASEOVET FCO15mL CJA x 25,ACONDICIONADO,PLANTA ATE,LIQUIDOS,2026-09-01\n"
    "2202600001,,1,Autorizado,5000003,A3,PRODUCTO NUEVO TAB,FABRICACION,PLANTA LIMA,SOLIDOS,2026-10-10\n"
    "2202600002,,2,Autorizado,5000004,A4,OTRO TAB,ENVASE,PLANTA LIMA,SOLIDOS,2026-10-10\n"
    ",1202604770,1,Solicitud Rechazada,,,ACNOMEL CRM,FABRICACION,PLANTA LIMA,COSMETICOS,\n"
)

PDFS = [
    "1.- PLANTA 1/LIQUIDOS/GASEOVET/FABRICACION/2202403301-FAB-5-_GASEOVET_80mg_mL_SUS 1000 L.pdf",
    "1.- PLANTA 1/LIQUIDOS/GASEOVET/ACONDICIONADO/2202607732-5-GASEOVET_FCO15mL_CJA_x_25_-_ACO1.pdf",
    "1.- PLANTA 1/LIQUIDOS/GASEOVET/ACONDICIONADO/2202607732-5-GASEOVET_FCO15mL_CJA_x_25_-_ACO1 (1).pdf",
    "2.- PLANTA 2/SOLIDOS/OTRO TAB/ENVASE/OBSOLETO/2202600002-2-OTRO_TAB.pdf",
    "2.- PLANTA 2/SOLIDOS/OTRO TAB/ENVASE/OBSOLETO/13407-ACO-1-_VIEJO-N.pdf",
    "2.- PLANTA 2/SOLIDOS/OTRO TAB/ENVASE/instructivo.pdf",
]


def _maestro(tmp_path):
    f = tmp_path / "m.csv"
    f.write_text(MAESTRO, encoding="utf-8")
    return leer_maestro(f)


def test_nombres_en_las_tres_convenciones():
    a = interpretar("X/FABRICACION/2202403301-FAB-5-_GASEOVET 1000 L.pdf")
    assert (a.codigo, a.version, a.etapa, a.obsoleto) == ("2202403301", "5", "FAB", False)
    b = interpretar("X/ACONDICIONADO/OBSOLETO/2202607732-5-GASEOVET_ACO1 (2).pdf")
    assert (b.codigo, b.version, b.etapa, b.obsoleto, b.copia) == ("2202607732", "5", "", True, True)
    assert b.carpeta == "X/ACONDICIONADO"
    assert interpretar("X/13407-ACO-1-_GASEOVET-N.pdf").codigo == "13407"
    assert interpretar("X/instructivo.pdf") is None
    c = interpretar("X/ENVASE/OSOLETO/2202506416-ENV3-ELECTROLIGHT.pdf")
    assert (c.codigo, c.version, c.etapa, c.obsoleto) == ("2202506416", "3", "ENV", True)
    assert interpretar("X/2202607906- INS -1-IOPAMED.pdf").version == "1"
    assert interpretar("X/2202506705-INS-2_METOCLOPRAMIDA.pdf").version == "2"
    d = interpretar("X/15443-AACO1-2-LINCOMICINA.pdf")
    assert (d.codigo, d.version, d.etapa) == ("15443", "2", "ACO")


def test_maestro_ignora_solicitudes_sin_codigo(tmp_path):
    m = _maestro(tmp_path)
    assert [r.codigo for r in m] == ["2202403301", "2202609999", "2202607732", "2202600001", "2202600002"]
    assert sum(r.vigente for r in m) == 4


def test_brechas(tmp_path):
    b = comparar(_maestro(tmp_path), PDFS)
    assert b.vigentes == 4 and b.al_dia == 1
    # La v5 suspendida sigue fuera de OBSOLETO y ya existe la v6 autorizada.
    assert [(f["Código"], f["Vigente: código"]) for f in b.desactualizados] == [("2202403301", "2202609999")]
    falt = {f["Código"]: f for f in b.faltantes}
    assert set(falt) == {"2202600001", "2202600002"}
    assert falt["2202600002"]["Nota"] == "Solo está en OBSOLETO"
    assert falt["2202600002"]["Carpeta sugerida"] == "2.- PLANTA 2/SOLIDOS/OTRO TAB/ENVASE"
    assert {f["Archivo"].endswith("(1).pdf") for f in b.duplicados} == {True, False}
    assert [f["Archivo"] for f in b.sin_codigo] == ["2.- PLANTA 2/SOLIDOS/OTRO TAB/ENVASE/instructivo.pdf"]
    # Con el PDF de la v6 ya en la carpeta, la v5 solo debe pasarse a OBSOLETO.
    b2 = comparar(_maestro(tmp_path), PDFS + ["1.- PLANTA 1/LIQUIDOS/GASEOVET/FABRICACION/2202609999-FAB-6-_GASEOVET.pdf"])
    assert b2.desactualizados == [] and b2.no_vigentes[0]["Vigente ya en la carpeta"] == "2202609999"
    escribir_excel(b, tmp_path / "b.xlsx")
    assert (tmp_path / "b.xlsx").stat().st_size > 0


def test_url_de_sharepoint():
    url = ("https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA/Documentos%20compartidos/Forms/AllItems.aspx"
           "?id=%2Fsites%2FDOCUMENTACIONMEDIFARMA%2FDocumentos%20compartidos%2FPLANTA%20LIMA%2F04%2E%2DRMD%2F3%2E%2DCONTINGENCIA&viewid=x")
    sitio, carpeta = partir_url(url)
    assert sitio == "https://medifarmape.sharepoint.com/sites/DOCUMENTACIONMEDIFARMA"
    assert carpeta == "/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/PLANTA LIMA/04.-RMD/3.-CONTINGENCIA"
    assert partir_url(sitio + "/Documentos compartidos/A")[1] == "/sites/DOCUMENTACIONMEDIFARMA/Documentos compartidos/A"
