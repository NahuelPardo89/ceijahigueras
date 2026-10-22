# CEIJA Higueras — Project Summary

## Overview
School management system for CEIJA N°12 Remedios Escalada de San Martín, sede Las Higueras (CUE 140512501, Combinada en Línea). React 19 + TypeScript + Vite, Firebase Auth + Firestore + Hosting. No Cloud Functions and no Cloud Storage: the free Spark plan is the target. The app is an internal tool. The official records remain the paper Libro Matriz and the SGE.

**URL:** https://ceija12resm.web.app

## Tech stack
- Frontend: React 19, TypeScript, Vite 8, custom CSS, lucide-react
- Backend: Firebase Auth, Firestore. Business rules live in the client and in `firestore.rules`
- Excel: SheetJS (`xlsx`)
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
| `planes/{planId}` | A/B/C, orientation, resolutions, version |
| `planes/{planId}/espacios/{espacioId}` | Curricular space. M8 may be `compartidoM8` |
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

Versioned sede plans are in `src/domain/planesSede.ts` (Plan A ciclo básico, Planes B and C Economía y Administración). Arte y Cultura and Deportes are not invented; an admin can add them from the planes screen.

## Legacy collections
`students`, `grades` and `equivalences` stay readable and writable by admins only, until a migration runs. They are not the screens the app uses now. `students` holds DNI and contact, so teachers and lectura cannot read them.

## Commands
```bash
npm run dev
npm run build
npm run test:domain
npm run test:rules
```

`test:rules` starts the Firestore emulator on project `demo-ceija`. It does not touch `ceija12resm`.

Do not deploy from an agent session. Hosting and rules deploy stay with the owner:

```bash
npx firebase deploy --only firestore:rules,hosting
```

## Seeds and migration
- `seed-students.mjs` refuses to run. It used to sign in to the real project.
- `scripts/seed-emulador.ts` writes fictitious people and only if the emulator host is localhost.
- `scripts/migracion/` is a dry-run skeleton. It does not write, and it exits if the project is not a local `demo-` emulator.

Exports (`.xlsx`, `.csv`) are gitignored. Sensitive Excel columns are an admin action with a confirmation dialog.

## Still manual
- Rotate or delete the old test accounts in the real Firebase project, then deploy the new rules together with the new hosting build.
- Existing `Administrador` / `Profesor` documents keep working. New roles use `admin`, `docente`, `lectura`, `pendiente`. Re-save a teacher in Usuarios so `docentes/{uid}` gets their espacios.
- App Check is not wired (Spark allows it later; it was left out of this change).
- Real legajos are not loaded. The migration script is only the local skeleton described above.
