# Troubleshooting

This guide collects known, previously-hit traps in the KARTSEEK local
development setup — things that look like a new bug but have already been
diagnosed once. Each entry is Symptom, then Cause, then Fix. If nothing here
matches what you are seeing, check [`running-services.md`](running-services.md)
for the relevant flag or port, or [`testing.md`](testing.md) for the known
pre-existing test/lint failures.

## `localhost` resolves to `::1`

**Symptom.** A benchmark or timing comparison against a local service shows an
extra ~200 ms of latency per request that a similar call elsewhere does not
have, even though nothing about the request itself is slower.

**Cause.** `localhost` can resolve to the IPv6 loopback address (`::1`) before
falling back to IPv4 (`127.0.0.1`), and that fallback attempt is what costs the
roughly 200 ms — it shows up as connect time, not request time, so it is easy
to misattribute to the server.

**Fix.** Use `127.0.0.1` explicitly for local timing comparisons. Real gateway
reads measured this way land in the 11–40 ms range; a `localhost` URL in the
same test can make an unrelated code path look slow.

## Two Postgres instances both on 5432

**Symptom.** `docker compose up` fails to bind the platform Postgres
container, or it starts but the data you expect from a recent seed or
migration is not there.

**Cause.** Something else is already listening on host port 5432 — most often
a Postgres installed natively as a Windows service, or a leftover container
from an earlier session — and it wins the bind, or your client ends up talking
to it instead of the container `infra/docker/compose.infra.yml` just started.

**Fix.** Check what is actually listening on 5432 before debugging the
migration or seed itself. Stop the other instance, or use a different host
port for one of them and update the relevant `DB_HOST`/`DB_PORT`.

## Health check answers 200, but every route touching the database 500s

**Symptom.** A service's `/health` (or similar) route responds fine, but any
route that reads or writes the database fails.

**Cause.** The service's TypeORM entity list was a glob pattern
(`entities: [__dirname + '/**/*.entity{.ts,.js}']`) built to be resolved
against the filesystem — which works when the service runs from its raw
source, but a bundled `main.js` produced by rspack has no `__dirname` tree
underneath it for the glob to match. TypeORM ends up with zero entities, every
repository construction silently fails to see real tables, and nothing about
that surfaces at boot because the HTTP server still starts and answers health
checks fine.

**Fix.** Entity lists must be explicit arrays, never globs — see ADR 0002. If
you add a new entity to a service, add it to that service's explicit list; do
not rely on a glob picking it up.

## `Nest can't resolve dependencies` at boot, right after adding a `@app/*` library

**Symptom.** A new shared library under `apps/api/libs/` builds fine in one
workspace but another workspace either fails to resolve the import or resolves
it to the wrong file, and Nest reports it cannot construct something that
depends on it.

**Cause.** A new `@app/*` library has to be registered in **five** separate
places for every workspace to resolve it the same way, and missing one does
not fail loudly — it resolves to a different file only in the one workspace
that was missed (see ADR 0002,
[`docs/adr/0002-nest-monorepo-on-rspack.md`](../adr/0002-nest-monorepo-on-rspack.md)):

1. `apps/api/nest-cli.json` — a `"type": "library"` entry under `projects`.
2. `apps/api/tsconfig.json` — the `paths` entry (both the bare specifier and
   its `/*` form).
3. The `appLibs` array in `apps/api/rspack.config.js` (the module backends
   delegate to this same file, so it only needs updating once for all nine
   backend workspaces that build through rspack).
4. Each of the eight `modules/*/backend/tsconfig.json` files' own `paths`
   entry (each module backend keeps its own explicit list, so `tsc --noEmit`
   works from that workspace directly).
5. The alias map in `apps/api/test/vitest-backend.mts`.

**Fix.** Add all five when introducing a new shared library, then run
`npm run build` and `npm run smoke` — a build that passes proves less than it
looks like it does here; only booting every service catches a resolution that
silently picked up the wrong file.

## `UnknownDependenciesException` on boot after a root-module rename

**Symptom.** A core service dies on boot with
`Nest can't resolve dependencies of the <Something>` for a repository or
provider that is clearly imported somewhere in the module tree.

**Cause.** This already happened three times during the root-module renaming
in phase 1A: `admin-service`, `wallet-service`, and `payout-service` each had
an **earlier stub module of the same shape as the real one**, and the stub
shadowed it — the stub declared a controller and service but never imported
the `TypeOrmModule` (or otherwise wired the real dependencies), so whatever it
constructed could never satisfy what depended on it. `wallet-service`'s
version of this left `WalletTransactionRepository` unresolvable, nothing
listening on its TCP port, and every wallet screen in the seller portal empty;
`payout-service`'s left `SellerWalletRepository` unresolvable the same way.
The stubs are gone today, but the failure mode returns any time a service
briefly has two same-shaped root modules during a refactor.

**Fix.** If you see this after touching a root module, grep for a second class
with the same responsibility before assuming the real module is broken — see
the comments at the top of `apps/api/apps/admin-service/src/main.ts`,
`apps/api/apps/wallet-service/src/main.ts`, and
`apps/api/apps/payout-service/src/main.ts` for the specific history. Do not
reintroduce a placeholder module under the real one's name.

## `Can't resolve @nestjs/common/internal`

