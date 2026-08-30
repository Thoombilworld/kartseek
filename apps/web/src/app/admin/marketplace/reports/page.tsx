'use client';

import React, { useState } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
  Download, Calendar, ChevronDown, ArrowUpRight, ArrowDownRight, Store,
  Star, Tag, Percent, Globe, Filter,
} from 'lucide-react';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';


// â”€â”€ Demo Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REVENUE_DATA = [
  { month: 'Jan', revenue: 42, orders: 8420, gmv: 68 },
  { month: 'Feb', revenue: 48, orders: 9100, gmv: 74 },
  { month: 'Mar', revenue: 55, orders: 10800, gmv: 86 },
  { month: 'Apr', revenue: 51, orders: 9900, gmv: 80 },
  { month: 'May', revenue: 62, orders: 12400, gmv: 98 },
  { month: 'Jun', revenue: 71, orders: 14200, gmv: 112 },
];

const TOP_SELLERS = [
  { name: 'Apple India Store', revenue: 'â‚¹8.2Cr', orders: 4200, growth: 12.5, rating: 4.9 },
  { name: 'Samsung Official', revenue: 'â‚¹5.8Cr', orders: 3100, growth: 8.3, rating: 4.7 },
  { name: 'Nike India', revenue: 'â‚¹3.4Cr', orders: 5600, growth: 22.1, rating: 4.8 },
  { name: 'Lakme Beauty', revenue: 'â‚¹2.1Cr', orders: 8400, growth: 15.7, rating: 4.6 },
  { name: 'Lenovo India', revenue: 'â‚¹1.9Cr', orders: 2800, growth: -3.2, rating: 4.5 },
];

const TOP_CATEGORIES = [
  { name: 'Mobiles & Tablets', revenue: 'â‚¹12.4Cr', orders: 18200, share: 28, growth: 15.2 },
  { name: 'Electronics', revenue: 'â‚¹8.6Cr', orders: 12400, share: 19, growth: 8.1 },
  { name: 'Fashion', revenue: 'â‚¹6.2Cr', orders: 24600, share: 14, growth: 22.5 },
  { name: 'Beauty & Personal Care', revenue: 'â‚¹4.8Cr', orders: 16800, share: 11, growth: 18.3 },
  { name: 'Home & Kitchen', revenue: 'â‚¹3.9Cr', orders: 9200, share: 9, growth: 5.7 },
  { name: 'Appliances', revenue: 'â‚¹2.8Cr', orders: 4100, share: 6, growth: -1.2 },
  { name: 'Furniture', revenue: 'â‚¹2.1Cr', orders: 3200, share: 5, growth: 12.4 },
  { name: 'Others', revenue: 'â‚¹3.6Cr', orders: 11500, share: 8, growth: 9.8 },
];

const COUNTRY_DATA = [
  { country: 'India', code: 'IN', flag: 'ðŸ‡®ðŸ‡³', revenue: 'â‚¹28.4Cr', orders: 68400, sellers: 1840, growth: 18.2 },
  { country: 'UAE', code: 'AE', flag: 'ðŸ‡¦ðŸ‡ª', revenue: 'AED 12.1M', orders: 22100, sellers: 620, growth: 24.5 },
  { country: 'Saudi Arabia', code: 'SA', flag: 'ðŸ‡¸ðŸ‡¦', revenue: 'SAR 8.4M', orders: 15200, sellers: 380, growth: 31.2 },
  { country: 'United Kingdom', code: 'GB', flag: 'ðŸ‡¬ðŸ‡§', revenue: 'Â£4.2M', orders: 9800, sellers: 290, growth: 12.8 },
  { country: 'Qatar', code: 'QA', flag: 'ðŸ‡¶ðŸ‡¦', revenue: 'QAR 3.8M', orders: 5100, sellers: 110, growth: 42.1 },
];

const TAX_SUMMARY = [
  { type: 'GST (India)', collected: 'â‚¹4.28Cr', pending: 'â‚¹1.2Cr', filed: 'Q1 2026', status: 'filed' },
  { type: 'VAT (UAE)', collected: 'AED 604K', pending: 'AED 180K', filed: 'May 2026', status: 'filed' },
  { type: 'VAT (SA)', collected: 'SAR 1.26M', pending: 'SAR 420K', filed: 'Q1 2026', status: 'pending' },
  { type: 'VAT (UK)', collected: 'Â£840K', pending: 'Â£210K', filed: 'Q1 2026', status: 'filed' },
];

