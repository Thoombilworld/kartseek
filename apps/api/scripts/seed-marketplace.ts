/**
 * seed-marketplace.ts — Seeds a browsable marketplace catalog.
 *
 * Usage: npx ts-node apps/api/scripts/seed-marketplace.ts
 *
 * Targets the marketplace service's own HTTP port, NOT the API gateway: the
 * write endpoints (POST categories / subcategories / brands / products) are
 * declared only on the service's controller. Override with
 * MARKETPLACE_SERVICE_URL if the service runs elsewhere.
 *
 * Idempotent — re-running resolves existing rows by slug instead of failing.
 *
 * Seeds: 10 brands, 20 categories (each with 8 subcategories as tree children),
 * and products spread across every category so no category page is empty.
 *
 * The category slugs here MUST stay in step with CATEGORIES in
 * apps/web/src/lib/demo-data/marketplace-home.ts — the web app links categories
 * by slug and the API filters products on `category.slug`, so a mismatch renders
 * a category as "No products found".
 */

const BASE = `${process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3012'}/marketplace`;

/**
 * The catalog write endpoints are guarded by JwtAuthGuard + RolesGuard and
 * require ADMIN or SUPER_ADMIN, so seeding needs a bearer token:
 *
 *   SEED_ADMIN_TOKEN=<jwt> npx ts-node apps/api/scripts/seed-marketplace.ts
 */
const ADMIN_TOKEN = process.env.SEED_ADMIN_TOKEN || '';

/** Set when a write is rejected with 401/403 so we can abort with one clear message. */
let authRejected = false;

// ── Types ───────────────────────────────────────────────────────────────────

interface SeedBrand {
  name: string;
  slug: string;
  tagline: string;
  logoUrl: string;
  bannerUrl: string;
}

interface SeedCategory {
  slug: string;
  name: string;
  icon: string;
  subcategories: string[];
}

interface SeedProduct {
  name: string;
  shortDescription: string;
  mrp: number;
  categorySlug: string;
  /** Subcategory label; resolved to the child category seeded under the parent. */
  subcategoryLabel?: string;
  brandSlug: string;
  rating: number;
  reviewCount: number;
}

// ── Brands ──────────────────────────────────────────────────────────────────

const BRANDS: SeedBrand[] = [
  { name: 'Apple', slug: 'apple', tagline: 'Think Different', logoUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200', bannerUrl: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1200' },
  { name: 'Samsung', slug: 'samsung', tagline: 'Do What You Can\'t', logoUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200', bannerUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1200' },
  { name: 'Nike', slug: 'nike', tagline: 'Just Do It', logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200', bannerUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200' },
  { name: 'Sony', slug: 'sony', tagline: 'Make.Believe', logoUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=200', bannerUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200' },
  { name: 'Adidas', slug: 'adidas', tagline: 'Impossible is Nothing', logoUrl: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=200', bannerUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200' },
  { name: 'LG', slug: 'lg', tagline: 'Life\'s Good', logoUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200', bannerUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200' },
  { name: 'Dyson', slug: 'dyson', tagline: 'Engineered for Life', logoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200', bannerUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200' },
  { name: 'IKEA', slug: 'ikea', tagline: 'Create a Better Life', logoUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200', bannerUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200' },
  { name: 'L\'Oreal', slug: 'loreal', tagline: 'Because You\'re Worth It', logoUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200', bannerUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200' },
  { name: 'Lego', slug: 'lego', tagline: 'Only the Best is Good Enough', logoUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=200', bannerUrl: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=1200' },
];

// ── Categories — slugs mirror the web app's CATEGORIES constant ─────────────

