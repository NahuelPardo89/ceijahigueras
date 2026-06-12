# Sesión - Gestión de Calificaciones y Plan de Estudios

## Firestore Rules
- Reglas de calificaciones (`/grades`) cambiadas: `allow create/update/delete: if request.auth != null` (ya no solo admin)
- Archivo: `firestore.rules`

## Plan de Estudios
- Único plan vigente: `PLAN 2022-2027` (ID: `sPS24gdIfQAh144YZ4vD`)
- Educación Secundaria Completa, cohorte 2022-2027
- Resolución: RM N° 255 Año 2023 | Validez Nacional: RM N° 1844 Año 2023
- **42 materias:**
  - Módulos 1 al 7: 5 materias básicas c/u (MATEMÁTICA, LENGUA Y LITERATURA, CIENCIAS NATURALES, CIENCIAS SOCIALES, INGLÉS) = 35
  - Módulo 8: 5 ATP (ECONOMÍA, DERECHO DEL TRABAJO, CIUDADANÍA Y PARTICIPACIÓN, FORMACIÓN PROFESIONAL, FORMACIÓN PARA EL TRABAJO)
  - Módulo 9: 2 Orientación (ESPACIO DE VINCULACIÓN, ESPACIO DE LA ORIENTACIÓN)
- Se eliminaron 100 materias huérfanas de planes anteriores + el plan viejo

## Estudiantes
- 20 estudiantes activos, todos reasignados al nuevo `planId`
- Filtros en calificaciones: Plan A/B/C solo muestran presenciales (`cursado !== 'virtual'`), Virtuales solo muestra `cursado === 'virtual'`
- Estados: activo/inactivo

## Profesores
- 7 profesores con `subjectIds` reseteados a `[]`
- Asignación de materias disponible desde UserFormModal (checkboxes por plan > módulo)
- Badge "N materias" visible en UserManagement junto al nombre

## Calificaciones
- Las 4 calificaciones de prueba fueron eliminadas (junto con datos viejos)
- **Tabla unificada** con columnas: Módulo | Materia | Nota | Fecha | Acción
- Filas con color alternado para mejor legibilidad
- Loading spinner al expandir un estudiante para cargar sus notas

## Auth
- `AuthUser` y `UserRecord` incluyen `subjectIds?: string[]`
- `subjectIds` se carga desde Firestore en `onAuthStateChanged`
- `createUser()` acepta `subjectIds` opcional
- `updateUser()` maneja `subjectIds`

## Componentes modificados (8 archivos)
- `firestore.rules` — permisos de calificaciones para cualquier auth
- `GradesFormModal.tsx` — selector de módulo primero, auto-select de materia si hay 1, nota como dropdown (1-10 + Aprobado), sin campo tipo
- `GradesManagement.tsx` — filtros Plan A/B/C (excluye virtuales), pestaña Virtuales, loading spinner, tabla unificada, profesores filtran por subjectIds
- `StudentManagement.tsx` — modal de calificaciones con tabla unificada, botón para agregar, profesores filtran por subjectIds
- `UserFormModal.tsx` — selector de materias con checkboxes agrupadas por plan > módulo (solo rol Profesor)
- `UserManagement.tsx` — badge `.badge-subjects` con contador de materias
- `AuthContext.tsx` — carga/crea/actualiza `subjectIds` en documentos de usuario
- `index.css` — `.badge-subjects`, `.btn-filter-tab`, `.filter-count`

## Hosting
- URL: https://ceija12resm.web.app
- Admin: admin@ceija12resm.com / Admin123!
- Firebase project: ceija12resm

## Pendiente
- Asignar materias específicas a los profesores desde UserFormModal
