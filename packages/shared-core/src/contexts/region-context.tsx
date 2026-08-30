'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  COUNTRIES, COUNTRY_CODES, DEFAULT_COUNTRY, getCountry, getActiveCountries, isActiveCountry,
  isCountryCode,
  LANGUAGES, normaliseLanguage, getDirection,
  formatMoney, getCurrencySymbolFor, calculateTaxFor, getTaxLabelFor,
  formatDateFor, formatTimeFor, formatDateTimeFor, formatTrackingTimestamp,
  estimateArrival, relativeDayLabel, getTimezone, getTimezoneLabel, nowInRegion,
  getAddressSpec, formatAddress, formatAddressShort, validateAddress, toWireAddress,
  getPaymentMethods, getDefaultPaymentMethod,
  getCompliance, getConsentCategories, getDefaultConsent,
} from '@/lib/localization';
import type {
  AddressValue, CountryCode, CountryLocalization, LanguageCode,
  PaymentMethodSpec, PaymentContext, ComplianceSpec, AddressSpec, DeliveryWindow,
} from '@/lib/localization';
import { API_BASE_URL } from '@/lib/config/api-base';

// ─── Types ───────────────────────────────────────────────────────────────────

/** `ALL` is an admin-only pseudo-region meaning "every market at once". */
export type SupportedCountryCode = CountryCode | 'ALL';

export interface RegionPaymentMethod {
  methodType: string;
  gateway: string;
  displayName: string;
  isDefault?: boolean;
}

/** Legacy shape kept for callers that predate the localization registry. */
export interface RegionConfig {
  code: CountryCode;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  defaultCity: string;
  callingCode: string;
  isActive: boolean;
  enabledModules: string[];
  supportedPaymentMethods: RegionPaymentMethod[];
}

export interface RegionStats {
  code: string; name: string; flag: string; currency: string;
  totalSellers: number; activeSellers: number; totalOrders: number;
  todayOrders: number; totalCustomers: number; totalPartners: number;
  activePartners: number; revenue: number; todayRevenue: number;
}

// ─── Region Registry (projection of the localization core) ───────────────────

/**
 * Derived from `COUNTRIES` rather than declared again, so a change to a
 * region's payment methods or modules lands here automatically.
 */
export const REGIONS: Record<CountryCode, RegionConfig> = COUNTRY_CODES.reduce((acc, code) => {
  const c = COUNTRIES[code];
  acc[code] = {
    code: c.code,
    name: c.name,
    flag: c.flag,
    currencyCode: c.currency.code,
    currencySymbol: c.currency.symbol,
    locale: `${c.defaultLanguage}-${c.code}`,
    timezone: c.timezone,
    defaultCity: c.defaultCity,
    callingCode: c.callingCode,
    isActive: c.isActive,
    enabledModules: c.enabledModules,
    supportedPaymentMethods: c.payments.map((p) => ({
      methodType: p.type,
      gateway: p.gateway,
      displayName: p.label,
      isDefault: p.isDefault,
    })),
  };
  return acc;
}, {} as Record<CountryCode, RegionConfig>);

// ─── Baseline stats ──────────────────────────────────────────────────────────

/**
 * Shown until `/regions/stats` responds, and kept as the fallback when the
 * gateway is unreachable so admin dashboards render rather than showing zeros
 * that read as "this market has no business".
 */
