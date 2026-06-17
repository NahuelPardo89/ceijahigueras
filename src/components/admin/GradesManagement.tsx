import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudents, type StudentRecord } from '../../hooks/useStudents';
import { useSubjects, type Subject } from '../../hooks/useSubjects';
import { useGrades, type Grade } from '../../hooks/useGrades';
import { useEquivalences, type Equivalence } from '../../hooks/useEquivalences';
import { GradesFormModal } from './GradesFormModal';
import { EquivalenceFormModal } from './EquivalenceFormModal';
import { GraduationCap, RefreshCw, Search, Plus, BookOpen, Download, FileSpreadsheet } from 'lucide-react';
import { Pagination } from '../Pagination';
import { exportToExcel } from '../../hooks/useExport';
import { exportRac } from '../../hooks/useRacExport';

type PlanFilter = 'Plan A' | 'Plan B' | 'Plan C' | 'virtuales';

const FILTERS: { key: PlanFilter; label: string }[] = [
  { key: 'Plan A', label: 'Plan A' },
  { key: 'Plan B', label: 'Plan B' },
  { key: 'Plan C', label: 'Plan C' },
  { key: 'virtuales', label: 'Virtuales' },
];

export const GradesManagement = () => {
  const { user } = useAuth();
  const { getAllStudents } = useStudents();
  const { getSubjectsByPlan } = useSubjects();
  const { getGradesByStudent, deleteGrade } = useGrades();
  const { getEquivalencesByStudent, deleteEquivalence } = useEquivalences();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [subjectsByPlan, setSubjectsByPlan] = useState<Record<string, Subject[]>>({});
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PlanFilter>('Plan A');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [equivalences, setEquivalences] = useState<Equivalence[]>([]);
  const [showEqModal, setShowEqModal] = useState(false);
  const [editEquivalence, setEditEquivalence] = useState<Equivalence | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportingRac, setExportingRac] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await getAllStudents();
        if (cancelled) return;
        setStudents(s);
        const planIds = [...new Set(s.map(st => st.planId).filter(Boolean) as string[])];
        const results = await Promise.allSettled(planIds.map(id => getSubjectsByPlan(id)));
        const map: Record<string, Subject[]> = {};
        planIds.forEach((id, i) => {
          if (results[i].status === 'fulfilled') {
            map[id] = (results[i] as PromiseFulfilledResult<Subject[]>).value;
          }
        });
        if (!cancelled) setSubjectsByPlan(map);
      } catch {
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGradesForStudent = async (studentId: string) => {
    const data = await getGradesByStudent(studentId);
    setGrades(data);
    return data;
  };

  const handleToggleExpand = async (student: StudentRecord) => {
    if (expandedStudent === student.id) {
      setExpandedStudent(null);
      setGrades([]);
      setEquivalences([]);
      return;
    }
    setExpandedStudent(student.id);
    setSelectedStudent(student);
    setLoadingGrades(true);
    await Promise.all([
      loadGradesForStudent(student.id),
      getEquivalencesByStudent(student.id).then(setEquivalences),
    ]);
    setLoadingGrades(false);
  };

  const handleRefresh = () => {
    setLoadingData(true);
    setExpandedStudent(null);
    setGrades([]);
    setEquivalences([]);
    getAllStudents()
      .then(s => {
        setStudents(s);
        const planIds = [...new Set(s.map(st => st.planId).filter(Boolean) as string[])];
        return Promise.allSettled(planIds.map(id => getSubjectsByPlan(id))).then(results => ({ results, planIds }));
      })
      .then(({ results, planIds }) => {
        const map: Record<string, Subject[]> = {};
        planIds.forEach((id, i) => {
          if (results[i].status === 'fulfilled') {
            map[id] = (results[i] as PromiseFulfilledResult<Subject[]>).value;
          }
        });
        setSubjectsByPlan(map);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  const handleGradeSuccess = async () => {
    setShowModal(false);
    setEditGrade(null);
    if (expandedStudent) {
      await loadGradesForStudent(expandedStudent);
    }
  };

  const handleDeleteGrade = async (grade: Grade) => {
    if (!window.confirm('¿Estás seguro de eliminar esta calificación?')) return;
    try {
      await deleteGrade(grade.id);
      setGrades(prev => prev.filter(g => g.id !== grade.id));
    } catch {}
  };

  const handleEqSuccess = async () => {
    setShowEqModal(false);
    setEditEquivalence(null);
    if (expandedStudent) {
      const eqData = await getEquivalencesByStudent(expandedStudent);
      setEquivalences(eqData);
    }
  };

  const handleDeleteEquivalence = async (eq: Equivalence) => {
    if (!window.confirm('¿Estás seguro de eliminar esta equivalencia?')) return;
    try {
      await deleteEquivalence(eq.id);
      setEquivalences(prev => prev.filter(e => e.id !== eq.id));
    } catch {}
  };

  const activeStudents = useMemo(() => students.filter(s => s.estado === 'activo'), [students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = activeStudents;
    if (filter === 'virtuales') {
      list = list.filter(s => s.cursado === 'virtual');
    } else {
      list = list.filter(s => s.planActual === filter && s.cursado !== 'virtual');
    }
    if (!q) return list;
    return list.filter(s =>
      s.apellido.toLowerCase().includes(q) ||
      s.nombre.toLowerCase().includes(q) ||
      s.dni.includes(q)
    );
  }, [activeStudents, filter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, pageSize]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  const handlePageSizeChange = useCallback((size: number) => setPageSize(size), []);

  const handleExport = () => {
    const rows = filtered.flatMap(s => {
      const studentGrades = grades.filter(g => g.studentId === s.id);
      if (studentGrades.length === 0) {
        return [{ apellido: s.apellido, nombre: s.nombre, dni: s.dni, plan: s.planActual, modulo: '', materia: '', nota: '', fecha: '' }];
      }
      return studentGrades.map(g => ({
        apellido: s.apellido,
        nombre: s.nombre,
        dni: s.dni,
        plan: s.planActual,
        modulo: `M${getModuloForSubject(g.subjectId)}`,
        materia: getSubjectName(g.subjectId),
        nota: g.nota,
        fecha: g.fecha,
      }));
    });
    exportToExcel(rows, [
      { header: 'Apellido', accessor: r => r.apellido },
      { header: 'Nombre', accessor: r => r.nombre },
      { header: 'DNI', accessor: r => r.dni },
      { header: 'Plan', accessor: r => r.plan },
      { header: 'Módulo', accessor: r => r.modulo },
      { header: 'Materia', accessor: r => r.materia },
      { header: 'Nota', accessor: r => r.nota },
      { header: 'Fecha', accessor: r => r.fecha },
    ], 'calificaciones');
  };

  const handleExportRac = async () => {
    if (exportingRac) return;
    setExportingRac(true);
    try {
      const active = students.filter(s => s.estado === 'activo');
      if (active.length === 0) return;

      const planIds = [...new Set(active.map(s => s.planId).filter(Boolean) as string[])];
      const subsByPlan: Record<string, Subject[]> = {};
      await Promise.all(planIds.map(async pid => {
        subsByPlan[pid] = await getSubjectsByPlan(pid);
      }));

      const gradesByStudent = new Map<string, Grade[]>();
      await Promise.all(active.map(async s => {
        const gs = await getGradesByStudent(s.id);
        if (gs.length > 0) gradesByStudent.set(s.id, gs);
      }));

      const groups = [
        { name: 'Plan A', students: active.filter(s => s.planActual === 'Plan A' && s.cursado === 'presencial') },
        { name: 'Plan B', students: active.filter(s => s.planActual === 'Plan B' && s.cursado === 'presencial') },
        { name: 'Plan C', students: active.filter(s => s.planActual === 'Plan C' && s.cursado === 'presencial') },
        { name: 'Virtuales', students: active.filter(s => s.cursado === 'virtual') },
      ];

      const sheets = groups.map(({ name, students }) => {
        const groupPlanIds = [...new Set(students.map(s => s.planId).filter(Boolean) as string[])];
        const seen = new Set<string>();
        const subjects: Subject[] = [];
        for (const pid of groupPlanIds) {
          for (const sub of subsByPlan[pid] ?? []) {
            if (!seen.has(sub.id)) {
              seen.add(sub.id);
              subjects.push(sub);
            }
          }
        }
        return { name, students, subjects, gradesByStudent };
      });

      exportRac(sheets, new Date().getFullYear());
    } catch (err) {
      console.error('Error exporting RAC:', err);
    } finally {
      setExportingRac(false);
    }
  };

  const getSubjectName = (subjectId: string) => {
    for (const subs of Object.values(subjectsByPlan)) {
      const found = subs.find(s => s.id === subjectId);
      if (found) return found.nombre;
    }
    return '—';
  };

  const getModuloForSubject = (subjectId: string) => {
    for (const subs of Object.values(subjectsByPlan)) {
      const found = subs.find(s => s.id === subjectId);
      if (found) return found.modulo;
    }
    return 0;
  };

  const groupedGrades = useMemo(() => {
    const groups: Record<number, Grade[]> = {};
    for (const g of grades) {
      const mod = getModuloForSubject(g.subjectId);
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(g);
    }
    for (const mod of Object.keys(groups).map(Number)) {
      groups[mod].sort((a, b) => {
        const sa = getModuloForSubject(a.subjectId);
        const sb = getModuloForSubject(b.subjectId);
        return sa - sb;
      });
    }
    return groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grades]);

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Calificaciones</span>
          </div>
          <button
            className="btn-icon-round"
            onClick={handleRefresh}
            disabled={loadingData}
            title="Recargar"
          >
            <RefreshCw size={15} className={loadingData ? 'spin-icon' : ''} />
          </button>
          <button
            className="btn-icon-round btn-add-user"
            onClick={handleExport}
            title="Exportar calificaciones a Excel"
            aria-label="Exportar calificaciones a Excel"
          >
            <Download size={15} />
          </button>
          <button
            className="btn-icon-round btn-add-user"
            onClick={handleExportRac}
            disabled={exportingRac}
            title="Exportar RAC (Registro de Avance Curricular)"
            aria-label="Exportar RAC"
            style={exportingRac ? { opacity: 0.5 } : undefined}
          >
            <FileSpreadsheet size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar estudiante..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>
        </div>

        <div className="grades-filter-tabs" style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`btn-filter-tab ${filter === f.key ? 'btn-filter-tab-active' : ''}`}
              onClick={() => { setFilter(f.key); setExpandedStudent(null); setGrades([]); setEquivalences([]); }}
            >
              {f.label}
              <span className="filter-count">
                {f.key === 'virtuales'
                  ? activeStudents.filter(s => s.cursado === 'virtual').length
                  : activeStudents.filter(s => s.planActual === f.key && s.cursado !== 'virtual').length
                }
              </span>
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="user-mgmt-loading">
            <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            <span>Cargando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
            {search ? 'No se encontraron estudiantes.' : 'No hay estudiantes activos en este filtro.'}
          </p>
        ) : (
          <div className="user-list">
            {paginated.map(s => (
              <div key={s.id}>
                <div
                  className="user-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleToggleExpand(s)}
                >
                  <div className="user-avatar-mini avatar-profesor">
                    {s.apellido.charAt(0)}{s.nombre.charAt(0)}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{s.apellido}, {s.nombre}</span>
                    <span className="user-email">DNI: {s.dni} &middot; {s.planActual} &middot; {s.cursado === 'virtual' ? 'Virtual' : 'Presencial'}</span>
                  </div>
                  <div className="role-select-wrapper">
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {expandedStudent === s.id ? '▼' : '▶'} Ver calificaciones
                    </span>
                  </div>
                </div>

                {expandedStudent === s.id && (
                  <div style={{ padding: '8px 16px 16px', background: 'var(--bg-glass)' }}>
                    {loadingGrades ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 0' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Cargando calificaciones...</span>
                      </div>
                    ) : Object.keys(groupedGrades).length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                        Sin calificaciones cargadas.
                      </p>
                    ) : (
                      <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-glass)',
                        overflow: 'hidden',
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ color: 'var(--color-text-muted)', background: 'var(--bg-glass)' }}>
                              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Módulo</th>
                              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Materia</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Nota</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Fecha</th>
                              <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(groupedGrades)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .flatMap(([mod, modGrades]) =>
                                modGrades.map((g, i) => (
                                  <tr key={g.id} style={{
                                    borderBottom: '1px solid var(--border-glass)',
                                    background: i % 2 === 1 ? 'var(--bg-glass)' : undefined,
                                  }}>
                                    <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                      M{mod}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>{getSubjectName(g.subjectId)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{g.nota}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                        <button
                                          className="btn-icon-round btn-action-edit"
                                          onClick={() => { setEditGrade(g); setShowModal(true); }}
                                          title="Editar"
                                          style={{ width: '24px', height: '24px' }}
                                        >
                                          <span style={{ fontSize: '11px' }}>✎</span>
                                        </button>
                                        <button
                                          className="btn-icon-round btn-action-disable"
                                          onClick={() => handleDeleteGrade(g)}
                                          title="Eliminar"
                                          style={{ width: '24px', height: '24px' }}
                                        >
                                          <span style={{ fontSize: '11px' }}>✕</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <button
                        className="btn-icon-round btn-add-user"
                        onClick={() => { setSelectedStudent(s); setEditGrade(null); setShowModal(true); }}
                        title="Agregar calificación"
                        style={{ width: 'auto', padding: '6px 16px', borderRadius: '6px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Plus size={14} />
                        <span style={{ fontSize: '13px' }}>Agregar calificación</span>
                      </button>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <BookOpen size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Equivalencias</span>
                      </div>

                      {equivalences.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                          Sin equivalencias cargadas.
                        </p>
                      ) : (
                        <div style={{
                          background: 'var(--bg-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-glass)',
                          overflow: 'hidden',
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ color: 'var(--color-text-muted)', background: 'var(--bg-glass)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Materia</th>
                                <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Nota</th>
                                <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Fecha</th>
                                <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)' }}>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {equivalences.map((eq, i) => (
                                <tr key={eq.id} style={{
                                  borderBottom: '1px solid var(--border-glass)',
                                  background: i % 2 === 1 ? 'var(--bg-glass)' : undefined,
                                }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{eq.nombre}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{eq.nota}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{eq.fecha}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                      <button
                                        className="btn-icon-round btn-action-edit"
                                        onClick={() => { setEditEquivalence(eq); setShowEqModal(true); }}
                                        title="Editar"
                                        style={{ width: '24px', height: '24px' }}
                                      >
                                        <span style={{ fontSize: '11px' }}>✎</span>
                                      </button>
                                      <button
                                        className="btn-icon-round btn-action-disable"
                                        onClick={() => handleDeleteEquivalence(eq)}
                                        title="Eliminar"
                                        style={{ width: '24px', height: '24px' }}
                                      >
                                        <span style={{ fontSize: '11px' }}>✕</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <button
                          className="btn-icon-round btn-add-user"
                          onClick={() => { setSelectedStudent(s); setEditEquivalence(null); setShowEqModal(true); }}
                          title="Agregar equivalencia"
                          style={{ width: 'auto', padding: '6px 16px', borderRadius: '6px', gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <Plus size={14} />
                          <span style={{ fontSize: '13px' }}>Agregar equivalencia</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loadingData && filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {showModal && selectedStudent && (
        <GradesFormModal
          student={selectedStudent}
          planId={selectedStudent.planId || ''}
          subjects={user?.role === 'Profesor' && user.subjectIds
            ? (subjectsByPlan[selectedStudent.planId || ''] || []).filter(s => user.subjectIds!.includes(s.id))
            : (subjectsByPlan[selectedStudent.planId || ''] || [])
          }
          initialData={editGrade}
          onClose={() => { setShowModal(false); setEditGrade(null); }}
          onSuccess={handleGradeSuccess}
        />
      )}

      {showEqModal && selectedStudent && (
        <EquivalenceFormModal
          student={selectedStudent}
          initialData={editEquivalence}
          onClose={() => { setShowEqModal(false); setEditEquivalence(null); }}
          onSuccess={handleEqSuccess}
        />
      )}
    </div>
  );
};
