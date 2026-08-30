'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Eye, CheckCircle, Package, Truck, Clock } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const initOrders = [
  { id:'PO-1001',customer:'John K.',store:'HealthPlus Pharmacy',items:3,total:'₹485',rx:true,status:'delivered' as const,date:'13 Jun 2026',time:'2:30 PM' },
  { id:'PO-1002',customer:'Mary W.',store:'Apollo Pharmacy',items:1,total:'₹350',rx:false,status:'shipped' as const,date:'13 Jun 2026',time:'1:15 PM' },
  { id:'PO-1003',customer:'Peter N.',store:'MedPlus Pharmacy',items:5,total:'₹1,250',rx:true,status:'processing' as const,date:'13 Jun 2026',time:'12:00 PM' },
  { id:'PO-1004',customer:'Sarah L.',store:'PharmEasy Store',items:2,total:'₹890',rx:false,status:'pending' as const,date:'13 Jun 2026',time:'11:45 AM' },
  { id:'PO-1005',customer:'David O.',store:'WellBeing Pharmacy',items:4,total:'₹2,100',rx:false,status:'delivered' as const,date:'12 Jun 2026',time:'6:30 PM' },
  { id:'PO-1006',customer:'Grace M.',store:'BabyMed Pharmacy',items:2,total:'₹680',rx:false,status:'cancelled' as const,date:'12 Jun 2026',time:'3:00 PM' },
];

const stCfg:Record<string,{bg:string;l:string;icon:typeof Clock}>={
  pending:{bg:'bg-blue-100 text-blue-700',l:'Pending',icon:Clock},
  processing:{bg:'bg-amber-100 text-amber-700',l:'Processing',icon:Package},
  shipped:{bg:'bg-purple-100 text-purple-700',l:'Shipped',icon:Truck},
  delivered:{bg:'bg-emerald-100 text-emerald-700',l:'Delivered',icon:CheckCircle},
  cancelled:{bg:'bg-red-100 text-red-700',l:'Cancelled',icon:Clock},
};

export default function PharmacyOrdersPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');
  const filtered=initOrders.filter(o=>{const ms=o.id.toLowerCase().includes(search.toLowerCase())||o.customer.toLowerCase().includes(search.toLowerCase());const mst=sf==='All'||o.status===sf;return ms&&mst;});

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Pharmacy Orders</h1><p className="text-slate-500 text-sm">Monitor order status, prescription verification, and delivery tracking.</p></div>
      <div className="flex gap-2 text-xs">
        <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold">{initOrders.filter(o=>o.status==='pending').length} Pending</span>
        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">{initOrders.filter(o=>o.status==='processing').length} Processing</span>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{initOrders.filter(o=>o.status==='delivered').length} Delivered</span>
      </div>
    </div>
    <div className="flex gap-3"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search orders..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
      <select value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Order</th><th className="px-5 py-3.5 font-semibold">Customer</th><th className="px-5 py-3.5 font-semibold">Store</th><th className="px-5 py-3.5 font-semibold text-center">Items</th><th className="px-5 py-3.5 font-semibold text-right">Total</th><th className="px-5 py-3.5 font-semibold text-center">Rx</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(o=>{const cfg=stCfg[o.status];const Icon=cfg.icon;return(
        <tr key={o.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{o.id}</p><p className="text-xs text-slate-400">{o.date} • {o.time}</p></td>
          <td className="px-5 py-4 font-medium text-slate-700">{o.customer}</td>
          <td className="px-5 py-4 text-xs text-slate-600">{o.store}</td>
          <td className="px-5 py-4 text-center font-bold">{o.items}</td>
          <td className="px-5 py-4 text-right font-bold text-slate-900">{o.total}</td>
          <td className="px-5 py-4 text-center">{o.rx?<span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">Rx</span>:<span className="text-slate-300 text-xs">—</span>}</td>
          <td className="px-5 py-4 text-center"><span className={`${cfg.bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}><Icon className="w-3 h-3"/>{cfg.l}</span></td>
          <td className="px-5 py-4 text-center"><button className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="View"><Eye className="w-4 h-4 text-slate-400"/></button></td>
        </tr>
      );})}</tbody>
    </table></div></div>
  </div>);
}
