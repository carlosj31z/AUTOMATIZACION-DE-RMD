// Pruebas del núcleo para la plantilla de Producción más simple (v1.134.0, pedido de Carlos): avisos solo útiles para Producción,
// pasos homologados de Calidad en Operaciones, documentos vencidos y qué anota Producción en un paso nuevo.
// Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_plantilla_produccion.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const a = fuente.indexOf('  function ppNucleo() {'), b = fuente.indexOf('  const PPN = ppNucleo();');
if (a < 0 || b < a) throw new Error('no encuentro ppNucleo');
const PPN = new Function(fuente.slice(a, b) + '\nreturn ppNucleo();')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

// catálogo mínimo: pasos de la estructura E1 (dos de Calidad en Operaciones de la tabla de homologación de LIMA)
const filas = [
  { codigo: '113476', estr: 'E1', etq: null, tipo: 436, texto: 'FECHA / HORA INICIO:' },
  { codigo: '180901', estr: 'E1', etq: null, tipo: 433, texto: 'CALIDAD EN OPERACIONES REGISTRA LOS RESULTADOS:' },
  { codigo: '180902', estr: 'E1', etq: null, tipo: 440, texto: 'EL JEFE O SUPERVISOR DE LA SECCION VERIFICA LA CONFORMIDAD DEL REGISTRO DE RESULTADOS EMITIDOS POR CALIDAD EN OPERACIONES.' },
  { codigo: '500', estr: 'E1', etq: null, tipo: 446, texto: 'LIMPIAR LA SALA.' },
];
const bus = PPN.crearBuscador(filas.map((f) => ({ ...f })));
const docs = PPN.mapaDocs(['PPRO-200\t5\tVIGENTE\t2030-01-01\tREGISTROS', 'IPRO-E214\t2\tOBSOLETO\t\tCODIFICADORAS', 'IPRO-E221\t3\tVIGENTE\t2020-05-01\tFAJA', 'PCPR-202\t1\tVIGENTE\t\tMUESTREO'].join('\n'));

const base = [{ id: 'e1', estructuraId: 'E1', nombre: 'PROCEDIMIENTO', pasos: [
  { id: 'p1', codigo: '108326', texto: 'FECHA / HORA INICIO :' },
  { id: 'p2', codigo: '161915', texto: 'CONTROL DE CALIDAD REGISTRA LOS RESULTADOS:' },
  { id: 'p3', codigo: '600', texto: 'CODIFICADORAS SEGUN INSTRUCTIVO IPRO-E214 VIGENTE.' },
  { id: 'p4', codigo: '601', texto: 'FAJA TRANSPORTADORA SEGUN INSTRUCTIVO IPRO-E221 VIGENTE.' },
  { id: 'p5', codigo: '602', texto: 'IDENTIFICAR LA LINEA SEGUN POE PPRO-200 VIGENTE.' },
], etiquetas: [], equipos: [], utensilios: [], insumos: [] }];
const trabajo = { estructuras: JSON.parse(JSON.stringify(base)) };
trabajo.estructuras[0].pasos.push(
  { id: 'n:1', nuevo: true, texto: 'APLICAR SOBRE TODO EL PRODUCTO' },
  { id: 'n:2', nuevo: true, texto: 'TEMPERATURA DEL GRANEL (C):', registro: 'rango', vi: '20', vf: '' },
  { id: 'n:3', nuevo: true, texto: 'PESO DEL GRANEL (KG):', registro: 'numero', tipo: 438, decN: '2' },
  { id: 'n:4', nuevo: true, texto: 'LIMPIAR LA SALA.' });
const ctx = (modo) => ({ buscador: bus, etiquetas: new Map(), base, planta: 'PLANTA LIMA', docs, modo });
const prod = PPN.avisos(trabajo, ctx('produccion')), dt = PPN.avisos(trabajo, ctx(''));
const txt = (m, id) => (m.get(id) || []).map((x) => `${x.nivel}:${x.texto}`).join(' | ');

