import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
t = pd.read_pickle('traz.pkl'); md = pd.read_pickle('md.pkl'); o = pd.read_pickle('out3.pkl')
md['version'] = pd.to_numeric(md['version']).astype(int)
s = t[t.estado == 'Suspendido'].groupby('mdId').fecha.agg(['max', 'count'])
m = md[md.estado == 'Suspendido'][['mdId', 'codigo', 'version']].merge(s, on='mdId', how='left')
o = o.merge(m, left_on=['Codigo RMD (ultima version)', 'Version'], right_on=['codigo', 'version'], how='left').drop_duplicates('Codigo RMD (ultima version)')
H = pd.Timestamp('2026-11-06'); o['meses'] = (H - o['max']).dt.days / 30.4
def dec(r):
    c = r.Clasificacion[0]; mes = r.meses
    if c == '0': return 'NO CONSIDERAR', 'Su receta ya esta en un RMD autorizado: ' + (r['RMD autorizado con la misma receta'] or '')[:90]
    if c == 'A': return 'ACTUALIZAR', 'Ya tiene una nueva version solicitada'
    if c in '12':
        w = 'se fabrica y tiene forecast' if c == '1' else 'tiene forecast, sin lotes en 12 meses'
        if mes >= 24: w += f'; suspendido hace {mes/12:.1f} anios: urgente'
        return 'ACTUALIZAR', w
    if c == '3': return 'REVISAR', r.Motivo
    if mes < 6: return 'REVISAR', f'Sin forecast ni lotes recientes, pero se suspendio hace solo {mes:.0f} meses: confirmar antes de inactivar'
    why = 'Sin receta SAP (RMD antiguo) y sin forecast' if 'sin receta SAP' in r.Clasificacion else ('Sin forecast; ultimo lote hace 1 a 2 anios' if c == '4' else ('Sin forecast y nunca se fabrico en SAP' if r['Lotes desde SAP (feb-2023)'] == 0 else 'Sin forecast y sin lotes en 2 anios'))
    return 'PASAR A INACTIVO', why + f'; suspendido desde {r["max"]:%d/%m/%Y}'
o[['Decision', 'Por que']] = o.apply(lambda r: pd.Series(dec(r)), axis=1)
o['Planta'] = o.Planta.str.replace('PLANTA ', '')
cols = {'Decision': 'Decision sugerida', 'Planta': 'Planta', 'Area': 'Area', 'Etapa': 'Etapa', 'Codigo RMD (ultima version)': 'Codigo RMD', 'Version': 'Version', 'Descripcion': 'Descripcion',
        'max': 'Suspendido desde (ultima fecha, trazabilidad)', 'Fecha del ultimo lote': 'Fecha del ultimo lote', 'Lotes ultimos 12m': 'Lotes en 12 meses', 'Forecast nov26-oct27 (unid)': 'Forecast nov26-oct27 (unid)',
        'Dice «masivo» (cuenta en backlog oficial)': 'Dice «masivo»', 'Por que': 'Por que', 'Observacion': 'Observacion del RMD (portal)'}
out = o[list(cols)].rename(columns=cols)
out['Suspendido desde (ultima fecha, trazabilidad)'] = out['Suspendido desde (ultima fecha, trazabilidad)'].dt.date
out['Observacion del RMD (portal)'] = out['Observacion del RMD (portal)'].fillna('').astype(str).str.replace(r'\s*[\r\n]+\s*', ' / ', regex=True).str.strip()
out['Tu decision'] = ''
out['Tus observaciones'] = ''
orden = {'ACTUALIZAR': 0, 'REVISAR': 1, 'PASAR A INACTIVO': 2, 'NO CONSIDERAR': 3}
out = out.sort_values(by=['Decision sugerida', 'Planta', 'Area', 'Descripcion'], key=lambda c: c.map(orden) if c.name == 'Decision sugerida' else c)
out.to_pickle('simple.pkl')
print(pd.crosstab(out['Decision sugerida'], out.Planta, margins=True))
print(pd.crosstab(out['Decision sugerida'], [out.Planta, out['Dice «masivo»']]))
OUT = '/mnt/project-files/suspendidos-inactivo/Suspendidos_decision_simple_2026-11-06.xlsx'
col = {'ACTUALIZAR': 'F8CBAD', 'REVISAR': 'FFF2CC', 'PASAR A INACTIVO': 'C6E0B4', 'NO CONSIDERAR': 'D9D9D9'}
H1 = PatternFill('solid', fgColor='1F4E78'); HF = Font(bold=True, color='FFFFFF')
wb = Workbook(); ws = wb.active; ws.title = 'Resumen'
ws['A1'] = 'Suspendidos: que hacer con cada uno (6/11/2026)'; ws['A1'].font = Font(bold=True, size=14)
for j, h in enumerate(['Decision sugerida', 'Total', 'Planta ATE', 'Planta LIMA', 'Que significa'], 1):
    c = ws.cell(3, j, h); c.font = HF; c.fill = H1