const CAMPAIGNS = [
  { name: 'Summer Sale 2026', impressions: '2.4M', clicks: '180K', revenue: 'â‚¹4.8Cr', roas: 8.2, status: 'active' },
  { name: 'Flash Friday', impressions: '1.1M', clicks: '92K', revenue: 'â‚¹2.1Cr', roas: 6.5, status: 'completed' },
  { name: 'New User Coupon', impressions: '800K', clicks: '45K', revenue: 'â‚¹89L', roas: 4.8, status: 'active' },
  { name: 'Festive Bonanza', impressions: '3.2M', clicks: '240K', revenue: 'â‚¹6.2Cr', roas: 9.1, status: 'completed' },
];

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ReportsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState<'revenue' | 'sellers' | 'categories' | 'countries' | 'tax' | 'campaigns'>('revenue');

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getReports(),
    []
  );
  const { execute } = useAdminAction(showToast);

  const tabs = [
    { key: 'revenue', label: 'Revenue & Orders', icon: DollarSign },
    { key: 'sellers', label: 'Seller Growth', icon: Store },
    { key: 'categories', label: 'Category Performance', icon: Package },
    { key: 'countries', label: 'Country Breakdown', icon: Globe },
    { key: 'tax', label: 'Tax Reports', icon: Percent },
    { key: 'campaigns', label: 'Campaign ROI', icon: Tag },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Marketplace Reports</h1>
          <p className="text-slate-500 text-sm mt-1">{isFiltered ? `${regionLabel} â€” ` : ""}Revenue, seller growth, category, tax, and campaign performance reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-white border border-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none" aria-label="Time period">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter</option>
            <option value="365d">Last Year</option>
          </select>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: 'â‚¹44.4Cr', change: '+18.2%', up: true, icon: DollarSign, color: 'text-emerald-500' },
          { label: 'Total Orders', value: '120.8K', change: '+12.5%', up: true, icon: ShoppingCart, color: 'text-blue-500' },
          { label: 'Active Sellers', value: '3,240', change: '+8.7%', up: true, icon: Store, color: 'text-purple-500' },
          { label: 'Avg Order Value', value: 'â‚¹3,678', change: '-2.1%', up: false, icon: TrendingUp, color: 'text-amber-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              <span className={`text-xs font-bold flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{kpi.change}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Revenue & Orders */}
        {activeTab === 'revenue' && (
          <div>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Monthly Revenue & GMV Trend</h3>
              <p className="text-xs text-slate-500 mt-1">Revenue in â‚¹ Lakhs | GMV includes pre-discount values</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-6 gap-3 mb-6">
                {REVENUE_DATA.map(d => (
                  <div key={d.month} className="text-center">
                    <div className="flex items-end justify-center gap-1 h-32 mb-2">
                      <div className="w-5 bg-blue-500 rounded-t" style={{ height: `${(d.revenue / 80) * 100}%` }} title={`Revenue: â‚¹${d.revenue}L`} />
                      <div className="w-5 bg-blue-200 rounded-t" style={{ height: `${(d.gmv / 120) * 100}%` }} title={`GMV: â‚¹${d.gmv}L`} />
                    </div>
                    <p className="text-xs font-bold text-slate-600">{d.month}</p>
                    <p className="text-[10px] text-slate-400">â‚¹{d.revenue}L</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> Revenue</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-200 rounded" /> GMV</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Sellers */}
        {activeTab === 'sellers' && (
          <div>
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Top Performing Sellers</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>
                <th className="px-5 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Seller</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-center font-semibold">Rating</th>
                <th className="px-4 py-3 text-right font-semibold">Growth</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {TOP_SELLERS.map((s, i) => (
                  <tr key={s.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-slate-400 font-bold">{i + 1}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{s.revenue}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{s.orders.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-center"><span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{s.rating}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className={`text-xs font-bold flex items-center justify-end gap-0.5 ${s.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{s.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(s.growth)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Categories */}
        {activeTab === 'categories' && (
          <div>
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Category Performance Breakdown</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-center font-semibold">Share</th>
                <th className="px-4 py-3 text-right font-semibold">Growth</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {TOP_CATEGORIES.map(c => (
                  <tr key={c.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{c.revenue}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{c.orders.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.share}%` }} /></div>
                        <span className="text-xs font-bold text-slate-600">{c.share}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right"><span className={`text-xs font-bold flex items-center justify-end gap-0.5 ${c.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{c.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(c.growth)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Countries */}
        {activeTab === 'countries' && (
          <div>
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Country-wise Marketplace Performance</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>
                <th className="px-5 py-3 text-left font-semibold">Country</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Orders</th>
                <th className="px-4 py-3 text-right font-semibold">Sellers</th>
                <th className="px-4 py-3 text-right font-semibold">Growth</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {COUNTRY_DATA.map(c => (
                  <tr key={c.country} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5"><span className="flex items-center gap-2 font-bold text-slate-900"><CountryFlag code={c.code} size="md" />{c.country}</span></td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{c.revenue}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{c.orders.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-bold">{c.sellers.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right"><span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-0.5"><ArrowUpRight className="w-3 h-3" />{c.growth}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tax */}
        {activeTab === 'tax' && (
          <div>
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Tax Collection & Filing Status</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>
                <th className="px-5 py-3 text-left font-semibold">Tax Type</th>
                <th className="px-4 py-3 text-right font-semibold">Collected</th>
                <th className="px-4 py-3 text-right font-semibold">Pending Remittance</th>
                <th className="px-4 py-3 text-center font-semibold">Last Filed</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {TAX_SUMMARY.map(t => (
                  <tr key={t.type} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{t.type}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{t.collected}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-amber-600">{t.pending}</td>
                    <td className="px-4 py-3.5 text-center text-slate-600">{t.filed}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${t.status === 'filed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{t.status === 'filed' ? 'Filed' : 'Pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Campaigns */}
        {activeTab === 'campaigns' && (
          <div>
            <div className="p-5 border-b border-slate-100"><h3 className="font-bold text-slate-900">Campaign Performance & ROI</h3></div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs"><tr>
                <th className="px-5 py-3 text-left font-semibold">Campaign</th>
                <th className="px-4 py-3 text-right font-semibold">Impressions</th>
                <th className="px-4 py-3 text-right font-semibold">Clicks</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">ROAS</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {CAMPAIGNS.map(c => (
                  <tr key={c.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{c.impressions}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{c.clicks}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{c.revenue}</td>
                    <td className="px-4 py-3.5 text-right"><span className="text-xs font-bold text-blue-600">{c.roas}x</span></td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.status === 'active' ? 'Active' : 'Completed'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
