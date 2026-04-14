// src/components/shared/Toast.tsx
//
// WHY: Renders the toast stack in a fixed portal at bottom-right.
// Placed once in App.tsx, reads from ToastContext.
// Accessible: role="alert" for screen readers on errors.

import { useToast } from '../../contexts/ToastContext';
import type { Toast } from '../../types';
import '../../styles/components/toast.css';

const ICONS: Record<Toast['type'], string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();

  return (
    <div
      className={`toast toast--${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="toast__icon">{ICONS[toast.type]}</div>
      <div className="toast__body">
        <p className="toast__title">{toast.title}</p>
        {toast.message && <p className="toast__message">{toast.message}</p>}
      </div>
      <button
        className="toast__close"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastStack() {
  const { toasts } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-label="Notifications">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}