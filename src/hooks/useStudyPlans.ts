import { useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';

export interface StudyPlan {
  id: string;
  nombre: string;
  nivelEducativo: string;
  cohorteInicio: number;
  cohorteFin: number;
  normaJurisdiccional: string;
  validezNacional: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CreateStudyPlanData {
  nombre: string;
  nivelEducativo: string;
  cohorteInicio: number;
  cohorteFin: number;
  normaJurisdiccional: string;
  validezNacional: string;
}

export const useStudyPlans = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAllPlans = useCallback(async (): Promise<StudyPlan[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'studyPlans'), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyPlan));
    } catch (err) {
      console.error('Error al cargar planes de estudio:', err);
      setError('No se pudieron cargar los planes de estudio.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (data: CreateStudyPlanData) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para crear planes de estudio.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'studyPlans'), {
        ...data,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al crear plan de estudio:', err);
      setError('Error al crear el plan de estudio.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePlan = useCallback(async (id: string, data: Partial<CreateStudyPlanData & { active: boolean }>) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para editar planes de estudio.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'studyPlans', id), data);
    } catch (err) {
      console.error('Error al actualizar plan de estudio:', err);
      setError('Error al actualizar el plan de estudio.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deletePlan = useCallback(async (id: string) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para eliminar planes de estudio.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'studyPlans', id));
    } catch (err) {
      console.error('Error al eliminar plan de estudio:', err);
      setError('Error al eliminar el plan de estudio.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  return { getAllPlans, createPlan, updatePlan, deletePlan, loading, error, clearError };
};
