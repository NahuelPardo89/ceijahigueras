import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { db } from '../../firebase/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorTema, type Tema } from '@/components/tema/SelectorTema';
import { cn } from '@/lib/utils';
import {
  AREAS_SUGERIDAS,
  areasDelArbol,
  prepararMateria,
  resolverArea,
  type ArbolPlan,
  type AreaCatalogo,
  type DatosMateria,
  type DatosModulo,
  type DatosNivel,
  type MateriaEstudio,
  type ModuloEstudio,
  type NivelEstudio,
} from '../../domain/planesEstudio';
import {
  actualizarMateria,
  actualizarModulo,
  actualizarNivel,
  actualizarPlanEstudio,
  crearMateria,
  crearModulo,
  crearNivel,
  crearPlanEstudio,
  eliminarMateria,
  eliminarModulo,
  eliminarNivel,
  eliminarPlanEstudio,
  leerArbolPlan,
  listarPlanesEstudio,
  PlanEstudioError,
  type PlanEstudioListado,
} from '../../services/planesEstudio';

const CLAVE_TEMA = 'ceija-tema';

type Vista = 'lista' | 'alta' | 'editor';

function mensajeError(err: unknown): string {
  if (err instanceof PlanEstudioError) return err.message;
  if (err && typeof err === 'object' && 'code' in err && String((err as { code: unknown }).code).includes('permission-denied')) {
    return 'No tenés permiso para modificar los planes de estudio.';
  }
  return 'No se pudo completar la operación. Probá de nuevo.';
}

function useTema(): [Tema, (tema: Tema) => void] {
  const [tema, setTema] = useState<Tema>(() => (
    window.localStorage.getItem(CLAVE_TEMA) === 'dark' ? 'dark' : 'light'
  ));
  useEffect(() => {
    window.localStorage.setItem(CLAVE_TEMA, tema);
    document.documentElement.classList.toggle('dark', tema === 'dark');
    return () => { document.documentElement.classList.remove('dark'); };
  }, [tema]);
  return [tema, setTema];
}

export const PlanesPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tema, setTema] = useTema();
  const [vista, setVista] = useState<Vista>('lista');
  const [planes, setPlanes] = useState<PlanEstudioListado[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selector = <SelectorTema tema={tema} onChange={setTema} />;

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setPlanes(await listarPlanesEstudio(db));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, []);

  const abrir = (id: string) => {
    setPlanId(id);
    setVista('editor');
  };

  return (
    <div className={cn(
      'ceija-theme min-h-[70vh] rounded-3xl border border-border bg-background px-6 py-10 text-foreground sm:px-10 sm:py-14',
      tema === 'dark' && 'dark',
    )}>
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        {vista === 'lista' && (
          <Lista
            planes={planes}
            cargando={cargando}
            error={error}
            selector={selector}
            onAgregar={() => { setError(null); setVista('alta'); }}
            onEditar={abrir}
          />
        )}
        {vista === 'alta' && user && (
          <AltaPlan
            uid={user.uid}
            selector={selector}
            onCancelar={() => setVista('lista')}
            onCreado={async (id) => {
              toast('Plan guardado. Ahora podés cargar los niveles.');
              await cargar();
              abrir(id);
            }}
          />
        )}
        {vista === 'editor' && planId && (
          <EditorPlan
            planId={planId}
            selector={selector}
            onVolver={() => { setVista('lista'); void cargar(); }}
            onEliminado={() => {
              toast('Plan eliminado.');
              setPlanId(null);
              setVista('lista');
              void cargar();
            }}
          />
        )}
      </div>
    </div>
  );
};

