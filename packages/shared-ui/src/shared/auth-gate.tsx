'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ZoneLink } from '../zone-link';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useLoginPrompt } from '@/lib/contexts/login-prompt';

/**
 * Page-level sign-in gate for sensitive areas — checkout, wallet, premium services.
 *
 * Opens the login prompt on arrival and holds the page behind a short explanation
 * until the customer signs in, rather than redirecting them away. Once signed in
 * the children render with the page state intact, which is the difference between
 * "sign in to pay" and "we threw away your basket".
 */
export function AuthGate({
  children,
  reason = 'Please sign in to continue.',
  title = 'Sign in to continue',
}: {
  children: React.ReactNode;
  reason?: string;
  title?: string;
}) {
  const { isAuthenticated, isHydrated } = useAuth();
  const { requireAuth } = useLoginPrompt();

  // Only prompt once auth has hydrated — before that, a signed-in customer looks
  // signed out and would be asked to log in they already are.
  useEffect(() => {
    if (isHydrated && !isAuthenticated) requireAuth({ reason });
  }, [isHydrated, isAuthenticated, requireAuth, reason]);

  if (!isHydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="text-slate-500 mt-2">{reason}</p>
        <button
          type="button"
          onClick={() => requireAuth({ reason })}
          className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
        >
          Sign in
        </button>
        <p className="text-sm text-slate-500 mt-4">
          New to KARTSEEK?{' '}
          <ZoneLink href="/auth/signup" className="font-semibold text-blue-600 hover:underline">
            Create an account
          </ZoneLink>
        </p>
      </div>
    </div>
  );
}
