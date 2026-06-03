import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

interface LoginProps {
  onSwitchView: (view: 'forgot-password') => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchView }) => {
  const { signIn, signInWithGoogle, error, loading, isMockMode, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // El error de Firebase ya está gestionado por el AuthContext
    }
  };

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor completa todos los campos.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setLocalError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    try {
      await signIn(email, password);
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
        <h1>Iniciar Sesión</h1>
        <p>Accede a tu cuenta para continuar</p>
      </div>

      {isMockMode && (
        <div className="alert alert-info">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>
            <strong>Sin configurar:</strong> Usa credenciales simuladas. Puedes iniciar sesión con el usuario de prueba predeterminado <code>admin@ceija.com</code> y contraseña <code>admin123</code>.
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
        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo Electrónico</label>
          <div className="input-container">
            <input
              id="email"
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

        <div className="form-group">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <div className="input-container">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
            <Lock size={18} className="input-icon" />
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

        <div className="forgot-link-container">
          <button
            type="button"
            className="text-link"
            onClick={() => onSwitchView('forgot-password')}
            aria-label="Ir a recuperar contraseña"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? (
            <>
              <div className="spinner"></div>
              <span>Ingresando...</span>
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>Ingresar</span>
            </>
          )}
        </button>
      </form>

      <div className="divider">o continuar con</div>

      <div className="social-buttons" style={{ gridTemplateColumns: '1fr' }}>
        <button 
          type="button" 
          className="btn-social"
          style={{ width: '100%' }}
          onClick={handleGoogleClick}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>
    </div>
  );
};
