import { useState, type FormEvent } from 'react';
import { useEquivalences, type Equivalence, type CreateEquivalenceData } from '../../hooks/useEquivalences';
import type { StudentRecord } from '../../hooks/useStudents';
import { X, AlertCircle } from 'lucide-react';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';

const NOTA_OPTIONS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Aprobado',
];

const parseDateToDMY = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

interface EquivalenceFormModalProps {
  student: StudentRecord;
  initialData?: Equivalence | null;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM = (studentId: string): CreateEquivalenceData => ({
  studentId,
  nombre: '',
  nota: '',
  fecha: parseDateToDMY(new Date()),
});

export const EquivalenceFormModal = ({ student, initialData, onClose, onSuccess }: EquivalenceFormModalProps) => {
  const { toast } = useToast();
  const { createEquivalence, updateEquivalence, loading } = useEquivalences();
  const isEdit = !!initialData;

  const [form, setForm] = useState<CreateEquivalenceData>(initialData ?? INITIAL_FORM(student.id));
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateEquivalenceData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!form.nombre.trim()) {
      setLocalError('Debes ingresar el nombre de la materia.');
      return;
    }
    if (!form.nota) {
      setLocalError('Debes seleccionar una nota.');
      return;
    }

    try {
      if (isEdit && initialData) {
        await updateEquivalence(initialData.id, form);
        toast('Equivalencia actualizada exitosamente');
      } else {
        await createEquivalence(form);
        toast('Equivalencia creada exitosamente');
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
          <h2>{isEdit ? 'Editar Equivalencia' : 'Agregar Equivalencia'}</h2>
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
            <label className="form-label" htmlFor="modal-eq-nombre">Materia</label>
            <div className="input-container">
              <input
                id="modal-eq-nombre"
                type="text"
                className="input-field"
                placeholder="Nombre de la materia"
                value={form.nombre}
                onChange={e => handleChange('nombre', e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '16px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ padding: '0 24px' }}>
            <label className="form-label" htmlFor="modal-eq-nota">Nota</label>
            <div className="input-container">
              <select
                id="modal-eq-nota"
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
            <label className="form-label" htmlFor="modal-eq-fecha">Fecha (dd/mm/aaaa)</label>
            <div className="input-container">
              <input
                id="modal-eq-fecha"
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
