'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthUser } from '@/lib/contexts/auth-context';
import { Car, User, Phone, Lock, Mail, MapPin, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';

const CITIES = ['Mumbai', 'Delhi', 'Chennai', 'Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah', 'London', 'Manchester', 'New York', 'Singapore', 'Doha', 'Manama', 'Kuwait City', 'Muscat'];

export default function TaxiRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otp, setOtp] = useState('');

  const update = (key: string, val: string) => setForm({ ...form, [key]: val });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.phone || !form.email || !form.city || !form.password) {
      setError('Please fill in all fields.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { setError('Enter the 4-digit OTP.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const newUser: AuthUser = {
      id: `user_${Date.now()}`, name: form.name, email: form.email,
      phone: form.phone, role: 'CUSTOMER', isVerified: true,
      walletBalance: 0, loyaltyPoints: 0, regionCode: 'IN',
    };
    login(newUser, `rider_jwt_${Date.now()}`);
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
          <h2 className="text-2xl font-black mb-2">Account Created!</h2>
          <p className="text-slate-500 text-sm mb-6">Welcome to KARTSEEK Rides, {form.name}. Your account is verified and ready.</p>
          <button onClick={() => router.push('/taxi')} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
            Start Booking Rides
          </button>
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
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-white font-black text-xl">Create Account</h1>
                <p className="text-slate-400 text-xs">
                  {step === 'form' ? 'Join KARTSEEK Rides in seconds' : 'Verify your phone number'}
                </p>
              </div>
            </div>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleRegister} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="John Doe" value={form.name} onChange={e => update('name', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" placeholder="+91 700 000 000" value={form.phone} onChange={e => update('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" placeholder="john@example.com" value={form.email} onChange={e => update('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select value={form.city} onChange={e => update('city', e.target.value)} title="Select city"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400 appearance-none bg-white">
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => update('password', e.target.value)}
                    className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} title={showPwd ? 'Hide' : 'Show'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : 'Create Account'}
              </button>

              <p className="text-sm text-slate-500 text-center">
                Already have an account? <Link href="/taxi/login" className="text-yellow-600 font-bold">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="p-6 space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-slate-600">We sent a 4-digit code to</p>
                <p className="font-bold text-slate-900">{form.phone}</p>
              </div>
              <div>
                <input type="text" maxLength={4} placeholder="0000" value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  className="w-full text-center text-3xl font-black tracking-[0.5em] border border-slate-200 px-4 py-4 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</> : 'Verify & Create Account'}
              </button>
              <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-700">Resend OTP</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
