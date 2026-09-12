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
import { assertRecordInScope, marketScopeOf } from './market-scope';

/** Roles allowed to act on any seller (support, moderation, back-office). */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/** Route params that carry a seller id. */
const SELLER_PARAMS = ['sellerId', 'id'] as const;

/**
 * Redis namespace for the guard's per-seller scope entry.
 *
 * v2 because the cached value gained the market. A warm v1 entry holds a bare
 * owner id, which the v2 parser would read as `regionCode = null` — a locked
 * admin refused on a seller that is in fact theirs. A new key namespace lets
 * the two builds run side by side through a rollout.
 */
export const SELLER_SCOPE_CACHE_PREFIX = 'seller-scope:v2:';

/**
 * The guard's cache key for one seller.
 *
 * Exported, and used by the guard itself, so that the key exists in exactly one
 * place: `AdminMarketplaceController.applySellerDecision` has to purge this
 * entry when a decision lands, and when the prefix was private that site went
 * on deleting `seller-owner:<id>` — a key this guard no longer writes — while
 * its comment claimed the invalidation still happened.
 */
export function sellerScopeCacheKey(sellerId: string): string {
  return `${SELLER_SCOPE_CACHE_PREFIX}${sellerId}`;
}

/**
 * SellerOwnershipGuard (API Gateway) — object-level authorisation for `/sellers/:sellerId/*`.
 *
 * The gateway's seller routes were authenticated and role-checked but never verified
 * that the caller OWNS the seller named in the URL. `sellerId` comes from the path,
 * the frontend supplies it from client state, and the handler forwarded it straight to
 * marketplace-service over TCP. Any authenticated SELLER could therefore read or write
 * another seller's orders, inventory, payouts, storefront and brand data across 80
 * routes. See docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md (C2).
 *
 * marketplace-service's own SellerOwnershipGuard cannot cover this: it returns `true`
 * for RPC contexts by design, precisely because the gateway is supposed to have
 * authorised the caller before forwarding. This guard is that missing check.
 *
 * The gateway holds no seller repository, so ownership is resolved over TCP
 * (`get_seller_owner`) and cached briefly in Redis — ownership changes about as often
 * as an account is created, so a short TTL is ample and keeps this off the hot path.
 *
 * Fail-closed throughout: an unknown seller, a seller with no `owner_id`, a
 * seller with no `region_code` reached by a region-locked admin, or an
 * unreachable lookup all deny. A 403 (never 404) is returned for a non-owner so
 * seller ids cannot be probed for existence.
 */
@Injectable()
export class SellerOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(SellerOwnershipGuard.name);

  private static readonly LOOKUP_TIMEOUT_MS = 3000;
  private static readonly CACHE_TTL_SECONDS = 60;

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

    const sellerId = this.extractSellerId(request);
    // No seller in the path — nothing object-level to authorise here.
    if (!sellerId) return true;

    // An admin skips the OWNERSHIP test — support and moderation act on
    // accounts they do not own — but never the MARKET test. This used to be a
    // bare `return true`, which is what opened all 111 `/sellers/:sellerId/*`
    // routes to a region-locked admin from every other market (audit V1).
    // A global admin is not locked, so the lookup is paid for only when its
    // answer can change the outcome.
    if (ADMIN_ROLES.has(String(user.role ?? '').toUpperCase())) {
      if (!marketScopeOf(request).locked) return true;
      const { regionCode } = await this.resolveSeller(sellerId);
      assertRecordInScope(request, regionCode, 'this seller');
      return true;
    }

    const userId = user.id ?? user.userId ?? user.sub;
    if (!userId) {
      throw new ForbiddenException('You do not have access to this seller account.');
    }

    const { ownerId } = await this.resolveSeller(sellerId);
    if (ownerId && ownerId === userId) return true;

    this.logger.warn(
      `Blocked seller access: user=${userId} role=${user.role} seller=${sellerId}` +
        (ownerId ? '' : ' (no owner_id on record — unknown seller or needs backfill)'),
    );
    throw new ForbiddenException('You do not have access to this seller account.');
  }

  private extractSellerId(request: any): string | undefined {
    for (const key of SELLER_PARAMS) {
      const v = request.params?.[key];
      if (v) return String(v);
    }
    return undefined;
  }

  /**
   * The owning user and the market of a seller, or nulls when unknown.
   *
   * Nulls deny in both directions: an unresolvable owner denies a seller, and an
   * unresolvable market denies a locked admin (`assertRecordInScope` refuses a
   * `null` region). A failed lookup is neither cached nor retried into a pass —
   * a marketplace-service outage must not become an authorisation bypass.
   */
  private async resolveSeller(
    sellerId: string,
  ): Promise<{ ownerId: string | null; regionCode: string | null }> {
    const cacheKey = sellerScopeCacheKey(sellerId);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        const [o, r] = String(cached).split('|');
        return { ownerId: o || null, regionCode: r || null };
      }
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let row: { ownerId: string | null; regionCode: string | null };
    try {
      const res = await firstValueFrom(
        this.sellerClient
          .send<{
            sellerId: string;
            ownerId: string | null;
            regionCode: string | null;
          }>({ cmd: 'get_seller_owner' }, { sellerId })
          .pipe(timeout(SellerOwnershipGuard.LOOKUP_TIMEOUT_MS)),
      );
      row = { ownerId: res?.ownerId ?? null, regionCode: res?.regionCode ?? null };
    } catch (e) {
      this.logger.error(`Ownership lookup failed for seller=${sellerId}: ${(e as Error).message}`);
      return { ownerId: null, regionCode: null };
    }

    try {
      await this.redis.set(
        cacheKey,
        `${row.ownerId ?? ''}|${row.regionCode ?? ''}`,
        SellerOwnershipGuard.CACHE_TTL_SECONDS,
      );
    } catch {
      // Caching is best-effort.
    }

    return row;
  }
}
