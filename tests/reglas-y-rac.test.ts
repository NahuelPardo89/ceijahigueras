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
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { PLANES_SEDE } from '../src/domain/planesSede.ts';
import { armarDocente } from '../src/domain/claves.ts';
import {
  DniDuplicadoError,
  cargarPlanesSede,
  calificacionesDe,
  cerrarRac,
  crearCiclo,
  crearEstudianteConRac,
  guardarCalificacion,
  generarRacSiguiente,
  leerPrivado,
} from '../src/services/escolar.ts';

let entorno: RulesTestEnvironment;

const usuario = (uid: string, role: string) => ({
  email: `${uid}@example.com`,
  displayName: uid,
  role,
  createdAt: '2026-01-01T00:00:00.000Z',
  activo: true,
  disabled: false,
});

async function sembrarUsuarios() {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'users', 'admin1'), usuario('admin1', 'admin'));
    await setDoc(doc(db, 'users', 'docente1'), usuario('docente1', 'docente'));
    await setDoc(doc(db, 'users', 'docente2'), usuario('docente2', 'docente'));
    await setDoc(doc(db, 'users', 'lectura1'), usuario('lectura1', 'lectura'));
    await setDoc(doc(db, 'users', 'pendiente1'), usuario('pendiente1', 'pendiente'));
    await setDoc(doc(db, 'users', 'legacy1'), usuario('legacy1', 'Administrador'));
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

test('el autoregistro solo puede crear el rol pendiente', async () => {
  const propio = entorno.authenticatedContext('nuevo').firestore();
  await assertSucceeds(setDoc(doc(propio, 'users', 'nuevo'), usuario('nuevo', 'pendiente')));
  const intruso = entorno.authenticatedContext('intruso').firestore();
  await assertFails(setDoc(doc(intruso, 'users', 'intruso'), usuario('intruso', 'docente')));
  await assertFails(setDoc(doc(intruso, 'users', 'intruso'), usuario('intruso', 'admin')));
});

test('nadie cambia su propio rol y el administrador sí', async () => {
  await sembrarUsuarios();
  const pendiente = entorno.authenticatedContext('pendiente1').firestore();
  await assertFails(updateDoc(doc(pendiente, 'users', 'pendiente1'), { role: 'admin' }));
  await assertSucceeds(updateDoc(doc(pendiente, 'users', 'pendiente1'), { displayName: 'Nombre editado' }));
  const admin = entorno.authenticatedContext('admin1').firestore();
  await assertSucceeds(updateDoc(doc(admin, 'users', 'pendiente1'), { role: 'docente' }));
});

test('el legado Administrador sigue pudiendo leer y el pendiente no', async () => {
  await sembrarUsuarios();
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'estudiantes', 'est1'), {
      apellido: 'Prueba',
      nombre: 'Ficticia',
      dniEnmascarado: '**.***.222',
      estado: 'activo',
    });
    await setDoc(doc(contexto.firestore(), 'estudiantes', 'est1', 'privado', 'datos'), {
      dni: '30111222',
      email: 'ficticio@example.com',
    });
    await setDoc(doc(contexto.firestore(), 'students', 'viejo'), {
      dni: '30111222',
      nombre: 'Ficticia',
    });
  });
  const admin = entorno.authenticatedContext('legacy1').firestore();
  await assertSucceeds(getDoc(doc(admin, 'estudiantes', 'est1', 'privado', 'datos')));
  const docente = entorno.authenticatedContext('docente1').firestore();
  await assertFails(getDoc(doc(docente, 'estudiantes', 'est1')));
  await assertFails(getDoc(doc(docente, 'estudiantes', 'est1', 'privado', 'datos')));
  await assertFails(getDoc(doc(docente, 'students', 'viejo')));
  const lectura = entorno.authenticatedContext('lectura1').firestore();
  await assertSucceeds(getDoc(doc(lectura, 'estudiantes', 'est1')));
  await assertFails(getDoc(doc(lectura, 'estudiantes', 'est1', 'privado', 'datos')));
  const pendiente = entorno.authenticatedContext('pendiente1').firestore();
  await assertFails(getDoc(doc(pendiente, 'estudiantes', 'est1')));
  await assertFails(getDoc(doc(entorno.unauthenticatedContext().firestore(), 'estudiantes', 'est1')));
});

