import React, { createContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, isMockMode } from '../firebase/config';

// Interfaz unificada de usuario
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isMockMode: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para simular latencia de red
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Claves de localStorage para simular base de datos
const MOCK_USERS_KEY = 'ceija_mock_users';
const CURRENT_MOCK_USER_KEY = 'ceija_current_mock_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar estado de autenticación
  useEffect(() => {
    if (isMockMode) {
      // Recuperar sesión mock guardada si existe
      const savedUser = localStorage.getItem(CURRENT_MOCK_USER_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    } else {
      if (!auth) {
        setError("Error: El cliente de Firebase no pudo inicializarse.");
        setLoading(false);
        return;
      }
      // Escuchar cambios reales de Firebase
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    }
  }, []);

  const clearError = () => setError(null);

  // Obtener usuarios guardados en local en Modo Mock
  const getMockUsers = (): Array<{ email: string; pass: string; name: string; uid: string }> => {
    const data = localStorage.getItem(MOCK_USERS_KEY);
    const usersList = data ? JSON.parse(data) : [];
    
    // Asegurar que exista el usuario administrador predeterminado para pruebas
    const hasAdmin = usersList.some((u: any) => u.email.toLowerCase() === 'admin@ceija.com');
    if (!hasAdmin) {
      const defaultAdmin = {
        email: 'admin@ceija.com',
        pass: 'admin123',
        name: 'Administrador Ceija',
        uid: 'mock-admin-uid-999'
      };
      usersList.push(defaultAdmin);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(usersList));
    }
    
    return usersList;
  };

  // Implementación del inicio de sesión (Sign In)
  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        await sleep(1200); // Simular latencia de red
        const users = getMockUsers();
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!found) {
          throw new Error("auth/user-not-found");
        }
        if (found.pass !== pass) {
          throw new Error("auth/wrong-password");
        }
        
        const loggedUser: AuthUser = {
          uid: found.uid,
          email: found.email,
          displayName: found.name,
        };
        localStorage.setItem(CURRENT_MOCK_USER_KEY, JSON.stringify(loggedUser));
        setUser(loggedUser);
      } else {
        if (!auth) throw new Error("Firebase auth client is not initialized.");
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Ocurrió un error inesperado al iniciar sesión.";
      const errCode = err.code || err.message;
      if (errCode === 'auth/user-not-found' || errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
        errorMsg = "Credenciales incorrectas. Verifica tu correo y contraseña.";
      } else if (errCode === 'auth/invalid-email') {
        errorMsg = "El formato de correo electrónico no es válido.";
      } else if (errCode === 'auth/too-many-requests') {
        errorMsg = "Demasiados intentos fallidos. Cuenta bloqueada temporalmente.";
      }
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Implementación del registro de usuario (Sign Up)
  const signUp = async (email: string, pass: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        await sleep(1500); // Simular guardado en base de datos
        const users = getMockUsers();
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (exists) {
          throw new Error("auth/email-already-in-use");
        }
        
        const newUid = 'mock-uid-' + Math.random().toString(36).substring(2, 11);
        const newUserRecord = { email, pass, name, uid: newUid };
        users.push(newUserRecord);
        localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
        
        const loggedUser: AuthUser = {
          uid: newUid,
          email: email,
          displayName: name,
          createdAt: new Date().toISOString()
        };
        
        localStorage.setItem(CURRENT_MOCK_USER_KEY, JSON.stringify(loggedUser));
        setUser(loggedUser);
      } else {
        if (!auth) throw new Error("Firebase auth client is not initialized.");
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        if (userCred.user) {
          await updateProfile(userCred.user, { displayName: name });
          setUser({
            uid: userCred.user.uid,
            email: userCred.user.email,
            displayName: name,
            photoURL: userCred.user.photoURL,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Ocurrió un error inesperado al registrar el usuario.";
      const errCode = err.code || err.message;
      if (errCode === 'auth/email-already-in-use') {
        errorMsg = "Este correo electrónico ya está registrado.";
      } else if (errCode === 'auth/weak-password') {
        errorMsg = "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
      } else if (errCode === 'auth/invalid-email') {
        errorMsg = "El correo electrónico ingresado no es válido.";
      }
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Implementación del cierre de sesión (Sign Out)
  const signOut = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        await sleep(500);
        localStorage.removeItem(CURRENT_MOCK_USER_KEY);
        setUser(null);
      } else {
        if (!auth) throw new Error("Firebase auth client is not initialized.");
        await firebaseSignOut(auth);
      }
    } catch (err: any) {
      console.error("Sign out error", err);
      setError("Error al cerrar sesión.");
    } finally {
      setLoading(false);
    }
  };

  // Implementación de recuperación de contraseña
  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        await sleep(1000);
        const users = getMockUsers();
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (!exists) {
          throw new Error("auth/user-not-found");
        }
      } else {
        if (!auth) throw new Error("Firebase auth client is not initialized.");
        await sendPasswordResetEmail(auth, email);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Error al intentar enviar el correo de recuperación.";
      const errCode = err.code || err.message;
      if (errCode === 'auth/user-not-found') {
        errorMsg = "No existe ninguna cuenta asociada a este correo.";
      } else if (errCode === 'auth/invalid-email') {
        errorMsg = "El formato de correo electrónico no es válido.";
      }
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Implementación del inicio de sesión con Google (Google Sign In)
  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        await sleep(1000); // Simular latencia de red
        const loggedUser: AuthUser = {
          uid: 'mock-google-uid-' + Math.random().toString(36).substring(2, 11),
          email: 'google.user@ceija.com',
          displayName: 'Usuario Google Mock',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user'
        };
        localStorage.setItem(CURRENT_MOCK_USER_KEY, JSON.stringify(loggedUser));
        setUser(loggedUser);
      } else {
        if (!auth) throw new Error("Firebase auth client is not initialized.");
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Ocurrió un error al iniciar sesión con Google.";
      const errCode = err.code || err.message;
      if (errCode === 'auth/popup-closed-by-user') {
        errorMsg = "El inicio de sesión fue cancelado al cerrar la ventana emergente.";
      } else if (errCode === 'auth/cancelled-popup-request') {
        errorMsg = "La solicitud de inicio de sesión fue cancelada.";
      } else if (errCode === 'auth/popup-blocked') {
        errorMsg = "El navegador bloqueó la ventana emergente de inicio de sesión.";
      }
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isMockMode,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};
