'use client';
import React, { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, MapPin, Clock, Receipt, Home, RotateCcw, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const STATUSES = [
  { key: 'created', label: 'Order Placed', desc: 'Sent to restaurant', done: true },
  { key: 'accepted', label: 'Restaurant Accepted', desc: 'Confirming your order', done: true },
  { key: 'preparing', label: 'Preparing Food', desc: 'Chef is cooking', done: false },
  { key: 'ready', label: 'Ready for Pickup', desc: 'Head to the counter', done: false },
  { key: 'collected', label: 'Collected', desc: 'Enjoy your meal!', done: false },
];

function TakeawaySuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? 'TKW-98741';
  const total = params.get('total') ?? '1180';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md space-y-5">
        {/* Success Hero */}
        <div className="text-center">
          <div className="w-24 h-24 bg-linear-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">Order Placed! 🎉</h1>
          <p className="text-slate-500 mt-2">Your takeaway order is confirmed</p>
        </div>

        {/* Order ID */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-purple-100 rounded-xl p-3"><Receipt className="w-6 h-6 text-purple-700" /></div>
          <div className="flex-1">
            <p className="text-xs text-slate-500 font-medium">Order ID</p>
            <p className="text-xl font-black text-purple-700">{orderId}</p>
          </div>
          <button 
            id="btn-copy-order-id"
            onClick={() => navigator.clipboard.writeText(orderId)}
            className="text-purple-600 border border-purple-300 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-purple-100 transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          {[
            { icon: MapPin, label: 'Pickup From', value: 'The Grand Biryani House' },
            { icon: Clock, label: 'Pickup Time', value: 'ASAP (~20 min)' },
            { icon: Receipt, label: 'Amount Paid', value: `₹${total}`, bold: true },
          ].map(({ icon: Icon, label, value, bold }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 text-sm flex-1">{label}</span>
              <span className={`text-sm ${bold ? 'font-black text-purple-700' : 'font-semibold text-slate-800'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-sm">Order Timeline</h3>
          <div className="space-y-0">
            {STATUSES.map((s, i) => (
              <div key={s.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-purple-600' : 'bg-slate-100 border-2 border-slate-200'}`}>
                    {s.done ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                  </div>
                  {i < STATUSES.length - 1 && <div className={`w-0.5 h-8 ${s.done ? 'bg-purple-200' : 'bg-slate-200'}`} />}
                </div>
                <div className="pb-4">
                  <p className={`font-bold text-sm ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</p>
                  <p className={`text-xs ${s.done ? 'text-slate-500' : 'text-slate-300'}`}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex gap-3">
          <span className="text-lg">ℹ️</span>
          <p className="text-orange-800 text-xs font-medium">You'll receive a notification when your order is ready for pickup. Please carry a valid ID.</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href={`/restaurant/takeaway/track/${orderId}`}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-colors text-sm">
            📍 Track My Order
          </Link>
          <Link href="/restaurant"
            className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors text-sm">
            <Home className="w-4 h-4" /> Back to Restaurants
          </Link>
          <Link href="/profile/restaurant-orders"
            className="w-full text-center text-sm text-slate-500 hover:text-purple-600 font-medium py-1 flex items-center justify-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TakeawaySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading your order...</p>
        </div>
      </div>
    }>
      <TakeawaySuccessContent />
    </Suspense>
  );
}
