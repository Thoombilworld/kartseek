'use client';
import React, { useState } from 'react';
import { Star, Clock, MapPin, Flame, ChevronRight, Bike, ShoppingBag, CalendarDays, Utensils, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { MOCK_RESTAURANTS } from '@/lib/demo-data/restaurant';

const CUISINE_CATEGORIES = [
  { id: 'biryani', name: 'Biryani', emoji: '🥘', color: 'from-amber-400 to-orange-500' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', color: 'from-red-400 to-rose-500' },
  { id: 'burger', name: 'Burger', emoji: '🍔', color: 'from-yellow-400 to-amber-500' },
  { id: 'chinese', name: 'Chinese', emoji: '🍜', color: 'from-red-500 to-red-600' },
  { id: 'south-indian', name: 'South Indian', emoji: '🍛', color: 'from-green-400 to-emerald-500' },
  { id: 'north-indian', name: 'North Indian', emoji: '🫔', color: 'from-orange-400 to-orange-600' },
  { id: 'healthy', name: 'Healthy', emoji: '🥗', color: 'from-emerald-400 to-green-600' },
  { id: 'desserts', name: 'Desserts', emoji: '🍦', color: 'from-pink-400 to-rose-500' },
  { id: 'shawarma', name: 'Shawarma', emoji: '🌯', color: 'from-yellow-500 to-orange-500' },
  { id: 'seafood', name: 'Seafood', emoji: '🦐', color: 'from-blue-400 to-cyan-500' },
  { id: 'arabic', name: 'Arabic', emoji: '🍖', color: 'from-amber-600 to-yellow-600' },
  { id: 'grills', name: 'Grills & BBQ', emoji: '🔥', color: 'from-orange-600 to-red-600' },
  { id: 'fast-food', name: 'Fast Food', emoji: '🍟', color: 'from-yellow-400 to-yellow-500' },
  { id: 'juices', name: 'Juices', emoji: '🍹', color: 'from-orange-300 to-yellow-400' },
  { id: 'bakery', name: 'Bakery', emoji: '🥐', color: 'from-amber-300 to-amber-500' },
  { id: 'mandi', name: 'Mandi', emoji: '🍗', color: 'from-yellow-600 to-amber-700' },
];

const SORT_OPTIONS = ['Relevance', 'Rating', 'Delivery Time', 'Cost: Low to High'];

export default function RestaurantListPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sort, setSort] = useState('Relevance');
  const [pureVeg, setPureVeg] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [fastDelivery, setFastDelivery] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);

  const filtered = MOCK_RESTAURANTS.filter(r => {
    if (topRated && r.rating < 4.3) return false;
    if (hasOffers && !r.offer) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-orange-600 to-red-500 text-white px-3 xs:px-4 py-8 md:py-12">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-orange-200 text-sm font-medium mb-1">📍 Delivering to: Tech Park, Bangalore</p>
              <h1 className="text-3xl md:text-4xl font-black leading-tight">All Restaurants</h1>
              <p className="text-orange-100 mt-1">Explore {MOCK_RESTAURANTS.length * 40}+ restaurants near you</p>
            </div>
            <Link href="/restaurant/search" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors shadow-md">
              <span>Search Restaurants</span> <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Cuisine Categories Grid */}
      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Browse by Cuisine</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 gap-3">
          {CUISINE_CATEGORIES.map(c => (
            <Link key={c.id} href={`/restaurant/cuisine/${c.id}`}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl bg-linear-to-br ${c.color} text-white shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer`}>
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[10px] font-bold text-center leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Filter + Sort Bar */}
      <div className="sticky top-16 z-30 bg-white border-y border-slate-200 shadow-sm">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-2.5 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full border-none outline-none shrink-0">
            {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {[
            { label: '⚡ Fast Delivery', active: fastDelivery, toggle: () => setFastDelivery(!fastDelivery) },
            { label: '⭐ Rating 4.3+', active: topRated, toggle: () => setTopRated(!topRated) },
            { label: '🎫 Offers', active: hasOffers, toggle: () => setHasOffers(!hasOffers) },
            { label: '🥗 Pure Veg', active: pureVeg, toggle: () => setPureVeg(!pureVeg) },
            { label: '🛵 Delivery', active: activeFilter === 'delivery', toggle: () => setActiveFilter(activeFilter === 'delivery' ? null : 'delivery') },
            { label: '🛍️ Takeaway', active: activeFilter === 'takeaway', toggle: () => setActiveFilter(activeFilter === 'takeaway' ? null : 'takeaway') },
            { label: '🍽️ Dine-in', active: activeFilter === 'dine-in', toggle: () => setActiveFilter(activeFilter === 'dine-in' ? null : 'dine-in') },
            { label: '📅 Book Table', active: activeFilter === 'table', toggle: () => setActiveFilter(activeFilter === 'table' ? null : 'table') },
          ].map(f => (
            <button key={f.label} onClick={f.toggle}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${f.active ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-6 space-y-8">
        {/* All Restaurants Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {filtered.length} Restaurants
              {topRated && <span className="text-orange-500 text-sm font-semibold ml-2">· Top Rated</span>}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(r => (
              <Link key={r.id} href={`/restaurant/${r.id}`}
                className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="aspect-video bg-slate-100 overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80"
                    alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {r.offer && (
                    <div className="absolute bottom-2 left-2 bg-orange-600/95 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">{r.offer}</div>
                  )}
                  {r.isPromoted && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">PROMOTED</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight pr-2">{r.name}</h3>
                    <div className="flex items-center gap-0.5 bg-green-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0">
                      {r.rating} <Star className="w-2.5 h-2.5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-2">{r.cuisines.join(' • ')}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-medium mb-2.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-500" />{r.deliveryTime}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{r.distance}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-semibold">🛵 Delivery</span>
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">🛍️ Takeaway</span>
                    <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold">📅 Book Table</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Dine-in Available Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-500" /> Best for Dine-in
            </h2>
            <Link href="/restaurant/search" className="text-orange-600 text-sm font-bold hover:text-orange-700">See All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 3).map(r => (
              <Link key={r.id + '-dine'} href={`/restaurant/${r.id}`}
                className="flex gap-3 bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-100 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80" alt={r.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm truncate pr-2">{r.name}</h3>
                    <div className="flex items-center gap-0.5 bg-green-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0">
                      {r.rating} <Star className="w-2.5 h-2.5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{r.cuisines.join(', ')}</p>
                  <p className="text-xs text-slate-600 mt-1">{r.distance} • ₹400 for two</p>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold mt-1.5 inline-block">🍽️ Dine-in Available</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
