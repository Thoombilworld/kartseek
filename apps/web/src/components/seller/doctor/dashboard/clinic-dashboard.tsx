'use client';

import React from 'react';
import {
  Users, DollarSign, Star, Stethoscope, Calendar,
  ArrowUpRight, ChevronRight, Clock, CheckCircle,
  XCircle, AlertCircle, UserPlus, Tag, Building2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Active Doctors', value: '5', change: '+1 this month', icon: Users, color: 'from-teal-600 to-teal-700', text: 'text-teal-200' },
  { label: 'Specialties', value: '4', change: '1 pending approval', icon: Stethoscope, color: 'from-emerald-600 to-emerald-700', text: 'text-emerald-200' },
  { label: "Today's Appointments", value: '18', change: '+3 vs yesterday', icon: Calendar, color: 'from-blue-600 to-blue-700', text: 'text-blue-200' },
  { label: 'Revenue (MTD)', value: '420K', change: '+14% vs last month', icon: DollarSign, color: 'from-violet-600 to-violet-700', text: 'text-violet-200' },
];

const PENDING_APPROVALS = [
  { id: 'cp-1', type: 'doctor', name: 'Dr. Linda Mwangi', detail: 'Gynecologist · MBBS, MD', submitted: '1 day ago', status: 'pending' },
  { id: 'cp-2', type: 'specialty', name: 'Ophthalmology', detail: 'New specialty request', submitted: '3 days ago', status: 'pending' },
];

const CLINIC_DOCTORS = [
  { name: 'Dr. Grace Wanjiku', specialty: 'Dermatologist', rating: 4.7, todayAppts: 5, status: 'active', image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=80&q=80' },
  { name: 'Dr. Amara Okonkwo', specialty: 'General Physician', rating: 4.8, todayAppts: 4, status: 'active', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80' },
  { name: 'Dr. Fatima Hassan', specialty: 'Gynecologist', rating: 4.8, todayAppts: 3, status: 'active', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80' },
  { name: 'Dr. Linda Mwangi', specialty: 'Gynecologist', rating: 0, todayAppts: 0, status: 'pending', image: '' },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function ClinicDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Welcome Banner ────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-teal-600 via-teal-700 to-emerald-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-teal-200" />
            <p className="text-teal-200 text-sm font-medium">Clinic Dashboard</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-2">HealthFirst Clinic</h1>
          <p className="text-teal-200 text-sm max-w-lg">
            Your clinic has <span className="text-white font-bold">5 active doctors</span> across
            <span className="text-white font-bold"> 4 specialties</span>.
            <span className="text-white font-bold"> 2 items</span> are awaiting admin approval.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/seller/doctor/my-doctors" className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add New Doctor
            </Link>
            <Link href="/seller/doctor/my-specialties" className="bg-white text-teal-700 hover:bg-teal-50 font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-teal-900/30">
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

        {/* ── Doctor Roster (2/3) ───────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" /> Doctor Roster
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{CLINIC_DOCTORS.filter(d => d.status === 'active').length} active, {CLINIC_DOCTORS.filter(d => d.status === 'pending').length} pending</p>
            </div>
            <Link href="/seller/doctor/my-doctors" className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors">
              Manage <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {CLINIC_DOCTORS.map((doc) => (
              <div key={doc.name} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                  {doc.image ? (
                    <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{doc.name}</p>
                  <p className="text-xs text-slate-500">{doc.specialty}</p>
                </div>
                {doc.status === 'active' ? (
                  <>
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 justify-end">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-700">{doc.rating}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{doc.todayAppts} today</p>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                    <Clock className="w-3 h-3" /> Pending Approval
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Pending Items
              </h3>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                {PENDING_APPROVALS.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {PENDING_APPROVALS.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'doctor' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'
                  }`}>
                    {item.type === 'doctor' ? <Users className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.detail} · {item.submitted}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                    <Clock className="w-2.5 h-2.5" /> Pending
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/seller/doctor/my-doctors" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Add Doctor</p>
                  <p className="text-[10px] text-slate-500">Submit for admin approval</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500" />
              </Link>
              <Link href="/seller/doctor/my-specialties" className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors group">
                <Tag className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Add Specialty</p>
                  <p className="text-[10px] text-slate-500">Choose from master list</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-teal-500" />
              </Link>
              <Link href="/seller/doctor/appointments" className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors group">
                <Calendar className="w-5 h-5 text-violet-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">View Appointments</p>
                  <p className="text-[10px] text-slate-500">All clinic appointments</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-violet-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
