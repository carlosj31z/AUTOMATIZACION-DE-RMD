// Pruebas del lector de controles de cambio y pendientes de las Observaciones (bloque ==PENDIENTES== del userscript), sin portal ni
// navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_pendientes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const Pendientes = new Function(bloque('// ==PENDIENTES-INICIO==', '// ==PENDIENTES-FIN==') + '\nreturn Pendientes;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);

// ---- códigos de CC ----
ok('CC: 26-379-CC, 26-379 CC y CC 26-379 dan el mismo código', J(Pendientes.ccsDe('26-379-CC; 26-380 CC; CC 26-381; CC N° 26-382')) === '["26-379-CC","26-380-CC","26-381-CC","26-382-CC"]', J(Pendientes.ccsDe('26-379-CC; 26-380 CC; CC 26-381; CC N° 26-382')));
ok('CC: no confunde una fecha ni un código de equipo', Pendientes.ccsDe('2026-10-13 MEN-E034 20261022CJ-1-C1.0').length === 0);

// ---- líneas de CC aplicados (los ejemplos reales) ----
const ejemplos = `20261013LF-1-C1.0-FI1.0-FA1.0-F1
26-360-CC/L.Fernandez/2026-10-13;Nuevo Fabricante para la MP Medroxiprogesterona;insumo;Moderado.
26-361-CC/S.Chullo//2026-10-13;RMD (Acondicionado)  CLARIMED MM-  ECUADOR;Proceso;moderado.

26-363-CC/L.Fernandez/2026-10-15; ACTUALIZACIÓN DE RMD LEVODANTINA 500 mg TAB REC CARACTERIZACION DE PROCESOS;proceso;moderado.
26-356-CC/G.Guevara/2026-10-15;MODIFICACIÓN RMD FAB/ENV/ACO Epiteliol NF 50 000 UI Tableta   Recubierta;proceso;moderado.
26-371-CC/L.Fernandez/2026-10-19;Reemplazar la Chaqueta de Calentamiento N.° 1 (MEN-E034), de fabricación del producto Mentholatum; proceso; moderado
26-379-CC/L.Fernandez/2026-10-22; ACTUALIZACION RMD ACO GASEOVET CB 500mg CAP BLANDA B5 CJA X 30;proceso,moderado.`;
const a = Pendientes.analizar(ejemplos);
ok('Ejemplos: los 6 CC salen como aplicados, en orden', J(a.aplicados.map((x) => x.codigo)) === '["26-360-CC","26-361-CC","26-363-CC","26-356-CC","26-371-CC","26-379-CC"]', J(a.aplicados.map((x) => x.codigo)));
ok('Ejemplos: ninguno es pendiente (la nomenclatura tampoco)', a.pendientes.length === 0 && a.hechos.length === 0);
const e361 = a.aplicados[1], e356 = a.aplicados[3], e371 = a.aplicados[4], e379 = a.aplicados[5];
ok('Partes: responsable y fecha aunque haya «//»', e361.responsable === 'S.Chullo' && e361.fecha === '2026-10-13', J(e361));
ok('Partes: la «/» dentro de la descripción no la corta', e356.descripcion.startsWith('MODIFICACIÓN RMD FAB/ENV/ACO') && e356.tipo === 'proceso' && e356.nivel === 'moderado', J(e356));
ok('Partes: tipo y nivel con espacios y sin punto final', e371.tipo === 'proceso' && e371.nivel === 'moderado' && /Mentholatum$/.test(e371.descripcion), J(e371));
ok('Partes: «proceso,moderado.» separa tipo y nivel', e379.tipo === 'proceso' && e379.nivel === 'moderado' && /CJA X 30$/.test(e379.descripcion), J(e379));
ok('Varias entradas de CC en la misma línea se separan', J(Pendientes.analizar('26-401-CC/A/2026-01-01;x;proceso;menor 26-402-CC/B/2026-01-02;y;insumo;mayor').aplicados.map((x) => x.codigo)) === '["26-401-CC","26-402-CC"]');

