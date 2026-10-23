# Plan de trabajo: jerarquía de Planes de Estudio

Documento para que Nahuel lo apruebe **antes** de ejecutar. No cambia código, no siembra datos y no se despliega.

Fecha de relevamiento: 23 de octubre de 2026. Rama: `cursor/planes-de-estudio-1b42` (PR #6), apilada sobre `cursor/saneamiento-legado-b791`. La pantalla de este PR todavía no está en producción.

## Qué pidió Nahuel

1. El plan de estudio se crea a mano, con **nombre**, **validez nacional** y **resolución**. La orientación deja de ser un campo propio del plan.
2. Debajo del plan van **planes o años**. Es la misma cosa: la persona le pone el nombre. No existe un “nivel” aparte.
3. Dentro de cada plan/año van los **módulos**.
4. Dentro de cada módulo van las **asignaturas**, que también se llaman **áreas**. Hoy el modelo separa “materia” y “área”.
5. Todo se carga a mano. Sin datos pre-creados y sin seed. Si cambia el plan de estudio, secretaría lo modifica en la pantalla, sin tocar el sistema.

Ejemplo **solo de referencia**, para entender el anidado. No se hardcodea y no se precarga:

- plan A: módulos 1, 2 y 3
- plan B: módulos 4, 5, 6 y 7
- plan C: módulos 8 y 9

## Decisiones que este documento recomienda

Nahuel puede tachar cualquiera. Hasta que no las confirme, no se ejecuta.

| # | Tema | Recomendación | Si la rechaza |
|---|---|---|---|
| D1 | Orientación | Se **quita** del plan nuevo. No queda obligatoria ni opcional. No se arma un catálogo aparte. El título es `nombre`. Si hace falta decir “Economía y Administración”, va escrito en ese nombre o en el nombre del plan/año. | Si la quiere anotada igual, se agrega un texto libre opcional, vacío por defecto, que no se usa como título ni para asignar docentes. |
| D2 | Cómo se llama el hijo del plan | Una sola subcolección, `anios`. En la pantalla el título de la sección es “Planes o años”. Cada ítem tiene un `nombre` libre (“Plan A”, “1° año”, “Plan C”). No hay `codigo` ni `anioCurso` obligatorios, y no hay entidad `niveles`. | Si prefiere otro id de colección (`tramos`), se cambia solo el path. La pantalla sigue diciendo “Planes o años”. |
| D3 | Materia y área | Se unifican en **asignatura**. Un nombre, un id opaco. No hay un segundo campo `area` / `areaNombre` ni la lista fija Matemática, Naturales, Sociales, Inglés, Lengua, ATP. | Si el área tiene que seguir siendo un grupo (varios profesores de “Matemática” sobre distintas asignaturas), se mantiene un texto libre de área, distinto del nombre, y se dice explícito en la aprobación. |
| D4 | Código `n.m` (ej. `1.3`) | Se **conserva opcional** en la asignatura, para cruzar con una planilla. Vacío si no hace falta. | Si no lo quiere, se saca en el mismo paso y se borran el validador y la ayuda. |
| D5 | “Se comparte entre niveles” / M8 | **No entra** en este cambio. El pedido nuevo no lo nombra. El M8 compartido sigue viviendo en el modelo viejo (`planes` / `compartidoM8`) hasta que se migre la planilla. | Si lo necesita ya, se deja una casilla en la asignatura, destildada, sin sembrar un módulo compartido. |
| D6 | Pantallas viejas | Esta ejecución **no** las cambia. Inscripción, planilla, RAC, usuarios, ciclos, exportar y la landing siguen leyendo lo que leen hoy. | Si quiere que el alta de estudiantes ya use el árbol nuevo, es otro tramo, después de este. |

“El usuario elige el nombre” se lee así: hay un solo tipo de hijo, y el nombre de cada uno lo escribe secretaría. No se agrega un ajuste del sistema para elegir si la sección se llama “plan” o “año”.

## Qué hay hoy

Conviven **dos** currículas. La pantalla nueva no lee la vieja. Las pantallas de notas e inscripción no leen la nueva.

### 1. Árbol nuevo de este PR (`planesEstudio`)

Empieza vacío. No hay botón de sembrar. El dominio nuevo no importa `planesSede`.

| Ruta | Campos | Archivos |
|---|---|---|
| `planesEstudio/{planId}` | `orientacion`, `resolucion`, `validezNacional`, `activo`, `enUso`, `creadoPor`, `fechaCreacion` | `src/domain/planesEstudio.ts`, `src/services/planesEstudio.ts`, `firestore.rules` (`planEstudioForma`) |
| `.../niveles/{nivelId}` | `codigo`, `anioCurso` (1–9), `nombre`, `orden`, `enUso` | los mismos, función `nivelEstudioValido` |
| `.../modulos/{moduloId}` | `nombre`, `orden`, `enUso` | `moduloEstudioValido` |
| `.../materias/{materiaId}` | `nombre`, `orden`, `area` (clave `a-z0-9-`), `areaNombre`, `codigo` (vacío o `n.m`), `comparteEntreNiveles`, `activo`, `enUso` | `materiaEstudioValida` |

El id de cada documento lo genera Firestore (`doc(collection(...))`). Renombrar no cambia el id. `copiaParaCalificacion` en `src/domain/planesEstudio.ts` copia ese id como `materiaId` y también como `espacioId`, que es la clave que hoy usa `rac/{racId}/calificaciones/{espacioId}`. Esa copia **todavía no la llama** el alta de estudiantes ni el RAC: queda preparada.

`enUso` nace en `false`. No se puede borrar un documento con `enUso == true`, ni un padre si un hijo está en uso. `enUso` no puede volver a `false` (`enUsoNoRetrocede` en las reglas). El cliente también revisa a los hijos antes de borrar (`puedeEliminarContenedor`). Un borrado de rama entra en un batch con tope de 450 documentos (`borrarRefs` en `src/services/planesEstudio.ts`).

Reglas de lectura de materias:

- Admin y lectura leen el árbol (`esStaff` en plan, nivel y módulo; get/list de materia para admin y lectura).
- Docente lee una materia solo si `docentes/{uid}.areas[area] == true` (`areaAsignada`). El listado tiene que filtrar por área: las reglas no recortan la consulta.
- Nadie más escribe. Pendiente y anónimo no leen.

Esa mapa `docentes.areas` **no la escribe ninguna pantalla**. Usuarios sigue guardando `espacios['planId|espacioId|anio']` (`src/domain/claves.ts`, `src/components/admin/UsuariosPanel.tsx`).

### 2. Pantalla y menú nuevos

- Menú, texto exacto **Planes de Estudio**, solo `admin`: `src/components/admin/DashboardLayout.tsx` (sección `planes`). No hay ruta de URL: el dashboard cambia de panel en memoria.
- UI: `src/components/admin/PlanesPanel.tsx`.
  - Alta: Resolución, Orientación, Validez nacional. Los tres son obligatorios. El título del plan en el listado es la orientación.
  - Después: niveles (código, año de cursada, nombre, orden), módulos, materias.
  - Ayuda fija: “En esta modalidad, A es 1° año, B es 2° y C es 3°. Cargalos vos: la app no los inserta sola.”
  - Placeholders `A` y `1° año`.
  - El área es un `select` con `AREAS_SUGERIDAS` y la opción “Otra área…”.
  - Casillas “Se comparte entre niveles” (arranca destildada) y “Entra en los RAC nuevos” (`activo`).
- Tema claro/oscuro de esta pantalla: `src/styles/tema.css`, `src/components/tema/SelectorTema.tsx`, componentes en `src/components/ui/`. No se toca en este plan de jerarquía.
- Resumen para otros agentes: `AGENTS.md` (filas de `planesEstudio` y el párrafo que dice que la pantalla pide orientación y después niveles).

### 3. Textos y catálogos fijos (no son el árbol nuevo, pero están en el repo)

Ninguno de estos tres inventarios coincide con los otros. Por eso no hay que copiar ninguno al modelo nuevo.

**a. Sugerencias de área, solo en el formulario nuevo.** No se escriben solas en Firestore, pero están fijas en código: `AREAS_SUGERIDAS` en `src/domain/planesEstudio.ts` (matemática, naturales, sociales, inglés, lengua, ATP). El test `tests/planes-estudio.test.ts` afirma esa lista.

**b. Catálogo viejo que sí se puede escribir en `planes/{id}/espacios`.** `src/domain/planesSede.ts`, constante `PLANES_SEDE` (versión `VERSION_PLANES_SEDE = 1`):

| Id | Nombre en código | Orientación en código | Espacios (módulo) |
|---|---|---|---|
| `A-698-CB` | Plan A — 1° año (Ciclo Básico) | Ciclo Básico | Matemática M1, Lengua y Literatura M2, Ciencias Naturales M3, Ciencias Sociales M4, Inglés M5, Formación para el Trabajo M8 (`compartidoM8`) |
| `B-1206-EyA` | Plan B — 2° año | Economía y Administración | Matemática M1, Lengua M2, Economía M6, Derecho del Trabajo M7, Ciudadanía M3, M8 |
| `C-1206-EyA` | Plan C — 3° año | Economía y Administración | Matemática M1, Lengua M2, Proyecto de Orientación M9, Espacio de Vinculación M9, Formación Profesional M7, M8 |

`planSiguienteId` encadena A → B → C con esos ids. `INSTITUCION_INICIAL` en el mismo archivo fija nombre, CUE `140512501`, sede Las Higueras y resoluciones `698/17 y 1206/17`.

Quién lo usa (modelo viejo, no la pantalla Planes de Estudio):

- `src/services/escolar.ts`: `cargarPlanesSede` escribe `planes` + `espacios` si no existen; `listarPlanes`; `espaciosDePlan`; `crearEstudianteConRac` arma el RAC con los espacios de ese plan; `guardarPlan` / `guardarEspacio`.
- `scripts/seed-emulador.ts`: llama `cargarPlanesSede` y crea un estudiante ficticio sobre `PLANES_SEDE[0]`. Solo corre contra el emulador local. No es la pantalla.
- `src/services/migracion.ts`: llama `cargarPlanesSede` en el flujo de migración local.
- `src/domain/migracion.ts`: reconoce un plan si el id está en `PLANES_SEDE`.
- Tests: `tests/domain.test.ts`, `tests/reglas-y-rac.test.ts`.

**c. Landing pública, otro listado distinto.** `src/content/sedePublica.ts`, lo muestra `src/components/Landing.tsx`.

- Texto: “Los tres planes corresponden a la orientación Economía y Administración. Plan A es el Ciclo Básico; los planes B y C, el Ciclo Orientado.”
- Plan A: módulos 1, 2, 3 y 8. Plan B: 4, 5 y 8. Plan C: 6, 7, 8 y 9.
- Los espacios publicados son los mismos cinco en los tres planes (Matemática, Interpretación y Producción de Textos, Ciencias Naturales, Ciencias Sociales, Área Técnico Profesional). No coinciden con `PLANES_SEDE` ni con el ejemplo de Nahuel (A = 1–3, B = 4–7, C = 8–9).

Eso es copy de la página de inicio, no la currícula con la que se toman notas.

### 4. Pantallas que siguen en el modelo viejo

Colección `planes/{planId}` con campos de `Plan` en `src/domain/types.ts` (`codigo`, `anioPlan`, `ciclo` CB/CO, `resolucionCurricular`, `resolucionDistancia`, `orientacion`, `version`, `activo`, `nombre`) y subcolección `espacios` (`nombre`, `modulo`, `area`, `orden`, `compartidoM8`, `tipo` EC/ATP). Reglas: `firestore.rules`, match `/planes/{planId}` y `/espacios/{espacioId}`: el staff lee, el admin escribe. Sin el validador estricto del árbol nuevo.

| Pantalla | Archivo | Qué lee |
|---|---|---|
| Estudiantes | `src/components/admin/EstudiantesPanel.tsx` | `listarPlanes` + `espaciosDePlan`. Al inscribir copia `plan.orientacion` al estudiante. La columna del directorio muestra `orientacion`. Las equivalencias del alta se arman por `espacio.id`. |
| Usuarios | `src/components/admin/UsuariosPanel.tsx` | Planes y espacios viejos. La asignación es `planId\|espacioId\|año`. Muestra “M8 compartido”. No escribe `docentes.areas`. |
| Planilla docente | `src/components/admin/PlanillaDocente.tsx` | `asignaciones` del docente y `rac/{id}/calificaciones/{espacioId}`. El índice es `indices/{anio}_{planId}_{espacioId}`. |
| RAC | `src/components/admin/RacPanel.tsx` | `listarPlanes` para el nombre. Las filas salen de las calificaciones ya guardadas (`espacioId`, `modulo`, `nombre`). |
| Ciclos | `src/components/admin/CiclosPanel.tsx` | `listarPlanes`. “Generar RAC del ciclo siguiente” usa el plan destino y `planSiguienteId` / espacios del modelo viejo (`src/services/escolar.ts`). |
| Exportar | `src/components/admin/ExportarPanel.tsx` | `listarPlanes` para nombrar `planActualId`. |
| Equivalencias | `src/components/admin/EquivalenciasPanel.tsx` | Calificaciones del RAC (`espacioId`), no el árbol de planes. |
| Reglas de notas | `firestore.rules` `puedeDocenteEditarNota` | El docente edita si tiene `espacios[planId\|espacioId\|anio]` o si la nota es `compartidoM8` y `ensenaM8`. No mira `planesEstudio`. |

El estudiante guarda `planActualId` y `orientacion` (`src/domain/types.ts`, `EstudiantePublico` y `ResumenItem`). Eso sale del plan viejo en el momento del alta. Cambiar el catálogo después no reescribe fichas ya guardadas.

### 5. Tests de este PR

- `tests/planes-estudio.test.ts`: orientación obligatoria, plan sin niveles, el dominio no menciona `PLANES_SEDE` ni `cargarPlanesSede`, nivel con código y año, lista `AREAS_SUGERIDAS`, código `n.m`, id de calificación estable al renombrar, `compartidoM8` copiado desde `comparteEntreNiveles`.
- `tests/planes-estudio-reglas.test.ts`: alta vacía, nivel/módulo/materia, lectura lee, docente solo su `areas`, módulo `enUso` no se borra ni se apaga. Proyecto `demo-ceija`.

`npm run test:rules` y `npm run test:domain` también cubren el modelo viejo. Esos tests tienen que seguir pasando cuando se cambie solo el árbol nuevo.

### 6. Datos ya cargados

Este PR no está desplegado. `planesEstudio` no debería tener documentos reales en `ceija12resm`. Lo que haya en el emulador local es de prueba y se puede descartar. No hace falta un script que copie `niveles` → `anios` en producción. No se corre nada contra el proyecto real.

## Brecha

| Pedido | Hoy en este PR | Hoy en las pantallas viejas |
|---|---|---|
| Plan con nombre, validez nacional y resolución | El alta pide orientación, resolución y validez. No hay `nombre`. El título es la orientación. | `Plan` tiene `nombre` y también `orientacion`, `codigo`, `anioPlan`, `ciclo` y dos resoluciones. |
| Orientación fuera del plan | Es obligatoria en el documento, en las reglas y en los tests. | Sigue en el plan viejo y se copia al estudiante. |
| Debajo, planes o años, con el nombre que elija la persona | Subcolección `niveles`, con código, año de cursada 1–9 y nombre. La ayuda dice que A es 1°, B es 2° y C es 3°. | Tres planes fijos A/B/C, cada uno es un documento `planes/{id}`, no un hijo de un plan de estudio. |
| Sin entidad “nivel” | `NivelEstudio` es la entidad del medio. | No hay niveles; el “año” está metido en el id y en `anioPlan`. |
| Módulos dentro de ese plan/año | `modulos` cuelgan del nivel. El nombre es libre. Esto está cerca del pedido. | `modulo` es un texto en el espacio (`M1`…`M9`), no un documento. |
| Asignaturas, también llamadas áreas | `materias` con nombre **y** un área aparte (`area` + `areaNombre`). El docente del árbol nuevo se asignaría por esa clave, no por la materia. | El espacio tiene `nombre` y `area` distintos (“Matemática” / “Exactas”). El docente se asigna por espacio, no por área. |
| Carga manual, sin seed | La pantalla nueva no siembra. Igual hay catálogo fijo en `PLANES_SEDE`, seed del emulador, migración, landing y `AREAS_SUGERIDAS`. | `cargarPlanesSede` escribe A/B/C si faltan. |

## Modelo propuesto

Subcolecciones, no un solo documento con arrays. En el plan Spark no hay Cloud Functions: las reglas tienen que poder mirar cada pieza. Un documento embebido sería una lectura sola, pero cada corrección reescribe el plan entero, dos personas no pueden editar dos asignaturas a la vez, y la regla tendría que revalidar todo el árbol para borrar una asignatura. El tope de 1 MiB del documento también queda cerca si el plan crece. Con subcolecciones, abrir un plan son unas pocas decenas de lecturas (un plan, sus planes/años, los módulos de cada uno y las asignaturas de cada módulo). Para la sede alcanza, y es el mismo esquema que ya usa este PR.

Ids opacos en todos los niveles. El nombre se puede corregir. El id no.

```
planesEstudio/{planId}
  nombre, validezNacional, resolucion
  activo, enUso, creadoPor, fechaCreacion

  anios/{anioId}                         ← en la pantalla: “Planes o años”
    nombre, orden, enUso

    modulos/{moduloId}
      nombre, orden, enUso

      asignaturas/{asignaturaId}
        nombre, orden, codigo, activo, enUso
```

`anios` es el nombre del path para no chocar con la colección vieja `planes` ni con el padre `planesEstudio`. En la interfaz no aparece la palabra “nivel” ni el id `anios`.

### Campos

**Plan de estudio**

- `nombre`: texto obligatorio, una línea, hasta 160. Es el título.
- `validezNacional`: texto obligatorio, misma regla.
- `resolucion`: texto obligatorio, misma regla.
- `activo`: bool. En `false`, no entra en altas nuevas cuando esas pantallas pasen a este árbol. Sigue visible para el admin.
- `enUso`: bool. Lo pone en `true` el día en que una inscripción o una nota apunte a este plan. En este tramo de jerarquía ese cable **no se conecta** (igual que hoy). La regla ya impide apagarlo y borrar.
- `creadoPor`, `fechaCreacion`: se fijan al crear y no se editan.

No van `orientacion`, `codigo`, `anioPlan`, `ciclo` ni `version`.

**Plan o año** (`anios`)

- `nombre`: obligatorio. “Plan A”, “1° año”, o el texto que use secretaría.
- `orden`: entero 1–99, para listar sin depender del alfabeto.
- `enUso`: igual que arriba.

No van `codigo` ni `anioCurso`. El orden alcanza para saber cuál va primero cuando, más adelante, se rearme “el ciclo siguiente”. Hoy ese salto está hardcodeado en `planSiguienteId` y no se toca en este tramo.

**Módulo**

- `nombre`, `orden`, `enUso`. Igual que ahora. El nombre puede ser “1”, “Módulo 1” o “Módulo 8”: lo escribe secretaría.

**Asignatura** (la misma cosa que el área)

- `nombre`: obligatorio. Es lo que ve el docente y lo que se copia a la nota.
- `orden`.
- `codigo`: opcional, vacío o `n.m` (D4).
- `activo`: si está en `false`, no entra en RAC nuevos; no se borra la historia.
- `enUso`.

No van `area`, `areaNombre` ni `comparteEntreNiveles` (D3 y D5).

La asignatura **es** el área a los efectos de la asignación. Cuando se migre Usuarios, la clave del docente apunta al id opaco de la asignatura (estable aunque le cambien el nombre), no a un slug del nombre y no a la lista Matemática/Naturales/…. Hasta ese día, `docentes.areas` queda sin escritor y sin lector de pantalla. Las reglas nuevas de `asignaturas` dejan de exigir `areaAsignada`: admin y lectura leen; el docente no lista este árbol hasta que la planilla lo use. Así no queda una regla que mira un mapa que nadie carga.

`copiaParaCalificacion` pasa a copiar `asignaturaId` también en `espacioId`, y el nombre del módulo en `modulo`, para que el día que el RAC lea este árbol el documento de la nota siga teniendo la forma actual. No se llama desde inscripción en este tramo.

### Integridad

- Borrar plan, plan/año, módulo o asignatura solo si `enUso` no es `true` y ningún hijo está en uso. Si ya hay notas o inscripciones, el botón no está: se desactiva (`activo: false` en plan o asignatura).
- Editar un plan ya usado: se puede cambiar nombre, resolución, validez, nombres, orden, código y `activo`. No se puede cambiar el id. Las notas ya guardadas conservan el nombre que se copió al abrir el RAC. Las notas nuevas usan el nombre vigente.
- `enUso` no vuelve a `false`. Hoy nada lo pone en `true`. Sigue siendo un hueco: hay que marcarlo en el mismo paso en que se escriba la primera nota o la inscripción (plan, plan/año, módulo y asignatura juntos, porque las reglas no pueden listar hijos). Ese cable es un tramo posterior, no este.
- El batch de borrado sigue con tope 450. Un plan de la sede no llega a ese número. Si llegara, el borrado tiene que partirse; no hace falta Cloud Functions.
- No se reescriben `estudiantes`, `rac` ni `calificaciones` al editar el catálogo.

### Qué no se migra en datos

No hay documentos reales de `planesEstudio` publicados. No se escribe un script de migración ni un seed. Si el emulador tiene planes de prueba con `niveles` y `orientacion`, se borran a mano en el emulador o se ignora: son ficticios. No se copia `PLANES_SEDE` al árbol nuevo. No se toca `ceija12resm`.

## Pasos de ejecución

Cada paso deja `npm run lint`, `npm run typecheck`, `npm run test:domain` y `npm run test:rules` en verde. No se despliega.

### Paso 0. Aprobación

Nahuel responde D1–D6. Si cambia una recomendación, se ajusta este documento en la misma rama y recién ahí se codea.

### Paso 1. Dominio

Archivos: `src/domain/planesEstudio.ts`, `tests/planes-estudio.test.ts`.

- Reemplazar `PlanEstudio.orientacion` por `nombre`. `prepararPlanEstudio` exige nombre, validez y resolución.
- Borrar `NivelEstudio`, `DatosNivel`, `prepararNivel`. Agregar el plan/año (`nombre`, `orden`) con los mismos topes de texto y de orden que hoy tiene el módulo.
- Renombrar materia → asignatura en tipos y en `prepararMateria`. Sacar `area`, `areaNombre`, `claveArea` como requisito, `resolverArea`, `AREAS_SUGERIDAS`, `areasDelArbol` y `comparteEntreNiveles`.
- Dejar `codigoMateriaValido` si D4 se aprueba como está.
- `puedeAbrirRacEnNivel` pasa a mirar asignaturas activas del plan/año.
- `copiaParaCalificacion` deja de emitir `compartidoM8` desde un checkbox de área. Hasta que la planilla migre, esa copia puede mandar `compartidoM8: false` fijo, documentado en el test, porque el RAC nuevo todavía no se abre desde este árbol.

Criterio: un plan válido no trae planes/años ni asignaturas. Falta el nombre, la validez o la resolución → error. Un plan/año sin nombre → error. Una asignatura sin área aparte es válida. El id no cambia al renombrar. El fuente del dominio no menciona `PLANES_SEDE`, `cargarPlanesSede` ni `AREAS_SUGERIDAS`.

### Paso 2. Servicio

Archivo: `src/services/planesEstudio.ts`.

- Paths: `anios` y `asignaturas` en lugar de `niveles` y `materias`.
- Altas con `enUso: false`. Los updates no tocan `enUso` ni `creadoPor` ni `fechaCreacion`.
- Borrar sigue leyendo el árbol y rechazando si hay `enUso` en la rama.
- Listado ordenado por `nombre`, no por orientación.

Criterio: crear plan → crear plan/año → crear módulo → crear asignatura, con ids opacos, en el emulador de reglas (lo cubre el paso 3).

### Paso 3. Reglas

Archivos: `firestore.rules`, `tests/planes-estudio-reglas.test.ts`.

- `planEstudioForma`: `nombre` en lugar de `orientacion`. `keys().hasOnly` exacto.
- Reemplazar `nivelEstudioValido` por la forma del plan/año (`nombre`, `orden`, `enUso`).
- `materiaEstudioValida` pasa a la asignatura, sin `area`, `areaNombre` ni `comparteEntreNiveles`.
- Match `anios` / `modulos` / `asignaturas`. Admin escribe. Lectura lee. Docente no lee este árbol en este tramo (D3). Borrar solo si `enUso != true`. `enUso` no retrocede.
- No modificar el match de `planes` / `espacios` ni el de calificaciones.

Criterio: sin los tres datos el create falla. Lectura lee una asignatura. Docente y pendiente no escriben. Un módulo `enUso` no se borra ni se apaga. Un área “nueva” ya no es un caso: el nombre de la asignatura es libre y el test lo muestra con un nombre que no está en ninguna lista fija.

Las reglas siguen siendo un prototipo: hay que revisarlas antes de compartir el proyecto.

### Paso 4. Pantalla

Archivo: `src/components/admin/PlanesPanel.tsx`. El tema y los componentes `src/components/ui` se reutilizan. No se rediseña el resto de la app.

- Alta y edición del plan: Nombre, Validez nacional, Resolución. Sin orientación.
- Sección “Planes o años”. Formulario: nombre y orden. Sin código y sin año de cursada. Sacar la ayuda de “A es 1°, B es 2° y C es 3°” y los placeholders `A` y `1° año`.
- Módulos igual que ahora, colgando del plan/año.
- Asignatura: nombre, orden, código opcional (si D4 sigue), casilla de activa. Sin select de área, sin “Otra área…”, sin “Se comparte entre niveles”.
- Borrar con el mismo diálogo de confirmación, solo si la rama no está en uso.
- Copys en rioplatense, botones en infinitivo (“Agregar plan”, “Agregar módulo”, “Agregar asignatura”).

Criterio manual, contra el emulador, sin sembrar: vacío → alta con los tres campos → un plan/año con el nombre “Plan A” → un módulo → una asignatura → editar el nombre de la asignatura y ver que el id no hace falta mostrarlo y el nombre nuevo queda. No aparece un nivel, ni una orientación, ni una lista de áreas sugeridas.

### Paso 5. Texto para el próximo agente

Archivo: `AGENTS.md`.

Actualizar la tabla y el párrafo de Planes de Estudio: nombre, validez, resolución; hijos “planes o años”; módulos; asignaturas; sin seed; `planesSede.ts` sigue alimentando solo la colección vieja.

### Paso 6. Lo que este tramo no toca

Dejar como están, y verificar que sus tests sigan verdes:

- `src/domain/planesSede.ts`, `src/services/escolar.ts` (`cargarPlanesSede`, `listarPlanes`, `espaciosDePlan`), `scripts/seed-emulador.ts`, `src/domain/migracion.ts`, `src/services/migracion.ts`.
- `src/components/admin/EstudiantesPanel.tsx`, `UsuariosPanel.tsx`, `PlanillaDocente.tsx`, `RacPanel.tsx`, `CiclosPanel.tsx`, `ExportarPanel.tsx`, `EquivalenciasPanel.tsx`.
- `src/content/sedePublica.ts` y `src/components/Landing.tsx`.
- `src/domain/claves.ts`, `src/domain/rac.ts`, reglas de `rac` y de `planes`.
- Tests `tests/domain.test.ts`, `tests/reglas-y-rac.test.ts`, `tests/excel.test.ts`, `tests/migracion.test.ts`, `tests/migracion-emulador.test.ts`.

## Tramo siguiente (no ejecutar con este plan)

Cuando Nahuel pida que las notas y la inscripción usen el árbol nuevo:

1. El alta de estudiante elige un plan de estudio y un plan/año, y abre el RAC con las asignaturas activas. `planActualId` pasa a ser el id del plan/año (o del plan de estudio: **decisión abierta**, porque hoy es un solo id). La columna `orientacion` del estudiante, si sigue, copia el `nombre` del plan, no un campo aparte.
2. Al escribir la primera nota o la inscripción, marcar `enUso` en asignatura, módulo, plan/año y plan en el mismo batch.
3. Usuarios asigna docentes por id de asignatura. Recién ahí la regla del docente vuelve a leer esa asignación. Se deja de usar `docentes.areas` por slug.
4. Planilla, RAC, ciclos, exportar y equivalencias leen el árbol nuevo. Recién ahí se puede dejar de llamar `cargarPlanesSede` desde el seed y la migración, y revisar si `PLANES_SEDE` se archiva.
5. La landing (`sedePublica.ts`) se edita a mano si los textos públicos tienen que coincidir con lo que secretaría cargó. No se generan solos desde Firestore en este sistema (Spark, sin funciones).

## Riesgos

- **Dos currículas a la vez.** Después de este cambio, Planes de Estudio muestra el árbol nuevo y Estudiantes sigue ofreciendo A/B/C viejos si alguien corrió `cargarPlanesSede`. Es el mismo riesgo de hoy. Hay que decirlo en la pantalla o en el manual hasta el tramo siguiente, para que no carguen el plan “de verdad” en un lado y anoten en el otro.
- **`orientacion` en fichas ya existentes.** Vive en `estudiantes` y en el resumen, copiada del plan viejo. Este cambio no las toca. Si más adelante se borra el campo del plan nuevo, esas fichas conservan el texto histórico.
- **Reglas de docente.** Sacar `areaAsignada` de `asignaturas` deja al docente sin lectura de este árbol hasta el tramo de la planilla. Es a propósito: hoy esa regla no tiene datos detrás.
- **Landing y `PLANES_SEDE` desalineados** entre sí y con el ejemplo de Nahuel. Cualquier seed “para que se vea algo” volvería a congelar una de esas versiones. No se hace.
- **Renombrar paths** (`niveles` → `anios`, `materias` → `asignaturas`) rompe documentos de prueba del emulador. No rompe producción mientras el PR no se despliegue. No incluir en el deploy de reglas un borrado de `planes` viejo.
- **“Plan” significa dos cosas** (el plan de estudio y el plan/año de adentro). La pantalla tiene que decir “Plan de estudio” arriba y “Planes o años” en la sección, para que no se mezclen.

## Checklist para aprobar

- [ ] D1. Orientación fuera del plan nuevo, sin campo opcional.
- [ ] D2. Subcolección `anios`, rótulo “Planes o años”, nombre libre, sin código ni año numérico.
- [ ] D3. Asignatura = área. Sin campo de área aparte y sin lista sugerida. El docente se asigna en un tramo posterior, por id.
- [ ] D4. Código `n.m` opcional se queda.
- [ ] D5. No incluir “se comparte entre niveles” / M8 en este cambio.
- [ ] D6. No mover inscripción, planilla ni RAC en este cambio.
- [ ] Sin seed, sin copiar el ejemplo A/B/C, sin desplegar.
