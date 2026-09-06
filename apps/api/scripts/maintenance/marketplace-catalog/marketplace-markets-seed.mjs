#!/usr/bin/env node
/* global process, console */
/**
 * Marketplace per-market offers seed.
 *
 * The catalogue seed creates one seller — the Qatari "KartSeek Official
 * Store" — with one listing per product, so every other market the platform
 * trades in (ACTIVE_REGIONS) is an empty store: the storefront scopes reads to
 * sellers registered in the market being browsed.
 *
 * This script makes each active market a working store:
 *
 *   1. one VERIFIED "KartSeek Official Store <Country>" seller per market;
 *   2. one live listing per product for that seller, priced from the Qatari
 *      offer in the market's own currency (`FX` below), with the market's own
 *      list price (`product_listings.mrp`);
 *   3. that seller's own copies of every SKU (product_variants) at the same
 *      exchange rate — the catalogue's variants belong to the Qatari seller and
 *      were priced in rupees, which is also corrected here (once).
 *
 * Idempotent: sellers upsert on storeSlug, listings on (product_id, seller_id),
 * variants on (product_id, sku). Safe to re-run after adding products.
 *
 * Usage (from apps/api, with MARKETPLACE_DB_* in .env):
 *   node scripts/maintenance/marketplace-catalog/marketplace-markets-seed.mjs
 * Set MARKETS=IN,AE to limit the markets; FLUSH_CACHE=0 to keep Redis caches.
 */
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── env ──────────────────────────────────────────────────────────────────────
for (const file of ['.env', '.env.local']) {
  const p = path.resolve(__dirname, '../../../', file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

const DB = {
  host: process.env.MARKETPLACE_DB_HOST || '127.0.0.1',
  port: Number(process.env.MARKETPLACE_DB_PORT || 5433),
  user: process.env.MARKETPLACE_DB_USER || 'marketplace_user',
  password: process.env.MARKETPLACE_DB_PASSWORD || 'change_me_in_development',
  database: process.env.MARKETPLACE_DB_NAME || 'kartseek_marketplace',
};

/** Riyals → the market's currency. The catalogue's Qatari offers are the base. */
const FX = { QA: 1, IN: 22.9, AE: 1.01, SA: 1.03 };
/** Rupees → riyals, used once to correct variants that were seeded in rupees. */
const INR_PER_QAR = 22.9;

const MARKETS = {
  IN: {
    slug: 'kartseek-official-in',
    name: 'KartSeek Official Store India',
    phone: '+91 80 4000 1234',
    email: 'official.in@kartseek.com',
    taxId: 'GSTIN-29AAACK1234A1Z5',
    address: {
      line1: 'Unit 7, Prestige Tech Park',
      line2: 'Marathahalli–Sarjapur Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560103',
      country: 'India',
      countryCode: 'IN',
    },
    round: (v) => Math.round(v),
  },
  AE: {
    slug: 'kartseek-official-ae',
    name: 'KartSeek Official Store UAE',
    phone: '+971 4 400 1234',
    email: 'official.ae@kartseek.com',
    taxId: 'TRN-100234567800003',
    address: {
      line1: 'Office 1502, Latifa Tower',
      line2: 'Sheikh Zayed Road',
      area: 'Trade Centre',
      city: 'Dubai',
      country: 'United Arab Emirates',
      countryCode: 'AE',
      poBox: '112233',
    },
    round: (v) => Math.round(v * 100) / 100,
  },
  SA: {
    slug: 'kartseek-official-sa',
    name: 'KartSeek Official Store KSA',
    phone: '+966 11 400 1234',
    email: 'official.sa@kartseek.com',
    taxId: 'VAT-300012345600003',
    address: {
      line1: 'Office 8, Olaya Towers',
      line2: 'Olaya Street',
      area: 'Al Olaya',
      city: 'Riyadh',
      postalCode: '12211',
      country: 'Saudi Arabia',
      countryCode: 'SA',
    },
    round: (v) => Math.round(v * 100) / 100,
  },
};

const wanted = (process.env.MARKETS || Object.keys(MARKETS).join(','))
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter((c) => MARKETS[c]);

async function main() {
  const c = new Client(DB);
  await c.connect();
  const now = new Date().toISOString();

  const official = await c.query(
    `SELECT id FROM marketplace.sellers WHERE "storeSlug" = 'kartseek-official'`,
  );
  if (!official.rows.length)
    throw new Error('Qatari official store not found — run marketplace-seed.js first');
  const qaSellerId = official.rows[0].id;

  // ── 1. Correct the base market's own data once ───────────────────────────
  // Variants were seeded in rupees against riyal listings (ratio ≈ 23); bring
  // them into the listing's currency and bind them to the Qatari seller.
  const fixed = await c.query(
    `
    UPDATE marketplace.product_variants v
       SET "sellingPrice" = ROUND(v."sellingPrice" / $1, 2),
           mrp            = ROUND(v.mrp / $1, 2),
           seller_id      = $2::text,
           "updatedAt"    = $3
      FROM marketplace.product_listings l
     WHERE l.product_id = v.product_id AND l.seller_id = $2
       AND (v.seller_id IS NULL OR v.seller_id = $2::text)
       AND v."sellingPrice" > l."sellingPrice" * 5
  `,
    [INR_PER_QAR, qaSellerId, now],
  );
  console.log(`✅ QA variants rebased to riyals: ${fixed.rowCount}`);
  // The Qatari offer's list price is the product's catalogue figure.
  const qaMrp = await c.query(
    `
    UPDATE marketplace.product_listings l SET mrp = p.mrp, "updatedAt" = $2
      FROM marketplace.products p
     WHERE p.id = l.product_id AND l.seller_id = $1 AND l.mrp IS NULL
  `,
    [qaSellerId, now],
  );
  console.log(`✅ QA listings given a list price: ${qaMrp.rowCount}`);

  const base = await c.query(
    `
    SELECT p.id AS product_id, p.name, p.mrp AS product_mrp,
           l."sellerSku", l."sellingPrice", l."stockQuantity", l.condition
      FROM marketplace.products p
      JOIN marketplace.product_listings l ON l.product_id = p.id AND l.seller_id = $1
     WHERE l."isActive" = true AND l."approvalStatus" = 'APPROVED'
  `,
    [qaSellerId],
  );
  const variants = await c.query(
    `
    SELECT id, product_id, sku, barcode, attributes, "variantName", mrp, "sellingPrice", "costPrice",
           "stockQuantity", "lowStockThreshold", "weightKg", dimensions, "imageUrls", "isActive", "sortOrder"
      FROM marketplace.product_variants WHERE seller_id = $1::text AND "isActive" = true
  `,
    [qaSellerId],
  );
  console.log(`base market: ${base.rows.length} offers, ${variants.rows.length} SKUs`);

  // ── 2. Each market ───────────────────────────────────────────────────────
  for (const code of wanted) {
    const m = MARKETS[code];
    const fx = FX[code];
    const sellerId = randomUUID();
    const seller = await c.query(
      `
      INSERT INTO marketplace.sellers (
        id, "businessName", "storeSlug", "ownerName", email, phone, description,
        "verificationStatus", "isActive", "sellerRating", "totalReviews", "totalProducts", "totalOrders",
        "kycStatus", "gstNumber", address, region_code, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, 'KartSeek Admin', $4, $5, $6,
        'VERIFIED', true, 4.8, 0, 0, 0,
        'VERIFIED', $7, $8, $9, $10, $10
      ) ON CONFLICT ("storeSlug") DO UPDATE SET
        "businessName" = EXCLUDED."businessName", phone = EXCLUDED.phone, email = EXCLUDED.email,
        "verificationStatus" = 'VERIFIED', "isActive" = true, address = EXCLUDED.address,
        region_code = EXCLUDED.region_code, "updatedAt" = EXCLUDED."updatedAt"
      RETURNING id
    `,
      [
        sellerId,
        m.name,
        m.slug,
        m.email,
        m.phone,
        `Official KartSeek marketplace store for ${m.address.country} — guaranteed quality products, priced and delivered locally`,
        m.taxId,
        JSON.stringify(m.address),
        code,
        now,
      ],
    );
    const marketSellerId = seller.rows[0].id;

    let listings = 0;
    for (const row of base.rows) {
      const price = m.round(Number(row.sellingPrice) * fx);
      const mrp = m.round(Number(row.product_mrp) * fx);
      await c.query(
        `
        INSERT INTO marketplace.product_listings (
          id, product_id, seller_id, "sellerSku", "sellingPrice", mrp, "stockQuantity", condition,
          "isBuyBoxWinner", "isFulfilledByKartseek", "isActive", "approvalStatus", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, true, 'APPROVED', $9, $9)
        ON CONFLICT (product_id, seller_id) DO UPDATE SET
          "sellingPrice" = EXCLUDED."sellingPrice", mrp = EXCLUDED.mrp,
          "isActive" = true, "approvalStatus" = 'APPROVED', "isBuyBoxWinner" = true, "updatedAt" = EXCLUDED."updatedAt"
      `,
        [
          randomUUID(),
          row.product_id,
          marketSellerId,
          `${row.sellerSku}-${code}`,
          price,
          mrp,
          row.stockQuantity,
          row.condition,
          now,
        ],
      );
      listings++;
    }

    let skus = 0;
    for (const v of variants.rows) {
      await c.query(
        `
        INSERT INTO marketplace.product_variants (
          id, product_id, seller_id, sku, barcode, attributes, "variantName", mrp, "sellingPrice", "costPrice",
          "stockQuantity", "lowStockThreshold", "weightKg", dimensions, "imageUrls", "isActive", "sortOrder", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16, $17, $17)
        ON CONFLICT (product_id, sku) DO UPDATE SET
          "sellingPrice" = EXCLUDED."sellingPrice", mrp = EXCLUDED.mrp, seller_id = EXCLUDED.seller_id,
          "isActive" = true, "updatedAt" = EXCLUDED."updatedAt"
      `,
        [
          randomUUID(),
          v.product_id,
          marketSellerId,
          `${v.sku}-${code}`,
          v.barcode,
          JSON.stringify(v.attributes ?? {}),
          v.variantName,
          m.round(Number(v.mrp) * fx),
          m.round(Number(v.sellingPrice) * fx),
          v.costPrice == null ? null : m.round(Number(v.costPrice) * fx),
          v.stockQuantity,
          v.lowStockThreshold,
          v.weightKg,
          v.dimensions == null ? null : JSON.stringify(v.dimensions),
          Array.isArray(v.imageUrls) ? v.imageUrls.join(',') : v.imageUrls,
          v.sortOrder,
          now,
        ],
      );
      skus++;
    }

    await c.query(
      `
      UPDATE marketplace.sellers s SET "totalProducts" = (
        SELECT COUNT(*) FROM marketplace.product_listings l WHERE l.seller_id = s.id AND l."isActive" = true
      ) WHERE s.id = $1
    `,
      [marketSellerId],
    );
    console.log(`✅ ${code}: ${m.name} → ${listings} offers, ${skus} SKUs (×${fx})`);
  }

  await c.end();

  // ── 3. Caches ─────────────────────────────────────────────────────────────
  if (process.env.FLUSH_CACHE !== '0') {
    try {
      const { default: Redis } = await import('ioredis');
      const r = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
      });
      await r.connect();
      let removed = 0;
      for (const pattern of ['product:*', 'products:*', 'marketplace:*', 'search:*']) {
        let cursor = '0';
        do {
          const [next, keys] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
          cursor = next;
          if (keys.length) removed += await r.del(...keys);
        } while (cursor !== '0');
      }
      await r.quit();
      console.log(`✅ cache: ${removed} catalogue keys dropped`);
    } catch (e) {
      console.warn(
        `⚠️  cache not flushed (${e.message}) — catalogue reads may stay stale for up to a minute`,
      );
    }
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
