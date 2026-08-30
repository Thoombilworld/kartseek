/**
 * KARTSEEK Franchise — Database Seed Script
 * ──────────────────────────────────────────
 * Populates the franchise tables with realistic test data for dev/staging.
 * Also links existing sellers, stores, restaurants, pharmacies, and clinics
 * to franchise zones via franchise_id.
 *
 * Usage:
 *   npx ts-node scripts/seed-franchise.ts
 *
 * Prerequisites:
 *   - PostgreSQL running (npm run infra:up)
 *   - Database `kartseek_db` exists
 *   - Tables created via TypeORM synchronize or migrations
 *   - Run AFTER seed-marketplace, seed-grocery, seed-restaurant, seed-pharmacy, seed-doctor
 */

import { DataSource } from 'typeorm';
import { Franchise } from '../apps/franchise-service/src/entities/franchise.entity';
// `sellers` is owned by marketplace-service — seed against its real entity, not a
// franchise-local shadow of it. The old FranchiseSeller shadow declared columns
// (revenue, category, location, total_products, total_orders, returns_percentage)
// that the table has never had.
import { Seller } from '../apps/marketplace-service/src/entities/seller.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.DB_NAME || 'kartseek_db',
  entities: [Franchise, Seller],
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();
  console.log('✅ Connected.\n');

  const franchiseRepo = AppDataSource.getRepository(Franchise);
  const sellerRepo = AppDataSource.getRepository(Seller);

  // ── 1. Franchise Records ──────────────────────────────────────────────────
  console.log('🏢 Seeding franchise records...');
  const franchiseData = [
    {
      id: 'FR-001',
      ownerId: 'USR-FRANCHISE-001',
      businessName: 'Mumbai South Franchise Pvt Ltd',
      countryCode: 'IN',
      operationalZones: ['Colaba', 'Fort', 'Churchgate', 'Marine Drive', 'Nariman Point', 'Cuffe Parade', 'Breach Candy', 'Worli'],
      commissionRates: { grocery: 10, restaurant: 15, pharmacy: 10, marketplace: 8, doctor: 10, taxi: 20, hotel: 12 },
      status: 'active',
    },
    {
      id: 'FR-002',
      ownerId: 'USR-FRANCHISE-002',
      businessName: 'Bandra West Premium Zone',
      countryCode: 'IN',
      operationalZones: ['Bandra West', 'Bandra East', 'Khar', 'Santacruz', 'Linking Road'],
      commissionRates: { grocery: 10, restaurant: 15, pharmacy: 10, marketplace: 8, doctor: 10, taxi: 20, hotel: 12 },
      status: 'active',
    },
    {
      id: 'FR-003',
      ownerId: 'USR-FRANCHISE-003',
      businessName: 'Andheri-Powai Tech Corridor',
      countryCode: 'IN',
      operationalZones: ['Andheri East', 'Andheri West', 'Powai', 'Chandivali', 'Jogeshwari'],
      commissionRates: { grocery: 10, restaurant: 15, pharmacy: 10, marketplace: 8, doctor: 10, taxi: 20, hotel: 12 },
      status: 'active',
    },
    {
      id: 'FR-004',
      ownerId: 'USR-FRANCHISE-004',
      businessName: 'Juhu-Versova Coastal Zone',
      countryCode: 'IN',
      operationalZones: ['Juhu', 'Versova', 'Andheri West', 'Lokhandwala'],
      commissionRates: { grocery: 10, restaurant: 12, pharmacy: 10, marketplace: 8, doctor: 10, taxi: 20, hotel: 15 },
      status: 'active',
    },
    {
      id: 'FR-005',
      ownerId: 'USR-FRANCHISE-005',
      businessName: 'Thane City Franchise',
      countryCode: 'IN',
      operationalZones: ['Thane West', 'Thane East', 'Ghodbunder Road', 'Majiwada'],
      commissionRates: { grocery: 8, restaurant: 12, pharmacy: 8, marketplace: 6, doctor: 8, taxi: 18, hotel: 10 },
      status: 'active',
    },
    {
      id: 'FR-006',
      ownerId: 'USR-FRANCHISE-006',
      businessName: 'Pune Central Franchise',
      countryCode: 'IN',
      operationalZones: ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Hinjewadi'],
      commissionRates: { grocery: 10, restaurant: 15, pharmacy: 10, marketplace: 8, doctor: 10, taxi: 20, hotel: 12 },
      status: 'pending',
    },
  ];

  for (const fd of franchiseData) {
    const exists = await franchiseRepo.findOne({ where: { id: fd.id } });
    if (exists) {
      await franchiseRepo.update(fd.id, fd);
    } else {
      await franchiseRepo.save(franchiseRepo.create(fd));
    }
  }
  console.log(`   ✅ ${franchiseData.length} franchise records upserted.\n`);

  // ── 2. Link Sellers to Franchise FR-001 ───────────────────────────────────
  console.log('🔗 Linking sellers to franchise zones...');

  // Create franchise-linked sellers (with marketplace data)
  const sellerData = [
    { businessName: 'TechZone Electronics', storeSlug: 'techzone-electronics', totalProducts: 450, totalOrders: 1280, verificationStatus: 'VERIFIED', sellerRating: 4.8, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'FashionHub Mumbai', storeSlug: 'fashionhub-mumbai', totalProducts: 1200, totalOrders: 3420, verificationStatus: 'VERIFIED', sellerRating: 4.6, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'HomeStyle Decor', storeSlug: 'homestyle-decor', totalProducts: 380, totalOrders: 890, verificationStatus: 'VERIFIED', sellerRating: 4.5, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'BookWorld Store', storeSlug: 'bookworld-store', totalProducts: 2200, totalOrders: 1650, verificationStatus: 'VERIFIED', sellerRating: 4.4, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'HealthFirst Pharmacy', storeSlug: 'healthfirst-pharmacy', totalProducts: 850, totalOrders: 2100, verificationStatus: 'VERIFIED', sellerRating: 4.7, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'SportsFit India', storeSlug: 'sportsfit-india', totalProducts: 620, totalOrders: 980, verificationStatus: 'VERIFIED', sellerRating: 4.3, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'GadgetPro', storeSlug: 'gadgetpro', totalProducts: 180, totalOrders: 4200, verificationStatus: 'VERIFIED', sellerRating: 4.9, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'BeautyBliss', storeSlug: 'beautybliss', totalProducts: 920, totalOrders: 1800, verificationStatus: 'VERIFIED', sellerRating: 4.2, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'Fresh Organics', storeSlug: 'fresh-organics', totalProducts: 0, totalOrders: 0, verificationStatus: 'PENDING', sellerRating: 0, franchiseId: 'FR-001', regionCode: 'IN'},
    { businessName: 'PetCare World', storeSlug: 'petcare-world', totalProducts: 150, totalOrders: 320, verificationStatus: 'SUSPENDED', sellerRating: 3.1, franchiseId: 'FR-001', regionCode: 'IN'},
    // FR-002 sellers
    { businessName: 'Bandra Electronics', storeSlug: 'bandra-electronics', totalProducts: 320, totalOrders: 980, verificationStatus: 'VERIFIED', sellerRating: 4.5, franchiseId: 'FR-002', regionCode: 'IN'},
    { businessName: 'Khar Fashion House', storeSlug: 'khar-fashion', totalProducts: 890, totalOrders: 2400, verificationStatus: 'VERIFIED', sellerRating: 4.7, franchiseId: 'FR-002', regionCode: 'IN'},
    { businessName: 'Santacruz Groceries', storeSlug: 'santacruz-groceries', totalProducts: 1500, totalOrders: 5200, verificationStatus: 'VERIFIED', sellerRating: 4.3, franchiseId: 'FR-002', regionCode: 'IN'},
    // FR-003 sellers
    { businessName: 'Powai Tech Hub', storeSlug: 'powai-tech-hub', totalProducts: 550, totalOrders: 3200, verificationStatus: 'VERIFIED', sellerRating: 4.8, franchiseId: 'FR-003', regionCode: 'IN'},
    { businessName: 'Andheri Food Court', storeSlug: 'andheri-food-court', totalProducts: 200, totalOrders: 8500, verificationStatus: 'VERIFIED', sellerRating: 4.4, franchiseId: 'FR-003', regionCode: 'IN'},
  ];

  for (const sd of sellerData) {
    const exists = await sellerRepo.findOne({ where: { businessName: sd.businessName } });
    if (exists) {
      await sellerRepo.update(exists.id, sd);
    } else {
      await sellerRepo.save(sellerRepo.create(sd as any));
    }
  }
  console.log(`   ✅ ${sellerData.length} franchise sellers upserted.\n`);

  // ── 3. Link existing stores/restaurants/pharmacies/clinics ────────────────
  console.log('🔗 Linking cross-module entities to franchise zones...');

  // Update grocery_stores with franchise_id
  try {
    const groceryResult = await AppDataSource.query(`
      UPDATE grocery_stores SET franchise_id = 'FR-001'
      WHERE franchise_id IS NULL AND id IN (
        SELECT id FROM grocery_stores ORDER BY created_at LIMIT 3
      )
    `);
    console.log(`   ✅ Grocery stores linked: ${groceryResult?.[1] || 'updated'}`);
  } catch (e: any) { console.log(`   ⚠️  Grocery stores: ${e.message?.substring(0, 80)}`); }

  // Update restaurants with franchise_id
  try {
    const restResult = await AppDataSource.query(`
      UPDATE restaurants SET franchise_id = 'FR-001'
      WHERE franchise_id IS NULL AND id IN (
        SELECT id FROM restaurants ORDER BY created_at LIMIT 4
      )
    `);
    console.log(`   ✅ Restaurants linked: ${restResult?.[1] || 'updated'}`);
  } catch (e: any) { console.log(`   ⚠️  Restaurants: ${e.message?.substring(0, 80)}`); }

  // Update pharmacy_stores with franchise_id
  try {
    const pharmaResult = await AppDataSource.query(`
      UPDATE pharmacy_stores SET franchise_id = 'FR-001'
      WHERE franchise_id IS NULL AND id IN (
        SELECT id FROM pharmacy_stores ORDER BY created_at LIMIT 3
      )
    `);
    console.log(`   ✅ Pharmacy stores linked: ${pharmaResult?.[1] || 'updated'}`);
  } catch (e: any) { console.log(`   ⚠️  Pharmacy stores: ${e.message?.substring(0, 80)}`); }

  // Update clinics with franchise_id
  try {
    const clinicResult = await AppDataSource.query(`
      UPDATE clinics SET franchise_id = 'FR-001'
      WHERE franchise_id IS NULL AND id IN (
        SELECT id FROM clinics ORDER BY created_at LIMIT 3
      )
    `);
    console.log(`   ✅ Clinics linked: ${clinicResult?.[1] || 'updated'}`);
  } catch (e: any) { console.log(`   ⚠️  Clinics: ${e.message?.substring(0, 80)}`); }

  console.log('\n──────────────────────────────────────────────');
  console.log('🎉 Franchise seed completed successfully!');
  console.log('──────────────────────────────────────────────');
  console.log(`   Franchises:  ${franchiseData.length}`);
  console.log(`   Sellers:     ${sellerData.length}`);
  console.log('   Cross-links: grocery, restaurant, pharmacy, clinics');
  console.log('──────────────────────────────────────────────\n');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
