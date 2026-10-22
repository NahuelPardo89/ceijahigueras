#!/usr/bin/env node
/**
 * Esqueleto de migración de LEGAJOS / RAC. No migra datos reales.
 *
 * Pasos que este archivo deja preparados y que una persona tiene que cerrar
 * antes de cualquier carga:
 * 1. Normalizar DNI, nombres y fechas.
 * 2. Unificar duplicados (un estudiante por DNI) con revisión humana.
 * 3. Reconstruir el RAC sin fórmulas #REF!, por posición de bloque.
 * 4. Escribir en lotes de como máximo 400 operaciones, solo en el emulador
 *    mientras se prueba. La escritura al proyecto real no está implementada.
 *
 * Uso de ensayo:
 *   node scripts/migracion/migrar.mjs --emulador --dry-run --csv archivo.csv
 */

import { readFileSync } from 'node:fs';

const args = new Map();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith('--')) continue;
  const clave = token.slice(2);
  const valor = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  args.set(clave, valor);
}

if (args.has('ayuda') || args.size === 0) {
  console.log(`Migración CEIJA Las Higueras (esqueleto, sin datos personales).

  --emulador          obligatorio. Rechaza cualquier destino que no sea el emulador.
  --dry-run           lee un CSV local y muestra conteos. No escribe.
  --csv <ruta>        CSV con encabezado. No se incluye ningún CSV en el repo.
  --ayuda             esta ayuda.

No hay modo de escritura. No acepta credenciales ni project id de producción.`);
  process.exit(0);
}

function abortar(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

const host = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || '';

if (!args.has('emulador')) {
  abortar('Falta --emulador. Este script no se conecta al proyecto real.');
}
if (!host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
  abortar('FIRESTORE_EMULATOR_HOST tiene que apuntar a localhost. No se escribe en la nube.');
}
if (projectId && !projectId.startsWith('demo-')) {
  abortar(`Project id "${projectId}" no es un proyecto demo. Abortado.`);
}
if (projectId.includes('ceija12resm')) {
  abortar('Project id del sistema en producción. Abortado.');
}
if (!args.has('dry-run')) {
  abortar('La escritura no está implementada. Usá --dry-run para contar un CSV limpio.');
}

const ruta = args.get('csv');
if (!ruta || ruta === 'true') {
  abortar('Pasá --csv con un archivo local ya revisado. El repo no trae legajos.');
}

const texto = readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
const lineas = texto.split(/\r?\n/).filter((linea) => linea.trim().length > 0);
if (lineas.length < 2) abortar('El CSV no tiene filas de datos.');

const encabezado = lineas[0].split(',').map((columna) => columna.trim().toLowerCase());
const indiceDni = encabezado.findIndex((columna) => columna === 'dni' || columna === 'documento');
if (indiceDni < 0) abortar('El CSV necesita una columna dni.');

const porDni = new Map();
for (const linea of lineas.slice(1)) {
  const columnas = linea.split(',');
  const dni = (columnas[indiceDni] ?? '').replace(/\D/g, '');
  if (!dni) continue;
  const grupo = porDni.get(dni) ?? [];
  grupo.push(linea);
  porDni.set(dni, grupo);
}

const duplicados = [...porDni.entries()].filter(([, grupo]) => grupo.length > 1);
console.log(`Filas de datos: ${lineas.length - 1}`);
console.log(`DNI distintos: ${porDni.size}`);
console.log(`DNI repetidos: ${duplicados.length}`);
console.log('Dry-run terminado. No se escribió nada.');
console.log('Lotes previstos si más adelante se implementa la carga: grupos de hasta 400 escrituras.');
