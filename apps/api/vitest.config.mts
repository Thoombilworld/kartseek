import { backendVitestConfig } from './test/vitest-backend.mjs';

export default backendVitestConfig({
  workspaceDir: import.meta.dirname,
  // Both need live infrastructure; excluded under Jest for the same reason.
  exclude: [
    'test/e2e-journey.spec.ts',
  ],
});
