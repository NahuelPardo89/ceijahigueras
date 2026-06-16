import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useGrades, isValidFecha, type Grade, type CreateGradeData } from '../../hooks/useGrades';
import { parseDateToDMY } from '../../utils/dates';
import type { Subject } from '../../hooks/useSubjects';
import type { StudentRecord } from '../../hooks/useStudents';
import { X, AlertCircle } from 'lucide-react';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';
import { NOTA_OPTIONS } from '../../utils/constants';

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
  const [selectedModule, setSelectedModule] = useState<number | null>(() => {
    if (initialData) {
      const s = subjects.find(sub => sub.id === initialData.subjectId);
      return s?.modulo ?? null;
    }
    return null;
  });

  const handleChange = (field: keyof CreateGradeData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const uniqueModules = useMemo(() => {
    return [...new Set(subjects.map(s => s.modulo))].sort((a, b) => a - b);
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (selectedModule === null) return [];
    return subjects.filter(s => s.modulo === selectedModule).sort((a, b) => a.order - b.order);
  }, [subjects, selectedModule]);

  const showSubjectSelect = filteredSubjects.length > 1;
  const autoSelectedSubject = filteredSubjects.length === 1 ? filteredSubjects[0] : null;

  useEffect(() => {
    if (autoSelectedSubject) {
      handleChange('subjectId', autoSelectedSubject.id);
    } else if (!showSubjectSelect) {
      handleChange('subjectId', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModule, autoSelectedSubject?.id]);

  const handleModuleChange = (value: string) => {
    const mod = value ? Number(value) : null;
    setSelectedModule(mod);
    if (mod === null) {
      handleChange('subjectId', '');
    } else {
      const subs = subjects.filter(s => s.modulo === mod);
      if (subs.length !== 1) {
        handleChange('subjectId', '');
      }
    }
  };

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
              <label className="form-label" htmlFor="modal-grade-module">Módulo</label>
              <div className="input-container">
                <select
                  id="modal-grade-module"
                  className="role-select"
                  value={selectedModule ?? ''}
                  onChange={e => handleModuleChange(e.target.value)}
                  disabled={loading || isEdit}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="">Seleccionar módulo</option>
                  {uniqueModules.map(m => (
                    <option key={m} value={m}>Módulo {m}</option>
                  ))}
                </select>
              </div>
            </div>

            {showSubjectSelect && (
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
                    {filteredSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {autoSelectedSubject && (
              <div style={{ padding: '0 24px', marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '2px',
                }}>
                  Materia
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--border-glass)',
                }}>
                  Módulo {autoSelectedSubject.modulo} - {autoSelectedSubject.nombre}
                </div>
              </div>
            )}

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
