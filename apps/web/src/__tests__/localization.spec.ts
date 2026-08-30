/**
 * Localization core.
 *
 * These guard the rules that are invisible when they break: a Qatari customer
 * shown rupees, offered a language the market has no support for, asked for a
 * postcode that does not exist, or handed a payment method their bank will
 * decline. Each of those still renders a working page — it is just wrong.
 */

import {
  COUNTRIES, COUNTRY_CODES, DEFAULT_COUNTRY, getCountry, getLanguages, countryFromCoords,
  countryFromPhone, isCountryCode,
} from '@/lib/localization/countries';
import { getLegal, getEntityLine } from '@/lib/localization/legal';
import { getTermsSections } from '@/lib/localization/terms';
import { normaliseLanguage, isRtl } from '@/lib/localization/languages';
import { formatMoney, calculateTaxFor, roundToCurrency } from '@/lib/localization/currency';
import {
  formatAddress, validateAddress, validatePhone, toWireAddress, hasPostalCode,
} from '@/lib/localization/address';
import {
  getPaymentMethods, getDefaultPaymentMethod, toWirePaymentMethod, isPaymentMethodAvailable,
} from '@/lib/localization/payments';
import {
  formatDateFor, formatTimeFor, nowInRegion, isWeekendInRegion, estimateArrival,
  getBusinessDaysLabel, getWeekendLabel,
} from '@/lib/localization/datetime';
import {
  getDefaultConsent, getConsentCategories, isConsentValid, buildConsentRecord,
  getPrivacyPolicySections, PRIVACY_POLICY_VERSION,
} from '@/lib/localization/compliance';
import { getSellerComplianceBadges, getSellerRules } from '@/lib/localization/seller';
import { resolveLocaleForCountry } from '@/i18n/config';

describe('country registry', () => {
  it('defaults to Qatar', () => {
    // The platform's home market. An unresolved visitor gets the Qatari
    // storefront, not a generic one.
    expect(DEFAULT_COUNTRY).toBe('QA');
  });

  it('falls back to the default for an unknown code', () => {
    expect(getCountry('ZZ').code).toBe('QA');
    expect(getCountry(undefined).code).toBe('QA');
    expect(isCountryCode('ZZ')).toBe(false);
  });

  it('accepts a lower-case code', () => {
    expect(getCountry('qa').code).toBe('QA');
    expect(isCountryCode('qa')).toBe(true);
  });

  describe('GPS resolution', () => {
    it('resolves Doha to Qatar', () => {
      expect(countryFromCoords(25.2854, 51.5310)).toBe('QA');
    });

    it('prefers Qatar over Saudi Arabia where their boxes overlap', () => {
      // Qatar's bounding box sits inside Saudi Arabia's. Without the
      // smallest-box rule the peninsula resolves to SA and Doha customers get
      // the Saudi storefront — 15% VAT, mada, and Saudi sellers.
      expect(countryFromCoords(25.3, 51.4)).toBe('QA');
    });

    it('resolves Mumbai to India', () => {
      expect(countryFromCoords(19.0760, 72.8777)).toBe('IN');
    });

    it('returns null for a location we do not serve', () => {
      expect(countryFromCoords(48.8566, 2.3522)).toBeNull();   // Paris
      expect(countryFromCoords(0, 0)).toBeNull();
      expect(countryFromCoords(NaN, NaN)).toBeNull();
    });
  });

  describe('phone resolution', () => {
    it('resolves a Qatari number', () => {
      expect(countryFromPhone('+974 3312 3456')).toBe('QA');
    });

    it('does not let a shorter calling code shadow a longer one', () => {
      // +974 must not be swallowed by a prefix match on +9.
      expect(countryFromPhone('+97433123456')).toBe('QA');
      expect(countryFromPhone('+971501234567')).toBe('AE');
    });

    it('returns null without an international prefix', () => {
      expect(countryFromPhone('33123456')).toBeNull();
    });
  });
});

