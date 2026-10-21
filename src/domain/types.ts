export type Rol = 'admin' | 'docente' | 'lectura' | 'pendiente';

export type EstadoCiclo = 'abierto' | 'cerrado';
export type EstadoRac = 'abierto' | 'cerrado';
export type Condicion = 'Reg' | 'Prev' | 'Equiv' | 'Lib' | '';
export type EstadoNota = 'pendiente' | 'aprobado' | 'adeuda';
export type Tpi = 'APROBADO' | 'REVISAR' | '';
export type TipoEspacio = 'EC' | 'ATP';
export type EstadoEstudiante = 'activo' | 'inactivo' | 'egresado';
export type TipoPase = 'ingreso' | 'egreso';

export interface Institucion {
  nombre: string;
  cue: string;
  sede: string;
  region: string;
  resolucionVigente: string;
  modalidad: string;
}

export interface Ciclo {
  anio: number;
  estado: EstadoCiclo;
  fechaCierre: string | null;
}

export interface Plan {
  id: string;
  codigo: string;
  anioPlan: string;
  ciclo: 'CB' | 'CO';
  resolucionCurricular: string;
  resolucionDistancia: string;
  orientacion: string;
  version: number;
  activo: boolean;
  nombre: string;
}

export interface EspacioPlantilla {
  id: string;
  nombre: string;
  modulo: string;
  area: string;
  orden: number;
  compartidoM8: boolean;
  tipo: TipoEspacio;
}

export interface EstudiantePublico {
  id: string;
  apellido: string;
  nombre: string;
  dniEnmascarado: string;
  tipoDoc: string;
  estado: EstadoEstudiante;
  sede: string;
  planActualId: string;
  orientacion: string;
  cohorte: number;
  condicionIngreso: Condicion;
  linkLegajoDrive: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface EstudiantePrivado {
  dni: string;
  dniNormalizado: string;
  cuil: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  paseProvisorio: boolean;
  paseDefinitivo: boolean;
  fotocopiaDni: boolean;
  cus: boolean;
  certificadoPrimaria: string;
  numeroEquivalencia: string;
  linkTitulo: string;
  documentacionCompleta: string;
  observaciones: string;
}

export interface ResumenItem {
  id: string;
  apellido: string;
  nombre: string;
  dniEnmascarado: string;
  planActualId: string;
  estado: EstadoEstudiante;
  orientacion: string;
  cohorte: number;
}

export interface FilaIndice {
  estudianteId: string;
  racId: string;
  apellido: string;
  nombre: string;
  dniEnmascarado: string;
}

export interface Calificacion {
  espacioId: string;
  nombre: string;
  modulo: string;
  tpi: Tpi;
  notaFinal: number | null;
  notaLetras: string;
  fecha: string;
  condicion: Condicion;
  docenteUid: string;
  actaNro: string;
  estado: EstadoNota;
  compartidoM8: boolean;
  orden: number;
  m8RacIds: string[];
  estudianteId: string;
  anio: number;
  planId: string;
}

export interface Rac {
  id: string;
  estudianteId: string;
  anio: number;
  planId: string;
  estado: EstadoRac;
  apellido: string;
  nombre: string;
  resumen: { promedio: number | null; adeuda: string[] };
}

export interface EquivalenciaRegistro {
  id?: string;
  estudianteId: string;
  espacioId: string;
  racId: string;
  nombreEspacio: string;
  origen: string;
  nota: number;
  fecha: string;
  resolucionInterna: string;
  refrendadaPor: string;
  modo: string;
  libroActasFolio: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface PaseRegistro {
  id?: string;
  estudianteId: string;
  apellido: string;
  nombre: string;
  tipo: TipoPase;
  escuelaOrigenDestino: string;
  fecha: string;
  provisorio: boolean;
  definitivo: boolean;
  vencimiento: string;
  formularioD: boolean;
  observaciones: string;
}

export interface AsignacionDocente {
  planId: string;
  espacioId: string;
  anio: number;
  compartidoM8: boolean;
  nombreEspacio?: string;
}

export interface DocentePerfil {
  nombre: string;
  email: string;
  claves: string[];
  espacios: Record<string, boolean>;
  planesAnio: Record<string, boolean>;
  ensenaM8: boolean;
  asignaciones: AsignacionDocente[];
}

export interface DocWrite {
  path: string;
  data: Record<string, unknown>;
}
