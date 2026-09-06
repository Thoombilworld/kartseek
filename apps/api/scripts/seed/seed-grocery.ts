/**
 * Grocery Module — Database Seed Script
 *
 * Seeds the grocery_categories, grocery_stores, and grocery_items tables
 * with demo data for development and testing.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register apps/api/scripts/seed-grocery.ts
 *
 * Or via turbo:
 *   npx turbo run seed:grocery
 *
 * This script is IDEMPOTENT — safe to re-run. Existing records are upserted.
 */

import { DataSource } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { GroceryCategory } from '../../../../modules/grocery/backend/src/entities/grocery-category.entity';
import { GroceryStore } from '../../../../modules/grocery/backend/src/entities/grocery-store.entity';
import { GroceryItem } from '../../../../modules/grocery/backend/src/entities/grocery-item.entity';
import { GroceryOrder } from '../../../../modules/grocery/backend/src/entities/grocery-order.entity';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.GROCERY_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.GROCERY_DB_PORT ?? process.env.DB_PORT ?? '5432', 10),
  username: process.env.GROCERY_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.GROCERY_DB_PASSWORD || process.env.DB_PASSWORD || 'kartseek123',
  // This vertical owns its own database now. Seeding kartseek_db would write
  // rows the service never reads, and leave the module looking empty.
  database: process.env.GROCERY_DB_NAME ?? process.env.DB_NAME ?? 'kartseek_grocery',
  // Without this the seed connects on the default search_path and writes to
  // `public`, while the service reads its own schema -- so seeding "succeeded"
  // and the storefront stayed empty.
  schema: 'grocery',
  entities: [GroceryCategory, GroceryStore, GroceryItem, GroceryOrder],
  synchronize: false, // Creates tables if missing
});

// ── SEED DATA ──────────────────────────────────────────────────────────────

