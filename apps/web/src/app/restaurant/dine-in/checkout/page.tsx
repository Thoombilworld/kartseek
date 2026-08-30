'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Utensils, Users, Clock, CreditCard, Plus, Minus,
  Wallet, ChevronDown, Tag, Shield,
} from 'lucide-react';
import { restaurantApi } from '@/lib/api/restaurant';
import { AuthGate } from '@/components/shared/auth-gate';

const ITEMS = [
  { id: 1, name: 'Chicken Dum Biryani', price: 320, qty: 2, isVeg: false },
  { id: 2, name: 'Paneer Tikka', price: 250, qty: 1, isVeg: true },
  { id: 3, name: 'Butter Naan', price: 60, qty: 4, isVeg: true },
  { id: 4, name: 'Mango Lassi', price: 120, qty: 2, isVeg: true },
];

// Orders are placed against the signed-in account, so the page waits behind the
// sign-in prompt instead of redirecting away and losing the basket.
export default function DineInCheckoutPage() {
  return (
    <AuthGate reason="Please sign in to confirm your dine-in booking.">
      <DineInCheckoutPageContent />
    </AuthGate>
  );
}

function DineInCheckoutPageContent() {
  const [paymentMethod, setPaymentMethod] = useState('pay-at-restaurant');
  const [isPlacing, setIsPlacing] = useState(false);
  const subtotal = ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const serviceCharge = Math.round(subtotal * 0.05);
  const total = subtotal + tax + serviceCharge;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/restaurant" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-900">Dine-in Checkout</h1>
            <p className="text-sm text-slate-500">The Grand Biryani House</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Table & Guest Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Utensils className="w-4 h-4 text-emerald-500" /> Reservation Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Utensils className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Table</p>
              <p className="font-bold text-slate-900">T-03</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Guests</p>
              <p className="font-bold text-slate-900">4</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Time</p>
              <p className="font-bold text-slate-900">7:30 PM</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-900 mb-4">Your Order</h2>
          <div className="space-y-3">
            {ITEMS.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 border-2 rounded-sm ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                    <span className={`block w-2 h-2 rounded-full m-0.5 ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">₹{item.price} × {item.qty}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Tax (5%)</span><span>₹{tax}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Service Charge (5%)</span><span>₹{serviceCharge}</span></div>
            <div className="flex justify-between font-black text-base border-t border-slate-200 pt-2 mt-2"><span>Total</span><span>₹{total}</span></div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Payment</h2>
          <div className="space-y-2">
            {[
              { id: 'pay-at-restaurant', label: 'Pay at Restaurant', icon: '🏪', desc: 'Cash or card at the venue' },
              { id: 'upi', label: 'UPI / Google Pay', icon: '📱', desc: 'Pay now via UPI' },
              { id: 'wallet', label: 'KARTSEEK Wallet', icon: '💰', desc: 'Balance: ₹2,450' },
            ].map(pm => (
              <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  paymentMethod === pm.id
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                <span className="text-xl">{pm.icon}</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-slate-900">{pm.label}</p>
                  <p className="text-xs text-slate-500">{pm.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === pm.id ? 'border-emerald-500' : 'border-slate-300'
                }`}>
                  {paymentMethod === pm.id && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={async () => {
            setIsPlacing(true);
            try {
              const response = await restaurantApi.placeOrder('demo-restaurant', {
                type: 'dine-in',
                items: ITEMS,
                total,
                paymentMethod,
                tableNumber: 'T-03',
              });
              const orderId = (response as any)?.orderId || `DIN-${Date.now() % 100000}`;
              window.location.href = `/restaurant/dine-in/success?orderId=${orderId}&total=${total}`;
            } catch (_e) {
              window.location.href = `/restaurant/dine-in/success?orderId=DIN-${Date.now() % 100000}&total=${total}`;
            } finally {
              setIsPlacing(false);
            }
          }}
          disabled={isPlacing}
          className="block w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-4 rounded-xl text-center text-lg transition-colors shadow-lg shadow-emerald-200"
        >
          {isPlacing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Placing order…
            </span>
          ) : (
            <>Place Dine-in Order • ₹{total}</>
          )}
        </button>
      </div>
    </div>
  );
}
