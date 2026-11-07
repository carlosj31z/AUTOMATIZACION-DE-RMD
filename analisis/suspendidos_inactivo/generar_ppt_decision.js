const pptxgen = require('pptxgenjs');
const { applyTheme } = require('/root/.claude/skills/synced/4cc709c0-2cce-4754-a361-0b7b00b88004_bd29c7aa-8909-44b3-8adf-143be60316a3/pptx/scripts/apply_theme.js');
const THEME = { name: 'Suspendidos', headFontFace: 'Cambria', bodyFontFace: 'Calibri',
  colors: { dk1:'1E2A32', lt1:'FFFFFF', dk2:'17404A', lt2:'EEF3F4', accent1:'1F6E7A', accent2:'E39B2D', accent3:'8A9AA5', accent4:'B5473A', accent5:'5FA8A0', accent6:'CBD6DA', hlink:'1F6E7A', folHlink:'5B6B78' } };
const pres = new pptxgen(); pres.layout='LAYOUT_WIDE'; pres.theme={headFontFace:'Cambria', bodyFontFace:'Calibri'};
pres.title='RMD suspendidos: decision a INACTIVO'; pres.author='Carlos';
const C = pres.SchemeColor;
const INA='1F6E7A', SUS='E39B2D', GRID='D5DDE0', MUTED='5B6B78';
pres.defineSlideMaster({ title:'PORTADA', background:{color:'17404A'}, objects:[
  {placeholder:{options:{name:'title',type:'title',x:0.8,y:2.2,w:11.7,h:1.6,fontSize:44,bold:true,color:'FFFFFF',fontFace:'Cambria',valign:'bottom'},text:''}},
  {placeholder:{options:{name:'body',type:'body',x:0.8,y:4.0,w:11.7,h:1.2,fontSize:20,color:'CBD6DA',valign:'top'},text:''}} ]});
pres.defineSlideMaster({ title:'CONTENIDO', background:{color:'FFFFFF'}, margin:[0.5,0.6,0.6,0.6], slideNumber:{x:12.4,y:7.0,w:0.5,h:0.3,fontSize:10,color:'8A9AA5'}, objects:[
  {text:{text:'RMD suspendidos · decision del equipo · nov-2026',options:{x:0.6,y:7.0,w:8,h:0.3,fontSize:10,color:'8A9AA5'}}},
  {placeholder:{options:{name:'title',type:'title',x:0.6,y:0.35,w:12.1,h:0.9,fontSize:32,bold:true,color:'17404A',fontFace:'Cambria',valign:'middle'},text:''}} ]});
pres.defineSlideMaster({ title:'CIERRE', background:{color:'17404A'}, slideNumber:{x:12.4,y:7.0,w:0.5,h:0.3,fontSize:10,color:'CBD6DA'}, objects:[
  {placeholder:{options:{name:'title',type:'title',x:0.6,y:0.35,w:12.1,h:0.9,fontSize:32,bold:true,color:'FFFFFF',fontFace:'Cambria',valign:'middle'},text:''}} ]});

const T=(s,t,o)=>s.addText(t,Object.assign({isTextBox:true,fontSize:14,color:'1E2A32',valign:'top',margin:0.05},o));
const card=(s,x,y,w,h,fill,name)=>s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.12,fill:{color:fill},line:{color:fill},objectName:name});
const stat=(s,x,y,w,num,lab,col,sub)=>{ T(s,num,{x,y,w,h:1.0,fontSize:54,bold:true,color:col,fontFace:'Cambria',valign:'bottom'}); T(s,lab,{x,y:y+1.05,w,h:0.45,fontSize:16,bold:true}); if(sub) T(s,sub,{x,y:y+1.5,w,h:0.8,fontSize:13,color:MUTED}); };
const chartBase = { catAxisLabelColor:MUTED, valAxisLabelColor:MUTED, catAxisLabelFontFace:'+mn-lt', valAxisLabelFontFace:'+mn-lt', catAxisLabelFontSize:12, valAxisLabelFontSize:11,
  valGridLine:{color:GRID,size:0.5}, catGridLine:{style:'none'}, dataLabelFontFace:'+mn-lt', dataLabelFontSize:12, legendFontFace:'+mn-lt', legendFontSize:12, titleFontFace:'+mn-lt', titleColor:'1E2A32', titleFontSize:14 };

