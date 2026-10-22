import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarDestino,
  fechaLegacyACorta,
  parsearArgs,
  parsearNotaLegacy,
  planificar,
  resolverEspacioId,
  resolverPlanId,
  type DocumentoLegacy,
  type EntradaLegacy,
} from '../src/domain/migracion.ts';

function doc(id: string, datos: Record<string, unknown>): DocumentoLegacy {
  return { id, datos };
}

function entradaBase(): EntradaLegacy {
  return {
    students: [
      doc('stu-1', {
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
        planInicial: 'Plan A',
        createdAt: '2026-03-01T00:00:00.000Z',
        paseProvisorio: true,
        fotocopiaDni: true,
        certificadoPrimaria: 'original',
        documentacionCompleta: 'incompleta',
        observaciones: 'dato ficticio',
      }),
      doc('stu-2', { apellido: 'OTRA', nombre: 'PERSONA', dni: '40999888', planActual: 'Plan A' }),
      doc('stu-3', { apellido: 'OTRA', nombre: 'COPIA', dni: '40.999.888', planActual: 'Plan A' }),
      doc('stu-4', { apellido: 'SIN', nombre: 'PLAN', dni: '40888777', planActual: 'Plan Z' }),
    ],
    grades: [
      doc('g1', { studentId: 'stu-1', subjectId: 'sub-mat', nota: '8', fecha: '15/03/2026' }),
      doc('g2', { studentId: 'stu-1', subjectId: 'sub-nat', nota: '4', fecha: '20/04/2026' }),
      doc('g3', { studentId: 'stu-1', subjectId: 'sub-mat', nota: '6', fecha: '01/02/2026' }),
      doc('g4', { studentId: 'stu-1', subjectId: 'sub-filo', nota: '9', fecha: '01/05/2026' }),
      doc('g5', { studentId: 'stu-1', subjectId: 'sub-nat', nota: 'Aprobado', fecha: '01/05/2026' }),
    ],
    equivalences: [
      doc('e1', { studentId: 'stu-1', nombre: 'Inglés', nota: '9', fecha: '02/03/2026' }),
    ],
    subjects: [
      doc('sub-mat', { nombre: 'MATEMÁTICA', planId: 'legacy-a', modulo: 1 }),
      doc('sub-nat', { nombre: 'Ciencias Naturales', planId: 'legacy-a', modulo: 3 }),
      doc('sub-ing', { nombre: 'Inglés', planId: 'legacy-a', modulo: 5 }),
      doc('sub-filo', { nombre: 'Filosofía', planId: 'legacy-a', modulo: 9 }),
    ],
    studyPlans: [
      doc('legacy-a', { nombre: 'Plan A', active: true }),
    ],
    dniIndex: [],
  };
}

test('parsea notas y fechas del legajo viejo', () => {
  assert.equal(parsearNotaLegacy('8'), 8);
  assert.equal(parsearNotaLegacy('7,5'), 7.5);
  assert.equal(parsearNotaLegacy('Aprobado'), null);
  assert.equal(parsearNotaLegacy('9.3'), null);
  assert.equal(fechaLegacyACorta('15/03/2026'), '03/26');
  assert.equal(fechaLegacyACorta('31/02/2026'), '');
  assert.equal(fechaLegacyACorta('2026-03-15'), '03/26');
});

test('empareja planes y espacios de la sede', () => {
  assert.equal(resolverPlanId({ planActual: 'Plan B' }, []), 'B-1206-EyA');
  assert.equal(resolverPlanId({ planId: 'legacy-c' }, [doc('legacy-c', { nombre: 'Plan C — 3° año' })]), 'C-1206-EyA');
  assert.equal(resolverPlanId({ planActual: 'Plan Z' }, []), null);
  assert.equal(resolverEspacioId('A-698-CB', 'Formación para el Trabajo'), 'm8-trabajo');
  assert.equal(resolverEspacioId('A-698-CB', 'Formación Profesional'), 'm8-trabajo');
  assert.equal(resolverEspacioId('C-1206-EyA', 'Formación Profesional'), 'formacion-profesional');
  assert.equal(resolverEspacioId('A-698-CB', 'Filosofía'), null);
});

