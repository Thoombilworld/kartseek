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

/** Roles allowed to act on any seller (support, moderation, back-office). */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/** Route params that carry a seller id. */
const SELLER_PARAMS = ['sellerId', 'id'] as const;

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
 * Fail-closed throughout: an unknown seller, a seller with no `owner_id`, or an
 * unreachable lookup all deny. A 403 (never 404) is returned for a non-owner so seller
 * ids cannot be probed for existence.
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

    if (ADMIN_ROLES.has(String(user.role ?? '').toUpperCase())) return true;

    const sellerId = this.extractSellerId(request);
    // No seller in the path — nothing object-level to authorise here.
    if (!sellerId) return true;

    const userId = user.id ?? user.userId ?? user.sub;
    if (!userId) {
      throw new ForbiddenException('You do not have access to this seller account.');
    }

    const ownerId = await this.resolveOwner(sellerId);
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

  /** Returns the owning user id, or null when unknown / unresolvable (deny). */
  private async resolveOwner(sellerId: string): Promise<string | null> {
    const cacheKey = `seller-owner:${sellerId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      // '' is the cached form of "no owner" — still a deny, but avoids re-querying.
      if (cached !== null && cached !== undefined) return cached === '' ? null : cached;
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let ownerId: string | null;
    try {
      const res = await firstValueFrom(
        this.sellerClient
          .send<{ sellerId: string; ownerId: string | null }>({ cmd: 'get_seller_owner' }, { sellerId })
          .pipe(timeout(SellerOwnershipGuard.LOOKUP_TIMEOUT_MS)),
      );
      ownerId = res?.ownerId ?? null;
    } catch (e) {
      // Deny on lookup failure. Returning null here is what makes this fail-closed:
      // a marketplace-service outage must not become an authorisation bypass.
      this.logger.error(`Ownership lookup failed for seller=${sellerId}: ${(e as Error).message}`);
      return null;
    }

    try {
      await this.redis.set(cacheKey, ownerId ?? '', SellerOwnershipGuard.CACHE_TTL_SECONDS);
    } catch {
      // Caching is best-effort.
    }

    return ownerId;
  }
}
