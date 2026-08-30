// lib/mock/grocery-country-data.ts
// KARTSEEK Grocery — Per-country stores, brands, products, banners
// Each country gets its own localized grocery ecosystem

import type { GroceryCountryCode } from '@/i18n/grocery-locale';
import type { GroceryStore, GroceryProduct, GroceryBanner } from './grocery-home';

// ── Country Brand Type ────────────────────────────────────────────────────

export interface CountryBrand {
  id: string;
  name: string;
  nameAr?: string;
  emoji: string;
  color: string;
  countries: GroceryCountryCode[];
  productCount: number;
  offerBadge?: string;
  description: string;
  descriptionAr?: string;
}

// ── All Brands (30+) ──────────────────────────────────────────────────────

export const ALL_BRANDS: CountryBrand[] = [
  // India
  { id: 'amul', name: 'Amul', emoji: '🥛', color: 'from-red-400 to-red-600', countries: ['IN'], productCount: 85, description: "India's favourite dairy brand", offerBadge: '10% OFF' },
  { id: 'tata', name: 'Tata', emoji: '🍵', color: 'from-indigo-400 to-indigo-600', countries: ['IN'], productCount: 120, description: 'Trusted household essentials' },
  { id: 'britannia', name: 'Britannia', emoji: '🍪', color: 'from-yellow-400 to-amber-600', countries: ['IN'], productCount: 95, description: 'Biscuits, bread & dairy', offerBadge: 'Buy 2 Save 15%' },
  { id: 'haldirams', name: "Haldiram's", emoji: '🥨', color: 'from-orange-400 to-orange-600', countries: ['IN'], productCount: 60, description: 'Authentic Indian snacks' },
  { id: 'mdh', name: 'MDH', emoji: '🌶️', color: 'from-red-500 to-red-700', countries: ['IN'], productCount: 45, description: 'Deggi mirch & spice mixes' },
  { id: 'itc', name: 'ITC', emoji: '🌾', color: 'from-green-400 to-green-600', countries: ['IN'], productCount: 110, description: 'Aashirvaad, Sunfeast, Yippee' },
  { id: 'dabur', name: 'Dabur', emoji: '🌿', color: 'from-lime-400 to-lime-600', countries: ['IN'], productCount: 55, description: 'Health & wellness products' },
  { id: 'patanjali', name: 'Patanjali', emoji: '🧘', color: 'from-amber-400 to-amber-600', countries: ['IN'], productCount: 70, description: 'Natural & ayurvedic products' },
  { id: 'nestle', name: 'Nestlé', emoji: '🍫', color: 'from-blue-400 to-blue-600', countries: ['IN', 'QA', 'AE', 'SA', 'GB', 'US'], productCount: 150, description: 'Good food, good life' },
  { id: 'parle', name: 'Parle', emoji: '🍘', color: 'from-yellow-500 to-yellow-700', countries: ['IN'], productCount: 40, description: 'Parle-G & Monaco' },

  // GCC
  { id: 'almarai', name: 'Almarai', nameAr: 'المراعي', emoji: '🥛', color: 'from-blue-500 to-blue-700', countries: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'], productCount: 120, description: 'Quality you can trust', descriptionAr: 'جودة تثق بها', offerBadge: '15% OFF' },
  { id: 'nadec', name: 'NADEC', nameAr: 'نادك', emoji: '🧈', color: 'from-green-500 to-green-700', countries: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'], productCount: 80, description: 'Fresh dairy & juices', descriptionAr: 'ألبان وعصائر طازجة' },
  { id: 'al-rawabi', name: 'Al Rawabi', nameAr: 'الروابي', emoji: '🥤', color: 'from-orange-400 to-orange-600', countries: ['QA', 'AE', 'BH'], productCount: 45, description: 'Premium dairy products', descriptionAr: 'منتجات ألبان فاخرة' },
  { id: 'almeera', name: 'Al Meera', nameAr: 'الميرة', emoji: '🏪', color: 'from-red-500 to-red-700', countries: ['QA'], productCount: 200, description: "Qatar's community retailer", descriptionAr: 'تاجر المجتمع القطري' },
  { id: 'lulu', name: 'LuLu', nameAr: 'لولو', emoji: '🛒', color: 'from-green-500 to-emerald-600', countries: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM', 'IN'], productCount: 300, description: 'Where the world comes to shop', descriptionAr: 'حيث يأتي العالم للتسوق' },
  { id: 'carrefour', name: 'Carrefour', nameAr: 'كارفور', emoji: '🏬', color: 'from-blue-500 to-blue-700', countries: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'], productCount: 500, description: 'Hypermarket excellence', descriptionAr: 'تميز الهايبر ماركت', offerBadge: 'Mega Deals' },
  { id: 'spinneys', name: 'Spinneys', emoji: '🌿', color: 'from-green-400 to-green-600', countries: ['AE'], productCount: 180, description: 'Fresh since 1961' },
  { id: 'choithrams', name: 'Choithrams', emoji: '🧺', color: 'from-red-400 to-red-600', countries: ['AE'], productCount: 150, description: 'Your neighbourhood store' },
  { id: 'panda', name: 'Panda', nameAr: 'باندا', emoji: '🐼', color: 'from-green-400 to-green-700', countries: ['SA'], productCount: 200, description: 'Everyday low prices', descriptionAr: 'أسعار منخفضة كل يوم' },
  { id: 'tamimi', name: 'Tamimi Markets', nameAr: 'أسواق التميمي', emoji: '🏪', color: 'from-red-500 to-red-700', countries: ['SA'], productCount: 250, description: 'Premium grocery experience', descriptionAr: 'تجربة بقالة فاخرة' },
  { id: 'danube', name: 'Danube', nameAr: 'الدانوب', emoji: '🛍️', color: 'from-blue-400 to-blue-600', countries: ['SA'], productCount: 180, description: 'Fresh quality daily', descriptionAr: 'جودة طازجة يومياً' },

  // UK
  { id: 'tesco', name: 'Tesco', emoji: '🏪', color: 'from-blue-600 to-blue-800', countries: ['GB'], productCount: 400, description: 'Every little helps', offerBadge: 'Clubcard Prices' },
  { id: 'sainsburys', name: "Sainsbury's", emoji: '🧡', color: 'from-orange-500 to-orange-700', countries: ['GB'], productCount: 350, description: 'Live well for less' },
  { id: 'aldi', name: 'Aldi', emoji: '🏷️', color: 'from-blue-400 to-yellow-500', countries: ['GB'], productCount: 200, description: 'Amazing value every day', offerBadge: 'Specialbuys' },
  { id: 'asda', name: 'Asda', emoji: '🟢', color: 'from-green-500 to-green-700', countries: ['GB'], productCount: 300, description: 'Save money. Live better.' },
  { id: 'mands', name: 'M&S Food', emoji: '✨', color: 'from-black to-gray-800', countries: ['GB'], productCount: 150, description: 'This is not just food...' },
  { id: 'waitrose', name: 'Waitrose', emoji: '🌿', color: 'from-emerald-600 to-emerald-800', countries: ['GB'], productCount: 180, description: 'Quality groceries since 1904' },

  // USA
  { id: 'walmart', name: 'Walmart', emoji: '⭐', color: 'from-blue-600 to-blue-800', countries: ['US'], productCount: 600, description: 'Save money. Live better.', offerBadge: 'Rollback' },
  { id: 'whole-foods', name: 'Whole Foods', emoji: '🌱', color: 'from-green-600 to-green-800', countries: ['US'], productCount: 250, description: "America's healthiest grocery store" },
  { id: 'trader-joes', name: "Trader Joe's", emoji: '🌺', color: 'from-red-500 to-red-700', countries: ['US'], productCount: 180, description: 'Your neighborhood grocery store' },
  { id: 'kroger', name: 'Kroger', emoji: '🔵', color: 'from-blue-500 to-blue-700', countries: ['US'], productCount: 350, description: 'Fresh for everyone' },
  { id: 'costco', name: 'Costco', emoji: '📦', color: 'from-red-600 to-blue-600', countries: ['US'], productCount: 200, description: 'Wholesale excellence', offerBadge: 'Members Only' },
  { id: 'target', name: 'Target', emoji: '🎯', color: 'from-red-500 to-red-700', countries: ['US'], productCount: 150, description: 'Expect more. Pay less.' },
];

// ── Get Brands for Country ────────────────────────────────────────────────

export function getBrandsForCountry(country: GroceryCountryCode): CountryBrand[] {
  return ALL_BRANDS.filter(b => b.countries.includes(country));
}

// ── Country-Specific Stores ───────────────────────────────────────────────

const QA_STORES: GroceryStore[] = [
  { id: 'qa-almeera-1', name: 'Al Meera — The Pearl', category: 'Supermarket', rating: 4.7, reviewCount: '3.2k', deliveryTime: '20-30 min', distance: '1.5 km', minOrder: 50, deliveryFee: 0, tags: ['Groceries', 'Fresh', 'Halal'], isOpen: true, isPromoted: true, offerBadge: '20% OFF', emoji: '🏪', section: ['nearby', 'popular', 'top-rated'] },
  { id: 'qa-carrefour-1', name: 'Carrefour — Villaggio', category: 'Hypermarket', rating: 4.6, reviewCount: '5.8k', deliveryTime: '25-40 min', distance: '3.2 km', minOrder: 75, deliveryFee: 0, tags: ['Hypermarket', 'Bulk', 'International'], isOpen: true, offerBadge: 'Mega Deals', emoji: '🏬', section: ['popular', 'supermarket'] },
  { id: 'qa-lulu-1', name: 'LuLu Hypermarket — Al Gharafa', category: 'Hypermarket', rating: 4.8, reviewCount: '7.1k', deliveryTime: '30-45 min', distance: '4.0 km', minOrder: 60, deliveryFee: 0, tags: ['Fresh', 'Wholesale', 'Indian'], isOpen: true, emoji: '🛒', section: ['popular', 'supermarket', 'top-rated'] },
  { id: 'qa-monoprix-1', name: 'Monoprix — Place Vendome', category: 'Premium Supermarket', rating: 4.5, reviewCount: '1.2k', deliveryTime: '20-30 min', distance: '2.1 km', minOrder: 80, deliveryFee: 10, tags: ['French', 'Gourmet', 'Premium'], isOpen: true, emoji: '🇫🇷', section: ['popular'] },
  { id: 'qa-family-food', name: 'Family Food Centre', category: 'Supermarket', rating: 4.4, reviewCount: '2.8k', deliveryTime: '25-35 min', distance: '2.5 km', minOrder: 40, deliveryFee: 5, tags: ['Budget', 'Essentials', 'Fresh'], isOpen: true, emoji: '👨‍👩‍👧', section: ['nearby', 'popular'] },
  { id: 'qa-baqala-1', name: 'Al Jazeera Baqala', category: 'Baqala', rating: 4.3, reviewCount: '650', deliveryTime: '10-15 min', distance: '0.4 km', minOrder: 20, deliveryFee: 5, tags: ['Quick', 'Snacks', 'Drinks'], isOpen: true, emoji: '🏠', section: ['nearby', 'fast-delivery'] },
  { id: 'qa-baqala-2', name: 'Abu Hassan Grocery', category: 'Baqala', rating: 4.2, reviewCount: '480', deliveryTime: '8-12 min', distance: '0.3 km', minOrder: 15, deliveryFee: 5, tags: ['Essentials', 'Local', 'Quick'], isOpen: true, emoji: '🏘️', section: ['nearby', 'fast-delivery'] },
  { id: 'qa-meat-1', name: 'Al Wakra Fresh Meat', category: 'Fresh Meat Store', rating: 4.7, reviewCount: '1.1k', deliveryTime: '25-35 min', distance: '2.8 km', minOrder: 60, deliveryFee: 0, tags: ['Halal', 'Lamb', 'Chicken'], isOpen: true, offerBadge: 'Fresh Today', emoji: '🥩', section: ['meat-fish', 'top-rated'] },
  { id: 'qa-fish-1', name: 'Souq Waqif Fish Market', category: 'Fish Market', rating: 4.8, reviewCount: '920', deliveryTime: '30-40 min', distance: '3.5 km', minOrder: 80, deliveryFee: 10, tags: ['Hammour', 'Shrimp', 'Crab'], isOpen: true, emoji: '🐟', section: ['meat-fish'] },
  { id: 'qa-organic-1', name: 'Torba Organic Market', category: 'Organic Store', rating: 4.6, reviewCount: '540', deliveryTime: '25-40 min', distance: '3.0 km', minOrder: 100, deliveryFee: 0, tags: ['Organic', 'Local', 'Farm'], isOpen: true, emoji: '🌱', section: ['organic'] },
  { id: 'qa-bakery-1', name: 'Levain Artisan Bakery', category: 'Bakery', rating: 4.9, reviewCount: '780', deliveryTime: '20-30 min', distance: '2.2 km', minOrder: 30, deliveryFee: 5, tags: ['Bread', 'Pastries', 'Arabic Sweets'], isOpen: true, emoji: '🥐', section: ['dairy-bakery'] },
  { id: 'qa-sultan-1', name: 'Sultan Center — West Bay', category: 'Supermarket', rating: 4.5, reviewCount: '1.5k', deliveryTime: '20-30 min', distance: '2.0 km', minOrder: 50, deliveryFee: 0, tags: ['International', 'Premium', 'Fresh'], isOpen: true, emoji: '👑', section: ['popular'] },
];

const UAE_STORES: GroceryStore[] = [
  { id: 'ae-carrefour-1', name: 'Carrefour — Dubai Mall', category: 'Hypermarket', rating: 4.7, reviewCount: '9.2k', deliveryTime: '25-40 min', distance: '3.0 km', minOrder: 100, deliveryFee: 0, tags: ['Hypermarket', 'Fresh', 'Bulk'], isOpen: true, offerBadge: 'Up to 50% OFF', emoji: '🏬', section: ['popular', 'supermarket', 'top-rated'] },
  { id: 'ae-lulu-1', name: 'LuLu Hypermarket — Al Barsha', category: 'Hypermarket', rating: 4.8, reviewCount: '6.5k', deliveryTime: '30-45 min', distance: '4.2 km', minOrder: 80, deliveryFee: 0, tags: ['Indian', 'Fresh', 'Wholesale'], isOpen: true, emoji: '🛒', section: ['popular', 'supermarket'] },
  { id: 'ae-spinneys-1', name: 'Spinneys — JBR', category: 'Premium Supermarket', rating: 4.6, reviewCount: '2.1k', deliveryTime: '20-30 min', distance: '1.8 km', minOrder: 100, deliveryFee: 15, tags: ['Premium', 'Organic', 'Fresh'], isOpen: true, emoji: '🌿', section: ['popular', 'top-rated'] },
  { id: 'ae-choithrams-1', name: 'Choithrams — Marina', category: 'Supermarket', rating: 4.5, reviewCount: '1.8k', deliveryTime: '20-30 min', distance: '1.5 km', minOrder: 80, deliveryFee: 10, tags: ['Indian', 'Neighbourhood', 'Fresh'], isOpen: true, emoji: '🧺', section: ['nearby', 'popular'] },
  { id: 'ae-almaya-1', name: 'Al Maya — Downtown', category: 'Supermarket', rating: 4.4, reviewCount: '950', deliveryTime: '15-25 min', distance: '1.2 km', minOrder: 60, deliveryFee: 10, tags: ['Convenience', 'Fresh', 'Local'], isOpen: true, emoji: '🏪', section: ['nearby'] },
  { id: 'ae-baqala-1', name: 'Emirates Baqala', category: 'Baqala', rating: 4.2, reviewCount: '420', deliveryTime: '8-15 min', distance: '0.5 km', minOrder: 30, deliveryFee: 5, tags: ['Quick', 'Essentials', 'Drinks'], isOpen: true, emoji: '🏠', section: ['nearby', 'fast-delivery'] },
  { id: 'ae-meat-1', name: 'Emirates Butchery', category: 'Fresh Meat Store', rating: 4.7, reviewCount: '1.3k', deliveryTime: '25-35 min', distance: '2.5 km', minOrder: 80, deliveryFee: 0, tags: ['Halal', 'Fresh', 'Camel Meat'], isOpen: true, offerBadge: 'Premium Cuts', emoji: '🥩', section: ['meat-fish'] },
  { id: 'ae-organic-1', name: 'Organic Foods & Café', category: 'Organic Store', rating: 4.6, reviewCount: '780', deliveryTime: '25-35 min', distance: '2.8 km', minOrder: 120, deliveryFee: 0, tags: ['Organic', 'Vegan', 'Gluten-Free'], isOpen: true, emoji: '🌱', section: ['organic'] },
  { id: 'ae-union-coop', name: 'Union Coop', category: 'Co-op', rating: 4.5, reviewCount: '3.8k', deliveryTime: '20-30 min', distance: '2.0 km', minOrder: 60, deliveryFee: 0, tags: ['Local', 'Fresh', 'Budget'], isOpen: true, emoji: '🤝', section: ['popular'] },
];

const GB_STORES: GroceryStore[] = [
  { id: 'gb-tesco-1', name: 'Tesco Extra — Kensington', category: 'Supermarket', rating: 4.5, reviewCount: '4.2k', deliveryTime: '45-60 min', distance: '1.8 mi', minOrder: 40, deliveryFee: 0, tags: ['Clubcard', 'Fresh', 'Bulk'], isOpen: true, offerBadge: 'Clubcard Prices', emoji: '🏪', section: ['popular', 'supermarket'] },
  { id: 'gb-sainsburys-1', name: "Sainsbury's — Fulham", category: 'Supermarket', rating: 4.4, reviewCount: '3.1k', deliveryTime: '40-55 min', distance: '1.5 mi', minOrder: 40, deliveryFee: 0, tags: ['Nectar', 'Fresh', 'Organic'], isOpen: true, emoji: '🧡', section: ['popular', 'supermarket'] },
  { id: 'gb-aldi-1', name: 'Aldi — Camden', category: 'Discount Supermarket', rating: 4.3, reviewCount: '2.8k', deliveryTime: '35-50 min', distance: '1.2 mi', minOrder: 25, deliveryFee: 4, tags: ['Budget', 'Specialbuys', 'Fresh'], isOpen: true, offerBadge: 'Specialbuys', emoji: '🏷️', section: ['popular', 'fast-delivery'] },
  { id: 'gb-waitrose-1', name: 'Waitrose — Chelsea', category: 'Premium Supermarket', rating: 4.7, reviewCount: '1.5k', deliveryTime: '50-70 min', distance: '2.0 mi', minOrder: 60, deliveryFee: 0, tags: ['Premium', 'Organic', 'Fine Foods'], isOpen: true, emoji: '🌿', section: ['popular', 'top-rated'] },
  { id: 'gb-mands-1', name: 'M&S Food — Oxford Street', category: 'Premium Store', rating: 4.6, reviewCount: '1.8k', deliveryTime: '40-55 min', distance: '1.6 mi', minOrder: 50, deliveryFee: 4, tags: ['Premium', 'Ready Meals', 'Percy Pigs'], isOpen: true, emoji: '✨', section: ['popular'] },
  { id: 'gb-corner-1', name: "Ahmed's Corner Shop", category: 'Corner Shop', rating: 4.2, reviewCount: '320', deliveryTime: '15-25 min', distance: '0.3 mi', minOrder: 10, deliveryFee: 3, tags: ['Quick', 'Essentials', 'Local'], isOpen: true, emoji: '🏘️', section: ['nearby', 'fast-delivery'] },
  { id: 'gb-butcher-1', name: 'The Ginger Pig Butcher', category: 'Butcher', rating: 4.8, reviewCount: '620', deliveryTime: '40-55 min', distance: '1.8 mi', minOrder: 30, deliveryFee: 5, tags: ['Free Range', 'Organic', 'British'], isOpen: true, emoji: '🥩', section: ['meat-fish', 'top-rated'] },
  { id: 'gb-lidl-1', name: 'Lidl — Brixton', category: 'Discount Supermarket', rating: 4.2, reviewCount: '1.9k', deliveryTime: '35-50 min', distance: '1.4 mi', minOrder: 20, deliveryFee: 4, tags: ['Budget', 'Fresh', 'Bakery'], isOpen: true, emoji: '💙', section: ['popular'] },
];

const US_STORES: GroceryStore[] = [
  { id: 'us-walmart-1', name: 'Walmart Supercenter — Brooklyn', category: 'Grocery Store', rating: 4.3, reviewCount: '8.5k', deliveryTime: '45-75 min', distance: '2.5 mi', minOrder: 35, deliveryFee: 0, tags: ['Rollback', 'Bulk', 'Fresh'], isOpen: true, offerBadge: 'Rollback Deals', emoji: '⭐', section: ['popular', 'supermarket'] },
  { id: 'us-wholefoods-1', name: 'Whole Foods — Union Square', category: 'Organic Store', rating: 4.7, reviewCount: '3.2k', deliveryTime: '40-60 min', distance: '1.8 mi', minOrder: 50, deliveryFee: 0, tags: ['Organic', 'Prime', 'Local'], isOpen: true, emoji: '🌱', section: ['popular', 'organic', 'top-rated'] },
  { id: 'us-traderjoes-1', name: "Trader Joe's — Manhattan", category: 'Grocery Store', rating: 4.8, reviewCount: '5.1k', deliveryTime: '35-50 min', distance: '1.2 mi', minOrder: 25, deliveryFee: 6, tags: ['Unique', 'Budget', 'Fresh'], isOpen: true, emoji: '🌺', section: ['popular', 'top-rated'] },
  { id: 'us-kroger-1', name: 'Kroger — Midtown', category: 'Supermarket', rating: 4.4, reviewCount: '4.8k', deliveryTime: '40-60 min', distance: '2.0 mi', minOrder: 35, deliveryFee: 0, tags: ['Fresh', 'Savings', 'Digital Coupons'], isOpen: true, emoji: '🔵', section: ['popular', 'supermarket'] },
  { id: 'us-target-1', name: 'Target — Herald Square', category: 'Supermarket', rating: 4.5, reviewCount: '3.5k', deliveryTime: '45-65 min', distance: '1.5 mi', minOrder: 35, deliveryFee: 0, tags: ['Good & Gather', 'Fresh', 'Value'], isOpen: true, emoji: '🎯', section: ['popular'] },
  { id: 'us-bodega-1', name: "Joe's Corner Bodega", category: 'Convenience Store', rating: 4.1, reviewCount: '280', deliveryTime: '10-20 min', distance: '0.2 mi', minOrder: 10, deliveryFee: 3, tags: ['Quick', 'Snacks', 'Drinks'], isOpen: true, emoji: '🏪', section: ['nearby', 'fast-delivery'] },
  { id: 'us-deli-1', name: 'Brooklyn Deli & Grocery', category: 'Deli', rating: 4.3, reviewCount: '450', deliveryTime: '20-30 min', distance: '0.5 mi', minOrder: 15, deliveryFee: 4, tags: ['Sandwiches', 'Prepared', 'Fresh'], isOpen: true, emoji: '🥪', section: ['nearby', 'fast-delivery'] },
  { id: 'us-farmers-1', name: 'Union Square Farmers Market', category: 'Farmers Market', rating: 4.9, reviewCount: '1.2k', deliveryTime: '50-70 min', distance: '2.2 mi', minOrder: 40, deliveryFee: 8, tags: ['Local', 'Seasonal', 'Organic'], isOpen: true, emoji: '🌻', section: ['organic', 'top-rated'] },
];

// ── Country Store Map ─────────────────────────────────────────────────────

const COUNTRY_STORES: Partial<Record<GroceryCountryCode, GroceryStore[]>> = {
  QA: QA_STORES,
  AE: UAE_STORES,
  GB: GB_STORES,
  US: US_STORES,
  SA: QA_STORES.map(s => ({ ...s, id: s.id.replace('qa-', 'sa-'), distance: s.distance })), // reuse QA with SA prefix
  BH: QA_STORES.slice(0, 8).map(s => ({ ...s, id: s.id.replace('qa-', 'bh-') })),
  KW: QA_STORES.slice(0, 8).map(s => ({ ...s, id: s.id.replace('qa-', 'kw-') })),
  OM: QA_STORES.slice(0, 8).map(s => ({ ...s, id: s.id.replace('qa-', 'om-') })),
};

export function getStoresForCountry(country: GroceryCountryCode): GroceryStore[] {
  return COUNTRY_STORES[country] || [];
}

// ── Country-Specific Hero Banners ─────────────────────────────────────────

const COUNTRY_BANNERS: Record<GroceryCountryCode, GroceryBanner[]> = {
  IN: [
    { id: 'in-hero-1', tag: 'LIGHTNING FAST', headline: 'Fresh Groceries\nDelivered in 10 Mins', subheadline: 'From your favorite kirana & supermarkets', cta: 'Order Now', ctaHref: '/grocery', gradient: 'from-green-700 via-green-600 to-emerald-500', emoji: '🛒' },
    { id: 'in-hero-2', tag: 'MANDI PRICES', headline: 'Farm Fresh Sabzi\nAt Mandi Rates', subheadline: 'Fresh vegetables delivered from local mandis', cta: 'Shop Fresh', ctaHref: '/grocery/category/fruits-vegetables', gradient: 'from-emerald-700 via-teal-600 to-green-500', emoji: '🥬' },
  ],
  QA: [
    // Both languages on every banner, not one banner per language.
    //
    // These two used to be language-locked - the first written only in
    // Arabic, the second only in English - and the carousel rotated between
    // them, so whichever language the shopper had chosen they saw the other
    // one half the time. Every other localised string in this file already
    // pairs a field with its `...Ar` counterpart; the heroes were the
    // exception.
    { id: 'qa-hero-1', tag: 'FAST DELIVERY', tagAr: 'توصيل سريع', headline: 'Fresh Groceries\nDelivered in 20 Minutes', headlineAr: 'بقالة طازجة\nتوصيل في ٢٠ دقيقة', subheadline: 'From the best supermarkets and baqalas in Qatar', subheadlineAr: 'من أفضل المتاجر والبقالات في قطر', cta: 'Order Now', ctaAr: 'اطلب الآن', ctaHref: '/grocery', gradient: 'from-maroon-700 via-red-600 to-rose-500', emoji: '🛒' },
    { id: 'qa-hero-2', tag: 'FRESH DAILY', tagAr: 'طازج يومياً', headline: 'Premium Meat & Fish\nFresh from Souq Waqif', headlineAr: 'لحوم وأسماك فاخرة\nطازجة من سوق واقف', subheadline: 'Halal certified, hygienically packed', subheadlineAr: 'حلال معتمد، معبأ بعناية', cta: 'Shop Fresh', ctaAr: 'تسوق الطازج', ctaHref: '/grocery/category/fresh-meat', gradient: 'from-red-700 via-rose-600 to-red-500', emoji: '🥩' },
  ],
  AE: [
    { id: 'ae-hero-1', tag: 'FAST DELIVERY', headline: 'Groceries Delivered\nIn Under 30 Minutes', subheadline: 'From Carrefour, Spinneys, LuLu & more', cta: 'Order Now', ctaHref: '/grocery', gradient: 'from-green-700 via-green-600 to-emerald-500', emoji: '🛒' },
    { id: 'ae-hero-2', tag: 'BIG OFFERS', tagAr: 'عروض ضخمة', headline: 'Up to 50% Off\nThis Weekend Only', subheadline: 'Fresh produce, dairy, meat & household', cta: 'Shop Deals', ctaHref: '/grocery', gradient: 'from-red-600 via-orange-500 to-amber-500', emoji: '🏷️' },
  ],
  SA: [
    { id: 'sa-hero-1', tag: 'FAST DELIVERY', tagAr: 'توصيل سريع', headline: 'Your Daily Groceries\nDelivered to Your Door', headlineAr: 'بقالتك اليومية\nتوصل لباب بيتك', subheadline: 'From Panda, Tamimi, Danube and more', subheadlineAr: 'من باندا، التميمي، الدانوب وأكثر', cta: 'Order Now', ctaAr: 'اطلب الآن', ctaHref: '/grocery', gradient: 'from-green-700 via-green-600 to-emerald-500', emoji: '🛒' },
  ],
  BH: [
    { id: 'bh-hero-1', tag: 'FAST DELIVERY', headline: 'Groceries to Your Door\nIn 15 Minutes', subheadline: 'From LuLu, Jawad & local baqalas', cta: 'Order Now', ctaHref: '/grocery', gradient: 'from-red-700 via-red-600 to-rose-500', emoji: '🛒' },
  ],
  KW: [
    { id: 'kw-hero-1', tag: 'FAST DELIVERY', tagAr: 'توصيل سريع', headline: 'Your Favourite Groceries\nDelivered Fast', headlineAr: 'بقالتك المفضلة\nتوصل بسرعة', subheadline: 'From Sultan Center and the co-ops', subheadlineAr: 'من مركز سلطان والجمعيات', cta: 'Order Now', ctaAr: 'اطلب الآن', ctaHref: '/grocery', gradient: 'from-green-700 via-green-600 to-emerald-500', emoji: '🛒' },
  ],
  OM: [
    { id: 'om-hero-1', tag: 'FAST DELIVERY', headline: 'Fresh Groceries\nDelivered Fast', subheadline: 'From LuLu, Carrefour & local stores', cta: 'Order Now', ctaHref: '/grocery', gradient: 'from-red-700 via-red-600 to-red-500', emoji: '🛒' },
  ],
  GB: [
    { id: 'gb-hero-1', tag: 'SAME DAY', headline: 'Your Weekly Shop\nDelivered Same Day', subheadline: "From Tesco, Sainsbury's, Waitrose & more", cta: 'Shop Now', ctaHref: '/grocery', gradient: 'from-blue-700 via-blue-600 to-indigo-500', emoji: '🛒' },
    { id: 'gb-hero-2', tag: 'MEAL DEALS', headline: '£3 Meal Deals\nLunch Sorted', subheadline: 'Sandwich + snack + drink — every day', cta: 'View Deals', ctaHref: '/grocery', gradient: 'from-orange-600 via-amber-500 to-yellow-500', emoji: '🥪' },
  ],
  US: [
    { id: 'us-hero-1', tag: 'FREE DELIVERY', headline: 'Groceries Delivered\nFree Over $35', subheadline: "From Walmart, Whole Foods, Trader Joe's & more", cta: 'Shop Now', ctaHref: '/grocery', gradient: 'from-blue-700 via-blue-600 to-indigo-500', emoji: '🛒' },
    { id: 'us-hero-2', tag: 'ORGANIC', headline: 'Farm Fresh &\n100% Organic', subheadline: 'From local farmers markets', cta: 'Shop Organic', ctaHref: '/grocery/category/organic', gradient: 'from-green-700 via-emerald-600 to-green-500', emoji: '🌱' },
  ],
};

export function getBannersForCountry(country: GroceryCountryCode): GroceryBanner[] {
  return COUNTRY_BANNERS[country] || COUNTRY_BANNERS.IN;
}

// ── Country-Specific Campaigns ────────────────────────────────────────────

const COUNTRY_CAMPAIGNS: Record<GroceryCountryCode, GroceryBanner[]> = {
  IN: [
    { id: 'in-camp-1', tag: 'TODAY ONLY', headline: 'Flat 20% Off on Fresh Meat', subheadline: 'Use code FRESHMEAT20 • Min ₹499', cta: 'Shop Now', ctaHref: '/grocery/category/fresh-meat', gradient: 'from-red-500 to-orange-500', emoji: '🥩' },
    { id: 'in-camp-2', tag: 'DAIRY FEST', headline: 'Buy 1 Get 1 Free on Dairy', subheadline: 'Milk, curd, paneer — all included', cta: 'Grab Offer', ctaHref: '/grocery/category/dairy-bread-eggs', gradient: 'from-blue-500 to-cyan-500', emoji: '🥛' },
    { id: 'in-camp-3', tag: 'SUMMER COOL', headline: 'Beverages & Ice Cream Sale', subheadline: 'Beat the heat — up to 30% off', cta: 'Shop Cool', ctaHref: '/grocery/category/beverages', gradient: 'from-sky-500 to-indigo-500', emoji: '🍹' },
  ],
  QA: [
    { id: 'qa-camp-1', tag: "TODAY'S OFFER", tagAr: 'عرض اليوم', headline: '20% Off Fresh Meat', headlineAr: 'خصم ٢٠٪ على اللحوم الطازجة', subheadline: 'Use code MEAT20 • Minimum QR 50', subheadlineAr: 'استخدم كود MEAT20 • الحد الأدنى QR50', cta: 'Shop Now', ctaAr: 'تسوق الآن', ctaHref: '/grocery/category/fresh-meat', gradient: 'from-red-500 to-orange-500', emoji: '🥩' },
    { id: 'qa-camp-2', tag: 'RAMADAN OFFER', headline: 'Dates & Arabic Sweets\n30% Off', subheadline: 'Premium Medjool dates & baklava', cta: 'Shop Now', ctaHref: '/grocery', gradient: 'from-amber-600 to-yellow-500', emoji: '🌙' },
  ],
  AE: [
    { id: 'ae-camp-1', tag: 'MEGA SALE', headline: 'Up to 50% Off\nFresh Produce', subheadline: 'Valid at Carrefour, Spinneys & LuLu', cta: 'Shop Deals', ctaHref: '/grocery', gradient: 'from-red-500 to-rose-500', emoji: '🏷️' },
  ],
  SA: [
    { id: 'sa-camp-1', tag: 'SPECIAL OFFER', tagAr: 'عرض خاص', headline: '15% Off Fruits & Vegetables', headlineAr: 'خصم ١٥٪ على الفواكه والخضروات', subheadline: 'At Panda and Tamimi', subheadlineAr: 'في باندا والتميمي', cta: 'Shop Now', ctaAr: 'تسوق الآن', ctaHref: '/grocery/category/fruits-vegetables', gradient: 'from-green-500 to-emerald-500', emoji: '🥬' },
  ],
  BH: [
    { id: 'bh-camp-1', tag: 'WEEKEND DEALS', headline: '25% Off All Dairy', subheadline: 'Almarai, NADEC & Al Rawabi', cta: 'Shop Now', ctaHref: '/grocery/category/dairy-bread-eggs', gradient: 'from-blue-500 to-cyan-500', emoji: '🥛' },
  ],
  KW: [
    { id: 'kw-camp-1', tag: 'CO-OP OFFER', tagAr: 'عرض الجمعية', headline: '30% Off Household Cleaning', headlineAr: 'خصم ٣٠٪ على المنظفات', subheadline: 'At all co-operative societies', subheadlineAr: 'في جميع الجمعيات', cta: 'Shop Now', ctaAr: 'تسوق الآن', ctaHref: '/grocery/category/household-cleaning', gradient: 'from-teal-500 to-cyan-500', emoji: '🧹' },
  ],
  OM: [
    { id: 'om-camp-1', tag: 'FRESH CATCH', headline: '20% Off on Fresh Fish', subheadline: 'From local fishermen', cta: 'Shop Fresh', ctaHref: '/grocery/category/fresh-fish', gradient: 'from-blue-500 to-cyan-500', emoji: '🐟' },
  ],
  GB: [
    { id: 'gb-camp-1', tag: 'MEAL DEAL', headline: '£3 Meal Deal\nSandwich + Snack + Drink', subheadline: 'Available at all partner stores', cta: 'View Deals', ctaHref: '/grocery', gradient: 'from-orange-500 to-amber-500', emoji: '🥪' },
    { id: 'gb-camp-2', tag: 'WEEKEND', headline: '3 for 2 on Fresh Veg', subheadline: 'While stocks last', cta: 'Shop Now', ctaHref: '/grocery/category/fruits-vegetables', gradient: 'from-green-500 to-emerald-500', emoji: '🥦' },
  ],
  US: [
    { id: 'us-camp-1', tag: 'SUPER SAVINGS', headline: 'Buy 2 Get 1 Free\non Organic', subheadline: 'At Whole Foods & Trader Joe\'s', cta: 'Shop Organic', ctaHref: '/grocery/category/organic', gradient: 'from-green-500 to-emerald-500', emoji: '🌱' },
    { id: 'us-camp-2', tag: 'COSTCO', headline: 'Bulk Buy Savings\nUp to 40% Off', subheadline: 'Members only pricing', cta: 'Shop Bulk', ctaHref: '/grocery', gradient: 'from-red-500 to-blue-500', emoji: '📦' },
  ],
};

export function getCampaignsForCountry(country: GroceryCountryCode): GroceryBanner[] {
  return COUNTRY_CAMPAIGNS[country] || COUNTRY_CAMPAIGNS.IN;
}

// ── Country FAQ ───────────────────────────────────────────────────────────

export function getFAQForCountry(country: GroceryCountryCode): { q: string; a: string; qAr?: string; aAr?: string }[] {
  const base = [
    { q: 'How can I order groceries on KARTSEEK?', a: 'Browse nearby grocery stores, select a store, add products to your cart, and checkout.', qAr: 'كيف أطلب بقالة من كارتسيك؟', aAr: 'تصفح المتاجر القريبة، اختر متجر، أضف المنتجات وأكمل الدفع.' },
    { q: 'Can I buy from nearby stores?', a: 'Yes! KARTSEEK shows stores near your location sorted by distance and delivery time.', qAr: 'هل يمكنني الشراء من المتاجر القريبة؟', aAr: 'نعم! كارتسيك يعرض المتاجر القريبة حسب المسافة ووقت التوصيل.' },
  ];

  const countrySpecific: Record<string, { q: string; a: string; qAr?: string; aAr?: string }[]> = {
    IN: [
      { q: 'Which brands are available?', a: 'Amul, Tata, Britannia, MDH, ITC, Dabur, Patanjali, and 500+ more brands.' },
      { q: 'Is GST included in prices?', a: 'Yes, all prices include GST. You can see the GST breakdown at checkout.' },
    ],
    QA: [
      { q: 'Which stores deliver in Qatar?', a: 'Al Meera, Carrefour, LuLu, Monoprix, Family Food Centre, and local baqalas.', qAr: 'أي المتاجر توصل في قطر؟', aAr: 'الميرة، كارفور، لولو، مونوبري، مركز فود العائلة والبقالات المحلية.' },
      { q: 'Is the meat halal?', a: 'Yes, all meat products on KARTSEEK Qatar are 100% halal certified.', qAr: 'هل اللحوم حلال؟', aAr: 'نعم، جميع منتجات اللحوم في كارتسيك قطر حلال ١٠٠٪.' },
    ],
    GB: [
      { q: 'Which supermarkets are available?', a: "Tesco, Sainsbury's, Aldi, Asda, Waitrose, M&S Food, Lidl, and Co-op." },
      { q: 'Is there VAT on food?', a: 'Most food items are zero-rated for VAT in the UK. Some items like confectionery may have 20% VAT.' },
    ],
    US: [
      { q: 'Which stores are available?', a: "Walmart, Whole Foods, Trader Joe's, Kroger, Target, Costco, and local stores." },
      { q: 'Is there sales tax on groceries?', a: 'Sales tax on groceries varies by state. Most states exempt unprepared food from sales tax.' },
    ],
  };

  return [...base, ...(countrySpecific[country] || countrySpecific.QA || [])];
}
