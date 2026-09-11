import { ForbiddenException, Logger } from '@nestjs/common';

/**
 * The market an authenticated staff request may act in.
 *
 * A region-locked ADMIN — the "regional admin" — carries `regionCode` and
 * `regionLocked: true` in the signed token (see `users.region_code` /
 * `users.region_locked`, issued by `AuthController.issueTokens`). Everything
 * they list is filtered to that market, everything they create is forced into
 * it, and anything belonging to another market answers 403 whatever the
 * request names in its query, body, path or headers. SUPER_ADMIN is global
 * by definition; an ADMIN without a lock is global too (the platform's own
 * operations staff).
 *
 * This is the server-side half of a lock the admin console had only ever
 * drawn on screen: the console showed a "region locked" badge from a demo
 * table in its login page while the API accepted any market from anyone with
 * an admin role.
 */
export interface MarketScope {
  /** True when the caller may act in exactly one market. */
  locked: boolean;
  /** That market, when locked. */
  region?: string;
  role: string;
  userId?: string;
}

const logger = new Logger('MarketScope');

export function marketScopeOf(req: any): MarketScope {
  const user = req?.user ?? {};
  const role = String(user.role ?? '').toUpperCase();
  const raw = typeof user.regionCode === 'string' ? user.regionCode.trim().toUpperCase() : '';
  const locked = role !== 'SUPER_ADMIN' && user.regionLocked === true && raw.length > 0;
  return { locked, region: locked ? raw : undefined, role, userId: user.id ?? user.sub };
}

/**
 * The market a request is allowed to address.
 *
 * `requested` is whatever the caller asked for (a `?country=` filter, a
 * `regionCode` in a body). A global admin gets it back unchanged — or
 * `undefined`, meaning every market. A locked admin gets their own market,
 * and a request that names any other one is refused and logged: that is the
 * "Qatar admin asks for India's coupons" case, and it has to be visible in
 * the logs, not just denied.
 */
export function resolveMarket(
  req: any,
  requested?: string | null,
  what = 'that market',
): string | undefined {
  const scope = marketScopeOf(req);
  const wanted =
    typeof requested === 'string' && requested.trim() ? requested.trim().toUpperCase() : undefined;
  if (!scope.locked) return wanted;
  if (wanted && wanted !== scope.region) {
    denyOutOfScope(req, scope, wanted, what);
  }
  return scope.region;
}

/**
 * Refuse a record that belongs to another market. Used after a record has
 * been loaded and its own `regionCode` is known (a global record — `null`
 * region — is not a locked admin's to touch either).
 */
export function assertRecordInScope(
  req: any,
  recordRegion: string | null | undefined,
  what: string,
): void {
  const scope = marketScopeOf(req);
  if (!scope.locked) return;
  const owner = recordRegion ? String(recordRegion).toUpperCase() : null;
  if (owner !== scope.region) denyOutOfScope(req, scope, owner ?? 'every market', what);
}

function denyOutOfScope(req: any, scope: MarketScope, target: string, what: string): never {
  logger.warn(
    `[region-scope-denied] user=${scope.userId ?? 'unknown'} role=${scope.role} scope=${scope.region} ` +
      `target=${target} what="${what}" route=${req?.method ?? ''} ${req?.originalUrl ?? req?.url ?? ''} ` +
      `requestId=${req?.headers?.['x-request-id'] ?? req?.id ?? '-'}`,
  );
  throw new ForbiddenException(
    `Your account is restricted to the ${scope.region} market; ${what} belongs to ${target}.`,
  );
}
