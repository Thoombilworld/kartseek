'use client';

import React, { useState } from 'react';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { SellerError, SellerLoading, SellerUnavailable } from '@/components/seller/marketplace/data-state';
import { BarChart3, DollarSign, ShoppingBag, Download } from 'lucide-react';

/**
 * Reports.
 *
 * The old page displayed a six-month revenue chart, a top-five product table and
 * a category breakdown — ₹84.9L revenue, 1,284 orders, "iPhone 15 Pro, 142 sold"
 * — all from module-level constants, with the bar heights hard-coded to match.
 * The single API call it made was `await`ed and discarded inside
 * `catch { /* using demo data *\/ }`, so the numbers never moved regardless of
 * period, date range, or which seller was signed in.
 *
 * `GET /sellers/:id/reports` returns order count and revenue for the period.
 * That is what is shown. The breakdowns it does not return are named as missing
 * rather than illustrated with invented ones.
 */

type ReportPayload = {
  sellerId?: string;
  type?: string;
  period?: string;
  data?: { totalOrders?: number; revenue?: number };
};

export default function SellerReportsPage() {
  const { format: money } = useSellerMoney();
  const [type, setType] = useState<'sales' | 'inventory' | 'performance' | 'returns'>('sales');

  const report = useSellerData<ReportPayload>(
    (sellerId) => sellerApi.getReports(sellerId, { type }) as Promise<ReportPayload>,
    [type],
  );

  const totals = report.data?.data ?? {};
  const exportReport = () => {
    const rows = [
      ['metric', 'value'],
      ['period', report.data?.period ?? ''],
      ['type', report.data?.type ?? type],
      ['total_orders', String(totals.totalOrders ?? '')],
      ['revenue', String(totals.revenue ?? '')],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kartseek-${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" aria-hidden />
            Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {report.data?.period ? `Covering ${report.data.period.replace(/_/g, ' ')}` : 'Your store performance'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {(['sales', 'inventory', 'performance', 'returns'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border capitalize ${type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={exportReport}
            disabled={report.loading || !!report.error}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-3 h-3" />Export CSV
          </button>
        </div>
      </div>

      {report.loading ? (
        <SellerLoading label="Building your report…" />
      ) : report.unavailable ? (
        <SellerUnavailable feature="Reports" />
      ) : report.error ? (
        <SellerError message={report.error} onRetry={report.reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <DollarSign className="w-4 h-4" aria-hidden />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {typeof totals.revenue === 'number' ? money(totals.revenue) : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Revenue</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <ShoppingBag className="w-4 h-4" aria-hidden />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {typeof totals.totalOrders === 'number' ? totals.totalOrders.toLocaleString() : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Orders</p>
            </div>
          </div>

          {/* Named rather than illustrated with invented figures. */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-bold text-slate-700">Not in this report yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Revenue over time, best-selling products and category breakdowns are not returned by
              the reporting endpoint yet. They used to be drawn here from fixed sample figures,
              which is why the same six months and the same five products appeared for every seller.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
