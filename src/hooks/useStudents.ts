import { useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, limit, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { useLogs, logCreate, logUpdate, logDelete } from './useLogs';

export type StudentStatus = 'activo' | 'inactivo';
export type StudentModality = 'virtual' | 'presencial';
export type StudentPlan = 'Plan A' | 'Plan B' | 'Plan C';
export type StudentGestion = 'sin cargar' | 'cargado' | 'pase solicitado' | 'invalido';
export type CertificadoPrimaria = 'no corresponde' | 'original' | 'constancia correcta' | 'constancia incorrecta';
export type DocCompleta = 'completa' | 'incompleta';

export interface StudentDocumentation {
  paseProvisorio: boolean;
  paseDefinitivo: boolean;
  fotocopiaDni: boolean;
  cus: boolean;
  certificadoPrimaria: CertificadoPrimaria;
  numeroEquivalencia: string;
  linkTitulo: string;
  documentacionCompleta: DocCompleta;
  observaciones: string;
}

export type StudentRecord = {
  id: string;
  apellido: string;
  nombre: string;
  dni: string;
  cuil: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  estado: StudentStatus;
  planInicial: string;
  planActual: StudentPlan;
  cursado: StudentModality;
  gestion: StudentGestion;
  planId?: string;
  createdAt: string;
  createdBy: string;
} & StudentDocumentation;

export type CreateStudentData = {
  apellido: string;
  nombre: string;
  dni: string;
  cuil: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  estado: StudentStatus;
  planInicial: string;
  planActual: StudentPlan;
  cursado: StudentModality;
  gestion: StudentGestion;
  planId?: string;
} & StudentDocumentation;

export const DEFAULT_DOC: StudentDocumentation = {
  paseProvisorio: false,
  paseDefinitivo: false,
  fotocopiaDni: false,
  cus: false,
  certificadoPrimaria: 'no corresponde',
  numeroEquivalencia: '',
  linkTitulo: '',
  documentacionCompleta: 'incompleta',
  observaciones: '',
};

export const checkFieldUnique = async (field: 'dni' | 'cuil' | 'email', value: string, excludeId?: string): Promise<boolean> => {
  const q = query(collection(db, 'students'), where(field, '==', value));
  const snap = await getDocs(q);
  const match = snap.docs.find(d => d.id !== excludeId);
  return !match;
};

export const useStudents = () => {
  const { user } = useAuth();
  const { createLog } = useLogs();
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
        ...DEFAULT_DOC,
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });
      await createLog(logCreate('student', docRef.id, { apellido: data.apellido, nombre: data.nombre, dni: data.dni }));
      return docRef.id;
    } catch (err) {
      console.error('Error al crear estudiante:', err);
      setError('Error al crear el estudiante.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const updateStudent = useCallback(async (id: string, data: Partial<CreateStudentData>) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para editar estudiantes.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      const prevSnap = await getDoc(doc(db, 'students', id));
      const prevData = prevSnap.data() ?? {};
      await updateDoc(doc(db, 'students', id), data);
      const changed: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        if (prevData[key] !== data[key as keyof typeof data]) {
          changed[key] = data[key as keyof typeof data];
        }
      }
      if (Object.keys(changed).length > 0) {
        await createLog(logUpdate('student', id, changed));
      }
    } catch (err) {
      console.error('Error al actualizar estudiante:', err);
      setError('Error al actualizar el estudiante.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const deleteStudent = useCallback(async (id: string) => {
    if (!user || user.role !== 'Administrador') {
      setError('No tienes permisos para eliminar estudiantes.');
      throw new Error('No autorizado');
    }
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'students', id));
      await createLog(logDelete('student', id));
    } catch (err) {
      console.error('Error al eliminar estudiante:', err);
      setError('Error al eliminar el estudiante.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, createLog]);

  const clearError = useCallback(() => setError(null), []);

  return { getAllStudents, createStudent, updateStudent, deleteStudent, loading, error, clearError };
};
