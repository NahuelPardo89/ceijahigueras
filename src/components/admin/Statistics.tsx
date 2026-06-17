import { useEffect, useState, useMemo } from 'react';
import { useStudents, type StudentRecord } from '../../hooks/useStudents';
import { BarChart3, Users, GraduationCap, Monitor, Download } from 'lucide-react';
import { exportToExcel } from '../../hooks/useExport';

const AGE_RANGES = [
  '15', '16', '17', '18', '19', '20', '21', '22', '23', '24',
  '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55+',
] as const;

const getAge = (fechaNacimiento: string): number | null => {
  const parts = fechaNacimiento.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const getAgeRange = (age: number): string => {
  if (age <= 24) return String(age);
  if (age <= 29) return '25-29';
  if (age <= 34) return '30-34';
  if (age <= 39) return '35-39';
  if (age <= 44) return '40-44';
  if (age <= 49) return '45-49';
  if (age <= 54) return '50-54';
  return '55+';
};

export const Statistics = () => {
  const { getAllStudents } = useStudents();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const all = await getAllStudents();
        if (!cancelled) setStudents(all);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStudents = useMemo(() => students.filter(s => s.estado === 'activo'), [students]);

  const planCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Plan A': 0, 'Plan B': 0, 'Plan C': 0 };
    for (const s of activeStudents) {
      if (s.planActual in counts) counts[s.planActual]++;
    }
    return counts;
  }, [activeStudents]);

  const modalityCounts = useMemo(() => {
    let virtual = 0;
    let presencial = 0;
    for (const s of activeStudents) {
      if (s.cursado === 'virtual') virtual++;
      else presencial++;
    }
    return { virtual, presencial };
  }, [activeStudents]);

  const agePlanTable = useMemo(() => {
    const rows: Record<string, Record<string, number>> = {};
    for (const range of AGE_RANGES) {
      rows[range] = { 'Plan A': 0, 'Plan B': 0, 'Plan C': 0, 'Total': 0 };
    }
    for (const s of activeStudents) {
      const age = getAge(s.fechaNacimiento);
      if (age === null) continue;
      const range = getAgeRange(age);
      if (!rows[range]) continue;
      rows[range][s.planActual]++;
      rows[range]['Total']++;
    }
    return rows;
  }, [activeStudents]);

  const planTotals = useMemo(() => {
    const totals = { 'Plan A': 0, 'Plan B': 0, 'Plan C': 0 };
    for (const row of Object.values(agePlanTable)) {
      totals['Plan A'] += row['Plan A'];
      totals['Plan B'] += row['Plan B'];
      totals['Plan C'] += row['Plan C'];
    }
    return totals;
  }, [agePlanTable]);

  const handleExport = () => {
    if (loading) return;
    const rows = AGE_RANGES.flatMap(range => {
      const row = agePlanTable[range];
      if (!row || row.Total === 0) return [];
      return [{ edad: range, planA: row['Plan A'], planB: row['Plan B'], planC: row['Plan C'], total: row.Total }];
    });
    exportToExcel(rows, [
      { header: 'Edad', accessor: r => r.edad },
      { header: 'Plan A', accessor: r => r.planA },
      { header: 'Plan B', accessor: r => r.planB },
      { header: 'Plan C', accessor: r => r.planC },
      { header: 'Total', accessor: r => r.total },
    ], 'estadisticas-edad-plan');
  };

  if (loading) {
    return (
      <div className="user-mgmt-panel">
        <div className="user-mgmt-loading">
          <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
          <span>Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={20} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Estadísticas</span>
        </div>
        <button
          className="btn-icon-round btn-add-user"
          onClick={handleExport}
          title="Exportar a Excel"
          aria-label="Exportar estadísticas a Excel"
        >
          <Download size={15} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="stat-card">
          <div className="stat-card-icon"><Users size={22} /></div>
          <div className="stat-card-value">{activeStudents.length}</div>
          <div className="stat-card-label">Estudiantes Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><GraduationCap size={22} /></div>
          <div className="stat-card-value">{modalityCounts.presencial}</div>
          <div className="stat-card-label">Presenciales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Monitor size={22} /></div>
          <div className="stat-card-value">{modalityCounts.virtual}</div>
          <div className="stat-card-label">Virtuales</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="stat-table-card">
          <div className="stat-table-title">Estudiantes por Plan</div>
          <table className="stat-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th style={{ textAlign: 'center' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(planCounts).map(([plan, count]) => (
                <tr key={plan}>
                  <td>{plan}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stat-table-card">
          <div className="stat-table-title">Estudiantes por Modalidad</div>
          <table className="stat-table">
            <thead>
              <tr>
                <th>Modalidad</th>
                <th style={{ textAlign: 'center' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Presencial</td><td style={{ textAlign: 'center', fontWeight: 600 }}>{modalityCounts.presencial}</td></tr>
              <tr><td>Virtual</td><td style={{ textAlign: 'center', fontWeight: 600 }}>{modalityCounts.virtual}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="stat-table-card" style={{ maxWidth: '100%', overflowX: 'auto' }}>
        <div className="stat-table-title">Edad por Plan</div>
        <table className="stat-table" style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <th>Edad</th>
              <th style={{ textAlign: 'center' }}>Plan A</th>
              <th style={{ textAlign: 'center' }}>Plan B</th>
              <th style={{ textAlign: 'center' }}>Plan C</th>
              <th style={{ textAlign: 'center' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {AGE_RANGES.map(range => {
              const row = agePlanTable[range];
              if (!row || row.Total === 0) return null;
              return (
                <tr key={range}>
                  <td style={{ fontWeight: 500 }}>{range}</td>
                  <td style={{ textAlign: 'center' }}>{row['Plan A'] || 0}</td>
                  <td style={{ textAlign: 'center' }}>{row['Plan B'] || 0}</td>
                  <td style={{ textAlign: 'center' }}>{row['Plan C'] || 0}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.Total}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border-glass)' }}>
              <td>Total</td>
              <td style={{ textAlign: 'center' }}>{planTotals['Plan A']}</td>
              <td style={{ textAlign: 'center' }}>{planTotals['Plan B']}</td>
              <td style={{ textAlign: 'center' }}>{planTotals['Plan C']}</td>
              <td style={{ textAlign: 'center' }}>{activeStudents.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
