#!/usr/bin/env bash
# One PostgreSQL login role per module, each with rights to its own schema only.
# ═══════════════════════════════════════════════════════════════════════════════
#
# Every service connects as the cluster superuser today, so one compromised
# service yields read/write on all 25 schemas in the shared database — plus
# `COPY … FROM PROGRAM`, which is shell access on the database host (AUD2-073).
# This creates the eight roles the platform has been documenting since the
# module split, so a service can be moved onto its own credential one at a time.
#
# ── Where the passwords come from ────────────────────────────────────────────
#
# The same eight `<MODULE>_DB_USER` / `<MODULE>_DB_PASSWORD` pairs the root
# `.env` already defines for the `isolated` compose profile, where each pair is
# a dedicated instance's own superuser. One credential pair per module, valid in
# either topology: move a module onto its own Postgres and the credential it
# presents does not change.
#
# There is no default password. The script exits non-zero, naming the variable,
# rather than creating a role anyone could read the password for.
#
# Re-run it after anything that adds objects to a module schema as another role
# — a `migration:run` executed as `postgres`, or a seed script — so the module
# role picks up ownership of what appeared. It is idempotent by design.
#
# ── Why it also creates the extensions ───────────────────────────────────────
#
# IN3's initial migrations open with `CREATE EXTENSION IF NOT EXISTS` for
# uuid-ossp, pg_trgm and postgis, and creating an extension requires superuser.
# A module role running `migration:run` would fail on the first statement of the
# first migration. So the extensions are created here, once, as the superuser
# this script already runs as — `IF NOT EXISTS` then makes the migration's own
# statement a no-op, and a module role never needs superuser.
#
# ── When it runs ─────────────────────────────────────────────────────────────
#
# Mounted at /docker-entrypoint-initdb.d/20-roles.sh, so the Postgres entrypoint
# runs it once when the data directory is first created, after 10-extensions.sql.
# It does NOT run against an existing volume — `infra/docker/README.md` has the
# one-line `docker compose exec` that applies it by hand, and every statement
# below is idempotent so re-running it is safe (it also rotates each role's
# password to whatever the environment currently says).
#
# ── What a role gets ─────────────────────────────────────────────────────────
#
#   Ownership of its own schema and of every table, sequence and view already in
#   it; USAGE + CREATE on it, and ALL by default on whatever it creates later.
#   CREATE on the database, which is only the right to create NEW schemas and
#   is what the initial migration's `CREATE SCHEMA IF NOT EXISTS` demands.
#   Ownership of its migration ledger, `public.<module>_migrations`, which this
#   script creates. Nothing on any other module's schema, and nothing else on
#   `public` — where `users`, `orders` and the gateway's own tables live.
#
#   Ownership rather than grants, because ALTER TABLE, DROP TABLE and CREATE
#   INDEX are owner-only: a role with every grant PostgreSQL can express still
#   cannot run a migration against a table someone else owns.
#
# ── What the ownership transfer does and does not guarantee ──────────────────
#
#   GUARANTEED, from the moment this script last ran: the role owns its schema
#   and every table, sequence and view that was in it at that point, plus its
#   migration ledger — so its migrations may ALTER, DROP and index them, and
#   `ALTER DEFAULT PRIVILEGES` covers whatever the role itself creates later.
#
#   NOT GUARANTEED: anything added to a module schema afterwards *by another
#   role*. A `migration:run` executed as `postgres`, a seed script still using
#   `DB_USER=postgres`, a `CREATE TABLE` typed into psql or pgAdmin — each
#   leaves an object owned by `postgres` inside a schema the module role owns.
#   Reads and writes keep working (the GRANTs above cover DML), so nothing looks
#   wrong until the next migration tries to alter that one table and is refused
#   as non-owner. `ALTER DEFAULT PRIVILEGES` does not help: without `FOR ROLE`
#   it only describes what the role grants on its *own* future objects.
#
#   The fix is to re-run this script, which is why it is idempotent and why the
#   line at the top says to run it after anything that adds objects as another
#   role. To find out whether you need to:
#
#     SELECT schemaname, tablename, tableowner FROM pg_tables
#      WHERE schemaname = '<module>' AND tableowner <> '<module>_user';

set -euo pipefail

MODULES=(marketplace grocery restaurant pharmacy doctor hotel taxi franchise)

PSQL_USER="${POSTGRES_USER:-postgres}"
SHARED_DB="${POSTGRES_DB:-kartseek_db}"

# ── Refuse before changing anything ──────────────────────────────────────────
missing=()
for m in "${MODULES[@]}"; do
  upper="$(echo "$m" | tr '[:lower:]' '[:upper:]')"
  var="${upper}_DB_PASSWORD"
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "init-roles: refusing to create module roles with a default password." >&2
  echo "init-roles: unset or empty: ${missing[*]}" >&2
  echo "init-roles: set them in the repository-root .env (see .env.example)." >&2
  exit 1
