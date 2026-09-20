from __future__ import annotations

import json
from pathlib import Path

import pytest

from rmd_automation.batch import acciones_disponibles, cargar_operaciones


def test_cargar_operaciones_yaml(tmp_path: Path) -> None:
    ruta = tmp_path / "batch.yaml"
    ruta.write_text(
        """
        operaciones:
          - accion: crear_estructura
            params:
              descripcion: "Envase"
              tipo_estructura: "Procesos"
              requiere_verificado_por: true
        """,
        encoding="utf-8",
    )
    operaciones = cargar_operaciones(str(ruta))
    assert operaciones == [
        {
            "accion": "crear_estructura",
            "params": {
                "descripcion": "Envase",
                "tipo_estructura": "Procesos",
                "requiere_verificado_por": True,
            },
        }
    ]


def test_cargar_operaciones_json(tmp_path: Path) -> None:
    ruta = tmp_path / "batch.json"
    ruta.write_text(
        json.dumps({"operaciones": [{"accion": "crear_motivo", "params": {"abreviatura": "AJ", "descripcion": "Ajuste"}}]}),
        encoding="utf-8",
    )
    operaciones = cargar_operaciones(str(ruta))
    assert operaciones[0]["accion"] == "crear_motivo"


def test_accion_desconocida_lanza_error(tmp_path: Path) -> None:
    ruta = tmp_path / "batch.yaml"
    ruta.write_text("operaciones:\n  - accion: accion_que_no_existe\n", encoding="utf-8")
    with pytest.raises(ValueError):
        cargar_operaciones(str(ruta))


def test_sin_clave_operaciones_lanza_error(tmp_path: Path) -> None:
    ruta = tmp_path / "batch.yaml"
    ruta.write_text("otra_clave: []\n", encoding="utf-8")
    with pytest.raises(ValueError):
        cargar_operaciones(str(ruta))


def test_ejemplo_del_repo_es_valido() -> None:
    ruta_ejemplo = Path(__file__).resolve().parent.parent / "examples" / "batch_ejemplo.yaml"
    operaciones = cargar_operaciones(str(ruta_ejemplo))
    assert len(operaciones) > 0
    for accion in acciones_disponibles():
        assert isinstance(accion, str)
