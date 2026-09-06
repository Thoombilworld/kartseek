const path = require('node:path');
const nextJest = require('next/jest.js');
const ts = require('typescript');
const { pathsToModuleNameMapper } = require('ts-jest');

/**
 * Jest configuration shared by the web shell and the eight zones.
 *
 * Each workspace's jest.config.cjs is one statement calling
 * createNextJestConfig(__dirname). The module mapper is derived from that
 * workspace's own tsconfig `paths`, so the aliases Jest resolves are the
 * aliases TypeScript and Next resolve — grocery used to carry 55 hand-written
 * mapper lines mirroring its tsconfig, and every edit had to be made twice.
 *
 * Ordering matters: TypeScript picks the longest matching path pattern, Jest
 * picks the first mapper entry that matches. The mapper is therefore sorted
 * most-specific first (exact patterns, then wildcard patterns by descending
 * literal prefix), so `@/lib/api/x` reaches `@/lib/api/*` before the
 * catch-all `@/*` can send it into the workspace's own src.
 */
function readPaths(dir) {
  const file = path.join(dir, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(file, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  return (config.compilerOptions && config.compilerOptions.paths) || {};
}

function literalPrefixLength(pattern) {
  return pattern.replace(/^\^/, '').replace(/\(\.\*\)\$?$/, '').replace(/\$$/, '').length;
}

function orderMostSpecificFirst(mapper) {
  return Object.fromEntries(
    Object.entries(mapper).sort(([a], [b]) => {
      const aWild = a.includes('(.*)');
      const bWild = b.includes('(.*)');
      if (aWild !== bWild) return aWild ? 1 : -1;
      return literalPrefixLength(b) - literalPrefixLength(a);
    }),
  );
}

/**
 * @param {string} dir  the workspace directory (pass __dirname)
 */
function createNextJestConfig(dir) {
  const createJestConfig = nextJest({ dir });
  const mapper = pathsToModuleNameMapper(readPaths(dir), { prefix: '<rootDir>/' });
  return createJestConfig({
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
    moduleNameMapper: orderMostSpecificFirst(mapper),
    transform: {
      '^.+\\.tsx?$': ['ts-jest', { tsconfig: path.join(dir, 'tsconfig.json') }],
    },
    transformIgnorePatterns: ['/node_modules/(?!(@/|next/))/'],
  });
}

module.exports = { createNextJestConfig };
