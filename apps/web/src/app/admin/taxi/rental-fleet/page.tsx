'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  Car, CheckCircle, XCircle, Wrench, Shield, Calendar, DollarSign,
  Search, Clock, AlertTriangle, Eye, Plus, BarChart3, Users,
  Key, MapPin, ArrowRight, Timer, Fuel, FileText, ChevronDown,
  ChevronUp, RefreshCw, Globe
} from 'lucide-react';
import { getCountryConfig } from '@/lib/config/rental-policies';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ─────────────────────────────────────────────────────────────────

type FleetStatus = 'available' | 'rented' | 'maintenance' | 'reserved';
type TabView = 'overview' | 'bookings' | 'compliance' | 'analytics';

interface RentalVehicle {
  id: string; name: string; type: string; plate: string;
  vendor: string; vendorId: string;
  dailyRate: number; hourlyRate: number;
  status: FleetStatus;
  currentBooking: string | null; customerName: string | null;
  returnDate: string | null;
  lastService: string; insuranceExpiry: string;
  mileage: string; condition: 'excellent' | 'good' | 'fair';
  region: string; fuelLevel: number;
  documentsValid: boolean; gpsActive: boolean;
  totalRevenue: number; totalTrips: number;
}

interface LiveBooking {
  id: string; vehicleId: string; vehicleName: string; plate: string;
  customer: string; phone: string; mode: 'chauffeur' | 'self_drive';
  startDate: string; endDate: string; status: 'active' | 'upcoming' | 'overdue' | 'returning_today';
  vendor: string; region: string;
  totalFare: number; deposit: number; depositStatus: 'held' | 'released' | 'partial';
  documentsVerified: boolean; licenseVerified: boolean; idVerified: boolean;
}

// ── Data ──────────────────────────────────────────────────────────────────

