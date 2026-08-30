'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Hotel, Percent, Edit, Save, X, ChevronDown, Search, Filter, Download, ArrowUpDown } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Commission Data ──────────────────────────────────────────────── */
const COMMISSION_STATS = {
  avgRate: 15.2,
  totalEarned: 2845000,
  pendingPayout: 485000,
  activeHotels: 124,
};

const COMMISSION_TIERS = [
  { tier: 'Standard', rate: 15, hotels: 82, revenue: 1250000, description: 'Default commission for new hotels' },
  { tier: 'Premium', rate: 12, hotels: 28, revenue: 980000, description: 'High-volume partners (50+ bookings/mo)' },
  { tier: 'Enterprise', rate: 10, hotels: 14, revenue: 615000, description: 'Chain hotels & franchise partners' },
];

const HOTEL_COMMISSIONS = [
  { id: 'HTL-001', name: 'Grand Mumbai Hotel', tier: 'Premium', rate: 12, bookings: 156, revenue: 312000, commission: 37440, status: 'Active' },
  { id: 'HTL-002', name: 'Coastal Beach Resort', tier: 'Enterprise', rate: 10, bookings: 89, revenue: 445000, commission: 44500, status: 'Active' },
  { id: 'HTL-003', name: 'Safari Lodge Mara', tier: 'Standard', rate: 15, bookings: 42, revenue: 168000, commission: 25200, status: 'Active' },
  { id: 'HTL-004', name: 'City Center Inn', tier: 'Standard', rate: 15, bookings: 78, revenue: 117000, commission: 17550, status: 'Active' },
  { id: 'HTL-005', name: 'Lakeside Villa', tier: 'Premium', rate: 12, bookings: 34, revenue: 204000, commission: 24480, status: 'Under Review' },
  { id: 'HTL-006', name: 'Mountain Retreat', tier: 'Standard', rate: 15, bookings: 23, revenue: 92000, commission: 13800, status: 'Active' },
  { id: 'HTL-007', name: 'Downtown Suites', tier: 'Premium', rate: 12, bookings: 112, revenue: 280000, commission: 33600, status: 'Active' },
  { id: 'HTL-008', name: 'Airport Express Hotel', tier: 'Standard', rate: 15, bookings: 201, revenue: 201000, commission: 30150, status: 'Active' },
];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Under Review': 'bg-amber-50 text-amber-700',
  Suspended: 'bg-red-50 text-red-700',
};

export default function AdminHotelCommissionsPage() {
  const { regionLabel, formatPrice } = useHotelRegionFilter([]);
  const [editTier, setEditTier] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('All');
  const [sortBy, setSortBy] = useState<'revenue' | 'bookings' | 'rate'>('revenue');

  const filtered = HOTEL_COMMISSIONS
    .filter(h => filterTier === 'All' || h.tier === filterTier)
    .filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-6 h-6 text-rose-500" /> Commission Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure and monitor hotel commission rates and earnings.</p>
        </div>
        <button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Percent className="w-5 h-5 text-rose-500" /></div>
          <p className="text-2xl font-black text-rose-700">{COMMISSION_STATS.avgRate}%</p>
          <p className="text-xs font-medium text-rose-600">Avg Commission Rate</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-2xl font-black text-emerald-700">{formatPrice(COMMISSION_STATS.totalEarned)}</p>
          <p className="text-xs font-medium text-emerald-600">Total Earned</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-2xl font-black text-amber-700">{formatPrice(COMMISSION_STATS.pendingPayout)}</p>
          <p className="text-xs font-medium text-amber-600">Pending Payout</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-2xl font-black text-blue-700">{COMMISSION_STATS.activeHotels}</p>
          <p className="text-xs font-medium text-blue-600">Active Hotels</p>
        </div>
      </div>

      {/* Commission Tiers */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Commission Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMMISSION_TIERS.map(t => (
            <div key={t.tier} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">{t.tier}</h3>
                {editTier === t.tier ? (
                  <div className="flex items-center gap-1">
                    <input type="number" title="Commission rate" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-16 px-2 py-1 border rounded text-sm" />
                    <button title="Save changes" onClick={() => setEditTier(null)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-4 h-4" /></button>
                    <button title="Cancel editing" onClick={() => setEditTier(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button title="Edit commission rate" onClick={() => { setEditTier(t.tier); setEditRate(String(t.rate)); }} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-3xl font-black text-rose-600 mb-2">{t.rate}%</div>
              <p className="text-xs text-slate-500 mb-3">{t.description}</p>
              <div className="flex justify-between text-xs text-slate-500 border-t pt-3">
                <span><strong className="text-slate-700">{t.hotels}</strong> hotels</span>
                <span><strong className="text-slate-700">{formatPrice(t.revenue)}</strong> revenue</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hotel Commission Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Hotel Commission Details</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hotels..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-60" />
            </div>
            <select title="Filter by tier" value={filterTier} onChange={e => setFilterTier(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2">
              <option>All</option>
              <option>Standard</option>
              <option>Premium</option>
              <option>Enterprise</option>
            </select>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase">
              <th className="p-3 text-left">Hotel</th>
              <th className="p-3 text-center">Tier</th>
              <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('rate')}>Rate <ArrowUpDown className="inline w-3 h-3" /></th>
              <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('bookings')}>Bookings <ArrowUpDown className="inline w-3 h-3" /></th>
              <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('revenue')}>Revenue <ArrowUpDown className="inline w-3 h-3" /></th>
              <th className="p-3 text-center">Commission</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr></thead>
            <tbody>{filtered.map(h => (
              <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3"><strong className="text-sm text-slate-900">{h.name}</strong><br /><span className="text-[11px] text-slate-400">{h.id}</span></td>
                <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{h.tier}</span></td>
                <td className="p-3 text-center font-bold text-rose-600">{h.rate}%</td>
                <td className="p-3 text-center font-bold">{h.bookings}</td>
                <td className="p-3 text-center font-bold">{formatPrice(h.revenue)}</td>
                <td className="p-3 text-center font-bold text-emerald-600">{formatPrice(h.commission)}</td>
                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[h.status] || 'bg-slate-100 text-slate-500'}`}>{h.status}</span></td>
                <td className="p-3 text-center">
                  <button className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors">Edit Rate</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
