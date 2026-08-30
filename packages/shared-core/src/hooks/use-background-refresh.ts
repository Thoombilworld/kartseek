'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * KARTSEEK — Background Refresh Hook
 * 
 * Provides automatic data refresh when the browser tab becomes visible
 * or the user returns to the page. Works across all panels:
 * - Customer web storefront
 * - Seller panel
 * - Admin dashboard
 * - Franchise portal
 * 
 * Features:
 * - Visibility change detection (tab switch/minimize)
 * - Focus event detection (window refocus)
 * - Stale data prevention (configurable staleness threshold)
 * - Silent background refresh (no loading spinners)
 * - Periodic polling when tab is visible
 * 
 * @example
 * ```tsx
 * function SellerDashboard() {
 *   const { lastRefresh, isStale } = useBackgroundRefresh({
 *     onRefresh: async () => {
 *       await fetchDashboardData();
 *     },
 *     intervalMs: 30000, // 30s polling when visible
 *     staleThresholdMs: 60000, // Data is stale after 60s
 *   });
 * }
 * ```
 */
interface UseBackgroundRefreshOptions {
  /** Callback invoked on refresh. Should fetch fresh data silently. */
  onRefresh: () => Promise<void>;
  /** Polling interval in ms when the tab is visible (default: 30000 = 30s). */
  intervalMs?: number;
  /** Data is considered stale after this many ms (default: 60000 = 60s). */
  staleThresholdMs?: number;
  /** Whether to enable the hook (default: true). */
  enabled?: boolean;
}

interface UseBackgroundRefreshReturn {
  /** Timestamp of the last successful refresh. */
  lastRefresh: number;
  /** Whether the current data is considered stale. */
  isStale: boolean;
  /** Force an immediate refresh. */
  forceRefresh: () => Promise<void>;
}

export function useBackgroundRefresh({
  onRefresh,
  intervalMs = 30000,
  staleThresholdMs = 60000,
  enabled = true,
}: UseBackgroundRefreshOptions): UseBackgroundRefreshReturn {
  const lastRefreshRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Keep callback ref up-to-date without re-running effects
  onRefreshRef.current = onRefresh;

  const executeRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      await onRefreshRef.current();
      lastRefreshRef.current = Date.now();
    } catch (error) {
      console.warn('[BackgroundRefresh] Refresh failed:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    await executeRefresh();
  }, [executeRefresh]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Visibility change handler (tab switch, minimize/restore)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshRef.current;
        if (elapsed >= staleThresholdMs) {
          console.log('[BackgroundRefresh] Tab visible — data stale, refreshing...');
          executeRefresh();
        }
      }
    };

    // 2. Focus handler (window refocus)
    const handleFocus = () => {
      const elapsed = Date.now() - lastRefreshRef.current;
      if (elapsed >= staleThresholdMs) {
        console.log('[BackgroundRefresh] Window focused — data stale, refreshing...');
        executeRefresh();
      }
    };

    // 3. Periodic polling when visible
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        executeRefresh();
      }
    }, intervalMs);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Initial data fetch
    executeRefresh();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, intervalMs, staleThresholdMs, executeRefresh]);

  return {
    lastRefresh: lastRefreshRef.current,
    isStale: Date.now() - lastRefreshRef.current > staleThresholdMs,
    forceRefresh,
  };
}

/**
 * KARTSEEK — Geolocation Hook
 * 
 * Detects the user's real location via the browser Geolocation API
 * and maps it to the nearest KARTSEEK operational country.
 * 
 * @example
 * ```tsx
 * const { country, city, loading } = useGeolocation();
 * ```
 */
interface GeolocationResult {
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
}

// Country bounding boxes (matches mobile RegionService)
const COUNTRY_BOUNDS: Record<string, { code: string; name: string; minLat: number; maxLat: number; minLng: number; maxLng: number; defaultCity: string }> = {
  IN: { code: 'IN', name: 'India', minLat: 8, maxLat: 37, minLng: 68, maxLng: 97, defaultCity: 'New Delhi' },
  QA: { code: 'QA', name: 'Qatar', minLat: 24.4, maxLat: 26.3, minLng: 50.7, maxLng: 52, defaultCity: 'Doha' },
  AE: { code: 'AE', name: 'UAE', minLat: 22, maxLat: 26.5, minLng: 51, maxLng: 56.5, defaultCity: 'Dubai' },
  SA: { code: 'SA', name: 'Saudi Arabia', minLat: 16, maxLat: 32, minLng: 34, maxLng: 56, defaultCity: 'Riyadh' },
  BH: { code: 'BH', name: 'Bahrain', minLat: 25.5, maxLat: 26.5, minLng: 50.3, maxLng: 50.8, defaultCity: 'Manama' },
  KW: { code: 'KW', name: 'Kuwait', minLat: 28.5, maxLat: 30.1, minLng: 46.5, maxLng: 48.5, defaultCity: 'Kuwait City' },
  OM: { code: 'OM', name: 'Oman', minLat: 16.6, maxLat: 26.4, minLng: 52, maxLng: 59.9, defaultCity: 'Muscat' },
  GB: { code: 'GB', name: 'UK', minLat: 49.9, maxLat: 60.9, minLng: -8.6, maxLng: 1.8, defaultCity: 'London' },
  US: { code: 'US', name: 'USA', minLat: 24.5, maxLat: 49.4, minLng: -125, maxLng: -66.9, defaultCity: 'New York' },
};

function resolveCountryFromCoords(lat: number, lng: number): { code: string; name: string; city: string } {
  for (const [, bounds] of Object.entries(COUNTRY_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return { code: bounds.code, name: bounds.name, city: bounds.defaultCity };
    }
  }
  return { code: 'QA', name: 'Qatar', city: 'Doha' }; // Default
}

export function useGeolocation(): GeolocationResult {
  const resultRef = useRef<GeolocationResult>({
    country: 'Qatar', countryCode: 'QA', city: 'Doha',
    lat: 25.2854, lng: 51.531, loading: true, error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      resultRef.current = { ...resultRef.current, loading: false, error: 'Geolocation not supported' };
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const resolved = resolveCountryFromCoords(latitude, longitude);
        resultRef.current = {
          country: resolved.name,
          countryCode: resolved.code,
          city: resolved.city,
          lat: latitude,
          lng: longitude,
          loading: false,
          error: null,
        };
        // Persist to localStorage for instant next-load
        try {
          localStorage.setItem('kartseek_region', JSON.stringify(resultRef.current));
        } catch (e) { /* ignore */ }
      },
      (error) => {
        console.warn('[Geolocation] Error:', error.message);
        // Try loading from cache
        try {
          const cached = localStorage.getItem('kartseek_region');
          if (cached) {
            resultRef.current = { ...JSON.parse(cached), loading: false, error: null };
            return;
          }
        } catch (e) { /* ignore */ }
        resultRef.current = { ...resultRef.current, loading: false, error: error.message };
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return resultRef.current;
}
