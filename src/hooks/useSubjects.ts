import { useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { useLogs, logCreate, logUpdate, logDelete } from './useLogs';

export type SubjectType = 'basico' | 'atp' | 'orientacion';

export interface Subject {
  id: string;
  nombre: string;
  modulo: number;
  planId: string;
  tipo: SubjectType;
  order: number;
  createdAt: string;
}

export interface CreateSubjectData {
  nombre: string;
  modulo: number;
  planId: string;
  tipo: SubjectType;
  order: number;
}

export const MODULOS_BASICOS = [1, 2, 3, 4, 5, 6, 7];
export const MODULO_ATP = 8;
export const MODULO_ORIENTACION = 9;

export const DEFAULT_SUBJECTS_BASICO = [
  'MATEMÁTICA',
  'LENGUA Y LITERATURA',
  'CIENCIAS NATURALES',
  'CIENCIAS SOCIALES',
  'INGLÉS',
];

export const DEFAULT_SUBJECTS_ATP = [
  'ECONOMÍA',
  'DERECHO DEL TRABAJO',
  'CIUDADANÍA Y PARTICIPACIÓN',
  'FORMACIÓN PROFESIONAL',
  'FORMACIÓN PARA EL TRABAJO',
];

export const DEFAULT_SUBJECTS_ORIENTACION = [
  'ESPACIO DE VINCULACIÓN',
  'ESPACIO DE LA ORIENTACIÓN',
];

export const useSubjects = () => {
  const { user } = useAuth();
  const { createLog } = useLogs();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSubjectsByPlan = useCallback(async (planId: string): Promise<Subject[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'subjects'), where('planId', '==', planId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
    } catch (err) {
      console.error('Error al cargar materias:', err);
      setError('No se pudieron cargar las materias.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubject = useCallback(async (data: CreateSubjectData) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para crear materias.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'subjects'), {
        ...data,
        createdAt: new Date().toISOString(),
      });
      await createLog(logCreate('subject', docRef.id, { nombre: data.nombre, modulo: data.modulo, tipo: data.tipo }));
      return docRef.id;
    } catch (err) {
      console.error('Error al crear materia:', err);
      setError('Error al crear la materia.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const createDefaultSubjects = useCallback(async (planId: string) => {
    if (!user || user.role !== 'Administrador') return;
    setLoading(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const batchItems: { nombre: string; modulo: number; tipo: SubjectType }[] = [];
      const now = new Date().toISOString();

      let order = 0;
      for (const modulo of MODULOS_BASICOS) {
        for (const nombre of DEFAULT_SUBJECTS_BASICO) {
          const ref = doc(collection(db, 'subjects'));
          batch.set(ref, { nombre, modulo, planId, tipo: 'basico', order: order++, createdAt: now });
          batchItems.push({ nombre, modulo, tipo: 'basico' });
        }
      }

      for (const nombre of DEFAULT_SUBJECTS_ATP) {
        const ref = doc(collection(db, 'subjects'));
        batch.set(ref, { nombre, modulo: MODULO_ATP, planId, tipo: 'atp', order: order++, createdAt: now });
        batchItems.push({ nombre, modulo: MODULO_ATP, tipo: 'atp' });
      }

      for (const nombre of DEFAULT_SUBJECTS_ORIENTACION) {
        const ref = doc(collection(db, 'subjects'));
        batch.set(ref, { nombre, modulo: MODULO_ORIENTACION, planId, tipo: 'orientacion', order: order++, createdAt: now });
        batchItems.push({ nombre, modulo: MODULO_ORIENTACION, tipo: 'orientacion' });
      }

      await batch.commit();
      await Promise.all(batchItems.map(item =>
        createLog(logCreate('subject', 'batch', { nombre: item.nombre, modulo: item.modulo, tipo: item.tipo }))
      ));
    } catch (err) {
      console.error('Error al crear materias por defecto:', err);
      setError('Error al crear las materias por defecto.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const updateSubject = useCallback(async (id: string, data: Partial<CreateSubjectData>) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para editar materias.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'subjects', id), data);
      await createLog(logUpdate('subject', id, data));
    } catch (err) {
      console.error('Error al actualizar materia:', err);
      setError('Error al actualizar la materia.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const deleteSubject = useCallback(async (id: string) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para eliminar materias.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'subjects', id));
      await createLog(logDelete('subject', id));
    } catch (err) {
      console.error('Error al eliminar materia:', err);
      setError('Error al eliminar la materia.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const clearError = useCallback(() => setError(null), []);

  return { getSubjectsByPlan, createSubject, createDefaultSubjects, updateSubject, deleteSubject, loading, error, clearError };
};
