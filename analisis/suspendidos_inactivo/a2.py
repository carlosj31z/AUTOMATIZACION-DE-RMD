import re, unicodedata, difflib
import pandas as pd
from collections import defaultdict
HOY = pd.Timestamp('2026-11-05')
md = pd.read_pickle('md.pkl'); rc = pd.read_pickle('rc.pkl')
md['linaje'] = md['linaje'].where(md['linaje'].astype(str).str.strip() != '', md['codigo'])
md['version'] = pd.to_numeric(md['version'], errors='coerce').fillna(0).astype(int)
# cadenas de versiones: el campo «linaje» a veces apunta al codigo de la version anterior (no a la raiz): se unen por componentes conectados
md['codigo'] = md['codigo'].fillna('').astype(str).str.strip(); md['linaje'] = md['linaje'].fillna('').astype(str).str.strip()
md['linaje'] = md['linaje'].where(md['linaje'] != '', md['codigo'])
md['linaje'] = md['linaje'].where(md['linaje'] != '', 'SIN-' + md['mdId'].astype(str))
par = {}
def fnd(a):
    par.setdefault(a, a)
    while par[a] != a:
        par[a] = par[par[a]]; a = par[a]
    return a
for cdg, lin in zip(md['codigo'], md['linaje']):
    if cdg and lin and cdg != lin:
        ra, rb = fnd(cdg), fnd(lin)
        if ra != rb: par[ra] = rb
# mismo nombre + etapa + planta = misma familia (hay cadenas de versiones cortadas, codigoversionprincipal vacio)
VALIDOS_ = ['Autorizado', 'Ingresado', 'Suspendido']
kk = md['descripcion'].fillna('').str.upper().str.replace(r'\s+', ' ', regex=True).str.strip() + '|' + md['etapa'].fillna('') + '|' + md['planta'].fillna('')
for key, g in md[md['estado'].isin(VALIDOS_) & (md['descripcion'].fillna('').str.strip() != '')].groupby(kk):
    cods = [fnd(x) for x in g['linaje']]
    for x in cods[1:]:
        if x != cods[0]: par[x] = cods[0]; cods[0] = fnd(cods[0])
md['linaje_orig'] = md['linaje']
md['linaje'] = [fnd(c) if c else fnd(l) for c, l in zip(md['codigo'], md['linaje'])]
print('familias antes', md['linaje_orig'].nunique(), 'despues', md['linaje'].nunique())
txt_rc = rc.drop_duplicates('material').set_index('material')['texto'].str.strip().to_dict()
mats_md = rc.groupby('mdId')['material'].agg(set).to_dict()
md['mats'] = md['mdId'].map(lambda i: set(mats_md.get(i, set())))
md['def10'] = md['codDefecto'].where(md['codDefecto'].astype(str).str.match(r'^\d{10}$'), '')
VAL = ['Autorizado', 'Ingresado', 'Suspendido']
v = md[md.estado.isin(VAL)].sort_values(['linaje', 'version', 'fechaRegistro'])
ult = v.groupby('linaje').tail(1).set_index('linaje')
# vigente por familia: ultima Autorizada si la ultima version es Autorizada o Ingresada
aut = md[md.estado == 'Autorizado'].sort_values(['linaje', 'version']).groupby('linaje').tail(1).set_index('linaje')
vig = {}
for l, r in aut.iterrows():
    if l in ult.index and ult.loc[l, 'estado'] in ('Autorizado', 'Ingresado'):
        vig[l] = r
cubre = defaultdict(list)  # material -> lista de RMD autorizados vigentes
for l, r in vig.items():
    for m in r['mats'] | ({r['def10']} if r['def10'] else set()):
        cubre[m].append((l, f"{r['codigo']} v{r['version']} ({r['etapa']})"))
ing = defaultdict(list)
for l, r in ult[ult.estado == 'Ingresado'].iterrows():
    for m in r['mats'] | ({r['def10']} if r['def10'] else set()):
        ing[m].append((l, f"{r['codigo']} v{r['version']} ({r['etapa']})"))