// ---- pendientes ----
const pend = (t) => Pendientes.analizar(t).pendientes.map((p) => p.linea);
ok('Pendiente: «Se suspende por 26-379-CC»', J(Pendientes.analizar('20261022CJ Se suspende por 26-379-CC').pendientes.map((p) => p.ccs)) === '[["26-379-CC"]]');
ok('Pendiente: «Suspendido por actualización de fórmula (CC 26-300)»', J(Pendientes.analizar('20260924 Suspendido por actualización de fórmula (CC 26-300)').pendientes[0].ccs) === '["26-300-CC"]');
ok('Pendiente: «Pendiente aplicar…», «Falta…», «… en la siguiente versión», «por actualizar»', pend('Pendiente aplicar cambio de lote\nFalta incluir la nota de seguridad\nSe corregirá en la próxima versión\nEspecificación por actualizar').length === 4);
ok('No es pendiente: «Se aplicó lo pendiente del 26-379-CC» (ya hecho)', pend('Se aplicó lo pendiente del 26-379-CC').length === 0 && Pendientes.analizar('Se aplicó lo pendiente del 26-379-CC').hechos.length === 1);
ok('No es pendiente: una observación normal', pend('20261001CJ Actualización de Lista de Materiales').length === 0);

// ---- frases reales de las Observaciones (lectura de 12.926 MD, oct-2026) ----
const esPend = (l) => Pendientes.analizar(l).pendientes.length === 1;
const motivos = ['20250310VM SE SUSPENDE POR NUEVA VERSION', '20250310VM SE SUSPENDE POR NUEVA VERSION CC FASE 2', '20240101 JC SUSPENDIDO POR MIGRACION',
  '20250310VM SE SUSPENDE POR NC EPP AUDITORIA INT', '20250310JQ-SE SUSPENDE POR ANTIGUEDAD, VOLVER A INGRESAR', '20250310YH-CC FASE 1( CORREO 15 DE MAYO)',
  'CONTROL DE CAMBIO 24-161-CC: BETACORT DEPOT 5mg/mL + 2mg/mL Suspensión Inyectable'];
motivos.forEach((l) => ok(`Motivo, no pendiente: «${l}»`, !esPend(l), J(Pendientes.analizar(l))));
const reales = ['20250310JC SE SUSPENDE, PENDIENTE FASE I', '20250310VM SE SUSPENDE POR CC LOTIZADO PENDIENTE.', 'PENDIENTE CC', 'OBS: PENDIENTE CC', '- PENDIENTE CONTROL DE CAMBIO.',
  '20250310VM SE SUSPENDE PENDIENTE ACTUALIZAR CC FASE 2', '20250310VM SE SUSPENDE POR CC', '20250310VM SE SUSPENDE POR CC LOTIZADO PEND', '20250310JQ SE SUSPENDE POR CC 24-110',
  '20250310VM SE SUSPENDE POR CAMBIO DE TERMOMETRO 24-095-CC *A1*', 'SE SUSPENDE POR 24-101 -CC (PESADO DE CAJAS) Y 24-102-CC (BALANZAS PEN)- VERIFICAR FAJAS', '20250310JQ-SE SUSPENDE CC-24-133 INCLUSION DE ENCINTADORA DE CAJAS'];
