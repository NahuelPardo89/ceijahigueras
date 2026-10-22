import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { armarDocente, indiceIdDe, racIdDe, resumenIdDe } from '../domain/claves';
import { dniValido, enmascararDni, normalizarDni } from '../domain/dni';
import { aFechaCorta, notaEnLetras, notaValida } from '../domain/notas';
import { INSTITUCION_INICIAL, PLANES_SEDE, type PlanSemilla } from '../domain/planesSede';
import {
  aplicarCierre,
  armarCalificacionesSiguiente,
  calificacionDesdeEspacio,
  documentosAlta,
  estaAprobada,
  estadoPorNota,
  estudiantePublicoDe,
  filaIndice,
  itemResumen,
  parcheReplicaM8,
  resumenDeCalificaciones,
  type AltaEstudianteInput,
  type EquivalenciaInicial,
} from '../domain/rac';
import type {
  AsignacionDocente,
  Calificacion,
  Ciclo,
  Condicion,
  DocentePerfil,
  EquivalenciaRegistro,
  EspacioPlantilla,
  EstadoEstudiante,
  EstudiantePrivado,
  EstudiantePublico,
  FilaIndice,
  PaseRegistro,
  Plan,
  Rac,
  ResumenItem,
} from '../domain/types';
import { refDesdePath } from './paths';

export class DniDuplicadoError extends Error {
  readonly estudianteId: string;
  readonly dniEnmascarado: string;

  constructor(estudianteId: string, dni: string) {
    super(`Ya existe un estudiante con DNI ${enmascararDni(dni)}.`);
    this.name = 'DniDuplicadoError';
    this.estudianteId = estudianteId;
    this.dniEnmascarado = enmascararDni(dni);
  }
}

export class ReglaNegocioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReglaNegocioError';
  }
}

const CAMPOS_PUBLICOS_PROHIBIDOS = ['dni', 'cuil', 'email', 'telefono', 'fechaNacimiento', 'fechaNac'];

function sinIdentificador<T extends { id: string }>(valor: T): Omit<T, 'id'> {
  const copia: Record<string, unknown> = { ...valor };
  delete copia.id;
  return copia as Omit<T, 'id'>;
}

function assertSinSensibles(data: Record<string, unknown>) {
  for (const campo of CAMPOS_PUBLICOS_PROHIBIDOS) {
    if (campo in data) throw new ReglaNegocioError('Los datos sensibles van en el legajo privado.');
  }
}

async function cicloAbierto(db: Firestore, anio: number): Promise<Ciclo> {
  const snap = await getDoc(doc(db, 'ciclos', String(anio)));
  if (!snap.exists()) throw new ReglaNegocioError(`No existe el ciclo ${anio}. Crea el ciclo antes de generar el RAC.`);
  const ciclo = snap.data() as Ciclo;
  if (ciclo.estado !== 'abierto') throw new ReglaNegocioError(`El ciclo ${anio} está cerrado.`);
  return ciclo;
}

export async function listarCiclos(db: Firestore): Promise<Ciclo[]> {
  const snap = await getDocs(collection(db, 'ciclos'));
  return snap.docs
    .map((item) => item.data() as Ciclo)
    .sort((a, b) => b.anio - a.anio);
}

export async function crearCiclo(db: Firestore, anio: number): Promise<void> {
  const ref = doc(db, 'ciclos', String(anio));
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, { anio, estado: 'abierto', fechaCierre: null });
}

export async function listarPlanes(db: Firestore): Promise<Plan[]> {
  const snap = await getDocs(collection(db, 'planes'));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Plan)
    .sort((a, b) => a.codigo.localeCompare(b.codigo) || a.nombre.localeCompare(b.nombre));
}

export async function espaciosDePlan(db: Firestore, planId: string): Promise<EspacioPlantilla[]> {
  const snap = await getDocs(collection(db, 'planes', planId, 'espacios'));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as EspacioPlantilla)
    .sort((a, b) => a.orden - b.orden);
}

