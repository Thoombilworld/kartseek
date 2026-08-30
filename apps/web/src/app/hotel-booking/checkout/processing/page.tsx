'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, Shield, Lock, CheckCircle } from 'lucide-react';

export default function CheckoutProcessingPage() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Verifying payment details...', icon: Lock },
    { label: 'Processing payment...', icon: Loader2 },
    { label: 'Confirming reservation...', icon: Shield },
    { label: 'Booking confirmed!', icon: CheckCircle },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 4500),
      setTimeout(() => {
        window.location.href = '/hotel-booking/booking/HBK-' + Date.now() + '/confirmation';
      }, 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-rose-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {/* Animated spinner */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          {step < 3 ? (
            <>
              <div className="absolute inset-0 border-4 border-rose-800/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-transparent border-t-rose-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-transparent border-b-pink-400 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
            </>
          ) : (
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          {steps[step].label}
        </h2>
        <p className="text-rose-300/60 text-sm mb-8">
          Please do not close this window
        </p>

        {/* Progress steps */}
        <div className="space-y-3 text-left max-w-xs mx-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isDone = idx < step;
            const isCurrent = idx === step;
            return (
              <div key={s.label} className={`flex items-center gap-3 transition-all duration-500 ${isDone ? 'opacity-60' : isCurrent ? 'opacity-100' : 'opacity-20'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isDone ? 'bg-emerald-500/20' : isCurrent ? 'bg-rose-500/20' : 'bg-white/5'
                }`}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Icon className={`w-4 h-4 text-rose-400 ${idx < 3 ? 'animate-spin' : ''}`} />
                  ) : (
                    <div className="w-2 h-2 bg-white/20 rounded-full" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isDone ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-white/30'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-rose-400/40 text-xs">
          <Lock className="w-3 h-3" />
          <span>256-bit SSL Encrypted</span>
        </div>
      </div>
    </div>
  );
}
