'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { useCategoryAttributes } from '@/lib/marketplace/use-category-attributes';
import {
  swatchFill, optionHex, isColourAxis, indexAttributes, findAttribute,
  type CategoryAttribute,
} from '@/lib/marketplace/variant-display';
import { Layers, Plus, Trash2, Check, X, AlertCircle, Info, Store } from 'lucide-react';

/**
 * Product variants — the size/colour/configuration options of a listing.
 *
 * The page is a matrix rather than a list, because the matrix is the seller's
 * mental model: a product comes in colours *across* sizes, and what they need to
 * see is the shape of the range. The previous form added one SKU at a time
 * through a flat row of inputs, so building a 3-colour × 3-storage phone meant
 * nine separate adds with no view of what had been built — and no way at all to
 * notice that a whole storage tier had never been listed.
 *
 * The combinations that do *not* exist are drawn as loudly as the ones that do.
 * That is deliberate: a seller's revenue problem is usually the hole in the
 * range, not the rows already filled in, and a list can only show what is there.
 *
 * Axes and their values come from the category's attribute schema — the same
 * definitions the Super Admin panel authors and the storefront draws its pickers
 * from — so what a seller lists is exactly what a shopper can filter on. A
 * category with nothing configured still works: the axes fall back to whatever
 * the existing variants carry, and to free text when there are none.
 */

interface Variant {
  id: string;
  sku: string;
  variantName: string;
  attributes: Record<string, string>;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

/** One pickable dimension, with the schema entry that says how to draw it. */
interface Axis {
  /** The key used inside `variant.attributes` — the seller's own spelling. */
  name: string;
  label: string;
  attribute: CategoryAttribute | null;
  isColour: boolean;
  values: string[];
}

const LOW_STOCK_FALLBACK = 5;

/** Values in schema order first, then anything a variant uses that the schema doesn't list. */
function mergeValues(schemaLabels: string[], seen: string[]): string[] {
  const out = [...schemaLabels];
  for (const value of seen) {
    if (!out.some((v) => v.toLowerCase() === value.toLowerCase())) out.push(value);
  }
  return out;
}

export default function ProductVariantsPage() {
  const params = useParams();
  const productId = String(params?.id ?? '');
  const { seller } = useSeller();
  const { format: money } = useSellerMoney();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);
  /** The cell the seller is looking at: axis name → chosen value. */
  const [cursor, setCursor] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{ sku: string; sellingPrice: string; mrp: string; stockQuantity: string } | null>(null);
  /** Free-text create, used only when the category defines no axes at all. */
  const [freeDraft, setFreeDraft] = useState({ sku: '', option: '', value: '', sellingPrice: '', mrp: '', stockQuantity: '' });

  const res = useSellerData<{ data: Variant[] }>(
    (sellerId) => sellerApi.getProductVariants(sellerId, productId) as any,
    [productId],
  );
  const variants = useMemo(() => (res.data?.data ?? []) as Variant[], [res.data]);

  // Fetched only to learn the category — that is what selects the schema.
  const productRes = useSellerData<any>(
    (sellerId) => sellerApi.getProductById(sellerId, productId) as any,
    [productId],
  );
  const product = productRes.data?.data ?? productRes.data;
  const categoryKey: string | undefined =
    product?.subcategory?.slug ?? product?.category?.slug ?? product?.category?.id ?? undefined;

  const { schema, loading: schemaLoading } = useCategoryAttributes(categoryKey);

