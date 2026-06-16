import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudyPlans, type StudyPlan } from '../../hooks/useStudyPlans';
import { BookOpen, Plus, Pencil, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { StudyPlanFormModal } from './StudyPlanFormModal';
import { SubjectManagement } from './SubjectManagement';

export const StudyPlanManagement = () => {
  const { user } = useAuth();
  const { getAllPlans, updatePlan, deletePlan } = useStudyPlans();
  const isAdmin = user?.role === 'Administrador';
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [editPlan, setEditPlan] = useState<StudyPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllPlans()
      .then(data => { if (!cancelled) setPlans(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setLoadingData(true);
    getAllPlans()
      .then(data => setPlans(data))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  const handleToggleActive = async (plan: StudyPlan) => {
    try {
      await updatePlan(plan.id, { active: !plan.active });
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !plan.active } : p));
    } catch {}
  };

  const handleDelete = async (plan: StudyPlan) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${plan.nombre}"?`)) return;
    try {
      await deletePlan(plan.id);
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    } catch {}
  };

  const handleCreateWithDefaults = async () => {
    setShowModal('create');
  };

  const handleSuccess = () => {
    setShowModal(null);
    setEditPlan(null);
    handleRefresh();
  };

  if (selectedPlan) {
    return (
      <SubjectManagement
        plan={selectedPlan}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Planes de Estudio</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && (
              <button
                className="btn-icon-round btn-add-user"
                onClick={handleCreateWithDefaults}
                title="Crear plan de estudio"
                aria-label="Crear nuevo plan de estudio"
              >
                <Plus size={16} />
              </button>
            )}
            <button
              className="btn-icon-round"
              onClick={handleRefresh}
              disabled={loadingData}
              title="Recargar lista"
            >
              <RefreshCw size={15} className={loadingData ? 'spin-icon' : ''} />
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <p style={{ textAlign: 'center', color: '#f87171', fontSize: '14px', padding: '20px 0' }}>
            No tienes permisos para ver esta sección.
          </p>
        ) : loadingData ? (
          <div className="user-mgmt-loading">
            <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            <span>Cargando planes...</span>
          </div>
        ) : plans.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
            No hay planes de estudio registrados.
          </p>
        ) : (
          <div className="user-list">
            {plans.map(p => (
              <div key={p.id} className="user-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedPlan(p)}>
                <div className="user-avatar-mini avatar-admin">
                  <BookOpen size={16} />
                </div>

                <div className="user-info">
                  <span className="user-name">
                    {p.nombre}
                    {!p.active && <span className="badge-disabled" style={{ marginLeft: '8px' }}>Inactivo</span>}
                  </span>
                  <span className="user-email">
                    {p.nivelEducativo} · {p.cohorteInicio}-{p.cohorteFin}
                  </span>
                </div>

                <div className="role-select-wrapper" style={{ gap: '6px' }}>
                  <button
                    className="btn-icon-round btn-action-edit"
                    onClick={e => { e.stopPropagation(); setEditPlan(p); setShowModal('edit'); }}
                    title="Editar plan"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className={`btn-icon-round ${p.active ? 'btn-action-disable' : 'btn-action-restore'}`}
                    onClick={e => { e.stopPropagation(); handleToggleActive(p); }}
                    title={p.active ? 'Desactivar plan' : 'Activar plan'}
                  >
                    {p.active ? <X size={13} /> : <Check size={13} />}
                  </button>
                  <button
                    className="btn-icon-round btn-action-disable"
                    onClick={e => { e.stopPropagation(); handleDelete(p); }}
                    title="Eliminar plan"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal === 'create' && (
        <StudyPlanFormModal
          mode="create"
          onClose={() => setShowModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {showModal === 'edit' && editPlan && (
        <StudyPlanFormModal
          mode="edit"
          initialData={editPlan}
          onClose={() => { setShowModal(null); setEditPlan(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
