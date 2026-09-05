# Phase 1 — Repo tidy, naming, registry and documentation: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute Phase 1 of the platform reorganization spec (`docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`, sections 5, 10, 11): delete dead tooling, rename every root module and the five PascalCase components, move infrastructure under `infra/`, consolidate Postman under `tests/postman/`, add the service registry with its validator, generators, smoke test and link checker, and rewrite the documentation so it describes the tree that exists.

**Architecture:** Tidy in place. `apps/`, `modules/`, `packages/` stay. A machine-readable `services.yaml` at the root becomes the only declaration of ports, images, health routes and dependencies; three small ESM scripts (`validate`, `generate`, `boot-all`) read it, and a fourth (`check-links`) keeps the docs honest. Every task ends with the type-check of the workspaces it touched and one Conventional Commit.

**Tech Stack:** Node 25/26 ESM scripts with `node:test`, `js-yaml` (already pinned at the root through `overrides`), Nest 12 + rspack, Next 16, Vitest 4 (backend), Jest 30 (web), Flutter 3.44, Docker Compose v5 (`include:`), `git mv` for every rename.

## Global Constraints

- Node `26.5.0` in `.nvmrc`; `engines.node >=25.0.0` (the machine runs 25.5.0 and that is fine). npm 11.
- One `typeorm` (`^0.3.31`) and one `@nestjs/core` (`^12.0.1`) in the tree. After any `npm install`: `npm ls @nestjs/core typeorm` shows one version each.
- New backend dependencies are declared in `apps/api` only. Root pins stay. Run `npm install` from the repository root only. Never delete `package-lock.json`.
- Renames go through `git mv`. No case-only renames.
- Windows: long file contents are written with the editor tool (Write), not heredocs. Short edits use `sed`/Edit.
- Every root module is `<deployable>.module.ts` exporting `<Deployable>Module` (D2). Files kebab-case, symbols PascalCase (D3). Dart stays `snake_case` with the `kartseek_` package prefix.
- `DEV_AUTH_BYPASS` is never set in CI; `.env.example` keeps `DEV_AUTH_BYPASS=false`.
- Root `README.md` under 150 lines.
- Path-hygiene greps exclude `docs/audits/`, `docs/archive/`, `docs/superpowers/`.
- Commits: Conventional Commits, one per task, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Validator, generators and the link checker print the offending entry and file and exit 1; generators write to a temp file and rename (never partial output).
- The gate (spec §11) runs after every task that touches code; the whole gate runs at the end of the phase.

---

## File structure

**Created**

| Path | Responsibility |
| --- | --- |
| `services.yaml` | The service registry (D4): 35 deployables, ports, env names, health routes, database, dependencies, Kafka groups, k8s overrides. |
| `scripts/registry/lib.mjs` | Loads and shapes the registry; shared helpers (`repoRoot`, `loadRegistry`, `runtime`, `portDefaultIn`, `writeAtomic`). |
| `scripts/registry/validate.mjs` | Checks 1–7 from spec §5.4 plus the Joi defaults; exits 1 with every problem listed. |
| `scripts/registry/generate.mjs` | Renders `docs/architecture/services.md` and the README port blocks; `--check` reports stale output. |
| `scripts/registry/validate.test.mjs`, `generate.test.mjs` | `node:test` fixtures for both. |
| `scripts/docs/check-links.mjs`, `check-links.test.mjs` | Relative Markdown link checker. |
| `tests/smoke/boot-all.mjs` | Boots every Nest deployable from `dist/`, polls `health.live`, prints a table. |
| `apps/api/test/vitest.e2e.mts` | Vitest config that runs the two e2e specs against live infrastructure. |
| `apps/api/scripts/maintenance/README.md` | What each one-off data repair did and when. |
| `infra/docker/compose.infra.yml` | The Compose body (moved). |
| `infra/{README.md,docker/README.md,k8s/README.md}` | Operational READMEs next to what they operate. |
| `docs/README.md`, `docs/guides/*.md` (8), `docs/architecture/*.md` (6), `docs/adr/000{1..5}-*.md`, `docs/product/`, `docs/audits/` | Docs split by audience (D7). |
| Workspace READMEs: `apps/api`, `apps/web`, `apps/mcp-server`, `apps/customer`, `apps/partner`, `apps/seller` (rewritten), `modules/README.md`, 16 × `modules/<v>/{backend,frontend}/README.md`, `packages/{shared-core,shared-ui,shared-mobile,vendor/objective_c}/README.md`, `tests/postman/README.md`, `scripts/README.md` | Purpose, run, test, env vars, generated port block. |

**Moved** — the table in spec §5.1, reproduced per task below.

**Deleted** — the list in spec §5.2, reproduced in Task 1 and Task 7.

---

## Task 0: Baseline (no commit)

**Files:** none changed.

- [ ] **Step 1: Record the type-check and unit-test baseline**

Run from the root:

```bash
npm run type-check 2>&1 | tail -20
npm test 2>&1 | tail -30
```

Expected: both exit 0 (the branch is clean at `51a29df`). If either fails, stop and report — Phase 1 must not start from a red baseline.

- [ ] **Step 2: Start the Flutter analyze baseline in the background**

`flutter analyze` on four workspaces takes minutes. Run it detached, writing to the scratchpad, so Task 7 can compare:

```bash
for w in packages/shared-mobile apps/customer apps/partner apps/seller; do
  (cd "$w" && flutter pub get >/dev/null 2>&1; flutter analyze --no-pub > "$SCRATCH/analyze-before-$(basename $w).txt" 2>&1; echo "exit=$?" >> "$SCRATCH/analyze-before-$(basename $w).txt")
done
```

(`$SCRATCH` is the session scratchpad directory.) Expected: four files, each ending in `exit=0` or `exit=1` with an issue count. The count is the baseline; Task 7 must not add to it.

- [ ] **Step 3: Capture the Compose model before Task 4 changes it**

```bash
docker compose -f docker-compose.yml config > "$SCRATCH/compose-before.yml"
```

Expected: a rendered model with absolute volume paths. If Docker is not running, `docker compose config` still works (it only parses); if it does not, note it and compare textually in Task 4 instead.

---

## Task 1: Delete dead tooling, move e2e to Vitest, reconcile dependencies

**Files:**

- Delete: `reg.tmp.js`, `apps/api/snap.cjs`, `apps/api/jest-e2e.js`, `apps/api/.dockerignore`, `apps/api/scripts/hotel-api-test.js`, `apps/api/scripts/hotel-diagnostic.js`, `apps/web/check_links.js`, `apps/web/fix_broken_links.js`, `apps/web/refactor_taxi.js`, `scripts/fix-dark-theme.js`, `scripts/fix_jsx.js`, `scripts/web/fix_accessibility_lint.js`, `scripts/mobile/fix_const_errors.js`, `scripts/mobile/fix_static_declarations.js`, `scripts/mobile/fix_undeclared_variables.js`, `scripts/mobile/replace_hardcoded_currency.js`, `scripts/mobile/run_customer_app.ps1`, `scripts/mobile/run_partner_app.ps1`, `scripts/api/install_backend_dependencies.js`, `scripts/api/scaffold_microservices.js`, `scripts/api/scaffold_project_structure.js`, `scripts/api/write_all_service_files.js`, `apps/api/apps/order-service/src/order-service.module.ts`, `apps/api/apps/payment-service/src/payment-service.module.ts`, `apps/api/apps/audit-log-service/src/audit-log-service.module.ts`, `apps/api/apps/loyalty-service/src/loyalty-service.module.ts`
- Keep for Task 7 (read there, then delete there): `scripts/mobile/fix_objective_c_bug.ps1`, `scripts/mobile/recreate_dummy_objective_c.ps1`
- Create: `apps/api/test/vitest.e2e.mts`
- Modify: `apps/api/package.json`, `apps/api/tsconfig.json:185`, `apps/web/eslint.config.mjs:16-18`, `apps/web/package.json`, `modules/grocery/backend/package.json`, all eight `modules/*/backend/package.json`, root `package.json`, `.gitignore`, `.vscode/settings.json:117`

**Interfaces:**

- Produces: `npm run test:e2e -w kartseek-api` runs `test/authorization.e2e-spec.ts` and `test/e2e-journey.spec.ts` under Vitest. `npm run test:scripts` (root) runs every `*.test.mjs` under `scripts/` and `tests/`. `js-yaml` is an explicit root devDependency for Task 8.

- [ ] **Step 1: Confirm the four root-module wrappers have no importers**

```bash
git grep -n "order-service.module\|payment-service.module\|audit-log-service.module\|loyalty-service.module" -- apps/api | grep -v "/src/[a-z-]*-service.module.ts:"
```

Expected: no output.

- [ ] **Step 2: Delete the tracked one-offs and the wrappers**

```bash
git rm -q reg.tmp.js apps/api/snap.cjs apps/api/jest-e2e.js apps/api/.dockerignore \
  apps/api/scripts/hotel-api-test.js apps/api/scripts/hotel-diagnostic.js \
  apps/web/check_links.js apps/web/fix_broken_links.js apps/web/refactor_taxi.js \
  scripts/fix-dark-theme.js scripts/fix_jsx.js scripts/web/fix_accessibility_lint.js \
  scripts/mobile/fix_const_errors.js scripts/mobile/fix_static_declarations.js \
  scripts/mobile/fix_undeclared_variables.js scripts/mobile/replace_hardcoded_currency.js \
  scripts/mobile/run_customer_app.ps1 scripts/mobile/run_partner_app.ps1 \
  scripts/api/install_backend_dependencies.js scripts/api/scaffold_microservices.js \
  scripts/api/scaffold_project_structure.js scripts/api/write_all_service_files.js \
  apps/api/apps/order-service/src/order-service.module.ts \
  apps/api/apps/payment-service/src/payment-service.module.ts \
  apps/api/apps/audit-log-service/src/audit-log-service.module.ts \
  apps/api/apps/loyalty-service/src/loyalty-service.module.ts
```

- [ ] **Step 3: Write the Vitest e2e config**

`apps/api/test/vitest.e2e.mts`:

```ts
import * as path from 'path';
import { backendVitestConfig } from './vitest-backend.mjs';

/**
 * The two specs that need live infrastructure (Postgres, Redis, a running
 * gateway). Excluded from the unit run in ../vitest.config.mts; reachable here:
 *
 *   npm run test:e2e -w kartseek-api
 *
 * `workspaceDir` is apps/api, one level up from this file.
 */
export default backendVitestConfig({
  workspaceDir: path.resolve(import.meta.dirname, '..'),
  include: ['test/authorization.e2e-spec.ts', 'test/e2e-journey.spec.ts'],
});
```

Add it to the tsconfig exclude so `tsc --noEmit` (CommonJS) does not try to type an `import.meta` file — `apps/api/tsconfig.json` line 185:

```json
  "exclude": ["node_modules", "dist", "vitest.config.mts", "test/vitest.e2e.mts"]
```

- [ ] **Step 4: Clean `apps/api/package.json`**

Remove the `scaffold`, `install:deps` scripts; change `test:e2e` and `start:prod`; delete the whole `"jest": { ... }` block; remove `jest` and `ts-jest` from devDependencies. Keep `@types/jest` — 100+ specs use `describe/it/expect/jest.fn` through the `globalThis.jest = vi` shim in `test/vitest-setup.ts`, and `tsconfig.json` `types: ["jest","node"]` is what types them; dropping it breaks `tsc`. Add a `_comment_types_jest` line saying so. (This is the one deliberate deviation from spec §5.2.)

Resulting script lines:

```json
    "start:prod": "node dist/apps/api-gateway/main.js",
    "test:e2e": "vitest run --config test/vitest.e2e.mts",
```

and, next to `devDependencies`:

```json
  "_comment_types_jest": "@types/jest stays although Jest is gone: the specs still call describe/it/expect/jest.fn through the `globalThis.jest = vi` shim in test/vitest-setup.ts, and tsconfig `types` names jest so tsc can type them. Migrate the specs to `vi` before removing it.",
```

- [ ] **Step 5: Drop `jest`/`ts-jest` from the eight module backends**

Each `modules/<v>/backend/package.json` declares `jest` and `ts-jest` but runs `vitest`. Remove those two devDependencies from all eight (keep `@types/jest` for the reason above):

```bash
for f in modules/*/backend/package.json; do
  node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$f'));delete p.devDependencies.jest;delete p.devDependencies['ts-jest'];fs.writeFileSync('$f',JSON.stringify(p,null,2)+'\n')"
done
git diff --stat modules/*/backend/package.json
```

Expected: 8 files, 2 deletions each.

- [ ] **Step 6: Declare what is imported but undeclared**

- `modules/grocery/backend/package.json` devDependencies: add `"supertest": "^7.2.2"` and `"@types/supertest": "^7.2.0"` (`src/__tests__/controller.integration.spec.ts` imports it; today it resolves only because `apps/api` hoists it).
- `apps/web/package.json` devDependencies: add `"playwright-core": "^1.61.1"` (`scripts/build-og-image.mjs` imports it; today it resolves through `@playwright/test`).
- Root `package.json` devDependencies: add `"js-yaml": "^5.4.1"` (the registry scripts in Task 8 import it; the `overrides` entry already pins this range).
- Root `package.json` scripts: add

```json
    "registry:validate": "node scripts/registry/validate.mjs",
    "registry:generate": "node scripts/registry/generate.mjs",
    "docs:check-links": "node scripts/docs/check-links.mjs",
    "smoke": "node tests/smoke/boot-all.mjs",
    "test:scripts": "node --test \"scripts/**/*.test.mjs\" \"tests/**/*.test.mjs\"",
```

Do not delete the module backends' unused-but-declared runtime packages (`passport`, `bcrypt`, `kafkajs`, …): the eight manifests are the deliberate "platform set every module compiles against" (see `apps/api/package.json` comments) and pruning them changes hoisting for no runtime gain. Record this in `docs/guides/conventions.md` (Task 12).

- [ ] **Step 7: Tidy the ignore lists that referenced deleted files**

`apps/web/eslint.config.mjs` lines 16–18: remove the three entries `'check_links.js'`, `'fix_broken_links.js'`, `'refactor_taxi.js'`.

`.vscode/settings.json` line 117: remove `"**/apps/mobile/android/**",` (and the trailing comma on the previous line so the JSON stays valid).

`.gitignore`: append

```gitignore

# ── Added 2026-09-05, platform reorganization ─────────────────────────────────
# A stray home-directory mirror and a CMake build tree that appeared at the root.
/Users/
/build/
# Newman writes here; the directory is kept, the reports are not.
tests/postman/reports/*
!tests/postman/reports/.gitkeep
# The smoke test's per-service boot logs.
tests/smoke/logs/
```

- [ ] **Step 8: Install from the root and verify the tree**

```bash
npm install
npm ls @nestjs/core typeorm js-yaml supertest playwright-core 2>&1 | grep -E "^(├|└|kartseek|@nestjs|typeorm|js-yaml)" | head -20
npm ls jest 2>&1 | grep -c "backend" 
```

Expected: exactly one `@nestjs/core@12.x` and one `typeorm@0.3.x`; `js-yaml@5.x` at the root; the `jest` listing shows no `*-backend` workspace (only the web workspaces).

- [ ] **Step 9: Type-check and run the unit tests**

```bash
npm run type-check 2>&1 | tail -5
npm test 2>&1 | tail -5
npm run test:e2e -w kartseek-api -- --help >/dev/null && echo "e2e config loads"
```

Expected: both green; the last line prints `e2e config loads` (Vitest parses the config even with `--help`).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: remove one-off scripts, dead root-module wrappers and the Jest e2e runner

Deletes 22 tracked codemods, debug scripts and scaffolders that no script or
doc runs any more, the four <name>-service.module.ts wrappers nothing imported,
snap.cjs (a schema dump with credentials) and the Jest e2e config. The two e2e
specs now run under Vitest via test/vitest.e2e.mts. jest/ts-jest leave the
nine backend manifests; @types/jest stays for the vi shim. Declares supertest
(grocery), playwright-core (web) and js-yaml (root) where they are imported.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 2: Rename the 15 root modules (D2)

**Files:**

- Rename (git mv) and edit class name + every importer:

