'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Hotel, CalendarCheck, DollarSign, BedDouble, Star, Globe } from 'lucide-react';
import { BarFill } from '@/components/bar-fill';
import { adminHotelApi } from '@/lib/api/admin-hotel';
export default function ReportsPage(){
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1><p className="text-slate-500 text-sm">Comprehensive performance analytics, trends, and fraud monitoring for hotel operations.</p></div>

    {/* KPI Overview */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><div className="flex items-center justify-between mb-3"><Hotel className="w-5 h-5 text-rose-500"/><span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>+8.2%</span></div><p className="text-2xl font-black text-slate-900">156</p><p className="text-xs text-slate-500 font-medium">Total Hotels</p></div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><div className="flex items-center justify-between mb-3"><CalendarCheck className="w-5 h-5 text-blue-500"/><span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>+15.4%</span></div><p className="text-2xl font-black text-slate-900">3,800</p><p className="text-xs text-slate-500 font-medium">Monthly Bookings</p></div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><div className="flex items-center justify-between mb-3"><DollarSign className="w-5 h-5 text-emerald-500"/><span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>+22.1%</span></div><p className="text-2xl font-black text-slate-900">AED 2.4M</p><p className="text-xs text-slate-500 font-medium">Monthly Revenue</p></div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><div className="flex items-center justify-between mb-3"><BedDouble className="w-5 h-5 text-purple-500"/><span className="text-xs font-bold text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3"/>-2.1%</span></div><p className="text-2xl font-black text-slate-900">78%</p><p className="text-xs text-slate-500 font-medium">Avg Occupancy</p></div>
    </div>

    {/* Performance by City */}
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-rose-500"/>Performance by City</h3>
      <div className="space-y-3">
        {[{city:'Dubai',hotels:45,bookings:12500,revenue:'AED 8.2M',occupancy:87,growth:'+18%',color:'bg-rose-500'},
          {city:'Mumbai',hotels:32,bookings:9800,revenue:'₹5.6Cr',occupancy:91,growth:'+24%',color:'bg-amber-500'},
          {city:'Doha',hotels:18,bookings:4200,revenue:'QAR 3.1M',occupancy:72,growth:'+12%',color:'bg-blue-500'},
          {city:'London',hotels:12,bookings:3600,revenue:'£2.8M',occupancy:95,growth:'+8%',color:'bg-purple-500'},
          {city:'Riyadh',hotels:22,bookings:5100,revenue:'SAR 4.5M',occupancy:68,growth:'+32%',color:'bg-emerald-500'},
        ].map(c=>(
          <div key={c.city} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="w-24 font-bold text-slate-900 text-sm">{c.city}</div>
            <div className="flex-1"><div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><BarFill width={`${c.occupancy}%`} className={`h-full rounded-full ${c.color}`}/></div></div>
            <div className="text-xs text-slate-500 w-20 text-right">{c.hotels} hotels</div>
            <div className="text-xs font-bold text-slate-700 w-24 text-right">{c.bookings.toLocaleString()} bookings</div>
            <div className="text-xs font-bold text-emerald-600 w-16 text-right">{c.growth}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Top Performing Hotels */}
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500"/>Top Performing Hotels</h3>
      <div className="space-y-2">
        {[{rank:1,name:'Seaside Family Resort',city:'Mumbai',rating:4.7,bookings:4500,revenue:'₹2.8Cr',occupancy:91},
          {rank:2,name:'The Grand Palace Hotel',city:'Dubai',rating:4.8,bookings:3200,revenue:'AED 1.4M',occupancy:87},
          {rank:3,name:'Heritage Boutique Hotel',city:'London',rating:4.9,bookings:2100,revenue:'£1.2M',occupancy:95},
          {rank:4,name:'KARTSEEK Business Suites',city:'Doha',rating:4.6,bookings:1800,revenue:'QAR 980K',occupancy:72},
          {rank:5,name:'Royal Palm Resort',city:'Riyadh',rating:4.5,bookings:1500,revenue:'SAR 890K',occupancy:78},
        ].map(h=>(
          <div key={h.rank} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${h.rank<=3?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{h.rank}</span>
            <div className="flex-1"><p className="font-bold text-sm text-slate-900">{h.name}</p><p className="text-xs text-slate-400">{h.city}</p></div>
            <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{h.rating}</span>
            <span className="text-xs text-slate-500 w-24 text-right">{h.bookings.toLocaleString()} bookings</span>
            <span className="text-xs font-bold text-emerald-600 w-24 text-right">{h.revenue}</span>
          </div>
        ))}
      </div>
    </div>
  </div>);
}
