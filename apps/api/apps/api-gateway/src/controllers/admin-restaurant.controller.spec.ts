import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { RolesGuard } from '../guards/roles.guard';
import { AdminRestaurantController } from './admin-restaurant.controller';

/**
 * The gateway half of the restaurant admin boundary.
 *
 * `scope` is produced here and nowhere else: `resolveScope` reads the verified
 * token, refuses a region-locked administrator who names another market, and
 * hands restaurant-service a market it may narrow to. These tests pin that, the
 * permission keys each route carries, and the 503 an outage has to answer with —
 * never an empty page, which is indistinguishable from "this market has none".
 */

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const inAdmin = { id: 'u-in', role: 'ADMIN', regionCode: 'IN', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminRestaurantController(client as any), client };
};

const RESTAURANT_ID = '11111111-1111-4111-8111-111111111111';

describe('AdminRestaurantController market scope', () => {
  it("confines a locked admin's restaurant list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getRestaurants(req(qaAdmin), { page: 1, limit: 20 });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.list' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before restaurant-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.getRestaurants(req(qaAdmin), { page: 1, limit: 20, countryCode: 'IN' }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getRestaurants(req(globalAdmin), { page: 1, limit: 20, countryCode: 'in' });
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendRestaurant(req(qaAdmin), RESTAURANT_ID, { reason: 'hygiene report' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.suspend' },
      expect.objectContaining({
        id: RESTAURANT_ID,
        reason: 'hygiene report',
        scope: 'QA',
        actorId: 'u-qa',
      }),
    );
  });

  it('refuses a locked admin the globally managed cuisine taxonomy', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.createCuisine(req(qaAdmin), { name: 'Levantine' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('still lets a locked admin read that taxonomy, unfiltered', async () => {
    const { ctrl, client } = build();
    await ctrl.getCuisines(req(qaAdmin));
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin.restaurant.cuisines' }, {});
  });
});

describe('every market-bearing route resolves the caller scope', () => {
  /**
   * One case per command that takes a market, so a route that stops calling
   * `scopeOf` cannot pass by being forgotten here. Each entry is the command the
   * route sends and a call taking the requested market, which is what makes both
   * halves testable: with no market the lock has to be forwarded, and with
   * another market the refusal has to happen before any RPC.
   */
  const marketRoutes: Array<
    [string, (c: AdminRestaurantController, r: any, countryCode?: string) => Promise<unknown>]
  > = [
    ['admin.restaurant.dashboard', (c, r, countryCode) => c.getDashboard(r, { countryCode })],
    ['admin.restaurant.list', (c, r, countryCode) => c.getRestaurants(r, { countryCode })],
    ['admin.restaurant.orders', (c, r, countryCode) => c.getOrders(r, { countryCode })],
    [
      'admin.restaurant.menuApprovals',
      (c, r, countryCode) => c.getMenuApprovals(r, { countryCode }),
    ],
    ['admin.restaurant.complaints', (c, r, countryCode) => c.getComplaints(r, { countryCode })],
    ['admin.restaurant.commissions', (c, r, countryCode) => c.getCommissions(r, { countryCode })],
    [
      'admin.restaurant.analytics',
      (c, r, countryCode) => c.getAnalytics(r, { countryCode, period: '30d' }),
    ],
    ['admin.restaurant.zones', (c, r, countryCode) => c.getZones(r, { countryCode })],
  ];

  for (const [cmd, call] of marketRoutes) {
    it(`${cmd} narrows to the locked admin's market`, async () => {
      const { ctrl, client } = build();
      await call(ctrl, req(inAdmin));
      expect(client.send).toHaveBeenCalledWith(
        { cmd },
        expect.objectContaining({ countryCode: 'IN', scope: 'IN' }),
      );
    });

    it(`${cmd} refuses a locked admin who names another market`, async () => {
      const { ctrl, client } = build();
      await expect(call(ctrl, req(inAdmin), 'QA')).rejects.toThrow(ForbiddenException);
      expect(client.send).not.toHaveBeenCalled();
    });
  }
});

describe('decisions carry the actor and the resolved market', () => {
  it('approve sends actorId, never adminId from a body', async () => {
    const { ctrl, client } = build();
    await ctrl.approveRestaurant(req(qaAdmin), RESTAURANT_ID);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.approve' },
      { id: RESTAURANT_ID, scope: 'QA', actorId: 'u-qa' },
    );
  });

  it('approveMenu forwards only the path id and the token identity', async () => {
    const { ctrl, client } = build();
    await ctrl.approveMenuItem(req(inAdmin), RESTAURANT_ID);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.approveMenu' },
      { id: RESTAURANT_ID, scope: 'IN', actorId: 'u-in' },
    );
  });

  it('resolveComplaint keeps the path id after the body spread', async () => {
    const { ctrl, client } = build();
    await ctrl.resolveComplaint(req(inAdmin), RESTAURANT_ID, {
      resolution: 'Refunded in full',
    } as any);
    expect(client.send.mock.calls[0][1]).toMatchObject({
      id: RESTAURANT_ID,
      resolution: 'Refunded in full',
      scope: 'IN',
      actorId: 'u-in',
    });
  });

  it('updateCommissions forwards the resolved market, not the body one', async () => {
    const { ctrl, client } = build();
    await ctrl.updateCommissions(req(globalAdmin), {
      countryCode: 'qa',
      restaurantId: RESTAURANT_ID,
      commissionRate: 12.5,
    });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.updateCommissions' },
      expect.objectContaining({
        restaurantId: RESTAURANT_ID,
        commissionRate: 12.5,
        countryCode: 'QA',
        actorId: 'u-g',
      }),
    );
  });

  it('createZone stamps the locked market over whatever the body asked for', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.createZone(req(qaAdmin), { name: 'Bandra West', countryCode: 'IN' }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();

    const second = build();
    await second.ctrl.createZone(req(qaAdmin), { name: 'West Bay' });
    expect(second.client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.createZone' },
      expect.objectContaining({ name: 'West Bay', countryCode: 'QA', scope: 'QA' }),
    );
  });
});

