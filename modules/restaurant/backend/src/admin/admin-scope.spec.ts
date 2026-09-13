import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestaurantAdminService } from './admin.service';
import { ComplaintStatus } from '../entities';

/**
 * The restaurant admin console's market boundary, pinned at the service.
 *
 * Seventeen `admin.restaurant.*` commands reach this module and every one of
 * them takes `{ scope, actorId, … }`, where `scope` is written only by the
 * gateway and only from the signed token. These tests pin the six shapes the
 * plan requires of every module — the predicate is really in the query, the
 * lock beats the request, a decision on a foreign record is refused with no
 * write, a decision on a market-less record is refused, an unknown id is a 404
 * rather than a 403, and an unattributable report is refused — plus one this
 * module needs and the others do not: the admin list and the storefront list
 * have to agree about what "QA" matches.
 *
 * `:__market` is the one parameter name `applyMarketFilter` binds, platform-wide
 * (`libs/common/src/market/market-scope.ts`). It is deliberately not `:country`,
 * `:cc` or `:rc`: a predicate that reuses a name the caller also binds is a
 * predicate a later clause can silently overwrite with a different value.
 */

/** A query builder that RECORDS its predicates, so a test can read them back. */
function recordingQb(rows: any[] = []) {
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
  qb.orWhere = add;
  for (const passthrough of [
    'select',
    'addSelect',
    'leftJoin',
    'leftJoinAndSelect',
    'innerJoin',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'addGroupBy',
    'skip',
    'take',
    'limit',
    'offset',
  ]) {
    qb[passthrough] = () => qb;
  }
  qb.getMany = async () => rows;
  qb.getManyAndCount = async () => [rows, rows.length];
  qb.getRawAndEntities = async () => ({ entities: rows, raw: rows.map(() => ({})) });
  qb.getCount = async () => rows.length;
  qb.getOne = async () => rows[0] ?? null;
  qb.getRawMany = async () => [];
  qb.getRawOne = async () => ({});
  return qb;
}

function repo(rows: any[] = []) {
  const builders: Array<ReturnType<typeof recordingQb>> = [];
  return {
    builders,
    createQueryBuilder: vi.fn(() => {
      const qb = recordingQb(rows);
      builders.push(qb);
      return qb;
    }),
    findOne: vi.fn(async (opts: any) => rows.find((r) => r.id === opts?.where?.id) ?? null),
    find: vi.fn(async () => rows),
    count: vi.fn(async () => rows.length),
    update: vi.fn(async () => ({ affected: 1 })),
    save: vi.fn(async (row: any) => row),
    create: vi.fn((row: any) => ({ id: 'new-row', ...row })),
  };
}

interface Fixture {
  restaurants?: any[];
  menuItems?: any[];
  orders?: any[];
  complaints?: any[];
  cuisines?: any[];
  zones?: any[];
}

