'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, ChefHat, Utensils, Bell, Clock,
  MessageSquare, Star, ThumbsUp,
} from 'lucide-react';

const STEPS = [
  { key: 'placed', label: 'Order Received', desc: 'Kitchen has received your order', icon: CheckCircle2, done: true, time: '7:35 PM' },
  { key: 'preparing', label: 'Preparing', desc: 'Chef is preparing your dishes', icon: ChefHat, done: true, time: '7:36 PM' },
  { key: 'ready', label: 'Ready to Serve', desc: 'Your food is ready', icon: Utensils, done: false, time: 'Est. 7:55 PM' },
  { key: 'served', label: 'Served', desc: 'All items have been served', icon: ThumbsUp, done: false, time: '' },
];

export default function DineInTrackingPage() {
  const { orderId } = useParams();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/restaurant/orders" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">Dine-in Order</h1>
            <p className="text-sm text-slate-500">#{orderId}</p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold">Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Timer Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
          <p className="text-emerald-100 text-sm mb-2">Time since order placed</p>
          <div className="flex items-center justify-center gap-2">
            <span className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl text-3xl font-black tabular-nums">
              {String(mins).padStart(2, '0')}
            </span>
            <span className="text-2xl font-black">:</span>
            <span className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl text-3xl font-black tabular-nums">
              {String(secs).padStart(2, '0')}
            </span>
          </div>
          <p className="text-emerald-100 text-sm mt-3">Estimated prep time: ~20 min</p>
        </div>

        {/* Progress */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-bold text-slate-900 mb-5">Kitchen Status</h2>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = step.done && !STEPS[i + 1]?.done;
              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110 animate-pulse' :
                      step.done ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-10 ${step.done ? 'bg-green-300' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`font-bold ${isActive ? 'text-emerald-600' : step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                    {step.time && <p className="text-xs text-slate-400 mt-0.5">{step.time}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items Being Prepared */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-3">Items Being Prepared</h3>
          <div className="space-y-2">
            {[
              { name: 'Chicken Dum Biryani x2', status: 'Cooking', color: 'text-amber-600 bg-amber-50' },
              { name: 'Paneer Tikka', status: 'Ready ✓', color: 'text-green-600 bg-green-50' },
              { name: 'Butter Naan x4', status: 'Queued', color: 'text-slate-500 bg-slate-50' },
              { name: 'Mango Lassi x2', status: 'Ready ✓', color: 'text-green-600 bg-green-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700">{item.name}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Call Waiter */}
        <button className="w-full bg-white border-2 border-dashed border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
          <Bell className="w-5 h-5" /> Call Waiter
        </button>
      </div>
    </div>
  );
}
