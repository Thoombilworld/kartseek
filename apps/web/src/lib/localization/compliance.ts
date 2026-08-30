/// KARTSEEK — Region-aware compliance and privacy
///
/// The obligations the platform is under change with the customer's country.
/// In Qatar that is Law No. (13) of 2016 on Personal Data Privacy Protection
/// (PDPPL): consent must be affirmative and withdrawable, data subjects have
/// named rights, and a breach is reportable within 72 hours.
///
/// This module supplies the *mechanism* — which consent to collect, which
/// rights to expose, what the policy says, how long records are kept. The
/// policy prose below is drafted against each regime but is not legal advice;
/// have counsel in each market review it before it goes live.

import { getCountry } from './countries';
import type { ComplianceSpec, CountryCode } from './types';

export function getCompliance(country?: string): ComplianceSpec {
  return getCountry(country).compliance;
}

// ─── Consent ─────────────────────────────────────────────────────────────────

export type ConsentCategory = 'essential' | 'analytics' | 'marketing' | 'personalisation';

export interface ConsentCategorySpec {
  id: ConsentCategory;
  label: string;
  labelAr?: string;
  description: string;
  /** Essential cookies cannot be declined — they carry the session and cart. */
  required: boolean;
  /** True when this region forbids switching it on before the user agrees. */
  optIn: boolean;
}

const CATEGORY_COPY: Record<ConsentCategory, { label: string; labelAr: string; description: string }> = {
  essential: {
    label: 'Strictly Necessary',
    labelAr: 'ضرورية للغاية',
    description: 'Keeps you signed in, remembers your cart and secures checkout. These cannot be switched off.',
  },
  analytics: {
    label: 'Analytics',
    labelAr: 'التحليلات',
    description: 'Helps us understand which pages and products people use, so we can improve them.',
  },
  marketing: {
    label: 'Marketing',
    labelAr: 'التسويق',
    description: 'Lets us show you KARTSEEK offers on other sites and measure whether they worked.',
  },
  personalisation: {
    label: 'Personalisation',
    labelAr: 'التخصيص',
    description: 'Tailors recommendations and home-page banners to what you have browsed.',
  },
};

/**
 * The consent categories to present in a region, and which of them must start
 * switched off.
 *
 * Under the PDPPL nothing beyond what the service strictly needs may be
 * processed without the individual's consent, so in Qatar every non-essential
 * category is opt-in and the banner cannot pre-tick them.
 */
export function getConsentCategories(country?: string): ConsentCategorySpec[] {
  const { optInCookieCategories } = getCompliance(country);
  const all: ConsentCategory[] = ['essential', 'analytics', 'marketing', 'personalisation'];

  return all.map((id) => ({
    id,
    ...CATEGORY_COPY[id],
    required: id === 'essential',
    optIn: id !== 'essential' && (optInCookieCategories as string[]).includes(id),
  }));
}

export type ConsentState = Record<ConsentCategory, boolean>;

/** The state a first-time visitor starts from, before they answer the banner. */
export function getDefaultConsent(country?: string): ConsentState {
  const categories = getConsentCategories(country);
  return categories.reduce((acc, c) => {
    // Required stays on; an opt-in category starts off; anything else may
    // default on in regimes that permit legitimate-interest processing.
    acc[c.id] = c.required ? true : !c.optIn;
    return acc;
  }, {} as ConsentState);
}

/**
 * A consent decision, in the shape the audit trail stores.
 *
 * The PDPPL requires the controller to be able to *demonstrate* consent, so the
 * record keeps the policy version and region in force at the moment it was
 * given — a later policy change must not retroactively appear consented to.
 */
export interface ConsentRecord {
  state: ConsentState;
  /** ISO timestamp. */
  grantedAt: string;
  /** Region in force when consent was given. */
  country: CountryCode | string;
  /** Version of the privacy policy the user agreed to. */
  policyVersion: string;
  /** How the decision was made. */
  source: 'banner' | 'preferences' | 'registration' | 'api';
}

export const PRIVACY_POLICY_VERSION = '2026.07';

export function buildConsentRecord(
  state: ConsentState,
  country: string,
  source: ConsentRecord['source'] = 'banner',
): ConsentRecord {
  return {
    state,
    grantedAt: new Date().toISOString(),
    country: country.toUpperCase(),
    policyVersion: PRIVACY_POLICY_VERSION,
    source,
  };
}

