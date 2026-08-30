'use client';
import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle2, MessageCircle, ChevronRight, Filter, ArrowUpDown, Eye, Scale } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

const DISPUTES = [
  {
    id: 'DSP-001', type: 'Overcharge', priority: 'High',
    guest: { name: 'Sarah Al Maktoum', email: 'sarah@email.com', bookingId: 'HBK-A7B3C9' },
    hotel: { name: 'The Grand Palace Hotel', id: 'htl-001' },
    status: 'Open', createdAt: '2026-07-04', description: 'Guest claims they were charged for minibar items they did not consume.',
    amount: 'AED 285', messages: 4,
  },
  {
    id: 'DSP-002', type: 'Room Condition', priority: 'Medium',
    guest: { name: 'James Clarke', email: 'james@email.com', bookingId: 'HBK-D4E5F6' },
    hotel: { name: 'Heritage Boutique Hotel', id: 'htl-005' },
    status: 'Under Review', createdAt: '2026-07-03', description: 'Room was not as described — photos showed renovated room but guest received old-style room.',
    amount: '£ 368', messages: 8,
  },
  {
    id: 'DSP-003', type: 'Cancellation Refund', priority: 'High',
    guest: { name: 'Priya Sharma', email: 'priya@email.com', bookingId: 'HBK-G7H8I9' },
    hotel: { name: 'Seaside Family Resort', id: 'htl-003' },
    status: 'Awaiting Hotel', createdAt: '2026-07-02', description: 'Guest cancelled within free cancellation window but was still charged. Refund not processed.',
    amount: '₹ 28,500', messages: 6,
  },
  {
    id: 'DSP-004', type: 'Service Complaint', priority: 'Low',
    guest: { name: 'Omar Al Saud', email: 'omar@email.com', bookingId: 'HBK-M4N5O6' },
    hotel: { name: 'Budget Inn Express', id: 'htl-004' },
    status: 'Resolved', createdAt: '2026-06-28', description: 'Poor housekeeping service — room not cleaned for 2 days during 3-night stay.',
    amount: 'SAR 138', messages: 12, resolution: 'Full refund + AED 100 voucher',
  },
  {
    id: 'DSP-005', type: 'Safety Concern', priority: 'Critical',
    guest: { name: 'Maria Gonzalez', email: 'maria@email.com', bookingId: 'HBK-P7Q8R9' },
    hotel: { name: 'Royal Palm Resort', id: 'htl-006' },
    status: 'Escalated', createdAt: '2026-07-01', description: 'Guest reports non-functioning smoke detectors in room and hallway. Safety violation.',
    amount: 'OMR 52', messages: 3,
  },
];

const STATUS_FILTER = ['All', 'Open', 'Under Review', 'Awaiting Hotel', 'Escalated', 'Resolved'];

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);

  const filtered = DISPUTES.filter(d => {
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchSearch = !searchTerm || d.guest.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const priorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'Open': return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
      case 'Under Review': return <Eye className="w-3.5 h-3.5 text-blue-500" />;
      case 'Awaiting Hotel': return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'Escalated': return <Scale className="w-3.5 h-3.5 text-purple-500" />;
      case 'Resolved': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default: return null;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'Open': return 'bg-red-50 text-red-700';
      case 'Under Review': return 'bg-blue-50 text-blue-700';
      case 'Awaiting Hotel': return 'bg-amber-50 text-amber-700';
      case 'Escalated': return 'bg-purple-50 text-purple-700';
      case 'Resolved': return 'bg-emerald-50 text-emerald-700';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dispute Resolution</h1>
          <p className="text-sm text-slate-500 mt-1">Manage guest-hotel disputes and complaints</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-bold text-red-700">{DISPUTES.filter(d => d.status !== 'Resolved').length} Active</span>
          </div>
          <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-xl border border-purple-100">
            <Scale className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-bold text-purple-700">{DISPUTES.filter(d => d.status === 'Escalated').length} Escalated</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Resolution Time', value: '2.3 days', color: 'from-blue-500 to-indigo-600' },
          { label: 'Resolution Rate', value: '94%', color: 'from-emerald-500 to-teal-600' },
          { label: 'Guest Satisfaction', value: '4.2/5', color: 'from-amber-500 to-orange-600' },
          { label: 'Total Value', value: 'AED 42K', color: 'from-rose-500 to-pink-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-2xl font-black bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by guest, hotel, or dispute ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTER.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dispute</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Hotel</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Messages</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-bold text-slate-900">{d.id}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{d.type} · {d.createdAt}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{d.guest.name}</p>
                    <p className="text-[10px] text-slate-400">{d.guest.bookingId}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{d.hotel.name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityColor(d.priority)}`}>{d.priority}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit ${statusColor(d.status)}`}>
                      {statusIcon(d.status)} {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900">{d.amount}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MessageCircle className="w-3 h-3" /> {d.messages}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1">
                      Review <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
