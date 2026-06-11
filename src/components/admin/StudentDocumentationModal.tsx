import { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStudents, type StudentRecord, type CertificadoPrimaria, type DocCompleta } from '../../hooks/useStudents';
import { X, FileText } from 'lucide-react';
import { getFirebaseErrorMessage } from '../../utils/errors';
import { useToast } from '../../context/ToastContext';

interface Props {
  student: StudentRecord;
  onClose: () => void;
  onSuccess: () => void;
}

const calcularEdad = (f: string): number => {
  const hoy = new Date();
  const nac = new Date(f);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
};

export const StudentDocumentationModal = ({ student, onClose, onSuccess }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { updateStudent, loading } = useStudents();
  const isAdmin = user?.role === 'Administrador';

  const [doc, setDoc] = useState({
    paseProvisorio: student.paseProvisorio ?? false,
    paseDefinitivo: student.paseDefinitivo ?? false,
    fotocopiaDni: student.fotocopiaDni ?? false,
    cus: student.cus ?? false,
    certificadoPrimaria: (student.certificadoPrimaria ?? 'no corresponde') as CertificadoPrimaria,
    numeroEquivalencia: student.numeroEquivalencia ?? '',
    linkTitulo: student.linkTitulo ?? '',
    documentacionCompleta: (student.documentacionCompleta ?? 'incompleta') as DocCompleta,
    observaciones: student.observaciones ?? '',
  });

  const handleToggle = (field: 'paseProvisorio' | 'paseDefinitivo' | 'fotocopiaDni' | 'cus') => {
    setDoc(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field: string, value: string) => {
    setDoc(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      await updateStudent(student.id, doc);
      toast('Documentación guardada exitosamente');
      onSuccess();
    } catch (err) {
      toast(getFirebaseErrorMessage(err, 'generic'), 'error');
    }
  };

  const edad = useMemo(() => calcularEdad(student.fechaNacimiento), [student.fechaNacimiento]);

  const gestionLabel: Record<string, string> = {
    'sin cargar': 'Sin Cargar', cargado: 'Cargado', 'pase solicitado': 'Pase Solicitado', invalido: 'Inválido',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            Documentación
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="doc-modal-content">
            {/* Datos del estudiante (read-only) */}
            <div className="doc-section">
              <h3 className="doc-section-title">Datos del Estudiante</h3>
              <div className="doc-student-grid">
                <div><span className="doc-label">Apellido:</span> {student.apellido}</div>
                <div><span className="doc-label">Nombre:</span> {student.nombre}</div>
                <div><span className="doc-label">DNI:</span> {student.dni}</div>
                <div><span className="doc-label">CUIL:</span> {student.cuil}</div>
                <div><span className="doc-label">Email:</span> {student.email}</div>
                <div><span className="doc-label">Teléfono:</span> {student.telefono}</div>
                <div><span className="doc-label">Edad:</span> {edad} años</div>
                <div><span className="doc-label">Fecha Nac.:</span> {student.fechaNacimiento}</div>
                <div><span className="doc-label">Estado:</span> <span className={`badge-estado badge-${student.estado}`}>{student.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></div>
                <div><span className="doc-label">Plan Actual:</span> <span className="badge-plan">{student.planActual}</span></div>
                <div><span className="doc-label">Cursado:</span> <span className={`badge-${student.cursado}`}>{student.cursado === 'virtual' ? 'Virtual' : 'Presencial'}</span></div>
                <div><span className="doc-label">Gestión:</span> <span className={`badge-gestion badge-gestion-${student.gestion.replace(/\s+/g, '-')}`}>{gestionLabel[student.gestion]}</span></div>
              </div>
            </div>

            {/* Documentación (editable) */}
            <div className="doc-section">
              <h3 className="doc-section-title">Documentación</h3>

              <div className="doc-checkboxes">
                <div className="doc-check-row">
                  <span className="doc-label">Pase Provisorio</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={doc.paseProvisorio} onChange={() => handleToggle('paseProvisorio')} disabled={!isAdmin} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-status">{doc.paseProvisorio ? 'Entregado' : 'No entregado'}</span>
                </div>
                <div className="doc-check-row">
                  <span className="doc-label">Pase Definitivo</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={doc.paseDefinitivo} onChange={() => handleToggle('paseDefinitivo')} disabled={!isAdmin} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-status">{doc.paseDefinitivo ? 'Entregado' : 'No entregado'}</span>
                </div>
                <div className="doc-check-row">
                  <span className="doc-label">Fotocopia de DNI</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={doc.fotocopiaDni} onChange={() => handleToggle('fotocopiaDni')} disabled={!isAdmin} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-status">{doc.fotocopiaDni ? 'Entregado' : 'No entregado'}</span>
                </div>
                <div className="doc-check-row">
                  <span className="doc-label">CUS</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={doc.cus} onChange={() => handleToggle('cus')} disabled={!isAdmin} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-status">{doc.cus ? 'Entregado' : 'No entregado'}</span>
                </div>
              </div>

              <div className="doc-fields">
                <div className="form-group">
                  <label className="form-label">Certificado de Primaria</label>
                  <select
                    className="role-select"
                    value={doc.certificadoPrimaria}
                    onChange={e => handleChange('certificadoPrimaria', e.target.value)}
                    disabled={!isAdmin}
                    style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                  >
                    <option value="no corresponde">No Corresponde</option>
                    <option value="original">Original</option>
                    <option value="constancia correcta">Constancia Correcta</option>
                    <option value="constancia incorrecta">Constancia Incorrecta</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Número de Equivalencia</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: 1234/2023"
                      value={doc.numeroEquivalencia}
                      onChange={e => handleChange('numeroEquivalencia', e.target.value)}
                      disabled={!isAdmin}
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link Título</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="https://..."
                      value={doc.linkTitulo}
                      onChange={e => handleChange('linkTitulo', e.target.value)}
                      disabled={!isAdmin}
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Documentación Completa</label>
                  <select
                    className="role-select"
                    value={doc.documentacionCompleta}
                    onChange={e => handleChange('documentacionCompleta', e.target.value)}
                    disabled={!isAdmin}
                    style={{ width: '100%', fontSize: '14px', padding: '14px 16px', borderRadius: 'var(--radius-input)' }}
                  >
                    <option value="completa">Completa</option>
                    <option value="incompleta">Incompleta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="input-field doc-textarea"
                    placeholder="Observaciones sobre la documentación..."
                    value={doc.observaciones}
                    onChange={e => handleChange('observaciones', e.target.value)}
                    disabled={!isAdmin}
                    style={{ paddingLeft: '16px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="btn-submit" onClick={handleSubmit} disabled={loading} style={{ width: 'auto', padding: '10px 24px' }}>
                  {loading ? (
                    <><div className="spinner"></div><span>Guardando...</span></>
                  ) : (
                    <span>Guardar Documentación</span>
                  )}
                </button>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};
