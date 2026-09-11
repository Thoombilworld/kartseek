/**
 * The four admin taxi consoles read and write through the authenticated client,
 * and every body matches the DTO the gateway declares.
 *
 * All four used raw `fetch()` with no `Authorization` header — 401 in
 * production, and only reaching a handler locally because `DEV_AUTH_BYPASS` is
 * on — against responses they never unwrapped. Each then sent a body the
 * validation pipe refuses:
 *
 *   settings  PUT  /admin/taxi/config/:cc   → the whole envelope, then the row's
 *                                             `createdAt`/`updatedAt`
 *   drivers   POST /admin/taxi/drivers/:id/block → no body at all
 *   payouts   POST /admin/taxi/payouts/process   → `action`, plus `PAY-001` ids
 *   pricing   POST /admin/taxi/rates             → `{ country, rates: [...] }`
 *
 * Rendered with `react-dom/server`; see `audit-logs-render.spec.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const api = {
  getConfig: jest.fn(),
  upsertConfig: jest.fn(),
  getRateCards: jest.fn(),
  upsertRateCard: jest.fn(),
  getDrivers: jest.fn(),
  approveDriver: jest.fn(),
  suspendDriver: jest.fn(),
  blockDriver: jest.fn(),
  getPayouts: jest.fn(),
  approvePayout: jest.fn(),
  processPayouts: jest.fn(),
};

jest.mock('@/lib/api/admin-taxi', () => ({ adminTaxiApi: api }));

let hookResult: { data: unknown; loading: boolean; error: string | null };

jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    void Promise.resolve(fetcher()).catch(() => undefined);
    return { ...hookResult, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => React.createElement('div', null, 'loading-skeleton'),
  AdminErrorBanner: ({ error }: { error: string }) => React.createElement('div', null, error),
}));

const SettingsPage = require('../app/admin/taxi/settings/page');
const DriversPage = require('../app/admin/taxi/drivers/page');
const PayoutsPage = require('../app/admin/taxi/payouts/page');
const PricingPage = require('../app/admin/taxi/pricing/page');

const render = (mod: { default: React.ComponentType }) =>
  renderToStaticMarkup(React.createElement(mod.default));

const ADMIN_DIR = path.join(__dirname, '..', 'app', 'admin', 'taxi');
const sourceOf = (page: string) => fs.readFileSync(path.join(ADMIN_DIR, page, 'page.tsx'), 'utf8');

/**
 * The file with its comments removed.
 *
 * Each of these pages carries a comment naming exactly what was deleted from
 * it — the `fetch()` calls, the `${action}` path, the `action: 'approve'`
 * field — and that sentence is the record of why the page looks as it does. The
 * assertions below are about the code, so they read the code.
 */
const codeOf = (page: string) =>
  sourceOf(page)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

// ── Fixtures shaped like the rows each service really returns ────────────────

