import { useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import type { StudentRecord } from '../../hooks/useStudents';
import type { Subject } from '../../hooks/useSubjects';
import type { Grade } from '../../hooks/useGrades';
import type { Equivalence } from '../../hooks/useEquivalences';
import { calcularEdad } from '../../utils/dates';
import logoSrc from '../../assets/logo-CEIJA-HIGUERAS.png';

interface Props {
  student: StudentRecord;
  subjects: Subject[];
  grades: Grade[];
  equivalences: Equivalence[];
  onClose: () => void;
}

export const GradeReportModal = ({ student, subjects, grades, equivalences, onClose }: Props) => {
  const subjectsByModulo = useMemo(() => {
    const bestGrade: Record<string, Grade> = {};
    for (const g of grades) {
      const existing = bestGrade[g.subjectId];
      if (!existing) {
        bestGrade[g.subjectId] = g;
      } else {
        const gNum = Number(g.nota);
        const eNum = Number(existing.nota);
        if (!isNaN(gNum) && (isNaN(eNum) || gNum > eNum)) {
          bestGrade[g.subjectId] = g;
        }
      }
    }

    const groups: Record<number, { subject: Subject; grade: Grade | null }[]> = {};
    const sorted = [...subjects].sort((a, b) => a.modulo - b.modulo || a.order - b.order);
    for (const s of sorted) {
      if (!groups[s.modulo]) groups[s.modulo] = [];
      groups[s.modulo].push({ subject: s, grade: bestGrade[s.id] || null });
    }
    return groups;
  }, [subjects, grades]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-glass)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} />
            Boletín de Calificaciones
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="print-report" style={{ padding: '32px 40px' }}>
          <div className="report-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={logoSrc} alt="CEIJA N°12" style={{ width: '80px', height: 'auto', marginBottom: '8px' }} />
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', color: 'var(--color-text-primary)' }}>
              CEIJA N°12 Remedios Escalada de San Martín
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>Sede Las Higueras</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0' }}>España 36, Las Higueras</p>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '2px solid var(--accent-primary)', opacity: 0.5 }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0', color: 'var(--accent-primary)', letterSpacing: '2px' }}>
              BOLETÍN DE CALIFICACIONES
            </h2>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <table className="stat-table" style={{ width: '100%', fontSize: '13px' }}>
              <tbody>
                <tr><td style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '160px' }}>Apellido y Nombre:</td><td style={{ padding: '4px 8px' }}>{student.apellido}, {student.nombre}</td></tr>
                <tr><td style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>DNI:</td><td style={{ padding: '4px 8px' }}>{student.dni}</td></tr>
                <tr><td style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Edad:</td><td style={{ padding: '4px 8px' }}>{calcularEdad(student.fechaNacimiento)} años</td></tr>
                <tr><td style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Plan:</td><td style={{ padding: '4px 8px' }}>{student.planActual}</td></tr>
                <tr><td style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cursado:</td><td style={{ padding: '4px 8px' }}>{student.cursado === 'virtual' ? 'Virtual' : 'Presencial'}</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Calificaciones
            </h3>
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
                  {Object.entries(subjectsByModulo)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .flatMap(([mod, items]) =>
                      items.map(({ subject, grade }) => (
                        <tr key={subject.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>M{mod}</td>
                          <td style={{ padding: '8px 10px' }}>{subject.nombre}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: grade ? undefined : 'var(--color-danger)' }}>
                            {grade ? grade.nota : 'Adeuda'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            {grade ? grade.fecha : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {equivalences.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Equivalencias
              </h3>
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
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
              Fecha de emisión: {new Date().toLocaleDateString('es-AR')}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0' }}>
              CEIJA N°12 Remedios Escalada de San Martín — Sede Las Higueras
            </p>
          </div>
        </div>

        <div className="modal-actions" style={{ borderTop: '1px solid var(--border-glass)', padding: '12px 24px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn-submit"
            onClick={() => window.print()}
            style={{ width: 'auto', padding: '10px 24px' }}
          >
            <Printer size={16} style={{ marginRight: '6px' }} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};
