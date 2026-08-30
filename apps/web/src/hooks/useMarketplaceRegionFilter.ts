'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

/**
 * Country name → ISO code mapping for filtering mock data that uses
 * human-readable country names instead of ISO codes.
 */
const COUNTRY_NAME_TO_CODE: Record<string, SupportedCountryCode> = {
  'India': 'IN',
  'Qatar': 'QA',
  'UAE': 'AE',
  'Saudi Arabia': 'SA',
  'Bahrain': 'BH',
  'Kuwait': 'KW',
  'Oman': 'OM',
  'UK': 'GB',
  'United Kingdom': 'GB',
  'USA': 'US',
  'United States': 'US',
};

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
 * Supports objects with:
 * - `region` field (ISO code: 'IN', 'AE', etc.)
 * - `code` field (ISO code)
 * - `country` field (human-readable name: 'India', 'UAE', etc.)
 *
 * When 'ALL' is selected, all items are returned unfiltered.
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
    ? REGIONS[selectedRegion]?.name ?? selectedRegion
    : 'All Regions';

  const filtered = useMemo(() => {
    if (!isFiltered) return data;

    return data.filter(item => {
      // 1. Check `region` field (ISO code)
      if (item.region) {
        return item.region === selectedRegion;
      }
      // 2. Check `code` field (ISO code)
      if (item.code) {
        return item.code === selectedRegion;
      }
      // 3. Check `country` field (human name → ISO code)
      if (item.country) {
        const code = COUNTRY_NAME_TO_CODE[item.country];
        return code === selectedRegion;
      }
      // No region-related field — include by default
      return true;
    });
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