const CATEGORIES: Partial<GroceryCategory>[] = [
  {
    id: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    emoji: '🥬',
    gradient: 'from-green-600 to-emerald-500',
    description: 'Farm-fresh produce delivered daily',
    productCount: 240,
    subcategoryCount: 2,
    sortOrder: 0,
  },
  {
    id: 'fresh-meat',
    name: 'Fresh Meat',
    emoji: '🥩',
    gradient: 'from-red-600 to-rose-500',
    description: 'Premium quality, hygienically processed',
    productCount: 120,
    subcategoryCount: 3,
    sortOrder: 1,
  },
  {
    id: 'fresh-fish',
    name: 'Fresh Fish',
    emoji: '🐟',
    gradient: 'from-blue-600 to-cyan-500',
    description: 'Coastal catch, delivered on ice',
    productCount: 85,
    subcategoryCount: 1,
    sortOrder: 2,
  },
  {
    id: 'dairy-bread-eggs',
    name: 'Dairy, Bread & Eggs',
    emoji: '🥛',
    gradient: 'from-yellow-500 to-amber-400',
    description: 'Farm-fresh dairy and bakery',
    productCount: 180,
    subcategoryCount: 6,
    sortOrder: 3,
  },
  {
    id: 'rice-flour-pulses',
    name: 'Rice, Flour & Pulses',
    emoji: '🌾',
    gradient: 'from-amber-600 to-orange-500',
    description: 'Staples for every kitchen',
    productCount: 150,
    subcategoryCount: 3,
    sortOrder: 4,
  },
  {
    id: 'cooking-oil-ghee',
    name: 'Cooking Oil & Ghee',
    emoji: '🫒',
    gradient: 'from-lime-600 to-green-500',
    description: 'Pure oils and premium ghee',
    productCount: 65,
    subcategoryCount: 2,
    sortOrder: 5,
  },
  {
    id: 'masala-spices',
    name: 'Masala & Spices',
    emoji: '🌶️',
    gradient: 'from-orange-600 to-red-500',
    description: 'Authentic flavors for every dish',
    productCount: 110,
    subcategoryCount: 2,
    sortOrder: 6,
  },
  {
    id: 'snacks-packaged',
    name: 'Snacks & Packaged Food',
    emoji: '🍪',
    gradient: 'from-purple-600 to-violet-500',
    description: 'Munchies, biscuits, and namkeen',
    productCount: 320,
    subcategoryCount: 5,
    sortOrder: 7,
  },
  {
    id: 'beverages',
    name: 'Beverages',
    emoji: '☕',
    gradient: 'from-amber-600 to-orange-500',
    description: 'Tea, coffee, juices, and more',
    productCount: 190,
    subcategoryCount: 6,
    sortOrder: 8,
  },
  {
    id: 'frozen-food',
    name: 'Frozen Food',
    emoji: '🧊',
    gradient: 'from-cyan-600 to-sky-500',
    description: 'Ready-to-cook meals and ice cream',
    productCount: 95,
    subcategoryCount: 5,
    sortOrder: 9,
  },
  {
    id: 'bakery',
    name: 'Bakery',
    emoji: '🥐',
    gradient: 'from-orange-500 to-amber-400',
    description: 'Fresh bread, cakes, and pastries',
    productCount: 75,
    subcategoryCount: 3,
    sortOrder: 10,
  },
  {
    id: 'breakfast',
    name: 'Breakfast Items',
    emoji: '🥣',
    gradient: 'from-yellow-500 to-orange-400',
    description: 'Cereals, oats, cornflakes, and more',
    productCount: 80,
    subcategoryCount: 3,
    sortOrder: 11,
  },
  {
    id: 'household-cleaning',
    name: 'Household Cleaning',
    emoji: '🧹',
    gradient: 'from-teal-600 to-emerald-500',
    description: 'Detergents, cleaners, and supplies',
    productCount: 140,
    subcategoryCount: 6,
    sortOrder: 12,
  },
  {
    id: 'personal-care',
    name: 'Personal Care',
    emoji: '🧴',
    gradient: 'from-pink-500 to-rose-400',
    description: 'Skincare, haircare, and grooming',
    productCount: 210,
    subcategoryCount: 6,
    sortOrder: 13,
  },
  {
    id: 'baby-care',
    name: 'Baby Care',
    emoji: '👶',
    gradient: 'from-pink-500 to-rose-400',
    description: 'Diapers, food, and essentials',
    productCount: 90,
    subcategoryCount: 4,
    sortOrder: 14,
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    emoji: '🐾',
    gradient: 'from-amber-500 to-yellow-400',
    description: 'Food, toys, and accessories',
    productCount: 60,
    subcategoryCount: 4,
    sortOrder: 15,
  },
  {
    id: 'organic',
    name: 'Organic Products',
    emoji: '🌱',
    gradient: 'from-emerald-600 to-green-500',
    description: 'Certified organic and natural',
    productCount: 110,
    subcategoryCount: 3,
    sortOrder: 16,
  },
  {
    id: 'international-foods',
    name: 'International Foods',
    emoji: '🌍',
    gradient: 'from-indigo-600 to-violet-500',
    description: 'Thai, Korean, Italian, and more',
    productCount: 70,
    subcategoryCount: 3,
    sortOrder: 17,
  },
  {
    id: 'ready-to-cook',
    name: 'Ready-to-Cook',
    emoji: '🍳',
    gradient: 'from-orange-600 to-amber-500',
    description: 'Marinated, pre-cut & ready to cook',
    productCount: 65,
    subcategoryCount: 3,
    sortOrder: 18,
  },
  {
    id: 'dry-fruits-nuts',
    name: 'Dry Fruits & Nuts',
    emoji: '🥜',
    gradient: 'from-amber-700 to-orange-500',
    description: 'Premium almonds, cashews, walnuts & more',
    productCount: 80,
    subcategoryCount: 4,
    sortOrder: 19,
  },
  {
    id: 'chocolates-sweets',
    name: 'Chocolates & Sweets',
    emoji: '🍫',
    gradient: 'from-yellow-800 to-amber-600',
    description: 'Cadbury, Ferrero, Indian mithai & more',
    productCount: 120,
    subcategoryCount: 3,
    sortOrder: 20,
  },
  {
    id: 'tea-coffee-health',
    name: 'Tea, Coffee & Health Drinks',
    emoji: '🍵',
    gradient: 'from-green-800 to-emerald-600',
    description: 'Premium teas, artisan coffee & health drinks',
    productCount: 90,
    subcategoryCount: 3,
    sortOrder: 21,
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    emoji: '💊',
    gradient: 'from-teal-600 to-cyan-500',
    description: 'Vitamins, supplements & wellness products',
    productCount: 85,
    subcategoryCount: 4,
    sortOrder: 22,
  },
];

