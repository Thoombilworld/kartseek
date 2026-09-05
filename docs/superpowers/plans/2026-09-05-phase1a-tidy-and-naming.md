# Phase 1A — Repo Tidy and Naming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tracked junk, give every Nest deployable the same root-module name, kebab-case the five stray component files, move infrastructure under `infra/`, consolidate Postman and docs into their final folders, and rename the two Dart packages — with every step verified by the build.

**Architecture:** Nothing changes at runtime. This plan is moves, renames and deletions, each followed by the compiler or a config dump proving that nothing that used to resolve now fails to. Spec: `docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`, sections 5.1–5.3 and 5.6.

**Tech Stack:** git, npm workspaces (Node 26.5.0, npm 11), Nest CLI on rspack, TypeScript, Next.js, Flutter 3.44 / Dart 3.12, Docker Compose v2 (`include:` support), Git Bash on Windows.

## Global Constraints

- Node `26.5.0` (`.nvmrc`), npm ≥ 10. Run every `npm` command from the repository root; never delete `package-lock.json`.
- Never add `baseUrl` to any `tsconfig.json`; `@app/*` resolves through explicit `paths` and the rspack `appLibs` alias list.
- Root module file = `<deployable>.module.ts`, class = `<Deployable>Module` (spec D2). Files kebab-case, exported symbols PascalCase (D3).
- All renames go through `git mv`. Write long files with the editor tool, not shell heredocs. One commit per task, Conventional Commits, footer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Historical documents under `docs/audits/`, `docs/archive/` and `docs/superpowers/` may keep old paths; every path check below excludes them.
- The type-check for `apps/api` and every module backend includes `scripts/check-type-imports.js`; a green `tsc` alone is not the gate.
- Working directory for every command is `C:\KARTSEEKAPP` unless a step says `cd`.
- Branch: `chore/platform-reorg`.

---

## File map

| Area | Created | Modified | Deleted / moved |
|---|---|---|---|
| Root | `docker-compose.yml` (new include stub) | `.gitignore`, `.gitattributes`, `.dockerignore`, `package.json`, `cspell.json`, `.vscode/settings.json` | `reg.tmp.js`, `MAPS_API_KEY.md`→`docs/guides/secrets.md`, `docker-compose.yml`→`infra/docker/compose.infra.yml` |
| `apps/api` | `test/vitest.e2e.mts`, `scripts/maintenance/README.md` | `package.json`, `vitest.config.mts`, 10 `main.ts`, 10 root modules, `test/authorization.e2e-spec.ts`, 2 gateway controllers (comments), 2 libs (comments), 10 seed scripts | `snap.cjs`, `jest-e2e.js`, `.dockerignore`, 2 hotel debug scripts, 4 dead wrappers, `Dockerfile*`→`infra/docker/`, `postman/`→`tests/postman/collections/`, `scripts/seed-*`→`scripts/seed/`, 3 data scripts→`scripts/maintenance/` |
| `modules/*/backend` | — | 5 `main.ts`, 5 root modules, 1 integration spec | — |
| `apps/web` | — | 2 pages (imports) | 3 stray scripts, 5 component files renamed |
| `infra/` | `infra/docker/`, `infra/k8s/`, `infra/nginx/`, `packages/vendor/README.md` | `infra/k8s/deploy.sh`, `infra/k8s/utils.sh` | — |
| `tests/postman` | `reports/.gitkeep` | `newman/run-payment-tests.sh`, `README.md` | 31 committed reports deleted |
| `docs/` | `guides/`, `architecture/`, `product/`, `audits/` | `archive/README.md` | 14 files moved |
| Dart | — | 4 `pubspec.yaml`, 4 `pubspec.lock`, ~330 `.dart` | `packages/native-bindings`→`packages/vendor/objective_c`, `apps/customer/lib/test_variants.dart` |
| `scripts/` | — | `README.md` | 13 files deleted |

---

### Task 1: Remove tracked junk and tighten `.gitignore`

**Files:**
- Delete: `reg.tmp.js`, `apps/api/snap.cjs`, `apps/api/.dockerignore`, `apps/api/scripts/hotel-api-test.js`, `apps/api/scripts/hotel-diagnostic.js`, `apps/web/check_links.js`, `apps/web/fix_broken_links.js`, `apps/web/refactor_taxi.js`, `apps/customer/lib/test_variants.dart`
- Modify: `.gitignore`, `.vscode/settings.json:117`

**Interfaces:** none.

- [ ] **Step 1: Prove nothing references the files**

Run:
```bash
git grep -nE "snap\.cjs|hotel-api-test|hotel-diagnostic|check_links\.js|fix_broken_links|refactor_taxi|test_variants|reg\.tmp" -- ':!docs' ':!*.log'
```
Expected: no output. (`apps/api/.dockerignore` is unreferenced by construction: every image builds from the repository root, which reads the root `.dockerignore`.)

- [ ] **Step 2: Remove them**

```bash
git rm -q reg.tmp.js apps/api/snap.cjs apps/api/.dockerignore \
  apps/api/scripts/hotel-api-test.js apps/api/scripts/hotel-diagnostic.js \
  apps/web/check_links.js apps/web/fix_broken_links.js apps/web/refactor_taxi.js \
  apps/customer/lib/test_variants.dart
```

- [ ] **Step 3: Ignore the untracked clutter categories that keep reappearing**

Append to `.gitignore` after the `*.stackdump` line:

```gitignore

# ── Added 2026-09-05, phase 1 tidy ────────────────────────────────────────────
# A mirror of the Windows profile directory that a misconfigured tool created
# at the repo root, and CMake output from the same session. Neither is source.
/Users/
/build/
```

- [ ] **Step 4: Fix the stale editor exclude**

In `.vscode/settings.json` line 117 replace `"**/apps/mobile/android/**"` with `"**/apps/{customer,partner,seller}/android/**"`.

- [ ] **Step 5: Verify and commit**

Run: `git status --short`
Expected: 9 `D` lines, `M .gitignore`, `M .vscode/settings.json`, nothing else.

```bash
git add -A && git commit -q -m "chore: remove tracked one-off scripts and debug files

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Retire Jest from `apps/api`; make its e2e specs runnable under Vitest

**Files:**
- Modify: `apps/api/package.json`, `apps/api/vitest.config.mts`
- Create: `apps/api/test/vitest.e2e.mts`
- Delete: `apps/api/jest-e2e.js`

**Interfaces:**
- Produces: `npm run test:e2e -w kartseek-api` runs `test/authorization.e2e-spec.ts` and `test/e2e-journey.spec.ts` under Vitest (they need live infrastructure, so they are not part of `npm test`).

- [ ] **Step 1: Rewrite the manifest scripts and drop the Jest block**

Run this from the root (it edits JSON structurally, so key order and formatting survive):

```bash
node -e "
const fs=require('fs');const p='apps/api/package.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
delete j.jest;
for (const k of ['jest','ts-jest','@types/jest']) delete j.devDependencies[k];
for (const k of ['scaffold','install:deps','docker:up','docker:down','docker:infra']) delete j.scripts[k];
j.scripts['start:prod']='node dist/apps/api-gateway/main.js';
j.scripts['test:e2e']='vitest run --config test/vitest.e2e.mts';
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
"
git rm -q apps/api/jest-e2e.js
```

Why: `scaffold` and `install:deps` point at files that do not exist; `docker:*` ran `docker compose` from `apps/api`, where there is no compose file (the root `infra:*` scripts are the working equivalents); `start:prod` pointed at the pre-rspack output path.

- [ ] **Step 2: Create the e2e Vitest config**

`apps/api/test/vitest.e2e.mts`:

```ts
import path from 'node:path';
import { backendVitestConfig } from './vitest-backend.mjs';

