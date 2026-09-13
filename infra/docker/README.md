# infra/docker/

Dockerfiles for the platform's deployable services, and the Compose stack
used for local infrastructure. This is for anyone building a `kartseek/*`
image or running the local Postgres/Redis/Kafka/Elasticsearch stack outside
of `npm run infra:up`'s defaults.

## The four Dockerfiles

Each is built from the **repository root**, not from `infra/docker/` or the
workspace it packages — the repository has one lockfile, at the root,
installed through npm workspaces, and the rspack builder's own dependencies
are declared in the root manifest. A build scoped to a single workspace
directory cannot run `npm ci` or `nest build` at all.

| Dockerfile                  | Build command                                                                                                                                                                                                              | Produces                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `api-gateway.Dockerfile`    | `docker build -f infra/docker/api-gateway.Dockerfile -t kartseek/api-gateway:2.0.0 .`                                                                                                                                      | The API gateway.                                                                     |
| `core-service.Dockerfile`   | `docker build -f infra/docker/core-service.Dockerfile --build-arg APP=order-service --build-arg PORT=3014 -t kartseek/order-service:2.0.0 .`                                                                               | Any of the 17 `apps/api` core services, selected by `--build-arg APP=<nestProject>`. |
| `module-service.Dockerfile` | `docker build -f infra/docker/module-service.Dockerfile --build-arg APP=grocery --build-arg PORT=3018 -t kartseek/grocery-service:2.0.0 .`                                                                                 | Any of the 8 module backends, selected by `--build-arg APP=<module>`.                |
| `nextjs.Dockerfile`         | `docker build -f infra/docker/nextjs.Dockerfile --build-arg WORKSPACE_DIR=apps/web --build-arg PORT=3000 --build-arg NEXT_PUBLIC_API_URL=… --build-arg API_URL=… --build-arg NEXT_PUBLIC_WS_URL=… -t kartseek/web:2.0.0 .` | A Next workspace that emits `.next/standalone` — **`apps/web` only, today**.         |

Read each Dockerfile's own header comment for the full reasoning; the table
above is a summary.

### `nextjs.Dockerfile` needs three URL arguments, not one

`--build-arg NEXT_PUBLIC_API_URL=…`, `--build-arg API_URL=…` **and**
`--build-arg NEXT_PUBLIC_WS_URL=…` — all three, even though
`packages/shared-core/src/config/api-base.ts` falls back from the first to the
second at run time. The build evaluates that module while collecting page data,
some route handlers run on the Edge Runtime where only inlined values exist, and
`NODE_ENV=production` turns a missing value into a thrown error rather than the
localhost default.

Each one you leave out fails the build with `Failed to collect configuration for
/api/loyalty` — which names a **route**, not the variable. The real cause is one
`[cause]:` line further down:

```
[cause]: Error: API base URL is not configured. Set API_URL (server) and …
[cause]: Error: WebSocket URL is not configured. Set NEXT_PUBLIC_WS_URL …
```

### `nextjs.Dockerfile` builds `apps/web` and, for now, nothing else

It is written to take any Next workspace through `--build-arg WORKSPACE_DIR`,
but it copies `.next/standalone`, and Next only emits that when the workspace's
own `next.config.mjs` sets `output: 'standalone'`. Only `apps/web` does. Pointed
at one of the eight module zones (`modules/<m>/frontend`) it builds the app and
then fails on the standalone COPY. Adding that key to the zones is Task IN11;
until it lands, a zone has no image, and IN6's generated Compose entry for one
cannot build.

### `--build-arg PORT` is not optional

`PORT` is not the port the service binds — every core service reads its own
`<SVC>_SERVICE_PORT`, every module backend its `<MODULE>_SERVICE_PORT` — it is
the port the image's `HEALTHCHECK` probes, and it has to be told.

`core-service.Dockerfile` used to fall back to `process.env.PORT || 3000`,
which nothing sets, so every image built from it reported `unhealthy` for ever
regardless of how well the service was running; an orchestrator that restarts
on a failed check would never have let one stay up (AUD2-020).
`marketplace-service.Dockerfile` had the port right but only because it was
hard-coded to the one module it built.

There is deliberately **no default**, and each of the three files asserts it
explicitly in its runtime stage:

```dockerfile
RUN test -n "$PORT" || { echo "build arg PORT is required (see infra/docker/README.md)" >&2; exit 1; }
```

