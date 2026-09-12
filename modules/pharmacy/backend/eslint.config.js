/**
 * ESLint configuration for the pharmacy backend.
 *
 * Delegates to the platform config in apps/api rather than copying it, for the
 * same reason rspack.config.js does: a rule added there must reach this
 * service without anyone remembering to copy it here.
 */
/**
 * `data-source.ts` and `migrations/` are IGNORED here, not linted.
 *
 * They cannot simply be added to the glob: the type-aware rules need the file
 * to be inside `tsconfig.json`'s `include`, that `include` covers `src` only, and
 * TypeScript infers `rootDir` from it — widening it to the package root would
 * move the build output from `dist/main.js` to `dist/src/main.js` and break
 * every `node dist/main.js` in the repo. Without the ignore they fall through
 * to the root config, which has no `tsconfigRootDir`, and every commit that
 * touches one fails the pre-commit hook with a parsing error.
 *
 * The same is already true of `apps/api/migrations/` and
 * `apps/api/data-source.main.ts`, which no config globs either. Giving
 * migrations a real `tsconfig.migrations.json` and linting them properly is a
 * job for the INFRA plan that generalises these runners; this comment is here
 * so the gap is a decision rather than an accident.
 */
module.exports = [
  ...require('../../../apps/api/eslint.base.js')(__dirname, ['src/**/*.ts']),
  { ignores: ['data-source.ts', 'migrations/**'] },
];