fi

psql_run() {
  # -X so a ~/.psqlrc cannot change the session; ON_ERROR_STOP so a failed grant
  # is a failed script rather than a warning in a log nobody reads.
  psql -X -v ON_ERROR_STOP=1 --username "$PSQL_USER" "$@"
}

db_exists() {
  # The name goes through a psql variable rather than into the SQL text, like
  # every other identifier here. Operator-controlled input either way, but a
  # `<MODULE>_DB_NAME` containing a quote should be a failed lookup, not a
  # rewritten statement.
  #
  # On stdin, not `-c`: psql performs no `:variable` interpolation on a `-c`
  # argument, so `:'name'` there reaches the server verbatim and every lookup
  # fails with "syntax error at or near \":\"" — silently, because the result is
  # only compared to "1". That is how the dedicated-database branch below would
  # stop running without anything reporting it.
  [ "$(psql_run --dbname "$SHARED_DB" -v name="$1" -tA <<'SQL'
SELECT 1 FROM pg_database WHERE datname = :'name';
SQL
  )" = "1" ]
}

# ── The roles themselves. Cluster-global, so once is enough. ─────────────────
for m in "${MODULES[@]}"; do
  upper="$(echo "$m" | tr '[:lower:]' '[:upper:]')"
  user_var="${upper}_DB_USER"
  pass_var="${upper}_DB_PASSWORD"
  role="${!user_var:-${m}_user}"
  pass="${!pass_var}"

  # The password reaches psql through the environment, not `-v pass=…` on its
  # argv: argv is world-readable in `ps` for the life of the call, inside a
  # container that may well have another process in it. `\getenv` (psql 13+)
  # loads it into a psql variable, and `:'pass'` still does the SQL quoting, so
  # a password containing quotes or backslashes is as safe as it was before.
  export KARTSEEK_ROLE_PASSWORD="$pass"
  psql_run --dbname "$SHARED_DB" -v role="$role" <<'SQL'
\getenv pass KARTSEEK_ROLE_PASSWORD
SELECT format('CREATE ROLE %I LOGIN', :'role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role')
\gexec
-- Unconditional, so re-running after a password change rotates the role rather
-- than leaving the database on the old one while .env says otherwise.
ALTER ROLE :"role" WITH LOGIN PASSWORD :'pass';
SQL
  unset KARTSEEK_ROLE_PASSWORD
  echo "init-roles: role $role ready"
done

