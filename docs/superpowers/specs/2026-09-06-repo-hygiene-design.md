# Repository hygiene and toolchain alignment

**Status:** approved 2026-09-06; implemented, reviewed and merged to `main`
the same day (fast-forward e4bec37 → df49979, 15 commits).
**Follows:** `2026-09-05-platform-reorganization-design.md` (phase 1, merged at
`8b672de`). This is a second, narrower pass over the same tree: it removes what
phase 1 left behind, makes every workspace's lint, type-check and test tasks
actually pass, and fixes the code those tasks were failing on.

## 1. Goal

A tree a new engineer can clone, install and check in one sitting, on the
assumption that everything present is used and everything green is real:

- nothing on disk or in git that is generated, foreign or dead;
- one ESLint, one Jest preset, one clean command, one hook setup, used by every
  workspace the same way;
- `lint`, `type-check`, `test` and `build` green in all 18 npm workspaces, with
  no "known failing" list in the docs;
- the code behind today's failures reviewed and corrected, not silenced.

## 2. Decisions already made

Rulings the user gave on 2026-09-06, in answer to the audit:

| Question                                                                  | Ruling                                                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Regenerable material on disk (caches, build output, logs, tool downloads) | Delete everything regenerable; Docker's data disk is excluded and reported                   |
| `skills/` clone and the inert ralph/hookify Claude tooling                | Remove both                                                                                  |
| husky, lint-staged and commitlint (declared, never ran)                   | Wire them up rather than remove them                                                         |
| Execution                                                                 | Inline, small commits on one branch, one independent review of the whole branch before merge |
| The ten PascalCase `.tsx` files phase 1 left as an exception              | Rename them now                                                                              |
| `.vscode` and `.claude` files                                             | In scope                                                                                     |

Earlier rulings that still bind: tidy in place (no re-layout), the registry is
the only source of ports and paths, kebab-case files and `<Deployable>Module`
naming, merge to `main` locally (no remote exists).

## 3. Measured state the design rests on

### 3.1 On disk, git-ignored

| Path                                                                              | Size   | What it is                                                                                       | Action                     |
| --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ | -------------------------- |
| `.turbo/cache`                                                                    | 33 GB  | 303 Turbo cache entries since 2026-07-12                                                         | delete                     |
| `DockerDesktopWSL/`                                                               | 31 GB  | Docker Desktop's `docker_data.vhdx`, pointed into the repo                                       | leave; user relocates      |
| `apps/web/.next`, `modules/*/frontend/.next`                                      | 9.5 GB | Next build output                                                                                | delete                     |
| `apps/{customer,partner,seller}/build`, `**/.dart_tool`, `apps/*/android/.gradle` | 4.9 GB | Flutter and Gradle output                                                                        | delete                     |
| `apps/api/dist`, `modules/*/backend/dist`                                         | 24 MB  | Nest build output                                                                                | delete                     |
| `build/` (root)                                                                   | 84 MB  | CMake output for `apps/customer/windows`, created by the tracked `cmake.sourceDirectory` setting | delete; remove the setting |
| `Users/HPELIT~1/AppData/Local` (root)                                             | 652 KB | a profile-path mirror some tool created relative to the repo                                     | delete                     |
| 28 `*.log` at the root, `tests/smoke/logs`                                        | 13 MB  | dev-server and smoke logs                                                                        | delete                     |
| `nuget.exe`, `packages/Newtonsoft.Json.13.0.4/`                                   | 21 MB  | a NuGet download and its restore output                                                          | delete                     |
| `scratch/fix-mock-ids.js`                                                         | 2 KB   | one-off script from July                                                                         | delete                     |
| `skills/`                                                                         | 3.7 MB | clone of `mattpocock/skills` with its own `.git`                                                 | delete                     |
| `**/.turbo` per workspace, `apps/web/tsconfig.tsbuildinfo`                        | < 1 MB | Turbo run metadata, tsc cache                                                                    | delete                     |

Not touched: every `node_modules`, every local `.env*`, `infra/nginx/ssl/*.key`
and `.crt`, `.idea/`, `.superpowers/`, `apps/*/.flutter-plugins-dependencies`.

### 3.2 Tracked but dead, misplaced or misnamed

