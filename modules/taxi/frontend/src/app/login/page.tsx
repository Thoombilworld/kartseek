'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthUser } from '@/lib/contexts/auth-context';
import { Car, Eye, EyeOff, Phone, Lock, ArrowLeft, ArrowRight, Shield } from 'lucide-react';

/* ── Mock taxi users — replace with real API ───────────────────────────── */
const MOCK_RIDER: AuthUser = {
  id: 'rider_001', name: 'Rider', email: '', phone: '',
  role: 'CUSTOMER', isVerified: true, walletBalance: 500,
  loyaltyPoints: 100, regionCode: 'IN',
};

const MOCK_DRIVER: AuthUser = {
  id: 'driver_001', name: 'Driver', email: '', phone: '',
  role: 'DRIVER', isVerified: true, walletBalance: 0,
  loyaltyPoints: 0, regionCode: 'IN',
};

export default function TaxiLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<'rider' | 'driver'>('rider');
  const [form, setForm] = useState({ phone: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.phone || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));

    const mockUser: AuthUser = {
      ...(tab === 'driver' ? MOCK_DRIVER : MOCK_RIDER),
      phone: form.phone,
      name: form.phone.replace(/[^0-9]/g, '').slice(-4) + (tab === 'driver' ? ' Driver' : ' Rider'),
    };

    login(mockUser, `taxi_${tab}_jwt_${Date.now()}`);
    setLoading(false);
    router.push(tab === 'driver' ? '/drive/dashboard' : '/');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-black p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-white font-black text-xl">KARTSEEK RIDES</h1>
                <p className="text-slate-400 text-xs">Sign in to continue</p>
              </div>
            </div>
            <div className="grid grid-cols-2 bg-white/10 rounded-xl p-1 gap-1">
              {(['rider', 'driver'] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setError(''); }}
                  className={`py-2 rounded-lg text-sm font-bold capitalize transition-all ${tab === t ? 'bg-yellow-400 text-black' : 'text-slate-400 hover:text-white'}`}>
                  {t === 'rider' ? '🧍 Rider' : '🚗 Driver'}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="tel" placeholder="+91 700 000 000" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-yellow-600 font-medium">Forgot?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPwd ? 'text' : 'password'} placeholder="Enter password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" title={showPwd ? 'Hide password' : 'Show password'}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</> : `Sign in as ${tab === 'rider' ? 'Rider' : 'Driver'}`}
            </button>
            <button type="button" className="w-full border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors hover:border-slate-300">
              <span>📱</span> Continue with OTP
            </button>
            <p className="text-sm text-slate-500 text-center">
              {tab === 'rider' ? <>No account? <Link href="/register" className="text-yellow-600 font-bold">Sign up</Link></> : <>Want to drive? <Link href="/drive" className="text-yellow-600 font-bold">Apply here</Link></>}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
