# Running services

This guide is for anyone who has already done the [local setup](local-setup.md)
and needs to actually start the platform — all of it, a useful subset, or one
service at a time — plus what each dev-only flag does and where to look when
something is running but misbehaving. It covers the three ways to start
things, the port registry, the frontend zone model, the `SKIP_*`/`DEV_AUTH_BYPASS`
flags, and where logs land.

## The three ways to run things

**Everything, through Turborepo.**

```bash
npm run dev
```

This is `turbo run dev --concurrency=20` at the root — it fans out to every
workspace's own `dev` script, backend and frontend, core services and module
verticals alike.

**The API and web separately.**

```bash
npm run dev:api   # turbo run dev --filter=kartseek-api
npm run dev:web   # turbo run dev --filter=kartseek-web
```

`npm run dev:api` runs `apps/api`'s own `dev` script, which is `dev:all`:

```
concurrently "npm run start:gateway" "npm run start:auth" "npm run start:user"
  "npm run start:cart" "npm run start:order" "npm run start:payment"
  "npm run start:notification" "npm run start:wallet" "npm run start:commission"
  "npm run start:payout" "npm run start:refund" "npm run start:report"
  "npm run start:search" "npm run start:admin" "npm run start:audit"
  "npm run start:loyalty" "npm run start:location" "npm run start:delivery"
```

That is the API gateway plus the 17 core services that still live inside the
`apps/api` workspace. The seven extracted verticals (marketplace, grocery,
restaurant, pharmacy, doctor, hotel, taxi) and franchise are their own npm
workspaces under `modules/`; they are **not** in `dev:all` — listing them
there too used to start each one twice and collide on its own port. Turbo's
root `npm run dev` starts them because it walks every workspace, not just
`apps/api`.

A narrower `dev:marketplace` script also exists in `apps/api/package.json`,
for working on the marketplace vertical without booting every core service.

**One service at a time**, with its own `start:<name>` script
(`apps/api/package.json`): `start:gateway`, `start:auth`, `start:user`,
`start:cart`, `start:order`, `start:payment`, `start:wallet`, `start:loyalty`,
`start:refund`, `start:commission`, `start:payout`, `start:notification`,
`start:admin`, `start:audit`, `start:report`, `start:delivery`,
`start:location`, `start:search` run `nest start <project> --watch` directly.
`start:marketplace`, `start:grocery`, `start:restaurant`, `start:pharmacy`,
`start:doctor`, `start:taxi`, `start:franchise`, and `start:hotel` instead run
`npm run dev -w @kartseek/<vertical>-backend`, since those live in their own
workspace.

`.claude/launch.json` defines the equivalent set of named dev-server
configurations for the web side — `dev`, `web`, `api`, and one entry per zone
(`marketplace`, `grocery`, `restaurant`, `pharmacy`, `doctor`, `hotel`, `taxi`,
`franchise`) — for tooling that starts a server by name rather than by
package.json script.

## Ports

Every port, the environment variable that sets it, and each service's health
route and database are declared once, in `services.yaml` at the repository
root. The table below is generated from that registry by

```bash
npm run registry:generate
```

