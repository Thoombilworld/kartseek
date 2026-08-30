'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { Tag, Search, Plus, Copy, Percent } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

interface Coupon { id: string; code: string; description: string; type: 'percentage' | 'flat'; value: number; maxDiscount?: number; minOrder: number; usage: number; limit: number; status: 'active' | 'expired' | 'paused'; validUntil: string; }

const STATUS_CFG: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', expired: 'bg-slate-100 text-slate-500', paused: 'bg-amber-50 text-amber-700' };


export default function CouponsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getCoupons(seller.sellerId)
      .then(res => { setCoupons(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setCoupons([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const filtered = coupons.filter(c => !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Tag className="w-7 h-7 text-blue-600" />Coupons</h1><p className="text-sm text-slate-500 mt-1">Create and manage discount coupons</p></div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4" />Create Coupon</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Active Coupons</p><p className="text-2xl font-black text-emerald-600 mt-1">{coupons.filter(c => c.status === 'active').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Redemptions</p><p className="text-2xl font-black text-blue-600 mt-1">{coupons.reduce((s, c) => s + c.usage, 0).toLocaleString()}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Expired</p><p className="text-2xl font-black text-slate-400 mt-1">{coupons.filter(c => c.status === 'expired').length}</p></div>
      </div>

      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coupons..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Discount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Min Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Valid Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-1"><code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold">{c.code}</code><button onClick={() => navigator.clipboard?.writeText(c.code)} className="text-slate-400 hover:text-slate-600"><Copy className="w-3 h-3" /></button></div></td>
                  <td className="px-4 py-3.5 text-slate-700">{c.description}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{c.type === 'percentage' ? `${c.value}%` : fmt(c.value)}{c.maxDiscount && <span className="text-[10px] text-slate-400 block">max {fmt(c.maxDiscount)}</span>}</td>
                  <td className="px-4 py-3.5 text-slate-600">{fmt(c.minOrder)}</td>
                  <td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className="text-xs">{c.usage}/{c.limit}</span><div className="w-12 bg-slate-100 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(c.usage / c.limit) * 100}%` }} /></div></div></td>
                  <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${STATUS_CFG[c.status]}`}>{c.status}</span></td>
                  <td className="px-4 py-3.5 text-slate-500">{new Date(c.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No coupons found</p></div>}
      </div>
    </div>
  );
}
