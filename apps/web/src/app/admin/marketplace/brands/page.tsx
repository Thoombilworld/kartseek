'use client';
import React, { useState } from 'react';
import { Crown, Plus, Search, Eye, Edit2, CheckCircle, XCircle, AlertTriangle, Download, X, Upload, Star, Globe } from 'lucide-react';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import MarketplaceActionMenu from '@/components/admin/marketplace/marketplace-action-menu';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Qatar: 'QA', 'Saudi Arabia': 'SA', Kuwait: 'KW', USA: 'US' };

const ALL_BRANDS = [
  { id: 'BRD-001', name: 'Apple', country: 'India', seller: 'Apple India Store', category: 'Electronics', products: 142, trademark: true, authLetter: true, logo: true, status: 'approved', featured: true, added: '12 Jan 2024' },
  { id: 'BRD-002', name: 'Samsung', country: 'India', seller: 'Samsung Store India', category: 'Electronics', products: 210, trademark: true, authLetter: true, logo: true, status: 'approved', featured: true, added: '08 Jan 2024' },
  { id: 'BRD-003', name: 'Nike', country: 'India', seller: 'Nike Official India', category: 'Fashion', products: 890, trademark: true, authLetter: true, logo: true, status: 'approved', featured: true, added: '03 Mar 2024' },
  { id: 'BRD-004', name: 'TechNova Electronics', country: 'UAE', seller: 'TechNova Ltd', category: 'Electronics', products: 0, trademark: true, authLetter: false, logo: true, status: 'under-review', featured: false, added: '30 May 2026' },
  { id: 'BRD-005', name: 'SilkRoute Couture', country: 'India', seller: 'SR Fashion Pvt Ltd', category: 'Fashion', products: 0, trademark: true, authLetter: true, logo: true, status: 'under-review', featured: false, added: '28 May 2026' },
  { id: 'BRD-006', name: 'Doha Home Decor', country: 'Qatar', seller: 'DHD LLC', category: 'Home & Kitchen', products: 0, trademark: false, authLetter: false, logo: true, status: 'correction', featured: false, added: '27 May 2026' },
  { id: 'BRD-007', name: 'AppleCore Tech (Fake)', country: 'India', seller: 'Suspicious Store', category: 'Electronics', products: 0, trademark: false, authLetter: false, logo: false, status: 'rejected', featured: false, added: '26 May 2026' },
  { id: 'BRD-008', name: 'Riyadh Luxury Goods', country: 'Saudi Arabia', seller: 'RLG Trading Co', category: 'Jewellery', products: 34, trademark: true, authLetter: true, logo: true, status: 'approved', featured: false, added: '25 May 2026' },
  { id: 'BRD-009', name: 'GulfTech', country: 'UAE', seller: 'Gulf Electronics FZE', category: 'Electronics', products: 48, trademark: true, authLetter: true, logo: true, status: 'approved', featured: false, added: '10 Mar 2024' },
  { id: 'BRD-010', name: "Levi's", country: 'India', seller: "Levi's India", category: 'Fashion', products: 420, trademark: true, authLetter: true, logo: true, status: 'approved', featured: false, added: '05 Feb 2024' },
];

const CATEGORIES = ['Electronics', 'Fashion', 'Mobiles', 'Home & Kitchen', 'Beauty', 'Grocery', 'Toys', 'Jewellery', 'Sports', 'Automotive', 'Footwear', 'Books'];

const EMPTY_FORM = { name: '', country: 'India', category: '', website: '', description: '', ownerType: 'authorized_reseller', trademark: false, authLetter: false, logo: false };

