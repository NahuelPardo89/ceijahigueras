import { enmascararDni, dniValido, normalizarDni } from './dni';
import { notaValida, NOTA_APROBACION } from './notas';
import { PLANES_SEDE } from './planesSede';
import { normalizarNombre } from './rac';
import type { Condicion, EstadoEstudiante, EstudiantePrivado } from './types';

/**
 * Mapeo del modelo viejo (students, grades, equivalences, subjects, studyPlans)
 * al modelo actual. No lee ni escribe Firestore: lo usa el script y los tests.
 */

export interface DocumentoLegacy {
  id: string;
  datos: Record<string, unknown>;
}

export interface EntradaLegacy {
  students: DocumentoLegacy[];
  grades: DocumentoLegacy[];
  equivalences: DocumentoLegacy[];
  subjects: DocumentoLegacy[];
  studyPlans: DocumentoLegacy[];
  dniIndex: { dni: string; estudianteId: string }[];
}

export interface NotaMigrable {
  espacioId: string;
  notaFinal: number;
  fecha: string;
  tpi: 'APROBADO' | '';
}

export interface EquivalenciaMigrable {
  espacioId: string;
  nota: number;
  fecha: string;
}

export interface FichaMigrable {
  apellido: string;
  nombre: string;
  dni: string;
  tipoDoc: string;
  estado: EstadoEstudiante;
  sede: string;
  cohorte: number;
  condicionIngreso: Condicion;
  linkLegajoDrive: string;
  planId: string;
  anio: number;
  privado: EstudiantePrivado;
  equivalencias: EquivalenciaMigrable[];
  notas: NotaMigrable[];
}

export type DecisionMigracion = 'crear' | 'ya-existe' | 'revisar';

export interface AccionMigracion {
  legacyId: string;
  dniEnmascarado: string;
  apellido: string;
  nombre: string;
  decision: DecisionMigracion;
  motivos: string[];
  estudianteIdExistente?: string;
  ficha?: FichaMigrable;
}

export interface PlanMigracion {
  acciones: AccionMigracion[];
  leidos: number;
  avisos: string[];
}

export interface ArgsMigracion {
  ayuda: boolean;
  emulador: boolean;
  escribir: boolean;
  anio: number | null;
  confirmarProyecto: string;
  confirmarFrase: string;
}

export interface EntornoMigracion {
  FIRESTORE_EMULATOR_HOST?: string;
  GCLOUD_PROJECT?: string;
  FIREBASE_PROJECT?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  CEIJA_MIGRACION_REAL?: string;
}

export type DestinoMigracion =
  | { ok: true; modo: 'emulador' | 'produccion'; escribir: boolean; anio: number; projectId: string }
  | { ok: false; motivo: string };

export const FRASE_PRODUCCION = 'MIGRAR CEIJA';
export const PROYECTO_REAL = 'ceija12resm';
export const MARCA_REAL = 'escribo-en-produccion';

const PLAN_POR_CLAVE: Record<string, string> = {
  a: 'A-698-CB',
  'plan a': 'A-698-CB',
  b: 'B-1206-EyA',
  'plan b': 'B-1206-EyA',
  c: 'C-1206-EyA',
  'plan c': 'C-1206-EyA',
};

const ALIAS_ESPACIO: Record<string, string> = {
  matematica: 'matematica',
  'lengua y literatura': 'lengua',
  lengua: 'lengua',
  'ciencias naturales': 'naturales',
  naturales: 'naturales',
  'ciencias sociales': 'sociales',
  sociales: 'sociales',
  ingles: 'ingles',
  economia: 'economia',
  'derecho del trabajo': 'derecho-trabajo',
  'ciudadania y participacion': 'ciudadania',
  'formacion para el trabajo': 'm8-trabajo',
  'espacio de vinculacion': 'vinculacion',
  'espacio de la orientacion': 'proyecto',
  'proyecto de orientacion': 'proyecto',
  'formacion profesional': 'formacion-profesional',
};

function texto(datos: Record<string, unknown>, clave: string): string {
  const valor = datos[clave];
  return typeof valor === 'string' ? valor.trim() : '';
}