function makeService(fixture: Fixture = {}) {
  const restaurantRepo = repo(fixture.restaurants ?? []);
  const menuItemRepo = repo(fixture.menuItems ?? []);
  const orderRepo = repo(fixture.orders ?? []);
  const reservationRepo = repo([]);
  const reviewRepo = repo([]);
  const complaintRepo = repo(fixture.complaints ?? []);
  const cuisineRepo = repo(fixture.cuisines ?? []);
  const zoneRepo = repo(fixture.zones ?? []);
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = { getAdminRestaurantList: vi.fn(async (o: any) => ({ data: [], total: 0, ...o })) };

  const admin = Object.create(RestaurantAdminService.prototype) as RestaurantAdminService;
  Object.assign(admin, {
    restaurantRepo,
    menuItemRepo,
    orderRepo,
    reservationRepo,
    reviewRepo,
    complaintRepo,
    cuisineRepo,
    zoneRepo,
    svc,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  /** Every market predicate every builder in this fixture was given. */
  const where = () =>
    [restaurantRepo, menuItemRepo, orderRepo, reservationRepo, complaintRepo, zoneRepo, cuisineRepo]
      .flatMap((r) => r.builders)
      .flatMap((qb) =>
        qb.predicates.map((p) => [p, qb.params] as [string, Record<string, unknown>]),
      )
      .filter(([p]) => p.includes('regionCode'));

  return {
    admin,
    where,
    restaurantRepo,
    menuItemRepo,
    orderRepo,
    complaintRepo,
    cuisineRepo,
    zoneRepo,
    kafka,
    svc,
  };
}

// ── 1. The predicate is really in the query ──────────────────────────────────

describe('every restaurant admin list narrows in SQL, not after the page', () => {
  it('joins the restaurant and filters on its market for orders', async () => {
    const { admin, where } = makeService();
    await admin.listOrders({ scope: 'QA' });
    expect(where()).toEqual([['LEFT(r.regionCode, 2) = :__market', { __market: 'QA' }]]);
  });

  it('filters the menu approval queue through the restaurant too', async () => {
    const { admin, where } = makeService();
    await admin.listMenuApprovals({ scope: 'QA' });
    expect(where().every(([p]) => p === 'LEFT(r.regionCode, 2) = :__market')).toBe(true);
    expect(where().length).toBeGreaterThan(0);
  });

  it('filters complaints through the restaurant they name', async () => {
    const { admin, where } = makeService();
    await admin.listComplaints({ scope: 'IN' });
    expect(where()).toEqual([['LEFT(r.regionCode, 2) = :__market', { __market: 'IN' }]]);
  });

  it("filters delivery zones on the zone's own market column", async () => {
    const { admin, where } = makeService();
    await admin.listZones({ scope: 'QA' });
    expect(where()).toEqual([['LEFT(z.regionCode, 2) = :__market', { __market: 'QA' }]]);
  });

  it('adds no predicate at all for a global administrator', async () => {
    const { admin, where } = makeService();
    await admin.listOrders({});
    await admin.listComplaints({});
    await admin.listZones({});
    expect(where()).toEqual([]);
  });
});

// ── 2. The lock wins over whatever was requested ─────────────────────────────

describe('the caller lock beats the requested market', () => {
  /**
   * The lock WINS; it does not merely tie.
   *
   * The refusal a locked administrator sees for `?countryCode=IN` is the
   * gateway's — `resolveScope` throws the platform copy before restaurant-service
   * is addressed at all. This is the second line, for a caller reaching the
   * service directly over TCP, and it fails CLOSED: the requested market is
   * discarded and the predicate is the caller's own, so the worst a forged
   * payload can do is narrow the list to the market it was already confined to.
   * Nothing here can widen it, which is the only direction that leaks.
   */
  it("narrows to the caller's own market when the payload names another", async () => {
    const { admin, where } = makeService();
    await admin.listOrders({ scope: 'QA', region: 'IN' });
    expect(where()).toEqual([['LEFT(r.regionCode, 2) = :__market', { __market: 'QA' }]]);
  });

  it('refuses an unreadable requested market rather than widening the list', async () => {
    // The dangerous direction: an ignored filter is EVERY market's rows.
    const { admin } = makeService();
    await expect(admin.listComplaints({ scope: 'QA', region: 'NOT-A-COUNTRY' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("keeps a global admin's own filter, normalised from a sub-region", async () => {
    const { admin, where } = makeService();
    await admin.listOrders({ region: 'qa-doh' });
    expect(where()).toEqual([['LEFT(r.regionCode, 2) = :__market', { __market: 'QA' }]]);
  });
});

// ── 3. A decision on a foreign record is refused, and writes nothing ─────────

describe('decisions assert the restaurant market before writing or publishing', () => {
  it("refuses to approve another market's menu item and writes nothing", async () => {
    const { admin, menuItemRepo, kafka } = makeService({
      menuItems: [{ id: 'm-1', restaurantId: 'r-in' }],
      restaurants: [{ id: 'r-in', regionCode: 'IN' }],
    });
    await expect(admin.approveMenuItem('m-1', 'admin-qa', 'QA')).rejects.toThrow(
      'This menu item belongs to IN, not to the QA market.',
    );
    expect(menuItemRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('approves a menu item inside the caller market, and publishes it', async () => {
    const { admin, menuItemRepo, kafka } = makeService({
      menuItems: [{ id: 'm-1', restaurantId: 'r-qa' }],
      restaurants: [{ id: 'r-qa', regionCode: 'QA-DOH' }],
    });
    await expect(admin.approveMenuItem('m-1', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(menuItemRepo.update).toHaveBeenCalledWith(
      { id: 'm-1' },
      { isPendingApproval: false, isAvailable: true },
    );
    expect(kafka.publish).toHaveBeenCalledWith(
      'restaurant.menu_item.approved',
      expect.objectContaining({ actorId: 'admin-qa', market: 'QA-DOH' }),
    );
  });

  it("refuses to resolve another market's complaint and writes nothing", async () => {
    const { admin, complaintRepo, kafka } = makeService({
      complaints: [{ id: 'c-1', restaurantId: 'r-in', status: ComplaintStatus.OPEN }],
      restaurants: [{ id: 'r-in', regionCode: 'IN' }],
    });
    await expect(admin.resolveComplaint('c-1', 'refunded', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(complaintRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it("refuses to change another market's commission rate", async () => {
    const { admin, restaurantRepo } = makeService({
      restaurants: [{ id: 'r-in', regionCode: 'IN', commissionRate: 15 }],
    });
    await expect(
      admin.updateCommissions({ restaurantId: 'r-in', commissionRate: 12 }, 'admin-qa', 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(restaurantRepo.update).not.toHaveBeenCalled();
  });

  it('lets a global administrator decide in any market', async () => {
    const { admin, restaurantRepo } = makeService({
      restaurants: [{ id: 'r-in', regionCode: 'IN', commissionRate: 15 }],
    });
    await expect(
      admin.updateCommissions({ restaurantId: 'r-in', commissionRate: 12 }, 'root'),
    ).resolves.toMatchObject({ commissionRate: 12, previousRate: 15 });
    expect(restaurantRepo.update).toHaveBeenCalled();
  });
});

// ── 4. A record that belongs to no market is refused, never widened ─────────

describe('an unattributable record is refused for a locked caller', () => {
  it('refuses a restaurant with no market at all', async () => {
    const { admin } = makeService({ restaurants: [{ id: 'r-none', regionCode: null }] });
    await expect(admin.getRestaurant('r-none', 'QA')).rejects.toThrow(
      'This restaurant belongs to every market, not to the QA market.',
    );
  });

  it('refuses a menu item whose restaurant names no market', async () => {
    const { admin, menuItemRepo } = makeService({
      menuItems: [{ id: 'm-1', restaurantId: 'r-none' }],
      restaurants: [{ id: 'r-none', regionCode: null }],
    });
    await expect(admin.approveMenuItem('m-1', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(menuItemRepo.update).not.toHaveBeenCalled();
  });

  it('still lets a global administrator act on it', async () => {
    const { admin } = makeService({ restaurants: [{ id: 'r-none', regionCode: null }] });
    await expect(admin.getRestaurant('r-none')).resolves.toMatchObject({ id: 'r-none' });
  });
});

// ── 5. An unknown id is a 404, not a 403 ────────────────────────────────────

describe('"no such id" and "not your market" stay apart', () => {
  it('answers 404 for an id that is in no market because it does not exist', async () => {
    const { admin } = makeService();
    await expect(admin.getRestaurant('nope', 'QA')).rejects.toThrow(NotFoundException);
  });

  it('answers 404 for an unknown menu item', async () => {
    const { admin } = makeService();
    await expect(admin.approveMenuItem('nope', 'a', 'QA')).rejects.toThrow(NotFoundException);
  });

  it('answers 404 for an unknown complaint', async () => {
    const { admin } = makeService();
    await expect(admin.resolveComplaint('nope', 'done', 'a', 'QA')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── 6. Global surfaces: the taxonomy write, and a zone with no market ───────

describe('global writes are withheld from a region-locked administrator', () => {
  it('refuses a locked admin the cuisine catalogue, with the platform copy', async () => {
    const { admin, cuisineRepo } = makeService();
    await expect(admin.createCuisine({ name: 'Levantine' }, 'admin-qa', 'QA')).rejects.toThrow(
      'Restaurant taxonomy is managed globally.',
    );
    expect(cuisineRepo.save).not.toHaveBeenCalled();
  });

  it('lets a global administrator add one', async () => {
    const { admin, cuisineRepo } = makeService();
    await expect(admin.createCuisine({ name: 'Levantine' }, 'root')).resolves.toMatchObject({
      success: true,
    });
    expect(cuisineRepo.save).toHaveBeenCalled();
  });

  it('stamps a locked admin market on a zone they create, never the body', async () => {
    const { admin, zoneRepo } = makeService();
    await admin.createZone({ name: 'West Bay' }, 'admin-qa', 'QA', undefined);
    expect(zoneRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'QA', createdBy: 'admin-qa' }),
    );
  });

  it('refuses a zone that would belong to no market', async () => {
    const { admin, zoneRepo } = makeService();
    await expect(admin.createZone({ name: 'Nowhere' }, 'root')).rejects.toThrow(
      BadRequestException,
    );
    expect(zoneRepo.save).not.toHaveBeenCalled();
  });

  it("writes a locked admin's own market even when the body names another", async () => {
    // The gateway refuses `countryCode: 'IN'` from a QA-locked caller outright.
    // Over TCP the market is simply the lock, so the worst a forged body can do
    // is create a zone where the caller was already entitled to create one.
    const { admin, zoneRepo } = makeService();
    await admin.createZone({ name: 'Bandra' }, 'admin-qa', 'QA', 'IN');
    expect(zoneRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
  });
});

// ── 7. The sub-regional rule, which only this module needs ──────────────────

describe('one market rule for the admin list and the storefront', () => {
  it('matches a sub-regional restaurant the way the storefront does', async () => {
    // 'QA-DOH' is a QA restaurant. An exact match made it invisible to the QA
    // admin while the storefront listed it — two answers for one market (audit
    // I4). `getAdminRestaurantList` is the storefront's own prefix predicate,
    // reached through the delegation below rather than copied.
    const { admin, svc } = makeService();
    await admin.listRestaurants({ page: 1, limit: 20, scope: 'QA' });
    expect(svc.getAdminRestaurantList).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'QA' }),
    );
  });

  it('normalises a sub-region in the request to its country', async () => {
    const { admin, svc } = makeService();
    await admin.listRestaurants({ region: 'QA-DOH' });
    expect(svc.getAdminRestaurantList).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'QA' }),
    );
  });

  it("narrows to the lock when the payload names another market's sub-region", async () => {
    const { admin, svc } = makeService();
    await admin.listRestaurants({ scope: 'QA', region: 'IN-MH' });
    expect(svc.getAdminRestaurantList).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'QA' }),
    );
  });
});

// ── 8. Validation the console depends on ────────────────────────────────────

describe('the admin writes refuse an incomplete decision', () => {
  it('will not close a complaint without recording what was done', async () => {
    const { admin, complaintRepo } = makeService({
      complaints: [{ id: 'c-1', restaurantId: 'r-qa', status: ComplaintStatus.OPEN }],
      restaurants: [{ id: 'r-qa', regionCode: 'QA' }],
    });
    await expect(admin.resolveComplaint('c-1', '  ', 'admin-qa', 'QA')).rejects.toThrow(
      BadRequestException,
    );
    expect(complaintRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a commission rate outside 0–100', async () => {
    const { admin } = makeService({ restaurants: [{ id: 'r-qa', regionCode: 'QA' }] });
    await expect(
      admin.updateCommissions({ restaurantId: 'r-qa', commissionRate: 140 }, 'root'),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses an analytics period it does not recognise', async () => {
    const { admin } = makeService();
    await expect(admin.getAnalytics({ period: '3y' })).rejects.toThrow(BadRequestException);
  });
});
