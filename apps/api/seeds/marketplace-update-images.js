/**
 * Update Marketplace Product Images
 * 
 * Replaces placeholder images with high-quality product photography
 * from Unsplash (royalty-free, direct CDN links).
 * 
 * Run:  node seeds/marketplace-update-images.js
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));
const { randomUUID } = require('crypto');

// ── High-quality product image URLs from Unsplash ─────────────────────────
// Each product gets a curated, real product photo sized at 600×600.
const PRODUCT_IMAGES = {
  // ─── Mobiles & Tablets ──────────────────────────────────────
  'iphone-15-pro-256gb': [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=600&fit=crop&q=90',
  ],
  'samsung-s24-ultra-256gb': [
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&h=600&fit=crop&q=90',
  ],
  'ipad-pro-m2-256gb': [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=600&h=600&fit=crop&q=90',
  ],
  'samsung-20000mah-powerbank': [
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&h=600&fit=crop&q=90',
  ],
  'apple-20w-usbc-charger': [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1628815113969-0487917f47d7?w=600&h=600&fit=crop&q=90',
  ],
  'samsung-tab-s9-fe-128': [
    'https://images.unsplash.com/photo-1632634515982-1c56003e6b53?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=600&h=600&fit=crop&q=90',
  ],

  // ─── Electronics ──────────────────────────────────────
  'macbook-air-m3-256gb': [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&h=600&fit=crop&q=90',
  ],
  'dell-xps-13-plus': [
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop&q=90',
  ],
  'dell-inspiron-15-8-512': [
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=600&fit=crop&q=90',
  ],
  'sony-wh1000xm5': [
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=crop&q=90',
  ],
  'bose-qc-ultra-earbuds': [
    'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&h=600&fit=crop&q=90',
  ],
  'sony-wf1000xm5': [
    'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=600&h=600&fit=crop&q=90',
  ],
  'airpods-pro-2-usbc': [
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=600&h=600&fit=crop&q=90',
  ],
  'galaxy-watch-6-classic': [
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=90',
  ],
  'apple-watch-series-9': [
    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=600&h=600&fit=crop&q=90',
  ],
  'bose-soundlink-revolve-plus-2': [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600&h=600&fit=crop&q=90',
  ],
  'sony-srs-xb100': [
    'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop&q=90',
  ],
  'sony-alpha-7-iv': [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=600&h=600&fit=crop&q=90',
  ],

  // ─── Fashion ──────────────────────────────────────
  'nike-drifit-mens-tshirt': [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&h=600&fit=crop&q=90',
  ],
  'puma-womens-running-jacket': [
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&h=600&fit=crop&q=90',
  ],
  'nike-boys-sportswear-tshirt': [
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=90',
  ],
  'puma-mens-track-pants': [
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&h=600&fit=crop&q=90',
  ],
  'nike-essential-running-shorts': [
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1562886877-f12251816e01?w=600&h=600&fit=crop&q=90',
  ],
  'nike-womens-drifit-running-top': [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1434389677669-e08b4cda3a32?w=600&h=600&fit=crop&q=90',
  ],

  // ─── Beauty ──────────────────────────────────────
  'dyson-airwrap-complete': [
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&h=600&fit=crop&q=90',
  ],
  'dyson-supersonic-hair-dryer': [
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=600&fit=crop&q=90',
  ],

  // ─── Home & Kitchen ──────────────────────────────────────
  'ikea-kallax-shelf-white': [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop&q=90',
  ],
  'dyson-v15-detect-vacuum': [
    'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=600&fit=crop&q=90',
  ],
  'ikea-hemnes-bed-queen': [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1522771739-a81c74e1ef6f?w=600&h=600&fit=crop&q=90',
  ],
  'ikea-malm-desk-oak': [
    'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600&h=600&fit=crop&q=90',
  ],

  // ─── Sports ──────────────────────────────────────
  'nike-pegasus-41': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop&q=90',
  ],
  'puma-deviate-nitro-elite-2': [
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&h=600&fit=crop&q=90',
  ],
  'nike-yoga-mat-5mm': [
    'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop&q=90',
  ],
  'puma-unisex-running-backpack': [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1622560480654-996b80f6fc19?w=600&h=600&fit=crop&q=90',
  ],
  'nike-revolution-6': [
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=90',
  ],

  // ─── Appliances ──────────────────────────────────────
  'lg-55-4k-oled-tv': [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1571415060716-baff5f717dd7?w=600&h=600&fit=crop&q=90',
  ],
  'samsung-front-load-washer': [
    'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&h=600&fit=crop&q=90',
  ],
  'lg-260l-double-door-fridge': [
    'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&h=600&fit=crop&q=90',
  ],
  'samsung-1-5ton-split-ac': [
    'https://images.unsplash.com/photo-1631545806609-2e4f0b37d1b4?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&h=600&fit=crop&q=90',
  ],
  'lg-32-fhd-monitor': [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop&q=90',
    'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&h=600&fit=crop&q=90',
  ],
};

async function updateImages() {
  const client = new Client({
    host: '127.0.0.1', port: 5432,
    user: 'postgres', password: 'kartseek123',
    database: 'kartseek_db',
  });
  await client.connect();
  console.log('✅ Connected to DB');

  const now = new Date().toISOString();
  let updated = 0;
  let added = 0;

  for (const [slug, urls] of Object.entries(PRODUCT_IMAGES)) {
    // Get the product ID by slug
    const res = await client.query(
      'SELECT id FROM marketplace.products WHERE slug = $1',
      [slug]
    );
    if (res.rows.length === 0) {
      console.warn(`⚠️  Product slug "${slug}" not found, skipping`);
      continue;
    }
    const productId = res.rows[0].id;

    // Update the primary image (first URL)
    const existing = await client.query(
      'SELECT id FROM marketplace.product_images WHERE product_id = $1 ORDER BY "sortOrder" ASC',
      [productId]
    );

    if (existing.rows.length > 0) {
      // Update existing primary image
      await client.query(
        'UPDATE marketplace.product_images SET url = $1 WHERE id = $2',
        [urls[0], existing.rows[0].id]
      );
      updated++;
    } else {
      // Insert new primary image
      await client.query(
        `INSERT INTO marketplace.product_images (id, product_id, url, "altText", "sortOrder", "isPrimary", "createdAt")
         VALUES ($1, $2, $3, $4, 0, true, $5)`,
        [randomUUID(), productId, urls[0], slug, now]
      );
      added++;
    }

    // Add additional gallery images (2nd, 3rd URLs)
    for (let i = 1; i < urls.length; i++) {
      const imgId = randomUUID();
      await client.query(
        `INSERT INTO marketplace.product_images (id, product_id, url, "altText", "sortOrder", "isPrimary", "createdAt")
         VALUES ($1, $2, $3, $4, $5, false, $6)
         ON CONFLICT DO NOTHING`,
        [imgId, productId, urls[i], `${slug} view ${i + 1}`, i, now]
      );
      added++;
    }

    console.log(`  ✓ ${slug} → ${urls.length} image(s)`);
  }

  console.log(`\n═══ IMAGE UPDATE COMPLETE ═══`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Added:   ${added}`);

  // Verify
  const counts = await client.query(
    'SELECT COUNT(*) as total FROM marketplace.product_images'
  );
  console.log(`  Total images in DB: ${counts.rows[0].total}`);

  await client.end();
}

updateImages().catch(err => { console.error('FATAL:', err); process.exit(1); });
