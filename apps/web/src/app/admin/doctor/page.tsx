'use client';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Stethoscope, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, Phone, Video, Hospital, Calendar, Users,
  TrendingUp, AlertTriangle, Building2, Activity, Filter,
  MoreHorizontal, Download, Plus, ShieldCheck, MapPin, Mail,
} from 'lucide-react';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Mock Data ──────────────────────────────────────────────────────────────────

const init = [
  { id:'DOC-001',country:'India',name:'Dr. Anjali Mehta',spec:'Cardiologist',hosp:'Apollo Hospital',city:'Mumbai',phone:'+91 98765 43210',email:'anjali@apollo.com',rating:4.9,consults:420,revenue:630000,mode:'In-person + Video',status:'active' as const,regNo:'MCI-12345',complaints:1,lastActive:'Now',experience:'15 yrs',fee:1200,photo:'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80'},
  { id:'DOC-002',country:'India',name:'Dr. Rajesh Kumar',spec:'Dermatologist',hosp:'Fortis Healthcare',city:'Delhi',phone:'+91 98765 43211',email:'rajesh@fortis.com',rating:4.7,consults:380,revenue:380000,mode:'Video Only',status:'active' as const,regNo:'MCI-23456',complaints:3,lastActive:'15 min ago',experience:'12 yrs',fee:800,photo:'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&q=80'},
  { id:'DOC-003',country:'India',name:'Dr. Priya Sharma',spec:'Pediatrician',hosp:'Max Hospital',city:'Bangalore',phone:'+91 98765 43212',email:'priya@max.com',rating:4.8,consults:510,revenue:510000,mode:'In-person + Video',status:'active' as const,regNo:'MCI-34567',complaints:0,lastActive:'5 min ago',experience:'10 yrs',fee:700,photo:'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=100&q=80'},
  { id:'DOC-004',country:'India',name:'Dr. Sunil Reddy',spec:'Orthopedic',hosp:'KIMS Hospital',city:'Hyderabad',phone:'+91 98765 43213',email:'sunil@kims.com',rating:4.5,consults:290,revenue:440000,mode:'In-person',status:'active' as const,regNo:'MCI-45678',complaints:2,lastActive:'1 hr ago',experience:'8 yrs',fee:900,photo:'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&q=80'},
  { id:'DOC-005',country:'India',name:'Dr. Vikram Tiwari',spec:'General Physician',hosp:'Independent',city:'Pune',phone:'+91 98765 43214',email:'vikram@clinic.com',rating:3.2,consults:85,revenue:40000,mode:'Video Only',status:'suspended' as const,regNo:'MCI-56789',complaints:15,lastActive:'3 days ago',experience:'5 yrs',fee:400,photo:'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100&q=80'},
  { id:'DOC-006',country:'India',name:'Dr. Fake MD',spec:'Surgeon',hosp:'Unknown',city:'Delhi',phone:'+91 98765 43215',email:'fake@unknown.com',rating:1.5,consults:12,revenue:10000,mode:'Video Only',status:'blocked' as const,regNo:'Invalid',complaints:28,lastActive:'Blocked',experience:'N/A',fee:200,photo:''},
  { id:'DOC-007',country:'India',name:'Dr. Meera Nair',spec:'Gynecologist',hosp:'Amrita Hospital',city:'Chennai',phone:'+91 98765 43216',email:'meera@amrita.com',rating:0,consults:0,revenue:0,mode:'In-person + Video',status:'pending' as const,regNo:'Pending',complaints:0,lastActive:'New',experience:'6 yrs',fee:600,photo:'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=100&q=80'},
  { id:'DOC-008',country:'UAE',name:'Dr. Fatima Al-Zahra',spec:'Cardiologist',hosp:'Cleveland Clinic Abu Dhabi',city:'Abu Dhabi',phone:'+971 50 123 4567',email:'fatima@ccad.ae',rating:4.8,consults:380,revenue:720000,mode:'In-person + Video',status:'active' as const,regNo:'DHA-11234',complaints:1,lastActive:'Now',experience:'18 yrs',fee:800,photo:''},
  { id:'DOC-009',country:'UAE',name:'Dr. Omar Hassan',spec:'Dermatologist',hosp:'Mediclinic',city:'Dubai',phone:'+971 55 987 6543',email:'omar@mediclinic.ae',rating:4.6,consults:290,revenue:580000,mode:'In-person',status:'active' as const,regNo:'DHA-22345',complaints:0,lastActive:'10 min ago',experience:'14 yrs',fee:600,photo:''},
  { id:'DOC-010',country:'Saudi Arabia',name:'Dr. Abdullah Al-Rashid',spec:'Orthopedic',hosp:'King Faisal Specialist Hospital',city:'Riyadh',phone:'+966 50 555 6666',email:'abdullah@kfsh.sa',rating:4.9,consults:520,revenue:980000,mode:'In-person + Video',status:'active' as const,regNo:'SCFHS-33456',complaints:0,lastActive:'Now',experience:'20 yrs',fee:500,photo:''},
  { id:'DOC-011',country:'Saudi Arabia',name:'Dr. Noura Al-Salem',spec:'Pediatrician',hosp:'Dr. Sulaiman Al Habib',city:'Jeddah',phone:'+966 55 777 8888',email:'noura@dsh.sa',rating:4.7,consults:410,revenue:620000,mode:'In-person + Video',status:'active' as const,regNo:'SCFHS-44567',complaints:2,lastActive:'30 min ago',experience:'11 yrs',fee:400,photo:''},
];

