import { ForbiddenException, Logger } from '@nestjs/common';
import { normaliseMarket } from '@app/common';

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
 *
 * ── A lock this platform cannot read is refused HERE, at the source ─────────
 *
 * `users.region_code` is admin-editable, so a staff account can carry a market
 * the registry has never heard of. Downstream, the value is only safe while it
 * stays in the `scope` slot: `resolveLock` in `@app/common` refuses an
 * unreadable lock there. But controllers routinely collapse the two slots into
 * one payload field — `region: d?.scope ?? d?.regionCode` — and in the
 * `requested` slot an unreadable value is deliberately IGNORED, which turns a
 * lock that was meant to narrow into no predicate at all: every market's rows,
 * to an admin restricted to one.
 *
 * That is worse than the bug the strict `normaliseMarket` fixed. Before it, a
 * malformed claim normalised to a plausible market and these lists filtered to
 * the wrong ONE market; afterwards they would have returned ALL of them. So the
 * refusal belongs at the point the lock is first read, before any controller can
 * put it anywhere: a locked caller whose own market does not normalise cannot
 * address any market at all. The thrown copy is the platform's fixed
 * unattributable wording; the log names the claim that caused it, because the
 * only way to hold one is a token minted from a bad `users.region_code` row.
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
  const lockedCountry = normaliseMarket(scope.region);
  if (!lockedCountry) {
    logger.warn(
      `[region-scope-denied] user=${scope.userId ?? 'unknown'} role=${scope.role} ` +
        `scope="${scope.region}" is not a market this platform knows; refused rather than ` +
        `widened to every market what="${what}" route=${req?.method ?? ''} ` +
        `${req?.originalUrl ?? req?.url ?? ''} ` +
        `requestId=${req?.headers?.['x-request-id'] ?? req?.id ?? '-'}`,
    );
    throw new ForbiddenException(`This ${what} cannot be attributed to a market yet.`);
  }
  /**
   * ── BOTH SIDES NORMALISE ───────────────────────────────────────────────────
   *
   * This compared `wanted` to the RAW lock, so an admin locked to a sub-region
   * was refused their own country: `IN-KA` asking for `IN` is `'IN' !== 'IN-KA'`
   * and 403. That is not a theoretical shape — `users.region_code` is an
   * unvalidated varchar and the dev database holds `IN-MH` — and the symptom is
   * the one AUD2-079 describes: empty lists and a 403 on approve, for an
   * administrator addressing the market they are locked to.
   *
   * `normaliseMarket` resolves a sub-region to its country and validates
   * against `REGION_CONFIGS`, which is exactly what `assertInMarket` and
   * `assertRecordInScope` already do on the record side. Comparing normalised
   * forms here is what makes those three agree.
   *
   * A `wanted` that does not normalise at all — `IND`, `NOT-A-COUNTRY` — is
   * still refused, because `normaliseMarket` returns `undefined` and `undefined
   * !== lockedCountry`.
   */
  if (wanted && normaliseMarket(wanted) !== lockedCountry) {
    denyOutOfScope(req, scope, wanted, what);
  }

  /**
   * The RAW lock, not the normalised country.
   *
   * What comes back is the caller's own scope as their token states it, and it
   * travels into responses, audit rows and `scope` payload fields. Narrowing
   * `IN-KA` to `IN` on the way out would widen what the value means — a record
   * filed against `IN` is any Indian market's — and would erase, from the audit
   * trail, which sub-region the actor was actually confined to.
   */
  return scope.region;
}

/**
 * Refuse a record that belongs to another market. Used after a record has
 * been loaded and its own `regionCode` is known (a global record — `null`
 * region — is not a locked admin's to touch either).
 *
 * `isGlobal` changes the LOG ONLY, and nothing else. A null market meant two
 * different things — a promotion that genuinely runs everywhere, and a row
 * nobody has attributed yet — so `[region-scope-denied] target=every market`
 * read the same for a deliberate global banner and for a missing backfill.
 * Both stay refused: a global promotion is not a regional admin's to edit.
 *
 * ── BOTH SIDES NORMALISE, exactly as `assertInMarket` does ──────────────────
 *
 * This used to be a raw `String(recordRegion).toUpperCase()` against
 * `scope.region`, while every backend comparison went through `normaliseMarket`
 * — the one place on the platform where the two halves of one rule disagreed
 * (whole-branch review, finding A-3). The record side is where that bites:
 * `marketplace.sellers.region_code` is an unbounded, unvalidated, nullable
 * varchar written straight from `input.countryCode`, and the dev database holds
 * `IN-MH`, `IND`, `NOT-A-COUNTRY` and an XSS payload in it. A seller stored as
 * `IN-MH` was therefore refused for the IN admin who owns that market —
 * invisible in their lists, 403 on approve, which is the AUD2-079 symptom Task
 * 5 fixed for restaurants and left standing here.
 *
 * `normaliseMarket` resolves a sub-region to its country and validates against
 * `REGION_CONFIGS`, so `IN-MH` is IN while `IND` and `NOT-A-COUNTRY` are no
 * market at all — read as unattributed and refused for a locked caller, which
 * is the same outcome as before, now reached for the stated reason. Direction
 * is still safe: nothing widens, because the LOCK side cannot hold garbage (the
 * staff DTOs validate the shape, `assertLockState` validates the value, and
 * `resolveMarket` refuses an unreadable lock at source). An unreadable lock
 * arriving here anyway — `marketScopeOf` does not validate, only `resolveMarket`
 * does — is refused outright rather than compared, for the same reason
 * `resolveLock` refuses it in `@app/common`: a lock that cannot be read must
 * never end up meaning "no lock".
 */
