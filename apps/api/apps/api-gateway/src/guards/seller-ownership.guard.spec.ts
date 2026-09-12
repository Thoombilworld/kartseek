import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { SellerOwnershipGuard, sellerScopeCacheKey } from './seller-ownership.guard';

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
    // The seller IS in QA, so an outage must not be mistaken for "wrong market"
    // either: the denial has to be the unknown-market one, which is the branch
    // that proves the lookup failure was treated as no answer rather than as a
    // pass. Asserting only ForbiddenException cannot tell the two apart — the
    // ownership branch throws the same class.
    await expect(broken.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(ForbiddenException);
    await expect(broken.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'Your account is restricted to the QA market; this seller belongs to every market.',
    );
    // A failure is never cached, or the next request would inherit the outage.
    expect(broken.redis.set).not.toHaveBeenCalled();
    // And the seller path denies on the same failure, with the ownership copy.
    await expect(broken.guard.canActivate(ctx(owner))).rejects.toThrow(
      'You do not have access to this seller account.',
    );
  });

  it('reads a warm cache entry instead of paying for the lookup', async () => {
    const warm = build({ ownerId: 'owner-1', regionCode: 'IN' });
    warm.redis.get = vi.fn(async () => 'owner-1|QA' as any);
    await expect(warm.guard.canActivate(ctx(qaAdmin))).resolves.toBe(true);
    await expect(warm.guard.canActivate(ctx(owner))).resolves.toBe(true);
    expect(warm.client.send).not.toHaveBeenCalled();
  });

  it('parses a half-empty cache entry as a null, and denies on it', async () => {
    // 'owner-1|' is a seller with an owner and no market: the seller passes,
    // the locked admin does not.
    const noMarket = build({ ownerId: 'owner-1', regionCode: 'QA' });
    noMarket.redis.get = vi.fn(async () => 'owner-1|' as any);
    await expect(noMarket.guard.canActivate(ctx(owner))).resolves.toBe(true);
    await expect(noMarket.guard.canActivate(ctx(qaAdmin))).rejects.toThrow(
      'this seller belongs to every market',
    );

    // '|QA' is the reverse: a market with no owner. The locked admin is in
    // scope, the seller is not the owner of anything.
    const noOwner = build({ ownerId: 'owner-1', regionCode: 'QA' });
    noOwner.redis.get = vi.fn(async () => '|QA' as any);
    await expect(noOwner.guard.canActivate(ctx(qaAdmin))).resolves.toBe(true);
    await expect(noOwner.guard.canActivate(ctx(owner))).rejects.toThrow(
      'You do not have access to this seller account.',
    );
  });

  it('caches the market alongside the owner under a versioned key', async () => {
    await sub.guard.canActivate(ctx(owner));
    expect(sub.redis.set).toHaveBeenCalledWith('seller-scope:v2:seller-in', 'owner-1|IN', 60);
    // The exported builder is the key the invalidation site deletes; if it ever
    // drifts from what the guard writes, a seller decision stops taking effect.
    expect(sellerScopeCacheKey('seller-in')).toBe('seller-scope:v2:seller-in');
  });
});
