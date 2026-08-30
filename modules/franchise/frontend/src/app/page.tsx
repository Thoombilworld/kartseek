'use client';

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Users, Store, DollarSign, ArrowUpRight, ArrowRight, LayoutDashboard, ShoppingCart, Utensils, Pill } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { DEMO_FRANCHISE, PACKAGE_INFO, MODULE_COLORS } from '@/lib/data/franchise-data';

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

  // Fetch dashboard data (falls back to mock)
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { franchiseApi } = await import('@/lib/api/index');
        const res: any = await franchiseApi.getDashboard(user?.id || 'FR-1001');
        if (res?.data) {
          if (res.data.recentOrders) setRecentOrders(res.data.recentOrders);
          if (res.data.topVendors) setTopVendors(res.data.topVendors);
          if (res.data.stats) setStats(prev => ({ ...prev, ...res.data.stats }));
          if (res.data.packageInfo) setPackageInfo(prev => ({ ...prev, ...res.data.packageInfo }));
        }
      } catch {
        // Using fallback mock data — no action needed
      }
    }
    fetchDashboard();
  }, [user?.id]);

  // Filter UI based on approved modules to ensure strict multi-tenancy rules
  const filteredOrders = recentOrders.filter(o => (packageInfo.approvedModules as string[]).includes(o.module));
  const filteredVendors = topVendors.filter(v => (packageInfo.approvedModules as string[]).includes(v.module));

  return (
    <div className="space-y-6">
      
      {/* Header & Package Banner */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{packageInfo.territory} Overview</h1>
          <p className="text-slate-500 text-sm">Real-time monitoring of your franchise region performance.</p>
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
          <p className="text-3xl font-black mt-3">{stats.commission}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Total Commission (MTD)</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-90"><ArrowUpRight className="w-3.5 h-3.5" /> +15.2% vs last month</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Store className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{stats.activeVendors}</p>
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
                  <p className="font-bold text-emerald-600">{MOCK_MODULE_REVENUE[mod] || '₹0'}</p>
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
