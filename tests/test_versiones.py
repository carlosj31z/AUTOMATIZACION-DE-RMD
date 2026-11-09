import pytest

from rmd_automation.versiones import (
    conjunto, cubre, incluye, nueva_version, revisar_pr, revisar_publicar, version,
)


def script(v, incl=None, eol="\n", cuerpo="x"):
    lineas = ["// ==UserScript==", "// @name         RMD · mejoras de interfaz", f"// @version      {v}",
              "// ==/UserScript==", "(function () {", f"  const VERSION = '{v}';   // mantener igual a @version"]
    if incl is not None:
        lineas.append(f"  // INCLUYE: {incl} (comentario)")
    lineas += [f"  // {cuerpo}", "})();", ""]
    return eol.join(lineas)


def test_lee_version_e_incluye():
    s = script("1.133.0", "1.132.1, 1.131.2")
    assert version(s) == "1.133.0" and incluye(s) == ["1.131.2", "1.132.1"]
    assert incluye(script("1.132.1")) is None


def test_legado_sin_incluye_cubre_las_menores():
    viejo = script("1.132.1")
    assert cubre(viejo, "1.132.0") and cubre(viejo, "1.100.0") and not cubre(viejo, "1.133.0")


def test_caso_1131_2_contra_1132_0():
    # 1.131.2 sobre base vieja: no se puede publicar sobre 1.132.0 (ni subiéndole el número sin juntar).
    assert revisar_publicar(script("1.131.2"), "1.132.0")
    rama = nueva_version(script("1.132.1"), "1.133.0")          # p. ej. base 1.132.1 → 1.133.0
    otra = nueva_version(script("1.132.1"), "1.134.0")          # otro hilo, misma base, publica primero
    assert revisar_publicar(otra, "1.132.1") == []
    errs = revisar_publicar(nueva_version(rama, "1.135.0"), "1.134.0")
    assert errs and "no incluye 1.134.0" in errs[0]
    junta = nueva_version(rama, "1.135.0", [otra])
    assert revisar_publicar(junta, "1.134.0") == []
    assert conjunto(junta) == ["1.132.1", "1.133.0", "1.134.0", "1.135.0"]


def test_publicar_exige_incluye_y_numero_mayor():
    assert revisar_publicar(script("1.133.0"), "1.132.1")              # sin INCLUYE
    assert revisar_publicar(script("1.133.0", "1.132.1"), "1.133.0")   # no es mayor
    assert revisar_publicar(script("1.133.0", "1.132.1"), None) == []  # carpeta vacía


def test_nueva_version_por_defecto_y_fines_de_linea():
    s = script("1.132.1", eol="\r\n")
    n = nueva_version(s)
    assert version(n) == "1.133.0" and incluye(n) == ["1.132.1"]
    assert "\n" not in n.replace("\r\n", "")                    # respeta CRLF
    n2 = nueva_version(n)
    assert version(n2) == "1.134.0" and incluye(n2) == ["1.132.1", "1.133.0"]
    assert n2.count("INCLUYE") == 1 and "\n" not in n2.replace("\r\n", "")
    with pytest.raises(ValueError):
        nueva_version(n, "1.133.0")


def test_revisar_pr():
    base = nueva_version(script("1.132.1"), "1.133.0")
    assert revisar_pr(base, base) == []
    assert "no es mayor" in revisar_pr(base, base.replace("// x", "// y"))[0]
    sin_base = nueva_version(script("1.132.1", cuerpo="y"), "1.134.0")   # rama vieja que no trae 1.133.0
    assert "no incluye 1.133.0" in revisar_pr(base, sin_base)[0]
    assert revisar_pr(base, nueva_version(sin_base, "1.134.1", [base])) == []
    assert revisar_pr(script("1.132.1"), nueva_version(script("1.132.1", cuerpo="z"))) == []
