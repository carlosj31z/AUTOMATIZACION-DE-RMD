// Pruebas del libro de indicadores y del Excel propio (bloques ==XLSX== e ==INDICADORES== del userscript), sin portal ni
// navegador: solo Node 18+. Los valores esperados de las columnas calculadas son los que calculó Excel en el archivo real de
// agosto de 2026 (se comprobaron las 11 013 filas; aquí quedan los casos representativos y los raros).
//     node tampermonkey/pruebas/qa_indicadores.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => fuente.slice(fuente.indexOf(ini), fuente.indexOf(fin));
const { Xlsx, Indicadores } = new Function(bloque('// ==XLSX-INICIO==', '// ==XLSX-FIN==') + bloque('// ==INDICADORES-INICIO==', '// ==INDICADORES-FIN==') + '\nreturn { Xlsx, Indicadores };')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const v = (x) => (Xlsx.esError(x) ? x.error : x);
const cerca = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9;
const ANIO = new Date().getFullYear(), serial = (a, m, d) => (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;

// ---- columnas calculadas (MID, TEXT "0000-00-00", NETWORKDAYS y productos, con las conversiones de Excel) ----
const c1 = Indicadores.calculadas('20260527DV-3-C0.5-FI1.0-FA1.0-F1\n25-180-CC', '2026-06-03');
ok('Observación con formato: fecha, iniciales, prioridad, FC/FI/FA', c1.S === '20260527' && c1.T === '2026-05-27' && c1.V === 'DV' && c1.W === '3' && c1.Y === '0.5' && c1.Z === '1.0' && c1.AA === '1.0', JSON.stringify(c1));
ok('RMD ING y RMD APR = FC × FI y FC × FA', c1.AC === 0.5 && c1.AD === 0.5);
ok('Días hábiles de miércoles a miércoles de la semana siguiente = 6', c1.U === 6, String(v(c1.U)));
ok('Sin Fecha Autorización: NETWORKDAYS contra la celda vacía (igual que Excel)', [['20260527DV-3-C0.5-FI1.0-FA1.0-F1', -32978], ['20260526DV-3', -32977], ['20260429JC-3', -32958], ['20260709VM-1', -33009]]
  .every(([obs, dias]) => Indicadores.calculadas(obs, '').U === dias));
const c2 = Indicadores.calculadas('20240123CR-2\nCAMBIO DE PUESTO DE TRABAJO', '2024-02-19');
ok('Observación sin FC/FI/FA: productos #VALUE!, días 20', c2.U === 20 && c2.Y === 'AMB' && v(c2.AC) === '#VALUE!' && v(c2.AD) === '#VALUE!', JSON.stringify(c2));
ok('Observación vacía: F.I Real vacío y Días #VALUE!', (() => { const c = Indicadores.calculadas('', '2026-08-01'); return c.S === '' && c.T === '' && v(c.U) === '#VALUE!' && v(c.AC) === '#VALUE!'; })());
ok('Texto no numérico queda igual en F.I Real', Indicadores.texto0000('PEND CC ') === 'PEND CC ' && v(Indicadores.networkdays('PEND CC ', null)) === '#VALUE!');
ok('"13/04/20" es fecha para Excel en español (13/04/2020): F.I Real "0004-39-34"', Indicadores.texto0000('13/04/20') === '0004-39-34');
ok('"2-2" se multiplica como fecha del año en curso', cerca(Indicadores.aNumero('2-2') * 201, 201 * serial(ANIO, 2, 2)));
ok('"07:" es una hora (7/24)', cerca(Indicadores.aNumero('07:'), 7 / 24));
ok('"- 2" es −2 y "1.0" es 1', Indicadores.aNumero('- 2') === -2 && Indicadores.aNumero('1.0') === 1 && Indicadores.aNumero(' 022') === 22);
ok('Un salto de línea no se ignora: "\\n20" y "1 \\n" no son números', Indicadores.aNumero('\n20') === null && Indicadores.aNumero('1 \n') === null && Indicadores.aNumero('-1\n') === null);

// ---- A/F ----
const d = (s) => new Date(s);
const af = (f) => Indicadores.afDelMes({ estado: 'Ingresado', af: 'SI', observacion: '', fechaAut: '', fechaRegistro: null, fechaSolicitud: null, ...f }, 8, 2026);
ok('A/F: registrado en el mes', af({ fechaRegistro: d('2026-08-10T15:00:00Z') }) === 'AGOSTO');
ok('A/F: autorizado en el mes', af({ estado: 'Autorizado', fechaRegistro: d('2026-06-10T15:00:00Z'), fechaAut: '2026-08-03' }) === 'AGOSTO');
ok('A/F: ingreso real (inicio de la Observación) en el mes', af({ fechaRegistro: d('2026-07-03T20:12:28Z'), observacion: '20260804NC-1-C1.0' }) === 'AGOSTO');
ok('A/F: sin registro y solicitado en el mes', af({ estado: 'Solicitado', fechaSolicitud: d('2026-08-14T14:18:15Z') }) === 'AGOSTO');
ok('A/F: abierto y de antes del mes -> ANTIGUO', af({ fechaRegistro: d('2026-05-02T15:00:00Z'), observacion: '20260502VM-1' }) === 'ANTIGUO');
ok('A/F: abierto pero creado después del cierre -> valor de SAP', af({ fechaRegistro: d('2026-09-05T15:00:00Z'), af: '' }) === '');
ok('A/F: autorizado en otro mes -> valor de SAP', af({ estado: 'Autorizado', fechaRegistro: d('2026-03-02T15:00:00Z'), fechaAut: '2026-03-05' }) === 'SI');
ok('A/F: la fecha va en UTC, como el Exportar nativo (31/08 22:15 UTC es agosto)', af({ fechaRegistro: d('2026-08-31T22:15:17Z') }) === 'AGOSTO' && af({ fechaRegistro: d('2026-09-01T01:00:00Z'), estado: 'Autorizado' }) === 'SI');

// ---- "No contar" sugerido ----
const sug = (f, ant, x) => (Indicadores.sugerirNoContar({ estado: 'Ingresado', observacion: '', codigo: '2202608001', codigoSolicitud: '', version: '1', ...f }, ant, x) || {}).valor;
const anteriores = new Map([['C:2202608001', 'PEND JEF/GER'], ['C:2202608002', 'NO CONTAR']]);
ok('No contar: del mes anterior (variante PEND JEF/GER normalizada)', sug({}, anteriores) === 'PEND JEFE/GER');
ok('No contar: un PEND del mes anterior no pasa a un RMD ya Autorizado', sug({ estado: 'Autorizado' }, anteriores) === undefined);
ok('No contar: NO CONTAR del mes anterior se mantiene aunque ya esté Autorizado', sug({ estado: 'Autorizado', codigo: '2202608002' }, anteriores) === 'NO CONTAR');
ok('No contar: "PENDIENTE CC" en la Observación', sug({ observacion: '20260827DV-1-C2.0-FI1.0-FA1.0-F2R\nPENDIENTE CC' }) === 'PEND CC');
ok('No contar: "PEND CCAMBIO" no es PEND CC', sug({ observacion: 'PEND CCAMBIO' }) === undefined);
ok('No contar: "pendiente aprobación jefe"', sug({ observacion: 'obs: pendiente aprobación jefe' }) === 'PEND JEFE/GER');
ok('No contar: "NO CONTAR" en la Observación', sug({ estado: 'Autorizado', observacion: 'BORRADOR - NO CONTAR' }) === 'NO CONTAR');
ok('No contar: Observación sin formato que dejaría el total en error', sug({ estado: 'Suspendido' }, null, { errorEnSuma: true }) === 'NO CONTAR');
ok('No contar: sigue Ingresado con fecha de autorización del mes -> PEND CC', sug({}, null, { autEnMes: true }) === 'PEND CC');
ok('Normaliza variantes', Indicadores.normalizarNoContar('PEND JEFE/GEREN') === 'PEND JEFE/GER' && Indicadores.normalizarNoContar('pend nc') === 'PEND CC' && Indicadores.normalizarNoContar(' revisar ') === 'REVISAR');

// ---- el libro completo, y leerlo de vuelta como "archivo del mes anterior" ----
const md = (codigo, estado, reg, fechaAut, observacion, planta = 'PLANTA ATE', usuarioAutorizacion = '') => ({ codigo, codigoSolicitud: '', version: '1', estado, codDefecto: '', codAgrupador: '',
  descripcion: 'PRODUCTO ' + codigo, etapa: 'ACONDICIONADO', fechaRegistro: d(reg), usuarioRegistro: 'X', fechaAut, usuarioAutorizacion, af: estado === 'Autorizado' ? 'SI' : '',
  fechaSolicitud: d(reg), planta, seccion: 'ACONDICIONADO', motivo: 'CONTROL DE CAMBIO', observacion });
const filas = [
  md('2202608001', 'Autorizado', '2026-08-03T15:00:00Z', '2026-08-05', '20260803NC-1-C1.0-FI1.0-FA1.0-F1', 'PLANTA ATE', 'NCUELLARL'),
  md('2202608002', 'Autorizado', '2026-08-04T15:00:00Z', '2026-08-06', '20260804JQ-2-C0.5-FI1.0-FA1.0-F2', 'PLANTA ATE', 'JQUISPEP'),
  md('2202608003', 'Ingresado', '2026-08-10T15:00:00Z', '', '20260810VM-1-C2.0-FI1.0-FA1.0-F1', 'PLANTA LIMA'),
  md('2202608004', 'Ingresado', '2026-05-10T15:00:00Z', '', '20260510DV-3-C3.0-FI1.0-FA1.0-F1\nPENDIENTE CC', 'PLANTA LIMA'),
  md('2202400005', 'Suspendido', '2024-01-10T15:00:00Z', '2024-01-12', '20240110CR-1', 'PLANTA LIMA', 'KMORENOM'),
];
const previo = { noContar: new Map(), pl1: [{ estado: 'Por hacer solicitud', descripcion: 'PRODUCTO NUEVO X', presentacion: 'x 10', etapa: 'ACONDICIONADO', af: '' }],
  pl2: [{ estado: 'solicitado', descripcion: 'PRODUCTO 2202608003', etapa: 'ACONDICIONADO', af: 'ANTIGUO', seccion: 'COS', noContar: 'POR INGRESAR' }] };
const { libro, nombre, resumen } = Indicadores.construir({ filas, mes: 8, anio: 2026, previo, generado: new Date() });
ok('Nombre del archivo como el del equipo', nombre === 'BD RMD AGOSTO 2026 - P1-P2.xlsx', nombre);
ok('Resumen: autorizados 1.5 (2 RMD), ingresados 3.5, TOTAL DE RMD 6', resumen.autorizados === 1.5 && resumen.autorizadosCuenta === 2 && resumen.ingresados === 3.5 && resumen.totalRmd === 6, JSON.stringify(resumen));
ok('Resumen: PEND PL2 que ya está en SAP se marca para revisar', resumen.posibles === 1 && resumen.pl1 === 1 && resumen.pl2 === 1);
const u8 = await libro.generar();
const z = await Xlsx.leerZip(u8);
const tablas = z.nombres.filter((n) => /^xl\/pivotTables\/pivotTable\d+\.xml$/.test(n));
ok('7 tablas dinámicas y una tabla de Excel de origen', tablas.length === 7 && z.nombres.includes('xl/tables/table1.xml') && /worksheetSource name="DatosRMD"/.test(await z.leer('xl/pivotCache/pivotCacheDefinition1.xml')));
const nombresTablas = await Promise.all(tablas.map(async (n) => /name="([^"]+)"/.exec(await z.leer(n))[1]));
ok('Mismos nombres de tablas dinámicas que el archivo del equipo', ['Tabla dinámica1', 'Tabla dinámica2', 'Tabla dinámica4', 'Tabla dinámica5', 'Tabla dinámica6', 'Tabla dinámica7', 'Tabla dinámica8'].every((n) => nombresTablas.includes(n)), nombresTablas.join(', '));
const leido = await Xlsx.leerLibro(u8);
ok('Hojas y orden del archivo del equipo', JSON.stringify(leido.hojas) === JSON.stringify(['Exportación SAPUI5', 'PEND PL1', 'PEND PL2', 'RESUMEN', 'Hoja1']), leido.hojas.join(', '));
const datos = await leido.filas('Exportación SAPUI5');
ok('Hoja de datos: 30 columnas, 5 RMD + 2 PEND', datos[0].length === 30 && datos.length === 8 && datos[0][29] === 'RMD APR');
ok('Hoja de datos: fecha de registro en UTC como número de serie', cerca(datos[1][8], Date.parse('2026-08-03T15:00:00Z') / 86400000 + 25569));
ok('Hoja de datos: PEND PL1 entra con su estado y como ANTIGUO', datos[7][3] === 'Por hacer solicitud' && datos[7][12] === 'ANTIGUO' && datos[7][14] === 'PLANTA ATE');
ok('Hoja de datos: "No contar" sugerido y su motivo en "Por revisar"', datos[4][23] === 'PEND CC' && /Revisar "No contar"/.test(datos[4][27] || ''));
const releido = await Indicadores.leerPrevio(u8);
ok('Se puede usar como "archivo del mes anterior": trae PEND y No contar', releido.pl1.length === 1 && releido.pl2.length === 1 && releido.noContar.get('C:2202608004') === 'PEND CC' && releido.pl1[0].descripcion === 'PRODUCTO NUEVO X');

console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallas ? 1 : 0);
