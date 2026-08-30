'use client';

import React, {
  createContext, useContext, useReducer, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number; // ms — 0 = persist
  action?: { label: string; onClick: () => void };
}

type ToastAction =
  | { type: 'ADD';    toast: Toast }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':    return [action.toast, ...state].slice(0, 5); // max 5
    case 'REMOVE': return state.filter(t => t.id !== action.id);
    case 'CLEAR':  return [];
    default:       return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => string;
  success: (title: string, description?: string) => string;
  error:   (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info:    (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  clear:   () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, string> = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

const COLORS: Record<ToastVariant, string> = {
  success: 'bg-emerald-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: Toast = { duration: 4000, ...options, id };
    dispatch({ type: 'ADD', toast: newToast });

    if (newToast.duration && newToast.duration > 0) {
      const timer = setTimeout(() => dismiss(id), newToast.duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((title: string, description?: string) =>
    toast({ title, description, variant: 'success' }), [toast]);
  const error = useCallback((title: string, description?: string) =>
    toast({ title, description, variant: 'error', duration: 6000 }), [toast]);
  const warning = useCallback((title: string, description?: string) =>
    toast({ title, description, variant: 'warning' }), [toast]);
  const info = useCallback((title: string, description?: string) =>
    toast({ title, description, variant: 'info' }), [toast]);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss, clear }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          className="fixed bottom-24 right-4 z-[400] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto bg-white rounded-2xl shadow-float border border-slate-100 overflow-hidden animate-slide-right flex items-start gap-3 p-4"
            >
              <div className={`${COLORS[t.variant]} w-1 self-stretch rounded-full shrink-0`} />
              <span className="text-lg leading-none mt-0.5">{ICONS[t.variant]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-snug">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.description}</p>
                )}
                {t.action && (
                  <button
                    onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                    className="text-xs font-bold text-brand-600 mt-1.5 hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-slate-300 hover:text-slate-600 transition-colors text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
