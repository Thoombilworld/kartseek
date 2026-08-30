// ═══════════════════════════════════════════════════════════════════════════════
// Centralized Rental & Intercity Policy Configuration
// All country-specific rules, cancellation policies, compliance requirements,
// pricing multipliers, and business logic in one authoritative source.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Cancellation Policy ──────────────────────────────────────────────────────

export interface CancellationPolicy {
  freeCancellationHours: number;
  partialRefundPercent: number;
  partialRefundWindowHours: number;
  noRefundWindowHours: number;
  noShowFeePercent: number;
  processingDays: number;
  lateReturnFeePerHour: number;
}

// ── Self-Drive Compliance ────────────────────────────────────────────────────

export interface SelfDriveRules {
  enabled: boolean;
  minimumAge: number;
  minimumLicenseYears: number;
  requiredDocuments: string[];
  foreignerDocuments: string[];
  securityDepositAmount: number;
  insuranceMandatory: boolean;
  maxRentalDays: number;
  differentReturnFee: number;
  fuelPolicy: 'full_to_full' | 'same_to_same' | 'pre_purchase';
}

// ── Chauffeur Rules ──────────────────────────────────────────────────────────

export interface ChauffeurRules {
  enabled: boolean;
  driverAssignmentRequired: boolean;
  maxWaitMinutes: number;
  overtimeRateMultiplier: number;
}

// ── Intercity Rules ──────────────────────────────────────────────────────────

export interface IntercityRules {
  enabled: boolean;
  roundTripEnabled: boolean;
  roundTripDiscountPercent: number;
  maxSeatsPerBooking: number;
  maxLuggagePerPerson: number;
  boardingWindowMinutes: number;
  requiredOperatorLicense: string;
}

// ── Pricing Multiplier ───────────────────────────────────────────────────────

export interface PricingConfig {
  currencyCode: string;
  currencySymbol: string;
  baseMultiplier: number;           // multiplier relative to base rates
  extraKmRate: number;              // per km beyond hourly package limit
  overtimeHourlyRate: number;       // per hour beyond package limit
  chauffeurSurchargeDaily: number;  // daily chauffeur add-on
  taxRate: number;                  // VAT/GST applicable to rentals
  taxLabel: string;
}

// ── Compliance Check Types ───────────────────────────────────────────────────

export type ComplianceStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'not_required';

export interface ComplianceCheck {
  id: string;
  label: string;
  description: string;
  status: ComplianceStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  expiresAt?: string;
  required: boolean;
}

// ── Full Country Rental Configuration ────────────────────────────────────────

