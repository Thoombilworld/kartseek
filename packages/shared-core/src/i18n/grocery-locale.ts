// lib/config/grocery-locale.ts
// KARTSEEK Grocery — Country Localization System
// Supports: India, Qatar, UAE, Saudi Arabia, Bahrain, Kuwait, Oman, UK, USA

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useRegion } from '@/lib/contexts/region-context';
import { DEFAULT_COUNTRY } from '@/lib/localization/countries';
import { getDirection } from '@/lib/localization/languages';

// ── Country Code Type ─────────────────────────────────────────────────────

export type GroceryCountryCode = 'IN' | 'QA' | 'AE' | 'SA' | 'BH' | 'KW' | 'OM' | 'GB' | 'US';

// ── Country Configuration ─────────────────────────────────────────────────

export interface GroceryCountryConfig {
  code: GroceryCountryCode;
  name: string;
  nameAr?: string;
  flag: string;
  currency: { code: string; symbol: string; position: 'prefix' | 'suffix'; decimals: number };
  tax: { name: string; rate: number; label: string; labelAr?: string };
  delivery: { radiusUnit: 'km' | 'miles'; maxRadius: number; freeThreshold: number; baseFee: number; expressTime: string; standardTime: string };
  address: { format: string; zoneLabel: string; zoneLabelAr?: string; postalLabel: string; postalLabelAr?: string; phonePrefix: string; phoneFormat: string };
  storeTypes: string[];
  storeTypesAr?: string[];
  productUnits: string[];
  language: { primary: string; secondary?: string; rtl: boolean };
  compliance: string[];
  categories: string[]; // extra country-specific categories
  popularBrands: string[]; // brand IDs visible for this country
  subtitle: string;
  subtitleAr?: string;
}

// ── All Country Configurations ────────────────────────────────────────────