/**
 * Whether a stored consent still counts.
 *
 * A decision made under another region's rules, or against an older policy, has
 * to be asked again rather than silently carried over.
 */
export function isConsentValid(record: ConsentRecord | null | undefined, country: string): boolean {
  if (!record) return false;
  if (record.policyVersion !== PRIVACY_POLICY_VERSION) return false;
  if ((record.country || '').toUpperCase() !== country.toUpperCase()) return false;
  return true;
}

// ─── Privacy policy content ──────────────────────────────────────────────────

export interface PolicySection {
  id: string;
  heading: string;
  headingAr?: string;
  /** Paragraphs. */
  body: string[];
  /** Optional bulleted list rendered after the body. */
  bullets?: string[];
}

/**
 * The privacy policy for a region, assembled from its compliance spec.
 *
 * The structure is shared; the law, the regulator, the rights list, the
 * retention window and the transfer position all come from the region, so the
 * Qatari policy names the PDPPL and the NCGAA while the Indian one names the
 * DPDP Act and the Data Protection Board.
 */
export function getPrivacyPolicySections(country?: string): PolicySection[] {
  const c = getCountry(country);
  const law = c.compliance;

  return [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      headingAr: 'من نحن',
      body: [
        `KARTSEEK operates a multi-service platform in ${c.name} covering marketplace, grocery, food delivery, `
        + `pharmacy, and related services. For personal data collected from users in ${c.name}, KARTSEEK acts as `
        + `the data controller.`,
        `This notice is issued under ${law.citation}. Our processing in ${c.name} is supervised by the `
        + `${law.regulator}.`,
      ],
    },
    {
      id: 'what-we-collect',
      heading: 'What we collect',
      headingAr: 'ما الذي نجمعه',
      body: [
        'We collect only what a given service needs to work, and we tell you at the point of collection why we need it.',
      ],
      bullets: [
        'Account details — name, mobile number, email address, and password credentials.',
        `Delivery details — the ${c.address.hasPostalCode ? 'addresses' : 'building, street and zone numbers'} you save, and the location you share when you ask us to find nearby stores.`,
        `Order and payment records — what you bought, when, and the payment method used. Card numbers are handled by our payment providers and are never stored on KARTSEEK systems.`,
        'Device and usage data — the pages you visit and the device you use, for security and for the analytics you have consented to.',
        'Support correspondence — messages you send us and our replies.',
      ],
    },
    {
      id: 'legal-basis',
      heading: law.requiresExplicitConsent ? 'Your consent' : 'Why we are allowed to process your data',
      headingAr: 'الأساس القانوني',
      body: law.requiresExplicitConsent
        ? [
          `Under ${law.law}, we process your personal data on the basis of your consent, except where processing `
          + 'is necessary to perform a contract with you (delivering an order you placed), to comply with a legal '
          + 'obligation, or to protect a vital interest.',
          'Consent is requested affirmatively — nothing beyond what the service strictly needs is switched on '
          + 'before you agree. You can withdraw consent at any time from Privacy Settings in your account, and '
          + 'withdrawal does not affect processing already carried out.',
        ]
        : [
          'We process personal data to perform our contract with you, to comply with legal obligations, and for '
          + 'our legitimate interests in operating and securing the platform.',
          'Where we rely on your consent — for marketing and for optional analytics — you can withdraw it at any '
          + 'time from Privacy Settings in your account.',
        ],
    },
    {
      id: 'your-rights',
      heading: 'Your rights',
      headingAr: 'حقوقك',
      body: [
        `${law.law} gives you the following rights over your personal data. You can exercise any of them from `
        + 'Privacy Settings in your account, or by contacting our Data Protection Officer at privacy@kartseek.com. '
        + 'We respond within 30 days.',
      ],
      bullets: law.dataSubjectRights,
    },
    {
      id: 'sharing',
      heading: 'Who we share your data with',
      headingAr: 'مع من نشارك بياناتك',
      body: [
        'We share personal data only with parties who need it to deliver the service you asked for:',
      ],
      bullets: [
        'The seller or restaurant fulfilling your order — your name, contact number and delivery address.',
        'The delivery partner assigned to your order — the same details, for the duration of the delivery.',
        `Payment providers licensed in ${c.name}, to take and settle your payment.`,
        'Service providers who host and secure our systems, bound by written processing agreements.',
        'Public authorities, where we are legally required to disclose.',
        'We do not sell personal data.',
      ],
    },
    {
      id: 'transfers',
      heading: 'Where your data is held',
      headingAr: 'أين تُحفظ بياناتك',
      body: law.dataResidencyRequired
        ? [
          `Personal data collected from users in ${c.name} is stored and processed in-region by default.`,
          `Where a transfer outside ${c.name} is unavoidable — for example a global service provider — we transfer `
          + `only under the conditions ${law.law} permits, with contractual safeguards that carry the same level `
          + 'of protection, and we do not transfer at all where doing so would prejudice those protections.',
        ]
        : [
          `Personal data collected from users in ${c.name} may be processed by service providers in other `
          + `countries. Where that happens we rely on the transfer mechanisms ${law.law} permits and put `
          + 'contractual safeguards in place that carry the same level of protection.',
        ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      headingAr: 'مدة الاحتفاظ',
      body: [
        `We keep your account while it is open. Order, payment and invoice records are retained for `
        + `${Math.round(law.recordRetentionMonths / 12)} years to meet commercial and tax record-keeping `
        + `obligations in ${c.name}, after which they are deleted or irreversibly anonymised.`,
        'When you delete your account we remove your profile and contact details immediately, and retain only '
        + 'the transaction records we are required to keep.',
      ],
    },
    {
      id: 'security',
      heading: 'How we protect it',
      headingAr: 'كيف نحميها',
      body: [
        'Data is encrypted in transit and at rest, access is restricted to staff who need it for their role and '
        + 'is logged, and payment card data never touches our systems.',
        `If a breach affects your personal data we notify the ${law.regulator} and the individuals concerned `
        + `within ${law.breachNotificationHours} hours of becoming aware of it, as ${law.law} requires.`,
      ],
    },
    {
      id: 'children',
      heading: 'Children',
      headingAr: 'الأطفال',
      body: [
        `KARTSEEK is not intended for anyone under ${law.minimumConsentAge}. We do not knowingly collect personal `
        + `data from children below that age; where we learn that we have, we delete it.`,
      ],
    },
    {
      id: 'other-rules',
      heading: 'Other rules that apply to us',
      headingAr: 'قواعد أخرى',
      body: [
        `Alongside ${law.law}, our operations in ${c.name} are subject to:`,
      ],
      bullets: law.additionalRegulations,
    },
    {
      id: 'contact',
      heading: 'Contacting us',
      headingAr: 'اتصل بنا',
      body: [
        'Data Protection Officer — privacy@kartseek.com.',
        `If you are not satisfied with our response you can complain to the ${law.regulator}`
        + `${law.regulatorUrl ? ` (${law.regulatorUrl})` : ''}.`,
      ],
    },
  ];
}

