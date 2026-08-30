'use client';

import React, { useState } from 'react';
import { ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import { GroceryFranchiseGate } from '@/components/franchise/grocery-franchise-gate';
import { franchiseGroceryApi } from '@/lib/modules/franchise-grocery-api';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery Orders — franchise view.
 *
 * Previously a `kpis` / `columns` / `rows` constant rendered into a table, with
 * no API call in the file. The data path behind it has always existed: this page
 * → `/franchise/:id/grocery/*` on the gateway → franchise-service →
 * grocery-service's `FranchiseViewService`, which scopes every query to the
 * franchise that owns the stores.
 */
export default function Page() {
  return <GroceryFranchiseGate>{(franchiseId) => <Content franchiseId={franchiseId} />}</GroceryFranchiseGate>;
}

function Content({ franchiseId }: { franchiseId: string }) {
  const { formatPrice } = useGroceryRegionFilter([]);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('30d');

  const { data, loading, error, reload } = useAsyncData<any>(
    () => franchiseGroceryApi.getOrders(franchiseId, { page: 1 }),
    [franchiseId],
  );

  const rows: any[] = (data as any)?.orders ?? [];
  const filtered = rows.filter((r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-400" /> Grocery Orders
          </h1>
          <p className="text-slate-400 mt-1">Orders placed at stores in your franchise zone</p>
        </div>
        <button onClick={reload} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:bg-slate-700/60" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={reload} className="font-bold shrink-0">Retry</button>
        </div>
      )}



      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
            className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
          />

        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Order</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Store</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Items</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  {error ? 'Unavailable.' : 'Nothing to show for this franchise.'}
                </td></tr>
              )}
              {filtered.map((row, i) => (
                <tr key={row.id ?? i} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-4 text-sm text-white font-medium">{row.orderNumber}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{row.store?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{row.items?.length ?? 0}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatPrice(Number(row.grandTotal ?? 0))}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{row.status}</td>
                  <td className="px-5 py-4 text-sm text-slate-400">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
