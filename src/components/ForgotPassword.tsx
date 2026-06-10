import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, ArrowLeft, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { EMAIL_REGEX } from '../utils/constants';

interface ForgotPasswordProps {
  onSwitchView: (view: 'login') => void;
}

export const ForgotPassword = ({ onSwitchView }: ForgotPasswordProps) => {
  const { resetPassword, error, loading, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    setSuccess(false);

    if (!email.trim()) {
      setLocalError('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setLocalError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch {
      // El error ya está gestionado por AuthContext
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1>Recuperar Contraseña</h1>
        <p>Te enviaremos las instrucciones de restablecimiento</p>
      </div>

      {success && (
        <div className="alert alert-success" role="status" aria-live="polite">
          <CheckCircle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>Se ha enviado un correo con instrucciones para restablecer tu contraseña.</span>
        </div>
      )}

      {(localError || error) && (
        <div className="alert alert-danger" role="alert" aria-live="assertive">
          <AlertCircle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>{localError || error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '28px' }}>
          <label className="form-label" htmlFor="reset-email">Correo Electrónico</label>
          <div className="input-container">
            <input
              id="reset-email"
              type="email"
              placeholder="tu@correo.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
            <Mail size={18} className="input-icon" />
          </div>
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? (
            <>
              <div className="spinner"></div>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Key size={18} />
              <span>Enviar Instrucciones</span>
            </>
          )}
        </button>
      </form>

      <div className="auth-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <ArrowLeft size={16} style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
        <button
          type="button"
          className="text-link"
          onClick={() => onSwitchView('login')}
          aria-label="Volver al inicio de sesión"
        >
          Volver al Inicio de Sesión
        </button>
      </div>
    </div>
  );
};