- `apps/api/libs/{dto,events,logger,validators}` — four libraries imported by
  nothing. `dto` and `validators` are bare Nest CLI scaffolds (module + index);
  `events` holds a second copy of the Kafka topic constants that every service
  actually takes from `@app/kafka`, and `logger` a `KartseekLogger` no module
  provides. All four are registered in `nest-cli.json`, `apps/api/tsconfig.json`
  and all eight `modules/*/backend/tsconfig.json`.
- `apps/seller/lib/features/hotel_owner/screens/hotel_quick_pricing_screen.dart`
  — byte-identical to the `seller_hotel` copy; the router imports only
  `seller_hotel`.
- `apps/api/seeds/*.js` — eight one-off marketplace catalogue repair scripts
  (images, variants, category fill), referenced by nothing, sitting beside the
  real seeds in `apps/api/scripts/seed/`.
- `.env.local.example` — a second root env template; only the archived fix
  reports mention it, and every key it holds that matters is already in
  `apps/api/.env.example`.
- `apps/web/.eslintrc.json` — eslintrc support was dropped in ESLint 10; the
  flat config next to it already ports its two rules.
- `tests/postman/data/*.json` — four data files no collection, script or config
  reads.
- `tests/postman/environments/` — eight `KARTSEEK_<Name>` files plus a
  three-key `local.postman_environment.json` whose `base_url` disagrees with
  `KARTSEEK_Local` (no `/api/v1`).
- `.claude/commands/{ralph-loop,cancel-ralph,ralph-help,hookify,hookify-configure,hookify-help,hookify-list}.md`,
  `.claude/scripts/{setup-ralph-loop,stop-hook}.sh`,
  `.claude/agents/conversation-analyzer.md` — each carries a banner saying it
  cannot fire in this project.
- `.lintstagedrc.js` duplicates the `lint-staged` block in `package.json` with
  different globs; `prepare` swallows husky's absence; no `.husky/` exists;
  commitlint is configured and never invoked.
- `.vscode/launch.json` debugs "Jest — API Unit Tests" via a Jest binary the
  API no longer has and names a `nest:debug` task that does not exist;
  `.vscode/tasks.json` holds only an unconfigured CMake template;
  `.vscode/settings.json` tracks five machine-specific absolute paths (Python,
  JDK, git, ripgrep, CMake source dir).
- `apps/api/schema.gql` is regenerated by the gateway on every development
  boot (`autoSchemaFile`), last committed in the baseline commit.
- `next-env.d.ts` in all nine Next workspaces flips between `next dev` and
  `next build` output (phase 1 spec §15).
- `SELLER_TCP_PORT` in `apps/api/.env.example` (4019),
  `env.validation.ts` (4019) and `infra/k8s/config.yaml` (4002) — read by
  nothing, and the three copies disagree.
- Three broken package scripts: marketplace-backend `db:create` and
  `db:schema` point at `scripts/create-database.js` and
  `scripts/apply-schema.js`, which have never existed in history;
  `apps/api` `clean` runs `rimraf`, which is not installed. Every Next
  workspace's `clean` runs `rm -rf`, which fails under npm's `cmd.exe` on
  Windows.
- Ten `.tsx` files with PascalCase names (six under
  `apps/web/src/app/admin/**/page-builder/components/`, four under
  `packages/shared-ui/src/`), each imported from one place except
  `ProgressBar.tsx` (eight).
- Four undated audits whose dates are stated inside them:
  `final-stabilization-report.md` and `full-system-scan-report.md`
  (2026-06-09), `marketplace-module-review.md` (2026-07-25),
  `frontend-data-audit.md` (2026-08-30).
- Five branches: `chore/nest-12` (`cfb1187`), `chore/nest-12-baseline`
  (`a741037`) and `chore/rspack-builder` (`774a444`) are ancestors of `main`;
  `chore/nest-12-upgrade` (`036b5cd`) is the spike the merged Nest 12 work
  superseded; `chore/platform-reorg-1b` (`f11f1ef`) is the peer session's
  registry work, cherry-picked into phase 1.

### 3.3 Toolchain

