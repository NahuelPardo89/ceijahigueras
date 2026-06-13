import logoSrc from '../assets/logo-CEIJA-HIGUERAS.png';

interface LandingProps {
  onEnter: () => void;
}

export const Landing = ({ onEnter }: LandingProps) => {
  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        maxWidth: '460px',
        width: '100%',
      }}>
        <img
          src={logoSrc}
          alt="CEIJA N°12 Remedios Escalada de San Martín"
          style={{
            width: '160px',
            height: 'auto',
            marginBottom: '24px',
            borderRadius: '12px',
          }}
        />

        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 2px',
          lineHeight: 1.3,
        }}>
          CEIJA N°12 Remedios Escalada de San Martín
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          margin: '0 0 20px',
        }}>
          Sede Las Higueras
        </p>

        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-primary)',
          fontWeight: 500,
          margin: '0 0 4px',
        }}>
          Bachiller Orientado en Economía y Administración
        </p>

        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          margin: '0 0 4px',
        }}>
          Plan de 3 años &middot; Presencial | Virtual | Libre
        </p>

        <p style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          margin: '0 0 28px',
        }}>
          España 36, Las Higueras
        </p>

        <button
          className="btn-submit"
          onClick={onEnter}
          style={{ width: '100%', maxWidth: '280px', padding: '14px 24px', fontSize: '15px' }}
        >
          Ingresar
        </button>

        <p style={{
          marginTop: '48px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
        }}>
          &copy; {new Date().getFullYear()} CEIJA N°12 &mdash; Todos los derechos reservados
        </p>
      </div>
    </div>
  );
};
