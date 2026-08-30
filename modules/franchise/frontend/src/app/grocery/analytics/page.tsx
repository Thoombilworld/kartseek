'use client';

import React, { useState } from 'react';
import { TrendingUp, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import { GroceryFranchiseGate } from '@/components/franchise/grocery-franchise-gate';
import { franchiseGroceryApi } from '@/lib/modules/franchise-grocery-api';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery analytics — franchise view.
 *
 * Constants again: a revenue figure, an order count and a set of change
 * percentages, none of them fetched. `FranchiseViewService.getAnalytics()` sums
 * `grandTotal` and counts orders over the period for stores belonging to the
 * franchise, and has been callable the whole time.
 *
 * Only the two figures the service actually returns are shown. The old page's
 * per-category splits and growth arrows had nothing behind them and are not
 * reproduced with invented numbers.
 */
export default function Page() {
  return <GroceryFranchiseGate>{(franchiseId) => <Analytics franchiseId={franchiseId} />}</GroceryFranchiseGate>;
}

const PERIODS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
] as const;

function Analytics({ franchiseId }: { franchiseId: string }) {
  const { formatPrice } = useGroceryRegionFilter([]);
  const [period, setPeriod] = useState<string>('30d');

  const { data, loading, error, reload } = useAsyncData<{ revenue: number; orders: number; period: string }>(
    () => franchiseGroceryApi.getAnalytics(franchiseId, period) as any,
    [franchiseId, period],
  );

  const aov = data && data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-400" /> Grocery Analytics
          </h1>
          <p className="text-slate-400 mt-1">Trading across grocery stores in your zone</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Period"
            className="px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm"
          >
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={reload} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:bg-slate-700/60" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={reload} className="font-bold shrink-0">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Revenue', value: data ? formatPrice(data.revenue) : '—', icon: TrendingUp },
          { label: 'Orders', value: data ? data.orders.toLocaleString() : '—', icon: ShoppingCart },
          { label: 'Average order value', value: aov != null ? formatPrice(aov) : '—', icon: TrendingUp },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm font-medium">{tile.label}</span>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-white">{loading ? '—' : tile.value}</p>
            </div>
          );
        })}
      </div>

      {!loading && data && data.orders === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          No grocery orders in this period for your franchise.
        </p>
      )}
    </div>
  );
}