const VEHICLES: RentalVehicle[] = [
  { id: 'V-01', name: 'Toyota Fielder', type: 'Economy', plate: 'MH 02 AB 1234', vendor: 'Safari Rides IN', vendorId: 'VND-01', dailyRate: 3500, hourlyRate: 800, status: 'rented', currentBooking: 'RNT-500', customerName: 'Priya Patel', returnDate: '2026-07-14', lastService: '2026-06-15', insuranceExpiry: '2026-12-31', mileage: '45,200 km', condition: 'good', region: 'IN', fuelLevel: 82, documentsValid: true, gpsActive: true, totalRevenue: 234500, totalTrips: 67 },
  { id: 'V-02', name: 'Toyota Prado', type: 'SUV', plate: 'MH 04 CD 5678', vendor: 'Safari Rides IN', vendorId: 'VND-01', dailyRate: 7500, hourlyRate: 2000, status: 'available', currentBooking: null, customerName: null, returnDate: null, lastService: '2026-06-20', insuranceExpiry: '2027-03-15', mileage: '28,100 km', condition: 'excellent', region: 'IN', fuelLevel: 95, documentsValid: true, gpsActive: true, totalRevenue: 255000, totalTrips: 34 },
  { id: 'V-03', name: 'Mercedes C-Class', type: 'Premium', plate: 'KA 01 MN 5678', vendor: 'DriveIndia Pro', vendorId: 'VND-02', dailyRate: 12000, hourlyRate: 3000, status: 'rented', currentBooking: 'RNT-497', customerName: 'Vikram Singh', returnDate: '2026-07-09', lastService: '2026-05-10', insuranceExpiry: '2026-08-20', mileage: '15,800 km', condition: 'excellent', region: 'IN', fuelLevel: 70, documentsValid: true, gpsActive: true, totalRevenue: 180000, totalTrips: 15 },
  { id: 'V-04', name: 'Toyota HiAce Van', type: 'Van', plate: 'SBA 1234A', vendor: 'SG Premier', vendorId: 'VND-03', dailyRate: 9000, hourlyRate: 2500, status: 'available', currentBooking: null, customerName: null, returnDate: null, lastService: '2026-06-25', insuranceExpiry: '2027-01-10', mileage: '62,300 km', condition: 'good', region: 'SG', fuelLevel: 88, documentsValid: true, gpsActive: true, totalRevenue: 450000, totalTrips: 50 },
  { id: 'V-05', name: 'Toyota Fielder', type: 'Economy', plate: 'D 12345', vendor: 'Emirates Drive', vendorId: 'VND-04', dailyRate: 3500, hourlyRate: 800, status: 'rented', currentBooking: 'RNT-496', customerName: 'Omar Al-Falasi', returnDate: '2026-07-13', lastService: '2026-06-18', insuranceExpiry: '2027-02-28', mileage: '38,500 km', condition: 'good', region: 'AE', fuelLevel: 55, documentsValid: true, gpsActive: true, totalRevenue: 98000, totalTrips: 28 },
  { id: 'V-06', name: 'Mercedes C-Class', type: 'Premium', plate: 'LC21 XYZ', vendor: 'London Premier', vendorId: 'VND-05', dailyRate: 12000, hourlyRate: 3000, status: 'rented', currentBooking: 'RNT-499', customerName: 'Sarah Johnson', returnDate: '2026-07-10', lastService: '2026-06-01', insuranceExpiry: '2027-04-30', mileage: '12,200 km', condition: 'excellent', region: 'GB', fuelLevel: 75, documentsValid: true, gpsActive: true, totalRevenue: 360000, totalTrips: 30 },
  { id: 'V-07', name: 'Toyota Prado', type: 'SUV', plate: 'MH 01 CD 9999', vendor: 'DriveIndia Pro', vendorId: 'VND-02', dailyRate: 7500, hourlyRate: 2000, status: 'maintenance', currentBooking: null, customerName: null, returnDate: null, lastService: '2026-07-05', insuranceExpiry: '2027-01-15', mileage: '55,100 km', condition: 'fair', region: 'IN', fuelLevel: 40, documentsValid: false, gpsActive: true, totalRevenue: 112500, totalTrips: 15 },
  { id: 'V-08', name: 'Toyota HiAce Van', type: 'Van', plate: 'NY-VAN-8812', vendor: 'NYC Fleet', vendorId: 'VND-06', dailyRate: 9000, hourlyRate: 2500, status: 'reserved', currentBooking: 'RNT-494', customerName: 'Mike Chen', returnDate: null, lastService: '2026-06-28', insuranceExpiry: '2026-11-20', mileage: '41,700 km', condition: 'good', region: 'US', fuelLevel: 100, documentsValid: true, gpsActive: true, totalRevenue: 135000, totalTrips: 15 },
  { id: 'V-09', name: 'Suzuki Swift', type: 'Economy', plate: 'LAG 456 XY', vendor: 'Lagos Express', vendorId: 'VND-07', dailyRate: 2800, hourlyRate: 700, status: 'available', currentBooking: null, customerName: null, returnDate: null, lastService: '2026-06-20', insuranceExpiry: '2027-06-30', mileage: '22,100 km', condition: 'excellent', region: 'NG', fuelLevel: 80, documentsValid: true, gpsActive: false, totalRevenue: 67200, totalTrips: 24 },
];