const CATEGORIES: SeedCategory[] = [
  { slug: 'mobiles-tablets', name: 'Mobiles & Tablets', icon: 'Smartphone', subcategories: ['Smartphones', 'Tablets', 'Feature Phones', 'Mobile Accessories', 'Cases & Covers', 'Screen Protectors', 'Power Banks', 'Chargers & Cables'] },
  { slug: 'electronics', name: 'Electronics', icon: 'Laptop', subcategories: ['Laptops', 'Headphones & Earbuds', 'Cameras', 'Smart Watches', 'Speakers', 'Gaming Consoles', 'Drones', 'Storage Devices'] },
  { slug: 'fashion', name: 'Fashion', icon: 'Shirt', subcategories: ['Men\'s Clothing', 'Women\'s Clothing', 'Kids\' Wear', 'Ethnic Wear', 'Winter Wear', 'Sportswear', 'Innerwear', 'Accessories'] },
  { slug: 'beauty', name: 'Beauty & Personal Care', icon: 'Sparkles', subcategories: ['Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Personal Care', 'Men\'s Grooming', 'Bath & Body', 'Luxury Beauty'] },
  { slug: 'home-kitchen', name: 'Home & Kitchen', icon: 'Sofa', subcategories: ['Kitchen Appliances', 'Cookware', 'Décor', 'Bedding', 'Storage & Organisation', 'Lighting', 'Dining & Serving', 'Cleaning Supplies'] },
  { slug: 'appliances', name: 'Appliances', icon: 'Tv', subcategories: ['TVs', 'Washing Machines', 'Refrigerators', 'Air Conditioners', 'Microwaves', 'Water Purifiers', 'Chimneys & Hobs', 'Geysers'] },
  { slug: 'furniture', name: 'Furniture', icon: 'Armchair', subcategories: ['Living Room', 'Bedroom', 'Dining', 'Office Furniture', 'Outdoor', 'Mattresses', 'Kids Furniture', 'Storage'] },
  { slug: 'sports', name: 'Sports & Fitness', icon: 'Dumbbell', subcategories: ['Gym Equipment', 'Running Shoes', 'Cricket', 'Football', 'Yoga & Meditation', 'Cycling', 'Swimming', 'Nutrition & Supplements'] },
  { slug: 'books', name: 'Books & Stationery', icon: 'BookOpen', subcategories: ['Fiction', 'Non-Fiction', 'Academic & Textbooks', 'Self-Help', 'Comics & Manga', 'eBooks & Audiobooks', 'Stationery', 'Art Supplies'] },
  { slug: 'toys-baby', name: 'Toys & Baby Products', icon: 'Baby', subcategories: ['Toys & Games', 'Baby Gear', 'Diapers & Wipes', 'Feeding Essentials', 'Nursery', 'School Supplies', 'Remote Control Toys', 'Educational Toys'] },
  { slug: 'automotive', name: 'Automotive Accessories', icon: 'Car', subcategories: ['Car Accessories', 'Bike Accessories', 'Helmets', 'Car Electronics', 'Oils & Fluids', 'Tools & Equipment', 'Tyre & Alloys', 'Car Care'] },
  { slug: 'health-wellness', name: 'Health & Wellness', icon: 'Heart', subcategories: ['Vitamins & Supplements', 'Ayurvedic', 'Fitness Devices', 'Medical Devices', 'Health Drinks', 'Immunity Boosters', 'Weight Management', 'Elder Care'] },
  { slug: 'watches', name: 'Watches & Accessories', icon: 'Watch', subcategories: ['Men\'s Watches', 'Women\'s Watches', 'Smartwatches', 'Luxury Watches', 'Sunglasses', 'Belts', 'Wallets', 'Jewellery'] },
  { slug: 'bags-travel', name: 'Bags & Travel', icon: 'Briefcase', subcategories: ['Backpacks', 'Handbags', 'Luggage', 'Travel Accessories', 'Laptop Bags', 'Duffel Bags', 'Wallets & Clutches', 'Waist Bags'] },
  { slug: 'footwear', name: 'Footwear', icon: 'Footprints', subcategories: ['Men\'s Casual', 'Men\'s Formal', 'Women\'s Flats', 'Women\'s Heels', 'Sports Shoes', 'Sandals & Slippers', 'Kids\' Shoes', 'Boots'] },
  { slug: 'computers', name: 'Computers & Accessories', icon: 'Monitor', subcategories: ['Desktops', 'Monitors', 'Keyboards & Mice', 'Printers', 'Routers', 'External Storage', 'PC Components', 'Software'] },
  { slug: 'office-supplies', name: 'Office Supplies', icon: 'Paperclip', subcategories: ['Writing Instruments', 'Paper Products', 'Filing & Organisation', 'Desk Accessories', 'Labels & Tapes', 'Presentation Supplies', 'Binding & Laminating', 'Break Room Supplies'] },
  { slug: 'pet-supplies', name: 'Pet Supplies', icon: 'PawPrint', subcategories: ['Dog Food', 'Cat Food', 'Pet Toys', 'Grooming', 'Beds & Furniture', 'Collars & Leashes', 'Health & Wellness', 'Aquarium Supplies'] },
  { slug: 'baby-care', name: 'Baby Care', icon: 'BabyIcon', subcategories: ['Diapers', 'Baby Food', 'Bathing & Skincare', 'Clothing', 'Strollers & Carriers', 'Cribs & Bedding', 'Safety & Proofing', 'Feeding Bottles'] },
  { slug: 'grocery-essentials', name: 'Grocery Essentials', icon: 'ShoppingBasket', subcategories: ['Snacks & Beverages', 'Dry Fruits & Nuts', 'Cooking Essentials', 'Breakfast & Cereals', 'Packaged Foods', 'Personal Care', 'Cleaning & Household', 'Pet Food'] },
];

