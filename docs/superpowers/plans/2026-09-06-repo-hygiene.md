# Repository Hygiene and Toolchain Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove everything generated, foreign or dead from the tree, put every workspace on one ESLint, one Jest preset, one clean command and working git hooks, and fix the code behind today's documented lint, type-check and test failures.

**Architecture:** Fifteen tasks on one branch, `chore/repo-hygiene`, executed in order with one commit per task. Tasks 1–5 delete and move; 6 and 8–10 align tooling by giving `apps/web` the same "platform config the others import" role that `apps/api` already plays for the backends; 7, 11 and 12 fix code with tests first; 13 updates the docs; 14 runs the gates; 15 reviews and merges. The spec is `docs/superpowers/specs/2026-09-06-repo-hygiene-design.md`; section numbers below refer to it.

**Tech Stack:** npm workspaces + Turbo 2, NestJS 12 on rspack, Next 16.3 (nine apps), ESLint 10 with typescript-eslint 8, Jest 30 via `next/jest` + ts-jest, Vitest 4, husky 9 + lint-staged 17 + commitlint 21, `yaml` 2, `rimraf` 6. Windows 11, Git Bash for shell steps, Node 25.5.

## Global Constraints

- Tidy in place: no directory re-layout; `apps/`, `modules/`, `packages/` stay where they are (spec §2).
- The registry `services.yaml` is the only source of ports, paths and basePaths; nothing new hard-codes a port (spec §2).
- File names are kebab-case for TypeScript and TSX; Dart keeps snake_case (spec §2, conventions D3).
- Exactly one `eslint` and one `typescript-eslint` version in `npm ls`, declared at the root: `eslint@^10.9.1`, `typescript-eslint@^8.69.0`, `@eslint/js@^10.0.1` (its own version line; ESLint 10 no longer depends on it) (spec §6.1).
- `react-hooks/rules-of-hooks` stays an error; every other `react-hooks/*` rule the Next preset enables is a warning; Next-workspace `lint` scripts are `eslint .` with no `--max-warnings` (spec §6.1).
- Every Next workspace's `type-check` is `next typegen && tsc --noEmit`, and its `tsconfig.json` declares `"types": ["jest", "node"]` (spec §5.3, §6.3).
- Never delete or reinstall `node_modules` by hand; install only from the repository root; never delete `package-lock.json` (memory: npm workspace install hygiene).
- Never touch `DockerDesktopWSL/`, any local `.env*`, `infra/nginx/ssl/*.key|*.crt`, `.idea/`, `.superpowers/` (spec §3.1).
- Fix lint findings in code; the only rules downgraded are the advisory hook rules above (spec §10).
- Commit messages follow Conventional Commits and end with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer.
- Shell steps are Git Bash. Paths in `node -e` one-liners use forward slashes. Multi-line scripts are written to a file with the Write tool, never through a heredoc (backslashes collapse in heredocs on this machine).
- Before every task that deletes files under `.next`, `dist` or `packages/`, confirm no preview server is running (`preview_list`); stop it if one is.

---

### Task 1: Branch and disk hygiene (spec §4)

**Files:**
- No tracked file changes. Deletes the git-ignored paths in spec §3.1.

**Interfaces:**
- Produces: branch `chore/repo-hygiene` at the tip of `main`; a tree with no build output, which later tasks' `next typegen`, `nest build` and Jest runs recreate.

- [ ] **Step 1: Create the branch**

Run:
```bash
git switch -c chore/repo-hygiene main && git log --oneline -1
```
Expected: `Switched to a new branch 'chore/repo-hygiene'`, tip is the plan commit.

- [ ] **Step 2: Stop every running preview server**

Call `preview_list`. For every entry with `"status": "running"`, call `preview_stop` with its `serverId`. Then call `preview_list` again and confirm the list is empty. (At plan time the running entry was the full-platform `dev` server, `fb7d7152-866f-4314-b410-b3d7624cc78c`, on port 3000.)

- [ ] **Step 3: Confirm nothing tracked is dirty**

Run:
```bash
git status --short | wc -l
```
Expected: `0`.

- [ ] **Step 4: Delete the regenerable output and the foreign material**

Run (in the background; the Turbo cache alone is 33 GB):
```bash
rm -rf .turbo/cache apps/web/.next modules/*/frontend/.next apps/api/dist modules/*/backend/dist apps/mcp-server/dist \
  apps/customer/build apps/partner/build apps/seller/build \
  apps/customer/.dart_tool apps/partner/.dart_tool apps/seller/.dart_tool packages/shared-mobile/.dart_tool packages/vendor/objective_c/.dart_tool \
  apps/customer/android/.gradle apps/partner/android/.gradle apps/seller/android/.gradle \
  apps/web/.turbo apps/api/.turbo modules/*/frontend/.turbo modules/*/backend/.turbo apps/web/tsconfig.tsbuildinfo \
  tests/smoke/logs build Users scratch nuget.exe packages/Newtonsoft.Json.13.0.4 skills \
  && rm -f ./*.log && echo DONE
```
Expected: `DONE`. If any path reports `Permission denied`, note which, stop the VS Code Dart analysis server (or close VS Code), and re-run the same command; do not copy or rename around a lock.

- [ ] **Step 5: Verify the result**

Run:
```bash
ls -d .turbo/cache apps/web/.next apps/api/dist build Users scratch nuget.exe skills packages/Newtonsoft.Json.13.0.4 2>&1 | grep -c 'No such file'; ls ./*.log 2>/dev/null | wc -l; du -sh DockerDesktopWSL node_modules 2>/dev/null; git status --short | wc -l
```
Expected: first number `9`, second `0`, `DockerDesktopWSL` and `node_modules` still present with their sizes, last number `0`.

- [ ] **Step 6: Restart the preview**

Call `preview_start` with `name: "dev"`. Expected: the server starts on port 3000 (cold build; allow several minutes). No commit for this task.

---

### Task 2: Delete the dead libraries and the tracked leftovers (spec §5.1, §5.4)

**Files:**
- Delete: `apps/api/libs/dto/**`, `apps/api/libs/events/**`, `apps/api/libs/logger/**`, `apps/api/libs/validators/**` (11 files)
- Delete: `apps/seller/lib/features/hotel_owner/screens/hotel_quick_pricing_screen.dart`
- Delete: `.env.local.example`, `apps/web/.eslintrc.json`, `.lintstagedrc.js`, `.vscode/tasks.json`
- Delete: `tests/postman/data/test-countries.json`, `test-orders.json`, `test-products.json`, `test-users.json`
- Delete: `.claude/commands/ralph-loop.md`, `cancel-ralph.md`, `ralph-help.md`, `hookify.md`, `hookify-configure.md`, `hookify-help.md`, `hookify-list.md`; `.claude/scripts/setup-ralph-loop.sh`, `stop-hook.sh`; `.claude/agents/conversation-analyzer.md`
- Modify: `apps/api/nest-cli.json` (four `projects` entries), `apps/api/tsconfig.json:109-132`, `modules/*/backend/tsconfig.json:58-65` (eight files), `apps/api/rspack.config.js:40`
- Modify: `ARCHITECTURE.md:187-207`, `apps/api/README.md:8,153`, `apps/api/docs/architecture.md:14`
- Modify: `apps/api/.env.example:132,154+`, `apps/api/apps/api-gateway/src/config/env.validation.ts:135`, `infra/k8s/config.yaml:148`
- Modify: `.vscode/launch.json`, `.vscode/settings.json`, `modules/marketplace/backend/package.json`

**Interfaces:**
- Produces: `apps/api/libs` holds 11 libraries; `rspack.config.js`'s `appLibs` lists exactly those 11; `apps/api/.env.example` contains `DEV_AUTH_BYPASS=false`.

- [ ] **Step 1: Remove the files from git**

Run:
```bash
git rm -r -q apps/api/libs/dto apps/api/libs/events apps/api/libs/logger apps/api/libs/validators \
  && git rm -q apps/seller/lib/features/hotel_owner/screens/hotel_quick_pricing_screen.dart \
  && git rm -q .env.local.example apps/web/.eslintrc.json .lintstagedrc.js .vscode/tasks.json \
  && git rm -r -q tests/postman/data \
  && git rm -q .claude/commands/ralph-loop.md .claude/commands/cancel-ralph.md .claude/commands/ralph-help.md \
       .claude/commands/hookify.md .claude/commands/hookify-configure.md .claude/commands/hookify-help.md .claude/commands/hookify-list.md \
       .claude/scripts/setup-ralph-loop.sh .claude/scripts/stop-hook.sh .claude/agents/conversation-analyzer.md \
  && git status --short | wc -l && ls apps/seller/lib/features/hotel_owner 2>&1 | head -1
```
Expected: `30` staged deletions; the `hotel_owner` directory no longer exists (git removes the empty directory). If `.claude/scripts/` is now empty, `rmdir .claude/scripts`.

- [ ] **Step 2: Drop the four projects from nest-cli.json**

Run:
```bash
node -e "const fs=require('fs');const p='apps/api/nest-cli.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));for(const k of ['dto','events','logger','validators']){if(!j.projects[k])throw new Error('missing '+k);delete j.projects[k];}fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');console.log(Object.keys(j.projects).length)" && git diff --stat apps/api/nest-cli.json
```
Expected: `28` projects remain (32 − 4); the diff removes lines only.

- [ ] **Step 3: Drop the eight path entries from apps/api/tsconfig.json**

First confirm the block is where the plan says:
```bash
sed -n '109p;132p' apps/api/tsconfig.json
```
Expected: line 109 is `      "@app/validators": [` and line 132 is `      ],`. Then:
```bash
sed -i '109,132d' apps/api/tsconfig.json && grep -c '@app/' apps/api/tsconfig.json && node -e "const ts=require('typescript');const r=ts.readConfigFile('apps/api/tsconfig.json',ts.sys.readFile);if(r.error)throw new Error(ts.flattenDiagnosticMessageText(r.error.messageText,'\n'));console.log(Object.keys(r.config.compilerOptions.paths).length)"
```
Expected: the grep count drops by 8 from its previous value; the parse prints the number of remaining `paths` keys with no error (22 if, as at plan time, the file maps only the libraries: 11 × 2).

- [ ] **Step 4: Drop the same entries from the eight module-backend tsconfigs**

Run:
```bash
sed -i -E '/"@app\/(validators|dto|events|logger)(\/\*)?":/d' modules/*/backend/tsconfig.json && grep -c '@app/' modules/*/backend/tsconfig.json
```
Expected: every file reports the same count, 8 lower than before (each entry there is a single line).

- [ ] **Step 5: Drop them from the rspack alias list**

Run:
```bash
sed -i "s/'guards', 'decorators', 'validators', 'dto', 'events', 'logger', 'security'/'guards', 'decorators', 'security'/" apps/api/rspack.config.js && grep -n "const appLibs" apps/api/rspack.config.js
```
Expected: the line reads `const appLibs = ['common', 'database', 'guards', 'decorators', 'security', 'grpc', 'kafka', 'redis', 'gdpr', 'region', 'storage'];`.

