import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/**
 * Mirrors apps/web's config so a test written in one place behaves the same in
 * the other. `testEnvironment: 'node'` because these cover routing, path
 * building and data-shaping helpers rather than rendered DOM — jsdom can come
 * later, per-file, via a `@jest-environment` docblock.
 */
const config: Config = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@/|next/))/'],
};

export default createJestConfig(config);
