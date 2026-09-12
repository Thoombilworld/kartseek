import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
// The leaf config module, not `@app/region`'s barrel: the barrel pulls in the
// Nest module, guard, middleware and the India pincode dataset, and every
// service that reads a market scope would carry all of it. `region.config.ts`
// imports nothing but its own types, so there is no cycle and nothing to bundle.
import { isSupportedRegion } from '@app/region/region.config';

/**
 * The backend half of staff market scope.
 *
 * The gateway resolves the market a request may act in from the signed token
 * (`guards/market-scope.ts`) and forwards it as `scope`. A handler must not
 * trust that alone: it loads the row, reads the row's own market and calls
 * `assertInMarket` — so a regional admin who reaches a handler by any path
 * (query, body, path id, header, a future route someone forgot to scope) is
 * still refused by the record itself.
 */
const fallbackLogger = new Logger('MarketScope');

/**
 * THE MARKET COLUMN, AND THE FOUR MODULES THAT SPELL IT DIFFERENTLY (I7).
 *
 * `region_code` is the platform's name for "which market this row belongs to",
 * ISO-2, and every entity written from here on uses it. Four modules predate
 * the convention and call it `countryCode`, and renaming those columns is a
 * migration across four databases with no scope benefit — the readers already
 * normalise through this file. The exception is recorded here, where anyone
 * writing a scope check will read it, rather than only in a plan ledger:
 *
 *   hotel      `hotels.country_code`            — and an unused `regionCode`
 *                                                 beside it, which is dead and
 *                                                 must not be written (I13)
 *   taxi       `taxi_drivers.country_code`, `taxi_vendors.country_code`,
 *              `taxi_payouts.country_code`
 *   franchise  `franchises.country_code`
 *   payment    `payments.countryCode`, `settlement_records.countryCode`
 *              — the latter is why `MoneyPathMarket` does NOT add a
 *                `region_code` to settlements: it already has the market, and a
 *                second column would be the dead pair F-35 records
 *
 * And two modules carry BOTH, where the second is dead: `restaurants` and
 * `pharmacy_stores` hold an alpha-3 `countryCode` defaulting to `'KEN'` beside
 * the `regionCode` every scope check actually reads (F-35).
 *
 * A scope check reads the column its module actually writes, and passes it
 * through `normaliseMarket` so one rule serves every spelling. `assertRecordMarket`
 * takes the column name as a `keyof`, so naming the wrong one is a compile
 * error rather than an assertion against `undefined`.
 */

/**
 * A market code, normalised to the platform's ISO-2 form.
 *
 * Sub-region codes ('QA-DOH', 'IN-MH') normalise to their country, because the
 * platform's unit of scope is the country: `users.region_code`, the JWT claim
 * and every `?country=` filter are ISO-2. Restaurant stored sub-regions and
 * then matched them two different ways — a prefix on the customer read, an
 * exact string on the admin read — so a 'QA-DOH' restaurant was invisible to
 * the QA admin who was supposed to moderate it and 403'd on approve (audit I4).
 * Normalising here means one rule serves both sides and no caller has to
 * remember which.
 */
export function normaliseMarket(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toUpperCase();
  if (!v) return undefined;
  const country = v.split(/[-_]/)[0];
  // Validated against the registry, not just shaped like a code. This used to
  // be `country.slice(0, 2)`, which turned `NOT-A-COUNTRY` into `NO` (Norway)
  // and the alpha-3 `KEN` into `KE` (Kenya) — and `marketplace.sellers`
  // holds both shapes in dev, so a garbage market normalised to a real one.
  // `REGION_CONFIGS` is the same list the storefront and the gateway read;
  // a second copy of it here is how one fact came to have four answers.
  return isSupportedRegion(country) ? country : undefined;
}

/**
 * The caller's lock, or `undefined` for a genuinely global caller — and a
 * refusal for anything in between.
 *
 * `undefined` is how this module spells "no lock, add no predicate, assert
 * nothing". That makes an unreadable lock the dangerous case: once
 * `normaliseMarket` is strict, a scope of `'NOT-A-COUNTRY'` returns `undefined`
 * and every caller below would read it as a global admin — a lock that was
 * meant to narrow would open every market instead. So a scope that is present
 * but not a known country is refused here, before any query is built or any row
 * is compared, and the code it refused goes in the log: the only way to get one
 * is a token claim or an RPC payload that should never have been minted.
 *
 * The thrown copy is the platform's fixed unattributable wording. The log
 * carries the detail, as everywhere else in this file.
 */
function resolveLock(
  scope: string | undefined,
  what: string,
  logger: { warn(message: string): void } = fallbackLogger,
): string | undefined {
  if (scope === undefined || scope === null || String(scope).trim() === '') return undefined;
  const lock = normaliseMarket(scope);
  if (lock) return lock;
  logger.warn(
    `[region-scope-denied] scope "${scope}" is not a market this platform knows; ` +
      `refused rather than widened to every market (${what})`,
  );
  throw new ForbiddenException(`This ${what} cannot be attributed to a market yet.`);
}

/**
 * The market a list query filters on: the lock wins over whatever was requested.
 *
 * An unreadable LOCK is refused (`resolveLock`) — returning `undefined` would
 * add no predicate at all and hand a locked caller every market's rows.
 *
 * An unreadable `requested` is ignored rather than refused. It only ever
 * reaches here from a global caller — `resolveMarket` in the gateway has
 * already refused a locked caller who named another market — and a global
 * caller may see every market anyway, so there is nothing to leak. Validating
 * `?country=` into a 400 is the DTO's job, not this function's; where a route
 * still lacks that, a typo silently widens a global admin's own view.
 */
