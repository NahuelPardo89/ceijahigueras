type ErrorContext = 'signIn' | 'signUp' | 'resetPassword' | 'signInWithGoogle' | 'generic';

function getErrorCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return null;
}

const errorMap: Record<string, Partial<Record<ErrorContext, string>>> = {
  'permission-denied': {
    generic: 'No tienes permisos para realizar esta acción. Contacta al administrador.',
    signUp: 'Error de permisos al crear el usuario. Verifica que tu cuenta tiene rol de Administrador.',
  },
  'auth/user-not-found': {
    signIn: 'Credenciales incorrectas. Verifica tu correo y contraseña.',
    resetPassword: 'No existe ninguna cuenta asociada a este correo.',
  },
  'auth/wrong-password': {
    signIn: 'Credenciales incorrectas. Verifica tu correo y contraseña.',
  },
  'auth/invalid-credential': {
    signIn: 'Credenciales incorrectas. Verifica tu correo y contraseña.',
  },
  'auth/invalid-email': {
    signIn: 'El formato de correo electrónico no es válido.',
    signUp: 'El correo electrónico ingresado no es válido.',
    resetPassword: 'El formato de correo electrónico no es válido.',
  },
  'auth/too-many-requests': {
    signIn: 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.',
  },
  'auth/email-already-in-use': {
    signUp: 'Este correo electrónico ya está registrado.',
  },
  'auth/weak-password': {
    signUp: 'La contraseña es muy débil. Debe tener al menos 6 caracteres.',
  },
  'auth/popup-closed-by-user': {
    signInWithGoogle: 'El inicio de sesión fue cancelado al cerrar la ventana emergente.',
  },
  'auth/cancelled-popup-request': {
    signInWithGoogle: 'La solicitud de inicio de sesión fue cancelada.',
  },
  'auth/popup-blocked': {
    signInWithGoogle: 'El navegador bloqueó la ventana emergente de inicio de sesión.',
  },
};

const fallbackMessages: Record<ErrorContext, string> = {
  signIn: 'Ocurrió un error inesperado al iniciar sesión.',
  signUp: 'Ocurrió un error inesperado al registrar el usuario.',
  resetPassword: 'Error al intentar enviar el correo de recuperación.',
  signInWithGoogle: 'Ocurrió un error al iniciar sesión con Google.',
  generic: 'Ocurrió un error inesperado.',
};

export function getFirebaseErrorMessage(error: unknown, context: ErrorContext = 'generic'): string {
  const code = getErrorCode(error);
  if (code && errorMap[code]?.[context]) {
    return errorMap[code][context]!;
  }
  return fallbackMessages[context];
}