/**
 * The specs that need the platform running: a gateway with Redis, Postgres and
 * Kafka reachable. `npm test` excludes them (see ../vitest.config.mts); this
 * config is how they are run on purpose — `npm run test:e2e -w kartseek-api`
 * after `npm run infra:up`.
 */
export default backendVitestConfig({
  workspaceDir: path.resolve(import.meta.dirname, '..'),
  include: ['test/authorization.e2e-spec.ts', 'test/e2e-journey.spec.ts'],
});
```

- [ ] **Step 3: Drop the exclude entry for a file that no longer exists**

In `apps/api/vitest.config.mts` remove the line `'test/marketplace.integration.spec.ts',` (there is no such file; `ls apps/api/test` proves it).

- [ ] **Step 4: Sync the lockfile from the root**

Run: `npm install`
Expected: exits 0; `git diff --stat package-lock.json` shows a change (Jest for `apps/api` is gone; the web workspaces' Jest stays hoisted).

- [ ] **Step 5: Verify the two configs still collect the right specs**

Run: `cd apps/api && npx vitest list --config test/vitest.e2e.mts; cd ../..`
Expected: test names from exactly two files, `authorization.e2e-spec.ts` and `e2e-journey.spec.ts`.

Run: `npm test -w kartseek-api`
Expected: PASS, same count of files as before this task (the unit run did not include the e2e specs before either).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "chore(api): retire Jest, fix dead manifest scripts, run e2e specs under Vitest

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Rename the core-service root modules (10 services)

**Files (all under `apps/api/`):**
- Delete: `apps/order-service/src/order-service.module.ts`, `apps/payment-service/src/payment-service.module.ts`, `apps/audit-log-service/src/audit-log-service.module.ts`, `apps/loyalty-service/src/loyalty-service.module.ts` (each referenced by zero files; verified 2026-09-05)
- Rename + edit class: see table
- Modify: each service's `src/main.ts`; `test/authorization.e2e-spec.ts`; `apps/api-gateway/src/controllers/admin-seo.controller.ts:83`; `apps/api-gateway/src/controllers/localization.controller.ts:14`; `libs/kafka/src/kafka.module.ts:212`; `libs/region/src/region.module.ts:17`

| Service | Old file → new file | Old class → new class | Extra edits |
|---|---|---|---|
| admin-service | `admin.module.ts` → `admin-service.module.ts` | `AdminModule` → `AdminServiceModule` | comment in `main.ts` (step 3) |
| api-gateway | `app.module.ts` → `api-gateway.module.ts` | `AppModule` → `ApiGatewayModule` | e2e spec, 2 controller comments, 2 lib comments |
| audit-log-service | `audit-log.module.ts` → `audit-log-service.module.ts` | `AuditLogModule` → `AuditLogServiceModule` | delete dead wrapper first |
| auth-service | `app.module.ts` → `auth-service.module.ts` | `AppModule` → `AuthServiceModule` | — |
| loyalty-service | `loyalty.module.ts` → `loyalty-service.module.ts` | `LoyaltyModule` → `LoyaltyServiceModule` | delete dead wrapper first |
| order-service | `order.module.ts` → `order-service.module.ts` | `OrderModule` → `OrderServiceModule` | delete dead wrapper first |
| payment-service | `payment.module.ts` → `payment-service.module.ts` | `PaymentModule` → `PaymentServiceModule` | delete dead wrapper first; **scoped sed** — `PaymentModule` is also an enum in `entities/payment.entity.ts` |
| payout-service | `payout.module.ts` → `payout-service.module.ts` | `PayoutModule` → `PayoutServiceModule` | comment in `main.ts` |
| user-service | `user.module.ts` → `user-service.module.ts` | `UserModule` → `UserServiceModule` | — |
| wallet-service | `wallet.module.ts` → `wallet-service.module.ts` | `WalletModule` → `WalletServiceModule` | comment in `main.ts` |

**Interfaces:**
- Produces: class names above. Later plans (1B smoke test) start services from `dist/`, not by class, so nothing downstream imports these.

- [ ] **Step 1: Delete the four dead wrappers**

```bash
cd apps/api
git rm -q apps/order-service/src/order-service.module.ts apps/payment-service/src/payment-service.module.ts \
  apps/audit-log-service/src/audit-log-service.module.ts apps/loyalty-service/src/loyalty-service.module.ts
```

- [ ] **Step 2: Rename the seven services whose class name collides with nothing**

Still in `apps/api`:

```bash
rename_root () {  # $1=service dir  $2=old basename  $3=old class  $4=new class
  local dir="apps/$1/src"
  git mv "$dir/$2.module.ts" "$dir/$1.module.ts"
  git grep -lwE "$3" -- "$dir" | xargs sed -i "s/\b$3\b/$4/g"
  sed -i "s#'\./$2\.module'#'./$1.module'#" "$dir/main.ts"
}
rename_root admin-service     admin     AdminModule    AdminServiceModule
rename_root audit-log-service audit-log AuditLogModule AuditLogServiceModule
rename_root loyalty-service   loyalty   LoyaltyModule  LoyaltyServiceModule
rename_root order-service     order     OrderModule    OrderServiceModule
rename_root payout-service    payout    PayoutModule   PayoutServiceModule
rename_root user-service      user      UserModule     UserServiceModule
rename_root wallet-service    wallet    WalletModule   WalletServiceModule
```

- [ ] **Step 3: Rewrite the three history comments so they stay true**

`apps/admin-service/src/main.ts`, replace the four comment lines that begin `// AdminServiceModule, not the former AdminServiceModule` (the sed turned the old text into that) with:

```ts
  // AdminServiceModule is the only root module. An earlier stub with this name
  // declared the controller and service but imported no TypeOrmModule, so
  // AdminService could never be constructed and the process died on boot with
  // UnknownDependenciesException. The stub is gone; do not reintroduce one.
```

