import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
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

    // Neither: refuse, naming every spelling that was tried — two, not three.
    expect(() => databaseCredentials(cfg({}), { envPrefix: 'MARKETPLACE_DB' })).toThrow(
      /MARKETPLACE_DB_PASSWORD or DB_PASSWORD/,
    );

    // `DB_PASS` is NOT one of them any more. It was an alias for the same
    // secret, and `scripts/registry/compose.mjs` blanks only `DB_PASSWORD` for
    // the ten `database: null` services — so the alias walked the superuser
    // password into every credential-free container (whole-branch review N2).
    // An environment carrying only the old spelling must fail, and the message
    // must name the variable to set rather than the one that was found.
    expect(() => databaseCredentials(cfg({ DB_PASS: 'superuser-secret' }))).toThrow(
      /^DB_PASSWORD is not set\./,
    );
    expect(() =>
      databaseCredentials(cfg({ DB_PASS: 'superuser-secret' }), {
        envPrefix: 'MARKETPLACE_DB',
      }),
    ).toThrow(/MARKETPLACE_DB_PASSWORD or DB_PASSWORD/);
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
    // Without a prefix the message names the one shared spelling and no module
    // variable — the gateway and the core services must not be told to set
    // MARKETPLACE_DB_PASSWORD.
    expect(() => databaseCredentials(cfg({}))).toThrow(/^DB_PASSWORD is not set\./);
    expect(() => databaseCredentials(cfg({}))).not.toThrow(/MARKETPLACE/);
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

/**
 * One secret, one name — checked across the tree, not only in this file.
 *
 * `DB_PASS` was an accepted alias in this helper, in the eight module
 * resolvers, in both migration CLIs and in `scripts/lib/db-password.js`. The
 * compose renderer blanks the credentials of the ten `database: null` services
 * so `env_file: apps/api/.env` cannot hand them the superuser password — and it
 * blanked `DB_PASSWORD`, because that is the name anybody thinks of. The alias
 * walked straight past it (whole-branch review N2).
 *
 * The blanking now covers the alias too, so reintroducing it would not leak.
 * It would still be a second place to forget, which is what this case exists to
 * stop: a *read* of `DB_PASS` anywhere in the platform's source fails here and
 * names the file.
 */
describe('DB_PASS is not a spelling any resolver reads', () => {
  const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
  const ROOTS = [
    path.join(ROOT, 'apps', 'api', 'libs'),
    path.join(ROOT, 'apps', 'api', 'apps'),
    path.join(ROOT, 'apps', 'api', 'scripts'),
    path.join(ROOT, 'modules'),
  ];
  /**
   * A READ of the variable — `process.env.DB_PASS`, `read('DB_PASS')`,
   * `first(…, 'DB_PASS')` — and not prose about it. Quoted with `'` or `"`
   * only: several files here explain in a comment why the alias is gone, and a
   * backtick is how a comment spells a variable name.
   */
  const READ = /(?:process\.env\.DB_PASS(?![A-Z_])|['"]DB_PASS['"])/;

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next')
        continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(ts|js|mjs|cjs)$/.test(entry.name) && !full.endsWith(path.basename(__filename)))
        out.push(full);
    }
    return out;
  }

  const files = ROOTS.filter((d) => fs.existsSync(d)).flatMap((d) => walk(d));

  it('found the tree it claims to be scanning', () => {
    // A scan over an empty file list passes silently.
    expect(files.length).toBeGreaterThan(500);
  });

  it('no source file reads DB_PASS', () => {
    const offenders = files
      .filter((f) => {
        // The specs that prove the alias is refused have to name it.
        if (/\.spec\.ts$/.test(f)) return false;
        return READ.test(fs.readFileSync(f, 'utf8'));
      })
      .map((f) => path.relative(ROOT, f));
    expect(offenders, 'rename these to DB_PASSWORD').toEqual([]);
  });
});
