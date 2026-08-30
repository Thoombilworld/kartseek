'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Tag, Zap, Clock, Star, MapPin,
  ArrowRight, Flame, Gift, Percent, CalendarDays,
} from 'lucide-react';

const FLASH_DEALS = [
  { id: 'd-1', hotel: 'The Grand Palace Hotel', city: 'Dubai, UAE', discount: 40, original: 750, price: 450, currency: 'AED', rating: 4.8, reviews: 1240, expires: '6h left', image: '🏰', badge: '🔥 Flash' },
  { id: 'd-2', hotel: 'Seaside Family Resort', city: 'Mumbai, India', discount: 30, original: 12000, price: 8400, currency: '₹', rating: 4.7, reviews: 2100, expires: '12h left', image: '🏖️', badge: '⚡ Limited' },
  { id: 'd-3', hotel: 'Heritage Boutique Hotel', city: 'London, UK', discount: 25, original: 428, price: 321, currency: '£', rating: 4.9, reviews: 430, expires: '1d left', image: '🏛️', badge: '✨ Premium' },
];

const COUPON_DEALS = [
  { code: 'HOTEL20', desc: '20% off on all bookings above AED 500', discount: '20% OFF', minOrder: 'AED 500', maxDiscount: 'AED 200', valid: 'Jul 31, 2026', type: 'percentage' },
  { code: 'FIRSTHOTEL', desc: 'AED 150 off on your first hotel booking', discount: 'AED 150 OFF', minOrder: 'AED 300', maxDiscount: 'AED 150', valid: 'Dec 31, 2026', type: 'flat' },
  { code: 'WEEKEND25', desc: '25% off on weekend stays (Fri-Sun)', discount: '25% OFF', minOrder: 'No minimum', maxDiscount: 'AED 300', valid: 'Aug 31, 2026', type: 'percentage' },
  { code: 'SUMMER2026', desc: 'Flat AED 100 off on 3+ night stays', discount: 'AED 100 OFF', minOrder: '3+ nights', maxDiscount: 'AED 100', valid: 'Sep 30, 2026', type: 'flat' },
];

const CATEGORY_DEALS = [
  { title: 'Luxury at Less', emoji: '👑', desc: '5-star hotels at 3-star prices', count: 28, gradient: 'from-amber-500 to-yellow-600', href: '/hotel-booking/luxury-hotels?deals=true' },
  { title: 'Last Minute', emoji: '⏰', desc: 'Book tonight, save up to 50%', count: 15, gradient: 'from-red-500 to-rose-600', href: '/hotel-booking/search?lastMinute=true' },
  { title: 'Long Stay Discounts', emoji: '📅', desc: '7+ nights = extra savings', count: 42, gradient: 'from-blue-500 to-indigo-600', href: '/hotel-booking/search?longStay=true' },
  { title: 'Family Packages', emoji: '👨‍👩‍👧‍👦', desc: 'Kids eat & stay free deals', count: 19, gradient: 'from-pink-500 to-fuchsia-600', href: '/hotel-booking/family-hotels?deals=true' },
];

export default function DealsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-linear-to-br from-rose-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/hotel-booking" className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold">Hotel Deals & Offers</h1>
          </div>
          <h2 className="text-3xl font-black mb-2">Save Big on Your Stay 🎉</h2>
          <p className="text-white/70 text-sm">Exclusive discounts, flash sales, and promo codes</p>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Flash Deals */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-slate-900">Flash Deals</h2>
            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full animate-pulse">Limited Time</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FLASH_DEALS.map(deal => (
              <Link key={deal.id} href={`/hotel-booking/search?deal=${deal.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="relative h-32 bg-linear-to-br from-rose-50 to-orange-50 flex items-center justify-center">
                  <span className="text-5xl">{deal.image}</span>
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">{deal.badge}</span>
                  <div className="absolute top-3 right-3 bg-white/90 rounded-lg px-2 py-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-bold text-red-600">{deal.expires}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs font-black px-2 py-1 rounded-lg">
                    -{deal.discount}%
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-rose-600 transition-colors">{deal.hotel}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" /> {deal.city}
                    <span className="ml-2 flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-current" /> {deal.rating}</span>
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{deal.currency} {deal.price}</span>
                    <span className="text-sm text-slate-400 line-through">{deal.currency} {deal.original}</span>
                    <span className="text-xs text-slate-400">/ night</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Promo Codes */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-slate-900">Promo Codes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COUPON_DEALS.map(coupon => (
              <div key={coupon.code} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${coupon.type === 'percentage' ? 'bg-purple-50' : 'bg-emerald-50'}`}>
                  <span className={`text-xs font-black ${coupon.type === 'percentage' ? 'text-purple-600' : 'text-emerald-600'}`}>{coupon.discount}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{coupon.desc}</p>
                  <p className="text-[10px] text-slate-400">Min: {coupon.minOrder} · Max: {coupon.maxDiscount} · Valid until {coupon.valid}</p>
                </div>
                <button
                  onClick={() => handleCopy(coupon.code)}
                  className={`shrink-0 border-2 border-dashed rounded-xl px-3 py-2 text-xs font-mono font-bold transition-all ${
                    copiedCode === coupon.code
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  {copiedCode === coupon.code ? '✓ Copied!' : coupon.code}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Category Deals */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Browse Deal Categories</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORY_DEALS.map(cat => (
              <Link key={cat.title} href={cat.href}
                className={`bg-linear-to-br ${cat.gradient} rounded-2xl p-5 text-white group hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <span className="text-3xl mb-3 block">{cat.emoji}</span>
                <h3 className="font-bold text-sm mb-0.5">{cat.title}</h3>
                <p className="text-white/70 text-xs">{cat.desc}</p>
                <p className="text-white/50 text-[10px] mt-2">{cat.count} deals</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
