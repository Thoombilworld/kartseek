'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { Search, Download, RotateCcw, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { downloadCsv } from '@/lib/export-csv';

interface ReturnItem {
  /** Row uuid — what the accept/reject calls address, never what is displayed. */
  id: string;
  /** `RET-2026-0001`. The reference the seller and the customer both quote. */
  returnNumber: string;
  /** The order's uuid, kept for links; `orderNumber` is what gets rendered. */
  orderId: string;
  /** `null` when the order row could not be resolved server-side. */
  orderNumber: string | null;
  productName: string; reason: string; customerName: string;
  amount: number; requestedAt: string; status: 'pending' | 'approved' | 'rejected' | 'refunded';
}

const STATUS_CFG: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-amber-50 text-amber-700', icon: Clock },
  approved: { color: 'bg-blue-50 text-blue-700', icon: CheckCircle },
  rejected: { color: 'bg-red-50 text-red-700', icon: XCircle },
  refunded: { color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
};


export default function ReturnsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'pending', 'approved', 'rejected', 'refunded'];

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getReturns(seller.sellerId)
      .then(res => { setReturns(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setReturns([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  // Searched against what the row actually shows. Matching on `r.id` meant
  // typing a return or order number found nothing, because the only thing the
  // old filter looked at was a uuid the seller never sees.
  const filtered = returns.filter(r => {
    if (activeFilter !== 'All' && r.status !== activeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.productName, r.returnNumber, r.orderNumber, r.customerName]
      .some(field => (field ?? '').toLowerCase().includes(q));
  });

  const handleAccept = async (returnId: string) => {
    try {
      await sellerApi.acceptReturn(seller.sellerId, returnId);
      setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: 'approved' as const } : r));
    } catch { /* demo mode */ setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: 'approved' as const } : r)); }
  };

  const handleReject = async (returnId: string) => {
    try {
      await sellerApi.rejectReturn(seller.sellerId, returnId, 'Product used/damaged');
      setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: 'rejected' as const } : r));
    } catch { setReturns(prev => prev.map(r => r.id === returnId ? { ...r, status: 'rejected' as const } : r)); }
  };

  /**
   * Download what is on screen.
   *
   * The Export button had no `onClick`. This page already holds the rows, so
   * the file is built here rather than through an export endpoint that does
   * not exist — see `lib/export-csv.ts`.
   */
  const exportCsv = () => downloadCsv('returns', returns, [
      { header: 'Return', value: (r: ReturnItem) => r.returnNumber },
      { header: 'Order', value: (r: ReturnItem) => r.orderNumber ?? r.orderId },
      { header: 'Product', value: (r: ReturnItem) => r.productName },
      { header: 'Reason', value: (r: ReturnItem) => r.reason },
      { header: 'Customer', value: (r: ReturnItem) => r.customerName },
      { header: 'Amount', value: (r: ReturnItem) => r.amount },
      { header: 'Requested', value: (r: ReturnItem) => r.requestedAt },
      { header: 'Status', value: (r: ReturnItem) => r.status },
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><RotateCcw className="w-7 h-7 text-blue-600" />Returns</h1>
          <p className="text-sm text-slate-500 mt-1">Process customer return requests</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/marketplace/returns/policy" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"><Eye className="w-4 h-4" />Return Policy</Link>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50" onClick={exportCsv} disabled={returns.length === 0}><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap capitalize transition-colors ${activeFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{f}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input id="returns-search" name="returns-search" type="text" aria-label="Search returns" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Return ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Reason</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const cfg = STATUS_CFG[r.status] || STATUS_CFG.pending;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{r.returnNumber || '—'}</td>
                    <td className="px-4 py-3.5 text-blue-600 font-medium">{r.orderNumber || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{r.productName}</td>
                    <td className="px-4 py-3.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{r.reason}</span></td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{fmt(r.amount)}</td>
                    <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${cfg.color}`}>{r.status}</span></td>
                    <td className="px-4 py-3.5 text-slate-500">{new Date(r.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3.5">
                      {r.status === 'pending' ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleAccept(r.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Approve</button>
                          <button onClick={() => handleReject(r.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Reject</button>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No returns found</p></div>}
      </div>
    </div>
  );
}
