import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
o = pd.read_pickle('out3.pkl')
OUT = '/mnt/project-files/suspendidos-inactivo/RMD_suspendidos_propuesta_INACTIVO_2026-11-05_v4.xlsx'
wb = Workbook(); ws = wb.active; ws.title = 'Resumen'
B = Font(bold=True); H = PatternFill('solid', fgColor='1F4E78'); HF = Font(bold=True, color='FFFFFF')
col = {'0': 'D9D9D9', '1': 'F8CBAD', '2': 'FCE4D6', '3': 'FFF2CC', '4': 'C6E0B4', '5': 'A9D08E', 'A': 'FCE4D6'}
thin = Side(style='thin', color='BFBFBF'); bd = Border(top=thin, bottom=thin, left=thin, right=thin)
ws['A1'] = 'RMD suspendidos (ultima version de cada master) - propuesta de status INACTIVO'; ws['A1'].font = Font(bold=True, size=14)
ws['A2'] = 'Fuentes: portal RMD leido 05/11/2026 (13 035 RMD, 22 627 recetas; solo lectura), COOISPI 05/11/2026 (ordenes con entrega o en curso, feb-2023 a hoy), Forecast consolidado MIF 202610 (demanda consensuada nov-2026 a oct-2027).'
ws['A3'] = 'Ultima version = la de mayor version entre Autorizado, Ingresado y Suspendido (misma regla del portal). Regla de Carlos: si la receta (material) del suspendido ya esta en un RMD AUTORIZADO vigente, el suspendido se excluye.'
r = 5
cls = sorted(o.Clasificacion.unique())
hdr = ['Clasificacion', 'Total', 'Planta ATE', 'Planta LIMA', 'Con «masivo» ATE', 'Con «masivo» LIMA', 'Que hacer']
acc = {'0': 'No se considera: ya hay un RMD autorizado con su receta. Puede cancelarse o inactivarse como duplicado.',
       '1': 'Backlog real: actualizar primero.', '2': 'Mantener pendiente; actualizar cuando Planeamiento confirme fecha.',
       '3': 'Revisar caso por caso (con Planeamiento o con el RMD parecido).', '4': 'Pasar a INACTIVO (confianza media).',
       '5': 'Pasar a INACTIVO (confianza alta).', 'A': 'Ya esta en curso una nueva version.'}
for j, h in enumerate(hdr, 1):
    c = ws.cell(r, j, h); c.font = HF; c.fill = H; c.alignment = Alignment(wrap_text=True, vertical='center')
for k in cls:
    r += 1; g = o[o.Clasificacion == k]
    vals = [k, len(g), (g.Planta == 'PLANTA ATE').sum(), (g.Planta == 'PLANTA LIMA').sum(),
            ((g.Planta == 'PLANTA ATE') & (g['Dice «masivo» (cuenta en backlog oficial)'] == 'SI')).sum(), ((g.Planta == 'PLANTA LIMA') & (g['Dice «masivo» (cuenta en backlog oficial)'] == 'SI')).sum(), acc[k[0]]]
    for j, v in enumerate(vals, 1):
        c = ws.cell(r, j, int(v) if j in (2, 3, 4, 5, 6) else v); c.fill = PatternFill('solid', fgColor=col[k[0]]); c.border = bd
r += 1
tot = ['TOTAL suspendidos', len(o), (o.Planta == 'PLANTA ATE').sum(), (o.Planta == 'PLANTA LIMA').sum(),
       ((o.Planta == 'PLANTA ATE') & (o['Dice «masivo» (cuenta en backlog oficial)'] == 'SI')).sum(), ((o.Planta == 'PLANTA LIMA') & (o['Dice «masivo» (cuenta en backlog oficial)'] == 'SI')).sum(), '']
for j, v in enumerate(tot, 1): c = ws.cell(r, j, int(v) if j in (2, 3, 4, 5, 6) else v); c.font = B; c.border = bd
inac = o[o.Clasificacion.str.contains('INACTIVO')]
r += 2; ws.cell(r, 1, 'Lo que baja de la lista de suspendidos pendientes').font = Font(bold=True, size=12)
for t, g in [('Pasan a INACTIVO (4 + 5)', inac), ('Se excluyen por receta en RMD autorizado (0)', o[o.Clasificacion.str.startswith('0')])]:
    r += 1; ws.cell(r, 1, t); ws.cell(r, 2, len(g)); ws.cell(r, 3, int((g.Planta == 'PLANTA ATE').sum())); ws.cell(r, 4, int((g.Planta == 'PLANTA LIMA').sum()))
    ws.cell(r, 5, int(((g.Planta == 'PLANTA ATE') & (g['Dice «masivo» (cuenta en backlog oficial)'] == 'SI')).sum())); ws.cell(r, 6, int(((g.Planta == 'PLANTA LIMA') & (g['Dice «masivo» (cuenta en backlog oficial)'] == 'SI')).sum()))
