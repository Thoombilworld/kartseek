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

export function normaliseMarket(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toUpperCase();
  return v.length > 0 ? v : undefined;
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
