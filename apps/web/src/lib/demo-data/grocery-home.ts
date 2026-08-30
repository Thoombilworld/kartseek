// lib/mock/grocery-home.ts
// KARTSEEK Grocery — Comprehensive mock data for the entire grocery module

import { formatActiveCountryList } from '@/lib/localization/countries';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface GroceryStore {
  id: string;
  name: string;
  /** Storefront logo. See the note on GroceryProduct.imageUrl. */
  logoUrl?: string;
  /** Wide masthead artwork for the store page header. */
  bannerUrl?: string;
  slug?: string;
  category: string;
  rating: number;
  reviewCount: string;
  deliveryTime: string;
  distance: string;
  minOrder: number;
  deliveryFee: number;
  tags: string[];
  isOpen: boolean;
  isPromoted?: boolean;
  offerBadge?: string;
  /** Live flash deals the shop is running, counted by the API, not by the client. */
  activeDealCount?: number;
  emoji: string;
  section: string[];
}

export interface GroceryProduct {
  id: string;
  name: string;
  brand: string;
  weight: string;
  unit: string;
  price: number;
  mrp: number;
  /** Emoji stand-in, shown when the product has no picture. Never a URL. */
  emoji: string;
  /**
   * Product picture. Absent for demo fixtures, present for catalogue rows.
   *
   * The type had no image field at all, so pages mapping an API response put the
   * URL into `emoji` and the compiler could not see the mistake — the tile then
   * rendered the path as literal text. Declaring it here is what makes that a
   * type error rather than a visual bug.
   */
  imageUrl?: string;
  storeId?: string;
  storeName?: string;
  category: string;
  /** Second-level aisle ("Fresh Fish", "Coffee"). Supplied by the catalogue. */
  subCategory?: string;
  inStock: boolean;
  freshLabel?: string;
  isVeg?: boolean;
  delivery?: string;
  rating?: number;
  reviews?: number;
  flashDeal?: { flashPrice: number; endsAt: string; stockLimit: number; soldCount: number };
}

// GroceryCategory is re-exported from '@/lib/modules/grocery-categories' below.
// Do not redefine it here.


