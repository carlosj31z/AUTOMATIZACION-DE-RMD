"""«Habilitar el paso» (cambiar_predecesor) y la traducción de las solicitudes del chatbot (sin portal)."""
from __future__ import annotations

import pytest

from rmd_automation import cambios as cb
from rmd_automation import solicitudes as so
from tests.test_comparar_reglas import snap_base


def spec(*cambios):
    return cb.Spec("1", "prueba", list(cambios))


def test_habilitar_paso_con_predecesor_mas_antiguo():
    snap = snap_base()  # MOLER LA MEZCLA (#4) depende de 1002 (2)
    fab = snap["structs"][3]["etq"][1]["p"]
    sp = spec({"accion": "cambiar_predecesor", "lista": "PROCEDIMIENTO>FABRICACION",
               "paso": "FECHA / HORA FINAL DE LA FABRICACION", "predecesor": "INICIO DE LA FABRICACION"})
    a = cb.planificar(sp, snap)[0]
    assert a.estado == cb.PENDIENTE, a.mensajes
    assert a.params["_orden_paso"] == 5 and a.params["_pred"] == (fab[1]["cod"], 2)
    fab[4]["dep"] = f"{fab[1]['cod']} (2)"
    assert cb.planificar(sp, snap)[0].estado == cb.APLICADO


def test_sin_predecesor_y_reglas():
    snap = snap_base()
    sin = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "MOLER LA MEZCLA", "sin_predecesor": True})
    assert cb.planificar(sin, snap)[0].estado == cb.PENDIENTE
    # el predecesor debe ser anterior
    despues = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "MOLER LA MEZCLA",
                    "predecesor": "FINAL DE LA FABRICACION"})
    assert cb.planificar(despues, snap)[0].estado == cb.ERROR
    # un Sin tipo de dato no es predecesor
    sintipo = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "MOLER LA MEZCLA", "predecesor": "MOLIENDA"})
    assert cb.planificar(sintipo, snap)[0].estado == cb.ERROR
    # Rendimiento no lleva predecesor
    rend = spec({"accion": "cambiar_predecesor", "lista": "RENDIMIENTO", "paso": "ENTREGADA", "predecesor": "MUESTRA"})
    assert cb.planificar(rend, snap)[0].estado == cb.ERROR


def test_predecesor_en_otra_etiqueta_y_ambiguo():
    snap = snap_base()
    otra = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "FINAL DE LA FABRICACION",
                 "predecesor": "VERIFICAR DESPEJE"})
    a = cb.planificar(otra, snap)[0]
    assert a.estado == cb.PENDIENTE and a.params["_pred"][1] == 2
    amb = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "MOLER LA MEZCLA", "predecesor": "FECHA / HORA"})
    assert cb.planificar(amb, snap)[0].estado == cb.ERROR  # INICIO y FINAL en la misma lista


def test_paso_por_orden():
    snap = snap_base()
    sp = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "MOLER", "orden_paso": 4,
               "predecesor": "INICIO DE LA FABRICACION", "predecesor_orden": 2})
    assert cb.planificar(sp, snap)[0].estado == cb.APLICADO  # ya depende de (2)
    mal = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "MOLER", "orden_paso": 5, "sin_predecesor": True})
    assert cb.planificar(mal, snap)[0].estado == cb.ERROR  # el #5 no es MOLER


def test_a_spec_traduce_y_rechaza():
    sol = {"id": 7, "rmd": "2202609013", "resumen": "x", "cambios": [
        {"accion": "cambiar_predecesor", "lista": "PROCEDIMIENTO>FABRICACION", "paso": "MOLER", "sin_predecesor": True},
        {"accion": "configurar_decimal", "lista": "RENDIMIENTO", "paso": "ENTREGADA", "decimal": 2},
    ]}
    sp = so.a_spec(sol)
    assert [c["accion"] for c in sp.cambios] == ["cambiar_predecesor", "configurar_paso"]
    assert sp.cambios[1]["decimal"] == 2 and "Solicitud #7" in sp.descripcion
    with pytest.raises(ValueError):
        so.a_spec({"id": 1, "rmd": "1", "cambios": [{"accion": "autorizar"}]})
    with pytest.raises(ValueError):
        so.a_spec({"id": 1, "rmd": "1", "cambios": []})


def test_decimales_solo_en_datos_numericos():
    snap = snap_base()
    sp = so.a_spec({"id": 1, "rmd": "1", "cambios": [
        {"accion": "configurar_decimal", "lista": "FABRICACION", "paso": "MOLER LA MEZCLA", "decimal": 2}]})
    plan = cb.planificar(sp, snap)
    so._revisar_decimales(plan, snap)
    assert plan[0].estado == cb.ERROR and "Realizado por" in plan[0].mensajes[0]


