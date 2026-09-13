import type { ConfigService } from '@nestjs/config';

/**
 * Connection credentials **and connection policy** for a service's TypeORM setup.
 *
 * ── The credential (AUD2-074) ───────────────────────────────────────────────
 *
 * Every service spelled these out itself, and every one of them carried the
 * real development database password as a literal default, in eighteen tracked
 * source files. `.env` is correctly git-ignored, so that default was the only
 * copy of the credential in the repository, and it defeated the ignore.
 *
 * Worse than the disclosure: it was a *silent* fallback. A deploy that forgot
 * `DB_PASSWORD` did not fail — it connected with a password an attacker could
 * read off the repo, and only if the database happened to use a different one
 * did anybody find out. The narrower version of that guard (throw in
 * production, warn elsewhere) still shipped the literal, and still let a
 * misconfigured staging box reach a database it was never meant to.
 *
 * So there is no built-in password any more, in any environment. A missing
 * password is a startup failure.
 *
 * ── The module prefix ───────────────────────────────────────────────────────
 *
 * `envPrefix` exists because the eight module services do not use `DB_PASSWORD`.
 * Each resolves `<MODULE>_DB_*` first through its own `db-config.ts`, and their
 * `.env.example` files declare only `<MODULE>_DB_PASSWORD`. When the factories
 * began spreading this helper (AUD2-023, so that marketplace stopped running
 * plaintext under `DB_SSL=true`), they inherited a refusal on a variable they
 * never read: a module lifted out of this repository — a container of its own,
 * which is the stated direction — would not boot, and the message would name
 * the wrong variable. In-repo it was masked only because the module
 * `ConfigModule` falls back to `apps/api/.env`.
 *
 * With a prefix, the order is the same one the module resolvers use —
 * `<PREFIX>_PASSWORD`, then `DB_PASSWORD` — and the refusal names both.
 *
 * ── The pool (AUD2-033) ─────────────────────────────────────────────────────
 *
 * The pool and the retry/timeout policy live here too, so a service that
 * spreads this cannot silently take node-postgres's defaults. See `extra`
 * below for why the default is the dangerous part.
 *
 * ── SSL ─────────────────────────────────────────────────────────────────────
 *
 * Off by default because the local stack is a container on loopback, and on by
 * default in production, where the database is reached over a network the
 * process does not control. `DB_SSL` overrides either way.
 */
export interface DatabaseCredentialsOptions {
  /**
   * A module's variable prefix, e.g. `MARKETPLACE_DB`. `<PREFIX>_PASSWORD` is
   * then tried before `DB_PASSWORD`, and the refusal names both. Omitted, only
   * `DB_PASSWORD` is read — which is what the gateway and the core services do.
   */
  envPrefix?: string;
}

export function databaseCredentials(cfg: ConfigService, options: DatabaseCredentialsOptions = {}) {
  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // An empty string is a missing value: `DB_PASSWORD=` in a .env must not read
  // as "connect with no password".
  const read = (key: string): string | undefined => {
    const value = cfg.get<string>(key);
    return value === undefined || value === null || String(value) === ''
      ? undefined
      : String(value);
  };

  // `DB_PASS` is read as well as `DB_PASSWORD`, because the eight module
  // resolvers (`modules/<m>/backend/src/db-config.ts`) accept both and this
  // helper is the other half of the same decision. It did not, so a workspace
  // whose `.env` used the short name resolved a password through the CLI runner
  // and none through the service factory — which fails at boot with "set
  // DB_PASSWORD", naming a variable the developer believed they had already set
  // (IN4 minor). `DB_PASSWORD` still wins where both are present.
  const prefixedKey = options.envPrefix ? `${options.envPrefix}_PASSWORD` : undefined;
  const password =
    (prefixedKey ? read(prefixedKey) : undefined) ?? read('DB_PASSWORD') ?? read('DB_PASS');
  if (!password) {
    const named = prefixedKey ? `${prefixedKey} or DB_PASSWORD` : 'DB_PASSWORD';
    throw new Error(
      `${named} is not set. Copy .env.example to .env in this workspace (or ` +
        'apps/api/.env for the shared platform database) and set it. There is no ' +
        'built-in default password in any environment.',
    );
  }

  // `DB_SSL` wins if set at all; otherwise production is encrypted and local is not.
  const sslSetting = cfg.get<string>('DB_SSL');
  const useSsl = sslSetting !== undefined ? sslSetting === 'true' : isProduction;

  return {
    host: cfg.get<string>('DB_HOST', 'localhost'),
    // `Number()` for the same reason the pool numbers below carry it: a service
    // whose schema does not declare DB_PORT gets the raw string from the
    // environment, and the five new numbers were coerced while this one was not.
    port: Number(cfg.get<number>('DB_PORT', 5432)),
    username: cfg.get<string>('DB_USER', 'postgres'),
    password,
    database: cfg.get<string>('DB_NAME', 'kartseek_db'),
    /**
     * The pool lives here, not in each service.
     *
     * node-postgres opens up to 10 connections per process when no size is
     * given. 25 services against a Postgres with `max_connections=100` reserve
     * 250 — two and a half times what the database will grant — and the
     * services that start last simply cannot acquire a connection. Nothing
     * fails in development, where only a handful of services are up. Only
     * grocery-service capped it; every other DB app took the default
     * (AUD2-033), and `DatabaseModule.registerPostgres()` carried a third,
     * different policy of its own.
     *
     * Raising this is a decision about the *database*, not about any one
     * service, so it reads from the environment rather than being fixed here:
     * `DB_POOL_SIZE` is how a deploy gives the gateway a bigger pool than the
     * eighteen services behind it.
     */
    extra: {
      max: Number(cfg.get<number>('DB_POOL_SIZE', 5)),
      // Do not let a stalled checkout wait forever for a connection; failing
      // fast surfaces exhaustion as an error instead of a hung request.
      connectionTimeoutMillis: Number(cfg.get<number>('DB_POOL_TIMEOUT_MS', 10_000)),
      idleTimeoutMillis: 30_000,
    },
    connectTimeoutMS: Number(cfg.get<number>('DB_CONNECT_TIMEOUT_MS', 5_000)),
    /**
     * Retries are generous in production, where the database may still be
     * coming up behind the service, and short in development, where a
     * developer wants the app to boot and say so rather than hang.
     */
    retryAttempts: Number(cfg.get<number>('DB_RETRY_ATTEMPTS', isProduction ? 10 : 3)),
    retryDelay: Number(cfg.get<number>('DB_RETRY_DELAY_MS', isProduction ? 3_000 : 1_500)),
    // `rejectUnauthorized` follows `DB_SSL_REJECT_UNAUTHORIZED` so a managed
    // Postgres presenting its own CA can be trusted explicitly rather than by
    // turning verification off platform-wide.
    ...(useSsl
      ? {
          ssl: {
            rejectUnauthorized: cfg.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true',
          },
        }
      : {}),
  };
}
