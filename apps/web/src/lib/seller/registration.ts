/**
 * What a seller must choose, and then provide, to register.
 *
 * Registration asks two independent questions — *where* do you trade and *what*
 * do you sell — and the answer to both decides what the form asks for next. A
 * grocer in Qatar needs a Commercial Registration and a Municipality Health
 * Permit; the same grocer in India needs a GSTIN and an FSSAI licence; a taxi
 * fleet in Qatar needs the CR but not the health permit.
 *
 * Before this existed, `/seller/register` hard-coded its own six-row country
 * list — with India in it twice, under two different tax labels — and asked
 * every applicant in every market for the same six documents. It also never
 * asked which module they were registering for, and sent `sellerType:
 * 'marketplace'` for everyone, so a grocery business arrived in the marketplace
 * queue.
 *
 * Both axes now come from one place each: markets from `COUNTRY_COMPLIANCE`,
 * modules from `SELLER_MODULES` below, which mirrors the API's `SELLER_TYPES`.
 */
import { COUNTRY_COMPLIANCE, type CountryComplianceConfig } from './country-compliance';
import type { SellerCountryCode, DocumentType } from './types';

// ─── Modules ────────────────────────────────────────────────────────────────

/**
 * Mirrors `SELLER_TYPES` in `libs/common/src/enums/role.enum.ts`.
 *
 * The API validates `sellerType` against that list and answers 400 "Unknown
 * seller type" for anything else, so a key added here without being added there
 * fails at submit. Kept in the same order as the API's array.
 */
export const SELLER_MODULES = [
  {
    key: 'marketplace',
    label: 'Marketplace',
    blurb: 'Sell physical products — electronics, fashion, home, and more.',
    /** Where this module's own public pages live, when it has them. */
    basePath: '/seller/marketplace',
    extraDocuments: [] as DocumentType[],
  },
  {
    key: 'grocery',
    label: 'Grocery',
    blurb: 'Supermarkets, fresh produce, and dark stores with scheduled delivery.',
    basePath: '/seller/grocery',
    // Perishables: the food-safety licence is required by what is sold, not by
    // where. Its *name* still varies by market and comes from the country.
    extraDocuments: ['food_safety_licence', 'cold_chain_proof'] as DocumentType[],
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    blurb: 'Dine-in, takeaway and delivery menus with live kitchen status.',
    basePath: '/seller/restaurant',
    extraDocuments: ['food_safety_licence'] as DocumentType[],
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    blurb: 'Prescription and over-the-counter medicine with pharmacist review.',
    basePath: '/seller/pharmacy',
    extraDocuments: ['pharmacy_licence'] as DocumentType[],
  },
  {
    key: 'doctor',
    label: 'Doctor / Clinic',
    blurb: 'Consultations, appointments and patient records.',
    basePath: '/seller/doctor',
    extraDocuments: ['medical_council_registration'] as DocumentType[],
  },
  {
    key: 'hotel',
    label: 'Hotel',
    blurb: 'Rooms, rates and availability with real-time booking.',
    basePath: '/seller/hotel',
    extraDocuments: ['tourism_licence'] as DocumentType[],
  },
  {
    key: 'taxi',
    label: 'Taxi / Fleet',
    blurb: 'Ride-hailing with live dispatch and driver management.',
    basePath: '/seller/taxi',
    extraDocuments: ['vehicle_registration', 'driving_licence'] as DocumentType[],
  },
  {
    key: 'delivery',
    label: 'Delivery Partner',
    blurb: 'Last-mile delivery across every KARTSEEK module.',
    basePath: '/seller/delivery',
    extraDocuments: ['driving_licence', 'vehicle_registration'] as DocumentType[],
  },
] as const;

export type SellerModuleKey = (typeof SELLER_MODULES)[number]['key'];
export type SellerModule = (typeof SELLER_MODULES)[number];

export function isSellerModuleKey(value: string | null | undefined): value is SellerModuleKey {
  return !!value && SELLER_MODULES.some((m) => m.key === value);
}

export function getSellerModule(key: string | null | undefined): SellerModule | null {
  return SELLER_MODULES.find((m) => m.key === key) ?? null;
}

// ─── Markets ────────────────────────────────────────────────────────────────

/**
 * The nine markets a seller can be onboarded in, in a stable display order.
 *
 * Derived from `COUNTRY_COMPLIANCE` rather than written out again, so a market
 * cannot be offered on the form without the compliance profile that tells the
 * form what to ask for. That is exactly the failure the old hard-coded list
 * had: it offered the UK and the US, and omitted Qatar — the home market.
 */
