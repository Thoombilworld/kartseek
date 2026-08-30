'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import {
  Calendar, Clock, MapPin, Car, Users, CheckCircle, XCircle,
  AlertTriangle, Search, Filter, ChevronDown, RefreshCw,
  Play, Pause, Trash2, UserPlus, Eye, Bell,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ────────────────────────────────────────────────────────────────────

type ScheduleStatus = 'upcoming' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

interface ScheduledRide {
  id: string;
  customer: string;
  customerPhone: string;
  pickup: string;
  drop: string;
  scheduledAt: string;
  vehicleType: string;
  driver: string | null;
  status: ScheduleStatus;
  fare: number;
  notes: string;
  region: string;
  createdAt: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const SCHEDULED_RIDES: ScheduledRide[] = [
  { id: 'SCH-301', customer: 'Vikram Singh', customerPhone: '+91 98765 43210', pickup: 'Sector 62, Noida', drop: 'IGI Airport T3', scheduledAt: '2026-07-09T05:30:00Z', vehicleType: 'Sedan', driver: 'Amit Verma', status: 'assigned', fare: 920, notes: 'Early morning flight — needs 5:30 AM pickup', region: 'IN', createdAt: '2026-07-07T18:30:00Z' },
  { id: 'SCH-300', customer: 'Fatima Al-Dosari', customerPhone: '+966 55 123 4567', pickup: 'Olaya Towers, Riyadh', drop: 'King Khalid Airport', scheduledAt: '2026-07-09T08:00:00Z', vehicleType: 'Business', driver: null, status: 'upcoming', fare: 120, notes: 'VIP client — premium vehicle required', region: 'SA', createdAt: '2026-07-07T14:20:00Z' },
  { id: 'SCH-299', customer: 'Vikram Singh', customerPhone: '+91 722 345 678', pickup: 'Bandra West, Mumbai', drop: 'Mumbai CBD', scheduledAt: '2026-07-09T07:00:00Z', vehicleType: 'Economy', driver: 'Joseph Mwangi', status: 'assigned', fare: 650, notes: 'Regular commuter — daily schedule', region: 'IN', createdAt: '2026-07-06T20:00:00Z' },
  { id: 'SCH-298', customer: 'James Wilson', customerPhone: '+44 7700 900 123', pickup: '10 Downing St, London', drop: 'Heathrow T5', scheduledAt: '2026-07-08T16:00:00Z', vehicleType: 'Exec', driver: 'David Thompson', status: 'in_progress', fare: 85, notes: 'Business trip', region: 'GB', createdAt: '2026-07-07T09:00:00Z' },
  { id: 'SCH-297', customer: 'Mei Ling', customerPhone: '+65 8123 4567', pickup: 'Marina Bay Sands', drop: 'Changi Airport T3', scheduledAt: '2026-07-08T14:00:00Z', vehicleType: 'Premium', driver: 'Kumar S.', status: 'completed', fare: 38, notes: '', region: 'SG', createdAt: '2026-07-07T22:00:00Z' },
  { id: 'SCH-296', customer: 'Omar Al-Falasi', customerPhone: '+971 50 123 4567', pickup: 'DIFC, Dubai', drop: 'Dubai Marina', scheduledAt: '2026-07-08T12:00:00Z', vehicleType: 'Luxury', driver: null, status: 'expired', fare: 60, notes: 'No driver accepted — auto-expired', region: 'AE', createdAt: '2026-07-07T10:00:00Z' },
  { id: 'SCH-295', customer: 'Priya Menon', customerPhone: '+91 87654 32100', pickup: 'MG Road, Bangalore', drop: 'Kempegowda Airport', scheduledAt: '2026-07-08T10:30:00Z', vehicleType: 'SUV', driver: 'Ravi K.', status: 'completed', fare: 750, notes: 'Family trip — extra luggage', region: 'IN', createdAt: '2026-07-06T15:00:00Z' },
  { id: 'SCH-294', customer: 'Ali Hassan', customerPhone: '+973 3312 3456', pickup: 'Juffair, Manama', drop: 'Bahrain Airport', scheduledAt: '2026-07-08T06:00:00Z', vehicleType: 'Economy', driver: null, status: 'cancelled', fare: 0, notes: 'Customer cancelled — flight rescheduled', region: 'BH', createdAt: '2026-07-06T12:00:00Z' },
];

const STATUS_STYLES: Record<ScheduleStatus, { bg: string; label: string }> = {
  upcoming: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Upcoming' },
  assigned: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Driver Assigned' },
  in_progress: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'In Progress' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  cancelled: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
  expired: { bg: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Expired' },
};

export default function AdminScheduledRidesPage() {
  const { filtered: regionFiltered, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(SCHEDULED_RIDES);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const rides = useMemo(() => {
    let result = regionFiltered;
    if (tab === 'upcoming') result = result.filter(r => ['upcoming', 'assigned', 'in_progress'].includes(r.status));
    else result = result.filter(r => ['completed', 'cancelled', 'expired'].includes(r.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.customer.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.pickup.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [regionFiltered, tab, search]);

  const upcomingCount = regionFiltered.filter(r => ['upcoming', 'assigned'].includes(r.status)).length;
  const unassigned = regionFiltered.filter(r => r.status === 'upcoming' && !r.driver).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Scheduled Rides</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage pre-booked and upcoming scheduled rides {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <button onClick={() => showToast('Refreshing scheduled rides...')} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Rides', value: upcomingCount, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
          { label: 'Unassigned', value: unassigned, color: unassigned > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: AlertTriangle },
          { label: 'Completed Today', value: regionFiltered.filter(r => r.status === 'completed').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
          { label: 'Expired / Cancelled', value: regionFiltered.filter(r => ['expired', 'cancelled'].includes(r.status)).length, color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}>
            <kpi.icon className="w-5 h-5 mb-2" />
            <p className="text-xl font-black">{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['upcoming', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'upcoming' ? `Upcoming (${upcomingCount})` : 'Past'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scheduled rides..." className="pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none w-64 focus:ring-2 focus:ring-amber-200" />
        </div>
      </div>

      {/* Rides List */}
      <div className="space-y-3">
        {rides.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">No {tab} rides found</div>
        ) : (
          rides.map(r => {
            const schedTime = new Date(r.scheduledAt);
            const now = new Date();
            const hoursUntil = Math.max(0, Math.round((schedTime.getTime() - now.getTime()) / 3600000));
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><Calendar className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-blue-600 font-bold">{r.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status].bg}`}>{STATUS_STYLES[r.status].label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{r.customer} <span className="text-slate-400 font-normal text-xs">· {r.customerPhone}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{schedTime.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className="text-sm font-bold text-amber-600">{schedTime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</p>
                    {r.status === 'upcoming' && <p className="text-xs text-slate-400 mt-0.5">{hoursUntil}h from now</p>}
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <div className="flex flex-col items-center mt-1 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="w-px h-4 bg-slate-300" />
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-700">{r.pickup}</p>
                    <p className="text-slate-400 mt-1">{r.drop}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{r.vehicleType}</span>
                  <span className="font-mono font-bold text-slate-800">{formatPrice(r.fare)}</span>
                  {r.driver && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-600" />{r.driver}</span>}
                  {!r.driver && r.status !== 'cancelled' && r.status !== 'expired' && r.status !== 'completed' && (
                    <span className="flex items-center gap-1 text-amber-600 font-bold"><AlertTriangle className="w-3.5 h-3.5" />Unassigned</span>
                  )}
                </div>

                {r.notes && <p className="text-xs text-slate-400 italic bg-slate-50 px-3 py-2 rounded-lg mb-3">"{r.notes}"</p>}

                {/* Actions */}
                {['upcoming', 'assigned'].includes(r.status) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {!r.driver && (
                      <button onClick={() => showToast(`Assigning driver to ${r.id}...`)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        <UserPlus className="w-3.5 h-3.5" /> Assign Driver
                      </button>
                    )}
                    <button onClick={() => showToast(`Notification sent to ${r.customer}`)} className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                      <Bell className="w-3.5 h-3.5" /> Notify Customer
                    </button>
                    <button onClick={() => showToast(`${r.id} cancelled`)} className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-auto">
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
