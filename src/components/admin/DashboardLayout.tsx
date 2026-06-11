import { useState, useMemo, lazy, Suspense } from 'react';
import { Users, GraduationCap, BarChart3, FileText, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { SectionPlaceholder } from './SectionPlaceholder';

const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
const StudentManagement = lazy(() => import('./StudentManagement').then(m => ({ default: m.StudentManagement })));
const StudyPlanManagement = lazy(() => import('./StudyPlanManagement').then(m => ({ default: m.StudyPlanManagement })));
const GradesManagement = lazy(() => import('./GradesManagement').then(m => ({ default: m.GradesManagement })));

type Section = 'usuarios' | 'estudiantes' | 'plan-estudios' | 'calificaciones' | 'documentacion';

const allSections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'usuarios', label: 'Gestión de Usuarios', icon: <Users size={18} /> },
  { id: 'estudiantes', label: 'Gestión de Estudiantes', icon: <GraduationCap size={18} /> },
  { id: 'plan-estudios', label: 'Plan de Estudios', icon: <BookOpen size={18} /> },
  { id: 'calificaciones', label: 'Gestión de Calificaciones', icon: <BarChart3 size={18} /> },
  { id: 'documentacion', label: 'Gestión de Documentación', icon: <FileText size={18} /> },
];

const sectionTitles: Record<Section, string> = {
  usuarios: 'Gestión de Usuarios',
  estudiantes: 'Gestión de Estudiantes',
  'plan-estudios': 'Plan de Estudios',
  calificaciones: 'Gestión de Calificaciones',
  documentacion: 'Gestión de Documentación',
};

const sectionDescriptions: Record<Section, string> = {
  usuarios: 'Administra los usuarios del sistema: crea, edita o deshabilita cuentas.',
  estudiantes: 'Gestiona los estudiantes registrados en la institución.',
  'plan-estudios': 'Administra los planes de estudio y sus materias.',
  calificaciones: 'Administra las calificaciones y el rendimiento académico.',
  documentacion: 'Gestiona la documentación y archivos del sistema.',
};

export const DashboardLayout = () => {
  const { user, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'Administrador';
  const sections = useMemo(() => allSections.filter(s => isAdmin || (s.id !== 'usuarios' && s.id !== 'plan-estudios')), [isAdmin]);
  const [activeSection, setActiveSection] = useState<Section>('plan-estudios');

  const currentSection = sections.some(s => s.id === activeSection) ? activeSection : (sections[0]?.id ?? 'plan-estudios');

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
      default:
        return (
          <SectionPlaceholder
            title={sectionTitles[currentSection]}
            description={sectionDescriptions[currentSection]}
          />
        );
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
