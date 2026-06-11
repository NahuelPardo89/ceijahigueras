# Sesión - Plan de Estudios + Toast System + Seed Students

## Logros
- Plan de Estudios module: StudyPlanManagement (CRUD), SubjectManagement (CRUD con inline forms), StudyPlanFormModal
- Grades module: GradesManagement, GradesFormModal
- Firebase deploy: hosting + firestore.rules
- Seed data: PLAN 2022-2027 con 42 materias (planId: `Qud6PkF80xPzUa2tGF09`)
- Seed data: 20 estudiantes con datos completos (planId, documentación, etc.) IDs: `student-1` a `student-20`

## Decisiones Técnicas
- **Toast unificado**: `ToastContext` (`src/context/ToastContext.tsx`) con `useToast()` hook.
  - Tipos: `'success'` | `'error'` | `'info'`
  - Uso: `toast('mensaje')` o `toast('mensaje', 'error')`
  - Auto-dismiss 3.5s, animación slide-in, botón de cierre
  - Envuelve la app en `App.tsx`
  - **SIEMPRE usar este toast en nuevos componentes**, no crear `submitStatus` manual
- **Inline forms**: SubjectManagement usa forms inline en vez de modal. Renderiza bloque separado cuando `addingModulo` no existe en `modulos`.
- **Módulos editable**: el campo módulo arranca en 0 (input vacío) para que el usuario escriba el número, sin auto-calcular.
- **Sin dependencias externas de notificaciones** (ni sonner, react-hot-toast, etc.)
- Firestore queries sin `orderBy` para evitar índices compuestos; sorting client-side.
- TypeScript strict con `noUnusedLocals`/`noUnusedParameters`.

## Pendientes / Recordatorios
- **Testear antes de deployar**: correr `npm run build` (tsc + vite) y verificar que pase sin errores.
- No usar `window.confirm` ni `submitStatus` local en componentes nuevos — usar `useToast()`.

## Comandos útiles
```bash
npm run build          # Compilar (tsc + vite)
npx firebase deploy --only hosting  # Deploy hosting
npx firebase deploy --only firestore:rules  # Deploy rules
```
