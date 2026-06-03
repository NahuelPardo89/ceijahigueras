import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, ArrowLeft, Key, AlertCircle, CheckCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onSwitchView: (view: 'login') => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSwitchView }) => {
  const { resetPassword, error, loading, isMockMode, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      // El error de Firebase ya está gestionado por el AuthContext
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div style={{ marginBottom: '12px' }}>
          {isMockMode ? (
            <span className="badge-mock">Modo Mock Activo</span>
          ) : (
            <span className="badge-firebase">Conectado a Firebase</span>
          )}
        </div>
        <h1>Recuperar Contraseña</h1>
        <p>Te enviaremos las instrucciones de restablecimiento</p>
      </div>

      {success && (
        <div className="alert alert-success" role="status" aria-live="polite">
          <CheckCircle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>
            {isMockMode 
              ? '¡Correo de prueba enviado! En el Modo Mock, simulamos el envío con éxito.' 
              : 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.'}
          </span>
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
