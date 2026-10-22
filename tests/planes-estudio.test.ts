import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AREAS_SUGERIDAS,
  claveArea,
  codigoMateriaValido,
  copiaParaCalificacion,
  idCalificacionDeMateria,
  materiasActivas,
  puedeAbrirRacEnNivel,
  puedeEliminarContenedor,
  puedeEliminarPorUso,
  prepararMateria,
  prepararNivel,
  prepararPlanEstudio,
  resolverArea,
  type MateriaEstudio,
} from '../src/domain/planesEstudio.ts';

function materia(parcial: Partial<MateriaEstudio> = {}): MateriaEstudio {
  return {
    id: 'mat-1',
    nombre: 'Matemática de prueba',
    orden: 1,
    area: 'matematica',
    areaNombre: 'Matemática',
    codigo: '1.3',
    comparteEntreNiveles: false,
    activo: true,
    enUso: false,
    ...parcial,
  };
}

test('el alta del plan exige resolución, orientación y validez nacional', () => {
  assert.equal(prepararPlanEstudio({
    orientacion: 'Orientación de prueba',
    resolucion: 'Resolución de prueba',
    validezNacional: 'Validez de prueba',
  }).ok, true);
  assert.equal(prepararPlanEstudio({ orientacion: '  ', resolucion: 'R', validezNacional: 'V' }).ok, false);
  assert.equal(prepararPlanEstudio({ orientacion: 'O', resolucion: '', validezNacional: 'V' }).ok, false);
  assert.equal(prepararPlanEstudio({ orientacion: 'O', resolucion: 'R', validezNacional: '' }).ok, false);
});

test('un plan recién validado no trae niveles ni materias', () => {
  const preparado = prepararPlanEstudio({
    orientacion: 'Orientación de prueba',
    resolucion: 'Resolución de prueba',
    validezNacional: 'Validez de prueba',
  });
  assert.equal(preparado.ok, true);
  if (!preparado.ok) return;
  assert.deepEqual(Object.keys(preparado.datos).sort(), ['orientacion', 'resolucion', 'validezNacional']);
});

test('el dominio no devuelve la semilla de planesSede', () => {
  const fuente = readFileSync(new URL('../src/domain/planesEstudio.ts', import.meta.url), 'utf8');
  assert.equal(fuente.includes('planesSede'), false);
  assert.equal(fuente.includes('PLANES_SEDE'), false);
  assert.equal(fuente.includes('cargarPlanesSede'), false);
});

test('el nivel pide código, año y nombre, y no se inventa A, B y C', () => {
  assert.equal(prepararNivel({ codigo: '', anioCurso: 1, nombre: '1° año', orden: 1 }).ok, false);
  const listo = prepararNivel({ codigo: 'A', anioCurso: 1, nombre: '1° año', orden: 1 });
  assert.equal(listo.ok, true);
  if (listo.ok) assert.equal(listo.datos.codigo, 'A');
  assert.equal(prepararNivel({ codigo: 'B', anioCurso: 2, nombre: '2° año', orden: 2 }).ok, true);
  assert.equal(prepararNivel({ codigo: 'C', anioCurso: 3, nombre: '3° año', orden: 3 }).ok, true);
  assert.equal(prepararNivel({ codigo: 'D', anioCurso: 4, nombre: 'Otro', orden: 4 }).ok, true);
  assert.equal(prepararNivel({ codigo: 'A', anioCurso: 0, nombre: '1° año', orden: 1 }).ok, false);
});

test('las áreas sugeridas son las de la sede y se puede escribir otra', () => {
  assert.deepEqual(AREAS_SUGERIDAS.map((area) => area.clave), [
    'matematica', 'naturales', 'sociales', 'ingles', 'lengua', 'atp',
  ]);
  assert.equal(claveArea('Matemática'), 'matematica');
  assert.equal(claveArea('ATP'), 'atp');
  assert.equal(claveArea('Educación Física'), 'educacion-fisica');
  assert.equal(claveArea('   '), null);
  const otra = resolverArea('__otra', 'Educación Física', AREAS_SUGERIDAS);
  assert.deepEqual(otra, { area: 'educacion-fisica', areaNombre: 'Educación Física' });
  const sugerida = resolverArea('lengua', '', AREAS_SUGERIDAS);
  assert.deepEqual(sugerida, { area: 'lengua', areaNombre: 'Lengua' });
});

test('la materia exige área y el código es opcional con forma n.m', () => {
  assert.equal(codigoMateriaValido(''), true);
  assert.equal(codigoMateriaValido('1.3'), true);
  assert.equal(codigoMateriaValido('9.12'), true);
  assert.equal(codigoMateriaValido('1'), false);
  assert.equal(codigoMateriaValido('modulo.1'), false);
  const sinArea = prepararMateria({
    nombre: 'Sin área',
    orden: 1,
    area: '',
    areaNombre: '',
    codigo: '',
    comparteEntreNiveles: false,
    activo: true,
  });
  assert.equal(sinArea.ok, false);
  const conCodigo = prepararMateria({
    nombre: 'Matemática de prueba',
    orden: 3,
    area: 'matematica',
    areaNombre: 'Matemática',
    codigo: '1.3',
    comparteEntreNiveles: false,
    activo: true,
  });
  assert.equal(conCodigo.ok, true);
  if (conCodigo.ok) {
    assert.equal(conCodigo.datos.comparteEntreNiveles, false);
    assert.equal(conCodigo.datos.codigo, '1.3');
  }
  const compartida = prepararMateria({
    nombre: 'Taller de prueba',
    orden: 1,
    area: 'atp',
    areaNombre: 'ATP',
    codigo: '8.1',
    comparteEntreNiveles: true,
    activo: true,
  });
  assert.equal(compartida.ok, true);
});

test('un nivel sin materias activas no abre RAC', () => {
  assert.equal(puedeAbrirRacEnNivel([]), false);
  assert.equal(puedeAbrirRacEnNivel([materia({ activo: false })]), false);
  assert.equal(puedeAbrirRacEnNivel([materia()]), true);
  assert.deepEqual(materiasActivas([
    materia({ id: 'b', orden: 2, nombre: 'Lengua de prueba' }),
    materia({ id: 'a', orden: 1, activo: false }),
    materia({ id: 'c', orden: 1, nombre: 'Otra' }),
  ]).map((item) => item.id), ['c', 'b']);
});

test('la materia en uso no se borra, y el id de la calificación no cambia al renombrar', () => {
  assert.equal(puedeEliminarPorUso(false), true);
  assert.equal(puedeEliminarPorUso(true), false);
  assert.equal(puedeEliminarContenedor(false, [{ enUso: false }]), true);
  assert.equal(puedeEliminarContenedor(false, [{ enUso: true }]), false);
  assert.equal(puedeEliminarContenedor(true, []), false);

  const original = materia({ id: 'opaque-1', nombre: 'Matemática de prueba' });
  const copia = copiaParaCalificacion(original, 'Módulo 1');
  const renombrada = { ...original, nombre: 'Matemática avanzada' };
  const segunda = copiaParaCalificacion(renombrada, 'Módulo 1');
  assert.equal(idCalificacionDeMateria(original.id), 'opaque-1');
  assert.equal(copia.materiaId, 'opaque-1');
  assert.equal(copia.espacioId, 'opaque-1');
  assert.equal(segunda.materiaId, copia.materiaId);
  assert.equal(copia.nombre, 'Matemática de prueba');
  assert.equal(segunda.nombre, 'Matemática avanzada');
  assert.equal(copia.codigo, '1.3');
  assert.equal(copia.area, 'matematica');
  assert.equal(copia.compartidoM8, false);
});
