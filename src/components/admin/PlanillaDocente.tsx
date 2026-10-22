import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { NOTAS_VALIDAS, notaEnLetras } from '../../domain/notas';
import type { AsignacionDocente, Calificacion, DocentePerfil } from '../../domain/types';
import { guardarCalificacion, leerCalificacion, leerDocente, leerIndice } from '../../services/escolar';
import { exportarPlanilla, type FilaPlanilla } from '../../services/excel';
import { useToast } from '../../context/ToastContext';

interface FilaEditable {
  estudianteId: string;
  racId: string;
  apellido: string;
  nombre: string;
  dniEnmascarado: string;
  nota: Calificacion | null;
}

export const PlanillaDocente = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<DocentePerfil | null>(null);
  const [clave, setClave] = useState('');
  const [titulo, setTitulo] = useState('');
  const [filas, setFilas] = useState<FilaEditable[]>([]);

  useEffect(() => {
    if (!user) return;
    void leerDocente(db, user.uid).then((docente) => {
      setPerfil(docente);
      const primera = docente?.asignaciones?.[0];
      if (primera) setClave(`${primera.planId}|${primera.espacioId}|${primera.anio}`);
    }).catch((err) => console.error(err));
  }, [user]);

  useEffect(() => {
    if (!clave) return;
    const [planId, espacioId, anioTexto] = clave.split('|');
    const anio = Number(anioTexto);
    void (async () => {
      const indice = await leerIndice(db, anio, planId, espacioId);
      setTitulo(indice?.nombreEspacio ?? espacioId);
      const cargadas: FilaEditable[] = [];
      for (const fila of indice?.filas ?? []) {
        const nota = await leerCalificacion(db, fila.racId, espacioId);
        cargadas.push({ ...fila, nota });
      }
      setFilas(cargadas);
    })().catch((err) => {
      console.error(err);
      toast('No se pudo abrir la planilla. Revisa que tengas el espacio asignado.', 'error');
    });
  // toast es estable para este aviso de error de carga.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const guardar = async (fila: FilaEditable) => {
    if (!user || !fila.nota) return;
    const [, espacioId] = clave.split('|');
    try {
      await guardarCalificacion(db, fila.racId, espacioId, {
        notaFinal: fila.nota.notaFinal,
        tpi: fila.nota.tpi,
        fecha: fila.nota.fecha,
        docenteUid: user.uid,
      });
      toast(`Nota de ${fila.apellido} guardada`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar.', 'error');
    }
  };

  const exportar = () => {
    const datos: FilaPlanilla[] = filas.map((fila) => ({
      apellido: fila.apellido,
      nombre: fila.nombre,
      dniEnmascarado: fila.dniEnmascarado,
      nota: fila.nota?.notaFinal == null ? '' : String(fila.nota.notaFinal),
      tpi: fila.nota?.tpi ?? '',
      fecha: fila.nota?.fecha ?? '',
      condicion: fila.nota?.condicion ?? '',
      estado: fila.nota?.estado ?? '',
    }));
    exportarPlanilla(datos, `Planilla ${titulo}`);
  };

  const cambiar = (estudianteId: string, patch: Partial<Calificacion>) => {
    setFilas((prev) => prev.map((fila) => {
      if (fila.estudianteId !== estudianteId || !fila.nota) return fila;
      const nota = { ...fila.nota, ...patch };
      if (patch.notaFinal !== undefined) nota.notaLetras = patch.notaFinal == null ? '' : notaEnLetras(patch.notaFinal);
      return { ...fila, nota };
    }));
  };

  const asignaciones: AsignacionDocente[] = perfil?.asignaciones ?? [];

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header">
        <span style={{ fontWeight: 600 }}>Planilla {titulo || 'docente'}</span>
        <button type="button" className="btn-secondary" onClick={exportar} disabled={filas.length === 0}>Exportar Excel</button>
      </div>
      {asignaciones.length === 0 ? (
        <p className="ayuda">Todavía no tienes espacios asignados. Un administrador los carga en Usuarios.</p>
      ) : (
        <label className="form-label">Espacio
          <select className="input-field" value={clave} onChange={(e) => setClave(e.target.value)}>
            {asignaciones.map((asignacion) => {
              const id = `${asignacion.planId}|${asignacion.espacioId}|${asignacion.anio}`;
              return <option key={id} value={id}>{asignacion.anio} · {asignacion.planId} · {asignacion.nombreEspacio || asignacion.espacioId}</option>;
            })}
          </select>
        </label>
      )}
      <div className="tabla-wrap">
        <table className="tabla-rac">
          <thead>
            <tr><th>Estudiante</th><th>DNI</th><th>TPI</th><th>Nota</th><th>En letras</th><th>Fecha</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.racId}>
                <td>{fila.apellido}, {fila.nombre}</td>
                <td>{fila.dniEnmascarado}</td>
                <td>
                  <select className="input-field" value={fila.nota?.tpi ?? ''} onChange={(e) => cambiar(fila.estudianteId, { tpi: e.target.value as Calificacion['tpi'] })}>
                    <option value="">—</option>
                    <option value="APROBADO">APROBADO</option>
                    <option value="REVISAR">REVISAR</option>
                  </select>
                </td>
                <td>
                  <select className="input-field" value={fila.nota?.notaFinal ?? ''} onChange={(e) => cambiar(fila.estudianteId, { notaFinal: e.target.value === '' ? null : Number(e.target.value) })}>
                    <option value="">—</option>
                    {NOTAS_VALIDAS.map((nota) => <option key={nota} value={nota}>{nota}</option>)}
                  </select>
                </td>
                <td>{fila.nota?.notaLetras || '—'}</td>
                <td><input className="input-field" placeholder="03/26" value={fila.nota?.fecha ?? ''} onChange={(e) => cambiar(fila.estudianteId, { fecha: e.target.value })} /></td>
                <td>{fila.nota?.estado ?? '—'}</td>
                <td><button type="button" className="btn-secondary" onClick={() => void guardar(fila)}>Guardar</button></td>
              </tr>
            ))}
            {clave && filas.length === 0 && <tr><td colSpan={8}>No hay estudiantes en este espacio.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
