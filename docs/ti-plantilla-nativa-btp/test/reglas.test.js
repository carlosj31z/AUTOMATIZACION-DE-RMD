// Pruebas unitarias de las reglas (sirven de base para la OQ).
// DÓNDE: test/ del proyecto CAP. Se corren con: node --test test/reglas.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../srv/lib/reglas');

test('OQ-01 solo se ingresa en un RMD Ingresado', () => {
  assert.equal(R.puedeIngresar({ estadoIdRmd_iMaestraId: 467 }).ok, true);
  const aut = R.puedeIngresar({ estadoIdRmd_iMaestraId: 465 });
  assert.equal(aut.ok, false); assert.equal(aut.crearVersion, true);
  assert.equal(R.puedeIngresar({ estadoIdRmd_iMaestraId: 468 }).ok, false);
});

test('OQ-02 el reemplazo solo acepta pasos de la misma etiqueta', () => {
  const lista = { estructuraId: 'E1', etiquetaId: 'T1' };
  assert.equal(R.validarReemplazo(lista, { codigo: '1', estructuraId_estructuraId: 'E1', etiquetaId_etiquetaId: 'T1' }).severidad, 'OK');
  assert.equal(R.validarReemplazo(lista, { codigo: '2', estructuraId_estructuraId: 'E1', etiquetaId_etiquetaId: 'T2' }).severidad, 'BLOQUEO');
  assert.equal(R.validarReemplazo(lista, { codigo: '3', estructuraId_estructuraId: 'E1', etiquetaId_etiquetaId: 'T1', activo: false }).severidad, 'BLOQUEO');
  assert.equal(R.validarReemplazo(lista, null).severidad, 'BLOQUEO');
});

test('OQ-03 un texto igual a un paso existente usa ese paso (sin tildes ni mayúsculas)', () => {
  const cat = [{ pasoId: 'P1', codigo: '110910', descripcion: 'Verificar la limpieza de la balanza.' }];
  const r = R.resolverTexto('VERIFICAR  LA LIMPIEZA DE LA BALANZA', cat);
  assert.equal(r.accion, 'USAR'); assert.equal(r.pasoId, 'P1');
  const n = R.resolverTexto('Verificar la limpieza del tamiz', cat);
  assert.equal(n.accion, 'CREAR'); assert.ok(n.parecidos.length >= 1);
});

test('OQ-04 validaciones del Grabar: rango, decimales y Clave Modelo', () => {
  assert.equal(R.validarComoGrabar({ tipoDatoId_iMaestraId: 443, valorInicial: 1, valorFinal: 2, margen: 0, decimales: 1 }).length, 0);
  assert.equal(R.validarComoGrabar({ tipoDatoId_iMaestraId: 443, valorInicial: 1, valorFinal: 2 }).length, 1);
  assert.match(R.validarComoGrabar({ tipoDatoId_iMaestraId: 443, valorInicial: 5, valorFinal: 2, margen: 0, decimales: 1 })[0], /inicial supera/);
  assert.equal(R.validarComoGrabar({ tipoDatoId_iMaestraId: 447 }).length, 1);
  assert.equal(R.validarComoGrabar({ tipoDatoId_iMaestraId: 447, clvModelo: 'X' }).length, 0);
});

test('OQ-05 casillas → tipo de dato', () => {
  assert.equal(R.tipoPorCasillas(true, true, 446), 441);
  assert.equal(R.tipoPorCasillas(true, false, 441), 439);
  assert.equal(R.tipoPorCasillas(false, true, 432), 440);
  assert.equal(R.tipoPorCasillas(false, false, 439), 446);
  assert.equal(R.tipoPorCasillas(true, true, 443), 443);   // un Rango no cambia de tipo
});

test('OQ-06 «Control de Calidad» avisa salvo granel, FPRO-250 y biocarga', () => {
  assert.ok(R.avisoCalidad('Entregar la muestra a Control de Calidad'));
  assert.equal(R.avisoCalidad('Muestra de granel para Control de Calidad'), null);
  assert.equal(R.avisoCalidad('Según FPRO-250, Control de Calidad'), null);
  assert.equal(R.avisoCalidad('Biocarga: Control de Calidad'), null);
  assert.equal(R.avisoCalidad('Entregar a Calidad en Operaciones'), null);
});

test('OQ-07 predecesores: el anterior con tipo, saltando «Sin tipo de dato»', () => {
  const r = R.recalcularPredecesores([
    { id: 'A', tipo: 432 }, { id: 'B', tipo: 446 }, { id: 'C', tipo: 439 }, { id: 'D', tipo: 443 },
  ], 'Z');
  assert.deepEqual(r.map((x) => x.depende), ['Z', null, 'A', 'C']);
});

test('OQ-08 predecesores: detecta ciclos y pasos que ya no están', () => {
  assert.equal(R.revisarPredecesores([{ id: 'A', depende: null }, { id: 'B', depende: 'A' }]).length, 0);
  assert.ok(R.revisarPredecesores([{ id: 'A', depende: 'B' }, { id: 'B', depende: 'A' }]).some((e) => /Ciclo/.test(e)));
  assert.ok(R.revisarPredecesores([{ id: 'A', depende: 'X' }]).some((e) => /ya no está/.test(e)));
  assert.ok(R.revisarPredecesores([{ id: 'A', depende: 'A' }]).some((e) => /sí mismo/.test(e)));
});

test('OQ-09 detecta que el RMD cambió desde la plantilla', () => {
  const b = { fotoHash: 'abc', fotoFechaActualiza: '2026-11-01T10:00:00Z' };
  assert.equal(R.rmdCambio(b, { fechaActualiza: '2026-11-01T10:00:00Z' }, 'abc'), false);
  assert.equal(R.rmdCambio(b, { fechaActualiza: '2026-11-01T10:00:00Z' }, 'xyz'), true);
  assert.equal(R.rmdCambio(b, { fechaActualiza: '2026-11-02T08:00:00Z' }, 'abc'), true);
});

test('OQ-10 la cantidad de insumo queda como tarea manual', () => {
  assert.match(R.esTareaManual({ tipo: 'CANTIDAD_INSUMO' }), /Lista de Materiales/);
  assert.equal(R.esTareaManual({ tipo: 'RANGO' }), null);
});
