'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

/**
 * Country name → ISO code mapping for filtering mock data that uses
 * human-readable country names instead of ISO codes.
 */
const COUNTRY_NAME_TO_CODE: Record<string, SupportedCountryCode> = {
  India: 'IN',
  Qatar: 'QA',
  UAE: 'AE',
  'Saudi Arabia': 'SA',
  Bahrain: 'BH',
  Kuwait: 'KW',
  Oman: 'OM',
  UK: 'GB',
  'United Kingdom': 'GB',
  USA: 'US',
  'United States': 'US',
};

/** Every field spelling a row's market has shown up under, checked in this order. */
const REGION_FIELDS = [
  'regionCode',
  'region_code',
  'countryCode',
  'country_code',
  'region',
  'code',
  'country',
] as const;

/**
 * Does one row belong to the selected region?
 *
 * `region` of `undefined` or `'ALL'` means "no filter" — every row matches,
 * the same as the hook's own `isFiltered` gate. Otherwise the first
 * region-related field the row carries (checked in `REGION_FIELDS` order)
 * decides, human country names included (`'Qatar'` as well as `'QA'`).
 *
 * A row with NONE of these fields is EXCLUDED when a region is selected.
 *
 * That default used to be inclusion — "no region-related field, so show it
 * anyway" — which meant a Super Admin "viewing QA" saw every unattributable
 * row under a QA heading and could not tell which figures were actually
 * Qatar's (audit V13/F-32). Excluding matches the rule the server now
 * follows everywhere: `assertInMarket(null, scope)` refuses an unattributed
 * record for a locked caller, and a list should not show what a decision
 * would refuse. This hook is a SECOND line of defence now, not the first —
 * every admin fetch passes `?country=`/`?regionCode=`/`?countryCode=` (see
 * the `packages/shared-core/src/api/admin-*.ts` clients), so a row from
 * another market should not reach the browser at all; if one does, that is a
 * server bug the operator should not be shown while it is open.
 */
export function matchesRegion(
  item: Record<string, any> | null | undefined,
  region: string | undefined,
): boolean {
  if (!region || region === 'ALL') return true;
  const wanted = String(region).toUpperCase();
  for (const key of REGION_FIELDS) {
    const raw = item?.[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const code = COUNTRY_NAME_TO_CODE[raw] ?? String(raw).toUpperCase();
    return code === wanted;
  }
  return false;
}

interface RegionFilterResult<T> {
  /** Filtered data (or all data when 'ALL' regions selected) */
  filtered: T[];
  /** Human-readable label e.g. "India" or "All Regions" */
  regionLabel: string;
  /** true when a specific region is selected (not 'ALL') */
  isFiltered: boolean;
  /** The currently selected region code */
  regionCode: SupportedCountryCode;
  /** Locale-aware currency formatter */
  formatCurrencyValue: (amount: number, opts?: { compact?: boolean; showCode?: boolean }) => string;
  /** Currency symbol for the selected region */
  currencySymbol: string;
}

/**
 * Filters any array of objects by the currently selected admin region.
 *
 * Supports objects with `regionCode`, `region_code`, `countryCode`,
 * `country_code`, `region` or `code` (ISO codes) and `country` (an ISO code
 * or a human-readable name: 'India', 'UAE', etc.).
 *
 * When 'ALL' is selected, all items are returned unfiltered. When a specific
 * region is selected, a row with none of the fields above is EXCLUDED — see
 * `matchesRegion`.
 *
 * This hook is a second line of defence: every admin list fetch now asks the
 * server for one market (`?country=`/`?regionCode=`/`?countryCode=`), so this
 * filter should rarely remove anything in practice. It stays because a locked
 * admin's own browser must never render another market's row even for the
 * instant before a server bug is fixed.
 *
 * @example
 * const { filtered, regionLabel, isFiltered } = useMarketplaceRegionFilter(SELLERS);
 */
export function useMarketplaceRegionFilter<T extends Record<string, any>>(
  data: T[],
): RegionFilterResult<T> {
  const { selectedRegion, formatCurrencyValue, currencySymbol } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';

  const regionLabel = isFiltered
    ? (REGIONS[selectedRegion]?.name ?? selectedRegion)
    : 'All Regions';

  const filtered = useMemo(() => {
    if (!isFiltered) return data;
    return data.filter((item) => matchesRegion(item, selectedRegion));
  }, [data, selectedRegion, isFiltered]);

  return {
    filtered,
    regionLabel,
    isFiltered,
    regionCode: selectedRegion,
    formatCurrencyValue,
    currencySymbol,
  };
}
