'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, MapPin, Star, Filter, List,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Locate,
  Wifi, Car, Dumbbell,
} from 'lucide-react';

const HOTELS_ON_MAP = [
  { id: 'htl-001', name: 'The Grand Palace Hotel', lat: 25.2048, lng: 55.2708, price: 450, currency: 'AED', rating: 4.8, stars: 5, type: 'Luxury', emoji: '🏰' },
  { id: 'htl-002', name: 'KARTSEEK Business Suites', lat: 25.2100, lng: 55.2650, price: 280, currency: 'AED', rating: 4.6, stars: 4, type: 'Business', emoji: '🏢' },
  { id: 'htl-003', name: 'Seaside Family Resort', lat: 25.1950, lng: 55.2800, price: 380, currency: 'AED', rating: 4.7, stars: 5, type: 'Family', emoji: '🏖️' },
  { id: 'htl-004', name: 'Budget Inn Express', lat: 25.2200, lng: 55.2550, price: 120, currency: 'AED', rating: 4.1, stars: 3, type: 'Budget', emoji: '🏨' },
  { id: 'htl-005', name: 'Heritage Boutique Hotel', lat: 25.1900, lng: 55.2900, price: 650, currency: 'AED', rating: 4.9, stars: 5, type: 'Boutique', emoji: '🏛️' },
  { id: 'htl-006', name: 'Marina View Hotel', lat: 25.0800, lng: 55.1400, price: 320, currency: 'AED', rating: 4.5, stars: 4, type: 'Modern', emoji: '⛵' },
  { id: 'htl-007', name: 'Desert Oasis Resort', lat: 25.1100, lng: 55.2000, price: 480, currency: 'AED', rating: 4.6, stars: 5, type: 'Resort', emoji: '🏜️' },
  { id: 'htl-008', name: 'Airport Express Inn', lat: 25.2530, lng: 55.3650, price: 180, currency: 'AED', rating: 4.0, stars: 3, type: 'Airport', emoji: '✈️' },
];

export default function MapSearchPage() {
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selected = HOTELS_ON_MAP.find(h => h.id === selectedHotel);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 z-20 flex items-center gap-3">
        <Link href="/" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search hotels on map..."
            className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all"
          />
        </div>
        <button
          onClick={() => setShowList(!showList)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showList ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          title="Toggle list view"
        >
          <List className="w-4 h-4" />
        </button>
      </header>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Mock Map Background */}
        <div className="absolute inset-0 bg-linear-to-br from-blue-50 via-green-50 to-blue-100">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 20h40M20 0v40\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />

          {/* Hotel Pins */}
          {HOTELS_ON_MAP.map((hotel, idx) => {
            const isSelected = selectedHotel === hotel.id;
            const x = 10 + (idx % 4) * 22;
            const y = 15 + Math.floor(idx / 4) * 35;
            return (
              <button
                key={hotel.id}
                onClick={() => setSelectedHotel(isSelected ? null : hotel.id)}
                className={`absolute transition-all duration-200 z-10 ${isSelected ? 'z-20 scale-110' : 'hover:scale-105'}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-lg whitespace-nowrap flex items-center gap-1 ${
                  isSelected ? 'bg-rose-600 text-white scale-110' : 'bg-white text-slate-900 hover:bg-rose-50'
                }`}>
                  <span>{hotel.emoji}</span>
                  <span>{hotel.currency} {hotel.price}</span>
                </div>
                <div className={`w-3 h-3 rotate-45 -mt-1.5 mx-auto ${isSelected ? 'bg-rose-600' : 'bg-white'}`} />
              </button>
            );
          })}
        </div>

        {/* Map Controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 z-20">
          <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4 text-slate-600" />
          </button>
          <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4 text-slate-600" />
          </button>
          <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors" title="My location">
            <Locate className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Selected Hotel Card */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 z-20 md:left-auto md:right-4 md:w-80">
            <Link
              href={`/hotel/${selected.id}`}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-start gap-4 hover:shadow-2xl transition-all group"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                {selected.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-rose-600 transition-colors">{selected.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  {[...Array(selected.stars)].map((_, i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />)}
                  <span className="text-xs text-slate-400 ml-1">{selected.rating}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selected.type}</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-lg font-black text-slate-900">{selected.currency} {selected.price}</span>
                  <span className="text-[10px] text-slate-400">/ night</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* List Panel (overlay) */}
        {showList && (
          <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-30 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">{HOTELS_ON_MAP.length} Hotels</h3>
              <button onClick={() => setShowList(false)} className="text-xs text-slate-500 hover:text-slate-700">
                Back to Map
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {HOTELS_ON_MAP.map(hotel => (
                <Link
                  key={hotel.id}
                  href={`/hotel/${hotel.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                    {hotel.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{hotel.name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span className="text-xs text-slate-500">{hotel.rating}</span>
                      <span className="text-xs text-slate-400 ml-1">{hotel.type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{hotel.currency} {hotel.price}</p>
                    <p className="text-[10px] text-slate-400">/ night</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