/** A `taxi_country_configs` row, decimals as the strings Postgres sends. */
const CONFIG_ROW = {
  countryCode: 'QA',
  currency: 'QAR',
  distanceUnit: 'km',
  otpRequired: true,
  scheduledRidesEnabled: true,
  cashEnabled: true,
  tipsEnabled: false,
  rideShareEnabled: false,
  vendorsEnabled: true,
  maxStops: 3,
  enabledPaymentGateways: ['cash', 'card', 'wallet'],
  enabledVehicleTypes: ['economy', 'comfort'],
  requiredVendorDocuments: ['business_license'],
  requiredDriverDocuments: ['driving_license'],
  platformCommissionRate: '0.1500',
  defaultVendorCommissionRate: '0.0500',
  taxRate: '0.0000',
  surgeLimits: { minMultiplier: 1, maxMultiplier: 3, autoEnabled: true },
  peakHourConfig: [{ start: 7, end: 9, multiplier: 1.15, label: 'Morning Rush' }],
  emergencyNumber: '999',
  defaultLocale: 'en',
  timezone: 'Asia/Qatar',
  minimumDriverRating: 3,
  freeWaitingMinutes: 5,
  autoCancelTimeoutSeconds: 120,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const RATE_CARD = {
  id: '33333333-3333-4333-8333-333333333333',
  countryCode: 'QA',
  vehicleType: 'economy',
  displayName: 'Economy',
  baseFare: '5.00',
  distanceRate: '1.50',
  timeRate: '0.30',
  minimumFare: '8.00',
  waitingRate: '0.25',
  nightSurcharge: '0.00',
  airportSurcharge: '0.00',
  cancellationFee: '3.00',
  maxPassengers: 4,
  maxLuggage: 2,
  sortOrder: 0,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const DRIVER = {
  id: '44444444-4444-4444-8444-444444444444',
  firstName: 'Yousef',
  lastName: 'Al-Marri',
  phone: '+974 5500 0000',
  email: 'yousef@example.qa',
  countryCode: 'QA',
  vendorId: null,
  vendor: null,
  status: 'active',
  vehicleType: 'comfort',
  vehiclePlate: 'QA-4821',
  vehicleModel: 'Camry',
  rating: '4.70',
  totalTrips: 318,
  onboardingProgress: 100,
  createdAt: '2026-02-01T00:00:00.000Z',
};

const PAYOUT = {
  id: '55555555-5555-4555-8555-555555555555',
  recipientType: 'driver',
  recipientId: '44444444-4444-4444-8444-444444444444',
  recipientName: 'Yousef Al-Marri',
  rideId: '66666666-6666-4666-8666-666666666666',
  countryCode: 'QA',
  grossAmount: '45.00',
  platformCommission: '6.75',
  vendorCommission: '0.00',
  taxAmount: '0.00',
  netPayout: '38.25',
  currency: 'QAR',
  status: 'pending',
  createdAt: '2026-09-10T09:00:00.000Z',
  settledAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  api.getConfig.mockResolvedValue({ success: true, data: CONFIG_ROW });
  api.getRateCards.mockResolvedValue({ success: true, data: [RATE_CARD] });
  api.getDrivers.mockResolvedValue({ success: true, data: { data: [DRIVER], total: 1 } });
  api.getPayouts.mockResolvedValue({ success: true, data: { data: [PAYOUT], total: 1 } });
  api.upsertConfig.mockResolvedValue({ success: true, data: CONFIG_ROW });
  api.upsertRateCard.mockResolvedValue({ success: true, data: RATE_CARD });
  api.processPayouts.mockResolvedValue({ success: true, data: { processed: 1, failed: 0 } });
});

// ── Settings ────────────────────────────────────────────────────────────────

describe('/admin/taxi/settings', () => {
  beforeEach(() => {
    hookResult = {
      data: { ok: true, config: SettingsPage.toConfigInput(CONFIG_ROW) },
      loading: false,
      error: null,
    };
  });

  it('reads the configuration through the client, by country', async () => {
    render(SettingsPage);
    await Promise.resolve();
    expect(api.getConfig).toHaveBeenCalledWith('IN');
  });

  it('renders the fetched configuration, not a default one', () => {
    const html = render(SettingsPage);
    expect(html).toContain('QAR'); // currency comes from the row
    expect(html).toContain('Morning Rush');
    expect(html).toContain('value="999"'); // emergencyNumber
    expect(html).toContain('value="15.0"'); // 0.1500 → 15.0 %
  });

  it('lists each market once, and carries no currency of its own', () => {
    // Two `code: 'IN'` rows, and `.find()` returned the one whose currency was
    // the symbol `₹` — written into an ISO-4217 column until the DTO refused it.
    const codes = SettingsPage.COUNTRY_OPTIONS.map((c: { code: string }) => c.code);
    expect(codes).toEqual([...new Set(codes)]);
    expect(SettingsPage.COUNTRY_OPTIONS.some((c: object) => 'currency' in c)).toBe(false);
    expect(render(SettingsPage)).not.toContain('₹');
  });

  it('names the route when the configuration will not load', () => {
    hookResult = {
      data: { ok: false, kind: 'unreachable', message: 'Taxi service unavailable' },
      loading: false,
      error: null,
    };
    const html = render(SettingsPage);
    expect(html).toContain('The taxi configuration is not connected.');
    expect(html).toContain('GET /admin/taxi/config/IN');
    // Not a page of default values wearing an error banner.
    expect(html).not.toContain('Morning Rush');
  });

  it('shows a forbidden panel when the server refused', () => {
    hookResult = {
      data: {
        ok: false,
        kind: 'forbidden',
        message: 'Your account is restricted to the QA market',
      },
      loading: false,
      error: null,
    };
    expect(render(SettingsPage)).toContain('You cannot open the taxi configuration.');
  });
});

describe('toConfigInput — the body PUT /admin/taxi/config/:cc accepts', () => {
  const body = SettingsPage.toConfigInput(CONFIG_ROW);

  it('strips the fields a fetched row carries and the DTO refuses', () => {
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).not.toHaveProperty('countryCode'); // the path parameter wins
    expect(body).not.toHaveProperty('success');
    expect(body).not.toHaveProperty('data');
    expect(body).not.toHaveProperty('timestamp');
  });

  it('declares only properties TaxiConfigUpsertDto declares', () => {
    const DECLARED = [
      'countryCode',
      'currency',
      'distanceUnit',
      'otpRequired',
      'scheduledRidesEnabled',
      'cashEnabled',
      'tipsEnabled',
      'rideShareEnabled',
      'vendorsEnabled',
      'maxStops',
      'enabledPaymentGateways',
      'enabledVehicleTypes',
      'requiredVendorDocuments',
      'requiredDriverDocuments',
      'platformCommissionRate',
      'defaultVendorCommissionRate',
      'taxRate',
      'surgeLimits',
      'peakHourConfig',
      'emergencyNumber',
      'defaultLocale',
      'timezone',
      'minimumDriverRating',
      'freeWaitingMinutes',
      'autoCancelTimeoutSeconds',
    ];
    expect(Object.keys(body).filter((k) => !DECLARED.includes(k))).toEqual([]);
  });

  it('sends the commission columns as the fractions the DTO caps at 1', () => {
    expect(body.platformCommissionRate).toBe(0.15);
    expect(body.defaultVendorCommissionRate).toBe(0.05);
    expect(body.taxRate).toBe(0);
  });

  it('omits an emergency number rather than posting one the DTO refuses', () => {
    // The column is NOT NULL and `@Length(1, 20)` rejects "", so clearing the
    // field used to guarantee a 400. The upsert merges, so omitting the key
    // leaves the stored number alone.
    const cleared = SettingsPage.toConfigInput({ ...CONFIG_ROW, emergencyNumber: '' });
    expect(cleared.emergencyNumber).toBeUndefined();
    expect(JSON.parse(JSON.stringify(cleared))).not.toHaveProperty('emergencyNumber');
    expect(SettingsPage.toConfigInput(CONFIG_ROW).emergencyNumber).toBe('999');
  });

  it('survives an envelope being handed to it rather than a row', () => {
    // The old code merged `{success, data, timestamp}` into state. Even if that
    // ever happened again, nothing undeclared could reach the wire.
    const wrong = { success: true, data: CONFIG_ROW, timestamp: 'x' } as never;
    expect(Object.keys(SettingsPage.toConfigInput(wrong))).not.toContain('success');
  });
});

