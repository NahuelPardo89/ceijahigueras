import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudents, type StudentRecord } from '../../hooks/useStudents';
import { useSubjects, type Subject } from '../../hooks/useSubjects';
import { useGrades, type Grade } from '../../hooks/useGrades';
import {
  GraduationCap, RefreshCw, Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown, FileText, ClipboardList, Download, Upload, MessageCircle
} from 'lucide-react';
import { StudentFormModal } from './StudentFormModal';
import { StudentDocumentationModal } from './StudentDocumentationModal';
import { GradesFormModal } from './GradesFormModal';
import { BulkImportModal } from './BulkImportModal';
import { Pagination } from '../Pagination';
import { calcularEdad } from '../../utils/dates';
import { exportToExcel } from '../../hooks/useExport';

type SortField = keyof StudentRecord | 'edad';
type SortDir = 'asc' | 'desc';

const gestionLabel: Record<string, string> = {
  'sin cargar': 'Sin Cargar',
  cargado: 'Cargado',
  'pase solicitado': 'Pase Solicitado',
  invalido: 'Inválido',
};

export const StudentManagement = () => {
  const { user } = useAuth();
  const { getAllStudents, deleteStudent, error: hookError } = useStudents();
  const { getSubjectsByPlan } = useSubjects();
  const { getGradesByStudent, deleteGrade: deleteGradeFn } = useGrades();
  const isAdmin = user?.role === 'Administrador';
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('apellido');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [docStudent, setDocStudent] = useState<StudentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [gradesStudent, setGradesStudent] = useState<StudentRecord | null>(null);
  const [gradeModalGrades, setGradeModalGrades] = useState<Grade[]>([]);
  const [gradeModalSubjects, setGradeModalSubjects] = useState<Subject[]>([]);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [editGradeData, setEditGradeData] = useState<Grade | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllStudents()
      .then(data => { if (!cancelled) setStudents(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortField, sortDir, pageSize]);

  const handleRefresh = () => {
    setLoadingData(true);
    getAllStudents()
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  const handleDelete = async (s: StudentRecord) => {
    if (!window.confirm(`¿Estás seguro de eliminar a "${s.apellido}, ${s.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteStudent(s.id);
      setStudents(prev => prev.filter(st => st.id !== s.id));
    } catch {
      // handled by hook
    }
  };

  const openEdit = (s: StudentRecord) => {
    setEditStudent(s);
    setShowModal('edit');
  };

  const handleOpenGrades = async (s: StudentRecord) => {
    setGradesStudent(s);
    setGradeModalGrades([]);
    setGradeModalSubjects([]);
    try {
      const [subs, gs] = await Promise.all([
        s.planId ? getSubjectsByPlan(s.planId) : Promise.resolve([]),
        getGradesByStudent(s.id),
      ]);
      setGradeModalSubjects(subs);
      setGradeModalGrades(gs);
    } catch (err) {
      console.error('Error cargando calificaciones:', err);
    }
  };

  const handleGradeFormSuccess = async () => {
    setShowGradeForm(false);
    setEditGradeData(null);
    if (gradesStudent) {
      const gs = await getGradesByStudent(gradesStudent.id);
      setGradeModalGrades(gs);
    }
  };

  const handleDeleteGradeFromModal = async (grade: Grade) => {
    if (!window.confirm('¿Estás seguro de eliminar esta calificación?')) return;
    try {
      await deleteGradeFn(grade.id);
      setGradeModalGrades(prev => prev.filter(g => g.id !== grade.id));
    } catch {}
  };

  const getSubjectNameInModal = (subjectId: string) => {
    const found = gradeModalSubjects.find(s => s.id === subjectId);
    return found?.nombre ?? '—';
  };

  const getModuloForSubjectInModal = (subjectId: string) => {
    const found = gradeModalSubjects.find(s => s.id === subjectId);
    return found?.modulo ?? 0;
  };

  const groupedGradeModalGrades = useMemo(() => {
    const groups: Record<number, Grade[]> = {};
    for (const g of gradeModalGrades) {
      const mod = getModuloForSubjectInModal(g.subjectId);
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(g);
    }
    return groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeModalGrades, gradeModalSubjects]);

  const handleSuccess = () => {
    setShowModal(null);
    setEditStudent(null);
    handleRefresh();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = students;
    if (q) {
      list = students.filter(s =>
        s.apellido.toLowerCase().includes(q) ||
        s.nombre.toLowerCase().includes(q) ||
        s.dni.includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'edad') {
        cmp = calcularEdad(a.fechaNacimiento) - calcularEdad(b.fechaNacimiento);
      } else {
        const va = (a[sortField as keyof StudentRecord] ?? '') as string;
        const vb = (b[sortField as keyof StudentRecord] ?? '') as string;
        cmp = va.localeCompare(vb, 'es');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, search, sortField, sortDir]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  const handlePageSizeChange = useCallback((size: number) => setPageSize(size), []);

  const handleExport = () => {
    exportToExcel(filtered, [
      { header: 'Apellido', accessor: s => s.apellido },
      { header: 'Nombre', accessor: s => s.nombre },
      { header: 'DNI', accessor: s => s.dni },
      { header: 'CUIL', accessor: s => s.cuil },
      { header: 'Email', accessor: s => s.email },
      { header: 'Teléfono', accessor: s => s.telefono },
      { header: 'Fecha de Nacimiento', accessor: s => s.fechaNacimiento },
      { header: 'Edad', accessor: s => calcularEdad(s.fechaNacimiento) },
      { header: 'Plan Inicial', accessor: s => s.planInicial },
      { header: 'Plan Actual', accessor: s => s.planActual },
      { header: 'Cursado', accessor: s => s.cursado === 'virtual' ? 'Virtual' : 'Presencial' },
      { header: 'Estado', accessor: s => s.estado === 'activo' ? 'Activo' : 'Inactivo' },
      { header: 'Gestión', accessor: s => s.gestion },
      { header: 'Pase Provisorio', accessor: s => s.paseProvisorio ? 'Sí' : 'No' },
      { header: 'Pase Definitivo', accessor: s => s.paseDefinitivo ? 'Sí' : 'No' },
      { header: 'Fotocopia DNI', accessor: s => s.fotocopiaDni ? 'Sí' : 'No' },
      { header: 'CUS', accessor: s => s.cus ? 'Sí' : 'No' },
      { header: 'Certificado Primaria', accessor: s => s.certificadoPrimaria },
      { header: 'Número Equivalencia', accessor: s => s.numeroEquivalencia },
      { header: 'Link Título', accessor: s => s.linkTitulo },
      { header: 'Observaciones', accessor: s => s.observaciones },
      { header: 'Documentación', accessor: s => s.documentacionCompleta === 'completa' ? 'Completa' : 'Incompleta' },
      { header: 'Creado', accessor: s => s.createdAt },
    ], 'estudiantes');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ArrowUp size={11} style={{ marginLeft: '3px' }} />
      : <ArrowDown size={11} style={{ marginLeft: '3px' }} />;
  };

  const handleHeaderClick = (field: SortField) => () => toggleSort(field);

  return (
    <div>
      <div className="user-mgmt-panel">
        <div className="user-mgmt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Estudiantes</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && (
              <button
                className="btn-icon-round btn-add-user"
                onClick={() => setShowModal('create')}
                title="Agregar estudiante"
                aria-label="Agregar nuevo estudiante"
              >
                <Plus size={16} />
              </button>
            )}
            <button
              className="btn-icon-round"
              onClick={handleRefresh}
              disabled={loadingData}
              title="Recargar lista"
              aria-label="Recargar lista de estudiantes"
            >
              <RefreshCw size={15} className={loadingData ? 'spin-icon' : ''} />
            </button>
            <button
              className="btn-icon-round btn-add-user"
              onClick={handleExport}
              title="Exportar a Excel"
              aria-label="Exportar estudiantes a Excel"
            >
              <Download size={15} />
            </button>
            {isAdmin && (
              <button
                className="btn-icon-round btn-add-user"
                onClick={() => setShowImport(true)}
                title="Importar estudiantes"
                aria-label="Importar estudiantes desde archivo"
              >
                <Upload size={15} />
              </button>
            )}
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por apellido, nombre o DNI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>

        {hookError && (
          <p style={{ textAlign: 'center', color: '#f87171', fontSize: '14px', padding: '10px 0' }}>
            {hookError}
          </p>
        )}

        {loadingData ? (
          <div className="user-mgmt-loading">
            <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            <span>Cargando estudiantes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
            {search ? 'No se encontraron estudiantes.' : 'No hay estudiantes registrados.'}
          </p>
        ) : (
          <div className="user-list">
            <div className="student-list-header">
              <span className="student-col-sortable" onClick={handleHeaderClick('apellido')}>
                Apellido y Nombre{renderSortIcon('apellido')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('dni')}>
                DNI{renderSortIcon('dni')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('edad')}>
                Edad{renderSortIcon('edad')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('planActual')}>
                Plan Actual{renderSortIcon('planActual')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('cursado')}>
                Cursado{renderSortIcon('cursado')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('estado')}>
                Estado{renderSortIcon('estado')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('gestion')}>
                Gestión{renderSortIcon('gestion')}
              </span>
              <span className="student-col-sortable" onClick={handleHeaderClick('documentacionCompleta')}>
                Doc.{renderSortIcon('documentacionCompleta')}
              </span>
              <span>Acciones</span>
            </div>
            {paginated.map(s => (
              <div key={s.id} className="student-row">
                <span className="student-name-text">
                  {s.apellido}, {s.nombre}
                </span>
                <span>{s.dni}</span>
                <span>{calcularEdad(s.fechaNacimiento)}</span>
                <span>
                  <span className="badge-plan">{s.planActual}</span>
                </span>
                <span>
                  <span className={`badge-${s.cursado}`}>{s.cursado === 'virtual' ? 'Virtual' : 'Presencial'}</span>
                </span>
                <span>
                  <span className={`badge-estado badge-${s.estado}`}>
                    {s.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </span>
                <span>
                  <span className={`badge-gestion badge-gestion-${s.gestion.replace(/\s+/g, '-')}`}>
                    {gestionLabel[s.gestion] ?? s.gestion}
                  </span>
                </span>
                <span>
                  <span className={`badge-doc ${s.documentacionCompleta === 'completa' ? 'badge-doc-completa' : 'badge-doc-incompleta'}`}>
                    {s.documentacionCompleta === 'completa' ? 'Completa' : 'Incompleta'}
                  </span>
                </span>
                <span className="student-col-acciones">
                  <button
                    className="btn-icon-round btn-action-doc"
                    onClick={() => handleOpenGrades(s)}
                    title="Calificaciones"
                    aria-label={`Calificaciones de ${s.apellido}, ${s.nombre}`}
                  >
                    <ClipboardList size={13} />
                  </button>
                  <button
                    className="btn-icon-round btn-action-doc"
                    onClick={() => setDocStudent(s)}
                    title="Documentación"
                    aria-label={`Documentación de ${s.apellido}, ${s.nombre}`}
                  >
                    <FileText size={13} />
                  </button>
                  {s.telefono && (
                    <a
                      href={`https://wa.me/549${s.telefono.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon-round"
                      title="WhatsApp"
                      style={{ color: '#25D366' }}
                      aria-label={`WhatsApp ${s.apellido}, ${s.nombre}`}
                    >
                      <MessageCircle size={13} />
                    </a>
                  )}
                  {isAdmin ? (
                    <>
                      <button
                        className="btn-icon-round btn-action-edit"
                        onClick={() => openEdit(s)}
                        title="Editar estudiante"
                        aria-label={`Editar ${s.apellido}, ${s.nombre}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn-icon-round btn-action-disable"
                        onClick={() => handleDelete(s)}
                        title="Eliminar estudiante"
                        aria-label={`Eliminar ${s.apellido}, ${s.nombre}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <span className="text-link" style={{ fontSize: '12px', cursor: 'default' }}>Solo lectura</span>
                  )}
                </span>
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

      {showModal === 'create' && (
        <StudentFormModal
          mode="create"
          onClose={() => setShowModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {showModal === 'edit' && editStudent && (
        <StudentFormModal
          mode="edit"
          initialData={editStudent}
          onClose={() => { setShowModal(null); setEditStudent(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {docStudent && (
        <StudentDocumentationModal
          student={docStudent}
          onClose={() => setDocStudent(null)}
          onSuccess={() => { setDocStudent(null); handleRefresh(); }}
        />
      )}

      {gradesStudent && (
        <div className="modal-overlay" onClick={() => { setGradesStudent(null); setShowGradeForm(false); setEditGradeData(null); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Calificaciones</h2>
              <button
                className="modal-close"
                onClick={() => { setGradesStudent(null); setShowGradeForm(false); setEditGradeData(null); }}
                aria-label="Cerrar"
              >
                <span style={{ fontSize: '18px' }}>✕</span>
              </button>
            </div>

            <div style={{ padding: '0 24px 12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Estudiante: <strong>{gradesStudent.apellido}, {gradesStudent.nombre}</strong>
              &nbsp;&middot;&nbsp;{gradesStudent.planActual}
              &nbsp;&middot;&nbsp;{gradesStudent.cursado === 'virtual' ? 'Virtual' : 'Presencial'}
              &nbsp;&middot;&nbsp;
              <span className={`badge-estado badge-${gradesStudent.estado}`}>
                {gradesStudent.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {!gradesStudent.planId ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 24px' }}>
                El estudiante no tiene un plan de estudios asignado.
              </p>
            ) : gradeModalGrades.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 24px' }}>
                Sin calificaciones cargadas.
              </p>
            ) : (
              <div style={{ padding: '0 24px 12px', maxHeight: '400px', overflowY: 'auto' }}>
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
                      {Object.entries(groupedGradeModalGrades)
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
                              <td style={{ padding: '8px 10px' }}>{getSubjectNameInModal(g.subjectId)}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{g.nota}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    className="btn-icon-round btn-action-edit"
                                    onClick={() => { setEditGradeData(g); setShowGradeForm(true); }}
                                    title="Editar"
                                    style={{ width: '24px', height: '24px' }}
                                  >
                                    <span style={{ fontSize: '11px' }}>✎</span>
                                  </button>
                                  <button
                                    className="btn-icon-round btn-action-disable"
                                    onClick={() => handleDeleteGradeFromModal(g)}
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
              </div>
            )}

            {gradesStudent.planId && (
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setGradesStudent(null); setShowGradeForm(false); setEditGradeData(null); }}
                >
                  Cerrar
                </button>
                <button
                  className="btn-submit"
                  onClick={() => { setEditGradeData(null); setShowGradeForm(true); }}
                  style={{ width: 'auto', padding: '10px 24px' }}
                >
                  <Plus size={14} style={{ marginRight: '6px' }} />
                  Agregar calificación
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showGradeForm && gradesStudent && (
        <GradesFormModal
          student={gradesStudent}
          planId={gradesStudent.planId || ''}
          subjects={user?.role === 'Profesor' && user.subjectIds
            ? gradeModalSubjects.filter(s => user.subjectIds!.includes(s.id))
            : gradeModalSubjects
          }
          initialData={editGradeData}
          onClose={() => { setShowGradeForm(false); setEditGradeData(null); }}
          onSuccess={handleGradeFormSuccess}
        />
      )}

      {showImport && (
        <BulkImportModal
          onClose={() => { setShowImport(false); handleRefresh(); }}
        />
      )}
    </div>
  );
};