export interface GroceryTrustBadge {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

export interface GroceryBanner {
  id: string;
  tag: string;
  headline: string;
  subheadline: string;
  cta: string;
  ctaHref: string;
  gradient: string;
  emoji: string;
  /**
   * Arabic copy, where the market has it.
   *
   * Optional because most markets do not: the renderer falls back to the base
   * field, so an English-only banner still shows. Without these the Qatari
   * banners were written one per language and the carousel showed each shopper
   * the wrong one half the time.
   */
  tagAr?: string;
  headlineAr?: string;
  subheadlineAr?: string;
  ctaAr?: string;
}

export interface GroceryBrand {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ── 35+ Stores ────────────────────────────────────────────────────────────────

export const GROCERY_STORES: GroceryStore[] = [
  // ─ Nearby (within 2km)
  { id: 'store-freshmart', name: 'FreshMart Supermarket', category: 'Supermarket', rating: 4.8, reviewCount: '2.4k', deliveryTime: '15-20 min', distance: '1.2 km', minOrder: 199, deliveryFee: 0, tags: ['Vegetables', 'Fruits', 'Dairy'], isOpen: true, isPromoted: true, offerBadge: '20% OFF', emoji: '🏪', section: ['nearby', 'popular', 'top-rated'] },
  { id: 'store-kartseek-daily', name: 'KARTSEEK Daily Essentials', category: 'Convenience', rating: 4.9, reviewCount: '3.1k', deliveryTime: '10-15 min', distance: '0.8 km', minOrder: 99, deliveryFee: 0, tags: ['Snacks', 'Beverages', 'Instant Food'], isOpen: true, offerBadge: 'FREE DELIVERY', emoji: '🛒', section: ['nearby', 'fast-delivery', 'top-rated'] },
  { id: 'store-green-basket', name: 'Green Basket Veggies', category: 'Fresh Produce', rating: 4.8, reviewCount: '1.5k', deliveryTime: '12-18 min', distance: '0.5 km', minOrder: 149, deliveryFee: 0, tags: ['Vegetables', 'Herbs', 'Salads'], isOpen: true, emoji: '🥬', section: ['nearby', 'fast-delivery', 'fruits-veggies'] },
  { id: 'store-cooldairy', name: 'CoolDairy Hub', category: 'Dairy', rating: 4.7, reviewCount: '1.2k', deliveryTime: '10-15 min', distance: '0.9 km', minOrder: 99, deliveryFee: 15, tags: ['Milk', 'Cheese', 'Yogurt'], isOpen: true, emoji: '🥛', section: ['nearby', 'fast-delivery', 'dairy-bakery'] },
  { id: 'store-spiceworld', name: 'SpiceWorld Market', category: 'Specialty', rating: 4.4, reviewCount: '980', deliveryTime: '15-25 min', distance: '1.6 km', minOrder: 199, deliveryFee: 20, tags: ['Spices', 'Masalas', 'Dry Fruits'], isOpen: true, emoji: '🌶️', section: ['nearby'] },
  { id: 'store-sunrise', name: 'Sunrise Grocery Mart', category: 'Mini Market', rating: 4.5, reviewCount: '870', deliveryTime: '15-20 min', distance: '1.4 km', minOrder: 149, deliveryFee: 15, tags: ['Essentials', 'Household', 'Personal Care'], isOpen: true, isPromoted: true, emoji: '🌅', section: ['nearby'] },
  { id: 'store-beverage-barn', name: 'Beverage Barn', category: 'Beverages', rating: 4.6, reviewCount: '640', deliveryTime: '15-20 min', distance: '1.1 km', minOrder: 99, deliveryFee: 10, tags: ['Juices', 'Soft Drinks', 'Water'], isOpen: true, emoji: '🥤', section: ['nearby', 'fast-delivery'] },
  { id: 'store-golden-grain', name: 'Golden Grain Store', category: 'Staples', rating: 4.5, reviewCount: '520', deliveryTime: '20-30 min', distance: '1.9 km', minOrder: 299, deliveryFee: 0, tags: ['Rice', 'Wheat', 'Pulses'], isOpen: true, emoji: '🌾', section: ['nearby'] },

  // ─ Popular Supermarkets
  { id: 'store-nature-basket', name: "Nature's Basket", category: 'Premium Supermarket', rating: 4.7, reviewCount: '4.2k', deliveryTime: '25-35 min', distance: '2.4 km', minOrder: 499, deliveryFee: 0, tags: ['Gourmet', 'Organic', 'Imported'], isOpen: true, offerBadge: 'Premium', emoji: '🌿', section: ['popular', 'top-rated'] },
  { id: 'store-star-bazaar', name: 'Star Bazaar', category: 'Hypermarket', rating: 4.6, reviewCount: '5.8k', deliveryTime: '30-45 min', distance: '3.2 km', minOrder: 399, deliveryFee: 0, tags: ['Wholesale', 'Pantry', 'Household'], isOpen: true, isPromoted: true, offerBadge: 'Mega Deals', emoji: '⭐', section: ['popular', 'supermarket'] },
  { id: 'store-dmart', name: 'DMart Ready', category: 'Hypermarket', rating: 4.5, reviewCount: '8.2k', deliveryTime: '35-50 min', distance: '4.1 km', minOrder: 499, deliveryFee: 0, tags: ['Bulk Buy', 'Value', 'Essentials'], isOpen: true, offerBadge: 'Lowest Prices', emoji: '🏬', section: ['popular', 'supermarket'] },
  { id: 'store-big-basket', name: 'BigBasket Express', category: 'Online Supermarket', rating: 4.6, reviewCount: '12k', deliveryTime: '20-30 min', distance: '2.0 km', minOrder: 249, deliveryFee: 0, tags: ['Express', 'Fresh', 'Daily Needs'], isOpen: true, emoji: '🧺', section: ['popular', 'supermarket', 'fast-delivery'] },
  { id: 'store-reliance-fresh', name: 'Reliance Fresh', category: 'Supermarket', rating: 4.4, reviewCount: '3.6k', deliveryTime: '25-35 min', distance: '2.8 km', minOrder: 299, deliveryFee: 20, tags: ['Fresh Produce', 'Pantry', 'Household'], isOpen: true, emoji: '🏪', section: ['popular', 'supermarket'] },
  { id: 'store-more-mega', name: 'More Megastore', category: 'Hypermarket', rating: 4.3, reviewCount: '2.9k', deliveryTime: '30-40 min', distance: '3.5 km', minOrder: 399, deliveryFee: 0, tags: ['Groceries', 'Fresh', 'Bakery'], isOpen: true, emoji: '🛍️', section: ['popular', 'supermarket'] },

  // ─ Fresh Meat & Fish Stores
  { id: 'store-premium-meat', name: 'Premium Meat & Catch', category: 'Meat & Seafood', rating: 4.6, reviewCount: '1.8k', deliveryTime: '30-40 min', distance: '3.5 km', minOrder: 399, deliveryFee: 0, tags: ['Fresh Meat', 'Seafood', 'Poultry'], isOpen: true, offerBadge: 'Fresh Today', emoji: '🥩', section: ['meat-fish'] },
  { id: 'store-fish-market', name: 'Ocean Fresh Fish Market', category: 'Seafood', rating: 4.7, reviewCount: '920', deliveryTime: '35-45 min', distance: '4.0 km', minOrder: 499, deliveryFee: 30, tags: ['Fresh Fish', 'Prawns', 'Crab'], isOpen: true, emoji: '🐟', section: ['meat-fish', 'top-rated'] },
  { id: 'store-halal-meats', name: 'Al-Madina Halal Meats', category: 'Halal Meat', rating: 4.8, reviewCount: '2.1k', deliveryTime: '25-35 min', distance: '2.6 km', minOrder: 349, deliveryFee: 0, tags: ['Halal', 'Chicken', 'Mutton', 'Beef'], isOpen: true, emoji: '🍖', section: ['meat-fish', 'top-rated'] },
  { id: 'store-country-chicken', name: 'Country Chicken Farm', category: 'Poultry', rating: 4.5, reviewCount: '760', deliveryTime: '30-40 min', distance: '3.8 km', minOrder: 299, deliveryFee: 25, tags: ['Country Chicken', 'Free Range', 'Eggs'], isOpen: true, emoji: '🐔', section: ['meat-fish'] },

  // ─ Fruits & Vegetables
  { id: 'store-organic-valley', name: 'Organic Valley Farm', category: 'Organic', rating: 4.7, reviewCount: '1.3k', deliveryTime: '25-35 min', distance: '2.4 km', minOrder: 249, deliveryFee: 0, tags: ['Organic', 'Farm Fresh', 'Vegan'], isOpen: true, offerBadge: 'Organic Certified', emoji: '🌱', section: ['fruits-veggies', 'organic'] },
  { id: 'store-happy-harvest', name: 'Happy Harvest Farm', category: 'Farm', rating: 4.8, reviewCount: '890', deliveryTime: '20-30 min', distance: '2.0 km', minOrder: 199, deliveryFee: 0, tags: ['Farm Fresh', 'Fruits', 'Organic'], isOpen: true, emoji: '🌻', section: ['fruits-veggies', 'organic', 'top-rated'] },
  { id: 'store-fruit-junction', name: 'Fruit Junction', category: 'Fruit Shop', rating: 4.6, reviewCount: '1.1k', deliveryTime: '15-20 min', distance: '1.3 km', minOrder: 149, deliveryFee: 10, tags: ['Seasonal Fruits', 'Exotic Fruits', 'Juices'], isOpen: true, emoji: '🍎', section: ['fruits-veggies', 'fast-delivery'] },
  { id: 'store-sabzi-mandi', name: 'Sabzi Mandi Express', category: 'Vegetable Market', rating: 4.3, reviewCount: '2.4k', deliveryTime: '18-25 min', distance: '1.7 km', minOrder: 99, deliveryFee: 15, tags: ['Vegetables', 'Herbs', 'Fresh'], isOpen: true, offerBadge: 'Mandi Prices', emoji: '🥕', section: ['fruits-veggies'] },

  // ─ Dairy & Bakery
  { id: 'store-royal-bakery', name: 'Royal Bakery & Sweets', category: 'Bakery', rating: 4.9, reviewCount: '1.8k', deliveryTime: '20-25 min', distance: '2.1 km', minOrder: 199, deliveryFee: 0, tags: ['Bakery', 'Sweets', 'Cakes'], isOpen: true, emoji: '🧁', section: ['dairy-bakery', 'top-rated'] },
  { id: 'store-amul-parlour', name: 'Amul Preferred Outlet', category: 'Dairy', rating: 4.6, reviewCount: '3.2k', deliveryTime: '15-20 min', distance: '1.0 km', minOrder: 99, deliveryFee: 0, tags: ['Ice Cream', 'Milk', 'Butter'], isOpen: true, emoji: '🧈', section: ['dairy-bakery', 'fast-delivery'] },
  { id: 'store-bread-basket', name: 'The Bread Basket', category: 'Artisan Bakery', rating: 4.7, reviewCount: '560', deliveryTime: '20-30 min', distance: '2.3 km', minOrder: 249, deliveryFee: 20, tags: ['Sourdough', 'Croissants', 'Pastries'], isOpen: true, emoji: '🥐', section: ['dairy-bakery'] },

  // ─ Organic
  { id: 'store-nutrihealth', name: 'NutriHealth Store', category: 'Health Foods', rating: 4.6, reviewCount: '710', deliveryTime: '25-35 min', distance: '3.0 km', minOrder: 349, deliveryFee: 0, tags: ['Health Foods', 'Supplements', 'Organic'], isOpen: true, emoji: '🥗', section: ['organic'] },

  // ─ New Stores
  { id: 'store-metro-fresh', name: 'Metro Fresh Market', category: 'Supermarket', rating: 4.2, reviewCount: '120', deliveryTime: '25-35 min', distance: '2.5 km', minOrder: 249, deliveryFee: 0, tags: ['New', 'Fresh', 'Essentials'], isOpen: true, offerBadge: 'NEW - 30% OFF', emoji: '🆕', section: ['new'] },
  { id: 'store-farm-to-fork', name: 'Farm to Fork Organics', category: 'Organic', rating: 4.4, reviewCount: '85', deliveryTime: '30-40 min', distance: '3.1 km', minOrder: 399, deliveryFee: 0, tags: ['Organic', 'Pesticide-Free', 'Local'], isOpen: true, offerBadge: 'NEW', emoji: '🌿', section: ['new', 'organic'] },
  { id: 'store-quick-stop', name: 'QuickStop Convenience', category: 'Convenience', rating: 4.1, reviewCount: '95', deliveryTime: '8-12 min', distance: '0.4 km', minOrder: 49, deliveryFee: 10, tags: ['Quick', 'Snacks', 'Emergency'], isOpen: true, offerBadge: 'NEW', emoji: '⚡', section: ['new', 'fast-delivery'] },

  // ─ Specialty
  { id: 'store-frozen-delights', name: 'Frozen Delights', category: 'Frozen Foods', rating: 4.3, reviewCount: '430', deliveryTime: '18-28 min', distance: '2.7 km', minOrder: 249, deliveryFee: 25, tags: ['Frozen Food', 'Ice Cream', 'Ready Meals'], isOpen: true, emoji: '🧊', section: [] },
  { id: 'store-pet-home', name: 'Pet & Home Supplies', category: 'Pet Store', rating: 4.4, reviewCount: '310', deliveryTime: '25-40 min', distance: '3.2 km', minOrder: 299, deliveryFee: 30, tags: ['Pet Food', 'Cleaning', 'Household'], isOpen: true, emoji: '🐾', section: [] },
  { id: 'store-baby-world', name: 'Baby World', category: 'Baby Care', rating: 4.7, reviewCount: '620', deliveryTime: '20-30 min', distance: '2.2 km', minOrder: 249, deliveryFee: 0, tags: ['Diapers', 'Baby Food', 'Essentials'], isOpen: true, emoji: '👶', section: [] },
  { id: 'store-international', name: 'World Foods Import', category: 'International', rating: 4.5, reviewCount: '380', deliveryTime: '30-45 min', distance: '4.5 km', minOrder: 499, deliveryFee: 40, tags: ['Thai', 'Korean', 'Italian', 'Mexican'], isOpen: true, emoji: '🌍', section: [] },

  // ─ Trending & Best Sellers
  { id: 'store-zepto-mart', name: 'Zepto Mart Express', category: 'Quick Commerce', rating: 4.7, reviewCount: '6.8k', deliveryTime: '8-12 min', distance: '0.6 km', minOrder: 99, deliveryFee: 0, tags: ['Ultra Fast', '10 Min', 'Daily'], isOpen: true, isPromoted: true, offerBadge: '10 Min Delivery', emoji: '⚡', section: ['trending', 'fast-delivery'] },
  { id: 'store-blinkit-hub', name: 'Blinkit Partner Store', category: 'Quick Commerce', rating: 4.6, reviewCount: '8.2k', deliveryTime: '10-15 min', distance: '0.7 km', minOrder: 99, deliveryFee: 0, tags: ['Instant', 'Groceries', 'Essentials'], isOpen: true, offerBadge: 'Free Delivery', emoji: '⚡', section: ['trending', 'fast-delivery'] },
  { id: 'store-smart-saver', name: 'Smart Saver Wholesale', category: 'Wholesale', rating: 4.3, reviewCount: '2.1k', deliveryTime: '35-50 min', distance: '4.0 km', minOrder: 999, deliveryFee: 0, tags: ['Bulk', 'Business', 'Restaurant'], isOpen: true, offerBadge: 'Bulk Prices', emoji: '📦', section: ['best-seller', 'supermarket'] },
  { id: 'store-heritage', name: 'Heritage Fresh', category: 'Supermarket', rating: 4.5, reviewCount: '3.4k', deliveryTime: '25-35 min', distance: '2.2 km', minOrder: 249, deliveryFee: 0, tags: ['Dairy', 'Fresh', 'South Indian'], isOpen: true, emoji: '🏪', section: ['best-seller', 'supermarket'] },
  { id: 'store-spar', name: 'SPAR Hypermarket', category: 'Hypermarket', rating: 4.4, reviewCount: '2.8k', deliveryTime: '30-40 min', distance: '3.0 km', minOrder: 399, deliveryFee: 0, tags: ['International', 'Premium', 'Bakery'], isOpen: true, emoji: '🛍️', section: ['best-seller', 'supermarket'] },
  { id: 'store-dry-fruits', name: 'Nutraj Premium Dry Fruits', category: 'Specialty', rating: 4.8, reviewCount: '1.2k', deliveryTime: '25-35 min', distance: '2.8 km', minOrder: 499, deliveryFee: 0, tags: ['Dry Fruits', 'Nuts', 'Gift Boxes'], isOpen: true, offerBadge: 'Premium', emoji: '🥜', section: ['trending'] },
  { id: 'store-chocolate', name: 'The Chocolate Factory', category: 'Specialty', rating: 4.9, reviewCount: '890', deliveryTime: '20-30 min', distance: '2.0 km', minOrder: 299, deliveryFee: 0, tags: ['Chocolates', 'Gifts', 'Premium'], isOpen: true, emoji: '🍫', section: ['trending'] },
  { id: 'store-tea-house', name: 'The Tea House', category: 'Specialty', rating: 4.7, reviewCount: '650', deliveryTime: '20-30 min', distance: '1.8 km', minOrder: 199, deliveryFee: 15, tags: ['Tea', 'Coffee', 'Artisan'], isOpen: true, emoji: '🍵', section: ['trending'] },
  { id: 'store-ready-meals', name: 'Ready Meals Kitchen', category: 'Ready Food', rating: 4.5, reviewCount: '1.5k', deliveryTime: '15-20 min', distance: '1.0 km', minOrder: 149, deliveryFee: 10, tags: ['Ready-to-Eat', 'Thali', 'Combos'], isOpen: true, emoji: '🍱', section: ['trending', 'fast-delivery'] },
  { id: 'store-health-mart', name: 'HealthMart Organics', category: 'Health Store', rating: 4.6, reviewCount: '580', deliveryTime: '25-35 min', distance: '2.5 km', minOrder: 299, deliveryFee: 0, tags: ['Health', 'Protein', 'Supplements'], isOpen: true, emoji: '💪', section: ['trending', 'organic'] },
];

// ── Helper: Get stores by section ─────────────────────────────────────────

export function getStoresBySection(section: string): GroceryStore[] {
  return GROCERY_STORES.filter(s => s.section.includes(section) && s.isOpen);
}

// ── 24 Categories — imported from canonical single source of truth ─────────
// Edit apps/web/src/lib/grocery-categories.ts to update categories across
// the admin panel, this page, seller portal, and Flutter app simultaneously.
export { GROCERY_CATEGORIES } from '@/lib/modules/grocery-categories';
export type { GroceryCategory } from '@/lib/modules/grocery-categories';


// ── Homepage Product Sections ─────────────────────────────────────────────

export const FRUITS_VEGETABLES: GroceryProduct[] = [
  { id: 'gp-tomato', name: 'Fresh Tomatoes', brand: 'Fresho', weight: '1 kg', unit: 'kg', price: 42, mrp: 55, emoji: '🍅', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Farm Fresh', delivery: '15 min' },
  { id: 'gp-onion', name: 'Red Onion', brand: 'Fresho', weight: '1 kg', unit: 'kg', price: 38, mrp: 45, emoji: '🧅', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-potato', name: 'Fresh Potatoes', brand: 'Fresho', weight: '1 kg', unit: 'kg', price: 32, mrp: 40, emoji: '🥔', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-banana', name: 'Robusta Bananas', brand: 'Fresho', weight: '1 dozen', unit: 'dozen', price: 49, mrp: 60, emoji: '🍌', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Handpicked', delivery: '12 min' },
  { id: 'gp-apple', name: 'Kashmir Apple', brand: 'Organic Valley', weight: '1 kg', unit: 'kg', price: 189, mrp: 220, emoji: '🍎', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Premium', delivery: '20 min' },
  { id: 'gp-mango', name: 'Alphonso Mango (Ratnagiri)', brand: 'Organic', weight: '1 dozen', unit: 'box', price: 850, mrp: 999, emoji: '🥭', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Seasonal', delivery: '25 min' },
  { id: 'gp-spinach', name: 'Fresh Spinach (Palak)', brand: 'Fresho', weight: '250 g', unit: 'g', price: 25, mrp: 30, emoji: '🥬', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Farm Fresh', delivery: '15 min' },
  { id: 'gp-carrot', name: 'Organic Carrots', brand: 'Happy Harvest', weight: '500 g', unit: 'g', price: 45, mrp: 55, emoji: '🥕', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Organic', delivery: '18 min' },
  { id: 'gp-capsicum', name: 'Green Capsicum', brand: 'Fresho', weight: '500 g', unit: 'g', price: 65, mrp: 80, emoji: '🫑', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-grapes', name: 'Seedless Green Grapes', brand: 'Imported', weight: '500 g', unit: 'g', price: 120, mrp: 150, emoji: '🍇', category: 'fruits-vegetables', storeName: 'Green Basket Veggies', inStock: true, isVeg: true, freshLabel: 'Imported', delivery: '20 min' },
];

export const FRESH_MEAT_FISH: GroceryProduct[] = [
  { id: 'gp-chicken-breast', name: 'Chicken Breast (Boneless)', brand: 'Premium Catch', weight: '500 g', unit: 'g', price: 249, mrp: 299, emoji: '🍗', category: 'fresh-meat', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, freshLabel: 'Fresh Today', delivery: '30 min' },
  { id: 'gp-mutton-curry', name: 'Mutton Curry Cut', brand: 'Premium Catch', weight: '500 g', unit: 'g', price: 520, mrp: 599, emoji: '🥩', category: 'fresh-meat', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, freshLabel: 'Fresh Today', delivery: '35 min' },
  { id: 'gp-salmon', name: 'Fresh Atlantic Salmon', brand: 'Ocean Fresh', weight: '500 g', unit: 'g', price: 850, mrp: 999, emoji: '🐟', category: 'fresh-fish', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, freshLabel: 'Premium Catch', delivery: '40 min' },
  { id: 'gp-prawns', name: 'Jumbo Tiger Prawns', brand: 'Ocean Fresh', weight: '500 g', unit: 'g', price: 599, mrp: 699, emoji: '🦐', category: 'fresh-fish', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, freshLabel: 'Fresh Today', delivery: '40 min' },
  { id: 'gp-chicken-whole', name: 'Whole Chicken (Cleaned)', brand: 'Country Farm', weight: '1 kg', unit: 'kg', price: 299, mrp: 350, emoji: '🐔', category: 'fresh-meat', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, delivery: '30 min' },
  { id: 'gp-eggs', name: 'Farm Fresh Eggs', brand: 'Country Farm', weight: '12 pcs', unit: 'pack', price: 89, mrp: 99, emoji: '🥚', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, freshLabel: 'Free Range', delivery: '15 min' },
  { id: 'gp-pomfret', name: 'White Pomfret (Whole)', brand: 'Ocean Fresh', weight: '500 g', unit: 'g', price: 650, mrp: 750, emoji: '🐠', category: 'fresh-fish', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, freshLabel: 'Coastal Catch', delivery: '40 min' },
  { id: 'gp-lamb-chops', name: 'Lamb Chops (Premium)', brand: 'Al-Madina', weight: '500 g', unit: 'g', price: 699, mrp: 799, emoji: '🍖', category: 'fresh-meat', storeName: 'Premium Meat & Catch', inStock: true, isVeg: false, freshLabel: 'Halal Certified', delivery: '35 min' },
];

export const DAIRY_BREAD: GroceryProduct[] = [
  { id: 'gp-milk-1l', name: 'Amul Taaza Toned Milk', brand: 'Amul', weight: '1 litre', unit: 'litre', price: 27, mrp: 27, emoji: '🥛', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, freshLabel: 'Daily Fresh', delivery: '10 min' },
  { id: 'gp-curd', name: 'Fresh Curd (Dahi)', brand: 'Amul', weight: '400 g', unit: 'g', price: 35, mrp: 40, emoji: '🍶', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-paneer', name: 'Fresh Paneer', brand: 'Amul', weight: '200 g', unit: 'g', price: 80, mrp: 90, emoji: '🧀', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, freshLabel: 'Fresh Today', delivery: '15 min' },
  { id: 'gp-butter', name: 'Amul Butter', brand: 'Amul', weight: '500 g', unit: 'g', price: 270, mrp: 280, emoji: '🧈', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-bread', name: 'Brown Bread (Multigrain)', brand: 'Britannia', weight: '400 g', unit: 'g', price: 50, mrp: 55, emoji: '🍞', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, freshLabel: 'Baked Fresh', delivery: '12 min' },
  { id: 'gp-cheese', name: 'Cheddar Cheese Slices', brand: 'Amul', weight: '200 g', unit: 'g', price: 120, mrp: 135, emoji: '🧀', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-ghee', name: 'Amul Pure Ghee', brand: 'Amul', weight: '500 ml', unit: 'ml', price: 315, mrp: 340, emoji: '🍯', category: 'cooking-oil-ghee', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-greek-yogurt', name: 'Greek Yogurt (Strawberry)', brand: 'Epigamia', weight: '90 g', unit: 'g', price: 55, mrp: 60, emoji: '🍓', category: 'dairy-bread-eggs', storeName: 'CoolDairy Hub', inStock: true, isVeg: true, delivery: '12 min' },
];

export const DAILY_ESSENTIALS: GroceryProduct[] = [
  { id: 'gp-rice-5kg', name: 'India Gate Basmati Rice', brand: 'India Gate', weight: '5 kg', unit: 'kg', price: 599, mrp: 699, emoji: '🍚', category: 'rice-flour-pulses', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '25 min' },
  { id: 'gp-atta', name: 'Aashirvaad Whole Wheat Atta', brand: 'Aashirvaad', weight: '5 kg', unit: 'kg', price: 275, mrp: 310, emoji: '🌾', category: 'rice-flour-pulses', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '25 min' },
  { id: 'gp-toor-dal', name: 'Tata Toor Dal', brand: 'Tata', weight: '1 kg', unit: 'kg', price: 165, mrp: 185, emoji: '🫘', category: 'rice-flour-pulses', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '20 min' },
  { id: 'gp-sugar', name: 'Uttam Sugar', brand: 'Uttam', weight: '1 kg', unit: 'kg', price: 45, mrp: 48, emoji: '🍬', category: 'rice-flour-pulses', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-sunflower-oil', name: 'Fortune Sunflower Oil', brand: 'Fortune', weight: '1 litre', unit: 'litre', price: 140, mrp: 160, emoji: '🫒', category: 'cooking-oil-ghee', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '20 min' },
  { id: 'gp-salt', name: 'Tata Salt', brand: 'Tata', weight: '1 kg', unit: 'kg', price: 22, mrp: 24, emoji: '🧂', category: 'masala-spices', storeName: 'SpiceWorld', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-turmeric', name: 'MDH Turmeric Powder', brand: 'MDH', weight: '100 g', unit: 'g', price: 42, mrp: 48, emoji: '🌶️', category: 'masala-spices', storeName: 'SpiceWorld', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-mustard-oil', name: 'Fortune Mustard Oil', brand: 'Fortune', weight: '1 litre', unit: 'litre', price: 175, mrp: 195, emoji: '🫙', category: 'cooking-oil-ghee', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '20 min' },
];

export const SNACKS_BEVERAGES: GroceryProduct[] = [
  { id: 'gp-lays', name: "Lay's Classic Salted", brand: "Lay's", weight: '90 g', unit: 'g', price: 20, mrp: 20, emoji: '🥔', category: 'snacks-packaged', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-maggi', name: 'Maggi 2-Minute Noodles', brand: 'Nestle', weight: '4 pack', unit: 'pack', price: 56, mrp: 60, emoji: '🍜', category: 'snacks-packaged', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-biscuits', name: 'Britannia Good Day Butter', brand: 'Britannia', weight: '250 g', unit: 'g', price: 35, mrp: 40, emoji: '🍪', category: 'snacks-packaged', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-coke', name: 'Coca-Cola', brand: 'Coca-Cola', weight: '2 litre', unit: 'litre', price: 86, mrp: 96, emoji: '🥤', category: 'Beverages', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-tea', name: 'Tata Tea Gold', brand: 'Tata', weight: '500 g', unit: 'g', price: 265, mrp: 290, emoji: '🍵', category: 'Beverages', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-coffee', name: 'Nescafé Classic Coffee', brand: 'Nestle', weight: '200 g', unit: 'g', price: 390, mrp: 430, emoji: '☕', category: 'Beverages', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-haldirams', name: "Haldiram's Aloo Bhujia", brand: "Haldiram's", weight: '200 g', unit: 'g', price: 55, mrp: 60, emoji: '🥨', category: 'snacks-packaged', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-tropicana', name: 'Tropicana Orange Juice', brand: 'Tropicana', weight: '1 litre', unit: 'litre', price: 110, mrp: 130, emoji: '🍊', category: 'Beverages', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '15 min' },
];

export const HOUSEHOLD_PRODUCTS: GroceryProduct[] = [
  { id: 'gp-surf', name: 'Surf Excel Matic (Front Load)', brand: 'HUL', weight: '2 kg', unit: 'kg', price: 420, mrp: 490, emoji: '🧺', category: 'household-cleaning', storeName: 'FreshMart Supermarket', inStock: true, delivery: '20 min' },
  { id: 'gp-vim', name: 'Vim Dishwash Liquid Gel', brand: 'HUL', weight: '500 ml', unit: 'ml', price: 99, mrp: 115, emoji: '🍽️', category: 'household-cleaning', storeName: 'FreshMart Supermarket', inStock: true, delivery: '15 min' },
  { id: 'gp-harpic', name: 'Harpic Toilet Cleaner', brand: 'Reckitt', weight: '500 ml', unit: 'ml', price: 89, mrp: 99, emoji: '🚽', category: 'household-cleaning', storeName: 'FreshMart Supermarket', inStock: true, delivery: '15 min' },
  { id: 'gp-lizol', name: 'Lizol Floor Cleaner (Citrus)', brand: 'Reckitt', weight: '975 ml', unit: 'ml', price: 189, mrp: 220, emoji: '🧹', category: 'household-cleaning', storeName: 'FreshMart Supermarket', inStock: true, delivery: '15 min' },
  { id: 'gp-dettol-soap', name: 'Dettol Soap (4+1 Pack)', brand: 'Reckitt', weight: '5 × 125 g', unit: 'pack', price: 199, mrp: 240, emoji: '🧼', category: 'personal-care', storeName: 'FreshMart Supermarket', inStock: true, delivery: '15 min' },
  { id: 'gp-colgate', name: 'Colgate Strong Teeth', brand: 'Colgate', weight: '300 g', unit: 'g', price: 125, mrp: 140, emoji: '🪥', category: 'personal-care', storeName: 'FreshMart Supermarket', inStock: true, delivery: '12 min' },
];

export const BABY_PET_PRODUCTS: GroceryProduct[] = [
  { id: 'gp-pampers', name: 'Pampers Premium Care (L, 44)', brand: 'Pampers', weight: '44 pcs', unit: 'pack', price: 1149, mrp: 1399, emoji: '🧒', category: 'baby-care', storeName: 'BabyCare Mart', inStock: true, delivery: '25 min' },
  { id: 'gp-cerelac', name: 'Cerelac Wheat Honey (Stage 2)', brand: 'Nestle', weight: '300 g', unit: 'g', price: 225, mrp: 250, emoji: '🍯', category: 'baby-care', storeName: 'BabyCare Mart', inStock: true, delivery: '20 min' },
  { id: 'gp-baby-wipes', name: 'Himalaya Baby Wipes', brand: 'Himalaya', weight: '72 pcs', unit: 'pack', price: 175, mrp: 199, emoji: '🧻', category: 'baby-care', storeName: 'BabyCare Mart', inStock: true, delivery: '20 min' },
  { id: 'gp-dog-food', name: 'Pedigree Adult Dry Dog Food', brand: 'Pedigree', weight: '3 kg', unit: 'kg', price: 499, mrp: 580, emoji: '🐕', category: 'pet-care', storeName: 'PetLove Store', inStock: true, delivery: '30 min' },
  { id: 'gp-cat-food', name: 'Whiskas Cat Food (Tuna)', brand: 'Whiskas', weight: '1.2 kg', unit: 'kg', price: 399, mrp: 450, emoji: '🐱', category: 'pet-care', storeName: 'PetLove Store', inStock: true, delivery: '30 min' },
];

// ── Trust Badges ──────────────────────────────────────────────────────────

export const GROCERY_TRUST_BADGES: GroceryTrustBadge[] = [
  { id: 'fresh-guarantee', title: 'Fresh Guarantee', subtitle: 'Quality checked & packed fresh', emoji: '✅', color: 'text-green-600' },
  { id: 'fast-delivery', title: 'Fast Delivery', subtitle: 'As fast as 10 minutes', emoji: '⚡', color: 'text-blue-600' },
  { id: 'easy-returns', title: 'Easy Returns', subtitle: 'No questions asked refunds', emoji: '↩️', color: 'text-orange-600' },
  { id: 'secure-payment', title: 'Secure Payment', subtitle: '100% safe transactions', emoji: '🔒', color: 'text-purple-600' },
  { id: 'best-prices', title: 'Best Prices', subtitle: 'guaranteed competitive rates', emoji: '💰', color: 'text-emerald-600' },
];

// ── Hero Banners ──────────────────────────────────────────────────────────

export const GROCERY_HERO_BANNERS: GroceryBanner[] = [
  { id: 'hero-1', tag: 'LIGHTNING FAST', headline: 'Fresh Groceries\nDelivered in 10 Mins', subheadline: 'Order from your favorite local stores', cta: 'Order Now', ctaHref: '/grocery', gradient: 'from-green-700 via-green-600 to-emerald-500', emoji: '🛒' },
  { id: 'hero-2', tag: 'FRESH DEALS', headline: 'Farm Fresh Produce\nUp to 40% Off', subheadline: 'Handpicked fruits & vegetables daily', cta: 'Shop Fresh', ctaHref: '/grocery/category/fruits-vegetables', gradient: 'from-emerald-700 via-teal-600 to-green-500', emoji: '🥬' },
  { id: 'hero-3', tag: 'MEAT SPECIAL', headline: 'Premium Meat & Fish\nFresh Every Morning', subheadline: 'Hygienically processed & chilled', cta: 'Shop Meat', ctaHref: '/grocery/category/fresh-meat', gradient: 'from-red-700 via-rose-600 to-red-500', emoji: '🥩' },
  { id: 'hero-4', tag: 'DAILY ESSENTIALS', headline: 'Stock Up & Save\nBulk Buy Offers', subheadline: 'Rice, oil, atta, sugar — everything you need', cta: 'Shop Essentials', ctaHref: '/grocery/category/rice-flour-pulses', gradient: 'from-amber-700 via-orange-600 to-yellow-500', emoji: '🌾' },
];

// ── Campaign Banners ──────────────────────────────────────────────────────

export const GROCERY_CAMPAIGNS: GroceryBanner[] = [
  { id: 'campaign-meat', tag: 'TODAY ONLY', headline: 'Flat 20% Off on Fresh Meat', subheadline: 'Use code FRESHMEAT20 • Min order ₹499', cta: 'Shop Now', ctaHref: '/grocery/category/fresh-meat', gradient: 'from-red-500 to-orange-500', emoji: '🥩' },
  { id: 'campaign-dairy', tag: 'DAIRY FEST', headline: 'Buy 1 Get 1 Free on Dairy', subheadline: 'Milk, curd, paneer — all included', cta: 'Grab Offer', ctaHref: '/grocery/category/dairy-bread-eggs', gradient: 'from-blue-500 to-cyan-500', emoji: '🥛' },
  { id: 'campaign-summer', tag: 'SUMMER COOL', headline: 'Beverages & Ice Cream Sale', subheadline: 'Beat the heat — up to 30% off', cta: 'Shop Cool', ctaHref: '/grocery/category/beverages', gradient: 'from-sky-500 to-indigo-500', emoji: '🍹' },
];

// ── Brands ─────────────────────────────────────────────────────────────────

export const GROCERY_BRANDS: GroceryBrand[][] = [
  [
    { id: 'brand-amul', name: 'Amul', emoji: '🥛', color: 'from-red-400 to-red-600' },
    { id: 'brand-nestle', name: 'Nestle', emoji: '🍫', color: 'from-blue-400 to-blue-600' },
    { id: 'brand-tata', name: 'Tata', emoji: '🍵', color: 'from-indigo-400 to-indigo-600' },
    { id: 'brand-britannia', name: 'Britannia', emoji: '🍪', color: 'from-yellow-400 to-amber-600' },
    { id: 'brand-haldiram', name: "Haldiram's", emoji: '🥨', color: 'from-orange-400 to-orange-600' },
    { id: 'brand-parle', name: 'Parle', emoji: '🍘', color: 'from-yellow-500 to-yellow-700' },
    { id: 'brand-itc', name: 'ITC', emoji: '🌾', color: 'from-green-400 to-green-600' },
    { id: 'brand-dabur', name: 'Dabur', emoji: '🌿', color: 'from-lime-400 to-lime-600' },
  ],
  [
    { id: 'brand-mdh', name: 'MDH', emoji: '🌶️', color: 'from-red-500 to-red-700' },
    { id: 'brand-patanjali', name: 'Patanjali', emoji: '🧘', color: 'from-amber-400 to-amber-600' },
    { id: 'brand-pepsi', name: 'Pepsi', emoji: '🥤', color: 'from-blue-500 to-blue-700' },
    { id: 'brand-coca-cola', name: 'Coca-Cola', emoji: '🥂', color: 'from-red-500 to-rose-700' },
    { id: 'brand-lays', name: "Lay's", emoji: '🥔', color: 'from-yellow-400 to-yellow-600' },
    { id: 'brand-maggi', name: 'Maggi', emoji: '🍜', color: 'from-red-400 to-yellow-500' },
    { id: 'brand-surf', name: 'Surf Excel', emoji: '🫧', color: 'from-sky-400 to-sky-600' },
    { id: 'brand-dettol', name: 'Dettol', emoji: '🧴', color: 'from-emerald-400 to-emerald-600' },
  ],
];

// ── FAQ for AEO ────────────────────────────────────────────────────────────

// Region-tagged, like the marketplace FAQ. These answers are the ones search
// engines quote back, so a wrong one is worse than no answer at all: the
// originals promised UPI rails, rupee delivery thresholds and a country list
// the platform does not trade in. Untagged entries are true everywhere.
export const GROCERY_FAQ: { q: string; a: string; regions?: string[] }[] = [
  { q: 'How can I order groceries on KARTSEEK?', a: 'Browse nearby grocery stores on the KARTSEEK Grocery homepage, select a store, add products to your cart, and proceed to checkout. Available payment methods are shown at checkout for your country.' },
  { q: 'Can I buy from nearby grocery stores?', a: 'Yes! KARTSEEK shows you grocery stores near your location. Set your delivery address and we will display stores that deliver to your area, sorted by distance and delivery time.' },
  { q: 'How do I find fresh meat and fish stores?', a: 'Look for the "Fresh Meat & Fish" section on the Grocery homepage, or browse the Fresh Meat and Fresh Fish categories. All meat products are hygienically processed and delivered chilled.' },
  { q: 'Can I choose a delivery time?', a: 'Some stores offer scheduled delivery slots. During checkout, you can select your preferred delivery window if the store supports it. Most orders are delivered within 15-45 minutes.' },
  { q: 'How are grocery delivery charges calculated?', a: 'Delivery charges vary by store and distance. Many stores offer free delivery once your basket passes their minimum order value. The exact fee is shown before checkout.' },
  { q: 'Can I return grocery items?', a: 'Yes, KARTSEEK offers hassle-free returns for grocery items. If you receive damaged, expired, or wrong products, you can request a refund within 24 hours of delivery through the order history page.' },
  { regions: ['IN'], q: 'What payment methods are accepted?', a: 'KARTSEEK accepts UPI (Google Pay, PhonePe, Paytm), credit/debit cards, net banking, mobile wallets, and cash on delivery (COD) for eligible orders.' },
  { regions: ['QA'], q: 'What payment methods are accepted?', a: 'KARTSEEK accepts Himyan and NAPS debit cards, Visa and Mastercard credit and debit cards, your KARTSEEK wallet, and cash on delivery (COD) for eligible orders.' },
  { regions: ['AE', 'SA', 'BH', 'KW', 'OM'], q: 'What payment methods are accepted?', a: 'KARTSEEK accepts local debit networks, Visa and Mastercard credit and debit cards, your KARTSEEK wallet, and cash on delivery (COD) for eligible orders.' },
  { q: 'Which countries does KARTSEEK Grocery support?', a: `KARTSEEK Grocery operates in ${formatActiveCountryList()}. Each country has localized stores, pricing, and delivery options.` },
];

// ── Country Banners ───────────────────────────────────────────────────────

export const GROCERY_COUNTRY_BANNERS = [
  { id: 'india', country: 'India', flag: '🇮🇳', subtitle: 'Kirana, supermarket & farm-fresh stores', href: '/grocery' },
  { id: 'qatar', country: 'Qatar', flag: '🇶🇦', subtitle: 'Baqala, hypermarket & meat shops', href: '/grocery' },
  { id: 'uae', country: 'UAE', flag: '🇦🇪', subtitle: 'Carrefour, LuLu & local stores', href: '/grocery' },
  { id: 'uk', country: 'UK', flag: '🇬🇧', subtitle: 'Tesco, Sainsbury\'s & corner shops', href: '/grocery' },
  { id: 'usa', country: 'USA', flag: '🇺🇸', subtitle: 'Walmart, Whole Foods & local markets', href: '/grocery' },
];

// ── New Category Products ─────────────────────────────────────────────────

export const READY_TO_COOK: GroceryProduct[] = [
  { id: 'gp-chicken-tikka-rtc', name: 'Chicken Tikka (Marinated)', brand: 'ITC Master Chef', weight: '450 g', unit: 'g', price: 299, mrp: 350, emoji: '🍗', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: false, freshLabel: 'Marinated', delivery: '20 min' },
  { id: 'gp-paneer-tikka-rtc', name: 'Paneer Tikka Kit', brand: 'Haldirams', weight: '300 g', unit: 'g', price: 199, mrp: 249, emoji: '🧀', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '18 min' },
  { id: 'gp-seekh-kebab', name: 'Seekh Kebab (Ready to Grill)', brand: 'Premium Catch', weight: '500 g', unit: 'g', price: 349, mrp: 399, emoji: '🥩', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: false, freshLabel: 'Fresh', delivery: '25 min' },
  { id: 'gp-stir-fry-veg', name: 'Stir Fry Vegetable Mix', brand: 'Fresho', weight: '300 g', unit: 'g', price: 89, mrp: 110, emoji: '🥘', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, freshLabel: 'Pre-Cut', delivery: '15 min' },
  { id: 'gp-fish-fry-rtc', name: 'Fish Fry (Masala Coated)', brand: 'Ocean Fresh', weight: '400 g', unit: 'g', price: 399, mrp: 450, emoji: '🐟', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: false, freshLabel: 'Marinated', delivery: '25 min' },
  { id: 'gp-soup-mix', name: 'Hot & Sour Soup Mix', brand: 'Ching\'s', weight: '55 g', unit: 'g', price: 35, mrp: 40, emoji: '🥣', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-pasta-sauce', name: 'Pasta + Sauce Combo Kit', brand: 'Del Monte', weight: '500 g', unit: 'g', price: 149, mrp: 180, emoji: '🍝', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-paratha-ready', name: 'Malabar Paratha (Frozen)', brand: 'ITC', weight: '5 pcs', unit: 'pack', price: 85, mrp: 95, emoji: '🫓', category: 'ready-to-cook', storeName: 'FreshMart Supermarket', inStock: true, isVeg: true, delivery: '12 min' },
];

export const READY_TO_EAT: GroceryProduct[] = [
  { id: 'gp-dal-makhani-rte', name: 'Dal Makhani (Heat & Eat)', brand: 'MTR', weight: '300 g', unit: 'g', price: 89, mrp: 99, emoji: '🍛', category: 'ready-to-eat', storeName: 'QuickBite Kitchen', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-rajma-chawal', name: 'Rajma Chawal Combo', brand: 'Gits', weight: '300 g', unit: 'g', price: 110, mrp: 130, emoji: '🍚', category: 'ready-to-eat', storeName: 'QuickBite Kitchen', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-upma-rte', name: 'Rava Upma (Instant)', brand: 'MTR', weight: '180 g', unit: 'g', price: 55, mrp: 65, emoji: '🥣', category: 'ready-to-eat', storeName: 'QuickBite Kitchen', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-poha-rte', name: 'Poha (Ready to Eat)', brand: 'MTR', weight: '180 g', unit: 'g', price: 55, mrp: 65, emoji: '🍚', category: 'ready-to-eat', storeName: 'QuickBite Kitchen', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-biryani-rte', name: 'Hyderabadi Chicken Biryani', brand: 'ITC Kitchen', weight: '375 g', unit: 'g', price: 189, mrp: 220, emoji: '🍗', category: 'ready-to-eat', storeName: 'QuickBite Kitchen', inStock: true, isVeg: false, freshLabel: 'Heat & Eat', delivery: '15 min' },
  { id: 'gp-paneer-butter', name: 'Paneer Butter Masala', brand: 'Haldirams', weight: '300 g', unit: 'g', price: 120, mrp: 140, emoji: '🧈', category: 'ready-to-eat', storeName: 'QuickBite Kitchen', inStock: true, isVeg: true, delivery: '12 min' },
];

export const DRY_FRUITS_NUTS: GroceryProduct[] = [
  { id: 'gp-almonds', name: 'California Almonds', brand: 'Nutraj', weight: '500 g', unit: 'g', price: 399, mrp: 499, emoji: '🌰', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, freshLabel: 'Premium', delivery: '20 min' },
  { id: 'gp-cashews', name: 'Whole Cashew Nuts (W-320)', brand: 'Nutraj', weight: '500 g', unit: 'g', price: 499, mrp: 599, emoji: '🥜', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, freshLabel: 'Premium', delivery: '20 min' },
  { id: 'gp-walnuts', name: 'Walnut Kernels', brand: 'Happilo', weight: '250 g', unit: 'g', price: 299, mrp: 350, emoji: '🧠', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, delivery: '20 min' },
  { id: 'gp-raisins', name: 'Golden Raisins (Kishmish)', brand: 'Nutraj', weight: '500 g', unit: 'g', price: 199, mrp: 250, emoji: '🍇', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, delivery: '18 min' },
  { id: 'gp-pistachios', name: 'Iranian Pistachios (Salted)', brand: 'Happilo', weight: '200 g', unit: 'g', price: 349, mrp: 420, emoji: '🌿', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, freshLabel: 'Imported', delivery: '20 min' },
  { id: 'gp-dates-medjool', name: 'Medjool Dates (Imported)', brand: 'Al Rawabi', weight: '500 g', unit: 'g', price: 599, mrp: 699, emoji: '🌴', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, freshLabel: 'Premium', delivery: '22 min' },
  { id: 'gp-mixed-nuts', name: 'Trail Mix (Nuts & Berries)', brand: 'Happilo', weight: '200 g', unit: 'g', price: 249, mrp: 299, emoji: '🥜', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, delivery: '18 min' },
  { id: 'gp-fig-anjeer', name: 'Dried Figs (Anjeer)', brand: 'Nutraj', weight: '250 g', unit: 'g', price: 280, mrp: 330, emoji: '🫘', category: 'dry-fruits-nuts', storeName: 'NutHouse Premium', inStock: true, isVeg: true, delivery: '20 min' },
];

export const CHOCOLATES_SWEETS: GroceryProduct[] = [
  { id: 'gp-dairy-milk', name: 'Cadbury Dairy Milk Silk', brand: 'Cadbury', weight: '150 g', unit: 'g', price: 160, mrp: 175, emoji: '🍫', category: 'chocolates-sweets', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-ferrero', name: 'Ferrero Rocher (16 pcs)', brand: 'Ferrero', weight: '200 g', unit: 'box', price: 499, mrp: 549, emoji: '🍬', category: 'chocolates-sweets', storeName: 'SnackZone Express', inStock: true, isVeg: true, freshLabel: 'Premium', delivery: '15 min' },
  { id: 'gp-kaju-katli', name: 'Kaju Katli (Premium)', brand: 'Haldirams', weight: '500 g', unit: 'g', price: 450, mrp: 520, emoji: '💛', category: 'chocolates-sweets', storeName: 'SnackZone Express', inStock: true, isVeg: true, freshLabel: 'Fresh Made', delivery: '20 min' },
  { id: 'gp-gulab-jamun', name: 'Gulab Jamun Tin', brand: 'Haldirams', weight: '1 kg', unit: 'kg', price: 299, mrp: 350, emoji: '🟤', category: 'chocolates-sweets', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-kitkat', name: 'KitKat 4-Finger (Pack of 6)', brand: 'Nestle', weight: '6 × 37.3 g', unit: 'pack', price: 180, mrp: 210, emoji: '🍫', category: 'chocolates-sweets', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '10 min' },
  { id: 'gp-rasgulla', name: 'Rasgulla (Tin)', brand: 'Bikano', weight: '1 kg', unit: 'kg', price: 199, mrp: 240, emoji: '⚪', category: 'chocolates-sweets', storeName: 'SnackZone Express', inStock: true, isVeg: true, delivery: '15 min' },
];

export const TEA_COFFEE_HEALTH: GroceryProduct[] = [
  { id: 'gp-tata-gold', name: 'Tata Tea Gold', brand: 'Tata', weight: '500 g', unit: 'g', price: 265, mrp: 290, emoji: '🍵', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-nescafe-classic', name: 'Nescafé Classic Coffee', brand: 'Nestle', weight: '200 g', unit: 'g', price: 390, mrp: 430, emoji: '☕', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, delivery: '15 min' },
  { id: 'gp-green-tea', name: 'Organic Green Tea (Tulsi)', brand: 'Organic India', weight: '25 bags', unit: 'pack', price: 175, mrp: 199, emoji: '🍃', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, freshLabel: 'Organic', delivery: '15 min' },
  { id: 'gp-bournvita', name: 'Cadbury Bournvita', brand: 'Cadbury', weight: '500 g', unit: 'g', price: 230, mrp: 260, emoji: '🥤', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-horlicks', name: 'Horlicks Classic Malt', brand: 'Horlicks', weight: '500 g', unit: 'g', price: 240, mrp: 275, emoji: '🥛', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, delivery: '12 min' },
  { id: 'gp-protein-shake', name: 'MuscleBlaze Raw Whey', brand: 'MuscleBlaze', weight: '1 kg', unit: 'kg', price: 1299, mrp: 1599, emoji: '💪', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, freshLabel: 'Health', delivery: '25 min' },
  { id: 'gp-kombucha', name: 'Kombucha (Ginger Lemon)', brand: 'Atmosphere', weight: '250 ml', unit: 'ml', price: 120, mrp: 140, emoji: '🫧', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, freshLabel: 'Probiotic', delivery: '18 min' },
  { id: 'gp-filter-coffee', name: 'South Indian Filter Coffee', brand: 'Leo Coffee', weight: '500 g', unit: 'g', price: 320, mrp: 360, emoji: '☕', category: 'tea-coffee-health', storeName: 'HealthFirst Grocery', inStock: true, isVeg: true, freshLabel: 'Artisan', delivery: '20 min' },
];

// ── Helper Functions ──────────────────────────────────────────────────────

// `formatGroceryPrice` used to live here as `'₹' + amount.toLocaleString('en-IN')`
// — a hardcoded rupee glyph and Indian digit grouping, called from eight
// customer-facing grocery screens, so the whole grocery storefront quoted
// rupees regardless of the market. Every caller now uses
// `useGroceryLocale().formatPrice`, which formats in the shopper's own currency.

export function groceryDiscountPercent(mrp: number, price: number): number {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * Generate store products from mock data for a given store.
 * This simulates having different products per store.
 */
export function getStoreProducts(storeId: string): GroceryProduct[] {
  const all = [
    ...FRUITS_VEGETABLES,
    ...FRESH_MEAT_FISH,
    ...DAIRY_BREAD,
    ...DAILY_ESSENTIALS,
    ...SNACKS_BEVERAGES,
    ...HOUSEHOLD_PRODUCTS,
    ...BABY_PET_PRODUCTS,
    ...READY_TO_COOK,
    ...READY_TO_EAT,
    ...DRY_FRUITS_NUTS,
    ...CHOCOLATES_SWEETS,
    ...TEA_COFFEE_HEALTH,
  ];
  // Look up the store's registered name for accurate branding
  const storeRecord = GROCERY_STORES.find(s => s.id === storeId);
  const resolvedStoreName = storeRecord?.name || storeId.replace(/store-/g, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Use storeId hash to deterministically select and shuffle products
  const hash = storeId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = [...all].sort((a, b) => {
    const ha = (a.id.charCodeAt(0) + hash) % 100;
    const hb = (b.id.charCodeAt(0) + hash) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, 20 + (hash % 15)).map(p => ({ ...p, storeId, storeName: resolvedStoreName }));
}

/**
 * Get all products across all categories
 */
export function getAllProducts(): GroceryProduct[] {
  return [
    ...FRUITS_VEGETABLES,
    ...FRESH_MEAT_FISH,
    ...DAIRY_BREAD,
    ...DAILY_ESSENTIALS,
    ...SNACKS_BEVERAGES,
    ...HOUSEHOLD_PRODUCTS,
    ...BABY_PET_PRODUCTS,
    ...READY_TO_COOK,
    ...READY_TO_EAT,
    ...DRY_FRUITS_NUTS,
    ...CHOCOLATES_SWEETS,
    ...TEA_COFFEE_HEALTH,
  ];
}

/**
 * Find a store by ID
 */
export function findStoreById(storeId: string): GroceryStore | undefined {
  return GROCERY_STORES.find(s => s.id === storeId);
}

// ── Flash Deals ─────────────────────────────────────────────────────────────

export type FlashDealStatus = 'pending' | 'approved' | 'active' | 'expired' | 'rejected' | 'paused';

export interface FlashDeal {
  id: string;
  productId: string;
  productName: string;
  productEmoji: string;
  storeId: string;
  storeName: string;
  category: string;
  originalPrice: number;
  flashPrice: number;
  discountPercent: number;
  startTime: string;   // ISO timestamp
  endTime: string;     // ISO timestamp
  stockLimit: number;
  soldCount: number;
  status: FlashDealStatus;
  submittedAt: string;
  approvedAt?: string;
}

// Generate end times: some deals end today, some tomorrow, some in 2 days
const now = new Date();
const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
const endTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
const endIn2Days = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

export const FLASH_DEALS: FlashDeal[] = [
  // ── FreshMart Supermarket (store-freshmart) ──
  { id: 'fd-1', productId: 'gp-f1', productName: 'Organic Bananas (1 Dozen)', productEmoji: '🍌', storeId: 'store-freshmart', storeName: 'FreshMart Supermarket', category: 'Fruits & Vegetables', originalPrice: 89, flashPrice: 49, discountPercent: 45, startTime: startToday, endTime: endToday, stockLimit: 50, soldCount: 37, status: 'active', submittedAt: yesterday, approvedAt: yesterday },
  { id: 'fd-2', productId: 'gp-d1', productName: 'Full Cream Milk 1L', productEmoji: '🥛', storeId: 'store-freshmart', storeName: 'FreshMart Supermarket', category: 'Dairy & Bread', originalPrice: 68, flashPrice: 45, discountPercent: 34, startTime: startToday, endTime: endTomorrow, stockLimit: 100, soldCount: 62, status: 'active', submittedAt: yesterday, approvedAt: yesterday },
  { id: 'fd-3', productId: 'gp-e3', productName: 'Basmati Rice Premium 5kg', productEmoji: '🍚', storeId: 'store-freshmart', storeName: 'FreshMart Supermarket', category: 'Daily Essentials', originalPrice: 599, flashPrice: 399, discountPercent: 33, startTime: startToday, endTime: endIn2Days, stockLimit: 30, soldCount: 18, status: 'active', submittedAt: yesterday, approvedAt: yesterday },

  // ── QuickStop Express (store-quick-stop) ──
  { id: 'fd-4', productId: 'gp-m2', productName: 'Chicken Breast Boneless 500g', productEmoji: '🍗', storeId: 'store-quick-stop', storeName: 'Quick Stop Express', category: 'Fresh Meat & Fish', originalPrice: 320, flashPrice: 199, discountPercent: 38, startTime: startToday, endTime: endToday, stockLimit: 40, soldCount: 28, status: 'active', submittedAt: yesterday, approvedAt: yesterday },
  { id: 'fd-5', productId: 'gp-s2', productName: 'Premium Potato Chips 150g', productEmoji: '🥔', storeId: 'store-quick-stop', storeName: 'Quick Stop Express', category: 'Snacks & Beverages', originalPrice: 99, flashPrice: 59, discountPercent: 40, startTime: startToday, endTime: endTomorrow, stockLimit: 80, soldCount: 55, status: 'active', submittedAt: yesterday, approvedAt: yesterday },

  // ── Organic Valley (store-organic-valley) ──
  { id: 'fd-6', productId: 'gp-f4', productName: 'Organic Avocados (Pack of 3)', productEmoji: '🥑', storeId: 'store-organic-valley', storeName: 'Organic Valley', category: 'Fruits & Vegetables', originalPrice: 249, flashPrice: 149, discountPercent: 40, startTime: startToday, endTime: endToday, stockLimit: 25, soldCount: 19, status: 'active', submittedAt: yesterday, approvedAt: yesterday },
  { id: 'fd-7', productId: 'gp-h2', productName: 'Green Tea Bags (25 pack)', productEmoji: '🍵', storeId: 'store-organic-valley', storeName: 'Organic Valley', category: 'Tea, Coffee & Health', originalPrice: 199, flashPrice: 119, discountPercent: 40, startTime: startToday, endTime: endIn2Days, stockLimit: 60, soldCount: 32, status: 'active', submittedAt: yesterday, approvedAt: yesterday },

  // ── Premium Meat House (store-premium-meat) ──
  { id: 'fd-8', productId: 'gp-m5', productName: 'Fresh Salmon Fillet 500g', productEmoji: '🐟', storeId: 'store-premium-meat', storeName: 'Premium Meat House', category: 'Fresh Meat & Fish', originalPrice: 899, flashPrice: 599, discountPercent: 33, startTime: startToday, endTime: endToday, stockLimit: 20, soldCount: 14, status: 'active', submittedAt: yesterday, approvedAt: yesterday },
  { id: 'fd-9', productId: 'gp-m1', productName: 'Farm-Fresh Whole Chicken 1kg', productEmoji: '🍗', storeId: 'store-premium-meat', storeName: 'Premium Meat House', category: 'Fresh Meat & Fish', originalPrice: 350, flashPrice: 249, discountPercent: 29, startTime: startToday, endTime: endTomorrow, stockLimit: 35, soldCount: 22, status: 'active', submittedAt: yesterday, approvedAt: yesterday },

  // ── Sunrise Grocery Mart (store-sunrise) ──
  { id: 'fd-10', productId: 'gp-n1', productName: 'Premium Almonds 250g', productEmoji: '🥜', storeId: 'store-sunrise', storeName: 'Sunrise Grocery Mart', category: 'Dry Fruits & Nuts', originalPrice: 399, flashPrice: 249, discountPercent: 38, startTime: startToday, endTime: endIn2Days, stockLimit: 45, soldCount: 30, status: 'active', submittedAt: yesterday, approvedAt: yesterday },
  { id: 'fd-11', productId: 'gp-e1', productName: 'Refined Sunflower Oil 1L', productEmoji: '🫒', storeId: 'store-sunrise', storeName: 'Sunrise Grocery Mart', category: 'Daily Essentials', originalPrice: 189, flashPrice: 129, discountPercent: 32, startTime: startToday, endTime: endToday, stockLimit: 70, soldCount: 48, status: 'active', submittedAt: yesterday, approvedAt: yesterday },

  // ── Smart Saver Store (store-smart-saver) ──
  { id: 'fd-12', productId: 'gp-s5', productName: 'Chocolate Cookies Box 300g', productEmoji: '🍪', storeId: 'store-smart-saver', storeName: 'Smart Saver Store', category: 'Snacks & Beverages', originalPrice: 149, flashPrice: 89, discountPercent: 40, startTime: startToday, endTime: endTomorrow, stockLimit: 90, soldCount: 71, status: 'active', submittedAt: yesterday, approvedAt: yesterday },

  // ── Pending / Expired deals (for admin panel) ──
  { id: 'fd-13', productId: 'gp-d3', productName: 'Greek Yogurt 400g', productEmoji: '🥛', storeId: 'store-freshmart', storeName: 'FreshMart Supermarket', category: 'Dairy & Bread', originalPrice: 120, flashPrice: 79, discountPercent: 34, startTime: endTomorrow, endTime: endIn2Days, stockLimit: 40, soldCount: 0, status: 'pending', submittedAt: startToday },
  { id: 'fd-14', productId: 'gp-f3', productName: 'Red Grapes 500g', productEmoji: '🍇', storeId: 'store-organic-valley', storeName: 'Organic Valley', category: 'Fruits & Vegetables', originalPrice: 159, flashPrice: 99, discountPercent: 38, startTime: endTomorrow, endTime: endIn2Days, stockLimit: 30, soldCount: 0, status: 'pending', submittedAt: startToday },
  { id: 'fd-15', productId: 'gp-s1', productName: 'Masala Peanuts 200g', productEmoji: '🥜', storeId: 'store-quick-stop', storeName: 'Quick Stop Express', category: 'Snacks & Beverages', originalPrice: 69, flashPrice: 39, discountPercent: 43, startTime: yesterday, endTime: startToday, stockLimit: 50, soldCount: 50, status: 'expired', submittedAt: yesterday, approvedAt: yesterday },
];

/** Get stores that have active flash deals */
export function getFlashDealStores(): (GroceryStore & { activeDeals: number; maxDiscount: number })[] {
  const activeDeals = FLASH_DEALS.filter(d => d.status === 'active');
  const storeMap = new Map<string, { count: number; maxDiscount: number }>();
  activeDeals.forEach(d => {
    const entry = storeMap.get(d.storeId) || { count: 0, maxDiscount: 0 };
    entry.count++;
    entry.maxDiscount = Math.max(entry.maxDiscount, d.discountPercent);
    storeMap.set(d.storeId, entry);
  });
  return Array.from(storeMap.entries())
    .map(([storeId, info]) => {
      const store = findStoreById(storeId);
      if (!store) return null;
      return { ...store, activeDeals: info.count, maxDiscount: info.maxDiscount };
    })
    .filter(Boolean) as (GroceryStore & { activeDeals: number; maxDiscount: number })[];
}

/** Get flash deal products for a specific store */
export function getFlashDealsByStore(storeId: string): FlashDeal[] {
  return FLASH_DEALS.filter(d => d.storeId === storeId && d.status === 'active');
}

/** Get all active flash deals */
export function getActiveFlashDeals(): FlashDeal[] {
  return FLASH_DEALS.filter(d => d.status === 'active');
}

