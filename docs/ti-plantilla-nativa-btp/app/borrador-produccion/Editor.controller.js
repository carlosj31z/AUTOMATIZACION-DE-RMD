/*
 * DÓNDE: app/borrador-produccion/webapp/controller/Editor.controller.js
 * Editor del borrador para Producción. Cada acción crea una fila en Cambios (MD_BORRADOR_CAMBIO);
 * el RMD no se toca: eso solo lo hace el equipo RMD al ingresar.
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
  "use strict";

  return Controller.extend("rmd.borrador.produccion.controller.Editor", {

    onInit: function () {
      this.getView().setModel(new JSONModel({ nodos: [] }), "hoja");
      this.getView().setModel(new JSONModel({ totalCambios: 0, pila: [] }), "vista");
      this.getOwnerComponent().getRouter().getRoute("editor").attachPatternMatched(this._cargar, this);
    },

    _cargar: async function (oEvent) {
      const id = oEvent.getParameter("arguments").id;
      const ctx = this.getView().getModel("borrador").bindContext(`/Borradores(${id})`, null, { $expand: "cambios" });
      const b = await ctx.requestObject();
      this._borradorId = id;
      this.getView().bindElement({ path: `/Borradores(${id})`, model: "borrador" });
      this.getView().getModel("hoja").setProperty("/nodos", this._armarArbol(JSON.parse(b.contenido), b.cambios));
      this.getView().getModel("vista").setProperty("/totalCambios", b.cambios.length);
    },

    // Editar el texto de un paso: buscador en vivo con pasos de la MISMA etiqueta primero.
    onEditar: function (oEvent) {
      const nodo = oEvent.getParameter("row").getBindingContext("hoja").getObject();
      const lista = new sap.m.List({ mode: "SingleSelectMaster" });
      const campo = new sap.m.TextArea({ value: nodo.texto, width: "100%", rows: 3, liveChange: (e) => this._buscar(e.getParameter("value"), nodo, lista) });
      const dlg = new sap.m.Dialog({
        title: `Editar ${nodo.esPm ? "proceso menor" : "paso"} ${nodo.codigo || ""}`,
        contentWidth: "48rem",
        content: [campo, new sap.m.Title({ text: "Pasos parecidos (misma etiqueta)", level: "H5" }), lista],
        beginButton: new sap.m.Button({
          text: "Aceptar", type: "Emphasized",
          press: async () => {
            const elegido = lista.getSelectedItem();
            if (elegido && !elegido.data("mismaEtiqueta")) {
              MessageBox.error("Solo se puede usar un paso de la misma etiqueta."); return;
            }
            await this._registrar(elegido
              ? { tipo: "CAMBIAR_PASO", pasoIdNuevo: elegido.data("pasoId") }
              : { tipo: "CAMBIAR_TEXTO", textoNuevo: campo.getValue() }, nodo);
            dlg.close();
          }
        }),
        endButton: new sap.m.Button({ text: "Cancelar", press: () => dlg.close() }),
        afterClose: () => dlg.destroy()
      });
      dlg.open();
      this._buscar(nodo.texto, nodo, lista);
    },

    _buscar: async function (texto, nodo, lista) {
      clearTimeout(this._t);
      this._t = setTimeout(async () => {
        const f = this.getView().getModel("borrador").bindContext("/buscarPasos(...)");
        f.setParameter("texto", texto).setParameter("estructuraId", nodo.estructuraId).setParameter("etiquetaId", nodo.etiquetaId).setParameter("top", 15);
        await f.execute();
        const res = f.getBoundContext().getObject().value;
        lista.removeAllItems();
        res.forEach((p) => {
          const it = new sap.m.StandardListItem({
            title: p.descripcion, description: `${p.codigo} · ${p.parecido}% parecido`,
            info: p.mismaEtiqueta ? "Misma etiqueta" : "Otra etiqueta", infoState: p.mismaEtiqueta ? "Success" : "Error"
          });
          it.data("pasoId", p.pasoId); it.data("mismaEtiqueta", p.mismaEtiqueta);
          lista.addItem(it);
        });
      }, 300);
    },

    // Guarda un cambio en el servidor (no en el navegador): queda en el audit trail del borrador.
    _registrar: async function (cambio, nodo) {
      const lista = this.getView().getModel("borrador").bindList(`/Borradores(${this._borradorId})/cambios`);
      const vista = this.getView().getModel("vista");
      const ctx = lista.create(Object.assign({
        orden: vista.getProperty("/totalCambios") + 1,
        mdEstructuraId: nodo.mdEstructuraId, mdEsEtiquetaId: nodo.mdEsEtiquetaId,
        mdEstructuraPasoId: nodo.mdEstructuraPasoId, filaPadreId: nodo.filaPadreId, posicion: nodo.posicion
      }, cambio));
      await ctx.created();
      vista.setProperty("/totalCambios", vista.getProperty("/totalCambios") + 1);
      vista.getProperty("/pila").push(ctx);
      MessageToast.show("Cambio guardado.");
    },

    onDeshacer: async function () {
      const pila = this.getView().getModel("vista").getProperty("/pila");
      const ctx = pila.pop(); if (!ctx) return;
      await ctx.delete();
      const v = this.getView().getModel("vista"); v.setProperty("/totalCambios", v.getProperty("/totalCambios") - 1);
    },

    onEnviar: async function () {
      const ctx = this.getView().getBindingContext("borrador");
      const accion = this.getView().getModel("borrador").bindContext("BorradorService.enviar(...)", ctx);
      try { await accion.execute(); MessageBox.success("Enviado al equipo RMD."); }
      catch (e) { MessageBox.error(e.message); }
    },

    // Arma el árbol con la numeración del PDF del master (4.4.24) y aplica los cambios ya guardados.
    _armarArbol: function (rmd, cambios) {
      // TODO TI: reutilizar la función de numeración del PDF del master que ya tiene la app.
      return rmd.estructuras.map((e) => ({
        texto: e.descripcion, numeracion: e.numeracion, mdEstructuraId: e.mdEstructuraId, estructuraId: e.estructuraId_estructuraId,
        hijos: rmd.etiquetas.filter((t) => t.mdEstructuraId_mdEstructuraId === e.mdEstructuraId).map((t) => ({
          texto: t.descripcion, mdEstructuraId: e.mdEstructuraId, mdEsEtiquetaId: t.mdEsEtiquetaId, etiquetaId: t.etiquetaId_etiquetaId,
          hijos: rmd.pasos.filter((p) => p.mdEsEtiquetaId_mdEsEtiquetaId === t.mdEsEtiquetaId).map((p, i) => ({
            texto: p.descripcion, codigo: p.codigo, posicion: i + 1, rpor: p.rpor, vb: p.vb,
            rangoTexto: p.valorInicial != null ? `${p.valorInicial} – ${p.valorFinal}` : "",
            mdEstructuraId: e.mdEstructuraId, mdEsEtiquetaId: t.mdEsEtiquetaId, mdEstructuraPasoId: p.mdEstructuraPasoId,
            estructuraId: e.estructuraId_estructuraId, etiquetaId: t.etiquetaId_etiquetaId,
            marca: cambios.some((c) => c.mdEstructuraPasoId === p.mdEstructuraPasoId) ? "Cambiado" : null
          }))
        }))
      }));
    }
  });
});