reales.forEach((l) => ok(`Pendiente real: «${l}»`, esPend(l), J(Pendientes.analizar(l))));
ok('Pendiente real: «24-101 -CC … Y 24-102-CC» da los dos CC', J(Pendientes.analizar(reales[10]).pendientes[0].ccs) === '["24-101-CC","24-102-CC"]');
ok('Pendiente real: «CC-24-133» y «CC 24-110» dan el código', J(Pendientes.analizar(reales[11]).pendientes[0].ccs) === '["24-133-CC"]' && J(Pendientes.analizar(reales[8]).pendientes[0].ccs) === '["24-110-CC"]');
const apl = (l) => Pendientes.analizar(l).aplicados;
let x = apl('24-120-CC / V.REYES / 10-05-2024/ ACTUALIZACION DE UTENSILIOS Y ACCESORIOS EN FAB');
ok('Aplicado: «/ V.REYES / 10-05-2024/ …» con espacios y fecha día-mes-año', x.length === 1 && x[0].responsable === 'V.REYES' && x[0].fecha === '10-05-2024' && /^ACTUALIZACION DE UTENSILIOS/.test(x[0].descripcion), J(x));
x = apl('CC-24-118-CC/F.ARONI/2024-06-01; REEMPLAZO DE LAS PANTALLAS REVISADORAS; EQUIPO; MENOR');
ok('Aplicado: «CC-24-118-CC/…» con el prefijo CC-', x.length === 1 && x[0].codigo === '24-118-CC' && x[0].responsable === 'F.ARONI' && x[0].nivel === 'MENOR', J(x));
x = apl('20250310LR-1-C1.0-FI1.0-FA1.0 CONTROL DE CAMBIO 24-140-CC INCLUSION DE LOTIZADO EN ACO');
ok('Aplicado: nomenclatura + «CONTROL DE CAMBIO 24-140-CC …»', x.length === 1 && x[0].codigo === '24-140-CC' && /^INCLUSION DE LOTIZADO/.test(x[0].descripcion), J(x));
x = apl('CONTROL DE CAMBIO 24-161-CC: BETACORT DEPOT 5mg/mL + 2mg/mL Suspensión Inyectable');
ok('Aplicado: «CONTROL DE CAMBIO 24-161-CC: …» (la forma «Suspensión» no lo vuelve pendiente)', x.length === 1 && x[0].codigo === '24-161-CC', J(x));
ok('Aplicado: «24-150-CC FLUJO DE AIRE» sin responsable', apl('24-150-CC FLUJO DE AIRE')[0].descripcion === 'FLUJO DE AIRE');

// ---- pendientes heredados entre versiones ----
const v4 = { version: 4, codigo: '2202600004', estado: 'Suspendido', observacion: '26-300-CC/X/2026-01-01;algo;proceso;menor\n20261022CJ Se suspende por 26-379-CC\nPendiente: actualizar especificación de dureza' };
let h = Pendientes.heredados([v4], { version: 5, observacion: '20261023CJ-1-C1.0-FI1.0-FA1.0-F1' });
ok('Heredado: v5 sin el 26-379-CC avisa que falta aplicarlo (desde la v4)', J(h.ccs.map((x) => [x.cc, x.version])) === '[["26-379-CC",4]]', J(h.ccs));
ok('Heredado: el pendiente sin CC de la v4 se muestra para revisar', h.textos.length === 1 && /dureza/.test(h.textos[0].linea));
h = Pendientes.heredados([v4], { version: 5, observacion: '26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado' });
ok('Heredado: si la v5 registra el 26-379-CC ya no avisa', h.ccs.length === 0 && J(h.aplicados.map((x) => [x.codigo, x.heredado])) === '[["26-379-CC",false]]');
h = Pendientes.heredados([v4], { version: 5, observacion: v4.observacion });
ok('Heredado: con las Observaciones copiadas de la v4, el pendiente sigue y el CC de la v4 sale como anterior', h.ccs.length === 1 && h.propios.length === 0 && h.aplicados[0].heredado === true, J(h));
h = Pendientes.heredados([v4, { version: 5, codigo: '2202600005', estado: 'Suspendido', observacion: 'Sin cambios' }], { version: 6, observacion: '' });
ok('Heredado: solo se mira la versión inmediatamente anterior (lo de la v4 no llega a la v6)', h.ccs.length === 0 && h.textos.length === 0, J(h));
const v5 = { version: 5, codigo: '2202600005', estado: 'Autorizado', observacion: '26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado' };
h = Pendientes.heredados([v4, v5], { version: 6, observacion: '' });
ok('Heredado: resuelto en una versión intermedia (v5) no se avisa en la v6; el texto tampoco tras una autorizada', h.ccs.length === 0 && h.textos.length === 0, J(h));
h = Pendientes.heredados([{ ...v4, estado: 'Cancelado' }], { version: 5, observacion: '' });
ok('Heredado: no se leen las versiones Canceladas', h.ccs.length === 0 && h.textos.length === 0);
h = Pendientes.heredados([], { version: 1, observacion: 'Falta la firma de Calidad' });
ok('Propio: lo anotado como pendiente en la versión abierta se lista', h.propios.length === 1);

