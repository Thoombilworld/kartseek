/**
 * `/admin/sellers` shows the `sellers` rows the marketplace service returns, and
 * sends bodies the gateway's DTOs accept.
 *
 * What it used to show: `MOCK_SELLERS`, ten invented shops with ratings,
 * revenue strings and complaint counts, plus four literal counters (3,240
 * sellers, 1,850 delivery partners, ₹18.2M GMV). What it used to send:
 * `adminId` on five calls — the gateway refuses it on the ban route — and the
 * *seller* id to `PUT /admin/users/:userId/ban`, which resolves that parameter
 * against the users table, so a block could only ever answer "not found".
 *
 * Rendered with `react-dom/server`; see `audit-logs-render.spec.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getSellers = jest.fn();
const approveSeller = jest.fn();
const suspendSeller = jest.fn();
const reactivateSeller = jest.fn();
const blockSeller = jest.fn();
const unblockSeller = jest.fn();
const addAuditLog = jest.fn();

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getSellers: (...a: unknown[]) => getSellers(...a),
    approveSeller: (...a: unknown[]) => approveSeller(...a),
    suspendSeller: (...a: unknown[]) => suspendSeller(...a),
    reactivateSeller: (...a: unknown[]) => reactivateSeller(...a),
    blockSeller: (...a: unknown[]) => blockSeller(...a),
    unblockSeller: (...a: unknown[]) => unblockSeller(...a),
    addAuditLog: (...a: unknown[]) => addAuditLog(...a),
  },
}));

let selectedRegion = 'ALL';
jest.mock('@/lib/contexts/region-context', () => ({
  useRegion: () => ({ selectedRegion }),
  REGIONS: { QA: { code: 'QA', name: 'Qatar' } },
}));

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

const { default: Page, loadSellers, SellerDrawer } = require('../app/admin/sellers/page');

/** A row shaped like the `sellers` record `getSellersForAdmin` returns. */
const SELLER = {
  id: '11111111-1111-4111-8111-111111111111',
  businessName: 'Al Meera Stores',
  ownerName: 'Hamad Al-Thani',
  ownerId: '22222222-2222-4222-8222-222222222222',
  email: 'ops@almeera.qa',
  phone: '+974 4000 0000',
  verificationStatus: 'VERIFIED',
  kycStatus: 'VERIFIED',
  isActive: true,
  sellerRating: '4.60',
  totalProducts: 812,
  totalOrders: 2140,
  commissionRate: '8.00',
  regionCode: 'QA',
  address: { city: 'Doha', state: 'QA' },
  createdAt: '2026-01-04T00:00:00.000Z',
};

/** Strings that only ever existed in `MOCK_SELLERS` and the literal counters. */
const FIXTURE_STRINGS = [
  'City Supermart',
  'Arun Patel',
  'Burger King India',
  'MedPlus Pharmacy',
  'Apple India Store',
  'FreshMart Organics',
  'QuickRide Cabs',
  'HealthFirst Pharma',
  'FakeGoods Store',
  'Gulf Electronics',
  'London Fashion Hub',
  'SEL-001',
  '3,240',
  '1,850',
  '₹18.2M',
  'Delivery Partners',
  '₹42L',
];

const render = () => renderToStaticMarkup(React.createElement(Page));

beforeEach(() => {
  jest.clearAllMocks();
  selectedRegion = 'ALL';
  getSellers.mockResolvedValue({ success: true, data: { data: [SELLER], total: 1 } });
  addAuditLog.mockResolvedValue({ success: true, data: {} });
  hookResult = { data: { ok: true, rows: [SELLER], total: 1 }, loading: false, error: null };
});

