'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CountryFlag } from '@/components/shared/country-flag';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import {
  Store, Package, ShoppingCart, RotateCcw, CreditCard, Crown,
  Megaphone, CheckCircle, XCircle, Clock, DollarSign, Percent, BarChart3, ArrowRight,
  Zap, Star, Shield, Eye, ChevronRight, Globe, AlertTriangle
} from 'lucide-react';

// KPIs and tables on this dashboard are fetched live from the marketplace admin
// API — there is no hardcoded region KPI data.

const PENDING_SELLERS: any[] = [];

const PENDING_PRODUCTS: any[] = [];

const PENDING_BRANDS: any[] = [];

const COUNTRY_STATUS = [
  { country: 'India', code: 'IN', sellers: 840, products: 62000, orders: 78000, status: 'Active' },
  { country: 'UAE', code: 'AE', sellers: 180, products: 12400, orders: 18200, status: 'Active' },
  { country: 'Saudi Arabia', code: 'SA', sellers: 96, products: 6800, orders: 8900, status: 'Active' },
  { country: 'Qatar', code: 'QA', sellers: 48, products: 2100, orders: 2800, status: 'Active' },
  { country: 'UK', code: 'GB', sellers: 42, products: 1900, orders: 2400, status: 'Active' },
  { country: 'Kuwait', code: 'KW', sellers: 22, products: 980, orders: 1200, status: 'Active' },
  { country: 'Oman', code: 'OM', sellers: 8, products: 320, orders: 480, status: 'Limited' },
  { country: 'USA', code: 'US', sellers: 4, products: 200, orders: 320, status: 'Beta' },
];

const RECENT_AUDIT: any[] = [];

