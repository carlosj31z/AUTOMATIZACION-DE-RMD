// =====================================================================
// Lógica del servicio del borrador (CAP, Node.js).
// DÓNDE: srv/borrador-service.js (mismo nombre que el .cds para que CAP lo enlace solo).
// Paquetes: @sap/cds, @cap-js/change-tracking (audit trail de las tablas nuevas),
//           @cap-js/audit-logging (SAP Audit Log Service), @sap-cloud-sdk/http-client (firma).
// AJUSTAR: NS = namespace real de las tablas del RMD en el proyecto del portal.
// =====================================================================
'use strict';
const cds = require('@sap/cds');
const crypto = require('crypto');
const R = require('./lib/reglas');

const NS = 'rmd';   // TODO TI: namespace real (donde está MD, MD_ES_PASO, PASO...)
const LOG = cds.log('borrador');

module.exports = class BorradorService extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to('db');
    const E = db.entities(NS);
    const { Borradores } = this.entities;
    const audit = await cds.connect.to('audit-log').catch(() => null);

    // ---------------------------------------------------------------
    // 1. GENERAR LA PLANTILLA
    // Lee el RMD completo y guarda una foto (contenido + hash) en MD_BORRADOR.
    // ---------------------------------------------------------------
    this.on('generarPlantilla', async (req) => {
      const { mdId } = req.data;
      const md = await SELECT.one.from(E.MD).where({ mdId });
      if (!md) return req.reject(404, 'El RMD no existe.');
      if (![R.ESTADO_RMD.INGRESADO, R.ESTADO_RMD.AUTORIZADO].includes(+md.estadoIdRmd_iMaestraId))
        return req.reject(409, 'Solo se genera la plantilla de un RMD Ingresado o Autorizado.');

      const contenido = await leerRmd(E, mdId);
      const json = JSON.stringify(contenido);
      const numero = await siguienteNumero();
      const nuevo = {
        ID: cds.utils.uuid(), numero, md_mdId: mdId, mdCodigo: md.codigo, mdVersion: md.version,
        fotoHash: sha256(json), fotoFechaActualiza: md.fechaActualiza, contenido: json, estado: 'BORRADOR',
      };
      await INSERT.into(Borradores).entries(nuevo);
      return SELECT.one.from(Borradores).where({ ID: nuevo.ID });
    });

    // ---------------------------------------------------------------
    // 2. BUSCAR PASOS (editor de Producción)
    // Misma estructura y etiqueta primero; sin tildes ni mayúsculas.
    // ---------------------------------------------------------------
    this.on('buscarPasos', async (req) => {
      const { texto, estructuraId, etiquetaId, top = 20 } = req.data;
      const palabras = R.normalizar(texto).split(' ').filter((w) => w.length > 1).slice(0, 6);
      if (!palabras.length) return [];
      // En HANA conviene un índice de texto y CONTAINS(descripcion, :texto, FUZZY(0.8)).
      const filas = await SELECT.from(E.PASO)
        .columns('pasoId', 'codigo', 'descripcion', 'estructuraId_estructuraId', 'etiquetaId_etiquetaId', 'activo')
        .where({ activo: true, and: palabras.map((w) => ({ descripcion: { like: `%${w}%` } })) })
        .limit(500);
      const n = R.normalizar(texto);
      return filas.map((p) => ({
        pasoId: p.pasoId, codigo: p.codigo, descripcion: p.descripcion,
        mismaEtiqueta: R.mismaEtiqueta({ estructuraId, etiquetaId }, p),
        parecido: R.parecido(n, R.normalizar(p.descripcion)), usoEnRmd: null,
      })).sort((a, b) => (b.mismaEtiqueta - a.mismaEtiqueta) || (b.parecido - a.parecido)).slice(0, top);
    });

    // ---------------------------------------------------------------
    // 3. ENVIAR (Producción → equipo RMD)
    // ---------------------------------------------------------------
    this.on('enviar', Borradores, async (req) => {
      const b = await borradorDe(req);
      if (!b.solicitante || !b.area || !b.motivo) return req.reject(400, 'Complete la solicitud: nombre, área y motivo.');
      await UPDATE(Borradores, b.ID).with({ estado: 'ENVIADO' });
      return SELECT.one.from(Borradores, b.ID);
    });

    // ---------------------------------------------------------------
    // 4. REVISAR (fase 1: no escribe en el RMD)
    // ---------------------------------------------------------------
    this.on('revisar', Borradores, async (req) => {
      const b = await borradorDe(req);
      const { plan } = await armarPlan(E, b);
      await UPDATE(Borradores, b.ID).with({ estado: 'EN_REVISION' });
      return plan.map(({ escritura, ...x }) => x);
    });

    // ---------------------------------------------------------------
    // 5. INGRESAR (fase 2: firma + una sola transacción + verificación)
    // ---------------------------------------------------------------
    this.on('ingresar', Borradores, async (req) => {
      const b = await borradorDe(req);
      const { contrasena, significado, aceptoAvisos } = req.data;
      if (!['ENVIADO', 'EN_REVISION'].includes(b.estado)) return req.reject(409, 'El borrador no está listo para ingresar.');

      await firmaElectronica(req, contrasena);                                   // GxP-02

      const md = await SELECT.one.from(E.MD).where({ mdId: b.md_mdId });
      const est = R.puedeIngresar(md);
      if (!est.ok) return req.reject(409, est.mensaje);
      const hoy = sha256(JSON.stringify(await leerRmd(E, b.md_mdId)));
      if (R.rmdCambio(b, md, hoy))
        return req.reject(409, 'El RMD cambió en SAP desde que se generó la plantilla. Vuelva a revisar el borrador sobre el RMD actual.');

      const { plan, manuales } = await armarPlan(E, b);
      if (plan.some((x) => x.severidad === 'BLOQUEO')) return req.reject(400, 'Hay cambios bloqueados: corríjalos antes de ingresar.');
      if (plan.some((x) => x.severidad === 'AVISO') && !aceptoAvisos) return req.reject(400, 'Debe aceptar los avisos antes de ingresar.');

      // CAP ya abre una transacción por request: si algo falla, se revierte todo (GxP-06).
      const usuario = req.user.id, ahora = new Date().toISOString();
      let secuencia = 0;
      for (const item of plan.filter((x) => x.escritura)) {
        const w = item.escritura;
        const antes = w.operacion === 'CREATE' ? null : await SELECT.one.from(E[w.entidad]).where(w.clave);
        if (w.operacion === 'CREATE') await INSERT.into(E[w.entidad]).entries({ ...w.datos, usuarioRegistro: usuario, fechaRegistro: ahora });
        else await UPDATE(E[w.entidad]).where(w.clave).with({ ...w.datos, usuarioActualiza: usuario, fechaActualiza: ahora });
        await INSERT.into('rmd.borrador.MD_BORRADOR_ESCRITURA').entries({
          borrador_ID: b.ID, secuencia: ++secuencia, entidad: w.entidad, claveFila: Object.values(w.clave)[0],
          operacion: w.operacion, antes: JSON.stringify(antes), despues: JSON.stringify(w.datos),
        });
      }

      // Verificación posterior (GxP-05): releer y comparar con lo que se quiso escribir.
      const diferencias = await verificar(E, plan);
      if (diferencias.length) return req.reject(500, `La verificación encontró diferencias; no se graba nada: ${diferencias.join(' | ')}`);

      await UPDATE(Borradores, b.ID).with({
        estado: 'INGRESADO', ingresadoPor: usuario, ingresadoEn: ahora,
        firmaSignificado: significado || 'Ingreso de cambios al RMD', mdIdDestino: b.md_mdId,
      });
      if (audit) await audit.log('SecurityEvent', { data: { evento: 'INGRESO_BORRADOR', borrador: b.numero, rmd: b.mdCodigo, usuario, escrituras: secuencia } });
      LOG.info('Borrador ingresado', b.numero, b.mdCodigo, secuencia);
      return { ok: true, escrituras: secuencia, diferencias: [], tareasManuales: manuales };
    });

    // ---------------------------------------------------------------
    // 6. REVERTIR (deshace en orden inverso con los valores "antes")
    // ---------------------------------------------------------------
    this.on('revertir', Borradores, async (req) => {
      const b = await borradorDe(req);
      if (b.estado !== 'INGRESADO') return req.reject(409, 'Solo se revierte un borrador ingresado.');
      await firmaElectronica(req, req.data.contrasena);
      const md = await SELECT.one.from(E.MD).where({ mdId: b.mdIdDestino });
      if (+md.estadoIdRmd_iMaestraId !== R.ESTADO_RMD.INGRESADO) return req.reject(409, 'El RMD ya no está Ingresado: no se puede revertir.');
      const escrituras = await SELECT.from('rmd.borrador.MD_BORRADOR_ESCRITURA').where({ borrador_ID: b.ID }).orderBy('secuencia desc');
      const ahora = new Date().toISOString();
      for (const w of escrituras) {
        const clave = claveDe(E[w.entidad], w.claveFila);
        if (w.operacion === 'CREATE') await UPDATE(E[w.entidad]).where(clave).with({ activo: false, usuarioActualiza: req.user.id, fechaActualiza: ahora });
        else await UPDATE(E[w.entidad]).where(clave).with({ ...JSON.parse(w.antes), usuarioActualiza: req.user.id, fechaActualiza: ahora });
      }
      await UPDATE(Borradores, b.ID).with({ estado: 'REVERTIDO', motivoRechazo: req.data.motivo });
      return { ok: true, escrituras: escrituras.length, diferencias: [], tareasManuales: [] };
    });

    this.on('rechazar', Borradores, async (req) => {
      const b = await borradorDe(req);
      if (!req.data.motivo) return req.reject(400, 'Indique el motivo del rechazo.');
      await UPDATE(Borradores, b.ID).with({ estado: 'RECHAZADO', motivoRechazo: req.data.motivo });
      return SELECT.one.from(Borradores, b.ID);
    });

    // ================= funciones de apoyo =================

    async function borradorDe(req) {
      const ID = req.params[0]?.ID ?? req.params[0];
      const b = await SELECT.one.from(Borradores, ID);
      if (!b) req.reject(404, 'El borrador no existe.');
      return b;
    }

    async function siguienteNumero() {
      const r = await SELECT.one.from(Borradores).columns('max(numero) as n');
      return (r?.n || 0) + 1;
    }

    return super.init();
  }
};

