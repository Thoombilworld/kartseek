/**
 * ESLint configuration for the restaurant backend.
 *
 * Delegates to the platform config in apps/api rather than copying it, for the
 * same reason rspack.config.js does: a rule added there must reach this
 * service without anyone remembering to copy it here.
 */
/**
 * `data-source.ts` and `migrations/` are linted without the type-aware program.
 *
 * They cannot join the glob below: the type-aware rules need the file to be
 * inside `tsconfig.json`'s `include`, that `include` covers `src` only, and
 * TypeScript infers `rootDir` from it — widening it would move the build output
 * from `dist/main.js` to `dist/src/main.js` and break every `node dist/main.js`
 * in the repo. They used to be `ignores`d instead, which meant no linting at
 * all; `eslint.base.js` now carries a second block for exactly these paths,
 * with the Node globals and without `project`, so they are covered by the base
 * preset. A `tsconfig.migrations.json` and full type-aware linting is still the
 * better answer, and still unbuilt.
 */
module.exports = require('../../../apps/api/eslint.base.js')(__dirname, ['src/**/*.ts']);
