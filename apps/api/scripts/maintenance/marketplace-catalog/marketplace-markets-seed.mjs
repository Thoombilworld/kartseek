#!/usr/bin/env node
/* global process, console, fetch, AbortController, setTimeout, clearTimeout */
/**
 * Marketplace per-market seed.
 *
 * The catalogue seed creates one seller — the Qatari "KartSeek Official
 * Store" — with one listing per product, so every other market the platform
 * trades in (ACTIVE_REGIONS) was an empty store: the storefront scopes reads
 * to sellers registered in the market being browsed.
 *
 * This script makes each active market a working store:
 *
 *   0. approves the official store's own offers that were left PENDING (64 of
 *      179 products had an offer nobody had approved, so they showed a list
 *      price and could not be bought anywhere);
 *   1. rebases the base market's SKUs to riyals (they were seeded in rupees
 *      against riyal listings) and gives every Qatari offer its list price;
 *   2. per market: one VERIFIED "KartSeek Official Store <Country>", one live
 *      offer per product priced in the market's currency (`FX`, live from
 *      open.er-api.com, overridable) with the market's own list price, and the
 *      seller's own copies of every SKU;
 *   3. coupons: one global welcome code plus one flat-amount code per market
 *      (`region_code`), so the coupon page and checkout have something real;
 *   4. a live flash-deal window per market with approved nominations at 15 %
 *      off that market's offer;
 *   5. hero and campaign banners per market (Redis, where the home feed reads
 *      them);
 *   6. drops the catalogue caches so the next read sees all of it.
 *
 * Idempotent: sellers upsert on storeSlug, listings on (product_id, seller_id),
 * variants on (product_id, sku), coupons on code, deals on a deterministic id.
 *
 * Usage (from apps/api, with MARKETPLACE_DB_* and REDIS_* in .env):
 *   node scripts/maintenance/marketplace-catalog/marketplace-markets-seed.mjs
 * Env: MARKETS=IN,AE limits the markets; FX_IN=26.1 (etc.) pins a rate;
 *      FLUSH_CACHE=0 keeps Redis caches; SKIP_PROMOS=1 skips steps 3–5.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
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

/** Rupees → riyals, used once to correct variants that were seeded in rupees. */
const INR_PER_QAR = 22.9;

/**
 * Riyals → the market's currency. Live from the ECB-backed open.er-api.com
 * feed, pinned per market with FX_<CC>, and falling back to the USD pegs
 * (QAR 3.64, AED 3.6725, SAR 3.75) plus a recent INR figure when offline.
 */
const FX_FALLBACK = { QA: 1, IN: 25.96, AE: 1.0089, SA: 1.0302 };

async function loadFx(codes) {
  const fx = { QA: 1 };
  let live = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://open.er-api.com/v6/latest/QAR', { signal: ctrl.signal });
    clearTimeout(t);
    const json = await res.json();
    if (json?.result === 'success' && json.rates) live = json;
  } catch {
    live = null;
  }
  const CUR = { IN: 'INR', AE: 'AED', SA: 'SAR' };
  for (const code of codes) {
    const pinned = process.env[`FX_${code}`];
    if (pinned && Number(pinned) > 0) {
      fx[code] = Number(pinned);
      fx[`${code}_source`] = 'env';
      continue;
    }
    const rate = live?.rates?.[CUR[code]];
    if (rate) {
      fx[code] = Number(rate);
      fx[`${code}_source`] = `live ${live.time_last_update_utc}`;
      continue;
    }
    fx[code] = FX_FALLBACK[code];
    fx[`${code}_source`] = 'fallback';
  }
  return fx;
}

const MARKETS = {
  IN: {
    slug: 'kartseek-official-in',
    name: 'KartSeek Official Store India',
    country: 'India',
    phone: '+91 80 4000 1234',
    email: 'official.in@kartseek.com',
    taxId: 'GSTIN-29AAACK1234A1Z5',
    currency: '₹',
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
    flat: { code: 'SAVE500IN', value: 500, minOrder: 3000 },
    freeAbove: '₹2,000',
  },
  AE: {
    slug: 'kartseek-official-ae',
    name: 'KartSeek Official Store UAE',
    country: 'the UAE',
    phone: '+971 4 400 1234',
    email: 'official.ae@kartseek.com',
    taxId: 'TRN-100234567800003',
    currency: 'AED',
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
    flat: { code: 'SAVE50AE', value: 50, minOrder: 300 },
    freeAbove: 'AED 200',
  },
  SA: {
    slug: 'kartseek-official-sa',
    name: 'KartSeek Official Store KSA',
    country: 'Saudi Arabia',
    phone: '+966 11 400 1234',
    email: 'official.sa@kartseek.com',
    taxId: 'VAT-300012345600003',
    currency: 'SAR',
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
    flat: { code: 'SAVE50SA', value: 50, minOrder: 300 },
    freeAbove: 'SAR 200',
  },
};
/** The base market's promo copy; its seller and offers come from the catalogue seed. */
const QA_MARKET = {
  country: 'Qatar',
  currency: 'QR',
  flat: { code: 'SAVE50QA', value: 50, minOrder: 300 },
  freeAbove: 'QR 200',
};

