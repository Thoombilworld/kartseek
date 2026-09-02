import { type RegionConfig, type SupportedCountryCode } from './region.types';

/**
 * KARTSEEK Operational Regions Registry
 *
 * Each region defines the full configuration for a country where KARTSEEK
 * operates. Sellers, products, drivers, and customers are all segmented
 * to their respective region — no cross-region data leakage.
 */
export const REGION_CONFIGS: Record<SupportedCountryCode, RegionConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    flagUrl: 'https://flagcdn.com/in.svg',
    currencyCode: 'INR',
    currencySymbol: '₹',
    currencyDecimals: 2,
    tax: { name: 'GST', rate: 18, isInclusive: true },
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    defaultCoords: { lat: 28.6139, lng: 77.2090 },
    defaultCity: 'New Delhi',
    callingCode: '+91',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'upi', gateway: 'upi', displayName: 'UPI (GPay / PhonePe / Paytm)', isDefault: true },
      { methodType: 'card', gateway: 'razorpay', displayName: 'Credit / Debit Card' },
      { methodType: 'netbanking', gateway: 'razorpay', displayName: 'Net Banking' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  QA: {
    code: 'QA',
    name: 'Qatar',
    flag: '🇶🇦',
    flagUrl: 'https://flagcdn.com/qa.svg',
    currencyCode: 'QAR',
    // 'QR' is how the riyal is written on Qatari price tags in English. The
    // bare rial sign is ambiguous between four currencies, so it belongs in
    // Arabic contexts alongside ر.ق, not as the only symbol.
    currencySymbol: 'QR',
    currencyDecimals: 2,
    tax: { name: 'No Tax', rate: 0, isInclusive: true },
    locale: 'ar-QA',
    timezone: 'Asia/Qatar',
    defaultCoords: { lat: 25.2854, lng: 51.5310 },
    defaultCity: 'Doha',
    callingCode: '+974',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    flagUrl: 'https://flagcdn.com/ae.svg',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    currencyDecimals: 2,
    tax: { name: 'VAT', rate: 5, isInclusive: true },
    locale: 'en-AE',
    timezone: 'Asia/Dubai',
    defaultCoords: { lat: 25.2048, lng: 55.2708 },
    defaultCity: 'Dubai',
    callingCode: '+971',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'samsung_pay', gateway: 'stripe', displayName: 'Samsung Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    flagUrl: 'https://flagcdn.com/sa.svg',
    currencyCode: 'SAR',
    // Was the bare rial sign, identical to Qatar's -- two different currencies
    // rendering the same on screen.
    currencySymbol: 'SAR',
    currencyDecimals: 2,
    tax: { name: 'VAT', rate: 15, isInclusive: true },
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',
    defaultCoords: { lat: 24.7136, lng: 46.6753 },
    defaultCity: 'Riyadh',
    callingCode: '+966',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'mada', gateway: 'mada', displayName: 'Mada Card' },
      { methodType: 'sadad', gateway: 'mada', displayName: 'SADAD' },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  BH: {
    code: 'BH',
    name: 'Bahrain',
    flag: '🇧🇭',
    flagUrl: 'https://flagcdn.com/bh.svg',
    currencyCode: 'BHD',
    // Thousandths, not hundredths.
    currencySymbol: 'BD',
    currencyDecimals: 3,
    tax: { name: 'VAT', rate: 10, isInclusive: true },
    locale: 'en-BH',
    timezone: 'Asia/Bahrain',
    defaultCoords: { lat: 26.0667, lng: 50.5577 },
    defaultCity: 'Manama',
    callingCode: '+973',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'benefit', gateway: 'benefit', displayName: 'Benefit Pay' },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  KW: {
    code: 'KW',
    name: 'Kuwait',
    flag: '🇰🇼',
    flagUrl: 'https://flagcdn.com/kw.svg',
    currencyCode: 'KWD',
    // Thousandths, not hundredths.
    currencySymbol: 'KD',
    currencyDecimals: 3,
    tax: { name: 'No Tax', rate: 0, isInclusive: true },
    locale: 'ar-KW',
    timezone: 'Asia/Kuwait',
    defaultCoords: { lat: 29.3759, lng: 47.9774 },
    defaultCity: 'Kuwait City',
    callingCode: '+965',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'knet', gateway: 'knet', displayName: 'KNET' },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  OM: {
    code: 'OM',
    name: 'Oman',
    flag: '🇴🇲',
    flagUrl: 'https://flagcdn.com/om.svg',
    currencyCode: 'OMR',
    // Thousandths, not hundredths.
    currencySymbol: 'OMR',
    currencyDecimals: 3,
    tax: { name: 'VAT', rate: 5, isInclusive: true },
    locale: 'ar-OM',
    timezone: 'Asia/Muscat',
    defaultCoords: { lat: 23.5880, lng: 58.3829 },
    defaultCity: 'Muscat',
    callingCode: '+968',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    flagUrl: 'https://flagcdn.com/gb.svg',
    currencyCode: 'GBP',
    currencySymbol: '£',
    currencyDecimals: 2,
    tax: { name: 'VAT', rate: 20, isInclusive: true },
    locale: 'en-GB',
    timezone: 'Europe/London',
    defaultCoords: { lat: 51.5074, lng: -0.1278 },
    defaultCity: 'London',
    callingCode: '+44',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'google_pay', gateway: 'stripe', displayName: 'Google Pay' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    flagUrl: 'https://flagcdn.com/us.svg',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyDecimals: 2,
    tax: { name: 'Sales Tax', rate: 8.875, isInclusive: false },
    locale: 'en-US',
    timezone: 'America/New_York',
    defaultCoords: { lat: 38.8951, lng: -77.0364 },
    defaultCity: 'Washington, D.C.',
    callingCode: '+1',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'google_pay', gateway: 'stripe', displayName: 'Google Pay' },
      { methodType: 'ach', gateway: 'stripe', displayName: 'ACH Bank Transfer' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    flagUrl: 'https://flagcdn.com/sg.svg',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    currencyDecimals: 2,
    tax: { name: 'GST', rate: 9, isInclusive: true },
    locale: 'en-SG',
    timezone: 'Asia/Singapore',
    defaultCoords: { lat: 1.3521, lng: 103.8198 },
    defaultCity: 'Singapore',
    callingCode: '+65',
    isActive: true,
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    supportedPaymentMethods: [
      { methodType: 'card', gateway: 'stripe', displayName: 'Credit / Debit Card', isDefault: true },
      { methodType: 'apple_pay', gateway: 'stripe', displayName: 'Apple Pay' },
      { methodType: 'grabpay', gateway: 'stripe', displayName: 'GrabPay' },
      { methodType: 'paynow', gateway: 'stripe', displayName: 'PayNow' },
      { methodType: 'wallet', gateway: 'wallet', displayName: 'Kartseek Wallet' },
    ]
  }
};

