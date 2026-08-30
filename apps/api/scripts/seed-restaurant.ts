/**
 * KARTSEEK Restaurant — Database Seed Script
 * ─────────────────────────────────────────────
 * Populates the restaurant tables with realistic African restaurant data.
 * Uses the API Gateway entity for the `restaurants` table (source of truth)
 * and raw SQL for sub-tables (menu_categories, menu_items, restaurant_tables,
 * restaurant_staff, restaurant_reviews, restaurant_promotions, restaurant_orders,
 * reservations) since these were created by the restaurant-service entities.
 *
 * Idempotent — safe to re-run (checks for existing data before inserting).
 *
 * Usage:
 *   npx ts-node scripts/seed-restaurant.ts
 */

import { DataSource } from 'typeorm';
import { Restaurant } from '../../../modules/restaurant/backend/src/entities/restaurant.entity';
import { MenuItem } from '../../../modules/restaurant/backend/src/entities/menu-item.entity';

import * as path from 'path';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  // This vertical owns its own database now. Seeding kartseek_db would write
  // rows the service never reads, and leave the module looking empty.
  database: process.env.RESTAURANT_DB_NAME ?? process.env.DB_NAME ?? 'kartseek_restaurant',
  // Without this the seed connects on the default search_path and writes to
  // `public`, while every service reads its own schema -- so seeding "succeeded"
  // (8 restaurants, 160 menu items) and the storefront stayed empty. Combined
  // with `synchronize: true` below, the seed was also *creating* the shadow
  // public.* tables that then masquerade as the real ones.
  schema: 'restaurant',
  entities: [path.join(__dirname, '../../../modules/restaurant/backend/src/entities/*.entity.{ts,js}')],
  synchronize: true,
  logging: false,
});

// ── Data ──────────────────────────────────────────────────────────────────────

const RESTAURANTS = [
  { name: 'Tandoori Palace',   slug: 'tandoori-palace',   cuisines: 'Indian,Grill,BBQ',        address: 'MG Road, Mumbai Central', latitude: 19.0760, longitude: 72.8777, regionCode: 'IN-MH' },
  { name: 'Mama Ashanti Kitchen', slug: 'mama-ashanti-kitchen', cuisines: 'Ghanaian,West African',    address: 'Osu Oxford Street, Accra',     latitude: 5.5560, longitude: -0.1870, regionCode: 'GH-AA' },
  { name: 'Suya Republic',        slug: 'suya-republic',        cuisines: 'Nigerian,Suya,Street Food', address: 'Allen Avenue, Ikeja, Lagos',   latitude: 6.6018, longitude: 3.3515, regionCode: 'NG-LA' },
  { name: 'The Dhaba',        slug: 'the-dhaba',        cuisines: 'Indian,Mughlai,Grill',    address: 'Western Express Highway, Mumbai',        latitude: 19.0596, longitude: 72.8295, regionCode: 'IN-MH' },
  { name: 'Jollof Junction',      slug: 'jollof-junction',      cuisines: 'Nigerian,Jollof,Rice',     address: 'Victoria Island, Lagos',       latitude: 6.4281, longitude: 3.4219, regionCode: 'NG-LA' },
  { name: 'Kilimanjaro Bites',    slug: 'kilimanjaro-bites',    cuisines: 'Tanzanian,East African',    address: 'Samora Avenue, Dar es Salaam', latitude: -6.8160, longitude: 39.2803, regionCode: 'TZ-DA' },
  { name: 'Ethiopian Flavors',    slug: 'ethiopian-flavors',    cuisines: 'Ethiopian,Injera,Vegan',    address: 'Bole Road, Addis Ababa',       latitude: 9.0054, longitude: 38.7636, regionCode: 'ET-AA' },
  { name: 'Cape Malay Kitchen',   slug: 'cape-malay-kitchen',   cuisines: 'South African,Cape Malay',  address: 'Bo-Kaap, Cape Town',           latitude: -33.9218, longitude: 18.4167, regionCode: 'ZA-WC' },
];

const MENU_CATEGORIES = [
  { name: 'Starters', slug: 'starters', description: 'Appetizers and small bites', sortOrder: 1 },
  { name: 'Main Course', slug: 'main-course', description: 'Hearty main dishes', sortOrder: 2 },
  { name: 'Grills & BBQ', slug: 'grills-bbq', description: 'Grilled meats and skewers', sortOrder: 3 },
  { name: 'Rice & Sides', slug: 'rice-sides', description: 'Rice dishes and accompaniments', sortOrder: 4 },
  { name: 'Soups & Stews', slug: 'soups-stews', description: 'Traditional soups and stews', sortOrder: 5 },
  { name: 'Desserts', slug: 'desserts', description: 'Sweet endings', sortOrder: 6 },
  { name: 'Beverages', slug: 'beverages', description: 'Drinks and refreshments', sortOrder: 7 },
  { name: 'Breakfast', slug: 'breakfast', description: 'Morning meals', sortOrder: 8 },
];

