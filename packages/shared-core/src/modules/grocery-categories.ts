/**
 * KARTSEEK Grocery — Canonical Category Registry
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all grocery categories across:
 *   • Super Admin panel  (apps/web/src/app/admin/grocery/categories/)
 *   • Customer website   (apps/web/src/app/grocery/)
 *   • Seller portal      (apps/web/src/app/seller/grocery/)
 *   • Flutter app        (via GET /grocery/categories API endpoint)
 *
 * To propagate a category change across ALL platforms, edit only this file.
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface GrocerySubcategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  children?: GrocerySubcategory[];
}

export interface GroceryCategory {
  /** Unique slug-style identifier, used in URL paths and API responses */
  id: string;
  /** Display name shown on all surfaces */
  name: string;
  /** Emoji icon (fallback when no imageUrl) */
  emoji: string;
  /** Tailwind bg+text color class pair for category badges */
  color: string;
  /** Tailwind gradient classes for hero/banner cards */
  gradient: string;
  /** Short marketing description */
  description: string;
  /** Approximate product count shown in UI (synced periodically from products DB) */
  productCount: number;
  /**
   * Optional admin-configured image URL.
   * When set, rendered instead of emoji on all surfaces.
   * Supports CDN URLs. Default: undefined (use emoji).
   */
  imageUrl?: string;
  /**
   * Visibility status.
   * 'active'  → shown on all platforms
   * 'draft'   → hidden from customers, visible to admin/seller
   * 'archived'→ fully hidden
   */
  status: 'active' | 'draft' | 'archived';
  /** Full nested subcategory tree (used by seller product form cascader) */
  subcategories?: GrocerySubcategory[];
}

