/**
 * Contenido de la página pública de inicio.
 * Editar aquí los textos y los datos de contacto. No incluir datos de estudiantes.
 *
 * Identidad, CUE y código de empresa: datos de la sede.
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
    nombre: 'Escuela N° 12 Remedios de Escalada de San Martín de Las Higueras',
    sede: 'Las Higueras',
    codigoEmpresa: 'EE0115116',
    cue: '140512501',
    lugar: 'España 36, Las Higueras, provincia de Córdoba, Argentina',
  },
  orientacion: 'Bachiller Orientado en Economía y Administración',
  presentacion: [
    'Secundario para jóvenes y adultos. La sede ofrece dos modalidades: semipresencial y combinada en línea.',
    'La combinada en línea se cursa a través de la plataforma web Moodle. Complementa la oferta semipresencial; no la reemplaza.',
  ],
  modalidades: [
    {
      titulo: 'Semipresencial',
      texto: 'Cursado día martes y miércoles de 20 a 23 horas.',
    },
    {
      titulo: 'Combinada en línea',
      texto: 'Cursado a través de la plataforma web Moodle.',
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
      modulos: 'Módulos 1, 2, 3 y 8',
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
      modulos: 'Módulos 4, 5 y 8',
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
      modulos: 'Módulos 6, 7, 8 y 9',
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
