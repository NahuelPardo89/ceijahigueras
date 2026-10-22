import { useMemo, useState, lazy, Suspense } from 'react';
import { Users, GraduationCap, BookOpen, ClipboardList, ArrowLeftRight, CalendarRange, FileSpreadsheet, LogOut, UserCog, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { esAdmin, esDocente, etiquetaRol } from '../../domain/roles';

const UsuariosPanel = lazy(() => import('./UsuariosPanel').then(m => ({ default: m.UsuariosPanel })));
const EstudiantesPanel = lazy(() => import('./EstudiantesPanel').then(m => ({ default: m.EstudiantesPanel })));
const PlanesPanel = lazy(() => import('./PlanesPanel').then(m => ({ default: m.PlanesPanel })));
const RacPanel = lazy(() => import('./RacPanel').then(m => ({ default: m.RacPanel })));
const PlanillaDocente = lazy(() => import('./PlanillaDocente').then(m => ({ default: m.PlanillaDocente })));
const EquivalenciasPanel = lazy(() => import('./EquivalenciasPanel').then(m => ({ default: m.EquivalenciasPanel })));
const PasesPanel = lazy(() => import('./PasesPanel').then(m => ({ default: m.PasesPanel })));
const CiclosPanel = lazy(() => import('./CiclosPanel').then(m => ({ default: m.CiclosPanel })));
const ExportarPanel = lazy(() => import('./ExportarPanel').then(m => ({ default: m.ExportarPanel })));
const ProfileSection = lazy(() => import('./ProfileSection').then(m => ({ default: m.ProfileSection })));
const UsoDatos = lazy(() => import('./UsoDatos').then(m => ({ default: m.UsoDatos })));

type Section = 'usuarios' | 'estudiantes' | 'planes' | 'rac' | 'planilla' | 'equivalencias' | 'pases' | 'ciclos' | 'exportar' | 'perfil' | 'datos';

const CATALOGO: { id: Section; label: string; icon: React.ReactNode; roles: Array<'admin' | 'docente' | 'lectura'> }[] = [
  { id: 'usuarios', label: 'Usuarios', icon: <Users size={18} />, roles: ['admin'] },
  { id: 'estudiantes', label: 'Estudiantes', icon: <GraduationCap size={18} />, roles: ['admin', 'lectura'] },
  { id: 'planes', label: 'Planes y espacios', icon: <BookOpen size={18} />, roles: ['admin'] },
  { id: 'rac', label: 'RAC', icon: <ClipboardList size={18} />, roles: ['admin', 'lectura'] },
  { id: 'planilla', label: 'Planilla docente', icon: <ClipboardList size={18} />, roles: ['admin', 'docente'] },
  { id: 'equivalencias', label: 'Equivalencias', icon: <ArrowLeftRight size={18} />, roles: ['admin', 'lectura'] },
  { id: 'pases', label: 'Pases', icon: <ArrowLeftRight size={18} />, roles: ['admin', 'lectura'] },
  { id: 'ciclos', label: 'Ciclos', icon: <CalendarRange size={18} />, roles: ['admin'] },
  { id: 'exportar', label: 'Exportar', icon: <FileSpreadsheet size={18} />, roles: ['admin', 'lectura'] },
  { id: 'datos', label: 'Uso de datos', icon: <Shield size={18} />, roles: ['admin', 'docente', 'lectura'] },
  { id: 'perfil', label: 'Mi perfil', icon: <UserCog size={18} />, roles: ['admin', 'docente', 'lectura'] },
];

export const DashboardLayout = () => {
  const { user, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const rol = esAdmin(user?.role) ? 'admin' : esDocente(user?.role) ? 'docente' : 'lectura';
  const sections = useMemo(() => CATALOGO.filter((item) => item.roles.includes(rol)), [rol]);
  const [activeSection, setActiveSection] = useState<Section>(rol === 'docente' ? 'planilla' : 'estudiantes');
  const currentSection = sections.some((item) => item.id === activeSection) ? activeSection : (sections[0]?.id ?? 'perfil');

  if (!user) return null;

  const renderContent = () => {
    const fallback = <div className="user-mgmt-loading"><div className="spinner" style={{ width: 22, height: 22 }} /><span>Cargando...</span></div>;
    switch (currentSection) {
      case 'usuarios': return <Suspense fallback={fallback}><UsuariosPanel /></Suspense>;
      case 'estudiantes': return <Suspense fallback={fallback}><EstudiantesPanel /></Suspense>;
      case 'planes': return <Suspense fallback={fallback}><PlanesPanel /></Suspense>;
      case 'rac': return <Suspense fallback={fallback}><RacPanel /></Suspense>;
      case 'planilla': return <Suspense fallback={fallback}><PlanillaDocente /></Suspense>;
      case 'equivalencias': return <Suspense fallback={fallback}><EquivalenciasPanel /></Suspense>;
      case 'pases': return <Suspense fallback={fallback}><PasesPanel /></Suspense>;
      case 'ciclos': return <Suspense fallback={fallback}><CiclosPanel /></Suspense>;
      case 'exportar': return <Suspense fallback={fallback}><ExportarPanel /></Suspense>;
      case 'datos': return <Suspense fallback={fallback}><UsoDatos /></Suspense>;
      case 'perfil': return <Suspense fallback={fallback}><ProfileSection /></Suspense>;
      default: return null;
    }
  };

  return (
    <div className="dashboard-layout">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Abrir menú">
        <div className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
          <span></span><span></span><span></span>
        </div>
      </button>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className={`avatar-sm ${rol === 'admin' ? 'avatar-admin' : 'avatar-profesor'}`}>
            {user.displayName
              ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
              : user.email?.substring(0, 2).toUpperCase() ?? 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.displayName || 'Usuario'}</span>
            <span className="sidebar-user-role">{etiquetaRol(user.role)}</span>
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
            <span>Cerrar sesión</span>
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
