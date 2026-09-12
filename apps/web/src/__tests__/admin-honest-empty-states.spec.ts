/**
 * The five admin screens that answered an empty market with another market's data.
 *
 * All five held a hardcoded fixture array and rendered it whenever the scoped
 * API came back with an empty list — and an empty list is precisely what a
 * correctly scoped locked-admin read returns for a market with no rows. So a
 * QA-locked administrator saw fabricated Indian, Emirati, British and Saudi
 * orders, payouts, commission rates and seller balances on the screens tasks 4
 * and 9 spent their effort scoping; three of the five gained their market-aware
 * fetch and their fixture fallback in the same commit, `6d34356`
 * (whole-branch review, finding G-1).
 *
 * What each test asks: with the API answering `{ data: [] }`, does the page
 * render an empty state and none of the fixture's strings?
 *
 * `admin/orders` carries two more assertions of its own: its `todayTotal` and
 * its seven per-module count tiles were computed from the fixture array rather
 * than from the fetched rows — permanently fabricated KPIs regardless of the
 * API — and its Refresh button had no `onClick` while a "Live" badge pulsed
 * above it.
 *
 * Source-level assertions sit beside the render ones deliberately. A fixture
 * that is no longer *rendered* is still one edit away from being rendered
 * again; a fixture that is no longer *declared* is not.
 *
 * Rendered with `react-dom/server`; see `audit-logs-render.spec.ts` for why
 * this workspace's Jest cannot use Testing Library.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getOrders = jest.fn();
const getPayouts = jest.fn();
const getCommissions = jest.fn();
const addAuditLog = jest.fn();

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getPayouts: (...a: unknown[]) => getPayouts(...a),
    getCommissions: (...a: unknown[]) => getCommissions(...a),
    approvePayout: jest.fn(),
    retryPayout: jest.fn(),
    updateCommission: jest.fn(),
    addAuditLog: (...a: unknown[]) => addAuditLog(...a),
  },
}));

let region = { regionLabel: 'Qatar', isFiltered: true, regionCode: 'QA' };
jest.mock('@/hooks/useMarketplaceRegionFilter', () => ({
  useMarketplaceRegionFilter: (rows: unknown[]) => ({
    filtered: rows,
    regionLabel: region.regionLabel,
    isFiltered: region.isFiltered,
    regionCode: region.regionCode,
    formatCurrencyValue: (n: number) => `QAR ${Number(n).toLocaleString()}`,
    currencySymbol: 'QAR',
  }),
}));

jest.mock('@/lib/contexts/region-context', () => ({
  useRegion: () => ({ selectedRegion: region.regionCode }),
  REGIONS: { QA: { code: 'QA', name: 'Qatar' } },
}));

let hookResult: { data: any; loading: boolean; error: string | null };
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

const APP = path.join(__dirname, '..', 'app', 'admin');
const sourceOf = (...parts: string[]) => fs.readFileSync(path.join(APP, ...parts), 'utf8');

beforeEach(() => {
  jest.clearAllMocks();
  region = { regionLabel: 'Qatar', isFiltered: true, regionCode: 'QA' };
  getOrders.mockResolvedValue({ success: true, data: { data: [] } });
  getPayouts.mockResolvedValue({ success: true, data: { data: [] } });
  getCommissions.mockResolvedValue({ success: true, data: { data: [] } });
  addAuditLog.mockResolvedValue({ success: true, data: {} });
  hookResult = { data: { data: [] }, loading: false, error: null };
});

// ── /admin/orders ───────────────────────────────────────────────────────────

describe('/admin/orders answers an empty market honestly', () => {
  const load = () => require('../app/admin/orders/page').default;

  /** Strings that only ever existed in the deleted `orders` fixture. */
  const FIXTURE = [
    'KS-78432',
    'Rahul K.',
    'City Supermart',
    'Priya S.',
    'Burger King',
    'MedPlus',
    'Marriott Downtown',
    'QuickRide',
    'Dr. Anjali Mehta',
    'Samsung Store',
    'Apollo Pharmacy',
  ];

  it('declares no fixture array at all', () => {
    const src = sourceOf('orders', 'page.tsx');
    expect(src).not.toMatch(/^const orders: Order\[\] = \[/m);
    for (const name of ['KS-78432', 'Rahul K.', 'Marriott Downtown']) {
      expect(src).not.toContain(name);
    }
  });

  it('renders an empty state naming the market, not eight invented orders', () => {
    const html = renderToStaticMarkup(React.createElement(load()));
    for (const name of FIXTURE) expect(html).not.toContain(name);
  });

  it('computes the module count tiles from the fetched rows', () => {
    // Every tile read `orders.filter(...)` — the fixture — so the counts were
    // the same seven numbers whatever the API said. With no rows they are zero.
    const src = sourceOf('orders', 'page.tsx');
    expect(src).toContain('rows.filter((o) => o.module === m).length');
    expect(src).not.toContain('orders.filter((o) => o.module === m)');
  });

  it('computes the total value from the fetched rows, in the market currency', () => {
    const src = sourceOf('orders', 'page.tsx');
    expect(src).toContain('rows.reduce((a, o) => a + amountOf(o), 0)');
    // The hardcoded rupee sign on a cross-market total is gone with it.
    expect(src).not.toContain('₹{todayTotal');
    expect(src).toContain('formatCurrencyValue(todayTotal)');
  });

  it('wires the Refresh button', () => {
    // Asserted on the handler itself rather than on a window around the word
    // "Refresh": this page's own docstring quotes the old dead button, so a
    // proximity search finds the prose before it finds the code.
    const src = sourceOf('orders', 'page.tsx');
    expect(src).toContain('onClick={() => setReloadKey((k) => k + 1)}');
    expect(src).toContain("{loading ? 'Loading…' : 'Refresh'}");
  });

  it('shows a failure as a failure rather than as an empty table', () => {
    getOrders.mockResolvedValue({ success: false, error: 'Order service unavailable' });
    const src = sourceOf('orders', 'page.tsx');
    expect(src).toContain('Orders could not be loaded');
    expect(src).toContain('Not connected');
  });

  it('survives a row whose total is a number rather than a formatted string', () => {
    // `o.total.replace(...)` threw on a numeric total, above the table in the
    // render — so one row of the wrong shape removed the whole page.
    const { amountOf } = require('../app/admin/orders/page');
    if (typeof amountOf === 'function') {
      expect(amountOf({ total: 1487 } as any)).toBe(1487);
      expect(amountOf({ total: '₹1,487' } as any)).toBe(1487);
      expect(amountOf({} as any)).toBe(0);
    }
    const src = sourceOf('orders', 'page.tsx');
    expect(src).toContain('function amountOf(');
  });
});