export const GROCERY_COUNTRIES: Record<GroceryCountryCode, GroceryCountryConfig> = {
  IN: {
    code: 'IN', name: 'India', flag: '🇮🇳',
    currency: { code: 'INR', symbol: '₹', position: 'prefix', decimals: 0 },
    tax: { name: 'GST', rate: 5, label: 'GST (5%)' },
    delivery: { radiusUnit: 'km', maxRadius: 15, freeThreshold: 199, baseFee: 25, expressTime: '10-20 min', standardTime: '30-45 min' },
    address: { format: 'flat, street, area, city, state - pincode', zoneLabel: 'Pincode', postalLabel: 'PIN Code', phonePrefix: '+91', phoneFormat: '98765 43210' },
    storeTypes: ['Supermarket', 'Kirana Store', 'Fresh Produce', 'Meat & Seafood', 'Dairy', 'Bakery', 'Organic', 'Hypermarket', 'Convenience', 'Mini Market'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'box', 'piece', 'pack', 'bundle'],
    language: { primary: 'en', rtl: false },
    compliance: ['FSSAI License', 'GST Number', 'Shop License', 'PAN Card'],
    categories: ['masala-spices', 'rice-flour-pulses'],
    popularBrands: ['amul', 'tata', 'britannia', 'haldirams', 'mdh', 'itc', 'dabur', 'patanjali', 'nestle', 'parle'],
    subtitle: 'Kirana, supermarket & farm-fresh stores',
  },
  QA: {
    code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦',
    currency: { code: 'QAR', symbol: 'QR', position: 'prefix', decimals: 2 },
    tax: { name: 'VAT', rate: 0, label: 'No VAT', labelAr: 'بدون ضريبة' },
    delivery: { radiusUnit: 'km', maxRadius: 25, freeThreshold: 50, baseFee: 10, expressTime: '20-30 min', standardTime: '45-60 min' },
    address: { format: 'building, street, zone, city', zoneLabel: 'Zone', zoneLabelAr: 'المنطقة', postalLabel: 'P.O. Box', postalLabelAr: 'صندوق بريد', phonePrefix: '+974', phoneFormat: '3312 4567' },
    storeTypes: ['Hypermarket', 'Supermarket', 'Baqala', 'Fresh Meat Store', 'Fish Market', 'Bakery', 'Organic Store', 'Mini Market'],
    storeTypesAr: ['هايبر ماركت', 'سوبر ماركت', 'بقالة', 'محل لحوم', 'سوق سمك', 'مخبز', 'متجر عضوي', 'ميني ماركت'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'box', 'piece', 'pack'],
    language: { primary: 'en', secondary: 'ar', rtl: true },
    compliance: ['Commercial Registration', 'Municipality License', 'Food Safety Certificate', 'Qatar ID'],
    categories: ['arabic-sweets-dates', 'halal-meat'],
    popularBrands: ['almeera', 'carrefour', 'lulu', 'monoprix', 'family-food', 'al-rawabi', 'almarai', 'nadec'],
    subtitle: 'Baqala, hypermarket & meat shops',
    subtitleAr: 'بقالة، هايبر ماركت ومحلات اللحوم',
  },
  AE: {
    code: 'AE', name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪',
    currency: { code: 'AED', symbol: 'AED', position: 'prefix', decimals: 2 },
    tax: { name: 'VAT', rate: 5, label: 'VAT (5%)', labelAr: 'ضريبة القيمة المضافة (٥٪)' },
    delivery: { radiusUnit: 'km', maxRadius: 20, freeThreshold: 100, baseFee: 15, expressTime: '15-25 min', standardTime: '40-60 min' },
    address: { format: 'building, street, area, emirate', zoneLabel: 'Emirate', zoneLabelAr: 'الإمارة', postalLabel: 'P.O. Box', postalLabelAr: 'صندوق بريد', phonePrefix: '+971', phoneFormat: '50 123 4567' },
    storeTypes: ['Hypermarket', 'Supermarket', 'Baqala', 'Fresh Meat Store', 'Fish Market', 'Bakery', 'Organic Store', 'Convenience'],
    storeTypesAr: ['هايبر ماركت', 'سوبر ماركت', 'بقالة', 'محل لحوم', 'سوق سمك', 'مخبز', 'متجر عضوي', 'متجر ميني'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'box', 'piece', 'pack'],
    language: { primary: 'en', secondary: 'ar', rtl: true },
    compliance: ['Trade License', 'Food Safety Certificate', 'Emirates ID', 'TRN (Tax Registration)'],
    categories: ['arabic-sweets-dates', 'halal-meat'],
    popularBrands: ['carrefour', 'lulu', 'spinneys', 'choithrams', 'union-coop', 'al-maya', 'almarai', 'nadec'],
    subtitle: 'Carrefour, LuLu & local stores',
    subtitleAr: 'كارفور، لولو والمتاجر المحلية',
  },
  SA: {
    code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦',
    currency: { code: 'SAR', symbol: 'SAR', position: 'prefix', decimals: 2 },
    tax: { name: 'VAT', rate: 15, label: 'VAT (15%)', labelAr: 'ضريبة القيمة المضافة (١٥٪)' },
    delivery: { radiusUnit: 'km', maxRadius: 30, freeThreshold: 75, baseFee: 12, expressTime: '20-30 min', standardTime: '45-60 min' },
    address: { format: 'building, street, district, city', zoneLabel: 'District', zoneLabelAr: 'الحي', postalLabel: 'Postal Code', postalLabelAr: 'الرمز البريدي', phonePrefix: '+966', phoneFormat: '50 123 4567' },
    storeTypes: ['Hypermarket', 'Supermarket', 'Baqala', 'Butcher Shop', 'Fish Market', 'Bakery', 'Organic Store'],
    storeTypesAr: ['هايبر ماركت', 'سوبر ماركت', 'بقالة', 'ملحمة', 'سوق سمك', 'مخبز', 'متجر عضوي'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'box', 'piece'],
    language: { primary: 'ar', secondary: 'en', rtl: true },
    compliance: ['Commercial Registration', 'Municipality License', 'SFDA Certificate', 'Iqama/National ID'],
    categories: ['arabic-sweets-dates', 'halal-meat'],
    popularBrands: ['almarai', 'nadec', 'panda', 'tamimi', 'danube', 'carrefour', 'lulu'],
    subtitle: 'Panda, Tamimi & local markets',
    subtitleAr: 'باندا، التميمي والأسواق المحلية',
  },
  BH: {
    code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭',
    currency: { code: 'BHD', symbol: 'BD', position: 'prefix', decimals: 3 },
    tax: { name: 'VAT', rate: 10, label: 'VAT (10%)', labelAr: 'ضريبة القيمة المضافة (١٠٪)' },
    delivery: { radiusUnit: 'km', maxRadius: 15, freeThreshold: 5, baseFee: 1, expressTime: '15-25 min', standardTime: '30-45 min' },
    address: { format: 'building, road, block, city', zoneLabel: 'Block', zoneLabelAr: 'المربع', postalLabel: 'Postal Code', postalLabelAr: 'الرمز البريدي', phonePrefix: '+973', phoneFormat: '3312 4567' },
    storeTypes: ['Hypermarket', 'Supermarket', 'Baqala', 'Butcher', 'Fish Market', 'Bakery'],
    storeTypesAr: ['هايبر ماركت', 'سوبر ماركت', 'بقالة', 'ملحمة', 'سوق سمك', 'مخبز'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'piece'],
    language: { primary: 'en', secondary: 'ar', rtl: true },
    compliance: ['Commercial Registration', 'Municipality License', 'Food Safety Certificate'],
    categories: ['arabic-sweets-dates', 'halal-meat'],
    popularBrands: ['lulu', 'carrefour', 'almarai', 'nadec', 'jawad'],
    subtitle: 'LuLu, Jawad & local baqalas',
    subtitleAr: 'لولو، جواد والبقالات المحلية',
  },
  KW: {
    code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼',
    currency: { code: 'KWD', symbol: 'KD', position: 'prefix', decimals: 3 },
    tax: { name: 'VAT', rate: 0, label: 'No VAT', labelAr: 'بدون ضريبة' },
    delivery: { radiusUnit: 'km', maxRadius: 20, freeThreshold: 5, baseFee: 1, expressTime: '20-30 min', standardTime: '40-60 min' },
    address: { format: 'building, street, block, area', zoneLabel: 'Block', zoneLabelAr: 'القطعة', postalLabel: 'Postal Code', postalLabelAr: 'الرمز البريدي', phonePrefix: '+965', phoneFormat: '5512 3456' },
    storeTypes: ['Hypermarket', 'Supermarket', 'Co-op', 'Baqala', 'Butcher', 'Fish Market'],
    storeTypesAr: ['هايبر ماركت', 'سوبر ماركت', 'جمعية', 'بقالة', 'ملحمة', 'سوق سمك'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'piece'],
    language: { primary: 'ar', secondary: 'en', rtl: true },
    compliance: ['Commercial Registration', 'Municipality License', 'Food Safety Certificate'],
    categories: ['arabic-sweets-dates', 'halal-meat'],
    popularBrands: ['sultan-center', 'lulu', 'carrefour', 'almarai'],
    subtitle: 'Sultan Center, Co-ops & baqalas',
    subtitleAr: 'مركز سلطان، الجمعيات والبقالات',
  },
  OM: {
    code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲',
    currency: { code: 'OMR', symbol: 'OMR', position: 'prefix', decimals: 3 },
    tax: { name: 'VAT', rate: 5, label: 'VAT (5%)', labelAr: 'ضريبة القيمة المضافة (٥٪)' },
    delivery: { radiusUnit: 'km', maxRadius: 20, freeThreshold: 5, baseFee: 1, expressTime: '20-35 min', standardTime: '45-60 min' },
    address: { format: 'building, street, area, city', zoneLabel: 'Area', zoneLabelAr: 'المنطقة', postalLabel: 'Postal Code', postalLabelAr: 'الرمز البريدي', phonePrefix: '+968', phoneFormat: '9123 4567' },
    storeTypes: ['Hypermarket', 'Supermarket', 'Baqala', 'Butcher', 'Fish Market'],
    storeTypesAr: ['هايبر ماركت', 'سوبر ماركت', 'بقالة', 'ملحمة', 'سوق سمك'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'packet', 'dozen', 'piece'],
    language: { primary: 'en', secondary: 'ar', rtl: true },
    compliance: ['Commercial Registration', 'Municipality License', 'Food Safety Certificate'],
    categories: ['arabic-sweets-dates', 'halal-meat'],
    popularBrands: ['lulu', 'carrefour', 'almarai', 'nadec'],
    subtitle: 'LuLu, Carrefour & local markets',
    subtitleAr: 'لولو، كارفور والأسواق المحلية',
  },
  GB: {
    code: 'GB', name: 'United Kingdom', flag: '🇬🇧',
    currency: { code: 'GBP', symbol: '£', position: 'prefix', decimals: 2 },
    tax: { name: 'VAT', rate: 0, label: 'VAT (0% on groceries)' },
    delivery: { radiusUnit: 'miles', maxRadius: 10, freeThreshold: 40, baseFee: 4, expressTime: '30-45 min', standardTime: '1-2 hours' },
    address: { format: 'flat, street, city, county', zoneLabel: 'County', postalLabel: 'Postcode', phonePrefix: '+44', phoneFormat: '7700 900123' },
    storeTypes: ['Supermarket', 'Corner Shop', 'Express Store', 'Organic Store', 'Butcher', 'Fishmonger', 'Bakery', 'Off-licence'],
    productUnits: ['kg', 'g', 'litre', 'ml', 'pack', 'each', 'punnet', 'bunch'],
    language: { primary: 'en', rtl: false },
    compliance: ['Food Hygiene Rating', 'Business Registration', 'Allergen Declaration'],
    categories: ['meal-deals', 'ready-meals', 'world-foods'],
    popularBrands: ['tesco', 'sainsburys', 'aldi', 'asda', 'mands', 'waitrose', 'lidl', 'co-op'],
    subtitle: "Tesco, Sainsbury's & corner shops",
  },
  US: {
    code: 'US', name: 'United States', flag: '🇺🇸',
    currency: { code: 'USD', symbol: '$', position: 'prefix', decimals: 2 },
    tax: { name: 'Sales Tax', rate: 0, label: 'Sales Tax (varies by state)' },
    delivery: { radiusUnit: 'miles', maxRadius: 15, freeThreshold: 35, baseFee: 6, expressTime: '30-60 min', standardTime: '1-3 hours' },
    address: { format: 'apt, street, city, state, zip', zoneLabel: 'State', postalLabel: 'ZIP Code', phonePrefix: '+1', phoneFormat: '(555) 123-4567' },
    storeTypes: ['Grocery Store', 'Supermarket', 'Warehouse Club', 'Organic Store', 'Farmers Market', 'Convenience Store', 'Deli', 'Butcher Shop'],
    productUnits: ['lb', 'oz', 'gallon', 'quart', 'pint', 'pack', 'each', 'bunch', 'dozen'],
    language: { primary: 'en', rtl: false },
    compliance: ['Food Handler Permit', 'Business License', 'FDA Registration', 'State Tax ID'],
    categories: ['deli-prepared', 'gluten-free', 'organic-natural'],
    popularBrands: ['walmart', 'whole-foods', 'trader-joes', 'kroger', 'costco', 'target', 'aldi-us', 'publix'],
    subtitle: 'Walmart, Whole Foods & local markets',
  },
};

