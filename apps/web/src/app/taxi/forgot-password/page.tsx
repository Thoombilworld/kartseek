'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Car, Phone, ArrowLeft, CheckCircle, Lock } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'phone' | 'otp' | 'reset' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { setError('Enter your phone number.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep('otp');
    setError('');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { setError('Enter the 4-digit OTP.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('reset');
    setError('');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('done');
  };

  if (step === 'done') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-900 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black mb-2">Password Reset!</h2>
          <p className="text-slate-500 text-sm mb-6">Your password has been successfully changed. You can now log in with your new password.</p>
          <Link href="/taxi/login" className="block w-full bg-black text-white font-bold py-3 rounded-xl text-center hover:bg-slate-800 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/taxi/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-black p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-white font-black text-xl">Reset Password</h1>
                <p className="text-slate-400 text-xs">
                  {step === 'phone' && 'Enter your phone number to get started'}
                  {step === 'otp' && 'Enter the OTP sent to your phone'}
                  {step === 'reset' && 'Create your new password'}
                </p>
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="px-6 pt-5">
            <div className="flex items-center gap-2">
              {['Phone', 'OTP', 'New Password'].map((label, i) => {
                const stepIdx = i;
                const currentIdx = step === 'phone' ? 0 : step === 'otp' ? 1 : 2;
                return (
                  <div key={label} className="flex-1">
                    <div className={`h-1 rounded-full mb-1 ${stepIdx <= currentIdx ? 'bg-yellow-400' : 'bg-slate-200'}`} />
                    <p className={`text-[10px] font-bold ${stepIdx <= currentIdx ? 'text-yellow-600' : 'text-slate-400'}`}>{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" placeholder="+91 700 000 000" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending OTP…</> : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="p-6 space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-slate-600">We sent a 4-digit code to</p>
                <p className="font-bold text-slate-900">{phone}</p>
              </div>
              <input type="text" maxLength={4} placeholder="0000" value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                className="w-full text-center text-3xl font-black tracking-[0.5em] border border-slate-200 px-4 py-4 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400" />
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</> : 'Verify OTP'}
              </button>
              <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-700">Resend OTP</button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" placeholder="Min. 6 characters" value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" placeholder="Re-enter password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting…</> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