export function marketPredicate(
  scope: string | undefined,
  requested?: string | null,
  logger?: { warn(message: string): void },
): string | undefined {
  return resolveLock(scope, 'market scope', logger) ?? normaliseMarket(requested ?? undefined);
}

/**
 * Refuse a scoped caller when the record cannot be attributed to any market
 * yet (fail closed), logged with the same prefix as every other denial.
 */
export function refuseUnattributable(
  scope: string | undefined,
  what: string,
  logger: { warn(message: string): void } = fallbackLogger,
  message?: string,
): void {
  const lock = resolveLock(scope, what, logger);
  if (!lock) return;
  logger.warn(
    `[region-scope-denied] ${what} cannot be attributed to a market yet; refused for a ${lock}-scoped admin`,
  );
  throw new ForbiddenException(message ?? `This ${what} cannot be attributed to a market yet.`);
}

/**
 * `isGlobal` distinguishes the two things a null market used to mean.
 *
 * A row with no market was either a promotion that genuinely runs everywhere or
 * a row nobody has attributed yet, and four entities encoded that difference
 * four ways (scalar `region_code`, `regions[]`, `applicableCountries`,
 * `countries` jsonb). Both cases stay refused for a locked caller — a global
 * promotion is not a regional admin's to edit — but an operator reading
 * `[region-scope-denied]` could not tell which they were looking at, so a
 * missing backfill and a deliberately global row produced the same line.
 *
 * The flag changes the LOG ONLY. The thrown copy is fixed platform wording and
 * the outcome is unchanged: nothing here widens what a locked admin may do.
 */
export function assertInMarket(
  recordRegion: string | null | undefined,
  scope: string | undefined,
  what: string,
  logger: { warn(message: string): void } = fallbackLogger,
  opts?: { isGlobal?: boolean | null },
): void {
  const lock = resolveLock(scope, what, logger);
  if (!lock) return;
  // The RECORD side stays a comparison, not a throw: a row whose market is
  // garbage belongs to no market, so it reads as unattributed and is refused
  // for a locked reader while a global one is unaffected. Only the LOCK — which
  // comes from a signed token — is strict enough to refuse outright.
  const owner = normaliseMarket(recordRegion ?? undefined) ?? null;
  if (owner === lock) return;
  const where =
    owner ?? (opts?.isGlobal === true ? 'every market (explicitly global)' : 'no market yet');
  logger.warn(`[region-scope-denied] ${what} in ${where} refused for a ${lock}-scoped admin`);
  throw new ForbiddenException(
    `This ${what} belongs to ${owner ?? 'every market'}, not to the ${lock} market.`,
  );
}

/**
 * Add the market predicate to a list query.
 *
 * `expression` names the column in the query's own vocabulary — `'s.regionCode'`
 * for an entity property, `'o.region_code'` for a raw column. Always `andWhere`:
 * TypeORM's `where()` REPLACES the clause, and one hand-written predicate that
 * used it returned every market's bank offers the moment a status filter was
 * applied (audit V3). Returns the builder so it chains.
 *
 * A predicate, never a post-filter: filtering after `take(limit)` returns a
 * short page that reads as "this market has nothing", which is indistinguishable
 * from a leak in the other direction.
 *
 * The parameter is named `__market` so it cannot collide with a caller's own
 * `:market`/`:region`/`:scope` binding — a repeated parameter name in one
 * builder silently takes the last value bound, which would apply one market's
 * filter under another market's name.
 */
export function applyMarketFilter<T extends { andWhere(e: string, p?: object): T }>(
  qb: T,
  expression: string,
  scope: string | undefined,
  requested?: string | null,
  logger?: { warn(message: string): void },
): T {
  const market = marketPredicate(scope, requested, logger);
  return market ? qb.andWhere(`${expression} = :__market`, { __market: market }) : qb;
}

/**
 * Load-then-assert, with "no such id" and "not your market" kept apart.
 *
 * A handler that asserts on a row it did not check for existence reports a
 * missing id as a market denial, which sends an operator hunting for a
 * permission problem that is a typo. The parameter name `column` is a keyof, so
 * a renamed column is a compile error rather than an assertion against
 * `undefined` — which passes for a global admin and refuses everyone else.
 */
export function assertRecordMarket<T extends object>(
  row: T | null | undefined,
  column: keyof T,
  scope: string | undefined,
  what: string,
  logger?: { warn(m: string): void },
): asserts row is T {
  if (!row) throw new NotFoundException(`No ${what} with that id`);
  assertInMarket(row[column] as unknown as string | null | undefined, scope, what, logger, {
    isGlobal: isGlobalMarket(row as { isGlobal?: boolean | null }),
  });
}

/**
 * "Runs in every market" as an explicit flag, not as an absent value.
 *
 * A null market meant two different things — a promotion that runs everywhere,
 * and a row nobody has attributed yet — and four entities encoded the
 * difference four ways (scalar, `regions[]`, `applicableCountries`, `countries`
 * jsonb). `is_global` says which, so `assertInMarket` can keep refusing the
 * unattributed while a genuinely global promotion reads as global.
 *
 * Deliberately strict about `true`: a missing flag is "not yet attributed", so a
 * row that has never been through the backfill is never mistaken for global.
 */
export function isGlobalMarket(row: {
  regionCode?: string | null;
  isGlobal?: boolean | null;
}): boolean {
  return row.isGlobal === true;
}
