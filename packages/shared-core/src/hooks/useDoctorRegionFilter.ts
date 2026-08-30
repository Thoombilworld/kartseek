'use client';

import { useMemo } from 'react';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';

/**
 * Doctor & Hospital country configuration.
 */
interface DoctorCountryConfig {
  currencySymbol: string;
  currencyCode: string;
  flag: string;
  medicalCouncil: string;       // e.g. "MCI / NMC", "DHA", "SCFHS"
  registrationPrefix: string;   // e.g. "MCI", "DHA", "SCFHS"
  taxLabel: string;
  telemedAllowed: boolean;
  ePrescription: boolean;
  compliance: string[];
  locale: string;
}

const DOCTOR_CONFIGS: Record<string, DoctorCountryConfig> = {
  IN: { currencySymbol: '₹', currencyCode: 'INR', flag: '🇮🇳', medicalCouncil: 'NMC / State Medical Council', registrationPrefix: 'MCI', taxLabel: 'GST (18%)', telemedAllowed: true, ePrescription: true, compliance: ['NMC Registration', 'State Medical Council', 'Telemedicine Guidelines 2020'], locale: 'en-IN' },
  QA: { currencySymbol: 'QAR', currencyCode: 'QAR', flag: '🇶🇦', medicalCouncil: 'MOPH', registrationPrefix: 'MOPH', taxLabel: 'No VAT', telemedAllowed: true, ePrescription: false, compliance: ['MOPH License', 'Dataflow Verification', 'Malpractice Insurance'], locale: 'en-QA' },
  AE: { currencySymbol: 'AED', currencyCode: 'AED', flag: '🇦🇪', medicalCouncil: 'DHA / DOH / MOH', registrationPrefix: 'DHA', taxLabel: 'VAT (5%)', telemedAllowed: true, ePrescription: true, compliance: ['DHA/DOH License', 'Dataflow Verification', 'Malpractice Insurance', 'CME Credits'], locale: 'en-AE' },
  SA: { currencySymbol: 'SAR', currencyCode: 'SAR', flag: '🇸🇦', medicalCouncil: 'SCFHS', registrationPrefix: 'SCFHS', taxLabel: 'VAT (15%)', telemedAllowed: true, ePrescription: true, compliance: ['SCFHS License', 'Dataflow Verification', 'Saudization', 'Malpractice Insurance'], locale: 'ar-SA' },
  BH: { currencySymbol: 'BHD', currencyCode: 'BHD', flag: '🇧🇭', medicalCouncil: 'NHRA', registrationPrefix: 'NHRA', taxLabel: 'VAT (10%)', telemedAllowed: true, ePrescription: false, compliance: ['NHRA License', 'Dataflow Verification', 'Malpractice Insurance'], locale: 'en-BH' },
  KW: { currencySymbol: 'KWD', currencyCode: 'KWD', flag: '🇰🇼', medicalCouncil: 'KIMS / MOH', registrationPrefix: 'MOH-KW', taxLabel: 'No VAT', telemedAllowed: false, ePrescription: false, compliance: ['MOH License', 'Equivalency Certificate', 'Malpractice Insurance'], locale: 'en-KW' },
  OM: { currencySymbol: 'OMR', currencyCode: 'OMR', flag: '🇴🇲', medicalCouncil: 'MOH Oman', registrationPrefix: 'MOH-OM', taxLabel: 'VAT (5%)', telemedAllowed: true, ePrescription: false, compliance: ['MOH License', 'Dataflow Verification', 'Malpractice Insurance'], locale: 'en-OM' },
  GB: { currencySymbol: '£', currencyCode: 'GBP', flag: '🇬🇧', medicalCouncil: 'GMC', registrationPrefix: 'GMC', taxLabel: 'VAT (20%)', telemedAllowed: true, ePrescription: true, compliance: ['GMC Registration', 'DBS Check', 'Indemnity Insurance', 'Revalidation'], locale: 'en-GB' },
  US: { currencySymbol: '$', currencyCode: 'USD', flag: '🇺🇸', medicalCouncil: 'State Medical Board', registrationPrefix: 'NPI', taxLabel: 'Varies by state', telemedAllowed: true, ePrescription: true, compliance: ['State License', 'DEA Registration', 'Board Certification', 'Malpractice Insurance'], locale: 'en-US' },
};

const COUNTRY_NAME_TO_CODE: Record<string, SupportedCountryCode> = {
  'India': 'IN', 'Qatar': 'QA', 'UAE': 'AE', 'Saudi Arabia': 'SA',
  'Bahrain': 'BH', 'Kuwait': 'KW', 'Oman': 'OM',
  'UK': 'GB', 'United Kingdom': 'GB', 'USA': 'US', 'United States': 'US',
};

interface DoctorRegionFilterResult<T> {
  filtered: T[];
  regionLabel: string;
  isFiltered: boolean;
  regionCode: SupportedCountryCode;
  formatPrice: (amount: number) => string;
  currencySymbol: string;
  taxLabel: string;
  medicalCouncil: string;
  registrationPrefix: string;
  compliance: string[];
  countryFlag: string;
}

export function useDoctorRegionFilter<T extends Record<string, any>>(
  data: T[],
): DoctorRegionFilterResult<T> {
  const { selectedRegion } = useRegion();

  const isFiltered = selectedRegion !== 'ALL';

  const regionLabel = isFiltered
    ? REGIONS[selectedRegion]?.name ?? selectedRegion
    : 'All Regions';

  const configCode = isFiltered && (selectedRegion in DOCTOR_CONFIGS)
    ? selectedRegion
    : 'IN';

  const config = DOCTOR_CONFIGS[configCode];

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
        if (item.country === selectedRegion) return true;
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
    medicalCouncil: config.medicalCouncil,
    registrationPrefix: config.registrationPrefix,
    compliance: config.compliance,
    countryFlag: config.flag,
  };
}
