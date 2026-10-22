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
  prepararMateria,
  prepararModulo,
  prepararNivel,
  prepararPlanEstudio,
  type ArbolPlan,
  type DatosMateria,
  type DatosModulo,
  type DatosNivel,
  type DatosPlanEstudio,
  type MateriaEstudio,
  type ModuloConMaterias,
  type ModuloEstudio,
  type NivelConModulos,
  type NivelEstudio,
  type PlanEstudio,
} from '../domain/planesEstudio';

export class PlanEstudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanEstudioError';
  }
}

export interface PlanEstudioListado extends PlanEstudio {
  cantidadNiveles: number;
}

function leerPlan(id: string, data: Record<string, unknown>): PlanEstudio {
  return {
    id,
    orientacion: String(data.orientacion ?? ''),
    resolucion: String(data.resolucion ?? ''),
    validezNacional: String(data.validezNacional ?? ''),
    activo: data.activo !== false,
    enUso: data.enUso === true,
    creadoPor: String(data.creadoPor ?? ''),
    fechaCreacion: String(data.fechaCreacion ?? ''),
  };
}

function leerNivel(id: string, data: Record<string, unknown>): NivelEstudio {
  return {
    id,
    codigo: String(data.codigo ?? ''),
    anioCurso: Number(data.anioCurso ?? 0),
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

function leerMateria(id: string, data: Record<string, unknown>): MateriaEstudio {
  return {
    id,
    nombre: String(data.nombre ?? ''),
    orden: Number(data.orden ?? 0),
    area: String(data.area ?? ''),
    areaNombre: String(data.areaNombre ?? ''),
    codigo: String(data.codigo ?? ''),
    comparteEntreNiveles: data.comparteEntreNiveles === true,
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
    const niveles = await getDocs(collection(db, 'planesEstudio', item.id, 'niveles'));
    return {
      ...leerPlan(item.id, item.data()),
      cantidadNiveles: niveles.size,
    };
  }));
  return planes.sort((a, b) => a.orientacion.localeCompare(b.orientacion, 'es') || a.resolucion.localeCompare(b.resolucion, 'es'));
}

