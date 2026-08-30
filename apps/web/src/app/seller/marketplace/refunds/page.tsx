'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { CreditCard, Search, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { downloadCsv } from '@/lib/export-csv';

interface RefundItem {
  /** Row uuid — used as the React key, never displayed. */
  id: string;
  /** The order's uuid; `orderNumber` is the reference that gets rendered. */
  orderId: string;
  /** `null` when the order row could not be resolved server-side. */
  orderNumber: string | null;
  /**
   * `RET-2026-0001`. A refund is a stage of a return rather than an object of
   * its own, so the return number *is* this refund's reference — there is no
   * separate refund id to show.
   */
  returnId: string;
  productName: string; customerName: string;
  amount: number; reason: string; status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string; processedAt?: string;
}

const STATUS_CFG: Record<string, { color: string }> = {
  pending: { color: 'bg-amber-50 text-amber-700' },
  processing: { color: 'bg-blue-50 text-blue-700' },
  completed: { color: 'bg-emerald-50 text-emerald-700' },
  failed: { color: 'bg-red-50 text-red-700' },
};


export default function RefundsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getRefunds(seller.sellerId)
      .then(res => { setRefunds(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setRefunds([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  // Searched against the references on screen rather than `r.id`, which is a
  // uuid the seller has no way of typing.
  const filtered = refunds.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.productName, r.returnId, r.orderNumber, r.customerName]
      .some(field => (field ?? '').toLowerCase().includes(q));
  });

  const totalRefunded = refunds.filter(r => r.status === 'completed').reduce((s, r) => s + r.amount, 0);
  const pendingTotal = refunds.filter(r => r.status === 'pending' || r.status === 'processing').reduce((s, r) => s + r.amount, 0);

  /**
   * Download what is on screen.
   *
   * The Export button had no `onClick`. This page already holds the rows, so
   * the file is built here rather than through an export endpoint that does
   * not exist — see `lib/export-csv.ts`.
   */
  const exportCsv = () => downloadCsv('refunds', refunds, [
      { header: 'Return', value: (r: RefundItem) => r.returnId },
      { header: 'Order', value: (r: RefundItem) => r.orderNumber ?? r.orderId },
      { header: 'Product', value: (r: RefundItem) => r.productName },
      { header: 'Customer', value: (r: RefundItem) => r.customerName },
      { header: 'Amount', value: (r: RefundItem) => r.amount },
      { header: 'Status', value: (r: RefundItem) => r.status },
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><CreditCard className="w-7 h-7 text-blue-600" />Refunds</h1>
          <p className="text-sm text-slate-500 mt-1">Track refund processing for approved returns</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50" onClick={exportCsv} disabled={refunds.length === 0}><Download className="w-4 h-4" />Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Refunded</p><p className="text-2xl font-black text-red-600 mt-1">-{fmt(totalRefunded)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Pending Refunds</p><p className="text-2xl font-black text-amber-600 mt-1">{fmt(pendingTotal)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Requests</p><p className="text-2xl font-black text-slate-900 mt-1">{refunds.length}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input id="refunds-search" name="refunds-search" type="text" aria-label="Search refunds" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search refunds..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'pending', 'processing', 'completed', 'failed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Return</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Requested</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const cfg = STATUS_CFG[r.status] || STATUS_CFG.pending;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{r.returnId || '—'}</td>
                    <td className="px-4 py-3.5 text-blue-600 font-medium">{r.orderNumber || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{r.productName}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-red-600">-{fmt(r.amount)}</td>
                    <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${cfg.color}`}>{r.status}</span></td>
                    <td className="px-4 py-3.5 text-slate-500">{new Date(r.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3.5 text-slate-500">{r.processedAt ? new Date(r.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No refunds found</p></div>}
      </div>
    </div>
  );
}
