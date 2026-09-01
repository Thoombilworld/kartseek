import { defineConfig } from 'vitest/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Shared Vitest configuration for the NestJS backend workspaces.
 *
 * Vitest rather than Jest because Nest 12 ships ESM-only and Jest runs
 * CommonJS. The alternative — ts-jest in ESM mode — needs `module` changed in
 * tsconfig, which also changes what `nest build` emits for production. Vitest
 * compiles TypeScript itself, so the test runner's needs stop at the runner.
 *
 * One shared factory rather than a config per workspace because all eight
 * module backends had a byte-identical Jest `moduleNameMapper`. Copies would
 * drift, and a workspace resolving `@app/common` to a different file than its
 * neighbour is the kind of difference that shows up as an unrelated failure
 * much later.
 */

/**
 * The repository root, found by walking up for the directory that holds the
 * shared libraries, rather than by counting `../` segments. Vite bundles a
 * config and its relative imports into a single module before evaluating it,
 * so `import.meta.dirname` inside *this* file is not dependable — the caller
 * passes its own directory instead.
 */
function repoRootFrom(workspaceDir: string): string {
  let dir = workspaceDir;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'apps', 'api', 'libs'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `vitest-backend: no repository root above ${workspaceDir} ` +
          `(looked for a directory containing apps/api/libs)`,
      );
    }
    dir = parent;
  }
}

export interface BackendVitestOptions {
  /** The workspace's own directory — pass `import.meta.dirname`. */
  workspaceDir: string;
  /**
   * Specs to skip, as glob patterns relative to the workspace. Mirrors the
   * workspace's Jest `testPathIgnorePatterns`; in practice these are the
   * integration specs that need live infrastructure.
   */
  exclude?: string[];
  /**
   * Which specs to collect. Defaults to every `*.spec.ts` in the workspace,
   * which is the unit run. A companion config passes the integration globs
   * instead, so the specs `exclude` holds back are still reachable — excluded
   * from the default run is not the same as unrunnable, and a spec with no way
   * to run it rots.
   */
  include?: string[];
}

export function backendVitestConfig({
  workspaceDir,
  exclude = [],
  include = ['**/*.spec.ts'],
}: BackendVitestOptions) {
  const root = repoRootFrom(workspaceDir);
  const libs = (name: string) => path.resolve(root, 'apps/api/libs', name, 'src');

  return defineConfig({
    test: {
      globals: true,
      environment: 'node',
      /**
       * By default every `*.spec.ts` under the workspace, not just `src/**`.
       * Jest's `testRegex` ran against the whole workspace root, and at least
       * one unit spec lives in `test/` rather than `src/`
       * (marketplace's `test/seller.service.spec.ts`) — narrowing to `src`
       * would drop it silently and still report green.
       */
      include,
      exclude: ['**/node_modules/**', '**/dist/**', ...exclude],
      setupFiles: [path.resolve(root, 'apps/api/test/vitest-setup.ts')],
    },
    resolve: {
      /**
       * A transcription of the Jest `moduleNameMapper` these workspaces
       * shared. Any divergence between the two would mean a specifier
       * resolving to a different file under each runner, so they are kept
       * literal rather than tidied.
       */
      alias: [
        { find: /^@app\/common(|\/.*)$/, replacement: libs('common') + '$1' },
        { find: /^@app\/database(|\/.*)$/, replacement: libs('database') + '$1' },
        { find: /^@app\/redis(|\/.*)$/, replacement: libs('redis') + '$1' },
        { find: /^@app\/kafka(|\/.*)$/, replacement: libs('kafka') + '$1' },
        { find: /^@app\/grpc(|\/.*)$/, replacement: libs('grpc') + '$1' },
        { find: /^@app\/security(|\/.*)$/, replacement: libs('security') + '$1' },
        { find: /^uuid$/, replacement: path.resolve(root, 'apps/api/test/uuid-mock.ts') },
        {
          find: /^@app\/([^/]+)(|\/.*)$/,
          replacement: path.resolve(root, 'apps/api/libs') + '/$1/src$2',
        },
      ],
    },
  });
}
