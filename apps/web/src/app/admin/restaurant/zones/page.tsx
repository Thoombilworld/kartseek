'use client';
import { useState } from 'react';
import { MapPin, Plus, Edit, Trash2, Eye, Search, ToggleLeft, ToggleRight, Clock, Truck, Store, TrendingUp, ArrowUpDown, Settings } from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

/* ── Mock Zone Data ──────────────────────────────────────────────── */
const ZONE_STATS = { totalZones: 12, activeZones: 9, totalRestaurants: 345, avgDeliveryTime: '32 min' };

const ZONES = [
  { id: 'ZN-01', name: 'CBD & Westlands', restaurants: 42, riders: 28, coverage: 95, deliveryFee: 80, avgTime: 28, peakSurge: 1.3, ordersToday: 156, status: 'Active', geoType: 'Polygon', area: '12 km²' },
  { id: 'ZN-02', name: 'Kilimani & Lavington', restaurants: 31, riders: 22, coverage: 88, deliveryFee: 100, avgTime: 32, peakSurge: 1.2, ordersToday: 98, status: 'Active', geoType: 'Polygon', area: '8 km²' },
  { id: 'ZN-03', name: 'Karen & Bandra East', restaurants: 18, riders: 12, coverage: 72, deliveryFee: 150, avgTime: 40, peakSurge: 1.5, ordersToday: 45, status: 'Active', geoType: 'Polygon', area: '18 km²' },
  { id: 'ZN-04', name: 'Eastlands', restaurants: 24, riders: 18, coverage: 65, deliveryFee: 120, avgTime: 35, peakSurge: 1.1, ordersToday: 72, status: 'Active', geoType: 'Polygon', area: '15 km²' },
  { id: 'ZN-05', name: 'Thika Road Corridor', restaurants: 15, riders: 10, coverage: 50, deliveryFee: 140, avgTime: 38, peakSurge: 1.4, ordersToday: 34, status: 'Limited', geoType: 'Polygon', area: '22 km²' },
  { id: 'ZN-06', name: 'South B & South C', restaurants: 20, riders: 15, coverage: 80, deliveryFee: 100, avgTime: 30, peakSurge: 1.2, ordersToday: 67, status: 'Active', geoType: 'Polygon', area: '6 km²' },
  { id: 'ZN-07', name: 'Parklands & Ngara', restaurants: 35, riders: 20, coverage: 90, deliveryFee: 80, avgTime: 25, peakSurge: 1.1, ordersToday: 112, status: 'Active', geoType: 'Polygon', area: '5 km²' },
  { id: 'ZN-08', name: 'Kileleshwa & Hurlingham', restaurants: 22, riders: 14, coverage: 85, deliveryFee: 90, avgTime: 28, peakSurge: 1.2, ordersToday: 78, status: 'Active', geoType: 'Polygon', area: '4 km²' },
  { id: 'ZN-09', name: 'Athi River', restaurants: 8, riders: 5, coverage: 35, deliveryFee: 200, avgTime: 50, peakSurge: 1.6, ordersToday: 12, status: 'Limited', geoType: 'Radius', area: '30 km²' },
  { id: 'ZN-10', name: 'Upper Hill', restaurants: 12, riders: 8, coverage: 78, deliveryFee: 100, avgTime: 30, peakSurge: 1.3, ordersToday: 45, status: 'Active', geoType: 'Polygon', area: '3 km²' },
];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Limited: 'bg-amber-50 text-amber-700',
  Inactive: 'bg-red-50 text-red-700',
};