// ── Format Price ───────────────────────────────────────────────────────────

/**
 * BCP-47 tag for a grocery market, used for digit grouping and dates.
 *
 * India groups digits 2-2-3 (1,00,000 for a lakh) and everywhere else groups
 * 3-3-3, so the tag is not cosmetic. The zero-decimal branch of the price
 * formatter used to pass a hardcoded 'en-IN' — correct only because India is
 * currently the sole market with zero decimals, which is an accident rather
 * than a rule.
 */
export function getGroceryLocaleTag(country: GroceryCountryCode): string {
  return country === 'IN' ? 'en-IN' : `en-${country}`;
}

export function formatLocalPrice(amount: number | string | null | undefined, country: GroceryCountryCode): string {
  const cfg = GROCERY_COUNTRIES[country].currency;
  const locale = getGroceryLocaleTag(country);

  /**
   * Coerced, because the value is not always a number.
   *
   * Postgres returns `numeric`/`decimal` as a **string** through the driver, so
   * a price that came straight from an API row arrives as `"12.00"` and
   * `amount.toFixed` throws — which took the whole admin flash-deals page down
   * with `TypeError: amount.toFixed is not a function`, rendering nothing at
   * all rather than one bad cell.
   *
   * A value that is not a finite number formats as zero rather than throwing:
   * a price is a display concern, and a broken figure must not remove the page
   * around it.
   */
  const value = typeof amount === 'number' ? amount : Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toFixed(cfg.decimals);
  const withCommas = cfg.decimals === 0
    ? safe.toLocaleString(locale)
    : Number(formatted).toLocaleString(locale, { minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals });
  return cfg.position === 'prefix' ? `${cfg.symbol}${withCommas}` : `${withCommas} ${cfg.symbol}`;
}