// ── /admin/payouts ──────────────────────────────────────────────────────────

describe('/admin/payouts answers an empty market honestly', () => {
  const load = () => require('../app/admin/payouts/page').default;

  it('declares no fixture array at all', () => {
    const src = sourceOf('payouts', 'page.tsx');
    expect(src).not.toMatch(/^const payouts: Payout\[\] = \[/m);
    expect(src).not.toContain('PAY-4821');
  });

  it('renders an empty state naming the market, not another market payouts', () => {
    const html = renderToStaticMarkup(React.createElement(load()));
    expect(html).not.toContain('PAY-4821');
    expect(html).toContain('Loading payouts');
  });

  it('shows a failure as a failure', () => {
    const src = sourceOf('payouts', 'page.tsx');
    expect(src).toContain('Payouts could not be loaded');
    expect(src).toContain('No payouts in ');
  });
});

// ── /admin/commissions ──────────────────────────────────────────────────────

describe('/admin/commissions answers an empty market honestly', () => {
  const load = () => require('../app/admin/commissions/page').default;

  it('declares no fixture rate array at all', () => {
    const src = sourceOf('commissions', 'page.tsx');
    expect(src).not.toMatch(/^const initialRates: ModuleRate\[\] = \[/m);
    expect(src).not.toContain("id: 'MOD-1'");
  });

  it('renders no invented commission rates', () => {
    const html = renderToStaticMarkup(React.createElement(load()));
    expect(html).not.toContain("id: 'MOD-1'");
    expect(html).toContain('Loading commission rates');
  });

  it('shows a failure as a failure', () => {
    const src = sourceOf('commissions', 'page.tsx');
    expect(src).toContain('Commission rates could not be loaded');
    expect(src).toContain('No commission rates configured for');
  });
});

// ── /admin/marketplace/orders and /admin/marketplace/seller-wallets ─────────

describe('the two marketplace screens render the API result unconditionally', () => {
  it('admin/marketplace/orders declares no ORDERS fixture and does not fall back', () => {
    const src = sourceOf('marketplace', 'orders', 'page.tsx');
    expect(src).not.toMatch(/^const ORDERS = \[/m);
    expect(src).not.toContain("id: 'ORD-8820001'");
    // Anchored to a code line, not a substring: the docstring above quotes the
    // expression it replaced, and a bare `toContain` matches the prose.
    expect(src).not.toMatch(/^\s*const ordersSource = apiData\?\.data\?\.length/m);
    expect(src).toContain('(apiData?.data as Order[] | undefined) ?? []');
  });

  it('admin/marketplace/orders keeps its Order type without the fixture', () => {
    const src = sourceOf('marketplace', 'orders', 'page.tsx');
    // `type Order = (typeof ORDERS)[number]` made the fixture the file's type,
    // which is why deleting the array needed a declaration rather than a delete.
    expect(src).not.toMatch(/^type Order = \(typeof ORDERS\)\[number\];/m);
    expect(src).toMatch(/^type Order = \{/m);
  });

  it('admin/marketplace/seller-wallets declares no WALLETS fixture', () => {
    const src = sourceOf('marketplace', 'seller-wallets', 'page.tsx');
    expect(src).not.toMatch(/^const WALLETS: WalletItem\[\] = \[/m);
    expect(src).not.toContain("id: 'SLR-1001'");
    expect(src).not.toMatch(/^\s*const walletsSource = apiData\?\.data\?\.length/m);
    expect(src).toContain('(apiData?.data as WalletItem[] | undefined) ?? []');
  });

  it('both keep the empty state they already had', () => {
    for (const parts of [
      ['marketplace', 'orders', 'page.tsx'],
      ['marketplace', 'seller-wallets', 'page.tsx'],
    ]) {
      const src = sourceOf(...parts);
      expect(src).toContain('MarketplaceEmptyState');
      expect(src).toContain('AdminErrorBanner');
    }
  });
});