test('equivalencias y logs quedan cerrados para quien no corresponde', async () => {
  await sembrarUsuarios();
  const equivalencia = {
    estudianteId: 'est1',
    espacioId: 'matematica',
    nota: 8,
    fecha: '2026-03-01',
    origen: 'Escuela ficticia',
  };
  const docente = entorno.authenticatedContext('docente1').firestore();
  const lectura = entorno.authenticatedContext('lectura1').firestore();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await assertFails(setDoc(doc(docente, 'equivalencias', 'eq1'), equivalencia));
  await assertFails(setDoc(doc(lectura, 'equivalencias', 'eq1'), equivalencia));
  await assertSucceeds(setDoc(doc(admin, 'equivalencias', 'eq1'), equivalencia));
  await assertSucceeds(getDoc(doc(lectura, 'equivalencias', 'eq1')));
  await assertFails(setDoc(doc(docente, 'equivalences', 'legacy'), {
    studentId: 'est1', nombre: 'Matemática', nota: '8', fecha: '2026-03-01', createdAt: '2026-03-01',
  }));

  const logPropio = {
    entidad: 'estudiante',
    entityId: 'est1',
    accion: 'create',
    uid: 'docente1',
    timestamp: '2026-03-01T00:00:00.000Z',
  };
  await assertSucceeds(setDoc(doc(docente, 'logs', 'log1'), logPropio));
  await assertFails(setDoc(doc(docente, 'logs', 'log2'), { ...logPropio, uid: 'admin1' }));
  await assertFails(updateDoc(doc(docente, 'logs', 'log1'), { accion: 'delete' }));
  await assertFails(deleteDoc(doc(docente, 'logs', 'log1')));
  await assertFails(getDoc(doc(lectura, 'logs', 'log1')));
  await assertSucceeds(getDoc(doc(admin, 'logs', 'log1')));
});

test('el docente solo carga notas válidas en su espacio y con el RAC abierto', async () => {
  await sembrarUsuarios();
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'docentes', 'docente1'), armarDocente('Docente', 'docente1@example.com', [
      { planId: 'A-698-CB', espacioId: 'matematica', anio: 2026, compartidoM8: false },
    ]));
    await setDoc(doc(db, 'rac', 'est1_2026_A-698-CB'), {
      estudianteId: 'est1',
      anio: 2026,
      planId: 'A-698-CB',
      estado: 'abierto',
      apellido: 'Prueba',
      nombre: 'Ficticia',
      resumen: { promedio: null, adeuda: [] },
    });
    await setDoc(doc(db, 'rac', 'est1_2026_A-698-CB', 'calificaciones', 'matematica'), {
      espacioId: 'matematica',
      nombre: 'Matemática',
      modulo: 'M1',
      tpi: '',
      notaFinal: null,
      notaLetras: '',
      fecha: '',
      condicion: 'Reg',
      docenteUid: '',
      actaNro: '',
      estado: 'pendiente',
      compartidoM8: false,
      orden: 1,
    });
  });

  const docente = entorno.authenticatedContext('docente1').firestore();
  const calificacion = doc(docente, 'rac', 'est1_2026_A-698-CB', 'calificaciones', 'matematica');
  await assertSucceeds(updateDoc(calificacion, {
    tpi: 'APROBADO',
    notaFinal: 7.5,
    notaLetras: 'SIETE CON CINCUENTA',
    fecha: '03/26',
    docenteUid: 'docente1',
    estado: 'aprobado',
  }));
  await assertFails(updateDoc(calificacion, { notaFinal: 9.3, docenteUid: 'docente1', estado: 'pendiente', tpi: '', notaLetras: '', fecha: '' }));
  await assertFails(updateDoc(calificacion, { notaFinal: 11, docenteUid: 'docente1', estado: 'pendiente', tpi: '', notaLetras: '', fecha: '' }));
  await assertFails(updateDoc(calificacion, { condicion: 'Equiv' }));

  const otro = entorno.authenticatedContext('docente2').firestore();
  await assertFails(updateDoc(doc(otro, 'rac', 'est1_2026_A-698-CB', 'calificaciones', 'matematica'), {
    tpi: 'APROBADO', notaFinal: 8, notaLetras: 'OCHO', fecha: '03/26', docenteUid: 'docente2', estado: 'aprobado',
  }));

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await updateDoc(doc(contexto.firestore(), 'rac', 'est1_2026_A-698-CB'), { estado: 'cerrado' });
  });
  await assertFails(updateDoc(calificacion, {
    tpi: 'APROBADO', notaFinal: 8, notaLetras: 'OCHO', fecha: '04/26', docenteUid: 'docente1', estado: 'aprobado',
  }));
});

