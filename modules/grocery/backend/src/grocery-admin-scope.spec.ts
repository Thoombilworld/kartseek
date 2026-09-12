import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GroceryService } from './grocery.service';

/**
 * The moderation surface the admin console actually calls.
 *
 * `/grocery/admin/products/*` and `/grocery/admin/brands/*` are the real
 * listing- and brand-moderation path — `/admin/grocery/*` has no pending-products
 * twin — and they sent grocery-service no `scope` at all. `assertInMarket(…,
 * undefined)` is a no-op, so a Qatar-locked admin could approve or reject any
 * market's listings and brand requests (audit V7 / X-39).
 *
 * A grocery item carries no market of its own; the store that stocks it does,
 * and that join is the documented attribution for the whole grocery catalogue
 * (`admin/admin.service.ts`). A brand request is attributed through the store of
 * the seller who asked for it.
 */

function service(opts: {
  item?: { id: string; storeId: string | null; approvalStatus?: string; name?: string } | null;
  brand?: { id: string; requestedBySellerId: string | null; approvalStatus?: string } | null;
  stores?: Array<{ id: string; ownerId?: string | null; regionCode: string | null }>;
}) {
  const stores = opts.stores ?? [];
  const predicates: string[] = [];
  const params: Record<string, unknown> = {};
  const qb: Record<string, any> = { predicates, params };
  const add = (predicate?: string, values?: Record<string, unknown>) => {
    if (predicate) predicates.push(predicate);
    if (values) Object.assign(params, values);
    return qb;
  };
  qb.where = add;
  qb.andWhere = add;
  for (const passthrough of [
    'leftJoin',
    'leftJoinAndSelect',
    'innerJoin',
    'orderBy',
    'skip',
    'take',
  ]) {
    qb[passthrough] = () => qb;
  }
  qb.getManyAndCount = async () => [[], 0];

  const itemRepo = {
    findOne: vi.fn(async () => opts.item ?? null),
    save: vi.fn(async (e: any) => e),
    createQueryBuilder: vi.fn(() => qb),
  };
  const brandRepo = {
    findOne: vi.fn(async () => opts.brand ?? null),
    save: vi.fn(async (e: any) => e),
  };
  const storeRepo = {
    findOne: vi.fn(async (o: any) => {
      const where = o?.where ?? {};
      return (
        stores.find((s) =>
          where.id !== undefined ? s.id === where.id : s.ownerId === where.ownerId,
        ) ?? null
      );
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const redis = { del: vi.fn(async () => 1), delPattern: vi.fn(async () => 1) };

  const svc = Object.create(GroceryService.prototype) as GroceryService;
  Object.assign(svc, {
    itemRepo,
    brandRepo,
    storeRepo,
    kafka,
    redis,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  });
  return { svc, itemRepo, brandRepo, storeRepo, kafka, qb };
}

describe('GroceryService listing moderation asserts the stocking store market', () => {
  it("refuses a listing in another market's store and writes nothing", async () => {
    const { svc, itemRepo, kafka } = service({
      item: { id: 'it-in', storeId: 'st-in', approvalStatus: 'PENDING', name: 'Atta' },
      stores: [{ id: 'st-in', regionCode: 'IN' }],
    });
    await expect(
      svc.setProductApproval('it-in', 'REJECTED', 'probe', undefined, 'QA'),
    ).rejects.toThrow('This listing belongs to IN, not to the QA market.');
    expect(itemRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('allows a listing in the scoped market', async () => {
    const { svc, itemRepo } = service({
      item: { id: 'it-qa', storeId: 'st-qa', approvalStatus: 'PENDING', name: 'Dates' },
      stores: [{ id: 'st-qa', regionCode: 'QA' }],
    });
    await expect(
      svc.setProductApproval('it-qa', 'APPROVED', undefined, undefined, 'QA'),
    ).resolves.toMatchObject({ success: true });
    expect(itemRepo.save).toHaveBeenCalled();
  });

  it('leaves a global admin unaffected on any market', async () => {
    const { svc, itemRepo } = service({
      item: { id: 'it-in', storeId: 'st-in', approvalStatus: 'PENDING', name: 'Atta' },
      stores: [{ id: 'st-in', regionCode: 'IN' }],
    });
    await expect(svc.setProductApproval('it-in', 'APPROVED')).resolves.toMatchObject({
      success: true,
    });
    expect(itemRepo.save).toHaveBeenCalled();
  });
});

describe('GroceryService.getPendingProducts puts the market in the query', () => {
  it('filters in the query, not after it', async () => {
    // A post-filter over `take(limit)` rows returns a short page that reads as
    // "no listings awaiting review" (audit X-57), so the market has to be a
    // predicate the database applies before pagination.
    const { svc, qb } = service({});
    await svc.getPendingProducts(1, 30, undefined, 'QA');
    expect(qb.predicates.some((p: string) => p.includes('store.regionCode'))).toBe(true);
    expect(qb.params.scope).toBe('QA');
  });

  it('adds no market predicate for a global admin', async () => {
    const { svc, qb } = service({});
    await svc.getPendingProducts(1, 30);
    expect(qb.predicates.some((p: string) => p.includes('store.regionCode'))).toBe(false);
  });
});

describe('GroceryService brand moderation asserts the requesting store market', () => {
  it("refuses another market's brand request and writes nothing", async () => {
    const { svc, brandRepo } = service({
      brand: { id: 'br-1', requestedBySellerId: 'owner-in', approvalStatus: 'PENDING' },
      stores: [{ id: 'st-in', ownerId: 'owner-in', regionCode: 'IN' }],
    });
    await expect(svc.setBrandApproval('br-1', 'APPROVED', undefined, 'QA')).rejects.toThrow(
      'This brand request belongs to IN, not to the QA market.',
    );
    expect(brandRepo.save).not.toHaveBeenCalled();
  });

  it('allows a brand request from a seller in the scoped market', async () => {
    const { svc, brandRepo } = service({
      brand: { id: 'br-2', requestedBySellerId: 'owner-qa', approvalStatus: 'PENDING' },
      stores: [{ id: 'st-qa', ownerId: 'owner-qa', regionCode: 'QA' }],
    });
    await expect(svc.setBrandApproval('br-2', 'APPROVED', undefined, 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(brandRepo.save).toHaveBeenCalled();
  });

  it('refuses a locked admin a brand request that no store can be attributed to', async () => {
    // Fail closed: a brand nobody requested belongs to no market, so it is not
    // a regional admin's to approve on every market's behalf.
    const { svc, brandRepo } = service({
      brand: { id: 'br-3', requestedBySellerId: null, approvalStatus: 'PENDING' },
    });
    await expect(svc.setBrandApproval('br-3', 'APPROVED', undefined, 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(brandRepo.save).not.toHaveBeenCalled();
  });
});
