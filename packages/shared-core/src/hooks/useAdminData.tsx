'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAdminData — Reusable data-fetching hook for admin pages.
 *
 * Provides: { data, loading, error, refetch, toast, showToast }
 *
 * When the API returns 401/403 (auth required), the hook treats this as
 * a graceful degradation: it sets data to null without showing an error,
 * allowing pages to fall through to their inline mock data.
 *
 * Usage:
 *   const { data, loading, error, refetch, toast, showToast } = useAdminData(
 *     () => adminMarketplaceApi.getCategories({ country }),
 *     [country]
 *   );
 */

interface Toast {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface UseAdminDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

/** Status codes that indicate an auth issue (mock-auth mode) rather than a real error */
const AUTH_ERROR_CODES = [401, 403];
const AUTH_ERROR_PATTERNS = [
  'must be logged in',
  'unauthorized',
  'forbidden',
  'not authenticated',
  'jwt',
  'token',
];

function isAuthError(err: any): boolean {
  // Check status code
  if (err?.status && AUTH_ERROR_CODES.includes(err.status)) return true;
  // Check error message patterns
  const msg = (err?.message || '').toLowerCase();
  return AUTH_ERROR_PATTERNS.some(p => msg.includes(p));
}

export function useAdminData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseAdminDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = Date.now();
    setToast({ message, type, id });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      // Auth errors → degrade gracefully (page will use inline mock data)
      if (isAuthError(err)) {
        setData(null);
        // No error set — pages should render their fallback mock UI
      } else {
        const msg = err?.message || 'Failed to fetch data';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return { data, loading, error, refetch: fetchData, toast, showToast };
}

/**
 * useAdminAction — Wrapper for mutation calls (approve, reject, save, etc.)
 *
 * Returns a function that:
 * 1. Calls the API
 * 2. Shows a success/error toast
 * 3. Optionally refetches data
 */
export function useAdminAction(showToast: (msg: string, type?: 'success' | 'error') => void) {
  const [actionLoading, setActionLoading] = useState(false);

  const execute = useCallback(
    async <T,>(
      action: () => Promise<T>,
      successMsg: string,
      onSuccess?: (result: T) => void,
    ): Promise<T | null> => {
      setActionLoading(true);
      try {
        const result = await action();
        showToast(successMsg, 'success');
        onSuccess?.(result);
        return result;
      } catch (err: any) {
        showToast(err?.message || 'Action failed', 'error');
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [showToast],
  );

  return { execute, actionLoading };
}

/**
 * AdminToast — Simple toast notification component for admin pages.
 * Render this at the bottom of your page layout.
 */
export function AdminToast({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className={`fixed bottom-6 right-6 z-100 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold animate-slide-up ${
        toast.type === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      <span>{toast.type === 'success' ? '✓' : '✕'}</span>
      <span>{toast.message}</span>
    </div>
  );
}

/**
 * AdminLoadingSkeleton — Standard loading state for admin tables.
 */
export function AdminLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-slate-100 rounded-xl h-14" />
      ))}
    </div>
  );
}

/**
 * AdminErrorBanner — Standard error state for admin pages.
 */
export function AdminErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <p className="text-red-700 font-bold text-sm mb-2">Failed to load data</p>
      <p className="text-red-500 text-xs mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
