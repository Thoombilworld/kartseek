import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AuditInterceptor, AUDIT_TOPIC } from './audit.interceptor';

/**
 * An audit row's market comes from the signed claim, never from a header.
 *
 * What it used to be (whole-branch review, finding A-4):
 * `country: req.headers?.['x-region-code'] ?? req.user?.regionCode ?? 'UNKNOWN'`
 * — the client-controlled header ahead of the claim. So a QA-locked admin could
 * send `x-region-code: IN` and have their own mutation filed under IN, out of
 * the trail their own market reads back (`audit-log.service.ts` filters a
 * locked reader to `country ∈ [scope, 'ALL']`). This was the one place on the
 * branch where a market was taken from a header ahead of a token.
 *
 * The rule now: a LOCKED caller's market is their claim, full stop. An
 * UNLOCKED caller may still narrow with the header — that is the console
 * telling the trail which market the operator was working in, and an unlocked
 * account is entitled to every market anyway, so there is nothing to widen to.
 */
const ctx = (req: any) =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ statusCode: 200 }),
    }),
  }) as any;

const next = { handle: () => of({ ok: true }) } as any;

function build() {
  const published: Array<{ topic: string; payload: any }> = [];
  const sink = {
    publish: vi.fn(async (topic: string, payload: any) => {
      published.push({ topic, payload });
    }),
  };
  return { interceptor: new AuditInterceptor(sink), published, sink };
}

const request = (user: any, headers: Record<string, string> = {}) => ({
  user,
  method: 'PATCH',
  url: '/api/v1/admin/marketplace/sellers/abc/approve',
  headers: { 'user-agent': 'spec', ...headers },
  ip: '10.0.0.1',
  socket: { remoteAddress: '10.0.0.1' },
});

async function recordOne(req: any) {
  const { interceptor, published } = build();
  await new Promise<void>((resolve) => {
    interceptor.intercept(ctx(req), next).subscribe({ complete: () => resolve() });
  });
  // `record` never awaits its publish, on purpose. One tick is enough.
  await Promise.resolve();
  await Promise.resolve();
  return published;
}

const qaLocked = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'ADMIN' };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN', regionCode: 'QA', regionLocked: true };

describe('the audit row market', () => {
  it('ignores the x-region-code header for a locked admin', async () => {
    const published = await recordOne(request(qaLocked, { 'x-region-code': 'IN' }));
    expect(published).toHaveLength(1);
    expect(published[0].topic).toBe(AUDIT_TOPIC);
    expect(published[0].payload.country).toBe('QA');
  });

  it('uses the claim for a locked admin who sends no header', async () => {
    const published = await recordOne(request(qaLocked));
    expect(published[0].payload.country).toBe('QA');
  });

  it('lets an unlocked admin name the market they are working in', async () => {
    const published = await recordOne(request(globalAdmin, { 'x-region-code': 'IN' }));
    expect(published[0].payload.country).toBe('IN');
  });

  it('falls back to an unlocked admin own region, then to UNKNOWN', async () => {
    const withClaim = await recordOne(request({ ...globalAdmin, regionCode: 'AE' }));
    expect(withClaim[0].payload.country).toBe('AE');
    const withNothing = await recordOne(request(globalAdmin));
    expect(withNothing[0].payload.country).toBe('UNKNOWN');
  });

  it('treats a SUPER_ADMIN as unlocked, whatever the columns say', async () => {
    // `marketScopeOf` never reports a SUPER_ADMIN as locked — they are global
    // by definition — so the header is theirs to use.
    const published = await recordOne(request(superAdmin, { 'x-region-code': 'IN' }));
    expect(published[0].payload.country).toBe('IN');
  });

  it('never stamps ALL from the interceptor', async () => {
    // `'ALL'` means "an action belonging to every market" and is written only
    // by the console route, and only for an unlocked caller. A request the
    // interceptor cannot attribute is `UNKNOWN`, which no locked reader sees.
    const published = await recordOne(request(globalAdmin));
    expect(published[0].payload.country).not.toBe('ALL');
  });

  it('publishes mutations only, and carries the actor from the token', async () => {
    const published = await recordOne(request(qaLocked));
    expect(published[0].payload.actorId).toBe('u-qa');
    const reads = await recordOne({ ...request(qaLocked), method: 'GET' });
    expect(reads).toHaveLength(0);
  });
});