  /**
   * The axes, from the schema where it has an opinion and from the variants
   * otherwise.
   *
   * A colour axis is sorted first because it becomes the row label, where the
   * swatch can carry it; everything else reads better across the top.
   */
  const axes = useMemo<Axis[]>(() => {
    const index = indexAttributes(schema);
    const declared = (schema?.data ?? []).filter((a) => a.isVariantAxis);

    const seenValues = new Map<string, string[]>();
    for (const variant of variants) {
      for (const [key, value] of Object.entries(variant.attributes ?? {})) {
        if (!value) continue;
        seenValues.set(key, [...(seenValues.get(key) ?? []), String(value)]);
      }
    }

    const built: Axis[] = [];
    const claimed = new Set<string>();

    for (const attr of declared) {
      // The variants may spell the axis by name or by slug; either binds here.
      const key = [...seenValues.keys()].find(
        (k) => k.toLowerCase() === attr.name.toLowerCase() || k.toLowerCase() === attr.slug.toLowerCase(),
      ) ?? attr.name;
      claimed.add(key);
      built.push({
        name: key,
        label: attr.name,
        attribute: attr,
        isColour: isColourAxis(attr.name, attr),
        values: mergeValues(
          (attr.options ?? []).map((o) => o.label),
          [...new Set(seenValues.get(key) ?? [])],
        ),
      });
    }

    // Axes a seller created before the schema described them, or after an admin
    // removed one. Dropping these would hide SKUs that are genuinely on sale.
    for (const [key, values] of seenValues) {
      if (claimed.has(key)) continue;
      const attr = findAttribute(index, key);
      built.push({
        name: key,
        label: attr?.name ?? key,
        attribute: attr,
        isColour: isColourAxis(key, attr),
        values: [...new Set(values)],
      });
    }

    return built
      .filter((a) => a.values.length > 0)
      .sort((a, b) => Number(b.isColour) - Number(a.isColour));
  }, [schema, variants]);

  const rowAxis = axes[0] ?? null;
  const colAxis = axes[1] ?? null;
  /** Axes beyond the two the grid can show; the grid renders one slice of them. */
  const sliceAxes = axes.slice(2);

  // Keep the cursor on a real combination as the axes resolve.
  const cursorFor = useCallback((partial: Record<string, string>) => {
    const next: Record<string, string> = {};
    for (const axis of axes) next[axis.name] = partial[axis.name] ?? axis.values[0];
    return next;
  }, [axes]);

  const active = useMemo(() => cursorFor(cursor), [cursor, cursorFor]);

  const findVariant = useCallback((combination: Record<string, string>) => variants.find((v) =>
    axes.every((axis) => (v.attributes?.[axis.name] ?? '') === combination[axis.name])),
  [variants, axes]);

  /** Every combination the axes allow — the denominator for "not listed". */
  const totalCombinations = useMemo(
    () => axes.reduce((n, axis) => n * axis.values.length, axes.length ? 1 : 0),
    [axes],
  );

