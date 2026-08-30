'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Car, Clock, MapPin, CheckCircle, XCircle, AlertTriangle, Search,
  Download, User, Calendar, DollarSign, Key, Timer, UserCheck,
  Shield, Gauge, ChevronDown, ChevronUp, History,
} from 'lucide-react';
import { RentalCompliancePanel } from '@/components/taxi/RentalCompliancePanel';
import { getCountryConfig, getRequiredComplianceChecks, formatCancellationPolicy } from '@/lib/config/rental-policies';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ────────────────────────────────────────────────────────────────────

type RentalStatus = 'pending' | 'confirmed' | 'active' | 'returned' | 'cancelled' | 'overdue';
type RentalMode = 'chauffeur' | 'self_drive';
type DurationType = 'hourly' | 'daily' | 'weekly';

interface RentalBooking {
  id: string;
  customer: string;
  phone: string;
  vehicle: string;
  vehicleType: string;
  pickupLocation: string;
  returnLocation: string;
  startDate: string;
  startTime: string;
  durationType: DurationType;
  hours: number;
  days: number;
  kmIncluded: number;
  kmUsed: number;
  baseRate: number;
  chauffeurCharge: number;
  extrasCharge: number;
  totalFare: number;
  mode: RentalMode;
  extras: string[];
  status: RentalStatus;
  assignedPlate: string | null;
  driver: string | null;
  securityDeposit: number;
  region: string;
  createdAt: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const BOOKINGS: RentalBooking[] = [
  { id: 'RNT-501', customer: 'Vikram Singh', phone: '+91 98765 43210', vehicle: 'Toyota Prado', vehicleType: 'SUV', pickupLocation: 'Connaught Place, Delhi', returnLocation: 'Same', startDate: '2026-07-10', startTime: '09:00', durationType: 'daily', hours: 0, days: 3, kmIncluded: 0, kmUsed: 0, baseRate: 22500, chauffeurCharge: 6000, extrasCharge: 0, totalFare: 28500, mode: 'chauffeur', extras: [], status: 'pending', assignedPlate: null, driver: null, securityDeposit: 0, region: 'IN', createdAt: '2026-07-08T14:30:00Z' },
  { id: 'RNT-500', customer: 'Suresh Nair', phone: '+91 722 345 678', vehicle: 'Toyota Fielder', vehicleType: 'Economy', pickupLocation: 'Westlands, Mumbai', returnLocation: 'Same', startDate: '2026-07-09', startTime: '08:00', durationType: 'daily', hours: 0, days: 5, kmIncluded: 0, kmUsed: 420, baseRate: 17500, chauffeurCharge: 0, extrasCharge: 1500, totalFare: 19000, mode: 'self_drive', extras: ['GPS'], status: 'confirmed', assignedPlate: 'MH 02 AB 1234', driver: null, securityDeposit: 5000, region: 'IN', createdAt: '2026-07-07T16:00:00Z' },
  { id: 'RNT-499', customer: 'Sarah Johnson', phone: '+44 7700 900 456', vehicle: 'Mercedes C-Class', vehicleType: 'Premium', pickupLocation: 'Heathrow Airport T5', returnLocation: 'Same', startDate: '2026-07-08', startTime: '10:00', durationType: 'hourly', hours: 8, days: 0, kmIncluded: 80, kmUsed: 45, baseRate: 24000, chauffeurCharge: 2500, extrasCharge: 0, totalFare: 26500, mode: 'chauffeur', extras: [], status: 'active', assignedPlate: 'LC21 XYZ', driver: 'David Thompson', securityDeposit: 0, region: 'GB', createdAt: '2026-07-06T10:00:00Z' },
  { id: 'RNT-498', customer: 'Wei Lin Tan', phone: '+65 8123 4567', vehicle: 'Toyota HiAce Van', vehicleType: 'Van', pickupLocation: 'Changi Airport T1', returnLocation: 'Marina Bay', startDate: '2026-07-07', startTime: '14:00', durationType: 'hourly', hours: 4, days: 0, kmIncluded: 40, kmUsed: 38, baseRate: 10000, chauffeurCharge: 2000, extrasCharge: 0, totalFare: 12000, mode: 'chauffeur', extras: [], status: 'returned', assignedPlate: 'SBA 1234A', driver: 'Kumar S.', securityDeposit: 0, region: 'SG', createdAt: '2026-07-05T12:00:00Z' },
  { id: 'RNT-497', customer: 'Priya Menon', phone: '+91 87654 32100', vehicle: 'Range Rover Sport', vehicleType: 'Luxury', pickupLocation: 'MG Road, Bangalore', returnLocation: 'Same', startDate: '2026-07-05', startTime: '09:00', durationType: 'weekly', hours: 0, days: 7, kmIncluded: 0, kmUsed: 820, baseRate: 108000, chauffeurCharge: 21000, extrasCharge: 2400, totalFare: 131400, mode: 'chauffeur', extras: ['WiFi', 'Premium Insurance'], status: 'overdue', assignedPlate: 'KA 01 MN 5678', driver: 'Ravi K.', securityDeposit: 0, region: 'IN', createdAt: '2026-07-03T08:00:00Z' },
  { id: 'RNT-496', customer: 'Omar Al-Falasi', phone: '+971 50 123 4567', vehicle: 'Toyota Prado', vehicleType: 'SUV', pickupLocation: 'Dubai Mall Valet', returnLocation: 'DXB Airport T3', startDate: '2026-07-06', startTime: '07:00', durationType: 'daily', hours: 0, days: 7, kmIncluded: 0, kmUsed: 680, baseRate: 52500, chauffeurCharge: 0, extrasCharge: 3500, totalFare: 56000, mode: 'self_drive', extras: ['GPS', 'Child Seat'], status: 'active', assignedPlate: 'D 12345', driver: null, securityDeposit: 5000, region: 'AE', createdAt: '2026-07-04T14:00:00Z' },
  { id: 'RNT-495', customer: 'Ali Hassan', phone: '+973 3312 3456', vehicle: 'Toyota Corolla', vehicleType: 'Comfort', pickupLocation: 'Seef Mall, Manama', returnLocation: 'Same', startDate: '2026-07-07', startTime: '10:00', durationType: 'hourly', hours: 2, days: 0, kmIncluded: 20, kmUsed: 0, baseRate: 2400, chauffeurCharge: 0, extrasCharge: 0, totalFare: 2400, mode: 'self_drive', extras: [], status: 'cancelled', assignedPlate: null, driver: null, securityDeposit: 5000, region: 'BH', createdAt: '2026-07-05T09:00:00Z' },
  { id: 'RNT-494', customer: 'Mike Chen', phone: '+1 212 555 0199', vehicle: 'Toyota HiAce Van', vehicleType: 'Van', pickupLocation: 'JFK Airport', returnLocation: 'Same', startDate: '2026-07-08', startTime: '11:00', durationType: 'daily', hours: 0, days: 3, kmIncluded: 0, kmUsed: 0, baseRate: 27000, chauffeurCharge: 6000, extrasCharge: 800, totalFare: 33800, mode: 'chauffeur', extras: ['Premium Insurance'], status: 'confirmed', assignedPlate: 'NY-VAN-8812', driver: 'Carlos R.', securityDeposit: 0, region: 'US', createdAt: '2026-07-06T20:00:00Z' },
  { id: 'RNT-493', customer: 'Priya Patel', phone: '+91 711 888 999', vehicle: 'Toyota Fielder', vehicleType: 'Economy', pickupLocation: 'JKIA, Mumbai', returnLocation: 'Same', startDate: '2026-07-08', startTime: '06:00', durationType: 'hourly', hours: 12, days: 0, kmIncluded: 120, kmUsed: 95, baseRate: 9600, chauffeurCharge: 1500, extrasCharge: 0, totalFare: 11100, mode: 'chauffeur', extras: [], status: 'active', assignedPlate: 'KCA 111B', driver: 'Joseph M.', securityDeposit: 0, region: 'IN', createdAt: '2026-07-07T22:00:00Z' },
];

const STATUS_STYLES: Record<RentalStatus, { bg: string; label: string }> = {
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending' },
  confirmed: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmed' },
  active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active' },
  returned: { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Returned' },
  cancelled: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
  overdue: { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Overdue' },
};

const MODE_STYLES: Record<RentalMode, { bg: string; label: string; icon: string }> = {
  chauffeur: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: '👨‍✈️ Chauffeur', icon: '👨‍✈️' },
  self_drive: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: '🔑 Self-Drive', icon: '🔑' },
};

const DURATION_LABELS: Record<DurationType, string> = { hourly: '⏱️ Hourly', daily: '📅 Daily', weekly: '📆 Weekly' };

export default function AdminRentalsPage() {
  const { filtered: regionBookings, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(BOOKINGS);
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<RentalMode | 'all'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const bookings = useMemo(() => {
    let result = regionBookings;
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter);
    if (modeFilter !== 'all') result = result.filter(b => b.mode === modeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b => b.id.toLowerCase().includes(q) || b.customer.toLowerCase().includes(q) || b.vehicle.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [regionBookings, statusFilter, modeFilter, search]);

  const activeCount = regionBookings.filter(b => b.status === 'active').length;
  const pendingCount = regionBookings.filter(b => b.status === 'pending').length;
  const overdueCount = regionBookings.filter(b => b.status === 'overdue').length;
  const chauffeurCount = regionBookings.filter(b => b.mode === 'chauffeur' && !['cancelled', 'returned'].includes(b.status)).length;
  const selfDriveCount = regionBookings.filter(b => b.mode === 'self_drive' && !['cancelled', 'returned'].includes(b.status)).length;
  const revenue = regionBookings.filter(b => ['active', 'returned', 'confirmed'].includes(b.status)).reduce((s, b) => s + b.totalFare, 0);

  const getDurationLabel = (b: RentalBooking) => {
    if (b.durationType === 'hourly') return `${b.hours}h (${b.kmIncluded} km)`;
    if (b.durationType === 'weekly') return `${b.days / 7}w`;
    return `${b.days}d`;
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🚗 Car Rentals</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage chauffeur-driven and self-drive rentals {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <button onClick={() => showToast('Exporting rental report...')} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm"><Download className="w-4 h-4" /> Export</button>
      </div>

      {/* KPIs — 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Car },
          { label: 'Pending', value: pendingCount, color: pendingCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
          { label: 'Revenue', value: formatPrice(revenue), color: 'bg-blue-50 text-blue-700 border-blue-200', icon: DollarSign },
          { label: 'Chauffeur', value: chauffeurCount, color: 'bg-violet-50 text-violet-700 border-violet-200', icon: UserCheck },
          { label: 'Self-Drive', value: selfDriveCount, color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Key },
          { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: AlertTriangle },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-3 border ${kpi.color}`}><kpi.icon className="w-4 h-4 mb-1.5" /><p className="text-lg font-black">{kpi.value}</p><p className="text-[10px] font-medium opacity-70">{kpi.label}</p></div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings..." className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200" />
        </div>
        {/* Mode filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'chauffeur', 'self_drive'] as const).map(m => (
            <button key={m} onClick={() => setModeFilter(m)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${modeFilter === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {m === 'all' ? 'All Modes' : MODE_STYLES[m].label}
            </button>
          ))}
        </div>
        {/* Status filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'pending', 'confirmed', 'active', 'overdue', 'returned', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'all' ? 'All' : STATUS_STYLES[s as RentalStatus]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">No rental bookings match the current filters</div>
        ) : bookings.map(b => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Car className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-blue-600 font-bold">{b.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[b.status].bg}`}>{STATUS_STYLES[b.status].label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${MODE_STYLES[b.mode].bg}`}>{MODE_STYLES[b.mode].label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{DURATION_LABELS[b.durationType]}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{b.customer} <span className="text-slate-400 font-normal text-xs">· {b.phone}</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">{formatPrice(b.totalFare)}</p>
                <p className="text-xs text-slate-400">
                  {b.durationType === 'hourly' ? `${b.hours}h pkg` : b.durationType === 'weekly' ? `${Math.round(b.days / 7)}w` : `${b.days}d`}
                  {b.chauffeurCharge > 0 && ` · +${formatPrice(b.chauffeurCharge)} chauffeur`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-slate-600 mb-3">
              <div><span className="text-slate-400">Vehicle</span><p className="font-bold text-slate-800">{b.vehicle} ({b.vehicleType})</p></div>
              <div><span className="text-slate-400">Pickup</span><p className="font-medium">{b.pickupLocation}</p></div>
              <div><span className="text-slate-400">Start</span><p className="font-medium">{new Date(b.startDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} · {b.startTime}</p></div>
              <div>
                <span className="text-slate-400">{b.mode === 'chauffeur' ? 'Driver' : 'Deposit'}</span>
                <p className="font-medium">{b.mode === 'chauffeur' ? (b.driver || <span className="text-amber-500 italic">Unassigned</span>) : formatPrice(b.securityDeposit)}</p>
              </div>
              <div>
                <span className="text-slate-400">Plate / Return</span>
                <p className="font-medium">{b.assignedPlate || '—'} · {b.returnLocation}</p>
              </div>
            </div>

            {/* Hourly km usage bar */}
            {b.durationType === 'hourly' && b.kmIncluded > 0 && b.status === 'active' && (
              <div className="mb-3 bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 flex items-center gap-1"><Gauge className="w-3 h-3" />KM Usage</span>
                  <span className={`font-bold ${b.kmUsed > b.kmIncluded ? 'text-red-600' : 'text-slate-700'}`}>{b.kmUsed}/{b.kmIncluded} km</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <ProgressBar value={Math.min(100, (b.kmUsed / b.kmIncluded) * 100)} className={`h-full rounded-full transition-all ${b.kmUsed > b.kmIncluded * 0.9 ? 'bg-red-500' : b.kmUsed > b.kmIncluded * 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </div>
                {b.kmUsed > b.kmIncluded && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ {b.kmUsed - b.kmIncluded} km over limit — extra charges apply</p>}
              </div>
            )}

            {/* Extras */}
            {b.extras.length > 0 && (
              <div className="flex gap-1 mb-3">
                {b.extras.map(e => <span key={e} className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200">{e}</span>)}
                {b.extrasCharge > 0 && <span className="text-[10px] text-slate-400 self-center ml-1">+{formatPrice(b.extrasCharge)}</span>}
              </div>
            )}

            {/* Cancellation Policy + Compliance + Audit Trail toggle */}
            <div className="mb-3">
              <button onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                {expandedBooking === b.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandedBooking === b.id ? 'Hide' : 'Show'} Compliance, Policies & Audit
              </button>
            </div>

            {expandedBooking === b.id && (() => {
              const countryConfig = getCountryConfig(b.region);
              const policyLines = formatCancellationPolicy(b.mode === 'chauffeur' ? countryConfig.rentalCancellation : countryConfig.rentalCancellation, countryConfig.pricing.currencySymbol);
              const compChecks = getRequiredComplianceChecks(countryConfig, b.mode, false);
              return (
                <div className="space-y-3 mb-3">
                  {/* Cancellation Policy */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1.5">📋 {countryConfig.flag} {countryConfig.countryName} Cancellation Policy</p>
                    <ul className="space-y-0.5">
                      {policyLines.map((line, i) => <li key={i} className="text-[10px] text-amber-700">{line}</li>)}
                    </ul>
                    {countryConfig.pricing.taxRate > 0 && <p className="text-[10px] text-amber-600 mt-1 font-bold">💰 {countryConfig.pricing.taxLabel} applicable on total fare</p>}
                  </div>

                  {/* Compliance Panel */}
                  <RentalCompliancePanel
                    checks={compChecks}
                    countryConfig={countryConfig}
                    bookingId={b.id}
                    mode="admin"
                    defaultExpanded={true}
                  />

                  {/* Audit Trail */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Booking History</p>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 shrink-0" />
                        <div><span className="font-bold text-slate-700">Booking created</span><span className="text-slate-400 ml-1">{new Date(b.createdAt).toLocaleString()}</span></div>
                      </div>
                      {b.status !== 'pending' && (
                        <div className="flex items-start gap-2 text-[10px]">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1 shrink-0" />
                          <div><span className="font-bold text-slate-700">{b.status === 'cancelled' ? 'Booking cancelled' : b.status === 'confirmed' ? 'Booking confirmed' : b.status === 'active' ? 'Rental started' : b.status === 'returned' ? 'Vehicle returned' : 'Status updated'}</span><span className="text-slate-400 ml-1">{new Date(new Date(b.createdAt).getTime() + 3600000).toLocaleString()}</span>{b.driver && <span className="text-violet-600 ml-1">· Driver: {b.driver}</span>}{b.assignedPlate && <span className="text-blue-600 ml-1">· Plate: {b.assignedPlate}</span>}</div>
                        </div>
                      )}
                      {['active', 'returned', 'overdue'].includes(b.status) && (
                        <div className="flex items-start gap-2 text-[10px]">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${b.status === 'overdue' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                          <div><span className="font-bold text-slate-700">{b.mode === 'self_drive' ? 'Keys handed over' : 'Driver dispatched'}</span><span className="text-slate-400 ml-1">{new Date(new Date(b.createdAt).getTime() + 7200000).toLocaleString()}</span>{b.mode === 'self_drive' && b.securityDeposit > 0 && <span className="text-cyan-600 ml-1">· Deposit {formatPrice(b.securityDeposit)} held</span>}</div>
                        </div>
                      )}
                      {b.status === 'returned' && (
                        <div className="flex items-start gap-2 text-[10px]">
                          <div className="w-1.5 h-1.5 bg-slate-500 rounded-full mt-1 shrink-0" />
                          <div><span className="font-bold text-slate-700">{b.mode === 'self_drive' ? 'Keys collected, deposit released' : 'Trip completed'}</span><span className="text-slate-400 ml-1">{new Date(new Date(b.createdAt).getTime() + 86400000).toLocaleString()}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            {['pending', 'confirmed'].includes(b.status) && (
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                {b.status === 'pending' && (
                  <>
                    <button onClick={() => showToast(`${b.id} confirmed — ${b.mode === 'chauffeur' ? 'assigning driver...' : 'vehicle reserved'}`)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><CheckCircle className="w-3.5 h-3.5" /> {b.mode === 'chauffeur' ? 'Confirm & Assign Driver' : 'Confirm & Reserve'}</button>
                    {b.mode === 'self_drive' && <button onClick={() => showToast('Requesting license verification...')} className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"><Shield className="w-3.5 h-3.5" /> Verify License</button>}
                  </>
                )}
                {b.status === 'confirmed' && (
                  <button onClick={() => showToast(`${b.id} marked as active`)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Key className="w-3.5 h-3.5" /> {b.mode === 'chauffeur' ? 'Dispatch Driver' : 'Hand Over Keys'}</button>
                )}
                <button onClick={() => showToast(`Notification sent to ${b.customer}`)} className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Notify</button>
                <button onClick={() => showToast(`${b.id} cancelled`)} className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-auto"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
              </div>
            )}
            {b.status === 'active' && (
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => showToast(`${b.id} marked as returned`)} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><CheckCircle className="w-3.5 h-3.5" /> {b.mode === 'self_drive' ? 'Collect Keys & Return' : 'Complete Trip'}</button>
                {b.durationType === 'hourly' && <button onClick={() => showToast(`${b.id} extended by 1 hour`)} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"><Timer className="w-3.5 h-3.5" /> Extend</button>}
                {b.mode === 'self_drive' && b.securityDeposit > 0 && <span className="text-[10px] text-slate-400 ml-auto">Deposit: {formatPrice(b.securityDeposit)} held</span>}
              </div>
            )}
            {b.status === 'overdue' && (
              <div className="flex items-center gap-2 pt-3 border-t border-orange-100 bg-orange-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-orange-700">{b.mode === 'self_drive' ? 'Vehicle not returned — contact customer & consider deposit forfeiture' : 'Trip overdue — contact driver for status'}</span>
                <button onClick={() => showToast(`Calling ${b.customer}...`)} className="ml-auto text-xs font-bold text-orange-700 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors">Call</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
