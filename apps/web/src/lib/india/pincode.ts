/**
 * India PIN Code Client Utilities
 *
 * Client-side PIN code lookup, validation, and formatting.
 * Works with the /api/v1/regions/india/pincode/:pin backend endpoint.
 */

import { useState, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PinCodeResult {
  pinCode: string;
  stateName: string;
  stateCode: string;
  district: string;
  city: string;
  zone: string;
  tier: 1 | 2 | 3;
  isUT: boolean;
  deliverable: boolean;
  estimatedDeliveryDays: { standard: number; express: number };
}

export interface PinLookupState {
  result: PinCodeResult | null;
  isLoading: boolean;
  error: string | null;
  isValid: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Validate that a PIN is exactly 6 digits and not a trivial pattern */
export function validateIndianPin(pin: string): { valid: boolean; error?: string } {
  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: 'PIN code must be exactly 6 digits' };
  }
  if (/^(\d)\1{5}$/.test(pin)) {
    return { valid: false, error: 'Invalid PIN code' };
  }
  const first = parseInt(pin[0], 10);
  if (first < 1 || first > 8) {
    return { valid: false, error: 'Invalid Indian PIN code — must start with 1–8' };
  }
  return { valid: true };
}

// ─── Local fast lookup (no API call for known PINs) ───────────────────────────