- [ ] **Step 6: Correct the library counts and table in the docs**

Run:
```bash
sed -i -E '/^\| `@app\/(dto|events|logger|validators)` +\|/d' ARCHITECTURE.md \
  && sed -i 's/^15 libraries under `apps\/api\/libs\/`/11 libraries under `apps\/api\/libs\/`/; s/sort -u | wc -l → 15 -->/sort -u | wc -l → 11 -->/' ARCHITECTURE.md \
  && sed -i 's/the 15 shared libraries/the 11 shared libraries/g; s/The 15 shared libraries/The 11 shared libraries/' apps/api/README.md \
  && sed -i 's/the 15 shared libraries/the 11 shared libraries/' apps/api/docs/architecture.md \
  && grep -c '^| `@app/' ARCHITECTURE.md && git grep -n -E '1[15] (shared )?librar' -- ARCHITECTURE.md apps/api/README.md apps/api/docs/architecture.md
```
Expected: `11` table rows; every match now says 11.

- [ ] **Step 7: Remove SELLER_TCP_PORT and assert DEV_AUTH_BYPASS=false**

Run:
```bash
sed -i '/^SELLER_TCP_PORT=/d' apps/api/.env.example \
  && sed -i '/SELLER_TCP_PORT/d' apps/api/apps/api-gateway/src/config/env.validation.ts infra/k8s/config.yaml \
  && git grep -n SELLER_TCP_PORT -- . ':!docs/superpowers' | wc -l
```
Expected: `0`. Then, with the Edit tool, add this block to `apps/api/.env.example` immediately before the line that begins `# Accept the static code '1234'` (line 154 at plan time):
```
# Anonymous requests must never be treated as SUPER_ADMIN anywhere but a
# developer's own shell. Keep this false in every committed file; flip it to
# true only in your local .env. See docs/guides/running-services.md#flags.
DEV_AUTH_BYPASS=false

```

- [ ] **Step 8: Rewrite .vscode/launch.json without the Jest and nest:debug entries**

Write the file with exactly this content:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "🚀 API Gateway (NestJS)",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "stopOnEntry": false,
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/apps/api/dist/**/*.js"],
      "remoteRoot": "${workspaceFolder}/apps/api"
    },
    {
      "name": "🚀 API Gateway — Launch & Debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/apps/api",
      "env": {
        "NODE_ENV": "development",
        "SKIP_DB": "true",
        "API_GATEWAY_PORT": "3001"
      },
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/apps/api/dist/**/*.js"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"]
    },
    {
      "name": "🌐 Web (Next.js)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/apps/web",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "🧪 Vitest — API Unit Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--no-file-parallelism"],
      "cwd": "${workspaceFolder}/apps/api",
      "env": {
        "NODE_ENV": "test"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"]
    }
  ],
  "compounds": [
    {
      "name": "🔥 Full Stack (Web + API)",
      "configurations": ["🚀 API Gateway — Launch & Debug", "🌐 Web (Next.js)"],
      "stopAll": true
    }
  ]
}
```

- [ ] **Step 9: Strip the machine-specific paths from .vscode/settings.json**

With the Edit tool, make these four replacements in `.vscode/settings.json`:

1. Replace
```
  // ── ESLint ───────────────────────────────────────────────────────────────────
  "eslint.workingDirectories": [
    { "directory": "apps/web", "changeProcessCWD": true },
    { "directory": "apps/api", "changeProcessCWD": true }
  ],
```
with
```
  // ── ESLint ───────────────────────────────────────────────────────────────────
  // Every workspace carries its own eslint.config.*; "auto" makes the extension
  // run ESLint from the directory that owns the file being edited.
  "eslint.workingDirectories": [{ "mode": "auto" }],
```
2. Delete the block from `  // ── Python ───` through the line `  "java.jdt.ls.javac.enabled": "on",` inclusive (it holds `python.defaultInterpreterPath`, `java.jdt.ls.java.home`, `git.path`, the Java import settings and `cmake.sourceDirectory`), and the blank line after it.
3. Delete the three lines `  // ── Todo Tree ───…` comment block through `  "todo-tree.ripgrep.ripgrep": "C:\\Users\\Hp EliteBook\\AppData\\Local\\Programs\\ripgrep\\rg.exe",` inclusive, keeping the `todo-tree.filtering.excludeGlobs` entry that follows.
4. Confirm the file is still valid JSONC:
```bash
node -e "const ts=require('typescript');const r=ts.parseConfigFileTextToJson('.vscode/settings.json',require('fs').readFileSync('.vscode/settings.json','utf8'));if(r.error)throw new Error(JSON.stringify(r.error.messageText));console.log(Object.keys(r.config).length,'keys')" && grep -c -E 'C:\\\\' .vscode/settings.json
```
Expected: a key count with no error; `0` remaining `C:\\` paths.

- [ ] **Step 10: Remove the two broken marketplace-backend scripts**

Run:
```bash
sed -i '/"db:create": "node scripts\/create-database.js",/d; /"db:schema": "node scripts\/apply-schema.js",/d' modules/marketplace/backend/package.json && node -e "const j=require('./modules/marketplace/backend/package.json');console.log(Object.keys(j.scripts).join(' '))"
```
Expected: the script list has no `db:create` or `db:schema` and the JSON parses.

- [ ] **Step 11: Verify nothing built against the removed libraries**

Run (the API build is the real check; allow ~5 minutes):
```bash
npm run type-check -w kartseek-api && npm run type-check -w @kartseek/grocery-backend && npm run build -w kartseek-api 2>&1 | tail -3 && npm run registry:check
```
Expected: both type-checks exit 0; the build ends without `ERROR`; `registry:check` prints its clean summary.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -q -m "chore: remove the four unused API libraries and the tracked leftovers

dto, events, logger and validators were imported by nothing; their
nest-cli, tsconfig and rspack registrations go with them. Also gone: an
orphan duplicate seller screen, the stale .env.local.example template, the
dead .eslintrc.json and .lintstagedrc.js, four unread Postman data files,
the inert ralph/hookify Claude tooling, SELLER_TCP_PORT (read by nothing,
three disagreeing copies), two marketplace-backend scripts pointing at
files that never existed, and the Jest, CMake and machine-specific entries
in .vscode. apps/api/.env.example now asserts DEV_AUTH_BYPASS=false.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 3: Move the catalogue repair scripts, unify the Postman environments, date the audits (spec §5.2)

**Files:**
- Move: `apps/api/seeds/*.js` (8) → `apps/api/scripts/maintenance/marketplace-catalog/`
- Move: `tests/postman/environments/KARTSEEK_{India,Qatar,UAE,UK,USA,Staging,Production,Local}.postman_environment.json` → `{india,qatar,uae,uk,usa,staging,production,local}.postman_environment.json`; delete the old three-key `local.postman_environment.json`
- Move: `docs/audits/final-stabilization-report.md` → `2026-06-09-final-stabilization-report.md`; `full-system-scan-report.md` → `2026-06-09-full-system-scan-report.md`; `marketplace-module-review.md` → `2026-07-25-marketplace-module-review.md`; `frontend-data-audit.md` → `2026-08-30-frontend-data-audit.md`
- Modify: `apps/api/scripts/maintenance/README.md`, `apps/api/README.md:137`, `tests/postman/scripts/run-all.js:54-63`, `tests/postman/collections/payment-service.postman_collection.json` (one token), `tests/postman/README.md`, `tests/README.md:11`, `ARCHITECTURE.md:338`

- [ ] **Step 1: Move the repair scripts and document them**

Run:
```bash
git mv apps/api/seeds apps/api/scripts/maintenance/marketplace-catalog && ls apps/api/scripts/maintenance/marketplace-catalog | wc -l && sed -i '/^├── seeds\/                 # one-off seed data used by scripts\/seed$/d' apps/api/README.md && grep -c 'seeds/' apps/api/README.md
```
Expected: `8` files; `0` remaining mentions. Then, with the Edit tool, append these rows to the table in `apps/api/scripts/maintenance/README.md` (after the `create-order-table.sql` row):
```
| `marketplace-catalog/marketplace-seed.js` | The original marketplace catalogue seed (8 categories, 10 brands, products, listings); superseded by `scripts/seed/seed-marketplace.ts`, kept because the image-repair scripts below assume its IDs. |
| `marketplace-catalog/marketplace-catalog-extra.js` | Added the 12 top-level categories and 13 subcategories the storefront's bundled category grid advertised but the seed never created. |
| `marketplace-catalog/marketplace-seed-variants.js` | Populated `product_variants`, which existed but was empty, so the colour and size pickers had data. |
| `marketplace-catalog/marketplace-update-images.js` | First pass replacing placeholder product images with Unsplash photography. |
| `marketplace-catalog/marketplace-audit-images.js` | Read-only: reports which product image URLs are placeholders and which no longer resolve. |
| `marketplace-catalog/marketplace-fix-images.js` | Repaired rotted URLs, remaining placeholders and single-image products by donating images within a category. |
| `marketplace-catalog/marketplace-revert-crosscategory-images.js` | Undid the donations from `marketplace-fix-images.js` that crossed subcategories. |
| `marketplace-catalog/marketplace-fill-placeholder-images.js` | Replaced the last `placehold.co` tiles with representative photos of each product type. |
```
and replace the closing paragraph
```
Run any of them from `apps/api` with
`npx ts-node -r tsconfig-paths/register scripts/maintenance/<name>.ts`.
New data repairs belong here too, with a row in this table.
```
with
```
Run a TypeScript repair from `apps/api` with
`npx ts-node -r tsconfig-paths/register scripts/maintenance/<name>.ts`; the
plain-JavaScript catalogue scripts run with `node scripts/maintenance/marketplace-catalog/<name>.js`
from `apps/api` (they resolve `pg` from the working directory). All eight
catalogue scripts have already been applied to the development database; run
them again only against a database you intend to reshape. New data repairs
belong here too, with a row in this table.
```

- [ ] **Step 2: Rename the Postman environments and drop the thin local file**

Run:
```bash
cd tests/postman/environments && git rm -q local.postman_environment.json && for pair in India:india Qatar:qatar UAE:uae UK:uk USA:usa Staging:staging Production:production Local:local; do git mv "KARTSEEK_${pair%%:*}.postman_environment.json" "${pair##*:}.postman_environment.json"; done; cd /c/KARTSEEKAPP && ls tests/postman/environments
```
Expected: exactly `india.postman_environment.json local.postman_environment.json production.postman_environment.json qatar.postman_environment.json staging.postman_environment.json uae.postman_environment.json uk.postman_environment.json usa.postman_environment.json`.

- [ ] **Step 3: Point the runners at the new names**

