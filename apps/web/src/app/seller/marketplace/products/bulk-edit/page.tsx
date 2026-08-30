'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Save, Edit3 } from 'lucide-react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';

/**
 * Bulk edit prices and stock.
 *
 * This page was inert end to end. "Save All Changes" and "Export CSV" had no
 * `onClick`; the price and stock inputs were uncontrolled `defaultValue` fields
 * with no `onChange` and no ref, so a keystroke was captured nowhere; the
 * `loading` and `loadError` state was computed and never rendered, so a failed
 * load showed an empty table with no message; and the endpoint it would have
 * called — `POST /sellers/:id/products/bulk-edit` — was not declared by any
 * controller. Nothing in the chain worked, and nothing said so.
 *
 * The route was also orphaned: no link anywhere pointed at it.
 */

interface Row {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  status: string;
}

/** A pending edit, keyed by product id. Only changed fields are sent. */
type Draft = Partial<Pick<Row, 'price' | 'stock'>>;

export default function BulkEditProductsPage() {
  const { seller } = useSeller();
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<
    { updated: number; failed: { productId: string; reason: string }[] } | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = React.useCallback(() => {
    if (!seller.sellerId) return;
    setLoading(true);
    sellerApi.getProducts(seller.sellerId)
      .then((res: any) => {
        const list: any[] = res?.data ?? [];
        setRows(list.map((p) => ({
          id: p.id,
          name: p.name ?? 'Product',
          sku: p.sku ?? null,
          price: Number(p.price) || 0,
          stock: Number(p.stock ?? p.stockQuantity) || 0,
          // Was `p.status.replace('_',' ')`, which throws on a product whose
          // status is null and takes the whole page down with it.
          status: String(p.status ?? 'UNKNOWN'),
        })));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        setRows([]);
        setLoadError(e instanceof Error ? e.message : 'Could not load your products.');
      })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  useEffect(() => { load(); }, [load]);

  const edited = useMemo(
    () => Object.entries(drafts).filter(([, d]) => d.price !== undefined || d.stock !== undefined),
    [drafts],
  );

  const setDraft = (id: string, field: keyof Draft, raw: string) => {
    const value = raw === '' ? undefined : Number(raw);
    setResult(null);
    setDrafts((prev) => {
      const row = rows.find((r) => r.id === id);
      const next = { ...prev[id], [field]: value };
      // Typing a value back to its original is not an edit.
      if (row && next[field] === row[field]) delete next[field];
      const cleaned = { ...prev, [id]: next };
      if (next.price === undefined && next.stock === undefined) delete cleaned[id];
      return cleaned;
    });
  };

  const saveAll = async () => {
    if (edited.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setResult(null);
    try {
      const res: any = await sellerApi.bulkEditProducts(
        seller.sellerId,
        edited.map(([productId, d]) => ({ productId, ...d })),
      );
      const failed = res?.failed ?? res?.data?.failed ?? [];
      const updated = res?.updated ?? res?.data?.updated ?? 0;
      setResult({ updated, failed });
      // Only the rows that saved stop being drafts — the rest stay editable
      // with their values intact, which is the point of reporting per-row.
      const failedIds = new Set(failed.map((f: any) => f.productId));
      setDrafts((prev) => Object.fromEntries(
        Object.entries(prev).filter(([id]) => failedIds.has(id)),
      ));
      load();
    } catch (e) {
      setSaveError(e instanceof Error
        ? e.message
        : 'We could not save these changes. Your edits are still here — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Bulk Edit Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {edited.length === 0
              ? 'Change prices and stock levels, then save them together'
              : `${edited.length} ${edited.length === 1 ? 'product' : 'products'} edited`}
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || edited.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : `Save ${edited.length || ''} Change${edited.length === 1 ? '' : 's'}`.trim()}
        </button>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-bold">Couldn&apos;t load your products.</span> {loadError}{' '}
          <button onClick={load} className="underline font-semibold">Try again</button>
        </div>
      )}

      {saveError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {saveError}
        </div>
      )}

      {result && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            result.failed.length === 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <p className="font-bold">
            {result.updated} updated
            {result.failed.length > 0 && `, ${result.failed.length} could not be saved`}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {result.failed.map((f) => (
                <li key={f.productId}>
                  {rows.find((r) => r.id === f.productId)?.name ?? f.productId}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-100">
                {['Product', 'SKU', 'Price', 'Stock', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Loading your products…</td></tr>
              )}
              {!loading && rows.length === 0 && !loadError && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  <Edit3 className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  You have no products to edit yet.
                </td></tr>
              )}
              {rows.map((p) => {
                const draft = drafts[p.id] ?? {};
                const dirty = draft.price !== undefined || draft.stock !== undefined;
                return (
                  <tr key={p.id} className={`border-b border-slate-50 transition-colors ${dirty ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3.5 font-bold text-sm text-slate-800">{p.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <input
                        aria-label={`Price for ${p.name}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.price ?? p.price}
                        onChange={(e) => setDraft(p.id, 'price', e.target.value)}
                        className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        aria-label={`Stock for ${p.name}`}
                        type="number"
                        min={0}
                        step="1"
                        value={draft.stock ?? p.stock}
                        onChange={(e) => setDraft(p.id, 'stock', e.target.value)}
                        className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>{p.status.replace(/_/g, ' ')}</span>
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
