export const NOTAS_VALIDAS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export const NOTA_APROBACION = 6;

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ'];

export function notaValida(nota: number | null | undefined): boolean {
  if (nota == null) return true;
  return NOTAS_VALIDAS.some((valor) => Math.abs(valor - nota) < 0.001);
}

export function notaEnLetras(nota: number): string {
  if (!notaValida(nota) || nota == null) return '';
  const entera = Math.floor(nota);
  const media = Math.abs(nota - entera - 0.5) < 0.001;
  if (media) return `${UNIDADES[entera]} CON CINCUENTA`;
  return UNIDADES[entera] ?? '';
}

export function aFechaCorta(valor: string): string {
  const corto = valor.trim();
  if (/^\d{2}\/\d{2}$/.test(corto)) return corto;
  const iso = /^(\d{4})-(\d{2})/.exec(corto);
  if (iso) return `${iso[2]}/${iso[1].slice(2)}`;
  return corto.slice(0, 7);
}