# ── Schemas, grants and extensions, per database ─────────────────────────────
#
# The shared database carries a schema for every module. A dedicated database
# (the `isolated` profile, or `npm run db:split`) carries only its own.
grant_in() {
  local db="$1" m="$2" role="$3"
  psql_run --dbname "$db" -v schema="$m" -v role="$role" -v db="$db" <<'SQL'
CREATE SCHEMA IF NOT EXISTS :"schema";
-- The role owns its schema, rather than merely having rights inside one owned
-- by `postgres`. Ownership is what lets it DROP and re-CREATE its own objects,
-- which a migration that alters a table has to do.
ALTER SCHEMA :"schema" OWNER TO :"role";
GRANT USAGE, CREATE ON SCHEMA :"schema" TO :"role";
GRANT ALL ON ALL TABLES IN SCHEMA :"schema" TO :"role";
GRANT ALL ON ALL SEQUENCES IN SCHEMA :"schema" TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema" GRANT ALL ON TABLES TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema" GRANT ALL ON SEQUENCES TO :"role";

-- ── `public` ────────────────────────────────────────────────────────────────
--
-- Nothing on `public` except the right to traverse it. USAGE alone grants no
-- access to any table in it — it is the permission to *name* objects there —
-- and it is needed for the one object the role legitimately uses, its migration
-- ledger below. Without it `migration:run` fails on the ledger with
-- "permission denied for schema public".
--
-- PostgreSQL also grants USAGE on `public` to the pseudo-role PUBLIC, which no
-- per-role REVOKE removes; that is revoked once per database further down, so
-- this grant is what the role actually holds rather than a no-op.
REVOKE ALL ON SCHEMA public FROM :"role";
GRANT USAGE ON SCHEMA public TO :"role";

-- ── Why the role needs CREATE on the database ───────────────────────────────
--
-- Every module's initial migration opens with `CREATE SCHEMA IF NOT EXISTS
-- "<module>"`. PostgreSQL checks the CREATE privilege on the database BEFORE it
-- checks whether the schema already exists, so that statement fails with
-- "permission denied for database kartseek_db" for a role without it — even
-- though the line above has already created the schema and the statement would
-- do nothing. Without this grant a module role cannot run `migration:run` at
-- all, and every deploy's schema step stays a superuser job.
--
-- What it actually permits is creating NEW schemas. It confers nothing on any
-- schema that already exists: no read, no write, no drop. `CREATE SCHEMA
-- <name>` on a name already taken is an error, so this is not a route to
-- another module's data.
GRANT CREATE ON DATABASE :"db" TO :"role";

-- ── The migration ledger ────────────────────────────────────────────────────
--
-- The one thing a module legitimately owns outside its schema. IN3 put it at
-- `public.<module>_migrations`, because TypeORM builds the ledger before the
-- first migration's up() runs and a schema that does not exist yet cannot hold
-- it. The role is deliberately NOT given CREATE on `public` — that is how a
-- module would shadow `users` — so TypeORM cannot create the ledger itself, and
-- `migration:run` as a module role would fail on the very first statement.
--
-- So create it here, as the superuser this script already runs as, with the
-- three columns TypeORM's Postgres driver expects. TypeORM only checks that the
-- table exists, not what its primary key is called, so the constraint name
-- below does not have to match the one it would have generated.
SELECT format(
  'CREATE TABLE IF NOT EXISTS public.%I (id SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, name character varying NOT NULL)',
  :'schema' || '_migrations')
\gexec
SELECT format('ALTER TABLE public.%I OWNER TO %I', :'schema' || '_migrations', :'role')
\gexec
SELECT format('ALTER SEQUENCE public.%I OWNER TO %I', :'schema' || '_migrations_id_seq', :'role')
WHERE to_regclass('public.' || quote_ident(:'schema' || '_migrations_id_seq')) IS NOT NULL
\gexec
SELECT format('GRANT ALL ON TABLE public.%I TO %I', :'schema' || '_migrations', :'role')
\gexec
SELECT format('GRANT ALL ON SEQUENCE public.%I TO %I', :'schema' || '_migrations_id_seq', :'role')
WHERE to_regclass('public.' || quote_ident(:'schema' || '_migrations_id_seq')) IS NOT NULL
\gexec

-- ── Ownership of what is already there ──────────────────────────────────────
--
-- Grants are not enough for a schema that already has tables. Those were built
-- by `synchronize` or by a migration run as `postgres`, so `postgres` owns
-- them — and ALTER TABLE, DROP TABLE and CREATE INDEX are owner-only, no grant
-- can confer them. A module role flipped onto a pre-existing schema would read
-- and write its data happily and then fail on the first migration that changed
-- a column.
--
-- Idempotent, and it does nothing on a schema the role already owns.
SELECT format('ALTER TABLE %I.%I OWNER TO %I', schemaname, tablename, :'role')
FROM pg_tables WHERE schemaname = :'schema'
\gexec
SELECT format('ALTER SEQUENCE %I.%I OWNER TO %I', schemaname, sequencename, :'role')
FROM pg_sequences WHERE schemaname = :'schema'
\gexec
SELECT format('ALTER VIEW %I.%I OWNER TO %I', schemaname, viewname, :'role')
FROM pg_views WHERE schemaname = :'schema'
\gexec
SQL
}

extensions_in() {
  psql_run --dbname "$1" <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
SQL
}

# ── Close `public` to everyone who was not named ─────────────────────────────
#
# PostgreSQL grants USAGE on the `public` schema to the pseudo-role PUBLIC, so
# every login role in the cluster can traverse it by default and no per-role
# REVOKE takes that away. This is the one statement that does. It runs AFTER
# the per-module grants above, each of which hands its own role the USAGE it
# needs for its migration ledger — so the module roles keep exactly that and
# nothing else, while any role added later starts with no access to `users`,
# `orders` or the gateway's tables at all.
#
# It does not affect `postgres`: superusers bypass permission checks entirely,
# and every apps/api service still connects as DB_USER=postgres today.
#
# CREATE was already revoked from PUBLIC in PostgreSQL 15 and later; this is
# written to be correct on 14 as well, and is idempotent either way.
close_public_in() {
  psql_run --dbname "$1" <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SQL
}

extensions_in "$SHARED_DB"
for m in "${MODULES[@]}"; do
  upper="$(echo "$m" | tr '[:lower:]' '[:upper:]')"
  user_var="${upper}_DB_USER"
  name_var="${upper}_DB_NAME"
  role="${!user_var:-${m}_user}"

  grant_in "$SHARED_DB" "$m" "$role"
  echo "init-roles: $SHARED_DB.$m granted to $role"

  dedicated="${!name_var:-kartseek_${m}}"
  if [ "$dedicated" != "$SHARED_DB" ] && db_exists "$dedicated"; then
    extensions_in "$dedicated"
    grant_in "$dedicated" "$m" "$role"
    close_public_in "$dedicated"
    echo "init-roles: $dedicated.$m granted to $role"
  fi
done

# Last, so the per-module USAGE grants above are already in place.
close_public_in "$SHARED_DB"
echo "init-roles: public closed to PUBLIC in $SHARED_DB"

echo "init-roles: ${#MODULES[@]} module roles ready"
