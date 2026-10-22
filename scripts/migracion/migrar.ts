/**
 * Migra students / grades / equivalences / subjects / studyPlans al modelo nuevo.
 * Dry-run por defecto. No borra el legado.
 *
 * Emulador:
 *   firebase emulators:exec --project demo-ceija --only firestore \
 *     "npx tsx scripts/migracion/migrar.ts --emulador --anio 2026"
 *   firebase emulators:exec --project demo-ceija --only firestore \
 *     "npx tsx scripts/migracion/migrar.ts --emulador --anio 2026 --escribir"
 *
 * El proyecto real solo se toca con las tres confirmaciones documentadas en
 * docs/PASOS_MANUALES.md. Este archivo no trae credenciales.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  evaluarDestino,
  parsearArgs,
  PROYECTO_REAL,
  type ArgsMigracion,
} from '../../src/domain/migracion.ts';
import { ejecutarMigracion, type InformeMigracion } from '../../src/services/migracion.ts';

const AYUDA = `Migración CEIJA Las Higueras. Pasa el legado al modelo nuevo. No borra nada.

  --emulador                         obligatorio para el emulador local (demo-)
  --anio <aaaa>                      ciclo del RAC, por ejemplo 2026
  --dry-run                          lee y cuenta. Es el comportamiento por defecto.
  --escribir                         escribe. Sin esta marca no hay escrituras.
  --confirmar-proyecto ceija12resm   solo para el proyecto real, junto con la frase
  --confirmar-frase "MIGRAR CEIJA"   y CEIJA_MIGRACION_REAL=escribo-en-produccion
  --ayuda

Las credenciales van en variables de entorno, nunca en la línea de comandos
ni en el repositorio: CEIJA_FIREBASE_API_KEY, CEIJA_FIREBASE_AUTH_DOMAIN,
CEIJA_FIREBASE_APP_ID, CEIJA_ADMIN_EMAIL, CEIJA_ADMIN_PASSWORD.
`;

function abortar(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

function imprimir(informe: InformeMigracion) {
  console.log(informe.dryRun ? 'Dry-run. No se escribió nada.' : 'Ejecución con escritura. El legado no se borra.');
  console.log(`Ciclo: ${informe.anio}`);
  console.log(`Legajos leídos: ${informe.leidos}`);
  console.log(`Para crear: ${informe.aCrear}`);
  console.log(`Creados: ${informe.creados}`);
  console.log(`Ya existían: ${informe.yaExistian}`);
  console.log(`Notas previstas: ${informe.notasPrevistas}`);
  console.log(`Notas aplicadas: ${informe.notasAplicadas}`);
  console.log(`A revisar (no se tocaron): ${informe.revisar}`);
  console.log(`Errores: ${informe.errores}`);
  for (const aviso of informe.avisos) console.log(`Aviso: ${aviso}`);
  for (const fila of informe.detalle) {
    const motivos = fila.motivos.length > 0 ? ` — ${fila.motivos.join(' ')}` : '';
    console.log(`- ${fila.decision} ${fila.apellido}, ${fila.nombre} (${fila.dniEnmascarado})${motivos}`);
  }
  console.log('El informe no muestra DNI completo, CUIL, mail ni teléfono.');
}

async function entornoEmulador(projectId: string) {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '';
  const [nombreHost, puerto] = host.split(':');
  return initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
      host: nombreHost,
      port: Number(puerto || 8080),
    },
  });
}

async function correrEnEmulador(projectId: string, anio: number, escribir: boolean): Promise<InformeMigracion> {
  const entorno = await entornoEmulador(projectId);
  try {
    const caja: { informe?: InformeMigracion } = {};
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      caja.informe = await ejecutarMigracion(contexto.firestore() as unknown as Firestore, {
        escribir: false,
        anio,
        creadoPor: 'migracion',
      });
    });
    const previo = caja.informe;
    if (!previo) abortar('No se pudo leer el emulador.');
    if (!escribir || (previo.aCrear === 0 && previo.yaExistian === 0)) {
      return { ...previo, dryRun: !escribir };
    }
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      await setDoc(doc(contexto.firestore(), 'users', 'migracion'), {
        email: 'migracion@example.com',
        displayName: 'Migración local',
        role: 'admin',
        createdAt: new Date().toISOString(),
        activo: true,
        disabled: false,
      });
    });
    // @firebase/rules-unit-testing trae su propia copia del cliente. En runtime es el mismo SDK.
    const db = entorno.authenticatedContext('migracion').firestore() as unknown as Firestore;
    return await ejecutarMigracion(db, { escribir: true, anio, creadoPor: 'migracion' });
  } finally {
    await entorno.cleanup();
  }
}

async function conectarProduccion(): Promise<{ db: Firestore; uid: string }> {
  const apiKey = process.env.CEIJA_FIREBASE_API_KEY ?? '';
  const authDomain = process.env.CEIJA_FIREBASE_AUTH_DOMAIN ?? '';
  const appId = process.env.CEIJA_FIREBASE_APP_ID ?? '';
  const email = process.env.CEIJA_ADMIN_EMAIL ?? '';
  const password = process.env.CEIJA_ADMIN_PASSWORD ?? '';
  if (!apiKey || !authDomain || !appId || !email || !password) {
    abortar('Faltan CEIJA_FIREBASE_API_KEY, CEIJA_FIREBASE_AUTH_DOMAIN, CEIJA_FIREBASE_APP_ID, CEIJA_ADMIN_EMAIL y CEIJA_ADMIN_PASSWORD en el entorno.');
  }
  const app = initializeApp({
    apiKey,
    authDomain,
    projectId: PROYECTO_REAL,
    appId,
  }, 'migracion-real');
  const credencial = await signInWithEmailAndPassword(getAuth(app), email, password);
  return { db: getFirestore(app), uid: credencial.user.uid };
}

export async function main(argv: string[], env: NodeJS.ProcessEnv = process.env) {
  let args: ArgsMigracion;
  try {
    args = parsearArgs(argv);
  } catch (error) {
    abortar(error instanceof Error ? error.message : 'Argumentos inválidos');
  }
  if (args.ayuda || argv.length === 0) {
    console.log(AYUDA);
    return;
  }
  const destino = evaluarDestino(env, args);
  if (!destino.ok) abortar(destino.motivo);

  if (destino.modo === 'produccion') {
    console.log(destino.escribir
      ? 'Conectando al proyecto real para escribir. No se borra el legado.'
      : 'Conectando al proyecto real en dry-run. No se escribe.');
    const conexion = await conectarProduccion();
    const db = conexion.db;
    const informe = await ejecutarMigracion(db, {
      escribir: destino.escribir,
      anio: destino.anio,
      creadoPor: conexion.uid,
    });
    imprimir(informe);
    if (informe.errores > 0) process.exitCode = 1;
    return;
  }

  const informe = await correrEnEmulador(destino.projectId, destino.anio, destino.escribir);
  imprimir(informe);
  if (informe.errores > 0) process.exitCode = 1;
}

function fueInvocado(): boolean {
  const entrada = process.argv[1];
  if (!entrada) return false;
  return import.meta.url === pathToFileURL(entrada).href;
}

if (fueInvocado()) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    const mensaje = error instanceof Error ? error.message : 'Falló la migración';
    console.error(mensaje);
    process.exit(1);
  });
}
