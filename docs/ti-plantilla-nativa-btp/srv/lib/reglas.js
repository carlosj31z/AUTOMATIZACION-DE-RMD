// =====================================================================
// Reglas de negocio del borrador de Producción (sin dependencias: se prueban solas).
// DÓNDE: srv/lib/reglas.js del proyecto CAP. Las usa srv/borrador-service.js.
// Constantes: ids de la tabla MAESTRA del portal. Confirmar contra la tabla de
// constantes del portal (codigoSap IDESTRMDAUTORIZADO, IDTIPODATONOTIFICACION...).
// =====================================================================
'use strict';

const ESTADO_RMD = { AUTORIZADO: 465, INGRESADO: 467, SUSPENDIDO: 468 };

const TIPO_DATO = {
  VERIFICACION_CHECK: 432, TEXTO: 433, CANTIDAD: 434, FECHA: 435, FECHA_HORA: 436, HORA: 437,
  NUMEROS: 438, REALIZADO_POR: 439, VISTO_BUENO: 440, REALIZADO_POR_Y_VB: 441, MULTIPLE_CHECK: 442,
  RANGO: 443, LOTE: 444, FORMULA: 445, SIN_TIPO: 446, NOTIFICACION: 447,
};

// --- 1. Estado: solo se escribe en un RMD Ingresado ---
function puedeIngresar(md) {
  if (!md) return { ok: false, mensaje: 'El RMD no existe.' };
  if (+md.estadoIdRmd_iMaestraId === ESTADO_RMD.INGRESADO) return { ok: true };
  if (+md.estadoIdRmd_iMaestraId === ESTADO_RMD.AUTORIZADO)
    return { ok: false, crearVersion: true, mensaje: 'El RMD está Autorizado: cree primero la versión Ingresada con «Nueva Versión».' };
  return { ok: false, mensaje: 'Solo se ingresan cambios en un RMD Ingresado.' };
}

// --- 2. Normalizar texto para detectar pasos duplicados ---
// Sin distinguir mayúsculas, tildes, espacios repetidos ni signos.
function normalizar(t) {
  return String(t || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9%]+/g, ' ').trim();
}

// --- 3. Reemplazo de pasos solo por pasos de la misma estructura y etiqueta ---
// lista = { estructuraId, etiquetaId } de la lista donde está la fila
// (para un proceso menor, la lista de su paso mayor).
function mismaEtiqueta(lista, pasoCatalogo) {
  return !!pasoCatalogo &&
    String(pasoCatalogo.estructuraId_estructuraId) === String(lista.estructuraId) &&
    String(pasoCatalogo.etiquetaId_etiquetaId || '') === String(lista.etiquetaId || '');
}

function validarReemplazo(lista, pasoCatalogo) {
  if (!pasoCatalogo) return { severidad: 'BLOQUEO', mensaje: 'El paso elegido no existe en el catálogo.' };
  if (pasoCatalogo.activo === false) return { severidad: 'BLOQUEO', mensaje: `El paso ${pasoCatalogo.codigo} está de baja.` };
  if (!mismaEtiqueta(lista, pasoCatalogo))
    return { severidad: 'BLOQUEO', mensaje: `El paso ${pasoCatalogo.codigo} es de otra etiqueta: solo se reemplaza por pasos de la misma etiqueta.` };
  return { severidad: 'OK' };
}

// --- 4. Texto escrito: usar el paso existente o marcar «se creará» ---
// catalogo = pasos activos de la MISMA estructura y etiqueta.
function resolverTexto(texto, catalogo) {
  const n = normalizar(texto);
  const igual = catalogo.find((p) => p.activo !== false && normalizar(p.descripcion) === n);
  if (igual) return { accion: 'USAR', pasoId: igual.pasoId, codigo: igual.codigo };
  const parecidos = catalogo
    .map((p) => ({ p, s: parecido(n, normalizar(p.descripcion)) }))
    .filter((x) => x.s >= 60).sort((a, b) => b.s - a.s).slice(0, 5)
    .map((x) => ({ pasoId: x.p.pasoId, codigo: x.p.codigo, descripcion: x.p.descripcion, parecido: x.s }));
  return { accion: 'CREAR', parecidos };
}

