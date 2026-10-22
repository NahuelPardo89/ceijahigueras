import { readFileSync } from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { idCalificacionDeMateria } from '../src/domain/planesEstudio.ts';
import {
  crearMateria,
  crearModulo,
  crearNivel,
  crearPlanEstudio,
  leerArbolPlan,
  PlanEstudioError,
} from '../src/services/planesEstudio.ts';

let entorno: RulesTestEnvironment;

const usuario = (uid: string, role: string) => ({
  email: `${uid}@example.com`,
  displayName: uid,
  role,
  createdAt: '2026-01-01T00:00:00.000Z',
  activo: true,
  disabled: false,
});

const planDatos = (uid: string, extra: Record<string, unknown> = {}) => ({
  orientacion: 'Orientación de prueba',
  resolucion: 'Resolución de prueba',
  validezNacional: 'Validez de prueba',
  activo: true,
  enUso: false,
  creadoPor: uid,
  fechaCreacion: '2026-10-22T12:00:00.000Z',
  ...extra,
});

const nivelDatos = {
  codigo: 'A',
  anioCurso: 1,
  nombre: '1° año',
  orden: 1,
  enUso: false,
};

const moduloDatos = { nombre: 'Módulo 1', orden: 1, enUso: false };

const materiaDatos = (extra: Record<string, unknown> = {}) => ({
  nombre: 'Matemática de prueba',
  orden: 1,
  area: 'matematica',
  areaNombre: 'Matemática',
  codigo: '1.3',
  comparteEntreNiveles: false,
  activo: true,
  enUso: false,
  ...extra,
});

async function sembrarUsuarios() {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'users', 'admin1'), usuario('admin1', 'admin'));
    await setDoc(doc(db, 'users', 'docente1'), usuario('docente1', 'docente'));
    await setDoc(doc(db, 'users', 'docente2'), usuario('docente2', 'docente'));
    await setDoc(doc(db, 'users', 'lectura1'), usuario('lectura1', 'lectura'));
    await setDoc(doc(db, 'users', 'pendiente1'), usuario('pendiente1', 'pendiente'));
    await setDoc(doc(db, 'docentes', 'docente1'), {
      claves: [],
      espacios: {},
      planesAnio: {},
      ensenaM8: false,
      areas: { matematica: true },
    });
    await setDoc(doc(db, 'docentes', 'docente2'), {
      claves: [],
      espacios: {},
      planesAnio: {},
      ensenaM8: false,
      areas: { lengua: true },
    });
  });
}

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-ceija',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
});

test('el admin crea un plan vacío y después un nivel, un módulo y una materia', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  const planId = await crearPlanEstudio(admin, 'admin1', {
    orientacion: 'Orientación de prueba',
    resolucion: 'Resolución de prueba',
    validezNacional: 'Validez de prueba',
  });
  const vacio = await leerArbolPlan(admin, planId);
  assert.equal(vacio.niveles.length, 0);
  assert.equal(vacio.plan.enUso, false);

  const nivelId = await crearNivel(admin, planId, { codigo: 'A', anioCurso: 1, nombre: '1° año', orden: 1 });
  const moduloId = await crearModulo(admin, planId, nivelId, { nombre: 'Módulo 1', orden: 1 });
  const materiaId = await crearMateria(admin, planId, nivelId, moduloId, {
    nombre: 'Matemática de prueba',
    orden: 1,
    area: 'matematica',
    areaNombre: 'Matemática',
    codigo: '1.3',
    comparteEntreNiveles: false,
    activo: true,
  });
  const arbol = await leerArbolPlan(admin, planId);
  const materia = arbol.niveles[0].modulos[0].materias[0];
  assert.equal(materia.id, materiaId);
  assert.equal(idCalificacionDeMateria(materia.id), materiaId);
  assert.equal(materia.codigo, '1.3');
  assert.equal(materia.comparteEntreNiveles, false);

  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertSucceeds(getDoc(doc(lectura, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId, 'materias', materiaId)));
});

test('sin los tres datos el plan no se crea, y docente o lectura no escriben', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { orientacion: '' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { resolucion: '   ' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { validezNacional: '' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('otro')));

  const docente = entorno.authenticatedContext('docente1').firestore();
  await assertFails(setDoc(doc(docente, 'planesEstudio', 'plan-1'), planDatos('docente1')));
  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertFails(setDoc(doc(lectura, 'planesEstudio', 'plan-1'), planDatos('lectura1')));
  const pendiente = entorno.authenticatedContext('pendiente1').firestore();
  await assertFails(getDoc(doc(pendiente, 'planesEstudio', 'plan-1')));
  await assertFails(crearPlanEstudio(docente, 'docente1', {
    orientacion: 'Orientación de prueba',
    resolucion: 'Resolución de prueba',
    validezNacional: 'Validez de prueba',
  }));
});

