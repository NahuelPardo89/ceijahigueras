import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Shield, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';

export const ProfileSection = () => {
  const { toast } = useToast();
  const { user, updateUserPassword, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!currentPassword) {
      setLocalError('Debes ingresar tu contraseña actual.');
      return;
    }
    if (!newPassword) {
      setLocalError('Debes ingresar una nueva contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      setLocalError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await updateUserPassword(currentPassword, newPassword);
      toast('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast(getFirebaseErrorMessage(err, 'generic'), 'error');
    }
  };

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user.email?.substring(0, 2).toUpperCase() ?? 'U';

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Mi Perfil</span>
          </div>
        </div>

        <div className="profile-card" style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '20px 24px', marginBottom: '24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-input)',
          border: '1px solid var(--border-glass)',
        }}>
          <div className={`avatar-sm ${user.role === 'Administrador' ? 'avatar-admin' : 'avatar-profesor'}`}
            style={{ width: '56px', height: '56px', fontSize: '20px' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text-primary)' }}>
              {user.displayName || 'Sin nombre'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
              {user.role}
              <span style={{ color: 'var(--color-text-muted)' }}>&middot;</span>
              {user.email}
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-input)',
          border: '1px solid var(--border-glass)',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} style={{ color: 'var(--accent-primary)' }} />
            Cambiar Contraseña
          </h3>

          {localError && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: '16px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ maxWidth: '420px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="current-pass">Contraseña Actual</label>
              <div className="input-container">
                <input
                  id="current-pass"
                  type={showCurrent ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ paddingRight: '48px', paddingLeft: '16px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label={showCurrent ? 'Ocultar' : 'Mostrar'}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-pass">Nueva Contraseña</label>
              <div className="input-container">
                <input
                  id="new-pass"
                  type={showNew ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  style={{ paddingRight: '48px', paddingLeft: '16px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNew(!showNew)}
                  aria-label={showNew ? 'Ocultar' : 'Mostrar'}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-pass">Confirmar Nueva Contraseña</label>
              <div className="input-container">
                <input
                  id="confirm-pass"
                  type={showNew ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  style={{ paddingLeft: '16px' }}
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading} style={{ width: 'auto', padding: '10px 24px', marginTop: '8px' }}>
              {loading ? (
                <><div className="spinner"></div><span>Actualizando...</span></>
              ) : (
                <span>Actualizar Contraseña</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
