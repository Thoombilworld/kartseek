'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { ApiError } from '@/lib/api-endpoints';

/**
 * Load one seller-scoped resource.
 *
 * Every page in this portal was written the same way, and the shape was wrong in
 * three ways at once:
 *
 *   const [rows, setRows] = useState(DEMO_ROWS);
 *   useEffect(() => {
 *     sellerApi.getX(seller.sellerId)
 *       .then(res => { if (res?.data?.length) setRows(res.data); })
 *       .catch(() => {});
 *   }, [seller.sellerId]);
 *
 *   1. The state started as invented rows, so a seller saw five refunds for
 *      "Arun K." before any request finished — and kept seeing them if the
 *      request failed, because the catch block was empty.
 *   2. The result was only applied `if (…length)`, so a truthful empty response
 *      left the demo data on screen permanently. A seller with no refunds could
 *      not tell that from a seller with five.
 *   3. It fired before `sellerId` resolved, producing `GET /sellers//x` — a 404
 *      on every page load, which fell into (1).
 *
 * This hook is the shape those pages should have had: nothing until the seller
 * is known, then exactly what the API returned — including empty — and an
 * explicit `error` when the call fails, so the page can say so instead of
 * inventing a plausible answer.
 */
export interface SellerResource<T> {
  /** null until the first successful response. Never invented. */
  data: T | null;
  loading: boolean;
  /** Human-readable failure, or null. `unavailable` distinguishes 404/501. */
  error: string | null;
  /** True when the endpoint does not exist on this deployment (404 / 501). */
  unavailable: boolean;
  reload: () => void;
}

export function useSellerData<T>(
  fetcher: (sellerId: string) => Promise<T>,
  deps: readonly unknown[] = [],
): SellerResource<T> {
  const { seller } = useSeller();
  const sellerId = seller.sellerId;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Held in a ref so a caller can pass an inline arrow without re-running the
  // effect on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    // No seller id yet — `SellerProvider` is still resolving `/sellers/me`.
    // Requesting anything now would ask for `/sellers//…`.
    if (!sellerId) return;

    let cancelled = false;
    setLoading(true);

    fetcherRef.current(sellerId)
      .then((res) => {
        if (cancelled) return;
        setData(res ?? null);
        setError(null);
        setUnavailable(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = err instanceof ApiError ? err.status : 0;
        setData(null);
        setUnavailable(status === 404 || status === 501);
        setError(
          status === 404 || status === 501
            ? 'This feature is not available on your account yet.'
            : err instanceof Error && err.message
              ? err.message
              : 'Could not load this data.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, unavailable, reload };
}

/**
 * The common case: a paginated list endpoint returning `{ data, total }`.
 * Returns `[]` rather than null so callers can map straight over it, and keeps
 * `loading` / `error` separate so an empty list and a failed request are never
 * rendered the same way.
 */
export function useSellerList<T>(
  fetcher: (sellerId: string) => Promise<{ data?: T[]; total?: number } | T[] | null>,
  deps: readonly unknown[] = [],
): Omit<SellerResource<T[]>, 'data'> & { rows: T[]; total: number } {
  const res = useSellerData(fetcher, deps);
  const payload = res.data as { data?: T[]; total?: number } | T[] | null;

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const total = Array.isArray(payload)
    ? payload.length
    : typeof payload?.total === 'number'
      ? payload.total
      : rows.length;

  return { rows, total, loading: res.loading, error: res.error, unavailable: res.unavailable, reload: res.reload };
}
