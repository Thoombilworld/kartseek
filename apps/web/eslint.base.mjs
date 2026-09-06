import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

/**
 * ESLint configuration shared by the web shell and the eight zones.
 *
 * `apps/web/eslint.config.mjs` and every `modules/<vertical>/frontend/eslint.config.mjs`
 * are one-line imports of this file, the same arrangement the Nest backends
 * have with `apps/api/eslint.base.js`: a rule changed here reaches all nine
 * applications, and a zone cannot quietly drift to its own rule set.
 *
 * Rule policy (docs/guides/conventions.md, "Linting"):
 *   - `react-hooks/rules-of-hooks` stays an error.
 *   - Every other `react-hooks/*` rule the Next preset enables is downgraded
 *     to a warning. eslint-plugin-react-hooks 7 ships the React Compiler's
 *     analyses as lint rules and turns them on as errors; the compiler is
 *     off in this repository, so they are advice, not build breaks. The
 *     warning count per workspace is tracked in docs/guides/testing.md.
 *   - Errors must be zero; `lint` scripts set no --max-warnings.
 */
const advisoryHookRules = {};
for (const entry of nextCoreWebVitals) {
  for (const [name, setting] of Object.entries(entry.rules ?? {})) {
    if (name.startsWith('react-hooks/') && name !== 'react-hooks/rules-of-hooks') {
      const options = Array.isArray(setting) ? setting.slice(1) : [];
      advisoryHookRules[name] = ['warn', ...options];
    }
  }
}

// The preset registers its plugins for one file set (`**/*.{js,jsx,mjs,ts,tsx,mts,cts}`
// today). The override below must apply to exactly that set: a rule such as
// `react-hooks/exhaustive-deps` on a file the plugin entry does not cover
// (a `.cjs`, for instance) is a fatal "could not find plugin" for the run.
const pluginEntry = nextCoreWebVitals.find((entry) => entry.plugins && entry.plugins['react-hooks']);
if (!pluginEntry || !pluginEntry.files) {
  throw new Error('eslint-config-next/core-web-vitals changed shape: no entry registers react-hooks with a files list');
}

/**
 * @param {{ extraIgnores?: string[] }} [options]
 */
export function nextAppConfig({ extraIgnores = [] } = {}) {
  return [
    {
      ignores: [
        '.next/**',
        'out/**',
        'build/**',
        'coverage/**',
        'node_modules/**',
        'next-env.d.ts',
        'public/**',
        // Build and tooling config, not application source. The parser
        // eslint-config-next applies to .mjs produces a scope manager older
        // typescript-eslint releases rejected; keeping these out costs nothing.
        'next.config.mjs',
        'postcss.config.mjs',
        'eslint.config.mjs',
        'eslint.base.mjs',
        'jest.config.cjs',
        'jest.base.cjs',
        ...extraIgnores,
      ],
    },
    ...nextCoreWebVitals,
    {
      files: pluginEntry.files,
      // The hoisted eslint-plugin-react still calls the removed
      // context.getFilename() during React version auto-detection, which throws
      // on ESLint 10. Declaring the version skips that code path entirely.
      settings: { react: { version: '19.2' } },
      rules: {
        'react/no-unescaped-entities': 'off',
        '@next/next/no-img-element': 'off',
        ...advisoryHookRules,
      },
    },
    {
      // eslint-config-next parses .js/.jsx/.mjs with its own Babel-based parser,
      // whose scope manager lacks the addGlobals() that ESLint 10 calls while
      // finalising a file, so the first JavaScript file aborts the whole run
      // ("scopeManager.addGlobals is not a function"; still true in 16.3.3).
      // The typescript-eslint parser reads plain JavaScript too; use it for
      // every JavaScript file, and parse .cjs as CommonJS.
      files: ['**/*.{js,jsx,mjs}'],
      languageOptions: { parser: tseslint.parser },
    },
    {
      files: ['**/*.cjs'],
      languageOptions: { parser: tseslint.parser, sourceType: 'commonjs' },
    },
  ];
}
