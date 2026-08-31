'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Shown when a page could not load its data.
 *
 * The state this replaces is the quiet one: a `catch` that set the list to `[]`
 * and recorded nothing, so an unreachable service rendered the page's empty
 * state — "Your Wishlist is Empty", "No orders yet", "No coupons available".
 * The customer is told a fact about their account that is not true, and nobody
 * testing the page can tell the difference from a healthy one with no data.
 *
 * Empty and broken are different answers and they need different screens.
 * `title` names the thing that failed so the message is specific: a wishlist
 * that would not load says so, rather than apologising in general.
 */
export function LoadFailed({
  title = 'We could not load this',
  message = 'Something went wrong reaching the service. Nothing on your account has changed.',
  onRetry,
  className = '',
}: {
  title?: string;
  message?: string;
  /** Omit to render a full page reload instead of a targeted refetch. */
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`min-h-[50vh] flex flex-col items-center justify-center text-center px-4 ${className}`}
    >
      <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
        <AlertTriangle className="w-9 h-9 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 mb-6 max-w-sm text-sm leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onRetry ?? (() => window.location.reload())}
        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}

export default LoadFailed;
