'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, ChevronRight, Check, Calculator, Info, Building2 } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { parseProductParam } from '@/lib/marketplace/product-url';

const BANKS = [
  { name: 'HDFC Bank', rate: 14, processing: 299 },
  { name: 'ICICI Bank', rate: 13, processing: 199 },
  { name: 'SBI Card', rate: 15, processing: 0 },
  { name: 'Axis Bank', rate: 12, processing: 249 },
  { name: 'Kotak Mahindra', rate: 13.5, processing: 199 },
];

const TENURES = [3, 6, 9, 12, 18, 24];

export default function EMIPage() {
  const params = useParams();
  /**
   * The route segment is `<slug>-<uuid>`; the API keys on the uuid alone.
   *
   * `params.id` used to be the bare uuid and was passed straight through, so
   * every call here would 404 against the new URL shape. `segment` is kept for
   * the link back to the product, which is already canonical.
   */
  const segment = params?.id as string;
  const { id: productId } = parseProductParam(segment);
  const { formatCurrencyValue: fmt } = useRegion();
  const [selectedBank, setSelectedBank] = useState(0);
  const [selectedTenure, setSelectedTenure] = useState(6);

  const productPrice = 115900; // demo
  const bank = BANKS[selectedBank];
  const monthlyRate = bank.rate / 12 / 100;
  const emi = Math.round((productPrice * monthlyRate * Math.pow(1 + monthlyRate, selectedTenure)) / (Math.pow(1 + monthlyRate, selectedTenure) - 1));
  const totalCost = emi * selectedTenure + bank.processing;
  const totalInterest = totalCost - productPrice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Calculator className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold">EMI Calculator</h1>
          </div>
          <p className="text-white/70 text-sm">Choose a bank and tenure to see your monthly payments</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href={`/marketplace/product/${segment}`} className="hover:text-blue-600">Product</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">EMI Options</span>
        </nav>

        {/* Product Price */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Product Price</p>
            <p className="text-2xl font-black text-slate-800">{fmt(productPrice)}</p>
          </div>
          <CreditCard className="w-10 h-10 text-blue-200" />
        </div>

        {/* Bank Selection */}
        <h2 className="text-lg font-bold text-slate-800 mb-3">Select Your Bank</h2>
        <div className="space-y-2 mb-6">
          {BANKS.map((b, i) => (
            <button key={b.name} onClick={() => setSelectedBank(i)}
              className={`w-full bg-white border-2 rounded-xl p-4 text-left flex items-center justify-between transition-all ${
                selectedBank === i ? 'border-blue-500 shadow-sm bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{b.name}</div>
                  <div className="text-xs text-slate-400">{b.rate}% p.a. • Processing: {b.processing === 0 ? 'FREE' : fmt(b.processing)}</div>
                </div>
              </div>
              {selectedBank === i && <Check className="w-5 h-5 text-blue-600" />}
            </button>
          ))}
        </div>

        {/* Tenure Selection */}
        <h2 className="text-lg font-bold text-slate-800 mb-3">Select Tenure</h2>
        <div className="flex gap-2 mb-6 flex-wrap">
          {TENURES.map(t => (
            <button key={t} onClick={() => setSelectedTenure(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedTenure === t
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}>
              {t} months
            </button>
          ))}
        </div>

        {/* EMI Breakdown */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" /> EMI Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Monthly EMI</p>
              <p className="text-2xl font-black text-blue-600">{fmt(emi)}</p>
              <p className="text-[10px] text-slate-400">for {selectedTenure} months</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Cost</p>
              <p className="text-2xl font-black text-slate-800">{fmt(totalCost)}</p>
              <p className="text-[10px] text-red-500 font-medium">+{fmt(totalInterest)} interest</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              EMI values are indicative. Actual EMI may vary based on your credit profile and bank terms.
              No-cost EMI may be available on select cards — check at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
