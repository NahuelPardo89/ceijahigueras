import logoSrc from '../assets/logo-CEIJA-HIGUERAS.png';
import edificioSrc from '../assets/edificio-las-higueras.webp';
import { sedePublica } from '../content/sedePublica';

interface LandingProps {
  onEnter: () => void;
}

export const Landing = ({ onEnter }: LandingProps) => {
  const { identidad, contacto } = sedePublica;

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-wrap home-header-inner">
          <div className="home-brand">
            <img src={logoSrc} alt="" width={48} height={48} />
            <div>
              <p className="home-brand-nombre">{identidad.nombre}</p>
            </div>
          </div>
          <nav className="home-nav" aria-label="Secciones">
            <a href="#sede">La sede</a>
            <a href="#modalidades">Modalidades</a>
            <a href="#planes">Planes</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <button type="button" className="home-btn" onClick={onEnter}>
            {sedePublica.acceso.etiqueta}
          </button>
        </div>
      </header>

      <main>
        <section className="home-hero">
          <div className="home-wrap">
            <p className="home-kicker">Semipresencial y combinada en línea</p>
            <h1>{identidad.nombre}</h1>
            <div className="home-hero-grid">
            <div>
              <p className="home-hero-lead">
                Código de empresa {identidad.codigoEmpresa} · CUE {identidad.cue}
              </p>
              <p className="home-hero-lugar">{identidad.lugar}</p>
              {sedePublica.presentacion.map((parrafo) => (
                <p key={parrafo} className="home-prosa">
                  {parrafo}
                </p>
              ))}
              <p className="home-prosa home-orientacion">{sedePublica.orientacion}</p>
              <button type="button" className="home-btn home-btn-grande" onClick={onEnter}>
                {sedePublica.acceso.etiqueta}
              </button>
            </div>
            <figure className="home-foto">
              <img
                src={edificioSrc}
                alt="Edificio de la Escuela N° 12 Remedios de Escalada de San Martín de Las Higueras, en España 36"
                width={640}
                height={480}
              />
              <figcaption>Sede Las Higueras, España 36</figcaption>
            </figure>
            </div>
          </div>
        </section>

        <section id="sede" className="home-seccion">
          <div className="home-wrap">
            <h2>La sede</h2>
            <dl className="home-datos">
              <div>
                <dt>Institución</dt>
                <dd>{identidad.nombre}</dd>
              </div>
              <div>
                <dt>Sede</dt>
                <dd>{identidad.sede}</dd>
              </div>
              <div>
                <dt>Código de empresa</dt>
                <dd>{identidad.codigoEmpresa}</dd>
              </div>
              <div>
                <dt>CUE</dt>
                <dd>{identidad.cue}</dd>
              </div>
              <div>
                <dt>Orientación</dt>
                <dd>{sedePublica.orientacion}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="modalidades" className="home-seccion home-seccion-papel">
          <div className="home-wrap">
            <h2>Modalidades</h2>
            <div className="home-pilares">
              {sedePublica.modalidades.map((modalidad) => (
                <article key={modalidad.titulo}>
                  <h3>{modalidad.titulo}</h3>
                  <p>{modalidad.texto}</p>
                </article>
              ))}
            </div>
            <p className="home-prosa home-edad">{sedePublica.cierreModalidad}</p>
            <p className="home-fuente">{sedePublica.normas}</p>
          </div>
        </section>

        <section id="planes" className="home-seccion">
          <div className="home-wrap">
            <h2>Planes de estudio</h2>
            <p className="home-prosa">{sedePublica.notaModulos}</p>
            <div className="home-planes">
              {sedePublica.planes.map((plan) => (
                <article key={plan.codigo} className="home-plan">
                  <p className="home-plan-codigo">Plan {plan.codigo}</p>
                  <h3>{plan.anio}</h3>
                  <p className="home-plan-ciclo">{plan.ciclo}</p>
                  <p className="home-plan-meta">{sedePublica.orientacion}</p>
                  <p className="home-plan-meta">{plan.modulos}</p>
                  <ul>
                    {plan.espacios.map((espacio) => (
                      <li key={espacio}>{espacio}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="home-nota">{sedePublica.notaTecnico}</p>
          </div>
        </section>

        <section id="contacto" className="home-seccion home-seccion-papel">
          <div className="home-wrap">
            <h2>{contacto.titulo}</h2>
            <dl className="home-datos home-datos-contacto">
              {contacto.datos.map((dato) => (
                <div key={dato.etiqueta}>
                  <dt>{dato.etiqueta}</dt>
                  <dd>
                    {dato.href ? <a href={dato.href}>{dato.valor}</a> : dato.valor}
                  </dd>
                </div>
              ))}
            </dl>
            <button type="button" className="home-btn home-btn-grande" onClick={onEnter}>
              {sedePublica.acceso.etiqueta}
            </button>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-wrap">
          <p>
            {identidad.nombre}
          </p>
          <p>
            Código de empresa {identidad.codigoEmpresa} · CUE {identidad.cue}
          </p>
          <p>{identidad.lugar}</p>
          <button type="button" className="home-btn home-btn-claro" onClick={onEnter}>
            {sedePublica.acceso.etiqueta}
          </button>
        </div>
      </footer>
    </div>
  );
};