// ---- tipos de línea, baja / descontinuado, formato y plantillas ----
const tipos = (t) => Pendientes.analizar(t).tipos.map((x) => x.tipo);
ok('Tipos: nomenclatura, CC, pendiente, motivo de suspensión, actualización, nota y baja', J(tipos(`20261013LF-1-C1.0-FI1.0-FA1.0-F1
26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado
PENDIENTE CC
20250310VM SE SUSPENDE POR NUEVA VERSION
20260929CJ Actualización de Lista de Materiales
20260930CJ Revisado con Producción
20261022CJ Producto descontinuado, no ingresar nuevas versiones`)) === '["nomenclatura","cc","pendiente","suspension","actualizacion","nota","baja"]', J(tipos('')));
['20261022CJ Dar de baja el producto', 'PRODUCTO DESCONTINUADO', 'Se da de baja por falta de demanda', 'Ya no se fabrica', 'DISCONTINUADO - NO INGRESAR'].forEach((l) => ok(`Baja: «${l}»`, Pendientes.analizar(l).bajas.length === 1));
['SE SUSPENDE POR EQUIPO DE BAJA MEN-E034', 'Balanza BAL-12 dada de baja, se cambia por BAL-20', 'Paso de baja reemplazado'].forEach((l) => ok(`No es baja del producto: «${l}»`, Pendientes.analizar(l).bajas.length === 0));
h = Pendientes.heredados([{ version: 3, codigo: 'A3', estado: 'Suspendido', observacion: 'Producto descontinuado por Marketing' }], { version: 4, observacion: '' });
ok('Baja heredada: lo anotado en una versión anterior se avisa en la siguiente', h.bajas.length === 1 && h.bajas[0].version === 3);
ok('Formato: «26-379-CC/L.Fernandez/;Actualización» avisa lo que falta', J(Pendientes.faltantesCC('26-379-CC/L.Fernandez/;Actualización')) === '["fecha","tipo (proceso, insumo…)","nivel (menor, moderado, mayor)"]', J(Pendientes.faltantesCC('26-379-CC/L.Fernandez/;Actualización')));
ok('Formato: una línea completa no avisa', Pendientes.faltantesCC('26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado').length === 0);
h = Pendientes.heredados([], { version: 2, observacion: '26-379-CC/L.Fernandez/;Actualización' });
ok('Formato: heredados lo informa para la versión abierta', h.formato.length === 1);
const pl = Pendientes.plantilla('cc', { fecha: new Date(2026, 9, 22), iniciales: 'CJ', responsable: 'C.Jesus' });
ok('Plantilla CC: «26-###-CC/C.Jesus/2026-10-22;descripción;proceso;moderado» con «###» seleccionado', pl.texto === '26-###-CC/C.Jesus/2026-10-22;descripción;proceso;moderado' && pl.texto.slice(...pl.sel) === '###', J(pl));
const pp = Pendientes.plantilla('pendiente', { fecha: new Date(2026, 9, 22), iniciales: 'CJ' });
ok('Plantilla pendiente: fecha + iniciales y el CC seleccionado; se reconoce como pendiente', pp.texto === '20261022CJ Pendiente aplicar 26-###-CC' && Pendientes.analizar(pp.texto).pendientes.length === 1, J(pp));
ok('Plantilla baja: se reconoce como baja', Pendientes.analizar(Pendientes.plantilla('baja', { iniciales: 'CJ' }).texto + 'motivo').bajas.length === 1);