test('la materia exige área y código vacío o n.m; en uso no se borra ni se apaga', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1'));
  await setDoc(doc(admin, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a'), nivelDatos);
  await setDoc(doc(admin, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1'), moduloDatos);
  const materia = doc(admin, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1', 'materias', 'mat-1');
  await assertFails(setDoc(materia, materiaDatos({ area: '', areaNombre: '' })));
  await assertFails(setDoc(materia, materiaDatos({ codigo: 'modulo' })));
  await assertSucceeds(setDoc(materia, materiaDatos({ codigo: '' })));
  await assertSucceeds(updateDoc(materia, { codigo: '1.3' }));
  await assertSucceeds(updateDoc(materia, { enUso: true }));
  await assertFails(updateDoc(materia, { enUso: false }));
  await assertFails(deleteDoc(materia));
  await assertFails(updateDoc(doc(admin, 'planesEstudio', 'plan-1'), { orientacion: '' }));
  await assertFails(updateDoc(doc(admin, 'planesEstudio', 'plan-1'), { creadoPor: 'otro' }));
});

test('el docente lee solo las materias de su área', async () => {
  await sembrarUsuarios();
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'planesEstudio', 'plan-1'), planDatos('admin1'));
    await setDoc(doc(db, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a'), nivelDatos);
    await setDoc(doc(db, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1'), moduloDatos);
    await setDoc(
      doc(db, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1', 'materias', 'mat-mate'),
      materiaDatos(),
    );
    await setDoc(
      doc(db, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1', 'materias', 'mat-lengua'),
      materiaDatos({ nombre: 'Lengua de prueba', area: 'lengua', areaNombre: 'Lengua', codigo: '1.1', orden: 2 }),
    );
  });

  const mate = entorno.authenticatedContext('docente1').firestore();
  const base = collection(mate, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1', 'materias');
  await assertSucceeds(getDoc(doc(base, 'mat-mate')));
  await assertFails(getDoc(doc(base, 'mat-lengua')));
  await assertSucceeds(getDocs(query(base, where('area', '==', 'matematica'))));
  await assertFails(getDocs(base));
  await assertFails(setDoc(doc(base, 'mat-nueva'), materiaDatos()));

  const lengua = entorno.authenticatedContext('docente2').firestore();
  await assertFails(getDoc(doc(lengua, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1', 'materias', 'mat-mate')));
  await assertSucceeds(getDoc(doc(lengua, 'planesEstudio', 'plan-1')));

  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertSucceeds(getDocs(collection(lectura, 'planesEstudio', 'plan-1', 'niveles', 'nivel-a', 'modulos', 'mod-1', 'materias')));
});

test('un área nueva se puede guardar y un módulo en uso no se borra', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  const planId = await crearPlanEstudio(admin, 'admin1', {
    orientacion: 'Orientación de prueba',
    resolucion: 'Resolución de prueba',
    validezNacional: 'Validez de prueba',
  });
  const nivelId = await crearNivel(admin, planId, { codigo: 'B', anioCurso: 2, nombre: '2° año', orden: 1 });
  const moduloId = await crearModulo(admin, planId, nivelId, { nombre: 'Módulo 8', orden: 8 });
  await crearMateria(admin, planId, nivelId, moduloId, {
    nombre: 'Taller de prueba',
    orden: 1,
    area: 'educacion-fisica',
    areaNombre: 'Educación Física',
    codigo: '',
    comparteEntreNiveles: false,
    activo: true,
  });
  await updateDoc(doc(admin, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId), { enUso: true });
  await assertFails(updateDoc(doc(admin, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId), { enUso: false }));
  await assertFails(deleteDoc(doc(admin, 'planesEstudio', planId, 'niveles', nivelId, 'modulos', moduloId)));
});

test('el servicio rechaza un plan incompleto antes de escribir', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await assert.rejects(
    () => crearPlanEstudio(admin, 'admin1', { orientacion: '', resolucion: 'R', validezNacional: 'V' }),
    PlanEstudioError,
  );
});
