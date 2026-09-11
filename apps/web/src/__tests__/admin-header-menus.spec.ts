/**
 * The console header's two dropdowns read the gateway, and say so when they
 * cannot.
 *
 * Both were literal arrays rendered on every admin page: four notifications
 * ("FreshMart Store applied for marketplace access") under a hard-coded "4 new"
 * badge, and three security alerts ("Admin login attempt from unrecognized
 * device in Lagos, Nigeria") under "2 active". The red and amber dots were
 * painted on unconditionally, so neither ever meant anything.
 *
 * The fetching halves (`NotificationsMenu`, `SecurityMenu`) are a `useEffect`,
 * which `renderToStaticMarkup` never runs — so the presentation is split into
 * `*MenuView`, which takes the answer as a prop. That is what is asserted here:
 * the loading state was the only one that was ever right, and it is the only one
 * a fetching component could be tested in.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/admin',
}));

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: { getSecurityStatus: jest.fn() },
}));

jest.mock('@/lib/api/admin-marketplace', () => ({
  adminMarketplaceApi: { getNotifications: jest.fn() },
}));

jest.mock('@/lib/contexts/region-context', () => ({
  useRegion: () => ({ selectedRegion: 'ALL', setSelectedRegion: jest.fn() }),
  REGIONS: {},
}));

jest.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    hasPermission: () => true,
    logout: jest.fn(),
    isHydrated: true,
  }),
}));

jest.mock('@/lib/contexts/audit-context', () => ({
  useAudit: () => ({ logAction: jest.fn() }),
  AuditProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/shared/locale-switcher', () => ({ LocaleSwitcher: () => null }));
jest.mock('@/components/shared/country-flag', () => ({ CountryFlag: () => null }));
jest.mock('@/components/shared/dismiss-on-escape', () => ({ DismissOnEscape: () => null }));

const { NotificationsMenuView, SecurityMenuView } = require('../app/admin/layout');

const noop = () => {};

const renderNotifications = (state: unknown) =>
  renderToStaticMarkup(
    React.createElement(NotificationsMenuView, {
      open: true,
      onToggle: noop,
      onClose: noop,
      state,
    }),
  );

const renderSecurity = (state: unknown) =>
  renderToStaticMarkup(
    React.createElement(SecurityMenuView, { open: true, onToggle: noop, onClose: noop, state }),
  );

/** The four literals the header used to carry. */
const OLD_NOTIFICATIONS = [
  // The market-lock copy this round removed: the feed is personal now, so it
  // was telling regional admins their own inbox was somebody else's.
  'Platform notifications are not available for regional admins',
  'these rows belong to every market',
  'FreshMart Store applied for marketplace access',
  'Order #KS-28491 flagged',
  'Mohammed Al-Salem documents verified successfully',
  'v3.12.0 deployed to all regions',
  '4 new',
];

/** The three the security dropdown used to carry. */
const OLD_ALERTS = [
  'Rate limit breach detected',
  'Lagos, Nigeria',
  'Certificate for api.kartseek.com expires in 14 days',
  '2 active',
];

