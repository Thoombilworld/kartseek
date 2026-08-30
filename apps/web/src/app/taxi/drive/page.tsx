'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, DollarSign, Clock, Shield, Star, ChevronRight, CheckCircle } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

const steps = [
  { num: 1, title: 'Create your account', desc: 'Sign up with your phone number and basic details.' },
  { num: 2, title: 'Upload documents', desc: 'Provide your driving license, national ID, and vehicle photos.' },
  { num: 3, title: 'Background check', desc: 'We verify your documents within 24–48 hours.' },
  { num: 4, title: 'Start earning', desc: 'Go online and accept rides on your schedule.' },
];


const requirements = ['Valid driving license (Class B or above)', 'National ID or Passport', 'Vehicle not older than 10 years', 'Valid vehicle insurance', 'PSV badge (we help you get one)', 'Smartphone with internet access'];

export default function DrivePage() {
  const [form, setForm] = useState({ name: '', phone: '', city: '', vehicleType: '' });
  const [submitted, setSubmitted] = useState(false);
  const { formatCurrencyValue } = useRegion();

  const perks = [
    { icon: DollarSign, title: `Earn ${formatCurrencyValue(3000)}–${formatCurrencyValue(8000)}/day`, desc: `Top drivers earn over ${formatCurrencyValue(150000)} per month.` },
    { icon: Clock, title: 'Work your own hours', desc: 'Go online whenever you want, no fixed shifts.' },
    { icon: Shield, title: 'Insurance included', desc: 'Every trip is insured for you and the passenger.' },
    { icon: Star, title: 'Weekly payouts', desc: 'Your earnings are deposited weekly.' },
  ];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-slate-900 min-h-[calc(100vh-130px)]">
      {/* Hero */}
      <div className="bg-black py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm font-semibold px-4 py-2 rounded-full mb-6">
            🚗 Drive & Earn with KARTSEEK
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
            Turn your car into a <span className="text-yellow-400">business</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join 2,000+ verified drivers earning serious income on their own schedule.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#apply" className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-8 py-4 rounded-2xl text-lg transition-all">
              Apply to Drive
            </a>
            <Link href="/taxi/drive/login" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all">
              Driver Login
            </Link>
          </div>
        </div>
      </div>

      {/* Earnings Perks */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black text-white text-center mb-10">Why drive with us?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {perks.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-yellow-400/30 transition-all">
              <div className="w-12 h-12 bg-yellow-400/10 border border-yellow-400/20 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 className="text-3xl font-black text-white text-center mb-10">How to get started</h2>
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {steps.map((s, i) => (
            <div key={s.num} className="relative text-center">
              {i < steps.length - 1 && <div className="hidden md:block absolute top-6 left-1/2 w-full h-px bg-white/10" />}
              <div className="w-12 h-12 bg-yellow-400 text-black font-black text-lg rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                {s.num}
              </div>
              <h3 className="font-bold text-white mb-2 text-sm">{s.title}</h3>
              <p className="text-slate-400 text-xs">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-black text-white mb-4">Requirements</h3>
            <ul className="space-y-3">
              {requirements.map((r) => (
                <li key={r} className="flex items-center gap-3 text-slate-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Apply Form */}
          <div id="apply" className="bg-white rounded-2xl p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-black mb-2">Application Received!</h3>
                <p className="text-slate-500 text-sm mb-4">Our team will contact you within 24 hours.</p>
                <Link href="/taxi" className="text-yellow-600 font-bold hover:underline">Back to home</Link>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black mb-4">Apply to Drive</h3>
                <form onSubmit={handleApply} className="space-y-3">
                  <input placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                  <input placeholder="Phone number" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                  <input placeholder="City / Town" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
                  <select title="Vehicle type" required value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400">
                    <option value="">Select vehicle type</option>
                    {['Sedan', 'SUV', 'Hatchback', 'Motorcycle'].map((v) => <option key={v}>{v}</option>)}
                  </select>
                  <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all">
                    Submit Application
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
