/**
 * Jest config for suites that need external infrastructure.
 *
 * These live in `test/` and are deliberately kept out of the default
 * `npm test` run, which must stay runnable with nothing else booted.
 *
 * Per-suite requirements:
 *   authorization.e2e-spec.ts      — boots the gateway AppModule in-process
 *   marketplace.integration.spec.ts — PostgreSQL answering on 5432
 *   e2e-journey.spec.ts            — the full stack answering on 3001
 *
 * Run with `npm run test:e2e`, which adds `--runInBand`: these share one
 * database and one API instance, so running them in parallel makes them flake.
 *
 * A JS config rather than the conventional `jest-e2e.json` so the above can be
 * written down — jest rejects unknown keys, so a `_comment` field in JSON warns
 * on every invocation.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  // Enumerated rather than matched by pattern: `authorization.e2e-spec.ts` uses
  // a hyphen where the unit-test `testRegex` expects a dot, and naming each file
  // keeps the split between this config and the unit run visible in one place.
  testMatch: [
    '<rootDir>/test/authorization.e2e-spec.ts',
    '<rootDir>/test/marketplace.integration.spec.ts',
    '<rootDir>/test/e2e-journey.spec.ts',
  ],
  testTimeout: 30000,
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@app/database(|/.*)$': '<rootDir>/libs/database/src/$1',
    '^@app/redis(|/.*)$': '<rootDir>/libs/redis/src/$1',
    '^@app/kafka(|/.*)$': '<rootDir>/libs/kafka/src/$1',
    '^@app/grpc(|/.*)$': '<rootDir>/libs/grpc/src/$1',
    '^@app/security(|/.*)$': '<rootDir>/libs/security/src/$1',
    '^uuid$': '<rootDir>/test/uuid-mock.ts',
    '^@app/([^/]+)(|/.*)$': '<rootDir>/libs/$1/src/$2',
  },
};
