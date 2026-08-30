import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/**
 * Jest for the grocery zone.
 *
 * These specs used to live in apps/web/src/__tests__ and ran under the shell's
 * jest config. They moved here with the code they cover, which means without a
 * runner in this package they would simply stop running — green by absence, the
 * worst way to lose a test.
 *
 * `moduleNameMapper` mirrors this package's tsconfig `paths`, most specific
 * first: the shared entries have to be matched before the catch-all `@/(.*)`,
 * or a `@/lib/localization` import resolves into this zone's src and fails.
 */
const config: Config = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/components/marketplace/product\-thumb$': '<rootDir>/../../../packages/shared-ui/src/marketplace-product-thumb',
    '^@/components/recommendations/(.*)$': '<rootDir>/../../../packages/shared-ui/src/recommendations/$1',
    '^@/components/kartseek\-loader$': '<rootDir>/../../../packages/shared-ui/src/kartseek-loader',
    '^@/components/recommendations$': '<rootDir>/../../../packages/shared-ui/src/recommendations',
    '^@/components/app\-shell$': '<rootDir>/../../../packages/shared-ui/src/app-shell',
    '^@/components/profile/(.*)$': '<rootDir>/../../../packages/shared-ui/src/profile/$1',
    '^@/components/shared/(.*)$': '<rootDir>/../../../packages/shared-ui/src/shared/$1',
    '^@/lib/error\-boundary$': '<rootDir>/../../../packages/shared-core/src/error-boundary',
    '^@/lib/localization/(.*)$': '<rootDir>/../../../packages/shared-core/src/localization/$1',
    '^@/lib/region\-headers$': '<rootDir>/../../../packages/shared-core/src/region-headers',
    '^@/components/shared$': '<rootDir>/../../../packages/shared-ui/src/shared',
    '^@/lib/api\-endpoints$': '<rootDir>/../../../packages/shared-core/src/api-endpoints',
    '^@/lib/marketplace/(.*)$': '<rootDir>/../../../packages/shared-core/src/marketplace/$1',
    '^@/lib/product\-image$': '<rootDir>/../../../packages/shared-core/src/product-image',
    '^@/lib/sanitize\-html$': '<rootDir>/../../../packages/shared-core/src/sanitize-html',
    '^@/components/seo/(.*)$': '<rootDir>/../../../packages/shared-ui/src/seo/$1',
    '^@/lib/locale\-utils$': '<rootDir>/../../../packages/shared-core/src/locale-utils',
    '^@/lib/localization$': '<rootDir>/../../../packages/shared-core/src/localization',
    '^@/lib/demo\-data/(.*)$': '<rootDir>/../../../packages/shared-core/src/demo-data/$1',
    '^@/lib/grocery\-api$': '<rootDir>/../../../packages/shared-core/src/grocery-api',
    '^@/lib/marketplace$': '<rootDir>/../../../packages/shared-core/src/marketplace',
    '^@/components/seo$': '<rootDir>/../../../packages/shared-ui/src/seo',
    '^@/lib/auth\-token$': '<rootDir>/../../../packages/shared-core/src/auth-token',
    '^@/lib/contexts/(.*)$': '<rootDir>/../../../packages/shared-core/src/contexts/$1',
    '^@/components/ui$': '<rootDir>/../../../packages/shared-ui/src/ui',
    '^@/lib/api\-fetch$': '<rootDir>/../../../packages/shared-core/src/api-fetch',
    '^@/lib/demo\-data$': '<rootDir>/../../../packages/shared-core/src/demo-data',
    '^@/lib/modules/(.*)$': '<rootDir>/../../../packages/shared-core/src/modules/$1',
    '^@/lib/config/(.*)$': '<rootDir>/../../../packages/shared-core/src/config/$1',
    '^@/lib/contexts$': '<rootDir>/../../../packages/shared-core/src/contexts',
    '^@/lib/socket/(.*)$': '<rootDir>/../../../packages/shared-core/src/socket/$1',
    '^@/lib/hooks/(.*)$': '<rootDir>/../../../packages/shared-core/src/hooks/$1',
    '^@/lib/modules$': '<rootDir>/../../../packages/shared-core/src/modules',
    '^@/lib/types/(.*)$': '<rootDir>/../../../packages/shared-core/src/types/$1',
    '^@/lib/utils/(.*)$': '<rootDir>/../../../packages/shared-core/src/utils/$1',
    '^@/lib/a11y/(.*)$': '<rootDir>/../../../packages/shared-core/src/a11y/$1',
    '^@/lib/config$': '<rootDir>/../../../packages/shared-core/src/config',
    '^@/lib/socket$': '<rootDir>/../../../packages/shared-core/src/socket',
    '^@/messages/(.*)$': '<rootDir>/../../../packages/shared-core/src/messages/$1',
    '^@/lib/api/(.*)$': '<rootDir>/../../../packages/shared-core/src/api/$1',
    '^@/lib/hooks$': '<rootDir>/../../../packages/shared-core/src/hooks',
    '^@/lib/seo/(.*)$': '<rootDir>/../../../packages/shared-core/src/seo/$1',
    '^@/lib/types$': '<rootDir>/../../../packages/shared-core/src/types',
    '^@/lib/utils$': '<rootDir>/../../../packages/shared-core/src/utils',
    '^@/lib/a11y$': '<rootDir>/../../../packages/shared-core/src/a11y',
    '^@/styles/(.*)$': '<rootDir>/../../../packages/shared-ui/src/styles/$1',
    '^@/hooks/(.*)$': '<rootDir>/../../../packages/shared-core/src/hooks/$1',
    '^@/lib/api$': '<rootDir>/../../../packages/shared-core/src/api',
    '^@/lib/seo$': '<rootDir>/../../../packages/shared-core/src/seo',
    '^@/i18n/(.*)$': '<rootDir>/../../../packages/shared-core/src/i18n/$1',
    '^@/i18n$': '<rootDir>/../../../packages/shared-core/src/i18n',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@/|next/))/'],
};

export default createJestConfig(config);
