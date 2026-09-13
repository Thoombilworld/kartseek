/**
 * Audit catalogue image health.
 *
 * Reports, per product image: whether the URL is a real photo or a generated
 * placeholder, and whether it actually resolves. A dead URL and a placeholder
 * look identical in the DB but are different problems — one is rot, the other is
 * missing content — so they are counted separately.
 *
 * Read-only. Run:  node scripts/maintenance/marketplace-catalog/marketplace-audit-images.js
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));

const CONCURRENCY = 12;
const TIMEOUT_MS = 15000;

const isPlaceholder = (url) => /placehold\.co|placeholder|via\.placeholder|dummyimage/i.test(url);

async function check(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // Some CDNs reject HEAD; fall back to a ranged GET rather than trusting a 405.
    let res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-64' },
        signal: ctrl.signal,
      });
    }
    return res.status;
  } catch (err) {
    return err.name === 'AbortError' ? 'timeout' : 'error';
  } finally {
    clearTimeout(timer);
  }
}

/** Run `fn` over `items` with a fixed number of workers in flight. */
async function pool(items, fn, size) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
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

  const { rows } = await client.query(`
    SELECT i.id, i.url, i."isPrimary", p.slug AS product, c.slug AS category
    FROM marketplace.product_images i
    JOIN marketplace.products p ON p.id = i.product_id
    LEFT JOIN marketplace.categories c ON c.id = p.category_id
    ORDER BY p.slug, i."sortOrder"
  `);

  const real = rows.filter((r) => !isPlaceholder(r.url));
  console.log(
    `Auditing ${rows.length} images (${real.length} real URLs, ${rows.length - real.length} placeholders)…\n`,
  );

  const statuses = await pool(real, (r) => check(r.url), CONCURRENCY);
  const dead = real.filter((_, i) => statuses[i] !== 200);

  // Per-product coverage: how many products are left with nothing usable.
  const { rows: coverage } = await client.query(`
    SELECT p.slug, COUNT(i.id) AS images,
           COUNT(i.id) FILTER (WHERE i.url !~* 'placehold|placeholder|dummyimage') AS real_images
    FROM marketplace.products p
    LEFT JOIN marketplace.product_images i ON i.product_id = p.id
    GROUP BY p.slug
  `);

  const noImages = coverage.filter((c) => +c.images === 0);
  const onlyPlaceholders = coverage.filter((c) => +c.images > 0 && +c.real_images === 0);
  const single = coverage.filter((c) => +c.images === 1);

  console.log('── Image health ─────────────────────────────');
  console.log(`  products total          : ${coverage.length}`);
  console.log(`  with no images at all   : ${noImages.length}`);
  console.log(`  only placeholder images : ${onlyPlaceholders.length}`);
  console.log(`  exactly one image       : ${single.length}`);
  console.log(`  dead real URLs          : ${dead.length} / ${real.length}`);

  if (dead.length) {
    console.log('\n── Dead URLs ────────────────────────────────');
    for (const d of dead.slice(0, 40)) {
      const i = real.indexOf(d);
      console.log(`  [${statuses[i]}] ${d.product}${d.isPrimary ? ' (primary)' : ''}`);
      console.log(`         ${d.url.slice(0, 100)}`);
    }
    if (dead.length > 40) console.log(`  … and ${dead.length - 40} more`);
  }

  await client.end();
})().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
