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
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { idAsignatura } from '../src/domain/planesEstudio.ts';
import {
  crearAnio,
  crearAsignatura,
  crearModulo,
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
  nombre: 'Plan de prueba',
  orientacion: 'Orientación de prueba',
  resolucion: 'Resolución de prueba',
  validezNacional: 'Validez de prueba',
  activo: true,
  enUso: false,
  creadoPor: uid,
  fechaCreacion: '2026-10-22T12:00:00.000Z',
  ...extra,
});

const anioDatos = { nombre: 'Plan A', orden: 1, enUso: false };

const moduloDatos = { nombre: 'Módulo 1', orden: 1, enUso: false };

const asignaturaDatos = (extra: Record<string, unknown> = {}) => ({
  nombre: 'Matemática de prueba',
  orden: 1,
  codigo: '1.3',
  activo: true,
  enUso: false,
  ...extra,
});

const alta = {
  nombre: 'Plan de prueba',
  orientacion: 'Orientación de prueba',
  resolucion: 'Resolución de prueba',
  validezNacional: 'Validez de prueba',
};

async function sembrarUsuarios() {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'users', 'admin1'), usuario('admin1', 'admin'));
    await setDoc(doc(db, 'users', 'docente1'), usuario('docente1', 'docente'));
    await setDoc(doc(db, 'users', 'lectura1'), usuario('lectura1', 'lectura'));
    await setDoc(doc(db, 'users', 'pendiente1'), usuario('pendiente1', 'pendiente'));
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

test('el admin crea un plan vacío y después un plan o año, un módulo y una asignatura', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  const planId = await crearPlanEstudio(admin, 'admin1', alta);
  const vacio = await leerArbolPlan(admin, planId);
  assert.equal(vacio.anios.length, 0);
  assert.equal(vacio.plan.nombre, 'Plan de prueba');
  assert.equal(vacio.plan.orientacion, 'Orientación de prueba');
  assert.equal(vacio.plan.enUso, false);

  const anioId = await crearAnio(admin, planId, { nombre: 'Plan A', orden: 1 });
  const moduloId = await crearModulo(admin, planId, anioId, { nombre: 'Módulo 1', orden: 1 });
  const asignaturaId = await crearAsignatura(admin, planId, anioId, moduloId, {
    nombre: 'Matemática de prueba',
    orden: 1,
    codigo: '1.3',
    activo: true,
  });
  const arbol = await leerArbolPlan(admin, planId);
  const asignatura = arbol.anios[0].modulos[0].asignaturas[0];
  assert.equal(asignatura.id, asignaturaId);
  assert.equal(idAsignatura(asignatura.id), asignaturaId);
  assert.equal(asignatura.codigo, '1.3');
  assert.equal('area' in asignatura, false);

  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertSucceeds(getDoc(doc(lectura, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId, 'asignaturas', asignaturaId)));
});

