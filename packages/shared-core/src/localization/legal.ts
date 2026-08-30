/// KARTSEEK — Region-aware legal and corporate facts
///
/// Which KARTSEEK entity a customer contracts with, whose law governs that
/// contract, and which court or authority hears a dispute all change with the
/// market. A single global Terms page cannot state any of them correctly: it
/// told a Doha customer their contract was governed by the laws of India and
/// that disputes went to the courts of Bangalore — neither of which is true,
/// and neither of which they could act on.
///
/// The registration numbers and registered addresses below are placeholders
/// outside India. Replace them with the real filings before launching a market;
/// they are the details a customer relies on to identify who they are dealing
/// with.

import { getCountry } from './countries';
import type { CountryCode } from './types';

export interface SupportContact {
  /** Local support line, in national format. */
  phone: string;
  /** E.164 form for `tel:` links. */
  phoneE164: string;
  /** Opening hours in the region's own clock, e.g. "8 AM – 10 PM". */
  hours: string;
  email: string;
}

export interface LegalSpec {
  /** The contracting entity in this market. */
  entityName: string;
  /** Label for its company registration, e.g. "CR No." or "CIN". */
  registrationLabel: string;
  /** Placeholder outside India — replace before launch. */
  registrationNumber: string;
  /** Registered office, already formatted for display. */
  registeredAddress: string[];

  /** Law governing the customer contract. */
  governingLaw: string;
  /** Court with jurisdiction over disputes. */
  courts: string;
  /** How a dispute is escalated before it reaches a court. */
  disputeResolution: string;

  /** Statute protecting consumers in this market. */
  consumerLaw: string;
  /** Authority a customer can complain to. */
  consumerAuthority: string;
  /** Public consumer helpline, if the market has one. */
  consumerHelpline?: string;

  /** Statute governing online contracts and e-signatures. */
  ecommerceLaw?: string;

  /** Whether local rules require a named grievance/complaints officer. */
  requiresGrievanceOfficer: boolean;
  /** Statutory window to acknowledge a grievance, in days. */
  grievanceAcknowledgementDays: number;
  /** Statutory window to resolve a grievance, in days. */
  grievanceResolutionDays: number;

  support: SupportContact;
}

