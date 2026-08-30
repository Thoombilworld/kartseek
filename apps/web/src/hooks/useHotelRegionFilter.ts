'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

/**
 * Hotel-specific country configuration.
 */
interface HotelCountryConfig {
  currencySymbol: string;
  currencyCode: string;
  flag: string;
  tourismLicense: string;       // e.g. "DTCM", "Qatar Tourism", "Ministry of Tourism"
  starRatingBody: string;       // e.g. "DTCM", "QTA", "HRACC"
  taxLabel: string;
  tourismLevy: string;          // e.g. "Tourism Dirham", "Municipality Fee"
  bookingModes: string[];
  compliance: string[];
  locale: string;
}

const HOTEL_CONFIGS: Record<string, HotelCountryConfig> = {
  IN: { currencySymbol: '₹', currencyCode: 'INR', flag: '🇮🇳', tourismLicense: 'Ministry of Tourism', starRatingBody: 'HRACC', taxLabel: 'GST (12-18%)', tourismLevy: 'None', bookingModes: ['Online', 'Walk-in', 'OTA', 'Corporate'], compliance: ['FHRAI Registration', 'Fire Safety', 'Police Verification'], locale: 'en-IN' },
  QA: { currencySymbol: 'QAR', currencyCode: 'QAR', flag: '🇶🇦', tourismLicense: 'Qatar Tourism', starRatingBody: 'QTA', taxLabel: 'No VAT', tourismLevy: 'None', bookingModes: ['Online', 'Walk-in', 'OTA'], compliance: ['Qatar Tourism License', 'Civil Defense', 'Municipality Permit'], locale: 'en-QA' },
  AE: { currencySymbol: 'AED', currencyCode: 'AED', flag: '🇦🇪', tourismLicense: 'DTCM', starRatingBody: 'DTCM', taxLabel: 'VAT (5%)', tourismLevy: 'Tourism Dirham (AED 7-20/night)', bookingModes: ['Online', 'Walk-in', 'OTA', 'Corporate', 'Concierge'], compliance: ['DTCM License', 'Civil Defense', 'Municipality Permit', 'Tourism Dirham Collection'], locale: 'en-AE' },
  SA: { currencySymbol: 'SAR', currencyCode: 'SAR', flag: '🇸🇦', tourismLicense: 'MoT / STA', starRatingBody: 'STA', taxLabel: 'VAT (15%)', tourismLevy: 'White Land Tax (if applicable)', bookingModes: ['Online', 'Walk-in', 'OTA', 'Hajj/Umrah'], compliance: ['STA License', 'Saudization', 'Civil Defense', 'Municipality Permit'], locale: 'ar-SA' },
  BH: { currencySymbol: 'BHD', currencyCode: 'BHD', flag: '🇧🇭', tourismLicense: 'BTEA', starRatingBody: 'BTEA', taxLabel: 'VAT (10%)', tourismLevy: 'Tourism Levy (5%)', bookingModes: ['Online', 'Walk-in', 'OTA'], compliance: ['BTEA License', 'Civil Defense', 'Municipality Permit'], locale: 'en-BH' },
  KW: { currencySymbol: 'KWD', currencyCode: 'KWD', flag: '🇰🇼', tourismLicense: 'MoC', starRatingBody: 'MoC', taxLabel: 'No VAT', tourismLevy: 'None', bookingModes: ['Online', 'Walk-in', 'OTA'], compliance: ['Commerce License', 'Civil Defense', 'Municipality Permit'], locale: 'en-KW' },
  OM: { currencySymbol: 'OMR', currencyCode: 'OMR', flag: '🇴🇲', tourismLicense: 'Ministry of Heritage & Tourism', starRatingBody: 'MHT', taxLabel: 'VAT (5%)', tourismLevy: 'Tourism Tax (4%)', bookingModes: ['Online', 'Walk-in', 'OTA'], compliance: ['MHT License', 'Civil Defense', 'Municipality Permit'], locale: 'en-OM' },
  GB: { currencySymbol: '£', currencyCode: 'GBP', flag: '🇬🇧', tourismLicense: 'Local Council Registration', starRatingBody: 'AA / Visit England', taxLabel: 'VAT (20%)', tourismLevy: 'None', bookingModes: ['Online', 'Walk-in', 'OTA', 'Corporate'], compliance: ['Planning Permission', 'Fire Safety', 'Health & Safety', 'DBS Checks'], locale: 'en-GB' },
  US: { currencySymbol: '$', currencyCode: 'USD', flag: '🇺🇸', tourismLicense: 'State/City Business License', starRatingBody: 'AAA / Forbes', taxLabel: 'Sales + Occupancy Tax (varies)', tourismLevy: 'Transient Occupancy Tax', bookingModes: ['Online', 'Walk-in', 'OTA', 'Corporate', 'Loyalty'], compliance: ['Business License', 'Fire Marshal Cert', 'Health Dept Permit', 'ADA Compliance'], locale: 'en-US' },
};

const COUNTRY_NAME_TO_CODE: Record<string, SupportedCountryCode> = {
  'India': 'IN', 'Qatar': 'QA', 'UAE': 'AE', 'Saudi Arabia': 'SA',
  'Bahrain': 'BH', 'Kuwait': 'KW', 'Oman': 'OM',
  'UK': 'GB', 'United Kingdom': 'GB', 'USA': 'US', 'United States': 'US',
};

interface HotelRegionFilterResult<T> {
  filtered: T[];
  regionLabel: string;
  isFiltered: boolean;
  regionCode: SupportedCountryCode;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  taxLabel: string;
  tourismLicense: string;
  tourismLevy: string;
  bookingModes: string[];
  compliance: string[];
  countryFlag: string;
}

/**
 * Hotel-specific region filter hook.
 */
export function useHotelRegionFilter<T extends Record<string, any>>(
  data: T[],
): HotelRegionFilterResult<T> {
  const { selectedRegion } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';

  const regionLabel = isFiltered
    ? REGIONS[selectedRegion]?.name ?? selectedRegion
    : 'All Regions';

  const configCode = isFiltered && (selectedRegion in HOTEL_CONFIGS)
    ? selectedRegion
    : 'IN';

  const config = HOTEL_CONFIGS[configCode];

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
      if (item.region) return item.region === selectedRegion;
      if (item.code) return item.code === selectedRegion;
      if (item.country) {
        // Check if it's already an ISO code
        if (item.country === selectedRegion) return true;
        // Check if it's a human name
        const code = COUNTRY_NAME_TO_CODE[item.country];
        return code === selectedRegion;
      }
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
    tourismLicense: config.tourismLicense,
    tourismLevy: config.tourismLevy,
    bookingModes: config.bookingModes,
    compliance: config.compliance,
    countryFlag: config.flag,
  };
}