// ── Canonical 24-Category Registry ──────────────────────────────────────────

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  {
    id: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    emoji: '🥬',
    color: 'bg-green-100 text-green-700',
    gradient: 'from-green-600 to-emerald-500',
    description: 'Farm-fresh produce delivered daily',
    productCount: 240,
    status: 'active',
    subcategories: [
      {
        id: 'vegetables', name: 'Vegetables', slug: 'vegetables', icon: '🥦',
        children: [
          { id: 'leafy-greens', name: 'Leafy Greens', slug: 'leafy-greens' },
          { id: 'root-vegetables', name: 'Root Vegetables', slug: 'root-vegetables' },
          { id: 'gourds', name: 'Gourds & Squash', slug: 'gourds' },
          { id: 'exotic-vegetables', name: 'Exotic Vegetables', slug: 'exotic-vegetables' },
          { id: 'onion-tomato-potato', name: 'Onion, Tomato & Potato', slug: 'onion-tomato-potato' },
        ],
      },
      {
        id: 'fruits', name: 'Fruits', slug: 'fruits', icon: '🍎',
        children: [
          { id: 'seasonal-fruits', name: 'Seasonal Fruits', slug: 'seasonal-fruits' },
          { id: 'citrus-fruits', name: 'Citrus Fruits', slug: 'citrus-fruits' },
          { id: 'berries', name: 'Berries', slug: 'berries' },
          { id: 'tropical-fruits', name: 'Tropical Fruits', slug: 'tropical-fruits' },
          { id: 'imported-fruits', name: 'Imported Fruits', slug: 'imported-fruits' },
        ],
      },
    ],
  },
  {
    id: 'fresh-meat',
    name: 'Fresh Meat',
    emoji: '🥩',
    color: 'bg-red-100 text-red-700',
    gradient: 'from-red-600 to-rose-500',
    description: 'Premium quality, hygienically processed',
    productCount: 120,
    status: 'active',
    subcategories: [
      {
        id: 'chicken', name: 'Chicken', slug: 'chicken', icon: '🐔',
        children: [
          { id: 'whole-chicken', name: 'Whole Chicken', slug: 'whole-chicken' },
          { id: 'chicken-breast', name: 'Chicken Breast', slug: 'chicken-breast' },
          { id: 'chicken-curry-cut', name: 'Chicken Curry Cut', slug: 'chicken-curry-cut' },
          { id: 'chicken-wings', name: 'Chicken Wings', slug: 'chicken-wings' },
          { id: 'chicken-INema', name: 'Chicken Keema', slug: 'chicken-INema' },
        ],
      },
      {
        id: 'mutton', name: 'Mutton & Lamb', slug: 'mutton',
        children: [
          { id: 'mutton-curry-cut', name: 'Mutton Curry Cut', slug: 'mutton-curry-cut' },
          { id: 'mutton-keema', name: 'Mutton Keema', slug: 'mutton-keema' },
          { id: 'lamb-chops', name: 'Lamb Chops', slug: 'lamb-chops' },
        ],
      },
      {
        id: 'beef', name: 'Beef', slug: 'beef',
        children: [
          { id: 'beef-steak', name: 'Beef Steak', slug: 'beef-steak' },
          { id: 'beef-mince', name: 'Beef Mince', slug: 'beef-mince' },
          { id: 'beef-curry-cut', name: 'Beef Curry Cut', slug: 'beef-curry-cut' },
        ],
      },
    ],
  },
  {
    id: 'fresh-fish',
    name: 'Fresh Fish',
    emoji: '🐟',
    color: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-600 to-cyan-500',
    description: 'Coastal catch, delivered on ice',
    productCount: 85,
    status: 'active',
    subcategories: [
      {
        id: 'seafood', name: 'Seafood & Fish', slug: 'seafood', icon: '🦐',
        children: [
          { id: 'fresh-fish-varieties', name: 'Fresh Fish', slug: 'fresh-fish-varieties' },
          { id: 'prawns', name: 'Prawns & Shrimp', slug: 'prawns' },
          { id: 'crab', name: 'Crab', slug: 'crab' },
          { id: 'squid', name: 'Squid & Calamari', slug: 'squid' },
          { id: 'lobster', name: 'Lobster', slug: 'lobster' },
        ],
      },
    ],
  },
  {
    id: 'dairy-bread-eggs',
    name: 'Dairy, Bread & Eggs',
    emoji: '🥛',
    color: 'bg-yellow-100 text-yellow-700',
    gradient: 'from-yellow-500 to-amber-400',
    description: 'Farm-fresh dairy and bakery',
    productCount: 180,
    status: 'active',
    subcategories: [
      {
        id: 'milk-sub', name: 'Milk', slug: 'milk',
        children: [
          { id: 'full-cream-milk', name: 'Full Cream Milk', slug: 'full-cream-milk' },
          { id: 'toned-milk', name: 'Toned Milk', slug: 'toned-milk' },
          { id: 'plant-milk', name: 'Plant-Based Milk', slug: 'plant-milk' },
        ],
      },
      {
        id: 'cheese-sub', name: 'Cheese & Paneer', slug: 'cheese',
        children: [
          { id: 'cheddar', name: 'Cheddar', slug: 'cheddar' },
          { id: 'mozzarella', name: 'Mozzarella', slug: 'mozzarella' },
          { id: 'paneer', name: 'Paneer', slug: 'paneer' },
          { id: 'cream-cheese', name: 'Cream Cheese', slug: 'cream-cheese' },
        ],
      },
      {
        id: 'yogurt-sub', name: 'Yogurt & Curd', slug: 'yogurt',
        children: [
          { id: 'plain-curd', name: 'Plain Curd', slug: 'plain-curd' },
          { id: 'greek-yogurt', name: 'Greek Yogurt', slug: 'greek-yogurt' },
          { id: 'flavored-yogurt', name: 'Flavored Yogurt', slug: 'flavored-yogurt' },
        ],
      },
      { id: 'butter-ghee-sub', name: 'Butter & Ghee', slug: 'butter-ghee' },
      { id: 'eggs-sub', name: 'Eggs', slug: 'eggs' },
      { id: 'bread-sub', name: 'Bread & Buns', slug: 'bread' },
    ],
  },
  {
    id: 'rice-flour-pulses',
    name: 'Rice, Flour & Pulses',
    emoji: '🌾',
    color: 'bg-amber-100 text-amber-700',
    gradient: 'from-amber-600 to-orange-500',
    description: 'Staples for every kitchen',
    productCount: 150,
    status: 'active',
    subcategories: [
      {
        id: 'rice-sub', name: 'Rice', slug: 'rice',
        children: [
          { id: 'basmati-rice', name: 'Basmati Rice', slug: 'basmati-rice' },
          { id: 'brown-rice', name: 'Brown Rice', slug: 'brown-rice' },
          { id: 'sona-masoori', name: 'Sona Masoori', slug: 'sona-masoori' },
          { id: 'parboiled-rice', name: 'Parboiled Rice', slug: 'parboiled-rice' },
        ],
      },
      {
        id: 'flour-sub', name: 'Flour & Atta', slug: 'flour',
        children: [
          { id: 'wheat-flour', name: 'Wheat Flour', slug: 'wheat-flour' },
          { id: 'multigrain-atta', name: 'Multigrain Atta', slug: 'multigrain-atta' },
          { id: 'besan', name: 'Besan (Gram Flour)', slug: 'besan' },
          { id: 'maida', name: 'Maida', slug: 'maida' },
          { id: 'ragi-flour', name: 'Ragi Flour', slug: 'ragi-flour' },
        ],
      },
      {
        id: 'pulses-sub', name: 'Pulses & Lentils', slug: 'pulses',
        children: [
          { id: 'toor-dal', name: 'Toor Dal', slug: 'toor-dal' },
          { id: 'moong-dal', name: 'Moong Dal', slug: 'moong-dal' },
          { id: 'chana-dal', name: 'Chana Dal', slug: 'chana-dal' },
          { id: 'masoor-dal', name: 'Masoor Dal', slug: 'masoor-dal' },
          { id: 'rajma', name: 'Rajma', slug: 'rajma' },
          { id: 'chickpeas', name: 'Chickpeas', slug: 'chickpeas' },
        ],
      },
    ],
  },
  {
    id: 'cooking-oil-ghee',
    name: 'Cooking Oil & Ghee',
    emoji: '🫒',
    color: 'bg-lime-100 text-lime-700',
    gradient: 'from-lime-600 to-green-500',
    description: 'Pure oils and premium ghee',
    productCount: 65,
    status: 'active',
    subcategories: [
      {
        id: 'cooking-oils-sub', name: 'Cooking Oils', slug: 'cooking-oils',
        children: [
          { id: 'sunflower-oil', name: 'Sunflower Oil', slug: 'sunflower-oil' },
          { id: 'mustard-oil', name: 'Mustard Oil', slug: 'mustard-oil' },
          { id: 'olive-oil', name: 'Olive Oil', slug: 'olive-oil' },
          { id: 'coconut-oil', name: 'Coconut Oil', slug: 'coconut-oil' },
          { id: 'groundnut-oil', name: 'Groundnut Oil', slug: 'groundnut-oil' },
        ],
      },
      { id: 'ghee-sub', name: 'Ghee & Butter', slug: 'ghee' },
    ],
  },
  {
    id: 'masala-spices',
    name: 'Masala & Spices',
    emoji: '🌶️',
    color: 'bg-orange-100 text-orange-700',
    gradient: 'from-orange-600 to-red-500',
    description: 'Authentic flavors for every dish',
    productCount: 110,
    status: 'active',
    subcategories: [
      {
        id: 'spices-sub', name: 'Spices & Masala', slug: 'spices',
        children: [
          { id: 'whole-spices', name: 'Whole Spices', slug: 'whole-spices' },
          { id: 'ground-spices', name: 'Ground Spices', slug: 'ground-spices' },
          { id: 'blended-masalas', name: 'Blended Masalas', slug: 'blended-masalas' },
          { id: 'herbs', name: 'Herbs', slug: 'herbs' },
        ],
      },
      { id: 'salt-sugar-sub', name: 'Salt, Sugar & Jaggery', slug: 'salt-sugar' },
    ],
  },
  {
    id: 'snacks-packaged',
    name: 'Snacks & Packaged Food',
    emoji: '🍪',
    color: 'bg-purple-100 text-purple-700',
    gradient: 'from-purple-600 to-violet-500',
    description: 'Munchies, biscuits, and namkeen',
    productCount: 320,
    status: 'active',
    subcategories: [
      { id: 'chips-crisps', name: 'Chips & Crisps', slug: 'chips-crisps' },
      { id: 'namkeen', name: 'Namkeen & Mixtures', slug: 'namkeen' },
      { id: 'biscuits', name: 'Biscuits & Cookies', slug: 'biscuits' },
      { id: 'instant-noodles', name: 'Instant Noodles & Pasta', slug: 'instant-noodles' },
      { id: 'breakfast-cereals', name: 'Breakfast Cereals', slug: 'breakfast-cereals' },
    ],
  },
  {
    id: 'beverages',
    name: 'Beverages',
    emoji: '☕',
    color: 'bg-amber-100 text-amber-700',
    gradient: 'from-amber-600 to-orange-500',
    description: 'Tea, coffee, juices, and more',
    productCount: 190,
    status: 'active',
    subcategories: [
      { id: 'tea-sub', name: 'Tea', slug: 'tea' },
      { id: 'coffee-sub', name: 'Coffee', slug: 'coffee' },
      { id: 'juices-sub', name: 'Juices & Drinks', slug: 'juices' },
      { id: 'soft-drinks-sub', name: 'Soft Drinks', slug: 'soft-drinks' },
      { id: 'water-sub', name: 'Water', slug: 'water' },
      { id: 'energy-drinks-sub', name: 'Energy Drinks', slug: 'energy-drinks' },
    ],
  },
  {
    id: 'frozen-food',
    name: 'Frozen Food',
    emoji: '🧊',
    color: 'bg-cyan-100 text-cyan-700',
    gradient: 'from-cyan-600 to-sky-500',
    description: 'Ready-to-cook meals and ice cream',
    productCount: 95,
    status: 'active',
    subcategories: [
      { id: 'frozen-veggies', name: 'Frozen Vegetables', slug: 'frozen-veggies' },
      { id: 'frozen-snacks', name: 'Frozen Snacks', slug: 'frozen-snacks' },
      { id: 'frozen-meat', name: 'Frozen Meat & Seafood', slug: 'frozen-meat' },
      { id: 'ice-cream', name: 'Ice Cream', slug: 'ice-cream' },
      { id: 'frozen-ready-meals', name: 'Ready Meals', slug: 'frozen-ready-meals' },
    ],
  },
  {
    id: 'bakery',
    name: 'Bakery',
    emoji: '🥐',
    color: 'bg-orange-100 text-orange-600',
    gradient: 'from-orange-500 to-amber-400',
    description: 'Fresh bread, cakes, and pastries',
    productCount: 75,
    status: 'active',
    subcategories: [
      {
        id: 'bread-bakery', name: 'Bread', slug: 'bread-bakery',
        children: [
          { id: 'white-bread', name: 'White Bread', slug: 'white-bread' },
          { id: 'brown-bread', name: 'Brown Bread', slug: 'brown-bread' },
          { id: 'multigrain-bread', name: 'Multigrain Bread', slug: 'multigrain-bread' },
          { id: 'pita-bread', name: 'Pita Bread', slug: 'pita-bread' },
        ],
      },
      {
        id: 'cakes-pastries', name: 'Cakes & Pastries', slug: 'cakes-pastries',
        children: [
          { id: 'fresh-cakes', name: 'Fresh Cakes', slug: 'fresh-cakes' },
          { id: 'pastries', name: 'Pastries', slug: 'pastries' },
          { id: 'cookies-biscuits', name: 'Cookies & Biscuits', slug: 'cookies-biscuits' },
        ],
      },
      { id: 'buns-rolls', name: 'Buns & Rolls', slug: 'buns-rolls' },
    ],
  },
  {
    id: 'breakfast',
    name: 'Breakfast Items',
    emoji: '🥣',
    color: 'bg-yellow-100 text-yellow-600',
    gradient: 'from-yellow-500 to-orange-400',
    description: 'Cereals, oats, cornflakes, and more',
    productCount: 80,
    status: 'active',
    subcategories: [
      { id: 'cereals', name: 'Cereals & Oats', slug: 'cereals' },
      { id: 'spreads', name: 'Spreads & Jams', slug: 'spreads' },
      { id: 'cornflakes', name: 'Cornflakes & Muesli', slug: 'cornflakes' },
    ],
  },
  {
    id: 'household-cleaning',
    name: 'Household Cleaning',
    emoji: '🧹',
    color: 'bg-teal-100 text-teal-700',
    gradient: 'from-teal-600 to-emerald-500',
    description: 'Detergents, cleaners, and supplies',
    productCount: 140,
    status: 'active',
    subcategories: [
      { id: 'detergents', name: 'Detergents & Laundry', slug: 'detergents' },
      { id: 'dishwash', name: 'Dishwash', slug: 'dishwash' },
      { id: 'floor-cleaners', name: 'Floor & Surface Cleaners', slug: 'floor-cleaners' },
      { id: 'toilet-cleaners', name: 'Toilet Cleaners', slug: 'toilet-cleaners' },
      { id: 'fresheners', name: 'Air Fresheners', slug: 'fresheners' },
      { id: 'kitchen-essentials', name: 'Kitchen Essentials', slug: 'kitchen-essentials' },
    ],
  },
  {
    id: 'personal-care',
    name: 'Personal Care',
    emoji: '🧴',
    color: 'bg-pink-100 text-pink-700',
    gradient: 'from-pink-500 to-rose-400',
    description: 'Skincare, haircare, and grooming',
    productCount: 210,
    status: 'active',
    subcategories: [
      { id: 'hair-care', name: 'Hair Care', slug: 'hair-care' },
      { id: 'skin-care', name: 'Skin Care', slug: 'skin-care' },
      { id: 'oral-care', name: 'Oral Care', slug: 'oral-care' },
      { id: 'bath-body', name: 'Bath & Body', slug: 'bath-body' },
      { id: 'deodorants', name: 'Deodorants & Fragrances', slug: 'deodorants' },
      { id: 'feminine-hygiene', name: 'Feminine Hygiene', slug: 'feminine-hygiene' },
    ],
  },
  {
    id: 'baby-care',
    name: 'Baby Care',
    emoji: '👶',
    color: 'bg-pink-100 text-pink-600',
    gradient: 'from-pink-500 to-rose-400',
    description: 'Diapers, food, and essentials',
    productCount: 90,
    status: 'active',
    subcategories: [
      { id: 'diapers', name: 'Diapers & Wipes', slug: 'diapers' },
      { id: 'baby-food', name: 'Baby Food & Formula', slug: 'baby-food' },
      { id: 'baby-skin-care', name: 'Baby Skin Care', slug: 'baby-skin-care' },
      { id: 'baby-accessories', name: 'Baby Accessories', slug: 'baby-accessories' },
    ],
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    emoji: '🐾',
    color: 'bg-amber-100 text-amber-600',
    gradient: 'from-amber-500 to-yellow-400',
    description: 'Food, toys, and accessories',
    productCount: 60,
    status: 'active',
    subcategories: [
      { id: 'dog-food', name: 'Dog Food', slug: 'dog-food' },
      { id: 'cat-food', name: 'Cat Food', slug: 'cat-food' },
      { id: 'pet-treats', name: 'Pet Treats', slug: 'pet-treats' },
      { id: 'pet-accessories', name: 'Pet Accessories', slug: 'pet-accessories' },
    ],
  },
  {
    id: 'organic',
    name: 'Organic Products',
    emoji: '🌱',
    color: 'bg-emerald-100 text-emerald-700',
    gradient: 'from-emerald-600 to-green-500',
    description: 'Certified organic and natural',
    productCount: 110,
    status: 'active',
    subcategories: [
      { id: 'organic-produce', name: 'Organic Produce', slug: 'organic-produce' },
      { id: 'organic-grains', name: 'Organic Grains', slug: 'organic-grains' },
      { id: 'health-foods', name: 'Health Foods', slug: 'health-foods' },
    ],
  },
  {
    id: 'international-foods',
    name: 'International Foods',
    emoji: '🌍',
    color: 'bg-indigo-100 text-indigo-700',
    gradient: 'from-indigo-600 to-violet-500',
    description: 'Thai, Korean, Italian, and more',
    productCount: 70,
    status: 'active',
    subcategories: [
      { id: 'asian-foods', name: 'Asian Foods', slug: 'asian-foods' },
      { id: 'european-foods', name: 'European Foods', slug: 'european-foods' },
      { id: 'middle-eastern', name: 'Middle Eastern', slug: 'middle-eastern' },
    ],
  },
  {
    id: 'stationery-home',
    name: 'Stationery & Home Basics',
    emoji: '📎',
    color: 'bg-slate-100 text-slate-700',
    gradient: 'from-slate-600 to-gray-500',
    description: 'Pens, paper, batteries, and basics',
    productCount: 55,
    status: 'draft',
    subcategories: [
      { id: 'stationery', name: 'Stationery', slug: 'stationery' },
      { id: 'batteries-bulbs', name: 'Batteries & Bulbs', slug: 'batteries-bulbs' },
    ],
  },
  {
    id: 'ready-to-cook',
    name: 'Ready-to-Cook',
    emoji: '🍳',
    color: 'bg-orange-100 text-orange-700',
    gradient: 'from-orange-600 to-amber-500',
    description: 'Marinated, pre-cut & ready to cook',
    productCount: 65,
    status: 'active',
    subcategories: [
      { id: 'marinated-meats', name: 'Marinated Meats', slug: 'marinated-meats' },
      { id: 'pre-cut-veggies', name: 'Pre-cut Vegetables', slug: 'pre-cut-veggies' },
      { id: 'meal-kits', name: 'Meal Kits', slug: 'meal-kits' },
    ],
  },
  {
    id: 'dry-fruits-nuts',
    name: 'Dry Fruits & Nuts',
    emoji: '🥜',
    color: 'bg-amber-100 text-amber-700',
    gradient: 'from-amber-700 to-orange-500',
    description: 'Premium almonds, cashews, walnuts & more',
    productCount: 80,
    status: 'active',
    subcategories: [
      { id: 'nuts-sub', name: 'Nuts', slug: 'nuts' },
      { id: 'dry-fruits-sub', name: 'Dry Fruits', slug: 'dry-fruits' },
      { id: 'seeds', name: 'Seeds', slug: 'seeds' },
      { id: 'trail-mixes', name: 'Trail Mixes', slug: 'trail-mixes' },
    ],
  },
  {
    id: 'chocolates-sweets',
    name: 'Chocolates & Sweets',
    emoji: '🍫',
    color: 'bg-yellow-100 text-yellow-800',
    gradient: 'from-yellow-800 to-amber-600',
    description: 'Cadbury, Ferrero, Indian mithai & more',
    productCount: 120,
    status: 'active',
    subcategories: [
      { id: 'chocolates-sub', name: 'Chocolates', slug: 'chocolates' },
      { id: 'candies', name: 'Candies & Gummies', slug: 'candies' },
      { id: 'indian-sweets', name: 'Indian Sweets (Mithai)', slug: 'indian-sweets' },
    ],
  },
  {
    id: 'tea-coffee-health',
    name: 'Tea, Coffee & Health Drinks',
    emoji: '🍵',
    color: 'bg-green-100 text-green-800',
    gradient: 'from-green-800 to-emerald-600',
    description: 'Premium teas, artisan coffee & health drinks',
    productCount: 90,
    status: 'active',
    subcategories: [
      { id: 'teas', name: 'Teas', slug: 'teas' },
      { id: 'coffees', name: 'Coffees', slug: 'coffees' },
      { id: 'health-drinks-sub', name: 'Health Drinks', slug: 'health-drinks' },
    ],
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    emoji: '💊',
    color: 'bg-teal-100 text-teal-700',
    gradient: 'from-teal-600 to-cyan-500',
    description: 'Vitamins, supplements & wellness products',
    productCount: 85,
    status: 'active',
    subcategories: [
      { id: 'vitamins', name: 'Vitamins & Supplements', slug: 'vitamins' },
      { id: 'protein', name: 'Protein & Fitness', slug: 'protein' },
      { id: 'ayurvedic', name: 'Ayurvedic & Herbal', slug: 'ayurvedic' },
      { id: 'first-aid', name: 'First Aid', slug: 'first-aid' },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** All active categories (shown on customer-facing surfaces) */
export const ACTIVE_GROCERY_CATEGORIES = GROCERY_CATEGORIES.filter(
  (c) => c.status === 'active',
);

/** Find a top-level category by ID */
export function findCategoryById(id: string): GroceryCategory | undefined {
  return GROCERY_CATEGORIES.find((c) => c.id === id);
}

/** Find a subcategory anywhere in the tree */
export function findSubcategoryById(
  id: string,
  nodes?: GrocerySubcategory[],
): GrocerySubcategory | undefined {
  const list = nodes ?? GROCERY_CATEGORIES.flatMap((c) => c.subcategories ?? []);
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findSubcategoryById(id, node.children);
      if (found) return found;
    }
  }
  return undefined;
}

