/**
 * `/admin` shows the platform counters admin-service measured, the audit trail's
 * newest rows, and nothing it made up.
 *
 * What it used to show: a `modules` array giving every vertical invented daily
 * orders and revenue, seven fabricated `recentActivity` events, an `hourlyData`
 * bar chart labelled "Today's Order Volume", a commission widget quoting seven
 * per-module earnings in rupees in every market, and quick stats (842 partners
 * online, 96.2% on-time, 4.6 average rating) that were literals in the file.
 *
 * Rendered with `react-dom/server` — see `audit-logs-render.spec.ts` for why.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getDashboard = jest.fn();
const getAuditLogs = jest.fn();

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    getDashboard: (...a: unknown[]) => getDashboard(...a),
    getAuditLogs: (...a: unknown[]) => getAuditLogs(...a),
  },
}));

let selectedRegion = 'ALL';

jest.mock('@/lib/contexts/region-context', () => ({
  useRegion: () => ({
    selectedRegion,
    formatCurrencyValue: (n: number) => `QR ${n.toLocaleString('en-US')}`,
  }),
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

const { default: Page, loadDashboard } = require('../app/admin/page');

/** The real shape, trimmed from a live `GET /admin/dashboard` as superadmin. */
const STATS = {
  users: { total: 51, active: 26, newToday: 3 },
  orders: { total: 60, today: 12, pending: 24 },
  revenue: { total: 2615268.15, today: 22187.97 },
  sellers: { value: null, unavailable: 'Owned by another module — query that module API directly' },
  drivers: { value: null, unavailable: 'Owned by another module — query that module API directly' },
  // A real figure, not an "owned by another module" dash: the approval queue is
  // admin-service's own (`admin:kyc:pending:*`), so it counts the rows rather
  // than accumulating a free-standing counter (dispatch addendum item 13).
  // `sellers` and `drivers` still cover the unavailable path below.
  pendingKyc: { value: 4 },
  serviceSplit: null,
  generatedAt: '2026-09-11T19:38:43.822Z',
};

const ACTIVITY = [
  {
    _id: 'a1',
    actionType: 'console.auth.signed_in',
    actorId: 'u-1',
    actorEmail: 'superadmin@kartseek.com',
    entityType: 'auth',
    country: 'ALL',
    service: 'admin-console',
    createdAt: '2026-09-11T19:04:28.723Z',
  },
];

/** Strings that only ever existed in the deleted fixture arrays. */
const FIXTURE_STRINGS = [
  'FreshMart Organics', // recentActivity[0]
  'QuickRide Cabs',
  'Mumbai South Franchise',
  'Dubai Mall Express',
  'High CPU usage on API Gateway',
  '8,420', // modules[0].orders
  '5,100',
  'Order Volume', // the hourlyData chart heading
  '₹1.82L', // commission widget
  '₹4.2L',
  'GST Collected',
  '96.2%', // quick stats
  '24 min',
  '12 Pending Store Approvals', // the Action Required panel's invented counts
  '4 Escalated Support Tickets',
  'High Refund Rate Alert',
  'Surge', // modules[5].status
  'illustrative, not live', // the banner that apologised for the fixtures
];

const render = () => renderToStaticMarkup(React.createElement(Page));

beforeEach(() => {
  jest.clearAllMocks();
  selectedRegion = 'ALL';
  getDashboard.mockResolvedValue({ success: true, data: STATS });
  getAuditLogs.mockResolvedValue({ success: true, data: { data: ACTIVITY, total: 1 } });
  hookResult = {
    data: { ok: true, data: { stats: STATS, activity: ACTIVITY, activityRefusal: null } },
    loading: false,
    error: null,
  };
});