which also keeps [`docs/architecture/services.md`](../architecture/services.md)
and each deployable's own README in sync. `npm run registry:check` verifies
the generated files agree with `services.yaml` without writing anything — run
it in CI or after editing the registry to confirm nothing drifted. Do not
hand-edit the table itself between the `registry:start` and `registry:end`
markers below — a regenerate will overwrite it; add or change a service by
editing `services.yaml` instead.

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Name | Kind | Path | HTTP | TCP | gRPC | Database / schema | Health or base path | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `api-gateway` | API gateway | `apps/api/apps/api-gateway` | 3001 | — | — | kartseek_db / public | `/api/v1/health` | postgres, redis, kafka, mongodb |
| `admin-service` | core service | `apps/api/apps/admin-service` | 3027 | 4017 | — | kartseek_db / admin | `/health` | postgres, redis, kafka |
| `audit-log-service` | core service | `apps/api/apps/audit-log-service` | 3028 | — | — | — | `/health` | mongodb, redis, kafka |
| `auth-service` | core service | `apps/api/apps/auth-service` | 3010 | — | 5001 | — | `/health` | redis |
| `cart-service` | core service | `apps/api/apps/cart-service` | 3013 | 4003 | — | — | `/health` | redis, kafka |
| `commission-service` | core service | `apps/api/apps/commission-service` | 3030 | 4020 | — | — | `/health` | redis, kafka |
| `delivery-service` | core service | `apps/api/apps/delivery-service` | 3022 | — | 5008 | — | `/health` | redis, kafka |
| `location-service` | core service | `apps/api/apps/location-service` | 3023 | 4013 | — | kartseek_db / location | `/health` | postgres, redis |
| `loyalty-service` | core service | `apps/api/apps/loyalty-service` | 3015 | 4005 | — | — | `/health` | redis, kafka |
| `notification-service` | core service | `apps/api/apps/notification-service` | 3026 | — | 5004 | — | `/health` | redis, kafka |
| `order-service` | core service | `apps/api/apps/order-service` | 3014 | 4004 | 5002 | kartseek_db / order | `/health` | postgres, redis, kafka |
| `payment-service` | core service | `apps/api/apps/payment-service` | 3025 | 4026 | 5003 | kartseek_db / payment | `/health` | postgres, redis, kafka |
| `payout-service` | core service | `apps/api/apps/payout-service` | 3031 | 4021 | — | kartseek_db / payout | `/health` | postgres, redis, kafka |
| `refund-service` | core service | `apps/api/apps/refund-service` | 3032 | 4022 | — | — | `/health` | redis, kafka |
| `report-service` | core service | `apps/api/apps/report-service` | 3034 | 4024 | — | — | `/health` | redis, kafka |
| `search-service` | core service | `apps/api/apps/search-service` | 3033 | 4023 | — | — | `/health` | redis, kafka, elasticsearch |
| `user-service` | core service | `apps/api/apps/user-service` | 3011 | — | 5009 | kartseek_db / user | `/health` | postgres, redis |
| `wallet-service` | core service | `apps/api/apps/wallet-service` | 3024 | 4014 | — | kartseek_db / wallet | `/health` | postgres, redis, kafka |
| `doctor-service` | module service | `modules/doctor/backend` | 3017 | 4007 | — | kartseek_doctor / doctor | `/health` | postgres, redis, kafka |
| `franchise-service` | module service | `modules/franchise/backend` | 3016 | 4006 | — | kartseek_franchise / franchise | `/health` | postgres, redis, kafka |
| `grocery-service` | module service | `modules/grocery/backend` | 3018 | 4008 | 5010 | kartseek_grocery / grocery | `/health` | postgres, redis, kafka |
| `hotel-service` | module service | `modules/hotel/backend` | 3035 | 4025 | — | kartseek_hotel / hotel | `/health` | postgres, redis, kafka |
| `marketplace-service` | module service | `modules/marketplace/backend` | 3012 | 4002 | 5006 | kartseek_marketplace / marketplace | `/health` | postgres, redis, kafka |
| `pharmacy-service` | module service | `modules/pharmacy/backend` | 3020 | 4010 | — | kartseek_pharmacy / pharmacy | `/health` | postgres, redis, kafka |
| `restaurant-service` | module service | `modules/restaurant/backend` | 3019 | 4018 | 5005 | kartseek_restaurant / restaurant | `/health` | postgres, redis, kafka |
| `taxi-service` | module service | `modules/taxi/backend` | 3021 | 4027 | 5007 | kartseek_taxi / taxi | `/health` | postgres, redis, kafka |
| `web` | web shell | `apps/web` | 3000 | — | — | — | `/` | — |
| `marketplace-frontend` | web zone | `modules/marketplace/frontend` | 3002 | — | — | — | `/marketplace` | — |
| `grocery-frontend` | web zone | `modules/grocery/frontend` | 3003 | — | — | — | `/grocery` | — |
| `restaurant-frontend` | web zone | `modules/restaurant/frontend` | 3004 | — | — | — | `/restaurant` | — |
| `pharmacy-frontend` | web zone | `modules/pharmacy/frontend` | 3005 | — | — | — | `/pharmacy` | — |
| `doctor-frontend` | web zone | `modules/doctor/frontend` | 3006 | — | — | — | `/doctor` | — |
| `hotel-frontend` | web zone | `modules/hotel/frontend` | 3007 | — | — | — | `/hotel-booking` | — |
| `taxi-frontend` | web zone | `modules/taxi/frontend` | 3008 | — | — | — | `/taxi` | — |
| `franchise-frontend` | web zone | `modules/franchise/frontend` | 3009 | — | — | — | `/franchise` | — |
<!-- prettier-ignore-end -->
<!-- registry:end -->

