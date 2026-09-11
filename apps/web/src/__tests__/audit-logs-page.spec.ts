/**
 * `/admin/audit-logs` reads the platform trail — and the pieces that decide
 * *what* it asks for are pure, so they are tested directly.
 *
 * This workspace's Jest runs `testEnvironment: 'node'` and collects only
 * `*.spec.ts`; neither `@testing-library/react` nor `jest-environment-jsdom` is
 * installed anywhere in the repo (see `roles-page.spec.ts`). The three things
 * that can go silently wrong here — a filter that never reaches the query, a
 * CSV column that exports a different value than the row shows, and a console
 * action posted with the wrong body — are all pure functions, so they are
 * asserted without rendering anything.
 */
import {
  AUDIT_CSV_COLUMNS,
  AUDIT_PAGE_SIZE,
  MARKETPLACE_ENTITY_TYPES,
  auditOutcome,
  auditRequestId,
  formatAuditTime,
  parseAuditQuery,
} from '../app/admin/audit-logs/page';
import { auditPostPayload } from '@/lib/contexts/audit-context';
import { toCsv } from '../lib/export-csv';

type AuditRow = Parameters<(typeof AUDIT_CSV_COLUMNS)[number]['value']>[0];

const row: AuditRow = {
  _id: 'a1',
  actionType: 'http.post./api/v1/admin/marketplace/banners',
  actorId: 'u-qa',
  actorEmail: 'qa-admin@kartseek.com',
  actorRole: 'admin',
  actorIp: '203.0.113.7',
  entityType: 'banners',
  entityId: 'b-1',
  country: 'QA',
  service: 'api-gateway',
  createdAt: '2026-09-11T10:00:00.000Z',
  metadata: { requestId: 'req-9', statusCode: 201, outcome: 'success' },
};

describe('parseAuditQuery', () => {
  it('reads every filter the page offers off the URL', () => {
    const q = parseAuditQuery(
      new URLSearchParams({
        page: '3',
        actionType: 'http.post.',
        entityType: 'sellers',
        actorEmail: 'qa-admin@kartseek.com',
        from: '2026-09-01',
        to: '2026-09-02',
      }),
    );
    expect(q).toEqual({
      page: 3,
      limit: AUDIT_PAGE_SIZE,
      actionType: 'http.post.',
      entityType: 'sellers',
      actorEmail: 'qa-admin@kartseek.com',
      from: '2026-09-01',
      to: '2026-09-02',
    });
  });

  it('drops empty and whitespace-only filters instead of sending them', () => {
    // `?actorEmail=` reaching the API as an empty string would filter on the
    // empty address and return nothing, which reads as "no activity".
    const q = parseAuditQuery(new URLSearchParams({ actorEmail: '   ', entityType: '' }));
    expect(q.actorEmail).toBeUndefined();
    expect(q.entityType).toBeUndefined();
  });

  it('defaults to the first page when the URL has no page, or a nonsense one', () => {
    expect(parseAuditQuery(new URLSearchParams()).page).toBe(1);
    expect(parseAuditQuery(new URLSearchParams({ page: '0' })).page).toBe(1);
    expect(parseAuditQuery(new URLSearchParams({ page: 'abc' })).page).toBe(1);
  });

  it("lets the URL override a page's preset entity type", () => {
    // The marketplace page presets nothing by default, but when a caller does
    // preset one the reader must still be able to change it.
    expect(parseAuditQuery(new URLSearchParams(), { entityType: 'sellers' }).entityType).toBe(
      'sellers',
    );
    expect(
      parseAuditQuery(new URLSearchParams({ entityType: 'orders' }), { entityType: 'sellers' })
        .entityType,
    ).toBe('orders');
  });

  it('offers the marketplace record kinds the trail actually carries', () => {
    expect(MARKETPLACE_ENTITY_TYPES).toContain('sellers');
    expect(MARKETPLACE_ENTITY_TYPES).toContain('banners');
    expect(MARKETPLACE_ENTITY_TYPES).toContain('payouts');
  });
});

describe('audit row presentation', () => {
  it('reports the outcome the gateway recorded', () => {
    expect(auditOutcome(row)).toEqual({ label: 'success 201', ok: true });
  });

  it('marks a failed request as failed', () => {
    expect(auditOutcome({ ...row, metadata: { statusCode: 403, outcome: 'error' } }).ok).toBe(
      false,
    );
  });

  it('says nothing about an entry that carries no outcome, rather than claiming success', () => {
    // Console-originated rows have no status code — the console recorded an
    // action, it did not observe an HTTP result.
    expect(auditOutcome({ ...row, metadata: { source: 'console' } })).toEqual({
      label: '—',
      ok: null,
    });
  });

  it('falls back visibly when there is no request id or timestamp', () => {
    expect(auditRequestId({ ...row, metadata: {} })).toBe('—');
    expect(formatAuditTime(undefined)).toBe('—');
    expect(formatAuditTime('not-a-date')).toBe('—');
  });
});

describe('CSV export', () => {
  it('exports the columns the table shows, in the same order', () => {
    expect(AUDIT_CSV_COLUMNS.map((c) => c.header)).toEqual([
      'Time',
      'Action',
      'Actor ID',
      'Actor Email',
      'Actor Role',
      'Entity Type',
      'Entity ID',
      'Market',
      'Service',
      'Request ID',
      'Outcome',
      'IP',
      'Reason',
    ]);
  });

  it('maps a row to the same values the table renders', () => {
    const csv = toCsv([row], AUDIT_CSV_COLUMNS);
    const [, body] = csv.split('\r\n');
    expect(body).toContain('"qa-admin@kartseek.com"');
    expect(body).toContain('"banners"');
    expect(body).toContain('"QA"');
    expect(body).toContain('"req-9"');
    expect(body).toContain('"success 201"');
  });

  it('exports an empty cell rather than "undefined" for a missing field', () => {
    const csv = toCsv([{ ...row, actorEmail: undefined, reason: undefined }], AUDIT_CSV_COLUMNS);
    expect(csv).not.toContain('undefined');
  });
});

describe('console-originated entries', () => {
  it('posts the action namespaced by module, with severity kept in details', () => {
    expect(auditPostPayload('Admin signed in', 'Auth', 'user@x signed in')).toEqual({
      action: 'Auth.Admin signed in',
      entityType: 'Auth',
      details: { details: 'user@x signed in', severity: 'info' },
    });
  });

  it('names no actor and no market — the gateway takes both from the token', () => {
    // `AuditEntryDto` is whitelisted with `forbidNonWhitelisted`, so any of
    // these in the body would be a 400; more importantly, a console that could
    // name its own actor could write the trail as somebody else.
    const payload = auditPostPayload('Admin signed out', 'Auth') as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['action', 'details', 'entityType']);
    expect(payload.adminId).toBeUndefined();
    expect(payload.country).toBeUndefined();
  });
});
