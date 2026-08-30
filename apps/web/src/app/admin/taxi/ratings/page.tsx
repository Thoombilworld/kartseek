'use client';
import React, { useState, useEffect } from 'react';
import { Star, Search, TrendingUp, TrendingDown, AlertTriangle, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Eye, Shield, Car, Users, MessageSquare, Filter } from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type DriverRating = {
  id: string; driverName: string; driverId: string; vendorName: string | null;
  city: string; overallRating: number; totalRatings: number;
  last30Days: number; trend: 'up' | 'down' | 'stable';
  breakdown: { fiveStar: number; fourStar: number; threeStar: number; twoStar: number; oneStar: number };
  topCompliments: string[]; topComplaints: string[];
  recentReviews: { rating: number; comment: string; customerName: string; date: string }[];
  flagged: boolean; flagReason?: string;
};

const ratings: DriverRating[] = [
  {
    id: 'R-001', driverName: 'Ravi Kumar', driverId: 'DRV-101', vendorName: 'QuickRide Fleet', city: 'Bangalore',
    overallRating: 4.85, totalRatings: 1240, last30Days: 4.9, trend: 'up',
    breakdown: { fiveStar: 890, fourStar: 250, threeStar: 70, twoStar: 20, oneStar: 10 },
    topCompliments: ['Polite driver', 'Clean vehicle', 'Fast route'], topComplaints: [],
    recentReviews: [
      { rating: 5, comment: 'Very professional and safe driver', customerName: 'Mary W.', date: '2026-07-08' },
      { rating: 5, comment: 'Great conversation, smooth ride', customerName: 'John K.', date: '2026-07-07' },
    ],
    flagged: false,
  },
  {
    id: 'R-002', driverName: 'James Mwangi', driverId: 'DRV-103', vendorName: null, city: 'Mumbai',
    overallRating: 4.52, totalRatings: 890, last30Days: 4.3, trend: 'down',
    breakdown: { fiveStar: 520, fourStar: 200, threeStar: 100, twoStar: 50, oneStar: 20 },
    topCompliments: ['Knows routes well', 'Punctual'], topComplaints: ['AC not working'],
    recentReviews: [
      { rating: 3, comment: 'AC was broken, ride was hot', customerName: 'Sarah A.', date: '2026-07-08' },
      { rating: 5, comment: 'Fastest ride to airport', customerName: 'Peter M.', date: '2026-07-06' },
    ],
    flagged: false,
  },
  {
    id: 'R-003', driverName: 'Amit Singh', driverId: 'DRV-102', vendorName: 'QuickRide Fleet', city: 'Mumbai',
    overallRating: 4.65, totalRatings: 650, last30Days: 4.7, trend: 'up',
    breakdown: { fiveStar: 420, fourStar: 150, threeStar: 50, twoStar: 20, oneStar: 10 },
    topCompliments: ['Safe driving', 'Clean car'], topComplaints: [],
    recentReviews: [
      { rating: 5, comment: 'Excellent service, very clean car', customerName: 'Priya R.', date: '2026-07-09' },
    ],
    flagged: false,
  },
  {
    id: 'R-004', driverName: 'Prakash B.', driverId: 'DRV-105', vendorName: null, city: 'Hyderabad',
    overallRating: 3.2, totalRatings: 210, last30Days: 2.8, trend: 'down',
    breakdown: { fiveStar: 40, fourStar: 50, threeStar: 40, twoStar: 50, oneStar: 30 },
    topCompliments: [], topComplaints: ['Rude behavior', 'Unsafe driving', 'Phone usage while driving'],
    recentReviews: [
      { rating: 1, comment: 'Was on phone the entire ride, very unsafe', customerName: 'Lakshmi V.', date: '2026-07-08' },
      { rating: 2, comment: 'Argued about route, unpleasant experience', customerName: 'Rajan K.', date: '2026-07-07' },
    ],
    flagged: true, flagReason: 'Rating below 3.5 for 2 consecutive weeks — review required',
  },
  {
    id: 'R-005', driverName: 'Ahmed Hassan', driverId: 'DRV-106', vendorName: 'Desert Express', city: 'Dubai',
    overallRating: 4.92, totalRatings: 2100, last30Days: 4.95, trend: 'stable',
    breakdown: { fiveStar: 1800, fourStar: 200, threeStar: 60, twoStar: 25, oneStar: 15 },
    topCompliments: ['Premium experience', 'Water bottles', 'Smooth driving'], topComplaints: [],
    recentReviews: [
      { rating: 5, comment: 'Best ride in Dubai, had water and charger', customerName: 'Ali M.', date: '2026-07-09' },
    ],
    flagged: false,
  },
];

