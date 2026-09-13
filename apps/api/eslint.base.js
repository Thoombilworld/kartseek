const tseslint = require('typescript-eslint');
const eslint = require('@eslint/js');
const globals = require('globals');

/**
 * ESLint configuration shared by every NestJS backend in this repository.
 *
 * apps/api and the eight module backends all call this with their own
 * directory and file globs, so a rule added here reaches all of them. That is
 * the point: until this existed the module backends had no ESLint at all, so
 * a rule configured in apps/api covered apps/api and nothing else.
 *
 * @param {string} rootDir   the workspace directory (pass __dirname)
 * @param {string[]} files   the TypeScript globs to lint, relative to rootDir
 */
module.exports = function backendEslintConfig(rootDir, files) {
  return tseslint.config(
    {
      ignores: ['eslint.config.js', 'eslint.base.js', 'dist', 'node_modules', '*.js', '*.mts'],
    },
    {
      files,
      /**
       * The two recommended presets are scoped to `files` rather than applied
       * globally.
       *
       * Applied globally they reached files no workspace lints — `scripts/`,
       * `migrations/`, `data-source.ts` — with only the halves of this config
       * that carry no `files` key. So a maintenance script got `no-undef` with
       * no Node globals declared (`console is not defined`, 171 times) and
       * `no-explicit-any` and `no-unused-vars` at full strength, while the
       * `rules` block below that turns those off never applied to it.
       *
       * Nobody saw it, because every workspace's `lint` script passes these
       * same globs on the command line. `lint-staged` does not: it runs
       * `eslint --fix` on whatever is staged, so the first commit that touched
       * a script failed the pre-commit hook on 171 errors it had not
       * introduced. Scoped here, `npm run lint` reports exactly what it did
       * before and the hook agrees with it.
       */
      extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          project: 'tsconfig.json',
          tsconfigRootDir: rootDir,
          sourceType: 'module',
        },
      },
      rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        /**
         * A type-only binding imported as a value must carry `type` — in the
         * files this rule can see.
         *
         * It cannot see the important ones. With `project` set, the parser
         * takes `emitDecoratorMetadata` from the workspace tsconfig, and this
         * rule then registers a `Decorator` visitor and reports nothing in any
         * file that contains one (eslint-plugin/dist/rules/consistent-type-imports.js),
         * because it cannot tell a class that `design:paramtypes` needs at
         * runtime from an interface that must be elided. Every controller,
         * service, entity and DTO here has a decorator, and those are exactly
         * the files where swc keeps a type-only import and the rspack build
         * fails to link it. Dropping `project` would make the rule fire there —
         * and mark classes in constructor parameters as `type`, breaking Nest
         * dependency injection.
         *
         * So this rule covers specs, utilities, types and other undecorated
         * files. The gate for decorated files is scripts/check-type-imports.js,
         * which every backend's `type-check` script runs.
         * `inline-type-imports` matches the style the existing markers use.
         */
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
      },
    },
    /**
     * The operational files a workspace's `lint` glob does not name.
     *
     * Scoping the presets above to `files` left these matching **no**
     * configuration at all — `npx eslint scripts/split-databases.ts` answered
     * "File ignored because no matching configuration was supplied", which is
     * not the same as clean. They went from unsatisfiable linting to none, and
     * `lint-staged` lints exactly these when someone edits one.
     *
     * So: the base preset, with the Node globals they actually run with (their
     * absence is where the 171 `console is not defined` errors came from), and
     * without the type-aware program. `project` is deliberately omitted —
     * `migrations/` is excluded from `tsconfig.json` in the module workspaces,
     * and a type-aware rule on a file outside the program is an error about the
     * config rather than about the code.
     *
     * The three rules turned off below are turned off for these files only.
     * `no-require-imports`: `scripts/lib/db-password.js` is CommonJS on purpose,
     * so it can be shared between the ts-node scripts and the plain-node ones.
     * `no-explicit-any` and `no-unused-vars`: off for `files` above too — a
     * one-off script should not be held to a stricter bar than a controller.
     */
    {
      files: ['scripts/**/*.{ts,js,mjs,cjs}', 'migrations/**/*.ts', 'data-source*.ts'],
      extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2024,
        globals: { ...globals.node },
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
      /**
       * These files print — a migration reports what it moved, a seed reports
       * what it wrote — and two migrations carry `// eslint-disable-next-line
       * no-console` written when the rule was expected to be on. It is not, so
       * ESLint calls those directives unused and `--fix`, which lint-staged
       * runs, would delete them. Deleting a marker of intent as a side effect of
       * staging an unrelated change is worse than leaving it unread.
       */
      linterOptions: { reportUnusedDisableDirectives: 'off' },
    },
  );
};
