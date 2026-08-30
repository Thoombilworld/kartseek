'use client';

import React, { useState } from 'react';
import { MapPin, Truck, Clock, Users, Package, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Edit, Eye } from 'lucide-react';
import Link from 'next/link';

const zones = [
  { id: 'Z-01', name: 'Colaba & Cuffe Parade', area: '12.4 sq km', deliveryPartners: 18, avgDeliveryTime: '22 min', ordersToday: 145, ordersYesterday: 132, coverage: 98, status: 'optimal', demand: 'high', peakHours: '12 PM – 2 PM, 7 PM – 9 PM', surgeMultiplier: '1.2x' },
  { id: 'Z-02', name: 'Bandra West & Khar', area: '8.6 sq km', deliveryPartners: 24, avgDeliveryTime: '18 min', ordersToday: 210, ordersYesterday: 195, coverage: 100, status: 'optimal', demand: 'high', peakHours: '1 PM – 3 PM, 8 PM – 10 PM', surgeMultiplier: '1.5x' },
  { id: 'Z-03', name: 'Andheri East & West', area: '22.1 sq km', deliveryPartners: 32, avgDeliveryTime: '28 min', ordersToday: 310, ordersYesterday: 340, coverage: 92, status: 'optimal', demand: 'very high', peakHours: '12 PM – 2 PM, 7 PM – 10 PM', surgeMultiplier: '1.8x' },
  { id: 'Z-04', name: 'Worli & Lower Parel', area: '9.8 sq km', deliveryPartners: 14, avgDeliveryTime: '25 min', ordersToday: 120, ordersYesterday: 128, coverage: 88, status: 'attention', demand: 'medium', peakHours: '12 PM – 2 PM', surgeMultiplier: '1.0x' },
  { id: 'Z-05', name: 'Dadar & Matunga', area: '6.2 sq km', deliveryPartners: 10, avgDeliveryTime: '20 min', ordersToday: 95, ordersYesterday: 88, coverage: 95, status: 'optimal', demand: 'medium', peakHours: '11 AM – 1 PM, 6 PM – 8 PM', surgeMultiplier: '1.0x' },
  { id: 'Z-06', name: 'Juhu & Versova', area: '10.3 sq km', deliveryPartners: 8, avgDeliveryTime: '35 min', ordersToday: 78, ordersYesterday: 102, coverage: 72, status: 'critical', demand: 'high', peakHours: '7 PM – 10 PM', surgeMultiplier: '2.0x' },
  { id: 'Z-07', name: 'Fort & Churchgate', area: '5.1 sq km', deliveryPartners: 12, avgDeliveryTime: '15 min', ordersToday: 180, ordersYesterday: 165, coverage: 100, status: 'optimal', demand: 'high', peakHours: '12 PM – 3 PM', surgeMultiplier: '1.3x' },
  { id: 'Z-08', name: 'Powai & Hiranandani', area: '14.7 sq km', deliveryPartners: 6, avgDeliveryTime: '40 min', ordersToday: 55, ordersYesterday: 60, coverage: 65, status: 'critical', demand: 'low', peakHours: '7 PM – 9 PM', surgeMultiplier: '1.0x' },
];

