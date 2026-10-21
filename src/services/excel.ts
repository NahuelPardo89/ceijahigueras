import * as XLSX from 'xlsx';
import type { Calificacion, EstudiantePrivado, ResumenItem } from '../domain/types';

export interface FilaExportacion {
  resumen: ResumenItem;
  privado: EstudiantePrivado | null;
  calificaciones: Calificacion[];
  planNombre: string;
  anio: number;
}

const AVISO = 'Uso interno de la sede. Contiene datos personales (Ley 25.326). No reenviar. La app no reemplaza al Libro Matriz ni al SGE.';

function descargar(wb: XLSX.WorkBook, nombre: string) {
  XLSX.writeFile(wb, nombre);
}

function anchos(filas: (string | number | null)[][]) {
  const columnas = filas[0]?.length ?? 0;
  return Array.from({ length: columnas }, (_, indice) => {
    const maximo = filas.reduce((ancho, fila) => Math.max(ancho, String(fila[indice] ?? '').length), 8);
    return { wch: Math.min(maximo + 2, 42) };
  });
}

export function exportarDirectorio(filas: FilaExportacion[], anio: number, incluirSensibles: boolean) {
  const encabezado = incluirSensibles
    ? ['Apellido', 'Nombre', 'DNI', 'CUIL', 'Email', 'Teléfono', 'Fecha de nacimiento', 'Plan', 'Orientación', 'Estado', 'Cohorte']
    : ['Apellido', 'Nombre', 'DNI enmascarado', 'Plan', 'Orientación', 'Estado', 'Cohorte'];
  const cuerpo = filas.map((fila) => incluirSensibles
    ? [
      fila.resumen.apellido,
      fila.resumen.nombre,
      fila.privado?.dni ?? '',
      fila.privado?.cuil ?? '',
      fila.privado?.email ?? '',
      fila.privado?.telefono ?? '',
      fila.privado?.fechaNacimiento ?? '',
      fila.planNombre,
      fila.resumen.orientacion,
      fila.resumen.estado,
      fila.resumen.cohorte,
    ]
    : [
      fila.resumen.apellido,
      fila.resumen.nombre,
      fila.resumen.dniEnmascarado,
      fila.planNombre,
      fila.resumen.orientacion,
      fila.resumen.estado,
      fila.resumen.cohorte,
    ]);
  const datos = [['Aviso', AVISO], [], encabezado, ...cuerpo];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja['!cols'] = anchos([encabezado, ...cuerpo]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, `Directorio ${anio}`.slice(0, 31));
  descargar(libro, `CEIJA Higueras directorio ${anio}.xlsx`);
}

export function exportarRac(filas: FilaExportacion[], anio: number) {
  const libro = XLSX.utils.book_new();
  const aviso = XLSX.utils.aoa_to_sheet([[AVISO]]);
  XLSX.utils.book_append_sheet(libro, aviso, 'Aviso');
  const porPlan = new Map<string, FilaExportacion[]>();
  for (const fila of filas) {
    const grupo = porPlan.get(fila.planNombre) ?? [];
    grupo.push(fila);
    porPlan.set(fila.planNombre, grupo);
  }
  for (const [plan, grupo] of porPlan) {
    const espacios = new Map<string, string>();
    for (const fila of grupo) {
      for (const nota of fila.calificaciones) espacios.set(nota.espacioId, nota.nombre);
    }
    const columnas = [...espacios.entries()];
    const encabezado = ['Apellido', 'Nombre', 'DNI enmascarado', ...columnas.map(([, nombre]) => nombre)];
    const cuerpo = grupo.map((fila) => {
      const porEspacio = new Map(fila.calificaciones.map((nota) => [nota.espacioId, nota]));
      return [
        fila.resumen.apellido,
        fila.resumen.nombre,
        fila.resumen.dniEnmascarado,
        ...columnas.map(([id]) => {
          const nota = porEspacio.get(id);
          if (!nota || nota.notaFinal == null) return nota?.estado === 'adeuda' ? 'ADEUDA' : '';
          return `${nota.notaFinal} ${nota.fecha}`.trim();
        }),
      ];
    });
    const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...cuerpo]);
    hoja['!cols'] = anchos([encabezado, ...cuerpo]);
    XLSX.utils.book_append_sheet(libro, hoja, plan.slice(0, 31));
  }
  descargar(libro, `CEIJA Higueras RAC ${anio}.xlsx`);
}

export interface FilaPlanilla {
  apellido: string;
  nombre: string;
  dniEnmascarado: string;
  nota: string;
  tpi: string;
  fecha: string;
  condicion: string;
  estado: string;
}

export function exportarPlanilla(filas: FilaPlanilla[], titulo: string) {
  const encabezado = ['Apellido', 'Nombre', 'DNI enmascarado', 'Nota', 'En letras / TPI', 'Fecha', 'Condición', 'Estado'];
  const cuerpo = filas.map((fila) => [fila.apellido, fila.nombre, fila.dniEnmascarado, fila.nota, fila.tpi, fila.fecha, fila.condicion, fila.estado]);
  const datos = [[AVISO], encabezado, ...cuerpo];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja['!cols'] = anchos([encabezado, ...cuerpo]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Planilla');
  descargar(libro, `${titulo}.xlsx`);
}