## Zones

The web shell (`apps/web`) serves the top-level site on its own port and
**rewrites** each vertical's paths to that vertical's own Next.js application
(a "zone") running on its own port — `/marketplace/*` to the marketplace zone,
`/grocery/*` to the grocery zone, and so on for restaurant, pharmacy, doctor,
hotel (booking only), taxi (customer booking only), and franchise. Two rewrite
rules exist per zone, not one: the pages themselves, and the zone's own
`/_next/*` asset path — without the second, a zone page renders once and then
404s fetching its own JavaScript.

Each zone's origin is configurable independently of its default, through an
environment variable read in `apps/web/next.config.mjs`:
`MARKETPLACE_ZONE_ORIGIN`, `GROCERY_ZONE_ORIGIN`, `RESTAURANT_ZONE_ORIGIN`,
`PHARMACY_ZONE_ORIGIN`, `DOCTOR_ZONE_ORIGIN`, `HOTEL_ZONE_ORIGIN`,
`TAXI_ZONE_ORIGIN`, and `FRANCHISE_ZONE_ORIGIN`. Unset, each falls back to
`http://localhost:<that zone's default port from the registry>`. The gateway
origin the shell proxies `/api/*` to is likewise configurable via
`API_GATEWAY_ORIGIN`.

## The smoke test

```bash
npm run build          # once — the smoke runs dist/, it does not compile
npm run infra:up       # Postgres, Redis, Kafka and MongoDB must be reachable
npm run smoke          # boot all 26 Nest deployables and probe /health
npm run smoke -- --only=order-service,marketplace-service
npm run smoke:test     # the smoke's own unit tests; no build, no services
```

`tests/smoke/boot-all.mjs` starts every Nest deployable from its built output
in batches of `SMOKE_BATCH` (default 6), gives each `SMOKE_TIMEOUT_MS` (default 90000) to answer its registry `health.live` route, then kills it and checks up
after itself. Three of those checks exist because the script used to be able to
report `26/26 healthy` when it was not:

- **It refuses to start when a port it needs is taken**, naming the port and the
  PID holding it, and exits 2. It never kills a process it did not start — a
  running `npm run dev` fleet is not the smoke's to stop.
- **A 200 only counts when the child that answered is the child it started.**
  The PID the OS reports for the listening socket has to be that child or one of
  its descendants. An answer from anything else, or one whose owner nothing on
  the machine can name, is a failure — as is `EADDRINUSE` anywhere in a child's
  log, whatever the probe said.
- **After the run every port must be free again.** A leftover listener fails the
  run even when all 26 booted, because the next run would otherwise be measuring
  this one.

### `SMOKE_PORT_OFFSET` — running the smoke while the dev fleet is up

The dev fleet holds every registry port, so on a machine running `npm run dev`
the smoke refuses to start. Rather than stop the fleet, move the smoke:

```bash
SMOKE_PORT_OFFSET=10000 npm run smoke
```

10000 is the documented value: 3001 → 13001, 4002 → 14002, 5006 → 15006, clear
of the registry and clear of Windows' 49152+ ephemeral range. The default is 0,
which means the registry's own ports.

