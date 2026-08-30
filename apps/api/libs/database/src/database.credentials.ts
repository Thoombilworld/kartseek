import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

const logger = new Logger('DatabaseCredentials');

/** The development password, kept in one place instead of eighteen. */
const DEV_FALLBACK_PASSWORD = 'kartseek123';

/**
 * Connection credentials for a service's TypeORM setup.
 *
 * Every service spelled these out itself, and every one of them carried
 * `cfg.get('DB_PASSWORD', 'kartseek123')` — the real database password, as a
 * literal, in eighteen tracked source files. `.env` is correctly git-ignored, so
 * that default was the only copy of the credential in the repository, and it
 * defeated the ignore.
 *
 * Worse than the disclosure: it was a *silent* fallback. A production deploy
 * that forgot `DB_PASSWORD` did not fail — it connected with a password an
 * attacker could read off the repo, and only if the database happened to use a
 * different one did anybody find out.
 *
 * So the default now applies outside production only, and production throws.
 *
 * SSL is off by default because the local stack is a container on loopback, and
 * on by default in production, where the database is reached over a network the
 * process does not control. `DB_SSL` overrides either way.
 */
export function databaseCredentials(cfg: ConfigService) {
  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  const password = cfg.get<string>('DB_PASSWORD');
  if (!password && isProduction) {
    throw new Error(
      'DB_PASSWORD is not set. Refusing to start in production with a built-in ' +
        'default password — set DB_PASSWORD in the environment.',
    );
  }
  if (!password) {
    logger.warn(
      `DB_PASSWORD is not set; using the development default. This is refused when NODE_ENV=production.`,
    );
  }

  // `DB_SSL` wins if set at all; otherwise production is encrypted and local is not.
  const sslSetting = cfg.get<string>('DB_SSL');
  const useSsl = sslSetting !== undefined ? sslSetting === 'true' : isProduction;

  return {
    host: cfg.get<string>('DB_HOST', 'localhost'),
    port: cfg.get<number>('DB_PORT', 5432),
    username: cfg.get<string>('DB_USER', 'postgres'),
    password: password ?? DEV_FALLBACK_PASSWORD,
    database: cfg.get<string>('DB_NAME', 'kartseek_db'),
    // `rejectUnauthorized` follows `DB_SSL_REJECT_UNAUTHORIZED` so a managed
    // Postgres presenting its own CA can be trusted explicitly rather than by
    // turning verification off platform-wide.
    ...(useSsl
      ? {
          ssl: {
            rejectUnauthorized:
              cfg.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true',
          },
        }
      : {}),
  };
}
