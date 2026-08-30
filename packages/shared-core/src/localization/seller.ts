/// KARTSEEK — Region rules for the Seller Marketplace Portal
///
/// What a seller must register, how they get paid and which tax return they
/// file are all country-specific. The portal reads these rather than hard-coding
/// India's GST/PAN/UPI stack, which is what made a Qatari seller's dashboard ask
/// for a GSTIN and offer NEFT payouts.

import { getCountry } from './countries';
import type { CountryCode } from './types';

export interface SellerDocumentSpec {
  /** Stable key stored against the uploaded document. */
  key: string;
  label: string;
  labelAr?: string;
  required: boolean;
  /** Short badge text for the compliance strip. */
  badge: string;
  helper?: string;
}

export interface SellerPayoutRail {
  key: string;
  label: string;
  /** Business days from settlement to funds landing. */
  settlementDays: number;
  isDefault?: boolean;
}

export interface SellerRegionRules {
  /** Documents collected during onboarding and KYC review. */
  documents: SellerDocumentSpec[];
  /** How the seller receives their payouts. */
  payoutRails: SellerPayoutRail[];
  /** Label for the tax registration number field, if the region has one. */
  taxIdLabel: string | null;
  /** Nav label for the tax filing section, or null where none applies. */
  taxFilingLabel: string | null;
  /** Bank identifier a payout account needs (IBAN, IFSC, sort code…). */
  bankIdentifierLabel: string;
  bankIdentifierPattern?: string;
  bankIdentifierHelper?: string;
  /** Regulators a seller answers to in this market. */
  regulators: string[];
}

