'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle, CreditCard, Shield, AlertCircle, Loader2, CalendarDays } from 'lucide-react';

export default function RefundStatusPage() {
  const { bookingId } = useParams();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/hotel-bookings/${bookingId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-bold text-slate-900">Refund Status</h1>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-amber-600 animate-spin" /></div>
            <div><h2 className="font-bold text-lg text-slate-900">Refund in Progress</h2><p className="text-xs text-slate-400">Expected by Jul 5, 2026</p></div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Cancellation Confirmed', date: 'Jun 15, 2026', done: true },
              { label: 'Refund Initiated', date: 'Jun 15, 2026', done: true },
              { label: 'Processing by Payment Gateway', date: 'Jun 16, 2026', done: true },
              { label: 'Refund to Your Bank', date: 'Estimated Jun 20-25', done: false },
              { label: 'Credited to Account', date: 'Estimated Jul 1-5', done: false },
            ].map((step, idx) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {step.done ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 pb-4 border-b border-slate-50 last:border-b-0">
                  <p className={`text-sm font-medium ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                  <p className="text-xs text-slate-400">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Refund Details</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Refund Amount</span><span className="font-bold text-emerald-600">AED 1,046</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Refund Method</span><span>Visa ending in 4242</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Transaction ID</span><span className="font-mono text-xs">TXN-20260615-7829</span></div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">If you don&apos;t receive your refund within 10 business days, please <Link href="/support/hotel-booking" className="font-bold hover:underline">contact support</Link>.</p>
        </div>
      </div>
    </div>
  );
}
