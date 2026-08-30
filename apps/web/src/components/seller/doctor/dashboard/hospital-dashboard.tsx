'use client';

import React from 'react';
import {
  Users, DollarSign, Star, Stethoscope, Calendar,
  ArrowUpRight, ChevronRight, Clock, CheckCircle,
  XCircle, AlertCircle, UserPlus, Tag, Eye, Building2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Total Doctors', value: '12', change: '+2 this month', icon: Users, color: 'from-blue-600 to-blue-700', text: 'text-blue-200' },
  { label: 'Active Specialties', value: '8', change: '3 pending approval', icon: Stethoscope, color: 'from-teal-600 to-teal-700', text: 'text-teal-200' },
  { label: "Today's Appointments", value: '34', change: '+5 vs yesterday', icon: Calendar, color: 'from-violet-600 to-violet-700', text: 'text-violet-200' },
  { label: 'Revenue (MTD)', value: '1.2M', change: '+18% vs last month', icon: DollarSign, color: 'from-emerald-600 to-emerald-700', text: 'text-emerald-200' },
];

const PENDING_APPROVALS = [
  { id: 'pa-1', type: 'doctor', name: 'Dr. Sarah Wanjiru', detail: 'Dermatologist · MBBS, MD', submitted: '2 days ago', status: 'pending' },
  { id: 'pa-2', type: 'doctor', name: 'Dr. Kevin Mishra', detail: 'ENT Specialist · MBBS, MS', submitted: '4 days ago', status: 'pending' },
  { id: 'pa-3', type: 'specialty', name: 'Oncology', detail: 'New department request', submitted: '1 day ago', status: 'pending' },
  { id: 'pa-4', type: 'doctor', name: 'Dr. Mercy Achieng', detail: 'Neurologist · MBBS, DM', submitted: '5 days ago', status: 'rejected' },
];

const TOP_DOCTORS = [
  { name: 'Dr. Suresh Nair', specialty: 'Cardiologist', rating: 4.9, appointments: 156, revenue: '468,000', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&q=80' },
  { name: 'Dr. Grace Wanjiku', specialty: 'Dermatologist', rating: 4.7, appointments: 132, revenue: '158,400', image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=80&q=80' },
  { name: 'Dr. Raj Patel', specialty: 'Orthopedic', rating: 4.6, appointments: 98, revenue: '245,000', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&q=80' },
];

const RECENT_ACTIVITY = [
  { text: 'New appointment booked with Dr. Ochieng', time: '5 min ago', type: 'appointment' },
  { text: 'Dr. Wanjiku received 5-star review', time: '23 min ago', type: 'review' },
  { text: 'Dr. Kevin Mishra registration submitted', time: '2 hours ago', type: 'doctor' },
  { text: 'Oncology specialty request submitted', time: '4 hours ago', type: 'specialty' },
  { text: 'Patient refund processed — APT-0892', time: '6 hours ago', type: 'payment' },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function HospitalDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Welcome Banner ────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-blue-200" />
            <p className="text-blue-200 text-sm font-medium">Hospital Dashboard</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-2">Mumbai Hospital</h1>
          <p className="text-blue-200 text-sm max-w-lg">
            Your facility has <span className="text-white font-bold">12 active doctors</span> across
            <span className="text-white font-bold"> 8 specialties</span>.
            <span className="text-white font-bold"> 3 items</span> are awaiting admin approval.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/seller/doctor/my-doctors" className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add New Doctor
            </Link>
            <Link href="/seller/doctor/my-specialties" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30">
              <Tag className="w-4 h-4" /> Manage Specialties
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className={`bg-linear-to-br ${s.color} p-5 rounded-2xl shadow-lg text-white`}>
            <s.icon className="w-5 h-5 opacity-80" />
            <p className="text-2xl md:text-3xl font-black mt-2">{s.value}</p>
            <p className={`text-xs font-medium ${s.text} mt-1`}>{s.label}</p>
            <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${s.text}`}>
              <ArrowUpRight className="w-3 h-3" />
              {s.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Pending Approvals (2/3) ───────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Pending Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Items submitted to admin for review</p>
            </div>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200">
              {PENDING_APPROVALS.filter(p => p.status === 'pending').length} pending
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {PENDING_APPROVALS.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.type === 'doctor' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'
                }`}>
                  {item.type === 'doctor' ? <Users className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  {item.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                      <Clock className="w-3 h-3" /> Awaiting Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-200">
                      <XCircle className="w-3 h-3" /> Rejected
                    </span>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">{item.submitted}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Top Performing Doctors */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Top Doctors</h3>
              <Link href="/seller/doctor/my-doctors" className="text-xs font-bold text-blue-600">View All</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {TOP_DOCTORS.map((doc) => (
                <div key={doc.name} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate-500">{doc.specialty}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-amber-700">{doc.rating}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{doc.appointments} appts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Recent Activity
            </h3>
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((act, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    act.type === 'appointment' ? 'bg-blue-500' :
                    act.type === 'review' ? 'bg-amber-500' :
                    act.type === 'doctor' ? 'bg-violet-500' :
                    act.type === 'specialty' ? 'bg-teal-500' :
                    'bg-emerald-500'
                  }`} />
                  <div>
                    <p className="text-xs text-slate-700">{act.text}</p>
                    <p className="text-[10px] text-slate-400">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
