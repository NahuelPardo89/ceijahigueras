import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudents, type StudentRecord, type CreateStudentData, type StudentStatus, type StudentModality, type StudentPlan, type StudentGestion } from '../../hooks/useStudents';
import { X, AlertCircle } from 'lucide-react';

interface StudentFormModalProps {
  mode: 'create' | 'edit';
  initialData?: StudentRecord;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: CreateStudentData = {
  apellido: '',
  nombre: '',
  dni: '',
  cuil: '',
  fechaNacimiento: '',
  estado: 'activo',
  planInicial: '',
  planActual: 'Plan A',
  cursado: 'presencial',
  gestion: 'cargado',
};

export const StudentFormModal = ({ mode, initialData, onClose, onSuccess }: StudentFormModalProps) => {
  const { user } = useAuth();
  const { createStudent, updateStudent, loading, error, clearError } = useStudents();
  const [form, setForm] = useState<CreateStudentData>(initialData ?? INITIAL_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  const isEdit = mode === 'edit';
  const isAdmin = user?.role === 'Administrador';

  const handleChange = (field: keyof CreateStudentData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!form.apellido.trim()) {
      setLocalError('El apellido es obligatorio.');
      return;
    }
    if (!form.nombre.trim()) {
      setLocalError('El nombre es obligatorio.');
      return;
    }
    if (!form.dni.trim()) {
      setLocalError('El DNI es obligatorio.');
      return;
    }
    if (!form.cuil.trim()) {
      setLocalError('El CUIL es obligatorio.');
      return;
    }
    if (!form.fechaNacimiento) {
      setLocalError('La fecha de nacimiento es obligatoria.');
      return;
    }
    if (!form.planInicial.trim()) {
      setLocalError('El plan inicial es obligatorio.');
      return;
    }

    try {
      if (isEdit && initialData) {
        await updateStudent(initialData.id, form);
      } else {
        await createStudent(form);
      }
      onSuccess();
    } catch {
      // Error handled by hook
    }
  };

  const plans: StudentPlan[] = ['Plan A', 'Plan B', 'Plan C'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Estudiante' : 'Agregar Estudiante'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {(localError || error) && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            <AlertCircle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="modal-apellido">Apellido</label>
              <div className="input-container">
                <input
                  id="modal-apellido"
                  type="text"
                  className="input-field"
                  placeholder="Apellido"
                  value={form.apellido}
                  onChange={e => handleChange('apellido', e.target.value)}
                  disabled={loading || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="modal-nombre">Nombre</label>
              <div className="input-container">
                <input
                  id="modal-nombre"
                  type="text"
                  className="input-field"
                  placeholder="Nombre"
                  value={form.nombre}
                  onChange={e => handleChange('nombre', e.target.value)}
                  disabled={loading || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="modal-dni">DNI</label>
              <div className="input-container">
                <input
                  id="modal-dni"
                  type="text"
                  className="input-field"
                  placeholder="Número de DNI"
                  value={form.dni}
                  onChange={e => handleChange('dni', e.target.value)}
                  disabled={loading || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="modal-cuil">CUIL</label>
              <div className="input-container">
                <input
                  id="modal-cuil"
                  type="text"
                  className="input-field"
                  placeholder="Número de CUIL"
                  value={form.cuil}
                  onChange={e => handleChange('cuil', e.target.value)}
                  disabled={loading || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-fecha">Fecha de Nacimiento</label>
            <div className="input-container">
              <input
                id="modal-fecha"
                type="date"
                className="input-field"
                value={form.fechaNacimiento}
                onChange={e => handleChange('fechaNacimiento', e.target.value)}
                disabled={loading || !isAdmin}
                style={{ paddingLeft: '16px' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="modal-estado">Estado</label>
              <div className="input-container">
                <select
                  id="modal-estado"
                  className="role-select"
                  value={form.estado}
                  onChange={e => handleChange('estado', e.target.value as StudentStatus)}
                  disabled={loading || !isAdmin}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="modal-cursado">Cursado</label>
              <div className="input-container">
                <select
                  id="modal-cursado"
                  className="role-select"
                  value={form.cursado}
                  onChange={e => handleChange('cursado', e.target.value as StudentModality)}
                  disabled={loading || !isAdmin}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-plan-inicial">Plan Inicial</label>
            <div className="input-container">
              <input
                id="modal-plan-inicial"
                type="text"
                className="input-field"
                placeholder="Ej: Plan 2018"
                value={form.planInicial}
                onChange={e => handleChange('planInicial', e.target.value)}
                disabled={loading || !isAdmin}
                style={{ paddingLeft: '16px' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="modal-plan-actual">Plan Actual</label>
              <div className="input-container">
                <select
                  id="modal-plan-actual"
                  className="role-select"
                  value={form.planActual}
                  onChange={e => handleChange('planActual', e.target.value as StudentPlan)}
                  disabled={loading || !isAdmin}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  {plans.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="modal-gestion">Gestión</label>
              <div className="input-container">
                <select
                  id="modal-gestion"
                  className="role-select"
                  value={form.gestion}
                  onChange={e => handleChange('gestion', e.target.value as StudentGestion)}
                  disabled={loading || !isAdmin}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="cargado">Cargado</option>
                  <option value="pase solicitado">Pase Solicitado</option>
                  <option value="invalido">Inválido</option>
                </select>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading} style={{ width: 'auto', padding: '10px 24px' }}>
                {loading ? (
                  <><div className="spinner"></div><span>Guardando...</span></>
                ) : (
                  <span>{isEdit ? 'Guardar Cambios' : 'Crear Estudiante'}</span>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
