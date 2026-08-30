'use client';

import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useRef, ReactNode } from 'react';

/**
 * GroceryCartContext — the basket behind /grocery.
 *
 * There was no grocery cart. `/grocery/cart` held five hardcoded items in local
 * `useState`, so nothing a product or store page did could put anything in it, the
 * contents reset on every navigation, and `/grocery/checkout` ignored it entirely
 * and posted a fixed pair of items to the API.
 *
 * Deliberately client-side. Unlike marketplace, grocery has no server cart: the
 * gateway exposes no `/grocery/cart` route and `POST /grocery/orders` takes the
 * item list directly, so the browser is the correct place to hold it. Persisted to
 * localStorage under a versioned key so a refresh, a new tab or a deep link does
 * not empty it, and so a future change to `GroceryCartItem` cannot resurrect rows
 * the reducer can no longer read.
 *
 * The single-store rule is enforced here rather than in each page: grocery orders
 * are fulfilled by one shop, and `POST /grocery/orders` takes exactly one
 * `storeId`. Adding from a second store surfaces a conflict the UI resolves,
 * instead of building a basket that cannot be ordered.
 */

export interface GroceryCartItem {
  /** Catalogue product id — what the order API is given. */
  productId: string;
  /** Weight variant, e.g. "500g". Same product in two weights = two lines. */
  weight: string;
  name: string;
  brand?: string;
  price: number;
  mrp?: number;
  quantity: number;
  imageUrl?: string;
  emoji?: string;
  storeId: string;
  storeName: string;
  /** Stock of this variant at the time it was added — caps the quantity stepper. */
  maxQuantity?: number;
  preparationNote?: string;
}

/** A line is identified by product *and* variant, never by product alone. */
const lineKey = (i: Pick<GroceryCartItem, 'productId' | 'weight'>) => `${i.productId}::${i.weight}`;

type Action =
  | { type: 'ADD'; item: GroceryCartItem }
  | { type: 'SET_QTY'; productId: string; weight: string; quantity: number }
  | { type: 'REMOVE'; productId: string; weight: string }
  | { type: 'REPLACE'; items: GroceryCartItem[] }
  | { type: 'CLEAR' };

function reducer(items: GroceryCartItem[], action: Action): GroceryCartItem[] {
  switch (action.type) {
    case 'REPLACE':
      return action.items;
    case 'ADD': {
      // A different store replaces the basket outright. Callers are expected to
      // have asked first via `wouldReplaceCart`; doing it here as well means no
      // path can produce a mixed-store basket the order API would reject.
      const base = items.length && items[0].storeId !== action.item.storeId ? [] : items;
      const key = lineKey(action.item);
      const existing = base.find((i) => lineKey(i) === key);
      if (!existing) return [...base, action.item];
      const cap = existing.maxQuantity ?? Infinity;
      return base.map((i) =>
        lineKey(i) === key ? { ...i, quantity: Math.min(i.quantity + action.item.quantity, cap) } : i,
      );
    }
    case 'SET_QTY': {
      const key = lineKey(action);
      if (action.quantity <= 0) return items.filter((i) => lineKey(i) !== key);
      return items.map((i) =>
        lineKey(i) === key ? { ...i, quantity: Math.min(action.quantity, i.maxQuantity ?? Infinity) } : i,
      );
    }
    case 'REMOVE':
      return items.filter((i) => lineKey(i) !== lineKey(action));
    case 'CLEAR':
      return [];
    default:
      return items;
  }
}

interface GroceryCartValue {
  items: GroceryCartItem[];
  /** Total units, i.e. the badge number. */
  count: number;
  /** Distinct lines. */
  lineCount: number;
  subtotal: number;
  /** Sum of (mrp − price) × qty, for the "you saved" line. Never negative. */
  savings: number;
  /** The single store this basket belongs to, or null when empty. */
  storeId: string | null;
  storeName: string | null;
  add: (item: GroceryCartItem) => void;
  setQuantity: (productId: string, weight: string, quantity: number) => void;
  remove: (productId: string, weight: string) => void;
  clear: () => void;
  /** Units of one variant already in the basket — drives the stepper on tiles. */
  quantityOf: (productId: string, weight: string) => number;
  /** True when adding this item would empty the basket first. */
  wouldReplaceCart: (storeId: string) => boolean;
  /** Set true once localStorage has been read, so the UI can avoid a flash of empty. */
  hydrated: boolean;
}

