import { describe, it, expect } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { databaseCredentials } from './database.credentials';

/**
 * A `ConfigService` stand-in with the two-argument `get` the helper uses, so
 * an absent variable really is absent rather than an empty string.
 */
const cfg = (env: Record<string, string>): ConfigService =>
  ({
    get: (k: string, d?: unknown) => (k in env ? env[k] : d),
  }) as unknown as ConfigService;

describe('databaseCredentials', () => {
  it("carries a bounded pool so a service cannot take pg's default 10", () => {
    const c = databaseCredentials(cfg({ DB_PASSWORD: 'x' }));
    expect(c.extra.max).toBe(5);
    expect(c.extra.connectionTimeoutMillis).toBe(10_000);
    expect(c.extra.idleTimeoutMillis).toBe(30_000);
  });

  it('lets a deploy size the pool from the environment, as a number', () => {
    // The environment hands over strings. `max: '20'` is not a pool of 20 to
    // node-postgres — it is compared numerically and silently misbehaves — so
    // the coercion is the point of the assertion, not the value.
    const c = databaseCredentials(cfg({ DB_PASSWORD: 'x', DB_POOL_SIZE: '20' }));
    expect(c.extra.max).toBe(20);
    expect(typeof c.extra.max).toBe('number');
  });

  it('takes a module prefix first, and refuses only when neither is set', () => {
    // The eight module services do not use DB_PASSWORD: each resolves
    // <MODULE>_DB_* through its own db-config.ts, and their .env.example files
    // declare only <MODULE>_DB_PASSWORD. Spreading this helper without a prefix
    // made them refuse to boot on a variable they never read — invisible in
    // this repository, where the module ConfigModule falls back to
    // apps/api/.env, and fatal for a module lifted out of it.
    const prefixed = databaseCredentials(cfg({ MARKETPLACE_DB_PASSWORD: 'module-secret' }), {
      envPrefix: 'MARKETPLACE_DB',
    });
    expect(prefixed.password).toBe('module-secret');

    // The prefix wins over the shared variable — the same order the module
    // resolvers use, so the two cannot disagree about which database is reached.
    expect(
      databaseCredentials(
        cfg({ MARKETPLACE_DB_PASSWORD: 'module-secret', DB_PASSWORD: 'shared' }),
        {
          envPrefix: 'MARKETPLACE_DB',
        },
      ).password,
    ).toBe('module-secret');

    // The shared one still answers when the module has none of its own.
    expect(
      databaseCredentials(cfg({ DB_PASSWORD: 'shared' }), { envPrefix: 'MARKETPLACE_DB' }).password,
    ).toBe('shared');

    // Neither: refuse, naming both.
    expect(() => databaseCredentials(cfg({}), { envPrefix: 'MARKETPLACE_DB' })).toThrow(
      /MARKETPLACE_DB_PASSWORD or DB_PASSWORD/,
    );
    // An empty prefixed value falls through rather than counting as set.
    expect(
      databaseCredentials(cfg({ MARKETPLACE_DB_PASSWORD: '', DB_PASSWORD: 'shared' }), {
        envPrefix: 'MARKETPLACE_DB',
      }).password,
    ).toBe('shared');
  });

  it('refuses to start without DB_PASSWORD instead of using a literal', () => {
    expect(() => databaseCredentials(cfg({}))).toThrow(/DB_PASSWORD/);
    // Refused in development too, not only in production — the literal it
    // replaced was the real development password (AUD2-074).
    expect(() => databaseCredentials(cfg({ NODE_ENV: 'development' }))).toThrow(/DB_PASSWORD/);
    expect(() => databaseCredentials(cfg({ NODE_ENV: 'production' }))).toThrow(/DB_PASSWORD/);
    // An empty value is a missing value; `DB_PASSWORD=` in a .env must not
    // read as "connect with no password".
    expect(() => databaseCredentials(cfg({ DB_PASSWORD: '' }))).toThrow(/DB_PASSWORD/);
    // Without a prefix the message names DB_PASSWORD and nothing else — the
    // gateway and the core services must not be told about a module variable.
    expect(() => databaseCredentials(cfg({}))).toThrow(/^DB_PASSWORD is not set\./);
  });

  it('encrypts in production and leaves local plaintext', () => {
    expect(
      (databaseCredentials(cfg({ DB_PASSWORD: 'x', NODE_ENV: 'production' })) as { ssl?: unknown })
        .ssl,
    ).toBeTruthy();
    expect(
      (databaseCredentials(cfg({ DB_PASSWORD: 'x' })) as { ssl?: unknown }).ssl,
    ).toBeUndefined();
    // DB_SSL wins either way round.
    expect(
      (databaseCredentials(cfg({ DB_PASSWORD: 'x', DB_SSL: 'true' })) as { ssl?: unknown }).ssl,
    ).toBeTruthy();
    expect(
      (
        databaseCredentials(cfg({ DB_PASSWORD: 'x', NODE_ENV: 'production', DB_SSL: 'false' })) as {
          ssl?: unknown;
        }
      ).ssl,
    ).toBeUndefined();
  });

  it('retries longer in production than in development', () => {
    // Production waits for a database that may still be coming up behind it;
    // development boots and says so. Both are numbers for the same reason the
    // pool size is.
    const dev = databaseCredentials(cfg({ DB_PASSWORD: 'x' }));
    const prod = databaseCredentials(cfg({ DB_PASSWORD: 'x', NODE_ENV: 'production' }));
    expect(dev.retryAttempts).toBe(3);
    expect(dev.retryDelay).toBe(1_500);
    expect(prod.retryAttempts).toBe(10);
    expect(prod.retryDelay).toBe(3_000);
    expect(dev.connectTimeoutMS).toBe(5_000);

    const tuned = databaseCredentials(
      cfg({ DB_PASSWORD: 'x', DB_RETRY_ATTEMPTS: '7', DB_CONNECT_TIMEOUT_MS: '250' }),
    );
    expect(tuned.retryAttempts).toBe(7);
    expect(tuned.connectTimeoutMS).toBe(250);
  });

  it('resolves the connection target from the shared DB_* variables', () => {
    const c = databaseCredentials(
      cfg({
        DB_PASSWORD: 'secret',
        DB_HOST: 'db.internal',
        DB_PORT: '6543',
        DB_USER: 'gateway_user',
        DB_NAME: 'kartseek_main',
      }),
    );
    expect(c).toMatchObject({
      host: 'db.internal',
      // A number, not the '6543' the environment hands over — node-postgres
      // does not coerce it and a string port fails to connect on some drivers.
      port: 6543,
      username: 'gateway_user',
      password: 'secret',
      database: 'kartseek_main',
    });
    expect(typeof c.port).toBe('number');
  });
});
