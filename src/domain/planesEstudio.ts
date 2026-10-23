/**
 * Plan de estudio que carga el admin. Empieza vacío: no hay currícula precargada.
 * El id de cada asignatura es opaco y no cambia si le corrigen el nombre.
 */

export interface PlanEstudio {
  id: string;
  nombre: string;
  orientacion: string;
  resolucion: string;
  validezNacional: string;
  activo: boolean;
  enUso: boolean;
  creadoPor: string;
  fechaCreacion: string;
}

export interface AnioEstudio {
  id: string;
  nombre: string;
  orden: number;
  enUso: boolean;
}

export interface ModuloEstudio {
  id: string;
  nombre: string;
  orden: number;
  enUso: boolean;
}

export interface AsignaturaEstudio {
  id: string;
  nombre: string;
  orden: number;
  /** Vacío, o un código `n.m` (por ejemplo `1.3`) para cruzar con una planilla. */
  codigo: string;
  activo: boolean;
  enUso: boolean;
}

export interface ModuloConAsignaturas extends ModuloEstudio {
  asignaturas: AsignaturaEstudio[];
}

export interface AnioConModulos extends AnioEstudio {
  modulos: ModuloConAsignaturas[];
}

export interface ArbolPlan {
  plan: PlanEstudio;
  anios: AnioConModulos[];
}

const MAX_TEXTO = 160;

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

function textoObligatorio(valor: string, etiqueta: string, max = MAX_TEXTO): string | null {
  const limpio = valor.trim();
  if (!limpio) return `${etiqueta} es obligatorio.`;
  if (limpio.length > max) return `${etiqueta} es demasiado largo.`;
  if (/[\n\r]/.test(limpio)) return `${etiqueta} tiene que ir en una sola línea.`;
  return null;
}

export interface DatosPlanEstudio {
  nombre: string;
  orientacion: string;
  resolucion: string;
  validezNacional: string;
}

export function prepararPlanEstudio(input: DatosPlanEstudio): Resultado<DatosPlanEstudio> {
  const error = textoObligatorio(input.nombre, 'El nombre')
    ?? textoObligatorio(input.orientacion, 'La orientación')
    ?? textoObligatorio(input.resolucion, 'La resolución')
    ?? textoObligatorio(input.validezNacional, 'La validez nacional');
  if (error) return { ok: false, error };
  return {
    ok: true,
    datos: {
      nombre: input.nombre.trim(),
      orientacion: input.orientacion.trim(),
      resolucion: input.resolucion.trim(),
      validezNacional: input.validezNacional.trim(),
    },
  };
}

export interface DatosAnio {
  nombre: string;
  orden: number;
}

export function prepararAnio(input: DatosAnio): Resultado<DatosAnio> {
  const nombreError = textoObligatorio(input.nombre, 'El nombre del plan o año');
  if (nombreError) return { ok: false, error: nombreError };
  if (!Number.isInteger(input.orden) || input.orden < 1 || input.orden > 99) {
    return { ok: false, error: 'El orden tiene que ser un entero del 1 al 99.' };
  }
  return { ok: true, datos: { nombre: input.nombre.trim(), orden: input.orden } };
}

export interface DatosModulo {
  nombre: string;
  orden: number;
}

export function prepararModulo(input: DatosModulo): Resultado<DatosModulo> {
  const nombreError = textoObligatorio(input.nombre, 'El nombre del módulo');
  if (nombreError) return { ok: false, error: nombreError };
  if (!Number.isInteger(input.orden) || input.orden < 1 || input.orden > 99) {
    return { ok: false, error: 'El orden del módulo tiene que ser un entero del 1 al 99.' };
  }
  return { ok: true, datos: { nombre: input.nombre.trim(), orden: input.orden } };
}

export function codigoMateriaValido(codigo: string): boolean {
  const limpio = codigo.trim();
  return limpio === '' || /^\d{1,2}\.\d{1,2}$/.test(limpio);
}

export interface DatosAsignatura {
  nombre: string;
  orden: number;
  codigo: string;
  activo: boolean;
}

export function prepararAsignatura(input: DatosAsignatura): Resultado<DatosAsignatura> {
  const nombreError = textoObligatorio(input.nombre, 'El nombre de la asignatura');
  if (nombreError) return { ok: false, error: nombreError };
  if (!Number.isInteger(input.orden) || input.orden < 1 || input.orden > 99) {
    return { ok: false, error: 'El orden de la asignatura tiene que ser un entero del 1 al 99.' };
  }
  if (!codigoMateriaValido(input.codigo)) {
    return { ok: false, error: 'El código es opcional. Si lo cargás, usá el formato de la planilla, por ejemplo 1.3.' };
  }
  return {
    ok: true,
    datos: {
      nombre: input.nombre.trim(),
      orden: input.orden,
      codigo: input.codigo.trim(),
      activo: input.activo,
    },
  };
}

export function puedeEliminarPorUso(enUso: boolean): boolean {
  return enUso !== true;
}

export function puedeEliminarContenedor(enUso: boolean, hijos: ReadonlyArray<{ enUso: boolean }>): boolean {
  return enUso !== true && hijos.every((hijo) => hijo.enUso !== true);
}

export function asignaturasActivas(asignaturas: readonly AsignaturaEstudio[]): AsignaturaEstudio[] {
  return asignaturas
    .filter((asignatura) => asignatura.activo)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Un RAC nuevo, cuando exista esa etapa, exige al menos una asignatura activa. */
export function puedeAbrirRacEnAnio(asignaturas: readonly AsignaturaEstudio[]): boolean {
  return asignaturasActivas(asignaturas).length > 0;
}

export function idAsignatura(asignaturaId: string): string {
  const id = asignaturaId.trim();
  if (!id) throw new Error('La asignatura necesita un id opaco.');
  return id;
}