// ── Tax Label ──────────────────────────────────────────────────────────────

export function getTaxLabel(country: GroceryCountryCode, useArabic?: boolean): string {
  const cfg = GROCERY_COUNTRIES[country].tax;
  if (useArabic && cfg.labelAr) return cfg.labelAr;
  return cfg.label;
}

// ── Delivery Zone Label ───────────────────────────────────────────────────

export function getDeliveryUnit(country: GroceryCountryCode): string {
  return GROCERY_COUNTRIES[country].delivery.radiusUnit;
}

// ── Arabic Translations Map ───────────────────────────────────────────────

export const AR_TRANSLATIONS: Record<string, string> = {
  // Navigation
  'Grocery': 'البقالة',
  'Home': 'الرئيسية',
  'Categories': 'الأقسام',
  'Cart': 'السلة',
  'Orders': 'الطلبات',
  'Account': 'الحساب',
  'Search': 'بحث',
  'Search for groceries, stores, or brands...': 'ابحث عن بقالة، متاجر أو علامات تجارية...',

  // Homepage sections
  'Shop by Category': 'تسوق حسب القسم',
  'Nearby Stores': 'متاجر قريبة',
  'Featured Stores': 'متاجر مميزة',
  'Trending Stores': 'متاجر رائجة',
  'Best Seller Stores': 'أفضل المتاجر مبيعاً',
  'Top-Rated Stores': 'المتاجر الأعلى تقييماً',
  'Fast Delivery Stores': 'توصيل سريع',
  'New Stores Near You': 'متاجر جديدة بالقرب منك',
  'Popular Supermarkets': 'سوبر ماركت شهيرة',
  'Hypermarkets': 'هايبر ماركت',
  'Fresh Fruits & Vegetables': 'فواكه وخضروات طازجة',
  'Fresh Meat & Fish': 'لحوم وأسماك طازجة',
  'Bakery & Dairy': 'مخبز ومنتجات ألبان',
  'Organic Stores': 'متاجر عضوية',
  'View All': 'عرض الكل',
  'View Store': 'زيارة المتجر',
  'View Products': 'عرض المنتجات',

  // Store details
  'Open': 'مفتوح',
  'Closed': 'مغلق',
  'Free Delivery': 'توصيل مجاني',
  'Min. order': 'الحد الأدنى للطلب',
  'Delivery': 'التوصيل',
  'Rating': 'التقييم',
  'Distance': 'المسافة',

  // Product
  'Add': 'أضف',
  'ADD': 'أضف',
  'In Stock': 'متوفر',
  'Out of Stock': 'غير متوفر',
  'Low Stock': 'كمية محدودة',
  'Fresh': 'طازج',
  'Farm Fresh': 'طازج من المزرعة',
  'Halal': 'حلال',
  'Organic': 'عضوي',

  // Cart & Checkout
  'Your Cart': 'سلتك',
  'Checkout': 'الدفع',
  'Place Order': 'تأكيد الطلب',
  'Subtotal': 'المجموع الفرعي',
  'Delivery Fee': 'رسوم التوصيل',
  'Total': 'المجموع',
  'Apply Coupon': 'تطبيق القسيمة',
  'Proceed to Checkout': 'المتابعة للدفع',
  'Delivery Address': 'عنوان التوصيل',
  'Payment Method': 'طريقة الدفع',

  // Trust badges
  'Fresh Guarantee': 'ضمان الطزاجة',
  'Fast Delivery': 'توصيل سريع',
  'Easy Returns': 'إرجاع سهل',
  'Secure Payment': 'دفع آمن',
  'Best Prices': 'أفضل الأسعار',

  // Categories
  'Fruits & Vegetables': 'فواكه وخضروات',
  'Fresh Meat': 'لحوم طازجة',
  'Fresh Fish': 'أسماك طازجة',
  'Dairy, Bread & Eggs': 'ألبان وخبز وبيض',
  'Rice, Flour & Pulses': 'أرز ودقيق وبقوليات',
  'Cooking Oil & Ghee': 'زيت طبخ وسمن',
  'Masala & Spices': 'بهارات وتوابل',
  'Snacks & Packaged Food': 'وجبات خفيفة ومعبأة',
  'Beverages': 'مشروبات',
  'Frozen Food': 'أطعمة مجمدة',
  'Bakery': 'مخبوزات',
  'Breakfast Items': 'فطور',
  'Household Cleaning': 'تنظيف منزلي',
  'Personal Care': 'عناية شخصية',
  'Baby Care': 'عناية بالطفل',
  'Pet Care': 'عناية بالحيوانات',
  'Organic Products': 'منتجات عضوية',
  'International Foods': 'أطعمة عالمية',
  'Stationery & Home Basics': 'قرطاسية ومستلزمات منزلية',
  'Ready-to-Cook': 'جاهز للطبخ',
  'Ready-to-Eat': 'جاهز للأكل',
  'Dry Fruits & Nuts': 'فواكه مجففة ومكسرات',
  'Chocolates & Sweets': 'شوكولاتة وحلويات',
  'Tea, Coffee & Health Drinks': 'شاي وقهوة ومشروبات صحية',
  'Arabic Sweets & Dates': 'حلويات عربية وتمور',

  // FAQ
  'Frequently Asked Questions': 'الأسئلة الشائعة',

  'Brands': 'العلامات التجارية',
  'Your cart is empty': 'سلتك فارغة',
  'Deliver to': 'التوصيل إلى',
  'Change': 'تغيير',

  "Limited time offers from top stores — hurry before they're gone!":
    'عروض لفترة محدودة من أفضل المتاجر — سارع قبل نفادها!',

  'All Stores': 'كل المتاجر',
  'Supermarkets': 'سوبر ماركت',
  'Meat & Fish': 'لحوم وأسماك',
  'Fruits & Veg': 'فواكه وخضار',
  'Dairy & Bakery': 'ألبان ومخبوزات',
  'Convenience': 'بقالة صغيرة',
  'stores near you': 'متجر بالقرب منك',

  'Recommended': 'موصى به',
  'Top Rated': 'الأعلى تقييماً',
  'Fastest Delivery': 'الأسرع توصيلاً',
  'Nearest': 'الأقرب',
  'Most Popular': 'الأكثر شيوعاً',

  // ── Orders, tracking, reviews and the rest ───────────────────────────
  // The second tier: everything after the basket, plus the shared dialogs.

  'Add New': 'إضافة جديد',
  'Back to Grocery': 'العودة إلى البقالة',
  'Back to Order': 'العودة إلى الطلب',
  'Back to Orders': 'العودة إلى الطلبات',
  'Back to Product': 'العودة إلى المنتج',
  'Back to order': 'العودة إلى الطلب',
  'Back to orders': 'العودة إلى الطلبات',
  'Browse Groceries': 'تصفح البقالة',
  'Browse stores': 'تصفح المتاجر',
  'Call': 'اتصال',
  'Clear All': 'مسح الكل',
  'Close': 'إغلاق',
  'Continue Shopping': 'متابعة التسوق',
  'Continue shopping': 'متابعة التسوق',
  'Copied': 'تم النسخ',
  'Copy Order ID': 'نسخ رقم الطلب',
  'Print': 'طباعة',
  'Rate': 'قيّم',
  'Read': 'مقروء',
  'Retry': 'إعادة المحاولة',
  'Remove photo': 'إزالة الصورة',
  'Set Default': 'تعيين كافتراضي',
  'View Product': 'عرض المنتج',
  'Saving…': 'جارٍ الحفظ…',
  'Reordering...': 'جارٍ إعادة الطلب...',
  'Order Status': 'حالة الطلب',
  'Order status': 'حالة الطلب',
  'Order number': 'رقم الطلب',
  'Order placed': 'تم تقديم الطلب',
  'Delivered': 'تم التوصيل',
  'Delivered to': 'تم التوصيل إلى',
  'In progress': 'قيد التنفيذ',
  'Estimated delivery': 'وقت التوصيل المتوقع',
  'Live Tracking': 'تتبع مباشر',
  'Track order': 'تتبع الطلب',
  'Tracking unavailable': 'التتبع غير متاح',
  'Delivery Partner': 'مندوب التوصيل',
  'Delivery partner': 'مندوب التوصيل',
  'Delivery partner is on the way': 'مندوب التوصيل في الطريق',
  'Call delivery partner': 'الاتصال بمندوب التوصيل',
  'Chat with delivery partner': 'محادثة مندوب التوصيل',
  'Delivery address': 'عنوان التوصيل',
  'Receipt': 'الإيصال',
  'Receipt unavailable': 'الإيصال غير متاح',
  'Item': 'الصنف',
  'Amount': 'المبلغ',
  'Discount': 'الخصم',
  'Payment': 'الدفع',
  'Paid by': 'تم الدفع بواسطة',
  'Total paid': 'إجمالي المدفوع',
  'Sold by': 'يباع بواسطة',
  'KARTSEEK Grocery': 'كارتسيك بقالة',
  'Nothing to reorder': 'لا يوجد ما يمكن إعادة طلبه',
  'Thank you!': 'شكراً لك!',
  'Thank you — your groceries are being prepared.': 'شكراً لك — يتم تجهيز طلبك الآن.',
  'Your Review': 'مراجعتك',
  'Review Title': 'عنوان المراجعة',
  'How would you rate this product?': 'كيف تقيّم هذا المنتج؟',
  'Tell others what you think about this product...': 'أخبر الآخرين برأيك في هذا المنتج...',
  'e.g., Fresh and great quality!': 'مثال: طازج وجودة ممتازة!',
  'Add Photos (Optional)': 'إضافة صور (اختياري)',
  'Delivery Addresses': 'عناوين التوصيل',
  'No addresses yet': 'لا توجد عناوين بعد',
  'Add one so we know where to deliver your groceries.': 'أضف عنواناً لنعرف أين نوصل طلبك.',
  'Coupons': 'الكوبونات',
  'Apply any of these at checkout': 'استخدم أياً منها عند الدفع',
  'No active deals right now': 'لا توجد عروض نشطة حالياً',
  'Check back soon — new flash deals drop every day!': 'عد قريباً — عروض جديدة كل يوم!',
  'We could not load today&apos;s deals': 'تعذر تحميل عروض اليوم',
  'Up to 60% off on selected items': 'خصم حتى 60% على منتجات مختارة',
  'Ended': 'انتهى',
  'Discount: Highest First': 'الخصم: الأعلى أولاً',
  'Choose Delivery Slot': 'اختر موعد التوصيل',
  'Select Date': 'اختر التاريخ',
  'Select Time Slot': 'اختر الفترة الزمنية',
  'Confirm Slot': 'تأكيد الموعد',
  'Express Delivery': 'توصيل سريع',
  'Fully booked': 'محجوز بالكامل',
  'My Wishlist': 'قائمة أمنياتي',
  'Your wishlist is empty': 'قائمة أمنياتك فارغة',
  'Save products you love by tapping the heart icon': 'احفظ المنتجات التي تعجبك بالضغط على أيقونة القلب',
  'Recently Viewed': 'شوهدت مؤخراً',
  'Nothing viewed yet': 'لم تشاهد أي منتج بعد',
  'Notifications': 'الإشعارات',
  'Order updates and offers will appear here.': 'ستظهر هنا تحديثات الطلبات والعروض.',
  'Replace cart items?': 'استبدال محتويات السلة؟',
  'Replace Cart': 'استبدال السلة',
  'Keep Current Cart': 'الاحتفاظ بالسلة الحالية',
  'Your cart contains items from': 'سلتك تحتوي على منتجات من',
  'You can only order from one store at a time': 'يمكنك الطلب من متجر واحد فقط في المرة',
  'Search brands': 'ابحث عن علامة تجارية',
  'Search brands…': 'ابحث عن علامة تجارية…',
  'Products in the catalogue will list their brands here.': 'ستظهر هنا العلامات التجارية للمنتجات في الكتالوج.',
  'We could not load this category': 'تعذر تحميل هذا القسم',
  'No store near you is stocking this category right now.': 'لا يوجد متجر قريب يوفر هذا القسم حالياً.',
  'Explore All Categories': 'استكشف كل الأقسام',
  'Featured & Sponsored Stores': 'متاجر مميزة ومدعومة',
  'Fruits & Vegetable Stores': 'متاجر الفواكه والخضار',
  'More Brands You Love': 'المزيد من العلامات التي تحبها',
  'New Store Arrivals': 'متاجر جديدة',
  'Organic & Health Stores': 'متاجر عضوية وصحية',
  'Recently Visited': 'زرتها مؤخراً',
  'SPONSORED STORE': 'متجر مدعوم',
  'Shop by Brand': 'تسوق حسب العلامة التجارية',
  'Supermarkets & Hypermarkets': 'سوبر ماركت وهايبر ماركت',
  'Top Rated Stores': 'المتاجر الأعلى تقييماً',
  'Your Weekly Picks': 'اختياراتك الأسبوعية',
  'Country': 'الدولة',
  'Grocery navigation': 'تصفح البقالة',
  'Grocery navigation header': 'رأس تصفح البقالة',
  'Skip to main content': 'تخطٍ إلى المحتوى الرئيسي',
  'Wishlist': 'قائمة الأمنيات',
  'Help Center': 'مركز المساعدة',
  'How can we help you today?': 'كيف يمكننا مساعدتك اليوم؟',
  'Search for help...': 'ابحث عن مساعدة...',

  'Detecting location…': 'جارٍ تحديد الموقع…',

  // ── Shopping path ────────────────────────────────────────────────────
  // Cart, checkout, store, product, orders and search. These pages were
  // entirely untranslated: an Arabic shopper got Arabic chrome on the
  // homepage and English from the moment they opened a shop.

  'Add an address': 'أضف عنواناً',
  'Add more': 'أضف المزيد',
  'Apply': 'تطبيق',
  'Back': 'رجوع',
  'Back to cart': 'العودة إلى السلة',
  'Back to grocery': 'العودة إلى البقالة',
  'Browse Grocery': 'تصفح البقالة',
  'Browse Stores': 'تصفح المتاجر',
  'Cancel': 'إلغاء',
  'Clear Search': 'مسح البحث',
  'Clear search': 'مسح البحث',
  'Clear filters': 'مسح عوامل التصفية',
  // Facet controls on the store shelf.
  'Sub-category': 'الفئة الفرعية',
  // Brand catalogue page.
  'Loading…': 'جارٍ التحميل…',
  'products': 'منتجات',
  'Nothing from this brand right now': 'لا يوجد شيء من هذه العلامة حالياً',
  'No store in your area is stocking it today.': 'لا يوجد متجر في منطقتك يوفرها اليوم.',
  'Browse groceries': 'تصفح البقالة',
  'Product not found': 'المنتج غير موجود',
  'of which': 'منها',
  'Loading': 'جارٍ التحميل',
  'Store not found': 'المتجر غير موجود',
  'This store is not delivering in your area right now.': 'هذا المتجر لا يوصل إلى منطقتك حاليًا.',
  'We could not load this product. Please try again.': 'تعذر تحميل هذا المنتج. يرجى المحاولة مرة أخرى.',
  'This product is no longer available in your area.': 'لم يعد هذا المنتج متاحًا في منطقتك.',
  'Pack size': 'حجم العبوة',
  'Sold out': 'نفدت الكمية',
  'About this product': 'عن هذا المنتج',
  'Brand': 'العلامة التجارية',
  'All brands': 'كل العلامات',
  'All': 'الكل',
  'Decrease': 'إنقاص',
  'Decrease quantity': 'إنقاص الكمية',
  'Details': 'التفاصيل',
  'Increase': 'زيادة',
  'Increase quantity': 'زيادة الكمية',
  'Remove': 'إزالة',
  'Reorder': 'إعادة الطلب',
  'Share': 'مشاركة',
  'Try again': 'حاول مرة أخرى',
  'View All Products': 'عرض كل المنتجات',
  'View Cart': 'عرض السلة',
  'Write a Review': 'اكتب مراجعة',
  'Order Summary': 'ملخص الطلب',
  'Delivery Slot': 'موعد التوصيل',
  'Platform Fee': 'رسوم المنصة',
  'Quantity': 'الكمية',
  'Savings': 'التوفير',
  'Total:': 'الإجمالي:',
  'Coupon code': 'رمز الكوبون',
  'Enter code': 'أدخل الرمز',
  'Free': 'مجاني',
  'FREE': 'مجاني',
  'Express delivery': 'توصيل سريع',
  'Placing Order...': 'جارٍ تنفيذ الطلب...',
  'Nothing to check out': 'لا يوجد ما يمكن دفعه',
  'Your basket is empty — add a few items first.': 'سلتك فارغة — أضف بعض المنتجات أولاً.',
  'Choose a delivery address to continue.': 'اختر عنوان توصيل للمتابعة.',
  'You have no saved delivery addresses yet.': 'ليس لديك عناوين توصيل محفوظة بعد.',
  'All items are from': 'جميع المنتجات من',
  'Default': 'الافتراضي',
  'Flash Deals': 'عروض سريعة',
  'Ends in': 'ينتهي خلال',
  'LIVE': 'مباشر',
  'SPONSORED': 'إعلان',
  'NON-VEG': 'غير نباتي',
  'Out of stock': 'نفدت الكمية',
  'Store Information': 'معلومات المتجر',
  'Similar Products': 'منتجات مشابهة',
  'Frequently Bought Together': 'يُشترى معاً عادةً',
  'Nutritional Information (per 100g)': 'المعلومات الغذائية (لكل 100 جرام)',
  'Ratings & Reviews': 'التقييمات والمراجعات',
  'Your Rating': 'تقييمك',
  'Share your experience with this product...': 'شارك تجربتك مع هذا المنتج...',
  'No reviews yet — be the first to review this product.': 'لا توجد مراجعات بعد — كن أول من يراجع هذا المنتج.',
  'Quality Check': 'فحص الجودة',
  'Quality Guarantee': 'ضمان الجودة',
  'Easy Return': 'إرجاع سهل',
  'Return & Refund': 'الإرجاع والاسترداد',
  'Delivery Policy': 'سياسة التوصيل',
  'Within 24 hours': 'خلال 24 ساعة',
  'Grocery Stores': 'متاجر البقالة',
  'Order History': 'سجل الطلبات',
  'Search groceries': 'ابحث في البقالة',
  'Search the catalogue': 'ابحث في الكتالوج',
  'Search for groceries, stores, brands...': 'ابحث عن بقالة أو متاجر أو علامات تجارية...',
  'Search stores by name or type...': 'ابحث عن المتاجر بالاسم أو النوع...',
  'Loading search...': 'جارٍ تحميل البحث...',
  'Search is unavailable': 'البحث غير متاح',
  'Type at least two characters to start.': 'اكتب حرفين على الأقل للبدء.',
  'No results found': 'لا توجد نتائج',
  'No products found': 'لا توجد منتجات',
  'No stores found': 'لا توجد متاجر',
  'No orders yet': 'لا توجد طلبات بعد',
  'Start shopping to see your orders here': 'ابدأ التسوق لتظهر طلباتك هنا',
  'We could not load nearby stores': 'تعذر تحميل المتاجر القريبة',
  'Sort products': 'ترتيب المنتجات',
  'Sort stores': 'ترتيب المتاجر',
  'Sort by: Relevance': 'الترتيب: الأكثر صلة',
  'Price: Low to High': 'السعر: من الأقل إلى الأعلى',
  'Price: High to Low': 'السعر: من الأعلى إلى الأقل',
  // Category → stores strip
  'Stores with': 'متاجر تبيع',
  'Stores near you': 'متاجر قريبة منك',
  'All Groceries': 'كل البقالة',
  'Everything on sale near you, across every aisle.': 'كل ما يُباع قريبًا منك، في جميع الأقسام.',
  'View all': 'عرض الكل',
  'We could not find that area. Try a nearby district or landmark.':
    'لم نتمكن من العثور على هذه المنطقة. جرّب حياً أو معلماً قريباً.',
  'Enter your delivery area:': 'أدخل منطقة التوصيل:',

  // Common
  'OFF': 'خصم',
  'NEW': 'جديد',
  'OPEN': 'مفتوح',
  'CLOSED': 'مغلق',
  'items': 'منتجات',
  'min': 'دقيقة',
  'km': 'كم',
  'ratings': 'تقييمات',
  'Up to': 'حتى',
};

