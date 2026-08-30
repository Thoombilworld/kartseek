'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type SponsoredProduct } from '@/lib/modules/seller-api';
import { Target, Search, Plus, Pause, Play, BarChart3, DollarSign, MousePointerClick, ShoppingBag } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

const STATUS_CFG: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', paused: 'bg-amber-50 text-amber-700', out_of_budget: 'bg-red-50 text-red-700', pending_approval: 'bg-blue-50 text-blue-700' };

function fmtK(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

export default function SponsoredPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [products, setProducts] = useState<SponsoredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getSponsoredProducts(seller.sellerId)
      .then(res => { setProducts(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setProducts([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const handlePause = async (id: string) => { try { await sellerApi.pauseSponsored(seller.sellerId, id); } catch {} setProducts(p => p.map(s => s.id === id ? { ...s, status: 'paused' as const } : s)); };
  const handleResume = async (id: string) => { try { await sellerApi.resumeSponsored(seller.sellerId, id); } catch {} setProducts(p => p.map(s => s.id === id ? { ...s, status: 'active' as const } : s)); };

  const filtered = products.filter(p => (statusFilter === 'all' || p.status === statusFilter) && (!search || p.productName.toLowerCase().includes(search.toLowerCase())));

  const totalSpent = products.reduce((s, p) => s + p.spent, 0);
  const totalOrders = products.reduce((s, p) => s + p.orders, 0);
  const avgCpc = products.reduce((s, p) => s + p.clicks, 0) > 0 ? totalSpent / products.reduce((s, p) => s + p.clicks, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Target className="w-7 h-7 text-blue-600" />Sponsored Products</h1><p className="text-sm text-slate-500 mt-1">Boost product visibility with sponsored placements</p></div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4" />Sponsor Product</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ l: 'Total Spent', v: fmt(totalSpent), c: 'text-blue-600' }, { l: 'Avg CPC', v: fmt(avgCpc), c: 'text-violet-600' }, { l: 'Total Clicks', v: fmtK(products.reduce((s, p) => s + p.clicks, 0)), c: 'text-amber-600' }, { l: 'Orders via Ads', v: totalOrders, c: 'text-emerald-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">{k.l}</p><p className={`text-2xl font-black mt-1 ${k.c}`}>{k.v}</p></div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">{['all', 'active', 'paused', 'out_of_budget', 'pending_approval'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s.replace(/_/g, ' ')}</button>))}</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Daily Budget</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Max CPC</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Spent</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Impressions</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Clicks</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Orders</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[200px] truncate">{p.productName}</td>
                  <td className="px-4 py-3.5 text-right text-slate-700">{fmt(p.dailyBudget)}/day</td>
                  <td className="px-4 py-3.5 text-right text-slate-700">{fmt(p.maxCpc)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900">{fmt(p.spent)}</td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{fmtK(p.impressions)}</td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{fmtK(p.clicks)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{p.orders}</td>
                  <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_CFG[p.status]}`}>{p.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3.5">
                    {p.status === 'active' && <button onClick={() => handlePause(p.id)} className="p-1.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100"><Pause className="w-3 h-3" /></button>}
                    {p.status === 'paused' && <button onClick={() => handleResume(p.id)} className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Play className="w-3 h-3" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><Target className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No sponsored products found</p></div>}
      </div>
    </div>
  );
}
