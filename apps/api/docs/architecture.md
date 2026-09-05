# API workspace architecture

This is the workspace-specific companion to
[`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md) — it covers what is
particular to building and running `apps/api`, not the platform end to end.
For what is deployed, how a request travels through the system, and the
communication transports between services, read the root document and the
pages under [`../../../docs/architecture/`](../../../docs/architecture/) it
links to.

## What's here

`apps/api` is the Nest monorepo: the API gateway, the 17 core services under
`apps/api/apps`, and the 15 shared libraries under `apps/api/libs` they
import as `@app/<name>`. The full, generated list of every deployable — this
workspace's and the eight module backends under `modules/*/backend` — is
[`../../../docs/architecture/services.md`](../../../docs/architecture/services.md).
Communication between them (REST, TCP, gRPC, Kafka, Socket.IO) is
[Section 4 of the root architecture doc](../../../ARCHITECTURE.md#4-communication).

## What's specific to this workspace

- **The build.** All 18 Nest projects here compile with the Nest CLI's
  rspack builder through one shared config, `apps/api/rspack.config.js`.
  `@app/*` resolves through explicit `paths` there, never a `tsconfig`
  `baseUrl` — see [ADR 0002](../../../docs/adr/0002-nest-monorepo-on-rspack.md).
- **Five registration points for a shared library.** Adding or changing a
  `libs/*` package that more than one deployable imports means updating
  `nest-cli.json`, `tsconfig.json`, the `appLibs` array in
  `rspack.config.js`, every `modules/*/backend/tsconfig.json` that needs it,
  and the alias map in `test/vitest-backend.mts` — missing one resolves
  silently to a different file instead of failing the build. The full list
  and why it exists are in the same ADR.

## Related

- [`../README.md`](../README.md) — running, testing and configuring this
  workspace.
- [`runbook.md`](runbook.md) — health checks and operations.
