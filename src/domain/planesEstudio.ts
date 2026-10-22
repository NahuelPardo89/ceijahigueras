/**
 * Plan de estudio que carga el admin. Empieza vacío: no hay currícula precargada.
 * El id de cada materia es opaco y no cambia si le corrigen el nombre.
 * Ese id es el que debe usar `rac/{racId}/calificaciones/{materiaId}`
 * (hoy el RAC viejo guarda el mismo rol en `espacioId`).
 */

export interface PlanEstudio {
  id: string;
  orientacion: string;
  resolucion: string;
  validezNacional: string;
  activo: boolean;
  enUso: boolean;
  creadoPor: string;
  fechaCreacion: string;
}

export interface NivelEstudio {
  id: string;
  codigo: string;
  anioCurso: number;
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

export interface MateriaEstudio {
  id: string;
  nombre: string;
  orden: number;
  /** Clave estable (`matematica`, `atp`, o la que surja de un nombre nuevo). */
  area: string;
  /** Texto que eligió el admin. Se copia a la nota; la clave no se muestra. */
  areaNombre: string;
  /** Vacío, o un código `n.m` (por ejemplo `1.3`) para cruzar con una planilla. */
  codigo: string;
  comparteEntreNiveles: boolean;
  activo: boolean;
  enUso: boolean;
}

export interface ModuloConMaterias extends ModuloEstudio {
  materias: MateriaEstudio[];
}

export interface NivelConModulos extends NivelEstudio {
  modulos: ModuloConMaterias[];
}

export interface ArbolPlan {
  plan: PlanEstudio;
  niveles: NivelConModulos[];
}

export interface AreaCatalogo {
  clave: string;
  nombre: string;
}

/** Sugerencias de la sede. No se escriben solas en Firestore. */
export const AREAS_SUGERIDAS: readonly AreaCatalogo[] = [
  { clave: 'matematica', nombre: 'Matemática' },
  { clave: 'naturales', nombre: 'Naturales' },
  { clave: 'sociales', nombre: 'Sociales' },
  { clave: 'ingles', nombre: 'Inglés' },
  { clave: 'lengua', nombre: 'Lengua' },
  { clave: 'atp', nombre: 'ATP' },
];

const MAX_TEXTO = 160;
const MAX_AREA = 80;

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

export function claveArea(nombre: string): string | null {
  const clave = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!clave || clave.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clave)) return null;
  return clave;
}

function textoObligatorio(valor: string, etiqueta: string, max = MAX_TEXTO): string | null {
  const limpio = valor.trim();
  if (!limpio) return `${etiqueta} es obligatorio.`;
  if (limpio.length > max) return `${etiqueta} es demasiado largo.`;
  if (/[\n\r]/.test(limpio)) return `${etiqueta} tiene que ir en una sola línea.`;
  return null;
}

export function validarPlanEstudio(input: {
  orientacion: string;
  resolucion: string;
  validezNacional: string;
}): string | null {
  return textoObligatorio(input.orientacion, 'La orientación')
    ?? textoObligatorio(input.resolucion, 'La resolución')
    ?? textoObligatorio(input.validezNacional, 'La validez nacional');
}

export interface DatosPlanEstudio {
  orientacion: string;
  resolucion: string;
  validezNacional: string;
}

export function prepararPlanEstudio(input: DatosPlanEstudio): Resultado<DatosPlanEstudio> {
  const error = validarPlanEstudio(input);
  if (error) return { ok: false, error };
  return {
    ok: true,
    datos: {
      orientacion: input.orientacion.trim(),
      resolucion: input.resolucion.trim(),
      validezNacional: input.validezNacional.trim(),
    },
  };
}

export interface DatosNivel {
  codigo: string;
  anioCurso: number;
  nombre: string;
  orden: number;
}

