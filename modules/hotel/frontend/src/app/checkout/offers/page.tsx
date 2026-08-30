'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Tag, Copy, Check, ArrowRight, Shield,
  Star, Gift, Percent, Clock, Sparkles,
} from 'lucide-react';

const COUPONS = [
  { code: 'HOTEL20', desc: '20% off on bookings above AED 500', discount: '20% OFF', maxDiscount: 'Max AED 200', valid: 'Jul 31, 2026', applicable: true },
  { code: 'FIRSTHOTEL', desc: 'AED 150 off on first hotel booking', discount: 'AED 150', maxDiscount: 'Flat AED 150', valid: 'Dec 31, 2026', applicable: true },
  { code: 'WEEKEND25', desc: '25% off on weekend stays', discount: '25% OFF', maxDiscount: 'Max AED 300', valid: 'Aug 31, 2026', applicable: false },
  { code: 'SUMMER2026', desc: 'AED 100 off on 3+ night stays', discount: 'AED 100', maxDiscount: 'Flat AED 100', valid: 'Sep 30, 2026', applicable: true },
];

export default function CheckoutOffersPage() {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [usePoints, setUsePoints] = useState(false);

  const loyaltyBalance = 1420;
  const pointsValue = Math.floor(loyaltyBalance / 10);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/hotel-booking/checkout/guests" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Apply Offers</h1>
          </div>
          <div className="flex items-center gap-2">
            {['Summary', 'Guest Details', 'Offers', 'Payment'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 ${idx <= 2 ? 'text-rose-600' : 'text-slate-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 2 ? 'bg-emerald-500 text-white' : idx === 2 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {idx < 2 ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${idx <= 2 ? 'text-rose-600' : 'text-slate-400'}`}>{step}</span>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 ${idx < 2 ? 'bg-emerald-300' : idx === 2 ? 'bg-rose-200' : 'bg-slate-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Enter Coupon */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-rose-500" />
                <h2 className="font-bold text-slate-900">Have a Promo Code?</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
                />
                <button
                  onClick={() => { if (couponInput) { setAppliedCoupon(couponInput); setCouponInput(''); } }}
                  className="bg-rose-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-rose-700 transition-colors text-sm"
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <div className="mt-3 flex items-center gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Code {appliedCoupon} applied! You save AED 150</span>
                  <button onClick={() => setAppliedCoupon(null)} className="ml-auto text-xs text-red-500 hover:underline">Remove</button>
                </div>
              )}
            </div>

            {/* Available Coupons */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Available Offers
              </h2>
              <div className="space-y-3">
                {COUPONS.map(coupon => (
                  <div key={coupon.code} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    appliedCoupon === coupon.code
                      ? 'border-emerald-500 bg-emerald-50'
                      : coupon.applicable
                        ? 'border-slate-100 hover:border-rose-200'
                        : 'border-slate-100 opacity-50'
                  }`}>
                    <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-rose-600">{coupon.discount}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{coupon.desc}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        <span>{coupon.maxDiscount}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> Until {coupon.valid}</span>
                      </div>
                    </div>
                    {coupon.applicable ? (
                      appliedCoupon === coupon.code ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-lg">Applied ✓</span>
                      ) : (
                        <button
                          onClick={() => setAppliedCoupon(coupon.code)}
                          className="border-2 border-dashed border-rose-300 text-rose-600 font-mono font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          {coupon.code}
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Not applicable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Loyalty Points */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-900">Use Loyalty Points</h2>
              </div>
              <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                usePoints ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-amber-200'
              }`}>
                <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} className="hidden" />
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Redeem {loyaltyBalance.toLocaleString()} points</p>
                  <p className="text-xs text-slate-400">Worth AED {pointsValue} · 10 points = AED 1</p>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                  usePoints ? 'bg-amber-500 border-amber-500' : 'border-slate-300'
                }`}>
                  {usePoints && <Check className="w-3 h-3 text-white" />}
                </div>
              </label>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-4">
              <h3 className="font-bold text-slate-900 mb-3">Price Summary</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>AED 1,040</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Taxes & Fees</span><span>AED 156</span></div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600"><span>Coupon ({appliedCoupon})</span><span>-AED 150</span></div>
                )}
                {usePoints && (
                  <div className="flex justify-between text-amber-600"><span>Loyalty Points</span><span>-AED {pointsValue}</span></div>
                )}
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-black text-slate-900">
                    AED {1196 - (appliedCoupon ? 150 : 0) - (usePoints ? pointsValue : 0)}
                  </span>
                </div>
                {(appliedCoupon || usePoints) && (
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <span className="text-xs font-bold text-emerald-700">
                      You save AED {(appliedCoupon ? 150 : 0) + (usePoints ? pointsValue : 0)}! 🎉
                    </span>
                  </div>
                )}
              </div>

              <Link
                href="/hotel-booking/checkout/payment"
                className="w-full bg-rose-600 text-white text-center font-bold py-4 rounded-xl mt-4 hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
