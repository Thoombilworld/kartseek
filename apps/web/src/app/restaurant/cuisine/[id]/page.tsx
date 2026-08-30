'use client';
/* cSpell:words Dosas idlis sambhar chettinad shawarma Shawarma kabsa mezze tandoor */
import React from 'react';
import { Star, Clock, MapPin, ArrowLeft, Flame } from 'lucide-react';
import Link from 'next/link';
import { MOCK_RESTAURANTS } from '@/lib/demo-data/restaurant';

const CUISINE_META: Record<string, { name: string; emoji: string; description: string; color: string }> = {
  biryani: { name: 'Biryani', emoji: '🥘', description: 'Fragrant, slow-cooked rice dishes loaded with spices and protein.', color: 'from-amber-500 to-orange-500' },
  pizza: { name: 'Pizza', emoji: '🍕', description: 'Wood-fired, hand-tossed, or deep-dish — every style imaginable.', color: 'from-red-500 to-rose-600' },
  burger: { name: 'Burger', emoji: '🍔', description: 'Gourmet stacks, crispy chicken, and loaded veggie burgers.', color: 'from-yellow-500 to-amber-600' },
  chinese: { name: 'Chinese', emoji: '🍜', description: 'Dim sum, noodles, fried rice, and Sichuan specialties.', color: 'from-red-500 to-red-700' },
  'south-indian': { name: 'South Indian', emoji: '🍛', description: 'Dosas, idlis, sambhar, chettinad curries, and seafood.', color: 'from-green-500 to-emerald-600' },
  'north-indian': { name: 'North Indian', emoji: '🫔', description: 'Paneer tikka, butter chicken, naan, and hearty curries.', color: 'from-orange-500 to-orange-700' },
  healthy: { name: 'Healthy', emoji: '🥗', description: 'Salads, grain bowls, smoothies, and clean eating options.', color: 'from-emerald-500 to-green-600' },
  desserts: { name: 'Desserts', emoji: '🍦', description: 'Ice cream, cakes, waffles, and indulgent sweets.', color: 'from-pink-500 to-rose-500' },
  shawarma: { name: 'Shawarma', emoji: '🌯', description: 'Marinated meat wraps, garlic sauce, and fresh veggies.', color: 'from-yellow-500 to-orange-500' },
  seafood: { name: 'Seafood', emoji: '🦐', description: 'Fresh fish, prawns, crabs, and coastal specialties.', color: 'from-blue-500 to-cyan-500' },
  arabic: { name: 'Arabic', emoji: '🍖', description: 'Mandi, kabsa, mezze platters, and grilled meats.', color: 'from-amber-600 to-yellow-700' },
  grills: { name: 'Grills & BBQ', emoji: '🔥', description: 'Charcoal-grilled meats, BBQ ribs, and tandoor specialties.', color: 'from-orange-600 to-red-700' },
  'fast-food': { name: 'Fast Food', emoji: '🍟', description: 'Quick bites — fries, nuggets, rolls, and combo meals.', color: 'from-yellow-400 to-yellow-600' },
  juices: { name: 'Juices & Drinks', emoji: '🍹', description: 'Fresh juices, smoothies, milkshakes, and cold coffee.', color: 'from-orange-300 to-yellow-500' },
  mandi: { name: 'Mandi', emoji: '🍗', description: 'Slow-cooked rice and meat in the traditional Arabian style.', color: 'from-yellow-600 to-amber-700' },
};

export default function CuisineCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const meta = CUISINE_META[id] || { name: 'Cuisine', emoji: '🍽️', description: 'Explore restaurants in this category.', color: 'from-orange-500 to-red-500' };

  // Filter restaurants by cuisine (show all as mock data)
  const restaurants = MOCK_RESTAURANTS;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className={`bg-gradient-to-r ${meta.color} text-white`}>
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-8 md:py-12">
          <Link href="/restaurant/list" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Cuisines
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-6xl">{meta.emoji}</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">{meta.name}</h1>
              <p className="text-white/80 mt-1 text-sm md:text-base">{meta.description}</p>
              <p className="text-white/70 text-xs mt-2 font-medium">{restaurants.length * 8}+ restaurants available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick sub-filters */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-2.5 flex gap-2 overflow-x-auto hide-scrollbar">
          {['All', 'Rating 4.0+', 'Fast Delivery', 'Pure Veg', 'Has Offers', 'Open Now'].map(f => (
            <button key={f}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${f === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-400'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{restaurants.length * 8} Restaurants</h2>
          <select aria-label="Sort restaurants" className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 bg-white">
            <option>Relevance</option>
            <option>Rating</option>
            <option>Delivery Time</option>
            <option>Cost: Low to High</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {restaurants.map(r => (
            <Link key={r.id} href={`/restaurant/${r.id}`}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="aspect-video bg-slate-100 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80"
                  alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {r.offer && (
                  <div className="absolute bottom-2 left-2 bg-orange-600/95 text-white text-[10px] font-bold px-2 py-1 rounded-md">{r.offer}</div>
                )}
                {r.isPromoted && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">PROMOTED</div>
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
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-500" />{r.deliveryTime}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{r.distance}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