That `RUN` is the enforcement, **not** `EXPOSE ${PORT}`. BuildKit word-splits an
instruction's arguments after expansion, so an empty expansion gives `EXPOSE`
zero ports and it silently does nothing — and `docker build --check` reports no
warning on that case either, so neither the build nor the linter would tell you.
The image would ship `HEALTHCHECK_PORT=`, whose check requests
`http://127.0.0.1:/health` and fails every time: unhealthy for ever, which is
AUD2-020's original failure with an empty string in place of the hard-coded 3000. BuildKit expands the value into the `RUN` command string, so it is part of
that layer's cache key and a cached success cannot be reused for a build that
omits the argument.

`PORT` and the port the service actually binds must come from the **same**
registry entry. `HEALTHCHECK_PORT` is fixed at build time while the service
reads `<SVC>_SERVICE_PORT` (or `<MODULE>_SERVICE_PORT`) at run time; if a
Compose or Kubernetes override disagrees with the build argument, the container
is unhealthy for ever and nothing says why. The generator in `scripts/stack`
emits both from one entry, which is the only reason this is safe.

Pass `--build-arg HEALTH_PATH=<path>` too wherever `/health` is not the right
path: a Next module zone serves under its own `basePath`, so `/` on one is a 404.

`module-service.Dockerfile` replaced `marketplace-service.Dockerfile`, which
hard-coded a single module and baked its three transport ports as `ENV`. The
ports now come from Compose and Kubernetes, which is where they are declared.

## `compose.infra.yml`

The local infrastructure stack: Postgres (one shared instance plus, under a
profile, one dedicated instance per module), Redis, Kafka, MongoDB,
Elasticsearch, nginx, and optional GUI tools. Profiles:

- **`isolated`** — brings up a dedicated Postgres per module
  (marketplace, grocery, restaurant, pharmacy, doctor, hotel, taxi,
  franchise) instead of everything sharing the platform database. Nine
  Postgres containers in total; expect roughly 1–2 GB of memory for the
  databases alone.
- **`marketplace-isolated`** — the marketplace database only, a subset of
  `isolated` for anyone working on just that module.
- **`tools`** — pgAdmin, Redis Insight and Kibana, none of which the
  platform needs to run.

The default `docker compose up` (via `npm run infra:up`) starts none of
these; every module falls back to the shared Postgres instance, which is the
lighter way to work on one module at a time.

Every credential in the file is a required variable (`${VAR:?…}`), so Compose
refuses to start and names the one that is missing rather than falling back to a
default published in tracked source. Generate them with `npm run env:init`;
`.env.example` is the list.

### Elasticsearch requires authentication

`xpack.security.enabled=true`, with `ELASTIC_PASSWORD` bootstrapping the
built-in `elastic` user on the cluster's first start (AUD2-075). Two
consequences worth knowing before you start the stack:

- **search-service needs the credential too.** It reads `ELASTICSEARCH_NODE`
  from `apps/api/.env`, and carries them as userinfo:
  `http://elastic:<ELASTIC_PASSWORD>@localhost:9200` (or `@elasticsearch:9200`
  in a container). Node's `fetch` throws on a URL that includes credentials, so
  the service splits them into a Basic header itself —
  `apps/api/apps/search-service/src/elasticsearch-endpoint.ts`. Without the
  credential every call gets 401 and the service falls back to Redis while
  reporting `elasticsearch: unavailable` beside a healthy cluster.
- **Kibana in the `tools` profile 401s until you set one more password.** It
  refuses to run as `elastic` (a superuser that cannot write the system indices
  it needs), so it logs in as the built-in `kibana_system` — which has no
  bootstrap variable and must be set once through the API after the cluster is
  up. The command is in `.env.example` beside `KIBANA_SYSTEM_PASSWORD`. Nothing
  on the platform depends on Kibana.
- **Changing `ELASTIC_PASSWORD` later does not rotate it.** The variable only
  applies while the security index is being created; afterwards use
  `_security/user`, or recreate the `elasticsearch_data` volume.

### Redis keeps state, so it persists and it does not evict blindly (AUD2-031)

Redis on this platform is not a pure cache. Four keys are written with **no
expiry at all** and are the only copy of what they hold:

