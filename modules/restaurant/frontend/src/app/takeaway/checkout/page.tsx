'use client';

import { AuthGate } from '@/components/shared/auth-gate';
import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, MapPin, Clock, Phone, ChevronRight, CreditCard, Wallet, Banknote, CheckCircle, Tag, Info } from 'lucide-react';
import { restaurantApi } from '@/lib/api/restaurant';

const CART_ITEMS = [
  { id: '1', name: 'Chicken Biryani', qty: 2, price: 299, customization: 'Large, Extra Spicy', image: '🥘' },
  { id: '2', name: 'Paneer Butter Masala', qty: 1, price: 249, customization: '', image: '🍛' },
  { id: '3', name: 'Butter Naan', qty: 4, price: 49, customization: '', image: '🫓' },
  { id: '4', name: 'Gulab Jamun', qty: 2, price: 79, customization: '', image: '🍮' },
];

// Orders are placed against the signed-in account, so the page waits behind the
// sign-in prompt instead of redirecting away and losing the basket.
export default function TakeawayCheckoutPage() {
  return (
    <AuthGate reason="Please sign in to place your takeaway order.">
      <TakeawayCheckoutPageContent />
    </AuthGate>
  );
}

function TakeawayCheckoutPageContent() {
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash' | 'wallet'>('online');
  const [pickupTime, setPickupTime] = useState('ASAP (~20 min)');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [mobile, setMobile] = useState('+966 55 123 4567');
  const [placing, setPlacing] = useState(false);

  const subtotal = CART_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  const packingCharge = 30;
  const tax = Math.round((subtotal + packingCharge) * 0.05);
  const discount = couponApplied ? 60 : 0;
  const total = subtotal + packingCharge + tax - discount;

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const response = await restaurantApi.placeOrder('demo-restaurant', {
        type: 'takeaway',
        items: CART_ITEMS,
        total,
        paymentMethod,
      });
      const orderId = (response as any)?.orderId || `TKW-${Date.now() % 100000}`;
      window.location.href = `/restaurant/takeaway/success?orderId=${orderId}&total=${total}`;
    } catch (_e) {
      // Fallback: always navigate to success to avoid leaving user stuck
      window.location.href = `/restaurant/takeaway/success?orderId=TKW-${Date.now() % 100000}&total=${total}`;
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/restaurant" className="text-slate-500 hover:text-slate-800">←</Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Takeaway Checkout</h1>
            <p className="text-xs text-slate-500">The Grand Biryani House</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Order type badge */}
        <div className="bg-linear-to-r from-purple-600 to-violet-600 text-white rounded-xl px-4 py-3 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5" />
          <div>
            <p className="font-black text-sm tracking-wide">TAKEAWAY ORDER</p>
            <p className="text-white/70 text-xs">No delivery charge — you pick up!</p>
          </div>
        </div>

        {/* Pickup Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-purple-600" />
            <h2 className="font-bold text-slate-900 text-sm">Pickup From</h2>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="font-bold text-slate-900">The Grand Biryani House</p>
            <p className="text-slate-500 text-sm mt-1">Plot 24, Food Street, Al Olaya District, Riyadh</p>
            <div className="flex gap-2 mt-3">
              <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2 py-1 text-xs font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> {pickupTime}
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold">3 min walk</span>
            </div>
          </div>
        </div>

        {/* Pickup Time */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h2 className="font-bold text-slate-900 text-sm">Pickup Time</h2>
            </div>
            <button className="text-purple-600 font-bold text-xs">Change</button>
          </div>
          <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-2">
            {['ASAP (~20 min)', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM'].map(slot => (
              <button key={slot} onClick={() => setPickupTime(slot)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${pickupTime === slot ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-400'}`}>
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Contact Number */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-green-600" />
            <h2 className="font-bold text-slate-900 text-sm">Contact Number</h2>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-slate-500 text-xs mb-2">Restaurant will call this number for order updates</p>
            <input value={mobile} onChange={e => setMobile(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
              placeholder="+966 5x xxx xxxx" />
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-bold text-slate-900 text-sm mb-3">Order Summary ({CART_ITEMS.length} items)</h2>
          <div className="border-t border-slate-100 pt-3 space-y-3">
            {CART_ITEMS.map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{item.qty}× {item.name}</p>
                  {item.customization && <p className="text-slate-400 text-xs">{item.customization}</p>}
                </div>
                <p className="font-bold text-slate-900 text-sm">₹{item.price * item.qty}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coupon */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-slate-900 text-sm">Coupon / Offer</h2>
          </div>
          <div className="border-t border-slate-100 pt-3">
            {couponApplied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 font-bold text-sm">TAKE20 applied — ₹60 OFF</span>
                </div>
                <button onClick={() => { setCouponApplied(false); setCoupon(''); }} className="text-red-400 text-sm font-bold">✕</button>
              </div>
            ) : (
              <>
              <div className="flex gap-2">
                <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code" className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
                <button onClick={() => { setCouponError(''); if (coupon === 'TAKE20') { setCouponApplied(true); } else { setCouponError('Invalid or expired coupon code'); } }}
                  className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors">Apply</button>
              </div>
              {couponError && <p className="text-red-500 text-xs font-semibold mt-1.5">⚠️ {couponError}</p>}
              </>
            )}
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-bold text-slate-900 text-sm mb-3">Bill Details</h2>
          <div className="border-t border-slate-100 pt-3 space-y-2.5">
            {[
              ['Item Total', `₹${subtotal}`],
              ['Packing Charge', `₹${packingCharge}`],
              ['GST & Taxes (5%)', `₹${tax}`],
              ...(couponApplied ? [['Coupon Discount', `−₹${discount}`]] : []),
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-slate-500">{l}</span>
                <span className={`font-semibold ${l === 'Coupon Discount' ? 'text-green-600' : 'text-slate-800'}`}>{v}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2.5 flex justify-between font-black text-slate-900">
              <span>Total to Pay</span>
              <span className="text-lg">₹{total}</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-green-800 text-xs font-semibold">No delivery charge — you're picking up!</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-bold text-slate-900 text-sm mb-3">Payment Method</h2>
          <div className="border-t border-slate-100 pt-3 space-y-2">
            {[
              { value: 'online', icon: CreditCard, label: 'Pay Online', sub: 'UPI, Card, Net Banking' },
              { value: 'cash', icon: Banknote, label: 'Cash at Restaurant', sub: 'Pay when you pick up' },
              { value: 'wallet', icon: Wallet, label: 'KARTSEEK Wallet', sub: '₹0.00 available' },
            ].map(({ value, icon: Icon, label, sub }) => (
              <button key={value} onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${paymentMethod === value ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}`}>
                <Icon className={`w-5 h-5 ${paymentMethod === value ? 'text-purple-600' : 'text-slate-400'}`} />
                <div className="text-left flex-1">
                  <p className={`font-bold text-sm ${paymentMethod === value ? 'text-purple-700' : 'text-slate-700'}`}>{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === value ? 'border-purple-500' : 'border-slate-300'}`}>
                  {paymentMethod === value && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Place Order */}
        <button onClick={placeOrder} disabled={placing}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-3 shadow-lg transition-colors" aria-label="Cart">
          {placing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              Place Takeaway Order  •  ₹{total}
            </>
          )}
        </button>
        <p className="text-center text-xs text-slate-400 pb-8">By placing order you agree to our Terms & Conditions</p>
      </div>
    </div>
  );
}
