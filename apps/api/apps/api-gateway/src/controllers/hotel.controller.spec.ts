import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { type Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { SellerModuleGuard, SELLER_MODULE_KEY } from '../guards/seller-module.guard';
import { HotelController } from './hotel.controller';

/**
 * Who may reach the hotel OWNER surface (M5 round 1b).
 *
 * `/hotels/owner/*` declared no `@Roles` at all, and the class binds
 * `JwtAuthGuard, RolesGuard` — a guard that returns `true` for a route with no
 * roles metadata (`roles.guard.ts:32-34`). So every authenticated caller,
 * including a plain CUSTOMER, could create a hotel listing, read an owner's
 * payouts queue, rewrite room pricing or mark a booking a no-show. It was
 * invisible to `admin-market-scope.regression.spec.ts` because that collector
 * only takes routes naming an admin role or carrying an `admin` path segment,
 * and these carry neither.
 *
 * M5's fix round 1 made it load-bearing: in a market with `autoApproveHotels`
 * on, `POST owner/hotels` creates a property in ACTIVE and publishes
 * `hotel.approved`, so the unguarded route could put a live, bookable hotel into
 * a market with no decision by anyone.
 *
 * These tests read the metadata the routes actually declare and run the real
 * guards over it, rather than asserting a decorator is present — a `@Roles` that
 * no guard reads is the failure mode this repository has already paid for once
 * (`payment.controller.ts`, whole-branch review).
 */

/** The ten operational owner routes, by handler name. */
const OWNER_HANDLERS = [
  'createHotel',
  'updateHotel',
  'getOwnerDashboard',
  'getOwnerBookings',
  'updatePricing',
  'bulkUpdatePricing',
  'markNoShow',
  'getOwnerPayouts',
  'getOwnerReviews',
  'replyToReview',
] as const;

const handler = (name: string) =>
  (HotelController.prototype as unknown as Record<string, () => void>)[name];

const rolesOf = (name: string): string[] => Reflect.getMetadata('roles', handler(name)) ?? [];

const modulesOf = (name: string): string[] =>
  Reflect.getMetadata(SELLER_MODULE_KEY, handler(name)) ?? [];

const contextFor = (name: string, user: unknown) =>
  ({
    getType: () => 'http',
    getHandler: () => handler(name),
    getClass: () => HotelController,
    switchToHttp: () => ({ getRequest: () => ({ user, headers: {} }) }),
  }) as never;

/** `RolesGuard` reading the route's own metadata, exactly as Nest would. */
const rolesGuard = (name: string) =>
  new RolesGuard(
    { getAllAndOverride: () => rolesOf(name) } as unknown as Reflector,
    {
      verify: () => {
        throw new Error('not used');
      },
    } as never,
  );

const moduleGuard = (name: string) =>
  new SellerModuleGuard({ getAllAndOverride: () => modulesOf(name) } as unknown as Reflector);

const customer = { id: 'u-cust', role: 'customer' };
const hotelOwner = { id: 'u-owner', role: 'seller', sellerType: 'hotel' };
const grocerySeller = { id: 'u-groc', role: 'seller', sellerType: 'grocery' };
const sellerNoPortal = { id: 'u-none', role: 'seller' };

describe('the hotel owner surface declares a role, on every operational route', () => {
  for (const name of OWNER_HANDLERS) {
    it(`${name} requires the seller role and the hotel portal`, () => {
      expect(rolesOf(name), `${name} declares no @Roles`).toContain('seller');
      expect(modulesOf(name), `${name} declares no @SellerModule`).toEqual(['hotel']);
    });
  }

  /**
   * ADMIN is deliberately absent. Naming it would pull ten owner routes into
   * `admin-market-scope.regression.spec.ts`'s collection, which then requires a
   * resolved market on each — and these are owner-scoped, not market-scoped.
   * Administrators act on hotels through the scoped `/admin/hotel/*` routes.
   */
  it('names no admin role, so the owner surface stays out of the admin census', () => {
    for (const name of OWNER_HANDLERS) {
      expect(rolesOf(name)).toEqual(['seller']);
    }
  });
});

describe('a customer cannot reach the hotel owner surface', () => {
  it('refuses an authenticated CUSTOMER on the create route', () => {
    expect(() =>
      rolesGuard('createHotel').canActivate(contextFor('createHotel', customer)),
    ).toThrow(ForbiddenException);
  });

  it('refuses an authenticated CUSTOMER on every other operational owner route', () => {
    for (const name of OWNER_HANDLERS) {
      expect(() => rolesGuard(name).canActivate(contextFor(name, customer)), name).toThrow(
        ForbiddenException,
      );
    }
  });

  it('admits a hotel owner through both guards', () => {
    for (const name of OWNER_HANDLERS) {
      expect(rolesGuard(name).canActivate(contextFor(name, hotelOwner)), name).toBe(true);
      expect(moduleGuard(name).canActivate(contextFor(name, hotelOwner)), name).toBe(true);
    }
  });
});

describe('the seller role alone is not enough — every seller of every module holds it', () => {
  it('lets a grocery seller past @Roles and refuses them on sellerType', () => {
    // This is the whole reason `@SellerModule('hotel')` is there: `role.enum.ts`
    // records that marketplace, hotel and taxi sellers all carry the plain
    // `seller` role, so the portal is named by `users.seller_type`.
    expect(rolesGuard('createHotel').canActivate(contextFor('createHotel', grocerySeller))).toBe(
      true,
    );
    expect(() =>
      moduleGuard('createHotel').canActivate(contextFor('createHotel', grocerySeller)),
    ).toThrow(ForbiddenException);
  });

  it('fails closed for a seller with no portal at all', () => {
    expect(() =>
      moduleGuard('createHotel').canActivate(contextFor('createHotel', sellerNoPortal)),
    ).toThrow(ForbiddenException);
  });
});

describe('becoming a hotel owner stays possible', () => {
  /**
   * `POST owner/register` is the one `/hotels/owner/*` route with no role, on
   * the same ruling `PublicSellersController` states for `POST /sellers/register`:
   * it is how an account BECOMES a hotel owner, so requiring the seller role
   * would make the role impossible to obtain. It is still authenticated — the
   * class binds `JwtAuthGuard` and the route is not `@Public()`.
   */
  it('lets an authenticated customer apply', () => {
    expect(rolesOf('registerOwner')).toEqual([]);
    expect(rolesGuard('registerOwner').canActivate(contextFor('registerOwner', customer))).toBe(
      true,
    );
  });

  it('is not public — an anonymous caller never reaches the handler', () => {
    expect(Reflect.getMetadata('isPublic', handler('registerOwner'))).toBeFalsy();
  });
});

// ── WHICH owner is acting (round 1c) ────────────────────────────────────────

/**
 * A role says the caller is *a* hotel owner; it never says *which* one.
 *
 * These routes took `ownerId` from `?ownerId=` on four reads and from the body
 * on the writes, so after round 1b gave them a role a hotel owner could still
 * read any other hotel owner's payouts, bookings and reviews by naming them.
 * Every one now derives the owner from the verified JWT subject, stamped AFTER
 * the body spread, and refuses a request that tries to name one.
 */
describe('the owner is the token subject, never the request', () => {
  const build = () => {
    const client = { send: vi.fn(() => of({ ok: true })) };
    return { ctrl: new HotelController(client as never), client };
  };

  const OWNER_A = 'owner-a';
  const OWNER_B = 'owner-b';
  const ID = '11111111-1111-4111-8111-111111111111';
  const reqAs = (id: string, query: object = {}, body: object = {}) => ({
    user: { id, role: 'seller', sellerType: 'hotel' },
    query,
    body,
    headers: {},
  });

  /** Every owner route, called the way Nest would call it. */
  const callers: Array<[string, (c: HotelController, r: any) => unknown]> = [
    ['registerOwner', (c, r) => c.registerOwner(r, {})],
    ['createHotel', (c, r) => c.createHotel(r, {})],
    ['updateHotel', (c, r) => c.updateHotel(r, ID, {})],
    ['getOwnerDashboard', (c, r) => c.getOwnerDashboard(r)],
    ['getOwnerBookings', (c, r) => c.getOwnerBookings(r, 1, 20)],
    ['updatePricing', (c, r) => c.updatePricing(r, ID, {})],
    ['bulkUpdatePricing', (c, r) => c.bulkUpdatePricing(r, ID, {})],
    ['markNoShow', (c, r) => c.markNoShow(r, ID)],
    ['getOwnerPayouts', (c, r) => c.getOwnerPayouts(r, 1, 10)],
    ['getOwnerReviews', (c, r) => c.getOwnerReviews(r)],
    ['replyToReview', (c, r) => c.replyToReview(r, ID, 'thanks')],
  ];

  for (const [name, call] of callers) {
    it(`${name} forwards the token subject as ownerId`, () => {
      const { ctrl, client } = build();
      call(ctrl, reqAs(OWNER_A));
      expect(client.send.mock.calls[0][1]).toMatchObject({ ownerId: OWNER_A });
    });
  }

  it('refuses a query that names another owner, before hotel-service is addressed', () => {
    const { ctrl, client } = build();
    expect(() => ctrl.getOwnerPayouts(reqAs(OWNER_A, { ownerId: OWNER_B }), 1, 10)).toThrow(
      BadRequestException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('refuses a body that names another owner, before hotel-service is addressed', () => {
    const { ctrl, client } = build();
    expect(() =>
      ctrl.createHotel(reqAs(OWNER_A, {}, { ownerId: OWNER_B }), { ownerId: OWNER_B }),
    ).toThrow(BadRequestException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('refuses a body naming a userId too — registration is the same hazard', () => {
    const { ctrl } = build();
    expect(() =>
      ctrl.registerOwner(reqAs(OWNER_A, {}, { userId: OWNER_B }), { userId: OWNER_B }),
    ).toThrow(BadRequestException);
  });

  it('stamps the subject AFTER the spread, so a body value cannot survive', () => {
    // Belt and braces: even if the refusal above were removed, the explicit key
    // after the spread is what actually reaches hotel-service.
    const { ctrl, client } = build();
    ctrl.createHotel(reqAs(OWNER_A), { ownerId: OWNER_B, name: 'x' } as never);
    expect(client.send.mock.calls[0][1]).toMatchObject({ ownerId: OWNER_A, name: 'x' });
  });

  it('refuses a caller with no subject rather than sending an undefined owner', () => {
    const { ctrl, client } = build();
    expect(() => ctrl.getOwnerDashboard({ user: {}, query: {}, body: {}, headers: {} })).toThrow(
      UnauthorizedException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("declares no @Query('ownerId') anywhere in the controller", () => {
    // The four owner reads used to declare it. If one comes back, the per-route
    // assertions above still pass — the subject is stamped either way — while the
    // query parameter would be back in the API's contract, inviting the next
    // caller to use it. So the SOURCE is asserted, not just the behaviour.
    const source = fs.readFileSync(path.join(__dirname, 'hotel.controller.ts'), 'utf8');
    expect(source).not.toMatch(/@Query\(\s*['"`]ownerId['"`]/);
    expect(source).not.toMatch(/@Body\(\s*['"`]ownerId['"`]/);
  });

  /**
   * The case the re-review named: `create_hotel` took `ownerId` straight off the
   * body, so in an auto-approving market a hotel seller could attribute a LIVE
   * property to another owner.
   */
  it('refuses seller A attributing a new hotel to owner B, and sends nothing', () => {
    const { ctrl, client } = build();
    const body = { ownerId: OWNER_B, name: 'Someone elses hotel', country: 'IN' };
    expect(() => ctrl.createHotel(reqAs(OWNER_A, {}, body), body as never)).toThrow(
      BadRequestException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });
});
