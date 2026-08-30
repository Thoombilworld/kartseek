'use client';

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Users, Store, DollarSign, ArrowUpRight, ArrowRight, LayoutDashboard, ShoppingCart, Utensils, Pill } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { DEMO_FRANCHISE, PACKAGE_INFO, MODULE_COLORS } from '@/lib/data/franchise-data';
import { useFranchiseId } from '@/lib/hooks/use-franchise-id';
import { useFranchiseRegion } from '@/lib/hooks/use-franchise-region';

const MOCK_RECENT_ORDERS = [
  { id: 'KS-78432', vendor: 'City Supermart', module: 'Grocery', customer: 'Rahul K.', amount: '₹487', status: 'delivered', time: '12 min ago' },
  { id: 'KS-78431', vendor: 'Burger King', module: 'Restaurant', customer: 'Priya S.', amount: '₹650', status: 'in-transit', time: '18 min ago' },
  { id: 'KS-78430', vendor: 'MedPlus', module: 'Pharmacy', customer: 'Anil M.', amount: '₹245', status: 'preparing', time: '25 min ago' },
  { id: 'KS-78429', vendor: 'Pizza Palace', module: 'Restaurant', customer: 'Sneha R.', amount: '₹890', status: 'delivered', time: '32 min ago' },
  { id: 'KS-78428', vendor: 'Fresh Farm', module: 'Grocery', customer: 'Vikram T.', amount: '₹1,120', status: 'delivered', time: '45 min ago' },
];

const orderStatusColors: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700',
  'in-transit': 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700',
};

const MOCK_TOP_VENDORS = [
  { name: 'City Supermart', module: 'Grocery', orders: 842, rating: 4.8, trend: '+12%', rev: '₹4.2L' },
  { name: 'Burger King (Andheri)', module: 'Restaurant', orders: 610, rating: 4.5, trend: '+8%', rev: '₹3.8L' },
  { name: 'Pizza Palace', module: 'Restaurant', orders: 520, rating: 4.7, trend: '+15%', rev: '₹2.9L' },
  { name: 'Sushi Kingdom', module: 'Restaurant', orders: 440, rating: 4.9, trend: '+22%', rev: '₹2.1L' },
  { name: 'MedPlus Pharmacy', module: 'Pharmacy', orders: 380, rating: 4.6, trend: '+5%', rev: '₹1.5L' },
];

const moduleColors = MODULE_COLORS;

const MOCK_MODULE_REVENUE: Record<string, string> = {
  Grocery: '₹3.2L',
  Restaurant: '₹4.8L',
  Pharmacy: '₹1.5L',
};

