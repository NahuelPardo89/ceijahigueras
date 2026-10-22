# Migración del legado al modelo nuevo

Pasa `students`, `grades`, `equivalences`, `subjects` y `studyPlans` a `estudiantes`, `privado`, `dniIndex`, `rac` y `calificaciones`.

No borra el legado. No trae legajos reales ni credenciales. El default es **dry-run**: cuenta y lista lo que haría, sin escribir.

Un DNI repetido, un DNI inválido o un plan que no es A, B o C queda en "a revisar" y no se toca. Si el DNI ya está en `dniIndex`, no se crea otro estudiante; solo se completan notas que todavía están vacías. Correrlo dos veces no duplica.

El RAC queda **abierto**. Cerrarlo es un paso aparte, desde Ciclos, cuando el papel y el SGE cierren.

## Ensayo en el emulador (demo-ceija)

Hace falta tener datos ficticios en las colecciones viejas. El test `tests/migracion-emulador.test.ts` los siembra solo. Para probar el comando a mano, primero cargá ese legado en el emulador (nunca en `ceija12resm`).

```bash
firebase emulators:exec --project demo-ceija --only firestore \
  "npx tsx scripts/migracion/migrar.ts --emulador --anio 2026"

firebase emulators:exec --project demo-ceija --only firestore \
  "npx tsx scripts/migracion/migrar.ts --emulador --anio 2026 --escribir"
```

Sin `FIRESTORE_EMULATOR_HOST` en localhost, sin `--emulador`, o con un project id que no empiece con `demo-`, el script corta. Si el entorno apunta a `ceija12resm` y a la vez al emulador, también corta.

En el emulador, el dry-run no escribe nada. `--escribir` crea un admin técnico `users/migracion` (mail `migracion@example.com`, solo en el emulador) únicamente si hay legajos para copiar o completar, y después escribe con las reglas. Si no hay nada que hacer, no crea ese usuario. En el proyecto real no existe ese usuario: entra la cuenta admin de Nahuel.

El informe muestra apellido, nombre y DNI enmascarado. No imprime DNI completo, CUIL, mail ni teléfono.

## Cómo lo corre Nahuel contra el proyecto real

Eso no se corre desde un agente ni desde CI. En la máquina de quien administra, con una cuenta `admin` ya creada:

1. Hacé una copia de seguridad de Firestore (export o backup de la consola) antes de escribir.
2. Revisá a mano los DNI duplicados. El script no elige un ganador.
3. Dry-run, y leé la lista "a revisar":

```bash
export CEIJA_MIGRACION_REAL=escribo-en-produccion
export CEIJA_FIREBASE_API_KEY="..."
export CEIJA_FIREBASE_AUTH_DOMAIN="..."
export CEIJA_FIREBASE_APP_ID="..."
export CEIJA_ADMIN_EMAIL="..."
export CEIJA_ADMIN_PASSWORD="..."

npx tsx scripts/migracion/migrar.ts \
  --anio 2026 \
  --confirmar-proyecto ceija12resm \
  --confirmar-frase "MIGRAR CEIJA"
```

4. Recién cuando el dry-run cierre, la misma línea más `--escribir`.

Esas variables van en el entorno de esa terminal. No van al repo, no van en la línea de comandos de un alias compartido y no se commitean. El script entra con el mail y la contraseña del admin y escribe con las reglas: puede leer el legado y crear el modelo nuevo, y no puede borrar `students`.

Si `FIRESTORE_EMULATOR_HOST` está definido, el modo real se niega. No mezcles las dos cosas.

Después de escribir, el legado sigue ahí para comparar. Borrarlo es una decisión posterior, fuera de este script.