# agrupador -> materiales por etapa
def agr_ok(a): a = str(a).strip(); return bool(a) and set(a) != {'0'}
agr = defaultdict(set)
for _, r in md[md.codAgrupador.map(agr_ok)].iterrows():
    agr[(r['codAgrupador'].lstrip('0'), r['etapa'])] |= r['mats'] | ({r['def10']} if r['def10'] else set())
fam_mats = md.groupby('linaje').apply(lambda g: set().union(*g['mats']) | set(x for x in g['def10'] if x)).to_dict()
# abiertas posteriores
sol = {}
for _, r in md[md.estado.isin(['Solicitado', 'Solicitud Aprobada'])].iterrows():
    l = r['linaje']
    if l in ult.index and r['version'] >= ult.loc[l, 'version']:
        sol[l] = f"{r['codigo'] or '(sin codigo)'} v{r['version']} {r['estado']}"
# COOISPI
c = pd.read_pickle('coois.pkl')
c['fecha'] = c['Fecha de fin real'].fillna(c['Hora inicio real']).fillna(c['Fecha liberac.real']).fillna(c['Fecha entrada'])
c = c[(c['Cantidad entregada (GMEIN)'].fillna(0) > 0) | c['Estado de sistema'].str.startswith(('LIB', 'ABIE'))]
txt_c = c.drop_duplicates('Número material').set_index('Número material')['Texto breve material'].to_dict()
bymat = {m: g for m, g in c.groupby('Número material')}
semi_pt = defaultdict(set)
for mats in c.groupby('Lote')['Número material'].agg(set):
    pts = {m for m in mats if m[:2] in ('60', '62', '63')}
    for m in mats:
        if m.startswith('5'): semi_pt[m] |= pts
# forecast
f = pd.read_pickle('fc.pkl')
mes = [x for x in f.columns if hasattr(x, 'year')]
for x in mes: f[x] = pd.to_numeric(f[x], errors='coerce').fillna(0)
m12 = [x for x in mes if pd.Timestamp('2026-11-01') <= x <= pd.Timestamp('2027-10-01')]
f['fc12'] = f[m12].sum(axis=1)
fc = f.drop_duplicates('Product ID S4').set_index('Product ID S4')
def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper()
    return ' '.join(re.findall(r'[A-Z0-9]+', s))