// 1) diferencia de solo un espacio: a Producción no se le avisa; Documentación Técnica sí lo ve al importar
ok('Producción: «FECHA / HORA INICIO :» sin aviso de homologar', !/homolog/i.test(txt(prod, 'p1')), txt(prod, 'p1'));
ok('DOC: sí ve el aviso del paso o los términos', /homolog/i.test(txt(dt, 'p1')), txt(dt, 'p1'));
// 2) Calidad en Operaciones: paso homologado con su botón
const ceo = (prod.get('p2') || []).find((x) => x.k === 'ceo');
ok('Producción: paso homologado de Calidad en Operaciones (161915 -> 180901)', ceo && ceo.usar === '180901' && /Calidad en Operaciones/.test(ceo.texto), txt(prod, 'p2'));
ok('pasosCeo de LIMA trae 180901 y 180902', ['180901', '180902'].every((c) => PPN.pasosCeo('PLANTA LIMA').some((y) => y.codigo === c)));
ok('pasosCeo solo pasos con CALIDAD EN OPERACIONES', PPN.pasosCeo('PLANTA ATE').every((y) => /CALIDAD EN OPERACIONES/.test(y.texto)));
// 3) documentos vencidos
ok('documento obsoleto', /IPRO-E214: figura como «obsoleto»/.test(txt(prod, 'p3')), txt(prod, 'p3'));
ok('documento con validez pasada', /IPRO-E221: venció el 01\/05\/2020/.test(txt(prod, 'p4')), txt(prod, 'p4'));
ok('documento vigente sin aviso', !txt(prod, 'p5'), txt(prod, 'p5'));
ok('documento que no está en la lista (con otros del mismo tipo)', /no figura/.test((PPN.docVencido('PPRO-999', docs) || {}).motivo || ''));
ok('tipo de documento ausente de la lista: no se adivina', PPN.docVencido('FPRO-250', docs) === null);
ok('sin lista: no avisa', PPN.docVencido('IPRO-E214', null) === null);
ok('DOC también ve los documentos vencidos', /IPRO-E214/.test(txt(dt, 'p3')));
// 4) qué anota Producción en un paso nuevo
ok('paso nuevo sin indicar qué se anota: error', /error:Falta indicar qué anota Producción/.test(txt(prod, 'n:1')), txt(prod, 'n:1'));
ok('no repite «el equipo RMD lo creará»', !/equipo RMD/.test(txt(prod, 'n:1')), txt(prod, 'n:1'));
ok('rango sin máximo: error', /error:Indica el valor mínimo y el máximo/.test(txt(prod, 'n:2')), txt(prod, 'n:2'));
ok('número con decimales: sin errores', !/error/.test(txt(prod, 'n:3')), txt(prod, 'n:3'));
ok('paso nuevo que ya existe: aviso con «Usar el paso»', (prod.get('n:4') || []).some((x) => x.k === 'existe' && x.usar === '500'), txt(prod, 'n:4'));
ok('DOC (importación) no exige qué se anota', !/Falta indicar/.test(txt(dt, 'n:1')), txt(dt, 'n:1'));
ok('Producción no recibe avisos «info»', [...prod.values()].flat().every((x) => x.nivel !== 'info'));
// 5) catálogo de opciones
ok('registroDe numero -> tipo 438', (PPN.registroDe('numero') || [])[2] === 438);
ok('tipo 441 -> firmas R. Por y V.B.', PPN.registroDeTipo(441) === 'rpvb' && PPN.registroDeTipo(446, true, false) === 'rpor' && PPN.registroDeTipo(436) === 'fecha');
ok('textos para el portal (plantillas viejas con «dato»)', PPN.REGISTRO_TXT.dato && PPN.REGISTRO_TXT.check === 'Un check de conformidad');
ok('códigos de documento de un texto', PPN.codigosDoc('SEGUN POE PPRO-200 VIGENTE E INSTRUCTIVO IPRO-P212 Y FPRO-250').join(',') === 'PPRO-200,IPRO-P212,FPRO-250');

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodo bien');
process.exit(fallas ? 1 : 0);
