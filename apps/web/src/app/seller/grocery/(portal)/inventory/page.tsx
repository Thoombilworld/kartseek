'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ClipboardList, AlertTriangle, RefreshCw, PackageX, Check, X } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Stock levels.
 *
 * The page listed three batches with expiry dates — "Fresh Milk / B-2026-07-08 /
 * Jul 12 / 4 days" — from a `MOCK_DATA` constant, and `groceryApi` was imported
 * and never called. There is no batch or expiry tracking in the grocery schema
 * (`weightVariants` carries `{ weight, price, mrp, stock, sku }` and nothing
 * else), so those columns were describing a feature that does not exist.
 *
 * What the platform does track is per-variant stock, which is what a seller
 * actually needs this screen for — and it is editable here, because previously
 * there was no way to correct a stock level short of the full product editor.
 */
export default function GroceryInventoryPage() {
  return <StoreGate>{(store) => <InventoryContent store={store} />}</StoreGate>;
}

interface Variant { weight: string; price: number; mrp: number; stock: number; sku?: string }
interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  brand?: string;
  isAvailable: boolean;
  weightVariants?: Variant[];
}

function InventoryContent({ store }: { store: GrocerySellerStore }) {
  const { formatPrice } = useGroceryLocale();
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /** productId::weight of the row being edited, and its draft value. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  /**
   * Low stock is decided per variant now, not by one number here.
   *
   * `LOW_STOCK = 10` was applied to every product in the catalogue, so a staple
   * that turns over hundreds a day and a slow-moving speciality line raised the
   * same alert at the same level. The endpoint returns each variant's own
   * threshold.
   */
  const { data: lowStockData, reload: reloadLowStock } = useAsyncData(
    async () => groceryApi.getLowStockVariants(store.id),
    [store.id],
  );
  const lowStockIds = new Set((lowStockData?.items ?? []).map((i) => i.variantId));

  const { data: productsData, loading, error, reload } = useAsyncData<InventoryProduct[]>(
    async () => {
      const res = await groceryApi.getProducts(store.id, undefined, 1, 200);
      return (res?.data ?? []) as unknown as InventoryProduct[];
    },
    [store.id],
  );
  const products = error ? [] : (productsData ?? []);

  const saveStock = async (product: InventoryProduct, weight: string) => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < 0) { setActionError('Stock must be zero or more.'); return; }
    setSaving(true);
    setActionError(null);
    try {
      // A movement, not a rewrite. Sending the whole variant array back to change
      // one number is a read-modify-write over a single jsonb column: two edits
      // at once lost one of them, and nothing recorded what changed or why.
      const variant = (product.weightVariants ?? []).find((v) => v.weight === weight) as any;
      const variantId = variant?.variantId ?? variant?.id;
      if (!variantId) {
        setActionError('This variant has no stock record yet — run the catalogue backfill.');
        return;
      }
      const delta = next - Number(variant?.stock ?? 0);
      if (delta !== 0) {
        await groceryApi.recordStockMovement(store.id, {
          variantId,
          type: 'ADJUSTED',
          quantity: delta,
          reason: 'Manual stock count',
        });
      }
      setEditing(null);
      await Promise.all([reload(), reloadLowStock()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update the stock level');
    } finally {
      setSaving(false);
    }
  };

  // One row per variant — stock is held per variant, not per product.
  const rows = products.flatMap((p) =>
    (p.weightVariants ?? []).map((v) => ({ product: p, variant: v })),
  ).filter(({ product, variant }) => {
    if (onlyLow && !lowStockIds.has((variant as any).variantId ?? (variant as any).id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return product.name?.toLowerCase().includes(q)
      || product.brand?.toLowerCase().includes(q)
      || variant.sku?.toLowerCase().includes(q);
  });

  const lowCount = lowStockData?.total ?? 0;
  const outCount = products.flatMap((p) => p.weightVariants ?? []).filter((v) => Number(v.stock ?? 0) === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-600" /> Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading…' : `${rows.length} variant${rows.length === 1 ? '' : 's'} • ${lowCount} low • ${outCount} out of stock`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOnlyLow((v) => !v)}
            aria-pressed={onlyLow}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${onlyLow ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            <PackageX className="w-4 h-4" /> Low stock only
          </button>
          <button onClick={() => reload()} className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh inventory">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => reload()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, brand or SKU…"
          aria-label="Search inventory"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Variant</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">SKU</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Price</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Stock</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading inventory…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      {error ? 'Inventory unavailable.' : onlyLow ? 'Nothing is running low.' : 'No stock to show — add a product first.'}
                    </p>
                  </td>
                </tr>
              )}
              {rows.map(({ product, variant }) => {
                const key = `${product.id}::${variant.weight}`;
                const stock = Number(variant.stock ?? 0);
                const isLow = lowStockIds.has((variant as any).variantId ?? (variant as any).id);
                const isEditing = editing === key;
                return (
                  <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link href={`/grocery/product/${product.id}`} className="font-semibold text-slate-800 hover:text-blue-600">{product.name}</Link>
                      <p className="text-xs text-slate-400">{product.category}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{variant.weight}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{variant.sku || '—'}</td>
                    <td className="px-4 py-3.5 text-right font-medium">{formatPrice(Number(variant.price))}</td>
                    <td className="px-4 py-3.5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number" min={0} value={draft} autoFocus
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void saveStock(product, variant.weight);
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            aria-label={`Stock for ${product.name} ${variant.weight}`}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-sm text-center outline-none"
                          />
                          <button onClick={() => void saveStock(product, variant.weight)} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50" aria-label="Save"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded" aria-label="Cancel"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditing(key); setDraft(String(stock)); }}
                          className="font-bold text-slate-800 hover:text-blue-600 hover:underline"
                          title="Click to edit stock"
                        >
                          {stock}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {/* "Low" is what the server says for this variant, not a
                          number this file picked for the whole catalogue. */}
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${stock === 0 ? 'bg-red-50 text-red-700' : isLow ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {stock === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
