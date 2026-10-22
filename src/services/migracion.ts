import { collection, getDocs, type Firestore } from 'firebase/firestore';
import { racIdDe } from '../domain/claves';
import {
  planificar,
  type AccionMigracion,
  type DocumentoLegacy,
  type EntradaLegacy,
  type FichaMigrable,
} from '../domain/migracion';
import {
  DniDuplicadoError,
  cargarPlanesSede,
  crearCiclo,
  crearEstudianteConRac,
  guardarCalificacion,
  leerCalificacion,
  leerRac,
} from './escolar';

export interface InformeMigracion {
  dryRun: boolean;
  anio: number;
  leidos: number;
  aCrear: number;
  creados: number;
  yaExistian: number;
  notasPrevistas: number;
  notasAplicadas: number;
  revisar: number;
  errores: number;
  avisos: string[];
  detalle: Array<{
    legacyId: string;
    dniEnmascarado: string;
    apellido: string;
    nombre: string;
    decision: string;
    motivos: string[];
  }>;
}

export interface OpcionesMigracion {
  escribir: boolean;
  anio: number;
  creadoPor: string;
}

async function leerColeccion(db: Firestore, nombre: string): Promise<DocumentoLegacy[]> {
  const snap = await getDocs(collection(db, nombre));
  return snap.docs.map((item) => ({ id: item.id, datos: item.data() as Record<string, unknown> }));
}

export async function leerLegacy(db: Firestore): Promise<EntradaLegacy> {
  const [students, grades, equivalences, subjects, studyPlans, indices] = await Promise.all([
    leerColeccion(db, 'students'),
    leerColeccion(db, 'grades'),
    leerColeccion(db, 'equivalences'),
    leerColeccion(db, 'subjects'),
    leerColeccion(db, 'studyPlans'),
    leerColeccion(db, 'dniIndex'),
  ]);
  return {
    students,
    grades,
    equivalences,
    subjects,
    studyPlans,
    dniIndex: indices.flatMap((item) => {
      const estudianteId = item.datos.estudianteId;
      return typeof estudianteId === 'string' && estudianteId
        ? [{ dni: item.id, estudianteId }]
        : [];
    }),
  };
}

function detalleDe(accion: AccionMigracion, motivosExtra: string[] = []) {
  return {
    legacyId: accion.legacyId,
    dniEnmascarado: accion.dniEnmascarado,
    apellido: accion.apellido,
    nombre: accion.nombre,
    decision: accion.decision,
    motivos: [...accion.motivos, ...motivosExtra],
  };
}

function mensajeSeguro(error: unknown): string {
  const textoError = error instanceof Error ? error.message : 'Error inesperado';
  if (/\d{7,8}/.test(textoError) || textoError.includes('@')) return 'No se pudo escribir el registro.';
  return textoError.slice(0, 180);
}

async function aplicarNotas(db: Firestore, racId: string, ficha: FichaMigrable, creadoPor: string): Promise<{ aplicadas: number; motivos: string[] }> {
  const motivos: string[] = [];
  let aplicadas = 0;
  for (const nota of ficha.notas) {
    const actual = await leerCalificacion(db, racId, nota.espacioId);
    if (!actual) {
      motivos.push(`El espacio ${nota.espacioId} no está en el RAC.`);
      continue;
    }
    if (actual.notaFinal != null || actual.condicion === 'Equiv') continue;
    await guardarCalificacion(db, racId, nota.espacioId, {
      notaFinal: nota.notaFinal,
      tpi: nota.tpi,
      fecha: nota.fecha,
      docenteUid: creadoPor,
    });
    aplicadas += 1;
  }
  return { aplicadas, motivos };
}

export async function ejecutarMigracion(db: Firestore, opciones: OpcionesMigracion): Promise<InformeMigracion> {
  const entrada = await leerLegacy(db);
  const plan = planificar(entrada, opciones.anio);
  const informe: InformeMigracion = {
    dryRun: !opciones.escribir,
    anio: opciones.anio,
    leidos: plan.leidos,
    aCrear: plan.acciones.filter((accion) => accion.decision === 'crear').length,
    creados: 0,
    yaExistian: plan.acciones.filter((accion) => accion.decision === 'ya-existe').length,
    notasPrevistas: plan.acciones.reduce((total, accion) => total + (accion.ficha?.notas.length ?? 0), 0),
    notasAplicadas: 0,
    revisar: plan.acciones.filter((accion) => accion.decision === 'revisar').length,
    errores: 0,
    avisos: plan.avisos,
    detalle: plan.acciones.map((accion) => detalleDe(accion)),
  };
  if (!opciones.escribir) return informe;

  const hayTrabajo = plan.acciones.some((accion) => accion.decision !== 'revisar' && accion.ficha);
  if (hayTrabajo) {
    await cargarPlanesSede(db);
    await crearCiclo(db, opciones.anio);
  }

  informe.yaExistian = 0;
  for (const accion of plan.acciones) {
    if (accion.decision === 'revisar' || !accion.ficha) continue;
    const fila = informe.detalle.find((item) => item.legacyId === accion.legacyId);
    try {
      let racId = '';
      if (accion.decision === 'crear') {
        const ficha = accion.ficha;
        const alta = await crearEstudianteConRac(db, {
          apellido: ficha.apellido,
          nombre: ficha.nombre,
          dni: ficha.dni,
          tipoDoc: ficha.tipoDoc,
          estado: ficha.estado,
          sede: ficha.sede,
          cohorte: ficha.cohorte,
          condicionIngreso: ficha.condicionIngreso,
          linkLegajoDrive: ficha.linkLegajoDrive,
          planId: ficha.planId,
          anio: ficha.anio,
          privado: ficha.privado,
          equivalencias: ficha.equivalencias,
          creadoPor: opciones.creadoPor,
        });
        racId = alta.racId;
        informe.creados += 1;
      } else {
        const estudianteId = accion.estudianteIdExistente ?? '';
        racId = racIdDe(estudianteId, opciones.anio, accion.ficha.planId);
        const rac = await leerRac(db, racId);
        if (!rac) {
          informe.errores += 1;
          informe.yaExistian += 1;
          fila?.motivos.push('Ya había un DNI indexado, pero no el RAC de este ciclo. No se inventó otro.');
          continue;
        }
        informe.yaExistian += 1;
      }
      const aplicadas = await aplicarNotas(db, racId, accion.ficha, opciones.creadoPor);
      informe.notasAplicadas += aplicadas.aplicadas;
      if (fila && aplicadas.motivos.length > 0) fila.motivos.push(...aplicadas.motivos);
    } catch (error) {
      if (error instanceof DniDuplicadoError) {
        informe.yaExistian += 1;
        fila?.motivos.push('Ese DNI ya estaba en el índice. No se duplicó el estudiante.');
        if (fila) fila.decision = 'ya-existe';
        continue;
      }
      informe.errores += 1;
      fila?.motivos.push(mensajeSeguro(error));
    }
  }
  return informe;
}
