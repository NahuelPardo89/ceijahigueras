import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Landing } from './components/Landing';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

type View = 'landing' | 'login' | 'forgot-password';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('landing');

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

  if (user) return <Dashboard />;

  switch (view) {
    case 'landing':
      return <Landing onEnter={() => setView('login')} />;
    case 'login':
      return <Login onSwitchView={setView} />;
    case 'forgot-password':
      return <ForgotPassword onSwitchView={() => setView('login')} />;
    default:
      return null;
  }
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
