'use client';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap, Plus, Search, Calendar, Clock, TrendingUp, DollarSign, ShoppingBag,
  Eye, Edit2, Pause, Play, Trash2, CheckCircle, XCircle, BarChart3,
  Package, Users, ArrowRight, AlertTriangle, Star, Timer, Flame,
  ChevronDown, X, Save, Filter, ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DATA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

type DealStatus = 'active' | 'scheduled' | 'ended' | 'paused';
type NominationStatus = 'pending' | 'approved' | 'rejected' | 'live';

interface FlashDeal {
  id: string;
  name: string;
  products: number;
  discount: string;
  stockLimit: number;
  sold: number;
  revenue: number;
  orders: number;
  views: number;
  start: string;
  end: string;
  status: DealStatus;
  priority: number;
  createdBy: string;
  country: string;
}

interface SellerNomination {
  id: string;
  product: string;
  seller: string;
  sellerRating: number;
  category: string;
  originalPrice: number;
  proposedDiscount: string;
  stockAllocated: number;
  note: string;
  submittedAt: string;
  status: NominationStatus;
}

const DEALS: FlashDeal[] = [
  { id: 'FD-001', name: 'Smartphone Mega Sale', products: 24, discount: 'Up to 50%', stockLimit: 500, sold: 347, revenue: 4250000, orders: 347, views: 89400, start: '2026-06-21 06:00', end: '2026-06-21 18:00', status: 'active', priority: 1, createdBy: 'Admin', country: 'India' },
  { id: 'FD-002', name: 'Fashion Flash Friday', products: 48, discount: 'Up to 70%', stockLimit: 1200, sold: 892, revenue: 2180000, orders: 892, views: 124000, start: '2026-06-20 00:00', end: '2026-06-20 23:59', status: 'ended', priority: 2, createdBy: 'Admin', country: 'India' },
  { id: 'FD-003', name: 'Electronics Bonanza', products: 36, discount: 'Flat 40%', stockLimit: 800, sold: 0, revenue: 0, orders: 0, views: 0, start: '2026-06-22 10:00', end: '2026-06-22 22:00', status: 'scheduled', priority: 1, createdBy: 'Admin', country: 'India' },
  { id: 'FD-004', name: 'Home & Kitchen Deals', products: 18, discount: 'Up to 60%', stockLimit: 300, sold: 156, revenue: 980000, orders: 156, views: 34500, start: '2026-06-21 00:00', end: '2026-06-21 12:00', status: 'active', priority: 3, createdBy: 'Admin', country: 'India' },
  { id: 'FD-005', name: 'Beauty Box Sale', products: 15, discount: '30% Off', stockLimit: 200, sold: 200, revenue: 540000, orders: 200, views: 45200, start: '2026-06-19 12:00', end: '2026-06-19 23:59', status: 'ended', priority: 4, createdBy: 'Admin', country: 'UAE' },
  { id: 'FD-006', name: 'Sports Gear Rush', products: 22, discount: 'Up to 55%', stockLimit: 400, sold: 0, revenue: 0, orders: 0, views: 0, start: '2026-06-23 08:00', end: '2026-06-23 20:00', status: 'scheduled', priority: 2, createdBy: 'Admin', country: 'India' },
  { id: 'FD-007', name: 'Weekend Laptop Deals', products: 8, discount: 'Flat ₹8,000 Off', stockLimit: 100, sold: 42, revenue: 3360000, orders: 42, views: 28900, start: '2026-06-21 06:00', end: '2026-06-22 06:00', status: 'active', priority: 1, createdBy: 'Seller Nom.', country: 'India' },
  { id: 'FD-008', name: 'Toy Clearance', products: 30, discount: 'Up to 80%', stockLimit: 600, sold: 580, revenue: 290000, orders: 580, views: 67800, start: '2026-06-18 00:00', end: '2026-06-19 00:00', status: 'ended', priority: 5, createdBy: 'Admin', country: 'UAE' },
];

