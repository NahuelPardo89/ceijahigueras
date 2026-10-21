# CEIJA Higueras — Project Summary

## Overview
School management system (Sistema de Gestión Escolar) for CEIJA N°12 Remedios Escalada de San Martín — Sede Las Higueras. Built with React + TypeScript + Vite, Firebase Auth + Firestore, no routing library (sidebar with lazy loading), custom CSS.

**URL:** https://ceija12resm.web.app

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite 8
- **Backend:** Firebase Auth, Firestore, Firebase Hosting
- **Auth:** Firebase Auth (email/password + Google)
- **Styling:** Custom CSS (index.css), no frameworks
- **Excel:** SheetJS (xlsx) for export/import
- **Icons:** lucide-react

## Architecture

### Auth Flow
- `AuthContext.tsx` wraps entire app
- Uses standalone `writeLog()` function (not hook) to avoid circular dependency
- Custom admin sign-up via `fetch` to Identity Toolkit API (REST) since Firebase Admin SDK isn't available
- User roles: `Administrador`, `Profesor`
- Firestore `users` collection mirrors Auth users

### Navigation
- `DashboardLayout.tsx` renders sidebar with lazy-loaded sections via `useState` + conditional rendering
- Sections: Usuarios, Estudiantes, Calificaciones, Planes, Estadísticas, Detalle del Estudiante, Mi Perfil

### Data Layer
- Custom hooks (not React Query): `useStudents`, `useSubjects`, `useGrades`, `useEquivalences`, `useStudyPlans`, `useLogs`, `useExport`
- Each hook has CRUD operations returning `Promise<T>` directly
- No global state manager — React state + props

### Firestore Collections
| Collection | Key Fields |
|---|---|
| `users` | email, displayName, role, subjectIds, disabled |
| `students` | apellido, nombre, dni, cuil, email, telefono, fechaNacimiento, estado, planInicial, planActual, cursado, gestion + StudentDocumentation fields |
| `subjects` | nombre, modulo, planId |
| `grades` | studentId, subjectId, nota, fecha, gestion |
| `equivalences` | studentId, nombre, nota, fecha |
| `studyPlans` | nombre, modulos, cuatrimestres |
| `logs` | entity, entityId, action, userId, userEmail, userRole, timestamp, details |

## Key Design Decisions

### Logging
- `writeLog()` standalone function for use inside AuthContext (no hook dependency)
- `useLogs` hook for components inside provider
- Entity types: user, student, grade, subject, studyPlan, equivalence
- Actions: create, update, delete
- History tab in StudentDetail only shows what actually changed (diff-based logging in `updateStudent`)

### Student Data Model
- `StudentRecord = { id, apellido, nombre, dni, cuil, email, telefono, fechaNacimiento, estado, planInicial, planActual, cursado, gestion, createdAt, createdBy } & StudentDocumentation`
- `StudentDocumentation`: paseProvisorio, paseDefinitivo, fotocopiaDni, cus, certificadoPrimaria, numeroEquivalencia, linkTitulo, documentacionCompleta, observaciones
- Documentation stored flat on the student document (not subcollection)

### PDF/Print
- No PDF library — `window.print()` + `@media print` CSS for printable grade reports

### Bulk Import
- Validates uniqueness of DNI, CUIL, email before creating
- Preview table before confirming import

### Subjects
- `createDefaultSubjects` uses `writeBatch` for atomic batch writes
- Plan-based: subjects belong to a study plan via `planId`

### Error Handling
- Custom `getFirebaseErrorMessage(err, context)` with error context (signIn, signUp, resetPassword, signInWithGoogle, changePassword, generic)
- Firestore REST API error codes mapped via `REST_ERROR_MAP`

## Known Issues
- No composite indexes in Firestore — queries avoid needing them (single-field queries + client-side sorting)
- Equivalences `firestore.rules` without write protection (pending)
- Seed script `seed-students.mjs` for testing

## Commands
```bash
npm run dev      # dev server
npm run build    # tsc + vite build
npx firebase deploy  # deploy to Firebase
```

## Test Users
- Admin: admin@ceija.com / Admin123!
- Prof: prof@ceija.com / Prof1234!
- Cloud agent (Profesor, active): `agente.entorno@ceija12resm.com`. Password is `TEST_LOGIN_PASSWORD` in gitignored `.env.local`, not in this file.

## Cursor Cloud specific instructions
- Node.js 22 and npm are already available. Install with `npm ci`. It is safe to run again.
- Dev server: `npm run dev -- --host 0.0.0.0 --port 5173`. Vite reads Firebase web config from `.env.local`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- `npm run build` typechecks and builds. `npm run lint` currently exits with existing `react-hooks/set-state-in-effect`, `no-empty`, and `react-refresh/only-export-components` errors in the app source.
- There is no automated test suite. A signed-in Profesor can open Gestión de Estudiantes and read the student list.
- Do not run `seed-students.mjs` or `firebase deploy` during routine setup. Both change the hosted `ceija12resm` project.
