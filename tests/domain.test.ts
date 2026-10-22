import test from 'node:test';
import assert from 'node:assert/strict';
import { enmascararDni, dniValido, normalizarDni } from '../src/domain/dni.ts';
import { notaEnLetras, notaValida } from '../src/domain/notas.ts';
import { alertaPase, equivalenciaFueraDeTermino, vencimientoPaseProvisorio } from '../src/domain/alertas.ts';
import { armarDocente, claveEspacio } from '../src/domain/claves.ts';
import { PLANES_SEDE } from '../src/domain/planesSede.ts';
import {
  aplicarCierre,
  armarCalificacionesSiguiente,
  documentosAlta,
  calificacionDesdeEspacio,
} from '../src/domain/rac.ts';
import type { AltaEstudianteInput } from '../src/domain/rac.ts';
import type { EstudiantePrivado } from '../src/domain/types.ts';

const privado: EstudiantePrivado = {
  dni: '30111222',
  dniNormalizado: '30111222',
  cuil: '20-30111222-3',
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
  observaciones: '',
};

function altaBase(): AltaEstudianteInput {
  const plan = PLANES_SEDE[0];
  return {
    estudianteId: 'est1',
    logId: 'log1',
    anio: 2026,
    plan,
    espacios: plan.espacios,
    apellido: 'Prueba',
    nombre: 'Ficticia',
    dniNormalizado: '30111222',
    tipoDoc: 'DNI',
    estado: 'activo',
    sede: 'Las Higueras',
    cohorte: 2026,
    condicionIngreso: 'Reg',
    linkLegajoDrive: '',
    creadoPor: 'admin1',
    fechaCreacion: '2026-03-01T12:00:00.000Z',
    privado,
    equivalencias: [],
    m8RacIds: [],
  };
}

test('normaliza y enmascara el DNI', () => {
  assert.equal(normalizarDni('30.111.222'), '30111222');
  assert.equal(dniValido('30111222'), true);
  assert.equal(dniValido('123'), false);
  assert.equal(enmascararDni('30111222'), '**.***.222');
});

test('valida la escala de notas y las escribe en letras', () => {
  assert.equal(notaValida(7.5), true);
  assert.equal(notaValida(9.3), false);
  assert.equal(notaValida(null), true);
  assert.equal(notaEnLetras(7.5), 'SIETE CON CINCUENTA');
  assert.equal(notaEnLetras(10), 'DIEZ');
});

test('el alta arma un lote con DNI, legajo público, privado, RAC y notas', () => {
  const { racId, writes, calificaciones } = documentosAlta({
    ...altaBase(),
    equivalencias: [{ espacioId: 'matematica', nota: 8, fecha: '03/26' }],
  });
  assert.equal(racId, 'est1_2026_A-698-CB');
  const paths = writes.map((write) => write.path);
  assert.ok(paths.includes('dniIndex/30111222'));
  assert.ok(paths.includes('estudiantes/est1'));
  assert.ok(paths.includes('estudiantes/est1/privado/datos'));
  assert.ok(paths.includes('rac/est1_2026_A-698-CB'));
  assert.equal(calificaciones.length, PLANES_SEDE[0].espacios.length);
  const publico = writes.find((write) => write.path === 'estudiantes/est1')!.data;
  assert.equal('dni' in publico, false);
  assert.equal(publico.dniEnmascarado, '**.***.222');
  const legajo = writes.find((write) => write.path.endsWith('/privado/datos'))!.data;
  assert.equal(legajo.dni, '30111222');
  const matematica = calificaciones.find((calificacion) => calificacion.espacioId === 'matematica')!;
  assert.equal(matematica.condicion, 'Equiv');
  assert.equal(matematica.notaFinal, 8);
  const log = writes.find((write) => write.path === 'logs/log1')!.data;
  assert.equal(log.uid, 'admin1');
});

test('cerrar un RAC marca ADEUDA lo que no está aprobado', () => {
  const espacio = PLANES_SEDE[0].espacios[0];
  const pendiente = calificacionDesdeEspacio(espacio, 'est1', 2026, 'A-698-CB', undefined, []);
  const aprobada = { ...pendiente, notaFinal: 8, tpi: 'APROBADO' as const, estado: 'pendiente' as const };
  const cerradas = aplicarCierre([pendiente, aprobada]);
  assert.equal(cerradas[0].estado, 'adeuda');
  assert.equal(cerradas[1].estado, 'aprobado');
});

test('el ciclo siguiente arrastra lo adeudado como previa', () => {
  const origen = PLANES_SEDE[0].espacios.map((espacio) =>
    calificacionDesdeEspacio(espacio, 'est1', 2026, 'A-698-CB', undefined, []));
  const { calificaciones, adeuda } = armarCalificacionesSiguiente(
    PLANES_SEDE[1].espacios,
    origen,
    'est1',
    2027,
    'B-1206-EyA',
  );
  const matematica = calificaciones.find((calificacion) => calificacion.espacioId === 'matematica')!;
  const economia = calificaciones.find((calificacion) => calificacion.espacioId === 'economia')!;
  assert.equal(matematica.condicion, 'Prev');
  assert.equal(economia.condicion, 'Reg');
  assert.ok(adeuda.includes('Matemática'));
});

test('el pase provisorio vence a los 60 días y la equivalencia avisa después de julio', () => {
  assert.equal(vencimientoPaseProvisorio('2026-03-01'), '2026-04-30');
  assert.equal(alertaPase({ provisorio: true, definitivo: false, vencimiento: '2026-03-01' }, '2026-04-01'), 'vencido');
  assert.equal(alertaPase({ provisorio: true, definitivo: true, vencimiento: '2026-03-01' }, '2026-04-01'), 'no-aplica');
  assert.equal(equivalenciaFueraDeTermino('2026-07-15', 2026), true);
  assert.equal(equivalenciaFueraDeTermino('2026-06-30', 2026), false);
});

test('las asignaciones docentes arman las claves que leen las reglas', () => {
  const perfil = armarDocente('Docente Ficticio', 'docente@example.com', [
    { planId: 'A-698-CB', espacioId: 'matematica', anio: 2026, compartidoM8: false },
    { planId: 'A-698-CB', espacioId: 'm8-trabajo', anio: 2026, compartidoM8: true },
  ]);
  assert.equal(perfil.espacios[claveEspacio('A-698-CB', 'matematica', 2026)], true);
  assert.equal(perfil.planesAnio['A-698-CB|2026'], true);
  assert.equal(perfil.ensenaM8, true);
});