| Deployable | From | To | Class | Importers to update |
| --- | --- | --- | --- | --- |
| admin-service | `apps/api/apps/admin-service/src/admin.module.ts` | `admin-service.module.ts` | `AdminModule` → `AdminServiceModule` | `src/main.ts` |
| api-gateway | `apps/api/apps/api-gateway/src/app.module.ts` | `api-gateway.module.ts` | `AppModule` → `ApiGatewayModule` | `src/main.ts`, `apps/api/test/authorization.e2e-spec.ts` |
| audit-log-service | `apps/api/apps/audit-log-service/src/audit-log.module.ts` | `audit-log-service.module.ts` | `AuditLogModule` → `AuditLogServiceModule` | `src/main.ts` |
| auth-service | `apps/api/apps/auth-service/src/app.module.ts` | `auth-service.module.ts` | `AppModule` → `AuthServiceModule` | `src/main.ts` |
| loyalty-service | `apps/api/apps/loyalty-service/src/loyalty.module.ts` | `loyalty-service.module.ts` | `LoyaltyModule` → `LoyaltyServiceModule` | `src/main.ts` |
| order-service | `apps/api/apps/order-service/src/order.module.ts` | `order-service.module.ts` | `OrderModule` → `OrderServiceModule` | `src/main.ts` |
| payment-service | `apps/api/apps/payment-service/src/payment.module.ts` | `payment-service.module.ts` | `PaymentModule` → `PaymentServiceModule` | `src/main.ts` (the `PaymentModule` **enum** in `entities/payment.entity.ts` is unrelated and stays) |
| payout-service | `apps/api/apps/payout-service/src/payout.module.ts` | `payout-service.module.ts` | `PayoutModule` → `PayoutServiceModule` | `src/main.ts` |
| user-service | `apps/api/apps/user-service/src/user.module.ts` | `user-service.module.ts` | `UserModule` → `UserServiceModule` | `src/main.ts` |
| wallet-service | `apps/api/apps/wallet-service/src/wallet.module.ts` | `wallet-service.module.ts` | `WalletModule` → `WalletServiceModule` | `src/main.ts` |
| franchise | `modules/franchise/backend/src/franchise.module.ts` | `franchise-service.module.ts` | `FranchiseModule` → `FranchiseServiceModule` | `src/main.ts` (the `FranchiseModule` **enum** in `dto/franchise.dto.ts` stays) |
| grocery | `modules/grocery/backend/src/grocery.module.ts` | `grocery-service.module.ts` | `GroceryModule` → `GroceryServiceModule` | `src/main.ts` |
| hotel | `modules/hotel/backend/src/hotel.module.ts` | `hotel-service.module.ts` | `HotelModule` → `HotelServiceModule` | `src/main.ts` |
| marketplace | `modules/marketplace/backend/src/marketplace.module.ts` | `marketplace-service.module.ts` | `MarketplaceModule` → `MarketplaceServiceModule` | `src/main.ts`, `src/__tests__/schema.integration.spec.ts`, comment in `apps/api/migrations/1786100000000-MarketplaceCatalogIndexes.ts:48` |
| taxi | `modules/taxi/backend/src/taxi.module.ts` | `taxi-service.module.ts` | `TaxiModule` → `TaxiServiceModule` | `src/main.ts` |

Comments that say `AppModule` in `apps/api/libs/kafka/src/kafka.module.ts:212` and `apps/api/libs/region/src/region.module.ts:17` become `the root module`.

**Interfaces:**

- Produces: the class names above, which Task 8's registry and Task 14's READMEs refer to.

- [ ] **Step 1: Rename the files**

```bash
cd apps/api/apps
git mv admin-service/src/admin.module.ts admin-service/src/admin-service.module.ts
git mv api-gateway/src/app.module.ts api-gateway/src/api-gateway.module.ts
git mv audit-log-service/src/audit-log.module.ts audit-log-service/src/audit-log-service.module.ts
git mv auth-service/src/app.module.ts auth-service/src/auth-service.module.ts
git mv loyalty-service/src/loyalty.module.ts loyalty-service/src/loyalty-service.module.ts
git mv order-service/src/order.module.ts order-service/src/order-service.module.ts
git mv payment-service/src/payment.module.ts payment-service/src/payment-service.module.ts
git mv payout-service/src/payout.module.ts payout-service/src/payout-service.module.ts
git mv user-service/src/user.module.ts user-service/src/user-service.module.ts
git mv wallet-service/src/wallet.module.ts wallet-service/src/wallet-service.module.ts
cd ../../../modules
git mv franchise/backend/src/franchise.module.ts franchise/backend/src/franchise-service.module.ts
git mv grocery/backend/src/grocery.module.ts grocery/backend/src/grocery-service.module.ts
git mv hotel/backend/src/hotel.module.ts hotel/backend/src/hotel-service.module.ts
git mv marketplace/backend/src/marketplace.module.ts marketplace/backend/src/marketplace-service.module.ts
git mv taxi/backend/src/taxi.module.ts taxi/backend/src/taxi-service.module.ts
```

- [ ] **Step 2: Rename the classes and the import specifiers**

Word-boundary substitutions, scoped to each deployable's directory so feature modules elsewhere (a `UserModule` in another service, say) are untouched:

```bash
r() { dir=$1; old=$2; new=$3; oldf=$4; newf=$5; \
  git grep -lE "\b$old\b|$oldf" -- "$dir" | xargs sed -i -E "s/\b$old\b/$new/g; s#\./$oldf'#./$newf'#g; s#/$oldf'#/$newf'#g"; }
r apps/api/apps/admin-service AdminModule AdminServiceModule admin.module admin-service.module
r apps/api/apps/api-gateway AppModule ApiGatewayModule app.module api-gateway.module
r apps/api/apps/audit-log-service AuditLogModule AuditLogServiceModule audit-log.module audit-log-service.module
r apps/api/apps/auth-service AppModule AuthServiceModule app.module auth-service.module
r apps/api/apps/loyalty-service LoyaltyModule LoyaltyServiceModule loyalty.module loyalty-service.module
r apps/api/apps/order-service OrderModule OrderServiceModule order.module order-service.module
r apps/api/apps/payout-service PayoutModule PayoutServiceModule payout.module payout-service.module
r apps/api/apps/user-service UserModule UserServiceModule user.module user-service.module
r apps/api/apps/wallet-service WalletModule WalletServiceModule wallet.module wallet-service.module
r modules/grocery/backend GroceryModule GroceryServiceModule grocery.module grocery-service.module
r modules/hotel/backend HotelModule HotelServiceModule hotel.module hotel-service.module
r modules/marketplace/backend MarketplaceModule MarketplaceServiceModule marketplace.module marketplace-service.module
r modules/taxi/backend TaxiModule TaxiServiceModule taxi.module taxi-service.module
```

payment-service and franchise carry an **enum** with the old class name, so do those two by hand: in `payment-service.module.ts` rename only the `export class PaymentModule` declaration; in `src/main.ts` change the import line to `import { PaymentServiceModule } from './payment-service.module';` and the `NestFactory.create(PaymentServiceModule` call. Same shape for franchise (`FranchiseServiceModule`, `./franchise-service.module`).

Then the two cross-workspace importers:

- `apps/api/test/authorization.e2e-spec.ts`: `import { ApiGatewayModule } from '../apps/api-gateway/src/api-gateway.module';` and every `AppModule` → `ApiGatewayModule`.
- `modules/marketplace/backend/src/__tests__/schema.integration.spec.ts`: import from `'../marketplace-service.module'` as `MarketplaceServiceModule`.
- `apps/api/migrations/1786100000000-MarketplaceCatalogIndexes.ts:48` comment: `MarketplaceServiceModule`.
- `apps/api/libs/kafka/src/kafka.module.ts:212` and `apps/api/libs/region/src/region.module.ts:17`: replace the word `AppModule` with `the root module`.

- [ ] **Step 3: Verify nothing still says the old name**

```bash
git grep -nE "\b(AdminModule|AuditLogModule|LoyaltyModule|OrderModule|PayoutModule|UserModule|WalletModule|GroceryModule|HotelModule|MarketplaceModule|TaxiModule)\b" -- apps/api modules ':!*.md'
git grep -nE "\bAppModule\b" -- apps/api modules ':!*.md'
git grep -nE "\b(PaymentModule|FranchiseModule)\b" -- apps/api/apps/payment-service modules/franchise ':!*.md' | grep -vE "enum PaymentModule|PaymentModule as PaymentModuleEnum|PaymentModuleEnum|enum: PaymentModule|: PaymentModule;|enum FranchiseModule|enum: FranchiseModule|FranchiseModule\)|FranchiseModule\." 
```

Expected: the first two return nothing; the third returns nothing (every remaining hit is the enum).

- [ ] **Step 4: Type-check the touched workspaces**

```bash
npm run type-check 2>&1 | grep -E "error|Tasks:" | tail -5
```

Expected: `Tasks: 18 successful` (or the current workspace count), no `error`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(api): name every root module after its deployable

15 root modules become <deployable>.module.ts / <Deployable>Module, the shape
nest g app generates and the one 11 of 26 already used. Feature modules keep
their domain names; the PaymentModule and FranchiseModule enums are unrelated
and unchanged. Every importer, spec and comment updated.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 3: Kebab-case the five PascalCase component files (D3)

**Files:**

- Rename: `apps/web/src/components/india/PinCodeInput.tsx` → `pin-code-input.tsx`, `StateDistrictSelector.tsx` → `state-district-selector.tsx`, `apps/web/src/components/taxi/RentalCompliancePanel.tsx` → `rental-compliance-panel.tsx`, `RentalDocumentPanel.tsx` → `rental-document-panel.tsx`, `VehicleHandoverPanel.tsx` → `vehicle-handover-panel.tsx`
- Modify: `apps/web/src/components/taxi/index.ts`, `apps/web/src/app/admin/taxi/rentals/page.tsx:11`, `apps/web/src/app/seller/taxi/(portal)/rentals/page.tsx:11-13`, any importer of the two india components

- [ ] **Step 1: Rename and rewrite the specifiers**

```bash
cd apps/web/src/components
git mv india/PinCodeInput.tsx india/pin-code-input.tsx
git mv india/StateDistrictSelector.tsx india/state-district-selector.tsx
git mv taxi/RentalCompliancePanel.tsx taxi/rental-compliance-panel.tsx
git mv taxi/RentalDocumentPanel.tsx taxi/rental-document-panel.tsx
git mv taxi/VehicleHandoverPanel.tsx taxi/vehicle-handover-panel.tsx
cd ../../..
git grep -lE "PinCodeInput'|StateDistrictSelector'|RentalCompliancePanel'|RentalDocumentPanel'|VehicleHandoverPanel'" -- src | xargs sed -i -E \
  "s#/PinCodeInput'#/pin-code-input'#g; s#/StateDistrictSelector'#/state-district-selector'#g; s#/RentalCompliancePanel'#/rental-compliance-panel'#g; s#/RentalDocumentPanel'#/rental-document-panel'#g; s#/VehicleHandoverPanel'#/vehicle-handover-panel'#g"
```

- [ ] **Step 2: Verify**

```bash
git grep -nE "(PinCodeInput|StateDistrictSelector|RentalCompliancePanel|RentalDocumentPanel|VehicleHandoverPanel)['\"]" -- apps/web/src
npm run type-check -w kartseek-web 2>&1 | tail -3
```

Expected: first command empty; type-check green. The six PascalCase files under `apps/web/src/app/admin/**/page-builder/components/` are route-private components co-located with a page and are out of the spec's list; leave them.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(web): kebab-case the five PascalCase component files

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 4: `infra/` — move k8s, nginx and the Dockerfiles; split Compose with `include:`

**Files:**

- Move: `k8s/**` → `infra/k8s/**`; `nginx/**` → `infra/nginx/**`; `apps/api/Dockerfile` → `infra/docker/core-service.Dockerfile`; `apps/api/Dockerfile.prod` → `infra/docker/api-gateway.Dockerfile`; `apps/api/Dockerfile.marketplace` → `infra/docker/marketplace-service.Dockerfile`; the body of `docker-compose.yml` → `infra/docker/compose.infra.yml`
- Modify: root `docker-compose.yml` (becomes `include:`), root `package.json` `nginx:certs`, `.dockerignore`, `infra/k8s/deploy.sh`, `infra/k8s/gen-microservices.sh:7,52`, `infra/k8s/README.md`, `infra/k8s/QUICKSTART.md`, the three Dockerfiles' header comments, `apps/api/apps/api-gateway/src/api-gateway.module.ts:111` comment, `.gitignore:76` comment, `ARCHITECTURE.md:245` (rewritten in Task 13 anyway)

- [ ] **Step 1: Move the trees**

```bash
mkdir -p infra/docker
git mv k8s infra/k8s
git mv nginx infra/nginx
git mv apps/api/Dockerfile infra/docker/core-service.Dockerfile
git mv apps/api/Dockerfile.prod infra/docker/api-gateway.Dockerfile
git mv apps/api/Dockerfile.marketplace infra/docker/marketplace-service.Dockerfile
git mv docker-compose.yml infra/docker/compose.infra.yml
```

- [ ] **Step 2: Fix the paths inside what moved**

`infra/docker/compose.infra.yml`: every `./infra/postgres/init-extensions.sql` → `../postgres/init-extensions.sql` (9 occurrences); `./nginx/nginx.conf` → `../nginx/nginx.conf`, `./nginx/conf.d` → `../nginx/conf.d`, `./nginx/ssl` → `../nginx/ssl`. Update the header comment's `npm run infra:*` lines to say the file is included from the root `docker-compose.yml`.

```bash
sed -i 's#\./infra/postgres/#../postgres/#g; s#\./nginx/#../nginx/#g' infra/docker/compose.infra.yml
grep -c "\.\./postgres/init-extensions.sql" infra/docker/compose.infra.yml   # expect 9
grep -c "\.\./nginx/" infra/docker/compose.infra.yml                         # expect 3
```

New root `docker-compose.yml`:

```yaml
# KARTSEEK local stack — entry point.
#
# The definitions live under infra/docker/. This file only includes them, so
# `docker compose …` and every `npm run infra:*` / `nginx:*` script keep working
# from the repository root, and the root `.env` keeps supplying the credentials.
#
#   npm run infra:up      start Postgres, Redis, Kafka, MongoDB, Elasticsearch, Kafka UI
#   npm run infra:tools   + pgAdmin, Redis Insight, Kibana        (profile: tools)
#   docker compose --profile isolated up -d      one Postgres per module (5433–5440)
#
# Phase 3 adds compose.services.yml (generated from services.yaml) and phase 2
# adds compose.observability.yml here.
include:
  - path: infra/docker/compose.infra.yml
    env_file: .env
```

`infra/k8s/deploy.sh`: after the `NAMESPACE=` line add `K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` and replace every literal `k8s/` in a command or message with `$K8S_DIR/` (lines 56, 57, 65, 72, 80, 85, 99, 100, 101, 110, 117). Header usage line becomes `Usage: ./infra/k8s/deploy.sh [environment]`.

```bash
sed -i 's#^NAMESPACE="kartseek"#NAMESPACE="kartseek"\nK8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" \&\& pwd)"#; s#-f k8s/#-f "$K8S_DIR"/#g; s#grep -qE \(.*\) k8s/config.yaml#grep -qE \1 "$K8S_DIR"/config.yaml#; s#k8s/config.yaml still#config.yaml still#; s#\./k8s/deploy.sh#./infra/k8s/deploy.sh#' infra/k8s/deploy.sh
bash -n infra/k8s/deploy.sh && bash -n infra/k8s/utils.sh && bash -n infra/k8s/gen-microservices.sh
grep -n "k8s/" infra/k8s/deploy.sh    # expect only the Usage line with infra/k8s/
```

`infra/k8s/gen-microservices.sh` lines 7 and 52: `bash infra/k8s/gen-microservices.sh` and `# Source: infra/k8s/gen-microservices.sh`. `infra/k8s/README.md` and `QUICKSTART.md`: `sed -i 's#\bk8s/#infra/k8s/#g'` (both are rewritten into one README in Task 14; this keeps them correct meanwhile).

The three Dockerfiles: change the header comments that say `docker build -f apps/api/Dockerfile… .` to `docker build -f infra/docker/<name>.Dockerfile .`; `COPY`/`WORKDIR` paths are repo-root-relative and stay.

Root `.dockerignore`: comment line 3 → `#   docker build -f infra/docker/api-gateway.Dockerfile .`; replace the `k8s` line with `infra`.

Root `package.json` `nginx:certs`: `mkdir -p infra/nginx/ssl && docker run --rm -v ./infra/nginx/ssl:/ssl …` (two path edits).

`.gitignore:76` comment: `infra/nginx/ssl/kartseek.key`. `apps/api/apps/api-gateway/src/api-gateway.module.ts:111` comment: `infra/k8s/config.yaml`.

- [ ] **Step 3: Verify the Compose model is unchanged**

```bash
docker compose -f docker-compose.yml config > "$SCRATCH/compose-after.yml"
diff "$SCRATCH/compose-before.yml" "$SCRATCH/compose-after.yml" && echo IDENTICAL
docker compose -f docker-compose.yml --profile isolated --profile tools config >/dev/null && echo "profiles parse"
```

Expected: `IDENTICAL` (absolute volume paths resolve to the same files) and `profiles parse`. If `include` resolves `.env` differently (a `${POSTGRES_PASSWORD}` shows a default where it did not before), set `project_directory: .` under the include entry and re-diff.

- [ ] **Step 4: Verify no stale path remains**

```bash
git grep -nE "(^|[^A-Za-z0-9_./-])(k8s|nginx)/" -- ':!infra' ':!docs' ':!*.log'
git grep -n "apps/api/Dockerfile" -- ':!docs'
```

Expected: nothing except `ARCHITECTURE.md` (rewritten in Task 13) and this plan/spec.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(infra): move k8s, nginx and the Dockerfiles under infra/; split Compose

k8s/ and nginx/ become infra/k8s and infra/nginx; the three API Dockerfiles
move to infra/docker under names that say what they build. The Compose body
becomes infra/docker/compose.infra.yml and the root file is an include:, so
every npm script and the root .env keep working. docker compose config is
byte-identical before and after.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 5: One Postman home under `tests/postman/`

**Files:**

