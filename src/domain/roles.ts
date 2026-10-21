import type { Rol } from './types';

export function normalizeRole(raw: unknown): Rol {
  if (raw === 'admin' || raw === 'Administrador') return 'admin';
  if (raw === 'docente' || raw === 'Profesor') return 'docente';
  if (raw === 'lectura') return 'lectura';
  return 'pendiente';
}

export function etiquetaRol(role: unknown): string {
  switch (normalizeRole(role)) {
    case 'admin':
      return 'Administrador';
    case 'docente':
      return 'Docente';
    case 'lectura':
      return 'Lectura';
    default:
      return 'Pendiente';
  }
}

export function esAdmin(role: unknown): boolean {
  return normalizeRole(role) === 'admin';
}

export function esDocente(role: unknown): boolean {
  return normalizeRole(role) === 'docente';
}

export function puedeVerDirectorio(role: unknown): boolean {
  const rol = normalizeRole(role);
  return rol === 'admin' || rol === 'lectura';
}