describe('header notifications', () => {
  it('renders the rows the API returned, with the unread count it was given', () => {
    const html = renderNotifications({
      phase: 'ready',
      value: {
        data: [
          { id: 'n1', title: 'Seller approved', message: 'Al Meera Stores is live', isRead: false },
          { id: 'n2', title: 'Payout batch', message: 'Ready', isRead: true },
        ],
        total: 2,
        unreadCount: 1,
      },
    });
    expect(html).toContain('Seller approved');
    expect(html).toContain('Al Meera Stores is live');
    expect(html).toContain('1 unread'); // counted by the server — not "4 new"
  });

  /**
   * The badge is the server's count, not `data.filter(...)`: the route returns
   * the newest 50, and an unread row older than that still has to reach it.
   */
  it('trusts the server count over what fits on the page', () => {
    const html = renderNotifications({
      phase: 'ready',
      value: {
        data: [{ id: 'n1', title: 'One read row', isRead: true }],
        total: 1,
        unreadCount: 12,
      },
    });
    expect(html).toContain('12 unread');
  });

  it('falls back to counting the page when no count was sent', () => {
    const html = renderNotifications({
      phase: 'ready',
      value: { data: [{ id: 'n1', title: 'Unread row', isRead: false }], total: 1 },
    });
    expect(html).toContain('1 unread');
  });

  it('shows no red dot when nothing is unread', () => {
    const html = renderNotifications({
      phase: 'ready',
      value: { data: [{ id: 'n1', title: 'Read one', isRead: true }], total: 1, unreadCount: 0 },
    });
    expect(html).not.toContain('bg-red-500 rounded-full');
    expect(html).not.toContain('unread');
  });

  /**
   * `MarketplaceNotification` has no `priority` column — only the four deleted
   * fabricated rows had one, so a priority dot was grey for every genuine row.
   * `isRead` is a real column, and unread is what a reader is looking for.
   */
  it('marks rows by unread, which is a real column, not by priority', () => {
    const html = renderNotifications({
      phase: 'ready',
      value: {
        data: [
          { id: 'n1', title: 'Unread row', isRead: false },
          { id: 'n2', title: 'Read row', isRead: true },
        ],
        total: 2,
        unreadCount: 1,
      },
    });
    expect(html).toContain('rounded-full mt-1.5 shrink-0 bg-blue-500');
    expect(html).toContain('rounded-full mt-1.5 shrink-0 bg-slate-300');
    // The colours the priority branch used, which nothing can set any more.
    expect(html).not.toContain('rounded-full mt-1.5 shrink-0 bg-amber-500');
    expect(html).not.toContain('rounded-full mt-1.5 shrink-0 bg-red-500');
  });

  /**
   * The feed is each administrator's own inbox, so a market lock has nothing to
   * confine and the route no longer refuses one. The header used to say
   * "Platform notifications are not available for regional admins — these rows
   * belong to every market", which became false the moment the rows became
   * personal. A 403 now means something else entirely, so the server's own words
   * are shown instead of a guess.
   */
  it('shows the server’s reason for a refusal, not a guess about market scope', () => {
    const html = renderNotifications({
      phase: 'forbidden',
      message: 'Your session does not identify you; sign in again.',
    });
    expect(html).toContain('You cannot read this feed.');
    expect(html).toContain('Your session does not identify you; sign in again.');
    expect(html).not.toContain('regional admins');
    expect(html).not.toContain('belong to every market');
    expect(html).not.toContain('Not connected.');
    expect(html).not.toContain('bg-red-500 rounded-full');
  });

  it('names the route when nobody answered', () => {
    const html = renderNotifications({
      phase: 'unreachable',
      message: 'Network error — API Gateway unreachable',
    });
    expect(html).toContain('Not connected.');
    expect(html).toContain('GET /admin/marketplace/notifications');
    expect(html).toContain('Network error — API Gateway unreachable');
    expect(html).not.toContain('Nothing to report.');
  });

  it('says the feed is empty only when it really returned no rows', () => {
    const html = renderNotifications({
      phase: 'ready',
      value: { data: [], total: 0, unreadCount: 0 },
    });
    expect(html).toContain('Nothing to report.');
    expect(html).not.toContain('Not connected.');
  });

  it.each(OLD_NOTIFICATIONS)('no longer carries the literal %s', (needle) => {
    const states = [
      { phase: 'loading' },
      { phase: 'ready', value: { data: [], total: 0, unreadCount: 0 } },
      { phase: 'forbidden', message: 'nope' },
      { phase: 'unreachable', message: 'nope' },
    ];
    states.forEach((state) => expect(renderNotifications(state)).not.toContain(needle));
  });
});

describe('header security menu', () => {
  const STATUS = {
    level: 'elevated',
    httpBansToday: 7,
    wsBansToday: 2,
    activeBans: 3,
    isHttpAttackMode: true,
    isWsAttackMode: false,
    timestamp: '2026-09-11T19:38:19.311Z',
  };

  it('renders the counters the threat status returned', () => {
    const html = renderSecurity({ phase: 'ready', value: STATUS });
    expect(html).toContain('elevated');
    expect(html).toContain('Bans in force');
    expect(html).toContain('>3</span>');
    expect(html).toContain('>7</span>');
    expect(html).toContain('Attack mode is on for HTTP traffic');
  });

  it('raises no amber dot while the platform is calm', () => {
    const html = renderSecurity({
      phase: 'ready',
      value: { ...STATUS, level: 'normal', isHttpAttackMode: false },
    });
    expect(html).toContain('normal');
    expect(html).not.toContain('bg-amber-500 rounded-full');
    expect(html).not.toContain('Attack mode is on');
  });

  it('names the permission when the role does not hold it', () => {
    const html = renderSecurity({
      phase: 'forbidden',
      message: 'Missing required permissions: security.manage',
    });
    expect(html).toContain('security.manage');
    expect(html).not.toContain('Not connected.');
  });

  it('names the route when nobody answered', () => {
    const html = renderSecurity({ phase: 'unreachable', message: 'Security service unavailable' });
    expect(html).toContain('Not connected.');
    expect(html).toContain('GET /admin/security/status');
  });

  it.each(OLD_ALERTS)('no longer carries the literal %s', (needle) => {
    const states = [
      { phase: 'loading' },
      { phase: 'ready', value: STATUS },
      { phase: 'forbidden', message: 'nope' },
      { phase: 'unreachable', message: 'nope' },
    ];
    states.forEach((state) => expect(renderSecurity(state)).not.toContain(needle));
  });
});