- Move: `docs/api/postman/{collections,environments,data,scripts,newman.config.js,README.md}` → `tests/postman/`; `apps/api/postman/KARTSEEK_Hotel_Booking_API.postman_collection.json` → `tests/postman/collections/32-hotel-booking-api.postman_collection.json`; `apps/api/postman/KARTSEEK_Pharmacy_API.postman_collection.json` → `tests/postman/collections/33-pharmacy-api.postman_collection.json`; `tests/postman/payment-service.postman_collection.json` → `tests/postman/collections/34-payment-service.postman_collection.json`
- Delete: `docs/api/postman/reports/*` (31 reports, `summary.json`, `_working_environment.json`), `docs/api/postman/test-results.txt`; keep `reports/.gitkeep` (moved)
- Modify: `tests/postman/newman/run-payment-tests.sh:27`, `tests/postman/newman.config.js` (append the three names to `collections`), `.gitattributes:53`, `tests/postman/README.md` (rewritten in Task 14; path-fixed here)

- [ ] **Step 1: Move and delete**

```bash
git mv docs/api/postman/collections tests/postman/collections
git mv docs/api/postman/environments/* tests/postman/environments/
git mv docs/api/postman/data tests/postman/data
git mv docs/api/postman/scripts tests/postman/scripts
git mv docs/api/postman/newman.config.js tests/postman/newman.config.js
git mv docs/api/postman/README.md tests/postman/README.md
mkdir -p tests/postman/reports && git mv docs/api/postman/reports/.gitkeep tests/postman/reports/.gitkeep
git rm -rq docs/api/postman
git mv apps/api/postman/KARTSEEK_Hotel_Booking_API.postman_collection.json tests/postman/collections/32-hotel-booking-api.postman_collection.json
git mv apps/api/postman/KARTSEEK_Pharmacy_API.postman_collection.json tests/postman/collections/33-pharmacy-api.postman_collection.json
git mv tests/postman/payment-service.postman_collection.json tests/postman/collections/34-payment-service.postman_collection.json
ls docs/api 2>/dev/null || echo "docs/api gone"
```

- [ ] **Step 2: Fix the paths**

