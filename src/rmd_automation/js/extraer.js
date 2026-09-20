// Lector de solo lectura de un RMD del portal Configuración RMD (SAP UI5, dentro de un iframe).
// Se ejecuta en la página del Launchpad ya autenticada: window.__extraerRmd(codigo) -> snapshot.
// No escribe nada: solo abre diálogos de consulta y los cierra con Cancelar/Cerrar.
(() => {
  const W = (ms) => new Promise((r) => setTimeout(r, ms));
  const F = () => document.querySelector('iframe');
  const CORE = () => F().contentWindow.sap.ui.getCore();
  const vis = (e) => e.getClientRects().length > 0;
  const TOP = () => {
    const ds = [...F().contentDocument.querySelectorAll('[role=dialog],[role=alertdialog]')].filter(vis);
    return ds[ds.length - 1];
  };
  const until = async (pred, ms = 12000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (pred()) return true; } catch (e) {} await W(250); }
    return false;
  };
  const lblOf = (i) => {
    const doc = F().contentDocument;
    return (i.getAttribute('aria-labelledby') || '').split(' ')
      .map((id) => doc.getElementById(id)?.textContent.trim()).filter(Boolean).join('');
  };
  const rowsOf = (d) => [...d.querySelectorAll('tbody tr')].filter(vis);
  const press = (title) => {
    const d = TOP(); if (!d) return false;
    const b = [...d.querySelectorAll('button')].filter((x) => vis(x) && (x.title === title || x.textContent.trim() === title))[0];
    if (!b) return false;
    CORE().byId(b.id.replace(/-inner$/, '')).firePress(); return true;
  };
  const rowBtn = (rowText, title) => {
    const rt = rowText.replace(/\s+/g, ' ');
    const tr = [...TOP().querySelectorAll('tbody tr')].find((t) => vis(t) && t.textContent.replace(/\s+/g, ' ').includes(rt));
    const b = tr && [...tr.querySelectorAll('button')].find((x) => x.title === title || x.textContent.trim() === title);
    if (!b) return false;
    CORE().byId(b.id).firePress(); return true;
  };
  const ml = (label) => {
    const doc = F().contentDocument;
    const el = [...doc.querySelectorAll('input')].find((i) => vis(i) && !i.closest('[role=dialog]') &&
      (i.getAttribute('aria-labelledby') || '').split(' ').some((id) => {
        const e = doc.getElementById(id); return e && e.textContent.trim().replace(/[*:]$/, '') === label; }));
    return el && CORE().byId(el.id.replace(/-inner$/, ''));
  };
  const limpiarCombo = (c) => { if (!c) return; c.setSelectedItem(null); c.setValue(''); c.fireSelectionChange({ selectedItem: null }); c.fireChange({ value: '' }); };
  const cerrarTodo = async () => {
    for (let i = 0; i < 8 && TOP(); i++) { const b = TOP(); if (!press('Cancelar')) press('Cerrar'); await until(() => TOP() !== b, 6000); await W(400); }
  };
  const closeTop = async () => { const b = TOP(); if (!press('Cancelar')) press('Cerrar'); if (b) await until(() => TOP() !== b, 6000); await W(500); };
  const openPress = async (rowText, btn, re) => {
    const before = TOP();
    if (!rowBtn(rowText, btn)) return false;
    await W(600);
    const ok = await until(() => { const d = TOP(); return d && d !== before && re.test(d.innerText.slice(0, 160)) && rowsOf(d).length > 0; }, 15000);
    await W(ok ? 700 : 1500);
    return TOP() !== before;
  };
  // Las tablas de UI5 cargan de 20 en 20 ("growing"): se piden todas las páginas.
  const cargarTodo = async () => {
    const tbl = TOP().querySelector('table'); if (!tbl) return;
    const ctl = CORE().byId(tbl.id.replace(/-listUl$/, ''));
    const g = ctl && ctl._oGrowingDelegate;
    for (let i = 0; i < 40 && g && g.requestNewPage; i++) {
      const antes = rowsOf(TOP()).length; g.requestNewPage(); await W(900);
      if (rowsOf(TOP()).length === antes) break;
    }
  };
  const readPasos = () => rowsOf(TOP()).map((t) => {
    const f = {}; [...t.querySelectorAll('input')].filter((i) => i.type !== 'checkbox').forEach((i) => { f[lblOf(i)] = i.value; });
    const chk = [...t.querySelectorAll('[role=checkbox][aria-checked=true]')].map(lblOf).filter((x) => x && x !== 'Selección de elementos');
    const b = [...t.querySelectorAll('button')].find((x) => x.title === 'Procesos Menores');
    return { o: f['Orden'], dep: (f['Depende'] || '').trim(), cod: t.children[4]?.textContent.trim(),
      d: t.children[5]?.textContent.trim().replace(/\s+/g, ' '), td: f['Tipo Dato'], ck: f['Clave Modelo'], pt: f['Puesto Trabajo'],
      vi: f['Val. Inicial'], vf: f['Val. Final'], mg: f['Margen'], dc: f['Decimal'], chk: chk.join(','),
      pm: b ? !!b.querySelector('.sapMBtnInner')?.className.includes('Ghost') : false };
  });
  const readTable = () => rowsOf(TOP()).map((t) => [...t.children].map((c) => c.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean).join('|'));
  const readPM = () => rowsOf(TOP()).map((t) => {
    const f = {}; [...t.querySelectorAll('input')].filter((i) => i.type !== 'checkbox').forEach((i) => { f[lblOf(i)] = i.value; });
    const chk = [...t.querySelectorAll('[role=checkbox][aria-checked=true]')].map(lblOf).filter((x) => x && x !== 'Selección de elementos');
    return [f['Orden'], [...t.children].slice(2, 5).map((c) => c.textContent.trim().slice(0, 45)).join('/'), f['Cantidad Insumos'],
      f['Tipo Dato'], f['Val. Inicial'], f['Val. Final'], f['Margen'], f['Decim.'], chk.join(',')].join('|');
  });

  window.__extraerRmd = async (code) => {
    await cerrarTodo();
    const out = { code, structs: [] };
    limpiarCombo(ml('Etapa')); limpiarCombo(ml('Planta')); limpiarCombo(ml('Area')); limpiarCombo(ml('Estado del RMD'));
    const cr = ml('Codigo RMD'); cr.setValue(code); cr.fireChange({ value: code });
    CORE().byId(F().contentDocument.querySelector('[id$=btnGo]').id.replace(/-inner$/, '')).firePress(); await W(3500);
    const fila = [...F().contentDocument.querySelectorAll('tbody tr')].find((r) => vis(r) && r.children[1]?.textContent.trim() === code);
    if (!fila) throw new Error('No se encontró el RMD ' + code);
    const menu = CORE().byId(fila.querySelector('.sapMMenuBtn').id).getMenu();
    menu.fireItemSelected({ item: menu.getItems().find((i) => i.getText() === 'Configurar el RMD') });
    await until(() => TOP() && /Estructura de RMD/.test(TOP().innerText), 25000); await W(800);
    const ed = TOP();
    out.head = ed.innerText.split('\n').filter((x) => x.trim()).slice(0, 14).join(' ').slice(0, 200);
    const structs = rowsOf(ed).map((t) => ({ o: t.children[1]?.textContent.trim(), n: t.children[2]?.textContent.trim(),
      items: t.children[4]?.textContent.trim(), btn: [...t.querySelectorAll('button')].map((b) => b.title).filter(Boolean) }));
    for (const s of structs) {
      const st = { o: s.o, n: s.n, items: s.items, btn: s.btn.join(',') }; out.structs.push(st);
      try {
        if (s.btn.includes('Adicionar Etiqueta')) {
          if (!(await openPress(s.n, 'Adicionar Etiqueta', /Etiqueta \(/))) { st.err = 'etiquetas'; continue; }
          st.etq = [];
          const etqs = rowsOf(TOP()).map((t) => ({ o: t.children[2]?.textContent.trim(), n: t.children[4]?.textContent.trim() }));
          for (const e of etqs) {
            const o = { ...e };
            if (await openPress(e.n, 'Adicionar Pasos RMD', /Pasos \(/)) {
              await cargarTodo(); o.p = readPasos(); o.pm = {};
              for (const x of o.p.filter((x) => x.pm)) {
                const tr = rowsOf(TOP()).find((t) => t.children[2]?.querySelector('input')?.value === x.o);
                const b = tr && [...tr.querySelectorAll('button')].find((y) => y.title === 'Procesos Menores'); if (!b) continue;
                const antes = TOP(); CORE().byId(b.id).firePress();
                await until(() => TOP() !== antes && /Procesos Menores/.test(TOP().innerText), 10000); await W(1200);
                await cargarTodo(); o.pm[x.o] = readPM(); await closeTop();
              }
              await closeTop();
            } else o.err = 'pasos';
            st.etq.push(o);
          }
          await closeTop();
        } else if (s.btn.includes('Adicionar Pasos RMD')) {
          if (await openPress(s.n, 'Adicionar Pasos RMD', /Pasos \(/)) { await cargarTodo(); st.p = readPasos(); await closeTop(); }
        } else if (s.btn.includes('Adicionar Equipo')) {
          if (await openPress(s.n, 'Adicionar Equipo', /Equipos \(/)) { await cargarTodo(); st.eq = readTable(); await closeTop(); }
        } else if (s.btn.includes('Adicionar Especificaciones')) {
          if (await openPress(s.n, 'Adicionar Especificaciones', /Especificaciones \(/)) {
            st.esp = rowsOf(TOP()).map((t) => [...t.children].map((c) => c.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | ') +
              ' :: ' + [...t.querySelectorAll('input')].filter((i) => i.type !== 'checkbox').map((i) => lblOf(i) + '=' + i.value).join(';'));
            await closeTop();
          }
        } else if (s.btn.includes('Ver Insumos')) {
          if (await openPress(s.n, 'Ver Insumos', /Insumo/i)) { st.ins = readTable(); await closeTop(); }
        }
      } catch (e) { st.err = String(e); await cerrarTodo(); }
    }
    press('Cerrar'); await W(1200);
    out.done = true;
    return out;
  };
})();
