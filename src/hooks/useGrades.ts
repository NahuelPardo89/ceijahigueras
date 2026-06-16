import { useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { useLogs, logCreate, logUpdate, logDelete } from './useLogs';

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  planId: string;
  nota: string;
  fecha: string;
  createdAt: string;
}

export interface CreateGradeData {
  studentId: string;
  subjectId: string;
  planId: string;
  nota: string;
  fecha: string;
}

export const parseDMYToDate = (dmy: string): Date | null => {
  const parts = dmy.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y ? date : null;
};

const FECHA_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

export const isValidFecha = (fecha: string): boolean => {
  if (!FECHA_REGEX.test(fecha)) return false;
  const date = parseDMYToDate(fecha);
  return date !== null;
};

export const useGrades = () => {
  const { user } = useAuth();
  const { createLog } = useLogs();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGradesByStudent = useCallback(async (studentId: string): Promise<Grade[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'grades'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Grade));
    } catch (err) {
      console.error('Error al cargar calificaciones:', err);
      setError('No se pudieron cargar las calificaciones.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGradesBySubject = useCallback(async (subjectId: string): Promise<Grade[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'grades'), where('subjectId', '==', subjectId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Grade));
    } catch (err) {
      console.error('Error al cargar calificaciones:', err);
      setError('No se pudieron cargar las calificaciones.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGradesByPlan = useCallback(async (planId: string): Promise<Grade[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'grades'), where('planId', '==', planId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Grade));
    } catch (err) {
      console.error('Error al cargar calificaciones:', err);
      setError('No se pudieron cargar las calificaciones.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGrade = useCallback(async (data: CreateGradeData) => {
    if (!user) throw new Error('Usuario no autenticado');
    if (!isValidFecha(data.fecha)) throw new Error('Fecha inválida. Use formato dd/mm/aaaa.');
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'grades'), {
        ...data,
        createdAt: new Date().toISOString(),
      });
      await createLog(logCreate('grade', docRef.id, { studentId: data.studentId, subjectId: data.subjectId, nota: data.nota }));
      return docRef.id;
    } catch (err) {
      console.error('Error al crear calificación:', err);
      setError('Error al crear la calificación.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const updateGrade = useCallback(async (id: string, data: Partial<CreateGradeData>) => {
    if (!user) throw new Error('Usuario no autenticado');
    if (data.fecha && !isValidFecha(data.fecha)) throw new Error('Fecha inválida. Use formato dd/mm/aaaa.');
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'grades', id), data);
      await createLog(logUpdate('grade', id, data));
    } catch (err) {
      console.error('Error al actualizar calificación:', err);
      setError('Error al actualizar la calificación.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const deleteGrade = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'grades', id));
      await createLog(logDelete('grade', id));
    } catch (err) {
      console.error('Error al eliminar calificación:', err);
      setError('Error al eliminar la calificación.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const clearError = useCallback(() => setError(null), []);

  return {
    getGradesByStudent, getGradesBySubject, getGradesByPlan,
    createGrade, updateGrade, deleteGrade, loading, error, clearError
  };
};