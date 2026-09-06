/**
 * Replace the remaining `placehold.co` tiles with real, subject-relevant photos.
 *
 * ── What these images are, precisely ──────────────────────────────────────────
 * REPRESENTATIVE PHOTOS OF THE PRODUCT TYPE, NOT THE ACTUAL SKU. A row for
 * "Sapiens: A Brief History" gets a photo of *a book*, not that book's cover.
 * This is a deliberate, explicitly-approved trade-off for a demo/dev catalogue,
 * where a storefront full of grey tiles is useless for evaluating the UI.
 *
 * It is NOT suitable for a production storefront: showing a photo that is not
 * the product misleads shoppers and can misuse brand imagery. Real per-SKU
 * photography has to be sourced before launch, and re-running this script will
 * never overwrite a real photo once one exists.
 *
 * ── Why loremflickr and not curated CDN ids ───────────────────────────────────
 * Hand-picking ~200 Unsplash photo ids is how the catalogue ended up with 10
 * dead links: an id that 404s fails silently. loremflickr resolves a KEYWORD to
 * a real photo, so relevance comes from the search term rather than from an id
 * that may rot, and `?lock=` pins one stable photo per slot (verified: same lock
 * returns a byte-identical image, different locks differ). Every generated URL
 * is still HEAD-checked before it is written.
 *
 * Keywords are mapped per SUBCATEGORY — never a parent category. An earlier
 * attempt at category-level fallback put a Puma sneaker on Adidas cricket
 * gloves; relevance has to be narrow or it is worse than nothing.
 *
 * Run:  node scripts/maintenance/marketplace-catalog/marketplace-fill-placeholder-images.js [--dry-run]
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));

const DRY_RUN = process.argv.includes('--dry-run');
const IMAGES_PER_PRODUCT = 3;
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;

/**
 * Subcategory slug → search keywords.
 *
 * Multi-word terms are comma-joined, which loremflickr treats as "all of these",
 * keeping results tight ("dog,food" not stock photos of dogs).
 */
const KEYWORDS = {
  // Books & stationery
  fiction: 'novel,book', 'non-fiction': 'book,reading', 'academic-and-textbooks': 'textbook,study',
  stationery: 'stationery,pen', 'paper-products': 'notebook,paper',
  'desk-accessories': 'desk,organiser', 'filing-and-organisation': 'files,folders',
  // Furniture
  'living-room': 'sofa,livingroom', bedroom: 'bedroom,furniture', mattresses: 'mattress,bed',
  'office-furniture': 'office,chair', lighting: 'lamp,lighting',
  // Computing
  desktops: 'desktop,computer', monitors: 'monitor,screen', printers: 'printer',
  'keyboards-and-mice': 'keyboard,mouse', 'storage-devices': 'harddrive,ssd',
  // Devices & accessories
  drones: 'drone,quadcopter', 'gaming-consoles': 'gaming,console',
  smartwatches: 'smartwatch,wearable', 'fitness-devices': 'fitnesstracker,smartband',
  'cases-and-covers': 'phonecase', 'screen-protectors': 'screenprotector,phone',
  // Bags & travel
  backpacks: 'backpack', handbags: 'handbag,purse', luggage: 'suitcase,luggage',
  'laptop-bags': 'laptopbag,messenger',
  // Fashion & accessories
  'mens-casual': 'menswear,shirt', 'sports-shoes': 'sneakers,shoes',
  'sandals-and-slippers': 'sandals,slippers', sunglasses: 'sunglasses',
  'mens-watches': 'wristwatch,watch',
  // Beauty & health
  makeup: 'makeup,cosmetics', fragrances: 'perfume,fragrance',
  'personal-care': 'skincare,toiletries', 'bathing-and-skincare': 'soap,skincare',
  ayurvedic: 'herbs,ayurveda', 'medical-devices': 'medical,device',
  'household-personal-care': 'cleaning,household',
  // Grocery
  'breakfast-and-cereals': 'cereal,breakfast', 'cooking-essentials': 'cooking,oil',
  'dry-fruits-and-nuts': 'nuts,driedfruit', 'snacks-and-beverages': 'snacks,drinks',
  // Baby
  'baby-food': 'babyfood', 'baby-gear': 'stroller,baby',
  diapers: 'diapers,baby', 'diapers-and-wipes': 'babywipes,diapers',
  'feeding-bottles': 'babybottle,feeding', 'educational-toys': 'toys,children',
  // Pets
  'dog-food': 'dog,food', 'cat-food': 'cat,food',
  'collars-and-leashes': 'dog,collar', 'pet-toys': 'pet,toy',
  // Sports & auto
  cricket: 'cricket,bat', helmets: 'helmet,motorcycle',
  'bike-accessories': 'bicycle,accessory', 'car-accessories': 'car,interior',
  'car-care': 'carwash,polish',
  // Remaining subcategories surfaced by the first dry run.
  'gym-equipment': 'gym,dumbbell', 'toys-and-games': 'toys,game',
  'vitamins-and-supplements': 'vitamins,supplements', 'winter-wear': 'winterjacket,coat',
  'womens-flats': 'flats,womensshoes', 'womens-watches': 'womenswatch,wristwatch',
  'writing-instruments': 'pen,fountainpen',
};

