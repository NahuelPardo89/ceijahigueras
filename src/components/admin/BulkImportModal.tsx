import { useState, useRef, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { checkFieldUnique, DEFAULT_DOC, type CreateStudentData } from '../../hooks/useStudents';
import { X, Upload, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface Props {
  onClose: () => void;
}

type PreviewRow = {
  index: number;
  data: Partial<CreateStudentData>;
  errors: string[];
  valid: boolean;
};

const normalizeHeader = (h: string): string => h.toLowerCase().replace(/[\s\-_]/g, '');

export const BulkImportModal = ({ onClose }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; errors: number } | null>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (json.length === 0) {
          toast('El archivo está vacío.', 'error');
          return;
        }

        const rows: PreviewRow[] = json.map((raw, i) => {
          const errors: string[] = [];
          const row: Partial<CreateStudentData> = {};

          const get = (key: string): string => {
            const normalized = normalizeHeader(key);
            for (const [k, v] of Object.entries(raw)) {
              if (normalizeHeader(k) === normalized) return String(v ?? '').trim();
            }
            return '';
          };

          row.apellido = get('apellido');
          row.nombre = get('nombre');
          row.dni = get('dni');
          row.cuil = get('cuil');
          row.email = get('email');
          row.telefono = get('telefono');
          row.fechaNacimiento = get('fechaNacimiento');
          row.planInicial = get('planInicial');
          row.planActual = (['Plan A', 'Plan B', 'Plan C'].includes(get('planActual')) ? get('planActual') : 'Plan A') as CreateStudentData['planActual'];
          row.cursado = (get('cursado').toLowerCase() === 'virtual' ? 'virtual' : 'presencial') as CreateStudentData['cursado'];
          row.estado = (get('estado').toLowerCase() === 'inactivo' ? 'inactivo' : 'activo') as CreateStudentData['estado'];
          row.gestion = (['sin cargar', 'cargado', 'pase solicitado', 'invalido'].includes(get('gestion').toLowerCase()) ? get('gestion').toLowerCase() : 'sin cargar') as CreateStudentData['gestion'];

          if (!row.apellido) errors.push('Apellido requerido');
          if (!row.nombre) errors.push('Nombre requerido');
          if (!row.dni) errors.push('DNI requerido');
          if (!row.cuil) errors.push('CUIL requerido');
          if (!row.fechaNacimiento) errors.push('Fecha nacimiento requerida');

          return { index: i + 2, data: row, errors, valid: errors.length === 0 };
        });

        setPreview(rows);
        setStep('preview');
      } catch {
        toast('Error al leer el archivo. Verifica que sea un .xlsx o .csv válido.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!user || user.role !== 'Administrador') {
      toast('Solo administradores pueden importar estudiantes.', 'error');
      return;
    }

    setImporting(true);
    const validRows = preview.filter(r => r.valid);
    let ok = 0;
    let errors = 0;

    for (const row of validRows) {
      try {
        if (!(await checkFieldUnique('dni', row.data.dni!))) {
          errors++;
          continue;
        }
        if (row.data.cuil && !(await checkFieldUnique('cuil', row.data.cuil!))) {
          errors++;
          continue;
        }
        if (row.data.email && !(await checkFieldUnique('email', row.data.email!))) {
          errors++;
          continue;
        }

        await addDoc(collection(db, 'students'), {
          ...DEFAULT_DOC,
          ...row.data,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        });
        ok++;
      } catch {
        errors++;
      }
    }

    setImportResult({ ok, errors });
    setStep('result');
    setImporting(false);

    if (ok > 0) {
      toast(`${ok} estudiantes importados exitosamente`);
    }
    if (errors > 0) {
      toast(`${errors} estudiantes no pudieron ser importados.`, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} />
            Importar Estudiantes
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={importing}>
            <X size={20} />
          </button>
        </div>

        {step === 'upload' && (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <FileSpreadsheet size={48} style={{ color: 'var(--accent-primary)', marginBottom: '16px' }} />
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Selecciona un archivo <strong>.xlsx</strong> o <strong>.csv</strong> con las columnas:
            </p>
            <div style={{
              fontSize: '12px', color: 'var(--color-text-muted)', background: 'var(--bg-glass)',
              padding: '12px 16px', borderRadius: 'var(--radius-input)', marginBottom: '20px',
              display: 'inline-block', textAlign: 'left',
            }}>
              Apellido, Nombre, DNI, CUIL, Email, Teléfono,<br />
              FechaNacimiento (YYYY-MM-DD), PlanInicial,<br />
              PlanActual (Plan A/B/C), Cursado (presencial/virtual),<br />
              Estado (activo/inactivo), Gestión (sin cargar/cargado/pase solicitado/invalido)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-submit"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 'auto', padding: '12px 32px' }}
            >
              <Upload size={16} style={{ marginRight: '8px' }} />
              Seleccionar Archivo
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Vista Previa</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                  {preview.filter(r => r.valid).length} válidos / {preview.filter(r => !r.valid).length} con errores
                </span>
              </div>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px 16px' }}>
              {preview.map(r => (
                <div key={r.index} className="user-row" style={{ borderLeft: `3px solid ${r.valid ? 'var(--color-success)' : 'var(--color-danger)'}`, marginBottom: '4px' }}>
                  <div className="user-info">
                    <span className="user-name">
                      {r.data.apellido}, {r.data.nombre}
                      {!r.valid && <span className="badge-disabled" style={{ marginLeft: '8px' }}>Inválido</span>}
                    </span>
                    <span className="user-email">
                      DNI: {r.data.dni} &middot; {r.data.planActual} &middot; {r.data.cursado}
                      {r.errors.length > 0 && <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>{r.errors.join(', ')}</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-glass)' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep('upload')} disabled={importing}>
                Volver
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleImport}
                disabled={importing || preview.filter(r => r.valid).length === 0}
                style={{ width: 'auto', padding: '10px 24px' }}
              >
                {importing ? (
                  <><div className="spinner"></div><span>Importando...</span></>
                ) : (
                  <span>Importar {preview.filter(r => r.valid).length} estudiantes</span>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Importación completada
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              {importResult.ok} estudiantes importados correctamente.
            </p>
            {importResult.errors > 0 && (
              <p style={{ fontSize: '14px', color: 'var(--color-danger)' }}>
                {importResult.errors} registros con errores (DNI/CUIL duplicado o datos inválidos).
              </p>
            )}
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '24px' }}>
              <button type="button" className="btn-submit" onClick={onClose} style={{ width: 'auto', padding: '10px 24px' }}>
                Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
