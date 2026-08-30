'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
  onError?:  (error: Error, info: ErrorInfo) => void;
  resetOnRouteChange?: boolean;
}

interface State {
  hasError:  boolean;
  error:     Error | null;
  errorInfo: ErrorInfo | null;
}

// ─── Error Boundary Class ─────────────────────────────────────────────────────

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    this.props.onError?.(error, info);

    // In production, send to error reporting service (e.g. Sentry)
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary] Unhandled error:', error, info);
    }
  }

  reset = () => this.setState({ hasError: false, error: null, errorInfo: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <DefaultErrorUI
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        onReset={this.reset}
      />
    );
  }
}

// ─── Default Error UI ─────────────────────────────────────────────────────────

function DefaultErrorUI({
  error,
  errorInfo,
  onReset,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-red-200 m-4"
    >
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
        ⚠️
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-md">
        {error?.message ?? 'An unexpected error occurred. Please try refreshing.'}
      </p>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="btn btn-primary btn-sm"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-secondary btn-sm"
        >
          Reload Page
        </button>
      </div>

      {process.env.NODE_ENV === 'development' && errorInfo && (
        <details className="mt-6 text-left w-full max-w-2xl">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 mb-2">
            Stack trace (dev only)
          </summary>
          <pre className="text-[10px] text-red-600 bg-red-50 p-3 rounded-lg overflow-auto max-h-48 border border-red-200">
            {error?.stack}
            {'\n\nComponent Stack:'}
            {errorInfo.componentStack}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── Convenience wrapper (functional) ────────────────────────────────────────

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;
  return Wrapped;
}

// ─── Page-level boundary (centered, full-height) ──────────────────────────────

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <span className="text-5xl mb-4">🔌</span>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Page failed to load</h1>
          <p className="text-slate-500 mb-6">We hit an unexpected snag. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Reload
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