`tests/postman/newman/run-payment-tests.sh:27`: `npx newman run "$TESTS_DIR/collections/34-payment-service.postman_collection.json" \`.

`tests/postman/newman.config.js` `collections` array: append `'32-hotel-booking-api'`, `'33-pharmacy-api'`, `'34-payment-service'` after `'05-admin-panel'`.

`.gitattributes:53`: delete the `docs/api/postman/reports/**` line (reports are no longer tracked).

`tests/postman/README.md`: `sed -i 's#docs/api/postman#tests/postman#g'` and delete the "CI/CD Integration" paragraph that names a `.github/workflows/api-ci.yml` that does not exist (Task 14 rewrites the file; this keeps it truthful meanwhile).

- [ ] **Step 3: Verify the runners still resolve**

```bash
node -e "const c=require('./tests/postman/newman.config.js');console.log(c.collections.length)"   # 34
node -e "const fs=require('fs');const p='tests/postman/collections';console.log(fs.readdirSync(p).filter(f=>f.endsWith('.postman_collection.json')).length)"   # 34
bash -n tests/postman/newman/run-payment-tests.sh
git grep -n "docs/api/postman\|apps/api/postman" -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers'
```

Expected: `34`, `34`, silent, and the grep empty.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(postman): one home for the collections, environments and runners

Consolidates docs/api/postman (31 collections, 8 environments, data, newman
runner), apps/api/postman (2 collections) and tests/postman (1 collection) into
tests/postman/. The 31 committed newman reports are dropped; reports/ is kept
empty and gitignored.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 6: Group `apps/api/scripts` into `seed/` and `maintenance/`

**Files:**

- Move: `apps/api/scripts/seed-{all,delivery,doctor,franchise,grocery,hotel,marketplace,partner,pharmacy,restaurant,taxi}.ts` → `apps/api/scripts/seed/`; `apps/api/scripts/{align-franchise-markets,backfill-seller-owner,sync-restaurant-tables}.ts`, `create-order-table.sql` → `apps/api/scripts/maintenance/`
- Create: `apps/api/scripts/maintenance/README.md`
- Modify: root `package.json` `db:seed:*` (4 paths), `apps/api/tsconfig.json:11` comment, `apps/api/scripts/seed/seed-all.ts` (`cwd` is `../..` now), `modules/marketplace/backend/src/catalog/catalog.service.ts:494` comment, `apps/api/scripts/maintenance/*.ts` usage comments

- [ ] **Step 1: Move**

```bash
cd apps/api/scripts && mkdir -p seed maintenance
for f in seed-*.ts; do git mv "$f" "seed/$f"; done
git mv align-franchise-markets.ts backfill-seller-owner.ts sync-restaurant-tables.ts create-order-table.sql maintenance/
cd ../../..
ls apps/api/scripts   # create-kafka-topics.js  e2e-marketplace.ts  generate-gateway-ddl.ts  maintenance  migration-baseline.ts  seed  split-databases.ts  verify-franchise-isolation.ts
```

- [ ] **Step 2: Fix the references**

Root `package.json`: `apps/api/scripts/seed-grocery.ts` → `apps/api/scripts/seed/seed-grocery.ts` (and marketplace, restaurant, pharmacy).

`apps/api/scripts/seed/seed-all.ts`: the `execSync` `cwd` is `path.join(__dirname, '..')` (was `apps/api/scripts`, must stay `apps/api`) → `path.join(__dirname, '..', '..')`.

`apps/api/scripts/maintenance/*.ts` and `create-order-table.sql` usage comments: `scripts/align-franchise-markets.ts` → `scripts/maintenance/align-franchise-markets.ts` (and the other three). `apps/api/tsconfig.json:11` comment: `scripts/seed/seed-franchise.ts`. `modules/marketplace/backend/src/catalog/catalog.service.ts:494`: `scripts/maintenance/backfill-seller-owner.ts`.

`apps/api/scripts/maintenance/README.md`:

```markdown
# One-off data repairs

Kept for reference. Each ran once against the shared `kartseek_db`; none is
part of a routine. Run any of them again only after reading its header.

| Script | What it did | When |
| --- | --- | --- |
| `align-franchise-markets.ts` | Re-pointed franchise rows at the markets in `COUNTRY_COMPLIANCE` after the multi-region work; `--apply` writes, otherwise reports. | 2026-08 |
| `backfill-seller-owner.ts` | Filled `sellers.owner_id` from the users table so seller routes could authorise on ownership; `--apply` writes. | 2026-07 |
| `sync-restaurant-tables.ts` | Recreated the restaurant tables that `synchronize` had dropped as non-entity indexes. | 2026-08 |
| `create-order-table.sql` | Hand-written DDL for `order.orders` before the migration existed. `psql -d kartseek_db -f scripts/maintenance/create-order-table.sql`. | 2026-07 |

Routine tooling lives one level up: `seed/` for demo data, `split-databases.ts`
for moving a schema into a module's own Postgres, `migration-baseline.ts` and
`generate-gateway-ddl.ts` for the migration ledger.
```

Confirm each "When" against `git log --follow --format=%as -1 -- <file>` and correct the month if it differs.

- [ ] **Step 3: Verify**

```bash
npm run type-check -w kartseek-api 2>&1 | tail -3
git grep -nE "scripts/seed-[a-z]+\.ts|scripts/(align-franchise-markets|backfill-seller-owner|sync-restaurant-tables|create-order-table)" -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!apps/api/scripts/maintenance/README.md'
```

Expected: green; grep empty.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(api): group the seed and maintenance scripts; fix start:prod

seed-*.ts move to scripts/seed/, the four one-off repairs to
scripts/maintenance/ with a README saying what each did. start:prod now points
at the rspack output path.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(If `start:prod` was already fixed in Task 1, drop that sentence.)

---

## Task 7: Dart — vendor `objective_c`, drop the debug script, rename `shared_mobile`

**Files:**

- Move: `packages/native-bindings/**` → `packages/vendor/objective_c/**`; `packages/vendor/objective_c/README.md` → `README.upstream.md`
- Create: `packages/vendor/objective_c/README.md`
- Delete: `apps/customer/lib/test_variants.dart`, `scripts/mobile/fix_objective_c_bug.ps1`, `scripts/mobile/recreate_dummy_objective_c.ps1`
- Modify: `apps/customer/pubspec.yaml:73`, `apps/partner/pubspec.yaml:58`, `packages/shared-mobile/pubspec.yaml:1,45`, `apps/{customer,partner,seller}/pubspec.yaml` (`shared_mobile:` dependency key), 331 Dart files with `package:shared_mobile/` imports, the four `pubspec.lock` files (regenerated), `.gitignore:109` comment

- [ ] **Step 1: Read the two PowerShell scripts, then write the vendor README**

```bash
cat scripts/mobile/fix_objective_c_bug.ps1 scripts/mobile/recreate_dummy_objective_c.ps1
diff <(cd packages/native-bindings && find . -type f -not -path './.dart_tool/*' | sort) <(echo) | head -40
```

Write `packages/vendor/objective_c/README.md` from what they say (the exact patch is whatever those scripts applied — describe it in one paragraph, naming the files they touch):

```markdown
# objective_c (vendored, patched)

A local copy of pub.dev `objective_c` 9.4.1, referenced by path from
`apps/customer`, `apps/partner` and `packages/shared-mobile` in place of the
hosted package.

## Why it is vendored

<one paragraph: the Windows build failure the upstream package causes, and
what was changed to work around it — taken from the two PowerShell scripts
that used to apply the patch by hand.>

## What differs from upstream

<list the patched files, one line each>

## Updating

1. `flutter pub cache` the new upstream version and copy it here.
2. Re-apply the patch above.
3. Run `flutter analyze` in the three consumers.

Upstream README: [`README.upstream.md`](README.upstream.md).
```

- [ ] **Step 2: Move, rename, delete**

```bash
mkdir -p packages/vendor
git mv packages/native-bindings packages/vendor/objective_c
git mv packages/vendor/objective_c/README.md packages/vendor/objective_c/README.upstream.md
# (then write the new README.md from Step 1)
git rm -q apps/customer/lib/test_variants.dart scripts/mobile/fix_objective_c_bug.ps1 scripts/mobile/recreate_dummy_objective_c.ps1
sed -i 's#path: \.\./\.\./packages/native-bindings#path: ../../packages/vendor/objective_c#' apps/customer/pubspec.yaml apps/partner/pubspec.yaml packages/shared-mobile/pubspec.yaml
sed -i 's#packages/ (native-bindings, shared-mobile)#packages/ (vendor/objective_c, shared-mobile)#' .gitignore
git grep -n "native-bindings" -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!*.lock'
```

Expected: the grep is empty (locks are regenerated in Step 4).

- [ ] **Step 3: Rename the Dart package (gated on the Task 0 baseline)**

Only if all four `$SCRATCH/analyze-before-*.txt` files exist and end in an `exit=` line (the baseline ran). Otherwise skip to Step 4, and Task 14's mobile READMEs say the rename is deferred.

```bash
sed -i '1s/^name: shared_mobile$/name: kartseek_shared_mobile/' packages/shared-mobile/pubspec.yaml
sed -i 's/^  shared_mobile:$/  kartseek_shared_mobile:/' apps/customer/pubspec.yaml apps/partner/pubspec.yaml apps/seller/pubspec.yaml
git grep -l "package:shared_mobile/" -- '*.dart' | xargs sed -i 's#package:shared_mobile/#package:kartseek_shared_mobile/#g'
git grep -c "package:kartseek_shared_mobile/" -- '*.dart' | awk -F: '{s+=$2} END {print s}'     # 664
git grep -n "shared_mobile" -- '*.dart' '*.yaml' ':!*.lock' | grep -v kartseek_shared_mobile
```

Expected: `664`; the last grep is empty.

- [ ] **Step 4: Regenerate the locks and analyze**

```bash
for w in packages/shared-mobile apps/customer apps/partner apps/seller; do
  (cd "$w" && flutter pub get 2>&1 | tail -2 && flutter analyze --no-pub > "$SCRATCH/analyze-after-$(basename $w).txt" 2>&1; echo "exit=$?" >> "$SCRATCH/analyze-after-$(basename $w).txt")
done
for w in shared-mobile customer partner seller; do echo "== $w"; tail -2 "$SCRATCH/analyze-before-$w.txt"; tail -2 "$SCRATCH/analyze-after-$w.txt"; done
```

Expected: for each workspace the "after" issue count is ≤ the "before" count and the exit code is not worse. The four `pubspec.lock` files now say `kartseek_shared_mobile` and `../../packages/vendor/objective_c`.

- [ ] **Step 5: Commit (two commits)**

```bash
git add packages/vendor scripts/mobile apps/customer/lib apps/customer/pubspec.yaml apps/partner/pubspec.yaml packages/shared-mobile/pubspec.yaml .gitignore
git add -A packages/vendor
git commit -m "chore(mobile): vendor objective_c under packages/vendor; drop the debug script

packages/native-bindings was a patched copy of pub.dev objective_c 9.4.1 with
an upstream README that did not say so. It is now packages/vendor/objective_c
with a README that explains the patch; the two PowerShell scripts that applied
it by hand are gone. apps/customer/lib/test_variants.dart was a debug script.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add -A
git commit -m "refactor(mobile): rename shared_mobile to kartseek_shared_mobile

Every other Dart package carries the kartseek_ prefix. 664 imports across 331
files, three app pubspecs and the package itself; directory unchanged. flutter
analyze: no new issues in any of the four workspaces.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(If Step 3 was skipped, only the first commit happens.)

---

## Task 8: `services.yaml` and `scripts/registry/validate.mjs`

**Files:**

- Create: `services.yaml`, `scripts/registry/lib.mjs`, `scripts/registry/validate.mjs`, `scripts/registry/validate.test.mjs`
- Modify (drift the validator finds): `apps/api/.env.example:132` (drop `SELLER_TCP_PORT=4019`), `apps/api/apps/api-gateway/src/config/env.validation.ts:135` (drop the `SELLER_TCP_PORT` Joi line), `infra/k8s/config.yaml:148` (drop `SELLER_TCP_PORT: "4002"`) — no service is named seller and nothing else reads the variable
- Create (placeholder for check 7 until Task 9): none — check 7 imports `renderAll` from `generate.mjs`, so Task 8 ships `generate.mjs` with `renderAll` too (Task 9 adds the CLI and README blocks)

**Interfaces:**

- Produces: `loadRegistry(root) → { file, defaults, services }`, `repoRoot(from?)`, `isNest(entry)`, `runtime(entry) → { cwd, main }`, `portDefaultIn(source, envName) → number|null`, `writeAtomic(file, content)`, `validate(root, registry?) → problems[]`, `renderAll(root, registry?) → [{ file, content, stale }]`.
- Registry entry shape (consumed by Tasks 9, 10, 14 and phases 2–5):

```yaml
- name: order-service              # unique; k8s/Compose/image name
  kind: core-service               # gateway | core-service | module-service | web-shell | web-zone
  path: apps/api/apps/order-service
  build: { workspace: kartseek-api, nestProject: order-service }   # nestProject only for gateway/core-service
  image: kartseek/order-service
  ports: { http: 3014, tcp: 4004, grpc: 5002 }
  env: { http: ORDER_SERVICE_PORT, tcp: ORDER_TCP_PORT, grpc: ORDER_GRPC_PORT }
  health: { live: /health, ready: null, metrics: null }             # phase 1 records today's routes
  database: { schema: order }      # null when the service owns no tables
  dependsOn: [postgres, redis, kafka]
  kafka: { groupId: kartseek-consumers-order-service }
  k8s: { replicas: 2 }             # optional overrides of defaults.k8s
```

- [ ] **Step 1: Write `services.yaml`**

Facts measured on 2026-09-05 (ports from each `main.ts`, health routes from each controller, schemas from `schema: '…'` in each service, Kafka groups from `@app/kafka`'s `serviceIdentity`: `kartseek-consumers-<dir name>` for core services, `kartseek-consumers-<module>-service` for module backends; `audit-log-service` and `search-service` also bind a Nest Kafka transport with their own group, recorded under `kafka.transportGroupId`).

```yaml
# KARTSEEK service registry — schema version 1.
#
# The only place that declares what is deployable, where it lives, which ports it
# binds, how it is probed and what it depends on. Readers:
#   scripts/registry/validate.mjs   fails when main.ts, .env.example, the Joi
#                                   defaults or infra/k8s/config.yaml disagree
#   scripts/registry/generate.mjs   docs/architecture/services.md + README blocks
#   tests/smoke/boot-all.mjs        boots every Nest entry and polls health.live
# Phase 2 adds the Kubernetes generator, phase 3 the Compose and image builders.
#
# health.live is each service's CURRENT liveness route. Phase 2 moves every one of
# them to /health, /health/ready and /metrics through @app/observability; until
# then a service with no HTTP health route records `live: null` and the smoke
# test falls back to a TCP connect on ports.http.
version: 1

defaults:
  registry: ghcr.io/OWNER/kartseek   # OWNER is filled in when the GitHub remote exists; --registry overrides
  node: 26.5.0
  k8s:
    replicas: 1
    resources:
      requests: { cpu: 100m, memory: 256Mi }
      limits: { cpu: 500m, memory: 512Mi }

services:
  # ── Gateway ────────────────────────────────────────────────────────────────
  - name: api-gateway
    kind: gateway
    path: apps/api/apps/api-gateway
    build: { workspace: kartseek-api, nestProject: api-gateway }
    image: kartseek/api-gateway
    ports: { http: 3001 }
    env: { http: API_GATEWAY_PORT }
    health: { live: /api/v1/health, ready: /api/v1/health/ready, metrics: null }
    database: { schema: public }     # gateway-owned tables (GatewayOwnedTables migration); phase 5 names an owner
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-api-gateway }
    k8s: { replicas: 2 }

  # ── Core services (apps/api/apps/*) ───────────────────────────────────────
  - name: auth-service
    kind: core-service
    path: apps/api/apps/auth-service
    build: { workspace: kartseek-api, nestProject: auth-service }
    image: kartseek/auth-service
    ports: { http: 3010, grpc: 5001 }
    env: { http: AUTH_SERVICE_PORT, grpc: AUTH_GRPC_PORT }
    health: { live: /health, ready: null, metrics: null }
    database: { schema: public }     # users, refresh slots — shared with user-service; see docs/architecture/data-ownership.md
    dependsOn: [postgres]
    kafka: null
    k8s: { replicas: 2 }

  - name: user-service
    kind: core-service
    path: apps/api/apps/user-service
    build: { workspace: kartseek-api, nestProject: user-service }
    image: kartseek/user-service
    ports: { http: 3011, grpc: 5009 }
    env: { http: USER_SERVICE_PORT, grpc: USER_GRPC_PORT }
    health: { live: null, ready: null, metrics: null }
    database: { schema: user }
    dependsOn: [postgres, redis]
    kafka: null

  - name: cart-service
    kind: core-service
    path: apps/api/apps/cart-service
    build: { workspace: kartseek-api, nestProject: cart-service }
    image: kartseek/cart-service
    ports: { http: 3013, tcp: 4003 }
    env: { http: CART_SERVICE_PORT, tcp: CART_TCP_PORT }
    health: { live: /cart/health, ready: null, metrics: null }
    database: null
    dependsOn: [redis, kafka]
    kafka: { groupId: kartseek-consumers-cart-service }

  - name: order-service
    kind: core-service
    path: apps/api/apps/order-service
    build: { workspace: kartseek-api, nestProject: order-service }
    image: kartseek/order-service
    ports: { http: 3014, tcp: 4004, grpc: 5002 }
    env: { http: ORDER_SERVICE_PORT, tcp: ORDER_TCP_PORT, grpc: ORDER_GRPC_PORT }
    health: { live: /health, ready: null, metrics: null }
    database: { schema: order }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-order-service }
    k8s: { replicas: 2 }

  - name: loyalty-service
    kind: core-service
    path: apps/api/apps/loyalty-service
    build: { workspace: kartseek-api, nestProject: loyalty-service }
    image: kartseek/loyalty-service
    ports: { http: 3015, tcp: 4005 }
    env: { http: LOYALTY_SERVICE_PORT, tcp: LOYALTY_TCP_PORT }
    health: { live: /loyalty/health, ready: null, metrics: null }
    database: null
    dependsOn: [redis, kafka]
    kafka: { groupId: kartseek-consumers-loyalty-service }

  - name: delivery-service
    kind: core-service
    path: apps/api/apps/delivery-service
    build: { workspace: kartseek-api, nestProject: delivery-service }
    image: kartseek/delivery-service
    ports: { http: 3022, grpc: 5008 }
    env: { http: DELIVERY_SERVICE_PORT, grpc: DELIVERY_GRPC_PORT }
    health: { live: /delivery/health, ready: null, metrics: null }
    database: { schema: delivery }   # connects with entities: []; phase 5 decides whether it owns tables
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-delivery-service }

  - name: location-service
    kind: core-service
    path: apps/api/apps/location-service
    build: { workspace: kartseek-api, nestProject: location-service }
    image: kartseek/location-service
    ports: { http: 3023, tcp: 4013 }
    env: { http: LOCATION_SERVICE_PORT, tcp: LOCATION_TCP_PORT }
    health: { live: /location/health, ready: null, metrics: null }
    database: { schema: public }
    dependsOn: [postgres, redis]
    kafka: null

  - name: wallet-service
    kind: core-service
    path: apps/api/apps/wallet-service
    build: { workspace: kartseek-api, nestProject: wallet-service }
    image: kartseek/wallet-service
    ports: { http: 3024, tcp: 4014 }
    env: { http: WALLET_SERVICE_PORT, tcp: WALLET_TCP_PORT }
    health: { live: /wallet/health, ready: null, metrics: null }
    database: { schema: public }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-wallet-service }

  - name: payment-service
    kind: core-service
    path: apps/api/apps/payment-service
    build: { workspace: kartseek-api, nestProject: payment-service }
    image: kartseek/payment-service
    ports: { http: 3025, tcp: 4026, grpc: 5003 }
    env: { http: PAYMENT_SERVICE_PORT, tcp: PAYMENT_TCP_PORT, grpc: PAYMENT_GRPC_PORT }
    health: { live: /health, ready: null, metrics: null }
    database: { schema: payment }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-payment-service }
    k8s: { replicas: 2 }

  - name: notification-service
    kind: core-service
    path: apps/api/apps/notification-service
    build: { workspace: kartseek-api, nestProject: notification-service }
    image: kartseek/notification-service
    ports: { http: 3026, grpc: 5004 }
    env: { http: NOTIFICATION_SERVICE_PORT, grpc: NOTIFICATION_GRPC_PORT }
    health: { live: /notifications/health, ready: null, metrics: null }
    database: null
    dependsOn: [redis, kafka]
    kafka: { groupId: kartseek-consumers-notification-service, extraGroups: [notification-password-reset] }

  - name: admin-service
    kind: core-service
    path: apps/api/apps/admin-service
    build: { workspace: kartseek-api, nestProject: admin-service }
    image: kartseek/admin-service
    ports: { http: 3027, tcp: 4017 }
    env: { http: ADMIN_SERVICE_PORT, tcp: ADMIN_TCP_PORT }
    health: { live: /admin/health, ready: null, metrics: null }
    database: { schema: admin }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-admin-service }

  - name: audit-log-service
    kind: core-service
    path: apps/api/apps/audit-log-service
    build: { workspace: kartseek-api, nestProject: audit-log-service }
    image: kartseek/audit-log-service
    ports: { http: 3028 }
    env: { http: AUDIT_LOG_SERVICE_PORT }
    health: { live: /audit-logs/health, ready: null, metrics: null }
    database: null                   # MongoDB (Mongoose), not Postgres
    dependsOn: [mongodb, redis, kafka]
    kafka: { groupId: kartseek-consumers-audit-log-service, transportGroupId: audit-log-consumers }

  - name: commission-service
    kind: core-service
    path: apps/api/apps/commission-service
    build: { workspace: kartseek-api, nestProject: commission-service }
    image: kartseek/commission-service
    ports: { http: 3030, tcp: 4020 }
    env: { http: COMMISSION_SERVICE_PORT, tcp: COMMISSION_TCP_PORT }
    health: { live: /commission/health, ready: null, metrics: null }
    database: { schema: commission } # entities: []; phase 5 decides
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-commission-service }

  - name: payout-service
    kind: core-service
    path: apps/api/apps/payout-service
    build: { workspace: kartseek-api, nestProject: payout-service }
    image: kartseek/payout-service
    ports: { http: 3031, tcp: 4021 }
    env: { http: PAYOUT_SERVICE_PORT, tcp: PAYOUT_TCP_PORT }
    health: { live: /payouts/health, ready: null, metrics: null }
    database: { schema: payout }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-payout-service }

  - name: refund-service
    kind: core-service
    path: apps/api/apps/refund-service
    build: { workspace: kartseek-api, nestProject: refund-service }
    image: kartseek/refund-service
    ports: { http: 3032, tcp: 4022 }
    env: { http: REFUND_SERVICE_PORT, tcp: REFUND_TCP_PORT }
    health: { live: /refunds/health, ready: null, metrics: null }
    database: { schema: refund }     # entities: []; phase 5 decides
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-refund-service }

  - name: search-service
    kind: core-service
    path: apps/api/apps/search-service
    build: { workspace: kartseek-api, nestProject: search-service }
    image: kartseek/search-service
    ports: { http: 3033, tcp: 4023 }
    env: { http: SEARCH_SERVICE_PORT, tcp: SEARCH_TCP_PORT }
    health: { live: /search/health, ready: null, metrics: null }
    database: null
    dependsOn: [redis, kafka, elasticsearch]
    kafka: { groupId: kartseek-consumers-search-service, transportGroupId: search-indexer }

  - name: report-service
    kind: core-service
    path: apps/api/apps/report-service
    build: { workspace: kartseek-api, nestProject: report-service }
    image: kartseek/report-service
    ports: { http: 3034, tcp: 4024 }
    env: { http: REPORT_SERVICE_PORT, tcp: REPORT_TCP_PORT }
    health: { live: /reports/health, ready: null, metrics: null }
    database: { schema: report }     # entities: []; phase 5 decides
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-report-service }

  # ── Module services (modules/<vertical>/backend) ──────────────────────────
  - name: marketplace-service
    kind: module-service
    path: modules/marketplace/backend
    build: { workspace: '@kartseek/marketplace-backend' }
    image: kartseek/marketplace-service
    ports: { http: 3012, tcp: 4002, grpc: 5006 }
    env: { http: MARKETPLACE_SERVICE_PORT, tcp: MARKETPLACE_TCP_PORT, grpc: MARKETPLACE_GRPC_PORT }
    health: { live: /health, ready: null, metrics: null }   # the only HTTP route HttpSurfaceGuard admits
    database: { schema: marketplace, dedicated: MARKETPLACE_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-marketplace-service }
    k8s:
      replicas: 2
      resources:
        requests: { cpu: 300m, memory: 384Mi }
        limits: { cpu: 1000m, memory: 1Gi }

  - name: franchise-service
    kind: module-service
    path: modules/franchise/backend
    build: { workspace: '@kartseek/franchise-backend' }
    image: kartseek/franchise-service
    ports: { http: 3016, tcp: 4006 }
    env: { http: FRANCHISE_SERVICE_PORT, tcp: FRANCHISE_TCP_PORT }
    health: { live: null, ready: null, metrics: null }
    database: { schema: franchise, dedicated: FRANCHISE_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-franchise-service }

  - name: doctor-service
    kind: module-service
    path: modules/doctor/backend
    build: { workspace: '@kartseek/doctor-backend' }
    image: kartseek/doctor-service
    ports: { http: 3017, tcp: 4007 }
    env: { http: DOCTOR_SERVICE_PORT, tcp: DOCTOR_TCP_PORT }
    health: { live: /doctors/health, ready: null, metrics: null }
    database: { schema: doctor, dedicated: DOCTOR_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-doctor-service }

  - name: grocery-service
    kind: module-service
    path: modules/grocery/backend
    build: { workspace: '@kartseek/grocery-backend' }
    image: kartseek/grocery-service
    ports: { http: 3018, tcp: 4008, grpc: 5010 }
    env: { http: GROCERY_SERVICE_PORT, tcp: GROCERY_TCP_PORT, grpc: GROCERY_GRPC_PORT }
    health: { live: /grocery/health, ready: null, metrics: null }
    database: { schema: grocery, dedicated: GROCERY_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-grocery-service }

  - name: restaurant-service
    kind: module-service
    path: modules/restaurant/backend
    build: { workspace: '@kartseek/restaurant-backend' }
    image: kartseek/restaurant-service
    ports: { http: 3019, tcp: 4018, grpc: 5005 }
    env: { http: RESTAURANT_SERVICE_PORT, tcp: RESTAURANT_TCP_PORT, grpc: RESTAURANT_GRPC_PORT }
    health: { live: /restaurants/health, ready: null, metrics: null }
    database: { schema: restaurant, dedicated: RESTAURANT_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-restaurant-service }

  - name: pharmacy-service
    kind: module-service
    path: modules/pharmacy/backend
    build: { workspace: '@kartseek/pharmacy-backend' }
    image: kartseek/pharmacy-service
    ports: { http: 3020, tcp: 4010 }
    env: { http: PHARMACY_SERVICE_PORT, tcp: PHARMACY_TCP_PORT }
    health: { live: /pharmacy/health, ready: null, metrics: null }
    database: { schema: pharmacy, dedicated: PHARMACY_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-pharmacy-service }

  - name: taxi-service
    kind: module-service
    path: modules/taxi/backend
    build: { workspace: '@kartseek/taxi-backend' }
    image: kartseek/taxi-service
    ports: { http: 3021, tcp: 4027, grpc: 5007 }
    env: { http: TAXI_SERVICE_PORT, tcp: TAXI_TCP_PORT, grpc: TAXI_GRPC_PORT }
    health: { live: /taxi/health, ready: null, metrics: null }
    database: { schema: taxi, dedicated: TAXI_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-taxi-service }

  - name: hotel-service
    kind: module-service
    path: modules/hotel/backend
    build: { workspace: '@kartseek/hotel-backend' }
    image: kartseek/hotel-service
    ports: { http: 3035, tcp: 4025 }
    env: { http: HOTEL_SERVICE_PORT, tcp: HOTEL_TCP_PORT }
    health: { live: /hotels/health, ready: null, metrics: null }
    database: { schema: hotel, dedicated: HOTEL_DB }
    dependsOn: [postgres, redis, kafka]
    kafka: { groupId: kartseek-consumers-hotel-service }

  # ── Web: the shell and the eight zones ────────────────────────────────────
  - name: web
    kind: web-shell
    path: apps/web
    build: { workspace: kartseek-web }
    image: kartseek/web
    ports: { http: 3000 }
    zones: [marketplace-frontend, grocery-frontend, restaurant-frontend, pharmacy-frontend, doctor-frontend, hotel-frontend, taxi-frontend, franchise-frontend]

  - { name: marketplace-frontend, kind: web-zone, path: modules/marketplace/frontend, build: { workspace: '@kartseek/marketplace-frontend' }, image: kartseek/marketplace-frontend, ports: { http: 3002 }, basePath: /marketplace }
  - { name: grocery-frontend,     kind: web-zone, path: modules/grocery/frontend,     build: { workspace: '@kartseek/grocery-frontend' },     image: kartseek/grocery-frontend,     ports: { http: 3003 }, basePath: /grocery }
  - { name: restaurant-frontend,  kind: web-zone, path: modules/restaurant/frontend,  build: { workspace: '@kartseek/restaurant-frontend' },  image: kartseek/restaurant-frontend,  ports: { http: 3004 }, basePath: /restaurant }
  - { name: pharmacy-frontend,    kind: web-zone, path: modules/pharmacy/frontend,    build: { workspace: '@kartseek/pharmacy-frontend' },    image: kartseek/pharmacy-frontend,    ports: { http: 3005 }, basePath: /pharmacy }
  - { name: doctor-frontend,      kind: web-zone, path: modules/doctor/frontend,      build: { workspace: '@kartseek/doctor-frontend' },      image: kartseek/doctor-frontend,      ports: { http: 3006 }, basePath: /doctor }
  - { name: hotel-frontend,       kind: web-zone, path: modules/hotel/frontend,       build: { workspace: '@kartseek/hotel-frontend' },       image: kartseek/hotel-frontend,       ports: { http: 3007 }, basePath: /hotel-booking }
  - { name: taxi-frontend,        kind: web-zone, path: modules/taxi/frontend,        build: { workspace: '@kartseek/taxi-frontend' },        image: kartseek/taxi-frontend,        ports: { http: 3008 }, basePath: /taxi }
  - { name: franchise-frontend,   kind: web-zone, path: modules/franchise/frontend,   build: { workspace: '@kartseek/franchise-frontend' },   image: kartseek/franchise-frontend,   ports: { http: 3009 }, basePath: /franchise }
```

Before committing, confirm the three `public` schemas (auth, location, wallet) with `git grep -n "schema" -- apps/api/apps/{auth,location,wallet}-service/src` and change any that names a schema.

- [ ] **Step 2: Write `scripts/registry/lib.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export const KINDS = ['gateway', 'core-service', 'module-service', 'web-shell', 'web-zone'];
export const NEST_KINDS = ['gateway', 'core-service', 'module-service'];

/** The directory that holds services.yaml, found by walking up from `from`. */
export function repoRoot(from = process.cwd()) {
  let dir = path.resolve(from);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'services.yaml')) && fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`no services.yaml above ${from}`);
    dir = parent;
  }
}

export function loadRegistry(root) {
  const file = path.join(root, 'services.yaml');
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  if (!doc || doc.version !== 1) throw new Error(`${file}: expected "version: 1"`);
  if (!Array.isArray(doc.services)) throw new Error(`${file}: "services" must be a list`);
  return { file, defaults: doc.defaults ?? {}, services: doc.services };
}

export const isNest = (entry) => NEST_KINDS.includes(entry.kind);

/** Where `node` runs the built entry from, and the entry file, per kind. */
export function runtime(entry) {
  if (entry.kind === 'module-service') return { cwd: entry.path, main: 'dist/main.js' };
  if (isNest(entry)) return { cwd: 'apps/api', main: `dist/apps/${entry.build.nestProject}/main.js` };
  return { cwd: entry.path, main: null };
}

/**
 * The numeric default a main.ts gives `process.env.<envName>`: the first 4–5
 * digit literal after the reference, inside the same statement.
 *   const httpPort = +(process.env.ORDER_SERVICE_PORT ?? 3014);   → 3014
 *   const port = process.env.API_GATEWAY_PORT || 3001;            → 3001
 */
export function portDefaultIn(source, envName) {
  const re = new RegExp(`process\\.env\\.${envName}\\b[^;]*?\\b(\\d{4,5})\\b`);
  const m = re.exec(source);
  return m ? Number(m[1]) : null;
}

/** Write to a sibling temp file, then rename — never a half-written artifact. */
export function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

