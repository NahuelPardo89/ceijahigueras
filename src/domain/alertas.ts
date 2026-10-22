export type AlertaPase = 'vigente' | 'por-vencer' | 'vencido' | 'no-aplica';

export function sumarDiasIso(iso: string, dias: number): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, (mes || 1) - 1, dia || 1));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function hoyIso(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** El pase provisorio vence a los 60 días si no se convierte en definitivo. */
export function vencimientoPaseProvisorio(fechaIso: string): string {
  return sumarDiasIso(fechaIso, 60);
}

export function alertaPase(
  pase: { provisorio: boolean; definitivo: boolean; vencimiento: string },
  hoy: string = hoyIso(),
): AlertaPase {
  if (!pase.provisorio || pase.definitivo || !pase.vencimiento) return 'no-aplica';
  if (pase.vencimiento < hoy) return 'vencido';
  if (pase.vencimiento <= sumarDiasIso(hoy, 15)) return 'por-vencer';
  return 'vigente';
}

/** Las equivalencias de la sede se resuelven antes de julio del ciclo. */
export function equivalenciaFueraDeTermino(fechaIso: string, anioCiclo: number): boolean {
  const dia = fechaIso.slice(0, 10);
  return dia > `${anioCiclo}-07-01`;
}
