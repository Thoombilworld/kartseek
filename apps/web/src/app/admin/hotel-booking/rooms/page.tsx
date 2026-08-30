'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { BedDouble, Hotel, Search, Filter, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, ArrowUpDown, Users, Star } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

/* ── Mock Room Data ──────────────────────────────────────────────── */
const ROOM_STATS = { totalRooms: 1842, available: 1205, occupied: 589, maintenance: 48 };

const ROOM_TYPES = [
  { type: 'Standard', count: 680, avgRate: 4500, occupancy: 72 },
  { type: 'Deluxe', count: 520, avgRate: 7800, occupancy: 68 },
  { type: 'Suite', count: 340, avgRate: 15000, occupancy: 55 },
  { type: 'Presidential', count: 82, avgRate: 35000, occupancy: 42 },
  { type: 'Dormitory', count: 220, avgRate: 1500, occupancy: 85 },
];

const ROOMS = [
  { id: 'RM-001', hotel: 'Grand Mumbai Hotel', number: '501', type: 'Suite', floor: 5, capacity: 4, rate: 15000, status: 'Available', amenities: ['WiFi', 'AC', 'Minibar', 'Bathtub'], rating: 4.8 },
  { id: 'RM-002', hotel: 'Grand Mumbai Hotel', number: '302', type: 'Deluxe', floor: 3, capacity: 2, rate: 8500, status: 'Occupied', amenities: ['WiFi', 'AC', 'TV'], rating: 4.5 },
  { id: 'RM-003', hotel: 'Coastal Beach Resort', number: 'V12', type: 'Presidential', floor: 1, capacity: 6, rate: 42000, status: 'Available', amenities: ['WiFi', 'AC', 'Pool', 'Kitchen', 'Terrace'], rating: 4.9 },
  { id: 'RM-004', hotel: 'City Center Inn', number: '205', type: 'Standard', floor: 2, capacity: 2, rate: 3800, status: 'Maintenance', amenities: ['WiFi', 'TV'], rating: 4.2 },
  { id: 'RM-005', hotel: 'Safari Lodge Mara', number: 'T3', type: 'Suite', floor: 1, capacity: 3, rate: 22000, status: 'Available', amenities: ['WiFi', 'AC', 'Safari View', 'Fireplace'], rating: 4.9 },
  { id: 'RM-006', hotel: 'Lakeside Villa', number: 'C8', type: 'Deluxe', floor: 1, capacity: 2, rate: 9500, status: 'Occupied', amenities: ['WiFi', 'AC', 'Lake View'], rating: 4.6 },
  { id: 'RM-007', hotel: 'Downtown Suites', number: '1102', type: 'Standard', floor: 11, capacity: 2, rate: 5200, status: 'Available', amenities: ['WiFi', 'AC', 'City View'], rating: 4.3 },
  { id: 'RM-008', hotel: 'Airport Express Hotel', number: '108', type: 'Standard', floor: 1, capacity: 1, rate: 2800, status: 'Occupied', amenities: ['WiFi', 'TV'], rating: 4.0 },
  { id: 'RM-009', hotel: 'Mountain Retreat', number: 'L4', type: 'Deluxe', floor: 2, capacity: 3, rate: 11000, status: 'Available', amenities: ['WiFi', 'Fireplace', 'Mountain View', 'Hot Tub'], rating: 4.7 },
];

const STATUS_STYLES: Record<string, string> = {
  Available: 'bg-emerald-50 text-emerald-700',
  Occupied: 'bg-blue-50 text-blue-700',
  Maintenance: 'bg-amber-50 text-amber-700',
  Blocked: 'bg-red-50 text-red-700',
};

export default function AdminHotelRoomsPage() {
  const { formatPrice } = useHotelRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'rate' | 'capacity' | 'rating'>('rate');

  const filtered = ROOMS
    .filter(r => filterType === 'All' || r.type === filterType)
    .filter(r => filterStatus === 'All' || r.status === filterStatus)
    .filter(r => r.hotel.toLowerCase().includes(search.toLowerCase()) || r.number.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BedDouble className="w-6 h-6 text-rose-500" /> Room Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor room inventory, availability, and maintenance across all hotels.</p>
        </div>
        <button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Add Room Type</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-2xl font-black text-slate-700">{ROOM_STATS.totalRooms}</p><p className="text-xs font-medium text-slate-500">Total Rooms</p></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{ROOM_STATS.available}</p><p className="text-xs font-medium text-emerald-600">Available</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{ROOM_STATS.occupied}</p><p className="text-xs font-medium text-blue-600">Occupied</p></div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-2xl font-black text-amber-700">{ROOM_STATS.maintenance}</p><p className="text-xs font-medium text-amber-600">Maintenance</p></div>
      </div>

      {/* Room Type Distribution */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Room Type Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ROOM_TYPES.map(rt => (
            <div key={rt.type} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-2">{rt.type}</h3>
              <p className="text-2xl font-black text-rose-600">{rt.count}</p>
              <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                <span>{formatPrice(rt.avgRate)}/night</span>
                <span>{rt.occupancy}% occ.</span>
              </div>
              <div className="mt-2 bg-slate-100 rounded-full h-1.5"><div className={`bg-rose-500 rounded-full h-1.5 transition-all w-[${rt.occupancy}%]`} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by hotel or room number..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by room type" value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>Standard</option><option>Deluxe</option><option>Suite</option><option>Presidential</option><option>Dormitory</option></select>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>Available</option><option>Occupied</option><option>Maintenance</option></select>
      </div>

      {/* Room Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase">
            <th className="p-3 text-left">Room</th>
            <th className="p-3 text-left">Hotel</th>
            <th className="p-3 text-center">Type</th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('capacity')}>Capacity <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('rate')}>Rate <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center cursor-pointer" onClick={() => setSortBy('rating')}>Rating <ArrowUpDown className="inline w-3 h-3" /></th>
            <th className="p-3 text-center">Amenities</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr></thead>
          <tbody>{filtered.map(r => (
            <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="p-3"><strong className="text-sm text-slate-900">#{r.number}</strong><br /><span className="text-[10px] text-slate-400">Floor {r.floor}</span></td>
              <td className="p-3 text-sm text-slate-700">{r.hotel}</td>
              <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{r.type}</span></td>
              <td className="p-3 text-center flex items-center justify-center gap-1"><Users className="w-3 h-3 text-slate-400" /> {r.capacity}</td>
              <td className="p-3 text-center font-bold text-rose-600">{formatPrice(r.rate)}</td>
              <td className="p-3 text-center"><span className="flex items-center justify-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><strong className="text-sm">{r.rating}</strong></span></td>
              <td className="p-3 text-center"><div className="flex flex-wrap justify-center gap-1">{r.amenities.slice(0, 3).map(a => <span key={a} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">{a}</span>)}{r.amenities.length > 3 && <span className="text-[9px] text-slate-400">+{r.amenities.length - 3}</span>}</div></td>
              <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[r.status]}`}>{r.status}</span></td>
              <td className="p-3 text-center">
                <div className="flex justify-center gap-1">
                  <button title="View room" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Eye className="w-4 h-4" /></button>
                  <button title="Edit room" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