const wanted = (process.env.MARKETS || Object.keys(MARKETS).join(','))
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter((c) => MARKETS[c]);

/** A stable uuid for a seeded row, so re-runs update instead of duplicating. */
function stableId(seed) {
  const h = createHash('md5').update(`kartseek-market-seed:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function main() {
  const c = new Client(DB);
  await c.connect();
  const now = new Date();
  const nowIso = now.toISOString();
  const fx = await loadFx(wanted);
  for (const code of wanted) console.log(`fx ${code}: ×${fx[code]} (${fx[`${code}_source`]})`);

  const official = await c.query(
    `SELECT id FROM marketplace.sellers WHERE "storeSlug" = 'kartseek-official'`,
  );
  if (!official.rows.length)
    throw new Error('Qatari official store not found — run marketplace-seed.js first');
  const qaSellerId = official.rows[0].id;

  // ── 0. The official store's own offers must be live ──────────────────────
  // 64 products sat with an official offer nobody had approved: they appeared
  // in the catalogue (the product itself was approved) but could not be
  // priced, carted or copied to any other market.
  const approved = await c.query(
    `
    UPDATE marketplace.product_listings l
       SET "approvalStatus" = 'APPROVED', "isActive" = true, "isBuyBoxWinner" = true,
           "rejectionReason" = NULL, "updatedAt" = $2
     WHERE l.seller_id = $1 AND l."approvalStatus" <> 'APPROVED'
  `,
    [qaSellerId, nowIso],
  );
  console.log(`✅ QA official offers approved: ${approved.rowCount}`);

  // ── 1. Correct the base market's own data once ───────────────────────────
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
    [INR_PER_QAR, qaSellerId, nowIso],
  );
  console.log(`✅ QA variants rebased to riyals: ${fixed.rowCount}`);
  const qaMrp = await c.query(
    `
    UPDATE marketplace.product_listings l SET mrp = p.mrp, "updatedAt" = $2
      FROM marketplace.products p
     WHERE p.id = l.product_id AND l.seller_id = $1 AND l.mrp IS NULL
  `,
    [qaSellerId, nowIso],
  );
  console.log(`✅ QA listings given a list price: ${qaMrp.rowCount}`);

  const base = await c.query(
    `
    SELECT p.id AS product_id, p.name, p.mrp AS product_mrp,
           l."sellerSku", l."sellingPrice", l."stockQuantity", l.condition
      FROM marketplace.products p
      JOIN marketplace.product_listings l ON l.product_id = p.id AND l.seller_id = $1
     WHERE l."isActive" = true AND l."approvalStatus" = 'APPROVED'
       AND p.is_active = true AND p.approval_status = 'APPROVED'
     ORDER BY p.name
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
  const marketSellers = { QA: qaSellerId };
  for (const code of wanted) {
    const m = MARKETS[code];
    const rate = fx[code];
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
        randomUUID(),
        m.name,
        m.slug,
        m.email,
        m.phone,
        `Official KartSeek marketplace store for ${m.address.country} — guaranteed quality products, priced and delivered locally`,
        m.taxId,
        JSON.stringify(m.address),
        code,
        nowIso,
      ],
    );
    const marketSellerId = seller.rows[0].id;
    marketSellers[code] = marketSellerId;

    let listings = 0;
    for (const row of base.rows) {
      const price = m.round(Number(row.sellingPrice) * rate);
      const mrp = m.round(Number(row.product_mrp) * rate);
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
          nowIso,
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
          m.round(Number(v.mrp) * rate),
          m.round(Number(v.sellingPrice) * rate),
          v.costPrice == null ? null : m.round(Number(v.costPrice) * rate),
          v.stockQuantity,
          v.lowStockThreshold,
          v.weightKg,
          v.dimensions == null ? null : JSON.stringify(v.dimensions),
          Array.isArray(v.imageUrls) ? v.imageUrls.join(',') : v.imageUrls,
          v.sortOrder,
          nowIso,
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
    console.log(`✅ ${code}: ${m.name} → ${listings} offers, ${skus} SKUs (×${rate})`);
  }

  const promoMarkets = ['QA', ...wanted].map((code) => [
    code,
    code === 'QA' ? QA_MARKET : MARKETS[code],
  ]);

  if (process.env.SKIP_PROMOS !== '1') {
    // ── 3. Coupons ───────────────────────────────────────────────────────────
    const validFrom = new Date(now.getTime() - 86400000).toISOString();
    const validUntil = new Date(now.getTime() + 90 * 86400000).toISOString();
    const upsertCoupon = (row) =>
      c.query(
        `
      INSERT INTO marketplace.coupons (
        id, code, title, description, "discountType", "discountValue", "maxDiscount", "minOrderValue",
        "usageLimit", "usageLimitPerUser", "usedCount", "validFrom", "validUntil", "isActive", "autoApply",
        "firstOrderOnly", region_code, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, 0, $10, $11, true, false, $12, $13, $14, $14)
      ON CONFLICT (code) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, "discountType" = EXCLUDED."discountType",
        "discountValue" = EXCLUDED."discountValue", "maxDiscount" = EXCLUDED."maxDiscount",
        "minOrderValue" = EXCLUDED."minOrderValue", "validFrom" = EXCLUDED."validFrom", "validUntil" = EXCLUDED."validUntil",
        "isActive" = true, region_code = EXCLUDED.region_code, "updatedAt" = EXCLUDED."updatedAt"
    `,
        [
          stableId(`coupon:${row.code}`),
          row.code,
          row.title,
          row.description,
          row.type,
          row.value,
          row.max ?? null,
          row.min ?? 0,
          row.perUser,
          validFrom,
          validUntil,
          row.firstOrderOnly ?? false,
          row.region ?? null,
          nowIso,
        ],
      );

    await upsertCoupon({
      code: 'WELCOME10',
      title: '10% off your first order',
      type: 'PERCENTAGE',
      value: 10,
      perUser: 1,
      firstOrderOnly: true,
      description: 'New to KARTSEEK Marketplace? Take 10% off your first order, in any market.',
    });
    for (const [code, m] of promoMarkets) {
      await upsertCoupon({
        code: m.flat.code,
        title: `${m.currency} ${m.flat.value} off orders over ${m.currency} ${m.flat.minOrder.toLocaleString('en')}`,
        type: 'FLAT',
        value: m.flat.value,
        min: m.flat.minOrder,
        perUser: 3,
        region: code,
        description: `A flat ${m.currency} ${m.flat.value} off any marketplace order over ${m.currency} ${m.flat.minOrder.toLocaleString('en')} in ${m.country}.`,
      });
    }
    console.log(`✅ coupons: WELCOME10 + ${promoMarkets.map(([, m]) => m.flat.code).join(', ')}`);

    // ── 4. Flash deals ───────────────────────────────────────────────────────
    for (const [code, m] of promoMarkets) {
      const sellerId = marketSellers[code];
      const dealId = stableId(`flash-deal:${code}`);
      const windowStart = new Date(now.getTime() - 3600000).toISOString();
      const windowEnd = new Date(now.getTime() + 7 * 86400000).toISOString();
      await c.query(
        `
        INSERT INTO marketplace.flash_deals (
          id, name, description, status, window_start, window_end, min_discount_percent, stock_limit, units_sold,
          priority, region_code, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, 'ACTIVE', $4, $5, 10, 0, 0, 1, $6, 'seed', $7, $7)
        ON CONFLICT (id) DO UPDATE SET
          status = 'ACTIVE', window_start = EXCLUDED.window_start, window_end = EXCLUDED.window_end,
          region_code = EXCLUDED.region_code, updated_at = EXCLUDED.updated_at
      `,
        [
          dealId,
          `This week's flash deals — ${m.country}`,
          `Seven days of 15% off selected products from the official store in ${m.country}.`,
          windowStart,
          windowEnd,
          code,
          nowIso,
        ],
      );
      await c.query(`DELETE FROM marketplace.flash_deal_nominations WHERE deal_id = $1`, [dealId]);
      const offers = await c.query(
        `
        SELECT l.product_id, l."sellingPrice"
          FROM marketplace.product_listings l
          JOIN marketplace.products p ON p.id = l.product_id
         WHERE l.seller_id = $1 AND l."isActive" = true AND l."approvalStatus" = 'APPROVED'
           AND p.is_active = true AND p.approval_status = 'APPROVED'
           AND NOT EXISTS (SELECT 1 FROM marketplace.product_variants v WHERE v.product_id = p.id AND v."isActive" = true)
         ORDER BY p.name LIMIT 8
      `,
        [sellerId],
      );
      const roundTo = code === 'IN' ? (v) => Math.round(v) : (v) => Math.round(v * 100) / 100;
      for (const o of offers.rows) {
        await c.query(
          `
          INSERT INTO marketplace.flash_deal_nominations (
            id, deal_id, seller_id, product_id, deal_price, proposed_discount_percent, stock_allocated, stock_sold,
            status, seller_note, decision_reason, decided_at, decided_by, submitted_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 15, 20, 0, 'APPROVED', NULL, 'Seeded market launch deal', $6, 'seed', $6, $6)
        `,
          [
            randomUUID(),
            dealId,
            sellerId,
            o.product_id,
            roundTo(Number(o.sellingPrice) * 0.85),
            nowIso,
          ],
        );
      }
      console.log(
        `✅ ${code}: flash deal with ${offers.rows.length} approved nominations (ends ${windowEnd.slice(0, 10)})`,
      );
    }
  }

  await c.end();

  // ── 5. Banners (Redis, where the home feed reads them) ───────────────────
  const Redis = await import('ioredis').then((m) => m.default).catch(() => null);
  const redis = Redis
    ? new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
      })
    : null;
  try {
    if (!redis) throw new Error('ioredis not available');
    await redis.connect();
    if (process.env.SKIP_PROMOS !== '1') {
      const merge = async (key, entries) => {
        const existing = JSON.parse((await redis.get(key)) || '[]');
        const byId = new Map(existing.map((b) => [b.id, b]));
        for (const e of entries) byId.set(e.id, { ...(byId.get(e.id) || {}), ...e });
        await redis.set(key, JSON.stringify([...byId.values()]));
      };
      const hero = [];
      const campaign = [];
      for (const [code, m] of promoMarkets) {
        hero.push(
          {
            id: `hero-${code}-local`,
            tag: `KARTSEEK MARKETPLACE · ${m.country.toUpperCase()}`,
            headline: `Shop local.\nDelivered across ${m.country}`,
            subheadline: `Free delivery on orders over ${m.freeAbove}`,
            cta: 'Browse categories',
            ctaHref: '/category-list',
            gradient: 'from-blue-700 via-blue-800 to-slate-900',
            regions: [code],
            isActive: true,
          },
          {
            id: `hero-${code}-flash`,
            tag: 'FLASH DEALS',
            headline: 'This week only:\n15% off selected products',
            subheadline: 'Approved deals from the official store, while stock lasts',
            cta: 'See the deals',
            ctaHref: '/flash-deals',
            gradient: 'from-rose-600 via-red-600 to-orange-500',
            regions: [code],
            isActive: true,
          },
        );
        campaign.push({
          id: `campaign-${code}-welcome`,
          tag: 'NEW SHOPPER OFFER',
          headline: '10% off your first order',
          subheadline: `Use code WELCOME10 at checkout · ${m.flat.code} takes ${m.currency} ${m.flat.value} off orders over ${m.currency} ${m.flat.minOrder.toLocaleString('en')}`,
          cta: 'View coupons',
          ctaHref: '/coupons',
          gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
          regions: [code],
          isActive: true,
        });
      }
      await merge('marketplace:hero-banners', hero);
      await merge('marketplace:campaign-banners', campaign);
      console.log(
        `✅ banners: ${hero.length} hero + ${campaign.length} campaign across ${promoMarkets.map(([c]) => c).join('/')}`,
      );
    }

    // ── 6. Caches (banners excluded — they are content, not cache) ──────────
    if (process.env.FLUSH_CACHE !== '0') {
      let removed = 0;
      for (const pattern of ['product:*', 'products:*', 'marketplace:*', 'search:*']) {
        let cursor = '0';
        do {
          const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
          cursor = next;
          const cacheKeys = keys.filter((k) => !k.endsWith('-banners'));
          if (cacheKeys.length) removed += await redis.del(...cacheKeys);
        } while (cursor !== '0');
      }
      console.log(`✅ cache: ${removed} catalogue keys dropped`);
    }
    await redis.quit();
  } catch (e) {
    console.warn(
      `⚠️  Redis step skipped (${e.message}) — banners not written and catalogue reads may stay stale for up to a minute`,
    );
    try {
      await redis?.quit();
    } catch {
      /* already closed */
    }
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
