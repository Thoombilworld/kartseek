'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState } from 'react';
import { MessageCircle, Search, Eye, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

type ComplaintStatus = 'open' | 'escalated' | 'resolved';

const COMPLAINTS: Array<{
  id: string; customer: string; store: string; order: string;
  type: string; status: ComplaintStatus; date: string;
  priority: string; msg: string;
}> = [
  { id:'CMP-001',customer:'John Doe',store:'Apollo Pharmacy',order:'PO-4210',type:'Wrong Medicine',status:'open',date:'13 Jun 2026',priority:'high',msg:'Received Azithromycin instead of Amoxicillin. Need urgent replacement.' },
  { id:'CMP-002',customer:'Sarah K.',store:'MedPlus Pharmacy',order:'PO-4201',type:'Delayed Delivery',status:'open',date:'12 Jun 2026',priority:'medium',msg:'Medicine was supposed to arrive in 30 min, delivered after 2 hours.' },
  { id:'CMP-003',customer:'Peter M.',store:'PharmEasy Store',order:'PO-4195',type:'Missing Items',status:'resolved',date:'11 Jun 2026',priority:'medium',msg:'Received only 2 of 3 items ordered. Band-Aid box was missing.' },
  { id:'CMP-004',customer:'Priya S.',store:'HealthPlus Pharmacy',order:'PO-4188',type:'Expired Product',status:'escalated',date:'10 Jun 2026',priority:'critical',msg:'Received expired Paracetamol tablets. Expiry date was March 2026.' },
  { id:'CMP-005',customer:'Mike R.',store:'QuickMeds',order:'PO-4180',type:'Billing Issue',status:'resolved',date:'9 Jun 2026',priority:'low',msg:'Charged ₹150 more than the listed price on the app.' },
];

const stCfg: Record<string,{bg:string;l:string}> = {
  open:{bg:'bg-blue-100 text-blue-700',l:'Open'},
  escalated:{bg:'bg-red-100 text-red-700',l:'Escalated'},
  resolved:{bg:'bg-emerald-100 text-emerald-700',l:'Resolved'},
};

const priCfg: Record<string,{bg:string}> = {
  low:{bg:'bg-slate-100 text-slate-600'},
  medium:{bg:'bg-amber-100 text-amber-700'},
  high:{bg:'bg-orange-100 text-orange-700'},
  critical:{bg:'bg-red-100 text-red-700'},
};

export default function PharmacyComplaintsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [data, setData] = useState(COMPLAINTS);

  const filtered = data.filter(c => {
    const ms = c.customer.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()) || c.store.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || c.status === filter;
    return ms && mf;
  });

  const resolve = (id: string) => setData(p => p.map(c => c.id === id ? {...c, status: 'resolved' as const} : c));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Customer Complaints</h1><p className="text-slate-500 text-sm">Monitor and resolve pharmacy-related customer complaints.</p></div>
        <div className="flex gap-2 text-xs">
          <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold">{data.filter(c=>c.status==='open').length} Open</span>
          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{data.filter(c=>c.status==='escalated').length} Escalated</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 relative min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search complaints..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
        {['All','open','escalated','resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filter===f ? 'bg-cyan-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'All' ? 'All' : stCfg[f]?.l ?? f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className={`bg-white rounded-xl border-2 p-5 transition-all ${c.status === 'escalated' ? 'border-red-200' : c.status === 'open' ? 'border-blue-200' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-slate-900">{c.id}</span>
                  <span className={`${stCfg[c.status].bg} px-2 py-0.5 rounded text-[10px] font-bold`}>{stCfg[c.status].l}</span>
                  <span className={`${priCfg[c.priority].bg} px-2 py-0.5 rounded text-[10px] font-bold uppercase`}>{c.priority}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{c.type}</span>
                </div>
                <p className="text-sm text-slate-600"><strong>{c.customer}</strong> • {c.store} • Order {c.order}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.date}</p>
                <div className="bg-slate-50 rounded-lg p-3 mt-3 border border-slate-100">
                  <p className="text-sm text-slate-700">{c.msg}</p>
                </div>
              </div>
              {c.status !== 'resolved' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => resolve(c.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Resolve
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
