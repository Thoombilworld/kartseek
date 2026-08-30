'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type Promotion } from '@/lib/modules/seller-api';
import { Target, Search, Plus, Copy, Pause, Play, Trash2, Tag } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

const STATUS_CFG: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', expired: 'bg-slate-100 text-slate-500', scheduled: 'bg-blue-50 text-blue-700', paused: 'bg-amber-50 text-amber-700' };
const TYPE_LABELS: Record<string, string> = { percentage: '% Off', flat: 'Flat', bogo: 'BOGO', freebie: 'Freebie' };


export default function PromotionsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getPromotions(seller.sellerId)
      .then(res => { setPromotions(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setPromotions([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const filtered = promotions.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Target className="w-7 h-7 text-blue-600" />Promotions</h1><p className="text-sm text-slate-500 mt-1">Create and manage discount codes and offers</p></div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4" />Create Promotion</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Active Promotions</p><p className="text-2xl font-black text-emerald-600 mt-1">{promotions.filter(p => p.status === 'active').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Redemptions</p><p className="text-2xl font-black text-blue-600 mt-1">{promotions.reduce((s, p) => s + p.usageCount, 0).toLocaleString()}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Avg Usage Rate</p><p className="text-2xl font-black text-amber-600 mt-1">{promotions.length > 0 ? ((promotions.reduce((s, p) => s + (p.usageCount / p.usageLimit), 0) / promotions.length) * 100).toFixed(0) : 0}%</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search promotions or codes..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">{['all', 'active', 'scheduled', 'paused', 'expired'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>))}</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Promotion</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Value</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Validity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 py-3.5"><div className="flex items-center gap-1"><code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold">{p.code}</code><button onClick={() => navigator.clipboard?.writeText(p.code)} className="text-slate-400 hover:text-slate-600"><Copy className="w-3 h-3" /></button></div></td>
                  <td className="px-4 py-3.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700">{TYPE_LABELS[p.type]}</span></td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{p.type === 'percentage' ? `${p.value}%` : fmt(p.value)}{p.maxDiscount ? <span className="text-[10px] text-slate-400 block">max {fmt(p.maxDiscount)}</span> : null}</td>
                  <td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className="text-xs text-slate-600">{p.usageCount}/{p.usageLimit}</span><div className="w-16 bg-slate-100 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min((p.usageCount / p.usageLimit) * 100, 100)}%` }} /></div></div></td>
                  <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${STATUS_CFG[p.status]}`}>{p.status}</span></td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><Target className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No promotions found</p></div>}
      </div>
    </div>
  );
}
