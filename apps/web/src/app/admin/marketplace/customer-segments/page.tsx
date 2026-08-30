'use client';
import React, { useState } from 'react';
import { Users, Search, Plus, Eye, X, Download, ChevronLeft, ChevronRight, Target, TrendingUp, DollarSign, ShoppingCart, Clock } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Global: 'UN' };

type Segment = {
  id: string; name: string; description: string; country: string;
  type: 'Behavioral' | 'Demographic' | 'Value-Based' | 'Lifecycle' | 'Custom';
  customerCount: number; avgOrderValue: number; totalRevenue: number; conversionRate: number;
  rules: { field: string; operator: string; value: string }[];
  lastUpdated: string; isActive: boolean; autoSync: boolean;
};

const SEGMENTS: Segment[] = [
  { id: 'SEG-001', name: 'High-Value Customers', description: 'Customers who have spent over ₹50,000 lifetime', country: 'India', type: 'Value-Based', customerCount: 2840, avgOrderValue: 12500, totalRevenue: 35500000, conversionRate: 8.2, rules: [{ field: 'lifetime_spend', operator: '>=', value: '50000' }], lastUpdated: '2026-06-06', isActive: true, autoSync: true },
  { id: 'SEG-002', name: 'Repeat Buyers', description: 'Placed 3+ orders in last 90 days', country: 'India', type: 'Behavioral', customerCount: 5200, avgOrderValue: 4800, totalRevenue: 24960000, conversionRate: 12.5, rules: [{ field: 'orders_90d', operator: '>=', value: '3' }], lastUpdated: '2026-06-06', isActive: true, autoSync: true },
  { id: 'SEG-003', name: 'Cart Abandoners', description: 'Added to cart but didn\'t checkout in 7 days', country: 'India', type: 'Behavioral', customerCount: 8400, avgOrderValue: 3200, totalRevenue: 0, conversionRate: 0, rules: [{ field: 'abandoned_cart_7d', operator: '=', value: 'true' }, { field: 'last_purchase_days', operator: '>', value: '7' }], lastUpdated: '2026-06-06', isActive: true, autoSync: true },
  { id: 'SEG-004', name: 'New Users (30 days)', description: 'Signed up within the last 30 days', country: 'Global', type: 'Lifecycle', customerCount: 12000, avgOrderValue: 2100, totalRevenue: 8400000, conversionRate: 3.8, rules: [{ field: 'signup_days', operator: '<=', value: '30' }], lastUpdated: '2026-06-06', isActive: true, autoSync: true },
  { id: 'SEG-005', name: 'Dormant Customers', description: 'No orders in last 180 days', country: 'India', type: 'Lifecycle', customerCount: 18000, avgOrderValue: 0, totalRevenue: 0, conversionRate: 0.5, rules: [{ field: 'last_order_days', operator: '>', value: '180' }], lastUpdated: '2026-06-05', isActive: true, autoSync: true },
  { id: 'SEG-006', name: 'UAE Premium', description: 'UAE customers with avg order > AED 1000', country: 'UAE', type: 'Value-Based', customerCount: 420, avgOrderValue: 28000, totalRevenue: 11760000, conversionRate: 6.4, rules: [{ field: 'country', operator: '=', value: 'UAE' }, { field: 'avg_order', operator: '>=', value: '1000' }], lastUpdated: '2026-06-04', isActive: true, autoSync: false },
  { id: 'SEG-007', name: 'Electronics Enthusiasts', description: 'Bought 2+ electronics items', country: 'India', type: 'Behavioral', customerCount: 9500, avgOrderValue: 15000, totalRevenue: 142500000, conversionRate: 7.1, rules: [{ field: 'category_electronics', operator: '>=', value: '2' }], lastUpdated: '2026-06-03', isActive: true, autoSync: true },
  { id: 'SEG-008', name: 'COD-Only Buyers', description: 'All orders paid via Cash on Delivery', country: 'India', type: 'Behavioral', customerCount: 14200, avgOrderValue: 1800, totalRevenue: 25560000, conversionRate: 4.2, rules: [{ field: 'payment_method', operator: '=', value: 'COD' }, { field: 'online_payment', operator: '=', value: 'never' }], lastUpdated: '2026-06-02', isActive: false, autoSync: false },
];

const TYPE_STYLES: Record<string, string> = { Behavioral: 'bg-blue-50 text-blue-700', Demographic: 'bg-purple-50 text-purple-700', 'Value-Based': 'bg-emerald-50 text-emerald-700', Lifecycle: 'bg-amber-50 text-amber-700', Custom: 'bg-slate-100 text-slate-600' };

