import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, Mail, ShieldAlert, Calendar, Database } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, signOut, loading, isMockMode } = useAuth();

  if (!user) return null;

  // Obtener iniciales para el avatar
  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user.email 
      ? user.email.substring(0, 2).toUpperCase() 
      : 'U';

  return (
    <div className="auth-card">
      <div className="dashboard-container">
        <div className="avatar">
          {initials}
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          {isMockMode ? (
            <span className="badge-mock">Modo Mock Activo</span>
          ) : (
            <span className="badge-firebase">Conectado a Firebase</span>
          )}
        </div>

        <h1 style={{ 
          fontSize: '26px', 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #ffffff 40%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '6px'
        }}>
          ¡Hola, {user.displayName || 'Usuario'}!
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14.5px', marginBottom: '24px' }}>
          Has iniciado sesión correctamente.
        </p>

        {isMockMode && (
          <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: '20px' }}>
            <Database size={20} style={{ flexShrink: 0 }} />
            <span>
              Este perfil está almacenado en el <strong>localStorage</strong> de tu navegador en Modo Mock.
            </span>
          </div>
        )}

        <div className="profile-card">
          <div className="profile-item">
            <span className="profile-label">
              <User size={16} style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.7 }} />
              Nombre
            </span>
            <span className="profile-value">{user.displayName || 'No provisto'}</span>
          </div>

          <div className="profile-item">
            <span className="profile-label">
              <Mail size={16} style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.7 }} />
              Correo Electrónico
            </span>
            <span className="profile-value">{user.email}</span>
          </div>

          <div className="profile-item">
            <span className="profile-label">
              <ShieldAlert size={16} style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.7 }} />
              ID de Usuario (UID)
            </span>
            <span className="profile-value" style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.8 }}>
              {user.uid.substring(0, 16)}...
            </span>
          </div>

          {user.createdAt && (
            <div className="profile-item">
              <span className="profile-label">
                <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '6px', opacity: 0.7 }} />
                Fecha Registro
              </span>
              <span className="profile-value">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <button 
          onClick={signOut} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          disabled={loading}
        >
          {loading ? (
            <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'var(--color-text-primary)' }}></div>
          ) : (
            <LogOut size={18} />
          )}
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
