/// KARTSEEK — Region-aware corporate content
///
/// Corporate pages need a different treatment from legal ones, and conflating
/// the two produces nonsense either way.
///
///   * A **positioning claim** — "India's next-generation super-app" — is a
///     statement about the reader's market. Shown in Doha it is simply wrong,
///     so it follows the active region.
///   * A **job opening** and a **press release** are facts about a place and a
///     date. A Bangalore role is in Bangalore and pays in rupees no matter who
///     reads the page, and a partnership announced in April happened. These are
///     tagged and ordered by relevance, never rewritten.
///   * **Company history** is global and stays as written.

import { getCountry } from './countries';
import type { CountryCode } from './types';

// ─── Market positioning ──────────────────────────────────────────────────────

export interface MarketPositioning {
  /** One-line description of the platform, from this market's point of view. */
  tagline: string;
  /** Longer positioning sentence for hero sections. */
  summary: string;
  /** Whether KARTSEEK has a physical office and hires here. */
  hasOffice: boolean;
  /** Cities with an office in this market. */
  offices: string[];
  /** Indicative addressable market, already formatted. Investor-facing. */
  marketOpportunity?: string;
}

const POSITIONING: Record<CountryCode, MarketPositioning> = {
  QA: {
    tagline: 'Qatar\'s next-generation super-app',
    summary: 'Connecting shoppers across Qatar with trusted local sellers across 8 verticals.',
    hasOffice: true,
    offices: ['Doha'],
    marketOpportunity: 'Qatar\'s digital commerce market projected at $3.7B by 2030',
  },
  IN: {
    tagline: 'India\'s next-generation super-app',
    summary: 'Connecting 100M+ shoppers with trusted sellers across 8 verticals.',
    hasOffice: true,
    offices: ['Bangalore', 'Delhi NCR'],
    marketOpportunity: 'India\'s digital commerce TAM projected at $400B by 2030',
  },
  AE: {
    tagline: 'The UAE\'s next-generation super-app',
    summary: 'Connecting shoppers across the Emirates with trusted sellers across 8 verticals.',
    hasOffice: true,
    offices: ['Dubai'],
    marketOpportunity: 'UAE digital commerce projected at $17B by 2030',
  },
  SA: {
    tagline: 'Saudi Arabia\'s next-generation super-app',
    summary: 'Connecting shoppers across the Kingdom with trusted sellers across 8 verticals.',
    hasOffice: true,
    offices: ['Riyadh'],
    marketOpportunity: 'Saudi digital commerce projected at $30B by 2030',
  },
  BH: {
    tagline: 'Bahrain\'s next-generation super-app',
    summary: 'Connecting shoppers across Bahrain with trusted local sellers across 8 verticals.',
    hasOffice: false,
    offices: [],
  },
  KW: {
    tagline: 'Kuwait\'s next-generation super-app',
    summary: 'Connecting shoppers across Kuwait with trusted local sellers across 8 verticals.',
    hasOffice: false,
    offices: [],
  },
  OM: {
    tagline: 'Oman\'s next-generation super-app',
    summary: 'Connecting shoppers across Oman with trusted local sellers across 8 verticals.',
    hasOffice: false,
    offices: [],
  },
  GB: {
    tagline: 'A next-generation super-app for the UK',
    summary: 'Connecting UK shoppers with trusted sellers across 8 verticals.',
    hasOffice: true,
    offices: ['London'],
    marketOpportunity: 'UK digital commerce projected at $285B by 2030',
  },
  US: {
    tagline: 'A next-generation super-app for the US',
    summary: 'Connecting US shoppers with trusted sellers across 8 verticals.',
    hasOffice: false,
    offices: [],
    marketOpportunity: 'US digital commerce projected at $1.9T by 2030',
  },
  SG: {
    tagline: 'Singapore\'s next-generation super-app',
    summary: 'Connecting Singapore shoppers with trusted sellers across 8 verticals.',
    hasOffice: false,
    offices: [],
  },
};

export function getPositioning(country?: string): MarketPositioning {
  return POSITIONING[getCountry(country).code];
}

// ─── Careers ─────────────────────────────────────────────────────────────────

export interface JobOpening {
  id: string;
  title: string;
  team: string;
  /** City the role is based in. */
  location: string;
  /**
   * Market the role sits in. Roles are ordered so the reader's market comes
   * first — not relabelled, because a Bangalore role is in Bangalore however it
   * is read.
   */
  country: CountryCode;
  type: string;
  tags: string[];
  remote?: boolean;
}

