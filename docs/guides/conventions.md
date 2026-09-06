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
  `common`, `database`, `decorators`, `gdpr`, `grpc`, `guards`, `kafka`,
  `redis`, `region`, `security`, `storage` — are the pattern to follow. A
  library nothing imports is removed, not kept for later: four scaffolds
  (`dto`, `events`, `logger`, `validators`) went that way on 2026-09-06.
- **Shared web code** goes in `packages/shared-core` (the API client, i18n,
  routes, hooks) or `packages/shared-ui` (shared components) — never
  duplicated per zone.

## Commits

Two git hooks run on every commit, installed by husky when `npm install` runs
the root `prepare` script (`git config core.hooksPath` shows `.husky/_` on a
working checkout):

- `.husky/pre-commit` runs `lint-staged` — Prettier then `eslint --fix` on the
  staged `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs` files, Prettier alone on staged
  `.json`/`.md`/`.yml`/`.yaml` — and then the registry check
  (`node scripts/registry/validate.mjs`). An ESLint error blocks the commit;
  advisory warnings do not.
- `.husky/commit-msg` runs commitlint with `@commitlint/config-conventional`.

Both configurations live in the root `package.json` (`lint-staged`,
`commitlint`) and `.husky/`. Phase 4's CI will run the same checks on pull
requests; until then the hooks are the enforcement.

The message format is `type(scope): subject`, e.g. `fix(gateway): stop
dropping the X-Region-Code header`. This repository's own history uses `feat`, `fix`,
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

`npm run format` writes across every tracked
`.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs`/`.json`/`.md`/`.yml`/`.yaml` file
(respecting `.gitignore` and `.prettierignore`); `npm run format:check` is the
same pass in check-only mode, for CI. In practice you rarely need either by
hand — the pre-commit hook formats whatever you are about to commit.

## Linting

One ESLint and one typescript-eslint, declared at the root; no workspace
declares its own. A backend's `eslint.config.js` is a one-line call into
`apps/api/eslint.base.js`; a Next app's `eslint.config.mjs` is a one-line
import of `apps/web/eslint.base.mjs`. Change a rule in the base, never in a
workspace. `npm ls eslint` exits with `ELSPROBLEMS` because eslint-config-next's
transitive plugins still declare a peer range of ESLint 9; exactly one ESLint
is installed, and nesting an ESLint 9 to silence the message would recreate
the split this arrangement removed. The root `eslint.config.mjs` covers only the repository's own
scripts under `scripts/` and `tests/`. `packages/shared-core` and
`packages/shared-ui` are formatted by the hooks but have no lint owner yet;
the root config ignores them deliberately until one is chosen. Warning
policy and current counts are in [`testing.md`](testing.md#lint).

## Cleaning

`npm run clean` removes every workspace's build output (`dist`, `.next`,
`out`, `tsconfig.tsbuildinfo`) and the Turbo cache with `rimraf`, so it works
under npm's `cmd.exe` on Windows as well as under bash. It never touches
`node_modules`; `npm ci` is the reset for those.