  const tally = useMemo(() => {
    const listed = variants.length;
    const low = variants.filter((v) => v.stockQuantity > 0
      && v.stockQuantity <= (v.lowStockThreshold || LOW_STOCK_FALLBACK)).length;
    const blocked = variants.filter((v) => v.stockQuantity === 0).length;
    return { listed, low, blocked, gap: Math.max(totalCombinations - listed, 0) };
  }, [variants, totalCombinations]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const run = useCallback(async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setError(null);
    try {
      await fn();
      res.reload();
      say(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work — please try again.');
      return false;
    } finally { setBusy(false); }
  }, [res]);

  /** Open the create panel for the combination the seller clicked. */
  const openDraft = (combination: Record<string, string>) => {
    setCursor(combination);
    setError(null);
    const suggested = axes
      .map((axis) => combination[axis.name])
      .filter(Boolean)
      .join('-')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-');
    setDraft({ sku: suggested, sellingPrice: '', mrp: '', stockQuantity: '' });
  };

  const createFromDraft = async () => {
    if (!draft) return;
    if (!draft.sku.trim()) { setError('A SKU is required.'); return; }
    if (!Number(draft.sellingPrice)) { setError('A selling price greater than zero is required.'); return; }

    const attributes: Record<string, string> = {};
    for (const axis of axes) attributes[axis.name] = active[axis.name];

    const ok = await run(() => sellerApi.createProductVariant(seller.sellerId, productId, {
      sku: draft.sku.trim(),
      attributes,
      sellingPrice: Number(draft.sellingPrice),
      mrp: Number(draft.mrp) || Number(draft.sellingPrice),
      stockQuantity: Number(draft.stockQuantity) || 0,
    }), 'Variant created');
    if (ok) setDraft(null);
  };

  const createFree = async () => {
    if (!freeDraft.sku.trim()) { setError('A SKU is required.'); return; }
    if (!Number(freeDraft.sellingPrice)) { setError('A selling price greater than zero is required.'); return; }
    if (freeDraft.option.trim() && !freeDraft.value.trim()) {
      setError(`Choose a ${freeDraft.option} value for this variant.`); return;
    }
    const ok = await run(() => sellerApi.createProductVariant(seller.sellerId, productId, {
      sku: freeDraft.sku.trim(),
      attributes: freeDraft.option.trim() ? { [freeDraft.option.trim()]: freeDraft.value.trim() } : {},
      sellingPrice: Number(freeDraft.sellingPrice),
      mrp: Number(freeDraft.mrp) || Number(freeDraft.sellingPrice),
      stockQuantity: Number(freeDraft.stockQuantity) || 0,
    }), 'Variant created');
    if (ok) setFreeDraft({ sku: '', option: '', value: '', sellingPrice: '', mrp: '', stockQuantity: '' });
  };

  const fillFor = (axis: Axis, value: string) =>
    (axis.isColour ? swatchFill(value, optionHex(axis.attribute, value)) : null);

  const field = 'border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
  const selectedVariant = findVariant(active);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/seller/marketplace/products/${productId}`} className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1">
          ← Back to product
        </Link>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" aria-hidden />
              Product Variants
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {product?.name
                ? <>Building the sellable range for <span className="font-semibold text-slate-700">{product.name}</span>.</>
                : 'Sizes, colours and configurations, each with its own price and stock.'}
            </p>
          </div>

          {/* Summary before detail: the four numbers that decide what to do next. */}
          {axes.length > 0 && (
            <dl className="flex flex-wrap gap-x-6 gap-y-2">
              <Tally value={tally.listed} label="Listed" />
              <Tally value={tally.low} label="Low stock" tone="amber" />
              <Tally value={tally.blocked} label="Can't be bought" tone="red" />
              <Tally value={tally.gap} label="Not listed" tone="slate" />
            </dl>
          )}
        </div>
      </div>

      {/* ── The matrix ─────────────────────────────────────────────────────── */}
      {axes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">The range</h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Every cell is one SKU. A dashed cell is a combination you don’t sell yet — click it to create one.
              </p>
            </div>
            {schema?.category && (
              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                Options from <span className="font-semibold text-slate-700">{schema.category.name}</span>
              </span>
            )}
          </div>

          {/* With more than two axes the grid shows one slice; this picks it. */}
          {sliceAxes.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 pb-1">
              {sliceAxes.map((axis) => (
                <label key={axis.name} className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wide">{axis.label}</span>
                  <select
                    value={active[axis.name]}
                    onChange={(e) => setCursor({ ...active, [axis.name]: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {axis.values.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}

          <SellerDataState
            loading={res.loading} error={res.error} unavailable={res.unavailable}
            isEmpty={false} feature="Variants" onRetry={res.reload}
          >
            <div className="overflow-x-auto -mx-1 px-1">
              <div
                className="grid gap-2 min-w-xl"
                style={{ gridTemplateColumns: `minmax(9rem, 11rem) repeat(${colAxis ? colAxis.values.length : 1}, minmax(10rem, 1fr))` }}
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 self-end pb-2">
                  {rowAxis?.label}{colAxis ? ` ╲ ${colAxis.label}` : ''}
                </div>

                {(colAxis ? colAxis.values : ['']).map((colValue) => (
                  <div key={colValue || 'single'} className="self-end pb-2 border-b border-slate-300 text-sm font-bold text-slate-800">
                    {colValue || ' '}
                  </div>
                ))}

                {rowAxis?.values.map((rowValue) => {
                  const fill = fillFor(rowAxis, rowValue);
                  return (
                    <React.Fragment key={rowValue}>
                      <div className="flex items-center gap-2.5 pr-3 border-r border-slate-100">
                        {rowAxis.isColour && (
                          <span
                            className="w-5 h-5 rounded-full shrink-0 border border-black/25 dark:border-white/40"
                            style={{ backgroundColor: fill ?? '#e2e8f0' }}
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-800 truncate">{rowValue}</span>
                          {rowAxis.isColour && (
                            <span className="block text-[11px] font-mono text-slate-400">{fill ?? 'no swatch set'}</span>
                          )}
                        </span>
                      </div>

                      {(colAxis ? colAxis.values : ['']).map((colValue) => {
                        const combination = { ...active, [rowAxis.name]: rowValue };
                        if (colAxis) combination[colAxis.name] = colValue;
                        const variant = findVariant(combination);
                        const isCursor = axes.every((a) => active[a.name] === combination[a.name]);

                        return (
                          <Cell
                            key={rowValue + '|' + colValue}
                            variant={variant}
                            money={money}
                            selected={isCursor}
                            editing={variant ? editing === variant.id : false}
                            editStock={editStock}
                            busy={busy}
                            label={`${rowValue}${colValue ? ' ' + colValue : ''}`}
                            onSelect={() => { setCursor(combination); setDraft(null); }}
                            onCreate={() => openDraft(combination)}
                            onEditStock={(v) => setEditStock(v)}
                            onBeginEdit={() => { if (variant) { setEditing(variant.id); setEditStock(variant.stockQuantity); } }}
                            onCancelEdit={() => setEditing(null)}
                            onSaveStock={() => {
                              if (!variant) return;
                              void run(
                                () => sellerApi.updateProductVariant(seller.sellerId, productId, variant.id, { stockQuantity: editStock }),
                                'Stock updated',
                              ).then(() => setEditing(null));
                            }}
                            onDelete={() => {
                              if (!variant) return;
                              void run(
                                () => sellerApi.deleteProductVariant(seller.sellerId, productId, variant.id),
                                'Variant deleted',
                              );
                            }}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </SellerDataState>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}
        </div>
      )}

      {/* ── Create the combination the seller clicked ───────────────────────── */}
      {draft && (
        <div className="bg-white border-2 border-blue-500 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900 text-sm">
              Create {axes.map((a) => active[a.name]).filter(Boolean).join(' · ')}
            </h2>
            <button onClick={() => setDraft(null)} className="p-1.5 rounded hover:bg-slate-100" aria-label="Cancel">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="SKU *" className={field} aria-label="SKU" />
            <input value={draft.sellingPrice} onChange={(e) => setDraft({ ...draft, sellingPrice: e.target.value })} placeholder="Price *" inputMode="decimal" className={field} aria-label="Selling price" />
            <input value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} placeholder="MRP" inputMode="decimal" className={field} aria-label="Maximum retail price" />
            <input value={draft.stockQuantity} onChange={(e) => setDraft({ ...draft, stockQuantity: e.target.value })} placeholder="Stock" inputMode="numeric" className={field} aria-label="Stock quantity" />
            <button onClick={createFromDraft} disabled={busy} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-bold px-4 py-2.5">
              <Plus className="w-4 h-4" />Create
            </button>
          </div>
          {error && <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}
        </div>
      )}

      {/* ── Shopper preview ─────────────────────────────────────────────────── */}
      {axes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 grid gap-6 md:grid-cols-2 md:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" aria-hidden />Shopper preview
            </p>
            <h2 className="font-bold text-slate-900 text-sm mt-1">What a customer sees</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md">
              {selectedVariant
                ? selectedVariant.stockQuantity === 0
                  ? <>Shoppers can pick this option, but Add to Cart stays disabled while stock is zero.</>
                  : <>Live on the storefront as {axes.map((a) => active[a.name]).join(' · ')}.</>
                : <>Nothing listed for {axes.map((a) => active[a.name]).join(' · ')}. Shoppers who choose this pair are told the combination isn’t offered.</>}
            </p>

            <dl className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">SKU</dt>
                <dd className="text-sm font-mono font-bold text-slate-800 text-right break-all">
                  {selectedVariant?.sku ?? 'Not created'}
                </dd>
              </div>
              {rowAxis && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {active[rowAxis.name]} row
                  </dt>
                  <dd className="text-sm font-mono font-bold text-slate-800">
                    {(colAxis ? colAxis.values : ['']).filter((c) => {
                      const combo = { ...active, [rowAxis.name]: active[rowAxis.name] };
                      if (colAxis) combo[colAxis.name] = c;
                      return !!findVariant(combo);
                    }).length} of {colAxis ? colAxis.values.length : 1} listed
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="space-y-3">
            <p className="text-2xl font-black text-slate-900">
              {selectedVariant ? money(selectedVariant.sellingPrice) : '—'}
              {selectedVariant && selectedVariant.mrp > selectedVariant.sellingPrice && (
                <span className="ml-2 text-sm font-medium text-slate-400 line-through">{money(selectedVariant.mrp)}</span>
              )}
            </p>

            {axes.map((axis) => (
              <div key={axis.name} className="flex flex-wrap items-center gap-2">
                {axis.isColour
                  ? axis.values.map((v) => {
                      const fill = fillFor(axis, v);
                      const on = active[axis.name] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCursor({ ...active, [axis.name]: v })}
                          aria-label={v}
                          aria-pressed={on}
                          title={v}
                          className={`w-8 h-8 rounded-full p-0.5 border-2 bg-transparent ${on ? 'border-blue-600' : 'border-transparent hover:border-slate-300'}`}
                        >
                          <span className="block w-full h-full rounded-full border border-black/25" style={{ backgroundColor: fill ?? '#e2e8f0' }} />
                        </button>
                      );
                    })
                  : axis.values.map((v) => {
                      const on = active[axis.name] === v;
                      const combo = { ...active, [axis.name]: v };
                      const exists = !!findVariant(combo);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCursor(combo)}
                          aria-pressed={on}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border bg-transparent transition-colors ${
                            on ? 'border-blue-600 text-blue-700 ring-1 ring-blue-200'
                               : exists ? 'border-slate-200 text-slate-600 hover:border-blue-300'
                                        : 'border-dashed border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
              </div>
            ))}

            {!selectedVariant && (
              <button
                onClick={() => openDraft(active)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold px-4 py-2.5"
              >
                <Plus className="w-4 h-4" />Create this SKU
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── No schema, no variants: the original free-text path ─────────────── */}
      {axes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 text-sm mb-1">Add a variant</h2>
          {!schemaLoading && (
            <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              This product’s category has no variant options configured yet, so the option and value are free text.
              Ask an administrator to add them under Category Attributes for consistent filters and colour swatches.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input value={freeDraft.sku} onChange={(e) => setFreeDraft({ ...freeDraft, sku: e.target.value })} placeholder="SKU *" className={field} aria-label="SKU" />
            <input value={freeDraft.option} onChange={(e) => setFreeDraft({ ...freeDraft, option: e.target.value })} placeholder="Option (Size)" className={field} aria-label="Variant option" />
            <input value={freeDraft.value} onChange={(e) => setFreeDraft({ ...freeDraft, value: e.target.value })} placeholder="Value (M)" className={field} aria-label="Variant value" />
            <input value={freeDraft.sellingPrice} onChange={(e) => setFreeDraft({ ...freeDraft, sellingPrice: e.target.value })} placeholder="Price *" inputMode="decimal" className={field} aria-label="Selling price" />
            <input value={freeDraft.stockQuantity} onChange={(e) => setFreeDraft({ ...freeDraft, stockQuantity: e.target.value })} placeholder="Stock" inputMode="numeric" className={field} aria-label="Stock quantity" />
            <button onClick={createFree} disabled={busy} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-bold px-4 py-2.5">
              <Plus className="w-4 h-4" />Add
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <SellerDataState
              loading={res.loading} error={res.error} unavailable={res.unavailable}
              isEmpty={variants.length === 0} feature="Variants" onRetry={res.reload}
              emptyTitle="No variants yet"
              emptyDescription="Add one if this product comes in more than one size, colour or configuration."
              emptyIcon={Layers}
            >
              <ul className="divide-y divide-slate-100">
                {variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800 truncate">
                        {v.variantName || Object.entries(v.attributes ?? {}).map(([k, val]) => `${k}: ${val}`).join(', ') || '—'}
                      </span>
                      <span className="block text-xs font-mono text-slate-400">{v.sku}</span>
                    </span>
                    <span className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-bold text-slate-900">{money(v.sellingPrice)}</span>
                      <span className="text-xs text-slate-500">{v.stockQuantity} left</span>
                      <button
                        onClick={() => void run(() => sellerApi.deleteProductVariant(seller.sellerId, productId, v.id), 'Variant deleted')}
                        disabled={busy}
                        className="p-1.5 rounded hover:bg-red-50"
                        aria-label={`Delete ${v.sku}`}
                      ><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </SellerDataState>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl">{toast}</div>
      )}
    </div>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Tally({ value, label, tone = 'blue' }: { value: number; label: string; tone?: 'blue' | 'amber' | 'red' | 'slate' }) {
  // The attention colours only apply when there is something to attend to.
  // Painting a zero amber spends the signal on nothing, and then it means
  // nothing when a number genuinely needs it.
  const active = value > 0;
  const colour = !active ? 'text-slate-300'
    : tone === 'amber' ? 'text-amber-600'
    : tone === 'red' ? 'text-red-600'
    : tone === 'slate' ? 'text-slate-400'
    : 'text-slate-900';
  return (
    <div>
      <dd className={`text-2xl font-black leading-none tabular-nums ${colour}`}>{value}</dd>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-1">{label}</dt>
    </div>
  );
}

function Cell({
  variant, money, selected, editing, editStock, busy, label,
  onSelect, onCreate, onBeginEdit, onCancelEdit, onSaveStock, onEditStock, onDelete,
}: {
  variant?: Variant;
  money: (n: number) => string;
  selected: boolean;
  editing: boolean;
  editStock: number;
  busy: boolean;
  label: string;
  onSelect: () => void;
  onCreate: () => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSaveStock: () => void;
  onEditStock: (n: number) => void;
  onDelete: () => void;
}) {
  // A gap in the range is drawn, not hidden — the holes are the seller's
  // problem, and a list can only ever show what is already there.
  if (!variant) {
    return (
      <button
        type="button"
        onClick={onCreate}
        aria-label={`${label}: not listed. Create this SKU.`}
        className={`flex flex-col items-center justify-center gap-1 min-h-22 rounded-lg border-[1.5px] border-dashed bg-transparent transition-colors ${
          selected ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'
        }`}
      >
        <Plus className="w-4 h-4" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wide">Not listed</span>
      </button>
    );
  }

  const threshold = variant.lowStockThreshold || LOW_STOCK_FALLBACK;
  const out = variant.stockQuantity === 0;
  const low = !out && variant.stockQuantity <= threshold;

  return (
    <div
      className={`rounded-lg border bg-white p-3 flex flex-col gap-1.5 transition-shadow ${
        selected ? 'border-blue-600 ring-1 ring-blue-200' : 'border-slate-200 hover:shadow-md'
      }`}
    >
      <button type="button" onClick={onSelect} className="text-left bg-transparent" aria-label={`Preview ${label}`}>
        <span className="block text-lg font-black text-slate-900 leading-none tabular-nums">{money(variant.sellingPrice)}</span>
      </button>

      {/* State in form as well as number, so what needs attention reads at a glance. */}
      {editing ? (
        <span className="flex items-center gap-1">
          <input
            type="number"
            value={editStock}
            onChange={(e) => onEditStock(Number(e.target.value))}
            className="w-16 border border-slate-200 rounded px-2 py-1 text-sm text-right"
            aria-label={`Stock for ${label}`}
          />
          <button onClick={onSaveStock} disabled={busy} className="p-1 rounded bg-emerald-50" aria-label="Save stock">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          </button>
          <button onClick={onCancelEdit} className="p-1 rounded bg-slate-100" aria-label="Cancel">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={onBeginEdit}
          className={`self-start text-[11px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-transparent ${
            out ? 'bg-red-50 text-red-700 border border-red-200'
                : low ? 'bg-amber-100 text-amber-800'
                      : 'text-slate-500 hover:text-blue-600'
          }`}
          aria-label={`Edit stock for ${label}`}
        >
          {out ? "0 left · can't be bought" : low ? `${variant.stockQuantity} left · restock` : `${variant.stockQuantity} left`}
        </button>
      )}

      <span className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-[11px] font-mono text-slate-400 truncate" title={variant.sku}>{variant.sku}</span>
        <button
          onClick={onDelete}
          disabled={busy}
          className="p-1 rounded hover:bg-red-50 shrink-0"
          aria-label={`Delete ${variant.sku}`}
        ><Trash2 className="w-3 h-3 text-red-500" /></button>
      </span>
    </div>
  );
}