- Three ESLint setups coexist: the root resolves 9.39.5 (hoisted; no root
  declaration), `apps/api`, `apps/web` and all eight zones carry nested
  10.9.1. `apps/web` crashes (`scopeManager.addGlobals is not a function`)
  because its nested ESLint 10 loads the root's typescript-eslint 8.61.1; the
  API lints fine because it also nests typescript-eslint 8.69.0. The eight
  module backends lint with the root's 9.39.5 through `apps/api/eslint.base.js`.
- No zone has an `eslint.config.*`; `lint` fails in all eight.
- Six zones (`doctor`, `franchise`, `hotel`, `pharmacy`, `restaurant`, `taxi`)
  run `jest` with no config and no tests, so `test` exits non-zero on "no tests
  found". `grocery` and `marketplace` each carry a hand-copied `jest.config.ts`;
  grocery's lists 52 `moduleNameMapper` entries mirroring its tsconfig `paths`.
- `apps/web/tsconfig.json` excludes `src/__tests__` from type-check; the zones
  do not, and marketplace's two specs fail with bare `describe`/`it`/`expect`.

### 3.4 Code behind the failures

- `modules/grocery/frontend/src/lib/grocery/urls.ts` mixes basePath-prefixed
  and unprefixed forms: `productPath(null)` returns `/grocery` while the
  no-id branch returns `/`; the string branch returns `/grocery/product/…`
  while the object branch returns `/product/…`; `isCanonicalStoreParam`
  compares against `/grocery/store/…` while `storePath` builds `/store/…`.
  Two of its 17 tests fail. Every page in the zone calls the object forms.
- `apps/api` lint: 35 findings in 12 files. The ones that matter most are in
  `apps/payment-service/src/services/invoice.service.ts`: its hand-written tax
  switch keys on `'UK'` although `payment.countryCode` is the ISO code `'GB'`
  from `RegionService` (so UK invoices get no tax lines), carries a second,
  unreachable `case 'IN'` whose body is a 16 % VAT labelled for Kenya (not a
  market), and disagrees with the region registry for Saudi Arabia (5 %
  against the registered 15 %) while omitting Bahrain, Kuwait, Oman and the
  US entirely. `REGION_CONFIGS[code].tax` in `@app/region` already records the
  name and rate for all ten markets and exists precisely so services stop
  keeping private tax tables. The rest: eleven
  empty `catch {}` blocks in `geo-security.controller.ts` (nine) and
  `taxi.controller.ts` (two), eight `no-case-declarations` in the same tax
  switch, six `@ts-ignore` on dynamic imports of `@aws-sdk/client-s3` and
  `@google-cloud/storage` in `libs/storage/src/storage.service.ts`
  (`@aws-sdk/client-s3` is installed; `@google-cloud/storage` deliberately is
  not), a `require('crypto')` in `api-key.guard.ts`, an
  empty `EmptyRequest {}` interface in `grpc.interfaces.ts`, a useless catch
  in `search.service.ts`, a useless escape in `input-sanitizer.middleware.ts`,
  an irregular whitespace character inside a log string in
  `geo-security.controller.ts:379`, and four `prefer-const`.
- `modules/marketplace/backend/src/__tests__/verification.spec.ts` uses six
  `require()` calls for `fs` and `path`.

## 4. Work package A — disk hygiene

1. Stop the running `dev` preview (it holds `.next` and `dist` open).
2. Delete every "delete" row of §3.1. `node_modules` is never touched.
3. Restart the `dev` preview.
4. Prevent recurrence: remove `cmake.sourceDirectory` and the CMake task from
   `.vscode`; add a cross-platform clean (§6.5).
5. Report Docker's disk to the user with the relocation steps (Docker Desktop
   → Settings → Resources → Advanced → Disk image location). It is never
   deleted by this work.

## 5. Work package B — tracked-tree cleanup

### 5.1 Delete

- The four libs in §3.2, with their entries removed from `apps/api/nest-cli.json`,
  `apps/api/tsconfig.json` and the eight module-backend `tsconfig.json`
  files, and from any alias map in `apps/api/rspack.config.js` or
  `apps/api/test/vitest-backend.mts` that enumerates libs.
- The orphan seller screen and its now-empty `hotel_owner/` directory.
- `.env.local.example`, `apps/web/.eslintrc.json`, `.lintstagedrc.js`.
- `tests/postman/data/` (four files); the `tests/postman/README.md` tree and
  `newman.config.js` comment lose their `data/` lines.
