'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, toAuthUser } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { authApi, ApiError } from '@/lib/api-endpoints';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserPlus,
  Phone,
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
 * Kept in step with PASSWORD_REGEX on the gateway's RegisterDto: 8–128
 * characters, at least one lowercase, one uppercase, one digit and one
 * symbol — any symbol. The previous rule allowed only `@$!%*?&^#`, so a
 * password with `_`, `.`, `-` or `+` was refused with a message claiming it
 * had no special character, and those customers could not register.
 */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,128}$/;

/** See the note on `describeLoginError` — returns a key, not a sentence. */
type SignupFailure = { key: keyof TranslationKeys['auth']; serverMessage?: string };

function describeSignupError(err: unknown): SignupFailure {
  if (err instanceof ApiError) {
    // The gateway answers 409 when the email is taken — the one case where the
    // customer's next step is to sign in rather than to correct the form. Our
    // copy says that; the gateway's does not, so it is not preferred here.
    if (err.status === 409) return { key: 'errEmailExists' };
    if (err.status === 400) return { key: 'errCheckDetails', serverMessage: err.message };
    if (err.status >= 500) return { key: 'errSignUpUnreachable' };
    return { key: 'errSignUpFailed', serverMessage: err.message };
  }
  return { key: 'errSignUpUnreachableNetwork' };
}

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { selectedRegion, currentRegionConfig } = useRegion();
  const { t } = useTranslation('auth');
  // `termsOfService` / `privacyPolicy` / `and` are shared copy, so they live in
  // the `common` namespace rather than being duplicated under `auth`.
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const callingCode = currentRegionConfig?.callingCode || '+974';
  const regionName = currentRegionConfig?.name || 'Qatar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError(t('errFillAllRequired'));
      return;
    }
    // Mirrors PASSWORD_REGEX on the gateway's RegisterDto. Checking only the
    // length here would let the form submit and come back as an opaque 400.
    if (!PASSWORD_RULE.test(password)) {
      setError(t('errPasswordRule'));
      return;
    }
    if (!agreed) {
      setError(t('errMustAgreeTerms'));
      return;
    }

    setLoading(true);
    const regionCode = selectedRegion === 'ALL' ? 'QA' : selectedRegion;

    try {
      // Register signs the customer in as well — it returns the same token pair
      // as login, so there is no second round trip to establish the session.
      const session = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: `${callingCode}${phone.trim()}` } : {}),
      });
      login(toAuthUser(session.user, regionCode), session.accessToken, session.refreshToken);
      router.push('/');
    } catch (err) {
      const failure = describeSignupError(err);
      setError(failure.serverMessage || t(failure.key));
      setLoading(false);
    }
  };

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
            {t('signUpHeadline')}
            <span className="text-emerald-200">.</span>
          </h2>
          <p className="text-emerald-200 text-lg max-w-sm">{t('signUpSubtitle')}</p>
        </div>

        <div className="relative z-10 space-y-4">
          <FeatureItem icon={<ShoppingBag className="w-5 h-5" />} text={t('featOneAccount')} />
          <FeatureItem icon={<Hotel className="w-5 h-5" />} text={t('featWelcomeBonus')} />
          <FeatureItem icon={<Shield className="w-5 h-5" />} text={t('featDataProtected')} />
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

          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('createAccount')}</h1>
          <p className="text-sm text-slate-500 mb-8">
            {t('hasAccount')}{' '}
            <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">
              {t('signIn')}
            </Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('nameLabel')} *
              </label>
              <div className="relative">
                <UserPlus className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('emailLabel')} *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-phone"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('phoneLabel')}{' '}
                <span className="text-slate-400 normal-case">{t('optional')}</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('phonePlaceholder', { code: callingCode })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
              >
                {t('passwordLabel')} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordMinPlaceholder')}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                  required
                  minLength={8}
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
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-500 leading-relaxed">
                {t('agreeToThe')}{' '}
                <Link href="/terms" className="text-blue-600 font-semibold hover:underline">
                  {tCommon('termsOfService')}
                </Link>{' '}
                {tCommon('and')}{' '}
                <Link href="/privacy" className="text-blue-600 font-semibold hover:underline">
                  {tCommon('privacyPolicy')}
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              aria-label={t('createAccount')}
            >
              {loading ? (
                <KartseekLoader size="sm" />
              ) : (
                <>
                  {t('createAccount')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-3 text-xs text-slate-400 font-medium">
                {t('orSignUpWith')}
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
      <p className="text-sm font-medium text-emerald-100">{text}</p>
    </div>
  );
}
