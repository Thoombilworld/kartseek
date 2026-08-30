/* cSpell:words Zayed Covent Qurum checkin */
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  CreditCard, Smartphone, Shield, Lock, CalendarCheck, MapPin,
  Users, BedDouble, Clock, ChevronDown, ChevronUp, Check, ArrowRight,
  Tag, AlertCircle, Calendar, Pencil,
} from 'lucide-react';

/* ── Mock hotel/room data (mirrors hotel detail) ───────────────────────────── */
const HOTELS: Record<string, { name: string; address: string; city: string; country: string; emoji: string; gradient: string }> = {
  'htl-001': { name: 'The Grand Palace Hotel', address: 'Sheikh Zayed Road, Downtown Dubai', city: 'Dubai', country: 'UAE', emoji: '🏰', gradient: 'from-rose-100 to-amber-50' },
  'htl-002': { name: 'KARTSEEK Business Suites', address: 'West Bay, Corniche Road', city: 'Doha', country: 'Qatar', emoji: '🏢', gradient: 'from-blue-100 to-indigo-50' },
  'htl-003': { name: 'Seaside Family Resort', address: 'Marine Drive, South Mumbai', city: 'Mumbai', country: 'India', emoji: '🏖️', gradient: 'from-cyan-100 to-teal-50' },
  'htl-004': { name: 'Heritage Boutique Hotel', address: 'Covent Garden, Westminster', city: 'London', country: 'UK', emoji: '🏛️', gradient: 'from-purple-100 to-violet-50' },
  'htl-005': { name: 'Budget Inn Express', address: 'King Fahd Road, Al Olaya', city: 'Riyadh', country: 'Saudi Arabia', emoji: '🏨', gradient: 'from-emerald-100 to-green-50' },
  'htl-006': { name: 'Royal Palm Resort', address: 'Al Qurum Beach Road', city: 'Muscat', country: 'Oman', emoji: '🌴', gradient: 'from-amber-100 to-orange-50' },
};

const ROOMS: Record<string, { name: string; bedType: string; maxGuests: number; area: string; price: number; currency: string; taxesAndFees: number }> = {
  'rm-001': { name: 'Deluxe King Room', bedType: 'King', maxGuests: 2, area: '35 sqm', price: 450, currency: 'AED', taxesAndFees: 67 },
  'rm-002': { name: 'Premium Twin Room', bedType: 'Twin', maxGuests: 2, area: '40 sqm', price: 520, currency: 'AED', taxesAndFees: 78 },
  'rm-003': { name: 'Executive Suite', bedType: 'King', maxGuests: 3, area: '65 sqm', price: 850, currency: 'AED', taxesAndFees: 127 },
  'rm-004': { name: 'Family Suite', bedType: 'King + Twin', maxGuests: 4, area: '80 sqm', price: 980, currency: 'AED', taxesAndFees: 147 },
};

type PaymentMethod = 'card' | 'apple' | 'google';

