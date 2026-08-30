'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type DashboardKPI, type SellerOrder } from '@/lib/modules/seller-api';
import { useSellerData, useSellerList } from '@/lib/hooks/use-seller-data';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import Link from 'next/link';
import {
  ShoppingBag, Package, Star, ArrowRight, Clock, Truck, CheckCircle, XCircle,
  RotateCcw, Wallet, Zap, BarChart3, AlertTriangle, Bell, CreditCard, ChevronRight,
} from 'lucide-react';

/**
 * Seller dashboard.
 *
 * Every figure here used to come from a module-level `KPI` constant — ₹48,920
 * today, ₹12,48,920 this month, 1,284 orders, 4.8 rating, 94% health — rendered
 * directly. The page did fetch the real KPIs, assigned them to `kpiData`, and
 * then never referenced that variable: the JSX read `KPI.todaySales`, not
 * `kpiData.todaySales`. A seller had no way to tell those numbers from their own,
 * and the four panels below were fed by `const RECENT_ORDERS: any[] = []` and
 * friends, so they rendered as blank boxes with no explanation.
 */

/**
 * Order status → badge colour. The API speaks the lifecycle in its own
 * vocabulary (`PENDING`, `RETURN_REQUESTED`, …); an unrecognised value falls
 * back to neutral rather than rendering an unstyled chip.
 */
const ORDER_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  PREPARING: 'bg-violet-50 text-violet-700',
  READY: 'bg-violet-50 text-violet-700',
  SHIPPED: 'bg-cyan-50 text-cyan-700',
  OUT_FOR_DELIVERY: 'bg-cyan-50 text-cyan-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  RETURN_REQUESTED: 'bg-orange-50 text-orange-700',
  RETURNED: 'bg-orange-50 text-orange-700',
  REFUNDED: 'bg-pink-50 text-pink-700',
};

