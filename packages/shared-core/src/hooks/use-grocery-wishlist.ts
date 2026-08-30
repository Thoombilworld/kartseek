'use client';

import { useCallback, useMemo } from 'react';
import { groceryApi } from '@/lib/grocery-api';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * useGroceryWishlist — the customer's saved grocery products.
 *
 * `/grocery/wishlist` rendered a hardcoded `DEMO_WISHLIST` array and the header's
 * heart badge was the literal string "0", so nothing a customer saved was ever
 * stored or shown. The wishlist API existed the whole time and nothing called it.
 *
 * Every wishlist route is behind the gateway's JwtAuthGuard and takes its identity
 * from the token, so there is no guest wishlist to read: signed out this holds an
 * empty list and touches the network not at all. Gating on `isAuthenticated` — and
 * keeping it in the dependency array — matters because AuthProvider hydrates in an
 * effect, so the first tick of every page looks signed out.
 */

export interface GroceryWishlistItem {
  id: string;
  productId: string;
  storeId: string;
  productName: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
  rating: number | null;
  reviewCount: number;
  weightVariants: Array<{ weight: string; price: number; mrp: number; stock: number }>;
  price: number | null;
  mrp: number | null;
  inStock: boolean;
  available: boolean;
  createdAt: string;
}

export function useGroceryWishlist() {
  const { isAuthenticated, user } = useAuth();
  // The hand-rolled `requestId` ref this used to carry — guarding against a late
  // response from a previous account overwriting the current one — is what
  // `useAsyncData` does for every caller. Errors are surfaced rather than
  // swallowed: an empty wishlist and an unreachable service look identical on
  // screen otherwise.
  const { data, loading, error, reload: refresh, setData } = useAsyncData<GroceryWishlistItem[]>(
    async () => (await groceryApi.getWishlist(user!.id, 1, 100))?.data as GroceryWishlistItem[] ?? [],
    [isAuthenticated, user?.id],
    { enabled: isAuthenticated && !!user?.id, initialData: [] },
  );

  // Memoised so the identity is stable while the data is: the ternary would
  // otherwise produce a fresh `[]` on every render for signed-out visitors, and
  // every callback below takes `items` as a dependency.
  const items = useMemo(
    () => (isAuthenticated && user?.id ? (data ?? []) : []),
    [isAuthenticated, user?.id, data],
  );

  const isSaved = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  /** Adds, or removes when already saved. Returns the resulting state. */
  const toggle = useCallback(
    async (productId: string, storeId: string): Promise<boolean> => {
      if (!isAuthenticated || !user?.id) return false;
      const saved = items.some((i) => i.productId === productId);
      // Optimistic — the heart must respond to the tap, not to the round trip.
      // Written against `items` rather than through an updater closure, which the
      // React compiler cannot memoise across the `setData` indirection.
      setData(
        saved
          ? items.filter((i) => i.productId !== productId)
          : [...items, { productId, storeId, id: `pending-${productId}` } as GroceryWishlistItem],
      );
      try {
        if (saved) await groceryApi.removeFromWishlist(user.id, productId);
        else await groceryApi.addToWishlist({ customerId: user.id, productId, storeId });
        // Re-read so the optimistic stub is replaced by the row with real product
        // detail (price, image, stock) rather than lingering half-populated.
        void refresh();
        return !saved;
      } catch {
        void refresh(); // undo the optimistic write
        return saved;
      }
    },
    [isAuthenticated, user?.id, items, refresh, setData],
  );

  return {
    items,
    count: items.length,
    loading,
    error,
    isSaved,
    toggle,
    refresh,
    /** Signed-out callers get an empty list; the UI prompts instead of failing. */
    requiresSignIn: !isAuthenticated,
  };
}
