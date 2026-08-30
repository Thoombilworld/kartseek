'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertTriangle, CheckCircle, Clock, MessageSquare,
  Search, Star, User, Eye, XCircle, Filter,
} from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Status = 'open' | 'investigating' | 'resolved' | 'escalated';

const COMPLAINTS = [
  { id: 'CMP-2301', customer: 'Priya Sharma', restaurant: 'China Garden', restaurantId: 'RES-005', type: 'Food Quality', desc: 'Food was cold and stale. The noodles were undercooked.', orderId: 'ORD-5832', rating: 2, status: 'open' as Status, priority: 'high', createdAt: '30 Jun, 3:15 PM', updatedAt: '30 Jun, 3:15 PM' },
  { id: 'CMP-2300', customer: 'Ahmed Khan', restaurant: 'Street Bites', restaurantId: 'RES-006', type: 'Hygiene', desc: 'Found a hair in the food. Very unhygienic. Requesting full refund.', orderId: 'ORD-5810', rating: 1, status: 'escalated' as Status, priority: 'critical', createdAt: '30 Jun, 1:00 PM', updatedAt: '30 Jun, 2:30 PM' },
  { id: 'CMP-2299', customer: 'Sarah Mwangi', restaurant: 'Pizza Palace', restaurantId: 'RES-002', type: 'Late Delivery', desc: 'Order arrived 45 minutes late. Pizza was cold.', orderId: 'ORD-5798', rating: 3, status: 'investigating' as Status, priority: 'medium', createdAt: '29 Jun, 8:30 PM', updatedAt: '30 Jun, 10:00 AM' },
  { id: 'CMP-2298', customer: 'Raj Patel', restaurant: 'Biryani House', restaurantId: 'RES-004', type: 'Wrong Order', desc: 'Received paneer biryani instead of chicken. I am non-vegetarian.', orderId: 'ORD-5785', rating: 2, status: 'resolved' as Status, priority: 'medium', createdAt: '29 Jun, 2:00 PM', updatedAt: '29 Jun, 5:00 PM' },
  { id: 'CMP-2297', customer: 'Lin Wang', restaurant: 'Sushi Kingdom', restaurantId: 'RES-003', type: 'Missing Items', desc: 'Missing 2 sushi rolls from my order. Only received the miso soup.', orderId: 'ORD-5770', rating: 3, status: 'resolved' as Status, priority: 'low', createdAt: '28 Jun, 7:00 PM', updatedAt: '29 Jun, 9:00 AM' },
];

export default function RestaurantComplaintsPage() {
  const [items, setItems] = useState(COMPLAINTS);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const resolve = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, status: 'resolved' as Status } : i));
  const escalate = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, status: 'escalated' as Status } : i));

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search && !i.customer.toLowerCase().includes(search.toLowerCase()) && !i.restaurant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCfg: Record<Status, { bg: string; label: string }> = {
    open:          { bg: 'bg-red-100 text-red-700', label: 'Open' },
    investigating: { bg: 'bg-amber-100 text-amber-700', label: 'Investigating' },
    resolved:      { bg: 'bg-green-100 text-green-700', label: 'Resolved' },
    escalated:     { bg: 'bg-purple-100 text-purple-700', label: 'Escalated' },
  };

  const priorityCfg: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/restaurant" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft className="w-5 h-5 text-slate-600" /></Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Restaurant Complaints</h1>
            <p className="text-sm text-slate-500">Customer complaint management and resolution</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{items.filter(i => i.status === 'open').length} Open</span>
          <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-bold">{items.filter(i => i.status === 'escalated').length} Escalated</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by customer or restaurant..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'open', 'investigating', 'escalated', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints */}
      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpanded(expanded === c.id ? null : c.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === c.id ? null : c.id))}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${c.priority === 'critical' ? 'bg-red-100' : c.priority === 'high' ? 'bg-red-50' : 'bg-amber-50'}`}>
                <AlertTriangle className={`w-5 h-5 ${c.priority === 'critical' ? 'text-red-600' : c.priority === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900">{c.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityCfg[c.priority]}`}>{c.priority.toUpperCase()}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg[c.status].bg}`}>{statusCfg[c.status].label}</span>
                </div>
                <p className="text-sm text-slate-700">{c.type} — <span className="font-bold">{c.restaurant}</span></p>
                <p className="text-xs text-slate-500 mt-1">{c.customer} • {c.createdAt}</p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < c.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                ))}
              </div>
            </div>
            {expanded === c.id && (
              <div className="border-t border-slate-200 px-5 py-4 bg-slate-50/50">
                <p className="text-sm text-slate-700 mb-4 bg-white p-3 rounded-lg border border-slate-200">"{c.desc}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Order: <span className="font-bold text-slate-700">{c.orderId}</span></span>
                    <span>Updated: {c.updatedAt}</span>
                  </div>
                  {c.status !== 'resolved' && (
                    <div className="flex gap-2">
                      <button onClick={() => resolve(c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Resolve
                      </button>
                      {c.status !== 'escalated' && (
                        <button onClick={() => escalate(c.id)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Escalate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
