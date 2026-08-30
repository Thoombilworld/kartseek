'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  ArrowLeft, Search, MapPin, TrendingUp, Clock, Star,
  Globe, ArrowRight, Plane, Building2, Sun, Snowflake,
} from 'lucide-react';

const TRENDING = [
  { city: 'Dubai', country: 'UAE', code: 'AE', flag: '🇦🇪', hotels: 1240, avg: 'AED 380', trend: '+12%', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80' },
  { city: 'Mumbai', country: 'India', code: 'IN', flag: '🇮🇳', hotels: 2100, avg: '₹4,500', trend: '+8%', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&q=80' },
  { city: 'Doha', country: 'Qatar', code: 'QA', flag: '🇶🇦', hotels: 580, avg: 'QAR 420', trend: '+15%', image: 'https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=400&q=80' },
  { city: 'London', country: 'UK', code: 'GB', flag: '🇬🇧', hotels: 3400, avg: '£180', trend: '+5%', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80' },
  { city: 'Riyadh', country: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', hotels: 890, avg: 'SAR 350', trend: '+22%', image: 'https://images.unsplash.com/photo-1586724237569-9c5e0e9ef09e?w=400&q=80' },
  { city: 'Mumbai', country: 'India', code: 'IN', flag: '🇮🇳', hotels: 420, avg: '8,500', trend: '+18%', image: 'https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=400&q=80' },
];

const POPULAR_AREAS = [
  { name: 'Downtown Dubai', city: 'Dubai', hotels: 185, emoji: '🏙️' },
  { name: 'Palm Jumeirah', city: 'Dubai', hotels: 42, emoji: '🌴' },
  { name: 'Marina', city: 'Dubai', hotels: 120, emoji: '⛵' },
  { name: 'Bandra', city: 'Mumbai', hotels: 95, emoji: '🌊' },
  { name: 'Colaba', city: 'Mumbai', hotels: 68, emoji: '🏛️' },
  { name: 'The Pearl', city: 'Doha', hotels: 35, emoji: '💎' },
  { name: 'West Bay', city: 'Doha', hotels: 48, emoji: '🏢' },
  { name: 'Westminster', city: 'London', hotels: 210, emoji: '🇬🇧' },
];

const RECENT_SEARCHES = [
  { query: 'Dubai, UAE', dates: 'Jul 1–3', guests: 2 },
  { query: 'Mumbai, India', dates: 'Aug 15–18', guests: 3 },
  { query: 'Doha, Qatar', dates: 'Jul 10–12', guests: 1 },
];

const COLLECTIONS = [
  { name: 'Luxury Hotels', emoji: '👑', desc: 'Five-star luxury', count: 245, href: '/hotel-booking/luxury-hotels', gradient: 'from-amber-500 to-orange-600' },
  { name: 'Budget Stays', emoji: '💰', desc: 'Best value picks', count: 890, href: '/hotel-booking/budget-hotels', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'Business Hotels', emoji: '💼', desc: 'Work-ready rooms', count: 320, href: '/hotel-booking/business-hotels', gradient: 'from-blue-500 to-indigo-600' },
  { name: 'Family Resorts', emoji: '👨‍👩‍👧‍👦', desc: 'Kid-friendly stays', count: 180, href: '/hotel-booking/family-hotels', gradient: 'from-pink-500 to-rose-600' },
  { name: 'Resorts & Villas', emoji: '🏖️', desc: 'Escape & unwind', count: 150, href: '/hotel-booking/resorts', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'Serviced Apartments', emoji: '🏠', desc: 'Home away from home', count: 210, href: '/hotel-booking/serviced-apartments', gradient: 'from-violet-500 to-purple-600' },
];

export default function DestinationsPage() {
  const [query, setQuery] = useState('');

  const filteredCities = query
    ? TRENDING.filter(c => c.city.toLowerCase().includes(query.toLowerCase()) || c.country.toLowerCase().includes(query.toLowerCase()))
    : TRENDING;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-linear-to-br from-rose-600 via-rose-700 to-pink-700 text-white">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/hotel-booking" className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold">Explore Destinations</h1>
          </div>
          <div className="relative">
            <Search className="w-5 h-5 text-white/50 absolute left-4 top-4" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search cities, areas, or landmarks..."
              className="w-full bg-white/15 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 pl-12 pr-4 py-4 rounded-2xl text-base outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/40 transition-all"
            />
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Recent Searches */}
        {RECENT_SEARCHES.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-slate-400" /> Recent Searches
            </h2>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
              {RECENT_SEARCHES.map(s => (
                <Link
                  key={s.query}
                  href={`/hotel-booking/search?q=${encodeURIComponent(s.query)}`}
                  className="shrink-0 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-rose-300 hover:shadow-md transition-all"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.query}</p>
                    <p className="text-[11px] text-slate-400">{s.dates} · {s.guests} guests</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Trending Destinations */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-rose-500" /> Trending Destinations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCities.map(city => (
              <Link
                key={city.city}
                href={`/hotel-booking/search?city=${encodeURIComponent(city.city)}`}
                className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-36 overflow-hidden">
                  <img src={city.image} alt={city.city} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <div className="flex items-center gap-1.5">
                      <CountryFlag code={city.code} size="lg" />
                      <span className="text-white font-bold text-lg">{city.city}</span>
                    </div>
                    <span className="text-white/70 text-xs">{city.country}</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {city.trend}
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{city.hotels.toLocaleString()} hotels</p>
                    <p className="text-xs text-slate-400">from {city.avg}/night</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Areas */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-500" /> Popular Areas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {POPULAR_AREAS.map(area => (
              <Link
                key={area.name}
                href={`/hotel-booking/search?area=${encodeURIComponent(area.name)}`}
                className="bg-white rounded-xl border border-slate-100 p-4 hover:border-rose-200 hover:shadow-md transition-all group"
              >
                <span className="text-2xl mb-2 block">{area.emoji}</span>
                <p className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{area.name}</p>
                <p className="text-xs text-slate-400">{area.city} · {area.hotels} hotels</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Collections */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-500" /> Browse by Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COLLECTIONS.map(col => (
              <Link
                key={col.name}
                href={col.href}
                className={`bg-linear-to-br ${col.gradient} rounded-2xl p-5 text-white group hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <span className="text-3xl mb-3 block">{col.emoji}</span>
                <h3 className="font-bold text-base">{col.name}</h3>
                <p className="text-white/70 text-xs">{col.desc}</p>
                <p className="text-white/50 text-[10px] mt-2">{col.count} properties</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