export const SELLER_COUNTRY_ORDER: SellerCountryCode[] = [
  'QA', 'AE', 'SA', 'BH', 'KW', 'OM', 'IN', 'GB', 'US',
];

export function getSellerCountries(): CountryComplianceConfig[] {
  const ordered = SELLER_COUNTRY_ORDER
    .filter((code) => code in COUNTRY_COMPLIANCE)
    .map((code) => COUNTRY_COMPLIANCE[code]);

  // Anything present in the config but missing from the display order is still
  // offered rather than silently dropped — a new market must not disappear
  // because someone forgot to add it here too.
  const missing = (Object.keys(COUNTRY_COMPLIANCE) as SellerCountryCode[])
    .filter((code) => !SELLER_COUNTRY_ORDER.includes(code))
    .map((code) => COUNTRY_COMPLIANCE[code]);

  return [...ordered, ...missing];
}

export function isSellerCountryCode(value: string | null | undefined): value is SellerCountryCode {
  return !!value && value.toUpperCase() in COUNTRY_COMPLIANCE;
}

export function getSellerCountry(code: string | null | undefined): CountryComplianceConfig | null {
  if (!isSellerCountryCode(code)) return null;
  return COUNTRY_COMPLIANCE[code.toUpperCase() as SellerCountryCode];
}

// ─── The two axes combined ──────────────────────────────────────────────────

export interface RequiredDocument {
  type: DocumentType;
  label: string;
  description: string;
  /** Whether this came from the market or from what the business sells. */
  source: 'country' | 'module';
}

/** Fallback labels for module documents no country profile describes. */
const MODULE_DOCUMENT_LABELS: Record<string, { label: string; description: string }> = {
  food_safety_licence: { label: 'Food Safety Licence', description: 'Licence permitting the handling and sale of food' },
  cold_chain_proof: { label: 'Cold Chain Proof', description: 'Evidence of refrigerated storage and transport' },
  pharmacy_licence: { label: 'Pharmacy Licence', description: 'Licence to dispense medicine, and the pharmacist’s registration' },
  medical_council_registration: { label: 'Medical Council Registration', description: 'Practitioner registration with the national medical council' },
  tourism_licence: { label: 'Tourism / Hospitality Licence', description: 'Licence permitting paid guest accommodation' },
  vehicle_registration: { label: 'Vehicle Registration', description: 'Registration document for each vehicle in service' },
  driving_licence: { label: 'Driving Licence', description: 'Valid licence for the class of vehicle operated' },
};

/**
 * Every document this applicant must upload, given both answers.
 *
 * The country's own list comes first, because those are the documents that make
 * the business legal at all. Module documents are appended only when the
 * country has not already asked for them — Qatar's grocery profile names its
 * Municipality Health Permit, and a grocer there should be asked for it once,
 * under the name the ministry actually uses, not twice under two names.
 */
export function getRequiredDocuments(
  countryCode: string | null | undefined,
  moduleKey: string | null | undefined,
): RequiredDocument[] {
  const country = getSellerCountry(countryCode);
  if (!country) return [];

  const docs: RequiredDocument[] = country.requiredDocuments.map((d) => ({
    type: d.type,
    label: d.label,
    description: d.description,
    source: 'country',
  }));

  const mod = getSellerModule(moduleKey);
  if (!mod) return docs;

  for (const type of mod.extraDocuments) {
    if (docs.some((d) => d.type === type)) continue;

    // The country names the food-safety licence even when it does not list it
    // as a document — use that name in preference to the generic one.
    const label =
      type === 'food_safety_licence' && country.foodSafetyLicenceLabel
        ? country.foodSafetyLicenceLabel
        : MODULE_DOCUMENT_LABELS[type]?.label ?? type;

    docs.push({
      type,
      label,
      description: MODULE_DOCUMENT_LABELS[type]?.description ?? '',
      source: 'module',
    });
  }

  return docs;
}

/**
 * The identification/registration numbers this market wants, e.g. GSTIN + FSSAI
 * + PAN for India, CR + Trade Licence for Qatar.
 */
export function getRegistrationFields(countryCode: string | null | undefined) {
  return getSellerCountry(countryCode)?.registrationFields ?? [];
}

/** The payout fields this market's banks use — IFSC in India, IBAN in the Gulf. */
export function getBankFields(countryCode: string | null | undefined) {
  return getSellerCountry(countryCode)?.bankFields ?? [];
}

/** Human label for a business-type key, e.g. `fruits_vegetables` → "Fruits & Vegetables". */
export function businessTypeLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace('Fruits Vegetables', 'Fruits & Vegetables');
}
