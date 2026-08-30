'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Clock, Download, Search, Eye, ArrowUpDown, Hotel, Calendar, TrendingUp } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Settlement Data ──────────────────────────────────────────────── */
const SETTLEMENT_STATS = {
  totalSettled: 12450000,
  pendingAmount: 2350000,
  thisMonth: 3200000,
  avgCycle: '7 days',
};

const SETTLEMENTS = [
  { id: 'STL-001', hotel: 'Grand Mumbai Hotel', period: 'Jun 24 – Jul 1', bookings: 42, grossRevenue: 1680000, commission: 201600, netPayout: 1478400, status: 'Paid', paidDate: '2026-07-03', method: 'Bank Transfer' },
  { id: 'STL-002', hotel: 'Coastal Beach Resort', period: 'Jun 24 – Jul 1', bookings: 28, grossRevenue: 1260000, commission: 126000, netPayout: 1134000, status: 'Paid', paidDate: '2026-07-03', method: 'Bank Transfer' },
  { id: 'STL-003', hotel: 'Safari Lodge Mara', period: 'Jul 1 – Jul 8', bookings: 15, grossRevenue: 930000, commission: 139500, netPayout: 790500, status: 'Processing', paidDate: null, method: 'Bank Transfer' },
  { id: 'STL-004', hotel: 'City Center Inn', period: 'Jul 1 – Jul 8', bookings: 56, grossRevenue: 476000, commission: 71400, netPayout: 404600, status: 'Processing', paidDate: null, method: 'UPI' },
  { id: 'STL-005', hotel: 'Lakeside Villa', period: 'Jul 1 – Jul 8', bookings: 12, grossRevenue: 456000, commission: 54720, netPayout: 401280, status: 'Pending', paidDate: null, method: 'Bank Transfer' },
  { id: 'STL-006', hotel: 'Downtown Suites', period: 'Jul 1 – Jul 8', bookings: 38, grossRevenue: 380000, commission: 45600, netPayout: 334400, status: 'Pending', paidDate: null, method: 'Bank Transfer' },
  { id: 'STL-007', hotel: 'Airport Express Hotel', period: 'Jul 1 – Jul 8', bookings: 89, grossRevenue: 445000, commission: 66750, netPayout: 378250, status: 'Pending', paidDate: null, method: 'UPI' },
  { id: 'STL-008', hotel: 'Mountain Retreat', period: 'Jun 24 – Jul 1', bookings: 8, grossRevenue: 264000, commission: 39600, netPayout: 224400, status: 'Paid', paidDate: '2026-07-02', method: 'Bank Transfer' },
];

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Processing: 'bg-blue-50 text-blue-700',
  Pending: 'bg-amber-50 text-amber-700',
  Failed: 'bg-red-50 text-red-700',
};

export default function AdminHotelSettlementsPage() {
  const { formatPrice } = useHotelRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'grossRevenue' | 'netPayout' | 'bookings'>('grossRevenue');

  const filtered = SETTLEMENTS
    .filter(s => filterStatus === 'All' || s.status === filterStatus)
    .filter(s => s.hotel.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Wallet className="w-6 h-6 text-rose-500" /> Settlement Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage hotel payout settlements and payment cycles.</p>
        </div>
        <button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{formatPrice(SETTLEMENT_STATS.totalSettled)}</p><p className="text-xs font-medium text-emerald-600">Total Settled</p></div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-2xl font-black text-amber-700">{formatPrice(SETTLEMENT_STATS.pendingAmount)}</p><p className="text-xs font-medium text-amber-600">Pending</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{formatPrice(SETTLEMENT_STATS.thisMonth)}</p><p className="text-xs font-medium text-blue-600">This Month</p></div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4"><p className="text-2xl font-black text-rose-700">{SETTLEMENT_STATS.avgCycle}</p><p className="text-xs font-medium text-rose-600">Avg Cycle</p></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hotels..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>Paid</option><option>Processing</option><option>Pending</option></select>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase">
            <th className="p-3 text-left">Hotel</th>
            <th className="p-3 text-center">Period</th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('bookings')}>Bookings <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('grossRevenue')}>Gross Revenue <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center">Commission</th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('netPayout')}>Net Payout <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center">Method</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(s => (
            <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="p-3"><strong className="text-sm text-slate-900">{s.hotel}</strong><br /><span className="text-[10px] text-slate-400 font-mono">{s.id}</span></td>
              <td className="p-3 text-center text-xs text-slate-600">{s.period}</td>
              <td className="p-3 text-center font-bold">{s.bookings}</td>
              <td className="p-3 text-center font-bold">{formatPrice(s.grossRevenue)}</td>
              <td className="p-3 text-center text-rose-600 font-bold">-{formatPrice(s.commission)}</td>
              <td className="p-3 text-center font-black text-emerald-600">{formatPrice(s.netPayout)}</td>
              <td className="p-3 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">{s.method}</span></td>
              <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[s.status]}`}>{s.status}</span></td>
              <td className="p-3 text-center">
                <div className="flex justify-center gap-1">
                  <button title="View settlement" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Eye className="w-4 h-4" /></button>
                  {s.status === 'Pending' && <button className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700">Process</button>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
