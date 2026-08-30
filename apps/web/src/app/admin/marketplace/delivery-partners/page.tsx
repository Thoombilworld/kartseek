'use client';
import React, { useState } from 'react';
import {
  Truck, Users, Star, Phone, MapPin, CheckCircle, XCircle, Clock,
  Search, Plus, Eye, X, Filter, Edit2, Shield, Navigation, Activity,
  Package, AlertCircle, Ban,
} from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Partner = {
  id: string; name: string; phone: string; vehicle: string; area: string;
  status: 'active' | 'inactive' | 'suspended'; rating: number; deliveries: number;
  onTime: number; joinedDate: string; currentOrder: string | null;
};

const MOCK_PARTNERS: Partner[] = [
  { id: 'DP-001', name: 'Ravi Kumar', phone: '+91 98765 43210', vehicle: 'Bike – KA 01 AB 1234', area: 'Whitefield, Bangalore', status: 'active', rating: 4.8, deliveries: 1245, onTime: 96, joinedDate: '2025-03-15', currentOrder: 'ORD-44821' },
  { id: 'DP-002', name: 'Suresh Babu', phone: '+91 87654 32109', vehicle: 'Bike – KA 03 CD 5678', area: 'Koramangala, Bangalore', status: 'active', rating: 4.6, deliveries: 892, onTime: 93, joinedDate: '2025-05-20', currentOrder: null },
  { id: 'DP-003', name: 'Pradeep Singh', phone: '+91 76543 21098', vehicle: 'Cargo Van – DL 01 EF 9012', area: 'Connaught Place, Delhi', status: 'active', rating: 4.9, deliveries: 2130, onTime: 98, joinedDate: '2024-11-01', currentOrder: 'ORD-44830' },
  { id: 'DP-004', name: 'Amit Patel', phone: '+91 65432 10987', vehicle: 'Bike – MH 02 GH 3456', area: 'Andheri, Mumbai', status: 'inactive', rating: 4.2, deliveries: 340, onTime: 88, joinedDate: '2025-08-10', currentOrder: null },
  { id: 'DP-005', name: 'Karthik R.', phone: '+91 54321 09876', vehicle: 'Bike – TN 01 IJ 7890', area: 'Anna Nagar, Chennai', status: 'suspended', rating: 3.1, deliveries: 156, onTime: 72, joinedDate: '2026-01-05', currentOrder: null },
  { id: 'DP-006', name: 'Deepak Mehra', phone: '+91 43210 98765', vehicle: 'Bike – KA 05 KL 2345', area: 'HSR Layout, Bangalore', status: 'active', rating: 4.5, deliveries: 678, onTime: 91, joinedDate: '2025-07-22', currentOrder: null },
];

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock },
  suspended: { label: 'Suspended', color: 'bg-red-50 text-red-700 border-red-200', icon: Ban },
};

