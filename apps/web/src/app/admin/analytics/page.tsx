'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React, { useState } from 'react';
import { TrendingUp, Users, ShoppingCart, ArrowUpRight, ArrowDownRight, Store, Car, UtensilsCrossed, Calendar, DollarSign, Pill, Stethoscope, Activity, Truck, BarChart3, PieChart } from 'lucide-react';

const modules = [
  { name:'Marketplace',icon:<ShoppingCart className="w-4 h-4"/>,revenue:'₹1.8M',orders:8420,growth:'+12.5%',up:true,share:32,color:'bg-blue-500',lightBg:'bg-blue-50',textC:'text-blue-700' },
  { name:'Grocery',icon:<Store className="w-4 h-4"/>,revenue:'₹1.2M',orders:5100,growth:'+18.2%',up:true,share:21,color:'bg-green-500',lightBg:'bg-green-50',textC:'text-green-700' },
  { name:'Restaurant',icon:<UtensilsCrossed className="w-4 h-4"/>,revenue:'₹0.9M',orders:3800,growth:'+8.4%',up:true,share:16,color:'bg-orange-500',lightBg:'bg-orange-50',textC:'text-orange-700' },
  { name:'Taxi',icon:<Car className="w-4 h-4"/>,revenue:'₹0.6M',orders:3200,growth:'+22.1%',up:true,share:11,color:'bg-amber-500',lightBg:'bg-amber-50',textC:'text-amber-700' },
  { name:'Pharmacy',icon:<Pill className="w-4 h-4"/>,revenue:'₹0.4M',orders:1200,growth:'+5.8%',up:true,share:7,color:'bg-cyan-500',lightBg:'bg-cyan-50',textC:'text-cyan-700' },
  { name:'Doctor',icon:<Stethoscope className="w-4 h-4"/>,revenue:'₹0.2M',orders:480,growth:'+32.4%',up:true,share:4,color:'bg-purple-500',lightBg:'bg-purple-50',textC:'text-purple-700' },
  { name:'Delivery Fees',icon:<Truck className="w-4 h-4"/>,revenue:'₹0.5M',orders:12500,growth:'+10.1%',up:true,share:9,color:'bg-violet-500',lightBg:'bg-violet-50',textC:'text-violet-700' },
];

const dailyTrend = [
  { day:'Mon',revenue:680000,orders:2100 },{ day:'Tue',revenue:720000,orders:2280 },
  { day:'Wed',revenue:690000,orders:2150 },{ day:'Thu',revenue:810000,orders:2540 },
  { day:'Fri',revenue:920000,orders:2890 },{ day:'Sat',revenue:1100000,orders:3420 },
  { day:'Sun',revenue:780000,orders:2480 },
];

const topCities = [
  { city:'Mumbai',revenue:'₹1.4M',orders:5200,share:25 },
  { city:'Delhi NCR',revenue:'₹1.1M',orders:4100,share:20 },
  { city:'Bangalore',revenue:'₹0.9M',orders:3400,share:16 },
  { city:'Hyderabad',revenue:'₹0.6M',orders:2200,share:11 },
  { city:'Chennai',revenue:'₹0.5M',orders:1800,share:9 },
  { city:'Others',revenue:'₹1.1M',orders:4200,share:19 },
];

const maxRev = Math.max(...dailyTrend.map(d=>d.revenue));

