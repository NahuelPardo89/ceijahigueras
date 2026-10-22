import { useEffect, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { esAdmin } from '../../domain/roles';
import { NOTAS_VALIDAS } from '../../domain/notas';
import type { Ciclo, Condicion, EspacioPlantilla, EstadoEstudiante, EstudiantePrivado, Plan, ResumenItem } from '../../domain/types';
import {
  DniDuplicadoError,
  crearEstudianteConRac,
  espaciosDePlan,
  leerPrivado,
  leerResumen,
  listarCiclos,
  listarPlanes,
} from '../../services/escolar';
import { useToast } from '../../context/ToastContext';

const PRIVADO_INICIAL: EstudiantePrivado = {
  dni: '',
  dniNormalizado: '',
  cuil: '',
  email: '',
  telefono: '',
  fechaNacimiento: '',
  paseProvisorio: false,
  paseDefinitivo: false,
  fotocopiaDni: false,
  cus: false,
  certificadoPrimaria: 'no corresponde',
  numeroEquivalencia: '',
  linkTitulo: '',
  documentacionCompleta: 'incompleta',
  observaciones: '',
};

export const EstudiantesPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const admin = esAdmin(user?.role);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [items, setItems] = useState<ResumenItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [espacios, setEspacios] = useState<EspacioPlantilla[]>([]);
  const [equiv, setEquiv] = useState<Record<string, { nota: string; fecha: string }>>({});
  const [privadoAbierto, setPrivadoAbierto] = useState<string | null>(null);
  const [privadoTexto, setPrivadoTexto] = useState('');
  const [apellido, setApellido] = useState('');
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [planId, setPlanId] = useState('');
  const [estado, setEstado] = useState<EstadoEstudiante>('activo');
  const [cohorte, setCohorte] = useState(new Date().getFullYear());
  const [condicion, setCondicion] = useState<Condicion>('Reg');
  const [link, setLink] = useState('');
  const [privado, setPrivado] = useState<EstudiantePrivado>(PRIVADO_INICIAL);

  const cargar = async (ciclo: number) => {
    setCargando(true);
    try {
      const [listaCiclos, listaPlanes, resumen] = await Promise.all([
        listarCiclos(db),
        listarPlanes(db),
        leerResumen(db, ciclo),
      ]);
      setCiclos(listaCiclos);
      setPlanes(listaPlanes.filter((plan) => plan.activo !== false));
      setItems(resumen);
      if (!planId && listaPlanes[0]) setPlanId(listaPlanes[0].id);
    } catch (err) {
      console.error(err);
      toast('No se pudo cargar el directorio.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar(anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio]);

  useEffect(() => {
    if (!planId) return;
    void espaciosDePlan(db, planId).then(setEspacios).catch((err) => console.error(err));
  }, [planId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.apellido} ${item.nombre} ${item.planActualId}`.toLowerCase().includes(q));
  }, [items, busqueda]);

  const guardar = async () => {
    if (!user) return;
    try {
      const equivalencias = Object.entries(equiv)
        .filter(([, valor]) => valor.nota)
        .map(([espacioId, valor]) => ({ espacioId, nota: Number(valor.nota), fecha: valor.fecha || `${anio}-03-01` }));
      const resultado = await crearEstudianteConRac(db, {
        apellido,
        nombre,
        dni,
        tipoDoc: 'DNI',
        estado,
        sede: 'Las Higueras',
        cohorte,
        condicionIngreso: condicion,
        linkLegajoDrive: link,
        planId,
        anio,
        privado: { ...privado, dni },
        equivalencias,
        creadoPor: user.uid,
      });
      toast(`Estudiante y RAC creados (${resultado.racId})`);
      setMostrarForm(false);
      setApellido('');
      setNombre('');
      setDni('');
      setEquiv({});
      setPrivado(PRIVADO_INICIAL);
      await cargar(anio);
    } catch (err) {
      if (err instanceof DniDuplicadoError) {
        toast(`${err.message} Estudiante: ${err.estudianteId}`, 'error');
        return;
      }
      toast(err instanceof Error ? err.message : 'No se pudo crear el estudiante.', 'error');
    }
  };

  const verPrivado = async (id: string) => {
    if (privadoAbierto === id) {
      setPrivadoAbierto(null);
      return;
    }
    try {
      const datos = await leerPrivado(db, id);
      setPrivadoTexto(datos ? `${datos.dni} · ${datos.email || 'sin correo'} · ${datos.telefono || 'sin teléfono'} · nac. ${datos.fechaNacimiento || '—'}` : 'Sin legajo privado.');
      setPrivadoAbierto(id);
    } catch (err) {
      console.error(err);
      toast('No se pudo leer el legajo privado.', 'error');
    }
  };

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header">
        <span style={{ fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}><GraduationCap size={18} /> Estudiantes</span>
        {admin && <button type="button" className="btn-submit" onClick={() => setMostrarForm((v) => !v)}>Nuevo con RAC</button>}
      </div>
      <div className="form-row">
        <label className="form-label">Ciclo
          <select className="input-field" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {(ciclos.length ? ciclos : [{ anio, estado: 'abierto', fechaCierre: null }]).map((ciclo) => (
              <option key={ciclo.anio} value={ciclo.anio}>{ciclo.anio} ({ciclo.estado})</option>
            ))}
          </select>
        </label>
        <input className="input-field" placeholder="Buscar por apellido o nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>
      {mostrarForm && admin && (
        <div className="bloque-asignacion">
          <p className="ayuda">Se crea el estudiante, el índice de DNI, el legajo privado y el RAC del ciclo en una sola operación.</p>
          <div className="form-row">
            <input className="input-field" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} />
            <input className="input-field" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className="input-field" placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
            <select className="input-field" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}
            </select>
            <select className="input-field" value={estado} onChange={(e) => setEstado(e.target.value as EstadoEstudiante)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="egresado">Egresado</option>
            </select>
            <select className="input-field" value={condicion} onChange={(e) => setCondicion(e.target.value as Condicion)}>
              <option value="Reg">Regular</option>
              <option value="Equiv">Equivalencia</option>
              <option value="Lib">Libre</option>
              <option value="Prev">Previa</option>
            </select>
            <input className="input-field" type="number" value={cohorte} onChange={(e) => setCohorte(Number(e.target.value))} />
            <input className="input-field" placeholder="Link del legajo en Drive" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <div className="form-row">
            <input className="input-field" type="email" placeholder="Correo" value={privado.email} onChange={(e) => setPrivado({ ...privado, email: e.target.value })} />
            <input className="input-field" placeholder="Teléfono" value={privado.telefono} onChange={(e) => setPrivado({ ...privado, telefono: e.target.value })} />
            <input className="input-field" type="date" value={privado.fechaNacimiento} onChange={(e) => setPrivado({ ...privado, fechaNacimiento: e.target.value })} />
            <input className="input-field" placeholder="CUIL" value={privado.cuil} onChange={(e) => setPrivado({ ...privado, cuil: e.target.value })} />
          </div>
          <div className="form-row">
            <label className="check-linea"><input type="checkbox" checked={privado.fotocopiaDni} onChange={(e) => setPrivado({ ...privado, fotocopiaDni: e.target.checked })} /> Fotocopia DNI</label>
            <label className="check-linea"><input type="checkbox" checked={privado.cus} onChange={(e) => setPrivado({ ...privado, cus: e.target.checked })} /> CUS</label>
            <label className="check-linea"><input type="checkbox" checked={privado.paseProvisorio} onChange={(e) => setPrivado({ ...privado, paseProvisorio: e.target.checked })} /> Pase provisorio</label>
            <label className="check-linea"><input type="checkbox" checked={privado.paseDefinitivo} onChange={(e) => setPrivado({ ...privado, paseDefinitivo: e.target.checked })} /> Pase definitivo</label>
          </div>
          <label className="form-label">Observaciones
            <input className="input-field" value={privado.observaciones} onChange={(e) => setPrivado({ ...privado, observaciones: e.target.value })} />
          </label>
          <p className="ayuda">Equivalencias ya resueltas: esas filas del RAC nacen como Equiv.</p>
          {espacios.map((espacio) => (
            <div key={espacio.id} className="form-row">
              <span style={{ minWidth: 220 }}>{espacio.nombre}</span>
              <select className="input-field" value={equiv[espacio.id]?.nota ?? ''} onChange={(e) => setEquiv((prev) => ({ ...prev, [espacio.id]: { nota: e.target.value, fecha: prev[espacio.id]?.fecha ?? '' } }))}>
                <option value="">Sin equivalencia</option>
                {NOTAS_VALIDAS.filter((nota) => nota >= 6).map((nota) => <option key={nota} value={nota}>{nota}</option>)}
              </select>
              <input className="input-field" type="month" value={equiv[espacio.id]?.fecha ?? ''} onChange={(e) => setEquiv((prev) => ({ ...prev, [espacio.id]: { nota: prev[espacio.id]?.nota ?? '', fecha: e.target.value } }))} />
            </div>
          ))}
          <button type="button" className="btn-submit" onClick={() => void guardar()} disabled={!apellido || !nombre || !dni || !planId}>Crear estudiante y RAC</button>
        </div>
      )}
      {cargando ? <div className="user-mgmt-loading"><div className="spinner" /> Cargando...</div> : (
        <div className="tabla-wrap">
          <table className="tabla-rac">
            <thead>
              <tr><th>Apellido</th><th>Nombre</th><th>DNI</th><th>Plan</th><th>Estado</th><th>Orientación</th>{admin && <th></th>}</tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.apellido}</td>
                  <td>{item.nombre}</td>
                  <td>{item.dniEnmascarado}</td>
                  <td>{item.planActualId}</td>
                  <td>{item.estado}</td>
                  <td>{item.orientacion}</td>
                  {admin && (
                    <td>
                      <button type="button" className="btn-secondary" onClick={() => void verPrivado(item.id)}>Legajo</button>
                      {privadoAbierto === item.id && <div className="ayuda">{privadoTexto}</div>}
                    </td>
                  )}
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={7}>No hay estudiantes en este ciclo. Si todavía no cargaste los planes, hazlo en Planes y espacios.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
