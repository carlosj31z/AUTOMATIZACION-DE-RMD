# Scripts del análisis de suspendidos → INACTIVO

Copia de los scripts usados del 2026-11-05 al 2026-11-07. Contexto, criterios,
cifras y decisión final: `docs/suspendidos_inactivo.md`.

- `leer_md_suspendidos.js` + `correr.py`: leen `/MD` y `/MD_RECETA` del portal
  (solo lectura, Chrome de pruebas puerto 9222) → `md_lectura.json`.
- `leer_traz.js`: lee `MD_TRAZABILIDAD` (solo lectura) → `md_traz.json`.
- `a2.py`: familias de master, última versión, cobertura por RMD autorizado,
  lotes (COOISPI) y forecast → clasificación. `a3.py`, `a4.py`: ajustes y
  términos claros. `a5.py`: decisión sugerida simple (ACTUALIZAR / REVISAR /
  PASAR A INACTIVO / NO CONSIDERAR) con la última suspensión de trazabilidad.
- `xl.py`, `xl3.py`: arman los Excel v2 y v4. `generar_ppt_decision.js`: PPT de la
  decisión del equipo (pptxgenjs).

Los scripts leen pickles (`md.pkl`, `rc.pkl`, `coois.pkl`, `fc.pkl`, `traz.pkl`)
armados a mano desde los JSON, la COOISPI y el forecast; ese paso no quedó
guardado. Los datos no se suben al repo.