export default function AnalyticsPage(){
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [period,setPeriod]=useState('7d');

  return(<div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1><p className="text-slate-500 text-sm">Comprehensive performance metrics across all KARTSEEK modules.</p></div>
      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
        {[{v:'1d',l:'Today'},{v:'7d',l:'7 Days'},{v:'30d',l:'30 Days'},{v:'90d',l:'Quarter'}].map(p=>(
          <button key={p.v} onClick={()=>setPeriod(p.v)} className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${period===p.v?'bg-emerald-50 text-emerald-700 font-bold shadow-sm':'text-slate-600 hover:bg-slate-50'}`}>{p.l}</button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white"><DollarSign className="w-5 h-5 opacity-80"/><p className="text-3xl font-black mt-3">₹5.6M</p><p className="text-sm font-medium opacity-80 mt-1">Gross Revenue</p><p className="text-xs font-bold mt-1 flex items-center gap-0.5 opacity-90"><ArrowUpRight className="w-3 h-3"/> +14.2% vs last period</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><ShoppingCart className="w-5 h-5 text-blue-500"/><p className="text-2xl font-black text-slate-900 mt-3">34,700</p><p className="text-sm text-slate-500 font-medium mt-1">Total Orders</p><p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3"/> +8.2%</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><Users className="w-5 h-5 text-indigo-500"/><p className="text-2xl font-black text-slate-900 mt-3">42,190</p><p className="text-sm text-slate-500 font-medium mt-1">Active Users</p><p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3"/> +15.4%</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><Activity className="w-5 h-5 text-amber-500"/><p className="text-2xl font-black text-slate-900 mt-3">4.8%</p><p className="text-sm text-slate-500 font-medium mt-1">Conversion Rate</p><p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3"/> -1.2%</p></div>
    </div>

    {/* Revenue Trend Chart */}
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <h2 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500"/> Daily Revenue Trend</h2>
      <div className="flex items-end gap-3 h-48">
        {dailyTrend.map((d,i)=>(
          <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
            <p className="text-xs font-bold text-slate-700">₹{(d.revenue/100000).toFixed(1)}L</p>
            <div className="w-full rounded-t-lg bg-linear-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500" style={{height:`${(d.revenue/maxRev)*100}%`,minHeight:'8px'}}/>
            <p className="text-xs font-bold text-slate-500">{d.day}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue by Module */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-500"/> Revenue by Module</h2>
        <div className="space-y-4">
          {modules.map(m=>(
            <div key={m.name}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-2 text-sm">{m.icon} {m.name}</span>
                <span className="font-bold text-slate-900 text-sm">{m.revenue} <span className="text-xs text-slate-400 font-medium">({m.share}%)</span></span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2"><div className={`${m.color} h-2 rounded-full transition-all`} style={{width:`${m.share*2.5}%`}}/></div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">{m.orders.toLocaleString()} orders</span>
                <span className={`text-xs font-bold ${m.up?'text-emerald-600':'text-red-600'} flex items-center gap-0.5`}>{m.up?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}{m.growth}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Cities */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500"/> Revenue by City</h2>
        <div className="space-y-4">
          {topCities.map((c,i)=>(
            <div key={c.city} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i===0?'bg-amber-100 text-amber-700':i===1?'bg-slate-100 text-slate-700':i===2?'bg-orange-100 text-orange-700':'bg-slate-50 text-slate-500'}`}>{i+1}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-900 text-sm">{c.city}</span><span className="font-bold text-slate-900 text-sm">{c.revenue}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width:`${c.share*3.5}%`}}/></div>
                <div className="flex justify-between mt-1"><span className="text-xs text-slate-500">{c.orders.toLocaleString()} orders</span><span className="text-xs text-slate-500">{c.share}% share</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Financial Summary */}
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-500"/> Financial Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 font-medium mb-1">Gross Revenue</p><p className="text-xl font-black text-slate-900">₹5.6M</p></div>
        <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 font-medium mb-1">Commission</p><p className="text-xl font-black text-emerald-600">₹840K</p></div>
        <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 font-medium mb-1">Delivery Fees</p><p className="text-xl font-black text-slate-900">₹520K</p></div>
        <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 font-medium mb-1">Refunds</p><p className="text-xl font-black text-red-600">₹185K</p></div>
        <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 font-medium mb-1">Partner Payouts</p><p className="text-xl font-black text-slate-900">₹4.1M</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200"><p className="text-xs text-emerald-600 font-medium mb-1">Net Platform Profit</p><p className="text-xl font-black text-emerald-700">₹1.18M</p></div>
      </div>
    </div>
  </div>);
}
