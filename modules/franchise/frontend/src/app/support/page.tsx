'use client';

import React, { useState } from 'react';
import { HeadphonesIcon, Clock, CheckCircle, AlertCircle, Search, MessageSquare, User, ArrowUpRight, XCircle, AlertTriangle, Eye } from 'lucide-react';

type Ticket = {
  id: string; subject: string; customer: string; category: string; priority: 'high' | 'medium' | 'low'; status: 'open' | 'in-progress' | 'resolved' | 'closed'; assignee: string; created: string; lastUpdate: string; module: string;
};

const tickets: Ticket[] = [
  { id: 'TK-284', subject: 'Order not delivered — refund needed', customer: 'Rahul K.', category: 'Delivery', priority: 'high', status: 'open', assignee: 'Unassigned', created: '2 hrs ago', lastUpdate: '1 hr ago', module: 'Grocery' },
  { id: 'TK-283', subject: 'Wrong items received in pharmacy order', customer: 'Priya S.', category: 'Order Issue', priority: 'high', status: 'in-progress', assignee: 'Amit D.', created: '5 hrs ago', lastUpdate: '3 hrs ago', module: 'Pharmacy' },
  { id: 'TK-282', subject: 'Driver was rude during delivery', customer: 'Sneha R.', category: 'Driver', priority: 'medium', status: 'in-progress', assignee: 'Neha G.', created: '8 hrs ago', lastUpdate: '4 hrs ago', module: 'Restaurant' },
  { id: 'TK-281', subject: 'App shows wrong delivery address', customer: 'Vikram T.', category: 'App Bug', priority: 'low', status: 'resolved', assignee: 'Tech Team', created: '1 day ago', lastUpdate: '12 hrs ago', module: 'Grocery' },
  { id: 'TK-280', subject: 'Payment deducted but order cancelled', customer: 'Karan C.', category: 'Payment', priority: 'high', status: 'open', assignee: 'Unassigned', created: '1 day ago', lastUpdate: '1 day ago', module: 'Restaurant' },
  { id: 'TK-279', subject: 'Vendor not responding to queries', customer: 'Divya P.', category: 'Vendor', priority: 'medium', status: 'in-progress', assignee: 'Rohit G.', created: '2 days ago', lastUpdate: '1 day ago', module: 'Marketplace' },
  { id: 'TK-278', subject: 'Request for invoice copy', customer: 'Arjun N.', category: 'Billing', priority: 'low', status: 'resolved', assignee: 'Amit D.', created: '3 days ago', lastUpdate: '2 days ago', module: 'Grocery' },
  { id: 'TK-277', subject: 'Taxi driver took longer route', customer: 'Maya I.', category: 'Driver', priority: 'medium', status: 'closed', assignee: 'Neha G.', created: '4 days ago', lastUpdate: '3 days ago', module: 'Taxi' },
  { id: 'TK-276', subject: 'Product quality complaint', customer: 'Rohan S.', category: 'Quality', priority: 'high', status: 'resolved', assignee: 'Rohit G.', created: '5 days ago', lastUpdate: '4 days ago', module: 'Grocery' },
];

const priorityConfig: Record<string, { bg: string; dot: string }> = {
  high: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  open: { bg: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Open' },
  'in-progress': { bg: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'In Progress' },
  resolved: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Resolved' },
  closed: { bg: 'bg-slate-100 text-slate-600', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Closed' },
};

export default function FranchiseSupportPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in-progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const highPriorityOpen = tickets.filter(t => t.priority === 'high' && (t.status === 'open' || t.status === 'in-progress')).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
        <p className="text-slate-500">Track and resolve customer support tickets in your franchise region.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Open Tickets', value: String(openCount), icon: AlertCircle, color: 'bg-red-50 text-red-600' },
          { title: 'In Progress', value: String(inProgressCount), icon: Clock, color: 'bg-blue-50 text-blue-600' },
          { title: 'Resolved / Closed', value: String(resolvedCount), icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
          { title: 'High Priority Open', value: String(highPriorityOpen), icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center`}><s.icon className="w-5 h-5" /></div></div>
            <p className="text-slate-500 text-sm font-medium">{s.title}</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Ticket Queue</h2><span className="text-xs text-slate-400">{filtered.length} tickets</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Ticket</th><th className="px-5 py-3.5 font-semibold">Customer</th><th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold text-center">Priority</th><th className="px-5 py-3.5 font-semibold">Assignee</th><th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{t.id}</p><p className="text-xs text-slate-500 max-w-[200px] truncate">{t.subject}</p></td>
                  <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-700 font-medium"><User className="w-3.5 h-3.5 text-slate-400" />{t.customer}</span></td>
                  <td className="px-5 py-4 text-slate-600 text-xs font-medium">{t.category}</td>
                  <td className="px-5 py-4 text-center"><span className={`${priorityConfig[t.priority].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}><span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[t.priority].dot}`} />{t.priority}</span></td>
                  <td className="px-5 py-4"><span className={t.assignee === 'Unassigned' ? 'text-red-500 font-bold text-xs' : 'text-slate-600 text-sm'}>{t.assignee}</span></td>
                  <td className="px-5 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{t.module}</span></td>
                  <td className="px-5 py-4 text-center"><span className={`${statusConfig[t.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>{statusConfig[t.status].icon} {statusConfig[t.status].label}</span></td>
                  <td className="px-5 py-4 text-xs text-slate-400">{t.lastUpdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {filtered.length} of {tickets.length} tickets</div>
      </div>
    </div>
  );
}