With the Edit tool, replace in `tests/postman/scripts/run-all.js`:
```js
const envMap = {
  local: 'KARTSEEK_Local.postman_environment.json',
  staging: 'KARTSEEK_Staging.postman_environment.json',
  production: 'KARTSEEK_Production.postman_environment.json',
  india: 'KARTSEEK_India.postman_environment.json',
  qatar: 'KARTSEEK_Qatar.postman_environment.json',
  uae: 'KARTSEEK_UAE.postman_environment.json',
  uk: 'KARTSEEK_UK.postman_environment.json',
  usa: 'KARTSEEK_USA.postman_environment.json',
};
```
with
```js
const ENVIRONMENTS = ['local', 'staging', 'production', 'india', 'qatar', 'uae', 'uk', 'usa'];
const envMap = Object.fromEntries(ENVIRONMENTS.map((name) => [name, `${name}.postman_environment.json`]));
```
Then make the payment collection read the shared token variable:
```bash
sed -i 's/{{userToken}}/{{user_token}}/' tests/postman/collections/payment-service.postman_collection.json && grep -c 'userToken' tests/postman/collections/payment-service.postman_collection.json && node -e "const m=require('./tests/postman/scripts/run-all.js');" 2>&1 | head -2
```
Expected: `0`; the `node -e` may print the runner's usage or an environment error but no `SyntaxError`. (`run-payment-tests.sh` already builds `${ENV}.postman_environment.json` with `ENV` defaulting to `local`, so it needs no change.)

- [ ] **Step 4: Update the Postman documentation**

With the Edit tool, in `tests/postman/README.md`:
1. Replace the import step 3 sentence
```
3. Pick **KARTSEEK — Local Development** as the active environment — not to
   be confused with the environment named plainly **KARTSEEK Local**, which
   belongs to `local.postman_environment.json` and the payment runner below.
```
with
```
3. Pick **KARTSEEK — Local Development** (`local.postman_environment.json`)
   as the active environment.
```
2. Replace `KARTSEEK_Local.postman_environment.json` with `local.postman_environment.json` in the single-collection example, and `# KARTSEEK_Local, every collection` with `# local, every collection`.
3. Replace
```
`--env` selects one of the eight `KARTSEEK_*` environments by short name
```
with
```
`--env` selects one of the eight environment files by name
```
4. Replace the paragraph beginning `The payment service has its own collection and its own runner, because it` and ending `targets the environment named `local` rather than `KARTSEEK_Local`:` with
```
The payment service has its own collection and its own runner; both use the
same `local` environment as the numbered suite:
```
5. In the directory tree, replace `├── environments/    9 environment files: 8 KARTSEEK_* (local through usa) + local` with `├── environments/    8 environment files, one per target (local, staging, production, india, qatar, uae, uk, usa)` and delete the line `├── data/            Shared test data — users, products, orders, countries`.
6. In the file table, replace the four environment rows with:
```
| `local.postman_environment.json`                                                                                                        | The local target for every collection and both runners.                             |
| `staging.postman_environment.json`, `production.postman_environment.json`                                                               | Staging and production targets.                                                     |
| `india.postman_environment.json`, `qatar.postman_environment.json`, `uae.postman_environment.json`, `uk.postman_environment.json`, `usa.postman_environment.json` | Per-market variants: country code, currency, tax label.               |
```
7. Delete the line `- `data/` holds synthetic test data only.`

In `tests/README.md`, change `The Postman collections, environments, test data and Newman runners used to` to `The Postman collections, environments and Newman runners used to`.

- [ ] **Step 5: Date the four audits**

Run:
```bash
cd docs/audits && git mv final-stabilization-report.md 2026-06-09-final-stabilization-report.md && git mv full-system-scan-report.md 2026-06-09-full-system-scan-report.md && git mv marketplace-module-review.md 2026-07-25-marketplace-module-review.md && git mv frontend-data-audit.md 2026-08-30-frontend-data-audit.md && cd /c/KARTSEEKAPP && sed -i 's#docs/audits/frontend-data-audit.md#docs/audits/2026-08-30-frontend-data-audit.md#g' ARCHITECTURE.md && npm run docs:check-links 2>&1 | tail -2
```
Expected: the link check reports 0 broken links (it walks every tracked markdown file, so any other reference to the old names fails here; fix each one it lists).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "chore: file the catalogue repair scripts under maintenance, unify the Postman environments, date the audits

The eight one-off marketplace catalogue scripts move from apps/api/seeds
to scripts/maintenance/marketplace-catalog with README rows. The nine
Postman environments become eight kebab-case files with one local target
for both runners; the payment collection now reads user_token like every
other collection. Four undated audits carry the dates stated inside them.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 4: Rename the ten PascalCase components (spec §5.2)

**Files:**
- Move: `apps/web/src/app/admin/grocery/page-builder/components/{GrocerySectionEditor,SectionTypeMenu}.tsx`, `apps/web/src/app/admin/marketplace/page-builder/components/{MarketplaceSectionEditor,MarketplaceSectionTypeMenu}.tsx`, `apps/web/src/app/admin/page-builder/components/{SectionEditorModal,SortableSection}.tsx`, `packages/shared-ui/src/recommendations/{CrossModulePicks,RecommendationCarousel}.tsx`, `packages/shared-ui/src/shared/NotifyMeModal.tsx`, `packages/shared-ui/src/ui-widgets/ProgressBar.tsx` → kebab-case
- Modify: `apps/web/src/app/admin/grocery/page-builder/page.tsx:29-31`, `apps/web/src/app/admin/marketplace/page-builder/page.tsx:27-29`, `apps/web/src/app/admin/page-builder/page.tsx:20-21`, seven `ProgressBar` importers under `apps/web/src`, `modules/taxi/frontend/src/app/drive/dashboard/page.tsx:3`, `modules/marketplace/frontend/src/app/product/[id]/product-enhancements.tsx:33`, `packages/shared-ui/src/recommendations/index.ts:1-2`, `docs/guides/conventions.md:71-81`

- [ ] **Step 1: Move the files**

Run:
```bash
git mv apps/web/src/app/admin/grocery/page-builder/components/GrocerySectionEditor.tsx apps/web/src/app/admin/grocery/page-builder/components/grocery-section-editor.tsx \
&& git mv apps/web/src/app/admin/grocery/page-builder/components/SectionTypeMenu.tsx apps/web/src/app/admin/grocery/page-builder/components/section-type-menu.tsx \
&& git mv apps/web/src/app/admin/marketplace/page-builder/components/MarketplaceSectionEditor.tsx apps/web/src/app/admin/marketplace/page-builder/components/marketplace-section-editor.tsx \
&& git mv apps/web/src/app/admin/marketplace/page-builder/components/MarketplaceSectionTypeMenu.tsx apps/web/src/app/admin/marketplace/page-builder/components/marketplace-section-type-menu.tsx \
&& git mv apps/web/src/app/admin/page-builder/components/SectionEditorModal.tsx apps/web/src/app/admin/page-builder/components/section-editor-modal.tsx \
&& git mv apps/web/src/app/admin/page-builder/components/SortableSection.tsx apps/web/src/app/admin/page-builder/components/sortable-section.tsx \
&& git mv packages/shared-ui/src/recommendations/CrossModulePicks.tsx packages/shared-ui/src/recommendations/cross-module-picks.tsx \
&& git mv packages/shared-ui/src/recommendations/RecommendationCarousel.tsx packages/shared-ui/src/recommendations/recommendation-carousel.tsx \
&& git mv packages/shared-ui/src/shared/NotifyMeModal.tsx packages/shared-ui/src/shared/notify-me-modal.tsx \
&& git mv packages/shared-ui/src/ui-widgets/ProgressBar.tsx packages/shared-ui/src/ui-widgets/progress-bar.tsx \
&& git status --short | grep -c '^R'
```
Expected: `10`. If a `git mv` reports `Permission denied`, stop the Dart analysis server (it also indexes `packages/`) and retry that single move.

- [ ] **Step 2: Rewrite every import**

Run:
```bash
sed -i "s#'./components/SectionTypeMenu'#'./components/section-type-menu'#g; s#'./components/GrocerySectionEditor'#'./components/grocery-section-editor'#" apps/web/src/app/admin/grocery/page-builder/page.tsx \
&& sed -i "s#'./components/MarketplaceSectionTypeMenu'#'./components/marketplace-section-type-menu'#g; s#'./components/MarketplaceSectionEditor'#'./components/marketplace-section-editor'#" apps/web/src/app/admin/marketplace/page-builder/page.tsx \
&& sed -i "s#'./components/SortableSection'#'./components/sortable-section'#; s#'./components/SectionEditorModal'#'./components/section-editor-modal'#" apps/web/src/app/admin/page-builder/page.tsx \
&& sed -i "s#'./RecommendationCarousel'#'./recommendation-carousel'#; s#'./CrossModulePicks'#'./cross-module-picks'#" packages/shared-ui/src/recommendations/index.ts \
&& sed -i "s#'@/components/shared/NotifyMeModal'#'@/components/shared/notify-me-modal'#" "modules/marketplace/frontend/src/app/product/[id]/product-enhancements.tsx" \
&& git grep -l "'@/components/ui/ProgressBar'" -- apps/web/src modules/taxi/frontend/src | xargs sed -i "s#'@/components/ui/ProgressBar'#'@/components/ui/progress-bar'#" \
&& git grep -n -E "(GrocerySectionEditor|SectionTypeMenu|MarketplaceSectionEditor|MarketplaceSectionTypeMenu|SectionEditorModal|SortableSection|CrossModulePicks|RecommendationCarousel|NotifyMeModal|ProgressBar)['\"]" -- apps modules packages | wc -l
```
Expected: `0` remaining path references (symbol names such as `<ProgressBar />` remain; only the quoted paths change).

- [ ] **Step 3: Remove the exception paragraph from the conventions guide**

With the Edit tool, delete from `docs/guides/conventions.md` the paragraph that begins `Ten `.tsx` files still carry a PascalCase file name instead of kebab-case: six` and ends `than a page-builder/shared-ui rename; rename each to kebab-case the next time\nits area is touched, not as a standalone change.`, plus the blank line after it.

- [ ] **Step 4: Verify the three consumers still compile**

Run:
```bash
npx tsc --noEmit -p apps/web/tsconfig.json && npx tsc --noEmit -p modules/taxi/frontend/tsconfig.json && npx tsc --noEmit -p modules/marketplace/frontend/tsconfig.json --types jest,node && echo TSC-OK
```
Expected: `TSC-OK` (marketplace needs the `--types` flag until Task 9 puts it in its tsconfig).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "refactor(web): rename the last ten PascalCase component files to kebab-case

Six page-builder components in apps/web and four in packages/shared-ui
were the recorded exception to convention D3; the exception paragraph
goes with them.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 5: Ignore the generated files, add `next typegen`, prune the branches (spec §5.3, §5.5)

**Files:**
- Modify: `.gitignore`, `apps/web/package.json`, `modules/*/frontend/package.json` (8)
- Untrack: `apps/api/schema.gql`, `apps/web/next-env.d.ts`, `modules/*/frontend/next-env.d.ts` (8)

