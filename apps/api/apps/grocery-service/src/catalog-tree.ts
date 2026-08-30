/**
 * The grocery master taxonomy: Department → Category → Sub-Category.
 *
 * Authored here rather than in the database because it is editorial, not
 * operational — sellers cannot create or rename any of it (every taxonomy route
 * is `@Roles(ADMIN, SUPER_ADMIN)`, verified: a seller token gets 403 on create,
 * edit and rebuild). Changing the catalogue is a code review, not a form.
 *
 * `countries` scopes a node to specific markets. Omitted means every market —
 * which is the common case, because a shopper in London and one in Doha both
 * buy milk. It is set only where a category genuinely does not travel, so the
 * same taxonomy serves India, the GCC, the UK and the USA without forcing any
 * of them into another market's shape.
 *
 * Ids are derived, not written: a slug of the name, namespaced by its parent,
 * so two departments can both have "Chicken" without colliding.
 */

/** Markets where a seller can be onboarded — mirrors `SellerCountryCode` on the web. */
export const ALL_MARKETS = ['IN', 'QA', 'AE', 'SA', 'BH', 'KW', 'OM', 'GB', 'US'] as const;
export const GCC = ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'] as const;
/** The Gulf plus India — where South Asian staples have a mainstream aisle. */
export const GCC_AND_INDIA = ['IN', ...GCC] as const;

export interface TaxonomyNode {
  name: string;
  /** Restrict to these markets. Absent = available everywhere. */
  countries?: readonly string[];
  children?: TaxonomyNode[];
}

const sub = (...names: string[]): TaxonomyNode[] => names.map((name) => ({ name }));

