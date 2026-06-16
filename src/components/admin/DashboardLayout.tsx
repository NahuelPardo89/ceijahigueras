import { useState, useMemo, lazy, Suspense } from 'react';
import { Users, GraduationCap, BarChart3, BookOpen, LogOut, TrendingUp, Search, UserCog } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
const StudentManagement = lazy(() => import('./StudentManagement').then(m => ({ default: m.StudentManagement })));
const StudyPlanManagement = lazy(() => import('./StudyPlanManagement').then(m => ({ default: m.StudyPlanManagement })));
const GradesManagement = lazy(() => import('./GradesManagement').then(m => ({ default: m.GradesManagement })));
const Statistics = lazy(() => import('./Statistics').then(m => ({ default: m.Statistics })));
const StudentDetail = lazy(() => import('./StudentDetail').then(m => ({ default: m.StudentDetail })));
const ProfileSection = lazy(() => import('./ProfileSection').then(m => ({ default: m.ProfileSection })));

type Section = 'usuarios' | 'estudiantes' | 'plan-estudios' | 'calificaciones' | 'estadisticas' | 'detalle-estudiante' | 'perfil';

const allSections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'usuarios', label: 'Gestión de Usuarios', icon: <Users size={18} /> },
  { id: 'estudiantes', label: 'Gestión de Estudiantes', icon: <GraduationCap size={18} /> },
  { id: 'plan-estudios', label: 'Plan de Estudios', icon: <BookOpen size={18} /> },
  { id: 'calificaciones', label: 'Gestión de Calificaciones', icon: <BarChart3 size={18} /> },
  { id: 'estadisticas', label: 'Estadísticas', icon: <TrendingUp size={18} /> },
  { id: 'detalle-estudiante', label: 'Detalle del Estudiante', icon: <Search size={18} /> },
  { id: 'perfil', label: 'Mi Perfil', icon: <UserCog size={18} /> },
];

export const DashboardLayout = () => {
  const { user, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'Administrador';
  const sections = useMemo(() => allSections.filter(s => isAdmin || (s.id !== 'usuarios' && s.id !== 'plan-estudios')), [isAdmin]);
  const [activeSection, setActiveSection] = useState<Section>('calificaciones');

  const currentSection = sections.some(s => s.id === activeSection) ? activeSection : (sections[0]?.id ?? 'calificaciones');

  if (!user) return null;

  const renderContent = () => {
    const fallback = <div className="user-mgmt-loading"><div className="spinner" style={{ width: '22px', height: '22px' }}></div><span>Cargando...</span></div>;
    switch (currentSection) {
      case 'usuarios':
        return <Suspense fallback={fallback}><UserManagement /></Suspense>;
      case 'estudiantes':
        return <Suspense fallback={fallback}><StudentManagement /></Suspense>;
      case 'plan-estudios':
        return <Suspense fallback={fallback}><StudyPlanManagement /></Suspense>;
      case 'calificaciones':
        return <Suspense fallback={fallback}><GradesManagement /></Suspense>;
      case 'estadisticas':
        return <Suspense fallback={fallback}><Statistics /></Suspense>;
      case 'detalle-estudiante':
        return <Suspense fallback={fallback}><StudentDetail /></Suspense>;
      case 'perfil':
        return <Suspense fallback={fallback}><ProfileSection /></Suspense>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-layout">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Abrir menú"
      >
        <div className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
          <span></span><span></span><span></span>
        </div>
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className={`avatar-sm ${user.role === 'Administrador' ? 'avatar-admin' : 'avatar-profesor'}`}>
            {user.displayName
              ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
              : user.email?.substring(0, 2).toUpperCase() ?? 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.displayName || 'Usuario'}</span>
            <span className="sidebar-user-role">{user.role}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(s => (
            <button
              key={s.id}
              className={`sidebar-item ${currentSection === s.id ? 'sidebar-item-active' : ''}`}
              onClick={() => { setActiveSection(s.id); setSidebarOpen(false); }}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item sidebar-signout" onClick={signOut} disabled={loading}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <div className="auth-card content-card">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
