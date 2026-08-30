'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Store, Package, TrendingUp, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { GroceryFranchiseGate } from '@/components/franchise/grocery-franchise-gate';
import { franchiseGroceryApi, type FranchiseGroceryKpis } from '@/lib/modules/franchise-grocery-api';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery — franchise overview.
 *
 * The four KPI tiles were a constant: "Total Stores 28 (+3)", "Active 24 (+2)",
 * "Avg Rating 4.5 (+0.2)", "Revenue ₹8.4L (+12%)". Every figure, including all
 * four change indicators, was written into the file.
 *
 * `FranchiseViewService.getKpis()` computes these from `grocery_stores`,
 * `grocery_items` and `grocery_orders`, scoped to the franchise — it is the
 * sanctioned read path into grocery's tables and has been implemented and tested
 * the whole time. The change indicators are gone rather than reproduced: nothing
 * stores a previous period to compare against.
 */
export default function FranchiseGroceryPage() {
  return <GroceryFranchiseGate>{(franchiseId) => <Overview franchiseId={franchiseId} />}</GroceryFranchiseGate>;
}

function Overview({ franchiseId }: { franchiseId: string }) {
  const { formatPrice } = useGroceryRegionFilter([]);

  const { data: kpis, loading, error, reload } = useAsyncData<FranchiseGroceryKpis>(
    () => franchiseGroceryApi.getKpis(franchiseId),
    [franchiseId],
  );

  const tiles = [
    { label: 'Active stores', value: kpis ? `${kpis.activeStores} of ${(kpis as any).totalStores ?? kpis.activeStores}` : '—', icon: Store },
    { label: 'Products listed', value: kpis ? Number(kpis.totalProducts).toLocaleString() : '—', icon: Package },
    { label: 'Orders', value: kpis ? Number(kpis.totalOrders).toLocaleString() : '—', icon: ShoppingCart },
    { label: 'Revenue', value: kpis ? formatPrice(Number(kpis.revenue)) : '—', icon: TrendingUp },
  ];

  const links = [
    { href: '/grocery/stores', label: 'Stores', desc: 'Every grocery store in your zone' },
    { href: '/grocery/orders', label: 'Orders', desc: 'Orders placed at those stores' },
    { href: '/grocery/products', label: 'Products', desc: 'Their combined catalogue' },
    { href: '/grocery/analytics', label: 'Analytics', desc: 'Revenue and order trend' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-400" /> Grocery
          </h1>
          <p className="text-slate-400 mt-1">Grocery operations in your franchise zone</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-700/40 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{link.label}</p>
                <p className="text-sm text-slate-400 mt-0.5">{link.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-green-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
