import type { AsignacionDocente, DocentePerfil } from './types';

export function claveEspacio(planId: string, espacioId: string, anio: number): string {
  return `${planId}|${espacioId}|${anio}`;
}

export function clavePlanAnio(planId: string, anio: number): string {
  return `${planId}|${anio}`;
}

export function racIdDe(estudianteId: string, anio: number, planId: string): string {
  return `${estudianteId}_${anio}_${planId}`;
}

export function indiceIdDe(anio: number, planId: string, espacioId: string): string {
  return `${anio}_${planId}_${espacioId}`;
}

export function resumenIdDe(anio: number): string {
  return `estudiantes_${anio}`;
}

export function armarDocente(
  nombre: string,
  email: string,
  asignaciones: AsignacionDocente[],
): DocentePerfil {
  const espacios: Record<string, boolean> = {};
  const planesAnio: Record<string, boolean> = {};
  const claves: string[] = [];
  let ensenaM8 = false;
  for (const asignacion of asignaciones) {
    const clave = claveEspacio(asignacion.planId, asignacion.espacioId, asignacion.anio);
    espacios[clave] = true;
    planesAnio[clavePlanAnio(asignacion.planId, asignacion.anio)] = true;
    claves.push(clave);
    if (asignacion.compartidoM8) ensenaM8 = true;
  }
  return { nombre, email, claves, espacios, planesAnio, ensenaM8, asignaciones };
}