// 1 Portada
pres.addSection({title:'Inicio'});
let s=pres.addSlide({masterName:'PORTADA',sectionTitle:'Inicio'});
s.addText('RMD suspendidos: cuales pasan a INACTIVO',{placeholder:'title'});
s.addText('Decision final del equipo sobre el cuadro de suspendidos (ultima version de cada master) · ATE y LIMA · noviembre 2026',{placeholder:'body'});
s.addNotes('Presenta la conclusion que el equipo marco en la columna CONCLUSION del archivo ANALISIS DE SUSPENDIDOS.xlsx.');

// 2 Resumen
pres.addSection({title:'Resultado'});
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Resultado'});
s.addText('3 de cada 4 suspendidos pasan a INACTIVO',{placeholder:'title'});
card(s,0.6,1.6,3.8,3.2,'EEF3F4','c1'); card(s,4.75,1.6,3.8,3.2,'EEF3F4','c2'); card(s,8.9,1.6,3.8,3.2,'EEF3F4','c3');
stat(s,0.9,1.8,3.3,'1 806','RMD suspendidos revisados','17404A','Ultima version de cada master, ATE 1 216 y LIMA 590');
stat(s,5.05,1.8,3.3,'1 328','Pasan a INACTIVO (74 %)',INA,'ATE 892 y LIMA 436. Salen del backlog de trabajo');
stat(s,9.2,1.8,3.3,'478','Siguen SUSPENDIDOS (26 %)','B87818','ATE 324 y LIMA 154. Se atienden por prioridad');
T(s,'El equipo confirmo la mayor parte de la sugerencia del cuadro, pero tomo decisiones propias en cada grupo: inactiva tambien los RMD cuya receta ya esta en otro RMD autorizado y deja suspendidos algunos que el cuadro proponia inactivar.',{x:0.6,y:5.2,w:12.1,h:1.2,fontSize:16});

// 3 Como se armo
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Resultado'});
s.addText('Como se armo el cuadro que revisamos',{placeholder:'title'});
const crit=[['1','Base','Ultima version de cada master que esta Suspendida en el portal (no se cuentan versiones anteriores).'],
 ['2','Lotes','Ordenes de la COOISPI de feb-2023 al 05/11/2026: fecha del ultimo lote y lotes en 12 meses.'],
 ['3','Forecast','Demanda consensuada de nov-2026 a oct-2027 en unidades.'],
 ['4','Receta en otro RMD','Si su receta ya esta en un RMD autorizado de otro master, el RMD queda cubierto.']];
crit.forEach((c,i)=>{const y=1.55+i*1.25; s.addShape(pres.shapes.OVAL,{x:0.6,y,w:0.6,h:0.6,fill:{color:INA},line:{color:INA},objectName:'n'+i}); T(s,c[0],{x:0.6,y,w:0.6,h:0.6,fontSize:18,bold:true,color:'FFFFFF',align:'center',valign:'middle',margin:0}); T(s,c[1],{x:1.4,y:y-0.05,w:4.8,h:0.4,fontSize:16,bold:true}); T(s,c[2],{x:1.4,y:y+0.35,w:4.8,h:0.8,fontSize:13,color:MUTED});});
const sug=[['ACTUALIZAR','183','Se fabrica o tiene forecast: generar nueva version'],['REVISAR','216','Falta decidir con Planeamiento o es una suspension reciente'],['PASAR A INACTIVO','1 173','Sin forecast ni lotes recientes, o RMD antiguo sin receta SAP'],['NO CONSIDERAR','232','Su receta ya esta en otro RMD autorizado']];
T(s,'Sugerencia del cuadro (06/11/2026)',{x:6.9,y:1.5,w:5.8,h:0.4,fontSize:16,bold:true,color:'17404A'});
sug.forEach((g,i)=>{const y=2.0+i*1.1; card(s,6.9,y,5.8,0.95,'EEF3F4','g'+i); T(s,g[1],{x:7.05,y,w:1.4,h:0.95,fontSize:26,bold:true,color:INA,fontFace:'Cambria',valign:'middle'}); T(s,g[0],{x:8.5,y:y+0.08,w:4.1,h:0.35,fontSize:14,bold:true}); T(s,g[2],{x:8.5,y:y+0.42,w:4.1,h:0.5,fontSize:12,color:MUTED});});
s.addNotes('El archivo del equipo tiene 1 806 filas: las 1 804 del cuadro mas 2 filas de GRAVOL AP (LIMA) agregadas a mano en PASAR A INACTIVO.');

