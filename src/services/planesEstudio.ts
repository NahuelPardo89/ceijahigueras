import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  puedeEliminarContenedor,
  puedeEliminarPorUso,
  prepararAnio,
  prepararAsignatura,
  prepararModulo,
  prepararPlanEstudio,
  type AnioConModulos,
  type AnioEstudio,
  type ArbolPlan,
  type AsignaturaEstudio,
  type DatosAnio,
  type DatosAsignatura,
  type DatosModulo,
  type DatosPlanEstudio,
  type ModuloConAsignaturas,
  type ModuloEstudio,
  type PlanEstudio,
} from '../domain/planesEstudio';

export class PlanEstudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanEstudioError';
  }
}

export interface PlanEstudioListado extends PlanEstudio {
  cantidadAnios: number;
}

function leerPlan(id: string, data: Record<string, unknown>): PlanEstudio {
  return {
    id,
    nombre: String(data.nombre ?? ''),
    orientacion: String(data.orientacion ?? ''),
    resolucion: String(data.resolucion ?? ''),
    validezNacional: String(data.validezNacional ?? ''),
    activo: data.activo !== false,
    enUso: data.enUso === true,
    creadoPor: String(data.creadoPor ?? ''),
    fechaCreacion: String(data.fechaCreacion ?? ''),
  };
}

function leerAnio(id: string, data: Record<string, unknown>): AnioEstudio {
  return {
    id,
    nombre: String(data.nombre ?? ''),
    orden: Number(data.orden ?? 0),
    enUso: data.enUso === true,
  };
}

function leerModulo(id: string, data: Record<string, unknown>): ModuloEstudio {
  return {
    id,
    nombre: String(data.nombre ?? ''),
    orden: Number(data.orden ?? 0),
    enUso: data.enUso === true,
  };
}

function leerAsignatura(id: string, data: Record<string, unknown>): AsignaturaEstudio {
  return {
    id,
    nombre: String(data.nombre ?? ''),
    orden: Number(data.orden ?? 0),
    codigo: String(data.codigo ?? ''),
    activo: data.activo !== false,
    enUso: data.enUso === true,
  };
}

function porOrden<T extends { orden: number; nombre: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
}

export async function listarPlanesEstudio(db: Firestore): Promise<PlanEstudioListado[]> {
  const snap = await getDocs(collection(db, 'planesEstudio'));
  const planes = await Promise.all(snap.docs.map(async (item) => {
    const anios = await getDocs(collection(db, 'planesEstudio', item.id, 'anios'));
    return {
      ...leerPlan(item.id, item.data()),
      cantidadAnios: anios.size,
    };
  }));
  return planes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.resolucion.localeCompare(b.resolucion, 'es'));
}

export async function leerArbolPlan(db: Firestore, planId: string): Promise<ArbolPlan> {
  const planSnap = await getDoc(doc(db, 'planesEstudio', planId));
  if (!planSnap.exists()) throw new PlanEstudioError('Ese plan no existe.');
  const aniosSnap = await getDocs(collection(db, 'planesEstudio', planId, 'anios'));
  const anios: AnioConModulos[] = [];
  for (const anioDoc of aniosSnap.docs) {
    const modulosSnap = await getDocs(collection(db, 'planesEstudio', planId, 'anios', anioDoc.id, 'modulos'));
    const modulos: ModuloConAsignaturas[] = [];
    for (const moduloDoc of modulosSnap.docs) {
      const asignaturasSnap = await getDocs(collection(
        db,
        'planesEstudio',
        planId,
        'anios',
        anioDoc.id,
        'modulos',
        moduloDoc.id,
        'asignaturas',
      ));
      const asignaturas = porOrden(asignaturasSnap.docs.map((item) => leerAsignatura(item.id, item.data())));
      modulos.push({ ...leerModulo(moduloDoc.id, moduloDoc.data()), asignaturas });
    }
    anios.push({
      ...leerAnio(anioDoc.id, anioDoc.data()),
      modulos: porOrden(modulos),
    });
  }
  return {
    plan: leerPlan(planSnap.id, planSnap.data()),
    anios: porOrden(anios),
  };
}

