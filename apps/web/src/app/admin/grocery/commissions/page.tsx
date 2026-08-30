'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Percent, Info, AlertTriangle, RefreshCw, ArrowRight, TrendingUp } from 'lucide-react';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery commission.
 *
 * The page showed a per-category commission table — Fruits & Vegetables 8%,
 * Fresh Meat 10%, Snacks 15% — with store counts, average order values and
 * monthly revenue per category, all from a `COMMISSION_TIERS` constant.
 * `adminGroceryApi` was imported and never called.
 *
 * Two things were wrong with it beyond the invented figures. There is no
 * per-category commission model: commission-service charges one rate per order at
 * delivery, and grocery's rate is the single `commissionPercent` setting. And
 * nothing aggregates revenue by category — order lines are a jsonb snapshot that
 * no query groups.
 *
 * What this screen can honestly show is the rate actually in force and the revenue
 * it is charged against, both of which are real.
 */
export default function AdminGroceryCommissionsPage() {
  const { formatPrice } = useGroceryRegionFilter([]);
  const { data, loading, error, reload: load } = useAsyncData<{
    rate: number | null;
    revenue: { period: string; orders: number; revenue: number } | null;
  }>(
    async () => {
      const [settingsRes, reportRes] = await Promise.all([
        adminGroceryApi.getSettings(),
        adminGroceryApi.getReports('30d'),
      ]);

      // The rate is the point of the page, so its failure is the page's failure.
      if (!settingsRes.success || !settingsRes.data) {
        throw new Error(settingsRes.error ?? 'Could not load the commission rate');
      }

      return {
        rate: Number(settingsRes.data.settings?.commissionPercent ?? 0),
        // The report is contextual — it turns the rate into an estimate. If it
        // fails the rate is still worth showing, so this degrades to null rather
        // than taking the whole page down with it.
        revenue: reportRes.success && reportRes.data
          ? {
              period: reportRes.data.period,
              orders: reportRes.data.summary.orders,
              revenue: reportRes.data.summary.revenue,
            }
          : null,
      };
    },
    [],
  );
  const rate = data?.rate ?? null;
  const revenue = data?.revenue ?? null;

  // Commission is charged when an order is delivered, so it is estimated against
  // delivered revenue rather than all orders placed.
  const estimated = rate != null && revenue ? Math.round(revenue.revenue * (rate / 100) * 100) / 100 : null;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Commission</h1>
          <p className="text-sm text-slate-500">What KARTSEEK charges grocery stores</p>
        </div>
        <button onClick={() => void load()} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mb-2">
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{loading || rate == null ? '—' : `${rate}%`}</p>
          <p className="text-xs text-slate-500 mt-0.5">Commission rate</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{loading || !revenue ? '—' : formatPrice(revenue.revenue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Order value (30d)</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-2">
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{estimated == null ? '—' : formatPrice(estimated)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Commission at that rate</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-2">How it is charged</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          One rate applies to every grocery order, regardless of category. It is charged when the order reaches
          DELIVERED — the point at which grocery-service emits <code className="font-mono text-xs">commission.calculated</code>{' '}
          for commission-service to act on — so cancelled orders are never charged.
        </p>
        <Link
          href="/admin/grocery/settings"
          className="inline-flex items-center gap-1.5 mt-4 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
        >
          Change the rate in Settings <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Per-category rates and category revenue breakdowns are not available: the platform has a single grocery
          commission rate, and nothing aggregates order lines by category. The figure above is an estimate against
          the last 30 days of order value — commission-service holds the settled amounts.
        </p>
      </div>
    </div>
  );
}
