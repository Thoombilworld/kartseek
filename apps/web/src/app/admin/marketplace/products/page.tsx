'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package, Eye, CheckCircle, XCircle, AlertTriangle, Star, Zap,
  EyeOff, Download, ChevronLeft, ChevronRight, Truck, X, Tag, Image as ImageIcon,
} from 'lucide-react';
import MarketplaceStatusBadge from '@/components/admin/marketplace/marketplace-status-badge';
import MarketplaceFilterBar from '@/components/admin/marketplace/marketplace-filter-bar';
import MarketplaceActionMenu from '@/components/admin/marketplace/marketplace-action-menu';
import MarketplaceApprovalPanel from '@/components/admin/marketplace/marketplace-approval-panel';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import AdminMarketplaceRoutes from '@/lib/routes/admin-marketplace-routes';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import type { HomeProduct } from '@/lib/marketplace/types';
import { discountPercent } from '@/lib/marketplace/pricing';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { apiFetch } from '@/lib/api-fetch';



import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Qatar: 'QA', 'Saudi Arabia': 'SA' };

// ── Build comprehensive product list from all customer homepage sections ──────

/** Deterministic hash from string → number (avoids Math.random hydration mismatch) */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function parseReviews(s: string): number {
  if (!s) return 0;
  const lower = s.toLowerCase().replace(/,/g, '');
  if (lower.endsWith('k')) return Math.round(parseFloat(lower) * 1000);
  return parseInt(lower, 10) || 0;
}

/** Map category to realistic HSN code */
function categoryToHsn(category: string): string {
  const map: Record<string, string> = {
    'mobiles-tablets': '8517', 'electronics': '8518', 'fashion': '6203',
    'footwear': '6402', 'beauty': '3304', 'home-kitchen': '7323',
    'appliances': '8528', 'sports': '9506', 'toys-baby': '9503',
    'baby-care': '9503', 'watches': '9101', 'furniture': '9403',
    'computers': '8471', 'books': '4901',
  };
  return map[category.toLowerCase().replace(/[^a-z-]/g, '')] || '8479';
}

/** Map category to GST rate */
function categoryToGst(category: string): string {
  const map: Record<string, string> = {
    'mobiles-tablets': '18%', 'electronics': '18%', 'fashion': '12%',
    'footwear': '18%', 'beauty': '18%', 'home-kitchen': '18%',
    'appliances': '28%', 'sports': '18%', 'toys-baby': '18%',
    'baby-care': '12%', 'watches': '18%', 'furniture': '18%',
    'computers': '18%', 'books': '0%',
  };
  return map[category.toLowerCase().replace(/[^a-z-]/g, '')] || '18%';
}

/**
 * The moderation queue starts empty and is filled by the catalogue.
 *
 * It used to start from `PRODUCTS_DATA`: seven hand-written listings — one of
 * them titled "iPhone 15 Case (Fake Counterfeit)" from "FakeGoods Store" —
 * concatenated with every product on the customer homepage's bundled fixtures,
 * roughly a hundred rows. The real catalogue was then fetched and *appended*,
 * with ids already present skipped, so the invented listings always won.
 *
 * On a moderation screen that is worse than a fabricated storefront. Every
 * count on this page (approved / pending / rejected / featured) was computed
 * over the fixtures, and an admin could open a fabricated listing and approve,
 * reject or request corrections on it — actions that then went to the real
 * `/admin/marketplace/products/action` endpoint carrying an id no catalogue row
 * has.
 */
type AdminProduct = {
  id: string; name: string; seller: string; brand: string; category: string;
  subcategory: string; country: string; sku: string; price: number; mrp: number;
  stock: number; approval: string; visibility: string; featured: boolean;
  hsn: string; gst: string | null; images: number; variants: number;
  created: string; rating: number; reviews: number; delivery: string | null;
  discount: number;
};

type ModalState = { productId: string; productName: string; action: 'approve' | 'reject' | 'correction' | 'suspend' } | null;

const PAGE_SIZE = 15;