test('crear un estudiante con su RAC es atómico y el DNI no se repite', async () => {
  await sembrarUsuarios();
  const admin = entorno.authenticatedContext('admin1').firestore();
  await crearCiclo(admin, 2026);
  await cargarPlanesSede(admin);
  const alta = await crearEstudianteConRac(admin, {
    apellido: 'Prueba',
    nombre: 'Ficticia',
    dni: '30.111.222',
    tipoDoc: 'DNI',
    estado: 'activo',
    sede: 'Las Higueras',
    cohorte: 2026,
    condicionIngreso: 'Reg',
    linkLegajoDrive: 'https://example.com/legajo-ficticio',
    planId: PLANES_SEDE[0].id,
    anio: 2026,
    privado: {
      dni: '30111222',
      dniNormalizado: '',
      cuil: '',
      email: 'ficticio@example.com',
      telefono: '3410000000',
      fechaNacimiento: '2000-01-15',
      paseProvisorio: false,
      paseDefinitivo: false,
      fotocopiaDni: true,
      cus: false,
      certificadoPrimaria: 'original',
      numeroEquivalencia: '',
      linkTitulo: '',
      documentacionCompleta: 'incompleta',
      observaciones: 'dato ficticio',
    },
    equivalencias: [{ espacioId: 'ingles', nota: 9, fecha: '2026-03-01' }],
    creadoPor: 'admin1',
  });

  const publico = await getDoc(doc(admin, 'estudiantes', alta.estudianteId));
  assert.equal(publico.exists(), true);
  assert.equal('dni' in (publico.data() ?? {}), false);
  assert.equal(publico.data()?.dniEnmascarado, '**.***.222');
  const indice = await getDoc(doc(admin, 'dniIndex', '30111222'));
  assert.equal(indice.data()?.estudianteId, alta.estudianteId);
  const notas = await calificacionesDe(admin, alta.racId);
  assert.equal(notas.length, PLANES_SEDE[0].espacios.length);
  assert.equal(notas.find((nota) => nota.espacioId === 'ingles')?.condicion, 'Equiv');

  const docente = entorno.authenticatedContext('docente1').firestore();
  await assert.rejects(() => leerPrivado(docente, alta.estudianteId));
  await assert.rejects(() => crearEstudianteConRac(admin, {
    apellido: 'Otra',
    nombre: 'Persona',
    dni: '30111222',
    tipoDoc: 'DNI',
    estado: 'activo',
    sede: 'Las Higueras',
    cohorte: 2026,
    condicionIngreso: 'Reg',
    linkLegajoDrive: '',
    planId: PLANES_SEDE[0].id,
    anio: 2026,
    privado: {
      dni: '30111222', dniNormalizado: '30111222', cuil: '', email: '', telefono: '',
      fechaNacimiento: '', paseProvisorio: false, paseDefinitivo: false, fotocopiaDni: false,
      cus: false, certificadoPrimaria: '', numeroEquivalencia: '', linkTitulo: '',
      documentacionCompleta: 'incompleta', observaciones: '',
    },
    equivalencias: [],
    creadoPor: 'admin1',
  }), DniDuplicadoError);

  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), 'docentes', 'docente1'), armarDocente('Docente', 'docente1@example.com', [
      { planId: 'A-698-CB', espacioId: 'matematica', anio: 2026, compartidoM8: false },
    ]));
  });
  await guardarCalificacion(docente, alta.racId, 'matematica', {
    notaFinal: 8,
    tpi: 'APROBADO',
    fecha: '03/26',
    docenteUid: 'docente1',
  });
  const guardada = (await calificacionesDe(admin, alta.racId)).find((nota) => nota.espacioId === 'matematica');
  assert.equal(guardada?.notaFinal, 8);
  assert.equal(guardada?.notaLetras, 'OCHO');
  await assert.rejects(() => guardarCalificacion(docente, alta.racId, 'matematica', {
    notaFinal: 9.3, tpi: 'APROBADO', fecha: '03/26', docenteUid: 'docente1',
  }));

  await cerrarRac(admin, alta.racId);
  await assert.rejects(() => guardarCalificacion(docente, alta.racId, 'matematica', {
    notaFinal: 9, tpi: 'APROBADO', fecha: '04/26', docenteUid: 'docente1',
  }));

  await crearCiclo(admin, 2027);
  const generado = await generarRacSiguiente(admin, {
    uid: 'admin1',
    anioOrigen: 2026,
    anioDestino: 2027,
    planOrigenId: 'A-698-CB',
    planDestinoId: 'B-1206-EyA',
    soloEstudianteId: alta.estudianteId,
  });
  assert.equal(generado.creados, 1);
  const siguienteId = `${alta.estudianteId}_2027_B-1206-EyA`;
  const siguientes = await calificacionesDe(admin, siguienteId);
  assert.equal(siguientes.find((nota) => nota.espacioId === 'matematica')?.condicion, 'Reg');
  assert.equal(siguientes.find((nota) => nota.espacioId === 'lengua')?.condicion, 'Prev');
  const racSiguiente = await getDoc(doc(admin, 'rac', siguienteId));
  assert.ok((racSiguiente.data()?.resumen.adeuda as string[]).includes('Lengua y Literatura'));
});