function Encabezado({ titulo, bajada, selector, accion }: {
  titulo: string;
  bajada?: string;
  selector: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-xl space-y-3">
        <h1 className="text-3xl font-medium tracking-tight">{titulo}</h1>
        {bajada && <p className="text-sm leading-relaxed text-muted-foreground">{bajada}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {accion}
        {selector}
      </div>
    </div>
  );
}

function Lista({
  planes,
  cargando,
  error,
  selector,
  onAgregar,
  onEditar,
}: {
  planes: PlanEstudioListado[];
  cargando: boolean;
  error: string | null;
  selector: ReactNode;
  onAgregar: () => void;
  onEditar: (id: string) => void;
}) {
  return (
    <>
      <Encabezado
        titulo="Planes de Estudio"
        bajada="La currícula la carga secretaría. No hay un plan de ejemplo."
        selector={selector}
        accion={planes.length > 0 ? <Button type="button" onClick={onAgregar}>Agregar plan</Button> : undefined}
      />
      <p className="sr-only" role="status">
        {cargando ? 'Cargando planes…' : error ? '' : `${planes.length} ${planes.length === 1 ? 'plan' : 'planes'}`}
      </p>
      {cargando && <p className="text-sm text-muted-foreground">Cargando planes…</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {!cargando && planes.length === 0 && !error && (
        <div className="rounded-3xl border border-dashed border-border px-6 py-16 sm:px-10">
          <h2 className="text-xl font-medium tracking-tight">Todavía no hay planes de estudio.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            El único alta es Agregar plan. No se carga una currícula de ejemplo.
          </p>
          <Button type="button" className="mt-8" onClick={onAgregar}>Agregar plan</Button>
        </div>
      )}
      {planes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {planes.map((plan) => (
            <li key={plan.id}>
              <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-medium tracking-tight">{plan.orientacion}</h2>
                  <p className="text-sm text-muted-foreground">Resolución {plan.resolucion}</p>
                  <p className="text-sm text-muted-foreground">Validez nacional {plan.validezNacional}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.cantidadNiveles === 0 ? 'Sin niveles' : `${plan.cantidadNiveles} ${plan.cantidadNiveles === 1 ? 'nivel' : 'niveles'}`}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant={plan.activo ? 'secondary' : 'outline'}>
                      {plan.activo ? 'Se ofrece en altas nuevas' : 'No se ofrece en altas nuevas'}
                    </Badge>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => onEditar(plan.id)}>Editar</Button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AltaPlan({ uid, selector, onCancelar, onCreado }: {
  uid: string;
  selector: ReactNode;
  onCancelar: () => void;
  onCreado: (id: string) => Promise<void>;
}) {
  const idResolucion = useId();
  const idOrientacion = useId();
  const idValidez = useId();
  const [resolucion, setResolucion] = useState('');
  const [orientacion, setOrientacion] = useState('');
  const [validez, setValidez] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      const id = await crearPlanEstudio(db, uid, { resolucion, orientacion, validezNacional: validez });
      await onCreado(id);
    } catch (err) {
      setError(mensajeError(err));
      setOcupado(false);
    }
  };

  return (
    <form onSubmit={(event) => void enviar(event)} noValidate className="space-y-8">
      <Encabezado
        titulo="Nuevo plan de estudio"
        bajada="Con estos tres datos alcanza. Los niveles, los módulos y las materias se cargan después, y el plan queda sin niveles."
        selector={selector}
      />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-5">
        <Campo id={idResolucion} etiqueta="Resolución">
          <Input id={idResolucion} value={resolucion} onChange={(event) => setResolucion(event.target.value)} autoComplete="off" required aria-required="true" />
        </Campo>
        <Campo id={idOrientacion} etiqueta="Orientación">
          <Input id={idOrientacion} value={orientacion} onChange={(event) => setOrientacion(event.target.value)} autoComplete="off" required aria-required="true" />
        </Campo>
        <Campo id={idValidez} etiqueta="Validez nacional">
          <Input id={idValidez} value={validez} onChange={(event) => setValidez(event.target.value)} autoComplete="off" required aria-required="true" />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar plan'}</Button>
        <Button type="button" variant="outline" onClick={onCancelar} disabled={ocupado}>Cancelar</Button>
      </div>
    </form>
  );
}

function EditorPlan({
  planId,
  selector,
  onVolver,
  onEliminado,
}: {
  planId: string;
  selector: ReactNode;
  onVolver: () => void;
  onEliminado: () => void;
}) {
  const [arbol, setArbol] = useState<ArbolPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [mostrarNivel, setMostrarNivel] = useState(false);

  const recargar = async () => {
    setArbol(await leerArbolPlan(db, planId));
  };

  useEffect(() => {
    let vigente = true;
    void leerArbolPlan(db, planId)
      .then((datos) => { if (vigente) setArbol(datos); })
      .catch((err: unknown) => { if (vigente) setError(mensajeError(err)); });
    return () => { vigente = false; };
  }, [planId]);

  const correr = async (accion: () => Promise<void>) => {
    setError(null);
    try {
      await accion();
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
      throw err;
    }
  };

  if (!arbol && !error) return <p className="text-sm text-muted-foreground" role="status">Cargando el plan…</p>;
  if (!arbol) return <p className="text-sm text-destructive" role="alert">{error}</p>;

  const opciones = areasDelArbol(arbol.niveles);

  return (
    <div className="space-y-12">
      <Encabezado
        titulo={arbol.plan.orientacion}
        bajada={`Resolución ${arbol.plan.resolucion} · Validez nacional ${arbol.plan.validezNacional}`}
        selector={selector}
        accion={<Button type="button" variant="outline" onClick={onVolver}>Volver al listado</Button>}
      />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <section className="space-y-4" aria-labelledby="datos-plan">
        <h2 id="datos-plan" className="text-lg font-medium tracking-tight">Datos del plan</h2>
        <FormPlan
          orientacion={arbol.plan.orientacion}
          resolucion={arbol.plan.resolucion}
          validez={arbol.plan.validezNacional}
          activo={arbol.plan.activo}
          onGuardar={async (datos) => {
            await correr(() => actualizarPlanEstudio(db, planId, datos));
          }}
        />
      </section>

      <section className="space-y-4" aria-labelledby="niveles-plan">
        <div className="space-y-2">
          <h2 id="niveles-plan" className="text-lg font-medium tracking-tight">Niveles</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            En esta modalidad, A es 1° año, B es 2° y C es 3°. Cargalos vos: la app no los inserta sola.
          </p>
        </div>
        {arbol.niveles.length === 0 && (
          <p className="text-sm text-muted-foreground">Este plan todavía no tiene niveles.</p>
        )}
        <div className="flex flex-col gap-4">
          {arbol.niveles.map((nivel) => (
            <NivelCard key={nivel.id} planId={planId} nivel={nivel} opciones={opciones} correr={correr} />
          ))}
        </div>
        {mostrarNivel ? (
          <FormNivel
            ordenInicial={arbol.niveles.length + 1}
            onCancelar={() => setMostrarNivel(false)}
            onGuardar={async (datos) => {
              await correr(() => crearNivel(db, planId, datos).then(() => undefined));
              setMostrarNivel(false);
            }}
          />
        ) : (
          <Button type="button" onClick={() => setMostrarNivel(true)}>Agregar nivel</Button>
        )}
      </section>

      {arbol.niveles.length === 0 && !arbol.plan.enUso && (
        <>
          <Button type="button" variant="outline" onClick={() => setConfirmar(true)}>Eliminar plan</Button>
          <Confirmacion
            abierto={confirmar}
            titulo="¿Eliminar este plan?"
            texto="Todavía no tiene niveles. No se puede deshacer."
            onCancelar={() => setConfirmar(false)}
            onConfirmar={async () => {
              await eliminarPlanEstudio(db, planId);
              onEliminado();
            }}
          />
        </>
      )}
    </div>
  );
}

function NivelCard({
  planId,
  nivel,
  opciones,
  correr,
}: {
  planId: string;
  nivel: ArbolPlan['niveles'][number];
  opciones: AreaCatalogo[];
  correr: (accion: () => Promise<void>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [mostrarModulo, setMostrarModulo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const hijos = [...nivel.modulos, ...nivel.modulos.flatMap((modulo) => modulo.materias)];
  const bloqueado = nivel.enUso || hijos.some((item) => item.enUso);

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-medium">{nivel.codigo} · {nivel.nombre}</h3>
          <p className="text-sm text-muted-foreground">{nivel.anioCurso}° año de cursada · orden {nivel.orden}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditando((valor) => !valor)}>{editando ? 'Cerrar' : 'Editar'}</Button>
          {!bloqueado && <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmar(true)}>Eliminar</Button>}
        </div>
      </header>
      {bloqueado && <p className="text-sm text-muted-foreground">Hay materias con notas. Este nivel no se puede borrar.</p>}
      {editando && (
        <FormNivel
          inicial={nivel}
          onCancelar={() => setEditando(false)}
          onGuardar={async (datos) => {
            await correr(() => actualizarNivel(db, planId, nivel.id, datos));
            setEditando(false);
          }}
        />
      )}
      <Confirmacion
        abierto={confirmar}
        titulo={`¿Eliminar el nivel ${nivel.codigo}?`}
        texto="Se borran también sus módulos y materias. No se puede deshacer."
        onCancelar={() => setConfirmar(false)}
        onConfirmar={async () => {
          await correr(() => eliminarNivel(db, planId, nivel.id));
          setConfirmar(false);
        }}
      />
      {nivel.modulos.map((modulo) => (
        <ModuloCard key={modulo.id} planId={planId} nivelId={nivel.id} modulo={modulo} opciones={opciones} correr={correr} />
      ))}
      {mostrarModulo ? (
        <FormModulo
          ordenInicial={nivel.modulos.length + 1}
          onCancelar={() => setMostrarModulo(false)}
          onGuardar={async (datos) => {
            await correr(() => crearModulo(db, planId, nivel.id, datos).then(() => undefined));
            setMostrarModulo(false);
          }}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setMostrarModulo(true)}>Agregar módulo</Button>
      )}
    </article>
  );
}

function ModuloCard({
  planId,
  nivelId,
  modulo,
  opciones,
  correr,
}: {
  planId: string;
  nivelId: string;
  modulo: ArbolPlan['niveles'][number]['modulos'][number];
  opciones: AreaCatalogo[];
  correr: (accion: () => Promise<void>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [mostrarMateria, setMostrarMateria] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const bloqueado = modulo.enUso || modulo.materias.some((materia) => materia.enUso);

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-background p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium">{modulo.nombre}</h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditando((valor) => !valor)}>{editando ? 'Cerrar' : 'Editar'}</Button>
          {!bloqueado && <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmar(true)}>Eliminar</Button>}
        </div>
      </header>
      {editando && (
        <FormModulo
          inicial={modulo}
          onCancelar={() => setEditando(false)}
          onGuardar={async (datos) => {
            await correr(() => actualizarModulo(db, planId, nivelId, modulo.id, datos));
            setEditando(false);
          }}
        />
      )}
      <Confirmacion
        abierto={confirmar}
        titulo={`¿Eliminar ${modulo.nombre}?`}
        texto="Se borran también sus materias. No se puede deshacer."
        onCancelar={() => setConfirmar(false)}
        onConfirmar={async () => {
          await correr(() => eliminarModulo(db, planId, nivelId, modulo.id));
          setConfirmar(false);
        }}
      />
      {modulo.materias.length === 0 && <p className="text-sm text-muted-foreground">Este módulo todavía no tiene materias.</p>}
      <ul className="flex flex-col gap-2">
        {modulo.materias.map((materia) => (
          <MateriaCard
            key={materia.id}
            planId={planId}
            nivelId={nivelId}
            moduloId={modulo.id}
            materia={materia}
            opciones={opciones}
            correr={correr}
          />
        ))}
      </ul>
      {mostrarMateria ? (
        <FormMateria
          opciones={opciones}
          ordenInicial={modulo.materias.length + 1}
          onCancelar={() => setMostrarMateria(false)}
          onGuardar={async (datos) => {
            await correr(() => crearMateria(db, planId, nivelId, modulo.id, datos).then(() => undefined));
            setMostrarMateria(false);
          }}
        />
      ) : (
        <Button type="button" size="sm" onClick={() => setMostrarMateria(true)}>Agregar materia</Button>
      )}
    </article>
  );
}

function MateriaCard({
  planId,
  nivelId,
  moduloId,
  materia,
  opciones,
  correr,
}: {
  planId: string;
  nivelId: string;
  moduloId: string;
  materia: MateriaEstudio;
  opciones: AreaCatalogo[];
  correr: (accion: () => Promise<void>) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <li className="rounded-xl border border-border px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {materia.codigo ? <span className="mr-2 tabular-nums text-muted-foreground">{materia.codigo}</span> : null}
            {materia.nombre}
          </p>
          <p className="text-sm text-muted-foreground">Área {materia.areaNombre} · orden {materia.orden}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {materia.comparteEntreNiveles && <Badge>Se comparte entre niveles</Badge>}
            <Badge variant={materia.activo ? 'secondary' : 'outline'}>
              {materia.activo ? 'Entra en RAC nuevos' : 'No entra en RAC nuevos'}
            </Badge>
            {materia.enUso && <Badge>En uso</Badge>}
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditando((valor) => !valor)}>{editando ? 'Cerrar' : 'Editar'}</Button>
      </div>
      {editando && (
        <FormMateria
          opciones={opciones}
          inicial={materia}
          onCancelar={() => setEditando(false)}
          onGuardar={async (datos) => {
            await correr(() => actualizarMateria(db, planId, nivelId, moduloId, materia.id, datos));
            setEditando(false);
          }}
          onEliminar={materia.enUso ? undefined : async () => {
            await correr(() => eliminarMateria(db, planId, nivelId, moduloId, materia.id));
            setEditando(false);
          }}
        />
      )}
      {materia.enUso && editando && (
        <p className="mt-3 text-sm text-muted-foreground">
          Ya tiene notas. No se puede borrar. Si no tiene que entrar en los RAC nuevos, destildá «Entra en los RAC nuevos».
        </p>
      )}
    </li>
  );
}

function Confirmacion({
  abierto,
  titulo,
  texto,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  texto: string;
  onConfirmar: () => Promise<void>;
  onCancelar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={abierto} onOpenChange={(abiertoAhora) => { if (!abiertoAhora && !ocupado) onCancelar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancelar} disabled={ocupado}>Cancelar</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={ocupado}
            onClick={() => {
              setOcupado(true);
              setError(null);
              void onConfirmar().catch((err: unknown) => {
                setError(mensajeError(err));
                setOcupado(false);
              });
            }}
          >
            {ocupado ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ id, etiqueta, children, className }: { id: string; etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
    </div>
  );
}

function Casilla({ id, checked, onChange, children }: {
  id: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(valor) => onChange(valor === true)} className="mt-0.5" />
      <Label htmlFor={id} className="font-normal leading-snug text-muted-foreground">{children}</Label>
    </div>
  );
}

function FormPlan({
  orientacion,
  resolucion,
  validez,
  activo,
  onGuardar,
}: {
  orientacion: string;
  resolucion: string;
  validez: string;
  activo: boolean;
  onGuardar: (datos: { orientacion: string; resolucion: string; validezNacional: string; activo: boolean }) => Promise<void>;
}) {
  const base = useId();
  const [valores, setValores] = useState({ orientacion, resolucion, validez, activo });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValores({ orientacion, resolucion, validez, activo });
  }, [orientacion, resolucion, validez, activo]);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      await onGuardar({
        orientacion: valores.orientacion,
        resolucion: valores.resolucion,
        validezNacional: valores.validez,
        activo: valores.activo,
      });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <form className="space-y-5 rounded-2xl border border-border p-5" onSubmit={(event) => void enviar(event)} noValidate>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${base}-res`} etiqueta="Resolución">
          <Input id={`${base}-res`} value={valores.resolucion} onChange={(event) => setValores({ ...valores, resolucion: event.target.value })} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-ori`} etiqueta="Orientación">
          <Input id={`${base}-ori`} value={valores.orientacion} onChange={(event) => setValores({ ...valores, orientacion: event.target.value })} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-val`} etiqueta="Validez nacional" className="sm:col-span-2">
          <Input id={`${base}-val`} value={valores.validez} onChange={(event) => setValores({ ...valores, validez: event.target.value })} autoComplete="off" />
        </Campo>
      </div>
      <Casilla id={`${base}-activo`} checked={valores.activo} onChange={(activoAhora) => setValores({ ...valores, activo: activoAhora })}>
        Se ofrece para altas nuevas. Si lo destildás, los RAC ya abiertos siguen leyéndose.
      </Casilla>
      <Button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</Button>
    </form>
  );
}

function FormNivel({
  inicial,
  ordenInicial = 1,
  onGuardar,
  onCancelar,
}: {
  inicial?: NivelEstudio;
  ordenInicial?: number;
  onGuardar: (datos: DatosNivel) => Promise<void>;
  onCancelar: () => void;
}) {
  const base = useId();
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [anio, setAnio] = useState(String(inicial?.anioCurso ?? ''));
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [orden, setOrden] = useState(String(inicial?.orden ?? ordenInicial));
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const anioCurso = Number(anio);
    const ordenNumero = Number(orden);
    if (!Number.isInteger(anioCurso) || !Number.isInteger(ordenNumero)) {
      setError('El año y el orden tienen que ser números enteros.');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await onGuardar({ codigo, anioCurso, nombre, orden: ordenNumero });
    } catch (err) {
      setError(mensajeError(err));
      setOcupado(false);
    }
  };

  return (
    <form className="space-y-4 rounded-2xl border border-border bg-background p-5" onSubmit={(event) => void enviar(event)} noValidate>
      <h3 className="text-sm font-medium">{inicial ? 'Editar nivel' : 'Nuevo nivel'}</h3>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${base}-codigo`} etiqueta="Código">
          <Input id={`${base}-codigo`} value={codigo} placeholder="A" onChange={(event) => setCodigo(event.target.value)} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-anio`} etiqueta="Año de cursada">
          <Input id={`${base}-anio`} inputMode="numeric" value={anio} placeholder="1" onChange={(event) => setAnio(event.target.value)} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-nombre`} etiqueta="Nombre">
          <Input id={`${base}-nombre`} value={nombre} placeholder="1° año" onChange={(event) => setNombre(event.target.value)} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-orden`} etiqueta="Orden">
          <Input id={`${base}-orden`} inputMode="numeric" value={orden} onChange={(event) => setOrden(event.target.value)} autoComplete="off" />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : inicial ? 'Guardar nivel' : 'Agregar nivel'}</Button>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}

function FormModulo({
  inicial,
  ordenInicial = 1,
  onGuardar,
  onCancelar,
}: {
  inicial?: ModuloEstudio;
  ordenInicial?: number;
  onGuardar: (datos: DatosModulo) => Promise<void>;
  onCancelar: () => void;
}) {
  const base = useId();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [orden, setOrden] = useState(String(inicial?.orden ?? ordenInicial));
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const ordenNumero = Number(orden);
    if (!Number.isInteger(ordenNumero)) {
      setError('El orden tiene que ser un número entero.');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await onGuardar({ nombre, orden: ordenNumero });
    } catch (err) {
      setError(mensajeError(err));
      setOcupado(false);
    }
  };

  return (
    <form className="space-y-4 rounded-2xl border border-border p-5" onSubmit={(event) => void enviar(event)} noValidate>
      <h3 className="text-sm font-medium">{inicial ? 'Editar módulo' : 'Nuevo módulo'}</h3>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${base}-nombre`} etiqueta="Nombre">
          <Input id={`${base}-nombre`} value={nombre} onChange={(event) => setNombre(event.target.value)} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-orden`} etiqueta="Orden">
          <Input id={`${base}-orden`} inputMode="numeric" value={orden} onChange={(event) => setOrden(event.target.value)} autoComplete="off" />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : inicial ? 'Guardar módulo' : 'Agregar módulo'}</Button>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}

function FormMateria({
  opciones,
  inicial,
  ordenInicial = 1,
  onGuardar,
  onCancelar,
  onEliminar,
}: {
  opciones: AreaCatalogo[];
  inicial?: MateriaEstudio;
  ordenInicial?: number;
  onGuardar: (datos: DatosMateria) => Promise<void>;
  onCancelar: () => void;
  onEliminar?: () => Promise<void>;
}) {
  const base = useId();
  const catalogo = opciones.length > 0 ? opciones : [...AREAS_SUGERIDAS];
  const inicialOtra = inicial ? !catalogo.some((area) => area.clave === inicial.area) : false;
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [orden, setOrden] = useState(String(inicial?.orden ?? ordenInicial));
  const [area, setArea] = useState(inicial ? (inicialOtra ? '__otra' : inicial.area) : catalogo[0].clave);
  const [areaLibre, setAreaLibre] = useState(inicialOtra ? inicial?.areaNombre ?? '' : '');
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [comparte, setComparte] = useState(inicial?.comparteEntreNiveles ?? false);
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const ordenNumero = Number(orden);
    if (!Number.isInteger(ordenNumero)) {
      setError('El orden tiene que ser un número entero.');
      return;
    }
    const resuelta = resolverArea(area, areaLibre, catalogo);
    if (!resuelta) {
      setError('Elegí un área, o escribí el nombre de una nueva.');
      return;
    }
    const preparado = prepararMateria({
      nombre,
      orden: ordenNumero,
      area: resuelta.area,
      areaNombre: resuelta.areaNombre,
      codigo,
      comparteEntreNiveles: comparte,
      activo,
    });
    if (!preparado.ok) {
      setError(preparado.error);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await onGuardar(preparado.datos);
    } catch (err) {
      setError(mensajeError(err));
      setOcupado(false);
    }
  };

  return (
    <form className="mt-3 space-y-4 rounded-2xl border border-border bg-background p-5" onSubmit={(event) => void enviar(event)} noValidate>
      <h3 className="text-sm font-medium">{inicial ? 'Editar materia' : 'Nueva materia'}</h3>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${base}-nombre`} etiqueta="Nombre">
          <Input id={`${base}-nombre`} value={nombre} onChange={(event) => setNombre(event.target.value)} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-area`} etiqueta="Área">
          <select
            id={`${base}-area`}
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={area}
            onChange={(event) => setArea(event.target.value)}
          >
            {catalogo.map((item) => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
            <option value="__otra">Otra área…</option>
          </select>
        </Campo>
        {area === '__otra' && (
          <Campo id={`${base}-area-libre`} etiqueta="Nombre de la nueva área" className="sm:col-span-2">
            <Input id={`${base}-area-libre`} value={areaLibre} onChange={(event) => setAreaLibre(event.target.value)} autoComplete="off" />
          </Campo>
        )}
        <Campo id={`${base}-orden`} etiqueta="Orden">
          <Input id={`${base}-orden`} inputMode="numeric" value={orden} onChange={(event) => setOrden(event.target.value)} autoComplete="off" />
        </Campo>
        <Campo id={`${base}-codigo`} etiqueta="Código (opcional)">
          <Input id={`${base}-codigo`} value={codigo} placeholder="1.3" onChange={(event) => setCodigo(event.target.value)} autoComplete="off" aria-describedby={`${base}-codigo-ayuda`} />
        </Campo>
      </div>
      <p id={`${base}-codigo-ayuda`} className="text-sm leading-relaxed text-muted-foreground">
        Si lo cargás, usá el código de la planilla para poder cruzarlo después. Por ejemplo, 1.3. Si no hace falta, dejalo vacío.
      </p>
      <Casilla id={`${base}-comparte`} checked={comparte} onChange={setComparte}>
        Se comparte entre niveles. Arranca destildado: la nota se copia a otro nivel solo si lo marcás y el código coincide.
      </Casilla>
      <Casilla id={`${base}-activo`} checked={activo} onChange={setActivo}>
        Entra en los RAC nuevos.
      </Casilla>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : inicial ? 'Guardar materia' : 'Agregar materia'}</Button>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        {onEliminar && <Button type="button" variant="ghost" onClick={() => setConfirmar(true)}>Eliminar</Button>}
      </div>
      {onEliminar && (
        <Confirmacion
          abierto={confirmar}
          titulo={`¿Eliminar ${nombre || 'esta materia'}?`}
          texto="Todavía no tiene notas. No se puede deshacer."
          onCancelar={() => setConfirmar(false)}
          onConfirmar={onEliminar}
        />
      )}
    </form>
  );
}
