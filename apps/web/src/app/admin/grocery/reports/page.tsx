'use client';

import React, { useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Package, BarChart3, XCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery reports.
 *
 * Everything on this page was a constant: six months of revenue peaking at
 * ₹4.78L, a seven-row category split, and five "top stores" with invented growth
 * percentages. The `adminGroceryApi` import was unused, and the KPI strip was a
 * literal array of strings including "+12.5%" — a change figure computed against
 * nothing. `admin.grocery.reports` had no handler on the service either.
 *
 * It now renders what `GroceryAdminService.getReports()` aggregates. Where a
 * figure genuinely cannot be derived yet — period-over-period change — it is not
 * shown rather than fabricated.
 */

const PERIODS = [
  { id: '7d',   label: 'Week' },
  { id: '30d',  label: 'Month' },
  { id: '90d',  label: 'Quarter' },
  { id: '365d', label: 'Year' },
] as const;

type ReportData = Awaited<ReturnType<typeof adminGroceryApi.getReports>>['data'];

export default function AdminReportsPage() {
  const { regionLabel, isFiltered, formatPrice } = useGroceryRegionFilter([]);
  const [period, setPeriod] = useState<string>('30d');

  const { data: reportData, loading, error, reload } = useAsyncData<ReportData>(
    async () => {
      const res = await adminGroceryApi.getReports(period);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load grocery reports');
      return res.data;
    },
    [period],
  );
  const report = reportData;

  const summary = report?.summary;
  const daily = report?.daily ?? [];
  const topStores = report?.topStores ?? [];
  const byCategory = report?.productsByCategory ?? [];

  const maxDailyRevenue = Math.max(1, ...daily.map((d) => d.revenue));
  const maxCategoryProducts = Math.max(1, ...byCategory.map((c) => c.products));

  const kpis = [
    { label: 'Revenue', value: summary ? formatPrice(summary.revenue) : '—', icon: DollarSign, bg: 'bg-green-50', color: 'text-green-700' },
    { label: 'Orders', value: summary ? summary.orders.toLocaleString() : '—', icon: ShoppingCart, bg: 'bg-blue-50', color: 'text-blue-700' },
    { label: 'Avg. order value', value: summary ? formatPrice(summary.averageOrderValue) : '—', icon: TrendingUp, bg: 'bg-purple-50', color: 'text-purple-700' },
    { label: 'Cancellation rate', value: summary ? `${summary.cancellationRate}%` : '—', icon: XCircle, bg: 'bg-amber-50', color: 'text-amber-700' },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            {isFiltered ? `${regionLabel} — ` : ''}Sales, store performance and catalogue breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${period === p.id ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => reload()} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh report">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => reload()} className="font-bold shrink-0">Retry</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-xl font-black text-slate-900">{loading ? '—' : k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Daily revenue */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-600" /> Revenue by day
          </h2>
          {loading ? (
            <div className="h-48 bg-slate-50 rounded-lg animate-pulse" aria-busy="true" />
          ) : daily.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">No orders in this period.</p>
          ) : (
            // Bars are sized inline from the data — a CSS-module class cannot carry
            // a runtime percentage.
            <div className="flex items-end gap-1 h-48 overflow-x-auto pb-1">
              {daily.map((d) => (
                <div key={d.date} className="flex flex-col items-center justify-end gap-1 min-w-[28px] flex-1 h-full group">
                  <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatPrice(d.revenue)}
                  </span>
                  <div
                    className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                    style={{ height: `${Math.max(2, (d.revenue / maxDailyRevenue) * 100)}%` }}
                    title={`${d.date}: ${d.orders} orders`}
                  />
                  <span className="text-[9px] text-slate-400 whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fulfilment */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Fulfilment</h2>
          {loading || !summary ? (
            <div className="h-32 bg-slate-50 rounded-lg animate-pulse" aria-busy="true" />
          ) : (
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600"><CheckCircle className="w-4 h-4 text-emerald-500" /> Delivered</span>
                <span className="font-bold text-slate-900">{summary.delivered.toLocaleString()}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600"><XCircle className="w-4 h-4 text-red-500" /> Cancelled</span>
                <span className="font-bold text-slate-900">{summary.cancelled.toLocaleString()}</span>
              </li>
              <li className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-slate-600">In flight</span>
                <span className="font-bold text-slate-900">
                  {Math.max(0, summary.orders - summary.delivered - summary.cancelled).toLocaleString()}
                </span>
              </li>
            </ul>
          )}
        </section>

        {/* Top stores */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Top stores by revenue</h2>
          {loading ? (
            <div className="h-40 bg-slate-50 rounded-lg animate-pulse" aria-busy="true" />
          ) : topStores.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No store revenue in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="text-left pb-2 font-semibold">Store</th>
                  <th className="text-right pb-2 font-semibold">Orders</th>
                  <th className="text-right pb-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topStores.map((s) => (
                  <tr key={s.storeId}>
                    <td className="py-2.5 font-medium text-slate-800">{s.storeName ?? s.storeId.slice(0, 8)}</td>
                    <td className="py-2.5 text-right text-slate-600">{s.orders.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatPrice(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Catalogue by category */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" /> Catalogue by category
          </h2>
          {loading ? (
            <div className="h-40 bg-slate-50 rounded-lg animate-pulse" aria-busy="true" />
          ) : byCategory.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No products listed.</p>
          ) : (
            <ul className="space-y-2.5">
              {byCategory.slice(0, 8).map((c) => (
                <li key={c.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 truncate">{c.category || 'Uncategorised'}</span>
                    <span className="font-bold text-slate-900 shrink-0 ml-2">{c.products}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(c.products / maxCategoryProducts) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
