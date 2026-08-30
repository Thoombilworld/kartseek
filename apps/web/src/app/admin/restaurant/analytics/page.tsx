'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Star,
  Clock, Users, Utensils, Bike, CalendarDays, BarChart3,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

const PERIODS = ['Today', '7 Days', '30 Days', '90 Days'];

export default function RestaurantAnalyticsPage() {
  const [period, setPeriod] = useState('30 Days');

  const stats = [
    { label: 'Total Revenue', value: '₹48.5L', change: '+12.5%', up: true, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Total Orders', value: '12,842', change: '+8.2%', up: true, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Avg Order Value', value: '₹378', change: '+3.1%', up: true, icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Avg Rating', value: '4.52', change: '-0.03', up: false, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Avg Delivery Time', value: '31 min', change: '-2 min', up: true, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Active Restaurants', value: '847', change: '+24', up: true, icon: Utensils, color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  const topRestaurants = [
    { rank: 1, name: 'Biryani House', city: 'Hyderabad', revenue: '₹12.4L', orders: 2841, rating: 4.6 },
    { rank: 2, name: 'Burger King (Andheri)', city: 'Mumbai', revenue: '₹9.8L', orders: 2103, rating: 4.5 },
    { rank: 3, name: 'Pizza Palace', city: 'Mumbai', revenue: '₹8.2L', orders: 1842, rating: 4.7 },
    { rank: 4, name: 'Sushi Kingdom', city: 'Mumbai', revenue: '₹7.6L', orders: 956, rating: 4.9 },
    { rank: 5, name: 'Al Mahara Seafood', city: 'Dubai', revenue: '₹6.1L', orders: 1205, rating: 4.8 },
  ];

  const cuisineTrends = [
    { name: 'Indian', orders: 4521, share: 35, color: 'bg-orange-500' },
    { name: 'Fast Food', orders: 2842, share: 22, color: 'bg-blue-500' },
    { name: 'Italian', orders: 1521, share: 12, color: 'bg-rose-500' },
    { name: 'Japanese', orders: 1205, share: 9, color: 'bg-purple-500' },
    { name: 'Arabic', orders: 980, share: 8, color: 'bg-teal-500' },
    { name: 'Others', orders: 1773, share: 14, color: 'bg-slate-400' },
  ];

  const orderTypes = [
    { type: 'Delivery', icon: Bike, count: 8420, share: 65, color: 'bg-orange-500' },
    { type: 'Takeaway', icon: ShoppingBag, count: 2810, share: 22, color: 'bg-purple-500' },
    { type: 'Dine-in', icon: Utensils, count: 1240, share: 10, color: 'bg-emerald-500' },
    { type: 'Table Booking', icon: CalendarDays, count: 372, share: 3, color: 'bg-blue-500' },
  ];

  const revenueByHour = [
    { hour: '9AM', value: 5 }, { hour: '10AM', value: 12 }, { hour: '11AM', value: 25 },
    { hour: '12PM', value: 65 }, { hour: '1PM', value: 85 }, { hour: '2PM', value: 55 },
    { hour: '3PM', value: 28 }, { hour: '4PM', value: 15 }, { hour: '5PM', value: 22 },
    { hour: '6PM', value: 42 }, { hour: '7PM', value: 78 }, { hour: '8PM', value: 95 },
    { hour: '9PM', value: 88 }, { hour: '10PM', value: 62 }, { hour: '11PM', value: 30 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/restaurant" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft className="w-5 h-5 text-slate-600" /></Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Restaurant Analytics</h1>
            <p className="text-sm text-slate-500">Platform-wide restaurant performance metrics</p>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              <p className={`text-xs font-bold mt-1 flex items-center gap-0.5 ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {s.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue by Hour */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Revenue by Hour</h3>
          <div className="flex items-end gap-1 h-40">
            {revenueByHour.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-orange-100 rounded-t" style={{ height: `${h.value}%` }}>
                  <div className="w-full h-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t hover:from-orange-600 hover:to-orange-500 transition-all cursor-pointer" />
                </div>
                <span className="text-[9px] text-slate-400 font-bold">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Type Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Order Types</h3>
          <div className="space-y-4">
            {orderTypes.map(o => {
              const Icon = o.icon;
              return (
                <div key={o.type} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700">{o.type}</span>
                      <span className="text-sm text-slate-500">{o.count.toLocaleString()} ({o.share}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${o.color} h-2 rounded-full transition-all`} style={{ width: `${o.share}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Restaurants */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200"><h3 className="font-bold text-slate-900">Top Restaurants by Revenue</h3></div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {topRestaurants.map(r => (
                <tr key={r.rank} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3"><span className="w-7 h-7 bg-orange-50 text-orange-600 rounded-lg inline-flex items-center justify-center text-xs font-black">#{r.rank}</span></td>
                  <td className="py-3"><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.city}</p></td>
                  <td className="px-5 py-3 text-right font-bold">{r.revenue}</td>
                  <td className="px-5 py-3 text-right text-slate-500">{r.orders.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-bold text-amber-600 flex items-center justify-end gap-0.5"><Star className="w-3 h-3 fill-amber-400" /> {r.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cuisine Trends */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Cuisine Popularity</h3>
          <div className="space-y-3">
            {cuisineTrends.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${c.color}`} />
                <span className="text-sm font-bold text-slate-700 w-20">{c.name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div className={`${c.color} h-2.5 rounded-full`} style={{ width: `${c.share}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right">{c.orders.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-700 w-10 text-right">{c.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
