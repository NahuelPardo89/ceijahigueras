# Sesión - Gestión de Calificaciones y Plan de Estudios

## Firestore Rules
- Reglas de calificaciones (`/grades`) actualizadas: cualquier usuario autenticado puede crear/editar/eliminar (ya no solo admin)
- Archivo: `firestore.rules`

## Plan de Estudios
- Único plan vigente: `PLAN 2022-2027` (ID: `sPS24gdIfQAh144YZ4vD`)
- Educación Secundaria Completa, cohorte 2022-2027
- Resolución: RM N° 255 Año 2023 | Validez Nacional: RM N° 1844 Año 2023
- **42 materias:**
  - Módulos 1 al 7: 5 materias básicas c/u (MATEMÁTICA, LENGUA Y LITERATURA, CIENCIAS NATURALES, CIENCIAS SOCIALES, INGLÉS) = 35
  - Módulo 8: 5 ATP (ECONOMÍA, DERECHO DEL TRABAJO, CIUDADANÍA Y PARTICIPACIÓN, FORMACIÓN PROFESIONAL, FORMACIÓN PARA EL TRABAJO)
  - Módulo 9: 2 Orientación (ESPACIO DE VINCULACIÓN, ESPACIO DE LA ORIENTACIÓN)

## Estudiantes
- 20 estudiantes activos, todos reasignados al nuevo `planId`
- Filtros por `planActual`: Plan A, Plan B, Plan C, Virtuales (por `cursado`)

## Profesores
- 7 profesores con `subjectIds` reseteados a `[]`
- Asignación de materias pendiente (el usuario cargó un profesor manualmente)

## Calificaciones
- Las 4 calificaciones de prueba fueron eliminadas
- No hay calificaciones actualmente

## Auth
- `AuthUser` y `UserRecord` incluyen `subjectIds?: string[]`
- `subjectIds` se carga desde Firestore en `onAuthStateChanged`
- `createUser()` acepta `subjectIds` opcional
- `updateUser()` maneja `subjectIds`

## Componentes modificados
- `GradesFormModal.tsx` — selector de módulo, auto-select de materia si hay 1, nota como dropdown (1-10 + Aprobado), sin campo tipo
- `GradesManagement.tsx` — filtros Plan A/B/C/Virtuales, solo activos, profesores ven solo materias asignadas
- `StudentManagement.tsx` — botón de calificaciones, profesores ven solo materias asignadas
- `UserFormModal.tsx` — selector de materias con checkboxes agrupadas por plan > módulo (solo para rol Profesor)
- `UserManagement.tsx` — badge "N materias" en el nombre del profesor
- `AuthContext.tsx` — carga/crea/actualiza `subjectIds`
- `index.css` — `.badge-subjects`, `.btn-filter-tab`, `.filter-count`

## Hosting
- URL: https://ceija12resm.web.app
- Admin: admin@ceija12resm.com / Admin123!
- Último deploy: firestore rules actualizadas

## Próximos pasos
- Asignar materias específicas a los profesores
