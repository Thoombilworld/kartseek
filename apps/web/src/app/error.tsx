'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

/**
 * Global error boundary — catches unhandled render errors and displays a
 * branded recovery UI. Prevents the entire app from crashing when a single
 * module throws. Next.js automatically wraps each route segment with this.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error monitoring (Sentry, LogRocket, etc.)
    console.error('[KARTSEEK] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          We encountered an unexpected error. Don&apos;t worry — your data is safe.
          Try refreshing the page, or go back to the home screen.
        </p>

        {/* Error Digest (for support) */}
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono bg-slate-100 rounded-lg px-3 py-2 mb-6 inline-block">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
