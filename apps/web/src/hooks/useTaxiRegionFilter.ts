'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

interface TaxiCountryConfig {
  currencySymbol: string;
  currencyCode: string;
  flag: string;
  rideHailLicense: string;        // e.g. "RTA Permit", "MoT Permit"
  regulatoryBody: string;         // e.g. "RTA", "TGA", "TfL"
  taxLabel: string;
  surgeCapLabel: string;          // e.g. "2x cap", "No cap"
  paymentModes: string[];
  vehicleTypes: string[];
  compliance: string[];
  locale: string;
}

const TAXI_CONFIGS: Record<string, TaxiCountryConfig> = {
  IN: { currencySymbol: '₹', currencyCode: 'INR', flag: '🇮🇳', rideHailLicense: 'State Transport Permit', regulatoryBody: 'State RTA', taxLabel: 'GST (5%)', surgeCapLabel: '3x cap', paymentModes: ['UPI', 'Cash', 'Card', 'Wallet'], vehicleTypes: ['Auto', 'Mini', 'Sedan', 'SUV', 'Bike'], compliance: ['Commercial Vehicle Permit', 'Driver License', 'Insurance', 'Fitness Certificate'], locale: 'en-IN' },
  QA: { currencySymbol: 'QAR', currencyCode: 'QAR', flag: '🇶🇦', rideHailLicense: 'MoTC License', regulatoryBody: 'MoTC', taxLabel: 'No VAT', surgeCapLabel: '1.5x cap', paymentModes: ['Card', 'Cash', 'Apple Pay'], vehicleTypes: ['Economy', 'Premium', 'Luxury', 'Van'], compliance: ['MoTC Permit', 'Qatar Driving License', 'Insurance', 'Vehicle Inspection'], locale: 'en-QA' },
  AE: { currencySymbol: 'AED', currencyCode: 'AED', flag: '🇦🇪', rideHailLicense: 'RTA e-Hail Permit', regulatoryBody: 'RTA Dubai / DoT Abu Dhabi', taxLabel: 'VAT (5%)', surgeCapLabel: '2x cap', paymentModes: ['Card', 'Cash', 'Apple Pay', 'Nol'], vehicleTypes: ['Economy', 'Business', 'Luxury', 'Van', 'Ladies'], compliance: ['RTA e-Hail Permit', 'UAE Driving License', 'Insurance', 'Vehicle Inspection', 'RTA Training'], locale: 'en-AE' },
  SA: { currencySymbol: 'SAR', currencyCode: 'SAR', flag: '🇸🇦', rideHailLicense: 'TGA License', regulatoryBody: 'TGA (Transport General Authority)', taxLabel: 'VAT (15%)', surgeCapLabel: '2x cap', paymentModes: ['Card', 'mada', 'Apple Pay', 'STC Pay'], vehicleTypes: ['Economy', 'Comfort', 'Business', 'Family'], compliance: ['TGA License', 'Saudi/Iqama Driving License', 'Insurance', 'Saudization', 'Vehicle Inspection'], locale: 'ar-SA' },
  BH: { currencySymbol: 'BHD', currencyCode: 'BHD', flag: '🇧🇭', rideHailLicense: 'MoT Ride-Hail Permit', regulatoryBody: 'MoT Bahrain', taxLabel: 'VAT (10%)', surgeCapLabel: '1.5x cap', paymentModes: ['Card', 'Cash', 'BenefitPay'], vehicleTypes: ['Economy', 'Comfort', 'Premium'], compliance: ['MoT Permit', 'Bahrain Driving License', 'Insurance'], locale: 'en-BH' },
  KW: { currencySymbol: 'KWD', currencyCode: 'KWD', flag: '🇰🇼', rideHailLicense: 'MoI Transport Permit', regulatoryBody: 'MoI Kuwait', taxLabel: 'No VAT', surgeCapLabel: '1.5x cap', paymentModes: ['Card', 'Cash', 'KNET'], vehicleTypes: ['Economy', 'Comfort', 'Premium'], compliance: ['MoI Permit', 'Kuwait Driving License', 'Insurance'], locale: 'en-KW' },
  OM: { currencySymbol: 'OMR', currencyCode: 'OMR', flag: '🇴🇲', rideHailLicense: 'MoT Transport Permit', regulatoryBody: 'MoT Oman', taxLabel: 'VAT (5%)', surgeCapLabel: '2x cap', paymentModes: ['Card', 'Cash'], vehicleTypes: ['Economy', 'Comfort', 'Premium'], compliance: ['MoT Permit', 'Oman Driving License', 'Insurance', 'Vehicle Inspection'], locale: 'en-OM' },
  GB: { currencySymbol: '£', currencyCode: 'GBP', flag: '🇬🇧', rideHailLicense: 'PHV Operator License', regulatoryBody: 'TfL / Local Council', taxLabel: 'VAT (20%)', surgeCapLabel: 'No cap (disclosure required)', paymentModes: ['Card', 'Apple Pay', 'Google Pay'], vehicleTypes: ['Economy', 'Comfort', 'Exec', 'XL', 'WAV'], compliance: ['PHV License', 'DBS Check', 'Topographical Test', 'Insurance', 'Vehicle Inspection'], locale: 'en-GB' },
  US: { currencySymbol: '$', currencyCode: 'USD', flag: '🇺🇸', rideHailLicense: 'TNC License', regulatoryBody: 'State PUC / TLC', taxLabel: 'Sales Tax (varies)', surgeCapLabel: 'No cap (varies by state)', paymentModes: ['Card', 'Apple Pay', 'Google Pay', 'Venmo'], vehicleTypes: ['Economy', 'Comfort', 'XL', 'Black', 'Green'], compliance: ['TNC License', 'Background Check', 'Vehicle Inspection', 'Insurance', 'Airport Permit'], locale: 'en-US' },
  SG: { currencySymbol: 'S$', currencyCode: 'SGD', flag: '🇸🇬', rideHailLicense: 'PDVL (Private Hire Car Driver Vocational License)', regulatoryBody: 'LTA (Land Transport Authority)', taxLabel: 'GST (9%)', surgeCapLabel: 'No cap (disclosure required)', paymentModes: ['Card', 'GrabPay', 'PayNow', 'Apple Pay', 'Google Pay'], vehicleTypes: ['Economy', 'Comfort', 'Premium', 'XL', 'Exec'], compliance: ['PDVL', 'Valid Driving License (Class 3)', 'Vehicle Registration', 'Insurance', 'LTA Inspection'], locale: 'en-SG' },
};

