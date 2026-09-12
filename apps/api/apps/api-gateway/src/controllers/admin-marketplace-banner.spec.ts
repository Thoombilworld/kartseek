import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminMarketplaceController } from './admin-marketplace.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'POST', originalUrl: '/x', headers: {} });

function build(banners: any[]) {
  const store = new Map<string, any>([['marketplace:hero-banners', banners]]);
  const redis = {
    getJson: vi.fn(async (k: string) => store.get(k) ?? null),
    setJson: vi.fn(async (k: string, v: any) => void store.set(k, v)),
    del: vi.fn(async () => undefined),
    delPattern: vi.fn(async () => 0),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const ctrl = Object.create(AdminMarketplaceController.prototype) as AdminMarketplaceController;
  Object.assign(ctrl, { redis, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
  return { ctrl, redis, kafka, store };
}

describe('banner delete', () => {
  it('404s on an id that does not exist and touches no cache', async () => {
    const { ctrl, redis, kafka } = build([{ id: 'b-qa', regions: ['QA'] }]);
    await expect(ctrl.deleteBanner(req(qaAdmin), 'hero', 'does-not-exist')).rejects.toThrow(
      NotFoundException,
    );
    // The bug: with the assert inside `if (target)`, a missing id fell through
    // to invalidateHomeFeeds(null) and flushed marketplace:home:* for every
    // market on the platform (audit V14).
    expect(redis.del).not.toHaveBeenCalled();
    expect(redis.delPattern).not.toHaveBeenCalled();
    expect(redis.setJson).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses a banner from another market and leaves it in place', async () => {
    const { ctrl, store, redis } = build([{ id: 'b-in', regions: ['IN'] }]);
    await expect(ctrl.deleteBanner(req(qaAdmin), 'hero', 'b-in')).rejects.toThrow(
      ForbiddenException,
    );
    expect(store.get('marketplace:hero-banners')).toHaveLength(1);
    expect(redis.setJson).not.toHaveBeenCalled();
  });

  it("deletes the locked admin's own banner and purges only their market", async () => {
    const { ctrl, redis, store } = build([
      { id: 'b-qa', regions: ['QA'] },
      { id: 'b-in', regions: ['IN'] },
    ]);
    await expect(ctrl.deleteBanner(req(qaAdmin), 'hero', 'b-qa')).resolves.toMatchObject({
      data: { success: true },
    });
    expect(store.get('marketplace:hero-banners').map((b: any) => b.id)).toEqual(['b-in']);
    const purged = redis.del.mock.calls.flat().concat(redis.delPattern.mock.calls.flat());
    expect(purged.some((k: string) => String(k).includes('IN'))).toBe(false);
    // The banner's own market and the unscoped feed, and nothing else.
    expect([...purged].map(String).sort()).toEqual([
      'marketplace:home:QA',
      'marketplace:home:global',
    ]);
  });

  it('lets a global admin delete an untargeted banner', async () => {
    const { ctrl } = build([{ id: 'b-all', regions: [] }]);
    await expect(ctrl.deleteBanner(req(globalAdmin), 'hero', 'b-all')).resolves.toMatchObject({
      data: { success: true },
    });
  });
});
