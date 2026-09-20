from __future__ import annotations

import pytest

from rmd_automation import cambios as cb
from tests.test_comparar_reglas import snap_base


def spec(*cambios):
    return cb.Spec("1", "prueba", list(cambios))


def test_spec_valida_acciones(tmp_path):
    ruta = tmp_path / "s.yaml"
    ruta.write_text("rmd: '1'\ncambios:\n  - accion: autorizar\n", encoding="utf-8")
    with pytest.raises(ValueError):
        cb.cargar_spec(ruta)  # nunca existe una acción para autorizar/enviar
    ruta.write_text("rmd: '1'\ncambios:\n  - accion: quitar_equipos\n    equipos: ['X']\n", encoding="utf-8")
    assert cb.cargar_spec(ruta).rmd == "1"


def test_quitar_equipos_pendiente_y_luego_aplicado():
    snap = snap_base()
    sp = spec({"accion": "quitar_equipos", "equipos": ["SOL-E172"]})
    assert cb.planificar(sp, snap)[0].estado == cb.PENDIENTE
    snap["structs"][1]["eq"].pop()
    assert cb.planificar(sp, snap)[0].estado == cb.APLICADO


def test_quitar_y_agregar_pasos():
    snap = snap_base()
    q = spec({"accion": "quitar_pasos", "lista": "PROCEDIMIENTO>DOCUMENTACION", "pasos": ["VERIFICAR DESPEJE"]})
    assert cb.planificar(q, snap)[0].estado == cb.PENDIENTE
    ag = spec({"accion": "agregar_pasos", "lista": "FABRICACION", "pasos": ["MOLER LA MEZCLA", "PASO NUEVO"]})
    plan = cb.planificar(ag, snap)[0]
    assert plan.estado == cb.PENDIENTE and "PASO NUEVO" in plan.detalle and "MOLER" not in plan.detalle


def test_lista_inexistente_y_ambiguedad_son_error():
    snap = snap_base()
    assert cb.planificar(spec({"accion": "quitar_pasos", "lista": "NADA", "pasos": ["x"]}), snap)[0].estado == cb.ERROR
    amb = spec({"accion": "quitar_pasos", "lista": "DOCUMENTACION", "pasos": ["VERIFICAR"]})
    snap["structs"][3]["etq"][0]["p"][2]["d"] = "VERIFICAR OTRA COSA"
    assert cb.planificar(amb, snap)[0].estado == cb.ERROR


def test_configurar_paso_compara_tipo_decimal_y_casillas():
    snap = snap_base()
    sp = spec({"accion": "configurar_paso", "lista": "RENDIMIENTO", "paso": "ENTREGADA", "tipo_dato": "Entrega",
               "decimal": 3, "casillas": ["Edit"]})
    assert cb.planificar(sp, snap)[0].estado == cb.APLICADO
    sp = spec({"accion": "configurar_paso", "lista": "RENDIMIENTO", "paso": "ENTREGADA", "decimal": 2})
    assert "decimal" in cb.planificar(sp, snap)[0].detalle


def test_predecesores_secuenciales_detecta_cadena_rota():
    snap = snap_base()
    sp = spec({"accion": "predecesores_secuenciales", "lista": "PROCEDIMIENTO>FABRICACION"})
    assert cb.planificar(sp, snap)[0].estado == cb.APLICADO
    snap["structs"][3]["etq"][1]["p"][3]["dep"] = ""  # el paso 4 pierde su predecesor
    assert cb.planificar(sp, snap)[0].estado == cb.PENDIENTE


def test_plan_a_texto_y_auditoria(tmp_path):
    sp = spec({"accion": "quitar_equipos", "equipos": ["SOL-E172"]})
    plan = cb.planificar(sp, snap_base())
    assert "1 pendiente" in cb.plan_a_texto(sp, plan)
    ruta = tmp_path / "a" / "aud.jsonl"
    cb.auditar(ruta, sp, plan, "prueba")
    assert "quitar_equipos" in ruta.read_text(encoding="utf-8")