const LOCAL_PIN_MAP: Record<string, Pick<PinCodeResult, 'stateName' | 'stateCode' | 'district' | 'city' | 'tier'>> = {
  // Delhi
  '110001': { stateName: 'Delhi', stateCode: 'DL', district: 'New Delhi', city: 'Connaught Place', tier: 1 },
  '110020': { stateName: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Saket', tier: 1 },
  '110045': { stateName: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Dwarka', tier: 1 },
  '110048': { stateName: 'Delhi', stateCode: 'DL', district: 'South Delhi', city: 'Hauz Khas', tier: 1 },
  '110092': { stateName: 'Delhi', stateCode: 'DL', district: 'East Delhi', city: 'Shakarpur', tier: 1 },
  // Mumbai
  '400001': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Mumbai', city: 'Mumbai GPO', tier: 1 },
  '400005': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Mumbai', city: 'Colaba', tier: 1 },
  '400050': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Bandra West', tier: 1 },
  '400053': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Andheri East', tier: 1 },
  '400059': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Powai', tier: 1 },
  '400076': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban', city: 'Borivali', tier: 1 },
  // Pune
  '411001': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Pune City', tier: 1 },
  '411021': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Kothrud', tier: 1 },
  '411045': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Wakad', tier: 1 },
  '411057': { stateName: 'Maharashtra', stateCode: 'MH', district: 'Pune', city: 'Hinjewadi', tier: 1 },
  // Bengaluru
  '560001': { stateName: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Bengaluru GPO', tier: 1 },
  '560034': { stateName: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Koramangala', tier: 1 },
  '560041': { stateName: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Whitefield', tier: 1 },
  '560066': { stateName: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'HSR Layout', tier: 1 },
  '560068': { stateName: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Indiranagar', tier: 1 },
  '560100': { stateName: 'Karnataka', stateCode: 'KA', district: 'Bengaluru Urban', city: 'Electronic City', tier: 1 },
  // Hyderabad
  '500001': { stateName: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Hyderabad GPO', tier: 1 },
  '500008': { stateName: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Banjara Hills', tier: 1 },
  '500081': { stateName: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'Gachibowli', tier: 1 },
  '500084': { stateName: 'Telangana', stateCode: 'TG', district: 'Hyderabad', city: 'HITEC City', tier: 1 },
  // Chennai
  '600001': { stateName: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Chennai GPO', tier: 1 },
  '600017': { stateName: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Anna Nagar', tier: 1 },
  '600042': { stateName: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai', city: 'Velachery', tier: 1 },
  // Kolkata
  '700001': { stateName: 'West Bengal', stateCode: 'WB', district: 'Kolkata', city: 'Kolkata GPO', tier: 1 },
  '700064': { stateName: 'West Bengal', stateCode: 'WB', district: 'Kolkata', city: 'Salt Lake', tier: 1 },
  // Ahmedabad
  '380001': { stateName: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad', city: 'Ahmedabad GPO', tier: 1 },
  '380058': { stateName: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad', city: 'Bopal', tier: 1 },
  // Noida / Gurugram
  '201301': { stateName: 'Uttar Pradesh', stateCode: 'UP', district: 'Noida', city: 'Noida Sector 18', tier: 1 },
  '122001': { stateName: 'Haryana', stateCode: 'HR', district: 'Gurgaon', city: 'Gurugram', tier: 1 },
  '122002': { stateName: 'Haryana', stateCode: 'HR', district: 'Gurgaon', city: 'DLF City', tier: 1 },
  // Lucknow, Jaipur, Chandigarh, Kochi
  '226001': { stateName: 'Uttar Pradesh', stateCode: 'UP', district: 'Lucknow', city: 'Lucknow GPO', tier: 1 },
  '302001': { stateName: 'Rajasthan', stateCode: 'RJ', district: 'Jaipur', city: 'Jaipur GPO', tier: 1 },
  '160001': { stateName: 'Chandigarh', stateCode: 'CH', district: 'Chandigarh', city: 'Sector 17', tier: 1 },
  '682001': { stateName: 'Kerala', stateCode: 'KL', district: 'Ernakulam', city: 'Kochi', tier: 1 },
};

/** Tier delivery info */
const TIER_DELIVERY = {
  1: { standard: 1, express: 1, label: 'Metro — Same/Next Day' },
  2: { standard: 3, express: 2, label: 'Tier-2 — 2–3 Days' },
  3: { standard: 7, express: 5, label: 'Tier-3 — 5–7 Days' },
};

/** Fast local PIN lookup (no network) */
export function localPinLookup(pin: string): PinCodeResult | null {
  const { valid } = validateIndianPin(pin);
  if (!valid) return null;

  const known = LOCAL_PIN_MAP[pin];
  if (known) {
    return {
      pinCode: pin,
      ...known,
      zone: `Zone ${pin[0]}`,
      isUT: ['DL', 'CH', 'PY', 'AN', 'LD', 'DN', 'JK', 'LA'].includes(known.stateCode),
      deliverable: true,
      estimatedDeliveryDays: TIER_DELIVERY[known.tier],
    };
  }
  return null;
}

// ─── React Hook ───────────────────────────────────────────────────────────────

/**
 * usePinCode — React hook for PIN code lookup with debounce
 *
 * Usage:
 *   const { result, isLoading, error, lookup } = usePinCode();
 *   lookup('400001'); // triggers lookup
 */
export function usePinCode() {
  const [state, setState] = useState<PinLookupState>({
    result: null,
    isLoading: false,
    error: null,
    isValid: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = useCallback(async (pin: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const { valid, error } = validateIndianPin(pin);
    if (!valid) {
      setState({ result: null, isLoading: false, error: error ?? null, isValid: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, isValid: true }));

    debounceRef.current = setTimeout(async () => {
      // Try local map first (instant, no network)
      const local = localPinLookup(pin);
      if (local) {
        setState({ result: local, isLoading: false, error: null, isValid: true });
        return;
      }

      // Fallback: API call
      try {
        const res = await fetch(`/api/v1/regions/india/pincode/${pin}`);
        if (!res.ok) throw new Error('PIN code not found');
        const data: PinCodeResult = await res.json();
        setState({ result: data, isLoading: false, error: null, isValid: true });
      } catch {
        setState({ result: null, isLoading: false, error: 'PIN code not found. Please check and try again.', isValid: true });
      }
    }, 300);
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState({ result: null, isLoading: false, error: null, isValid: false });
  }, []);

  return { ...state, lookup, reset };
}

// ─── INR Formatting ───────────────────────────────────────────────────────────

/** Format number in Indian notation (1,23,456) */
export function formatIndianNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

/** Format amount as INR with ₹ symbol */
export function formatINR(amount: number, options?: { compact?: boolean; decimals?: number }): string {
  if (options?.compact) {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)} Cr`;
    if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(1)} L`;
    if (amount >= 1_000)      return `₹${(amount / 1_000).toFixed(1)}K`;
    return `₹${amount}`;
  }
  const decimals = options?.decimals ?? 0;
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Parse INR amount from string (handles ₹, L, Cr) */
export function parseINR(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, '');
  if (cleaned.endsWith('Cr')) return parseFloat(cleaned) * 10_000_000;
  if (cleaned.endsWith('L'))  return parseFloat(cleaned) * 100_000;
  if (cleaned.endsWith('K'))  return parseFloat(cleaned) * 1_000;
  return parseFloat(cleaned) || 0;
}
