/**
 * /admin/roles renders `admin.admin_roles`, not a fixture array.
 *
 * Rendered with `react-dom/server` rather than Testing Library: this workspace's
 * Jest runs `testEnvironment: 'node'` and only matches `*.spec.ts`, and neither
 * `@testing-library/react` nor `jest-environment-jsdom` is installed anywhere in
 * the repo. A `.tsx` file here would never be collected at all — a test that
 * silently does not run is worse than no test. `useAdminData` is mocked so its
 * effect does not need to fire, and the fetcher it is handed is invoked, which
 * is what proves the page actually asks the API.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const listRoles = jest.fn();
const createRole = jest.fn();
const updateRole = jest.fn();
const deleteRole = jest.fn();

jest.mock('@/hooks/useMarketplaceRegionFilter', () => ({
  useMarketplaceRegionFilter: () => ({ regionLabel: 'All Markets', isFiltered: false }),
}));

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: {
    listRoles: (...a: unknown[]) => listRoles(...a),
    createRole: (...a: unknown[]) => createRole(...a),
    updateRole: (...a: unknown[]) => updateRole(...a),
    deleteRole: (...a: unknown[]) => deleteRole(...a),
  },
}));

/**
 * The viewer's permission keys, as `staff-page.spec.ts` does it.
 *
 * `staff.view` alone is a real state here: `GET /admin/roles` admits
 * `SUPER_ADMIN | ADMIN` holding `staff.view` and the seeded `admin` role holds
 * it, while every write on the controller is
 * `@Roles(SUPER_ADMIN, 'perm:staff.manage')`.
 */
let permissions: string[] = ['*'];

jest.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    hasPermission: (...perms: string[]) =>
      permissions.includes('*') || perms.every((p) => permissions.includes(p)),
  }),
}));

let hookState: { data: unknown; loading: boolean; error: string | null } = {
  data: null,
  loading: false,
  error: null,
};

jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    // Called synchronously so a page that never reaches the API fails here.
    try {
      void Promise.resolve(fetcher()).catch(() => undefined);
    } catch {
      /* a fetcher that throws is the page's business, not this mock's */
    }
    return { ...hookState, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => null,
  AdminErrorBanner: ({ error }: { error: string }) =>
    React.createElement('div', null, `Failed to load data: ${error}`),
}));

const RolesPage = require('../app/admin/roles/page').default;

const API_PAYLOAD = {
  data: [
    {
      id: 'r-1',
      key: 'regional_admin',
      name: 'Regional Admin',
      description: 'Everything an Admin can do, inside one market',
      permissions: ['dashboard.view', 'orders.view'],
      isSystem: true,
      userCount: 2,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'r-2',
      key: 'ops_lead',
      name: 'Operations Lead',
      description: 'Runs the delivery desk',
      permissions: ['dashboard.view'],
      isSystem: false,
      userCount: 0,
      createdAt: '2026-09-02T00:00:00.000Z',
      updatedAt: '2026-09-02T00:00:00.000Z',
    },
  ],
  permissions: [
    { key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard' },
    { key: 'orders.view', label: 'View Orders', group: 'Orders' },
  ],
};

/** Names that only ever existed in the deleted `INITIAL_ROLES` fixture array. */
const FIXTURE_NAMES = [
  'Country Manager',
  'State/District Manager',
  'Franchise Admin',
  'Taxi Vendor',
  'Delivery Boy',
  'Content/Promotion Manager',
  'Customer Support Agent',
];

const render = () => renderToStaticMarkup(React.createElement(RolesPage));

describe('/admin/roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permissions = ['*'];
    listRoles.mockResolvedValue({ success: true, data: API_PAYLOAD });
    hookState = { data: API_PAYLOAD, loading: false, error: null };
  });

  /**
   * A global ADMIN can reach this page by URL — the nav item is hidden, which
   * is not a gate — and every write control used to be drawn for them. Pressing
   * "Create Custom Role" filled the whole form and then answered "Insufficient
   * permissions. Your role cannot perform this action." The sibling staff page
   * was fixed for exactly this; the roles page was missed.
   */
  it('offers a staff.view reader the roles, and not one control that writes', () => {
    permissions = ['staff.view', 'dashboard.view'];
    const html = render();
    // The read the API does allow still renders.
    expect(html).toContain('Regional Admin');
    expect(html).toContain('title="View"');
    // The writes it refuses are not offered.
    expect(html).not.toContain('Create Custom Role');
    expect(html).not.toContain('title="Edit"');
    expect(html).not.toContain('title="Duplicate"');
    expect(html).not.toContain('title="Delete"');
    // …and the reason is said rather than left as an empty toolbar.
    expect(html).toContain('Read-only');
    expect(html).toContain('Manage Staff');
  });

  it('keeps every control for a viewer holding staff.manage', () => {
    permissions = ['staff.view', 'staff.manage'];
    const html = render();
    expect(html).toContain('Create Custom Role');
    expect(html).toContain('title="Edit"');
    expect(html).toContain('title="Duplicate"');
    // `ops_lead` is the one non-system row, so Delete is drawn for it.
    expect(html).toContain('title="Delete"');
    expect(html).not.toContain('Read-only');
  });

  it('renders the roles the API returned', () => {
    const html = render();
    expect(html).toContain('Regional Admin');
    expect(html).toContain('Operations Lead');
    expect(html).toContain('regional_admin');
    expect(html).toContain('ops_lead');
  });

  it('shows the API user count and permission vocabulary, not invented numbers', () => {
    const html = render();
    expect(html).toContain('>2<'); // Regional Admin's userCount
    expect(html).toContain('1/2'); // ops_lead holds 1 of the 2 declared permissions
    expect(html).toContain('SYSTEM');
    expect(html).toContain('CUSTOM');
  });

  it('asks the API for its rows', () => {
    render();
    expect(listRoles).toHaveBeenCalled();
  });

  it('renders none of the old fixture roles', () => {
    const html = render();
    for (const name of FIXTURE_NAMES) {
      expect(html).not.toContain(name);
    }
  });

  it('renders nothing at all when the API returns no roles', () => {
    hookState = { data: { data: [], permissions: [] }, loading: false, error: null };
    const html = render();
    expect(html).toContain('No roles match this filter.');
    for (const name of FIXTURE_NAMES) {
      expect(html).not.toContain(name);
    }
  });

  it('surfaces an API failure instead of falling back to fixtures', () => {
    hookState = { data: null, loading: false, error: 'Insufficient permissions.' };
    const html = render();
    expect(html).toContain('Failed to load data');
    expect(html).not.toContain('Regional Admin');
  });
});
