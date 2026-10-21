import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { esAdmin } from '../../domain/roles';
import { alertaPase, hoyIso, vencimientoPaseProvisorio, type AlertaPase } from '../../domain/alertas';
import type { PaseRegistro, ResumenItem, TipoPase } from '../../domain/types';
import { guardarPase, leerResumen, listarPases } from '../../services/escolar';
import { useToast } from '../../context/ToastContext';

const ETIQUETA: Record<AlertaPase, string> = {
  vencido: 'Vencido',
  'por-vencer': 'Vence en 15 días',
  vigente: 'En término',
  'no-aplica': 'Sin alerta',
};

export const PasesPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const admin = esAdmin(user?.role);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [directorio, setDirectorio] = useState<ResumenItem[]>([]);
  const [pases, setPases] = useState<PaseRegistro[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [tipo, setTipo] = useState<TipoPase>('ingreso');
  const [escuela, setEscuela] = useState('');
  const [fecha, setFecha] = useState(hoyIso());
  const [provisorio, setProvisorio] = useState(true);
  const [definitivo, setDefinitivo] = useState(false);
  const [formularioD, setFormularioD] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  const cargar = async () => {
    const [resumen, lista] = await Promise.all([leerResumen(db, anio), listarPases(db)]);
    setDirectorio(resumen);
    setPases(lista);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

  const guardar = async () => {
    const estudiante = directorio.find((item) => item.id === estudianteId);
    if (!estudiante) return;
    const vencimiento = provisorio && !definitivo ? vencimientoPaseProvisorio(fecha) : '';
    try {
      await guardarPase(db, {
        estudianteId,
        apellido: estudiante.apellido,
        nombre: estudiante.nombre,
        tipo,
        escuelaOrigenDestino: escuela,
        fecha,
        provisorio,
        definitivo,
        vencimiento,
        formularioD,
        observaciones,
      });
      toast('Pase guardado');
      setEscuela('');
      await cargar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el pase.', 'error');
    }
  };

  const alertas = pases.filter((pase) => {
    const estado = alertaPase(pase);
    return estado === 'vencido' || estado === 'por-vencer';
  });

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header"><span style={{ fontWeight: 600 }}>Pases</span></div>
      <p className="ayuda">El pase provisorio vence a los 60 días si no pasa a definitivo.</p>
      {alertas.length > 0 && (
        <div className="alert alert-danger">
          {alertas.length} pase{alertas.length === 1 ? '' : 's'} provisorio{alertas.length === 1 ? '' : 's'} vencido{alertas.length === 1 ? '' : 's'} o por vencer.
        </div>
      )}
      {admin && (
        <div className="form-row">
          <input className="input-field" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
          <select className="input-field" value={estudianteId} onChange={(e) => setEstudianteId(e.target.value)}>
            <option value="">Estudiante</option>
            {directorio.map((item) => <option key={item.id} value={item.id}>{item.apellido}, {item.nombre}</option>)}
          </select>
          <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoPase)}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
          <input className="input-field" placeholder="Escuela de origen o destino" value={escuela} onChange={(e) => setEscuela(e.target.value)} />
          <input className="input-field" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <label className="check-linea"><input type="checkbox" checked={provisorio} onChange={(e) => setProvisorio(e.target.checked)} /> Provisorio</label>
          <label className="check-linea"><input type="checkbox" checked={definitivo} onChange={(e) => setDefinitivo(e.target.checked)} /> Definitivo</label>
          <label className="check-linea"><input type="checkbox" checked={formularioD} onChange={(e) => setFormularioD(e.target.checked)} /> Formulario D</label>
          <input className="input-field" placeholder="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          <button type="button" className="btn-submit" onClick={() => void guardar()} disabled={!estudianteId || !escuela || !fecha}>Guardar pase</button>
        </div>
      )}
      <table className="tabla-rac">
        <thead><tr><th>Estudiante</th><th>Tipo</th><th>Escuela</th><th>Fecha</th><th>Vencimiento</th><th>Alerta</th></tr></thead>
        <tbody>
          {pases.map((pase) => {
            const estado = alertaPase(pase);
            return (
              <tr key={pase.id}>
                <td>{pase.apellido}, {pase.nombre}</td>
                <td>{pase.tipo}</td>
                <td>{pase.escuelaOrigenDestino}</td>
                <td>{pase.fecha}</td>
                <td>{pase.vencimiento || '—'}</td>
                <td className={estado === 'vencido' ? 'alerta-vencido' : estado === 'por-vencer' ? 'alerta-pronto' : ''}>{ETIQUETA[estado]}</td>
              </tr>
            );
          })}
          {pases.length === 0 && <tr><td colSpan={6}>No hay pases cargados.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};
