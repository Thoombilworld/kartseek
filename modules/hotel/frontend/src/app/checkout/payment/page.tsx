'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CreditCard, Wallet, Building2, Smartphone,
  Shield, Check, ArrowRight, Lock, Star, ChevronRight,
} from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, Amex', icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
  { id: 'wallet', name: 'KARTSEEK Wallet', desc: 'Balance: AED 4,250', icon: <Wallet className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
  { id: 'apple', name: 'Apple Pay', desc: 'Pay with Face ID', icon: <Smartphone className="w-5 h-5" />, color: 'bg-slate-50 text-slate-900' },
  { id: 'google', name: 'Google Pay', desc: 'Fast and secure', icon: <Smartphone className="w-5 h-5" />, color: 'bg-blue-50 text-blue-500' },
  { id: 'bank', name: 'Bank Transfer', desc: 'Direct debit', icon: <Building2 className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
];

export default function CheckoutPaymentPage() {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      window.location.href = '/hotel-booking/checkout/processing';
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/hotel-booking/checkout/offers" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Payment</h1>
          </div>
          <div className="flex items-center gap-2">
            {['Summary', 'Guest Details', 'Offers', 'Payment'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 text-rose-600`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}>
                    {idx < 3 ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className="text-xs font-semibold hidden sm:inline text-rose-600">{step}</span>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 ${idx < 3 ? 'bg-emerald-300' : 'bg-rose-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Payment Methods */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-900 mb-4">Select Payment Method</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedMethod === method.id
                        ? 'border-rose-500 bg-rose-50/50'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method.color}`}>
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{method.name}</p>
                      <p className="text-xs text-slate-400">{method.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === method.id ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
                    }`}>
                      {selectedMethod === method.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Details */}
            {selectedMethod === 'card' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" /> Card Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="card-number">Card Number</label>
                    <input id="card-number"
                      type="text" value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      maxLength={19}
                      placeholder="1234 5678 9012 3456"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="name-on-card">Name on Card</label>
                    <input id="name-on-card"
                      type="text" value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      placeholder="AHMED AL MAKTOUM"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="expiry-date">Expiry Date</label>
                      <input id="expiry-date"
                        type="text" value={expiry}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '');
                          setExpiry(v.length > 2 ? `${v.slice(0,2)}/${v.slice(2,4)}` : v);
                        }}
                        maxLength={5}
                        placeholder="MM/YY"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="cvv">CVV</label>
                      <input id="cvv"
                        type="password" value={cvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        placeholder="•••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                    <span className="text-xs text-slate-600">Save this card for future bookings</span>
                  </label>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Secure Payment</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Your payment is secured with 256-bit SSL encryption and processed through PCI DSS Level 1 certified payment gateway. KARTSEEK never stores your full card details.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-4">
              <h3 className="font-bold text-slate-900 mb-3">Final Summary</h3>
              <div className="text-sm space-y-2 mb-4">
                <p className="font-medium text-slate-900">The Grand Palace Hotel</p>
                <p className="text-slate-500">Jul 1–3, 2026 · 2 nights</p>
                <p className="text-slate-500">Deluxe King Room · 2 Guests</p>
              </div>
              <div className="text-sm space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between"><span className="text-slate-500">Room</span><span>AED 1,040</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Taxes</span><span>AED 156</span></div>
                <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-AED 150</span></div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="font-bold text-slate-900">Pay Now</span>
                  <span className="text-xl font-black text-slate-900">AED 1,046</span>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={processing}
                className={`w-full text-white text-center font-bold py-4 rounded-xl mt-4 transition-colors flex items-center justify-center gap-2 ${
                  processing ? 'bg-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200'
                }`}
               aria-label="Action">{processing ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pay AED 1,046</>
                )}</button>

              <p className="text-center text-[10px] text-slate-400 mt-2">
                By completing this payment, you agree to our booking terms
              </p>

              <div className="mt-4 flex items-center justify-center gap-3 opacity-40">
                <span className="text-xs font-bold">VISA</span>
                <span className="text-xs font-bold">MC</span>
                <span className="text-xs font-bold">AMEX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
