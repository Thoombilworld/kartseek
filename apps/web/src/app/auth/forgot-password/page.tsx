'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft, KeyRound, ShieldCheck, CheckCircle } from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { authApi, ApiError } from '@/lib/api-endpoints';
import { useTranslation } from '@/i18n';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('common');
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><KartseekLoader size="lg" message={t('loading')} /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

/**
 * Recovery is link-based, not code-based.
 *
 * This screen used to collect a 6-digit code and then navigate on with a
 * fabricated `mock_reset_…` token. The gateway has no OTP reset route: it emails
 * a single-use link that carries the token, so the only steps are "tell us your
 * address" and "go and check your inbox".
 */
function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation('auth');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError(t('errEnterEmail')); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError(t('errInvalidEmail')); return; }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      // The API answers identically whether or not the address is registered, so
      // this screen must not reveal the difference either.
      setStep('sent');
    } catch (err) {
      // A 4xx message from the gateway is specific enough to be worth showing
      // verbatim; anything else gets our own localised copy.
      setError(err instanceof ApiError && err.status < 500
        ? err.message
        : t('errResetLinkFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-linear-to-br from-violet-600 via-indigo-600 to-blue-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-2xl font-black tracking-tight">KARTSEEK</span>
          </Link>

          <h2 className="text-4xl font-black leading-tight mb-4">
            {t('resetHeadline')}<span className="text-violet-200">.</span>
          </h2>
          {/* Copy describes the link, because a link is what the gateway sends.
              The form logic was converted from OTP to link-based recovery, but
              this panel kept promising a "6-digit verification code" — so
              customers watched their inbox for a code that is never issued and
              had no reason to look for the link that actually arrived. */}
          <p className="text-violet-200 text-lg max-w-sm">
            {t('resetHeadlineBody')}
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <FeatureItem icon={<KeyRound className="w-5 h-5" />} text={t('featSingleUseLink')} />
          <FeatureItem icon={<ShieldCheck className="w-5 h-5" />} text={t('featEncryptedReset')} />
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black tracking-tight text-violet-700">KART<span className="text-slate-900">SEEK</span></span>
          </Link>

          {/* Step Indicator — two steps: request the link, then open it. */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  (step === 'email' && s === 1) || (step === 'sent' && s === 2)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : step === 'sent' && s === 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {step === 'sent' && s === 1 ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 2 && <div className={`w-8 h-0.5 rounded ${step === 'sent' ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Email ─────────────────────────────────────── */}
          {step === 'email' && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('forgotPasswordTitle')}</h1>
              <p className="text-sm text-slate-500 mb-8">
                {t('forgotPasswordSubtitle')}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="forgot-email"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                 aria-label={t('sendResetLink')}>{loading ? <KartseekLoader size="sm" /> : <><span>{t('sendResetLink')}</span> <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>}</button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/auth/login" className="text-sm text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('backToSignIn')}
                </Link>
              </div>
            </>
          )}

          {/* ── Step 2: Check your inbox ──────────────────────────── */}
          {step === 'sent' && (
            <>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('resetLinkSent')}</h1>
              <p className="text-sm text-slate-500 mb-6">
                {t('resetLinkSentBody', { email })}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
                {t('notInInbox')}{' '}
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  {t('tryDifferentAddress')}
                </button>.
              </div>

              <div className="mt-6 text-center">
                <Link href="/auth/login" className="text-sm text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('backToSignIn')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">{icon}</div>
      <p className="text-sm font-medium text-violet-100">{text}</p>
    </div>
  );
}
