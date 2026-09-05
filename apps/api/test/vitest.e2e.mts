import path from 'node:path';
import { backendVitestConfig } from './vitest-backend.mjs';

/**
 * The specs that need the platform running: a gateway with Redis, Postgres and
 * Kafka reachable. `npm test` excludes them (see ../vitest.config.mts); this
 * config is how they are run on purpose — `npm run test:e2e -w kartseek-api`
 * after `npm run infra:up`.
 */
export default backendVitestConfig({
  workspaceDir: path.resolve(import.meta.dirname, '..'),
  include: ['test/authorization.e2e-spec.ts', 'test/e2e-journey.spec.ts'],
});
