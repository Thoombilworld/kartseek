'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

/**
 * Pharmacy-specific country configuration.
 */
interface PharmacyCountryConfig {
  currencySymbol: string;
  currencyCode: string;
  flag: string;
  drugLicense: string;         // e.g. "Drug License (DL)", "DHA Pharmacy License"
  regulatoryBody: string;      // e.g. "CDSCO", "DHA", "SFDA"
  taxLabel: string;
  prescriptionLabel: string;   // e.g. "Rx", "وصفة"
  otcAllowed: boolean;
  eRxSupported: boolean;       // Electronic prescriptions
  controlledDrugClasses: string[];
  compliance: string[];
  locale: string;
}

const PHARMACY_CONFIGS: Record<string, PharmacyCountryConfig> = {
  IN: { currencySymbol: '₹', currencyCode: 'INR', flag: '🇮🇳', drugLicense: 'Drug License (DL)', regulatoryBody: 'CDSCO', taxLabel: 'GST (12%)', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: true, controlledDrugClasses: ['Schedule H', 'Schedule H1', 'Schedule X'], compliance: ['Drug License', 'GST Registration', 'Pharmacist on Premises'], locale: 'en-IN' },
  QA: { currencySymbol: 'QAR', currencyCode: 'QAR', flag: '🇶🇦', drugLicense: 'MOPH Pharmacy License', regulatoryBody: 'MOPH', taxLabel: 'No VAT', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: false, controlledDrugClasses: ['Controlled', 'Semi-Controlled'], compliance: ['MOPH License', 'Pharmacist Registration', 'Storage Compliance'], locale: 'en-QA' },
  AE: { currencySymbol: 'AED', currencyCode: 'AED', flag: '🇦🇪', drugLicense: 'DHA Pharmacy License', regulatoryBody: 'DHA / DOH', taxLabel: 'VAT (5%)', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: true, controlledDrugClasses: ['Controlled', 'Semi-Controlled', 'Narcotic'], compliance: ['DHA License', 'Pharmacist License', 'Cold Chain Certification'], locale: 'en-AE' },
  SA: { currencySymbol: 'SAR', currencyCode: 'SAR', flag: '🇸🇦', drugLicense: 'SFDA Pharmacy License', regulatoryBody: 'SFDA', taxLabel: 'VAT (15%)', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: true, controlledDrugClasses: ['Controlled', 'Psychotropic', 'Narcotic'], compliance: ['SFDA License', 'Wasfaty Integration', 'Saudization Compliance'], locale: 'ar-SA' },
  BH: { currencySymbol: 'BHD', currencyCode: 'BHD', flag: '🇧🇭', drugLicense: 'NHRA Pharmacy License', regulatoryBody: 'NHRA', taxLabel: 'VAT (10%)', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: false, controlledDrugClasses: ['Controlled', 'Narcotic'], compliance: ['NHRA License', 'Pharmacist Registration'], locale: 'en-BH' },
  KW: { currencySymbol: 'KWD', currencyCode: 'KWD', flag: '🇰🇼', drugLicense: 'MOH Pharmacy License', regulatoryBody: 'KDFA', taxLabel: 'No VAT', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: false, controlledDrugClasses: ['Controlled', 'Narcotic'], compliance: ['MOH License', 'Drug Import Permit'], locale: 'en-KW' },
  OM: { currencySymbol: 'OMR', currencyCode: 'OMR', flag: '🇴🇲', drugLicense: 'MOH Pharmacy License', regulatoryBody: 'MOH', taxLabel: 'VAT (5%)', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: false, controlledDrugClasses: ['Controlled', 'Narcotic'], compliance: ['MOH License', 'Pharmacist Registration', 'Storage Audit'], locale: 'en-OM' },
  GB: { currencySymbol: '£', currencyCode: 'GBP', flag: '🇬🇧', drugLicense: 'GPhC Registration', regulatoryBody: 'MHRA / GPhC', taxLabel: 'VAT (0% Rx, 20% OTC)', prescriptionLabel: 'Rx / POM', otcAllowed: true, eRxSupported: true, controlledDrugClasses: ['CD Schedule 2', 'CD Schedule 3', 'CD Schedule 4', 'CD Schedule 5'], compliance: ['GPhC Registration', 'Responsible Pharmacist', 'NHS Contract'], locale: 'en-GB' },
  US: { currencySymbol: '$', currencyCode: 'USD', flag: '🇺🇸', drugLicense: 'State Board of Pharmacy License', regulatoryBody: 'FDA / DEA', taxLabel: 'Sales Tax (varies)', prescriptionLabel: 'Rx', otcAllowed: true, eRxSupported: true, controlledDrugClasses: ['Schedule I', 'Schedule II', 'Schedule III', 'Schedule IV', 'Schedule V'], compliance: ['DEA Registration', 'State License', 'HIPAA Compliance'], locale: 'en-US' },
};

/**
 * Country name → ISO code mapping.
 */
const COUNTRY_NAME_TO_CODE: Record<string, SupportedCountryCode> = {
  'India': 'IN', 'Qatar': 'QA', 'UAE': 'AE', 'Saudi Arabia': 'SA',
  'Bahrain': 'BH', 'Kuwait': 'KW', 'Oman': 'OM',
  'UK': 'GB', 'United Kingdom': 'GB', 'USA': 'US', 'United States': 'US',
};

interface PharmacyRegionFilterResult<T> {
  filtered: T[];
  regionLabel: string;
  isFiltered: boolean;
  regionCode: SupportedCountryCode;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  taxLabel: string;
  drugLicense: string;
  regulatoryBody: string;
  prescriptionLabel: string;
  controlledDrugClasses: string[];
  compliance: string[];
  countryFlag: string;
}

/**
 * Pharmacy-specific region filter hook.
 *
 * Reads from the global useRegion() context and maps to PharmacyCountryConfig
 * for pharmacy-specific formatting (drug licenses, regulatory bodies, drug schedules).
 */
export function usePharmacyRegionFilter<T extends Record<string, any>>(
  data: T[],
): PharmacyRegionFilterResult<T> {
  const { selectedRegion } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';

  const regionLabel = isFiltered
    ? REGIONS[selectedRegion]?.name ?? selectedRegion
    : 'All Regions';

  const configCode = isFiltered && (selectedRegion in PHARMACY_CONFIGS)
    ? selectedRegion
    : 'IN';

  const config = PHARMACY_CONFIGS[configCode];

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
    drugLicense: config.drugLicense,
    regulatoryBody: config.regulatoryBody,
    prescriptionLabel: config.prescriptionLabel,
    controlledDrugClasses: config.controlledDrugClasses,
    compliance: config.compliance,
    countryFlag: config.flag,
  };
}
