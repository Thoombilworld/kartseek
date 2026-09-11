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

/**
 * The viewer's permission keys. `staff.view` alone is a real state now: the
 * gateway admits a global ADMIN holding it to `GET /admin/staff` while every
 * write stays SUPER_ADMIN + `staff.manage`.
 */
let permissions: string[] = ['*'];

jest.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    hasPermission: (...perms: string[]) =>
      permissions.includes('*') || perms.every((p) => permissions.includes(p)),
  }),
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

const staffPageModule = require('../app/admin/staff/page');
const StaffPage = staffPageModule.default;
const { buildStaffUpdate, buildStaffCreate } = staffPageModule;

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
    permissions = ['*'];
    listRoles.mockResolvedValue({ success: true, data: ROLES_PAYLOAD });
    listStaff.mockResolvedValue({ success: true, data: STAFF_PAYLOAD });
  });

  it('gives a staff.view admin the directory without a single control that writes', () => {
    // The reads admit a global ADMIN holding `staff.view`; the writes do not.
    // Drawing "Add Staff Member" for them would be a button whose only outcome
    // is a 403 from the gateway.
    permissions = ['staff.view', 'dashboard.view'];
    const html = render();
    expect(html).toContain('superadmin@kartseek.com');
    expect(html).not.toContain('Add Staff Member');
    expect(html).not.toContain('title="Edit"');
    expect(html).not.toContain('title="Suspend"');
    expect(html).toContain('Read-only');
  });

  it('keeps every control for a viewer holding staff.manage', () => {
    permissions = ['staff.view', 'staff.manage'];
    const html = render();
    expect(html).toContain('Add Staff Member');
    expect(html).toContain('title="Edit"');
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

/**
 * The wire payloads, which is where the console and the gateway have to agree.
 * `UpdateStaffDto` declares no `email` and the gateway validates with
 * `forbidNonWhitelisted: true`, so an update carrying one is a 400, not a
 * harmless extra field.
 */
describe('staff payloads', () => {
  const form = {
    email: 'ae-admin@kartseek.com',
    firstName: 'Emirates',
    lastName: 'Admin',
    phone: '+971500000111',
    role: 'ADMIN',
    adminRoleId: 'r-2',
    regionCode: 'AE' as string | null,
    regionLocked: true,
    isActive: true,
  };

  it('never puts email in an update payload', () => {
    expect(Object.keys(buildStaffUpdate(form))).not.toContain('email');
    expect(buildStaffUpdate({ ...form, regionCode: null, regionLocked: false })).not.toHaveProperty(
      'email',
    );
  });

  it('sends every editable field the update contract declares', () => {
    expect(buildStaffUpdate(form)).toEqual({
      firstName: 'Emirates',
      lastName: 'Admin',
      phone: '+971500000111',
      role: 'ADMIN',
      adminRoleId: 'r-2',
      regionCode: 'AE',
      regionLocked: true,
      isActive: true,
    });
  });

  it('clears the market with an explicit null, not a dropped key', () => {
    const payload = buildStaffUpdate({ ...form, regionCode: null, regionLocked: false });
    expect(payload).toHaveProperty('regionCode');
    expect(payload.regionCode).toBeNull();
    expect(payload.regionLocked).toBe(false);
    // A dropped key would leave the old market in place on the server.
    expect(JSON.stringify(payload)).toContain('"regionCode":null');
  });

  it('omits isActive when the form did not offer it (the create modal)', () => {
    expect(buildStaffUpdate({ ...form, isActive: undefined })).not.toHaveProperty('isActive');
  });

  it('creates with an email and omits the market entirely when global', () => {
    expect(buildStaffCreate(form)).toMatchObject({
      email: 'ae-admin@kartseek.com',
      regionCode: 'AE',
      regionLocked: true,
    });
    const global = buildStaffCreate({ ...form, regionCode: null, regionLocked: false });
    // CreateStaffDto's regionCode is a two-letter string or absent — never null.
    expect(global).not.toHaveProperty('regionCode');
    expect(global.email).toBe('ae-admin@kartseek.com');
  });

  it('omits phone when it is blank rather than sending an empty string', () => {
    expect(buildStaffCreate({ ...form, phone: undefined })).not.toHaveProperty('phone');
    expect(buildStaffUpdate({ ...form, phone: '' })).not.toHaveProperty('phone');
  });
});
