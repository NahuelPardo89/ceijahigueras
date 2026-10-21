export function normalizarDni(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function dniValido(dni: string): boolean {
  return /^[0-9]{7,8}$/.test(dni);
}

/** DNI enmascarado para pantallas que no son de administración. Ej.: **.***.482 */
export function enmascararDni(dni: string): string {
  const n = normalizarDni(dni);
  const ultimos = n.slice(-3).padStart(3, '0');
  return `**.***.${ultimos}`;
}
