import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudyPlans, type StudyPlan, type CreateStudyPlanData } from '../../hooks/useStudyPlans';
import { useSubjects } from '../../hooks/useSubjects';
import { X, AlertCircle } from 'lucide-react';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';

interface StudyPlanFormModalProps {
  mode: 'create' | 'edit';
  initialData?: StudyPlan;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: CreateStudyPlanData = {
  nombre: '',
  nivelEducativo: 'Educación Secundaria Completa',
  cohorteInicio: new Date().getFullYear(),
  cohorteFin: new Date().getFullYear() + 5,
  normaJurisdiccional: '',
  validezNacional: '',
};

export const StudyPlanFormModal = ({ mode, initialData, onClose, onSuccess }: StudyPlanFormModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createPlan, updatePlan, loading } = useStudyPlans();
  const { createDefaultSubjects, loading: loadingSubjects } = useSubjects();
  const isSaving = loading || loadingSubjects;
  const [form, setForm] = useState<CreateStudyPlanData>(initialData ?? INITIAL_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  const isEdit = mode === 'edit';
  const isAdmin = user?.role === 'Administrador';

  const handleChange = (field: keyof CreateStudyPlanData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!form.nombre.trim()) {
      setLocalError('El nombre del plan es obligatorio.');
      return;
    }
    if (!form.normaJurisdiccional.trim()) {
      setLocalError('La norma jurisdiccional es obligatoria.');
      return;
    }
    if (!form.validezNacional.trim()) {
      setLocalError('La resolución de validez nacional es obligatoria.');
      return;
    }

    try {
      if (isEdit && initialData) {
        await updatePlan(initialData.id, form);
        toast('Plan de estudio actualizado exitosamente');
      } else {
        const planId = await createPlan(form);
        try {
          await createDefaultSubjects(planId);
          toast('Plan de estudio creado exitosamente con las materias por defecto');
        } catch {
          toast('Plan creado, pero hubo un error al crear las materias por defecto.', 'error');
        }
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
          <h2>{isEdit ? 'Editar Plan de Estudio' : 'Crear Plan de Estudio'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={isSaving}>
            <X size={20} />
          </button>
        </div>

        {localError && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="modal-plan-nombre">Nombre del Plan</label>
              <div className="input-container">
                <input
                  id="modal-plan-nombre"
                  type="text"
                  className="input-field"
                  placeholder="Ej: Plan 2022-2027"
                  value={form.nombre}
                  onChange={e => handleChange('nombre', e.target.value.toUpperCase())}
                  disabled={isSaving || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="modal-plan-nivel">Nivel Educativo</label>
              <div className="input-container">
                <input
                  id="modal-plan-nivel"
                  type="text"
                  className="input-field"
                  placeholder="Educación Secundaria Completa"
                  value={form.nivelEducativo}
                  onChange={e => handleChange('nivelEducativo', e.target.value)}
                  disabled={isSaving || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="modal-plan-cohorte-inicio">Cohorte Inicio</label>
                <div className="input-container">
                  <input
                    id="modal-plan-cohorte-inicio"
                    type="number"
                    className="input-field"
                    value={form.cohorteInicio}
                    onChange={e => handleChange('cohorteInicio', parseInt(e.target.value) || 0)}
                    disabled={isSaving || !isAdmin}
                    style={{ paddingLeft: '16px' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-plan-cohorte-fin">Cohorte Fin</label>
                <div className="input-container">
                  <input
                    id="modal-plan-cohorte-fin"
                    type="number"
                    className="input-field"
                    value={form.cohorteFin}
                    onChange={e => handleChange('cohorteFin', parseInt(e.target.value) || 0)}
                    disabled={isSaving || !isAdmin}
                    style={{ paddingLeft: '16px' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="modal-plan-norma">Norma Jurisdiccional de Aprobación</label>
              <div className="input-container">
                <input
                  id="modal-plan-norma"
                  type="text"
                  className="input-field"
                  placeholder="Ej: RM N° 255 Año 2023"
                  value={form.normaJurisdiccional}
                  onChange={e => handleChange('normaJurisdiccional', e.target.value)}
                  disabled={isSaving || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="modal-plan-validez">Validez Nacional</label>
              <div className="input-container">
                <input
                  id="modal-plan-validez"
                  type="text"
                  className="input-field"
                  placeholder="Ej: RM N° 1844 Año 2023"
                  value={form.validezNacional}
                  onChange={e => handleChange('validezNacional', e.target.value)}
                  disabled={isSaving || !isAdmin}
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving} style={{ width: 'auto', padding: '10px 24px' }}>
                  {isSaving ? (
                    <><div className="spinner"></div><span>Guardando...</span></>
                  ) : (
                    <span>{isEdit ? 'Guardar Cambios' : 'Crear Plan'}</span>
                  )}
                </button>
              </div>
            )}
          </form>
      </div>
    </div>
  );
};