export default function DeliveryPartnersPage() {
  const [partners] = useState(MOCK_PARTNERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Partner | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = partners.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const active = partners.filter(p => p.status === 'active').length;
  const onDelivery = partners.filter(p => p.currentOrder).length;
  const avgRating = (partners.reduce((s, p) => s + p.rating, 0) / partners.length).toFixed(1);
  const avgOnTime = Math.round(partners.reduce((s, p) => s + p.onTime, 0) / partners.length);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black text-slate-900">Delivery Partners</h1><p className="text-sm text-slate-500">Manage delivery fleet and performance</p></div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Add Partner</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Partners', value: partners.length, icon: Users, color: 'text-blue-600' },
          { label: 'Active Now', value: `${active} (${onDelivery} on delivery)`, icon: Activity, color: 'text-emerald-600' },
          { label: 'Avg Rating', value: `${avgRating} ★`, icon: Star, color: 'text-yellow-600' },
          { label: 'On-Time Rate', value: `${avgOnTime}%`, icon: Clock, color: 'text-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><k.icon className={`w-4 h-4 ${k.color}`} /><p className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</p></div>
            <p className="text-xl font-black text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" aria-label="Filter">
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            {['Partner', 'Vehicle / Area', 'Status', 'Rating', 'Deliveries', 'On-Time', 'Current', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(p => {
              const st = STATUS_CFG[p.status];
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelected(p)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(p))}>
                  <td className="px-4 py-3"><p className="font-bold text-slate-900">{p.name}</p><p className="text-[10px] text-slate-400">{p.id} · {p.phone}</p></td>
                  <td className="px-4 py-3"><p className="text-xs text-slate-600">{p.vehicle}</p><p className="text-[10px] text-slate-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.area}</p></td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-0.5 text-sm"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{p.rating}</span></td>
                  <td className="px-4 py-3 font-bold text-slate-900">{p.deliveries.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`font-bold ${p.onTime >= 90 ? 'text-emerald-600' : p.onTime >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{p.onTime}%</span></td>
                  <td className="px-4 py-3">{p.currentOrder ? <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{p.currentOrder}</span> : <span className="text-[10px] text-slate-300">—</span>}</td>
                  <td className="px-4 py-3"><button className="p-1 hover:bg-slate-100 rounded" aria-label="View"><Eye className="w-4 h-4 text-slate-400" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelected(null)} ><DismissOnEscape onDismiss={() => setSelected(null)} /></div>
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div><h3 className="font-bold text-slate-900">{selected.name}</h3><p className="text-xs text-slate-400">{selected.id}</p></div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Rating', v: `${selected.rating} ★`, c: 'text-yellow-600' },
                  { l: 'On-Time', v: `${selected.onTime}%`, c: selected.onTime >= 90 ? 'text-emerald-600' : 'text-amber-600' },
                  { l: 'Total Deliveries', v: selected.deliveries.toLocaleString(), c: 'text-slate-900' },
                  { l: 'Joined', v: selected.joinedDate, c: 'text-slate-600' },
                ].map(s => (
                  <div key={s.l} className="bg-slate-50 rounded-xl p-3 border border-slate-100"><p className="text-[10px] text-slate-400 uppercase font-bold">{s.l}</p><p className={`text-lg font-black ${s.c}`}>{s.v}</p></div>
                ))}
              </div>
              <div className="space-y-2">
                {[['Phone', selected.phone], ['Vehicle', selected.vehicle], ['Area', selected.area], ['Status', STATUS_CFG[selected.status].label]].map(([l, v], i) => (
                  <div key={i} className="flex justify-between text-sm"><span className="text-slate-500">{l}</span><span className="font-bold text-slate-900">{v}</span></div>
                ))}
              </div>
              {selected.currentOrder && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2"><Truck className="w-4 h-4 text-blue-600" /><div><p className="text-xs font-bold text-blue-800">Currently on delivery</p><p className="text-[10px] text-blue-600">Order: {selected.currentOrder}</p></div></div>
              )}
              <div className="space-y-2">
                {selected.status === 'active' && <button className="w-full bg-amber-50 text-amber-700 font-bold py-2.5 rounded-xl text-sm border border-amber-200">Suspend Partner</button>}
                {selected.status === 'suspended' && <button className="w-full bg-emerald-50 text-emerald-700 font-bold py-2.5 rounded-xl text-sm border border-emerald-200">Reactivate Partner</button>}
                {selected.status === 'inactive' && <button className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm">Activate Partner</button>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} ><DismissOnEscape onDismiss={() => setShowAddModal(false)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-4 p-5 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Delivery Partner</h3>
            {[['Full Name *', 'Enter partner name'], ['Phone *', '+91 XXXXX XXXXX'], ['Vehicle Info *', 'Bike – KA 01 AB 1234'], ['Service Area *', 'Whitefield, Bangalore']].map(([label, ph]) => (
              <div key={label}><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label><input placeholder={ph} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm">Add Partner</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