const LIVE_BOOKINGS: LiveBooking[] = [
  { id: 'RNT-500', vehicleId: 'V-01', vehicleName: 'Toyota Fielder', plate: 'MH 02 AB 1234', customer: 'Priya Patel', phone: '+91 711 888 999', mode: 'chauffeur', startDate: '2026-07-08', endDate: '2026-07-14', status: 'active', vendor: 'Safari Rides IN', region: 'IN', totalFare: 24500, deposit: 0, depositStatus: 'released', documentsVerified: true, licenseVerified: true, idVerified: true },
  { id: 'RNT-496', vehicleId: 'V-05', vehicleName: 'Toyota Fielder', plate: 'D 12345', customer: 'Omar Al-Falasi', phone: '+971 50 123 4567', mode: 'self_drive', startDate: '2026-07-06', endDate: '2026-07-13', status: 'active', vendor: 'Emirates Drive', region: 'AE', totalFare: 56000, deposit: 5000, depositStatus: 'held', documentsVerified: true, licenseVerified: true, idVerified: true },
  { id: 'RNT-497', vehicleId: 'V-03', vehicleName: 'Mercedes C-Class', plate: 'KA 01 MN 5678', customer: 'Vikram Singh', phone: '+91 98765 43210', mode: 'chauffeur', startDate: '2026-07-07', endDate: '2026-07-09', status: 'returning_today', vendor: 'DriveIndia Pro', region: 'IN', totalFare: 28500, deposit: 10000, depositStatus: 'held', documentsVerified: true, licenseVerified: true, idVerified: true },
  { id: 'RNT-499', vehicleId: 'V-06', vehicleName: 'Mercedes C-Class', plate: 'LC21 XYZ', customer: 'Sarah Johnson', phone: '+44 7700 900 456', mode: 'chauffeur', startDate: '2026-07-08', endDate: '2026-07-10', status: 'active', vendor: 'London Premier', region: 'GB', totalFare: 26500, deposit: 0, depositStatus: 'released', documentsVerified: true, licenseVerified: true, idVerified: true },
  { id: 'RNT-494', vehicleId: 'V-08', vehicleName: 'Toyota HiAce Van', plate: 'NY-VAN-8812', customer: 'Mike Chen', phone: '+1 212 555 0199', mode: 'chauffeur', startDate: '2026-07-09', endDate: '2026-07-12', status: 'upcoming', vendor: 'NYC Fleet', region: 'US', totalFare: 33800, deposit: 0, depositStatus: 'released', documentsVerified: false, licenseVerified: false, idVerified: false },
  { id: 'RNT-503', vehicleId: 'V-01', vehicleName: 'Toyota Fielder', plate: 'DL 01 CA 5678', customer: 'Suresh Nair', phone: '+91 722 345 678', mode: 'self_drive', startDate: '2026-07-09', endDate: '2026-07-14', status: 'upcoming', vendor: 'Safari Rides IN', region: 'IN', totalFare: 19000, deposit: 5000, depositStatus: 'held', documentsVerified: true, licenseVerified: true, idVerified: true },
];

