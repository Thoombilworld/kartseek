# Conventions

This guide is for anyone adding a new file, service, or vertical to KARTSEEK
and wants it to look like it belongs — the fixed skeleton each kind of
workspace follows, how root modules and file names are cased, where a given
piece of new code should actually live, and the commit, type-import, and
formatting rules the tooling enforces. It transcribes decisions D1–D3 from
[`docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`](../superpowers/specs/2026-09-05-platform-reorganization-design.md)
(section 3).

## D1 — One skeleton per workspace kind

**Every Nest deployable** (a core service, a module backend, or the gateway):

```
src/
├── main.ts
├── <deployable>.module.ts   # the root module — see D2
├── dto/
└── entities/                # only when the service owns tables
```

**Every Next.js deployable** (the web shell or a zone frontend):

```
src/
├── app/
├── components/
└── lib/
```

**Every Flutter app** (`apps/customer`, `apps/partner`, `apps/seller`):

```
lib/
├── main.dart
├── features/
└── routing/
```

## D2 — Root module naming

A Nest deployable's root module file is `<deployable>.module.ts`, exporting a
class `<Deployable>Module` — the one module `main.ts` passes to
`NestFactory.create`. This is exactly what `nest g app <name>` generates on
its own. Before the 2026-09-05 renames, 11 of the 26 deployables already
followed it; that day's renames brought the other 15 into line, so all 26
follow it now. Examples: `order-service.module.ts` exports
`OrderServiceModule`; `api-gateway.module.ts` exports `ApiGatewayModule`;
`marketplace-service.module.ts` exports `MarketplaceServiceModule`.