// ---- NC / DES y listado de controles de cambio (Excel «CC-NC-DES para actualizar RMD») ----
ok('NC/DES: 24-1012-DES, 22-1221-D, NC 24-1012, NC-24-2044-DES, DES-24-1137', J(Pendientes.ccsDe('24-1012-DES; 22-1221-D; NC 23-1128; NC-24-2044-DES; DES-24-1137')) === '["24-1012-DES","22-1221-DES","23-1128-DES","24-2044-DES","24-1137-DES"]', J(Pendientes.ccsDe('24-1012-DES; 22-1221-D; NC 23-1128; NC-24-2044-DES; DES-24-1137')));
const hojasCC = [
  { hoja: 'PLANTA 1', filas: [null, ['AREA', 'ETAPA ', 'APLICA', 'DESCRIPCION DEL CAMBIO', 'FECHA', 'OBSERVACION', 'NOMENCLATURA PARA OBSERVACIONES', 'ESTATUS DE FILE'],
    ['GV2', 'ENV-ACO', 'SI', 'CC-26-280 Muestras de análisis', '2026-08-17', '', '26-280/D.Ayala /2026-08-17/ACTUALIZACIÓN DE RMDS ENV, ACO GV2/Proceso/Mayor.', 'conforme'],
    ['BEB', 'FAB', 'NO', 'PEND-28-11-2023 NC por Actualizacion tren de equipos', '2025-03-17', '', '', 'no aplica']] },
  { hoja: 'PLANTA 2', filas: [['CONTROLES DE CAMBIO - NO CONFORMIDADES'], null, ['AREA', 'ETAPA ', 'APLICA', 'DESCRIPCION DEL CAMBIO', 'FECHA', 'NOMENCLATURA PARA OBSERVACIONES', 'ESTATUS', 'EVIDENCIA', 'RESPONSABLE', 'AÑOS', 'MOTIVO'],
    ['SOL', 'ACO', 'NO', '26-379-CC ACTUALIZACION RMD ACO GASEOVET CB 500mg CAP BLANDA B5 CJA X 30', 46317, '26-379-CC/L.Fernandez/2026-10-22; ACTUALIZACION RMD ACO GASEOVET CB 500mg;proceso,moderado.', 'CUMPLIDO'],
    ['SOL/ACO', 'ENV/ACO', 'SI', '26-300-CC Cambio de estuche en sólidos', '2026-09-01', '26-300-CC/X.Y/2026-09-01;Cambio de estuche;material;menor', 'PENDIENTE'],
    ['COS', 'FAB', 'SI', '25-100-CC Antiguo', '2025-01-01', '25-100-CC/X.Y/2025-01-01;Antiguo;proceso;menor', 'CUMPLIDO']] }];
const cam = Pendientes.cambiosDeFilas(hojasCC);
ok('Listado: lee las dos plantas por el encabezado (Ate = PLANTA 1, Lima = PLANTA 2)', cam.length === 5 && cam[0].planta === 'Ate' && cam[2].planta === 'Lima', J(cam.map((c) => c.planta)));
ok('Listado: «26-280/D.Ayala/…» (sin «-CC») da 26-280-CC; etapa ENV-ACO -> Envase y Acondicionado', J(cam[0].codigos) === '["26-280-CC"]' && J(cam[0].etapa) === '["ENVASE","ACONDICIONADO"]', J(cam[0]));
ok('Listado: fecha serial de Excel (46317) -> 2026-10-22', cam[2].fecha === '2026-10-22', cam[2].fecha);
ok('Listado: lo que dice de un CC (descripción y estatus), de la planta del RMD', J(Pendientes.delListado(cam, '26-379-CC', 'PLANTA LIMA')) === J({ descripcion: '26-379-CC ACTUALIZACION RMD ACO GASEOVET CB 500mg CAP BLANDA B5 CJA X 30', estatus: 'CUMPLIDO', planta: 'Lima', fecha: '2026-10-22' }), J(Pendientes.delListado(cam, '26-379-CC', 'PLANTA LIMA')));
ok('Listado: un código que no está da null', Pendientes.delListado(cam, '26-999-CC') === null);