describe('language availability', () => {
  it('offers only Arabic and English in Qatar', () => {
    // The whole "dynamic language section" requirement reduces to this.
    expect(getLanguages('QA').sort()).toEqual(['ar', 'en']);
  });

  it('offers regional languages elsewhere', () => {
    expect(getLanguages('IN')).toEqual(expect.arrayContaining(['en', 'hi', 'ta', 'ml']));
    expect(getLanguages('US')).toEqual(expect.arrayContaining(['en', 'es']));
  });

  it('never offers a regional language in Qatar', () => {
    for (const lang of ['hi', 'ta', 'ml', 'es']) {
      expect(getLanguages('QA')).not.toContain(lang);
    }
  });

  it('resolves a language the market does not serve to its default', () => {
    // A visitor arriving from the Indian storefront with `ta` saved must not
    // keep Tamil in Qatar, where there is no Tamil catalogue or support.
    expect(resolveLocaleForCountry('ta', 'QA')).toBe('en');
    expect(resolveLocaleForCountry('hi', 'QA')).toBe('en');
  });

  it('keeps a language the market does serve', () => {
    expect(resolveLocaleForCountry('ar', 'QA')).toBe('ar');
    expect(resolveLocaleForCountry('ta', 'IN')).toBe('ta');
  });

  it('normalises locale tags down to a language', () => {
    expect(normaliseLanguage('ar-QA')).toBe('ar');
    expect(normaliseLanguage('en_GB')).toBe('en');
    expect(normaliseLanguage('ar-qa')).toBe('ar');
    expect(normaliseLanguage('fr')).toBeNull();
    expect(normaliseLanguage(undefined)).toBeNull();
  });

  it('marks Arabic as right-to-left', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
});

describe('currency', () => {
  it('renders Qatari prices in riyals', () => {
    expect(formatMoney(1234.5, { country: 'QA' })).toBe('QR 1,234.50');
  });

  it('puts the Arabic symbol after the amount', () => {
    expect(formatMoney(1234.5, { country: 'QA', language: 'ar' })).toBe('1,234.50 ر.ق');
  });

  it('uses the ISO code when asked', () => {
    expect(formatMoney(1234.5, { country: 'QA', showCode: true })).toBe('QAR 1,234.50');
  });

  it('groups Indian amounts the Indian way', () => {
    expect(formatMoney(1234567, { country: 'IN' })).toBe('₹ 12,34,567.00');
  });

  it('keeps three minor units for the Gulf dinars', () => {
    // A 2-decimal round drops a fils from every Kuwaiti and Bahraini total.
    expect(formatMoney(1.2345, { country: 'KW', language: 'en' })).toBe('KD 1.235');
    expect(formatMoney(1.2345, { country: 'BH', language: 'en' })).toBe('BD 1.235');
    expect(roundToCurrency(1.2345, 'KW')).toBe(1.235);
    expect(roundToCurrency(1.2345, 'QA')).toBe(1.23);
  });

  it('falls back to the market\'s own default language', () => {
    // Kuwait's default language is Arabic, so an unqualified format renders
    // Arabic — the symbol after the amount, in its Arabic form.
    expect(formatMoney(1.2345, { country: 'KW' })).toBe('1.235 د.ك');
    // Qatar's default is English, so the same call gives the Latin form.
    expect(formatMoney(1.2345, { country: 'QA' })).toBe('QR 1.23');
  });

  it('survives a non-finite amount', () => {
    expect(formatMoney(NaN, { country: 'QA' })).toBe('QR 0.00');
  });
});

describe('tax', () => {
  it('reports that no tax applies in Qatar', () => {
    // Qatar has not implemented the GCC VAT framework. `applies: false` is what
    // makes checkout omit the row rather than print a misleading "VAT 0.00".
    const tax = calculateTaxFor(1000, 'QA');
    expect(tax.applies).toBe(false);
    expect(tax.taxAmount).toBe(0);
    expect(tax.grossAmount).toBe(1000);
  });

  it('extracts inclusive VAT in Saudi Arabia', () => {
    const tax = calculateTaxFor(115, 'SA');
    expect(tax.applies).toBe(true);
    expect(tax.inclusive).toBe(true);
    expect(tax.netAmount).toBeCloseTo(100, 1);
    expect(tax.taxAmount).toBeCloseTo(15, 1);
  });

  it('adds exclusive sales tax in the US', () => {
    const tax = calculateTaxFor(100, 'US');
    expect(tax.inclusive).toBe(false);
    expect(tax.grossAmount).toBeCloseTo(108.88, 1);
  });
});

describe('addresses', () => {
  const qatariAddress = {
    fullName: 'Fatima Al-Kuwari',
    phone: '+97433123456',
    buildingNumber: '25',
    streetNumber: '850',
    zoneNumber: '63',
    area: 'Al Sadd',
    city: 'Doha',
  };

  it('knows Qatar has no postal code', () => {
    // Qatar delivers to building/street/zone, not to a postcode.
    expect(hasPostalCode('QA')).toBe(false);
    expect(hasPostalCode('IN')).toBe(true);
  });

  it('accepts a complete Qatari address with no postcode', () => {
    expect(validateAddress(qatariAddress, 'QA').valid).toBe(true);
  });

  it('rejects a Qatari address missing its zone', () => {
    const { zoneNumber, ...withoutZone } = qatariAddress;
    const result = validateAddress(withoutZone, 'QA');
    expect(result.valid).toBe(false);
    expect(result.errors.zoneNumber).toBeDefined();
  });

  it('never asks a Qatari address for a postal code', () => {
    const fields = COUNTRIES.QA.address.fields.map((f) => f.key);
    expect(fields).not.toContain('postalCode');
    expect(fields).toEqual(expect.arrayContaining(['buildingNumber', 'streetNumber', 'zoneNumber']));
  });

  it('labels bare Qatari numbers so they are navigable', () => {
    // "25 850 63" is three unexplained integers on a delivery label.
    const formatted = formatAddress(qatariAddress, { country: 'QA' });
    expect(formatted).toContain('Building 25');
    expect(formatted).toContain('Street 850');
    expect(formatted).toContain('Zone 63');
    expect(formatted).toContain('Al Sadd, Doha');
    expect(formatted).toContain('Qatar');
  });

  it('does not double-prefix a value the user already labelled', () => {
    const formatted = formatAddress({ ...qatariAddress, zoneNumber: 'Zone 63' }, { country: 'QA' });
    expect(formatted).not.toContain('Zone Zone 63');
  });

  it('carries the zone into the wire envelope rather than dropping it', () => {
    // The order service persists line1/line2/city/state/postalCode. Qatar has
    // no state tier and the zone is what a courier routes on, so it must
    // survive the flattening — losing it leaves a record that looks complete
    // but cannot be delivered to.
    const wire = toWireAddress(qatariAddress, 'QA') as Record<string, string>;
    expect(wire.country).toBe('QA');
    expect(wire.state).toBe('Zone 63');
    expect(wire.line1).toContain('Building 25');
    expect(wire.line2).toContain('Street 850');
    expect(wire.line2).toContain('Zone 63');
    expect(wire.city).toBe('Doha');
    expect(wire.postalCode).toBe('');
  });

  it('preserves the region-native fields alongside the flat envelope', () => {
    const wire = toWireAddress(qatariAddress, 'QA') as Record<string, string>;
    expect(wire.zoneNumber).toBe('63');
    expect(wire.buildingNumber).toBe('25');
    expect(wire.streetNumber).toBe('850');
    expect(wire.area).toBe('Al Sadd');
  });

  it('validates an Indian address on its own rules', () => {
    const indian = {
      fullName: 'A Sharma', phone: '+919876543210',
      line1: '12 MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001',
    };
    expect(validateAddress(indian, 'IN').valid).toBe(true);
    // A PIN cannot start with 0.
    expect(validateAddress({ ...indian, postalCode: '040001' }, 'IN').valid).toBe(false);
  });

  describe('phone validation', () => {
    it('accepts an 8-digit Qatari number', () => {
      expect(validatePhone('33123456', 'QA')).toEqual(
        expect.objectContaining({ valid: true, e164: '+97433123456' }),
      );
    });

    it('rejects an Indian-length number for Qatar', () => {
      expect(validatePhone('9876543210', 'QA').valid).toBe(false);
    });
  });
});

describe('payment methods', () => {
  it('offers Qatar its domestic network first', () => {
    const methods = getPaymentMethods({ country: 'QA' });
    expect(methods[0].type).toBe('debit_national');
    expect(methods[0].isLocal).toBe(true);
    expect(getDefaultPaymentMethod({ country: 'QA' })?.type).toBe('debit_national');
  });

  it('never offers UPI in Qatar', () => {
    // The gateway declines it, so the order dies at the last step.
    expect(isPaymentMethodAvailable('upi', { country: 'QA' })).toBe(false);
    expect(isPaymentMethodAvailable('upi', { country: 'IN' })).toBe(true);
  });

  it('never offers Qatar\'s domestic card in India', () => {
    expect(isPaymentMethodAvailable('debit_national', { country: 'IN' })).toBe(false);
  });

  it('withholds cash on delivery where there is no rider', () => {
    expect(isPaymentMethodAvailable('cod', { country: 'QA', module: 'marketplace' })).toBe(true);
    expect(isPaymentMethodAvailable('cod', { country: 'QA', module: 'doctor' })).toBe(false);
    expect(isPaymentMethodAvailable('cod', { country: 'QA', module: 'taxi' })).toBe(false);
  });

  it('hides the wallet when it is empty', () => {
    expect(isPaymentMethodAvailable('wallet', { country: 'QA', walletBalance: 0 })).toBe(false);
    expect(isPaymentMethodAvailable('wallet', { country: 'QA', walletBalance: 50 })).toBe(true);
  });

  it('drops a method below its minimum order value', () => {
    // Qatari bank transfer starts at QR 200.
    expect(isPaymentMethodAvailable('bank_transfer', { country: 'QA', amount: 100 })).toBe(false);
    expect(isPaymentMethodAvailable('bank_transfer', { country: 'QA', amount: 500 })).toBe(true);
  });

  it('maps domestic schemes onto the settlement channel the backend records', () => {
    expect(toWirePaymentMethod('debit_national')).toBe('CARD');
    expect(toWirePaymentMethod('mada')).toBe('CARD');
    expect(toWirePaymentMethod('knet')).toBe('CARD');
    expect(toWirePaymentMethod('upi')).toBe('UPI');
    expect(toWirePaymentMethod('cod')).toBe('COD');
  });
});

describe('dates and times', () => {
  // A fixed instant: 2026-07-27T21:30:00Z. In Doha (UTC+3) that is already
  // 00:30 on the 28th; in London it is still the 27th.
  const instant = new Date('2026-07-27T21:30:00Z');

  it('renders a timestamp in the region\'s clock, not the browser\'s', () => {
    expect(formatDateFor(instant, { country: 'QA' })).toBe('28/07/2026');
    expect(formatDateFor(instant, { country: 'GB' })).toBe('27/07/2026');
  });

  it('renders Qatari times as UTC+3', () => {
    expect(formatTimeFor(instant, { country: 'QA' })).toMatch(/12:30\s*AM/i);
  });

  it('renders UK times on a 24-hour clock', () => {
    expect(formatTimeFor(instant, { country: 'GB' })).toBe('22:30');
  });

  it('places Qatar on Asia/Qatar', () => {
    expect(COUNTRIES.QA.timezone).toBe('Asia/Qatar');
    expect(COUNTRIES.QA.utcOffsetMinutes).toBe(180);
    expect(COUNTRIES.QA.observesDst).toBe(false);
    expect(nowInRegion('QA').timezone).toBe('Asia/Qatar');
  });

  it('treats Friday and Saturday as the Qatari weekend', () => {
    expect(COUNTRIES.QA.weekend).toEqual([5, 6]);
    expect(COUNTRIES.QA.firstDayOfWeek).toBe(0);
    // Consistent with the registry, whatever day the suite runs on.
    expect(isWeekendInRegion('QA')).toBe(COUNTRIES.QA.weekend.includes(nowInRegion('QA').weekday));
  });

  it('builds a delivery window in the region\'s zone', () => {
    const window = estimateArrival(60, 120, { country: 'QA', placedAt: instant });
    expect(window.timezone).toBe('Asia/Qatar');
    expect(window.from.getTime()).toBe(instant.getTime() + 60 * 60_000);
    expect(window.label).toContain('–');
  });

  it('renders an unparseable date as a dash rather than "Invalid Date"', () => {
    expect(formatDateFor('not-a-date', { country: 'QA' })).toBe('—');
  });
});

describe('compliance', () => {
  it('applies Qatar\'s PDPPL in Qatar', () => {
    const c = COUNTRIES.QA.compliance;
    expect(c.law).toBe('PDPPL');
    expect(c.citation).toContain('Law No. (13) of 2016');
    expect(c.regulator).toContain('NCGAA');
    expect(c.breachNotificationHours).toBe(72);
    expect(c.requiresExplicitConsent).toBe(true);
  });

  it('names the region\'s own law in the policy text', () => {
    const qatari = getPrivacyPolicySections('QA').flatMap((s) => [...s.body, ...(s.bullets ?? [])]).join(' ');
    expect(qatari).toContain('Law No. (13) of 2016');
    expect(qatari).toContain('Qatar');
    // Never another market's regime.
    expect(qatari).not.toContain('Digital Personal Data Protection Act');

    const indian = getPrivacyPolicySections('IN').flatMap((s) => s.body).join(' ');
    expect(indian).toContain('Digital Personal Data Protection Act, 2023');
  });

  it('starts every optional category switched off in Qatar', () => {
    // Under the PDPPL consent must be affirmative — a pre-ticked analytics box
    // is not consent, and the record it stores would not demonstrate one.
    const consent = getDefaultConsent('QA');
    expect(consent.essential).toBe(true);
    expect(consent.analytics).toBe(false);
    expect(consent.marketing).toBe(false);
    expect(consent.personalisation).toBe(false);
  });

  it('marks the essential category as undeclinable', () => {
    const essential = getConsentCategories('QA').find((c) => c.id === 'essential');
    expect(essential?.required).toBe(true);
    expect(essential?.optIn).toBe(false);
  });

  it('does not carry consent across markets', () => {
    // A decision made under one regime cannot stand in for another.
    const record = buildConsentRecord(getDefaultConsent('QA'), 'QA');
    expect(isConsentValid(record, 'QA')).toBe(true);
    expect(isConsentValid(record, 'IN')).toBe(false);
  });

  it('re-asks when the policy version moves on', () => {
    const stale = { ...buildConsentRecord(getDefaultConsent('QA'), 'QA'), policyVersion: '2020.01' };
    expect(isConsentValid(stale, 'QA')).toBe(false);
    expect(PRIVACY_POLICY_VERSION).toBeTruthy();
  });

  it('treats a missing record as no consent', () => {
    expect(isConsentValid(null, 'QA')).toBe(false);
  });
});

describe('legal terms', () => {
  /** All prose in a market's Terms, flattened for substring assertions. */
  const termsText = (code: string) =>
    getTermsSections(code).flatMap((s) => [s.heading, ...s.body, ...(s.bullets ?? [])]).join(' ');

  it('binds a Qatari customer to the Qatari entity under Qatari law', () => {
    const qa = getLegal('QA');
    expect(qa.entityName).toBe('KARTSEEK Qatar W.L.L.');
    expect(qa.governingLaw).toContain('State of Qatar');
    expect(qa.courts).toContain('Qatar');
    expect(qa.consumerLaw).toContain('Law No. (8) of 2008');
  });

  it('binds an Indian customer to the Indian entity under Indian law', () => {
    const ind = getLegal('IN');
    expect(ind.entityName).toBe('KartSeek Technologies Pvt. Ltd.');
    expect(ind.governingLaw).toContain('India');
    expect(ind.courts).toContain('Bangalore');
    expect(ind.consumerLaw).toContain('Consumer Protection Act, 2019');
  });

  it('never states another market\'s law in the Qatari terms', () => {
    // The single global Terms page told a Doha customer their contract was
    // governed by the laws of India and heard in Bangalore — untrue, and a
    // forum they cannot actually bring a claim in.
    const qa = termsText('QA');
    expect(qa).toContain('State of Qatar');
    expect(qa).not.toContain('laws of India');
    expect(qa).not.toContain('Bangalore');
    expect(qa).not.toContain('Pvt. Ltd.');
  });

  it('never states another market\'s law in the Indian terms', () => {
    const ind = termsText('IN');
    expect(ind).toContain('laws of India');
    expect(ind).not.toContain('State of Qatar');
    expect(ind).not.toContain('W.L.L.');
  });

  it('quotes each market\'s own currency and payment methods', () => {
    const qa = termsText('QA');
    expect(qa).toContain('QAR');
    expect(qa).toContain('Himyan');
    expect(qa).not.toContain('UPI');

    const ind = termsText('IN');
    expect(ind).toContain('INR');
    expect(ind).toContain('UPI');
    expect(ind).not.toContain('Himyan');
  });

  it('states the correct tax position per market', () => {
    // Qatar levies no consumption tax; saying prices "include VAT" would be
    // a false statement about what the customer is paying.
    expect(termsText('QA')).toContain('does not levy a consumption tax');
    expect(termsText('IN')).toContain('GST');
    expect(termsText('SA')).toContain('15%');
  });

  it('describes the address system the market actually uses', () => {
    expect(termsText('QA')).toContain('Building / Street / Zone');
    expect(termsText('IN')).toContain('postal code');
  });

  it('cross-references the market\'s own data-protection law', () => {
    expect(termsText('QA')).toContain('Law No. (13) of 2016');
    expect(termsText('IN')).toContain('Digital Personal Data Protection Act, 2023');
  });

  it('only claims a statutory grievance officer where one is required', () => {
    // India's Consumer Protection (E-Commerce) Rules require the appointment;
    // Qatar has no equivalent, so no such claim should be made there.
    expect(getLegal('IN').requiresGrievanceOfficer).toBe(true);
    expect(getLegal('QA').requiresGrievanceOfficer).toBe(false);
  });

  it('gives every market a support line in its own dialling code', () => {
    for (const code of COUNTRY_CODES) {
      const legal = getLegal(code);
      expect(legal.support.phoneE164.startsWith(COUNTRIES[code].callingCode)).toBe(true);
    }
  });

  it('keeps the footer entity and the terms entity in step', () => {
    // They read the same record, so the footer cannot name a different company
    // from the one the terms bind the customer to.
    for (const code of ['QA', 'IN'] as const) {
      expect(getEntityLine(code).name).toBe(getLegal(code).entityName);
      expect(termsText(code)).toContain(getLegal(code).entityName);
    }
  });
});

describe('working week', () => {
  it('runs Sunday to Thursday in Qatar', () => {
    // Printing "Mon – Fri" in Doha is simply the wrong week.
    expect(getBusinessDaysLabel('QA')).toBe('Sunday – Thursday');
    expect(getWeekendLabel('QA')).toBe('Friday – Saturday');
  });

  it('runs Monday to Friday in India and the UK', () => {
    expect(getBusinessDaysLabel('IN')).toBe('Monday – Friday');
    expect(getBusinessDaysLabel('GB')).toBe('Monday – Friday');
  });
});

describe('seller portal rules', () => {
  it('asks Qatari sellers for Qatari registrations', () => {
    const badges = getSellerComplianceBadges('QA');
    expect(badges).toEqual(expect.arrayContaining(['CR', 'QID']));
    expect(badges).not.toContain('GST');
    expect(badges).not.toContain('PAN');
  });

  it('asks Indian sellers for Indian registrations', () => {
    expect(getSellerComplianceBadges('IN')).toEqual(expect.arrayContaining(['GST', 'PAN']));
  });

  it('offers no tax filing where no consumption tax applies', () => {
    // Qatar levies no VAT, so there is no periodic return — the portal omits
    // the section rather than linking to a page that cannot apply.
    expect(getSellerRules('QA').taxFilingLabel).toBeNull();
    expect(getSellerRules('IN').taxFilingLabel).toBe('GST Filing');
  });

  it('uses each market\'s own bank identifier', () => {
    expect(getSellerRules('QA').bankIdentifierLabel).toBe('IBAN');
    expect(getSellerRules('IN').bankIdentifierLabel).toBe('IFSC Code');
    expect(getSellerRules('GB').bankIdentifierLabel).toBe('Sort Code');
  });

  it('settles Qatari payouts by bank transfer, not UPI', () => {
    const rails = getSellerRules('QA').payoutRails.map((r) => r.key);
    expect(rails).toContain('qatar_bank_transfer');
    expect(rails).not.toContain('upi');
  });
});