test('sin nombre, orientación, validez o resolución el plan no se crea, y docente o lectura no escriben', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { nombre: '' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { orientacion: '' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { resolucion: '   ' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1', { validezNacional: '' })));
  await assertFails(setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('otro')));

  const docente = entorno.authenticatedContext('docente1').firestore();
  await assertFails(setDoc(doc(docente, 'planesEstudio', 'plan-1'), planDatos('docente1')));
  await assertFails(getDoc(doc(docente, 'planesEstudio', 'plan-1')));
  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertFails(setDoc(doc(lectura, 'planesEstudio', 'plan-1'), planDatos('lectura1')));
  const pendiente = entorno.authenticatedContext('pendiente1').firestore();
  await assertFails(getDoc(doc(pendiente, 'planesEstudio', 'plan-1')));
  await assertFails(crearPlanEstudio(docente, 'docente1', alta));
});

test('la asignatura acepta un nombre libre y código vacío o n.m; en uso no se borra ni se apaga', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await setDoc(doc(admin, 'planesEstudio', 'plan-1'), planDatos('admin1'));
  await setDoc(doc(admin, 'planesEstudio', 'plan-1', 'anios', 'anio-a'), anioDatos);
  await setDoc(doc(admin, 'planesEstudio', 'plan-1', 'anios', 'anio-a', 'modulos', 'mod-1'), moduloDatos);
  const asignatura = doc(admin, 'planesEstudio', 'plan-1', 'anios', 'anio-a', 'modulos', 'mod-1', 'asignaturas', 'asig-1');
  await assertFails(setDoc(asignatura, asignaturaDatos({ nombre: '' })));
  await assertFails(setDoc(asignatura, asignaturaDatos({ codigo: 'modulo' })));
  await assertSucceeds(setDoc(asignatura, asignaturaDatos({ nombre: 'Educación Física de prueba', codigo: '' })));
  await assertSucceeds(updateDoc(asignatura, { codigo: '1.3', nombre: 'Matemática aplicada de prueba' }));
  await assertSucceeds(updateDoc(asignatura, { enUso: true }));
  await assertFails(updateDoc(asignatura, { enUso: false }));
  await assertFails(deleteDoc(asignatura));
  await assertFails(updateDoc(doc(admin, 'planesEstudio', 'plan-1'), { orientacion: '' }));
  await assertFails(updateDoc(doc(admin, 'planesEstudio', 'plan-1'), { nombre: '' }));
  await assertFails(updateDoc(doc(admin, 'planesEstudio', 'plan-1'), { creadoPor: 'otro' }));
});

test('el docente no lee el árbol y lectura sí lista las asignaturas', async () => {
  await sembrarUsuarios();
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'planesEstudio', 'plan-1'), planDatos('admin1'));
    await setDoc(doc(db, 'planesEstudio', 'plan-1', 'anios', 'anio-a'), anioDatos);
    await setDoc(doc(db, 'planesEstudio', 'plan-1', 'anios', 'anio-a', 'modulos', 'mod-1'), moduloDatos);
    await setDoc(
      doc(db, 'planesEstudio', 'plan-1', 'anios', 'anio-a', 'modulos', 'mod-1', 'asignaturas', 'asig-1'),
      asignaturaDatos(),
    );
  });

  const docente = entorno.authenticatedContext('docente1').firestore();
  const base = collection(docente, 'planesEstudio', 'plan-1', 'anios', 'anio-a', 'modulos', 'mod-1', 'asignaturas');
  await assertFails(getDoc(doc(docente, 'planesEstudio', 'plan-1')));
  await assertFails(getDoc(doc(base, 'asig-1')));
  await assertFails(getDocs(base));

  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertSucceeds(getDocs(collection(lectura, 'planesEstudio', 'plan-1', 'anios', 'anio-a', 'modulos', 'mod-1', 'asignaturas')));
});

test('un módulo en uso no se borra ni se apaga', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  const planId = await crearPlanEstudio(admin, 'admin1', alta);
  const anioId = await crearAnio(admin, planId, { nombre: 'Plan B', orden: 2 });
  const moduloId = await crearModulo(admin, planId, anioId, { nombre: 'Módulo 8', orden: 8 });
  await crearAsignatura(admin, planId, anioId, moduloId, {
    nombre: 'Taller de prueba',
    orden: 1,
    codigo: '',
    activo: true,
  });
  await updateDoc(doc(admin, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId), { enUso: true });
  await assertFails(updateDoc(doc(admin, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId), { enUso: false }));
  await assertFails(deleteDoc(doc(admin, 'planesEstudio', planId, 'anios', anioId, 'modulos', moduloId)));
});

test('el servicio rechaza un plan incompleto antes de escribir', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await assert.rejects(
    () => crearPlanEstudio(admin, 'admin1', { ...alta, orientacion: '' }),
    PlanEstudioError,
  );
  await assert.rejects(
    () => crearPlanEstudio(admin, 'admin1', { ...alta, nombre: '' }),
    PlanEstudioError,
  );
});
