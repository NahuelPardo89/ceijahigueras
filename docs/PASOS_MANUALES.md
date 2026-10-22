# Pasos que quedan para Nahuel

La app ya no usa las pantallas viejas (`StudentManagement`, `GradesManagement`, `SubjectManagement`, `StudyPlanManagement`, el import masivo viejo y los hooks `useStudents` / `useGrades` / `useSubjects` / `useStudyPlans` / `useEquivalences`). El modelo que se ve en la sede es el nuevo. Lo que sigue se hace en la máquina de quien administra. Un agente no despliega y no toca `ceija12resm`.

## 1. Publicar reglas y hosting juntos

El build nuevo no escribe en `students`, `grades`, `equivalences`, `subjects` ni `studyPlans`. Las reglas nuevas tampoco dejan escribir ahí: el admin solo lee.

Si se publican las reglas con el hosting viejo todavía en el aire, la pantalla vieja deja de poder guardar. Si se publica el hosting nuevo con las reglas viejas, el legado sigue abierto a escritura.

```bash
npm run build
npx firebase deploy --only firestore:rules,hosting
```

Revisá el diff de `firestore.rules` antes. El proyecto por defecto del `.firebaserc` es `ceija12resm`: este comando sí pega en producción, y por eso no lo corre un agente.

## 2. Rotar o borrar las cuentas de prueba

En Authentication del proyecto real, rotá o eliminá los usuarios de prueba viejos antes o junto con ese deploy. Las cuentas `Administrador` y `Profesor` que sean de personas reales siguen entrando: las reglas aceptan esos roles. Las cuentas nuevas usan `admin`, `docente`, `lectura` y `pendiente`.

## 3. Volver a guardar a cada docente

Las asignaciones viven en `docentes/{uid}`, no en el usuario. Entrá a Usuarios y guardá de nuevo a cada docente para que queden los espacios (`planId|espacioId|anio`). Quien enseña el M8 compartido tiene que quedar con `ensenaM8`.

## 4. Correr la migración

El detalle está en `scripts/migracion/README.md`. Resumen:

1. Backup de Firestore.
2. Unificar a mano los DNI duplicados. El script no elige solo.
3. Dry-run con `CEIJA_MIGRACION_REAL=escribo-en-produccion`, `--confirmar-proyecto ceija12resm` y `--confirmar-frase "MIGRAR CEIJA"`.
4. Si el informe cierra, la misma línea con `--escribir`.
5. El legado no se borra. El RAC migrado queda abierto. Cerrarlo es desde Ciclos, cuando corresponda con el Libro Matriz y el SGE.
6. Arte y Cultura y Deportes no se inventan. Si en el legado hay otro plan, esos estudiantes quedan "a revisar" y el admin los da de alta desde Planes.

En este repo la migración se prueba solo contra el emulador `demo-ceija`, con personas ficticias. Nadie tiene que correr el modo real desde CI.

## 5. Preview de Hosting en cada PR

No está en el workflow. Para publicar un canal de preview hace falta un secreto que este entorno no tiene:

- `FIREBASE_TOKEN` generado con `firebase login:ci` por una cuenta con acceso a `ceija12resm`, o
- un JSON de cuenta de servicio en `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_SERVICE_ACCOUNT` con rol de Firebase Hosting Admin sobre ese proyecto.

Sin eso, el CI solo corre lint, tipos, tests de dominio, tests de reglas en el emulador y el build. No despliega.

## 6. Lo que sigue fuera de este cambio

- App Check no está cableado. El plan Spark lo permite más adelante.
- Los legajos de verdad no se cargan desde el repo. Entran solo cuando Nahuel corre el paso 4.
- Cuando la comparación con el papel cierre, borrar las colecciones viejas es una decisión aparte. Las reglas de hoy no dejan hacerlo desde la app ni desde el script.
