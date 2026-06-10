import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'login' | 'forgot-password'>('login');

  if (loading && !user) {
    return (
      <div className="loader-container">
        <div className="pulse-loader"></div>
        <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--color-text-secondary)' }}>
          Verificando credenciales...
        </p>
      </div>
    );
  }

  return user ? (
    <Dashboard />
  ) : (
    <div className="app-container">
      {view === 'login' && (
        <Login onSwitchView={setView} />
      )}
      {view === 'forgot-password' && (
        <ForgotPassword onSwitchView={() => setView('login')} />
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