export function prepararNivel(input: DatosNivel): Resultado<DatosNivel> {
  const codigo = input.codigo.trim();
  if (!codigo) return { ok: false, error: 'El código del nivel es obligatorio.' };
  if (codigo.length > 12 || /[\n\r]/.test(codigo)) {
    return { ok: false, error: 'El código del nivel tiene que ser corto, en una sola línea.' };
  }
  if (!Number.isInteger(input.anioCurso) || input.anioCurso < 1 || input.anioCurso > 9) {
    return { ok: false, error: 'El año de cursada tiene que ser un número del 1 al 9.' };
  }
  const nombreError = textoObligatorio(input.nombre, 'El nombre del nivel');
  if (nombreError) return { ok: false, error: nombreError };
  if (!Number.isInteger(input.orden) || input.orden < 1 || input.orden > 99) {
    return { ok: false, error: 'El orden del nivel tiene que ser un entero del 1 al 99.' };
  }
  return {
    ok: true,
    datos: { codigo, anioCurso: input.anioCurso, nombre: input.nombre.trim(), orden: input.orden },
  };
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

export interface DatosMateria {
  nombre: string;
  orden: number;
  area: string;
  areaNombre: string;
  codigo: string;
  comparteEntreNiveles: boolean;
  activo: boolean;
}

export function prepararMateria(input: DatosMateria): Resultado<DatosMateria> {
  const nombreError = textoObligatorio(input.nombre, 'El nombre de la materia');
  if (nombreError) return { ok: false, error: nombreError };
  if (!Number.isInteger(input.orden) || input.orden < 1 || input.orden > 99) {
    return { ok: false, error: 'El orden de la materia tiene que ser un entero del 1 al 99.' };
  }
  const area = input.area.trim();
  const areaNombre = input.areaNombre.trim();
  if (!area || claveArea(area) !== area) {
    return { ok: false, error: 'Elegí un área, o escribí una nueva.' };
  }
  const areaError = textoObligatorio(areaNombre, 'El nombre del área', MAX_AREA);
  if (areaError) return { ok: false, error: areaError };
  if (claveArea(areaNombre) !== area) {
    return { ok: false, error: 'El área no coincide con el nombre elegido.' };
  }
  if (!codigoMateriaValido(input.codigo)) {
    return { ok: false, error: 'El código es opcional. Si lo cargás, usá el formato de la planilla, por ejemplo 1.3.' };
  }
  return {
    ok: true,
    datos: {
      nombre: input.nombre.trim(),
      orden: input.orden,
      area,
      areaNombre,
      codigo: input.codigo.trim(),
      comparteEntreNiveles: input.comparteEntreNiveles,
      activo: input.activo,
    },
  };
}

export function resolverArea(
  seleccion: string,
  nombreLibre: string,
  catalogo: readonly AreaCatalogo[],
): { area: string; areaNombre: string } | null {
  if (seleccion && seleccion !== '__otra') {
    const conocida = catalogo.find((item) => item.clave === seleccion)
      ?? AREAS_SUGERIDAS.find((item) => item.clave === seleccion);
    if (!conocida) return null;
    return { area: conocida.clave, areaNombre: conocida.nombre };
  }
  const areaNombre = nombreLibre.trim();
  const area = claveArea(areaNombre);
  if (!area) return null;
  return { area, areaNombre };
}

export function puedeEliminarPorUso(enUso: boolean): boolean {
  return enUso !== true;
}

export function puedeEliminarContenedor(enUso: boolean, hijos: ReadonlyArray<{ enUso: boolean }>): boolean {
  return enUso !== true && hijos.every((hijo) => hijo.enUso !== true);
}

export function materiasActivas(materias: readonly MateriaEstudio[]): MateriaEstudio[] {
  return materias
    .filter((materia) => materia.activo)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Un RAC nuevo exige al menos una materia activa en el nivel. */
export function puedeAbrirRacEnNivel(materias: readonly MateriaEstudio[]): boolean {
  return materiasActivas(materias).length > 0;
}

export function idCalificacionDeMateria(materiaId: string): string {
  const id = materiaId.trim();
  if (!id) throw new Error('La materia necesita un id opaco.');
  return id;
}

export interface CopiaCalificacion {
  materiaId: string;
  espacioId: string;
  nombre: string;
  modulo: string;
  orden: number;
  codigo: string;
  area: string;
  compartidoM8: boolean;
}

/**
 * Copia que se guarda en la calificación al abrir el RAC.
 * `espacioId` repite el id de la materia para que las pantallas que todavía
 * leen ese campo sigan apuntando al mismo documento.
 */
export function copiaParaCalificacion(materia: MateriaEstudio, moduloNombre: string): CopiaCalificacion {
  const materiaId = idCalificacionDeMateria(materia.id);
  return {
    materiaId,
    espacioId: materiaId,
    nombre: materia.nombre,
    modulo: moduloNombre,
    orden: materia.orden,
    codigo: materia.codigo,
    area: materia.area,
    compartidoM8: materia.comparteEntreNiveles,
  };
}

export function areasDelArbol(niveles: readonly NivelConModulos[]): AreaCatalogo[] {
  const extras = new Map<string, string>();
  for (const nivel of niveles) {
    for (const modulo of nivel.modulos) {
      for (const materia of modulo.materias) {
        if (!AREAS_SUGERIDAS.some((area) => area.clave === materia.area)) {
          extras.set(materia.area, materia.areaNombre);
        }
      }
    }
  }
  return [
    ...AREAS_SUGERIDAS,
    ...[...extras.entries()].map(([clave, nombre]) => ({ clave, nombre })),
  ];
}
