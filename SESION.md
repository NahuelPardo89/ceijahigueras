# SESIÓN - CEIJAHIGUERAS

## Stack
- React 19 + Vite 8 + TypeScript 6 (strict: noUnusedLocals, noUnusedParameters, verbatimModuleSyntax, erasableSyntaxOnly)
- Firebase Auth + Firestore (SDK) + Firebase Hosting
- Firebase REST API (`identitytoolkit.googleapis.com`) para **crear** usuarios (única excepción: el resto usa SDK)
- Lucide React icons
- CSS vanilla (~1720 líneas), tema dark violet/pink, glassmorphism

## Credenciales
- Admin: `admin@ceija12resm.com` / `Admin123!` (uid: `CneOr6FERiYmLOuhYD3gb9zvDFC3`)
- Hosting: https://ceija12resm.web.app
- `.env.local` con live keys (gitignored via `*.local`)

## Arquitectura

```
src/
├── main.tsx                         → Entry point
├── App.tsx                          → loading && !user → loader; user → Dashboard; else → Login
├── context/AuthContext.tsx           → Auth state global + users CRUD
├── hooks/
│   ├── useAuth.ts                   → useContext(AuthContext)
│   └── useStudents.ts               → Student CRUD, tipos, checkFieldUnique
├── firebase/config.ts               → initializeApp + getAuth + getFirestore
├── utils/
│   ├── errors.ts                    → Mapa códigos Firebase → español
│   └── constants.ts                 → EMAIL_REGEX
├── components/
│   ├── Login.tsx                    → Email/pass + Google sign-in
│   ├── ForgotPassword.tsx           → sendPasswordResetEmail
│   ├── Dashboard.tsx                → Wrapper → DashboardLayout
│   ├── ErrorBoundary.tsx            → Class component
│   ├── Pagination.tsx               → Reutilizable (10/25/50, «‹[1][2][3]›»)
│   └── admin/
│       ├── DashboardLayout.tsx      → Sidebar con secciones
│       ├── SectionPlaceholder.tsx   → "Próximamente"
│       ├── UserManagement.tsx       → Lista usuarios, rol, disable, paginación
│       ├── UserFormModal.tsx        → Crear/editar usuario con overlay result
│       ├── StudentManagement.tsx    → Lista estudiantes, búsqueda, orden, paginación
│       ├── StudentFormModal.tsx     → Crear/editar estudiante + validación unicidad
│       └── StudentDocumentationModal.tsx → Toggles + selects + textarea documentación
└── index.css                        → Design system completo
```

## Colecciones Firestore

### `users/{uid}`
```
email: string, displayName: string, role: "Administrador" | "Profesor",
createdAt: string, disabled?: boolean
```

### `students/{studentId}`
```
apellido, nombre, dni, cuil, email, telefono: string
fechaNacimiento: string (YYYY-MM-DD)
estado: "activo" | "inactivo"
planInicial: string (texto libre)
planActual: "Plan A" | "Plan B" | "Plan C"
cursado: "presencial" | "virtual"
gestion: "sin cargar" | "cargado" | "pase solicitado" | "invalido"
Edad: NO se almacena → calculada de fechaNacimiento en frontend
━━ Documentación ━━
paseProvisorio, paseDefinitivo, fotocopiaDni, cus: boolean
certificadoPrimaria: "no corresponde" | "original" | "constancia correcta" | "constancia incorrecta"
numeroEquivalencia, linkTitulo, observaciones: string
documentacionCompleta: "completa" | "incompleta"
```

## Decisiones Clave

| Decisión | Razón |
|---|---|
| **REST API para crear usuarios** | `createUserWithEmailAndPassword` fallaba (cuenta baneada), se migró a REST Identity Toolkit |
| **loading && !user en App.tsx** | Evita que Dashboard se desmonte cuando createUser pone loading=true |
| **`checkFieldUnique` como función exportada** (no dentro del hook) | No necesita user/role, es puramente Firestore query |
| **Toogle switch en vez de checkbox para booleanos** | UX más claro para documentación |
| **Edad calculada, no almacenada** | Dato derivado, evitar desincronización |
| **Plan Inicial = texto libre, Plan Actual = select** | Plan inicial puede ser histórico (ej: "Plan 2018"), actual es fijo |
| **Feedback modal como overlay interno** (no toast ni modal separado) | Mantiene foco, evita cierre accidental |
| **Paginación client-side** (no Firestore pagination) | Máximo 100 estudiantes por query, suficiente |

## Reglas Firestore (`firestore.rules`)

### `/users/{uid}`
- `read`: auth + (isOwner OR isAdmin)
- `create`: auth + (isOwner + role=Profesor AND requiredFields) OR (isAdmin + validRole)
- `update`: auth + (isOwner + roleUnchanged) OR (isAdmin)
- `delete`: false

### `/students/{studentId}`
- `read`: auth (cualquier usuario autenticado)
- `create/update/delete`: solo isAdmin

## Historial de Commits

| Hash | Descripción |
|---|---|
| `bbd8b8d` | Pagination, email field, DNI/CUIL/email uniqueness, documentation modal |
| `7704e75` | Modal feedback for users and students, add sin cargar gestion, prevent loader unmount |
| `7346ea9` | Add Student CRUD: full management panel, form modal, Firestore hook, sortable columns |
| `fedfee3` | Fix firestore rules: add validation, fix auto-register and role escalation bugs |
| `7074463` | Add subagents: firebase and deploy |
| `e41bef1` | Refactor: remove mock mode, add admin dashboard, user management, Firebase integration |
| (anteriores) | Setup inicial Vite + React + Firebase |

## Convenciones del Código

- **Sin comentarios** en código (salvo eslint-disable)
- **Nombres en español** (apellido, gestion, cursado...)
- **CSS clases semánticas** en inglés (user-mgmt-panel, badge-gestion...)
- **Tipos estrictos** con intersection (& StudentDocumentation)
- **`useCallback`** en hooks para memoizar funciones expuestas
- **`useMemo`** para filtered/paginated lists

## Deuda Técnica / Próximos Pasos

- [ ] Remote git (origin missing) → configurar con `git remote add origin <url>`
- [ ] Calificaciones (placeholder) → requiere feature completo
- [ ] Documentación general (placeholder) → sección de dashboard, distinto del modal por estudiante
- [ ] Test students en Firestore (García, Martínez, Rodríguez, López, Fernández) → crear seed script

## Fixes Aplicados en Último Commit

| Deuda | Solución |
|---|---|
| Chunk >500 kB warning | `build.chunkSizeWarningLimit: 1000` en vite.config.ts + lazy loading (React.lazy + Suspense) para UserManagement y StudentManagement. Chunks: main 565 kB (174 gzip), Student 27 kB, User 12 kB, Pagination 3 kB |
| `handleChange` sin toUpperCase en UserFormModal | Agregado: displayName y email → toUpperCase; password se deja intacto |