const GroceryCartContext = createContext<GroceryCartValue | null>(null);

const STORAGE_KEY = 'kartseek_grocery_cart_v1';

/**
 * Reads persisted lines, discarding anything malformed.
 *
 * Storage is user-writable: a hand-edited entry must not be able to put a NaN
 * price, a missing product id or a negative quantity into the basket and on to
 * checkout. Mixed stores are collapsed to the first store's lines for the same
 * reason the reducer enforces it.
 */
function readStorage(): GroceryCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter(
      (i: any) =>
        i && typeof i.productId === 'string' && i.productId &&
        typeof i.weight === 'string' && i.weight &&
        typeof i.storeId === 'string' && i.storeId &&
        Number.isFinite(Number(i.price)) && Number(i.price) >= 0 &&
        Number(i.quantity) > 0,
    ).map((i: any) => ({
      ...i,
      price: Number(i.price),
      mrp: Number.isFinite(Number(i.mrp)) ? Number(i.mrp) : undefined,
      quantity: Math.floor(Number(i.quantity)),
    }));
    if (!clean.length) return [];
    const storeId = clean[0].storeId;
    return clean.filter((i: GroceryCartItem) => i.storeId === storeId);
  } catch {
    return [];
  }
}

export function GroceryCartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const hydrated = useRef(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Hydrate once on mount. Reading storage during render would break SSR, and
  // writing before the read completes would clobber the saved basket with [].
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = readStorage();
    if (saved.length) dispatch({ type: 'REPLACE', items: saved });
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated.current || !isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota or private mode — the in-memory basket still works */
    }
  }, [items, isHydrated]);

  // Keep tabs in step: a basket edited in one tab should not be silently
  // overwritten when the other tab next persists.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      dispatch({ type: 'REPLACE', items: readStorage() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const listTotal = items.reduce((s, i) => s + (i.mrp ?? i.price) * i.quantity, 0);
    return {
      count: items.reduce((s, i) => s + i.quantity, 0),
      lineCount: items.length,
      subtotal: Math.round(subtotal * 100) / 100,
      savings: Math.max(0, Math.round((listTotal - subtotal) * 100) / 100),
    };
  }, [items]);

  const add = useCallback((item: GroceryCartItem) => dispatch({ type: 'ADD', item }), []);
  const setQuantity = useCallback(
    (productId: string, weight: string, quantity: number) =>
      dispatch({ type: 'SET_QTY', productId, weight, quantity }),
    [],
  );
  const remove = useCallback(
    (productId: string, weight: string) => dispatch({ type: 'REMOVE', productId, weight }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const quantityOf = useCallback(
    (productId: string, weight: string) =>
      items.find((i) => i.productId === productId && i.weight === weight)?.quantity ?? 0,
    [items],
  );

  const wouldReplaceCart = useCallback(
    (storeId: string) => items.length > 0 && items[0].storeId !== storeId,
    [items],
  );

  const value = useMemo<GroceryCartValue>(
    () => ({
      items,
      ...totals,
      storeId: items[0]?.storeId ?? null,
      storeName: items[0]?.storeName ?? null,
      add, setQuantity, remove, clear, quantityOf, wouldReplaceCart,
      hydrated: isHydrated,
    }),
    [items, totals, add, setQuantity, remove, clear, quantityOf, wouldReplaceCart, isHydrated],
  );

  return <GroceryCartContext.Provider value={value}>{children}</GroceryCartContext.Provider>;
}

export function useGroceryCart() {
  const ctx = useContext(GroceryCartContext);
  if (!ctx) throw new Error('useGroceryCart must be used within GroceryCartProvider');
  return ctx;
}
