import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { SellerOwnershipGuard } from './seller-ownership.guard';

const ctx = (user: any, sellerId = 'seller-in') =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: { sellerId },
        method: 'GET',
        originalUrl: `/api/v1/sellers/${sellerId}/orders`,
        headers: {},
      }),
    }),
  }) as any;

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const owner = { id: 'owner-1', role: 'SELLER' };

function build(row: { ownerId: string | null; regionCode: string | null }) {
  const client = { send: vi.fn(() => of({ sellerId: 'seller-in', ...row })) };
  const redis = { get: vi.fn(async () => null), set: vi.fn(async () => undefined) };
  return { guard: new SellerOwnershipGuard(client as any, redis as any), client, redis };
}

describe('SellerOwnershipGuard market scope', () => {
  let sub: ReturnType<typeof build>;
  beforeEach(() => {
    sub = build({ ownerId: 'owner-1', regionCode: 'IN' });
  });

  it('refuses a QA-locked admin reaching an IN seller', async () => {
    await expect(sub.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(ForbiddenException);
    await expect(sub.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'Your account is restricted to the QA market; this seller belongs to IN.',
    );
  });

  it('admits a QA-locked admin reaching a QA seller — the control that stops "403 everywhere" passing', async () => {
    const qa = build({ ownerId: 'owner-1', regionCode: 'QA' });
    await expect(qa.guard.canActivate(ctx(qaAdmin))).resolves.toBe(true);
  });

  it('refuses a locked admin on a seller with no market — nobody owns it regionally', async () => {
    const none = build({ ownerId: 'owner-1', regionCode: null });
    await expect(none.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'this seller belongs to every market',
    );
  });

  it('admits a global admin anywhere, and does not pay for a lookup', async () => {
    await expect(sub.guard.canActivate(ctx(globalAdmin))).resolves.toBe(true);
    expect(sub.client.send).not.toHaveBeenCalled();
  });

  it('still admits the owning seller and still refuses one who does not own it', async () => {
    await expect(sub.guard.canActivate(ctx(owner))).resolves.toBe(true);
    await expect(sub.guard.canActivate(ctx({ id: 'other', role: 'SELLER' }))).rejects.toThrow(
      'You do not have access to this seller account.',
    );
  });

  it('fails closed when the lookup throws — an outage is not an authorisation bypass', async () => {
    const broken = build({ ownerId: 'owner-1', regionCode: 'QA' });
    broken.client.send = vi.fn(() => {
      throw new Error('marketplace down');
    });
    await expect(broken.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(ForbiddenException);
  });

  it('caches the market alongside the owner under a versioned key', async () => {
    await sub.guard.canActivate(ctx(owner));
    expect(sub.redis.set).toHaveBeenCalledWith('seller-scope:v2:seller-in', 'owner-1|IN', 60);
  });
});
