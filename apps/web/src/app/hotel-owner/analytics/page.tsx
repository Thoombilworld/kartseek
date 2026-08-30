'use client';
import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, CalendarCheck, DollarSign, Star, BedDouble } from 'lucide-react';
import { BarFill, BarHeight } from '@/components/bar-fill';
export default function AnalyticsPage(){
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1><p className="text-slate-500 text-sm">Track your hotel performance metrics and trends.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><CalendarCheck className="w-5 h-5 text-blue-500"/><span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>+15%</span></div><p className="text-2xl font-black text-slate-900">340</p><p className="text-xs text-slate-500">Monthly Bookings</p></div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><DollarSign className="w-5 h-5 text-emerald-500"/><span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>+22%</span></div><p className="text-2xl font-black text-slate-900">AED 120K</p><p className="text-xs text-slate-500">Monthly Revenue</p></div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><BedDouble className="w-5 h-5 text-purple-500"/><span className="text-xs font-bold text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3"/>-2%</span></div><p className="text-2xl font-black text-slate-900">87%</p><p className="text-xs text-slate-500">Occupancy</p></div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><Star className="w-5 h-5 text-amber-500"/><span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>+0.1</span></div><p className="text-2xl font-black text-slate-900">4.8</p><p className="text-xs text-slate-500">Avg Rating</p></div>
    </div>
    {/* Revenue by Room Type */}
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-4">Revenue by Room Type</h3>
      <div className="space-y-3">
        {[{room:'Deluxe King Room',revenue:54000,percentage:45,color:'bg-rose-500'},
          {room:'Premium Twin Room',revenue:31200,percentage:26,color:'bg-blue-500'},
          {room:'Executive Suite',revenue:25500,percentage:21,color:'bg-purple-500'},
          {room:'Family Suite',revenue:9300,percentage:8,color:'bg-amber-500'},
        ].map(r=>(
          <div key={r.room} className="flex items-center gap-4">
            <div className="w-36 text-sm font-medium text-slate-700 truncate">{r.room}</div>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden"><BarFill width={`${r.percentage}%`} className={`h-full rounded-full ${r.color}`}/></div>
            <div className="w-24 text-right text-sm font-bold text-slate-900">AED {(r.revenue/1000).toFixed(0)}K</div>
            <div className="w-12 text-right text-xs text-slate-400">{r.percentage}%</div>
          </div>
        ))}
      </div>
    </div>
    {/* Monthly Trend */}
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-4">Monthly Booking Trend</h3>
      <div className="flex items-end gap-2 h-40">
        {[{month:'Jan',val:220},{month:'Feb',val:280},{month:'Mar',val:310},{month:'Apr',val:350},{month:'May',val:320},{month:'Jun',val:340}].map(m=>(
          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500">{m.val}</span>
            <BarHeight height={`${(m.val/350)*100}%`} className="w-full bg-rose-500 rounded-t-lg"/>
            <span className="text-[10px] text-slate-400 font-medium">{m.month}</span>
          </div>
        ))}
      </div>
    </div>
  </div>);
}
