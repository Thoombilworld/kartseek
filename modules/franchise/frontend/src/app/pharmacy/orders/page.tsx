'use client';
import React, { useState } from 'react';
import { Package, Search, Clock, CheckCircle, XCircle, Truck, Eye, ChevronDown, Pill, AlertTriangle } from 'lucide-react';

const ORDERS = [
  { id:'FPO-001', store:'MedPlus Pharmacy', customer:'John Doe', items:3, total:450, status:'DELIVERED', date:'Jul 5, 2026', rx:true, driver:'Peter M.' },
  { id:'FPO-002', store:'Apollo Pharmacy', customer:'Sarah K.', items:1, total:120, status:'OUT_FOR_DELIVERY', date:'Jul 5, 2026', rx:false, driver:'James O.' },
  { id:'FPO-003', store:'HealthFirst', customer:'Amit G.', items:5, total:890, status:'PREPARING', date:'Jul 5, 2026', rx:true, driver:null },
  { id:'FPO-004', store:'NetMeds Express', customer:'Priya S.', items:2, total:210, status:'CONFIRMED', date:'Jul 5, 2026', rx:false, driver:null },
  { id:'FPO-005', store:'PharmEasy Store', customer:'Rohit M.', items:4, total:1450, status:'DELIVERED', date:'Jul 4, 2026', rx:true, driver:'Grace W.' },
  { id:'FPO-006', store:'Wellness Forever', customer:'Linda N.', items:1, total:85, status:'CANCELLED', date:'Jul 4, 2026', rx:false, driver:null },
  { id:'FPO-007', store:'Care Chemist', customer:'David K.', items:3, total:320, status:'DELIVERED', date:'Jul 4, 2026', rx:false, driver:'Peter M.' },
  { id:'FPO-008', store:'MedPlus Pharmacy', customer:'Alice M.', items:2, total:560, status:'PENDING', date:'Jul 3, 2026', rx:true, driver:null },
];

const STATUS_CFG: Record<string,{label:string,color:string,bg:string}> = {
  PENDING: { label:'Pending', color:'text-amber-700', bg:'bg-amber-50' },
  CONFIRMED: { label:'Confirmed', color:'text-blue-700', bg:'bg-blue-50' },
  PREPARING: { label:'Preparing', color:'text-purple-700', bg:'bg-purple-50' },
  OUT_FOR_DELIVERY: { label:'Out for Delivery', color:'text-indigo-700', bg:'bg-indigo-50' },
  DELIVERED: { label:'Delivered', color:'text-green-700', bg:'bg-green-50' },
  CANCELLED: { label:'Cancelled', color:'text-red-700', bg:'bg-red-50' },
};

export default function FranchisePharmacyOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = ORDERS.filter(o =>
    (!search || o.store.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'All' || o.status === statusFilter)
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Orders</h1>
          <p className="text-sm text-slate-500">Monitor all pharmacy orders across your franchise zone.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input type="text" placeholder="Search orders..." value={search} onChange={e=>setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} title="Filter by status" aria-label="Filter by status"
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium cursor-pointer">
            <option>All</option>
            {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {label:'Total Orders',value:ORDERS.length,icon:Package,color:'bg-blue-50 text-blue-600'},
          {label:'Active',value:ORDERS.filter(o=>!['DELIVERED','CANCELLED'].includes(o.status)).length,icon:Clock,color:'bg-amber-50 text-amber-600'},
          {label:'Delivered',value:ORDERS.filter(o=>o.status==='DELIVERED').length,icon:CheckCircle,color:'bg-green-50 text-green-600'},
          {label:'Rx Orders',value:ORDERS.filter(o=>o.rx).length,icon:Pill,color:'bg-red-50 text-red-600'},
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-slate-500">{s.label}</p><p className="text-xl font-black text-slate-900">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-slate-600">Order ID</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600">Store</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600">Customer</th>
                <th className="text-center px-4 py-3 font-bold text-slate-600">Items</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600">Total</th>
                <th className="text-center px-4 py-3 font-bold text-slate-600">Status</th>
                <th className="text-center px-4 py-3 font-bold text-slate-600">Rx</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600">Driver</th>
                <th className="text-center px-4 py-3 font-bold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => {
                const cfg = STATUS_CFG[o.status];
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{o.id}</td>
                    <td className="px-4 py-3 text-slate-700">{o.store}</td>
                    <td className="px-4 py-3 text-slate-700">{o.customer}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{o.items}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{o.total}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-center">{o.rx ? <Pill className="w-4 h-4 text-red-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{o.driver || <span className="text-slate-300">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-center"><button className="p-1.5 hover:bg-slate-100 rounded-lg" title="View order" aria-label="View order"><Eye className="w-4 h-4 text-slate-400" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