describe('an outage reads as an outage, and names the command', () => {
  it('answers 503 rather than an empty page when the service is unreachable', async () => {
    const client = {
      send: vi.fn(() => throwError(() => new Error('connect ECONNREFUSED 127.0.0.1:4018'))),
    };
    const ctrl = new AdminRestaurantController(client as any);
    await expect(ctrl.getOrders(req(qaAdmin), {})).rejects.toMatchObject({
      status: 503,
      message: 'Restaurant service unavailable',
    });
  });
});

describe('every list route answers with data + total', () => {
  /**
   * ONE list shape for all six, and the rows one level down — no more.
   *
   * restaurant-service answers a list with `{ data, total, page, limit }`, and
   * the global `TransformInterceptor` puts whatever the handler returns under
   * `data`. So a handler that returns the service result unwrapped puts the rows
   * at `json.data.data`, which is where M1's marketplace lists and M3's pharmacy
   * lists put theirs; a handler that adds its own `{ data: … }` puts them at
   * `json.data.data.data`. `GET /commissions` and `GET /zones` did exactly that
   * — both were made paged lists by M4 — so the console would have read two
   * different depths across six screens of one module (M4 review I1).
   *
   * The assertion walks the routes rather than naming the two that were wrong,
   * so a list route added later cannot regress it: `data` and `total` have to be
   * on the payload the handler returns, not nested inside it.
   */
  const listRoutes: Array<[string, (c: AdminRestaurantController, r: any) => Promise<any>]> = [
    ['GET /restaurants', (c, r) => c.getRestaurants(r, {})],
    ['GET /orders', (c, r) => c.getOrders(r, {})],
    ['GET /menu-approvals', (c, r) => c.getMenuApprovals(r, {})],
    ['GET /complaints', (c, r) => c.getComplaints(r, {})],
    ['GET /commissions', (c, r) => c.getCommissions(r, {})],
    ['GET /zones', (c, r) => c.getZones(r, {})],
  ];

  /** What restaurant-service really answers a list with. */
  const paged = { data: [{ id: 'row-1' }], total: 1, page: 1, limit: 20, market: 'QA' };

  for (const [label, call] of listRoutes) {
    it(`${label} returns the paged payload unwrapped`, async () => {
      const client = { send: vi.fn(() => of(paged)) };
      const ctrl = new AdminRestaurantController(client as any);
      const payload = await call(ctrl, req(qaAdmin));

      expect(Array.isArray(payload.data), `${label} buries its rows`).toBe(true);
      expect(payload.total).toBe(1);
      // The rows are the service's own, not a re-wrapped copy of the envelope.
      expect(payload.data[0]).toEqual({ id: 'row-1' });
    });
  }

  it('leaves single-object reads and decisions wrapped', async () => {
    // These carry no `total`, nothing pages them, and a bare entity would give
    // the console nowhere to hang anything the route later adds beside it.
    const client = { send: vi.fn(() => of({ id: 'r-1', name: 'Al Majlis Grill' })) };
    const ctrl = new AdminRestaurantController(client as any);
    const detail = await ctrl.getRestaurantById(req(qaAdmin), RESTAURANT_ID);
    const decision = await ctrl.approveRestaurant(req(qaAdmin), RESTAURANT_ID);

    expect(detail).toEqual({ data: { id: 'r-1', name: 'Al Majlis Grill' } });
    expect(decision).toEqual({ data: { id: 'r-1', name: 'Al Majlis Grill' } });
  });
});

