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
 *
 * The password has no last resort: it throws. See `requirePassword` below.
 */
export function resolveTaxiDbConfig(read: EnvReader): ResolvedTaxiDb {
  const first = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = read(key);
      if (value !== undefined && value !== null && String(value) !== '') return String(value);
    }
    return undefined;
  };

  /**
   * The password, or a refusal naming both variables that would have supplied
   * it. Deliberately not a `first(...) ?? default` like the four values above:
   * a wrong host fails loudly on connect, whereas a wrong password used to
   * succeed against the development database and quietly write there.
   */
  const requirePassword = (moduleKey: string): string => {
    const value = first(moduleKey, 'DB_PASSWORD', 'DB_PASS');
    if (!value) {
      throw new Error(
        `${moduleKey} or DB_PASSWORD is not set. Copy .env.example to .env in this module ` +
          `(or apps/api/.env for the shared platform database) and set it. There is no ` +
          `built-in default password.`,
      );
    }
    return value;
  };

  return {
    host: first('TAXI_DB_HOST', 'DB_HOST') ?? 'localhost',
    port: Number(first('TAXI_DB_PORT', 'DB_PORT') ?? 5432),
    username: first('TAXI_DB_USER', 'DB_USER') ?? 'postgres',
    // No built-in default, matching databaseCredentials() in @app/database.
    // The literal that used to close this line was the real development
    // password in tracked source (AUD2-074), and it was reached by BOTH sides:
    // the migration CLI and the running service. A missing password is a
    // startup failure on both, in every environment.
    password: requirePassword('TAXI_DB_PASSWORD'),
    database: first('TAXI_DB_NAME', 'DB_NAME') ?? 'kartseek_db',
  };
}