const statusConfig: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  optimal: { bg: 'bg-emerald-100 text-emerald-700', label: 'Optimal', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  attention: { bg: 'bg-amber-100 text-amber-700', label: 'Attention', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  critical: { bg: 'bg-red-100 text-red-700', label: 'Critical', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const demandColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  'very high': 'bg-red-100 text-red-700',
};

export default function DeliveryZonesPage() {
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const totalPartners = zones.reduce((a, z) => a + z.deliveryPartners, 0);
  const totalOrdersToday = zones.reduce((a, z) => a + z.ordersToday, 0);
  const avgCoverage = Math.round(zones.reduce((a, z) => a + z.coverage, 0) / zones.length);
  const criticalZones = zones.filter(z => z.status === 'critical').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Zones</h1>
          <p className="text-slate-500 text-sm">Monitor delivery coverage, partner allocation, and demand patterns across your region.</p>
        </div>
        <Link href="/franchise/zones/new" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
          <MapPin className="w-4 h-4" /> Add New Zone
        </Link>
      </div>

      {/* Zone KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
            <div><p className="text-2xl font-black text-slate-900">{zones.length}</p><p className="text-xs text-slate-500 font-medium">Total Zones</p></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5" /></div>
            <div><p className="text-2xl font-black text-slate-900">{totalPartners}</p><p className="text-xs text-slate-500 font-medium">Delivery Partners</p></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Package className="w-5 h-5" /></div>
            <div><p className="text-2xl font-black text-slate-900">{totalOrdersToday.toLocaleString()}</p><p className="text-xs text-slate-500 font-medium">Orders Today</p></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${criticalZones > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div><p className="text-2xl font-black text-slate-900">{criticalZones}</p><p className="text-xs text-slate-500 font-medium">Critical Zones</p></div>
          </div>
        </div>
      </div>

      {/* Coverage Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Average Zone Coverage</h3>
          <span className="text-2xl font-black text-teal-600">{avgCoverage}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${avgCoverage}%`, background: avgCoverage >= 90 ? '#10b981' : avgCoverage >= 75 ? '#f59e0b' : '#ef4444' }} />
        </div>
        <p className="text-xs text-slate-400 mt-2">Target: 95% coverage across all zones</p>
      </div>

      {/* Zones Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="font-bold text-slate-900">All Delivery Zones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Zone</th>
                <th className="px-5 py-3.5 font-semibold text-center">Partners</th>
                <th className="px-5 py-3.5 font-semibold text-center">Avg Time</th>
                <th className="px-5 py-3.5 font-semibold text-right">Orders Today</th>
                <th className="px-5 py-3.5 font-semibold text-center">Coverage</th>
                <th className="px-5 py-3.5 font-semibold text-center">Demand</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Expand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.map((z) => {
                const trend = z.ordersToday - z.ordersYesterday;
                const trendPct = Math.round((trend / z.ordersYesterday) * 100);
                return (
                  <React.Fragment key={z.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{z.name}</p>
                        <p className="text-xs text-slate-400">{z.id} • {z.area}</p>
                      </td>
                      <td className="px-5 py-4 text-center"><span className="inline-flex items-center gap-1 font-bold"><Truck className="w-3.5 h-3.5 text-slate-400" />{z.deliveryPartners}</span></td>
                      <td className="px-5 py-4 text-center"><span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{z.avgDeliveryTime}</span></td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-bold text-slate-900">{z.ordersToday}</p>
                        <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {trend >= 0 ? '+' : ''}{trendPct}% vs yesterday
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${z.coverage}%`, background: z.coverage >= 90 ? '#10b981' : z.coverage >= 75 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className="text-xs font-bold">{z.coverage}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center"><span className={`${demandColors[z.demand]} px-2.5 py-1 rounded-md text-xs font-bold capitalize`}>{z.demand}</span></td>
                      <td className="px-5 py-4 text-center">
                        <span className={`${statusConfig[z.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                          {statusConfig[z.status].icon} {statusConfig[z.status].label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => setExpandedZone(expandedZone === z.id ? null : z.id)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          {expandedZone === z.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                      </td>
                    </tr>
                    {expandedZone === z.id && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                            <div><p className="text-slate-400 text-xs font-medium mb-1">Peak Hours</p><p className="font-bold text-slate-700">{z.peakHours}</p></div>
                            <div><p className="text-slate-400 text-xs font-medium mb-1">Surge Multiplier</p><p className="font-bold text-orange-600 text-lg">{z.surgeMultiplier}</p></div>
                            <div><p className="text-slate-400 text-xs font-medium mb-1">Yesterday&apos;s Orders</p><p className="font-bold text-slate-700">{z.ordersYesterday}</p></div>
                            <div className="flex items-end gap-2">
                              <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><Edit className="w-3.5 h-3.5" /> Edit Zone</button>
                              <button className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Assign Partners</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