const sCfg: Record<string, { bg: string; dot: string; l: string }> = {
  active:    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', l: 'Active' },
  suspended: { bg: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500',   l: 'Suspended' },
  blocked:   { bg: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-500',     l: 'Blocked' },
  pending:   { bg: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500',    l: 'Pending' },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function DoctorAdminPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setSf] = useState('All');
  const [exp, setExp] = useState<string | null>(null);
  const [data, setData] = useState(init);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const { filtered: regionFiltered, regionLabel, isFiltered, formatPrice, medicalCouncil } = useDoctorRegionFilter(data);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminDoctorApi.getDoctors({ limit: 50 });
        if (res.success && Array.isArray((res.data as any)?.data) && (res.data as any).data.length > 0) {
          setData((res.data as any).data);
          setSource('api');
        }
      } catch { /* keep demo data */ }
    })();
  }, []);

  const filtered = regionFiltered.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.spec.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggle = (id: string, to: 'blocked' | 'suspended') =>
    setData((p) => p.map((r) => r.id === id ? { ...r, status: r.status === to ? 'active' as const : to } : r));

  const approve = (id: string) =>
    setData((p) => p.map((r) => r.id === id ? { ...r, status: 'active' as const, regNo: 'MCI-Verified' } : r));

  const counts = {
    total: regionFiltered.length,
    active: regionFiltered.filter((r) => r.status === 'active').length,
    pending: regionFiltered.filter((r) => r.status === 'pending').length,
    flagged: regionFiltered.filter((r) => r.complaints > 10).length,
    blocked: regionFiltered.filter((r) => r.status === 'blocked').length,
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            Doctor & Hospital Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">{isFiltered ? `${regionLabel} — ` : ''}Manage providers, verify {medicalCouncil} registrations, and monitor consultations</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-blue-200/50">
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-linear-to-br from-blue-600 to-blue-700 p-5 rounded-2xl shadow-lg shadow-blue-200/30 text-white">
          <Stethoscope className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-2">{counts.total}</p>
          <p className="text-xs font-medium opacity-80">Total Doctors</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{counts.active}</p>
          <p className="text-xs text-slate-500 font-medium">Active</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Clock className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{counts.pending}</p>
          <p className="text-xs text-slate-500 font-medium">Pending Approval</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{counts.flagged}</p>
          <p className="text-xs text-slate-500 font-medium">Flagged</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
            <Ban className="w-4.5 h-4.5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{counts.blocked}</p>
          <p className="text-xs text-slate-500 font-medium">Blocked</p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search doctors, specialty, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'active', 'pending', 'suspended', 'blocked'].map((s) => (
            <button
              key={s}
              onClick={() => setSf(s)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200/50'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'All' ? 'All' : sCfg[s]?.l || s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Doctor Table ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Doctor</th>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Specialty</th>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Rating</th>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Consults</th>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Complaints</th>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Status</th>
                <th className="px-5 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <React.Fragment key={r.id}>
                  <tr
                    className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${r.status === 'blocked' ? 'opacity-50' : ''}`}
                    onClick={() => setExp(exp === r.id ? null : r.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExp(exp === r.id ? null : r.id))}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {r.photo ? (
                            <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                              {r.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.id} · {r.hosp} · {r.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">
                        {r.spec}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {r.rating > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-amber-700 text-xs">{r.rating}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-700">{r.consults}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        r.complaints > 10
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {r.complaints}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 ${sCfg[r.status].bg} px-3 py-1 rounded-full text-xs font-bold border`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sCfg[r.status].dot}`} />
                        {sCfg[r.status].l}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {exp === r.id
                        ? <ChevronUp className="w-4 h-4 text-blue-500" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </td>
                  </tr>

                  {/* ── Expanded Row ──────────────────────────────────────── */}
                  {exp === r.id && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={7} className="px-5 py-6">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-5 mb-5">
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Contact</p>
                            <p className="text-xs text-slate-700 flex items-center gap-1 mb-0.5"><Phone className="w-3 h-3 text-slate-400" />{r.phone}</p>
                            <p className="text-xs text-slate-700 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{r.email}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Revenue</p>
                            <p className="font-black text-slate-900 text-lg">{formatPrice(r.revenue)}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Registration</p>
                            <p className={`font-bold text-sm ${r.regNo.includes('MCI') ? 'text-emerald-600' : 'text-red-600'}`}>
                              {r.regNo}
                            </p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Consult Mode</p>
                            <p className="font-bold text-xs text-slate-700">{r.mode}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Experience</p>
                            <p className="font-bold text-sm text-slate-700">{r.experience}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Last Active</p>
                            <p className="font-bold text-sm text-slate-700">{r.lastActive}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approve(r.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {r.status !== 'pending' && r.status !== 'blocked' && (
                            <button
                              onClick={() => toggle(r.id, 'suspended')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                r.status === 'suspended'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {r.status === 'suspended'
                                ? <><CheckCircle className="w-3.5 h-3.5" /> Unsuspend</>
                                : <><Clock className="w-3.5 h-3.5" /> Suspend</>
                              }
                            </button>
                          )}
                          <button
                            onClick={() => toggle(r.id, 'blocked')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                              r.status === 'blocked'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                            }`}
                          >
                            {r.status === 'blocked'
                              ? <><CheckCircle className="w-3.5 h-3.5" /> Unblock</>
                              : <><Ban className="w-3.5 h-3.5" /> Block</>
                            }
                          </button>
                          <button className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No doctors found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
