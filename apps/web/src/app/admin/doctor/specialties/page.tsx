'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit3, Save, ToggleLeft, ToggleRight, GripVertical, Search } from 'lucide-react';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

const INIT_SPECIALTIES = [
  { id: 'sp-01', name: 'General Physician', slug: 'general-physician', icon: '🩺', doctorCount: 42, isActive: true },
  { id: 'sp-02', name: 'Cardiology', slug: 'cardiology', icon: '🫀', doctorCount: 24, isActive: true },
  { id: 'sp-03', name: 'Dermatology', slug: 'dermatology', icon: '💆', doctorCount: 18, isActive: true },
  { id: 'sp-04', name: 'Orthopedics', slug: 'orthopedics', icon: '🦴', doctorCount: 15, isActive: true },
  { id: 'sp-05', name: 'Pediatrics', slug: 'pediatrics', icon: '👶', doctorCount: 21, isActive: true },
  { id: 'sp-06', name: 'Neurology', slug: 'neurology', icon: '🧠', doctorCount: 9, isActive: true },
  { id: 'sp-07', name: 'Ophthalmology', slug: 'ophthalmology', icon: '👁️', doctorCount: 12, isActive: true },
  { id: 'sp-08', name: 'Dental', slug: 'dental', icon: '🦷', doctorCount: 18, isActive: true },
  { id: 'sp-09', name: 'Gynecology', slug: 'gynecology', icon: '🤰', doctorCount: 16, isActive: true },
  { id: 'sp-10', name: 'ENT', slug: 'ent', icon: '👂', doctorCount: 8, isActive: true },
  { id: 'sp-11', name: 'Urology', slug: 'urology', icon: '💧', doctorCount: 7, isActive: true },
  { id: 'sp-12', name: 'Oncology', slug: 'oncology', icon: '🎗️', doctorCount: 5, isActive: true },
  { id: 'sp-13', name: 'Psychiatry', slug: 'psychiatry', icon: '🧘', doctorCount: 4, isActive: true },
  { id: 'sp-14', name: 'Pulmonology', slug: 'pulmonology', icon: '🫁', doctorCount: 6, isActive: true },
  { id: 'sp-15', name: 'Gastroenterology', slug: 'gastroenterology', icon: '🍽️', doctorCount: 7, isActive: true },
  { id: 'sp-16', name: 'Nephrology', slug: 'nephrology', icon: '🫘', doctorCount: 3, isActive: true },
  { id: 'sp-17', name: 'Endocrinology', slug: 'endocrinology', icon: '🧬', doctorCount: 4, isActive: true },
  { id: 'sp-18', name: 'Rheumatology', slug: 'rheumatology', icon: '🦿', doctorCount: 2, isActive: false },
  { id: 'sp-19', name: 'Physiotherapy', slug: 'physiotherapy', icon: '🏃', doctorCount: 8, isActive: true },
  { id: 'sp-20', name: 'Radiology', slug: 'radiology', icon: '📷', doctorCount: 3, isActive: true },
  { id: 'sp-21', name: 'Pathology', slug: 'pathology', icon: '🔬', doctorCount: 5, isActive: true },
  { id: 'sp-22', name: 'General Surgery', slug: 'general-surgery', icon: '🔪', doctorCount: 6, isActive: true },
  { id: 'sp-23', name: 'Anesthesiology', slug: 'anesthesiology', icon: '💉', doctorCount: 4, isActive: true },
];

export default function AdminSpecialtiesPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [specs, setSpecs] = useState(INIT_SPECIALTIES);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filtered = specs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const toggleActive = (id: string) => setSpecs(s => s.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
  const startEdit = (s: typeof specs[0]) => { setEditId(s.id); setEditName(s.name); };
  const saveEdit = (id: string) => { setSpecs(s => s.map(x => x.id === id ? { ...x, name: editName, slug: editName.toLowerCase().replace(/\s+/g, '-') } : x)); setEditId(null); };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Tag className="w-6 h-6 text-violet-600" /> Specialty Management</h1><p className="text-sm text-slate-500 mt-1">Manage the master list of medical specialties</p></div>
        <button className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"><Plus className="w-4 h-4" /> Add Specialty</button>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search specialties..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white" /></div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200"><tr>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-12"></th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Specialty</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Slug</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Doctors</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Active</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => (
              <tr key={s.id} className={`transition-colors ${!s.isActive ? 'opacity-50 bg-slate-50/30' : 'hover:bg-violet-50/30'}`}>
                <td className="px-3 py-3 text-center text-xl">{s.icon}</td>
                <td className="px-5 py-3">{editId === s.id ? <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-violet-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-full" placeholder="Specialty name" autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit(s.id)} /> : <span className="font-bold text-slate-900">{s.name}</span>}</td>
                <td className="px-5 py-3 text-xs text-slate-500 font-mono">{s.slug}</td>
                <td className="px-5 py-3 text-center font-bold text-slate-700">{s.doctorCount}</td>
                <td className="px-5 py-3 text-center"><button title={s.isActive ? 'Deactivate specialty' : 'Activate specialty'} onClick={() => toggleActive(s.id)}>{s.isActive ? <ToggleRight className="w-6 h-6 text-emerald-600 mx-auto" /> : <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />}</button></td>
                <td className="px-5 py-3 text-center"><div className="flex items-center justify-center gap-1">
                  {editId === s.id ? <button title="Save changes" onClick={() => saveEdit(s.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"><Save className="w-4 h-4" /></button> : <button title="Edit specialty" onClick={() => startEdit(s)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-violet-50 hover:text-violet-600 transition-colors"><Edit3 className="w-4 h-4" /></button>}
                  {s.doctorCount === 0 && <button title="Delete specialty" className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