- The ten inert Claude files in §3.2. `.claude/hooks/HOOKS-README.md` and the
  session memory that catalogues the import are updated to match.
- `SELLER_TCP_PORT` from all three places.
- `.vscode/tasks.json` entirely; the Jest launch configuration and the
  `preLaunchTask: nest:debug` reference from `.vscode/launch.json`; the five
  machine-specific paths and `cmake.sourceDirectory` from
  `.vscode/settings.json`, with `eslint.workingDirectories` set to
  `[{ "mode": "auto" }]` so every workspace's flat config is found.
- marketplace-backend's `db:create` and `db:schema` scripts.

### 5.2 Move and rename

- `apps/api/seeds/*.js` (eight) → `apps/api/scripts/maintenance/marketplace-catalog/`,
  each with a row in `apps/api/scripts/maintenance/README.md` stating what it
  changed and that it has already been applied. `apps/api/seeds/` disappears.
- Postman environments → one kebab-case scheme: `india`, `qatar`, `uae`, `uk`,
  `usa`, `staging`, `production`, `local` (`*.postman_environment.json`).
  `KARTSEEK_Local` becomes `local`; the three-key `local` file is deleted.
  `run-all.js`'s `envMap`, `newman/run-payment-tests.sh` and both Postman
  READMEs follow. The payment collection carries its own `baseUrl` collection
  variable and reads only `{{userToken}}` from the thin file; that one
  reference becomes `{{user_token}}`, the variable the numbered suite's login
  requests populate, so a single `local` environment serves both runners.
- Audits → `2026-06-09-final-stabilization-report.md`,
  `2026-06-09-full-system-scan-report.md`,
  `2026-07-25-marketplace-module-review.md`,
  `2026-08-30-frontend-data-audit.md`; every link updated.
- The ten PascalCase components → kebab-case (`grocery-section-editor.tsx`,
  `section-type-menu.tsx`, `marketplace-section-editor.tsx`,
  `marketplace-section-type-menu.tsx`, `section-editor-modal.tsx`,
  `sortable-section.tsx`, `cross-module-picks.tsx`,
  `recommendation-carousel.tsx`, `notify-me-modal.tsx`, `progress-bar.tsx`),
  imports updated, the exception paragraph removed from
  `docs/guides/conventions.md`.

### 5.3 Ignore

- `apps/api/schema.gql` is untracked and ignored. The gateway regenerates it
  on boot; nothing reads it from git.
- `next-env.d.ts` is untracked in all nine Next workspaces and ignored with
  `**/next-env.d.ts`. Because `tsc` needs the file, every Next workspace's
  `type-check` becomes `next typegen && tsc --noEmit` (Next 16 ships
  `next typegen`; it writes `next-env.d.ts` and the route types without a
  build). Phase 4's CI inherits this for free.

### 5.4 Config hygiene

- `apps/api/.env.example` gains `DEV_AUTH_BYPASS=false` with a one-line
  comment (phase 1 spec §12).
- `.dockerignore`, `apps/api/tsconfig.json` `exclude` and any other list that
  names `apps/api/seeds` is updated.

### 5.5 Branches

`chore/nest-12`, `chore/nest-12-baseline` and `chore/rspack-builder` are
deleted with `-d` (ancestors). `chore/nest-12-upgrade` and
`chore/platform-reorg-1b` are deleted with `-D`; their tips are recorded in
§3.2 and stay in the reflog for 90 days.

## 6. Work package C — one toolchain

### 6.1 ESLint

- Invariant: `npm ls eslint typescript-eslint` shows exactly one version of
  each, declared in the root `package.json` (`eslint@^10.9.1`,
  `typescript-eslint@^8.69.0`, the highest already present in the tree). The
  `eslint` and `@typescript-eslint/*` devDependencies are removed from
  `apps/api`, `apps/web` and the eight zones; `eslint-config-next` stays
  declared by the Next workspaces that use it, moved from 16.2.9 to 16.3.3 to
  match the installed Next. Its own Babel-based parser (applied to
  `.js/.jsx/.mjs/.mts/.cts`; only `.ts/.tsx` go through typescript-eslint) is
  incompatible with ESLint 10, so the shared config parses those files with
  typescript-eslint's parser instead. Module backends keep delegating to
  `apps/api/eslint.base.js`.