export const JOB_OPENINGS: JobOpening[] = [
  // ── Qatar ──
  { id: 'qa-ops-lead', title: 'Marketplace Operations Lead', team: 'Operations', location: 'Doha', country: 'QA', type: 'Full-time', tags: ['Marketplace', 'Seller Ops', 'Arabic'] },
  { id: 'qa-seller-growth', title: 'Seller Growth Manager', team: 'Commercial', location: 'Doha', country: 'QA', type: 'Full-time', tags: ['Business Development', 'Arabic', 'Retail'] },
  { id: 'qa-cx', title: 'Customer Experience Specialist', team: 'Operations', location: 'Doha', country: 'QA', type: 'Full-time', tags: ['CX', 'Arabic', 'English'] },

  // ── India ──
  { id: 'in-fullstack', title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['React', 'Node.js', 'TypeScript'] },
  { id: 'in-backend', title: 'Staff Backend Engineer', team: 'Engineering', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['NestJS', 'PostgreSQL', 'Kafka'] },
  { id: 'in-mobile', title: 'Mobile Engineer (React Native)', team: 'Engineering', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['React Native', 'iOS', 'Android'], remote: true },
  { id: 'in-designer', title: 'Senior Product Designer', team: 'Design', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['Figma', 'Design Systems', 'UX Research'] },
  { id: 'in-pm', title: 'Product Manager — Marketplace', team: 'Product', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['E-commerce', 'Analytics', 'Strategy'] },
  { id: 'in-data', title: 'Data Scientist', team: 'Data', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['Python', 'ML', 'Recommendation Systems'], remote: true },
  { id: 'in-sre', title: 'DevOps / SRE Engineer', team: 'Infrastructure', location: 'Bangalore', country: 'IN', type: 'Full-time', tags: ['Kubernetes', 'AWS', 'Terraform'] },
  { id: 'in-cs', title: 'Customer Success Lead', team: 'Operations', location: 'Delhi NCR', country: 'IN', type: 'Full-time', tags: ['CX', 'Analytics', 'Team Management'] },

  // ── UAE ──
  { id: 'ae-growth', title: 'Regional Growth Lead — Gulf', team: 'Commercial', location: 'Dubai', country: 'AE', type: 'Full-time', tags: ['Growth', 'GCC', 'Partnerships'] },

  // ── UK ──
  { id: 'gb-compliance', title: 'Compliance Manager — EMEA', team: 'Legal', location: 'London', country: 'GB', type: 'Full-time', tags: ['Compliance', 'GDPR', 'Payments'] },
];

/** Openings in a market, and everything else, kept separate for display. */
export function getOpenings(country?: string): { local: JobOpening[]; elsewhere: JobOpening[] } {
  const code = getCountry(country).code;
  return {
    local: JOB_OPENINGS.filter((job) => job.country === code),
    elsewhere: JOB_OPENINGS.filter((job) => job.country !== code),
  };
}

/**
 * Annual learning allowance for a market, in that market's currency.
 *
 * Quoted against the *employment* market, never the reader's — the benefit
 * attaches to the role. Markets where we do not hire have no entry.
 */
export const LEARNING_BUDGET: Partial<Record<CountryCode, number>> = {
  QA: 4000, IN: 100_000, AE: 4000, SA: 4000, GB: 1500, US: 2000,
};

// ─── Press ───────────────────────────────────────────────────────────────────

export interface PressRelease {
  id: string;
  date: string;
  title: string;
  desc: string;
  /**
   * Markets the announcement is relevant to. Empty means company-wide.
   *
   * Releases are never rewritten per reader — they are dated statements of fact.
   * This only decides which surface first.
   */
  regions?: CountryCode[];
}

export const PRESS_RELEASES: PressRelease[] = [
  { id: 'super-app', date: 'Jul 2026', title: 'KartSeek Launches 8-Vertical Super-App Platform', desc: 'Unified marketplace, grocery, restaurant, pharmacy, hotel, taxi, and healthcare services under one platform.' },
  { id: 'qatar-launch', date: 'Jul 2026', title: 'KartSeek Opens Doha Operations', desc: 'Local seller onboarding begins across all Qatari municipalities, with Arabic and English support from day one.', regions: ['QA'] },
  { id: 'seller-milestone', date: 'Jun 2026', title: 'KartSeek Crosses 50,000 Seller Milestone', desc: 'Growing seller ecosystem now spans 500+ cities across India, the Gulf and beyond.' },
  { id: 'series-b', date: 'May 2026', title: 'KartSeek Raises Series B Funding', desc: 'Secured $120M in Series B funding led by top-tier global investors to fuel international expansion.' },
  { id: 'gulf-payments', date: 'May 2026', title: 'KartSeek Adds Himyan and NAPS Support in Qatar', desc: 'Qatari shoppers can now pay with the domestic debit network alongside international cards and Apple Pay.', regions: ['QA'] },
  { id: 'india-post', date: 'Apr 2026', title: 'KartSeek Partners with India Post for Rural Delivery', desc: 'Strategic partnership to bring e-commerce access to 100,000+ rural PIN codes across India.', regions: ['IN'] },
  { id: 'ai-recs', date: 'Mar 2026', title: 'KartSeek Launches AI-Powered Product Recommendations', desc: 'Machine learning system delivers personalized recommendations, improving conversion by 35%.' },
];

/**
 * Press releases ordered for a market: its own first, then company-wide, then
 * the rest. Nothing is hidden — a reader can always see the full history.
 */
export function getPressReleases(country?: string): PressRelease[] {
  const code = getCountry(country).code;
  const rank = (release: PressRelease) => {
    if (release.regions?.includes(code)) return 0;
    if (!release.regions || release.regions.length === 0) return 1;
    return 2;
  };
  return [...PRESS_RELEASES].sort((a, b) => rank(a) - rank(b));
}

// ─── Company history (global — not localised) ────────────────────────────────

/**
 * Corporate milestones. Deliberately global: these are historical facts about
 * the company, and rewriting them per reader would be a fabrication rather than
 * a translation.
 */
export const COMPANY_MILESTONES = [
  { year: '2024', event: 'Founded in Bangalore. Launched marketplace MVP.' },
  { year: '2024', event: 'Raised $15M Seed round. Expanded to 3 Indian cities.' },
  { year: '2025', event: 'Launched grocery, restaurant and pharmacy verticals.' },
  { year: '2025', event: 'Expanded into the Gulf, beginning with the UAE and Saudi Arabia.' },
  { year: '2026', event: 'Opened Doha operations. Raised $120M Series B.' },
];
