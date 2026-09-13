# Database migrations

This guide is for anyone changing a table shape — in the shared platform
database or in one of the eight module databases. What runs the migrations,
why `synchronize` is off in every environment including your own, how to
generate and allocate a module migration, how the per-module database split
works if you opt into it, and where this is all heading in a later phase. It
assumes you already have infrastructure up (`npm run infra:up`).

There are **nine** ledgers, not one: `apps/api` keeps two DataSources over one
`migrations/` folder (see `data-source.main.spec.ts`), and each of the eight
module backends has its own runner over its own folder. Which one you want
depends on which database owns the table.

## How migrations work here

Migrations are **hand-written SQL** TypeScript classes under
`apps/api/migrations/`, run through the TypeORM CLI against the DataSource in
`apps/api/data-source.ts`. That DataSource is deliberately narrow:

- **No entities.** It exists only for the CLI to run migrations against; no
  application code imports it. Loading entities here would make
  `migration:generate` usable against a DataSource that only knows a fraction
  of the schema — since this database is shared by every service, a generate
  run would emit `DROP` statements for every table it cannot see.
- **One ledger, in `public`, for the whole platform** — not one per service
  schema. Because of that, **every migration must fully qualify its tables**
  (`marketplace.products`, never a bare `products`). A bare name resolves
  against `search_path`, which is `public`; running one would build a second,
  empty set of tables in `public` shadowing the real ones. The earliest
  migrations in the folder were written with bare names precisely because they
  predate this rule — they are _baselined_, not run, which is exactly how that
  shadowing is avoided (see "Baselining" below).
- **One transaction per migration** (`migrationsTransactionMode: 'each'`), so
  a failure rolls back only that migration and leaves everything before it
  applied. This matters for migrations that pair a schema change with a data
  backfill in the same file — they commit together or not at all.

The commands, all run from `apps/api`:

```bash
npm run migration:show      # what TypeORM thinks is pending
npm run migration:run       # apply pending migrations
npm run migration:revert    # revert the most recently applied migration
npm run migration:baseline  # mark historical migrations applied without running them
```

## `synchronize` — off everywhere, and what it cannot do

