'use client';

import React, { useState } from 'react';
import { Search, Zap, Plus, AlertTriangle, RefreshCw, Send, Pause, Play, X } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Seller flash deals.
 *
 * The page was the same generated template as the rest of the portal — a
 * `MOCK_DATA` table with `groceryApi` imported and unused — so a seller had no way
 * to create a deal at all, and the deals they could not create were the ones the
 * admin queue could not show (the gateway pointed the list endpoint at
 * `get_store_flash_deals`, which returns ACTIVE deals only and ignores `status`).
 * Both halves are fixed; this screen now runs the full draft → submit → approval
 * cycle.
 */
export default function GroceryFlashDealsPage() {
  return <StoreGate requireApproved>{(store) => <FlashDealsContent store={store} />}</StoreGate>;
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  draft:    { label: 'Draft',            className: 'bg-slate-100 text-slate-600' },
  pending:  { label: 'Pending approval', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved',         className: 'bg-blue-50 text-blue-700' },
  active:   { label: 'Live',             className: 'bg-emerald-50 text-emerald-700' },
  paused:   { label: 'Paused',           className: 'bg-orange-50 text-orange-700' },
  expired:  { label: 'Ended',            className: 'bg-slate-100 text-slate-500' },
  rejected: { label: 'Rejected',         className: 'bg-red-50 text-red-700' },
};

interface Deal {
  id: string;
  productId: string;
  productName: string;
  category: string;
  originalPrice: number;
  flashPrice: number;
  discountPercent: number;
  startTime: string;
  endTime: string;
  stockLimit: number;
  soldCount: number;
  status: string;
  rejectedReason?: string;
}

const EMPTY_FORM = { productId: '', flashPrice: '', stockLimit: '', startTime: '', endTime: '' };

function FlashDealsContent({ store }: { store: GrocerySellerStore }) {
  const { formatPrice } = useGroceryLocale();
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: dealsData, loading, error, reload } = useAsyncData<Deal[]>(
    async () => {
      const res = await groceryApi.getFlashDeals({ storeId: store.id, page: 1, limit: 100 });
      return (res?.data ?? []) as unknown as Deal[];
    },
    [store.id],
  );
  const deals = error ? [] : (dealsData ?? []);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setActionError(null);
    try { await fn(); await reload(); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Could not update this deal'); }
    finally { setBusyId(null); }
  };

  const create = async () => {
    if (!form.productId || !form.flashPrice || !form.stockLimit || !form.startTime || !form.endTime) {
      setFormError('All fields are required.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await groceryApi.createFlashDeal({
        storeId: store.id,
        productId: form.productId.trim(),
        flashPrice: Number(form.flashPrice),
        stockLimit: Number(form.stockLimit),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await reload();
    } catch (e) {
      // The service enforces a 30% minimum discount, a future end time and a
      // product that belongs to this store — the seller needs to know which failed.
      setFormError(e instanceof Error ? e.message : 'Could not create this flash deal');
    } finally {
      setCreating(false);
    }
  };

  const rows = deals.filter((d) =>
    !search || d.productName?.toLowerCase().includes(search.toLowerCase()) || d.category?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-500" /> Flash Deals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deals need admin approval before they go live. Minimum discount is 30%.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setForm(EMPTY_FORM); setFormError(null); setShowForm(true); }} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors">
            <Plus className="w-4 h-4" /> New Deal
          </button>
          <button onClick={() => reload()} className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh deals">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => reload()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deals…" aria-label="Search flash deals"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Deal price</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Sold</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Window</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading flash deals…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">{error ? 'Flash deals unavailable.' : 'No flash deals yet.'}</p>
                  </td>
                </tr>
              )}
              {rows.map((d) => {
                const cfg = STATUS_CFG[d.status] ?? { label: d.status, className: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={d.id} className={`hover:bg-slate-50/50 transition-colors ${busyId === d.id ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{d.productName}</p>
                      <p className="text-xs text-slate-400">{d.category}</p>
                      {d.status === 'rejected' && d.rejectedReason && (
                        <p className="text-xs text-red-600 mt-0.5">Reason: {d.rejectedReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-slate-900">{formatPrice(Number(d.flashPrice))}</span>
                      <span className="text-xs text-slate-400 line-through block">{formatPrice(Number(d.originalPrice))}</span>
                      <span className="text-[10px] font-bold text-red-600">−{d.discountPercent}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold">{d.soldCount}</span>
                      <span className="text-slate-400"> / {d.stockLimit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {new Date(d.startTime).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: 'numeric' })}
                      {' → '}
                      {new Date(d.endTime).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${cfg.className}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {/* Only the transitions the service accepts from this state. */}
                      {(d.status === 'draft' || d.status === 'rejected') && (
                        <button onClick={() => void run(d.id, () => groceryApi.submitFlashDeal(d.id))} disabled={busyId === d.id} className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                          <Send className="w-3.5 h-3.5" /> Submit
                        </button>
                      )}
                      {d.status === 'active' && (
                        <button onClick={() => void run(d.id, () => groceryApi.pauseFlashDeal(d.id))} disabled={busyId === d.id} className="inline-flex items-center gap-1 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </button>
                      )}
                      {d.status === 'paused' && (
                        <button onClick={() => void run(d.id, () => groceryApi.resumeFlashDeal(d.id))} disabled={busyId === d.id} className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                          <Play className="w-3.5 h-3.5" /> Resume
                        </button>
                      )}
                      {['pending', 'approved', 'expired'].includes(d.status) && <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create flash deal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-black text-slate-900">New Flash Deal</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="deal-product" className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Product ID</label>
                <input
                  id="deal-product" type="text" value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                  placeholder="Copy from your Products list"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">The deal is priced against this product&apos;s first weight variant.</p>
              </div>
              {[
                { key: 'flashPrice', label: 'Flash price', type: 'number', placeholder: '49' },
                { key: 'stockLimit', label: 'Stock limit', type: 'number', placeholder: '50' },
                { key: 'startTime', label: 'Starts', type: 'datetime-local', placeholder: '' },
                { key: 'endTime', label: 'Ends', type: 'datetime-local', placeholder: '' },
              ].map((f) => (
                <div key={f.key}>
                  <label htmlFor={`deal-${f.key}`} className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">{f.label}</label>
                  <input
                    id={`deal-${f.key}`} type={f.type} placeholder={f.placeholder}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              ))}
              {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
              <button onClick={() => void create()} disabled={creating} className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-600 disabled:bg-amber-300 transition-colors">
                {creating ? 'Creating…' : 'Create draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
