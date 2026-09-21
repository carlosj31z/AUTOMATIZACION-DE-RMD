import json

from rmd_automation.flujo import Flujo


def test_flujo_escribe_estado(tmp_path, capsys):
    f = Flujo("123", carpeta=tmp_path)
    f.empezar("lectura")
    f.hecho("lectura", "ok")
    f.omitir("matriz", "sin matriz")
    d = json.loads((tmp_path / "estado_flujo.json").read_text(encoding="utf-8"))
    est = {e["clave"]: e["estado"] for e in d["etapas"]}
    assert est["lectura"] == "hecho" and est["matriz"] == "omitido" and est["plan"] == "pendiente"
    assert "refresh" in (tmp_path / "estado_flujo.html").read_text(encoding="utf-8")
    assert "Lectura del RMD" in capsys.readouterr().out
