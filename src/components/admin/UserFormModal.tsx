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

export const UserFormModal = ({ mode, initialData, onClose, onSuccess }: UserFormModalProps) => {
  const { createUser, updateUser, loading, clearError } = useAuth();
  const [form, setForm] = useState<UserFormData>(initialData ?? INITIAL_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = mode === 'edit';

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (field: keyof UserFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

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
        setSuccessMsg('Usuario actualizado exitosamente ✅');
      } else {
        await createUser(form.email, form.password, form.displayName, form.role);
        setSuccessMsg('Usuario creado exitosamente ✅');
      }
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setLocalError(getFirebaseErrorMessage(err, isEdit ? 'generic' : 'signUp'));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={!successMsg && loading}>
            <X size={20} />
          </button>
        </div>

        {successMsg && (
          <div className="alert alert-success" role="status">
            <CheckCircle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {localError && !successMsg && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            <AlertCircle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{localError}</span>
          </div>
        )}

        {!successMsg && (
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
                    style={{ paddingRight: '48px' }}
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