**Symptom.** A build fails resolving a `@nestjs/common/internal` subpath
import, or (at runtime) an `HttpException` from one part of the app is not
recognised as an `HttpException` by another (the gateway's exception filter
answers 500 for what should be a normal handled error).

**Cause.** Two copies of `@nestjs/core`/`@nestjs/common` in the dependency
tree. `@nestjs/typeorm` and `@nestjs/mongoose` both peer on a version range
wide enough (`^10 || ^11 || ^12`) that npm can satisfy it by hoisting an older
11.x to the root while every workspace resolves 12.x directly — the v12
packages import the `@nestjs/common/internal` subpath, which 11.x does not
export, and a class built against one copy is not `instanceof` the
equivalent class from the other.

**Fix.** Run `npm ls @nestjs/core` and confirm there is exactly one resolved
version across the tree. The root `package.json` pins `@nestjs/core` and
`@nestjs/common` as direct dependencies specifically to outrank the
peer-satisfied hoist — see the `_comment_nest_core_override` and
`_comment_nest_root_pin` notes in that file. New dependencies belong in
`apps/api` (or the module backend that needs them); do not add anything at the
root that could shift what gets hoisted there.

## Next dev server returns 200 for a page that called `notFound()`

**Symptom.** A page you expect to render as a 404 in local development
(`npm run dev:web` or a zone's own dev server) still returns HTTP 200 when you
check it with `curl` or a status-code assertion.

**Cause.** Next's dev server does not send a 404 status for a route that calls
`notFound()` the way its production build does — the status code alone cannot
tell you whether the intended page rendered.

**Fix.** Check the response body for a marker specific to what should have
rendered (a heading, a `data-testid`, some text unique to that page or to the
not-found page) rather than trusting the HTTP status while running under
`next dev`.

## A zone renders once, then 404s fetching its own JavaScript

**Symptom.** Navigating to a zone path (for example `/marketplace`) directly
renders fine, but a client-side navigation into it, or a hard refresh, fails
because the page's own `/_next/*` asset requests 404.

**Cause.** Each zone is mounted under a path prefix (`/marketplace`,
`/grocery`, and so on) via `basePath` in that zone's own `next.config.mjs`.
With `basePath` set, the zone emits every internal link, router push, **and**
every `/_next/*` asset URL under that prefix — a zone missing it (or a zone
whose `basePath` does not match the shell's rewrite rule for it) renders once
from server-rendered HTML and then 404s fetching its own JavaScript, because
the shell has no `/_next` rewrite pointing at that origin. See
`modules/marketplace/frontend/next.config.mjs` for the canonical comment on
this exact failure, and [`running-services.md`](running-services.md#zones) for
how the shell's rewrites and each zone's `*_ZONE_ORIGIN` variable pair up.

**Fix.** Confirm the zone's `basePath` matches the path the shell rewrites for
it, and that both the page rewrite and the `/_next/*` rewrite exist in
`apps/web/next.config.mjs`.

## A `.env` value masks a port mismatch

**Symptom.** A service appears to be listening, but the gateway (or another
caller) cannot reach it, or reaches something unexpected on that port.

**Cause.** `services.yaml` is the single source of truth for every port and
the environment variable that sets it, but nothing stops a local `.env` from
setting a value that disagrees with what the code, a Compose file, or a
Kubernetes ConfigMap expects — and because the `.env` value wins, the
disagreement stays invisible until something tries to connect.

**Fix.** Run `npm run registry:check` (`node scripts/registry/validate.mjs`).
It fails with one line per disagreement between `services.yaml` and the
`main.ts` default, `.env.example`, Compose file, or Kubernetes ConfigMap it
compares against, and tells you which file to fix — or, if the registry entry
itself is wrong, fix `services.yaml` and run `npm run registry:generate`.

## Browser reports "could not reach the sign-in service"

**Symptom.** The web client shows a generic connection-failure message (for
example, on sign-in) — but calling the same endpoint with `curl` works fine,
and nothing appears in the gateway's logs for the failed browser request.

**Cause.** The browser origin making the request is not in the gateway's CORS
allowlist (`CORS_ORIGINS` in `apps/api/.env`; `kartseek.com` and its
subdomains are always allowed, and `localhost` is allowed unless
`NODE_ENV=production`). A missing origin gets its **preflight** request
refused, so the actual request never leaves the page — the browser reports a
generic connection failure, the gateway never sees the request at all (hence
no log line), and `curl` "succeeds" only because `curl` does not enforce CORS
the way a browser does.

**Fix.** This is a browser-only failure mode — reproducing it with `curl` will
never show the problem. Check `WEB_APP_URL` and `CORS_ORIGINS` in
`apps/api/.env` against the origin the browser is actually using.

## Kafka topics are gone after `docker compose down -v`

**Symptom.** Anything that publishes an event starts failing right after
recreating the Kafka container from a clean volume.

**Cause.** `docker compose down -v` deletes the Kafka container's volume,
which is where its topics live — and the broker runs with topic
auto-creation disabled, so a topic nothing has explicitly created does not
spring back into existence on first publish.

**Fix.** Re-run the topic provisioner:

```bash
npm run kafka:topics
```

It is idempotent and safe to run any time — see
[`seeding.md`](seeding.md#kafka-topics-do-this-before-seeding-anything-that-publishes)
for what it actually does.