aut_desc = [(norm(r['descripcion']), r['etapa'], f"{r['codigo']} v{r['version']}") for l, r in vig.items()]
rows = []
sus = ult[ult.estado == 'Suspendido']
for l, r in sus.iterrows():
    mats = set(r['mats']) | ({r['def10']} if r['def10'] else set()); origen = 'receta de la ultima version' if r['mats'] else ('material por defecto' if r['def10'] else '')
    if not mats:
        fm = fam_mats.get(l, set())
        if fm: mats, origen = fm, 'recetas de versiones anteriores'
    if not mats and agr_ok(r['codAgrupador']):
        am = agr.get((r['codAgrupador'].lstrip('0'), r['etapa']), set())
        if 0 < len(am) <= 15: mats, origen = set(am), 'cod. agrupador (otros RMD misma etapa)'
    # cobertura por RMD autorizado (otra familia)
    cov = sorted(set(s for m in mats for (ll, s) in cubre.get(m, []) if ll != l))
    covi = sorted(set(s for m in mats for (ll, s) in ing.get(m, []) if ll != l))
    desc_sim = ''
    if not mats:
        nd = norm(r['descripcion']); best = (0, '')
        for d, e, s in aut_desc:
            if e != r['etapa']: continue
            q = difflib.SequenceMatcher(None, nd, d).ratio()
            if q > best[0]: best = (q, s + ' ' + d)
        if best[0] >= 0.85: desc_sim = f"{best[1]} ({best[0]:.0%})"
    g = pd.concat([bymat[m] for m in mats if m in bymat]) if any(m in bymat for m in mats) else None
    lotes = g['Lote'].nunique() if g is not None else 0
    ultf = g['fecha'].max() if g is not None else pd.NaT
    l12 = g[g.fecha >= HOY - pd.DateOffset(months=12)]['Lote'].nunique() if g is not None else 0
    l24 = g[g.fecha >= HOY - pd.DateOffset(months=24)]['Lote'].nunique() if g is not None else 0
    pts = {m for m in mats if not m.startswith('5')}
    for m in mats:
        if m.startswith('5'): pts |= semi_pt.get(m, set())
    fcm = fc.loc[[p for p in pts if p in fc.index]]
    fc12 = float(fcm['fc12'].sum()); plm = ', '.join(sorted(set(fcm['PLM Status'].astype(str)) - {'(None)', 'nan'}))
    obs = str(r['observacion']); masivo = 'masivo' in obs.lower()
    # clasificacion
    if cov:
        cl, motivo = '0 EXCLUIDO - receta en RMD autorizado', 'Su receta/material ya esta en un RMD autorizado vigente: no se considera (ni inactivo ni pendiente)'
    elif l in sol:
        cl, motivo = 'A MANTENER - ya tiene nueva version solicitada', 'Ya hay una solicitud de nueva version en curso'
    elif fc12 > 0 and l12 > 0:
        cl, motivo = '1 MANTENER - prioridad alta', 'Se fabrico en los ultimos 12 meses y tiene forecast'
    elif fc12 > 0:
        cl, motivo = '2 MANTENER - prioridad media', 'Tiene forecast pero sin lotes en 12 meses (posible relanzamiento)'
    elif l12 > 0:
        cl, motivo = '3 REVISAR - se fabrica sin forecast', 'Lotes en 12 meses pero sin forecast nov-26/oct-27: confirmar con Planeamiento'
    elif desc_sim:
        cl, motivo = '3 REVISAR - posible duplicado por descripcion', 'Sin receta; descripcion casi igual a un RMD autorizado de la misma etapa'
    elif l24 > 0:
        cl, motivo = '4 INACTIVO sugerido', 'Sin forecast; ultimo lote hace 12 a 24 meses'
    elif not mats:
        cl, motivo = '5 INACTIVO recomendado', 'Sin receta ni material vinculado en SAP y sin forecast (legado)'
    else:
        cl, motivo = '5 INACTIVO recomendado', 'Sin forecast y sin lotes en 24 meses' + (' (nunca fabricado en SAP)' if lotes == 0 else '')
    T = lambda ms: ' | '.join(f"{m} {txt_c.get(m) or txt_rc.get(m) or ''}".strip() for m in sorted(ms)[:8]) + (' ...' if len(ms) > 8 else '')
    rows.append({'Clasificacion': cl, 'Motivo': motivo, 'Planta': r['planta'], 'Area': r['area'], 'Etapa': r['etapa'],
        'Codigo RMD (ultima version)': r['codigo'], 'Version': r['version'], 'Familia (codigo principal)': l, 'Descripcion': r['descripcion'],
        'Estado': r['estado'], 'Fecha suspension/autorizacion': r['fechaAutorizacion'], 'Ultima edicion': r['fechaActualiza'], 'Usuario ultima edicion': r['usuarioActualiza'],
        'Motivo SAP': r['motivo'], 'Observacion': obs, 'Masivo (cuenta en backlog)': 'SI' if masivo else 'NO',
        'Origen del material': origen or 'sin vinculo', 'Materiales vinculados': T(mats),
        'RMD autorizado con la misma receta': '; '.join(cov), 'RMD ingresado con la misma receta': '; '.join(covi), 'Posible duplicado por descripcion': desc_sim,
        'Nueva version solicitada': sol.get(l, ''),
        'Lotes desde SAP (feb-2023)': lotes, 'Lotes ultimos 24m': l24, 'Lotes ultimos 12m': l12, 'Ultimo lote': ultf.date() if pd.notna(ultf) else None,
        'PT vinculados': T(pts), 'PT en forecast': len(fcm), 'Forecast nov26-oct27 (unid)': round(fc12), 'PLM status': plm})
out = pd.DataFrame(rows).sort_values(['Clasificacion', 'Planta', 'Area', 'Descripcion'])
out.to_pickle('out.pkl')
print(len(out)); print(pd.crosstab(out.Clasificacion, out.Planta, margins=True))
print(pd.crosstab(out.Clasificacion, [out.Planta, out['Masivo (cuenta en backlog)']], margins=True))
r = out[out['Codigo RMD (ultima version)'] == '12914'].iloc[0]; print(r[['Clasificacion', 'Origen del material', 'RMD autorizado con la misma receta']].to_dict())