**Interfaces:**
- Produces: every Next workspace's `type-check` script is `next typegen && tsc --noEmit`; `next-env.d.ts` and `schema.gql` are ignored.

- [ ] **Step 1: Add the ignore rules**

Append to `.gitignore`:
```

# ── Added 2026-09-06, repository hygiene ──────────────────────────────────────
# Regenerated by the API gateway on every development boot (autoSchemaFile).
apps/api/schema.gql

# Written by `next dev`, `next build` and `next typegen`, and different for
# each, so it churned in every commit that touched a Next workspace. Type-check
# scripts run `next typegen` first to recreate it.
**/next-env.d.ts
```

- [ ] **Step 2: Untrack the generated files**

Run:
```bash
git rm -q --cached apps/api/schema.gql apps/web/next-env.d.ts modules/*/frontend/next-env.d.ts && git check-ignore -v apps/api/schema.gql apps/web/next-env.d.ts modules/hotel/frontend/next-env.d.ts | wc -l
```
Expected: `3` (each path now matches an ignore rule). The files stay on disk.

- [ ] **Step 3: Make type-check regenerate next-env.d.ts**

Run:
```bash
sed -i 's/"type-check": "tsc --noEmit"/"type-check": "next typegen \&\& tsc --noEmit"/' apps/web/package.json modules/*/frontend/package.json && grep -h '"type-check"' apps/web/package.json modules/*/frontend/package.json | sort | uniq -c
```
Expected: one line, count `9`: `"type-check": "next typegen && tsc --noEmit",`.

- [ ] **Step 4: Prove it works from a clean state**

Run:
```bash
rm -f modules/doctor/frontend/next-env.d.ts && npm run type-check -w @kartseek/doctor-frontend 2>&1 | tail -3 && ls modules/doctor/frontend/next-env.d.ts && git status --short modules/doctor/frontend | wc -l
```
Expected: type-check exits 0, `next-env.d.ts` is back, and git shows `0` changes under the workspace.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "chore: stop tracking schema.gql and next-env.d.ts; type-check runs next typegen first

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

- [ ] **Step 6: Prune the five absorbed branches**

Run:
```bash
git branch -d chore/nest-12 chore/nest-12-baseline chore/rspack-builder && git branch -D chore/nest-12-upgrade chore/platform-reorg-1b && git branch --list
```
Expected: only `chore/repo-hygiene` (current) and `main` remain. Tips for recovery are in spec §3.2 and in the reflog for 90 days.

---

### Task 6: One ESLint toolchain and a shared Next config (spec §6.1)

**Files:**
- Modify: `package.json` (root devDependencies), `apps/api/package.json`, `apps/web/package.json`, `modules/*/frontend/package.json` (8)
- Create: `apps/web/eslint.base.mjs`, `modules/*/frontend/eslint.config.mjs` (8)
- Modify: `apps/web/eslint.config.mjs`

**Interfaces:**
- Produces: `nextAppConfig({ extraIgnores?: string[] }): FlatConfig[]` exported from `apps/web/eslint.base.mjs`, imported by the shell and every zone; a warning count per Next workspace, recorded for Task 13.

- [ ] **Step 1: Declare the toolchain once, at the root**

Write this script to the scratchpad as `align-eslint-deps.js` (Write tool, not a heredoc) and run it with `node <scratchpad>/align-eslint-deps.js` from the repository root:
```js
const fs = require('fs');
const write = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
const root = JSON.parse(fs.readFileSync('package.json', 'utf8'));
root.devDependencies['@eslint/js'] = '^10.0.1';
root.devDependencies['eslint'] = '^10.9.1';
root.devDependencies['typescript-eslint'] = '^8.69.0';
root.devDependencies = Object.fromEntries(Object.entries(root.devDependencies).sort(([a], [b]) => a.localeCompare(b)));
write('package.json', root);
const zones = ['doctor', 'franchise', 'grocery', 'hotel', 'marketplace', 'pharmacy', 'restaurant', 'taxi'].map((m) => `modules/${m}/frontend/package.json`);
for (const p of ['apps/api/package.json', 'apps/web/package.json', ...zones]) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const k of ['eslint', '@typescript-eslint/eslint-plugin', '@typescript-eslint/parser']) delete j.devDependencies[k];
  write(p, j);
  console.log(p, Object.keys(j.devDependencies).filter((k) => /eslint/.test(k)).join(',') || '(no eslint deps)');
}
```
Expected output: `apps/api/package.json (no eslint deps)`; the nine Next workspaces list only `eslint-config-next`. Note: root `package.json` is rewritten by `JSON.stringify`, which keeps its existing 2-space format; check `git diff package.json` shows only the three added lines (plus reordering within `devDependencies` if it was not already sorted — it was).

- [ ] **Step 2: Install from the root and verify the tree**

Run:
```bash
npm install 2>&1 | tail -3 && npm ls eslint typescript-eslint @eslint/js 2>/dev/null | grep -E '(eslint|typescript-eslint|@eslint/js)@' | grep -v deduped | sort -u && ls -d apps/web/node_modules/eslint apps/api/node_modules/eslint modules/grocery/frontend/node_modules/eslint 2>&1 | grep -c 'No such file'
```
Expected: exactly three lines — `@eslint/js@10.0.1` (or newer 10.x), `eslint@10.9.1` (or newer 10.x), `typescript-eslint@8.69.0` (or newer) — and `3` (no nested copies). If a nested copy survives, run `npm prune` once and re-check. `git status --short` should show only `package.json`, `package-lock.json` and the ten workspace manifests.

- [ ] **Step 3: Write the shared Next config**

Create `apps/web/eslint.base.mjs`:
```js
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

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
  ];
}
```

Replace the whole of `apps/web/eslint.config.mjs` with:
```js
// The rules live in eslint.base.mjs so the eight zones can share them.
import { nextAppConfig } from './eslint.base.mjs';

export default nextAppConfig();
```

Create `modules/<vertical>/frontend/eslint.config.mjs` in all eight zones (`doctor`, `franchise`, `grocery`, `hotel`, `marketplace`, `pharmacy`, `restaurant`, `taxi`) with identical content:
```js
// Delegates to the shell's shared config so a rule added there reaches this
// zone without anyone remembering to copy it here.
import { nextAppConfig } from '../../../apps/web/eslint.base.mjs';

export default nextAppConfig();
```

- [ ] **Step 4: Give every zone a lint:fix script**

Run:
```bash
node -e "const fs=require('fs');for(const m of ['doctor','franchise','grocery','hotel','marketplace','pharmacy','restaurant','taxi']){const p='modules/'+m+'/frontend/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const s={};for(const [k,v] of Object.entries(j.scripts)){s[k]=v;if(k==='lint')s['lint:fix']='eslint . --fix';}j.scripts=s;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}" && grep -c '"lint:fix"' modules/*/frontend/package.json
```
Expected: `1` for each of the eight files.

- [ ] **Step 5: Lint all eighteen workspaces and record the numbers**

Run the shell first:
```bash
npm run lint -w kartseek-web 2>&1 | tail -4
```
Expected: no crash; a summary line like `✖ N problems (0 errors, N warnings)` or no output. If it still reports `scopeManager.addGlobals is not a function`, `npm ls typescript-eslint` must show a single 8.69+ entry — fix the install before continuing.

Then each zone and every backend:
```bash
for w in doctor franchise grocery hotel marketplace pharmacy restaurant taxi; do echo "## $w-frontend"; npm run lint -w @kartseek/$w-frontend 2>&1 | grep -E 'problems|error' | tail -2; done; for w in doctor franchise grocery hotel marketplace pharmacy restaurant taxi; do echo "## $w-backend"; npm run lint -w @kartseek/$w-backend 2>&1 | grep -E 'problems' | tail -1; done; echo "## api"; npm run lint -w kartseek-api 2>&1 | grep -E 'problems' | tail -1
```
For every workspace that reports errors (not warnings): read each finding and fix it in code. If a single zone reports more than 50 errors, stop and report the rule breakdown (`npx eslint . --format json` piped through a count by `ruleId`) before fixing, so the reviewer can see whether one rule dominates. The API and marketplace-backend counts (35 and 6) are fixed in Tasks 11–12, not here; every other backend must report nothing.

Record the final `(0 errors, N warnings)` count for each of the nine Next workspaces in the plan's progress notes; Task 13 puts them in `docs/guides/testing.md`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "build: one ESLint 10 and one typescript-eslint for every workspace; shared Next flat config

eslint, typescript-eslint and @eslint/js are declared once at the root and
the nested copies are gone, so the web shell stops loading an older
typescript-eslint under a newer ESLint (its scopeManager crash). The eight
zones get their first eslint.config.mjs, a one-line import of
apps/web/eslint.base.mjs, the same shape the backends use with
apps/api/eslint.base.js. React Compiler hook rules are warnings.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 7: Grocery URL helper (spec §7.1)

**Files:**
- Modify: `modules/grocery/frontend/src/lib/grocery/urls.ts:89-91,139-141`
- Test: `modules/grocery/frontend/src/__tests__/grocery-urls.spec.ts` (exists; two cases fail today)

- [ ] **Step 1: Run the failing spec**

Run:
```bash
cd modules/grocery/frontend && npx jest src/__tests__/grocery-urls.spec.ts 2>&1 | grep -E '✕|Tests:'; cd /c/KARTSEEKAPP
```
Expected: `Tests: 2 failed, 15 passed, 17 total`; the failures are `does not invent a path for a product with no id` (received `/grocery`, expected `/`) and `recognises the canonical segment`.

- [ ] **Step 2: Make every path basePath-relative**

With the Edit tool, in `modules/grocery/frontend/src/lib/grocery/urls.ts` replace
```ts
  if (!product) return '/grocery';
  if (typeof product === 'string') return `/grocery/product/${product}`;
```
with
```ts
  if (!product) return '/';
  if (typeof product === 'string') return `/product/${product}`;
```
and replace
```ts
  return storePath(store) === `/grocery/store/${String(param ?? '').trim()}`;
```
with
```ts
  return storePath(store) === `/store/${String(param ?? '').trim()}`;
```
Then read the doc comment above `productPath` and `storePath`; if it still describes `/grocery/...` results, rewrite it to say that every path is relative to the zone's `basePath` (`/grocery`), which `next/link` prepends — a helper that included the prefix would double it (see `docs/architecture/frontend-zones.md`).

- [ ] **Step 3: Confirm no caller used the string form or the old prefix**

Run:
```bash
git grep -n -E "(productPath|storePath)\(['\`\"]" -- modules/grocery/frontend/src | wc -l && git grep -n "'/grocery/" -- modules/grocery/frontend/src/lib | wc -l
```
Expected: `0` and `0`.

- [ ] **Step 4: Run the spec again**

Run:
```bash
cd modules/grocery/frontend && npx jest 2>&1 | grep -E 'Tests:|Test Suites:'; cd /c/KARTSEEKAPP
```
Expected: `Tests: 65 passed, 65 total`, `Test Suites: 4 passed, 4 total`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "fix(grocery): build zone links without the basePath prefix in every branch