export interface CountryRentalConfig {
  countryCode: string;
  countryName: string;
  flag: string;
  selfDrive: SelfDriveRules;
  chauffeur: ChauffeurRules;
  intercity: IntercityRules;
  rentalCancellation: CancellationPolicy;
  intercityCancellation: CancellationPolicy;
  pricing: PricingConfig;
  hourlyPackagesEnabled: boolean;
  weeklyPackagesEnabled: boolean;
  complianceNotes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Country Configurations
// ═══════════════════════════════════════════════════════════════════════════════

export const COUNTRY_RENTAL_CONFIGS: Record<string, CountryRentalConfig> = {

  // ── India ────────────────────────────────────────────────────────────────
  IN: {
    countryCode: 'IN', countryName: 'India', flag: '🇮🇳',
    selfDrive: {
      enabled: true, minimumAge: 21, minimumLicenseYears: 1,
      requiredDocuments: ['driving_license', 'aadhaar_card'],
      foreignerDocuments: ['passport', 'international_driving_permit', 'visa'],
      securityDepositAmount: 10000, insuranceMandatory: true,
      maxRentalDays: 30, differentReturnFee: 2000, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 10, overtimeRateMultiplier: 1.5 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 15, maxSeatsPerBooking: 10, maxLuggagePerPerson: 2, boardingWindowMinutes: 20, requiredOperatorLicense: 'State Transport Permit' },
    rentalCancellation: { freeCancellationHours: 4, partialRefundPercent: 75, partialRefundWindowHours: 4, noRefundWindowHours: 1, noShowFeePercent: 100, processingDays: 7, lateReturnFeePerHour: 300 },
    intercityCancellation: { freeCancellationHours: 6, partialRefundPercent: 75, partialRefundWindowHours: 4, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 7, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'INR', currencySymbol: '₹', baseMultiplier: 0.85, extraKmRate: 12, overtimeHourlyRate: 600, chauffeurSurchargeDaily: 1200, taxRate: 0.18, taxLabel: 'GST (18%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['GST applicable on all rental transactions', 'Motor Vehicles Act 1988 compliance required', 'RBI mandates refund within 5-7 business days', 'State-specific permits for intercity operations']
  },

  // ── UAE ──────────────────────────────────────────────────────────────────
  AE: {
    countryCode: 'AE', countryName: 'UAE', flag: '🇦🇪',
    selfDrive: {
      enabled: true, minimumAge: 25, minimumLicenseYears: 2,
      requiredDocuments: ['uae_driving_license', 'emirates_id'],
      foreignerDocuments: ['passport', 'international_driving_permit', 'tourist_visa'],
      securityDepositAmount: 2000, insuranceMandatory: true,
      maxRentalDays: 90, differentReturnFee: 150, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 10, overtimeRateMultiplier: 2.0 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 10, maxSeatsPerBooking: 6, maxLuggagePerPerson: 3, boardingWindowMinutes: 10, requiredOperatorLicense: 'RTA Transport License' },
    rentalCancellation: { freeCancellationHours: 48, partialRefundPercent: 50, partialRefundWindowHours: 24, noRefundWindowHours: 6, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 100 },
    intercityCancellation: { freeCancellationHours: 24, partialRefundPercent: 50, partialRefundWindowHours: 12, noRefundWindowHours: 4, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'AED', currencySymbol: 'AED', baseMultiplier: 0.35, extraKmRate: 1.5, overtimeHourlyRate: 50, chauffeurSurchargeDaily: 200, taxRate: 0.05, taxLabel: 'VAT (5%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['48-hour cooling-off period required by Consumer Protection Law', 'UAE traffic fine liability transfers to renter during self-drive', 'Salik (toll) charges billed to renter', 'RTA approval needed for chauffeur operations']
  },

  // ── United Kingdom ───────────────────────────────────────────────────────
  GB: {
    countryCode: 'GB', countryName: 'United Kingdom', flag: '🇬🇧',
    selfDrive: {
      enabled: true, minimumAge: 21, minimumLicenseYears: 1,
      requiredDocuments: ['uk_driving_license', 'proof_of_address'],
      foreignerDocuments: ['passport', 'international_driving_permit'],
      securityDepositAmount: 500, insuranceMandatory: true,
      maxRentalDays: 28, differentReturnFee: 50, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 15, overtimeRateMultiplier: 1.5 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 15, maxSeatsPerBooking: 8, maxLuggagePerPerson: 2, boardingWindowMinutes: 15, requiredOperatorLicense: 'DVSA Commercial Vehicle Permit' },
    rentalCancellation: { freeCancellationHours: 24, partialRefundPercent: 80, partialRefundWindowHours: 12, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 30 },
    intercityCancellation: { freeCancellationHours: 12, partialRefundPercent: 80, partialRefundWindowHours: 6, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'GBP', currencySymbol: '£', baseMultiplier: 0.028, extraKmRate: 0.35, overtimeHourlyRate: 25, chauffeurSurchargeDaily: 60, taxRate: 0.20, taxLabel: 'VAT (20%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Consumer Rights Act 2015 — 14-day cancellation right for distance contracts', 'GDPR applies to all customer data', 'ULEZ/Congestion Charge may apply in London', 'Insurance must be comprehensive for self-drive']
  },

  // ── United States ────────────────────────────────────────────────────────
  US: {
    countryCode: 'US', countryName: 'United States', flag: '🇺🇸',
    selfDrive: {
      enabled: true, minimumAge: 21, minimumLicenseYears: 1,
      requiredDocuments: ['us_drivers_license', 'credit_card'],
      foreignerDocuments: ['passport', 'international_driving_permit'],
      securityDepositAmount: 250, insuranceMandatory: false,
      maxRentalDays: 30, differentReturnFee: 75, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 10, overtimeRateMultiplier: 1.5 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 10, maxSeatsPerBooking: 8, maxLuggagePerPerson: 2, boardingWindowMinutes: 15, requiredOperatorLicense: 'FMCSA Operating Authority' },
    rentalCancellation: { freeCancellationHours: 24, partialRefundPercent: 75, partialRefundWindowHours: 12, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 25 },
    intercityCancellation: { freeCancellationHours: 12, partialRefundPercent: 75, partialRefundWindowHours: 6, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'USD', currencySymbol: '$', baseMultiplier: 0.035, extraKmRate: 0.45, overtimeHourlyRate: 30, chauffeurSurchargeDaily: 75, taxRate: 0, taxLabel: 'Sales Tax (varies by state)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Under-25 surcharge of 15% applies', 'State-specific insurance requirements', 'Toll transponder charges billed separately', 'CDW/LDW waivers available as add-ons']
  },

  // ── Singapore ────────────────────────────────────────────────────────────
  SG: {
    countryCode: 'SG', countryName: 'Singapore', flag: '🇸🇬',
    selfDrive: {
      enabled: true, minimumAge: 23, minimumLicenseYears: 2,
      requiredDocuments: ['singapore_driving_license', 'nric'],
      foreignerDocuments: ['passport', 'international_driving_permit'],
      securityDepositAmount: 500, insuranceMandatory: true,
      maxRentalDays: 14, differentReturnFee: 50, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 10, overtimeRateMultiplier: 2.0 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 5, maxSeatsPerBooking: 4, maxLuggagePerPerson: 1, boardingWindowMinutes: 10, requiredOperatorLicense: 'LTA Operator License' },
    rentalCancellation: { freeCancellationHours: 12, partialRefundPercent: 50, partialRefundWindowHours: 6, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 3, lateReturnFeePerHour: 30 },
    intercityCancellation: { freeCancellationHours: 6, partialRefundPercent: 50, partialRefundWindowHours: 3, noRefundWindowHours: 1, noShowFeePercent: 100, processingDays: 3, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'SGD', currencySymbol: 'S$', baseMultiplier: 0.05, extraKmRate: 0.60, overtimeHourlyRate: 35, chauffeurSurchargeDaily: 80, taxRate: 0.09, taxLabel: 'GST (9%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: false,
    complianceNotes: ['ERP (Electronic Road Pricing) charges apply', 'COE system affects vehicle availability', 'Cross-border to Malaysia requires separate coverage', 'LTA vehicle inspection certificate required']
  },

  // ── Saudi Arabia ─────────────────────────────────────────────────────────
  SA: {
    countryCode: 'SA', countryName: 'Saudi Arabia', flag: '🇸🇦',
    selfDrive: {
      enabled: true, minimumAge: 25, minimumLicenseYears: 2,
      requiredDocuments: ['saudi_driving_license', 'national_id'],
      foreignerDocuments: ['passport', 'international_driving_permit', 'iqama'],
      securityDepositAmount: 1500, insuranceMandatory: true,
      maxRentalDays: 30, differentReturnFee: 200, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 15, overtimeRateMultiplier: 1.5 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 10, maxSeatsPerBooking: 6, maxLuggagePerPerson: 3, boardingWindowMinutes: 15, requiredOperatorLicense: 'TGA Transport License' },
    rentalCancellation: { freeCancellationHours: 24, partialRefundPercent: 50, partialRefundWindowHours: 12, noRefundWindowHours: 4, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 80 },
    intercityCancellation: { freeCancellationHours: 12, partialRefundPercent: 50, partialRefundWindowHours: 6, noRefundWindowHours: 3, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'SAR', currencySymbol: 'SAR', baseMultiplier: 0.30, extraKmRate: 1.2, overtimeHourlyRate: 40, chauffeurSurchargeDaily: 150, taxRate: 0.15, taxLabel: 'VAT (15%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Ministry of Transport licensing required', 'Women drivers permitted since 2018', 'Partial refund mandated by consumer protection law', 'Najm report required for accident claims']
  },

  // ── Bahrain ──────────────────────────────────────────────────────────────
  BH: {
    countryCode: 'BH', countryName: 'Bahrain', flag: '🇧🇭',
    selfDrive: {
      enabled: true, minimumAge: 25, minimumLicenseYears: 2,
      requiredDocuments: ['bahrain_driving_license', 'cpr_card'],
      foreignerDocuments: ['passport', 'international_driving_permit'],
      securityDepositAmount: 100, insuranceMandatory: true,
      maxRentalDays: 30, differentReturnFee: 20, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 10, overtimeRateMultiplier: 1.5 },
    intercity: { enabled: false, roundTripEnabled: false, roundTripDiscountPercent: 0, maxSeatsPerBooking: 0, maxLuggagePerPerson: 0, boardingWindowMinutes: 0, requiredOperatorLicense: 'N/A' },
    rentalCancellation: { freeCancellationHours: 12, partialRefundPercent: 50, partialRefundWindowHours: 6, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 3, lateReturnFeePerHour: 10 },
    intercityCancellation: { freeCancellationHours: 0, partialRefundPercent: 0, partialRefundWindowHours: 0, noRefundWindowHours: 0, noShowFeePercent: 0, processingDays: 0, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'BHD', currencySymbol: 'BHD', baseMultiplier: 0.003, extraKmRate: 0.05, overtimeHourlyRate: 3, chauffeurSurchargeDaily: 8, taxRate: 0.10, taxLabel: 'VAT (10%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Small island state — no intercity routes', 'GDT licensing required for commercial rental', 'Bahrain-Saudi causeway coverage requires additional insurance']
  },

  // ── Nigeria ──────────────────────────────────────────────────────────────
  NG: {
    countryCode: 'NG', countryName: 'Nigeria', flag: '🇳🇬',
    selfDrive: {
      enabled: false, minimumAge: 0, minimumLicenseYears: 0,
      requiredDocuments: [], foreignerDocuments: [],
      securityDepositAmount: 0, insuranceMandatory: false,
      maxRentalDays: 0, differentReturnFee: 0, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 20, overtimeRateMultiplier: 1.3 },
    intercity: { enabled: true, roundTripEnabled: true, roundTripDiscountPercent: 10, maxSeatsPerBooking: 8, maxLuggagePerPerson: 3, boardingWindowMinutes: 30, requiredOperatorLicense: 'FRSC Fleet License' },
    rentalCancellation: { freeCancellationHours: 2, partialRefundPercent: 50, partialRefundWindowHours: 2, noRefundWindowHours: 0, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 2000 },
    intercityCancellation: { freeCancellationHours: 4, partialRefundPercent: 50, partialRefundWindowHours: 2, noRefundWindowHours: 1, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'NGN', currencySymbol: '₦', baseMultiplier: 12.0, extraKmRate: 150, overtimeHourlyRate: 8000, chauffeurSurchargeDaily: 15000, taxRate: 0.075, taxLabel: 'VAT (7.5%)' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Self-drive rentals not available — chauffeur only', 'FRSC registration required for all fleet vehicles', 'Intercity operations require state-level permits', 'Security considerations for long-distance routes']
  },

  // ── Qatar ────────────────────────────────────────────────────────────────
  QA: {
    countryCode: 'QA', countryName: 'Qatar', flag: '🇶🇦',
    selfDrive: {
      enabled: true, minimumAge: 25, minimumLicenseYears: 2,
      requiredDocuments: ['qatar_driving_license', 'qatar_id'],
      foreignerDocuments: ['passport', 'international_driving_permit', 'residence_permit'],
      securityDepositAmount: 2000, insuranceMandatory: true,
      maxRentalDays: 30, differentReturnFee: 200, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 10, overtimeRateMultiplier: 2.0 },
    intercity: { enabled: false, roundTripEnabled: false, roundTripDiscountPercent: 0, maxSeatsPerBooking: 0, maxLuggagePerPerson: 0, boardingWindowMinutes: 0, requiredOperatorLicense: 'N/A' },
    rentalCancellation: { freeCancellationHours: 24, partialRefundPercent: 50, partialRefundWindowHours: 12, noRefundWindowHours: 6, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 100 },
    intercityCancellation: { freeCancellationHours: 0, partialRefundPercent: 0, partialRefundWindowHours: 0, noRefundWindowHours: 0, noShowFeePercent: 0, processingDays: 0, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'QAR', currencySymbol: 'QAR', baseMultiplier: 0.03, extraKmRate: 1.5, overtimeHourlyRate: 50, chauffeurSurchargeDaily: 200, taxRate: 0, taxLabel: 'No VAT' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Small state — no intercity routes', 'MOI licensing for car rental operations', 'Traffic fine liability transfers to renter']
  },

  // ── Kuwait ───────────────────────────────────────────────────────────────
  KW: {
    countryCode: 'KW', countryName: 'Kuwait', flag: '🇰🇼',
    selfDrive: {
      enabled: true, minimumAge: 21, minimumLicenseYears: 1,
      requiredDocuments: ['kuwait_driving_license', 'civil_id'],
      foreignerDocuments: ['passport', 'international_driving_permit'],
      securityDepositAmount: 100, insuranceMandatory: true,
      maxRentalDays: 30, differentReturnFee: 15, fuelPolicy: 'full_to_full'
    },
    chauffeur: { enabled: true, driverAssignmentRequired: true, maxWaitMinutes: 15, overtimeRateMultiplier: 1.5 },
    intercity: { enabled: false, roundTripEnabled: false, roundTripDiscountPercent: 0, maxSeatsPerBooking: 0, maxLuggagePerPerson: 0, boardingWindowMinutes: 0, requiredOperatorLicense: 'N/A' },
    rentalCancellation: { freeCancellationHours: 12, partialRefundPercent: 50, partialRefundWindowHours: 6, noRefundWindowHours: 2, noShowFeePercent: 100, processingDays: 5, lateReturnFeePerHour: 5 },
    intercityCancellation: { freeCancellationHours: 0, partialRefundPercent: 0, partialRefundWindowHours: 0, noRefundWindowHours: 0, noShowFeePercent: 0, processingDays: 0, lateReturnFeePerHour: 0 },
    pricing: { currencyCode: 'KWD', currencySymbol: 'KWD', baseMultiplier: 0.0025, extraKmRate: 0.03, overtimeHourlyRate: 2, chauffeurSurchargeDaily: 5, taxRate: 0, taxLabel: 'No VAT' },
    hourlyPackagesEnabled: true, weeklyPackagesEnabled: true,
    complianceNotes: ['Small state — no intercity routes', 'MOI rental company license required', 'GCC license holders can drive without IDP']
  }
};

// ── Helper Functions ─────────────────────────────────────────────────────────

export function getCountryConfig(countryCode: string): CountryRentalConfig {
  return COUNTRY_RENTAL_CONFIGS[countryCode] || COUNTRY_RENTAL_CONFIGS['IN'];
}

export function getAllCountryCodes(): string[] {
  return Object.keys(COUNTRY_RENTAL_CONFIGS);
}

export function formatCancellationPolicy(policy: CancellationPolicy, currencySymbol: string): string[] {
  const lines: string[] = [];
  if (policy.freeCancellationHours > 0) {
    lines.push(`✅ Free cancellation up to ${policy.freeCancellationHours}h before pickup`);
  }
  if (policy.partialRefundPercent > 0) {
    lines.push(`⚠️ ${policy.partialRefundPercent}% refund if cancelled within ${policy.partialRefundWindowHours}h of pickup`);
  }
  lines.push(`❌ No refund for no-shows (${policy.noShowFeePercent}% fee)`);
  if (policy.lateReturnFeePerHour > 0) {
    lines.push(`⏰ Late return fee: ${currencySymbol} ${policy.lateReturnFeePerHour}/hour`);
  }
  lines.push(`💳 Refunds processed within ${policy.processingDays} business days`);
  return lines;
}

export function getRequiredComplianceChecks(config: CountryRentalConfig, mode: 'chauffeur' | 'self_drive', isForeigner: boolean): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  if (mode === 'self_drive' && config.selfDrive.enabled) {
    checks.push({ id: 'age', label: 'Age Verification', description: `Minimum age: ${config.selfDrive.minimumAge} years`, status: 'pending', required: true });
    checks.push({ id: 'license', label: 'License Verification', description: `Min. ${config.selfDrive.minimumLicenseYears}y experience`, status: 'pending', required: true });

    const docs = isForeigner ? config.selfDrive.foreignerDocuments : config.selfDrive.requiredDocuments;
    docs.forEach(doc => {
      checks.push({ id: `doc_${doc}`, label: doc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), description: `Upload ${doc.replace(/_/g, ' ')}`, status: 'pending', required: true });
    });

    if (config.selfDrive.insuranceMandatory) {
      checks.push({ id: 'insurance', label: 'Insurance Coverage', description: 'Comprehensive insurance required', status: 'pending', required: true });
    }

    checks.push({ id: 'deposit', label: 'Security Deposit', description: `${config.pricing.currencySymbol} ${config.selfDrive.securityDepositAmount} hold`, status: 'pending', required: true });
    checks.push({ id: 'inspection', label: 'Vehicle Inspection', description: 'Pre-handover condition checklist', status: 'pending', required: true });
  }

  if (mode === 'chauffeur') {
    checks.push({ id: 'driver', label: 'Driver Assignment', description: 'Licensed driver must be assigned', status: 'pending', required: config.chauffeur.driverAssignmentRequired });
    checks.push({ id: 'vehicle_check', label: 'Vehicle Readiness', description: 'Vehicle inspected and clean', status: 'pending', required: true });
  }

  checks.push({ id: 'payment', label: 'Payment Confirmed', description: 'Full payment or authorization received', status: 'pending', required: true });
  checks.push({ id: 'terms', label: 'T&C Accepted', description: 'Customer accepted rental terms', status: 'pending', required: true });

  return checks;
}
