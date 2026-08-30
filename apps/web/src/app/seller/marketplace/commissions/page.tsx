'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type Commission } from '@/lib/modules/seller-api';
import { Percent, Search, Download, TrendingUp, BarChart3 } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { downloadCsv } from '@/lib/export-csv';


export default function CommissionsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getCommissions(seller.sellerId)
      .then(res => { setCommissions(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setCommissions([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  const categories = ['all', ...Array.from(new Set(commissions.map(c => c.categoryName)))];

  // `productName` is absent on every row — commission is charged per order —
  // so the old filter threw on `.toLowerCase()` as soon as a seller searched.
  // Matching on `orderId` was useless too: that column shows `orderNumber`.
  const filtered = commissions.filter(c => {
    if (categoryFilter !== 'all' && c.categoryName !== categoryFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.orderNumber, c.categoryName, c.productName]
      .some(field => (field ?? '').toLowerCase().includes(q));
  });

  const totalCommission = filtered.reduce((s, c) => s + c.commissionAmount, 0);
  const totalOrder = filtered.reduce((s, c) => s + c.orderAmount, 0);
  const avgRate = totalOrder > 0 ? ((totalCommission / totalOrder) * 100).toFixed(1) : '0';

  /**
   * Download the filtered rows.
   *
   * The Export button had no `onClick`. Exporting `filtered` rather than the
   * raw list matters: the button sits beside the filters, so a seller who has
   * narrowed the view expects the file to match what they are looking at.
   */
  const exportCsv = () => downloadCsv('commissions', filtered, [
      { header: 'Order', value: (c: any) => c.orderNumber ?? '' },
      { header: 'Product', value: (c: any) => c.productName },
      { header: 'Category', value: (c: any) => c.categoryName },
      { header: 'Order amount', value: (c: any) => c.orderAmount },
      { header: 'Commission', value: (c: any) => c.commissionAmount },
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Percent className="w-7 h-7 text-blue-600" />Commissions</h1>
          <p className="text-sm text-slate-500 mt-1">Platform commission breakdown by order and category</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50" onClick={exportCsv} disabled={filtered.length === 0}><Download className="w-4 h-4" />Export</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Commission</p><p className="text-2xl font-black text-red-600 mt-1">-{fmt(totalCommission)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Order Revenue</p><p className="text-2xl font-black text-slate-900 mt-1">{fmt(totalOrder)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Avg. Commission Rate</p><p className="text-2xl font-black text-amber-600 mt-1">{avgRate}%</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input id="commissions-search" name="commissions-search" type="text" aria-label="Search commissions by order or category" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order or category..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${categoryFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{c === 'all' ? 'All Categories' : c}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Order Amount</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Commission</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-blue-600">{c.orderNumber || '—'}</td>
                  <td className="px-4 py-3.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{c.categoryName}</span></td>
                  <td className="px-4 py-3.5 text-right text-slate-700">{fmt(c.orderAmount)}</td>
                  <td className="px-4 py-3.5 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">{c.commissionRate}%</span></td>
                  <td className="px-4 py-3.5 text-right font-bold text-red-600">-{fmt(c.commissionAmount)}</td>
                  <td className="px-4 py-3.5 text-slate-500">{new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><Percent className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No commissions found</p></div>}
      </div>
    </div>
  );
}