def test_bot_guiado_solo_ordenes_y_otra_lista():
    """El bot guiado manda solo la lista y los números de orden (sin textos)."""
    snap = snap_base()
    fab = snap["structs"][3]["etq"][1]["p"]
    doc = snap["structs"][3]["etq"][0]["p"]
    misma = spec({"accion": "cambiar_predecesor", "lista": "PROCEDIMIENTO>FABRICACION", "paso": "", "orden_paso": 5,
                  "predecesor_orden": 2})
    a = cb.planificar(misma, snap)[0]
    assert a.estado == cb.PENDIENTE, a.mensajes
    assert a.params["_orden_paso"] == 5 and a.params["_pred"] == (fab[1]["cod"], 2)
    otra = spec({"accion": "cambiar_predecesor", "lista": "PROCEDIMIENTO>FABRICACION", "paso": "", "orden_paso": 5,
                 "predecesor_orden": 2, "predecesor_lista": "PROCEDIMIENTO>DOCUMENTACION"})
    a = cb.planificar(otra, snap)[0]
    assert a.estado == cb.PENDIENTE and a.params["_pred"] == (doc[1]["cod"], 2)
    # nombre aproximado de la lista (si es único)
    aprox = spec({"accion": "cambiar_predecesor", "lista": "FABRICA", "paso": "", "orden_paso": 5, "predecesor_orden": 2,
                  "predecesor_lista": "DOCUMENTA"})
    assert cb.planificar(aprox, snap)[0].estado == cb.PENDIENTE
    sin_lista = spec({"accion": "cambiar_predecesor", "lista": "FABRICACION", "paso": "", "orden_paso": 5,
                      "predecesor_orden": 2, "predecesor_lista": "ENVASE"})
    assert cb.planificar(sin_lista, snap)[0].estado == cb.ERROR


def test_decimales_por_orden():
    snap = snap_base()
    sol = {"id": 9, "rmd": "1", "resumen": "x", "cambios": [
        {"accion": "configurar_decimal", "lista": "PROCEDIMIENTO>RENDIMIENTO", "paso": "", "orden_paso": 3, "decimal": 2}]}
    plan = cb.planificar(so.a_spec(sol), snap)
    so._revisar_decimales(plan, snap)
    assert plan[0].estado in (cb.PENDIENTE, cb.APLICADO), plan[0].mensajes
    assert plan[0].params["_orden_paso"] == 3
    malo = {**sol, "cambios": [{"accion": "configurar_decimal", "lista": "PROCEDIMIENTO>FABRICACION", "paso": "",
                                "orden_paso": 4, "decimal": 2}]}
    plan = cb.planificar(so.a_spec(malo), snap)
    so._revisar_decimales(plan, snap)
    assert plan[0].estado == cb.ERROR  # «Realizado por» no es numérico


MASTERS = [
    {"md_id": "a1", "codigo": "2202600001", "version": 3, "etapa": "FABRICACION", "principal": "2202600001", "estado": "Autorizado", "descripcion": "X"},
    {"md_id": "a2", "codigo": "2202600002", "version": 4, "etapa": "FABRICACION", "principal": "2202600001", "estado": "Ingresado", "descripcion": "X"},
    {"md_id": "a0", "codigo": "2202600000", "version": 2, "etapa": "FABRICACION", "principal": "2202600001", "estado": "Suspendido", "descripcion": "X"},
    {"md_id": "b1", "codigo": "2202600010", "version": 1, "etapa": "ENVASE", "principal": "2202600010", "estado": "Autorizado", "descripcion": "X"},
    {"md_id": "c1", "codigo": "2202600020", "version": 1, "etapa": "INSPECCIÓN", "principal": "2202600020", "estado": "Autorizado", "descripcion": "X"},
]


def test_ubicar_rmd_por_material_etapa_y_lote():
    m, err = so.elegir_rmd(MASTERS, [], "FABRICACION")
    assert m["codigo"] == "2202600001" and not err  # vigente = última Autorizada
    m, _ = so.elegir_rmd(MASTERS, [], "INSPECCION")  # sin tilde igual coincide
    assert m["codigo"] == "2202600020"
    # con lote: manda «Ver OP» (aquí la OP corre en la versión Ingresada)
    m, _ = so.elegir_rmd(MASTERS, [{"md_id": "a2", "orden": "2100000001", "lote": "L123"}], "FABRICACION", "L123")
    assert m["codigo"] == "2202600002"
    m, err = so.elegir_rmd(MASTERS, [{"md_id": "b1", "orden": "1", "lote": "L9"}], "FABRICACION", "L9")
    assert m is None and "Ver OP" in err
    assert so.elegir_rmd(MASTERS, [], "ACONDICIONADO")[0] is None
    dos = MASTERS + [{"md_id": "d1", "codigo": "2202600030", "version": 1, "etapa": "ENVASE", "principal": "2202600030", "estado": "Autorizado", "descripcion": "Y"}]
    m, err = so.elegir_rmd(dos, [], "ENVASE")
    assert m is None and "lote" in err


def test_ubicar_rmd_solo_con_lote():
    """Con el lote basta: los masters vienen de las OP de ese lote (sin material ni etapa)."""
    ops = [{"md_id": "a2", "orden": "2100000001", "lote": "L123"}]
    m, err = so.elegir_rmd([x for x in MASTERS if x["md_id"] == "a2"], ops, "", "L123")
    assert m["codigo"] == "2202600002" and not err
    m, err = so.elegir_rmd([], [], "", "L999")
    assert m is None and "Ver OP" in err
