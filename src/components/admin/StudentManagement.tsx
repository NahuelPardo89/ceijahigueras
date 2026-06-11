import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudents, type StudentRecord } from '../../hooks/useStudents';
import {
  GraduationCap, RefreshCw, Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown, FileText
} from 'lucide-react';
import { StudentFormModal } from './StudentFormModal';
import { StudentDocumentationModal } from './StudentDocumentationModal';
import { Pagination } from '../Pagination';

type SortField = keyof StudentRecord | 'edad';
type SortDir = 'asc' | 'desc';

const calcularEdad = (fechaNacimiento: string): number => {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad;
};

const gestionLabel: Record<string, string> = {
  'sin cargar': 'Sin Cargar',
  cargado: 'Cargado',
  'pase solicitado': 'Pase Solicitado',
  invalido: 'Inválido',
};

export const StudentManagement = () => {
  const { user } = useAuth();
  const { getAllStudents, deleteStudent, error: hookError } = useStudents();
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
                    onClick={() => setDocStudent(s)}
                    title="Documentación"
                    aria-label={`Documentación de ${s.apellido}, ${s.nombre}`}
                  >
                    <FileText size={13} />
                  </button>
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
    </div>
  );
};