// Lee todo lo que la plantilla muestra. Mismas tablas que usa la ventana del RMD.
async function leerRmd(E, mdId) {
  const where = { mdId_mdId: mdId };
  const [estructuras, etiquetas, pasos, pms, equipos, utensilios, insumos, especificaciones] = await Promise.all([
    SELECT.from(E.MD_ESTRUCTURA).where(where).orderBy('orden'),
    SELECT.from(E.MD_ES_ETIQUETA).where(where).orderBy('orden'),
    SELECT.from(E.MD_ES_PASO).where({ ...where, activo: true }).orderBy('orden'),
    SELECT.from(E.MD_ES_PASO_INSUMO_PASO).where({ ...where, activo: true }).orderBy('orden'),
    SELECT.from(E.MD_ES_EQUIPO).where({ ...where, activo: true }).orderBy('orden'),
    SELECT.from(E.MD_ES_UTENSILIO).where({ ...where, activo: true }).orderBy('orden'),
    SELECT.from(E.MD_ES_RE_INSUMO).where(where),
    SELECT.from(E.MD_ES_ESPECIFICACION).where(where).orderBy('orden'),
  ]);
  return { estructuras, etiquetas, pasos, pms, equipos, utensilios, insumos, especificaciones };
}

// Convierte los cambios de Producción en un plan: cada fila con su severidad y su escritura.
async function armarPlan(E, b) {
  const cambios = await SELECT.from('rmd.borrador.MD_BORRADOR_CAMBIO').where({ borrador_ID: b.ID }).orderBy('orden');
  const rmd = JSON.parse(b.contenido);
  const plan = [], manuales = [];
  const listaDe = (c) => {
    const e = rmd.estructuras.find((x) => x.mdEstructuraId === c.mdEstructuraId) || {};
    const t = rmd.etiquetas.find((x) => x.mdEsEtiquetaId === c.mdEsEtiquetaId) || {};
    return { estructuraId: e.estructuraId_estructuraId, etiquetaId: t.etiquetaId_etiquetaId, nombre: [e.descripcion, t.descripcion].filter(Boolean).join(' › ') };
  };
  for (const c of cambios) {
    const L = listaDe(c);
    const manual = R.esTareaManual(c);
    if (manual) { manuales.push(manual); plan.push({ cambioId: c.ID, lugar: L.nombre, accion: 'Manual', detalle: manual, severidad: 'AVISO', mensaje: manual }); continue; }

    if (c.tipo === 'CAMBIAR_PASO' || c.tipo === 'AGREGAR_PASO' || c.tipo === 'AGREGAR_PM') {
      const paso = c.pasoIdNuevo ? await SELECT.one.from(E.PASO).where({ pasoId: c.pasoIdNuevo }) : null;
      const v = paso ? R.validarReemplazo(L, paso) : { severidad: 'AVISO', mensaje: 'Paso nuevo: se creará en el catálogo.' };
      const aviso = R.avisoCalidad(paso ? paso.descripcion : c.textoNuevo);
      const errores = paso ? R.validarComoGrabar({ ...paso, ...rango(c) }) : [];
      const sev = errores.length ? 'BLOQUEO' : v.severidad !== 'OK' ? v.severidad : aviso ? 'AVISO' : 'OK';
      plan.push({
        cambioId: c.ID, lugar: L.nombre, accion: c.tipo === 'CAMBIAR_PASO' ? 'Cambiar' : 'Agregar',
        detalle: paso ? `${paso.codigo} — ${paso.descripcion}` : c.textoNuevo, severidad: sev,
        mensaje: [v.mensaje, aviso?.mensaje, ...errores].filter(Boolean).join(' '),
        escritura: sev === 'BLOQUEO' ? null : escrituraDe(c, paso),
      });
      continue;
    }
    if (c.tipo === 'RANGO') {
      const fila = rmd.pasos.find((p) => p.mdEstructuraPasoId === c.mdEstructuraPasoId) || {};
      const errores = R.validarComoGrabar({ ...fila, ...rango(c) });
      plan.push({ cambioId: c.ID, lugar: L.nombre, accion: 'Rango', detalle: `${c.valorInicial} – ${c.valorFinal}`, severidad: errores.length ? 'BLOQUEO' : 'OK', mensaje: errores.join(' '),
        escritura: errores.length ? null : { entidad: 'MD_ES_PASO', operacion: 'UPDATE', clave: { mdEstructuraPasoId: c.mdEstructuraPasoId }, datos: rango(c) } });
      continue;
    }
    if (c.tipo === 'CASILLAS') {
      const fila = rmd.pasos.find((p) => p.mdEstructuraPasoId === c.mdEstructuraPasoId) || {};
      const tipo = R.tipoPorCasillas(c.rpor, c.vb, fila.tipoDatoId_iMaestraId);
      plan.push({ cambioId: c.ID, lugar: L.nombre, accion: 'Casillas', detalle: `R. Por ${c.rpor ? 'sí' : 'no'} · V.B. ${c.vb ? 'sí' : 'no'}`, severidad: 'OK', mensaje: '',
        escritura: { entidad: 'MD_ES_PASO', operacion: 'UPDATE', clave: { mdEstructuraPasoId: c.mdEstructuraPasoId }, datos: { rpor: !!c.rpor, vb: !!c.vb, tipoDatoId_iMaestraId: tipo } } });
      continue;
    }
    if (c.tipo === 'QUITAR') {
      plan.push({ cambioId: c.ID, lugar: L.nombre, accion: 'Quitar', detalle: c.mdEstructuraPasoId, severidad: 'OK', mensaje: '',
        escritura: { entidad: 'MD_ES_PASO', operacion: 'UPDATE', clave: { mdEstructuraPasoId: c.mdEstructuraPasoId }, datos: { activo: false } } });
      continue;
    }
    // MOVER, EQUIPO_*, UTENSILIO_*, INSUMO_EN_PASO, COMENTARIO: mismo patrón (TODO TI).
    plan.push({ cambioId: c.ID, lugar: L.nombre, accion: c.tipo, detalle: c.comentario || '', severidad: 'AVISO', mensaje: 'Pendiente de implementar en esta versión de referencia.' });
  }
  // Después de todos los cambios: orden y predecesores de cada lista tocada (ver reglas.recalcularPredecesores).
  return { plan, manuales };
}

