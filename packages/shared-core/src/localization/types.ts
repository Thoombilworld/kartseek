/// KARTSEEK — Localization core types
///
/// One shape for "everything that changes when the active region changes".
/// The customer storefront, the Seller Marketplace Portal and the Super Admin
/// panel all read the same registry, so a region only has to be described once.

export type CountryCode = 'QA' | 'IN' | 'AE' | 'SA' | 'BH' | 'KW' | 'OM' | 'GB' | 'US' | 'SG';

export type LanguageCode = 'en' | 'ar' | 'hi' | 'ta' | 'ml' | 'es';

export interface LanguageMeta {
  code: LanguageCode;
  /** English name, for admin surfaces. */
  name: string;
  /** Endonym — what the language calls itself, for the customer-facing picker. */
  nativeName: string;
  rtl: boolean;
  /** BCP-47 tag handed to `Intl.*`. */
  intl: string;
  /** Country whose flag represents this language in pickers. */
  flagCountry: string;
}

// ─── Currency ────────────────────────────────────────────────────────────────

export interface CurrencySpec {
  /** ISO-4217 code, e.g. `QAR`. */
  code: string;
  /** Symbol used in Latin-script contexts, e.g. `QR`. */
  symbol: string;
  /** Symbol used when the UI is in Arabic, e.g. `ر.ق`. */
  symbolAr?: string;
  /** Minor units. 2 for QAR, 3 for the Gulf dinars (BHD/KWD/OMR). */
  decimals: number;
  position: 'before' | 'after';
  /** Grouping style. `indian` gives 1,23,456 instead of 123,456. */
  grouping?: 'western' | 'indian';
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export type AddressFieldKey =
  | 'fullName'
  | 'phone'
  | 'buildingNumber'
  | 'unit'
  | 'streetNumber'
  | 'streetName'
  | 'zoneNumber'
  | 'area'
  | 'landmark'
  | 'poBox'
  | 'line1'
  | 'line2'
  | 'city'
  | 'state'
  | 'postalCode';

export interface AddressFieldSpec {
  key: AddressFieldKey;
  /** English label. */
  label: string;
  /** Arabic label — used when the active language is `ar`. */
  labelAr?: string;
  required: boolean;
  placeholder?: string;
  /** Short hint shown under the input. */
  helper?: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  maxLength?: number;
  /** Validation pattern, as a string so the spec stays serialisable. */
  pattern?: string;
  /** Message shown when `pattern` fails. */
  patternMessage?: string;
  /** Fields sharing a row render side by side on desktop. */
  row?: number;
}

export interface AddressSpec {
  /** Ordered input fields for this country's address form. */
  fields: AddressFieldSpec[];
  /**
   * Render template. Each entry is one output line; each line is a list of
   * field keys joined by that line's separator.
   */
  lines: Array<{ keys: AddressFieldKey[]; separator?: string }>;
  /** False for Qatar — it has no public postal-code system. */
  hasPostalCode: boolean;
  /** Shown above the form, e.g. Qatar's zone/street/building explainer. */
  guidance?: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentMethodType =
  | 'card'
  | 'debit_national'
  | 'apple_pay'
  | 'google_pay'
  | 'samsung_pay'
  | 'wallet'
  | 'cod'
  | 'bank_transfer'
  | 'upi'
  | 'netbanking'
  | 'mada'
  | 'sadad'
  | 'knet'
  | 'benefit'
  | 'telecom_wallet'
  | 'paynow'
  | 'grabpay'
  | 'ach';

export interface PaymentMethodSpec {
  type: PaymentMethodType;
  /** Gateway that settles this method. */
  gateway: string;
  label: string;
  labelAr?: string;
  /** One-line explainer under the option. */
  description?: string;
  isDefault?: boolean;
  /** Domestic scheme (NAPS/Himyan, UPI, KNET…) — surfaced as "local" in the UI. */
  isLocal?: boolean;
  /** Order value bounds in minor-unit-free currency units. */
  minAmount?: number;
  maxAmount?: number;
  /** Icon key resolved by the checkout UI. */
  icon?: string;
}

// ─── Compliance ──────────────────────────────────────────────────────────────

export interface ComplianceSpec {
  /** Short name of the governing data-protection law. */
  law: string;
  lawAr?: string;
  /** Full citation, e.g. "Law No. (13) of 2016 …". */
  citation: string;
  /** Supervisory authority. */
  regulator: string;
  regulatorUrl?: string;
  /** Hours within which a personal-data breach must be reported. */
  breachNotificationHours: number;
  /** Whether processing requires an affirmative, recorded consent. */
  requiresExplicitConsent: boolean;
  /** Whether the law restricts transfers of personal data out of the country. */
  dataResidencyRequired: boolean;
  /** Rights the platform must be able to service for a data subject. */
  dataSubjectRights: string[];
  /** Statutory/observed retention window for transaction records, in months. */
  recordRetentionMonths: number;
  /** Minimum age at which a person can consent without a guardian. */
  minimumConsentAge: number;
  /** Sector rules that also bind the platform in this country. */
  additionalRegulations: string[];
  /** Cookie categories that may NOT be on by default. */
  optInCookieCategories: Array<'analytics' | 'marketing' | 'personalisation'>;
}

// ─── Tax ─────────────────────────────────────────────────────────────────────

export interface TaxSpec {
  name: string;
  nameAr?: string;
  /** Percentage. 0 for Qatar — no VAT is in force. */
  rate: number;
  /** True when displayed prices already contain the tax. */
  inclusive: boolean;
  /** Label of the merchant's tax registration number, if any. */
  registrationLabel?: string;
}

// ─── Country ─────────────────────────────────────────────────────────────────

export interface CountryLocalization {
  code: CountryCode;
  name: string;
  nativeName: string;
  flag: string;
  callingCode: string;

  /** Languages offered in this country — drives the whole language section. */
  languages: LanguageCode[];
  defaultLanguage: LanguageCode;

  currency: CurrencySpec;

  timezone: string;
  /** Fixed UTC offset in minutes. Qatar is +180 and observes no DST. */
  utcOffsetMinutes: number;
  observesDst: boolean;
  dateFormat: string;
  timeFormat: string;
  hour12: boolean;
  /** 0 = Sunday. Qatar's working week starts Sunday. */
  firstDayOfWeek: number;
  /** Weekend days as 0–6. Qatar rests Friday–Saturday. */
  weekend: number[];

  measurementSystem: 'metric' | 'imperial';
  tax: TaxSpec;
  /**
   * Marketplace delivery rule in the market's own currency — flat fee below
   * `freeAbove`, free at or above it. Mirrored by order-service's
   * MARKETPLACE_RATES; change both.
   */
  delivery: { fee: number; freeAbove: number };
  address: AddressSpec;
  payments: PaymentMethodSpec[];
  compliance: ComplianceSpec;

  defaultCity: string;
  coords: { lat: number; lng: number };
  /** Bounding box used to resolve GPS coordinates to this country. */
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** Modules live in this country. */
  enabledModules: string[];
  isActive: boolean;
}