export async function cargarPlanesSede(db: Firestore): Promise<number> {
  const institucion = await getDoc(doc(db, 'config', 'institucion'));
  if (!institucion.exists()) {
    await setDoc(doc(db, 'config', 'institucion'), INSTITUCION_INICIAL);
  }
  let creados = 0;
  for (const semilla of PLANES_SEDE) {
    const ref = doc(db, 'planes', semilla.id);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    const { espacios, ...plan } = semilla;
    const batch = writeBatch(db);
    batch.set(ref, plan);
    for (const espacio of espacios) {
      const { id, ...resto } = espacio;
      batch.set(doc(db, 'planes', semilla.id, 'espacios', id), resto);
    }
    await batch.commit();
    creados += 1;
  }
  return creados;
}

export async function guardarPlan(db: Firestore, plan: PlanSemilla): Promise<void> {
  const { espacios, ...resto } = plan;
  const batch = writeBatch(db);
  batch.set(doc(db, 'planes', plan.id), resto);
  for (const espacio of espacios) {
    const { id, ...datos } = espacio;
    batch.set(doc(db, 'planes', plan.id, 'espacios', id), datos);
  }
  await batch.commit();
}

export async function guardarEspacio(db: Firestore, planId: string, espacio: EspacioPlantilla): Promise<void> {
  const { id, ...datos } = espacio;
  await setDoc(doc(db, 'planes', planId, 'espacios', id), datos);
}

export interface NuevaFicha {
  apellido: string;
  nombre: string;
  dni: string;
  tipoDoc: string;
  estado: EstadoEstudiante;
  sede: string;
  cohorte: number;
  condicionIngreso: Condicion;
  linkLegajoDrive: string;
  planId: string;
  anio: number;
  privado: EstudiantePrivado;
  equivalencias: EquivalenciaInicial[];
  creadoPor: string;
}

export async function crearEstudianteConRac(
  db: Firestore,
  ficha: NuevaFicha,
): Promise<{ estudianteId: string; racId: string }> {
  const dniNormalizado = normalizarDni(ficha.dni);
  if (!dniValido(dniNormalizado)) {
    throw new ReglaNegocioError('El DNI tiene que tener 7 u 8 dígitos, sin puntos.');
  }
  await cicloAbierto(db, ficha.anio);
  const existente = await getDoc(doc(db, 'dniIndex', dniNormalizado));
  if (existente.exists()) {
    throw new DniDuplicadoError(String(existente.data().estudianteId), dniNormalizado);
  }

  const planSnap = await getDoc(doc(db, 'planes', ficha.planId));
  if (!planSnap.exists()) throw new ReglaNegocioError('El plan elegido no existe.');
  const plan = { id: planSnap.id, ...planSnap.data() } as Plan;
  const espacios = await espaciosDePlan(db, plan.id);
  if (espacios.length === 0) throw new ReglaNegocioError('El plan no tiene espacios curriculares.');

  const estudianteId = doc(collection(db, 'estudiantes')).id;
  const logId = doc(collection(db, 'logs')).id;
  const fechaCreacion = new Date().toISOString();
  const m8RacIds: string[] = [];

  const input: AltaEstudianteInput = {
    estudianteId,
    logId,
    anio: ficha.anio,
    plan,
    espacios,
    apellido: ficha.apellido.trim(),
    nombre: ficha.nombre.trim(),
    dniNormalizado,
    tipoDoc: ficha.tipoDoc || 'DNI',
    estado: ficha.estado,
    sede: ficha.sede || 'Las Higueras',
    cohorte: ficha.cohorte,
    condicionIngreso: ficha.condicionIngreso,
    linkLegajoDrive: ficha.linkLegajoDrive.trim(),
    creadoPor: ficha.creadoPor,
    fechaCreacion,
    privado: { ...ficha.privado, dni: dniNormalizado, dniNormalizado },
    equivalencias: ficha.equivalencias.map((equivalencia) => ({
      ...equivalencia,
      fecha: aFechaCorta(equivalencia.fecha),
    })),
    m8RacIds,
  };

  const { racId, writes } = documentosAlta(input);
  for (const write of writes) {
    if (write.path.startsWith('estudiantes/') && !write.path.includes('/privado/')) {
      assertSinSensibles(write.data);
    }
  }

  const estudiante = estudiantePublicoDe(input);
  const fila = filaIndice(estudiante, racId);
  const batch = writeBatch(db);
  for (const write of writes) {
    batch.set(refDesdePath(db, write.path), write.data);
  }
  batch.set(doc(db, 'resumenes', resumenIdDe(ficha.anio)), {
    anio: ficha.anio,
    items: arrayUnion(itemResumen(estudiante)),
  }, { merge: true });
  for (const espacio of espacios) {
    batch.set(doc(db, 'indices', indiceIdDe(ficha.anio, plan.id, espacio.id)), {
      anio: ficha.anio,
      planId: plan.id,
      espacioId: espacio.id,
      nombreEspacio: espacio.nombre,
      filas: arrayUnion(fila),
    }, { merge: true });
  }
  await batch.commit();
  return { estudianteId, racId };
}

