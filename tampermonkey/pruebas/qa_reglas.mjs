// Pruebas del motor de "Reglas de revisión" y del lector de la lista de documentos vigentes (bloques ==REGLAS== y ==XLSX== del
// userscript), sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_reglas.mjs
// Con la lista real del DMS (.xls de Excel 97-2003) también se prueba el lector de .xls:
//     VIGENTES_XLS="C:/ruta/Lista_ Documento - 9ba171a9.xls" node tampermonkey/pruebas/qa_reglas.mjs
// (por defecto la busca en Descargas/Documents; si no está, esas pruebas se saltan).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const { Xlsx, Reglas } = new Function(bloque('// ==XLSX-INICIO==', '// ==XLSX-FIN==') + bloque('// ==REGLAS-INICIO==', '// ==REGLAS-FIN==') + '\nreturn { Xlsx, Reglas };')();

let fallas = 0, saltadas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const salta = (nombre, porque) => { console.log('SALTA ' + nombre + ' — ' + porque); saltadas++; };
const J = (x) => JSON.stringify(x);
const regla = (o) => Reglas.normalizar({ nombre: 'r', ...o });
const busca = (texto, reglas, ctx = {}) => Reglas.buscar(texto, Reglas.compilar(reglas, ctx), ctx);
const vals = (res) => res.marcas.map((m) => m.valor);

// ---- plegado: sin tildes ni mayúsculas, con la posición de cada carácter en el original ----
const pl = Reglas.plegar('Número de CAMIÓN – ñandú');
ok('plegar: quita tildes, pasa a mayúsculas y cambia el guion largo por "-"', pl.p === 'NUMERO DE CAMION - NANDU', pl.p);
ok('plegar: la posición de cada carácter apunta al original', pl.pos.length === pl.p.length + 1 && pl.pos[pl.p.indexOf('CAMION')] === 10);

// ---- palabras o frases ----
ok('Frase: sin importar tildes ni mayúsculas', J(vals(busca('Verificar la CALIBRACIÓN de la balanza', [regla({ buscar: 'calibracion' })]))) === '["CALIBRACIÓN"]');
ok('Frase: solo palabras completas (LIMPIEZA no marca LIMPIEZAS)', J(vals(busca('LIMPIEZAS Y LIMPIEZA', [regla({ buscar: 'limpieza' })]))) === '["LIMPIEZA"]');
ok('Frase: sin "palabras completas" marca dentro de otra palabra', vals(busca('LIMPIEZAS', [regla({ buscar: 'limpieza', palabraCompleta: false })])).length === 1);
ok('Frase: * = cualquier terminación (limpi* → LIMPIAR, LIMPIEZA)', J(vals(busca('LIMPIAR la zona; LIMPIEZA final', [regla({ buscar: 'limpi*' })]))) === '["LIMPIAR","LIMPIEZA"]');
ok('Frase: varios valores separados por ";" o por líneas', vals(busca('USAR EPP Y GUANTES; LENTES', [regla({ buscar: 'epp; guantes\nlentes' })])).length === 3);
ok('Frase: varias palabras con cualquier espacio entre ellas', vals(busca('CONTROL   DE\nCALIDAD', [regla({ buscar: 'control de calidad' })])).length === 1);
ok('Frase: "distinguir mayúsculas" no marca Kg en KG', vals(busca('PESAR 2 KG', [regla({ buscar: 'Kg', mayusculas: true })])).length === 0 && vals(busca('PESAR 2 Kg', [regla({ buscar: 'Kg', mayusculas: true })])).length === 1);
ok('Frase: los caracteres especiales se buscan tal cual', J(vals(busca('TEMPERATURA (°C): 25', [regla({ buscar: '(°C)', palabraCompleta: false })]))) === '["(°C)"]');
const sinValor = Reglas.compilar([regla({ tipo: 'frase', buscar: ' ; * ' })])[0];
ok('Frase vacía (o solo *): la regla da error y no se aplica', !sinValor.ok && /al menos una/.test(sinValor.error), sinValor.error);

// ---- documentos ----
const texto = 'SEGÚN IPRO-P123 Y FPRO-250 VIGENTE; VER POL-CAL-001, MCAL-200 E IPRO-P123.';
ok('Documento: cualquier código (I/P/F, manuales M… y políticas POL-…)', J(vals(busca(texto, [regla({ tipo: 'documento' })]))) === J(['IPRO-P123', 'FPRO-250', 'POL-CAL-001', 'MCAL-200', 'IPRO-P123']));
ok('Documento: codigosDocumento y tipoDocumento', J(Reglas.codigosDocumento(texto)) === J(['IPRO-P123', 'FPRO-250', 'POL-CAL-001', 'MCAL-200', 'IPRO-P123'])
  && J(['IPRO-P123', 'FPRO-250', 'PCPR-202', 'POL-CAL-001', 'MCAL-200'].map(Reglas.tipoDocumento)) === J(['Instructivo', 'Formato', 'Procedimiento', 'Política', 'Manual']));