productPath(null) returned /grocery and the string form /grocery/product/…
while the object form returned /product/…, and isCanonicalStoreParam
compared against /grocery/store/… although storePath builds /store/…;
next/link prepends the basePath, so the prefixed forms doubled it. The two
failing grocery-urls specs pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 8: Jest preset and per-workspace registry spec (spec §6.2)

**Files:**
- Create: `apps/web/jest.base.cjs`, `apps/web/test/zone-config.cjs`, `apps/web/test/zone-config.d.cts`
- Create: `apps/web/jest.config.cjs`, `modules/*/frontend/jest.config.cjs` (8)
- Create: `apps/web/src/__tests__/registry-entry.spec.ts`, `modules/*/frontend/src/__tests__/registry-entry.spec.ts` (8)
- Delete: `apps/web/jest.config.ts`, `modules/grocery/frontend/jest.config.ts`, `modules/marketplace/frontend/jest.config.ts`
- Modify: `turbo.json` (`globalDependencies`)

**Interfaces:**
- Produces: `createNextJestConfig(dir: string)` exported from `apps/web/jest.base.cjs`; `expectRegistryEntry(workspaceDir: string): void` exported from `apps/web/test/zone-config.cjs` (declared in `zone-config.d.cts`), which registers a `describe` block with three `it` cases.
- Consumes: `services.yaml` entries of kind `web-shell` / `web-zone` with `path`, `ports.http` and (zones) `basePath`; the root `yaml` dependency.

- [ ] **Step 1: Write the preset**

Create `apps/web/jest.base.cjs`:
```js
const path = require('node:path');
const nextJest = require('next/jest.js');
const ts = require('typescript');
const { pathsToModuleNameMapper } = require('ts-jest');

/**
 * Jest configuration shared by the web shell and the eight zones.
 *
 * Each workspace's jest.config.cjs is one statement calling
 * createNextJestConfig(__dirname). The module mapper is derived from that
 * workspace's own tsconfig `paths`, so the aliases Jest resolves are the
 * aliases TypeScript and Next resolve — grocery used to carry 55 hand-written
 * mapper lines mirroring its tsconfig, and every edit had to be made twice.
 *
 * Ordering matters: TypeScript picks the longest matching path pattern, Jest
 * picks the first mapper entry that matches. The mapper is therefore sorted
 * most-specific first (exact patterns, then wildcard patterns by descending
 * literal prefix), so `@/lib/api/x` reaches `@/lib/api/*` before the
 * catch-all `@/*` can send it into the workspace's own src.
 */
function readPaths(dir) {
  const file = path.join(dir, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(file, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  return (config.compilerOptions && config.compilerOptions.paths) || {};
}

function literalPrefixLength(pattern) {
  return pattern.replace(/^\^/, '').replace(/\(\.\*\)\$?$/, '').replace(/\$$/, '').length;
}

function orderMostSpecificFirst(mapper) {
  return Object.fromEntries(
    Object.entries(mapper).sort(([a], [b]) => {
      const aWild = a.includes('(.*)');
      const bWild = b.includes('(.*)');
      if (aWild !== bWild) return aWild ? 1 : -1;
      return literalPrefixLength(b) - literalPrefixLength(a);
    }),
  );
}

/**
 * @param {string} dir  the workspace directory (pass __dirname)
 */
function createNextJestConfig(dir) {
  const createJestConfig = nextJest({ dir });
  const mapper = pathsToModuleNameMapper(readPaths(dir), { prefix: '<rootDir>/' });
  return createJestConfig({
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
    moduleNameMapper: orderMostSpecificFirst(mapper),
    transform: {
      '^.+\\.tsx?$': ['ts-jest', { tsconfig: path.join(dir, 'tsconfig.json') }],
    },
    transformIgnorePatterns: ['/node_modules/(?!(@/|next/))/'],
  });
}

module.exports = { createNextJestConfig };
```

- [ ] **Step 2: Replace the three hand-written configs and add the six missing ones**

Run:
```bash
git rm -q apps/web/jest.config.ts modules/grocery/frontend/jest.config.ts modules/marketplace/frontend/jest.config.ts \
&& printf "module.exports = require('./jest.base.cjs').createNextJestConfig(__dirname);\n" > apps/web/jest.config.cjs \
&& for m in doctor franchise grocery hotel marketplace pharmacy restaurant taxi; do printf "module.exports = require('../../../apps/web/jest.base.cjs').createNextJestConfig(__dirname);\n" > modules/$m/frontend/jest.config.cjs; done \
&& ls apps/web/jest.config.cjs modules/*/frontend/jest.config.cjs | wc -l
```
Expected: `9`.

- [ ] **Step 3: Check the derived mapper against grocery's suite**

Run:
```bash
cd modules/grocery/frontend && npx jest 2>&1 | grep -E 'Tests:|Test Suites:|Cannot find module'; cd /c/KARTSEEKAPP
```
Expected: `Tests: 65 passed, 65 total`, no `Cannot find module`. If a module fails to resolve, add a temporary `console.log(JSON.stringify(orderMostSpecificFirst(mapper), null, 2))` inside `createNextJestConfig` in the preset, re-run, read which pattern captured the import first, fix `orderMostSpecificFirst`, and remove the log. (`next/jest` returns an async factory, so the config cannot simply be required and printed.)

- [ ] **Step 4: Write the registry assertion helper**

Create `apps/web/test/zone-config.cjs`:
```js
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('yaml');

function findRepoRoot(from) {
  let dir = from;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'services.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`services.yaml not found above ${from}`);
    dir = parent;
  }
}

/**
 * Asserts that a Next workspace agrees with its own entry in services.yaml.
 *
 * Every zone and the shell call this from src/__tests__/registry-entry.spec.ts
 * with their workspace directory. It is the frontend counterpart of the
 * registry validator's main.ts checks for the backends: the registry is the
 * only source of ports and basePaths, and this is where a zone that drifted
 * (a port changed in package.json, a basePath changed in next.config.mjs)
 * fails a unit run instead of a deploy.
 *
 * next.config.mjs is read as text, not imported: it is ESM wrapped by the
 * next-intl plugin, which Jest's CommonJS runtime cannot load without VM
 * modules. A literal `basePath: '<value>',` line is the convention every zone
 * follows (docs/architecture/frontend-zones.md).
 *
 * @param {string} workspaceDir  absolute path of the workspace (apps/web or modules/<vertical>/frontend)
 */
function expectRegistryEntry(workspaceDir) {
  const root = findRepoRoot(workspaceDir);
  const registry = parse(fs.readFileSync(path.join(root, 'services.yaml'), 'utf8'));
  const relPath = path.relative(root, workspaceDir).split(path.sep).join('/');
  const entry = registry.services.find((service) => service.path === relPath);
  const pkg = JSON.parse(fs.readFileSync(path.join(workspaceDir, 'package.json'), 'utf8'));
  const nextConfig = fs.readFileSync(path.join(workspaceDir, 'next.config.mjs'), 'utf8');

  describe(`${relPath} agrees with services.yaml`, () => {
    it('is registered as a web-shell or a web-zone', () => {
      expect(entry).toBeDefined();
      expect(['web-shell', 'web-zone']).toContain(entry.kind);
    });

    it('binds the registered HTTP port in dev and start', () => {
      const flag = new RegExp(`(^| )-p ${entry.ports.http}( |$)`);
      expect(pkg.scripts.dev).toMatch(flag);
      expect(pkg.scripts.start).toMatch(flag);
    });

    it('declares the registered basePath', () => {
      const declared = /^\s*basePath:\s*'([^']*)'/m.exec(nextConfig);
      if (entry.kind === 'web-zone') {
        expect(declared && declared[1]).toBe(entry.basePath);
      } else {
        expect(declared).toBeNull();
      }
    });
  });
}

module.exports = { expectRegistryEntry };
```

Create `apps/web/test/zone-config.d.cts`:
```ts
/** Registers a describe block asserting the workspace matches its services.yaml entry. */
export function expectRegistryEntry(workspaceDir: string): void;
```

- [ ] **Step 5: Add the spec to every Next workspace**

Create `apps/web/src/__tests__/registry-entry.spec.ts`:
```ts
import * as path from 'node:path';
import { expectRegistryEntry } from '../../test/zone-config.cjs';

expectRegistryEntry(path.resolve(__dirname, '..', '..'));
```

Create `modules/<vertical>/frontend/src/__tests__/registry-entry.spec.ts` in all eight zones with identical content:
```ts
import * as path from 'node:path';
import { expectRegistryEntry } from '../../../../../apps/web/test/zone-config.cjs';

expectRegistryEntry(path.resolve(__dirname, '..', '..'));
```
(For a zone, `__dirname` is `modules/<vertical>/frontend/src/__tests__`; two levels up is the workspace, five levels up is the repository root, hence the import path.)

- [ ] **Step 6: Let Turbo see the registry as a test input**

With the Edit tool, in `turbo.json` insert after the line `"concurrency": "20",`:
```json
  "globalDependencies": ["services.yaml"],