const LEGAL: Record<CountryCode, LegalSpec> = {
  QA: {
    entityName: 'KARTSEEK Qatar W.L.L.',
    registrationLabel: 'CR No.',
    registrationNumber: '000000',
    registeredAddress: ['Building 25, Street 850, Zone 63', 'Al Sadd, Doha', 'State of Qatar'],

    governingLaw: 'the laws of the State of Qatar',
    courts: 'the competent courts of the State of Qatar in Doha',
    disputeResolution:
      'We ask you to raise the matter with our support team first. If it is not resolved, you may file a '
      + 'complaint with the Consumer Protection Department of the Ministry of Commerce and Industry before '
      + 'commencing proceedings.',

    consumerLaw: 'Law No. (8) of 2008 on Consumer Protection',
    consumerAuthority: 'Consumer Protection Department, Ministry of Commerce and Industry (MOCI)',
    consumerHelpline: '16001',
    ecommerceLaw: 'Law No. (16) of 2010 on Electronic Commerce and Transactions',

    // Qatar has no statutory grievance-officer regime, but the same escalation
    // path is offered so a complaint has a named route either way.
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 15,

    support: {
      phone: '800 5555',
      phoneE164: '+9748005555',
      hours: '8 AM – 10 PM (AST), Sunday to Thursday',
      email: 'support.qa@kartseek.com',
    },
  },

  IN: {
    entityName: 'KartSeek Technologies Pvt. Ltd.',
    registrationLabel: 'CIN',
    registrationNumber: 'U72900MH2024PTC123456',
    registeredAddress: ['123, Innovation Tower, 5th Floor', 'Koramangala, Bangalore – 560034', 'Karnataka, India'],

    governingLaw: 'the laws of India',
    courts: 'the courts of Bangalore, Karnataka',
    disputeResolution:
      'We ask you to raise the matter with our Grievance Officer first. If it is not resolved, disputes shall be '
      + 'attempted through mediation before being submitted to the courts named above.',

    consumerLaw: 'the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020',
    consumerAuthority: 'National Consumer Disputes Redressal Commission',
    consumerHelpline: '1915',
    ecommerceLaw: 'the Information Technology Act, 2000',

    // Required by the Consumer Protection (E-Commerce) Rules, 2020.
    requiresGrievanceOfficer: true,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 30,

    support: {
      phone: '1800-123-456',
      phoneE164: '+911800123456',
      hours: '7 AM – 11 PM (IST), all days',
      email: 'support.in@kartseek.com',
    },
  },

  AE: {
    entityName: 'KARTSEEK Middle East FZ-LLC',
    registrationLabel: 'Trade Licence No.',
    registrationNumber: '000000',
    registeredAddress: ['Dubai Internet City', 'Dubai', 'United Arab Emirates'],
    governingLaw: 'the federal laws of the United Arab Emirates',
    courts: 'the competent courts of Dubai',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may file a complaint with the Ministry '
      + 'of Economy\'s Consumer Protection Department before commencing proceedings.',
    consumerLaw: 'Federal Law No. 15 of 2020 on Consumer Protection',
    consumerAuthority: 'Ministry of Economy — Consumer Protection Department',
    consumerHelpline: '600 522225',
    ecommerceLaw: 'Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 15,
    support: { phone: '800 5555', phoneE164: '+9718005555', hours: '8 AM – 10 PM (GST), all days', email: 'support.ae@kartseek.com' },
  },

  SA: {
    entityName: 'KARTSEEK Arabia Ltd.',
    registrationLabel: 'CR No.',
    registrationNumber: '0000000000',
    registeredAddress: ['Al Olaya District', 'Riyadh', 'Kingdom of Saudi Arabia'],
    governingLaw: 'the laws of the Kingdom of Saudi Arabia',
    courts: 'the competent courts of Riyadh',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may file a complaint with the Ministry '
      + 'of Commerce before commencing proceedings.',
    consumerLaw: 'the E-Commerce Law issued by Royal Decree M/126 of 2019',
    consumerAuthority: 'Ministry of Commerce',
    consumerHelpline: '1900',
    ecommerceLaw: 'the Electronic Transactions Law',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 15,
    support: { phone: '800 5555', phoneE164: '+9668005555', hours: '8 AM – 10 PM (AST), Sunday to Thursday', email: 'support.sa@kartseek.com' },
  },

  BH: {
    entityName: 'KARTSEEK Bahrain W.L.L.',
    registrationLabel: 'CR No.',
    registrationNumber: '000000',
    registeredAddress: ['Seef District', 'Manama', 'Kingdom of Bahrain'],
    governingLaw: 'the laws of the Kingdom of Bahrain',
    courts: 'the competent courts of Bahrain',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may file a complaint with the Consumer '
      + 'Protection Directorate before commencing proceedings.',
    consumerLaw: 'Law No. 35 of 2012 on Consumer Protection',
    consumerAuthority: 'Consumer Protection Directorate, Ministry of Industry and Commerce',
    consumerHelpline: '80008001',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 15,
    support: { phone: '8000 5555', phoneE164: '+97380005555', hours: '8 AM – 10 PM (AST), Sunday to Thursday', email: 'support.bh@kartseek.com' },
  },

  KW: {
    entityName: 'KARTSEEK Kuwait W.L.L.',
    registrationLabel: 'Licence No.',
    registrationNumber: '000000',
    registeredAddress: ['Sharq District', 'Kuwait City', 'State of Kuwait'],
    governingLaw: 'the laws of the State of Kuwait',
    courts: 'the competent courts of Kuwait',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may file a complaint with the Ministry '
      + 'of Commerce and Industry before commencing proceedings.',
    consumerLaw: 'Law No. 39 of 2014 on Consumer Protection',
    consumerAuthority: 'Ministry of Commerce and Industry',
    consumerHelpline: '135',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 15,
    support: { phone: '1800 555', phoneE164: '+9651800555', hours: '8 AM – 10 PM (AST), Sunday to Thursday', email: 'support.kw@kartseek.com' },
  },

  OM: {
    entityName: 'KARTSEEK Oman LLC',
    registrationLabel: 'CR No.',
    registrationNumber: '0000000',
    registeredAddress: ['Ruwi', 'Muscat', 'Sultanate of Oman'],
    governingLaw: 'the laws of the Sultanate of Oman',
    courts: 'the competent courts of Muscat',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may file a complaint with the Consumer '
      + 'Protection Authority before commencing proceedings.',
    consumerLaw: 'the Consumer Protection Law issued by Royal Decree 66/2014',
    consumerAuthority: 'Consumer Protection Authority',
    consumerHelpline: '80079009',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 15,
    support: { phone: '800 5555', phoneE164: '+9688005555', hours: '8 AM – 10 PM (GST), Sunday to Thursday', email: 'support.om@kartseek.com' },
  },

  GB: {
    entityName: 'KARTSEEK UK Ltd.',
    registrationLabel: 'Company No.',
    registrationNumber: '00000000',
    registeredAddress: ['1 Finsbury Avenue', 'London EC2M 2PF', 'United Kingdom'],
    governingLaw: 'the laws of England and Wales',
    courts: 'the courts of England and Wales',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may refer the dispute to an approved '
      + 'alternative dispute resolution provider, or bring a claim in the courts named above.',
    consumerLaw: 'the Consumer Rights Act 2015 and the Consumer Contracts Regulations 2013',
    consumerAuthority: 'Competition and Markets Authority / Citizens Advice',
    consumerHelpline: '0808 223 1133',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 14,
    support: { phone: '0800 555 555', phoneE164: '+448005555555', hours: '8 AM – 8 PM (UK time), all days', email: 'support.uk@kartseek.com' },
  },

  US: {
    entityName: 'KARTSEEK USA Inc.',
    registrationLabel: 'EIN',
    registrationNumber: '00-0000000',
    registeredAddress: ['1209 Orange Street', 'Wilmington, DE 19801', 'United States'],
    governingLaw: 'the laws of the State of Delaware, without regard to its conflict of law provisions',
    courts: 'the state and federal courts located in Delaware',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, disputes are resolved by binding individual '
      + 'arbitration, except where you opt out or bring a claim in small claims court.',
    consumerLaw: 'applicable federal and state consumer protection law',
    consumerAuthority: 'Federal Trade Commission and your state attorney general',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 30,
    support: { phone: '1-800-555-0100', phoneE164: '+18005550100', hours: '8 AM – 8 PM (ET), all days', email: 'support.us@kartseek.com' },
  },

  SG: {
    entityName: 'KARTSEEK Singapore Pte. Ltd.',
    registrationLabel: 'UEN',
    registrationNumber: '000000000A',
    registeredAddress: ['1 Raffles Place', 'Singapore 048616', 'Singapore'],
    governingLaw: 'the laws of Singapore',
    courts: 'the courts of Singapore',
    disputeResolution:
      'Raise the matter with our support team first. If unresolved, you may refer the dispute to the Consumers '
      + 'Association of Singapore before commencing proceedings.',
    consumerLaw: 'the Consumer Protection (Fair Trading) Act',
    consumerAuthority: 'Consumers Association of Singapore (CASE)',
    consumerHelpline: '6100 0315',
    requiresGrievanceOfficer: false,
    grievanceAcknowledgementDays: 2,
    grievanceResolutionDays: 14,
    support: { phone: '800 555 5555', phoneE164: '+658005555555', hours: '9 AM – 9 PM (SGT), all days', email: 'support.sg@kartseek.com' },
  },
};

export function getLegal(country?: string): LegalSpec {
  return LEGAL[getCountry(country).code];
}

/** Entity name plus its local company registration, for footers and invoices. */
export function getEntityLine(country?: string): { name: string; registration: string } {
  const legal = getLegal(country);
  return {
    name: legal.entityName,
    registration: `${legal.registrationLabel}: ${legal.registrationNumber}`,
  };
}
