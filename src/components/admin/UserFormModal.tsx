import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudyPlans } from '../../hooks/useStudyPlans';
import { useSubjects, type Subject } from '../../hooks/useSubjects';
import type { UserRole } from '../../context/AuthContext';
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { EMAIL_REGEX } from '../../utils/constants';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';

interface UserFormData {
  uid?: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  subjectIds?: string[];
}

interface UserFormModalProps {
  mode: 'create' | 'edit';
  initialData?: UserFormData & { subjectIds?: string[] };
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: UserFormData = {
  email: '',
  password: '',
  displayName: '',
  role: 'Profesor',
  subjectIds: [],
};

export const UserFormModal = ({ mode, initialData, onClose, onSuccess }: UserFormModalProps) => {
  const { toast } = useToast();
  const { createUser, updateUser, loading, clearError } = useAuth();
  const { getAllPlans } = useStudyPlans();
  const { getSubjectsByPlan } = useSubjects();
  const [form, setForm] = useState<UserFormData>({
    ...INITIAL_FORM,
    ...initialData,
    subjectIds: initialData?.subjectIds ?? [],
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const isEdit = mode === 'edit';
  const isProfesor = form.role === 'Profesor';

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    let cancelled = false;
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const plans = await getAllPlans();
        const results = await Promise.allSettled(plans.map(p => getSubjectsByPlan(p.id)));
        const subs: Subject[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') subs.push(...r.value);
        }
        if (!cancelled) setAllSubjects(subs);
      } catch {
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    };
    loadSubjects();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSubject = (subjectId: string) => {
    setForm(prev => {
      const current = prev.subjectIds ?? [];
      const next = current.includes(subjectId)
        ? current.filter(id => id !== subjectId)
        : [...current, subjectId];
      return { ...prev, subjectIds: next };
    });
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    const upperFields: (keyof UserFormData)[] = ['displayName'];
    const updated = { ...form, [field]: upperFields.includes(field) ? value.toUpperCase() : value };
    if (field === 'role' && value === 'Administrador') {
      updated.subjectIds = [];
    }
    setForm(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!form.displayName.trim()) {
      setLocalError('El nombre es obligatorio.');
      return;
    }
    if (!isEdit && !form.password.trim()) {
      setLocalError('La contraseña es obligatoria.');
      return;
    }
    if (!isEdit && form.password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setLocalError('Ingresa un correo electrónico válido.');
      return;
    }

    try {
      if (isEdit && initialData?.uid) {
        await updateUser(initialData.uid, {
          displayName: form.displayName,
          role: form.role,
          subjectIds: isProfesor ? form.subjectIds : undefined,
        });
      } else {
        await createUser(form.email, form.password, form.displayName, form.role, isProfesor ? form.subjectIds : undefined);
      }
      toast(isEdit ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
      onSuccess();
    } catch (err) {
      toast(getFirebaseErrorMessage(err, isEdit ? 'generic' : 'signUp'), 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {localError && (
          <div className="alert alert-danger" role="alert" style={{ margin: '0 24px 12px' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ padding: '0 24px' }}>
              <label className="form-label" htmlFor="modal-name">Nombre Completo</label>
              <div className="input-container">
                <input
                  id="modal-name"
                  type="text"
                  className="input-field"
                  placeholder="Nombre del usuario"
                  value={form.displayName}
                  onChange={e => handleChange('displayName', e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ padding: '0 24px' }}>
              <label className="form-label" htmlFor="modal-email">Correo Electrónico</label>
              <div className="input-container">
                <input
                  id="modal-email"
                  type="email"
                  className="input-field"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  disabled={loading || isEdit}
                  autoComplete="email"
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            {!isEdit && (
              <div className="form-group" style={{ padding: '0 24px' }}>
                <label className="form-label" htmlFor="modal-password">Contraseña</label>
                <div className="input-container">
                  <input
                    id="modal-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => handleChange('password', e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    style={{ paddingRight: '48px', paddingLeft: '16px' }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ padding: '0 24px' }}>
              <label className="form-label" htmlFor="modal-role">Rol</label>
              <div className="input-container">
                <select
                  id="modal-role"
                  className="role-select"
                  value={form.role}
                  onChange={e => handleChange('role', e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                >
                  <option value="Profesor">Profesor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
            </div>

            {isProfesor && (
              <div className="form-group" style={{ padding: '0 24px' }}>
                <label className="form-label" style={{ marginBottom: '8px' }}>
                  Materias Asignadas {allSubjects.length > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>({form.subjectIds?.length ?? 0} seleccionadas)</span>}
                </label>
                {loadingSubjects ? (
                  <div className="user-mgmt-loading" style={{ padding: '12px 0' }}>
                    <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
                    <span style={{ fontSize: '13px' }}>Cargando materias...</span>
                  </div>
                ) : allSubjects.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No hay materias disponibles. Crea un plan de estudios primero.</p>
                ) : (
                  <div style={{
                    maxHeight: '240px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-input)',
                    padding: '8px',
                    background: 'var(--bg-card)',
                  }}>
                    {Object.entries(
                      allSubjects.reduce((acc, s) => {
                        const key = `plan-${s.planId}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(s);
                        return acc;
                      }, {} as Record<string, Subject[]>)
                    ).map(([planKey, planSubjects]) => (
                      <div key={planKey} style={{ marginBottom: '8px' }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                          padding: '4px 8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          Plan: {planKey}
                        </div>
                        {Object.entries(
                          planSubjects.reduce((acc, s) => {
                            const key = `mod${s.modulo}`;
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(s);
                            return acc;
                          }, {} as Record<string, Subject[]>)
                        ).sort(([a], [b]) => a.localeCompare(b)).map(([modKey, modSubjects]) => (
                          <div key={modKey} style={{ marginBottom: '4px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', padding: '2px 8px' }}>
                              Módulo {modKey.replace('mod', '')}
                            </div>
                            {modSubjects.sort((a, b) => a.order - b.order).map(s => {
                              const checked = form.subjectIds?.includes(s.id) ?? false;
                              return (
                                <label
                                  key={s.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '3px 8px 3px 16px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    borderRadius: '6px',
                                    transition: 'var(--transition-smooth)',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSubject(s.id)}
                                    style={{ accentColor: 'var(--accent-primary)' }}
                                  />
                                  {s.nombre}
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading} style={{ width: 'auto', padding: '10px 24px' }}>
                {loading ? (
                  <><div className="spinner"></div><span>Guardando...</span></>
                ) : (
                  <span>{isEdit ? 'Guardar Cambios' : 'Crear Usuario'}</span>
                )}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};
