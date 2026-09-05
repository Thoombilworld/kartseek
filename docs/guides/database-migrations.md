# Database migrations

This guide is for anyone changing a table shape in the shared platform
database — what runs the migrations, what `synchronize` still does instead
today and where that stops being safe, how the per-module database split
works if you opt into it, and where this is all heading in a later phase. It
assumes you already have infrastructure up (`npm run infra:up`).

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

## `synchronize` — development-only, and what it cannot do

`DB_SYNCHRONIZE` defaults to `false` everywhere (`apps/api/.env.example`,
`infra/k8s/config.yaml`) and stays that way in every environment that matters:
multiple services share one database, so letting each service `ALTER` the
shared tables to match its own entities makes the resulting schema depend on
boot order, and it silently **drops indexes TypeORM's entity metadata does not
know about**. Even where it has been used during development, it cannot
express everything a real migration can:

- **Expression indexes** — the search GIN indexes, for example — have no
  entity-level representation for `synchronize` to generate.
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