sig = {'ACTUALIZAR': 'Hay que generar nueva version (se fabrican y tienen forecast). Es tu backlog real.',
       'REVISAR': 'Falta una decision: revisar con Planeamiento o confirmar que el producto ya no se hace.',
       'PASAR A INACTIVO': 'Sin forecast ni lotes recientes (o sin receta SAP): no vale la pena actualizarlos.',
       'NO CONSIDERAR': 'Su receta ya esta en otro RMD autorizado: no se actualiza ni se inactiva por ahora (puede ser duplicado).'}
r = 3
for k in orden:
    r += 1; g = out[out['Decision sugerida'] == k]
    for j, v in enumerate([k, len(g), int((g.Planta == 'ATE').sum()), int((g.Planta == 'LIMA').sum()), sig[k]], 1):
        c = ws.cell(r, j, v); c.fill = PatternFill('solid', fgColor=col[k]); c.alignment = Alignment(wrap_text=True, vertical='top')
r += 1
for j, v in enumerate(['TOTAL', len(out), int((out.Planta == 'ATE').sum()), int((out.Planta == 'LIMA').sum())], 1): ws.cell(r, j, v).font = Font(bold=True)
r += 2
notas = ['Como leer la lista: cada fila es el ULTIMO RMD de un master que esta Suspendido. Filtra por «Decision sugerida» y escribe tu decision final y tus observaciones en las dos ultimas columnas.',
 'Suspendido desde = la ultima vez que el RMD paso a Suspendido en la trazabilidad. Un suspendido sin forecast ni lotes y con menos de 6 meses de suspension no se pasa a inactivo: va a REVISAR.',
 'Lotes: ordenes de la COOISPI (feb-2023 a 5/11/2026). Forecast: demanda consensuada nov-2026 a oct-2027.',
 'Observacion del RMD (portal) = lo que dice el RMD en su campo Observacion (motivo de suspension, cambios, etc.). Dice «masivo»: esa Observacion lo menciona. Es lo unico que hoy cuenta en el backlog oficial del cuadro de Indicadores.',
 'Sin receta SAP = RMD antiguo (codigo de 5 digitos) que nunca se asocio a una receta de SAP.']
for n in notas:
    ws.cell(r, 1, n).alignment = Alignment(wrap_text=True, vertical='top'); ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5); ws.row_dimensions[r].height = 32; r += 1
for L, w in zip('ABCDE', [24, 10, 12, 12, 80]): ws.column_dimensions[L].width = w
d = wb.create_sheet('Lista')
heads = list(out.columns)
for j, h in enumerate(heads, 1):
    c = d.cell(1, j, h); c.font = HF; c.fill = H1; c.alignment = Alignment(wrap_text=True, vertical='center')
for i, row in enumerate(out.itertuples(index=False), 2):
    for j, v in enumerate(row, 1):
        if isinstance(v, float) and pd.isna(v): v = None
        d.cell(i, j, v)
    d.cell(i, 1).fill = PatternFill('solid', fgColor=col[row[0]])
for j, w in enumerate([20, 8, 24, 15, 13, 8, 48, 16, 14, 10, 14, 10, 80, 70, 22, 40], 1): d.column_dimensions[get_column_letter(j)].width = w
d.row_dimensions[1].height = 45; d.freeze_panes = 'H2'; d.auto_filter.ref = f"A1:{get_column_letter(len(heads))}{len(out)+1}"
wb.save(OUT); print(OUT)
