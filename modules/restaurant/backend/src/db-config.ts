/**
 * Where the restaurant module's database is — resolved in exactly one place.
 *
 * `data-source.ts` (the TypeORM CLI's runner) and `restaurant-service.module.ts` (the
 * running service) both call `resolveRestaurantDbConfig`. They used to resolve the
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
export const RESTAURANT_DB_SCHEMA = 'restaurant';

/**
 * The migration ledger, in `public` and named per module.
 *
 * NOT `restaurant.migrations`. TypeORM builds the ledger table inside the DataSource's
 * `schema` and does it *before* the first migration's `up()` runs, so on a fresh
 * dedicated database — where the `restaurant` schema does not exist yet — `migration:run`
 * died on `CREATE TABLE "restaurant"."migrations"` before anything could create it. The
 * DataSource therefore declares no `schema` (each entity names its own instead)
 * and the ledger lands in `public`, where a per-module name keeps the eight
 * apart if they ever share one database — `public.migrations` there is the
 * platform's own ledger.
 *
 * ── The search_path assumption, stated ──────────────────────────────────────
 *
 * The name below is UNQUALIFIED, and it has to be: TypeORM treats
 * `migrationsTableName` as an identifier, not as a path, so `'public.x'` would
 * create a table literally named `public.x` inside whatever schema the
 * connection defaults to — the same bug with a stranger name.
 *
 * So "the ledger lands in `public`" is an assumption about the CONNECTION, not
 * a fact about this string: with no `schema` on the DataSource, TypeORM writes
 * to the first entry of the role's `search_path`, which is Postgres's default
 * `"$user", public` and resolves to `public` because no schema named after the
 * role exists. An `ALTER ROLE <m>_user SET search_path = <m>` would silently
 * move the ledger back into the module schema and reintroduce the failure this
 * comment describes — so if that is ever done, `migrationsTableName` is not the
 * knob to reach for (IN3 review N3).
 */
export const RESTAURANT_MIGRATIONS_TABLE = 'restaurant_migrations';

/** Everything needed to reach the restaurant database, with nothing left implicit. */
export interface ResolvedRestaurantDb {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * `RESTAURANT_DB_*` wins, the shared `DB_*` answers next, and the last resorts are the
 * shared platform database — the same order and the same values on both sides.
 *
 * The password has no last resort: it throws. See `requirePassword` below.
 */
export function resolveRestaurantDbConfig(read: EnvReader): ResolvedRestaurantDb {
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
   *
   * Two spellings, not three. `DB_PASS` was a third name for the same secret,
   * and `scripts/registry/compose.mjs` blanked only `DB_PASSWORD` when it
   * stripped the credentials of the ten `database: null` containers — so the
   * alias carried the superuser password past the fix (whole-branch review N2).
   * It is no longer read anywhere; rename it to `DB_PASSWORD`.
   */
  const requirePassword = (moduleKey: string): string => {
    const value = first(moduleKey, 'DB_PASSWORD');
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
    host: first('RESTAURANT_DB_HOST', 'DB_HOST') ?? 'localhost',
    port: Number(first('RESTAURANT_DB_PORT', 'DB_PORT') ?? 5432),
    username: first('RESTAURANT_DB_USER', 'DB_USER') ?? 'postgres',
    // No built-in default, matching databaseCredentials() in @app/database.
    // The literal that used to close this line was the real development
    // password in tracked source (AUD2-074), and it was reached by BOTH sides:
    // the migration CLI and the running service. A missing password is a
    // startup failure on both, in every environment.
    password: requirePassword('RESTAURANT_DB_PASSWORD'),
    database: first('RESTAURANT_DB_NAME', 'DB_NAME') ?? 'kartseek_db',
  };
}
