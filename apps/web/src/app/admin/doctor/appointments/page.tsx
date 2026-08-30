'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import React, { useState, useEffect } from 'react';
import { Calendar, Search, Eye, CheckCircle, XCircle, Video, Building2 } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

const APPOINTMENTS = [
  { id: 'APT-001', doctor: 'Dr. Amara Okonkwo', patient: 'John Sharma', hospital: 'Mumbai Hospital', specialty: 'General Physician', date: 'Jun 15, 2026', time: '09:00 AM', type: 'in-clinic', status: 'confirmed', fee: 1500 },
  { id: 'APT-002', doctor: 'Dr. Suresh Nair', patient: 'Mary Wambui', hospital: 'Aga Khan Hospital', specialty: 'Cardiology', date: 'Jun 15, 2026', time: '10:30 AM', type: 'in-clinic', status: 'confirmed', fee: 3000 },
  { id: 'APT-003', doctor: 'Dr. Zara Ahmed', patient: 'Ali Mohamed', hospital: 'Mumbai Hospital', specialty: 'Pediatrics', date: 'Jun 14, 2026', time: '02:00 PM', type: 'video', status: 'completed', fee: 1200 },
  { id: 'APT-004', doctor: 'Dr. Grace Wanjiku', patient: 'Rose Kamau', hospital: 'HealthFirst Clinic', specialty: 'Dermatology', date: 'Jun 14, 2026', time: '11:00 AM', type: 'video', status: 'completed', fee: 700 },
  { id: 'APT-005', doctor: 'Dr. Raj Patel', patient: 'Peter Odhiambo', hospital: 'MP Shah Hospital', specialty: 'Orthopedics', date: 'Jun 13, 2026', time: '09:30 AM', type: 'in-clinic', status: 'cancelled', fee: 2500 },
  { id: 'APT-006', doctor: 'Dr. Fatima Hassan', patient: 'Fatima Ahmed', hospital: 'Independent', specialty: 'Gynecology', date: 'Jun 16, 2026', time: '10:00 AM', type: 'in-clinic', status: 'confirmed', fee: 1800 },
];

const sCfg: Record<string, { bg: string; l: string }> = { confirmed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', l: 'Confirmed' }, completed: { bg: 'bg-blue-50 text-blue-700 border-blue-200', l: 'Completed' }, cancelled: { bg: 'bg-red-50 text-red-700 border-red-200', l: 'Cancelled' }, pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', l: 'Pending' } };

export default function AdminAppointmentsPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setSf] = useState('All');
  const { formatCurrencyValue } = useRegion();

  const filtered = APPOINTMENTS.filter(a => {
    const ms = a.doctor.toLowerCase().includes(search.toLowerCase()) || a.patient.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'All' || a.status === statusFilter;
    return ms && mf;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-6 h-6 text-emerald-600" /> All Appointments</h1><p className="text-sm text-slate-500 mt-1">Monitor and manage appointments across all providers</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{APPOINTMENTS.length}</p><p className="text-xs text-slate-500">Total</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"><p className="text-2xl font-black text-emerald-700">{APPOINTMENTS.filter(a=>a.status==='confirmed').length}</p><p className="text-xs text-emerald-600">Confirmed</p></div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4"><p className="text-2xl font-black text-blue-700">{APPOINTMENTS.filter(a=>a.status==='completed').length}</p><p className="text-xs text-blue-600">Completed</p></div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4"><p className="text-2xl font-black text-red-700">{APPOINTMENTS.filter(a=>a.status==='cancelled').length}</p><p className="text-xs text-red-600">Cancelled</p></div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search by doctor, patient, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" /></div>
        <div className="flex gap-2">{['All','confirmed','completed','cancelled'].map(s => (<button key={s} onClick={() => setSf(s)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s === 'All' ? 'All' : sCfg[s]?.l}</button>))}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200"><tr>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">ID</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Doctor</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Patient</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date & Time</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Type</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Fee</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Status</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{a.id}</td>
                <td className="px-5 py-4"><p className="font-bold text-slate-900 text-xs">{a.doctor}</p><p className="text-[10px] text-slate-400">{a.hospital}</p></td>
                <td className="px-5 py-4 font-semibold text-slate-700 text-xs">{a.patient}</td>
                <td className="px-5 py-4"><p className="text-xs font-semibold text-slate-900">{a.date}</p><p className="text-[11px] text-slate-500">{a.time}</p></td>
                <td className="px-5 py-4 text-center"><span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${a.type==='video'?'bg-blue-50 text-blue-600':'bg-violet-50 text-violet-600'}`}>{a.type==='video'?<Video className="w-3 h-3" />:<Building2 className="w-3 h-3" />}{a.type==='video'?'Video':'Clinic'}</span></td>
                <td className="px-5 py-4 text-right font-bold text-slate-700 text-xs">{formatCurrencyValue(a.fee)}</td>
                <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${sCfg[a.status]?.bg}`}>{sCfg[a.status]?.l}</span></td>
                <td className="px-5 py-4 text-center"><button title="View appointment details" className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"><Eye className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
