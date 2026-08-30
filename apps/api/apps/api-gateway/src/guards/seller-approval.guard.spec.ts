import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SellerApprovalGuard } from './seller-approval.guard';

/**
 * Regression cover for the defect this guard exists for: approval was enforced
 * only in the browser. `SellerRoleGuard` read `users.status` client-side and hid
 * the portal, while nothing on the server ever read
 * `sellers.verificationStatus` — so an admin who suspended or rejected a seller
 * in the super-admin console changed a column and nothing else, and the
 * suspended seller kept full access to the seller API.
 */

const SELLER_ID = 'seller-aaa';

function contextFor(user: any, params: any = { sellerId: SELLER_ID }, type: 'http' | 'rpc' = 'http') {
  return {
    getType: () => type,
    getHandler: () => (): undefined => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as any;
}

/**
 * `owner` is what `get_seller_by_owner` answers — the lookup the guard falls back
 * to when the route names no seller. It defaults to the seller under test, which
 * is the normal case on the `/seller/*` surface: the id comes from the JWT, not
 * the URL. Pass `owner: null` to model a signed-in user with no seller account.
 */
function guardReturning(
  status: unknown,
  opts: { fail?: boolean; cached?: unknown; owner?: { id: string } | null } = {},
) {
  const owner = opts.owner === undefined ? { id: SELLER_ID } : opts.owner;
  const client = {
    send: jest.fn().mockImplementation((pattern: any) => {
      if (pattern?.cmd === 'get_seller_by_owner') return of(owner);
      return opts.fail ? throwError(() => new Error('ECONNREFUSED')) : of(status);
    }),
  };
  const redis = {
    getJson: jest.fn().mockResolvedValue(opts.cached ?? null),
    setJson: jest.fn().mockResolvedValue(undefined),
  };
  return { guard: new SellerApprovalGuard(client as any, redis as any), client, redis };
}

const verified = { sellerId: SELLER_ID, found: true, verificationStatus: 'VERIFIED', isActive: true };
const seller = { id: 'u1', role: 'seller', sellerType: 'marketplace' };

describe('SellerApprovalGuard', () => {
  it('admits an approved seller', async () => {
    const { guard } = guardReturning(verified);
    await expect(guard.canActivate(contextFor(seller))).resolves.toBe(true);
  });

  it.each(['PENDING', 'REJECTED', 'SUSPENDED'])('refuses a %s seller', async (status) => {
    const { guard } = guardReturning({ ...verified, verificationStatus: status });
    await expect(guard.canActivate(contextFor(seller))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a seller whose account has been deactivated', async () => {
    const { guard } = guardReturning({ ...verified, isActive: false });
    await expect(guard.canActivate(contextFor(seller))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an unknown seller rather than treating it as nothing to check', async () => {
    const { guard } = guardReturning({ sellerId: SELLER_ID, found: false, verificationStatus: null, isActive: false });
    await expect(guard.canActivate(contextFor(seller))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed when the lookup is unreachable', async () => {
    // A marketplace-service outage must not become a way for a suspended seller
    // to keep trading.
    const { guard } = guardReturning(null, { fail: true });
    await expect(guard.canActivate(contextFor(seller))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an unrecognised verification status', async () => {
    const { guard } = guardReturning({ ...verified, verificationStatus: 'UNDER_REVIEW' });
    await expect(guard.canActivate(contextFor(seller))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('admits an admin acting on a suspended seller', async () => {
    // Suspending an account is precisely when back-office tooling needs to reach it.
    const { guard } = guardReturning({ ...verified, verificationStatus: 'SUSPENDED' });
    await expect(guard.canActivate(contextFor({ id: 'a1', role: 'SUPER_ADMIN' }))).resolves.toBe(true);
  });

  /**
   * The `/seller/*` surface names no seller in the path — `SellerController`
   * derives it from the JWT subject. The guard used to give up at that point and
   * return true, which made it a no-op on the portal's main surface: a suspended
   * seller kept full access to dashboard, products, orders, settings and payouts,
   * and a still-PENDING applicant could list products before anyone reviewed
   * their KYC. Only `/sellers/:sellerId/*` was ever really guarded.
   */
  describe('routes that name no seller', () => {
    it('resolves the seller from the caller and enforces approval', async () => {
      const { guard, client } = guardReturning({ ...verified, verificationStatus: 'SUSPENDED' });

      await expect(guard.canActivate(contextFor(seller, {}))).rejects.toBeInstanceOf(ForbiddenException);
      expect(client.send).toHaveBeenCalledWith({ cmd: 'get_seller_by_owner' }, { ownerId: 'u1' });
    });

    it('admits an approved seller on the same surface', async () => {
      const { guard } = guardReturning(verified);
      await expect(guard.canActivate(contextFor(seller, {}))).resolves.toBe(true);
    });

    it('stands aside for a user who owns no seller account', async () => {
      // Not a denial: they have not applied, so there is no approval state to
      // report. The route answers "no seller account is linked to this user",
      // which is accurate — "awaiting approval" would not be.
      const { guard, client } = guardReturning(verified, { owner: null });

      await expect(guard.canActivate(contextFor(seller, {}))).resolves.toBe(true);
      expect(client.send).not.toHaveBeenCalledWith({ cmd: 'get_seller_account_status' }, expect.anything());
    });
  });

  it('rejects an unauthenticated request', async () => {
    const { guard } = guardReturning(verified);
    await expect(guard.canActivate(contextFor(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('leaves RPC alone — the gateway authorises before forwarding', async () => {
    const { guard } = guardReturning({ ...verified, verificationStatus: 'SUSPENDED' });
    await expect(guard.canActivate(contextFor(seller, { sellerId: SELLER_ID }, 'rpc'))).resolves.toBe(true);
  });

  it('serves a cached decision without re-querying', async () => {
    const { guard, client } = guardReturning(verified, { cached: { ...verified, verificationStatus: 'SUSPENDED' } });
    await expect(guard.canActivate(contextFor(seller))).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it('reads the seller id from an `id` param too', async () => {
    const { guard } = guardReturning({ ...verified, verificationStatus: 'SUSPENDED' });
    await expect(guard.canActivate(contextFor(seller, { id: SELLER_ID }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
