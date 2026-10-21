import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRecord, UserRole } from '../../context/AuthContext';
import { etiquetaRol } from '../../domain/roles';
import { db } from '../../firebase/config';
import { espaciosDePlan, guardarAsignaciones, listarPlanes } from '../../services/escolar';
import type { AsignacionDocente, EspacioPlantilla, Plan } from '../../domain/types';
import { useToast } from '../../context/ToastContext';
import { EMAIL_REGEX } from '../../utils/constants';

const ROLES: UserRole[] = ['pendiente', 'docente', 'lectura', 'admin'];

export const UsuariosPanel = () => {
  const { toast } = useToast();
  const { user, getAllUsers, updateUserRole, disableUser, createUser } = useAuth();
  const [usuarios, setUsuarios] = useState<UserRecord[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [espacios, setEspacios] = useState<Record<string, EspacioPlantilla[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [elegidos, setElegidos] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'docente' as UserRole });

  const recargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista, planesCargados] = await Promise.all([getAllUsers(), listarPlanes(db)]);
      setUsuarios(lista.sort((a, b) => etiquetaRol(a.role).localeCompare(etiquetaRol(b.role))));
      setPlanes(planesCargados.filter((plan) => plan.activo !== false));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // La carga inicial pega a Firestore; el estado llega cuando responde.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asegurarEspacios = async (planId: string) => {
    if (espacios[planId]) return espacios[planId];
    const lista = await espaciosDePlan(db, planId);
    setEspacios((prev) => ({ ...prev, [planId]: lista }));
    return lista;
  };

  const cambiarRol = async (uid: string, role: UserRole) => {
    try {
      await updateUserRole(uid, role);
      setUsuarios((prev) => prev.map((item) => item.uid === uid ? { ...item, role } : item));
      toast('Rol actualizado');
    } catch (err) {
      console.error(err);
      toast('No se pudo cambiar el rol', 'error');
    }
  };

  const guardarDocente = async (cuenta: UserRecord) => {
    const asignaciones: AsignacionDocente[] = [];
    for (const plan of planes) {
      const lista = espacios[plan.id] ?? [];
      for (const espacio of lista) {
        if (!elegidos[`${plan.id}|${espacio.id}`]) continue;
        asignaciones.push({
          planId: plan.id,
          espacioId: espacio.id,
          anio,
          compartidoM8: espacio.compartidoM8,
          nombreEspacio: espacio.nombre,
        });
      }
    }
    try {
      await guardarAsignaciones(db, cuenta.uid, cuenta.displayName || '', cuenta.email || '', asignaciones);
      toast('Asignaciones guardadas');
    } catch (err) {
      console.error(err);
      toast('No se pudieron guardar las asignaciones', 'error');
    }
  };

  const crear = async () => {
    if (!EMAIL_REGEX.test(form.email) || form.password.length < 6 || !form.displayName.trim()) {
      toast('Revisa correo, nombre y contraseña (mínimo 6 caracteres).', 'error');
      return;
    }
    try {
      await createUser(form.email.trim(), form.password, form.displayName.trim(), form.role);
      setForm({ email: '', password: '', displayName: '', role: 'docente' });
      toast('Usuario creado');
      await recargar();
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'admin') return <p>Solo un administrador gestiona usuarios.</p>;

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header">
        <span style={{ fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
          <ShieldCheck size={18} /> Usuarios y roles
        </span>
        <button type="button" className="btn-secondary" onClick={() => void recargar()}>Actualizar</button>
      </div>
      <p className="ayuda">Las cuentas nuevas entran como pendiente. Recién un administrador les asigna docente, lectura o administrador.</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {cargando ? <div className="user-mgmt-loading"><div className="spinner" /> Cargando...</div> : (
        <div className="user-list">
          {usuarios.map((cuenta) => (
            <div key={cuenta.uid} className="user-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="user-info">
                <span className="user-name">{cuenta.displayName || 'Sin nombre'} {cuenta.uid === user.uid && <span className="self-tag">tú</span>}</span>
                <span className="user-email">{cuenta.email}</span>
              </div>
              <select
                className="input-field"
                style={{ maxWidth: 180 }}
                value={cuenta.role}
                disabled={cuenta.uid === user.uid}
                onChange={(e) => void cambiarRol(cuenta.uid, e.target.value as UserRole)}
              >
                {ROLES.map((rol) => <option key={rol} value={rol}>{etiquetaRol(rol)}</option>)}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void disableUser(cuenta.uid, !cuenta.disabled).then(() => recargar())}
                disabled={cuenta.uid === user.uid}
              >
                {cuenta.disabled ? 'Reactivar' : 'Desactivar'}
              </button>
              {cuenta.role === 'docente' && (
                <button type="button" className="btn-secondary" onClick={() => {
                  setAbierto(abierto === cuenta.uid ? null : cuenta.uid);
                  void Promise.all(planes.map((plan) => asegurarEspacios(plan.id)));
                }}>
                  Espacios
                </button>
              )}
              {abierto === cuenta.uid && (
                <div className="bloque-asignacion">
                  <label className="form-label">Año lectivo
                    <input className="input-field" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
                  </label>
                  {planes.map((plan) => (
                    <fieldset key={plan.id}>
                      <legend>{plan.nombre}</legend>
                      {(espacios[plan.id] ?? []).map((espacio) => {
                        const clave = `${plan.id}|${espacio.id}`;
                        return (
                          <label key={clave} className="check-linea">
                            <input
                              type="checkbox"
                              checked={elegidos[clave] ?? false}
                              onChange={(e) => setElegidos((prev) => ({ ...prev, [clave]: e.target.checked }))}
                            />
                            {espacio.modulo} {espacio.nombre}{espacio.compartidoM8 ? ' (M8 compartido)' : ''}
                          </label>
                        );
                      })}
                    </fieldset>
                  ))}
                  <button type="button" className="btn-submit" onClick={() => void guardarDocente(cuenta)}>Guardar asignaciones</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: '20px 0 8px' }}><UserPlus size={16} /> Alta directa</h3>
      <div className="form-row">
        <input className="input-field" placeholder="Nombre" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <input className="input-field" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
          {ROLES.filter((rol) => rol !== 'pendiente').map((rol) => <option key={rol} value={rol}>{etiquetaRol(rol)}</option>)}
        </select>
        <button type="button" className="btn-submit" onClick={() => void crear()}>Crear</button>
      </div>
    </div>
  );
};