function SegmentDrawer({ seg: s, onClose, fmt }: { seg: Segment; onClose: () => void; fmt: (n: number) => string }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{s.name}</h2><p className="text-xs text-slate-500">{s.id} · {s.description}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_STYLES[s.type]}`}>{s.type}</span><span className={`text-[10px] font-bold px-2 py-1 rounded-md ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>{s.autoSync && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">Auto-Sync</span>}</div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white text-center"><p className="text-sm font-bold opacity-80">Customers in Segment</p><p className="text-4xl font-black mt-1">{s.customerCount.toLocaleString()}</p><p className="text-xs opacity-60 mt-1"><CountryFlag code={COUNTRY_TO_CODE[s.country] || 'UN'} size="sm" /> {s.country}</p></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{fmt(s.avgOrderValue)}</p><p className="text-[10px] text-emerald-600">Avg. Order Value</p></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{s.conversionRate}%</p><p className="text-[10px] text-blue-600">Conversion Rate</p></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-slate-900">{fmt(s.totalRevenue)}</p><p className="text-[10px] text-slate-500">Total Revenue</p></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-slate-900">{s.lastUpdated}</p><p className="text-[10px] text-slate-500">Last Updated</p></div>
          </div>

          <div><h3 className="text-sm font-bold text-slate-900 mb-2">Segment Rules</h3>
            <div className="space-y-2">{s.rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{r.field}</span>
                <span className="text-xs font-bold text-slate-500">{r.operator}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{r.value}</span>
                {i < s.rules.length - 1 && <span className="text-[10px] font-bold text-slate-400">AND</span>}
              </div>
            ))}</div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Target className="w-4 h-4" /> Target with Campaign</button>
            <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Export List</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateSegmentModal({ onSave, onClose }: { onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'Behavioral', autoSync: true, rules: [{ field: '', operator: '>=', value: '' }] });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const updateRule = (i: number, field: string, val: string) => { const r = [...form.rules]; (r[i] as any)[field] = val; setForm(f => ({ ...f, rules: r })); };
  const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, { field: '', operator: '>=', value: '' }] }));
  const FIELDS = ['lifetime_spend', 'orders_90d', 'last_order_days', 'signup_days', 'avg_order', 'country', 'category_electronics', 'category_fashion', 'payment_method', 'abandoned_cart_7d'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">Create Segment</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="name">Name</label><input id="name" value={form.name} onChange={e => u('name', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. High-Value Customers" /></div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="description">Description</label><input id="description" value={form.description} onChange={e => u('description', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" placeholder="Describe this segment" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="type">Type</label><select id="type" value={form.type} onChange={e => u('type', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>Behavioral</option><option>Value-Based</option><option>Lifecycle</option><option>Demographic</option><option>Custom</option></select></div>
            <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={form.autoSync} onChange={e => u('autoSync', e.target.checked)} className="w-4 h-4 rounded" />Auto-sync daily</label></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-2 block">Rules</label>
            {form.rules.map((r, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={r.field} onChange={e => updateRule(i, 'field', e.target.value)} className="flex-1 border border-slate-200 rounded-lg p-2 text-xs outline-none"><option value="">Select field...</option>{FIELDS.map(f => <option key={f}>{f}</option>)}</select>
                <select value={r.operator} onChange={e => updateRule(i, 'operator', e.target.value)} className="w-16 border border-slate-200 rounded-lg p-2 text-xs outline-none"><option>=</option><option>{'>'}</option><option>{'<'}</option><option>{'>='}</option><option>{'<='}</option><option>!=</option></select>
                <input value={r.value} onChange={e => updateRule(i, 'value', e.target.value)} className="w-24 border border-slate-200 rounded-lg p-2 text-xs outline-none" placeholder="Value" />
              </div>
            ))}
            <button onClick={addRule} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add Rule</button>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold">Create</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerSegmentsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Segment | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getCustomers(), []);
  const { execute } = useAdminAction(showToast);
  const { filtered: regionFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(SEGMENTS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter(s => {
    if (filter !== 'all' && s.type !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCustomers = regionFiltered.reduce((a, s) => a + s.customerCount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Customer Segments</h1><p className="text-sm text-slate-500 mt-0.5">Rule-based customer segmentation for targeted campaigns</p></div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Create Segment</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Total Segmented</p><p className="text-2xl font-black mt-1">{totalCustomers.toLocaleString()}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Active Segments</p><p className="text-xl font-black text-emerald-600">{regionFiltered.filter(s => s.isActive).length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Auto-Syncing</p><p className="text-xl font-black text-blue-600">{regionFiltered.filter(s => s.autoSync).length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Segment Types</p><p className="text-xl font-black text-slate-900">{new Set(regionFiltered.map(s => s.type)).size}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search segments..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['all', 'Behavioral', 'Value-Based', 'Lifecycle', 'Custom'].map(s => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? <MarketplaceEmptyState title="No segments found" icon={Users} /> : filtered.map(s => (
          <div key={s.id} onClick={() => setSelected(s)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(s))} className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-bold text-slate-900 text-sm">{s.name}</p><p className="text-xs text-slate-400 mt-0.5">{s.description}</p></div>
              <div className="flex gap-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_STYLES[s.type]}`}>{s.type}</span>{!s.isActive && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">Inactive</span>}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center"><p className="text-lg font-black text-indigo-700">{s.customerCount.toLocaleString()}</p><p className="text-[10px] text-slate-500">Customers</p></div>
              <div className="text-center"><p className="text-lg font-black text-emerald-700">{fmt(s.avgOrderValue)}</p><p className="text-[10px] text-slate-500">Avg. Order</p></div>
              <div className="text-center"><p className="text-lg font-black text-blue-700">{s.conversionRate}%</p><p className="text-[10px] text-slate-500">Conv. Rate</p></div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400"><Clock className="w-3 h-3" />Updated {s.lastUpdated}{s.autoSync && <span className="text-blue-600 font-bold">· Auto-sync</span>}</div>
          </div>
        ))}
      </div>

      {selected && <SegmentDrawer seg={selected} onClose={() => setSelected(null)} fmt={fmt} />}
      {showCreate && <CreateSegmentModal onSave={(data) => { execute(() => adminMarketplaceApi.sendNotification(data), 'Segment created', () => refetch()); setShowCreate(false); }} onClose={() => setShowCreate(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