const MENU_ITEMS = [
  { name: 'Nyama Choma (500g)',     category: 'Grills & BBQ', basePrice: 850,  dietType: 'NON_VEG', isBestseller: true,  description: 'Signature grilled goat meat with kachumbari' },
  { name: 'Ugali & Sukuma Wiki',    category: 'Main Course',  basePrice: 350,  dietType: 'VEG',     isBestseller: false, description: 'Traditional maize meal with collard greens' },
  { name: 'Pilau Rice',             category: 'Rice & Sides', basePrice: 450,  dietType: 'NON_VEG', isBestseller: true,  description: 'Spiced rice with meat and aromatic spices' },
  { name: 'Samosa (6 pcs)',         category: 'Starters',     basePrice: 250,  dietType: 'NON_VEG', isBestseller: false, description: 'Crispy pastry filled with spiced minced meat' },
  { name: 'Jollof Rice',            category: 'Rice & Sides', basePrice: 500,  dietType: 'VEG',     isBestseller: true,  description: 'West African tomato rice cooked to perfection' },
  { name: 'Suya Skewers (5 pcs)',   category: 'Grills & BBQ', basePrice: 650,  dietType: 'NON_VEG', isBestseller: true,  description: 'Spicy grilled beef skewers with yaji spice' },
  { name: 'Pepper Soup',            category: 'Soups & Stews', basePrice: 400, dietType: 'NON_VEG', isBestseller: false, description: 'Spicy broth with catfish and local herbs' },
  { name: 'Chapati & Beans',        category: 'Main Course',  basePrice: 300,  dietType: 'VEG',     isBestseller: false, description: 'Flatbread served with spiced kidney beans' },
  { name: 'Grilled Tilapia',        category: 'Main Course',  basePrice: 750,  dietType: 'NON_VEG', isBestseller: true,  description: 'Whole grilled tilapia with lemon herbs' },
  { name: 'Mandazi (4 pcs)',        category: 'Desserts',     basePrice: 150,  dietType: 'VEG',     isBestseller: false, description: 'East African doughnuts with cardamom' },
  { name: 'Fresh Passion Juice',    category: 'Beverages',    basePrice: 200,  dietType: 'VEGAN',   isBestseller: false, description: 'Freshly squeezed passion fruit juice' },
  { name: 'Mango Lassi',            category: 'Beverages',    basePrice: 250,  dietType: 'VEG',     isBestseller: false, description: 'Creamy mango yogurt drink' },
  { name: 'Egusi Soup',             category: 'Soups & Stews', basePrice: 550, dietType: 'NON_VEG', isBestseller: true,  description: 'Melon seed soup with spinach and assorted meat' },
  { name: 'Pounded Yam',            category: 'Main Course',  basePrice: 400,  dietType: 'VEG',     isBestseller: false, description: 'Smooth yam dough, perfect with any soup' },
  { name: 'Injera Combo Platter',   category: 'Main Course',  basePrice: 900,  dietType: 'VEG',     isBestseller: true,  description: 'Ethiopian sourdough with 5 vegetable stews' },
  { name: 'Doro Wot',               category: 'Main Course',  basePrice: 700,  dietType: 'NON_VEG', isBestseller: true,  description: 'Ethiopian chicken stew with berbere spice' },
  { name: 'Bobotie',                category: 'Main Course',  basePrice: 600,  dietType: 'NON_VEG', isBestseller: false, description: 'South African spiced mince with egg custard' },
  { name: 'Bunny Chow',             category: 'Main Course',  basePrice: 450,  dietType: 'NON_VEG', isBestseller: true,  description: 'Durban-style curry served in a bread loaf' },
  { name: 'Chai Tea',               category: 'Beverages',    basePrice: 100,  dietType: 'VEG',     isBestseller: false, description: 'Indian masala tea with milk and spices' },
  { name: 'Full African Breakfast', category: 'Breakfast',    basePrice: 550,  dietType: 'NON_VEG', isBestseller: false, description: 'Eggs, sausage, toast, beans, and fresh juice' },
];

