// Seed script: delete all students and create 20 new ones
// Usage: node seed-students.mjs
import { readFileSync } from 'fs';

function loadEnv() {
  const path = '.env.local';
  const env = {};
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {}
  return env;
}

const env = loadEnv();
const API_KEY = env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('Error: VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID must be set in .env.local');
  process.exit(1);
}

const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ADMIN_EMAIL = 'admin@ceija.com';
const ADMIN_PASS = 'Admin123!';

async function signIn() {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth error: ${JSON.stringify(data)}`);
  return data.idToken;
}

async function deleteAllStudents(token) {
  const url = `${FIRESTORE_URL}/students`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok && res.status !== 404) throw new Error(`List error: ${JSON.stringify(data)}`);

  const docs = data.documents || [];
  console.log(`Found ${docs.length} students`);

  for (const doc of docs) {
    const name = doc.name;
    const id = name.split('/').pop();
    const delRes = await fetch(`${FIRESTORE_URL}/students/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (delRes.ok) console.log(`Deleted ${id}`);
    else console.error(`Failed to delete ${id}: ${await delRes.text()}`);
  }
  console.log(`Deleted ${docs.length} students`);
}

const PLAN_IDS = ['Qud6PkF80xPzUa2tGF09', 'HguIVrDBfPyiWRYVk2Vg'];

function studentData(i) {
  const apellidos = [
    'GARCÍA', 'RODRÍGUEZ', 'MARTÍNEZ', 'LÓPEZ', 'GONZÁLEZ',
    'PÉREZ', 'SÁNCHEZ', 'RAMÍREZ', 'TORRES', 'DÍAZ',
    'FERNÁNDEZ', 'ÁLVAREZ', 'ROMERO', 'CASTRO', 'MEDINA',
    'SILVA', 'ORTEGA', 'VARGAS', 'HERRERA', 'CAMPOS',
  ];
  const nombres = [
    'JUAN', 'MARÍA', 'CARLOS', 'ANA', 'LUIS',
    'LAURA', 'PEDRO', 'SOFÍA', 'ANDRÉS', 'VALENTINA',
    'JOSÉ', 'CAMILA', 'MIGUEL', 'ISABELLA', 'JAVIER',
    'LUCIANA', 'DIEGO', 'ABRIL', 'FERNANDO', 'MARTINA',
  ];
  const apellido = apellidos[i];
  const nombre = nombres[i];
  const dniNum = 40000000 + i;
  const cuilNum = `20${dniNum}${i % 2 === 0 ? '4' : '5'}`;
  const year = 1995 + Math.floor(i / 4);
  const month = String((i % 12) + 1).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');
  const planInicial = `PLAN ${2018 + Math.floor(i / 5)}-${2023 + Math.floor(i / 5)}`;
  const plans = ['Plan A', 'Plan B', 'Plan C'];
  const gestiones = ['sin cargar', 'cargado', 'pase solicitado', 'invalido'];

  return {
    fields: {
      apellido: { stringValue: apellido },
      nombre: { stringValue: nombre },
      dni: { stringValue: String(dniNum) },
      cuil: { stringValue: cuilNum },
      email: { stringValue: `estudiante${i + 1}@correo.com` },
      telefono: { stringValue: `341${String(1000000 + i).slice(1)}` },
      fechaNacimiento: { stringValue: `${year}-${month}-${day}` },
      estado: { stringValue: i === 0 ? 'inactivo' : (i % 5 === 0 ? 'inactivo' : 'activo') },
      planInicial: { stringValue: planInicial },
      planActual: { stringValue: plans[i % 3] },
      cursado: { stringValue: i % 4 === 0 ? 'virtual' : 'presencial' },
      gestion: { stringValue: gestiones[i % 4] },
      planId: { stringValue: PLAN_IDS[i % 2] },
      paseProvisorio: { booleanValue: i % 3 === 0 },
      paseDefinitivo: { booleanValue: i % 5 === 0 },
      fotocopiaDni: { booleanValue: true },
      cus: { booleanValue: i % 2 === 0 },
      certificadoPrimaria: { stringValue: ['original', 'constancia correcta', 'no corresponde', 'constancia incorrecta'][i % 4] },
      numeroEquivalencia: { stringValue: i % 2 === 0 ? `EQ-${2023}-${100 + i}` : '' },
      linkTitulo: { stringValue: i % 3 === 0 ? `https://ejemplo.com/titulo/${i + 1}` : '' },
      documentacionCompleta: { stringValue: i % 2 === 0 ? 'completa' : 'incompleta' },
      observaciones: { stringValue: i === 0 ? 'Estudiante inactivo por pase solicitado.' : '' },
      createdAt: { stringValue: new Date().toISOString() },
      createdBy: { stringValue: 'CneOr6FERiYmLOuhYD3gb9zvDFC3' },
    },
  };
}

async function createStudents(token) {
  for (let i = 0; i < 20; i++) {
    const url = `${FIRESTORE_URL}/students?documentId=student-${i + 1}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData(i)),
    });
    if (res.ok) console.log(`Created student ${i + 1}/${20}`);
    else console.error(`Failed to create student ${i + 1}: ${await res.text()}`);
  }
}

async function main() {
  console.log('Signing in...');
  const token = await signIn();
  console.log('Authenticated');

  console.log('Deleting all students...');
  await deleteAllStudents(token);

  console.log('Creating 20 students...');
  await createStudents(token);

  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
