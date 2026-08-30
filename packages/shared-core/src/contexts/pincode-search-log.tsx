'use client';

import React, {
  createContext, useContext, useCallback, useRef,
  type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PincodeSearchEntry {
  id: string;
  /** The pincode that was searched */
  pincode: string;
  /** Where the search originated */
  source: 'product_page' | 'checkout' | 'address_form' | 'grocery_checkout' | 'pincode_input' | 'other';
  /** Whether the pincode was found serviceable */
  serviceable: boolean;
  /** Resolved city (if known) */
  city?: string;
  /** Resolved state (if known) */
  state?: string;
  /** Region code (country) */
  regionCode: string;
  /** Timestamp */
  timestamp: string;
  /** User agent module (marketplace, grocery, etc.) */
  module?: string;
}

export interface PincodeSearchStats {
  totalSearches: number;
  uniquePincodes: number;
  serviceableCount: number;
  unserviceableCount: number;
  /** Top searched unserviceable pincodes, sorted by frequency */
  topUnserviceable: { pincode: string; count: number; lastSearched: string }[];
  /** Top searched pincodes overall, sorted by frequency */
  topSearched: { pincode: string; count: number; serviceable: boolean }[];
}

export interface NotifyMeSignup {
  id: string;
  pincode: string;
  email: string;
  phone?: string;
  timestamp: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface PincodeSearchLogContextValue {
  /** Log a pincode search event */
  logPincodeSearch: (entry: Omit<PincodeSearchEntry, 'id' | 'timestamp'>) => void;
  /** Get all logged searches */
  getSearchLog: () => PincodeSearchEntry[];
  /** Get aggregated statistics */
  getStats: () => PincodeSearchStats;
  /** Get search count */
  getSearchCount: () => number;
  /** Clear all entries */
  clearLog: () => void;
  /** Log a Notify Me signup */
  logNotifyMe: (data: { pincode: string; email: string; phone?: string }) => void;
  /** Get all Notify Me signups */
  getNotifyMeSignups: () => NotifyMeSignup[];
}

const PincodeSearchLogContext = createContext<PincodeSearchLogContextValue | undefined>(undefined);

// ─── Seed data — realistic unserviceable pincode searches ─────────────────────

function generateSeedEntries(): PincodeSearchEntry[] {
  const now = new Date();
  return [
    // Unserviceable — rural/remote areas people searched
    { id: 'ps_seed_01', pincode: '793109', source: 'product_page', serviceable: false, state: 'Meghalaya', city: 'Nongstoin', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 5).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_02', pincode: '793109', source: 'product_page', serviceable: false, state: 'Meghalaya', city: 'Nongstoin', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 4).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_03', pincode: '793109', source: 'checkout', serviceable: false, state: 'Meghalaya', city: 'Nongstoin', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_04', pincode: '795001', source: 'product_page', serviceable: false, state: 'Manipur', city: 'Imphal', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 3).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_05', pincode: '795001', source: 'grocery_checkout', serviceable: false, state: 'Manipur', city: 'Imphal', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'grocery' },
    { id: 'ps_seed_06', pincode: '796001', source: 'product_page', serviceable: false, state: 'Mizoram', city: 'Aizawl', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 6).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_07', pincode: '796001', source: 'checkout', serviceable: false, state: 'Mizoram', city: 'Aizawl', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_08', pincode: '796001', source: 'product_page', serviceable: false, state: 'Mizoram', city: 'Aizawl', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'grocery' },
    { id: 'ps_seed_09', pincode: '796001', source: 'address_form', serviceable: false, state: 'Mizoram', city: 'Aizawl', regionCode: 'IN', timestamp: new Date(now.getTime() - 3600000 * 6).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_10', pincode: '799001', source: 'product_page', serviceable: false, state: 'Tripura', city: 'Agartala', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 4).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_11', pincode: '799001', source: 'checkout', serviceable: false, state: 'Tripura', city: 'Agartala', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_12', pincode: '791001', source: 'product_page', serviceable: false, state: 'Arunachal Pradesh', city: 'Itanagar', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 7).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_13', pincode: '737101', source: 'product_page', serviceable: false, state: 'Sikkim', city: 'Gangtok', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 3).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_14', pincode: '737101', source: 'grocery_checkout', serviceable: false, state: 'Sikkim', city: 'Gangtok', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'grocery' },
    { id: 'ps_seed_15', pincode: '313001', source: 'product_page', serviceable: false, state: 'Rajasthan', city: 'Udaipur', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(), module: 'marketplace' },
    // Serviceable — normal metro searches
    { id: 'ps_seed_16', pincode: '400001', source: 'product_page', serviceable: true, state: 'Maharashtra', city: 'Mumbai GPO', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_17', pincode: '110001', source: 'product_page', serviceable: true, state: 'Delhi', city: 'Connaught Place', regionCode: 'IN', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_18', pincode: '560001', source: 'checkout', serviceable: true, state: 'Karnataka', city: 'Bengaluru GPO', regionCode: 'IN', timestamp: new Date(now.getTime() - 3600000 * 12).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_19', pincode: '500001', source: 'product_page', serviceable: true, state: 'Telangana', city: 'Hyderabad GPO', regionCode: 'IN', timestamp: new Date(now.getTime() - 3600000 * 8).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_20', pincode: '600001', source: 'grocery_checkout', serviceable: true, state: 'Tamil Nadu', city: 'Chennai GPO', regionCode: 'IN', timestamp: new Date(now.getTime() - 3600000 * 4).toISOString(), module: 'grocery' },
    // Gulf region searches
    { id: 'ps_seed_21', pincode: '00000', source: 'checkout', serviceable: false, regionCode: 'AE', timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(), module: 'marketplace' },
    { id: 'ps_seed_22', pincode: '11564', source: 'address_form', serviceable: true, city: 'Riyadh', regionCode: 'SA', timestamp: new Date(now.getTime() - 86400000 * 1).toISOString(), module: 'marketplace' },
  ];
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PincodeSearchLogProvider({ children }: { children: ReactNode }) {
  const logRef = useRef<PincodeSearchEntry[]>(generateSeedEntries());

  const logPincodeSearch = useCallback(
    (entry: Omit<PincodeSearchEntry, 'id' | 'timestamp'>) => {
      const newEntry: PincodeSearchEntry = {
        ...entry,
        id: `ps_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date().toISOString(),
      };
      logRef.current = [newEntry, ...logRef.current];

      // Cap at 2000 entries
      if (logRef.current.length > 2000) {
        logRef.current = logRef.current.slice(0, 2000);
      }
    },
    [],
  );

  const getSearchLog = useCallback(() => [...logRef.current], []);

  const getSearchCount = useCallback(() => logRef.current.length, []);

  const getStats = useCallback((): PincodeSearchStats => {
    const log = logRef.current;
    const totalSearches = log.length;
    const uniquePincodes = new Set(log.map(e => e.pincode)).size;
    const serviceableCount = log.filter(e => e.serviceable).length;
    const unserviceableCount = log.filter(e => !e.serviceable).length;

    // Aggregate unserviceable by pincode
    const unserviceableMap = new Map<string, { count: number; lastSearched: string }>();
    log.filter(e => !e.serviceable).forEach(e => {
      const existing = unserviceableMap.get(e.pincode);
      if (existing) {
        existing.count++;
        if (e.timestamp > existing.lastSearched) existing.lastSearched = e.timestamp;
      } else {
        unserviceableMap.set(e.pincode, { count: 1, lastSearched: e.timestamp });
      }
    });
    const topUnserviceable = Array.from(unserviceableMap.entries())
      .map(([pincode, data]) => ({ pincode, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Aggregate all by pincode
    const allMap = new Map<string, { count: number; serviceable: boolean }>();
    log.forEach(e => {
      const existing = allMap.get(e.pincode);
      if (existing) {
        existing.count++;
      } else {
        allMap.set(e.pincode, { count: 1, serviceable: e.serviceable });
      }
    });
    const topSearched = Array.from(allMap.entries())
      .map(([pincode, data]) => ({ pincode, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { totalSearches, uniquePincodes, serviceableCount, unserviceableCount, topUnserviceable, topSearched };
  }, []);

  const clearLog = useCallback(() => { logRef.current = []; }, []);

  // ── Notify Me ──
  const notifyMeRef = useRef<NotifyMeSignup[]>([
    { id: 'nm_seed_1', pincode: '793109', email: 'rahul.k@gmail.com', phone: '+91 98123 45678', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'nm_seed_2', pincode: '796001', email: 'priya.m@yahoo.com', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'nm_seed_3', pincode: '795001', email: 'ankit.s@outlook.com', phone: '+91 87654 32100', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'nm_seed_4', pincode: '796001', email: 'deepa.l@gmail.com', timestamp: new Date(Date.now() - 3600000 * 8).toISOString() },
    { id: 'nm_seed_5', pincode: '737101', email: 'tenzin.d@proton.me', phone: '+91 70001 23456', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  ]);

  const logNotifyMe = useCallback((data: { pincode: string; email: string; phone?: string }) => {
    notifyMeRef.current = [{
      ...data,
      id: `nm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    }, ...notifyMeRef.current];
  }, []);

  const getNotifyMeSignups = useCallback(() => [...notifyMeRef.current], []);

  return (
    <PincodeSearchLogContext.Provider value={{ logPincodeSearch, getSearchLog, getStats, getSearchCount, clearLog, logNotifyMe, getNotifyMeSignups }}>
      {children}
    </PincodeSearchLogContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePincodeSearchLog(): PincodeSearchLogContextValue {
  const ctx = useContext(PincodeSearchLogContext);
  if (!ctx) throw new Error('usePincodeSearchLog must be used within <PincodeSearchLogProvider>');
  return ctx;
}
