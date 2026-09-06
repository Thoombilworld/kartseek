import js from '@eslint/js';
import globals from 'globals';

/**
 * Root ESLint configuration.
 *
 * It covers only what no workspace owns: the registry, docs and smoke scripts
 * under scripts/ and tests/, and root-level config files. Every workspace has
 * its own eslint.config.* (the backends through apps/api/eslint.base.js, the
 * Next apps through apps/web/eslint.base.mjs), and ESLint 10 picks the
 * config nearest to each file, so this one never reaches them — the ignores
 * below make that explicit for `packages/`, `infra/` and `docs/` too, which
 * currently have no lint owner (see docs/guides/conventions.md, "Linting").
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      'apps/**',
      'modules/**',
      'packages/**',
      'infra/**',
      'docs/**',
      'tests/postman/collections/**',
    ],
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}', 'tests/**/*.{js,mjs,cjs}', '*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: js.configs.recommended.rules,
  },
];
