import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { armarDirectorio, armarPlanilla, armarRac, type FilaExportacion } from '../src/services/excel.ts';
import type { Calificacion } from '../src/domain/types.ts';

const DNI = '30111222';
const EMAIL = 'ficticio@example.com';

function nota(parcial: Partial<Calificacion> & Pick<Calificacion, 'espacioId' | 'nombre' | 'notaFinal' | 'estado'>): Calificacion {
  return {
    modulo: 'M1',
    tpi: '',
    notaLetras: '',
    fecha: '',
    condicion: 'Reg',
    docenteUid: '',
    actaNro: '',
    compartidoM8: false,
    orden: 1,
    m8RacIds: [],
    estudianteId: 'est1',
    anio: 2026,
    planId: 'A-698-CB',
    ...parcial,
  };
}

function fila(): FilaExportacion {
  return {
    anio: 2026,
    planNombre: 'Plan A — 1° año (Ciclo Básico)',
    resumen: {
      id: 'est1',
      apellido: 'PRUEBA',
      nombre: 'FICTICIA',
      dniEnmascarado: '**.***.222',
      planActualId: 'A-698-CB',
      estado: 'activo',
      orientacion: 'Ciclo Básico',
      cohorte: 2026,
    },
    privado: {
      dni: DNI,
      dniNormalizado: DNI,
      cuil: '20-30111222-3',
      email: EMAIL,
      telefono: '3410000000',
      fechaNacimiento: '2000-04-12',
      paseProvisorio: false,
      paseDefinitivo: false,
      fotocopiaDni: true,
      cus: false,
      certificadoPrimaria: 'original',
      numeroEquivalencia: '',
      linkTitulo: '',
      documentacionCompleta: 'incompleta',
      observaciones: '',
    },
    calificaciones: [
      nota({ espacioId: 'matematica', nombre: 'Matemática', notaFinal: 8, fecha: '03/26', estado: 'aprobado', tpi: 'APROBADO' }),
      nota({ espacioId: 'lengua', nombre: 'Lengua y Literatura', notaFinal: null, estado: 'adeuda', orden: 2 }),
    ],
  };
}

function celdas(libro: XLSX.WorkBook, hoja: string) {
  return XLSX.utils.sheet_to_json<(string | number)[]>(libro.Sheets[hoja], { header: 1 });
}

function roundtrip(libro: XLSX.WorkBook) {
  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return XLSX.read(buffer, { type: 'buffer' });
}

test('el directorio público no lleva DNI ni contacto y el sensible sí', () => {
  const publico = roundtrip(armarDirectorio([fila()], 2026, false));
  const textoPublico = JSON.stringify(celdas(publico, publico.SheetNames[0]));
  assert.equal(textoPublico.includes(DNI), false);
  assert.equal(textoPublico.includes(EMAIL), false);
  assert.equal(textoPublico.includes('**.***.222'), true);
  assert.equal(textoPublico.includes('DNI enmascarado'), true);

  const sensible = roundtrip(armarDirectorio([fila()], 2026, true));
  const textoSensible = JSON.stringify(celdas(sensible, sensible.SheetNames[0]));
  assert.equal(textoSensible.includes(DNI), true);
  assert.equal(textoSensible.includes(EMAIL), true);
  assert.equal(textoSensible.includes('CUIL'), true);
});

test('el RAC y la planilla se pueden volver a leer', () => {
  const rac = roundtrip(armarRac([fila()]));
  const hojaPlan = rac.SheetNames.find((nombre) => nombre.startsWith('Plan A'));
  assert.ok(hojaPlan);
  const texto = JSON.stringify(celdas(rac, hojaPlan));
  assert.equal(texto.includes('8 03/26'), true);
  assert.equal(texto.includes('ADEUDA'), true);
  assert.equal(texto.includes(DNI), false);

  const planilla = roundtrip(armarPlanilla([{
    apellido: 'PRUEBA',
    nombre: 'FICTICIA',
    dniEnmascarado: '**.***.222',
    nota: '8',
    tpi: 'OCHO',
    fecha: '03/26',
    condicion: 'Reg',
    estado: 'aprobado',
  }]));
  const textoPlanilla = JSON.stringify(celdas(planilla, 'Planilla'));
  assert.equal(textoPlanilla.includes('OCHO'), true);
  assert.equal(textoPlanilla.includes(DNI), false);
});
