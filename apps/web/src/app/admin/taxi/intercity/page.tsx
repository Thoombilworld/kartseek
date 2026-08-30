'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import {
  MapPin, ArrowRight, Clock, Users, CheckCircle, XCircle, Search,
  Download, Calendar, DollarSign, Eye, Bus, AlertTriangle, FileText,
  ArrowLeftRight, Briefcase, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getCountryConfig, formatCancellationPolicy } from '@/lib/config/rental-policies';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ────────────────────────────────────────────────────────────────────

type IntercityStatus = 'reserved' | 'confirmed' | 'boarded' | 'completed' | 'cancelled' | 'no_show';

interface IntercityBooking {
  id: string;
  customer: string;
  phone: string;
  routeFrom: string;
  routeTo: string;
  date: string;
  departureTime: string;
  seats: number;
  farePerSeat: number;
  totalFare: number;
  status: IntercityStatus;
  shuttle: string | null;
  driver: string | null;
  region: string;
  createdAt: string;
  tripType: 'one_way' | 'round_trip';
  vehicleClass: string;
  luggage: number;
  returnDate: string | null;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const BOOKINGS: IntercityBooking[] = [
  { id: 'IC-301', customer: 'Vikram Singh', phone: '+91 722 345 678', routeFrom: 'Mumbai', routeTo: 'Delhi', date: '2026-07-09', departureTime: '06:00 AM', seats: 2, farePerSeat: 1800, totalFare: 3600, status: 'confirmed', shuttle: 'KBZ 100A (HiAce)', driver: 'Mwangi K.', region: 'IN', createdAt: '2026-07-08T14:25:00Z', tripType: 'one_way', vehicleClass: 'Shuttle', luggage: 2, returnDate: null },
  { id: 'IC-300', customer: 'Anjali Gupta', phone: '+91 733 456 789', routeFrom: 'Mumbai', routeTo: 'Chennai', date: '2026-07-09', departureTime: '07:00 AM', seats: 1, farePerSeat: 1500, totalFare: 1500, status: 'reserved', shuttle: null, driver: null, region: 'IN', createdAt: '2026-07-08T12:00:00Z', tripType: 'round_trip', vehicleClass: 'Comfort Bus', luggage: 1, returnDate: '2026-07-12' },
  { id: 'IC-299', customer: 'Vikram Patel', phone: '+91 98765 11111', routeFrom: 'Mumbai', routeTo: 'Pune', date: '2026-07-09', departureTime: '08:00 AM', seats: 3, farePerSeat: 450, totalFare: 1350, status: 'confirmed', shuttle: 'MH 01 AB 1234', driver: 'Rajesh D.', region: 'IN', createdAt: '2026-07-07T18:00:00Z', tripType: 'one_way', vehicleClass: 'Shuttle', luggage: 3, returnDate: null },
  { id: 'IC-298', customer: 'John Kamau', phone: '+91 711 222 333', routeFrom: 'Mumbai', routeTo: 'Pune', date: '2026-07-08', departureTime: '10:00 AM', seats: 1, farePerSeat: 700, totalFare: 700, status: 'boarded', shuttle: 'KCA 200B', driver: 'Samuel O.', region: 'IN', createdAt: '2026-07-07T20:00:00Z', tripType: 'one_way', vehicleClass: 'Shuttle', luggage: 0, returnDate: null },
  { id: 'IC-297', customer: 'Fatima Al-Rashid', phone: '+971 55 123 4567', routeFrom: 'Dubai', routeTo: 'Abu Dhabi', date: '2026-07-08', departureTime: '09:00 AM', seats: 2, farePerSeat: 55, totalFare: 110, status: 'completed', shuttle: 'D 54321', driver: 'Mohammed S.', region: 'AE', createdAt: '2026-07-07T08:00:00Z', tripType: 'round_trip', vehicleClass: 'VIP Coach', luggage: 4, returnDate: '2026-07-08' },
  { id: 'IC-296', customer: 'James Wilson', phone: '+44 7700 900 123', routeFrom: 'London', routeTo: 'Manchester', date: '2026-07-08', departureTime: '07:30 AM', seats: 1, farePerSeat: 35, totalFare: 35, status: 'completed', shuttle: 'LC22 BUS', driver: 'David B.', region: 'GB', createdAt: '2026-07-06T22:00:00Z', tripType: 'one_way', vehicleClass: 'Comfort Bus', luggage: 1, returnDate: null },
  { id: 'IC-295', customer: 'Ali Hassan', phone: '+973 3312 3456', routeFrom: 'Mumbai', routeTo: 'Pune', date: '2026-07-08', departureTime: '02:00 PM', seats: 1, farePerSeat: 700, totalFare: 700, status: 'cancelled', shuttle: null, driver: null, region: 'IN', createdAt: '2026-07-06T12:00:00Z', tripType: 'one_way', vehicleClass: 'Shuttle', luggage: 1, returnDate: null },
  { id: 'IC-294', customer: 'Mei Ling', phone: '+65 8123 4567', routeFrom: 'Singapore', routeTo: 'Johor Bahru', date: '2026-07-08', departureTime: '10:00 AM', seats: 2, farePerSeat: 12, totalFare: 24, status: 'completed', shuttle: 'SG BUS 88', driver: 'Rajan P.', region: 'SG', createdAt: '2026-07-07T06:00:00Z', tripType: 'one_way', vehicleClass: 'Express', luggage: 2, returnDate: null },
  { id: 'IC-293', customer: 'Ahmad Al-Dosari', phone: '+966 55 123 4567', routeFrom: 'Riyadh', routeTo: 'Jeddah', date: '2026-07-09', departureTime: '06:00 AM', seats: 4, farePerSeat: 200, totalFare: 800, status: 'reserved', shuttle: null, driver: null, region: 'SA', createdAt: '2026-07-08T10:00:00Z', tripType: 'round_trip', vehicleClass: 'VIP Coach', luggage: 8, returnDate: '2026-07-12' },
];

const STATUS_STYLES: Record<IntercityStatus, { bg: string; label: string }> = {
  reserved: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Reserved' },
  confirmed: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmed' },
  boarded: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Boarded' },
  completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  cancelled: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
  no_show: { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'No Show' },
};

export default function AdminIntercityPage() {
  const { filtered: regionBookings, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(BOOKINGS);
  const [statusFilter, setStatusFilter] = useState<IntercityStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const bookings = useMemo(() => {
    let result = regionBookings;
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b => b.id.toLowerCase().includes(q) || b.customer.toLowerCase().includes(q) || b.routeFrom.toLowerCase().includes(q) || b.routeTo.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [regionBookings, statusFilter, search]);

  const todayDepartures = regionBookings.filter(b => b.date === '2026-07-08' && ['confirmed', 'boarded'].includes(b.status)).length;
  const totalPassengers = regionBookings.filter(b => ['confirmed', 'boarded', 'completed'].includes(b.status)).reduce((s, b) => s + b.seats, 0);
  const revenue = regionBookings.filter(b => ['confirmed', 'boarded', 'completed'].includes(b.status)).reduce((s, b) => s + b.totalFare, 0);
  const cancelledCount = regionBookings.filter(b => b.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🛣️ Intercity Travel</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage shuttle bookings and passenger manifests {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => showToast('Exporting manifest...')} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm"><FileText className="w-4 h-4" /> Manifest</button>
          <button onClick={() => showToast('Exporting report...')} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Departures", value: todayDepartures, color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Bus },
          { label: 'Total Passengers', value: totalPassengers, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Users },
          { label: 'Route Revenue', value: formatPrice(revenue), color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: DollarSign },
          { label: 'Cancellations', value: cancelledCount, color: cancelledCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: XCircle },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}><kpi.icon className="w-5 h-5 mb-2" /><p className="text-xl font-black">{kpi.value}</p><p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p></div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings, routes..." className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-200" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'reserved', 'confirmed', 'boarded', 'completed', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'all' ? 'All' : STATUS_STYLES[s as IntercityStatus]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <th className="px-4 py-3">ID</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Trip</th><th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Date & Time</th><th className="px-4 py-3">Pax</th><th className="px-4 py-3">🧳</th>
              <th className="px-4 py-3 text-right">Fare</th>
              <th className="px-4 py-3">Shuttle</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center text-slate-400">No bookings match the current filters</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-violet-600 text-xs">{b.id}</td>
                  <td className="px-4 py-3"><p className="font-medium text-slate-800 text-sm">{b.customer}</p><p className="text-[10px] text-slate-400">{b.phone}</p></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
                      {b.routeFrom} <ArrowRight className="w-3 h-3 text-violet-400" /> {b.routeTo}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.tripType === 'round_trip' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'}`}>
                      {b.tripType === 'round_trip' ? '↔ Round' : '→ One Way'}
                    </span>
                    {b.returnDate && <p className="text-[9px] text-blue-500 mt-0.5">Return: {new Date(b.returnDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-bold text-slate-700">{b.vehicleClass}</span></td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-medium">{new Date(b.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className="text-slate-400">{b.departureTime}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><span className="bg-slate-100 px-2 py-1 rounded font-bold text-xs">{b.seats}</span></td>
                  <td className="px-4 py-3 text-center"><span className="text-xs text-slate-500">{b.luggage}</span></td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{formatPrice(b.totalFare)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{b.shuttle || <span className="text-slate-300 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[b.status].bg}`}>{STATUS_STYLES[b.status].label}</span></td>
                  <td className="px-4 py-3">
                    {b.status === 'reserved' && <button onClick={() => showToast(`${b.id} confirmed`)} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded">Confirm</button>}
                    {b.status === 'confirmed' && <button onClick={() => showToast(`${b.id} boarded`)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">Board</button>}
                    {['reserved', 'confirmed'].includes(b.status) && <button onClick={() => showToast(`${b.id} cancelled`)} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded ml-1">Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">Showing {bookings.length} of {regionBookings.length} bookings</div>
      </div>
    </div>
  );
}
