import { useEffect, useState, useMemo } from 'react';
import { useStudents, type StudentRecord } from '../../hooks/useStudents';
import { useSubjects, type Subject } from '../../hooks/useSubjects';
import { useGrades, type Grade } from '../../hooks/useGrades';
import { useEquivalences, type Equivalence } from '../../hooks/useEquivalences';
import { useLogs, type LogEntry } from '../../hooks/useLogs';
import { Search, User, FileText, ClipboardList, BookOpen, History, Calendar, Download } from 'lucide-react';
import { calcularEdad } from '../../utils/dates';
import { GradeReportModal } from './GradeReportModal';

type Tab = 'datos' | 'documentacion' | 'calificaciones' | 'equivalencias' | 'historial';

const TABS: { id: Tab; label: string }[] = [
  { id: 'datos', label: 'Datos Personales' },
  { id: 'documentacion', label: 'Documentación' },
  { id: 'calificaciones', label: 'Calificaciones' },
  { id: 'equivalencias', label: 'Equivalencias' },
  { id: 'historial', label: 'Historial' },
];

const gestionLabel: Record<string, string> = {
  'sin cargar': 'Sin Cargar', cargado: 'Cargado', 'pase solicitado': 'Pase Solicitado', invalido: 'Inválido',
};



export const StudentDetail = () => {
  const { getAllStudents } = useStudents();
  const { getSubjectsByPlan } = useSubjects();
  const { getGradesByStudent } = useGrades();
  const { getEquivalencesByStudent } = useEquivalences();
  const { getLogsByEntity } = useLogs();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('datos');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [equivalences, setEquivalences] = useState<Equivalence[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllStudents()
      .then(data => { if (!cancelled) setStudents(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return students.filter(s =>
      s.apellido.toLowerCase().includes(q) ||
      s.nombre.toLowerCase().includes(q) ||
      s.dni.includes(q)
    ).slice(0, 20);
  }, [students, search]);

  const selectStudent = async (s: StudentRecord) => {
    setSelected(s);
    setActiveTab('datos');
    setLoadingDetail(true);
    try {
      const [subs, gs, eqs] = await Promise.all([
        s.planId ? getSubjectsByPlan(s.planId) : Promise.resolve([]),
        getGradesByStudent(s.id),
        getEquivalencesByStudent(s.id),
      ]);
      setSubjects(subs);
      setGrades(gs);
      setEquivalences(eqs);

      const logsData = await getLogsByEntity('student', s.id);
      setLogs(logsData);
    } catch {}
    setLoadingDetail(false);
  };

  const getSubjectName = (subjectId: string) => {
    const found = subjects.find(s => s.id === subjectId);
    return found?.nombre ?? '—';
  };

  const getModuloForSubject = (subjectId: string) => {
    const found = subjects.find(s => s.id === subjectId);
    return found?.modulo ?? 0;
  };

  const groupedGrades = useMemo(() => {
    const groups: Record<number, Grade[]> = {};
    for (const g of grades) {
      const mod = getModuloForSubject(g.subjectId);
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(g);
    }
    return groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grades]);

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Detalle del Estudiante</span>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por apellido, nombre o DNI..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
            style={{ paddingLeft: '36px', width: '100%' }}
            autoFocus
          />
        </div>

        {loadingData ? (
          <div className="user-mgmt-loading">
            <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            <span>Cargando estudiantes...</span>
          </div>
        ) : search && filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
            No se encontraron estudiantes.
          </p>
        ) : search && !selected ? (
          <div className="user-list" style={{ marginBottom: '16px' }}>
            {filtered.map(s => (
              <div key={s.id} className="user-row" style={{ cursor: 'pointer' }} onClick={() => selectStudent(s)}>
                <div className="user-avatar-mini avatar-profesor">
                  {s.apellido.charAt(0)}{s.nombre.charAt(0)}
                </div>
                <div className="user-info">
                  <span className="user-name">{s.apellido}, {s.nombre}</span>
                  <span className="user-email">DNI: {s.dni} &middot; {s.planActual} &middot; {s.cursado === 'virtual' ? 'Virtual' : 'Presencial'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div className="user-avatar-mini avatar-profesor" style={{ width: '40px', height: '40px', fontSize: '15px' }}>
                {selected.apellido.charAt(0)}{selected.nombre.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  {selected.apellido}, {selected.nombre}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  DNI: {selected.dni} &middot; {selected.planActual} &middot; {selected.cursado === 'virtual' ? 'Virtual' : 'Presencial'}
                </div>
              </div>
              <button
                className="btn-icon-round btn-add-user"
                onClick={() => setShowReport(true)}
                title="Boletín imprimible"
                style={{ width: '36px', height: '36px' }}
              >
                <Download size={15} />
              </button>
            </div>

            <div className="grades-filter-tabs" style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`btn-filter-tab ${activeTab === t.id ? 'btn-filter-tab-active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {t.id === 'datos' && <User size={13} style={{ marginRight: '4px' }} />}
                  {t.id === 'documentacion' && <FileText size={13} style={{ marginRight: '4px' }} />}
                  {t.id === 'calificaciones' && <ClipboardList size={13} style={{ marginRight: '4px' }} />}
                  {t.id === 'equivalencias' && <BookOpen size={13} style={{ marginRight: '4px' }} />}
                  {t.id === 'historial' && <History size={13} style={{ marginRight: '4px' }} />}
                  {t.label}
                </button>
              ))}
            </div>

            {loadingDetail ? (
              <div className="user-mgmt-loading">
                <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
                <span>Cargando información...</span>
              </div>
            ) : (
              <div>
                {activeTab === 'datos' && (
                  <div className="doc-modal-content">
                    <div className="doc-section">
                      <div className="doc-student-grid">
                        <div><span className="doc-label">Apellido:</span> {selected.apellido}</div>
                        <div><span className="doc-label">Nombre:</span> {selected.nombre}</div>
                        <div><span className="doc-label">DNI:</span> {selected.dni}</div>
                        <div><span className="doc-label">CUIL:</span> {selected.cuil}</div>
                        <div><span className="doc-label">Email:</span> {selected.email}</div>
                        <div><span className="doc-label">Teléfono:</span> {selected.telefono}</div>
                        <div><span className="doc-label">Edad:</span> {calcularEdad(selected.fechaNacimiento)} años</div>
                        <div><span className="doc-label">Fecha Nac.:</span> {selected.fechaNacimiento}</div>
                        <div><span className="doc-label">Plan Inicial:</span> {selected.planInicial}</div>
                        <div><span className="doc-label">Plan Actual:</span> <span className="badge-plan">{selected.planActual}</span></div>
                        <div><span className="doc-label">Cursado:</span> <span className={`badge-${selected.cursado}`}>{selected.cursado === 'virtual' ? 'Virtual' : 'Presencial'}</span></div>
                        <div><span className="doc-label">Estado:</span> <span className={`badge-estado badge-${selected.estado}`}>{selected.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></div>
                        <div><span className="doc-label">Gestión:</span> <span className={`badge-gestion badge-gestion-${selected.gestion.replace(/\s+/g, '-')}`}>{gestionLabel[selected.gestion]}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'documentacion' && (
                  <div className="doc-modal-content">
                    <div className="doc-section">
                      <div className="doc-checkboxes" style={{ marginBottom: '16px' }}>
                        {([
                          { label: 'Pase Provisorio', val: selected.paseProvisorio },
                          { label: 'Pase Definitivo', val: selected.paseDefinitivo },
                          { label: 'Fotocopia de DNI', val: selected.fotocopiaDni },
                          { label: 'CUS', val: selected.cus },
                        ] as const).map(item => (
                          <div key={item.label} className="doc-check-row">
                            <span className="doc-label">{item.label}</span>
                            <label className="toggle-switch">
                              <input type="checkbox" checked={item.val} disabled />
                              <span className="toggle-slider"></span>
                            </label>
                            <span className="toggle-status">{item.val ? 'Entregado' : 'No entregado'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="doc-fields">
                        <div className="form-group">
                          <label className="form-label">Certificado de Primaria</label>
                          <div style={{ fontSize: '14px', padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-input)' }}>
                            {selected.certificadoPrimaria}
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Número de Equivalencia</label>
                            <div style={{ fontSize: '14px', padding: '8px 0' }}>{selected.numeroEquivalencia || '—'}</div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Link Título</label>
                            <div style={{ fontSize: '14px', padding: '8px 0' }}>{selected.linkTitulo ? <a href={selected.linkTitulo} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>Ver</a> : '—'}</div>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Documentación</label>
                          <div style={{ fontSize: '14px', padding: '8px 0' }}>
                            <span className={selected.documentacionCompleta === 'completa' ? 'badge-doc badge-doc-completa' : 'badge-doc badge-doc-incompleta'}>
                              {selected.documentacionCompleta === 'completa' ? 'Completa' : 'Incompleta'}
                            </span>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Observaciones</label>
                          <div style={{ fontSize: '14px', padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-input)', whiteSpace: 'pre-wrap' }}>
                            {selected.observaciones || 'Sin observaciones.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'calificaciones' && (
                  <div>
                    {grades.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
                        Sin calificaciones cargadas.
                      </p>
                    ) : (
                      <div style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                        <table className="stat-table" style={{ width: '100%', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ color: 'var(--color-text-muted)', background: 'var(--bg-glass)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Módulo</th>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Materia</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Nota</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(groupedGrades)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .flatMap(([mod, modGrades]) =>
                                modGrades.map((g, i) => (
                                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border-glass)', background: i % 2 === 1 ? 'var(--bg-glass)' : undefined }}>
                                    <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>M{mod}</td>
                                    <td style={{ padding: '8px 10px' }}>{getSubjectName(g.subjectId)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{g.nota}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>{g.fecha}</td>
                                  </tr>
                                ))
                              )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'equivalencias' && (
                  <div>
                    {equivalences.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
                        Sin equivalencias cargadas.
                      </p>
                    ) : (
                      <div style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                        <table className="stat-table" style={{ width: '100%', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ color: 'var(--color-text-muted)', background: 'var(--bg-glass)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Materia</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Nota</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {equivalences.map((eq, i) => (
                              <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-glass)', background: i % 2 === 1 ? 'var(--bg-glass)' : undefined }}>
                                <td style={{ padding: '8px 10px' }}>{eq.nombre}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{eq.nota}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>{eq.fecha}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'historial' && (
                  <div>
                    {logs.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
                        Sin cambios registrados.
                      </p>
                    ) : (
                      <div style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                        <table className="stat-table" style={{ width: '100%', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ color: 'var(--color-text-muted)', background: 'var(--bg-glass)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Fecha</th>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Usuario</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Acción</th>
                              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-glass)' }}>Detalle</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log, i) => (
                              <tr key={log.id ?? i} style={{ borderBottom: '1px solid var(--border-glass)', background: i % 2 === 1 ? 'var(--bg-glass)' : undefined }}>
                                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                                  <Calendar size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                  {new Date(log.timestamp).toLocaleDateString('es-AR')}
                                </td>
                                <td style={{ padding: '8px 10px' }}>{log.userEmail || log.userId}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span className={`badge-${log.action === 'create' ? 'presencial' : log.action === 'delete' ? 'inactivo' : 'estado'}`}
                                    style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>
                                    {log.action === 'create' ? 'Creación' : log.action === 'update' ? 'Modificación' : 'Eliminación'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                                  {log.details ? JSON.stringify(log.details).substring(0, 80) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!search && !selected && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '40px 0' }}>
            Busca un estudiante por apellido, nombre o DNI para ver su información completa.
          </p>
        )}
      </div>

      {showReport && selected && (
        <GradeReportModal
          student={selected}
          subjects={subjects}
          grades={grades}
          equivalences={equivalences}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
