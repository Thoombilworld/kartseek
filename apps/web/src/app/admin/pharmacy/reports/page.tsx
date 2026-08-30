'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Pill, ArrowUpRight, Package } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const kpis = [
  { label:'Total Revenue',value:'₹62.8L',change:'+12.4%',up:true,icon:DollarSign,color:'text-emerald-500 bg-emerald-50' },
  { label:'Total Orders',value:'12,470',change:'+8.2%',up:true,icon:ShoppingCart,color:'text-blue-500 bg-blue-50' },
  { label:'Active Pharmacies',value:'4',change:'+1',up:true,icon:Pill,color:'text-cyan-500 bg-cyan-50' },
  { label:'Avg. Order Value',value:'₹503',change:'-2.1%',up:false,icon:Package,color:'text-purple-500 bg-purple-50' },
];

const topStores = [
  { name:'Apollo Pharmacy',revenue:'₹28L',orders:5200,rating:4.8 },
  { name:'HealthPlus Pharmacy',revenue:'₹18L',orders:3800,rating:4.7 },
  { name:'MedPlus Pharmacy',revenue:'₹12L',orders:2400,rating:4.6 },
  { name:'PharmEasy Store',revenue:'₹8.5L',orders:1560,rating:4.5 },
];

const topProducts = [
  { name:'Paracetamol 500mg',brand:'Dolo',category:'Medicines',sold:4200 },
  { name:'Vitamin C 1000mg',brand:'Celin',category:'Vitamins',sold:2800 },
  { name:'Hand Sanitizer',brand:'Dettol',category:'Personal Care',sold:2100 },
  { name:'Baby Diaper Pants',brand:'Pampers',category:'Baby Care',sold:1800 },
  { name:'Glucometer Kit',brand:'Accu-Chek',category:'Diabetic Care',sold:950 },
];

const monthlySales = [
  { month:'Jan',revenue:38,orders:8200 },{ month:'Feb',revenue:41,orders:8800 },
  { month:'Mar',revenue:45,orders:9500 },{ month:'Apr',revenue:48,orders:10200 },
  { month:'May',revenue:55,orders:11400 },{ month:'Jun',revenue:63,orders:12470 },
];

export default function PharmacyReportsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Pharmacy Reports</h1><p className="text-slate-500 text-sm">Analytics overview — revenue, orders, top performers, and category breakdown.</p></div>

    {/* KPIs */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map(k=>{const Icon=k.icon;return(
        <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className={`w-10 h-10 rounded-xl ${k.color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5"/></div>
          <p className="text-2xl font-black text-slate-900">{k.value}</p>
          <div className="flex items-center justify-between mt-2"><p className="text-xs text-slate-500 font-medium">{k.label}</p><span className={`text-xs font-bold flex items-center gap-0.5 ${k.up?'text-emerald-600':'text-red-500'}`}>{k.up?<TrendingUp className="w-3 h-3"/>:<TrendingDown className="w-3 h-3"/>}{k.change}</span></div>
        </div>
      )})}
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Monthly Trend */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-cyan-600"/>Monthly Revenue (₹ Lakh)</h2>
        <div className="flex items-end gap-3 h-40">{monthlySales.map(m=>(
          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold text-slate-600">{m.revenue}L</p>
            <div className="w-full bg-linear-to-t from-cyan-500 to-cyan-400 rounded-t-lg" style={{height:`${(m.revenue/63)*100}%`,minHeight:8}}/>
            <p className="text-[10px] font-medium text-slate-400">{m.month}</p>
          </div>
        ))}</div>
      </div>

      {/* Top Stores */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Pill className="w-5 h-5 text-cyan-600"/>Top Pharmacies</h2>
        <div className="space-y-3">{topStores.map((s,i)=>(
          <div key={s.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <span className="text-lg font-black text-slate-300 w-6 text-center">#{i+1}</span>
            <div className="flex-1"><p className="font-bold text-slate-900 text-sm">{s.name}</p><p className="text-xs text-slate-500">{s.orders.toLocaleString()} orders • ★ {s.rating}</p></div>
            <p className="font-black text-emerald-600">{s.revenue}</p>
          </div>
        ))}</div>
      </div>
    </div>

    {/* Top Products */}
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-cyan-600"/>Top Selling Products</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="text-slate-500"><tr><th className="px-4 py-2.5 font-semibold">#</th><th className="px-4 py-2.5 font-semibold">Product</th><th className="px-4 py-2.5 font-semibold">Brand</th><th className="px-4 py-2.5 font-semibold">Category</th><th className="px-4 py-2.5 font-semibold text-right">Units Sold</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{topProducts.map((p,i)=>(
          <tr key={p.name} className="hover:bg-slate-50/50">
            <td className="px-4 py-3 font-bold text-slate-300">{i+1}</td>
            <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
            <td className="px-4 py-3 text-slate-600">{p.brand}</td>
            <td className="px-4 py-3"><span className="bg-cyan-50 text-cyan-700 text-xs font-bold px-2 py-0.5 rounded">{p.category}</span></td>
            <td className="px-4 py-3 text-right font-bold text-slate-900">{p.sold.toLocaleString()}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  </div>);
}