export default function AdminRestaurantZonesPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'restaurants' | 'ordersToday' | 'coverage' | 'avgTime'>('ordersToday');
  const [showAddZone, setShowAddZone] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const filtered = ZONES
    .filter(z => filterStatus === 'All' || z.status === filterStatus)
    .filter(z => z.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><MapPin className="w-6 h-6 text-[#EA580C]" /> Delivery Zones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure delivery areas, fees, coverage, and surge settings.</p>
        </div>
        <button onClick={() => setShowAddZone(!showAddZone)} className="bg-[#EA580C] hover:bg-[#C2410C] text-white border-none rounded-xl px-5 py-2.5 font-bold cursor-pointer flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4"><p className="text-2xl font-black text-orange-700">{ZONE_STATS.totalZones}</p><p className="text-xs font-medium text-orange-600">Total Zones</p></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{ZONE_STATS.activeZones}</p><p className="text-xs font-medium text-emerald-600">Active</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{ZONE_STATS.totalRestaurants}</p><p className="text-xs font-medium text-blue-600">Restaurants Covered</p></div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4"><p className="text-2xl font-black text-violet-700">{ZONE_STATS.avgDeliveryTime}</p><p className="text-xs font-medium text-violet-600">Avg Delivery</p></div>
      </div>

      {/* Interactive Map Placeholder */}
      <div className="bg-linear-to-br from-slate-100 to-slate-200 rounded-xl h-[220px] flex flex-col items-center justify-center border border-slate-300 relative overflow-hidden">
        <MapPin className="w-12 h-12 text-[#EA580C] mb-2 opacity-40" />
        <p className="text-sm font-bold text-slate-500">Interactive Zone Map</p>
        <p className="text-xs text-slate-400">Click zones on the map to view details</p>
        {/* Decorative dots representing zones */}
        <div className="absolute top-8 left-12 w-3 h-3 rounded-full bg-emerald-500 opacity-60 animate-pulse" />
        <div className="absolute top-16 right-20 w-4 h-4 rounded-full bg-[#EA580C] opacity-50 animate-pulse delay-500" />
        <div className="absolute bottom-14 left-1/3 w-3 h-3 rounded-full bg-blue-500 opacity-60 animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/3 w-5 h-5 rounded-full bg-amber-500 opacity-40 animate-pulse delay-1500" />
      </div>

      {/* Add Zone Form */}
      {showAddZone && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-orange-800 mb-3">New Delivery Zone</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Zone name" className="border rounded-lg px-3 py-2 text-sm" />
            <select title="Zone geometry type" className="border rounded-lg px-3 py-2 text-sm"><option>Polygon (draw on map)</option><option>Radius (from point)</option></select>
            <input type="number" placeholder="Delivery Fee " className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Max delivery time (min)" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.1" placeholder="Peak surge multiplier" className="border rounded-lg px-3 py-2 text-sm" />
            <select title="Zone status" className="border rounded-lg px-3 py-2 text-sm"><option>Active</option><option>Limited</option><option>Inactive</option></select>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-bold hover:bg-[#C2410C]">Save Zone</button>
            <button onClick={() => setShowAddZone(false)} className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search zones..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>Active</option><option>Limited</option><option>Inactive</option></select>
      </div>

      {/* Zone Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="p-3 text-left">Zone</th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('restaurants')}>Restaurants <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('coverage')}>Coverage <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center">Delivery Fee</th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('avgTime')}>Avg Time <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center">Surge</th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('ordersToday')}>Orders Today <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center">Riders</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(z => (
            <tr key={z.id} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
              <td className="p-3">
                <strong className="text-sm text-slate-900">{z.name}</strong>
                <p className="text-[10px] text-slate-400">{z.geoType} · {z.area}</p>
              </td>
              <td className="p-3 text-center font-bold">{z.restaurants}</td>
              <td className="p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${z.coverage > 80 ? 'bg-emerald-500' : z.coverage > 60 ? 'bg-amber-500' : 'bg-red-500'} w-[${z.coverage}%]`} /></div>
                  <span className="text-xs font-bold">{z.coverage}%</span>
                </div>
              </td>
              <td className="p-3 text-center font-bold text-[#EA580C]">{z.deliveryFee}</td>
              <td className="p-3 text-center text-sm">{z.avgTime} min</td>
              <td className="p-3 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${z.peakSurge > 1.3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{z.peakSurge}x</span></td>
              <td className="p-3 text-center font-bold">{z.ordersToday}</td>
              <td className="p-3 text-center text-sm">{z.riders}</td>
              <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_STYLES[z.status]}`}>{z.status}</span></td>
              <td className="p-3 text-center">
                <div className="flex justify-center gap-1">
                  <button title="View zone" className="p-1.5 text-slate-400 hover:text-[#EA580C] hover:bg-orange-50 rounded transition-colors"><Eye className="w-4 h-4" /></button>
                  <button title="Edit zone" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                  <button title="Zone settings" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"><Settings className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