const STORES: Partial<GroceryStore>[] = [
  {
    name: 'FreshMart Supermarket',
    slug: 'freshmart-Andheri West',
    ownerId: 'seller-001',
    address: 'Andheri West, Mumbai',
    latitude: -1.2664,
    longitude: 36.8034,
    storeTypes: ['Supermarket'],
    isOnline: true,
    deliveryRadius: 10,
    minOrderAmount: 200,
    deliveryFee: 50,
    rating: 4.5,
    totalOrders: 1250,
    phone: '+91712345678',
    regionCode: 'IN',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '06:00', close: '22:00' },
      tue: { open: '06:00', close: '22:00' },
      wed: { open: '06:00', close: '22:00' },
      thu: { open: '06:00', close: '22:00' },
      fri: { open: '06:00', close: '22:00' },
      sat: { open: '07:00', close: '22:00' },
      sun: { open: '08:00', close: '20:00' },
    },
    tags: ['Featured', 'Fast Delivery'],
  },
  {
    name: 'Naivas Express',
    slug: 'naivas-cbd',
    ownerId: 'seller-002',
    address: 'CBD, Mumbai',
    latitude: 19.076,
    longitude: 72.8777,
    storeTypes: ['Supermarket', 'Convenience'],
    isOnline: true,
    deliveryRadius: 8,
    minOrderAmount: 150,
    deliveryFee: 40,
    rating: 4.3,
    totalOrders: 2100,
    phone: '+91722345678',
    regionCode: 'IN',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '07:00', close: '21:00' },
      tue: { open: '07:00', close: '21:00' },
      wed: { open: '07:00', close: '21:00' },
      thu: { open: '07:00', close: '21:00' },
      fri: { open: '07:00', close: '21:00' },
      sat: { open: '07:00', close: '21:00' },
      sun: { open: '08:00', close: '20:00' },
    },
    tags: ['Popular'],
  },
  {
    name: 'Al Rawabi Fresh Market',
    slug: 'rawabi-dubai-marina',
    ownerId: 'seller-003',
    address: 'Dubai Marina, Dubai',
    latitude: 25.0801,
    longitude: 55.1357,
    storeTypes: ['Organic', 'Supermarket'],
    isOnline: true,
    deliveryRadius: 12,
    minOrderAmount: 50,
    deliveryFee: 10,
    rating: 4.7,
    totalOrders: 890,
    phone: '+971501234567',
    regionCode: 'AE',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '08:00', close: '23:00' },
      tue: { open: '08:00', close: '23:00' },
      wed: { open: '08:00', close: '23:00' },
      thu: { open: '08:00', close: '23:00' },
      fri: { open: '09:00', close: '23:00' },
      sat: { open: '08:00', close: '23:00' },
      sun: { open: '08:00', close: '23:00' },
    },
    tags: ['Organic', 'Premium'],
  },
  {
    name: 'Reliance Fresh',
    slug: 'reliance-bandra',
    ownerId: 'seller-004',
    address: 'Bandra West, Mumbai',
    latitude: 19.0596,
    longitude: 72.8295,
    storeTypes: ['Supermarket'],
    isOnline: true,
    deliveryRadius: 7,
    minOrderAmount: 300,
    deliveryFee: 30,
    rating: 4.1,
    totalOrders: 3400,
    phone: '+919876543210',
    regionCode: 'IN',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '06:30', close: '22:30' },
      tue: { open: '06:30', close: '22:30' },
      wed: { open: '06:30', close: '22:30' },
      thu: { open: '06:30', close: '22:30' },
      fri: { open: '06:30', close: '22:30' },
      sat: { open: '06:30', close: '22:30' },
      sun: { open: '07:00', close: '22:00' },
    },
    tags: ['Budget Friendly'],
  },
  {
    name: 'Tamimi Markets',
    slug: 'tamimi-riyadh-olaya',
    ownerId: 'seller-005',
    address: 'Olaya District, Riyadh',
    latitude: 24.6877,
    longitude: 46.6811,
    storeTypes: ['Supermarket', 'International'],
    isOnline: true,
    deliveryRadius: 15,
    minOrderAmount: 75,
    deliveryFee: 15,
    rating: 4.4,
    totalOrders: 670,
    phone: '+966501234567',
    regionCode: 'SA',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '07:00', close: '00:00' },
      tue: { open: '07:00', close: '00:00' },
      wed: { open: '07:00', close: '00:00' },
      thu: { open: '07:00', close: '00:00' },
      fri: { open: '09:00', close: '00:00' },
      sat: { open: '07:00', close: '00:00' },
      sun: { open: '07:00', close: '00:00' },
    },
    tags: ['Premium', '24/7 Support'],
  },
  {
    name: 'QuickGroc 24/7',
    slug: 'quickgroc-Andheri',
    ownerId: 'seller-006',
    address: 'Andheri, Mumbai',
    latitude: -1.293,
    longitude: 36.7857,
    storeTypes: ['Convenience'],
    isOnline: true,
    deliveryRadius: 5,
    minOrderAmount: 100,
    deliveryFee: 30,
    rating: 4.0,
    totalOrders: 560,
    phone: '+91733456789',
    regionCode: 'IN',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '00:00', close: '23:59' },
      tue: { open: '00:00', close: '23:59' },
      wed: { open: '00:00', close: '23:59' },
      thu: { open: '00:00', close: '23:59' },
      fri: { open: '00:00', close: '23:59' },
      sat: { open: '00:00', close: '23:59' },
      sun: { open: '00:00', close: '23:59' },
    },
    tags: ['24/7', 'Express Delivery'],
  },
  {
    name: 'Organic Basket',
    slug: 'organic-basket-koramangala',
    ownerId: 'seller-007',
    address: 'Koramangala, Bangalore',
    latitude: 12.9352,
    longitude: 77.6245,
    storeTypes: ['Organic', 'Gourmet'],
    isOnline: true,
    deliveryRadius: 8,
    minOrderAmount: 500,
    deliveryFee: 0,
    rating: 4.8,
    totalOrders: 320,
    phone: '+919012345678',
    regionCode: 'IN',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '07:00', close: '21:00' },
      tue: { open: '07:00', close: '21:00' },
      wed: { open: '07:00', close: '21:00' },
      thu: { open: '07:00', close: '21:00' },
      fri: { open: '07:00', close: '21:00' },
      sat: { open: '08:00', close: '20:00' },
      sun: { open: '08:00', close: '20:00' },
    },
    tags: ['Organic', 'Free Delivery', 'Eco-Friendly'],
  },
  {
    name: 'Lulu Hypermarket',
    slug: 'lulu-doha-corniche',
    ownerId: 'seller-008',
    address: 'Corniche, Doha',
    latitude: 25.2854,
    longitude: 51.531,
    storeTypes: ['Hypermarket', 'International'],
    isOnline: true,
    deliveryRadius: 20,
    minOrderAmount: 40,
    deliveryFee: 8,
    rating: 4.6,
    totalOrders: 1800,
    phone: '+97444123456',
    regionCode: 'QA',
    status: 'APPROVED',
    openingHours: {
      mon: { open: '07:00', close: '23:00' },
      tue: { open: '07:00', close: '23:00' },
      wed: { open: '07:00', close: '23:00' },
      thu: { open: '07:00', close: '23:00' },
      fri: { open: '09:00', close: '23:00' },
      sat: { open: '07:00', close: '23:00' },
      sun: { open: '07:00', close: '23:00' },
    },
    tags: ['Hypermarket', 'Popular'],
  },
];

