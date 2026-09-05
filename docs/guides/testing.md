# Testing

This guide covers every layer of testing in KARTSEEK — unit, integration,
end-to-end, the architectural contract check, the boot smoke test, and the
Postman collections — plus the type-check gate and a rule for authorization
tests specifically. It is for anyone writing or running tests, and for anyone
whose `npm test` or `npm run build` failed and needs to know which command
reproduces it in isolation.

## Unit

```bash
npm test
```

is `turbo run test` at the root, which runs every workspace's own `test`
script. Backends use **Vitest** (`vitest run`) through one shared factory,
`apps/api/test/vitest-backend.mts` — every backend workspace's
`vitest.config.mts` calls `backendVitestConfig({ workspaceDir })` from it
rather than declaring its own alias list, so `@app/common`, `@app/database`,
and the rest resolve identically everywhere and cannot silently drift between
workspaces. `apps/web` and the eight module frontends use **Jest**
(`jest --verbose` for `apps/web`, plain `jest` for the zones).

Run one workspace's suite directly with `-w`:

```bash
npm test -w kartseek-api
npm test -w @kartseek/marketplace-backend
npm test -w kartseek-web
npm test -w @kartseek/grocery-frontend
```

## Integration

```bash
npm run test:integration -w @kartseek/marketplace-backend
```

These specs need live infrastructure — a reachable Postgres for the schema
specs, a running gateway on its own port for the HTTP smoke spec — so they run
against a companion Vitest config (`vitest.integration.mts`) that targets
`**/*.integration.spec.ts` instead of the default `**/*.spec.ts`. They are
**excluded from `npm test`**: the default `vitest.config.mts` for a backend
workspace lists them by name under `exclude` (for example
`src/__tests__/schema.integration.spec.ts`,
`test/marketplace.integration.spec.ts`,
`test/marketplace-smoke.integration.spec.ts`), because they need Postgres
reachable and flake under the parallel load a unit run uses. Bring
infrastructure up first:

```bash
npm run infra:up
npm run test:integration -w @kartseek/marketplace-backend
```

## End-to-end

**Gateway specs** — the two specs that need a fully running platform
(Postgres, Redis, Kafka, and the gateway itself reachable) are excluded from
`npm test` the same way and run through their own Vitest config,
`apps/api/test/vitest.e2e.mts`:

```bash
npm run test:e2e -w kartseek-api
```

This runs `test/authorization.e2e-spec.ts` and `test/e2e-journey.spec.ts`.

**Web journeys** — Playwright, driven from `apps/web`:

```bash
npm run test:e2e -w kartseek-web
```

The five specs under `apps/web/e2e/` are `homepage.spec.ts`,
`product-detail.spec.ts`, `search-brand.spec.ts`, `cart-checkout.spec.ts`, and
`grocery-customer-journey.spec.ts`.

## Contract

`apps/api/test/gateway-service-contract.spec.ts` parses source rather than
booting anything, so it runs in about a second, as part of the normal
`kartseek-api` unit run. It asserts three static properties of the gateway ↔
microservice boundary that used to fail silently at runtime (the gateway's
`send(cmd, payload, fallback)` helper turns each of them into a 200 with an
empty body rather than an error):

1. Every TCP command the gateway's controllers send has a corresponding
   `@MessagePattern` handler somewhere — in `apps/api`'s own services or in one
   of the extracted module backends under `modules/*/backend/src` (each module
   is discovered automatically; a directory added to `modules/` is picked up,
   one added anywhere else is not).
2. No literal route is declared after a parameterised sibling that would
   capture it first (the classic case: `/restaurants/favorites` being routed
   as `/restaurants/:id` with `id = "favorites"`).
3. No handler reads a payload key the gateway never actually sends.

The spec keeps explicit baseline lists of currently-unimplemented commands.
Those lists may only shrink — implementing a command and forgetting to remove
it from its baseline is treated as a failure too, specifically so the baseline
cannot quietly rot into a permanent excuse list.

## Smoke

```bash
npm run build
npm run infra:up
npm run smoke
```

`tests/smoke/boot-all.mjs` starts every Nest deployable from its **built**
output (it does not compile — `npm run build` has to happen first), in batches
so a laptop is not asked to start every service at once. Each service gets a
per-service timeout to answer its registry-declared `health.live` route with
200; a service with no HTTP health route yet passes on a plain TCP connect
instead. Run a subset with `--only`:

```bash
npm run smoke -- --only=order-service,marketplace-service
```

## Postman

34 collections and 9 environment files under `tests/postman/` cover the whole
platform's HTTP surface end to end, run either from Postman Desktop or headless
with Newman. Full instructions — importing, running a single collection,
running everything, the auth-token bootstrapping order, and CI integration —
are in [`tests/postman/README.md`](../../tests/postman/README.md).

## Type gates

```bash
npm run type-check
```

is `turbo run type-check`, and each backend workspace's own `type-check`
script is `tsc --noEmit -p tsconfig.json && npm run check:type-imports` —
**`tsc` alone is not the gate.** `scripts/check-type-imports.js` runs a second,
narrower `tsc` pass under a side `tsconfig.type-imports.json` that turns on
`verbatimModuleSyntax` just to catch one thing `tsc`'s normal run does not:
a type-only binding imported as a value. The rspack builder compiles each file
alone with swc, which cannot see that an imported name is only a type — in a
file with decorators, swc keeps the import for the `design:paramtypes`
metadata it emits, and the build fails to link it, but only in the services
that reach that file. ESLint's own
`@typescript-eslint/consistent-type-imports` rule cannot catch this here
either: it is silent in any file containing a decorator once
`emitDecoratorMetadata` is on, which is every controller, service, entity, and
DTO in this codebase. See [`conventions.md`](conventions.md) for why
`import type` matters day to day.

## Authorization tests

**Never set `DEV_AUTH_BYPASS=true` while testing authorization.** With it on,
an anonymous request (no `Authorization` header) is treated as signed in —
commonly as `SUPER_ADMIN`, if `DEV_AUTH_BYPASS_ROLE` is set that way locally —
so a route that should reject an anonymous caller will happily serve it, and
the test proves nothing. Always send a real `Authorization: Bearer <token>`
header when a test is meant to exercise who is or is not allowed to do
something; CI never sets the flag for exactly this reason (see
[`running-services.md`](running-services.md#flags)).

## Known, pre-existing gaps

These are real failures on this branch today, unrelated to the platform
reorganization — recorded here so a run that hits them is not mistaken for
something this change broke.

- **Lint is broken for `apps/web` and all eight module frontends.** A nested
  ESLint 10.9.1 crashes with `scopeManager.addGlobals is not a function`.
  Reproduce with `npm run lint -w kartseek-web` or
  `npm run lint -w @kartseek/<vertical>-frontend`.
- **`apps/api` lint reports 35 problems**; `npm run lint -w kartseek-api`.
- **`@kartseek/marketplace-backend` lint reports 6 problems**;
  `npm run lint -w @kartseek/marketplace-backend`.
- **Five of the eight module frontends fail `next build` without three
  environment variables set** — `NEXT_PUBLIC_API_URL`, `API_URL`, and
  `NEXT_PUBLIC_WS_URL`. Reproduce with `npm run build -w @kartseek/<vertical>-frontend`
  in a shell missing those.
- **`@kartseek/grocery-frontend` has 2 failing Jest tests**;
  `npm test -w @kartseek/grocery-frontend`.
- **`@kartseek/marketplace-frontend`'s type-check fails on two specs**;
  `npm run type-check -w @kartseek/marketplace-frontend`.