export const GROCERY_TAXONOMY: TaxonomyNode[] = [
  {
    name: 'Fruits & Vegetables',
    children: [
      { name: 'Fresh Fruits', children: sub('Apples', 'Bananas', 'Oranges', 'Mangoes', 'Grapes', 'Berries', 'Melons', 'Citrus') },
      { name: 'Fresh Vegetables', children: sub('Potatoes', 'Onions', 'Tomatoes', 'Carrots', 'Cucumbers', 'Peppers', 'Broccoli') },
      { name: 'Leafy Greens', children: sub('Spinach', 'Lettuce', 'Kale', 'Coriander', 'Mint') },
      { name: 'Herbs', children: sub('Basil', 'Parsley', 'Rosemary', 'Thyme') },
      { name: 'Exotic Produce', children: sub('Avocado', 'Dragon Fruit', 'Kiwi', 'Asparagus') },
      { name: 'Cut & Ready-to-Eat', children: sub('Cut Fruits', 'Cut Vegetables', 'Salad Mixes') },
    ],
  },
  {
    name: 'Dairy & Eggs',
    children: [
      { name: 'Milk', children: sub('Full Cream', 'Low Fat', 'Skimmed', 'Lactose-Free', 'Plant-Based') },
      { name: 'Yogurt', children: sub('Plain', 'Greek', 'Flavored', 'Drinking Yogurt') },
      { name: 'Cheese', children: sub('Cheddar', 'Mozzarella', 'Feta', 'Cream Cheese', 'Sliced Cheese') },
      { name: 'Butter & Margarine', children: sub('Butter', 'Salted Butter', 'Unsalted Butter', 'Margarine') },
      { name: 'Cream', children: sub('Fresh Cream', 'Whipping Cream', 'Cooking Cream') },
      { name: 'Eggs', children: sub('White Eggs', 'Brown Eggs', 'Free-Range', 'Organic', 'Quail Eggs') },
    ],
  },
  {
    name: 'Meat & Poultry',
    children: [
      { name: 'Chicken', children: sub('Whole Chicken', 'Breast', 'Thigh', 'Wings', 'Mince') },
      { name: 'Mutton & Lamb', children: sub('Chops', 'Leg', 'Shoulder', 'Mince', 'Cubes') },
      // Beef is not sold in the Indian grocery catalogue.
      { name: 'Beef', countries: [...GCC, 'GB', 'US'], children: sub('Steak', 'Mince', 'Cubes', 'Roast') },
      { name: 'Turkey', children: sub('Whole Turkey', 'Breast', 'Slices') },
      { name: 'Processed Meat', children: sub('Sausages', 'Salami', 'Ham', 'Nuggets', 'Meatballs') },
      { name: 'Fresh Meat', children: sub('Fresh Cuts', 'Minced Meat', 'Offal') },
    ],
  },
  {
    name: 'Fish & Seafood',
    children: [
      { name: 'Fresh Fish', children: sub('Salmon', 'Tuna', 'Sardines', 'Tilapia', 'Hammour') },
      { name: 'Frozen Fish', children: sub('Fillets', 'Whole Fish', 'Fish Portions') },
      { name: 'Shellfish', children: sub('Shrimp', 'Prawns', 'Crab', 'Lobster') },
      { name: 'Mollusks', children: sub('Squid', 'Mussels', 'Oysters') },
      { name: 'Processed Seafood', children: sub('Fish Fingers', 'Fish Balls', 'Seafood Mix') },
    ],
  },
  {
    name: 'Bakery & Bread',
    children: [
      { name: 'Bread', children: sub('White Bread', 'Brown Bread', 'Multigrain', 'Whole Wheat') },
      { name: 'Buns & Rolls', children: sub('Burger Buns', 'Hot Dog Buns', 'Dinner Rolls') },
      { name: 'Cakes', children: sub('Birthday Cakes', 'Sponge Cakes', 'Cheesecake') },
      { name: 'Pastries', children: sub('Croissants', 'Danish', 'Muffins', 'Donuts') },
      { name: 'Biscuits & Cookies', children: sub('Cookies', 'Crackers', 'Wafers') },
    ],
  },
  {
    name: 'Rice, Grains & Pulses',
    children: [
      { name: 'Rice', children: sub('Basmati', 'Sona Masoori', 'Brown Rice', 'Jasmine Rice') },
      { name: 'Flour', children: sub('Wheat Flour', 'All-Purpose Flour', 'Rice Flour', 'Corn Flour') },
      { name: 'Pulses', children: sub('Lentils', 'Chickpeas', 'Kidney Beans', 'Black Beans') },
      { name: 'Grains', children: sub('Oats', 'Quinoa', 'Barley', 'Millet') },
      { name: 'Semolina', children: sub('Fine', 'Coarse', 'Roasted') },
    ],
  },
  {
    name: 'Cooking Essentials',
    children: [
      { name: 'Cooking Oil', children: sub('Sunflower', 'Canola', 'Olive', 'Coconut', 'Sesame') },
      { name: 'Ghee', countries: GCC_AND_INDIA, children: sub('Cow Ghee', 'Buffalo Ghee', 'Clarified Butter') },
      { name: 'Vinegar', children: sub('White Vinegar', 'Apple Cider', 'Balsamic') },
      { name: 'Sauces', children: sub('Soy Sauce', 'Tomato Sauce', 'Chili Sauce', 'BBQ Sauce') },
      { name: 'Pastes', children: sub('Ginger Paste', 'Garlic Paste', 'Curry Paste') },
    ],
  },
  {
    name: 'Spices & Seasonings',
    children: [
      { name: 'Whole Spices', children: sub('Cardamom', 'Cinnamon', 'Cloves', 'Pepper', 'Cumin') },
      { name: 'Ground Spices', children: sub('Turmeric', 'Chili', 'Coriander', 'Cumin Powder') },
      { name: 'Spice Blends', children: sub('Garam Masala', 'Curry Powder', 'Biryani Masala') },
      { name: 'Salt', children: sub('Table Salt', 'Sea Salt', 'Rock Salt', 'Himalayan Salt') },
      { name: 'Seasonings', children: sub('Mixed Herbs', 'Pepper Mix', 'BBQ Seasoning') },
    ],
  },
  {
    name: 'Breakfast & Cereals',
    children: [
      { name: 'Cereals', children: sub('Corn Flakes', 'Muesli', 'Granola', 'Bran') },
      { name: 'Oats', children: sub('Rolled', 'Instant', 'Steel-Cut') },
      { name: 'Breakfast Spreads', children: sub('Peanut Butter', 'Chocolate Spread', 'Jam', 'Honey') },
      { name: 'Pancake & Baking Mix', children: sub('Pancake Mix', 'Waffle Mix') },
    ],
  },
  {
    name: 'Snacks & Confectionery',
    children: [
      { name: 'Chips', children: sub('Potato Chips', 'Tortilla Chips', 'Corn Chips') },
      { name: 'Nuts', children: sub('Almonds', 'Cashews', 'Pistachios', 'Walnuts') },
      { name: 'Seeds', children: sub('Sunflower', 'Pumpkin', 'Chia', 'Flax') },
      { name: 'Chocolate', children: sub('Bars', 'Boxes', 'Dark Chocolate', 'Milk Chocolate') },
      { name: 'Candy', children: sub('Gummies', 'Lollipops', 'Toffees') },
      { name: 'Popcorn', children: sub('Microwave', 'Ready-to-Eat') },
    ],
  },
  {
    name: 'Beverages',
    children: [
      { name: 'Water', children: sub('Mineral Water', 'Spring Water', 'Sparkling Water') },
      { name: 'Soft Drinks', children: sub('Cola', 'Lemon-Lime', 'Orange') },
      { name: 'Juices', children: sub('Orange', 'Apple', 'Mango', 'Mixed Fruit') },
      { name: 'Energy Drinks', children: sub('Energy Drinks', 'Sports Drinks') },
      { name: 'Tea', children: sub('Black Tea', 'Green Tea', 'Herbal Tea') },
      { name: 'Coffee', children: sub('Instant', 'Ground', 'Beans', 'Capsules') },
      { name: 'Malt & Health Drinks', children: sub('Malt Drinks', 'Cocoa Drinks') },
    ],
  },
  {
    name: 'Frozen Foods',
    children: [
      { name: 'Frozen Vegetables', children: sub('Peas', 'Mixed Vegetables', 'Corn') },
      { name: 'Frozen Fruits', children: sub('Berries', 'Mango', 'Mixed Fruits') },
      { name: 'Frozen Meat', children: sub('Chicken', 'Beef', 'Mutton') },
      { name: 'Frozen Seafood', children: sub('Fish', 'Shrimp', 'Seafood Mix') },
      { name: 'Ready Meals', children: sub('Pizza', 'Burgers', 'Pasta', 'Meals') },
      { name: 'Frozen Desserts', children: sub('Ice Cream', 'Frozen Yogurt') },
    ],
  },
  {
    name: 'Canned & Packaged Foods',
    children: [
      { name: 'Canned Vegetables', children: sub('Corn', 'Peas', 'Beans') },
      { name: 'Canned Fruits', children: sub('Pineapple', 'Peaches', 'Mixed Fruit') },
      { name: 'Canned Meat', children: sub('Tuna', 'Chicken', 'Beef') },
      { name: 'Canned Beans & Pulses', children: sub('Chickpeas', 'Kidney Beans') },
      { name: 'Packaged Meals', children: sub('Instant Meals', 'Ready-to-Cook') },
    ],
  },
  {
    name: 'Pasta, Noodles & Instant Foods',
    children: [
      { name: 'Pasta', children: sub('Spaghetti', 'Penne', 'Macaroni', 'Fusilli') },
      { name: 'Noodles', children: sub('Instant Noodles', 'Egg Noodles', 'Rice Noodles') },
      { name: 'Instant Meals', children: sub('Cup Noodles', 'Instant Rice') },
      { name: 'Soup', children: sub('Instant Soup', 'Ready Soup') },
    ],
  },
  {
    name: 'Sauces, Spreads & Condiments',
    children: [
      { name: 'Ketchup', children: sub('Tomato Ketchup', 'Spicy Ketchup') },
      { name: 'Mayonnaise', children: sub('Regular', 'Light', 'Garlic') },
      { name: 'Mustard', children: sub('Yellow', 'Dijon') },
      { name: 'Pickles', children: sub('Mango', 'Mixed', 'Lemon') },
      { name: 'Chutneys', countries: GCC_AND_INDIA, children: sub('Mint', 'Tamarind', 'Coconut') },
      { name: 'Jams & Preserves', children: sub('Strawberry', 'Mixed Fruit', 'Orange') },
    ],
  },
  {
    name: 'Sweets & Desserts',
    children: [
      { name: 'Traditional Sweets', countries: GCC_AND_INDIA, children: sub('Halwa', 'Laddu', 'Barfi', 'Jalebi') },
      { name: 'Puddings', children: sub('Custard', 'Rice Pudding') },
      { name: 'Dessert Mixes', countries: GCC_AND_INDIA, children: sub('Gulab Jamun Mix', 'Kheer Mix') },
      { name: 'Syrups', children: sub('Chocolate', 'Caramel', 'Fruit Syrups') },
    ],
  },
  {
    name: 'Baby Food',
    children: [
      { name: 'Infant Formula', children: sub('Stage 1', 'Stage 2', 'Stage 3') },
      { name: 'Baby Cereals', children: sub('Rice', 'Wheat', 'Multigrain') },
      { name: 'Baby Snacks', children: sub('Biscuits', 'Puffs', 'Finger Foods') },
      { name: 'Baby Purees', children: sub('Fruit', 'Vegetable', 'Meat') },
    ],
  },
  {
    name: 'Health & Wellness Foods',
    children: [
      { name: 'Organic Foods', children: sub('Organic Rice', 'Organic Flour', 'Organic Fruits', 'Organic Vegetables') },
      { name: 'Sugar-Free', children: sub('Sugar-Free Snacks', 'Sugar-Free Drinks') },
      { name: 'Gluten-Free', children: sub('Gluten-Free Flour', 'Gluten-Free Bread', 'Gluten-Free Pasta') },
      { name: 'Vegan Foods', children: sub('Vegan Milk', 'Meat Alternatives') },
      { name: 'Keto Foods', children: sub('Keto Snacks', 'Low-Carb Products') },
    ],
  },
  {
    name: 'Diet & Special Nutrition',
    children: [
      { name: 'Protein Foods', children: sub('Protein Bars', 'Protein Drinks') },
      { name: 'Sports Nutrition Foods', children: sub('Energy Bars', 'Electrolyte Drinks') },
      { name: 'Low Sodium', children: sub('Low-Sodium Foods') },
      { name: 'Diabetic-Friendly', children: sub('No Added Sugar Products') },
      { name: 'Allergy-Friendly', children: sub('Nut-Free', 'Dairy-Free', 'Gluten-Free') },
    ],
  },
  {
    name: 'Household Cleaning',
    children: [
      { name: 'Laundry', children: sub('Detergent', 'Fabric Softener', 'Stain Remover') },
      { name: 'Dishwashing', children: sub('Dish Soap', 'Dishwasher Tablets') },
      { name: 'Surface Cleaning', children: sub('Floor Cleaner', 'Glass Cleaner') },
      { name: 'Bathroom Cleaning', children: sub('Toilet Cleaner', 'Bathroom Cleaner') },
      { name: 'Disinfectants', children: sub('Disinfectant Spray', 'Surface Disinfectant') },
    ],
  },
  {
    name: 'Paper & Disposable Products',
    children: [
      { name: 'Tissue', children: sub('Facial Tissue', 'Toilet Tissue') },
      { name: 'Kitchen Paper', children: sub('Paper Towels', 'Kitchen Rolls') },
      { name: 'Disposable Tableware', children: sub('Plates', 'Cups', 'Cutlery') },
      { name: 'Food Storage', children: sub('Foil', 'Cling Film', 'Storage Bags') },
      { name: 'Garbage Bags', children: sub('Small', 'Medium', 'Large') },
    ],
  },
  {
    name: 'Personal Care',
    children: [
      { name: 'Bath & Body', children: sub('Soap', 'Body Wash', 'Shower Gel') },
      { name: 'Hair Care', children: sub('Shampoo', 'Conditioner', 'Hair Oil') },
      { name: 'Oral Care', children: sub('Toothpaste', 'Toothbrush', 'Mouthwash') },
      { name: 'Skin Care', children: sub('Face Wash', 'Moisturizer', 'Sunscreen') },
      { name: 'Deodorants', children: sub('Roll-On', 'Spray', 'Stick') },
    ],
  },
  {
    name: 'Pet Supplies & Pet Food',
    children: [
      { name: 'Dog Food', children: sub('Dry Food', 'Wet Food', 'Treats') },
      { name: 'Cat Food', children: sub('Dry Food', 'Wet Food', 'Treats') },
      { name: 'Bird Food', children: sub('Seeds', 'Pellets') },
      { name: 'Pet Treats', children: sub('Biscuits', 'Chews') },
      { name: 'Pet Care', children: sub('Shampoo', 'Litter', 'Grooming') },
    ],
  },
  {
    name: 'Baby Care',
    children: [
      { name: 'Diapers', children: sub('Newborn', 'Small', 'Medium', 'Large', 'XL') },
      { name: 'Baby Wipes', children: sub('Sensitive', 'Fragrance-Free') },
      { name: 'Baby Bath', children: sub('Shampoo', 'Body Wash') },
      { name: 'Baby Care', children: sub('Lotion', 'Powder', 'Oil') },
    ],
  },
  {
    name: 'Kitchen & Home Essentials',
    children: [
      { name: 'Kitchen Storage', children: sub('Containers', 'Jars', 'Food Storage') },
      { name: 'Kitchen Accessories', children: sub('Sponges', 'Brushes', 'Gloves') },
      { name: 'Food Preparation', children: sub('Graters', 'Peelers', 'Strainers') },
      { name: 'Household Essentials', children: sub('Batteries', 'Matches', 'Candles') },
    ],
  },
  {
    name: 'International & Specialty Foods',
    children: [
      { name: 'Indian Foods', children: sub('Regional Indian Foods', 'Masalas', 'Pickles') },
      { name: 'Arabic Foods', children: sub('Dates', 'Tahini', 'Hummus Products') },
      { name: 'Asian Foods', children: sub('Chinese', 'Korean', 'Japanese', 'Thai') },
      { name: 'European Foods', children: sub('Italian', 'French', 'Mediterranean') },
      { name: 'American Foods', children: sub('Cereals', 'Sauces', 'Snacks') },
    ],
  },
  {
    name: 'Dates, Honey & Natural Foods',
    children: [
      { name: 'Dates', children: sub('Medjool', 'Sukkari', 'Ajwa', 'Khudri') },
      { name: 'Honey', children: sub('Raw', 'Organic', 'Sidr', 'Acacia') },
      { name: 'Dried Fruits', children: sub('Raisins', 'Dates', 'Figs', 'Apricots') },
      { name: 'Natural Sweeteners', children: sub('Maple Syrup', 'Stevia') },
    ],
  },
  {
    name: 'Ready-to-Cook & Ready-to-Eat',
    children: [
      { name: 'Ready Meals', children: sub('Curries', 'Rice Meals', 'Pasta') },
      { name: 'Ready-to-Cook', children: sub('Paratha', 'Nuggets', 'Kebabs') },
      { name: 'Meal Kits', children: sub('Curry Kits', 'Cooking Kits') },
      { name: 'Instant Mixes', countries: GCC_AND_INDIA, children: sub('Dosa Mix', 'Idli Mix', 'Pancake Mix') },
    ],
  },
  {
    name: 'Party & Seasonal Grocery',
    children: [
      { name: 'Party Foods', children: sub('Chips', 'Dips', 'Snacks') },
      { name: 'Festival Foods', children: sub('Ramadan', 'Eid', 'Christmas', 'Diwali') },
      { name: 'Gift Food', children: sub('Food Hampers', 'Sweet Boxes') },
      { name: 'Seasonal Produce', children: sub('Seasonal Fruits', 'Seasonal Vegetables') },
    ],
  },
  {
    name: 'Grocery Offers & Value Packs',
    children: [
      { name: 'Combo Packs', children: sub('Family Packs', 'Meal Combos') },
      { name: 'Bulk Packs', children: sub('Wholesale Packs', 'Large Packs') },
      { name: 'Value Packs', children: sub('Buy More Save More') },
      { name: 'Flash Deals', children: sub('Limited-Time Grocery Deals') },
    ],
  },
];

