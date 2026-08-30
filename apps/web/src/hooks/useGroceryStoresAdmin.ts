/**
 * useGroceryStoresAdmin — the admin console's grocery store list and lifecycle actions.
 *
 * Two things were wrong here, and they compounded:
 *
 *  1. The list came from `groceryApi.getNearbyStores()` — the *customer* endpoint,
 *     which returns only APPROVED and online stores. The admin screen therefore
 *     could not see the pending applications it exists to approve, and fell back to
 *     eleven demo stores ("Cheap Mart", "Expired Foods Co") when the call failed,
 *     with revenue invented as `totalOrders * 500`.
 *
 *  2. `toggleStatus` and `approveStore` called
 *     `groceryApi.updateOrderStatus(storeId, 'APPROVED')` — `PATCH /grocery/orders/
 *     <storeId>/status` — which is the wrong resource entirely, and 'APPROVED' is
 *     not a GroceryOrderStatus. The comment claimed "backend handles store status
 *     updates too"; it does not. The error was swallowed and the row flipped colour
 *     anyway, so no store was ever approved, suspended or blocked while the console
 *     reported success every time.
 *
 * Both now use the admin API, and a rejected action is rolled back and surfaced.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGroceryApi, type AdminGroceryStore } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/** The three lifecycle states `grocery_stores.status` actually has. */
export type StoreStatus = 'active' | 'suspended' | 'pending';

export interface AdminGroceryStoreRow {
  id: string;
  name: string;
  city: string;
  owner: string;
  phone: string;
  rating: number;
  orders: number;
  products: number;
  status: StoreStatus;
  regionCode: string;
  isOnline: boolean;
  lastActive: string;
}

const TO_ROW_STATUS: Record<string, StoreStatus> = {
  APPROVED: 'active',
  SUSPENDED: 'suspended',
  PENDING_KYC: 'pending',
};

function toRow(s: AdminGroceryStore): AdminGroceryStoreRow {
  return {
    id: s.id,
    name: s.name,
    // The city is the last comma-separated part of a free-text address; blank
    // rather than guessed when the address has no structure.
    city: s.address?.split(',').pop()?.trim() ?? '',
    owner: s.ownerId ?? '',
    phone: s.phone ?? '',
    rating: Number(s.rating ?? 0),
    orders: Number(s.totalOrders ?? 0),
    products: Number(s.productCount ?? 0),
    status: TO_ROW_STATUS[s.status] ?? 'pending',
    regionCode: s.regionCode ?? '',
    isOnline: !!s.isOnline,
    lastActive: s.isOnline ? 'Online' : 'Offline',
  };
}

export function useGroceryStoresAdmin(initialStatus?: string) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: page, loading, error, reload: fetchStores, setData: setPage } = useAsyncData<{
    rows: AdminGroceryStoreRow[];
    total: number;
  }>(
    async () => {
      // limit 100 covers every current deployment; the endpoint paginates and the
      // page count is reported so a larger estate is visibly truncated rather than
      // silently cut off.
      const res = await adminGroceryApi.getStores({ page: 1, limit: 100, status: initialStatus });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load grocery stores');
      return {
        rows: (res.data.data ?? []).map(toRow),
        total: Number(res.data.total ?? 0),
      };
    },
    [initialStatus],
  );

  const stores = error ? [] : (page?.rows ?? []);
  const total = error ? 0 : (page?.total ?? 0);

  /** Rewrites the held rows in place — used by the optimistic status update. */
  const setStores = useCallback(
    (next: (prev: AdminGroceryStoreRow[]) => AdminGroceryStoreRow[]) =>
      setPage({ rows: next(stores), total }),
    [setPage, stores, total],
  );

  /**
   * Applies a lifecycle change, optimistically, and rolls it back if the API
   * refuses. The previous version had no rollback because it never checked.
   */
  const setStatus = useCallback(async (id: string, next: StoreStatus, reason?: string) => {
    const previous = stores.find((s) => s.id === id)?.status;
    setBusyId(id);
    setActionError(null);
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));

    const res = next === 'active'
      ? await adminGroceryApi.approveStore(id)
      : await adminGroceryApi.suspendStore(id, reason);

    setBusyId(null);
    if (!res.success) {
      if (previous) setStores((prev) => prev.map((s) => (s.id === id ? { ...s, status: previous } : s)));
      setActionError(res.error ?? 'Could not update this store');
      return false;
    }
    // Re-read so the row shows what the server actually stored (a suspension also
    // takes the store offline, which the optimistic update does not know).
    await fetchStores();
    return true;
  }, [stores, fetchStores]);

  const approveStore = useCallback((id: string) => setStatus(id, 'active'), [setStatus]);
  const suspendStore = useCallback((id: string, reason?: string) => setStatus(id, 'suspended', reason), [setStatus]);

  return {
    stores,
    total,
    loading,
    error,
    actionError,
    busyId,
    approveStore,
    suspendStore,
    setStatus,
    refetch: fetchStores,
    clearActionError: () => setActionError(null),
  };
}
