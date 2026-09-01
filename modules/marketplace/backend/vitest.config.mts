import { backendVitestConfig } from '../../../apps/api/test/vitest-backend.mjs';

export default backendVitestConfig({
  workspaceDir: import.meta.dirname,
  // Both need a live PostgreSQL and flake under parallel load; excluded under
  // Jest for the same reason. Run them deliberately against a running database.
  exclude: [
    'src/__tests__/schema.integration.spec.ts',
    'test/marketplace.integration.spec.ts',
    // Real HTTP requests to a gateway on :3001.
    'test/marketplace-smoke.integration.spec.ts',
  ],
});
