// Shared Category → Attribute schema used by both Admin Panel and Seller Portal.
// Admin: /admin/marketplace/attributes  (manages this data)
// Seller: /seller/marketplace/products/add  (consumes this data)
//
// ⚠️  This file MUST stay in sync with marketplace-home.ts CATEGORIES.
//     Every category ID and subcategory name here must match the admin panel.

export type AttrType = 'text' | 'number' | 'select' | 'multi_select' | 'boolean' | 'color' | 'date' | 'range';

export interface AttributeValue {
  label: string;
  slug: string;
  hex?: string; // for color type
}

export interface CategoryAttribute {
  id: string;
  name: string;
  slug: string;
  type: AttrType;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  showOnProduct: boolean;
  values: AttributeValue[];
  placeholder?: string;
  unit?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryAttributeSet {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  subcategories: SubCategory[];
  attributes: CategoryAttribute[];
  variantAxes: string[]; // attribute slugs used to generate variants
  commissionRate: number; // percentage
  hsnPrefix?: string;
  gstRate?: number;
}

// ─── Helper: generate subcategory objects from name strings ─────────────────

function subs(names: string[]): SubCategory[] {
  return names.map(n => ({
    id: n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
    name: n,
    slug: n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
  }));
}

// ─── Category Definitions (synced with marketplace-home.ts CATEGORIES) ─────

export const CATEGORY_ATTRIBUTES: CategoryAttributeSet[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Mobiles & Tablets
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'mobiles-tablets',
    categoryName: 'Mobiles & Tablets',
    categoryIcon: '📱',
    subcategories: subs(['Smartphones', 'Tablets', 'Feature Phones', 'Mobile Accessories', 'Cases & Covers', 'Screen Protectors', 'Power Banks', 'Chargers & Cables']),
    commissionRate: 8,
    hsnPrefix: '8517',
    gstRate: 18,
    variantAxes: ['color', 'storage'],
    attributes: [
      { id: 'attr-m1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Apple', slug: 'apple' }, { label: 'Samsung', slug: 'samsung' }, { label: 'OnePlus', slug: 'oneplus' }, { label: 'Xiaomi', slug: 'xiaomi' }, { label: 'Google', slug: 'google' }, { label: 'Nothing', slug: 'nothing' }, { label: 'Oppo', slug: 'oppo' }, { label: 'Vivo', slug: 'vivo' }, { label: 'Realme', slug: 'realme' }, { label: 'Motorola', slug: 'motorola' }] },
      { id: 'attr-m2', name: 'RAM', slug: 'ram', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select RAM', values: [{ label: '4 GB', slug: '4gb' }, { label: '6 GB', slug: '6gb' }, { label: '8 GB', slug: '8gb' }, { label: '12 GB', slug: '12gb' }, { label: '16 GB', slug: '16gb' }] },
      { id: 'attr-m3', name: 'Storage', slug: 'storage', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select storage', values: [{ label: '64 GB', slug: '64gb' }, { label: '128 GB', slug: '128gb' }, { label: '256 GB', slug: '256gb' }, { label: '512 GB', slug: '512gb' }, { label: '1 TB', slug: '1tb' }] },
      { id: 'attr-m4', name: 'Display Size', slug: 'display-size', type: 'number', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'e.g. 6.7', unit: 'inches', values: [] },
      { id: 'attr-m5', name: 'Color', slug: 'color', type: 'color', required: true, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }, { label: 'Green', slug: 'green', hex: '#22c55e' }, { label: 'Gold', slug: 'gold', hex: '#eab308' }, { label: 'Purple', slug: 'purple', hex: '#a855f7' }] },
      { id: 'attr-m6', name: 'Battery Capacity', slug: 'battery', type: 'number', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'e.g. 5000', unit: 'mAh', values: [] },
      { id: 'attr-m7', name: 'Processor', slug: 'processor', type: 'text', required: false, filterable: false, searchable: true, showOnProduct: true, placeholder: 'e.g. Apple A17 Pro', values: [] },
      { id: 'attr-m8', name: '5G Support', slug: '5g', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-m9', name: 'Operating System', slug: 'os', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select OS', values: [{ label: 'iOS', slug: 'ios' }, { label: 'Android', slug: 'android' }, { label: 'HarmonyOS', slug: 'harmonyos' }] },
      { id: 'attr-m10', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Electronics
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'electronics',
    categoryName: 'Electronics',
    categoryIcon: '💻',
    subcategories: subs(['Laptops', 'Headphones & Earbuds', 'Cameras', 'Smart Watches', 'Speakers', 'Gaming Consoles', 'Drones', 'Storage Devices']),
    commissionRate: 10,
    hsnPrefix: '8471',
    gstRate: 18,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-e1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Sony', slug: 'sony' }, { label: 'Bose', slug: 'bose' }, { label: 'JBL', slug: 'jbl' }, { label: 'Dell', slug: 'dell' }, { label: 'HP', slug: 'hp' }, { label: 'Lenovo', slug: 'lenovo' }, { label: 'Apple', slug: 'apple' }, { label: 'Canon', slug: 'canon' }, { label: 'Samsung', slug: 'samsung' }, { label: 'Asus', slug: 'asus' }] },
      { id: 'attr-e2', name: 'Processor', slug: 'processor', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select processor', values: [{ label: 'Intel i5', slug: 'i5' }, { label: 'Intel i7', slug: 'i7' }, { label: 'Intel i9', slug: 'i9' }, { label: 'AMD Ryzen 5', slug: 'r5' }, { label: 'AMD Ryzen 7', slug: 'r7' }, { label: 'Apple M3', slug: 'm3' }, { label: 'Apple M4', slug: 'm4' }] },
      { id: 'attr-e3', name: 'Color', slug: 'color', type: 'color', required: true, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'Silver', slug: 'silver', hex: '#c0c0c0' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }] },
      { id: 'attr-e4', name: 'Connectivity', slug: 'connectivity', type: 'multi_select', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Bluetooth', slug: 'bt' }, { label: 'WiFi', slug: 'wifi' }, { label: 'USB-C', slug: 'usbc' }, { label: 'HDMI', slug: 'hdmi' }, { label: 'NFC', slug: 'nfc' }, { label: '3.5mm Jack', slug: 'aux' }] },
      { id: 'attr-e5', name: 'Weight', slug: 'weight', type: 'number', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 250', unit: 'grams', values: [] },
      { id: 'attr-e6', name: 'Noise Cancelling', slug: 'anc', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-e7', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Fashion & Apparel
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'fashion',
    categoryName: 'Fashion & Apparel',
    categoryIcon: '👗',
    subcategories: subs(["Men's Clothing", "Women's Clothing", "Kids' Wear", 'Ethnic Wear', 'Winter Wear', 'Sportswear', 'Innerwear', 'Accessories']),
    commissionRate: 15,
    hsnPrefix: '6109',
    gstRate: 12,
    variantAxes: ['size', 'color'],
    attributes: [
      { id: 'attr-f1', name: 'Size', slug: 'size', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select size', values: [{ label: 'XS', slug: 'xs' }, { label: 'S', slug: 's' }, { label: 'M', slug: 'm' }, { label: 'L', slug: 'l' }, { label: 'XL', slug: 'xl' }, { label: 'XXL', slug: 'xxl' }, { label: '3XL', slug: '3xl' }] },
      { id: 'attr-f2', name: 'Color', slug: 'color', type: 'color', required: true, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Red', slug: 'red', hex: '#ef4444' }, { label: 'Navy', slug: 'navy', hex: '#1e3a5f' }, { label: 'Beige', slug: 'beige', hex: '#f5f5dc' }, { label: 'Olive', slug: 'olive', hex: '#556b2f' }] },
      { id: 'attr-f3', name: 'Material', slug: 'material', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select material', values: [{ label: 'Cotton', slug: 'cotton' }, { label: 'Polyester', slug: 'polyester' }, { label: 'Silk', slug: 'silk' }, { label: 'Denim', slug: 'denim' }, { label: 'Linen', slug: 'linen' }, { label: 'Wool', slug: 'wool' }, { label: 'Leather', slug: 'leather' }] },
      { id: 'attr-f4', name: 'Pattern', slug: 'pattern', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select pattern', values: [{ label: 'Solid', slug: 'solid' }, { label: 'Striped', slug: 'striped' }, { label: 'Printed', slug: 'printed' }, { label: 'Checked', slug: 'checked' }, { label: 'Floral', slug: 'floral' }] },
      { id: 'attr-f5', name: 'Gender', slug: 'gender', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: false, placeholder: 'Select gender', values: [{ label: 'Men', slug: 'men' }, { label: 'Women', slug: 'women' }, { label: 'Unisex', slug: 'unisex' }, { label: 'Kids', slug: 'kids' }] },
      { id: 'attr-f6', name: 'Sleeve Length', slug: 'sleeve', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select sleeve type', values: [{ label: 'Full Sleeve', slug: 'full' }, { label: 'Half Sleeve', slug: 'half' }, { label: 'Sleeveless', slug: 'sleeveless' }, { label: '3/4 Sleeve', slug: 'three-quarter' }] },
      { id: 'attr-f7', name: 'Fit', slug: 'fit', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select fit', values: [{ label: 'Regular', slug: 'regular' }, { label: 'Slim', slug: 'slim' }, { label: 'Relaxed', slug: 'relaxed' }, { label: 'Oversize', slug: 'oversize' }] },
      { id: 'attr-f8', name: 'Occasion', slug: 'occasion', type: 'multi_select', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Casual', slug: 'casual' }, { label: 'Formal', slug: 'formal' }, { label: 'Party', slug: 'party' }, { label: 'Sports', slug: 'sports' }, { label: 'Ethnic', slug: 'ethnic' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Beauty & Personal Care
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'beauty',
    categoryName: 'Beauty & Personal Care',
    categoryIcon: '✨',
    subcategories: subs(['Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Personal Care', "Men's Grooming", 'Bath & Body', 'Luxury Beauty']),
    commissionRate: 12,
    hsnPrefix: '3304',
    gstRate: 18,
    variantAxes: ['volume'],
    attributes: [
      { id: 'attr-b1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Lakme', slug: 'lakme' }, { label: 'Maybelline', slug: 'maybelline' }, { label: "L'Oreal", slug: 'loreal' }, { label: 'The Body Shop', slug: 'body-shop' }, { label: 'Neutrogena', slug: 'neutrogena' }, { label: 'Nivea', slug: 'nivea' }, { label: 'MAC', slug: 'mac' }, { label: 'Forest Essentials', slug: 'forest-essentials' }] },
      { id: 'attr-b2', name: 'Skin Type', slug: 'skin-type', type: 'multi_select', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Oily', slug: 'oily' }, { label: 'Dry', slug: 'dry' }, { label: 'Combination', slug: 'combination' }, { label: 'Normal', slug: 'normal' }, { label: 'Sensitive', slug: 'sensitive' }] },
      { id: 'attr-b3', name: 'Concern', slug: 'concern', type: 'multi_select', required: false, filterable: true, searchable: true, showOnProduct: true, values: [{ label: 'Acne', slug: 'acne' }, { label: 'Anti-Aging', slug: 'anti-aging' }, { label: 'Brightening', slug: 'brightening' }, { label: 'Hydration', slug: 'hydration' }, { label: 'Sun Protection', slug: 'spf' }, { label: 'Pigmentation', slug: 'pigmentation' }] },
      { id: 'attr-b4', name: 'Volume', slug: 'volume', type: 'number', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'e.g. 200', unit: 'ml', values: [] },
      { id: 'attr-b5', name: 'Cruelty Free', slug: 'cruelty-free', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-b6', name: 'Organic', slug: 'organic', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-b7', name: 'SPF', slug: 'spf', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select SPF', values: [{ label: 'SPF 15', slug: '15' }, { label: 'SPF 30', slug: '30' }, { label: 'SPF 50', slug: '50' }, { label: 'SPF 50+', slug: '50plus' }] },
      { id: 'attr-b8', name: 'Shelf Life', slug: 'shelf-life', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '12 Months', slug: '12m' }, { label: '24 Months', slug: '24m' }, { label: '36 Months', slug: '36m' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Home & Kitchen
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'home-kitchen',
    categoryName: 'Home & Kitchen',
    categoryIcon: '🏠',
    subcategories: subs(['Kitchen Appliances', 'Cookware', 'Décor', 'Bedding', 'Storage & Organisation', 'Lighting', 'Dining & Serving', 'Cleaning Supplies']),
    commissionRate: 10,
    hsnPrefix: '7323',
    gstRate: 18,
    variantAxes: ['color', 'material'],
    attributes: [
      { id: 'attr-h1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Prestige', slug: 'prestige' }, { label: 'Borosil', slug: 'borosil' }, { label: 'Milton', slug: 'milton' }, { label: 'IKEA', slug: 'ikea' }, { label: 'HomeTown', slug: 'hometown' }, { label: 'Unbranded', slug: 'unbranded' }] },
      { id: 'attr-h2', name: 'Material', slug: 'material', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select material', values: [{ label: 'Stainless Steel', slug: 'steel' }, { label: 'Ceramic', slug: 'ceramic' }, { label: 'Glass', slug: 'glass' }, { label: 'Wood', slug: 'wood' }, { label: 'Plastic', slug: 'plastic' }, { label: 'Bamboo', slug: 'bamboo' }] },
      { id: 'attr-h3', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Silver', slug: 'silver', hex: '#c0c0c0' }, { label: 'Brown', slug: 'brown', hex: '#8b4513' }] },
      { id: 'attr-h4', name: 'Dimensions', slug: 'dimensions', type: 'text', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 30 x 20 x 10 cm', values: [] },
      { id: 'attr-h5', name: 'Capacity', slug: 'capacity', type: 'text', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 5 litres', values: [] },
      { id: 'attr-h6', name: 'Dishwasher Safe', slug: 'dishwasher-safe', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-h7', name: 'Microwave Safe', slug: 'microwave-safe', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-h8', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }, { label: '5 Years', slug: '5y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Appliances
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'appliances',
    categoryName: 'Appliances',
    categoryIcon: '📺',
    subcategories: subs(['TVs', 'Washing Machines', 'Refrigerators', 'Air Conditioners', 'Microwaves', 'Water Purifiers', 'Chimneys & Hobs', 'Geysers']),
    commissionRate: 8,
    hsnPrefix: '8516',
    gstRate: 18,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-ap1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Samsung', slug: 'samsung' }, { label: 'LG', slug: 'lg' }, { label: 'Sony', slug: 'sony' }, { label: 'Whirlpool', slug: 'whirlpool' }, { label: 'Bosch', slug: 'bosch' }, { label: 'Haier', slug: 'haier' }, { label: 'Voltas', slug: 'voltas' }, { label: 'Godrej', slug: 'godrej' }] },
      { id: 'attr-ap2', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Silver', slug: 'silver', hex: '#c0c0c0' }, { label: 'Grey', slug: 'grey', hex: '#6b7280' }] },
      { id: 'attr-ap3', name: 'Energy Rating', slug: 'energy-rating', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select star rating', values: [{ label: '2 Star', slug: '2star' }, { label: '3 Star', slug: '3star' }, { label: '4 Star', slug: '4star' }, { label: '5 Star', slug: '5star' }] },
      { id: 'attr-ap4', name: 'Capacity', slug: 'capacity', type: 'text', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'e.g. 7 kg, 300L, 55"', values: [] },
      { id: 'attr-ap5', name: 'Type', slug: 'type', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select type', values: [{ label: 'Front Load', slug: 'front-load' }, { label: 'Top Load', slug: 'top-load' }, { label: 'Semi-Automatic', slug: 'semi-auto' }, { label: 'Inverter', slug: 'inverter' }, { label: 'Smart', slug: 'smart' }] },
      { id: 'attr-ap6', name: 'Smart Features', slug: 'smart', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-ap7', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }, { label: '3 Years', slug: '3y' }, { label: '5 Years', slug: '5y' }, { label: '10 Years (Compressor)', slug: '10y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Furniture
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'furniture',
    categoryName: 'Furniture',
    categoryIcon: '🪑',
    subcategories: subs(['Living Room', 'Bedroom', 'Dining', 'Office Furniture', 'Outdoor', 'Mattresses', 'Kids Furniture', 'Storage']),
    commissionRate: 14,
    hsnPrefix: '9403',
    gstRate: 18,
    variantAxes: ['color', 'material'],
    attributes: [
      { id: 'attr-fu1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'IKEA', slug: 'ikea' }, { label: 'Urban Ladder', slug: 'urban-ladder' }, { label: 'Pepperfry', slug: 'pepperfry' }, { label: 'HomeTown', slug: 'hometown' }, { label: 'Nilkamal', slug: 'nilkamal' }, { label: 'Godrej Interio', slug: 'godrej' }, { label: 'Unbranded', slug: 'unbranded' }] },
      { id: 'attr-fu2', name: 'Material', slug: 'material', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select material', values: [{ label: 'Sheesham Wood', slug: 'sheesham' }, { label: 'Teak Wood', slug: 'teak' }, { label: 'Engineered Wood', slug: 'engineered' }, { label: 'Metal', slug: 'metal' }, { label: 'Fabric', slug: 'fabric' }, { label: 'Leatherette', slug: 'leatherette' }, { label: 'Plastic', slug: 'plastic' }] },
      { id: 'attr-fu3', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Brown', slug: 'brown', hex: '#8b4513' }, { label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Natural', slug: 'natural', hex: '#deb887' }, { label: 'Grey', slug: 'grey', hex: '#6b7280' }] },
      { id: 'attr-fu4', name: 'Dimensions', slug: 'dimensions', type: 'text', required: true, filterable: false, searchable: false, showOnProduct: true, placeholder: 'L x W x H in cm', values: [] },
      { id: 'attr-fu5', name: 'Seating Capacity', slug: 'seating', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: '1 Seater', slug: '1' }, { label: '2 Seater', slug: '2' }, { label: '3 Seater', slug: '3' }, { label: '4 Seater', slug: '4' }, { label: '6 Seater', slug: '6' }, { label: '8 Seater', slug: '8' }] },
      { id: 'attr-fu6', name: 'Assembly Required', slug: 'assembly', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-fu7', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '1 Year', slug: '1y' }, { label: '3 Years', slug: '3y' }, { label: '5 Years', slug: '5y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Sports & Fitness
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'sports',
    categoryName: 'Sports & Fitness',
    categoryIcon: '⚽',
    subcategories: subs(['Gym Equipment', 'Running Shoes', 'Cricket', 'Football', 'Yoga & Meditation', 'Cycling', 'Swimming', 'Nutrition & Supplements']),
    commissionRate: 12,
    hsnPrefix: '9506',
    gstRate: 18,
    variantAxes: ['size', 'color'],
    attributes: [
      { id: 'attr-s1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Nike', slug: 'nike' }, { label: 'Adidas', slug: 'adidas' }, { label: 'Puma', slug: 'puma' }, { label: 'Decathlon', slug: 'decathlon' }, { label: 'Under Armour', slug: 'under-armour' }, { label: 'Yonex', slug: 'yonex' }, { label: 'SG', slug: 'sg' }] },
      { id: 'attr-s2', name: 'Size', slug: 'size', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select size', values: [{ label: 'S', slug: 's' }, { label: 'M', slug: 'm' }, { label: 'L', slug: 'l' }, { label: 'XL', slug: 'xl' }, { label: 'XXL', slug: 'xxl' }] },
      { id: 'attr-s3', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Red', slug: 'red', hex: '#ef4444' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }] },
      { id: 'attr-s4', name: 'Sport', slug: 'sport', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select sport', values: [{ label: 'Cricket', slug: 'cricket' }, { label: 'Football', slug: 'football' }, { label: 'Badminton', slug: 'badminton' }, { label: 'Running', slug: 'running' }, { label: 'Gym', slug: 'gym' }, { label: 'Yoga', slug: 'yoga' }, { label: 'Swimming', slug: 'swimming' }, { label: 'Cycling', slug: 'cycling' }] },
      { id: 'attr-s5', name: 'Gender', slug: 'gender', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: false, placeholder: 'Select', values: [{ label: 'Men', slug: 'men' }, { label: 'Women', slug: 'women' }, { label: 'Unisex', slug: 'unisex' }] },
      { id: 'attr-s6', name: 'Weight Capacity', slug: 'weight-capacity', type: 'text', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 120 kg', values: [] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Books & Stationery
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'books',
    categoryName: 'Books & Stationery',
    categoryIcon: '📚',
    subcategories: subs(['Fiction', 'Non-Fiction', 'Academic & Textbooks', 'Self-Help', 'Comics & Manga', 'eBooks & Audiobooks', 'Stationery', 'Art Supplies']),
    commissionRate: 10,
    hsnPrefix: '4901',
    gstRate: 0,
    variantAxes: [],
    attributes: [
      { id: 'attr-bk1', name: 'Author', slug: 'author', type: 'text', required: true, filterable: false, searchable: true, showOnProduct: true, placeholder: 'e.g. J.K. Rowling', values: [] },
      { id: 'attr-bk2', name: 'Publisher', slug: 'publisher', type: 'text', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'e.g. Penguin Random House', values: [] },
      { id: 'attr-bk3', name: 'Language', slug: 'language', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select language', values: [{ label: 'English', slug: 'en' }, { label: 'Hindi', slug: 'hi' }, { label: 'Tamil', slug: 'ta' }, { label: 'Telugu', slug: 'te' }, { label: 'Bengali', slug: 'bn' }, { label: 'Marathi', slug: 'mr' }, { label: 'Arabic', slug: 'ar' }] },
      { id: 'attr-bk4', name: 'Format', slug: 'format', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select format', values: [{ label: 'Paperback', slug: 'paperback' }, { label: 'Hardcover', slug: 'hardcover' }, { label: 'eBook', slug: 'ebook' }, { label: 'Audiobook', slug: 'audiobook' }, { label: 'Spiral Bound', slug: 'spiral' }] },
      { id: 'attr-bk5', name: 'Pages', slug: 'pages', type: 'number', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 350', values: [] },
      { id: 'attr-bk6', name: 'ISBN', slug: 'isbn', type: 'text', required: false, filterable: false, searchable: true, showOnProduct: true, placeholder: 'e.g. 978-0-06-112008-4', values: [] },
      { id: 'attr-bk7', name: 'Genre', slug: 'genre', type: 'multi_select', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Fiction', slug: 'fiction' }, { label: 'Thriller', slug: 'thriller' }, { label: 'Romance', slug: 'romance' }, { label: 'Science Fiction', slug: 'sci-fi' }, { label: 'Biography', slug: 'biography' }, { label: 'Business', slug: 'business' }, { label: 'Academic', slug: 'academic' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Toys & Baby Products
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'toys-baby',
    categoryName: 'Toys & Baby Products',
    categoryIcon: '🧸',
    subcategories: subs(['Toys & Games', 'Baby Gear', 'Diapers & Wipes', 'Feeding Essentials', 'Nursery', 'School Supplies', 'Remote Control Toys', 'Educational Toys']),
    commissionRate: 12,
    hsnPrefix: '9503',
    gstRate: 12,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-tb1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Lego', slug: 'lego' }, { label: 'Fisher-Price', slug: 'fisher-price' }, { label: 'Mattel', slug: 'mattel' }, { label: 'Hasbro', slug: 'hasbro' }, { label: 'Funskool', slug: 'funskool' }, { label: 'Nerf', slug: 'nerf' }, { label: 'Hot Wheels', slug: 'hot-wheels' }] },
      { id: 'attr-tb2', name: 'Age Group', slug: 'age-group', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select age', values: [{ label: '0-1 Year', slug: '0-1' }, { label: '1-3 Years', slug: '1-3' }, { label: '3-5 Years', slug: '3-5' }, { label: '5-8 Years', slug: '5-8' }, { label: '8-12 Years', slug: '8-12' }, { label: '12+ Years', slug: '12plus' }] },
      { id: 'attr-tb3', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Multi', slug: 'multi', hex: '#f59e0b' }, { label: 'Pink', slug: 'pink', hex: '#ec4899' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }, { label: 'Green', slug: 'green', hex: '#22c55e' }, { label: 'Red', slug: 'red', hex: '#ef4444' }] },
      { id: 'attr-tb4', name: 'Material', slug: 'material', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select material', values: [{ label: 'Plastic', slug: 'plastic' }, { label: 'Wood', slug: 'wood' }, { label: 'Fabric', slug: 'fabric' }, { label: 'Metal', slug: 'metal' }, { label: 'Silicone', slug: 'silicone' }] },
      { id: 'attr-tb5', name: 'Battery Required', slug: 'battery', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-tb6', name: 'Safety Certified', slug: 'safety-cert', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Automotive Accessories
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'automotive',
    categoryName: 'Automotive Accessories',
    categoryIcon: '🚗',
    subcategories: subs(['Car Accessories', 'Bike Accessories', 'Helmets', 'Car Electronics', 'Oils & Fluids', 'Tools & Equipment', 'Tyre & Alloys', 'Car Care']),
    commissionRate: 10,
    hsnPrefix: '8708',
    gstRate: 28,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-au1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: '3M', slug: '3m' }, { label: 'Bosch', slug: 'bosch' }, { label: 'Philips', slug: 'philips' }, { label: 'Studds', slug: 'studds' }, { label: 'Vega', slug: 'vega' }, { label: 'Castrol', slug: 'castrol' }, { label: 'MRF', slug: 'mrf' }] },
      { id: 'attr-au2', name: 'Vehicle Type', slug: 'vehicle-type', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Car', slug: 'car' }, { label: 'Bike', slug: 'bike' }, { label: 'Scooter', slug: 'scooter' }, { label: 'Truck', slug: 'truck' }, { label: 'Universal', slug: 'universal' }] },
      { id: 'attr-au3', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'Silver', slug: 'silver', hex: '#c0c0c0' }, { label: 'Red', slug: 'red', hex: '#ef4444' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }] },
      { id: 'attr-au4', name: 'Compatibility', slug: 'compatibility', type: 'text', required: false, filterable: false, searchable: true, showOnProduct: true, placeholder: 'e.g. Honda City, Splendor', values: [] },
      { id: 'attr-au5', name: 'ISI Certified', slug: 'isi-certified', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-au6', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Health & Wellness
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'health-wellness',
    categoryName: 'Health & Wellness',
    categoryIcon: '❤️',
    subcategories: subs(['Vitamins & Supplements', 'Ayurvedic', 'Fitness Devices', 'Medical Devices', 'Health Drinks', 'Immunity Boosters', 'Weight Management', 'Elder Care']),
    commissionRate: 10,
    hsnPrefix: '2106',
    gstRate: 18,
    variantAxes: [],
    attributes: [
      { id: 'attr-hw1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Himalaya', slug: 'himalaya' }, { label: 'Patanjali', slug: 'patanjali' }, { label: 'HealthKart', slug: 'healthkart' }, { label: 'MuscleBlaze', slug: 'muscleblaze' }, { label: 'Dabur', slug: 'dabur' }, { label: 'Amway', slug: 'amway' }, { label: 'Omron', slug: 'omron' }] },
      { id: 'attr-hw2', name: 'Form', slug: 'form', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select form', values: [{ label: 'Tablets', slug: 'tablets' }, { label: 'Capsules', slug: 'capsules' }, { label: 'Powder', slug: 'powder' }, { label: 'Liquid', slug: 'liquid' }, { label: 'Syrup', slug: 'syrup' }, { label: 'Drops', slug: 'drops' }] },
      { id: 'attr-hw3', name: 'Quantity', slug: 'quantity', type: 'text', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 60 tablets, 500g', values: [] },
      { id: 'attr-hw4', name: 'Vegetarian', slug: 'vegetarian', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-hw5', name: 'FSSAI Approved', slug: 'fssai', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-hw6', name: 'Expiry', slug: 'expiry', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '12 Months', slug: '12m' }, { label: '24 Months', slug: '24m' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. Watches & Accessories
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'watches',
    categoryName: 'Watches & Accessories',
    categoryIcon: '⌚',
    subcategories: subs(["Men's Watches", "Women's Watches", 'Smartwatches', 'Luxury Watches', 'Sunglasses', 'Belts', 'Wallets', 'Jewellery']),
    commissionRate: 15,
    hsnPrefix: '9102',
    gstRate: 18,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-wa1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Casio', slug: 'casio' }, { label: 'Titan', slug: 'titan' }, { label: 'Fossil', slug: 'fossil' }, { label: 'Fastrack', slug: 'fastrack' }, { label: 'Apple', slug: 'apple' }, { label: 'Samsung', slug: 'samsung' }, { label: 'Ray-Ban', slug: 'ray-ban' }, { label: 'Sonata', slug: 'sonata' }] },
      { id: 'attr-wa2', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'Silver', slug: 'silver', hex: '#c0c0c0' }, { label: 'Gold', slug: 'gold', hex: '#eab308' }, { label: 'Rose Gold', slug: 'rose-gold', hex: '#e8a0bf' }, { label: 'Brown', slug: 'brown', hex: '#8b4513' }] },
      { id: 'attr-wa3', name: 'Dial Shape', slug: 'dial-shape', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Round', slug: 'round' }, { label: 'Square', slug: 'square' }, { label: 'Rectangular', slug: 'rectangular' }, { label: 'Oval', slug: 'oval' }] },
      { id: 'attr-wa4', name: 'Strap Material', slug: 'strap-material', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Leather', slug: 'leather' }, { label: 'Stainless Steel', slug: 'steel' }, { label: 'Silicone', slug: 'silicone' }, { label: 'Fabric', slug: 'fabric' }, { label: 'Rubber', slug: 'rubber' }] },
      { id: 'attr-wa5', name: 'Water Resistance', slug: 'water-resistance', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: '30m', slug: '30m' }, { label: '50m', slug: '50m' }, { label: '100m', slug: '100m' }, { label: '200m', slug: '200m' }] },
      { id: 'attr-wa6', name: 'Gender', slug: 'gender', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: false, placeholder: 'Select', values: [{ label: 'Men', slug: 'men' }, { label: 'Women', slug: 'women' }, { label: 'Unisex', slug: 'unisex' }] },
      { id: 'attr-wa7', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }, { label: 'International', slug: 'intl' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Bags & Travel
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'bags-travel',
    categoryName: 'Bags & Travel',
    categoryIcon: '🧳',
    subcategories: subs(['Backpacks', 'Handbags', 'Luggage', 'Travel Accessories', 'Laptop Bags', 'Duffel Bags', 'Wallets & Clutches', 'Waist Bags']),
    commissionRate: 12,
    hsnPrefix: '4202',
    gstRate: 18,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-bt1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Samsonite', slug: 'samsonite' }, { label: 'American Tourister', slug: 'american-tourister' }, { label: 'Wildcraft', slug: 'wildcraft' }, { label: 'Skybags', slug: 'skybags' }, { label: 'Safari', slug: 'safari' }, { label: 'Lavie', slug: 'lavie' }, { label: 'Hidesign', slug: 'hidesign' }] },
      { id: 'attr-bt2', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'Navy', slug: 'navy', hex: '#1e3a5f' }, { label: 'Brown', slug: 'brown', hex: '#8b4513' }, { label: 'Red', slug: 'red', hex: '#ef4444' }, { label: 'Grey', slug: 'grey', hex: '#6b7280' }] },
      { id: 'attr-bt3', name: 'Material', slug: 'material', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select material', values: [{ label: 'Polyester', slug: 'polyester' }, { label: 'Nylon', slug: 'nylon' }, { label: 'Leather', slug: 'leather' }, { label: 'Canvas', slug: 'canvas' }, { label: 'Polycarbonate', slug: 'polycarbonate' }] },
      { id: 'attr-bt4', name: 'Capacity', slug: 'capacity', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: '15-25L', slug: 'small' }, { label: '25-35L', slug: 'medium' }, { label: '35-50L', slug: 'large' }, { label: '50L+', slug: 'xl' }] },
      { id: 'attr-bt5', name: 'Laptop Compartment', slug: 'laptop-compartment', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-bt6', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '1 Year', slug: '1y' }, { label: '3 Years', slug: '3y' }, { label: '5 Years', slug: '5y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. Footwear
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'footwear',
    categoryName: 'Footwear',
    categoryIcon: '👟',
    subcategories: subs(["Men's Casual", "Men's Formal", "Women's Flats", "Women's Heels", 'Sports Shoes', 'Sandals & Slippers', "Kids' Shoes", 'Boots']),
    commissionRate: 15,
    hsnPrefix: '6404',
    gstRate: 18,
    variantAxes: ['size', 'color'],
    attributes: [
      { id: 'attr-fw1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Nike', slug: 'nike' }, { label: 'Adidas', slug: 'adidas' }, { label: 'Puma', slug: 'puma' }, { label: 'Bata', slug: 'bata' }, { label: 'Woodland', slug: 'woodland' }, { label: 'Skechers', slug: 'skechers' }, { label: 'Crocs', slug: 'crocs' }, { label: 'Clarks', slug: 'clarks' }] },
      { id: 'attr-fw2', name: 'Size (UK)', slug: 'size', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select size', values: [{ label: 'UK 5', slug: 'uk5' }, { label: 'UK 6', slug: 'uk6' }, { label: 'UK 7', slug: 'uk7' }, { label: 'UK 8', slug: 'uk8' }, { label: 'UK 9', slug: 'uk9' }, { label: 'UK 10', slug: 'uk10' }, { label: 'UK 11', slug: 'uk11' }, { label: 'UK 12', slug: 'uk12' }] },
      { id: 'attr-fw3', name: 'Color', slug: 'color', type: 'color', required: true, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'White', slug: 'white', hex: '#fff' }, { label: 'Brown', slug: 'brown', hex: '#8b4513' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }, { label: 'Red', slug: 'red', hex: '#ef4444' }] },
      { id: 'attr-fw4', name: 'Material', slug: 'material', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Leather', slug: 'leather' }, { label: 'Synthetic', slug: 'synthetic' }, { label: 'Canvas', slug: 'canvas' }, { label: 'Rubber', slug: 'rubber' }, { label: 'Mesh', slug: 'mesh' }] },
      { id: 'attr-fw5', name: 'Closure Type', slug: 'closure', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Lace-Up', slug: 'laceup' }, { label: 'Slip-On', slug: 'slipon' }, { label: 'Velcro', slug: 'velcro' }, { label: 'Buckle', slug: 'buckle' }, { label: 'Zip', slug: 'zip' }] },
      { id: 'attr-fw6', name: 'Gender', slug: 'gender', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: false, placeholder: 'Select', values: [{ label: 'Men', slug: 'men' }, { label: 'Women', slug: 'women' }, { label: 'Unisex', slug: 'unisex' }, { label: 'Kids', slug: 'kids' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. Computers & Accessories
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'computers',
    categoryName: 'Computers & Accessories',
    categoryIcon: '🖥️',
    subcategories: subs(['Desktops', 'Monitors', 'Keyboards & Mice', 'Printers', 'Routers', 'External Storage', 'PC Components', 'Software']),
    commissionRate: 8,
    hsnPrefix: '8471',
    gstRate: 18,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-co1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Dell', slug: 'dell' }, { label: 'HP', slug: 'hp' }, { label: 'Lenovo', slug: 'lenovo' }, { label: 'Asus', slug: 'asus' }, { label: 'Acer', slug: 'acer' }, { label: 'Apple', slug: 'apple' }, { label: 'Logitech', slug: 'logitech' }, { label: 'Corsair', slug: 'corsair' }] },
      { id: 'attr-co2', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'Silver', slug: 'silver', hex: '#c0c0c0' }, { label: 'White', slug: 'white', hex: '#fff' }] },
      { id: 'attr-co3', name: 'Processor', slug: 'processor', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select processor', values: [{ label: 'Intel i5', slug: 'i5' }, { label: 'Intel i7', slug: 'i7' }, { label: 'Intel i9', slug: 'i9' }, { label: 'AMD Ryzen 5', slug: 'r5' }, { label: 'AMD Ryzen 7', slug: 'r7' }, { label: 'AMD Ryzen 9', slug: 'r9' }, { label: 'Apple M3', slug: 'm3' }] },
      { id: 'attr-co4', name: 'RAM', slug: 'ram', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select RAM', values: [{ label: '4 GB', slug: '4gb' }, { label: '8 GB', slug: '8gb' }, { label: '16 GB', slug: '16gb' }, { label: '32 GB', slug: '32gb' }, { label: '64 GB', slug: '64gb' }] },
      { id: 'attr-co5', name: 'Storage', slug: 'storage', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: '256 GB SSD', slug: '256ssd' }, { label: '512 GB SSD', slug: '512ssd' }, { label: '1 TB SSD', slug: '1tbssd' }, { label: '1 TB HDD', slug: '1tbhdd' }, { label: '2 TB HDD', slug: '2tbhdd' }] },
      { id: 'attr-co6', name: 'Connectivity', slug: 'connectivity', type: 'multi_select', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'WiFi 6', slug: 'wifi6' }, { label: 'Bluetooth 5', slug: 'bt5' }, { label: 'USB-C', slug: 'usbc' }, { label: 'HDMI', slug: 'hdmi' }, { label: 'Thunderbolt', slug: 'thunderbolt' }] },
      { id: 'attr-co7', name: 'Warranty', slug: 'warranty', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '1 Year', slug: '1y' }, { label: '2 Years', slug: '2y' }, { label: '3 Years', slug: '3y' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Office Supplies
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'office-supplies',
    categoryName: 'Office Supplies',
    categoryIcon: '📎',
    subcategories: subs(['Writing Instruments', 'Paper Products', 'Filing & Organisation', 'Desk Accessories', 'Labels & Tapes', 'Presentation Supplies', 'Binding & Laminating', 'Break Room Supplies']),
    commissionRate: 8,
    hsnPrefix: '4820',
    gstRate: 12,
    variantAxes: ['color'],
    attributes: [
      { id: 'attr-of1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Cello', slug: 'cello' }, { label: 'Classmate', slug: 'classmate' }, { label: 'Faber-Castell', slug: 'faber-castell' }, { label: 'Staedtler', slug: 'staedtler' }, { label: 'Parker', slug: 'parker' }, { label: '3M', slug: '3m' }, { label: 'Scotch', slug: 'scotch' }] },
      { id: 'attr-of2', name: 'Color', slug: 'color', type: 'color', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Black', slug: 'black', hex: '#000' }, { label: 'Blue', slug: 'blue', hex: '#3b82f6' }, { label: 'Red', slug: 'red', hex: '#ef4444' }, { label: 'White', slug: 'white', hex: '#fff' }] },
      { id: 'attr-of3', name: 'Pack Size', slug: 'pack-size', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Single', slug: '1' }, { label: 'Pack of 5', slug: '5' }, { label: 'Pack of 10', slug: '10' }, { label: 'Pack of 20', slug: '20' }, { label: 'Box of 50', slug: '50' }, { label: 'Box of 100', slug: '100' }] },
      { id: 'attr-of4', name: 'Material', slug: 'material', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Paper', slug: 'paper' }, { label: 'Plastic', slug: 'plastic' }, { label: 'Metal', slug: 'metal' }, { label: 'Cardboard', slug: 'cardboard' }] },
      { id: 'attr-of5', name: 'Eco-Friendly', slug: 'eco-friendly', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. Pet Supplies
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'pet-supplies',
    categoryName: 'Pet Supplies',
    categoryIcon: '🐾',
    subcategories: subs(['Dog Food', 'Cat Food', 'Pet Toys', 'Grooming', 'Beds & Furniture', 'Collars & Leashes', 'Health & Wellness', 'Aquarium Supplies']),
    commissionRate: 10,
    hsnPrefix: '2309',
    gstRate: 18,
    variantAxes: [],
    attributes: [
      { id: 'attr-ps1', name: 'Brand', slug: 'brand', type: 'select', required: false, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Pedigree', slug: 'pedigree' }, { label: 'Royal Canin', slug: 'royal-canin' }, { label: 'Whiskas', slug: 'whiskas' }, { label: "Hill's Science", slug: 'hills' }, { label: 'Drools', slug: 'drools' }, { label: 'Farmina', slug: 'farmina' }] },
      { id: 'attr-ps2', name: 'Pet Type', slug: 'pet-type', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Dog', slug: 'dog' }, { label: 'Cat', slug: 'cat' }, { label: 'Bird', slug: 'bird' }, { label: 'Fish', slug: 'fish' }, { label: 'Small Pet', slug: 'small-pet' }] },
      { id: 'attr-ps3', name: 'Life Stage', slug: 'life-stage', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Puppy/Kitten', slug: 'young' }, { label: 'Adult', slug: 'adult' }, { label: 'Senior', slug: 'senior' }, { label: 'All Life Stages', slug: 'all' }] },
      { id: 'attr-ps4', name: 'Weight', slug: 'weight', type: 'text', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'e.g. 3 kg', values: [] },
      { id: 'attr-ps5', name: 'Vegetarian', slug: 'vegetarian', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-ps6', name: 'Expiry', slug: 'expiry', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '6 Months', slug: '6m' }, { label: '12 Months', slug: '12m' }, { label: '18 Months', slug: '18m' }] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Baby Care
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'baby-care',
    categoryName: 'Baby Care',
    categoryIcon: '👶',
    subcategories: subs(['Diapers', 'Baby Food', 'Bathing & Skincare', 'Clothing', 'Strollers & Carriers', 'Cribs & Bedding', 'Safety & Proofing', 'Feeding Bottles']),
    commissionRate: 10,
    hsnPrefix: '9619',
    gstRate: 12,
    variantAxes: ['size'],
    attributes: [
      { id: 'attr-bc1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Pampers', slug: 'pampers' }, { label: 'Huggies', slug: 'huggies' }, { label: 'MamyPoko', slug: 'mamypoko' }, { label: 'Chicco', slug: 'chicco' }, { label: 'Pigeon', slug: 'pigeon' }, { label: 'Johnson & Johnson', slug: 'jnj' }, { label: 'Himalaya', slug: 'himalaya' }] },
      { id: 'attr-bc2', name: 'Age Group', slug: 'age-group', type: 'select', required: true, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select age', values: [{ label: '0-3 Months', slug: '0-3m' }, { label: '3-6 Months', slug: '3-6m' }, { label: '6-12 Months', slug: '6-12m' }, { label: '1-2 Years', slug: '1-2y' }, { label: '2-3 Years', slug: '2-3y' }] },
      { id: 'attr-bc3', name: 'Size', slug: 'size', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select size', values: [{ label: 'NB (Newborn)', slug: 'nb' }, { label: 'S (Small)', slug: 's' }, { label: 'M (Medium)', slug: 'm' }, { label: 'L (Large)', slug: 'l' }, { label: 'XL', slug: 'xl' }, { label: 'XXL', slug: 'xxl' }] },
      { id: 'attr-bc4', name: 'Material', slug: 'material', type: 'select', required: false, filterable: true, searchable: false, showOnProduct: true, placeholder: 'Select', values: [{ label: 'Cotton', slug: 'cotton' }, { label: 'Organic Cotton', slug: 'organic-cotton' }, { label: 'Muslin', slug: 'muslin' }, { label: 'Bamboo', slug: 'bamboo' }] },
      { id: 'attr-bc5', name: 'Hypoallergenic', slug: 'hypoallergenic', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-bc6', name: 'BPA Free', slug: 'bpa-free', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. Grocery Essentials
  // ═══════════════════════════════════════════════════════════════════════════
  {
    categoryId: 'grocery-essentials',
    categoryName: 'Grocery Essentials',
    categoryIcon: '🛒',
    subcategories: subs(['Snacks & Beverages', 'Dry Fruits & Nuts', 'Cooking Essentials', 'Breakfast & Cereals', 'Packaged Foods', 'Personal Care', 'Cleaning & Household', 'Pet Food']),
    commissionRate: 5,
    hsnPrefix: '2106',
    gstRate: 5,
    variantAxes: [],
    attributes: [
      { id: 'attr-gr1', name: 'Brand', slug: 'brand', type: 'select', required: true, filterable: true, searchable: true, showOnProduct: true, placeholder: 'Select brand', values: [{ label: 'Tata', slug: 'tata' }, { label: 'Amul', slug: 'amul' }, { label: 'Nestlé', slug: 'nestle' }, { label: 'Britannia', slug: 'britannia' }, { label: 'ITC', slug: 'itc' }, { label: 'Haldirams', slug: 'haldirams' }, { label: 'MDH', slug: 'mdh' }, { label: 'Organic Tattva', slug: 'organic-tattva' }] },
      { id: 'attr-gr2', name: 'Weight/Volume', slug: 'weight-volume', type: 'text', required: true, filterable: false, searchable: false, showOnProduct: true, placeholder: 'e.g. 500g, 1L', values: [] },
      { id: 'attr-gr3', name: 'Vegetarian', slug: 'vegetarian', type: 'boolean', required: true, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-gr4', name: 'Organic', slug: 'organic', type: 'boolean', required: false, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-gr5', name: 'FSSAI Approved', slug: 'fssai', type: 'boolean', required: true, filterable: true, searchable: false, showOnProduct: true, values: [] },
      { id: 'attr-gr6', name: 'Shelf Life', slug: 'shelf-life', type: 'select', required: false, filterable: false, searchable: false, showOnProduct: true, values: [{ label: '3 Months', slug: '3m' }, { label: '6 Months', slug: '6m' }, { label: '12 Months', slug: '12m' }, { label: '18 Months', slug: '18m' }, { label: '24 Months', slug: '24m' }] },
      { id: 'attr-gr7', name: 'Diet Type', slug: 'diet-type', type: 'multi_select', required: false, filterable: true, searchable: false, showOnProduct: true, values: [{ label: 'Vegan', slug: 'vegan' }, { label: 'Gluten Free', slug: 'gluten-free' }, { label: 'Sugar Free', slug: 'sugar-free' }, { label: 'Keto Friendly', slug: 'keto' }, { label: 'High Protein', slug: 'high-protein' }] },
    ],
  },
];

// Helper: get category by ID
export function getCategoryById(id: string): CategoryAttributeSet | undefined {
  return CATEGORY_ATTRIBUTES.find(c => c.categoryId === id);
}

// Helper: get all category names for dropdown
export function getCategoryOptions(): { id: string; name: string; icon: string }[] {
  return CATEGORY_ATTRIBUTES.map(c => ({ id: c.categoryId, name: c.categoryName, icon: c.categoryIcon }));
}