A deployable's _feature_ modules sit beside its root module and keep their own
domain name instead — `cart-service`'s root is `cart-service.module.ts`
(`CartServiceModule`), while a feature module inside it such as
`cart.module.ts` (`CartModule`) is imported by the root but is never the root
itself. Mixing this up is exactly the shape of bug in
[`troubleshooting.md`](troubleshooting.md#unknowndependenciesexception-on-boot-after-a-root-module-rename):
a same-shaped stub module standing in for the real root module, wired
differently, and shadowing it.

## D3 — Casing

TypeScript and TSX: file names are **kebab-case** (`order-service.module.ts`,
`create-order.dto.ts`); exported symbols are **PascalCase**
(`OrderServiceModule`, `CreateOrderDto`).

Dart follows Dart's own convention instead of TypeScript's: **snake_case**
file names, and the `kartseek_` prefix on package names
(`packages/shared-mobile` is the Dart package `kartseek_shared_mobile`).

Ten `.tsx` files still carry a PascalCase file name instead of kebab-case: six
under `apps/web/src/app/admin/**/page-builder/components/`
(`GrocerySectionEditor.tsx`, `SectionTypeMenu.tsx`,
`MarketplaceSectionEditor.tsx`, `MarketplaceSectionTypeMenu.tsx`,
`SectionEditorModal.tsx`, `SortableSection.tsx`) and four in
`packages/shared-ui/src/` (`recommendations/CrossModulePicks.tsx`,
`recommendations/RecommendationCarousel.tsx`, `shared/NotifyMeModal.tsx`,
`ui-widgets/ProgressBar.tsx`). They predate this rule and were left as-is in
phase 1 to keep that fix wave scoped to path and naming corrections rather
than a page-builder/shared-ui rename; rename each to kebab-case the next time
its area is touched, not as a standalone change.

## Where new code goes

- **A new vertical** (a ninth module alongside marketplace, grocery,
  restaurant, pharmacy, doctor, hotel, taxi, and franchise) is a new
  `modules/<name>/backend` and `modules/<name>/frontend` workspace pair, plus
  a new entry in `services.yaml` — the registry is what generates its port
  table, its README's registry block, and what `tests/smoke/boot-all.mjs`
  boots and probes.
- **A new core service** (staying inside the `apps/api` workspace, alongside
  the gateway and the other 17) is a new `apps/api/apps/<name>-service`
  directory, a new `"type": "application"` entry in `apps/api/nest-cli.json`,
  and a new `services.yaml` entry.
- **Shared backend code**, used by more than one Nest deployable, is a new
  library under `apps/api/libs/<name>` — and has to be registered in all
  **five** places a shared library needs to resolve identically everywhere;
  see
  [`troubleshooting.md`](troubleshooting.md#nest-cant-resolve-dependencies-at-boot-right-after-adding-a-app-library)
  for the exact list (`nest-cli.json`, `apps/api/tsconfig.json`, the
  `appLibs` array in `apps/api/rspack.config.js`, every
  `modules/*/backend/tsconfig.json` that needs it, and the alias map in
  `apps/api/test/vitest-backend.mts`). Existing libraries —
  `common`, `database`, `decorators`, `dto`, `events`, `gdpr`, `grpc`,
  `guards`, `kafka`, `logger`, `redis`, `region`, `security`, `storage`,
  `validators` — are the pattern to follow.
- **Shared web code** goes in `packages/shared-core` (the API client, i18n,
  routes, hooks) or `packages/shared-ui` (shared components) — never
  duplicated per zone.

## Commits

The root `package.json` carries a `commitlint` config:

```json
"commitlint": { "extends": ["@commitlint/config-conventional"] }
```

It also carries a `lint-staged` config describing the intended per-commit
checks: Prettier plus `eslint --fix --max-warnings 0` for
`.ts`/`.tsx`/`.js`/`.jsx`, and Prettier alone for `.json`/`.md`/`.yml`/`.yaml`.
Both describe _intended_ checks only. **No git hook currently installs or
runs either one.** There is no `husky`
directory in the tree, `.git/hooks` holds only Git's own `.sample` files, and
`core.hooksPath` is unset — confirm any of that yourself with
`git ls-files | grep -i husky` (empty) or `ls .git/hooks` (only `*.sample`).
The root `prepare` script that is supposed to install the hook,
`node -e "try { require('husky').install() } catch(e) {}"`, throws
`TypeError: require(...).install is not a function` under the installed
husky 9 (which ships an ES module with a default export, not the `.install`
static method husky 8's API had) — and the surrounding `try/catch` swallows
that error silently, so `npm install` reports success either way.

Until phase 4 wires `commitlint` into CI to check pull requests, Conventional
Commits here is a convention developers follow by hand, not a rule anything
enforces: `type(scope): subject`, e.g. `fix(gateway): stop dropping the
X-Region-Code header`. This repository's own history uses `feat`, `fix`,
`docs`, `chore`, `refactor`, `test`, and `build` as types; scope is the
affected package or area and is optional. Commits authored with Claude Code
carry a trailing

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

trailer, separated from the subject/body by a blank line.

## Type imports

`import type` matters more here than in most TypeScript codebases: the rspack
builder compiles each file **alone** with swc, which cannot see across files
to know that an imported name is only ever used as a type. In a file with
decorators — every controller, service, entity, and DTO in this codebase,
because `emitDecoratorMetadata` is on — swc keeps a type-only import around
for the `design:paramtypes`/`design:type` metadata it emits, and the build
then fails trying to link an import that does not exist at runtime, but only
in the services that happen to reach that file. Neither `isolatedModules` nor
`@typescript-eslint/consistent-type-imports` catches this in a decorated file
(the ESLint rule is deliberately silent wherever `emitDecoratorMetadata` is
on). The actual gate is `scripts/check-type-imports.js`, run as part of every
backend workspace's `type-check` script — see
[`testing.md`](testing.md#type-gates) for how it works.

## Formatting

Prettier, configured in the root `package.json`:

```json
"prettier": {
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

`npm run format` writes across every tracked `.ts`/`.tsx`/`.js`/`.jsx`/`.json`/`.md`
file (respecting `.gitignore`); `npm run format:check` is the same pass in
check-only mode, for CI. In practice you rarely need either by hand —
`lint-staged` formats whatever you are about to commit.
