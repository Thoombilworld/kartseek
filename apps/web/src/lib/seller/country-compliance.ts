/**
 * KARTSEEK — Country Compliance Configuration
 *
 * Config-driven, no hard-coded country logic. Add new markets by adding entries.
 *
 * This is the authority on which nine countries a seller can be onboarded in and
 * what each one demands — tax scheme, registration numbers, bank fields and KYC
 * documents. It used to live under `lib/demo-data/`, which badly understated it:
 * the seller registration wizard, the module landing pages and the compliance
 * field renderer all read from here, so it is production configuration, not a
 * fixture.
 */
import type { SellerCountryCode, BusinessType, DocumentType } from './types';

export interface CountryComplianceConfig {
  code: SellerCountryCode;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;

  // Tax system
  taxSystem: 'gst' | 'vat' | 'sales_tax' | 'none';
  taxLabel: string;
  taxRate: number;
  stateTaxSupport: boolean;
  hsnCodeRequired: boolean;

  // Business types allowed
  allowedBusinessTypes: BusinessType[];

  // Required documents
  requiredDocuments: { type: DocumentType; label: string; description: string }[];

  // Food safety
  foodSafetyLicenceLabel: string;
  foodSafetyRequired: boolean;
  allergenInfoRequired: boolean;
  expiryDateRequired: boolean;
  batchNumberRequired: boolean;
  mfgDateRequired: boolean;
  mrpRequired: boolean;
  shelfLifeRequired: boolean;

  // Product fields
  arabicProductSupport: boolean;
  halalCertificationSupport: boolean;

  // Operations
  codSupported: boolean;
  scheduledDeliverySupport: boolean;
  substitutionWorkflow: boolean;
  distanceSellingInfo: boolean;

  // Fresh product support
  coldChainProofRequired: boolean;
  weightBasedSellingDefault: boolean;

  // Registration fields
  registrationFields: { key: string; label: string; placeholder: string; required: boolean }[];
  bankFields: { key: string; label: string; placeholder: string; required: boolean }[];
}

