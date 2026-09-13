/**
 * Undo cross-subcategory image donations.
 *
 * `marketplace-fix-images.js` fell back to the PARENT CATEGORY when a
 * subcategory had no working photo to donate. "Category-accurate" turned out to
 * be far too loose a bar: it put a Puma sneaker on "Adidas Cricket Batting
 * Gloves" — wrong product type AND a competitor's logo. A grey placeholder is
 * honest about having no photo; a confident photo of the wrong thing is not, so
 * this is a regression rather than a partial improvement.
 *
 * A photo shared across two different subcategories is exactly the signature of
 * that bad fallback: the original curated seed assigned each URL to one product
 * type. Those rows are reverted to placeholders, keeping the copy that sits in
 * the subcategory where the URL is most common (its true home).
 *
 * Run:  node scripts/maintenance/marketplace-catalog/marketplace-revert-crosscategory-images.js [--dry-run]
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));

const { requireDbPassword } = require('../../lib/db-password');
const DRY_RUN = process.argv.includes('--dry-run');
const placeholderFor = (brand) =>
  `https://placehold.co/400x400/e2e8f0/475569?text=${encodeURIComponent((brand || 'Product').replace(/[^A-Za-z0-9]/g, ''))}`;

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: requireDbPassword(),
    database: process.env.DB_NAME || 'kartseek_db',
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT i.id, i.url, i."isPrimary", i.product_id,
           p.slug AS product, p.subcategory_id, b.name AS brand
    FROM marketplace.product_images i
    JOIN marketplace.products p ON p.id = i.product_id
    LEFT JOIN marketplace.brands b ON b.id = p.brand_id
    WHERE i.url !~* 'placehold'
  `);

  // Group by URL; a URL living in >1 subcategory was donated across a boundary.
  const byUrl = new Map();
  for (const r of rows) {
    const list = byUrl.get(r.url) ?? [];
    list.push(r);
    byUrl.set(r.url, list);
  }

  let reverted = 0;
  let deleted = 0;
  const touched = new Set();

  for (const [url, uses] of byUrl) {
    const subs = new Set(uses.map((u) => u.subcategory_id));
    if (subs.size <= 1) continue;

    // The subcategory using this URL most is where it belongs; strip the rest.
    const tally = new Map();
    for (const u of uses) tally.set(u.subcategory_id, (tally.get(u.subcategory_id) || 0) + 1);
    const home = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];

    for (const u of uses) {
      if (u.subcategory_id === home) continue;
      touched.add(u.product);
      if (u.isPrimary) {
        // The card and gallery both need a primary, so swap it for an honest
        // placeholder rather than removing the row.
        if (!DRY_RUN) {
          await client.query('UPDATE marketplace.product_images SET url = $1 WHERE id = $2', [
            placeholderFor(u.brand),
            u.id,
          ]);
        }
        reverted++;
      } else {
        // A borrowed extra image adds nothing once it is not this product's —
        // dropping it returns the gallery to its true image count.
        if (!DRY_RUN) {
          await client.query('DELETE FROM marketplace.product_images WHERE id = $1', [u.id]);
        }
        deleted++;
      }
    }
  }

  // Guarantee every product still has exactly one primary.
  if (!DRY_RUN) {
    await client.query(`
      UPDATE marketplace.product_images SET "isPrimary" = true
      WHERE id IN (
        SELECT DISTINCT ON (product_id) id FROM marketplace.product_images
        WHERE product_id NOT IN (
          SELECT product_id FROM marketplace.product_images WHERE "isPrimary" = true
        )
        ORDER BY product_id, "sortOrder"
      )`);
  }

  console.log('── Cross-category revert ────────────────────');
  console.log(`  primary images returned to placeholder: ${reverted}`);
  console.log(`  borrowed extra images removed         : ${deleted}`);
  console.log(`  products corrected                    : ${touched.size}`);
  if (DRY_RUN) console.log('\n(dry run — nothing written)');

  await client.end();
})().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
