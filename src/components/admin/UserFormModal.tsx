import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../context/AuthContext';
import { X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { EMAIL_REGEX } from '../../utils/constants';
import { getFirebaseErrorMessage } from '../../utils/errors';

interface UserFormData {
  uid?: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

interface UserFormModalProps {
  mode: 'create' | 'edit';
  initialData?: UserFormData;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: UserFormData = {
  email: '',
  password: '',
  displayName: '',
  role: 'Profesor',
};

type SubmitStatus = { type: 'success'; msg: string } | { type: 'error'; msg: string } | null;

export const UserFormModal = ({ mode, initialData, onClose, onSuccess }: UserFormModalProps) => {
  const { createUser, updateUser, loading, clearError } = useAuth();
  const [form, setForm] = useState<UserFormData>(initialData ?? INITIAL_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = mode === 'edit';

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (field: keyof UserFormData, value: string) => {
    const upperFields: (keyof UserFormData)[] = ['displayName', 'email'];
    setForm(prev => ({ ...prev, [field]: upperFields.includes(field) ? value.toUpperCase() : value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitStatus(null);

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
        });
      } else {
        await createUser(form.email, form.password, form.displayName, form.role);
      }
      setSubmitStatus({ type: 'success', msg: isEdit ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente' });
    } catch (err) {
      setSubmitStatus({ type: 'error', msg: getFirebaseErrorMessage(err, isEdit ? 'generic' : 'signUp') });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={loading && !submitStatus}>
            <X size={20} />
          </button>
        </div>

        {localError && !submitStatus && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        {submitStatus ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            {submitStatus.type === 'success' ? (
              <CheckCircle size={64} style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
            ) : (
              <AlertCircle size={64} style={{ color: 'var(--color-danger)', marginBottom: '16px' }} />
            )}
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '24px' }}>
              {submitStatus.msg}
            </p>
            <button
              className="btn-submit"
              onClick={submitStatus.type === 'success' ? onSuccess : () => setSubmitStatus(null)}
              style={{ width: 'auto', padding: '10px 28px' }}
            >
              {submitStatus.type === 'success' ? 'Volver al listado' : 'Intentar de nuevo'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
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

            <div className="form-group">
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
              <div className="form-group">
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

            <div className="form-group">
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
        )}
      </div>
    </div>
  );
};
