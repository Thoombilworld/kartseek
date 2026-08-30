/// KARTSEEK — Region-aware Terms of Service content
///
/// Assembled the same way as the privacy policy: one structure, with the
/// market's own entity, governing law, court, tax treatment, payment methods
/// and consumer-protection regime substituted in. A shopper in Doha reads that
/// their contract is with KARTSEEK Qatar W.L.L. under Qatari law; a shopper in
/// Delhi reads KartSeek Technologies Pvt. Ltd. under Indian law.
///
/// This is drafted prose, not legal advice — have counsel in each market review
/// it before launch.

import { getCountry } from './countries';
import { getLegal } from './legal';
import { getCompliance } from './compliance';
import type { PolicySection } from './compliance';

/** Return window in days, by market. */
const RETURN_WINDOW_DAYS: Record<string, string> = {
  QA: '7–14', IN: '7–30', AE: '7–14', SA: '7–14', BH: '7–14',
  KW: '7–14', OM: '7–14', GB: '14–30', US: '30', SG: '14–30',
};

/**
 * The Terms of Service for a market.
 *
 * @example getTermsSections('QA')  // Qatari law, MOCI, no VAT, Himyan/NAPS
 */
export function getTermsSections(country?: string): PolicySection[] {
  const c = getCountry(country);
  const legal = getLegal(c.code);
  const compliance = getCompliance(c.code);

  const paymentList = c.payments.map((p) => p.label).join(', ');
  const returnWindow = RETURN_WINDOW_DAYS[c.code] ?? '7–14';

  return [
    {
      id: 'acceptance',
      heading: '1. Acceptance of Terms',
      body: [
        `By accessing or using KARTSEEK's marketplace platform, mobile applications or any related services `
        + `(together, the "Services") in ${c.name}, you agree to be bound by these Terms of Service ("Terms"). `
        + `If you do not agree, you may not use the Services.`,
        `These Terms form a contract between you and ${legal.entityName} (${legal.registrationLabel} `
        + `${legal.registrationNumber}), the KARTSEEK entity operating in ${c.name}. We may modify these Terms; `
        + `continued use after a change constitutes acceptance of the revised Terms.`,
      ],
    },
    {
      id: 'eligibility',
      heading: '2. Account Registration & Eligibility',
      body: [
        `You must be at least ${compliance.minimumConsentAge} years old to hold a KARTSEEK account in ${c.name}. `
        + `To use certain features you must register, and you agree to:`,
      ],
      bullets: [
        'Provide accurate, current and complete information at registration and keep it up to date.',
        'Keep your password confidential and not share your account credentials.',
        'Notify us immediately of any unauthorised access to your account.',
        'Accept responsibility for activity carried out under your account.',
      ],
    },
    {
      id: 'orders-payments',
      heading: '3. Orders & Payments',
      body: [
        `All prices are shown in ${c.currency.code} (${c.currency.symbol}). `
        + (c.tax.rate === 0
          ? `${c.name} does not levy a consumption tax on these goods, so the price you see is the price you pay.`
          : `Displayed prices ${c.tax.inclusive ? 'include' : 'exclude'} ${c.tax.name} at ${c.tax.rate}%`
            + `${c.tax.inclusive ? '' : ', which is added at checkout'}.`),
        `Placing an order is an offer to purchase; the contract forms when we confirm acceptance. We accept: `
        + `${paymentList}.`,
        `We may refuse or cancel an order — including for suspected fraud, pricing errors or unavailability — in `
        + `which case any payment taken is refunded in full.`,
      ],
    },
    {
      id: 'delivery',
      heading: '4. Shipping & Delivery',
      body: [
        `Delivery estimates are shown in ${c.timezone} local time and may vary with your location, product `
        + `availability and the delivery method chosen. `
        + (c.address.hasPostalCode
          ? 'Serviceability depends on your postal code.'
          : `In ${c.name}, delivery is routed by the national Building / Street / Zone numbering, so please make `
            + 'sure all three are correct on your address.'),
        'We are not liable for delays caused by third-party logistics providers, natural events or other '
        + 'circumstances beyond our reasonable control. Risk passes to you on delivery. Please inspect your order '
        + 'on arrival and report damage or discrepancy within 24 hours.',
      ],
    },
    {
      id: 'returns',
      heading: '5. Returns & Refunds',
      body: [
        `Products may be returned within ${returnWindow} days of delivery depending on category, provided they are `
        + 'unused, in original packaging and with tags intact. Perishables, intimate apparel and customised items '
        + 'are not eligible.',
        `Refunds are issued to the original payment method, to your KARTSEEK Wallet, or by bank transfer, normally `
        + `within 5–10 business days. Nothing here limits your statutory rights under ${legal.consumerLaw}.`,
      ],
    },
    {
      id: 'sellers',
      heading: '6. Marketplace Sellers',
      body: [
        `Third-party sellers on KARTSEEK are independent businesses responsible for their listings, pricing, `
        + `fulfilment and compliance with ${c.name} law. KARTSEEK acts as a marketplace facilitator and is not the `
        + 'seller of record for third-party products.',
        'Sellers accept our Seller Code of Conduct, which prohibits counterfeit goods, misleading descriptions and '
        + 'unfair pricing. We may remove listings and suspend sellers who breach it.',
      ],
    },
    {
      id: 'intellectual-property',
      heading: '7. Intellectual Property',
      body: [
        `All content on KARTSEEK — logos, designs, text, graphics, software and interface — belongs to `
        + `${legal.entityName} or its licensors and is protected by copyright, trade mark and related laws. You may `
        + 'not reproduce, distribute or modify it without prior written consent.',
        'Content you submit (reviews, photographs, questions) grants KARTSEEK a non-exclusive, royalty-free licence '
        + 'to display and distribute it on the platform.',
      ],
    },
    {
      id: 'prohibited',
      heading: '8. Prohibited Activities',
      body: ['You agree not to:'],
      bullets: [
        'Use the Services for any unlawful purpose.',
        'Submit false or misleading information.',
        'Interfere with or disrupt the Services.',
        'Scrape, crawl or harvest data from the platform.',
        'Impersonate any person or entity.',
        'Upload malicious code.',
        'Manipulate prices or engage in shill bidding.',
        'Circumvent any security measure.',
      ],
    },
    {
      id: 'liability',
      heading: '9. Limitation of Liability',
      body: [
        'To the maximum extent permitted by law, KARTSEEK is not liable for indirect, incidental, special, '
        + 'consequential or punitive damages arising from your use of the Services. Our total liability will not '
        + 'exceed the amount you paid for the product or service giving rise to the claim.',
        `Nothing in these Terms excludes or limits liability that cannot lawfully be excluded under `
        + `${legal.consumerLaw}.`,
      ],
    },
    {
      id: 'privacy',
      heading: '10. Privacy & Data Protection',
      body: [
        `Personal data you provide is handled under ${compliance.citation}, supervised by the `
        + `${compliance.regulator}. Our Privacy Policy explains what we collect, why, and the rights you can `
        + 'exercise over it.',
        ...(compliance.dataResidencyRequired
          ? [`Personal data collected in ${c.name} is stored and processed in-region by default.`]
          : []),
      ],
    },
    {
      id: 'governing-law',
      heading: '11. Governing Law & Dispute Resolution',
      body: [
        `These Terms and any dispute arising from them are governed by ${legal.governingLaw}, and are subject to `
        + `the exclusive jurisdiction of ${legal.courts}.`,
        legal.disputeResolution,
        `You may also contact the ${legal.consumerAuthority}`
        + `${legal.consumerHelpline ? ` (consumer helpline ${legal.consumerHelpline})` : ''}.`,
        ...(legal.ecommerceLaw
          ? [`Online contracts formed through the Services are recognised under ${legal.ecommerceLaw}.`]
          : []),
      ],
    },
    {
      id: 'contact',
      heading: '12. Contact',
      body: [
        `${legal.entityName} — ${legal.registrationLabel} ${legal.registrationNumber}`,
        legal.registeredAddress.join(', '),
        `Support: ${legal.support.email} · ${legal.support.phone} · ${legal.support.hours}`,
      ],
    },
  ];
}
