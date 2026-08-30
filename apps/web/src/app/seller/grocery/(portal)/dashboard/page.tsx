'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Package, Clock, DollarSign, ShoppingCart, AlertTriangle,
  Star, Truck, XCircle, RotateCcw, ArrowUpRight, ArrowDownRight,
  ChevronRight, Flame, Timer, ShieldCheck, Wallet, Eye,
  Boxes, CalendarClock, CheckCircle, Heart, Users, Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { MOCK_ANALYTICS, MOCK_ORDERS } from '@/lib/demo-data/seller-grocery';
import DashboardKpiCard from '@/components/seller/grocery/dashboard-kpi-card';
import DateRangePicker from '@/components/seller/grocery/date-range-picker';
import type { Period } from '@/components/seller/grocery/date-range-picker';
import RevenueChart from '@/components/seller/grocery/revenue-chart';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-100 text-red-700 border-red-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  picking: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  packed: 'bg-purple-100 text-purple-700 border-purple-200',
  ready_for_pickup: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  out_for_delivery: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function SellerDashboard() {
  return <StoreGate>{(store) => <SellerDashboardContent store={store} />}</StoreGate>;
}

function SellerDashboardContent({ store }: { store: GrocerySellerStore }) {
  const { formatPrice } = useGroceryLocale();
  const [a, setAnalytics] = useState(MOCK_ANALYTICS);
  const [recentOrders, setRecentOrders] = useState<typeof MOCK_ORDERS>([]);
  const [period, setPeriod] = useState<Period>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Both calls used `storeId = 'current-store'` — a store that does not exist —
   * so the analytics request 404'd, `Promise.allSettled` absorbed it, and the
   * dashboard rendered `MOCK_ANALYTICS` to every seller as if it were their own
   * trading history.
   */
  useEffect(() => {
    const periodMap: Record<string, string> = { today: '7d', week: '7d', month: '30d', quarter: '90d', year: '90d' };
    const apiPeriod = periodMap[period] || '7d';
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      groceryApi.getStoreAnalytics(store.id, apiPeriod),
      groceryApi.getStoreOrders(store.id, undefined, 1, 20),
    ]).then(([analyticsRes, ordersRes]) => {
      if (cancelled) return;

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.stats) {
        const s = analyticsRes.value.stats;
        setAnalytics(prev => ({
          ...prev,
          todayRevenue: Number(s.totalRevenue ?? 0),
          todayOrders: Number(s.totalOrders ?? 0),
          cancelledOrders: Number(s.cancelledOrders ?? 0),
          deliveredOrders: Number(s.deliveredOrders ?? 0),
          avgRating: Number(s.rating ?? 0),
          totalRatings: Number(s.totalRatings ?? 0),
          weeklyRevenue: (analyticsRes.value.dailyStats ?? []).map((d: any) => ({
            day: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
            revenue: Number(d.revenue ?? 0),
          })),
        }));
      } else if (analyticsRes.status === 'rejected') {
        setError('Could not load your store analytics.');
      }

      if (ordersRes.status === 'fulfilled') {
        const rows = ordersRes.value?.data ?? [];
        setAnalytics(prev => ({
          ...prev,
          pendingOrders: rows.filter((o: any) => o.status === 'PLACED').length,
          activeOrders: rows.filter((o: any) => ['CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status)).length,
        }));
        setRecentOrders(rows.slice(0, 6).map((o: any) => ({
          id: o.id, orderNumber: o.orderNumber,
          status: (o.status ?? 'PLACED').toLowerCase(),
          customerName: o.customerId?.slice(0, 8) ?? 'Customer',
          items: o.items?.length || 0,
          total: Number(o.grandTotal ?? 0),
          date: o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
          paymentMethod: o.paymentMethod || 'ONLINE',
        })) as any);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [period, store.id]);

  // Deltas are gone: "+8.2%", "+12%", "+0.1" and "+2%" were literals with no
  // previous period behind them, and "Delivered: 189" was a hardcoded number
  // sitting among values that did move. Currency goes through the locale so the
  // tile is not ₹-denominated for a seller in Doha.
  const kpiCards = [
    { label: 'Revenue', value: formatPrice(a.todayRevenue), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Orders', value: a.todayOrders.toString(), icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Pending Orders', value: a.pendingOrders.toString(), icon: Clock, color: 'bg-amber-500' },
    { label: 'Active Orders', value: a.activeOrders.toString(), icon: Package, color: 'bg-purple-500' },
    { label: 'Delivered', value: String((a as any).deliveredOrders ?? 0), icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Cancelled', value: a.cancelledOrders.toString(), icon: XCircle, color: 'bg-red-500' },
    { label: 'Avg Rating', value: a.avgRating > 0 ? a.avgRating.toFixed(1) : '—', icon: Star, color: 'bg-yellow-500', subtitle: `${a.totalRatings} ratings` },
    { label: 'Products', value: String(store.productCount ?? 0), icon: Boxes, color: 'bg-teal-500' },
  ];

  // Revenue chart data
  const revenueData = a.weeklyRevenue.map((d) => ({
    name: d.day,
    revenue: d.revenue,
    orders: Math.round(d.revenue / 450), // mock orders count
  }));

  // Category sales for donut
  const categorySales = a.categoryWiseSales.map((c) => ({
    name: c.category,
    value: c.revenue,
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back! Monitor your grocery store performance in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={period} onChange={(p) => setPeriod(p)} />
          <Link
            href="/seller/grocery/products/add"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
          >
            <Package className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <DashboardKpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            subtitle={kpi.subtitle}
          />
        ))}
      </div>

      {/* Health Scores + Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Seller Health */}
        <div className="bg-linear-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Seller Health</span>
            </div>
            <p className="text-4xl font-black">
              {a.sellerHealthScore}
              <span className="text-lg opacity-60">/100</span>
            </p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <ProgressBar percent={a.sellerHealthScore} className="bg-white rounded-full h-2 transition-all duration-700" />
            </div>
          </div>
        </div>

        {/* Stock Health */}
        <div className="bg-linear-to-br from-blue-500 to-blue-700 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Stock Health</span>
            </div>
            <p className="text-4xl font-black">
              {a.stockHealthScore}
              <span className="text-lg opacity-60">/100</span>
            </p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <ProgressBar percent={a.stockHealthScore} className="bg-white rounded-full h-2 transition-all duration-700" />
            </div>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="bg-linear-to-br from-purple-500 to-purple-700 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Wallet Balance</span>
            </div>
            <p className="text-4xl font-black">₹24.8K</p>
            <p className="text-xs opacity-70 mt-1">Next payout: ₹12.4K on Jun 15</p>
          </div>
        </div>

        {/* Quick Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Quick Alerts
          </p>
          <div className="space-y-2.5">
            <Link href="/seller/grocery/inventory" className="flex items-center gap-2 text-sm hover:bg-slate-50 rounded-lg px-1 -mx-1 py-0.5 transition-colors">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              <span className="text-slate-700 font-medium">
                <span className="font-bold text-red-600">{a.lowStockProducts}</span> products low on stock
              </span>
            </Link>
            <Link href="/seller/grocery/inventory" className="flex items-center gap-2 text-sm hover:bg-slate-50 rounded-lg px-1 -mx-1 py-0.5 transition-colors">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-700 font-medium">
                <span className="font-bold text-amber-600">{a.nearExpiryProducts}</span> products near expiry
              </span>
            </Link>
            <div className="flex items-center gap-2 text-sm px-1 -mx-1 py-0.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span className="text-slate-700 font-medium">
                <span className="font-bold text-slate-600">{a.expiredProducts}</span> expired product(s)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm px-1 -mx-1 py-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-700 font-medium">
                <span className="font-bold text-emerald-600">{a.activeCampaigns}</span> campaigns active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueChart
        data={revenueData}
        dataKey="revenue"
        xKey="name"
        title="Revenue Overview"
        secondaryDataKey="orders"
        secondaryColor="#3b82f6"
        height={300}
        showLegend
      />

      {/* Two Column: Recent Orders + Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-400" />
              <h2 className="text-base font-black text-slate-900">Recent Orders</h2>
            </div>
            <Link
              href="/seller/grocery/orders"
              className="text-sm font-bold text-emerald-600 flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold text-center">Items</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-5 py-3 font-semibold text-center">Status</th>
                  <th className="px-5 py-3 font-semibold text-center">SLA</th>
                  <th className="px-5 py-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-bold text-slate-900 text-xs">
                      {order.id}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {order.customerName}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-600 text-xs">
                      {order.items.length}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 text-xs">
                      ₹{order.total.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {order.slaRemainingMinutes > 0 ? (
                        <span
                          className={`text-[10px] font-bold flex items-center justify-center gap-0.5 ${
                            order.slaRemainingMinutes <= 5
                              ? 'text-red-600'
                              : order.slaRemainingMinutes <= 15
                                ? 'text-amber-600'
                                : 'text-slate-500'
                          }`}
                        >
                          <Timer className="w-3 h-3" />
                          {order.slaRemainingMinutes}m
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Link
                        href={`/seller/grocery/orders/${order.id}`}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-black text-slate-900">Top Sellers</h2>
          </div>
          <div className="p-3 space-y-1">
            {a.bestSellingProducts.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                    i === 0
                      ? 'bg-amber-100 text-amber-700'
                      : i === 1
                        ? 'bg-slate-100 text-slate-600'
                        : i === 2
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{p.sold} sold</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  ₹{(p.revenue / 1000).toFixed(1)}K
                </span>
              </div>
            ))}
          </div>
          <div className="p-3 pt-0">
            <Link
              href="/seller/grocery/analytics"
              className="block text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 py-2 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              View Full Analytics →
            </Link>
          </div>
        </div>
      </div>

      {/* Category Sales + Settlement Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise Sales */}
        <RevenueChart
          data={categorySales}
          dataKey="value"
          xKey="name"
          title="Category-wise Sales"
          chartType="bar"
          color="#10b981"
          height={250}
        />

        {/* Settlement Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-slate-400" />
            Settlement Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                Total Earned
              </p>
              <p className="text-2xl font-black text-emerald-700">₹1.48L</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">This month</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                Total Paid Out
              </p>
              <p className="text-2xl font-black text-blue-700">₹1.24L</p>
              <p className="text-[10px] text-blue-500 mt-0.5">This month</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                Pending Payout
              </p>
              <p className="text-2xl font-black text-amber-700">₹12.4K</p>
              <p className="text-[10px] text-amber-500 mt-0.5">Expected: Jun 15</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">
                Commission
              </p>
              <p className="text-2xl font-black text-purple-700">8.5%</p>
              <p className="text-[10px] text-purple-500 mt-0.5">Platform fee</p>
            </div>
          </div>
          <Link
            href="/seller/grocery/payouts"
            className="block text-center text-xs font-bold text-emerald-600 hover:text-emerald-700 py-2.5 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            View Full Settlement History →
          </Link>
        </div>
      </div>
    </div>
  );
}
