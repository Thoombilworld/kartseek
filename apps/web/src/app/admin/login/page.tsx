'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, type AuthUser } from '@/lib/contexts/auth-context';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  ShieldCheck,
  Activity,
  Globe,
  BarChart3,
  Server,
  Key,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { authApi, ApiError, type AuthApiUser } from '@/lib/api-endpoints';
import { toAdminUser, type StaffSessionUser } from '@/auth/admin-session';

// B2 replaces the OTP phase with a real challenge flow; until then these stay
// hard-coded (no demo account map backs them — the credential step below is
// the only thing that decides who signs in).
const VALID_OTP = process.env.NEXT_PUBLIC_ADMIN_OTP || '123456';
const VALID_BACKUP_PREFIX = 'BACKUP-';

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <KartseekLoader size="lg" message="Loading..." />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

// ─── OTP Input Component ──────────────────────────────────────────────────────

function OtpInput({
  length,
  value,
  onChange,
  disabled,
}: {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleChange = (idx: number, raw: string) => {
    // Take only the last typed digit (handles fast input / browser quirks)
    const char = raw.replace(/\D/g, '').slice(-1);
    if (!char && raw.length > 0) return; // non-digit entered

    const newDigits = [...digits];
    newDigits[idx] = char;
    const newVal = newDigits.join('').slice(0, length);
    onChange(newVal);

    // Auto-advance to next field
    if (char && idx < length - 1) {
      // Use requestAnimationFrame to ensure state updates before focus
      requestAnimationFrame(() => {
        refs.current[idx + 1]?.focus();
        refs.current[idx + 1]?.select();
      });
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        // Move to previous field and clear it
        const newDigits = [...digits];
        newDigits[idx - 1] = '';
        onChange(newDigits.join('').replace(/\s/g, ''));
        refs.current[idx - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length > 0) {
      onChange(pasted);
      const nextIdx = Math.min(pasted.length, length - 1);
      requestAnimationFrame(() => {
        refs.current[nextIdx]?.focus();
      });
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={2}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={handleFocus}
          disabled={disabled}
          className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 outline-none transition-all
            ${
              disabled
                ? 'bg-slate-800 border-slate-700 text-slate-500'
                : digits[i]
                  ? 'bg-slate-800 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          id={`otp-digit-${i}`}
          aria-label={`OTP digit ${i + 1} of ${length}`}
          title={`Digit ${i + 1}`}
          placeholder="·"
        />
      ))}
    </div>
  );
}

// ─── Main Login Form ──────────────────────────────────────────────────────────

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // 2FA state
  const [phase, setPhase] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [pendingToken, setPendingToken] = useState('');

  const { login, set2FARequired, complete2FA } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const isLocked = attempts >= 5;
  const isOtpLocked = otpAttempts >= 3;

  // Countdown timer for OTP validity
  useEffect(() => {
    if (phase !== 'otp' || countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [phase, countdown]);

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError('Account temporarily locked. Too many failed attempts. Try again in 15 minutes.');
      return;
    }
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    /**
     * Authenticate against the gateway.
     *
     * This used to check the password against `ADMIN_ACCOUNTS` — a map defined
     * in this file, shipped to the browser — then wait 1500ms for realism and
     * mint its own token:
     *
     *     const token = 'admin_jwt_' + Date.now() + '_' + Math.random()...
     *
     * Nothing on the server had ever seen that string, so every request the
     * admin panel made carried a token the gateway rejected. The panel looked
     * signed in and answered 401 to everything behind it — which is why
     * seller-submitted products "were not showing up for approval": the
     * catalogue call never returned any.
     *
     * The password check was also decorative, because the accounts and their
     * passwords were in client-side source.
     */
    let session: { user: AuthApiUser; accessToken: string; refreshToken?: string };
    try {
      session = (await authApi.login(email.trim().toLowerCase(), password)) as typeof session;
    } catch (err) {
      setAttempts((prev) => prev + 1);
      const message =
        err instanceof ApiError && err.status < 500
          ? err.message
          : 'We could not reach the sign-in service. Please try again.';
      setError(
        `${message}${err instanceof ApiError && err.status < 500 ? ` ${Math.max(0, 5 - attempts - 1)} attempts remaining.` : ''}`,
      );
      setLoading(false);
      return;
    }

    // The role, market lock and permissions come from the signed token, never
    // from the form or a client-side table. Someone with a customer account
    // must not reach the admin console by knowing its URL, and what a staff
    // account can see must be what the token actually grants.
    let user: AuthUser;
    try {
      user = toAdminUser(session as { user: StaffSessionUser });
    } catch {
      setError('This account does not have admin access.');
      setLoading(false);
      return;
    }
    const token = session.accessToken;
    login(user, token, session.refreshToken);
    set2FARequired();
    setPendingUser(user);
    setPendingToken(token);
    setPhase('otp');
    setCountdown(300);
    setOtp('');
    setOtpAttempts(0);
    setError('');
    setLoading(false);
  };

  const handleOtpSubmit = async () => {
    if (isOtpLocked) {
      setError('Too many failed OTP attempts. Please contact your administrator.');
      return;
    }

    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const codeToValidate = useBackupCode ? backupCode : otp;
    const isValid = useBackupCode
      ? codeToValidate.toUpperCase().startsWith(VALID_BACKUP_PREFIX) && codeToValidate.length >= 12
      : codeToValidate === VALID_OTP;

    if (!isValid) {
      setOtpAttempts((prev) => prev + 1);
      setError(
        `Invalid ${useBackupCode ? 'backup code' : 'verification code'}. ${3 - otpAttempts - 1} attempts remaining.`,
      );
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setLoading(false);
      return;
    }

    // OTP valid → complete 2FA and enter dashboard
    setOtpSuccess(true);
    setLoading(false);
    await new Promise((r) => setTimeout(r, 1000));
    complete2FA();
    router.push(redirect);
  };

  const handleResend = () => {
    setResendTimer(30);
    setCountdown(300);
    setOtp('');
    setError('');
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && phase === 'otp' && !loading && !isOtpLocked) {
      handleOtpSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Panel — Admin Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-emerald-500/30 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>

        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[60px_60px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 backdrop-blur flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight block">KARTSEEK</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em]">
                Admin Console
              </span>
            </div>
          </div>

          <h2 className="text-4xl font-black leading-tight mb-4">
            {phase === 'credentials' ? (
              <>
                Admin Portal<span className="text-emerald-400">.</span>
              </>
            ) : (
              <>
                Two-Factor<span className="text-emerald-400"> Auth.</span>
              </>
            )}
          </h2>
          <p className="text-slate-400 text-lg max-w-sm">
            {phase === 'credentials'
              ? 'Secure administrative access for platform management, analytics, and operations control.'
              : 'An additional layer of security protects your admin account from unauthorized access.'}
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <FeatureItem
            icon={<Shield className="w-5 h-5 text-emerald-400" />}
            text="Role-based access with audit logging"
            active={true}
          />
          <FeatureItem
            icon={<Key className="w-5 h-5 text-cyan-400" />}
            text="Two-factor authentication (TOTP)"
            active={phase === 'otp'}
          />
          <FeatureItem
            icon={<Globe className="w-5 h-5 text-amber-400" />}
            text="Multi-region platform management"
            active={false}
          />
          <FeatureItem
            icon={<Server className="w-5 h-5 text-violet-400" />}
            text="Infrastructure & system health"
            active={false}
          />
        </div>

        <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/50">
          <p className="text-xs text-slate-600">
            © 2026 KARTSEEK. All administrative actions are logged and auditable.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              KARTSEEK <span className="text-emerald-400">Admin</span>
            </span>
          </div>

          {/* ─── Phase 1: Credentials ──────────────────────────────────── */}
          {phase === 'credentials' && (
            <>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-6">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300 font-medium">
                  This is a restricted area. Authorized personnel only. All access attempts are
                  logged.
                </p>
              </div>

              <h1 className="text-2xl font-bold text-white mb-1">Admin Sign In</h1>
              <p className="text-sm text-slate-500 mb-8">
                Enter your administrator credentials to access the control panel.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6 flex items-start gap-2">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCredentialSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@kartseek.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                      required
                      autoComplete="email"
                      disabled={isLocked}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      id="admin-password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition-all"
                      required
                      autoComplete="current-password"
                      disabled={isLocked}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      title={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-emerald-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 text-sm"
                  aria-label="Action"
                >
                  {loading ? (
                    <KartseekLoader size="sm" />
                  ) : isLocked ? (
                    <>Account Locked — Try later</>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Secure Sign In{' '}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Activity className="w-3 h-3" />
                  <span>Session expires after 4 hours of inactivity</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Key className="w-3 h-3" />
                  <span>Protected by 2FA — OTP required after sign-in</span>
                </div>
              </div>
            </>
          )}

          {/* ─── Phase 2: OTP Verification ─────────────────────────────── */}
          {phase === 'otp' && (
            <>
              {/* Back button */}
              <button
                onClick={() => {
                  setPhase('credentials');
                  setError('');
                }}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>

              {/* 2FA Icon */}
              <div className="flex justify-center mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    otpSuccess
                      ? 'bg-emerald-500/20 border-emerald-500/40'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  {otpSuccess ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <Smartphone className="w-8 h-8 text-emerald-400" />
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-1 text-center">
                {otpSuccess ? 'Verified!' : 'Two-Factor Verification'}
              </h1>
              <p className="text-sm text-slate-500 mb-8 text-center">
                {otpSuccess
                  ? 'Redirecting to your dashboard...'
                  : useBackupCode
                    ? 'Enter one of your backup recovery codes.'
                    : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              {error && (
                <div
                  className={`bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6 flex items-start gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                >
                  <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!otpSuccess && (
                <div className="space-y-5">
                  {useBackupCode ? (
                    /* Backup code input */
                    <div>
                      <label
                        className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
                        htmlFor="backup-code-input"
                      >
                        Backup Code
                      </label>
                      <input
                        type="text"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                        placeholder="BACKUP-XXXX-XXXX"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-900 text-white font-mono text-center placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition-all tracking-widest"
                        disabled={isOtpLocked}
                        id="backup-code-input"
                      />
                    </div>
                  ) : (
                    /* OTP digit inputs */
                    <OtpInput length={6} value={otp} onChange={setOtp} disabled={isOtpLocked} />
                  )}

                  {/* Timer + resend */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      {countdown > 0 ? (
                        <>
                          <Activity className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-500">
                            Valid for{' '}
                            <span className="text-emerald-400 font-bold">
                              {formatTime(countdown)}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="text-red-400 font-bold">Code expired</span>
                      )}
                    </div>
                    <button
                      onClick={handleResend}
                      disabled={resendTimer > 0}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>

                  {/* Verify button (for backup codes or manual submit) */}
                  {useBackupCode && (
                    <button
                      onClick={handleOtpSubmit}
                      disabled={loading || isOtpLocked || !backupCode}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-emerald-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                      aria-label="Action"
                    >
                      {loading ? (
                        <KartseekLoader size="sm" />
                      ) : (
                        <>
                          <Key className="w-4 h-4" /> Verify Backup Code
                        </>
                      )}
                    </button>
                  )}

                  {/* Toggle backup code / OTP mode */}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => {
                        setUseBackupCode(!useBackupCode);
                        setError('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                    >
                      {useBackupCode
                        ? 'Use authenticator code instead'
                        : 'Lost your device? Use a backup code'}
                    </button>
                  </div>

                  {/* Logged-in user info */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 mt-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {pendingUser?.name
                        ?.split(' ')
                        .map((w) => w[0])
                        .join('') || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{pendingUser?.name}</p>
                      <p className="text-xs text-slate-400">{pendingUser?.email}</p>
                    </div>
                    <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-lg font-bold border border-emerald-500/20">
                      {pendingUser?.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Back to customer portal */}
          {phase === 'credentials' && (
            <div className="mt-10 pt-6 border-t border-slate-800">
              <Link
                href="/auth/login"
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-3 h-3 rotate-180" /> Back to Customer Portal
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Shake animation */}
      {/* styled-jsx's `jsx`/`global` props type-check under React 19 now, so the
          suppression that stood here had nothing left to suppress and became an
          error itself. */}
      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }
      `}</style>
    </div>
  );
}

function FeatureItem({
  icon,
  text,
  active,
}: {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
          active ? 'bg-white/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
        }`}
      >
        {icon}
      </div>
      <p className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-400'}`}>{text}</p>
      {active && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
    </div>
  );
}
