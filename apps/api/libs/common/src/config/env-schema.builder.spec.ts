import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildEnvSchema, devOnlyStoreSwitch, STORE_EMULATOR_SWITCHES } from './env-schema.builder';

/**
 * A switch that swaps a real store for an in-process emulator must not be
 * settable in production.
 *
 * `SKIP_DB`, `SKIP_KAFKA` and `SKIP_REDIS` each replace a shared, durable store
 * with something private to one process. That is a development convenience and
 * a production catastrophe — sessions and carts that no other pod can read,
 * events nothing consumes, writes that vanish on restart — and nothing stopped
 * a deployment from carrying one in. The schema refuses it at boot, which is the
 * only moment the mistake is cheap.
 */
const validate = (env: Record<string, string>) => buildEnvSchema().validate(env);

describe('store-emulator switches', () => {
  it('names every switch that swaps a store for an emulator', () => {
    expect([...STORE_EMULATOR_SWITCHES].sort()).toEqual(['SKIP_DB', 'SKIP_KAFKA', 'SKIP_REDIS']);
  });

  for (const flag of ['SKIP_DB', 'SKIP_KAFKA', 'SKIP_REDIS']) {
    it(`refuses ${flag}=true when NODE_ENV=production`, () => {
      const { error } = validate({ NODE_ENV: 'production', [flag]: 'true' });
      expect(error).toBeDefined();
      expect(error!.message).toContain(flag);
      expect(error!.message).toMatch(/production/);
    });

    it(`allows ${flag}=true in development`, () => {
      expect(validate({ NODE_ENV: 'development', [flag]: 'true' }).error).toBeUndefined();
    });

    it(`allows ${flag}=false in production`, () => {
      expect(validate({ NODE_ENV: 'production', [flag]: 'false' }).error).toBeUndefined();
    });
  }

  it('defaults each switch to false when it is not set at all', () => {
    const { error, value } = validate({ NODE_ENV: 'production' });
    expect(error).toBeUndefined();
    expect(value.SKIP_DB).toBe('false');
    expect(value.SKIP_KAFKA).toBe('false');
    expect(value.SKIP_REDIS).toBe('false');
  });

  it('still rejects a value that is neither true nor false', () => {
    expect(validate({ NODE_ENV: 'development', SKIP_REDIS: 'yes' }).error).toBeDefined();
  });

  it('exports the rule so the gateway schema uses the same one', () => {
    const schema = devOnlyStoreSwitch('SKIP_REDIS');
    const object = (rest: Record<string, string>) =>
      buildEnvSchema({ SKIP_REDIS: schema }).validate(rest);
    expect(object({ NODE_ENV: 'production', SKIP_REDIS: 'true' }).error).toBeDefined();
    expect(object({ NODE_ENV: 'test', SKIP_REDIS: 'true' }).error).toBeUndefined();
  });
});

/**
 * One name for the broker list, everywhere.
 *
 * The shared base declared `KAFKA_BROKER` while every reader on the platform —
 * `kafka.module.ts`, `kafka-consumer.service.ts`, three `main.ts` bootstraps,
 * the gateway's readiness probe, both `.env` files and all 26 service blocks in
 * `infra/docker/compose.services.yml` — uses `KAFKA_BROKERS`. A schema that
 * declares and DEFAULTS an unused name is worse than one that omits it: the
 * default is handed out in environments where the real brokers are somewhere
 * else entirely, so the wrong name answers plausibly instead of failing.
 *
 * Checked against the source tree rather than asserted, because the thing that
 * must stay true is that there is one spelling — not that this file says so.
 */
describe('the Kafka broker list has one name', () => {
  const validate = (env: Record<string, string>) => buildEnvSchema().validate(env);

  it('declares the plural name the code reads', () => {
    expect(validate({}).value.KAFKA_BROKERS).toBe('localhost:9092');
  });

  it('no longer declares the singular one', () => {
    expect(validate({}).value.KAFKA_BROKER).toBeUndefined();
  });

  it('carries a configured value through', () => {
    expect(validate({ KAFKA_BROKERS: 'kafka:29092' }).value.KAFKA_BROKERS).toBe('kafka:29092');
  });

  it('is spelled the same way in every source file that reads it', () => {
    const apiRoot = path.join(__dirname, '..', '..', '..', '..');
    const offenders: string[] = [];

    /** Comments stripped: the rename is EXPLAINED in prose in two places, and a
     * check that forbade naming the old spelling would delete the only record
     * of why it went. What must not survive is code that reads the old name. */
    const code = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          walk(full);
          continue;
        }
        // Spec files are excluded: this one has to name the old spelling to
        // assert it is gone.
        if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) continue;
        // `KAFKA_BROKER` not followed by an S.
        if (/KAFKA_BROKER(?!S)/.test(code(fs.readFileSync(full, 'utf8')))) {
          offenders.push(path.relative(apiRoot, full).replace(/\\/g, '/'));
        }
      }
    };
    for (const root of ['apps', 'libs']) walk(path.join(apiRoot, root));
    expect(offenders).toEqual([]);
  });
});