export default function AllBrandsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brands, setBrands] = useState(ALL_BRANDS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getBrands(),
    []
  );
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered: isRegionFiltered } = useMarketplaceRegionFilter(brands);

  const filtered = regionFiltered.filter(b =>
    (!search || b.name.toLowerCase().includes(search.toLowerCase()) || b.seller.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || b.status === statusFilter)
  );

  const counts = {
    total: regionFiltered.length,
    approved: regionFiltered.filter(b => b.status === 'approved').length,
    pending: regionFiltered.filter(b => b.status === 'under-review').length,
    rejected: regionFiltered.filter(b => b.status === 'rejected').length,
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Brand name is required';
    if (!form.category) errors.category = 'Category is required';
    if (!form.country) errors.country = 'Country is required';
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    const newBrand = {
      id: `BRD-${String(brands.length + 1).padStart(3, '0')}`,
      name: form.name.trim(),
      country: form.country,
      seller: 'Admin (Direct Add)',
      category: form.category,
      products: 0,
      trademark: form.trademark,
      authLetter: form.authLetter,
      logo: form.logo,
      status: 'approved',
      featured: false,
      added: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setBrands(prev => [newBrand, ...prev]);
    setSuccessMsg(`Brand "${newBrand.name}" added and approved successfully.`);
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSubmitting(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const toggleFeatured = (id: string) => setBrands(prev => prev.map(b => b.id === id ? { ...b, featured: !b.featured } : b));
  const updateStatus = (id: string, status: string) => setBrands(prev => prev.map(b => b.id === id ? { ...b, status } : b));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">All Brands</h1>
          <p className="text-slate-500 text-sm mt-1">{isRegionFiltered ? `${regionLabel} — ` : ''}Manage all marketplace brands. Admin can add brands directly or review seller-submitted brands from Brand Center.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAdd(true); setFormErrors({}); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add New Brand
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold text-emerald-800">{successMsg}</p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Brands', val: counts.total, color: 'text-slate-900' },
          { label: 'Approved', val: counts.approved, color: 'text-emerald-600' },
          { label: 'Pending Review', val: counts.pending, color: 'text-amber-600' },
          { label: 'Rejected', val: counts.rejected, color: 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brand name, seller, or ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none">
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="under-review">Under Review</option>
          <option value="correction">Correction Req.</option>
          <option value="rejected">Rejected</option>
        </select>
        <p className="text-sm text-slate-500 ml-auto">{filtered.length} brands</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold">Brand</th>
                <th className="px-4 py-3.5 text-center font-semibold">Country</th>
                <th className="px-4 py-3.5 text-left font-semibold">Seller</th>
                <th className="px-4 py-3.5 text-left font-semibold">Category</th>
                <th className="px-4 py-3.5 text-center font-semibold">Products</th>
                <th className="px-4 py-3.5 text-center font-semibold">Docs</th>
                <th className="px-4 py-3.5 text-center font-semibold">Featured</th>
                <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                <th className="px-4 py-3.5 text-left font-semibold">Added</th>
                <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Crown className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No brands found</p>
                  </td>
                </tr>
              ) : filtered.map(b => (
                <tr key={b.id} className={`hover:bg-slate-50/50 transition-colors ${b.status === 'rejected' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-linear-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center shrink-0">
                        <Crown className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{b.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{b.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <CountryFlag code={COUNTRY_TO_CODE[b.country] || 'QA'} size="md" />
                    <p className="text-[10px] text-slate-400">{b.country}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{b.seller}</td>
                  <td className="px-4 py-3.5">
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-lg">{b.category}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-800">{b.products}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span title="Trademark" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.trademark ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-300'}`}>TM</span>
                      <span title="Auth Letter" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.authLetter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-300'}`}>AU</span>
                      <span title="Logo" className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.logo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>LG</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button onClick={() => toggleFeatured(b.id)}>
                      <Star className={`w-4 h-4 ${b.featured ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <MarketplaceStatusBadge status={b.status as any} showDot />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{b.added}</td>
                  <td className="px-4 py-3.5 text-center">
                    <MarketplaceActionMenu items={[
                      { label: 'View Brand', icon: Eye, onClick: () => {} },
                      { label: 'Edit Brand', icon: Edit2, onClick: () => {} },
                      ...(b.status === 'under-review' || b.status === 'correction' ? [
                        { label: 'Approve Brand', icon: CheckCircle, onClick: () => updateStatus(b.id, 'approved'), variant: 'success' as const, divider: true },
                        { label: 'Reject Brand', icon: XCircle, onClick: () => updateStatus(b.id, 'rejected'), variant: 'danger' as const },
                        { label: 'Request Correction', icon: AlertTriangle, onClick: () => updateStatus(b.id, 'correction'), variant: 'warning' as const },
                      ] : []),
                      { label: b.featured ? 'Remove Featured' : 'Mark as Featured', icon: Star, onClick: () => toggleFeatured(b.id), divider: true },
                      ...(b.status === 'approved' ? [{ label: 'Suspend Brand', icon: XCircle, onClick: () => updateStatus(b.id, 'rejected'), variant: 'danger' as const }] : []),
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add New Brand Modal ─────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Add New Brand</h2>
                  <p className="text-xs text-slate-400">Brand will be added as Approved by Admin</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-5">
              {/* Brand Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="brand-name">Brand Name *</label>
                <input id="brand-name"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(er => ({ ...er, name: '' })); }}
                  placeholder="e.g. Samsung, Nike, Dyson"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.name}</p>}
              </div>

              {/* Country + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="country">Country *</label>
                  <select id="country"
                    value={form.country}
                    onChange={e => { setForm(f => ({ ...f, country: e.target.value })); setFormErrors(er => ({ ...er, country: '' })); }}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.country ? 'border-red-400' : 'border-slate-200'}`}>
                    {['India', 'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'UK', 'USA'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  {formErrors.country && <p className="text-xs text-red-600 mt-1">{formErrors.country}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="category">Category *</label>
                  <select id="category"
                    value={form.category}
                    onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setFormErrors(er => ({ ...er, category: '' })); }}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.category ? 'border-red-400' : 'border-slate-200'}`}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  {formErrors.category && <p className="text-xs text-red-600 mt-1">{formErrors.category}</p>}
                </div>
              </div>

              {/* Owner Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Brand Owner Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'brand_owner', label: 'Brand Owner', desc: 'Direct manufacturer' },
                    { val: 'authorized_reseller', label: 'Auth. Reseller', desc: 'Has auth letter' },
                    { val: 'admin_managed', label: 'Admin Managed', desc: 'Platform brand' },
                  ].map(opt => (
                    <button key={opt.val} type="button"
                      onClick={() => setForm(f => ({ ...f, ownerType: opt.val }))}
                      className={`border rounded-xl p-3 text-left transition-colors ${form.ownerType === opt.val ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className={`text-xs font-bold ${form.ownerType === opt.val ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="brand-website">Brand Website</label>
                <input id="brand-website"
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://brand.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="brand-description">Brand Description</label>
                <textarea id="brand-description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Short description about this brand..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Documents */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Compliance Documents</label>
                <div className="space-y-2">
                  {([
                    { key: 'trademark', label: 'Trademark Certificate', desc: 'Registered trademark for brand name/logo' },
                    { key: 'authLetter', label: 'Authorization Letter', desc: 'Official authorization to sell under this brand' },
                    { key: 'logo', label: 'Brand Logo', desc: 'High-resolution brand logo file' },
                  ] as const).map(doc => (
                    <label key={doc.key} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${form[doc.key] ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={form[doc.key]} onChange={e => setForm(f => ({ ...f, [doc.key]: e.target.checked }))} className="rounded" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{doc.label}</p>
                          <p className="text-xs text-slate-400">{doc.desc}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${form[doc.key] ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {form[doc.key] ? <><CheckCircle className="w-4 h-4" /> Confirmed</> : <><Upload className="w-4 h-4" /> Upload</>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Audit note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-2">
                <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium">
                  Admin-added brands are automatically <strong>approved</strong> and available for sellers to list products under immediately. This action is logged in the Audit Trail.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5 sticky bottom-0 bg-white border-t border-slate-100 pt-4">
              <button onClick={() => { setShowAdd(false); setFormErrors({}); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2" aria-label="Action">{submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Adding Brand...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Add Brand</>
                )}</button>
            </div>
          </div>
        </div>
      )}
      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