`apps/wallet-service/src/main.ts`, replace the six comment lines above the import (they begin `` // `WalletServiceModule`, not `WalletServiceModule` ``) with:

```ts
// WalletServiceModule is the only root module and the one that registers the
// database. A stub of the same shape used to shadow it; booting the stub threw
// `Nest can't resolve dependencies of the WalletService` for
// `WalletTransactionRepository`, nothing listened on TCP 4014, and every wallet
// screen in the seller portal was empty. The stub is gone.
```

`apps/payout-service/src/main.ts`, replace the three comment lines above the import with:

```ts
// PayoutServiceModule is the only root module — see the note in
// wallet-service/src/main.ts; the same stub-shadows-the-real-module defect hit
// payout-service and left `SellerWalletRepository` unresolvable on boot.
```

- [ ] **Step 4: Rename payment-service with a scoped substitution**

The enum `PaymentModule` in `apps/payment-service/src/entities/payment.entity.ts` (used by `invoice.entity.ts` and `settlement-record.entity.ts`) must not change.

```bash
git mv apps/payment-service/src/payment.module.ts apps/payment-service/src/payment-service.module.ts
sed -i 's/\bPaymentModule\b/PaymentServiceModule/g' apps/payment-service/src/payment-service.module.ts apps/payment-service/src/main.ts
sed -i "s#'\./payment\.module'#'./payment-service.module'#" apps/payment-service/src/main.ts
git grep -nw PaymentModule -- apps/payment-service
```
Expected for the last command: hits only in the three `entities/*.entity.ts` files.

- [ ] **Step 5: Rename auth-service and the gateway**

```bash
git mv apps/auth-service/src/app.module.ts apps/auth-service/src/auth-service.module.ts
sed -i 's/\bAppModule\b/AuthServiceModule/g' apps/auth-service/src/auth-service.module.ts apps/auth-service/src/main.ts
sed -i "s#'\./app\.module'#'./auth-service.module'#" apps/auth-service/src/main.ts

git mv apps/api-gateway/src/app.module.ts apps/api-gateway/src/api-gateway.module.ts
sed -i 's/\bAppModule\b/ApiGatewayModule/g' apps/api-gateway/src/api-gateway.module.ts apps/api-gateway/src/main.ts test/authorization.e2e-spec.ts
sed -i "s#'\./app\.module'#'./api-gateway.module'#" apps/api-gateway/src/main.ts
sed -i "s#'\.\./apps/api-gateway/src/app\.module'#'../apps/api-gateway/src/api-gateway.module'#" test/authorization.e2e-spec.ts
sed -i 's/missing from app\.module\.ts/missing from api-gateway.module.ts/' apps/api-gateway/src/controllers/admin-seo.controller.ts
sed -i 's/`app\.module\.ts`/`api-gateway.module.ts`/' apps/api-gateway/src/controllers/localization.controller.ts
sed -i 's/importing module (AppModule) context/importing root module context/' libs/kafka/src/kafka.module.ts
sed -i 's/Import once in AppModule/Import once in the root module/' libs/region/src/region.module.ts
```

- [ ] **Step 6: Prove no old name survives**

```bash
git grep -nwE "AdminModule|AuditLogModule|LoyaltyModule|OrderModule|PayoutModule|UserModule|WalletModule|AppModule" -- . ':!docs'
git grep -nE "app\.module|'\./(admin|audit-log|loyalty|order|payment|payout|user|wallet)\.module'" -- apps test libs
```
Expected: both empty.

- [ ] **Step 7: Build each renamed project, then the full workspace gate**

```bash
for p in admin-service api-gateway audit-log-service auth-service loyalty-service order-service payment-service payout-service user-service wallet-service; do
  npx nest build "$p" || { echo "BUILD FAILED: $p"; break; }
done
cd ../..
npm run type-check -w kartseek-api && npm test -w kartseek-api
```
Expected: ten builds succeed; type-check (tsc + type-import gate) clean; tests pass with the same counts as Task 2.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -q -m "refactor(api): name every core-service root module after its deployable

Root module = <deployable>.module.ts / <Deployable>Module, the Nest CLI
convention 11 of 26 services already followed. Deletes the four wrappers
nothing imported (order, payment, audit-log, loyalty).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Rename the module-backend root modules (5 services)

**Files:**
- Rename: `modules/franchise/backend/src/franchise.module.ts` → `franchise-service.module.ts`; `modules/grocery/backend/src/grocery.module.ts` → `grocery-service.module.ts`; `modules/hotel/backend/src/hotel.module.ts` → `hotel-service.module.ts`; `modules/marketplace/backend/src/marketplace.module.ts` → `marketplace-service.module.ts`; `modules/taxi/backend/src/taxi.module.ts` → `taxi-service.module.ts`
- Modify: each `src/main.ts`; `modules/marketplace/backend/src/__tests__/schema.integration.spec.ts`

Classes: `FranchiseModule`→`FranchiseServiceModule` (**scoped**: `FranchiseModule` is also an enum in `src/dto/franchise.dto.ts`), `GroceryModule`→`GroceryServiceModule`, `HotelModule`→`HotelServiceModule`, `MarketplaceModule`→`MarketplaceServiceModule`, `TaxiModule`→`TaxiServiceModule`.

- [ ] **Step 1: Rename the four unambiguous ones**

```bash
rename_module_root () {  # $1=module  $2=old class  $3=new class
  local dir="modules/$1/backend/src"
  git mv "$dir/$1.module.ts" "$dir/$1-service.module.ts"
  git grep -lwE "$2" -- "$dir" | xargs sed -i "s/\b$2\b/$3/g"
  git grep -lE "'(\./|\.\./)$1\.module'" -- "$dir" | xargs sed -i "s#\(['\"]\)\(\./\|\.\./\)$1\.module\1#\1\2$1-service.module\1#g"
}
rename_module_root grocery     GroceryModule     GroceryServiceModule
rename_module_root hotel       HotelModule       HotelServiceModule
rename_module_root marketplace MarketplaceModule MarketplaceServiceModule
rename_module_root taxi        TaxiModule        TaxiServiceModule
```

The marketplace call also updates `__tests__/schema.integration.spec.ts` (`'../marketplace.module'` → `'../marketplace-service.module'`) because the third line matches `../` imports.

- [ ] **Step 2: Rename franchise with a scoped substitution**

```bash
git mv modules/franchise/backend/src/franchise.module.ts modules/franchise/backend/src/franchise-service.module.ts
sed -i 's/\bFranchiseModule\b/FranchiseServiceModule/g' modules/franchise/backend/src/franchise-service.module.ts modules/franchise/backend/src/main.ts
sed -i "s#'\./franchise\.module'#'./franchise-service.module'#" modules/franchise/backend/src/main.ts
git grep -nw FranchiseModule -- modules/franchise
```
Expected for the last command: hits only in `src/dto/franchise.dto.ts`.

- [ ] **Step 3: Rewrite the taxi history comment**

In `modules/taxi/backend/src/main.ts` replace the four comment lines beginning `// TaxiServiceModule, not the former TaxiServiceModule` with:

```ts
  // TaxiServiceModule is the only root module. An earlier stub with this name
  // declared the controller and service but imported no TypeOrmModule, so
  // TaxiService could never be constructed and the process died on boot — the
  // same stub-shadows-the-real-module defect admin-service had. The stub is gone.
```

- [ ] **Step 4: Prove no old name survives, then build and test all five**

```bash
git grep -nwE "GroceryModule|HotelModule|MarketplaceModule|TaxiModule" -- modules ':!docs'
git grep -nE "'(\./|\.\./)(franchise|grocery|hotel|marketplace|taxi)\.module'" -- modules
for m in franchise grocery hotel marketplace taxi; do
  npm run build -w @kartseek/$m-backend && npm run type-check -w @kartseek/$m-backend && npm test -w @kartseek/$m-backend || { echo "FAILED: $m"; break; }
done
```
Expected: two empty greps; five green build/type-check/test runs.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "refactor(modules): name every module-backend root module after its deployable

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Kebab-case the five PascalCase component files

**Files:**
- Rename: `apps/web/src/components/india/PinCodeInput.tsx` → `pin-code-input.tsx`; `apps/web/src/components/india/StateDistrictSelector.tsx` → `state-district-selector.tsx`; `apps/web/src/components/taxi/RentalCompliancePanel.tsx` → `rental-compliance-panel.tsx`; `apps/web/src/components/taxi/RentalDocumentPanel.tsx` → `rental-document-panel.tsx`; `apps/web/src/components/taxi/VehicleHandoverPanel.tsx` → `vehicle-handover-panel.tsx`
- Modify: `apps/web/src/app/admin/taxi/rentals/page.tsx:11`, `apps/web/src/app/seller/taxi/(portal)/rentals/page.tsx:11-13`

Exported component names (`RentalCompliancePanel` etc.) do not change — only file names.

- [ ] **Step 1: Rename and fix the known importers**

```bash
cd apps/web/src/components
git mv india/PinCodeInput.tsx india/pin-code-input.tsx
git mv india/StateDistrictSelector.tsx india/state-district-selector.tsx
git mv taxi/RentalCompliancePanel.tsx taxi/rental-compliance-panel.tsx
git mv taxi/RentalDocumentPanel.tsx taxi/rental-document-panel.tsx
git mv taxi/VehicleHandoverPanel.tsx taxi/vehicle-handover-panel.tsx
cd ../../../..
sed -i "s#@/components/taxi/RentalCompliancePanel#@/components/taxi/rental-compliance-panel#; s#@/components/taxi/VehicleHandoverPanel#@/components/taxi/vehicle-handover-panel#; s#@/components/taxi/RentalDocumentPanel#@/components/taxi/rental-document-panel#" \
  "apps/web/src/app/admin/taxi/rentals/page.tsx" "apps/web/src/app/seller/taxi/(portal)/rentals/page.tsx"
```

- [ ] **Step 2: Catch any importer the planning grep did not see**

Run: `git grep -nE "PinCodeInput'|StateDistrictSelector'|RentalCompliancePanel'|RentalDocumentPanel'|VehicleHandoverPanel'|/india/[A-Z]|/taxi/[A-Z]" -- apps/web/src packages`
Expected: empty. If a line appears, change that import path to the kebab-case file name in the same way as step 1.

- [ ] **Step 3: Type-check and lint the web app**

Run: `npm run type-check -w kartseek-web && npm run lint -w kartseek-web`
Expected: both exit 0 (lint has a known advisory react-hooks baseline; the exit code is what matters — compare the error count to `git stash; npm run lint -w kartseek-web; git stash pop` if it is non-zero, and require no increase).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "refactor(web): kebab-case the five remaining PascalCase component files

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Sort `apps/api/scripts` into `seed/` and `maintenance/`

**Files:**
- Move: `apps/api/scripts/seed-{all,delivery,doctor,franchise,grocery,hotel,marketplace,partner,pharmacy,restaurant,taxi}.ts` → `apps/api/scripts/seed/`; `apps/api/scripts/{align-franchise-markets,backfill-seller-owner,sync-restaurant-tables}.ts`, `apps/api/scripts/create-order-table.sql` → `apps/api/scripts/maintenance/`
- Modify: the seed scripts' relative imports; root `package.json` `db:seed*` scripts
- Create: `apps/api/scripts/maintenance/README.md`

Stays in place: `create-kafka-topics.js`, `e2e-marketplace.ts`, `generate-gateway-ddl.ts`, `migration-baseline.ts`, `split-databases.ts`, `verify-franchise-isolation.ts` (all referenced by manifests or docs as they are).

- [ ] **Step 1: Move the files**

```bash
cd apps/api/scripts
mkdir -p seed maintenance
git mv seed-all.ts seed-delivery.ts seed-doctor.ts seed-franchise.ts seed-grocery.ts seed-hotel.ts seed-marketplace.ts seed-partner.ts seed-pharmacy.ts seed-restaurant.ts seed-taxi.ts seed/
git mv align-franchise-markets.ts backfill-seller-owner.ts sync-restaurant-tables.ts create-order-table.sql maintenance/
cd ../../..
```

- [ ] **Step 2: Add one directory level to every relative path in the seed scripts**

The seed scripts import entities with `'../apps/...'` and `'../../../modules/...'`, and `seed-pharmacy.ts` builds a glob with `path.join(__dirname, '../../../modules/...')`. `seed-all.ts` spawns its siblings with `cwd: path.join(__dirname, '..')`.

```bash
sed -i "s#'\.\./apps/#'../../apps/#g; s#'\.\./\.\./\.\./modules/#'../../../../modules/#g; s#__dirname, '\.\./\.\./\.\./modules#__dirname, '../../../../modules#g" apps/api/scripts/seed/*.ts
sed -i "s#cwd: path.join(__dirname, '\.\.')#cwd: path.join(__dirname, '../..')#" apps/api/scripts/seed/seed-all.ts
git grep -nE "'\.\./(apps|libs)/|'\.\./\.\./\.\./modules/" -- apps/api/scripts/seed
```
Expected for the grep: empty (every relative path now has the extra level).

- [ ] **Step 3: Point the root seed commands at the new paths**

```bash
sed -i 's#apps/api/scripts/seed-#apps/api/scripts/seed/seed-#g' package.json
grep -n 'scripts/seed/' package.json
```
Expected: four lines (`db:seed:grocery`, `db:seed:marketplace`, `db:seed:restaurant`, `db:seed:pharmacy`).

- [ ] **Step 4: Write the maintenance README**

`apps/api/scripts/maintenance/README.md`:

```markdown
# One-off data repairs

Scripts that were run once against a development database to repair data,
kept so the repair is reproducible and reviewable. None of them is part of any
`npm` script, and none should be run without reading it first.

| Script | What it did |
| --- | --- |
| `align-franchise-markets.ts` | Re-aligned each franchise's `country`/`currency` with the market registry after the multi-region change. |
| `backfill-seller-owner.ts` | Filled `sellers.owner_id` for rows created before seller ownership existed, so the owner-based authorisation on seller routes had something to check. |
| `sync-restaurant-tables.ts` | Created the restaurant tables that `synchronize` could not express, before the restaurant module had migrations. |
| `create-order-table.sql` | The first hand-written `orders` DDL, from before `order-service` mapped the `Order` entity. Superseded by the migrations in `apps/api/migrations/`. |

Run any of them from `apps/api` with
`npx ts-node -r tsconfig-paths/register scripts/maintenance/<name>.ts`.
New data repairs belong here too, with a row in this table.
```

- [ ] **Step 5: Verify the compiler still resolves every import, and the seed commands still point at files**

```bash
npm run type-check -w kartseek-api
node -e "const s=require('./package.json').scripts;for(const k of ['db:seed:grocery','db:seed:marketplace','db:seed:restaurant','db:seed:pharmacy']){const f=s[k].split(' ').pop();if(!require('fs').existsSync(f))throw new Error(k+' -> '+f+' missing')};console.log('seed paths ok')"
```
Expected: type-check clean (it covers `apps/api/scripts/**`; a broken relative import fails here), `seed paths ok`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "chore(api): group seed scripts and one-off data repairs under scripts/seed and scripts/maintenance

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Move `k8s/` to `infra/k8s/`

**Files:**
- Move: `k8s/**` (15 files) → `infra/k8s/**`
- Modify: `infra/k8s/deploy.sh`, `infra/k8s/utils.sh`, `.dockerignore`, `infra/k8s/README.md`, `infra/k8s/QUICKSTART.md`

- [ ] **Step 1: Move**

```bash
git mv k8s infra/k8s
```

- [ ] **Step 2: Make `deploy.sh` locate its manifests relative to itself**

`deploy.sh` applies files with literal `k8s/...` paths (lines 56–117), one of them inside a double-quoted `log_error` message, so a quoted variable cannot be substituted in blindly. Instead the script changes into its own directory once and every manifest becomes `./<file>`. Insert after `KUBECONFIG=${KUBECONFIG:-~/.kube/config}`:

```bash
# Manifests live beside this script; run it from anywhere.
cd "$(dirname "${BASH_SOURCE[0]}")"
```

then rewrite the paths:

```bash
sed -i 's#\bk8s/\([a-z-]*\.yaml\)#./\1#g; s#^\# Usage: \./k8s/deploy\.sh#\# Usage: ./infra/k8s/deploy.sh#; s#"\./config\.yaml still holds#"infra/k8s/config.yaml still holds#' infra/k8s/deploy.sh
sed -i 's#\./k8s/utils\.sh#./infra/k8s/utils.sh#g' infra/k8s/utils.sh
sed -i 's#\bk8s/#infra/k8s/#g' infra/k8s/README.md infra/k8s/QUICKSTART.md
sed -i 's#^k8s$#infra/k8s#' .dockerignore
grep -nE 'kubectl apply -f|grep -qE' infra/k8s/deploy.sh | head -4
```
Expected for the grep: every `apply -f` and the placeholder `grep` now reads `./<file>.yaml`.

- [ ] **Step 3: Verify**

```bash
bash -n infra/k8s/deploy.sh && bash -n infra/k8s/utils.sh && bash -n infra/k8s/gen-microservices.sh
grep -n 'cd "\$(dirname' infra/k8s/deploy.sh
git grep -nE '(^|[^A-Za-z0-9_./-])k8s/' -- ':!infra/k8s' ':!docs' ':!.gitignore'
```
Expected: three clean syntax checks; the `cd` line present once; the last grep empty.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "chore(infra): move Kubernetes manifests under infra/k8s

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Move `nginx/` to `infra/nginx/`

**Files:**
- Move: `nginx/**` (3 tracked files) → `infra/nginx/**`
- Modify: `docker-compose.yml:419-421`, `package.json:43` (`nginx:certs`)

- [ ] **Step 1: Move and repoint**

```bash
git mv nginx infra/nginx
sed -i 's#\./nginx/#./infra/nginx/#g' docker-compose.yml
sed -i 's#mkdir -p nginx/ssl#mkdir -p infra/nginx/ssl#; s#-v \./nginx/ssl:/ssl#-v ./infra/nginx/ssl:/ssl#' package.json
```

- [ ] **Step 2: Verify**

```bash
docker compose config --quiet && echo compose-ok
git grep -nE '(^|[^A-Za-z0-9_./-])nginx/' -- ':!infra/nginx' ':!docs' | grep -v 'infra/nginx'
```
Expected: `compose-ok`; the grep empty.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -q -m "chore(infra): move the nginx config under infra/nginx

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Split Compose into `infra/docker/compose.infra.yml` behind a root `include`

**Files:**
- Move: `docker-compose.yml` → `infra/docker/compose.infra.yml`
- Create: `docker-compose.yml` (root, include stub)

**Interfaces:**
- Produces: root `docker-compose.yml` with `include:`; phase 3 appends `infra/docker/compose.services.yml` and phase 2 `compose.observability.yml` to the same list. Every existing `npm run infra:*` / `nginx:*` script keeps working unchanged because they pass `-f docker-compose.yml` at the root.

- [ ] **Step 1: Capture the resolved configuration before the change**

```bash
docker compose config > "$TEMP/compose-before.yml"
```

- [ ] **Step 2: Move the file and fix its relative paths**

Relative paths inside an included file resolve against that file's directory, so `./infra/postgres/…` (9 lines) becomes `../postgres/…` and `./infra/nginx/…` (3 lines) becomes `../nginx/…`.

```bash
mkdir -p infra/docker
git mv docker-compose.yml infra/docker/compose.infra.yml
sed -i 's#\./infra/postgres/#../postgres/#g; s#\./infra/nginx/#../nginx/#g' infra/docker/compose.infra.yml
grep -c '\.\./postgres/' infra/docker/compose.infra.yml; grep -c '\.\./nginx/' infra/docker/compose.infra.yml
```
Expected counts: `9` and `3`.

- [ ] **Step 3: Create the root entry point**

`docker-compose.yml`:

```yaml
# Root Compose entry point.
#
# The definitions live under infra/docker/ and are pulled in with `include`,
# so `docker compose` and every npm script keep working from the repository
# root and variable interpolation keeps reading the root .env (the only .env
# Compose reads — see docs/guides/local-setup.md).
#
#   compose.infra.yml          Postgres (platform + one per module), Redis,
#                              Kafka, MongoDB, Elasticsearch, nginx, tools
#   compose.services.yml       the 35 application images (generated; phase 3)
#   compose.observability.yml  Prometheus + Grafana, `monitoring` profile (phase 2)
include:
  - path: infra/docker/compose.infra.yml
```

- [ ] **Step 4: Prove the resolved configuration is unchanged**

```bash
docker compose config > "$TEMP/compose-after.yml"
diff "$TEMP/compose-before.yml" "$TEMP/compose-after.yml" && echo IDENTICAL
npm run infra:status
```
Expected: `IDENTICAL` (Compose resolves every path to an absolute one in `config` output, so a wrong relative path shows as a diff). `infra:status` lists the same containers as before.

If the diff shows only the `name:` line, the project name changed; add `name: kartseekapp` (the value from `compose-before.yml`) as the first key of the root file and re-run the diff.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "chore(infra): move the Compose stack to infra/docker and include it from the root

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Move the three Dockerfiles to `infra/docker/` under honest names

**Files:**
- Move: `apps/api/Dockerfile` → `infra/docker/core-service.Dockerfile`; `apps/api/Dockerfile.prod` → `infra/docker/api-gateway.Dockerfile`; `apps/api/Dockerfile.marketplace` → `infra/docker/marketplace-service.Dockerfile`
- Modify: the three files' header comments; `.dockerignore` header comment

Phase 3 replaces these with parametrised templates; this task only makes their names say what they build.

- [ ] **Step 1: Move and fix the build commands quoted in each header**

```bash
git mv apps/api/Dockerfile infra/docker/core-service.Dockerfile
git mv apps/api/Dockerfile.prod infra/docker/api-gateway.Dockerfile
git mv apps/api/Dockerfile.marketplace infra/docker/marketplace-service.Dockerfile
sed -i 's#-f apps/api/Dockerfile\.prod#-f infra/docker/api-gateway.Dockerfile#g; s#-f apps/api/Dockerfile\.marketplace#-f infra/docker/marketplace-service.Dockerfile#g; s#-f apps/api/Dockerfile#-f infra/docker/core-service.Dockerfile#g; s#See Dockerfile\.prod#See api-gateway.Dockerfile#g' infra/docker/*.Dockerfile .dockerignore
git grep -nE 'apps/api/Dockerfile' -- ':!docs'
```
Expected for the grep: empty.

- [ ] **Step 2: Lint each Dockerfile without building**

```bash
docker build --check -f infra/docker/core-service.Dockerfile --build-arg APP=order-service . && \
docker build --check -f infra/docker/api-gateway.Dockerfile . && \
docker build --check -f infra/docker/marketplace-service.Dockerfile . && echo DOCKERFILES-OK
```
Expected: `DOCKERFILES-OK` (BuildKit's `--check` parses and lints; it does not run the stages).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -q -m "chore(infra): move the API Dockerfiles to infra/docker, named for what they build

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: One home for Postman: `tests/postman/`

**Files:**
- Move: `docs/api/postman/{collections,data,scripts,newman.config.js,README.md}` → `tests/postman/`; `docs/api/postman/environments/*` → `tests/postman/environments/`; `apps/api/postman/*.json` (2) and `tests/postman/payment-service.postman_collection.json` → `tests/postman/collections/`
- Delete: `docs/api/postman/reports/*` (31 reports, `summary.json`, `_working_environment.json`), `docs/api/postman/test-results.txt`
- Create: `tests/postman/reports/.gitkeep`
- Modify: `tests/postman/newman/run-payment-tests.sh:27`, `tests/postman/README.md`, `.gitattributes`, `.gitignore`

`scripts/run-all.js` computes `ROOT = path.join(__dirname, '..')` and reads `collections/`, `environments/`, `reports/`, `newman.config.js` from there, so moving the folder as a unit keeps it working.

- [ ] **Step 1: Move**

```bash
git mv docs/api/postman/collections tests/postman/collections
git mv docs/api/postman/data tests/postman/data
git mv docs/api/postman/scripts tests/postman/scripts
git mv docs/api/postman/newman.config.js tests/postman/newman.config.js
git mv docs/api/postman/README.md tests/postman/README.md
for f in docs/api/postman/environments/*.json; do git mv "$f" tests/postman/environments/; done
git mv apps/api/postman/KARTSEEK_Hotel_Booking_API.postman_collection.json tests/postman/collections/
git mv apps/api/postman/KARTSEEK_Pharmacy_API.postman_collection.json tests/postman/collections/
git mv tests/postman/payment-service.postman_collection.json tests/postman/collections/
git rm -rq docs/api/postman/reports docs/api/postman/test-results.txt
mkdir -p tests/postman/reports && touch tests/postman/reports/.gitkeep && git add tests/postman/reports/.gitkeep
rmdir docs/api/postman docs/api apps/api/postman 2>/dev/null; true
```

- [ ] **Step 2: Repoint the payment runner, the ignore rules and the attributes**

```bash
sed -i 's#"\$TESTS_DIR/payment-service.postman_collection.json"#"$TESTS_DIR/collections/payment-service.postman_collection.json"#' tests/postman/newman/run-payment-tests.sh
sed -i 's#docs/api/postman/reports/\*\*#tests/postman/reports/**#' .gitattributes
sed -i 's#docs/api/postman#tests/postman#g' tests/postman/README.md
```

Append to `.gitignore`:

```gitignore
# Newman output. The 31 reports that used to be committed were generated files.
tests/postman/reports/*
!tests/postman/reports/.gitkeep
```

- [ ] **Step 3: Verify**

```bash
node -e "const c=require('./tests/postman/newman.config.js');console.log('collections listed:',c.collections.length)"
bash -n tests/postman/newman/run-payment-tests.sh && echo runner-ok
ls tests/postman/collections | wc -l
git grep -nE 'docs/api/postman|apps/api/postman' -- ':!docs'
```
Expected: a collection count, `runner-ok`, `30` files (27 + 2 + 1), empty grep.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "chore(tests): consolidate the three Postman folders under tests/postman

Committed newman reports are generated output and are now ignored.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Reshape `docs/` (moves only; rewrites are plan 1C)

**Files:**
- Create dirs: `docs/guides`, `docs/architecture`, `docs/product`, `docs/audits`
- Move: see table
- Modify: `docs/archive/README.md` (two references)

| From | To |
|---|---|
| `docs/AUDIT_REPORT_2026-07-25.md` | `docs/audits/2026-07-25-audit-report.md` |
| `docs/KARTSEEK_AUDIT_2026-07-24.md` | `docs/audits/2026-07-24-kartseek-audit.md` |
| `docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md` | `docs/audits/2026-07-27-marketplace-fullstack-audit.md` |
| `docs/MODULE_ISOLATION_AUDIT_2026-07-27.md` | `docs/audits/2026-07-27-module-isolation-audit.md` |
| `docs/MARKETPLACE_REMEDIATION_2026-08-10.md` | `docs/audits/2026-08-10-marketplace-remediation.md` |
| `docs/FRONTEND_DATA_AUDIT.md` | `docs/audits/frontend-data-audit.md` |
| `docs/MARKETPLACE_MODULE_REVIEW.md` | `docs/audits/marketplace-module-review.md` |
| `docs/stabilization/FINAL_STABILIZATION_REPORT.md` | `docs/audits/final-stabilization-report.md` |
| `docs/stabilization/FULL_SYSTEM_SCAN_REPORT.md` | `docs/audits/full-system-scan-report.md` |
| `docs/PROJECT_SPECIFICATION.md` | `docs/product/project-specification.md` |
| `docs/KARTSEEK_WORKPLAN_PHASE1-4.md` | `docs/archive/kartseek-workplan-phase1-4.md` |
| `docs/API_SETUP_GUIDE.md` | `docs/guides/local-setup.md` |
| `MAPS_API_KEY.md` | `docs/guides/secrets.md` |
| `apps/MOBILE_APPS_README.md` | `docs/architecture/mobile.md` |

Dated reports get `YYYY-MM-DD-` prefixes so they sort chronologically; undated ones keep their names, lower-cased. No dates are invented.

- [ ] **Step 1: Move**

```bash
mkdir -p docs/guides docs/architecture docs/product docs/audits
git mv docs/AUDIT_REPORT_2026-07-25.md docs/audits/2026-07-25-audit-report.md
git mv docs/KARTSEEK_AUDIT_2026-07-24.md docs/audits/2026-07-24-kartseek-audit.md
git mv docs/MARKETPLACE_FULLSTACK_AUDIT_2026-07-27.md docs/audits/2026-07-27-marketplace-fullstack-audit.md
git mv docs/MODULE_ISOLATION_AUDIT_2026-07-27.md docs/audits/2026-07-27-module-isolation-audit.md
git mv docs/MARKETPLACE_REMEDIATION_2026-08-10.md docs/audits/2026-08-10-marketplace-remediation.md
git mv docs/FRONTEND_DATA_AUDIT.md docs/audits/frontend-data-audit.md
git mv docs/MARKETPLACE_MODULE_REVIEW.md docs/audits/marketplace-module-review.md
git mv docs/stabilization/FINAL_STABILIZATION_REPORT.md docs/audits/final-stabilization-report.md
git mv docs/stabilization/FULL_SYSTEM_SCAN_REPORT.md docs/audits/full-system-scan-report.md
git mv docs/PROJECT_SPECIFICATION.md docs/product/project-specification.md
git mv docs/KARTSEEK_WORKPLAN_PHASE1-4.md docs/archive/kartseek-workplan-phase1-4.md
git mv docs/API_SETUP_GUIDE.md docs/guides/local-setup.md
git mv MAPS_API_KEY.md docs/guides/secrets.md
git mv apps/MOBILE_APPS_README.md docs/architecture/mobile.md
rmdir docs/stabilization 2>/dev/null; true
```

- [ ] **Step 2: Keep the archive index true**

```bash
sed -i 's#the dated audits in `docs/` (for example `MARKETPLACE_REMEDIATION_2026-08-10.md`)#the dated audits in `docs/audits/` (for example `2026-08-10-marketplace-remediation.md`)#' docs/archive/README.md
grep -n 'docs/audits' docs/archive/README.md
```
Expected: one line.

- [ ] **Step 3: Verify the tree**

```bash
ls docs docs/audits docs/guides docs/architecture docs/product
git status --short | grep -vE '^R' || echo "all moves recorded as renames"
```
Expected: `docs/` root now holds only `README`-less directories plus `archive/`, `superpowers/`; every change is an `R` line except the archive README `M`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "docs: sort docs/ into guides, architecture, product, audits and archive

Content is unchanged; rewrites follow in phase 1C.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Name the vendored Dart package for what it is

**Files:**
- Move: `packages/native-bindings` → `packages/vendor/objective_c`
- Modify: `apps/customer/pubspec.yaml:73`, `apps/partner/pubspec.yaml:58`, `packages/shared-mobile/pubspec.yaml:45`, `.gitignore` (one comment), the three `pubspec.lock` files (regenerated)
- Create: `packages/vendor/README.md`

- [ ] **Step 1: Move and repoint the three `dependency_overrides`**

```bash
mkdir -p packages/vendor
git mv packages/native-bindings packages/vendor/objective_c
sed -i 's#path: \.\./\.\./packages/native-bindings#path: ../../packages/vendor/objective_c#' apps/customer/pubspec.yaml apps/partner/pubspec.yaml packages/shared-mobile/pubspec.yaml
sed -i 's#(native-bindings, shared-mobile)#(vendor/objective_c, shared-mobile)#' .gitignore
git grep -n 'native-bindings' -- ':!docs' ':!*.lock'
```
Expected for the grep: empty.

- [ ] **Step 2: Explain the vendoring**

`packages/vendor/README.md`:

```markdown
# Vendored third-party packages

Packages copied into the repository because the published version cannot be
used as-is. Each one records what was changed and why, so it can be dropped the
day upstream fixes the problem.

## `objective_c/` — pub.dev `objective_c` 9.4.1, patched

`package:objective_c` is the Dart FFI support library that `ffigen`-based iOS
plugins (`path_provider_foundation`, `dart_webrtc`, …) depend on. Version
9.4.1 runs a native `build.dart` hook that fails on Windows when the path
contains a space — and this project is developed under `C:\Users\Hp EliteBook`.

This copy is the upstream source with the native build hook disabled. The
three Flutter workspaces that transitively need it pin it through
`dependency_overrides` in their `pubspec.yaml`:

- `apps/customer`
- `apps/partner`
- `packages/shared-mobile`

`apps/seller` avoids the dependency instead (see the comments in its
`pubspec.yaml`).

To remove the override: bump the affected plugins to versions whose
`objective_c` dependency builds on Windows paths with spaces, delete the
override lines, run `flutter pub get` in each workspace, and delete this
directory.
```

- [ ] **Step 3: Regenerate the lockfiles and prove resolution**

```bash
for d in apps/customer apps/partner packages/shared-mobile; do (cd $d && flutter pub get --offline >/dev/null && echo "pub get ok: $d") || { echo "PUB GET FAILED: $d"; break; }; done
git status --short | grep pubspec.lock
```
Expected: three `pub get ok` lines; the three lockfiles show as modified (their `objective_c` path entries now read `../../packages/vendor/objective_c`). If `--offline` fails because a hosted package is not cached, rerun without `--offline`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "chore(mobile): rename the vendored objective_c fork for what it is

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Rename the Dart package `shared_mobile` → `kartseek_shared_mobile`

**Files:**
- Modify: `packages/shared-mobile/pubspec.yaml:1`; `apps/customer/pubspec.yaml:20`, `apps/partner/pubspec.yaml:18`, `apps/seller/pubspec.yaml:18` (dependency key); ~330 `.dart` files (662 import lines); `cspell.json:320`; four `pubspec.lock`

The directory stays `packages/shared-mobile` (Dart does not tie a path dependency's directory name to its package name). Baseline measured 2026-09-05: `flutter analyze` on `packages/shared-mobile` reports 1 pre-existing issue (`deprecated_export_use` in `lib/core/security/secure_api_client.dart:70`) and takes ~100 s.

- [ ] **Step 1: Record the baseline issue count for all four Dart workspaces**

```bash
for d in packages/shared-mobile apps/customer apps/partner apps/seller; do
  (cd $d && flutter pub get --offline >/dev/null 2>&1; echo "== $d"; flutter analyze --no-pub 2>&1 | tail -1)
done | tee "$TEMP/dart-baseline.txt"
```
Expected: a `N issues found.` (or `No issues found!`) line per workspace. Record the four numbers; they are the pass criterion in step 4. If any workspace fails to analyze at all (tooling error, not lint issues), stop this task, leave the package name as it is, and note the failure in the 1C README task for `packages/shared-mobile`.

- [ ] **Step 2: Rename**

```bash
sed -i '1s/^name: shared_mobile$/name: kartseek_shared_mobile/' packages/shared-mobile/pubspec.yaml
sed -i 's/^  shared_mobile:$/  kartseek_shared_mobile:/' apps/customer/pubspec.yaml apps/partner/pubspec.yaml apps/seller/pubspec.yaml
git grep -l 'package:shared_mobile/' -- '*.dart' | xargs sed -i 's#package:shared_mobile/#package:kartseek_shared_mobile/#g'
sed -i 's/"shared_mobile"/"kartseek_shared_mobile"/' cspell.json
git grep -n 'shared_mobile' -- ':!docs' ':!*.lock' | grep -v kartseek_shared_mobile
```
Expected for the last grep: empty.

- [ ] **Step 3: Regenerate lockfiles**

```bash
for d in packages/shared-mobile apps/customer apps/partner apps/seller; do (cd $d && flutter pub get --offline >/dev/null && echo "pub get ok: $d") || { echo "PUB GET FAILED: $d"; break; }; done
```

- [ ] **Step 4: Analyze and compare with the baseline**

```bash
for d in packages/shared-mobile apps/customer apps/partner apps/seller; do (cd $d && echo "== $d" && flutter analyze --no-pub 2>&1 | tail -1); done | tee "$TEMP/dart-after.txt"
diff "$TEMP/dart-baseline.txt" "$TEMP/dart-after.txt" && echo SAME-AS-BASELINE
```
Expected: `SAME-AS-BASELINE`. Any new issue is an import the substitution missed; find it with `grep -rn "shared_mobile" <workspace>/lib` and fix it.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "refactor(mobile): rename the shared Dart package to kartseek_shared_mobile

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Prune `scripts/` and rewrite its README

**Files:**
- Delete: `scripts/fix-dark-theme.js`, `scripts/fix_jsx.js`, `scripts/web/fix_accessibility_lint.js`, `scripts/mobile/fix_const_errors.js`, `scripts/mobile/fix_static_declarations.js`, `scripts/mobile/fix_undeclared_variables.js`, `scripts/mobile/replace_hardcoded_currency.js`, `scripts/mobile/fix_objective_c_bug.ps1`, `scripts/mobile/recreate_dummy_objective_c.ps1`, `scripts/mobile/run_customer_app.ps1`, `scripts/mobile/run_partner_app.ps1`, `scripts/api/install_backend_dependencies.js`, `scripts/api/scaffold_microservices.js`, `scripts/api/scaffold_project_structure.js`, `scripts/api/write_all_service_files.js`
- Modify: `scripts/README.md`

Kept: `scripts/check-type-imports.js` (the type-import gate every backend `type-check` runs). Plans 1B and 1C add `scripts/registry/` and `scripts/docs/` and extend this README.

- [ ] **Step 1: Prove nothing references the deleted scripts, then delete**

```bash
git grep -nE "fix-dark-theme|fix_jsx|fix_accessibility_lint|fix_const_errors|fix_static_declarations|fix_undeclared_variables|replace_hardcoded_currency|fix_objective_c_bug|recreate_dummy_objective_c|run_customer_app|run_partner_app|install_backend_dependencies|scaffold_microservices|scaffold_project_structure|write_all_service_files" -- ':!scripts' ':!docs'
git rm -rq scripts/fix-dark-theme.js scripts/fix_jsx.js scripts/web scripts/mobile scripts/api
```
Expected for the grep: empty.

- [ ] **Step 2: Rewrite the README**

`scripts/README.md`:

```markdown
# scripts/

Repository-wide tooling. Anything that belongs to one workspace lives in that
workspace (`apps/api/scripts/`, `apps/web/scripts/`), not here.

| Script | Purpose | Run |
| --- | --- | --- |
| `check-type-imports.js` | The type-import gate. `consistent-type-imports` cannot see decorated files under `emitDecoratorMetadata`, so this script checks every backend workspace's imports directly. Every backend `type-check` script calls it. | `node scripts/check-type-imports.js apps/api` (or a module backend path) |

## What is not here any more

The one-off codemods that lived in `scripts/`, `scripts/web/`, `scripts/mobile/`
and `scripts/api/` (Dart `const` repairs, currency-symbol replacement, the
initial NestJS scaffolders, dark-theme and JSX fix-ups) were removed on
2026-09-05. They ran once, against a tree that no longer exists, and git
history keeps them: `git log --diff-filter=D --summary -- scripts/`.

## Adding a script

Put it here only if it operates on more than one workspace. Give it a
one-line header comment saying what it does and how to run it, add a row to
the table above, and wire it into a root `package.json` script if people are
expected to run it.
```

- [ ] **Step 3: Verify the gate still runs and commit**

```bash
node scripts/check-type-imports.js apps/api && echo gate-ok
ls scripts
git add -A && git commit -q -m "chore(scripts): remove one-off codemods and describe what remains

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
Expected: `gate-ok`; `ls scripts` shows `README.md` and `check-type-imports.js` only.

---

### Task 16: Phase 1A gate

**Files:** none new. Fix-ups, if any, are committed as `fix:` commits.

- [ ] **Step 1: Full workspace gate**

```bash
npm ci
npm run type-check
npm run lint
npm run build
npm test
```
Expected: every Turbo task green. `npm run build` compiles 26 Nest projects and 9 Next apps.

- [ ] **Step 2: Infrastructure and Dockerfile checks**

```bash
docker compose config --quiet && echo compose-ok
docker build --check -f infra/docker/core-service.Dockerfile --build-arg APP=order-service . >/dev/null && echo dockerfile-ok
```

- [ ] **Step 3: Old-path sweep**

```bash
git grep -nE '(^|[^A-Za-z0-9_./-])(k8s|nginx)/' -- ':!infra' ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!.gitignore'
git grep -nE 'docs/api/postman|apps/api/postman|native-bindings|package:shared_mobile/|apps/api/Dockerfile|apps/mobile/|MAPS_API_KEY\.md|MOBILE_APPS_README' -- ':!docs/audits' ':!docs/archive' ':!docs/superpowers' ':!*.lock'
```
Expected: both empty. (`docs/guides/local-setup.md`, `docs/architecture/mobile.md`, root `README.md`, `ARCHITECTURE.md`, `infra/k8s/README.md` still contain stale prose — plan 1C rewrites them; if either grep hits one of those five files only, record it and proceed.)

- [ ] **Step 4: Spot-boot two renamed services**

```bash
npm run infra:up
(cd apps/api && node dist/apps/order-service/main.js > "$TEMP/order.log" 2>&1 & echo $! > "$TEMP/order.pid")
(cd apps/api && node dist/apps/api-gateway/main.js  > "$TEMP/gw.log" 2>&1 & echo $! > "$TEMP/gw.pid")
sleep 25
curl -s -o /dev/null -w "order-service /health -> %{http_code}\n" http://127.0.0.1:3014/health
curl -s -o /dev/null -w "api-gateway /api/v1/health -> %{http_code}\n" http://127.0.0.1:3001/api/v1/health
kill $(cat "$TEMP/order.pid") $(cat "$TEMP/gw.pid")
```
Expected: both `200`. (Plan 1B's smoke test boots all 26.)

- [ ] **Step 5: Record the gate in the last commit of the phase**

If steps 1–4 needed no fix-ups, no commit is necessary. Otherwise commit the fix-ups and note in the body which gate step found them.
