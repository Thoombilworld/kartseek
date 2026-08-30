/// KARTSEEK — Country localization registry
///
/// The authoritative description of every operational region: which languages
/// it offers, what it charges in, how it writes an address, which payment
/// methods clear there, what its clock is, and which data-protection regime
/// binds the platform.
///
/// Everything region-dependent in the three web clients derives from this file.
/// `@/i18n/config` re-exports a compatibility view for older call sites.

import type {
  AddressSpec, CountryCode, CountryLocalization, PaymentMethodSpec,
} from './types';

// ─── Shared address building blocks ──────────────────────────────────────────

const CONTACT_FIELDS: AddressSpec['fields'] = [
  { key: 'fullName', label: 'Full Name', labelAr: 'الاسم الكامل', required: true, row: 1 },
  { key: 'phone', label: 'Mobile Number', labelAr: 'رقم الهاتف', required: true, inputMode: 'tel', row: 1 },
];

/**
 * Qatar's national addressing scheme.
 *
 * Qatar has no public postal-code system — mail is not delivered to street
 * addresses at all, it goes to P.O. boxes. Physical locations are identified by
 * a three-number tuple (building / street / zone) issued by the Ministry of
 * Municipality, which is what a courier actually navigates by. A form that
 * demands a postcode and offers a free-text "State" cannot express a Qatari
 * address, so this spec replaces both.
 */
const QATAR_ADDRESS: AddressSpec = {
  hasPostalCode: false,
  guidance:
    'Qatari addresses use the national Building / Street / Zone numbering issued by the '
    + 'Ministry of Municipality. You can find all three on your Kahramaa bill or via the '
    + 'Ministry\'s address search.',
  fields: [
    ...CONTACT_FIELDS,
    { key: 'buildingNumber', label: 'Building Number', labelAr: 'رقم المبنى', required: true, inputMode: 'numeric', maxLength: 4, pattern: '^[0-9]{1,4}$', patternMessage: 'Building number is 1–4 digits', row: 2 },
    { key: 'unit', label: 'Unit / Floor / Apt', labelAr: 'الوحدة / الطابق', required: false, row: 2 },
    { key: 'streetNumber', label: 'Street Number', labelAr: 'رقم الشارع', required: true, inputMode: 'numeric', maxLength: 4, pattern: '^[0-9]{1,4}$', patternMessage: 'Street number is 1–4 digits', row: 3 },
    { key: 'zoneNumber', label: 'Zone Number', labelAr: 'رقم المنطقة', required: true, inputMode: 'numeric', maxLength: 3, pattern: '^[0-9]{1,3}$', patternMessage: 'Zone number is 1–3 digits', row: 3 },
    { key: 'area', label: 'Area / District', labelAr: 'المنطقة', required: true, placeholder: 'e.g. Al Sadd, West Bay, Al Wakrah', row: 4 },
    { key: 'city', label: 'City / Municipality', labelAr: 'المدينة', required: true, placeholder: 'Doha', row: 4 },
    { key: 'landmark', label: 'Nearest Landmark', labelAr: 'أقرب معلم', required: false, helper: 'Helps the rider find you faster', row: 5 },
    { key: 'poBox', label: 'P.O. Box', labelAr: 'صندوق البريد', required: false, inputMode: 'numeric', helper: 'Optional — for postal correspondence only', row: 5 },
  ],
  lines: [
    { keys: ['fullName'] },
    { keys: ['unit', 'buildingNumber'], separator: ', ' },
    { keys: ['streetNumber'], separator: ' ' },
    { keys: ['zoneNumber'], separator: ' ' },
    { keys: ['area', 'city'], separator: ', ' },
    { keys: ['poBox'] },
  ],
};

const INDIA_ADDRESS: AddressSpec = {
  hasPostalCode: true,
  guidance: 'Enter the 6-digit PIN code to auto-fill your city and state.',
  fields: [
    ...CONTACT_FIELDS,
    { key: 'postalCode', label: 'PIN Code', required: true, inputMode: 'numeric', maxLength: 6, pattern: '^[1-9][0-9]{5}$', patternMessage: 'PIN code is 6 digits and cannot start with 0', row: 2 },
    { key: 'line1', label: 'Flat / House No., Building', required: true, row: 3 },
    { key: 'line2', label: 'Area, Street, Sector', required: false, row: 4 },
    { key: 'landmark', label: 'Landmark', required: false, row: 4 },
    { key: 'city', label: 'Town / City', required: true, row: 5 },
    { key: 'state', label: 'State', required: true, row: 5 },
  ],
  lines: [
    { keys: ['fullName'] },
    { keys: ['line1'] },
    { keys: ['line2', 'landmark'], separator: ', ' },
    { keys: ['city', 'state', 'postalCode'], separator: ', ' },
  ],
};