const imageUrl = (keyword, lock, size = 600) =>
  `https://loremflickr.com/${size}/${size}/${encodeURIComponent(keyword)}?lock=${lock}`;

async function alive(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-256' }, redirect: 'follow', signal: ctrl.signal });
    return res.ok && (res.headers.get('content-type') || '').startsWith('image/');
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
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
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

  // Only products with NO real photo at all — never overwrite real imagery.
  const { rows: products } = await client.query(`
    SELECT p.id, p.slug, sub.slug AS subcategory
    FROM marketplace.products p
    JOIN marketplace.categories sub ON sub.id = p.subcategory_id
    WHERE NOT EXISTS (
      SELECT 1 FROM marketplace.product_images i
      WHERE i.product_id = p.id AND i.url !~* 'placehold|placeholder|dummyimage'
    )
    ORDER BY p.slug
  `);

  const unmapped = new Set();
  const jobs = [];
  products.forEach((p, pi) => {
    const keyword = KEYWORDS[p.subcategory];
    if (!keyword) { unmapped.add(p.subcategory); return; }
    for (let n = 0; n < IMAGES_PER_PRODUCT; n++) {
      // Lock is derived from position so re-runs regenerate identical URLs.
      jobs.push({ product: p, url: imageUrl(keyword, pi * 10 + n + 1), slot: n });
    }
  });

  console.log(`${products.length} products need photos; ${jobs.length} URLs to verify…`);
  const ok = await pool(jobs, (j) => alive(j.url), CONCURRENCY);
  const good = jobs.filter((_, i) => ok[i]);
  console.log(`  ${good.length}/${jobs.length} verified reachable\n`);

  // Group verified URLs back per product.
  const byProduct = new Map();
  for (const j of good) {
    const list = byProduct.get(j.product.id) ?? [];
    list.push(j.url);
    byProduct.set(j.product.id, list);
  }

  let filled = 0;
  let productsFilled = 0;
  for (const [productId, urls] of byProduct) {
    if (urls.length === 0) continue;
    if (!DRY_RUN) {
      // Drop the placeholder rows, then insert verified photos in their place.
      await client.query('DELETE FROM marketplace.product_images WHERE product_id = $1', [productId]);
      for (let i = 0; i < urls.length; i++) {
        await client.query(
          `INSERT INTO marketplace.product_images (product_id, url, "isPrimary", "sortOrder")
           VALUES ($1, $2, $3, $4)`,
          [productId, urls[i], i === 0, i],
        );
      }
    }
    filled += urls.length;
    productsFilled++;
  }

  console.log('── Fill summary ─────────────────────────────');
  console.log(`  products given real photos : ${productsFilled}`);
  console.log(`  images written             : ${filled}`);
  console.log(`  products skipped (no keyword mapping): ${products.length - productsFilled}`);
  if (unmapped.size) {
    console.log(`\n  Subcategories with no keyword mapping (add them above):`);
    for (const s of [...unmapped].sort()) console.log(`    · ${s}`);
  }
  if (DRY_RUN) console.log('\n(dry run — nothing written)');

  await client.end();
})().catch((err) => { console.error('❌', err.message); process.exit(1); });
