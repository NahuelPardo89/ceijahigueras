import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asignaturasActivas,
  codigoMateriaValido,
  idAsignatura,
  puedeAbrirRacEnAnio,
  puedeEliminarContenedor,
  puedeEliminarPorUso,
  prepararAnio,
  prepararAsignatura,
  prepararPlanEstudio,
  type AsignaturaEstudio,
} from '../src/domain/planesEstudio.ts';

function asignatura(parcial: Partial<AsignaturaEstudio> = {}): AsignaturaEstudio {
  return {
    id: 'asig-1',
    nombre: 'Matemática de prueba',
    orden: 1,
    codigo: '1.3',
    activo: true,
    enUso: false,
    ...parcial,
  };
}

const planCompleto = {
  nombre: 'Plan de prueba',
  orientacion: 'Orientación de prueba',
  resolucion: 'Resolución de prueba',
  validezNacional: 'Validez de prueba',
};

test('el alta del plan exige nombre, orientación, resolución y validez nacional', () => {
  assert.equal(prepararPlanEstudio(planCompleto).ok, true);
  assert.equal(prepararPlanEstudio({ ...planCompleto, nombre: '  ' }).ok, false);
  assert.equal(prepararPlanEstudio({ ...planCompleto, orientacion: '' }).ok, false);
  assert.equal(prepararPlanEstudio({ ...planCompleto, resolucion: '' }).ok, false);
  assert.equal(prepararPlanEstudio({ ...planCompleto, validezNacional: '' }).ok, false);
});

test('un plan recién validado no trae años ni asignaturas, y el nombre viaja con la orientación', () => {
  const preparado = prepararPlanEstudio(planCompleto);
  assert.equal(preparado.ok, true);
  if (!preparado.ok) return;
  assert.deepEqual(Object.keys(preparado.datos).sort(), ['nombre', 'orientacion', 'resolucion', 'validezNacional']);
  assert.equal(preparado.datos.nombre, 'Plan de prueba');
  assert.equal(preparado.datos.orientacion, 'Orientación de prueba');
  assert.notEqual(preparado.datos.nombre, preparado.datos.orientacion);
});

test('el dominio no devuelve la semilla de planesSede ni un catálogo de áreas', () => {
  const fuente = readFileSync(new URL('../src/domain/planesEstudio.ts', import.meta.url), 'utf8');
  assert.equal(fuente.includes('planesSede'), false);
  assert.equal(fuente.includes('PLANES_SEDE'), false);
  assert.equal(fuente.includes('cargarPlanesSede'), false);
  assert.equal(fuente.includes('AREAS_SUGERIDAS'), false);
});

test('el plan o año pide nombre y orden, sin código ni año numérico', () => {
  assert.equal(prepararAnio({ nombre: '', orden: 1 }).ok, false);
  const listo = prepararAnio({ nombre: 'Plan A', orden: 1 });
  assert.equal(listo.ok, true);
  if (listo.ok) {
    assert.equal(listo.datos.nombre, 'Plan A');
    assert.equal(listo.datos.orden, 1);
    assert.equal('codigo' in listo.datos, false);
    assert.equal('anioCurso' in listo.datos, false);
  }
  assert.equal(prepararAnio({ nombre: '1° año', orden: 2 }).ok, true);
  assert.equal(prepararAnio({ nombre: 'Plan A', orden: 0 }).ok, false);
});

test('la asignatura no pide un área aparte y el código es opcional con forma n.m', () => {
  assert.equal(codigoMateriaValido(''), true);
  assert.equal(codigoMateriaValido('1.3'), true);
  assert.equal(codigoMateriaValido('9.12'), true);
  assert.equal(codigoMateriaValido('1'), false);
  assert.equal(codigoMateriaValido('modulo.1'), false);
  const sinNombre = prepararAsignatura({ nombre: '  ', orden: 1, codigo: '', activo: true });
  assert.equal(sinNombre.ok, false);
  const libre = prepararAsignatura({
    nombre: 'Educación Física de prueba',
    orden: 3,
    codigo: '',
    activo: true,
  });
  assert.equal(libre.ok, true);
  if (libre.ok) {
    assert.equal(libre.datos.codigo, '');
    assert.equal('area' in libre.datos, false);
  }
  const conCodigo = prepararAsignatura({
    nombre: 'Matemática de prueba',
    orden: 1,
    codigo: '1.3',
    activo: true,
  });
  assert.equal(conCodigo.ok, true);
  if (conCodigo.ok) assert.equal(conCodigo.datos.codigo, '1.3');
});

test('un plan o año sin asignaturas activas no abre RAC', () => {
  assert.equal(puedeAbrirRacEnAnio([]), false);
  assert.equal(puedeAbrirRacEnAnio([asignatura({ activo: false })]), false);
  assert.equal(puedeAbrirRacEnAnio([asignatura()]), true);
  assert.deepEqual(asignaturasActivas([
    asignatura({ id: 'b', orden: 2, nombre: 'Lengua de prueba' }),
    asignatura({ id: 'a', orden: 1, activo: false }),
    asignatura({ id: 'c', orden: 1, nombre: 'Otra' }),
  ]).map((item) => item.id), ['c', 'b']);
});

test('la asignatura en uso no se borra, y el id no cambia al renombrar', () => {
  assert.equal(puedeEliminarPorUso(false), true);
  assert.equal(puedeEliminarPorUso(true), false);
  assert.equal(puedeEliminarContenedor(false, [{ enUso: false }]), true);
  assert.equal(puedeEliminarContenedor(false, [{ enUso: true }]), false);
  assert.equal(puedeEliminarContenedor(true, []), false);

  const original = asignatura({ id: 'opaque-1', nombre: 'Matemática de prueba' });
  const renombrada = { ...original, nombre: 'Matemática aplicada de prueba' };
  assert.equal(idAsignatura(original.id), 'opaque-1');
  assert.equal(idAsignatura(renombrada.id), idAsignatura(original.id));
  assert.notEqual(renombrada.nombre, original.nombre);
});