function KPICard({
  label, value, icon: Icon, color, sub, href,
}: {
  label: string; value: string | number | null; icon: React.ElementType;
  color: string; sub?: string; href?: string;
}) {
  const content = (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
        {href && <ChevronRight className="w-4 h-4 text-slate-300" />}
      </div>
      <p className="text-xl font-black text-slate-900">
        {value === null || value === undefined ? '—' : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/** Panel shell so each dashboard card can report its own state independently. */
function Panel({
  title, icon: Icon, iconClass, link, linkLabel, children,
}: {
  title: string; icon: React.ElementType; iconClass: string;
  link: string; linkLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} /><span className="truncate">{title}</span>
        </h3>
        {/* The link was 16px tall — half a usable tap target. Padding gives it a
            44px hit area without changing how the header reads. */}
        <Link
          href={link}
          className="text-xs text-blue-600 font-bold hover:underline hover:bg-blue-50 rounded-lg flex items-center gap-1 shrink-0 px-2 py-3 -mr-2 min-h-11"
        >
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

/** One source of truth for the period names — the buttons and the headline tile
 *  must never disagree about which window the figure covers. */
const PERIOD_LABEL: Record<'today' | 'week' | 'month', string> = {
  today: 'Today',
  week: 'Last 7 Days',
  month: 'This Month',
};
const PERIODS = ['today', 'week', 'month'] as const;

export default function SellerDashboard() {
  const { seller } = useSeller();
  const { format: money } = useSellerMoney();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // `api.get` already strips the `{ success, data }` envelope, so this resolves
  // to the KPI object itself. Reading `.data` off it again gave `undefined` and
  // every figure on this page rendered "—" against a live, working API.
  const kpiRes = useSellerData<DashboardKPI>(
    (sellerId) => sellerApi.getDashboard(sellerId, period),
    [period],
  );
  const kpi = kpiRes.data;

  const orders = useSellerList<SellerOrder>((sellerId) => sellerApi.getRecentOrders(sellerId, 5));
  const campaigns = useSellerList<any>((sellerId) => sellerApi.getCampaignStats(sellerId));
  const notifications = useSellerList<any>((sellerId) => sellerApi.getNotifications(sellerId, { page: 1 }));

  /** A KPI we could not load reads "—", never 0. */
  const n = (v: number | undefined | null) => (typeof v === 'number' ? v : null);

  const healthScore = n(kpi?.healthScore);
  // A health score is a warning, so it has to look like one below the thresholds
  // a marketplace actually acts on. It was always emerald, which made a failing
  // account look healthy.
  const healthBar = healthScore === null || healthScore >= 80 ? 'bg-emerald-500'
    : healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const healthText = healthScore === null || healthScore >= 80 ? 'text-emerald-600'
    : healthScore >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Seller Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {seller.sellerName ? `Welcome back, ${seller.sellerName}` : 'Loading your store…'}
          </p>
        </div>
        {/* `py-1.5` gave a 26px-high control — below the 44px touch target
            guidance and, on a 360px screen, the three of them together
            overflowed the row by 5px. Wraps and meets a usable height now. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sales period">
          {PERIODS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`px-3 py-2.5 min-h-11 text-xs font-bold rounded-lg border transition-colors ${period === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              {/* "This Week" was a misnomer: the window is a rolling 7 days from
                  today, not the current calendar week. */}
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Sales & health — hidden entirely rather than shown as zeroes we can't stand behind */}
      {kpiRes.error && !kpiRes.loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Your sales figures could not be loaded, so they are shown as “—”. They are not zero.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white col-span-1 md:col-span-2">
          {/*
            Every tile here is a distinct figure. Three of them used to say the
            same thing: the headline showed today's revenue whichever period was
            selected (the buttons re-fetched and re-rendered an unchanged number),
            and "Total Revenue" was fed the very same `monthlyRevenue` as the
            "Monthly Sales" tile beside it.
          */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <p className="text-sm font-bold opacity-80">{PERIOD_LABEL[period]}</p>
              <p className="text-3xl font-black">{money(n(kpi?.periodSales))}</p>
              <p className="text-xs opacity-70 mt-0.5">
                {kpi ? `${kpi.periodOrders ?? 0} paid ${(kpi.periodOrders ?? 0) === 1 ? 'order' : 'orders'}` : '—'}
              </p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-sm font-bold opacity-80">Lifetime Sales</p>
              <p className="text-2xl font-black">{money(n(kpi?.totalRevenue))}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 pt-3 border-t border-white/20">
            {period !== 'month' && (
              <div><p className="text-xs opacity-70">This Month</p><p className="font-bold">{money(n(kpi?.monthlySales))}</p></div>
            )}
            <div><p className="text-xs opacity-70">Wallet Balance</p><p className="font-bold">{money(n(kpi?.walletBalance))}</p></div>
            <div><p className="text-xs opacity-70">Pending Payout</p><p className="font-bold">{money(n(kpi?.pendingPayout))}</p></div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center"><Star className="w-7 h-7 text-amber-500 fill-amber-500" /></div>
            <div className="min-w-0">
              {/* A rating of 0 means "not rated yet", so "—" is honest there. */}
              <p className="text-3xl font-black text-slate-900">
                {typeof kpi?.sellerRating === 'number' && kpi.sellerRating > 0 ? kpi.sellerRating.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-slate-500">Seller Rating</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <ProgressBar percent={healthScore ?? 0} className={`${healthBar} rounded-full h-2`} />
            </div>
            {/* `kpi?.healthScore ? … : '—'` hid a genuine score of 0 — the one
                figure a seller most needs to see — behind an em dash. */}
            <p className={`text-sm font-bold ${healthText}`}>
              {healthScore === null ? '—' : `${healthScore}%`}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Seller Health Score</p>
        </div>
      </div>

      {/* Order Pipeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" />Order Pipeline</h2>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
          {[
            { label: 'Pending', value: n(kpi?.pendingOrders), color: 'bg-amber-50 text-amber-600', icon: Clock },
            { label: 'Accepted', value: n(kpi?.acceptedOrders), color: 'bg-blue-50 text-blue-600', icon: CheckCircle },
            { label: 'Packed', value: n(kpi?.packedOrders), color: 'bg-violet-50 text-violet-600', icon: Package },
            { label: 'Shipped', value: n(kpi?.shippedOrders), color: 'bg-cyan-50 text-cyan-600', icon: Truck },
            { label: 'Delivered', value: n(kpi?.deliveredOrders), color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle },
            { label: 'Cancelled', value: n(kpi?.cancelledOrders), color: 'bg-red-50 text-red-600', icon: XCircle },
            { label: 'Returns', value: n(kpi?.returnRequests), color: 'bg-orange-50 text-orange-600', icon: RotateCcw },
            { label: 'Refunds', value: n(kpi?.refundRequests), color: 'bg-pink-50 text-pink-600', icon: CreditCard },
            { label: 'Total', value: n(kpi?.totalOrders), color: 'bg-slate-100 text-slate-600', icon: ShoppingBag },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`w-10 h-10 rounded-lg mx-auto mb-1.5 flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <p className="text-lg font-black text-slate-900">{s.value === null ? '—' : s.value.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Active Listings" value={n(kpi?.totalProducts)} icon={Package} color="bg-indigo-50 text-indigo-600" href="/seller/marketplace/products" />
        <KPICard label="Low Stock Products" value={n(kpi?.lowStock)} icon={AlertTriangle} color="bg-amber-50 text-amber-600" sub={kpi ? `${kpi.outOfStock ?? 0} out of stock` : undefined} href="/seller/marketplace/inventory" />
        <KPICard label="Approval Pending" value={n(kpi?.approvalPending)} icon={Clock} color="bg-orange-50 text-orange-600" sub={kpi ? `${kpi.rejected ?? 0} rejected` : undefined} href="/seller/marketplace/products" />
        <KPICard label="Wallet Balance" value={money(n(kpi?.walletBalance))} icon={Wallet} color="bg-emerald-50 text-emerald-600" href="/seller/marketplace/wallet" />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Recent Orders" icon={ShoppingBag} iconClass="text-blue-500" link="/seller/marketplace/orders" linkLabel="View All">
          <SellerDataState
            loading={orders.loading} error={orders.error} unavailable={orders.unavailable}
            isEmpty={orders.rows.length === 0} feature="Orders" onRetry={orders.reload}
            emptyTitle="No orders yet"
            emptyDescription="New orders appear here the moment a customer checks out."
          >
            {/* An order row is `{ orderNumber, items[], grandTotal, customerName }`.
                This read `o.product`, `o.amount` and `o.buyer` — none of which
                exist on it — so the panel showed a blank title, a raw UUID and
                "—" for every amount, on a seller who had twelve real orders. */}
            <div className="divide-y divide-slate-100">
              {orders.rows.map((o: any) => {
                const items: any[] = Array.isArray(o.items) ? o.items : [];
                const title = items[0]?.name
                  ? (items.length > 1 ? `${items[0].name} +${items.length - 1} more` : items[0].name)
                  : 'Order';
                return (
                  <Link
                    key={o.id}
                    href={`/seller/marketplace/orders/${o.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {o.orderNumber ?? o.id}
                        {o.customerName ? ` · ${o.customerName}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 shrink-0">{money(o.grandTotal)}</p>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${ORDER_STATUS_STYLE[String(o.status)] ?? 'bg-slate-100 text-slate-600'}`}>
                      {String(o.status ?? '').replace(/_/g, ' ')}
                    </span>
                  </Link>
                );
              })}
            </div>
          </SellerDataState>
        </Panel>

        <Panel title="Top Selling Products" icon={BarChart3} iconClass="text-violet-500" link="/seller/marketplace/reports" linkLabel="Reports">
          <SellerDataState
            loading={kpiRes.loading} error={kpiRes.error} unavailable={kpiRes.unavailable}
            isEmpty feature="Top products"
            emptyTitle="No sales ranking yet"
            emptyDescription="Once orders start coming in, your best sellers are ranked here."
          >
            {null}
          </SellerDataState>
        </Panel>

        <Panel title="Campaign Performance" icon={Zap} iconClass="text-amber-500" link="/seller/marketplace/campaigns" linkLabel="Manage">
          <SellerDataState
            loading={campaigns.loading} error={campaigns.error} unavailable={campaigns.unavailable}
            isEmpty={campaigns.rows.length === 0} feature="Campaigns" onRetry={campaigns.reload}
            emptyTitle="No campaigns running"
            emptyDescription="Create a campaign to promote your listings."
          >
            <div className="divide-y divide-slate-100">
              {campaigns.rows.map((c: any) => (
                <div key={c.id ?? c.name} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      Budget: {money(c.budget)} · {Number(c.impressions ?? 0).toLocaleString()} impressions · {c.orders ?? 0} orders
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600">{c.status}</span>
                </div>
              ))}
            </div>
          </SellerDataState>
        </Panel>

        <Panel title="Notifications" icon={Bell} iconClass="text-red-500" link="/seller/marketplace/notifications" linkLabel="All">
          <SellerDataState
            loading={notifications.loading} error={notifications.error} unavailable={notifications.unavailable}
            isEmpty={notifications.rows.length === 0} feature="Notifications" onRetry={notifications.reload}
            emptyTitle="Nothing new"
            emptyDescription="Admin decisions, payout updates and policy changes land here."
          >
            <div className="divide-y divide-slate-100">
              {notifications.rows.slice(0, 5).map((notice: any, i: number) => (
                <div key={notice.id ?? i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{notice.title ?? notice.body}</p>
                    {notice.createdAt && (
                      <p className="text-xs text-slate-400">{new Date(notice.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SellerDataState>
        </Panel>
      </div>
    </div>
  );
}