export function parsearNotaLegacy(valor: unknown): number | null {
  if (typeof valor === 'number') return notaValida(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().replace(',', '.');
  if (!limpio || /^aprobado$/i.test(limpio)) return null;
  const nota = Number(limpio);
  if (!Number.isFinite(nota) || !notaValida(nota)) return null;
  return nota;
}

export function fechaLegacyACorta(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  const cruda = valor.trim();
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cruda);
  if (dmy) {
    const dia = Number(dmy[1]);
    const mes = Number(dmy[2]);
    const anio = Number(dmy[3]);
    const fecha = new Date(anio, mes - 1, dia);
    const valida = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    if (!valida) return '';
    return `${dmy[2]}/${dmy[3].slice(2)}`;
  }
  if (/^\d{2}\/\d{2}$/.test(cruda)) return cruda;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(cruda);
  if (iso) return `${iso[2]}/${iso[1].slice(2)}`;
  return '';
}

function planPorTexto(valor: string): string | null {
  if (!valor) return null;
  if (PLANES_SEDE.some((plan) => plan.id === valor)) return valor;
  const clave = normalizarNombre(valor);
  if (PLAN_POR_CLAVE[clave]) return PLAN_POR_CLAVE[clave];
  const letra = /\bplan\s+([abc])\b/.exec(clave);
  if (letra) return PLAN_POR_CLAVE[letra[1]] ?? null;
  return null;
}

export function resolverPlanId(datos: Record<string, unknown>, studyPlans: DocumentoLegacy[]): string | null {
  const candidatos = [texto(datos, 'planId'), texto(datos, 'planActual'), texto(datos, 'planInicial')];
  for (const valor of candidatos) {
    const directo = planPorTexto(valor);
    if (directo) return directo;
  }
  const estudio = studyPlans.find((plan) => plan.id === texto(datos, 'planId'));
  if (!estudio) return null;
  return planPorTexto(texto(estudio.datos, 'nombre'));
}

export function resolverEspacioId(planId: string, nombre: string, subjectId = ''): string | null {
  const plan = PLANES_SEDE.find((item) => item.id === planId);
  if (!plan) return null;
  if (subjectId && plan.espacios.some((espacio) => espacio.id === subjectId)) return subjectId;
  const clave = normalizarNombre(nombre);
  if (!clave) return null;
  const alias = ALIAS_ESPACIO[clave];
  if (alias && plan.espacios.some((espacio) => espacio.id === alias)) return alias;
  if (
    clave === 'formacion profesional'
    && plan.espacios.some((espacio) => espacio.id === 'm8-trabajo')
    && !plan.espacios.some((espacio) => espacio.id === 'formacion-profesional')
  ) {
    return 'm8-trabajo';
  }
  const exacto = plan.espacios.find((espacio) => normalizarNombre(espacio.nombre) === clave);
  return exacto?.id ?? null;
}

function estadoDe(datos: Record<string, unknown>): EstadoEstudiante {
  const estado = texto(datos, 'estado');
  if (estado === 'activo' || estado === 'inactivo' || estado === 'egresado') return estado;
  return 'activo';
}

function condicionDe(datos: Record<string, unknown>): Condicion {
  const valor = texto(datos, 'condicionIngreso');
  if (valor === 'Reg' || valor === 'Prev' || valor === 'Equiv' || valor === 'Lib') return valor;
  return 'Reg';
}

function cohorteDe(datos: Record<string, unknown>, anio: number): number {
  const anioCreacion = /^(\d{4})/.exec(texto(datos, 'createdAt'));
  if (anioCreacion) return Number(anioCreacion[1]);
  return anio;
}

function privadoDe(datos: Record<string, unknown>, dni: string): EstudiantePrivado {
  const documentacion = texto(datos, 'documentacionCompleta');
  return {
    dni,
    dniNormalizado: dni,
    cuil: texto(datos, 'cuil'),
    email: texto(datos, 'email'),
    telefono: texto(datos, 'telefono'),
    fechaNacimiento: texto(datos, 'fechaNacimiento'),
    paseProvisorio: datos.paseProvisorio === true,
    paseDefinitivo: datos.paseDefinitivo === true,
    fotocopiaDni: datos.fotocopiaDni === true,
    cus: datos.cus === true,
    certificadoPrimaria: texto(datos, 'certificadoPrimaria'),
    numeroEquivalencia: texto(datos, 'numeroEquivalencia'),
    linkTitulo: texto(datos, 'linkTitulo'),
    documentacionCompleta: documentacion === 'completa' ? 'completa' : 'incompleta',
    observaciones: texto(datos, 'observaciones'),
  };
}