ok('Documento: no confunde palabras (PARA, PESO) ni códigos más largos', vals(busca('PARA EL PASO 5, PESO-12 IPRO-P1234 XIPRO-P123', [regla({ tipo: 'documento' })])).length === 0);
const vig = new Map([['FPRO-250', { titulo: 'INSPECCIÓN EN LÍNEAS', revision: '03' }], ['MCAL-200', {}]]);
const noVig = busca(texto, [Reglas.predeterminadas()[0]], { vigentes: vig });
ok('No vigente: marca los que no están en la lista (y no los vigentes)', J(vals(noVig)) === J(['IPRO-P123', 'POL-CAL-001', 'IPRO-P123']), J(vals(noVig)));
ok('No vigente: cada uno es una advertencia con el motivo', noVig.avisos.length === 3 && noVig.avisos[0].texto === 'Documento no vigente: IPRO-P123 no está en la lista de documentos vigentes', J(noVig.avisos[0]));
ok('No vigente: la marca dice por qué está resaltada y lleva la etiqueta', /Regla «Documento no vigente»: IPRO-P123 no está en la lista/.test(noVig.marcas[0].titulo) && noVig.marcas[0].etiqueta === 'no vigente' && noVig.marcas[0].color === 'rojo' && noVig.marcas[0].aviso);
const sinLista = Reglas.compilar([Reglas.predeterminadas()[0]], {})[0];
ok('No vigente sin lista cargada: no se aplica y avisa qué le falta', !sinLista.ok && sinLista.necesita === 'vigentes');
ok('Vigentes: "solo los vigentes" marca los de la lista, con su título', (() => { const r = busca(texto, [regla({ tipo: 'documento', vigencia: 'vigentes' })], { vigentes: vig }); return J(vals(r)) === '["FPRO-250","MCAL-200"]' && /INSPECCIÓN EN LÍNEAS \(rev\. 03\)/.test(r.marcas[0].titulo); })());
ok('Documento con comodín: IPRO-* solo marca los IPRO', J(vals(busca(texto, [regla({ tipo: 'documento', buscar: 'IPRO-*' })]))) === '["IPRO-P123","IPRO-P123"]');
ok('Documento escrito en minúsculas en la regla', vals(busca(texto, [regla({ tipo: 'documento', buscar: 'fpro-250' })])).length === 1);

// ---- equipos ----
const cat = new Map([['PL1-LIQ-E023', 'TANQUE DE PREPARACIÓN'], ['PL1-GV1-E058', 'ENVASADORA']]);
const eq = busca('CARGAR EL TANQUE PL1-LIQ-E023-A; LUEGO PL1-GV1-E058 Y PL1-XXX-E999', [regla({ tipo: 'equipo' })], { catalogo: cat });
ok('Equipo: solo códigos del catálogo (y el catálogo sin el último tramo)', J(vals(eq)) === '["PL1-LIQ-E023","PL1-GV1-E058"]' && /TANQUE DE PREPARACIÓN/.test(eq.marcas[0].titulo), J(vals(eq)));
ok('Equipo sin catálogo leído: la regla espera al catálogo', Reglas.compilar([regla({ tipo: 'equipo' })], {})[0].necesita === 'catalogo');
ok('Equipo con códigos escritos: no necesita el catálogo (y admite *)', (() => { const c = Reglas.compilar([regla({ tipo: 'equipo', buscar: 'PL1-GV1-*' })], {})[0]; return c.ok && vals(Reglas.buscar('USAR PL1-GV1-E058', [c], {})).length === 1; })());

// ---- patrón ----
ok('Patrón: expresión regular (temperaturas)', J(vals(busca('ENTRE 20 °C Y 25°C', [regla({ tipo: 'patron', buscar: '\\d+\\s?°C' })]))) === '["20 °C","25°C"]');
const mal = Reglas.compilar([regla({ tipo: 'patron', buscar: '(' })])[0];
ok('Patrón no válido: error claro y la regla no se aplica', !mal.ok && /^patrón no válido/.test(mal.error), mal.error);

