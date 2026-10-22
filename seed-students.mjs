// Este script ya no carga estudiantes en el proyecto real.
// Antes pegaba a Firestore de producción y traía una contraseña en el código.
// Para datos ficticios usá el emulador:
//   firebase emulators:exec --project demo-ceija --only firestore,auth "npx tsx scripts/seed-emulador.ts"
// La migración está en scripts/migracion/migrar.ts. Contra la nube la corre Nahuel, con las confirmaciones de docs/PASOS_MANUALES.md.

console.error('seed-students.mjs está desactivado: no escribe en el proyecto Firebase real.');
console.error('Usá el emulador con scripts/seed-emulador.ts y datos ficticios.');
process.exit(1);
