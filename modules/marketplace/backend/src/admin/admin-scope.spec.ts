import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { MarketplaceService } from '../marketplace.service';
import { MarketplaceAdminService } from './admin.service';
import { MarketplaceFulfillmentService } from '../fulfillment/fulfillment.service';

describe('MarketplaceService seller decisions respect scope', () => {
  function service(sellerRegion: string) {
    const sellerRepo = {
      findOne: vi.fn(async () => ({
        id: 's-1',
        regionCode: sellerRegion,
        verificationStatus: 'PENDING',
      })),
      save: vi.fn(async (s: any) => s),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, { sellerRepo, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
    return { svc, sellerRepo, kafka };
  }

  it("approves a seller in the admin's market", async () => {
    const { svc, sellerRepo } = service('QA');
    await expect(svc.approveSeller('s-1', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(sellerRepo.save).toHaveBeenCalled();
  });

  it('refuses a seller from another market and writes nothing', async () => {
    const { svc, sellerRepo, kafka } = service('IN');
    await expect(svc.approveSeller('s-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(sellerRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses suspend, reject and reactivate on a seller from another market', async () => {
    for (const call of [
      (s: MarketplaceService) => s.suspendSeller('s-1', 'admin-qa', 'QA'),
      (s: MarketplaceService) => s.rejectSeller('s-1', { adminId: 'admin-qa' }, 'QA'),
      (s: MarketplaceService) => s.reactivateSeller('s-1', 'admin-qa', 'QA'),
    ]) {
      const { svc, sellerRepo, kafka } = service('IN');
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      expect(sellerRepo.save).not.toHaveBeenCalled();
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('leaves a global admin (no scope) free to decide in any market', async () => {
    const { svc, sellerRepo } = service('IN');
    await expect(svc.approveSeller('s-1', 'admin-global')).resolves.toMatchObject({
      success: true,
      regionCode: 'IN',
    });
    expect(sellerRepo.save).toHaveBeenCalled();
  });
});

describe('product decisions resolve the market through the seller', () => {
  function service(sellerRegion: string | null) {
    const product = {
      id: 'p-1',
      seller_id: 'seller-1',
      approval_status: 'PENDING',
      is_active: false,
      status: 'DRAFT',
    };
    const productRepo = { findOne: vi.fn(async () => product), save: vi.fn(async (p: any) => p) };
    const sellerRepo = {
      findOne: vi.fn(async () =>
        sellerRegion ? { id: 'seller-1', regionCode: sellerRegion } : null,
      ),
    };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, {
      productRepo,
      sellerRepo,
      kafka: { publish: vi.fn(async () => undefined) },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, productRepo, sellerRepo };
  }

  it('refuses a product whose seller is in another market, before any write', async () => {
    const { svc, productRepo } = service('IN');
    await expect(svc.approveProduct('p-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a product whose seller cannot be found at all', async () => {
    const { svc, productRepo } = service(null);
    await expect(svc.rejectProduct('p-1', 'admin-qa', 'counterfeit', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('looks the owner up by the snake-case seller_id the entity actually carries', async () => {
    const { svc, sellerRepo } = service('IN');
    // The market matches, so the assertion passes and the method runs on into
    // listing activation, which this stub has no repository for — irrelevant
    // here: what is under test is how the owner was looked up.
    await svc.approveProduct('p-1', 'admin-in', 'IN').catch(() => undefined);
    expect(sellerRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'seller-1' },
      select: ['id', 'regionCode'],
    });
  });

  it('does not query the seller at all for a global admin', async () => {
    const { svc, sellerRepo } = service('IN');
    await svc.approveProduct('p-1', 'admin-global').catch(() => undefined);
    expect(sellerRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('MarketplaceAdminService admin queues respect scope', () => {
  function admin() {
    const sellerRepo = {
      findAndCount: vi.fn(async () => [[], 0]),
      findOne: vi.fn(async () => ({ id: 's-1', regionCode: 'IN', verificationStatus: 'PENDING' })),
      save: vi.fn(async (s: any) => s),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, { sellerRepo, kafka, logger: { log: vi.fn(), warn: vi.fn() } });
    return { svc, sellerRepo, kafka };
  }

  it('filters the pending-seller queue by the scope it was given', async () => {
    const { svc, sellerRepo } = admin();
    await svc.getPendingSellers('qa');
    expect(sellerRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { verificationStatus: 'PENDING', regionCode: 'QA' } }),
    );
  });

  it('leaves the queue unfiltered for a global admin', async () => {
    const { svc, sellerRepo } = admin();
    await svc.getPendingSellers();
    expect(sellerRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { verificationStatus: 'PENDING' } }),
    );
  });

  it('refuses to block a seller from another market and writes nothing', async () => {
    const { svc, sellerRepo, kafka } = admin();
    await expect(svc.blockSeller('s-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(sellerRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});

describe('the admin product query does not drop products without a seller', () => {
  function query() {
    const joins: { kind: string; on: string }[] = [];
    const where: string[] = [];
    const qb: any = {
      leftJoin: (_e: unknown, _a: string, on: string) => (joins.push({ kind: 'left', on }), qb),
      innerJoin: (_e: unknown, _a: string, on: string) => (joins.push({ kind: 'inner', on }), qb),
      andWhere: (w: string) => (where.push(w), qb),
      orderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      getMany: async () => [],
      getCount: async () => 0,
      getManyAndCount: async () => [[], 0],
    };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, {
      productRepo: { createQueryBuilder: () => qb },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, joins, where };
  }

  it('left-joins the seller, so an orphan product still reaches a global admin', async () => {
    const { svc, joins, where } = query();
    await svc.getProductsForAdmin({});
    expect(joins).toEqual([{ kind: 'left', on: 's.id = p.seller_id' }]);
    // No market predicate for a global admin, so nothing excludes the orphan.
    expect(where).not.toContain('s.region_code = :region');
  });

  it('excludes the orphan for a scoped admin, because it has no market', async () => {
    const { svc, where } = query();
    await svc.getProductsForAdmin({ region: 'qa' });
    expect(where).toContain('s.region_code = :region');
  });

  it('compares the two uuid columns without a cast, so the index stays usable', async () => {
    const { svc, joins } = query();
    await svc.getPendingProducts('QA');
    expect(joins[0].on).toBe('s.id = p.seller_id');
    expect(joins[0].on).not.toContain('::text');
  });
});

describe('the admin dashboard is counted per market, not platform-wide', () => {
  /** Records every predicate the query builders were given. */
  function dashboard() {
    const where: string[] = [];
    const qb: any = {
      leftJoin: () => qb,
      select: () => qb,
      where: (w: string) => (where.push(w), qb),
      andWhere: (w: string) => (where.push(w), qb),
      getCount: async () => 0,
      getRawOne: async () => ({ sum: '0' }),
    };
    const counted: any[] = [];
    const countRepo = {
      count: vi.fn(async (opts?: any) => (counted.push(opts?.where ?? {}), 0)),
      createQueryBuilder: () => qb,
    };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, {
      redis: { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) },
      sellerRepo: countRepo,
      productRepo: countRepo,
      brandRepo: countRepo,
      orderRepo: countRepo,
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, where, counted };
  }

  it('scopes sellers, products and orders to the market it was given', async () => {
    const { svc, where, counted } = dashboard();
    const result: any = await svc.getAdminDashboard('qa');
    expect(result.country).toBe('QA');
    // Sellers are counted through the repository, with the market in the where.
    expect(counted.some((w) => w.regionCode === 'QA')).toBe(true);
    // Orders and the seller join both carry the region predicate.
    expect(where).toContain('o.region_code = :region');
    expect(where).toContain('s.region_code = :region');
  });

  it('counts the whole platform for a global admin', async () => {
    const { svc, where, counted } = dashboard();
    const result: any = await svc.getAdminDashboard();
    expect(result.country).toBeNull();
    expect(counted.every((w) => w.regionCode === undefined)).toBe(true);
    expect(where).not.toContain('o.region_code = :region');
    expect(where).not.toContain('s.region_code = :region');
  });
});

// ── The fix wave: handlers that used to drop the scope the gateway sent ──────
//
// Each of these four families reached a service method with no `scope`
// parameter at all, so the gateway's check was the only one and a direct TCP
// caller — or a gateway route someone forgot — wrote across markets.

describe('product moderation writes assert the market before touching the row', () => {
  function service(sellerRegion: string | null) {
    const product = {
      id: 'p-1',
      seller_id: 'seller-1',
      approval_status: 'APPROVED',
      is_active: true,
    };
    const productRepo = { findOne: vi.fn(async () => product), save: vi.fn(async (p: any) => p) };
    const sellerRepo = {
      findOne: vi.fn(async () =>
        sellerRegion ? { id: 'seller-1', regionCode: sellerRegion } : null,
      ),
    };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, {
      productRepo,
      sellerRepo,
      kafka: { publish: vi.fn(async () => undefined) },
      redis: { del: vi.fn(), delPattern: vi.fn(), keys: vi.fn(async () => []) },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, productRepo, sellerRepo };
  }

  it('refuses publish, unpublish, suspend and correction across markets, writing nothing', async () => {
    for (const call of [
      (s: MarketplaceService) => s.setProductPublished('p-1', 'admin-qa', true, undefined, 'QA'),
      (s: MarketplaceService) => s.setProductPublished('p-1', 'admin-qa', false, 'spam', 'QA'),
      (s: MarketplaceService) => s.suspendProduct('p-1', 'admin-qa', 'QA'),
      (s: MarketplaceService) => s.requestProductCorrection('p-1', 'admin-qa', 'fix it', 'QA'),
    ]) {
      const { svc, productRepo } = service('IN');
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      expect(productRepo.save).not.toHaveBeenCalled();
    }
  });

  it('lets the market owner and a global admin through', async () => {
    const own = service('QA');
    await expect(
      own.svc.setProductPublished('p-1', 'admin-qa', false, undefined, 'QA'),
    ).resolves.toMatchObject({ success: true });
    const global = service('IN');
    await expect(global.svc.suspendProduct('p-1', 'admin-global')).resolves.toMatchObject({
      success: true,
    });
    expect(global.sellerRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('listing moderation resolves the market through the offering seller', () => {
  function service(sellerRegion: string | null) {
    const listing: any = {
      id: 'l-1',
      approvalStatus: 'PENDING',
      isActive: false,
      product: { id: 'p-1', approval_status: 'APPROVED' },
      seller: sellerRegion ? { id: 's-1', regionCode: sellerRegion } : null,
    };
    const listingRepo = {
      findOne: vi.fn(async () => listing),
      save: vi.fn(async (l: any) => l),
      findAndCount: vi.fn(async () => [[], 0]),
    };
    const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
    Object.assign(svc, {
      listingRepo,
      catalog: { recomputeBuyBox: vi.fn(async () => ({ winnerId: null })) },
      kafka: { publish: vi.fn(async () => undefined) },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, listingRepo };
  }

  it('refuses approve and reject on another market’s offer, writing nothing', async () => {
    for (const call of [
      (s: MarketplaceService) => s.approveListing('l-1', 'admin-qa', 'QA'),
      (s: MarketplaceService) => s.rejectListing('l-1', 'admin-qa', 'no', 'QA'),
    ]) {
      const { svc, listingRepo } = service('IN');
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      expect(listingRepo.save).not.toHaveBeenCalled();
    }
  });

  it('refuses an offer with no seller at all — unattributable is not global', async () => {
    const { svc, listingRepo } = service(null);
    await expect(svc.approveListing('l-1', 'admin-qa', 'QA')).rejects.toThrow(ForbiddenException);
    expect(listingRepo.save).not.toHaveBeenCalled();
  });

  it('filters the pending queue on the seller’s market, and leaves it open to a global admin', async () => {
    const { svc, listingRepo } = service('QA');
    await svc.getPendingListings(1, 20, 'qa');
    expect(listingRepo.findAndCount.mock.calls[0][0].where).toEqual({
      approvalStatus: 'PENDING',
      seller: { regionCode: 'QA' },
    });
    await svc.getPendingListings(1, 20);
    expect(listingRepo.findAndCount.mock.calls[1][0].where).toEqual({
      approvalStatus: 'PENDING',
    });
  });
});

describe('return transitions assert the return’s own market', () => {
  function service(region: string | null) {
    const returnRepo = {
      findOne: vi.fn(async () => ({ id: 'r-1', sellerId: 's-1', regionCode: region })),
      update: vi.fn(async () => ({ affected: 1 })),
    };
    const svc = Object.create(
      MarketplaceFulfillmentService.prototype,
    ) as MarketplaceFulfillmentService;
    Object.assign(svc, {
      returnRepo,
      kafka: { publish: vi.fn(async () => undefined) },
      logger: { log: vi.fn(), warn: vi.fn() },
      assertOwns: vi.fn(async () => undefined),
    });
    return { svc, returnRepo };
  }

  it('refuses a return from another market before the update', async () => {
    const { svc, returnRepo } = service('IN');
    await expect(
      svc.updateReturnStatus('r-1', { status: 'REFUNDED' }, undefined, 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(returnRepo.update).not.toHaveBeenCalled();
  });

  it('allows the owning market and a global admin', async () => {
    const own = service('QA');
    await expect(
      own.svc.updateReturnStatus('r-1', { status: 'RECEIVED' }, undefined, 'QA'),
    ).resolves.toMatchObject({ success: true });
    const global = service('IN');
    await expect(
      global.svc.updateReturnStatus('r-1', { status: 'RECEIVED' }),
    ).resolves.toMatchObject({ success: true });
  });
});

describe('handlers with nothing to attribute fail closed for a scoped admin', () => {
  function admin() {
    const kafka = { publish: vi.fn(async () => undefined) };
    const redis = { setJson: vi.fn(async () => undefined), getJson: vi.fn(async () => null) };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, { kafka, redis, logger: { log: vi.fn(), warn: vi.fn() } });
    return { svc, kafka, redis };
  }

  it('refuses a campaign update and publishes no event', async () => {
    const { svc, kafka } = admin();
    await expect(svc.updateCampaign('c-1', { name: 'x' }, 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('refuses commission rules, sponsored slots, notifications, settings and SEO', async () => {
    for (const call of [
      (s: MarketplaceAdminService) => s.updateCommission('r-1', {}, 'QA'),
      (s: MarketplaceAdminService) => s.updateSponsoredProduct('s-1', {}, 'QA'),
      (s: MarketplaceAdminService) => s.sendNotification({ title: 'x' }, 'QA'),
      // `getAdminNotifications` was here and no longer belongs: it returns the
      // caller's *own* rows, so there is no platform-wide list to mis-attribute
      // and nothing for a market to confine. Refusing it denied a regional admin
      // their own inbox. Its behaviour is pinned in `admin-notifications.spec.ts`
      // — including that a scoped caller gets their rows rather than a 403.
      (s: MarketplaceAdminService) => s.getComplianceCountries('QA'),
      (s: MarketplaceAdminService) => s.getCustomerSegments('QA'),
      (s: MarketplaceAdminService) => s.updateMarketplaceSettings({}, 'QA'),
      (s: MarketplaceAdminService) => s.updateSeoSettings({}, 'QA'),
    ]) {
      const { svc, kafka, redis } = admin();
      await expect(call(svc)).rejects.toThrow(ForbiddenException);
      expect(kafka.publish).not.toHaveBeenCalled();
      expect(redis.setJson).not.toHaveBeenCalled();
    }
  });

  it('leaves every one of them open to a global admin', async () => {
    const { svc, kafka } = admin();
    await expect(svc.updateCampaign('c-1', { name: 'x' })).resolves.toMatchObject({
      success: true,
    });
    expect(kafka.publish).toHaveBeenCalledWith('campaign.updated', { id: 'c-1', name: 'x' });
  });
});

describe('featured and Q&A reads carry the market predicate onto the seller join', () => {
  function query(repoKey: 'productRepo' | 'questionRepo') {
    const joins: { kind: string; on: string }[] = [];
    const where: string[] = [];
    const qb: any = {
      leftJoin: (_e: unknown, _a: string, on: string) => (joins.push({ kind: 'left', on }), qb),
      innerJoin: (_e: unknown, _a: string, on: string) => (joins.push({ kind: 'inner', on }), qb),
      leftJoinAndSelect: (on: string) => (joins.push({ kind: 'leftSelect', on }), qb),
      // `where` would reset everything already on the builder — a call to it is
      // the bug this harness exists to catch, so record it distinguishably.
      where: (w: string) => (where.push(`RESET:${w}`), qb),
      andWhere: (w: string) => (where.push(w), qb),
      orderBy: () => qb,
      take: () => qb,
      skip: () => qb,
      getMany: async () => [],
      getManyAndCount: async () => [[], 0],
    };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, {
      [repoKey]: { createQueryBuilder: () => qb },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, joins, where };
  }

  it('filters the featured rail on the seller’s market and never resets the builder', async () => {
    const scoped = query('productRepo');
    await scoped.svc.getAdminFeaturedProducts('qa');
    expect(scoped.where).toContain('s.region_code = :region');
    expect(scoped.where).toContain('p.is_featured = true');
    expect(scoped.where.some((w) => w.startsWith('RESET:'))).toBe(false);

    const global = query('productRepo');
    await global.svc.getAdminFeaturedProducts();
    expect(global.where).not.toContain('s.region_code = :region');
  });

  it('inner-joins the seller behind the question’s product for a scoped moderator only', async () => {
    const scoped = query('questionRepo');
    await scoped.svc.getQAItems(undefined, 'qa');
    expect(scoped.joins).toContainEqual({ kind: 'inner', on: 's.id = product.seller_id' });
    expect(scoped.where).toContain('s.region_code = :market');

    const global = query('questionRepo');
    await global.svc.getQAItems();
    expect(global.joins.some((j) => j.kind === 'inner')).toBe(false);
  });
});
