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
 * `DB_PASSWORD` is a startup failure.
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
export function databaseCredentials(cfg: ConfigService) {
  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  const password = cfg.get<string>('DB_PASSWORD');
  if (!password) {
    throw new Error(
      'DB_PASSWORD is not set. Copy apps/api/.env.example to apps/api/.env (and ' +
        '.env.example to .env at the repository root for Compose) and set it. ' +
        'There is no built-in default password in any environment.',
    );
  }

  // `DB_SSL` wins if set at all; otherwise production is encrypted and local is not.
  const sslSetting = cfg.get<string>('DB_SSL');
  const useSsl = sslSetting !== undefined ? sslSetting === 'true' : isProduction;

  return {
    host: cfg.get<string>('DB_HOST', 'localhost'),
    port: cfg.get<number>('DB_PORT', 5432),
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