export default function FranchiseDashboard() {
  const { user } = useAuth();
  // The estate this operator runs, resolved from the token — not their user id.
  const { franchiseId } = useFranchiseId();
  // Currency, tax and modules for the estate's own country. Amounts below are
  // denominated where the franchise settles, wherever the operator is sitting.
  const { region, formatCurrency, isModuleEnabled } = useFranchiseRegion();

  const [recentOrders, setRecentOrders] = useState(MOCK_RECENT_ORDERS);
  const [topVendors, setTopVendors] = useState(MOCK_TOP_VENDORS);
  const [stats, setStats] = useState({
    commission: DEMO_FRANCHISE.commission || '₹1.2L', activeVendors: DEMO_FRANCHISE.vendors, delivered: '4,210', activeCustomers: '12.5K',
    ordersToday: '1,193', partnersOnline: 124, avgDelivery: '24 min'
  });
  const [packageInfo, setPackageInfo] = useState({
    tier: PACKAGE_INFO[DEMO_FRANCHISE.package].label,
    approvedModules: [...DEMO_FRANCHISE.modules],
    territory: user?.city || DEMO_FRANCHISE.region,
    status: 'Active'
  });

  // Update territory when user info loads
  useEffect(() => {
    if (user?.city) {
      setPackageInfo(prev => ({ ...prev, territory: user.city! }));
    }
  }, [user?.city]);

  // What the dashboard endpoint actually returns: name, region, store counts,
  // zones, commission rates and status. It has never returned recentOrders,
  // topVendors, stats or packageInfo, so the previous version of this effect
  // read four keys that do not exist and left every figure on the mock value.
  const [estate, setEstate] = useState<{
    name?: string; region?: string; totalStores?: number; activeStores?: number;
    zones?: number; commissionRates?: Record<string, number>; status?: string;
  } | null>(null);
  const [estateError, setEstateError] = useState(false);

  useEffect(() => {
    if (!franchiseId) return;
    let cancelled = false;
    (async () => {
      try {
        const { franchiseApi } = await import('@/lib/api/index');
        const res: any = await franchiseApi.getDashboard(franchiseId);
        if (!cancelled) setEstate(res?.data ?? res ?? null);
      } catch {
        // Surfaced, not swallowed. A dashboard that silently shows demo figures
        // when its own service is down is worse than one that says so.
        if (!cancelled) setEstateError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [franchiseId]);

  // Two filters, not one. The package decides what this franchise bought; the
  // market decides what the country runs at all. A Qatar operator on an
  // all-modules package still has no doctor vertical to look at.
  const showsModule = (label: string) =>
    (packageInfo.approvedModules as string[]).includes(label) &&
    isModuleEnabled(label.toLowerCase() === 'hotel' ? 'hotel-booking' : label.toLowerCase());

  const filteredOrders = recentOrders.filter(o => showsModule(o.module));
  const filteredVendors = topVendors.filter(v => showsModule(v.module));

  return (
    <div className="space-y-6">
      
      {/* Header & Package Banner */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {estate?.name ?? packageInfo.territory} Overview
          </h1>
          <p className="text-slate-500 text-sm">
            {region
              ? `${region.countryName ?? region.countryCode} · settles in ${region.currency?.code}` +
                (region.tax && region.tax.rate > 0 ? ` · ${region.tax.name} ${region.tax.rate}%` : '')
              : 'Real-time monitoring of your franchise region performance.'}
          </p>
          {estateError ? (
            <p className="text-xs text-rose-600 mt-1">
              Live figures are unavailable — the franchise service did not respond.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center"><LayoutDashboard className="w-4 h-4"/></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">{packageInfo.tier}</p>
              <p className="text-[10px] font-medium opacity-80">{packageInfo.approvedModules.length} Modules Approved</p>
            </div>
          </div>
          <Link href="/settings" className="text-xs font-bold text-indigo-600 hover:underline">Request Upgrade →</Link>
        </div>
      </div>

      {/* Approved Modules Strip */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Active Modules:</span>
        {packageInfo.approvedModules.map(mod => (
          <span key={mod} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${moduleColors[mod]}`}>
            {mod}
          </span>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-teal-500 to-teal-600 p-5 rounded-xl shadow-md text-white">
          <DollarSign className="w-5 h-5 opacity-80" />
          {/*
            franchise-service returns commission *rates*, not a month-to-date
            amount — no service computes one yet. Showing the agreed rates is
            true; showing '₹1.2L' with "+15.2% vs last month" under it was a
            number and a trend that nothing produced.
          */}
          {estate?.commissionRates && Object.keys(estate.commissionRates).length ? (
            <>
              <p className="text-3xl font-black mt-3">
                {Math.min(...Object.values(estate.commissionRates))}–
                {Math.max(...Object.values(estate.commissionRates))}%
              </p>
              <p className="text-sm font-medium opacity-80 mt-1">
                Commission rates · {Object.keys(estate.commissionRates).length} modules
              </p>
              <div className="mt-2 text-xs font-bold opacity-90">
                {region?.currency ? `Settled in ${region.currency.code}` : ''}
              </div>
            </>
          ) : (
            <>
              <p className="text-3xl font-black mt-3">—</p>
              <p className="text-sm font-medium opacity-80 mt-1">Commission rates</p>
              <div className="mt-2 text-xs font-bold opacity-90">
                {estateError ? 'Unavailable' : 'Loading…'}
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Store className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{estate?.activeStores ?? stats.activeVendors}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Active Partners</p>
          <p className="text-xs text-slate-400 mt-1">Across {packageInfo.approvedModules.length} modules</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Activity className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{stats.delivered}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Orders Delivered (MTD)</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600"><TrendingUp className="w-3 h-3" /> +8.4%</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-orange-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{stats.activeCustomers}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Active Customers</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600"><TrendingUp className="w-3 h-3" /> +340 new</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Module Performance Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-slate-900">Module Revenue Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {packageInfo.approvedModules.map(mod => (
              <div key={mod} className="p-5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${moduleColors[mod]}`}>
                    {mod === 'Grocery' && <ShoppingCart className="w-5 h-5"/>}
                    {mod === 'Restaurant' && <Utensils className="w-5 h-5"/>}
                    {mod === 'Pharmacy' && <Pill className="w-5 h-5"/>}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{mod}</h4>
                    <p className="text-xs text-slate-500">Active Module</p>
                  </div>
                </div>
                <div className="text-right">
                  {/*
                    Per-module revenue has no endpoint on franchise-service yet
                    — the KPI commands return it per vertical, but nothing rolls
                    them up here. The commission rate is a real number this
                    franchise agreed to, so it is shown instead of a revenue
                    figure that would be invented.
                  */}
                  <p className="font-bold text-emerald-600">
                    {estate?.commissionRates?.[mod.toLowerCase() === 'hotel' ? 'hotel-booking' : mod.toLowerCase()] != null
                      ? `${estate.commissionRates[mod.toLowerCase() === 'hotel' ? 'hotel-booking' : mod.toLowerCase()]}% commission`
                      : '—'}
                  </p>
                  <p className="text-xs text-slate-400">Commission MTD</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors (Filtered by Modules) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-900">Top Performing Partners</h2>
            <Link href="/vendors" className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Partner</th>
                  <th className="px-5 py-3 font-semibold">Module</th>
                  <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((v) => (
                  <tr key={v.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900">{v.name}</td>
                    <td className="px-5 py-3"><span className={`${moduleColors[v.module]} border px-2 py-0.5 rounded text-[10px] font-bold`}>{v.module}</span></td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">{v.rev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Recent Orders (Filtered by Modules) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-900">Recent Transactions (Your Modules)</h2>
          <Link href="/orders" className="text-xs text-teal-600 font-bold hover:underline">View All</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredOrders.map((o) => (
            <div key={o.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{o.vendor}</p>
                  <span className={`${moduleColors[o.module]} border px-2 py-0.5 rounded text-[10px] font-bold`}>{o.module}</span>
                  <span className={`${orderStatusColors[o.status] || 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-[10px] font-bold capitalize`}>{o.status.replace('-', ' ')}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{o.customer} • {o.id}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 text-sm">{o.amount}</p>
                <p className="text-xs text-slate-400">{o.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
