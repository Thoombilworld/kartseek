'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState } from 'react';
import { Gift, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

const initOffers = [
  { id:'OF-01',code:'PHARMA25',type:'Percentage',value:'25%',minOrder:'₹500',maxDiscount:'₹200',usage:342,limit:1000,status:'active' as const,expiry:'20 Jun 2026',desc:'25% off on OTC medicines' },
  { id:'OF-02',code:'FIRSTAID10',type:'Flat',value:'₹100',minOrder:'₹300',maxDiscount:'₹100',usage:128,limit:500,status:'active' as const,expiry:'30 Jun 2026',desc:'₹100 off on First Aid products' },
  { id:'OF-03',code:'BABYCARE',type:'Percentage',value:'30%',minOrder:'₹400',maxDiscount:'₹300',usage:89,limit:200,status:'active' as const,expiry:'25 Jun 2026',desc:'30% off on baby care' },
  { id:'OF-04',code:'WELLNESS',type:'Flat',value:'₹50',minOrder:'₹200',maxDiscount:'₹50',usage:450,limit:450,status:'expired' as const,expiry:'10 Jun 2026',desc:'₹50 off on wellness' },
];

export default function PharmacyOffersPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [data,setData]=useState(initOffers);const [search,setSearch]=useState('');
  const filtered=data.filter(o=>o.code.toLowerCase().includes(search.toLowerCase())||o.desc.toLowerCase().includes(search.toLowerCase()));
  const toggle=(id:string)=>setData(p=>p.map(o=>o.id===id?{...o,status:o.status==='active'?'expired' as const:'active' as const}:o));

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Offers & Coupons</h1><p className="text-slate-500 text-sm">Create and manage pharmacy discount coupons and promotions.</p></div>
      <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Create Offer</button>
    </div>
    <div className="relative w-full md:w-80"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search offers..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Code</th><th className="px-5 py-3.5 font-semibold">Type</th><th className="px-5 py-3.5 font-semibold text-right">Value</th><th className="px-5 py-3.5 font-semibold text-right">Min Order</th><th className="px-5 py-3.5 font-semibold text-center">Usage</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold">Expiry</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(o=>(
        <tr key={o.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900 font-mono">{o.code}</p><p className="text-xs text-slate-400 mt-0.5">{o.desc}</p></td>
          <td className="px-5 py-4"><span className="bg-cyan-50 text-cyan-700 text-xs font-bold px-2 py-0.5 rounded">{o.type}</span></td>
          <td className="px-5 py-4 text-right font-bold text-slate-900">{o.value}</td>
          <td className="px-5 py-4 text-right text-slate-600">{o.minOrder}</td>
          <td className="px-5 py-4 text-center"><span className={`text-xs font-bold ${o.usage>=o.limit?'text-red-600':'text-slate-700'}`}>{o.usage}/{o.limit}</span></td>
          <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${o.status==='active'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{o.status==='active'?'Active':'Expired'}</span></td>
          <td className="px-5 py-4 text-slate-600 text-xs">{o.expiry}</td>
          <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1">
            <button onClick={()=>toggle(o.id)} className="p-1.5 rounded-lg hover:bg-slate-100">{o.status==='active'?<EyeOff className="w-4 h-4 text-slate-400"/>:<Eye className="w-4 h-4 text-emerald-500"/>}</button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Edit"><Edit className="w-4 h-4 text-slate-400"/></button>
            <button className="p-1.5 rounded-lg hover:bg-red-50" aria-label="Delete"><Trash2 className="w-4 h-4 text-red-400"/></button>
          </div></td>
        </tr>
      ))}</tbody>
    </table></div></div>
  </div>);
}
