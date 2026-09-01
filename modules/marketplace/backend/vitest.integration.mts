import { backendVitestConfig } from '../../../apps/api/test/vitest-backend.mjs';

/**
 * The integration specs the default run holds back.
 *
 * They need live infrastructure — a PostgreSQL for the schema specs, a running
 * API gateway for the smoke test — so they are excluded from `npm test`. This
 * config is how they are actually run:
 *
 *   npm run test:integration
 *
 * Without it they would be excluded from every run and effectively dead.
 */
export default backendVitestConfig({
  workspaceDir: import.meta.dirname,
  include: ['**/*.integration.spec.ts'],
});
