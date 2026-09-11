/**
 * `/admin/audit-logs` never renders an empty table for a failure it did not
 * understand.
 *
 * The defect this guards: `useAdminData` classifies auth-shaped *throws* as
 * "degrade gracefully" (`data = null`, `error = null`), so a page whose fetcher
 * threw on `!res.success` took its success branch for an expired token and drew
 * "No audit entries match these filters" — the "nothing happened" lie the whole
 * surface exists to prevent. The fetcher now resolves a result instead, which is
 * what these assertions pin down: whatever the hook does with errors, the page
 * decides for itself.
 *
 * Rendered with `react-dom/server`, like `roles-page.spec.ts`: this workspace's
 * Jest runs `testEnvironment: 'node'`, collects only `*.spec.ts`, and has
 * neither `@testing-library/react` nor `jest-environment-jsdom` installed.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getAuditLogs = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/admin/audit-logs',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/api/admin-core', () => ({
  adminCoreApi: { getAuditLogs: (...a: unknown[]) => getAuditLogs(...a) },
}));

/**
 * Stands in for `useAdminData`, faithfully: it runs the fetcher and hands back
 * whatever it *resolves*, and — crucially — swallows a rejection into
 * `data: null, error: null`, exactly as the real hook does for auth-shaped
 * errors. A page that goes back to throwing would fail here.
 */
let hookResult: { data: unknown; loading: boolean; error: string | null };

jest.mock('@/hooks/useAdminData', () => ({
  useAdminData: (fetcher: () => Promise<unknown>) => {
    try {
      void Promise.resolve(fetcher()).catch(() => undefined);
    } catch {
      /* the page's business, not this mock's */
    }
    return { ...hookResult, refetch: jest.fn(), toast: null, showToast: jest.fn() };
  },
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
  AdminToast: () => null,
  AdminLoadingSkeleton: () => null,
  AdminErrorBanner: ({ error }: { error: string }) => React.createElement('div', null, error),
}));

const { AuditLogsScreen } = require('../app/admin/audit-logs/page');

const render = () =>
  renderToStaticMarkup(
    React.createElement(AuditLogsScreen, {
      title: 'Security Audit Logs',
      subtitle: 'sub',
      csvName: 'audit-logs',
    }),
  );

const EMPTY_TABLE = 'No audit entries match these filters';

describe('/admin/audit-logs failure states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuditLogs.mockResolvedValue({
      success: true,
      data: { data: [], total: 0, page: 1, limit: 50 },
    });
    hookResult = { data: null, loading: false, error: null };
  });

  it('asks the API for its rows', () => {
    render();
    expect(getAuditLogs).toHaveBeenCalled();
  });

  it.each([
    ['an expired session', 'You must be logged in to access this resource.'],
    ['a token that cannot be used', 'This token cannot be used to access resources.'],
    ['an unreachable gateway', 'Network error — API Gateway unreachable'],
    ['a dead audit service', 'Audit service unavailable'],
  ])('shows the not-connected panel for %s, naming the route', (_label, message) => {
    hookResult = { data: { ok: false, kind: 'unreachable', message }, loading: false, error: null };
    const html = render();
    expect(html).toContain('The audit trail is not connected.');
    expect(html).toContain('GET /admin/audit-logs');
    expect(html).toContain(message);
    expect(html).not.toContain(EMPTY_TABLE);
  });

  it('shows a distinct forbidden panel when the server answered and refused', () => {
    // "did not answer" would be false — it answered, and said no.
    hookResult = {
      data: { ok: false, kind: 'forbidden', message: 'Missing required permissions: audit.logs' },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('You cannot read this audit trail.');
    expect(html).toContain('audit.logs');
    expect(html).not.toContain('The audit trail is not connected.');
    expect(html).not.toContain(EMPTY_TABLE);
  });

  it('still fails visibly if the hook ever surfaces a thrown error instead', () => {
    hookResult = { data: null, loading: false, error: 'Audit service unavailable' };
    const html = render();
    expect(html).toContain('The audit trail is not connected.');
    expect(html).not.toContain(EMPTY_TABLE);
  });

  it('says the table is empty only when the API actually returned no rows', () => {
    hookResult = {
      data: { ok: true, page: { data: [], total: 0, page: 1, limit: 50 } },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain(EMPTY_TABLE);
    expect(html).not.toContain('The audit trail is not connected.');
  });

  it('renders the rows the API returned, and no invented ones', () => {
    hookResult = {
      data: {
        ok: true,
        page: {
          data: [
            {
              _id: 'a1',
              actionType: 'console.note',
              actorId: 'u-qa',
              actorEmail: 'qa-admin@kartseek.com',
              actorRole: 'admin',
              entityType: 'sellers',
              entityId: 'e-1',
              country: 'QA',
              service: 'admin-console',
              createdAt: '2026-09-11T10:00:00.000Z',
              metadata: { requestId: 'req-9' },
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
        },
      },
      loading: false,
      error: null,
    };
    const html = render();
    expect(html).toContain('qa-admin@kartseek.com');
    expect(html).toContain('console.note');
    expect(html).toContain('req-9');
    // Names that only ever existed in the deleted seed array.
    expect(html).not.toContain('Sarah Al-Rashid');
    expect(html).not.toContain('192.168.1.10');
  });
});