export async function leerArbolPlan(db: Firestore, planId: string): Promise<ArbolPlan> {
  const planSnap = await getDoc(doc(db, 'planesEstudio', planId));
  if (!planSnap.exists()) throw new PlanEstudioError('Ese plan no existe.');
  const nivelesSnap = await getDocs(collection(db, 'planesEstudio', planId, 'niveles'));
  const niveles: NivelConModulos[] = [];
  for (const nivelDoc of nivelesSnap.docs) {
    const modulosSnap = await getDocs(collection(db, 'planesEstudio', planId, 'niveles', nivelDoc.id, 'modulos'));
    const modulos: ModuloConMaterias[] = [];
    for (const moduloDoc of modulosSnap.docs) {
      const materiasSnap = await getDocs(collection(
        db,
        'planesEstudio',
        planId,
        'niveles',
        nivelDoc.id,
        'modulos',
        moduloDoc.id,
        'materias',
      ));
      const materias = porOrden(materiasSnap.docs.map((item) => leerMateria(item.id, item.data())));
      modulos.push({ ...leerModulo(moduloDoc.id, moduloDoc.data()), materias });
    }
    niveles.push({
      ...leerNivel(nivelDoc.id, nivelDoc.data()),
      modulos: porOrden(modulos),
    });
  }
  return {
    plan: leerPlan(planSnap.id, planSnap.data()),
    niveles: porOrden(niveles),
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
  await updateDoc(doc(db, 'planesEstudio', planId), {
    ...preparado.datos,
    activo: input.activo,
  });
}

export async function eliminarPlanEstudio(db: Firestore, planId: string): Promise<void> {
  const arbol = await leerArbolPlan(db, planId);
  if (!puedeEliminarPorUso(arbol.plan.enUso)) {
    throw new PlanEstudioError('Este plan ya tiene materias con notas. No se puede borrar.');
  }
  if (arbol.niveles.length > 0) {
    throw new PlanEstudioError('Para eliminar el plan, primero borrá los niveles.');
  }
  await deleteDoc(doc(db, 'planesEstudio', planId));
}

export async function crearNivel(db: Firestore, planId: string, input: DatosNivel): Promise<string> {
  const preparado = prepararNivel(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio', planId, 'niveles'));
  await setDoc(ref, { ...preparado.datos, enUso: false });
  return ref.id;
}

export async function actualizarNivel(
  db: Firestore,
  planId: string,
  nivelId: string,
  input: DatosNivel,
): Promise<void> {
  const preparado = prepararNivel(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const { codigo, anioCurso, nombre, orden } = preparado.datos;
  await updateDoc(doc(db, 'planesEstudio', planId, 'niveles', nivelId), { codigo, anioCurso, nombre, orden });
}

export async function eliminarNivel(db: Firestore, planId: string, nivelId: string): Promise<void> {
  const arbol = await leerArbolPlan(db, planId);
  const nivel = arbol.niveles.find((item) => item.id === nivelId);
  if (!nivel) throw new PlanEstudioError('Ese nivel no existe.');
  const hijos = [
    ...nivel.modulos,
    ...nivel.modulos.flatMap((modulo) => modulo.materias),
  ];
  if (!puedeEliminarContenedor(nivel.enUso, hijos)) {
    throw new PlanEstudioError('Ese nivel ya tiene materias con notas. No se puede borrar.');
  }
  await borrarRefs(db, [
    ...nivel.modulos.flatMap((modulo) => [
      ...modulo.materias.map((materia) => doc(
        db,
        'planesEstudio',
        planId,
        'niveles',
        nivelId,
        'modulos',
        modulo.id,
        'materias',
        materia.id,
      )),
      doc(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', modulo.id),
    ]),
    doc(db, 'planesEstudio', planId, 'niveles', nivelId),
  ]);
}

export async function crearModulo(
  db: Firestore,
  planId: string,
  nivelId: string,
  input: DatosModulo,
): Promise<string> {
  const preparado = prepararModulo(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos'));
  await setDoc(ref, { ...preparado.datos, enUso: false });
  return ref.id;
}

export async function actualizarModulo(
  db: Firestore,
  planId: string,
  nivelId: string,
  moduloId: string,
  input: DatosModulo,
): Promise<void> {
  const preparado = prepararModulo(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const { nombre, orden } = preparado.datos;
  await updateDoc(doc(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId), { nombre, orden });
}

export async function eliminarModulo(
  db: Firestore,
  planId: string,
  nivelId: string,
  moduloId: string,
): Promise<void> {
  const arbol = await leerArbolPlan(db, planId);
  const modulo = arbol.niveles.find((nivel) => nivel.id === nivelId)?.modulos.find((item) => item.id === moduloId);
  if (!modulo) throw new PlanEstudioError('Ese módulo no existe.');
  if (!puedeEliminarContenedor(modulo.enUso, modulo.materias)) {
    throw new PlanEstudioError('Ese módulo ya tiene materias con notas. No se puede borrar.');
  }
  await borrarRefs(db, [
    ...modulo.materias.map((materia) => doc(
      db,
      'planesEstudio',
      planId,
      'niveles',
      nivelId,
      'modulos',
      moduloId,
      'materias',
      materia.id,
    )),
    doc(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId),
  ]);
}

export async function crearMateria(
  db: Firestore,
  planId: string,
  nivelId: string,
  moduloId: string,
  input: DatosMateria,
): Promise<string> {
  const preparado = prepararMateria(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(collection(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId, 'materias'));
  await setDoc(ref, { ...preparado.datos, enUso: false });
  return ref.id;
}

export async function actualizarMateria(
  db: Firestore,
  planId: string,
  nivelId: string,
  moduloId: string,
  materiaId: string,
  input: DatosMateria,
): Promise<void> {
  const preparado = prepararMateria(input);
  if (!preparado.ok) throw new PlanEstudioError(preparado.error);
  const ref = doc(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId, 'materias', materiaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new PlanEstudioError('Esa materia no existe.');
  const { nombre, orden, area, areaNombre, codigo, comparteEntreNiveles, activo } = preparado.datos;
  await updateDoc(ref, { nombre, orden, area, areaNombre, codigo, comparteEntreNiveles, activo });
}

export async function eliminarMateria(
  db: Firestore,
  planId: string,
  nivelId: string,
  moduloId: string,
  materiaId: string,
): Promise<void> {
  const ref = doc(db, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId, 'materias', materiaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new PlanEstudioError('Esa materia no existe.');
  if (!puedeEliminarPorUso(snap.data().enUso === true)) {
    throw new PlanEstudioError('Esa materia ya tiene notas. No se puede borrar. Podés desactivarla para que no entre en los RAC nuevos.');
  }
  await deleteDoc(ref);
}

async function borrarRefs(db: Firestore, refs: Array<ReturnType<typeof doc>>): Promise<void> {
  if (refs.length > 450) {
    throw new PlanEstudioError('Hay demasiadas materias para borrarlas juntas.');
  }
  const batch = writeBatch(db);
  for (const ref of refs) batch.delete(ref);
  await batch.commit();
}
