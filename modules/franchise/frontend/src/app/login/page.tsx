'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, MapPin, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { DEMO_FRANCHISE } from '@/lib/data/franchise-data';

export default function FranchiseLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 800));

      // Demo validation
      if (!email || !password) {
        setError('Please enter both email and password.');
        setIsLoading(false);
        return;
      }

      // Login with FRANCHISE role — using shared demo profile
      login(
        {
          id: DEMO_FRANCHISE.id,
          name: DEMO_FRANCHISE.owner,
          email: email || DEMO_FRANCHISE.email,
          role: 'FRANCHISE',
          isVerified: true,
          regionCode: DEMO_FRANCHISE.regionCode,
          city: DEMO_FRANCHISE.region,
        },
        'franchise_demo_token_' + Date.now()
      );

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/';
      router.push(redirect);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    login(
      {
        id: DEMO_FRANCHISE.id,
        name: DEMO_FRANCHISE.owner,
        email: DEMO_FRANCHISE.email,
        role: 'FRANCHISE',
        isVerified: true,
        regionCode: DEMO_FRANCHISE.regionCode,
        city: DEMO_FRANCHISE.region,
      },
      'franchise_demo_token_' + Date.now()
    );

    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              KARTSEEK <span className="text-teal-400 font-light">Franchise</span>
            </h1>
            <p className="text-slate-400 text-sm">Partner Management Portal</p>
          </div>

          <div className="space-y-6 text-left">
            {[
              {
                icon: MapPin,
                title: 'Territory Management',
                desc: 'Monitor and grow your exclusive region with real-time data.',
                color: 'text-teal-400',
                bg: 'bg-teal-500/10',
              },
              {
                icon: ShieldCheck,
                title: 'Multi-Module Operations',
                desc: 'Grocery, restaurant, pharmacy, taxi — all from one dashboard.',
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
              },
              {
                icon: Zap,
                title: 'Real-Time Analytics',
                desc: 'Track commissions, orders, and vendor performance live.',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{item.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-slate-600 text-xs mt-10">
            © {new Date().getFullYear()} KARTSEEK. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight">
              KARTSEEK <span className="text-teal-400 font-light">Franchise</span>
            </h1>
            <p className="text-slate-500 text-xs mt-1">Partner Management Portal</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to your franchise dashboard</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="franchise-login-email">Email Address</label>
                <input
                  id="franchise-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="franchise@kartseek.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5" htmlFor="franchise-login-password">Password</label>
                <div className="relative">
                  <input
                    id="franchise-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-500">
                  <input type="checkbox" className="rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"  aria-label="checkbox"/>
                  Remember me
                </label>
                <ZoneLink href="/auth/forgot-password" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                  Forgot password?
                </ZoneLink>
              </div>

              <button
                id="franchise-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
               aria-label="Action">{isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}</button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-600 font-medium">OR</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Demo Login */}
            <button
              id="franchise-demo-login"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Demo Login (Franchise Owner)
            </button>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-slate-600 text-sm">
              Want to become a franchise partner?{' '}
              <Link href="/opportunity" className="text-teal-400 hover:text-teal-300 font-bold transition-colors">
                Apply Now →
              </Link>
            </p>
            <ZoneLink href="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors block">
              ← Back to KARTSEEK Home
            </ZoneLink>
          </div>
        </div>
      </div>
    </div>
  );
}