- `apps/web/eslint.base.mjs` exports a factory (`nextAppConfig({ dir })`)
  holding today's `apps/web/eslint.config.mjs` content: the ignores, the
  `eslint-config-next/core-web-vitals` layers, `settings.react.version`, the
  two rule overrides. `apps/web/eslint.config.mjs` and a new
  `eslint.config.mjs` in each zone are one-line imports of it, the same
  shape the backends use.
- Rule policy: `react-hooks/rules-of-hooks` stays an error. The React
  Compiler-era `react-hooks/*` rules that eslint-plugin-react-hooks 7 turns
  on by default, and `react-hooks/exhaustive-deps`, are set to `warn`: they
  are advisory while the compiler is off (the existing lint baseline memory
  records ~245 of them in `apps/web`). `lint` in the Next workspaces is
  `eslint .` with `--max-warnings` unset; errors must be zero, and the
  warning count per workspace at merge time is recorded in
  `docs/guides/testing.md` as the number to drive down, not a gate.

### 6.2 Jest

- `apps/web/jest.base.cjs` exports `createNextJestConfig(dir)`: `next/jest`
  with `testEnvironment: 'node'`, the shared `testMatch`, the `ts-jest`
  transform, and a `moduleNameMapper` derived from the workspace's own
  `tsconfig.json` `paths` through `ts-jest`'s `pathsToModuleNameMapper`,
  re-ordered most-specific first (longest literal prefix, wildcard patterns
  last) because Jest takes the first match while TypeScript takes the longest.
- Every Next workspace's config becomes a `jest.config.cjs` of one statement;
  the hand-written `jest.config.ts` files in `apps/web`, `grocery` and
  `marketplace` are deleted. Grocery's 65 tests are the regression check for
  the derived mapper.
- Each of the eight zones gets `src/__tests__/registry-entry.spec.ts`: it loads
  `services.yaml` (root `yaml` dependency), finds its own entry by
  `path`, and asserts that `package.json`'s `dev` and `start` scripts bind
  `ports.http` and that `next.config.mjs` declares `basePath: '<basePath>'`
  (a literal match on the source line; the config is an ESM file wrapped by
  the next-intl plugin, which Jest cannot import without VM modules). The
  shell gets the same spec against its `web-shell` entry (no basePath). This
  gives every zone a real test and removes the "no tests found" failure
  without `--passWithNoTests`.

### 6.3 Type-check

- `apps/web/tsconfig.json` stops excluding `src/__tests__`. TypeScript does
  not pull `@types/jest` into these programs on its own (grocery only sees it
  through a stray `/// <reference types="jest" />` in one spec; marketplace has
  none, hence its two failures), so every Next workspace's `tsconfig.json`
  declares `"types": ["jest", "node"]`. Measured before implementation: with
  that setting and its tests included, `apps/web` type-checks with zero errors,
  and so does marketplace. Result: `type-check` green in all 18 workspaces
  with test files included.

### 6.4 Git hooks

- `prepare` becomes `husky` (v9). `.husky/pre-commit` runs `npx lint-staged`
  then `node scripts/registry/validate.mjs`. `.husky/commit-msg` runs
  `npx --no -- commitlint --edit "$1"`.
- One `lint-staged` block in `package.json`:
  `*.{ts,tsx,js,jsx,mjs,cjs}` → `prettier --write`, `eslint --fix`;
  `*.{json,md,yml,yaml}` → `prettier --write`. No `--max-warnings 0`: errors
  block a commit, advisory warnings do not, matching §6.1.
- A root `.prettierignore` so lint-staged and `npm run format` agree:
  `node_modules`, `dist`, `.next`, `coverage`, `package-lock.json`,
  `tests/postman/collections`, `**/*.g.dart`, `.turbo`.
- Commit messages already follow `config-conventional`; the hook makes that a
  rule instead of a habit.

### 6.5 Clean

- `rimraf@^6` at the root. Next workspaces: `rimraf .next out tsconfig.tsbuildinfo`;
  Nest workspaces: `rimraf dist`. Root `clean`: `turbo run clean` followed by
  `rimraf .turbo/cache tests/smoke/logs`. The old root `clean` also removed
  `node_modules`; that is dropped (`npm ci` is the documented reset).