// ---- tarjeta de Observaciones: frente a la versión anterior y revisión (no sugiere CC) ----
const hoy = new Date(2026, 9, 22);
const ant = { version: 8, codigo: 'B8', estado: 'Autorizado', observacion: '20260901CJ-1-C1.0-FI1.0-FA1.0-F1\n26-300-CC/X.Y/2026-09-01;Cambio de estuche;material;menor\n20260901CJ Pendiente aplicar 26-379-CC\n20260901CJ Nota que se quitará' };
let hv = Pendientes.heredados([ant], { version: 9, observacion: '20261022CJ-1-C1.0-FI1.0-FA1.0-F1\n26-300-CC/X.Y/2026-09-01;Cambio de estuche;material;menor\n20260901CJ Pendiente aplicar 26-379-CC\n26-379-CC/L.Fernandez/2026-10-22;Actualización;proceso;moderado' });
ok('Frente a la anterior: 1 línea nueva (sin contar la nomenclatura) y el pendiente 26-379-CC resuelto', hv.nuevas.length === 1 && J(hv.resueltos.map((x) => [x.cc, x.version])) === '[["26-379-CC",8]]' && hv.ccs.length === 0 && hv.previa.version === 8, J({ n: hv.nuevas, r: hv.resueltos }));
const susp = (obs, guardado) => Pendientes.revisar(Pendientes.heredados([ant], { version: 9, observacion: obs }), { suspender: true, guardado, hoy });
const base9 = ant.observacion.replace('20260901CJ-1', '20261001CJ-1');
ok('Revisión: suspender sin motivo avisa', susp(base9, base9).some((x) => x.nivel === 'aviso' && /suspender/.test(x.texto)), J(susp(base9, base9)));
ok('Revisión: suspender con una línea escrita ahora no avisa', !susp(base9 + '\n20261022CJ Se suspende por nueva versión', base9).some((x) => /suspender/.test(x.texto)));
ok('Revisión: suspender con el motivo ya guardado en esta versión no avisa', !susp(base9 + '\n20261020CJ SE SUSPENDE POR AUDITORIA', base9 + '\n20261020CJ SE SUSPENDE POR AUDITORIA').some((x) => /suspender/.test(x.texto)));
const rv = (obs, ctx = {}) => Pendientes.revisar(Pendientes.heredados([ant], { version: 9, observacion: obs }), { hoy, ...ctx });
ok('Revisión: autorizar con baja / descontinuado avisa', rv(base9 + '\n20261022CJ Producto descontinuado', { autorizar: true }).some((x) => /baja/.test(x.texto)));
ok('Revisión: fecha no válida y fecha posterior a hoy en líneas nuevas', J(rv(base9 + '\n20261322CJ nota\n26-401-CC/L.Fernandez/2026-11-30;algo;proceso;menor').filter((x) => x.nivel === 'formato').map((x) => x.texto)) === '["La fecha «20261322» no es válida.","La fecha «2026-11-30» es posterior a hoy."]', J(rv(base9 + '\n20261322CJ nota\n26-401-CC/L.Fernandez/2026-11-30;algo;proceso;menor')));
ok('Revisión: las fechas de líneas copiadas de la anterior no se revisan', !rv(base9).some((x) => x.nivel === 'formato'));
const dup = rv(base9 + '\n26-402-CC/L.Fernandez/2026-10-22;a;proceso;menor\n26-402-CC/L.Fernandez/2026-10-22;b;proceso;menor\n26-300-CC/X.Y/2026-10-22;Otra vez;material;menor');
ok('Revisión: CC anotado dos veces y CC que ya estaba aplicado en la anterior', dup.some((x) => x.texto === '26-402-CC está anotado 2 veces en esta versión.') && dup.some((x) => x.texto === '26-300-CC ya figuraba como aplicado en la v8.'), J(dup));
const lis = rv(base9 + '\n26-379-CC/L.Fernandez/2026-10-22;a;proceso;menor\n26-280-CC/D.Ayala/2026-10-01;b;proceso;mayor\n26-999-CC/X.Y/2026-10-01;c;proceso;menor', { cambios: cam, planta: 'PLANTA LIMA' });
ok('Revisión con el listado: el que no está (info) y el de la otra planta (aviso); el de la misma planta no avisa',
  lis.some((x) => x.nivel === 'info' && /26-999-CC no está en el listado/.test(x.texto)) && lis.some((x) => x.nivel === 'aviso' && x.texto === '26-280-CC figura en el listado de Ate, y este RMD es de Lima.') && !lis.some((x) => /26-379-CC/.test(x.texto)), J(lis));
ok('Revisión: sin estado elegido ni listado, una versión copiada sin cambios no da avisos', rv(base9).length === 0, J(rv(base9)));