const RULES: Record<CountryCode, SellerRegionRules> = {
  QA: {
    documents: [
      { key: 'commercial_registration', label: 'Commercial Registration (CR)', labelAr: 'السجل التجاري', required: true, badge: 'CR', helper: 'Issued by the Ministry of Commerce and Industry' },
      { key: 'trade_licence', label: 'Trade Licence', labelAr: 'الرخصة التجارية', required: true, badge: 'Trade Licence', helper: 'Issued by your municipality' },
      { key: 'establishment_card', label: 'Establishment Card', labelAr: 'البطاقة المنشأة', required: true, badge: 'Est. Card' },
      { key: 'owner_qid', label: 'Owner Qatari ID (QID)', labelAr: 'البطاقة الشخصية', required: true, badge: 'QID' },
      { key: 'bank_letter', label: 'Bank Account Letter', labelAr: 'خطاب الحساب البنكي', required: true, badge: 'Bank IBAN' },
    ],
    payoutRails: [
      { key: 'qatar_bank_transfer', label: 'Bank Transfer (QNB, CBQ, Doha Bank)', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    // Qatar has no VAT, so there is no periodic consumption-tax return to file.
    taxIdLabel: 'Commercial Registration (CR) Number',
    taxFilingLabel: null,
    bankIdentifierLabel: 'IBAN',
    bankIdentifierPattern: '^QA\\d{2}[A-Z]{4}[A-Z0-9]{21}$',
    bankIdentifierHelper: 'Qatari IBANs are 29 characters and start with QA',
    regulators: ['Ministry of Commerce and Industry', 'Qatar Central Bank', 'Ministry of Municipality'],
  },

  IN: {
    documents: [
      { key: 'gstin', label: 'GST Registration (GSTIN)', required: true, badge: 'GST' },
      { key: 'pan', label: 'PAN Card', required: true, badge: 'PAN' },
      { key: 'bank_proof', label: 'Cancelled Cheque / Bank Statement', required: true, badge: 'Bank' },
      { key: 'fssai', label: 'FSSAI Licence', required: false, badge: 'FSSAI', helper: 'Required to sell food and grocery' },
      { key: 'bis', label: 'BIS Certification', required: false, badge: 'BIS', helper: 'Required for regulated electronics' },
    ],
    payoutRails: [
      { key: 'neft', label: 'NEFT / IMPS Bank Transfer', settlementDays: 1, isDefault: true },
      { key: 'upi', label: 'UPI', settlementDays: 0 },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'GSTIN',
    taxFilingLabel: 'GST Filing',
    bankIdentifierLabel: 'IFSC Code',
    bankIdentifierPattern: '^[A-Z]{4}0[A-Z0-9]{6}$',
    bankIdentifierHelper: '11 characters, e.g. HDFC0001234',
    regulators: ['GST Council', 'RBI', 'FSSAI', 'Legal Metrology'],
  },

  AE: {
    documents: [
      { key: 'trade_licence', label: 'Trade Licence', required: true, badge: 'Trade Licence' },
      { key: 'trn', label: 'VAT Registration (TRN)', required: true, badge: 'TRN' },
      { key: 'emirates_id', label: 'Owner Emirates ID', required: true, badge: 'Emirates ID' },
      { key: 'bank_letter', label: 'Bank Account Letter', required: true, badge: 'Bank IBAN' },
    ],
    payoutRails: [
      { key: 'uae_bank_transfer', label: 'Bank Transfer', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'TRN',
    taxFilingLabel: 'VAT Returns',
    bankIdentifierLabel: 'IBAN',
    bankIdentifierPattern: '^AE\\d{21}$',
    regulators: ['Federal Tax Authority', 'Department of Economic Development', 'UAE Central Bank'],
  },

  SA: {
    documents: [
      { key: 'commercial_registration', label: 'Commercial Registration', required: true, badge: 'CR' },
      { key: 'vat', label: 'VAT Certificate', required: true, badge: 'VAT' },
      { key: 'national_id', label: 'Owner National ID / Iqama', required: true, badge: 'ID' },
      { key: 'bank_letter', label: 'Bank Account Letter', required: true, badge: 'Bank IBAN' },
    ],
    payoutRails: [
      { key: 'sarie', label: 'SARIE Bank Transfer', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'VAT Number',
    taxFilingLabel: 'ZATCA Returns',
    bankIdentifierLabel: 'IBAN',
    bankIdentifierPattern: '^SA\\d{22}$',
    regulators: ['ZATCA', 'Ministry of Commerce', 'SAMA'],
  },

  BH: {
    documents: [
      { key: 'cr', label: 'Commercial Registration', required: true, badge: 'CR' },
      { key: 'vat', label: 'VAT Account', required: true, badge: 'VAT' },
      { key: 'cpr', label: 'Owner CPR', required: true, badge: 'CPR' },
      { key: 'bank_letter', label: 'Bank Account Letter', required: true, badge: 'Bank IBAN' },
    ],
    payoutRails: [
      { key: 'bh_bank_transfer', label: 'Bank Transfer', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'VAT Account Number',
    taxFilingLabel: 'VAT Returns',
    bankIdentifierLabel: 'IBAN',
    bankIdentifierPattern: '^BH\\d{2}[A-Z]{4}[A-Z0-9]{14}$',
    regulators: ['National Bureau for Revenue', 'MOIC', 'Central Bank of Bahrain'],
  },

  KW: {
    documents: [
      { key: 'cr', label: 'Commercial Licence', required: true, badge: 'Licence' },
      { key: 'civil_id', label: 'Owner Civil ID', required: true, badge: 'Civil ID' },
      { key: 'bank_letter', label: 'Bank Account Letter', required: true, badge: 'Bank IBAN' },
    ],
    payoutRails: [
      { key: 'kw_bank_transfer', label: 'Bank Transfer', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: null,
    taxFilingLabel: null,
    bankIdentifierLabel: 'IBAN',
    bankIdentifierPattern: '^KW\\d{2}[A-Z]{4}[A-Z0-9]{22}$',
    regulators: ['Ministry of Commerce and Industry', 'Central Bank of Kuwait'],
  },

  OM: {
    documents: [
      { key: 'cr', label: 'Commercial Registration', required: true, badge: 'CR' },
      { key: 'vat', label: 'VAT Certificate', required: true, badge: 'VAT' },
      { key: 'id_card', label: 'Owner ID Card', required: true, badge: 'ID' },
      { key: 'bank_letter', label: 'Bank Account Letter', required: true, badge: 'Bank IBAN' },
    ],
    payoutRails: [
      { key: 'om_bank_transfer', label: 'Bank Transfer', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'VAT Number',
    taxFilingLabel: 'VAT Returns',
    bankIdentifierLabel: 'IBAN',
    bankIdentifierPattern: '^OM\\d{2}[A-Z0-9]{19}$',
    regulators: ['Oman Tax Authority', 'Ministry of Commerce', 'Central Bank of Oman'],
  },

  GB: {
    documents: [
      { key: 'company_number', label: 'Companies House Number', required: true, badge: 'Co. No.' },
      { key: 'vat', label: 'VAT Registration', required: false, badge: 'VAT', helper: 'Required above the registration threshold' },
      { key: 'id', label: 'Director Photo ID', required: true, badge: 'ID' },
      { key: 'bank_proof', label: 'Bank Statement', required: true, badge: 'Bank' },
    ],
    payoutRails: [
      { key: 'faster_payments', label: 'Faster Payments', settlementDays: 1, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'VAT Number',
    taxFilingLabel: 'VAT Returns',
    bankIdentifierLabel: 'Sort Code',
    bankIdentifierPattern: '^\\d{2}-?\\d{2}-?\\d{2}$',
    regulators: ['HMRC', 'Companies House', 'FCA'],
  },

  US: {
    documents: [
      { key: 'ein', label: 'EIN / Tax ID', required: true, badge: 'EIN' },
      { key: 'w9', label: 'Form W-9', required: true, badge: 'W-9' },
      { key: 'id', label: 'Owner Photo ID', required: true, badge: 'ID' },
      { key: 'bank_proof', label: 'Voided Check / Bank Letter', required: true, badge: 'Bank' },
    ],
    payoutRails: [
      { key: 'ach', label: 'ACH Transfer', settlementDays: 2, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'Sales Tax ID',
    taxFilingLabel: 'Sales Tax Reports',
    bankIdentifierLabel: 'Routing Number',
    bankIdentifierPattern: '^\\d{9}$',
    regulators: ['IRS', 'State revenue departments', 'FTC'],
  },

  SG: {
    documents: [
      { key: 'uen', label: 'ACRA UEN', required: true, badge: 'UEN' },
      { key: 'gst', label: 'GST Registration', required: false, badge: 'GST' },
      { key: 'nric', label: 'Director NRIC / FIN', required: true, badge: 'NRIC' },
      { key: 'bank_proof', label: 'Bank Statement', required: true, badge: 'Bank' },
    ],
    payoutRails: [
      { key: 'giro', label: 'GIRO / FAST', settlementDays: 1, isDefault: true },
      { key: 'wallet', label: 'KARTSEEK Wallet', settlementDays: 0 },
    ],
    taxIdLabel: 'GST Registration Number',
    taxFilingLabel: 'GST Returns',
    bankIdentifierLabel: 'Bank & Branch Code',
    regulators: ['IRAS', 'ACRA', 'MAS'],
  },
};

export function getSellerRules(country?: string): SellerRegionRules {
  return RULES[getCountry(country).code];
}

/** Short badges for the portal's compliance strip. */
export function getSellerComplianceBadges(country?: string): string[] {
  return getSellerRules(country).documents.filter((d) => d.required).map((d) => d.badge);
}

/** Documents a seller must upload before they can be approved in this market. */
export function getRequiredSellerDocuments(country?: string): SellerDocumentSpec[] {
  return getSellerRules(country).documents.filter((d) => d.required);
}

export function getSellerTaxIdLabel(country?: string): string | null {
  return getSellerRules(country).taxIdLabel;
}

export function getDefaultPayoutRail(country?: string): SellerPayoutRail | undefined {
  const rails = getSellerRules(country).payoutRails;
  return rails.find((r) => r.isDefault) ?? rails[0];
}

/** Nav label for the payouts section — names the rail sellers actually use. */
export function getPayoutNavLabel(country?: string): string {
  const rail = getDefaultPayoutRail(country);
  const short = rail?.label.split('(')[0]?.trim() ?? 'Payouts';
  return `Payouts (${short})`;
}

/** Validate a payout bank identifier against the region's format. */
export function validateBankIdentifier(value: string, country?: string): { valid: boolean; message?: string } {
  const rules = getSellerRules(country);
  const trimmed = value.trim().toUpperCase().replace(/\s/g, '');
  if (!trimmed) return { valid: false, message: `${rules.bankIdentifierLabel} is required` };
  if (rules.bankIdentifierPattern && !new RegExp(rules.bankIdentifierPattern).test(trimmed)) {
    return { valid: false, message: rules.bankIdentifierHelper ?? `${rules.bankIdentifierLabel} is not valid` };
  }
  return { valid: true };
}