/** One-line summary shown in footers and consent banners. */
export function getComplianceSummary(country?: string): string {
  const c = getCountry(country);
  return `Your data is handled under ${c.compliance.law} — ${c.compliance.citation}.`;
}

// ─── Data subject requests ───────────────────────────────────────────────────

export type DataRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'objection' | 'withdraw_consent';

export interface DataRequestOption {
  type: DataRequestType;
  label: string;
  description: string;
}

/**
 * The self-service data requests to expose in a region.
 *
 * Only rights the region's law actually grants are offered — showing a
 * portability button in a regime that has no portability right promises
 * something the platform is not obliged to deliver.
 */
export function getDataRequestOptions(country?: string): DataRequestOption[] {
  const rights = getCompliance(country).dataSubjectRights.join(' ').toLowerCase();
  const options: DataRequestOption[] = [
    { type: 'access', label: 'Get a copy of my data', description: 'A machine-readable export of everything we hold about you.' },
    { type: 'rectification', label: 'Correct my data', description: 'Fix details that are wrong or out of date.' },
    { type: 'erasure', label: 'Delete my data', description: 'Close your account and erase everything we are not legally required to keep.' },
  ];

  if (rights.includes('portab')) {
    options.push({ type: 'portability', label: 'Transfer my data', description: 'Send your data to another provider in a structured format.' });
  }
  if (rights.includes('object')) {
    options.push({ type: 'objection', label: 'Object to processing', description: 'Stop us using your data for marketing or profiling.' });
  }
  if (getCompliance(country).requiresExplicitConsent) {
    options.push({ type: 'withdraw_consent', label: 'Withdraw consent', description: 'Revoke consent for optional processing, with effect from now.' });
  }
  return options;
}

/** Statutory response deadline in days — 30 across the regimes we operate in. */
export const DATA_REQUEST_SLA_DAYS = 30;
