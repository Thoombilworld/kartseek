'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Store, Package, ShoppingCart, Globe, Star, TrendingUp, Download,
  Eye, CheckCircle, XCircle, AlertTriangle, Clock, Ban, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import MarketplaceFilterBar from '@/components/admin/marketplace/marketplace-filter-bar';
import { adminMarketplaceApi } from '@/lib/api/admin-marketplace';
import MarketplaceActionMenu from '@/components/admin/marketplace/marketplace-action-menu';
import MarketplaceApprovalPanel from '@/components/admin/marketplace/marketplace-approval-panel';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import AdminMarketplaceRoutes from '@/lib/routes/admin-marketplace-routes';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';

// ─── Mock Data (replace with adminMarketplaceApi.getSellers() in production) ─
const SELLERS_DATA = [
  { id: 'SLR-001', name: 'Apple India Store', storeName: 'Apple Official', country: 'India', businessType: 'Public Ltd', category: 'Electronics', kycStatus: 'verified', taxStatus: 'compliant', regStatus: 'approved', status: 'active', products: 142, orders: 4200, revenue: '₹8.2Cr', payout: 'settled', joined: '12 Jan 2024', rating: 4.9, complaints: 2 },
  { id: 'SLR-002', name: 'Nike Official India', storeName: 'Nike India', country: 'India', businessType: 'Pvt Ltd', category: 'Fashion', kycStatus: 'verified', taxStatus: 'compliant', regStatus: 'approved', status: 'active', products: 890, orders: 8900, revenue: '₹4.5Cr', payout: 'settled', joined: '03 Mar 2024', rating: 4.7, complaints: 5 },
  { id: 'SLR-003', name: 'Gulf Electronics FZE', storeName: 'Gulf Tech Store', country: 'UAE', businessType: 'FZE', category: 'Electronics', kycStatus: 'verified', taxStatus: 'compliant', regStatus: 'approved', status: 'active', products: 312, orders: 2100, revenue: 'AED 980K', payout: 'pending', joined: '15 Feb 2024', rating: 4.5, complaints: 3 },
  { id: 'SLR-004', name: 'Heritage Silk House', storeName: 'Heritage Silks', country: 'India', businessType: 'Proprietorship', category: 'Fashion', kycStatus: 'under-review', taxStatus: 'pending', regStatus: 'pending', status: 'pending', products: 0, orders: 0, revenue: '₹0', payout: 'none', joined: '31 May 2026', rating: 0, complaints: 0 },
  { id: 'SLR-005', name: 'QuickMart Express', storeName: 'QuickMart', country: 'India', businessType: 'Proprietorship', category: 'General', kycStatus: 'expired', taxStatus: 'non-compliant', regStatus: 'approved', status: 'suspended', products: 45, orders: 180, revenue: '₹1.8L', payout: 'hold', joined: '05 May 2025', rating: 3.2, complaints: 28 },
  { id: 'SLR-006', name: 'London Luxury Goods Ltd', storeName: 'London Luxury', country: 'UK', businessType: 'Ltd', category: 'Jewellery', kycStatus: 'under-review', taxStatus: 'pending', regStatus: 'pending', status: 'pending', products: 0, orders: 0, revenue: '£0', payout: 'none', joined: '30 May 2026', rating: 0, complaints: 0 },
  { id: 'SLR-007', name: 'Samsung Store India', storeName: 'Samsung Official', country: 'India', businessType: 'Public Ltd', category: 'Electronics', kycStatus: 'verified', taxStatus: 'compliant', regStatus: 'approved', status: 'active', products: 210, orders: 6100, revenue: '₹12.1Cr', payout: 'settled', joined: '08 Jan 2024', rating: 4.6, complaints: 3 },
  { id: 'SLR-008', name: 'FakeGoods Store', storeName: 'FakeGoods', country: 'India', businessType: 'Unknown', category: 'Electronics', kycStatus: 'rejected', taxStatus: 'non-compliant', regStatus: 'rejected', status: 'blocked', products: 12, orders: 45, revenue: '₹42K', payout: 'hold', joined: '20 May 2026', rating: 1.8, complaints: 38 },
];