describe('/admin/sellers renders the API', () => {
  it('asks the seller route, unscoped under "all markets"', async () => {
    render();
    await Promise.resolve();
    expect(getSellers).toHaveBeenCalledWith({
      limit: 100,
      status: undefined,
      country: undefined,
    });
  });

  it('scopes the read to the selected market', async () => {
    await loadSellers({ country: 'QA', status: 'PENDING' });
    expect(getSellers).toHaveBeenLastCalledWith({
      limit: 100,
      status: 'PENDING',
      country: 'QA',
    });
  });

  it('renders the seller the API returned, with the columns the row carries', () => {
    const html = render();
    expect(html).toContain('Al Meera Stores');
    expect(html).toContain('Hamad Al-Thani');
    expect(html).toContain('Doha');
    expect(html).toContain('VERIFIED');
    expect(html).toContain('2,140'); // totalOrders
    expect(html).toContain('4.6'); // sellerRating, a decimal string from Postgres
  });

  it.each(FIXTURE_STRINGS)('no longer renders the fixture string %s', (needle) => {
    expect(render()).not.toContain(needle);
  });

  it('says the directory is empty rather than drawing ten shops', () => {
    hookResult = { data: { ok: true, rows: [], total: 0 }, loading: false, error: null };
    expect(render()).toContain('No sellers are registered in this market yet.');
  });

  it('counts only what it loaded, and labels it as such', () => {
    const html = render();
    expect(html).toContain('Sellers matching this filter');
    expect(html).toContain('on this page');
  });
});

