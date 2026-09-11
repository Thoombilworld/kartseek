'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, toAuthUser } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { authApi, ApiError } from '@/lib/api-endpoints';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShoppingBag,
  Truck,
  Shield,
  Hotel,
} from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { useTranslation } from '@/i18n';
import type { TranslationKeys } from '@/i18n';

/**
 * Turn a failed sign-in into something the customer can act on.
 *
 * Returns a *key*, not a sentence, because this runs outside the component and
 * so cannot reach `useTranslation`. `serverMessage` carries the gateway's own
 * text where it is worth more than ours — "2 attempt(s) remaining" before the
 * lockout, and how many minutes are left once it trips. Those are not
 * localised by the gateway, but a precise English detail beats a vague
 * translated one, so the caller prefers it when present.
 */
type LoginFailure = { key: keyof TranslationKeys['auth']; serverMessage?: string };

function describeLoginError(err: unknown): LoginFailure {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return { key: 'errCheckEmailPassword', serverMessage: err.message };
    }
    if (err.status === 400) return { key: 'errCheckEmailPassword', serverMessage: err.message };
    if (err.status >= 500) return { key: 'errSignInUnreachable' };
    return { key: 'errSignInFailed', serverMessage: err.message };
  }
  // fetch() rejects on network failure and on the client's 8s abort.
  return { key: 'errSignInUnreachableNetwork' };
}

export default function LoginPage() {
  const { t } = useTranslation('common');
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <KartseekLoader size="lg" message={t('loading')} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { selectedRegion, currentRegionConfig } = useRegion();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const callingCode = currentRegionConfig?.callingCode || '+974';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('errFillAllFields'));
      return;
    }

    setLoading(true);
    const regionCode = selectedRegion === 'ALL' ? 'QA' : selectedRegion;

    try {
      const session = await authApi.login(email.trim(), password);
      /**
       * A staff account does not get a session here.
       *
       * The gateway answers a staff sign-in with a second-factor challenge and
       * no tokens. This called `login(...)` unconditionally, so it persisted
       * `undefined` as the access token and dispatched LOGIN anyway: the header
       * showed the customer signed in while every request they made was
       * anonymous. Nothing is stored — they are sent to the console, which is
       * where the challenge is completed.
       */
      if (session.requires2FA || !session.accessToken) {
        setError('Staff accounts sign in at the admin console. Redirecting you there…');
        router.push('/admin/login?redirect=/admin');
        return;
      }
      // Both tokens are kept: the access token authorises requests, the refresh
      // token is what lets the session outlive its one-hour lifetime.
      login(toAuthUser(session.user, regionCode), session.accessToken, session.refreshToken);
      router.push(redirect);
    } catch (err) {
      const failure = describeLoginError(err);
      setError(failure.serverMessage || t(failure.key));
      setLoading(false); // stays mounted on failure, so clear the spinner
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-2xl font-black tracking-tight">KARTSEEK</span>
          </Link>

          <h2 className="text-4xl font-black leading-tight mb-4">
            {t('loginTitle')}
            <span className="text-blue-200">.</span>
          </h2>
          <p className="text-blue-200 text-lg max-w-sm">{t('signInSubtitle')}</p>
        </div>

        <div className="relative z-10 space-y-4">
          <FeatureItem icon={<ShoppingBag className="w-5 h-5" />} text={t('featShopCategories')} />
          <FeatureItem icon={<Hotel className="w-5 h-5" />} text={t('featBookServices')} />
          <FeatureItem icon={<Shield className="w-5 h-5" />} text={t('featSecurePayments')} />
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black tracking-tight text-blue-700">
              KART<span className="text-slate-900">SEEK</span>
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('signIn')}</h1>
          <p className="text-sm text-slate-500 mb-8">
            {t('noAccount')}{' '}
            <Link href="/auth/signup" className="text-blue-600 font-semibold hover:underline">
              {t('createOneFree')}
            </Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showPw ? t('hidePassword') : t('showPassword')}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              aria-label={t('signIn')}
            >
              {loading ? (
                <KartseekLoader size="sm" />
              ) : (
                <>
                  {t('signIn')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-3 text-xs text-slate-400 font-medium">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors">
              <span className="text-lg">🔵</span> Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors">
              <span className="text-lg">📱</span> {t('phoneOtp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
        {icon}
      </div>
      <p className="text-sm font-medium text-blue-100">{text}</p>
    </div>
  );
}