export const toPosix = (p) => p.split(path.sep).join('/');
```

- [ ] **Step 3: Write `scripts/registry/generate.mjs` (the `renderAll` half; the CLI is finished in Task 9)**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, repoRoot, isNest, writeAtomic, toPosix } from './lib.mjs';

export const START = '<!-- registry:start -->';
export const END = '<!-- registry:end -->';

const code = (s) => (s == null ? '—' : `\`${s}\``);
const port = (e, k) => (e.ports?.[k] ? `${e.ports[k]}${e.env?.[k] ? ` \`${e.env[k]}\`` : ''}` : '—');
const probe = (e) => (isNest(e) ? (e.health?.live ? `\`GET ${e.health.live}\`` : 'TCP connect') : e.basePath ? `basePath \`${e.basePath}\`` : '—');

function table(entries) {
  const rows = entries.map((e) => `| \`${e.name}\` | ${e.kind} | ${port(e, 'http')} | ${port(e, 'tcp')} | ${port(e, 'grpc')} | ${probe(e)} |`);
  return ['| Deployable | Kind | HTTP | TCP | gRPC | Probe |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function block(entries, readmeDir, root) {
  const rel = toPosix(path.relative(readmeDir, path.join(root, 'services.yaml')));
  return [
    START,
    `_Generated from [\`services.yaml\`](${rel}) by \`node scripts/registry/generate.mjs\`. Edit the registry, not this table._`,
    '',
    table(entries),
    END,
  ].join('\n');
}

function servicesDoc(registry) {
  const { services, defaults } = registry;
  const row = (e) =>
    `| \`${e.name}\` | ${e.kind} | \`${e.path}\` | ${port(e, 'http')} | ${port(e, 'tcp')} | ${port(e, 'grpc')} | ${probe(e)} | ${
      e.database?.schema ? `\`${e.database.schema}\`${e.database.dedicated ? ` (own DB via \`${e.database.dedicated}_*\`)` : ''}` : '—'
    } | ${(e.dependsOn ?? []).join(', ') || '—'} | ${code(e.kafka?.groupId)} |`;
  return [
    '# Services',
    '',
    `_Generated from [\`services.yaml\`](../../services.yaml) by \`node scripts/registry/generate.mjs\`. Edit the registry, not this file._`,
    '',
    `${services.length} deployables: ${services.filter((e) => e.kind === 'gateway').length} gateway, ${services.filter((e) => e.kind === 'core-service').length} core services, ${services.filter((e) => e.kind === 'module-service').length} module services, ${services.filter((e) => e.kind === 'web-shell').length} web shell, ${services.filter((e) => e.kind === 'web-zone').length} web zones. Images are published to \`${defaults.registry}\`; Node ${defaults.node}.`,
    '',
    '| Name | Kind | Path | HTTP | TCP | gRPC | Probe | Postgres schema | Depends on | Kafka group |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...services.map(row),
    '',
    'Probe is the liveness route as it exists today; phase 2 moves every Nest deployable to `/health`, `/health/ready` and `/metrics`.',
    '',
  ].join('\n');
}

/** Every README that carries a registry block, with the entries it lists. */
function readmeTargets(registry) {
  const { services } = registry;
  const targets = new Map();
  const add = (dir, e) => targets.set(dir, [...(targets.get(dir) ?? []), e]);
  for (const e of services) {
    if (e.kind === 'gateway' || e.kind === 'core-service') add('apps/api', e);
    else add(e.path, e);
  }
  return targets;
}

function spliceBlock(existing, name, blockText) {
  if (existing == null) return `# ${name}\n\n${blockText}\n`;
  const s = existing.indexOf(START);
  const en = existing.indexOf(END);
  if (s < 0 || en < 0 || en < s) return `${existing.replace(/\s*$/, '')}\n\n${blockText}\n`;
  return existing.slice(0, s) + blockText + existing.slice(en + END.length);
}

/** Render every artifact; `stale` is true when the file on disk differs. */
export function renderAll(root, registry = loadRegistry(root)) {
  const out = [];
  const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
  const svc = path.join(root, 'docs/architecture/services.md');
  const svcContent = servicesDoc(registry);
  out.push({ file: svc, content: svcContent, stale: read(svc) !== svcContent });
  for (const [dir, entries] of readmeTargets(registry)) {
    const file = path.join(root, dir, 'README.md');
    const existing = read(file);
    const content = spliceBlock(existing, path.basename(dir) === 'api' ? 'kartseek-api' : entries[0].name, block(entries, path.dirname(file), root));
    out.push({ file, content, stale: existing !== content });
  }
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const root = repoRoot();
  const check = argv.includes('--check');
  const results = renderAll(root);
  const stale = results.filter((r) => r.stale);
  if (check) {
    for (const r of stale) console.error(`stale: ${toPosix(path.relative(root, r.file))}`);
    if (stale.length) { console.error(`${stale.length} generated file(s) out of date — run: node scripts/registry/generate.mjs`); return 1; }
    console.log(`${results.length} generated files current`);
    return 0;
  }
  for (const r of stale) { writeAtomic(r.file, r.content); console.log(`wrote ${toPosix(path.relative(root, r.file))}`); }
  console.log(`${stale.length} file(s) written, ${results.length - stale.length} unchanged`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
```

- [ ] **Step 4: Write `scripts/registry/validate.mjs`**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KINDS, isNest, loadRegistry, portDefaultIn, repoRoot, toPosix } from './lib.mjs';
import { renderAll } from './generate.mjs';

const PORT_KEY = /^([A-Z0-9_]+)_(SERVICE|TCP|GRPC)_PORT$/;
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const dotenvPairs = (text) =>
  text.split(/\r?\n/).map((l, i) => { const m = /^\s*([A-Z0-9_]+)\s*=\s*(\d+)\s*$/.exec(l); return m && { key: m[1], value: m[2], line: i + 1 }; }).filter(Boolean);
const yamlPairs = (text) =>
  text.split(/\r?\n/).map((l, i) => { const m = /^\s*([A-Z0-9_]+):\s*"?(\d+)"?\s*$/.exec(l); return m && { key: m[1], value: m[2], line: i + 1 }; }).filter(Boolean);
const joiPairs = (text) =>
  text.split(/\r?\n/).map((l, i) => { const m = /^\s*([A-Z0-9_]+):\s*Joi\.number\(\)(?:\.port\(\))?\.default\((\d+)\)/.exec(l); return m && { key: m[1], value: m[2], line: i + 1 }; }).filter(Boolean);

/** Every problem in the registry and the files it governs. Empty means valid. */
export function validate(root, registry = loadRegistry(root), { checkGenerated = true } = {}) {
  const problems = [];
  const fail = (entry, file, message) => problems.push({ entry: entry?.name ?? '-', file, message });
  const { services, file: regFile } = registry;
  const reg = toPosix(path.relative(root, regFile));

  // 0. shape
  const names = new Set();
  for (const e of services) {
    if (!e.name) { fail(e, reg, 'entry without a name'); continue; }
    if (names.has(e.name)) fail(e, reg, 'duplicate name');
    names.add(e.name);
    if (!KINDS.includes(e.kind)) fail(e, reg, `kind must be one of: ${KINDS.join(', ')}`);
    if (!e.path) fail(e, reg, 'missing path');
    if (!e.ports?.http) fail(e, reg, 'missing ports.http');
    if (!e.image) fail(e, reg, 'missing image');
    if (isNest(e)) {
      if (!e.build?.workspace) fail(e, reg, 'missing build.workspace');
      if (e.kind !== 'module-service' && !e.build?.nestProject) fail(e, reg, 'missing build.nestProject');
      if (!e.health || !('live' in e.health)) fail(e, reg, 'missing health.live (use null when there is no HTTP route)');
      for (const k of Object.keys(e.ports ?? {})) if (!e.env?.[k]) fail(e, reg, `ports.${k} has no env.${k}`);
      for (const k of Object.keys(e.env ?? {})) if (!e.ports?.[k]) fail(e, reg, `env.${k} has no ports.${k}`);
    }
    if (e.kind === 'web-zone' && !e.basePath) fail(e, reg, 'web-zone needs basePath');
  }

  // 1. paths
  for (const e of services) {
    if (!e.path) continue;
    if (!exists(root, e.path)) { fail(e, e.path, 'path does not exist'); continue; }
    const marker = isNest(e) ? 'src/main.ts' : 'next.config.mjs';
    if (!exists(root, path.join(e.path, marker))) fail(e, toPosix(path.join(e.path, marker)), 'missing');
  }

  // 2. coverage: nest-cli applications and module workspaces map 1:1
  if (exists(root, 'apps/api/nest-cli.json')) {
    const cli = JSON.parse(read(root, 'apps/api/nest-cli.json'));
    const apps = Object.entries(cli.projects ?? {}).filter(([, p]) => p.type === 'application').map(([n]) => n);
    const byProject = new Map(services.filter((e) => e.build?.nestProject).map((e) => [e.build.nestProject, e]));
    for (const p of apps) if (!byProject.has(p)) fail(null, 'apps/api/nest-cli.json', `application "${p}" has no registry entry`);
    for (const [p, e] of byProject) if (!apps.includes(p)) fail(e, 'apps/api/nest-cli.json', `nestProject "${p}" is not a nest-cli application`);
  }
  const byPath = new Map(services.map((e) => [toPosix(e.path ?? ''), e]));
  if (exists(root, 'modules')) {
    for (const m of fs.readdirSync(path.join(root, 'modules'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
      for (const [side, kind] of [['backend', 'module-service'], ['frontend', 'web-zone']]) {
        const p = `modules/${m}/${side}`;
        if (!exists(root, `${p}/package.json`)) continue;
        const e = byPath.get(p);
        if (!e) fail(null, p, 'workspace has no registry entry');
        else if (e.kind !== kind) fail(e, p, `kind should be ${kind}`);
      }
    }
  }
  if (exists(root, 'apps/web/package.json') && !byPath.has('apps/web')) fail(null, 'apps/web', 'the shell has no registry entry');

  // 3. main.ts defaults and env var names
  for (const e of services.filter(isNest)) {
    const file = toPosix(path.join(e.path ?? '', 'src/main.ts'));
    if (!exists(root, file)) continue;
    const src = read(root, file);
    for (const [k, envName] of Object.entries(e.env ?? {})) {
      if (!src.includes(`process.env.${envName}`)) { fail(e, file, `does not read process.env.${envName}`); continue; }
      const found = portDefaultIn(src, envName);
      if (found === null) fail(e, file, `no numeric default after process.env.${envName}`);
      else if (found !== e.ports[k]) fail(e, file, `${envName} defaults to ${found}, registry says ${e.ports[k]}`);
    }
  }

  // 4 + 5. .env.example files, the gateway's Joi defaults, the ConfigMap
  const owners = new Map();
  for (const e of services) for (const [k, envName] of Object.entries(e.env ?? {})) owners.set(envName, { entry: e, port: e.ports[k] });
  const checkPairs = (file, pairs) => {
    for (const { key, value, line } of pairs) {
      if (!PORT_KEY.test(key)) continue;
      const o = owners.get(key);
      if (!o) fail(null, `${file}:${line}`, `${key} belongs to no registry entry`);
      else if (Number(value) !== o.port) fail(o.entry, `${file}:${line}`, `${key}=${value}, registry says ${o.port}`);
    }
  };
  const envFiles = ['apps/api/.env.example', ...(exists(root, 'modules') ? fs.readdirSync(path.join(root, 'modules')).map((m) => `modules/${m}/backend/.env.example`) : [])];
  for (const f of envFiles) if (exists(root, f)) checkPairs(f, dotenvPairs(read(root, f)));
  const joi = 'apps/api/apps/api-gateway/src/config/env.validation.ts';
  if (exists(root, joi)) checkPairs(joi, joiPairs(read(root, joi)));
  const cm = 'infra/k8s/config.yaml';
  if (exists(root, cm)) checkPairs(cm, yamlPairs(read(root, cm)));

  // 6. uniqueness
  const seen = { port: new Map(), group: new Map(), image: new Map() };
  const unique = (kind, key, e, label) => { if (key == null) return; const prev = seen[kind].get(key); if (prev) fail(e, reg, `${label} ${key} already used by ${prev}`); else seen[kind].set(key, e.name); };
  for (const e of services) {
    for (const [k, p] of Object.entries(e.ports ?? {})) unique('port', p, e, `port (${k})`);
    unique('group', e.kafka?.groupId, e, 'kafka group');
    unique('group', e.kafka?.transportGroupId, e, 'kafka transport group');
    for (const g of e.kafka?.extraGroups ?? []) unique('group', g, e, 'kafka group');
    unique('image', e.image, e, 'image');
  }

  // 7. generated artifacts are current
  if (checkGenerated) for (const r of renderAll(root, registry)) if (r.stale) fail(null, toPosix(path.relative(root, r.file)), 'stale — run: node scripts/registry/generate.mjs');

  return problems;
}

export function main() {
  const root = repoRoot();
  const problems = validate(root);
  for (const p of problems) console.error(`${p.file}: [${p.entry}] ${p.message}`);
  if (problems.length) { console.error(`${problems.length} problem(s) in services.yaml or the files it governs`); return 1; }
  console.log(`services.yaml: ${loadRegistry(root).services.length} entries valid`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
```

- [ ] **Step 5: Write `scripts/registry/validate.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validate } from './validate.mjs';
import { portDefaultIn } from './lib.mjs';

/** A minimal repository: one core service, one module, one zone, the shell. */
function fixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-'));
  const w = (rel, content) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); };
  w('package.json', '{}');
  w('apps/api/nest-cli.json', JSON.stringify({ projects: { 'order-service': { type: 'application' }, common: { type: 'library' } } }));
  w('apps/api/apps/order-service/src/main.ts', `const httpPort = +(process.env.ORDER_SERVICE_PORT ?? ${overrides.mainPort ?? 3014});\nconst tcp = +(process.env.ORDER_TCP_PORT ?? 4004);\n`);
  w('apps/api/.env.example', `ORDER_TCP_PORT=${overrides.envPort ?? 4004}\nDB_PORT=5432\n`);
  w('apps/api/apps/api-gateway/src/config/env.validation.ts', `  ORDER_TCP_PORT: Joi.number().port().default(${overrides.joiPort ?? 4004}),\n`);
  w('infra/k8s/config.yaml', `data:\n  ORDER_SERVICE_PORT: "${overrides.cmPort ?? 3014}"\n${overrides.extraCm ?? ''}`);
  w('modules/grocery/backend/package.json', '{}');
  w('modules/grocery/backend/src/main.ts', 'const p = +(process.env.GROCERY_SERVICE_PORT ?? 3018);\n');
  w('modules/grocery/frontend/package.json', '{}');
  w('modules/grocery/frontend/next.config.mjs', 'export default {};\n');
  w('apps/web/package.json', '{}');
  w('apps/web/next.config.mjs', 'export default {};\n');
  w('services.yaml', `version: 1
defaults: { registry: ghcr.io/x/kartseek, node: 26.5.0 }
services:
  - { name: order-service, kind: core-service, path: apps/api/apps/order-service, build: { workspace: kartseek-api, nestProject: order-service }, image: kartseek/order-service, ports: { http: 3014, tcp: 4004 }, env: { http: ORDER_SERVICE_PORT, tcp: ORDER_TCP_PORT }, health: { live: /health }, database: null, kafka: { groupId: g-order } }
  - { name: grocery-service, kind: module-service, path: modules/grocery/backend, build: { workspace: '@kartseek/grocery-backend' }, image: kartseek/grocery-service, ports: { http: ${overrides.groceryPort ?? 3018} }, env: { http: GROCERY_SERVICE_PORT }, health: { live: null }, database: null, kafka: { groupId: ${overrides.groceryGroup ?? 'g-grocery'} } }
  - { name: grocery-frontend, kind: web-zone, path: modules/grocery/frontend, build: { workspace: '@kartseek/grocery-frontend' }, image: kartseek/grocery-frontend, ports: { http: 3003 }, basePath: /grocery }
  - { name: web, kind: web-shell, path: apps/web, build: { workspace: kartseek-web }, image: kartseek/web, ports: { http: 3000 } }
${overrides.extraEntry ?? ''}`);
  return root;
}
const run = (root) => validate(root, undefined, { checkGenerated: false });
const messages = (root) => run(root).map((p) => `${p.entry}: ${p.message}`);

test('a consistent fixture has no problems', () => { assert.deepEqual(run(fixture()), []); });

test('portDefaultIn reads ?? and || defaults', () => {
  assert.equal(portDefaultIn('const p = +(process.env.X_PORT ?? 3014);', 'X_PORT'), 3014);
  assert.equal(portDefaultIn('const port = process.env.API_GATEWAY_PORT || 3001;', 'API_GATEWAY_PORT'), 3001);
  assert.equal(portDefaultIn('log(process.env.X_PORT); const p = +(process.env.X_PORT ?? 3014);', 'X_PORT'), 3014);
  assert.equal(portDefaultIn('const p = process.env.X_PORT;', 'X_PORT'), null);
});

test('a main.ts default that disagrees is reported with both numbers', () => {
  const m = messages(fixture({ mainPort: 3999 }));
  assert.ok(m.some((x) => x.includes('ORDER_SERVICE_PORT defaults to 3999, registry says 3014')), m.join('\n'));
});

test('.env.example, Joi defaults and the ConfigMap are checked', () => {
  assert.ok(messages(fixture({ envPort: 4444 })).some((x) => x.includes('ORDER_TCP_PORT=4444')));
  assert.ok(messages(fixture({ joiPort: 4445 })).some((x) => x.includes('ORDER_TCP_PORT=4445')));
  assert.ok(messages(fixture({ cmPort: 3333 })).some((x) => x.includes('ORDER_SERVICE_PORT=3333')));
});

test('a port key nobody owns is a problem', () => {
  assert.ok(messages(fixture({ extraCm: '  SELLER_TCP_PORT: "4002"\n' })).some((x) => x.includes('SELLER_TCP_PORT belongs to no registry entry')));
});

test('duplicate ports and kafka groups are reported', () => {
  assert.ok(messages(fixture({ groceryPort: 3014 })).some((x) => x.includes('port (http) 3014 already used by order-service')));
  assert.ok(messages(fixture({ groceryGroup: 'g-order' })).some((x) => x.includes('kafka group g-order already used by order-service')));
});

test('a workspace without an entry, and an entry without a path, are reported', () => {
  const root = fixture();
  fs.mkdirSync(path.join(root, 'modules/hotel/backend/src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'modules/hotel/backend/package.json'), '{}');
  assert.ok(messages(root).some((x) => x.includes('workspace has no registry entry')));
  const root2 = fixture({ extraEntry: "  - { name: ghost, kind: core-service, path: apps/api/apps/ghost, build: { workspace: kartseek-api, nestProject: ghost }, image: kartseek/ghost, ports: { http: 3099 }, env: { http: GHOST_SERVICE_PORT }, health: { live: null } }\n" });
  const m2 = messages(root2);
  assert.ok(m2.some((x) => x.includes('path does not exist')));
  assert.ok(m2.some((x) => x.includes('nestProject "ghost" is not a nest-cli application')));
});
```

- [ ] **Step 6: Run the tests, then the validator against the real tree**

```bash
node --test scripts/registry/validate.test.mjs
node scripts/registry/validate.mjs
```

Expected: tests pass. The validator's first real run lists at least: `apps/api/.env.example:132: [-] SELLER_TCP_PORT belongs to no registry entry`, the same for `env.validation.ts:135` and `infra/k8s/config.yaml:148`, and `docs/architecture/services.md … stale` plus every README `stale` (generated in Task 9). Fix the three `SELLER_TCP_PORT` lines (delete them). Any *other* port disagreement it prints is real drift — fix the non-registry side to match `main.ts`, since `main.ts` is what actually binds.

Then:

```bash
node scripts/registry/generate.mjs      # writes services.md and creates minimal READMEs with the block
node scripts/registry/validate.mjs      # expect: services.yaml: 35 entries valid
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(registry): add services.yaml and a validator for ports, paths and env names

One declaration of the 35 deployables. validate.mjs checks that every path
exists, every nest-cli application and module workspace has exactly one entry,
each main.ts default and env var name match, .env.example / the gateway's Joi
defaults / infra/k8s/config.yaml agree, no port or Kafka group is shared, and
the generated docs are current. Drops SELLER_TCP_PORT from the three places
that still declared it for a service that does not exist.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 9: `generate.mjs` — services table and README blocks, with tests

**Files:**

- Modify: `scripts/registry/generate.mjs` (already complete from Task 8 Step 3 — this task adds the test and wires `--check` into the gate)
- Create: `scripts/registry/generate.test.mjs`

- [ ] **Step 1: Write `scripts/registry/generate.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderAll, START, END } from './generate.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-'));
  const w = (rel, c) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), c); };
  w('package.json', '{}');
  w('services.yaml', `version: 1
defaults: { registry: ghcr.io/x/kartseek, node: 26.5.0 }
services:
  - { name: order-service, kind: core-service, path: apps/api/apps/order-service, build: { workspace: kartseek-api, nestProject: order-service }, image: kartseek/order-service, ports: { http: 3014, tcp: 4004 }, env: { http: ORDER_SERVICE_PORT, tcp: ORDER_TCP_PORT }, health: { live: /health }, database: { schema: order }, dependsOn: [postgres], kafka: { groupId: g } }
  - { name: grocery-frontend, kind: web-zone, path: modules/grocery/frontend, build: { workspace: '@kartseek/grocery-frontend' }, image: kartseek/grocery-frontend, ports: { http: 3003 }, basePath: /grocery }
`);
  return root;
}

