import { enmascararDni } from './dni';
import { notaEnLetras, notaValida, NOTA_APROBACION } from './notas';
import { racIdDe } from './claves';
import type {
  Calificacion,
  Condicion,
  DocWrite,
  EspacioPlantilla,
  EstadoEstudiante,
  EstudiantePrivado,
  EstudiantePublico,
  FilaIndice,
  Plan,
  ResumenItem,
} from './types';

export interface EquivalenciaInicial {
  espacioId: string;
  nota: number;
  fecha: string;
}

export interface AltaEstudianteInput {
  estudianteId: string;
  logId: string;
  anio: number;
  plan: Plan;
  espacios: EspacioPlantilla[];
  apellido: string;
  nombre: string;
  dniNormalizado: string;
  tipoDoc: string;
  estado: EstadoEstudiante;
  sede: string;
  cohorte: number;
  condicionIngreso: Condicion;
  linkLegajoDrive: string;
  creadoPor: string;
  fechaCreacion: string;
  privado: EstudiantePrivado;
  equivalencias: EquivalenciaInicial[];
  /** RAC abiertos del mismo estudiante que ya tienen el M8 compartido. */
  m8RacIds: string[];
}

export function normalizarNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function estaAprobada(calificacion: Pick<Calificacion, 'notaFinal' | 'tpi' | 'condicion' | 'estado'>): boolean {
  if (calificacion.condicion === 'Equiv' && calificacion.notaFinal != null && calificacion.notaFinal >= NOTA_APROBACION) {
    return true;
  }
  if (calificacion.tpi === 'REVISAR') return false;
  return calificacion.notaFinal != null && calificacion.notaFinal >= NOTA_APROBACION;
}

export function estadoPorNota(nota: number | null, tpi: Calificacion['tpi']): Calificacion['estado'] {
  if (nota == null) return 'pendiente';
  if (tpi === 'REVISAR') return 'pendiente';
  if (nota >= NOTA_APROBACION && tpi === 'APROBADO') return 'aprobado';
  return 'pendiente';
}

export function calificacionDesdeEspacio(
  espacio: EspacioPlantilla,
  estudianteId: string,
  anio: number,
  planId: string,
  equivalencia: EquivalenciaInicial | undefined,
  m8RacIds: string[],
): Calificacion {
  const base: Calificacion = {
    espacioId: espacio.id,
    nombre: espacio.nombre,
    modulo: espacio.modulo,
    tpi: '',
    notaFinal: null,
    notaLetras: '',
    fecha: '',
    condicion: 'Reg',
    docenteUid: '',
    actaNro: '',
    estado: 'pendiente',
    compartidoM8: espacio.compartidoM8,
    orden: espacio.orden,
    m8RacIds: espacio.compartidoM8 ? m8RacIds : [],
    estudianteId,
    anio,
    planId,
  };
  if (!equivalencia) return base;
  if (!notaValida(equivalencia.nota) || equivalencia.nota < NOTA_APROBACION) {
    throw new Error(`La equivalencia de ${espacio.nombre} debe ser una nota válida de ${NOTA_APROBACION} a 10.`);
  }
  return {
    ...base,
    tpi: 'APROBADO',
    notaFinal: equivalencia.nota,
    notaLetras: notaEnLetras(equivalencia.nota),
    fecha: equivalencia.fecha,
    condicion: 'Equiv',
    estado: 'aprobado',
  };
}

export function resumenDeCalificaciones(calificaciones: Calificacion[]): { promedio: number | null; adeuda: string[] } {
  const notas = calificaciones
    .filter((calificacion) => estaAprobada(calificacion) && calificacion.notaFinal != null)
    .map((calificacion) => calificacion.notaFinal as number);
  const promedio = notas.length === 0
    ? null
    : Math.round((notas.reduce((suma, nota) => suma + nota, 0) / notas.length) * 100) / 100;
  const adeuda = calificaciones.filter((calificacion) => calificacion.estado === 'adeuda').map((calificacion) => calificacion.nombre);
  return { promedio, adeuda };
}

export function aplicarCierre(calificaciones: Calificacion[]): Calificacion[] {
  return calificaciones.map((calificacion) => {
    if (estaAprobada(calificacion)) {
      return { ...calificacion, estado: 'aprobado' as const };
    }
    return { ...calificacion, estado: 'adeuda' as const };
  });
}

export function parcheReplicaM8(origen: Calificacion): Pick<Calificacion, 'tpi' | 'notaFinal' | 'notaLetras' | 'fecha' | 'docenteUid' | 'estado'> {
  return {
    tpi: origen.tpi,
    notaFinal: origen.notaFinal,
    notaLetras: origen.notaLetras,
    fecha: origen.fecha,
    docenteUid: origen.docenteUid,
    estado: origen.estado,
  };
}