/** Flatten the entire subcategory tree for a given category into a searchable list */
export function flattenSubcategories(
  subcategories: GrocerySubcategory[],
  parentId?: string,
  depth = 0,
): Array<GrocerySubcategory & { parentId?: string; depth: number }> {
  const result: Array<GrocerySubcategory & { parentId?: string; depth: number }> = [];
  for (const sub of subcategories) {
    result.push({ ...sub, parentId, depth });
    if (sub.children) {
      result.push(...flattenSubcategories(sub.children, sub.id, depth + 1));
    }
  }
  return result;
}

/**
 * Serialize categories to the lightweight format expected by the Flutter app API.
 * Strips subcategories (those are fetched separately per-category).
 */
export function categoriesToApiResponse() {
  return ACTIVE_GROCERY_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    gradient: c.gradient,
    description: c.description,
    productCount: c.productCount,
    imageUrl: c.imageUrl ?? null,
    subcategoryCount: (c.subcategories ?? []).length,
  }));
}

/**
 * Serialize a single category with full subcategory tree (for Flutter category detail).
 */
export function categoryToDetailResponse(id: string) {
  const cat = findCategoryById(id);
  if (!cat) return null;
  return {
    id: cat.id,
    name: cat.name,
    emoji: cat.emoji,
    gradient: cat.gradient,
    description: cat.description,
    productCount: cat.productCount,
    imageUrl: cat.imageUrl ?? null,
    subcategories: cat.subcategories ?? [],
  };
}