// ---- caso real 2202504892 (v5, Suspendido) -> 2202609307 (v6): «no aplica el CC» y el motivo de suspensión ----
const obsSuc5 = `2025-05-14 YSABEL SIMÓN
correo/Giannina/2026-04-15/actualizacion Creación de receta para producto SUCRAXOL 1G/5ML SUS 200ML CJA X1 - Bolivia.
20261023CJ no aplica el CC 26-244 POR RETIRO DE ETIQUETA DE ECUADOR.
20261023CJ Se suspende por actualización de las LMat solicitada con los nuevos ZMEE con arte humanova.`;
const anSuc5 = Pendientes.analizar(obsSuc5);
ok('«No aplica el CC 26-244»: no cuenta como CC aplicado', !anSuc5.aplicados.some((x) => x.codigo === '26-244-CC') && anSuc5.tipos.some((x) => x.tipo === 'noaplica'), J(anSuc5.tipos.map((x) => x.tipo)));
const herSuc6 = Pendientes.heredados([{ version: 5, codigo: '2202504892', estado: 'Suspendido', observacion: obsSuc5 }], { version: 6, observacion: '20261023CJ-1-C1.0-FI1.0-FA1.0-F1R' });
ok('El motivo de suspensión de la versión anterior se recuerda en la siguiente', herSuc6.motivos.length === 1 && /LMat/.test(herSuc6.motivos[0].linea), J(herSuc6.motivos));
ok('«Se suspende por nueva versión» no se recuerda (no dice qué cambiar)', Pendientes.heredados([{ version: 5, estado: 'Suspendido', observacion: '20261023CJ Se suspende por nueva versión' }], { version: 6, observacion: '' }).motivos.length === 0);
ok('Si la versión nueva copia la misma línea de suspensión, no se repite', Pendientes.heredados([{ version: 5, estado: 'Suspendido', observacion: obsSuc5 }], { version: 6, observacion: obsSuc5 }).motivos.length === 0);

// ---- solo cuenta como aplicado la línea que empieza con el CC (pedido de Carlos, 23-oct-2026) ----
const cc294 = '26-294-CC/F.Aroni/2026-08-25; Cambio de ET y TA del producto TRI AZIT 200 mg/5 mL Polvo para Suspensión Oral;CQA;Moderado.';
ok('Aplicado: la línea empieza con «26-294-CC/F.Aroni/…»', J(Pendientes.analizar(cc294).aplicados.map((x) => x.codigo)) === '["26-294-CC"]');
ok('Aplicado: con la fecha e iniciales delante («20261023CJ 26-294-CC/…»)', Pendientes.analizar('20261023CJ ' + cc294).aplicados.length === 1);
ok('No aplicado: «pendiente 26-294-CC/…» es pendiente', Pendientes.analizar('pendiente ' + cc294).aplicados.length === 0 && Pendientes.analizar('pendiente ' + cc294).pendientes.length === 1);
ok('No aplicado: un CC nombrado a mitad de línea solo se menciona', Pendientes.analizar('20261023CJ Revisar con calidad el 26-294-CC antes de autorizar').aplicados.length === 0
  && Pendientes.analizar('20261023CJ Revisar con calidad el 26-294-CC antes de autorizar').tipos[0].tipo === 'mencion');
ok('No aplicado: «20261023CJ No aplica el 26-244-CC»', Pendientes.analizar('20261023CJ No aplica el 26-244-CC').aplicados.length === 0);
const h7 = Pendientes.heredados([{ version: 5, estado: 'Suspendido', observacion: '20261023CJ no aplica el CC 26-244 POR RETIRO DE ETIQUETA DE ECUADOR.' }], { version: 6, observacion: '20261023CJ No aplica el 26-244-CC' });
ok('La v6 no dice «26-244-CC ya figuraba como aplicado en la v5»', !Pendientes.revisar(h7, {}).some((x) => /ya figuraba/.test(x.texto)) && h7.aplicados.length === 0, J(Pendientes.revisar(h7, {})));

