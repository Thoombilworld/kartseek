import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RedisService } from '@app/redis';
import { firstValueFrom, timeout } from 'rxjs';

/** Roles allowed to act on any grocery store (support, moderation, back-office). */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/** Route params that carry a grocery store id. */
const STORE_PARAMS = ['storeId', 'id'] as const;

/**
 * GroceryStoreOwnershipGuard — object-level authorisation for `/grocery/stores/:storeId/*`.
 *
 * Every seller-facing grocery route was unauthenticated: create, update and delete
 * product, bulk import, store settings, promotions, low stock and CSV export all
 * took the store id straight from the URL and forwarded it over TCP. Anyone at all
 * could rewrite any store's catalogue.
 *
 * `SellerOwnershipGuard` cannot cover these — it resolves ownership from the
 * marketplace `sellers` table, whereas a grocery store's owner lives on
 * `grocery_stores.ownerId`. Same shape, different source of truth.
 *
 * Fail-closed throughout: an unknown store, a store with no `ownerId`, or an
 * unreachable lookup all deny. A 403 (never 404) is returned for a non-owner so
 * store ids cannot be probed for existence.
 */
@Injectable()
export class GroceryStoreOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(GroceryStoreOwnershipGuard.name);

  private static readonly LOOKUP_TIMEOUT_MS = 3000;
  private static readonly CACHE_TTL_SECONDS = 60;

  constructor(
    @Inject('GROCERY_SERVICE') private readonly groceryClient: ClientProxy,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // RPC callers are authorised by the gateway before forwarding; this is the
    // inbound-HTTP check, matching SellerOwnershipGuard's contract.
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('You must be logged in to manage a grocery store.');
    }

    if (ADMIN_ROLES.has(String(user.role ?? '').toUpperCase())) return true;

    const storeId = this.extractStoreId(request);
    // No store in the path — nothing object-level to authorise here.
    if (!storeId) return true;

    const userId = user.id ?? user.userId ?? user.sub;
    if (!userId) {
      throw new ForbiddenException('You do not have access to this store.');
    }

    const ownerId = await this.resolveOwner(storeId);
    if (ownerId && ownerId === userId) return true;

    this.logger.warn(
      `Blocked grocery store access: user=${userId} role=${user.role} store=${storeId}` +
        (ownerId ? '' : ' (no ownerId on record — unknown store or needs backfill)'),
    );
    throw new ForbiddenException('You do not have access to this store.');
  }

  private extractStoreId(request: any): string | undefined {
    for (const key of STORE_PARAMS) {
      const v = request.params?.[key];
      if (v) return String(v);
    }
    return undefined;
  }

  /** Returns the owning user id, or null when unknown / unresolvable (deny). */
  private async resolveOwner(storeId: string): Promise<string | null> {
    const cacheKey = `grocery-store-owner:${storeId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      // '' is the cached form of "no owner" — still a deny, but avoids re-querying.
      if (cached !== null && cached !== undefined) return cached === '' ? null : cached;
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let ownerId: string | null = null;
    try {
      const res = await firstValueFrom(
        this.groceryClient
          .send<{ storeId: string; ownerId: string | null }>({ cmd: 'get_grocery_store_owner' }, { storeId })
          .pipe(timeout(GroceryStoreOwnershipGuard.LOOKUP_TIMEOUT_MS)),
      );
      ownerId = res?.ownerId ?? null;
    } catch (e) {
      // Deny on lookup failure — a grocery-service outage must not become an
      // authorisation bypass.
      this.logger.error(`Ownership lookup failed for grocery store=${storeId}: ${(e as Error).message}`);
      return null;
    }

    try {
      await this.redis.set(cacheKey, ownerId ?? '', GroceryStoreOwnershipGuard.CACHE_TTL_SECONDS);
    } catch {
      // Caching is best-effort.
    }

    return ownerId;
  }
}
