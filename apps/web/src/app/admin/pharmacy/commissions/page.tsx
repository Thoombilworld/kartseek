'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { Percent, Save, Info } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const initCommissions = [
  { category:'OTC Medicines',rate:8,orders:4200,revenue:'₹3.36L' },
  { category:'Prescription Medicines',rate:5,orders:2800,revenue:'₹1.40L' },
  { category:'Baby Care',rate:10,orders:1200,revenue:'₹1.20L' },
  { category:'Personal Care',rate:12,orders:1800,revenue:'₹2.16L' },
  { category:'Health Devices',rate:10,orders:650,revenue:'₹0.65L' },
  { category:'Vitamins & Supplements',rate:12,orders:980,revenue:'₹1.18L' },
  { category:'First Aid',rate:8,orders:450,revenue:'₹0.36L' },
  { category:'Skin Care',rate:15,orders:720,revenue:'₹1.08L' },
  { category:'Hair Care',rate:15,orders:380,revenue:'₹0.57L' },
  { category:'Wellness Products',rate:12,orders:540,revenue:'₹0.65L' },
  { category:'Medical Equipment',rate:8,orders:180,revenue:'₹0.14L' },
  { category:'Elderly Care',rate:10,orders:320,revenue:'₹0.32L' },
];

export default function PharmacyCommissionsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [data,setData]=useState(initCommissions);
  const [saved,setSaved]=useState(false);
  const updateRate=(cat:string,rate:number)=>{setData(p=>p.map(c=>c.category===cat?{...c,rate}:c));setSaved(false);};
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Commission Rates</h1><p className="text-slate-500 text-sm">Set platform commission rates per product category. Revenue shown is commission earned (MTD).</p></div>
      <button onClick={save} className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${saved?'bg-emerald-600 text-white':'bg-cyan-600 hover:bg-cyan-700 text-white'}`} aria-label="Action">{saved?<><Percent className="w-4 h-4"/>Saved!</>:<><Save className="w-4 h-4"/>Save Changes</>}</button>
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"><Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/><p className="text-sm text-amber-700">Commission rates apply to the selling price of each product. Changes take effect for new orders immediately. Existing orders retain their original commission rate.</p></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Category</th><th className="px-5 py-3.5 font-semibold text-center">Rate (%)</th><th className="px-5 py-3.5 font-semibold text-right">Orders (MTD)</th><th className="px-5 py-3.5 font-semibold text-right">Commission (MTD)</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{data.map(c=>(
        <tr key={c.category} className="hover:bg-slate-50/50">
          <td className="px-5 py-4 font-bold text-slate-900">{c.category}</td>
          <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-2"><input type="number" value={c.rate} onChange={e =>updateRate(c.category,parseInt(e.target.value)||0)} className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500" min={0} max={50}/><span className="text-slate-400 text-xs">%</span></div></td>
          <td className="px-5 py-4 text-right text-slate-600">{c.orders.toLocaleString()}</td>
          <td className="px-5 py-4 text-right font-bold text-emerald-600">{c.revenue}</td>
        </tr>
      ))}</tbody>
    </table></div>
  </div>);
}
