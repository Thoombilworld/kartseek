'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle, XCircle, Eye, AlertTriangle, Pill } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const initProducts = [
  { id:'PM-001',name:'Paracetamol 500mg',brand:'Dolo',category:'Medicines',store:'MedPlus Pharmacy',price:'₹25',mrp:'₹32',rx:false,status:'approved' as const,stock:450 },
  { id:'PM-002',name:'Amoxicillin 250mg',brand:'Amoxil',category:'Prescription Medicines',store:'Apollo Pharmacy',price:'₹85',mrp:'₹110',rx:true,status:'approved' as const,stock:120 },
  { id:'PM-003',name:'Baby Diaper Pants (L)',brand:'Pampers',category:'Baby Care',store:'BabyMed Pharmacy',price:'₹450',mrp:'₹550',rx:false,status:'approved' as const,stock:80 },
  { id:'PM-004',name:'Digital Thermometer',brand:'Omron',category:'Health Devices',store:'Apollo Pharmacy',price:'₹350',mrp:'₹450',rx:false,status:'pending' as const,stock:25 },
  { id:'PM-005',name:'Glucometer Kit',brand:'Accu-Chek',category:'Diabetic Care',store:'DiaCare Hub',price:'₹900',mrp:'₹1100',rx:false,status:'pending' as const,stock:15 },
  { id:'PM-006',name:'Knee Cap Support',brand:'Tynor',category:'Orthopedic Support',store:'PharmEasy Store',price:'₹420',mrp:'₹520',rx:false,status:'approved' as const,stock:35 },
  { id:'PM-007',name:'Metformin 500mg',brand:'Glycomet',category:'Prescription Medicines',store:'HealthPlus Pharmacy',price:'₹32',mrp:'₹45',rx:true,status:'rejected' as const,stock:0 },
  { id:'PM-008',name:'Protein Powder',brand:'Ensure',category:'Wellness Products',store:'LifeCare Pharmacy',price:'₹720',mrp:'₹850',rx:false,status:'approved' as const,stock:60 },
];

const stCfg:Record<string,{bg:string;l:string}>={approved:{bg:'bg-emerald-100 text-emerald-700',l:'Approved'},pending:{bg:'bg-amber-100 text-amber-700',l:'Pending'},rejected:{bg:'bg-red-100 text-red-700',l:'Rejected'}};

export default function PharmacyProductsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('All');
  const [catFilter,setCatFilter]=useState('All');
  const [data,setData]=useState(initProducts);

  const categories = [...new Set(data.map(p=>p.category))];
  const filtered = data.filter(p=>{
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter==='All' || p.status===statusFilter;
    const mc = catFilter==='All' || p.category===catFilter;
    return ms && mst && mc;
  });

  const approveProduct = (id:string) => setData(p=>p.map(r=>r.id===id?{...r,status:'approved' as const}:r));
  const rejectProduct = (id:string) => setData(p=>p.map(r=>r.id===id?{...r,status:'rejected' as const}:r));

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Product Approval</h1><p className="text-slate-500 text-sm">Review, approve, and manage pharmacy products. Rx flagging and compliance control.</p></div>
      <div className="flex gap-2 text-xs">
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{data.filter(p=>p.status==='approved').length} Approved</span>
        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">{data.filter(p=>p.status==='pending').length} Pending</span>
        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{data.filter(p=>p.rx).length} Rx Products</span>
      </div>
    </div>

    <div className="flex flex-wrap gap-3">
      <div className="flex-1 relative min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
      <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select>
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Product</th><th className="px-5 py-3.5 font-semibold">Category</th><th className="px-5 py-3.5 font-semibold">Store</th><th className="px-5 py-3.5 font-semibold text-right">Price</th><th className="px-5 py-3.5 font-semibold text-center">Rx</th><th className="px-5 py-3.5 font-semibold text-center">Stock</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(p=>(
        <tr key={p.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{p.name}</p><p className="text-xs text-slate-400">{p.brand} • {p.id}</p></td>
          <td className="px-5 py-4"><span className="bg-cyan-50 text-cyan-700 text-xs font-bold px-2 py-0.5 rounded">{p.category}</span></td>
          <td className="px-5 py-4 text-slate-600 text-xs font-medium">{p.store}</td>
          <td className="px-5 py-4 text-right"><p className="font-bold text-slate-900">{p.price}</p><p className="text-xs text-slate-400 line-through">{p.mrp}</p></td>
          <td className="px-5 py-4 text-center">{p.rx?<span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">Rx</span>:<span className="text-slate-300 text-xs">OTC</span>}</td>
          <td className="px-5 py-4 text-center"><span className={`text-xs font-bold ${p.stock===0?'text-red-600':'text-slate-700'}`}>{p.stock===0?'Out':'✓ '+p.stock}</span></td>
          <td className="px-5 py-4 text-center"><span className={`${stCfg[p.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{stCfg[p.status].l}</span></td>
          <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1">
            {p.status==='pending'&&<><button onClick={()=>approveProduct(p.id)} className="p-1.5 rounded-lg hover:bg-emerald-50" title="Approve"><CheckCircle className="w-4 h-4 text-emerald-500"/></button><button onClick={()=>rejectProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Reject"><XCircle className="w-4 h-4 text-red-400"/></button></>}
            <button className="p-1.5 rounded-lg hover:bg-slate-100" title="View"><Eye className="w-4 h-4 text-slate-400"/></button>
          </div></td>
        </tr>
      ))}</tbody>
    </table></div></div>
  </div>);
}