export const COUNTRY_COMPLIANCE: Record<SellerCountryCode, CountryComplianceConfig> = {
  IN: {
    code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹',
    taxSystem: 'gst', taxLabel: 'GST', taxRate: 18, stateTaxSupport: true, hsnCodeRequired: true,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','organic_grocery','bakery','wholesale_grocery','brand_distributor','dark_store'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Business Registration', description: 'Company/Firm registration certificate' },
      { type: 'tax_certificate', label: 'GST Certificate', description: 'GSTIN registration certificate' },
      { type: 'food_safety_licence', label: 'FSSAI Licence', description: 'FSSAI licence or registration number' },
      { type: 'bank_details', label: 'Bank Account Proof', description: 'Cancelled cheque or bank statement' },
      { type: 'owner_id', label: 'Owner Aadhaar/PAN', description: 'Aadhaar card or PAN card of owner' },
      { type: 'store_photos', label: 'Store Photos', description: 'Photos of store front and interior' },
      { type: 'address_proof', label: 'Address Proof', description: 'Utility bill or rental agreement' },
    ],
    foodSafetyLicenceLabel: 'FSSAI Licence', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: true,
    mfgDateRequired: true, mrpRequired: true, shelfLifeRequired: true,
    arabicProductSupport: false, halalCertificationSupport: false,
    codSupported: true, scheduledDeliverySupport: false, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: true, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'gstNumber', label: 'GST Number (GSTIN)', placeholder: '22AAAAA0000A1Z5', required: true },
      { key: 'fssaiNumber', label: 'FSSAI Licence Number', placeholder: '12345678901234', required: true },
      { key: 'panNumber', label: 'PAN Number', placeholder: 'AAAAA1234A', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'State Bank of India', required: true },
      { key: 'accountNumber', label: 'Account Number', placeholder: '1234567890', required: true },
      { key: 'accountHolderName', label: 'Account Holder Name', placeholder: 'Business Name', required: true },
      { key: 'ifscCode', label: 'IFSC Code', placeholder: 'SBIN0001234', required: true },
    ],
  },
  QA: {
    code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR', currencySymbol: '﷼',
    taxSystem: 'none', taxLabel: 'Tax', taxRate: 0, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','organic_grocery','bakery','wholesale_grocery','brand_distributor','dark_store'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Commercial Registration (CR)', description: 'Valid CR from Ministry of Commerce' },
      { type: 'trade_licence', label: 'Trade Licence', description: 'Municipality trade licence' },
      { type: 'ecommerce_licence', label: 'E-Commerce Licence', description: 'E-commerce activity readiness' },
      { type: 'owner_id', label: 'Owner QID', description: 'Qatar ID of the business owner' },
      { type: 'bank_details', label: 'Bank Details', description: 'Bank account IBAN' },
      { type: 'store_photos', label: 'Store Photos', description: 'Store front and interior photos' },
    ],
    foodSafetyLicenceLabel: 'Municipality Health Permit', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: true, halalCertificationSupport: true,
    codSupported: true, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: true, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'commercialRegistration', label: 'Commercial Registration Number', placeholder: 'CR-12345', required: true },
      { key: 'tradeLicenceNumber', label: 'Trade Licence Number', placeholder: 'TL-2024-XXXX', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'Qatar National Bank', required: true },
      { key: 'ibanNumber', label: 'IBAN', placeholder: 'QA12QNBA000000000012345678', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  AE: {
    code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', currencySymbol: 'د.إ',
    taxSystem: 'vat', taxLabel: 'VAT', taxRate: 5, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','organic_grocery','bakery','wholesale_grocery','brand_distributor','dark_store'],
    requiredDocuments: [
      { type: 'trade_licence', label: 'Trade Licence', description: 'DED Trade Licence with e-commerce activity' },
      { type: 'tax_certificate', label: 'VAT TRN Certificate', description: 'Tax Registration Number certificate' },
      { type: 'ecommerce_licence', label: 'E-Commerce Activity', description: 'E-commerce activity on trade licence' },
      { type: 'owner_id', label: 'Owner Emirates ID', description: 'Emirates ID of business owner' },
      { type: 'bank_details', label: 'Bank Details', description: 'Bank IBAN' },
      { type: 'store_photos', label: 'Store Photos', description: 'Store photos' },
    ],
    foodSafetyLicenceLabel: 'Municipality Food Permit', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: true, halalCertificationSupport: true,
    codSupported: true, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: true, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'tradeLicenceNumber', label: 'Trade Licence Number', placeholder: 'TL-XXXXX', required: true },
      { key: 'vatTrn', label: 'VAT TRN', placeholder: '100XXXXXXX00003', required: true },
      { key: 'emirate', label: 'Emirate', placeholder: 'Select Emirate', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'Emirates NBD', required: true },
      { key: 'ibanNumber', label: 'IBAN', placeholder: 'AE12 0260 0010 1234 5678 901', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  SA: {
    code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', currencySymbol: '﷼',
    taxSystem: 'vat', taxLabel: 'VAT', taxRate: 15, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','organic_grocery','bakery','wholesale_grocery','brand_distributor','dark_store'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Commercial Registration', description: 'CR from Ministry of Commerce' },
      { type: 'tax_certificate', label: 'VAT Certificate', description: 'ZATCA VAT registration' },
      { type: 'owner_id', label: 'National ID / Iqama', description: 'Owner identification' },
      { type: 'bank_details', label: 'Bank Details', description: 'IBAN details' },
      { type: 'store_photos', label: 'Store Photos', description: 'Store front photos' },
    ],
    foodSafetyLicenceLabel: 'SFDA Licence', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: true, halalCertificationSupport: true,
    codSupported: true, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: true, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'commercialRegistration', label: 'Commercial Registration', placeholder: 'CR-XXXXXXXXXX', required: true },
      { key: 'vatTrn', label: 'VAT Number', placeholder: '3XXXXXXXX00003', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'Al Rajhi Bank', required: true },
      { key: 'ibanNumber', label: 'IBAN', placeholder: 'SA12 8000 0000 1234 5678 9012', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  BH: {
    code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD', currencySymbol: 'ب.د',
    taxSystem: 'vat', taxLabel: 'VAT', taxRate: 10, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','bakery','wholesale_grocery','dark_store'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Commercial Registration', description: 'CR certificate' },
      { type: 'tax_certificate', label: 'VAT Certificate', description: 'NBR VAT registration' },
      { type: 'owner_id', label: 'Owner CPR', description: 'CPR of business owner' },
      { type: 'bank_details', label: 'Bank Details', description: 'IBAN' },
    ],
    foodSafetyLicenceLabel: 'Health Permit', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: true, halalCertificationSupport: true,
    codSupported: true, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: false, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'commercialRegistration', label: 'CR Number', placeholder: 'CR-XXXXX', required: true },
      { key: 'vatTrn', label: 'VAT Number', placeholder: 'VAT-XXXXX', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'National Bank of Bahrain', required: true },
      { key: 'ibanNumber', label: 'IBAN', placeholder: 'BH12NBOB00001234567890', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  KW: {
    code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD', currencySymbol: 'د.ك',
    taxSystem: 'none', taxLabel: 'Tax', taxRate: 0, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','bakery','wholesale_grocery','dark_store'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Commercial Licence', description: 'Ministry of Commerce licence' },
      { type: 'owner_id', label: 'Owner Civil ID', description: 'Civil ID' },
      { type: 'bank_details', label: 'Bank Details', description: 'IBAN' },
    ],
    foodSafetyLicenceLabel: 'Municipality Health Permit', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: true, halalCertificationSupport: true,
    codSupported: true, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: false, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'commercialRegistration', label: 'Commercial Licence Number', placeholder: 'CL-XXXXX', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'National Bank of Kuwait', required: true },
      { key: 'ibanNumber', label: 'IBAN', placeholder: 'KW12NBOK0000000000001234567890', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  OM: {
    code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR', currencySymbol: 'ر.ع.',
    taxSystem: 'vat', taxLabel: 'VAT', taxRate: 5, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','bakery','wholesale_grocery','dark_store'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Commercial Registration', description: 'CR from MOCI' },
      { type: 'tax_certificate', label: 'VAT Certificate', description: 'Tax Authority registration' },
      { type: 'owner_id', label: 'Owner ID', description: 'National ID or Resident Card' },
      { type: 'bank_details', label: 'Bank Details', description: 'IBAN' },
    ],
    foodSafetyLicenceLabel: 'Municipality Permit', foodSafetyRequired: true,
    allergenInfoRequired: false, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: true, halalCertificationSupport: true,
    codSupported: true, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: false, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'commercialRegistration', label: 'CR Number', placeholder: 'CR-XXXXX', required: true },
      { key: 'vatTrn', label: 'VAT Number', placeholder: 'OM-VAT-XXXXX', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'Bank Muscat', required: true },
      { key: 'ibanNumber', label: 'IBAN', placeholder: 'OM12BMOC000000001234567890', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  GB: {
    code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£',
    taxSystem: 'vat', taxLabel: 'VAT', taxRate: 20, stateTaxSupport: false, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','organic_grocery','bakery','wholesale_grocery','brand_distributor','dark_store','home_based_food'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Companies House Registration', description: 'Company registration number' },
      { type: 'tax_certificate', label: 'VAT Registration', description: 'HMRC VAT registration certificate' },
      { type: 'food_safety_licence', label: 'Food Business Registration', description: 'Local authority food business registration' },
      { type: 'allergen_declaration', label: 'Allergen Information', description: 'Allergen management documentation' },
      { type: 'distance_selling_info', label: 'Distance Selling Compliance', description: 'Consumer Contracts Regulations compliance' },
      { type: 'owner_id', label: 'Director ID', description: 'Passport or driving licence' },
      { type: 'bank_details', label: 'Bank Details', description: 'Sort code and account number' },
    ],
    foodSafetyLicenceLabel: 'Food Business Registration', foodSafetyRequired: true,
    allergenInfoRequired: true, expiryDateRequired: true, batchNumberRequired: true,
    mfgDateRequired: true, mrpRequired: false, shelfLifeRequired: true,
    arabicProductSupport: false, halalCertificationSupport: false,
    codSupported: false, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: true,
    coldChainProofRequired: true, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'businessRegistrationNumber', label: 'Companies House Number', placeholder: '12345678', required: true },
      { key: 'vatTrn', label: 'VAT Number', placeholder: 'GB 123 4567 89', required: false },
      { key: 'foodBusinessRegistration', label: 'Food Business Reg Number', placeholder: 'FBR-XXXXX', required: true },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'Barclays', required: true },
      { key: 'sortCode', label: 'Sort Code', placeholder: '12-34-56', required: true },
      { key: 'accountNumber', label: 'Account Number', placeholder: '12345678', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
  US: {
    code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', currencySymbol: '$',
    taxSystem: 'sales_tax', taxLabel: 'Sales Tax', taxRate: 0, stateTaxSupport: true, hsnCodeRequired: false,
    allowedBusinessTypes: ['supermarket','mini_market','fresh_meat_shop','fish_shop','fruits_vegetables','organic_grocery','bakery','wholesale_grocery','brand_distributor','dark_store','home_based_food'],
    requiredDocuments: [
      { type: 'business_registration', label: 'Business Licence', description: 'State business licence or EIN' },
      { type: 'tax_certificate', label: 'Sales Tax Permit', description: 'State sales tax permit' },
      { type: 'food_safety_licence', label: 'Food Permit', description: 'Local food establishment permit' },
      { type: 'fda_registration', label: 'FDA Facility Registration', description: 'FDA food facility registration (if applicable)' },
      { type: 'owner_id', label: 'Owner SSN/ITIN (Last 4)', description: 'Tax identification' },
      { type: 'bank_details', label: 'Bank Details', description: 'Routing and account number' },
    ],
    foodSafetyLicenceLabel: 'Food Establishment Permit', foodSafetyRequired: true,
    allergenInfoRequired: true, expiryDateRequired: true, batchNumberRequired: false,
    mfgDateRequired: false, mrpRequired: false, shelfLifeRequired: false,
    arabicProductSupport: false, halalCertificationSupport: false,
    codSupported: false, scheduledDeliverySupport: true, substitutionWorkflow: true, distanceSellingInfo: false,
    coldChainProofRequired: true, weightBasedSellingDefault: true,
    registrationFields: [
      { key: 'businessRegistrationNumber', label: 'EIN (Employer ID)', placeholder: 'XX-XXXXXXX', required: true },
      { key: 'salesTaxId', label: 'State Sales Tax Permit', placeholder: 'ST-XXXXX', required: false },
      { key: 'fdaFacilityId', label: 'FDA Facility Registration', placeholder: 'FDA-XXXXX', required: false },
    ],
    bankFields: [
      { key: 'bankName', label: 'Bank Name', placeholder: 'Chase Bank', required: true },
      { key: 'routingNumber', label: 'Routing Number', placeholder: '021000021', required: true },
      { key: 'accountNumber', label: 'Account Number', placeholder: '1234567890', required: true },
      { key: 'accountHolderName', label: 'Account Holder', placeholder: 'Business Name', required: true },
    ],
  },
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  supermarket: 'Supermarket',
  mini_market: 'Mini Market / Convenience Store',
  fresh_meat_shop: 'Fresh Meat Shop / Butchery',
  fish_shop: 'Fish & Seafood Shop',
  fruits_vegetables: 'Fruits & Vegetables Shop',
  organic_grocery: 'Organic Grocery Store',
  bakery: 'Bakery',
  wholesale_grocery: 'Wholesale Grocery',
  brand_distributor: 'Brand Distributor',
  dark_store: 'Dark Store (Delivery Only)',
  home_based_food: 'Approved Home-Based Food Seller',
};

export const BUSINESS_TYPE_ICONS: Record<BusinessType, string> = {
  supermarket: '🏪', mini_market: '🏬', fresh_meat_shop: '🥩', fish_shop: '🐟',
  fruits_vegetables: '🥬', organic_grocery: '🌿', bakery: '🍞', wholesale_grocery: '📦',
  brand_distributor: '🏭', dark_store: '🏴', home_based_food: '🏠',
};

export function getComplianceConfig(code: SellerCountryCode): CountryComplianceConfig {
  return COUNTRY_COMPLIANCE[code];
}

export function getAvailableCountries(): CountryComplianceConfig[] {
  return Object.values(COUNTRY_COMPLIANCE);
}
