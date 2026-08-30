'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type SellerProduct } from '@/lib/modules/seller-api';
import { useSellerList } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { Package, Search, Plus, Upload, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const STATUS_CFG: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-red-50 text-red-700',
};

const PAGE_SIZES = [10, 25, 50] as const;


export default function ProductsPage() {
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(n);
  const { seller } = useSeller();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const productsRes = useSellerList<SellerProduct>(
    (sellerId) => sellerApi.getProducts(sellerId),
  );
  const products = productsRes.rows;

  const filtered = useMemo(() => products.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  ), [products, statusFilter, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedProducts = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  // Reset to page 1 when filters change
  React.useEffect(() => { setPage(1); }, [search, statusFilter, pageSize]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !seller.sellerId) return;
    setDeleting(true);
    try {
      await sellerApi.deleteProduct(seller.sellerId, deleteTarget.id);
      // Reload from API to ensure UI matches server state.
      productsRes.reload();
    } catch {
      // If the delete failed, reload to restore the correct list.
      productsRes.reload();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, seller.sellerId, productsRes]);

  // Summary stats from loaded data
  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    outOfStock: products.filter(p => p.stock === 0).length,
    pending: products.filter(p => p.status === 'pending').length,
  }), [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Package className="w-7 h-7 text-blue-600" />Manage Products</h1><p className="text-sm text-slate-500 mt-1">View and manage your product catalog</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/marketplace/products/bulk-upload" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"><Upload className="w-4 h-4" />Bulk Upload</Link>
          <Link href="/seller/marketplace/products/add" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"><Plus className="w-4 h-4" />Add Product</Link>
        </div>
      </div>

      <SellerDataState
        loading={productsRes.loading}
        error={productsRes.error}
        unavailable={productsRes.unavailable}
        isEmpty={products.length === 0}
        feature="Products"
        onRetry={productsRes.reload}
        emptyTitle="No products yet"
        emptyDescription="Add your first product to start selling on KARTSEEK."
        emptyAction={
          <Link href="/seller/marketplace/products/add" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700">
            <Plus className="w-4 h-4" />Add First Product
          </Link>
        }
      >
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{ l: 'Total Products', v: stats.total, c: 'text-slate-900' }, { l: 'Active', v: stats.active, c: 'text-emerald-600' }, { l: 'Out of Stock', v: stats.outOfStock, c: 'text-red-600' }, { l: 'Pending Approval', v: stats.pending, c: 'text-amber-600' }].map(k => (
            <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">{k.l}</p><p className={`text-2xl font-black mt-1 ${k.c}`}>{k.v}</p></div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="flex flex-wrap gap-1.5">{['all', 'active', 'draft', 'pending', 'rejected'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>))}</div>
        </div>

        {/* Product Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500">Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500">Sold</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div><p className="font-medium text-slate-800 truncate max-w-[250px]">{p.name}</p><p className="text-[10px] text-slate-400">{p.categoryName}{p.hsn ? ` · HSN: ${p.hsn}` : ''}</p></div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3.5 text-right"><p className="font-bold text-slate-900">{fmt(p.price)}</p><p className="text-[10px] text-slate-400 line-through">{fmt(p.mrp)}</p></td>
                    <td className={`px-4 py-3.5 text-right font-bold ${p.stock === 0 ? 'text-red-600' : p.stock < 20 ? 'text-amber-600' : 'text-slate-700'}`}>{p.stock}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600">{p.sold}</td>
                    <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${STATUS_CFG[p.status]}`}>{p.status}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        <Link href={`/seller/marketplace/products/${p.id}/edit`} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Edit className="w-4 h-4" /></Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state with search context */}
          {filtered.length === 0 && products.length > 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">
                No results for &ldquo;{search || statusFilter}&rdquo;
              </p>
              <p className="text-xs text-slate-500 mt-1">Try a different search term or filter</p>
              <button
                type="button"
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Rows per page"
                >
                  {PAGE_SIZES.map(s => (
                    <option key={s} value={s}>{s} per page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="px-3 py-1.5 text-xs font-bold text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </SellerDataState>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteTarget(null)}><DismissOnEscape onDismiss={() => !deleting && setDeleteTarget(null)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">Delete Product?</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  This will permanently remove &ldquo;{deleteTarget.name}&rdquo; from your catalog.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
