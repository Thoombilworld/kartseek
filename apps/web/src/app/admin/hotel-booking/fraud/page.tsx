'use client';
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Ban, Search, Filter, TrendingUp, Users, XCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

interface FraudFlag {
  id: string; customerId: string; customerName: string; type: string;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; bookingCount: number;
  cancelCount: number; totalValue: number; lastActivity: string;
  status: 'pending' | 'investigating' | 'cleared' | 'blocked'; details: string;
}

const FLAGS: FraudFlag[] = [
  { id: 'ff-001', customerId: 'c-101', customerName: 'James Wilson', type: 'Serial Cancellation', riskScore: 'CRITICAL', bookingCount: 12, cancelCount: 10, totalValue: 15200, lastActivity: '2026-07-05', status: 'pending', details: '10 cancellations in 14 days, all within 2 hours of check-in' },
  { id: 'ff-002', customerId: 'c-205', customerName: 'Maria Gonzalez', type: 'Velocity Abuse', riskScore: 'HIGH', bookingCount: 8, cancelCount: 0, totalValue: 42500, lastActivity: '2026-07-04', status: 'investigating', details: '8 high-value bookings in 24h from different IPs, same card' },
  { id: 'ff-003', customerId: 'c-310', customerName: 'Alex Chen', type: 'Chargeback Pattern', riskScore: 'HIGH', bookingCount: 5, cancelCount: 2, totalValue: 8900, lastActivity: '2026-07-03', status: 'pending', details: '3 chargebacks filed after completed stays in 60 days' },
  { id: 'ff-004', customerId: 'c-422', customerName: 'Sarah Al Fahim', type: 'No-Show Pattern', riskScore: 'MEDIUM', bookingCount: 15, cancelCount: 0, totalValue: 28000, lastActivity: '2026-07-05', status: 'cleared', details: '5 no-shows in past month on pre-paid bookings' },
  { id: 'ff-005', customerId: 'c-518', customerName: 'David Park', type: 'Duplicate Accounts', riskScore: 'MEDIUM', bookingCount: 20, cancelCount: 3, totalValue: 35000, lastActivity: '2026-07-02', status: 'investigating', details: 'Multiple accounts sharing same phone/email with slight variations' },
];

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  investigating: 'bg-blue-100 text-blue-700',
  cleared: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-red-100 text-red-700',
};

export default function FraudPage() {
  const [flags, setFlags] = useState(FLAGS);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = flags.filter(f => {
    if (riskFilter !== 'all' && f.riskScore !== riskFilter) return false;
    if (search && !f.customerName.toLowerCase().includes(search.toLowerCase()) && !f.customerId.includes(search)) return false;
    return true;
  });

  const updateStatus = (id: string, status: FraudFlag['status']) => {
    setFlags(flags.map(f => f.id === id ? { ...f, status } : f));
  };

  const stats = {
    total: flags.length,
    critical: flags.filter(f => f.riskScore === 'CRITICAL').length,
    investigating: flags.filter(f => f.status === 'investigating').length,
    blocked: flags.filter(f => f.status === 'blocked').length,
    totalAtRisk: flags.filter(f => f.status !== 'cleared').reduce((s, f) => s + f.totalValue, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Fraud Detection</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor suspicious booking patterns and protect the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Flags', value: stats.total, icon: Shield, color: 'bg-slate-100 text-slate-600' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
          { label: 'Investigating', value: stats.investigating, icon: Eye, color: 'bg-blue-100 text-blue-600' },
          { label: 'Blocked', value: stats.blocked, icon: Ban, color: 'bg-red-100 text-red-600' },
          { label: 'Value at Risk', value: `AED ${(stats.totalAtRisk / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'bg-amber-100 text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 ${s.color} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or customer ID..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
        </div>
        {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
          <button key={r} onClick={() => setRiskFilter(r)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
              riskFilter === r ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
            }`}>
            {r === 'all' ? 'All' : r}
          </button>
        ))}
      </div>

      {/* Fraud Flags */}
      <div className="space-y-3">
        {filtered.map(f => (
          <div key={f.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${
            f.riskScore === 'CRITICAL' ? 'border-red-200' : 'border-slate-100'
          }`}>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    f.riskScore === 'CRITICAL' ? 'bg-red-100' : f.riskScore === 'HIGH' ? 'bg-orange-100' : 'bg-amber-100'
                  }`}>
                    <Shield className={`w-5 h-5 ${
                      f.riskScore === 'CRITICAL' ? 'text-red-600' : f.riskScore === 'HIGH' ? 'text-orange-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{f.customerName}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${RISK_COLORS[f.riskScore]}`}>{f.riskScore}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[f.status]}`}>{f.status.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-semibold mt-0.5">{f.type}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>ID: {f.customerId}</span>
                      <span>Bookings: {f.bookingCount}</span>
                      <span>Cancels: {f.cancelCount}</span>
                      <span className="font-bold text-slate-700">AED {f.totalValue.toLocaleString()}</span>
                      <span>Last: {f.lastActivity}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === f.id ? 'rotate-180' : ''}`} />
                  </button>
                  {f.status !== 'blocked' && f.status !== 'cleared' && (
                    <>
                      <button onClick={() => updateStatus(f.id, 'investigating')}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Eye className="w-3 h-3 inline mr-1" /> Investigate
                      </button>
                      <button onClick={() => updateStatus(f.id, 'blocked')}
                        className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <Ban className="w-3 h-3 inline mr-1" /> Block
                      </button>
                      <button onClick={() => updateStatus(f.id, 'cleared')}
                        className="px-3 py-1.5 text-xs font-bold border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" /> Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === f.id && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100 mt-0">
                <div className="mt-4 bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 mb-1">Detection Details</p>
                  <p className="text-sm text-slate-700">{f.details}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