describe('/admin/sellers failure states', () => {
  it('shows a forbidden panel when the server refused', () => {
    hookResult = {
      data: { ok: false, kind: 'forbidden', message: 'Missing required permissions: sellers.read' },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('You cannot open the seller directory.');
    expect(html).toContain('sellers.read');
  });

  it('names the route when nobody answered', () => {
    hookResult = {
      data: { ok: false, kind: 'unreachable', message: 'Marketplace service unavailable' },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('The seller directory is not connected.');
    expect(html).toContain('GET /admin/marketplace/sellers');
  });

  it('shows the skeleton while asking', () => {
    hookResult = { data: null, loading: true, error: null };
    expect(render()).toContain('loading-skeleton');
  });
});

describe('the drawer, where the ban controls live', () => {
  const drawer = (seller: unknown) =>
    renderToStaticMarkup(
      React.createElement(SellerDrawer, { seller, onClose: () => {}, onAction: () => {} }),
    );

  it('offers the ban actions for a seller with an owner account', () => {
    const html = drawer(SELLER);
    expect(html).toContain('Ban owner');
    expect(html).toContain('Lift ban');
  });

  it('disables them, and says why, when the seller has no linked account', () => {
    const html = drawer({ ...SELLER, ownerId: null });
    expect(html).toContain('no linked user account');
  });

  it('offers a shop-level block distinct from the account-level ban', () => {
    const html = drawer(SELLER);
    expect(html).toContain('Block shop');
    expect(html).toContain('Ban owner');
  });

  it('shows the unblock control as unavailable, with the reason', () => {
    const html = drawer(SELLER);
    expect(html).toContain('Unblock shop');
    expect(html).toContain('no honest unblock to offer');
    // A control that cannot work must not look clickable. With an owner id set,
    // the ban pair is enabled, so the unblock button is the only disabled one.
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toMatch(/disabled=""[\s\S]{0,400}Unblock shop/);
  });

  it('keeps a block available even for a seller with no owner account', () => {
    // The whole point of the retarget: an ownerless seller still has a shop.
    expect(drawer({ ...SELLER, ownerId: null })).toContain('Block shop');
  });

  it('does not claim to know whether the owner is banned', () => {
    expect(drawer(SELLER)).toContain('does not say whether the owner');
  });

  it('reports no revenue, complaints or delivery time — the row has none', () => {
    const html = drawer(SELLER);
    expect(html).toContain('are not part of this query');
    expect(html).not.toContain('Revenue</p>');
  });

  /**
   * `verificationStatus: 'SUSPENDED'` means two different things.
   *
   * A *suspend* sets that field alone, and `reactivateSeller` puts it back. A
   * *block* sets it **and** `isActive: false`, while reactivate writes only the
   * verification status — so on a blocked shop the button reported
   * "Reactivated …", flipped the badge, and left the shop closed. `isActive` is
   * the only thing that tells the two states apart.
   */
  const suspended = { ...SELLER, verificationStatus: 'SUSPENDED', isActive: true };
  const blocked = { ...SELLER, verificationStatus: 'SUSPENDED', isActive: false };

  it('offers Reactivate for a suspended shop, which is what the route restores', () => {
    const html = drawer(suspended);
    expect(html).toContain('Reactivate seller');
    expect(html).not.toContain('Suspend seller');
  });

  it('does not offer Reactivate for a blocked shop — it cannot reopen one', () => {
    const html = drawer(blocked);
    expect(html).not.toContain('Reactivate seller');
    // Nor Suspend: the shop is already closed, harder than a suspension.
    expect(html).not.toContain('Suspend seller');
    // The disabled unblock control and its explanation are the honest state.
    expect(html).toContain('Unblock shop');
    expect(html).toContain('blocked, not merely suspended');
  });

  it('offers Suspend on a healthy shop, and no Reactivate', () => {
    const html = drawer(SELLER);
    expect(html).toContain('Suspend seller');
    expect(html).not.toContain('Reactivate seller');
  });
});

/** The bodies, against the real client rather than the mock. */
describe('the seller bodies match the gateway DTOs', () => {
  const actual = jest.requireActual(
    '@/lib/api/admin-core',
  ) as typeof import('@/lib/api/admin-core');
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

  it('block closes the shop: PATCH the SELLER id, no body', async () => {
    await actual.adminCoreApi.blockSeller(SELLER.id);
    expect(sent[0].method).toBe('PATCH');
    expect(sent[0].url).toContain(`/admin/marketplace/sellers/${SELLER.id}/block`);
    // The route declares no `@Body()`; a reason sent here would be discarded.
    expect(sent[0].body).toBeNull();
  });

  it('ban locks the owner out: PUT { reason } to the OWNER user id', async () => {
    await actual.adminCoreApi.banUser(SELLER.ownerId, 'Counterfeits');
    expect(sent[0].method).toBe('PUT');
    expect(sent[0].url).toContain(`/admin/users/${SELLER.ownerId}/ban`);
    expect(sent[0].body).toEqual({ reason: 'Counterfeits' });
    expect(sent[0].body).not.toHaveProperty('adminId');
  });

  it('the two are different routes — closing a shop is not banning a person', () => {
    expect(String(actual.adminCoreApi.blockSeller)).toContain('marketplace/sellers');
    expect(String(actual.adminCoreApi.banUser)).toContain('admin/users');
  });

  it('offers no unblockSeller — no route restores a blocked seller', () => {
    expect(actual.adminCoreApi).not.toHaveProperty('unblockSeller');
  });

  it('unban sends no body at all — the route declares none', async () => {
    await actual.adminCoreApi.unbanUser(SELLER.ownerId);
    expect(sent.map((s) => s.body)).toEqual([null]);
  });

  it('suspend posts { reason }, approve and reactivate post nothing', async () => {
    await actual.adminCoreApi.suspendSeller('s-1', 'Repeated late dispatch');
    await actual.adminCoreApi.approveSeller('s-1');
    await actual.adminCoreApi.reactivateSeller('s-1');
    expect(sent[0].body).toEqual({ reason: 'Repeated late dispatch' });
    expect(sent[1].body).toBeNull();
    expect(sent[2].body).toBeNull();
    expect(sent.every((s) => s.method === 'PATCH')).toBe(true);
  });
});

describe('the page source', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'admin', 'sellers', 'page.tsx'),
    'utf8',
  );

  it('declares no fixture list and reads no phantom localStorage key', () => {
    expect(source).not.toMatch(/const\s+MOCK_SELLERS/);
    expect(source).not.toContain('adminUserId');
    expect(source).not.toContain('localStorage');
  });

  it('builds no body carrying adminId', () => {
    expect(source).not.toMatch(/adminId\s*[,:}]/);
  });

  it('blocks with the seller id and bans with the owner id', () => {
    expect(source).toContain('blockSeller(seller.id)');
    expect(source).toContain('banUser(seller.ownerId');
    expect(source).toContain('unbanUser(seller.ownerId');
  });

  it('offers no unblock control it cannot honour', () => {
    expect(source).not.toContain('unblockSeller');
    expect(source).toContain('no honest unblock to offer');
  });

  it('asks the seller route for no search term the service ignores', () => {
    // The gateway forwards `search`; `getSellersForAdmin` has no predicate for
    // it, so an unfiltered list would come back looking like a search result.
    expect(source).not.toMatch(/search:\s*params\.search/);
  });

  // The string literal, not the comment that records it was removed.
  it('invents no reason for a suspension or a ban', () => {
    expect(source).not.toContain("'Blocked by admin'");
    expect(source).not.toContain("'Suspended by admin'");
  });
});
