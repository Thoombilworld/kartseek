'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type Campaign } from '@/lib/modules/seller-api';
import { Zap, Search, Plus, Pause, Play, BarChart3, DollarSign, MousePointerClick, ShoppingBag } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

const STATUS_CFG: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', scheduled: 'bg-blue-50 text-blue-700', paused: 'bg-amber-50 text-amber-700', ended: 'bg-slate-100 text-slate-500', pending_approval: 'bg-amber-50 text-amber-700' };
const TYPE_LABELS: Record<string, string> = { sponsored: 'Sponsored', flash_deal: 'Flash Deal', banner: 'Banner', promotion: 'Promotion' };

function fmtK(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }

export default function CampaignsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getCampaigns(seller.sellerId)
      .then(res => { setCampaigns(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setCampaigns([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const handlePause = async (id: string) => {
    try { await sellerApi.pauseCampaign(seller.sellerId, id); } catch {}
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status: 'paused' as const } : c));
  };
  const handleResume = async (id: string) => {
    try { await sellerApi.resumeCampaign(seller.sellerId, id); } catch {}
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status: 'active' as const } : c));
  };

  const filtered = campaigns.filter(c =>
    (statusFilter === 'all' || c.status === statusFilter) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalOrders = campaigns.reduce((s, c) => s + c.orders, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Zap className="w-7 h-7 text-blue-600" />Campaigns</h1><p className="text-sm text-slate-500 mt-1">Manage your marketing campaigns and ad spend</p></div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4" />New Campaign</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ l: 'Active Campaigns', v: campaigns.filter(c => c.status === 'active').length, c: 'text-emerald-600' }, { l: 'Total Spent', v: fmt(totalSpent), c: 'text-blue-600' }, { l: 'Total Impressions', v: fmtK(campaigns.reduce((s, c) => s + c.impressions, 0)), c: 'text-violet-600' }, { l: 'Total Orders', v: totalOrders, c: 'text-orange-600' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">{k.l}</p><p className={`text-2xl font-black mt-1 ${k.c}`}>{k.v}</p></div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">{['all', 'active', 'scheduled', 'paused', 'ended'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>))}</div>
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-900">{c.name}</h3>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${STATUS_CFG[c.status]}`}>{c.status.replace('_', ' ')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{TYPE_LABELS[c.type] || c.type}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.status === 'active' && <button onClick={() => handlePause(c.id)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><Pause className="w-4 h-4" /></button>}
                {c.status === 'paused' && <button onClick={() => handleResume(c.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Play className="w-4 h-4" /></button>}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4 text-center">
              {[
                { l: 'Budget', v: fmt(c.budget), icon: DollarSign },
                { l: 'Spent', v: fmt(c.spent), icon: BarChart3 },
                { l: 'Impressions', v: fmtK(c.impressions), icon: BarChart3 },
                { l: 'Clicks', v: fmtK(c.clicks), icon: MousePointerClick },
                { l: 'Orders', v: c.orders, icon: ShoppingBag },
              ].map(m => (
                <div key={m.l}><p className="text-[10px] text-slate-400 font-medium">{m.l}</p><p className="text-sm font-black text-slate-900">{m.v}</p></div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
              <span>{new Date(c.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {new Date(c.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span>{c.budget > 0 ? ((c.spent / c.budget) * 100).toFixed(0) : 0}% budget used</span>
            </div>
            {c.budget > 0 && <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((c.spent / c.budget) * 100, 100)}%` }} /></div>}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 bg-white border border-slate-200 rounded-xl"><Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No campaigns found</p></div>}
      </div>
    </div>
  );
}