/** Gulf neighbours share Qatar's building/street/zone shape but do issue postcodes. */
function gulfAddress(opts: { postalCode: boolean; cityPlaceholder: string }): AddressSpec {
  return {
    hasPostalCode: opts.postalCode,
    fields: [
      ...CONTACT_FIELDS,
      { key: 'buildingNumber', label: 'Building Number', labelAr: 'رقم المبنى', required: true, inputMode: 'numeric', row: 2 },
      { key: 'unit', label: 'Unit / Floor', labelAr: 'الوحدة / الطابق', required: false, row: 2 },
      { key: 'streetName', label: 'Street', labelAr: 'الشارع', required: true, row: 3 },
      { key: 'area', label: 'Area / District', labelAr: 'المنطقة', required: true, placeholder: opts.cityPlaceholder, row: 3 },
      { key: 'city', label: 'City', labelAr: 'المدينة', required: true, row: 4 },
      ...(opts.postalCode
        ? [{ key: 'postalCode' as const, label: 'Postal Code', labelAr: 'الرمز البريدي', required: false, inputMode: 'numeric' as const, row: 4 }]
        : []),
      { key: 'landmark', label: 'Nearest Landmark', labelAr: 'أقرب معلم', required: false, row: 5 },
      { key: 'poBox', label: 'P.O. Box', labelAr: 'صندوق البريد', required: false, inputMode: 'numeric', row: 5 },
    ],
    lines: [
      { keys: ['fullName'] },
      { keys: ['unit', 'buildingNumber', 'streetName'], separator: ', ' },
      { keys: ['area', 'city'], separator: ', ' },
      { keys: ['postalCode'] },
      { keys: ['poBox'] },
    ],
  };
}

const WESTERN_ADDRESS = (postalLabel: string, regionLabel: string): AddressSpec => ({
  hasPostalCode: true,
  fields: [
    ...CONTACT_FIELDS,
    { key: 'line1', label: 'Address Line 1', required: true, row: 2 },
    { key: 'line2', label: 'Address Line 2', required: false, row: 3 },
    { key: 'city', label: 'City / Town', required: true, row: 4 },
    { key: 'state', label: regionLabel, required: true, row: 4 },
    { key: 'postalCode', label: postalLabel, required: true, row: 5 },
  ],
  lines: [
    { keys: ['fullName'] },
    { keys: ['line1'] },
    { keys: ['line2'] },
    { keys: ['city', 'state', 'postalCode'], separator: ', ' },
  ],
});

// ─── Shared payment building blocks ──────────────────────────────────────────

const WALLET: PaymentMethodSpec = {
  type: 'wallet', gateway: 'wallet', label: 'KARTSEEK Wallet', labelAr: 'محفظة كارتسيك',
  description: 'Pay from your KARTSEEK balance', icon: 'wallet',
};

const CARD = (gateway: string): PaymentMethodSpec => ({
  type: 'card', gateway, label: 'Credit / Debit Card', labelAr: 'بطاقة ائتمان / خصم',
  description: 'Visa, Mastercard, American Express', icon: 'card',
});

const APPLE_PAY = (gateway: string): PaymentMethodSpec => ({
  type: 'apple_pay', gateway, label: 'Apple Pay', description: 'Pay with Face ID or Touch ID', icon: 'apple',
});

const GOOGLE_PAY = (gateway: string): PaymentMethodSpec => ({
  type: 'google_pay', gateway, label: 'Google Pay', description: 'Pay with your saved Google card', icon: 'google',
});

const COD = (note: string): PaymentMethodSpec => ({
  type: 'cod', gateway: 'cod', label: 'Cash on Delivery', labelAr: 'الدفع عند الاستلام',
  description: note, icon: 'cash',
});

// ─── Registry ────────────────────────────────────────────────────────────────