// ── Translation Helper ────────────────────────────────────────────────────

/**
 * Keys asked for in Arabic that have no Arabic. Reported once each.
 *
 * The fallback below is deliberate — a missing translation must render the
 * English rather than a blank or a raw key, because a shopper mid-checkout is
 * better served by a word they may not read than by nothing at all. But that
 * same fallback made the gap invisible: the module sat at 9% coverage with
 * every page on the shopping path at zero, and nothing anywhere said so.
 *
 * So the fallback stays and the silence goes. In development each missing key
 * is logged once; `missingTranslationKeys()` exposes the same set so a test can
 * assert against it.
 */
const missingKeys = new Set<string>();

export function missingTranslationKeys(): string[] {
  return [...missingKeys].sort();
}

export function t(key: string, useArabic: boolean): string {
  if (!useArabic) return key;

  const translated = AR_TRANSLATIONS[key];
  if (translated) return translated;

  if (!missingKeys.has(key)) {
    missingKeys.add(key);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`[grocery i18n] no Arabic for: "${key}" — falling back to English`);
    }
  }
  return key;
}

// ── Context ───────────────────────────────────────────────────────────────

interface GroceryLocaleContextType {
  country: GroceryCountryCode;
  config: GroceryCountryConfig;
  setCountry: (code: GroceryCountryCode) => void;
  formatPrice: (amount: number) => string;
  taxLabel: string;
  deliveryUnit: string;
  isRTL: boolean;
  showArabic: boolean;
  tr: (key: string) => string;
}