const COUNTRY_NAME_TO_CODE: Record<string, SupportedCountryCode> = {
  'India': 'IN', 'Qatar': 'QA', 'UAE': 'AE', 'Saudi Arabia': 'SA',
  'Bahrain': 'BH', 'Kuwait': 'KW', 'Oman': 'OM',
  'UK': 'GB', 'United Kingdom': 'GB', 'USA': 'US', 'United States': 'US',
  'Singapore': 'SG',
};

interface TaxiRegionFilterResult<T> {
  filtered: T[];
  regionLabel: string;
  isFiltered: boolean;
  regionCode: SupportedCountryCode;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  taxLabel: string;
  rideHailLicense: string;
  regulatoryBody: string;
  surgeCapLabel: string;
  vehicleTypes: string[];
  compliance: string[];
  countryFlag: string;
}

export function useTaxiRegionFilter<T extends Record<string, any>>(
  data: T[],
): TaxiRegionFilterResult<T> {
  const { selectedRegion } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';
  const regionLabel = isFiltered ? REGIONS[selectedRegion]?.name ?? selectedRegion : 'All Regions';
  const configCode = isFiltered && (selectedRegion in TAXI_CONFIGS) ? selectedRegion : 'IN';
  const config = TAXI_CONFIGS[configCode];

  const formatPrice = useMemo(
    () => (amount: number) => {
      try {
        return new Intl.NumberFormat(config.locale, {
          style: 'currency', currency: config.currencyCode,
          minimumFractionDigits: 0, maximumFractionDigits: 0,
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
        if (item.country === selectedRegion) return true;
        const code = COUNTRY_NAME_TO_CODE[item.country];
        return code === selectedRegion;
      }
      return true;
    });
  }, [data, selectedRegion, isFiltered]);

  return {
    filtered, regionLabel, isFiltered, regionCode: selectedRegion,
    formatPrice, currencySymbol: config.currencySymbol, taxLabel: config.taxLabel,
    rideHailLicense: config.rideHailLicense, regulatoryBody: config.regulatoryBody,
    surgeCapLabel: config.surgeCapLabel, vehicleTypes: config.vehicleTypes,
    compliance: config.compliance, countryFlag: config.flag,
  };
}
