import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
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