function rango(c) {
  const r = {};
  ['valorInicial', 'valorFinal', 'margen'].forEach((k) => { if (c[k] != null) r[k] = c[k]; });
  return r;
}

function escrituraDe(c, paso) {
  if (c.tipo === 'CAMBIAR_PASO')
    return { entidad: c.filaPadreId ? 'MD_ES_PASO_INSUMO_PASO' : 'MD_ES_PASO', operacion: 'UPDATE',
      clave: c.filaPadreId ? { mdEstructuraPasoInsumoPasoId: c.mdEstructuraPasoId } : { mdEstructuraPasoId: c.mdEstructuraPasoId },
      datos: c.filaPadreId ? { pasoHijoId_pasoId: paso.pasoId } : { pasoId_pasoId: paso.pasoId } };
  // AGREGAR_PASO: misma fila que crea el portal al "Adicionar Pasos".
  return { entidad: 'MD_ES_PASO', operacion: 'CREATE', clave: { mdEstructuraPasoId: cds.utils.uuid() },
    datos: { activo: true, mdEstructuraId_mdEstructuraId: c.mdEstructuraId, mdEsEtiquetaId_mdEsEtiquetaId: c.mdEsEtiquetaId,
      pasoId_pasoId: paso?.pasoId, orden: c.posicion, tipoDatoId_iMaestraId: paso?.tipoDatoId_iMaestraId,
      decimales: paso?.decimales, ...rango(c), clvModelo: paso?.clvModelo, tipoDatoIdAnterior_iMaestraId: paso?.tipoDatoId_iMaestraId } };
}

