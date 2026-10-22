import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const PendienteScreen = () => {
  const { user, signOut, loading } = useAuth();
  return (
    <div className="auth-card" style={{ maxWidth: 520 }}>
      <div className="auth-header">
        <ShieldAlert size={36} style={{ color: 'var(--color-warning)' }} />
        <h1>Cuenta pendiente</h1>
        <p>
          {user?.displayName || user?.email}, tu acceso quedó en espera.
          Un administrador tiene que habilitarte como docente, lectura o administrador.
          Hasta entonces no puedes ver datos de estudiantes.
        </p>
      </div>
      <button className="btn-submit" type="button" onClick={signOut} disabled={loading}>
        <LogOut size={18} />
        <span>Cerrar sesión</span>
      </button>
    </div>
  );
};
