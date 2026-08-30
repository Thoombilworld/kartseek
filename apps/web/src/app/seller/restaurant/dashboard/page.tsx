'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign, BellRing, Users, Star, Clock, TrendingUp,
  ArrowUp, ArrowDown, ChefHat, Bike, ShoppingBag, UtensilsCrossed,
  CalendarDays, Heart, Package, CheckCircle, AlertTriangle, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import RevenueChart from '@/components/seller/restaurant/revenue-chart';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

// ── Mock analytics data ─────────────────────────────────────────────────────

const ANALYTICS = {
  todayRevenue: 14520,
  todayRevenueChange: 12,
  weeklyRevenue: 128400,
  weeklyRevenueChange: 8.4,
  monthlyRevenue: 542800,
  monthlyRevenueChange: 15.2,
  activeOrders: 24,
  newOrders: 4,
  pendingOrders: 6,
  preparingOrders: 12,
  readyOrders: 4,
  deliveredToday: 48,
  cancelledOrders: 2,
  tableReservations: 8,
  avgRating: 4.4,
  totalReviews: 2840,
  performanceScore: 87,
  avgPrepTime: 28,
};

const ORDER_TYPE_BREAKDOWN = [
  { label: 'Delivery', count: 18, pct: 62, icon: Bike, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { label: 'Takeaway', count: 4, pct: 14, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { label: 'Dine-in', count: 5, pct: 17, icon: UtensilsCrossed, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { label: 'Booking', count: 2, pct: 7, icon: CalendarDays, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
];

const KITCHEN_QUEUE = [
  { id: 'ORD-9982', items: ['2x Chicken Biryani', '1x Paneer Tikka'], status: 'new', time: 'Just now', total: 840 },
  { id: 'ORD-9980', items: ['1x Mutton Mandi'], status: 'preparing', time: '12m ago', total: 520, prepTimeLeft: 8 },
  { id: 'ORD-9978', items: ['3x Butter Chicken', '4x Naan'], status: 'ready', time: '18m ago', total: 680 },
];

const DAILY_REVENUE = [
  { label: 'Mon', value: 22400 },
  { label: 'Tue', value: 18900 },
  { label: 'Wed', value: 28600 },
  { label: 'Thu', value: 24100 },
  { label: 'Fri', value: 34200 },
  { label: 'Sat', value: 42800 },
  { label: 'Sun', value: 38500 },
];

const LOW_STOCK_ITEMS = [
  { name: 'Basmati Rice', current: '2kg', threshold: '5kg' },
  { name: 'Chicken Breast', current: '1.5kg', threshold: '3kg' },
  { name: 'Paneer', current: '500g', threshold: '2kg' },
];

type Period = 'Today' | 'This Week' | 'This Month';

export default function RestaurantPartnerDashboard() {
  const [period, setPeriod] = useState<Period>('Today');
  const a = ANALYTICS;

  const revenueByPeriod = {
    'Today': { value: a.todayRevenue, change: a.todayRevenueChange },
    'This Week': { value: a.weeklyRevenue, change: a.weeklyRevenueChange },
    'This Month': { value: a.monthlyRevenue, change: a.monthlyRevenueChange },
  };
  const rv = revenueByPeriod[period];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Restaurant Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">The Grand Biryani House • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
          {(['Today', 'This Week', 'This Month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Performance & Stock Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-linear-to-br from-orange-600 to-amber-500 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Performance Score</span>
            </div>
            <p className="text-4xl font-black">
              {a.performanceScore}
              <span className="text-lg opacity-60">/100</span>
            </p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <ProgressBar percent={a.performanceScore} className="bg-white rounded-full h-2 transition-all duration-700" />
            </div>
          </div>
        </div>

        <div className="bg-linear-to-br from-blue-500 to-blue-700 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Customer Satisfaction</span>
            </div>
            <p className="text-4xl font-black">
              {a.avgRating}
              <span className="text-lg opacity-60">/5.0</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(a.avgRating) ? 'text-amber-300 fill-amber-300' : 'text-white/30'}`} />
                ))}
              </div>
              <span className="text-xs opacity-70 font-medium">{a.totalReviews.toLocaleString()} reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Revenue', value: `₹${(rv.value / 1000).toFixed(rv.value >= 100000 ? 0 : 1)}K`, change: `+${rv.change}%`, up: true, icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Orders', value: a.activeOrders, change: `${a.newOrders} new`, up: true, icon: BellRing, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Preparing', value: a.preparingOrders, change: `${a.readyOrders} ready`, up: true, icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Delivered', value: a.deliveredToday, change: `-${a.cancelledOrders} cancelled`, up: false, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Reservations', value: a.tableReservations, change: 'today', up: true, icon: CalendarDays, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Avg Prep Time', value: `${a.avgPrepTime}m`, change: '-4m', up: true, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center mb-3`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{kpi.value}</p>
            <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {kpi.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Order Type Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ORDER_TYPE_BREAKDOWN.map((t) => (
          <div key={t.label} className={`${t.bg} border ${t.border} rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{t.label}</p>
                <p className="text-xl font-black text-slate-900">{t.count}</p>
              </div>
            </div>
            <div className="mt-3 bg-white/60 rounded-full h-1.5">
              <ProgressBar percent={t.pct} className={`${t.color.replace('text-', 'bg-')} rounded-full h-1.5 transition-all`} />
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">{t.pct}% of today&apos;s orders</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900">Weekly Revenue</h2>
            <span className="text-xs text-slate-500 font-medium">₹{(DAILY_REVENUE.reduce((s, d) => s + d.value, 0) / 1000).toFixed(0)}K total</span>
          </div>
          <RevenueChart data={DAILY_REVENUE} />
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
            <div><p className="text-slate-400 text-xs font-medium">Peak Day</p><p className="font-bold text-slate-900">Saturday</p></div>
            <div><p className="text-slate-400 text-xs font-medium">Peak Revenue</p><p className="font-bold text-orange-600">₹42,800</p></div>
            <div><p className="text-slate-400 text-xs font-medium">Avg/Day</p><p className="font-bold text-slate-900">₹{(DAILY_REVENUE.reduce((s, d) => s + d.value, 0) / DAILY_REVENUE.length / 1000).toFixed(1)}K</p></div>
          </div>
        </div>

        {/* Live Kitchen Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-orange-600" /> Kitchen Queue
            </h2>
            <Link href="/seller/restaurant/kitchen" className="text-xs font-bold text-orange-600 hover:text-orange-700">View KDS →</Link>
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {KITCHEN_QUEUE.map((order) => (
              <div
                key={order.id}
                className={`rounded-xl p-3 border ${
                  order.status === 'new' ? 'border-orange-200 bg-orange-50/50' :
                  order.status === 'preparing' ? 'border-amber-200 bg-amber-50/30' :
                  'border-emerald-200 bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${
                      order.status === 'new' ? 'bg-orange-600 text-white' :
                      order.status === 'preparing' ? 'bg-amber-500 text-white' :
                      'bg-emerald-600 text-white'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{order.id}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">₹{order.total}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{order.items.join(', ')}</p>
                {order.prepTimeLeft && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-600">
                    <Clock className="w-3 h-3" /> {order.prepTimeLeft}m remaining
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-black text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Add Menu Item', href: '/seller/restaurant/menu-items/add', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' },
              { label: 'View Active Orders', href: '/seller/restaurant/orders', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' },
              { label: 'Table Reservations', href: '/seller/restaurant/reservations', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' },
              { label: 'Create Promotion', href: '/seller/restaurant/offers', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className={`w-full ${a.color} border px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between transition-colors`}>
                <span>{a.label}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="font-black text-white">Low Stock Alert</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">{LOW_STOCK_ITEMS.length} ingredients running low.</p>
            <div className="space-y-2">
              {LOW_STOCK_ITEMS.map((item) => (
                <div key={item.name} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-slate-300">{item.name}</span>
                  <span className="text-[10px] font-bold text-amber-400">{item.current} / {item.threshold}</span>
                </div>
              ))}
            </div>
            <Link href="/seller/restaurant/inventory" className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Package className="w-4 h-4" /> Manage Inventory
            </Link>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900">Recent Reviews</h2>
            <span className="text-xs font-bold text-slate-500">{a.avgRating} ★ avg</span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Rahul S.', rating: 5, text: 'Best biryani in town! Perfectly spiced.', time: '2h ago' },
              { name: 'Priya M.', rating: 4, text: 'Great food, delivery was a bit late.', time: '5h ago' },
              { name: 'Amit K.', rating: 5, text: 'The mutton mandi is incredible.', time: '8h ago' },
            ].map((r, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{r.name}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{r.text}</p>
                <p className="text-[10px] text-slate-400 mt-1">{r.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
