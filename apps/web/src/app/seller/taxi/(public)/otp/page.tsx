'use client';
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, type AuthUser } from '@/lib/contexts/auth-context';
import { Car, Phone, ArrowRight, Shield, RefreshCw } from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';

const MOCK_VENDOR: AuthUser = {
  id: 'vendor_001', name: 'Vendor User', email: 'vendor@kartseek.com',
  phone: '+91 712 345 678', role: 'SELLER', isVerified: true,
  walletBalance: 0, loyaltyPoints: 0, regionCode: 'IN',
};

export default function VendorOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><KartseekLoader size="lg" message="Loading..." /></div>}>
      <OTPContent />
    </Suspense>
  );
}

function OTPContent() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [verified, setVerified] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNum = searchParams.get('phone') || '+91 7XX XXX XXX';
  const redirect = searchParams.get('redirect') || '/seller/taxi';

  // Countdown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`vendor-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`vendor-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }

    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    // Mock: accept any 6-digit code
    setVerified(true);
    await new Promise(r => setTimeout(r, 800));

    const vendorUser: AuthUser = { ...MOCK_VENDOR, phone: phoneNum };
    login(vendorUser, 'vendor_jwt_token_' + Date.now());
    document.cookie = `kartseek_token=vendor_jwt_token_${Date.now()}; path=/; max-age=86400; SameSite=Strict`;
    router.push(redirect);
  };

  const handleResend = () => {
    setResendCooldown(30);
    setError('');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-slate-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/seller/taxi/login" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">KARTSEEK <span className="text-amber-600">VENDOR</span></span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {verified ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Verified!</h2>
              <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-7 h-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">Verify Your Phone</h1>
                <p className="text-sm text-slate-500">
                  We&apos;ve sent a 6-digit code to <span className="font-bold text-slate-700">{phoneNum}</span>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4" id="otp-error">
                  {error}
                </div>
              )}

              {/* OTP Inputs */}
              <div className="flex gap-3 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`vendor-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value.replace(/\D/, ''))}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-black border-2 rounded-xl outline-none transition-all ${
                      digit ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'
                    } focus:border-amber-500 focus:ring-2 focus:ring-amber-100`}
                  />
                ))}
              </div>

              <button onClick={handleVerify} disabled={loading} id="verify-otp-btn"
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm mb-4" aria-label="Action">{loading ? <KartseekLoader size="sm" /> : <><ArrowRight className="w-4 h-4" /> Verify & Sign In</>}</button>

              {/* Resend */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-slate-400">Resend code in <span className="font-bold text-amber-600">{resendCooldown}s</span></p>
                ) : (
                  <button onClick={handleResend} className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 mx-auto" id="resend-otp-btn">
                    <RefreshCw className="w-3 h-3" /> Resend Code
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5" />
          <span>OTP verification is end-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
