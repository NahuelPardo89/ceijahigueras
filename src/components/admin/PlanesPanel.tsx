import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { VERSION_PLANES_SEDE } from '../../domain/planesSede';
import type { EspacioPlantilla, Plan } from '../../domain/types';
import { cargarPlanesSede, espaciosDePlan, guardarEspacio, listarPlanes } from '../../services/escolar';
import { useToast } from '../../context/ToastContext';

const ESPACIO_VACIO = {
  nombre: '',
  modulo: 'M1',
  area: '',
  orden: 1,
  compartidoM8: false,
  tipo: 'EC' as const,
};

export const PlanesPanel = () => {
  const { toast } = useToast();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [espacios, setEspacios] = useState<Record<string, EspacioPlantilla[]>>({});
  const [planId, setPlanId] = useState('');
  const [form, setForm] = useState<{ nombre: string; modulo: string; area: string; orden: number; compartidoM8: boolean; tipo: 'EC' | 'ATP' }>(ESPACIO_VACIO);

  const cargar = async () => {
    const lista = await listarPlanes(db);
    setPlanes(lista);
    if (!planId && lista[0]) setPlanId(lista[0].id);
    const mapa: Record<string, EspacioPlantilla[]> = {};
    for (const plan of lista) mapa[plan.id] = await espaciosDePlan(db, plan.id);
    setEspacios(mapa);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sembrar = async () => {
    try {
      const creados = await cargarPlanesSede(db);
      toast(creados ? `Se cargaron ${creados} planes (versión ${VERSION_PLANES_SEDE}).` : 'Los planes de la sede ya estaban cargados.');
      await cargar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudieron cargar los planes.', 'error');
    }
  };

  const agregar = async () => {
    if (!planId || !form.nombre.trim()) return;
    const id = form.nombre.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      await guardarEspacio(db, planId, { ...form, id, nombre: form.nombre.trim() });
      toast('Espacio guardado');
      setForm(ESPACIO_VACIO);
      await cargar();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar el espacio.', 'error');
    }
  };

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header">
        <span style={{ fontWeight: 600 }}>Planes y espacios</span>
        <button type="button" className="btn-submit" onClick={() => void sembrar()}>Cargar planes de la sede (v{VERSION_PLANES_SEDE})</button>
      </div>
      <p className="ayuda">
        La semilla trae Plan A (ciclo básico, res. 698/17) y Planes B y C de Economía y Administración (res. 1206/17).
        Arte y Cultura y Deportes no se inventan: se agregan acá cuando haya norma. El M8 «Formación para el Trabajo» es compartido.
      </p>
      {planes.map((plan) => (
        <section key={plan.id} style={{ marginBottom: 16 }}>
          <h3>{plan.nombre}</h3>
          <p className="ayuda">{plan.codigo} · {plan.anioPlan}° · {plan.ciclo} · curricular {plan.resolucionCurricular} · distancia {plan.resolucionDistancia} · {plan.orientacion}</p>
          <ul>
            {(espacios[plan.id] ?? []).map((espacio) => (
              <li key={espacio.id}>{espacio.orden}. {espacio.modulo} {espacio.nombre} ({espacio.tipo}{espacio.compartidoM8 ? ', M8 compartido' : ''})</li>
            ))}
          </ul>
        </section>
      ))}
      {planes.length > 0 && (
        <div className="bloque-asignacion">
          <h3>Agregar espacio</h3>
          <div className="form-row">
            <select className="input-field" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}</option>)}
            </select>
            <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <input className="input-field" placeholder="Módulo" value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} />
            <input className="input-field" placeholder="Área" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <input className="input-field" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
            <select className="input-field" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'EC' | 'ATP' })}>
              <option value="EC">EC</option>
              <option value="ATP">ATP</option>
            </select>
            <label className="check-linea"><input type="checkbox" checked={form.compartidoM8} onChange={(e) => setForm({ ...form, compartidoM8: e.target.checked })} /> M8 compartido</label>
            <button type="button" className="btn-secondary" onClick={() => void agregar()}>Guardar espacio</button>
          </div>
        </div>
      )}
    </div>
  );
};