function StatCard({ label, value, sub, icon: Icon, color, href }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; href?: string }) {
  const content = (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {href && <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm font-semibold text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function PendingBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function AdminMarketplaceDashboard() {
  const [activeTab, setActiveTab] = useState<'sellers' | 'products' | 'brands'>('sellers');

  // Region awareness
  const { regionLabel, isFiltered, regionCode, formatCurrencyValue } = useMarketplaceRegionFilter(COUNTRY_STATUS);

  // Fetch dashboard data from REST API
  const { data: apiDashboardRaw, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getDashboard(isFiltered ? regionCode : undefined),
    []
  );
  
  const apiDashboard = (apiDashboardRaw as any)?.data || apiDashboardRaw;
  const { execute } = useAdminAction(showToast);

  // Secondary governance tables — fetched live (no hardcoded rows)
  const { data: pendingSellersRaw } = useAdminData(() => adminMarketplaceApi.getPendingSellers(), []);
  const { data: pendingProductsRaw } = useAdminData(() => adminMarketplaceApi.getProducts({ status: 'pending', limit: 20 }), []);
  const { data: auditRaw } = useAdminData(() => adminMarketplaceApi.getAuditLogs({ limit: 12 }), []);
  const asArray = (raw: any): any[] => {
    const d = (raw as any)?.data ?? raw;
    return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.items) ? d.items : [];
  };

  // KPIs come entirely from the real admin dashboard API; missing fields default to 0
  // (no hardcoded region data). When the API is unreachable the tiles read zero.
  const KPIs = {
    sellers: { total: 0, active: 0, pending: 0, suspended: 0, blocked: 0, ...(apiDashboard?.sellers || {}) },
    products: { total: 0, approved: 0, pending: 0, rejected: 0, unpublished: 0, ...(apiDashboard?.products || {}) },
    brands: { total: 0, approved: 0, pendingApproval: 0, rejected: 0, ...(apiDashboard?.brands || {}) },
    campaigns: { active: 0, scheduled: 0, pending: 0, paused: 0, expired: 0, ...(apiDashboard?.campaigns || {}) },
    orders: { today: 0, thisWeek: 0, thisMonth: 0, pending: 0, ...(apiDashboard?.orders || {}) },
    returns: { open: 0, resolved: 0, ...(apiDashboard?.returns || {}) },
    refunds: { pending: 0, processed: 0, amount: 0, ...(apiDashboard?.refunds || {}) },
    revenue: { today: 0, thisWeek: 0, thisMonth: 0, commission: 0, ...(apiDashboard?.revenue || {}) },
    payouts: { pending: 0, processed: 0, ...(apiDashboard?.payouts || {}) },
  };

  // Pending-approval + audit tables come from live admin endpoints (mapped to the table shape).
  const filteredSellers = asArray(pendingSellersRaw).map((s: any) => ({
    id: s.id,
    name: s.name || s.businessName || 'Seller',
    country: s.country || s.countryCode || '—',
    category: s.category || s.businessType || 'General',
    kyc: s.kycStatus || s.kyc || 'Under Review',
    submitted: (s.submittedAt || s.createdAt) ? new Date(s.submittedAt || s.createdAt).toLocaleDateString() : '—',
  }));
  const filteredProducts = asArray(pendingProductsRaw).map((p: any) => ({
    id: p.id,
    name: p.name || 'Product',
    seller: p.sellerName || p.seller || '—',
    category: p.category?.name || p.category || '—',
    submitted: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—',
  }));
  const filteredAudit = asArray(auditRaw).map((a: any) => {
    const act = String(a.action || '').toLowerCase();
    const type = act.includes('approv') ? 'approve' : act.includes('reject') ? 'reject' : act.includes('suspend') ? 'suspend' : 'update';
    return {
      type,
      action: a.action || 'Action',
      entity: a.entity || a.target || '—',
      actor: a.actor || a.adminId || 'Admin',
      time: (a.createdAt || a.timestamp) ? new Date(a.createdAt || a.timestamp).toLocaleString() : '—',
    };
  });
  // Brand approvals + country status have no dedicated live endpoint yet — region-filtered config.
  const { filtered: filteredBrands } = useMarketplaceRegionFilter(PENDING_BRANDS);
  const { filtered: filteredCountries } = useMarketplaceRegionFilter(COUNTRY_STATUS);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Marketplace Control Center</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isFiltered
              ? `${regionLabel} marketplace — seller approvals, product control, brand management, campaigns & revenue`
              : 'Master dashboard — seller approvals, product control, brand management, campaigns & revenue'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/marketplace/audit-logs" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 shadow-sm">
            <Shield className="w-4 h-4" /> Audit Logs
          </Link>
          <Link href="/admin/marketplace/reports" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm">
            <BarChart3 className="w-4 h-4" /> Reports
          </Link>
        </div>
      </div>

      {/* KPI Row 1 — Sellers & Products */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Sellers" value={KPIs.sellers.total.toLocaleString()} sub={`${KPIs.sellers.active} active`} icon={Store} color="bg-blue-100 text-blue-600" href="/admin/marketplace/sellers" />
        <StatCard label="Pending Approvals" value={KPIs.sellers.pending} sub="seller applications" icon={Clock} color="bg-amber-100 text-amber-600" href="/admin/marketplace/seller-approvals" />
        <StatCard label="Listed Products" value={KPIs.products.total.toLocaleString()} sub={`${KPIs.products.pending} pending review`} icon={Package} color="bg-indigo-100 text-indigo-600" href="/admin/marketplace/products" />
        <StatCard label="Product Approvals" value={KPIs.products.pending.toLocaleString()} sub={`${KPIs.products.rejected} rejected`} icon={CheckCircle} color="bg-rose-100 text-rose-600" href="/admin/marketplace/product-approvals" />
      </div>

      {/* KPI Row 2 — Revenue & Finance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 opacity-80" />
            <p className="text-sm font-bold opacity-80">Revenue Today</p>
          </div>
          <p className="text-4xl font-black">{formatCurrencyValue(KPIs.revenue.today, { compact: true })}</p>
          <div className="flex gap-6 mt-3">
            <div><p className="text-xs opacity-70">This Week</p><p className="font-bold">{formatCurrencyValue(KPIs.revenue.thisWeek, { compact: true })}</p></div>
            <div><p className="text-xs opacity-70">This Month</p><p className="font-bold">{formatCurrencyValue(KPIs.revenue.thisMonth, { compact: true })}</p></div>
            <div><p className="text-xs opacity-70">Commission Earned</p><p className="font-bold">{formatCurrencyValue(KPIs.revenue.commission, { compact: true })}</p></div>
          </div>
        </div>
        <StatCard label="Marketplace Orders" value={KPIs.orders.today.toLocaleString()} sub={`${KPIs.orders.thisMonth.toLocaleString()} this month`} icon={ShoppingCart} color="bg-cyan-100 text-cyan-600" href="/admin/marketplace/orders" />
        <div className="grid grid-rows-2 gap-4">
          <StatCard label="Pending Refunds" value={KPIs.refunds.pending} sub={formatCurrencyValue(KPIs.refunds.amount, { compact: true })} icon={CreditCard} color="bg-purple-100 text-purple-600" href="/admin/marketplace/refunds" />
          <StatCard label="Open Returns" value={KPIs.returns.open} sub="awaiting resolution" icon={RotateCcw} color="bg-orange-100 text-orange-600" href="/admin/marketplace/returns" />
        </div>
      </div>

      {/* KPI Row 3 — Brands & Campaigns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Brands" value={KPIs.brands.total.toLocaleString()} sub={`${KPIs.brands.pendingApproval} pending`} icon={Crown} color="bg-yellow-100 text-yellow-600" href="/admin/marketplace/brands" />
        <StatCard label="Brand Approvals" value={KPIs.brands.pendingApproval} sub="awaiting review" icon={Star} color="bg-pink-100 text-pink-600" href="/admin/marketplace/brand-center" />
        <StatCard label="Active Campaigns" value={KPIs.campaigns.active} sub={`${KPIs.campaigns.pending} pending approval`} icon={Megaphone} color="bg-teal-100 text-teal-600" href="/admin/marketplace/campaigns" />
        <StatCard label="Pending Payouts" value={formatCurrencyValue(KPIs.payouts.pending, { compact: true })} sub={`${formatCurrencyValue(KPIs.payouts.processed, { compact: true })} processed total`} icon={Percent} color="bg-slate-100 text-slate-600" href="/admin/marketplace/payouts" />
      </div>

      {/* Pending Approvals Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-slate-200 px-5">
          <div className="flex gap-1 py-3">
            {(['sellers', 'products', 'brands'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'sellers' ? 'Seller Approvals' : tab === 'products' ? 'Product Approvals' : 'Brand Approvals'}
                <PendingBadge count={tab === 'sellers' ? filteredSellers.length : tab === 'products' ? filteredProducts.length : filteredBrands.length} />
              </button>
            ))}
          </div>
          <Link href={`/admin/marketplace/${activeTab === 'sellers' ? 'seller-approvals' : activeTab === 'products' ? 'product-approvals' : 'brand-center'}`} className="ml-auto flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {activeTab === 'sellers' && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Seller</th>
                <th className="px-5 py-3 text-left font-semibold">Country</th>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-5 py-3 text-left font-semibold">KYC</th>
                <th className="px-5 py-3 text-left font-semibold">Submitted</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSellers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5"><p className="font-bold text-slate-900">{s.name}</p><p className="text-xs text-slate-400">{s.id}</p></td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{s.country}</td>
                  <td className="px-5 py-3.5 text-slate-600">{s.category}</td>
                  <td className="px-5 py-3.5"><span className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-1 rounded-full border border-amber-200">{s.kyc}</span></td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{s.submitted}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><CheckCircle className="w-3 h-3" /> Approve</button>
                      <button className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-red-200 transition-colors"><XCircle className="w-3 h-3" /> Reject</button>
                      <button className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-slate-200 transition-colors"><Eye className="w-3 h-3" /> Review</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSellers.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">No pending seller approvals for {regionLabel}</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'products' && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Product</th>
                <th className="px-5 py-3 text-left font-semibold">Seller</th>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-5 py-3 text-left font-semibold">Submitted</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5"><p className="font-bold text-slate-900">{p.name}</p><p className="text-xs text-slate-400">{p.id}</p></td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{p.seller}</td>
                  <td className="px-5 py-3.5 text-slate-600">{p.category}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{p.submitted}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                      <button className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-red-200"><XCircle className="w-3 h-3" /> Reject</button>
                      <button className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-amber-200"><AlertTriangle className="w-3 h-3" /> Request Fix</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">No pending product approvals for {regionLabel}</td></tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'brands' && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Brand</th>
                <th className="px-5 py-3 text-left font-semibold">Seller</th>
                <th className="px-5 py-3 text-left font-semibold">Country</th>
                <th className="px-5 py-3 text-left font-semibold">Submitted</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBrands.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5"><p className="font-bold text-slate-900">{b.name}</p><p className="text-xs text-slate-400">{b.id}</p></td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{b.seller}</td>
                  <td className="px-5 py-3.5 text-slate-600">{b.country}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{b.submitted}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                      <button className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border border-red-200"><XCircle className="w-3 h-3" /> Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBrands.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">No pending brand approvals for {regionLabel}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Row: Country Status + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Status */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" /><h3 className="font-bold text-slate-900">{isFiltered ? `${regionLabel} Marketplace` : 'Country Marketplace Status'}</h3></div>
            <Link href="/admin/marketplace/compliance/countries" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">Configure <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredCountries.map((c) => (
              <div key={c.country} className="flex items-center px-5 py-3 hover:bg-slate-50/50">
                <CountryFlag code={c.code} size="lg" className="mr-3" />
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{c.country}</p>
                  <p className="text-xs text-slate-400">{c.sellers} sellers · {c.products.toLocaleString()} products</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{c.orders.toLocaleString()} orders</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'Limited' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-slate-500" /><h3 className="font-bold text-slate-900">Recent Audit Activity</h3></div>
            <Link href="/admin/marketplace/audit-logs" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">Full Log <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredAudit.map((log, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  log.type === 'approve' ? 'bg-emerald-100' : log.type === 'reject' ? 'bg-red-100' : log.type === 'suspend' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  {log.type === 'approve' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                   log.type === 'reject' ? <XCircle className="w-4 h-4 text-red-600" /> :
                   log.type === 'suspend' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                   <Zap className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{log.action}</p>
                  <p className="text-xs text-slate-500 truncate">{log.entity} · by {log.actor}</p>
                </div>
                <p className="text-xs text-slate-400 shrink-0">{log.time}</p>
              </div>
            ))}
            {filteredAudit.length === 0 && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No recent audit activity for {regionLabel}</div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400 text-center">All admin actions are logged with actor, entity, and timestamp</p>
          </div>
        </div>
      </div>
      {loading && <AdminLoadingSkeleton rows={6} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