interface BorradorNotas {
  equivalencias: EquivalenciaMigrable[];
  notas: NotaMigrable[];
  motivos: string[];
}

function armarNotas(
  planId: string,
  studentId: string,
  entrada: EntradaLegacy,
): BorradorNotas {
  const materias = new Map(entrada.subjects.map((materia) => [materia.id, materia]));
  const equivalenciasPorEspacio = new Map<string, EquivalenciaMigrable[]>();
  const notasPorEspacio = new Map<string, NotaMigrable[]>();
  const motivos: string[] = [];

  for (const grade of entrada.grades) {
    if (texto(grade.datos, 'studentId') !== studentId) continue;
    const materia = materias.get(texto(grade.datos, 'subjectId'));
    const nombre = materia ? texto(materia.datos, 'nombre') : '';
    const espacioId = resolverEspacioId(planId, nombre, texto(grade.datos, 'subjectId'));
    if (!espacioId) {
      motivos.push(`No hay espacio en el plan para la materia "${nombre || texto(grade.datos, 'subjectId')}".`);
      continue;
    }
    const nota = parsearNotaLegacy(grade.datos.nota);
    if (nota == null) {
      motivos.push(`La nota de ${nombre || espacioId} no es un número de la escala (1 a 10, de a medio punto).`);
      continue;
    }
    const fecha = fechaLegacyACorta(grade.datos.fecha);
    if (texto(grade.datos, 'fecha') && !fecha) motivos.push(`La fecha de ${nombre || espacioId} no se pudo leer; la nota se copia sin fecha.`);
    const grupo = notasPorEspacio.get(espacioId) ?? [];
    grupo.push({
      espacioId,
      notaFinal: nota,
      fecha,
      tpi: nota >= NOTA_APROBACION ? 'APROBADO' : '',
    });
    notasPorEspacio.set(espacioId, grupo);
  }

  for (const equivalencia of entrada.equivalences) {
    if (texto(equivalencia.datos, 'studentId') !== studentId) continue;
    const nombre = texto(equivalencia.datos, 'nombre');
    const espacioId = resolverEspacioId(planId, nombre);
    if (!espacioId) {
      motivos.push(`No hay espacio para la equivalencia "${nombre}".`);
      continue;
    }
    const nota = parsearNotaLegacy(equivalencia.datos.nota);
    if (nota == null || nota < NOTA_APROBACION) {
      motivos.push(`La equivalencia de ${nombre || espacioId} tiene que ser una nota de ${NOTA_APROBACION} a 10.`);
      continue;
    }
    const grupo = equivalenciasPorEspacio.get(espacioId) ?? [];
    grupo.push({ espacioId, nota, fecha: fechaLegacyACorta(equivalencia.datos.fecha) });
    equivalenciasPorEspacio.set(espacioId, grupo);
  }

  const equivalencias: EquivalenciaMigrable[] = [];
  for (const [espacioId, grupo] of equivalenciasPorEspacio) {
    const mejor = grupo.reduce((actual, candidata) => candidata.nota > actual.nota ? candidata : actual);
    equivalencias.push(mejor);
    if (grupo.length > 1) motivos.push(`Había más de una equivalencia para ${espacioId}; se guarda la nota más alta.`);
    if (notasPorEspacio.has(espacioId)) {
      motivos.push(`También había una nota de cursada en ${espacioId}; se prioriza la equivalencia.`);
      notasPorEspacio.delete(espacioId);
    }
  }

  const notas: NotaMigrable[] = [];
  for (const [espacioId, grupo] of notasPorEspacio) {
    const mejor = grupo.reduce((actual, candidata) => candidata.notaFinal > actual.notaFinal ? candidata : actual);
    notas.push(mejor);
    if (grupo.length > 1) motivos.push(`Había más de una nota para ${espacioId}; se guarda la más alta.`);
  }

  return { equivalencias, notas, motivos };
}