async function seed() {
  console.log('🍽️  Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected.\n');

  const restaurantRepo = ds.getRepository(Restaurant);
  const menuItemRepo = ds.getRepository(MenuItem);
  const qr = ds.createQueryRunner();

  let totalRestaurants = 0, totalCategories = 0, totalItems = 0;
  let totalTables = 0, totalStaff = 0, totalReviews = 0;
  let totalPromos = 0, totalOrders = 0, totalReservations = 0;

  // ── Seed Restaurants ────────────────────────────────────────────────────────
  const savedRestaurants: Restaurant[] = [];
  for (const data of RESTAURANTS) {
    let restaurant = await restaurantRepo.findOneBy({ slug: data.slug });
    if (!restaurant) {
      restaurant = restaurantRepo.create({
        name: data.name,
        slug: data.slug,
        ownerId: 'user-rest-' + (totalRestaurants + 1),
        cuisines: data.cuisines.split(','),
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        isOnline: true,
        isDeliveryAvailable: true,
        isTakeawayAvailable: true,
        isTableBookingAvailable: true,
        rating: +(3.5 + Math.random() * 1.5).toFixed(1),
        reviewCount: Math.floor(50 + Math.random() * 200),
        status: 'APPROVED',
        regionCode: data.regionCode,
      } as any) as unknown as Restaurant;
      restaurant = await restaurantRepo.save(restaurant);
      console.log(`✅ Created restaurant: ${data.name}`);
    } else {
      console.log(`⏭️  Restaurant exists: ${data.name}`);
    }
    savedRestaurants.push(restaurant);
    totalRestaurants++;
  }

  // ── Seed Menu Categories (raw SQL — no gateway entity) ──────────────────────
  for (const rest of savedRestaurants) {
    for (const cat of MENU_CATEGORIES) {
      const existing = await qr.query(
        `SELECT id FROM restaurant.menu_categories WHERE restaurant_id = $1 AND slug = $2`,
        [rest.id, cat.slug],
      );
      if (existing.length === 0) {
        await qr.query(
          `INSERT INTO restaurant.menu_categories (id, restaurant_id, name, slug, description, "sortOrder", "isActive", "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true, now(), now())`,
          [rest.id, cat.name, cat.slug, cat.description, cat.sortOrder],
        );
        totalCategories++;
      }
    }
  }
  console.log(`\n📂 ${totalCategories} menu categories seeded.`);

  // ── Seed Menu Items (gateway entity) ────────────────────────────────────────
  for (const rest of savedRestaurants) {
    for (const item of MENU_ITEMS) {
      const existing = await menuItemRepo
        .createQueryBuilder('mi')
        .where('mi.restaurantId = :rid AND mi.name = :name', { rid: rest.id, name: item.name })
        .getCount();
      if (existing === 0) {
        const catQuery = await qr.query(`SELECT id FROM restaurant.menu_categories WHERE restaurant_id = $1 AND slug = $2`, [rest.id, item.category]);
        const catId = catQuery.length > 0 ? catQuery[0].id : null;

        const menuItem = menuItemRepo.create({
          name: item.name,
          description: item.description,
          price: item.basePrice,
          dietaryType: item.dietType as any,
          categoryId: catId,
          isAvailable: true,
          tags: item.isBestseller ? ['Bestseller'] : [],
          restaurantId: rest.id,
        } as any);
        await menuItemRepo.save(menuItem);
        totalItems++;
      }
    }
  }
  console.log(`🍽️  ${totalItems} menu items seeded.`);

  // ── Seed Restaurant Tables (raw SQL) ────────────────────────────────────────
  const tableAreas = ['Indoor', 'Outdoor', 'Rooftop', 'Private'];
  for (const rest of savedRestaurants) {
    const existingTables = await qr.query(`SELECT count(*) as cnt FROM restaurant.restaurant_tables WHERE restaurant_id = $1`, [rest.id]);
    if (+existingTables[0].cnt === 0) {
      for (let i = 1; i <= 6; i++) {
        const area = tableAreas[Math.floor(Math.random() * tableAreas.length)];
        await qr.query(
          `INSERT INTO restaurant.restaurant_tables (id, restaurant_id, "tableNumber", capacity, area, shape, status, "isActive", "sortOrder", "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 'AVAILABLE', true, $6, now(), now())`,
          [rest.id, `T${i}`, 2 + Math.floor(Math.random() * 6), area, 'RECTANGLE', i],
        );
        totalTables++;
      }
    }
  }
  console.log(`🪑 ${totalTables} tables seeded.`);

  // ── Seed Restaurant Staff (raw SQL) ─────────────────────────────────────────
  const staffRoles = ['MANAGER', 'CHEF', 'WAITER'];
  for (const rest of savedRestaurants) {
    const existingStaff = await qr.query(`SELECT count(*) as cnt FROM restaurant.restaurant_staff WHERE restaurant_id = $1`, [rest.id]);
    if (+existingStaff[0].cnt === 0) {
      for (let i = 0; i < 3; i++) {
        await qr.query(
          `INSERT INTO restaurant.restaurant_staff (id, restaurant_id, "userId", name, email, phone, role, permissions, "isActive", "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(), $1, '', $2, $3, $4, $5, '[]', true, now(), now())`,
          [
            rest.id,
            `Staff ${i + 1} - ${rest.name.split(' ')[0]}`,
            `staff${i + 1}@${rest.slug}.com`,
            `+91700${String(100 + i).padStart(3, '0')}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
            staffRoles[i],
          ],
        );
        totalStaff++;
      }
    }
  }
  console.log(`👥 ${totalStaff} staff seeded.`);

  // ── Seed Restaurant Reviews (raw SQL) ───────────────────────────────────────
  const reviewTemplates = [
    { rating: 5, comment: 'Amazing food! The flavors were authentic and the service was excellent.' },
    { rating: 4, comment: 'Really good experience. The ambiance was great and food was tasty.' },
    { rating: 5, comment: 'Best African cuisine in the city. Will definitely come back!' },
    { rating: 3, comment: 'Good food but the wait was a bit long. Overall decent experience.' },
    { rating: 4, comment: 'Loved the grilled meats. Portions were generous and well-seasoned.' },
  ];
  for (const rest of savedRestaurants) {
    const existingReviews = await qr.query(`SELECT count(*) as cnt FROM restaurant.restaurant_reviews WHERE restaurant_id = $1`, [rest.id]);
    if (+existingReviews[0].cnt === 0) {
      for (let i = 0; i < 5; i++) {
        const tmpl = reviewTemplates[i % reviewTemplates.length];
        await qr.query(
          `INSERT INTO restaurant.restaurant_reviews (id, restaurant_id, "customerId", "customerName", "customerAvatar", "orderId", rating, comment, photos, "restaurantReply", "isFlagged", "isVisible", "createdAt")
           VALUES (uuid_generate_v4(), $1, $2, $3, '', '', $4, $5, '[]', null, false, true, now())`,
          [rest.id, `cust-${200 + i}`, `Customer ${i + 1}`, tmpl.rating, tmpl.comment],
        );
        totalReviews++;
      }
    }
  }
  console.log(`⭐ ${totalReviews} reviews seeded.`);

  // ── Seed Restaurant Promotions (raw SQL) ────────────────────────────────────
  for (const rest of savedRestaurants) {
    const existingPromos = await qr.query(`SELECT count(*) as cnt FROM restaurant.restaurant_promotions WHERE restaurant_id = $1`, [rest.id]);
    if (+existingPromos[0].cnt === 0) {
      await qr.query(
        `INSERT INTO restaurant.restaurant_promotions (id, restaurant_id, title, description, code, type, "discountValue", "minOrderAmount", "maxDiscount", "usageLimit", "usedCount", "perUserLimit", "validFrom", "validUntil", "isActive", "applicableItemIds", "applicableOrderType", "platformFunded", "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(), $1, 'Welcome 10% Off', 'Get 10% off on your first order', 'WELCOME10', 'PERCENTAGE', 10, 500, 200, 1000, 0, 1, now(), now() + interval '90 days', true, '', 'ALL', false, now(), now()),
                (uuid_generate_v4(), $1, 'Free Delivery', 'Free delivery on orders above 1000', 'FREEDEL', 'FLAT', 0, 1000, 0, 500, 0, 3, now(), now() + interval '60 days', true, '', 'DELIVERY', true, now(), now())`,
        [rest.id],
      );
      totalPromos += 2;
    }
  }
  console.log(`🎫 ${totalPromos} promotions seeded.`);

  // ── Seed Restaurant Orders (raw SQL) ────────────────────────────────────────
  const orderTypes = ['DELIVERY', 'TAKEAWAY', 'DINE_IN'];
  const paymentMethods = ['ONLINE', 'COD', 'WALLET'];
  const orderStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'DELIVERED', 'PREPARING'];
  for (const rest of savedRestaurants) {
    const existingOrders = await qr.query(`SELECT count(*) as cnt FROM restaurant.restaurant_orders WHERE restaurant_id = $1`, [rest.id]);
    if (+existingOrders[0].cnt === 0) {
      for (let i = 0; i < 3; i++) {
        const itemTotal = +(500 + Math.random() * 2000).toFixed(2);
        const deliveryFee = orderTypes[i % 3] === 'DELIVERY' ? 150 : 0;
        const tax = +(itemTotal * 0.16).toFixed(2);
        const grandTotal = +(itemTotal + deliveryFee + tax).toFixed(2);
        await qr.query(
          `INSERT INTO restaurant.restaurant_orders (id, "orderNumber", restaurant_id, "customerId", "driverId", "orderType", items, "itemTotal", "deliveryFee", "packagingFee", "platformFee", "taxAmount", tip, discount, "couponCode", "grandTotal", "paymentMethod", "paymentStatus", "paymentTransactionId", "deliveryAddress", "deliveryInstructions", "deliverySlot", "deliveryOtp", "scheduledPickupAt", "customerPhone", "tableId", "guestCount", status, "cancelReason", "cancelledBy", "orderNotes", "acceptedAt", "preparedAt", "pickedUpAt", "deliveredAt", "completedAt", "estimatedDeliveryAt", "idempotencyKey", "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(), $1, $2, $3, '', $4, '[]', $5, $6, 50, 30, $7, 0, 0, '', $8, $9, 'PAID', '', '{}', '', '{}', '', null, '', '', 0, $10, '', '', '', now(), now(), null, null, now(), null, $11, now(), now())`,
          [
            `ORD-${rest.slug.substring(0, 4).toUpperCase()}-${1000 + i}`,
            rest.id,
            `cust-${300 + i}`,
            orderTypes[i % 3],
            itemTotal,
            deliveryFee,
            tax,
            grandTotal,
            paymentMethods[i % 3],
            orderStatuses[i % orderStatuses.length],
            `idem-${rest.id.substring(0, 8)}-${i}`,
          ],
        );
        totalOrders++;
      }
    }
  }
  console.log(`📦 ${totalOrders} orders seeded.`);

  // ── Seed Reservations (raw SQL) ─────────────────────────────────────────────
  const occasions = ['Birthday', 'Anniversary', 'Business', 'Date Night', ''];
  for (const rest of savedRestaurants) {
    const existingRes = await qr.query(`SELECT count(*) as cnt FROM restaurant.reservations WHERE restaurant_id = $1`, [rest.id]);
    if (+existingRes[0].cnt === 0) {
      for (let i = 0; i < 3; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1 + Math.floor(Math.random() * 14));
        const dateStr = futureDate.toISOString().split('T')[0];
        const times = ['12:00', '13:00', '18:00', '19:00', '20:00'];
        await qr.query(
          `INSERT INTO restaurant.reservations (id, "bookingRef", restaurant_id, "customerId", "customerName", "customerPhone", "customerEmail", date, time, guests, "tableId", "seatingPreference", occasion, "specialRequests", "depositAmount", "depositPaid", "depositTransactionId", status, "cancellationReason", "cancelledBy", "confirmedAt", "seatedAt", "completedAt", "reminderSent", "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, '', 'indoor', $10, '', 0, false, '', 'CONFIRMED', '', '', now(), null, null, false, now(), now())`,
          [
            `RES-${rest.slug.substring(0, 4).toUpperCase()}-${2000 + i}`,
            rest.id,
            `cust-${400 + i}`,
            `Guest ${i + 1}`,
            `+91700${String(200 + i).padStart(3, '0')}000`,
            `guest${i + 1}@email.com`,
            dateStr,
            times[i % times.length],
            2 + Math.floor(Math.random() * 6),
            occasions[i % occasions.length],
          ],
        );
        totalReservations++;
      }
    }
  }
  console.log(`📅 ${totalReservations} reservations seeded.`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('🎉 Restaurant seed complete!');
  console.log(`   Restaurants:    ${totalRestaurants}`);
  console.log(`   Categories:     ${totalCategories}`);
  console.log(`   Menu Items:     ${totalItems}`);
  console.log(`   Tables:         ${totalTables}`);
  console.log(`   Staff:          ${totalStaff}`);
  console.log(`   Reviews:        ${totalReviews}`);
  console.log(`   Promotions:     ${totalPromos}`);
  console.log(`   Orders:         ${totalOrders}`);
  console.log(`   Reservations:   ${totalReservations}`);
  console.log('═══════════════════════════════════════════════');

  await qr.release();
  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Restaurant seed failed:', err);
  process.exit(1);
});
