// Pruebas del aviso de Motivo CARACTERIZACION en las versiones nuevas (bloque ==CARACTERIZACION== del userscript): reconoce el Motivo,
// encuentra la versión nueva entre las que ya existían y avisa una sola vez. Sin portal ni navegador: solo Node 18+.
//     node tampermonkey/pruebas/qa_caracterizacion.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const bloque = (ini, fin) => { const a = fuente.indexOf(ini), b = fuente.indexOf(fin); if (a < 0 || b < a) throw new Error('no encuentro el bloque ' + ini); return fuente.slice(a, b); };
const crear = new Function(bloque('// ==CARACTERIZACION-INICIO==', '// ==CARACTERIZACION-FIN==') + '\nreturn crearAvisoCaracterizacion;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };
const J = (x) => JSON.stringify(x);
const md = (mdId, version, motivo, extra = {}) => ({ mdId, codigo: String(2202600000 + mdId), version, motivoId: motivo === null ? null : { descripcion: motivo }, ...extra });

// Portal simulado: versiones del master; la nueva aparece en la lectura número «aparece» después de aceptar.
function portal({ motivoNueva = 'CARACTERIZACION', respuesta = 'Aceptar', aparece = 2, conConfirmacion = true, sinNueva = false } = {}) {
  const avisos = [], estado = { lecturas: 0, aceptado: false, esperas: 0 };
  const existentes = [md(1, 1, 'CARACTERIZACION'), md(2, 2, 'CARACTERIZACION'), md(5, 3, 'CONTROL DE CAMBIO')];   // v3 cancelada de antes
  const aviso = crear({
    leer: async () => {
      estado.lecturas++;
      if (estado.aceptado && !sinNueva && estado.lecturas >= aparece + 1) return [...existentes, md(9, 3, motivoNueva, { descripcion: 'PRODUCTO X', nivelTxt: 'Fabricación' })];
      return existentes;
    },
    confirmacion: async () => (conConfirmacion ? { mensaje: '¿Desea generar una nueva versión?' } : null),
    respuesta: async () => { estado.aceptado = respuesta !== 'Cancelar'; return respuesta; },
    aceptado: (t) => /^(OK|Aceptar|Sí|Si|Confirmar)$/i.test(t || ''),
    avisar: (origen, nueva, motivo) => avisos.push({ origen: origen.version, nueva: nueva.version, mdId: nueva.mdId, motivo }),
    esperar: async () => { estado.esperas++; },
    intervalo: 5000, tope: 60000, topeDudoso: 20000,
  });
  return { aviso, avisos, estado, origen: md(2, 2, 'CARACTERIZACION', { codigoversionprincipal: '2202600001' }) };
}

// ---- Motivo ----
{
  const { aviso } = portal();
  ok('Motivo: CARACTERIZACION, con tilde, en minúsculas y con espacios', ['CARACTERIZACION', 'Caracterización', 'caracterizacion de proceso', ' CARACTERIZACIÓN ', 'CARACTERI-ZACION'].every(aviso.esMotivo));
  ok('Motivo: otros no cuentan', !['CONTROL DE CAMBIO', 'DESVIACION', 'Validación de Procesos', '', null, undefined].some(aviso.esMotivo));
  ok('motivoDe: lee motivoId.descripcion (sin motivo, vacío)', aviso.motivoDe(md(1, 1, 'X')) === 'X' && aviso.motivoDe(md(1, 1, null)) === '' && aviso.motivoDe(null) === '');
}

// ---- versión nueva entre las existentes ----
{
  const { aviso, origen } = portal();
  const ids = new Set([1, 2, 5]);
  ok('nuevaEntre: ignora la propia, las anteriores y las que ya existían (aunque tengan versión mayor)', aviso.nuevaEntre([md(1, 1, 'A'), md(2, 2, 'A'), md(5, 3, 'A')], origen, ids) === null);
  ok('nuevaEntre: encuentra la que no estaba y tiene versión mayor', aviso.nuevaEntre([md(5, 3, 'A'), md(9, 3, 'B')], origen, ids)?.mdId === 9);
  ok('nuevaEntre: una que no estaba pero con versión menor o igual no cuenta', aviso.nuevaEntre([md(8, 2, 'A'), md(7, 1, 'A')], origen, ids) === null);
}

// ---- revisar: avisa solo con CARACTERIZACION y una vez por versión ----
{
  const { aviso, avisos, origen } = portal();
  const n = md(9, 3, 'Caracterización');
  ok('revisar: avisa una versión nueva con CARACTERIZACION', aviso.revisar(origen, n) === true && avisos.length === 1 && avisos[0].motivo === 'Caracterización');
  ok('revisar: la misma versión no avisa dos veces', aviso.revisar(origen, n) === false && avisos.length === 1);
  ok('revisar: otro Motivo no avisa', aviso.revisar(origen, md(10, 4, 'CONTROL DE CAMBIO')) === false && avisos.length === 1);
  ok('revisar: sin versión nueva no avisa', aviso.revisar(origen, null) === false);
}

// ---- «Nueva Versión» pulsada a mano ----
{
  const p = portal();
  const n = await p.aviso.alPulsar(p.origen);
  ok('aceptado: espera a que aparezca la versión nueva y avisa', n?.mdId === 9 && J(p.avisos) === J([{ origen: 2, nueva: 3, mdId: 9, motivo: 'CARACTERIZACION' }]), J({ n, avisos: p.avisos, estado: p.estado }));
  ok('aceptado: la v3 cancelada que ya existía no se confunde con la nueva', p.estado.esperas === 2, J(p.estado));
}
{
  const p = portal({ respuesta: 'Cancelar' });
  const n = await p.aviso.alPulsar(p.origen);
  ok('cancelado: no busca la versión nueva ni avisa', n === null && p.avisos.length === 0 && p.estado.esperas === 0, J(p.estado));
}
{
  const p = portal({ motivoNueva: 'CONTROL DE CAMBIO' });
  const n = await p.aviso.alPulsar(p.origen);
  ok('versión nueva con otro Motivo: la encuentra y no avisa', n?.mdId === 9 && p.avisos.length === 0);
}
{
  const p = portal({ conConfirmacion: false });
  ok('sin el mensaje «Nueva Versión» del portal (botón deshabilitado): nada', (await p.aviso.alPulsar(p.origen)) === null && p.estado.esperas === 0);
}
{
  const p = portal({ respuesta: null });
  const n = await p.aviso.alPulsar(p.origen);
  ok('cerrado sin saber con qué botón (p. ej. Enter): igual busca y avisa', n?.mdId === 9 && p.avisos.length === 1);
}
{
  const p = portal({ sinNueva: true });
  const n = await p.aviso.alPulsar(p.origen);
  ok('aceptado pero la versión no aparece: se rinde al tope (60 s / 5 s = 12 lecturas)', n === null && p.estado.esperas === 12 && p.avisos.length === 0, J(p.estado));
}
{
  const p = portal({ sinNueva: true, respuesta: null });
  await p.aviso.alPulsar(p.origen);
  ok('sin saber el botón y sin versión nueva: tope corto (20 s / 5 s = 4 lecturas)', p.estado.esperas === 4, J(p.estado));
}
{
  let fallos = 0;
  const p = portal();
  const aviso = crear({ leer: async () => { if (fallos++ < 3) throw new Error('el servidor no respondió'); return [md(2, 2, 'CARACTERIZACION'), md(9, 3, 'CARACTERIZACION')]; },
    confirmacion: async () => ({}), respuesta: async () => 'OK', aceptado: () => true, avisar: (o, n) => p.avisos.push(n.mdId), esperar: async () => {}, intervalo: 1, tope: 10 });
  const n = await aviso.alPulsar(p.origen);
  ok('si la lectura previa falla no adivina (sin lista de antes no busca)', n === null && p.avisos.length === 0);
}

// ---- conexión con el resto del script ----
ok('opción «motivocaract» en OPC y en el grupo «Revisión y alertas»', /\['motivocaract', 'Motivo CARACTERIZACION en versiones nuevas'/.test(fuente) && /\['Revisión y alertas', 'alerta', \[[^\]]*'motivocaract'/.test(fuente));
ok('ppVersiones trae el Motivo y ppCrearVersionNueva revisa la versión creada', /\$expand: 'estadoIdRmd,motivoId', \$orderby: 'mdId'/.test(fuente) && /avisoCaract\.revisar\(origen, nueva\)/.test(fuente));
ok('clic en «Nueva Versión» de la ventana de un RMD (fase de captura)', /b\.title === 'Nueva Versión' \|\| norm\(b\.textContent\) === 'Nueva Versión'/.test(fuente) && /avisoCaract\.alPulsar\(\{ \.\.\.asoc \}\)/.test(fuente));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa.');
process.exit(fallas ? 1 : 0);
