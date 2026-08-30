'use client';
import React from 'react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { ArrowLeft, Shield, Clock, CreditCard, AlertTriangle, CheckCircle, XCircle, CalendarDays, Phone } from 'lucide-react';

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Cancellation Policy</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Overview */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-rose-600" /></div>
            <h2 className="text-xl font-bold text-slate-900">KARTSEEK Booking Protection</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            At KARTSEEK, we understand plans change. Our cancellation policies are designed to be fair and transparent. Each booking has a specific cancellation policy determined by the rate plan you choose.
          </p>
        </section>

        {/* Rate Plan Types */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Cancellation by Rate Plan</h2>
          <div className="space-y-4">
            {/* Flexible */}
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-emerald-800">Flexible Rate</h3>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Recommended</span>
              </div>
              <ul className="text-sm text-slate-600 space-y-2 ml-8">
                <li>• Free cancellation up to <strong>24 hours</strong> before check-in</li>
                <li>• Full refund processed within 1-3 business days</li>
                <li>• Free date modifications subject to availability</li>
                <li>• Slightly higher rate than non-refundable options</li>
              </ul>
            </div>

            {/* Semi-Flexible */}
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-amber-800">Semi-Flexible Rate</h3>
              </div>
              <ul className="text-sm text-slate-600 space-y-2 ml-8">
                <li>• Free cancellation up to <strong>48-72 hours</strong> before check-in</li>
                <li>• Cancellation within 48 hours: <strong>one night charge</strong> applies</li>
                <li>• No-show: full booking amount charged</li>
                <li>• Date modifications allowed up to 72 hours before check-in</li>
              </ul>
            </div>

            {/* Non-Refundable */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-800">Non-Refundable Rate</h3>
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Best Price</span>
              </div>
              <ul className="text-sm text-slate-600 space-y-2 ml-8">
                <li>• <strong>No cancellation or refund</strong> once booked</li>
                <li>• Full prepayment required at the time of booking</li>
                <li>• Lowest available rate (up to 15-20% cheaper)</li>
                <li>• Date modifications are <strong>not permitted</strong></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Refund Process */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900">Refund Process</h2>
          </div>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Initiate Cancellation', desc: 'Cancel from My Bookings or contact support', time: 'Instant' },
              { step: 2, title: 'Refund Processed', desc: 'KARTSEEK processes your refund', time: '1-3 business days' },
              { step: 3, title: 'Funds Returned', desc: 'Refund appears on your statement', time: '5-10 business days' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">{s.step}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{s.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Important Notes */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-800">Important Notes</h2>
          </div>
          <ul className="text-sm text-amber-800 space-y-2 ml-8">
            <li>• Cancellation deadlines are based on the <strong>hotel local time</strong></li>
            <li>• Group bookings (3+ rooms) may have different cancellation policies</li>
            <li>• Special event periods may have stricter cancellation policies</li>
            <li>• KARTSEEK Wallet refunds are processed instantly</li>
            <li>• Partial cancellations (reducing room count) are subject to rate recalculation</li>
          </ul>
        </section>

        {/* Contact */}
        <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center text-white">
          <h3 className="font-bold text-lg mb-2">Need Help Cancelling?</h3>
          <p className="text-slate-300 text-sm mb-4">Our team can help you with cancellations and modifications 24/7</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ZoneLink href="/support/hotel-booking" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors">
              <Phone className="w-4 h-4" /> Contact Support
            </ZoneLink>
            <Link href="/my-bookings" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors">
              <CalendarDays className="w-4 h-4" /> My Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
