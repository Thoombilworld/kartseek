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

/**
 * Roles that may act on any franchise: platform operations, support and
 * moderation. `FRANCHISE_OWNER` is deliberately absent — an owner's access
 * comes from owning the estate, never from the role name.
 */
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

/** The route param that carries a franchise id on this controller. */
const FRANCHISE_PARAMS = ['id'] as const;

/** Redis namespace for the guard's per-franchise access entry. */
export const FRANCHISE_SCOPE_CACHE_PREFIX = 'franchise-scope:v1:';

/**
 * The guard's cache key for one franchise. Exported so that whatever transfers
 * or re-markets a franchise can purge the entry rather than inventing its own
 * spelling of the key — the mistake `seller-owner:<id>` made.
 */
export function franchiseScopeCacheKey(franchiseId: string): string {
  return `${FRANCHISE_SCOPE_CACHE_PREFIX}${franchiseId}`;
}

/**
 * FranchiseAccessGuard (API Gateway) — object-level authorisation for `/franchise/:id/*`.
 *
 * The franchise twin of `SellerOwnershipGuard`, and for the same reason. All 54
 * routes on `FranchiseGatewayController` carried `JwtAuthGuard` and nothing
 * else: no role list and no ownership test. `:id` comes from the URL, so **any
 * authenticated user** — a plain customer included — could read another
 * operator's whole estate by naming their franchise id: dashboard revenue,
 * seller and store lists, order volumes, driver rosters, clinic appointment
 * counts, and the commission rates the franchise trades on. The write routes
 * (`POST :id/<module>/.../status`) let them suspend that operator's stores,
 * restaurants, clinics and drivers (audit AUD2 row on
 * `franchise.controller.ts:83+`, §13 X-47).
 *
 * Two questions, in order:
 *
 *  1. **Ownership** — a non-staff caller must be the franchise's `owner_id`.
 *  2. **Market** — a region-locked staff caller may only reach a franchise in
 *     their own market (§13 X-46). A franchise belongs to exactly one country
 *     (`franchises.country_code`, validated at registration), so this is a
 *     single comparison and not a set intersection.
 *
 * Staff skip the ownership test — support and platform operations act on
 * estates they do not own — but never the market test, which is the mistake
 * that opened every `/sellers/:sellerId/*` route to every regional admin.
 *
 * The gateway holds no franchise repository, so access is resolved over TCP
 * (`franchise.get_access`) and cached for 60 s: an owner id and a country code
 * change about as often as a franchise is created, and the guard runs on every
 * request to the franchise console.
 *
 * Fail-closed throughout: an unknown franchise, a franchise with no `owner_id`,
 * one with no `country_code` reached by a locked admin, and an unreachable
 * lookup all deny. A non-owner always gets 403 and never 404, so franchise ids
 * cannot be probed for existence.
 *
 * Routes with no `:id` — `@Public()` (`/franchise/markets`, `/franchise/health`,
 * `/franchise/register`) and `GET /franchise/me`, which resolves the estate from
 * the token — have no object to authorise and pass through. The id check comes
 * before the user check for exactly that reason: a public route has no user.
 */
@Injectable()
export class FranchiseAccessGuard implements CanActivate {
  private readonly logger = new Logger(FranchiseAccessGuard.name);

  private static readonly LOOKUP_TIMEOUT_MS = 3000;
  private static readonly CACHE_TTL_SECONDS = 60;

  constructor(
    @Inject('FRANCHISE_SERVICE') private readonly franchiseClient: ClientProxy,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();

    // No franchise in the path — nothing object-level to authorise, and the
    // route may legitimately be anonymous.
    const franchiseId = this.extractFranchiseId(request);
    if (!franchiseId) return true;

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to access franchise data.');
    }

    if (STAFF_ROLES.has(String(user.role ?? '').toUpperCase())) {
      // A global staff account is not locked, so the lookup is paid for only
      // when its answer can change the outcome.
      if (!marketScopeOf(request).locked) return true;
      const { countryCode } = await this.resolveFranchise(franchiseId);
      assertRecordInScope(request, countryCode, 'this franchise');
      return true;
    }

    const userId = user.id ?? user.userId ?? user.sub;
    if (!userId) throw new ForbiddenException('You do not have access to this franchise.');

    const { ownerId } = await this.resolveFranchise(franchiseId);
    if (ownerId && ownerId === userId) return true;

    this.logger.warn(
      `Blocked franchise access: user=${userId} role=${user.role} franchise=${franchiseId}` +
        (ownerId ? '' : ' (no owner_id on record — unknown franchise or needs backfill)'),
    );
    throw new ForbiddenException('You do not have access to this franchise.');
  }

  private extractFranchiseId(request: any): string | undefined {
    for (const key of FRANCHISE_PARAMS) {
      const v = request.params?.[key];
      if (v) return String(v);
    }
    return undefined;
  }

  /**
   * The owning user and the market of one franchise, or nulls when unknown.
   *
   * Nulls deny in both directions: an unresolvable owner denies every non-staff
   * caller, and an unresolvable market denies a locked admin
   * (`assertRecordInScope` refuses a `null` region). A failed lookup is neither
   * cached nor retried into a pass — a franchise-service outage must not become
   * an authorisation bypass.
   */
  private async resolveFranchise(
    franchiseId: string,
  ): Promise<{ ownerId: string | null; countryCode: string | null }> {
    const cacheKey = franchiseScopeCacheKey(franchiseId);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        const [o, c] = String(cached).split('|');
        return { ownerId: o || null, countryCode: c || null };
      }
    } catch {
      // Cache miss or Redis down — fall through to the authoritative lookup.
    }

    let row: { ownerId: string | null; countryCode: string | null };
    try {
      const res = await firstValueFrom(
        this.franchiseClient
          .send<{
            id: string;
            ownerId: string | null;
            countryCode: string | null;
          }>({ cmd: 'franchise.get_access' }, { id: franchiseId })
          .pipe(timeout(FranchiseAccessGuard.LOOKUP_TIMEOUT_MS)),
      );
      row = { ownerId: res?.ownerId ?? null, countryCode: res?.countryCode ?? null };
    } catch (e) {
      this.logger.error(
        `Access lookup failed for franchise=${franchiseId}: ${(e as Error).message}`,
      );
      return { ownerId: null, countryCode: null };
    }

    try {
      await this.redis.set(
        cacheKey,
        `${row.ownerId ?? ''}|${row.countryCode ?? ''}`,
        FranchiseAccessGuard.CACHE_TTL_SECONDS,
      );
    } catch {
      // Caching is best-effort.
    }

    return row;
  }
}
