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
#   USAGE + CREATE on its own schema, ALL on that schema's existing tables and
#   sequences, and the same by default on whatever it creates later. Nothing on
#   any other module's schema, and nothing on `public` — where `users`, `orders`
#   and the gateway's own tables live.
#
# NOTE: this revokes `public` from the role by name. PostgreSQL also grants
# USAGE on `public` to PUBLIC, which no per-role REVOKE removes — so a module
# role can still *see* that the schema exists. It has no privilege on any table
# in it, which is what matters here; tightening `PUBLIC` itself is a change to
# every consumer of the shared database and belongs with the flip of the first
# service onto its role, not with creating them.

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
  [ "$(psql_run --dbname "$SHARED_DB" -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$1'")" = "1" ]
}

# ── The roles themselves. Cluster-global, so once is enough. ─────────────────
for m in "${MODULES[@]}"; do
  upper="$(echo "$m" | tr '[:lower:]' '[:upper:]')"
  user_var="${upper}_DB_USER"
  pass_var="${upper}_DB_PASSWORD"
  role="${!user_var:-${m}_user}"
  pass="${!pass_var}"

  psql_run --dbname "$SHARED_DB" -v role="$role" -v pass="$pass" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'role')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role')
\gexec
-- Unconditional, so re-running after a password change rotates the role rather
-- than leaving the database on the old one while .env says otherwise.
ALTER ROLE :"role" WITH LOGIN PASSWORD :'pass';
SQL
  echo "init-roles: role $role ready"
done

# ── Schemas, grants and extensions, per database ─────────────────────────────
#
# The shared database carries a schema for every module. A dedicated database
# (the `isolated` profile, or `npm run db:split`) carries only its own.
grant_in() {
  local db="$1" m="$2" role="$3"
  psql_run --dbname "$db" -v schema="$m" -v role="$role" <<'SQL'
CREATE SCHEMA IF NOT EXISTS :"schema";
GRANT USAGE, CREATE ON SCHEMA :"schema" TO :"role";
GRANT ALL ON ALL TABLES IN SCHEMA :"schema" TO :"role";
GRANT ALL ON ALL SEQUENCES IN SCHEMA :"schema" TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema" GRANT ALL ON TABLES TO :"role";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema" GRANT ALL ON SEQUENCES TO :"role";
REVOKE ALL ON SCHEMA public FROM :"role";
SQL
}

extensions_in() {
  psql_run --dbname "$1" <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
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
    echo "init-roles: $dedicated.$m granted to $role"
  fi
done

echo "init-roles: ${#MODULES[@]} module roles ready"