// ---- condiciones, acciones, alcance y excepciones ----
const cc = regla({ nombre: 'Control de Calidad', buscar: 'control de calidad', condicion: 'noDebe', accion: 'advertencia', excepto: 'granel; biocarga' });
ok('No debe aparecer: advertencia con el texto encontrado', busca('ENTREGAR A CONTROL DE CALIDAD', [cc]).avisos[0].texto === 'Control de Calidad: «CONTROL DE CALIDAD» no debe aparecer');
ok('Excepto si el texto contiene: no se aplica en ese texto', busca('VERIFICAR QUE EL GRANEL TENGA LA APROBACIÓN DE CONTROL DE CALIDAD', [cc]).marcas.length === 0);
ok('Mensaje propio en el aviso', busca('ENTREGAR A CONTROL DE CALIDAD', [{ ...cc, mensaje: 'Cambiar por Calidad en Operaciones' }]).avisos[0].texto === 'Cambiar por Calidad en Operaciones («CONTROL DE CALIDAD»)');
ok('Acción "Resaltar": marca sin advertencia', (() => { const r = busca('USAR EPP', [regla({ buscar: 'epp' })]); return r.marcas.length === 1 && !r.marcas[0].aviso && !r.avisos.length; })());
ok('Solo pasos: no se aplica en procesos menores', busca('USAR EPP', [regla({ buscar: 'epp', donde: 'pasos' })], { esPM: true }).marcas.length === 0 && busca('USAR EPP', [regla({ buscar: 'epp', donde: 'pasos' })], { esPM: false }).marcas.length === 1);
ok('Solo procesos menores: no se aplica en pasos', busca('USAR EPP', [regla({ buscar: 'epp', donde: 'menores' })], { esPM: false }).marcas.length === 0);
const enPrec = regla({ buscar: 'epp', lista: 'Precauciones' });
ok('Solo en la lista: por nombre, sin importar tildes ni el resto del nombre', busca('USAR EPP', [enPrec], { lista: 'PRECAUCIONES' }).marcas.length === 1 && busca('USAR EPP', [enPrec], { lista: 'ESTRUCTURA › PRECAUCIONES' }).marcas.length === 1 && busca('USAR EPP', [enPrec], { lista: 'FABRICACIÓN' }).marcas.length === 0);
ok('Regla inactiva: no se aplica', busca('USAR EPP', [regla({ buscar: 'epp', activa: false })]).marcas.length === 0);

// ---- marcas que se pisan ----
const predDe = (k) => Reglas.predeterminadas().find((r) => r.predeterminada === k);
const dos = busca('VER IPRO-P123', [predDe('novigente'), { ...predDe('documentos'), activa: true }], { vigentes: vig });
ok('Marcas superpuestas: una sola, con el color de la de más prioridad y los dos motivos', dos.marcas.length === 1 && dos.marcas[0].color === 'rojo' && dos.marcas[0].titulo.split('\n').length === 2, J(dos.marcas));
const orden = busca('B y A', [regla({ buscar: 'a' }), regla({ buscar: 'b' })]);
ok('Marcas en el orden del texto', J(orden.marcas.map((m) => m.valor)) === '["B","A"]');

// ---- "Debe estar presente" en todo el RMD ----
const debe = regla({ nombre: 'Protección', buscar: 'EPP; GUANTES', condicion: 'debe' });
const textos = [{ texto: 'USAR EPP', esPM: false, lista: 'PRECAUCIONES' }, { texto: 'PESAR', esPM: true, lista: 'FABRICACION' }];
const ev = Reglas.evaluarConjunto(textos, Reglas.compilar([debe]), {});
ok('Debe estar presente: avisa los valores que faltan', ev.faltan.length === 1 && J(ev.faltan[0].valores) === '["GUANTES"]' && ev.faltan[0].texto === 'Protección: no aparece «GUANTES»', J(ev.faltan));
ok('Debe estar presente (basta uno): con EPP ya no falta', Reglas.evaluarConjunto(textos, Reglas.compilar([{ ...debe, basta: true }]), {}).faltan.length === 0);
ok('Debe estar presente solo en procesos menores: el de un paso no cuenta', Reglas.evaluarConjunto(textos, Reglas.compilar([{ ...debe, basta: true, donde: 'menores' }]), {}).faltan.length === 1);
ok('Debe estar presente: lo encontrado se resalta, sin advertencia', ev.items.length === 1 && ev.items[0].marcas.length === 1 && ev.avisos === 0);
const ev2 = Reglas.evaluarConjunto([{ texto: texto }, { texto: 'IPRO-P123' }], Reglas.compilar([Reglas.predeterminadas()[0]], { vigentes: vig }), { vigentes: vig });
ok('Conjunto: cuenta advertencias y veces por regla', ev2.avisos === 4 && ev2.porRegla['pred-novigente'].avisos === 4 && ev2.items.length === 2, J(ev2.porRegla));

