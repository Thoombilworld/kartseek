'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { AlertCircle, Search, Download, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

interface Dispute { id: string; orderId: string; productName: string; customerName: string; type: string; amount: number; status: 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed'; createdAt: string; description: string; }

const STATUS_CFG: Record<string, string> = { open: 'bg-red-50 text-red-700', investigating: 'bg-amber-50 text-amber-700', resolved: 'bg-emerald-50 text-emerald-700', escalated: 'bg-red-50 text-red-700', closed: 'bg-slate-100 text-slate-500' };


export default function DisputesPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // No dispute table and no dispute service exists yet, so the endpoint reports
  // that rather than passing off an empty queue as a settled fact.
  const [unavailable, setUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getDisputes(seller.sellerId)
      .then((res: any) => {
        setDisputes(res?.data ?? []);
        setUnavailable(res?.dataAvailable === false);
        setLoadError(null);
      })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setDisputes([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  // Every field here is optional in practice — the endpoint has never returned a
  // populated row — so the filter must not assume any of them is a string.
  // `d.productName.toLowerCase()` threw the moment a seller typed anything.
  const filtered = disputes.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.productName, d.orderId, d.customerName]
      .some(field => (field ?? '').toLowerCase().includes(q));
  });

  /**
   * Download the disputes on screen as CSV.
   *
   * Built from the loaded rows rather than a server export: the page already
   * holds exactly what the button offers, and there is no export endpoint.
   */
  const exportCsv = () => {
    const header = ['Dispute ID', 'Order ID', 'Product', 'Customer', 'Type', 'Amount', 'Status', 'Raised'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...disputes.map(d => [d.id, d.orderId, d.productName, d.customerName, d.type, d.amount, d.status, d.createdAt].map(escape).join(',')),
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `disputes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><AlertCircle className="w-7 h-7 text-blue-600" />Disputes & Claims</h1><p className="text-sm text-slate-500 mt-1">Manage customer disputes and resolution</p></div>
        <button
          onClick={exportCsv}
          disabled={disputes.length === 0}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ l: 'Open', v: disputes.filter(d => d.status === 'open').length, c: 'text-red-600' }, { l: 'Investigating', v: disputes.filter(d => d.status === 'investigating').length, c: 'text-amber-600' }, { l: 'Resolved', v: disputes.filter(d => d.status === 'resolved').length, c: 'text-emerald-600' }, { l: 'Total Amount at Risk', v: fmt(disputes.filter(d => d.status === 'open' || d.status === 'investigating').reduce((s, d) => s + d.amount, 0)), c: 'text-slate-900' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">{k.l}</p><p className={`text-2xl font-black mt-1 ${k.c}`}>{k.v}</p></div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input id="disputes-search" name="disputes-search" type="text" aria-label="Search disputes" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search disputes..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">{['all', 'open', 'investigating', 'resolved', 'closed'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>))}</div>
      </div>

      <div className="space-y-3">
        {filtered.map(d => (
          <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-slate-900">{d.id}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${STATUS_CFG[d.status]}`}>{d.status}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{d.type}</span>
                </div>
                <p className="text-sm text-slate-700">{d.productName} — <span className="text-blue-600 font-medium">{d.orderId}</span></p>
                <p className="text-xs text-slate-500 mt-1">{d.description}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-lg font-black text-slate-900">{fmt(d.amount)}</p>
                <p className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
            {/* "Respond" and "Upload Evidence" were rendered here with no
                `onClick`. A dispute is money the seller may be about to lose,
                so an inert button is the worst possible control to show: it
                reads as an available remedy. There is no dispute store behind
                this page — `GET /sellers/:id/disputes` answers
                `dataAvailable: false` — and therefore no endpoint to respond
                through, so the row says where the seller can actually act
                instead of offering a button that does nothing. */}
            {(d.status === 'open' || d.status === 'investigating') && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
                <span>
                  Responding in-portal isn&apos;t available yet. Raise this with support quoting
                  order <span className="font-mono font-semibold text-slate-700">{d.orderId}</span>.
                </span>
              </div>
            )}
          </div>
        ))}
        {/* `loading` and `loadError` were tracked and then never rendered, so a
            request still in flight and a request that failed both looked
            identical to "no disputes found". */}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            {loading ? (
              <p className="text-sm text-slate-500">Loading disputes…</p>
            ) : loadError ? (
              <p className="text-sm text-slate-500">{loadError}</p>
            ) : unavailable ? (
              <>
                <p className="text-sm text-slate-500">Dispute management isn&apos;t available yet</p>
                <p className="text-xs text-slate-400 mt-1">Raise anything urgent through Support and it will be handled there.</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No disputes found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