const NOMINATIONS: SellerNomination[] = [
  { id: 'NOM-001', product: 'Samsung Galaxy S24 Ultra', seller: 'Samsung Official', sellerRating: 4.8, category: 'Electronics', originalPrice: 129999, proposedDiscount: '25% Off', stockAllocated: 50, note: 'New launch promotion, exclusive stock allocated', submittedAt: '2026-06-20', status: 'pending' },
  { id: 'NOM-002', product: 'Nike Air Max 270', seller: 'Nike India Store', sellerRating: 4.7, category: 'Fashion', originalPrice: 12995, proposedDiscount: '40% Off', stockAllocated: 200, note: 'End of season clearance', submittedAt: '2026-06-19', status: 'pending' },
  { id: 'NOM-003', product: 'Dyson V15 Detect', seller: 'Dyson India', sellerRating: 4.9, category: 'Appliances', originalPrice: 62900, proposedDiscount: '20% Off', stockAllocated: 30, note: 'Festival deal preparation', submittedAt: '2026-06-20', status: 'pending' },
  { id: 'NOM-004', product: 'Sony WH-1000XM5', seller: 'Sony Store', sellerRating: 4.6, category: 'Electronics', originalPrice: 29990, proposedDiscount: '35% Off', stockAllocated: 100, note: 'Competitor price match + extra discount', submittedAt: '2026-06-18', status: 'approved' },
  { id: 'NOM-005', product: 'Levi\'s 501 Original Jeans', seller: 'Levi\'s Official', sellerRating: 4.5, category: 'Fashion', originalPrice: 4999, proposedDiscount: '50% Off', stockAllocated: 500, note: 'Monsoon season push', submittedAt: '2026-06-17', status: 'approved' },
  { id: 'NOM-006', product: 'Generic Bluetooth Speaker', seller: 'QuickSell Electronics', sellerRating: 3.2, category: 'Electronics', originalPrice: 1299, proposedDiscount: '70% Off', stockAllocated: 1000, note: '', submittedAt: '2026-06-20', status: 'rejected' },
  { id: 'NOM-007', product: 'Apple AirPods Pro 2', seller: 'Apple Premium Store', sellerRating: 4.9, category: 'Electronics', originalPrice: 24900, proposedDiscount: '15% Off', stockAllocated: 80, note: 'Limited stock, high demand product', submittedAt: '2026-06-21', status: 'pending' },
  { id: 'NOM-008', product: 'Bosch 7kg Washing Machine', seller: 'Bosch Home', sellerRating: 4.4, category: 'Appliances', originalPrice: 32990, proposedDiscount: '30% Off', stockAllocated: 40, note: 'Exchange offer compatible', submittedAt: '2026-06-21', status: 'pending' },
];

const HOURLY_DATA = [
  { hour: '6AM', sales: 12400 }, { hour: '7AM', sales: 28900 }, { hour: '8AM', sales: 45200 },
  { hour: '9AM', sales: 67800 }, { hour: '10AM', sales: 89400 }, { hour: '11AM', sales: 124000 },
  { hour: '12PM', sales: 156000 }, { hour: '1PM', sales: 134000 }, { hour: '2PM', sales: 98000 },
  { hour: '3PM', sales: 112000 }, { hour: '4PM', sales: 145000 }, { hour: '5PM', sales: 167000 },
];

// ── Styles ───────────────────────────────────────────────────────────────

const DEAL_STATUS: Record<DealStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Scheduled' },
  ended: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Ended' },
  paused: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Paused' },
};

