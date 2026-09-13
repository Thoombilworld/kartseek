'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import {
  type CategoryAttribute,
  type CategoryAttributeSchema,
  indexAttributes,
  findAttribute,
  isColourAxis,
  optionHex,
  swatchFill,
} from '@/lib/marketplace/variant-display';

/**
 * The product detail page's single source of truth for "which SKU is the
 * shopper looking at".
 *
 * Three components on this page each answered that question separately and got
 * three different answers:
 *
 *  - `VariantSelector` re-fetched `/products/:id/variants` from the browser and
 *    read `res.data` as an array. The endpoint returns
 *    `{ data: { productId, variants, total } }`, so `data` was an object: the
 *    `.find()` immediately after threw, the catch swallowed it, and the object
 *    was already in state — where `variants.flatMap` threw again during render.
 *    It also read `stock`, `priceOverride` and `name`, none of which exist on
 *    the response (`stockQuantity`, `sellingPrice`, `variantName`), so even a
 *    correctly-shaped list would have shown every option out of stock.
 *  - `ProductActions` rendered a *second*, unrelated set of variant buttons off
 *    `metadata.variantDimensions`, defaulted them to the first option, and put
 *    `JSON.stringify(selection)` in the cart line's `variantId` — a string no
 *    order can resolve to a SKU — while charging the parent listing's price
 *    whatever was selected.
 *  - The gallery had no idea a variant existed, so picking a colour never
 *    changed the photograph.
 *
 * Selection lives here once, keyed by axis, and the SKU is derived from it. The
 * server already sends the variants with the product, so nothing is re-fetched.
 */

/** One purchasable SKU, normalised from the catalogue response. */
export interface Variant {
  id: string;
  sku: string;
  name: string;
  /** Axis → value, e.g. `{ Colour: 'Midnight Black', Storage: '256GB' }`. */
  attributes: Record<string, string>;
  mrp: number;
  price: number;
  stock: number;
  images: string[];
}

/** One pickable axis, with the schema entry that says how to draw it. */
export interface VariantAxis {
  name: string;
  values: string[];
  attribute: CategoryAttribute | null;
  isColour: boolean;
}

interface VariantContextValue {
  variants: Variant[];
  axes: VariantAxis[];
  /** Axis → chosen value. Partial until every axis has been picked. */
  selection: Record<string, string>;
  select: (axis: string, value: string) => void;
  /** The SKU matching the full selection, or null while it is incomplete. */
  selected: Variant | null;
  /** Price to charge: the selected SKU's, else the product's buy-box price. */
  effectivePrice: number;
  effectiveMrp: number;
  /** Images to show: the selected SKU's own, else the product's. */
  images: string[];
  /** Whether choosing `value` on `axis` leads to any in-stock SKU. */
  isAvailable: (axis: string, value: string) => boolean;
  /** Whether any SKU exists at all for `value` on `axis`. */
  exists: (axis: string, value: string) => boolean;
  /** Swatch fill for a colour value, or null when it cannot be known. */
  fillFor: (axis: VariantAxis, value: string) => string | null;
  /** True once every axis has a value — what "ready to buy" means here. */
  isComplete: boolean;
  /**
   * Units the shopper can buy right now: the selected SKU's stock, or the
   * buy-box offer's stock for a product without SKUs. Zero while a variant
   * product has no complete selection.
   */
  availableStock: number;
  /** How many the shopper wants. Clamped to `[1, availableStock]`. */
  quantity: number;
  setQuantity: (quantity: number) => void;
  /** Why Add to Cart is disabled, or null when it is not. */
  blockedReason: 'select_options' | 'out_of_stock' | 'unavailable' | null;
}

const VariantContext = createContext<VariantContextValue | null>(null);

/** Postgres `decimal` arrives as a string ("119999.00"); `Number` it once. */
const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** `imageUrls` is a `simple-array` column: an array over JSON, CSV over gRPC. */
function variantImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((u) => String(u).trim()).filter(Boolean);
  if (typeof raw === 'string')
    return raw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  return [];
}