// ── Drivers ─────────────────────────────────────────────────────────────────

describe('/admin/taxi/drivers', () => {
  beforeEach(() => {
    hookResult = { data: { ok: true, rows: [DRIVER], total: 1 }, loading: false, error: null };
  });

  it('reads the real route through the client', async () => {
    render(DriversPage);
    await Promise.resolve();
    expect(api.getDrivers).toHaveBeenCalledWith({
      limit: 100,
      status: undefined,
      countryCode: undefined,
      search: undefined,
    });
  });

  it('renders the driver the API returned', () => {
    const html = render(DriversPage);
    expect(html).toContain('Yousef Al-Marri');
    expect(html).toContain('QA-4821');
    expect(html).toContain('4.7');
  });

  it.each([
    'Ravi Kumar',
    'Amit Singh',
    'James Mwangi',
    'Fatima Okonkwo',
    'Ahmed Hassan',
    'Sarah Johnson',
    'Prakash B.',
    'DRV-101',
    'QuickRide Fleet',
    'Lagos City Rides',
    'Desert Express',
    'KA01-1234',
  ])('no longer renders the fixture string %s', (needle) => {
    expect(render(DriversPage)).not.toContain(needle);
  });

  it('says so when nothing matches, instead of listing eight drivers', () => {
    hookResult = { data: { ok: true, rows: [], total: 0 }, loading: false, error: null };
    expect(render(DriversPage)).toContain('No driver matches these filters.');
  });

  it('names the route when the list will not load', () => {
    hookResult = {
      data: { ok: false, kind: 'unreachable', message: 'Taxi service unavailable' },
      loading: false,
      error: null,
    };
    const html = render(DriversPage);
    expect(html).toContain('The driver list is not connected.');
    expect(html).toContain('GET /admin/taxi/drivers');
  });
});

