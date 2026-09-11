/**
 * /admin/staff renders real staff accounts, not `DEMO_STAFF`.
 *
 * Same harness note as `roles-page.spec.ts`: this workspace's Jest is
 * `testEnvironment: 'node'` with a `*.spec.ts` testMatch and no Testing
 * Library, so the page is rendered through `react-dom/server` and
 * `useAdminData` is mocked to supply data without an effect.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const listRoles = jest.fn();
const listStaff = jest.fn();
const createStaff = jest.fn();
const updateStaff = jest.fn();

jest.mock('@/hooks/useMarketplaceRegionFilter', () => ({
  useMarketplaceRegionFilter: () => ({ regionLabel: 'All Markets', isFiltered: false }),
}));

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    listRoles: (...a: unknown[]) => listRoles(...a),
    listStaff: (...a: unknown[]) => listStaff(...a),
    createStaff: (...a: unknown[]) => createStaff(...a),
    updateStaff: (...a: unknown[]) => updateStaff(...a),
  },
}));

const ROLES_PAYLOAD = {
  data: [
    {
      id: 'r-1',
      key: 'admin',
      name: 'Admin',
      description: null,
      permissions: ['dashboard.view'],
      isSystem: true,
      userCount: 1,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 'r-2',
      key: 'regional_admin',
      name: 'Regional Admin',
      description: null,
      permissions: ['dashboard.view'],
      isSystem: true,
      userCount: 1,
      createdAt: null,
      updatedAt: null,
    },
  ],
  permissions: [{ key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard' }],
};

const STAFF_PAYLOAD = {
  data: [
    {
      id: 'u-1',
      email: 'superadmin@kartseek.com',
      name: 'Super Admin',
      firstName: 'Super',
      lastName: 'Admin',
      hasPhone: false,
      role: 'SUPER_ADMIN',
      adminRoleId: 'r-1',
      regionCode: null,
      regionLocked: false,
      isActive: true,
      status: 'active',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'u-2',
      email: 'ae-admin@kartseek.com',
      name: 'Emirates Admin',
      firstName: 'Emirates',
      lastName: 'Admin',
      hasPhone: true,
      role: 'ADMIN',
      adminRoleId: 'r-2',
      regionCode: 'AE',
      regionLocked: true,
      isActive: false,
      status: 'suspended',
      createdAt: '2026-09-10T00:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 50,
};

/**
 * The hook is called twice by this page — roles first, then staff. Each mock
 * result is handed out in that order, which is also what pins the order.
 */
let results: Array<{ data: unknown; loading: boolean; error: string | null }> = [];
let call = 0;

jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    try {
      void Promise.resolve(fetcher()).catch(() => undefined);
    } catch {
      /* the page's business, not this mock's */
    }
    const state = results[call++] ?? { data: null, loading: false, error: null };
    return { ...state, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => null,
  AdminErrorBanner: ({ error }: { error: string }) =>
    React.createElement('div', null, `Failed to load data: ${error}`),
}));

const StaffPage = require('../app/admin/staff/page').default;

/** Strings that only ever existed in the deleted DEMO_STAFF / DEPARTMENTS / REGIONS arrays. */
const FIXTURE_STRINGS = [
  'Rajesh Kumar',
  'rajesh@kartseek.com',
  'Sarah Al-Rashid',
  'James Patterson',
  'Priya Sharma',
  'STF-001',
  'Engineering',
  'All Regions',
  'Bulk Enable 2FA',
];

function render(
  roles = ROLES_PAYLOAD,
  staff: unknown = STAFF_PAYLOAD,
  error: string | null = null,
) {
  call = 0;
  results = [
    { data: roles, loading: false, error: null },
    { data: error ? null : staff, loading: false, error },
  ];
  return renderToStaticMarkup(React.createElement(StaffPage));
}

describe('/admin/staff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRoles.mockResolvedValue({ success: true, data: ROLES_PAYLOAD });
    listStaff.mockResolvedValue({ success: true, data: STAFF_PAYLOAD });
  });

  it('renders the staff accounts the API returned', () => {
    const html = render();
    expect(html).toContain('Super Admin');
    expect(html).toContain('superadmin@kartseek.com');
    expect(html).toContain('Emirates Admin');
    expect(html).toContain('ae-admin@kartseek.com');
  });

  it('shows each account’s permission role, market and lock from the API', () => {
    const html = render();
    expect(html).toContain('Regional Admin');
    expect(html).toContain('AE');
    expect(html).toContain('Every market');
    expect(html).toContain('Suspended');
    expect(html).toContain('Active');
  });

  it('asks the API for both roles and staff', () => {
    render();
    expect(listRoles).toHaveBeenCalled();
    expect(listStaff).toHaveBeenCalled();
  });

  it('renders none of the old demo staff or fixture filter lists', () => {
    const html = render();
    for (const s of FIXTURE_STRINGS) {
      expect(html).not.toContain(s);
    }
  });

  it('renders an empty directory rather than demo colleagues', () => {
    const html = render(ROLES_PAYLOAD, { data: [], total: 0, page: 1, limit: 50 });
    expect(html).toContain('No staff accounts match this filter.');
    for (const s of FIXTURE_STRINGS) {
      expect(html).not.toContain(s);
    }
  });

  it('surfaces an API failure instead of falling back to fixtures', () => {
    const html = render(ROLES_PAYLOAD, null, 'Insufficient permissions.');
    expect(html).toContain('Failed to load data');
    expect(html).not.toContain('ae-admin@kartseek.com');
  });

  it('offers markets as ISO-2 codes from the localization registry', () => {
    const html = render();
    // A code the old hard-coded REGIONS name list could not have produced.
    expect(html).toMatch(/value="[A-Z]{2}"/);
  });
});
