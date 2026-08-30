-- Durable order storage for order-service.
--
-- Written as DDL rather than left to TypeORM `synchronize` on purpose: these
-- rows are the record of money taken, and auto-sync is the kind of thing that
-- quietly rewrites a column type on a deploy. `DB_SYNCHRONIZE` stays false;
-- this file is the schema.
--
-- Matches apps/order-service/src/entities/order.entity.ts. Column names are
-- quoted because TypeORM preserves the entity's camelCase rather than
-- snake_casing it, and an unquoted identifier would fold to lower case and no
-- longer match.
--
--   psql -h localhost -U postgres -d kartseek_db -f scripts/create-order-table.sql

CREATE SCHEMA IF NOT EXISTS "order";

DO $$ BEGIN
  CREATE TYPE "order".orders_status_enum AS ENUM (
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "order".orders_escrowstatus_enum AS ENUM (
    'PENDING', 'HELD', 'RELEASED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "order".orders (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The customer-facing reference (ORD-…): what support and the checkout page
  -- quote, and what every lookup goes through. Unique, not just indexed.
  "orderNumber"         varchar NOT NULL,
  "customerId"          varchar NOT NULL,
  "sellerId"            varchar,
  "items"               jsonb NOT NULL,
  "subtotal"            numeric(10,2) NOT NULL,
  "deliveryFee"         numeric(10,2) NOT NULL DEFAULT 0,
  "discount"            numeric(10,2) NOT NULL DEFAULT 0,
  "walletDeduction"     numeric(10,2) NOT NULL DEFAULT 0,
  "totalAmount"         numeric(10,2) NOT NULL,
  "deliveryAddress"     varchar NOT NULL,
  "serviceType"         varchar NOT NULL,
  "paymentMethod"       varchar NOT NULL,
  "status"              "order".orders_status_enum NOT NULL DEFAULT 'PENDING',
  "escrowStatus"        "order".orders_escrowstatus_enum NOT NULL DEFAULT 'PENDING',
  -- `discount` records what came off; these record why, so a discounted order
  -- can be reconciled against the coupon that granted it.
  "couponCode"          varchar,
  "couponId"            uuid,
  "notes"               varchar,
  "estimatedDeliveryAt" timestamp,
  "placedAt"            timestamp NOT NULL DEFAULT now(),
  "updatedAt"           timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_orders_orderNumber" ON "order".orders ("orderNumber");
CREATE INDEX IF NOT EXISTS "IDX_orders_customerId" ON "order".orders ("customerId");
-- Order history is always read newest-first for one customer.
CREATE INDEX IF NOT EXISTS "IDX_orders_customer_placedAt" ON "order".orders ("customerId", "placedAt" DESC);
