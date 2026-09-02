import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RedisService } from '@app/redis';
import { firstValueFrom, timeout } from 'rxjs';

/** Roles that may act on a seller regardless of its approval state. */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/** Route params that carry a seller id. */
const SELLER_PARAMS = ['sellerId', 'id'] as const;

/** The only verification state that may trade. */
const APPROVED = 'VERIFIED';

interface SellerAccountStatus {
  sellerId: string;
  found: boolean;
  verificationStatus: string | null;
  isActive: boolean;
}

/**
 * SellerApprovalGuard — refuses seller API access to an account that has not been
 * approved, or whose approval has been withdrawn.
 *
 * Approval existed only as a client-side condition: the portal's `SellerRoleGuard`
 * read `users.status` in the browser and hid the UI. The API behind it checked
 * authentication (JwtAuthGuard), role (RolesGuard), ownership
 * (SellerOwnershipGuard) and module (SellerModuleGuard) — but nothing anywhere
 * read `sellers.verificationStatus`. An admin who suspended or rejected a seller
 * in the super-admin console changed that column and nothing else, so the
 * suspended seller kept issuing orders, price changes and payout requests through
 * the API, and a still-PENDING applicant could trade before anyone approved them.
 * Hiding a screen is not an authorisation control; this is.
 *
 * Fail-closed: an unknown seller, an unreadable status and an unreachable lookup
 * all deny. Admins are exempt so back-office tooling can still act on a suspended
 * account (which is the whole point of suspending it).
 *
 * Runs after SellerOwnershipGuard, so by the time this denies, the caller has
 * already been proved to own the seller — the 403 leaks nothing they don't know.
 */
@Injectable()
export class SellerApprovalGuard implements CanActivate {
  private readonly logger = new Logger(SellerApprovalGuard.name);

  private static readonly LOOKUP_TIMEOUT_MS = 3000;
  /**
   * Short by design. This is the window in which a just-suspended seller can
   * still act, so it trades a little load for a bounded exposure. Admin
   * approve/suspend/reject/reactivate delete the key outright, so the normal
   * case is immediate.
   */
  private static readonly CACHE_TTL_SECONDS = 30;
  /**
   * Longer than the status TTL, deliberately. One user owns one seller and that
   * binding is set at registration and never edited, so this can be cached well
   * past the window in which an approval decision must take effect.
   */
  private static readonly OWNER_CACHE_TTL_SECONDS = 300;

  static cacheKey(sellerId: string) {
    return `seller-approval:${sellerId}`;
  }

  constructor(
    @Inject('SELLER_SERVICE') private readonly sellerClient: ClientProxy,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to access seller resources.');
    }

    if (ADMIN_ROLES.has(String(user.role ?? '').toUpperCase())) return true;

    const sellerId = await this.resolveSellerId(request, user);
    // No seller resolvable — the caller owns no seller account, so there is no
    // approval state to enforce. Every seller route rejects them on its own
    // ("No seller account is linked to this user"), which is the accurate answer;
    // denying here would report a pending *approval* to someone who has not yet
    // applied.
    if (!sellerId) return true;

    const status = await this.resolveStatus(sellerId);

    if (!status?.found) {
      this.logger.warn(`Blocked seller access: seller=${sellerId} not found during approval check`);
      throw new ForbiddenException('This seller account is not available.');
    }

    if (status.isActive === false) {
      throw new ForbiddenException(
        'This seller account has been deactivated. Contact seller support to restore it.',
      );
    }

    const verification = String(status.verificationStatus ?? '').toUpperCase();
    if (verification !== APPROVED) {
      this.logger.warn(
        `Blocked seller access: user=${user.id ?? user.sub} seller=${sellerId} status=${verification || 'UNKNOWN'}`,
      );
      throw new ForbiddenException(this.messageFor(verification));
    }