test('las colecciones legacy quedan solo lectura para el administrador', async () => {
  await sembrarUsuarios();
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'students', 'est-legacy'), { apellido: 'Prueba', nombre: 'Ficticia', dni: '40111222' });
    await setDoc(doc(db, 'grades', 'nota-legacy'), { studentId: 'est-legacy', subjectId: 'mat', nota: '8', fecha: '15/03/2026' });
    await setDoc(doc(db, 'equivalences', 'eq-legacy'), { studentId: 'est-legacy', nombre: 'Inglés', nota: '9', fecha: '15/03/2026' });
    await setDoc(doc(db, 'subjects', 'mat'), { nombre: 'Matemática', planId: 'plan-a', modulo: 1 });
    await setDoc(doc(db, 'studyPlans', 'plan-a'), { nombre: 'Plan A', active: true });
  });

  const admin = entorno.authenticatedContext('admin1').firestore();
  const legado = entorno.authenticatedContext('legacy1').firestore();
  const docente = entorno.authenticatedContext('docente1').firestore();
  const lectura = entorno.authenticatedContext('lectura1').firestore();
  const rutas = [
    ['students', 'est-legacy'],
    ['grades', 'nota-legacy'],
    ['equivalences', 'eq-legacy'],
    ['subjects', 'mat'],
    ['studyPlans', 'plan-a'],
  ] as const;

  for (const [coleccion, id] of rutas) {
    await assertSucceeds(getDoc(doc(admin, coleccion, id)));
    await assertSucceeds(getDoc(doc(legado, coleccion, id)));
    await assertFails(getDoc(doc(docente, coleccion, id)));
    await assertFails(getDoc(doc(lectura, coleccion, id)));
    await assertFails(setDoc(doc(admin, coleccion, `${id}-nuevo`), { nombre: 'No' }));
    await assertFails(updateDoc(doc(admin, coleccion, id), { nombre: 'Tocado' }));
    await assertFails(deleteDoc(doc(admin, coleccion, id)));
  }
});
