'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-endpoints';
import { useAuth } from '@/lib/contexts/auth-context';

/**
 * useSavedAddresses — the signed-in customer's delivery addresses.
 *
 * `/users/:userId/addresses` has existed on the gateway all along (GET/POST/PUT/
 * DELETE, persisted in Redis) and no grocery page called it. `/grocery/addresses`
 * kept two addresses in `useState`, so adding one did nothing and it vanished on
 * navigation; `/grocery/checkout` had its own separate pair written into the file
 * and shipped orders to whichever of those two was selected.
 *
 * Both now read this hook, which means an address added on the addresses page is
 * immediately selectable at checkout — the connection that did not exist before.
 */

export interface SavedAddress {
  id: string;
  label: string;
  name?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode: string;
  /** Present only once an address has been geocoded; the order API treats them as optional. */
  lat?: number;
  lng?: number;
  isDefault: boolean;
  /** Single-line rendering, built once here so every consumer formats it the same way. */
  formatted: string;
}

/** The stored shape has drifted (`pin` vs `pincode`); normalise on the way in. */
function toSavedAddress(row: any): SavedAddress {
  const pincode = String(row?.pincode ?? row?.pin ?? '');
  const parts = [row?.line1, row?.line2, row?.city, row?.state].filter(Boolean);
  return {
    id: String(row?.id ?? ''),
    label: row?.label ?? 'Address',
    name: row?.name,
    phone: row?.phone,
    line1: row?.line1 ?? '',
    line2: row?.line2 || undefined,
    city: row?.city ?? '',
    state: row?.state || undefined,
    pincode,
    lat: Number.isFinite(Number(row?.lat)) ? Number(row.lat) : undefined,
    lng: Number.isFinite(Number(row?.lng)) ? Number(row.lng) : undefined,
    isDefault: !!row?.isDefault,
    formatted: [parts.join(', '), pincode].filter(Boolean).join(' - '),
  };
}

/**
 * The list lives at `addresses` on the payload, not at its root.
 *
 * The handler returns `{ success, addresses }`. The api client only unwraps an
 * envelope carrying BOTH `success` and `data`, so this arrives whole — reading it
 * as an array would have produced an empty address book on every load.
 */
function readAddresses(payload: any): SavedAddress[] {
  const rows = Array.isArray(payload) ? payload : payload?.addresses ?? payload?.data ?? [];
  return Array.isArray(rows) ? rows.map(toSavedAddress).filter((a: SavedAddress) => a.id) : [];
}

export function useSavedAddresses() {
  const { isAuthenticated, user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setAddresses([]);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/users/${user.id}/addresses`);
      if (id !== requestId.current) return;
      setAddresses(readAddresses(res));
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Could not load your addresses');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = useCallback(async (address: Omit<SavedAddress, 'id' | 'formatted' | 'isDefault'> & { isDefault?: boolean }) => {
    if (!user?.id) throw new Error('Sign in to save an address');
    await api.post(`/users/${user.id}/addresses`, address);
    await refresh();
  }, [user?.id, refresh]);

  const update = useCallback(async (addressId: string, changes: Partial<SavedAddress>) => {
    if (!user?.id) throw new Error('Sign in to edit an address');
    await api.put(`/users/${user.id}/addresses/${addressId}`, changes);
    await refresh();
  }, [user?.id, refresh]);

  const remove = useCallback(async (addressId: string) => {
    if (!user?.id) throw new Error('Sign in to delete an address');
    await api.delete(`/users/${user.id}/addresses/${addressId}`);
    await refresh();
  }, [user?.id, refresh]);

  const setDefault = useCallback(
    (addressId: string) => update(addressId, { isDefault: true }),
    [update],
  );

  return {
    addresses,
    defaultAddress: addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    loading,
    error,
    add,
    update,
    remove,
    setDefault,
    refresh,
    requiresSignIn: !isAuthenticated,
  };
}