    return true;
  }

  private messageFor(verification: string): string {
    switch (verification) {
      case 'PENDING':
        return 'Your seller registration is still awaiting approval.';
      case 'REJECTED':
        return 'Your seller registration was not approved. Contact seller support.';
      case 'SUSPENDED':
        return 'This seller account is suspended. Contact seller support.';
      default:
        return 'This seller account is not approved to trade.';
    }
  }

  /**
   * The seller this request acts on — from the URL, or from who is calling.
   *
   * Route params alone were not enough. The `/sellers/:sellerId/*` surface names
   * the seller in the path, but `/seller/*` derives it from the JWT subject
   * (`SellerController.resolveSellerId`), and on those routes `request.params`
   * holds no seller id at all — so this guard hit `if (!sellerId) return true`
   * and waved through every dashboard, product, order, settings and payout call
   * on the portal's main surface. A suspended seller kept full API access; the
   * only thing that had ever stopped them was the browser hiding the screen.
   *
   * The owner → seller mapping is cached separately from the approval status and
   * for longer: which seller a user owns does not change when an admin approves
   * or suspends them, so it does not need to be invalidated by those decisions —
   * only the status does, and that key is already dropped by
   * `applySellerDecision`.
   */
  private async resolveSellerId(request: any, user: any): Promise<string | undefined> {
    for (const key of SELLER_PARAMS) {
      const v = request.params?.[key];
      if (v) return String(v);
    }

    const ownerId = user?.id ?? user?.userId ?? user?.sub;
    if (!ownerId) return undefined;

    const cacheKey = `seller-of-owner:${ownerId}`;
    try {
      const cached = await this.redis.getJson<{ sellerId: string | null }>(cacheKey);
      if (cached) return cached.sellerId ?? undefined;
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let sellerId: string | null = null;
    try {
      const seller = await firstValueFrom(
        this.sellerClient
          .send<{ id?: string } | null>({ cmd: 'get_seller_by_owner' }, { ownerId })
          .pipe(timeout(SellerApprovalGuard.LOOKUP_TIMEOUT_MS)),
      );
      sellerId = seller?.id ? String(seller.id) : null;
    } catch (e) {
      // Unlike an unresolvable *status*, this is not a deny. The route itself
      // resolves the same id through the same call and will fail on its own if
      // the lookup is genuinely down; denying here would turn a marketplace
      // blip into "your registration is awaiting approval", which is a false
      // and alarming thing to tell an approved seller.
      this.logger.error(`Owner→seller lookup failed for user=${ownerId}: ${(e as Error).message}`);
      return undefined;
    }

    try {
      await this.redis.setJson(cacheKey, { sellerId }, SellerApprovalGuard.OWNER_CACHE_TTL_SECONDS);
    } catch {
      // Caching is best-effort.
    }

    return sellerId ?? undefined;
  }

  /** Returns the account status, or null when unresolvable (deny). */
  private async resolveStatus(sellerId: string): Promise<SellerAccountStatus | null> {
    const cacheKey = SellerApprovalGuard.cacheKey(sellerId);

    try {
      const cached = await this.redis.getJson<SellerAccountStatus>(cacheKey);
      if (cached) return cached;
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let status: SellerAccountStatus;
    try {
      status = await firstValueFrom(
        this.sellerClient
          .send<SellerAccountStatus>({ cmd: 'get_seller_account_status' }, { sellerId })
          .pipe(timeout(SellerApprovalGuard.LOOKUP_TIMEOUT_MS)),
      );
    } catch (e) {
      // Deny on lookup failure: a marketplace-service outage must not become a
      // way for a suspended seller to keep trading.
      this.logger.error(`Approval lookup failed for seller=${sellerId}: ${(e as Error).message}`);
      return null;
    }

    if (!status || typeof status !== 'object') return null;

    try {
      await this.redis.setJson(cacheKey, status, SellerApprovalGuard.CACHE_TTL_SECONDS);
    } catch {
      // Caching is best-effort.
    }

    return status;
  }
}
