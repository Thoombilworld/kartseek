// Flat config for ESLint 10. Ports the rules from the legacy .eslintrc.json,
// which ESLint no longer reads (eslintrc support was dropped in v10).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'next-env.d.ts',
      'public/**',
      // One-off maintenance scripts, not part of the app build
      'check_links.js',
      'fix_broken_links.js',
      'refactor_taxi.js',
      // Build config. The parser eslint-config-next applies to .mjs produces a
      // scope manager the bundled ESLint 10 rejects ("scopeManager.addGlobals
      // is not a function"), which aborts the whole run. Not app source, so
      // skip them rather than pin a new parser across the monorepo.
      'next.config.mjs',
      'postcss.config.mjs',
      'eslint.config.mjs',
    ],
  },
  ...nextCoreWebVitals,
  {
    // The hoisted eslint-plugin-react still calls the removed
    // context.getFilename() during React version auto-detection, which throws
    // on ESLint 10. Declaring the version skips that code path entirely.
    settings: { react: { version: '19.2' } },
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
];
