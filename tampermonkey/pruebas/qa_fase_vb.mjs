// Pruebas de la regla de la fase 3 (v1.155.0, regla de Carlos): F3 o superior solo si la versión tiene MENOS casillas «V.B.» que la
// anterior, y F3 se sugiere si y solo si las tiene. También la fase de la 1.ª línea de Observaciones que va a los exportados.
//     node tampermonkey/pruebas/qa_fase_vb.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const fuente = fs.readFileSync(path.join(aqui, '..', 'rmd-ui-mejoras.user.js'), 'utf8');
const tramo = (ini, fin) => { const i = fuente.indexOf(ini), j = fuente.indexOf(fin, i); if (i < 0 || j < 0) throw new Error('no se encontró ' + ini); return fuente.slice(i, j); };
const { FASE_MENOS_VB, numeroFase, reglaFaseVb } = new Function(tramo('  const FASE_MENOS_VB = 3;', '  // casillas «V.B.» por mdId') + '\nreturn { FASE_MENOS_VB, numeroFase, reglaFaseVb };')();
const faseObs = new Function(tramo('    function faseDeObservacion(obs) {', '    function resumen(r) {') + '\nreturn faseDeObservacion;')();

let fallas = 0;
const ok = (nombre, cond, detalle = '') => { console.log((cond ? 'PASA  ' : 'FALLA ') + nombre + (cond || !detalle ? '' : ' — ' + detalle)); if (!cond) fallas++; };

ok('La fase 3 empieza en F3', FASE_MENOS_VB === 3 && numeroFase('F3') === 3 && numeroFase('F3R') === 3 && numeroFase('F2R') === 2 && numeroFase('') === 0 && numeroFase('F12') === 12);
const menos = reglaFaseVb(2, 9, 'v4');
ok('Menos V°B° que la anterior: permite F3 y la sugiere', menos.permite && menos.sugerida === 'F3' && /2 V°B°.*9/.test(menos.texto), JSON.stringify(menos));
const igual = reglaFaseVb(9, 9, 'v4');
ok('Los mismos V°B°: no permite F3 ni la sugiere', !igual.permite && igual.sugerida === '' && /no tiene menos/.test(igual.texto), JSON.stringify(igual));
const mas = reglaFaseVb(10, 9, 'v4');
ok('Más V°B°: no permite F3 ni la sugiere', !mas.permite && mas.sugerida === '');
const sinAnt = reglaFaseVb(3, null, '');
ok('Sin versión anterior: no permite F3', !sinAnt.permite && sinAnt.sugerida === '' && /Sin versión anterior/.test(sinAnt.texto));
const sinContar = reglaFaseVb(null, 9, 'v4');
ok('Sin poder contar: F3 no se confirma y se dice por qué', !sinContar.permite && /No se pudieron contar/.test(sinContar.texto));
const contando = reglaFaseVb(null, null, 'v4', true);
ok('Mientras cuenta: no permite ni sugiere todavía', contando.buscando && !contando.permite && contando.sugerida === '');
ok('Cero V°B° frente a uno: también es menos', reglaFaseVb(0, 1, 'v2').permite);

// fase de la 1.ª línea de Observaciones (columna «Fase» de los exportados): vacía si no se reconoce
const casos = [['20261120CJ-1-C2.0-FI1.0-FA1.0-F2\n26-379-CC/…', 'F2'], ['20261120CJ-1-C2.0-FI1.0-FA1.0-F2R', 'F2R'], ['20261120CJ-1-C2.0-FI1.0-FA1.0-F3-R', 'F3R'],
  ['20240123CR-2\nCAMBIO DE PUESTO', ''], ['', ''], [null, ''], ['PENDIENTE BORRADOR CARACTERIZACION', ''], ['20261120CJ-1-C2.0-FI1.0-FA1.0-F?', '']];
ok('Fase de Observaciones: F2, F2R, F3-R → F3R; sin fase reconocible queda vacía', casos.every(([o, f]) => faseObs(o).corto === f), JSON.stringify(casos.map(([o]) => faseObs(o).corto)));

// v1.157.0 (pedido de Carlos): F3+ sin menos V°B° ya no se bloquea; el editor y el portal solo avisan que no corresponde
ok('El editor avisa (sin bloquear) F3 o superior con el umbral del portal (faseVb.desde)', /faseVb: \{ permite: fv\.permite, sugerida: fv\.sugerida, texto: fv\.texto, desde: FASE_MENOS_VB \}/.test(fuente) && /\+mF\[1\] >= fvb\.desde && !fvb\.permite\) aviso\(`Ojo: la nomenclatura no corresponde/.test(fuente));
ok('Ninguna opción de fase queda deshabilitada', !/o\.disabled = no;/.test(fuente) && !/\$\{no \? ` disabled/.test(fuente) && /o\.disabled = false;/.test(fuente));
ok('La fase de la versión nueva no se copia de la anterior (solo se sugiere F3 por los V°B°)', /fase = act\.fase \|\| fvx\.sugerida \|\| ''/.test(fuente) && !/fase = act\.fase \|\| \(ant && ant\.fase\)/.test(fuente));

console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo pasa');
process.exit(fallas ? 1 : 0);
