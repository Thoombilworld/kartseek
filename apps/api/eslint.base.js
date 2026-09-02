const tseslint = require('typescript-eslint');
const eslint = require('@eslint/js');

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
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      ignores: ['.eslintrc.js', 'eslint.config.js', 'eslint.base.js', 'dist', 'node_modules', '*.js', '*.mts'],
    },
    {
      files,
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
  );
};
