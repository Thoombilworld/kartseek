'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { authApi, ApiError } from '@/lib/api-endpoints';
import { useTranslation } from '@/i18n';

/** Kept in step with PASSWORD_REGEX on the gateway's ResetPasswordDto (any symbol counts). */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,128}$/;

export default function ResetPasswordPage() {
  const { t } = useTranslation('common');
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <KartseekLoader size="lg" message={t('loading')} />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const { t } = useTranslation('auth');
  const email = searchParams.get('email') || '';
  // The token arrives in the emailed link; without it there is nothing to reset.
  const token = searchParams.get('token') || '';

  const getStrength = (pw: string): { level: number; label: string; color: string } => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { level: 1, label: t('pwStrengthWeak'), color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: t('pwStrengthFair'), color: 'bg-amber-500' };
    if (score <= 4) return { level: 3, label: t('pwStrengthGood'), color: 'bg-blue-500' };
    return { level: 4, label: t('pwStrengthStrong'), color: 'bg-emerald-500' };
  };

  const strength = getStrength(password);

  // `key` is stable across locales; `label` is what the customer reads. Keying
  // the list on the translated label would remount every row on a language
  // switch and break React's reconciliation of the tick icons.
  const checks = [
    { key: 'length', label: t('pwCheckLength'), met: password.length >= 8 },
    { key: 'upper', label: t('pwCheckUpper'), met: /[A-Z]/.test(password) },
    { key: 'lower', label: t('pwCheckLower'), met: /[a-z]/.test(password) },
    { key: 'number', label: t('pwCheckNumber'), met: /[0-9]/.test(password) },
    { key: 'special', label: t('pwCheckSpecial'), met: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('errResetLinkInvalid'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('errPasswordMismatch'));
      return;
    }
    // Mirrors PASSWORD_REGEX on the gateway's ResetPasswordDto — checking only
    // the length here would send the form into an opaque 400.
    if (!PASSWORD_RULE.test(password)) {
      setError(t('errPasswordRule'));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      // A used or expired link is the common case and needs its own way out —
      // the gateway names it precisely, so its 4xx text is preferred.
      setError(err instanceof ApiError && err.status < 500 ? err.message : t('errResetFailed'));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">{t('passwordUpdated')}</h1>
          <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">{t('passwordUpdatedBody')}</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-sm text-sm"
          >
            {t('signIn')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-linear-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-2xl font-black tracking-tight">KARTSEEK</span>
          </Link>

          <h2 className="text-4xl font-black leading-tight mb-4">
            {t('createNewPasswordHeadline')}
            <span className="text-emerald-200">.</span>
          </h2>
          <p className="text-emerald-200 text-lg max-w-sm">{t('createNewPasswordBody')}</p>
        </div>

        <div className="relative z-10 space-y-4">
          <FeatureItem icon={<KeyRound className="w-5 h-5" />} text={t('featMixCharacters')} />
          <FeatureItem icon={<ShieldCheck className="w-5 h-5" />} text={t('featNeverReuse')} />
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black tracking-tight text-emerald-700">
              KART<span className="text-slate-900">SEEK</span>
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('resetPasswordTitle')}</h1>
          <p className="text-sm text-slate-500 mb-8">
            {email ? t('creatingPasswordFor', { email }) : t('resetPasswordSubtitle')}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('newPassword')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="new-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                  required
                  autoComplete="new-password"
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

              {/* Strength Meter */}
              {password && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full transition-all ${lvl <= strength.level ? strength.color : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.label}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {checks.map((c) => (
                      <div key={c.key} className="flex items-center gap-1.5">
                        <CheckCircle
                          className={`w-3 h-3 ${c.met ? 'text-emerald-500' : 'text-slate-300'}`}
                        />
                        <span
                          className={`text-[10px] ${c.met ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}
                        >
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="confirm-password"
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border-2 outline-none text-sm transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : confirmPassword && confirmPassword === password
                        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showConfirmPw ? t('hidePassword') : t('showPassword')}
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                  {t('errPasswordMismatch')}
                </p>
              )}
              {confirmPassword && confirmPassword === password && password.length >= 8 && (
                <p className="text-xs text-emerald-500 mt-1.5 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {t('passwordsMatch')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              aria-label={t('updatePassword')}
            >
              {loading ? (
                <KartseekLoader size="sm" />
              ) : (
                <>
                  <span>{t('updatePassword')}</span>{' '}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>
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
      <p className="text-sm font-medium text-emerald-100">{text}</p>
    </div>
  );
}
