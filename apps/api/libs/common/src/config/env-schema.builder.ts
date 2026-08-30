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

/** Common database + infra vars shared by every microservice */
const BASE_SCHEMA = {
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'staging').default('development'),
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