// ---- normalizar, predeterminadas, resumen ----
const n = Reglas.normalizar({ tipo: 'raro', condicion: 'x', color: 'fucsia', buscar: 'uno; dos', etiqueta: 'una etiqueta demasiado larga para caber' });
ok('Normalizar: valores desconocidos pasan a los de por defecto y se pone un nombre', n.tipo === 'frase' && n.condicion === 'marcar' && n.color === 'amarillo' && n.nombre === 'Palabra o frase: uno' && n.etiqueta.length === 18 && n.id);
const pred = Reglas.predeterminadas();
ok('Predeterminadas: "Documento no vigente" y "Equipo sin calificación" activas; el resto de ejemplo, inactivas', pred.length === 5 && J(pred.filter((r) => r.activa).map((r) => r.predeterminada)) === '["novigente","sincalificar"]' && pred.every((r) => r.predeterminada && r.id.startsWith('pred-')), J(pred.map((r) => [r.predeterminada, r.activa])));
ok('Resumen legible de la regla', Reglas.resumen(pred[0]) === 'Código de documento · los que no están en la lista de vigentes · No debe aparecer → mostrar advertencia', Reglas.resumen(pred[0]));

// ---- exportar / importar ----
const mias = [regla({ id: 'a', nombre: 'Mi regla', buscar: 'uno' }), regla({ id: 'b', nombre: 'Otra', buscar: 'dos' })];
const archivo = JSON.parse(JSON.stringify(Reglas.paraExportar(mias, { archivo: 'lista.xls', cargado: '2026-09-26', docs: [['FPRO-250', 'T', '01'], ['fpro-250'], ['IPRO-P123']] }, { script: '1.34.0' })));
const leido = Reglas.leerExportado(archivo);
ok('Exportar → importar: vuelven las reglas y la lista (sin repetidos)', leido.reglas.length === 2 && leido.reglas[0].nombre === 'Mi regla' && leido.vigentes.n === 2 && leido.vigentes.docs[0][0] === 'FPRO-250' && leido.script === '1.34.0');
ok('Importar: una lista suelta de reglas también sirve', Reglas.leerExportado([{ nombre: 'x', buscar: 'y' }]).reglas.length === 1);
ok('Importar: rechaza archivos de otra aplicación o sin reglas', (() => { try { Reglas.leerExportado({ app: 'otra', reglas: [] }); return false; } catch (e) { try { Reglas.leerExportado({ hola: 1 }); return false; } catch (e2) { return true; } } })());
const fu = Reglas.fusionar(mias, [regla({ id: 'zz', nombre: 'MI REGLA', buscar: 'nuevo' }), regla({ nombre: 'Nueva' })], false);
ok('Agregar: la del mismo nombre se reemplaza en su lugar y conserva su id; las demás al final', fu.reglas.length === 3 && fu.reglas[0].id === 'a' && fu.reglas[0].buscar === 'nuevo' && fu.reglas[2].nombre === 'Nueva' && fu.agregadas === 1 && fu.reemplazadas === 1);
ok('Reemplazar todas: quedan solo las importadas', Reglas.fusionar(mias, [regla({ nombre: 'Sola' })], true).reglas.length === 1);
ok('Ids repetidos se corrigen', (() => { const r = Reglas.sinIdsRepetidos([regla({ id: 'x' }), regla({ id: 'x' })]); return r[0].id === 'x' && r[1].id !== 'x'; })());

