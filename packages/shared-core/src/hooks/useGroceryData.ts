/**
 * useGroceryData — Customer-facing hook for grocery homepage data.
 *
 * Fetches categories, nearby stores, and search results from the API
 * with graceful fallback to demo data during development.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { groceryApi, type GroceryCategory, type GroceryStoreApi, type GroceryProduct } from '@/lib/grocery-api';

interface GroceryHomeData {
  categories: GroceryCategory[];
  stores: GroceryStoreApi[];
  loading: boolean;
  error: string | null;
  source: 'api' | 'demo';
}

/**
 * @param override Coordinates chosen explicitly by the shopper. When present
 *   they win over GPS — the homepage's "Change area" control geocodes a typed
 *   place name into these. Without it the hook took no arguments at all, so
 *   the control's refetch simply re-ran GPS and returned the same shops.
 */
export function useGroceryHomeData(override?: { lat: number; lng: number } | null) {
  const [data, setData] = useState<GroceryHomeData>({
    categories: [],
    stores: [],
    loading: true,
    error: null,
    source: 'demo',
  });

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // An explicit choice wins; GPS is only consulted when there is none.
      let lat: number | undefined = override?.lat;
      let lng: number | undefined = override?.lng;
      if (lat === undefined && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Geolocation denied or timed out — proceed without coordinates
        }
      }

      // Fetch categories and stores in parallel
      const [catResult, storeResult] = await Promise.allSettled([
        // Only categories a shopper can actually buy from in this market.
        groceryApi.getCategories(true),
        groceryApi.getNearbyStores(lat, lng),
      ]);

      const categories = catResult.status === 'fulfilled' ? catResult.value.categories : [];
      const stores = storeResult.status === 'fulfilled' ? storeResult.value.data : [];

      setData({
        categories,
        stores,
        loading: false,
        error: null,
        source: categories.length > 0 || stores.length > 0 ? 'api' : 'demo',
      });
    } catch (err) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: (err as Error).message,
        source: 'demo',
      }));
    }
  }, [override?.lat, override?.lng]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...data, refetch: fetchData };
}

export function useGrocerySearch() {
  const [results, setResults] = useState<GroceryProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState(0);

  const search = useCallback(async (query: string, storeId?: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    setSearching(true);
    try {
      const res = await groceryApi.searchProducts(query, storeId);
      setResults(res.results);
      setTotal(res.total);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setSearching(false);
    }
  }, []);

  return { results, searching, total, search };
}

/**
 * A store's catalogue, paged for infinite scroll.
 *
 * Not built on `useAsyncData` like the rest of the module: page 2 onwards
 * *appends* to what is already on screen, so the accumulated list is state this
 * hook owns rather than the result of a single request.
 *
 * Two things were wrong with the previous version:
 *
 *  • Nothing cancelled. Switching category while page 2 of the old one was in
 *    flight appended the old category's products onto the new category's first
 *    page — the shopper saw a mixed list that matched no filter.
 *
 *  • `catch {}` with the comment "Keep existing products on error" made a failed
 *    page indistinguishable from reaching the end of the catalogue. Scrolling
 *    just stopped producing items, silently.
 */
export function useGroceryStoreProducts(storeId: string, category?: string) {
  const [products, setProducts] = useState<GroceryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Bumped whenever the store or category changes. A response carrying a stale
  // token is dropped rather than merged into the current list.
  const requestToken = useRef(0);

  const fetchProducts = useCallback(async (pageNum = 1) => {
    const token = pageNum === 1 ? ++requestToken.current : requestToken.current;
    setLoading(true);
    setError(null);
    try {
      const res = await groceryApi.getProducts(storeId, category, pageNum);
      if (token !== requestToken.current) return;
      setProducts(prev => (pageNum === 1 ? res.data : [...prev, ...res.data]));
      setTotal(res.total);
      setPage(pageNum);
    } catch (e) {
      if (token !== requestToken.current) return;
      setError(e instanceof Error ? e.message : 'Could not load these products');
      if (pageNum === 1) { setProducts([]); setTotal(0); }
    } finally {
      if (token === requestToken.current) setLoading(false);
    }
  }, [storeId, category]);

  useEffect(() => {
    // Awaited first so nothing is set synchronously in the effect body.
    void Promise.resolve().then(() => fetchProducts(1));
  }, [fetchProducts]);

  const loadMore = useCallback(() => fetchProducts(page + 1), [fetchProducts, page]);

  return {
    products,
    loading,
    error,
    total,
    page,
    loadMore,
    // A failed page must not read as "the catalogue ends here".
    hasMore: !error && products.length < total,
  };
}