// ── Hand-curated flagship products ──────────────────────────────────────────

const CURATED_PRODUCTS: SeedProduct[] = [
  { name: 'MacBook Air M3 256GB', shortDescription: 'M3 chip, 15.3 inch Liquid Retina, 18-hour battery', mrp: 114900, categorySlug: 'electronics', subcategoryLabel: 'Laptops', brandSlug: 'apple', rating: 4.8, reviewCount: 2400 },
  { name: 'Galaxy S24 Ultra 512GB', shortDescription: 'AI phone with 200MP camera, S Pen, titanium frame', mrp: 134999, categorySlug: 'mobiles-tablets', subcategoryLabel: 'Smartphones', brandSlug: 'samsung', rating: 4.7, reviewCount: 1800 },
  { name: 'Sony WH-1000XM5', shortDescription: 'Industry-leading ANC wireless headphones', mrp: 34990, categorySlug: 'electronics', subcategoryLabel: 'Headphones & Earbuds', brandSlug: 'sony', rating: 4.9, reviewCount: 3100 },
  { name: 'LG C4 65 inch OLED TV', shortDescription: 'Self-lit OLED, a9 AI Processor, webOS', mrp: 214990, categorySlug: 'appliances', subcategoryLabel: 'TVs', brandSlug: 'lg', rating: 4.6, reviewCount: 560 },
  { name: 'Nike Air Max 90', shortDescription: 'Iconic running shoes with visible Air cushioning', mrp: 12995, categorySlug: 'footwear', subcategoryLabel: 'Sports Shoes', brandSlug: 'nike', rating: 4.5, reviewCount: 4200 },
  { name: 'Adidas Ultraboost 24', shortDescription: 'Energy-returning shoe with BOOST midsole', mrp: 18999, categorySlug: 'sports', subcategoryLabel: 'Running Shoes', brandSlug: 'adidas', rating: 4.6, reviewCount: 2800 },
  { name: 'Nike Dri-FIT Training Tee', shortDescription: 'Moisture-wicking performance training t-shirt', mrp: 2495, categorySlug: 'fashion', subcategoryLabel: 'Sportswear', brandSlug: 'nike', rating: 4.3, reviewCount: 1500 },
  { name: 'Dyson V15 Detect', shortDescription: 'Laser-guided cordless vacuum, HEPA, 60-min runtime', mrp: 62900, categorySlug: 'home-kitchen', subcategoryLabel: 'Cleaning Supplies', brandSlug: 'dyson', rating: 4.8, reviewCount: 1200 },
  { name: 'IKEA KALLAX Shelf Unit', shortDescription: '4x4 modular shelf, white, versatile storage', mrp: 9990, categorySlug: 'furniture', subcategoryLabel: 'Storage', brandSlug: 'ikea', rating: 4.5, reviewCount: 3400 },
  { name: 'L\'Oreal Revitalift Serum', shortDescription: 'Hyaluronic acid serum 30ml, anti-aging hydration', mrp: 899, categorySlug: 'beauty', subcategoryLabel: 'Skincare', brandSlug: 'loreal', rating: 4.5, reviewCount: 5600 },
  { name: 'LEGO Technic Bugatti Chiron', shortDescription: '3599 pieces, 1:8 scale, authentic replica', mrp: 34999, categorySlug: 'toys-baby', subcategoryLabel: 'Toys & Games', brandSlug: 'lego', rating: 4.9, reviewCount: 1200 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents (Décor -> Decor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Deterministic pseudo-price so re-seeding never shifts catalog numbers. */
function stableInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min + 1));
}

