import { readFileSync } from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { ejecutarMigracion } from '../src/services/migracion.ts';
import { calificacionesDe, leerPrivado, leerResumen } from '../src/services/escolar.ts';

let entorno: RulesTestEnvironment;

const usuarioAdmin = {
  email: 'admin1@example.com',
  displayName: 'Admin',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  activo: true,
  disabled: false,
};

function hostEmulador() {
  const crudo = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const [host, puerto] = crudo.split(':');
  return { host, port: Number(puerto || 8080) };
}

before(async () => {
  const { host, port } = hostEmulador();
  entorno = await initializeTestEnvironment({
    projectId: 'demo-ceija',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host,
      port,
    },
  });
});

after(async () => {
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
});

async function sembrarLegado() {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'users', 'admin1'), usuarioAdmin);
    await setDoc(doc(db, 'studyPlans', 'legacy-a'), { nombre: 'Plan A', active: true, cohorteInicio: 2026 });
    await setDoc(doc(db, 'subjects', 'sub-mat'), { nombre: 'MATEMÁTICA', planId: 'legacy-a', modulo: 1 });
    await setDoc(doc(db, 'subjects', 'sub-nat'), { nombre: 'Ciencias Naturales', planId: 'legacy-a', modulo: 3 });
    await setDoc(doc(db, 'subjects', 'sub-ing'), { nombre: 'Inglés', planId: 'legacy-a', modulo: 5 });
    await setDoc(doc(db, 'subjects', 'sub-filo'), { nombre: 'Filosofía', planId: 'legacy-a', modulo: 9 });
    await setDoc(doc(db, 'students', 'stu-1'), {
      apellido: 'PRUEBA',
      nombre: 'FICTICIA',
      dni: '40.111.222',
      cuil: '20-40111222-3',
      email: 'ficticia@example.com',
      telefono: '3410000000',
      fechaNacimiento: '2001-05-05',
      estado: 'activo',
      planActual: 'Plan A',
      planId: 'legacy-a',
      createdAt: '2026-03-01T00:00:00.000Z',
      createdBy: 'admin1',
      paseProvisorio: true,
      paseDefinitivo: false,
      fotocopiaDni: true,
      cus: false,
      certificadoPrimaria: 'original',
      numeroEquivalencia: 'EQ-1',
      linkTitulo: '',
      documentacionCompleta: 'incompleta',
      observaciones: 'dato ficticio',
    });
    await setDoc(doc(db, 'students', 'stu-2'), {
      apellido: 'OTRA', nombre: 'PERSONA', dni: '40999888', planActual: 'Plan A',
    });
    await setDoc(doc(db, 'students', 'stu-3'), {
      apellido: 'OTRA', nombre: 'COPIA', dni: '40.999.888', planActual: 'Plan A',
    });
    await setDoc(doc(db, 'students', 'stu-4'), {
      apellido: 'SIN', nombre: 'PLAN', dni: '40888777', planActual: 'Plan Z',
    });
    await setDoc(doc(db, 'grades', 'g1'), { studentId: 'stu-1', subjectId: 'sub-mat', nota: '8', fecha: '15/03/2026' });
    await setDoc(doc(db, 'grades', 'g2'), { studentId: 'stu-1', subjectId: 'sub-nat', nota: '4', fecha: '20/04/2026' });
    await setDoc(doc(db, 'equivalences', 'e1'), { studentId: 'stu-1', nombre: 'Inglés', nota: '9', fecha: '02/03/2026' });
  });
}

test('el dry-run lee el legado ficticio y no escribe el modelo nuevo', async () => {
  await sembrarLegado();
  const admin = entorno.authenticatedContext('admin1').firestore();
  const informe = await ejecutarMigracion(admin, { escribir: false, anio: 2026, creadoPor: 'admin1' });
  assert.equal(informe.dryRun, true);
  assert.equal(informe.leidos, 4);
  assert.equal(informe.aCrear, 1);
  assert.equal(informe.creados, 0);
  assert.equal(informe.revisar, 3);
  assert.equal(informe.notasPrevistas, 2);
  assert.equal(informe.notasAplicadas, 0);
  const texto = JSON.stringify(informe);
  assert.equal(texto.includes('40111222'), false);
  assert.equal(texto.includes('40999888'), false);
  assert.equal(texto.includes('ficticia@example.com'), false);
  assert.equal((await getDocs(collection(admin, 'estudiantes'))).size, 0);
  assert.equal((await getDocs(collection(admin, 'ciclos'))).size, 0);
  assert.equal((await getDocs(collection(admin, 'planes'))).size, 0);
  assert.equal((await getDoc(doc(admin, 'students', 'stu-1'))).exists(), true);
});

test('escribir es idempotente, no borra el legado y no duplica el DNI', async () => {
  await sembrarLegado();
  const admin = entorno.authenticatedContext('admin1').firestore();
  const primera = await ejecutarMigracion(admin, { escribir: true, anio: 2026, creadoPor: 'admin1' });
  assert.equal(primera.errores, 0);
  assert.equal(primera.creados, 1);
  assert.equal(primera.notasAplicadas, 2);
  assert.equal(primera.revisar, 3);

  const estudiantes = await getDocs(collection(admin, 'estudiantes'));
  assert.equal(estudiantes.size, 1);
  const estudianteId = estudiantes.docs[0].id;
  const publico = estudiantes.docs[0].data();
  assert.equal('dni' in publico, false);
  assert.equal(publico.dniEnmascarado, '**.***.222');
  assert.equal(publico.planActualId, 'A-698-CB');

  const indice = await getDoc(doc(admin, 'dniIndex', '40111222'));
  assert.equal(indice.data()?.estudianteId, estudianteId);
  assert.equal((await getDoc(doc(admin, 'dniIndex', '40999888'))).exists(), false);
  assert.equal((await getDoc(doc(admin, 'dniIndex', '40888777'))).exists(), false);

  const privado = await leerPrivado(admin, estudianteId);
  assert.equal(privado?.dni, '40111222');
  assert.equal(privado?.email, 'ficticia@example.com');

  const racId = `${estudianteId}_2026_A-698-CB`;
  const notas = await calificacionesDe(admin, racId);
  const matematica = notas.find((nota) => nota.espacioId === 'matematica');
  const naturales = notas.find((nota) => nota.espacioId === 'naturales');
  const ingles = notas.find((nota) => nota.espacioId === 'ingles');
  assert.equal(matematica?.notaFinal, 8);
  assert.equal(matematica?.fecha, '03/26');
  assert.equal(matematica?.estado, 'aprobado');
  assert.equal(naturales?.notaFinal, 4);
  assert.equal(naturales?.estado, 'pendiente');
  assert.equal(ingles?.condicion, 'Equiv');
  assert.equal(ingles?.notaFinal, 9);
  assert.equal((await leerResumen(admin, 2026)).length, 1);
  assert.equal((await getDoc(doc(admin, 'students', 'stu-2'))).exists(), true);

  const segunda = await ejecutarMigracion(admin, { escribir: true, anio: 2026, creadoPor: 'admin1' });
  assert.equal(segunda.errores, 0);
  assert.equal(segunda.creados, 0);
  assert.equal(segunda.yaExistian, 1);
  assert.equal(segunda.notasAplicadas, 0);
  assert.equal((await getDocs(collection(admin, 'estudiantes'))).size, 1);
  assert.equal((await getDocs(collection(admin, 'dniIndex'))).size, 1);
  assert.equal((await leerResumen(admin, 2026)).length, 1);
  assert.equal((await getDocs(collection(admin, 'students'))).size, 4);
});