| Key                             | Written by                                   |
| ------------------------------- | -------------------------------------------- |
| `loyalty:<userId>`              | `loyalty.service.ts:50` — a points balance   |
| `admin:counter:pending_kyc`     | `admin.service.ts` — the KYC queue depth     |
| `notifications:unread:<userId>` | `notifications.gateway.ts:176`               |
| `ride:waiting:<rideId>`         | `driver-dispatch.service.ts:169` — in flight |

Two settings follow from that, and `npm run stack:validate` asserts both live
(`CONFIG GET maxmemory-policy`, `CONFIG GET appendonly`) so an edit to the
`command:` line cannot quietly undo either:

- **`--maxmemory-policy volatile-lru`.** `allkeys-*` evicts by recency or
  frequency across _every_ key once `--maxmemory` (256 MB) is reached, so the
  least recently touched of the four above disappears with no error anywhere.
  `volatile-lru` evicts only keys that carry a TTL — sessions, MFA challenges,
  rate-limit buckets, the home cache — all of which are re-derivable.
- **`--appendonly yes --appendfsync everysec`.** `--save 60 1` alone is an RDB
  snapshot at most once a minute, so an unclean stop loses up to a minute of
  exactly the keys the policy change was made to protect. The AOF lives on the
  same `redis_data` volume, and once it exists it is the **only** thing Redis
  loads at startup — the RDB is not replayed after it, or at all (which is what
  the note below is about). `everysec` trades one second of exposure for
  throughput.

**Turning the AOF on costs you the current dataset, once.** When Redis starts
with `appendonly yes` it loads the **AOF**, not the RDB — so on the first start
after this change the (empty) `appendonlydir` is authoritative and the existing
`dump.rdb` is ignored. Measured here rather than assumed: a TTL-less key written
before the switch was gone afterwards, while `/data/dump.rdb` was still on the
volume at its full size; a key written _after_ the switch survives a
`docker compose up -d --force-recreate redis` intact. Locally that costs a cache
and some sessions and nothing else. On anything holding state you care about,
enable it at runtime instead so Redis builds the AOF from memory:

```bash
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning \
  config set appendonly yes          # BGREWRITEAOF runs automatically
```

and only then change the `command:` line, so the next restart has an AOF to load.

