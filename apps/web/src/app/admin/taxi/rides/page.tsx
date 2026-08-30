'use client';

import React, { useState, useMemo } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import {
  Car, Clock, MapPin, Navigation, Search, Filter, ChevronDown,
  Eye, Ban, RefreshCw, Phone, Star, CheckCircle, XCircle,
  AlertTriangle, Loader2, ArrowUpDown, Download, Users,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ────────────────────────────────────────────────────────────────────

type RideStatus = 'searching' | 'assigned' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';

interface Ride {
  id: string;
  customer: string;
  driver: string | null;
  vendor: string | null;
  pickup: string;
  drop: string;
  vehicleType: string;
  status: RideStatus;
  fare: number;
  payment: string;
  surge: number;
  rating: number | null;
  createdAt: string;
  duration: string | null;
  distance: string | null;
  region: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const ALL_RIDES: Ride[] = [
  { id: 'RIDE-9201', customer: 'Rahul Mehta', driver: 'Suresh Kumar', vendor: 'FastCab Fleet', pickup: 'Connaught Place, Delhi', drop: 'IGI Airport T3', vehicleType: 'Sedan', status: 'in_progress', fare: 580, payment: 'UPI', surge: 1.2, rating: null, createdAt: '2026-07-08T14:22:00Z', duration: null, distance: null, region: 'IN' },
  { id: 'RIDE-9200', customer: 'Fatima Al-Rashid', driver: 'Mohammed Saleh', vendor: null, pickup: 'Dubai Mall', drop: 'JBR Beach', vehicleType: 'Premium', status: 'in_progress', fare: 85, payment: 'Card', surge: 1.0, rating: null, createdAt: '2026-07-08T14:18:00Z', duration: null, distance: null, region: 'AE' },
  { id: 'RIDE-9199', customer: 'Suresh Nair', driver: 'Peter Kamau', vendor: 'Safari Cabs', pickup: 'Westlands, Mumbai', drop: 'JKIA Airport', vehicleType: 'Economy', status: 'completed', fare: 1200, payment: 'UPI', surge: 1.0, rating: 5, createdAt: '2026-07-08T13:45:00Z', duration: '42 min', distance: '28.4 km', region: 'IN' },
  { id: 'RIDE-9198', customer: 'Priya Nair', driver: 'Rajesh Patil', vendor: 'Metro Rides', pickup: 'Bandra Station', drop: 'BKC Complex', vehicleType: 'Auto', status: 'completed', fare: 120, payment: 'Cash', surge: 1.0, rating: 4, createdAt: '2026-07-08T13:30:00Z', duration: '18 min', distance: '5.2 km', region: 'IN' },
  { id: 'RIDE-9197', customer: 'Ahmad Al-Dosari', driver: null, vendor: null, pickup: 'King Fahd Road, Riyadh', drop: 'Diplomatic Quarter', vehicleType: 'Comfort', status: 'searching', fare: 45, payment: 'mada', surge: 1.5, rating: null, createdAt: '2026-07-08T14:25:00Z', duration: null, distance: null, region: 'SA' },
  { id: 'RIDE-9196', customer: 'Wei Lin Tan', driver: 'Rajan Pillai', vendor: null, pickup: 'Orchard MRT', drop: 'Changi Airport T1', vehicleType: 'Premium', status: 'completed', fare: 42, payment: 'GrabPay', surge: 1.0, rating: 5, createdAt: '2026-07-08T12:50:00Z', duration: '28 min', distance: '22.1 km', region: 'SG' },
  { id: 'RIDE-9195', customer: 'Sarah Johnson', driver: 'David Brown', vendor: 'London Exec Cars', pickup: 'King\'s Cross Station', drop: 'Heathrow T5', vehicleType: 'Exec', status: 'completed', fare: 68, payment: 'Card', surge: 1.3, rating: 5, createdAt: '2026-07-08T11:20:00Z', duration: '55 min', distance: '30.8 km', region: 'GB' },
  { id: 'RIDE-9194', customer: 'Ali Hassan', driver: 'Omar Yusuf', vendor: null, pickup: 'Seef Mall, Manama', drop: 'Bahrain Airport', vehicleType: 'Economy', status: 'completed', fare: 5, payment: 'BenefitPay', surge: 1.0, rating: 4, createdAt: '2026-07-08T10:05:00Z', duration: '20 min', distance: '12.3 km', region: 'BH' },
  { id: 'RIDE-9193', customer: 'Neha Rajput', driver: null, vendor: null, pickup: 'Andheri West', drop: 'Powai', vehicleType: 'Mini', status: 'cancelled', fare: 0, payment: 'Wallet', surge: 1.0, rating: null, createdAt: '2026-07-08T09:40:00Z', duration: null, distance: null, region: 'IN' },
  { id: 'RIDE-9192', customer: 'Mike Chen', driver: 'Carlos Rivera', vendor: null, pickup: 'Times Square, NYC', drop: 'JFK Airport', vehicleType: 'XL', status: 'completed', fare: 78, payment: 'Card', surge: 1.8, rating: 3, createdAt: '2026-07-08T08:15:00Z', duration: '65 min', distance: '26.5 km', region: 'US' },
  { id: 'RIDE-9191', customer: 'Khalid Al-Mutairi', driver: 'Badr Nasser', vendor: 'Kuwait Express', pickup: 'Avenues Mall', drop: 'Kuwait Airport', vehicleType: 'Comfort', status: 'completed', fare: 8, payment: 'KNET', surge: 1.0, rating: 5, createdAt: '2026-07-08T07:30:00Z', duration: '25 min', distance: '18.7 km', region: 'KW' },
  { id: 'RIDE-9190', customer: 'Aisha Al-Balushi', driver: 'Salim Said', vendor: null, pickup: 'Muscat City Centre', drop: 'Sultan Qaboos Port', vehicleType: 'Economy', status: 'completed', fare: 6, payment: 'Card', surge: 1.0, rating: 4, createdAt: '2026-07-08T06:45:00Z', duration: '15 min', distance: '8.1 km', region: 'OM' },
];

const STATUS_CONFIG: Record<RideStatus, { label: string; bg: string; icon: typeof CheckCircle }> = {
  searching: { label: 'Searching', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Loader2 },
  assigned: { label: 'Assigned', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Users },
  arriving: { label: 'Arriving', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Navigation },
  in_progress: { label: 'In Progress', bg: 'bg-violet-50 text-violet-700 border-violet-200', icon: Car },
  completed: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

function StatusBadge({ status }: { status: RideStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg}`}>
      <Icon className={`w-3 h-3 ${status === 'searching' ? 'animate-spin' : ''}`} />{cfg.label}
    </span>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function AdminTaxiRidesPage() {
  const { filtered: filteredByRegion, formatPrice, regionLabel, isFiltered, countryFlag } = useTaxiRegionFilter(ALL_RIDES);
  const [statusFilter, setStatusFilter] = useState<RideStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'fare_high' | 'fare_low'>('newest');

  const rides = useMemo(() => {
    let result = filteredByRegion;
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) ||
        (r.driver?.toLowerCase().includes(q)) || r.pickup.toLowerCase().includes(q) || r.drop.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'fare_high') result = [...result].sort((a, b) => b.fare - a.fare);
    else if (sortBy === 'fare_low') result = [...result].sort((a, b) => a.fare - b.fare);
    else result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [filteredByRegion, statusFilter, search, sortBy]);

  const activeCount = ALL_RIDES.filter(r => ['searching', 'assigned', 'arriving', 'in_progress'].includes(r.status)).length;
  const completedToday = ALL_RIDES.filter(r => r.status === 'completed').length;
  const cancelledToday = ALL_RIDES.filter(r => r.status === 'cancelled').length;
  const totalRevenue = ALL_RIDES.filter(r => r.status === 'completed').reduce((s, r) => s + r.fare, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">All Rides</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time ride monitoring and history {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Rides', value: activeCount, color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Car },
          { label: 'Completed Today', value: completedToday, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
          { label: 'Cancelled', value: cancelledToday, color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
          { label: 'Revenue Today', value: formatPrice(totalRevenue), color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Star },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}>
            <kpi.icon className="w-5 h-5 mb-2" />
            <p className="text-xl font-black">{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rides, customers, drivers..." className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'searching', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s as RideStatus]?.label || s}
            </button>
          ))}
        </div>
        <select title="Sort rides" value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium outline-none">
          <option value="newest">Newest First</option>
          <option value="fare_high">Fare: High → Low</option>
          <option value="fare_low">Fare: Low → High</option>
        </select>
      </div>

      {/* Rides Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <th className="px-4 py-3">Ride ID</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Route</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Fare</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Surge</th>
              <th className="px-4 py-3">Time</th><th className="px-4 py-3">Action</th>
            </tr></thead>
            <tbody>
              {rides.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">No rides match the current filters</td></tr>
              ) : (
                rides.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 text-xs">{r.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.customer}</td>
                    <td className="px-4 py-3 text-slate-600">{r.driver || <span className="text-slate-300 italic">Unassigned</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1.5 max-w-[200px]">
                        <div className="flex flex-col items-center mt-1 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <div className="w-px h-3 bg-slate-300" />
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          <p className="truncate">{r.pickup}</p>
                          <p className="truncate text-slate-400">{r.drop}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-1 rounded font-medium">{r.vehicleType}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{r.status === 'cancelled' ? '—' : formatPrice(r.fare)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.payment}</td>
                    <td className="px-4 py-3">{r.surge > 1 ? <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{r.surge}×</span> : <span className="text-slate-300">1.0×</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(r.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3">
                      <button title="View ride details" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {rides.length} of {ALL_RIDES.length} rides</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
