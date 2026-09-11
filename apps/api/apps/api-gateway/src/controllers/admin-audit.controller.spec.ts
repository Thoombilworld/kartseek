import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminAuditController } from './admin-audit.controller';

/**
 * The audit trail is the one surface where a scoping mistake is invisible: a
 * leaked row reads exactly like a legitimate one, and the page that shows it
 * has no way to tell. These assertions are therefore about the *payload* the
 * gateway hands audit-log-service, not about what comes back.
 */
const qaAdmin = {
  id: 'u-qa',
  email: 'qa-admin@kartseek.com',
  role: 'ADMIN',
  regionCode: 'QA',
  regionLocked: true,
};
const globalAdmin = { id: 'u-g', email: 'superadmin@kartseek.com', role: 'SUPER_ADMIN' };
const req = (user: object, headers: Record<string, string> = {}) => ({
  user,
  method: 'GET',
  originalUrl: '/admin/audit-logs',
  ip: '10.0.0.9',
  headers,
});

describe('AdminAuditController', () => {
  let client: { send: ReturnType<typeof vi.fn> };
  let ctrl: AdminAuditController;

  beforeEach(() => {
    client = { send: vi.fn(() => of({ data: [], total: 0, page: 1, limit: 50 })) };
    ctrl = new AdminAuditController(client as any);
  });

  const payload = () => client.send.mock.calls[0][1];

  it("confines a locked admin's list to their market", async () => {
    await ctrl.list(req(qaAdmin), 1, 50);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'audit.query' },
      expect.objectContaining({ scope: 'QA', country: 'QA' }),
    );
  });

  it('sends no scope for a global admin, and passes their market filter through', async () => {
    await ctrl.list(
      req(globalAdmin),
      1,
      50,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'qa',
    );
    expect(payload().scope).toBeUndefined();
    expect(payload().country).toBe('QA');
  });

  it('refuses a locked admin who asks for another market, without reaching the service', () => {
    // Thrown before the RPC, so the refusal is not a filtered result the caller
    // could mistake for "no activity in India".
    expect(() =>
      ctrl.list(req(qaAdmin), 1, 50, undefined, undefined, undefined, undefined, undefined, 'IN'),
    ).toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('caps the page size so one request cannot drain the collection', async () => {
    await ctrl.list(req(globalAdmin), 1, 100_000);
    expect(payload().limit).toBe(200);
  });

  it('forwards the actor, entity, action and date filters', async () => {
    await ctrl.list(
      req(globalAdmin),
      2,
      25,
      'u-1',
      'someone@kartseek.com',
      'sellers',
      'e-1',
      'http.post.',
      undefined,
      '2026-09-01',
      '2026-09-02',
    );
    expect(payload()).toMatchObject({
      page: 2,
      limit: 25,
      actorId: 'u-1',
      actorEmail: 'someone@kartseek.com',
      entityType: 'sellers',
      entityId: 'e-1',
      actionType: 'http.post.',
      from: '2026-09-01',
      to: '2026-09-02',
    });
  });

  it("scopes one entity's history too", async () => {
    await ctrl.byEntity(req(qaAdmin), 'banners', 'b-1');
    expect(payload()).toMatchObject({ entityType: 'banners', entityId: 'b-1', scope: 'QA' });
  });

  it('records the actor from the token, never from the body', async () => {
    await ctrl.record(req(qaAdmin, { 'x-request-id': 'r-1' }), {
      action: 'note',
      entityType: 'sellers',
      entityId: 'e-9',
      // A caller trying to write the trail as somebody else. `AuditEntryDto`
      // does not declare these and the global pipe strips them, but the
      // controller must not read them even if they arrive.
      ...({ actorId: 'u-someone-else', actorEmail: 'victim@kartseek.com' } as object),
    } as any);
    const sent = payload();
    expect(sent.actorId).toBe('u-qa');
    expect(sent.actorEmail).toBe('qa-admin@kartseek.com');
    expect(sent.actionType).toBe('console.note');
    expect(sent.country).toBe('QA');
    expect(sent.service).toBe('admin-console');
    expect(sent.metadata).toMatchObject({ source: 'console', requestId: 'r-1' });
  });

  it('records a global admin against the market they are acting in, not their own', async () => {
    await ctrl.record(req(globalAdmin, { 'x-region-code': 'AE' }), {
      action: 'note',
      entityType: 'sellers',
      entityId: 'e-9',
    });
    expect(payload().country).toBe('AE');
  });

  it('prefers the forwarded client address over the socket address', async () => {
    await ctrl.record(req(globalAdmin, { 'x-forwarded-for': '203.0.113.7, 10.1.1.1' }), {
      action: 'note',
    });
    expect(payload().actorIp).toBe('203.0.113.7');
  });
});
