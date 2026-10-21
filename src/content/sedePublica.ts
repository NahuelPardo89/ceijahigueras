/**
 * Contenido de la página pública de inicio.
 * Editar aquí los textos y los datos de contacto. No incluir datos de estudiantes.
 *
 * Identidad, Región 4, CUE y código de empresa: datos de la sede.
 * Correo, dirección, orientación única y las dos modalidades: datos de la sede.
 * Planes A/B/C y espacios: Anexo II de la Res. 001/2020 y Res. 698/2017 y 1206/2017
 * (orientación Economía y Administración, Res. 1206/2017; ciclos Res. 84/2011 y 148/2013).
 * No se publican teléfono, horario ni inscripción: la sede no los informó.
 */

export interface PlanPublico {
  codigo: 'A' | 'B' | 'C';
  anio: string;
  ciclo: string;
  modulos: string;
  espacios: string[];
}

export interface DatoContacto {
  etiqueta: string;
  valor: string;
  href?: string;
}

export const sedePublica = {
  acceso: {
    etiqueta: 'Entrar al sistema',
  },
  identidad: {
    nombre: 'CEIJA N° 12',
    epiteto: 'Remedios Escalada de San Martín',
    sede: 'Las Higueras',
    ambito: 'CENMA',
    regionDetalle: 'Región 4 de Inspección',
    codigoEmpresa: 'EE0115116',
    cue: '140512501',
    lugar: 'España 36, Las Higueras, provincia de Córdoba, Argentina',
    dependencia:
      'La sede Las Higueras depende del CEIJA N° 12 «Remedios Escalada de San Martín».',
  },
  orientacion: 'Bachiller Orientado en Economía y Administración',
  presentacion: [
    'Secundario para jóvenes y adultos. La sede ofrece dos modalidades: semipresencial y combinada en línea.',
    'La combinada en línea integra la semipresencialidad a distancia con una propuesta en el aula virtual del ISEP y la DGEJyA. Complementa la oferta; no la reemplaza.',
  ],
  modalidades: [
    {
      titulo: 'Semipresencial',
      texto: 'El cursado se organiza en módulos. Cada módulo tiene un Trabajo Práctico Integrador, con resultado Aprobado o Revisar. Aprobarlo habilita la Evaluación Final, que es presencial, obligatoria y la elabora la sede.',
    },
    {
      titulo: 'Combinada en línea',
      texto: 'Programa creado por la Resolución Ministerial 795/2022 para terminar el nivel secundario. Suma el aula virtual a la semipresencialidad a distancia, con la misma evaluación final presencial.',
    },
  ],
  cierreModalidad:
    'Se acredita con 6 o más. Para pasar de un plan al siguiente hay que aprobar todos los espacios del plan. El título es Bachiller Orientado en Economía y Administración. Se ingresa con 18 años cumplidos, o a cumplir durante el año en curso.',
  normas:
    'Régimen de la semipresencialidad: Anexo II de la Resolución 001/2020. Combinada en línea: Resolución Ministerial 795/2022. Planes: Resoluciones 84/2011, 148/2013, 698/2017 y 1206/2017.',
  notaModulos:
    'Los tres planes corresponden a la orientación Economía y Administración. Plan A es el Ciclo Básico; los planes B y C, el Ciclo Orientado.',
  planes: [
    {
      codigo: 'A',
      anio: '1° año',
      ciclo: 'Ciclo Básico',
      modulos: 'Módulos 1, 2 y 3',
      espacios: [
        'Matemática',
        'Interpretación y Producción de Textos',
        'Ciencias Naturales',
        'Ciencias Sociales',
        'Área Técnico Profesional',
      ],
    },
    {
      codigo: 'B',
      anio: '2° año',
      ciclo: 'Ciclo Orientado',
      modulos: 'Módulos 4 y 5',
      espacios: [
        'Matemática',
        'Interpretación y Producción de Textos',
        'Ciencias Naturales',
        'Ciencias Sociales',
        'Área Técnico Profesional',
      ],
    },
    {
      codigo: 'C',
      anio: '3° año',
      ciclo: 'Ciclo Orientado',
      modulos: 'Módulos 6, 7 y 9',
      espacios: [
        'Matemática',
        'Interpretación y Producción de Textos',
        'Ciencias Naturales',
        'Ciencias Sociales',
        'Área Técnico Profesional',
      ],
    },
  ] satisfies PlanPublico[],
  notaTecnico:
    'En 3° año el Área Técnico Profesional es el de Economía y Administración. El Módulo 8, también de esa área, se registra en los tres planes.',
  contacto: {
    titulo: 'Contacto',
    datos: [
      {
        etiqueta: 'Dirección',
        valor: 'España 36, Las Higueras, provincia de Córdoba, Argentina',
      },
      {
        etiqueta: 'Correo',
        valor: 'ee0115116@me.cba.gov.ar',
        href: 'mailto:ee0115116@me.cba.gov.ar',
      },
    ] satisfies DatoContacto[],
  },
};
