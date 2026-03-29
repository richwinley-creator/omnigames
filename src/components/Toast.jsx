import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const COLORS = {
  success: { bg: '#dcfce7', border: '#16a34a', text: '#15803d', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: '✕' },
  info:    { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8', icon: 'ℹ' },
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type, visible: true }]);
    timers.current[id] = setTimeout(() => dismiss(id), 3000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, maxWidth: 360, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: c.bg, border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.border}`,
                borderRadius: 10, padding: '12px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                cursor: 'pointer', pointerEvents: 'all',
                animation: 'toastIn 0.25s ease',
                minWidth: 240,
              }}
            >
              <span style={{ color: c.border, fontWeight: 700, fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>
                {c.icon}
              </span>
              <span style={{ color: c.text, fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>
                {t.message}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
