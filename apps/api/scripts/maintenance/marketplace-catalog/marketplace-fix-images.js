/**
 * Repair catalogue imagery: dead URLs, placeholders, and single-image products.
 *
 * Three problems, one cause — the catalogue was seeded faster than photography
 * was sourced:
 *   • 10 real URLs have rotted to 404 (3 of them a product's primary image)
 *   • 138 of 178 products carry only generated `placehold.co` tiles
 *   • 138 products have a single image, so the swipe gallery has nothing to swipe
 *
 * Every replacement URL is drawn from the photos ALREADY in this catalogue and
 * re-verified live before it is written. Inventing CDN ids would just seed the
 * next generation of 404s — which is exactly how the current dead links got
 * here.
 *
 * Donors come from the SAME SUBCATEGORY only. An earlier version fell back to
 * the parent category and put a Puma sneaker on "Adidas Cricket Batting Gloves"
 * — wrong product type, competitor's logo. A product left showing a grey tile is
 * honest about having no photo; one showing a confident picture of something
 * else is not. So this repairs fewer products on purpose, and the remainder are
 * reported rather than papered over.
 *
 * Idempotent, and safe to re-run: it only ever replaces placeholders and URLs
 * that fail verification, never a working real photo.
 *
 * Run:  node scripts/maintenance/marketplace-catalog/marketplace-fix-images.js [--dry-run]
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_IMAGES = 3;      // enough for the gallery to be worth swiping
const CONCURRENCY = 12;
const TIMEOUT_MS = 15000;

const isPlaceholder = (url) => /placehold\.co|placeholder|via\.placeholder|dummyimage/i.test(url);

async function alive(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, fn, size) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) || 1 }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'kartseek123',
    database: process.env.DB_NAME || 'kartseek_db',
  });
  await client.connect();

  const { rows: images } = await client.query(`
    SELECT i.id, i.url, i."isPrimary", i."sortOrder", i.product_id,
           p.slug AS product, cat.slug AS category, sub.slug AS subcategory
    FROM marketplace.product_images i
    JOIN marketplace.products p ON p.id = i.product_id
    LEFT JOIN marketplace.categories cat ON cat.id = p.category_id
    LEFT JOIN marketplace.categories sub ON sub.id = p.subcategory_id
  `);

  // ── 1. Verify every real URL once, so donors are known-good ────────────────
  const realUrls = [...new Set(images.filter((i) => !isPlaceholder(i.url)).map((i) => i.url))];
  console.log(`Verifying ${realUrls.length} distinct real URLs…`);
  const ok = await pool(realUrls, alive, CONCURRENCY);
  const working = new Set(realUrls.filter((_, i) => ok[i]));
  console.log(`  ${working.size} working, ${realUrls.length - working.size} dead\n`);

  // ── 2. Build donor pools from working photos, keyed by subcategory ─────────
  const bySub = new Map();
  for (const img of images) {
    if (!working.has(img.url) || !img.subcategory) continue;
    const set = bySub.get(img.subcategory) ?? new Set();
    set.add(img.url);
    bySub.set(img.subcategory, set);
  }

  /**
   * Donor URLs for a product — SAME SUBCATEGORY ONLY.
   *
   * This deliberately does NOT fall back to the parent category. It did, and
   * "category-accurate" proved far too loose: a Sports & Fitness donor put a
   * Puma sneaker on "Adidas Cricket Batting Gloves", wrong product type and a
   * competitor's logo. A grey placeholder is honest about having no photo; a
   * confident photo of the wrong product is not. Fewer repairs, no lies.
   */
  const donorsFor = (p) => [...(bySub.get(p.subcategory) ?? [])];

  // ── 3. Group current images per product ────────────────────────────────────
  const byProduct = new Map();
  for (const img of images) {
    const list = byProduct.get(img.product_id) ?? [];
    list.push(img);
    byProduct.set(img.product_id, list);
  }

  let replaced = 0;
  let added = 0;
  let untouched = 0;
  const stillPlaceholder = [];

  for (const [productId, imgs] of byProduct) {
    const meta = imgs[0];
    const donors = donorsFor(meta).filter(Boolean);

    // Keep whatever already works; everything else is a candidate for repair.
    const keep = imgs.filter((i) => working.has(i.url));
    const broken = imgs.filter((i) => !working.has(i.url));

    if (donors.length === 0) {
      if (keep.length === 0) stillPlaceholder.push(meta.product);
      untouched += broken.length;
      continue;
    }

    // Donors not already used by this product, so a gallery isn't the same shot
    // three times over.
    const used = new Set(keep.map((i) => i.url));
    const fresh = donors.filter((u) => !used.has(u));

    // Replace broken/placeholder rows in place — preserves sortOrder & primary.
    for (const img of broken) {
      const url = fresh.shift();
      if (!url) break;
      used.add(url);
      if (!DRY_RUN) {
        await client.query('UPDATE marketplace.product_images SET url = $1 WHERE id = $2', [url, img.id]);
      }
      replaced++;
    }

    // Top up to TARGET_IMAGES so the gallery has something to swipe through.
    let sortOrder = Math.max(0, ...imgs.map((i) => +i.sortOrder || 0)) + 1;
    while (used.size < TARGET_IMAGES && fresh.length) {
      const url = fresh.shift();
      used.add(url);
      if (!DRY_RUN) {
        await client.query(
          `INSERT INTO marketplace.product_images (product_id, url, "isPrimary", "sortOrder")
           VALUES ($1, $2, false, $3)`,
          [productId, url, sortOrder],
        );
      }
      sortOrder++;
      added++;
    }

    // A product whose primary slot was repaired must still HAVE a primary.
    if (!DRY_RUN && !imgs.some((i) => i.isPrimary)) {
      await client.query(
        `UPDATE marketplace.product_images SET "isPrimary" = true
         WHERE id = (SELECT id FROM marketplace.product_images
                     WHERE product_id = $1 ORDER BY "sortOrder" LIMIT 1)`,
        [productId],
      );
    }
  }

  console.log('── Repair summary ───────────────────────────');
  console.log(`  images replaced (dead/placeholder): ${replaced}`);
  console.log(`  images added (gallery top-up)     : ${added}`);
  console.log(`  left as-is (no donor available)   : ${untouched}`);
  console.log(`  products still without a real photo: ${stillPlaceholder.length}`);
  if (stillPlaceholder.length) {
    console.log(`\n  These categories have no working photo to donate — they need`);
    console.log(`  real sourcing, which this script deliberately will not fake:`);
    for (const s of stillPlaceholder.slice(0, 15)) console.log(`    · ${s}`);
    if (stillPlaceholder.length > 15) console.log(`    … and ${stillPlaceholder.length - 15} more`);
  }
  if (DRY_RUN) console.log('\n(dry run — nothing written)');

  await client.end();
})().catch((err) => { console.error('❌', err.message); process.exit(1); });
