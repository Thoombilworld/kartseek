'use client';

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import Link from 'next/link';
import { ZoneLink } from '../../../shared-ui/src/zone-link';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth, toAuthUser } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { authApi, ApiError } from '@/lib/api-endpoints';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
interface RequireAuthOptions {
  /** Sentence explaining why signing in is needed, e.g. "to complete your order". */
  reason?: string;
  /** Run once the customer is signed in — the action they originally attempted. */
  onAuthenticated?: () => void;
}

interface LoginPromptValue {
  /**
   * Gate an action behind sign-in.
   *
   * Returns true when the customer is already signed in (the action has run, or
   * the caller may proceed); false when the prompt was opened instead.
   */
  requireAuth: (options?: RequireAuthOptions) => boolean;
  isOpen: boolean;
  close: () => void;
}

const LoginPromptContext = createContext<LoginPromptValue | null>(null);

/**
 * A modal sign-in gate for sensitive areas — checkout, wallet, bookings.
 *
 * A redirect to /auth/login was the alternative, but it throws away where the
 * customer was and what they were doing; on a checkout page that reads as losing
 * the basket. The prompt signs them in in place and then resumes the action.
 */
export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrated, login } = useAuth();
  const { selectedRegion } = useRegion();

  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const pendingAction = useRef<(() => void) | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = useCallback(() => {
    setIsOpen(false);
    setError('');
    setPassword('');
    pendingAction.current = null;
  }, []);

  const requireAuth = useCallback((options?: RequireAuthOptions) => {
    if (isAuthenticated) {
      options?.onAuthenticated?.();
      return true;
    }
    // Before hydration finishes we cannot tell signed-in from signed-out; hold the
    // action rather than prompting someone who is in fact already signed in.
    pendingAction.current = options?.onAuthenticated ?? null;
    setReason(options?.reason);
    setIsOpen(true);
    return false;
  }, [isAuthenticated]);

  // If the session arrives by another route (hydration, or a sign-in in a second
  // tab), drop the prompt and run whatever was waiting on it.
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      const action = pendingAction.current;
      close();
      action?.();
    }
  }, [isAuthenticated, isOpen, close]);

  // Escape closes; body scroll is locked while the dialog is up.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }

    setBusy(true);
    try {
      const session = await authApi.login(email.trim(), password);
      const regionCode = selectedRegion === 'ALL' ? undefined : selectedRegion;
      login(toAuthUser(session.user, regionCode), session.accessToken, session.refreshToken);
      const action = pendingAction.current;
      close();
      action?.();          // resume exactly what they were trying to do
    } catch (err) {
      // The gateway's wording carries the remaining-attempts and lockout detail.
      if (err instanceof ApiError) setError(err.message || 'Sign-in failed. Please try again.');
      else setError('We could not reach the sign-in service. Check your connection.');
      setBusy(false);
    }
  };

  const value = useMemo(() => ({ requireAuth, isOpen, close }), [requireAuth, isOpen, close]);

  return (
    <LoginPromptContext.Provider value={value}>
      {children}

      {isOpen && !isAuthenticated && isHydrated && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={close}
          role="presentation"
        ><DismissOnEscape onDismiss={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to continue"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-900 leading-tight">Sign in to continue</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {reason || 'Please sign in to continue.'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={close} aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-4">
              {error && (
                <p role="alert" className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email</span>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" autoFocus placeholder="you@example.com"
                  className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Password</span>
                <div className="relative mt-1">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                    placeholder="Your password"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              <button
                type="submit" disabled={busy}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold transition-colors"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <ZoneLink href="/auth/signup" onClick={close} className="font-semibold text-blue-600 hover:underline">
                  Create an account
                </ZoneLink>
                <ZoneLink href="/auth/forgot-password" onClick={close} className="text-slate-500 hover:underline">
                  Forgot password?
                </ZoneLink>
              </div>
            </form>
          </div>
        </div>
      )}
    </LoginPromptContext.Provider>
  );
}

export function useLoginPrompt(): LoginPromptValue {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) throw new Error('useLoginPrompt must be used within <LoginPromptProvider>');
  return ctx;
}

/** Convenience wrapper — `requireAuth()` on its own is the common case. */
export function useRequireAuth() {
  return useLoginPrompt().requireAuth;
}
