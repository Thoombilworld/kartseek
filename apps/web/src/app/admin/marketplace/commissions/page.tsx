'use client';
import React, { useState } from 'react';
import { Percent, Plus, Edit2, Eye, Download, X, Search, ChevronLeft, ChevronRight, Save, Trash2, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', All: 'UN' };

type CommissionRule = {
  id: string; seller: string; category: string; country: string;
  type: 'Percentage' | 'Flat' | 'Tiered';
  value: string; tiers?: { min: number; max: number; rate: string }[];
  effective: string; expiry: string | null; status: 'active' | 'scheduled' | 'expired';
  totalEarned: number; ordersAffected: number;
  history: { date: string; oldValue: string; newValue: string; changedBy: string }[];
};

const COMMISSIONS: CommissionRule[] = [
  { id: 'COM-01', seller: 'All Sellers', category: 'Electronics', country: 'India', type: 'Tiered', value: '5-8%', tiers: [{ min: 0, max: 10000, rate: '8%' }, { min: 10001, max: 50000, rate: '6%' }, { min: 50001, max: 999999, rate: '5%' }], effective: '2026-01-01', expiry: '2026-12-31', status: 'active', totalEarned: 4520000, ordersAffected: 12400, history: [{ date: '2026-01-01', oldValue: '8%', newValue: '5-8% (Tiered)', changedBy: 'Finance Admin' }, { date: '2025-07-01', oldValue: '10%', newValue: '8%', changedBy: 'Raj (Admin)' }] },
  { id: 'COM-02', seller: 'All Sellers', category: 'Fashion', country: 'India', type: 'Percentage', value: '14%', effective: '2026-01-01', expiry: '2026-12-31', status: 'active', totalEarned: 3200000, ordersAffected: 18600, history: [{ date: '2026-01-01', oldValue: '12%', newValue: '14%', changedBy: 'Finance Admin' }] },
  { id: 'COM-03', seller: 'All Sellers', category: 'Mobiles', country: 'India', type: 'Percentage', value: '3%', effective: '2026-01-01', expiry: '2026-12-31', status: 'active', totalEarned: 8900000, ordersAffected: 9800, history: [] },
  { id: 'COM-04', seller: 'All Sellers', category: 'Electronics', country: 'UAE', type: 'Percentage', value: '6%', effective: '2026-01-01', expiry: '2026-12-31', status: 'active', totalEarned: 620000, ordersAffected: 2100, history: [] },
  { id: 'COM-05', seller: 'Apple India Store', category: 'Electronics', country: 'India', type: 'Percentage', value: '3%', effective: '2026-03-01', expiry: '2027-02-28', status: 'active', totalEarned: 1800000, ordersAffected: 4200, history: [{ date: '2026-03-01', oldValue: '5%', newValue: '3%', changedBy: 'Raj (Admin)' }] },
  { id: 'COM-06', seller: 'All Sellers', category: 'Grocery', country: 'India', type: 'Flat', value: '₹15/order', effective: '2026-01-01', expiry: null, status: 'active', totalEarned: 450000, ordersAffected: 30000, history: [] },
  { id: 'COM-07', seller: 'All Sellers', category: 'Beauty', country: 'India', type: 'Percentage', value: '18%', effective: '2026-07-01', expiry: '2026-12-31', status: 'scheduled', totalEarned: 0, ordersAffected: 0, history: [] },
  { id: 'COM-08', seller: 'All Sellers', category: 'Books', country: 'India', type: 'Percentage', value: '5%', effective: '2025-01-01', expiry: '2025-12-31', status: 'expired', totalEarned: 120000, ordersAffected: 4800, history: [] },
];

const STATUS_STYLES: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', scheduled: 'bg-blue-50 text-blue-700', expired: 'bg-slate-100 text-slate-500' };

// ── Commission Drawer ────────────────────────────────────────────────────────
function CommissionDrawer({ rule: r, onClose, formatCurrency }: { rule: CommissionRule; onClose: () => void; formatCurrency: (n: number) => string }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{r.id}</h2><p className="text-xs text-slate-500">{r.category} · {r.seller}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[r.status]}`}>{r.status}</span><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{r.type}</span></div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5 text-white text-center"><p className="text-sm font-bold opacity-80">Commission Rate</p><p className="text-4xl font-black mt-1">{r.value}</p><p className="text-xs opacity-60 mt-1">{r.category} · {r.country}</p></div>

          {/* Tiered Rates */}
          {r.type === 'Tiered' && r.tiers && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Tiered Rate Structure</h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-200"><th className="px-3 py-2 text-left text-slate-500">Order Value Range</th><th className="px-3 py-2 text-right text-slate-500">Rate</th></tr></thead>
                  <tbody>{r.tiers.map((t, i) => (<tr key={i} className="border-b border-slate-100 last:border-0"><td className="px-3 py-2 font-medium text-slate-700">{formatCurrency(t.min)} — {formatCurrency(t.max)}</td><td className="px-3 py-2 text-right font-black text-purple-700">{t.rate}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{formatCurrency(r.totalEarned)}</p><p className="text-[10px] text-emerald-600">Total Earned</p></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{r.ordersAffected.toLocaleString()}</p><p className="text-[10px] text-blue-600">Orders Affected</p></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Effective</p><p className="text-sm font-bold text-slate-900">{r.effective}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Expiry</p><p className="text-sm font-bold text-slate-900">{r.expiry || 'No expiry'}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Region</p><p className="text-sm font-bold text-slate-900 flex items-center gap-1"><CountryFlag code={COUNTRY_TO_CODE[r.country] || 'IN'} size="sm" />{r.country}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Avg. per Order</p><p className="text-sm font-bold text-slate-900">{r.ordersAffected ? formatCurrency(Math.round(r.totalEarned / r.ordersAffected)) : '—'}</p></div>
          </div>

          {/* Rate Change History */}
          {r.history.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" />Rate History</h3>
              <div className="space-y-0 relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                {r.history.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${i === 0 ? 'bg-purple-600' : 'bg-slate-200'}`}><Clock className={`w-3 h-3 ${i === 0 ? 'text-white' : 'text-slate-500'}`} /></div>
                    <div><p className="text-xs text-slate-900"><span className="font-bold text-red-500 line-through">{h.oldValue}</span> → <span className="font-bold text-emerald-600">{h.newValue}</span></p><p className="text-[10px] text-slate-400">{h.changedBy} · {h.date}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Rule Modal ──────────────────────────────────────────────────────
