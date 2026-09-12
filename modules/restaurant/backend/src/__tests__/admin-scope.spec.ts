import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RestaurantService } from '../restaurant.service';
import { RestaurantStatus } from '../entities';

// `:__market` is the one parameter name `applyMarketFilter` binds, platform-wide
// (`libs/common/src/market/market-scope.ts`). It is deliberately not `:country`,
// `:cc` or `:rc`: a predicate that reuses a name the caller also binds is a
// predicate a later clause can silently overwrite with a different value.

/**
 * A region-locked administrator carries their market as `scope` on every admin
 * message. These tests pin the two halves of that contract inside
 * restaurant-service: the admin list narrows to the market, and a decision on
 * one restaurant refuses a restaurant that belongs to another one — before
 * anything is written or published, because a Kafka event is as visible as a
 * database row.
 *
 * The market is `regionCode`, the platform's ISO-2 market identifier. It is not
 * `countryCode`: that column carries a legacy alpha-3 default ('KEN') that
 * nothing seeds, so filtering on it matched no row in any market. A restaurant
 * whose `regionCode` is null is deliberately outside every locked admin's
 * scope; a sub-region like 'QA-DOH' belongs to the country it names, which is
 * what `normaliseMarket` in `@app/common` decides for both sides at once.
 */

interface Row {
  id: string;
  regionCode: string | null;
  status?: RestaurantStatus;
  isOnline?: boolean;
  isTemporarilyClosed?: boolean;
}

/**
 * A query builder that records the predicates it was given and answers from an
 * in-memory row set, so a test can assert both *that* the market reached the
 * query and *which* rows it then matched. A `vi.fn()` returning `this` cannot
 * tell the difference between a filter in the query and a filter applied after
 * it, which is the distinction these tests exist to make.
 */
function recordingQb(rows: Row[]) {
  const predicates: string[] = [];
  const params: Record<string, unknown> = {};
  const matched = () =>
    rows.filter((r) =>
      predicates.every((p) => {
        if (p.includes('LEFT(r.regionCode, 2) = :__market'))
          return (r.regionCode ?? '').slice(0, 2).toUpperCase() === params.__market;
        if (p.includes('r.regionCode = :__market'))
          return (r.regionCode ?? '').toUpperCase() === String(params.__market ?? '').toUpperCase();
        if (p.includes('r.status = :status')) return r.status === params.status;
        if (p.includes('r.isOnline = true')) return r.isOnline !== false;
        if (p.includes('r.isTemporarilyClosed = false')) return r.isTemporarilyClosed !== true;
        return true;
      }),
    );

  const qb: Record<string, any> = { predicates, params };
  const add = (predicate?: string, values?: Record<string, unknown>) => {
    if (predicate) predicates.push(predicate);
    if (values) Object.assign(params, values);
    return qb;
  };
  qb.where = add;
  qb.andWhere = add;
  for (const passthrough of [
    'select',
    'addSelect',
    'leftJoin',
    'leftJoinAndSelect',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'skip',
    'take',
    'limit',
    'offset',
  ]) {
    qb[passthrough] = () => qb;
  }
  qb.getMany = async () => matched();
  qb.getManyAndCount = async () => [matched(), matched().length];
  qb.getCount = async () => matched().length;
  qb.getOne = async () => matched()[0] ?? null;
  qb.getRawMany = async () => [];
  return qb;
}

/** The market predicates one builder saw — the only ones these tests compare. */
function marketPredicates(qb: { predicates: string[] }): string[] {
  return qb.predicates.filter((p) => p.includes('regionCode'));
}

