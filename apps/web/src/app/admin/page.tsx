'use client';

import React, { useState, useEffect } from 'react';
import { Users, Store, DollarSign, Activity, ShoppingCart, AlertCircle, ArrowUpRight, TrendingUp, Package, Truck, Clock, CheckCircle, ArrowRight, UtensilsCrossed, Pill, MapPin, Star, Globe, Landmark, Percent } from 'lucide-react';
import Link from 'next/link';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminCoreApi } from '@/lib/api/admin-core';

const modules = [
  { name: 'Marketplace', orders: 8420, revenue: 2100000, status: 'Healthy', color: 'bg-blue-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/marketplace' },
  { name: 'Grocery', orders: 5100, revenue: 1200000, status: 'Healthy', color: 'bg-green-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/grocery' },
  { name: 'Restaurant', orders: 3800, revenue: 900000, status: 'Healthy', color: 'bg-orange-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/restaurant' },
  { name: 'Pharmacy', orders: 1200, revenue: 400000, status: 'Healthy', color: 'bg-cyan-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/pharmacy' },
  { name: 'Doctor', orders: 480, revenue: 200000, status: 'Healthy', color: 'bg-purple-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/doctor' },
  { name: 'Taxi', orders: 3200, revenue: 600000, status: 'Surge', color: 'bg-yellow-500', statusBg: 'bg-amber-50 text-amber-600 border-amber-100', href: '/admin/taxi' },
  { name: 'Hotel Booking', orders: 1840, revenue: 980000, status: 'Healthy', color: 'bg-rose-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/hotel-booking' },
  { name: 'Wallet', orders: 6200, revenue: 450000, status: 'Healthy', color: 'bg-emerald-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/marketplace/seller-wallets' },
  { name: 'Loyalty', orders: 4100, revenue: 320000, status: 'Healthy', color: 'bg-pink-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/hotel-booking/loyalty' },
  { name: 'Franchise', orders: 920, revenue: 540000, status: 'Healthy', color: 'bg-slate-500', statusBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', href: '/admin/franchise' },
];

const recentActivity = [
  { action: 'New seller registered', detail: 'FreshMart Organics (Grocery) — Pending KYC', time: '2 min ago', type: 'info', region: 'IN' },
  { action: 'KYC Approved', detail: 'QuickRide Cabs — Verified by Admin', time: '15 min ago', type: 'success', region: 'IN' },
  { action: 'Refund processed', detail: 'Order #KS-78210 — Refunded', time: '28 min ago', type: 'warning', region: 'QA' },
  { action: 'System alert', detail: 'High CPU usage on API Gateway (78%)', time: '45 min ago', type: 'error', region: 'ALL' },
  { action: 'Payout completed', detail: 'Mumbai South Franchise — Payout processed', time: '1 hr ago', type: 'success', region: 'IN' },
  { action: 'New seller registered', detail: 'Dubai Mall Express (Marketplace)', time: '1.5 hr ago', type: 'info', region: 'AE' },
  { action: 'Driver approved', detail: 'Riyadh taxi partner #SA-421', time: '2 hr ago', type: 'success', region: 'SA' },
];

const activityColors: Record<string, string> = {
  info: 'bg-blue-500', success: 'bg-emerald-500', warning: 'bg-amber-500', error: 'bg-red-500',
};

const hourlyData = [
  { hour: '6AM', orders: 420 }, { hour: '8AM', orders: 1200 }, { hour: '10AM', orders: 2800 },
  { hour: '12PM', orders: 4100 }, { hour: '2PM', orders: 3600 }, { hour: '4PM', orders: 2400 },
  { hour: '6PM', orders: 3800 }, { hour: '8PM', orders: 5200 }, { hour: '10PM', orders: 3100 },
  { hour: '12AM', orders: 800 },
];

export default function AdminDashboardPage() {
  const maxOrders = Math.max(...hourlyData.map(h => h.orders));
  const { selectedRegion, getAggregatedStats, formatCurrencyValue, getRegionStats } = useRegion();

  const stats = getAggregatedStats();
  const regionStats = getRegionStats(selectedRegion);
  const isFiltered = selectedRegion !== 'ALL';
  const regionLabel = isFiltered
    ? REGIONS[selectedRegion]?.name
    : 'All Regions';

  /**
   * Live platform totals, when the platform can supply them.
   *
   * This used to call the endpoint, throw the response away on success
   * ("can be merged into counters when backend is active"), swallow the failure
   * on error, and render a hard-coded `MODULES` array — QR 2,100,000 for
   * marketplace, QR 1,200,000 for grocery — under the heading "Real-time
   * platform overview". `GET /admin/dashboard` does not exist on the gateway
   * (404), so those figures were never anything but constants in this file, and
   * nothing on the screen said so.
   *
   * The numbers are now labelled for what they are until a real endpoint backs
   * them. Showing an admin invented revenue is worse than showing them nothing.
   */
  const [liveStats, setLiveStats] = useState<Record<string, unknown> | null>(null);
  const [statsUnavailable, setStatsUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminCoreApi.getDashboard();
        if (cancelled) return;
        if (res.success && res.data) {
          setLiveStats(res.data as Record<string, unknown>);
          setStatsUnavailable(false);
        } else {
          setStatsUnavailable(true);
        }
      } catch {
        if (!cancelled) setStatsUnavailable(true);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRegion]);

  // Filter activity by region
  const filteredActivity = isFiltered
    ? recentActivity.filter(a => a.region === selectedRegion || a.region === 'ALL')
    : recentActivity;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {statsUnavailable && !liveStats && (
        <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-amber-900">Module figures below are illustrative, not live</p>
          <p className="text-xs text-amber-700 mt-0.5">
            There is no platform totals endpoint yet (<code>GET /admin/dashboard</code> returns 404), so the
            order and revenue figures per module are placeholders. Each module&apos;s own section shows its real data.
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Dashboard</h1>
          <p className="text-slate-500 text-sm">
            Platform overview {isFiltered ? `for ${regionLabel}` : 'across all regions'}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> All Systems Operational
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-emerald-600" /> {regionLabel}
          </span>
        </div>
      </div>

      {/* Region Overview Cards (shown when ALL regions selected) */}
      {!isFiltered && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {regionStats.map(r => (
            <div key={r.code} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <CountryFlag code={r.code} size="lg" />
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{r.name}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Sellers</span>
                  <span className="font-bold text-slate-700">{r.activeSellers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Today</span>
                  <span className="font-bold text-slate-700">{r.todayOrders.toLocaleString()} orders</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Revenue</span>
                  <span className="font-bold text-emerald-600">{r.currency}{(r.todayRevenue / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white">
          <DollarSign className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">{formatCurrencyValue(stats.todayRevenue)}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Total GMV (Today)</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-90"><ArrowUpRight className="w-3.5 h-3.5" /> +18.2% vs yesterday</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between"><Users className="w-5 h-5 text-blue-500" /><span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> 12%</span></div>
          <p className="text-2xl font-black text-slate-900 mt-3">{(stats.totalCustomers / 1000).toFixed(1)}K</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Total Customers</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between"><Package className="w-5 h-5 text-indigo-500" /><span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> 24%</span></div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats.todayOrders.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Orders Today</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between"><Truck className="w-5 h-5 text-purple-500" /><span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> 8%</span></div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats.totalPartners.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Active Partners</p>
        </div>
      </div>

      {/* Today's Quick Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center"><p className="text-lg font-black text-slate-900">842</p><p className="text-[10px] text-slate-500 font-medium">Partners Online</p></div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center"><p className="text-lg font-black text-slate-900">24 min</p><p className="text-[10px] text-slate-500 font-medium">Avg Delivery</p></div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center"><p className="text-lg font-black text-slate-900">96.2%</p><p className="text-[10px] text-slate-500 font-medium">On-Time Rate</p></div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center"><p className="text-lg font-black text-slate-900">4.6</p><p className="text-[10px] text-slate-500 font-medium">Avg Rating</p></div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center"><p className="text-lg font-black text-red-600">12</p><p className="text-[10px] text-slate-500 font-medium">Pending KYC</p></div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-lg font-black text-slate-900">{isFiltered ? '1' : regionStats.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">{isFiltered ? 'Region' : 'Regions'}</p>
        </div>
      </div>

      {/* ── Commission Revenue Widget ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Commission Revenue</h2>
          </div>
          <Link href="/admin/commissions" className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1">View Details <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="p-5">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white">
              <p className="text-xs font-medium opacity-80">Today&apos;s Earnings</p>
              <p className="text-2xl font-black mt-1">₹1.82L</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold opacity-80"><ArrowUpRight className="w-3 h-3" /> +22% vs yesterday</div>
            </div>
            <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-4 rounded-xl text-white">
              <p className="text-xs font-medium opacity-80">This Week</p>
              <p className="text-2xl font-black mt-1">₹12.8L</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold opacity-80"><ArrowUpRight className="w-3 h-3" /> +8.4% growth</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500">This Month</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹48.5L</p>
              <p className="text-[10px] text-slate-400 mt-1">Target: ₹60L (80.8%)</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Avg Commission Rate</p>
              <p className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1"><Percent className="w-4 h-4 text-indigo-500" />11.4</p>
              <p className="text-[10px] text-slate-400 mt-1">Across all modules</p>
            </div>
          </div>

          {/* Module-wise Commission Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { module: 'Marketplace', earned: '₹4.2L', rate: '12%', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { module: 'Restaurant', earned: '₹3.1L', rate: '18%', color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { module: 'Grocery', earned: '₹1.8L', rate: '8%', color: 'bg-green-50 text-green-700 border-green-200' },
              { module: 'Pharmacy', earned: '₹0.6L', rate: '12%', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
              { module: 'Hotel', earned: '₹1.5L', rate: '15%', color: 'bg-rose-50 text-rose-700 border-rose-200' },
              { module: 'Doctor', earned: '₹0.3L', rate: '20%', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { module: 'Taxi', earned: '₹1.3L', rate: '20%', color: 'bg-amber-50 text-amber-700 border-amber-200' },
            ].map(m => (
              <div key={m.module} className={`${m.color} border rounded-xl p-3 text-center`}>
                <p className="text-[10px] font-bold opacity-70">{m.module}</p>
                <p className="text-sm font-black mt-1">{m.earned}</p>
                <p className="text-[10px] font-medium opacity-60 mt-0.5">@ {m.rate}</p>
              </div>
            ))}
          </div>

          {/* Fee Structure Summary */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div><p className="text-[10px] text-slate-400">Referral Fees</p><p className="text-sm font-bold text-slate-900">₹10.2L</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div><p className="text-[10px] text-slate-400">Closing Fees</p><p className="text-sm font-bold text-slate-900">₹0.85L</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div><p className="text-[10px] text-slate-400">GST Collected (18%)</p><p className="text-sm font-bold text-slate-900">₹1.99L</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <div><p className="text-[10px] text-slate-400">TDS Deducted (1%)</p><p className="text-sm font-bold text-slate-900">₹0.48L</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Orders Chart */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-4">Today&apos;s Order Volume {isFiltered ? `(${regionLabel})` : '(All Regions)'}</h3>
        <div className="flex items-end gap-2 h-32">
          {hourlyData.map((h, i) => (
            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500">{(h.orders / 1000).toFixed(1)}K</span>
              <div className={`w-full rounded-t-md transition-all duration-300 admin-bar ${h.orders === maxOrders ? 'admin-bar-peak' : 'admin-bar-default'}`}
                ref={el => { if (el) el.style.setProperty('--bar-h', `${(h.orders / maxOrders) * 100}%`); }} />
              <span className="text-[10px] font-medium text-slate-400">{h.hour}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Module Performance */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50"><h2 className="font-bold text-slate-900">Module Performance</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Module</th>
                  <th className="px-5 py-3 font-semibold text-right">Daily Orders</th>
                  <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                  <th className="px-5 py-3 font-semibold text-center">Status</th>
                  <th className="px-5 py-3 font-semibold text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map(m => (
                  <tr key={m.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${m.color}`}></span>{m.name}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-700">{m.orders.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatCurrencyValue(m.revenue)}</td>
                    <td className="px-5 py-3.5 text-center"><span className={`${m.statusBg} px-2 py-1 rounded text-xs font-bold border`}>{m.status}</span></td>
                    <td className="px-5 py-3.5 text-center"><Link href={m.href} className="text-emerald-600 hover:underline text-xs font-bold">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Center */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> Action Required</h2>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            <Link href="/admin/kyc-verification" className="block p-4 hover:bg-slate-50 transition-colors">
              <p className="font-bold text-slate-800 text-sm mb-1">12 Pending Store Approvals</p>
              <p className="text-xs text-slate-500">Grocery module has 12 unverified KYC applications.</p>
            </Link>
            <Link href="/admin/restaurant" className="block p-4 hover:bg-slate-50 transition-colors">
              <p className="font-bold text-slate-800 text-sm mb-1">High Refund Rate Alert</p>
              <p className="text-xs text-slate-500">Restaurant #RES-882 has 15% refund rate today.</p>
            </Link>
            <Link href="/admin/customers" className="block p-4 hover:bg-slate-50 transition-colors">
              <p className="font-bold text-slate-800 text-sm mb-1">4 Escalated Support Tickets</p>
              <p className="text-xs text-slate-500">Waiting for Super Admin resolution.</p>
            </Link>
            <Link href="/admin/regions" className="block p-4 hover:bg-slate-50 transition-colors">
              <p className="font-bold text-slate-800 text-sm mb-1">Regional Expansion Pending</p>
              <p className="text-xs text-slate-500">2 new regions awaiting configuration approval.</p>
            </Link>
          </div>
        </div>

      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Recent Activity</h2>
          <Link href="/admin/audit-logs" className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1">View All Logs <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredActivity.map((a, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <div className={`w-2 h-2 rounded-full ${activityColors[a.type]} shrink-0`}></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{a.action}</p>
                <p className="text-xs text-slate-500 truncate">{a.detail}</p>
              </div>
              {a.region !== 'ALL' && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                  <CountryFlag code={a.region} size="xs" /> {a.region}
                </span>
              )}
              <span className="text-xs text-slate-400 whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
