/**
 * Marketplace Seed Script
 * 
 * Seeds the marketplace schema with:
 *  - 8 parent categories (each with 4-6 subcategories)
 *  - 10 brands
 *  - 1 seller
 *  - 40 products across all categories (with images and listings)
 *
 * Run:  node seeds/marketplace-seed.js
 */
const { Client } = require(require.resolve('pg', { paths: [process.cwd()] }));
const { randomUUID } = require('crypto');
const {
  mergeBrands, mergeCategories, mergeProducts, verifyCatalog,
} = require('./marketplace-catalog-extra');

async function seed() {
  const client = new Client({
    host: '127.0.0.1', port: 5432,
    user: 'postgres', password: 'kartseek123',
    database: 'kartseek_db',
  });
  await client.connect();
  console.log('✅ Connected to DB');

  // Ensure marketplace schema exists
  await client.query('CREATE SCHEMA IF NOT EXISTS marketplace');

  // ── Helper ──────────────────────────────────────────────────────────────────
  const uuid = () => randomUUID();
  const now = new Date().toISOString();

  // ── 1. Brands ──────────────────────────────────────────────────────────────
  const brands = [
    { id: uuid(), name: 'Apple', slug: 'apple', description: 'Think Different' },
    { id: uuid(), name: 'Samsung', slug: 'samsung', description: 'Samsung Galaxy' },
    { id: uuid(), name: 'Sony', slug: 'sony', description: 'Be Moved' },
    { id: uuid(), name: 'Nike', slug: 'nike', description: 'Just Do It' },
    { id: uuid(), name: 'Dyson', slug: 'dyson', description: 'Dyson Technology' },
    { id: uuid(), name: 'Dell', slug: 'dell', description: 'Dell Technologies' },
    { id: uuid(), name: 'Bose', slug: 'bose', description: 'Better Sound' },
    { id: uuid(), name: 'IKEA', slug: 'ikea', description: 'Home Furnishing' },
    { id: uuid(), name: 'Puma', slug: 'puma', description: 'Forever Faster' },
    { id: uuid(), name: 'LG', slug: 'lg', description: 'Life\'s Good' },
  ];

  mergeBrands(brands);

  // Upsert brands
  for (const b of brands) {
    await client.query(`
      INSERT INTO marketplace.brands (id, name, slug, description, "isVerified", "followerCount", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, $5, $6, $6)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
    `, [b.id, b.name, b.slug, b.description, Math.floor(Math.random() * 50000), now]);
  }
  console.log(`✅ Seeded ${brands.length} brands`);

  // Re-read brand IDs (in case of conflict resolution)
  const brandRows = await client.query('SELECT id, slug FROM marketplace.brands');
  const brandMap = Object.fromEntries(brandRows.rows.map((r) => [r.slug, r.id]));

  // ── 2. Categories (parent + children) ──────────────────────────────────────
  const categoryDefs = [
    {
      name: 'Mobiles & Tablets', slug: 'mobiles-tablets', icon: 'Smartphone',
      subs: [
        { name: 'Smartphones', slug: 'smartphones' },
        { name: 'Tablets', slug: 'tablets' },
        { name: 'Mobile Accessories', slug: 'mobile-accessories' },
        { name: 'Cases & Covers', slug: 'cases-and-covers' },
        { name: 'Power Banks', slug: 'power-banks' },
        { name: 'Chargers & Cables', slug: 'chargers-and-cables' },
      ],
    },
    {
      name: 'Electronics', slug: 'electronics', icon: 'Laptop',
      subs: [
        { name: 'Laptops', slug: 'laptops' },
        { name: 'Headphones & Earbuds', slug: 'headphones-and-earbuds' },
        { name: 'Cameras', slug: 'cameras' },
        { name: 'Smart Watches', slug: 'smart-watches' },
        { name: 'Speakers', slug: 'speakers' },
        { name: 'Gaming Consoles', slug: 'gaming-consoles' },
      ],
    },
    {
      name: 'Fashion', slug: 'fashion', icon: 'Shirt',
      subs: [
        { name: "Men's Clothing", slug: 'mens-clothing' },
        { name: "Women's Clothing", slug: 'womens-clothing' },
        { name: "Kids' Wear", slug: 'kids-wear' },
        { name: 'Ethnic Wear', slug: 'ethnic-wear' },
        { name: 'Sportswear', slug: 'sportswear' },
      ],
    },
    {
      name: 'Beauty & Personal Care', slug: 'beauty', icon: 'Sparkles',
      subs: [
        { name: 'Skincare', slug: 'skincare' },
        { name: 'Haircare', slug: 'haircare' },
        { name: 'Makeup', slug: 'makeup' },
        { name: 'Fragrances', slug: 'fragrances' },
      ],
    },
    {
      name: 'Home & Kitchen', slug: 'home-kitchen', icon: 'Sofa',
      subs: [
        { name: 'Kitchen Appliances', slug: 'kitchen-appliances' },
        { name: 'Cookware', slug: 'cookware' },
        { name: 'Décor', slug: 'decor' },
        { name: 'Bedding', slug: 'bedding' },
        { name: 'Lighting', slug: 'lighting' },
      ],
    },
    {
      name: 'Sports & Fitness', slug: 'sports', icon: 'Dumbbell',
      subs: [
        { name: 'Gym Equipment', slug: 'gym-equipment' },
        { name: 'Running Shoes', slug: 'running-shoes' },
        { name: 'Yoga & Meditation', slug: 'yoga-and-meditation' },
        { name: 'Cycling', slug: 'cycling' },
      ],
    },
    {
      name: 'Appliances', slug: 'appliances', icon: 'Tv',
      subs: [
        { name: 'TVs', slug: 'tvs' },
        { name: 'Washing Machines', slug: 'washing-machines' },
        { name: 'Refrigerators', slug: 'refrigerators' },
        { name: 'Air Conditioners', slug: 'air-conditioners' },
      ],
    },
    {
      name: 'Books & Stationery', slug: 'books', icon: 'BookOpen',
      subs: [
        { name: 'Fiction', slug: 'fiction' },
        { name: 'Non-Fiction', slug: 'non-fiction' },
        { name: 'Academic & Textbooks', slug: 'academic-and-textbooks' },
        { name: 'Stationery', slug: 'stationery' },
      ],
    },
  ];

  mergeCategories(categoryDefs);

  const categoryIds = {};

  // First pass: insert parent categories.
  // `RETURNING id` matters on a re-run: the upsert keeps the existing row's id
  // and discards the one generated here. Carrying the generated id forward
  // pointed every child's parent_id and every product's category_id at a row
  // that does not exist, so the seed only ever worked against an empty DB.
  for (const cat of categoryDefs) {
    const res = await client.query(`
      INSERT INTO marketplace.categories (id, name, slug, icon, sort_order, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, $6, $6)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon
      RETURNING id
    `, [uuid(), cat.name, cat.slug, cat.icon, categoryDefs.indexOf(cat), now]);
    categoryIds[cat.slug] = { id: res.rows[0].id, subs: {} };
  }
  console.log(`✅ Seeded ${categoryDefs.length} parent categories`);

  // Second pass: insert subcategories with parent_id
  let subCount = 0;
  for (const cat of categoryDefs) {
    const parentId = categoryIds[cat.slug].id;
    for (let i = 0; i < cat.subs.length; i++) {
      const sub = cat.subs[i];
      const subRes = await client.query(`
        INSERT INTO marketplace.categories (id, name, slug, parent_id, sort_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, $6, $6)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id
        RETURNING id
      `, [uuid(), sub.name, sub.slug, parentId, i, now]);
      const subId = subRes.rows[0].id;
      categoryIds[cat.slug].subs[sub.slug] = subId;

      // Also insert into the closure table for the tree structure
      // Self-reference
      await client.query(`
        INSERT INTO marketplace.categories_closure (id_ancestor, id_descendant)
        VALUES ($1, $1)
        ON CONFLICT DO NOTHING
      `, [subId]);
      // Parent → child
      await client.query(`
        INSERT INTO marketplace.categories_closure (id_ancestor, id_descendant)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [parentId, subId]);
      subCount++;
    }
    // Self-reference for parent
    await client.query(`
      INSERT INTO marketplace.categories_closure (id_ancestor, id_descendant)
      VALUES ($1, $1)
      ON CONFLICT DO NOTHING
    `, [parentId]);
  }
  console.log(`✅ Seeded ${subCount} subcategories`);

  // ── 3. Seller ────────────────────────────────────────────────────────────────
  // The seller is the supplying party named on every invoice, so the record
  // needs the fields an invoice has to print: a registered address, a tax
  // registration and a reachable contact. It previously carried a name, an
  // Indian phone number (+91-9999999999) and nothing else — no address, no
  // registration, no region — so the "Sold By" block rendered one line and the
  // document could not function as an invoice in any jurisdiction.
  //
  // `gstNumber` is the column's legacy name; it holds whatever registration the
  // seller's market issues. In Qatar that is a Commercial Registration number,
  // which is what the storefront labels it via `getSellerTaxIdLabel`.
  const sellerId = uuid();
  await client.query(`
    INSERT INTO marketplace.sellers (
      id, "businessName", "storeSlug", "ownerName", email, phone,
      description, "verificationStatus", "isActive", "sellerRating",
      "totalReviews", "totalProducts", "totalOrders", "kycStatus",
      "gstNumber", address, region_code,
      "createdAt", "updatedAt"
    ) VALUES (
      $1, 'KartSeek Official Store', 'kartseek-official', 'KartSeek Admin',
      'official@kartseek.com', '+974 4000 1234',
      'Official KartSeek marketplace store with guaranteed quality products',
      'VERIFIED', true, 4.8, 1250, 40, 5000, 'VERIFIED',
      'CR-142857', $3, 'QA',
      $2, $2
    ) ON CONFLICT ("storeSlug") DO UPDATE SET
      "businessName" = EXCLUDED."businessName",
      phone          = EXCLUDED.phone,
      "gstNumber"    = EXCLUDED."gstNumber",
      address        = EXCLUDED.address,
      region_code    = EXCLUDED.region_code
  `, [sellerId, now, JSON.stringify({
    line1: 'Office 1204, Al Fardan Office Tower',
    line2: 'Building 61, Street 950, Zone 63',
    area: 'West Bay',
    city: 'Doha',
    country: 'Qatar',
    countryCode: 'QA',
    poBox: '24955',
  })]);
  console.log('✅ Seeded seller');

  // Re-read seller ID
  const sellerRes = await client.query(`SELECT id FROM marketplace.sellers WHERE "storeSlug" = 'kartseek-official'`);
  const actualSellerId = sellerRes.rows[0].id;

  // ── 4. Products ─────────────────────────────────────────────────────────────
  const productDefs = [
    // Mobiles
    { name: 'iPhone 15 Pro (256GB) – Titanium Blue', slug: 'iphone-15-pro-256gb', gtin: 'ASIN-B0CMZ4S8MV', brand: 'apple', category: 'mobiles-tablets', subcategory: 'smartphones', mrp: 5850, price: 5050, rating: 4.9, reviews: 12400 },
    { name: 'Samsung Galaxy S24 Ultra (12GB, 256GB)', slug: 'samsung-s24-ultra-256gb', gtin: 'ASIN-B0CVKJ3MLT', brand: 'samsung', category: 'mobiles-tablets', subcategory: 'smartphones', mrp: 5850, price: 5200, rating: 4.6, reviews: 5100 },
    { name: 'Apple iPad Pro 12.9" M2 Chip (256GB)', slug: 'ipad-pro-m2-256gb', gtin: 'ASIN-B0BJLF1JNH', brand: 'apple', category: 'mobiles-tablets', subcategory: 'tablets', mrp: 5450, price: 4900, rating: 4.9, reviews: 2100 },
    { name: 'Samsung 20000mAh Power Bank', slug: 'samsung-20000mah-powerbank', gtin: 'ASIN-B0D8PWRBNK', brand: 'samsung', category: 'mobiles-tablets', subcategory: 'power-banks', mrp: 110, price: 55, rating: 4.3, reviews: 800 },
    { name: 'Apple 20W USB-C Charger', slug: 'apple-20w-usbc-charger', gtin: 'ASIN-B09J1CHG20', brand: 'apple', category: 'mobiles-tablets', subcategory: 'chargers-and-cables', mrp: 85, price: 65, rating: 4.5, reviews: 3200 },

    // Electronics
    { name: 'MacBook Air M3 (8GB, 256GB SSD)', slug: 'macbook-air-m3-256gb', gtin: 'ASIN-B0CX23V2RE', brand: 'apple', category: 'electronics', subcategory: 'laptops', mrp: 5200, price: 5000, rating: 4.8, reviews: 3200 },
    { name: 'Dell XPS 13 Plus (16GB, 512GB SSD)', slug: 'dell-xps-13-plus', gtin: 'ASIN-B0CXPS13DL', brand: 'dell', category: 'electronics', subcategory: 'laptops', mrp: 6950, price: 6300, rating: 4.7, reviews: 892 },
    { name: 'Sony WH-1000XM5 Wireless Headphones', slug: 'sony-wh1000xm5', gtin: 'ASIN-B09XS7JWHH', brand: 'sony', category: 'electronics', subcategory: 'headphones-and-earbuds', mrp: 1500, price: 1100, rating: 4.8, reviews: 8200 },
    { name: 'Bose QuietComfort Ultra Earbuds', slug: 'bose-qc-ultra-earbuds', gtin: 'ASIN-B0CCZ26B6V', brand: 'bose', category: 'electronics', subcategory: 'headphones-and-earbuds', mrp: 1450, price: 1200, rating: 4.6, reviews: 4500 },
    { name: 'Samsung Galaxy Watch 6 Classic (47mm)', slug: 'galaxy-watch-6-classic', gtin: 'ASIN-B0C7JGWT6C', brand: 'samsung', category: 'electronics', subcategory: 'smart-watches', mrp: 1650, price: 1300, rating: 4.4, reviews: 1800 },

    // Fashion
    { name: 'Nike Dri-FIT Men\'s Training T-Shirt', slug: 'nike-drifit-mens-tshirt', gtin: 'ASIN-B0DKNKFASH', brand: 'nike', category: 'fashion', subcategory: 'mens-clothing', mrp: 110, price: 80, rating: 4.3, reviews: 9800 },
    { name: 'Puma Women\'s Running Jacket', slug: 'puma-womens-running-jacket', gtin: 'ASIN-B0DPUMAWJK', brand: 'puma', category: 'fashion', subcategory: 'womens-clothing', mrp: 220, price: 145, rating: 4.5, reviews: 2400 },
    { name: 'Nike Boys\' Sportswear T-Shirt', slug: 'nike-boys-sportswear-tshirt', gtin: 'ASIN-B0DNKBOYTS', brand: 'nike', category: 'fashion', subcategory: 'kids-wear', mrp: 55, price: 40, rating: 4.2, reviews: 1100 },
    { name: 'Puma Men\'s Track Pants', slug: 'puma-mens-track-pants', gtin: 'ASIN-B0DPMTRPNT', brand: 'puma', category: 'fashion', subcategory: 'sportswear', mrp: 130, price: 85, rating: 4.4, reviews: 3500 },
    { name: 'Nike Essential Running Shorts', slug: 'nike-essential-running-shorts', gtin: 'ASIN-B0DNKRUNSH', brand: 'nike', category: 'fashion', subcategory: 'sportswear', mrp: 80, price: 55, rating: 4.6, reviews: 7200 },

    // Beauty
    { name: 'Dyson Airwrap Multi-Styler Complete', slug: 'dyson-airwrap-complete', gtin: 'ASIN-B0C55DYAWP', brand: 'dyson', category: 'beauty', subcategory: 'haircare', mrp: 2150, price: 1950, rating: 4.8, reviews: 3400 },
    { name: 'Dyson Supersonic Hair Dryer', slug: 'dyson-supersonic-hair-dryer', gtin: 'ASIN-B0CDYSNCHD', brand: 'dyson', category: 'beauty', subcategory: 'haircare', mrp: 1600, price: 1400, rating: 4.7, reviews: 6200 },

    // Home & Kitchen
    { name: 'IKEA KALLAX Shelf Unit, White', slug: 'ikea-kallax-shelf-white', gtin: 'ASIN-B0CIKEAKLX', brand: 'ikea', category: 'home-kitchen', subcategory: 'decor', mrp: 300, price: 260, rating: 4.5, reviews: 4200 },
    { name: 'Dyson V15 Detect Vacuum', slug: 'dyson-v15-detect-vacuum', gtin: 'ASIN-B0CDY15VCM', brand: 'dyson', category: 'home-kitchen', subcategory: 'kitchen-appliances', mrp: 2750, price: 2300, rating: 4.7, reviews: 2800 },
    { name: 'IKEA HEMNES Bed Frame, Queen', slug: 'ikea-hemnes-bed-queen', gtin: 'ASIN-B0CIKEAHMN', brand: 'ikea', category: 'home-kitchen', subcategory: 'bedding', mrp: 1100, price: 870, rating: 4.4, reviews: 1500 },

    // Sports
    { name: 'Nike Air Zoom Pegasus 41', slug: 'nike-pegasus-41', gtin: 'ASIN-B0DNKPEG41', brand: 'nike', category: 'sports', subcategory: 'running-shoes', mrp: 560, price: 430, rating: 4.7, reviews: 11000 },
    { name: 'Puma Deviate NITRO Elite 2', slug: 'puma-deviate-nitro-elite-2', gtin: 'ASIN-B0DPMDNITE', brand: 'puma', category: 'sports', subcategory: 'running-shoes', mrp: 700, price: 520, rating: 4.5, reviews: 2200 },
    { name: 'Nike Yoga Mat Premium (5mm)', slug: 'nike-yoga-mat-5mm', gtin: 'ASIN-B0DNKYOGMT', brand: 'nike', category: 'sports', subcategory: 'yoga-and-meditation', mrp: 150, price: 115, rating: 4.6, reviews: 5400 },

    // Appliances
    { name: 'LG 55" 4K OLED Smart TV', slug: 'lg-55-4k-oled-tv', gtin: 'ASIN-B0CLGOLEDTV', brand: 'lg', category: 'appliances', subcategory: 'tvs', mrp: 5650, price: 4350, rating: 4.8, reviews: 3200 },
    { name: 'Samsung 70L Front-Load Washer', slug: 'samsung-front-load-washer', gtin: 'ASIN-B0CSSMFLWM', brand: 'samsung', category: 'appliances', subcategory: 'washing-machines', mrp: 1850, price: 1500, rating: 4.5, reviews: 1800 },
    { name: 'LG 260L Double Door Refrigerator', slug: 'lg-260l-double-door-fridge', gtin: 'ASIN-B0CLGDDFRG', brand: 'lg', category: 'appliances', subcategory: 'refrigerators', mrp: 1450, price: 1200, rating: 4.4, reviews: 2100 },
    { name: 'Samsung 1.5 Ton Split AC', slug: 'samsung-1-5ton-split-ac', gtin: 'ASIN-B0CSSSPLAC', brand: 'samsung', category: 'appliances', subcategory: 'air-conditioners', mrp: 2150, price: 1700, rating: 4.3, reviews: 900 },

    // Extra products for popular subcategories
    { name: 'Apple Watch Series 9 (GPS, 45mm)', slug: 'apple-watch-series-9', gtin: 'ASIN-B0CHX1S9AW', brand: 'apple', category: 'electronics', subcategory: 'smart-watches', mrp: 1950, price: 1750, rating: 4.7, reviews: 6700 },
    { name: 'Sony WF-1000XM5 True Wireless Earbuds', slug: 'sony-wf1000xm5', gtin: 'ASIN-B0C33XXKRR', brand: 'sony', category: 'electronics', subcategory: 'headphones-and-earbuds', mrp: 1100, price: 960, rating: 4.7, reviews: 3800 },
    { name: 'Dell Inspiron 15 (8GB, 512GB)', slug: 'dell-inspiron-15-8-512', gtin: 'ASIN-B0CDL15I8G', brand: 'dell', category: 'electronics', subcategory: 'laptops', mrp: 2850, price: 2300, rating: 4.3, reviews: 2200 },
    { name: 'Bose SoundLink Revolve+ II', slug: 'bose-soundlink-revolve-plus-2', gtin: 'ASIN-B099TLRGRV', brand: 'bose', category: 'electronics', subcategory: 'speakers', mrp: 1100, price: 870, rating: 4.5, reviews: 1900 },
    { name: 'Sony Alpha 7 IV Mirrorless Camera', slug: 'sony-alpha-7-iv', gtin: 'ASIN-B09JRSNY7C', brand: 'sony', category: 'electronics', subcategory: 'cameras', mrp: 10550, price: 9550, rating: 4.8, reviews: 1200 },
    { name: 'Samsung Galaxy Tab S9 FE (128GB)', slug: 'samsung-tab-s9-fe-128', gtin: 'ASIN-B0CKSTABS9', brand: 'samsung', category: 'mobiles-tablets', subcategory: 'tablets', mrp: 1950, price: 1550, rating: 4.5, reviews: 3100 },
    { name: 'Nike Women\'s Dri-FIT Running Top', slug: 'nike-womens-drifit-running-top', gtin: 'ASIN-B0DNKWDFRT', brand: 'nike', category: 'fashion', subcategory: 'womens-clothing', mrp: 120, price: 85, rating: 4.4, reviews: 4200 },
    { name: 'Puma Unisex Running Backpack', slug: 'puma-unisex-running-backpack', gtin: 'ASIN-B0DPMURBKP', brand: 'puma', category: 'sports', subcategory: 'gym-equipment', mrp: 110, price: 80, rating: 4.3, reviews: 1600 },
    { name: 'IKEA MALM Desk, Oak', slug: 'ikea-malm-desk-oak', gtin: 'ASIN-B0CIKEAMLM', brand: 'ikea', category: 'home-kitchen', subcategory: 'decor', mrp: 390, price: 330, rating: 4.6, reviews: 2900 },
    { name: 'LG 32" Full HD Monitor', slug: 'lg-32-fhd-monitor', gtin: 'ASIN-B0CLG32MON', brand: 'lg', category: 'appliances', subcategory: 'tvs', mrp: 830, price: 650, rating: 4.4, reviews: 1400 },
    { name: 'Sony SRS-XB100 Portable Speaker', slug: 'sony-srs-xb100', gtin: 'ASIN-B0C8P7XXHR', brand: 'sony', category: 'electronics', subcategory: 'speakers', mrp: 220, price: 150, rating: 4.3, reviews: 6800 },
    { name: 'Apple AirPods Pro 2nd Gen (USB-C)', slug: 'airpods-pro-2-usbc', gtin: 'ASIN-B0D1XVAPP2', brand: 'apple', category: 'electronics', subcategory: 'headphones-and-earbuds', mrp: 1100, price: 910, rating: 4.8, reviews: 15200 },
    { name: 'Nike Revolution 6 Running Shoe', slug: 'nike-revolution-6', gtin: 'ASIN-B09NKREV6S', brand: 'nike', category: 'sports', subcategory: 'running-shoes', mrp: 195, price: 130, rating: 4.2, reviews: 14500 },
  ];

  mergeProducts(productDefs);

  // Refuse to load a catalog that would leave an advertised view empty.
  const { emptyCats, emptySubs } = verifyCatalog(categoryDefs, productDefs);
  if (emptyCats.length || emptySubs.length) {
    console.error('\n❌ Catalog invariant violated — these would render no product cards:');
    if (emptyCats.length) console.error(`   categories:    ${emptyCats.join(', ')}`);
    if (emptySubs.length) console.error(`   subcategories: ${emptySubs.join(', ')}`);
    console.error('   Add products for them, or drop them from the category definitions.\n');
    process.exit(1);
  }

  let prodCount = 0;
  let listCount = 0;
  let imgCount = 0;

  for (const p of productDefs) {
    const catInfo = categoryIds[p.category];
    if (!catInfo) { console.warn(`⚠️  Category ${p.category} not found, skipping ${p.name}`); continue; }
    const categoryId = catInfo.id;
    const subcategoryId = catInfo.subs[p.subcategory] || null;

    // `RETURNING id` for the same reason as the categories above — on a re-run
    // the stored id wins, and the listing/image rows below must reference it.
    const prodRes = await client.query(`
      INSERT INTO marketplace.products (
        id, "globalTradeItemNumber", name, slug, short_description,
        brand_id, category_id, subcategory_id, seller_id,
        mrp, "averageRating", "reviewCount",
        status, approval_status, is_active, "isPanIndia",
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        'ACTIVE', 'APPROVED', true, true,
        $13, $13
      ) ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        mrp = EXCLUDED.mrp,
        "averageRating" = EXCLUDED."averageRating",
        "reviewCount" = EXCLUDED."reviewCount",
        brand_id = EXCLUDED.brand_id,
        category_id = EXCLUDED.category_id,
        subcategory_id = EXCLUDED.subcategory_id
      RETURNING id
    `, [
      uuid(), p.gtin, p.name, p.slug, `${p.name} — Buy online at best price`,
      brandMap[p.brand], categoryId, subcategoryId, actualSellerId,
      p.mrp, p.rating, p.reviews,
      now,
    ]);
    const productId = prodRes.rows[0].id;
    prodCount++;

    // Product listing (seller inventory).
    //
    // The upsert below updates the price rather than the original
    // `ON CONFLICT DO NOTHING`, which left an existing listing at whatever
    // price it already had. Re-pricing the catalogue updated products.mrp but
    // not product_listings."sellingPrice" — and the buy box reads the listing,
    // so the storefront went on quoting the old prices with the new
    // struck-through MRP beside them.
    //
    // Safe to overwrite: this only ever touches the seeder's own store, since
    // a real seller's listing carries a different seller_id.
    const listingId = uuid();
    const sku = `SKO-${p.slug.toUpperCase().substring(0, 20)}-${Math.floor(Math.random() * 9999)}`;
    await client.query(`
      INSERT INTO marketplace.product_listings (
        id, product_id, seller_id, "sellerSku",
        "sellingPrice", "stockQuantity", condition,
        "isBuyBoxWinner", "isFulfilledByKartseek", "isActive",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, 'NEW',
        true, true, true,
        $7, $7
      ) ON CONFLICT (product_id, seller_id) DO UPDATE SET
        "sellingPrice" = EXCLUDED."sellingPrice",
        "isActive"     = EXCLUDED."isActive",
        "updatedAt"    = EXCLUDED."updatedAt"
    `, [listingId, productId, actualSellerId, sku, p.price, Math.floor(Math.random() * 500 + 10), now]);
    listCount++;

    // Product image (placeholder URL based on brand).
    //
    // `ON CONFLICT DO NOTHING` did nothing here: the row carries a fresh uuid
    // every run and there is no unique index on (product_id, url), so nothing
    // ever conflicted and each seed added another copy. Five runs left 1,070
    // image rows for 178 products, and the gallery renders one thumbnail per
    // row — so a product detail page showed the same placeholder six times.
    //
    // Deleting this seeder's own placeholder first makes the insert idempotent
    // without touching real uploaded imagery, which has a different host.
    const placeholderUrl = `https://placehold.co/400x400/e2e8f0/475569?text=${encodeURIComponent(p.brand.charAt(0).toUpperCase() + p.brand.slice(1))}`;
    await client.query(
      `DELETE FROM marketplace.product_images WHERE product_id = $1 AND url = $2`,
      [productId, placeholderUrl],
    );
    const imageId = uuid();
    await client.query(`
      INSERT INTO marketplace.product_images (
        id, product_id, url, "altText", "sortOrder", "isPrimary", "createdAt"
      ) VALUES ($1, $2, $3, $4, 0, true, $5)
    `, [imageId, productId, placeholderUrl, p.name, now]);
    imgCount++;
  }

  console.log(`✅ Seeded ${prodCount} products, ${listCount} listings, ${imgCount} images`);

  // ── 5b. De-duplicate images left by earlier runs ────────────────────────────
  //
  // The image insert used to add a row per run (see the note above it), so a
  // database seeded more than once carries exact (product_id, url) repeats and
  // the product gallery renders the same picture several times. Only exact
  // duplicates are removed and one of each is always kept, so this cannot lose
  // an image that exists once.
  const dedup = await client.query(`
    DELETE FROM marketplace.product_images a
    USING marketplace.product_images b
    WHERE a.product_id = b.product_id
      AND a.url = b.url
      AND a.ctid > b.ctid
  `);
  if (dedup.rowCount > 0) {
    console.log(`🧹 Removed ${dedup.rowCount} duplicate product images`);
  }

  // ── 6. Prune products the catalogue no longer declares ──────────────────────
  //
  // Everything above upserts by slug, so renaming a product creates a new row
  // and leaves the old one behind, still listed and still shoppable. That is how
  // the storefront ended up serving both the Qatari catalogue and the Indian one
  // it replaced: 178 declared products, 241 rows, and Fastrack watches and
  // Haldiram's snacks still on sale in Doha.
  //
  // Scoped to this seeder's own store, so a real seller's catalogue is never
  // touched. Rows are removed child-first because the FKs do not cascade.
  const declaredSlugs = productDefs.map(p => p.slug);
  const doomed = await client.query(`
    SELECT DISTINCT p.id, p.name
    FROM marketplace.products p
    JOIN marketplace.product_listings l ON l.product_id = p.id
    WHERE l.seller_id = $1 AND p.slug <> ALL($2::text[])
  `, [actualSellerId, declaredSlugs]);

  if (doomed.rowCount > 0) {
    const ids = doomed.rows.map(r => r.id);
    for (const [table, column] of [
      ['flash_deal_nominations', 'product_id'],
      ['price_alerts', 'product_id'],
      ['product_reports', 'product_id'],
      ['reviews', 'product_id'],
      ['product_variants', 'product_id'],
      ['product_images', 'product_id'],
      ['product_attributes', 'product_id'],
      ['flash_deals', 'product_id'],
      ['product_listings', 'product_id'],
    ]) {
      await client.query(
        `DELETE FROM marketplace.${table} WHERE ${column} = ANY($1::uuid[])`, [ids],
      ).catch(() => { /* table may not exist in older schemas */ });
    }
    // Questions own answers, so they go in that order.
    await client.query(`
      DELETE FROM marketplace.product_answers
      WHERE question_id IN (SELECT id FROM marketplace.product_questions WHERE product_id = ANY($1::uuid[]))
    `, [ids]).catch(() => {});
    await client.query(
      `DELETE FROM marketplace.product_questions WHERE product_id = ANY($1::uuid[])`, [ids],
    ).catch(() => {});
    await client.query(`DELETE FROM marketplace.products WHERE id = ANY($1::uuid[])`, [ids]);
    console.log(`🧹 Pruned ${doomed.rowCount} products no longer in the catalogue`);
  }

  // Brands left with no products are pruned too, or the brand directory keeps
  // advertising storefronts that lead to an empty page.
  const orphanBrands = await client.query(`
    DELETE FROM marketplace.brands b
    WHERE NOT EXISTS (SELECT 1 FROM marketplace.products p WHERE p.brand_id = b.id)
    RETURNING b.name
  `).catch(async () => {
    // brand_follows / brand_updates reference brands; clear them first.
    await client.query(`
      DELETE FROM marketplace.brand_updates WHERE brand_id IN (
        SELECT b.id FROM marketplace.brands b
        WHERE NOT EXISTS (SELECT 1 FROM marketplace.products p WHERE p.brand_id = b.id))
    `).catch(() => {});
    await client.query(`
      DELETE FROM marketplace.brand_follows WHERE brand_id IN (
        SELECT b.id FROM marketplace.brands b
        WHERE NOT EXISTS (SELECT 1 FROM marketplace.products p WHERE p.brand_id = b.id))
    `).catch(() => {});
    return client.query(`
      DELETE FROM marketplace.brands b
      WHERE NOT EXISTS (SELECT 1 FROM marketplace.products p WHERE p.brand_id = b.id)
      RETURNING b.name
    `);
  });
  if (orphanBrands.rowCount > 0) {
    console.log(`🧹 Pruned ${orphanBrands.rowCount} brands with no products`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM marketplace.brands) as brands,
      (SELECT COUNT(*) FROM marketplace.categories WHERE parent_id IS NULL) as parent_categories,
      (SELECT COUNT(*) FROM marketplace.categories WHERE parent_id IS NOT NULL) as subcategories,
      (SELECT COUNT(*) FROM marketplace.sellers) as sellers,
      (SELECT COUNT(*) FROM marketplace.products) as products,
      (SELECT COUNT(*) FROM marketplace.product_listings) as listings,
      (SELECT COUNT(*) FROM marketplace.product_images) as images
  `);

  console.log('\n═══ SEED COMPLETE ═══');
  const c = counts.rows[0];
  console.log(`  Brands:            ${c.brands}`);
  console.log(`  Parent Categories: ${c.parent_categories}`);
  console.log(`  Subcategories:     ${c.subcategories}`);
  console.log(`  Sellers:           ${c.sellers}`);
  console.log(`  Products:          ${c.products}`);
  console.log(`  Listings:          ${c.listings}`);
  console.log(`  Images:            ${c.images}`);

  await client.end();
}

seed().catch(err => { console.error('FATAL:', err); process.exit(1); });