const PAGE_SIZE = 7;

type ModalState = { sellerId: string; sellerName: string; action: 'approve' | 'reject' | 'correction' | 'suspend' } | null;

export default function AllSellersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sellers, setSellers] = useState(SELLERS_DATA);
  const [modal, setModal] = useState<ModalState>(null);

  const { filtered: regionFiltered, regionLabel, isFiltered: isRegionFiltered } = useMarketplaceRegionFilter(sellers);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = regionFiltered.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()) || s.storeName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchCountry = !countryFilter || s.country === countryFilter;
    return matchSearch && matchStatus && matchCountry;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    active:    regionFiltered.filter(s => s.status === 'active').length,
    pending:   regionFiltered.filter(s => s.status === 'pending').length,
    suspended: regionFiltered.filter(s => s.status === 'suspended').length,
    blocked:   regionFiltered.filter(s => s.status === 'blocked').length,
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAction = async (reason: string) => {
    if (!modal) return;
    setSellers(prev => prev.map(s => {
      if (s.id !== modal.sellerId) return s;
      const updates: Partial<typeof s> = {};
      if (modal.action === 'approve')  { updates.status = 'active'; updates.kycStatus = 'verified'; }
      if (modal.action === 'reject')   { updates.status = 'blocked'; updates.kycStatus = 'rejected'; }
      if (modal.action === 'suspend')  { updates.status = 'suspended'; }
      if (modal.action === 'correction') { /* send notification */ }
      return { ...s, ...updates };
    }));
    // Call real API based on action type
    try {
      if (modal.action === 'approve')     await adminMarketplaceApi.approveSeller(modal.sellerId, reason);
      else if (modal.action === 'reject') await adminMarketplaceApi.rejectSeller(modal.sellerId, reason);
      else if (modal.action === 'suspend') await adminMarketplaceApi.suspendSeller(modal.sellerId, reason);
    } catch { /* optimistic UI already applied above */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">All Sellers</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegionFiltered ? `${regionLabel} sellers` : 'All marketplace sellers'} — approve, suspend, reactivate, view products & orders.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={AdminMarketplaceRoutes.sellerApprovals()} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <Clock className="w-4 h-4" /> {counts.pending} Pending →
          </Link>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: counts.active, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Pending KYC', count: counts.pending, color: 'bg-amber-100 text-amber-700' },
          { label: 'Suspended', count: counts.suspended, color: 'bg-red-100 text-red-700' },
          { label: 'Blocked', count: counts.blocked, color: 'bg-slate-100 text-slate-700' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-black text-slate-900">{k.count}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${k.color}`}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <MarketplaceFilterBar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        placeholder="Search by name, store, or seller ID..."
        onExport={() => {}}
        filters={[
          { label: 'All Status', value: statusFilter, onChange: v => { setStatusFilter(v); setPage(1); }, options: [{ label: 'Active', value: 'active' }, { label: 'Pending', value: 'pending' }, { label: 'Suspended', value: 'suspended' }, { label: 'Blocked', value: 'blocked' }] },
          { label: 'All Countries', value: countryFilter, onChange: v => { setCountryFilter(v); setPage(1); }, options: [{ label: 'India', value: 'India' }, { label: 'UAE', value: 'UAE' }, { label: 'UK', value: 'UK' }, { label: 'Qatar', value: 'Qatar' }, { label: 'Saudi Arabia', value: 'Saudi Arabia' }] },
        ]}
      />

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold">Seller / Store</th>
                <th className="px-4 py-3.5 text-center font-semibold">Country</th>
                <th className="px-4 py-3.5 text-left font-semibold">Business Type</th>
                <th className="px-4 py-3.5 text-center font-semibold">KYC</th>
                <th className="px-4 py-3.5 text-center font-semibold">Tax</th>
                <th className="px-4 py-3.5 text-right font-semibold">Products</th>
                <th className="px-4 py-3.5 text-right font-semibold">Orders</th>
                <th className="px-4 py-3.5 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                <th className="px-4 py-3.5 text-center font-semibold">Joined</th>
                <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr><td colSpan={11}><MarketplaceEmptyState title="No sellers found" message="Try adjusting your search or filters." icon={Store} /></td></tr>
              ) : paged.map(s => (
                <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${s.status === 'blocked' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.id} · {s.storeName}</p>
                    {s.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-slate-600">{s.rating}</span>
                        {s.complaints > 5 && <span className="text-[10px] text-red-500 font-bold ml-1">{s.complaints} complaints</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center"><CountryFlag code={s.country === 'India' ? 'IN' : s.country === 'UAE' ? 'AE' : s.country === 'UK' ? 'GB' : s.country === 'Qatar' ? 'QA' : s.country === 'Saudi Arabia' ? 'SA' : 'QA'} size="md" /><p className="text-[10px] text-slate-400">{s.country}</p></td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">{s.businessType}</td>
                  <td className="px-4 py-3.5 text-center"><MarketplaceStatusBadge status={s.kycStatus} /></td>
                  <td className="px-4 py-3.5 text-center"><MarketplaceStatusBadge status={s.taxStatus === 'compliant' ? 'active' : s.taxStatus === 'pending' ? 'pending' : 'suspended'} customLabel={s.taxStatus} /></td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">{s.products.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">{s.orders.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{s.revenue}</td>
                  <td className="px-4 py-3.5 text-center"><MarketplaceStatusBadge status={s.status} showDot /></td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-400">{s.joined}</td>
                  <td className="px-4 py-3.5 text-center">
                    <MarketplaceActionMenu items={[
                      { label: 'View Seller', icon: Eye, onClick: () => {} },
                      { label: 'View Products', icon: Package, onClick: () => {} },
                      { label: 'View Orders', icon: ShoppingCart, onClick: () => {} },
                      ...(s.status === 'pending' ? [
                        { label: 'Approve Seller', icon: CheckCircle, onClick: () => setModal({ sellerId: s.id, sellerName: s.name, action: 'approve' }), variant: 'success' as const, divider: true },
                        { label: 'Reject', icon: XCircle, onClick: () => setModal({ sellerId: s.id, sellerName: s.name, action: 'reject' }), variant: 'danger' as const },
                        { label: 'Request Correction', icon: AlertTriangle, onClick: () => setModal({ sellerId: s.id, sellerName: s.name, action: 'correction' }), variant: 'warning' as const },
                      ] : []),
                      ...(s.status === 'active' ? [
                        { label: 'Suspend Seller', icon: Ban, onClick: () => setModal({ sellerId: s.id, sellerName: s.name, action: 'suspend' }), variant: 'danger' as const, divider: true },
                      ] : []),
                      ...(s.status === 'suspended' ? [
                        { label: 'Reactivate', icon: RefreshCw, onClick: () => setSellers(prev => prev.map(x => x.id === s.id ? { ...x, status: 'active' } : x)), variant: 'success' as const, divider: true },
                      ] : []),
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} sellers</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed" title="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-slate-700">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed" title="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {modal && (
        <MarketplaceApprovalPanel
          isOpen={!!modal}
          entityName={modal.sellerName}
          entityType="Seller"
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleAction}
          reasonOptions={
            modal.action === 'reject' ? ['Incomplete KYC', 'Invalid Tax ID', 'Duplicate Account', 'Failed Compliance Check', 'Suspicious Activity'] :
            modal.action === 'suspend' ? ['High Refund Rate', 'Multiple Complaints', 'Policy Violation', 'KYC Expired', 'Fraudulent Activity'] :
            modal.action === 'correction' ? ['Incomplete Documents', 'Address Mismatch', 'Tax ID Mismatch', 'Bank Details Incorrect'] : []
          }
        />
      )}
    </div>
  );
}