function fichaDe(student: DocumentoLegacy, planId: string, anio: number, dni: string, entrada: EntradaLegacy): { ficha: FichaMigrable; motivos: string[] } {
  const datos = student.datos;
  const notas = armarNotas(planId, student.id, entrada);
  const planInicial = planPorTexto(texto(datos, 'planInicial'));
  if (planInicial && planInicial !== planId) {
    notas.motivos.push('El plan inicial es distinto del plan actual. Solo se abre el RAC del plan actual para este ciclo.');
  }
  return {
    motivos: notas.motivos,
    ficha: {
      apellido: texto(datos, 'apellido'),
      nombre: texto(datos, 'nombre'),
      dni,
      tipoDoc: texto(datos, 'tipoDoc') || 'DNI',
      estado: estadoDe(datos),
      sede: texto(datos, 'sede') || 'Las Higueras',
      cohorte: cohorteDe(datos, anio),
      condicionIngreso: condicionDe(datos),
      linkLegajoDrive: texto(datos, 'linkLegajoDrive'),
      planId,
      anio,
      privado: privadoDe(datos, dni),
      equivalencias: notas.equivalencias,
      notas: notas.notas,
    },
  };
}

export function planificar(entrada: EntradaLegacy, anio: number): PlanMigracion {
  const indexados = new Map(entrada.dniIndex.map((item) => [normalizarDni(item.dni), item.estudianteId]));
  const grupos = new Map<string, DocumentoLegacy[]>();
  for (const student of entrada.students) {
    const dni = normalizarDni(texto(student.datos, 'dni'));
    const clave = dniValido(dni) ? dni : `sin-dni:${student.id}`;
    const grupo = grupos.get(clave) ?? [];
    grupo.push(student);
    grupos.set(clave, grupo);
  }

  const acciones: AccionMigracion[] = [];
  for (const [clave, grupo] of grupos) {
    const repetido = dniValido(clave) && grupo.length > 1;
    for (const student of grupo) {
      const apellido = texto(student.datos, 'apellido');
      const nombre = texto(student.datos, 'nombre');
      const dni = normalizarDni(texto(student.datos, 'dni'));
      const base = {
        legacyId: student.id,
        dniEnmascarado: dni ? enmascararDni(dni) : 'sin DNI',
        apellido,
        nombre,
      };
      if (!dniValido(dni)) {
        acciones.push({ ...base, decision: 'revisar', motivos: ['El DNI no tiene 7 u 8 dígitos.'] });
        continue;
      }
      if (repetido) {
        acciones.push({
          ...base,
          decision: 'revisar',
          motivos: [`El DNI ${enmascararDni(dni)} está repetido en students. Hay que unificarlo a mano antes de migrar.`],
        });
        continue;
      }
      if (!apellido || !nombre) {
        acciones.push({ ...base, decision: 'revisar', motivos: ['Falta apellido o nombre.'] });
        continue;
      }
      const planId = resolverPlanId(student.datos, entrada.studyPlans);
      if (!planId) {
        acciones.push({ ...base, decision: 'revisar', motivos: ['No se pudo emparejar el plan con Plan A, B o C de la sede.'] });
        continue;
      }
      const armada = fichaDe(student, planId, anio, dni, entrada);
      const estudianteIdExistente = indexados.get(dni);
      acciones.push({
        ...base,
        decision: estudianteIdExistente ? 'ya-existe' : 'crear',
        motivos: armada.motivos,
        estudianteIdExistente,
        ficha: armada.ficha,
      });
    }
  }

  const ids = new Set(entrada.students.map((student) => student.id));
  const notasHuerfanas = entrada.grades.filter((grade) => !ids.has(texto(grade.datos, 'studentId'))).length;
  const equivalenciasHuerfanas = entrada.equivalences.filter((item) => !ids.has(texto(item.datos, 'studentId'))).length;
  const avisos: string[] = [];
  if (notasHuerfanas > 0) avisos.push(`Hay ${notasHuerfanas} nota(s) sin estudiante en students.`);
  if (equivalenciasHuerfanas > 0) avisos.push(`Hay ${equivalenciasHuerfanas} equivalencia(s) sin estudiante en students.`);

  acciones.sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es') || a.legacyId.localeCompare(b.legacyId));
  return { acciones, leidos: entrada.students.length, avisos };
}

