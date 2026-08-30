'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useAsyncData — load data for a set of inputs, with cancellation.
 *
 * Replaces a pattern repeated across ~35 grocery screens:
 *
 *     const load = useCallback(async () => {
 *       setLoading(true); setError(null);
 *       const res = await api.getX(page, filter);
 *       if (res.success) setRows(res.data); else setError(res.error);
 *       setLoading(false);
 *     }, [page, filter]);
 *     useEffect(() => { void load(); }, [load]);
 *
 * Two things were wrong with it, one cosmetic and one not:
 *
 *  • `setLoading(true)` ran synchronously inside the effect body, forcing a
 *    cascading render — what `react-hooks/set-state-in-effect` flags.
 *
 *  • Nothing cancelled. Change the filter or type in the search box quickly and
 *    two requests are in flight; whichever *returns* last wins, so the grid can
 *    settle on results for a filter the user has already moved off. That is a
 *    real defect on every paged or filtered screen in the module, and it stays
 *    invisible until the network is slow.
 *
 * Every state update here happens after an `await`, so nothing is set during the
 * effect body, and a superseded response is discarded rather than applied.
 *
 * `fetcher` does not need to be memoised — its identity is deliberately not a
 * dependency, because it is almost always an inline closure. `deps` is the
 * caller's declaration of what actually should trigger a refetch.
 */
export interface AsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /**
   * Re-runs the fetcher. Safe to call from an event handler, and awaitable —
   * mutation handlers do `await reload()` before clearing their busy flag, and
   * a void return would clear it while the refetch was still in flight, showing
   * the pre-mutation row as though the write had not landed.
   */
  reload: () => Promise<void>;
  /** Replace the held value without a round trip, e.g. after an optimistic write. */
  setData: (next: T | null) => void;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
  options: { initialData?: T | null; enabled?: boolean } = {},
): AsyncDataResult<T> {
  const { initialData = null, enabled = true } = options;

  const [data, setData] = useState<T | null>(initialData);
  // Starts true when enabled, so the first paint is a skeleton rather than an
  // empty state that flashes into content.
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Kept in a ref so a new inline closure each render does not retrigger the
  // fetch. Assigned in an effect rather than during render — mutating a ref
  // while rendering is what `react-hooks/refs` forbids.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Callers waiting on `reload()`. Settled unconditionally below — including
  // when the run is superseded — so an awaited reload can never hang.
  const waiters = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Nothing to fetch yet — e.g. no signed-in user. The last value is left in
    // place rather than blanked.
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      // The first statement is an await, so the loading flag is never set
      // synchronously during the effect body.
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);

      try {
        const result = await fetcherRef.current();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
        const settled = waiters.current;
        waiters.current = [];
        settled.forEach((resolve) => resolve());
      }
    })();

    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally excluded; see the note on the parameter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadToken]);

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        setReloadToken((t) => t + 1);
      }),
    [],
  );

  return { data, loading, error, reload, setData };
}