export default function AllProductsPage() {
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [viewProduct, setViewProduct] = useState<AdminProduct | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getProducts(),
    []
  );
  const { execute } = useAdminAction(showToast);

  // Fetch real products from productStore and merge with demo data
  useEffect(() => {
    (async () => {
      try {
        // Real backend via the gateway (was an in-memory demo store — audit 2026-07-27 H1).
        const res = await apiFetch('/admin/marketplace/products?limit=100', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            // Replaces rather than appends. Appending was what let the seeded
            // rows survive a successful load and outnumber the real catalogue.
            setProducts(json.data);
          }
        }
      } catch {
        // Nothing to fall back to, deliberately: an unreachable catalogue means
        // this admin does not know what is pending, and an empty queue says so.
        setProducts([]);
      }
    })();
  }, []);

  const { filtered: regionFiltered, regionLabel, isFiltered: isRegionFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(products);

  const filtered = regionFiltered.filter(p => {
    const m = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.seller.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase());
    const a = !approvalFilter || p.approval === approvalFilter;
    const v = !visibilityFilter || p.visibility === visibilityFilter;
    const c = !countryFilter || p.country === countryFilter;
    return m && a && v && c;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    approved: regionFiltered.filter(p => p.approval === 'approved').length,
    pending:  regionFiltered.filter(p => p.approval === 'pending').length,
    rejected: regionFiltered.filter(p => p.approval === 'rejected').length,
    featured: regionFiltered.filter(p => p.featured).length,
  };

  const handleAction = async (reason: string) => {
    if (!modal) return;
    // Update local state
    setProducts(prev => prev.map(p => {
      if (p.id !== modal.productId) return p;
      if (modal.action === 'approve')    return { ...p, approval: 'approved', visibility: 'published' };
      if (modal.action === 'reject')     return { ...p, approval: 'rejected', visibility: 'unpublished' };
      if (modal.action === 'correction') return { ...p, approval: 'correction' };
      return p;
    }));

    // Persist to productStore via the submit PATCH endpoint
    try {
      await apiFetch('/admin/marketplace/products/action', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modal.productId,
          action: modal.action === 'correction' ? 'correction' : modal.action,
          reason: reason || undefined,
        }),
      });
    } catch {
      // Silently handle — local state is already updated
    }
  };

  const toggleVisibility = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, visibility: p.visibility === 'published' ? 'unpublished' : 'published' } : p));
  };
  const toggleFeatured = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, featured: !p.featured } : p));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">All Products</h1>
          <p className="text-slate-500 text-sm mt-1">{isRegionFiltered ? `${regionLabel} — ` : ''}Approve, publish, feature, or suspend marketplace products. Only approved + published products are visible to customers.</p>
        </div>
        <div className="flex gap-2">
          <Link href={AdminMarketplaceRoutes.productApprovals()} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <AlertTriangle className="w-4 h-4" /> {counts.pending} Pending →
          </Link>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Approved', count: counts.approved, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Pending Review', count: counts.pending, color: 'bg-amber-100 text-amber-700' },
          { label: 'Rejected', count: counts.rejected, color: 'bg-red-100 text-red-700' },
          { label: 'Featured', count: counts.featured, color: 'bg-purple-100 text-purple-700' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-black text-slate-900">{k.count}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${k.color}`}>{k.label}</span>
          </div>
        ))}
      </div>

      <MarketplaceFilterBar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        placeholder="Search by name, seller, SKU, or ID..."
        onExport={() => {}}
        filters={[
          { label: 'Approval Status', value: approvalFilter, onChange: v => { setApprovalFilter(v); setPage(1); }, options: [{ label: 'Approved', value: 'approved' }, { label: 'Pending', value: 'pending' }, { label: 'Rejected', value: 'rejected' }, { label: 'Correction', value: 'correction' }] },
          { label: 'Visibility', value: visibilityFilter, onChange: v => { setVisibilityFilter(v); setPage(1); }, options: [{ label: 'Published', value: 'published' }, { label: 'Unpublished', value: 'unpublished' }] },
          { label: 'Country', value: countryFilter, onChange: v => { setCountryFilter(v); setPage(1); }, options: [{ label: 'India', value: 'India' }, { label: 'UAE', value: 'UAE' }, { label: 'UK', value: 'UK' }] },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold">Product</th>
                <th className="px-4 py-3.5 text-left font-semibold">Seller / Brand</th>
                <th className="px-4 py-3.5 text-left font-semibold">Category</th>
                <th className="px-4 py-3.5 text-center font-semibold">Rating</th>
                <th className="px-4 py-3.5 text-right font-semibold">Price</th>
                <th className="px-4 py-3.5 text-center font-semibold">Discount</th>
                <th className="px-4 py-3.5 text-center font-semibold">Delivery</th>
                <th className="px-4 py-3.5 text-right font-semibold">Stock</th>
                <th className="px-4 py-3.5 text-center font-semibold">HSN / Tax</th>
                <th className="px-4 py-3.5 text-center font-semibold">Approval</th>
                <th className="px-4 py-3.5 text-center font-semibold">Visible</th>
                <th className="px-4 py-3.5 text-center font-semibold">Featured</th>
                <th className="px-4 py-3.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr><td colSpan={14}><MarketplaceEmptyState title="No products found" icon={Package} /></td></tr>
              ) : paged.map(p => {
                const pDiscount = ('discount' in p && typeof (p as any).discount === 'number') ? (p as any).discount : (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
                const pRating = ('rating' in p && typeof (p as any).rating === 'number') ? (p as any).rating : null;
                const pReviews = ('reviews' in p && typeof (p as any).reviews === 'number') ? (p as any).reviews : null;
                const pDelivery = ('delivery' in p) ? (p as any).delivery : null;
                return (
                <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${p.approval === 'rejected' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.id} · SKU: {p.sku}</p>
                    <p className="text-xs text-slate-400">{p.images} images · {p.variants} variants</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800 text-xs">{p.seller}</p>
                    <p className="text-[10px] text-slate-400">{p.brand}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-slate-700 font-medium">{p.category}</p>
                    <p className="text-[10px] text-slate-400">{p.subcategory}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {pRating !== null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          {pRating.toFixed(1)} <Star className="w-2.5 h-2.5 fill-white" />
                        </span>
                        {pReviews !== null && <span className="text-[9px] text-slate-400">{pReviews > 999 ? `${(pReviews / 1000).toFixed(1)}k` : pReviews}</span>}
                      </div>
                    ) : <span className="text-[10px] text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-bold text-slate-900">₹{p.price.toLocaleString('en-IN')}</p>
                    {p.mrp > p.price && <p className="text-[10px] text-slate-400 line-through">₹{p.mrp.toLocaleString('en-IN')}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {pDiscount > 0 ? (
                      <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100">
                        {pDiscount}% OFF
                      </span>
                    ) : <span className="text-[10px] text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {pDelivery ? (
                      <div className="flex items-center justify-center gap-1">
                        <Truck className="w-3 h-3 text-blue-500" />
                        <span className={`text-[10px] font-medium ${pDelivery === 'Tomorrow' ? 'text-blue-600' : 'text-slate-500'}`}>{pDelivery}</span>
                      </div>
                    ) : <span className="text-[10px] text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-bold text-sm ${p.stock < 20 ? 'text-red-600' : 'text-slate-800'}`}>{p.stock.toLocaleString('en-IN')}</span>
                    {p.stock < 20 && <p className="text-[10px] text-red-500">Low stock</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <p className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{p.hsn}</p>
                    {p.gst && <p className="text-[10px] text-slate-400 mt-0.5">{p.gst} GST</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center"><MarketplaceStatusBadge status={p.approval === 'correction' ? 'correction' : p.approval as any} /></td>
                  <td className="px-4 py-3.5 text-center">
                    <button onClick={() => toggleVisibility(p.id)} title="Toggle visibility" className="flex items-center justify-center mx-auto">
                      {p.visibility === 'published' ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button onClick={() => toggleFeatured(p.id)} title={p.featured ? 'Remove from featured' : 'Mark as featured'}>
                      <Star className={`w-4 h-4 ${p.featured ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <MarketplaceActionMenu items={[
                      { label: 'View Product', icon: Eye, onClick: () => setViewProduct(p) },
                      ...(p.approval === 'pending' || p.approval === 'correction' ? [
                        { label: 'Approve', icon: CheckCircle, onClick: () => setModal({ productId: p.id, productName: p.name, action: 'approve' }), variant: 'success' as const, divider: true },
                        { label: 'Reject', icon: XCircle, onClick: () => setModal({ productId: p.id, productName: p.name, action: 'reject' }), variant: 'danger' as const },
                        { label: 'Request Correction', icon: AlertTriangle, onClick: () => setModal({ productId: p.id, productName: p.name, action: 'correction' }), variant: 'warning' as const },
                      ] : []),
                      { label: p.visibility === 'published' ? 'Unpublish' : 'Publish', icon: p.visibility === 'published' ? EyeOff : Eye, onClick: () => toggleVisibility(p.id), divider: true },
                      { label: p.featured ? 'Remove from Featured' : 'Feature Product', icon: Star, onClick: () => toggleFeatured(p.id) },
                      { label: 'Suspend Product', icon: XCircle, onClick: () => setModal({ productId: p.id, productName: p.name, action: 'reject' }), variant: 'danger' as const, divider: true },
                    ]} />
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} products</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p-1)} disabled={page===1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40" title="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => p+1)} disabled={page===totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40" title="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <MarketplaceApprovalPanel
          isOpen={!!modal}
          entityName={modal.productName}
          entityType="Product"
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleAction}
          reasonOptions={
            modal.action === 'reject' ? ['Incorrect HSN/SAC', 'Wrong GST Classification', 'Poor Image Quality', 'Misleading Description', 'Prohibited Item', 'Counterfeit Risk', 'Incomplete Information'] :
            modal.action === 'correction' ? ['Add more images', 'Fix HSN code', 'Add bullet points', 'Add variant details', 'Fix pricing error'] : []
          }
        />
      )}
      {/* View Product Drawer */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewProduct(null)} ><DismissOnEscape onDismiss={() => setViewProduct(null)} /></div>
          <div className="ml-auto relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-black text-slate-900">Product Details</h2>
              <button onClick={() => setViewProduct(null)} title="Close" className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Product Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-900">{viewProduct.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{viewProduct.id} · SKU: {viewProduct.sku}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <MarketplaceStatusBadge status={viewProduct.approval === 'correction' ? 'correction' : viewProduct.approval as any} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${viewProduct.visibility === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{viewProduct.visibility}</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold">Price</p><p className="text-lg font-black text-slate-900">₹{viewProduct.price.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold">MRP</p><p className="text-lg font-bold text-slate-500 line-through">₹{viewProduct.mrp.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold">Discount</p>{viewProduct.discount > 0 ? <span className="inline-block mt-1 bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full border border-red-100">{viewProduct.discount}% OFF</span> : <p className="text-sm text-slate-400 mt-1">—</p>}</div>
                </div>
              </div>

              {/* Seller & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seller</h4>
                  <p className="text-sm font-bold text-slate-800">{viewProduct.seller}</p>
                  <p className="text-xs text-slate-500">{viewProduct.brand}</p>
                  <p className="text-xs text-slate-400 mt-1"><CountryFlag code={COUNTRY_TO_CODE[viewProduct.country] || 'QA'} size="xs" /> {viewProduct.country}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</h4>
                  <p className="text-sm font-bold text-slate-800">{viewProduct.category}</p>
                  <p className="text-xs text-slate-500">{viewProduct.subcategory}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="text-sm font-bold text-slate-900">{viewProduct.rating}</span></div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{viewProduct.reviews > 999 ? `${(viewProduct.reviews / 1000).toFixed(1)}k` : viewProduct.reviews} reviews</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className={`text-sm font-bold ${viewProduct.stock === 0 ? 'text-red-600' : viewProduct.stock < 20 ? 'text-amber-600' : 'text-slate-900'}`}>{viewProduct.stock}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Stock</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  {viewProduct.delivery ? <div className="flex items-center justify-center gap-1"><Truck className="w-3 h-3 text-blue-500" /><span className="text-xs font-medium text-slate-700">{viewProduct.delivery}</span></div> : <span className="text-xs text-slate-400">—</span>}
                  <p className="text-[10px] text-slate-400 mt-0.5">Delivery</p>
                </div>
              </div>

              {/* HSN / Tax */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4 text-blue-600" /><h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Tax Information</h4></div>
                <div className="flex items-center gap-4">
                  <div><p className="text-[10px] text-blue-500 uppercase font-bold">HSN Code</p><p className="font-mono text-lg font-black text-blue-800">{viewProduct.hsn || '—'}</p></div>
                  <div><p className="text-[10px] text-blue-500 uppercase font-bold">GST Rate</p><p className="text-lg font-black text-blue-800">{viewProduct.gst || '—'}</p></div>
                </div>
              </div>

              {/* Meta */}
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                <p><span className="font-bold">Created:</span> {viewProduct.created}</p>
                <p><span className="font-bold">Images:</span> {viewProduct.images} · <span className="font-bold">Variants:</span> {viewProduct.variants}</p>
                {viewProduct.featured && <p className="text-amber-600 font-bold">â­ Featured Product</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button onClick={() => { toggleVisibility(viewProduct.id); setViewProduct({...viewProduct, visibility: viewProduct.visibility === 'published' ? 'unpublished' : 'published'}); }} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  {viewProduct.visibility === 'published' ? <><EyeOff className="w-4 h-4" />Unpublish</> : <><Eye className="w-4 h-4" />Publish</>}
                </button>
                <button onClick={() => { toggleFeatured(viewProduct.id); setViewProduct({...viewProduct, featured: !viewProduct.featured}); }} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <Star className={`w-4 h-4 ${viewProduct.featured ? 'text-amber-400 fill-amber-400' : ''}`} />{viewProduct.featured ? 'Unfeature' : 'Feature'}
                </button>
                {viewProduct.approval !== 'rejected' && <button onClick={() => { setViewProduct(null); setModal({ productId: viewProduct.id, productName: viewProduct.name, action: 'reject' }); }} className="bg-red-50 border border-red-200 text-red-600 font-bold py-2.5 px-4 rounded-lg text-sm hover:bg-red-100 transition-colors">Suspend</button>}
              </div>
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
