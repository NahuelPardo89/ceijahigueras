import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
  error: <AlertCircle size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />,
  info: <Info size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />,
};

const BG_COLORS: Record<ToastType, string> = {
  success: 'rgba(16,185,129,0.1)',
  error: 'rgba(239,68,68,0.1)',
  info: 'rgba(139,92,246,0.1)',
};

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  info: 'var(--accent-primary)',
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '400px',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast-enter"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-input)',
              background: BG_COLORS[t.type],
              border: `1px solid ${BORDER_COLORS[t.type]}`,
              pointerEvents: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              animation: 'toastSlideIn 0.3s ease-out',
            }}
          >
            {ICONS[t.type]}
            <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)' }}>
              {t.message}
            </span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