// ---- lista de vigentes desde CSV y desde una simple lista de códigos ----
const csv = Reglas.csvAFilas('\uFEFFCódigo;Título;Estado;Validez\r\n"IPRO-P123";"LIMPIEZA; SALAS";Aprobado;21/05/2027\r\nFPRO-250;"TÍTULO ""CON"" COMILLAS";Revisión;\r\n');
ok('CSV: separador ";", comillas y saltos CRLF', csv.length === 3 && csv[1][1] === 'LIMPIEZA; SALAS' && csv[2][1] === 'TÍTULO "CON" COMILLAS', J(csv));
const lcsv = Reglas.listaVigentesDeFilas(csv);
ok('Lista desde CSV: columnas por su encabezado y fecha dd/mm/aaaa a ISO', lcsv.docs.length === 2 && lcsv.columnas.codigo === 'Código' && J(lcsv.docs[0]) === J(['IPRO-P123', 'LIMPIEZA; SALAS', '', 'Aprobado', '', '', '2027-05-21']), J(lcsv));
const suelta = Reglas.listaVigentesDeFilas(Reglas.csvAFilas('IPRO-P123\nFPRO-250\nPCPR-202\nFPRO-250\n'));
ok('Lista sin encabezado: la columna con códigos (y sin repetidos)', suelta.docs.length === 3 && suelta.duplicados === 1, J(suelta));
const hueca = []; hueca[2] = ['Código', 'Título']; hueca[4] = ['IPRO-P123', 'X']; hueca[5] = ['FPRO-250', 'Y'];   // (filas vacías = huecos, como las devuelven los lectores)
ok('Lista con filas vacías (huecos del arreglo) no falla', Reglas.listaVigentesDeFilas(hueca).docs.length === 2);

// ---- .xlsx propio: escribir y volver a leer una lista ----
{
  const lib = Xlsx.crearLibro(), h = lib.hoja('Documentos', {});
  [['Identificador', 'Título', 'Revisión'], ['IPRO-P123', 'LIMPIEZA', '02'], ['POL-CAL-001', 'POLÍTICA', '00']].forEach((f, r) => f.forEach((x, c) => h.poner({ c, r }, x, 'celda')));
  const u8 = await lib.generar(), leidoX = await Xlsx.leerLibro(u8), lx = Reglas.listaVigentesDeFilas(await leidoX.filas('Documentos'));
  ok('Lista desde .xlsx: se lee con el lector de libros', lx.docs.length === 2 && lx.docs[1][0] === 'POL-CAL-001' && lx.docs[1][2] === '00', J(lx.docs));
}

// ---- v1.35: fase de la nomenclatura (1ª línea de Observaciones) ----
const fase = (o) => Reglas.faseDeObservacion(o).texto;
ok('Fase: F1, F2-R, F1R, F10 y sin nomenclatura', fase('20260925DV-1-C0.5-FI1.0-FA1.0-F1\nFASE 1.') === 'Fase 1' && fase('20260925JQ-2-C0.5-FI1.0-FA1.0-F2-R\nSe reordena') === 'Fase 2 R'
  && fase('20260925DV-1-C0.5-FI1.0-FA1.0-F1R') === 'Fase 1 R' && fase('20260925DV-1-C0.5-FI1.0-FA1.0-F10') === 'Fase 10' && fase('2026-09-25 - N Ugarte\nse actualiza') === '' && fase('') === '' && fase(null) === '');
ok('Fase: solo la primera palabra de la primera línea (lo que sigue es texto aparte)', fase('20260925DV-1-C0.5-FI1.0-FA1.0-F2 PENDIENTE CC') === 'Fase 2' && Reglas.faseDeObservacion('20260925DV-1-C0.5-FI1.0-FA1.0-F2-R x').corto === 'F2R');
ok('Fase: "-FA1.0" no se confunde con una fase', fase('20260925DV-1-C0.5-FI1.0-FA1.0') === '' && fase('F3') === 'Fase 3');

