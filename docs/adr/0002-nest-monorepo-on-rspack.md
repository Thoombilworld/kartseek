# 0002 — One Nest monorepo built with rspack

**Status:** Accepted, 2026-09-05 (records a decision made 2026-08)

## Context

The Nest CLI deprecated its webpack builder and prints a notice on every build
recommending `--builder rspack`. Separately, TypeScript 6 deprecates
`baseUrl`, and `tsc --noEmit` now rejects it, so `@app/*` resolution could no
longer lean on a `baseUrl` plus `paths` pair in `apps/api/tsconfig.json` — it
has to be explicit, and it has to work identically from the eight module
backends, each building with its own tsconfig.

Moving the builder surfaced three runtime faults that a clean build had been
hiding:

- **Dual `@nestjs/core` through `nodeExternals`.** The CLI's default
  `nodeExternals()` only recognises `apps/api/node_modules`. Once
  `@nestjs/core` and `@nestjs/common` moved to the repository root as direct
  dependencies — the fix for two copies of `@nestjs/core` reaching the tree
  through a peer-satisfied hoist — the six packages still nested under
  `apps/api` (apollo, graphql, microservices, platform-express, swagger,
  testing) stayed external and loaded their own copy of `@nestjs/core` from
  disk. Two copies means two `HttpAdapterHost` classes; Nest's DI matches
  providers by class identity, so the container's instance never satisfied
  the externally loaded module's token. It surfaced as
  `Nest can't resolve dependencies of the GraphQLModule`, and only once a
  process started — never at build.
- **A temporal-dead-zone crash on circular entities.** TypeORM's relations
  are mutually referential, and `emitDecoratorMetadata` emits `design:type`
  as an eager class reference. Under rspack's ESM bindings that reference
  hits the temporal dead zone: seven of the eight module backends died on
  boot with `ReferenceError: Cannot access 'Product' before initialization`.
- **A legacy `nest-cli.json` key that silently wins.** Passing
  `--builder rspack` on the command line was not enough to move a service
  off webpack: the older `webpack: true` / `webpackConfigPath` keys in
  `nest-cli.json` take precedence, so a service kept building with webpack
  while the CLI reported success.

Because the first and third faults compiled cleanly and only appeared once a
process started, a build that passed proved nothing about whether a service
could boot. The acceptance test for the migration was therefore all 26
projects building **and** booting — every service started and waited on until
Nest reported it up — not `nest build` succeeding in isolation.

## Decision

All 18 core services and the 8 module backends compile with the Nest CLI's
rspack builder through the single `apps/api/rspack.config.js`. `@app/*`
resolves through explicit `paths` and the `appLibs` alias list in that file;
no `baseUrl`. Entity lists are explicit arrays, never globs, because a bundled
`main.js` has no `__dirname` tree to glob.

## Consequences

Builds are faster: rspack compiles through `builtin:swc-loader` in place of
webpack's `ts-loader`, and `ts-loader` is gone from all ten manifests along
with `webpack` from the root. Type-checking is not skipped, though — the CLI
still injects `fork-ts-checker-webpack-plugin` into every rspack build, so
`nest-cli.json`'s `typeCheck: false` only affects the swc builder, and
`tsc --noEmit` remains the gate for what a build does not reach.

Every new shared library must be registered in five places for a workspace to
resolve it the same way everywhere: `apps/api/nest-cli.json` projects,
`apps/api/tsconfig.json` paths, the `appLibs` array in
`apps/api/rspack.config.js`, the eight `modules/*/backend/tsconfig.json`
paths, and the alias map in `apps/api/test/vitest-backend.mts`. Missing one
does not fail loudly; it resolves to a different file in that one workspace.

A build that passes can still fail at boot, as the dual-`@nestjs/core` and
legacy-key faults showed. `tests/smoke/boot-all.mjs` — which starts every
deployable from `dist` and probes its health route — is part of the
verification gate for this reason, run after `npm run build` and
`npm test` and before any change is considered done.
