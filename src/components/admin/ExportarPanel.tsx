import { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { esAdmin } from '../../domain/roles';
import type { Plan } from '../../domain/types';
import { calificacionesDe, leerPrivado, leerResumen, listarPlanes, racsDelAnio } from '../../services/escolar';
import { exportarDirectorio, exportarRac, type FilaExportacion } from '../../services/excel';
import { useToast } from '../../context/ToastContext';

export const ExportarPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const admin = esAdmin(user?.role);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void listarPlanes(db).then(setPlanes).catch((err) => console.error(err));
  }, []);

  const armar = async (sensibles: boolean): Promise<FilaExportacion[]> => {
    const [resumen, racs] = await Promise.all([leerResumen(db, anio), racsDelAnio(db, anio)]);
    const nombres = new Map(planes.map((plan) => [plan.id, plan.nombre]));
    const filas: FilaExportacion[] = [];
    for (const item of resumen) {
      const rac = racs.find((candidato) => candidato.estudianteId === item.id);
      const calificaciones = rac ? await calificacionesDe(db, rac.id) : [];
      const privado = sensibles ? await leerPrivado(db, item.id) : null;
      filas.push({
        resumen: item,
        privado,
        calificaciones,
        planNombre: nombres.get(item.planActualId) ?? item.planActualId,
        anio,
      });
    }
    return filas;
  };

  const descargar = async (tipo: 'directorio' | 'rac', sensibles: boolean) => {
    if (sensibles && !window.confirm('Este Excel incluye DNI, contacto y fecha de nacimiento. Guárdalo en el Drive de la sede y no lo reenvíes. ¿Continuar?')) return;
    setOcupado(true);
    try {
      const filas = await armar(sensibles);
      if (filas.length === 0) {
        toast('No hay estudiantes en ese ciclo.', 'info');
        return;
      }
      if (tipo === 'directorio') exportarDirectorio(filas, anio, sensibles);
      else exportarRac(filas, anio);
      toast('Archivo generado');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo exportar.', 'error');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="user-mgmt-panel">
      <div className="user-mgmt-header"><span style={{ fontWeight: 600 }}>Exportar a Excel</span></div>
      <p className="ayuda">
        Respaldo manual para guardar en Drive. Lectura y docentes no reciben columnas sensibles.
        La exportación con DNI completo es solo para administradores.
      </p>
      <div className="form-row">
        <label className="form-label">Ciclo
          <input className="input-field" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
        </label>
        <button type="button" className="btn-secondary" disabled={ocupado} onClick={() => void descargar('directorio', false)}>Directorio sin datos sensibles</button>
        <button type="button" className="btn-secondary" disabled={ocupado} onClick={() => void descargar('rac', false)}>RAC del ciclo</button>
        {admin && <button type="button" className="btn-submit" disabled={ocupado} onClick={() => void descargar('directorio', true)}>Directorio con datos sensibles</button>}
      </div>
    </div>
  );
};
