import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSubjects, type Subject, type SubjectType } from '../../hooks/useSubjects';
import type { StudyPlan } from '../../hooks/useStudyPlans';
import { ArrowLeft, BookOpen, RefreshCw, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getFirebaseErrorMessage } from '../../utils/errors';

interface SubjectManagementProps {
  plan: StudyPlan;
  onBack: () => void;
}

const TIPO_LABELS: Record<SubjectType, string> = {
  basico: 'Básico',
  atp: 'ATP',
  orientacion: 'Orientación',
};

type SubjectForm = {
  nombre: string;
  modulo: number;
  tipo: SubjectType;
};

const EMPTY_FORM: SubjectForm = { nombre: '', modulo: 1, tipo: 'basico' };

export const SubjectManagement = ({ plan, onBack }: SubjectManagementProps) => {
  const { user } = useAuth();
  const { getSubjectsByPlan, createSubject, updateSubject, deleteSubject, loading, error } = useSubjects();
  const isAdmin = user?.role === 'Administrador';
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingModulo, setAddingModulo] = useState<number | null>(null);
  const { toast } = useToast();
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSubjects = () => {
    setLoadingData(true);
    getSubjectsByPlan(plan.id)
      .then(data => setSubjects(data))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(loadSubjects, [plan.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartAdd = (modulo?: number) => {
    setForm({ nombre: '', modulo: modulo ?? 0, tipo: 'basico' });
    setAddingModulo(modulo ?? 0);
    setEditingId(null);
    setFormError(null);
  };

  const handleStartEdit = (s: Subject) => {
    setForm({ nombre: s.nombre, modulo: s.modulo, tipo: s.tipo });
    setEditingId(s.id);
    setAddingModulo(null);
    setFormError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setAddingModulo(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = async () => {
    const name = form.nombre.trim();
    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (form.modulo < 1) {
      setFormError('El módulo debe ser mayor a 0.');
      return;
    }
    setFormError(null);

    try {
      if (editingId) {
        await updateSubject(editingId, { nombre: name, modulo: form.modulo, tipo: form.tipo });
        setSubjects(prev => prev.map(s => s.id === editingId ? { ...s, nombre: name, modulo: form.modulo, tipo: form.tipo } : s));
        toast('Materia actualizada exitosamente');
      } else {
        const maxOrder = subjects
          .filter(s => s.modulo === form.modulo)
          .reduce((max, s) => Math.max(max, s.order), -1);
        const newOrder = maxOrder + 1;
        const docId = await createSubject({ nombre: name, modulo: form.modulo, planId: plan.id, tipo: form.tipo, order: newOrder });
        setSubjects(prev => [...prev, { id: docId, nombre: name, modulo: form.modulo, planId: plan.id, tipo: form.tipo, order: newOrder, createdAt: new Date().toISOString() }]);
        toast('Materia creada exitosamente');
      }
      handleCancel();
    } catch (err) {
      toast(getFirebaseErrorMessage(err, 'generic'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta materia?')) return;
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      toast('Materia eliminada exitosamente');
    } catch (err) {
      toast(getFirebaseErrorMessage(err, 'generic'), 'error');
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<number, Subject[]> = {};
    for (const s of subjects) {
      if (!groups[s.modulo]) groups[s.modulo] = [];
      groups[s.modulo].push(s);
    }
    for (const mod of Object.keys(groups).map(Number)) {
      groups[mod].sort((a, b) => a.order - b.order);
    }
    return groups;
  }, [subjects]);

  const modulos = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const renderInlineForm = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
      borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-glass)',
    }}>
      <input
        type="text"
        className="input-field"
        placeholder="Nombre de la materia"
        value={form.nombre}
        onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
        style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
        autoFocus
      />
      <input
        type="number"
        className="input-field"
        min={1}
        value={form.modulo || ''}
        onChange={e => setForm(prev => ({ ...prev, modulo: parseInt(e.target.value) || 0 }))}
        style={{ width: '70px', padding: '8px 12px', fontSize: '13px', textAlign: 'center' }}
        title="Módulo"
      />
      <select
        className="role-select"
        value={form.tipo}
        onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value as SubjectType }))}
        style={{ width: '110px', fontSize: '12px', padding: '8px', borderRadius: '6px' }}
      >
        <option value="basico">Básico</option>
        <option value="atp">ATP</option>
        <option value="orientacion">Orientación</option>
      </select>
      {formError && <span style={{ color: '#f87171', fontSize: '12px' }}>{formError}</span>}
      <button className="btn-icon-round" onClick={handleSave} disabled={loading} title="Guardar" style={{ width: '28px', height: '28px' }}>
        <Check size={14} />
      </button>
      <button className="btn-icon-round" onClick={handleCancel} title="Cancelar" style={{ width: '28px', height: '28px' }}>
        <X size={14} />
      </button>
    </div>
  );

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn-icon-round" onClick={onBack} title="Volver" style={{ marginRight: '4px' }}>
              <ArrowLeft size={16} />
            </button>
            <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>{plan.nombre}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                {plan.cohorteInicio}-{plan.cohorteFin}
              </span>
            </div>
          </div>
          <button
            className="btn-icon-round"
            onClick={loadSubjects}
            disabled={loadingData}
            title="Recargar"
          >
            <RefreshCw size={15} className={loadingData ? 'spin-icon' : ''} />
          </button>
        </div>

        {error && (
          <p style={{ textAlign: 'center', color: '#f87171', fontSize: '14px', padding: '10px 0' }}>
            {error}
          </p>
        )}

        {loadingData ? (
          <div className="user-mgmt-loading">
            <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            <span>Cargando materias...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {modulos.length === 0 && !isAdmin && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
                Este plan no tiene materias cargadas.
              </p>
            )}

            {addingModulo !== null && !modulos.includes(addingModulo) && (
              <div key={`new-module-${addingModulo}`} style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--accent-primary)',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  borderBottom: '1px solid var(--border-glass)',
                  background: 'var(--bg-glass)',
                }}>
                  Nuevo módulo
                </div>
                {renderInlineForm()}
              </div>
            )}

            {modulos.map(mod => (
              <div key={mod} style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--border-glass)',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 14px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  borderBottom: '1px solid var(--border-glass)',
                  background: 'var(--bg-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>Módulo {mod}</span>
                  {isAdmin && (
                    <button
                      className="btn-icon-round btn-add-user"
                      onClick={() => handleStartAdd(mod)}
                      title="Agregar materia"
                      style={{ width: '26px', height: '26px' }}
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                <div style={{ padding: '0' }}>
                  {addingModulo === mod && renderInlineForm()}
                  {grouped[mod].map(s => (
                    <div key={s.id}>
                      {editingId === s.id ? (
                        renderInlineForm()
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 14px', borderBottom: '1px solid var(--border-glass)',
                        }}>
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: s.tipo === 'basico' ? 'var(--accent-primary)' : s.tipo === 'atp' ? '#f59e0b' : '#a78bfa',
                            flexShrink: 0,
                          }} />
                          <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                            {s.nombre}
                          </span>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                            background: 'var(--bg-glass)', color: 'var(--color-text-muted)',
                          }}>
                            {TIPO_LABELS[s.tipo]}
                          </span>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="btn-icon-round btn-action-edit"
                                onClick={() => handleStartEdit(s)}
                                title="Editar"
                                style={{ width: '26px', height: '26px' }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                className="btn-icon-round btn-action-disable"
                                onClick={() => handleDelete(s.id)}
                                title="Eliminar"
                                style={{ width: '26px', height: '26px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {isAdmin && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  className="btn-icon-round btn-add-user"
                  onClick={() => handleStartAdd()}
                  title="Agregar módulo"
                  style={{ width: 'auto', padding: '8px 20px', borderRadius: '8px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Plus size={15} />
                  <span style={{ fontSize: '13px' }}>Agregar Módulo</span>
                </button>
              </div>
            )}

            <div style={{
              fontSize: '12px', color: 'var(--color-text-muted)',
              background: 'var(--bg-glass)', borderRadius: 'var(--radius-input)',
              padding: '8px 14px', marginTop: '4px',
            }}>
              <strong>Resolución:</strong> {plan.normaJurisdiccional} · <strong>Validez Nacional:</strong> {plan.validezNacional}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
