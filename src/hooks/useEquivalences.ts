import { useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { useLogs, logCreate, logUpdate, logDelete } from './useLogs';

export interface Equivalence {
  id: string;
  studentId: string;
  nombre: string;
  nota: string;
  fecha: string;
  createdAt: string;
}

export interface CreateEquivalenceData {
  studentId: string;
  nombre: string;
  nota: string;
  fecha: string;
}

const FECHA_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

const isValidFechaLocal = (fecha: string): boolean => {
  if (!FECHA_REGEX.test(fecha)) return false;
  const parts = fecha.split('/');
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
};

export const useEquivalences = () => {
  const { user } = useAuth();
  const { createLog } = useLogs();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEquivalencesByStudent = useCallback(async (studentId: string): Promise<Equivalence[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'equivalences'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Equivalence));
    } catch (err) {
      console.error('Error al cargar equivalencias:', err);
      setError('No se pudieron cargar las equivalencias.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createEquivalence = useCallback(async (data: CreateEquivalenceData) => {
    if (!user) throw new Error('Usuario no autenticado');
    if (!data.nombre.trim()) throw new Error('El nombre de la materia es obligatorio.');
    if (!data.nota) throw new Error('Debes seleccionar una nota.');
    if (!isValidFechaLocal(data.fecha)) throw new Error('Fecha inválida. Use formato dd/mm/aaaa.');
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'equivalences'), {
        ...data,
        createdAt: new Date().toISOString(),
      });
      await createLog(logCreate('equivalence', docRef.id, { studentId: data.studentId, nombre: data.nombre, nota: data.nota }));
      return docRef.id;
    } catch (err) {
      console.error('Error al crear equivalencia:', err);
      setError('Error al crear la equivalencia.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const updateEquivalence = useCallback(async (id: string, data: Partial<CreateEquivalenceData>) => {
    if (!user) throw new Error('Usuario no autenticado');
    if (data.nombre !== undefined && !data.nombre.trim()) throw new Error('El nombre de la materia es obligatorio.');
    if (data.fecha !== undefined && !isValidFechaLocal(data.fecha)) throw new Error('Fecha inválida. Use formato dd/mm/aaaa.');
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'equivalences', id), data);
      await createLog(logUpdate('equivalence', id, data));
    } catch (err) {
      console.error('Error al actualizar equivalencia:', err);
      setError('Error al actualizar la equivalencia.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const deleteEquivalence = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'equivalences', id));
      await createLog(logDelete('equivalence', id));
    } catch (err) {
      console.error('Error al eliminar equivalencia:', err);
      setError('Error al eliminar la equivalencia.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const clearError = useCallback(() => setError(null), []);

  return {
    getEquivalencesByStudent, createEquivalence, updateEquivalence, deleteEquivalence,
    loading, error, clearError
  };
};