export function armarCalificacionesSiguiente(
  espacios: EspacioPlantilla[],
  anteriores: Calificacion[],
  estudianteId: string,
  anio: number,
  planId: string,
): { calificaciones: Calificacion[]; adeuda: string[] } {
  const porId = new Map(anteriores.map((calificacion) => [calificacion.espacioId, calificacion]));
  const porNombre = new Map(anteriores.map((calificacion) => [normalizarNombre(calificacion.nombre), calificacion]));
  const usadas = new Set<string>();
  const calificaciones = espacios.map((espacio) => {
    const previa = porId.get(espacio.id) ?? porNombre.get(normalizarNombre(espacio.nombre));
    const nacida = calificacionDesdeEspacio(espacio, estudianteId, anio, planId, undefined, []);
    if (!previa || estaAprobada(previa)) return nacida;
    usadas.add(previa.espacioId);
    return { ...nacida, condicion: 'Prev' as const, estado: 'pendiente' as const };
  });
  const adeudaHistorica = anteriores
    .filter((calificacion) => !estaAprobada(calificacion) && !usadas.has(calificacion.espacioId))
    .map((calificacion) => calificacion.nombre);
  const adeuda = [
    ...calificaciones.filter((calificacion) => calificacion.condicion === 'Prev').map((calificacion) => calificacion.nombre),
    ...adeudaHistorica,
  ];
  return { calificaciones, adeuda };
}

export function estudiantePublicoDe(input: AltaEstudianteInput): EstudiantePublico {
  return {
    id: input.estudianteId,
    apellido: input.apellido.trim(),
    nombre: input.nombre.trim(),
    dniEnmascarado: enmascararDni(input.dniNormalizado),
    tipoDoc: input.tipoDoc || 'DNI',
    estado: input.estado,
    sede: input.sede || 'Las Higueras',
    planActualId: input.plan.id,
    orientacion: input.plan.orientacion,
    cohorte: input.cohorte,
    condicionIngreso: input.condicionIngreso,
    linkLegajoDrive: input.linkLegajoDrive,
    creadoPor: input.creadoPor,
    fechaCreacion: input.fechaCreacion,
  };
}

export function itemResumen(estudiante: EstudiantePublico): ResumenItem {
  return {
    id: estudiante.id,
    apellido: estudiante.apellido,
    nombre: estudiante.nombre,
    dniEnmascarado: estudiante.dniEnmascarado,
    planActualId: estudiante.planActualId,
    estado: estudiante.estado,
    orientacion: estudiante.orientacion,
    cohorte: estudiante.cohorte,
  };
}

export function filaIndice(estudiante: EstudiantePublico, racId: string): FilaIndice {
  return {
    estudianteId: estudiante.id,
    racId,
    apellido: estudiante.apellido,
    nombre: estudiante.nombre,
    dniEnmascarado: estudiante.dniEnmascarado,
  };
}

/**
 * Documentos del alta atómica. El servicio los escribe en un solo writeBatch
 * junto con el índice por espacio y el resumen del ciclo.
 */
export function documentosAlta(input: AltaEstudianteInput): { racId: string; writes: DocWrite[]; calificaciones: Calificacion[] } {
  const estudiante = estudiantePublicoDe(input);
  const racId = racIdDe(input.estudianteId, input.anio, input.plan.id);
  const equivalencias = new Map(input.equivalencias.map((equivalencia) => [equivalencia.espacioId, equivalencia]));
  const calificaciones = input.espacios
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((espacio) => calificacionDesdeEspacio(
      espacio,
      input.estudianteId,
      input.anio,
      input.plan.id,
      equivalencias.get(espacio.id),
      input.m8RacIds,
    ));
  const resumen = resumenDeCalificaciones(calificaciones);
  const adeudaPrevias = calificaciones.filter((calificacion) => calificacion.condicion === 'Prev').map((calificacion) => calificacion.nombre);
  const writes: DocWrite[] = [
    {
      path: `dniIndex/${input.dniNormalizado}`,
      data: { estudianteId: input.estudianteId },
    },
    {
      path: `estudiantes/${input.estudianteId}`,
      data: { ...estudiante },
    },
    {
      path: `estudiantes/${input.estudianteId}/privado/datos`,
      data: { ...input.privado, dniNormalizado: input.dniNormalizado },
    },
    {
      path: `rac/${racId}`,
      data: {
        estudianteId: input.estudianteId,
        anio: input.anio,
        planId: input.plan.id,
        estado: 'abierto',
        apellido: estudiante.apellido,
        nombre: estudiante.nombre,
        resumen: { promedio: resumen.promedio, adeuda: adeudaPrevias },
      },
    },
    ...calificaciones.map((calificacion) => ({
      path: `rac/${racId}/calificaciones/${calificacion.espacioId}`,
      data: { ...calificacion },
    })),
    {
      path: `logs/${input.logId}`,
      data: {
        entidad: 'estudiante',
        entity: 'estudiante',
        entityId: input.estudianteId,
        accion: 'create',
        action: 'create',
        uid: input.creadoPor,
        userId: input.creadoPor,
        timestamp: input.fechaCreacion,
        diff: {
          apellido: estudiante.apellido,
          nombre: estudiante.nombre,
          dniEnmascarado: estudiante.dniEnmascarado,
          planId: input.plan.id,
          anio: input.anio,
          racId,
        },
      },
    },
  ];
  return { racId, writes, calificaciones };
}
