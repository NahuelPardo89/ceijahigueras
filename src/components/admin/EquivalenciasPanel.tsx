import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { esAdmin } from '../../domain/roles';
import { equivalenciaFueraDeTermino } from '../../domain/alertas';
import { NOTAS_VALIDAS } from '../../domain/notas';
import type { Calificacion, EquivalenciaRegistro, Rac, ResumenItem } from '../../domain/types';
import {
  calificacionesDe,
  crearEquivalencia,
  leerResumen,
  listarEquivalencias,
  racsDeEstudiante,
} from '../../services/escolar';
import { useToast } from '../../context/ToastContext';

export const EquivalenciasPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const admin = esAdmin(user?.role);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [directorio, setDirectorio] = useState<ResumenItem[]>([]);
  const [lista, setLista] = useState<EquivalenciaRegistro[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [racs, setRacs] = useState<Rac[]>([]);
  const [racId, setRacId] = useState('');
  const [espacios, setEspacios] = useState<Calificacion[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [origen, setOrigen] = useState('');
  const [nota, setNota] = useState('7');
  const [fecha, setFecha] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [refrendada, setRefrendada] = useState('Inspección Zona');
  const [modo, setModo] = useState('evaluación final');
  const [libro, setLibro] = useState('');

  const cargar = async () => {
    const [resumen, equivalencias] = await Promise.all([leerResumen(db, anio), listarEquivalencias(db)]);
    setDirectorio(resumen);
    setLista(equivalencias);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

  const elegirEstudiante = async (id: string) => {
    setEstudianteId(id);
    const encontrados = (await racsDeEstudiante(db, id)).filter((rac) => rac.estado === 'abierto');
    setRacs(encontrados);
    const primero = encontrados[0];
    setRacId(primero?.id ?? '');
    if (primero) {
      const notas = await calificacionesDe(db, primero.id);
      setEspacios(notas);
      setEspacioId(notas[0]?.espacioId ?? '');
    }
  };

  const fueraDeTermino = fecha ? equivalenciaFueraDeTermino(fecha, anio) : false;

  const guardar = async () => {
    if (!user) return;
    const estudiante = directorio.find((item) => item.id === estudianteId);
    const espacio = espacios.find((item) => item.espacioId === espacioId);
    if (!estudiante || !espacio) return;
    try {
      await crearEquivalencia(db, {
        estudianteId,
        espacioId,
        racId,
        nombreEspacio: espacio.nombre,
        origen,
        nota: Number(nota),
        fecha,
        resolucionInterna: resolucion,
        refrendadaPor: refrendada,
        modo,
        libroActasFolio: libro,
        creadoPor: user.uid,
        fechaCreacion: new Date().toISOString(),
      });
      toast('Equivalencia cargada y marcada en el RAC');
      await cargar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar la equivalencia.', 'error');
    }
  };

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header"><span style={{ fontWeight: 600 }}>Equivalencias</span></div>
      <p className="ayuda">Deben resolverse antes de julio del ciclo. Al guardar, la fila del RAC pasa a condición Equiv.</p>
      {admin && (
        <div className="bloque-asignacion">
          <div className="form-row">
            <input className="input-field" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            <select className="input-field" value={estudianteId} onChange={(e) => void elegirEstudiante(e.target.value)}>
              <option value="">Estudiante</option>
              {directorio.map((item) => <option key={item.id} value={item.id}>{item.apellido}, {item.nombre}</option>)}
            </select>
            <select className="input-field" value={racId} onChange={(e) => {
              setRacId(e.target.value);
              void calificacionesDe(db, e.target.value).then((notas) => { setEspacios(notas); setEspacioId(notas[0]?.espacioId ?? ''); });
            }}>
              {racs.map((rac) => <option key={rac.id} value={rac.id}>{rac.anio} · {rac.planId}</option>)}
            </select>
            <select className="input-field" value={espacioId} onChange={(e) => setEspacioId(e.target.value)}>
              {espacios.map((espacio) => <option key={espacio.espacioId} value={espacio.espacioId}>{espacio.nombre}</option>)}
            </select>
          </div>
          <div className="form-row">
            <input className="input-field" placeholder="Institución de origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
            <select className="input-field" value={nota} onChange={(e) => setNota(e.target.value)}>
              {NOTAS_VALIDAS.filter((valor) => valor >= 6).map((valor) => <option key={valor} value={valor}>{valor}</option>)}
            </select>
            <input className="input-field" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <input className="input-field" placeholder="Resolución interna" value={resolucion} onChange={(e) => setResolucion(e.target.value)} />
          </div>
          <div className="form-row">
            <select className="input-field" value={refrendada} onChange={(e) => setRefrendada(e.target.value)}>
              <option>Inspección Zona</option>
              <option>Inspección General</option>
            </select>
            <select className="input-field" value={modo} onChange={(e) => setModo(e.target.value)}>
              <option>evaluación final</option>
              <option>encuentro sincrónico</option>
            </select>
            <input className="input-field" placeholder="Libro, acta y folio" value={libro} onChange={(e) => setLibro(e.target.value)} />
            <button type="button" className="btn-submit" onClick={() => void guardar()} disabled={!estudianteId || !espacioId || !origen || !fecha}>Guardar</button>
          </div>
          {fueraDeTermino && <div className="alert alert-danger">La fecha es posterior al 1 de julio de {anio}. Las equivalencias de la sede se resuelven antes de julio.</div>}
        </div>
      )}
      <table className="tabla-rac">
        <thead><tr><th>Fecha</th><th>Espacio</th><th>Estudiante</th><th>Nota</th><th>Origen</th><th>Refrendada</th></tr></thead>
        <tbody>
          {lista.map((item) => (
            <tr key={item.id}>
              <td>{item.fecha}</td>
              <td>{item.nombreEspacio}</td>
              <td>{item.estudianteId}</td>
              <td>{item.nota}</td>
              <td>{item.origen}</td>
              <td>{item.refrendadaPor}</td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan={6}>No hay equivalencias cargadas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};
