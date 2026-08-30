'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Tag, Clock, BadgePercent, Star, Bike,
  Copy, CheckCircle2, Search, Filter, Sparkles,
} from 'lucide-react';

const OFFERS = [
  { id: 1, title: '50% OFF up to ₹150', code: 'FIRST50', desc: 'Valid on first order only', restaurant: 'All Restaurants', minOrder: 299, validUntil: '31 Jul 2026', type: 'percentage', gradient: 'from-orange-500 to-red-500', emoji: '🔥' },
  { id: 2, title: 'FREE Delivery', code: 'FREEDEL', desc: 'No delivery fee on orders ₹500+', restaurant: 'All Restaurants', minOrder: 500, validUntil: '15 Aug 2026', type: 'free_delivery', gradient: 'from-blue-500 to-indigo-500', emoji: '🛵' },
  { id: 3, title: 'Buy 1 Get 1 Free', code: 'PIZZA2FOR1', desc: 'On all large pizzas', restaurant: 'Pizza Paradise', minOrder: 399, validUntil: '10 Jul 2026', type: 'bogo', gradient: 'from-rose-500 to-pink-500', emoji: '🍕' },
  { id: 4, title: 'Flat ₹100 OFF', code: 'WKND100', desc: 'Valid on weekends only', restaurant: 'All Restaurants', minOrder: 400, validUntil: '15 Jul 2026', type: 'flat', gradient: 'from-purple-500 to-violet-500', emoji: '💜' },
  { id: 5, title: '25% OFF Biryani', code: 'BIRYANI25', desc: 'On all biryani orders', restaurant: 'The Grand Biryani House', minOrder: 250, validUntil: '20 Jul 2026', type: 'percentage', gradient: 'from-amber-500 to-orange-500', emoji: '🍚' },
  { id: 6, title: 'Healthy Meal Deal', code: 'HEALTH25', desc: '25% off vegan & healthy', restaurant: 'Green Bowl', minOrder: 300, validUntil: '31 Jul 2026', type: 'percentage', gradient: 'from-emerald-500 to-teal-500', emoji: '🥗' },
  { id: 7, title: '30% OFF Sushi', code: 'SUSHI30', desc: 'On sushi platters', restaurant: 'Sushi Kingdom', minOrder: 500, validUntil: '05 Jul 2026', type: 'percentage', gradient: 'from-cyan-500 to-blue-500', emoji: '🍣' },
  { id: 8, title: 'Late Night 15% OFF', code: 'NIGHT15', desc: 'After 10 PM orders', restaurant: 'All Restaurants', minOrder: 200, validUntil: '31 Aug 2026', type: 'percentage', gradient: 'from-indigo-600 to-blue-700', emoji: '🌙' },
];

export default function RestaurantOffersPage() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const copy = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = OFFERS.filter(o => {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !o.restaurant.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'restaurant-specific' && o.restaurant === 'All Restaurants') return false;
    if (filter === 'free-delivery' && o.type !== 'free_delivery') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Restaurant Deals</h1>
            <p className="text-sm text-slate-500">{OFFERS.length} offers available</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search offers or restaurants..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'restaurant-specific', label: 'Restaurant Specials' },
              { key: 'free-delivery', label: 'Free Delivery' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  filter === f.key ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(offer => (
            <div key={offer.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group">
              <div className={`bg-gradient-to-r ${offer.gradient} p-5 text-white relative overflow-hidden`}>
                <div className="absolute -right-4 -top-4 text-6xl opacity-20">{offer.emoji}</div>
                <p className="text-4xl mb-2">{offer.emoji}</p>
                <h3 className="text-xl font-black">{offer.title}</h3>
                <p className="text-white/80 text-sm mt-1">{offer.desc}</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono font-bold text-sm text-slate-800">{offer.code}</span>
                  </div>
                  <button onClick={() => copy(offer.code, offer.id)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors">
                    {copiedId === offer.id ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Min order: ₹{offer.minOrder}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {offer.validUntil}</span>
                </div>
                <p className="text-xs font-bold text-slate-600">{offer.restaurant}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
