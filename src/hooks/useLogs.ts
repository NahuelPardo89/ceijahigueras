import { useState, useCallback } from 'react';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';

export type LogAction = 'create' | 'update' | 'delete';
export type LogEntity = 'user' | 'student' | 'grade' | 'subject' | 'studyPlan' | 'equivalence';

export interface LogEntry {
  id?: string;
  timestamp: string;
  userId: string;
  userEmail: string | null;
  userRole: string;
  action: LogAction;
  entity: LogEntity;
  entityId: string;
  details?: Record<string, unknown>;
}

export const writeLog = async (
  userId: string,
  userEmail: string | null,
  userRole: string,
  entry: { action: LogAction; entity: LogEntity; entityId: string; details?: Record<string, unknown> }
) => {
  try {
    await addDoc(collection(db, 'logs'), {
      ...entry,
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      userRole,
    });
  } catch (err) {
    console.error('Error creando log:', err);
  }
};

export const useLogs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLog = useCallback(async (entry: Omit<LogEntry, 'id' | 'timestamp' | 'userId' | 'userEmail' | 'userRole'>) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'logs'), {
        ...entry,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        userRole: user.role,
      });
    } catch (err) {
      console.error('Error creando log:', err);
      setError('No se pudo registrar la acción.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getLogsByEntity = useCallback(async (entity: LogEntity, entityId: string): Promise<LogEntry[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'logs'),
        where('entity', '==', entity),
        where('entityId', '==', entityId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry));
    } catch (err) {
      console.error('Error cargando logs:', err);
      setError('No se pudieron cargar los logs.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getLogsByUser = useCallback(async (userId: string): Promise<LogEntry[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'logs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry));
    } catch (err) {
      console.error('Error cargando logs:', err);
      setError('No se pudieron cargar los logs.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { createLog, getLogsByEntity, getLogsByUser, loading, error, clearError };
};

export const logCreate = (entity: LogEntity, entityId: string, details?: Record<string, unknown>) =>
  ({ action: 'create' as LogAction, entity, entityId, details });

export const logUpdate = (entity: LogEntity, entityId: string, details?: Record<string, unknown>) =>
  ({ action: 'update' as LogAction, entity, entityId, details });

export const logDelete = (entity: LogEntity, entityId: string, details?: Record<string, unknown>) =>
  ({ action: 'delete' as LogAction, entity, entityId, details });