function RuleModal({ rule, onSave, onClose }: { rule?: CommissionRule; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    seller: rule?.seller || 'All Sellers', category: rule?.category || '', country: rule?.country || 'India',
    type: rule?.type || 'Percentage', value: rule?.value || '', effective: rule?.effective || '', expiry: rule?.expiry || '',
    tiers: rule?.tiers || [{ min: 0, max: 10000, rate: '' }, { min: 10001, max: 50000, rate: '' }, { min: 50001, max: 999999, rate: '' }],
  });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const updateTier = (i: number, field: string, val: any) => { const t = [...form.tiers]; (t[i] as any)[field] = val; setForm(f => ({ ...f, tiers: t })); };
  const addTier = () => setForm(f => ({ ...f, tiers: [...f.tiers, { min: 0, max: 0, rate: '' }] }));
  const removeTier = (i: number) => setForm(f => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">{rule ? 'Edit Commission Rule' : 'Add Commission Rule'}</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4"><strong>⚠️</strong> Changes are permanently logged in the Audit Trail with old value, new value, and admin name.</div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="category">Category</label><input id="category" value={form.category} onChange={e => u('category', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Electronics" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="country">Country</label><select id="country" value={form.country} onChange={e => u('country', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>India</option><option>UAE</option><option>Saudi Arabia</option><option>UK</option></select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="seller">Seller</label><input id="seller" value={form.seller} onChange={e => u('seller', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" placeholder="All Sellers or specific" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="commission-type">Commission Type</label><select id="commission-type" value={form.type} onChange={e => u('type', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>Percentage</option><option>Flat</option><option>Tiered</option></select></div>
            {form.type !== 'Tiered' && <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="value">Value</label><input id="value" value={form.value} onChange={e => u('value', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder={form.type === 'Percentage' ? 'e.g. 8%' : 'e.g. ₹15/order'} /></div>}
          </div>

          {/* Tiered Rate Builder */}
          {form.type === 'Tiered' && (
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 block">Tiered Rate Slabs</label>
              <div className="space-y-2">
                {form.tiers.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input type="number" value={t.min || ''} onChange={e => updateTier(i, 'min', +e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs outline-none" placeholder="Min ₹" />
                      <input type="number" value={t.max || ''} onChange={e => updateTier(i, 'max', +e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs outline-none" placeholder="Max ₹" />
                      <input value={t.rate} onChange={e => updateTier(i, 'rate', e.target.value)} className="border border-slate-200 rounded-lg p-2 text-xs outline-none font-bold" placeholder="Rate %" />
                    </div>
                    <button onClick={() => removeTier(i)} className="p-1 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                ))}
                <button onClick={addTier} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add Tier</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="effective-date">Effective Date</label><input id="effective-date" type="date" value={form.effective} onChange={e => u('effective', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="expiry-date">Expiry Date</label><input id="expiry-date" type="date" value={form.expiry} onChange={e => u('expiry', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.category || !form.effective} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">Save Rule</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<CommissionRule | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getCommissions(), []);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(COMMISSIONS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search && !c.category.toLowerCase().includes(search.toLowerCase()) && !c.seller.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalEarned = regionFiltered.reduce((a, c) => a + c.totalEarned, 0);

  const handleSave = (data: any) => { execute(() => adminMarketplaceApi.updateCommission('new', data), 'Commission rule saved', () => refetch()); setShowAdd(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Commission Rules</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Configure category-level and seller-specific commission rates with tiered pricing</p></div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Add Rule</button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span><strong>⚠️ Audit-Logged:</strong> All commission changes are permanently logged with admin name, old value, new value, and timestamp.</span></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Total Earned</p><p className="text-2xl font-black mt-1">{fmt(totalEarned)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Active Rules</p><p className="text-2xl font-black text-emerald-600">{regionFiltered.filter(c => c.status === 'active').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Categories</p><p className="text-2xl font-black text-slate-900">{new Set(regionFiltered.map(c => c.category)).size}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Tiered Rules</p><p className="text-2xl font-black text-purple-600">{regionFiltered.filter(c => c.type === 'Tiered').length}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search category or seller..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'active', 'scheduled', 'expired'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors capitalize ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Rule</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Seller</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Type</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Rate</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Earned</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Orders</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><MarketplaceEmptyState title="No commission rules found" icon={Percent} /></td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(c)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(c))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{c.category}</p><p className="text-[10px] text-slate-400">{c.id} · <CountryFlag code={COUNTRY_TO_CODE[c.country] || 'IN'} size="sm" /> {c.country}</p></td>
                <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{c.seller}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.type === 'Tiered' ? 'bg-purple-50 text-purple-700' : c.type === 'Flat' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{c.type}</span></td>
                <td className="px-4 py-3.5 text-center font-black text-lg text-purple-700">{c.value}</td>
                <td className="px-4 py-3.5 text-right font-bold text-emerald-600 text-xs">{fmt(c.totalEarned)}</td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-600">{c.ordersAffected.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${STATUS_STYLES[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelected(c)} className="p-1 hover:bg-slate-100 rounded-lg"><Eye className="w-3.5 h-3.5 text-slate-400" /></button>
                    <button onClick={() => setShowAdd(true)} className="p-1 hover:bg-slate-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <CommissionDrawer rule={selected} onClose={() => setSelected(null)} formatCurrency={fmt} />}
      {showAdd && <RuleModal onSave={handleSave} onClose={() => setShowAdd(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
