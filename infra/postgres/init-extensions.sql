-- Extensions every KARTSEEK service database needs.
--
-- Mounted into each Postgres container's docker-entrypoint-initdb.d, so it runs
-- once when the data directory is first created. It does NOT run against an
-- existing volume — a database created before this file existed needs the
-- statements applying by hand, which is what scripts/split-databases.ts does
-- when it provisions a target.
--
-- Every one of these was previously created ad hoc, per database, by whoever
-- noticed it was missing. A service whose database lacked uuid-ossp booted
-- cleanly and failed on the first insert with "function uuid_generate_v4() does
-- not exist".

-- Primary keys. Every entity in the platform uses @PrimaryGeneratedColumn('uuid').
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigram indexes behind the catalogue's ILIKE search. Without it those queries
-- still work and simply stop using an index, which is invisible until the table
-- is large enough to matter.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Geography columns: store and restaurant locations, delivery radii, driver
-- positions. The image ships PostGIS; the extension still has to be enabled per
-- database.
CREATE EXTENSION IF NOT EXISTS postgis;
