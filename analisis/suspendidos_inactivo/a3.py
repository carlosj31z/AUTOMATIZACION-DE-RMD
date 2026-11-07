import pandas as pd
o = pd.read_pickle('out.pkl'); x = pd.read_pickle('rcx.pkl')
leg = x[x.Clasificacion.str.startswith('4b')].set_index('Codigo RMD')['Material parecido por descripcion (legados)']
o['Producto parecido activo (por descripcion)'] = o['Codigo RMD (ultima version)'].map(leg).fillna('')
mask = o.Clasificacion.str.startswith('5') & (o['Origen del material'] == 'sin vinculo') & (o['Producto parecido activo (por descripcion)'] != '')
o.loc[mask, 'Clasificacion'] = '3 REVISAR - legado con producto activo'
o.loc[mask, 'Motivo'] = 'Sin receta en SAP, pero su descripcion se parece a un producto con lotes o forecast: confirmar'
ant = x.set_index('Codigo RMD')['Clasificacion']
o['Clasificacion propuesta anterior'] = o['Codigo RMD (ultima version)'].map(ant).fillna('(no estaba)')
o = o.sort_values(['Clasificacion', 'Planta', 'Area', 'Descripcion'])
o.to_pickle('out2.pkl')
print(pd.crosstab(o.Clasificacion, o.Planta, margins=True))
print(pd.crosstab(o.Clasificacion, [o.Planta, o['Masivo (cuenta en backlog)']]))
