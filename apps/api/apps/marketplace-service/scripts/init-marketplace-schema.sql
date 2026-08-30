-- ══════════════════════════════════════════════════════════════════════════════
-- KARTSEEK — Marketplace Schema Initialisation
-- Run once against the dedicated marketplace database to create the schema.
--
-- Usage (local):
--   psql -h localhost -p 5433 -U marketplace_user -d kartseek_marketplace -f init-marketplace-schema.sql
--
-- Usage (K8s/production):
--   kubectl exec -it postgres-marketplace-0 -n kartseek -- \
--     psql -U marketplace_user -d kartseek_marketplace -f /docker-entrypoint-initdb.d/init-marketplace-schema.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- Ensure the schema exists (idempotent).
CREATE SCHEMA IF NOT EXISTS marketplace;

-- Set the default search_path for the application user so TypeORM's
-- `schema: 'marketplace'` config is honoured correctly.
ALTER ROLE marketplace_user SET search_path TO marketplace, public;

-- Grant full access on the schema to the application user.
GRANT ALL PRIVILEGES ON SCHEMA marketplace TO marketplace_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA marketplace TO marketplace_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA marketplace TO marketplace_user;

-- Ensure future objects created in this schema are also accessible.
ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace
  GRANT ALL PRIVILEGES ON TABLES TO marketplace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace
  GRANT ALL PRIVILEGES ON SEQUENCES TO marketplace_user;
