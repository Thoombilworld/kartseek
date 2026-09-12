/**
 * KARTSEEK — Shared Env Validation Schema Builder
 *
 * Provides a base Joi schema for common env vars (DB, Redis, Kafka)
 * plus a factory to extend it with module-specific vars.
 *
 * Usage in each module:
 *   import { buildEnvSchema } from '@app/common';
 *   const schema = buildEnvSchema({ MARKETPLACE_TCP_PORT: Joi.number().default(4002) });
 */
import * as Joi from 'joi';

/**
 * Every environment switch that swaps a real, shared store for an in-process
 * emulator.
 *
 * `SKIP_DB` drops the DataSource, `SKIP_KAFKA` makes the producer a no-op and
 * `SKIP_REDIS` hands each process its own private sessions, carts, refresh
 * slots, rate-limit buckets and OTPs. Each is a development convenience and a
 * production catastrophe: nothing is shared between pods, nothing survives a
 * restart, and the platform looks like it is working. Grepped from the code
 * rather than remembered — these three are the only `process.env.SKIP_*` reads
 * in `apps/` and `modules/` that select an emulator (`SKIP_CSRF_KEY` is a
 * metadata key, not an env var, and the remaining `SKIP_*` names live in
 * one-off scripts).
 */
export const STORE_EMULATOR_SWITCHES = ['SKIP_DB', 'SKIP_KAFKA', 'SKIP_REDIS'] as const;

/**
 * A `'true' | 'false'` switch that production refuses to accept as `'true'`.
 *
 * Boot is the only moment this mistake is cheap. Left to runtime, `SKIP_REDIS`
 * in production means every pod serving private state while health reports
 * something better than a failure — which is exactly the fault this validation
 * exists to make impossible to deploy.
 */
export function devOnlyStoreSwitch(name: string): Joi.Schema {
  return Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .valid('false')
      .default('false')
      .messages({
        'any.only': `${name} swaps a real store for an in-process emulator and must be false when NODE_ENV=production`,
      }),
    otherwise: Joi.string().valid('true', 'false').default('false'),
  });
}

/** Common database + infra vars shared by every microservice */
const BASE_SCHEMA = {
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('postgres'),
  // No default. A default here is returned by ConfigService even when the
  // variable is unset, which would make the production guard in
  // `databaseCredentials()` unreachable — it would never see a missing password.
  DB_PASSWORD: Joi.string().allow('').optional(),
  DB_NAME: Joi.string().default('kartseek_db'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  KAFKA_BROKER: Joi.string().default('localhost:9092'),
  // Refused as `true` in production — see STORE_EMULATOR_SWITCHES. Declared in
  // the BASE so every service that calls `buildEnvSchema()` gets the guard,
  // not just the ones that happened to list the flag.
  ...Object.fromEntries(STORE_EMULATOR_SWITCHES.map((f) => [f, devOnlyStoreSwitch(f)])),
};

/**
 * Build a Joi validation schema for a microservice module.
 * @param moduleVars — Module-specific env var definitions
 */
export function buildEnvSchema(moduleVars: Record<string, Joi.Schema> = {}): Joi.ObjectSchema {
  return Joi.object({
    ...BASE_SCHEMA,
    ...moduleVars,
  });
}

export { Joi };