export default function TaxiRatingsPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'overallRating' | 'totalRatings' | 'last30Days'>('overallRating');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flagFilter, setFlagFilter] = useState(false);

  const avgRating = (ratings.reduce((s, r) => s + r.overallRating, 0) / ratings.length).toFixed(2);
  const totalReviews = ratings.reduce((s, r) => s + r.totalRatings, 0);
  const flaggedCount = ratings.filter(r => r.flagged).length;
  const trendingUp = ratings.filter(r => r.trend === 'up').length;

  const filtered = ratings
    .filter(r => {
      const matchSearch = r.driverName.toLowerCase().includes(search.toLowerCase()) || r.driverId.toLowerCase().includes(search.toLowerCase());
      const matchFlag = !flagFilter || r.flagged;
      return matchSearch && matchFlag;
    })
    .sort((a, b) => sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Star className="w-7 h-7 text-amber-500 fill-amber-400" /> Driver Ratings & Reviews
        </h1>
        <p className="text-slate-500 text-sm mt-1">Monitor driver quality, flag low performers, and review customer feedback</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-amber-400 to-amber-500 p-4 rounded-xl shadow-md text-white">
          <Star className="w-5 h-5 opacity-80 fill-white" /><p className="text-2xl font-black mt-2">{avgRating}</p><p className="text-xs font-medium opacity-80">Avg Rating</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <MessageSquare className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">{totalReviews.toLocaleString()}</p><p className="text-xs text-slate-500 font-medium">Total Reviews</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <TrendingUp className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">{trendingUp}</p><p className="text-xs text-slate-500 font-medium">Trending Up</p>
        </div>
        <div className={`p-4 rounded-xl border shadow-sm ${flaggedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <AlertTriangle className={`w-5 h-5 ${flaggedCount > 0 ? 'text-red-500' : 'text-slate-400'}`} /><p className="text-2xl font-black text-slate-900 mt-2">{flaggedCount}</p><p className="text-xs text-slate-500 font-medium">Flagged Drivers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
        </div>
        <button onClick={() => setFlagFilter(!flagFilter)}
          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${flagFilter ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          <AlertTriangle className="w-4 h-4" /> {flagFilter ? 'Showing Flagged Only' : 'Show Flagged Only'}
        </button>
      </div>

      {/* Ratings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Driver</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">City</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('overallRating')}>
                Overall {sortBy === 'overallRating' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('last30Days')}>
                30-Day {sortBy === 'last30Days' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Trend</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('totalRatings')}>
                Reviews {sortBy === 'totalRatings' && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Flag</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <React.Fragment key={r.id}>
                <tr className={`border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors ${r.flagged ? 'bg-red-50/50' : ''}`}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === r.id ? null : r.id))}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{r.driverName}</p>
                    <p className="text-xs text-slate-400">{r.driverId} {r.vendorName && `· ${r.vendorName}`}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{r.city}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-black text-lg ${r.overallRating >= 4.5 ? 'text-emerald-600' : r.overallRating >= 3.5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.overallRating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-slate-700">{r.last30Days.toFixed(1)}</td>
                  <td className="px-5 py-4 text-center">
                    {r.trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-500 inline" />}
                    {r.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500 inline" />}
                    {r.trend === 'stable' && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-slate-900">{r.totalRatings.toLocaleString()}</td>
                  <td className="px-5 py-4 text-center">
                    {r.flagged && <AlertTriangle className="w-5 h-5 text-red-500 inline" />}
                  </td>
                  <td className="px-5 py-4 text-center">{expanded === r.id ? <ChevronUp className="w-4 h-4 text-slate-400 inline" /> : <ChevronDown className="w-4 h-4 text-slate-400 inline" />}</td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-slate-50/80">
                    <td colSpan={8} className="px-5 py-5">
                      {r.flagged && r.flagReason && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm text-red-700">
                          <AlertTriangle className="w-4 h-4" /> {r.flagReason}
                        </div>
                      )}
                      {/* Rating Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Star Breakdown</p>
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = r.breakdown[`${['one', 'two', 'three', 'four', 'five'][star - 1]}Star` as keyof typeof r.breakdown];
                            const pct = r.totalRatings > 0 ? (count / r.totalRatings) * 100 : 0;
                            return (
                              <div key={star} className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-slate-500 w-3">{star}</span>
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-amber-400 rounded-full transition-all w-[${Math.round(pct)}%]`} />
                                </div>
                                <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Top Compliments</p>
                          {r.topCompliments.length > 0 ? r.topCompliments.map((c, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium mr-1 mb-1"><ThumbsUp className="w-3 h-3" />{c}</span>
                          )) : <p className="text-xs text-slate-400">None</p>}
                          <p className="text-xs font-semibold text-slate-500 mb-2 mt-3">Top Complaints</p>
                          {r.topComplaints.length > 0 ? r.topComplaints.map((c, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium mr-1 mb-1"><ThumbsDown className="w-3 h-3" />{c}</span>
                          )) : <p className="text-xs text-slate-400">None</p>}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Recent Reviews</p>
                          {r.recentReviews.map((rev, i) => (
                            <div key={i} className="mb-2 bg-white p-2 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-1 mb-0.5">
                                {Array.from({ length: 5 }).map((_, s) => (
                                  <Star key={s} className={`w-3 h-3 ${s < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                ))}
                                <span className="text-xs text-slate-400 ml-1">{rev.date}</span>
                              </div>
                              <p className="text-xs text-slate-700">&ldquo;{rev.comment}&rdquo;</p>
                              <p className="text-xs text-slate-400">— {rev.customerName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.flagged && <button className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Suspend Driver</button>}
                        {r.flagged && <button className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600 flex items-center gap-1">Send Warning</button>}
                        <button className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Full Profile</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
