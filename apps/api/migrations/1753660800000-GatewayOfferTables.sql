-- ══════════════════════════════════════════════════════════════════════════════
-- KARTSEEK — Gateway-Owned Tables Migration
-- Creates bank_offers and exchange_offers tables in the public schema.
-- These are managed by the API Gateway (not a microservice).
--
-- Usage: psql -h localhost -U postgres -d kartseek_db -f migrations/1753660800000-GatewayOfferTables.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Bank Offers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR DEFAULT '',
  description TEXT,
  "bankName" VARCHAR DEFAULT '',
  "cardType" VARCHAR DEFAULT 'ALL',
  "cardNetwork" VARCHAR DEFAULT 'ALL',
  "discountType" VARCHAR DEFAULT 'PERCENTAGE',
  "discountValue" DECIMAL(10,2) DEFAULT 0,
  "maxDiscount" DECIMAL(10,2),
  "minOrderValue" DECIMAL(10,2) DEFAULT 0,
  "logoUrl" VARCHAR,
  "termsAndConditions" TEXT,
  "applicableCategories" TEXT,
  "applicableCountries" TEXT,
  "totalUsageLimit" INT,
  "perUserLimit" INT,
  "usageCount" INT DEFAULT 0,
  "startsAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  priority INT DEFAULT 100,
  status VARCHAR DEFAULT 'ACTIVE',
  "isFeatured" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ── Exchange Offers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR DEFAULT '',
  description TEXT,
  "exchangeCategory" VARCHAR DEFAULT '',
  "targetCategory" VARCHAR DEFAULT '',
  "maxExchangeValue" DECIMAL(10,2) DEFAULT 0,
  "minExchangeValue" DECIMAL(10,2) DEFAULT 0,
  "bonusAmount" DECIMAL(10,2) DEFAULT 0,
  "eligibilityCriteria" JSONB,
  "applicableProductIds" TEXT,
  "applicableBrandIds" TEXT,
  "applicableCountries" TEXT,
  "iconUrl" VARCHAR,
  "fulfillmentMode" VARCHAR DEFAULT 'PICKUP',
  "startsAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  priority INT DEFAULT 100,
  status VARCHAR DEFAULT 'ACTIVE',
  "isFeatured" BOOLEAN DEFAULT FALSE,
  "totalExchanges" INT DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