// ── Payouts ─────────────────────────────────────────────────────────────────

describe('/admin/taxi/payouts', () => {
  beforeEach(() => {
    hookResult = { data: { ok: true, rows: [PAYOUT], total: 1 }, loading: false, error: null };
  });

  it('reads the ledger through the client, and sends no limit the route drops', async () => {
    render(PayoutsPage);
    await Promise.resolve();
    // `GET /admin/taxi/payouts` declares page, status and countryCode only, so a
    // `limit` is dropped by the controller and the service pages at 20 anyway.
    expect(api.getPayouts).toHaveBeenCalledWith({
      status: undefined,
      countryCode: undefined,
    });
    expect(api.getPayouts.mock.calls[0][0]).not.toHaveProperty('limit');
  });

  it('renders the total the route reported, not just the rows it drew', () => {
    hookResult = { data: { ok: true, rows: [PAYOUT], total: 340 }, loading: false, error: null };
    const html = render(PayoutsPage);
    expect(html).toContain('Showing 1 of 340 payout records');
  });

  it('says the view is one service page when more records match', () => {
    hookResult = { data: { ok: true, rows: [PAYOUT], total: 340 }, loading: false, error: null };
    const html = render(PayoutsPage);
    expect(html).toContain('first page the route returns');
    expect(html).toContain('Plan D');
  });

  it('says nothing about paging when the page holds everything', () => {
    const html = render(PayoutsPage);
    expect(html).toContain('Showing 1 of 1 payout records');
    expect(html).not.toContain('first page the route returns');
  });

  it('offers to select what is SHOWN, and counts it', () => {
    // "Select all pending" over a 20-row view of 340 told an administrator they
    // had swept the queue.
    const html = render(PayoutsPage);
    expect(html).toContain('Select shown pending (1)');
    expect(html).not.toContain('Select all pending');
  });

  it('renders the record the API returned, in its own currency', () => {
    const html = render(PayoutsPage);
    expect(html).toContain('Yousef Al-Marri');
    expect(html).toContain('38.25');
    expect(html).toContain('QAR');
  });

  it.each(['PAY-001', 'RIDE-5001', 'Multi-Currency', 'Rajesh Kumar', 'Desert Express'])(
    'no longer renders the fixture string %s',
    (needle) => {
      expect(render(PayoutsPage)).not.toContain(needle);
    },
  );

  it('totals nothing across currencies, and says why', () => {
    expect(render(PayoutsPage)).toContain('one sum of them would mean nothing');
  });

  it('says the ledger is empty rather than drawing seven records', () => {
    hookResult = { data: { ok: true, rows: [], total: 0 }, loading: false, error: null };
    expect(render(PayoutsPage)).toContain('No payout records exist for these filters yet.');
  });
});

// ── Pricing ─────────────────────────────────────────────────────────────────

