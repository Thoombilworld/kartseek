'use client';
import { useState } from 'react';
import { Megaphone, Plus, Calendar, Percent, TrendingUp, Edit, Trash2, Eye, Search, ToggleLeft, ToggleRight, Copy, Clock, CheckCircle, Users, Store } from 'lucide-react';

/* ── Mock Promotion Data ──────────────────────────────────────────────── */
const PROMO_STATS = { active: 5, scheduled: 3, ended: 12, totalReach: 14500 };

const PROMOTIONS = [
  { id: 'PROMO-01', name: 'Summer Food Festival', type: 'Platform-wide', discount: '40% off', discountType: 'percentage', minOrder: 500, maxDiscount: 300, status: 'Active', start: '2026-07-01', end: '2026-07-31', restaurants: 85, usageCount: 2340, budget: 500000, spent: 312000 },
  { id: 'PROMO-02', name: 'Free Delivery Week', type: 'Delivery', discount: 'Free Delivery', discountType: 'flat', minOrder: 300, maxDiscount: 150, status: 'Scheduled', start: '2026-07-10', end: '2026-07-17', restaurants: 120, usageCount: 0, budget: 200000, spent: 0 },
  { id: 'PROMO-03', name: 'Biryani Festival', type: 'Category', discount: '25% off', discountType: 'percentage', minOrder: 400, maxDiscount: 200, status: 'Ended', start: '2026-06-15', end: '2026-06-30', restaurants: 34, usageCount: 890, budget: 150000, spent: 148500 },
  { id: 'PROMO-04', name: 'New User Welcome', type: 'First Order', discount: '₹150 off', discountType: 'flat', minOrder: 250, maxDiscount: 150, status: 'Active', start: '2026-06-01', end: '2026-12-31', restaurants: 200, usageCount: 4120, budget: 800000, spent: 618000 },
  { id: 'PROMO-05', name: 'Weekend Brunch Special', type: 'Time-based', discount: '30% off', discountType: 'percentage', minOrder: 600, maxDiscount: 250, status: 'Active', start: '2026-07-01', end: '2026-08-31', restaurants: 45, usageCount: 560, budget: 250000, spent: 89000 },
  { id: 'PROMO-06', name: 'Rainy Day Combo', type: 'Weather', discount: 'BOGO', discountType: 'bogo', minOrder: 800, maxDiscount: 500, status: 'Active', start: '2026-07-01', end: '2026-09-30', restaurants: 60, usageCount: 340, budget: 300000, spent: 78000 },
  { id: 'PROMO-07', name: 'Late Night Cravings', type: 'Time-based', discount: '20% off', discountType: 'percentage', minOrder: 300, maxDiscount: 150, status: 'Scheduled', start: '2026-07-15', end: '2026-08-15', restaurants: 35, usageCount: 0, budget: 100000, spent: 0 },
];

const TYPE_STYLES: Record<string, string> = {
  'Platform-wide': 'bg-violet-100 text-violet-700',
  'Delivery': 'bg-blue-100 text-blue-700',
  'Category': 'bg-amber-100 text-amber-700',
  'First Order': 'bg-emerald-100 text-emerald-700',
  'Time-based': 'bg-rose-100 text-rose-700',
  'Weather': 'bg-sky-100 text-sky-700',
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Scheduled: 'bg-blue-50 text-blue-700',
  Ended: 'bg-slate-100 text-slate-500',
  Paused: 'bg-amber-50 text-amber-700',
};

export default function AdminRestaurantPromotionsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [newPromo, setNewPromo] = useState({ name: '', type: 'Platform-wide', discount: '', minOrder: '', maxDiscount: '', start: '', end: '' });

  const types = ['All', 'Platform-wide', 'Delivery', 'Category', 'First Order', 'Time-based', 'Weather'];
  const filtered = PROMOTIONS
    .filter(p => filterStatus === 'All' || p.status === filterStatus)
    .filter(p => filterType === 'All' || p.type === filterType)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Megaphone className="w-6 h-6 text-[#EA580C]" /> Promotions Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage restaurant promotions, deals, and offers.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-[#EA580C] hover:bg-[#C2410C] text-white border-none rounded-xl px-5 py-2.5 font-bold cursor-pointer flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Create Promotion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{PROMO_STATS.active}</p><p className="text-xs font-medium text-emerald-600">Active</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{PROMO_STATS.scheduled}</p><p className="text-xs font-medium text-blue-600">Scheduled</p></div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-2xl font-black text-slate-700">{PROMO_STATS.ended}</p><p className="text-xs font-medium text-slate-500">Ended</p></div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4"><p className="text-2xl font-black text-orange-700">{PROMO_STATS.totalReach.toLocaleString()}</p><p className="text-xs font-medium text-orange-600">Total Uses</p></div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-orange-800 mb-3">New Promotion</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Promotion name" value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <select title="Promotion type" value={newPromo.type} onChange={e => setNewPromo(p => ({ ...p, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              {types.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Discount (e.g. 30% off)" value={newPromo.discount} onChange={e => setNewPromo(p => ({ ...p, discount: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Min Order (₹)" value={newPromo.minOrder} onChange={e => setNewPromo(p => ({ ...p, minOrder: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" title="Start date" value={newPromo.start} onChange={e => setNewPromo(p => ({ ...p, start: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" title="End date" value={newPromo.end} onChange={e => setNewPromo(p => ({ ...p, end: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#EA580C] text-white rounded-lg text-xs font-bold hover:bg-[#C2410C]">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search promotions..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full" /></div>
        <select title="Filter by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2"><option>All</option><option>Active</option><option>Scheduled</option><option>Ended</option><option>Paused</option></select>
        <select title="Filter by type" value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-200 rounded-lg text-sm px-3 py-2">{types.map(t => <option key={t}>{t}</option>)}</select>
      </div>

      {/* Promotions Cards */}
      <div className="space-y-3">
        {filtered.map(p => {
          const budgetPct = Math.round((p.spent / p.budget) * 100);
          return (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_STYLES[p.type] || 'bg-slate-100 text-slate-600'}`}>{p.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.start} → {p.end}</span>
                    <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {p.restaurants} restaurants</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.usageCount.toLocaleString()} uses</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-[#EA580C]">{p.discount}</p>
                  <p className="text-[10px] text-slate-400">Min ₹{p.minOrder} · Max ₹{p.maxDiscount}</p>
                </div>
              </div>

              {/* Budget Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Budget: ₹{(p.budget / 1000).toFixed(0)}K</span>
                  <span>Spent: ₹{(p.spent / 1000).toFixed(0)}K ({budgetPct}%)</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2">
                  <div className={`rounded-full h-2 transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'} w-[${Math.min(budgetPct, 100)}%]`} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"><Eye className="w-3 h-3" /> View</button>
                <button className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"><Edit className="w-3 h-3" /> Edit</button>
                <button className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"><Copy className="w-3 h-3" /> Duplicate</button>
                {p.status === 'Active' && (
                  <button className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors">Pause</button>
                )}
                {p.status === 'Paused' && (
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">Resume</button>
                )}
                <button className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-bold border border-red-200 flex items-center gap-1 transition-colors ml-auto"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