```

- [ ] **Step 7: Run every Next workspace's tests**

Run:
```bash
for w in kartseek-web @kartseek/doctor-frontend @kartseek/franchise-frontend @kartseek/grocery-frontend @kartseek/hotel-frontend @kartseek/marketplace-frontend @kartseek/pharmacy-frontend @kartseek/restaurant-frontend @kartseek/taxi-frontend; do echo "## $w"; npm test -w $w 2>&1 | grep -E 'Tests:|Suites:|FAIL'; done
```
Expected: every workspace prints `Test Suites: N passed`; the six zones that had no tests print `Tests: 3 passed, 3 total`; grocery `68 passed`, marketplace and the shell three more than before. To see the spec catch drift, temporarily change `3006` to `3016` in `modules/doctor/frontend/package.json`'s `dev` script, run `npm test -w @kartseek/doctor-frontend` (expected: 1 failed, "binds the registered HTTP port"), then revert the change.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -q -m "test(web): one Jest preset for the nine Next apps and a registry spec in each

apps/web/jest.base.cjs derives moduleNameMapper from each workspace's
tsconfig paths (ordered most-specific first, since Jest takes the first
match where TypeScript takes the longest), replacing three hand-written
configs and giving the six zones that had none a runner. Every Next
workspace now asserts its port and basePath against services.yaml, so no
zone's test task fails on 'no tests found' and a drifted port fails a unit
run instead of a deploy.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 9: Type-check with the tests included (spec §6.3)

**Files:**
- Modify: `apps/web/tsconfig.json` (`exclude`, `compilerOptions.types`), `modules/*/frontend/tsconfig.json` (8, `compilerOptions.types`)

- [ ] **Step 1: Declare jest and node types in all nine Next tsconfigs and stop excluding the shell's tests**

Write this script to the scratchpad as `types-jest-node.js` and run it from the repository root:
```js
const fs = require('fs');
const files = ['apps/web/tsconfig.json', ...['doctor', 'franchise', 'grocery', 'hotel', 'marketplace', 'pharmacy', 'restaurant', 'taxi'].map((m) => `modules/${m}/frontend/tsconfig.json`)];
for (const p of files) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.compilerOptions.types = ['jest', 'node'];
  if (Array.isArray(j.exclude)) j.exclude = j.exclude.filter((e) => e !== 'src/__tests__');
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  console.log(p, JSON.stringify(j.compilerOptions.types), JSON.stringify(j.exclude));
}
```
Expected: nine lines, each `["jest","node"]`, and `apps/web/tsconfig.json`'s exclude is `["node_modules"]`. Check `git diff --stat` touches only those nine files with small line counts (they are plain JSON; the rewrite keeps 2-space indentation).

- [ ] **Step 2: Type-check all nine**

Run:
```bash
for w in kartseek-web @kartseek/doctor-frontend @kartseek/franchise-frontend @kartseek/grocery-frontend @kartseek/hotel-frontend @kartseek/marketplace-frontend @kartseek/pharmacy-frontend @kartseek/restaurant-frontend @kartseek/taxi-frontend; do printf '%s: ' $w; npm run type-check -w $w >/dev/null 2>&1 && echo ok || echo FAIL; done
```
Expected: nine `ok`. (Measured before implementation: with these settings the shell and marketplace both type-check clean with their tests included.) Any `FAIL` is fixed in the reported file, not by re-excluding tests.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -q -m "build(web): type-check the Next apps with their tests included

TypeScript was not pulling @types/jest into these programs on its own;
grocery only saw it through a stray reference directive in one spec, and
marketplace's two specs failed with bare describe/it/expect. All nine
tsconfigs now declare jest and node types, and the shell no longer
excludes src/__tests__ from tsc.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 10: Hooks, lint-staged, Prettier ignore, clean scripts, root ESLint config (spec §6.4, §6.5)

**Files:**
- Modify: `package.json` (scripts `prepare`, `clean`, `format`, `format:check`; `lint-staged`; devDependencies `rimraf`, `globals`)
- Create: `.husky/pre-commit`, `.husky/commit-msg`, `.prettierignore`, `eslint.config.mjs` (root)
- Modify: `apps/web/package.json`, `modules/*/frontend/package.json` (8), `modules/*/backend/package.json` (8) — `clean` scripts

**Interfaces:**
- Produces: `npm run clean` removes every build output and the Turbo cache on any OS; a commit with a non-conventional message or an ESLint error in a staged file is rejected.

- [ ] **Step 1: Root package.json**

Write this script to the scratchpad as `root-hooks.js` and run it from the repository root:
```js
const fs = require('fs');
const p = 'package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.scripts.prepare = 'husky';
j.scripts.clean = 'turbo run clean && rimraf .turbo/cache tests/smoke/logs';
j.scripts.format = 'prettier --write "**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml}" --ignore-path .gitignore --ignore-path .prettierignore';
j.scripts['format:check'] = 'prettier --check "**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml}" --ignore-path .gitignore --ignore-path .prettierignore';
j.devDependencies.globals = '^17.12.0';
j.devDependencies.rimraf = '^6.1.3';
j.devDependencies = Object.fromEntries(Object.entries(j.devDependencies).sort(([a], [b]) => a.localeCompare(b)));
j['lint-staged'] = {
  '*.{ts,tsx,js,jsx,mjs,cjs}': ['prettier --write', 'eslint --fix --no-warn-ignored'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log(j.scripts.prepare, '|', j.scripts.clean);
```
Expected: `husky | turbo run clean && rimraf .turbo/cache tests/smoke/logs`.

- [ ] **Step 2: Workspace clean scripts**

Write this script to the scratchpad as `clean-scripts.js` and run it:
```js
const fs = require('fs');
const verticals = ['doctor', 'franchise', 'grocery', 'hotel', 'marketplace', 'pharmacy', 'restaurant', 'taxi'];
const set = (p, value) => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const scripts = {};
  for (const [k, v] of Object.entries(j.scripts)) {
    if (k === 'clean') continue;
    scripts[k] = v;
  }
  scripts.clean = value;
  j.scripts = scripts;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  console.log(p, '->', value);
};
set('apps/web/package.json', 'rimraf .next out tsconfig.tsbuildinfo');
for (const m of verticals) set(`modules/${m}/frontend/package.json`, 'rimraf .next out tsconfig.tsbuildinfo');
for (const m of verticals) set(`modules/${m}/backend/package.json`, 'rimraf dist');
```
Expected: 17 lines. (`apps/api` already has `"clean": "rimraf dist"`.)

- [ ] **Step 3: Hook files and the Prettier ignore list**

Create `.husky/pre-commit`:
```
npx lint-staged
node scripts/registry/validate.mjs
```
Create `.husky/commit-msg`:
```
npx --no -- commitlint --edit "$1"
```
Create `.prettierignore`:
```
# Generated, vendored, or too large to format on every commit. Kept in step
# with the `format` scripts in package.json, which pass both this file and
# .gitignore as ignore paths.
node_modules
dist
.next
.turbo
coverage
package-lock.json
**/next-env.d.ts
apps/api/schema.gql
tests/postman/collections
tests/postman/environments
**/*.g.dart
```

- [ ] **Step 4: Install (this also installs the hooks) and verify**

Run:
```bash
npm install 2>&1 | tail -2 && git config core.hooksPath && ls .husky/_ | head -3 && ls node_modules/.bin/rimraf && node -p "require('globals/package.json').version"
```
Expected: `core.hooksPath` is `.husky/_`; the `_` directory exists with husky's shims; `rimraf` is on the path; a `17.x` globals version.

- [ ] **Step 5: A root ESLint config for the repository's own scripts**

Create `eslint.config.mjs` at the repository root:
```js
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
```
Run:
```bash
npx eslint scripts tests eslint.config.mjs 2>&1 | tail -5
```
Expected: no errors. Fix any it reports in `scripts/**` or `tests/**` (these are small utility files; `no-unused-vars` and `no-empty` are the likely ones). Do not add rule overrides.

- [ ] **Step 6: Prove the hooks reject what they should and accept what they should**

Preconditions: `git status --short` is empty except for this task's changes, which you commit first (Step 7) — run this step after Step 7. Then:
```bash
printf 'export const answer  =  42\nundefinedFunction()\n' > hook-probe.mjs && git add hook-probe.mjs && git commit -q -m "bad message" ; echo "exit=$?"
```
Expected: non-zero exit; lint-staged fails on `no-undef` (`undefinedFunction`) before commitlint even runs, and `hook-probe.mjs` stays staged. Then:
```bash
printf 'export const answer  =  42\n' > hook-probe.mjs && git add hook-probe.mjs && git commit -q -m "bad message" ; echo "exit=$?"
```
Expected: lint-staged passes (and reformats the file), commitlint rejects `bad message` (`subject may not be empty`, `type may not be empty`), non-zero exit. Then:
```bash
git commit -q -m "chore: hook probe" ; echo "exit=$?" && git show --stat --oneline HEAD | head -3 && git reset -q --hard HEAD~1 && git status --short | wc -l && ls hook-probe.mjs 2>&1 | grep -c 'No such'
```
Expected: `exit=0`, the probe commit shows `hook-probe.mjs` with Prettier's spacing (`export const answer = 42;`), the reset removes it, `0` dirty files, `1` (the file is gone).

- [ ] **Step 7: Commit (before Step 6)**

```bash
git add -A && git commit -q -m "build: install the git hooks for real; one clean command; Prettier ignore list

prepare now runs husky 9, .husky/pre-commit runs lint-staged and the
registry check, .husky/commit-msg runs commitlint — three tools that were
declared and never executed. lint-staged lives in package.json only.
rimraf replaces rm -rf in every clean script (npm runs them under cmd.exe
on Windows), the root clean no longer deletes node_modules, and a root
eslint.config.mjs covers the repository's own scripts.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```
Then run Step 6.

---

### Task 11: Invoice tax lines from the region registry (spec §7.2)

**Files:**
- Create: `apps/api/apps/payment-service/src/services/tax-breakdown.ts`
- Test: `apps/api/apps/payment-service/src/services/tax-breakdown.spec.ts`
- Modify: `apps/api/apps/payment-service/src/services/invoice.service.ts:1-8,56-59,232-266`

**Interfaces:**
- Produces: `calculateTaxBreakdown(commissionAmount: number, countryCode: string): TaxLine[]` and `interface TaxLine { taxType: string; rate: number; amount: number }`.
- Consumes: `getRegionConfig(code: string): RegionConfig | undefined` from `@app/region`, whose `tax` is `{ name: string; rate: number; isInclusive: boolean }` with `rate` in percent (18 for India, 0 for Qatar and Kuwait, 8.875 for the US).

- [ ] **Step 1: Write the failing spec**

Create `apps/api/apps/payment-service/src/services/tax-breakdown.spec.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { calculateTaxBreakdown } from './tax-breakdown';

describe('calculateTaxBreakdown', () => {
  it('splits India GST into equal CGST and SGST halves of the registered 18 %', () => {
    expect(calculateTaxBreakdown(1000, 'IN')).toEqual([
      { taxType: 'CGST', rate: 0.09, amount: 90 },
      { taxType: 'SGST', rate: 0.09, amount: 90 },
    ]);
  });

  it("uses each market's registered rate and label", () => {
    expect(calculateTaxBreakdown(1000, 'GB')).toEqual([{ taxType: 'VAT', rate: 0.2, amount: 200 }]);
    expect(calculateTaxBreakdown(1000, 'SA')).toEqual([{ taxType: 'VAT', rate: 0.15, amount: 150 }]);
    expect(calculateTaxBreakdown(1000, 'BH')).toEqual([{ taxType: 'VAT', rate: 0.1, amount: 100 }]);
    expect(calculateTaxBreakdown(1000, 'AE')).toEqual([{ taxType: 'VAT', rate: 0.05, amount: 50 }]);
    expect(calculateTaxBreakdown(1000, 'SG')).toEqual([{ taxType: 'GST', rate: 0.09, amount: 90 }]);
    expect(calculateTaxBreakdown(1000, 'US')).toEqual([{ taxType: 'Sales Tax', rate: 0.08875, amount: 88.75 }]);
  });

  it('returns no lines where the market levies no tax', () => {
    expect(calculateTaxBreakdown(1000, 'QA')).toEqual([]);
    expect(calculateTaxBreakdown(1000, 'KW')).toEqual([]);
  });

  it('returns no lines for a code the platform does not operate in', () => {
    expect(calculateTaxBreakdown(1000, 'KE')).toEqual([]);
    // The ISO code for the United Kingdom is GB; 'UK' never arrives from RegionService.
    expect(calculateTaxBreakdown(1000, 'UK')).toEqual([]);
    expect(calculateTaxBreakdown(1000, '')).toEqual([]);
  });

  it('rounds each line to the cent', () => {
    expect(calculateTaxBreakdown(1234.56, 'AE')).toEqual([{ taxType: 'VAT', rate: 0.05, amount: 61.73 }]);
    expect(calculateTaxBreakdown(1234.56, 'IN')).toEqual([
      { taxType: 'CGST', rate: 0.09, amount: 111.11 },
      { taxType: 'SGST', rate: 0.09, amount: 111.11 },
    ]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run:
```bash
cd apps/api && npx vitest run apps/payment-service/src/services/tax-breakdown.spec.ts 2>&1 | tail -5; cd /c/KARTSEEKAPP
```
Expected: failure to resolve `./tax-breakdown`.

- [ ] **Step 3: Write the helper**

Create `apps/api/apps/payment-service/src/services/tax-breakdown.ts`:
```ts
import { getRegionConfig } from '@app/region';

export interface TaxLine {
  taxType: string;
  rate: number;
  amount: number;
}

const toCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Tax lines for the platform commission on one payment.
 *
 * Rates and labels come from the region registry (`REGION_CONFIGS[code].tax`
 * in `@app/region`), which exists so that a market's tax rule lives in one
 * place. The private table this replaced had drifted from it: it keyed on
 * 'UK' although `payment.countryCode` is the ISO code 'GB', carried a dead
 * duplicate `case 'IN'`, put Saudi Arabia at 5 % against the registered 15 %,
 * and knew nothing of Bahrain, Kuwait, Oman or the US.
 *
 * India's GST is invoiced as two equal halves, CGST and SGST; every other
 * market gets one line under the registry's label. A zero rate (Qatar,
 * Kuwait) or an unknown code yields no lines.
 *
 * The tax is added on top of the commission for every market, as it always
 * was here. The registry's `isInclusive` flag describes how consumer prices
 * are displayed and is deliberately not applied to commission invoices.
 */