describe('/admin/taxi/pricing', () => {
  beforeEach(() => {
    hookResult = {
      data: { ok: true, cards: [RATE_CARD], currency: 'QAR' },
      loading: false,
      error: null,
    };
  });

  it('reads the rate cards with the parameter the route declares', async () => {
    render(PricingPage);
    await Promise.resolve();
    expect(api.getRateCards).toHaveBeenCalledWith('IN');
    expect(api.getConfig).toHaveBeenCalledWith('IN');
  });

  it('renders the card the API returned', () => {
    const html = render(PricingPage);
    expect(html).toContain('Economy');
    expect(html).toContain('economy');
    expect(html).toContain('QAR');
  });

  it('seeds no default rate cards — an unconfigured market says so', () => {
    hookResult = { data: { ok: true, cards: [], currency: 'QAR' }, loading: false, error: null };
    expect(render(PricingPage)).toContain('No rate cards are configured');
  });

  it('draws no invented rental or intercity price matrix', () => {
    const code = codeOf('pricing');
    for (const needle of [
      'Child Seat',
      'Snow Chains',
      'Chauffeur/day',
      'Premium Insurance',
      'defaultRateCards',
      'rental-policies',
      'getCountryConfig',
      'Malindi',
    ]) {
      expect(code).not.toContain(needle);
    }
  });

  it('lists each market once, with no currency of its own', () => {
    const codes = PricingPage.COUNTRY_OPTIONS.map((c: { code: string }) => c.code);
    expect(codes).toEqual([...new Set(codes)]);
    expect(PricingPage.COUNTRY_OPTIONS.some((c: object) => 'currency' in c)).toBe(false);
    expect(render(PricingPage)).not.toContain('₹');
  });
});

