import { useState, type FormEvent } from 'react';
import { AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { EMAIL_REGEX } from '../utils/constants';

interface Props {
  onBack: () => void;
}

export const SolicitarAcceso = ({ onBack }: Props) => {
  const { signUp, error, loading, clearError } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    clearError();
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      setLocalError('Completa nombre, correo y contraseña.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setLocalError('Ingresa un correo válido.');
      return;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      await signUp(email.trim(), password, nombre.trim());
    } catch {
      // AuthContext ya muestra el error.
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1>Solicitar acceso</h1>
        <p>La cuenta se crea como pendiente. No queda habilitada hasta que un administrador la apruebe.</p>
      </div>
      {(localError || error) && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={20} />
          <span>{localError || error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="nombre-acceso">Nombre y apellido</label>
          <input id="nombre-acceso" className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={loading} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email-acceso">Correo</label>
          <input id="email-acceso" type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="pass-acceso">Contraseña</label>
          <input id="pass-acceso" type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        </div>
        <button className="btn-submit" type="submit" disabled={loading}>
          <UserPlus size={18} />
          <span>{loading ? 'Enviando...' : 'Crear solicitud'}</span>
        </button>
      </form>
      <button type="button" className="text-link" onClick={onBack} style={{ marginTop: 16 }}>
        Volver al ingreso
      </button>
    </div>
  );
};
