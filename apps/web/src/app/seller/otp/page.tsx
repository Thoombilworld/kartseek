'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Shield, ArrowRight, RefreshCcw } from 'lucide-react';

export default function OTPVerificationPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(s => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleChange = (i: number, v: string) => {
    if (v.length > 1) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`);
      el?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Verify OTP</h1>
          <p className="text-sm text-slate-500 mt-1">Enter the 6-digit code sent to +91 98765 ••••0</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {!verified ? (
            <div className="space-y-6">
              {/* OTP Inputs */}
              <div className="flex gap-3 justify-center">
                {otp.map((d, i) => (
                  <input
                    key={i} id={`otp-${i}`}
                    type="text" inputMode="numeric" maxLength={1}
                    value={d} onChange={e => handleChange(i, e.target.value)}
                    className="w-12 h-14 text-center text-xl font-black border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-sm text-slate-500">Resend code in <span className="font-bold text-blue-600">{timer}s</span></p>
                ) : (
                  <button onClick={() => setTimer(30)} className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1 mx-auto">
                    <RefreshCcw className="w-3.5 h-3.5" />Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={() => setVerified(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                Verify & Continue <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-center text-slate-400">
                Didn&apos;t receive the code? Check SMS or try a different number.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Verified Successfully!</h2>
              <p className="text-sm text-slate-500 mb-6">Your phone number has been verified.</p>
              <Link href="/seller/marketplace" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
                Continue to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