export function normaliseVariants(raw: any): Variant[] {
  const rows: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.variants) ? raw.variants : [];
  return rows
    .filter((v) => v?.id && v?.isActive !== false)
    .map((v) => ({
      id: String(v.id),
      sku: String(v.sku ?? ''),
      name: String(v.variantName ?? v.name ?? v.sku ?? ''),
      attributes: v.attributes && typeof v.attributes === 'object' ? v.attributes : {},
      mrp: num(v.mrp),
      price: num(v.sellingPrice ?? v.priceOverride ?? v.price) || num(v.mrp),
      stock: num(v.stockQuantity ?? v.stock),
      images: variantImages(v.imageUrls ?? v.images),
    }))
    .filter((v) => Object.keys(v.attributes).length > 0);
}

export function VariantProvider({
  rawVariants,
  categorySlug,
  basePrice,
  baseMrp,
  baseImages,
  baseStock = 0,
  offered = true,
  children,
}: {
  rawVariants: any;
  categorySlug?: string;
  basePrice: number;
  baseMrp: number;
  baseImages: string[];
  /** The buy-box offer's stock, for a product that has no SKUs. */
  baseStock?: number;
  /** False when no seller offers the product in this market. */
  offered?: boolean;
  children: React.ReactNode;
}) {
  const variants = useMemo(() => normaliseVariants(rawVariants), [rawVariants]);
  const [quantity, setQuantityState] = useState(1);
  const [schema, setSchema] = useState<CategoryAttributeSchema | null>(null);

  // The category's attribute schema is what says a "Shade" axis is a colour and
  // that "Titanium Natural" is #878681. It is an enhancement, not a dependency:
  // a category with no schema configured still gets working pickers, drawn from
  // the axis names the variants themselves carry.
  useEffect(() => {
    if (!categorySlug) return;
    let cancelled = false;
    apiFetch(`/marketplace/categories/${encodeURIComponent(categorySlug)}/attributes`, {
      signal: AbortSignal.timeout(6000),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setSchema(json?.data ?? json);
      })
      .catch(() => {
        /* pickers fall back to the variants' own axis names */
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  const attributeIndex = useMemo(() => indexAttributes(schema), [schema]);

  /**
   * The axes, in the order the admin panel declared them.
   *
   * Ordering matters on a phone, where only the first picker is above the fold:
   * colour before storage is the convention every large storefront follows, and
   * `sortOrder` on the attribute is where that decision is recorded. Axes with
   * no schema entry keep the order they appear in on the variants.
   */
  const axes = useMemo<VariantAxis[]>(() => {
    const byAxis = new Map<string, Set<string>>();
    for (const variant of variants) {
      for (const [axis, value] of Object.entries(variant.attributes)) {
        if (value === undefined || value === null || value === '') continue;
        const values = byAxis.get(axis) ?? new Set<string>();
        values.add(String(value));
        byAxis.set(axis, values);
      }
    }
    const list = [...byAxis.entries()].map(([name, values]) => {
      const attribute = findAttribute(attributeIndex, name);
      return { name, values: [...values], attribute, isColour: isColourAxis(name, attribute) };
    });
    return list.sort((a, b) => {
      const orderA = a.attribute?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.attribute?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [variants, attributeIndex]);

  /**
   * Opening selection: the cheapest in-stock SKU, or the cheapest one if the
   * whole product is out of stock.
   *
   * Deliberately not "the first option of each axis" — that combination is
   * frequently one that does not exist, which is how the old buttons could show
   * a selection no seller offers.
   */
  const [selection, setSelection] = useState<Record<string, string>>({});
  useEffect(() => {
    if (variants.length === 0) {
      setSelection({});
      return;
    }
    const inStock = variants.filter((v) => v.stock > 0);
    const opening = (inStock.length ? inStock : variants)
      .slice()
      .sort((a, b) => a.price - b.price)[0];
    setSelection({ ...opening.attributes });
  }, [variants]);

  /**
   * Pick a value, keeping the rest of the selection wherever a SKU still
   * exists for it.
   *
   * Choosing "Red" when the current size is not made in red must not leave the
   * page on a combination nothing is sold under. The nearest real SKU — same
   * new value, as much of the old selection as survives, cheapest in stock —
   * is what a shopper means by that click.
   */
  const select = useCallback(
    (axis: string, value: string) => {
      setSelection((prev) => {
        const wanted = { ...prev, [axis]: value };
        const exact = variants.find((v) =>
          Object.entries(wanted).every(([k, val]) => v.attributes[k] === val),
        );
        if (exact) return wanted;

        const candidates = variants.filter((v) => v.attributes[axis] === value);
        if (candidates.length === 0) return prev;

        const score = (v: Variant) =>
          Object.entries(prev).filter(([k, val]) => k !== axis && v.attributes[k] === val).length;
        const best = candidates.slice().sort((a, b) => {
          const overlap = score(b) - score(a);
          if (overlap !== 0) return overlap;
          const stock = Number(b.stock > 0) - Number(a.stock > 0);
          if (stock !== 0) return stock;
          return a.price - b.price;
        })[0];
        return { ...best.attributes };
      });
    },
    [variants],
  );

  const selected = useMemo(() => {
    if (variants.length === 0 || axes.length === 0) return null;
    if (axes.some((axis) => !selection[axis.name])) return null;
    return (
      variants.find((v) =>
        axes.every((axis) => v.attributes[axis.name] === selection[axis.name]),
      ) ?? null
    );
  }, [variants, axes, selection]);

  const exists = useCallback(
    (axis: string, value: string) => variants.some((v) => v.attributes[axis] === value),
    [variants],
  );

  /**
   * Availability is judged against the *other* axes' current selection, which
   * is what makes a size grey out when the chosen colour is not made in it —
   * the behaviour a size grid is expected to have and previously did not (it
   * looked at one arbitrary variant carrying that value, ignoring the rest of
   * the selection entirely).
   */
  const isAvailable = useCallback(
    (axis: string, value: string) =>
      variants.some((v) => {
        if (v.attributes[axis] !== value) return false;
        if (v.stock <= 0) return false;
        return Object.entries(selection).every(([k, val]) => k === axis || v.attributes[k] === val);
      }),
    [variants, selection],
  );

  const fillFor = useCallback(
    (axis: VariantAxis, value: string) => swatchFill(value, optionHex(axis.attribute, value)),
    [],
  );

  const images = useMemo(() => {
    const own = selected?.images ?? [];
    // Variant photographs lead, then the product's — a colour usually has one
    // or two of its own and the rest of the gallery (packaging, close-ups)
    // still applies to it.
    return own.length ? [...new Set([...own, ...baseImages])] : baseImages;
  }, [selected, baseImages]);

  /**
   * What can be bought, and why not when it cannot.
   *
   * The old `blocked` test only looked at variants, so a product with no SKUs
   * and an offer at zero stock had a live Add to Cart that put an unbuyable
   * line in the basket. Stock is read from the same figure the availability
   * badge shows, so the button and the badge can never disagree.
   */
  const hasAxes = axes.length > 0;
  const availableStock = hasAxes
    ? selected
      ? Math.max(0, Math.trunc(selected.stock))
      : 0
    : Math.max(0, Math.trunc(baseStock));
  const blockedReason: VariantContextValue['blockedReason'] = !offered
    ? 'unavailable'
    : hasAxes && !selected
      ? 'select_options'
      : availableStock <= 0
        ? 'out_of_stock'
        : null;

  // A quantity is only meaningful against the stock of the SKU it applies to,
  // so it is clamped every time either changes rather than only on input.
  const setQuantity = useCallback((next: number) => {
    setQuantityState(Math.max(1, Math.trunc(Number(next) || 1)));
  }, []);
  const quantityClamped = availableStock > 0 ? Math.min(quantity, availableStock) : 1;

  const value: VariantContextValue = {
    variants,
    axes,
    selection,
    select,
    selected,
    effectivePrice: selected ? selected.price || basePrice : basePrice,
    effectiveMrp: selected && selected.mrp > 0 ? selected.mrp : baseMrp,
    images,
    isAvailable,
    exists,
    fillFor,
    isComplete: axes.length === 0 || axes.every((axis) => !!selection[axis.name]),
    availableStock,
    quantity: quantityClamped,
    setQuantity,
    blockedReason,
  };

  return <VariantContext.Provider value={value}>{children}</VariantContext.Provider>;
}

/**
 * Variant state, or null outside a provider.
 *
 * Nullable on purpose: the gallery and the action buttons are also rendered on
 * screens that have no variant context, and throwing there would take the page
 * down over an optional feature.
 */
export function useVariants(): VariantContextValue | null {
  return useContext(VariantContext);
}
