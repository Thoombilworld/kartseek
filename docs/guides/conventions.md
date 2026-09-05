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
class `<Deployable>Module`. This is exactly what `nest g app <name>` generates
on its own, and 11 of the 26 deployables already followed it before it became
a documented rule. Examples: `order-service.module.ts` exports
`OrderServiceModule`; `api-gateway.module.ts` exports `ApiGatewayModule`;
`marketplace-service.module.ts` exports `MarketplaceServiceModule`.

Feature modules inside a service keep their domain name instead — an
`order.module.ts` exporting `OrderModule` is fine as a _feature_ module
imported by the root, but never as the root module itself. Mixing this up is
exactly the shape of bug in
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
  `common`, `database`, `decorators`, `dto`, `events`, `gdpr`, `grpc`,
  `guards`, `kafka`, `logger`, `redis`, `region`, `security`, `storage`,
  `validators` — are the pattern to follow.
- **Shared web code** goes in `packages/shared-core` (the API client, i18n,
  routes, hooks) or `packages/shared-ui` (shared components) — never
  duplicated per zone.

## Commits

Conventional Commits, enforced by `commitlint` on every commit (via `husky`'s
`commit-msg` hook, installed by the root `prepare` script). The config is in
the root `package.json`:

```json
"commitlint": { "extends": ["@commitlint/config-conventional"] }
```

`lint-staged` (also wired through `husky`) runs on every staged file at commit
time: Prettier plus `eslint --fix --max-warnings 0` for `.ts`/`.tsx`/`.js`/`.jsx`,
and Prettier alone for `.json`/`.md`/`.yml`/`.yaml`.

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
