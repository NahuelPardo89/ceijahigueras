import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { Dashboard } from './components/Dashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'login' | 'forgot-password'>('login');

  if (loading) {
    return (
      <div className="loader-container">
        <div className="pulse-loader"></div>
        <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--color-text-secondary)' }}>
          Verificando credenciales...
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {user ? (
        <Dashboard />
      ) : (
        <>
          {view === 'login' && (
            <Login onSwitchView={setView} />
          )}
          {view === 'forgot-password' && (
            <ForgotPassword onSwitchView={() => setView('login')} />
          )}
        </>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
