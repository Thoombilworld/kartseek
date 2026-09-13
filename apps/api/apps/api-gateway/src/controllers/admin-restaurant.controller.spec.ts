import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
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