// Parecido 0–100 por palabras compartidas (Dice). En HANA se puede usar CONTAINS(... FUZZY(0.8)).
function parecido(a, b) {
  const A = new Set(a.split(' ').filter(Boolean)), B = new Set(b.split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let c = 0; A.forEach((w) => { if (B.has(w)) c++; });
  return Math.round((200 * c) / (A.size + B.size));
}

// --- 5. Validaciones del Grabar del portal (onGrabarPasoPadre) ---
function validarComoGrabar(fila) {
  const errores = [];
  const vacio = (v) => v === '' || v == null;
  const tipo = +fila.tipoDatoId_iMaestraId;
  if (tipo === TIPO_DATO.RANGO) {
    if (['valorInicial', 'valorFinal', 'margen', 'decimales'].some((k) => vacio(fila[k])))
      errores.push('Debe completar los campos obligatorios para el tipo de dato seleccionado.');
    else if (+fila.valorInicial > +fila.valorFinal) errores.push('El valor inicial supera al final.');
  }
  if ([TIPO_DATO.CANTIDAD, TIPO_DATO.NUMEROS].includes(tipo) && vacio(fila.decimales))
    errores.push('Debe completar los decimales para el tipo de dato seleccionado.');
  if (tipo === TIPO_DATO.NOTIFICACION && !fila.clvModelo) errores.push('Debes seleccionar un campo de Clave Modelo.');
  return errores;
}

// --- 6. Casillas «Realizado por» / «Visto bueno» → tipo de dato ---
function tipoPorCasillas(rpor, vb, tipoActual) {
  const firmas = [TIPO_DATO.REALIZADO_POR, TIPO_DATO.VISTO_BUENO, TIPO_DATO.REALIZADO_POR_Y_VB];
  const t0 = +tipoActual;
  // Solo cambia el tipo si hoy es de firmas, check o sin tipo; los demás tipos guardan sus casillas aparte.
  if (![TIPO_DATO.SIN_TIPO, TIPO_DATO.VERIFICACION_CHECK, ...firmas].includes(t0)) return t0;
  if (rpor && vb) return TIPO_DATO.REALIZADO_POR_Y_VB;
  if (rpor) return TIPO_DATO.REALIZADO_POR;
  if (vb) return TIPO_DATO.VISTO_BUENO;
  return firmas.includes(t0) ? TIPO_DATO.SIN_TIPO : t0;
}

// --- 7. Textos: «Control de Calidad» → «Calidad en Operaciones» (aviso, no bloquea) ---
const EXCEPCIONES_CALIDAD = [/GRANEL/, /FPRO[ -]?250/, /BIOCARGA/];
function avisoCalidad(texto) {
  const n = normalizar(texto);
  if (!/CONTROL DE CALIDAD/.test(n)) return null;
  if (EXCEPCIONES_CALIDAD.some((r) => r.test(n))) return null;
  return { severidad: 'AVISO', mensaje: 'Debe decir «Calidad en Operaciones» en lugar de «Control de Calidad».',
    sugerido: String(texto).replace(/control de calidad/gi, 'Calidad en Operaciones') };
}

// --- 8. Predecesores («Depende») ---
// lista = pasos de UNA lista en su orden final: [{ id, tipo, depende }].
// Regla: cada paso con tipo de dato depende del anterior con tipo de dato
// (se saltan los «Sin tipo de dato»). El primero hereda el que se pase en "anteriorLista".
function recalcularPredecesores(lista, anteriorLista = null) {
  let previo = anteriorLista;
  return lista.map((p) => {
    const conTipo = +p.tipo !== TIPO_DATO.SIN_TIPO;
    const nuevo = conTipo ? previo : p.depende ?? null;
    if (conTipo) previo = p.id;
    return { ...p, depende: nuevo, cambia: (p.depende ?? null) !== nuevo };
  });
}

// Revisa que no queden ciclos ni dependencias hacia pasos que ya no están.
function revisarPredecesores(pasos) {
  const ids = new Set(pasos.map((p) => p.id)), dep = new Map(pasos.map((p) => [p.id, p.depende]));
  const errores = [];
  pasos.forEach((p) => {
    if (p.depende && !ids.has(p.depende)) errores.push(`El paso ${p.id} depende de un paso que ya no está.`);
    if (p.depende === p.id) errores.push(`El paso ${p.id} depende de sí mismo.`);
    const vistos = new Set([p.id]); let x = dep.get(p.id);
    while (x) { if (vistos.has(x)) { errores.push(`Ciclo de predecesores desde el paso ${p.id}.`); break; } vistos.add(x); x = dep.get(x); }
  });
  return [...new Set(errores)];
}

// --- 9. Cambios en SAP desde que se generó la plantilla ---
function rmdCambio(borrador, mdActual, hashActual) {
  if (borrador.fotoHash && hashActual && borrador.fotoHash !== hashActual) return true;
  if (borrador.fotoFechaActualiza && mdActual.fechaActualiza &&
      new Date(mdActual.fechaActualiza) > new Date(borrador.fotoFechaActualiza)) return true;
  return false;
}

// --- 10. Lo que no se escribe en el RMD: queda como tarea manual ---
function esTareaManual(cambio) {
  if (cambio.tipo === 'CANTIDAD_INSUMO')
    return 'Cambiar la cantidad del insumo en la Lista de Materiales (no se edita en el RMD).';
  if (cambio.tipo === 'EQUIPO_AGREGAR' && !cambio.equipoId) return 'Crear el equipo en SAP antes de asociarlo.';
  return null;
}

module.exports = {
  ESTADO_RMD, TIPO_DATO, puedeIngresar, normalizar, mismaEtiqueta, validarReemplazo, resolverTexto,
  parecido, validarComoGrabar, tipoPorCasillas, avisoCalidad, recalcularPredecesores, revisarPredecesores,
  rmdCambio, esTareaManual,
};
