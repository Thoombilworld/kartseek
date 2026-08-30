'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Star, Truck, ShoppingCart, Package, BarChart3, PieChart, ArrowUpRight, Wifi, WifiOff } from 'lucide-react';
import { MOCK_ANALYTICS } from '@/lib/demo-data/seller-grocery';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';

export default function AnalyticsPage() {
  return <StoreGate>{(store) => <AnalyticsContent store={store} />}</StoreGate>;
}

function AnalyticsContent({ store }: { store: GrocerySellerStore }) {
  const { formatPrice } = useGroceryLocale();
  const [a, setAnalytics] = useState(MOCK_ANALYTICS);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `'current-store'` is not a store id, so this request 404'd every time and the
    // catch left MOCK_ANALYTICS on screen — the seller was shown a fictional shop's
    // revenue, rating and SLA as their own.
    const apiPeriod = period === 'weekly' ? '7d' : '30d';
    let cancelled = false;
    setLoading(true);
    setError(null);
    groceryApi.getStoreAnalytics(store.id, apiPeriod)
      .then((res: any) => {
        if (cancelled) return;
        const s = res?.stats ?? {};
        setAnalytics(prev => ({
          ...prev,
          todayRevenue: Number(s.totalRevenue ?? 0),
          todayOrders: Number(s.totalOrders ?? 0),
          avgRating: Number(s.rating ?? 0),
          deliverySlaPercent: Number(s.fulfillmentRate ?? 0),
          weeklyRevenue: (res?.dailyStats ?? []).map((d: any) => ({
            day: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
            revenue: Number(d.revenue ?? 0),
          })),
          monthlyRevenue: (res?.dailyStats ?? []).map((d: any) => ({
            day: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
            revenue: Number(d.revenue ?? 0),
          })),
        }));
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, store.id]);

  const chartData = period === 'weekly' ? a.weeklyRevenue : a.monthlyRevenue;
  const maxRev = Math.max(1, ...chartData.map(d => d.revenue));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Analytics & Insights</h1>
        <p className="text-sm text-slate-500">{store.name} — sales, ratings and fulfilment</p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* KPIs. "Active Campaigns" is gone — nothing on the platform tracks a
          grocery campaign, so it was reading a demo-only field. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Revenue', value: loading ? '—' : formatPrice(a.todayRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'Orders', value: loading ? '—' : String(a.todayOrders), icon: ShoppingCart, color: 'text-blue-600 bg-blue-100' },
          { label: 'Avg Rating', value: loading ? '—' : (a.avgRating > 0 ? a.avgRating.toFixed(1) : '—'), icon: Star, color: 'text-amber-600 bg-amber-100' },
          { label: 'Fulfilment rate', value: loading ? '—' : `${a.deliverySlaPercent}%`, icon: Truck, color: 'text-purple-600 bg-purple-100' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className={`w-9 h-9 ${kpi.color} rounded-xl flex items-center justify-center mb-3`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-[11px] text-slate-500 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Revenue Trend</h2>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setPeriod('weekly')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${period === 'weekly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Weekly</button>
            <button onClick={() => setPeriod('monthly')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${period === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Monthly</button>
          </div>
        </div>
        <div className="flex items-end gap-2 h-44">
          {chartData.map(d => {
            const pct = (d.revenue / maxRev) * 100;
            const key = 'day' in d ? (d as any).day : (d as any).month;
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">₹{(d.revenue / 1000).toFixed(0)}K</span>
                <div className="w-full bg-slate-100 rounded-t-lg relative h-[130px]">
                  <ProgressBar percent={pct} className="absolute bottom-0 w-full bg-linear-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500" direction="vertical" />
                </div>
                <span className="text-[10px] font-bold text-slate-500">{key}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Category Sales + Branch Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Sales */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-500" /> Category-wise Sales</h2>
          <div className="space-y-3">
            {a.categoryWiseSales.map(c => {
              const maxCat = Math.max(...a.categoryWiseSales.map(x => x.revenue));
              const pct = (c.revenue / maxCat) * 100;
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-slate-700">{c.category}</span>
                    <span className="text-slate-500">{c.orders} orders • ₹{(c.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2.5">
                    <ProgressBar percent={pct} className="bg-linear-to-r from-purple-500 to-purple-400 rounded-full h-2.5 transition-all duration-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> Branch-wise Revenue</h2>
          <div className="space-y-4">
            {a.branchWiseRevenue.map(b => {
              const maxBranch = Math.max(...a.branchWiseRevenue.map(x => x.revenue));
              const pct = (b.revenue / maxBranch) * 100;
              return (
                <div key={b.branch} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900">{b.branch}</span>
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />₹{(b.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="bg-slate-200 rounded-full h-2.5">
                    <ProgressBar percent={pct} className="bg-linear-to-r from-blue-500 to-blue-400 rounded-full h-2.5 transition-all duration-500" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{b.orders} orders</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-black text-slate-900 mb-3">Campaign Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-emerald-700">₹{(a.campaignRevenue / 1000).toFixed(0)}K</p>
            <p className="text-xs font-bold text-emerald-600 mt-1">Campaign Revenue</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-blue-700">{a.campaignROI.toFixed(1)}x</p>
            <p className="text-xs font-bold text-blue-600 mt-1">Return on Investment</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-purple-700">{a.activeCampaigns}</p>
            <p className="text-xs font-bold text-purple-600 mt-1">Active Campaigns</p>
          </div>
        </div>
      </div>
    </div>
  );
}
