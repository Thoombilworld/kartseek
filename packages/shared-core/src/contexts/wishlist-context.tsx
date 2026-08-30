'use client';

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/api/marketplace';
import { useAuth } from '@/lib/contexts/auth-context';

/**
 * The signed-in customer's wishlist, loaded once and shared.
 *
 * Every surface that drew a heart kept its own `useState` array and never called
 * the API — the search page's `toggleWishlist` only ever did `setWishlist(...)`.
 * The heart filled in, and the next reload emptied it, which is the same failure
 * the brand-follow button had: local optimism with nothing behind it. Product
 * cards on the brand page did not even have that; their hearts had no handler.
 *
 * Loading the whole list once (rather than asking "is this one saved?" per card)
 * keeps a 40-product grid at one request instead of forty.
 *
 * Every wishlist route on the gateway is behind `JwtAuthGuard` and takes the
 * owner from the token, so there is no signed-out wishlist to fall back on —
 * `toggle` reports back whether it needed a sign-in, and callers prompt.
 */
interface WishlistContextValue {
  /** Product ids currently on the wishlist. */
  ids: Set<string>;
  has: (productId: string) => boolean;
  /** Returns false when the customer is signed out and nothing was saved. */
  toggle: (productId: string) => Promise<boolean>;
  isReady: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Pull product ids out of the wishlist response.
 *
 * `GET /marketplace/wishlist` answers `{ success, data: { userId, products, total } }`
 * — so after the client unwraps the envelope the rows sit under **`products`**,
 * not `data` or `items`, and they are full Product entities rather than join
 * rows. Reading the wrong key here returns an empty set and every heart renders
 * unsaved against a wishlist that is actually populated, which is the same trap
 * the brand-follow button fell into. The other shapes stay as fallbacks in case
 * a different route is pointed at this reader.
 */
function readIds(payload: any): string[] {
  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload?.products) ? payload.products
    : Array.isArray(payload?.data?.products) ? payload.data.products
    : Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.data?.data) ? payload.data.data
    : [];
  return rows
    .map((r: any) => String(r?.productId ?? r?.product?.id ?? r?.id ?? ''))
    .filter(Boolean);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  // `isAuthenticated` must stay in the deps: AuthProvider hydrates inside an
  // effect, so the first render is always signed-out and a one-shot load here
  // would latch an empty wishlist for the whole session.
  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) { setIds(new Set()); setIsReady(true); return; }

    let cancelled = false;
    getWishlist()
      .then((res) => { if (!cancelled) setIds(new Set(readIds(res))); })
      .catch(() => { /* offline — treat as empty rather than blocking the page */ })
      .finally(() => { if (!cancelled) setIsReady(true); });
    return () => { cancelled = true; };
  }, [isAuthenticated, isHydrated]);

  const has = useCallback((productId: string) => ids.has(productId), [ids]);

  const toggle = useCallback(async (productId: string) => {
    if (!isAuthenticated) return false;

    const wasSaved = ids.has(productId);
    setIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(productId); else next.add(productId);
      return next;
    });

    try {
      if (wasSaved) await removeFromWishlist(productId);
      else await addToWishlist(productId);
    } catch {
      // Roll back — the typed client throws on non-2xx, so this really is a
      // rejected write rather than a silently-ignored one.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(productId); else next.delete(productId);
        return next;
      });
    }
    return true;
  }, [ids, isAuthenticated]);

  const value = useMemo(() => ({ ids, has, toggle, isReady }), [ids, has, toggle, isReady]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within <WishlistProvider>');
  return ctx;
}