/** Slug for a taxonomy node, namespaced by its parent so names may repeat. */
export function taxonomyId(name: string, parentId?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // No truncation: ids are the primary key, and cutting them collides
  // siblings that share a prefix. The column is 128 and the deepest real
  // path is ~75.
  return parentId ? `${parentId}--${slug}` : slug;
}

/**
 * Where products filed under the previous 23-category taxonomy belong now.
 *
 * The old scheme's *categories* map to the new scheme's *departments*, and its
 * free-text `subCategory` values map to the new *categories*. Migrating on that
 * pair keeps all 224 existing products reachable by browsing; their new
 * sub-category is left unset rather than guessed, because the old data never
 * carried a third level.
 *
 * Keyed `"<oldCategory>|<oldSubCategory>"`, value is the new category id.
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'fruits-vegetables|Fruits': 'fruits-and-vegetables--fresh-fruits',
  'fruits-vegetables|Vegetables': 'fruits-and-vegetables--fresh-vegetables',
  'fruits-vegetables|Leafy Greens': 'fruits-and-vegetables--leafy-greens',
  'fresh-meat|Poultry': 'meat-and-poultry--chicken',
  'fresh-meat|Lamb': 'meat-and-poultry--mutton-and-lamb',
  'fresh-fish|Fresh Fish': 'fish-and-seafood--fresh-fish',
  'dairy-bread-eggs|Milk': 'dairy-and-eggs--milk',
  'dairy-bread-eggs|Yogurt': 'dairy-and-eggs--yogurt',
  'dairy-bread-eggs|Eggs': 'dairy-and-eggs--eggs',
  'beverages|Coffee': 'beverages--coffee',
  'beverages|Juices': 'beverages--juices',
  'snacks-packaged|Chips': 'snacks-and-confectionery--chips',
  'snacks-packaged|Biscuits': 'bakery-and-bread--biscuits-and-cookies',
  'household-cleaning|Laundry': 'household-cleaning--laundry',
};
