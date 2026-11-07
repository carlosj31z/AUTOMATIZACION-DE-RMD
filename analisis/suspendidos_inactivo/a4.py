import pandas as pd
o = pd.read_pickle('out2.pkl')
ren = {'0 EXCLUIDO - receta en RMD autorizado': '0 EXCLUIDO - su receta ya esta en un RMD autorizado',
 '1 MANTENER - prioridad alta': '1 PENDIENTE - prioridad alta (actualizar primero)',
 '2 MANTENER - prioridad media': '2 PENDIENTE - prioridad media (solo forecast)',
 'A MANTENER - ya tiene nueva version solicitada': 'A PENDIENTE - ya tiene nueva version solicitada',
 '3 REVISAR - se fabrica sin forecast': '3 REVISAR - se fabrica pero no tiene forecast',
 '3 REVISAR - posible duplicado por descripcion': '3 REVISAR - sin receta SAP y nombre casi igual a un RMD autorizado',
 '3 REVISAR - legado con producto activo': '3 REVISAR - sin receta SAP, pero un producto parecido si se fabrica',
 '4 INACTIVO sugerido': '4 INACTIVO sugerido - sin forecast, ultimo lote hace 1 a 2 anios',
 '5 INACTIVO recomendado': '5 INACTIVO recomendado - sin forecast y sin lotes en 2 anios (o sin receta SAP)'}
o['Clasificacion'] = o['Clasificacion'].replace(ren)
o['Motivo'] = o['Motivo'].str.replace('(legado)', '(RMD antiguo sin receta SAP)', regex=False).str.replace('legado', 'RMD antiguo', regex=False)
o['Motivo'] = o['Motivo'].replace({'Sin receta ni material vinculado en SAP y sin forecast (RMD antiguo sin receta SAP)': 'RMD antiguo (anterior a SAP): no tiene ninguna receta SAP asociada y no hay forecast'})
o['Clasificacion propuesta anterior'] = o['Clasificacion propuesta anterior'].str.replace('legado', 'RMD antiguo', regex=False)
o = o.rename(columns={'Familia (codigo principal)': 'Codigo principal del master', 'Origen del material': 'De donde saque la receta/material',
 'Materiales vinculados': 'Materiales (receta) vinculados', 'PT vinculados': 'Productos terminados (PT) vinculados', 'PT en forecast': 'Cuantos PT estan en forecast',
 'Masivo (cuenta en backlog)': 'Dice «masivo» (cuenta en backlog oficial)', 'Posible duplicado por descripcion': 'Nombre casi igual a RMD autorizado',
 'Producto parecido activo (por descripcion)': 'Producto parecido que si se fabrica', 'Ultimo lote': 'Fecha del ultimo lote', 'PLM status': 'PLM status del producto (forecast)'})
o['De donde saque la receta/material'] = o['De donde saque la receta/material'].replace({'sin vinculo': 'no tiene receta ni material', 'receta de la ultima version': 'receta de su ultima version', 'material por defecto': 'material por defecto del RMD',
 'recetas de versiones anteriores': 'recetas de versiones anteriores', 'cod. agrupador (otros RMD misma etapa)': 'otros RMD con el mismo codigo agrupador y etapa'})
o.to_pickle('out3.pkl'); print(o.Clasificacion.value_counts())
