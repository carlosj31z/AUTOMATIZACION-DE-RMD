// =====================================================================
// Borrador de Producción para un RMD: tablas nuevas.
// DÓNDE: carpeta db/ del proyecto CAP del portal RMD, junto al schema.cds
//        que ya define MD, MD_ESTRUCTURA, MD_ES_PASO, PASO, etc.
// AJUSTAR: el namespace y la ruta del "using" a los del proyecto real.
// =====================================================================
namespace rmd.borrador;

using { cuid, managed } from '@sap/cds/common';
// TODO TI: reemplazar por el namespace real donde está la entidad MD.
using { MD } from '../db/schema';

// Estados del borrador (no confundir con los estados del RMD 465/467/468).
type EstadoBorrador : String(20) enum {
  BORRADOR;     // Producción está editando
  ENVIADO;      // Producción lo envió al equipo RMD
  EN_REVISION;  // el equipo RMD lo está revisando
  INGRESADO;    // los cambios se escribieron en el RMD
  RECHAZADO;    // el equipo RMD lo devolvió con motivo
  REVERTIDO;    // se deshizo el ingreso
}

type TipoCambio : String(20) enum {
  CAMBIAR_TEXTO; CAMBIAR_PASO; AGREGAR_PASO; AGREGAR_PM; QUITAR;
  MOVER; RANGO; CASILLAS; EQUIPO_AGREGAR; EQUIPO_QUITAR;
  UTENSILIO_AGREGAR; UTENSILIO_QUITAR; INSUMO_EN_PASO; CANTIDAD_INSUMO; COMENTARIO;
}

@cds.persistence.journal                       // tabla versionada en HANA (cambios de esquema sin pérdida)
@changelog: [numero]                           // audit trail con @cap-js/change-tracking
entity MD_BORRADOR : cuid, managed {           // managed = createdAt/By, modifiedAt/By del servidor
  numero            : Integer @readonly;      // correlativo visible: «Borrador N° 152»
  md                : Association to MD;      // versión del RMD sobre la que se generó
  mdCodigo          : String(20);
  mdVersion         : Integer;
  // Foto del RMD al generar: sirve para detectar cambios en SAP antes de ingresar.
  fotoHash          : String(64);             // SHA-256 del contenido leído (pasos, orden, rangos, equipos)
  fotoFechaActualiza: Timestamp;              // MD.fechaActualiza al generar
  contenido         : LargeString;            // JSON de la plantilla (estructuras, etiquetas, pasos, PM, equipos, insumos)
  estado            : EstadoBorrador default 'BORRADOR' @changelog;
  // Solicitud
  solicitante       : String(120) @changelog;
  area              : String(60)  @changelog;
  motivo            : String(500) @changelog;
  controlCambio     : String(40)  @changelog;    // p. ej. 26-379-CC
  motivoRechazo     : String(500) @changelog;
  // Ingreso (firma electrónica, GxP-02)
  ingresadoPor      : String(255) @readonly;
  ingresadoEn       : Timestamp   @readonly;
  firmaSignificado  : String(60)  @readonly;     // «Ingreso de cambios al RMD»
  mdIdDestino       : String(36)  @readonly;     // versión Ingresada donde se escribió
  cambios           : Composition of many MD_BORRADOR_CAMBIO on cambios.borrador = $self;
  resultado         : Composition of many MD_BORRADOR_ESCRITURA on resultado.borrador = $self;
}

@changelog: [borrador.numero, orden]
entity MD_BORRADOR_CAMBIO : cuid, managed {
  borrador          : Association to MD_BORRADOR;
  orden             : Integer;                // orden en que Producción los hizo
  tipo              : TipoCambio @changelog;
  // Dónde: ids del RMD (los mismos nombres de columna que MD_ES_PASO)
  mdEstructuraId    : String(36);
  mdEsEtiquetaId    : String(36);
  mdEstructuraPasoId: String(36);             // fila existente (vacío si es nueva)
  filaPadreId       : String(36);             // paso mayor, para procesos menores
  posicion          : Integer;                // posición final en su lista
  // Qué
  pasoIdNuevo       : String(36) @changelog;  // paso del catálogo elegido
  textoNuevo        : String(1000) @changelog;// texto escrito por Producción
  valorInicial      : Decimal(18, 6);
  valorFinal        : Decimal(18, 6);
  margen            : Decimal(18, 6);
  rpor              : Boolean;
  vb                : Boolean;
  anotaProduccion   : String(20);             // DATO, CHECK, RANGO, FECHA_HORA, SOLO_LEER
  equipoId          : String(40);
  cantidad          : Decimal(18, 6);
  comentario        : String(1000);
  // Resultado de la revisión
  severidad         : String(10);             // OK, AVISO, BLOQUEO
  mensaje           : String(1000);
  editadoPorRmd     : String(1000) @changelog;// nota cuando el equipo RMD corrige la fila
}

// Cada escritura hecha en el RMD, con el valor anterior: sirve para verificar y para revertir.
entity MD_BORRADOR_ESCRITURA : cuid, managed {
  borrador   : Association to MD_BORRADOR;
  secuencia  : Integer;
  entidad    : String(60);                    // MD_ES_PASO, MD_ES_PASO_INSUMO_PASO, PASO, MD_ES_EQUIPO...
  claveFila  : String(36);
  operacion  : String(10);                    // CREATE, UPDATE, BAJA
  antes      : LargeString;                   // JSON del valor anterior
  despues    : LargeString;                   // JSON del valor nuevo
}