**The OOM this buys, and why it is the right failure.** Once the store is full
of keys that all lack a TTL, `volatile-lru` has nothing it may evict and a write
returns `OOM command not allowed when used memory > 'maxmemory'`. Under
`NODE_ENV=production` — which every container runs —
`RedisService.assertEmulatorAllowed` (`apps/api/libs/redis/src/redis.service.ts:128-140`)
turns that into a `RedisUnavailableError`, which the shared filter maps to a
**503**. Outside production it falls back to the in-process Map instead. So the
full-store case is a loud error a developer sees, not silently invented state —
which is the whole point of preferring it to silent eviction. If you hit it,
raise `--maxmemory` or move the balance to Postgres (the loyalty half of that is
IN10's money workstream); do not put `allkeys-lru` back.

#### Every key written without a TTL

`volatile-lru` protects exactly these keys from eviction, and they are also the
keys that fill `--maxmemory` and eventually cause the OOM above, so the list is
worth keeping short and worth knowing.

**Regenerate it — do not hand-count:**

```bash
node apps/api/scripts/verification/redis-ttl-inventory.mjs          # this table
node apps/api/scripts/verification/redis-ttl-inventory.mjs --json   # machine-readable
```

The first version of this inventory was hand-taken with a regex that asked "was
a third argument passed?", and it was wrong by a factor of four. Three things
defeat that question, and the script exists because of them:

1. `RedisService.set` (`apps/api/libs/redis/src/redis.service.ts:174`) is
   `if (ttlSeconds) setex(...) else set(...)`, so **`setJson(key, value, 0)`
   passes a TTL argument and writes a key with no expiry**. That idiom is used
   deliberately — `admin-marketplace.controller.ts:2805` comments it "No TTL —
   persistent config" — and 23 writes use it.
2. Most write methods on `RedisService` take **no TTL parameter at all**
   (`hset`, `hmset`, `sadd`, `lpush`, `rpush`, `zadd`, `zincrby`, `incr`,
   `incrBy`, `decr`, `geoadd`). Every key they create is permanent unless
   something calls `expire()` on it separately — a different statement, often a
   different line, which the script looks for.
3. A TTL passed as a variable cannot be classified by reading the call, so those
   are reported separately rather than guessed at.

Current counts: **343 write calls · 216 with a TTL (literal, or expired in a
second statement) · 51 with a TTL from a variable · 76 with none, across 47 key
shapes.**

"Rebuildable" means: if this key vanished, could the owning service reconstruct
it from a durable source? That is what decides whether living without a TTL is
safe or is an unbacked record.

##### Records with no other home — the ones that matter

| Key                                                                                                                      | Written at                                                                                                  | Rebuildable                                                                                                                  | Owner       |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `admin:kyc:pending:<type>:<id>`                                                                                          | `apps/admin-service/src/admin.service.ts:644`                                                               | **No** — this key _is_ the approval queue                                                                                    | INFRA       |
| `loyalty:<userId>`                                                                                                       | `apps/loyalty-service/src/loyalty.service.ts:50,78,103,140,224`                                             | **No** — AUD2-031; belongs in Postgres                                                                                       | MONEY       |
| `wallet:frozen:<userId>`                                                                                                 | `apps/wallet-service/src/wallet.service.ts:252`                                                             | **No** — a fraud freeze that exists only here                                                                                | MONEY       |
| `gdpr:consent:<userId>:<type>`, `gdpr:consent:log:<userId>`                                                              | `libs/gdpr/src/gdpr.service.ts:87,90,120,122`                                                               | **No** — a consent record, and the evidence for it                                                                           | INFRA/LEGAL |
| `gdpr:exports:<id>`, `gdpr:erasures:<id>`                                                                                | `libs/gdpr/src/gdpr.service.ts:194,278`                                                                     | **No** — the record that a subject-access request was served                                                                 | INFRA/LEGAL |
| `user:<id>`, `addresses:<id>`, `partner:<id>`                                                                            | `apps/api-gateway/src/controllers/user.controller.ts:72,97,113,123,145,164,218`                             | **Unclear** — written with `setJson(..., 0)`; if these are caches they want a TTL, if they are the record they want Postgres | MODULES     |
| `seller:<sellerId>:couriers`, `seller:<id>:threshold:<x>`                                                                | `modules/marketplace/backend/src/seller/seller.service.ts:3157,2151`                                        | **No** — seller configuration with no row behind it                                                                          | MODULES     |
| `ride:waiting:<rideId>`, `ride:trail:<rideId>`                                                                           | `modules/taxi/backend/src/services/driver-dispatch.service.ts:169,139`                                      | **No** — a lost waiting-time start under-charges the rider                                                                   | TAXI        |
| `driver:status:<id>`, `driver:profile:<id>`, `driver:<id>:profile`, `driver:earnings:<id>:<d>`, `driver:rejections:<id>` | `taxi.controller.ts:972,978,998`; `driver-dispatch.service.ts:49,62,84,292`; `ride-matching.service.ts:361` | **Partly** — profile and status come from the taxi database; earnings do not                                                 | TAXI        |

##### Configuration written deliberately with `setJson(key, value, 0)`

Persistent by design; each is the live copy of a setting an administrator
edited. They are small, bounded in number, and the `0` is intentional — but
none of them has a row behind it, so a `FLUSHDB` loses the configuration.

`admin:settings`, `admin:seo`, `admin:india-ops`, `admin:page-layout:<country>`
(`modules/marketplace/backend/src/admin/admin.service.ts:1608,1628,1651,2342`) ·
`admin:loyalty:config` (`admin-marketplace.controller.ts:2805`) ·
`marketplace:<market>-banners` (`admin-marketplace.controller.ts:1672,1737`,
`home-cache.service.ts:134,151`) · `ddos:whitelist`
(`libs/security/src/ddos-monitor.service.ts:283`) — MODULES, except the last,
which is INFRA.

##### Live operational state — permanent by accident, not by design

Geospatial sets and session hashes that nothing ever expires or prunes: an entry
per driver or socket, added on connect and removed only if the matching cleanup
path runs.

`drivers:locations`, `drivers:meta`, `delivery:locations`, `delivery:meta`,
`delivery:partners:locations`, `region:<country>:{drivers|delivery}:{locations|meta}`
(`location.service.ts:109,110` via `regionGeoKey`/`regionMetaKey`),
`zone:demand:<zone>` · `ws:sessions`, `ws:user:<id>`, `ws:chat:sessions`,
`ws:doctor-queue:sessions`, `ws:reco:sessions`, `ws:socket:ip`, `socket:driver`,
`chat:last_seen` — MODULES/TAXI.

##### Console counters

The rule (dispatch addendum item 13): a figure the console displays is derived
from the rows that are its source of truth — cached with a short TTL if it needs
to be — never accumulated in a key that can only drift.

- **`admin:counter:pending_kyc` is gone.** It was a bare
  `set(get() + 1)` / `set(get() - 1)` with no source and no rebuild path, which
  read `0` for ever after the AOF transition emptied the development instance,
  and the console displayed it. The dashboard now COUNTs `admin:kyc:pending:*`
  (`admin.service.ts` `countPendingKyc`).
- **The security counters are now bounded.** `stats:ep:<method>:<path>:<hour>`,
  `stats:bans:<date>`, `stats:ws:bans:<date>`, `geo:stats:{vpn,proxy,tor,mismatch,blocked}:<date>`
  and `stats:ws:ack_failures:<date>` are read back by the DDoS, geo-security and
  health boards. They cannot be derived — there is no ban table, and the geo
  events are only persisted when a database is bound — so they stay tallies, but
  each now takes an expiry on its first increment (`incr` returns 1 exactly
  once): 48 hours for the hourly endpoint counters, 35 days for the daily ones.
  Without that, `stats:ep:` alone added one permanent key per distinct path per
  hour, for ever.
- **Still unbounded, and nothing reads them**: `stats:broadcasts:<type>:<date>`
  (`notifications.gateway.ts:266`) and `stats:taxi:updates:<date>`
  (`socket.gateway.ts:178`) are incremented and never read anywhere in the
  repository. Either surface them or delete them — MODULES/TAXI.
- **Badge counters, derivable but accumulated**: `notifications:unread:<id>`
  (`notifications.gateway.ts:176,229`, with `notifications:read:<id>`) and
  `chat:unread:<id>:total` (`chat.gateway.ts:307`). Both are derivable from the
  stored queue/messages, so both are `pending_kyc`'s defect in a smaller place —
  MODULES.

The MONEY, TAXI and MODULES rows are recorded here rather than fixed by IN10:
moving a balance, a freeze flag, a fare component or a module's operational state
into Postgres is a schema change those workstreams own.

### Per-module database roles

Two init scripts are mounted into the shared `postgres` service, and the
entrypoint runs them in name order when the data directory is first created:

| Mounted as          | Source                               | What it does                                                   |
| ------------------- | ------------------------------------ | -------------------------------------------------------------- |
| `10-extensions.sql` | `infra/postgres/init-extensions.sql` | `uuid-ossp`, `pg_trgm`, `postgis` in `POSTGRES_DB`.            |
| `20-roles.sh`       | `infra/postgres/init-roles.sh`       | One login role per module, with rights to its own schema only. |

`20-roles.sh` reads the eight `<MODULE>_DB_USER` / `<MODULE>_DB_PASSWORD`
pairs the root `.env` already defines for the `isolated` profile — the same
credential for a module whether it has its own instance or a schema in the
shared one. **It exits non-zero, naming the variable, if any of the eight
passwords is unset**, so the container fails to start rather than creating a
role with a password anyone could guess. It also creates the three extensions
in every database it touches, because IN3's initial migrations open with
`CREATE EXTENSION IF NOT EXISTS` and that needs superuser — doing it here once
means a module role never does.

Each role **owns** its own schema and everything already in it — tables,
sequences and views — and gets `ALL` by default on whatever it creates later.
Ownership rather than grants, because `ALTER TABLE`, `DROP TABLE` and
`CREATE INDEX` are owner-only: a role holding every grant PostgreSQL can
express still cannot run a migration against a table `postgres` owns. The
transfer runs over `pg_tables` / `pg_sequences` / `pg_views` and is idempotent.

**What that guarantees, and what it does not.** Guaranteed as of the last run:
the role owns its schema and every table, sequence and view that was in it then,
plus its migration ledger, so its migrations may `ALTER`, `DROP` and index them,
and `ALTER DEFAULT PRIVILEGES` covers whatever the role creates afterwards. Not
guaranteed: anything added to a module schema later **by another role** — a
`migration:run` executed as `postgres`, a seed script still on
`DB_USER=postgres`, a `CREATE TABLE` typed into psql or pgAdmin. Each leaves an
object `postgres` owns inside a schema the module role owns. Reads and writes
keep working, because the GRANTs cover DML, so nothing looks wrong until the
next migration tries to alter that one table and is refused as non-owner.
`ALTER DEFAULT PRIVILEGES` does not help: without `FOR ROLE` it only describes
what the role grants on its _own_ future objects.

Re-run the script after anything of that kind — it is idempotent, and that is
what it is for. To check whether you need to:

```sql
SELECT schemaname, tablename, tableowner FROM pg_tables
 WHERE schemaname = '<module>' AND tableowner <> '<module>_user';
```

It gets nothing on another module's schema and no `CREATE` on `public`, where
`users`, `orders` and the gateway's own tables live — so a module cannot create
a table there that shadows one of them.

Two things sit outside the schema and are deliberate:

- **`CREATE` on the database.** Every module's initial migration opens with
  `CREATE SCHEMA IF NOT EXISTS "<module>"`, and PostgreSQL checks the CREATE
  privilege on the database _before_ it checks whether the schema exists — so
  that statement fails with `permission denied for database kartseek_db` for a
  role without it, even though the script has already created the schema and
  the statement would do nothing. Without this grant a module role cannot run
  `migration:run` at all. What it actually permits is creating _new_ schemas;
  it confers nothing on any schema that already exists, and `CREATE SCHEMA` on
  a name already taken is an error, so it is not a route to another module's
  data.
- **The migration ledger**, `public.<module>_migrations`. IN3 put it there
  because TypeORM builds the ledger before the first migration's `up()` runs
  and a schema that does not exist yet cannot hold it. The role has no `CREATE`
  on `public`, so TypeORM cannot create it — the script creates it instead,
  with the three columns TypeORM's Postgres driver expects, and hands it to the
  role. That removes what used to be a superuser bootstrap step: a module role
  can now build its whole schema from empty and record that it did.

#### `public` is closed to `PUBLIC` — a cluster-wide change

The script ends with `REVOKE ALL ON SCHEMA public FROM PUBLIC`, against the
shared database and each dedicated one. PostgreSQL grants USAGE on `public` to
the pseudo-role PUBLIC, and no per-role `REVOKE` removes it, so until this ran
every login role could traverse the schema holding `users`, `orders` and the
gateway's own tables — the per-module isolation had a hole straight through it.

Ordering matters and is deliberate: `grant_in()` gives each module role
`GRANT USAGE ON SCHEMA public` **by name** before the revoke runs, which is what
keeps `public.<module>_migrations` reachable. USAGE is the right to name objects
in a schema, not to read them; the module roles still get `permission denied for
table users`.

**It is safe today only because every one of the 26 services connects as
`postgres`**, and a superuser bypasses permission checks entirely. The
consequence for anything added later: **a new non-superuser role starts with no
access to `public` at all** and needs an explicit `GRANT USAGE ON SCHEMA public`
plus grants on the tables it should read. Moving the core services off
`DB_USER=postgres` — the obvious next step after the module flip — runs straight
into this, and the symptom is a service that cannot see `users`.

`init-roles.sh` is committed **mode 755**, and that is load-bearing rather than
cosmetic. The Postgres entrypoint executes a `*.sh` init file as a subprocess
only when it is executable; otherwise it `source`s it into its own shell, which
would leak this script's `set -euo pipefail` — `-u` especially — into the rest
of `docker-entrypoint.sh`. The image's own `10_postgis.sh` ships non-executable
and is sourced, so both branches are visible in one container's log: look for
`running /docker-entrypoint-initdb.d/20-roles.sh`, not `sourcing`. If you copy
this script somewhere else, copy the mode with it.

**Init scripts run only on an empty data directory.** An existing volume — any
machine that ran `npm run infra:up` before this file existed — needs it applying
by hand, once. The script is mounted, not copied, so it is the same file:

```bash
# From the repository root, with the eight passwords set in .env
docker compose -f infra/docker/compose.infra.yml up -d postgres   # picks up the mount + env
docker compose -f infra/docker/compose.infra.yml exec postgres bash /docker-entrypoint-initdb.d/20-roles.sh

# Or, without recreating the container, pipe the same file in with the
# variables the script reads (bash/zsh; `set -a` exports what .env defines):
set -a; . ./.env; set +a
env_flags=$(for m in MARKETPLACE GROCERY RESTAURANT PHARMACY DOCTOR HOTEL TAXI FRANCHISE; do
  printf -- '-e %s_DB_USER -e %s_DB_PASSWORD -e %s_DB_NAME ' "$m" "$m" "$m"
done)
docker exec -i $env_flags kartseek-postgres bash -s < infra/postgres/init-roles.sh

# Eight roles
docker exec kartseek-postgres psql -U postgres -d kartseek_db -c '\du' | grep _user
```

Re-running is safe: every statement is idempotent, and `ALTER ROLE … PASSWORD`
is unconditional, so a password changed in `.env` is rotated in the database by
running the script again.

The eight module backends now connect as these roles — see
[`docs/guides/local-setup.md`](../../docs/guides/local-setup.md), "Moving a
module onto its own database role", for the per-module procedure and what to
check after each one.

## `compose.services.yml` — the application tier

**Generated. Do not edit it.** `scripts/registry/compose.mjs` renders all 35
deployables from [`services.yaml`](../../services.yaml); `npm run
registry:generate` rewrites it and `npm run registry:check` (which runs on
every commit) fails when it is stale. Change the registry, not the YAML.

### Start the infrastructure first

**Docker Compose ≥ 2.24 is required** for this file — it uses the `env_file:
[{ path, required }]` long syntax, and 2.20–2.23 fail at `docker compose
config` with no useful hint. `docker compose version` to check.

```bash
npm run infra:up        # datastores, nginx — AND kartseek-network, AND the 166 Kafka topics
npm run stack:up:admin  # the twelve an administrator needs, built and started
npm run stack:validate  # prove them: healthy, ready, the right role, a real console, clean logs
npm run stack:logs      # follow them
npm run stack:down      # stop and remove the 35 application containers, and only those
npm run infra:down      # the one that takes the datastores down too
```

`stack:validate` is `scripts/stack/validate.mjs`. It does the whole sequence
itself — `infra:up`, then the profile, then the checks, then the teardown — so
running it on its own is enough; the two lines above it are for when you want
the containers to stay. It is the gate that says whether this file works, and
[`docs/guides/local-setup.md`](../../docs/guides/local-setup.md) lists what it
proves and what it deliberately does not.

`stack:down` is `scripts/stack/down.mjs`, which names the 35 services from
`services.yaml`. It is deliberately not `docker compose down`: profiles gate
`up`, not `down`, so a project-wide `down` takes Postgres, Redis, Kafka, Mongo,
Elasticsearch, nginx **and `kartseek-network`** with it — and then `infra:up`
has to run again before anything else will start.

The first `stack:up` on a machine whose infrastructure containers predate the
second `include` line **recreates** postgres, redis and kafka: the project's
`config_files` label changed, so Compose considers them out of date. Data and
the 166 Kafka topics survive — they are all on named volumes — but expect the
restart, once.

`infra:up` is not optional and not merely conventional:

- It creates `kartseek-network`. Both files declare `networks.default.name:
kartseek-network` and Compose merges them, so whichever comes up first
  creates it — but the datastores have to exist before anything can reach them
  anyway.
- It runs `npm run kafka:topics`, which creates the 166 topics. Auto-creation
  is off (`KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'`), so a consumer that
  starts before the topics exist crash-loops on "does not host this
  topic-partition".

### The two profiles

Every entry carries a profile, so a bare `docker compose up -d` still starts
the infrastructure alone and nothing else.

| Profile | What it is                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `admin` | The twelve deployables an administrator needs end to end: the gateway, auth, user, admin, audit-log, notification, order, payment, marketplace, grocery, taxi and the console. |
| `full`  | All 35.                                                                                                                                                                        |

`npm run stack:up:full` **cannot build the eight web zones yet.** Only
`apps/web` sets `output: 'standalone'` in its `next.config.mjs`; a zone builds
and then fails on the standalone `COPY`. Giving the zones that output is Task
IN11. Until then `full` is the API tier plus the console, with eight failed
builds at the end — use it knowing that.

### What a container reads

`env_file` gives each service the root `.env` (**required**) plus the
untracked workspace files, `apps/api/.env` and, for a module service,
`modules/<module>/backend/.env` (both optional). Those workspace files are
where the ~120 platform variables live — the MFA and storage settings, the
DDoS limits, the feature switches — and a container without them boots into a
Joi validation failure naming the first one missing. `npm run env:init` writes
the root `.env`; the workspace ones are a developer's own, copied from each
`.env.example`.

The generated `environment:` block then **overrides every address and
credential in them**, because `environment` beats `env_file` in Compose. That
is the whole mechanism: `apps/api/.env` says `DB_HOST=127.0.0.1`,
`KAFKA_BROKERS=localhost:9092` and ten `*_GRPC_URL=localhost:500x`, and inside
a container localhost is the container. So every service gets, from the
registry: `postgres`, `redis`, `kafka:29092` (not 9092 — that listener
advertises itself back as `localhost:9092`), `mongodb`, `elasticsearch`, every
peer's container name, every port, and `NODE_ENV=production`.

**`JWT_SECRET` and `ENCRYPTION_KEY` come from the ROOT `.env`, not from
`apps/api/.env`.** They have to. `NODE_ENV=production` arms the gateway's own
Joi gates: `JWT_SECRET` is refused if it contains `dev`, `test`, `change`,
`example` or `placeholder`, and `ENCRYPTION_KEY` (64 hex characters) becomes
required. A developer's `apps/api/.env` holds exactly the kind of value that
refusal is aimed at, so the gateway threw at boot before anything listened.
Both are `${VAR:?…}` in the generated file, so Compose refuses to start and
names the variable instead. `npm run env:init` fills them into the root `.env`
— and it is now re-runnable: on an existing `.env` it adds the keys that are
missing or empty and never rewrites one that is set.

A module service connects **as its own Postgres role** — `grocery_user` and
friends, created by `init-roles.sh` (see above) — against the shared
`kartseek_db`. A service whose registry entry says `database: null` gets
`DB_HOST` and `DB_PORT`, and `DB_NAME`, `DB_USER` and `DB_PASSWORD` explicitly
**blank**: it opens no connection, the superuser credential has no business
being in its environment, and leaving the keys out entirely would only hand
them back to `apps/api/.env` through `env_file`.
`DB_SSL` is `false` everywhere: the images run `NODE_ENV=production`, which
turns SSL on by default, and this Postgres speaks plaintext on a private
network. `DEV_AUTH_BYPASS` is pinned `false` rather than left to the
`NODE_ENV` gate in `jwt-auth.guard.ts`.

> **`docker compose config` prints every resolved secret in plaintext** — the
> Postgres and Redis passwords, `JWT_SECRET`, `ENCRYPTION_KEY`, and the
> credential inside `MONGO_URI` and `ELASTICSEARCH_NODE`. It is the right tool
> for checking what a container will receive, and its output must never be
> pasted into an issue, a pull request or a chat. Pipe it through `grep` for the
> one key you are checking, or read the generated YAML instead.

The console and the zones read **no** `.env` at all. Nothing in the root
`.env` is theirs, `NEXT_PUBLIC_*` are inlined at build time, and keeping it out
means the console image carries no datastore credential.

### Two host bindings, two variables

`DB_BIND` (default `127.0.0.1`) publishes the datastore ports in
`compose.infra.yml`; `APP_BIND` (default `127.0.0.1`) publishes the
application ports here. Both default to loopback for the same reason — a
development gateway may run with `DEV_AUTH_BYPASS=true` — and both take
`0.0.0.0` in the root `.env` when another machine on the LAN genuinely needs
to reach the stack. Set them back afterwards.

## The root `docker-compose.yml`

The root `docker-compose.yml` pulls in `compose.infra.yml` and
`compose.services.yml` with Compose's `include:`.

`compose.services.yml` is included with `project_directory: .` so its relative
paths — `context: .`, each `env_file` — resolve from the repository root.
Without it Compose resolves them against the included file's own directory and
every build context would be `infra/docker/`. `compose.infra.yml` wants the
default instead: its bind mounts are written `../postgres/…`, relative to
itself. Neither file is meant to be run on its own with `-f`.

Prometheus and Grafana were planned for phase 2 and do not exist; when they
land they get their own include line and a `monitoring` profile. See
[the platform reorganization design](../../docs/superpowers/specs/2026-09-05-platform-reorganization-design.md).

## `.dockerignore`

One `.dockerignore` at the repository root
([`../../.dockerignore`](../../.dockerignore)) serves all three Dockerfiles
above — there is no second one anywhere else in the repository.
