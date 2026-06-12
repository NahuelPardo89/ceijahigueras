# Sesión

## Bug fix: "useAuth debe usarse dentro de un AuthProvider"

**Problema:** Dependencia circular. `AuthProvider` en `AuthContext.tsx` llamaba a `useLogs()`, que internamente llama a `useAuth()`. Como `AuthProvider` es quien provee el contexto, al ejecutarse `useLogs` dentro del provider el contexto aún no existe.

**Solución:**
- Se creó función standalone `writeLog()` en `src/hooks/useLogs.ts` que recibe `userId`, `userEmail`, `userRole` como parámetros (sin hooks).
- `AuthContext.tsx` ahora importa `writeLog` en lugar del hook `useLogs`.
- El hook `useLogs` se mantiene intacto para componentes que sí están dentro del provider.
- Archivos modificados:
  - `src/hooks/useLogs.ts`
  - `src/context/AuthContext.tsx`

## Nueva funcionalidad: Equivalencias en Gestión de Calificaciones

**Qué hace:** Permite registrar equivalencias (materias aprobadas externamente) por estudiante, con nombre de materia libre, nota y fecha.

**Archivos creados:**
- `src/hooks/useEquivalences.ts` — Hook CRUD para colección `equivalences`
- `src/components/admin/EquivalenceFormModal.tsx` — Modal con inputs: nombre materia (texto), nota (dropdown 1-10/Aprobado), fecha (dd/mm/aaaa)

**Archivos modificados:**
- `src/components/admin/GradesManagement.tsx` — Sección de equivalencias debajo de la tabla de calificaciones
- `src/hooks/useLogs.ts` — Se agregó `'equivalence'` a `LogEntity`
- `firestore.rules` — Reglas para colección `equivalences`

**Data model (Firestore collection `equivalences`):**
| Campo | Tipo |
|-------|------|
| `studentId` | string |
| `nombre` | string |
| `nota` | string |
| `fecha` | string (dd/mm/aaaa) |
| `createdAt` | string (ISO timestamp) |

**Deploy:** Hosting URL: https://ceija12resm.web.app
