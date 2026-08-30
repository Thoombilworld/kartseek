'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

/**
 * Restaurant-specific country configuration.
 */
interface RestaurantCountryConfig {
  currencySymbol: string;
  currencyCode: string;
  flag: string;
  foodLicense: string;       // e.g. "FSSAI", "DM", "SFDA", "FSA"
  taxLabel: string;          // e.g. "GST (5%)", "VAT (5%)", "VAT (15%)"
  serviceModes: string[];    // e.g. ["Delivery", "Takeaway", "Dine-in"]
  tippingPolicy: string;     // e.g. "Optional", "Service Charge Included"
  compliance: string[];      // e.g. ["Halal Certification", "Hygiene Rating"]
  locale: string;            // BCP-47 locale for Intl formatting
}

const RESTAURANT_CONFIGS: Record<string, RestaurantCountryConfig> = {
  IN: { currencySymbol: '₹', currencyCode: 'INR', flag: '🇮🇳', foodLicense: 'FSSAI', taxLabel: 'GST (5%)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in', 'Table Booking'], tippingPolicy: 'Optional', compliance: ['FSSAI License', 'Fire Safety', 'Municipal NOC'], locale: 'en-IN' },
  QA: { currencySymbol: 'QAR', currencyCode: 'QAR', flag: '🇶🇦', foodLicense: 'MOPH', taxLabel: 'No VAT', serviceModes: ['Delivery', 'Takeaway', 'Dine-in'], tippingPolicy: 'Service Charge (10%)', compliance: ['Halal Certification', 'MOPH License', 'Civil Defense'], locale: 'en-QA' },
  AE: { currencySymbol: 'AED', currencyCode: 'AED', flag: '🇦🇪', foodLicense: 'DM', taxLabel: 'VAT (5%)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in', 'Table Booking'], tippingPolicy: 'Service Charge (10%)', compliance: ['Dubai Municipality License', 'Halal Certification', 'Civil Defense'], locale: 'en-AE' },
  SA: { currencySymbol: 'SAR', currencyCode: 'SAR', flag: '🇸🇦', foodLicense: 'SFDA', taxLabel: 'VAT (15%)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in'], tippingPolicy: 'Optional', compliance: ['SFDA License', 'Halal Certification', 'Balady Certification'], locale: 'ar-SA' },
  BH: { currencySymbol: 'BHD', currencyCode: 'BHD', flag: '🇧🇭', foodLicense: 'NHRA', taxLabel: 'VAT (10%)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in'], tippingPolicy: 'Optional', compliance: ['NHRA License', 'Halal Certification'], locale: 'en-BH' },
  KW: { currencySymbol: 'KWD', currencyCode: 'KWD', flag: '🇰🇼', foodLicense: 'PAI', taxLabel: 'No VAT', serviceModes: ['Delivery', 'Takeaway', 'Dine-in'], tippingPolicy: 'Optional', compliance: ['PAI License', 'Halal Certification'], locale: 'en-KW' },
  OM: { currencySymbol: 'OMR', currencyCode: 'OMR', flag: '🇴🇲', foodLicense: 'MOH', taxLabel: 'VAT (5%)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in'], tippingPolicy: 'Optional', compliance: ['MOH License', 'Halal Certification'], locale: 'en-OM' },
  GB: { currencySymbol: '£', currencyCode: 'GBP', flag: '🇬🇧', foodLicense: 'FSA', taxLabel: 'VAT (20%)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in', 'Table Booking'], tippingPolicy: 'Optional (12.5% suggested)', compliance: ['FSA Rating', 'Allergen Labelling', 'Fire Safety'], locale: 'en-GB' },
  US: { currencySymbol: '$', currencyCode: 'USD', flag: '🇺🇸', foodLicense: 'Health Dept', taxLabel: 'Sales Tax (varies)', serviceModes: ['Delivery', 'Takeaway', 'Dine-in', 'Table Booking'], tippingPolicy: 'Expected (15-20%)', compliance: ['Health Dept Permit', 'Food Handler Cert', 'Liquor License'], locale: 'en-US' },
};

/**
 * Country name → ISO code mapping for filtering restaurant mock data.
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

interface RestaurantRegionFilterResult<T> {
  filtered: T[];
  regionLabel: string;
  isFiltered: boolean;
  regionCode: SupportedCountryCode;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  taxLabel: string;
  foodLicense: string;
  serviceModes: string[];
  tippingPolicy: string;
  compliance: string[];
  countryFlag: string;
}

/**
 * Restaurant-specific region filter hook.
 *
 * Reads from the global useRegion() context and maps to RestaurantCountryConfig
 * for restaurant-specific formatting (food licenses, service modes, tipping, compliance).
 */
export function useRestaurantRegionFilter<T extends Record<string, any>>(
  data: T[],
): RestaurantRegionFilterResult<T> {
  const { selectedRegion } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';

  const regionLabel = isFiltered
    ? REGIONS[selectedRegion]?.name ?? selectedRegion
    : 'All Regions';

  const configCode = isFiltered && (selectedRegion in RESTAURANT_CONFIGS)
    ? selectedRegion
    : 'IN';

  const config = RESTAURANT_CONFIGS[configCode];

  const formatPrice = useMemo(
    () => (amount: number) => {
      try {
        return new Intl.NumberFormat(config.locale, {
          style: 'currency',
          currency: config.currencyCode,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${config.currencySymbol}${amount.toLocaleString()}`;
      }
    },
    [config.locale, config.currencyCode, config.currencySymbol],
  );

  const filtered = useMemo(() => {
    if (!isFiltered) return data;

    return data.filter(item => {
      // 1. Check `region` field (ISO code)
      if (item.region) return item.region === selectedRegion;
      // 2. Check `code` field (ISO code)
      if (item.code) return item.code === selectedRegion;
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
    currencySymbol: config.currencySymbol,
    taxLabel: config.taxLabel,
    foodLicense: config.foodLicense,
    serviceModes: config.serviceModes,
    tippingPolicy: config.tippingPolicy,
    compliance: config.compliance,
    countryFlag: config.flag,
  };
}