pend = o[o.Clasificacion.str[0].isin(['1', '2', 'A'])]
r += 1; ws.cell(r, 1, 'Quedan pendientes de actualizar (1 + 2 + A)').font = B; ws.cell(r, 2, len(pend)).font = B; ws.cell(r, 3, int((pend.Planta == 'PLANTA ATE').sum())); ws.cell(r, 4, int((pend.Planta == 'PLANTA LIMA').sum()))
rev = o[o.Clasificacion.str.startswith('3')]
r += 1; ws.cell(r, 1, 'Por revisar (3)'); ws.cell(r, 2, len(rev)); ws.cell(r, 3, int((rev.Planta == 'PLANTA ATE').sum())); ws.cell(r, 4, int((rev.Planta == 'PLANTA LIMA').sum()))
r += 1; ws.cell(r, 1, 'Ojo: el backlog oficial del cuadro de Indicadores solo cuenta los suspendidos con «masivo» en Observaciones. Solo 26 suspendidos lo tienen hoy; el resto no suma al backlog oficial, pero si a la lista de suspendidos pendientes.').alignment = Alignment(wrap_text=True)
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7); ws.row_dimensions[r].height = 30
r += 2; ws.cell(r, 1, 'Criterio (en orden; la primera regla que se cumple decide)').font = Font(bold=True, size=12)
crit = [
 ('0 EXCLUIDO', 'Algun material vinculado al suspendido (receta de la ultima version, material por defecto, recetas de versiones anteriores o, si no tiene, el cod. agrupador de la misma etapa) esta en la receta de un RMD Autorizado vigente de OTRO master.'),
 ('A MANTENER', 'El master ya tiene una nueva version Solicitada o Solicitud Aprobada.'),
 ('1 Prioridad alta', 'Tiene lotes en los ultimos 12 meses y forecast nov-26/oct-27 > 0.'),
 ('2 Prioridad media', 'Tiene forecast > 0 pero no lotes en 12 meses.'),
 ('3 Revisar', 'Lotes en 12 meses sin forecast; o sin receta pero con descripcion casi igual (>= 85 %) a un RMD autorizado de la misma etapa; o RMD antiguo sin receta parecido a un producto activo.'),
 ('4 INACTIVO sugerido', 'Sin forecast; el ultimo lote fue hace 12 a 24 meses.'),
 ('5 INACTIVO recomendado', 'Sin forecast y sin lotes en 24 meses, o nunca fabricado en SAP, o RMD antiguo sin receta ni material vinculado.'),
 ('Vinculos', 'Lotes: ordenes COOISPI del material (todas las versiones de fabricacion). Semielaborados 50xx -> producto terminado por lote compartido en COOISPI, para buscar su forecast.'),
 ('Nombre del status', 'Recomendado: INACTIVO, con motivo obligatorio (Sin demanda / RMD antiguo sin receta SAP / Duplicado). Es reversible: cada mes, si un INACTIVO aparece con forecast u orden planificada, vuelve a Suspendido.')]
for a, b in crit:
    r += 1; ws.cell(r, 1, a).font = B; c = ws.cell(r, 2, b); c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7); ws.row_dimensions[r].height = 45
r += 2; ws.cell(r, 1, 'Glosario (terminos del Excel)').font = Font(bold=True, size=12)
glos = [('RMD antiguo (antes «RMD antiguo»)', 'RMD de codigo de 5 digitos (ej. 12914), anterior a SAP, que nunca se asocio a una receta de SAP. Sin receta no se puede comprobar si el producto se fabrica por lotes; por eso se mira el nombre.'),
 ('Receta / material', 'Codigo SAP (50xx semielaborado, 60xx/62xx/63xx producto terminado) asociado al RMD en «Asociar formulas».'),
 ('PT', 'Producto terminado. Los semielaborados (50xx) se vinculan a su PT por el lote compartido en la COOISPI, para buscar su forecast.'),
 ('Lotes', 'Ordenes de la COOISPI con cantidad entregada o en curso, desde feb-2023 (migracion a SAP).'),
 ('Forecast', 'Demanda consensuada de nov-2026 a oct-2027 del Forecast consolidado MIF 202610.'),
 ('Masivo', 'La Observacion del suspendido dice «masivo»: es lo unico que hoy cuenta en el backlog oficial del cuadro de Indicadores.'),
 ('Pendiente / Inactivo / Revisar', 'Pendiente = hay que generar nueva version. Inactivo = propuesta de nuevo status, no se genera nueva version. Revisar = falta una decision con Planeamiento.'),
 ('PLM status', 'Dato del forecast (Z1, Z2). Z2 parece producto descontinuado, falta confirmar con Planeamiento.')]
for a, b in glos:
    r += 1; ws.cell(r, 1, a).font = B; c = ws.cell(r, 2, b); c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7); ws.row_dimensions[r].height = 45
ws.column_dimensions['A'].width = 48
for L, w in zip('BCDEFG', [10, 11, 11, 12, 12, 60]): ws.column_dimensions[L].width = w
ws.row_dimensions[5].height = 30
# Detalle
d = wb.create_sheet('Detalle')
cols = list(o.columns)
for j, h in enumerate(cols, 1):
    c = d.cell(1, j, h); c.font = HF; c.fill = H; c.alignment = Alignment(wrap_text=True, vertical='center')
for i, row in enumerate(o.itertuples(index=False), 2):
    for j, v in enumerate(row, 1):
        if isinstance(v, float) and pd.isna(v): v = None
        d.cell(i, j, v)
    d.cell(i, 1).fill = PatternFill('solid', fgColor=col[row[0][0]])
wid = {'Clasificacion': 60, 'Productos terminados (PT) vinculados': 50, 'Motivo': 45, 'Descripcion': 45, 'Observacion': 50, 'Materiales vinculados': 50, 'PT vinculados': 50, 'RMD autorizado con la misma receta': 40, 'RMD ingresado con la misma receta': 30, 'Posible duplicado por descripcion': 40, 'Producto parecido activo (por descripcion)': 40, 'Clasificacion propuesta anterior': 28}
for j, h in enumerate(cols, 1): d.column_dimensions[get_column_letter(j)].width = wid.get(h, 14)
d.row_dimensions[1].height = 45; d.freeze_panes = 'C2'; d.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(o)+1}"
wb.save(OUT); print(OUT)