test('renders services.md and one README block per workspace', () => {
  const root = fixture();
  const out = renderAll(root);
  const files = out.map((r) => path.relative(root, r.file).split(path.sep).join('/'));
  assert.deepEqual(files.sort(), ['apps/api/README.md', 'docs/architecture/services.md', 'modules/grocery/frontend/README.md']);
  const svc = out.find((r) => r.file.endsWith('services.md')).content;
  assert.match(svc, /\| `order-service` \| core-service \| `apps\/api\/apps\/order-service` \| 3014 `ORDER_SERVICE_PORT` \| 4004 `ORDER_TCP_PORT` \| — \| `GET \/health` \| `order` \| postgres \| `g` \|/);
  assert.match(svc, /basePath `\/grocery`/);
  assert.ok(out.every((r) => r.stale), 'nothing exists yet, so everything is stale');
});

test('the block is spliced between the markers and the rest of the README is kept', () => {
  const root = fixture();
  const readme = path.join(root, 'apps/api/README.md');
  fs.mkdirSync(path.dirname(readme), { recursive: true });
  fs.writeFileSync(readme, `# kartseek-api\n\nHand-written intro.\n\n${START}\nold table\n${END}\n\nHand-written outro.\n`);
  const r = renderAll(root).find((x) => x.file === readme);
  assert.match(r.content, /Hand-written intro\./);
  assert.match(r.content, /Hand-written outro\./);
  assert.doesNotMatch(r.content, /old table/);
  assert.match(r.content, /\| `order-service` \|/);
  assert.match(r.content, /\]\(\.\.\/\.\.\/services\.yaml\)/, 'link is relative to the README');
  fs.writeFileSync(readme, r.content);
  assert.equal(renderAll(root).find((x) => x.file === readme).stale, false, 'idempotent');
});

test('a README with no markers gets the block appended', () => {
  const root = fixture();
  const readme = path.join(root, 'modules/grocery/frontend/README.md');
  fs.mkdirSync(path.dirname(readme), { recursive: true });
  fs.writeFileSync(readme, '# grocery-frontend\n\nSome text.\n');
  const r = renderAll(root).find((x) => x.file === readme);
  assert.match(r.content, /Some text\.\n\n<!-- registry:start -->/);
});
```

- [ ] **Step 2: Run tests and the check mode**

```bash
node --test scripts/registry/
node scripts/registry/generate.mjs --check
```

Expected: all tests pass; `4 generated files current` (services.md, apps/api, apps/web, and 16 module READMEs = 19 — the number printed is the count of targets; assert it equals 19).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(registry): generate the services table and README port blocks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 10: `tests/smoke/boot-all.mjs`

**Files:**

- Create: `tests/smoke/boot-all.mjs`, `tests/smoke/boot-all.test.mjs`

**Interfaces:**

- Consumes: `loadRegistry`, `isNest`, `runtime` from `scripts/registry/lib.mjs`.
- CLI: `node tests/smoke/boot-all.mjs [--only a,b] [--timeout 90] [--concurrency 6] [--keep]`. Exit 0 when every Nest entry answered; 1 otherwise. Logs under `tests/smoke/logs/<name>.log`.

- [ ] **Step 1: Write `tests/smoke/boot-all.mjs`**

```js
#!/usr/bin/env node
/**
 * Boot every Nest deployable in services.yaml from its built entry, poll its
 * liveness route (or TCP-connect its HTTP port when it has none), print a
 * table and exit non-zero on any failure.
 *
 *   npm run build && node tests/smoke/boot-all.mjs
 *   node tests/smoke/boot-all.mjs --only order-service,grocery-service --timeout 120
 *
 * Services boot in batches (--concurrency, default 6) and are stopped after
 * their probe: liveness does not need neighbours, and 26 processes at once on
 * a laptop read exactly like failures. --keep leaves them running.
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isNest, loadRegistry, repoRoot, runtime } from '../../scripts/registry/lib.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const only = opt('only', '')?.split(',').filter(Boolean);
const timeoutMs = Number(opt('timeout', 90)) * 1000;
const concurrency = Number(opt('concurrency', 6));
const keep = args.includes('--keep');

export function probeUrl(entry) {
  return entry.health?.live ? `http://127.0.0.1:${entry.ports.http}${entry.health.live}` : null;
}

async function httpOk(url) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); return r.status === 200; } catch { return false; }
}

function tcpOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.setTimeout(2000, () => { s.destroy(); resolve(false); });
  });
}

export async function waitUp(entry, deadline) {
  const url = probeUrl(entry);
  while (Date.now() < deadline) {
    if (url ? await httpOk(url) : await tcpOpen(entry.ports.http)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function bootOne(root, entry, logDir) {
  const { cwd, main } = runtime(entry);
  const entryFile = path.join(root, cwd, main);
  if (!fs.existsSync(entryFile)) return { error: `missing ${path.relative(root, entryFile)} — run npm run build` };
  const log = fs.openSync(path.join(logDir, `${entry.name}.log`), 'w');
  const child = spawn(process.execPath, [main], { cwd: path.join(root, cwd), stdio: ['ignore', log, log], env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' } });
  return { child, log };
}

function stop(proc) {
  if (!proc?.child || proc.child.exitCode !== null) return;
  proc.child.kill();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(proc.child.pid), '/T', '/F'], { stdio: 'ignore' });
}

export async function main() {
  const root = repoRoot();
  const entries = loadRegistry(root).services.filter(isNest).filter((e) => !only?.length || only.includes(e.name));
  if (!entries.length) { console.error('no Nest entries selected'); return 1; }
  const logDir = path.join(root, 'tests/smoke/logs');
  fs.mkdirSync(logDir, { recursive: true });
  const results = [];
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency);
    const started = batch.map((e) => ({ e, t0: Date.now(), proc: bootOne(root, e, logDir) }));
    await Promise.all(started.map(async (s) => {
      if (s.proc.error) { results.push({ name: s.e.name, ok: false, ms: 0, note: s.proc.error }); return; }
      const ok = await waitUp(s.e, s.t0 + timeoutMs);
      const exited = s.proc.child.exitCode !== null;
      results.push({ name: s.e.name, ok, ms: Date.now() - s.t0, note: ok ? (probeUrl(s.e) ? `GET ${s.e.health.live}` : `tcp ${s.e.ports.http}`) : exited ? `exited ${s.proc.child.exitCode}; see tests/smoke/logs/${s.e.name}.log` : `timeout after ${timeoutMs / 1000}s; see tests/smoke/logs/${s.e.name}.log` });
    }));
    if (!keep) for (const s of started) { stop(s.proc); if (s.proc.log) fs.closeSync(s.proc.log); }
  }
  const w = Math.max(...results.map((r) => r.name.length));
  console.log(`\n${'service'.padEnd(w)}  result  time    probe`);
  for (const r of results) console.log(`${r.name.padEnd(w)}  ${r.ok ? 'up  ' : 'FAIL'}   ${String(Math.round(r.ms / 1000)).padStart(3)}s   ${r.note}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} up${failed.length ? `, ${failed.length} failed` : ''}`);
  return failed.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((code) => process.exit(code));
```

- [ ] **Step 2: Write `tests/smoke/boot-all.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { probeUrl, waitUp } from './boot-all.mjs';

test('probeUrl uses the registry health route on 127.0.0.1', () => {
  assert.equal(probeUrl({ ports: { http: 3014 }, health: { live: '/health' } }), 'http://127.0.0.1:3014/health');
  assert.equal(probeUrl({ ports: { http: 3011 }, health: { live: null } }), null);
});

test('waitUp resolves true once the route answers 200, and falls back to TCP when there is no route', async () => {
  const srv = http.createServer((req, res) => { res.statusCode = req.url === '/health' ? 200 : 404; res.end(); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  assert.equal(await waitUp({ ports: { http: port }, health: { live: '/health' } }, Date.now() + 5000), true);
  assert.equal(await waitUp({ ports: { http: port }, health: { live: null } }, Date.now() + 5000), true);
  assert.equal(await waitUp({ ports: { http: port }, health: { live: '/nope' } }, Date.now() + 1500), false);
  srv.close();
});
```

- [ ] **Step 3: Test, then try it on two services**

```bash
node --test tests/smoke/
npm run build -w kartseek-api -w @kartseek/grocery-backend 2>&1 | tail -3
node tests/smoke/boot-all.mjs --only order-service,grocery-service --timeout 60
```

Expected: tests pass; the table shows both `up`. If a service reports `exited`, read its log — the usual causes are infrastructure not running (`npm run infra:up`) or `.env` missing in `apps/api` / `modules/<m>/backend`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(smoke): boot every Nest deployable from the registry and poll its health route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 11: `scripts/docs/check-links.mjs`

**Files:**

- Create: `scripts/docs/check-links.mjs`, `scripts/docs/check-links.test.mjs`

- [ ] **Step 1: Write the checker**

```js
#!/usr/bin/env node
/**
 * Resolve every relative Markdown link in tracked .md files and fail on a
 * missing target. External links, anchors and mailto: are skipped; code spans
 * and fenced blocks are ignored. Historical material is excluded because it
 * describes a tree that no longer exists.
 *
 *   node scripts/docs/check-links.mjs           # whole repo
 *   node scripts/docs/check-links.mjs docs/     # one subtree
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const EXCLUDE = [/^docs\/archive\//, /^docs\/audits\//, /^packages\/vendor\//, /^packages\/Newtonsoft/, /^\.claude\//, /^skills\//, /node_modules\//];

export function listMarkdown(root, subtree = '') {
  const out = execFileSync('git', ['ls-files', '--', `${subtree || '.'}`], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter((f) => f.endsWith('.md') && !EXCLUDE.some((re) => re.test(f)));
}

function stripCode(md) {
  return md.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' ')).replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

/** [text](target), [ref]: target, <target.md>; returns { target, line } per link. */
export function extractLinks(md) {
  const links = [];
  const text = stripCode(md);
  const lineOf = (idx) => text.slice(0, idx).split('\n').length;
  for (const m of text.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) links.push({ target: m[1], line: lineOf(m.index) });
  for (const m of text.matchAll(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?\s*$/gm)) links.push({ target: m[1], line: lineOf(m.index) });
  return links;
}

