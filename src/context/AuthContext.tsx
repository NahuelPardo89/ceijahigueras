/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
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
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { auth, db, API_KEY } from '../firebase/config';
import { getFirebaseErrorMessage } from '../utils/errors';

export type UserRole = 'Administrador' | 'Profesor';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt?: string;
  role: UserRole;
  disabled?: boolean;
  subjectIds?: string[];
}

export interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  disabled?: boolean;
  subjectIds?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  getAllUsers: () => Promise<UserRecord[]>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  createUser: (email: string, password: string, displayName: string, role: UserRole, subjectIds?: string[]) => Promise<void>;
  updateUser: (uid: string, data: { displayName?: string; role?: UserRole; subjectIds?: string[] }) => Promise<void>;
  disableUser: (uid: string, disabled: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REST_ERROR_MAP: Record<string, string> = {
  'EMAIL_EXISTS': 'auth/email-already-in-use',
  'WEAK_PASSWORD': 'auth/weak-password',
  'INVALID_EMAIL': 'auth/invalid-email',
  'OPERATION_NOT_ALLOWED': 'auth/operation-not-allowed',
  'TOO_MANY_ATTEMPTS_TRY_LATER': 'auth/too-many-requests',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let role: UserRole = 'Profesor';
        let docDisabled = false;
        let subjectIds: string[] | undefined;
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            role = (data.role as UserRole) || 'Profesor';
            docDisabled = data.disabled === true;
            subjectIds = data.subjectIds as string[] | undefined;
          }
        } catch (err) {
          console.warn('No se pudo leer el rol desde Firestore, usando valor por defecto:', err);
        }

        if (docDisabled) {
          setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
          await firebaseSignOut(auth);
          setLoading(false);
          return;
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role,
          disabled: docDisabled,
          subjectIds,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error(err);
      setError(getFirebaseErrorMessage(err, 'signIn'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      if (userCred.user) {
        await updateProfile(userCred.user, { displayName: name });
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email,
          displayName: name,
          role: 'Profesor' as UserRole,
          createdAt: new Date().toISOString(),
          disabled: false,
        });
      }
    } catch (err) {
      console.error(err);
      setError(getFirebaseErrorMessage(err, 'signUp'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error", err);
      setError("Error al cerrar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.error(err);
      setError(getFirebaseErrorMessage(err, 'resetPassword'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const snap = await getDoc(doc(db, 'users', result.user.uid));
        if (!snap.exists()) {
          await setDoc(doc(db, 'users', result.user.uid), {
            email: result.user.email,
            displayName: result.user.displayName,
            role: 'Profesor' as UserRole,
            createdAt: new Date().toISOString(),
            disabled: false,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError(getFirebaseErrorMessage(err, 'signInWithGoogle'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAllUsers = async (): Promise<UserRecord[]> => {
    const q = query(collection(db, 'users'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        role: data.role as UserRole,
        createdAt: data.createdAt ?? '',
        disabled: data.disabled ?? false,
        subjectIds: data.subjectIds as string[] | undefined,
      };
    });
  };

  const updateUserRole = useCallback(async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role });
    if (user?.uid === uid) {
      setUser(prev => prev ? { ...prev, role } : prev);
    }
  }, [user]);

  const createUser = useCallback(async (email: string, password: string, displayName: string, role: UserRole, subjectIds?: string[]) => {
    if (user?.role !== 'Administrador') {
      setError('No tienes permisos para crear usuarios.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const restCode = data.error?.message as string;
        const firebaseCode = REST_ERROR_MAP[restCode] || 'generic';
        throw { code: firebaseCode };
      }

      await setDoc(doc(db, 'users', data.localId), {
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
        disabled: false,
        ...(subjectIds ? { subjectIds } : {}),
      });
    } catch (err) {
      console.error(err);
      setError(getFirebaseErrorMessage(err, 'signUp'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateUser = useCallback(async (uid: string, data: { displayName?: string; role?: UserRole; subjectIds?: string[] }) => {
    const updates: Record<string, unknown> = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.role !== undefined) updates.role = data.role;
    if (data.subjectIds !== undefined) updates.subjectIds = data.subjectIds;
    if (Object.keys(updates).length === 0) return;

    await updateDoc(doc(db, 'users', uid), updates);
    if (user?.uid === uid) {
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.subjectIds !== undefined ? { subjectIds: data.subjectIds } : {}),
        };
      });
    }
  }, [user]);

  const disableUser = useCallback(async (uid: string, disabled: boolean) => {
    setError(null);
    try {
      await updateDoc(doc(db, 'users', uid), { disabled });
      if (user?.uid === uid) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.error('Error al cambiar estado del usuario:', err);
      setError('Error al actualizar el estado del usuario.');
      throw err;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError,
    getAllUsers,
    updateUserRole,
    createUser,
    updateUser,
    disableUser,
  }), [user, loading, error, updateUserRole, createUser, updateUser, disableUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
