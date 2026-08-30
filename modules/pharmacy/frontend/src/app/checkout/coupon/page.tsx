'use client';
import React, { useState } from 'react';
import { ArrowLeft, Tag, Copy, CheckCircle, Percent } from 'lucide-react';
import Link from 'next/link';

const coupons = [
  { code: 'FIRST50', title: '50% off first order', subtitle: 'Up to ₹150', maxSaving: 150, terms: 'New users only', eligible: true },
  { code: 'MEDS10', title: '10% off medicines', subtitle: 'Min ₹300', maxSaving: 100, terms: 'Prescription items', eligible: true },
  { code: 'FREEDELIVERY', title: 'Free delivery', subtitle: 'Orders above ₹200', maxSaving: 40, terms: 'All orders', eligible: true },
  { code: 'WELLNESS20', title: '20% off wellness', subtitle: 'Max ₹200', maxSaving: 200, terms: 'Wellness only', eligible: false },
  { code: 'SAVE30', title: '₹30 off', subtitle: 'No minimum', maxSaving: 30, terms: 'All products', eligible: true },
];

export default function CouponPage() {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/pharmacy/checkout" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold">Apply Coupon</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Manual entry */}
        <div className="flex gap-3">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase tracking-wider" />
          <button onClick={() => code && setApplied(code)} className="bg-teal-600 text-white font-bold px-6 rounded-xl hover:bg-teal-700 disabled:bg-gray-300" disabled={!code}>Apply</button>
        </div>

        {applied && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div className="flex-1">
              <p className="font-bold text-emerald-800 text-sm">Coupon {applied} applied!</p>
              <p className="text-xs text-emerald-600">You save up to ₹150</p>
            </div>
            <button onClick={() => setApplied(null)} className="text-sm font-medium text-red-500 hover:text-red-700">Remove</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Percent className="w-5 h-5 text-teal-600" /> Available Coupons</h2>
          <span className="text-sm text-gray-500">{coupons.filter(c => c.eligible).length} available</span>
        </div>

        {coupons.map(c => (
          <div key={c.code} className={`bg-white rounded-2xl border overflow-hidden ${!c.eligible ? 'opacity-50' : ''} ${applied === c.code ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200'}`}>
            <div className="p-5 flex items-center gap-4">
              <div className={`px-4 py-2.5 rounded-lg border-2 border-dashed ${c.eligible ? 'border-teal-400 bg-teal-50' : 'border-gray-300 bg-gray-50'}`}>
                <p className={`font-black text-sm tracking-wider ${c.eligible ? 'text-teal-600' : 'text-gray-400'}`}>{c.code}</p>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500">{c.subtitle}</p>
              </div>
              {c.eligible ? (
                <button onClick={() => setApplied(c.code)} className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors ${applied === c.code ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                  {applied === c.code ? 'Remove' : 'Apply'}
                </button>
              ) : (
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">Not eligible</span>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{c.terms}</span>
              <span className="text-xs font-bold text-emerald-600">Save up to ₹{c.maxSaving}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