## 7. Work package D — problematic code

Each item names the root cause, the fix and how it is verified.

1. **Grocery URL helper** (`modules/grocery/frontend/src/lib/grocery/urls.ts`).
   Cause: leftover `/grocery` prefixes from before the zone ran under
   `basePath`. Fix: `productPath(null | undefined)` → `/`; string form →
   `/product/<id>`; `isCanonicalStoreParam` compares against `/store/…`.
   Verify: 65/65 grocery tests; `git grep` confirms no caller passes a string.
2. **Invoice tax lines** (`invoice.service.ts`). Cause: a private tax table
   that drifted from the region registry (`'UK'` for `'GB'`, a dead duplicate
   `case 'IN'`, Saudi Arabia at 5 % instead of 15 %, four markets missing).
   Fix: a pure `tax-breakdown.ts` beside the service whose
   `calculateTaxBreakdown(commissionAmount, countryCode)` reads
   `getRegionConfig(countryCode)?.tax` from `@app/region`, keeps India's
   CGST/SGST split of the registered rate, returns no lines where the rate is
   zero or the country is unknown, and keeps today's arithmetic (tax added on
   top of the commission, rounded to the cent) — the registry's `isInclusive`
   flag describes consumer pricing and is deliberately not applied here. A
   Vitest spec covers IN, GB, SA, BH, SG, the zero-rate markets QA and KW, an
   unknown country and rounding. Verify: the spec;
   `npm run lint -w kartseek-api` shows no `no-duplicate-case` or
   `no-case-declarations`.
   Two rulings recorded after the review: the registry's US entry (`Sales Tax`,
   8.875 %, one city's consumer rate) is **not** applied to commission
   invoices — US invoices keep carrying no tax line, through an explicit
   exemption set in `tax-breakdown.ts`, until finance supplies a rule for
   platform commission in the US; and the function normalises the code
   (`trim().toUpperCase()`) because `payment.countryCode` is validated only
   as a non-empty string at the DTO, so a lowercase code no longer yields no
   lines silently. Restricting the DTO to the supported codes is an API
   contract change left for a follow-up (§11).
3. **Empty catches** (`geo-security.controller.ts` ×9, `taxi.controller.ts`
   ×2). Cause: fallbacks written without a trace. Fix: each catch logs at
   `warn` through the controller's Nest `Logger` with what failed and which
   fallback is taken; the fallback behaviour itself is unchanged. Exception:
   the two geo-security **write** paths (`updateRule`, `addWhitelist`) log at
   `error` and rethrow, because answering `success: true` for a row that never
   persisted is not a fallback; the exception filter renders the rethrow as a
   generic 500 in production. In the database-less `SKIP_DB` mode both still
   return success without writing anywhere (pre-existing; §11). The irregular
   character in the line-379 log string is removed. Verify: lint.
4. **Optional storage imports** (`storage.service.ts` ×6). Cause:
   `@ts-ignore` guarding dynamic imports, four of a package that is installed
   (`@aws-sdk/client-s3`) and two of one that deliberately is not
   (`@google-cloud/storage`). Fix: plain typed dynamic imports for S3; the two
   GCS imports keep a `@ts-expect-error` carrying the reason, which turns into
   a loud unused-directive error the day the package is installed. If a
   deployment drops the S3 package, the import fails at call time with a clear
   module-not-found, which the surrounding try/catch already reports. Verify:
   lint, `tsc`, `nest build --all`.
5. **`require('crypto')`** → `import { createHmac } from 'crypto'`.
6. **`EmptyRequest {}`** → `type EmptyRequest = Record<string, never>`.
7. **Useless catch** in `search.service.ts`: the wrapper only rethrows; it is
   removed (or, if it hides a needed cleanup, converted to a logged rethrow).
8. **Useless escape** in `input-sanitizer.middleware.ts`; four `prefer-const`.
9. **Marketplace spec type errors**: closed by §6.3; verified by
   `npm run type-check -w @kartseek/marketplace-frontend`.
10. **`verification.spec.ts` requires** → top-level `import * as fs` /
    `import * as path`.