describe('/admin renders the API', () => {
  it('asks the dashboard and the audit trail', async () => {
    render();
    await Promise.resolve();
    expect(getDashboard).toHaveBeenCalled();
    expect(getAuditLogs).toHaveBeenCalledWith({ limit: 8 });
  });

  it('scopes the dashboard call to the selected market, and not when it is ALL', async () => {
    await loadDashboard('QA');
    expect(getDashboard).toHaveBeenCalledWith('QA');
    await loadDashboard(undefined);
    expect(getDashboard).toHaveBeenLastCalledWith(undefined);
  });

  it('renders the counters the API returned', () => {
    const html = render();
    // Anchored on the closing tag: a bare "12" would match a Tailwind class.
    expect(html).toContain('>51</p>'); // users.total
    expect(html).toContain('26 active');
    expect(html).toContain('3 new today');
    expect(html).toContain('>12</p>'); // orders.today
    expect(html).toContain('>24</p>'); // orders.pending
  });

  /**
   * Money is only meaningful inside one market.
   *
   * `getDashboardStats` sums `"order".orders.totalAmount` with no currency
   * dimension, and under "All markets" `region-context` formats against the
   * *home* market — so the card used to stamp QR on a figure that had added
   * QAR, INR, AED and SAR together, in the page's default view. That is the
   * defect the commission widget was deleted for.
   */
  it('prints a currency figure only when a single market is selected', () => {
    // ALL: no formatted total at all, and the reason is on screen.
    const all = render();
    expect(all).not.toContain('QR 22,187.97');
    expect(all).not.toContain('QR 2,615,268.15');
    expect(all).toContain('Revenue is per market');

    // One market: the figure is that market's, so it is printed.
    selectedRegion = 'QA';
    const qa = render();
    expect(qa).toContain('QR 22,187.97');
    expect(qa).toContain('QR 2,615,268.15');
    expect(qa).toContain('Order value today, Qatar');
    expect(qa).not.toContain('Revenue is per market');
  });

  it('reports a figure another module owns as unavailable, never as zero', () => {
    const html = render();
    expect(html).toContain('Owned by another module');
    // "0 sellers" on a platform with thousands is the worse of the two answers.
    expect(html).not.toContain('>0</p>');
  });

  it('renders a counter from another module when it is actually reported', () => {
    hookResult = {
      data: {
        ok: true,
        data: {
          stats: { ...STATS, sellers: { value: 1420, unavailable: '' } },
          activity: ACTIVITY,
          activityRefusal: null,
        },
      },
      loading: false,
      error: null,
    };
    expect(render()).toContain('1,420');
  });

  it('renders the audit trail as recent activity', () => {
    const html = render();
    expect(html).toContain('superadmin@kartseek.com');
    expect(html).toContain('auth.signed_in'); // auditHeadline drops the console. prefix
  });

  it.each(FIXTURE_STRINGS)('no longer renders the fixture string %s', (needle) => {
    expect(render()).not.toContain(needle);
  });

  it('links the module consoles without claiming figures for them', () => {
    const html = render();
    expect(html).toContain('/admin/marketplace');
    expect(html).toContain('/admin/grocery');
    expect(html).toContain('Per-module orders and revenue are not measured yet');
    expect(html).toContain('Plan C');
  });

  it('names what is not measured instead of drawing it', () => {
    const html = render();
    expect(html).toContain('Revenue by hour');
    expect(html).toContain('order-service reporting');
    expect(html).toContain('Commission earnings');
  });
});

describe('/admin activity panel', () => {
  it('says the trail refused it rather than showing an empty list', () => {
    hookResult = {
      data: {
        ok: true,
        data: {
          stats: STATS,
          activity: null,
          activityRefusal: 'Missing required permissions: audit.logs',
        },
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('could not read the audit trail');
    expect(html).toContain('GET /admin/audit-logs');
    expect(html).toContain('audit.logs');
    expect(html).not.toContain('The trail has no entries yet.');
    // The counters survive a refused trail — they are a different route.
    expect(html).toContain('>51</p>');
    expect(html).toContain('>24</p>');
  });

  it('says the trail is empty only when it really returned no rows', () => {
    hookResult = {
      data: { ok: true, data: { stats: STATS, activity: [], activityRefusal: null } },
      loading: false,
      error: null,
    };
    expect(render()).toContain('The trail has no entries yet.');
  });
});

describe('/admin failure states', () => {
  it('shows a forbidden panel when the server answered and refused', () => {
    hookResult = {
      data: {
        ok: false,
        kind: 'forbidden',
        message: 'Missing required permissions: dashboard.view',
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('You cannot open the platform dashboard.');
    expect(html).toContain('dashboard.view');
    expect(html).not.toContain('is not connected.');
  });

  it('shows a not-connected panel naming the route when nobody answered', () => {
    hookResult = {
      data: { ok: false, kind: 'unreachable', message: 'Admin service unavailable' },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('The platform dashboard is not connected.');
    expect(html).toContain('GET /admin/dashboard');
    expect(html).toContain('Admin service unavailable');
  });

  it('shows the skeleton while it is still asking, not a page of zeroes', () => {
    hookResult = { data: null, loading: true, error: null };
    const html = render();
    expect(html).toContain('loading-skeleton');
    expect(html).not.toContain('Recent activity');
  });
});

describe('loadDashboard', () => {
  it('fails the whole page when the counters cannot be read', async () => {
    getDashboard.mockResolvedValue({
      success: false,
      data: null,
      error: 'Admin service unavailable',
    });
    const res = await loadDashboard(undefined);
    expect(res).toMatchObject({ ok: false, kind: 'unreachable' });
  });

  it('keeps the counters when only the audit trail refuses', async () => {
    getAuditLogs.mockResolvedValue({
      success: false,
      data: null,
      error: 'Missing required permissions: audit.logs',
    });
    const res = await loadDashboard(undefined);
    expect(res.ok).toBe(true);
    expect(res.data.activity).toBeNull();
    expect(res.data.activityRefusal).toContain('audit.logs');
    expect(res.data.stats.users.total).toBe(51);
  });
});
