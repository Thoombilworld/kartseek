import { describe, it, expect } from 'vitest';
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