export function assertRecordInScope(
  req: any,
  recordRegion: string | null | undefined,
  what: string,
  isGlobal?: boolean,
): void {
  const scope = marketScopeOf(req);
  if (!scope.locked) return;
  const lock = normaliseMarket(scope.region);
  if (!lock) {
    logger.warn(
      `[region-scope-denied] user=${scope.userId ?? 'unknown'} role=${scope.role} ` +
        `scope="${scope.region}" is not a market this platform knows; refused rather than ` +
        `compared against a record what="${what}" route=${req?.method ?? ''} ` +
        `${req?.originalUrl ?? req?.url ?? ''} ` +
        `requestId=${req?.headers?.['x-request-id'] ?? req?.id ?? '-'}`,
    );
    throw new ForbiddenException(`This ${what} cannot be attributed to a market yet.`);
  }
  const owner = normaliseMarket(recordRegion ?? undefined) ?? null;
  if (owner === lock) return;
  denyOutOfScope(
    req,
    { ...scope, region: lock },
    owner ?? 'every market',
    what,
    // Log detail only. The thrown copy is fixed platform wording and must read
    // the same for both cases; the log is where the two are told apart. A row
    // whose stored market this platform cannot READ lands in the same branch as
    // a null one — it belongs to no market — and the raw value goes in the log.
    owner
      ? undefined
      : isGlobal === true
        ? 'explicitly global'
        : recordRegion
          ? `stored as "${recordRegion}", which is not a market this platform knows`
          : 'not yet attributed',
  );
}

/**
 * Refuse a region-locked admin outright, logged. For targets that have no
 * market dimension yet — platform settings, a refund the owning service cannot
 * attribute — the rule is fail closed until the dimension exists. A global
 * admin passes; the log line names who was refused and why.
 */
export function refuseLockedAdmin(req: any, what: string, message?: string): void {
  const scope = marketScopeOf(req);
  if (!scope.locked) return;
  logger.warn(
    `[region-scope-denied] user=${scope.userId ?? 'unknown'} role=${scope.role} scope=${scope.region} ` +
      `target=every market what="${what}" route=${req?.method ?? ''} ${req?.originalUrl ?? req?.url ?? ''} ` +
      `requestId=${req?.headers?.['x-request-id'] ?? req?.id ?? '-'}`,
  );
  throw new ForbiddenException(
    message ??
      `Your account is restricted to the ${scope.region} market; ${what} belongs to every market.`,
  );
}

function denyOutOfScope(
  req: any,
  scope: MarketScope,
  target: string,
  what: string,
  detail?: string,
): never {
  logger.warn(
    `[region-scope-denied] user=${scope.userId ?? 'unknown'} role=${scope.role} scope=${scope.region} ` +
      `target=${target}${detail ? ` (${detail})` : ''} what="${what}" ` +
      `route=${req?.method ?? ''} ${req?.originalUrl ?? req?.url ?? ''} ` +
      `requestId=${req?.headers?.['x-request-id'] ?? req?.id ?? '-'}`,
  );
  throw new ForbiddenException(
    `Your account is restricted to the ${scope.region} market; ${what} belongs to ${target}.`,
  );
}

/**
 * The market a request may act in, and the filter to forward — the gateway half
 * of the rule, in one place.
 *
 * `market` is what a list query should filter on (`undefined` = every market).
 * `scope` is set only when the caller is locked, and is the proof the backend
 * checks the loaded row against. A locked caller naming another market is
 * refused here, by `resolveMarket`, and logged.
 *
 * Fourteen controllers held a byte-identical private copy of this. Each one is
 * now a three-line delegate that keeps the method name, because the market-scope
 * regression spec proves a handler resolved a market by finding `this.scopeOf(`
 * in the handler's own body — a base class or a param decorator would make that
 * unprovable. `scope-helper-uniqueness.spec.ts` proves there is only one body.
 */
export function resolveScope(
  req: any,
  requested?: string | null,
  what = 'that market',
): { scope?: string; market?: string } {
  const market = resolveMarket(req, requested, what);
  return { scope: marketScopeOf(req).locked ? market : undefined, market };
}
