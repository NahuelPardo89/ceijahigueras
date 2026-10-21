# Migración local (esqueleto)

Este script **no está listo para correr contra el proyecto real** y no debe hacerlo.
No incluye datos de estudiantes. No usa la cuenta de servicio. No llama a `ceija12resm`.

Sirve para dejar escritos los pasos y para ensayar, en el emulador, la lectura de un CSV ya limpiado.

## Antes de tocar datos reales

1. Congelar las planillas de Drive (copia con fecha).
2. Normalizar DNI (solo dígitos), nombres y fechas a ISO.
3. Resolver a mano los duplicados de DNI. Un estudiante por DNI: conservar el registro más completo y el plan más reciente; el plan anterior pasa a historial.
4. Reconstruir el RAC 2026 por posición de bloque = fila de la lista. Lo que no se pueda emparejar queda en una lista "a revisar". Migrar valores (nota, fecha), nunca fórmulas.
5. Recién ahí, y en la computadora de quien administra, un script con cuenta de servicio puede escribir en lotes de hasta 400 operaciones. Este repositorio no trae esa cuenta ni ese ejecutable.

## Ensayo en el emulador

```bash
firebase emulators:exec --project demo-ceija --only firestore \
  "node scripts/migracion/migrar.mjs --emulador --dry-run --csv /ruta/al/archivo-limpio.csv"
```

`--dry-run` cuenta filas y DNI repetidos. No escribe.

Sin `FIRESTORE_EMULATOR_HOST`, sin `--emulador`, o con un project id que no empiece con `demo-`, el script sale con error.
