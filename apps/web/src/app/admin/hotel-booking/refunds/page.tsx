'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { RotateCcw, DollarSign, Clock, CheckCircle, XCircle, Search, Eye, Send, AlertTriangle, Download, Filter } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Refund Data ──────────────────────────────────────────────── */
const REFUND_STATS = {
  totalRequests: 38,
  approved: 22,
  pending: 9,
  rejected: 5,
  totalRefunded: 1850000,
  avgProcessingTime: '2.4 days',
};

const REFUNDS = [
  { id: 'RFD-001', guest: 'Sarah K.', hotel: 'Grand Mumbai Hotel', booking: 'BKG-1201', amount: 12500, reason: 'Last-minute cancellation (medical emergency)', status: 'Pending', date: '2026-07-08', stayDates: 'Jul 10-12', refundPct: 100, method: 'Original Payment' },
  { id: 'RFD-002', guest: 'John D.', hotel: 'Coastal Beach Resort', booking: 'BKG-1198', amount: 45000, reason: 'Hotel did not match listing photos', status: 'Approved', date: '2026-07-07', stayDates: 'Jul 7-9', refundPct: 75, method: 'Original Payment' },
  { id: 'RFD-003', guest: 'Amit P.', hotel: 'City Center Inn', booking: 'BKG-1195', amount: 8500, reason: 'Cancelled within free cancellation window', status: 'Approved', date: '2026-07-06', stayDates: 'Jul 8-9', refundPct: 100, method: 'Wallet Credit' },
  { id: 'RFD-004', guest: 'Maria L.', hotel: 'Safari Lodge Mara', booking: 'BKG-1190', amount: 68000, reason: 'Natural disaster — area inaccessible', status: 'Pending', date: '2026-07-06', stayDates: 'Jul 12-15', refundPct: 100, method: 'Original Payment' },
  { id: 'RFD-005', guest: 'David W.', hotel: 'Lakeside Villa', booking: 'BKG-1187', amount: 15000, reason: 'Personal reason — change of plans', status: 'Rejected', date: '2026-07-05', stayDates: 'Jul 6-8', refundPct: 0, method: 'N/A' },
  { id: 'RFD-006', guest: 'Lisa M.', hotel: 'Downtown Suites', booking: 'BKG-1180', amount: 9200, reason: 'Room amenities not as described', status: 'Pending', date: '2026-07-04', stayDates: 'Jul 4-5', refundPct: 50, method: 'Wallet Credit' },
  { id: 'RFD-007', guest: 'Tom B.', hotel: 'Airport Express Hotel', booking: 'BKG-1175', amount: 5500, reason: 'Flight cancelled — could not travel', status: 'Approved', date: '2026-07-03', stayDates: 'Jul 3', refundPct: 100, method: 'Original Payment' },
];

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
  Processing: 'bg-blue-50 text-blue-700',
};

export default function AdminHotelRefundsPage() {
  const { formatPrice } = useHotelRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedRefund, setSelectedRefund] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filtered = REFUNDS
    .filter(r => filterStatus === 'All' || r.status === filterStatus)
    .filter(r => r.guest.toLowerCase().includes(search.toLowerCase()) || r.hotel.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><RotateCcw className="w-6 h-6 text-rose-500" /> Refund Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Process and track booking refund requests.</p>
        </div>
        <button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><Download className="w-4 h-4" /> Export</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-2xl font-black text-amber-700">{REFUND_STATS.pending}</p><p className="text-xs font-medium text-amber-600">Pending Review</p></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{REFUND_STATS.approved}</p><p className="text-xs font-medium text-emerald-600">Approved</p></div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4"><p className="text-2xl font-black text-rose-700">{formatPrice(REFUND_STATS.totalRefunded)}</p><p className="text-xs font-medium text-rose-600">Total Refunded</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{REFUND_STATS.avgProcessingTime}</p><p className="text-xs font-medium text-blue-600">Avg Processing</p></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search refunds..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
      </div>

      {/* Refund Cards */}
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm">{r.guest}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-xs text-slate-500">{r.hotel} · {r.booking} · Stay: {r.stayDates}</p>
                <p className="text-xs text-slate-600 mt-1"><strong>Reason:</strong> {r.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-rose-600">{formatPrice(r.amount)}</p>
                <p className="text-[10px] text-slate-400">{r.refundPct}% refund · {r.method}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{r.id}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedRefund(selectedRefund === r.id ? null : r.id)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"><Eye className="w-3 h-3" /> Details</button>
              {r.status === 'Pending' && (
                <>
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><CheckCircle className="w-3 h-3" /> Approve</button>
                  <button onClick={() => setSelectedRefund(r.id)} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><XCircle className="w-3 h-3" /> Reject</button>
                </>
              )}
            </div>

            {/* Rejection Panel */}
            {selectedRefund === r.id && r.status === 'Pending' && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="rejection-reason-if-rejecting">Rejection Reason (if rejecting)</label>
                <textarea id="rejection-reason-if-rejecting" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this refund is being rejected..." className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-16" />
                <div className="flex gap-2 mt-2">
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Confirm Rejection</button>
                  <button onClick={() => { setSelectedRefund(null); setRejectionReason(''); }} className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
