// v1.150.0: el Excel de V°B° sale de un rango de fechas (vbArmarFilas con 'AAAA-MM-DD'), y por mes sigue igual.
import fs from 'fs';
import assert from 'assert';
const s = fs.readFileSync(new URL('../rmd-ui-mejoras.user.js', import.meta.url), 'utf8');
const ini = s.indexOf('  const VB_PLANTAS = '), fin = s.indexOf('  async function vbConteos(');
const { vbArmarFilas } = new Function(s.slice(ini, fin) + '\nreturn { vbArmarFilas };')();
const d = (iso) => new Date(iso + 'T00:00:00Z');
const v = (codigo, version, estado, registro, autorizacion, extra = {}) => ({ mdId: codigo + version, codigo, version, estado, registro: d(registro), autorizacion: autorizacion ? d(autorizacion) : null, observacion: '', principal: 'P' + codigo.slice(0, 3), planta: '1020', ...extra });
const maestro = [
  v('A01', 1, 'Suspendido', '2026-06-01', '2026-06-05'), v('A02', 2, 'Autorizado', '2026-10-20', '2026-10-25'),   // autorizado en octubre
  v('B01', 1, 'Autorizado', '2026-05-01', '2026-05-02'), v('B02', 2, 'Ingresado', '2026-11-03', null),              // ingresado en noviembre
  v('C01', 1, 'Autorizado', '2026-03-01', '2026-03-02'), v('C02', 2, 'Ingresado', '2026-09-28', null, { observacion: '20261002 ingreso' }), // ingreso 02/10
  v('D01', 1, 'Autorizado', '2026-01-01', '2026-01-02'),                                                             // sin movimiento
];
const cods = (f) => f.map((x) => x.ult.codigo).sort().join(',');
assert.strictEqual(cods(vbArmarFilas(maestro, 2026, 11)), 'B02', 'por mes: noviembre');
assert.strictEqual(cods(vbArmarFilas(maestro, 2026, 10)), 'A02,C02', 'por mes: octubre');
assert.strictEqual(cods(vbArmarFilas(maestro, '2026-10-01', '2026-11-20')), 'A02,B02,C02', 'rango 01/10–20/11');
assert.strictEqual(cods(vbArmarFilas(maestro, '2026-10-25', '2026-10-25')), 'A02', 'el último día entra');
assert.strictEqual(cods(vbArmarFilas(maestro, '2026-10-26', '2026-11-02')), '', 'fuera del rango');
assert.strictEqual(cods(vbArmarFilas(maestro, '2026-09-01', '2026-12-31')), 'A02,B02,C02', 'registro del 28/09 también');
console.log('qa_vb_rango: 6 pruebas OK');