// 4 Por planta
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Resultado'});
s.addText('ATE inactiva 73 % y LIMA 74 % de sus suspendidos',{placeholder:'title'});
s.addChart(pres.charts.BAR,[{name:'INACTIVO',labels:['ATE','LIMA'],values:[892,436]},{name:'SUSPENDIDO',labels:['ATE','LIMA'],values:[324,154]}],
 Object.assign({},chartBase,{x:0.6,y:1.5,w:7.4,h:5.2,barDir:'bar',barGrouping:'stacked',chartColors:[INA,SUS],showValue:true,dataLabelPosition:'ctr',dataLabelColor:'FFFFFF',showLegend:true,legendPos:'b',catAxisLabelFontSize:14,catAxisOrientation:'maxMin',objectName:'graf-planta'}));
const tb=[[{text:'',options:{}},{text:'ATE',options:{bold:true}},{text:'LIMA',options:{bold:true}},{text:'Total',options:{bold:true}}],
 ['Pasan a INACTIVO','892','436','1 328'],['Siguen SUSPENDIDOS','324','154','478'],[{text:'Total revisado',options:{bold:true}},{text:'1 216',options:{bold:true}},{text:'590',options:{bold:true}},{text:'1 806',options:{bold:true}}],['% a INACTIVO','73 %','74 %','74 %']];
s.addTable(tb,{x:8.4,y:1.8,w:4.3,colW:[1.9,0.8,0.8,0.8],fontSize:14,color:'1E2A32',border:{type:'solid',pt:0.5,color:GRID},fill:{color:'FFFFFF'},rowH:0.5,align:'right',objectName:'tabla-planta'});
T(s,'Las dos plantas llegan a casi la misma proporcion; ATE pesa el doble en volumen.',{x:8.4,y:4.7,w:4.3,h:1.2,fontSize:14,color:MUTED});

// 5 Sugerencia vs decision
pres.addSection({title:'Conclusion por grupo'});
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Conclusion por grupo'});
s.addText('Lo que sugeria el cuadro y lo que decidio el equipo',{placeholder:'title'});
const H=(t)=>({text:t,options:{bold:true,color:'FFFFFF',fill:{color:'17404A'}}});
const rows=[[H('Sugerencia del cuadro'),H('ATE a INACTIVO'),H('ATE sigue SUSP.'),H('LIMA a INACTIVO'),H('LIMA sigue SUSP.'),H('Total a INACTIVO'),H('Total sigue SUSP.')],
 ['ACTUALIZAR','1','95','7','80','8','175'],['REVISAR','132','9','50','25','182','34'],['PASAR A INACTIVO','592','220','326','37','918','257'],['NO CONSIDERAR','167','0','53','12','220','12'],
 [{text:'Total',options:{bold:true}},{text:'892',options:{bold:true}},{text:'324',options:{bold:true}},{text:'436',options:{bold:true}},{text:'154',options:{bold:true}},{text:'1 328',options:{bold:true,color:INA}},{text:'478',options:{bold:true,color:'B87818'}}]];
s.addTable(rows,{x:0.6,y:1.6,w:12.1,colW:[2.8,1.55,1.55,1.55,1.55,1.55,1.55],fontSize:15,color:'1E2A32',border:{type:'solid',pt:0.5,color:GRID},rowH:0.55,align:'center',objectName:'tabla-cruce'});
T(s,'PASAR A INACTIVO incluye 2 filas de GRAVOL AP (LIMA) agregadas a mano al archivo (1 175 en vez de 1 173).',{x:0.6,y:5.2,w:12.1,h:0.4,fontSize:12,color:MUTED});
T(s,'Los mayores cambios frente a la sugerencia: 220 de NO CONSIDERAR pasan a INACTIVO y 257 de PASAR A INACTIVO se quedan suspendidos.',{x:0.6,y:5.7,w:12.1,h:0.8,fontSize:16,bold:true,color:'17404A'});

// 6 Conclusion por grupo
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Conclusion por grupo'});
s.addText('Conclusion por grupo',{placeholder:'title'});
const grp=[['ACTUALIZAR','183','175 siguen SUSPENDIDOS','Se les genera nueva version. 8 pasan a INACTIVO por decision del equipo aunque tienen forecast (1 ATE, 7 LIMA).'],
 ['REVISAR','216','182 pasan a INACTIVO','El equipo resolvio la duda: 182 se inactivan y 34 siguen suspendidos (9 ATE, 25 LIMA).'],
 ['PASAR A INACTIVO','1 175','918 pasan a INACTIVO','Se confirma la mayoria. 257 se quedan suspendidos (220 ATE, 37 LIMA): 196 son RMD antiguos sin receta SAP.'],
 ['NO CONSIDERAR','232','220 pasan a INACTIVO','Su receta ya esta en otro RMD autorizado, asi que se inactivan como duplicados. 12 de LIMA siguen suspendidos.']];