The offset shifts every port by the same amount, and — this is the part that
makes the run mean anything — it shifts both sides of every address. Each child
gets its own ports under its registry variable names (`<SVC>_SERVICE_PORT`,
`<SVC>_TCP_PORT`, `<SVC>_GRPC_PORT`) _and_ every peer address it resolves
through the environment (the same names again, plus `<SVC>_GRPC_URL` /
`<SVC>_SERVICE_GRPC_URL`, with `<SVC>_SERVICE_HOST` pinned to loopback). The
fleet under test therefore talks only to itself and never to the developer's
processes. The pre-flight refusal, the health probes and the teardown assertion
all follow the offset too.

Those variables reach the children through the environment, which beats the
`.env` files on disk: `dotenv.config()` does not overwrite a key that is already
in `process.env`, and `@nestjs/config` merges `{ ...envFile, ...process.env }`
and then assigns only the keys not already there. So `apps/api/.env` cannot pull
a child back onto the real ports.

### When the smoke itself was killed mid-run

Kill the smoke and its children outlive it. The sweep is by port, not by command
line — two of the leftovers IN5 had to clean up were started from a module
directory and had no `KARTSEEKAPP` anywhere in their command line:

```powershell
# every registry port with a listener, and who holds it
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 3001,3010..3035 + 4002..4028 + 5001..5010 } |
  Select-Object LocalAddress, LocalPort, OwningProcess

netstat -ano | findstr "13012"      # one port, including the offset ones
taskkill /PID <pid> /T /F           # /T: a Nest process spawns workers
```

## Flags

**`SKIP_DB`, `SKIP_KAFKA`, `SKIP_REDIS`** — dev-convenience flags validated in
the gateway's `env.validation.ts` (`Joi.string().valid('true', 'false')`,
default `'false'`) and also present as ConfigMap keys in `infra/k8s/config.yaml`.
Set one to `'true'` to let the gateway boot without that dependency reachable,
for working on something that does not need it. `apps/api/.env.example` ships
only `SKIP_DB=false` by default; the other two default to `false` even when
absent from your `.env`.

**`DEV_AUTH_BYPASS`** — also gated in `env.validation.ts`
(`DEV_AUTH_BYPASS`, default `'false'`) and read directly in
`JwtAuthGuard` (`apps/api/libs/security/src/jwt-auth.guard.ts`). When it is
`'true'`, `NODE_ENV` is not `'production'`, and a request arrives with **no**
`Authorization` header, the guard fabricates a signed-in user rather than
rejecting the request. The role it injects is `DEV_AUTH_BYPASS_ROLE`, which
defaults to `CUSTOMER` — but a local `.env` that sets it to `SUPER_ADMIN` (a
common thing to do so every admin route is reachable without logging in) means
**every anonymous request becomes a super-admin request**. This is exactly
what breaks authorization testing: a route that should be rejecting anonymous
callers will happily serve them, and the failure is invisible until you
specifically test with the flag off. Never enable it while testing
authorization — see [`testing.md`](testing.md).

## Logs

- **`npm run smoke`** (`tests/smoke/boot-all.mjs`) writes each service's
  stdout/stderr to `tests/smoke/logs/<service-name>.log` (gitignored). The
  smoke reads them back as it runs: `EADDRINUSE` in one fails that service
  whatever its health probe returned.
- **`nest start <project> --watch`** and `npm run dev -w <workspace>` — via
  `start:*` or Turbo — print straight to the terminal that ran them; there is
  no separate log file for interactive dev runs.
- **`docker compose logs -f`** (`npm run infra:logs`) follows every
  infrastructure container's logs together; `docker compose logs -f <service>`
  narrows it to one.
- **Newman** (Postman's CLI runner) writes its reports under
  `tests/postman/reports/` (gitignored except for `.gitkeep`) — see
  [`tests/postman/README.md`](../../tests/postman/README.md).
