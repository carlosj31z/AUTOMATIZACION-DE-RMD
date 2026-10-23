// Pruebas de «Comparar dos RMD» (bloque ==COMPARAR== del userscript), sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_comparar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const C = new Function(bloque('// ==COMPARAR-INICIO==', '// ==COMPARAR-FIN==') + '\nreturn Comparar;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

// ---- texto del master (forma de la definición pdfMake del portal) ----
const tabla = (filas, extra = {}) => ({ style: 'tableExample', table: { body: filas }, ...extra });
const doc = (pasos, extra = []) => ({
  header: (p, n) => ({ columns: [tabla([[{ text: 'REGISTRO DE MANUFACTURA', colSpan: 2 }, {}, { text: 'Página: ' }, { text: `${p} de ${n}` }], [{ text: 'SUCRAXOL 1g/5mL' }, { text: '' }, { text: 'Lote: ' }, { text: ' ' }]])] }),
  content: [
    { text: 'PRECAUCIONES', style: 'subheader' },
    tabla([[{ text: '-' }, { text: 'USAR EL UNIFORME COMPLETO.', colSpan: 3 }, { _span: true }, { _span: true }]]),
    { text: '4.-PROCEDIMIENTO', style: 'subheader' },
    tabla([[{ text: '4.1.-DOCUMENTACION' }, { text: '(Colocar check en caso de conformidad)' }]], { style: 'tableColocarCheckNoBorder' }),
    { table: { body: [[{ table: { body: pasos.map((t, i) => [{ text: String(i + 1) }, { text: [{ text: t }, { text: '', bold: true }] }, { text: '' }]) } }]] } },
    ...extra,
    { columns: [tabla([[{ text: 'R' }, { text: 'Nombre y Apellidos' }], [{ text: ' ' }, { text: '' }]])] },
  ],
});
const L = C.lineas(doc(['VERIFICAR LA ORDEN.', 'LIMPIAR LA LINEA.']));
const textos = L.map((x) => x.texto);
ok('cabecera sin el n.º de página ni celdas vacías', J(textos.slice(0, 2)) === J(['REGISTRO DE MANUFACTURA', 'SUCRAXOL 1g/5mL │ Lote:']), J(textos.slice(0, 2)));
ok('celdas unidas con « │ » y sin las de colSpan', textos.includes('- │ USAR EL UNIFORME COMPLETO.'));
ok('tablas anidadas en orden de lectura', textos.indexOf('4.1.-DOCUMENTACION │ (Colocar check en caso de conformidad)') < textos.indexOf('1 │ VERIFICAR LA ORDEN.'));
ok('filas sin texto se omiten', !textos.some((t) => /^R$/.test(t)) && textos.includes('R │ Nombre y Apellidos') && !textos.includes(''));
ok('títulos y sección de cada línea', L.find((x) => x.texto === 'PRECAUCIONES').titulo && L.find((x) => x.texto === '1 │ VERIFICAR LA ORDEN.').seccion === '4.1.-DOCUMENTACION');
ok('la cabecera es su propia sección', L[0].zona === 'cabecera' && L[0].seccion === 'Cabecera');

// ---- emparejar (LCS y anclas) ----
const pares = C.emparejar(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'd', 'e']);
ok('LCS: iguales en orden', J(pares) === J([[0, 0], [2, 2], [3, 3]]), J(pares));
const grande = Array.from({ length: 3000 }, (_, i) => 'l' + i), otro = grande.slice(0, 1500).concat(['nueva'], grande.slice(1500)).filter((x) => x !== 'l10');
const pg = C.emparejar(grande, otro);
ok('tramos largos: 2999 de 3000 emparejadas', pg.length === 2999, String(pg.length));

// ---- comparar ----
const A = C.lineas(doc(['VERIFICAR LA ORDEN DE PRODUCCION.', 'LIMPIAR LA LINEA.', 'PESAR 10 kg DE AZUCAR.']));
const B = C.lineas(doc(['VERIFICAR LA ORDEN DE PRODUCCION.', 'LIMPIAR LA LINEA CON ALCOHOL 70%.', 'PESAR 12 kg DE AZUCAR.', 'REGISTRAR EL PESO EN EL SISTEMA.'], [{ text: 'NOTA FINAL', style: 'subheader' }]));
const R = C.comparar(A, B);
const de = (t) => R.filas.filter((f) => f.tipo === t);
ok('iguales sin marcas', de('igual').every((f) => f.pa.every(([, c]) => !c)));
ok('línea parecida = Modificado', de('modificado').some((f) => /LIMPIAR/.test(B[f.b].texto)), J(de('modificado').map((f) => B[f.b].texto)));
const mod = de('modificado').find((f) => /PESAR/.test(B[f.b].texto));
ok('palabras cambiadas: 10 → 12', mod && J(mod.pa.filter(([, c]) => c).map(([t]) => t)) === J(['10']) && J(mod.pb.filter(([, c]) => c).map(([t]) => t)) === J(['12']), mod && J([mod.pa, mod.pb]));
ok('línea nueva = Agregado', de('agregado').map((f) => B[f.b].texto).join('|') === '4 │ REGISTRAR EL PESO EN EL SISTEMA.|NOTA FINAL', de('agregado').map((f) => B[f.b].texto).join('|'));
ok('cambios seguidos forman uno', R.resumen.cambios === 1 && R.cambios[0].filas === 4, J(R.resumen) + J(R.cambios.map((c) => c.filas)));
ok('sección del cambio', R.cambios[0].seccion === '4.1.-DOCUMENTACION', R.cambios[0].seccion);
ok('resumen por tipo', R.resumen.modificado === 2 && R.resumen.agregado === 2 && R.resumen.quitado === 0, J(R.resumen));
const Q = C.comparar(B, A);
ok('al revés: Quitado', Q.resumen.quitado === 2 && Q.resumen.agregado === 0, J(Q.resumen));
ok('distinto solo en mayúsculas: igual', C.comparar(C.lineas(doc(['Pesar'])), C.lineas(doc(['PESAR']))).resumen.cambios === 0);
ok('línea distinta sin parecido: quitado + agregado', (() => { const r = C.comparar(C.lineas(doc(['ENCENDER EL EQUIPO'])), C.lineas(doc(['TEMPERATURA 25 °C']))); return r.resumen.quitado === 1 && r.resumen.agregado === 1 && r.resumen.modificado === 0; })());
ok('mismo master: sin cambios', C.comparar(A, A).resumen.cambios === 0 && C.comparar(A, A).filas.length === A.length);
ok('parecido', C.parecido('PESAR 10 kg', 'PESAR 12 kg') > 0.6 && C.parecido('ENCENDER', 'TEMPERATURA') === 0);
const t0 = Date.now(), big = (n, f) => Array.from({ length: n }, (_, i) => ({ zona: 'cuerpo', titulo: false, celdas: [], texto: f(i), seccion: '' }));
const rb = C.comparar(big(2500, (i) => `PASO ${i} TEXTO ${i % 7}`), big(2600, (i) => `PASO ${i} TEXTO ${i % 5}`));
ok('2500 × 2600 líneas en menos de 4 s', Date.now() - t0 < 4000 && rb.filas.length >= 2600, `${Date.now() - t0} ms`);

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa.');
process.exit(fallas ? 1 : 0);