const STATUS_STYLES: Record<FleetStatus, { bg: string; label: string; icon: typeof Car }> = {
  available: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Available', icon: CheckCircle },
  rented: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Rented Out', icon: Car },
  maintenance: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Maintenance', icon: Wrench },
  reserved: { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Reserved', icon: Calendar }
};

const BOOKING_STATUS: Record<string, { bg: string; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', label: '🟢 Active' },
  upcoming: { bg: 'bg-blue-100 text-blue-700', label: '🔵 Upcoming' },
  overdue: { bg: 'bg-red-100 text-red-700', label: '🔴 Overdue' },
  returning_today: { bg: 'bg-amber-100 text-amber-700', label: '🟡 Returning Today' }
};

// ── Component ─────────────────────────────────────────────────────────────

export default function AdminRentalFleetPage() {
  const { filtered: vehicles, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(VEHICLES);
  const [tab, setTab] = useState<TabView>('overview');
  const [statusFilter, setStatusFilter] = useState<FleetStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const searched = useMemo(() => {
    let list = statusFilter === 'all' ? vehicles : vehicles.filter(v => v.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.vendor.toLowerCase().includes(q));
    }
    return list;
  }, [vehicles, statusFilter, search]);

  const availableCount = vehicles.filter(v => v.status === 'available').length;
  const rentedCount = vehicles.filter(v => v.status === 'rented').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'maintenance').length;
  const utilizationRate = vehicles.length > 0 ? Math.round(((rentedCount + vehicles.filter(v => v.status === 'reserved').length) / vehicles.length) * 100) : 0;
  const totalRevenue = vehicles.reduce((s, v) => s + v.totalRevenue, 0);
  const expiringInsurance = vehicles.filter(v => new Date(v.insuranceExpiry) < new Date('2026-09-01')).length;
  const docsIssues = vehicles.filter(v => !v.documentsValid).length;
  const gpsOffline = vehicles.filter(v => !v.gpsActive).length;

  const bookings = LIVE_BOOKINGS.filter(b => !isFiltered || vehicles.some(v => v.id === b.vehicleId));
  const activeBookings = bookings.filter(b => b.status === 'active').length;
  const returningToday = bookings.filter(b => b.status === 'returning_today').length;
  const pendingDocs = bookings.filter(b => !b.documentsVerified).length;

  const uniqueVendors = [...new Set(vehicles.map(v => v.vendor))];
  const uniqueRegions = [...new Set(vehicles.map(v => v.region))];

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" />{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🚙 Rental Fleet Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cross-vendor fleet overview, real-time bookings, and compliance monitoring {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <button onClick={() => showToast('🔄 Fleet data refreshed')} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'Total Fleet', value: vehicles.length, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Car },
          { label: 'Available', value: availableCount, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
          { label: 'Rented', value: rentedCount, bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Key },
          { label: 'Utilization', value: `${utilizationRate}%`, bg: utilizationRate > 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200', icon: BarChart3 },
          { label: 'Revenue', value: formatPrice(totalRevenue), bg: 'bg-violet-50 text-violet-700 border-violet-200', icon: DollarSign },
          { label: 'Active Books', value: activeBookings, bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
          { label: 'Returning Today', value: returningToday, bg: returningToday > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200', icon: Timer },
          { label: 'Alerts', value: expiringInsurance + docsIssues + gpsOffline, bg: (expiringInsurance + docsIssues + gpsOffline) > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: AlertTriangle },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-2.5 border ${kpi.bg}`}><kpi.icon className="w-3.5 h-3.5 mb-1" /><p className="text-sm font-black">{kpi.value}</p><p className="text-[9px] font-medium opacity-70">{kpi.label}</p></div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {([['overview', '📋 Fleet Overview'], ['bookings', '🔑 Live Bookings'], ['compliance', '🛡️ Compliance'], ['analytics', '📊 Analytics']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 px-4 py-2 rounded-md text-xs font-bold transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {/* ═══ FLEET OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles, plates, vendors..." className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(['all', 'available', 'rented', 'reserved', 'maintenance'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {s === 'all' ? 'All' : STATUS_STYLES[s as FleetStatus]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase text-left">
                  <th className="px-4 py-3">Vehicle</th><th className="px-3 py-3">Vendor</th>
                  <th className="px-3 py-3">Region</th><th className="px-3 py-3 text-right">Daily</th>
                  <th className="px-3 py-3">Condition</th><th className="px-3 py-3">Fuel</th>
                  <th className="px-3 py-3">GPS</th><th className="px-3 py-3">Booking</th>
                  <th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  {searched.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No vehicles match filters</td></tr>
                  ) : searched.map(v => {
                    const st = STATUS_STYLES[v.status];
                    const insuranceExpiring = new Date(v.insuranceExpiry) < new Date('2026-09-01');
                    return (
                      <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-sm text-slate-800">{v.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{v.plate} · {v.type}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">{v.vendor}</td>
                        <td className="px-3 py-3"><CountryFlag code={v.region} size="sm" /></td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs">{formatPrice(v.dailyRate)}</td>
                        <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${v.condition === 'excellent' ? 'bg-emerald-100 text-emerald-700' : v.condition === 'good' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{v.condition}</span></td>
                        <td className="px-3 py-3">
                          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <ProgressBar value={v.fuelLevel} className={`h-full rounded-full ${v.fuelLevel > 50 ? 'bg-emerald-500' : v.fuelLevel > 25 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          </div>
                        </td>
                        <td className="px-3 py-3"><span className={`w-2 h-2 rounded-full inline-block ${v.gpsActive ? 'bg-emerald-500' : 'bg-red-500'}`} /></td>
                        <td className="px-3 py-3 text-xs">{v.currentBooking ? <span className="font-bold text-blue-600">{v.currentBooking}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg}`}>{st.label}</span></td>
                        <td className="px-3 py-3">
                          <button title="View vehicle details" onClick={() => showToast(`Viewing ${v.plate}`)} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"><Eye className="w-3.5 h-3.5" /></button>
                          {insuranceExpiring && <span className="text-[9px] text-red-500 font-bold ml-1">⚠️</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>Showing {searched.length} of {vehicles.length} vehicles across {uniqueVendors.length} vendors, {uniqueRegions.length} regions</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIVE BOOKINGS ═══ */}
      {tab === 'bookings' && (
        <div className="space-y-4">
          {/* Booking Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(BOOKING_STATUS).map(([key, val]) => {
              const count = bookings.filter(b => b.status === key).length;
              return (
                <div key={key} className={`rounded-xl p-3 ${val.bg} border border-transparent`}>
                  <p className="text-[10px] font-medium opacity-70">{val.label}</p>
                  <p className="text-xl font-black">{count}</p>
                </div>
              );
            })}
          </div>

          {/* Booking Cards */}
          <div className="space-y-3">
            {bookings.sort((a, b) => {
              const order = { returning_today: 0, overdue: 1, active: 2, upcoming: 3 };
              return (order[a.status] || 9) - (order[b.status] || 9);
            }).map(b => {
              const bst = BOOKING_STATUS[b.status];
              const config = getCountryConfig(b.region);
              return (
                <div key={b.id} className={`bg-white border rounded-xl p-4 ${b.status === 'returning_today' ? 'border-amber-300 shadow-amber-100 shadow-sm' : b.status === 'overdue' ? 'border-red-300' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{b.mode === 'self_drive' ? '🔑' : '👨‍✈️'}</div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{b.customer}</h3>
                        <p className="text-[10px] text-slate-400">{b.phone} · {b.vendor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bst.bg}`}>{bst.label}</span>
                      <p className="text-xs font-mono font-bold text-slate-700 mt-1">{b.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs mb-3">
                    <div><span className="text-slate-400">Vehicle</span><p className="font-bold">{b.vehicleName}</p></div>
                    <div><span className="text-slate-400">Plate</span><p className="font-mono font-bold">{b.plate}</p></div>
                    <div><span className="text-slate-400">Region</span><p className="font-bold">{config.flag} {config.countryName}</p></div>
                    <div><span className="text-slate-400">Period</span><p className="font-medium">{new Date(b.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })} → {new Date(b.endDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p></div>
                    <div><span className="text-slate-400">Total Fare</span><p className="font-black text-emerald-600">{formatPrice(b.totalFare)}</p></div>
                    <div><span className="text-slate-400">Deposit</span><p className={`font-bold ${b.depositStatus === 'held' ? 'text-amber-600' : 'text-slate-400'}`}>{b.deposit > 0 ? `${formatPrice(b.deposit)} (${b.depositStatus})` : '—'}</p></div>
                  </div>

                  {/* Customer Verification Status */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.idVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.idVerified ? '✅' : '❌'} ID</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.licenseVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.licenseVerified ? '✅' : '❌'} License</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.documentsVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.documentsVerified ? '✅' : '❌'} Docs</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{b.mode === 'self_drive' ? '🔑 Self-Drive' : '👨‍✈️ Chauffeur'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {b.status === 'returning_today' && <button onClick={() => showToast(`Processing return for ${b.id}`)} className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg">Process Return</button>}
                    {b.status === 'upcoming' && !b.documentsVerified && <button onClick={() => showToast(`Requesting docs from ${b.customer}`)} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg">Request Docs</button>}
                    {b.status === 'active' && b.depositStatus === 'held' && <button onClick={() => showToast(`Deposit released for ${b.id}`)} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg">Release Deposit</button>}
                    <button onClick={() => showToast(`Contacting ${b.customer}`)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg ml-auto">Contact</button>
                    <button onClick={() => showToast(`Viewing ${b.id} details`)} className="text-xs font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded-lg"><Eye className="w-3 h-3 inline" /> View</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ COMPLIANCE ═══ */}
      {tab === 'compliance' && (
        <div className="space-y-4">
          {/* Issues Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Insurance Expiring', value: expiringInsurance, bg: expiringInsurance > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Shield },
              { label: 'Documents Issues', value: docsIssues, bg: docsIssues > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileText },
              { label: 'GPS Offline', value: gpsOffline, bg: gpsOffline > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: MapPin },
              { label: 'Pending Verification', value: pendingDocs, bg: pendingDocs > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users },
            ].map((kpi, i) => (
              <div key={i} className={`rounded-xl p-4 border ${kpi.bg}`}><kpi.icon className="w-5 h-5 mb-2" /><p className="text-xl font-black">{kpi.value}</p><p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p></div>
            ))}
          </div>

          {/* Insurance Tracker */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> Insurance Compliance</h3>
            <div className="space-y-2">
              {vehicles.sort((a, b) => new Date(a.insuranceExpiry).getTime() - new Date(b.insuranceExpiry).getTime()).map(v => {
                const daysLeft = Math.ceil((new Date(v.insuranceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft < 60;
                return (
                  <div key={v.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}>
                    <CountryFlag code={v.region} size="sm" />
                    <span className="font-bold w-28">{v.name}</span>
                    <span className="font-mono text-slate-400 w-24">{v.plate}</span>
                    <span className="text-slate-500 flex-1">{v.vendor}</span>
                    <span className="text-slate-500">{new Date(v.insuranceExpiry).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${isUrgent ? 'bg-red-100 text-red-700' : daysLeft < 180 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{daysLeft}d</span>
                    {isUrgent && <button onClick={() => showToast(`Renewal alert sent to ${v.vendor}`)} className="text-[10px] font-bold text-red-600 hover:bg-red-100 px-2 py-1 rounded">Alert Vendor</button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Document Verification */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-violet-500" /> Customer Document Verification</h3>
            <div className="space-y-2">
              {bookings.map(b => (
                <div key={b.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-xs ${!b.documentsVerified ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}>
                  <span className="font-mono font-bold text-blue-600 w-16">{b.id}</span>
                  <span className="font-bold w-28">{b.customer}</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[9px] ${b.idVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.idVerified ? '✅' : '❌'} ID</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[9px] ${b.licenseVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.licenseVerified ? '✅' : '❌'} License</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[9px] ${b.documentsVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.documentsVerified ? '✅' : '❌'} Docs</span>
                  <span className="text-slate-500 flex-1">{b.vendor}</span>
                  {!b.documentsVerified && <button onClick={() => showToast(`Verification request sent to ${b.customer}`)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-100 px-2 py-1 rounded">Request Docs</button>}
                  {b.documentsVerified && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          {/* Vendor Performance */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-500" /> Vendor Performance</h3>
            <div className="space-y-3">
              {uniqueVendors.map(vendor => {
                const vVehicles = vehicles.filter(v => v.vendor === vendor);
                const vRevenue = vVehicles.reduce((s, v) => s + v.totalRevenue, 0);
                const vTrips = vVehicles.reduce((s, v) => s + v.totalTrips, 0);
                const vRented = vVehicles.filter(v => v.status === 'rented' || v.status === 'reserved').length;
                const vUtil = vVehicles.length > 0 ? Math.round((vRented / vVehicles.length) * 100) : 0;
                const region = vVehicles[0]?.region || 'IN';
                return (
                  <div key={vendor} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <CountryFlag code={region} size="sm" />
                    <div className="w-36">
                      <p className="text-xs font-bold text-slate-800">{vendor}</p>
                      <p className="text-[10px] text-slate-400">{vVehicles.length} vehicles</p>
                    </div>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                      <ProgressBar value={vUtil} className="h-full bg-linear-to-r from-blue-500 to-violet-500 rounded-full" />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mix-blend-difference">{vUtil}% utilization</span>
                    </div>
                    <div className="text-right w-28">
                      <p className="text-xs font-black text-emerald-600">{formatPrice(vRevenue)}</p>
                      <p className="text-[10px] text-slate-400">{vTrips} trips</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Region Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Revenue by Region</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {uniqueRegions.map(region => {
                const rVehicles = vehicles.filter(v => v.region === region);
                const rRevenue = rVehicles.reduce((s, v) => s + v.totalRevenue, 0);
                const config = getCountryConfig(region);
                return (
                  <div key={region} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CountryFlag code={region} size="md" />
                      <span className="text-xs font-bold text-slate-700">{config.countryName}</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{formatPrice(rRevenue)}</p>
                    <p className="text-[10px] text-slate-400">{rVehicles.length} vehicles · {rVehicles.reduce((s, v) => s + v.totalTrips, 0)} trips</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle Type Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Vehicle Type Distribution</h3>
            <div className="flex gap-3 flex-wrap">
              {['Economy', 'Comfort', 'SUV', 'Premium', 'Luxury', 'Van'].map(type => {
                const count = vehicles.filter(v => v.type === type).length;
                if (count === 0) return null;
                const icon = type === 'Economy' ? '🚗' : type === 'SUV' ? '🚙' : type === 'Premium' ? '🚘' : type === 'Van' ? '🚐' : type === 'Comfort' ? '🚙' : '🚗';
                return (
                  <div key={type} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 text-center">
                    <span className="text-2xl">{icon}</span>
                    <p className="text-xs font-bold mt-1">{type}</p>
                    <p className="text-lg font-black text-slate-900">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
