import { Construction } from 'lucide-react';

interface SectionPlaceholderProps {
  title: string;
  description: string;
}

export const SectionPlaceholder = ({ title, description }: SectionPlaceholderProps) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    gap: '16px',
  }}>
    <Construction size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
    <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
      {title}
    </h2>
    <p style={{ fontSize: '14.5px', color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
      {description}
    </p>
    <span style={{
      fontSize: '12px',
      color: 'var(--color-text-muted)',
      background: 'var(--bg-card)',
      padding: '6px 14px',
      borderRadius: '20px',
      border: '1px solid var(--border-glass)',
    }}>
      Próximamente
    </span>
  </div>
);
