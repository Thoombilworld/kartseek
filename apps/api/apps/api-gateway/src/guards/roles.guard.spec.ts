import { ForbiddenException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

/** Minimal ExecutionContext carrying just what the guard reads. */
function contextFor(user: any, headers: Record<string, string> = {}) {
  return {
    getHandler: () => (): undefined => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user, headers }) }),
  } as any;
}

function guardRequiring(required: string[] | undefined) {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  const jwtService = {
    verify: () => {
      throw new Error('not used');
    },
  } as any;
  return new RolesGuard(reflector, jwtService);
}

describe('RolesGuard', () => {
  describe('role requirements', () => {
    it('admits a user whose role matches, ignoring case', () => {
      // @Roles() values come from two different UserRole enums — one uppercase,
      // one lowercase — so the comparison has to be case-insensitive.
      expect(
        guardRequiring(['admin', 'super_admin']).canActivate(contextFor({ role: 'ADMIN' })),
      ).toBe(true);
    });

    it('rejects a role that does not match', () => {
      expect(() => guardRequiring(['admin']).canActivate(contextFor({ role: 'CUSTOMER' }))).toThrow(
        ForbiddenException,
      );
    });

    it('allows any user when the route declares no roles', () => {
      expect(guardRequiring(undefined).canActivate(contextFor({ role: 'CUSTOMER' }))).toBe(true);
    });

    it('rejects a request with no user at all', () => {
      expect(() => guardRequiring(['admin']).canActivate(contextFor(undefined))).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('permission requirements', () => {
    it('denies a permission-only route when the user carries no adminPermissions', () => {
      // The regression this guards: the permission check used to be skipped
      // entirely when `adminPermissions` was absent, so a `perm:`-only route
      // admitted precisely the users with no permissions at all.
      expect(() =>
        guardRequiring(['perm:orders.manage']).canActivate(contextFor({ role: 'CUSTOMER' })),
      ).toThrow(ForbiddenException);
    });

    it('denies when the required permission is missing from the list', () => {
      expect(() =>
        guardRequiring(['perm:orders.manage']).canActivate(
          contextFor({ role: 'ADMIN', adminPermissions: ['reports.view'] }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('admits when every required permission is held', () => {
      expect(
        guardRequiring(['perm:orders.manage']).canActivate(
          contextFor({ role: 'ADMIN', adminPermissions: ['orders.manage'] }),
        ),
      ).toBe(true);
    });

    it('enforces role and permission together when both are declared', () => {
      const ctx = contextFor({ role: 'CUSTOMER', adminPermissions: ['orders.manage'] });
      expect(() => guardRequiring(['admin', 'perm:orders.manage']).canActivate(ctx)).toThrow(
        ForbiddenException,
      );
    });

    it('treats "*" as every permission', () => {
      // SUPER_ADMIN signs in with the wildcard rather than an enumerated list,
      // so a route gated on a key nobody has been granted yet must still admit
      // the account that is allowed to grant it.
      expect(
        guardRequiring(['perm:finance.payouts']).canActivate(
          contextFor({ role: 'ADMIN', adminPermissions: ['*'] }),
        ),
      ).toBe(true);
    });

    it('denies a role-only user a permission-gated route', () => {
      // Holding the role is no longer sufficient once a route names a key: the
      // whole point of B4 is that two accounts with role ADMIN can differ.
      const required = ['admin', 'perm:finance.payouts'];
      expect(() =>
        guardRequiring(required).canActivate(
          contextFor({ role: 'ADMIN', adminPermissions: ['orders.view'] }),
        ),
      ).toThrow(ForbiddenException);
      expect(
        guardRequiring(required).canActivate(
          contextFor({ role: 'ADMIN', adminPermissions: ['finance.payouts'] }),
        ),
      ).toBe(true);
    });
  });
});
