'use client';

import React, { useState } from 'react';
import { UserCog, Users, Shield, Search, CheckCircle, Clock, XCircle, Eye, Edit, Ban, Mail, Phone, LogIn, Plus } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type StaffMember = {
  id: string; name: string; email: string; phone: string; role: string; permissions: string[]; status: 'active' | 'inactive' | 'invited'; lastLogin: string; joined: string;
};

const staff: StaffMember[] = [
  { id: 'ST-001', name: 'Rahul Sharma', email: 'rahul@franchise.com', phone: '+91 98765 43001', role: 'Owner', permissions: ['Full Access'], status: 'active', lastLogin: '2 min ago', joined: 'Jan 2025' },
  { id: 'ST-002', name: 'Amit Deshmukh', email: 'amit.d@franchise.com', phone: '+91 98765 43002', role: 'Operations Manager', permissions: ['Orders', 'Vendors', 'Delivery', 'Support'], status: 'active', lastLogin: '1 hr ago', joined: 'Feb 2025' },
  { id: 'ST-003', name: 'Neha Gupta', email: 'neha.g@franchise.com', phone: '+91 98765 43003', role: 'Support Lead', permissions: ['Support', 'Customers', 'Orders'], status: 'active', lastLogin: '3 hrs ago', joined: 'Mar 2025' },
  { id: 'ST-004', name: 'Rohit Gaikwad', email: 'rohit.g@franchise.com', phone: '+91 98765 43004', role: 'Finance Manager', permissions: ['Commissions', 'Payouts', 'Analytics'], status: 'active', lastLogin: '1 day ago', joined: 'Apr 2025' },
  { id: 'ST-005', name: 'Priya Patel', email: 'priya.p@franchise.com', phone: '+91 98765 43005', role: 'Marketing Coordinator', permissions: ['Marketing', 'Customers'], status: 'active', lastLogin: '5 hrs ago', joined: 'May 2025' },
  { id: 'ST-006', name: 'Sanjay Kumar', email: 'sanjay.k@franchise.com', phone: '+91 98765 43006', role: 'Vendor Manager', permissions: ['Vendors', 'Grocery', 'Restaurant'], status: 'inactive', lastLogin: '2 weeks ago', joined: 'Mar 2025' },
  { id: 'ST-007', name: 'Ananya Singh', email: 'ananya.s@franchise.com', phone: '+91 98765 43007', role: 'Operations Associate', permissions: ['Orders', 'Delivery'], status: 'invited', lastLogin: 'Never', joined: 'Jun 2025' },
];

const roleColors: Record<string, string> = {
  Owner: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Operations Manager': 'bg-blue-100 text-blue-700 border-blue-200',
  'Support Lead': 'bg-teal-100 text-teal-700 border-teal-200',
  'Finance Manager': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Marketing Coordinator': 'bg-pink-100 text-pink-700 border-pink-200',
  'Vendor Manager': 'bg-orange-100 text-orange-700 border-orange-200',
  'Operations Associate': 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  inactive: { bg: 'bg-slate-100 text-slate-600', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Inactive' },
  invited: { bg: 'bg-blue-100 text-blue-700', icon: <Mail className="w-3.5 h-3.5" />, label: 'Invited' },
};

export default function FranchiseStaffPage() {
  const [search, setSearch] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  const filtered = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()));
  const activeCount = staff.filter(s => s.status === 'active').length;
  const roles = Array.from(new Set(staff.map(s => s.role)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Roles</h1>
          <p className="text-slate-500">Manage team members, assign roles, and control access to franchise modules.</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> Invite Staff
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Active Staff', value: String(activeCount), icon: Users, color: 'bg-teal-50 text-teal-600' },
          { title: 'Total Roles', value: String(roles.length), icon: Shield, color: 'bg-indigo-50 text-indigo-600' },
          { title: 'Pending Invites', value: String(staff.filter(s => s.status === 'invited').length), icon: Mail, color: 'bg-blue-50 text-blue-600' },
          { title: 'Inactive', value: String(staff.filter(s => s.status === 'inactive').length), icon: XCircle, color: 'bg-slate-50 text-slate-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center`}><s.icon className="w-5 h-5" /></div></div>
            <p className="text-slate-500 text-sm font-medium">{s.title}</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="relative w-full md:w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search staff by name, email, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Team Members</h2><span className="text-xs text-slate-400">{filtered.length} members</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Member</th><th className="px-5 py-3.5 font-semibold">Role</th><th className="px-5 py-3.5 font-semibold">Last Login</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <React.Fragment key={s.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedStaff(expandedStaff === s.id ? null : s.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedStaff(expandedStaff === s.id ? null : s.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{s.name.split(' ').map(n => n[0]).join('')}</div>
                        <div><p className="font-bold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`${roleColors[s.role] || 'bg-slate-100 text-slate-700 border-slate-200'} border px-2.5 py-1 rounded-md text-xs font-bold`}>{s.role}</span></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-500 text-sm"><LogIn className="w-3.5 h-3.5" />{s.lastLogin}</span></td>
                    <td className="px-5 py-4 text-center"><span className={`${statusConfig[s.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>{statusConfig[s.status].icon} {statusConfig[s.status].label}</span></td>
                    <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1"><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button>{s.role !== 'Owner' && <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title={s.status === 'active' ? 'Deactivate' : 'Activate'}>{s.status === 'active' ? <Ban className="w-4 h-4 text-slate-400" /> : <CheckCircle className="w-4 h-4 text-slate-400" />}</button>}</div></td>
                  </tr>
                  {expandedStaff === s.id && (
                    <tr className="bg-slate-50/80"><td colSpan={5} className="px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Phone</p><p className="font-bold text-slate-700 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{s.phone}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Joined</p><p className="font-bold text-slate-700">{s.joined}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-2">Permissions</p><div className="flex flex-wrap gap-1">{s.permissions.map(p => <span key={p} className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">{p}</span>)}</div></div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {filtered.length} of {staff.length} members</div>
      </div>
    </div>
  );
}