export function calculateTaxBreakdown(commissionAmount: number, countryCode: string): TaxLine[] {
  const tax = getRegionConfig(countryCode)?.tax;
  if (!tax || tax.rate <= 0) return [];
  const rate = tax.rate / 100;

  if (countryCode === 'IN') {
    const half = rate / 2;
    const amount = toCents(commissionAmount * half);
    return [
      { taxType: 'CGST', rate: half, amount },
      { taxType: 'SGST', rate: half, amount },
    ];
  }

  return [{ taxType: tax.name, rate, amount: toCents(commissionAmount * rate) }];
}
```

- [ ] **Step 4: Run the spec**

Run:
```bash
cd apps/api && npx vitest run apps/payment-service/src/services/tax-breakdown.spec.ts 2>&1 | tail -4; cd /c/KARTSEEKAPP
```
Expected: `Tests  5 passed (5)`. If the India rounding case fails by one cent, the registry's 18 % halves to `0.09` exactly in IEEE arithmetic (`18 / 100 / 2`); check the spec value before touching the helper.

- [ ] **Step 5: Use it from the service and delete the private table**

With the Edit tool, in `apps/api/apps/payment-service/src/services/invoice.service.ts`:
1. After the line `import { Payment, PaymentModule } from '../entities/payment.entity';` add
```ts
import { calculateTaxBreakdown } from './tax-breakdown';
```
2. Replace
```ts
    const taxBreakdown = this.calculateTaxBreakdown(
      Number(payment.platformCommission),
      payment.countryCode,
    );
```
with
```ts
    const taxBreakdown = calculateTaxBreakdown(Number(payment.platformCommission), payment.countryCode);
```
3. Delete the whole `private calculateTaxBreakdown(...)` method (from `  private calculateTaxBreakdown(commissionAmount: number, countryCode: string): Array<{ taxType: string; rate: number; amount: number }> {` through its closing `  }`, lines 232–266 at plan time), and the blank line before it if two remain.

Run:
```bash
grep -n "calculateTaxBreakdown" apps/api/apps/payment-service/src/services/invoice.service.ts && cd apps/api && npx eslint apps/payment-service/src/services/invoice.service.ts apps/payment-service/src/services/tax-breakdown.ts && npx tsc --noEmit -p tsconfig.json && npx vitest run apps/payment-service 2>&1 | tail -3; cd /c/KARTSEEKAPP
```
Expected: two matches (the import and the call); ESLint prints nothing; `tsc` exits 0; the payment-service suites pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "fix(payment): derive invoice tax lines from the region registry

The invoice service kept its own tax table, and it had drifted: it keyed
on 'UK' although payment.countryCode is the ISO code 'GB' (UK invoices got
no tax lines), carried a second unreachable case 'IN' labelled as a 16 %
Kenyan VAT, put Saudi Arabia at 5 % against the registered 15 %, and
omitted Bahrain, Kuwait, Oman and the US. calculateTaxBreakdown now reads
REGION_CONFIGS[code].tax, keeps the CGST/SGST split for India and today's
add-on arithmetic, and has a spec.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 12: The remaining API lint findings and the marketplace-backend spec (spec §7.3–7.8, §7.10)

**Files:**
- Modify: `apps/api/apps/api-gateway/src/controllers/geo-security.controller.ts` (nine `catch {}` at lines 220, 238, 256, 273, 289, 344, 450, 467, 485; the log at 379; imports and constructor area at 1–68)
- Modify: `apps/api/apps/api-gateway/src/controllers/taxi.controller.ts` (two `catch (err) {}` at 168 and 488; imports; class head at 24)
- Modify: `apps/api/libs/storage/src/storage.service.ts:91,121,141,165,182,211`
- Modify: `apps/api/libs/security/src/api-key.guard.ts:63`, `apps/api/libs/security/src/input-sanitizer.middleware.ts:74`, `apps/api/libs/grpc/src/grpc.interfaces.ts:11`, `apps/api/apps/search-service/src/search.service.ts:287,310-312`
- Modify: `apps/api/apps/admin-service/src/admin.service.ts:33`, `apps/api/apps/api-gateway/src/controllers/admin-layout.controller.ts:23`, `apps/api/apps/api-gateway/src/controllers/static-pages.controller.ts:63,108`
- Modify: `modules/marketplace/backend/src/__tests__/verification.spec.ts`

- [ ] **Step 1: Empty catches become logged fallbacks**

In `geo-security.controller.ts`: add `Logger` to the `@nestjs/common` import on line 1, and inside the class (before the constructor) add
```ts
  private readonly logger = new Logger(GeoSecurityController.name);
```
Then, for each of the nine `} catch {}`, read the `try` block above it and the code that follows, and replace it with a catch that names both, in this shape:
```ts
      } catch (err) {
        this.logger.warn(`Loading geo-security events from the database failed; serving the recent events kept in Redis: ${String(err)}`);
      }
```
The message must state (a) what the try block attempted and (b) which fallback the code takes next. Nine sites, nine messages; do not reuse one message. Replace line 379's `console.log(...)` (the string with the irregular character) with:
```ts
      this.logger.warn(`IP lookup for ${ip} failed; using the Cloudflare geolocation headers if present: ${String(e)}`);
```

In `taxi.controller.ts`: add `Logger` to the `@nestjs/common` import, add `private readonly logger = new Logger(TaxiController.name);` before the constructor, and replace the two `} catch (err) {}` / `} catch (e) {}` the same way — line 168 (surge lookup; the fallback is the default multiplier already in `surgeMultiplier`) and line 488 (cancellation-rule lookup; the fallback is a zero cancellation fee).

- [ ] **Step 2: Typed optional imports in the storage service**

In `apps/api/libs/storage/src/storage.service.ts`, delete the four `// @ts-ignore — optional runtime dependency` lines that precede an `await import('@aws-sdk/client-s3')` (the package is installed; the directive hid nothing). For the two that precede `await import('@google-cloud/storage')`, replace the directive with
```ts
      // @ts-expect-error -- @google-cloud/storage is an optional dependency, installed only where GCS is the configured provider
```
Then:
```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep storage.service; cd /c/KARTSEEKAPP
```
Expected: no output. If `tsc` reports `Unused '@ts-expect-error' directive` on a GCS line, the package has since been installed: delete that directive too.

- [ ] **Step 3: The one-line findings**

Run:
```bash
cd apps/api \
&& sed -i "63s/.*/    const secret = process.env.INTERNAL_API_KEY ?? 'fallback';/" libs/security/src/api-key.guard.ts \
&& sed -i '64d' libs/security/src/api-key.guard.ts \
&& sed -i "s#private readonly PATH_TRAVERSAL: RegExp = /\\\\.\\\\.\\[\\\\/\\\\\\\\]/;#private readonly PATH_TRAVERSAL: RegExp = /\\\\.\\\\.[/\\\\\\\\]/;#" libs/security/src/input-sanitizer.middleware.ts \
&& sed -i 's/^export interface EmptyRequest    {}$/export type EmptyRequest = Record<string, never>;/' libs/grpc/src/grpc.interfaces.ts \
&& sed -i '33s/let layout/const layout/' apps/admin-service/src/admin.service.ts \
&& sed -i '23s/let layout/const layout/' apps/api-gateway/src/controllers/admin-layout.controller.ts \
&& sed -i '63s/let page/const page/; 108s/let page/const page/' apps/api-gateway/src/controllers/static-pages.controller.ts \
&& sed -n '60,66p' libs/security/src/api-key.guard.ts && grep -n 'PATH_TRAVERSAL: RegExp' libs/security/src/input-sanitizer.middleware.ts && grep -n 'EmptyRequest' libs/grpc/src/grpc.interfaces.ts | head -1; cd /c/KARTSEEKAPP
```
Expected: the guard's `constantTimeCompare` body starts with the `secret` line (the `require('crypto')` line is gone), the regex reads `/\.\.[/\\]/`, and `EmptyRequest` is a type alias. Then add `import { createHmac } from 'crypto';` to the top of `api-key.guard.ts` with the Edit tool (after the last existing import). The sed for the regex is fragile because of the escaping; if `grep` does not show `/\.\.[/\\]/`, make that one change with the Edit tool instead.

- [ ] **Step 4: Remove the useless try/catch in the search service**

With the Edit tool, in `apps/api/apps/search-service/src/search.service.ts` delete the line `    try {` at 287 and the three lines
```ts
    } catch (err) {
      throw err;
    }
```
at 310–312, then de-indent the former body by two spaces (lines 288–309). Verify:
```bash
sed -n 284,312p apps/api/apps/search-service/src/search.service.ts
```
Expected: the `fetch` call sits directly in the method body at 4-space indentation and the method still ends with `return { results, total: ... };` followed by `  }`.

- [ ] **Step 5: The marketplace-backend spec's requires**

With the Edit tool, in `modules/marketplace/backend/src/__tests__/verification.spec.ts` insert after the header comment's closing ` */` (line 12) a blank line and
```ts
import * as fs from 'fs';
import * as path from 'path';
```
Then:
```bash
sed -i "/^\s*const fs = require('fs');$/d; /^\s*const path = require('path');$/d" modules/marketplace/backend/src/__tests__/verification.spec.ts && grep -c "require(" modules/marketplace/backend/src/__tests__/verification.spec.ts
```
Expected: `0`.