export async function leerResumen(db: Firestore, anio: number): Promise<ResumenItem[]> {
  const snap = await getDoc(doc(db, 'resumenes', resumenIdDe(anio)));
  if (!snap.exists()) return [];
  const items = (snap.data().items ?? []) as ResumenItem[];
  return items.slice().sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
}

export async function leerEstudiantePublico(db: Firestore, id: string): Promise<EstudiantePublico | null> {
  const snap = await getDoc(doc(db, 'estudiantes', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as EstudiantePublico;
}

export async function leerPrivado(db: Firestore, id: string): Promise<EstudiantePrivado | null> {
  const snap = await getDoc(doc(db, 'estudiantes', id, 'privado', 'datos'));
  if (!snap.exists()) return null;
  return snap.data() as EstudiantePrivado;
}

export async function actualizarFicha(
  db: Firestore,
  id: string,
  publico: Partial<Omit<EstudiantePublico, 'id' | 'dniEnmascarado' | 'creadoPor' | 'fechaCreacion'>>,
  privado: Partial<EstudiantePrivado> | null,
): Promise<void> {
  assertSinSensibles(publico as Record<string, unknown>);
  const actual = await leerEstudiantePublico(db, id);
  if (!actual) throw new ReglaNegocioError('No se encontró el estudiante.');
  const siguiente: EstudiantePublico = { ...actual, ...publico, id };
  if (privado?.dni) {
    const dni = normalizarDni(privado.dni);
    if (!dniValido(dni)) throw new ReglaNegocioError('El DNI tiene que tener 7 u 8 dígitos.');
    if (dni !== (await leerPrivado(db, id))?.dniNormalizado) {
      throw new ReglaNegocioError('Para cambiar el DNI hay que revisar el índice. Esta pantalla no pisa un DNI ya indexado.');
    }
    siguiente.dniEnmascarado = enmascararDni(dni);
    privado = { ...privado, dni, dniNormalizado: dni };
  }
  const racSnap = await getDocs(query(collection(db, 'rac'), where('estudianteId', '==', id)));
  const batch = writeBatch(db);
  batch.update(doc(db, 'estudiantes', id), sinIdentificador(siguiente));
  if (privado) batch.set(doc(db, 'estudiantes', id, 'privado', 'datos'), privado, { merge: true });
  const anios = new Set(racSnap.docs.map((item) => Number(item.data().anio)));
  if (anios.size === 0) anios.add(actual.cohorte);
  for (const anio of anios) {
    const resumenRef = doc(db, 'resumenes', resumenIdDe(anio));
    const resumen = await getDoc(resumenRef);
    if (!resumen.exists()) continue;
    const items = ((resumen.data().items ?? []) as ResumenItem[]).map((item) =>
      item.id === id ? itemResumen(siguiente) : item);
    batch.set(resumenRef, { anio, items }, { merge: true });
  }
  await batch.commit();
}

export async function racsDeEstudiante(db: Firestore, estudianteId: string): Promise<Rac[]> {
  const snap = await getDocs(query(collection(db, 'rac'), where('estudianteId', '==', estudianteId)));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Rac)
    .sort((a, b) => b.anio - a.anio);
}

export async function racsDelAnio(db: Firestore, anio: number): Promise<Rac[]> {
  const snap = await getDocs(query(collection(db, 'rac'), where('anio', '==', anio)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Rac);
}

export async function leerRac(db: Firestore, racId: string): Promise<Rac | null> {
  const snap = await getDoc(doc(db, 'rac', racId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Rac;
}

export async function calificacionesDe(db: Firestore, racId: string): Promise<Calificacion[]> {
  const snap = await getDocs(collection(db, 'rac', racId, 'calificaciones'));
  return snap.docs
    .map((item) => item.data() as Calificacion)
    .sort((a, b) => a.orden - b.orden);
}

export async function leerCalificacion(db: Firestore, racId: string, espacioId: string): Promise<Calificacion | null> {
  const snap = await getDoc(doc(db, 'rac', racId, 'calificaciones', espacioId));
  if (!snap.exists()) return null;
  return snap.data() as Calificacion;
}

export interface NotaCargada {
  notaFinal: number | null;
  tpi: Calificacion['tpi'];
  fecha: string;
  docenteUid: string;
}

export async function guardarCalificacion(
  db: Firestore,
  racId: string,
  espacioId: string,
  nota: NotaCargada,
): Promise<void> {
  if (!notaValida(nota.notaFinal)) throw new ReglaNegocioError('La nota tiene que ir de 1 a 10, de medio punto en medio punto.');
  const rac = await leerRac(db, racId);
  if (!rac) throw new ReglaNegocioError('No se encontró el RAC.');
  if (rac.estado !== 'abierto') throw new ReglaNegocioError('El RAC está cerrado.');
  const actual = await leerCalificacion(db, racId, espacioId);
  if (!actual) throw new ReglaNegocioError('El espacio no está en este RAC.');
  const fecha = nota.fecha ? aFechaCorta(nota.fecha) : '';
  if (fecha && !/^\d{2}\/\d{2}$/.test(fecha)) throw new ReglaNegocioError('La fecha de la nota va en mes/año, por ejemplo 03/26.');
  const estado = estadoPorNota(nota.notaFinal, nota.tpi);
  const patch = {
    tpi: nota.tpi,
    notaFinal: nota.notaFinal,
    notaLetras: nota.notaFinal == null ? '' : notaEnLetras(nota.notaFinal),
    fecha,
    docenteUid: nota.docenteUid,
    estado,
  };
  await updateDoc(doc(db, 'rac', racId, 'calificaciones', espacioId), patch);
  try {
    const todas = (await calificacionesDe(db, racId)).map((calificacion) =>
      calificacion.espacioId === espacioId ? { ...calificacion, ...patch } : calificacion);
    await updateDoc(doc(db, 'rac', racId), { resumen: resumenDeCalificaciones(todas) });
  } catch (error) {
    console.warn('No se actualizó el resumen del RAC:', error);
  }

  if (actual.compartidoM8 && estado === 'aprobado') {
    const origen = { ...actual, ...patch };
    for (const hermanoId of actual.m8RacIds ?? []) {
      if (hermanoId === racId) continue;
      try {
        const hermanoNota = await leerCalificacion(db, hermanoId, espacioId);
        if (!hermanoNota?.compartidoM8) continue;
        await updateDoc(doc(db, 'rac', hermanoId, 'calificaciones', espacioId), parcheReplicaM8(origen));
      } catch (error) {
        console.warn('No se pudo replicar el M8 compartido:', error);
      }
    }
  }
}

export async function cerrarRac(db: Firestore, racId: string): Promise<void> {
  const rac = await leerRac(db, racId);
  if (!rac) throw new ReglaNegocioError('No se encontró el RAC.');
  if (rac.estado === 'cerrado') return;
  const calificaciones = aplicarCierre(await calificacionesDe(db, racId));
  const batch = writeBatch(db);
  for (const calificacion of calificaciones) {
    batch.update(doc(db, 'rac', racId, 'calificaciones', calificacion.espacioId), { estado: calificacion.estado });
  }
  batch.update(doc(db, 'rac', racId), {
    estado: 'cerrado',
    resumen: resumenDeCalificaciones(calificaciones),
  });
  await batch.commit();
}

export async function reabrirRac(db: Firestore, racId: string): Promise<void> {
  await updateDoc(doc(db, 'rac', racId), { estado: 'abierto' });
}

export async function cerrarCiclo(db: Firestore, anio: number): Promise<number> {
  const snap = await getDocs(query(collection(db, 'rac'), where('anio', '==', anio)));
  const abiertos = snap.docs.filter((item) => item.data().estado === 'abierto');
  const preparados: { id: string; calificaciones: Calificacion[] }[] = [];
  for (const item of abiertos) {
    preparados.push({ id: item.id, calificaciones: aplicarCierre(await calificacionesDe(db, item.id)) });
  }
  const tamano = 40;
  for (let i = 0; i < preparados.length; i += tamano) {
    const lote = preparados.slice(i, i + tamano);
    const batch = writeBatch(db);
    for (const rac of lote) {
      for (const calificacion of rac.calificaciones) {
        batch.update(doc(db, 'rac', rac.id, 'calificaciones', calificacion.espacioId), { estado: calificacion.estado });
      }
      batch.update(doc(db, 'rac', rac.id), {
        estado: 'cerrado',
        resumen: resumenDeCalificaciones(rac.calificaciones),
      });
    }
    await batch.commit();
  }
  await setDoc(doc(db, 'ciclos', String(anio)), {
    anio,
    estado: 'cerrado',
    fechaCierre: new Date().toISOString(),
  }, { merge: true });
  return preparados.length;
}

export async function generarRacSiguiente(
  db: Firestore,
  params: {
    uid: string;
    anioOrigen: number;
    anioDestino: number;
    planOrigenId: string;
    planDestinoId: string;
    soloEstudianteId?: string;
  },
): Promise<{ creados: number; omitidos: number }> {
  await cicloAbierto(db, params.anioDestino);
  const espacios = await espaciosDePlan(db, params.planDestinoId);
  if (espacios.length === 0) throw new ReglaNegocioError('El plan de destino no tiene espacios.');
  const planSnap = await getDoc(doc(db, 'planes', params.planDestinoId));
  if (!planSnap.exists()) throw new ReglaNegocioError('No se encontró el plan de destino.');
  const plan = { id: planSnap.id, ...planSnap.data() } as Plan;
  const origen = await getDocs(query(collection(db, 'rac'), where('anio', '==', params.anioOrigen)));
  const candidatos = origen.docs.filter((item) => {
    const data = item.data();
    if (data.planId !== params.planOrigenId) return false;
    if (params.soloEstudianteId && data.estudianteId !== params.soloEstudianteId) return false;
    return true;
  });

  let creados = 0;
  let omitidos = 0;
  for (const item of candidatos) {
    const data = item.data();
    const estudianteId = String(data.estudianteId);
    const nuevoId = racIdDe(estudianteId, params.anioDestino, params.planDestinoId);
    const ya = await getDoc(doc(db, 'rac', nuevoId));
    if (ya.exists()) {
      omitidos += 1;
      continue;
    }
    const anteriores = await calificacionesDe(db, item.id);
    const { calificaciones, adeuda } = armarCalificacionesSiguiente(
      espacios,
      anteriores,
      estudianteId,
      params.anioDestino,
      params.planDestinoId,
    );
    const abiertos = (await racsDeEstudiante(db, estudianteId)).filter((rac) => rac.estado === 'abierto');
    const espacioM8 = espacios.find((espacio) => espacio.compartidoM8);
    const vinculos: string[] = [];
    const replicas: { racId: string; espacioId: string }[] = [];
    if (espacioM8) {
      for (const abierto of abiertos) {
        const notas = await calificacionesDe(db, abierto.id);
        const hermanoM8 = notas.find((calificacion) => calificacion.compartidoM8);
        if (!hermanoM8) continue;
        vinculos.push(abierto.id);
        replicas.push({ racId: abierto.id, espacioId: hermanoM8.espacioId });
      }
    }
    const conM8 = calificaciones.map((calificacion) =>
      calificacion.compartidoM8 ? { ...calificacion, m8RacIds: vinculos } : calificacion);
    const estudiante = await leerEstudiantePublico(db, estudianteId);
    const apellido = estudiante?.apellido ?? String(data.apellido ?? '');
    const nombre = estudiante?.nombre ?? String(data.nombre ?? '');
    const dniEnmascarado = estudiante?.dniEnmascarado ?? '';
    const batch = writeBatch(db);
    batch.set(doc(db, 'rac', nuevoId), {
      estudianteId,
      anio: params.anioDestino,
      planId: params.planDestinoId,
      estado: 'abierto',
      apellido,
      nombre,
      resumen: { promedio: null, adeuda },
    });
    for (const calificacion of conM8) {
      batch.set(doc(db, 'rac', nuevoId, 'calificaciones', calificacion.espacioId), calificacion);
    }
    const fila: FilaIndice = { estudianteId, racId: nuevoId, apellido, nombre, dniEnmascarado };
    for (const espacio of espacios) {
      batch.set(doc(db, 'indices', indiceIdDe(params.anioDestino, params.planDestinoId, espacio.id)), {
        anio: params.anioDestino,
        planId: params.planDestinoId,
        espacioId: espacio.id,
        nombreEspacio: espacio.nombre,
        filas: arrayUnion(fila),
      }, { merge: true });
    }
    for (const replica of replicas) {
      batch.update(doc(db, 'rac', replica.racId, 'calificaciones', replica.espacioId), {
        m8RacIds: arrayUnion(nuevoId),
      });
    }
    if (estudiante) {
      const actualizado: EstudiantePublico = {
        ...estudiante,
        planActualId: plan.id,
        orientacion: plan.orientacion,
      };
      batch.update(doc(db, 'estudiantes', estudianteId), sinIdentificador(actualizado));
      batch.set(doc(db, 'resumenes', resumenIdDe(params.anioDestino)), {
        anio: params.anioDestino,
        items: arrayUnion(itemResumen(actualizado)),
      }, { merge: true });
    }
    batch.set(doc(collection(db, 'logs')), {
      entidad: 'rac',
      entity: 'rac',
      entityId: nuevoId,
      accion: 'create',
      action: 'create',
      uid: params.uid,
      userId: params.uid,
      timestamp: new Date().toISOString(),
      diff: { desde: item.id, adeuda },
    });
    await batch.commit();
    creados += 1;
  }
  return { creados, omitidos };
}

export async function leerIndice(db: Firestore, anio: number, planId: string, espacioId: string): Promise<{ nombreEspacio: string; filas: FilaIndice[] } | null> {
  const snap = await getDoc(doc(db, 'indices', indiceIdDe(anio, planId, espacioId)));
  if (!snap.exists()) return null;
  const data = snap.data();
  const filas = ((data.filas ?? []) as FilaIndice[]).slice().sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'));
  return { nombreEspacio: String(data.nombreEspacio ?? espacioId), filas };
}

export async function leerDocente(db: Firestore, uid: string): Promise<DocentePerfil | null> {
  const snap = await getDoc(doc(db, 'docentes', uid));
  if (!snap.exists()) return null;
  return snap.data() as DocentePerfil;
}

export async function guardarAsignaciones(
  db: Firestore,
  uid: string,
  nombre: string,
  email: string,
  asignaciones: AsignacionDocente[],
): Promise<void> {
  const perfil = armarDocente(nombre, email, asignaciones);
  await setDoc(doc(db, 'docentes', uid), perfil);
}

export async function listarEquivalencias(db: Firestore): Promise<EquivalenciaRegistro[]> {
  const snap = await getDocs(collection(db, 'equivalencias'));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as EquivalenciaRegistro)
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
}

export async function crearEquivalencia(
  db: Firestore,
  registro: EquivalenciaRegistro,
): Promise<void> {
  if (!notaValida(registro.nota) || registro.nota < 6) {
    throw new ReglaNegocioError('La equivalencia se carga con una nota de 6 a 10, en pasos de 0,50.');
  }
  const rac = await leerRac(db, registro.racId);
  if (!rac || rac.estado !== 'abierto') throw new ReglaNegocioError('La equivalencia se aplica sobre un RAC abierto.');
  const espacio = await leerCalificacion(db, registro.racId, registro.espacioId);
  if (!espacio) throw new ReglaNegocioError('Ese espacio no está en el RAC.');
  const fecha = aFechaCorta(registro.fecha);
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'equivalencias'));
  batch.set(ref, { ...registro, fecha, fechaCreacion: new Date().toISOString() });
  batch.update(doc(db, 'rac', registro.racId, 'calificaciones', registro.espacioId), {
    condicion: 'Equiv',
    notaFinal: registro.nota,
    notaLetras: notaEnLetras(registro.nota),
    fecha,
    tpi: 'APROBADO',
    estado: 'aprobado',
    docenteUid: registro.creadoPor,
  });
  const todas = (await calificacionesDe(db, registro.racId)).map((calificacion) =>
    calificacion.espacioId === registro.espacioId
      ? { ...calificacion, condicion: 'Equiv' as const, notaFinal: registro.nota, estado: 'aprobado' as const, tpi: 'APROBADO' as const }
      : calificacion);
  batch.update(doc(db, 'rac', registro.racId), { resumen: resumenDeCalificaciones(todas) });
  await batch.commit();
}

export async function listarPases(db: Firestore): Promise<PaseRegistro[]> {
  const snap = await getDocs(collection(db, 'pases'));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as PaseRegistro)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
}

export async function guardarPase(db: Firestore, pase: PaseRegistro): Promise<void> {
  const ref = pase.id ? doc(db, 'pases', pase.id) : doc(collection(db, 'pases'));
  await setDoc(ref, sinIdentificador({ ...pase, id: pase.id ?? 'nuevo' }));
}

export async function quitarDeResumen(db: Firestore, anio: number, item: ResumenItem): Promise<void> {
  await updateDoc(doc(db, 'resumenes', resumenIdDe(anio)), { items: arrayRemove(item) });
}

export function espaciosSemilla(): EspacioPlantilla[] {
  return PLANES_SEDE.flatMap((plan) => plan.espacios.map((espacio) => ({ ...espacio, id: `${plan.id}:${espacio.id}` })));
}

export function calificacionVaciaDePlantilla(espacio: EspacioPlantilla, estudianteId: string, anio: number, planId: string): Calificacion {
  return calificacionDesdeEspacio(espacio, estudianteId, anio, planId, undefined, []);
}

export function aprobada(calificacion: Calificacion): boolean {
  return estaAprobada(calificacion);
}