11. **Double-encoded text** (found during execution, not by the audit):
    seventeen files whose UTF-8 had once been decoded as Windows-1252 and
    saved again — Swagger tags (`ðŸ›¡ï¸ Geo Security`), a rendered rupee sign
    and em dash in the pharmacy zone, hundreds of comment rules, and the
    irregular whitespace inside the geo-security log string. Repaired line by
    line with an exact round-trip check (repaired line re-encoded as UTF-8 and
    decoded as Windows-1252, with Latin-1 for the five bytes Windows-1252
    leaves undefined, must equal the original line), so a line changes only
    when the transform is provably the inverse. Verify: no cp1252 signature
    remains in `git grep`; the review paired every changed line.
12. **ESLint 10's new `no-useless-assignment`** (surfaced once the toolchain
    was unified, §6.1): sixteen initialisers that no path ever read, such as
    `let ride: any = null;` before an if/else that assigns both arms, are
    dropped; each site was checked by hand because TypeScript verifies none of
    them (`any`-typed variables and `strictNullChecks: false` both switch the
    definite-assignment check off).

After D, `docs/guides/testing.md`'s "Known, pre-existing gaps" section is
deleted rather than shortened: there are none left to record. The still-true
fact that five zones need three environment variables to build becomes a
"Build" section instead.

## 8. Work package E — documentation

- `docs/guides/testing.md`: remove the gaps section; add the zone config spec,
  the warning-count table, and `next typegen` in type-check.
- `docs/guides/conventions.md`: remove the PascalCase exception; add the hook,
  clean, Jest-preset and zone-test conventions; state the single-ESLint
  invariant.
- `docs/guides/local-setup.md`: hooks install on `npm install`; `npm run clean`;
  the Docker disk note.
- `tests/README.md`, `tests/postman/README.md`: environment names, the removed
  `data/` folder.
- `apps/api/scripts/maintenance/README.md`: eight new rows.
- `apps/api/README.md`, `ARCHITECTURE.md`, `docs/architecture/services.md`
  wherever the four deleted libs are named.
- `.claude/hooks/HOOKS-README.md`: drop the ralph/hookify mentions.
- Phase 1 spec §15: mark the `next-env.d.ts`, `SELLER_TCP_PORT`,
  `DEV_AUTH_BYPASS` and PascalCase items done, pointing here.
- `npm run docs:check-links` stays at zero broken links.

## 9. Gates

All of these pass on the branch before the review, and again on `main` after
the merge:

| Check        | Command                                                                     | Required result                                                               |
| ------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Registry     | `npm run registry:check`                                                    | clean                                                                         |
| Script tests | `npm run test:scripts`                                                      | all pass                                                                      |
| Links        | `npm run docs:check-links`                                                  | 0 broken                                                                      |
| Type-check   | `npm run type-check`                                                        | 18/18 green, tests included                                                   |
| Lint         | `npm run lint`                                                              | 18/18 green, 0 errors                                                         |
| Unit tests   | `npm run test`                                                              | 18/18 green, every workspace has ≥ 1 test                                     |
| API build    | `npm run build -w kartseek-api`                                             | 18 projects                                                                   |
| Full build   | `NEXT_PUBLIC_API_URL`, `API_URL`, `NEXT_PUBLIC_WS_URL` set; `npm run build` | all workspaces                                                                |
| Smoke        | `npm run smoke`                                                             | 26/26                                                                         |
| Hooks        | a throwaway commit with a bad message and an unformatted file               | both rejected                                                                 |
| Image deps   | `docker build --target prod-deps -f infra/docker/core-service.Dockerfile .` | `npm ci --omit=dev` succeeds with the `prepare` script present (husky absent) |

Then the final review (one independent reviewer over the whole branch diff),
fixes, re-review of the fixes, fast-forward merge to `main`, branch deleted.

## 10. Risks and handling

- **Windows file locks.** VS Code's Dart analysis server holds `packages/`
  and `apps/*` paths; a running preview holds `.next` and `dist`. The preview
  is stopped before deletion; a `Permission denied` on a Dart path is
  retried after the analysis server is stopped, never worked around by
  copying.
- **ESLint 10 upgrade surface.** Removing nested copies changes which ESLint
  the backends run (9.39 → 10.9). Every workspace's `lint` is run
  individually before and after; a rule that newly fires is fixed in code,
  not disabled, unless it is one of the advisory hook rules in §6.1.
