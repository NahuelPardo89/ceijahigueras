import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import logoSrc from '../../assets/logo-CEIJA-HIGUERAS.png';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { esAdmin } from '../../domain/roles';
import { INSTITUCION_INICIAL } from '../../domain/planesSede';
import { NOTAS_VALIDAS, notaEnLetras } from '../../domain/notas';
import { racIdDe } from '../../domain/claves';
import type { Calificacion, Plan, Rac, ResumenItem } from '../../domain/types';
import {
  calificacionesDe,
  cerrarRac,
  guardarCalificacion,
  generarRacSiguiente,
  leerResumen,
  listarPlanes,
  racsDeEstudiante,
  reabrirRac,
} from '../../services/escolar';
import { useToast } from '../../context/ToastContext';

export const RacPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const admin = esAdmin(user?.role);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [directorio, setDirectorio] = useState<ResumenItem[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [racs, setRacs] = useState<Rac[]>([]);
  const [racId, setRacId] = useState('');
  const [filas, setFilas] = useState<Calificacion[]>([]);
  const [planDestino, setPlanDestino] = useState('');
  const [anioDestino, setAnioDestino] = useState(new Date().getFullYear() + 1);

  useEffect(() => {
    void Promise.all([leerResumen(db, anio), listarPlanes(db)])
      .then(([lista, listaPlanes]) => {
        setDirectorio(lista);
        setPlanes(listaPlanes);
        if (!planDestino && listaPlanes[0]) setPlanDestino(listaPlanes[0].id);
      })
      .catch((err) => {
        console.error(err);
        toast('No se pudo cargar el directorio.', 'error');
      });
  // El directorio se recarga solo cuando cambia el año.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

  const abrirEstudiante = async (id: string) => {
    setEstudianteId(id);
    const lista = await racsDeEstudiante(db, id);
    setRacs(lista);
    const preferido = lista.find((rac) => rac.anio === anio) ?? lista[0];
    if (preferido) {
      setRacId(preferido.id);
      setFilas(await calificacionesDe(db, preferido.id));
    } else {
      setRacId('');
      setFilas([]);
    }
  };

  const abrirRac = async (id: string) => {
    setRacId(id);
    setFilas(await calificacionesDe(db, id));
  };

  const guardarFila = async (fila: Calificacion) => {
    if (!user) return;
    try {
      await guardarCalificacion(db, racId, fila.espacioId, {
        notaFinal: fila.notaFinal,
        tpi: fila.tpi,
        fecha: fila.fecha,
        docenteUid: user.uid,
      });
      toast('Nota guardada');
      setFilas(await calificacionesDe(db, racId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar la nota.', 'error');
    }
  };

  const cerrar = async () => {
    if (!window.confirm('Al cerrar el RAC, lo que no está aprobado queda como ADEUDA y deja de editarse.')) return;
    try {
      await cerrarRac(db, racId);
      toast('RAC cerrado');
      setFilas(await calificacionesDe(db, racId));
      if (estudianteId) setRacs(await racsDeEstudiante(db, estudianteId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo cerrar el RAC.', 'error');
    }
  };

  const siguiente = async () => {
    const rac = racs.find((item) => item.id === racId);
    if (!rac || !user) return;
    try {
      const resultado = await generarRacSiguiente(db, {
        uid: user.uid,
        anioOrigen: rac.anio,
        anioDestino,
        planOrigenId: rac.planId,
        planDestinoId: planDestino,
        soloEstudianteId: rac.estudianteId,
      });
      toast(resultado.creados ? 'RAC del ciclo siguiente generado' : 'Ese RAC ya existía');
      await abrirEstudiante(rac.estudianteId);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo generar el RAC.', 'error');
    }
  };

  const rac = racs.find((item) => item.id === racId);
  const estudiante = directorio.find((item) => item.id === estudianteId);
  const abierto = rac?.estado === 'abierto';

  return (
    <div>
      <div className="user-mgmt-panel no-print">
        <div className="user-mgmt-header">
          <span style={{ fontWeight: 600 }}>RAC del estudiante</span>
          <button type="button" className="btn-secondary" onClick={() => window.print()} disabled={!rac}><Printer size={16} /> Imprimir</button>
        </div>
        <div className="form-row">
          <label className="form-label">Año del directorio
            <input className="input-field" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
          </label>
          <label className="form-label">Estudiante
            <select className="input-field" value={estudianteId} onChange={(e) => void abrirEstudiante(e.target.value)}>
              <option value="">Elegir</option>
              {directorio.map((item) => <option key={item.id} value={item.id}>{item.apellido}, {item.nombre}</option>)}
            </select>
          </label>
          {racs.length > 0 && (
            <label className="form-label">RAC
              <select className="input-field" value={racId} onChange={(e) => void abrirRac(e.target.value)}>
                {racs.map((item) => <option key={item.id} value={item.id}>{item.anio} · {item.planId} · {item.estado}</option>)}
              </select>
            </label>
          )}
        </div>
        {admin && rac && (
          <div className="form-row">
            {abierto ? (
              <button type="button" className="btn-secondary" onClick={() => void cerrar()}>Cerrar RAC</button>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => void reabrirRac(db, racId).then(() => abrirEstudiante(estudianteId))}>Reabrir RAC</button>
            )}
            <select className="input-field" value={planDestino} onChange={(e) => setPlanDestino(e.target.value)}>
              {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}
            </select>
            <input className="input-field" type="number" value={anioDestino} onChange={(e) => setAnioDestino(Number(e.target.value))} />
            <button type="button" className="btn-submit" onClick={() => void siguiente()}>Generar RAC del ciclo siguiente</button>
          </div>
        )}
        {rac && <p className="ayuda">Identificador {racIdDe(rac.estudianteId, rac.anio, rac.planId)}. Promedio {rac.resumen?.promedio ?? '—'}{rac.resumen?.adeuda?.length ? ` · Adeuda: ${rac.resumen.adeuda.join(', ')}` : ''}</p>}
      </div>

      {rac && (
        <div className="print-report rac-print">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src={logoSrc} alt="CEIJA N°12" style={{ width: 72 }} />
            <h1 style={{ fontSize: 16 }}>{INSTITUCION_INICIAL.nombre}</h1>
            <p>Sede {INSTITUCION_INICIAL.sede} · CUE {INSTITUCION_INICIAL.cue}</p>
            <h2>REGISTRO ANUAL DE CALIFICACIONES {rac.anio}</h2>
            <p>{estudiante ? `${estudiante.apellido}, ${estudiante.nombre}` : `${rac.apellido}, ${rac.nombre}`} · DNI {estudiante?.dniEnmascarado ?? '—'} · {rac.planId} · {rac.estado}</p>
          </div>
          <table className="tabla-rac stat-table">
            <thead>
              <tr>
                <th>Espacio</th><th>Mód.</th><th>Cond.</th><th>TPI</th><th>Nota</th><th>En letras</th><th>Fecha</th><th>Estado</th>
                {admin && abierto && <th className="no-print"></th>}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.espacioId}>
                  <td>{fila.nombre}</td>
                  <td>{fila.modulo}</td>
                  <td>{fila.condicion || '—'}</td>
                  <td>
                    {admin && abierto ? (
                      <select className="input-field no-print" value={fila.tpi} onChange={(e) => setFilas((prev) => prev.map((item) => item.espacioId === fila.espacioId ? { ...item, tpi: e.target.value as Calificacion['tpi'] } : item))}>
                        <option value="">—</option>
                        <option value="APROBADO">APROBADO</option>
                        <option value="REVISAR">REVISAR</option>
                      </select>
                    ) : fila.tpi || '—'}
                    {admin && abierto && <span className="solo-print">{fila.tpi || '—'}</span>}
                  </td>
                  <td>
                    {admin && abierto ? (
                      <select
                        className="input-field no-print"
                        value={fila.notaFinal ?? ''}
                        onChange={(e) => {
                          const notaFinal = e.target.value === '' ? null : Number(e.target.value);
                          setFilas((prev) => prev.map((item) => item.espacioId === fila.espacioId ? { ...item, notaFinal, notaLetras: notaFinal == null ? '' : notaEnLetras(notaFinal) } : item));
                        }}
                      >
                        <option value="">—</option>
                        {NOTAS_VALIDAS.map((nota) => <option key={nota} value={nota}>{nota}</option>)}
                      </select>
                    ) : fila.notaFinal ?? '—'}
                    {admin && abierto && <span className="solo-print">{fila.notaFinal ?? '—'}</span>}
                  </td>
                  <td>{fila.notaLetras || '—'}</td>
                  <td>
                    {admin && abierto ? (
                      <input className="input-field no-print" placeholder="03/26" value={fila.fecha} onChange={(e) => setFilas((prev) => prev.map((item) => item.espacioId === fila.espacioId ? { ...item, fecha: e.target.value } : item))} />
                    ) : fila.fecha || '—'}
                    {admin && abierto && <span className="solo-print">{fila.fecha || '—'}</span>}
                  </td>
                  <td>{fila.estado}</td>
                  {admin && abierto && <td className="no-print"><button type="button" className="btn-secondary" onClick={() => void guardarFila(fila)}>Guardar</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ayuda">Herramienta interna. No reemplaza al Libro Matriz ni al SGE.</p>
        </div>
      )}
    </div>
  );
};
