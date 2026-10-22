/**
 * Datos ficticios para el emulador local. No usa el proyecto real.
 * Correr con los emuladores ya levantados en demo-ceija:
 *   firebase emulators:exec --project demo-ceija --only firestore,auth "npx tsx scripts/seed-emulador.ts"
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { PLANES_SEDE } from '../src/domain/planesSede.ts';
import { cargarPlanesSede, crearCiclo, crearEstudianteConRac, guardarAsignaciones } from '../src/services/escolar.ts';

const hostFirestore = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const hostAuth = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-ceija';

function abortar(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

if (!hostFirestore.startsWith('127.0.0.1') && !hostFirestore.startsWith('localhost')) {
  abortar('FIRESTORE_EMULATOR_HOST no apunta a localhost. No se carga nada en la nube.');
}
if (!hostAuth.startsWith('127.0.0.1') && !hostAuth.startsWith('localhost')) {
  abortar('FIREBASE_AUTH_EMULATOR_HOST no apunta a localhost.');
}
if (!projectId.startsWith('demo-') || projectId.includes('ceija12resm')) {
  abortar(`Project id rechazado: ${projectId}`);
}

const clave = process.env.SEED_PASSWORD || 'solo-emulador';

async function crearCuenta(email: string): Promise<string> {
  const respuesta = await fetch(
    `http://${hostAuth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: clave, returnSecureToken: true }),
    },
  );
  const data = await respuesta.json() as { localId?: string; error?: { message?: string } };
  if (!respuesta.ok || !data.localId) {
    abortar(`No se pudo crear ${email}: ${data.error?.message ?? respuesta.status}`);
  }
  return data.localId;
}

const entorno = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: hostFirestore.split(':')[0],
    port: Number(hostFirestore.split(':')[1] || 8080),
  },
});

const adminId = await crearCuenta('admin.emulador@example.com');
const docenteId = await crearCuenta('docente.emulador@example.com');
const lecturaId = await crearCuenta('lectura.emulador@example.com');

await entorno.withSecurityRulesDisabled(async (contexto) => {
  const db = contexto.firestore();
  const base = { createdAt: new Date().toISOString(), activo: true, disabled: false };
  await setDoc(doc(db, 'users', adminId), { ...base, email: 'admin.emulador@example.com', displayName: 'Admin Emulador', role: 'admin' });
  await setDoc(doc(db, 'users', docenteId), { ...base, email: 'docente.emulador@example.com', displayName: 'Docente Emulador', role: 'docente' });
  await setDoc(doc(db, 'users', lecturaId), { ...base, email: 'lectura.emulador@example.com', displayName: 'Lectura Emulador', role: 'lectura' });
});

const admin = entorno.authenticatedContext(adminId).firestore();
await crearCiclo(admin, 2026);
await cargarPlanesSede(admin);
const alta = await crearEstudianteConRac(admin, {
  apellido: 'PRUEBA',
  nombre: 'FICTICIA',
  dni: '30111222',
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
    dniNormalizado: '30111222',
    cuil: '20-30111222-3',
    email: 'estudiante.ficticio@example.com',
    telefono: '3410000000',
    fechaNacimiento: '2000-04-12',
    paseProvisorio: true,
    paseDefinitivo: false,
    fotocopiaDni: true,
    cus: false,
    certificadoPrimaria: 'original',
    numeroEquivalencia: '',
    linkTitulo: '',
    documentacionCompleta: 'incompleta',
    observaciones: 'Registro ficticio de emulador',
  },
  equivalencias: [],
  creadoPor: adminId,
});

const espacio = PLANES_SEDE[0].espacios[0];
await guardarAsignaciones(admin, docenteId, 'Docente Emulador', 'docente.emulador@example.com', [
  { planId: PLANES_SEDE[0].id, espacioId: espacio.id, anio: 2026, compartidoM8: espacio.compartidoM8, nombreEspacio: espacio.nombre },
]);

console.log('Emulador cargado con datos ficticios.');
console.log(`Estudiante ${alta.estudianteId}, RAC ${alta.racId}`);
console.log('Correos @example.com. La contraseña solo vale en el emulador y sale de SEED_PASSWORD o del valor por defecto solo-emulador.');
