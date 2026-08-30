'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import React, { useState, useEffect } from 'react';
import { Building2, Search, Star, Eye, Ban, CheckCircle, Clock, MapPin, Users, Phone, ChevronDown, ChevronUp, AlertTriangle, Activity } from 'lucide-react';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type HospitalStatus = 'active' | 'pending' | 'suspended' | 'blocked';

const HOSPITALS: Array<{
  id: string; name: string; city: string; location: string; type: string;
  rating: number; ratingCount: number; doctors: number; beds: number;
  specialties: string[]; status: HospitalStatus; phone: string;
  registrationNo: string; hasEmergency: boolean; owner: string;
  joinedAt: string; pendingDocs: number;
}> = [
  { id: 'HSP-001', name: 'Mumbai Hospital', city: 'Mumbai', location: 'Upper Hill', type: 'Multi-Speciality', rating: 4.9, ratingCount: 1250, doctors: 45, beds: 350, specialties: ['Cardiology', 'Orthopedics', 'Neurology', 'Pediatrics'], status: 'active', phone: '+91 20 284 5000', registrationNo: 'MED-2020-001', hasEmergency: true, owner: 'Mumbai Hospital Corp.', joinedAt: 'Jan 2020', pendingDocs: 0 },
  { id: 'HSP-002', name: 'Aga Khan University Hospital', city: 'Mumbai', location: 'Parklands', type: 'Super-Speciality', rating: 4.8, ratingCount: 980, doctors: 38, beds: 280, specialties: ['Oncology', 'Neurology', 'Gynecology', 'Dermatology'], status: 'active', phone: '+91 20 366 2000', registrationNo: 'MED-2019-015', hasEmergency: true, owner: 'Aga Khan Health Services', joinedAt: 'Mar 2019', pendingDocs: 0 },
  { id: 'HSP-003', name: 'MP Shah Hospital', city: 'Mumbai', location: 'Shivachi Rd', type: 'General', rating: 4.7, ratingCount: 720, doctors: 25, beds: 180, specialties: ['General', 'Dental', 'Orthopedics', 'ENT'], status: 'active', phone: '+91 20 429 9999', registrationNo: 'MED-2021-008', hasEmergency: true, owner: 'MP Shah Foundation', joinedAt: 'Jun 2021', pendingDocs: 1 },
  { id: 'HSP-004', name: 'Coast General Hospital', city: 'Delhi', location: 'Mvita', type: 'General', rating: 4.2, ratingCount: 450, doctors: 18, beds: 200, specialties: ['General', 'Pediatrics'], status: 'pending', phone: '+91 41 231 5000', registrationNo: 'Pending', hasEmergency: true, owner: 'State government', joinedAt: 'Jun 2026', pendingDocs: 3 },
  { id: 'HSP-005', name: 'Indiatta National Hospital', city: 'Mumbai', location: 'Hospital Rd', type: 'Super-Speciality', rating: 4.0, ratingCount: 2100, doctors: 85, beds: 1800, specialties: ['General', 'Cardiology', 'Oncology', 'Neurology', 'Orthopedics'], status: 'active', phone: '+91 20 272 6300', registrationNo: 'MED-2018-001', hasEmergency: true, owner: 'Government of India', joinedAt: 'Aug 2018', pendingDocs: 0 },
];

const sCfg: Record<string, { bg: string; l: string }> = {
  active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', l: 'Active' },
  pending: { bg: 'bg-blue-50 text-blue-700 border-blue-200', l: 'Pending' },
  suspended: { bg: 'bg-amber-50 text-amber-700 border-amber-200', l: 'Suspended' },
  blocked: { bg: 'bg-red-50 text-red-700 border-red-200', l: 'Blocked' },
};

export default function AdminHospitalsPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setSf] = useState('All');
  const [exp, setExp] = useState<string | null>(null);
  const [data, setData] = useState(HOSPITALS);

  const filtered = data.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-6 h-6 text-blue-600" /> Hospital Management</h1><p className="text-sm text-slate-500 mt-1">View, approve, and manage all registered hospitals</p></div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{data.length}</p><p className="text-xs text-slate-500">Total Hospitals</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"><p className="text-2xl font-black text-emerald-700">{data.filter(d=>d.status==='active').length}</p><p className="text-xs text-emerald-600">Active</p></div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4"><p className="text-2xl font-black text-blue-700">{data.filter(d=>d.status==='pending').length}</p><p className="text-xs text-blue-600">Pending Approval</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{data.reduce((s,h)=>s+h.doctors,0)}</p><p className="text-xs text-slate-500">Total Doctors</p></div>
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search hospitals..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" /></div>
        <div className="flex gap-2">{['All','active','pending','suspended','blocked'].map(s => (<button key={s} onClick={() => setSf(s)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s === 'All' ? 'All' : sCfg[s]?.l}</button>))}</div>
      </div>
      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200"><tr>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Hospital</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Type</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Doctors</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Rating</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Status</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(h => (
              <React.Fragment key={h.id}>
                <tr className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => setExp(exp === h.id ? null : h.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExp(exp === h.id ? null : h.id))}>
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{h.name}</p><p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{h.location}, {h.city}</p></td>
                  <td className="px-5 py-4"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold">{h.type}</span></td>
                  <td className="px-5 py-4 text-center font-bold text-slate-700">{h.doctors}</td>
                  <td className="px-5 py-4 text-center"><span className="flex items-center justify-center gap-1 font-bold text-amber-600"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{h.rating}</span></td>
                  <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${sCfg[h.status]?.bg}`}>{sCfg[h.status]?.l}</span></td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {h.status === 'pending' && <button onClick={e => { e.stopPropagation(); setData(d => d.map(x => x.id === h.id ? {...x, status: 'active' as const} : x)); }} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>}
                      <button className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                      {h.status !== 'blocked' && <button onClick={e => { e.stopPropagation(); setData(d => d.map(x => x.id === h.id ? {...x, status: 'suspended' as const} : x)); }} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Suspend"><Ban className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
                {exp === h.id && (
                  <tr className="bg-slate-50/60"><td colSpan={6} className="px-5 py-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl p-3 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Beds</p><p className="font-bold text-lg text-slate-900">{h.beds}</p></div>
                      <div className="bg-white rounded-xl p-3 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Registration No</p><p className="text-xs text-slate-700">{h.registrationNo}</p></div>
                      <div className="bg-white rounded-xl p-3 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Owner</p><p className="text-xs text-slate-700">{h.owner}</p></div>
                      <div className="bg-white rounded-xl p-3 border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Joined</p><p className="text-xs text-slate-700">{h.joinedAt}</p></div>
                    </div>
                    <div className="mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Specialties</p><div className="flex flex-wrap gap-1.5">{h.specialties.map(s => <span key={s} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[11px] font-bold border border-blue-100">{s}</span>)}</div></div>
                    {h.pendingDocs > 0 && <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><p className="text-xs text-amber-700 font-semibold">{h.pendingDocs} document(s) pending verification</p></div>}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