export default function CheckoutPage() {
  const { hotelId } = useParams();
  const params = useSearchParams();
  const roomId = params.get('room') || 'rm-001';

  const hotel = HOTELS[hotelId as string] || HOTELS['htl-001'];
  const room = ROOMS[roomId] || ROOMS['rm-001'];

  /* ── Date management ────────────────────────────────────────────────────── */
  const paramCheckIn = params.get('checkIn') || '';
  const paramCheckOut = params.get('checkOut') || '';
  const paramGuests = Number(params.get('guests')) || 2;

  const [checkIn, setCheckIn] = useState(paramCheckIn);
  const [checkOut, setCheckOut] = useState(paramCheckOut);
  const [guestCount, setGuestCount] = useState(paramGuests);
  const [editingDates, setEditingDates] = useState(!paramCheckIn || !paramCheckOut);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 2;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const roomTotal = room.price * nights;
  const taxTotal = room.taxesAndFees * nights;

  /* ── Form state ──────────────────────────────────────────────────────────── */
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const discount = promoApplied ? Math.round(roomTotal * 0.1) : 0;
  const grandTotal = roomTotal + taxTotal - discount;

  /* ── Validation ──────────────────────────────────────────────────────────── */
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (paymentMethod === 'card') {
      if (!cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) e.cardNumber = 'Enter a valid 16-digit card number';
      if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) e.cardExpiry = 'Enter expiry as MM/YY';
      if (!cardCvv.match(/^\d{3,4}$/)) e.cardCvv = 'Enter a valid CVV';
      if (!cardName.trim()) e.cardName = 'Cardholder name is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      const confirmId = `HBK-${Date.now().toString(36).toUpperCase()}`;
      window.location.href = `/hotel-booking/booking/${confirmId}`;
    }, 2000);
  }

  function applyPromo() {
    if (promoCode.toUpperCase() === 'SUMMER20' || promoCode.toUpperCase() === 'KARTSEEK10') {
      setPromoApplied(true);
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const inputCls = (field: string) =>
    `w-full px-4 py-3 rounded-xl bg-slate-50 border text-sm outline-none transition-all ${
      errors[field] ? 'border-red-300 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:ring-2 focus:ring-rose-200 focus:border-rose-400'
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Complete Your Booking</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left Column: Forms ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hotel Summary */}
            <div className={`bg-gradient-to-br ${hotel.gradient} rounded-2xl p-5 flex items-center gap-4`}>
              <span className="text-5xl">{hotel.emoji}</span>
              <div>
                <h2 className="font-bold text-lg text-slate-900">{hotel.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{hotel.address}, {hotel.city}, {hotel.country}</p>
                <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{room.name} · {room.bedType} · {room.area}</p>
              </div>
            </div>

            {/* Stay Dates & Guests */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-rose-500" /> Stay Details</h3>
                {!editingDates && (
                  <button type="button" onClick={() => setEditingDates(true)} className="text-xs text-rose-600 font-bold flex items-center gap-1 hover:underline">
                    <Pencil className="w-3 h-3" /> Change Dates
                  </button>
                )}
              </div>

              {editingDates ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="co-checkin" className="block text-xs font-bold text-slate-500 mb-1.5">Check-in <span className="text-rose-500">*</span></label>
                    <input id="co-checkin" type="date" min={todayStr} value={checkIn}
                      onChange={e => {
                        setCheckIn(e.target.value);
                        if (checkOut && e.target.value >= checkOut) {
                          const next = new Date(new Date(e.target.value).getTime() + 86400000);
                          setCheckOut(next.toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-checkout" className="block text-xs font-bold text-slate-500 mb-1.5">Check-out <span className="text-rose-500">*</span></label>
                    <input id="co-checkout" type="date" min={checkIn || todayStr} value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-guests" className="block text-xs font-bold text-slate-500 mb-1.5">Guests</label>
                    <select id="co-guests" value={guestCount} onChange={e => setGuestCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all appearance-none"
                    >
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <button type="button" onClick={() => { if (checkIn && checkOut) setEditingDates(false); }}
                      disabled={!checkIn || !checkOut}
                      className="bg-rose-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-rose-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Confirm Dates
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Check-in</p>
                    <p className="font-bold text-slate-900 text-sm">{formatDate(checkIn)}</p>
                    <p className="text-[10px] text-slate-400">After 14:00</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Check-out</p>
                    <p className="font-bold text-slate-900 text-sm">{formatDate(checkOut)}</p>
                    <p className="text-[10px] text-slate-400">Before 12:00</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Guests</p>
                    <p className="font-bold text-slate-900 text-sm">{guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}</p>
                    <p className="text-[10px] text-slate-400">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Guest Details */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-rose-500" /> Guest Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-bold text-slate-500 mb-1.5">First Name <span className="text-rose-500">*</span></label>
                  <input id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls('firstName')} placeholder="John" />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-xs font-bold text-slate-500 mb-1.5">Last Name <span className="text-rose-500">*</span></label>
                  <input id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls('lastName')} placeholder="Doe" />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.lastName}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-500 mb-1.5">Email <span className="text-rose-500">*</span></label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls('email')} placeholder="john@example.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-slate-500 mb-1.5">Phone <span className="text-rose-500">*</span></label>
                  <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls('phone')} placeholder="+971 50 123 4567" />
                  {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="specialRequests" className="block text-xs font-bold text-slate-500 mb-1.5">Special Requests <span className="text-slate-400">(optional)</span></label>
                <textarea id="specialRequests" rows={3} value={specialRequests} onChange={e => setSpecialRequests(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all resize-none"
                  placeholder="Late check-in, extra pillows, dietary needs..."
                />
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-rose-500" /> Payment Method</h3>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {([
                  { id: 'card' as PaymentMethod, label: 'Credit Card', icon: <CreditCard className="w-5 h-5" /> },
                  { id: 'apple' as PaymentMethod, label: 'Apple Pay', icon: <Smartphone className="w-5 h-5" /> },
                  { id: 'google' as PaymentMethod, label: 'Google Pay', icon: <Smartphone className="w-5 h-5" /> },
                ]).map(m => (
                  <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      paymentMethod === m.id ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cardName" className="block text-xs font-bold text-slate-500 mb-1.5">Cardholder Name <span className="text-rose-500">*</span></label>
                    <input id="cardName" type="text" value={cardName} onChange={e => setCardName(e.target.value)} className={inputCls('cardName')} placeholder="JOHN DOE" />
                    {errors.cardName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardName}</p>}
                  </div>
                  <div>
                    <label htmlFor="cardNumber" className="block text-xs font-bold text-slate-500 mb-1.5">Card Number <span className="text-rose-500">*</span></label>
                    <input id="cardNumber" type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))} className={inputCls('cardNumber')} placeholder="4242 4242 4242 4242" maxLength={16} inputMode="numeric" />
                    {errors.cardNumber && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardNumber}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cardExpiry" className="block text-xs font-bold text-slate-500 mb-1.5">Expiry <span className="text-rose-500">*</span></label>
                      <input id="cardExpiry" type="text" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className={inputCls('cardExpiry')} placeholder="MM/YY" maxLength={5} />
                      {errors.cardExpiry && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardExpiry}</p>}
                    </div>
                    <div>
                      <label htmlFor="cardCvv" className="block text-xs font-bold text-slate-500 mb-1.5">CVV <span className="text-rose-500">*</span></label>
                      <input id="cardCvv" type="password" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} className={inputCls('cardCvv')} placeholder="•••" maxLength={4} inputMode="numeric" />
                      {errors.cardCvv && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardCvv}</p>}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod !== 'card' && (
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <Smartphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">You will be redirected to {paymentMethod === 'apple' ? 'Apple Pay' : 'Google Pay'} to complete payment.</p>
                </div>
              )}
            </section>

            {/* Policies */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button type="button" onClick={() => setShowPolicies(!showPolicies)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-bold text-slate-900 flex items-center gap-2"><Shield className="w-5 h-5 text-rose-500" /> Cancellation Policy</span>
                {showPolicies ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {showPolicies && (
                <div className="px-5 pb-5 space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><p>Free cancellation up to 24 hours before check-in</p></div>
                  <div className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><p>After that, first night will be charged</p></div>
                  <div className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><p>No-show: full booking amount charged</p></div>
                </div>
              )}
            </section>
          </div>

          {/* ── Right Column: Order Summary ────────────────────────────── */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Booking Summary</h3>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Check-in</p>
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-1"><CalendarCheck className="w-3 h-3 text-rose-500" />{formatDate(checkIn)}</p>
                  <p className="text-[10px] text-slate-400">After 14:00</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Check-out</p>
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-1"><CalendarCheck className="w-3 h-3 text-rose-500" />{formatDate(checkOut)}</p>
                  <p className="text-[10px] text-slate-400">Before 12:00</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <Clock className="w-4 h-4 text-slate-400" /><span className="font-medium">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                <span className="text-slate-300">·</span>
                <Users className="w-4 h-4 text-slate-400" /><span className="font-medium">{guestCount} {guestCount === 1 ? 'guest' : 'guests'}</span>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Room ({nights} nights × {room.currency} {room.price})</span><span className="font-medium text-slate-900">{room.currency} {roomTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Taxes &amp; Fees</span><span className="font-medium text-slate-900">{room.currency} {taxTotal.toLocaleString()}</span></div>
                {promoApplied && (
                  <div className="flex justify-between text-sm"><span className="text-emerald-600 font-medium">Promo Discount</span><span className="font-medium text-emerald-600">-{room.currency} {discount.toLocaleString()}</span></div>
                )}
              </div>

              {/* Promo Code */}
              <div className="mt-4 mb-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 transition-all"
                      placeholder="Promo code" aria-label="Promo code" disabled={promoApplied}
                    />
                  </div>
                  <button type="button" onClick={applyPromo} disabled={promoApplied || !promoCode}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {promoApplied ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
                {promoApplied && <p className="text-xs text-emerald-600 mt-1.5 font-medium">🎉 10% discount applied!</p>}
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900">Total</span>
                <span className="text-2xl font-black text-rose-600">{room.currency} {grandTotal.toLocaleString()}</span>
              </div>

              <button type="submit" disabled={processing}
                className="w-full mt-5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg text-sm"
               aria-label="Lock">
                {processing ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing Payment...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Confirm &amp; Pay {room.currency} {grandTotal.toLocaleString()}</>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-slate-400">
                <Lock className="w-3 h-3" /> Secured with 256-bit SSL encryption
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