- [ ] **Step 6: Verify both workspaces are clean and green**

Run:
```bash
npm run lint -w kartseek-api 2>&1 | tail -3; echo "api lint exit=${PIPESTATUS[0]}"; npm run lint -w @kartseek/marketplace-backend 2>&1 | tail -3; echo "mp lint exit=${PIPESTATUS[0]}"; npm run type-check -w kartseek-api && npm test -w kartseek-api 2>&1 | grep -E 'Tests|Test Files' && npm test -w @kartseek/marketplace-backend 2>&1 | grep -E 'Tests|Test Files'
```
Expected: both lint exits `0` with no `problems` line; type-check passes; both test runs report all files passed.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -q -m "refactor(api): resolve the remaining lint findings by fixing the code

Eleven empty catch blocks in the geo-security and taxi controllers now log
which lookup failed and which fallback follows; six @ts-ignore directives
on optional storage imports become plain imports (S3, installed) or a
reasoned @ts-expect-error (GCS, not installed); a require('crypto') becomes
an import; EmptyRequest is a type alias; a rethrow-only try/catch, a
useless escape and four prefer-const go; the marketplace-backend spec
imports fs and path instead of requiring them.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 13: Documentation (spec §8)

**Files:**
- Modify: `docs/guides/testing.md`, `docs/guides/conventions.md`, `docs/guides/local-setup.md`, `docs/superpowers/specs/2026-09-05-platform-reorganization-design.md` (§15)
- Memory (outside the repository): `project_claude_code_skills_import.md`, `project_platform_reorg_program.md`

- [ ] **Step 1: testing.md**

With the Edit tool:
1. Delete the whole `## Known, pre-existing gaps` section (heading through the last bullet).
2. In `## Unit`, replace
```
`apps/web` and the eight module frontends use **Jest**
(`jest --verbose` for `apps/web`, plain `jest` for the zones).
```
with
```
`apps/web` and the eight module frontends use **Jest** through one shared
preset, `apps/web/jest.base.cjs` — every Next workspace's `jest.config.cjs`
is one statement, `createNextJestConfig(__dirname)`, and the module aliases
Jest resolves are derived from that workspace's own tsconfig `paths`, so a
path added for TypeScript is a path Jest knows without a second edit. Every
Next workspace also carries `src/__tests__/registry-entry.spec.ts`, which
asserts its `dev`/`start` port and its `basePath` against `services.yaml`;
a zone whose port drifts fails its unit run, not its deploy.
```
3. In `## Type gates`, after the paragraph ending `import type` matters day to day.` add
```

The nine Next workspaces run `next typegen && tsc --noEmit`: `next-env.d.ts`
is generated, not tracked, and `next typegen` recreates it together with the
route types before `tsc` runs. Their `tsconfig.json` declares
`"types": ["jest", "node"]` so the specs under `src/__tests__` type-check
with everything else.
```
4. Add a new section before `## Authorization tests`:
```
## Lint

```bash
npm run lint
```

is `turbo run lint`. One ESLint (10.x) and one typescript-eslint are declared
at the root and shared by all 18 workspaces. Backends delegate to
`apps/api/eslint.base.js`; the shell and the eight zones delegate to
`apps/web/eslint.base.mjs`. Errors must be zero everywhere. In the Next
workspaces the React Compiler's hook rules (everything under `react-hooks/`
except `rules-of-hooks`) are warnings while the compiler is off — advice,
not gates. The counts at the time of the 2026-09-06 hygiene pass, to be
driven down rather than grown:

| Workspace | Warnings |
| --- | --- |
| `kartseek-web` | N |
| `@kartseek/doctor-frontend` | N |
| `@kartseek/franchise-frontend` | N |
| `@kartseek/grocery-frontend` | N |
| `@kartseek/hotel-frontend` | N |
| `@kartseek/marketplace-frontend` | N |
| `@kartseek/pharmacy-frontend` | N |
| `@kartseek/restaurant-frontend` | N |
| `@kartseek/taxi-frontend` | N |

The pre-commit hook runs `eslint --fix` on staged files with the same
configs, so a new error cannot be committed; warnings can.
```
   Replace each `N` with the number recorded in Task 6 Step 5.

- [ ] **Step 2: conventions.md**

With the Edit tool:
1. Replace the `## Commits` section's body from `The root `package.json` carries a `commitlint` config:` through `that error silently, so `npm install` reports success either way.` with
```
Commit messages are checked by commitlint (`@commitlint/config-conventional`)
from the `commit-msg` hook, and staged files are formatted and linted by
lint-staged from the `pre-commit` hook, which also runs the registry check.
Both hooks are installed by husky when `npm install` runs the root `prepare`
script; `git config core.hooksPath` shows `.husky/_` on a working checkout.
The hook and lint-staged configuration live in the root `package.json` and
`.husky/`.
```
   and replace the following paragraph's opening `Until phase 4 wires `commitlint` into CI to check pull requests, Conventional\nCommits here is a convention developers follow by hand, not a rule anything\nenforces: `type(scope): subject`,` with `The format is `type(scope): subject`,`.
2. Add a new section after `## Formatting`:
```
## Linting

One ESLint and one typescript-eslint, declared at the root; no workspace
declares its own. A backend's `eslint.config.js` is a one-line call into
`apps/api/eslint.base.js`; a Next app's `eslint.config.mjs` is a one-line
import of `apps/web/eslint.base.mjs`. Change a rule in the base, never in a
workspace. `packages/shared-core` and `packages/shared-ui` are formatted by
the hooks but have no lint owner yet; the root `eslint.config.mjs` ignores
them deliberately until one is chosen.

## Cleaning

`npm run clean` removes every workspace's build output (`dist`, `.next`,
`out`, `tsconfig.tsbuildinfo`) and the Turbo cache with `rimraf`, so it
works under npm's `cmd.exe` on Windows as well as under bash. It never
touches `node_modules`; `npm ci` is the reset for those.
```
3. In `## D3 — Casing`, confirm the exception paragraph is gone (Task 4) and that nothing else refers to the ten files.

- [ ] **Step 3: local-setup.md**

With the Edit tool:
1. In `## Clone and install`, after the install command's explanation add a sentence: `The install also runs husky, which installs the commit hooks described in [conventions.md](conventions.md#commits).`
2. Replace the `## Untracked clutter` section body with
```
A checkout that has been built and run for a while accumulates output git
already ignores. `npm run clean` removes the build output and the Turbo cache
(`.turbo/cache` alone reached 33 GB once); `*.log` files at the root and the
Flutter `build/` and `.dart_tool/` directories can be deleted by hand whenever
you want the disk back. None of it is source. One thing not to delete:
`DockerDesktopWSL/` inside the repository is Docker Desktop's own data disk if
it was ever pointed there; move it from Docker Desktop → Settings → Resources
→ Advanced → Disk image location rather than removing it.
```

- [ ] **Step 4: Phase 1 spec §15**

With the Edit tool, in `docs/superpowers/specs/2026-09-05-platform-reorganization-design.md` §15, append ` — done 2026-09-06 (repo hygiene, see `2026-09-06-repo-hygiene-design.md`).` to the bullets about the ten PascalCase files, `next-env.d.ts`, `SELLER_TCP_PORT` and `DEV_AUTH_BYPASS=false`.

- [ ] **Step 5: Memory files (outside git)**

In `C:\Users\Hp EliteBook\.claude\projects\C--KARTSEEKAPP\memory\project_claude_code_skills_import.md`, replace the "Inert by design" bullet with one sentence recording that the ralph and hookify commands, their two scripts and the conversation-analyzer agent were deleted on 2026-09-06, and that `/loop` is the looping tool. Append to `project_platform_reorg_program.md` a line recording the hygiene pass branch and its merge commit once Task 15 completes.

- [ ] **Step 6: Verify and commit**

Run:
```bash
npm run docs:check-links 2>&1 | tail -2 && npm run registry:check 2>&1 | tail -1
```
Expected: 0 broken links; registry clean (the generated README blocks are untouched by this task).
```bash
git add -A && git commit -q -m "docs: record the hygiene pass — hooks, one ESLint, the Jest preset, clean, and no known-gaps list

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git log --oneline -1
```

---

### Task 14: Gates (spec §9)

**Files:** none modified unless a gate fails.

- [ ] **Step 1: Pause the preview**

Call `preview_list`; `preview_stop` every running entry. The full build writes to the same `.next` directories the dev server holds.

- [ ] **Step 2: Static gates**

Run:
```bash
npm run registry:check && npm run test:scripts 2>&1 | tail -3 && npm run docs:check-links 2>&1 | tail -1 && npm run type-check 2>&1 | grep -E 'Tasks:' && npm run lint 2>&1 | grep -E 'Tasks:|error' | tail -3
```
Expected: registry clean; 18 script tests pass; 0 broken links; `Tasks: 18 successful, 18 total` for type-check; `Tasks: 18 successful, 18 total` for lint.

- [ ] **Step 3: Tests**

Run:
```bash
npm test 2>&1 | grep -E 'Tasks:|failed' | tail -5
```
Expected: `Tasks: 18 successful, 18 total` and no `failed`.

- [ ] **Step 4: Builds and smoke**

Run (allow 30–40 minutes; nine Next builds plus 26 Nest bundles):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 API_URL=http://localhost:3001/api/v1 NEXT_PUBLIC_WS_URL=ws://localhost:3001 npm run build 2>&1 | grep -E 'Tasks:|ERROR|Failed' | tail -5 && npm run smoke 2>&1 | tail -3
```
Expected: `Tasks: 18 successful, 18 total`; smoke ends `26/26`.

- [ ] **Step 5: Restart the preview**

Call `preview_start` with `name: "dev"`. Record every gate's result in the progress notes. A failing gate is fixed in a small follow-up commit on the branch and the affected gate re-run; nothing merges red.

---

### Task 15: Review, fixes, merge (spec §9)

- [ ] **Step 1: Independent review of the whole branch**

Use the superpowers:requesting-code-review flow with one reviewer agent over `git diff main...chore/repo-hygiene`, pointing it at the spec and asking specifically about: deleted code that something still referenced, the tax-line change's behaviour for markets that previously had no lines (US now receives a Sales Tax line at the registered rate), the empty-catch messages, and whether any lint finding was silenced rather than fixed. Address every Critical and Important finding in follow-up commits; re-run the gates the fixes touch; re-review the fixes.

- [ ] **Step 2: Finish the branch**

Use superpowers:finishing-a-development-branch: `git switch main && git merge --ff-only chore/repo-hygiene && git branch -d chore/repo-hygiene`. Re-run `npm run registry:check`, `npm run test:scripts` and `npm test -w @kartseek/grocery-frontend` on `main` as a spot check. Update the memory files (Task 13 Step 5) with the merge commit.