test('el plan de migración no copia duplicados ni DNI inválidos y prioriza la equivalencia', () => {
  const plan = planificar(entradaBase(), 2026);
  const ficticia = plan.acciones.find((accion) => accion.legacyId === 'stu-1');
  assert.equal(ficticia?.decision, 'crear');
  assert.equal(ficticia?.ficha?.planId, 'A-698-CB');
  assert.equal(ficticia?.ficha?.dni, '40111222');
  assert.equal(ficticia?.dniEnmascarado, '**.***.222');
  assert.equal(ficticia?.ficha?.privado.email, 'ficticia@example.com');
  assert.deepEqual(ficticia?.ficha?.equivalencias, [{ espacioId: 'ingles', nota: 9, fecha: '03/26' }]);
  assert.equal(ficticia?.ficha?.notas.find((nota) => nota.espacioId === 'matematica')?.notaFinal, 8);
  assert.equal(ficticia?.ficha?.notas.find((nota) => nota.espacioId === 'naturales')?.notaFinal, 4);
  assert.equal(ficticia?.ficha?.notas.some((nota) => nota.espacioId === 'ingles'), false);
  assert.ok(ficticia?.motivos.some((motivo) => motivo.includes('Filosofía')));
  assert.ok(ficticia?.motivos.some((motivo) => motivo.includes('más alta')));

  for (const id of ['stu-2', 'stu-3', 'stu-4']) {
    assert.equal(plan.acciones.find((accion) => accion.legacyId === id)?.decision, 'revisar');
    assert.equal(plan.acciones.find((accion) => accion.legacyId === id)?.ficha, undefined);
  }
  const serializado = JSON.stringify(plan.acciones.filter((accion) => accion.decision === 'revisar'));
  assert.equal(serializado.includes('40999888'), false);
  assert.equal(serializado.includes('40888777'), false);
});

test('si el DNI ya está indexado no propone crear otro estudiante', () => {
  const entrada = entradaBase();
  entrada.dniIndex = [{ dni: '40111222', estudianteId: 'est-ya' }];
  const primera = planificar(entrada, 2026);
  const segunda = planificar(entrada, 2026);
  const accion = primera.acciones.find((item) => item.legacyId === 'stu-1');
  assert.equal(accion?.decision, 'ya-existe');
  assert.equal(accion?.estudianteIdExistente, 'est-ya');
  assert.equal(accion?.ficha?.notas.length, segunda.acciones.find((item) => item.legacyId === 'stu-1')?.ficha?.notas.length);
});

test('el destino por defecto es el emulador en dry-run y el proyecto real queda cerrado', () => {
  const args = parsearArgs(['--emulador', '--anio', '2026']);
  const destino = evaluarDestino({
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: 'demo-ceija',
  }, args);
  assert.equal(destino.ok, true);
  if (destino.ok) {
    assert.equal(destino.modo, 'emulador');
    assert.equal(destino.escribir, false);
    assert.equal(destino.projectId, 'demo-ceija');
  }

  const escribir = evaluarDestino({
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: 'demo-ceija',
  }, parsearArgs(['--emulador', '--anio', '2026', '--escribir']));
  assert.equal(escribir.ok && escribir.escribir, true);

  const realSinMarcas = evaluarDestino({
    GCLOUD_PROJECT: 'ceija12resm',
  }, parsearArgs(['--anio', '2026', '--escribir']));
  assert.equal(realSinMarcas.ok, false);

  const mezclado = evaluarDestino({
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: 'ceija12resm',
  }, parsearArgs(['--emulador', '--anio', '2026']));
  assert.equal(mezclado.ok, false);

  const real = evaluarDestino({
    CEIJA_MIGRACION_REAL: 'escribo-en-produccion',
  }, parsearArgs([
    '--anio', '2026',
    '--escribir',
    '--confirmar-proyecto', 'ceija12resm',
    '--confirmar-frase', 'MIGRAR CEIJA',
  ]));
  assert.equal(real.ok && real.modo === 'produccion' && real.escribir, true);

  const realSinEscribir = evaluarDestino({
    CEIJA_MIGRACION_REAL: 'escribo-en-produccion',
  }, parsearArgs([
    '--anio', '2026',
    '--confirmar-proyecto', 'ceija12resm',
    '--confirmar-frase', 'MIGRAR CEIJA',
  ]));
  assert.equal(realSinEscribir.ok && realSinEscribir.escribir, false);

  assert.throws(() => parsearArgs(['--csv', 'legajos.csv']), /CSV/);
  assert.throws(() => parsearArgs(['--escribir', '--dry-run', '--anio', '2026']), /no los dos/);
});
