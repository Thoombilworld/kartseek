import { ForbiddenException, Logger } from '@nestjs/common';

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
  return country.length >= 2 ? country.slice(0, 2) : undefined;
}

/** The market a list query filters on: the lock wins over whatever was requested. */
export function marketPredicate(
  scope: string | undefined,
  requested?: string | null,
): string | undefined {
  return normaliseMarket(scope) ?? normaliseMarket(requested ?? undefined);
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
  const lock = normaliseMarket(scope);
  if (!lock) return;
  logger.warn(
    `[region-scope-denied] ${what} cannot be attributed to a market yet; refused for a ${lock}-scoped admin`,
  );
  throw new ForbiddenException(message ?? `This ${what} cannot be attributed to a market yet.`);
}

export function assertInMarket(
  recordRegion: string | null | undefined,
  scope: string | undefined,
  what: string,
  logger: { warn(message: string): void } = fallbackLogger,
): void {
  const lock = normaliseMarket(scope);
  if (!lock) return;
  const owner = normaliseMarket(recordRegion ?? undefined) ?? null;
  if (owner === lock) return;
  logger.warn(
    `[region-scope-denied] ${what} in ${owner ?? 'every market'} refused for a ${lock}-scoped admin`,
  );
  throw new ForbiddenException(
    `This ${what} belongs to ${owner ?? 'every market'}, not to the ${lock} market.`,
  );
}