/** All supported country codes */
export const SUPPORTED_COUNTRIES: SupportedCountryCode[] = Object.keys(REGION_CONFIGS) as SupportedCountryCode[];

/**
 * Which of the registry's regions the platform actually trades in.
 *
 * `isActive` is `true` on all ten entries and always has been, so
 * `getActiveRegions()` reported the entire registry as live and every code the
 * registry knows about was accepted as a trading market. The web client was
 * fixed to read `NEXT_PUBLIC_ACTIVE_REGIONS`; this is the same list on the
 * server, and the two must agree or the storefront and the API disagree about
 * which markets exist.
 *
 * Set `ACTIVE_REGIONS` to a comma-separated list of ISO codes. Unset means the
 * home market only, which is the safe reading: opening a market is a deliberate
 * act, and defaulting to "all of them" is how this went wrong the first time.
 */
export const DEFAULT_REGION: SupportedCountryCode = 'QA';

export const ACTIVE_REGION_CODES: SupportedCountryCode[] = (() => {
  const raw = process.env.ACTIVE_REGIONS?.trim();
  if (!raw) return [DEFAULT_REGION];
  const parsed = raw
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is SupportedCountryCode => c in REGION_CONFIGS);
  // An env var naming only unknown codes must not silently close every market.
  return parsed.length > 0 ? parsed : [DEFAULT_REGION];
})();

/**
 * Get region config by country code (returns undefined if unsupported).
 *
 * Deliberately permissive: a seller record, an order or an invoice from a
 * closed market still has to resolve its own currency and tax label long after
 * the market stops accepting new business. Use `isActiveRegion` for anything
 * that decides where a *new* transaction may happen.
 */
export function getRegionConfig(code: string): RegionConfig | undefined {
  return REGION_CONFIGS[code as SupportedCountryCode];
}

/** Whether the registry describes this country at all — not whether we trade there. */
export function isSupportedRegion(code: string): code is SupportedCountryCode {
  return code in REGION_CONFIGS;
}

/** Whether the platform currently trades in this country. */
export function isActiveRegion(code: string | undefined | null): code is SupportedCountryCode {
  if (!code) return false;
  return (ACTIVE_REGION_CODES as string[]).includes(code.toUpperCase());
}

/** Get all regions the platform currently trades in. */
export function getActiveRegions(): RegionConfig[] {
  return ACTIVE_REGION_CODES.map((c) => REGION_CONFIGS[c]).filter((r) => r?.isActive);
}
