/**
 * Where the taxi module's database is — resolved in exactly one place.
 *
 * `data-source.ts` (the TypeORM CLI's runner) and `taxi-service.module.ts` (the
 * running service) both call `resolveTaxiDbConfig`. They used to resolve the
 * same five values separately, and the last-resort defaults had drifted: the
 * runner fell back to the dedicated container and the service to the shared
 * platform database. With a module `.env` present that difference is invisible;
 * without one — a fresh clone, CI — `migration:run` wrote to one database and
 * the service read another, which is the "the migration ran but the data isn't
 * there" failure this platform has already paid for once.
 *
 * `apps/api/test/module-data-sources.spec.ts` asserts the DataSource's options
 * equal this function's output, and that the service module still calls it.
 *
 * Deliberately module-local rather than in `@app/*`: the runner is loaded by
 * `ts-node` from this directory with no path-alias registration, and a module
 * that can be lifted out of this repository whole is the stated direction.
 */

/** Reads one environment variable. `process.env` for the CLI, `ConfigService` for the service. */
export type EnvReader = (key: string) => string | undefined;

/** The Postgres schema this module owns. Fixed, not configurable: the entities name it too. */
export const TAXI_DB_SCHEMA = 'taxi';

/**
 * The migration ledger, in `public` and named per module.
 *
 * NOT `taxi.migrations`. TypeORM builds the ledger table inside the DataSource's
 * `schema` and does it *before* the first migration's `up()` runs, so on a fresh
 * dedicated database — where the `taxi` schema does not exist yet — `migration:run`
 * died on `CREATE TABLE "taxi"."migrations"` before anything could create it. The
 * DataSource therefore declares no `schema` (each entity names its own instead)
 * and the ledger lands in `public`, where a per-module name keeps the eight
 * apart if they ever share one database — `public.migrations` there is the
 * platform's own ledger.
 */
export const TAXI_MIGRATIONS_TABLE = 'taxi_migrations';

/** Everything needed to reach the taxi database, with nothing left implicit. */
export interface ResolvedTaxiDb {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * `TAXI_DB_*` wins, the shared `DB_*` answers next, and the last resorts are the
 * shared platform database — the same order and the same values on both sides.
 */
export function resolveTaxiDbConfig(read: EnvReader): ResolvedTaxiDb {
  const first = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = read(key);
      if (value !== undefined && value !== null && String(value) !== '') return String(value);
    }
    return undefined;
  };

  return {
    host: first('TAXI_DB_HOST', 'DB_HOST') ?? 'localhost',
    port: Number(first('TAXI_DB_PORT', 'DB_PORT') ?? 5432),
    username: first('TAXI_DB_USER', 'DB_USER') ?? 'postgres',
    // Matches DEV_FALLBACK_PASSWORD in @app/database's databaseCredentials(),
    // which the service still calls for the production guard that refuses this
    // fallback when NODE_ENV=production.
    password: first('TAXI_DB_PASSWORD', 'DB_PASSWORD', 'DB_PASS') ?? 'kartseek123',
    database: first('TAXI_DB_NAME', 'DB_NAME') ?? 'kartseek_db',
  };
}
