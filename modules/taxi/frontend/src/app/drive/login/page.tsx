'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthUser } from '@/lib/contexts/auth-context';
import { Car, Eye, EyeOff, Phone, Lock, ArrowLeft, Shield } from 'lucide-react';

/* ── Mock driver user — replace with real API ──────────────────────────── */
const MOCK_DRIVER: AuthUser = {
  id: 'driver_001',
  name: 'Driver Partner',
  email: '',
  phone: '',
  role: 'DRIVER',
  isVerified: true,
  walletBalance: 0,
  loyaltyPoints: 0,
  regionCode: 'IN',
};

export default function DriverLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
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

    const driverUser: AuthUser = {
      ...MOCK_DRIVER,
      phone: form.phone,
      name: form.phone.replace(/[^0-9]/g, '').slice(-4) + ' Driver',
    };

    login(driverUser, 'driver_jwt_token_' + Date.now());
    setLoading(false);
    router.push('/drive/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/drive" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Driver Hub
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 p-6 text-center">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="w-9 h-9 text-black" />
            </div>
            <h1 className="text-white font-black text-2xl">Driver Portal</h1>
            <p className="text-slate-400 text-sm mt-1">KARTSEEK RIDES — Partner Login</p>
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
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Signing in…</>
                : '🚗 Sign in to Dashboard'}
            </button>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <Shield className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-slate-500">Your driver account is protected with 256-bit encryption.</p>
            </div>
          </form>

          <div className="px-6 pb-6 text-center space-y-2">
            <p className="text-sm text-slate-500">
              Not a driver yet?{' '}
              <Link href="/drive" className="text-yellow-600 font-bold hover:text-yellow-700">Apply to drive →</Link>
            </p>
            <p className="text-sm text-slate-500">
              Riding with us?{' '}
              <Link href="/login" className="text-slate-600 font-medium hover:underline">Rider login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
