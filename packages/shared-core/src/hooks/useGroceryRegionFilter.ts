'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { GROCERY_COUNTRIES, type GroceryCountryCode, formatLocalPrice } from '@/i18n/grocery-locale';

/**
 * Country name → ISO code mapping for filtering grocery mock data
 * that uses human-readable country names.
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

interface GroceryRegionFilterResult<T> {
  /** Filtered data (or all data when 'ALL' regions selected) */
  filtered: T[];
  /** Human-readable label e.g. "India" or "All Regions" */
  regionLabel: string;
  /** true when a specific region is selected (not 'ALL') */
  isFiltered: boolean;
  /** The currently selected region code */
  regionCode: SupportedCountryCode;
  /** Grocery-specific locale-aware currency formatter */
  formatPrice: (amount: number) => string;
  /** Currency symbol for the selected region */
  currencySymbol: string;
  /** Tax label for the selected region (e.g. "GST (5%)", "VAT (15%)") */
  taxLabel: string;
  /** Delivery distance unit (km or miles) */
  deliveryUnit: string;
  /** Store types available in this country */
  storeTypes: string[];
  /** Compliance requirements for this country */
  compliance: string[];
  /** Country flag emoji */
  countryFlag: string;
}

/**
 * Grocery-specific region filter hook.
 *
 * Reads from the global useRegion() context and maps to GroceryCountryConfig
 * for grocery-specific formatting (store types, tax labels, delivery units).
 *
 * @example
 * const { filtered, regionLabel, formatPrice, taxLabel } = useGroceryRegionFilter(STORES);
 */
export function useGroceryRegionFilter<T extends Record<string, any>>(
  data: T[],
): GroceryRegionFilterResult<T> {
  const { selectedRegion } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';

  const regionLabel = isFiltered
    ? REGIONS[selectedRegion]?.name ?? selectedRegion
    : 'All Regions';

  // Map to grocery country config (fallback to India if code not in grocery system)
  const groceryCode: GroceryCountryCode =
    isFiltered && (selectedRegion in GROCERY_COUNTRIES)
      ? selectedRegion as GroceryCountryCode
      : 'IN';

  const groceryConfig = GROCERY_COUNTRIES[groceryCode];

  const formatPrice = useMemo(
    () => (amount: number) => formatLocalPrice(amount, groceryCode),
    [groceryCode],
  );

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
    formatPrice,
    currencySymbol: groceryConfig.currency.symbol,
    taxLabel: groceryConfig.tax.label,
    deliveryUnit: groceryConfig.delivery.radiusUnit,
    storeTypes: groceryConfig.storeTypes,
    compliance: groceryConfig.compliance,
    countryFlag: groceryConfig.flag,
  };
}
