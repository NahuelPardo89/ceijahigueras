import { useState, useMemo, type FormEvent } from 'react';
import { useGrades, isValidFecha, parseDateToDMY, type Grade, type CreateGradeData } from '../../hooks/useGrades';
import type { Subject } from '../../hooks/useSubjects';
import type { StudentRecord } from '../../hooks/useStudents';
import { X, AlertCircle } from 'lucide-react';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';

const NOTA_OPTIONS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Aprobado',
];

interface GradesFormModalProps {
  student: StudentRecord;
  planId: string;
  subjects: Subject[];
  initialData?: Grade | null;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM = (studentId: string, planId: string): CreateGradeData => ({
  studentId,
  subjectId: '',
  planId,
  nota: '',
  fecha: parseDateToDMY(new Date()),
});

export const GradesFormModal = ({ student, planId, subjects, initialData, onClose, onSuccess }: GradesFormModalProps) => {
  const { toast } = useToast();
  const { createGrade, updateGrade, loading } = useGrades();
  const isEdit = !!initialData;

  const [form, setForm] = useState<CreateGradeData>(initialData ?? INITIAL_FORM(student.id, planId));
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateGradeData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => a.modulo - b.modulo || a.order - b.order);
  }, [subjects]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!form.subjectId) {
      setLocalError('Debes seleccionar una materia.');
      return;
    }
    if (!form.nota) {
      setLocalError('Debes seleccionar una nota.');
      return;
    }
    if (!isValidFecha(form.fecha)) {
      setLocalError('La fecha debe tener formato dd/mm/aaaa.');
      return;
    }

    try {
      if (isEdit && initialData) {
        await updateGrade(initialData.id, form);
        toast('Calificación actualizada exitosamente');
      } else {
        await createGrade(form);
        toast('Calificación creada exitosamente');
      }
      onSuccess();
    } catch (err) {
      toast(getFirebaseErrorMessage(err, 'generic'), 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Calificación' : 'Agregar Calificación'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 24px 12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Estudiante: <strong>{student.apellido}, {student.nombre}</strong>
        </div>

        {localError && (
          <div className="alert alert-danger" role="alert" style={{ margin: '0 24px 12px' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ padding: '0 24px' }}>
              <label className="form-label" htmlFor="modal-grade-subject">Materia</label>
              <div className="input-container">
                <select
                  id="modal-grade-subject"
                  className="role-select"
                  value={form.subjectId}
                  onChange={e => handleChange('subjectId', e.target.value)}
                  disabled={loading || isEdit}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="">Seleccionar materia</option>
                  {sortedSubjects.map(s => (
                    <option key={s.id} value={s.id}>Módulo {s.modulo} - {s.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ padding: '0 24px' }}>
              <label className="form-label" htmlFor="modal-grade-nota">Nota</label>
              <div className="input-container">
                <select
                  id="modal-grade-nota"
                  className="role-select"
                  value={form.nota}
                  onChange={e => handleChange('nota', e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="">Seleccionar nota</option>
                  {NOTA_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ padding: '0 24px' }}>
              <label className="form-label" htmlFor="modal-grade-fecha">Fecha (dd/mm/aaaa)</label>
              <div className="input-container">
                <input
                  id="modal-grade-fecha"
                  type="text"
                  className="input-field"
                  placeholder="dd/mm/aaaa"
                  value={form.fecha}
                  onChange={e => handleChange('fecha', e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading} style={{ width: 'auto', padding: '10px 24px' }}>
                {loading ? (
                  <><div className="spinner"></div><span>Guardando...</span></>
                ) : (
                  <span>{isEdit ? 'Guardar Cambios' : 'Agregar'}</span>
                )}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};