`DB_SYNCHRONIZE` defaults to `false` everywhere (`apps/api/.env.example`,
each module's `.env.example`, `infra/k8s/config.yaml`) and stays that way in
every environment, development included. Two things enforce it:

- `validateDatabaseConfig()`, called from every service's `main.ts` — the core
  eighteen and now all eight module backends — throws on `DB_SYNCHRONIZE=true`
  in **every** environment. There is no development escape hatch: asking for
  auto-sync is a fatal boot, not a warning. Marketplace and franchise did not
  call it until IN3's fix round, which is why their `.env.example` used to
  describe an escape hatch the other six did not have;
- `assertSynchronizeAllowed(synchronize, nodeEnv, service)` — the last line
  before TypeORM writes DDL — throws when auto-sync is on under
  `NODE_ENV=production`, inside the `useFactory` where the value actually is.
  Each of the eight module backends calls it (`modules/<m>/backend/src/<m>-service.module.ts`).
  It is reachable despite the first guard, because `SKIP_DB=true` makes
  `validateDatabaseConfig()` return early. The guard exists because those eight
  used to key `synchronize` on `NODE_ENV !== 'production'`, which
  `validateDatabaseConfig()` never sees and which Compose — declaring
  `NODE_ENV` nowhere — resolves to `development` on a staging box (AUD2-070).

To iterate on entities, generate a migration against a scratch database (below).
That is the replacement for turning auto-sync on for an afternoon, and it is the
only one.

That default used to be on in development, and it is off now because auto-sync
is destructive in a way that is easy to miss: annotating an **existing** column
in an entity (narrowing `region_code` to `varchar(2)`, say) makes `synchronize`
DROP and recreate it on the next boot, emptying it. That happened three times
during the regional plan. Auto-sync also silently **drops indexes TypeORM's
entity metadata does not know about** — `marketplace.bank_offers`' region index
was created by `OfferMarket1786502300000` and dev auto-sync dropped it again;
re-running that migration under the new ledger is what put it back. Even where
it has been used during development, auto-sync cannot express everything a real
migration can:

- **Expression indexes** have no entity-level representation, so neither
  `synchronize` nor `migration:generate` will ever produce one. Both of
  marketplace's search indexes are in that position and are written by hand at
  the end of `1786498000000-InitialMarketplaceSchema.ts`: `IDX_products_fts`
  (GIN over the `to_tsvector` expression `CatalogService.searchProducts` uses)
  and `IDX_products_name_trgm` (GIN `name gin_trgm_ops`, for the `ILIKE`
  fallback). Without them a module-only deploy searches the catalogue by
  sequential scan — no error, just a slow page. If you add a query with an
  expression predicate, its index is yours to write.
- **Data backfills.** `synchronize` will happily add a new column with a
  default, but it performs no backfill of existing rows. The sharp case in
  this codebase is the `ListingApprovalAndBuyBox` migration: it adds an
  `approvalStatus` column defaulting to `PENDING` and then backfills existing
  listings to `APPROVED` in the same transaction — `synchronize` would add the
  column and leave every existing listing invisible to the storefront, because
  every catalogue read requires `APPROVED`.
- **Constraint replacement**, where the old constraint has to be dropped
  before the new one can be added — `synchronize` diffs schema, it does not
  sequence a drop-then-add for you.

## Module migrations: one runner per module database

The eight module backends are not in `apps/api` and do not share its ledger.
Each has its own runner — `modules/<m>/backend/data-source.ts` — and its own
`migrations/` folder. Run every command **from the module's own directory**:
`dotenv/config` reads `.env` from the working directory, and from the
repository root `<MODULE>_DB_*` is unset, the shared `DB_*` answers instead,
and the migration lands in the wrong database.

```bash
cd modules/grocery/backend
npm run migration:show                              # what is pending here
npm run migration:run                               # apply it
npm run migration:revert                            # undo the last one
npm run migration:generate -- migrations/AddThing   # see the procedure below
```

Four differences from `apps/api/data-source.ts`, all deliberate:

- **Entities are listed explicitly and the list is populated**, copied verbatim
  from `ENTITIES` in the module's service module. `apps/api` keeps `entities: []`
  because its DataSource sees only a fraction of a shared database; a module
  runner owns its database whole, and `migration:generate` needs the entities to
  diff against. An empty list would diff nothing against everything and emit a
  `DROP` per table — which is what the review step below is for.
- **Migrations are named, never globbed.** A bundled build makes a `__dirname`
  glob match nothing. `apps/api/test/module-data-sources.spec.ts` fails when a
  file in `migrations/` is missing from the list, named twice, or named but
  absent from disk.
- **The ledger is `public.<module>_migrations`, not `<module>.migrations`** —
  and the DataSource declares **no `schema`** at all, which is what puts it
  there. TypeORM builds the ledger table inside `options.schema` and does it
  _before_ the first migration's `up()` runs, so with `schema: 'taxi'` a fresh
  `kartseek_taxi` died on `CREATE TABLE "taxi"."migrations"` — the schema does
  not exist yet, and no `CREATE SCHEMA` inside a migration can run early enough
  to help. `migrationsSchema` is private in TypeORM and derived from
  `options.schema`, so dropping the connection-level schema is the only way to
  move the ledger. The per-module ledger name keeps the eight apart if they ever
  share one database — plain `public.migrations` there is the platform's own.
- **Every entity names its own schema** (`@Entity({ name: 'x', schema: 'taxi' })`),
  because there is no connection-level schema left to inherit from. The spec
  asserts it for all 97: an entity that forgets would have
  `migration:generate` propose creating the whole module in `public` and
  dropping it from the module's own schema.

### Timestamps are allocated, not taken from the clock

`migration:generate` stamps the file with `Date.now()`. Rename it. A timestamp
has to be unique across **all nine databases**, because it is how a runbook
refers to one migration — `1786502400000` currently names five different
migrations in five different databases, which makes "apply 1786502400000 in
staging" ambiguous five ways. The spec above fails on any new collision.

Slots are allocated on a 100 000 grid. `1786498000000 + <module index> × 100000`
is reserved for the initial schemas:

| Index | Module      | Initial schema  | Next free slot for this module |
| ----- | ----------- | --------------- | ------------------------------ |
| 0     | marketplace | `1786498000000` | continue above `1786502300000` |
| 1     | grocery     | `1786498100000` | continue above `1786502400000` |
| 2     | restaurant  | `1786498200000` | continue above `1786502400000` |
| 3     | pharmacy    | `1786498300000` | continue above `1786502400000` |
| 4     | doctor      | `1786498400000` | anything unused                |
| 5     | hotel       | `1786498500000` | continue above `1786502400000` |
| 6     | taxi        | `1786498600000` | anything unused                |
| 7     | franchise   | `1786498700000` | anything unused                |

The initial schemas sit **below** every other migration on purpose. TypeORM
orders by timestamp, not by position in the `migrations` array, so a later
stamp would make a fresh deploy run an `ALTER` against a table that does not
exist yet. For anything new, take the next free stamp above the whole range
(`1786503000000` upward is untouched) and check `migration:show` in every
database before committing to it.

### Generating a migration

A generated migration is a diff between the entities and whatever the target
database already contains, so generating against a **live** database yields an
empty or partial file — `synchronize` already built the tables. Generate
against an empty scratch database instead:

```bash
# 1. Scratch Postgres on a port nothing else uses. Same image as the platform.
#    Wait for the INIT to finish, not just for pg_isready: the entrypoint runs a
#    temporary server during initdb and then restarts it, so a CREATE DATABASE
#    issued too early dies with "the database system is shutting down".
docker run -d --name kartseek-scratch -p 5499:5432 \
  -e POSTGRES_PASSWORD=scratch -e POSTGRES_DB=scratch postgis/postgis:16-3.4-alpine
until docker logs kartseek-scratch 2>&1 | grep -q 'PostgreSQL init process complete'; do sleep 1; done
sleep 3

# 2. One EMPTY database per module. No schema, no extensions, no init SQL — the
#    initial migration creates both, and this is the only way to find out
#    whether it really does.
docker exec kartseek-scratch psql -U postgres -d scratch -c 'CREATE DATABASE scratch_grocery'

# 3. Build the current schema from the migrations, then generate the new one
#    against it.
cd modules/grocery/backend
env GROCERY_DB_HOST=127.0.0.1 GROCERY_DB_PORT=5499 GROCERY_DB_USER=postgres \
    GROCERY_DB_PASSWORD=scratch GROCERY_DB_NAME=scratch_grocery npm run migration:run
env GROCERY_DB_HOST=127.0.0.1 GROCERY_DB_PORT=5499 GROCERY_DB_USER=postgres \
    GROCERY_DB_PASSWORD=scratch GROCERY_DB_NAME=scratch_grocery \
  npm run migration:generate -- migrations/AddThing

# 4. REVIEW the emitted SQL before committing it. Two things to look for:
#    - a DROP in up()          → an entity is missing from the list; fix, regenerate
#    - a table you do not know  → the database was not empty; recreate it, repeat
awk '/public async up/,/public async down/' migrations/*AddThing.ts \
  | grep -c 'DROP TABLE\|DROP COLUMN\|DROP INDEX\|DROP CONSTRAINT'   # must be 0

# 5. Rename the file and its class to an allocated timestamp (see the table).

# 6. Prove the whole folder applies to a database that holds NOTHING, and then
#    reports nothing pending.
docker exec kartseek-scratch psql -U postgres -d scratch -c 'DROP DATABASE scratch_grocery'
docker exec kartseek-scratch psql -U postgres -d scratch -c 'CREATE DATABASE scratch_grocery'
env GROCERY_DB_HOST=127.0.0.1 GROCERY_DB_PORT=5499 GROCERY_DB_USER=postgres \
    GROCERY_DB_PASSWORD=scratch GROCERY_DB_NAME=scratch_grocery npm run migration:run
env GROCERY_DB_HOST=127.0.0.1 GROCERY_DB_PORT=5499 GROCERY_DB_USER=postgres \
    GROCERY_DB_PASSWORD=scratch GROCERY_DB_NAME=scratch_grocery npm run migration:show  # zero [ ]

docker rm -f kartseek-scratch
```

Step 6 is the acceptance test, not a formality: the module services run with
`synchronize: false`, so migrations alone have to be enough to serve a request —
including the `CREATE SCHEMA` and `CREATE EXTENSION` that every initial
migration opens with.

### Diffing what the migrations built against what is live

Do this before believing a generated migration. Both queries take the module's
schema name:

```bash
COLS="SELECT table_name||'.'||column_name||' '||data_type
             ||COALESCE('('||character_maximum_length||')','')||' null='||is_nullable
        FROM information_schema.columns WHERE table_schema='grocery' ORDER BY 1;"
IDX="SELECT tablename||' '||indexname||' '||regexp_replace(indexdef,'^.*USING ','')
       FROM pg_indexes WHERE schemaname='grocery' ORDER BY 1;"

docker exec kartseek-scratch          psql -U postgres     -d scratch_grocery  -tAc "$COLS" > /tmp/scratch.cols
docker exec kartseek-postgres-grocery psql -U grocery_user -d kartseek_grocery -tAc "$COLS" > /tmp/live.cols
diff /tmp/live.cols /tmp/scratch.cols        # expect no output

docker exec kartseek-scratch          psql -U postgres     -d scratch_grocery  -tAc "$IDX" > /tmp/scratch.idx
docker exec kartseek-postgres-grocery psql -U grocery_user -d kartseek_grocery -tAc "$IDX" > /tmp/live.idx
diff /tmp/live.idx /tmp/scratch.idx
```

Two differences are expected and are not defects. Constraint **names** differ
wherever a table was originally built by a hand-written `apps/api` migration
(`PK_flash_deals`) rather than by `migration:generate` (`PK_8f1c0e8afe…`) — same
columns, same uniqueness. And a live database may still carry a
`<schema>.migrations` table: that is the pre-IN3 ledger, left in place and
inert. The ledger in use is `public.<module>_migrations`.

### A fresh, empty database

A module database arrives with nothing in it: no `<module>` schema, no
`uuid-ossp`, no tables. Everything after `CREATE DATABASE` comes from the
migrations — there is no init SQL step and no `psql -c 'CREATE SCHEMA'` to
remember, because forgetting it was how this broke in the first place.

```bash
# provisioning: the database itself, and a role that owns it
psql -h <host> -U postgres -c 'CREATE DATABASE kartseek_taxi'

cd modules/taxi/backend
npm run migration:show     # [ ] InitialTaxiSchema1786498600000
npm run migration:run      # CREATE SCHEMA, CREATE EXTENSION, then every table
npm run migration:show     # [X] 1 InitialTaxiSchema1786498600000
```

`CREATE EXTENSION "uuid-ossp"` needs a superuser or an already-installed
extension; on a managed Postgres the platform usually pre-installs it and the
`IF NOT EXISTS` then makes the statement a no-op. Marketplace also creates
`pg_trgm`, for the trigram index its product search falls back to.

### A database that already has its tables

The dev and staging module databases were built by `synchronize` and have no
ledger row to say so. The **initial** schema migrations are written for this
too: every statement in `up()` is guarded, so running one against a database
that already holds the tables changes nothing but the ledger.

```bash
cd modules/taxi/backend
npm run migration:show     # [ ] InitialTaxiSchema1786498600000
npm run migration:run      # guards make every DDL statement a no-op
npm run migration:show     # [X] 1 InitialTaxiSchema1786498600000
```

`CREATE SCHEMA` / `CREATE EXTENSION` / `CREATE TABLE` / `CREATE INDEX` carry
`IF NOT EXISTS`; `CREATE TYPE` and `ALTER TABLE … ADD CONSTRAINT`, which
Postgres has no `IF NOT EXISTS` for, run inside a `DO` block that swallows
`duplicate_object` and nothing else. An existing table is skipped whole, its
`COMMENT`s included, so a column that has drifted since cannot fail the run.
**Rollback:** the only write is one ledger row —
`DELETE FROM public.<module>_migrations WHERE name = 'Initial<Module>Schema<ts>'`
undoes it and no DDL ran. Do **not** use `migration:revert` for this: that runs
`down()`, which drops every table in the module's database and then the schema.

## The two-Postgres-on-5432 trap

`infra/docker/compose.infra.yml` binds the platform Postgres container to host
port 5432. If anything else on your machine is already listening there — most
commonly a Postgres installed natively as a Windows service, or a leftover
container from an earlier session — one of the two loses: either `docker
compose up` refuses to bind and the platform container never starts, or your
services end up talking to whichever instance actually holds the port, which
looks like "my migration ran but the data isn't there" rather than a startup
error. If a service can connect but none of your recent schema changes show
up, check what is actually listening on 5432 before doubting the migration.

## Database-per-service, today

By default every module (marketplace, grocery, restaurant, pharmacy, doctor,
hotel, taxi, franchise) shares the platform Postgres container, each in its
own database inside it — isolation at the database level, not the container
level. `docker compose --profile isolated up -d` instead gives each module its
own Postgres container, and each module's `.env` already prefers its own
`<MODULE>_DB_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_NAME` over the shared
`DB_*` values when they are set, so nothing in the application code has to
change to use it.

Moving existing data across is a separate, explicit step:

```bash
npm run db:split -w kartseek-api               # report only, changes nothing
npm run db:split -w kartseek-api -- --apply    # copy, then verify row counts per table
```

`db:split` **copies**, it never moves — the shared database is left untouched,
so a failed or half-finished run costs nothing, but it also means the two
copies diverge the moment traffic starts hitting the new one. Do this with
services stopped, and use `--only=<module>[,<module>...]` to limit it.

### The dedicated instances on a machine that has been running a while

Read this before switching a module back to `--profile isolated` on an existing
developer machine. Every module `.env` now points at the **shared** database
(`kartseek_db`, port 5432) as that module's own login role, so the eight
dedicated containers on 5433–5440 are no longer what anything connects to. Their
volumes still hold whatever was in them at the moment of the switch, and
**nothing reconciles the two**: migrations run against the shared database do
not reach them, so a volume that was ahead is now behind, and one that was built
by an older `synchronize` may not match the entities at all. On the machine
where the switch was made, `kartseek_taxi.taxi` held 10 tables against the 9 the
migration builds.

So a module pointed back at its dedicated instance gets whatever that volume
happens to contain. Run `npm run migration:show` against it before trusting it,
and `docker compose down -v` on that one container (which discards its data) if
you would rather start from the migrations.

## Where this is heading

This split-by-opt-in arrangement is for the _module_ databases. The 18 core
services inside `apps/api` (the gateway plus the other 17) still share one
database and one migration ledger. A later phase moves each core service to
its own database and its own per-service migration ledger, with the existing
hand-written SQL migrations baselined into the owning service's folder — see
section 9 of
[`docs/superpowers/specs/2026-09-05-platform-reorganization-design.md`](../superpowers/specs/2026-09-05-platform-reorganization-design.md)
for the full mechanism and the ownership-inventory gate that has to pass
before any service is cut over.

## Baselining, before the first `migration:run`

If you are pointing migrations at a database that was built by `synchronize`
rather than by running these migrations, TypeORM's ledger has never been
written to, so it considers every migration pending — including the ones
whose bare-name `CREATE TABLE IF NOT EXISTS` statements would otherwise shadow
live tables in `public` (see above). `migration:baseline` marks migrations as
already applied, without running them or touching the schema:

```bash
npm run migration:baseline -- <cutoff-timestamp>              # dry run
npm run migration:baseline -- <cutoff-timestamp> --commit      # write the ledger
```

Every migration whose filename timestamp is at or below the cutoff is recorded
as applied. Run `migration:show` first and choose a cutoff you can justify —
getting it wrong in one direction skips a migration forever, in the other it
runs a migration against a schema that already has its changes (survivable
here because these migrations guard their DDL with `IF NOT EXISTS`, which is
why that is the safer direction to be wrong in).