describe('/admin/taxi/pricing saves only what changed', () => {
  beforeEach(() => {
    hookResult = {
      data: { ok: true, cards: [RATE_CARD], currency: 'QAR' },
      loading: false,
      error: null,
    };
  });

  it('disables Save until a card is edited', () => {
    // One click used to post every card in the market: N writes, N updatedAt
    // bumps and N audit entries for a market nobody had touched.
    const html = render(PricingPage);
    expect(html).toMatch(/id="save-rates-btn"[^>]*disabled=""|disabled=""[^>]*id="save-rates-btn"/);
    expect(html).toContain('Save rate cards');
  });

  it('posts one card per edited vehicle type, never the whole market', () => {
    const source = fs.readFileSync(path.join(ADMIN_DIR, 'pricing', 'page.tsx'), 'utf8');
    expect(source).toContain('cards ?? []).filter((c) => edited.has(c.id))');
    expect(source).not.toMatch(/cards\.map\(\(card\) => adminTaxiApi\.upsertRateCard/);
  });
});

describe('toRateCardInput — the body POST /admin/taxi/rates accepts', () => {
  const body = PricingPage.toRateCardInput(RATE_CARD, 'QA');

  it('strips the fields the DTO refuses', () => {
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
  });

  it('is one card, never the old { country, rates: [] } batch', () => {
    expect(body).not.toHaveProperty('country');
    expect(body).not.toHaveProperty('rates');
    expect(body.countryCode).toBe('QA');
    expect(body.vehicleType).toBe('economy');
  });

  it('converts the decimal strings Postgres returns into numbers', () => {
    expect(body.baseFare).toBe(5);
    expect(body.distanceRate).toBe(1.5);
    expect(body.minimumFare).toBe(8);
    expect(Object.values(body).some((v) => typeof v === 'string' && /^\d+\.\d+$/.test(v))).toBe(
      false,
    );
  });
});

// ── The client, against a mocked fetch: the exact bytes on the wire ──────────

describe('the taxi bodies match their DTOs', () => {
  const actual = jest.requireActual(
    '@/lib/api/admin-taxi',
  ) as typeof import('@/lib/api/admin-taxi');
  let sent: Array<{ url: string; method?: string; body: Record<string, unknown> | null }>;

  beforeEach(() => {
    sent = [];
    global.fetch = jest.fn(async (url: unknown, init: RequestInit = {}) => {
      sent.push({
        url: String(url),
        method: init.method,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
      });
      return { ok: true, json: async () => ({ success: true, data: {} }) } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  it('block posts a reason, by POST, to the block route', async () => {
    await actual.adminTaxiApi.blockDriver(
      '44444444-4444-4444-8444-444444444444',
      'Expired licence',
    );
    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toContain('/admin/taxi/drivers/44444444-4444-4444-8444-444444444444/block');
    expect(sent[0].body).toEqual({ reason: 'Expired licence' });
  });

  it('approve and suspend use PATCH, the verb those routes declare', async () => {
    await actual.adminTaxiApi.approveDriver('d-1');
    await actual.adminTaxiApi.suspendDriver('d-1', 'Under review');
    expect(sent.map((s) => s.method)).toEqual(['PATCH', 'PATCH']);
    expect(sent[1].body).toEqual({ reason: 'Under review' });
  });

  it('the settlement batch posts payoutIds only — no action', async () => {
    await actual.adminTaxiApi.processPayouts(['55555555-5555-4555-8555-555555555555']);
    expect(sent[0].body).toEqual({ payoutIds: ['55555555-5555-4555-8555-555555555555'] });
    expect(sent[0].body).not.toHaveProperty('action');
  });

  it('the rate-card read uses countryCode, not country', async () => {
    await actual.adminTaxiApi.getRateCards('QA');
    expect(sent[0].url).toContain('/admin/taxi/rates?countryCode=QA');
    expect(sent[0].url).not.toContain('?country=');
  });

  it('the driver list forwards countryCode as a query parameter', async () => {
    await actual.adminTaxiApi.getDrivers({ countryCode: 'QA', status: 'active' });
    expect(sent[0].url).toContain('countryCode=QA');
    expect(sent[0].url).toContain('status=active');
  });

  it('types the double-wrapped replies as they arrive', async () => {
    // These three handlers return `{ data: … }` and the interceptor wraps that
    // again, so `apiCall`'s unwrap leaves one envelope. A caller reading
    // `res.data.status` must get a type error, not `undefined` at runtime.
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'packages',
        'shared-core',
        'src',
        'api',
        'admin-taxi.ts',
      ),
      'utf8',
    );
    expect(src).toContain('apiCall<{ data: TaxiDriverRow }>');
    expect(src).toContain('apiCall<{ data: TaxiPayoutRow }>');
  });

  it('the config upsert PUTs the body it was given to the path market', async () => {
    await actual.adminTaxiApi.upsertConfig('QA', { currency: 'QAR' });
    expect(sent[0].method).toBe('PUT');
    expect(sent[0].url).toContain('/admin/taxi/config/QA');
    expect(sent[0].body).toEqual({ currency: 'QAR' });
  });
});

// ── No raw fetch, no fixtures, in any of the four files ─────────────────────

describe('the four taxi console sources', () => {
  const PAGES = ['settings', 'drivers', 'payouts', 'pricing'];

  it.each(PAGES)('%s calls no fetch() of its own', (page) => {
    expect(codeOf(page)).not.toMatch(/\bfetch\s*\(/);
  });

  it.each(PAGES)('%s imports the authenticated client', (page) => {
    expect(sourceOf(page)).toContain("from '@/lib/api/admin-taxi'");
  });

  it.each(PAGES)('%s declares no mock collection', (page) => {
    const code = codeOf(page);
    expect(code).not.toMatch(/const\s+mock[A-Z]/);
    expect(code).not.toMatch(/const\s+MOCK_/);
  });

  it('drivers no longer builds a path from an action name', () => {
    // `/admin/taxi/drivers/${id}/${action}` sent approve and suspend, both
    // @Patch routes, as POST — and block with no body.
    expect(codeOf('drivers')).not.toContain('${action}');
    expect(codeOf('drivers')).not.toContain('/taxi/admin/');
  });

  it('payouts sends no action field', () => {
    expect(codeOf('payouts')).not.toMatch(/action:\s*'(approve|settle)'/);
  });
});