const GroceryLocaleContext = createContext<GroceryLocaleContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

/**
 * Grocery's country, seeded from the platform region rather than from India.
 *
 * This provider used to hold `useState<GroceryCountryCode>('IN')` and never
 * read the platform region at all, so the entire grocery module rendered in
 * India — rupee prices, Indian tax labels, English-only copy — no matter which
 * market the rest of the site had resolved. `RegionProvider` is mounted in the
 * root layout and therefore always wraps this one, so the region is available;
 * it simply was not being consulted.
 *
 * Grocery ships in a subset of the platform's markets, so a region grocery does
 * not serve falls back to the platform default instead of throwing.
 */
function toGroceryCountry(code: string | undefined): GroceryCountryCode {
  const upper = (code ?? '').toUpperCase();
  if (upper in GROCERY_COUNTRIES) return upper as GroceryCountryCode;
  const fallback = DEFAULT_COUNTRY.toUpperCase();
  return (fallback in GROCERY_COUNTRIES ? fallback : 'QA') as GroceryCountryCode;
}

export function GroceryLocaleProvider({ children }: { children: React.ReactNode }) {
  const { country: platformCountry, currentLanguage } = useRegion();
  // An explicit in-module switch wins over the platform region, but only until
  // the platform region changes — the same precedence the marketplace uses for
  // its payment-method picker.
  const [override, setOverride] = useState<{ base: string; picked: GroceryCountryCode } | null>(null);
  const resolved = toGroceryCountry(platformCountry.code);
  const country = override?.base === platformCountry.code ? override.picked : resolved;
  const setCountry = useCallback(
    (next: GroceryCountryCode) => setOverride({ base: platformCountry.code, picked: next }),
    [platformCountry.code],
  );

  const config = GROCERY_COUNTRIES[country];

  /**
   * Arabic follows the shopper's choice, not the country.
   *
   * This used to be
   *   `!!config.language.secondary && config.language.secondary === 'ar'
   *     || config.language.primary === 'ar'`
   * — a property of the *market*, never of the person reading the page. Qatar
   * lists Arabic as its secondary language, so `showArabic` was permanently
   * true there and `isRTL` came straight off `config.language.rtl`. The result:
   * the document was served as `<html lang="en" dir="ltr">` while grocery
   * rendered ~280 Arabic strings inside its own `dir="rtl"` island, and the
   * header's EN/AR switcher — which does drive `currentLanguage`, the cookie
   * and the `<html>` attributes — changed nothing inside grocery.
   *
   * The market still decides what is *offered* (a market with no Arabic cannot
   * show it); the shopper decides what is *used*.
   */
  const offersArabic =
    config.language.primary === 'ar' || config.language.secondary === 'ar';
  const showArabic = offersArabic && currentLanguage === 'ar';
  const isRTL = getDirection(currentLanguage) === 'rtl';

  const formatPrice = useCallback((amount: number) => formatLocalPrice(amount, country), [country]);
  const taxLabel = useMemo(() => getTaxLabel(country, showArabic), [country, showArabic]);
  const deliveryUnit = useMemo(() => getDeliveryUnit(country), [country]);
  const tr = useCallback((key: string) => t(key, showArabic), [showArabic]);

  const value = useMemo(() => ({
    country, config, setCountry, formatPrice, taxLabel, deliveryUnit, isRTL, showArabic, tr,
  }), [country, config, setCountry, formatPrice, taxLabel, deliveryUnit, isRTL, showArabic, tr]);

  return React.createElement(GroceryLocaleContext.Provider, { value }, children);
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useGroceryLocale(): GroceryLocaleContextType {
  const ctx = useContext(GroceryLocaleContext);
  if (!ctx) {
    // Fallback for components not wrapped in the provider. It used to hard-code
    // India here too, so an unwrapped grocery component silently formatted
    // rupees; it now falls back to the platform's default market.
    const fallback = toGroceryCountry(undefined);
    const cfg = GROCERY_COUNTRIES[fallback];
    return {
      country: fallback,
      config: cfg,
      setCountry: () => {},
      formatPrice: (amount: number) => formatLocalPrice(amount, fallback),
      taxLabel: cfg.tax.label,
      deliveryUnit: 'km',
      isRTL: false,
      showArabic: false,
      tr: (key: string) => key,
    };
  }
  return ctx;
}

// ── Country List for Selector ─────────────────────────────────────────────

export const GROCERY_COUNTRY_LIST: { code: GroceryCountryCode; name: string; flag: string; nameAr?: string }[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', nameAr: 'قطر' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', nameAr: 'الإمارات' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', nameAr: 'السعودية' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', nameAr: 'البحرين' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', nameAr: 'الكويت' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', nameAr: 'عُمان' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
];