describe('POST /commissions needs BOTH permission keys, not either', () => {
  /**
   * `RolesGuard` ORs the roles and ANDs every `perm:` key
   * (`libs/guards/src/roles.guard.ts:120` — `permRequirements.every(...)`), so
   * the route's three keys really do all have to be held. The route is
   * `finance.view` AND `sellers.manage` on purpose: a write gated only by a view
   * key is a read permission that happens to write. Nothing is locked out today
   * (both `admin` and `regional_admin` hold all three), which is exactly why a
   * test is the only thing that keeps the intent from being quietly relaxed to
   * one key later.
   */
  const contextFor = (user: any) =>
    ({
      getHandler: () => (): undefined => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user, headers: {} }) }),
    }) as any;

  /** The keys the route actually declares, read off its metadata. */
  const required = (): string[] =>
    Reflect.getMetadata('roles', (AdminRestaurantController.prototype as any).updateCommissions) ??
    [];

  const guard = () =>
    new RolesGuard(
      { getAllAndOverride: () => required() } as unknown as Reflector,
      {
        verify: () => {
          throw new Error('not used');
        },
      } as any,
    );

  const admin = (...adminPermissions: string[]) => ({ role: 'admin', adminPermissions });

  it('declares the module key, the finance key and the seller key', () => {
    expect(required()).toEqual(
      expect.arrayContaining([
        'perm:modules.restaurant',
        'perm:finance.view',
        'perm:sellers.manage',
      ]),
    );
  });

  it('admits a caller holding all three', () => {
    expect(
      guard().canActivate(
        contextFor(admin('modules.restaurant', 'finance.view', 'sellers.manage')),
      ),
    ).toBe(true);
  });

  it('refuses a caller with finance.view but not sellers.manage', () => {
    expect(() =>
      guard().canActivate(contextFor(admin('modules.restaurant', 'finance.view'))),
    ).toThrow(ForbiddenException);
  });

  it('refuses a caller with sellers.manage but not finance.view', () => {
    expect(() =>
      guard().canActivate(contextFor(admin('modules.restaurant', 'sellers.manage'))),
    ).toThrow(ForbiddenException);
  });

  it("admits the super admin's wildcard", () => {
    expect(guard().canActivate(contextFor({ role: 'super_admin', adminPermissions: ['*'] }))).toBe(
      true,
    );
  });
});

describe('every handler names a module permission key', () => {
  /**
   * Read off the metadata rather than the source text: a method-level `@Roles`
   * REPLACES the class-level one, so a handler that names a key and forgets the
   * two roles has silently removed them. Both halves are asserted here.
   */
  it('carries perm:modules.restaurant and both admin roles on all seventeen', () => {
    const proto = AdminRestaurantController.prototype as any;
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (n) =>
        n !== 'constructor' &&
        typeof proto[n] === 'function' &&
        Reflect.getMetadata('path', proto[n]),
    );
    expect(handlers.length).toBe(17);
    const missing = handlers.filter((name) => {
      const roles: string[] = Reflect.getMetadata('roles', proto[name]) ?? [];
      // `UserRole.ADMIN` is the string `'admin'`; the enum's values are what the
      // decorator stores and what `RolesGuard` compares against.
      return (
        !roles.includes('perm:modules.restaurant') ||
        !roles.includes('admin') ||
        !roles.includes('super_admin')
      );
    });
    expect(missing).toEqual([]);
  });
});