const NOM_STATUS: Record<NominationStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Review' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600', label: 'Rejected' },
  live: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Live' },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function FlashDealsPage() {
  const [activeTab, setActiveTab] = useState<'deals' | 'create' | 'nominations' | 'analytics'>('deals');
  const [deals, setDeals] = useState(DEALS);
  const [nominations, setNominations] = useState(NOMINATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getFlashDeals(),
    []
  );
  const { data: nomApiData } = useAdminData(
    () => adminMarketplaceApi.getNominations(),
    []
  );
  const { execute } = useAdminAction(showToast);

  // Sync API data into local state
  useEffect(() => {
    if (apiData?.data && Array.isArray(apiData.data) && apiData.data.length > 0) {
      setDeals(apiData.data);
    }
  }, [apiData]);

  useEffect(() => {
    if (nomApiData?.data && Array.isArray(nomApiData.data) && nomApiData.data.length > 0) {
      setNominations(nomApiData.data);
    }
  }, [nomApiData]);

  // Region filtering
  const { filtered: regionFilteredDeals, regionLabel, isFiltered: isRegionFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(deals);

  // ── KPIs (region-aware) ─────────────────────────────────────────────
  const activeDeals = regionFilteredDeals.filter(d => d.status === 'active');
  const totalRevenue = regionFilteredDeals.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = regionFilteredDeals.reduce((s, d) => s + d.orders, 0);
  const totalSold = regionFilteredDeals.reduce((s, d) => s + d.sold, 0);
  const pendingNoms = nominations.filter(n => n.status === 'pending').length;

  const TABS = [
    { id: 'deals' as const, label: 'Active & Scheduled', icon: Zap, count: regionFilteredDeals.filter(d => ['active', 'scheduled'].includes(d.status)).length },
    { id: 'create' as const, label: 'Create Deal', icon: Plus },
    { id: 'nominations' as const, label: 'Seller Nominations', icon: Users, count: pendingNoms },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-red-500 fill-red-500" /> Flash Deals Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">{isRegionFiltered ? `${regionLabel} — ` : ''}Create, schedule, monitor flash deals and approve seller nominations</p>
        </div>
        <button onClick={() => setActiveTab('create')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> Create Flash Deal
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Deals', value: activeDeals.length, icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Total Revenue', value: formatCurrencyValue(totalRevenue, { compact: true }), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Units Sold', value: totalSold.toLocaleString(), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Total Orders', value: totalOrders.toLocaleString(), icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Pending Nominations', value: pendingNoms, icon: Users, color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${kpi.bg}`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Active & Scheduled Deals ─────────────────────────────── */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" aria-label="Status filter">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold">Deal</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Products</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Discount</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Stock Progress</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Duration</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionFilteredDeals
                  .filter(d => statusFilter === 'all' || d.status === statusFilter)
                  .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))
                  .map(deal => {
                    const pct = deal.stockLimit > 0 ? Math.round((deal.sold / deal.stockLimit) * 100) : 0;
                    const s = DEAL_STATUS[deal.status];
                    return (
                      <tr key={deal.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{deal.name}</p>
                          <p className="text-xs text-slate-400">{deal.id} · {deal.createdBy}</p>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700">{deal.products}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-lg">{deal.discount}</span>
                        </td>
                        <td className="px-4 py-4 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'} w-[--bar-w]`}
                                /* @ts-ignore */ {...{ style: { '--bar-w': `${Math.min(pct, 100)}%` } as React.CSSProperties }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{deal.sold}/{deal.stockLimit}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{pct}% sold</p>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-slate-900">{formatCurrencyValue(deal.revenue, { compact: true })}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          <p>{deal.start}</p>
                          <p className="text-slate-400">to {deal.end}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit"><Edit2 className="w-3.5 h-3.5 text-blue-500" /></button>
                            {deal.status === 'active' && <button onClick={() => setDeals(d => d.map(x => x.id === deal.id ? { ...x, status: 'paused' as DealStatus } : x))} className="p-1.5 hover:bg-amber-50 rounded-lg" title="Pause"><Pause className="w-3.5 h-3.5 text-amber-500" /></button>}
                            {deal.status === 'paused' && <button onClick={() => setDeals(d => d.map(x => x.id === deal.id ? { ...x, status: 'active' as DealStatus } : x))} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Resume"><Play className="w-3.5 h-3.5 text-emerald-500" /></button>}
                            {deal.status === 'scheduled' && <button onClick={() => setDeals(d => d.filter(x => x.id !== deal.id))} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Create Flash Deal ─────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="max-w-3xl">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-linear-to-r from-red-600 to-rose-600 px-6 py-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2"><Zap className="w-5 h-5 fill-white" /> Create Flash Deal</h2>
              <p className="text-sm text-red-100 mt-0.5">Set up a new time-limited flash deal for the marketplace</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="deal-name">Deal Name *</label>
                  <input id="deal-name" placeholder="e.g. Smartphone Mega Sale" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="priority">Priority</label>
                  <select id="priority" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none bg-white" aria-label="Priority">
                    <option value="1">🔴 High — Top placement</option>
                    <option value="2">🟡 Medium — Standard</option>
                    <option value="3">🟢 Low — Below others</option>
                  </select>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Schedule</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="start-date-time">Start Date & Time</label>
                    <input id="start-date-time" type="datetime-local" aria-label="Start date and time" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="end-date-time">End Date & Time</label>
                    <input id="end-date-time" type="datetime-local" aria-label="End date and time" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Discount</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="type">Type</label>
                    <select id="type" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none bg-white" aria-label="Discount type">
                      <option>Percentage Off</option>
                      <option>Flat Amount Off</option>
                      <option>Up to X% Off</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="value">Value</label>
                    <input id="value" type="number" placeholder="e.g. 50" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="max-discount-cap">Max Discount Cap (₹)</label>
                    <input id="max-discount-cap" type="number" placeholder="e.g. 5000" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Product Source</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="source">Source</label>
                    <select id="source" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none bg-white" aria-label="Product source">
                      <option>Select from catalog</option>
                      <option>From seller nominations</option>
                      <option>Specific category</option>
                      <option>All eligible products</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="category-filter">Category Filter</label>
                    <select id="category-filter" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none bg-white" aria-label="Category">
                      <option>All Categories</option>
                      <option>Electronics</option>
                      <option>Fashion</option>
                      <option>Home & Kitchen</option>
                      <option>Beauty</option>
                      <option>Sports</option>
                      <option>Appliances</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Stock Limit */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Stock Management</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="total-stock-limit">Total Stock Limit</label>
                    <input id="total-stock-limit" type="number" placeholder="e.g. 500" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block" htmlFor="max-per-customer">Max Per Customer</label>
                    <input id="max-per-customer" type="number" placeholder="e.g. 2" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                </div>
              </div>

              {/* Placement */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Placement</label>
                <div className="flex gap-3 flex-wrap">
                  {['Homepage Flash Deals', 'Category Page Banner', 'Push Notification', 'Email Campaign'].map(p => (
                    <label key={p} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:border-red-300 transition-colors">
                      <input type="checkbox" defaultChecked={p === 'Homepage Flash Deals'} className="rounded border-slate-300 text-red-600 focus:ring-red-500"  aria-label="checkbox"/>
                      <span className="text-xs font-medium text-slate-700">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setActiveTab('deals')} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Save className="w-4 h-4" /> Create & Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Seller Nominations ────────────────────────────────────── */}
      {activeTab === 'nominations' && (
        <div className="space-y-4">
          {/* Pending Alert */}
          {pendingNoms > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">{pendingNoms} nomination{pendingNoms > 1 ? 's' : ''} pending review</p>
                <p className="text-xs text-amber-600">Sellers have nominated products for upcoming flash deals. Review and approve to include them.</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold">Product</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Seller</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Original Price</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Proposed Discount</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Stock</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nominations.map(nom => {
                  const ns = NOM_STATUS[nom.status];
                  return (
                    <tr key={nom.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{nom.product}</p>
                        <p className="text-xs text-slate-400">{nom.id} · {nom.category}</p>
                        {nom.note && <p className="text-[10px] text-slate-400 mt-1 italic">"{nom.note}"</p>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-700">{nom.seller}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-slate-600">{nom.sellerRating}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">₹{nom.originalPrice.toLocaleString()}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-lg">{nom.proposedDiscount}</span>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-700">{nom.stockAllocated}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ns.bg} ${ns.text}`}>{ns.label}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {nom.status === 'pending' && (
                            <>
                              <button onClick={() => execute(
                                () => adminMarketplaceApi.approveNomination(nom.id),
                                'Nomination approved',
                                () => setNominations(n => n.map(x => x.id === nom.id ? { ...x, status: 'approved' as NominationStatus } : x)),
                              )} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg" title="Approve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => setShowRejectModal(nom.id)} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: Analytics Dashboard ───────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Discount Given', value: '38%', change: '+5%', up: true, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Conversion Rate', value: '4.2%', change: '+0.8%', up: true, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Avg Order Value', value: '₹8,450', change: '-₹320', up: false, icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: 'Stock Depletion Rate', value: '72%', change: '+12%', up: true, icon: Package, color: 'text-red-500', bg: 'bg-red-50' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Hourly Sales Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> Hourly Sales Today</h3>
            <div className="flex items-end gap-2 h-48">
              {HOURLY_DATA.map(d => {
                const max = Math.max(...HOURLY_DATA.map(x => x.sales));
                const pct = (d.sales / max) * 100;
                return (
                  <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500">₹{(d.sales / 1000).toFixed(0)}K</span>
                    <div className="w-full bg-slate-100 rounded-t-md relative h-[140px]">
                      <div
                        className="absolute bottom-0 w-full bg-linear-to-t from-blue-600 to-blue-400 rounded-t-md transition-all h-[--bar-h]" 
                        /* @ts-ignore */ {...{ style: { '--bar-h': `${pct}%` } as React.CSSProperties }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">{d.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performing Deals */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Flame className="w-5 h-5 text-red-500" /> Top Performing Deals</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Deal</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-center font-semibold">Orders</th>
                  <th className="px-4 py-3 text-center font-semibold">Views</th>
                  <th className="px-4 py-3 text-left font-semibold">Stock Depletion</th>
                  <th className="px-4 py-3 text-center font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals
                  .filter(d => d.revenue > 0)
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map((deal, i) => {
                    const pct = deal.stockLimit > 0 ? Math.round((deal.sold / deal.stockLimit) * 100) : 0;
                    const conversionRate = deal.views > 0 ? ((deal.orders / deal.views) * 100).toFixed(1) : '0';
                    return (
                      <tr key={deal.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                            <div>
                              <p className="font-bold text-slate-900">{deal.name}</p>
                              <p className="text-xs text-slate-400">{deal.discount}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-700">₹{(deal.revenue / 100000).toFixed(1)}L</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">{deal.orders}</td>
                        <td className="px-4 py-3.5 text-center text-slate-600">{(deal.views / 1000).toFixed(1)}K</td>
                        <td className="px-4 py-3.5 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-blue-500'} w-[--bar-w]`} /* @ts-ignore */ {...{ style: { '--bar-w': `${pct}%` } as React.CSSProperties }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-blue-600">{conversionRate}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reject Nomination Modal ──────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-2">Reject Nomination</h3>
            <p className="text-sm text-slate-500 mb-4">Select a reason for rejecting this product nomination.</p>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none" aria-label="Rejection reason">
              <option>Discount too aggressive — may affect brand value</option>
              <option>Product quality concerns</option>
              <option>Seller rating below minimum threshold</option>
              <option>Insufficient stock allocation</option>
              <option>Product not eligible for flash deals</option>
              <option>Duplicate nomination</option>
              <option>Other</option>
            </select>
            <textarea placeholder="Additional notes for the seller..." rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button
                onClick={() => {
                  execute(
                    () => adminMarketplaceApi.rejectNomination(showRejectModal!, 'Does not meet flash deal criteria'),
                    'Nomination rejected',
                    () => setNominations(n => n.map(x => x.id === showRejectModal ? { ...x, status: 'rejected' as NominationStatus } : x)),
                  );
                  setShowRejectModal(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >Reject Nomination</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}