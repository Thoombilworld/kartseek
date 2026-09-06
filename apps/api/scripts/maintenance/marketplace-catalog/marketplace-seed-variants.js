/**
 * Seed SKU-level product variants.
 *
 * `product_variants` was created but never populated, so the storefront's colour
 * and size pickers had nothing to render — the selector UI existed and simply
 * never received data.
 *
 * Variants are applied by SUBCATEGORY, not to every product: a size picker on a
 * bag of dog food or a 1kg tin of ghee is noise. Each row is a real SKU with its
 * own price and stock, which is what the table is for — the storefront derives
 * the pickable axes from these rows rather than storing a second copy.
 *
 * Idempotent: re-running updates existing SKUs instead of duplicating them.
 *
 * Run:  node scripts/maintenance/marketplace-catalog/marketplace-seed-variants.js
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));

// Axis definitions per subcategory slug. `priceDelta` is added to the product's
// own selling price, so a larger size legitimately costs more.
const APPAREL_SIZES = { name: 'Size', options: [
  { value: 'S', priceDelta: 0 }, { value: 'M', priceDelta: 0 },
  { value: 'L', priceDelta: 0 }, { value: 'XL', priceDelta: 200 },
] };

const FOOTWEAR_SIZES = { name: 'Size (UK)', options: [
  { value: '7', priceDelta: 0 }, { value: '8', priceDelta: 0 },
  { value: '9', priceDelta: 0 }, { value: '10', priceDelta: 0 },
] };

const DEVICE_COLOURS = { name: 'Colour', options: [
  { value: 'Midnight Black', priceDelta: 0 },
  { value: 'Silver', priceDelta: 0 },
  { value: 'Blue', priceDelta: 1000 },
] };

const SIMPLE_COLOURS = { name: 'Colour', options: [
  { value: 'Black', priceDelta: 0 },
  { value: 'Navy', priceDelta: 0 },
  { value: 'Grey', priceDelta: 0 },
] };

const STORAGE = { name: 'Storage', options: [
  { value: '128GB', priceDelta: 0 },
  { value: '256GB', priceDelta: 10000 },
  { value: '512GB', priceDelta: 25000 },
] };

// subcategory slug → the axes that product type actually varies on.
const BY_SUBCATEGORY = {
  // Fashion
  'mens-clothing': [APPAREL_SIZES, SIMPLE_COLOURS],
  'womens-clothing': [APPAREL_SIZES, SIMPLE_COLOURS],
  'kids-wear': [APPAREL_SIZES],
  'ethnic-wear': [APPAREL_SIZES],
  'sportswear': [APPAREL_SIZES, SIMPLE_COLOURS],
  // Footwear
  'running-shoes': [FOOTWEAR_SIZES],
  'casual-shoes': [FOOTWEAR_SIZES],
  'formal-shoes': [FOOTWEAR_SIZES],
  'sports-shoes': [FOOTWEAR_SIZES],
  sneakers: [FOOTWEAR_SIZES],
  sandals: [FOOTWEAR_SIZES],
  // Devices
  smartphones: [STORAGE, DEVICE_COLOURS],
  tablets: [STORAGE],
  laptops: [STORAGE],
  'smart-watches': [DEVICE_COLOURS],
  'headphones-and-earbuds': [DEVICE_COLOURS],
  // Accessories
  backpacks: [SIMPLE_COLOURS],
  handbags: [SIMPLE_COLOURS],
  luggage: [SIMPLE_COLOURS],
  'cases-and-covers': [SIMPLE_COLOURS],
};

/** Cartesian product of the axes, so each row is one concrete SKU. */
function combinations(axes) {
  return axes.reduce(
    (acc, axis) => acc.flatMap((combo) =>
      axis.options.map((opt) => [...combo, { name: axis.name, ...opt }]),
    ),
    [[]],
  );
}

function skuSuffix(combo) {
  return combo
    .map((c) => String(c.value).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())
    .join('-');
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

  const { rows: products } = await client.query(`
    SELECT p.id, p.slug, p.mrp, c.slug AS sub_slug,
           COALESCE(
             (SELECT pl."sellingPrice" FROM marketplace.product_listings pl
              WHERE pl.product_id = p.id AND pl."isActive" = true
              ORDER BY pl."isBuyBoxWinner" DESC LIMIT 1),
             p.mrp
           ) AS price
    FROM marketplace.products p
    JOIN marketplace.categories c ON c.id = p.subcategory_id
    WHERE c.slug = ANY($1)
  `, [Object.keys(BY_SUBCATEGORY)]);

  let variantCount = 0;
  let productCount = 0;

  for (const p of products) {
    const axes = BY_SUBCATEGORY[p.sub_slug];
    if (!axes) continue;
    productCount++;

    for (const combo of combinations(axes)) {
      const attributes = Object.fromEntries(combo.map((c) => [c.name, c.value]));
      const delta = combo.reduce((sum, c) => sum + (c.priceDelta || 0), 0);
      const selling = Math.round(Number(p.price) + delta);
      const mrp = Math.round(Number(p.mrp) + delta);
      const sku = `${p.slug.slice(0, 28).toUpperCase()}-${skuSuffix(combo)}`;
      const variantName = combo.map((c) => c.value).join(' / ');
      // Deterministic, non-random stock so re-seeding doesn't churn the data:
      // every 7th SKU is out of stock, which exercises the sold-out UI path.
      const stock = variantCount % 7 === 0 ? 0 : 12 + (variantCount % 25);

      await client.query(`
        INSERT INTO marketplace.product_variants
          (product_id, sku, attributes, "variantName", mrp, "sellingPrice", "stockQuantity", "isActive")
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (sku) DO UPDATE SET
          attributes = EXCLUDED.attributes,
          "variantName" = EXCLUDED."variantName",
          mrp = EXCLUDED.mrp,
          "sellingPrice" = EXCLUDED."sellingPrice",
          "stockQuantity" = EXCLUDED."stockQuantity"
      `, [p.id, sku, JSON.stringify(attributes), variantName, mrp, selling, stock]);
      variantCount++;
    }
  }

  console.log(`✅ Seeded ${variantCount} variants across ${productCount} products`);
  await client.end();
})().catch((err) => { console.error('❌', err.message); process.exit(1); });