export function parsearArgs(argv: string[]): ArgsMigracion {
  const args: ArgsMigracion = {
    ayuda: false,
    emulador: false,
    escribir: false,
    anio: null,
    confirmarProyecto: '',
    confirmarFrase: '',
  };
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Argumento no reconocido: ${token}`);
    const clave = token.slice(2);
    const siguiente = argv[i + 1];
    const tomaValor = siguiente !== undefined && !siguiente.startsWith('--');
    if (clave === 'ayuda') args.ayuda = true;
    else if (clave === 'emulador') args.emulador = true;
    else if (clave === 'escribir') args.escribir = true;
    else if (clave === 'dry-run') dryRun = true;
    else if (clave === 'anio' && tomaValor) {
      args.anio = Number(argv[i + 1]);
      i += 1;
    } else if (clave === 'confirmar-proyecto' && tomaValor) {
      args.confirmarProyecto = argv[i + 1];
      i += 1;
    } else if (clave === 'confirmar-frase' && tomaValor) {
      args.confirmarFrase = argv[i + 1];
      i += 1;
    } else if (clave === 'csv') {
      throw new Error('La migración lee las colecciones legacy de Firestore, no un CSV.');
    } else {
      throw new Error(`Argumento no reconocido: ${token}`);
    }
  }
  if (dryRun && args.escribir) throw new Error('Usá --escribir o --dry-run, no los dos.');
  if (dryRun) args.escribir = false;
  return args;
}

export function evaluarDestino(env: EntornoMigracion, args: ArgsMigracion): DestinoMigracion {
  if (args.anio == null || !Number.isInteger(args.anio) || args.anio < 2000 || args.anio > 2100) {
    return { ok: false, motivo: 'Pasá --anio con el ciclo lectivo, por ejemplo --anio 2026.' };
  }
  const projectId = env.GCLOUD_PROJECT || env.FIREBASE_PROJECT || env.GOOGLE_CLOUD_PROJECT || '';
  const host = env.FIRESTORE_EMULATOR_HOST ?? '';
  const pideReal = args.confirmarProyecto.length > 0
    || env.CEIJA_MIGRACION_REAL === MARCA_REAL
    || projectId.includes(PROYECTO_REAL);

  if (pideReal) {
    if (args.emulador || host.startsWith('127.0.0.1') || host.startsWith('localhost') || host.length > 0) {
      return { ok: false, motivo: 'Hay marcas de emulador y de proyecto real juntas. No se conecta a ninguno.' };
    }
    if (env.CEIJA_MIGRACION_REAL !== MARCA_REAL) {
      return { ok: false, motivo: 'Para el proyecto real hace falta CEIJA_MIGRACION_REAL=escribo-en-produccion. Sin eso no se abre ninguna conexión.' };
    }
    if (args.confirmarProyecto !== PROYECTO_REAL) {
      return { ok: false, motivo: 'Falta --confirmar-proyecto ceija12resm.' };
    }
    if (args.confirmarFrase !== FRASE_PRODUCCION) {
      return { ok: false, motivo: 'Falta --confirmar-frase "MIGRAR CEIJA".' };
    }
    if (projectId && projectId !== PROYECTO_REAL) {
      return { ok: false, motivo: `El project id del entorno (${projectId}) no coincide con ceija12resm.` };
    }
    return { ok: true, modo: 'produccion', escribir: args.escribir, anio: args.anio, projectId: PROYECTO_REAL };
  }

  if (!args.emulador) {
    return { ok: false, motivo: 'Falta --emulador. Sin esa marca el script no se conecta.' };
  }
  if (!host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
    return { ok: false, motivo: 'FIRESTORE_EMULATOR_HOST tiene que apuntar a localhost. No se escribe en la nube.' };
  }
  if (!projectId.startsWith('demo-')) {
    return {
      ok: false,
      motivo: projectId
        ? `Project id "${projectId}" no es un proyecto demo. Abortado.`
        : 'Falta el project id demo- (GCLOUD_PROJECT). Abortado.',
    };
  }
  return { ok: true, modo: 'emulador', escribir: args.escribir, anio: args.anio, projectId };
}
