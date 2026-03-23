// src/contexts/ToastContext.tsx


import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Toast, ToastType } from '../types';

interface ToastContextType {
  toasts: Toast[];
  toast: {
    success: (title: string, message?: string) => void;
    error:   (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info:    (title: string, message?: string) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    success: (title: string, message?: string) => add('success', title, message),
    error:   (title: string, message?: string) => add('error',   title, message, 6000),
    warning: (title: string, message?: string) => add('warning', title, message, 5000),
    info:    (title: string, message?: string) => add('info',    title, message),
  }), [add])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}