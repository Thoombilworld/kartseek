'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import React, { useState, useEffect } from 'react';
import { Building2, Search, Star, Eye, Ban, CheckCircle, MapPin } from 'lucide-react';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

const CLINICS = [
  { id: 'CLN-001', name: 'HealthFirst Clinic', city: 'Mumbai', location: 'Westlands', rating: 4.6, doctors: 8, specialties: ['General Physician', 'Dermatology', 'Pediatrics'], status: 'active' as const, phone: '+91 710 123 456', owner: 'Dr. Grace Wanjiku' },
  { id: 'CLN-002', name: 'MediCare Plus', city: 'Mumbai', location: 'Karen', rating: 4.5, doctors: 5, specialties: ['Dental', 'Ophthalmology', 'ENT'], status: 'active' as const, phone: '+91 722 456 789', owner: 'MediCare Ltd.' },
  { id: 'CLN-003', name: 'City Wellness Hub', city: 'Delhi', location: 'Nyali', rating: 4.4, doctors: 6, specialties: ['General Physician', 'Gynecology', 'Urology'], status: 'active' as const, phone: '+91 733 789 012', owner: 'Wellness Group' },
  { id: 'CLN-004', name: 'Smile Dental Clinic', city: 'Mumbai', location: 'Kilimani', rating: 4.8, doctors: 3, specialties: ['Dental'], status: 'pending' as const, phone: '+91 744 111 222', owner: 'Dr. Peter Mbeki' },
  { id: 'CLN-005', name: 'Family Health Clinic', city: 'Chennai', location: 'CBD', rating: 0, doctors: 4, specialties: ['General Physician', 'Pediatrics'], status: 'pending' as const, phone: '+91 755 333 444', owner: 'Dr. Alice Akinyi' },
];

const sCfg: Record<string, { bg: string; l: string }> = { active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', l: 'Active' }, pending: { bg: 'bg-blue-50 text-blue-700 border-blue-200', l: 'Pending' }, suspended: { bg: 'bg-amber-50 text-amber-700 border-amber-200', l: 'Suspended' }, blocked: { bg: 'bg-red-50 text-red-700 border-red-200', l: 'Blocked' } };

export default function AdminClinicsPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setSf] = useState('All');
  const [data, setData] = useState(CLINICS);

  const filtered = data.filter(c => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'All' || c.status === statusFilter;
    return ms && mf;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-6 h-6 text-violet-600" /> Clinic Management</h1><p className="text-sm text-slate-500 mt-1">View, approve, and manage all registered clinics</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{data.length}</p><p className="text-xs text-slate-500">Total Clinics</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"><p className="text-2xl font-black text-emerald-700">{data.filter(d=>d.status==='active').length}</p><p className="text-xs text-emerald-600">Active</p></div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4"><p className="text-2xl font-black text-blue-700">{data.filter(d=>d.status==='pending').length}</p><p className="text-xs text-blue-600">Pending Approval</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{data.reduce((s,c)=>s+c.doctors,0)}</p><p className="text-xs text-slate-500">Total Doctors</p></div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search clinics..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white" /></div>
        <div className="flex gap-2">{['All','active','pending'].map(s => (<button key={s} onClick={() => setSf(s)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? 'bg-violet-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s === 'All' ? 'All' : sCfg[s]?.l}</button>))}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200"><tr>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Clinic</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Specialties</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Doctors</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Rating</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Status</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
                <td className="px-5 py-4"><p className="font-bold text-slate-900">{c.name}</p><p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}, {c.city}</p></td>
                <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{c.specialties.map(s => <span key={s} className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-violet-100">{s}</span>)}</div></td>
                <td className="px-5 py-4 text-center font-bold text-slate-700">{c.doctors}</td>
                <td className="px-5 py-4 text-center"><span className="flex items-center justify-center gap-1 font-bold text-amber-600"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{c.rating || '-'}</span></td>
                <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${sCfg[c.status]?.bg}`}>{sCfg[c.status]?.l}</span></td>
                <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1">
                  {c.status === 'pending' && <button onClick={() => setData(d => d.map(x => x.id === c.id ? {...x, status: 'active' as const} : x))} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>}
                  <button className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
