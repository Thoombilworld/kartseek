'use client';

import React, { useState } from 'react';
import { Stethoscope, TrendingUp, Users, Calendar, Search, CheckCircle, Clock, XCircle, Eye, Edit, Ban, Star, MapPin, Activity } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const clinics = [
  { id: 'DC-001', name: 'City Care Hospital', location: 'Colaba', rating: 4.8, doctors: 12, todayAppts: 45, revenue: '₹3.2L', status: 'active', specializations: ['General', 'Cardiology', 'Dermatology'], joined: 'Jan 2025', avgConsultFee: '₹500' },
  { id: 'DC-002', name: 'Apollo Clinic', location: 'Bandra', rating: 4.7, doctors: 18, todayAppts: 62, revenue: '₹4.8L', status: 'active', specializations: ['Orthopedics', 'ENT', 'Pediatrics'], joined: 'Dec 2024', avgConsultFee: '₹700' },
  { id: 'DC-003', name: 'HealthPlus Clinic', location: 'Andheri East', rating: 4.4, doctors: 6, todayAppts: 28, revenue: '₹1.4L', status: 'active', specializations: ['General', 'Gynecology'], joined: 'Mar 2025', avgConsultFee: '₹400' },
  { id: 'DC-004', name: 'Skin & Smile Derma', location: 'Juhu', rating: 4.9, doctors: 3, todayAppts: 18, revenue: '₹1.8L', status: 'active', specializations: ['Dermatology', 'Cosmetology'], joined: 'Feb 2025', avgConsultFee: '₹1,200' },
  { id: 'DC-005', name: 'MediCare Centre', location: 'Worli', rating: 4.2, doctors: 8, todayAppts: 34, revenue: '₹2.1L', status: 'active', specializations: ['General', 'Physiotherapy'], joined: 'Apr 2025', avgConsultFee: '₹350' },
  { id: 'DC-006', name: 'Dr. Patil\'s Eye Clinic', location: 'Dadar', rating: 4.6, doctors: 4, todayAppts: 22, revenue: '₹1.6L', status: 'active', specializations: ['Ophthalmology'], joined: 'Mar 2025', avgConsultFee: '₹600' },
  { id: 'DC-007', name: 'Happy Teeth Dental', location: 'Lower Parel', rating: 4.1, doctors: 2, todayAppts: 10, revenue: '₹0.5L', status: 'pending', specializations: ['Dentistry'], joined: 'Jun 2025', avgConsultFee: '₹800' },
  { id: 'DC-008', name: 'Wellness Homeopathy', location: 'Fort', rating: 3.8, doctors: 1, todayAppts: 0, revenue: '₹0.1L', status: 'suspended', specializations: ['Homeopathy'], joined: 'May 2025', avgConsultFee: '₹200' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Suspended' },
};

const specColors = ['bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700', 'bg-pink-100 text-pink-700'];

export default function FranchiseDoctorPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);

  const filtered = clinics.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()) || c.specializations.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = clinics.filter(c => c.status === 'active').length;
  const totalDoctors = clinics.reduce((a, c) => a + c.doctors, 0);
  const todayAppts = clinics.reduce((a, c) => a + c.todayAppts, 0);

  // Specialization breakdown
  const allSpecs = clinics.flatMap(c => c.specializations);
  const specCounts = Object.entries(allSpecs.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor & Clinic Operations</h1>
        <p className="text-slate-500">Manage clinics, track appointments, and monitor medical services in your franchise region.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Active Clinics', value: String(activeCount), icon: Stethoscope, trend: '+12%', color: 'bg-indigo-50 text-indigo-600' },
          { title: 'Registered Doctors', value: String(totalDoctors), icon: Users, trend: '+5', color: 'bg-purple-50 text-purple-600' },
          { title: 'Today Appointments', value: String(todayAppts), icon: Calendar, trend: '+18%', color: 'bg-teal-50 text-teal-600' },
          { title: 'Consultation Revenue', value: '₹15.5L', icon: TrendingUp, trend: '+5.2%', color: 'bg-emerald-50 text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-green-600">{stat.trend}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Specialization Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-3">Specialization Coverage</h3>
        <div className="flex flex-wrap gap-3">
          {specCounts.map(([spec, count], i) => (
            <div key={spec} className={`${specColors[i % specColors.length]} px-4 py-2 rounded-xl flex items-center gap-2`}>
              <Activity className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{spec}</span>
              <span className="text-xs font-black bg-white/50 px-1.5 py-0.5 rounded-md">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search clinics, doctors, or specializations..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Clinic Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Clinic Directory</h2>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} clinics</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Clinic</th>
                <th className="px-5 py-3.5 font-semibold">Location</th>
                <th className="px-5 py-3.5 font-semibold text-center">Doctors</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-5 py-3.5 font-semibold text-right">Today Appts</th>
                <th className="px-5 py-3.5 font-semibold text-right">Revenue</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <React.Fragment key={c.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedClinic(expandedClinic === c.id ? null : c.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedClinic(expandedClinic === c.id ? null : c.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <Stethoscope className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5" />{c.location}</span></td>
                    <td className="px-5 py-4 text-center font-bold text-slate-900">{c.doctors}</td>
                    <td className="px-5 py-4 text-center"><span className="flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{c.rating}</span></span></td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{c.todayAppts}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">{c.revenue}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${statusConfig[c.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                        {statusConfig[c.status].icon} {statusConfig[c.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedClinic === c.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-2">Specializations</p>
                            <div className="flex flex-wrap gap-1">
                              {c.specializations.map((s, i) => (
                                <span key={s} className={`${specColors[i % specColors.length]} px-2 py-0.5 rounded text-[10px] font-bold`}>{s}</span>
                              ))}
                            </div>
                          </div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Avg Consult Fee</p><p className="font-bold text-teal-600 text-lg">{c.avgConsultFee}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Joined</p><p className="font-bold text-slate-700">{c.joined}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Commission Rate</p><p className="font-bold text-teal-600 text-lg">8%</p></div>
                          <div className="flex items-end gap-2">
                            {c.status === 'pending' && (
                              <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                            )}
                            {c.status === 'active' && (
                              <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"><Ban className="w-3.5 h-3.5" /> Suspend</button>
                            )}
                            {c.status === 'suspended' && (
                              <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
          Showing {filtered.length} of {clinics.length} clinics
        </div>
      </div>
    </div>
  );
}
