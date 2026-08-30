'use client';
import React from 'react';
import {
  Users, Car, DollarSign, Star, TrendingUp, Clock, AlertTriangle,
  CheckCircle, ArrowUpRight, MapPin, FileText, Zap,
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────────────────

const stats = {
  activeDrivers: 108,
  totalDrivers: 120,
  onlineDrivers: 72,
  todayRides: 342,
  todayRevenue: '₹1.84L',
  avgRating: 4.6,
  pendingApprovals: 3,
  expiringDocs: 2,
};

const recentTrips = [
  { id: 'RIDE-5001', driver: 'Ravi Kumar', route: 'Koramangala → Whitefield', fare: '₹450', time: '12:30 PM', status: 'completed' },
  { id: 'RIDE-5002', driver: 'Priya Devi', route: 'MG Road → Airport', fare: '₹1,200', time: '12:15 PM', status: 'completed' },
  { id: 'RIDE-5003', driver: 'Amit Singh', route: 'Indiranagar → HSR Layout', fare: '₹280', time: '12:05 PM', status: 'in_progress' },
  { id: 'RIDE-5004', driver: 'Venkat R.', route: 'JP Nagar → Electronic City', fare: '₹380', time: '11:50 AM', status: 'completed' },
  { id: 'RIDE-5005', driver: 'Karthik M.', route: 'Yelahanka → Hebbal', fare: '₹180', time: '11:40 AM', status: 'cancelled' },
];

const driverBreakdown = [
  { status: 'Online — On Trip', count: 38, color: 'bg-emerald-500' },
  { status: 'Online — Idle', count: 34, color: 'bg-blue-500' },
  { status: 'Offline', count: 36, color: 'bg-slate-300' },
  { status: 'Onboarding', count: 8, color: 'bg-indigo-500' },
  { status: 'Suspended', count: 4, color: 'bg-amber-500' },
];

const actionItems = [
  { label: '3 drivers pending approval', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { label: '2 documents expiring soon', icon: FileText, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  { label: '1 driver below minimum rating', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50' },
];

const tripStatusCfg: Record<string, { bg: string; l: string }> = {
  completed: { bg: 'bg-emerald-100 text-emerald-700', l: 'Done' },
  in_progress: { bg: 'bg-blue-100 text-blue-700', l: 'Active' },
  cancelled: { bg: 'bg-red-100 text-red-700', l: 'Cancelled' },
};

// ─── Revenue Chart (Simplified) ─────────────────────────────────────────────

const revenueData = [
  { day: 'Mon', amount: 14200 },
  { day: 'Tue', amount: 18400 },
  { day: 'Wed', amount: 16800 },
  { day: 'Thu', amount: 21200 },
  { day: 'Fri', amount: 24600 },
  { day: 'Sat', amount: 28400 },
  { day: 'Today', amount: 18400 },
];

function MiniChart() {
  const max = Math.max(...revenueData.map(d => d.amount));
  return (
    <div className="flex items-end gap-1.5 h-20">
      {revenueData.map((d, i) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-md transition-all ${i === revenueData.length - 1 ? 'bg-amber-400' : 'bg-slate-200'}`}
            style={{ height: `${(d.amount / max) * 100}%`, minHeight: 4 }}
          />
          <span className={`text-[9px] font-bold ${i === revenueData.length - 1 ? 'text-amber-600' : 'text-slate-400'}`}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function VendorDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back! Here's what's happening with your fleet today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-linear-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-md">
          <Users className="w-5 h-5 opacity-80" />
          <p className="text-2xl font-black mt-2">{stats.onlineDrivers}</p>
          <p className="text-xs font-medium opacity-80">Drivers Online</p>
          <p className="text-[10px] opacity-60 mt-0.5">of {stats.totalDrivers} total</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Car className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.todayRides}</p>
          <p className="text-xs text-slate-500 font-medium">Rides Today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.todayRevenue}</p>
          <p className="text-xs text-slate-500 font-medium">Revenue Today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.avgRating}</p>
          <p className="text-xs text-slate-500 font-medium">Fleet Rating</p>
        </div>
      </div>

      {/* Row: Revenue + Driver Status + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> 7-Day Revenue
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
          </div>
          <MiniChart />
        </div>

        {/* Driver Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-4">
            <Users className="w-4 h-4 text-indigo-500" /> Driver Status
          </h3>
          <div className="space-y-2.5">
            {driverBreakdown.map(d => (
              <div key={d.status} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${d.color} shrink-0`} />
                <span className="text-xs text-slate-600 flex-1">{d.status}</span>
                <span className="text-xs font-bold text-slate-900">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Action Items
          </h3>
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 ${item.bgColor} px-3 py-2.5 rounded-lg`}>
                <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
            {actionItems.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs text-slate-400">All clear! No pending actions.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-500" /> Recent Trips
          </h3>
          <a href="/seller/taxi/trips" className="text-xs text-amber-600 font-bold hover:text-amber-700 flex items-center gap-0.5">
            View All <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Ride ID</th>
                <th className="px-4 py-3 font-semibold">Driver</th>
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold text-right">Fare</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTrips.map(trip => (
                <tr key={trip.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-xs font-mono text-slate-500">{trip.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-xs">{trip.driver}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{trip.route}</td>
                  <td className="px-4 py-3 text-right font-bold text-xs">{trip.fare}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{trip.time}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`${tripStatusCfg[trip.status]?.bg || 'bg-slate-100'} px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                      {tripStatusCfg[trip.status]?.l || trip.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
