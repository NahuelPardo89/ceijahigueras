import { useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';

export type StudentStatus = 'activo' | 'inactivo';
export type StudentModality = 'virtual' | 'presencial';
export type StudentPlan = 'Plan A' | 'Plan B' | 'Plan C';
export type StudentGestion = 'sin cargar' | 'cargado' | 'pase solicitado' | 'invalido';

export interface StudentRecord {
  id: string;
  apellido: string;
  nombre: string;
  dni: string;
  cuil: string;
  fechaNacimiento: string;
  estado: StudentStatus;
  planInicial: string;
  planActual: StudentPlan;
  cursado: StudentModality;
  gestion: StudentGestion;
  createdAt: string;
  createdBy: string;
}

export interface CreateStudentData {
  apellido: string;
  nombre: string;
  dni: string;
  cuil: string;
  fechaNacimiento: string;
  estado: StudentStatus;
  planInicial: string;
  planActual: StudentPlan;
  cursado: StudentModality;
  gestion: StudentGestion;
}

export const useStudents = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAllStudents = useCallback(async (): Promise<StudentRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'students'), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentRecord));
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
      setError('No se pudieron cargar los estudiantes.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStudent = useCallback(async (data: CreateStudentData) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para crear estudiantes.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'students'), {
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });
      return docRef.id;
    } catch (err) {
      console.error('Error al crear estudiante:', err);
      setError('Error al crear el estudiante.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateStudent = useCallback(async (id: string, data: Partial<CreateStudentData>) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para editar estudiantes.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'students', id), data);
    } catch (err) {
      console.error('Error al actualizar estudiante:', err);
      setError('Error al actualizar el estudiante.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteStudent = useCallback(async (id: string) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para eliminar estudiantes.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      console.error('Error al eliminar estudiante:', err);
      setError('Error al eliminar el estudiante.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  return { getAllStudents, createStudent, updateStudent, deleteStudent, loading, error, clearError };
};
