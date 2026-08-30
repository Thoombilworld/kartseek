'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function HotelOwnerLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/hotel-owner');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Hotel Owner Login</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your hotel dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-1.5">Email</label>
            <div className="relative"><Mail className="w-4 h-4 text-white/40 absolute left-3 top-3" /><input type="email" placeholder="you@business.com" className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-500" required /></div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/40 absolute left-3 top-3" />
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-500" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">{showPassword ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? 'Please wait...' : 'Sign In'}<ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Don't have an account?{' '}
          <Link href="/hotel-owner" className="text-blue-400 hover:text-blue-300 font-semibold">Register</Link>
        </p>
      </div>
    </div>
  );
}
