'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface FranchiseToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const FranchiseToastContext = createContext<FranchiseToastContextValue | undefined>(undefined);

export function useFranchiseToast() {
  const ctx = useContext(FranchiseToastContext);
  if (!ctx) {
    // Fallback for SSR or missing provider — no-op
    return { showToast: () => {} };
  }
  return ctx;
}

// ─── Toast Provider ───────────────────────────────────────────────────────────

let toastId = 0;

export function FranchiseToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4" />,
    error:   <XCircle className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
    info:    <Info className="w-4 h-4" />,
  };

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <FranchiseToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 min-w-[280px] max-w-[400px] animate-in fade-in slide-in-from-top-2 ${colors[toast.type]}`}
          >
            {icons[toast.type]}
            <span className="text-sm font-bold flex-1">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="opacity-60 hover:opacity-100 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </FranchiseToastContext.Provider>
  );
}