async function post(path: string, body: unknown): Promise<any | null> {
  if (authRejected) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
      // Every subsequent write would fail the same way — stop trying.
      authRejected = true;
      return null;
    }
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function reportAuthFailure(): void {
  console.log('\n❌ The catalog write endpoints rejected the request (401/403).');
  console.log('   They require a JWT with the ADMIN or SUPER_ADMIN role.');
  console.log('   Provide one and re-run:');
  console.log('     SEED_ADMIN_TOKEN=<jwt> npx ts-node apps/api/scripts/seed-marketplace.ts\n');
  process.exitCode = 1;
}

async function get(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Fill every category with products so no category page comes up empty. */
function buildGeneratedProducts(): SeedProduct[] {
  const tiers = ['Premium', 'Essential'];
  const out: SeedProduct[] = [];
  CATEGORIES.forEach((cat, catIndex) => {
    cat.subcategories.slice(0, tiers.length).forEach((sub, subIndex) => {
      const brand = BRANDS[(catIndex + subIndex) % BRANDS.length];
      const name = `${sub} — ${tiers[subIndex]} Pick`;
      out.push({
        name,
        shortDescription: `${tiers[subIndex]} ${sub.toLowerCase()} selection from ${cat.name}.`,
        mrp: stableInt(`${cat.slug}:${sub}`, 499, 89999),
        categorySlug: cat.slug,
        subcategoryLabel: sub,
        brandSlug: brand.slug,
        rating: 3.8 + (stableInt(name, 0, 11) / 10),
        reviewCount: stableInt(`rc:${name}`, 12, 4800),
      });
    });
  });
  return out;
}

// ── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 KartSeek Marketplace Seed');
  console.log(`   Target: ${BASE}\n`);

  const alive = await get('/health');
  if (!alive) {
    console.log('❌ Marketplace service is not reachable.');
    console.log('   Start it with:  npm run start:marketplace  (from apps/api)');
    console.log('   Or set MARKETPLACE_SERVICE_URL to its base URL.\n');
    process.exitCode = 1;
    return;
  }

  // /health is a static payload and stays green when the database is down, so
  // probe a DB-backed read too — otherwise every write below fails opaquely.
  const dbReady = await get('/categories');
  if (!dbReady) {
    console.log('❌ The service is running but its database is not answering.');
    console.log('   GET /marketplace/categories failed — check Postgres/Redis:');
    console.log('     npm run docker:infra   (from apps/api)\n');
    process.exitCode = 1;
    return;
  }

  if (!ADMIN_TOKEN) {
    console.log('⚠️  SEED_ADMIN_TOKEN is not set. The catalog write endpoints');
    console.log('    require an ADMIN/SUPER_ADMIN JWT and will reject every write.\n');
  }

  // 1. Brands ───────────────────────────────────────────────────────────────
  console.log('🏷️  Brands');
  const brandIds = new Map<string, string>();
  for (const brand of BRANDS) {
    const created = await post('/brands', brand);
    if (authRejected) return reportAuthFailure();
    if (created?.id) {
      brandIds.set(brand.slug, created.id);
      console.log(`   ✅ ${brand.name}`);
      continue;
    }
    // Already present (slug is unique) — resolve the existing row.
    const list = await get('/brands');
    const found = (list?.data ?? []).find((b: any) => b.slug === brand.slug);
    if (found?.id) {
      brandIds.set(brand.slug, found.id);
      console.log(`   ↺ ${brand.name} (exists)`);
    } else {
      console.log(`   ⚠️  ${brand.name} — could not create or resolve`);
    }
  }

  // 2. Categories + subcategory tree children ──────────────────────────────
  console.log('\n📂 Categories');
  const categoryIds = new Map<string, string>();
  const subcategoryIds = new Map<string, string>();

  for (const [index, cat] of CATEGORIES.entries()) {
    const created = await post('/categories', {
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      sortOrder: index,
      isActive: true,
    });
    // getCategoryById accepts a slug, so the fallback lookup is a direct hit.
    const resolved = created?.id ? created : await get(`/categories/${cat.slug}`);
    if (!resolved?.id) {
      console.log(`   ⚠️  ${cat.name} — could not create or resolve`);
      continue;
    }
    categoryIds.set(cat.slug, resolved.id);
    console.log(`   ${created?.id ? '✅' : '↺'} ${cat.name}`);

    for (const [subIndex, sub] of cat.subcategories.entries()) {
      // Subcategory slugs share one unique index with categories, and labels
      // like "Accessories" recur across categories — prefix with the parent.
      const subSlug = `${cat.slug}-${slugify(sub)}`;
      const subCreated = await post('/subcategories', {
        name: sub,
        slug: subSlug,
        parentId: resolved.id,
        sortOrder: subIndex,
        isActive: true,
      });
      const subResolved = subCreated?.id ? subCreated : await get(`/categories/${subSlug}`);
      if (subResolved?.id) subcategoryIds.set(`${cat.slug}::${sub}`, subResolved.id);
    }
    console.log(`      └ ${cat.subcategories.length} subcategories`);
  }

  // 3. Products ─────────────────────────────────────────────────────────────
  const products = [...CURATED_PRODUCTS, ...buildGeneratedProducts()];
  console.log(`\n🛍️  Products (${products.length})`);
  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const categoryId = categoryIds.get(product.categorySlug);
    const brandId = brandIds.get(product.brandSlug);
    if (!categoryId) {
      console.log(`   ⚠️  ${product.name} — unknown category '${product.categorySlug}'`);
      skipped++;
      continue;
    }
    const slug = slugify(product.name);
    const subcategoryId = product.subcategoryLabel
      ? subcategoryIds.get(`${product.categorySlug}::${product.subcategoryLabel}`)
      : undefined;

    const res = await post('/products', {
      name: product.name,
      slug,
      // Unique + NOT NULL on the entity; derive it so re-runs stay stable.
      globalTradeItemNumber: `KS-${slug}`.slice(0, 64),
      short_description: product.shortDescription,
      mrp: product.mrp,
      category: { id: categoryId },
      ...(subcategoryId ? { subcategory: { id: subcategoryId } } : {}),
      ...(brandId ? { brand: { id: brandId } } : {}),
      averageRating: Number(product.rating.toFixed(1)),
      reviewCount: product.reviewCount,
      status: 'ACTIVE',
      // Listings filter on APPROVED; the column defaults to PENDING, so seeded
      // products are invisible in every product list without this.
      approval_status: 'APPROVED',
      is_active: true,
    });
    if (res?.productId || res?.success) created++;
    else skipped++;
  }

  console.log(`   ✅ ${created} created   ⚠️  ${skipped} skipped/existing`);
  console.log(`\n✅ Seed complete — ${brandIds.size} brands, ${categoryIds.size} categories, ${subcategoryIds.size} subcategories, ${created} products`);
}

seed().catch(console.error);
