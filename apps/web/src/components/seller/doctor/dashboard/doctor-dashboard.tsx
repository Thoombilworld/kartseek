'use client';

import React from 'react';
import {
  Calendar, Users, DollarSign, Star, TrendingUp, Clock,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight,
  Video, Building2, Activity, ChevronRight, Eye,
} from 'lucide-react';
import Link from 'next/link';

const STATS = [
  { label: 'Today\'s Appointments', value: '8', change: '+2 vs yesterday', up: true, icon: Calendar, color: 'from-violet-600 to-violet-700', textColor: 'text-violet-200' },
  { label: 'Total Patients', value: '1,247', change: '+34 this month', up: true, icon: Users, color: 'from-blue-600 to-blue-700', textColor: 'text-blue-200' },
  { label: 'Earnings (MTD)', value: '186,500', change: '+12% vs last month', up: true, icon: DollarSign, color: 'from-emerald-600 to-emerald-700', textColor: 'text-emerald-200' },
  { label: 'Rating', value: '4.8', change: '342 reviews', up: true, icon: Star, color: 'from-amber-500 to-amber-600', textColor: 'text-amber-200' },
];

const TODAY_APPOINTMENTS = [
  { id: 'APT-001', patient: 'John Kimani', age: 34, gender: 'Male', time: '09:00 AM', type: 'in-clinic', status: 'confirmed', reason: 'Chest pain, routine checkup', fee: '1,500' },
  { id: 'APT-002', patient: 'Mary Wambui', age: 28, gender: 'Female', time: '10:30 AM', type: 'video', status: 'confirmed', reason: 'Follow-up consultation', fee: '800' },
  { id: 'APT-003', patient: 'Ali Mohamed', age: 45, gender: 'Male', time: '11:00 AM', type: 'in-clinic', status: 'pending', reason: 'Blood pressure monitoring', fee: '1,500' },
  { id: 'APT-004', patient: 'Grace Njeri', age: 52, gender: 'Female', time: '02:00 PM', type: 'in-clinic', status: 'confirmed', reason: 'Diabetes management', fee: '1,500' },
  { id: 'APT-005', patient: 'Peter Odhiambo', age: 38, gender: 'Male', time: '03:30 PM', type: 'video', status: 'confirmed', reason: 'Skin rash consultation', fee: '800' },
];

const RECENT_REVIEWS = [
  { id: 'r1', patient: 'John K.', rating: 5, comment: 'Excellent consultation. Very thorough and professional.', date: '2 hours ago' },
  { id: 'r2', patient: 'Sarah M.', rating: 4, comment: 'Good experience, wait was a bit long.', date: '1 day ago' },
  { id: 'r3', patient: 'David O.', rating: 5, comment: 'Best doctor I\'ve visited. Highly recommended.', date: '3 days ago' },
];

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  confirmed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Confirmed' },
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending' },
  completed: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Completed' },
  cancelled: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
};

export default function DoctorDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-violet-600 via-violet-700 to-indigo-700 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-violet-200 text-sm font-medium mb-1">Good morning,</p>
          <h1 className="text-2xl md:text-3xl font-black mb-2">Dr. Amara Okonkwo</h1>
          <p className="text-violet-200 text-sm max-w-lg">You have <span className="text-white font-bold">8 appointments</span> today. 3 patients are waiting for your approval. Your next appointment is at <span className="text-white font-bold">09:00 AM</span>.</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/seller/doctor/appointments" className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2">
              <Calendar className="w-4 h-4" /> View All Appointments
            </Link>
            <Link href="/seller/doctor/availability" className="bg-white text-violet-700 hover:bg-violet-50 font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-900/30">
              <Clock className="w-4 h-4" /> Manage Schedule
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className={`bg-linear-to-br ${s.color} p-5 rounded-2xl shadow-lg text-white`}>
            <s.icon className="w-5 h-5 opacity-80" />
            <p className="text-2xl md:text-3xl font-black mt-2">{s.value}</p>
            <p className={`text-xs font-medium ${s.textColor} mt-1`}>{s.label}</p>
            <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${s.textColor}`}>
              {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {s.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-violet-600" /> Today's Appointments</h2>
              <p className="text-xs text-slate-500 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <Link href="/seller/doctor/appointments" className="text-sm font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors">View All <ChevronRight className="w-4 h-4" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {TODAY_APPOINTMENTS.map((apt) => (
              <div key={apt.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                {/* Desktop row layout */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="w-20 shrink-0 text-center">
                    <p className="text-sm font-black text-slate-900">{apt.time}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${apt.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                      {apt.type === 'video' ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      {apt.type === 'video' ? 'Video' : 'Clinic'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{apt.patient}</p>
                    <p className="text-xs text-slate-500">{apt.age}y · {apt.gender} · {apt.reason}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${STATUS_CONFIG[apt.status]?.bg}`}>{STATUS_CONFIG[apt.status]?.label}</span>
                  <p className="text-sm font-bold text-slate-700 w-24 text-right">{apt.fee}</p>
                  <div className="flex gap-1.5 shrink-0">
                    {apt.status === 'pending' && (<><button className="touch-target bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Accept"><CheckCircle className="w-4 h-4" /></button><button className="touch-target bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button></>)}
                    {apt.status === 'confirmed' && apt.type === 'video' && (<button className="touch-target bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Start Video"><Video className="w-4 h-4" /></button>)}
                    <button className="touch-target bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                  </div>
                </div>
                {/* Mobile stacked layout */}
                <div className="sm:hidden space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${apt.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                        {apt.type === 'video' ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {apt.type === 'video' ? 'Video' : 'Clinic'}
                      </span>
                      <p className="text-sm font-black text-slate-900">{apt.time}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${STATUS_CONFIG[apt.status]?.bg}`}>{STATUS_CONFIG[apt.status]?.label}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{apt.patient}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{apt.age}y · {apt.gender} · {apt.reason}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">{apt.fee}</p>
                    <div className="flex gap-1.5">
                      {apt.status === 'pending' && (<><button className="touch-target bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Accept"><CheckCircle className="w-4 h-4" /></button><button className="touch-target bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button></>)}
                      {apt.status === 'confirmed' && apt.type === 'video' && (<button className="touch-target bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Start Video"><Video className="w-4 h-4" /></button>)}
                      <button className="touch-target bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-600" /> Quick Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Completed Today</span><span className="text-sm font-bold text-emerald-600">3 / 8</span></div>
              <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: '37.5%' }} /></div>
              <div className="flex justify-between items-center pt-2"><span className="text-xs text-slate-500">Pending Approval</span><span className="text-sm font-bold text-amber-600">3</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Video Consults</span><span className="text-sm font-bold text-blue-600">2</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">In-Clinic</span><span className="text-sm font-bold text-violet-600">6</span></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Recent Reviews</h3>
              <Link href="/seller/doctor/reviews" className="text-xs font-bold text-violet-600">View All</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {RECENT_REVIEWS.map((rev) => (
                <div key={rev.id} className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-slate-900">{rev.patient}</span>
                    <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />))}</div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{rev.comment}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">{rev.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
