'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-endpoints';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * useGrocerySellerStore — resolves which grocery store the signed-in seller owns.
 *
 * Nothing exposed this, so the portal hardcoded `const storeId = 'current-store'`
 * with the comment "In production: from auth context". Every seller screen then
 * queried a store that does not exist: the dashboard's analytics and order calls
 * both 404'd, their catch blocks fell back to demo data, and the portal showed one
 * fictional shop's numbers to every seller.
 *
 * The id comes from `GET /grocery/stores/mine`, which the gateway derives from the
 * JWT subject — so it is the caller's own store by construction and cannot be
 * pointed at somebody else's by editing a stored value.
 *
 * A signed-in seller who has not finished onboarding legitimately has no store;
 * that is `hasStore: false`, not an error, and the portal renders its empty state.
 */

export interface GrocerySellerStore {
  id: string;
  name: string;
  slug?: string;
  ownerId: string;
  address?: string;
  phone?: string;
  status: 'PENDING_KYC' | 'APPROVED' | 'SUSPENDED';
  isOnline: boolean;
  rating: number;
  totalOrders: number;
  productCount: number;
  deliveryRadius: number;
  minOrderAmount: number;
  deliveryFee: number;
  logoUrl?: string;
  bannerUrl?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  tags?: string[];
  regionCode?: string;
}

export function useGrocerySellerStore() {
  const { isAuthenticated, user } = useAuth();
  // Keyed on the user as well as the auth flag: signing out of one seller
  // account and into another changes `user?.id` while `isAuthenticated` stays
  // true, and without the id in the deps the second seller would be shown the
  // first one's store.
  const { data: storeData, loading, error, reload: refresh } = useAsyncData<GrocerySellerStore | null>(
    async () => {
      const res = await api.get<{ store: GrocerySellerStore | null; hasStore: boolean }>('/grocery/stores/mine');
      return res?.store ?? null;
    },
    [isAuthenticated, user?.id],
    { enabled: isAuthenticated },
  );
  const store = isAuthenticated && !error ? storeData : null;

  return {
    store,
    storeId: store?.id ?? null,
    hasStore: !!store,
    /** True once onboarding is complete — most screens are meaningless before this. */
    isApproved: store?.status === 'APPROVED',
    loading,
    error,
    refresh,
  };
}
