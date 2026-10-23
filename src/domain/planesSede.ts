import type { EspacioPlantilla, Institucion, Plan } from './types';

/**
 * Catálogo viejo de `planes/{id}/espacios`. Lo siguen usando el RAC,
 * la planilla y el seed del emulador. La pantalla Planes de Estudio
 * no lo lee ni lo siembra: esa currícula empieza vacía en `planesEstudio`.
 *
 * Versión de la plantilla de planes de la sede.
 * Arte y Cultura y Deportes no se cargan: la normativa de esas orientaciones
 * quedó sin resolver y el administrador puede crearlas desde la pantalla de planes.
 */
export const VERSION_PLANES_SEDE = 1;

export const INSTITUCION_INICIAL: Institucion = {
  nombre: 'CEIJA N° 12 "Remedios Escalada de San Martín"',
  cue: '140512501',
  sede: 'Las Higueras',
  region: '',
  resolucionVigente: '698/17 y 1206/17',
  modalidad: 'Combinada en Línea',
};

const M8: EspacioPlantilla = {
  id: 'm8-trabajo',
  nombre: 'Formación para el Trabajo',
  modulo: 'M8',
  area: 'ATP',
  orden: 6,
  compartidoM8: true,
  tipo: 'ATP',
};

export interface PlanSemilla extends Plan {
  espacios: EspacioPlantilla[];
}

export const PLANES_SEDE: PlanSemilla[] = [
  {
    id: 'A-698-CB',
    codigo: 'A',
    anioPlan: '1',
    ciclo: 'CB',
    resolucionCurricular: '84/11',
    resolucionDistancia: '698/17',
    orientacion: 'Ciclo Básico',
    version: VERSION_PLANES_SEDE,
    activo: true,
    nombre: 'Plan A — 1° año (Ciclo Básico)',
    espacios: [
      { id: 'matematica', nombre: 'Matemática', modulo: 'M1', area: 'Exactas', orden: 1, compartidoM8: false, tipo: 'EC' },
      { id: 'lengua', nombre: 'Lengua y Literatura', modulo: 'M2', area: 'Comunicación', orden: 2, compartidoM8: false, tipo: 'EC' },
      { id: 'naturales', nombre: 'Ciencias Naturales', modulo: 'M3', area: 'Naturales', orden: 3, compartidoM8: false, tipo: 'EC' },
      { id: 'sociales', nombre: 'Ciencias Sociales', modulo: 'M4', area: 'Sociales', orden: 4, compartidoM8: false, tipo: 'EC' },
      { id: 'ingles', nombre: 'Inglés', modulo: 'M5', area: 'Lenguas', orden: 5, compartidoM8: false, tipo: 'EC' },
      M8,
    ],
  },
  {
    id: 'B-1206-EyA',
    codigo: 'B',
    anioPlan: '2',
    ciclo: 'CO',
    resolucionCurricular: '148/13',
    resolucionDistancia: '1206/17',
    orientacion: 'Economía y Administración',
    version: VERSION_PLANES_SEDE,
    activo: true,
    nombre: 'Plan B — 2° año (Economía y Administración)',
    espacios: [
      { id: 'matematica', nombre: 'Matemática', modulo: 'M1', area: 'Exactas', orden: 1, compartidoM8: false, tipo: 'EC' },
      { id: 'lengua', nombre: 'Lengua y Literatura', modulo: 'M2', area: 'Comunicación', orden: 2, compartidoM8: false, tipo: 'EC' },
      { id: 'economia', nombre: 'Economía', modulo: 'M6', area: 'Economía', orden: 3, compartidoM8: false, tipo: 'EC' },
      { id: 'derecho-trabajo', nombre: 'Derecho del Trabajo', modulo: 'M7', area: 'Derecho', orden: 4, compartidoM8: false, tipo: 'EC' },
      { id: 'ciudadania', nombre: 'Ciudadanía y Participación', modulo: 'M3', area: 'Sociales', orden: 5, compartidoM8: false, tipo: 'EC' },
      M8,
    ],
  },
  {
    id: 'C-1206-EyA',
    codigo: 'C',
    anioPlan: '3',
    ciclo: 'CO',
    resolucionCurricular: '148/13',
    resolucionDistancia: '1206/17',
    orientacion: 'Economía y Administración',
    version: VERSION_PLANES_SEDE,
    activo: true,
    nombre: 'Plan C — 3° año (Economía y Administración)',
    espacios: [
      { id: 'matematica', nombre: 'Matemática', modulo: 'M1', area: 'Exactas', orden: 1, compartidoM8: false, tipo: 'EC' },
      { id: 'lengua', nombre: 'Lengua y Literatura', modulo: 'M2', area: 'Comunicación', orden: 2, compartidoM8: false, tipo: 'EC' },
      { id: 'proyecto', nombre: 'Proyecto de Orientación', modulo: 'M9', area: 'Orientación', orden: 3, compartidoM8: false, tipo: 'EC' },
      { id: 'vinculacion', nombre: 'Espacio de Vinculación', modulo: 'M9', area: 'Orientación', orden: 4, compartidoM8: false, tipo: 'EC' },
      { id: 'formacion-profesional', nombre: 'Formación Profesional', modulo: 'M7', area: 'Trabajo', orden: 5, compartidoM8: false, tipo: 'EC' },
      M8,
    ],
  },
];

export function planSiguienteId(planId: string): string | null {
  const orden = PLANES_SEDE.map((plan) => plan.id);
  const indice = orden.indexOf(planId);
  if (indice < 0 || indice >= orden.length - 1) return null;
  return orden[indice + 1];
}