function serviceWithRestaurants(rows: Row[]) {
  const builders: Array<ReturnType<typeof recordingQb>> = [];
  const restaurantRepo = {
    createQueryBuilder: vi.fn(() => {
      const qb = recordingQb(rows);
      builders.push(qb);
      return qb;
    }),
    findAndCount: vi.fn(async () => [[], 0]),
    findOne: vi.fn(async (opts: any) => rows.find((r) => r.id === opts?.where?.id) ?? null),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(RestaurantService.prototype) as RestaurantService;
  Object.assign(svc, {
    restaurantRepo,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, restaurantRepo, kafka, builders };
}

function service(restaurant: { id: string; regionCode: string | null } | null = null) {
  return serviceWithRestaurants(restaurant ? [restaurant] : []);
}

describe('RestaurantService.getAdminRestaurantList narrows to the caller market', () => {
  it('adds the region predicate when a market is given', async () => {
    const { svc, builders } = service();
    await svc.getAdminRestaurantList({ regionCode: 'QA' });
    expect(marketPredicates(builders[0])).toEqual(['LEFT(r.regionCode, 2) = :__market']);
    expect(builders[0].params.__market).toBe('QA');
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, builders } = service();
    await svc.getAdminRestaurantList({});
    expect(marketPredicates(builders[0])).toEqual([]);
  });
});

describe('RestaurantService decisions assert the restaurant market', () => {
  it("refuses to approve another market's restaurant, writing and publishing nothing", async () => {
    const { svc, restaurantRepo, kafka } = service({ id: 'r-in', regionCode: 'IN' });
    await expect(svc.approveRestaurant('r-in', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(restaurantRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('approves a restaurant inside the caller market', async () => {
    const { svc, restaurantRepo, kafka } = service({ id: 'r-qa', regionCode: 'QA' });
    await expect(svc.approveRestaurant('r-qa', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(restaurantRepo.update).toHaveBeenCalled();
    expect(kafka.publish).toHaveBeenCalled();
  });

  it("refuses to suspend another market's restaurant, writing nothing", async () => {
    const { svc, restaurantRepo } = service({ id: 'r-in', regionCode: 'IN' });
    await expect(svc.suspendRestaurant('r-in', 'QA')).rejects.toThrow(ForbiddenException);
    expect(restaurantRepo.update).not.toHaveBeenCalled();
  });

  it('suspends a restaurant inside the caller market', async () => {
    const { svc, restaurantRepo } = service({ id: 'r-qa', regionCode: 'QA' });
    await expect(svc.suspendRestaurant('r-qa', 'QA')).resolves.toMatchObject({ success: true });
    expect(restaurantRepo.update).toHaveBeenCalled();
  });

  it('lets a global admin decide on a restaurant in any market', async () => {
    const { svc, restaurantRepo } = service({ id: 'r-in', regionCode: 'IN' });
    await expect(svc.suspendRestaurant('r-in')).resolves.toMatchObject({ success: true });
    expect(restaurantRepo.update).toHaveBeenCalled();
  });

  it('refuses a locked admin a restaurant that belongs to no market at all', async () => {
    const { svc, restaurantRepo } = service({ id: 'r-none', regionCode: null });
    await expect(svc.suspendRestaurant('r-none', 'QA')).rejects.toThrow(ForbiddenException);
    expect(restaurantRepo.update).not.toHaveBeenCalled();
  });
});

describe('one market match on both sides of the restaurant reads', () => {
  const approved = (id: string, regionCode: string): Row => ({
    id,
    regionCode,
    status: RestaurantStatus.APPROVED,
    isOnline: true,
    isTemporarilyClosed: false,
  });

  it('finds a QA-DOH restaurant for a QA admin list and for a QA customer discovery', async () => {
    // Discovery prefix-matched LEFT(regionCode,2) while the admin list matched
    // exactly, so a 'QA-DOH' row was invisible to a QA admin AND 403'd on
    // approve — the restaurant existed for shoppers and not for the people who
    // moderate it (audit I4).
    const { svc, builders } = serviceWithRestaurants([
      approved('r-doh', 'QA-DOH'),
      approved('r-qa', 'QA'),
      approved('r-in', 'IN'),
    ]);
    const adminRows = await svc.getAdminRestaurantList({ regionCode: 'QA' });
    const publicRows = await svc.listRestaurants({ regionCode: 'QA' });
    const [admin, discovery] = builders;

    expect(adminRows.data.map((r: any) => r.id).sort()).toEqual(['r-doh', 'r-qa']);
    expect(publicRows.data.map((r: any) => r.id).sort()).toEqual(['r-doh', 'r-qa']);
    expect(marketPredicates(admin)).toEqual(marketPredicates(discovery));
    expect(marketPredicates(admin)).toEqual(['LEFT(r.regionCode, 2) = :__market']);
  });

  it('approves a QA-DOH restaurant for a QA-scoped admin', async () => {
    const { svc } = serviceWithRestaurants([{ id: 'r-doh', regionCode: 'QA-DOH' }]);
    await expect(svc.approveRestaurant('r-doh', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
  });

  it('still refuses an IN restaurant for a QA-scoped admin', async () => {
    const { svc } = serviceWithRestaurants([{ id: 'r-in', regionCode: 'IN' }]);
    await expect(svc.approveRestaurant('r-in', 'admin-qa', 'QA')).rejects.toThrow(
      'This restaurant belongs to IN, not to the QA market.',
    );
  });

  it('rejectRestaurant takes a scope like its three siblings', async () => {
    const { svc, restaurantRepo } = serviceWithRestaurants([{ id: 'r-in', regionCode: 'IN' }]);
    await expect(svc.rejectRestaurant('r-in', 'blurry', 'QA')).rejects.toThrow(
      'not to the QA market',
    );
    expect(restaurantRepo.update).not.toHaveBeenCalled();
  });

  it('rejects a restaurant inside the caller market', async () => {
    const { svc, restaurantRepo } = serviceWithRestaurants([{ id: 'r-doh', regionCode: 'QA-DOH' }]);
    await expect(svc.rejectRestaurant('r-doh', 'blurry', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(restaurantRepo.update).toHaveBeenCalled();
  });
});