async function verificar(E, plan) {
  const dif = [];
  for (const { escritura: w } of plan.filter((x) => x.escritura && x.escritura.operacion === 'UPDATE')) {
    const fila = await SELECT.one.from(E[w.entidad]).where(w.clave);
    Object.entries(w.datos).forEach(([k, v]) => { if (fila && String(fila[k]) !== String(v)) dif.push(`${w.entidad} ${Object.values(w.clave)[0]}.${k}`); });
  }
  return dif;
}

function claveDe(entidad, valor) {
  const k = Object.keys(entidad.keys).find((x) => !entidad.keys[x].isAssociation);
  return { [k]: valor };
}

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

// Firma electrónica (21 CFR 11.200): el usuario vuelve a escribir su contraseña.
// Se valida contra SAP Cloud Identity Services (IAS). TI debe confirmar el método con Seguridad:
// password grant del cliente OAuth de la app, o la API de autenticación de IAS.
async function firmaElectronica(req, contrasena) {
  if (!contrasena) return req.reject(401, 'Firma electrónica: escriba su contraseña.');
  const ias = cds.env.requires?.auth?.credentials || {};
  const res = await fetch(`${ias.url}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: ias.clientid, client_secret: ias.clientsecret, username: req.user.id, password: contrasena }),
  });
  if (!res.ok) return req.reject(401, 'Firma electrónica no válida.');
}
