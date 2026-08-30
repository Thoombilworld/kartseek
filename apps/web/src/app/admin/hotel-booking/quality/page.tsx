'use client';
import React, { useState, useEffect } from 'react';
import { Search, Star, TrendingUp, TrendingDown, Award, AlertTriangle, ChevronRight, ArrowUpDown, Minus } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

const HOTELS = [
  {
    id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai', country: 'AE',
    overallScore: 94, guestRating: 4.8, responseTime: '8 min', responseRate: '99%',
    cleanlinessScore: 96, serviceScore: 93, valueScore: 88, locationScore: 98,
    complaints: 3, bookings: 3200, reviews: 1240, badge: 'Platinum',
    trend: 'up', change: '+2.1',
  },
  {
    id: 'htl-005', name: 'Heritage Boutique Hotel', city: 'London', country: 'GB',
    overallScore: 97, guestRating: 4.9, responseTime: '5 min', responseRate: '100%',
    cleanlinessScore: 99, serviceScore: 97, valueScore: 92, locationScore: 98,
    complaints: 0, bookings: 2100, reviews: 430, badge: 'Platinum',
    trend: 'up', change: '+0.8',
  },
  {
    id: 'htl-003', name: 'Seaside Family Resort', city: 'Mumbai', country: 'IN',
    overallScore: 88, guestRating: 4.7, responseTime: '15 min', responseRate: '95%',
    cleanlinessScore: 90, serviceScore: 87, valueScore: 85, locationScore: 91,
    complaints: 8, bookings: 4500, reviews: 2100, badge: 'Gold',
    trend: 'stable', change: '+0.1',
  },
  {
    id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Doha', country: 'QA',
    overallScore: 85, guestRating: 4.6, responseTime: '12 min', responseRate: '97%',
    cleanlinessScore: 88, serviceScore: 84, valueScore: 82, locationScore: 90,
    complaints: 1, bookings: 1800, reviews: 890, badge: 'Gold',
    trend: 'up', change: '+1.5',
  },
  {
    id: 'htl-006', name: 'Royal Palm Resort', city: 'Muscat', country: 'OM',
    overallScore: 78, guestRating: 4.5, responseTime: '25 min', responseRate: '88%',
    cleanlinessScore: 80, serviceScore: 76, valueScore: 75, locationScore: 82,
    complaints: 5, bookings: 780, reviews: 380, badge: 'Silver',
    trend: 'down', change: '-1.2',
  },
  {
    id: 'htl-004', name: 'Budget Inn Express', city: 'Riyadh', country: 'SA',
    overallScore: 52, guestRating: 4.1, responseTime: '45 min', responseRate: '72%',
    cleanlinessScore: 55, serviceScore: 48, valueScore: 60, locationScore: 50,
    complaints: 15, bookings: 650, reviews: 560, badge: 'Warning',
    trend: 'down', change: '-3.8',
  },
];

const scoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

const scoreBg = (score: number) => {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const badgeStyle = (badge: string) => {
  switch (badge) {
    case 'Platinum': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Gold': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Silver': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Warning': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export default function AdminQualityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('overallScore');

  const filtered = HOTELS
    .filter(h => !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b as any)[sortBy] - (a as any)[sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Hotel Quality Scores</h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered quality assessment based on reviews, complaints, response time & service metrics</p>
        </div>
      </div>

      {/* Score Distribution KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Platinum (90+)', count: HOTELS.filter(h => h.overallScore >= 90).length, icon: Award, color: 'from-violet-500 to-purple-600' },
          { label: 'Gold (75-89)', count: HOTELS.filter(h => h.overallScore >= 75 && h.overallScore < 90).length, icon: Star, color: 'from-amber-500 to-orange-600' },
          { label: 'Silver (60-74)', count: HOTELS.filter(h => h.overallScore >= 60 && h.overallScore < 75).length, icon: Minus, color: 'from-slate-400 to-slate-600' },
          { label: 'Warning (<60)', count: HOTELS.filter(h => h.overallScore < 60).length, icon: AlertTriangle, color: 'from-red-500 to-rose-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{kpi.count}</p>
              <p className="text-xs font-semibold text-slate-400">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search hotels..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
      </div>

      {/* Hotel Score Cards */}
      <div className="space-y-4">
        {filtered.map(hotel => (
          <div key={hotel.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-5">
              {/* Score Circle */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                  <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - hotel.overallScore / 100)}`}
                    strokeLinecap="round"
                    className={scoreColor(hotel.overallScore)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-black ${scoreColor(hotel.overallScore)}`}>{hotel.overallScore}</span>
                  <span className="text-[8px] text-slate-400 font-bold">/ 100</span>
                </div>
              </div>

              {/* Hotel Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-slate-900 truncate">{hotel.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle(hotel.badge)}`}>{hotel.badge}</span>
                  <span className={`flex items-center gap-0.5 text-xs font-bold ${
                    hotel.trend === 'up' ? 'text-emerald-600' : hotel.trend === 'down' ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    {hotel.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {hotel.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                    {hotel.change}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{hotel.city}, {hotel.country} · {hotel.bookings.toLocaleString()} bookings · {hotel.reviews.toLocaleString()} reviews</p>

                {/* Sub-scores */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { label: 'Cleanliness', value: hotel.cleanlinessScore },
                    { label: 'Service', value: hotel.serviceScore },
                    { label: 'Value', value: hotel.valueScore },
                    { label: 'Location', value: hotel.locationScore },
                  ].map(sub => (
                    <div key={sub.label} className="text-center">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${scoreBg(sub.value)}`} style={{ width: `${sub.value}%` }} />
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold">{sub.label}</p>
                      <p className={`text-xs font-bold ${scoreColor(sub.value)}`}>{sub.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side Stats */}
              <div className="hidden md:flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-black text-slate-900">{hotel.guestRating}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Response</p>
                  <p className="font-bold text-sm text-slate-900">{hotel.responseTime}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Complaints</p>
                  <p className={`font-bold text-sm ${hotel.complaints > 10 ? 'text-red-600' : hotel.complaints > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {hotel.complaints}
                  </p>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