grp.forEach((g,i)=>{const x=0.6+(i%2)*6.15, y=1.5+Math.floor(i/2)*2.7; card(s,x,y,5.95,2.5,'EEF3F4','grp'+i);
 const dom = g[2].includes('INACTIVO')?INA:'B87818';
 T(s,g[0]+' · '+g[1],{x:x+0.25,y:y+0.15,w:5.5,h:0.4,fontSize:14,bold:true,color:MUTED});
 T(s,g[2],{x:x+0.25,y:y+0.55,w:5.5,h:0.6,fontSize:24,bold:true,color:dom,fontFace:'Cambria'});
 T(s,g[3],{x:x+0.25,y:y+1.25,w:5.5,h:1.15,fontSize:14});});

// 7 Que pasa a INACTIVO
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Conclusion por grupo'});
s.addText('Que pasa a INACTIVO: 1 328 RMD',{placeholder:'title'});
stat(s,0.6,1.5,3.6,'729','Nunca se fabricaron',INA,'Sin ningun lote desde feb-2023 (ATE 529, LIMA 200)');
stat(s,0.6,3.85,3.6,'1 193','Sin forecast',INA,'nov-2026 a oct-2027. Los 135 con forecast estan cubiertos por otro RMD (127) o los decidio el equipo (8)');
s.addChart(pres.charts.BAR,[{name:'RMD a INACTIVO',labels:['Acondicionado','Envase','Fabricacion','Recubrimiento','Inspeccion'],values:[594,413,287,21,13]}],
 Object.assign({},chartBase,{x:4.7,y:1.5,w:8.0,h:5.2,barDir:'bar',chartColors:[INA],showValue:true,dataLabelPosition:'outEnd',dataLabelColor:'1E2A32',showLegend:false,showTitle:true,title:'RMD que pasan a INACTIVO por etapa',catAxisOrientation:'maxMin',objectName:'graf-etapa'}));

// 8 Que sigue suspendido
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Conclusion por grupo'});
s.addText('Que sigue SUSPENDIDO: 478 RMD',{placeholder:'title'});
s.addChart(pres.charts.BAR,[{name:'Con forecast',labels:['ATE','LIMA'],values:[95,92]},{name:'Con lotes en 12 meses',labels:['ATE','LIMA'],values:[65,88]},{name:'Sin forecast ni lotes',labels:['ATE','LIMA'],values:[224,53]}],
 Object.assign({},chartBase,{x:0.6,y:1.5,w:7.4,h:5.2,barDir:'col',barGrouping:'clustered',chartColors:[INA,'5FA8A0',SUS],showValue:true,dataLabelPosition:'outEnd',dataLabelColor:'1E2A32',showLegend:true,legendPos:'b',catAxisLabelFontSize:14,objectName:'graf-susp'}));
card(s,8.4,1.6,4.3,4.9,'EEF3F4','nota-susp');
T(s,'Lectura',{x:8.65,y:1.8,w:3.8,h:0.4,fontSize:16,bold:true,color:'17404A'});
T(s,[{text:'187 tienen forecast: son el backlog real a actualizar.',options:{bullet:true,breakLine:true}},{text:'153 tuvieron lotes en los ultimos 12 meses.',options:{bullet:true,breakLine:true}},{text:'277 no tienen forecast ni lotes (224 en ATE): el equipo decidio mantenerlos suspendidos; conviene anotar el motivo.',options:{bullet:true}}],{x:8.65,y:2.3,w:3.8,h:4.0,fontSize:14,paraSpaceAfter:10});
s.addNotes('Un RMD puede tener forecast y lotes a la vez, por eso las barras no suman el total.');

// 9 Prioridad
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Conclusion por grupo'});
s.addText('Prioridad de atencion de los 478 que siguen suspendidos',{placeholder:'title'});
s.addChart(pres.charts.BAR,[{name:'Prioridad 1 (ultimo lote 2026)',labels:['ATE','LIMA'],values:[62,81]},{name:'Prioridad 2 (ultimo lote 2025)',labels:['ATE','LIMA'],values:[60,35]},{name:'Prioridad 3 (ultimo lote 2023-2024)',labels:['ATE','LIMA'],values:[202,38]}],
 Object.assign({},chartBase,{x:0.6,y:1.5,w:7.4,h:5.2,barDir:'col',barGrouping:'clustered',chartColors:[INA,'5FA8A0','8A9AA5'],showValue:true,dataLabelPosition:'outEnd',dataLabelColor:'1E2A32',showLegend:true,legendPos:'b',catAxisLabelFontSize:14,objectName:'graf-prio'}));
