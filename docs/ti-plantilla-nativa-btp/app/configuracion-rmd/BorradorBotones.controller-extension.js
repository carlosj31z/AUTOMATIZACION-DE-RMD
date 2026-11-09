/*
 * DÓNDE: app UI5 «Configuración RMD». Se agrega como ControllerExtension del controlador de la lista
 * (o se copian los métodos al controlador). Ajustar los nombres de modelo ("detalleRmd") a los del portal.
 * Llama al servicio /borrador (OData V4) con un modelo declarado en manifest.json:
 *   "models": { "borrador": { "dataSource": "borradorService", "settings": { "operationMode": "Server" } } }
 *   "dataSources": { "borradorService": { "uri": "/borrador/", "type": "OData", "settings": { "odataVersion": "4.0" } } }
 */
sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/Fragment"
], function (ControllerExtension, MessageBox, MessageToast, Fragment) {
  "use strict";

  return ControllerExtension.extend("rmd.configuracion.ext.Borrador", {

    // Exportar › Plantilla para Producción
    onGenerarPlantilla: async function () {
      const vista = this.base.getView();
      const fila = this._filaSeleccionada();
      if (!fila) { MessageToast.show("Seleccione un RMD de la lista."); return; }
      const accion = vista.getModel("borrador").bindContext("/generarPlantilla(...)");
      accion.setParameter("mdId", fila.mdId);
      vista.setBusy(true);
      try {
        await accion.execute();
        const b = accion.getBoundContext().getObject();
        MessageBox.success(`Se creó el Borrador N° ${b.numero} de ${b.mdCodigo} v${b.mdVersion}. Producción ya lo ve en «Borradores de RMD».`);
      } catch (e) {
        MessageBox.error(e.message);
      } finally {
        vista.setBusy(false);
      }
    },

    // Ventana del RMD › Revisar borradores de Producción
    onAbrirBorradores: async function () {
      const vista = this.base.getView();
      if (!this._dlg) {
        this._dlg = await Fragment.load({ id: vista.getId(), name: "rmd.configuracion.ext.RevisarBorrador", controller: this });
        vista.addDependent(this._dlg);
      }
      const mdId = vista.getModel("detalleRmd").getProperty("/mdId");
      this._dlg.bindElement({ path: "/Borradores", model: "borrador", parameters: { $filter: `md_mdId eq '${mdId}' and (estado eq 'ENVIADO' or estado eq 'EN_REVISION')` } });
      this._dlg.open();
    },

    // Revisar (fase 1): pinta el plan con OK / AVISO / BLOQUEO
    onRevisar: async function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext("borrador");
      const accion = this.base.getView().getModel("borrador").bindContext("BorradorService.revisar(...)", ctx);
      await accion.execute();
      this.base.getView().getModel("plan").setData({ items: accion.getBoundContext().getObject().value });
    },

    // Ingresar (fase 2): firma electrónica
    onIngresar: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext("borrador");
      const campo = new sap.m.Input({ type: "Password", placeholder: "Contraseña" });
      const acepto = new sap.m.CheckBox({ text: "Revisé los avisos y los acepto" });
      const dlg = new sap.m.Dialog({
        title: "Firma electrónica: ingreso de cambios al RMD",
        content: [new sap.m.Text({ text: "Al firmar, confirma que revisó el plan y autoriza escribir estos cambios en el RMD Ingresado." }), campo, acepto],
        beginButton: new sap.m.Button({
          text: "Firmar e ingresar", type: "Emphasized",
          press: async () => {
            const accion = this.base.getView().getModel("borrador").bindContext("BorradorService.ingresar(...)", ctx);
            accion.setParameter("contrasena", campo.getValue());
            accion.setParameter("significado", "Ingreso de cambios al RMD");
            accion.setParameter("aceptoAvisos", acepto.getSelected());
            try {
              await accion.execute();
              const r = accion.getBoundContext().getObject();
              MessageBox.success(`Ingresado: ${r.escrituras} cambios.` + (r.tareasManuales.length ? `\nTareas a mano:\n- ${r.tareasManuales.join("\n- ")}` : ""));
              dlg.close();
            } catch (e) { MessageBox.error(e.message); }
          }
        }),
        endButton: new sap.m.Button({ text: "Cancelar", press: () => dlg.close() }),
        afterClose: () => dlg.destroy()
      });
      dlg.open();
    },

    _filaSeleccionada: function () {
      // TODO TI: id real de la tabla de la lista principal
      const tabla = this.base.byId("tablaRmd");
      const ctx = tabla && tabla.getSelectedContexts && tabla.getSelectedContexts()[0];
      return ctx ? ctx.getObject() : null;
    }
  });
});