// ---- v1.35: lista de equipos calificados (hoja Cronograma, columna ESTADO GENERAL) ----
const CAB = ['ITEM', 'RM', 'Columna1', 'CODIGO MIF', 'CÓDIGO SAP', 'DESCRIPCIÓN', 'ESTADO', 'TIPO EQUIPO', 'SUCURSAL', 'DEPARTAMENTO', 'SECCIÓN', '(OQ) - PRÓXIMA:', '(OQ) - ESTADO DE CALIFICACION:', '(PQ) - PROXIMA:', '(PQ) - ESTADO DE CALIFICACION:', 'ESTADO GENERAL', 'OBSERVACIONES'];
const filasCal = [[null, 'DEPARTAMENTO: GARANTÍA DE LA CALIDAD'], [], ['', '', '', '', '', '', '', '', '', '', '', 'CALIFICACION DE OPERACIÓN (OQ)'], CAB,
  [1, 'SI', 'PV1', 'PL1-PV1-E025', 10000312, 'AUTOCLAVE HOGNER', 'OPERATIVO', 'EQU', 'PLANTA 01', 'PRODUCCIÓN', 'PV1', 47000, 'CALIFICADO', 47100, 'PROGRAMAR PQ', 'EN PROCESO', ''],
  [2, 'SI', 'PV1', 'PL1-PV1-E030', 10000234, 'TANQUE REACTOR 500 L', 'OPERATIVO', 'EQU', 'PLANTA 01', 'PRODUCCIÓN', 'PV1', 47000, 'CALIFICADO', 47100, 'CALIFICADO', 'CALIFICADO', ''],
  [3, 'NO', 'CPE', 'PL1-CPE-SL01', 'COMPLETAR', 'SALA DE PESADAS', 'OPERATIVO', 'SAL', 'PLANTA 01', 'PRODUCCIÓN', 'CPE', '', 'CALIFICADO', '', 'CALIFICADO', 'CALIFICADO', ''],
  [4, 'NO', 'CPE', 'PL1-CPE-SL01', 'COMPLETAR', 'SALA DE PESADAS', 'OPERATIVO', 'HVAC', 'PLANTA 01', 'PRODUCCIÓN', 'CPE', '', 'PENDIENTE', '', 'PENDIENTE', 'PENDIENTE', ''],
  [5, 'NO', 'ACO', 'ACO-E091', '', 'ENCARTONADORA LPM', 'OPERATIVO', 'EQU', 'PLANTA 02', 'PRODUCCIÓN', 'ACO', '', '', '', '', 'NO REQUIERE', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']];
const lc = Reglas.listaCalificadosDeFilas(filasCal);
ok('Calificados: encabezado en la fila de "ESTADO GENERAL" y sus columnas', lc.fila === 3 && lc.columnas.general === 'ESTADO GENERAL' && lc.columnas.codigo === 'CODIGO MIF' && lc.columnas.sap === 'CÓDIGO SAP' && lc.columnas.oq && lc.columnas.pq, J(lc.columnas));
ok('Calificados: una fila por equipo (código MIF, SAP sin ceros, estado general, OQ, PQ, próxima OQ en fecha)', lc.equipos.length === 5 && J(lc.equipos[0].slice(0, 6)) === J(['PL1-PV1-E025', '10000312', 'AUTOCLAVE HOGNER', 'EN PROCESO', 'CALIFICADO', 'PROGRAMAR PQ']) && lc.equipos[0][6] === '2028-09-04' && lc.equipos[2][1] === '', J(lc.equipos[0]));
const mc = Reglas.mapaCalificados(lc);
ok('Mapa de calificados: por código MIF y por SAP; EN PROCESO no está calificado, NO REQUIERE sí', mc.porCodigo.get('PL1-PV1-E025').ok === false && mc.porCodigo.get('PL1-PV1-E025').estado === 'EN PROCESO' && mc.porSap.get('10000234').ok === true && mc.porCodigo.get('ACO-E091').ok === true);
ok('Mapa de calificados: sala + HVAC con el mismo código → sin calificación si alguna fila no lo está (y el detalle trae las dos)', mc.porCodigo.get('PL1-CPE-SL01').ok === false && /SAL: CALIFICADO/.test(mc.porCodigo.get('PL1-CPE-SL01').detalle) && /HVAC: PENDIENTE/.test(mc.porCodigo.get('PL1-CPE-SL01').detalle), mc.porCodigo.get('PL1-CPE-SL01').detalle);
ok('Mapa de calificados: los estados que cuentan como calificados se pueden cambiar', Reglas.mapaCalificados(lc, ['CALIFICADO', 'EN PROCESO']).porCodigo.get('PL1-PV1-E025').ok === true && Reglas.mapaCalificados(lc, ['CALIFICADO']).porCodigo.get('ACO-E091').ok === false);
const ctxCal = { calificados: mc.porCodigo, calificadosSap: mc.porSap };
const sinCal = predDe('sincalificar');
const eqTexto = busca('CARGAR EN EL PL1-PV1-E025 Y PASAR AL PL1-PV1-E030; LUEGO PL1-XXX-E999', [sinCal], ctxCal);
ok('Equipo sin calificación en un texto: marca solo el no calificado, con su estado como etiqueta y el motivo', J(vals(eqTexto)) === '["PL1-PV1-E025"]' && eqTexto.marcas[0].etiqueta === 'EN PROCESO' && eqTexto.marcas[0].color === 'rojo'
  && eqTexto.avisos[0].texto === 'Equipo sin calificación: PL1-PV1-E025 (AUTOCLAVE HOGNER): sin calificación — EN PROCESO (OQ: CALIFICADO · PQ: PROGRAMAR PQ)', J(eqTexto));
ok('Equipo sin calificación sin la lista cargada: espera la lista', Reglas.compilar([sinCal], {})[0].necesita === 'calificados');
ok('Solo los calificados (regla propia) y códigos escritos con filtro', J(vals(busca('PL1-PV1-E025 Y PL1-PV1-E030', [regla({ tipo: 'equipo', calificacion: 'calificados' })], ctxCal))) === '["PL1-PV1-E030"]'
  && J(vals(busca('PL1-PV1-E025 Y PL1-PV1-E030', [regla({ tipo: 'equipo', buscar: 'PL1-PV1-*', calificacion: 'sinCalificar' })], ctxCal))) === '["PL1-PV1-E025"]');
const estructura = [{ codigo: 'PL1-PV1-E025', sap: '10000312', desc: 'AUTOCLAVE HOGNER', orden: 1 }, { codigo: '', sap: '000000000010000234', desc: 'TANQUE', orden: 2 }, { codigo: 'PL1-CPE-SL01', sap: '', desc: 'SALA', orden: 3 }, { codigo: 'PL1-ZZZ-E001', sap: '10009999', desc: 'OTRO', orden: 4 }];
const ee = Reglas.evaluarEquipos(estructura, Reglas.compilar([sinCal], ctxCal), ctxCal);
ok('Estructura de equipos: avisa los no calificados (por código MIF o por SAP) y no los que no figuran en la lista', J(ee.items.map((x) => [x.i, x.marcas[0].etiqueta])) === '[[0,"EN PROCESO"],[2,"PENDIENTE"]]' && ee.avisos === 2, J(ee.items));
const eeNF = Reglas.evaluarEquipos(estructura, Reglas.compilar([{ ...sinCal, noFigura: true }], ctxCal), ctxCal);
ok('Estructura de equipos: con "también los que no figuran" avisa el que no está en la lista', J(eeNF.items.map((x) => [x.i, x.marcas[0].etiqueta])) === '[[0,"EN PROCESO"],[2,"PENDIENTE"],[3,"NO FIGURA"]]', J(eeNF.items.map((x) => x.marcas[0])));
ok('Estructura de equipos: una regla sin "revisar la estructura" no la revisa', Reglas.evaluarEquipos(estructura, Reglas.compilar([{ ...sinCal, estructura: false }], ctxCal), ctxCal).items.length === 0);
const comp134 = Reglas.completarPredeterminadas([predDe('novigente'), regla({ nombre: 'Mía' })], ['novigente', 'documentos', 'equipos', 'provisional']);
ok('Predeterminada nueva (v1.35) se agrega en su lugar a quien venía de la v1.34; la que se borró no vuelve', comp134.nuevas === 1 && comp134.reglas[1].predeterminada === 'sincalificar' && comp134.reglas.length === 3
  && Reglas.completarPredeterminadas([predDe('novigente')], Reglas.CLAVES_PREDETERMINADAS).nuevas === 0);
const expCal = Reglas.leerExportado(JSON.parse(JSON.stringify(Reglas.paraExportar([], null, { calificados: { archivo: 'cal.xlsx', estadosOk: ['CALIFICADO'], equipos: lc.equipos } }))));
ok('Exportar / importar: la lista de equipos calificados y sus estados "calificados"', expCal.calificados && expCal.calificados.n === 5 && J(expCal.calificados.estadosOk) === '["CALIFICADO"]' && expCal.calificados.equipos[0][0] === 'PL1-PV1-E025');
ok('Resumen de la regla de equipos sin calificación', Reglas.resumen(sinCal) === 'Código de equipo o utensilio · los que no están calificados · No debe aparecer → mostrar advertencia · y en la estructura de equipos del RMD', Reglas.resumen(sinCal));

// ---- lista real de equipos calificados (.xlsx) ----
{
  const candidatosCal = [process.env.CALIFICADOS_XLSX, path.join(os.homedir(), 'Downloads', 'Documents', '( OQ y PQ ) REGISTRO DE AREAS  SISTEMAS  EQUIPOS A CALIFICAR - PLANTA 1 Y PLANTA 2 (2).xlsx')].filter(Boolean);
  const xlsxCal = candidatosCal.find((f) => fs.existsSync(f));
  if (!xlsxCal) salta('Lista real de equipos calificados', 'no se encontró el archivo (CALIFICADOS_XLSX)');
  else {
    const t0 = Date.now(), libro = await Xlsx.leerLibro(new Uint8Array(fs.readFileSync(xlsxCal))), hoja = libro.hojas.find((h) => /cronograma/i.test(h));
    const l = Reglas.listaCalificadosDeFilas(await libro.filas(hoja)), ms = Date.now() - t0;
    ok(`Lista real: hoja «${hoja}», columnas por su encabezado (${ms} ms)`, hoja === 'Cronograma' && l.columnas.general === 'ESTADO GENERAL' && l.columnas.codigo === 'CODIGO MIF' && l.columnas.sap === 'CÓDIGO SAP' && /\(OQ\)/.test(l.columnas.oq) && /\(PQ\)/.test(l.columnas.pq), J(l.columnas));
    ok('Lista real: ~1336 equipos y los estados de la columna AU', l.equipos.length > 1300 && l.estados.CALIFICADO > 800 && l.estados['EN PROCESO'] > 50 && l.estados.PENDIENTE > 50 && l.estados['NO CUMPLE'] > 10, J(l.estados));
    const m = Reglas.mapaCalificados(l);
    ok('Lista real: ACO-E002 calificado, ACO-E089 EN PROCESO, sala + HVAC PL1-CPE-SL01 pendiente', m.porCodigo.get('ACO-E002').ok && m.porCodigo.get('ACO-E089').estado === 'EN PROCESO' && !m.porCodigo.get('PL1-CPE-SL01').ok && m.porSap.get('10001551').codigo === 'ACO-E002');
  }
}

// ---- .xls real del DMS (Excel 97-2003) ----
const candidatos = [process.env.VIGENTES_XLS, path.join(os.homedir(), 'Downloads', 'Documents', 'Lista_ Documento - 9ba171a9.xls'), path.join(os.homedir(), 'Downloads', 'Lista_ Documento - 9ba171a9.xls')].filter(Boolean);
const xls = candidatos.find((f) => fs.existsSync(f));
if (!xls) salta('Lector de .xls con la lista real', 'no se encontró el archivo (VIGENTES_XLS)');
else {
  const t0 = Date.now(), libro = Xlsx.leerXls(new Uint8Array(fs.readFileSync(xls))), ms = Date.now() - t0, filas = libro.filas(libro.hojas[0]);
  ok(`.xls: hojas y filas (${ms} ms)`, J(libro.hojas) === '["Worksheet"]' && filas.length === 3419 && ms < 2000, J(libro.hojas) + ' ' + filas.length);
  ok('.xls: encabezados en dos filas, texto con tildes y números de fecha', J(filas[0]) === J(['S', 'AE', 'FD', 'Documento']) && filas[1][4] === 'Identificador' && filas[1][3] === 'Categoría' && filas[2][4] === 'FACO-200' && filas[2][7] === 45433, J(filas.slice(0, 3)));
  const l = Reglas.listaVigentesDeFilas(filas);
  ok('Lista del DMS: 3417 documentos, columna «Identificador» y estado en la columna «S» de arriba', l.docs.length === 3417 && l.columnas.codigo === 'Identificador' && l.columnas.estado === 'S' && l.columnas.titulo === 'Título' && l.duplicados === 0, J(l.columnas));
  ok('Lista del DMS: estados Aprobado / Emisión / Revisión', l.estados.Aprobado === 3127 && l.estados['Emisión'] === 101 && l.estados['Revisión'] === 189, J(l.estados));
  ok('Lista del DMS: primer documento con título, revisión, categoría y fechas', J(l.docs[0]) === J(['FACO-200', 'VERIFICACIÓN DE DATOS, LOTE Y EXPIRA EN BLISTERS/FOLIOS Y SOBRES', '02', 'Aprobado', 'F', '2024-05-21', '2027-05-21']), J(l.docs[0]));
  const todosDetectables = l.docs.every((d) => Reglas.codigosDocumento(' ' + d[0] + ' ').length === 1);
  ok('Todos los códigos de la lista los reconoce el patrón de documentos (I/P/F, M, POL)', todosDetectables, l.docs.filter((d) => Reglas.codigosDocumento(' ' + d[0] + ' ').length !== 1).slice(0, 5).map((d) => d[0]).join(', '));
  const mapa = new Map(l.docs.map((d) => [d[0], { titulo: d[1], revision: d[2] }]));
  const r = busca('SEGÚN FACO-200 Y FACO-999 (POL-CAL-001)', [Reglas.predeterminadas()[0]], { vigentes: mapa });
  ok('Con la lista real: FACO-999 no vigente; FACO-200 y POL-CAL-001 sí', J(vals(r)) === '["FACO-999"]', J(vals(r)));
}

console.log(`\n${fallas ? fallas + ' FALLA(S)' : 'Todo pasa'}${saltadas ? ` (${saltadas} saltada(s))` : ''}.`);
process.exit(fallas ? 1 : 0);