stat(s,8.4,1.5,4.3,'19 %','ATE en prioridad 1',INA,'62 de 324. El 62 % de ATE no fabrica desde 2023-2024');
stat(s,8.4,3.85,4.3,'53 %','LIMA en prioridad 1',INA,'81 de 154 (incluye 2 BETAVER sin lotes pero con forecast)');
s.addNotes('Prioridad segun la hoja PRIORIDAD del equipo: 1 = ultimo lote en 2026, 2 = en 2025, 3 = en 2023 o 2024. Cifras recalculadas desde la hoja Lista.');

// 10 Proximos pasos
pres.addSection({title:'Cierre'});
s=pres.addSlide({masterName:'CIERRE',sectionTitle:'Cierre'});
s.addText('Proximos pasos',{placeholder:'title'});
const steps=[['1','Pasar 1 328 RMD a INACTIVO','Cuando TI habilite el status, cargar la lista con su motivo: sin demanda, RMD antiguo sin receta SAP o duplicado.'],
 ['2','Actualizar los suspendidos por prioridad','Empezar por los 143 de prioridad 1 (ATE 62, LIMA 81) y los 187 con forecast.'],
 ['3','Revisar cada mes','Si un INACTIVO vuelve a tener forecast u orden, regresa a Suspendido.'],
 ['4','Anotar el motivo de los 277 sin demanda','Que el RMD diga en Observaciones por que sigue suspendido.']];
steps.forEach((st,i)=>{const y=1.6+i*1.3; s.addShape(pres.shapes.OVAL,{x:0.8,y,w:0.7,h:0.7,fill:{color:SUS},line:{color:SUS},objectName:'p'+i}); T(s,st[0],{x:0.8,y,w:0.7,h:0.7,fontSize:20,bold:true,color:'17404A',align:'center',valign:'middle',margin:0});
 T(s,st[1],{x:1.8,y:y-0.05,w:10.7,h:0.45,fontSize:20,bold:true,color:'FFFFFF'}); T(s,st[2],{x:1.8,y:y+0.42,w:10.7,h:0.6,fontSize:15,color:'CBD6DA'});});

// 11 Dudas
s=pres.addSlide({masterName:'CONTENIDO',sectionTitle:'Cierre'});
s.addText('Puntos a confirmar con el equipo',{placeholder:'title'});
const dudas=[['8 de ACTUALIZAR pasan a INACTIVO con forecast','AMOXIDIN CL 250, GENTS PRESER, 2 ACNOMEL Opcion B, REAC PRESERVATIVOS, ENCIGELMED, 2 MEDIVEL OVU. Confirmar que no se fabricaran.'],
 ['257 de PASAR A INACTIVO siguen suspendidos','No tienen forecast ni lotes en 12 meses; 196 son RMD antiguos sin receta SAP. Falta el motivo para mantenerlos.'],
 ['NO CONSIDERAR ahora se inactiva','El cuadro decia no tocarlos por ahora; el equipo inactiva 220. Los 12 que siguen suspendidos son de LIMA (CLORFENAMINA, IBUPROFENO, EVACLEAN y otros).'],
 ['Diferencias menores en las tablas dinamicas','2 filas de GRAVOL AP agregadas a mano; la hoja PRIORIDAD dice «fecha de suspension» pero usa el año del ultimo lote; LIMA da 81/35/38 en Lista y 80/35/39 en la tabla.']];
dudas.forEach((d,i)=>{const x=0.6+(i%2)*6.15, y=1.5+Math.floor(i/2)*2.7; card(s,x,y,5.95,2.5,'EEF3F4','d'+i);
 s.addShape(pres.shapes.OVAL,{x:x+0.25,y:y+0.25,w:0.45,h:0.45,fill:{color:SUS},line:{color:SUS},objectName:'q'+i}); T(s,'?',{x:x+0.25,y:y+0.25,w:0.45,h:0.45,fontSize:16,bold:true,color:'17404A',align:'center',valign:'middle',margin:0});
 T(s,d[0],{x:x+0.85,y:y+0.22,w:4.9,h:0.55,fontSize:16,bold:true,valign:'middle'}); T(s,d[1],{x:x+0.25,y:y+0.95,w:5.5,h:1.45,fontSize:14,color:'1E2A32'});});

(async()=>{ const f='/mnt/project-files/suspendidos-inactivo/Suspendidos_a_INACTIVO_decision_equipo_2026-11-07.pptx'; await pres.writeFile({fileName:f}); await applyTheme(f,THEME); console.log('ok'); })();
