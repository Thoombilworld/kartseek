import { backendVitestConfig } from '../../../apps/api/test/vitest-backend.mjs';

export default backendVitestConfig({
  workspaceDir: import.meta.dirname,
  // Needs a live PostgreSQL; excluded under Jest for the same reason.
  exclude: ['src/__tests__/controller.integration.spec.ts'],
});