// Products will be generated per-store using a factory function
function generateProducts(storeId: string): Partial<GroceryItem>[] {
  return [
    // Fruits & Vegetables
    {
      name: 'Fresh Avocados (4 pack)',
      category: 'fruits-vegetables',
      subCategory: 'Fruits',
      isAvailable: true,
      brand: 'Farm Direct',
      isPromoted: true,
      rating: 4.6,
      storeId,
      weightVariants: [{ weight: '4 pack', price: 12, mrp: 14, stock: 50 }],
    },
    {
      name: 'Organic Bananas',
      category: 'fruits-vegetables',
      subCategory: 'Fruits',
      isAvailable: true,
      brand: 'Organic Farm',
      rating: 4.3,
      storeId,
      weightVariants: [
        { weight: '1 dozen', price: 3, mrp: 3, stock: 100 },
        { weight: '6 pcs', price: 2, mrp: 2, stock: 200 },
      ],
    },
    {
      name: 'Cherry Tomatoes',
      category: 'fruits-vegetables',
      subCategory: 'Vegetables',
      isAvailable: true,
      rating: 4.2,
      storeId,
      weightVariants: [
        { weight: '250g', price: 3, mrp: 3, stock: 75 },
        { weight: '500g', price: 5, mrp: 7, stock: 40 },
      ],
    },
    {
      name: 'Fresh Spinach',
      category: 'fruits-vegetables',
      subCategory: 'Leafy Greens',
      isAvailable: true,
      rating: 4.4,
      storeId,
      weightVariants: [{ weight: '250g', price: 1, mrp: 2, stock: 60 }],
    },
    {
      name: 'Sweet Potatoes',
      category: 'fruits-vegetables',
      subCategory: 'Vegetables',
      isAvailable: true,
      rating: 4.1,
      storeId,
      weightVariants: [
        { weight: '500g', price: 2, mrp: 3, stock: 80 },
        { weight: '1kg', price: 4, mrp: 6, stock: 45 },
      ],
    },
    // Fresh Meat
    {
      name: 'Chicken Breast (Boneless)',
      category: 'fresh-meat',
      subCategory: 'Poultry',
      isAvailable: true,
      brand: 'Farm Fresh',
      isPromoted: true,
      rating: 4.5,
      storeId,
      weightVariants: [
        { weight: '500g', price: 10, mrp: 11, stock: 30 },
        { weight: '1kg', price: 18, mrp: 22, stock: 15 },
      ],
      preparationPreferences: {
        allowCutSelection: true,
        options: ['Boneless', 'Curry Cut', 'Strips'],
      },
    },
    {
      name: 'Lamb Leg',
      category: 'fresh-meat',
      subCategory: 'Lamb',
      isAvailable: true,
      rating: 4.7,
      storeId,
      weightVariants: [
        { weight: '500g', price: 20, mrp: 23, stock: 10 },
        { weight: '1kg', price: 37, mrp: 43, stock: 5 },
      ],
      preparationPreferences: {
        allowCutSelection: true,
        options: ['Whole', 'Curry Cut', 'Steaks'],
      },
    },
    // Fresh Fish
    {
      name: 'Atlantic Salmon Fillet',
      category: 'fresh-fish',
      subCategory: 'Fresh Fish',
      isAvailable: true,
      brand: 'Ocean Catch',
      isPromoted: true,
      rating: 4.8,
      storeId,
      weightVariants: [
        { weight: '250g', price: 15, mrp: 18, stock: 12 },
        { weight: '500g', price: 28, mrp: 35, stock: 8 },
      ],
      preparationPreferences: {
        allowCutSelection: true,
        options: ['Fillet', 'Curry Cut', 'Steaks'],
      },
    },
    // Dairy
    {
      name: 'Brookside Fresh Milk',
      category: 'dairy-bread-eggs',
      subCategory: 'Milk',
      isAvailable: true,
      brand: 'Brookside',
      rating: 4.4,
      storeId,
      weightVariants: [
        { weight: '500ml', price: 3, mrp: 3, stock: 200 },
        { weight: '1L', price: 5, mrp: 6, stock: 150 },
      ],
    },
    {
      name: 'Free-Range Eggs',
      category: 'dairy-bread-eggs',
      subCategory: 'Eggs',
      isAvailable: true,
      rating: 4.5,
      storeId,
      weightVariants: [
        { weight: '6 pcs', price: 4, mrp: 4, stock: 80 },
        { weight: '12 pcs', price: 7, mrp: 8, stock: 50 },
      ],
    },
    {
      name: 'Greek Yogurt (Natural)',
      category: 'dairy-bread-eggs',
      subCategory: 'Yogurt',
      isAvailable: true,
      brand: 'Fage',
      rating: 4.6,
      storeId,
      weightVariants: [
        { weight: '200g', price: 5, mrp: 7, stock: 35 },
        { weight: '500g', price: 12, mrp: 14, stock: 20 },
      ],
    },
    // Beverages
    {
      name: 'Tropicana Orange Juice',
      category: 'beverages',
      subCategory: 'Juices',
      isAvailable: true,
      brand: 'Tropicana',
      rating: 4.3,
      storeId,
      weightVariants: [{ weight: '1L', price: 8, mrp: 9, stock: 60 }],
    },
    {
      name: 'Nescafe Gold Instant Coffee',
      category: 'beverages',
      subCategory: 'Coffee',
      isAvailable: true,
      brand: 'Nescafe',
      isPromoted: true,
      rating: 4.5,
      storeId,
      weightVariants: [
        { weight: '100g', price: 15, mrp: 17, stock: 25 },
        { weight: '200g', price: 28, mrp: 33, stock: 12 },
      ],
    },
    // Snacks
    {
      name: "Lay's Classic Salted Chips",
      category: 'snacks-packaged',
      subCategory: 'Chips',
      isAvailable: true,
      brand: "Lay's",
      rating: 4.1,
      storeId,
      weightVariants: [
        { weight: '52g', price: 1, mrp: 1, stock: 150 },
        { weight: '130g', price: 3, mrp: 3, stock: 80 },
      ],
    },
    {
      name: 'Oreo Biscuits',
      category: 'snacks-packaged',
      subCategory: 'Biscuits',
      isAvailable: true,
      brand: 'Cadbury',
      rating: 4.4,
      storeId,
      weightVariants: [
        { weight: '120g', price: 2, mrp: 2, stock: 100 },
        { weight: '300g', price: 4, mrp: 5, stock: 50 },
      ],
    },
    // Household
    {
      name: 'Surf Excel Detergent',
      category: 'household-cleaning',
      subCategory: 'Laundry',
      isAvailable: true,
      brand: 'Surf Excel',
      rating: 4.2,
      storeId,
      weightVariants: [
        { weight: '500g', price: 5, mrp: 6, stock: 45 },
        { weight: '1kg', price: 10, mrp: 11, stock: 30 },
        { weight: '2kg', price: 17, mrp: 21, stock: 15 },
      ],
    },
  ];
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected\n');

  const catRepo = ds.getRepository(GroceryCategory);
  const storeRepo = ds.getRepository(GroceryStore);
  const itemRepo = ds.getRepository(GroceryItem);

  // 1. Seed categories
  console.log('📂 Seeding categories...');
  for (const cat of CATEGORIES) {
    await catRepo.upsert(cat as QueryDeepPartialEntity<GroceryCategory>, ['id']);
  }
  console.log(`   ✅ ${CATEGORIES.length} categories upserted\n`);

  // 2. Seed stores
  console.log('🏪 Seeding stores...');
  const savedStores: GroceryStore[] = [];
  for (const store of STORES) {
    // A store with no slug would query `where: { slug: undefined }`, which
    // TypeORM treats as no condition at all — the lookup would return the first
    // store in the table and this loop would then *update* it with the entry's
    // fields, silently overwriting an unrelated shop on every run.
    if (!store.slug) throw new Error(`Store "${store.name}" has no slug; cannot upsert it safely.`);
    const existing = await storeRepo.findOne({ where: { slug: store.slug } });
    if (existing) {
      await storeRepo.update(existing.id, store);
      savedStores.push({ ...existing, ...store } as GroceryStore);
    } else {
      const saved = await storeRepo.save(storeRepo.create(store));
      savedStores.push(saved);
    }
  }
  console.log(`   ✅ ${savedStores.length} stores upserted\n`);

  // 3. Seed products for each store
  console.log('📦 Seeding products...');
  let totalProducts = 0;
  for (const store of savedStores) {
    const products = generateProducts(store.id);
    for (const prod of products) {
      // Same hazard as the store upsert above: an undefined name drops the
      // condition, so `existing` would be an arbitrary product in this store
      // and the item would never be inserted.
      if (!prod.name) throw new Error(`A product for store ${store.id} has no name.`);
      const existing = await itemRepo.findOne({ where: { name: prod.name, storeId: store.id } });
      if (existing) {
        // Update rather than skip. The old branch only ever inserted, so
        // re-running the seed after editing the catalogue changed nothing —
        // which is how every price stayed at its original rupee value long
        // after the storefront moved to riyals.
        await itemRepo.update(existing.id, prod);
      } else {
        await itemRepo.save(itemRepo.create(prod));
      }
      totalProducts++;
    }
  }
  console.log(`   ✅ ${totalProducts} products seeded across ${savedStores.length} stores\n`);

  // Summary
  const catCount = await catRepo.count();
  const storeCount = await storeRepo.count();
  const itemCount = await itemRepo.count();
  console.log('═══════════════════════════════════════════');
  console.log(`  📂 Categories:  ${catCount}`);
  console.log(`  🏪 Stores:      ${storeCount}`);
  console.log(`  📦 Products:    ${itemCount}`);
  console.log('═══════════════════════════════════════════');
  console.log('\n🎉 Grocery seed complete!\n');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
