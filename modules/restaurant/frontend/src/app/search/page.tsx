'use client';
import React, { useState } from 'react';
import { Search, SlidersHorizontal, Star, Clock, MapPin, Bike, ShoppingBag, CalendarDays, Utensils, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { MOCK_RESTAURANTS } from '@/lib/demo-data/restaurant';

const CUISINES = ['All','Biryani','Pizza','Burger','Chinese','South Indian','North Indian','Healthy','Desserts','Shawarma','Seafood','Arabic','Grills','Fast Food'];
const SORT_OPTIONS = ['Relevance','Rating: High to Low','Delivery Time','Cost: Low to High','Cost: High to Low'];

export default function RestaurantSearchPage() {
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [sortBy, setSortBy] = useState('Relevance');
  const [pureVeg, setPureVeg] = useState(false);
  const [fastDelivery, setFastDelivery] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [showSort, setShowSort] = useState(false);

  const filtered = MOCK_RESTAURANTS.filter(r => {
    const q = query.toLowerCase();
    const matchesQuery = !q || r.name.toLowerCase().includes(q) || r.cuisines.some(c => c.toLowerCase().includes(q));
    const matchesCuisine = selectedCuisine === 'All' || r.cuisines.some(c => c.toLowerCase().includes(selectedCuisine.toLowerCase()));
    const matchesRating = !topRated || r.rating >= 4.3;
    return matchesQuery && matchesCuisine && matchesRating;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search restaurants, cuisines, or dishes..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-100 rounded-xl border border-transparent focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:bg-white outline-none text-sm transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 pb-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {/* Sort */}
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sort <ChevronDown className="w-3 h-3" />
            </button>
            {showSort && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 min-w-[200px]">
                {SORT_OPTIONS.map(s => (
                  <button key={s} onClick={() => { setSortBy(s); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${sortBy === s ? 'text-orange-600 font-bold' : 'text-slate-700 font-medium'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Filters */}
          {[
            { label: '⚡ Fast Delivery', active: fastDelivery, toggle: () => setFastDelivery(!fastDelivery) },
            { label: '⭐ Rating 4.3+', active: topRated, toggle: () => setTopRated(!topRated) },
            { label: '🥗 Pure Veg', active: pureVeg, toggle: () => setPureVeg(!pureVeg) },
          ].map(f => (
            <button key={f.label} onClick={f.toggle}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${f.active ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400'}`}>
              {f.label}
            </button>
          ))}

          {/* Mode Filters */}
          {[
            { label: '🛵 Delivery', val: 'delivery', icon: null },
            { label: '🛍️ Takeaway', val: 'takeaway', icon: null },
            { label: '🍽️ Dine-in', val: 'dine-in', icon: null },
            { label: '📅 Book Table', val: 'table', icon: null },
          ].map(m => (
            <button key={m.val} onClick={() => setModeFilter(modeFilter === m.val ? null : m.val)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${modeFilter === m.val ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Cuisine Pills */}
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {CUISINES.map(c => (
            <button key={c} onClick={() => setSelectedCuisine(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${selectedCuisine === c ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-6">
        {/* Results count */}
        <p className="text-sm text-slate-500 font-medium mb-4">
          {filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} found
          {query && <span className="text-slate-700"> for "<strong>{query}</strong>"</span>}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No restaurants found</h2>
            <p className="text-slate-500 mb-6">Try a different search term or remove some filters.</p>
            <button onClick={() => { setQuery(''); setSelectedCuisine('All'); setPureVeg(false); setFastDelivery(false); setTopRated(false); setModeFilter(null); }}
              className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition-colors">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(r => (
              <Link key={r.id} href={`/${r.id}`} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="aspect-video bg-slate-100 overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80" alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {r.offer && (
                    <div className="absolute bottom-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-md">{r.offer}</div>
                  )}
                  {r.isPromoted && (
                    <div className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">PROMOTED</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-slate-900 leading-tight pr-2">{r.name}</h3>
                    <div className="flex items-center gap-0.5 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded shrink-0">
                      {r.rating} <Star className="w-2.5 h-2.5 fill-current" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-2">{r.cuisines.join(' • ')}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-orange-500" />{r.deliveryTime}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{r.distance}</span>
                  </div>
                  {/* Mode badges */}
                  <div className="flex gap-1 mt-2.5 flex-wrap">
                    <span className="flex items-center gap-0.5 text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-semibold"><Bike className="w-2.5 h-2.5" />Delivery</span>
                    <span className="flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold"><ShoppingBag className="w-2.5 h-2.5" />Takeaway</span>
                    <span className="flex items-center gap-0.5 text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold"><CalendarDays className="w-2.5 h-2.5" />Book Table</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
