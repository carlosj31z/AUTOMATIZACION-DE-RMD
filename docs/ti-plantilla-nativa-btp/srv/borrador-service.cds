// =====================================================================
// Servicio del borrador de Producción.
// DÓNDE: carpeta srv/ del proyecto CAP del portal RMD.
// Se expone en OData V4 y, si la app UI5 actual usa OData V2 (callFunction),
// también por el adaptador V2 que ya use el portal (@cap-js-community/odata-v2-adapter).
// =====================================================================
using { rmd.borrador as b } from '../db/borrador';

@path: '/borrador'
@requires: 'authenticated-user'
service BorradorService {

  // ---------- Producción (rol RMD_Borrador_Produccion) ----------
  @restrict: [
    { grant: ['READ'], to: ['RMD_Borrador_Produccion', 'RMD_Equipo'] },
    // Producción solo ve y cambia sus borradores mientras no los envió
    { grant: ['UPDATE'], to: 'RMD_Borrador_Produccion', where: 'createdBy = $user and estado = ''BORRADOR''' },
    { grant: ['UPDATE'], to: 'RMD_Equipo' }
  ]
  entity Borradores as projection on b.MD_BORRADOR
    actions {
      // Producción lo envía al equipo RMD (deja de poder editarlo)
      @(requires: 'RMD_Borrador_Produccion')
      action enviar() returns Borradores;

      // Equipo RMD: revisa contra el RMD actual sin escribir (fase 1)
      @(requires: 'RMD_Equipo')
      action revisar() returns array of PlanItem;

      // Equipo RMD: escribe en el RMD (fase 2). Pide firma electrónica.
      @(requires: 'RMD_Equipo')
      action ingresar(contrasena : String, significado : String, aceptoAvisos : Boolean) returns ResultadoIngreso;

      @(requires: 'RMD_Equipo')
      action rechazar(motivo : String) returns Borradores;

      @(requires: 'RMD_Equipo')
      action revertir(contrasena : String, motivo : String) returns ResultadoIngreso;
    };

  @restrict: [
    { grant: ['READ'], to: ['RMD_Borrador_Produccion', 'RMD_Equipo'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: 'RMD_Borrador_Produccion' }
  ]
  entity Cambios as projection on b.MD_BORRADOR_CAMBIO;

  @readonly
  @restrict: [{ grant: 'READ', to: ['RMD_Equipo', 'RMD_Calidad'] }]
  entity Escrituras as projection on b.MD_BORRADOR_ESCRITURA;

  // Genera el borrador de un RMD (Ingresado o Autorizado) y devuelve su id.
  @(requires: ['RMD_Borrador_Produccion', 'RMD_Equipo'])
  action generarPlantilla(mdId : String) returns Borradores;

  // Buscador de pasos para el editor: misma estructura y etiqueta primero.
  @(requires: ['RMD_Borrador_Produccion', 'RMD_Equipo'])
  function buscarPasos(texto : String, estructuraId : String, etiquetaId : String, top : Integer) returns array of PasoSugerido;

  type PasoSugerido {
    pasoId       : String;
    codigo       : String;
    descripcion  : String;
    mismaEtiqueta: Boolean;
    parecido     : Integer;   // 0–100
    usoEnRmd     : Integer;   // en cuántos RMD se usa
  }

  type PlanItem {
    cambioId  : String;
    lugar     : String;   // «PROCEDIMIENTO › FABRICACION»
    accion    : String;   // Agregar, Cambiar, Quitar, Orden, Rango, Casillas, Crear, Manual
    detalle   : String;
    severidad : String;   // OK, AVISO, BLOQUEO
    mensaje   : String;
  }

  type ResultadoIngreso {
    ok           : Boolean;
    escrituras   : Integer;
    diferencias  : array of String;  // verificación posterior (GxP-05)
    tareasManuales: array of String; // p. ej. cantidad de insumo en la Lista de Materiales
  }
}