export async function crearPlanEstudio(
  db: Firestore,
  uid: string,
  input: DatosPlanEstudio,
): Promise<string> {
  const preparado = prepararPlanEstudio(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio'));
  await setDoc(ref, {
    ...preparado.datos,
    activo: true,
    enUso: false,
    creadoPor: uid,
    fechaCreacion: new Date().toISOString(),
  });
  return ref.id;
}

export async function actualizarPlanEstudio(
  db: Firestore,
  planId: string,
  input: DatosPlanEstudio & { activo: boolean },
): Promise<void> {
  const preparado = prepararPlanEstudio(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const { nombre, orientacion, resolucion, validezNacional } = preparado.datos;
  await updateDoc(doc(db, 'planesEstudio', planId), {
    nombre,
    orientacion,
    resolucion,
    validezNacional,
    activo: input.activo,
  });
}

export async function eliminarPlanEstudio(db: Firestore, planId: string): Promise<void> {
  const arbol = await leerArbolPlan(db, planId);
  if (!puedeEliminarPorUso(arbol.plan.enUso)) {
    throw new PlanEstudioError('Este plan ya tiene notas. No se puede borrar.');
  }
  if (arbol.anios.length > 0) {
    throw new PlanEstudioError('Para eliminar el plan, primero borrá los planes o años.');
  }
  await deleteDoc(doc(db, 'planesEstudio', planId));
}

export async function crearAnio(db: Firestore, planId: string, input: DatosAnio): Promise<string> {
  const preparado = prepararAnio(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio', planId, 'anios'));
  await setDoc(ref, { ...preparado.datos, enUso: false });
  return ref.id;
}

export async function actualizarAnio(
  db: Firestore,
  planId: string,
  anioId: string,
  input: DatosAnio,
): Promise<void> {
  const preparado = prepararAnio(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const { nombre, orden } = preparado.datos;
  await updateDoc(doc(db, 'planesEstudio', planId, 'anios', anioId), { nombre, orden });
}

export async function eliminarAnio(db: Firestore, planId: string, anioId: string): Promise<void> {
  const arbol = await leerArbolPlan(db, planId);
  const anio = arbol.anios.find((item) => item.id === anioId);
  if (!anio) throw new PlanEstudioError('Ese plan o año no existe.');
  const hijos = [
    ...anio.modulos,
    ...anio.modulos.flatMap((modulo) => modulo.asignaturas),
  ];
  if (!puedeEliminarContenedor(anio.enUso, hijos)) {
    throw new PlanEstudioError('Ese plan o año ya tiene asignaturas con notas. No se puede borrar.');
  }
  await borrarRefs(db, [
    ...anio.modulos.flatMap((modulo) => [
      ...modulo.asignaturas.map((asignatura) => doc(
        db,
        'planesEstudio',
        planId,
        'anios',
        anioId,
        'modulos',
        modulo.id,
        'asignaturas',
        asignatura.id,
      )),
      doc(db, 'planesEstudio', planId, 'anios', anioId, 'modulos', modulo.id),
    ]),
    doc(db, 'planesEstudio', planId, 'anios', anioId),
  ]);
}

export async function crearModulo(
  db: Firestore,
  planId: string,
  anioId: string,
  input: DatosModulo,
): Promise<string> {
  const preparado = prepararModulo(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio', planId, 'anios', anioId, 'modulos'));
  await setDoc(ref, { ...preparado.datos, enUso: false });
  return ref.id;
}

export async function actualizarModulo(
  db: Firestore,
  planId: string,
  anioId: string,
  moduloId: string,
  input: DatosModulo,
): Promise<void> {
  const preparado = prepararModulo(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const { nombre, orden } = preparado.datos;
  await updateDoc(doc(db, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId), { nombre, orden });
}

export async function eliminarModulo(
  db: Firestore,
  planId: string,
  anioId: string,
  moduloId: string,
): Promise<void> {
  const arbol = await leerArbolPlan(db, planId);
  const modulo = arbol.anios.find((anio) => anio.id === anioId)?.modulos.find((item) => item.id === moduloId);
  if (!modulo) throw new PlanEstudioError('Ese módulo no existe.');
  if (!puedeEliminarContenedor(modulo.enUso, modulo.asignaturas)) {
    throw new PlanEstudioError('Ese módulo ya tiene asignaturas con notas. No se puede borrar.');
  }
  await borrarRefs(db, [
    ...modulo.asignaturas.map((asignatura) => doc(
      db,
      'planesEstudio',
      planId,
      'anios',
      anioId,
      'modulos',
      moduloId,
      'asignaturas',
      asignatura.id,
    )),
    doc(db, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId),
  ]);
}

export async function crearAsignatura(
  db: Firestore,
  planId: string,
  anioId: string,
  moduloId: string,
  input: DatosAsignatura,
): Promise<string> {
  const preparado = prepararAsignatura(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId, 'asignaturas'));
  await setDoc(ref, { ...preparado.datos, enUso: false });
  return ref.id;
}

export async function actualizarAsignatura(
  db: Firestore,
  planId: string,
  anioId: string,
  moduloId: string,
  asignaturaId: string,
  input: DatosAsignatura,
): Promise<void> {
  const preparado = prepararAsignatura(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(db, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId, 'asignaturas', asignaturaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new PlanEstudioError('Esa asignatura no existe.');
  const { nombre, orden, codigo, activo } = preparado.datos;
  await updateDoc(ref, { nombre, orden, codigo, activo });
}

export async function eliminarAsignatura(
  db: Firestore,
  planId: string,
  anioId: string,
  moduloId: string,
  asignaturaId: string,
): Promise<void> {
  const ref = doc(db, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId, 'asignaturas', asignaturaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new PlanEstudioError('Esa asignatura no existe.');
  if (!puedeEliminarPorUso(snap.data().enUso === true)) {
    throw new PlanEstudioError('Esa asignatura ya tiene notas. No se puede borrar. Podés desactivarla para que no entre en los RAC nuevos.');
  }
  await deleteDoc(ref);
}

async function borrarRefs(db: Firestore, refs: Array<ReturnType<typeof doc>>): Promise<void> {
  if (refs.length > 450) {
    throw new PlanEstudioError('Hay demasiadas asignaturas para borrarlas juntas.');
  }
  const batch = writeBatch(db);
  for (const ref of refs) batch.delete(ref);
  await batch.commit();
}
