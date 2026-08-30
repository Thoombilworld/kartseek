'use client';

/**
 * KARTSEEK Seller Context
 * ────────────────────────
 * Provides seller identity, real-time state, and shared utilities
 * to all pages within the /seller/marketplace/* route tree.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSellerSocket, type SellerSocketState, type NewOrderEvent } from '../hooks/use-seller-socket';
import { sellerApi, type DashboardKPI } from '../modules/seller-api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SellerIdentity {
  sellerId: string;
  sellerName: string;
  storeSlug: string;
  email: string;
  taxId?: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  verified: boolean;
  /**
   * The market this seller is registered in (`sellers.region_code`).
   *
   * Fixed at registration and independent of where they happen to be browsing
   * from: a Qatari seller opening the portal while travelling must still be
   * asked for a Commercial Registration and paid by Qatari bank transfer, not
   * handed India's GSTIN and UPI because of their current IP.
   */
  regionCode?: string;
}

interface SellerContextValue {
  /** Current seller identity */
  seller: SellerIdentity;
  /** Real-time socket state */
  socket: SellerSocketState;
  /** Cached dashboard KPIs (refreshed on mount + socket events) */
  kpi: DashboardKPI | null;
  /** Refresh KPIs from API */
  refreshKPI: () => Promise<void>;
  /** Whether initial data has loaded */
  isLoading: boolean;
  /** Toast-style new order queue */
  pendingToasts: NewOrderEvent[];
  /** Dismiss a toast */
  dismissToast: (orderId: string) => void;
}

// ─── Identity placeholder ─────────────────────────────────────────────────────

/**
 * The identity before `/sellers/me` answers.
 *
 * `sellerId` is deliberately empty: pages guard on `if (!seller.sellerId) return`
 * and must make no API calls until the real id arrives. This used to be a
 * hard-coded demo seller (`SLR-9201`, "Tech Haven Electronics") with a comment
 * saying "used until real auth is wired" — so every page in the portal requested
 * `/sellers/SLR-9201/...`, a seller nobody owns, and `SellerOwnershipGuard`
 * refused all of it with 403.
 */
const UNRESOLVED_SELLER: SellerIdentity = {
  sellerId: '',
  sellerName: '',
  storeSlug: '',
  email: '',
  plan: 'free',
  verified: false,
};

/** Map the gateway's seller row onto the portal's identity. */
function toSellerIdentity(row: any): SellerIdentity {
  return {
    sellerId: String(row?.id ?? ''),
    sellerName: row?.businessName ?? '',
    storeSlug: row?.storeSlug ?? '',
    email: row?.email ?? '',
    plan: 'pro',
    verified: (row?.verificationStatus ?? '') === 'VERIFIED',
    regionCode: row?.regionCode ?? undefined,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SellerContext = createContext<SellerContextValue | null>(null);

export function SellerProvider({ children }: { children: React.ReactNode }) {
  const [seller, setSeller] = useState<SellerIdentity>(UNRESOLVED_SELLER);
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingToasts, setPendingToasts] = useState<NewOrderEvent[]>([]);

  // Resolve who this seller actually is before anything asks for their data.
  // The id comes from `GET /sellers/me`, which the gateway derives from the JWT
  // subject — so it is the caller's own seller row by construction and cannot be
  // pointed at somebody else's by tampering with a stored value.
  useEffect(() => {
    let cancelled = false;
    sellerApi.getMyAccount()
      .then((row) => { if (!cancelled && row) setSeller(toSellerIdentity(row)); })
      // A signed-in user with no seller account (404) leaves the placeholder in
      // place; the portal renders its empty state rather than querying a
      // seller id it invented.
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Real-time socket
  const socket = useSellerSocket(seller.sellerId);

  // Fetch KPIs once the seller id is known
  const refreshKPI = useCallback(async () => {
    if (!seller.sellerId) return;
    try {
      // `api.get` already unwraps the `{ success, data }` envelope, so this is
      // the KPI object. Reading `.data` off it again yielded `undefined`, which
      // is why every badge in the sidebar — pending orders, low stock, returns,
      // refunds — stayed blank no matter what the numbers actually were.
      const kpiData = await sellerApi.getDashboard(seller.sellerId);
      setKpi(kpiData ?? null);
    } catch {
      // Leave KPIs unset rather than substituting invented figures: this used to
      // fall back to a fixed demo dashboard (₹48,920 today, 1,284 orders), which
      // a seller could not distinguish from their real numbers.
      setKpi(null);
    } finally {
      setIsLoading(false);
    }
  }, [seller.sellerId]);

  useEffect(() => {
    refreshKPI();
  }, [refreshKPI]);

  // Push new order events to toast queue
  useEffect(() => {
    if (socket.newOrders.length > 0) {
      const latest = socket.newOrders[0];
      setPendingToasts(prev => {
        if (prev.some(t => t.orderId === latest.orderId)) return prev;
        return [latest, ...prev].slice(0, 5);
      });

      // Auto-refresh KPIs when new orders arrive
      refreshKPI();
    }
  }, [socket.newOrders, refreshKPI]);

  const dismissToast = useCallback((orderId: string) => {
    setPendingToasts(prev => prev.filter(t => t.orderId !== orderId));
    socket.acknowledgeOrder(orderId);
  }, [socket]);

  const value = useMemo<SellerContextValue>(() => ({
    seller,
    socket,
    kpi,
    refreshKPI,
    isLoading,
    pendingToasts,
    dismissToast,
  }), [seller, socket, kpi, refreshKPI, isLoading, pendingToasts, dismissToast]);

  return (
    <SellerContext.Provider value={value}>
      {children}
    </SellerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSeller(): SellerContextValue {
  const ctx = useContext(SellerContext);
  if (!ctx) {
    throw new Error('useSeller must be used within a <SellerProvider>');
  }
  return ctx;
}