const isExternal = (t) => /^(https?:|mailto:|tel:|data:|#)/i.test(t);

export function checkFile(root, file, md = fs.readFileSync(path.join(root, file), 'utf8')) {
  const problems = [];
  for (const { target, line } of extractLinks(md)) {
    if (isExternal(target)) continue;
    const clean = decodeURIComponent(target.split('#')[0].split('?')[0]);
    if (!clean) continue;
    const abs = clean.startsWith('/') ? path.join(root, clean) : path.resolve(root, path.dirname(file), clean);
    if (!fs.existsSync(abs)) problems.push({ file, line, target });
  }
  return problems;
}

export function main(argv = process.argv.slice(2)) {
  const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const files = listMarkdown(root, argv[0] ?? '');
  const problems = files.flatMap((f) => checkFile(root, f));
  for (const p of problems) console.error(`${p.file}:${p.line}: missing link target: ${p.target}`);
  if (problems.length) { console.error(`${problems.length} broken link(s) in ${files.length} Markdown files`); return 1; }
  console.log(`${files.length} Markdown files, all relative links resolve`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
```

- [ ] **Step 2: Write the test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFile, extractLinks } from './check-links.mjs';

test('extractLinks finds inline, reference and angle-bracket links but not code', () => {
  const md = 'See [a](../a.md) and [b][ref] and <c.md>.\n\n[ref]: ./b.md "title"\n\n`[x](in-code.md)`\n\n```\n[y](fenced.md)\n```\n';
  assert.deepEqual(extractLinks(md).map((l) => l.target), ['../a.md', './b.md']);
});

test('checkFile reports missing targets with the line number and resolves relative to the file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
  fs.mkdirSync(path.join(root, 'docs/guides'), { recursive: true });
  fs.writeFileSync(path.join(root, 'README.md'), '# r\n');
  const md = '[ok](../../README.md)\n[anchor](../../README.md#top)\n[ext](https://example.com)\n[gone](./missing.md)\n[abs](/README.md)\n';
  const problems = checkFile(root, 'docs/guides/x.md', md);
  assert.deepEqual(problems, [{ file: 'docs/guides/x.md', line: 4, target: './missing.md' }]);
});
```

- [ ] **Step 3: Run**

```bash
node --test scripts/docs/
node scripts/docs/check-links.mjs
```

Expected: tests pass. The first repo-wide run will list broken links in the current docs (the root README's `apps/mobile`, the postman README, `ARCHITECTURE.md`); Tasks 12–14 rewrite those files. Record the count here; the gate in Task 15 requires zero.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(docs): add a relative-link checker for tracked Markdown

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 12: Docs split by audience — moves, index, guides

**Files:**

- Move: `docs/AUDIT_REPORT_2026-07-25.md`, `docs/FRONTEND_DATA_AUDIT.md`, `docs/KARTSEEK_AUDIT_2026-07-24.md`, `docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md`, `docs/MARKETPLACE_MODULE_REVIEW.md`, `docs/MARKETPLACE_REMEDIATION_2026-08-10.md`, `docs/MODULE_ISOLATION_AUDIT_2026-07-27.md`, `docs/stabilization/FINAL_STABILIZATION_REPORT.md`, `docs/stabilization/FULL_SYSTEM_SCAN_REPORT.md` → `docs/audits/` (names unchanged); `docs/PROJECT_SPECIFICATION.md` → `docs/product/project-specification.md`; `docs/KARTSEEK_WORKPLAN_PHASE1-4.md` → `docs/archive/KARTSEEK_WORKPLAN_PHASE1-4.md`
- Delete: `docs/API_SETUP_GUIDE.md`, `MAPS_API_KEY.md` (content carried into the guides below)
- Create: `docs/README.md`, `docs/guides/local-setup.md`, `docs/guides/running-services.md`, `docs/guides/testing.md`, `docs/guides/database-migrations.md`, `docs/guides/seeding.md`, `docs/guides/secrets.md`, `docs/guides/troubleshooting.md`, `docs/guides/conventions.md`
- Modify: `docs/archive/INDEX.md` (add the workplan line)

- [ ] **Step 1: Move and delete**

```bash
mkdir -p docs/audits docs/product docs/guides docs/architecture docs/adr
git mv docs/AUDIT_REPORT_2026-07-25.md docs/FRONTEND_DATA_AUDIT.md docs/KARTSEEK_AUDIT_2026-07-24.md docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md docs/MARKETPLACE_MODULE_REVIEW.md docs/MARKETPLACE_REMEDIATION_2026-08-10.md docs/MODULE_ISOLATION_AUDIT_2026-07-27.md docs/stabilization/FINAL_STABILIZATION_REPORT.md docs/stabilization/FULL_SYSTEM_SCAN_REPORT.md docs/audits/
git mv docs/PROJECT_SPECIFICATION.md docs/product/project-specification.md
git mv docs/KARTSEEK_WORKPLAN_PHASE1-4.md docs/archive/KARTSEEK_WORKPLAN_PHASE1-4.md
git rm -q docs/API_SETUP_GUIDE.md MAPS_API_KEY.md
rmdir docs/stabilization 2>/dev/null; ls docs
```

Expected: `README.md adr archive audits guides product superpowers` (README written next; `architecture/` already holds the generated `services.md`).

- [ ] **Step 2: Write `docs/README.md`**

```markdown
# KARTSEEK documentation

Start with the root [README](../README.md) (what this is, ten-minute setup) and
[ARCHITECTURE](../ARCHITECTURE.md) (how the 35 deployables fit together).

| I want to… | Read |
| --- | --- |
| set the repo up on my machine | [guides/local-setup.md](guides/local-setup.md) |
| know which command starts what, and on which port | [guides/running-services.md](guides/running-services.md), [architecture/services.md](architecture/services.md) |
| run or write tests | [guides/testing.md](guides/testing.md) |
| change the database schema | [guides/database-migrations.md](guides/database-migrations.md) |
| load demo data | [guides/seeding.md](guides/seeding.md) |
| handle a key, password or token | [guides/secrets.md](guides/secrets.md) |
| fix a thing that worked yesterday | [guides/troubleshooting.md](guides/troubleshooting.md) |
| add code in the right place with the right name | [guides/conventions.md](guides/conventions.md) |

## Architecture

- [services.md](architecture/services.md) — every deployable, generated from `services.yaml`
- [data-ownership.md](architecture/data-ownership.md) — which service owns which Postgres schema
- [messaging.md](architecture/messaging.md) — Kafka topics, consumer groups, TCP and gRPC
- [frontend-zones.md](architecture/frontend-zones.md) — the Next.js shell and its eight zones
- [mobile.md](architecture/mobile.md) — the three Flutter apps and the shared package
- [security.md](architecture/security.md) — JWT, refresh slots, guards, seller approval

## Decisions

[adr/](adr/) holds one file per architecture decision, numbered. Add a new one
rather than editing an old one.

## Product

[product/project-specification.md](product/project-specification.md) is the
specification the platform is built to.

## History

- [audits/](audits/) — dated audit reports and remediation logs (2026-07 to 2026-08)
- [archive/](archive/) — superseded plans and fix logs
- [superpowers/specs/](superpowers/specs/) and [superpowers/plans/](superpowers/plans/) — design specs and their implementation plans
```

- [ ] **Step 3: Write the eight guides**

Each guide is short, factual and links out. Required content per file (write the prose from these facts; every path named must exist):

**`docs/guides/local-setup.md`** — Prerequisites: Node 26.5.0 (`.nvmrc`; 25.x also satisfies `engines`), npm 11, Docker Desktop, Flutter 3.44 for mobile, Git. Steps: `git clone`; `npm ci` from the root (never from a workspace — nested installs leave stale copies); `cp .env.example .env` at the root **and** `cp apps/api/.env.example apps/api/.env` (the API workspace reads its own) and `cp modules/<m>/backend/.env.example modules/<m>/backend/.env` for any module you run; `npm run infra:up` (Postgres 5432, Redis 6379, Kafka 9092, MongoDB 27017, Elasticsearch 9200, Kafka UI 8080; `npm run infra:tools` adds pgAdmin 5050, Redis Insight 5540, Kibana 5601); `npm run dev` (20 workspaces through Turbo) or the targeted `dev:*` scripts; open `http://localhost:3000`. Windows notes: if the user name has spaces quote paths; the working copy may hold ignored clutter (`Users/`, `build/`, `DockerDesktopWSL/`, `nuget.exe`, `*.log`) — harmless, gitignored. Mobile: `flutter pub get` in `apps/customer`, `apps/partner`, `apps/seller`; `flutter run --dart-define=MAPS_API_KEY=…` (see secrets). Link to running-services and troubleshooting.

**`docs/guides/running-services.md`** — Table of root scripts: `dev` (everything), `dev:web`, `dev:api` (which runs `dev:all` in `apps/api`: gateway + 17 core services via `concurrently`; the eight module backends are separate workspaces Turbo starts), `build`, `lint`, `type-check`, `test`, `smoke`, `registry:validate`, `registry:generate`, `docs:check-links`, `infra:*`, `nginx:*`, `db:seed*`, `kafka:topics`. Per-service: `npm run start:<name> -w kartseek-api`. `SKIP_DB=true` boots a service without Postgres. Ports: link to `architecture/services.md`; explain HTTP vs TCP vs gRPC ports and the env var pattern `<SVC>_SERVICE_PORT` / `<SVC>_TCP_PORT` / `<SVC>_GRPC_PORT`. Health: today's routes are in the services table; phase 2 standardises them. Smoke test: `npm run build && npm run smoke`.

**`docs/guides/testing.md`** — Backend: Vitest 4 through `apps/api/test/vitest-backend.mts`; `npm test` runs unit specs per workspace; integration specs excluded by default (`vitest.integration.mts` in marketplace, `npm run test:integration -w @kartseek/marketplace-backend`); e2e: `npm run test:e2e -w kartseek-api` (needs infra + gateway). The `jest` global is `vi` (shim in `test/vitest-setup.ts`). Web and zones: Jest 30 (`npm test -w kartseek-web`), Playwright journeys in `apps/web/e2e` (`npm run test:e2e -w kartseek-web`; Playwright browsers are not installed — use `channel: 'chrome'`). Postman: `tests/postman/README.md`. Scripts: `npm run test:scripts`. Rules: `DEV_AUTH_BYPASS` is never set when testing authorisation (anonymous requests become SUPER_ADMIN locally); probe endpoints with an impossible id before believing a page works (fabricated fallbacks exist).

**`docs/guides/database-migrations.md`** — `apps/api/data-source.ts`; `npm run migration:show|run|revert -w kartseek-api`; `migration:baseline` (`scripts/migration-baseline.ts`) records existing schema; `scripts/generate-gateway-ddl.ts`; `synchronize` is on only in development and drops non-entity indexes — never rely on it in production; migrations are schema-qualified; phase 5 moves them per service. `apps/api/migrations/` list is the ledger. Module databases: `docker compose --profile isolated up -d`, then `npm run db:split -w kartseek-api -- --apply` (dry run without `--apply`).

**`docs/guides/seeding.md`** — `npm run db:seed` (grocery, marketplace, restaurant, pharmacy) and `db:seed:<module>`; the full set via `npx ts-node -r tsconfig-paths/register apps/api/scripts/seed/seed-all.ts` (order matters, franchise last); seeds are idempotent by slug, listings/images upsert; run against a fresh `kartseek_db` for a clean state; `tests/postman/data/` holds the request fixtures, not seeds.

**`docs/guides/secrets.md`** — Where secrets live: root `.env` (Compose credentials), `apps/api/.env`, `modules/*/backend/.env`, all gitignored (`.env.*` except `*.example`); `*.key`, `*.pem`, `*.crt`, `key.properties`, `local.properties` ignored. Never commit a real value to an `.env.example`. Then the section **"Google Maps API key"** — paste the body of the deleted `MAPS_API_KEY.md` verbatim from "The key used to be hardcoded…" to the end. Rotation: the runbook table (JWT 90 days, INTERNAL_API_KEY 30 days, DB 90 days, Kafka 180 days, ENCRYPTION_KEY never without a migration).

**`docs/guides/troubleshooting.md`** — one heading per recorded gotcha, symptom → cause → fix: two Postgres on 5432 (a host install shadows the container; check `netstat -ano | findstr 5432`); drive Chrome at `localhost` not `127.0.0.1`; `curl localhost:3001` adds ~200 ms of IPv6 connect — use `127.0.0.1` for timing; `DEV_AUTH_BYPASS=true` makes anonymous requests SUPER_ADMIN; Next dev returns 200 for `notFound()`; "could not reach the sign-in service" is CSP/CORS in the browser, curl will not reproduce it; `UnknownDependenciesException` at boot means a lib is not registered in one of the five `@app/*` registration points (`nest-cli.json`, `apps/api/tsconfig.json` paths, `rspack.config.js` `appLibs`, `modules/*/backend/tsconfig.json` paths, `test/vitest-backend.mts` aliases); `TypeORM` `T | null` without explicit `type:` fails at boot though tsc passes; `where: { id: undefined }` returns the first row; ORDER BY takes the property name, WHERE the column; Kafka: one consumer group per service (`KAFKA_GROUP_ID` is a prefix), topics must be created (`npm run kafka:topics`), Kafka data lives in a volume; Compose reads only the root `.env`; `nest build` is the real gate, tsc alone is not; on Windows, `git mv` for renames and never delete the lockfile.

**`docs/guides/conventions.md`** — D1 skeletons (Nest: `src/main.ts`, `<deployable>.module.ts`, `src/dto/`, `src/entities/` only when it owns tables; Next: `src/app`, `src/components`, `src/lib`; Flutter: `lib/main.dart`, `lib/features/`, `lib/routing/`); D2 root module naming with the table of the 26; D3 kebab-case files / PascalCase symbols, Dart snake_case + `kartseek_`; where new code goes (a core service → `apps/api/apps/<name>`, register in `nest-cli.json` and `services.yaml`; a vertical → `modules/<v>/{backend,frontend}` + registry; shared backend code → `apps/api/libs/<lib>` + the five registration points; shared web code → `packages/shared-core` or `shared-ui`); dependencies (backend deps declared in `apps/api`; the module manifests carry the platform set deliberately; install from the root); commits (Conventional Commits, one concern per commit, `Co-Authored-By` when a tool wrote it); docs (edit `services.yaml` not the generated tables; run `npm run docs:check-links`).

- [ ] **Step 4: Update the archive index and check links for the subtree**

Append to `docs/archive/INDEX.md`: `- KARTSEEK_WORKPLAN_PHASE1-4.md — the July 2026 four-phase workplan, superseded by docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`.

```bash
node scripts/docs/check-links.mjs docs/
```

Expected: `… all relative links resolve` for `docs/` (archive and audits are excluded).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: split docs by audience — guides, product, audits, archive

Nine audit reports move to docs/audits, the specification to docs/product, the
July workplan to docs/archive. Eight task guides replace API_SETUP_GUIDE.md and
MAPS_API_KEY.md; docs/README.md indexes everything.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 13: Architecture docs, ADRs, root README and ARCHITECTURE

**Files:**

- Create: `docs/architecture/data-ownership.md`, `messaging.md`, `frontend-zones.md`, `mobile.md`, `security.md`; `docs/adr/0001-record-architecture-decisions.md`, `0002-nest-monorepo-on-rspack.md`, `0003-vitest-for-backend-tests.md`, `0004-next-multi-zone-frontends.md`, `0005-service-registry.md`
- Rewrite: `README.md` (< 150 lines), `ARCHITECTURE.md`
- Delete: `apps/MOBILE_APPS_README.md` (its content goes to `docs/architecture/mobile.md` and the three app READMEs in Task 14)

- [ ] **Step 1: Gather the two facts the docs need that are not yet in hand**

```bash
grep -oE "'[a-z0-9.-]+'" apps/api/scripts/create-kafka-topics.js | sort -u | head -60      # topic names for messaging.md
sed -n '1,80p' apps/web/next.config.mjs | grep -nE "rewrites|destination|source|ZONE" | head -20   # how the shell mounts zones
```

- [ ] **Step 2: Write the five architecture documents**

**`data-ownership.md`** — the map as it is today. Table: service → Postgres schema (from `services.yaml` `database`) → whether it maps entities (`src/entities/`), connects with `entities: []` (commission, delivery, refund, report) or has no Postgres (cart, loyalty, notification, search, audit-log/Mongo). Shared `kartseek_db` for the core; module schemas can move to their own instance (`<MODULE>_DB_*`, Compose `isolated` profile, `split-databases.ts`). Known cross-service touches to resolve in phase 5: `users` (auth-service, user-service, gateway), `sellers` (marketplace, gateway, `users.sellerType`), gateway-owned tables (`GatewayOwnedTables` migration), `public.*` decoy copies of marketplace tables (raw SQL must use `tablePath`). State that phase 5 turns this into the ownership inventory and links the spec §9.

**`messaging.md`** — Three in-process transports: REST at the gateway (`/api/v1`, Swagger at `/api/docs`), Nest TCP `@MessagePattern` between gateway and services (ports in the services table; `send(cmd, payload, fallback)` in the gateway returns invented data when a pattern is unimplemented — never treat 200 as proof), gRPC for the catalogue paths (`apps/api/proto`, `@app/grpc`), Kafka for events (`@app/kafka`; `KAFKA_GROUP_ID` is a prefix and each process derives `<prefix>-<service>`; topics are created by `apps/api/scripts/create-kafka-topics.js` — list them from Step 1 — auto-creation is off; audit-log and search bind their own Nest Kafka transports with `audit-log-consumers` and `search-indexer`), Socket.IO on the gateway for tracking/notifications (`/orders` namespace; rooms are granted from HTTP routes; JWT required).

**`frontend-zones.md`** — The shell (`apps/web`, port 3000) and eight zones (`modules/<v>/frontend`, ports 3002–3009, each with `basePath` — table from the registry). The shell's `next.config.mjs` rewrites `/<basePath>/*` to the zone (quote the mechanism from Step 1); zone URLs are server-side env. Shared code via `tsconfig` paths to `packages/shared-core` and `packages/shared-ui` (not npm workspaces — ADR 0008 follow-up). `zoneHref()` strips the basePath so links are not doubled. `apps/web/src/components/india/` is a country-specific implementation the localization registry should eventually drive. i18n through `next-intl`; region detection needs `X-Region-Code` on every API call. Tailwind 4 with `globals.css` layered — custom CSS goes in `@layer components`.

**`mobile.md`** — From `apps/MOBILE_APPS_README.md`: the three apps (`kartseek_customer` com.kartseek.customer 1.1.0+3; `kartseek_partner` com.kartseek.partner 1.1.0+3; `kartseek_seller` com.kartseek.seller 1.0.0+1), what each targets, the shared package `packages/shared-mobile` (`kartseek_shared_mobile` — or `shared_mobile` if Task 7 deferred the rename; say which) and what it holds, the vendored `packages/vendor/objective_c`, requirements table (Flutter 3.44.0, Dart, Android SDK, Xcode), run commands per app, `--dart-define=MAPS_API_KEY`. Known state: catalogues render `MockData` regardless of the API (mock-first), a shared social-login bypass and certificate pinning that never runs — link the audit. Drop the "migration script" section about `apps/mobile/`.

**`security.md`** — JWT access + refresh with one refresh slot per user (a second login ends the first device); client refreshes on 401 single-flight; guards are per controller — there is no `APP_GUARD`, so a new route ships open unless it carries `@UseGuards` (`@ApiBearerAuth` is documentation, not a guard); roles via `RolesGuard` per controller; seller authorisation on `sellers.owner_id`, fail-closed; seller approval spans `users.status` and `sellers.verificationStatus` (`SellerApprovalGuard`, `applySellerDecision()`); `DEV_AUTH_BYPASS` (local only); rate limiting with `trust proxy`; HSTS; WS rooms granted from HTTP; seller rich text is SSR'd (XSS surface, CSP `'unsafe-inline'` does not help); secrets handling → guides/secrets.md. Link the security audit in `docs/audits/`.

- [ ] **Step 3: Write the five ADRs**

Format for each: `# ADR NNNN: <title>` / `**Status:** Accepted` / `**Date:** 2026-09-05` (0002–0004 record earlier decisions: 0002 date 2026-09-02 from the rspack commit, 0003 2026-08, 0004 2026-08) / `## Context` / `## Decision` / `## Consequences`.

- `0001-record-architecture-decisions.md` — we keep ADRs in `docs/adr/`, numbered, immutable; supersede by a new one.
- `0002-nest-monorepo-on-rspack.md` — one Nest monorepo (`apps/api`) with 17 core apps + gateway and 15 `@app/*` libs; module backends are separate workspaces compiling against the same libs via tsconfig paths; builder is rspack (Nest 12 is ESM-only, webpack path broke: dual `@nestjs/core` via nodeExternals, TDZ on circular entities → `Relation<>`, legacy `nest-cli` key); consequences: `@app/*` needs five registration points; `nest build` is the gate; explicit entity lists (bundled `main.js` has no `__dirname` globs).
- `0003-vitest-for-backend-tests.md` — Jest runs CJS, Nest 12 is ESM; Vitest compiles TS itself; one shared factory `test/vitest-backend.mts`; `jest` global aliased to `vi` as a migration shim; web stays on Jest.
- `0004-next-multi-zone-frontends.md` — one shell + eight zones with `basePath`, mounted by rewrites; independent deploys and builds per vertical; cost: shared packages through tsconfig paths, `zoneHref()`, doubled-prefix hazard.
- `0005-service-registry.md` — the spec's D4: `services.yaml` is the single declaration; generators and a validator; consequences: ports change in one place, CI fails on drift, k8s/Compose generation in later phases.

- [ ] **Step 4: Rewrite `README.md` (under 150 lines)**

Sections, in order: title + three sentences on what KARTSEEK is (multi-vertical super app: marketplace, grocery, restaurant, pharmacy, doctor, taxi, hotel, franchise; multi-country; web + three Flutter apps); **Repository map** (the real tree: `apps/` api·web·customer·partner·seller·mcp-server, `modules/<vertical>/{backend,frontend}` ×8, `packages/` shared-core·shared-ui·shared-mobile·vendor, `infra/` docker·k8s·nginx·postgres, `tests/` postman·smoke, `docs/`, `scripts/`, `services.yaml`); **Prerequisites** (Node 26.5.0 via `.nvmrc`, npm 11, Docker Desktop, Flutter 3.44 for mobile); **Ten-minute setup** (`npm ci` → `cp .env.example .env` (+ `apps/api/.env.example`) → `npm run infra:up` → `npm run dev` → `http://localhost:3000`); **Deployables** with the generated block (`<!-- registry:start -->`…`<!-- registry:end -->` — add `apps/web`? No: the root README lists all 35 — extend `readmeTargets` in `generate.mjs` to also emit a root block with every entry, and add `'.'` handling in `spliceBlock`'s title); **Everyday commands** (dev, build, test, lint, type-check, smoke, registry:validate, docs:check-links); **Where next** (docs/README.md, ARCHITECTURE.md, docs/guides/conventions.md).

Concretely, in `generate.mjs` `readmeTargets`, add `add('.', e)` for every entry so `README.md` at the root carries the full table, and in `renderAll` name the root file `KARTSEEK` when it has to be created. Re-run `node --test scripts/registry/` (update the first generate test's expected file list to include `README.md`).

- [ ] **Step 5: Rewrite `ARCHITECTURE.md`**

From the running system, ~250 lines: **Overview** (35 deployables: 1 gateway, 17 core, 8 module services, 1 shell, 8 zones; 3 Flutter apps; MCP server); **System diagram** (Mermaid: clients → nginx → gateway → services via TCP/gRPC; Kafka; Postgres/Redis/Mongo/Elasticsearch); **How services talk** (summary + link to messaging.md); **The web** (shell + zones, link); **Mobile** (link); **Data** (schemas today, per-module DBs, phase 5; link data-ownership); **Security model** (link); **Build and run** (rspack, Turbo, Compose, the registry, the smoke test); **Deployment** (Compose profiles today; `infra/k8s` manifests; CI/CD and images arrive in phases 3–4); **Roadmap** (phases 2–5 in one line each, linking the spec). Every path mentioned must exist.

- [ ] **Step 6: Verify**

```bash
git rm -q apps/MOBILE_APPS_README.md
node scripts/registry/generate.mjs && node scripts/registry/validate.mjs
node scripts/docs/check-links.mjs
wc -l README.md            # < 150
git grep -n "apps/mobile\|design-system/tokens" -- README.md ARCHITECTURE.md docs/guides docs/architecture
```

Expected: valid, all links resolve, line count under 150, last grep empty.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: rewrite README and ARCHITECTURE from the running system; add ADRs

The root README describes the tree that exists, the ten-minute setup and the
generated deployables table. ARCHITECTURE.md is rewritten around the 35
deployables and links into docs/architecture/ (data ownership, messaging,
zones, mobile, security). ADRs 0001-0005 record the decisions already taken.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 14: A README for every workspace, and the operational READMEs

**Files:**

- Create or rewrite: `apps/api/README.md`, `apps/web/README.md`, `apps/mcp-server/README.md`, `apps/customer/README.md`, `apps/partner/README.md`, `apps/seller/README.md`, `modules/README.md`, `modules/<v>/backend/README.md` ×8, `modules/<v>/frontend/README.md` ×8, `packages/shared-core/README.md`, `packages/shared-ui/README.md`, `packages/shared-mobile/README.md`, `infra/README.md`, `infra/docker/README.md`, `infra/k8s/README.md` (replaces `README.md` + `QUICKSTART.md`), `tests/postman/README.md` (rewrite), `scripts/README.md` (rewrite), `apps/api/docs/architecture.md` and `runbook.md` (short rewrites)
- Delete: `infra/k8s/QUICKSTART.md`

- [ ] **Step 1: The generated-block READMEs (api, web, 16 modules)**

Task 8/9 already created minimal files with the block. Around the block, each gets:

`apps/api/README.md`: purpose (Nest monorepo: gateway + 17 core services + 15 `@app/*` libs); run (`npm run dev:api`, `npm run start:<name> -w kartseek-api`, `SKIP_DB`); test (`npm test -w kartseek-api`, `test:e2e`, `test:cov`); build (`nest build`, output `dist/apps/<service>/main.js`); env (`.env.example`: `DB_*`, `REDIS_*`, `KAFKA_*`, `JWT_*`, the `*_PORT` families, `DEV_AUTH_BYPASS`); migrations (link guide); the block; libraries table (common, database, guards, decorators, validators, dto, events, logger, security, grpc, kafka, redis, gdpr, region, storage — one line each from their `index.ts`); docs (`docs/architecture.md`, `docs/runbook.md`).

`apps/web/README.md`: the shell; run `npm run dev:web` (3000); test (Jest, Playwright); env (`NEXT_PUBLIC_API_URL` includes `/api/v1`, `NEXT_PUBLIC_WS_URL` bare origin, zone URLs); the block; structure (`src/app`, `src/components`, `src/lib`); shared packages; link frontend-zones.md.

`modules/README.md`: the shared shape (`modules/<vertical>/backend` Nest service on its own ports, `frontend` Next zone with `basePath`), how one is started (`npm run dev -w @kartseek/<v>-backend`, `-frontend`), how the gateway reaches it (TCP `<V>_TCP_PORT`, gRPC where present), its database (`<V>_DB_*`, Compose `isolated`), what to register when adding one (`services.yaml`, root workspaces glob already matches, the gateway controller, `.env.example`).

`modules/<v>/backend/README.md` (8): three hand-written lines — what the vertical does; `npm run dev -w @kartseek/<v>-backend` / `npm test -w …`; `.env.example` names (`<V>_DB_*`, `<V>_SERVICE_PORT`, `<V>_TCP_PORT`, `<V>_GRPC_PORT` where present) — plus the block. Marketplace additionally: the HTTP surface is closed except `/health` (`HttpSurfaceGuard`); `test:integration`; `db:create`, `db:schema`.

`modules/<v>/frontend/README.md` (8): three lines — zone for the vertical at `basePath`; `npm run dev -w @kartseek/<v>-frontend` (port); tests where they exist (grocery 4, marketplace 2 Jest specs; others none) — plus the block.

- [ ] **Step 2: The Flutter, package, MCP and shared READMEs**

`apps/customer/README.md`, `apps/partner/README.md`, `apps/seller/README.md`: package name, app id, version, audience and modules (from the deleted mobile README), `flutter pub get`, `flutter run --dart-define=MAPS_API_KEY=…`, `flutter analyze`, `flutter test`, structure (`lib/main.dart`, `lib/features/`, `lib/routing/`), depends on `packages/shared-mobile` (state the package name as it is after Task 7), link `docs/architecture/mobile.md`. Seller: replaces the "A new Flutter project" stub.

`packages/shared-core/README.md`, `packages/shared-ui/README.md`: what they hold (from their `package.json` descriptions and `src/index.ts`), how they are reached (tsconfig paths, not workspaces — link ADR 0008 follow-up in the spec §13), where to add a hook/component. `packages/shared-mobile/README.md`: the Dart package name, what it holds, consumers. `packages/vendor/objective_c/README.md` exists from Task 7.

`apps/mcp-server/README.md`: what it is (MCP server exposing the REST API as tools), `npm install && npm run dev` in its own directory (it is **not** a workspace and has its own lockfile; TypeScript 5.8 / `@types/node` 22 there are its own), env (`KARTSEEK_API_URL` — confirm the name in `src/index.ts`).

- [ ] **Step 3: The operational READMEs**

`infra/README.md`: the four subtrees and what reads each (`docker/` — Compose files and the three Dockerfiles, phase 3 templates; `k8s/` — manifests, `deploy.sh`, `utils.sh`, generator; `nginx/` — reverse proxy config and self-signed certs via `npm run nginx:certs`; `postgres/` — `init-extensions.sql` mounted into every Postgres container).

`infra/docker/README.md`: `compose.infra.yml` (services, profiles `isolated`, `tools`, ports), the root include, the three Dockerfiles and how to build each from the repo root (`docker build -f infra/docker/core-service.Dockerfile --build-arg APP=order-service -t kartseek/order-service .`, gateway, marketplace), what phase 3 changes.

`infra/k8s/README.md`: rewritten from the current README + QUICKSTART in ~150 lines: prerequisites, `config.yaml` secrets warning, apply order (`deploy.sh` does it), what `gen-microservices.sh` generates and that phase 2 replaces it with `scripts/registry/generate.mjs`, probes (tcpSocket today, httpGet after phase 2), storage classes, HPA, ingress, `utils.sh` commands. Delete `QUICKSTART.md`.

`tests/postman/README.md`: rewrite the directory structure block for `tests/postman/`, list all 34 collections (32–34 are the hotel/pharmacy/payment ones consolidated from other homes), the eight environments plus `local.postman_environment.json` used by `newman/run-payment-tests.sh`, run instructions (`node tests/postman/scripts/run-all.js …`), reports are local only, no CI section (phase 4 adds nightly-e2e and links back).

`scripts/README.md`: `check-type-imports.js` (the real gate, why `consistent-type-imports` is inert under `emitDecoratorMetadata`), `registry/` (validate, generate, lib, tests), `docs/check-links.mjs`, how to run each (`npm run registry:validate`, `registry:generate`, `docs:check-links`, `test:scripts`). Nothing else lives here; one-offs are deleted, not archived.

`apps/api/docs/architecture.md` (~40 lines): points at `ARCHITECTURE.md` and `docs/architecture/`, then only what is specific to `apps/api`: the monorepo layout, `@app/*` libs and the five registration points, the rspack build and its output layout, `dev:all`. `apps/api/docs/runbook.md` (~60 lines): health today (link services table), the incident procedures and security procedures from the current runbook kept verbatim, the stale port table removed (link `docs/architecture/services.md`), the migration rollback command corrected to `npm run migration:revert -w kartseek-api`.

- [ ] **Step 4: Verify**

```bash
git rm -q infra/k8s/QUICKSTART.md
node scripts/registry/generate.mjs --check && node scripts/registry/validate.mjs
node scripts/docs/check-links.mjs
for f in apps/api apps/web apps/mcp-server apps/customer apps/partner apps/seller modules packages/shared-core packages/shared-ui packages/shared-mobile packages/vendor/objective_c infra infra/docker infra/k8s tests/postman scripts; do test -f $f/README.md || echo "MISSING $f/README.md"; done
ls modules/*/backend/README.md modules/*/frontend/README.md | wc -l    # 16
git grep -nE "(^|[^A-Za-z0-9_./-])(k8s|nginx)/" -- ':!infra' ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!*.log' | grep -v "infra/k8s\|infra/nginx"
git grep -n "docs/api/postman\|apps/api/postman\|native-bindings\|package:shared_mobile/\|apps/mobile/" -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!*.lock'
```

Expected: generated current, valid, links resolve, no `MISSING`, `16`, both greps empty (if Task 7 deferred the Dart rename, `package:shared_mobile/` hits are expected and the mobile READMEs say so).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: a README for every workspace, with the registry port block

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 15: The Phase 1 gate

**Files:** none new; fixes only for what the gate finds.

- [ ] **Step 1: Run the gate (spec §11) from the root**

```bash
npm ci 2>&1 | tail -3
npm run type-check 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npm run build 2>&1 | tail -8
npm test 2>&1 | tail -8
npm run test:scripts 2>&1 | tail -5
node scripts/registry/validate.mjs
node scripts/docs/check-links.mjs
npm run infra:up 2>&1 | tail -3
node tests/smoke/boot-all.mjs
npm ls @nestjs/core typeorm 2>&1 | grep -E "@nestjs/core@|typeorm@" | sort -u
```

Expected: every command exits 0; the build reports 26 Nest + 9 Next tasks successful; the smoke table shows `26/26 up`; one version each of `@nestjs/core` and `typeorm`. Lint: the web workspaces carry ~245 advisory react-hooks errors under the React Compiler rules as a known baseline (memory: "diff not count") — compare the count against the baseline from Task 0 rather than requiring zero, and record both numbers.

- [ ] **Step 2: Spec §5.6 checks**

```bash
git grep -nE "(^|[^A-Za-z0-9_./-])(k8s|nginx)/" -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!*.log' | grep -v "infra/k8s\|infra/nginx"
git grep -n "docs/api/postman\|apps/api/postman\|native-bindings\|package:shared_mobile/" -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!*.lock'
for w in packages/shared-mobile apps/customer apps/partner apps/seller; do (cd $w && flutter analyze --no-pub 2>&1 | tail -1); done
```

Expected: both greps empty; each `flutter analyze` result no worse than the Task 0 baseline.

- [ ] **Step 3: Manual render check**

Open `http://localhost:3000` and one zone path (`/grocery`, `/marketplace`) with the dev stack running; each renders its own markup (look for a zone-specific string, not the status code).

- [ ] **Step 4: Fix, re-run, commit**

Anything red: fix at the source, re-run the failing command, then the whole gate once more. Commit whatever the fixes touched:

```bash
git add -A
git commit -m "chore: phase 1 gate — <one line per fix>

Gate on 2026-09-05: type-check ok, lint <n> advisory (baseline <m>), build 26 nest + 9 next ok,
unit tests ok, registry valid (35 entries), links ok, smoke 26/26 up.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 5: Record what later phases need (memory)**

Save a project memory noting: the registry exists and is the source of truth; the five `@app/*` registration points; `health.live` is per-service today; the Dart rename status; the `@types/jest` deviation; the generated files and `--check`.

---

## Self-review

**Spec coverage (§5, §10, §11):** §5.1 moves — Tasks 4 (k8s, nginx, Dockerfiles, Compose), 5 (Postman), 6 (seed/maintenance), 7 (native-bindings), 12 (docs, MAPS key, setup guide), 13 (mobile README). §5.2 deletions — Tasks 1 and 7; `docs/archive/validate-fixes.sh` stays; `.gitignore` additions in Task 1. §5.3 renames — Tasks 2, 3, 7; `start:prod` in Task 1. §5.4 registry + validator — Task 8 (checks 1–7, plus the Joi defaults) and Task 9 (docs/README generators); the smoke test — Task 10; `health.live` records current routes with `null` fallbacks. §5.5 docs — Tasks 12–14; `check-links` — Task 11. §5.6 — Task 15. §10 — specs updated in Task 2; unit tests for the validator, generator, smoke helpers and link checker; atomic writes in `lib.mjs`; `git mv` throughout; Conventional Commits per task. §11 — Task 15.

**Deviations, recorded:** `@types/jest` stays (Task 1 explains); the validator prints every problem rather than stopping at the first (strictly more useful, still non-zero); Compose `include` gets `env_file: .env` so interpolation keeps reading the root file.

**Placeholder scan:** the docs tasks specify sections and the facts each must contain rather than full prose; every path they name is created by an earlier task or exists today. The vendor README in Task 7 has two bracketed slots that must be filled from the two PowerShell scripts read in that step — not a TODO, an instruction with its source.

**Type consistency:** `loadRegistry`, `isNest`, `runtime`, `portDefaultIn`, `writeAtomic`, `toPosix` (lib) are the names used by `validate.mjs`, `generate.mjs`, `boot-all.mjs`; `renderAll`, `START`, `END` (generate) are used by `validate.mjs` and the generate test; `validate(root, registry, { checkGenerated })` matches its test; `probeUrl`, `waitUp` match the smoke test; `checkFile`, `extractLinks`, `listMarkdown`, `EXCLUDE` match the link-checker test. Registry field names (`ports.http/tcp/grpc`, `env.*`, `health.live/ready/metrics`, `database.schema/dedicated`, `kafka.groupId/transportGroupId/extraGroups`, `build.workspace/nestProject`, `basePath`, `k8s`) are the same in `services.yaml`, the validator, the generator and the smoke test.
