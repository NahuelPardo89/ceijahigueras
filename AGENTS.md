# CEIJA Higueras — Project Summary

## Overview
School management system for CEIJA N°12 Remedios Escalada de San Martín, sede Las Higueras (CUE 140512501, Combinada en Línea). React 19 + TypeScript + Vite, Firebase Auth + Firestore + Hosting. No Cloud Functions and no Cloud Storage: the free Spark plan is the target. The app is an internal tool. The official records remain the paper Libro Matriz and the SGE.

**URL:** https://ceija12resm.web.app

## Tech stack
- Frontend: React 19, TypeScript, Vite 8, custom CSS, lucide-react
- Backend: Firebase Auth, Firestore. Business rules live in the client and in `firestore.rules`
- Excel: SheetJS community `0.20.3`, instalado desde el tarball oficial del CDN (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`). Do not install the npm package `xlsx@0.18.5`.
- Local checks: Firestore emulator + `@firebase/rules-unit-testing`

## Roles
Stored on `users/{uid}.role`. Legacy values still work in the rules so existing accounts are not locked out the moment rules are deployed.

| Stored value | Meaning |
|---|---|
| `admin` or `Administrador` | Full access, including the private legajo |
| `docente` or `Profesor` | Grades only on assigned espacios, open RAC |
| `lectura` | Directory, RAC, equivalencias and pases, without sensitive columns |
| `pendiente` | Signed in, no student data |

Self-registration (email or Google) always creates `pendiente`. Only an admin can change a role. A person cannot change their own role, `disabled`, or `activo`.

Teacher assignments live in `docentes/{uid}`, not on the user document. Keys look like `planId|espacioId|anio`. Shared M8 (`compartidoM8`) can be replicated by a teacher marked `ensenaM8`.

## Firestore model
| Path | What it holds |
|---|---|
| `config/institucion` | Name, CUE, sede |
| `ciclos/{anio}` | `abierto` or `cerrado` |
| `planesEstudio/{planId}` | Admin-built plan: resolución, orientación, validez nacional. Starts empty |
| `planesEstudio/{planId}/niveles/{nivelId}` | Level the admin names (A = 1°, B = 2°, C = 3°, or another code) |
| `planesEstudio/.../modulos/{moduloId}` | Module inside a level |
| `planesEstudio/.../materias/{materiaId}` | Subject. Opaque id, area, optional code `n.m`. This id is what a grade row should keep |
| `planes/{planId}` | Older plan still read by RAC and the teacher sheet. The new screen does not seed it |
| `planes/{planId}/espacios/{espacioId}` | Older space. Existing grade rows still use this id |
| `estudiantes/{id}` | Name, masked DNI, plan, status. No full DNI or contact |
| `estudiantes/{id}/privado/datos` | DNI, CUIL, contact, birth date, documentation. Admin only |
| `dniIndex/{dni}` | One student per DNI. Create fails if it already exists |
| `resumenes/estudiantes_{anio}` | Compact directory, one read |
| `indices/{anio}_{planId}_{espacioId}` | Teacher sheet: name and masked DNI |
| `rac/{estudianteId}_{anio}_{planId}` | One RAC. `abierto` or `cerrado` |
| `rac/{racId}/calificaciones/{espacioId}` | Grade row: TPI, nota 1–10 step 0.50, letters, fecha mm/aa, condición |
| `equivalencias/{id}` | Admin writes. Lectura can read. Applying one sets the RAC row to `Equiv` |
| `pases/{id}` | Provisional pass expires 60 days after the date |
| `logs/{id}` | Create only, and `uid` must be the signed-in user |

`crearEstudianteConRac()` writes the DNI index, the public student, the private legajo, the RAC, one grade per space, the log, the summary and the per-space indexes in a single batch.

Closing a RAC marks anything not approved as `adeuda` and makes grades read-only. "Generar RAC del ciclo siguiente" opens a RAC on the destination plan and carries failed spaces as `Prev`.

Planes de Estudio starts empty. An admin types resolución, orientación and validez nacional, then levels, modules and subjects. `src/domain/planesSede.ts` is not a seed for that screen. It still feeds the older `planes` collection used by the RAC, the teacher sheet and the local emulator seed, so existing grade rows keep their id.

## Legacy collections
`students`, `grades`, `equivalences`, `subjects` and `studyPlans` are admin **read-only**. Nobody can create, update or delete them from the client. The app no longer ships the old screens or hooks (`StudentManagement`, `GradesManagement`, `SubjectManagement`, `StudyPlanManagement`, `BulkImportModal`, `useStudents`, `useGrades`, `useSubjects`, `useStudyPlans`, `useEquivalences`). `students` still holds DNI and contact, so teachers and lectura cannot read them.

The copy into the new model is `scripts/migracion/migrar.ts`. It is dry-run unless `--escribir` is passed, it is idempotent, and it does not delete the legacy documents. Agents only run it against the local `demo-ceija` emulator. Production needs the confirmations in `docs/PASOS_MANUALES.md` and is run by Nahuel.

## Commands
```bash
npm run dev
npm run lint
npm run typecheck
npm run test:domain
npm run test:rules
npm run test:migracion
npm run build
```

`test:rules` starts the Firestore emulator on project `demo-ceija` and then runs the rules tests and the migration test. `test:migracion` is only the migration half. Neither touches `ceija12resm`. GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, domain tests, rules/migration on the emulator, and the build. It does not deploy. A Hosting preview channel would need `FIREBASE_TOKEN` or a Hosting Admin service account; those secrets are not in CI.

Do not deploy from an agent session. Hosting and rules deploy stay with the owner:

```bash
npx firebase deploy --only firestore:rules,hosting
```

## Seeds and migration
- `seed-students.mjs` refuses to run. It used to sign in to the real project.
- `scripts/seed-emulador.ts` writes fictitious people and only if the emulator host is localhost.
- `scripts/migracion/migrar.ts` reads the legacy collections and copies them into the new model. Default is dry-run. `--escribir` writes. A second run does not duplicate a DNI. It refuses anything that is not a local `demo-` emulator unless Nahuel sets `CEIJA_MIGRACION_REAL`, `--confirmar-proyecto ceija12resm` and `--confirmar-frase "MIGRAR CEIJA"`. See `scripts/migracion/README.md`. Do not run that production path from an agent session.

Exports (`.xlsx`, `.csv`) are gitignored. Sensitive Excel columns are an admin action with a confirmation dialog.

## Still manual
The human checklist, in Spanish, is `docs/PASOS_MANUALES.md`. Short version:

- Deploy rules and hosting together (`npx firebase deploy --only firestore:rules,hosting`) after `npm run build`. Do not deploy from an agent session.
- Rotate or delete the old test accounts in the real Firebase project.
- Re-save each teacher in Usuarios so `docentes/{uid}` gets their espacios. Existing `Administrador` / `Profesor` documents keep working.
- Run the migration (backup, dry-run, then `--escribir`) from Nahuel's machine. The script does not delete legacy data. Migrated RACs stay open.
- App Check is not wired (Spark allows it later).
- Real legajos are not in the repo. Arte y Cultura and Deportes are still not invented.
