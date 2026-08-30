'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Users, Tag, Search,
  Eye, Building2, AlertCircle, Filter, ChevronDown,
  Hospital, Stethoscope, Star,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ─── Mock Data ──────────────────────────────────────────────────────────────────

interface ApprovalItem {
  id: string;
  type: 'doctor' | 'specialty';
  name: string;
  detail: string;
  submittedBy: string;
  submittedByType: 'hospital' | 'clinic';
  submittedByIcon: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  meta?: Record<string, string | number>;
}

const INITIAL_ITEMS: ApprovalItem[] = [
  {
    id: 'ap-1', type: 'doctor', name: 'Dr. Sarah Wanjiru', detail: 'Dermatologist · MBBS, MD · 8 yrs exp',
    submittedBy: 'Mumbai Hospital', submittedByType: 'hospital', submittedByIcon: '🏥',
    submittedAt: '2 days ago', status: 'pending',
    meta: { fee: 1800, email: 'sarah@Mumbai.hospital', phone: '+91 756 789012' },
  },
  {
    id: 'ap-2', type: 'doctor', name: 'Dr. Kevin Mishra', detail: 'ENT Specialist · MBBS, MS · 6 yrs exp',
    submittedBy: 'Mumbai Hospital', submittedByType: 'hospital', submittedByIcon: '🏥',
    submittedAt: '4 days ago', status: 'pending',
    meta: { fee: 1500, email: 'kevin@Mumbai.hospital', phone: '+91 767 890123' },
  },
  {
    id: 'ap-3', type: 'specialty', name: 'Oncology', detail: 'New department — cancer treatment services',
    submittedBy: 'Mumbai Hospital', submittedByType: 'hospital', submittedByIcon: '🏥',
    submittedAt: '1 day ago', status: 'pending',
  },
  {
    id: 'ap-4', type: 'doctor', name: 'Dr. Linda Mwangi', detail: 'Gynecologist · MBBS, MD · 9 yrs exp',
    submittedBy: 'HealthFirst Clinic', submittedByType: 'clinic', submittedByIcon: '🏪',
    submittedAt: '1 day ago', status: 'pending',
    meta: { fee: 2000, email: 'linda@healthfirst.co.in', phone: '+91 789 012345' },
  },
  {
    id: 'ap-5', type: 'specialty', name: 'Ophthalmology', detail: 'Eye care services',
    submittedBy: 'HealthFirst Clinic', submittedByType: 'clinic', submittedByIcon: '🏪',
    submittedAt: '3 days ago', status: 'pending',
  },
  {
    id: 'ap-6', type: 'doctor', name: 'Dr. Mercy Achieng', detail: 'Neurologist · MBBS, DM · 11 yrs exp',
    submittedBy: 'Mumbai Hospital', submittedByType: 'hospital', submittedByIcon: '🏥',
    submittedAt: '5 days ago', status: 'rejected', rejectionReason: 'Medical license verification failed. Please resubmit valid license.',
  },
  {
    id: 'ap-7', type: 'doctor', name: 'Dr. Peter Wafula', detail: 'General Physician · MBBS · 5 yrs exp',
    submittedBy: 'Medicare Plus Clinic', submittedByType: 'clinic', submittedByIcon: '🏪',
    submittedAt: '1 week ago', status: 'approved',
  },
  {
    id: 'ap-8', type: 'specialty', name: 'Physiotherapy', detail: 'Physical rehabilitation services',
    submittedBy: 'Medicare Plus Clinic', submittedByType: 'clinic', submittedByIcon: '🏪',
    submittedAt: '1 week ago', status: 'approved',
  },
];

const STATUS_CONFIG: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
  approved: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Approved' },
  rejected: { bg: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AdminApprovalsPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [items, setItems] = useState<ApprovalItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { formatCurrencyValue } = useRegion();

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.submittedBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const countByStatus = (s: string) => items.filter(i => i.status === s).length;

  const handleApprove = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, status: 'approved' as const } : i));
  };

  const handleReject = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, status: 'rejected' as const, rejectionReason: rejectReason || 'Rejected by admin.' } : i));
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-500" /> Approval Queue
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review and approve doctors & specialties submitted by hospitals and clinics</p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-amber-700">{countByStatus('pending')}</p>
              <p className="text-xs font-bold text-amber-600 mt-1">Pending Review</p>
            </div>
            <Clock className="w-8 h-8 text-amber-300" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-emerald-700">{countByStatus('approved')}</p>
              <p className="text-xs font-bold text-emerald-600 mt-1">Approved</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-300" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-red-700">{countByStatus('rejected')}</p>
              <p className="text-xs font-bold text-red-600 mt-1">Rejected</p>
            </div>
            <XCircle className="w-8 h-8 text-red-300" />
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status */}
        {[
          { key: 'pending', label: `Pending (${countByStatus('pending')})` },
          { key: 'all', label: 'All' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Type */}
        {[
          { key: 'all', label: 'All Types' },
          { key: 'doctor', label: '👨‍⚕️ Doctors' },
          { key: 'specialty', label: '🏷️ Specialties' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              typeFilter === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 w-60" />
        </div>
      </div>

      {/* ── Approval Cards ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const sc = STATUS_CONFIG[item.status];
          return (
            <div key={item.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
              item.status === 'pending' ? 'border-amber-200' : 'border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  item.type === 'doctor' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'
                }`}>
                  {item.type === 'doctor' ? <Stethoscope className="w-6 h-6" /> : <Tag className="w-6 h-6" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{item.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.type === 'doctor' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {item.type === 'doctor' ? 'Doctor' : 'Specialty'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs">{item.submittedByIcon}</span>
                    <span className="text-xs text-slate-600 font-medium">{item.submittedBy}</span>
                    <span className="text-[10px] text-slate-400">· {item.submittedAt}</span>
                  </div>
                  {item.meta && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {Object.entries(item.meta).map(([k, v]) => (
                        <span key={k} className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{k}: <span className="font-bold text-slate-700">{k === 'fee' && typeof v === 'number' ? formatCurrencyValue(v) : v}</span></span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border ${sc.bg}`}>
                    <sc.icon className="w-3.5 h-3.5" /> {sc.label}
                  </span>

                  {item.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectModal(item.id)}
                        className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors border border-red-200"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection reason */}
              {item.rejectionReason && (
                <div className="bg-red-50 border-t border-red-100 px-5 py-3">
                  <p className="text-xs text-red-700"><span className="font-bold">Rejection reason:</span> {item.rejectionReason}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">No items in this queue</p>
          <p className="text-xs text-slate-400 mt-1">All caught up!</p>
        </div>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setRejectModal(null); setRejectReason(''); }} ><DismissOnEscape onDismiss={() => { setRejectModal(null); setRejectReason(''); }} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> Reject Item
            </h3>
            <p className="text-sm text-slate-500">Provide a reason so the facility can address the issue and resubmit.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancel</button>
              <button
                onClick={() => handleReject(rejectModal)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
