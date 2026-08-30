'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState } from 'react';
import { AlertTriangle, MessageSquare, Clock, CheckCircle, XCircle, Search, Filter, ChevronDown, Eye, Send, User, Hotel } from 'lucide-react';

/* ── Mock Complaint Data ──────────────────────────────────────────────── */
const COMPLAINT_STATS = {
  total: 47,
  pending: 12,
  inProgress: 8,
  resolved: 24,
  escalated: 3,
};

const COMPLAINTS = [
  { id: 'CMP-001', guest: 'Sarah K.', hotel: 'Grand Mumbai Hotel', category: 'Cleanliness', subject: 'Room not cleaned before check-in', priority: 'High', status: 'Pending', date: '2026-07-08', bookingId: 'BKG-1201', responseTime: null },
  { id: 'CMP-002', guest: 'John D.', hotel: 'Coastal Beach Resort', category: 'Service', subject: 'Rude front desk staff during check-in', priority: 'High', status: 'In Progress', date: '2026-07-07', bookingId: 'BKG-1198', responseTime: '2h 15m' },
  { id: 'CMP-003', guest: 'Amit P.', hotel: 'City Center Inn', category: 'Facilities', subject: 'AC not working in room 302', priority: 'Medium', status: 'Resolved', date: '2026-07-06', bookingId: 'BKG-1195', responseTime: '4h 30m' },
  { id: 'CMP-004', guest: 'Maria L.', hotel: 'Safari Lodge Mara', category: 'Billing', subject: 'Overcharged for mini-bar items', priority: 'Medium', status: 'Pending', date: '2026-07-06', bookingId: 'BKG-1190', responseTime: null },
  { id: 'CMP-005', guest: 'David W.', hotel: 'Lakeside Villa', category: 'Safety', subject: 'Broken lock on bathroom door', priority: 'Critical', status: 'Escalated', date: '2026-07-05', bookingId: 'BKG-1187', responseTime: '45m' },
  { id: 'CMP-006', guest: 'Lisa M.', hotel: 'Mountain Retreat', category: 'Noise', subject: 'Construction noise during early morning', priority: 'Low', status: 'Resolved', date: '2026-07-04', bookingId: 'BKG-1182', responseTime: '6h' },
  { id: 'CMP-007', guest: 'Tom B.', hotel: 'Downtown Suites', category: 'Wi-Fi', subject: 'Internet connection extremely slow', priority: 'Medium', status: 'In Progress', date: '2026-07-04', bookingId: 'BKG-1180', responseTime: '3h' },
  { id: 'CMP-008', guest: 'Anna R.', hotel: 'Airport Express Hotel', category: 'Food', subject: 'Hair found in breakfast buffet item', priority: 'High', status: 'Pending', date: '2026-07-03', bookingId: 'BKG-1175', responseTime: null },
];

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Resolved: 'bg-emerald-50 text-emerald-700',
  Escalated: 'bg-red-50 text-red-700',
};

export default function AdminHotelComplaintsPage() {
  const { regionLabel, formatPrice } = useHotelRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const filtered = COMPLAINTS
    .filter(c => filterStatus === 'All' || c.status === filterStatus)
    .filter(c => filterPriority === 'All' || c.priority === filterPriority)
    .filter(c => c.guest.toLowerCase().includes(search.toLowerCase()) || c.hotel.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-rose-500" /> Complaint Management
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor, respond to, and resolve guest complaints across all hotels.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-2xl font-black text-slate-700">{COMPLAINT_STATS.total}</p><p className="text-xs font-medium text-slate-500">Total</p></div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-2xl font-black text-amber-700">{COMPLAINT_STATS.pending}</p><p className="text-xs font-medium text-amber-600">Pending</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{COMPLAINT_STATS.inProgress}</p><p className="text-xs font-medium text-blue-600">In Progress</p></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{COMPLAINT_STATS.resolved}</p><p className="text-xs font-medium text-emerald-600">Resolved</p></div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-2xl font-black text-red-700">{COMPLAINT_STATS.escalated}</p><p className="text-xs font-medium text-red-600">Escalated</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search complaints..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" />
        </div>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2">
          <option>All</option><option>Pending</option><option>In Progress</option><option>Resolved</option><option>Escalated</option>
        </select>
        <select title="Filter by priority" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2">
          <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className={`bg-white border ${c.priority === 'Critical' ? 'border-red-200' : 'border-slate-200'} rounded-xl p-5 shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm">{c.subject}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_STYLES[c.priority]}`}>{c.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.guest}</span>
                  <span className="flex items-center gap-1"><Hotel className="w-3 h-3" /> {c.hotel}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.date}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{c.category}</span>
                  {c.responseTime && <span className="text-blue-600">Response: {c.responseTime}</span>}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{c.id}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedComplaint(selectedComplaint === c.id ? null : c.id)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors">
                <Eye className="w-3 h-3" /> View Details
              </button>
              {c.status === 'Pending' && (
                <button className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
                  Accept & Investigate
                </button>
              )}
              {c.status === 'In Progress' && (
                <button onClick={() => setSelectedComplaint(c.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
                  <CheckCircle className="w-3 h-3 inline mr-1" /> Mark Resolved
                </button>
              )}
              {c.priority === 'Critical' && c.status !== 'Resolved' && (
                <button className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">
                  Escalate
                </button>
              )}
            </div>

            {/* Resolution Panel */}
            {selectedComplaint === c.id && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="resolution-note">Resolution Note</label>
                <textarea id="resolution-note" value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe the resolution..." className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-20" />
                <div className="flex gap-2 mt-2">
                  <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><Send className="w-3 h-3" /> Submit Resolution</button>
                  <button onClick={() => { setSelectedComplaint(null); setResolution(''); }} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
