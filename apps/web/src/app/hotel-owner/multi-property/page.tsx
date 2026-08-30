'use client';
import React, { useState } from 'react';
import { Building2, Star, TrendingUp, Users, BedDouble, ArrowUpRight, ChevronDown } from 'lucide-react';

const PROPERTIES = [
  { id: 'h-001', name: 'Grand Palace Downtown', city: 'Dubai', rooms: 120, occupancy: 78, rating: 4.8, revenue: 245000, bookings: 89, currency: 'AED', status: 'active' },
  { id: 'h-002', name: 'Grand Palace Marina', city: 'Dubai', rooms: 85, occupancy: 65, rating: 4.6, revenue: 178000, bookings: 62, currency: 'AED', status: 'active' },
  { id: 'h-003', name: 'Grand Palace JBR', city: 'Dubai', rooms: 200, occupancy: 82, rating: 4.9, revenue: 420000, bookings: 145, currency: 'AED', status: 'active' },
  { id: 'h-004', name: 'Grand Palace Abu Dhabi', city: 'Abu Dhabi', rooms: 150, occupancy: 71, rating: 4.7, revenue: 310000, bookings: 108, currency: 'AED', status: 'maintenance' },
];

export default function MultiPropertyPage() {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const totalRooms = PROPERTIES.reduce((s, p) => s + p.rooms, 0);
  const totalRevenue = PROPERTIES.reduce((s, p) => s + p.revenue, 0);
  const totalBookings = PROPERTIES.reduce((s, p) => s + p.bookings, 0);
  const avgOccupancy = Math.round(PROPERTIES.reduce((s, p) => s + p.occupancy, 0) / PROPERTIES.length);
  const avgRating = (PROPERTIES.reduce((s, p) => s + p.rating, 0) / PROPERTIES.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Multi-Property Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Aggregate view across all your hotel properties</p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Properties', value: PROPERTIES.length, icon: Building2, color: 'bg-rose-100 text-rose-600' },
          { label: 'Total Rooms', value: totalRooms, icon: BedDouble, color: 'bg-blue-100 text-blue-600' },
          { label: 'Avg Occupancy', value: `${avgOccupancy}%`, icon: Users, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Total Revenue', value: `AED ${(totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'bg-amber-100 text-amber-600' },
          { label: 'Avg Rating', value: avgRating, icon: Star, color: 'bg-purple-100 text-purple-600' },
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

      {/* Property Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Property Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3 font-bold text-xs text-slate-400">Property</th>
                <th className="text-center px-3 py-3 font-bold text-xs text-slate-400">Status</th>
                <th className="text-right px-3 py-3 font-bold text-xs text-slate-400">Rooms</th>
                <th className="text-right px-3 py-3 font-bold text-xs text-slate-400">Occupancy</th>
                <th className="text-right px-3 py-3 font-bold text-xs text-slate-400">Rating</th>
                <th className="text-right px-3 py-3 font-bold text-xs text-slate-400">Bookings</th>
                <th className="text-right px-5 py-3 font-bold text-xs text-slate-400">Revenue</th>
                <th className="text-right px-5 py-3 font-bold text-xs text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {PROPERTIES.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.city}</p>
                  </td>
                  <td className="text-center px-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                      p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right px-3 font-semibold text-slate-700">{p.rooms}</td>
                  <td className="text-right px-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.occupancy >= 75 ? 'bg-emerald-500' : p.occupancy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${p.occupancy}%` }} />
                      </div>
                      <span className="font-bold text-slate-700 text-xs">{p.occupancy}%</span>
                    </div>
                  </td>
                  <td className="text-right px-3">
                    <span className="flex items-center justify-end gap-1 font-bold text-slate-700">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {p.rating}
                    </span>
                  </td>
                  <td className="text-right px-3 font-semibold text-slate-700">{p.bookings}</td>
                  <td className="text-right px-5 font-black text-slate-900">{p.currency} {p.revenue.toLocaleString()}</td>
                  <td className="text-right px-5">
                    <button className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 ml-auto">
                      Manage <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="px-5 py-3 font-bold text-slate-700">Total / Average</td>
                <td />
                <td className="text-right px-3 font-bold text-slate-700">{totalRooms}</td>
                <td className="text-right px-3 font-bold text-slate-700">{avgOccupancy}%</td>
                <td className="text-right px-3 font-bold text-slate-700">{avgRating}</td>
                <td className="text-right px-3 font-bold text-slate-700">{totalBookings}</td>
                <td className="text-right px-5 font-black text-slate-900">AED {totalRevenue.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