// ---- P1 (Ate) y P2 (Lima): las mismas estructuras escritas distinto (12.947 MD reales, 23-oct-2026) ----
const ap1 = (l) => Pendientes.analizar(l).aplicados.map((x) => x.codigo);
const P1P2 = [
  ['CC-25-440/F.Vivanco/2026-01-16;  el retiro de la etapa de lotizado en ACON-INSP;Equipo;Menor', '25-440-CC'],
  ['CC-23-282/O.Santacruz/06-11-2023;Actualización de Titulación,(unidades) conservantes y antioxidantes ; CQA;Moderado', '23-282-CC'],
  ['CC-25-180  CCAMBIO MASIVO FASE 1;', '25-180-CC'],
  ['26-280/D.Ayala /2026-08-17/ACTUALIZACIÓN DE RMDS ENV, ACO GV2/Proceso/Mayor.', '26-280-CC'],
  ['26-110-CC:/J.Paredes/2026-04-10/Actualización de RMD SINEBUPIV SP 0.5% INY VIA20mL, /equipos, proceso/ Mayor.', '26-110-CC'],
  ['CC 25-326-CC RMD- RETIRO V°B° FASE 0 y FASE 2', '25-326-CC'],
  ['C.C: 23-358 REEMPLAZO DE BALANZA', '23-358-CC'],
  ['NC 24-1012/E.Román/01-02-2024;Inclusión de item para registrar N° del lote de agua ;Documental;Menor', '24-1012-DES'],
  ['NC: 23-1438-DES: Corregir la descripcion de la olla (PL1-PV1-U005)', '23-1438-DES'],
  ['NC-25-1086DES/L.Orbegoso/17-03-2025;Actualizacion de temperatura en la sala de lavado; Moderado.', '25-1086-DES'],
  ['26-294-CC/F.Aroni/22026-08-25; Cambio de ET y TA del producto TRI AZIT 200 mg/5 mL Polvo para Suspensión Oral;CQA;Moderado.', '26-294-CC'],
  ['25-2306-DES/ R.Osorio/2026-01-22; Inclusión de verificación de saturación de filtros HEPA;Equipo;Menor', '25-2306-DES'],
  ['NC 24-2044-DES DETECTORES DE METAL / DESEMPOLVADOR SALA 4 y SALA 7', '24-2044-DES'],
  ['2022-09-13: CONTROL DE CAMBIO 22-183-CC: RETIRO DEL ENSAYO DE pH EN OVULOS', '22-183-CC'],
  ['20241204LR-2-C1-FI1.0-FA1.0 NC: 24-2155-DES Inclusión de balanza según los equipos a utilizar', '24-2155-DES'],
];
P1P2.forEach(([l, c]) => ok(`P1/P2 aplicado ${c}: «${l.slice(0, 50)}…»`, J(ap1(l)) === J([c]), J(ap1(l))));
const e294 = Pendientes.entradaCC(P1P2[10][0]), e280 = Pendientes.entradaCC(P1P2[3][0]);
ok('Partes: fecha con errata «22026-08-25» y nivel sin el punto final', e294.responsable === 'F.Aroni' && e294.fecha === '22026-08-25' && e294.nivel === 'Moderado' && e294.tipo === 'CQA', J(e294));
ok('Partes P1 con «/» en lugar de «;»', e280.responsable === 'D.Ayala' && e280.fecha === '2026-08-17' && /^Mayor/.test(e280.nivel) && e280.tipo === 'Proceso', J(e280));
ok('No aplicado: «pendiente CC-26-294/F.Aroni/…» ni «Se suspende por CC-26-108»', ap1('pendiente CC-26-294/F.Aroni/2026-08-25;algo;CQA;Moderado').length === 0 && ap1('20260703JQ Se suspende por cc-26-108 (inclusion de tunel de paso)').length === 0);
ok('Una fecha «…/2026-08-17/…» no se confunde con un CC de P1', !Pendientes.ccsDe('26-280/D.Ayala /2026-08-17/ACTUALIZACIÓN').includes('08-017-CC'));

console.log(fallas ? `\n${fallas} prueba(s) fallaron.` : '\nTodas las pruebas pasaron.');
process.exit(fallas ? 1 : 0);