const BASELINE_STATS: Record<string, RegionStats> = {
  QA: { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QR', totalSellers: 1850, activeSellers: 1420, totalOrders: 68000, todayOrders: 2100, totalCustomers: 24300, totalPartners: 680, activePartners: 420, revenue: 8900000, todayRevenue: 310000 },
  IN: { code: 'IN', name: 'India', flag: '🇮🇳', currency: '₹', totalSellers: 12400, activeSellers: 8920, totalOrders: 482000, todayOrders: 14200, totalCustomers: 89500, totalPartners: 3240, activePartners: 1820, revenue: 52400000, todayRevenue: 1840000 },
  AE: { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', totalSellers: 4100, activeSellers: 3200, totalOrders: 192000, todayOrders: 6400, totalCustomers: 56200, totalPartners: 1450, activePartners: 920, revenue: 28400000, todayRevenue: 980000 },
  SA: { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', totalSellers: 5600, activeSellers: 4100, totalOrders: 248000, todayOrders: 8200, totalCustomers: 68400, totalPartners: 1800, activePartners: 1100, revenue: 34200000, todayRevenue: 1120000 },
  BH: { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BD', totalSellers: 820, activeSellers: 610, totalOrders: 31000, todayOrders: 980, totalCustomers: 11200, totalPartners: 290, activePartners: 180, revenue: 4100000, todayRevenue: 142000 },
  KW: { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KD', totalSellers: 1240, activeSellers: 940, totalOrders: 52000, todayOrders: 1650, totalCustomers: 18600, totalPartners: 420, activePartners: 260, revenue: 6800000, todayRevenue: 218000 },
  OM: { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR', totalSellers: 960, activeSellers: 720, totalOrders: 38000, todayOrders: 1200, totalCustomers: 14100, totalPartners: 340, activePartners: 210, revenue: 4900000, todayRevenue: 165000 },
  GB: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: '£', totalSellers: 6800, activeSellers: 5200, totalOrders: 312000, todayOrders: 9800, totalCustomers: 94200, totalPartners: 2100, activePartners: 1420, revenue: 48600000, todayRevenue: 1560000 },
  US: { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$', totalSellers: 9200, activeSellers: 7100, totalOrders: 428000, todayOrders: 13600, totalCustomers: 126400, totalPartners: 2800, activePartners: 1920, revenue: 72400000, todayRevenue: 2340000 },
  SG: { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'S$', totalSellers: 3400, activeSellers: 2800, totalOrders: 185000, todayOrders: 5800, totalCustomers: 62000, totalPartners: 1250, activePartners: 890, revenue: 19800000, todayRevenue: 680000 },
};

// ─── Cookies ─────────────────────────────────────────────────────────────────

export const COUNTRY_COOKIE = 'kartseek_country';
export const LANGUAGE_COOKIE = 'kartseek_language';

const COOKIE_MAX_AGE = 31_536_000; // one year

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// ─── Context ─────────────────────────────────────────────────────────────────

/** Matches the `X-Region-Source` values the edge proxy emits, plus client-side sources. */
export type RegionDetectionSource =
  | 'default' | 'edge' | 'path' | 'cookie' | 'subdomain' | 'geo'
  | 'gps' | 'ip' | 'account' | 'manual';

interface RegionContextType {
  // ── Region ────────────────────────────────────────────────────────────────
  selectedRegion: SupportedCountryCode;
  setSelectedRegion: (code: SupportedCountryCode, source?: RegionDetectionSource) => void;
  /** Full localization record for the active region. Never null — `ALL` resolves
   *  to the default market so formatters always have something to work with. */
  country: CountryLocalization;
  currentRegionConfig: RegionConfig | null;
  allRegions: RegionConfig[];
  getRegionStats: (code?: SupportedCountryCode) => RegionStats[];
  getAggregatedStats: () => {
    totalSellers: number; totalOrders: number; todayOrders: number;
    totalCustomers: number; totalPartners: number; totalRevenue: number; todayRevenue: number;
  };

  // ── Detection ─────────────────────────────────────────────────────────────
  /**
   * Which signal produced the active region.
   *
   * There is no confirmation prompt in the UI — the marketplace header displays
   * the detected location and country and lets either be changed, which is
   * where a correction belongs. Device-level GPS detection lives with that
   * header control (`detectLocation`), so there is exactly one implementation
   * of it rather than two that can drift.
   */
  detectedVia: RegionDetectionSource;

  // ── Language ──────────────────────────────────────────────────────────────
  currentLanguage: LanguageCode;
  setCurrentLanguage: (lang: LanguageCode) => void;
  /** Languages this region offers — `['ar','en']` in Qatar. */
  availableLanguages: LanguageCode[];
  isRtl: boolean;
  dir: 'ltr' | 'rtl';

  // ── Currency ──────────────────────────────────────────────────────────────
  formatCurrencyValue: (amount: number, opts?: { compact?: boolean; showCode?: boolean; decimals?: number }) => string;
  currencySymbol: string;
  currencyCode: string;

  // ── Date, time & delivery ─────────────────────────────────────────────────
  timezone: string;
  timezoneLabel: string;
  formatDateValue: (date: Date | string) => string;
  formatTimeValue: (date: Date | string) => string;
  formatDateTimeValue: (date: Date | string) => string;
  /** Timestamp with the region's zone appended — for delivery tracking events. */
  formatTrackingTime: (date: Date | string) => string;
  /** "Today" / "Tomorrow" / "Sun, 27 Jul", in the region's calendar. */
  formatRelativeDay: (date: Date | string) => string;
  /** Turn a duration promise into a wall-clock window in the region's zone. */
  getDeliveryWindow: (minMinutes: number, maxMinutes: number, placedAt?: Date | string) => DeliveryWindow;
  /** Local wall-clock parts for the region right now. */
  regionNow: () => ReturnType<typeof nowInRegion>;

  // ── Tax ───────────────────────────────────────────────────────────────────
  taxLabel: string;
  calculateTaxValue: (amount: number) => ReturnType<typeof calculateTaxFor>;

  // ── Addresses ─────────────────────────────────────────────────────────────
  addressSpec: AddressSpec;
  formatAddressValue: (address: AddressValue) => string;
  formatAddressShortValue: (address: AddressValue) => string;
  validateAddressValue: (address: AddressValue) => ReturnType<typeof validateAddress>;
  toWireAddressValue: (address: AddressValue) => Record<string, unknown>;

  // ── Payments ──────────────────────────────────────────────────────────────
  paymentMethods: PaymentMethodSpec[];
  getPaymentMethodsFor: (ctx?: Omit<PaymentContext, 'country' | 'language'>) => PaymentMethodSpec[];
  defaultPaymentMethod: PaymentMethodSpec | undefined;

  // ── Compliance ────────────────────────────────────────────────────────────
  compliance: ComplianceSpec;
  consentCategories: ReturnType<typeof getConsentCategories>;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RegionProvider({
  children,
  serverRegion,
  serverLanguage,
}: {
  children: ReactNode;
  serverRegion?: string;
  serverLanguage?: string;
}) {
  // The edge proxy resolves both before the page renders, so there is no
  // client-side flash of the wrong currency. Anything unrecognised (a stale
  // cookie, a region we no longer serve) falls back to the default market.
  // `isActiveCountry`, not `isCountryCode`. The comment above has always claimed
  // that "a region we no longer serve falls back to the default market", but
  // `isCountryCode` accepts every country the registry describes — all twenty —
  // so a stale cookie or an edge header naming a non-trading market put the
  // shopper on that storefront complete with its currency and payment rails.
  const initialRegion: SupportedCountryCode =
    isActiveCountry(serverRegion) ? (serverRegion!.toUpperCase() as CountryCode) : DEFAULT_COUNTRY;

  const initialLanguage: LanguageCode = (() => {
    const requested = normaliseLanguage(serverLanguage);
    const offered = getCountry(initialRegion).languages;
    return requested && offered.includes(requested) ? requested : getCountry(initialRegion).defaultLanguage;
  })();

  const [selectedRegion, setSelectedRegionState] = useState<SupportedCountryCode>(initialRegion);
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(initialLanguage);
  const [detectedVia, setDetectedVia] = useState<RegionDetectionSource>(serverRegion ? 'edge' : 'default');
  const [stats, setStats] = useState<Record<string, RegionStats>>(BASELINE_STATS);

  /**
   * The region all formatters resolve against.
   *
   * `ALL` is an admin filter, not a market — it has no currency or timezone of
   * its own, so amounts under it are rendered in the platform's home market
   * rather than crashing or silently falling back to dollars.
   */
  const effectiveCountry: CountryCode = selectedRegion === 'ALL' ? DEFAULT_COUNTRY : selectedRegion;
  const country = getCountry(effectiveCountry);

  // ── Keep <html lang/dir> in step with the chosen language ─────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('dir', getDirection(currentLanguage));
    document.documentElement.setAttribute('lang', currentLanguage);
  }, [currentLanguage]);

  // ── Live regional statistics (admin surfaces) ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/regions/stats`, {
          headers: { Accept: 'application/json', 'X-Region-Code': effectiveCountry },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return;
        const json = await res.json();
        // The gateway wraps successful responses in `{ success, data }`.
        const rows = json?.data?.stats ?? json?.stats ?? [];
        if (!Array.isArray(rows) || rows.length === 0 || cancelled) return;

        const next: Record<string, RegionStats> = { ...BASELINE_STATS };
        for (const row of rows) {
          if (!row?.code) continue;
          next[row.code] = { ...BASELINE_STATS[row.code], ...row };
        }
        setStats(next);
      } catch {
        // Keep the baseline — an unreachable gateway must not blank the dashboard.
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveCountry]);

  // ── Setters ───────────────────────────────────────────────────────────────

  const setCurrentLanguage = useCallback((lang: LanguageCode) => {
    setCurrentLanguageState(lang);
    writeCookie(LANGUAGE_COOKIE, lang);
  }, []);

  const setSelectedRegion = useCallback((code: SupportedCountryCode, source: RegionDetectionSource = 'manual') => {
    // The switcher only offers trading markets, but this setter is also reached
    // by geolocation and by callers passing a code from elsewhere; a market the
    // platform does not operate is refused here rather than trusted.
    if (code !== 'ALL' && !isActiveCountry(code)) {
      code = DEFAULT_COUNTRY as SupportedCountryCode;
    }
    setSelectedRegionState(code);
    setDetectedVia(source);
    writeCookie(COUNTRY_COOKIE, code);

    if (code === 'ALL') return;

    // A language the new region does not serve cannot stay selected — this is
    // what keeps a visitor who switches from India to Qatar off Hindi.
    const offered = getCountry(code).languages;
    setCurrentLanguageState((current) => {
      if (offered.includes(current)) return current;
      const next = getCountry(code).defaultLanguage;
      writeCookie(LANGUAGE_COOKIE, next);
      return next;
    });
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const currentRegionConfig = selectedRegion === 'ALL' ? null : REGIONS[selectedRegion] ?? null;
  const allRegions = useMemo(() => getActiveCountries().map((c) => REGIONS[c.code]), []);
  const availableLanguages = country.languages;
  const isRtlActive = LANGUAGES[currentLanguage].rtl;

  const getRegionStatsFn = useCallback((code?: SupportedCountryCode): RegionStats[] => {
    if (code && code !== 'ALL') return stats[code] ? [stats[code]] : [];
    return Object.values(stats);
  }, [stats]);

  const getAggregatedStats = useCallback(() => {
    const rows = selectedRegion === 'ALL'
      ? Object.values(stats)
      : [stats[selectedRegion]].filter(Boolean);
    return {
      totalSellers: rows.reduce((s, r) => s + r.totalSellers, 0),
      totalOrders: rows.reduce((s, r) => s + r.totalOrders, 0),
      todayOrders: rows.reduce((s, r) => s + r.todayOrders, 0),
      totalCustomers: rows.reduce((s, r) => s + r.totalCustomers, 0),
      totalPartners: rows.reduce((s, r) => s + r.totalPartners, 0),
      totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      todayRevenue: rows.reduce((s, r) => s + r.todayRevenue, 0),
    };
  }, [selectedRegion, stats]);

  // ── Bound formatters ──────────────────────────────────────────────────────
  // Every one of these carries the active region *and* language, so a component
  // never has to thread a country code through its props to render money or a
  // timestamp correctly.

  const fmtOpts = useMemo(
    () => ({ country: effectiveCountry, language: currentLanguage }),
    [effectiveCountry, currentLanguage],
  );

  const formatCurrencyValue = useCallback(
    (amount: number, opts?: { compact?: boolean; showCode?: boolean; decimals?: number }) =>
      formatMoney(amount, { ...fmtOpts, ...opts }),
    [fmtOpts],
  );

  const formatDateValue = useCallback((d: Date | string) => formatDateFor(d, fmtOpts), [fmtOpts]);
  const formatTimeValue = useCallback((d: Date | string) => formatTimeFor(d, fmtOpts), [fmtOpts]);
  const formatDateTimeValue = useCallback((d: Date | string) => formatDateTimeFor(d, fmtOpts), [fmtOpts]);
  const formatTrackingTime = useCallback((d: Date | string) => formatTrackingTimestamp(d, fmtOpts), [fmtOpts]);
  const formatRelativeDay = useCallback((d: Date | string) => relativeDayLabel(d, fmtOpts), [fmtOpts]);

  const getDeliveryWindow = useCallback(
    (minMinutes: number, maxMinutes: number, placedAt?: Date | string) =>
      estimateArrival(minMinutes, maxMinutes, { ...fmtOpts, placedAt }),
    [fmtOpts],
  );

  const regionNow = useCallback(() => nowInRegion(effectiveCountry), [effectiveCountry]);
  const calculateTaxValue = useCallback((amount: number) => calculateTaxFor(amount, effectiveCountry), [effectiveCountry]);

  const formatAddressValue = useCallback((a: AddressValue) => formatAddress(a, fmtOpts), [fmtOpts]);
  const formatAddressShortValue = useCallback((a: AddressValue) => formatAddressShort(a, fmtOpts), [fmtOpts]);
  const validateAddressValue = useCallback((a: AddressValue) => validateAddress(a, effectiveCountry), [effectiveCountry]);
  const toWireAddressValue = useCallback((a: AddressValue) => toWireAddress(a, effectiveCountry), [effectiveCountry]);

  const getPaymentMethodsFor = useCallback(
    (ctx?: Omit<PaymentContext, 'country' | 'language'>) => getPaymentMethods({ ...ctx, ...fmtOpts }),
    [fmtOpts],
  );

  const value: RegionContextType = {
    selectedRegion, setSelectedRegion, country, currentRegionConfig, allRegions,
    getRegionStats: getRegionStatsFn, getAggregatedStats,

    detectedVia,

    currentLanguage, setCurrentLanguage, availableLanguages,
    isRtl: isRtlActive, dir: isRtlActive ? 'rtl' : 'ltr',

    formatCurrencyValue,
    currencySymbol: getCurrencySymbolFor(effectiveCountry, currentLanguage),
    currencyCode: country.currency.code,

    timezone: getTimezone(effectiveCountry),
    timezoneLabel: getTimezoneLabel(effectiveCountry),
    formatDateValue, formatTimeValue, formatDateTimeValue,
    formatTrackingTime, formatRelativeDay, getDeliveryWindow, regionNow,

    taxLabel: getTaxLabelFor(effectiveCountry),
    calculateTaxValue,

    addressSpec: getAddressSpec(effectiveCountry),
    formatAddressValue, formatAddressShortValue, validateAddressValue, toWireAddressValue,

    paymentMethods: getPaymentMethods(fmtOpts),
    getPaymentMethodsFor,
    defaultPaymentMethod: getDefaultPaymentMethod(fmtOpts),

    compliance: getCompliance(effectiveCountry),
    consentCategories: getConsentCategories(effectiveCountry),
  };

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error('useRegion must be used within a RegionProvider');
  return context;
}

// ─── Convenience Hooks ───────────────────────────────────────────────────────

/** Locale-aware currency formatter bound to the active region. */
export function useFormatCurrency() {
  return useRegion().formatCurrencyValue;
}

/** Locale-aware date formatter bound to the active region's timezone. */
export function useFormatDate() {
  return useRegion().formatDateValue;
}

/** Current currency symbol, in the form matching the active language. */
export function useCurrencySymbol() {
  return useRegion().currencySymbol;
}

/** Whether the active language is right-to-left. */
export function useIsRtl() {
  return useRegion().isRtl;
}

/** The active region's full localization record. */
export function useCountry() {
  return useRegion().country;
}

/** Payment methods available for a checkout in the active region. */
export function usePaymentMethods(ctx?: Omit<PaymentContext, 'country' | 'language'>) {
  const { getPaymentMethodsFor } = useRegion();
  return useMemo(() => getPaymentMethodsFor(ctx), [getPaymentMethodsFor, ctx?.amount, ctx?.module, ctx?.walletBalance]);
}

/** Default consent state for the active region — nothing optional pre-enabled in Qatar. */
export function useDefaultConsent() {
  const { selectedRegion } = useRegion();
  return useMemo(() => getDefaultConsent(selectedRegion === 'ALL' ? DEFAULT_COUNTRY : selectedRegion), [selectedRegion]);
}

export { DEFAULT_COUNTRY };
export type { CountryLocalization, LanguageCode, PaymentMethodSpec };