- **Advisory warning volume.** `apps/web` will report roughly 245 hook
  warnings once lint runs again; they are recorded, not fixed, in this pass.
- **Derived Jest mapper.** If `pathsToModuleNameMapper` ordering breaks an
  import that grocery's hand-written list resolved, the preset's ordering is
  fixed; the hand-written list is not restored.
- **`next typegen`.** If a zone's typegen needs env vars the way `next build`
  does, the type-check script sets placeholders for typegen only; the
  runtime resolver in `packages/shared-core/src/config/api-base.ts` is not
  changed.
- **Deleting the caches costs one cold build.** Expected; the preview restart
  after A is the first one.

## 11. Out of scope

- Relocating `DockerDesktopWSL/` (user action; instructions in the report).
- Phases 2–5 of the reorganization (observability, Docker templates, GitHub
  Actions, database-per-service).
- `infra/k8s/gen-microservices.sh` and its port table; phase 2's registry
  generator replaces it.
- The four proto files duplicated between `apps/api/proto` and
  `modules/*/backend/proto` (identical today); a drift check belongs to the
  registry validator in phase 2.
- Fixing the ~245 advisory React hook warnings.
- `apps/mcp-server` (standalone, own lockfile, not an npm workspace),
  `packages/vendor/objective_c/example/**` (upstream mirror), and the Flutter
  apps beyond the one orphan file.

Follow-ups the review surfaced, deliberately not done in this pass:

- A one-time `style: format the tree` commit (`npm run format`) recorded in a
  `.git-blame-ignore-revs`, so the pre-commit hook's Prettier step is a no-op
  on untouched files instead of rewriting each file the first time it is
  edited (`prettier --check` reports 132 unformatted files in a small sample;
  `infra/k8s/microservices-generated.yaml` needs either a `.prettierignore`
  entry or a Prettier-clean generator first).
- `payment.countryCode` is validated only as a non-empty string; tightening
  the DTO to the supported ISO codes is an API contract change to make with
  the clients in view.
- The geo-security write paths return `success: true` without writing
  anywhere when `SKIP_DB=true` (a dev-only mode), and `lookupIp` caches an
  empty geolocation for an hour after a transient lookup failure — both
  pre-existing, both of the "fabricated fallback" family already tracked.
- `libs/storage/src/storage.service.ts` returns a CDN URL even when the
  upload failed ("fallback to simulated URL so the API doesn't crash") — the
  same family.
- `SKIP_DB=true` is accepted under any `NODE_ENV`
  (`apps/api/apps/api-gateway/src/config/env.validation.ts`); "dev-only" is
  a convention, not a rule. Refuse it when `NODE_ENV=production`.
- Comment-only catch blocks (`catch (err) { // Fallback to defaults }`) in
  `taxi.controller.ts` and the two "Redis GEO" catches in the gateway are
  invisible to `no-empty`; they deserve the same logged-fallback treatment
  the eleven empty ones received.
- The Docker `deps` stage prints `husky: .git can't be found` on every image
  build; `ENV HUSKY=0` in the three Dockerfiles silences it (cosmetic).

## 12. Plan shape

One branch `chore/repo-hygiene` from `main`. Tasks in dependency order, one
commit each unless noted: (1) branch and the disk cleanup with the preview
pause; (2) the dead libraries and tracked leftovers; (3) the catalogue
scripts, Postman environments and audit dates; (4) the PascalCase renames;
(5) ignores, `next typegen`, config hygiene and branches; (6) one ESLint and
the shared Next config; (7) the grocery URL fix; (8) the Jest preset and
per-workspace registry spec; (9) type-check with tests included; (10) hooks,
lint-staged, `.prettierignore`, clean scripts and a root ESLint config for the
repository's own scripts; (11) invoice tax lines from the region registry;
(12) the remaining API lint findings and the marketplace-backend spec;
(13) documentation; (14) gates; (15) review, fixes, merge. Tasks 7, 11 and 12
are independent of 6, 8, 9 and 10 and may be interleaved, but every commit
leaves the gates it touched green. The plan is
`docs/superpowers/plans/2026-09-06-repo-hygiene.md`.
