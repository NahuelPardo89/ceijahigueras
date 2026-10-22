import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import type { Ciclo, Plan } from '../../domain/types';
import { cerrarCiclo, crearCiclo, generarRacSiguiente, listarCiclos, listarPlanes } from '../../services/escolar';
import { useToast } from '../../context/ToastContext';

export const CiclosPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [anioNuevo, setAnioNuevo] = useState(new Date().getFullYear());
  const [origen, setOrigen] = useState(new Date().getFullYear());
  const [destino, setDestino] = useState(new Date().getFullYear() + 1);
  const [planOrigen, setPlanOrigen] = useState('');
  const [planDestino, setPlanDestino] = useState('');

  const cargar = async () => {
    const [lista, listaPlanes] = await Promise.all([listarCiclos(db), listarPlanes(db)]);
    setCiclos(lista);
    setPlanes(listaPlanes);
    if (!planOrigen && listaPlanes[0]) setPlanOrigen(listaPlanes[0].id);
    if (!planDestino && listaPlanes[1]) setPlanDestino(listaPlanes[1].id);
    else if (!planDestino && listaPlanes[0]) setPlanDestino(listaPlanes[0].id);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = async () => {
    try {
      await crearCiclo(db, anioNuevo);
      toast(`Ciclo ${anioNuevo} abierto`);
      await cargar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo abrir el ciclo.', 'error');
    }
  };

  const cerrar = async (anio: number) => {
    if (!window.confirm(`Se cierran todos los RAC abiertos de ${anio}. Lo no aprobado queda ADEUDA.`)) return;
    try {
      const cantidad = await cerrarCiclo(db, anio);
      toast(`Ciclo ${anio} cerrado. RAC cerrados: ${cantidad}.`);
      await cargar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo cerrar el ciclo.', 'error');
    }
  };

  const generar = async () => {
    if (!user) return;
    try {
      const resultado = await generarRacSiguiente(db, {
        uid: user.uid,
        anioOrigen: origen,
        anioDestino: destino,
        planOrigenId: planOrigen,
        planDestinoId: planDestino,
      });
      toast(`RAC nuevos: ${resultado.creados}. Ya existían: ${resultado.omitidos}.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudieron generar los RAC.', 'error');
    }
  };

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header"><span style={{ fontWeight: 600 }}>Ciclos lectivos</span></div>
      <div className="form-row">
        <input className="input-field" type="number" value={anioNuevo} onChange={(e) => setAnioNuevo(Number(e.target.value))} />
        <button type="button" className="btn-submit" onClick={() => void abrir()}>Abrir ciclo</button>
      </div>
      <ul>
        {ciclos.map((ciclo) => (
          <li key={ciclo.anio} className="user-row">
            <span>{ciclo.anio} · {ciclo.estado}{ciclo.fechaCierre ? ` · cierre ${ciclo.fechaCierre.slice(0, 10)}` : ''}</span>
            {ciclo.estado === 'abierto' && <button type="button" className="btn-secondary" onClick={() => void cerrar(ciclo.anio)}>Cerrar ciclo</button>}
          </li>
        ))}
        {ciclos.length === 0 && <li>No hay ciclos. Abre el año en curso antes de cargar estudiantes.</li>}
      </ul>
      <h3>Generar RAC del ciclo siguiente</h3>
      <p className="ayuda">Crea un RAC por estudiante del plan de origen y arrastra lo adeudado como previa. El ciclo de destino tiene que estar abierto.</p>
      <div className="form-row">
        <label className="form-label">Año origen<input className="input-field" type="number" value={origen} onChange={(e) => setOrigen(Number(e.target.value))} /></label>
        <label className="form-label">Plan origen
          <select className="input-field" value={planOrigen} onChange={(e) => setPlanOrigen(e.target.value)}>
            {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}
          </select>
        </label>
        <label className="form-label">Año destino<input className="input-field" type="number" value={destino} onChange={(e) => setDestino(Number(e.target.value))} /></label>
        <label className="form-label">Plan destino
          <select className="input-field" value={planDestino} onChange={(e) => setPlanDestino(e.target.value)}>
            {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}
          </select>
        </label>
        <button type="button" className="btn-submit" onClick={() => void generar()}>Generar</button>
      </div>
    </div>
  );
};