export const COUNTRIES: Record<CountryCode, CountryLocalization> = {
  // ══ Qatar — primary market ═════════════════════════════════════════════════
  QA: {
    code: 'QA',
    name: 'Qatar',
    nativeName: 'قطر',
    flag: '🇶🇦',
    callingCode: '+974',

    // Arabic is the official language; English is the working language of
    // commerce. No other language is offered here — see `getLanguages()`.
    languages: ['ar', 'en'],
    defaultLanguage: 'en',

    currency: {
      code: 'QAR',
      // "QR" is how the riyal is written on Qatari price tags in English. The
      // generic ﷼ sign is ambiguous between the Qatari, Saudi, Omani and
      // Yemeni rials, so it is only used in Arabic contexts alongside ر.ق.
      symbol: 'QR',
      symbolAr: 'ر.ق',
      decimals: 2,
      position: 'before',
      grouping: 'western',
    },

    timezone: 'Asia/Qatar',
    utcOffsetMinutes: 180,   // AST, UTC+3
    observesDst: false,      // Qatar has never observed daylight saving
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 0,       // the Qatari working week runs Sunday–Thursday
    weekend: [5, 6],         // Friday–Saturday

    measurementSystem: 'metric',

    // Qatar has not implemented the GCC VAT framework — there is no
    // consumption tax on retail goods, so nothing is added at checkout.
    tax: { name: 'No VAT', nameAr: 'لا توجد ضريبة', rate: 0, inclusive: true, registrationLabel: 'Commercial Registration (CR)' },

    address: QATAR_ADDRESS,

    payments: [
      {
        type: 'debit_national', gateway: 'naps', label: 'Himyan / NAPS Debit Card',
        labelAr: 'بطاقة هميان / نابس', description: 'Qatar\'s domestic debit network',
        isDefault: true, isLocal: true, icon: 'debit',
      },
      CARD('qpay'),
      APPLE_PAY('qpay'),
      GOOGLE_PAY('qpay'),
      {
        type: 'telecom_wallet', gateway: 'ooredoo', label: 'Ooredoo Money',
        labelAr: 'أوريدو موني', description: 'Pay from your Ooredoo Money wallet',
        isLocal: true, icon: 'phone',
      },
      { ...WALLET },
      COD('Pay the rider in cash on arrival'),
      {
        type: 'bank_transfer', gateway: 'qnb', label: 'Bank Transfer',
        labelAr: 'تحويل بنكي', description: 'QNB, CBQ, Doha Bank and other local banks',
        isLocal: true, minAmount: 200, icon: 'bank',
      },
    ],

    compliance: {
      law: 'PDPPL',
      lawAr: 'قانون حماية خصوصية البيانات الشخصية',
      citation: 'Law No. (13) of 2016 Concerning Personal Data Privacy Protection',
      regulator: 'National Cyber Governance and Assurance Affairs (NCGAA), National Cyber Security Agency',
      regulatorUrl: 'https://www.ncsa.gov.qa',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      // The PDPPL does not impose blanket localisation, but it restricts
      // transfers that would breach the protections it grants, so the platform
      // keeps Qatari personal data in-region by default.
      dataResidencyRequired: true,
      dataSubjectRights: [
        'Withdraw consent at any time',
        'Access personal data held about you',
        'Request correction of inaccurate data',
        'Request erasure of your data',
        'Object to processing for direct marketing',
        'Be notified of a breach affecting your data',
      ],
      recordRetentionMonths: 60,
      minimumConsentAge: 18,
      additionalRegulations: [
        'Law No. (16) of 2010 on Electronic Commerce and Transactions',
        'Qatar Central Bank payment services regulations',
        'Ministry of Public Health rules for pharmacy and telemedicine',
        'Ministry of Commerce and Industry consumer protection rules',
      ],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },

    defaultCity: 'Doha',
    coords: { lat: 25.2854, lng: 51.5310 },
    bounds: { minLat: 24.4, maxLat: 26.2, minLng: 50.7, maxLng: 51.7 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ India ══════════════════════════════════════════════════════════════════
  IN: {
    code: 'IN',
    name: 'India',
    nativeName: 'भारत',
    flag: '🇮🇳',
    callingCode: '+91',
    languages: ['en', 'hi', 'ta', 'ml'],
    defaultLanguage: 'en',
    currency: { code: 'INR', symbol: '₹', decimals: 2, position: 'before', grouping: 'indian' },
    timezone: 'Asia/Kolkata',
    utcOffsetMinutes: 330,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 1,
    weekend: [0, 6],
    measurementSystem: 'metric',
    tax: { name: 'GST', rate: 18, inclusive: true, registrationLabel: 'GSTIN' },
    address: INDIA_ADDRESS,
    payments: [
      { type: 'upi', gateway: 'upi', label: 'UPI', description: 'GPay, PhonePe, Paytm, BHIM', isDefault: true, isLocal: true, icon: 'upi' },
      CARD('razorpay'),
      { type: 'netbanking', gateway: 'razorpay', label: 'Net Banking', description: 'All major Indian banks', isLocal: true, icon: 'bank' },
      { ...WALLET },
      COD('Pay in cash when your order arrives'),
    ],
    compliance: {
      law: 'DPDP Act',
      citation: 'Digital Personal Data Protection Act, 2023',
      regulator: 'Data Protection Board of India',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: [
        'Access a summary of your personal data',
        'Request correction and completion',
        'Request erasure',
        'Nominate another person to exercise your rights',
        'Raise a grievance with the platform',
      ],
      recordRetentionMonths: 96,
      minimumConsentAge: 18,
      additionalRegulations: [
        'Consumer Protection (E-Commerce) Rules, 2020',
        'RBI payment aggregator guidelines',
        'Legal Metrology (Packaged Commodities) Rules',
        'FSSAI licensing for food and grocery',
      ],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'New Delhi',
    coords: { lat: 28.6139, lng: 77.2090 },
    bounds: { minLat: 6.5, maxLat: 37.1, minLng: 68.1, maxLng: 97.4 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ United Arab Emirates ═══════════════════════════════════════════════════
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    nativeName: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    callingCode: '+971',
    languages: ['en', 'ar'],
    defaultLanguage: 'en',
    currency: { code: 'AED', symbol: 'AED', symbolAr: 'د.إ', decimals: 2, position: 'before' },
    timezone: 'Asia/Dubai',
    utcOffsetMinutes: 240,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 1,
    weekend: [6, 0],
    measurementSystem: 'metric',
    tax: { name: 'VAT', rate: 5, inclusive: true, registrationLabel: 'TRN' },
    address: gulfAddress({ postalCode: false, cityPlaceholder: 'e.g. Al Barsha, Deira' }),
    payments: [
      CARD('stripe'), APPLE_PAY('stripe'),
      { type: 'samsung_pay', gateway: 'stripe', label: 'Samsung Pay', icon: 'samsung' },
      { ...WALLET }, COD('Pay the rider in cash on arrival'),
    ],
    compliance: {
      law: 'PDPL',
      citation: 'Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data',
      regulator: 'UAE Data Office',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: ['Access', 'Rectification', 'Erasure', 'Restrict processing', 'Data portability', 'Object to processing'],
      recordRetentionMonths: 60,
      minimumConsentAge: 18,
      additionalRegulations: ['UAE Central Bank stored value facilities regulation', 'Federal Law on Consumer Protection'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'Dubai',
    coords: { lat: 25.2048, lng: 55.2708 },
    bounds: { minLat: 22.6, maxLat: 26.1, minLng: 51.5, maxLng: 56.4 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ Saudi Arabia ═══════════════════════════════════════════════════════════
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    nativeName: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    callingCode: '+966',
    languages: ['ar', 'en'],
    defaultLanguage: 'ar',
    currency: { code: 'SAR', symbol: 'SAR', symbolAr: 'ر.س', decimals: 2, position: 'before' },
    timezone: 'Asia/Riyadh',
    utcOffsetMinutes: 180,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 0,
    weekend: [5, 6],
    measurementSystem: 'metric',
    tax: { name: 'VAT', nameAr: 'ضريبة القيمة المضافة', rate: 15, inclusive: true, registrationLabel: 'VAT Number' },
    address: gulfAddress({ postalCode: true, cityPlaceholder: 'e.g. Al Olaya, Al Malaz' }),
    payments: [
      { type: 'mada', gateway: 'mada', label: 'mada', labelAr: 'مدى', description: 'Saudi domestic debit network', isDefault: true, isLocal: true, icon: 'debit' },
      CARD('stripe'),
      { type: 'sadad', gateway: 'sadad', label: 'SADAD', labelAr: 'سداد', isLocal: true, icon: 'bank' },
      APPLE_PAY('stripe'), { ...WALLET }, COD('Pay the rider in cash on arrival'),
    ],
    compliance: {
      law: 'PDPL',
      citation: 'Personal Data Protection Law, Royal Decree M/19 of 2021',
      regulator: 'Saudi Data & AI Authority (SDAIA)',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: true,
      dataSubjectRights: ['Be informed', 'Access', 'Request a copy', 'Rectification', 'Destruction', 'Withdraw consent'],
      recordRetentionMonths: 60,
      minimumConsentAge: 18,
      additionalRegulations: ['ZATCA e-invoicing (Fatoora)', 'SAMA payment services rules'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'Riyadh',
    coords: { lat: 24.7136, lng: 46.6753 },
    bounds: { minLat: 16.3, maxLat: 32.2, minLng: 34.5, maxLng: 55.7 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ Bahrain ════════════════════════════════════════════════════════════════
  BH: {
    code: 'BH',
    name: 'Bahrain',
    nativeName: 'البحرين',
    flag: '🇧🇭',
    callingCode: '+973',
    languages: ['en', 'ar'],
    defaultLanguage: 'en',
    currency: { code: 'BHD', symbol: 'BD', symbolAr: 'ب.د', decimals: 3, position: 'before' },
    timezone: 'Asia/Bahrain',
    utcOffsetMinutes: 180,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 0,
    weekend: [5, 6],
    measurementSystem: 'metric',
    tax: { name: 'VAT', rate: 10, inclusive: true, registrationLabel: 'VAT Account Number' },
    address: gulfAddress({ postalCode: true, cityPlaceholder: 'e.g. Seef, Juffair' }),
    payments: [
      { type: 'benefit', gateway: 'benefit', label: 'BenefitPay', description: 'Bahrain\'s domestic payment network', isDefault: true, isLocal: true, icon: 'debit' },
      CARD('stripe'), APPLE_PAY('stripe'), { ...WALLET }, COD('Pay the rider in cash on arrival'),
    ],
    compliance: {
      law: 'PDPL',
      citation: 'Law No. 30 of 2018 on Personal Data Protection',
      regulator: 'Personal Data Protection Authority',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: ['Access', 'Rectification', 'Erasure', 'Object to processing', 'Withdraw consent'],
      recordRetentionMonths: 60,
      minimumConsentAge: 18,
      additionalRegulations: ['Central Bank of Bahrain payment rules'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'Manama',
    coords: { lat: 26.0667, lng: 50.5577 },
    bounds: { minLat: 25.5, maxLat: 26.4, minLng: 50.3, maxLng: 50.9 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ Kuwait ═════════════════════════════════════════════════════════════════
  KW: {
    code: 'KW',
    name: 'Kuwait',
    nativeName: 'الكويت',
    flag: '🇰🇼',
    callingCode: '+965',
    languages: ['ar', 'en'],
    defaultLanguage: 'ar',
    currency: { code: 'KWD', symbol: 'KD', symbolAr: 'د.ك', decimals: 3, position: 'before' },
    timezone: 'Asia/Kuwait',
    utcOffsetMinutes: 180,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 0,
    weekend: [5, 6],
    measurementSystem: 'metric',
    tax: { name: 'No VAT', rate: 0, inclusive: true },
    address: gulfAddress({ postalCode: true, cityPlaceholder: 'e.g. Salmiya, Hawalli' }),
    payments: [
      { type: 'knet', gateway: 'knet', label: 'KNET', description: 'Kuwait\'s domestic debit network', isDefault: true, isLocal: true, icon: 'debit' },
      CARD('stripe'), APPLE_PAY('stripe'), { ...WALLET }, COD('Pay the rider in cash on arrival'),
    ],
    compliance: {
      law: 'CITRA DPPR',
      citation: 'CITRA Data Privacy Protection Regulation No. 42 of 2021',
      regulator: 'Communication and Information Technology Regulatory Authority (CITRA)',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: ['Access', 'Rectification', 'Erasure', 'Withdraw consent'],
      recordRetentionMonths: 60,
      minimumConsentAge: 21,
      additionalRegulations: ['Central Bank of Kuwait e-payment rules'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'Kuwait City',
    coords: { lat: 29.3759, lng: 47.9774 },
    bounds: { minLat: 28.5, maxLat: 30.1, minLng: 46.5, maxLng: 48.5 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ Oman ═══════════════════════════════════════════════════════════════════
  OM: {
    code: 'OM',
    name: 'Oman',
    nativeName: 'عُمان',
    flag: '🇴🇲',
    callingCode: '+968',
    languages: ['ar', 'en'],
    defaultLanguage: 'ar',
    currency: { code: 'OMR', symbol: 'OMR', symbolAr: 'ر.ع.', decimals: 3, position: 'before' },
    timezone: 'Asia/Muscat',
    utcOffsetMinutes: 240,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 0,
    weekend: [5, 6],
    measurementSystem: 'metric',
    tax: { name: 'VAT', rate: 5, inclusive: true, registrationLabel: 'VAT Number' },
    address: gulfAddress({ postalCode: true, cityPlaceholder: 'e.g. Ruwi, Qurum' }),
    payments: [CARD('stripe'), APPLE_PAY('stripe'), { ...WALLET }, COD('Pay the rider in cash on arrival')],
    compliance: {
      law: 'PDPL',
      citation: 'Royal Decree No. 6/2022 promulgating the Personal Data Protection Law',
      regulator: 'Ministry of Transport, Communications and Information Technology',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: ['Access', 'Rectification', 'Erasure', 'Withdraw consent', 'Transfer'],
      recordRetentionMonths: 60,
      minimumConsentAge: 18,
      additionalRegulations: ['Central Bank of Oman payment rules'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'Muscat',
    coords: { lat: 23.5880, lng: 58.3829 },
    bounds: { minLat: 16.6, maxLat: 26.4, minLng: 52.0, maxLng: 59.9 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ United Kingdom ═════════════════════════════════════════════════════════
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    flag: '🇬🇧',
    callingCode: '+44',
    languages: ['en'],
    defaultLanguage: 'en',
    currency: { code: 'GBP', symbol: '£', decimals: 2, position: 'before' },
    timezone: 'Europe/London',
    utcOffsetMinutes: 0,
    observesDst: true,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    hour12: false,
    firstDayOfWeek: 1,
    weekend: [0, 6],
    measurementSystem: 'imperial',
    tax: { name: 'VAT', rate: 20, inclusive: true, registrationLabel: 'VAT Number' },
    address: WESTERN_ADDRESS('Postcode', 'County'),
    payments: [CARD('stripe'), APPLE_PAY('stripe'), GOOGLE_PAY('stripe'), { ...WALLET }],
    compliance: {
      law: 'UK GDPR',
      citation: 'UK GDPR and the Data Protection Act 2018',
      regulator: 'Information Commissioner\'s Office (ICO)',
      regulatorUrl: 'https://ico.org.uk',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: ['Be informed', 'Access', 'Rectification', 'Erasure', 'Restrict processing', 'Data portability', 'Object', 'Rights around automated decision making'],
      recordRetentionMonths: 72,
      minimumConsentAge: 13,
      additionalRegulations: ['PECR (cookies and e-marketing)', 'FCA payment services rules'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'London',
    coords: { lat: 51.5074, lng: -0.1278 },
    bounds: { minLat: 49.9, maxLat: 60.9, minLng: -8.6, maxLng: 1.8 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ United States ══════════════════════════════════════════════════════════
  US: {
    code: 'US',
    name: 'United States',
    nativeName: 'United States',
    flag: '🇺🇸',
    callingCode: '+1',
    languages: ['en', 'es'],
    defaultLanguage: 'en',
    currency: { code: 'USD', symbol: '$', decimals: 2, position: 'before' },
    timezone: 'America/New_York',
    utcOffsetMinutes: -300,
    observesDst: true,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 0,
    weekend: [0, 6],
    measurementSystem: 'imperial',
    tax: { name: 'Sales Tax', rate: 8.875, inclusive: false, registrationLabel: 'Sales Tax ID' },
    address: WESTERN_ADDRESS('ZIP Code', 'State'),
    payments: [
      CARD('stripe'), APPLE_PAY('stripe'), GOOGLE_PAY('stripe'),
      { type: 'ach', gateway: 'stripe', label: 'ACH Bank Transfer', icon: 'bank' },
      { ...WALLET },
    ],
    compliance: {
      law: 'State privacy laws',
      citation: 'CCPA/CPRA and comparable state privacy statutes',
      regulator: 'California Privacy Protection Agency and state attorneys general',
      breachNotificationHours: 72,
      requiresExplicitConsent: false,
      dataResidencyRequired: false,
      dataSubjectRights: ['Know what is collected', 'Delete', 'Correct', 'Opt out of sale or sharing', 'Limit use of sensitive data', 'Non-discrimination'],
      recordRetentionMonths: 84,
      minimumConsentAge: 13,
      additionalRegulations: ['FTC Act Section 5', 'COPPA', 'State e-commerce disclosure rules'],
      optInCookieCategories: ['marketing'],
    },
    defaultCity: 'New York',
    coords: { lat: 40.7128, lng: -74.0060 },
    bounds: { minLat: 24.5, maxLat: 49.4, minLng: -125.0, maxLng: -66.9 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },

  // ══ Singapore ══════════════════════════════════════════════════════════════
  SG: {
    code: 'SG',
    name: 'Singapore',
    nativeName: 'Singapore',
    flag: '🇸🇬',
    callingCode: '+65',
    languages: ['en'],
    defaultLanguage: 'en',
    currency: { code: 'SGD', symbol: 'S$', decimals: 2, position: 'before' },
    timezone: 'Asia/Singapore',
    utcOffsetMinutes: 480,
    observesDst: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    hour12: true,
    firstDayOfWeek: 1,
    weekend: [0, 6],
    measurementSystem: 'metric',
    tax: { name: 'GST', rate: 9, inclusive: true, registrationLabel: 'GST Registration Number' },
    address: WESTERN_ADDRESS('Postal Code', 'District'),
    payments: [
      CARD('stripe'), APPLE_PAY('stripe'),
      { type: 'paynow', gateway: 'stripe', label: 'PayNow', isLocal: true, icon: 'qr' },
      { type: 'grabpay', gateway: 'stripe', label: 'GrabPay', isLocal: true, icon: 'wallet' },
      { ...WALLET },
    ],
    compliance: {
      law: 'PDPA',
      citation: 'Personal Data Protection Act 2012',
      regulator: 'Personal Data Protection Commission (PDPC)',
      breachNotificationHours: 72,
      requiresExplicitConsent: true,
      dataResidencyRequired: false,
      dataSubjectRights: ['Access', 'Correction', 'Withdraw consent', 'Data portability'],
      recordRetentionMonths: 60,
      minimumConsentAge: 13,
      additionalRegulations: ['MAS payment services rules', 'Spam Control Act'],
      optInCookieCategories: ['analytics', 'marketing', 'personalisation'],
    },
    defaultCity: 'Singapore',
    coords: { lat: 1.3521, lng: 103.8198 },
    bounds: { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 },
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'],
    isActive: true,
  },
};

// ─── Access helpers ──────────────────────────────────────────────────────────

/**
 * The region used when detection produces nothing usable.
 *
 * Qatar is the platform's home market, so an unresolved visitor gets the Qatari
 * storefront rather than a generic one. Overridable per deployment.
 */
export const DEFAULT_COUNTRY: CountryCode =
  ((process.env.NEXT_PUBLIC_DEFAULT_REGION || '').toUpperCase() as CountryCode) in COUNTRIES
    ? ((process.env.NEXT_PUBLIC_DEFAULT_REGION as string).toUpperCase() as CountryCode)
    : 'QA';

/** Every country the registry describes, operating or not. */
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

/**
 * The markets the platform actually trades in.
 *
 * `isActive` has been `true` on all twenty entries since the registry was
 * written, and nothing filtered on it — so the country switcher offered every
 * market in the file and a visitor could put the storefront into a country the
 * business does not operate in, complete with its currency, payment rails and
 * address form. Restricting that is a configuration decision, not a code one,
 * so it lives in an environment variable with the home market as the default.
 *
 *   NEXT_PUBLIC_ACTIVE_REGIONS=QA,AE   → Qatar and the UAE
 *   (unset)                            → the home market alone
 */
export const ACTIVE_COUNTRY_CODES: CountryCode[] = (() => {
  const configured = (process.env.NEXT_PUBLIC_ACTIVE_REGIONS || '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is CountryCode => c in COUNTRIES);

  const active = configured.length > 0 ? configured : [DEFAULT_COUNTRY];
  // The default market must always be selectable, or the storefront has nowhere
  // to fall back to.
  return active.includes(DEFAULT_COUNTRY) ? active : [DEFAULT_COUNTRY, ...active];
})();

/** Whether the platform trades in this market. */
export function isActiveCountry(value: string | undefined | null): value is CountryCode {
  return !!value && ACTIVE_COUNTRY_CODES.includes(value.toUpperCase() as CountryCode);
}

/**
 * Whether the registry *describes* this country.
 *
 * Deliberately not the same question as `isActiveCountry`. Historical records
 * still reference markets the platform has left — an old order, an invoice from
 * an Indian seller — and those must keep resolving their currency, tax-id label
 * and address format, or the documents become unreadable. Use this for
 * describing stored data; use `isActiveCountry` for deciding where a shopper
 * may trade.
 */
export function isCountryCode(value: string | undefined | null): value is CountryCode {
  return !!value && value.toUpperCase() in COUNTRIES;
}

/**
 * Describe a country the registry knows — active or not. Never throws.
 *
 * Deliberately **not** restricted to trading markets. Sixty-three call sites
 * read this, and most of them describe *stored data* rather than choose where a
 * shopper trades: a seller's own compliance rules, an address already on file,
 * the currency an old order was priced in, an invoice from a merchant in a
 * market the platform has since left. Filtering here would relabel an Indian
 * seller's GSTIN as a Qatari Commercial Registration number on a document the
 * customer already holds.
 *
 * The restriction belongs where a market is *chosen* — see
 * `resolveTradingCountry` and `getActiveCountries`.
 */
export function getCountry(code: string | undefined | null): CountryLocalization {
  if (!code) return COUNTRIES[DEFAULT_COUNTRY];
  return COUNTRIES[code.toUpperCase() as CountryCode] ?? COUNTRIES[DEFAULT_COUNTRY];
}

/**
 * The market a visitor may actually shop in.
 *
 * This is the gate. Detection (IP, cookie, header, query string) can propose
 * any country; only a trading market is accepted, and anything else falls back
 * to the home market. A stale `kartseek_country=IN` cookie must not put a
 * shopper on an Indian storefront — with Indian pricing, payment rails and
 * address fields — that the business does not operate.
 */
export function resolveTradingCountry(code: string | undefined | null): CountryLocalization {
  if (isActiveCountry(code)) return COUNTRIES[code!.toUpperCase() as CountryCode];
  return COUNTRIES[DEFAULT_COUNTRY];
}

/** The markets a shopper may switch between. */
export function getActiveCountries(): CountryLocalization[] {
  return ACTIVE_COUNTRY_CODES.map((c) => COUNTRIES[c]).filter((c) => c.isActive);
}

/**
 * The trading markets as prose, for body copy and SEO descriptions.
 *
 * Marketing copy across the verticals listed the markets by hand, and the hand
 * lists had drifted: the pharmacy pages advertised "India, India, Qatar, UAE,
 * Saudi Arabia, Bahrain, Kuwait, Oman, UK, and USA" — India twice, and eight
 * countries the platform does not trade in. Copy that names markets should read
 * the same registry the region switcher does, so closing a market removes it
 * from the sales pitch too.
 */
export function formatActiveCountryList(conjunction = 'and', native = false): string {
  // `native` picks each country's own endonym, for copy that is itself written
  // in that language — the Arabic grocery blurb reads "قطر", not "Qatar".
  const names = getActiveCountries().map((c) => (native ? c.nativeName : c.name));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ${conjunction} ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, ${conjunction} ${names[names.length - 1]}`;
}

/**
 * Languages offered in a country.
 *
 * This is the one function the language switchers in all three portals read, so
 * "Qatar shows Arabic and English only" is a property of the registry rather
 * than something each portal has to remember.
 */
export function getLanguages(code: string | undefined | null) {
  return getCountry(code).languages;
}

/**
 * Resolve a country from GPS coordinates using the registry's bounding boxes.
 *
 * Boxes overlap around the Gulf, so the smallest matching box wins — Qatar's
 * box sits inside Saudi Arabia's and would otherwise lose.
 */
export function countryFromCoords(lat: number, lng: number): CountryCode | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  let best: CountryCode | null = null;
  let bestArea = Infinity;

  for (const code of COUNTRY_CODES) {
    const b = COUNTRIES[code].bounds;
    if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) continue;
    const area = (b.maxLat - b.minLat) * (b.maxLng - b.minLng);
    if (area < bestArea) { best = code; bestArea = area; }
  }
  return best;
}

/** Country whose calling code matches an E.164 phone number. */
export function countryFromPhone(phone: string): CountryCode | null {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) return null;
  // Longest calling code first so +974 is not shadowed by +9.
  const sorted = [...COUNTRY_CODES].sort(
    (a, b) => COUNTRIES[b].callingCode.length - COUNTRIES[a].callingCode.length,
  );
  return sorted.find((c) => digits.startsWith(COUNTRIES[c].callingCode)) ?? null;
}
